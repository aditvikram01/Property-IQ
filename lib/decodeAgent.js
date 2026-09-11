// Server-side "Decode contract" agent — shared by api/decode.js and
// server/index.js. Uses the SAME server-side Gemini key as eligibility, so users
// no longer have to supply their own key. Prompt building + grounding live in
// src/lib/understand.js (pure, no browser deps) and are reused here verbatim.

import {
  UNDERSTAND_SYSTEM, scriptFor, groundingForText,
  buildExplainPrompt, buildRiskPrompt, RISK_SCHEMA,
} from "../src/lib/understand.js";

const GEMINI_KEYS = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || process.env.legal || "")
  .split(",").map((k) => k.trim()).filter(Boolean);
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function stripFences(s = "") {
  let t = s.trim();
  if (t.startsWith("```")) t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if ((a > 0 || (b !== -1 && b < t.length - 1)) && a !== -1 && b > a) t = t.slice(a, b + 1);
  return t;
}

let keyCursor = 0;
async function gemini(body) {
  if (!GEMINI_KEYS.length) throw new Error("No Gemini API key configured (set GEMINI_API_KEYS).");
  body.generationConfig = { ...(body.generationConfig || {}), thinkingConfig: { thinkingBudget: 0 } };
  let lastErr;
  const maxAttempts = Math.max(GEMINI_KEYS.length, 4);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) await new Promise((res) => setTimeout(res, 600 * attempt));
    const key = GEMINI_KEYS[(keyCursor + attempt) % GEMINI_KEYS.length];
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (r.ok) { keyCursor = (keyCursor + attempt) % GEMINI_KEYS.length; return r.json(); }
    const txt = await r.text().catch(() => "");
    lastErr = new Error(`Gemini HTTP ${r.status}: ${txt.slice(0, 200)}`);
    if (r.status !== 429 && r.status !== 503 && r.status !== 500) throw lastErr;
  }
  throw lastErr || new Error("Gemini unavailable after retries.");
}

// op: "explain" -> { explain: markdownText } | "risk" -> { risk: <RISK_SCHEMA object> }
export async function runDecode({ text, language, op }) {
  const t = String(text || "");
  if (t.trim().length < 30) throw new Error("Please provide the contract text (at least a clause).");
  const lang = language || "English";
  const script = scriptFor(lang);
  const { grounding } = groundingForText(t);

  if (op === "explain") {
    const data = await gemini({
      systemInstruction: { parts: [{ text: UNDERSTAND_SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: buildExplainPrompt({ text: t, language: lang, script, grounding }) }] }],
      generationConfig: { temperature: 0.4 },
    });
    const out = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim();
    if (!out) throw new Error("The AI returned an empty response. Please try again.");
    return { explain: out };
  }

  const data = await gemini({
    systemInstruction: { parts: [{ text: UNDERSTAND_SYSTEM }] },
    contents: [{ role: "user", parts: [{ text: buildRiskPrompt({ text: t, language: lang, script, grounding }) }] }],
    generationConfig: { temperature: 0.2, responseMimeType: "application/json", responseSchema: RISK_SCHEMA },
  });
  const raw = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
  let parsed;
  try { parsed = JSON.parse(stripFences(raw)); } catch { throw new Error("The AI returned output that was not valid JSON. Please try again."); }
  return { risk: parsed };
}
