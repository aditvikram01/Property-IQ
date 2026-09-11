// Vercel serverless function — GET /api/health
// (Local dev still uses server/index.js via the Vite proxy; this file is for prod.)
import { providerStatus } from "../lib/llm.js";

export default function handler(req, res) {
  const s = providerStatus();
  res.status(200).json({
    ok: true,
    indiaKanoon: Boolean(process.env.INDIAN_KANOON_TOKEN),
    provider: s.provider,            // primary provider tried first ("gemini" | "groq" | "openai" | null)
    order: s.order,                  // full fallback order
    model: s.model,
    gemini: s.gemini, geminiKeys: s.geminiKeys,
    groq: s.groq, groqKeys: s.groqKeys,
    openai: s.openai, openaiKeys: s.openaiKeys,
  });
}
