// Server-side "Decode contract" agent — shared by api/decode.js and
// server/index.js. Uses the shared server-side AI key (OpenAI when set, else
// Gemini — see lib/llm.js), so users no longer have to supply their own key.
// Prompt building + grounding live in src/lib/understand.js (pure, no browser
// deps) and are reused here verbatim.

import {
  UNDERSTAND_SYSTEM, scriptFor, groundingForText,
  buildExplainPrompt, buildRiskPrompt, RISK_SCHEMA,
} from "../src/lib/understand.js";
import { generate } from "./llm.js";

function stripFences(s = "") {
  let t = s.trim();
  if (t.startsWith("```")) t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if ((a > 0 || (b !== -1 && b < t.length - 1)) && a !== -1 && b > a) t = t.slice(a, b + 1);
  return t;
}

// op: "explain" -> { explain: markdownText } | "risk" -> { risk: <RISK_SCHEMA object> }
export async function runDecode({ text, language, op }) {
  const t = String(text || "");
  if (t.trim().length < 30) throw new Error("Please provide the contract text (at least a clause).");
  const lang = language || "English";
  const script = scriptFor(lang);
  const { grounding } = groundingForText(t);

  if (op === "explain") {
    const out = await generate({
      system: UNDERSTAND_SYSTEM,
      prompt: buildExplainPrompt({ text: t, language: lang, script, grounding }),
      temperature: 0.4,
    });
    if (!out) throw new Error("The AI returned an empty response. Please try again.");
    return { explain: out };
  }

  const raw = await generate({
    system: UNDERSTAND_SYSTEM,
    prompt: buildRiskPrompt({ text: t, language: lang, script, grounding }),
    json: true,
    temperature: 0.2,
    schema: RISK_SCHEMA,
  });
  let parsed;
  try { parsed = JSON.parse(stripFences(raw)); } catch { throw new Error("The AI returned output that was not valid JSON. Please try again."); }
  return { risk: parsed };
}
