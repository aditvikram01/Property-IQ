// Vercel serverless function — GET /api/health
// (Local dev still uses server/index.js via the Vite proxy; this file is for prod.)
import { providerStatus } from "../lib/llm.js";

export default function handler(req, res) {
  const s = providerStatus();
  res.status(200).json({
    ok: true,
    indiaKanoon: Boolean(process.env.INDIAN_KANOON_TOKEN),
    provider: s.provider,            // "openai" | null
    openai: s.openai,
    openaiKeys: s.openaiKeys,
    model: s.model,
  });
}
