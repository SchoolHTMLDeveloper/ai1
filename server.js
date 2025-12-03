import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ===== Groq Settings =====
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = "openai/gpt-oss-20b"; // Replace with a model you have access to

if (!GROQ_API_KEY) console.error("⚠️ GROQ_API_KEY is not set in environment variables!");

// ===== Middleware =====
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ===== AI Toggle =====
let aiEnabled = true;

// ===== Chat API =====
app.post("/api/chat", async (req, res) => {
  try {
    if (!aiEnabled) return res.json({ reply: "⚠️ AI is currently disabled by admin." });

    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      console.error("Invalid messages payload:", req.body);
      return res.status(400).json({ reply: "⚠️ Invalid messages payload" });
    }

    console.log("Sending messages to Groq API:", messages);

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: messages.map(m => ({ role: m.role, content: m.content }))
      }),
    });

    const data = await response.json();
    console.log("Groq API response:", JSON.stringify(data, null, 2));

    let reply = "⚠️ No reply";
    if (data?.choices && data.choices[0]?.message?.content) {
      reply = data.choices[0].message.content;
    } else if (data?.error) {
      console.error("Groq API error:", data.error);
      reply = `⚠️ Groq API error: ${data.error.message}`;
    } else {
      console.error("Unexpected Groq API response:", data);
    }

    res.json({ reply });

  } catch (err) {
    console.error("Chat API exception:", err);
    res.status(500).json({ reply: "⚠️ Server error. Check console." });
  }
});

// ===== Admin Toggle API =====
app.post("/api/admin-toggle", (req, res) => {
  const { toggle } = req.body;

  if (toggle === "on") aiEnabled = true;
  else if (toggle === "off") aiEnabled = false;
  else return res.json({ ok: false, error: "Invalid toggle command" });

  console.log("AI toggled:", aiEnabled);
  res.json({ ok: true, aiEnabled });
});

// ===== Admin Login Page =====
app.get("/admin", (req, res) => {
  const filePath = path.join(__dirname, "public", "admin-login.html");
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error("Error serving admin login page:", err);
      res.status(500).send("⚠️ Could not load admin login page. Check server logs.");
    }
  });
});

// ===== Admin Login Handler =====
app.post("/admin-login", (req, res) => {
  const { username, password } = req.body;
  if (username === "Braxton" && password === "OGMSAdmin") {
    res.redirect("/admin-panel");
  } else {
    res.status(401).send("⚠️ Invalid credentials.");
  }
});

// ===== Admin Panel (Toggle AI) =====
app.get("/admin-panel", (req, res) => {
  const html = `
    <html>
      <head>
        <title>Admin Panel</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 2rem; }
          button { padding: 0.5rem 1rem; font-size: 1rem; }
        </style>
      </head>
      <body>
        <h1>Admin Panel</h1>
        <p>AI is currently: <strong>${aiEnabled ? "Enabled" : "Disabled"}</strong></p>
        <form method="POST" action="/toggle-ai">
          <button type="submit">${aiEnabled ? "Disable AI" : "Enable AI"}</button>
        </form>
      </body>
    </html>
  `;
  res.send(html);
});

app.post("/toggle-ai", (req, res) => {
  aiEnabled = !aiEnabled;
  console.log("AI enabled:", aiEnabled);
  res.redirect("/admin-panel");
});

// ===== Serve homepage =====
app.get("/", (req, res) => {
  const filePath = path.join(__dirname, "public", "index.html");
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error("Error serving index page:", err);
      res.status(500).send("⚠️ Could not load homepage. Check server logs.");
    }
  });
});

// ===== Global error handlers =====
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  res.status(500).send("⚠️ Internal Server Error. Check server console.");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception thrown:", err);
});

// ===== Start server =====
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
