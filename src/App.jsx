import { useState, useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SAMPLE_CONTRACTS } from "./data/constants";
import { parseDocument } from "./lib/parseDocument";
import { OUTPUT_LANGUAGES } from "./lib/understand";
import { friendlyError } from "./lib/friendlyError";
import Home from "./pages/Home";
import Eligibility from "./pages/Eligibility";
import CompareCosts from "./pages/CompareCosts";
import Toolkit from "./pages/Toolkit";
import { AIPage } from "./pages/chrome";

function LoadingDots() {
  const [dots, setDots] = useState("");
  useEffect(() => {
    const i = setInterval(() => setDots((d) => (d.length >= 3 ? "" : d + ".")), 400);
    return () => clearInterval(i);
  }, []);
  return <span style={{ fontFamily: "monospace" }}>Analyzing{dots}</span>;
}

function formatAIResponse(text) {
  if (!text) return null;
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const key = i;
    const trimmed = line.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("### "))
      return <h4 key={key} style={{ color: "var(--accent)", marginTop: 16, marginBottom: 6, fontSize: 15, fontWeight: 700 }}>{trimmed.slice(4)}</h4>;
    if (trimmed.startsWith("## "))
      return <h3 key={key} style={{ marginTop: 20, marginBottom: 8, fontSize: 17, fontWeight: 800, borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>{trimmed.slice(3)}</h3>;
    if (trimmed.startsWith("# "))
      return <h2 key={key} style={{ marginTop: 20, marginBottom: 10, fontSize: 20, fontWeight: 800 }}>{trimmed.slice(2)}</h2>;
    if (trimmed.startsWith("🚫") || trimmed.startsWith("CRITICAL"))
      return <p key={key} className="alert alert-danger">{trimmed}</p>;
    if (trimmed.startsWith("⚠️") || trimmed.startsWith("HIGH") || trimmed.startsWith("WARNING"))
      return <p key={key} className="alert alert-warning">{trimmed}</p>;
    if (trimmed.startsWith("✅"))
      return <p key={key} className="alert alert-success">{trimmed}</p>;
    if (trimmed.startsWith("- ") || trimmed.startsWith("• "))
      return <p key={key} style={{ paddingLeft: 16, margin: "3px 0", fontSize: 13, lineHeight: 1.6, color: "var(--fg-secondary)" }}>{trimmed}</p>;
    if (trimmed.startsWith("**") && trimmed.endsWith("**"))
      return <p key={key} style={{ fontWeight: 700, margin: "8px 0 4px", fontSize: 13 }}>{trimmed.replace(/\*\*/g, "")}</p>;
    if (trimmed.startsWith("ORIGINAL:") || trimmed.startsWith("SUGGESTED:") || trimmed.startsWith("REASON:"))
      return <p key={key} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, padding: "4px 8px", background: "var(--bg)", borderRadius: 4, margin: "4px 0" }}>{trimmed}</p>;
    return <p key={key} style={{ margin: "4px 0", fontSize: 13, lineHeight: 1.7, color: "var(--fg-secondary)" }}>{trimmed.replace(/\*\*/g, "")}</p>;
  });
}


const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

// Defensive normalisation of whatever Gemini returns for Analyze Risk.
function normalizeRisk(data) {
  const findings = Array.isArray(data && data.findings) ? data.findings : [];
  const clean = findings.map((f) => ({
    clauseRef: String((f && f.clauseRef) || "").slice(0, 120),
    clauseQuote: String((f && f.clauseQuote) || "").slice(0, 400),
    risk: String((f && f.risk) || "Risk"),
    severity: ["high", "medium", "low"].includes(f && f.severity) ? f.severity : "medium",
    why: String((f && f.why) || ""),
    suggestion: String((f && f.suggestion) || ""),
    legalBasis: f && f.legalBasis ? String(f.legalBasis) : null,
  }));
  clean.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  return { summary: String((data && data.summary) || ""), findings: clean };
}

function Disclaimer() {
  return (
    <div className="alert alert-info" style={{ marginTop: 12, fontSize: 12, fontWeight: 500 }}>
      This is legal information, not legal advice. Consult a registered advocate or your nearest DLSA (District Legal Services Authority) before acting. Any law cited above comes only from our grounded clause library.
    </div>
  );
}

function RiskCards({ data }) {
  if (!data.findings.length) {
    return (
      <div className="card ai-output">
        <p style={{ fontSize: 13 }}>{data.summary || "No specific risks were identified."}</p>
        <Disclaimer />
      </div>
    );
  }
  return (
    <div className="card ai-output report">
      {data.summary && <div className="verdict-headline" style={{ fontSize: 16, marginBottom: 14 }}>{data.summary}</div>}
      {data.findings.map((f, i) => (
        <div key={i} className="why-card">
          <div style={{ marginBottom: 4 }}>
            <span className={`sev sev-${f.severity}`}>{f.severity.toUpperCase()}</span>
            <span className="why-title">{f.risk}</span>
          </div>
          {f.clauseQuote && (
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: "var(--fg-secondary)", background: "var(--bg)", borderRadius: 6, padding: "6px 9px", margin: "6px 0" }}>
              {f.clauseRef ? <b>{f.clauseRef}: </b> : null}{"“"}{f.clauseQuote}{"”"}
            </div>
          )}
          <div className="why-body">{f.why}</div>
          {f.suggestion && <div className="fix-box"><b>{"✔ "}</b>{f.suggestion}</div>}
          {f.legalBasis && (
            <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 8, fontWeight: 600 }}>
              {"📖 "}{f.legalBasis}
            </div>
          )}
        </div>
      ))}
      <Disclaimer />
    </div>
  );
}

function UnderstandTab({ onNavigate }) {
  const [language, setLanguage] = useState("Hindi");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseNote, setParseNote] = useState("");
  const [explainOut, setExplainOut] = useState(null);
  const [riskOut, setRiskOut] = useState(null);
  const [busy, setBusy] = useState("");          // "" | "explain" | "risk"
  const [error, setError] = useState("");

  // Parsing is client-side (Scribe) and needs no key. The doc is read in English;
  // the chosen OUTPUT language is applied later by Gemini, not here.
  const onFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";                          // allow re-uploading the same file
    if (!file) return;
    setParsing(true); setParseNote(""); setError(""); setFileName(file.name);
    try {
      const { text: t } = await parseDocument({ file });
      if (!t) setParseNote("Couldn't read text from that file. If it's a scan/photo, OCR may have failed — try pasting the text instead.");
      else { setText(t); setParseNote(`Loaded ${t.length.toLocaleString()} characters from ${file.name}.`); }
    } catch (err) {
      setParseNote("Parse failed: " + (err.message || "unknown error") + ". You can paste the text instead.");
    } finally {
      setParsing(false);
    }
  };

  // Analysis runs on the backend (POST /api/understand), which holds the Gemini
  // key in a server env var — the browser sends only the contract text, so no
  // key is entered by the user and none is ever exposed client-side.
  const run = async (op) => {
    setError("");
    if (text.trim().length < 30) { setError("Add a contract first — upload a PDF or paste at least a clause of text."); return; }
    setBusy(op);
    setExplainOut(null); setRiskOut(null); // only the latest request's output is shown
    try {
      let r;
      try {
        r = await fetch("/api/understand", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ op, text, language }),
        });
      } catch {
        throw new Error("Could not reach the AI service. In local dev, start it with `npm run server`.");
      }
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data.error) throw new Error(data.error || `AI service error ${r.status}`);
      if (op === "explain") setExplainOut(data.text || "");
      else setRiskOut(normalizeRisk(data.data));
    } catch (err) {
      setError(friendlyError(err.message));
    } finally {
      setBusy("");
    }
  };

  const ready = text.trim().length >= 30;

  return (
    <AIPage
      active="contract"
      onNavigate={onNavigate}
      kicker="Decode contract"
      title="Decode your contract."
      subtitle="Upload a PDF (digital or scanned) or paste the text, then get a plain-language explanation or a clause-by-clause risk analysis — in your chosen language."
      footerNote="This is legal information, not legal advice. Any law cited comes only from our grounded clause library — confirm with a registered advocate or your nearest DLSA before acting."
    >

      <div className="card">
        <div className="form-grid" style={{ marginBottom: 12 }}>
          <div>
            <label className="form-label">Output Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="form-select">
              {OUTPUT_LANGUAGES.map((l) => <option key={l.label} value={l.label}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Upload PDF</label>
            <label className="btn btn-sm btn-outline" style={{ display: "inline-block", cursor: parsing ? "wait" : "pointer" }}>
              {parsing ? "Reading…" : "Choose PDF"}
              <input type="file" accept="application/pdf,.pdf" onChange={onFile} style={{ display: "none" }} disabled={parsing} />
            </label>
          </div>
        </div>

        <div className="chip-row">
          {Object.keys(SAMPLE_CONTRACTS).map((name) => (
            <button key={name} className="btn btn-sm btn-outline" onClick={() => { setText(SAMPLE_CONTRACTS[name]); setParseNote("Loaded sample: " + name); setFileName(""); }}>
              {"📝"} {name}
            </button>
          ))}
        </div>

        <textarea value={text} onChange={(e) => { setText(e.target.value); setFileName(""); }}
          placeholder="Paste your contract / clause text here, or upload a PDF above…" rows={11} className="form-textarea" />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--fg-secondary)" }}>
            {parsing ? <LoadingDots /> : `${text.length.toLocaleString()} characters`}{fileName && !parsing ? ` · ${fileName}` : ""}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => run("explain")} disabled={!ready || !!busy}
              className={`btn ${ready ? "btn-primary" : ""}`}>
              {busy === "explain" ? <LoadingDots /> : "Explain"}
            </button>
            <button onClick={() => run("risk")} disabled={!ready || !!busy}
              className={`btn ${ready ? "btn-danger" : ""}`}>
              {busy === "risk" ? <LoadingDots /> : "Analyze Risk"}
            </button>
          </div>
        </div>
        {parseNote && <p style={{ fontSize: 11, color: "var(--fg-secondary)", marginTop: 8 }}>{parseNote}</p>}
        {error && <p className="alert alert-danger" style={{ marginTop: 10 }}>{error}</p>}
      </div>

      {explainOut && (
        <div className="card ai-output">
          <div className="doc-group-label" style={{ marginTop: 0 }}>Explanation · {language}</div>
          {formatAIResponse(explainOut)}
          <Disclaimer />
        </div>
      )}

      {riskOut && (
        <>
          <div className="doc-group-label">Risk Analysis · {language}</div>
          <RiskCards data={riskOut} />
        </>
      )}
    </AIPage>
  );
}

export default function App() {
  // Tab keys match the redesigned pages' own navigation:
  // home · eligibility · contract (Decode Contract) · costs (Compare Costs) · toolkit.
  const [tab, setTab] = useState("home");

  // Each page is a full-height view with its own header; jump to the top on switch.
  useEffect(() => { window.scrollTo(0, 0); }, [tab]);

  return (
    <div className="app">
      {tab === "home" && <Home onNavigate={setTab} />}
      {tab === "eligibility" && <Eligibility onNavigate={setTab} />}
      {tab === "contract" && <UnderstandTab onNavigate={setTab} />}
      {tab === "costs" && <CompareCosts onNavigate={setTab} />}
      {tab === "toolkit" && <Toolkit onNavigate={setTab} />}
      <Analytics />
    </div>
  );
}
