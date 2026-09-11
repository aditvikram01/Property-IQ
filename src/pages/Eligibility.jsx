// PropertyIQ — Eligibility Check (wizard + report).
// Drop this in as `src/Eligibility.jsx` in the Property-IQ repo.
// It imports the map data already vendored at src/data/indiaMap.js.
//
// Wiring (in src/App.jsx):
//   import Eligibility from './Eligibility';
//   ...
//   {tab === 'eligibility' && <Eligibility onNavigate={setTab} />}
//
// Self-contained: fonts + keyframes injected by the component, inline styles
// only, no index.css changes needed. The rule engine is deterministic and
// lives entirely in this file (see buildFlags / quote).

import { useState, useRef, useEffect, useCallback } from 'react';
import indiaMap from '../data/indiaMap.js';
import { AREA_CATEGORIES, TRANSACTION_TYPES, PROPERTY_TYPES, BUYER_TYPES, GENDERS, DOCUMENT_CHECKLIST } from '../data/constants.js';
import { buildLocalEligibilityReport, getStampQuote, toEligibilityForm, PINCODES, INDIA_CODE_URL } from '../lib/eligibilityReport.js';
import { friendlyError } from '../lib/friendlyError.js';

/* ---------------------------------------------------------------- tokens */

const PAPER = '#f2eee3';
const PAPER_HI = '#f4f0e6';
const CARD = '#f7f3e9';
const INK = '#191714';
const INK_60 = '#7a7161';
const GREEN = '#1d3a2d';
const RULE = '#ded5c0';
const RULE_2 = '#e4dbc7';
const FIELD_BORDER = '#cec4ad';
const SANS = "'IBM Plex Sans',system-ui,sans-serif";
const SERIF = "'Source Serif 4',Georgia,serif";
const MONO = "'IBM Plex Mono',ui-monospace,monospace";
const DEV = "'Noto Serif Devanagari','Noto Sans Devanagari',serif";
const KAN = "'Noto Sans Kannada',sans-serif";
const GUR = "'Noto Sans Gurmukhi',sans-serif";

const FONT_CSS =
  "@import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&family=Noto+Serif+Devanagari:wght@400;500;600&family=Noto+Sans+Kannada:wght@400;500;600&family=Noto+Sans+Gurmukhi:wght@400;500;600&display=swap');";

const STYLE_CSS = `${FONT_CSS}
@keyframes piqDrawRoute { from { stroke-dashoffset:1200; } to { stroke-dashoffset:0; } }
@keyframes piqFadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
@keyframes piqGrowBar { from { transform:scaleX(0); } to { transform:scaleX(1); } }
.piq-elig a { color:#8f3a24; text-decoration:none; border-bottom:1px solid rgba(143,58,36,.35); }
.piq-elig a:hover { color:${INK}; border-bottom-color:${INK}; }
.piq-elig table { border-collapse:collapse; }
.piq-elig select, .piq-elig input { font-family:${SANS}; }
.piq-elig select:focus, .piq-elig input:focus { outline:2px solid ${GREEN}; outline-offset:-2px; }
.piq-elig details > summary { list-style:none; cursor:pointer; }
.piq-elig details > summary::-webkit-details-marker { display:none; }`;

/* ------------------------------------------------------------ state data */

const S = {
  hp: {
    name: 'Himachal Pradesh', native: 'हिमाचल प्रदेश', nativeFont: DEV, abbr: 'HP',
    accent: '#2f5d44', tint: '#e7eee9', mapTint: '#cddfd3', shape: 'triangle',
    record: 'Jamabandi', portal: 'himbhoomilmk.nic.in', valuation: 'Circle Rate', langs: 'English or Hindi',
    hierarchy: ['District', 'Tehsil', 'Village', 'Khasra No.'],
    units: ['Kanal', 'Marla', 'Bigha', 'Biswa', 'Sq. Meter', 'Sq. Feet', 'Hectare', 'Acre'],
    areas: ['General / Urban', 'Rural'],
  },
  mh: {
    name: 'Maharashtra', native: 'महाराष्ट्र', nativeFont: DEV, abbr: 'MH',
    accent: '#33302b', tint: '#e9e6df', mapTint: '#d7d3c8', shape: 'diamond',
    record: '7/12 Extract (Saat-Baara)', portal: 'mahabhulekh.maharashtra.gov.in', valuation: 'Ready Reckoner rate', langs: 'Marathi or English',
    hierarchy: ['Division', 'District', 'Taluka', 'Village', 'Survey No.'],
    units: ['Hectare', 'Are', 'Sq. Meter', 'Sq. Feet', 'Acre', 'Guntha'],
    areas: ['Mumbai Municipal Corp', 'Pune / Nagpur / Other MC', 'Rural Maharashtra'],
  },
  ka: {
    name: 'Karnataka', native: 'ಕರ್ನಾಟಕ', nativeFont: KAN, abbr: 'KA',
    accent: '#8f3a24', tint: '#f2e8e3', mapTint: '#e8cec3', shape: 'square',
    record: 'RTC / Pahani', portal: 'kaveri.karnataka.gov.in', valuation: 'Guidance Value', langs: 'English or Kannada only',
    hierarchy: ['District', 'Taluk', 'Hobli', 'Village', 'Survey No.'],
    units: ['Acre', 'Gunta', 'Sq. Meter', 'Sq. Feet', 'Hectare', 'Cent'],
    areas: ['Bangalore Urban (BBMP)', 'Other Urban', 'Rural (≤45L value)'],
  },
  pb: {
    name: 'Punjab', native: 'ਪੰਜਾਬ', nativeFont: GUR, abbr: 'PB',
    accent: '#9a7b2a', tint: '#f1ebdb', mapTint: '#e7dcbc', shape: 'circle',
    record: 'Jamabandi / Fard', portal: 'igrpunjab.gov.in', valuation: 'Collector / Circle Rate', langs: 'Punjabi or English',
    hierarchy: ['District', 'Tehsil/Sub-Tehsil', 'Village', 'Khasra No.'],
    units: ['Kanal', 'Marla', 'Acre', 'Sq. Feet', 'Sq. Meter', 'Hectare', 'Bigha'],
    areas: ['Urban (MC limits)', 'Rural'],
  },
};
const ORDER = ['hp', 'mh', 'ka', 'pb'];

const MOTIF = {
  hp: ['M4 20 L 17 5 L 30 20', 'M24 20 L 36 9 L 48 20', 'M2 20 L 54 20'],
  mh: ['M3 8 Q 15 2 27 8 T 51 8', 'M3 14 Q 15 8 27 14 T 51 14', 'M3 20 Q 15 14 27 20 T 51 20'],
  ka: ['M5 19 L 53 19', 'M11 13 L 47 13', 'M18 7 L 40 7', 'M29 7 L 29 19'],
  pb: ['M4 20 L 54 20', 'M10 20 L 10 6', 'M17 20 L 17 3', 'M24 20 L 24 9', 'M31 20 L 31 4', 'M38 20 L 38 8', 'M45 20 L 45 5'],
};

const UNIT_SQFT = { 'Sq. Feet': 1, 'Sq. Meter': 10.7639, Hectare: 107639.1, Acre: 43560, Bigha: 27000, Biswa: 1350, Kanal: 5445, Marla: 272.25, Gunta: 1089, Guntha: 1089, Are: 1076.39, Cent: 435.6 };

const STEPS = [
  { num: '01', label: 'Your route' },
  { num: '02', label: 'The property' },
  { num: '03', label: 'About you' },
  { num: '04', label: 'The deal' },
  { num: '05', label: 'Read it back' },
];

const REG_STEPS = [
  ['Document preparation', 'Gather NOCs and supporting documents for your deed type.'],
  ['Valuation', 'Market value established where the deed type requires it.'],
  ['Duty calculation', 'State rules, exemptions and concessions applied.'],
  ['Payment', 'e-Stamp, challan, franking or treasury, depending on the state.'],
  ['Presentation', 'Document submitted at the Sub-Registrar Office with jurisdiction.'],
  ['Admission', 'The SRO confirms execution is willing and uncoerced.'],
  ['Scrutiny', 'Execution date, market value, duty and jurisdiction verified.'],
  ['Identification', 'Biometrics, photographs, Aadhaar eKYC and witnesses.'],
  ['Registration', 'Registering authority signs; digital signature where configured.'],
  ['Handover', 'Document scanned, preserved digitally, original returned.'],
];

const LEVELS = {
  critical: { name: 'Critical', badge: 'Cannot proceed as structured', color: '#8f2d1c', tint: '#f4e4df', note: 'At least one condition blocks the transfer in the form you have described it.' },
  high: { name: 'High', badge: 'Conditions apply', color: '#a8622a', tint: '#f5ebdf', note: 'The transfer is possible, but a permission or a registration requirement must be dealt with first.' },
  medium: { name: 'Medium', badge: 'Proceed with checks', color: '#9a7b2a', tint: '#f2ecdc', note: 'Nothing blocks you. A few assumptions are worth correcting before you sign.' },
  low: { name: 'Low', badge: 'Clear on what we checked', color: '#2f5d44', tint: '#e7eee9', note: 'Nothing in our coverage flags against this route. Verify the current rate before you pay.' },
};
const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

// Field values use the AI's exact strings (municipal / txnType / gender etc.),
// since these feed the /api/eligibility agent and the rule engine.
const EMPTY = {
  step: 0, from: null, to: null, ran: false,
  propType: 'Residential', municipalStatus: 'Within municipal / notified limits', area: '', pincode: '',
  plot: '', unit: '', buyerType: 'Indian Resident', gender: 'Male', agri: null,
  age: '', buyingCapacity: 'Individual', tribalStatus: 'Non-tribal', sellerRelation: 'Not a blood relative',
  txnType: 'Sale Deed (Property Purchase)', value: '', leaseMonths: '', gpa: null,
};

// Worked example: a Maharashtra resident buying agricultural land in Himachal.
const EXAMPLE = {
  step: 4, from: 'mh', to: 'hp', ran: false,
  propType: 'Agricultural', municipalStatus: 'Outside municipal / rural limits', area: 'Rural', pincode: '175001',
  plot: '5', unit: 'Bigha', buyerType: 'Indian Resident', gender: 'Male', agri: 'no',
  age: '35', buyingCapacity: 'Individual', tribalStatus: 'Non-tribal', sellerRelation: 'Not a blood relative',
  txnType: 'Sale Deed (Property Purchase)', value: '7500000', leaseMonths: '', gpa: 'no',
};

/* ----------------------------------------------------------------- utils */

const inr = (n) => (isFinite(n) ? `₹${Math.round(n).toLocaleString('en-IN')}` : '₹0');
const pad2 = (n) => String(n).padStart(2, '0');

function shapePts(kind, s) {
  const c = s / 2, r = s * 0.44;
  if (kind === 'triangle') return `${c},${c - r} ${c + r * 0.92},${c + r * 0.72} ${c - r * 0.92},${c + r * 0.72}`;
  if (kind === 'diamond') return `${c},${c - r} ${c + r},${c} ${c},${c + r} ${c - r},${c}`;
  if (kind === 'square') return `${c - r * 0.8},${c - r * 0.8} ${c + r * 0.8},${c - r * 0.8} ${c + r * 0.8},${c + r * 0.8} ${c - r * 0.8},${c + r * 0.8}`;
  const p = [];
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    p.push(`${(c + r * Math.cos(a)).toFixed(1)},${(c + r * Math.sin(a)).toFixed(1)}`);
  }
  return p.join(' ');
}

/* ------------------------------------------------------------- fragments */

const labelCap = { fontFamily: MONO, fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: INK_60 };
const fieldStyle = { display: 'block', width: '100%', marginTop: 7, padding: '11px 12px', border: `1px solid ${FIELD_BORDER}`, background: PAPER_HI, fontSize: 14.5, color: INK, borderRadius: 0, boxSizing: 'border-box' };
const sectionHead = { fontFamily: SERIF, fontSize: 23, fontWeight: 600, margin: 0 };
const stepKicker = { fontFamily: MONO, fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: GREEN, fontWeight: 600 };
const stepTitle = { fontFamily: SERIF, fontSize: 24, fontWeight: 600, margin: '12px 0 0' };
const stepIntro = { fontSize: 14.5, lineHeight: 1.6, color: '#4a443b', margin: '9px 0 0' };

function Field({ label, children }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={labelCap}>{label}</span>
      {children}
    </label>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={onChange} style={fieldStyle}>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Choice({ options, value, onPick }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 9, flexWrap: 'wrap' }}>
      {options.map((o) => {
        const on = value === o.key;
        return (
          <button
            key={o.key}
            onClick={() => onPick(o.key)}
            style={{ border: `1px solid ${on ? GREEN : FIELD_BORDER}`, background: on ? GREEN : PAPER_HI, color: on ? PAPER_HI : INK, padding: '10px 18px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: SANS }}
          >{o.label}</button>
        );
      })}
    </div>
  );
}

function SectionRule({ title, note }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginTop: 52 }}>
      <h3 style={sectionHead}>{title}</h3>
      <div style={{ flex: 1, height: 1, background: INK, minWidth: 20 }} />
      {note && <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: INK_60 }}>{note}</span>}
    </div>
  );
}

/* ------------------------------------------------------------- component */

export default function Eligibility({ onNavigate }) {
  const [f, setF] = useState(EMPTY);
  const [ticked, setTicked] = useState({});
  const [centers, setCenters] = useState(null);
  const svgRef = useRef(null);
  // AI wiring (unchanged behavior): probe the agent, POST the form, fall back
  // to the deterministic local report. See runCheck below.
  const [agentInfo, setAgentInfo] = useState(null);   // null while probing; { available, ... }
  const [agentData, setAgentData] = useState(null);   // { report, trace } from the agent
  const [agentError, setAgentError] = useState('');
  const [result, setResult] = useState(null);         // buildLocalEligibilityReport output
  const [loading, setLoading] = useState(false);

  const go = useCallback((key) => { if (typeof onNavigate === 'function') onNavigate(key); }, [onNavigate]);
  const upd = (patch) => setF((s) => ({ ...s, ...patch }));
  const onField = (k) => (e) => upd({ [k]: e.target.value });
  const onNum = (k) => (e) => upd({ [k]: (e.target.value || '').replace(/[^0-9]/g, '') });

  const { step, from, to, ran } = f;
  const dest = to ? S[to] : null;
  const src = from ? S[from] : null;
  const isRent = f.txnType === 'Rent Agreement';

  // Deterministic cost estimate — live in the wizard AND reused in the report,
  // from the same engine the AI is cross-checked against.
  const engForm = toEligibilityForm(f);
  const sq = getStampQuote(engForm);
  const q = sq ? {
    val: parseInt(f.value, 10) || 0, total: sq.total,
    duty: sq.stamp, reg: sq.registration, cess: sq.cess,
    dutyRate: sq.stampRate, regRate: sq.regRate, cessRate: sq.cessRate,
  } : null;

  // Verdict + findings come from the live agent when it answered, else from the
  // local report. Cost / journey / documents always render from the local data.
  const rep = agentData && agentData.report ? agentData.report : null;
  const LVL_KEY = { CRITICAL: 'critical', HIGH: 'high', MEDIUM: 'medium', LOW: 'low', CLEAR: 'low' };
  const verdictUpper = rep ? String(rep.verdict || 'LOW').toUpperCase()
    : result ? String(result.verdict.level || 'LOW').toUpperCase() : 'LOW';
  const worst = LVL_KEY[verdictUpper] || 'low';
  const lvl = LEVELS[worst];
  const meterOn = { critical: 4, high: 3, medium: 2, low: 1 }[worst];

  const flags = rep
    ? (rep.findings || []).map((fd) => ({
        sev: (fd.severity || 'low').toLowerCase(), title: fd.title, body: fd.explanation,
        source: fd.legalBasis || 'Grounded source', sourceNote: '', link: fd.source || '',
      }))
    : result
    ? [...(result.blockers || []), ...(result.notes || [])]
        .map((r) => ({
          sev: (r.level || 'low').toLowerCase(), title: r.title, body: r.body,
          source: r.source, sourceNote: '', link: r.lawLink || INDIA_CODE_URL,
        }))
        .sort((a, b) => SEV_ORDER[a.sev] - SEV_ORDER[b.sev])
    : [];
  const sources = rep && Array.isArray(rep.sources) ? rep.sources : [];

  // The inputs the agent + rule engine require (mirrors the old canSubmit).
  const complete = !!(from && to && f.pincode && f.area && f.value && f.propType
    && f.gender && f.age && f.municipalStatus && f.buyingCapacity && f.txnType);

  // Measure state centroids once the map paths have real geometry.
  useEffect(() => {
    let raf = 0, tries = 0, cancelled = false;
    const measure = () => {
      if (cancelled) return;
      const svg = svgRef.current;
      const found = {};
      let ok = !!svg;
      if (svg) {
        ORDER.forEach((id) => {
          const el = svg.querySelector(`[data-sid="${id}"]`);
          let b;
          try { b = el && el.getBBox ? el.getBBox() : null; } catch { b = null; }
          if (b && b.width > 0 && b.height > 0) found[id] = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
          else ok = false;
        });
      }
      if (ok && Object.keys(found).length === ORDER.length) setCenters(found);
      else if (tries++ < 60) raf = requestAnimationFrame(measure);
    };
    measure();
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, [step, ran]);

  const pick = (id) => {
    if (!from) { upd({ from: id, to: null, area: '', unit: '', pincode: '' }); return; }
    if (from === id) { upd({ from: null, to: null, area: '', unit: '', pincode: '' }); return; }
    if (!to) { const d = S[id]; upd({ to: id, area: (AREA_CATEGORIES[d.name] || [])[0] || '', unit: d.units[0], pincode: '' }); return; }
    upd({ from: id, to: null, area: '', unit: '', pincode: '' });
  };

  // Probe the agent backend once. When up, the LLM research agent answers;
  // otherwise the offline deterministic report is used. (Same as before.)
  useEffect(() => {
    let alive = true;
    fetch('/api/health')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('down'))))
      .then((d) => alive && setAgentInfo({ available: true, ...d }))
      .catch(() => alive && setAgentInfo({ available: false }));
    return () => { alive = false; };
  }, []);

  const runCheck = async () => {
    const form = toEligibilityForm(f);
    const local = buildLocalEligibilityReport(form);   // deterministic cross-check + fallback
    setResult(local); setAgentData(null); setAgentError('');
    upd({ ran: true }); setLoading(true);
    if (agentInfo && agentInfo.available) {
      try {
        const r = await fetch('/api/eligibility', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ form, ruleReport: { top: local.top, risks: local.risks } }),
        });
        const data = await r.json();
        if (!r.ok || data.error) throw new Error(data.error || `Agent error ${r.status}`);
        setAgentData(data);
      } catch (e) {
        setAgentError(friendlyError(e.message));   // graceful fallback — local report already set
      } finally {
        setLoading(false);
      }
      return;
    }
    setLoading(false);
  };

  const byName = {};
  ORDER.forEach((id) => { byName[S[id].name] = id; });
  const locs = indiaMap.locations || [];

  let mapRoute = '';
  let mapMarks = [];
  if (from && to && centers) {
    const a = centers[from], b = centers[to];
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    const cx = mx - (dy / len) * len * 0.28, cy = my + (dx / len) * len * 0.28;
    mapRoute = `M ${a.x} ${a.y} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x} ${b.y}`;
    mapMarks = [
      { t: `translate(${a.x},${a.y})`, r: 2.6, r2: 6 },
      { t: `translate(${b.x},${b.y})`, r: 3.6, r2: 8.5 },
    ];
  }

  const sqft = (parseFloat(f.plot) || 0) * (UNIT_SQFT[f.unit] || 0);
  const plotSide = sqft > 0 ? Math.max(16, Math.min(128, 20 + 108 * Math.min(1, Math.log10(sqft + 1) / 5.2))) : 0;

  const costRows = q ? [
    { label: `Stamp duty at ${q.dutyRate}%`, amount: inr(q.duty), color: GREEN },
    { label: `Registration fee at ${q.regRate}%`, amount: inr(q.reg), color: '#8f3a24' },
    { label: q.cessRate ? `Cess at ${q.cessRate}%` : 'Cess — none in this category', amount: inr(q.cess), color: '#9a7b2a' },
  ] : [];
  const costBars = q && q.total > 0 ? [
    { pct: `${((q.duty / q.total) * 100).toFixed(1)}%`, color: GREEN },
    { pct: `${((q.reg / q.total) * 100).toFixed(1)}%`, color: '#8f3a24' },
    { pct: `${((q.cess / q.total) * 100).toFixed(1)}%`, color: '#9a7b2a' },
  ] : [];
  const rateLine = q && q.val
    ? `${q.override ? 'Non-resident rate: ' : ''}${q.dutyRate}% duty${q.regRate ? ` + ${q.regRate}% registration` : ''}${q.cessRate ? ` + ${q.cessRate}% cess` : ''} on ${inr(q.val)}.`
    : 'Enter a value in step four to see the cost.';

  const docList = DOCUMENT_CHECKLIST[f.txnType] || DOCUMENT_CHECKLIST['Sale Deed (Property Purchase)'] || [];
  const reviewRows = [
    ['Home state', src ? src.name : 'Not chosen'],
    ['Property state', dest ? dest.name : 'Not chosen'],
    ['Pincode', f.pincode || 'Not chosen'],
    ['Transaction', f.txnType],
    ['Property type', f.propType],
    ['Municipal status', f.municipalStatus],
    ['Area category', f.area || 'Not chosen'],
    ['Plot size', f.plot ? `${f.plot} ${f.unit}` : 'Not given'],
    ['Buyer', `${f.buyerType} · ${f.gender}${f.age ? ` · ${f.age}` : ''}`],
    ['Residency', from && to ? (from === to ? 'Resident of the property state' : 'Outsider (another state)') : 'Not chosen'],
    ['Buying as', f.buyingCapacity || 'Not chosen'],
    ['Tribal status', f.tribalStatus || 'Not answered'],
    ['Relationship with seller', f.sellerRelation || 'Not answered'],
    ['Agriculturist', f.agri === 'yes' ? 'Recorded agriculturist' : f.agri === 'no' ? 'Not an agriculturist' : 'Not answered'],
    [isRent ? 'Rent plus deposit' : 'Consideration', f.value ? inr(parseInt(f.value, 10)) : 'Not given'],
    ['Term', isRent ? (f.leaseMonths ? `${f.leaseMonths} months` : 'Not given') : 'Not applicable'],
    ['Through a GPA', f.gpa === 'yes' ? 'Yes' : f.gpa === 'no' ? 'No' : 'Not answered'],
  ];

  const headline = !to ? 'Choose a route first.'
    : loading ? `Checking your route into ${dest.name}…`
    : rep ? (rep.summary || `Assessment for buying in ${dest.name}.`)
    : result ? result.verdict.headline
    : `Run the check to see where you stand in ${dest.name}.`;

  const navItems = [
    { key: 'home', label: 'Home' },
    { key: 'eligibility', label: 'Eligibility Check' },
    { key: 'contract', label: 'Decode Contract' },
    { key: 'costs', label: 'Compare Costs' },
    { key: 'toolkit', label: 'Toolkit' },
  ];

  const mapBlock = (maxW) => (
    <svg ref={svgRef} viewBox={indiaMap.viewBox} style={{ width: '100%', maxWidth: maxW, height: 'auto', maxHeight: 380, display: 'block' }} role="img" aria-label="Map of India with your route">
      {locs.map((loc) => {
        const id = byName[loc.name];
        const sel = id && (id === from || id === to);
        return <path key={loc.id} d={loc.path} data-sid={id || loc.id} fill={sel ? S[id].accent : id ? S[id].mapTint : '#e8e1ce'} stroke={PAPER_HI} strokeWidth={sel ? 1.2 : 0.8} style={{ transition: 'fill .25s' }} />;
      })}
      {locs.filter((loc) => byName[loc.name]).map((loc) => {
        const id = byName[loc.name];
        const sel = id === from || id === to;
        return <path key={`o-${loc.id}`} d={loc.path} fill="none" stroke={sel ? PAPER_HI : S[id].accent} strokeWidth={sel ? 1.3 : 1} strokeLinejoin="round" />;
      })}
      {mapRoute && <path d={mapRoute} fill="none" stroke="#8f3a24" strokeWidth="1.6" strokeDasharray="1200" style={{ animation: 'piqDrawRoute .9s ease-out both' }} />}
      {mapMarks.map((m, i) => (
        <g key={i} transform={m.t}>
          <circle cx="0" cy="0" r={m.r} fill="#8f3a24" />
          <circle cx="0" cy="0" r={m.r2} fill="none" stroke="#8f3a24" strokeWidth="0.8" />
        </g>
      ))}
    </svg>
  );

  return (
    <div className="piq-elig" style={{ fontFamily: SANS, background: PAPER, color: INK, minHeight: '100vh', overflowX: 'hidden' }}>
      <style>{STYLE_CSS}</style>

      {/* header */}
      <header style={{ borderBottom: `1px solid ${INK}`, background: CARD }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '17px 0 15px' }}>
            <svg viewBox="0 0 26 26" width="24" height="24" aria-hidden="true">
              <circle cx="13" cy="13" r="12" fill="none" stroke={GREEN} strokeWidth="1" />
              <circle cx="13" cy="13" r="8.4" fill="none" stroke={GREEN} strokeWidth="0.5" />
              <polygon points="13,5.4 20.6,13 13,20.6 5.4,13" fill={GREEN} />
            </svg>
            <span style={{ fontFamily: SERIF, fontSize: 21, fontWeight: 700, letterSpacing: '-.2px' }}>PropertyIQ</span>
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: INK_60, borderLeft: '1px solid #d6cdb8', paddingLeft: 13 }}>Know before you buy</span>
          </div>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            {navItems.map((n) => {
              const active = n.key === 'eligibility';
              return (
                <button key={n.key} onClick={() => go(n.key)} style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.06em', padding: '10px 14px', border: 'none', borderBottomWidth: 2, borderBottomStyle: 'solid', borderBottomColor: active ? GREEN : 'transparent', background: 'none', cursor: 'pointer', color: active ? GREEN : INK_60, fontWeight: active ? 600 : 400 }}>{n.label}</button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* page intro */}
      <section style={{ position: 'relative', borderBottom: `1px solid ${INK}`, background: PAPER_HI, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(#cfc6b0 1px,transparent 1px)', backgroundSize: '22px 22px', opacity: 0.45, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '44px 32px 38px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,360px),1fr))', gap: 32, alignItems: 'end' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', background: GREEN, padding: '6px 13px', whiteSpace: 'nowrap', maxWidth: '100%' }}>
              <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: '#e8e2d2', fontWeight: 500 }}>Eligibility check</span>
            </div>
            <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(32px,4.4vw,50px)', lineHeight: 1.02, fontWeight: 700, letterSpacing: '-1.2px', margin: '18px 0 0', textWrap: 'pretty' }}>
              Find out where you stand<br />before you commit.
            </h1>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: '#3d382f', margin: '18px 0 0', maxWidth: 520, textWrap: 'pretty' }}>
              Five short steps. You get a verdict, the cost to close, every condition that applies to your route, and the section of law each one comes from.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => { setF(EXAMPLE); setTicked({}); }} style={{ border: `1px solid ${INK}`, background: CARD, padding: '12px 20px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: SANS, color: INK }}>See a worked example</button>
            <button onClick={() => { setF(EMPTY); setTicked({}); }} style={{ background: 'none', border: '1px solid #d6cdb8', padding: '12px 16px', fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: INK_60, cursor: 'pointer' }}>Start over</button>
          </div>
        </div>
      </section>

      {/* step rail */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '34px 32px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', border: `1px solid ${RULE}`, background: CARD }}>
          {STEPS.map((s, i) => {
            const done = i < step;
            return (
              <button key={s.num} onClick={() => upd({ step: i, ran: false })} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 9, alignItems: 'flex-start', textAlign: 'left', padding: '15px 16px 14px', background: i === step ? PAPER_HI : 'transparent', border: 'none', borderRight: `1px solid ${RULE}`, cursor: 'pointer', fontFamily: SANS }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%' }}>
                  <svg viewBox="0 0 22 22" width="20" height="20" style={{ flex: 'none' }} aria-hidden="true">
                    <circle cx="11" cy="11" r="10" fill={done ? GREEN : i === step ? CARD : 'transparent'} stroke={i <= step ? GREEN : FIELD_BORDER} strokeWidth="1" />
                    {done && <path d="M6.5 11.4 L 9.6 14.2 L 15.4 7.6" fill="none" stroke={PAPER_HI} strokeWidth="1.8" strokeLinecap="round" />}
                  </svg>
                  <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: i <= step ? GREEN : '#a89f8a' }}>{s.num}</span>
                  <div style={{ flex: 1, height: 1, background: i <= step ? GREEN : '#e0d8c4' }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: i === step ? INK : done ? '#5e5648' : '#a89f8a', lineHeight: 1.3 }}>{s.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* wizard */}
      {!ran && (
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '22px 32px 0' }}>
          <div style={{ border: `1px solid ${INK}`, background: CARD }}>

            {step === 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))' }}>
                <div style={{ padding: '30px 30px 32px', borderRight: '1px solid #e0d8c4' }}>
                  <div style={stepKicker}>{!from ? 'Step one — where do you live?' : !to ? 'Step one — where is the property?' : 'Step one of five'}</div>
                  <h2 style={stepTitle}>Your route</h2>
                  <p style={stepIntro}>Stamp duty, land records and tenancy law all follow the property, not you. Choose where you live, then where the property is.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,132px),1fr))', gap: 14, marginTop: 24 }}>
                    {ORDER.map((id) => {
                      const d = S[id];
                      const isFrom = from === id, isTo = to === id, sel = isFrom || isTo;
                      const accent = sel ? d.accent : '#9c947f';
                      return (
                        <button key={id} onClick={() => pick(id)} style={{ position: 'relative', display: 'block', width: '100%', cursor: 'pointer', padding: 0, background: 'none', border: 'none', font: 'inherit' }}>
                          <div style={{ border: `1px solid ${sel ? d.accent : RULE}`, background: sel ? d.tint : CARD, borderRadius: '999px 999px 2px 2px', padding: '22px 12px 14px', minHeight: 156, display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: sel ? `4px 4px 0 ${d.tint}, 4px 4px 0 1px ${d.accent}` : 'none', transition: 'all .2s' }}>
                            <svg viewBox="0 0 22 22" width="22" height="22" aria-hidden="true"><polygon points={shapePts(d.shape, 22)} fill={accent} /></svg>
                            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.22em', color: accent, marginTop: 10 }}>{d.abbr}</div>
                            <div style={{ fontFamily: SERIF, fontSize: 14.5, lineHeight: 1.2, fontWeight: 600, textAlign: 'center', marginTop: 6 }}>{d.name}</div>
                            <div style={{ fontFamily: d.nativeFont, fontSize: 11, color: '#8c8471', marginTop: 4 }}>{d.native}</div>
                            <div style={{ marginTop: 'auto', paddingTop: 12 }}>
                              <svg viewBox="0 0 58 24" width="48" height="20" aria-hidden="true">
                                <g fill="none" stroke={accent} strokeWidth="1" strokeLinecap="round" opacity="0.7">
                                  {MOTIF[id].map((p, i) => <path key={i} d={p} />)}
                                </g>
                              </svg>
                            </div>
                          </div>
                          {sel && (
                            <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', background: d.accent, color: CARD, padding: '2px 8px', fontFamily: MONO, fontSize: 8, letterSpacing: '.16em', whiteSpace: 'nowrap' }}>
                              {isFrom ? 'YOU LIVE HERE' : 'BUYING HERE'}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ padding: 26, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: PAPER_HI }}>
                  {mapBlock(300)}
                  <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8f3a24', marginTop: 14, textAlign: 'center' }}>
                    {from && to ? `${src.name} → ${dest.name}` : from ? 'Now choose the property state' : 'Choose your home state'}
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))' }}>
                <div style={{ padding: 30, borderRight: '1px solid #e0d8c4' }}>
                  <div style={stepKicker}>Step two of five</div>
                  <h2 style={stepTitle}>The property</h2>
                  <p style={stepIntro}>What kind of land, and where it sits administratively. Agricultural land is where most conditions bite.</p>
                  <div style={{ display: 'grid', gap: 18, marginTop: 24 }}>
                    <Field label="Property type"><Select value={f.propType} onChange={onField('propType')} options={PROPERTY_TYPES} /></Field>
                    <Field label="Municipal status"><Select value={f.municipalStatus} onChange={onField('municipalStatus')} options={['Within municipal / notified limits', 'Outside municipal / rural limits', 'Unsure']} /></Field>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <Field label={`Area category (${dest ? dest.name : 'destination'})`}>
                        <Select value={f.area} onChange={onField('area')} options={dest ? (AREA_CATEGORIES[dest.name] || []) : ['Choose a property state first']} />
                      </Field>
                      <Field label="Property pincode">
                        <Select value={f.pincode} onChange={onField('pincode')} options={dest ? ['', ...(PINCODES[dest.name] || []).map((p) => p.v)] : ['Choose a property state first']} />
                      </Field>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <Field label="Plot size"><input type="text" value={f.plot} onChange={onNum('plot')} placeholder="e.g. 5" style={fieldStyle} /></Field>
                      <Field label="Unit"><Select value={f.unit} onChange={onField('unit')} options={dest ? dest.units : ['Sq. Feet']} /></Field>
                    </div>
                  </div>
                </div>
                <div style={{ padding: 30, background: PAPER_HI, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ ...labelCap, letterSpacing: '.16em' }}>Your plot, to scale of itself</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, marginTop: 18, flexWrap: 'wrap' }}>
                    <svg viewBox="0 0 140 140" width="150" height="150" style={{ flex: 'none' }} aria-hidden="true">
                      <defs>
                        <pattern id="piqPlotGrid" width="14" height="14" patternUnits="userSpaceOnUse">
                          <path d="M14 0 L 0 0 0 14" fill="none" stroke="#cfc6b0" strokeWidth="0.6" />
                        </pattern>
                      </defs>
                      <rect x="6" y="6" width="128" height="128" fill="url(#piqPlotGrid)" stroke={FIELD_BORDER} strokeWidth="1" />
                      <rect x={6 + (128 - plotSide) / 2} y={6 + (128 - plotSide)} width={plotSide} height={plotSide} fill={dest ? dest.tint : '#e9e6df'} stroke={dest ? dest.accent : '#b9ae94'} strokeWidth="1.2" style={{ transition: 'all .3s' }} />
                      <line x1="6" y1="138" x2="134" y2="138" stroke="#b9ae94" strokeWidth="0.8" />
                    </svg>
                    <div>
                      <div style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 700, lineHeight: 1 }}>{sqft > 0 ? Math.round(sqft).toLocaleString('en-IN') : '—'}</div>
                      <div style={{ ...labelCap, marginTop: 6 }}>Square feet</div>
                      <div style={{ fontSize: 13, lineHeight: 1.55, color: '#4a443b', marginTop: 12, maxWidth: 230 }}>
                        {sqft > 0
                          ? `${f.plot} ${f.unit} in ${dest ? dest.name : 'this state'}, converted to square feet. Units differ by state, so always convert before comparing prices.`
                          : 'Enter a plot size and its local unit. Bigha, Kanal, Guntha and Cent all mean different areas in different states.'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))' }}>
                <div style={{ padding: 30, borderRight: '1px solid #e0d8c4' }}>
                  <div style={stepKicker}>Step three of five</div>
                  <h2 style={stepTitle}>About you</h2>
                  <p style={stepIntro}>Who is buying decides both the rate you pay and, for farmland, whether you may buy at all.</p>
                  <div style={{ display: 'grid', gap: 18, marginTop: 24 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <Field label="Buyer status"><Select value={f.buyerType} onChange={onField('buyerType')} options={BUYER_TYPES} /></Field>
                      <Field label="Buyer age"><input type="text" inputMode="numeric" value={f.age} onChange={(e) => upd({ age: (e.target.value || '').replace(/[^0-9]/g, '').slice(0, 3) })} placeholder="e.g. 35" style={fieldStyle} /></Field>
                    </div>
                    <Field label="Registering in the name of"><Select value={f.gender} onChange={onField('gender')} options={GENDERS} /></Field>
                    <Field label="Buying as"><Select value={f.buyingCapacity} onChange={onField('buyingCapacity')} options={['Individual', 'Company / LLP', 'Bank / Financial institution', 'Trust / Society', 'Government / PSU']} /></Field>
                    <Field label="Tribal classification"><Select value={f.tribalStatus} onChange={onField('tribalStatus')} options={['Non-tribal', 'Tribal (Scheduled Tribe)', 'Unsure']} /></Field>
                    <div>
                      <span style={labelCap}>Are you a recorded agriculturist?</span>
                      <Choice
                        value={f.agri}
                        onPick={(k) => upd({ agri: k })}
                        options={[{ key: 'yes', label: 'Yes, recorded' }, { key: 'no', label: 'No' }]}
                      />
                      <p style={{ fontSize: 12.5, lineHeight: 1.55, color: INK_60, margin: '11px 0 0', maxWidth: 400 }}>
                        Recorded in a land record as holding agricultural land — usually shown by a Jamabandi, 7/12 extract or RTC in your name.
                      </p>
                    </div>
                  </div>
                </div>
                <div style={{ padding: 30, background: PAPER_HI, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
                  <div style={{ ...labelCap, letterSpacing: '.16em' }}>What this changes in {dest ? dest.name : 'your destination state'}</div>
                  {dest && [
                    `${dest.name} records ownership in the ${dest.record}, published on ${dest.portal}.`,
                    to === 'ka' ? 'Karnataka grants no concession for a female buyer — the rate is the same for everyone.' : 'A female buyer pays a reduced rate here; a joint registration falls between the two.',
                    f.buyerType === 'NRI / OCI' ? 'As a non-resident you may acquire residential and commercial property, but not agricultural land.' : 'Whether you are a recorded agriculturist decides your position on farmland.',
                  ].map((text, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '24px minmax(0,1fr)', gap: 12, padding: '13px 0', borderTop: '1px solid #e0d8c4', alignItems: 'start' }}>
                      <svg viewBox="0 0 16 16" width="15" height="15" style={{ marginTop: 3 }} aria-hidden="true"><polygon points="8,1 15,8 8,15 1,8" fill={dest.accent} opacity="0.85" /></svg>
                      <span style={{ fontSize: 13.5, lineHeight: 1.6, color: '#3d382f' }}>{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))' }}>
                <div style={{ padding: 30, borderRight: '1px solid #e0d8c4' }}>
                  <div style={stepKicker}>Step four of five</div>
                  <h2 style={stepTitle}>The deal</h2>
                  <p style={stepIntro}>How the transfer is structured, and for how much. This drives the cost and the registration rules.</p>
                  <div style={{ display: 'grid', gap: 18, marginTop: 24 }}>
                    <Field label="Transaction"><Select value={f.txnType} onChange={onField('txnType')} options={TRANSACTION_TYPES} /></Field>
                    <Field label={isRent ? 'Total rent plus deposit (₹)' : 'Consideration (₹)'}>
                      <input type="text" value={f.value ? parseInt(f.value, 10).toLocaleString('en-IN') : ''} onChange={onNum('value')} placeholder="e.g. 75,00,000" style={{ ...fieldStyle, fontFamily: MONO }} />
                    </Field>
                    {isRent && (
                      <Field label="Term in months">
                        <input type="text" value={f.leaseMonths} onChange={onNum('leaseMonths')} placeholder="e.g. 11" style={{ ...fieldStyle, fontFamily: MONO }} />
                      </Field>
                    )}
                    <Field label="Relationship with seller"><Select value={f.sellerRelation} onChange={onField('sellerRelation')} options={['Not a blood relative', 'Spouse', 'Child', 'Grandchild', 'Parent', 'Sibling', 'Other relative']} /></Field>
                    <div>
                      <span style={labelCap}>Is the transfer being done through a Power of Attorney?</span>
                      <Choice
                        value={f.gpa}
                        onPick={(k) => upd({ gpa: k })}
                        options={[{ key: 'yes', label: 'Yes, through a GPA' }, { key: 'no', label: 'No, direct from the titleholder' }]}
                      />
                    </div>
                  </div>
                </div>
                <div style={{ padding: 30, background: PAPER_HI, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ ...labelCap, letterSpacing: '.16em' }}>Running estimate</div>
                  <div style={{ fontFamily: SERIF, fontSize: 'clamp(28px,3.6vw,42px)', fontWeight: 700, lineHeight: 1, marginTop: 12 }}>{q && q.val ? inr(q.total) : '—'}</div>
                  <div style={{ fontSize: 13, color: INK_60, marginTop: 7 }}>{rateLine}</div>
                  <div style={{ display: 'flex', height: 16, marginTop: 20, border: `1px solid ${FIELD_BORDER}`, background: '#efe9db', overflow: 'hidden' }}>
                    {costBars.map((b, i) => <div key={i} style={{ width: b.pct, background: b.color, transformOrigin: 'left', animation: 'piqGrowBar .5s ease-out both' }} />)}
                  </div>
                  <div style={{ display: 'grid', marginTop: 6 }}>
                    {costRows.map((r) => (
                      <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: '1px solid #e0d8c4' }}>
                        <svg viewBox="0 0 10 10" width="9" height="9" style={{ flex: 'none' }} aria-hidden="true"><rect width="10" height="10" fill={r.color} /></svg>
                        <span style={{ fontSize: 13.5, color: '#3d382f', flex: 1 }}>{r.label}</span>
                        <span style={{ fontFamily: MONO, fontSize: 12.5, color: INK }}>{r.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div style={{ padding: 30 }}>
                <div style={stepKicker}>Step five of five</div>
                <h2 style={stepTitle}>Read it back</h2>
                <p style={{ ...stepIntro, maxWidth: 620 }}>Check these are right. Everything in the report follows from them, so a wrong answer here changes the verdict.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,260px),1fr))', gap: '0 40px', marginTop: 22 }}>
                  {reviewRows.map(([label, value]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 14, padding: '13px 0', borderBottom: `1px solid ${RULE_2}` }}>
                      <span style={{ ...labelCap, letterSpacing: '.12em', width: 126, flex: 'none' }}>{label}</span>
                      <span style={{ fontSize: 14.5, color: INK, fontWeight: 500, flex: 1 }}>{value}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginTop: 26 }}>
                  <button onClick={() => complete && !loading && runCheck()} disabled={!complete || loading} style={{ background: complete && !loading ? GREEN : '#b7b09c', color: PAPER_HI, border: 'none', padding: '15px 30px', fontSize: 14.5, fontWeight: 600, cursor: complete && !loading ? 'pointer' : 'not-allowed', fontFamily: SANS, boxShadow: complete && !loading ? '4px 4px 0 #c6bda6' : 'none' }}>{loading ? 'Checking…' : 'Run the eligibility check'}</button>
                  <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: INK_60 }}>
                    {complete ? (agentInfo && agentInfo.available ? 'All answers in · live legal-research agent' : 'All answers in') : 'A few answers are still missing — fill them to run the check'}
                  </span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', borderTop: '1px solid #e0d8c4', padding: '16px 26px', background: PAPER_HI }}>
              <button onClick={() => upd({ step: Math.max(0, step - 1) })} style={{ border: `1px solid ${FIELD_BORDER}`, background: CARD, padding: '11px 20px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: SANS, color: step === 0 ? '#a89f8a' : INK }}>Back</button>
              <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: INK_60 }}>Step {step + 1} of 5</div>
              <button onClick={() => (step === 4 ? (complete && !loading && runCheck()) : upd({ step: Math.min(4, step + 1) }))} disabled={step === 4 && (!complete || loading)} style={{ border: `1px solid ${INK}`, background: INK, color: PAPER_HI, padding: '11px 22px', fontSize: 13.5, fontWeight: 600, cursor: (step === 4 && (!complete || loading)) ? 'not-allowed' : 'pointer', fontFamily: SANS, opacity: (step === 4 && (!complete || loading)) ? 0.5 : 1 }}>
                {step === 4 ? (loading ? 'Checking…' : 'Run the check') : 'Continue'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* report */}
      {ran && (
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '26px 32px 0', animation: 'piqFadeUp .35s ease-out both' }}>

          <div style={{ border: `1px solid ${INK}`, background: CARD }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))' }}>
              <div style={{ padding: 30, borderRight: '1px solid #e0d8c4' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: lvl.color, padding: '7px 14px' }}>
                  <svg viewBox="0 0 14 14" width="11" height="11" aria-hidden="true">
                    <polygon points={shapePts(worst === 'critical' ? 'diamond' : worst === 'low' ? 'circle' : 'triangle', 14)} fill={PAPER_HI} />
                  </svg>
                  <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: PAPER_HI, fontWeight: 600 }}>{lvl.badge}</span>
                </div>
                <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(23px,2.8vw,32px)', lineHeight: 1.26, fontWeight: 600, margin: '18px 0 0', maxWidth: 560, textWrap: 'pretty' }}>{headline}</h2>
                <p style={{ fontSize: 15, lineHeight: 1.66, color: '#4a443b', margin: '14px 0 0', maxWidth: 560, textWrap: 'pretty' }}>
                  {flags.length
                    ? `We found ${flags.length} point${flags.length === 1 ? '' : 's'} that apply to your route. Each one below names the provision it comes from, so you can check it against the source yourself.`
                    : 'Answer the five steps and the report will list every condition that applies, with its source.'}
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 22 }}>
                  {[`${src ? src.abbr : '—'} → ${dest ? dest.abbr : '—'}`, f.txnType, f.propType, f.buyerType].map((c) => (
                    <span key={c} style={{ border: `1px solid ${RULE}`, background: PAPER_HI, padding: '5px 11px', fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: '#5e5648' }}>{c}</span>
                  ))}
                </div>
              </div>
              <div style={{ padding: 30, background: lvl.tint, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ ...labelCap, letterSpacing: '.16em', color: '#5e5648' }}>Risk level</div>
                <div style={{ display: 'flex', gap: 5, marginTop: 14 }}>
                  {[0, 1, 2, 3].map((i) => <div key={i} style={{ flex: 1, height: 9, background: i < meterOn ? lvl.color : '#e0d8c4' }} />)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((label, i) => (
                    <span key={label} style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '.1em', color: i < meterOn ? lvl.color : '#a89f8a' }}>{label}</span>
                  ))}
                </div>
                <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 700, marginTop: 22, lineHeight: 1.1 }}>{lvl.name} risk</div>
                <div style={{ fontSize: 13, lineHeight: 1.6, color: '#4a443b', marginTop: 8 }}>{lvl.note}</div>
              </div>
            </div>
          </div>

          {loading && (
            <div style={{ border: `1px solid ${GREEN}`, background: '#eef3ef', padding: '12px 16px', marginTop: 14, fontFamily: MONO, fontSize: 11, letterSpacing: '.06em', color: '#2f5d44' }}>
              Researching statutes and case law for your route…
            </div>
          )}
          {agentError && !loading && (
            <div style={{ border: '1px solid #d8bd97', background: '#f5ebdf', padding: '12px 16px', marginTop: 14, fontSize: 13.5, lineHeight: 1.55, color: '#7a4a1f' }}>
              {agentError} Showing the offline assessment instead.
            </div>
          )}

          <SectionRule title="What applies to you" note={`${flags.length} ${flags.length === 1 ? 'point' : 'points'}`} />
          <div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
            {flags.map((fl) => {
              const accent = LEVELS[fl.sev].color;
              return (
                <div key={fl.title} style={{ border: `1px solid ${RULE}`, borderLeft: `4px solid ${accent}`, background: CARD, padding: '20px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ background: accent, color: PAPER_HI, padding: '3px 9px', fontFamily: MONO, fontSize: 9, letterSpacing: '.16em' }}>{fl.sev.toUpperCase()}</span>
                    <span style={{ fontFamily: SERIF, fontSize: 17.5, fontWeight: 600 }}>{fl.title}</span>
                  </div>
                  <p style={{ fontSize: 14.5, lineHeight: 1.65, color: '#3d382f', margin: '12px 0 0', maxWidth: 820, textWrap: 'pretty' }}>{fl.body}</p>
                  <details style={{ marginTop: 14 }}>
                    <summary style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: accent }}>
                      <svg viewBox="0 0 10 10" width="8" height="8" aria-hidden="true"><polygon points="1,1 9,5 1,9" fill={accent} /></svg>
                      Where this comes from
                    </summary>
                    <div style={{ borderTop: `1px solid ${RULE_2}`, marginTop: 12, paddingTop: 12, fontSize: 13.5, lineHeight: 1.65, color: '#4a443b', maxWidth: 820 }}>
                      <span style={{ fontFamily: MONO, fontSize: 12, color: INK }}>{fl.source}</span>
                      {fl.sourceNote && <div style={{ marginTop: 7 }}>{fl.sourceNote}</div>}
                      {fl.link && /^https?:\/\//.test(fl.link) && (
                        <div style={{ marginTop: 8 }}>
                          <a href={fl.link} target="_blank" rel="noreferrer" style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.06em', color: '#8f3a24' }}>Read the source →</a>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              );
            })}
          </div>
          {!flags.length && (
            <div style={{ border: `1px solid ${RULE}`, borderLeft: '4px solid #2f5d44', background: CARD, padding: '20px 22px', marginTop: 18 }}>
              <span style={{ fontFamily: SERIF, fontSize: 17.5, fontWeight: 600 }}>Nothing in our coverage flags against this route</span>
              <p style={{ fontSize: 14.5, lineHeight: 1.65, color: '#3d382f', margin: '12px 0 0' }}>On the answers you gave, no blocking condition or caution came up. Still verify title, encumbrance and the current circle rate before you pay.</p>
            </div>
          )}
          {sources.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={{ ...labelCap, letterSpacing: '.14em' }}>Sources the agent consulted</div>
              <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                {sources.map((s, i) => (
                  <div key={i} style={{ fontSize: 13 }}>
                    <a href={s.url} target="_blank" rel="noreferrer" style={{ fontFamily: MONO, fontSize: 11.5, color: '#8f3a24' }}>{s.title || s.url}</a>
                  </div>
                ))}
              </div>
            </div>
          )}

          <SectionRule title="What it costs to close" note={`Levied by ${dest ? dest.name : 'the property state'}`} />
          <div style={{ border: `1px solid ${RULE}`, background: CARD, padding: 26, marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 34 }}>
            <div>
              <div style={{ fontFamily: SERIF, fontSize: 'clamp(30px,4vw,46px)', fontWeight: 700, lineHeight: 1 }}>{q && q.val ? inr(q.total) : '—'}</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#4a443b', marginTop: 10, maxWidth: 360 }}>{rateLine}</div>
              <div style={{ display: 'flex', height: 20, marginTop: 22, border: `1px solid ${FIELD_BORDER}`, overflow: 'hidden' }}>
                {costBars.map((b, i) => <div key={i} style={{ width: b.pct, background: b.color, transformOrigin: 'left', animation: 'piqGrowBar .6s ease-out both' }} />)}
              </div>
              <div style={{ ...labelCap, letterSpacing: '.12em', marginTop: 9 }}>{q && q.val ? `On a declared value of ${inr(q.val)}` : 'No value entered yet'}</div>
            </div>
            <div>
              {costRows.map((r) => (
                <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 0', borderBottom: `1px solid ${RULE_2}` }}>
                  <svg viewBox="0 0 10 10" width="9" height="9" style={{ flex: 'none' }} aria-hidden="true"><rect width="10" height="10" fill={r.color} /></svg>
                  <span style={{ fontSize: 14, color: '#3d382f', flex: 1 }}>{r.label}</span>
                  <span style={{ fontFamily: MONO, fontSize: 13, color: INK }}>{r.amount}</span>
                </div>
              ))}
              <p style={{ fontSize: 12.5, lineHeight: 1.6, color: INK_60, margin: '14px 0 0' }}>
                Charged on the {dest ? dest.valuation : 'circle rate'}, not necessarily on your agreed price. Verify the current rate on {dest ? dest.portal : 'the state portal'}.
              </p>
            </div>
          </div>

          <SectionRule title="The registration journey" note="Ten stages · NGDRS" />
          <div style={{ border: `1px solid ${RULE}`, background: CARD, padding: '30px 26px', marginTop: 18, position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,210px),1fr))' }}>
              {REG_STEPS.map(([title, desc], i) => (
                <div key={title} style={{ position: 'relative', padding: '0 18px 26px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <svg viewBox="0 0 26 26" width="24" height="24" style={{ flex: 'none' }} aria-hidden="true">
                      <circle cx="13" cy="13" r="12" fill={i === 0 ? (dest ? dest.tint : '#e9e6df') : CARD} stroke={dest ? dest.accent : GREEN} strokeWidth="1" />
                      <circle cx="13" cy="13" r="4" fill={dest ? dest.accent : GREEN} />
                    </svg>
                    <div style={{ flex: 1, height: 1, background: 'repeating-linear-gradient(90deg,#cfc6b0 0 3px,transparent 3px 7px)' }} />
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.14em', color: '#8f3a24', marginTop: 13 }}>{pad2(i + 1)}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.35, marginTop: 5 }}>{title}</div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, color: INK_60, marginTop: 5 }}>{desc}</div>
                </div>
              ))}
            </div>
            <p style={{ borderTop: `1px solid ${RULE_2}`, paddingTop: 16, margin: 0, fontSize: 13, lineHeight: 1.6, color: '#4a443b' }}>
              In {dest ? dest.name : 'the property state'} the record you will be checking is the <b>{dest ? dest.record : 'land record'}</b>, and the property is identified as: {dest ? `${dest.hierarchy.join(' → ').replace(/\.$/, '')}.` : ''}
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 14 }}>
              {(dest ? dest.hierarchy : []).map((label, i) => (
                <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ border: `1px solid ${dest.accent}`, color: dest.accent, padding: '4px 11px', fontFamily: MONO, fontSize: 10, letterSpacing: '.08em' }}>{label}</span>
                  {i < dest.hierarchy.length - 1 && (
                    <svg viewBox="0 0 14 8" width="13" height="8" aria-hidden="true"><path d="M0 4 H 10 M 7 1 L 10 4 L 7 7" fill="none" stroke="#b9ae94" strokeWidth="1" /></svg>
                  )}
                </span>
              ))}
            </div>
          </div>

          <SectionRule title="What to carry" note={`${docList.length} documents`} />
          <div style={{ border: `1px solid ${RULE}`, background: CARD, padding: 26, marginTop: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: '0 40px' }}>
              {docList.map((text, i) => {
                const on = !!ticked[i];
                const accent = dest ? dest.accent : GREEN;
                return (
                  <label
                    key={text}
                    onClick={() => setTicked((t) => ({ ...t, [i]: !t[i] }))}
                    style={{ display: 'grid', gridTemplateColumns: '26px minmax(0,1fr)', gap: 13, padding: '12px 0', borderBottom: `1px solid ${RULE_2}`, alignItems: 'start', cursor: 'pointer' }}
                  >
                    <svg viewBox="0 0 22 22" width="20" height="20" style={{ marginTop: 2 }} aria-hidden="true">
                      <circle cx="11" cy="11" r="9.5" fill="none" stroke={on ? accent : FIELD_BORDER} strokeWidth="1" strokeDasharray={on ? '0' : '3 3'} />
                      {on && <>
                        <circle cx="11" cy="11" r="6.5" fill={accent} />
                        <path d="M7.6 11.2 L 10.2 13.6 L 14.6 8.4" fill="none" stroke={CARD} strokeWidth="1.6" strokeLinecap="round" />
                      </>}
                    </svg>
                    <span style={{ fontSize: 14, lineHeight: 1.55, color: on ? INK_60 : INK, textDecoration: on ? 'line-through' : 'none' }}>{text}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div style={{ border: '1px solid #8f3a24', background: '#f7f0e9', padding: '24px 26px', marginTop: 44, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 26 }}>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: '#8f3a24' }}>Before you act on this</div>
              <p style={{ fontSize: 14.5, lineHeight: 1.65, color: '#3d382f', margin: '11px 0 0' }}>
                This is legal information, not legal advice. Have a registered advocate review anything you are about to sign, or visit your nearest District Legal Services Authority, where the review is free.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <button onClick={() => upd({ ran: false, step: 0 })} style={{ border: `1px solid ${INK}`, background: CARD, padding: '12px 20px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: SANS, color: INK }}>Change my answers</button>
              <button onClick={() => { setF(EMPTY); setTicked({}); }} style={{ background: 'none', border: '1px solid #d6cdb8', padding: '12px 16px', fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: INK_60, cursor: 'pointer' }}>Start over</button>
            </div>
          </div>
        </section>
      )}

      {/* coverage strip + footer */}
      <div style={{ marginTop: 60, borderTop: `1px solid ${INK}`, background: '#ece7d9' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '11px 32px', display: 'flex', gap: 20, flexWrap: 'wrap', fontFamily: MONO, fontSize: 10.5, letterSpacing: '.06em', color: INK_60 }}>
          <span>COVERAGE — HIMACHAL PRADESH · MAHARASHTRA · KARNATAKA · PUNJAB</span>
          <span style={{ color: '#8f3a24' }}>LEGAL INFORMATION, NOT LEGAL ADVICE</span>
        </div>
      </div>

      <footer style={{ background: '#ece7d9', borderTop: `1px solid ${RULE}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '22px 32px 40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,280px),1fr))', gap: 20 }}>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: '#5e5648', maxWidth: 520 }}>
            Rates and restrictions change. Verify anything material against the state&rsquo;s own portal before you rely on it.
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '.06em', color: '#8c8471', display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-start' }}>
            <span>PROPERTYIQ</span>
            <span>KNOW BEFORE YOU BUY</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
