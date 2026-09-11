// Contextual-RAG eligibility agent (server-side, shared by server/index.js and
// api/eligibility.js so the two backends can't drift).
//
// Design: retrieval is DETERMINISTIC structured filtering over the bundled RAG
// database (RAG_DB) — not embeddings. We select the chunks that match the user's
// exact profile (state, property type, transaction, NRI status), expand their
// related_chunks, and hand ONLY those chunks to Gemini, which writes a warm,
// source-cited eligibility report + action plan. No India Kanoon calls at query
// time; no secrets needed for retrieval. Gemini key stays in env.

import { RAG_DB } from "./ragDatabase.js";

const GEMINI_KEYS = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "")
  .split(",").map((k) => k.trim()).filter(Boolean);
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// ---------- small helpers ----------
function stripFences(s = "") {
  let t = s.trim();
  if (t.startsWith("```")) t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if ((a > 0 || (b !== -1 && b < t.length - 1)) && a !== -1 && b > a) t = t.slice(a, b + 1);
  return t;
}

const STATE_ABBREV = { "Himachal Pradesh": "HP", Maharashtra: "MH", Karnataka: "KA", Punjab: "PB" };
const PROP_TYPE_MAP = { Agricultural: "agricultural", Residential: "residential", Commercial: "commercial", Industrial: "industrial" };
function mapPropType(t) { return PROP_TYPE_MAP[t] || String(t || "").toLowerCase(); }
function mapTxn(t) {
  if (!t) return "sale_deed";
  if (/gift/i.test(t)) return "gift_deed";
  if (/rent|lease|licen/i.test(t)) return "rent_agreement";
  return "sale_deed";
}

// ---------- retrieval (deterministic) ----------
export function retrieveContext(form) {
  const state = form.propertyState;
  const propType = mapPropType(form.propType);
  const txn = mapTxn(form.txnType);
  const isNRI = form.buyerType === "NRI / OCI";

  const elig = RAG_DB.eligibility_rules || [];
  const defs = RAG_DB.definitions || [];
  const central = RAG_DB.central_laws || [];
  const byId = {};
  [...elig, ...defs, ...central].forEach((c) => { byId[c.chunk_id] = c; });

  // 1. eligibility rules for this state + property type (fallback: all rules for the state)
  let rules = elig.filter((r) => r.state === state && (!r.property_types_affected || r.property_types_affected.includes(propType)));
  if (!rules.length) rules = elig.filter((r) => r.state === state);

  // 2. related_chunks expansion + NRI/FEMA
  const relatedIds = new Set();
  rules.forEach((r) => (r.related_chunks || []).forEach((id) => relatedIds.add(id)));
  if (isNRI) { relatedIds.add("CENTRAL-FEMA-001"); relatedIds.add("ALL-DEF-003"); }

  const rulesOut = [...rules];
  const definitionsOut = [];
  const centralOut = [];
  relatedIds.forEach((id) => {
    const c = byId[id];
    if (!c) return;
    if (id.includes("-DEF-")) definitionsOut.push(c);
    else if (id.startsWith("CENTRAL-")) centralOut.push(c);
    else if (!rulesOut.find((x) => x.chunk_id === id)) rulesOut.push(c);
  });

  // 3. always include the universal Registration + Stamp central laws (+ FEMA already added if NRI)
  ["CENTRAL-REG-001", "CENTRAL-STAMP-001"].forEach((id) => {
    if (byId[id] && !centralOut.find((x) => x.chunk_id === id)) centralOut.push(byId[id]);
  });

  // dedupe helpers
  const uniq = (arr) => { const seen = new Set(); return arr.filter((c) => c && !seen.has(c.chunk_id) && seen.add(c.chunk_id)); };

  const abbr = STATE_ABBREV[state];
  return {
    state, propType, txn, isNRI,
    eligibility_rules: uniq(rulesOut),
    definitions: uniq(definitionsOut),
    central_laws: uniq(centralOut),
    stamp_duty: (RAG_DB.stamp_duty || {})[state] || null,
    stamp_cross_state: RAG_DB.stamp_duty?.cross_state_rule || "",
    stamp_penalty: RAG_DB.stamp_duty?.penalty_for_understamping || "",
    jurisdiction: (RAG_DB.jurisdiction_rules || {})[state] || null,
    languages: (RAG_DB.state_languages || {})[state] || null,
    checklist: (RAG_DB.document_checklists || {})[txn] || null,
    guides: (RAG_DB.practical_guides || {})[state] || [],
    registration: (RAG_DB.registration_process || {})[state] || null,
    known_gaps: (RAG_DB.known_gaps || []).filter((g) => g.state === abbr || g.state === "ALL"),
  };
}

// ---------- context string handed to the model ----------
function buildContextString(ctx) {
  const blocks = [];
  ctx.eligibility_rules.forEach((r) => {
    blocks.push([
      `ELIGIBILITY RULE [${r.chunk_id}] — ${r.state}`,
      r.act ? `Act/Section: ${r.act} ${r.section || ""}`.trim() : "",
      r.summary ? `Summary: ${r.summary}` : "",
      r.who_is_blocked ? `Who is blocked: ${r.who_is_blocked}` : "",
      r.what_is_blocked ? `What is blocked: ${r.what_is_blocked}` : "",
      r.exceptions ? `Exceptions: ${r.exceptions.join("; ")}` : "",
      r.permission_process ? `Permission process: ${r.permission_process}` : "",
      r.penalty_for_violation ? `Penalty: ${r.penalty_for_violation}` : "",
      r.nri_applicability ? `NRI/OCI: ${r.nri_applicability}` : "",
      r.recent_amendments ? `Recent amendments: ${r.recent_amendments}` : "",
      r.section_text_excerpt ? `Section text: ${r.section_text_excerpt}` : "",
      r.case_law_anchor ? `Case law: ${r.case_law_anchor}` : "",
      `Confidence: ${r.confidence || "n/a"} | Last verified: ${r.last_verified || "n/a"}`,
      r.india_code_url ? `India Code: ${r.india_code_url}` : "",
      r.indian_kanoon_query ? `Indian Kanoon query: ${r.indian_kanoon_query}` : "",
    ].filter(Boolean).join("\n"));
  });
  ctx.definitions.forEach((d) => {
    blocks.push([
      `DEFINITION [${d.chunk_id}] — ${d.term} (${d.state})`,
      d.definition ? `Meaning: ${d.definition}` : "",
      d.proof_required ? `Proof: ${d.proof_required}` : "",
      d.cross_state_trap ? `Cross-state trap: ${d.cross_state_trap}` : "",
      d.misconceptions ? `Misconceptions: ${d.misconceptions.join("; ")}` : "",
      d.source ? `Source: ${d.source}` : "",
    ].filter(Boolean).join("\n"));
  });
  ctx.central_laws.forEach((c) => {
    blocks.push([
      `CENTRAL LAW [${c.chunk_id}] — ${c.act} ${c.year || ""}`.trim(),
      c.key_sections ? `Key sections: ${c.key_sections}` : "",
      c.relevance ? `Relevance: ${c.relevance}` : "",
      c.penalty ? `Penalty: ${c.penalty}` : "",
    ].filter(Boolean).join("\n"));
  });
  if (ctx.stamp_duty) {
    blocks.push(`STAMP DUTY (${ctx.state}):\n${JSON.stringify(ctx.stamp_duty, null, 1)}\nCross-state rule: ${ctx.stamp_cross_state}\nUnder-stamping penalty: ${ctx.stamp_penalty}`);
  }
  if (ctx.jurisdiction) blocks.push(`JURISDICTION (${ctx.state}): ${ctx.jurisdiction.type} — ${ctx.jurisdiction.rule}`);
  if (ctx.languages) blocks.push(`REGISTRATION LANGUAGE (${ctx.state}): accepted ${ctx.languages.accepted.join(", ")}. ${ctx.languages.warning || ""}`);
  if (ctx.checklist) blocks.push(`DOCUMENT CHECKLIST (${ctx.txn}):\n- ${ctx.checklist.join("\n- ")}`);
  if (ctx.registration) blocks.push(`REGISTRATION PROCESS (${ctx.state}):\n${JSON.stringify(ctx.registration, null, 1)}`);
  if (ctx.guides?.length) blocks.push(`PRACTICAL GUIDES (learn-more links):\n${ctx.guides.map((g) => `- ${g.title}: ${g.url}`).join("\n")}`);
  if (ctx.known_gaps?.length) blocks.push(`KNOWN GAPS (lower confidence / tell the user to verify):\n${ctx.known_gaps.map((g) => `- [${g.priority}] ${g.area}: ${g.gap}`).join("\n")}`);
  return blocks.join("\n\n");
}

// ---------- output schema (extends the old one; findings/sources stay compatible) ----------
export const ELIG_SCHEMA = {
  type: "OBJECT",
  properties: {
    verdict: { type: "STRING", enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW", "CLEAR"] },
    summary: { type: "STRING" },
    confidence: { type: "STRING", enum: ["high", "medium", "low"] },
    confidenceReason: { type: "STRING" },
    asOf: { type: "STRING" },
    findings: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          severity: { type: "STRING", enum: ["critical", "high", "medium", "low"] },
          explanation: { type: "STRING" },
          legalBasis: { type: "STRING", nullable: true },
          source: { type: "STRING", nullable: true },
        },
        required: ["title", "severity", "explanation", "legalBasis", "source"],
      },
    },
    exceptions: { type: "ARRAY", items: { type: "STRING" } },
    actionPlan: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          step: { type: "STRING" },
          detail: { type: "STRING" },
          who: { type: "STRING", nullable: true },
        },
        required: ["step", "detail", "who"],
      },
    },
    sources: { type: "ARRAY", items: { type: "OBJECT", properties: { title: { type: "STRING" }, url: { type: "STRING" } }, required: ["title", "url"] } },
  },
  required: ["verdict", "summary", "confidence", "confidenceReason", "asOf", "findings", "exceptions", "actionPlan", "sources"],
};

const SYSTEM = `You are PropertyIQ's eligibility helper for property transactions in India. You help ordinary people — NOT lawyers — understand whether they can legally do their property transaction, in warm, simple, everyday language, like explaining to a nervous friend making a big purchase.

GROUNDING (critical): You are given RETRIEVED LEGAL CONTEXT — the ONLY facts you may rely on. Base every finding on it. NEVER invent a law, section, case, amendment, or citation. If the context does not support a point, do not assert it. Put a legal reference ONLY in the 'legalBasis'/'source' fields (a URL from the context in 'source'), never inside the plain-language explanation sentences.

VERDICT: CRITICAL = hard/near-hard block; HIGH = serious hurdle to clear first; MEDIUM = conditions to satisfy; LOW = looks workable; CLEAR = no restriction found. If a retrieved rule says the transaction is blocked/restricted for this buyer (e.g. a non-agriculturist or outsider buying farmland where that is barred), the verdict MUST reflect that.

CONFIDENCE: set 'confidence' to the retrieved rules' own confidence, lowered to "low" whenever a KNOWN GAP applies or the key rule is MEDIUM/LOW — and say what to verify in 'confidenceReason'. Set 'asOf' to the provided today's date.

WRITE (very important): Use complete, full sentences everywhere — never fragments, bullet phrases, or headline-style labels. Each finding's 'title' must be a full sentence a person can read on its own (for example "You will most likely need prior State Government permission before you can buy this farmland."), and 'explanation' expands it in one or two more full sentences, in warm plain language with no section, Act, or case names inside the sentences. Write every 'exceptions' entry and every 'actionPlan' step as full sentences too, and in the action plan say plainly which office or authority the person should approach. ALWAYS return the sources you actually relied on in 'sources' (a title plus a working link for each), and set each finding's 'source' to the matching link wherever one exists. Order findings most-severe first. This is general information, not legal advice.`;

function buildPrompt(form, ctxText, today) {
  return `Today's date: ${today}.

The user's transaction profile:
${JSON.stringify(form, null, 2)}

RETRIEVED LEGAL CONTEXT (your only permitted sources):
"""
${ctxText}
"""

Produce the eligibility report as JSON per the schema: an overall verdict, a one-line warm plain-language summary, findings (most severe first, human wording, with legalBasis/source only where the context supports it), the real exceptions that could unblock or ease this, a confidence level + reason (respect KNOWN GAPS and rule confidence), asOf = today's date, a concrete step-by-step action plan, and the list of sources (official links + learn-more guides from the context).`;
}

// ---------- Gemini (key rotation + transient retry; JSON mode) ----------
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

// ---------- public entry ----------
export async function runRagEligibility(form) {
  const ctx = retrieveContext(form);
  const ctxText = buildContextString(ctx);
  const today = new Date().toISOString().slice(0, 10);

  const data = await gemini({
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: "user", parts: [{ text: buildPrompt(form, ctxText, today) }] }],
    generationConfig: { temperature: 0.2, responseMimeType: "application/json", responseSchema: ELIG_SCHEMA },
  });

  const raw = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
  let report;
  try {
    report = JSON.parse(stripFences(raw));
  } catch {
    report = { verdict: "LOW", summary: raw.slice(0, 400) || "Could not format the report.", confidence: "low", confidenceReason: "The report could not be generated cleanly; please retry.", asOf: today, findings: [], exceptions: [], actionPlan: [], sources: [] };
  }
  // defensive defaults so the UI never sees undefined
  report.confidence = report.confidence || "low";
  report.asOf = report.asOf || today;
  report.exceptions = Array.isArray(report.exceptions) ? report.exceptions : [];
  report.actionPlan = Array.isArray(report.actionPlan) ? report.actionPlan : [];
  report.findings = Array.isArray(report.findings) ? report.findings : [];

  // backfill sources from the retrieved context if the model returned none
  if (!Array.isArray(report.sources) || !report.sources.length) {
    const seen = new Set();
    const src = [];
    ctx.eligibility_rules.forEach((r) => { if (r.india_code_url && !seen.has(r.india_code_url) && seen.add(r.india_code_url)) src.push({ title: `${r.act} ${r.section || ""}`.trim(), url: r.india_code_url }); });
    ctx.guides.slice(0, 3).forEach((g) => { if (!seen.has(g.url) && seen.add(g.url)) src.push({ title: g.title, url: g.url }); });
    report.sources = src.slice(0, 8);
  }

  return { report, retrieved: { rules: ctx.eligibility_rules.map((r) => r.chunk_id), definitions: ctx.definitions.map((d) => d.chunk_id), central: ctx.central_laws.map((c) => c.chunk_id) } };
}
