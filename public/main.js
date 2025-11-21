const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatList = document.getElementById("chat-list");
const newChatBtn = document.getElementById("new-chat");

/* ========== Load chats from cookies ========== */
let chats = {};
const saved = document.cookie.split("; ").find(row => row.startsWith("chats="));
if (saved) {
  try {
    chats = JSON.parse(decodeURIComponent(saved.split("=")[1]));
  } catch {}
}

/* ========== Initialize chat ========== */
let currentChat = null;
if (Object.keys(chats).length === 0) {
  createNewChat();
} else {
  currentChat = Object.keys(chats)[0];
  if (!currentChat) currentChat = createNewChat();
  updateSidebar();
  renderChat();
}

/* ========== Functions ========== */
function updateSidebar() {
  chatList.innerHTML = "";
  Object.keys(chats).forEach(id => {
    const li = document.createElement("li");
    li.textContent = id;
    li.className = id === currentChat ? "active" : "";
    li.onclick = () => switchChat(id);
    chatList.appendChild(li);
  });
}

function saveChats() {
  document.cookie =
    `chats=${encodeURIComponent(JSON.stringify(chats))}; path=/; max-age=604800`;
}

function createNewChat() {
  const id = `Chat ${Object.keys(chats).length + 1}`;
  chats[id] = [];
  currentChat = id;
  updateSidebar();
  renderChat();
  saveChats();
  return id;
}

function switchChat(id) {
  currentChat = id;
  updateSidebar();
  renderChat();
}

function renderChat() {
  if (!currentChat || !chats[currentChat]) return;
  chatWindow.innerHTML = "";
  for (const msg of chats[currentChat]) {
    appendMessage(msg.role, msg.content);
  }
}

function appendMessage(role, content) {
  if (!chatWindow) return;
  const div = document.createElement("div");
  div.className = role === "user" ? "user-msg" : "ai-msg";

  try {
    if (typeof marked !== "undefined") {
      div.innerHTML = marked.parse(content);
    } else {
      div.textContent = content;
    }
  } catch {
    div.textContent = content;
  }

  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return div; // return for typing indicator
}

/* ========== Chat Form Handler ========== */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = chatInput.value.trim();
  if (!message) return;

  // Clear input immediately
  chatInput.value = "";

  if (!currentChat) currentChat = createNewChat();
  if (!chats[currentChat]) chats[currentChat] = [];

  // Add user message
  appendMessage("user", message);
  chats[currentChat].push({ role: "user", content: message });
  saveChats();

  // Show typing indicator
  const typingDiv = appendMessage("assistant", "💬 Assistant is typing...");
  typingDiv.classList.add("typing");

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are OGMSAI, a helpful assistant." },
          ...chats[currentChat]
        ]
      })
    });

    let data;
    try {
      data = await res.json();
    } catch (jsonErr) {
      console.error("Failed to parse JSON from server:", jsonErr);
      data = { reply: "⚠️ Invalid server response." };
    }

    // Remove typing indicator and show reply
    typingDiv.classList.remove("typing");
    const reply = data.reply || "⚠️ No reply from server.";
    typingDiv.textContent = reply;

    chats[currentChat].push({ role: "assistant", content: reply });
    saveChats();

  } catch (err) {
    // Always remove typing indicator even if fetch fails
    typingDiv.classList.remove("typing");
    typingDiv.textContent = "⚠️ Server error. Please try again.";
    console.error("Chat fetch error:", err);
  }
});

newChatBtn.onclick = createNewChat;
