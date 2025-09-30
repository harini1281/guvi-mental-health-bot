import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

function App() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(localStorage.getItem("jwt") || "");
  const [authMode, setAuthMode] = useState(token ? "chat" : "login"); // login/register/chat
  const [authData, setAuthData] = useState({ username: "", email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [chatTyping, setChatTyping] = useState(false);
  const [language, setLanguage] = useState("en");
  const [mood, setMood] = useState("");
  const [moodNote, setMoodNote] = useState("");
  const [moodMsg, setMoodMsg] = useState("");
  const [meditation, setMeditation] = useState("");
  const [wellnessPlan, setWellnessPlan] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  // ================= AUTH HANDLERS =================
  const handleAuthChange = (e) => {
    setAuthData({ ...authData, [e.target.name]: e.target.value });
  };

  const register = async () => {
    setAuthError("");
    try {
      const res = await axios.post("http://127.0.0.1:5000/register", authData);
      setAuthMode("login");
      setAuthData({ username: "", email: "", password: "" });
      setAuthError("Registration successful! Please login.");
    } catch (err) {
      setAuthError(err.response?.data?.error || "Registration failed");
    }
  };

  const login = async () => {
    setAuthError("");
    try {
      const res = await axios.post("http://127.0.0.1:5000/login", authData);
      const jwt = res.data.token;
      localStorage.setItem("jwt", jwt);
      setToken(jwt);
      setAuthMode("chat");
      setAuthData({ username: "", email: "", password: "" });
    } catch (err) {
      setAuthError(err.response?.data?.error || "Login failed");
    }
  };

  const logout = () => {
    localStorage.removeItem("jwt");
    setToken("");
    setAuthMode("login");
    setChat([]);
    setAuthError("");
  };

  // ================= CHAT HANDLER =================
  const sendMessage = async () => {
    if (!message.trim()) return;

    setLoading(true);
    setChat((prev) => [...prev, { role: "user", content: message }]);
    setMessage("");
    setChatTyping(true);

    try {
      const res = await axios.post(
        "http://127.0.0.1:5000/chat",
        { message, language },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Handle crisis escalation
      if (res.data.escalate) {
        setChat((prev) => [
          ...prev,
          { role: "ai", content: res.data.reply },
          ...(res.data.resources
            ? [
                {
                  role: "system",
                  content:
                    "Resources:\n" +
                    res.data.resources
                      .map((r) => `${r.name}: ${r.number}`)
                      .join("\n"),
                },
              ]
            : []),
        ]);
      } else {
        setChat((prev) => [
          ...prev,
          { role: "ai", content: res.data.reply || "No reply from AI." },
        ]);
      }
    } catch (err) {
      console.error(err);
      setChat((prev) => [
        ...prev,
        { role: "system", content: "Error connecting to server." },
      ]);
    } finally {
      setLoading(false);
      setChatTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !loading) sendMessage();
  };

  // Mood tracking
  const logMood = async () => {
    if (!mood) return;
    setMoodMsg("");
    try {
      await axios.post(
        "http://127.0.0.1:5000/mood",
        { mood, note: moodNote },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMoodMsg("Mood logged!");
      setMood("");
      setMoodNote("");
    } catch (err) {
      setMoodMsg("Failed to log mood.");
    }
  };

  // Meditation guidance
  const fetchMeditation = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:5000/meditation", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMeditation(res.data.meditation);
    } catch {
      setMeditation("Unable to fetch meditation guidance.");
    }
  };

  // Wellness plan
  const fetchWellnessPlan = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:5000/wellness-plan", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWellnessPlan(res.data.plan);
    } catch {
      setWellnessPlan("Unable to fetch wellness plan.");
    }
  };

  // ================= RENDER =================
  if (authMode === "login" || authMode === "register") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #E0BBE4, #957DAD)",
          padding: "20px",
          fontFamily: "Arial",
        }}
      >
        <div
          style={{
            background: "#fff",
            padding: "30px",
            borderRadius: "15px",
            width: "350px",
            boxShadow: "0 5px 15px rgba(0,0,0,0.2)",
          }}
        >
          <h2 style={{ textAlign: "center", color: "#4B0082" }}>
            {authMode === "login" ? "Login" : "Register"}
          </h2>

          {authError && (
            <p style={{ color: "red", textAlign: "center" }}>{authError}</p>
          )}

          {authMode === "register" && (
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={authData.username}
              onChange={handleAuthChange}
              style={inputStyle}
            />
          )}
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={authData.email}
            onChange={handleAuthChange}
            style={inputStyle}
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={authData.password}
            onChange={handleAuthChange}
            style={inputStyle}
          />

          <button
            onClick={authMode === "login" ? login : register}
            style={buttonStyle}
            disabled={loading}
          >
            {loading ? "Please wait..." : authMode === "login" ? "Login" : "Register"}
          </button>

          <p style={{ textAlign: "center", marginTop: "10px" }}>
            {authMode === "login" ? "No account?" : "Already have an account?"}{" "}
            <span
              style={{ color: "#4B0082", cursor: "pointer" }}
              onClick={() =>
                setAuthMode(authMode === "login" ? "register" : "login")
              }
            >
              {authMode === "login" ? "Register" : "Login"}
            </span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "auto",
        padding: "20px",
        fontFamily: "Arial",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2 style={{ color: "#4B0082" }}>AI Mental Health Companion</h2>
        <button onClick={logout} style={buttonStyle}>
          Logout
        </button>
      </div>

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
                    ? "#ADD8E6"
                    : c.role === "ai"
                    ? "#90EE90"
                    : "#FFA07A",
                color: "#000",
                margin: 0,
              }}
            >
              {c.role === "user" ? "🧑 " : c.role === "ai" ? "🤖 " : ""}{" "}
              {c.content}
            </p>
          </div>
        ))}
        {chatTyping && (
          <p style={{ fontStyle: "italic", color: "#555" }}>🤖 AI is typing...</p>
        )}
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
          style={inputStyle}
        />
        <button
          onClick={sendMessage}
          disabled={!message.trim() || loading}
          style={buttonStyle}
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>

      {/* Language selection */}
      <div style={{ marginBottom: "10px" }}>
        <label>
          Language:{" "}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{ borderRadius: "5px", padding: "3px" }}
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="ta">Tamil</option>
            <option value="te">Telugu</option>
            {/* Add more regional languages as needed */}
          </select>
        </label>
      </div>

      {/* Mood tracking UI */}
      <div style={{ marginBottom: "10px", background: "#f7e7ff", padding: "10px", borderRadius: "10px" }}>
        <h4>Mood Tracking</h4>
        <input
          type="text"
          placeholder="Your mood (e.g. happy, sad)"
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          style={{ ...inputStyle, marginBottom: "5px" }}
        />
        <input
          type="text"
          placeholder="Optional note"
          value={moodNote}
          onChange={(e) => setMoodNote(e.target.value)}
          style={inputStyle}
        />
        <button onClick={logMood} style={buttonStyle} disabled={!mood}>
          Log Mood
        </button>
        {moodMsg && <div style={{ color: "green" }}>{moodMsg}</div>}
      </div>

      {/* Meditation and Wellness Plan */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        <button onClick={fetchMeditation} style={buttonStyle}>
          Get Meditation Guidance
        </button>
        <button onClick={fetchWellnessPlan} style={buttonStyle}>
          Get Wellness Plan
        </button>
      </div>
      {meditation && (
        <div style={{ background: "#e0ffe0", padding: "10px", borderRadius: "10px", marginBottom: "10px" }}>
          <strong>Meditation:</strong> {meditation}
        </div>
      )}
      {wellnessPlan && (
        <div style={{ background: "#e0f7ff", padding: "10px", borderRadius: "10px", marginBottom: "10px" }}>
          <strong>Wellness Plan:</strong> {wellnessPlan}
        </div>
      )}
    </div>
  );
}

// ================= STYLES =================
const inputStyle = {
  flex: 1,
  padding: "10px",
  borderRadius: "10px",
  border: "1px solid #ccc",
};

const buttonStyle = {
  padding: "10px 20px",
  borderRadius: "10px",
  border: "none",
  backgroundColor: "#4B0082",
  color: "#fff",
  cursor: "pointer",
};

export default App;

