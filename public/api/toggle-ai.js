let aiEnabled = true; // This will reset occasionally in serverless, but works for simple demo

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  // Check admin cookie
  if (req.cookies?.admin !== "true") return res.status(401).send("Unauthorized");

  aiEnabled = !aiEnabled;
  return res.redirect("/admin-panel");
}
