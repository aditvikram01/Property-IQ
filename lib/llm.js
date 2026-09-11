// Shared LLM layer for PropertyIQ's server-side AI calls (decode + eligibility +
// the nightly DB refresh). Multi-provider with automatic fallback: providers are
// tried in order and, if one fails (rate-limit / quota / error), the next is used.
// Configure whichever keys you have; providers with no key are skipped. Keys live
// ONLY in env vars; the browser never sees them.
//
//   1. Gemini (primary): GEMINI_API_KEYS | GEMINI_API_KEY | Gemini_API_Key_2 | GEMINI_API_KEY_2 | legal
//        model GEMINI_MODEL (default gemini-2.5-flash)
//   2. Groq (fallback):  GROQ_API_KEYS | GROQ_API_KEY | groq_1 | GROQ_1
//        model GROQ_MODEL (default llama-3.3-70b-versatile) — OpenAI-compatible
//   3. OpenAI (last):    OPENAI_API_KEYS | OPENAI_API_KEY | legal_prop | legal_1 | legal
//        model OPENAI_MODEL (default gpt-4o-mini)

const splitKeys = (s) => String(s || "").split(",").map((k) => k.trim()).filter(Boolean);
const isTransient = (status) => status === 429 || status === 500 || status === 502 || status === 503;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const GEMINI_KEYS = splitKeys(
  process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY ||
  process.env.Gemini_API_Key_2 || process.env.GEMINI_API_KEY_2 || process.env.legal,
);
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const GROQ_KEYS = splitKeys(process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || process.env.groq_1 || process.env.GROQ_1);
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const OPENAI_KEYS = splitKeys(
  process.env.OPENAI_API_KEYS || process.env.OPENAI_API_KEY ||
  process.env.legal_prop || process.env.legal_1 || process.env.legal,
);
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// ---- Gemini (native REST) ----
let gemCursor = 0;
async function callGemini({ system, prompt, json, temperature }) {
  const body = {
    systemInstruction: system ? { parts: [{ text: system }] } : undefined,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: typeof temperature === "number" ? temperature : 0.4,
      thinkingConfig: { thinkingBudget: 0 },
      ...(json ? { responseMimeType: "application/json" } : {}),
    },
  };
  let lastErr;
  const maxAttempts = Math.max(GEMINI_KEYS.length, 3);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) await sleep(500 * attempt);
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

// ---- OpenAI-compatible (Groq + OpenAI share the chat/completions shape) ----
function makeOpenAICompatible(baseURL, keys, model, label) {
  let cursor = 0;
  return async function call({ system, prompt, json, temperature }) {
    const body = {
      model,
      messages: [...(system ? [{ role: "system", content: system }] : []), { role: "user", content: prompt }],
      temperature: typeof temperature === "number" ? temperature : 0.4,
    };
    if (json) body.response_format = { type: "json_object" };
    let lastErr;
    const maxAttempts = Math.max(keys.length, 3);
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) await sleep(500 * attempt);
      const key = keys[(cursor + attempt) % keys.length];
      const r = await fetch(`${baseURL}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        cursor = (cursor + attempt) % keys.length;
        const data = await r.json();
        return (data.choices?.[0]?.message?.content || "").trim();
      }
      const txt = await r.text().catch(() => "");
      lastErr = new Error(`${label} HTTP ${r.status}: ${txt.slice(0, 200)}`);
      if (!isTransient(r.status)) throw lastErr;
    }
    throw lastErr || new Error(`${label} unavailable after retries.`);
  };
}

const GROQ_CALL = GROQ_KEYS.length ? makeOpenAICompatible("https://api.groq.com/openai/v1", GROQ_KEYS, GROQ_MODEL, "Groq") : null;
const OPENAI_CALL = OPENAI_KEYS.length ? makeOpenAICompatible("https://api.openai.com/v1", OPENAI_KEYS, OPENAI_MODEL, "OpenAI") : null;

// Providers in preference order — only those with a key configured.
function providerList() {
  const list = [];
  if (GEMINI_KEYS.length) list.push({ name: "gemini", model: GEMINI_MODEL, call: callGemini });
  if (GROQ_CALL) list.push({ name: "groq", model: GROQ_MODEL, call: GROQ_CALL });
  if (OPENAI_CALL) list.push({ name: "openai", model: OPENAI_MODEL, call: OPENAI_CALL });
  return list;
}

export function activeProvider() {
  const l = providerList();
  return l.length ? l[0].name : null;
}

// Reported by /api/health so ops can see which providers are live and the order.
export function providerStatus() {
  const l = providerList();
  return {
    provider: l.length ? l[0].name : null,   // the one tried first
    order: l.map((p) => p.name),             // full fallback order
    model: l.length ? l[0].model : null,
    gemini: GEMINI_KEYS.length > 0, geminiKeys: GEMINI_KEYS.length,
    groq: GROQ_KEYS.length > 0, groqKeys: GROQ_KEYS.length,
    openai: OPENAI_KEYS.length > 0, openaiKeys: OPENAI_KEYS.length,
  };
}

// Generate a completion, trying each configured provider in order until one
// succeeds. Returns the raw text output (a JSON string when { json:true } — the
// prompt itself carries the field schema).
export async function generate({ system, prompt, json = false, temperature } = {}) {
  const list = providerList();
  if (!list.length) {
    throw new Error("No AI provider key configured (set GEMINI_API_KEYS / Gemini_API_Key_2, GROQ_API_KEYS / groq_1, or OPENAI_API_KEYS).");
  }
  let lastErr;
  for (const p of list) {
    try {
      return await p.call({ system, prompt, json, temperature });
    } catch (e) {
      lastErr = e; // provider failed — fall through to the next one
    }
  }
  throw lastErr || new Error("All AI providers failed.");
}
