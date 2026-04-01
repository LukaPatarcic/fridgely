const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

app.use((req, res, next) => {
  console.log(`>>> ${req.method} ${req.url}`);
  next();
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/messages", async (req, res) => {
  console.log(">>> POST /api/messages received");

  // API key comes in the body from the app — strip whitespace/newlines from paste errors
  const { apiKey: rawKey, ...anthropicBody } = req.body;
  const apiKey = rawKey ? rawKey.replace(/\s+/g, "") : null;

  if (!apiKey) {
    console.log(">>> No apiKey in body");
    return res.status(400).json({ error: "Missing apiKey in request body" });
  }

  console.log(">>> Forwarding to Anthropic, model:", anthropicBody.model);

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(anthropicBody),
    });

    const data = await response.json();
    console.log(">>> Anthropic responded:", response.status);
    if (!response.ok) {
      console.error(">>> Error:", JSON.stringify(data, null, 2));
    }
    res.status(response.status).json(data);
  } catch (error) {
    console.error(">>> Proxy error:", error.message);
    res.status(500).json({ error: "Proxy request failed: " + error.message });
  }
});

const PORT = 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Proxy running on http://0.0.0.0:${PORT}`);
  const os = require("os");
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        console.log(`Phone: http://${iface.address}:${PORT}`);
      }
    }
  }
});
