


# import os
# import time
# import tempfile
# from dotenv import load_dotenv
# from deepgram import DeepgramClient, SpeakOptions
# from playsound import playsound

# load_dotenv()

# class TTS:
#     def __init__(self):
#         # Use tempfile for unique filenames and automatic cleanup
#         self.temp_dir = tempfile.mkdtemp()
    
#     def speak(self, text):
#         """
#         More robust version that uses unique temp files and proper cleanup
#         """
#         max_retries = 3
        
#         for attempt in range(max_retries):
#             try:
#                 # Generate unique filename each time
#                 audio_file = os.path.join(self.temp_dir, f"tts_output_{time.time()}.wav")
                
#                 # Create Deepgram client
#                 deepgram = DeepgramClient(api_key=os.getenv("DEEPGRAM_API_KEY"))

#                 # Configure options
#                 options = SpeakOptions(
#                     model="aura-asteria-en",
#                     encoding="linear16",
#                     container="wav"
#                 )

#                 # Generate and save audio
#                 SPEAK_OPTIONS = {"text": text}
#                 response = deepgram.speak.v("1").save(audio_file, SPEAK_OPTIONS, options)

#                 # Play the audio
#                 playsound(audio_file)
                
#                 # Try to clean up immediately (may fail if playsound is slow)
#                 try:
#                     os.remove(audio_file)
#                 except:
#                     pass
                
#                 return True
                
#             except Exception as e:
#                 print(f"TTS attempt {attempt + 1} failed: {e}")
#                 if attempt == max_retries - 1:
#                     print("All TTS attempts failed")
#                     return False
#                 else:
#                     time.sleep(1)  # Wait before retry
    
#     def cleanup(self):
#         """
#         Clean up all temporary files
#         """
#         try:
#             for filename in os.listdir(self.temp_dir):
#                 file_path = os.path.join(self.temp_dir, filename)
#                 try:
#                     os.unlink(file_path)
#                 except Exception as e:
#                     print(f"Could not delete {file_path}: {e}")
#             os.rmdir(self.temp_dir)
#         except Exception as e:
#             print(f"Error during cleanup: {e}")

# if __name__ == "__main__":
#     tts = TTS()
#     tts.speak("Hello, how can I help you today?")
#     tts.cleanup()





import os
import time
import tempfile
import re
from dotenv import load_dotenv
from deepgram import DeepgramClient, SpeakOptions
from playsound import playsound

load_dotenv()

class TTS:
    def __init__(self):
        # Use tempfile for unique filenames and automatic cleanup
        self.temp_dir = tempfile.mkdtemp()
    
    def clean_text_for_speech(self, text):
        """
        Clean text for natural speech by removing markdown formatting
        """
        # Remove markdown bold formatting (**text**)
        text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
        
        # Remove single asterisks (*)
        text = re.sub(r'\*', '', text)
        
        # Handle numbered lists - convert "1. " to "First, ", "2. " to "Second, ", etc.
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
    
    def speak(self, text):
        """
        More robust version that uses unique temp files and proper cleanup
        """
        # Clean the text before speaking
        cleaned_text = self.clean_text_for_speech(text)
        
        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                # Generate unique filename each time
                audio_file = os.path.join(self.temp_dir, f"tts_output_{time.time()}.wav")
                
                # Create Deepgram client
                deepgram = DeepgramClient(api_key=os.getenv("DEEPGRAM_API_KEY"))

                # Configure options
                options = SpeakOptions(
                    model="aura-asteria-en",
                    encoding="linear16",
                    container="wav"
                )

                # Generate and save audio using cleaned text
                SPEAK_OPTIONS = {"text": cleaned_text}
                response = deepgram.speak.v("1").save(audio_file, SPEAK_OPTIONS, options)

                # Play the audio
                playsound(audio_file)
                
                # Try to clean up immediately (may fail if playsound is slow)
                try:
                    os.remove(audio_file)
                except:
                    pass
                
                return True
                
            except Exception as e:
                print(f"TTS attempt {attempt + 1} failed: {e}")
                if attempt == max_retries - 1:
                    print("All TTS attempts failed")
                    return False
                else:
                    time.sleep(1)  # Wait before retry
    
    def cleanup(self):
        """
        Clean up all temporary files
        """
        try:
            for filename in os.listdir(self.temp_dir):
                file_path = os.path.join(self.temp_dir, filename)
                try:
                    os.unlink(file_path)
                except Exception as e:
                    print(f"Could not delete {file_path}: {e}")
            os.rmdir(self.temp_dir)
        except Exception as e:
            print(f"Error during cleanup: {e}")

if __name__ == "__main__":
    # Example with your text
    sample_text = """I'm a multifaceted AI, capable of assisting with a wide range of tasks and inquiries. I can: 1. **Manage your calendar**: Schedule events, set reminders, and keep track of your appointments and meetings. 2. **Store and retrieve contact information**: Add new contacts, fetch contact details, and update your address book. 4. **Send emails**: Compose and dispatch emails to your contacts, making it easy to stay in touch. 5. **Search the web**: Conduct searches on various topics, providing you with the latest information and updates. These are just a few examples of what I can do. If you have a specific task or question in mind, feel free to ask, and I'll do my best to assist you!"""
    
    tts = TTS()
    tts.speak(sample_text)
    tts.cleanup()