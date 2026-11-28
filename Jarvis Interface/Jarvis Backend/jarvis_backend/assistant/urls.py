from django.urls import path
from .views import speech_to_text, assistant, text_to_speech
from .streaming import assistant_stream


urlpatterns = [
    path('api/speech-to-text/', speech_to_text, name='speech_to_text'),
    path('api/assistant/', assistant, name='assistant'),
    path('api/text-to-speech/', text_to_speech, name='text_to_speech'),
    path('api/assistant/stream/', assistant_stream, name='assistant_stream'),
]