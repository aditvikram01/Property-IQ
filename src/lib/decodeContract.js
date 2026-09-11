// Server-side core for the "Decode Contract" feature.
//
// This runs ONLY on the backend (the Vercel serverless function api/understand.js
// and the local dev server server/index.js). The Gemini key is read from an
// environment variable there and NEVER shipped to the browser — so users paste
// nothing and the key is not exposed publicly. It mirrors the request shape the
// old browser client used (gemini.js): thinkingBudget:0, JSON mode with a
// response schema, retry/backoff — and adds key rotation like the eligibility
// agent (fail over to the next key on 429/503).

import {
  scriptFor, groundingForText,
  buildExplainPrompt, buildRiskPrompt, RISK_SCHEMA, UNDERSTAND_SYSTEM,
} from "./understand.js";

const ENDPOINT = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

// Strip stray markdown fences / surrounding prose, then JSON.parse.
function parseJsonLoose(raw) {
  let s = (raw || "").trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first > 0 || (last !== -1 && last < s.length - 1)) {
    if (first !== -1 && last !== -1 && last > first) s = s.slice(first, last + 1);
  }
  return JSON.parse(s);
}

// Call Gemini generateContent with key rotation + transient-error retry.
async function callGemini({ keys, model, system, prompt, json, schema, temperature }) {
  if (!keys || !keys.length) throw new Error("NO_KEY");
  const generationConfig = {
    temperature: temperature ?? 0.3,
    maxOutputTokens: 8192,
    // Disable "thinking" so the whole output budget goes to the answer (its
    // consumption can otherwise truncate JSON mode into invalid JSON).
    thinkingConfig: { thinkingBudget: 0 },
  };
  if (json) {
    generationConfig.responseMimeType = "application/json";
    if (schema) generationConfig.responseSchema = schema;
  }
  const body = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig };
  if (system) body.systemInstruction = { parts: [{ text: system }] };

  let lastErr = null;
  for (const key of keys) {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 600 * attempt)); // 0.6s, 1.2s
      let res;
      try {
        res = await fetch(`${ENDPOINT(model)}?key=${encodeURIComponent(key)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } catch (e) {
        lastErr = new Error("Could not reach Gemini: " + e.message);
        continue; // network blip — retry
      }
      if (res.ok) {
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
      let msg = `Gemini API error (${res.status})`;
      try {
        const err = await res.json();
        if (err?.error?.message) msg += `: ${err.error.message}`;
      } catch { /* ignore */ }
      lastErr = new Error(msg);
      // Transient (429/500/503) → retry this key then fail over; otherwise
      // (e.g. 400/403 key problem) stop retrying this key and try the next.
      if (res.status === 429 || res.status === 500 || res.status === 503) continue;
      break;
    }
  }
  throw lastErr || new Error("Gemini request failed after retries.");
}

/**
 * Run one Decode-Contract operation server-side.
 * @param {{ op: 'explain'|'risk', text: string, language: string, keys: string[], model: string }} args
 * @returns {Promise<{ text: string } | { data: any }>}
 */
export async function decodeContract({ op, text, language, keys, model }) {
  const script = scriptFor(language);
  const { grounding } = groundingForText(text); // detect state/type + citable sources
  if (op === "explain") {
    const out = await callGemini({
      keys, model, system: UNDERSTAND_SYSTEM,
      prompt: buildExplainPrompt({ text, language, script, grounding }),
      temperature: 0.4,
    });
    return { text: out };
  }
  if (op === "risk") {
    const raw = await callGemini({
      keys, model, system: UNDERSTAND_SYSTEM,
      prompt: buildRiskPrompt({ text, language, script, grounding }),
      json: true, schema: RISK_SCHEMA, temperature: 0.3,
    });
    return { data: parseJsonLoose(raw) };
  }
  throw new Error("Unknown op — expected 'explain' or 'risk'.");
}
