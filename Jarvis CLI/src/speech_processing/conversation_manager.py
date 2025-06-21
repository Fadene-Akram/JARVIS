from .speech_to_text import get_transcript
from .text_to_speech import TTS


class ConversationManager:
    def __init__(self, assistant):
        self.transcription_response = ""
        self.assistant = assistant
        self.tts = TTS()  # Initialize TTS once

    async def main(self):
        def handle_full_sentence(full_sentence):
            self.transcription_response = full_sentence

        # JARVIS-style startup message
        self.tts.speak("System online. Ready to assist you, sir.")

        # Loop indefinitely until "goodbye" is said
        while True:
            await get_transcript(handle_full_sentence)

            if "deactivate" in self.transcription_response.lower():
                self.tts.speak("Powering down. Goodbye, sir.")
                break

            llm_response = self.assistant.invoke(self.transcription_response)
            print(f"AI: {llm_response}")
            self.tts.speak(llm_response)

            self.transcription_response = ""
