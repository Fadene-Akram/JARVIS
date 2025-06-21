# 🤖 Jarvis — Your AI Voice Assistant Inspired by Iron Man

**Bring your own J.A.R.V.I.S. to life and enhance your digital workflow with natural voice interaction.**

Jarvis is a powerful AI Voice Assistant that seamlessly combines **Speech-to-Text (STT)** and **Text-to-Speech (TTS)** capabilities. Engage in smooth, human-like conversations while Jarvis helps you manage tasks like scheduling, emailing, searching the web, and accessing your personal knowledge—just like Tony Stark’s iconic assistant.

---

## 🚀 Key Features

- **Speech-to-Text (STT)**: Converts spoken input into written text.
- **Text-to-Speech (TTS)**: Responds to you with realistic synthesized speech.
- **Voice-Based Interaction**: Communicate naturally, hands-free.
- **Integrated Tools**: Automates everyday tasks like calendars, contacts, emails, and searches—just say the word.

---

## 🧰 Built-in Tools

| Tool                  | Description                                                                           |
| --------------------- | ------------------------------------------------------------------------------------- |
| **CalendarTool**      | Schedule events in Google Calendar with a title, date/time, and optional description. |
| **AddContactTool**    | Add contacts to Google Contacts using a name, phone number, and optional email.       |
| **FetchContactTool**  | Retrieve contact info by searching your Google Contacts.                              |
| **EmailingTool**      | Compose and send emails using Gmail by providing recipient, subject, and body.        |
| **SearchWebTool**     | Get instant results from the web using voice queries.                                 |
| **KnowledgeBaseTool** | Access your saved notes and documents from the `/files` folder.                       |

---

## ⚙️ Getting Started

### 📋 Requirements

- Python 3.9+
- Google API credentials (Calendar, Contacts, Gmail)
- Tavily API key (for web searches)
- Groq API key (for LLaMA 3 model)
- Google Gemini API key (optional model support)
- Deepgram API key (for speech processing)
- Required Python libraries (`requirements.txt`)

---

### 🛠️ Installation

1. **Clone the repository:**

```bash
git clone https://github.com/yourusername/Jarvis-AI-Assistant.git
cd Jarvis-AI-Assistant
```

2. **Set up a virtual environment:**

```sh
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies:**

```sh
pip install -r requirements.txt
```

4. **Add environment variables:**

Create a `.env` file in the root directory of the project and add your API keys:

```env
GOOGLE_API_KEY=your_google_api_key
DEEPGRAM_API_KEY=your_deepgram_api_key
TAVILY_API_KEY=your_tavily_api_key
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
GMAIL_MAIL=your_email_address
GMAIL_APP_PASSWORD=your_gmail_app_password
```

5. **Set up Google APIs:**

Follow Google's official guides to enable and configure Calendar, Contacts, and Gmail API access. Store your credentials file safely and link it properly in the project configuration.

### ▶️ Run Jarvis

1. **Launch the assistant:**

```sh
python main.py
```

Jarvis will end the session when you say “Deactivate”

## 🗣️ Example Commands

- "Schedule a meeting with John for tomorrow at 2 PM."
- "Add a new contact: Jane Doe, phone number 555-1234."
- "What's Mary's email address?"
- "Send an email to Bob with the subject 'Project Update'."
- "Search the web for recent news about artificial intelligence."
- "What was the recipe I saved last week for chocolate chip cookies?"

## 🤝 Contributing

We welcome contributions!
Please submit pull requests or open issues to suggest improvements, fix bugs, or add features.
If you have any questions or suggestions, feel free to contact me at `fadeneakram@gmail.com`.
