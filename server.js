import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ===== Groq Settings =====
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = "openai/gpt-oss-20b";

if (!GROQ_API_KEY) console.error("⚠️ GROQ_API_KEY is not set!");

// ===== Middleware =====
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());

// ===== Simple ID generator =====
function generateId() {
  return 'xxxx-xxxx-xxxx-xxxx'.replace(/[x]/g, () =>
    ((Math.random() * 16) | 0).toString(16)
  );
}

// ===== Auto-assign unique ID =====
app.use((req, res, next) => {
  if (!req.cookies?.id) {
    const newId = generateId();
    res.cookie("id", newId, { httpOnly: false, path: "/" });
    req.cookies.id = newId;
    console.log("Assigned new user ID:", newId);
  }
  next();
});

// ===== AI Toggle =====
let aiEnabled = true;

// ===== Admin IDs =====
const ADMIN_IDS = ["PUT_ADMIN_UUID_HERE"]; // replace with your admin UUID(s)

// ===== Admin toggle endpoint =====
app.post("/api/admin-toggle", (req, res) => {
  try {
    const adminId = req.cookies?.id;
    const { toggle } = req.body;

    if (!adminId || !ADMIN_IDS.includes(adminId)) {
      return res.status(403).json({ ok: false, error: "Not admin" });
    }

    if (toggle !== "on" && toggle !== "off") {
      return res.status(400).json({ ok: false, error: "Invalid toggle value" });
    }

    aiEnabled = toggle === "on";
    console.log(`AI toggled by admin ${adminId}:`, aiEnabled ? "ON" : "OFF");

    res.json({ ok: true, aiEnabled });
  } catch (err) {
    console.error("Error in /api/admin-toggle:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// ===== Chat API =====
app.post("/api/chat", async (req, res) => {
  try {
    if (!aiEnabled) return res.json({ reply: "⚠️ AI is currently disabled by admin." });

    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      console.error("Invalid messages payload:", req.body);
      return res.status(400).json({ reply: "⚠️ Invalid messages payload" });
    }

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

// ===== Admin login page =====
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-login.html"), (err) => {
    if (err) console.error("Error serving admin login page:", err);
  });
});

// ===== Admin login handler =====
app.post("/admin-login", (req, res) => {
  const { username, password } = req.body;
  if (username === "Braxton" && password === "OGMSAdmin") {
    res.redirect("/admin-panel");
  } else {
    res.status(401).send("⚠️ Invalid credentials.");
  }
});

// ===== Admin panel =====
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
  res.redirect("/admin-panel");
});

// ===== Homepage =====
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"), (err) => {
    if (err) console.error("Error serving homepage:", err);
  });
});

// ===== Errors =====
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  res.status(500).send("⚠️ Internal Server Error");
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
