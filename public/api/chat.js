import fetch from "node-fetch";

let aiEnabled = true; // this will persist only in-memory for the serverless function instance

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ reply: "Method not allowed" });
  }

  if (!aiEnabled) return res.json({ reply: "⚠️ AI is currently disabled by admin." });

  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ reply: "⚠️ Invalid messages payload" });
    }

    const API_KEY = process.env.API_KEY;
    const GROQ_MODEL = "llama3-8b-8192";

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
      }),
    });

    const data = await response.json();
    const reply =
      data?.choices?.[0]?.message?.content ??
      `⚠️ Groq API error: ${data.error?.message || JSON.stringify(data.error)}`;

    return res.json({ reply });

  } catch (err) {
    console.error("Chat API exception:", err);
    return res.status(500).json({ reply: "⚠️ Server error. Check console." });
  }
}
