const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const os = require("os");

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const PORT = 3001;
const REQUEST_TIMEOUT_MS = 60000;

// Resolve local network IP
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "127.0.0.1";
}

const LOCAL_IP = getLocalIp();

const app = express();

// Restrict CORS to local network origins only
const allowedOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$/;
app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (mobile apps, curl)
      if (!origin || allowedOriginPattern.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS: origin not allowed"));
      }
    },
  })
);

app.use(express.json({ limit: "5mb" }));

// Rate limiting: 60 requests per minute per IP
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later" },
  })
);

// Request logging (non-sensitive only)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/messages", async (req, res) => {
  // Proxy token auth (optional, enabled via PROXY_TOKEN env var)
  const proxyToken = process.env.PROXY_TOKEN;
  if (proxyToken && req.body.proxyToken !== proxyToken) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // Extract API key from body, strip whitespace from paste errors
  const { apiKey: rawKey, proxyToken: _pt, ...anthropicBody } = req.body;
  const apiKey = rawKey ? rawKey.replace(/\s+/g, "") : null;

  // Validate API key format
  if (!apiKey || !apiKey.startsWith("sk-ant-")) {
    return res.status(400).json({ error: "Invalid or missing API key" });
  }

  // Forward to Anthropic with timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(anthropicBody),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await response.json();
    console.log("Anthropic response:", response.status);
    res.status(response.status).json(data);
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === "AbortError") {
      console.error("Request to Anthropic timed out");
      return res.status(504).json({ error: "Request timed out" });
    }
    console.error("Proxy error");
    res.status(500).json({ error: "Proxy request failed" });
  }
});

app.listen(PORT, LOCAL_IP, () => {
  console.log(`Proxy running on http://${LOCAL_IP}:${PORT}`);
});
