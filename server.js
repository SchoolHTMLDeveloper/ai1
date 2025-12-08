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

// ===== Admin IDs =====
const ADMIN_IDS = new Set(["7da47027-38ea-4054-a66e-c4e0d9d8d54c"]);

// ===== Chat API =====
app.post("/api/chat", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];

    // Only block AI if disabled AND the user is not admin
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

// ===== Admin Toggle API =====
app.post("/api/admin-toggle", (req, res) => {
  const userId = req.headers["x-user-id"];
  if (!ADMIN_IDS.has(userId)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const { toggle } = req.body;
  aiEnabled = toggle === "on";
  console.log(`AI enabled: ${aiEnabled}`);
  res.json({ ok: true, aiEnabled });
});

// ===== Serve homepage =====
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===== Serve admin login =====
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-login.html"));
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
