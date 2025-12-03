import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import session from "express-session";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ===== Groq Settings =====
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = "openai/gpt-oss-20b";

if (!GROQ_API_KEY) console.error("⚠️ GROQ_API_KEY is not set!");

// ===== Middleware =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "supersecretkey123", // change for production
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // set true if using HTTPS
  })
);

// ===== Persistent AI Toggle =====
const AI_STATE_FILE = path.join(__dirname, "ai-state.json");

let aiEnabled = true;
if (fs.existsSync(AI_STATE_FILE)) {
  try {
    const saved = JSON.parse(fs.readFileSync(AI_STATE_FILE, "utf-8"));
    aiEnabled = !!saved.aiEnabled;
  } catch (err) {
    console.error("Error reading AI state file:", err);
  }
}

function saveAiState() {
  fs.writeFileSync(AI_STATE_FILE, JSON.stringify({ aiEnabled }), "utf-8");
}

// ===== Admin Credentials =====
const ADMIN_USERNAME = "Braxton";
const ADMIN_PASSWORD = "OGMSAdmin";

// ===== Helper Middleware =====
function requireAdmin(req, res, next) {
  if (!req.session.isAdmin) {
    return res.status(403).send("❌ Not authorized");
  }
  next();
}

// ===== Chat API =====
app.post("/api/chat", async (req, res) => {
  try {
    if (!aiEnabled) return res.json({ reply: "⚠️ AI is currently disabled by admin." });

    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      console.error("Invalid messages payload:", req.body);
      return res.status(400).json({ reply: "⚠️ Invalid messages payload" });
    }

    // Validate message roles
    const validRoles = ["user", "assistant", "system"];
    for (const msg of messages) {
      if (!msg.role || !validRoles.includes(msg.role) || !msg.content) {
        return res.status(400).json({ reply: "⚠️ Invalid message format" });
      }
    }

    console.log("Sending messages to Groq API:", messages);

    const response = await fetch("https://api.groq.com/v1/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    const data = await response.json();
    console.log("Groq API response:", JSON.stringify(data, null, 2));

    let reply = "⚠️ No reply from Groq API";
    if (data?.choices && data.choices[0]?.message?.content) {
      reply = data.choices[0].message.content;
    } else if (data?.error) {
      console.error("Groq API error:", data.error);
      reply = `⚠️ Groq API error: ${data.error.message}`;
    }

    res.json({ reply });
  } catch (err) {
    console.error("Chat API exception:", err);
    res.status(500).json({ reply: "⚠️ Server error. Check console." });
  }
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
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    res.redirect("/admin-panel");
  } else {
    res.status(401).send("⚠️ Invalid credentials.");
  }
});

// ===== Admin Panel =====
app.get("/admin-panel", requireAdmin, (req, res) => {
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
        <form method="POST" action="/admin-logout">
          <button type="submit">Logout</button>
        </form>
      </body>
    </html>
  `;
  res.send(html);
});

// ===== Toggle AI =====
app.post("/toggle-ai", requireAdmin, (req, res) => {
  aiEnabled = !aiEnabled;
  saveAiState();
  console.log("AI enabled:", aiEnabled);
  res.redirect("/admin-panel");
});

// ===== Admin Logout =====
app.post("/admin-logout", requireAdmin, (req, res) => {
  req.session.destroy(() => {
    res.redirect("/admin");
  });
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

// ===== Global Error Handlers =====
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

// ===== Start Server =====
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
