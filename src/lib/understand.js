// Grounding + prompt assembly for "Understand your contract".
//
// The model may cite ONLY the legal sources we hand it in the grounding context.
// Everything user-facing must be written in the chosen language and its native
// script. These two rules are enforced in the prompt text below and are the
// reason this module exists separately from the UI.

import { clausesForState } from "../data/clauseLibrary.js";

// ---- Languages & scripts -------------------------------------------------
// label = what the user picks; script = the writing system the model MUST use.
export const OUTPUT_LANGUAGES = [
  { label: "English", script: "Latin script" },
  { label: "Hindi", script: "Devanagari script (देवनागरी)" },
  { label: "Marathi", script: "Devanagari script (देवनागरी)" },
  { label: "Punjabi", script: "Gurmukhi script (ਗੁਰਮੁਖੀ)" },
  { label: "Kannada", script: "Kannada script (ಕನ್ನಡ)" },
];

export function scriptFor(language) {
  return (OUTPUT_LANGUAGES.find((l) => l.label === language) || OUTPUT_LANGUAGES[0]).script;
}

// ---- Authoritative state truths (citable grounding) ----------------------
// These are guardrail facts. They are injected as citable sources so the model
// can ground findings on them — and so it states them correctly.
const STATE_TRUTHS = {
  MAHARASHTRA: [
    {
      source: "Maharashtra Rent Control Act, 1999, Section 55",
      rule: "Every Leave & License agreement in Maharashtra MUST be registered, regardless of its duration. The '11-month, skip registration' shortcut does NOT work here. An unregistered L&L means the tenant's stated terms prevail and the landlord can face penalty.",
    },
  ],
  KARNATAKA: [
    {
      source: "Karnataka Stamp Act, 1957",
      rule: "Karnataka offers NO gender-based stamp duty concession (unlike HP, Maharashtra and Punjab). Do not assume a female-buyer discount in Karnataka.",
    },
  ],
  PUNJAB: [
    {
      source: "East Punjab Urban Rent Restriction Act, 1949",
      rule: "Punjab residential tenancies are governed by the OPERATIVE East Punjab Urban Rent Restriction Act, 1949. The Punjab Rent Act, 1995 was passed but never notified into force — do NOT cite the 1995 Act as the governing law.",
    },
  ],
  "HIMACHAL PRADESH": [
    {
      source: "HP Tenancy and Land Reforms Act, 1972, Section 118",
      rule: "Himachal Pradesh blocks non-agriculturists from buying agricultural land without prior State Government permission under Section 118.",
    },
  ],
};

// Central laws — always citable.
const CENTRAL_TRUTHS = [
  {
    source: "Indian Stamp Act, 1899, Section 19",
    rule: "Stamp duty is always levied by the State where the property is located — not the buyer's home State.",
  },
  {
    source: "Registration Act, 1908, Section 17",
    rule: "Leases of immovable property for a term exceeding one year (and sale/gift deeds) are compulsorily registrable. An unregistered, compulsorily-registrable document is inadmissible as evidence (Section 49).",
  },
];

// ---- Light heuristic detection of state + contract type -------------------
const STATE_PATTERNS = [
  { key: "HIMACHAL PRADESH", label: "Himachal Pradesh", re: /himachal|shimla|\bh\.?p\.?\b|mashobra|kasauli/i },
  { key: "MAHARASHTRA", label: "Maharashtra", re: /maharashtra|mumbai|pune|nagpur|thane|nashik|leave\s*(and|&)\s*licen[cs]e/i },
  { key: "KARNATAKA", label: "Karnataka", re: /karnataka|bangalore|bengaluru|mysore|mysuru|hubli|mangalore/i },
  { key: "PUNJAB", label: "Punjab", re: /punjab|ludhiana|amritsar|jalandhar|patiala|mohali/i },
];

const TYPE_PATTERNS = [
  { type: "Leave and License", re: /leave\s*(and|&)\s*licen[cs]e|licensor|licensee/i },
  { type: "Rent Agreement", re: /rent agreement|tenant|tenancy|lessee|monthly rent/i },
  { type: "Lease Deed", re: /lease (deed|agreement)|lessor/i },
  { type: "Sale Deed", re: /sale deed|conveyance|vendor|purchaser|consideration of (rs|₹)/i },
  { type: "Gift Deed", re: /gift deed|donor|donee/i },
  { type: "Agreement to Sell", re: /agreement to sell|earnest money|advance.*registration/i },
  { type: "Power of Attorney", re: /power of attorney|\bgpa\b|attorney holder/i },
  { type: "Mortgage Deed", re: /mortgage|mortgagor|mortgagee/i },
];

/**
 * @param {string} text
 * @returns {{ state: string|null, stateLabel: string|null, docType: string|null }}
 */
export function detectStateAndType(text) {
  const t = text || "";
  const stateHit = STATE_PATTERNS.find((s) => s.re.test(t));
  const typeHit = TYPE_PATTERNS.find((d) => d.re.test(t));
  return {
    state: stateHit ? stateHit.key : null,
    stateLabel: stateHit ? stateHit.label : null,
    docType: typeHit ? typeHit.type : null,
  };
}

// Map a detected document type to the clause library's document_type category.
function docCategory(docType) {
  if (!docType) return null;
  if (/lease|rent|licen[cs]e/i.test(docType)) return "rent_agreement";
  if (/sale|gift|mortgage|exchange|agreement to sell|conveyance/i.test(docType)) return "sale_deed";
  return null;
}

/**
 * Build the single grounding-context string passed to both prompts. This is the
 * ONLY set of legal sources the model is allowed to cite: the authoritative
 * state/central truths plus the mined clause library, filtered to the detected
 * state and document category.
 * @param {{ state: string|null, stateLabel: string|null, docType: string|null }} ctx
 * @returns {string}
 */
export function assembleGroundingContext({ state, stateLabel, docType }) {
  const blocks = [];

  // 1. State-specific authoritative truths (only the detected state) + central.
  const truths = [...(state && STATE_TRUTHS[state] ? STATE_TRUTHS[state] : []), ...CENTRAL_TRUTHS];
  truths.forEach((tr) => {
    blocks.push(`SOURCE: ${tr.source}\nRULE: ${tr.rule}`);
  });

  // 2. Mined clause library, filtered to the detected state + document category.
  const cat = docCategory(docType);
  clausesForState(stateLabel, cat).forEach((c) => {
    blocks.push(
      [
        `CLAUSE (${c.flag_type} · ${c.document_type} · ${c.state}): ${c.clause_type}`,
        `GOVERNING LAW: ${c.governing_law}`,
        `TYPICAL TEXT: ${c.sample_text}`,
        `NOTE: ${c.notes}`,
      ].join("\n"),
    );
  });

  const header =
    `Detected property state: ${stateLabel || "unknown"}. ` +
    `Detected document type: ${docType || "unknown"} (category: ${cat || "unknown"}).`;

  return `${header}\n\n${blocks.join("\n\n")}`;
}

// Convenience: detect + assemble in one call.
export function groundingForText(text) {
  const det = detectStateAndType(text);
  return { ...det, grounding: assembleGroundingContext({ ...det, text }) };
}

// ---- Shared prompt rules -------------------------------------------------
function sharedRules(language, script) {
  return `LANGUAGE RULE (critical): Write the ENTIRE output for the user in ${language}, using ${script}. This includes every heading, sentence, risk title, reason, and suggestion. Do NOT write any user-facing prose in English unless the chosen language IS English. Do not transliterate into Latin letters.

CITATION RULE (critical): You may cite ONLY the legal sources provided in the LEGAL CONTEXT below (their "SOURCE" / "GOVERNING LAW" lines). If a point is not supported by any provided source, name NO statute, section, Act, or case for it — leave it ungrounded. Never invent or guess a citation. This is the most important rule.

Preserve these facts if they come up: Karnataka has no gender concession on stamp duty; a Maharashtra Leave & License must be registered regardless of duration; Punjab residential tenancies run under the operative East Punjab Urban Rent Restriction Act 1949 (the 1995 Act was never notified — do not cite it as in force); HP Section 118 blocks non-agriculturists from agricultural land; stamp duty is always levied by the state where the property is located.`;
}

export const UNDERSTAND_SYSTEM = `You are a careful Indian property-law assistant that helps ordinary people understand contracts. You explain in plain language, never give legal advice, and never fabricate legal citations. You only cite the legal sources you are given.`;

/**
 * Operation 1 — Explain. Returns a plain-language explanation as text/markdown,
 * entirely in the chosen language and script.
 */
export function buildExplainPrompt({ text, language, script, grounding }) {
  return `${sharedRules(language, script)}

TASK: Explain the following contract to a non-lawyer at about an 8th-grade reading level, entirely in ${language} (${script}). Cover:
1. What this contract is (type, who the parties are, what it is about).
2. The key terms — rent or price, security deposit, duration, notice period, and the main obligations of EACH side.
3. Anything unusual, one-sided, missing, or risky, in plain words.

Use short clearly-labelled sections or short paragraphs. Keep it readable, not a wall of text. Do not output JSON.

LEGAL CONTEXT (the only sources you may cite; do not invent others):
"""
${grounding}
"""

CONTRACT TEXT:
"""
${text}
"""`;
}

/**
 * Operation 2 — Analyze Risk. Returns JSON matching RISK_SCHEMA. All user-facing
 * strings (summary, risk, why, suggestion) must be in the chosen language/script.
 * legalBasis MUST be null unless a provided source supports the finding.
 */
export function buildRiskPrompt({ text, language, script, grounding }) {
  return `${sharedRules(language, script)}

TASK: Analyze the following contract for legal risks and return ONLY a JSON object matching the required schema. Order findings by severity (high first). For each finding:
- clauseRef: a short locator (clause number or a few words). May stay in the document's own language.
- clauseQuote: a short excerpt from the contract, 25 words maximum. Quote the original text.
- risk: a short title IN ${language} (${script}).
- severity: one of "high", "medium", "low".
- why: one or two plain sentences IN ${language} (${script}) explaining the risk.
- suggestion: what to do or a safer alternative, IN ${language} (${script}).
- legalBasis: the exact statute + section string copied from a SOURCE/GOVERNING LAW line in the LEGAL CONTEXT, ONLY if that source supports this finding. Otherwise legalBasis MUST be null. Never invent a citation.

Also write a one-line "summary" IN ${language} (${script}) giving the overall risk picture.

LEGAL CONTEXT (the only sources you may cite; do not invent others):
"""
${grounding}
"""

CONTRACT TEXT:
"""
${text}
"""`;
}

// Gemini structured-output schema for Analyze Risk (OpenAPI subset, UPPERCASE types).
export const RISK_SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING" },
    findings: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          clauseRef: { type: "STRING" },
          clauseQuote: { type: "STRING" },
          risk: { type: "STRING" },
          severity: { type: "STRING", enum: ["high", "medium", "low"] },
          why: { type: "STRING" },
          suggestion: { type: "STRING" },
          legalBasis: { type: "STRING", nullable: true },
        },
        required: ["clauseRef", "clauseQuote", "risk", "severity", "why", "suggestion", "legalBasis"],
        propertyOrdering: ["clauseRef", "clauseQuote", "risk", "severity", "why", "suggestion", "legalBasis"],
      },
    },
  },
  required: ["summary", "findings"],
  propertyOrdering: ["summary", "findings"],
};
