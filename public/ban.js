// ban.js
// Automatically close tab if message contains disallowed email

(function () {
  const ALLOWED_DOMAINS = new Set([
    "gmail.com",
    "students.davidson.k12.nc.us"
  ]);

  const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g;

  // check if content has disallowed email
  function hasDisallowedEmail(content) {
    if (!content) return false;
    const text = stripHtml(content);
    let match;
    EMAIL_REGEX.lastIndex = 0;
    while ((match = EMAIL_REGEX.exec(text)) !== null) {
      const domain = (match[1] || "").toLowerCase();
      if (!ALLOWED_DOMAINS.has(domain)) return true;
    }
    return false;
  }

  function stripHtml(html) {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  }

  function tryCloseTab() {
    try {
      window.open("", "_self"); // sometimes needed for Chrome
      window.close();
      // fallback alert if browser blocks
      alert("Disallowed email detected. Please close the tab manually.");
    } catch (e) {
      alert("Disallowed email detected. Please close the tab manually.");
    }
  }

  // wrap existing appendMessage if present
  function installWrapper() {
    if (typeof window.appendMessage === "function") {
      const orig = window.appendMessage;
      window.appendMessage = function(role, content) {
        if (hasDisallowedEmail(content)) {
          tryCloseTab();
          return; // stop processing message
        }
        orig.call(this, role, content);
      };
    } else {
      // try again later if appendMessage not ready
      let tries = 0;
      const iv = setInterval(() => {
        tries++;
        if (typeof window.appendMessage === "function") {
          clearInterval(iv);
          installWrapper();
        } else if (tries > 10) {
          clearInterval(iv);
          console.warn("ban.js: appendMessage not found — wrapper not installed.");
        }
      }, 300);
    }
  }

  installWrapper();
})();
