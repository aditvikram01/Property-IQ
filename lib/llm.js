// Shared LLM provider layer for PropertyIQ's server-side AI calls (decode +
// eligibility + the nightly DB refresh). Prefers OpenAI when an OpenAI key is
// present, otherwise falls back to Gemini — so the app keeps working on whichever
// key is configured. Keys live ONLY in env vars; the browser never sees them.
//
//   OpenAI key:  OPENAI_API_KEYS | OPENAI_API_KEY | legal_1   (comma-separated → rotated)
//   Gemini key:  GEMINI_API_KEYS | GEMINI_API_KEY | legal      (comma-separated → rotated)
//   Models:      OPENAI_MODEL (default gpt-4o-mini), GEMINI_MODEL (default gemini-2.5-flash)

const splitKeys = (s) => String(s || "").split(",").map((k) => k.trim()).filter(Boolean);

const OPENAI_KEYS = splitKeys(process.env.OPENAI_API_KEYS || process.env.OPENAI_API_KEY || process.env.legal_1);
const GEMINI_KEYS = splitKeys(process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || process.env.legal);
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export function activeProvider() {
  if (OPENAI_KEYS.length) return "openai";
  if (GEMINI_KEYS.length) return "gemini";
  return null;
}

// Shape reported by /api/health so the UI/ops can see which provider is live.
export function providerStatus() {
  const provider = activeProvider();
  return {
    provider,
    openai: OPENAI_KEYS.length > 0,
    openaiKeys: OPENAI_KEYS.length,
    gemini: GEMINI_KEYS.length > 0,
    geminiKeys: GEMINI_KEYS.length,
    model: provider === "openai" ? OPENAI_MODEL : provider === "gemini" ? GEMINI_MODEL : null,
  };
}

const isTransient = (status) => status === 429 || status === 500 || status === 503;

let oaCursor = 0;
async function openai({ system, prompt, json, temperature }) {
  const body = {
    model: OPENAI_MODEL,
    messages: [
      ...(system ? [{ role: "system", content: system }] : []),
      { role: "user", content: prompt },
    ],
    temperature: typeof temperature === "number" ? temperature : 0.4,
  };
  // JSON mode returns strictly valid JSON; the prompt itself carries the field
  // schema (OpenAI json_object mode needs the word "json" in the messages, which
  // our risk/eligibility prompts already include).
  if (json) body.response_format = { type: "json_object" };
  let lastErr;
  const maxAttempts = Math.max(OPENAI_KEYS.length, 4);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 600 * attempt));
    const key = OPENAI_KEYS[(oaCursor + attempt) % OPENAI_KEYS.length];
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      oaCursor = (oaCursor + attempt) % OPENAI_KEYS.length;
      const data = await r.json();
      return (data.choices?.[0]?.message?.content || "").trim();
    }
    const txt = await r.text().catch(() => "");
    lastErr = new Error(`OpenAI HTTP ${r.status}: ${txt.slice(0, 200)}`);
    if (!isTransient(r.status)) throw lastErr;
  }
  throw lastErr || new Error("OpenAI unavailable after retries.");
}

let gemCursor = 0;
async function gemini({ system, prompt, json, temperature, schema }) {
  const body = {
    systemInstruction: system ? { parts: [{ text: system }] } : undefined,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: typeof temperature === "number" ? temperature : 0.4,
      thinkingConfig: { thinkingBudget: 0 },
      ...(json ? { responseMimeType: "application/json" } : {}),
      ...(json && schema ? { responseSchema: schema } : {}),
    },
  };
  let lastErr;
  const maxAttempts = Math.max(GEMINI_KEYS.length, 4);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 600 * attempt));
    const key = GEMINI_KEYS[(gemCursor + attempt) % GEMINI_KEYS.length];
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (r.ok) {
      gemCursor = (gemCursor + attempt) % GEMINI_KEYS.length;
      const data = await r.json();
      return (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim();
    }
    const txt = await r.text().catch(() => "");
    lastErr = new Error(`Gemini HTTP ${r.status}: ${txt.slice(0, 200)}`);
    if (!isTransient(r.status)) throw lastErr;
  }
  throw lastErr || new Error("Gemini unavailable after retries.");
}

// Generate a completion from the active provider. Returns the raw text output (a
// JSON string when { json:true }). `schema` is the Gemini-dialect responseSchema,
// applied only on the Gemini path; OpenAI uses JSON mode + the prompt's own schema.
export async function generate({ system, prompt, json = false, temperature, schema } = {}) {
  const provider = activeProvider();
  if (!provider) throw new Error("No AI provider key configured (set OPENAI_API_KEYS / legal_1, or GEMINI_API_KEYS / legal).");
  if (provider === "openai") return openai({ system, prompt, json, temperature });
  return gemini({ system, prompt, json, temperature, schema });
}
