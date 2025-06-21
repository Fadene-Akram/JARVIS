from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
import os
from dotenv import load_dotenv
from deepgram import DeepgramClient, SpeakOptions, DeepgramClientOptions, LiveOptions, LiveTranscriptionEvents ,PrerecordedOptions
import tempfile
import asyncio
import re
from .agent_setup import initialize_agent

# Initialize colorama for colored terminal output

# Load environment variables
load_dotenv()

# Initialize Deepgram client for TTS
deepgram_tts = DeepgramClient(api_key=os.getenv("DEEPGRAM_API_KEY"))
DEEPGRAM_API_KEY = os.getenv('DEEPGRAM_API_KEY')

class TranscriptCollector:
    def __init__(self):
        self.reset()

    def reset(self):
        self.transcript_parts = []

    def add_part(self, part):
        self.transcript_parts.append(part)

    def get_full_transcript(self):
        return ' '.join(self.transcript_parts)

# Global transcript collector
transcript_collector = TranscriptCollector()


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
@csrf_exempt
def speech_to_text(request):
    print("Received request for speech to text")
    
    if 'audio' not in request.FILES:
        return Response({'error': 'No audio file provided'}, status=400)
    
    audio_file = request.FILES['audio']
    print(f"Audio file received: {audio_file.name}, size: {audio_file.size}, type: {audio_file.content_type}")

    try:
        # Check if API key is loaded
        if not DEEPGRAM_API_KEY:
            print("ERROR: DEEPGRAM_API_KEY not found in environment variables")
            return Response({'error': 'Deepgram API key not configured'}, status=500)
        
        # Initialize Deepgram client
        deepgram = DeepgramClient(DEEPGRAM_API_KEY)
        
        # Configure options for pre-recorded audio
        options = PrerecordedOptions(
            model="nova-2",
            smart_format=True,
            punctuate=True,
            language="en-US",
        )
        
        print("Calling Deepgram pre-recorded API...")
        
        # Read audio file directly from memory
        buffer_data = b''
        for chunk in audio_file.chunks():
            buffer_data += chunk
        
        payload = {
            "buffer": buffer_data,
            "mimetype": audio_file.content_type or 'audio/webm'  # Default to webm if not specified
        }
        
        response = deepgram.listen.prerecorded.v("1").transcribe_file(payload, options)
        
        print("Deepgram response received:", response)
        
        # Extract transcript with better error handling
        try:
            transcript = response["results"]["channels"][0]["alternatives"][0]["transcript"]
            confidence = response["results"]["channels"][0]["alternatives"][0]["confidence"]
            print(f"Transcription confidence: {confidence}")
            
            if not transcript.strip():
                return Response({'error': 'No speech detected in audio'}, status=400)
                
            return Response({
                'text': transcript.strip(),
                'confidence': confidence
            })
            
        except (KeyError, IndexError) as e:
            print(f"Error extracting transcript: {e}")
            return Response({'error': 'No speech detected in audio'}, status=400)
            
    except Exception as e:
        print(f"Exception during transcription: {str(e)}")
        return Response({'error': f'Transcription failed: {str(e)}'}, status=500)


def get_transcript_sync(audio_path, mime_type='audio/wav'):
    """Synchronous version using Deepgram pre-recorded API"""
    try:
        if not DEEPGRAM_API_KEY:
            raise ValueError("Deepgram API key not configured")
        
        deepgram = DeepgramClient(DEEPGRAM_API_KEY)
        
        options = PrerecordedOptions(
            model="nova-2",
            smart_format=True,
            punctuate=True,
            language="en-US",
        )
        
        with open(audio_path, 'rb') as audio:
            buffer_data = audio.read()
        
        payload = {
            "buffer": buffer_data,
            "mimetype": mime_type
        }
        
        response = deepgram.listen.prerecorded.v("1").transcribe_file(payload, options)
        
        try:
            transcript = response["results"]["channels"][0]["alternatives"][0]["transcript"]
            confidence = response["results"]["channels"][0]["alternatives"][0]["confidence"]
            return {
                'text': transcript.strip(),
                'confidence': confidence
            }
        except (KeyError, IndexError):
            return None
        
    except Exception as e:
        print(f"Transcription error: {e}")
        raise


@api_view(['POST'])
@csrf_exempt
def text_to_speech(request):
    text = request.data.get('text', '')
    if not text:
        return Response({'error': 'No text provided'}, status=400)

    try:
        # Clean the text
        cleaned_text = clean_text_for_speech(text)
        
        # Generate unique filename
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_audio:
            audio_file_path = tmp_audio.name

        # Configure options
        options = SpeakOptions(
            model="aura-asteria-en",
            encoding="linear16",
            container="wav"
        )

        # Generate and save audio
        speak_options = {"text": cleaned_text}
        response = deepgram_tts.speak.v("1").save(audio_file_path, speak_options, options)

        # Read the generated audio
        with open(audio_file_path, 'rb') as audio_file:
            audio_data = audio_file.read()

        # Clean up
        os.unlink(audio_file_path)

        return HttpResponse(audio_data, content_type='audio/wav')

    except Exception as e:
        if os.path.exists(audio_file_path):
            os.unlink(audio_file_path)
        return Response({'error': str(e)}, status=500)

def clean_text_for_speech(text):
    """
    Clean text for natural speech by removing markdown formatting
    """
    # Remove markdown bold formatting (**text**)
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
    
    # Remove single asterisks (*)
    text = re.sub(r'\*', '', text)
    
    # Handle numbered lists
    number_words = {
        '1.': 'First,',
        '2.': 'Second,', 
        '3.': 'Third,',
        '4.': 'Fourth,',
        '5.': 'Fifth,',
        '6.': 'Sixth,',
        '7.': 'Seventh,',
        '8.': 'Eighth,',
        '9.': 'Ninth,',
        '10.': 'Tenth,'
    }
    
    for number, word in number_words.items():
        text = text.replace(number, word)
    
    # Remove extra whitespace and clean up
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text




# Initialize the agent at module level
assistant_agent = initialize_agent()
@api_view(['POST'])
@csrf_exempt
def assistant(request):
    text = request.data.get('text', '')
    if not text:
        return Response({'error': 'No text provided'}, status=400)
    
    try:
        # Get response from the agent
        response = assistant_agent.invoke(text)
        return Response({'response': response})
    except Exception as e:
        return Response({'error': str(e)}, status=500)
    