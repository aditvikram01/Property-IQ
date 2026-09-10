// Vercel serverless function — POST /api/eligibility
// Self-contained (so it deploys without a shared build step). Mirrors
// server/index.js but adds GEMINI KEY ROTATION: set GEMINI_API_KEYS to a
// comma-separated list of free-tier keys (ideally from DIFFERENT Google Cloud
// projects, which have separate quotas) and the agent round-robins + retries the
// next key on a 429. This multiplies effective quota but is a stopgap — enabling
// billing on one key is the real fix.
//
// Required Vercel env vars: INDIAN_KANOON_TOKEN, GEMINI_API_KEYS (or GEMINI_API_KEY).
// Optional: GEMINI_MODEL (default gemini-2.5-flash).

const IK_TOKEN = process.env.INDIAN_KANOON_TOKEN || "";
const GEMINI_KEYS = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "")
  .split(",").map((k) => k.trim()).filter(Boolean);
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const IK_BASE = "https://api.indiankanoon.org";
const ALLOWED_FETCH_HOSTS = ["indiankanoon.org", "www.indiankanoon.org", "indiacode.nic.in", "www.indiacode.nic.in"];
const MAX_TOOL_ROUNDS = 5;

const stripHtml = (h = "") => String(h).replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&#39;|&apos;/gi, "'").replace(/&quot;/gi, '"').replace(/\s+/g, " ").trim();
function stripFences(s = "") {
  let t = s.trim();
  if (t.startsWith("```")) t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if ((a > 0 || (b !== -1 && b < t.length - 1)) && a !== -1 && b > a) t = t.slice(a, b + 1);
  return t;
}

async function ikSearch(query) {
  const r = await fetch(`${IK_BASE}/search/?formInput=${encodeURIComponent(query)}&pagenum=0`, { method: "POST", headers: { Authorization: `Token ${IK_TOKEN}`, Accept: "application/json" } });
  if (!r.ok) throw new Error(`India Kanoon search HTTP ${r.status}`);
  const d = await r.json();
  return { found: d.found, docs: (d.docs || []).slice(0, 6).map((x) => ({ tid: x.tid, title: stripHtml(x.title), snippet: stripHtml(x.headline).slice(0, 300), source: `https://indiankanoon.org/doc/${x.tid}/` })) };
}
async function ikDoc(tid) {
  const r = await fetch(`${IK_BASE}/doc/${tid}/`, { method: "POST", headers: { Authorization: `Token ${IK_TOKEN}` } });
  if (!r.ok) throw new Error(`India Kanoon doc HTTP ${r.status}`);
  const d = await r.json();
  return { tid, title: stripHtml(d.title), text: stripHtml(d.doc).slice(0, 6000), source: `https://indiankanoon.org/doc/${tid}/` };
}
async function fetchUrl(url) {
  let host; try { host = new URL(url).hostname; } catch { throw new Error("Invalid URL"); }
  if (!ALLOWED_FETCH_HOSTS.includes(host)) throw new Error(`Domain not allowed: ${host}`);
  const r = await fetch(url, { headers: { "User-Agent": "PropertyIQ/1.0 (legal research)" } });
  if (!r.ok) throw new Error(`fetch ${url} HTTP ${r.status}`);
  return { url, text: stripHtml(await r.text()).slice(0, 6000) };
}
async function runTool(name, args) {
  if (name === "search_indian_kanoon") return ikSearch(String(args.query || ""));
  if (name === "get_indian_kanoon_doc") return ikDoc(Number(args.tid));
  if (name === "fetch_url") return fetchUrl(String(args.url || ""));
  return { error: `unknown tool ${name}` };
}

const TOOLS = [{ functionDeclarations: [
  { name: "search_indian_kanoon", description: "Search Indian Kanoon (case law + bare Acts). Returns top docs with title, snippet, tid, source URL.", parameters: { type: "OBJECT", properties: { query: { type: "STRING" } }, required: ["query"] } },
  { name: "get_indian_kanoon_doc", description: "Fetch full text of an Indian Kanoon doc by tid.", parameters: { type: "OBJECT", properties: { tid: { type: "INTEGER" } }, required: ["tid"] } },
  { name: "fetch_url", description: "Fetch text from a gov legal page (indiacode.nic.in / indiankanoon.org only).", parameters: { type: "OBJECT", properties: { url: { type: "STRING" } }, required: ["url"] } },
]}];

const ELIG_SCHEMA = { type: "OBJECT", properties: {
  verdict: { type: "STRING", enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW", "CLEAR"] },
  summary: { type: "STRING" },
  findings: { type: "ARRAY", items: { type: "OBJECT", properties: { title: { type: "STRING" }, severity: { type: "STRING", enum: ["critical", "high", "medium", "low"] }, explanation: { type: "STRING" }, legalBasis: { type: "STRING", nullable: true }, source: { type: "STRING", nullable: true } }, required: ["title", "severity", "explanation", "legalBasis", "source"] } },
  sources: { type: "ARRAY", items: { type: "OBJECT", properties: { title: { type: "STRING" }, url: { type: "STRING" } }, required: ["title", "url"] } },
}, required: ["verdict", "summary", "findings", "sources"] };

const SYSTEM = `You are PropertyIQ's friendly eligibility helper for property transactions in India (Himachal Pradesh, Maharashtra, Karnataka, Punjab and others). You help ordinary people — NOT lawyers — understand whether they can legally do their property transaction.
AUTHORITATIVE RULES: you may be given DETERMINISTIC RULE-ENGINE FINDINGS from a verified legal rule database. Treat them as CORRECT and FINAL on the bottom line — your conclusion must AGREE and must never be less severe. If the rules say a purchase is blocked/restricted (e.g. a non-agriculturist or outsider buying farmland in Himachal Pradesh), your verdict MUST say it is blocked. Use the Indian Kanoon tools to confirm and find the official source page, but the rule findings decide the answer.
RESEARCH: use search_indian_kanoon + get_indian_kanoon_doc (and fetch_url on indiacode.nic.in / indiankanoon.org) to find the governing rule and its official page. Do 2-4 focused lookups. NEVER invent a law, section, case, or citation — if you cannot find a source, leave it empty.
HOW TO WRITE (very important): use very simple, warm, everyday language like explaining to a nervous friend. Say plainly whether they CAN or CANNOT do this and the simple reason why. Do NOT put section numbers, Act names, or case names inside your sentences — keep it human. Put the legal reference ONLY as a URL in the 'source' field, never as text. Keep each point short; reassure where fine, clearly flag where not. This is general information, not legal advice.`;

// Gemini call with key rotation + 429 failover across keys.
let keyCursor = 0;
async function gemini(body) {
  if (!GEMINI_KEYS.length) throw new Error("No Gemini API key configured (set GEMINI_API_KEYS).");
  body.generationConfig = { ...(body.generationConfig || {}), thinkingConfig: { thinkingBudget: 0 } };
  let lastErr;
  const maxAttempts = Math.max(GEMINI_KEYS.length, 4); // retry transient 503/429 with backoff + key rotation
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) await new Promise((res) => setTimeout(res, 600 * attempt));
    const key = GEMINI_KEYS[(keyCursor + attempt) % GEMINI_KEYS.length];
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (r.ok) { keyCursor = (keyCursor + attempt) % GEMINI_KEYS.length; return r.json(); }
    const txt = await r.text().catch(() => "");
    lastErr = new Error(`Gemini HTTP ${r.status}: ${txt.slice(0, 200)}`);
    if (r.status !== 429 && r.status !== 503 && r.status !== 500) throw lastErr; // retry only transient
  }
  throw lastErr || new Error("Gemini unavailable after retries.");
}

async function runAgent(form, docText, ruleReport) {
  const ruleText = ruleReport && ruleReport.risks && ruleReport.risks.length
    ? `\n\nDETERMINISTIC RULE-ENGINE FINDINGS (authoritative — your verdict must NOT be less severe than "${ruleReport.top}", and you must reflect these):\n` + ruleReport.risks.map((r) => `- [${r.level}] ${r.title}: ${r.body}`).join("\n")
    : "";
  const userMsg = `Assess eligibility and risks for this property transaction:\n${JSON.stringify(form, null, 2)}${ruleText}` + (docText ? `\n\nAttached document excerpt:\n"""${String(docText).slice(0, 3000)}"""` : "") + `\n\nResearch the governing law with the tools first, then answer in very simple language.`;
  const contents = [{ role: "user", parts: [{ text: userMsg }] }];
  const trace = [], evidence = [];
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const data = await gemini({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents, tools: TOOLS, toolConfig: { functionCallingConfig: { mode: "AUTO" } }, generationConfig: { temperature: 0.2 } });
    const parts = data.candidates?.[0]?.content?.parts || [];
    if (!parts.length) break;
    contents.push({ role: "model", parts });
    const calls = parts.filter((p) => p.functionCall).map((p) => p.functionCall);
    if (!calls.length) break;
    const responseParts = [];
    for (const call of calls) {
      let result; try { result = await runTool(call.name, call.args || {}); } catch (e) { result = { error: String(e.message || e) }; }
      trace.push({ tool: call.name, args: call.args || {}, ok: !result.error, summary: result.error || result.title || result.url || (result.docs ? `${result.docs.length} results` : "ok") });
      if (!result.error) { if (result.docs) result.docs.forEach((d) => evidence.push({ title: d.title, url: d.source, text: d.snippet })); else evidence.push({ title: result.title || result.url, url: result.source || result.url, text: result.text || "" }); }
      responseParts.push({ functionResponse: { name: call.name, response: { result } } });
    }
    contents.push({ role: "user", parts: responseParts });
  }
  const evidenceText = evidence.length ? evidence.map((e, i) => `[#${i + 1}] ${e.title}\nURL: ${e.url}\nExcerpt: ${e.text}`).join("\n\n") : "(no sources retrieved)";
  const finalData = await gemini({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents: [{ role: "user", parts: [{ text: `Transaction facts:\n${JSON.stringify(form, null, 2)}${ruleText}\n\nLEGAL SOURCES YOU RETRIEVED (put the matching URL in each finding's 'source'; null if unsupported):\n${evidenceText}\n\nProduce the final eligibility report as JSON: an overall verdict (must NOT be less severe than the rule-engine findings above), a one-line plain-language summary, findings in simple friendly words with NO section/Act/case names in the text, high severity first, and the list of sources.` }] }], generationConfig: { temperature: 0.2, responseMimeType: "application/json", responseSchema: ELIG_SCHEMA } });
  const txt = (finalData.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
  let report; try { report = JSON.parse(stripFences(txt)); } catch { report = { verdict: "LOW", summary: txt.slice(0, 400) || "Could not format the report.", findings: [], sources: [] }; }
  if (!report.sources || !report.sources.length) { const seen = new Set(); report.sources = evidence.filter((e) => e.url && !seen.has(e.url) && seen.add(e.url)).slice(0, 8).map((e) => ({ title: e.title, url: e.url })); }
  const order = { CLEAR: 0, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
  const ruleTop = (ruleReport && ruleReport.top) || "LOW";
  if ((order[ruleTop] || 0) > (order[String(report.verdict || "").toUpperCase()] || 0)) report.verdict = ruleTop;
  return { report, trace, roundsUsed: trace.length };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    if (!body.form) return res.status(400).json({ error: "Missing 'form' in request body." });
    const out = await runAgent(body.form, body.docText, body.ruleReport);
    return res.status(200).json(out);
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
