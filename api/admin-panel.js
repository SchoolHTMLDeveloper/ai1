export default function handler(req, res) {
  if (req.cookies?.admin !== "true") return res.redirect("/admin");

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
        <form method="POST" action="/api/toggle-ai">
          <button type="submit">Toggle AI</button>
        </form>
      </body>
    </html>
  `;
  res.setHeader("Content-Type", "text/html");
  res.end(html);
}
