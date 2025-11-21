export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  const { username, password } = req.body;
  const adminUser = process.env.adminuser;
  const adminPassword = process.env.adminpassword;

  if (username === adminUser && password === adminPassword) {
    res.setHeader("Set-Cookie", "admin=true; Path=/; HttpOnly; Max-Age=86400");
    return res.redirect("/admin-panel");
  } else {
    return res.status(401).send("⚠️ Invalid credentials.");
  }
}
