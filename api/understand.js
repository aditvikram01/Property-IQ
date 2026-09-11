// Vercel serverless function — POST /api/understand
//
// Server-side "Decode Contract" so the Gemini key lives in an env var and is
// NEVER shipped to the browser: the client sends only { op, text, language }.
// (Local dev uses the same logic via server/index.js behind the Vite proxy.)
//
// Required Vercel env var: GEMINI_API_KEYS (or GEMINI_API_KEY), comma-separated.
// NEVER hardcode a key here — it is read from the environment only.

import { decodeContract } from "../src/lib/decodeContract.js";

const GEMINI_KEYS = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || process.env.legal || "")
  .split(",").map((k) => k.trim()).filter(Boolean);
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { op, text, language } = body;
    if (!op || (op !== "explain" && op !== "risk")) {
      return res.status(400).json({ error: "op must be 'explain' or 'risk'." });
    }
    if (!text || String(text).trim().length < 30) {
      return res.status(400).json({ error: "Add a contract first — upload a PDF or paste at least a clause of text." });
    }
    if (!GEMINI_KEYS.length) {
      return res.status(503).json({ error: "The AI service is not configured on the server (set GEMINI_API_KEYS or legal)." });
    }
    const out = await decodeContract({ op, text, language, keys: GEMINI_KEYS, model: GEMINI_MODEL });
    return res.status(200).json(out);
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e) });
  }
}
