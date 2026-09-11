// Vercel serverless function — POST /api/decode
// Server-side "Decode contract" (Explain / Analyze Risk). Uses the shared
// server-side Gemini key (GEMINI_API_KEYS / GEMINI_API_KEY / legal). Logic lives
// in lib/decodeAgent.js (shared with server/index.js).

import { runDecode } from "../lib/decodeAgent.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const out = await runDecode({ text: body.text, language: body.language, op: body.op });
    return res.status(200).json(out);
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
