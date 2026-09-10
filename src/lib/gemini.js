// Browser-side Google Gemini client. Bring-your-own-key: the key is read from
// localStorage and sent directly from the browser. We never ship a key in the
// bundle and there is no backend/proxy.
//
// This lives NEXT TO the existing Claude wrapper (callClaude in App.jsx); it does
// not replace it. Eligibility/AI-enrichment still uses Claude; the "Understand
// your contract" feature uses Gemini.

// Single source of truth for the model id. Verify the current recommended model
// in Google AI Studio (https://aistudio.google.com) — swap this one constant if
// Google retires/renames it. "gemini-2.5-flash" is a fast, low-cost text+JSON model.
export const GEMINI_MODEL = "gemini-2.5-flash";

export const GEMINI_KEY_STORAGE = "propertyiq_gemini_key";

// No key is shipped in the bundle (this app is fully client-side, so any embedded
// key would be public — and a key committed to a public repo gets auto-revoked).
// The user supplies their own Gemini key in-app; it is stored ONLY in the browser
// under localStorage `propertyiq_gemini_key`. Auth is the `?key=` query param.
export const DEFAULT_GEMINI_KEY = "";

const ENDPOINT = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

/**
 * Low-level call. Returns the raw concatenated text of the first candidate.
 * @param {string} apiKey
 * @param {{ system?: string, prompt: string, json?: boolean, schema?: object, temperature?: number, model?: string }} opts
 * @returns {Promise<string>}
 */
export async function callGemini(apiKey, opts) {
  if (!apiKey) throw new Error("NO_KEY");
  const model = opts.model || GEMINI_MODEL;

  const generationConfig = {
    temperature: opts.temperature ?? 0.3,
    maxOutputTokens: 8192,
    // gemini-2.5-flash "thinking" consumes the output budget and can truncate JSON
    // mode into invalid JSON — disable it so the full budget goes to the answer.
    thinkingConfig: { thinkingBudget: 0 },
  };
  // Structured-output mode is far more reliable than asking for JSON in prose.
  if (opts.json) {
    generationConfig.responseMimeType = "application/json";
    if (opts.schema) generationConfig.responseSchema = opts.schema;
  }

  const body = {
    contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
    generationConfig,
  };
  if (opts.system) {
    body.systemInstruction = { parts: [{ text: opts.system }] };
  }

  // Gemini's model servers occasionally return 503 (overloaded) or 429 (rate
  // limit) transiently. Retry a few times with a short backoff so a momentary
  // spike doesn't surface to the user.
  let res = null;
  let lastErr = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 700 * attempt)); // 0.7s, 1.4s, 2.1s
    try {
      res = await fetch(`${ENDPOINT(model)}?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (e) {
      lastErr = new Error("Could not reach Gemini: " + e.message);
      res = null;
      continue; // network blip — retry
    }
    if (res.ok) break;

    let msg = `Gemini API error (${res.status})`;
    try {
      const err = await res.json();
      if (err?.error?.message) msg += `: ${err.error.message}`;
    } catch {
      /* ignore */
    }
    if (res.status === 400 || res.status === 403) {
      msg += " — check that your Gemini API key is valid and has access to " + model + ".";
    }
    lastErr = new Error(msg);
    // Only 503/500 (overloaded) and 429 (rate limit) are worth retrying.
    if (res.status !== 503 && res.status !== 500 && res.status !== 429) throw lastErr;
    res = null;
  }
  if (!res) throw lastErr || new Error("Gemini request failed after retries. Please try again.");

  const data = await res.json();
  const cand = data?.candidates?.[0];
  if (!cand) {
    const blocked = data?.promptFeedback?.blockReason;
    throw new Error(blocked ? `Gemini blocked the request (${blocked}).` : "Gemini returned no output.");
  }
  const text = (cand.content?.parts || []).map((p) => p.text || "").join("").trim();
  if (!text) throw new Error("Gemini returned an empty response.");
  return text;
}

/**
 * Strip stray markdown fences and parse JSON defensively.
 * @param {string} raw
 * @returns {any}
 */
export function parseJsonLoose(raw) {
  let s = (raw || "").trim();
  // Remove ```json ... ``` or ``` ... ``` fences if the model added them anyway.
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }
  // If there is leading/trailing prose, grab the outermost {...}.
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first > 0 || (last !== -1 && last < s.length - 1)) {
    if (first !== -1 && last !== -1 && last > first) s = s.slice(first, last + 1);
  }
  return JSON.parse(s);
}

/**
 * Call Gemini in JSON mode and return a parsed object. Throws on unparseable output.
 * @param {string} apiKey
 * @param {{ system?: string, prompt: string, schema?: object, model?: string }} opts
 * @returns {Promise<any>}
 */
export async function callGeminiJSON(apiKey, opts) {
  const raw = await callGemini(apiKey, { ...opts, json: true });
  try {
    return parseJsonLoose(raw);
  } catch {
    throw new Error("Gemini returned output that was not valid JSON. Please try again.");
  }
}
