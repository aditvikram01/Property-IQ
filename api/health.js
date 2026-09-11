// Vercel serverless function — GET /api/health
// (Local dev still uses server/index.js via the Vite proxy; this file is for prod.)
export default function handler(req, res) {
  const keys = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || process.env.legal || "").split(",").map((k) => k.trim()).filter(Boolean);
  res.status(200).json({
    ok: true,
    indiaKanoon: Boolean(process.env.INDIAN_KANOON_TOKEN),
    gemini: keys.length > 0,
    geminiKeys: keys.length,
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  });
}
