from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
from dotenv import load_dotenv
import os

# Load environment variables from .env
load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize Groq client
client = Groq()

@app.route("/chat", methods=["POST"])
def chat():
    user_message = request.json.get("message", "")

    if not user_message:
        return jsonify({"reply": "Please provide a message."}), 400

    try:
        # Create a streaming chat completion
        completion = client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[
                {"role": "system", "content": "You are a mental health companion. Be empathetic and supportive and kind. Limit responses to 200 words"},
                {"role": "user", "content": user_message}
            ],
            temperature=1,
            max_completion_tokens=8192,
            top_p=1,
            reasoning_effort="medium",
            stream=True
        )

        # Collect all streamed chunks
        reply = ""
        for chunk in completion:
            reply += chunk.choices[0].delta.content or ""

    except Exception as e:
        print("Error calling Groq API:", e)
        return jsonify({"reply": f"Error communicating with AI service: {str(e)}"}), 500

    return jsonify({"reply": reply})

if __name__ == "__main__":
    # Listen on all interfaces for local network access if needed
    app.run(debug=True, host="0.0.0.0", port=5000)
