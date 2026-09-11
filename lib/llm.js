// Shared LLM layer for PropertyIQ's server-side AI calls (decode + eligibility +
// the nightly DB refresh). OpenAI only. The key lives ONLY in env vars; the
// browser never sees it.
//
//   OpenAI key: OPENAI_API_KEYS | OPENAI_API_KEY | legal_1 | legal  (comma-separated → rotated)
//   Model:      OPENAI_MODEL (default gpt-4o-mini)

const splitKeys = (s) => String(s || "").split(",").map((k) => k.trim()).filter(Boolean);

const OPENAI_KEYS = splitKeys(
  process.env.OPENAI_API_KEYS || process.env.OPENAI_API_KEY || process.env.legal_1 || process.env.legal,
);
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export function activeProvider() {
  return OPENAI_KEYS.length ? "openai" : null;
}

// Shape reported by /api/health so the UI/ops can see whether the key is live.
export function providerStatus() {
  return {
    provider: activeProvider(),
    openai: OPENAI_KEYS.length > 0,
    openaiKeys: OPENAI_KEYS.length,
    model: OPENAI_KEYS.length ? OPENAI_MODEL : null,
  };
}

const isTransient = (status) => status === 429 || status === 500 || status === 503;

// Generate a completion from OpenAI. Returns the raw text output (a JSON string
// when { json:true } — the prompt itself carries the field schema; OpenAI's
// json_object mode needs the word "json" in the messages, which the risk /
// eligibility prompts already include). Rotates keys + retries transient errors.
let cursor = 0;
export async function generate({ system, prompt, json = false, temperature } = {}) {
  if (!OPENAI_KEYS.length) throw new Error("No OpenAI API key configured (set OPENAI_API_KEYS / legal_1).");
  const body = {
    model: OPENAI_MODEL,
    messages: [
      ...(system ? [{ role: "system", content: system }] : []),
      { role: "user", content: prompt },
    ],
    temperature: typeof temperature === "number" ? temperature : 0.4,
  };
  if (json) body.response_format = { type: "json_object" };
  let lastErr;
  const maxAttempts = Math.max(OPENAI_KEYS.length, 4);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 600 * attempt));
    const key = OPENAI_KEYS[(cursor + attempt) % OPENAI_KEYS.length];
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      cursor = (cursor + attempt) % OPENAI_KEYS.length;
      const data = await r.json();
      return (data.choices?.[0]?.message?.content || "").trim();
    }
    const txt = await r.text().catch(() => "");
    lastErr = new Error(`OpenAI HTTP ${r.status}: ${txt.slice(0, 200)}`);
    if (!isTransient(r.status)) throw lastErr;
  }
  throw lastErr || new Error("OpenAI unavailable after retries.");
}
