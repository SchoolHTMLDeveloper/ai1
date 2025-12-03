// Admin toggle commands
if (message === "/ai-on" || message === "/ai-off") {
  const myId = getMyId();
  try {
    const res = await fetch("/api/admin-toggle", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-User-Id": myId
      },
      body: JSON.stringify({ toggle: message === "/ai-on" ? "on" : "off" })
    });

    const data = await res.json();
    addSystemMessage(data.ok
      ? `✅ AI turned ${data.aiEnabled ? "ON" : "OFF"}`
      : `${data.error || "❌ Admin toggle failed"}`);
  } catch {
    addSystemMessage("❌ Error toggling AI");
  }
  chatInput.value = "";
  return;
}
