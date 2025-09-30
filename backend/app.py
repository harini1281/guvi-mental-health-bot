from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
import os
import psycopg2
import bcrypt
import jwt
from dotenv import load_dotenv
from datetime import datetime, timedelta

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

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

    user_message = request.json.get("message", "")
    if not user_message:
        return jsonify({"reply": "Please provide a message."}), 400

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
                        "Keep replies concise, under 2–3 sentences, and culturally sensitive."
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

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
