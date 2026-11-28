import json
import logging
import queue
import threading

from django.http import StreamingHttpResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .agent_setup import get_agent

log = logging.getLogger(__name__)


@api_view(["POST"])
def assistant_stream(request):
    """Same as /api/assistant/, but streams newline-delimited JSON events:
    {"type":"tool_start"|"tool_end"|"final"|"error", ...}"""
    text = request.data.get("text", "")
    if not isinstance(text, str) or not text.strip():
        return Response({"error": "No text provided"}, status=400)
    text = text.strip()

    events: queue.Queue = queue.Queue()

    def worker():
        try:
            reply = get_agent().invoke(text, on_event=events.put)
            events.put({"type": "final", "text": reply})
        except Exception:
            log.exception("Assistant failed")
            events.put({"type": "error", "message": "The assistant hit an error"})
        finally:
            events.put(None)  # sentinel: stream is finished

    threading.Thread(target=worker, daemon=True).start()

    def generate():
        while True:
            item = events.get()
            if item is None:
                break
            yield json.dumps(item, ensure_ascii=False) + "\n"

    response = StreamingHttpResponse(generate(), content_type="application/x-ndjson")
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response