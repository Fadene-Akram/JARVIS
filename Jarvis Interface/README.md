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

## 🌐 Stunning Interface

This version of Jarvis features a **beautiful modern website interface** built with React, inspired by the futuristic UI of Iron Man's JARVIS. You can interact visually and verbally through a smooth, dynamic user experience.

---

## 🖼️ Screenshots

| Dashboard                          | Voice Interaction                      |
| ---------------------------------- | -------------------------------------- |
| ![Dashboard](images/dashboard.png) | ![Voice](images/voice-interaction.png) |

| Commands                         | Response                         |
| -------------------------------- | -------------------------------- |
| ![Commands](images/commands.png) | ![Response](images/response.png) |

---

## ⚙️ Getting Started

### 📋 Requirements

- Python 3.9+
- Node.js & npm
- Google API credentials (Calendar, Contacts, Gmail)
- Tavily API key (for web searches)
- Groq API key (for LLaMA 3 model)
- Google Gemini API key (optional model support)
- Deepgram API key (for speech processing)

---

### 🔧 Backend Setup (Django)

1. **Navigate to the backend folder:**

```bash
cd Jarvis Backend
```

2. **Create a virtual environment:**

```bash
python -m venv venv
```

3. **Activate the virtual environment:**

```bash

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

4. **Install dependencies:**

```bash
pip install -r requirements.txt
```

5. **Navigate to the Django project and run the server:**

```bash

cd jarvis_backend
python manage.py runserver
```

---

### 💻 Frontend Setup (React)

5. **Navigate to the frontend folder:**

```bash

cd frontend
```

5. **Install dependencies and run the app:**

```bash

npm install
npm run dev
```

The React app will start at http://localhost:5173.

### 🔐 Environment Configuration

Create a .env file in the backend root and add the following:

```env

GOOGLE_API_KEY=your_google_api_key
DEEPGRAM_API_KEY=your_deepgram_api_key
TAVILY_API_KEY=your_tavily_api_key
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
GMAIL_MAIL=your_email_address
GMAIL_APP_PASSWORD=your_gmail_app_password
```

### ▶️ Running Jarvis

Once both frontend and backend are running, open your browser at:

http://localhost:5173

You can now speak to Jarvis, interact with its futuristic UI, and experience real-time AI responses.

### 🗣️ Example Commands

- "Schedule a meeting with John for tomorrow at 2 PM."

"Add a new contact: Jane Doe, phone number 555-1234."

- "What's Mary's email address?"

- "Send an email to Bob with the subject 'Project Update'."

- "Search the web for recent news about artificial intelligence."

- "What was the recipe I saved last week for chocolate chip cookies?"

### 🤝 Contributing

We welcome contributions!
Feel free to:

Fork the project

Create a new branch

Submit a pull request

You can also contact me at: fadeneakram@gmail.com.
