// PropertyIQ eligibility agent — local backend proxy (zero dependencies; Node 18+).
//
// WHY THIS EXISTS: the SPA is client-side, but a browser cannot call the India
// Kanoon API or scrape gov sites (CORS preflight is rejected). This thin local
// server holds the secrets, calls those sources, and runs a small Gemini
// function-calling agent that researches the actual statutes/case law before
// answering. The frontend reaches it via Vite's /api proxy.
//
// SECURITY: keys here are read from env with demo fallbacks. Do not deploy this
// publicly with the fallback secrets baked in — set INDIAN_KANOON_TOKEN and
// GEMINI_API_KEY as real env vars and rotate the demo values.
//
// Run:  node server/index.js     (or: npm run server)

import http from "node:http";

const PORT = Number(process.env.PORT) || 8787;
const IK_TOKEN = process.env.INDIAN_KANOON_TOKEN || "";
// One or more keys: set GEMINI_API_KEYS to a comma-separated list (ideally from
// DIFFERENT Google projects/accounts = separate quotas). The agent round-robins
// and fails over to the next key on 429/503. Real fix for limits: enable billing.
// NEVER hardcode a key here — it is read from the environment only.
const GEMINI_KEYS = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "")
  .split(",").map((k) => k.trim()).filter(Boolean);
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const IK_BASE = "https://api.indiankanoon.org";
const ALLOWED_FETCH_HOSTS = ["indiankanoon.org", "www.indiankanoon.org", "indiacode.nic.in", "www.indiacode.nic.in"];
const MAX_TOOL_ROUNDS = 5;

// ---------- helpers ----------
function stripHtml(html = "") {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">").replace(/&#39;|&apos;/gi, "'").replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ").trim();
}
function stripFences(s = "") {
  let t = s.trim();
  if (t.startsWith("```")) t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a > 0 || (b !== -1 && b < t.length - 1)) if (a !== -1 && b > a) t = t.slice(a, b + 1);
  return t;
}
function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => { data += c; if (data.length > 5e6) req.destroy(); });
    req.on("end", () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}

// ---------- legal-source tools (what the agent can call) ----------
async function ikSearch(query, pagenum = 0) {
  const r = await fetch(`${IK_BASE}/search/?formInput=${encodeURIComponent(query)}&pagenum=${pagenum}`, {
    method: "POST", headers: { Authorization: `Token ${IK_TOKEN}`, Accept: "application/json" },
  });
  if (!r.ok) throw new Error(`India Kanoon search HTTP ${r.status}`);
  const d = await r.json();
  const docs = (d.docs || []).slice(0, 6).map((x) => ({
    tid: x.tid,
    title: stripHtml(x.title),
    snippet: stripHtml(x.headline).slice(0, 300),
    docsource: x.docsource || "",
    source: `https://indiankanoon.org/doc/${x.tid}/`,
  }));
  return { found: d.found, docs };
}
async function ikDoc(tid) {
  const r = await fetch(`${IK_BASE}/doc/${tid}/`, { method: "POST", headers: { Authorization: `Token ${IK_TOKEN}` } });
  if (!r.ok) throw new Error(`India Kanoon doc HTTP ${r.status}`);
  const d = await r.json();
  return { tid, title: stripHtml(d.title), text: stripHtml(d.doc).slice(0, 6000), source: `https://indiankanoon.org/doc/${tid}/` };
}
async function fetchUrl(url) {
  let host;
  try { host = new URL(url).hostname; } catch { throw new Error("Invalid URL"); }
  if (!ALLOWED_FETCH_HOSTS.includes(host)) throw new Error(`Domain not allowed for scraping: ${host}`);
  const r = await fetch(url, { headers: { "User-Agent": "PropertyIQ/1.0 (legal research)" } });
  if (!r.ok) throw new Error(`fetch ${url} HTTP ${r.status}`);
  const html = await r.text();
  return { url, text: stripHtml(html).slice(0, 6000) };
}

const TOOLS = [{
  functionDeclarations: [
    {
      name: "search_indian_kanoon",
      description: "Search Indian Kanoon (Indian case law + bare Acts) for a legal query. Returns top documents with title, snippet, tid and source URL. Use specific queries naming the State, Act and section.",
      parameters: { type: "OBJECT", properties: { query: { type: "STRING", description: "e.g. 'Himachal Pradesh Tenancy Land Reforms Act Section 118 non-agriculturist'" } }, required: ["query"] },
    },
    {
      name: "get_indian_kanoon_doc",
      description: "Fetch the full text of an Indian Kanoon document by its tid (taken from search results). Use this to read the actual statute or judgment before relying on it.",
      parameters: { type: "OBJECT", properties: { tid: { type: "INTEGER", description: "document id from search results" } }, required: ["tid"] },
    },
    {
      name: "fetch_url",
      description: "Fetch and extract readable text from a government legal page. Allowed domains only: indiacode.nic.in, indiankanoon.org.",
      parameters: { type: "OBJECT", properties: { url: { type: "STRING" } }, required: ["url"] },
    },
  ],
}];

async function runTool(name, args) {
  if (name === "search_indian_kanoon") return ikSearch(String(args.query || ""));
  if (name === "get_indian_kanoon_doc") return ikDoc(Number(args.tid));
  if (name === "fetch_url") return fetchUrl(String(args.url || ""));
  return { error: `unknown tool ${name}` };
}

// ---------- Gemini ----------
let keyCursor = 0;
async function gemini(body) {
  // Disable 2.5-flash "thinking" so JSON-mode output isn't truncated into invalid JSON.
  body.generationConfig = { ...(body.generationConfig || {}), thinkingConfig: { thinkingBudget: 0 } };
  let lastErr;
  const maxAttempts = Math.max(GEMINI_KEYS.length, 4); // retry transient 503/429 with backoff + key rotation
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) await new Promise((res) => setTimeout(res, 600 * attempt));
    const key = GEMINI_KEYS[(keyCursor + attempt) % GEMINI_KEYS.length];
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (r.ok) { keyCursor = (keyCursor + attempt) % GEMINI_KEYS.length; return r.json(); }
    const t = await r.text().catch(() => "");
    lastErr = new Error(`Gemini HTTP ${r.status}: ${t.slice(0, 200)}`);
    if (r.status !== 429 && r.status !== 503 && r.status !== 500) throw lastErr; // retry only transient
  }
  throw lastErr || new Error("Gemini unavailable after retries.");
}

const ELIG_SCHEMA = {
  type: "OBJECT",
  properties: {
    verdict: { type: "STRING", enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW", "CLEAR"] },
    summary: { type: "STRING" },
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
    sources: {
      type: "ARRAY",
      items: { type: "OBJECT", properties: { title: { type: "STRING" }, url: { type: "STRING" } }, required: ["title", "url"] },
    },
  },
  required: ["verdict", "summary", "findings", "sources"],
};

const SYSTEM = `You are PropertyIQ's friendly eligibility helper for property transactions in India (Himachal Pradesh, Maharashtra, Karnataka, Punjab and others). You help ordinary people — NOT lawyers — understand whether they can legally do their property transaction.

AUTHORITATIVE RULES: you may be given DETERMINISTIC RULE-ENGINE FINDINGS from a verified legal rule database. Treat them as CORRECT and FINAL on the bottom line — your conclusion must AGREE with them and must never be less severe. If the rules say a purchase is blocked/restricted (for example, a non-agriculturist or outsider buying farmland in Himachal Pradesh), your verdict MUST say it is blocked. Use the Indian Kanoon tools to confirm the law and find the official source page, but the rule findings decide the answer.

RESEARCH: use search_indian_kanoon + get_indian_kanoon_doc (and fetch_url on indiacode.nic.in / indiankanoon.org) to find the governing rule and its official page. Do 2–4 focused lookups. NEVER invent a law, section, case, or citation — if you cannot find a source, leave it empty.

HOW TO WRITE (very important):
- Use very simple, warm, everyday language — like explaining to a nervous friend making a big purchase.
- Say plainly whether they CAN or CANNOT do this, and the simple reason why.
- Do NOT put section numbers, Act names, or case names inside your sentences. Keep it human: "In Himachal Pradesh, people from outside the state usually can't buy farmland unless the state government gives special permission."
- Put the legal reference ONLY as a URL in the 'source' field — never as text in the explanation.
- Keep each point short. Reassure where things are fine; clearly flag where they are not.
This is general information, not legal advice.`;

async function runAgent(form, docText, ruleReport) {
  const ruleText = ruleReport && ruleReport.risks && ruleReport.risks.length
    ? `\n\nDETERMINISTIC RULE-ENGINE FINDINGS (authoritative — your verdict must NOT be less severe than "${ruleReport.top}", and you must reflect these):\n` +
      ruleReport.risks.map((r) => `- [${r.level}] ${r.title}: ${r.body}`).join("\n")
    : "";
  const userMsg =
    `Assess eligibility and risks for this property transaction:\n` +
    JSON.stringify(form, null, 2) + ruleText +
    (docText ? `\n\nAttached document excerpt (read it for relevant facts):\n"""${String(docText).slice(0, 3000)}"""` : "") +
    `\n\nResearch the governing law with the tools first, then answer in very simple language.`;

  const contents = [{ role: "user", parts: [{ text: userMsg }] }];
  const trace = [];
  const evidence = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const data = await gemini({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents,
      tools: TOOLS,
      toolConfig: { functionCallingConfig: { mode: "AUTO" } },
      generationConfig: { temperature: 0.2 },
    });
    const cand = data.candidates?.[0];
    if (!cand) break;
    const parts = cand.content?.parts || [];
    contents.push({ role: "model", parts });

    const calls = parts.filter((p) => p.functionCall).map((p) => p.functionCall);
    if (!calls.length) break; // model is done researching

    const responseParts = [];
    for (const call of calls) {
      let result;
      try {
        result = await runTool(call.name, call.args || {});
      } catch (e) {
        result = { error: String(e.message || e) };
      }
      trace.push({
        tool: call.name,
        args: call.args || {},
        ok: !result.error,
        summary: result.error || result.title || result.url || (result.docs ? `${result.docs.length} results` : "ok"),
      });
      if (!result.error) {
        if (result.docs) result.docs.forEach((d) => evidence.push({ title: d.title, url: d.source, text: d.snippet }));
        else evidence.push({ title: result.title || result.url, url: result.source || result.url, text: result.text || "" });
      }
      responseParts.push({ functionResponse: { name: call.name, response: { result } } });
    }
    contents.push({ role: "user", parts: responseParts });
  }

  // Phase 2 — force a clean structured report from the gathered evidence.
  const evidenceText = evidence.length
    ? evidence.map((e, i) => `[#${i + 1}] ${e.title}\nURL: ${e.url}\nExcerpt: ${e.text}`).join("\n\n")
    : "(no sources were retrieved)";

  const finalData = await gemini({
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{
      role: "user",
      parts: [{
        text:
          `Transaction facts:\n${JSON.stringify(form, null, 2)}${ruleText}\n\n` +
          `LEGAL SOURCES YOU RETRIEVED (put the matching URL in each finding's 'source'; if a point has no source, set source to null):\n${evidenceText}\n\n` +
          `Produce the final eligibility report as JSON per the schema: an overall verdict (must NOT be less severe than the rule-engine findings above), a one-line plain-language summary, findings written in simple friendly words with NO section/Act/case names in the text, and the list of sources. Order findings high severity first.`,
      }],
    }],
    generationConfig: { temperature: 0.2, responseMimeType: "application/json", responseSchema: ELIG_SCHEMA },
  });
  const txt = (finalData.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
  let report;
  try {
    report = JSON.parse(stripFences(txt));
  } catch {
    report = { verdict: "LOW", summary: txt.slice(0, 400) || "Could not format the report.", findings: [], sources: [] };
  }
  // Make sure the sources we actually hit are surfaced even if the model omitted them.
  if (!report.sources || !report.sources.length) {
    const seen = new Set();
    report.sources = evidence.filter((e) => e.url && !seen.has(e.url) && seen.add(e.url)).slice(0, 8).map((e) => ({ title: e.title, url: e.url }));
  }
  // Cross-check: the deterministic rule engine is authoritative on the bottom line.
  const order = { CLEAR: 0, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
  const ruleTop = (ruleReport && ruleReport.top) || "LOW";
  if ((order[ruleTop] || 0) > (order[String(report.verdict || "").toUpperCase()] || 0)) report.verdict = ruleTop;
  return { report, trace, roundsUsed: trace.length };
}

// ---------- HTTP server ----------
const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/api/health") {
    return send(res, 200, { ok: true, indiaKanoon: Boolean(IK_TOKEN), gemini: GEMINI_KEYS.length > 0, geminiKeys: GEMINI_KEYS.length, model: GEMINI_MODEL });
  }

  if (url.pathname === "/api/eligibility" && req.method === "POST") {
    try {
      const body = await readBody(req);
      if (!body || !body.form) return send(res, 400, { error: "Missing 'form' in request body." });
      const out = await runAgent(body.form, body.docText, body.ruleReport);
      return send(res, 200, out);
    } catch (e) {
      console.error("[eligibility] error:", e);
      return send(res, 500, { error: String(e.message || e) });
    }
  }

  return send(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`PropertyIQ agent backend on http://localhost:${PORT}`);
  console.log(`  India Kanoon token: ${IK_TOKEN ? "set" : "MISSING"} | Gemini keys: ${GEMINI_KEYS.length} (${GEMINI_MODEL})`);
});
