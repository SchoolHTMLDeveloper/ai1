const loginForm = document.getElementById("login-form");
const loginView = document.getElementById("login-view");
const dashboardView = document.getElementById("dashboard-view");
const toggleAI = document.getElementById("toggle-ai");
const logoutBtn = document.getElementById("logout");
const adminpass1 = process.env.adminpassword;

// Login
loginForm.onsubmit = async (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const res = await fetch("/api/admin-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();
  if (data.success) {
    loginView.style.display = "none";
    dashboardView.style.display = "block";
  } else {
    alert("❌ Login failed.");
  }
};

// Toggle AI
toggleAI.onchange = async (e) => {
  await fetch("/api/admin-toggle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled: e.target.checked })
  });
};

// Logout
logoutBtn.onclick = async () => {
  await fetch("/api/admin-logout", { method: "POST" });
  location.reload();
};
