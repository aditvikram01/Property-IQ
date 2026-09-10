// PropertyIQ local backend — contextual-RAG eligibility (zero deps, Node 18+).
//
// All agent logic lives in lib/ragAgent.js (shared with api/eligibility.js so the
// two backends can't drift). This file is just HTTP transport for local dev; the
// Vite dev server proxies /api -> :8787. No India Kanoon token needed at query
// time anymore — eligibility retrieves from the bundled RAG database.
//
// Run:  node server/index.js   (or: npm run server)

import http from "node:http";
import { runRagEligibility } from "../lib/ragAgent.js";

const PORT = Number(process.env.PORT) || 8787;
const GEMINI_KEYS = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "")
  .split(",").map((k) => k.trim()).filter(Boolean);
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function send(res, code, obj) {
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => { data += c; if (data.length > 5e6) req.destroy(); });
    req.on("end", () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/api/health") {
    return send(res, 200, { ok: true, gemini: GEMINI_KEYS.length > 0, geminiKeys: GEMINI_KEYS.length, model: GEMINI_MODEL });
  }

  if (url.pathname === "/api/eligibility" && req.method === "POST") {
    try {
      const body = await readBody(req);
      if (!body || !body.form) return send(res, 400, { error: "Missing 'form' in request body." });
      const out = await runRagEligibility(body.form);
      return send(res, 200, out);
    } catch (e) {
      console.error("[eligibility] error:", e);
      return send(res, 500, { error: String(e.message || e) });
    }
  }

  return send(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`PropertyIQ RAG eligibility backend on http://localhost:${PORT}`);
  console.log(`  Gemini keys: ${GEMINI_KEYS.length} (${GEMINI_MODEL})`);
});
