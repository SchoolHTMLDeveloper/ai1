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

// ===== Environment =====
const adminUser = process.env.adminuser;
const adminPassword = process.env.adminpassword;
const API_KEY = process.env.API_KEY;
const GROQ_MODEL = "llama3-8b-8192"; // Example working model

if (!API_KEY) console.error("⚠️ API_KEY not set!");

// ===== Middleware =====
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// ===== AI Toggle =====
let aiEnabled = true;

// ===== Helper: Admin Check =====
function requireAdmin(req, res, next) {
  if (req.cookies?.admin === "true") return next();
  res.redirect("/admin");
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

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages
      }),
    });

    const data = await response.json();

    let reply =
      data?.choices?.[0]?.message?.content ??
      `⚠️ Groq API error: ${data.error?.message || JSON.stringify(data.error)}`;

    res.json({ reply });

  } catch (err) {
    console.error("Chat API exception:", err);
    res.status(500).json({ reply: "⚠️ Server error. Check console." });
  }
});

// ===== Admin Login Page =====
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-login.html"));
});

// ===== Admin Login Handler =====
app.post("/admin-login", (req, res) => {
  const { username, password } = req.body;
  if (username === adminUser && password === adminPassword) {
    res.cookie("admin", "true", { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
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
      </body>
    </html>
  `;
  res.send(html);
});

app.post("/toggle-ai", requireAdmin, (req, res) => {
  aiEnabled = !aiEnabled;
  console.log("AI enabled:", aiEnabled);
  res.redirect("/admin-panel");
});

// ===== Serve Homepage =====
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/credits", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "credits.html"));
});

// ===== Global Error Handling =====
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
