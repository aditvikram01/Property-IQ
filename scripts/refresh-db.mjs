// PropertyIQ — nightly legal-DB refresh (STAGE-FOR-REVIEW; best-effort day one).
//
// WHAT IT DOES
//   Scrapes the sources in RAG_DB.metadata.scrape_targets_for_daily_update
//   (India Kanoon API + India Code / LiveLaw / Bar & Bench pages), asks Gemini
//   whether anything indicates an amendment/notification/repeal affecting our
//   eligibility rules, and STAGES any candidates into a top-level
//   `pending_updates` array (with source link + date + confidence).
//
// WHAT IT DOES NOT DO
//   It NEVER overwrites the verified `eligibility_rules` / `stamp_duty`. Verified
//   law changes only when a human reviews & merges the PR the GitHub Action opens.
//   Per-site parsers are intentionally best-effort and marked `// TODO: harden`.
//
// Run: node scripts/refresh-db.mjs   (needs GEMINI_API_KEYS; INDIAN_KANOON_TOKEN optional)

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { RAG_DB } from "../lib/ragDatabase.js";

const DB_MODULE_PATH = fileURLToPath(new URL("../lib/ragDatabase.js", import.meta.url));
const IK_TOKEN = process.env.INDIAN_KANOON_TOKEN || "";
const GEMINI_KEYS = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "").split(",").map((k) => k.trim()).filter(Boolean);
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const IK_BASE = "https://api.indiankanoon.org";

const stripHtml = (h = "") => String(h).replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
const today = new Date().toISOString().slice(0, 10);

async function ikSearch(query) {
  if (!IK_TOKEN) return "";
  try {
    const r = await fetch(`${IK_BASE}/search/?formInput=${encodeURIComponent(query)}&pagenum=0`, { method: "POST", headers: { Authorization: `Token ${IK_TOKEN}`, Accept: "application/json" } });
    if (!r.ok) return "";
    const d = await r.json();
    return (d.docs || []).slice(0, 4).map((x) => `${stripHtml(x.title)} — ${stripHtml(x.headline).slice(0, 200)} (https://indiankanoon.org/doc/${x.tid}/)`).join("\n");
  } catch { return ""; }
}

async function fetchText(url) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": "PropertyIQ-refresh/1.0" } });
    if (!r.ok) return "";
    return stripHtml(await r.text()).slice(0, 6000);
  } catch { return ""; } // TODO: harden per site (LiveLaw / Bar & Bench have anti-scraping + shifting layouts)
}

let keyCursor = 0;
async function geminiExtract(ruleLabel, sourceText) {
  if (!GEMINI_KEYS.length || !sourceText) return null;
  const prompt = `You are tracking changes to Indian property law. Below is text scraped from a legal source, in the context of this rule: "${ruleLabel}".
Does the text indicate a RECENT amendment, notification, repeal, or court ruling that would change this rule? Reply with ONLY JSON:
{"change": "<one sentence, or empty if nothing relevant>", "date": "<YYYY-MM-DD or empty>", "url": "<source url if present or empty>", "confidence": "high|medium|low"}
If nothing relevant, set change to "".

SOURCE TEXT:
"""${sourceText.slice(0, 4000)}"""`;
  try {
    const key = GEMINI_KEYS[keyCursor++ % GEMINI_KEYS.length];
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0, thinkingConfig: { thinkingBudget: 0 }, responseMimeType: "application/json" } }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    const txt = (d.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
    const obj = JSON.parse(txt.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim());
    return obj.change ? obj : null;
  } catch { return null; }
}

async function main() {
  const targets = RAG_DB.metadata?.scrape_targets_for_daily_update || [];
  console.log(`[refresh] ${today} — ${targets.length} scrape targets, ${(RAG_DB.eligibility_rules || []).length} rules to check`);
  console.log(`[refresh] India Kanoon token: ${IK_TOKEN ? "set" : "MISSING"} | Gemini keys: ${GEMINI_KEYS.length}`);

  const newsTargets = targets.filter((t) => /livelaw|barandbench|indiacode/i.test(t.url));
  const pending = [];

  for (const rule of RAG_DB.eligibility_rules || []) {
    const label = `${rule.act} ${rule.section || ""} (${rule.state})`.trim();
    const query = rule.indian_kanoon_query || `${rule.act} ${rule.section || ""}`;
    const pieces = [];
    const ik = await ikSearch(`${query} amendment ${new Date().getFullYear()}`);
    if (ik) pieces.push(`INDIA KANOON:\n${ik}`);
    for (const t of newsTargets) {
      const txt = await fetchText(t.url); // TODO: use each site's search endpoint for `rule.act`
      if (txt) pieces.push(`${t.name}:\n${txt.slice(0, 1500)}`);
    }
    if (!pieces.length) continue;
    const found = await geminiExtract(label, pieces.join("\n\n"));
    if (found) {
      pending.push({ target_chunk_id: rule.chunk_id, change_summary: found.change, source_url: found.url || rule.india_code_url || "", detected_date: found.date || today, confidence: found.confidence || "low", staged_on: today });
      console.log(`[refresh] candidate for ${rule.chunk_id}: ${found.change}`);
    }
  }

  const db = { ...RAG_DB, pending_updates: pending };
  db.metadata = { ...db.metadata, last_refresh_run: today };
  const out = `// AUTO-GENERATED from propertyiq_rag_database.json — do not hand-edit the object below.\n// The nightly refresh (scripts/refresh-db.mjs) regenerates this via a staged PR.\nexport const RAG_DB =\n${JSON.stringify(db, null, 2)};\n`;
  await writeFile(DB_MODULE_PATH, out, "utf8");
  console.log(`[refresh] done. ${pending.length} candidate(s) staged into pending_updates (verified rules untouched).`);
}

main().catch((e) => { console.error("[refresh] fatal:", e); process.exit(1); });
