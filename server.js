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

// ===== ADMIN IDS =====
const adminIds = new Set([
  "7da47027-38ea-4054-a66e-c4e0d9d8d54c" // ← YOUR ID
]);

// ===== Chat API =====
app.post("/api/chat", async (req, res) => {
  try {
    if (!aiEnabled) {
      return res.json({ reply: "⚠️ AI is currently disabled by admin." });
    }

    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ reply: "⚠️ Invalid messages payload" });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages
      }),
    });

    const data = await response.json();

    let reply = "⚠️ No reply";
    if (data?.choices?.[0]?.message?.content) {
      reply = data.choices[0].message.content;
    } else if (data?.error) {
      reply = `⚠️ Groq API error: ${data.error.message}`;
    }

    res.json({ reply });

  } catch (err) {
    res.status(500).json({ reply: "⚠️ Server error" });
  }
});

// ===== Admin Toggle API =====
app.post("/api/admin-toggle", (req, res) => {
  const userId = req.headers["x-user-id"];

  if (!adminIds.has(userId)) {
    return res.status(403).json({ ok: false, error: "Not an admin" });
  }

  aiEnabled = req.body.toggle === "on";
  console.log("AI Enabled:", aiEnabled);

  return res.json({ ok: true, aiEnabled });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
