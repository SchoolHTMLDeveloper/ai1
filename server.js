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
const GROQ_MODEL = "openai/gpt-oss-20b";

if (!GROQ_API_KEY) console.error("⚠️ GROQ_API_KEY is not set!");

// ===== Middleware =====
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ===== AI Toggle =====
let aiEnabled = true;

// ===== Admins =====
const ADMIN_IDS = new Set(["7da47027-38ea-4054-a66e-c4e0d9d8d54c"]);

// ===== Chat API =====
app.post("/api/chat", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];

    if (!aiEnabled && !ADMIN_IDS.has(userId)) {
      return res.json({ reply: "⚠️ AI is currently disabled by admin." });
    }

    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ reply: "⚠️ Invalid messages payload" });
    }

    const response = await fetch("https://api.groq.com/v1/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: messages.map(m => ({ role: m.role, content: m.content }))
      })
    });

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content || "⚠️ No reply";

    res.json({ reply });

  } catch (err) {
    console.error("Chat API error:", err);
    res.status(500).json({ reply: "⚠️ Server error. Check console." });
  }
});

// ===== Admin toggle API =====
app.post("/api/admin-toggle", (req, res) => {
  const userId = req.headers["x-user-id"];
  if (!ADMIN_IDS.has(userId)) return res.status(403).json({ ok: false, error: "Not authorized" });

  const { toggle } = req.body;
  if (toggle === "on") aiEnabled = true;
  else if (toggle === "off") aiEnabled = false;
  else return res.status(400).json({ ok: false, error: "Invalid toggle value" });

  console.log(`AI toggled by admin ${userId}: ${aiEnabled ? "ON" : "OFF"}`);
  res.json({ ok: true, aiEnabled });
});

// ===== Serve homepage =====
app.get("/", (req, res) => {
  const filePath = path.join(__dirname, "public", "index.html");
  res.sendFile(filePath);
});

// ===== Admin pages =====
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-login.html"));
});

app.post("/admin-login", (req, res) => {
  const { username, password } = req.body;
  if (username === "Braxton" && password === "OGMSAdmin") {
    res.redirect("/admin-panel");
  } else {
    res.status(401).send("⚠️ Invalid credentials");
  }
});

app.get("/admin-panel", (req, res) => {
  res.send(`
    <html>
      <head><title>Admin Panel</title></head>
      <body>
        <h1>Admin Panel</h1>
        <p>AI is currently: <strong>${aiEnabled ? "Enabled" : "Disabled"}</strong></p>
        <form method="POST" action="/toggle-ai">
          <button type="submit">${aiEnabled ? "Disable AI" : "Enable AI"}</button>
        </form>
      </body>
    </html>
  `);
});

app.post("/toggle-ai", (req, res) => {
  aiEnabled = !aiEnabled;
  res.redirect("/admin-panel");
});

// ===== Errors =====
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).send("⚠️ Internal Server Error");
});

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

// ===== Start server =====
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
