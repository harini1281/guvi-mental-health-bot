from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
import os
import psycopg2
import bcrypt
import jwt
from dotenv import load_dotenv
from datetime import datetime, timedelta
# Add for session management and encryption
from flask import session
from cryptography.fernet import Fernet

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Set Flask session secret
if os.getenv("FLASK_SESSION_SECRET"):
    app.secret_key = os.getenv("FLASK_SESSION_SECRET")
else:
    print("WARNING: Using a random Flask session secret. Set FLASK_SESSION_SECRET in production!")
    app.secret_key = os.urandom(24)

# Set Fernet key for encryption
if os.getenv("FERNET_KEY"):
    FERNET_KEY = os.getenv("FERNET_KEY")
else:
    print("WARNING: Using a random Fernet key. Set FERNET_KEY in production to persist encrypted data!")
    FERNET_KEY = Fernet.generate_key().decode()
fernet = Fernet(FERNET_KEY.encode())

# Database connection
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()

# JWT settings
JWT_SECRET = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"

# Initialize Groq client
client = Groq()

# Create users table
cur.execute("""
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
)
""")
conn.commit()

# Crisis keywords for detection
CRISIS_KEYWORDS = [
    "suicide", "kill myself", "end my life", "hopeless", "can't go on", "depressed", "worthless"
]
def detect_crisis(text):
    text_lower = text.lower()
    for word in CRISIS_KEYWORDS:
        if word in text_lower:
            return True
    return False

# ------------------ Register ------------------
@app.route("/register", methods=["POST"])
def register():
    data = request.json
    username = data["username"]
    email = data["email"]
    password = data["password"]

    hashed_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    try:
        cur.execute(
            "INSERT INTO users (username, email, password) VALUES (%s, %s, %s)",
            (username, email, hashed_pw)
        )
        conn.commit()
        return jsonify({"message": "User registered successfully!"})
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        return jsonify({"error": "Username or email already exists."}), 400

# ------------------ Login ------------------
@app.route("/login", methods=["POST"])
def login():
    data = request.json
    email = data["email"]
    password = data["password"]

    cur.execute("SELECT id, password FROM users WHERE email=%s", (email,))
    user = cur.fetchone()
    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    user_id, hashed_pw = user
    if bcrypt.checkpw(password.encode("utf-8"), hashed_pw.encode("utf-8")):
        token = jwt.encode(
            {"user_id": user_id, "exp": datetime.utcnow() + timedelta(hours=2)},
            JWT_SECRET,
            algorithm=JWT_ALGORITHM
        )
        return jsonify({"token": token})
    else:
        return jsonify({"error": "Invalid email or password"}), 401

# ------------------ Chat ------------------
@app.route("/chat", methods=["POST"])
def chat():
    # Check token
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"error": "Missing token"}), 401

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload["user_id"]
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Token expired"}), 401
    except Exception:
        return jsonify({"error": "Invalid token"}), 401

    # Session start time
    if "session_start" not in session:
        session["session_start"] = datetime.utcnow().isoformat()
    else:
        start = datetime.fromisoformat(session["session_start"])
        if (datetime.utcnow() - start).total_seconds() > 3600:
            return jsonify({"error": "Session expired (max 60 minutes). Please start a new session."}), 403

    user_message = request.json.get("message", "")
    language = request.json.get("language", "en")
    if not user_message:
        return jsonify({"reply": "Please provide a message."}), 400

    # Crisis detection (must respond within 30s)
    if detect_crisis(user_message):
        return jsonify({
            "reply": "It sounds like you're going through a very difficult time. Please know you're not alone. "
                     "I'm connecting you to a mental health professional. If this is an emergency, please call a local helpline immediately.",
            "escalate": True,
            "resources": [
                {"name": "Kiran Helpline", "number": "1800-599-0019"},
                {"name": "Sneha Foundation", "number": "044-24640050"}
            ]
        }), 200

    try:
        # ✅ Groq API call for empathetic AI response
        completion = client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a mental health companion for Indian users. "
                        "Answer in simple, polite, and empathetic language. "
                        "Keep replies concise, under 2–3 sentences, and culturally sensitive. "
                        f"Language: {language}"
                    )
                },
                {"role": "user", "content": user_message}
            ],
            temperature=1,
            max_completion_tokens=8192,
            top_p=1,
            reasoning_effort="medium",
            stream=True
        )

        reply = ""
        for chunk in completion:
            reply += chunk.choices[0].delta.content or ""

    except Exception as e:
        print("Error calling Groq API:", e)
        return jsonify({"reply": f"Error communicating with AI service: {str(e)}"}), 500

    return jsonify({"reply": reply})

# ------------------ Mood Tracking ------------------
@app.route("/mood", methods=["POST"])
def log_mood():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"error": "Missing token"}), 401
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload["user_id"]
    except Exception:
        return jsonify({"error": "Invalid token"}), 401

    data = request.json
    mood = data.get("mood")
    note = data.get("note", "")
    encrypted_note = fernet.encrypt(note.encode()).decode()
    cur.execute("INSERT INTO mood_logs (user_id, mood, note, timestamp) VALUES (%s, %s, %s, %s)",
                (user_id, mood, encrypted_note, datetime.utcnow()))
    conn.commit()
    return jsonify({"message": "Mood logged."})

# ------------------ Meditation Guidance ------------------
@app.route("/meditation", methods=["GET"])
def meditation():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"error": "Missing token"}), 401
    # Optionally, check token validity as above
    return jsonify({"meditation": "Sit comfortably, close your eyes, and take slow, deep breaths. Focus on your breath for 5 minutes."})

# ------------------ Personalized Wellness Plan ------------------
@app.route("/wellness-plan", methods=["GET"])
def wellness_plan():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"error": "Missing token"}), 401
    # Optionally, check token validity as above
    return jsonify({"plan": "Try to maintain a regular sleep schedule, eat balanced meals, and take short walks daily. Practice gratitude journaling each night."})

# ------------------ DB Table Creation (add mood_logs) ------------------
cur.execute("""
CREATE TABLE IF NOT EXISTS mood_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    mood TEXT,
    note TEXT,
    timestamp TIMESTAMP
)
""")
conn.commit()

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
