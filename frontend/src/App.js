import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

function App() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    setLoading(true);
    setChat((prev) => [...prev, { role: "user", content: message }]);
    try {
      const res = await axios.post("http://127.0.0.1:5000/chat", { message });
      setChat((prev) => [
        ...prev,
        { role: "ai", content: res.data.reply || "No reply from AI." },
      ]);
    } catch (err) {
      console.error(err);
      setChat((prev) => [
        ...prev,
        { role: "system", content: "Error connecting to server." },
      ]);
    } finally {
      setMessage("");
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !loading) sendMessage();
  };

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "auto",
        padding: "20px",
        fontFamily: "Arial",
      }}
    >
      <h2 style={{ textAlign: "center", color: "#4B0082" }}>
        AI Mental Health Companion
      </h2>

      <div
        style={{
          border: "2px solid #4B0082",
          borderRadius: "10px",
          padding: "10px",
          height: "400px",
          overflowY: "scroll",
          marginBottom: "10px",
          backgroundColor: "#F0F8FF",
        }}
      >
        {chat.map((c, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: c.role === "user" ? "flex-end" : "flex-start",
              margin: "5px 0",
            }}
          >
            <p
              style={{
                maxWidth: "70%",
                padding: "10px",
                borderRadius: "15px",
                backgroundColor:
                  c.role === "user"
                    ? "#ADD8E6" // Light blue for user
                    : c.role === "ai"
                    ? "#90EE90" // Light green for AI
                    : "#FFA07A", // Light salmon for system
                color: "#000",
                margin: 0,
              }}
            >
              {c.content}
            </p>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div style={{ display: "flex", gap: "5px" }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          disabled={loading}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "10px",
            border: "1px solid #ccc",
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!message.trim() || loading}
          style={{
            padding: "10px 20px",
            borderRadius: "10px",
            border: "none",
            backgroundColor: "#4B0082",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}

export default App;





