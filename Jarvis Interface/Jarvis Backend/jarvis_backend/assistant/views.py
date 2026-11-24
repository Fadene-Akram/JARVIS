import logging
import os
import re
import tempfile

from deepgram import DeepgramClient, PrerecordedOptions, SpeakOptions
from django.http import HttpResponse
from dotenv import load_dotenv
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from .agent_setup import get_agent

load_dotenv()
log = logging.getLogger(__name__)

STT_MODEL = os.getenv("DEEPGRAM_STT_MODEL", "nova-2")
STT_LANGUAGE = os.getenv("DEEPGRAM_STT_LANGUAGE", "en-US")
TTS_MODEL = os.getenv("DEEPGRAM_TTS_MODEL", "aura-asteria-en")
TTS_MAX_CHARS = 1900  # Deepgram TTS rejects inputs of roughly 2000+ characters


def deepgram_client() -> DeepgramClient:
    key = os.getenv("DEEPGRAM_API_KEY")
    if not key:
        raise RuntimeError("DEEPGRAM_API_KEY is not set")
    return DeepgramClient(key)


# --------------------------------------------------------------------------- STT
@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
def speech_to_text(request):
    audio = request.FILES.get("audio")
    if audio is None:
        return Response({"error": "No audio file provided"}, status=400)

    data = audio.read()
    if not data:
        return Response({"error": "Audio file is empty"}, status=400)

    # Browsers send e.g. "audio/webm;codecs=opus"; Deepgram wants the bare type
    mimetype = (audio.content_type or "audio/webm").split(";")[0]
    log.info("STT request: %s, %d bytes, %s", audio.name, len(data), mimetype)

    options = PrerecordedOptions(
        model=STT_MODEL,
        smart_format=True,
        punctuate=True,
        language=STT_LANGUAGE,
    )

    try:
        response = deepgram_client().listen.prerecorded.v("1").transcribe_file(
            {"buffer": data, "mimetype": mimetype}, options
        )
    except Exception:
        log.exception("Deepgram transcription failed")
        return Response({"error": "Transcription failed"}, status=500)

    try:
        alt = response.results.channels[0].alternatives[0]
        transcript = (alt.transcript or "").strip()
        confidence = alt.confidence
    except (IndexError, AttributeError):
        transcript, confidence = "", 0.0

    if not transcript:
        return Response({"error": "No speech detected in audio"}, status=400)

    return Response({"text": transcript, "confidence": confidence})


# --------------------------------------------------------------------------- TTS
ORDINALS = ["First", "Second", "Third", "Fourth", "Fifth",
            "Sixth", "Seventh", "Eighth", "Ninth", "Tenth"]


def _ordinal(match):
    n = int(match.group(1))
    return f"{ORDINALS[n - 1]}, " if 1 <= n <= 10 else match.group(0)


def clean_text_for_speech(text: str) -> str:
    """Strip markdown so the text sounds natural when spoken."""
    text = re.sub(r"```.*?```", " ", text, flags=re.S)       # code blocks
    text = re.sub(r"`([^`]*)`", r"\1", text)                  # inline code
    text = re.sub(r"(?m)^\s*#+\s*", "", text)                 # headings
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)              # bold
    text = text.replace("*", "")                              # stray asterisks
    text = re.sub(r"(?m)^\s*[-•]\s+", "", text)               # bullet markers
    # Only line-leading "1. " style markers, so "3.14" and "11." are untouched
    text = re.sub(r"(?m)^\s*(\d+)\.\s+", _ordinal, text)
    return re.sub(r"\s+", " ", text).strip()


def _truncate(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    cut = text[:limit]
    end = max(cut.rfind(". "), cut.rfind("? "), cut.rfind("! "))
    return cut[: end + 1] if end > limit // 2 else cut


@api_view(["POST"])
def text_to_speech(request):
    text = request.data.get("text", "")
    if not isinstance(text, str) or not text.strip():
        return Response({"error": "No text provided"}, status=400)

    cleaned = _truncate(clean_text_for_speech(text), TTS_MAX_CHARS)
    if not cleaned:
        return Response({"error": "Nothing to speak"}, status=400)

    audio_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            audio_path = tmp.name

        options = SpeakOptions(model=TTS_MODEL, encoding="linear16", container="wav")
        deepgram_client().speak.v("1").save(audio_path, {"text": cleaned}, options)

        with open(audio_path, "rb") as f:
            audio_data = f.read()

        return HttpResponse(audio_data, content_type="audio/wav")
    except Exception:
        log.exception("Deepgram TTS failed")
        return Response({"error": "Text-to-speech failed"}, status=500)
    finally:
        if audio_path and os.path.exists(audio_path):
            os.unlink(audio_path)


# --------------------------------------------------------------------- assistant
@api_view(["POST"])
def assistant(request):
    text = request.data.get("text", "")
    if not isinstance(text, str) or not text.strip():
        return Response({"error": "No text provided"}, status=400)

    try:
        reply = get_agent().invoke(text.strip())
        return Response({"response": reply})
    except Exception:
        log.exception("Assistant failed")
        return Response({"error": "The assistant hit an error"}, status=500)