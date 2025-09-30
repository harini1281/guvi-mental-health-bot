# GenAI-Powered Mental Health Companion

A secure, AI-powered mental health companion for Indian users, providing 24/7 emotional support, mood tracking, meditation guidance, and personalized wellness plans. Built with Python Flask, React.js, and PostgreSQL.

---

## Features

- **Conversational Therapy:** Empathetic AI chat using Groq LLM.
- **Crisis Detection:** Detects distress and escalates to human professionals with helpline resources.
- **Mood Tracking:** Log and track your mood securely.
- **Meditation Guidance:** Get simple, guided meditation exercises.
- **Personalized Wellness Plans:** Receive daily mental wellness tips.
- **Multilingual Support:** Choose from English, Hindi, Tamil, Telugu, and more.
- **Session Security:** JWT authentication, encrypted sessions, and encrypted sensitive data.
- **No Social Media/Tracking:** Strict confidentiality, no external tracking.

---

## Tech Stack

- **Backend:** Python Flask, Groq LLM, PostgreSQL (with encryption), JWT, Fernet
- **Frontend:** React.js (secure authentication)
- **Other:** Docker (optional), .env for secrets

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd guvi-mental-health-files
```

### 2. Backend Setup

- Install Python dependencies:
  ```bash
  pip install -r backend/requirements.txt
  ```
- Create a `.env` file in `backend/` with:
  ```
  GROQ_API_KEY=your_groq_api_key
  DATABASE_URL=postgresql://youruser:yourpass@localhost:5432/mental_health_db
  JWT_SECRET_KEY=your_jwt_secret
  FLASK_SESSION_SECRET=your_flask_secret
  FERNET_KEY=your_fernet_key
  ```
  > If you don't set `FLASK_SESSION_SECRET` or `FERNET_KEY`, the app will generate random ones (not recommended for production).

- Start PostgreSQL and create the database:
  ```bash
  createdb mental_health_db
  ```

- Run the backend:
  ```bash
  cd backend
  python app.py
  ```

### 3. Frontend Setup

- Install Node.js dependencies:
  ```bash
  cd ../frontend
  npm install
  ```
- Start the frontend:
  ```bash
  npm start
  ```

---

## Usage

1. Register and log in via the web interface.
2. Start chatting with the AI companion.
3. Track your mood, get meditation guidance, and receive wellness plans.
4. Choose your preferred language for conversations.
5. In case of crisis, the app will provide helpline resources and escalate as needed.

---

## Security Notes

- All sensitive data is encrypted before storage.
- JWT and Flask session secrets must be kept safe.
- No social media or external tracking is used.

---

## License

MIT License

---

## Acknowledgements

- [Groq LLM](https://groq.com/)
- [Flask](https://flask.palletsprojects.com/)
- [React.js](https://react.dev/)
- [PostgreSQL](https://www.postgresql.org/)
