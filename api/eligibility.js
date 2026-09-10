// Vercel serverless function — POST /api/eligibility
// Contextual-RAG eligibility. All logic lives in lib/ragAgent.js (shared with
// server/index.js). Required Vercel env: GEMINI_API_KEYS (or GEMINI_API_KEY);
// optional GEMINI_MODEL (default gemini-2.5-flash). India Kanoon token is NOT
// needed here anymore — retrieval is over the bundled RAG database.

import { runRagEligibility } from "../lib/ragAgent.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    if (!body.form) return res.status(400).json({ error: "Missing 'form' in request body." });
    const out = await runRagEligibility(body.form);
    return res.status(200).json(out);
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
