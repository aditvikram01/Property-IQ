// PropertyIQ — Decode Contract (redline + explain).
// Wired as the `contract` tab in src/App.jsx: {tab === 'contract' && <DecodeContract onNavigate={setTab} />}
//
// The redline FINDINGS come from the AI/RAG decode endpoint (POST /api/decode,
// op:"risk" → lib/decodeAgent.runDecode), which holds the Gemini key server-side
// (GEMINI_API_KEYS / GEMINI_API_KEY / legal). The browser sends only the contract
// text; no key is entered by, or exposed to, the user. Each finding's verbatim
// `clauseQuote` is located in the pasted text via indexOf to place the marks.
// State/type detection and the "what's missing" (MANDATORY) checklist remain
// deterministic and local. Self-contained styling: fonts + keyframes injected by
// the component, inline styles only.

import { useState, useRef, useCallback } from 'react';

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
@keyframes piqFadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
.piq-dc a { color:#8f3a24; text-decoration:none; border-bottom:1px solid rgba(143,58,36,.35); }
.piq-dc a:hover { color:${INK}; border-bottom-color:${INK}; }
.piq-dc textarea:focus, .piq-dc select:focus { outline:2px solid ${GREEN}; outline-offset:-2px; }
.piq-dc details > summary { list-style:none; cursor:pointer; }
.piq-dc details > summary::-webkit-details-marker { display:none; }
.piq-pane::-webkit-scrollbar { width:10px; }
.piq-pane::-webkit-scrollbar-track { background:#efe9db; }
.piq-pane::-webkit-scrollbar-thumb { background:${FIELD_BORDER}; }`;

/* ------------------------------------------------------------------ data */

const LANGS = [
  { key: 'en', native: 'English', abbr: 'EN', font: SANS },
  { key: 'hi', native: 'हिन्दी', abbr: 'HI', font: DEV },
  { key: 'mr', native: 'मराठी', abbr: 'MR', font: DEV },
  { key: 'pa', native: 'ਪੰਜਾਬੀ', abbr: 'PA', font: GUR },
  { key: 'kn', native: 'ಕನ್ನಡ', abbr: 'KN', font: KAN },
];

const T = {
  en: { summary: '', redline: '', missing: '', explain: '', risks: '' },
  hi: { summary: 'सारांश', redline: 'खंडवार जाँच', missing: 'अनुपस्थित शर्तें', explain: 'समझाएँ', risks: 'जोखिम' },
  mr: { summary: 'सारांश', redline: 'कलमनिहाय तपासणी', missing: 'गहाळ कलमे', explain: 'समजावून सांगा', risks: 'धोके' },
  pa: { summary: 'ਸਾਰ', redline: 'ਧਾਰਾ-ਵਾਰ ਜਾਂਚ', missing: 'ਗੈਰਹਾਜ਼ਰ ਧਾਰਾਵਾਂ', explain: 'ਸਮਝਾਓ', risks: 'ਜੋਖਮ' },
  kn: { summary: 'ಸಾರಾಂಶ', redline: 'ಕಲಂವಾರು ಪರಿಶೀಲನೆ', missing: 'ಕಾಣೆಯಾದ ಕಲಂಗಳು', explain: 'ವಿವರಿಸಿ', risks: 'ಅಪಾಯಗಳು' },
};

const STATE_META = {
  'Himachal Pradesh': { accent: '#2f5d44', shape: 'triangle' },
  Maharashtra: { accent: '#33302b', shape: 'diamond' },
  Karnataka: { accent: '#8f3a24', shape: 'square' },
  Punjab: { accent: '#9a7b2a', shape: 'circle' },
};

const SEV = {
  high: { color: '#8f2d1c', tint: '#f7ece8', label: 'High' },
  medium: { color: '#a8622a', tint: '#f8f0e6', label: 'Medium' },
  low: { color: '#2f5d44', tint: '#eef3ef', label: 'Low' },
};
const SEV_ORDER = { high: 0, medium: 1, low: 2 };

// The AI decode endpoint returns no per-finding glyph; map severity → the shape
// vocabulary the redline UI already uses.
const GLYPH_BY_SEV = { high: 'triangle', medium: 'diamond', low: 'circle' };
// DecodeContract's language keys → the canonical labels the decode backend
// (src/lib/understand.js OUTPUT_LANGUAGES / scriptFor) expects.
const LANG_NAME = { en: 'English', hi: 'Hindi', mr: 'Marathi', pa: 'Punjabi', kn: 'Kannada' };

const STATE_PATTERNS = [
  { label: 'Himachal Pradesh', re: /himachal|shimla|mashobra|kasauli|\bh\.?p\.?\b/i },
  { label: 'Maharashtra', re: /maharashtra|mumbai|pune|nagpur|thane|nashik|kothrud|leave\s*(and|&)\s*licen[cs]e/i },
  { label: 'Karnataka', re: /karnataka|bangalore|bengaluru|mysore|mysuru|sarjapur|hubli/i },
  { label: 'Punjab', re: /punjab|ludhiana|amritsar|jalandhar|patiala|mohali/i },
];

const TYPE_PATTERNS = [
  { type: 'Leave & License', cat: 'rent_agreement', re: /leave\s*(and|&)\s*licen[cs]e|licensor|licensee/i },
  { type: 'Rent agreement', cat: 'rent_agreement', re: /rent(al)? agreement|tenant|tenancy|monthly rent/i },
  { type: 'Lease deed', cat: 'rent_agreement', re: /lease (deed|agreement)|lessor|lessee/i },
  { type: 'Sale deed', cat: 'sale_deed', re: /sale deed|conveyance|vendor|purchaser|consideration of (rs|₹)/i },
  { type: 'Gift deed', cat: 'sale_deed', re: /gift deed|donor|donee/i },
];


const MANDATORY = {
  sale_deed: [
    { key: 'consideration', re: /in consideration of|consideration of (rs|₹)|receipt whereof/i, title: 'Consideration and receipt', why: 'The price, the mode of payment and an acknowledgement of receipt should all appear. A bare receipt line invites an undervaluation challenge.', source: 'Transfer of Property Act 1882, s.54' },
    { key: 'encumbrance', re: /free from all encumbrances|encumbrance/i, title: 'Encumbrance warranty', why: 'Without it you have no contractual comeback if an undisclosed mortgage or attachment surfaces after registration.', source: 'Transfer of Property Act 1882, ss.55(1)(a), 55(2)' },
    { key: 'registration', re: /present(ed)? for registration|sub-registrar|within four months/i, title: 'Registration obligation', why: 'Registration is compulsory and there is a four-month outer limit from execution, extendable by four more on a fine of up to ten times the fee.', source: 'Registration Act 1908, ss.17(1)(b), 23 and 25' },
    { key: 'indemnity', re: /indemnif/i, title: 'Indemnity from the seller', why: 'An express indemnity makes recovery realistic if the title turns out to be defective.', source: 'Transfer of Property Act 1882, s.55(2); Indian Contract Act 1872, s.124' },
    { key: 'taxes', re: /taxes|rates and other outgoings|tax receipt/i, title: 'Taxes and outgoings cleared', why: 'Arrears follow the property. The seller should declare that rates and local body dues are paid to the date of execution.', source: 'Transfer of Property Act 1882, s.55(1)(g)' },
    { key: 'schedule', re: /schedule|khasra|survey no|boundaries/i, title: 'Schedule of the property', why: 'The property must be identified precisely — survey or khasra number and boundaries — or the deed is hard to enforce and harder to mutate.', source: 'Registration Act 1908, s.21' },
  ],
  rent_agreement: [
    { key: 'term', re: /period of|commencing|term of this/i, title: 'Term with start and end dates', why: 'The duration decides whether registration is compulsory, so it has to be unambiguous.', source: 'Transfer of Property Act 1882, ss.105 and 107' },
    { key: 'registration', re: /registration|registered/i, title: 'Registration obligation', why: 'In Maharashtra registration is mandatory whatever the term; elsewhere it is mandatory above twelve months. Say who does it and who pays.', source: 'Registration Act 1908, s.17(1)(d); Maharashtra Rent Control Act 1999, s.55' },
    { key: 'deposit', re: /security deposit|deposit of rs/i, title: 'Deposit with a refund window', why: 'The amount alone is not enough — the refund period and the permitted deductions are what get disputed.', source: 'Maharashtra Rent Control Act 1999, s.8; Karnataka Rent Act 1999, s.7' },
    { key: 'notice', re: /notice|terminat/i, title: 'Notice and termination on both sides', why: 'Each party should have an equal notice right, and eviction must still follow the grounds in the state rent act.', source: 'Transfer of Property Act 1882, s.106; the applicable State rent act' },
    { key: 'maintenance', re: /maintenance|society charges|repairs/i, title: 'Who pays maintenance and repairs', why: 'Unallocated society charges and repair costs are the most common small dispute at the end of a tenancy.', source: 'Transfer of Property Act 1882, s.108' },
    { key: 'police', re: /police verification|police station/i, title: 'Police intimation (Maharashtra)', why: 'In Maharashtra the landlord must report the tenant\u2019s particulars to the local police station, separately from registering the agreement.', source: 'Maharashtra Police Act 1951, s.36' },
  ],
};

// Fictional samples, from src/data/constants.js — each trips specific rules.
const SAMPLES = [
  {
    key: 'mh', label: 'Maharashtra Leave & License (Pune)', meta: 'One-sided termination · unregistered', accent: '#33302b', shape: 'diamond',
    text: `LEAVE AND LICENSE AGREEMENT
This Leave and License Agreement is made at Pune, Maharashtra on 1st June 2026 between:
LICENSOR: Mr. Anil Deshmukh, resident of Kothrud, Pune, Maharashtra.
LICENSEE: Mr. Rohan Gupta, resident of Indore, Madhya Pradesh.

1. The Licensor grants leave and license to occupy Flat No. 7, 2nd Floor, Kothrud, Pune - 411038 for a period of 11 (eleven) months commencing 1st June 2026.
2. The monthly license fee shall be Rs. 30,000/-, payable on or before the 5th of each month, with an escalation of 10% on renewal.
3. The Licensee shall pay an interest-free refundable security deposit of Rs. 1,80,000/- (equal to six months' license fee), refundable at the time of vacating.
4. The Licensor may terminate this agreement and require the Licensee to vacate at any time by giving 15 days' written notice, without assigning any reason. The Licensee shall have no corresponding right to terminate during the term.
5. The Licensee shall not sublet or part with possession of the premises.
6. All maintenance and society charges shall be borne by the Licensee.
7. Stamp duty of Rs. 500/- has been paid on this agreement.`,
  },
  {
    key: 'hp', label: 'HP agricultural sale deed (Shimla)', meta: 'Sold through a GPA · no s.118', accent: '#2f5d44', shape: 'triangle',
    text: `SALE DEED (AGRICULTURAL LAND)
This Sale Deed is executed on 20th May 2026 at Shimla, Himachal Pradesh between:
SELLER: Shri Ram Lal, S/o Shri Hari Ram, resident of Village Mashobra, Tehsil & District Shimla, Himachal Pradesh ("the Seller").
PURCHASER: Shri Gurpreet Singh, S/o Shri Baldev Singh, resident of Ludhiana, Punjab, occupation Software Engineer ("the Purchaser").

WHEREAS the Seller is the owner of agricultural land measuring 5 Bigha at Village Mashobra, Tehsil Shimla, bearing Khasra No. 234/1 and 234/2.

1. The Seller hereby sells the said agricultural land to the Purchaser for a total consideration of Rs. 75,00,000/- (Seventy-Five Lakhs only), the receipt whereof the Seller acknowledges.
2. This sale is executed and completed through a General Power of Attorney dated 10th May 2026 granted by the Seller in favour of the Purchaser's brother, who shall hold and convey the property.
3. The Seller has delivered vacant and peaceful possession of the land to the Purchaser on the spot.
4. Stamp duty of 5% shall be borne by the Purchaser.
5. The property is sold free from all encumbrances.`,
  },
  {
    key: 'ka', label: 'Karnataka residential rent (Bengaluru)', meta: 'Ten-month deposit · false rebate', accent: '#8f3a24', shape: 'square',
    text: `RENTAL AGREEMENT
This Rental Agreement is made at Bengaluru, Karnataka on 1st June 2026 between:
LANDLORD: Mr. Suresh Rao, owner of the premises.
TENANT: Ms. Kavya Nair, resident of Kochi, Kerala.

1. The Landlord lets out Flat No. 402, Sobha Apartments, Sarjapur Road, Bengaluru - 560035 for a period of 11 months from 1st June 2026.
2. The monthly rent shall be Rs. 40,000/-, payable by the 5th of each month, with 5% annual escalation.
3. The Tenant shall pay an interest-free refundable security deposit of Rs. 4,00,000/- (equal to ten months' rent), refundable within 30 days of vacating.
4. As the Tenant is a woman, a concessional female-buyer stamp duty rebate shall apply to this agreement.
5. The stamp duty shall be paid by e-Stamp procured through Kaveri Online Services / SHCIL.
6. Either party may terminate on one month's written notice. The Tenant shall not sublet the premises.`,
  },
  {
    key: 'pb', label: 'Punjab rent agreement (Ludhiana)', meta: 'Cites the 1995 Act · 24-month term', accent: '#9a7b2a', shape: 'circle',
    text: `RENT AGREEMENT
This Rent Agreement is made at Ludhiana, Punjab on 1st June 2026 between:
LANDLORD: Mr. Harjeet Singh, owner of the premises.
TENANT: Mr. Mohan Verma.

1. The Landlord lets out House No. 55, Model Town, Ludhiana - 141002 for a period of 24 (twenty-four) months from 1st June 2026.
2. The monthly rent shall be Rs. 18,000/-, payable by the 7th of each month.
3. The Tenant shall pay a refundable security deposit of Rs. 36,000/- (two months' rent).
4. This Agreement and the tenancy hereby created shall be governed by the provisions of the Punjab Rent Act, 1995.
5. The Landlord may evict the Tenant in accordance with the said Act.
6. This agreement is executed on plain stamp paper and need not be registered.`,
  },
];

const NAV = [
  { key: 'home', label: 'Home' },
  { key: 'eligibility', label: 'Eligibility Check' },
  { key: 'contract', label: 'Decode Contract' },
  { key: 'costs', label: 'Compare Costs' },
  { key: 'toolkit', label: 'Toolkit' },
];

/* ----------------------------------------------------------------- utils */

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

function detect(text) {
  const t = text || '';
  const s = STATE_PATTERNS.find((p) => p.re.test(t));
  const d = TYPE_PATTERNS.find((p) => p.re.test(t));
  return { state: s ? s.label : null, type: d ? d.type : null, cat: d ? d.cat : null };
}


const money = (t) => { const m = (t || '').match(/rs\.?\s*([\d,]{3,})/i); return m ? `₹${m[1]}` : null; };
const monthsOf = (t) => { const m = (t || '').match(/period of (\d+)|(\d+)\s*\(?[a-z-]*\)?\s*months/i); return m ? (m[1] || m[2]) : null; };

const labelCap = { fontFamily: MONO, fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: INK_60 };

/* ------------------------------------------------------------- component */

export default function DecodeContract({ onNavigate }) {
  const [text, setText] = useState('');
  const [lang, setLang] = useState('en');
  const [mode, setMode] = useState('risk');
  const [ran, setRan] = useState(false);
  const [active, setActive] = useState(null);
  const [fileNote, setFileNote] = useState('');
  const [findings, setFindings] = useState([]);   // AI-derived — populated by runAnalysis() below
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const paneRef = useRef(null);

  const go = useCallback((key) => { if (typeof onNavigate === 'function') onNavigate(key); }, [onNavigate]);

  const langMeta = LANGS.find((l) => l.key === lang) || LANGS[0];
  const t = T[lang] || T.en;
  // State/type detection stays deterministic and local; the redline findings now
  // come from the AI decode endpoint (POST /api/decode, op:"risk") — see runAnalysis.
  const det = detect(text);
  const meta = det.state ? STATE_META[det.state] : null;
  const accent = meta ? meta.accent : '#5e5648';
  const isRent = det.cat === 'rent_agreement';
  const len = text.length || 1;

  const scrollTo = (id) => {
    const pane = paneRef.current;
    if (!pane) return;
    const el = pane.querySelector(`[data-mid="${id}"]`);
    if (el) pane.scrollTop = Math.max(0, el.offsetTop - pane.offsetTop - 80);
  };

  // Analysis runs on the backend (POST /api/decode), which holds the Gemini key in
  // a server env var (GEMINI_API_KEYS / GEMINI_API_KEY / legal) — the browser sends
  // only the contract text, so no key is ever entered by, or exposed to, the user.
  // The AI returns RISK_SCHEMA findings; each verbatim `clauseQuote` is located in
  // the pasted text via indexOf so the document-map marks land on the real clause.
  const runAnalysis = useCallback(async (raw) => {
    const src = typeof raw === 'string' ? raw : text;
    setActive(null); setError('');
    if (src.trim().length < 30) {
      setFindings([]); setRan(false);
      setError('Add a contract first — paste at least a clause of text (30+ characters).');
      return;
    }
    setLoading(true);
    try {
      let r;
      try {
        r = await fetch('/api/decode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: src, language: LANG_NAME[lang] || 'English', op: 'risk' }),
        });
      } catch {
        throw new Error('Could not reach the AI service. In local dev, start it with `npm run server`.');
      }
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data.error) throw new Error(data.error || `AI service error ${r.status}`);
      const rawFindings = (data.risk && Array.isArray(data.risk.findings)) ? data.risk.findings : [];
      const mapped = rawFindings.map((f, i) => {
        const quote = String((f && f.clauseQuote) || '').trim();
        const sev = ['high', 'medium', 'low'].includes(f && f.severity) ? f.severity : 'medium';
        const idx = quote ? src.indexOf(quote) : -1;   // -1 → listed but not highlighted
        return {
          id: `f${i}`,
          sev,
          favours: 'neutral',                          // API gives no side; keeps the balance beam level
          glyph: GLYPH_BY_SEV[sev],
          clauseRef: String((f && f.clauseRef) || '').slice(0, 120) || `Finding ${i + 1}`,
          title: String((f && f.risk) || 'Risk'),
          body: String((f && f.why) || ''),
          quote: (quote || String((f && f.clauseRef) || '')).slice(0, 190),
          source: f && f.legalBasis ? String(f.legalBasis) : 'Grounded in the clause library.',
          sourceNote: String((f && f.suggestion) || ''),
          fix: String((f && f.improvedClause) || ''),  // '' hides the "safer wording" details block
          start: idx,
          end: idx === -1 ? -1 : idx + quote.length,
        };
      });
      mapped.sort((a, b) => SEV_ORDER[a.sev] - SEV_ORDER[b.sev] || (a.start - b.start));
      setFindings(mapped);
      setRan(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setFindings([]); setRan(false);
    } finally {
      setLoading(false);
    }
  }, [text, lang]);

  const loadSample = (s) => { setText(s.text); setFileNote(''); runAnalysis(s.text); };

  const onFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (/\.pdf$/i.test(file.name)) {
      setFileNote(`${file.name} — PDF text extraction runs through the app's PDF parser. Paste the text here for now.`);
      return;
    }
    const r = new FileReader();
    r.onload = () => { const v = String(r.result || ''); setText(v); setFileNote(''); runAnalysis(v); };
    r.readAsText(file);
  };

  // Non-overlapping marks, in document order. Only findings whose verbatim quote
  // was located in the text (start >= 0) get a mark/highlight; unlocated ones still
  // appear in the findings list, just without a document-map position.
  const kept = [];
  findings.filter((m) => m.start >= 0 && m.end <= text.length).sort((a, b) => a.start - b.start).forEach((m) => {
    if (!kept.length || m.start >= kept[kept.length - 1].end) kept.push(m);
  });

  const segments = [];
  let cursor = 0;
  kept.forEach((m) => {
    if (m.start > cursor) segments.push({ text: text.slice(cursor, m.start), mid: '' });
    segments.push({ text: text.slice(m.start, m.end), mid: m.id, sev: m.sev });
    cursor = m.end;
  });
  if (cursor < text.length) segments.push({ text: text.slice(cursor), mid: '' });

  const counts = { high: 0, medium: 0, low: 0 };
  findings.forEach((f) => { counts[f.sev]++; });

  let tilt = 0;
  findings.forEach((f) => {
    const w = f.sev === 'high' ? 3 : f.sev === 'medium' ? 2 : 1;
    if (f.favours === 'landlord' || f.favours === 'seller') tilt += w;
    else if (f.favours === 'tenant' || f.favours === 'buyer') tilt -= w;
  });
  const angle = Math.max(-13, Math.min(13, tilt * 1.7));
  const leftRole = isRent ? 'TENANT' : 'BUYER';
  const rightRole = isRent ? 'LANDLORD' : 'SELLER';
  const beamNote = !ran ? 'Run the analysis to see the balance.'
    : tilt > 2 ? `The terms lean towards the ${rightRole.toLowerCase()}. The findings marked high are where to push back.`
    : tilt < -2 ? `The terms lean towards the ${leftRole.toLowerCase()}.`
    : 'The terms sit roughly level between the two sides on what we checked.';

  const mand = MANDATORY[det.cat || 'sale_deed'] || [];
  const missing = mand.filter((m) => !m.re.test(text));

  const amount = money(text);
  const term = monthsOf(text);
  const deposit = (text.match(/deposit of rs\.?\s*([\d,]+)/i) || [])[1];
  const notice = (text.match(/(\d+)\s*days'? (written )?notice/i) || [])[1];

  const keyTerms = [
    { label: isRent ? 'Monthly rent' : 'Consideration', value: amount || '—', note: isRent ? 'As stated in the agreement.' : 'Duty is charged on the circle or ready-reckoner rate, which may be higher.', accent: GREEN, shape: 'square' },
    { label: 'Term', value: term ? `${term} months` : '—', note: term && Number(term) > 11 ? 'Above twelve months — registration is compulsory.' : 'Eleven months or less avoids compulsory registration outside Maharashtra.', accent: '#8f3a24', shape: 'circle' },
    { label: 'Deposit', value: deposit ? `₹${deposit}` : '—', note: deposit ? 'Check the refund window and the deductions allowed.' : 'No deposit figure found.', accent: '#9a7b2a', shape: 'diamond' },
    { label: 'Notice', value: notice ? `${notice} days` : '—', note: notice ? 'Confirm both sides have the same right.' : 'No notice period found.', accent: '#2f5d44', shape: 'triangle' },
  ];

  const sides = isRent ? [
    { role: 'Occupier', name: 'The tenant or licensee', accent: '#2f5d44', shape: 'triangle', duties: ['Pay rent by the stated day each month, and the deposit up front.', 'Keep the premises to the permitted use, and not sublet without consent.', 'Bear whatever maintenance the agreement assigns to you — check clause by clause.'] },
    { role: 'Owner', name: 'The landlord or licensor', accent: '#33302b', shape: 'diamond', duties: ['Give quiet possession for the term, and refund the deposit on vacating.', 'Register the agreement where the state requires it — in Maharashtra, always.', 'Evict only on the grounds the state rent act allows.'] },
  ] : [
    { role: 'Buyer', name: 'The purchaser', accent: '#2f5d44', shape: 'triangle', duties: ['Pay the consideration in the manner recorded, and the duty and fee.', 'Present the deed for registration within four months of execution.', 'Verify the record and the encumbrance certificate before paying.'] },
    { role: 'Seller', name: 'The vendor', accent: '#33302b', shape: 'diamond', duties: ['Disclose material defects in title, and deliver vacant possession.', 'Clear taxes and outgoings to the date of execution.', 'Indemnify the buyer against a defect in the title conveyed.'] },
  ];

  const watchOut = findings.filter((f) => f.sev !== 'low').slice(0, 4);

  const showRisk = ran && mode === 'risk' && !!text;
  const showExplain = ran && mode === 'explain' && !!text;

  const summaryHead = findings.length
    ? (counts.high
      ? `There ${counts.high === 1 ? 'is one clause' : `are ${counts.high} clauses`} here you should not sign as drafted.`
      : 'Nothing here blocks you, but some terms are worth correcting before signing.')
    : 'Nothing in our clause library matched this text.';
  const summaryBody = findings.length
    ? `We matched ${findings.length} clause${findings.length === 1 ? '' : 's'} against the library, and ${missing.length} mandatory clause${missing.length === 1 ? ' appears to be' : 's appear to be'} missing. Every finding names the provision behind it.`
    : 'That means none of the patterns we check for appeared — not that the document is safe.';

  const onMapClick = (e) => {
    const track = e.currentTarget, pane = paneRef.current;
    if (!track || !pane) return;
    const r = track.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - r.left) / (r.width || 1)));
    pane.scrollTop = frac * Math.max(0, pane.scrollHeight - pane.clientHeight);
  };

  return (
    <div className="piq-dc" style={{ fontFamily: SANS, background: PAPER, color: INK, minHeight: '100vh', overflowX: 'hidden' }}>
      <style>{STYLE_CSS}</style>

      {/* header */}
      <header style={{ borderBottom: `1px solid ${INK}`, background: CARD }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
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
            {NAV.map((n) => {
              const on = n.key === 'contract';
              return (
                <button key={n.key} onClick={() => go(n.key)} style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.06em', padding: '10px 14px', border: 'none', borderBottomWidth: 2, borderBottomStyle: 'solid', borderBottomColor: on ? GREEN : 'transparent', background: 'none', cursor: 'pointer', color: on ? GREEN : INK_60, fontWeight: on ? 600 : 400 }}>{n.label}</button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* intro */}
      <section style={{ position: 'relative', borderBottom: `1px solid ${INK}`, background: PAPER_HI, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(#cfc6b0 1px,transparent 1px)', backgroundSize: '22px 22px', opacity: 0.45, pointerEvents: 'none' }} />
        <svg viewBox="0 0 300 300" style={{ position: 'absolute', right: -60, top: -90, width: 320, height: 320, opacity: 0.4, pointerEvents: 'none' }} aria-hidden="true">
          <g fill="none" stroke={GREEN} strokeWidth="0.7">
            <circle cx="150" cy="150" r="58" /><circle cx="150" cy="150" r="92" />
            <circle cx="150" cy="150" r="126" /><circle cx="150" cy="150" r="160" />
          </g>
        </svg>
        <div style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', padding: '44px 32px 36px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,380px),1fr))', gap: 36, alignItems: 'end' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', background: GREEN, padding: '6px 13px', whiteSpace: 'nowrap', maxWidth: '100%' }}>
              <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: '#e8e2d2', fontWeight: 500 }}>Decode contract</span>
            </div>
            <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(32px,4.4vw,50px)', lineHeight: 1.02, fontWeight: 700, letterSpacing: '-1.2px', margin: '18px 0 0', textWrap: 'pretty' }}>
              Read what the contract<br />actually does to you.
            </h1>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: '#3d382f', margin: '18px 0 0', maxWidth: 530, textWrap: 'pretty' }}>
              Paste a deed or rent agreement. We mark the clauses that are one-sided, the mandatory ones that are missing, and the ones resting on law that is not in force — each against the provision it comes from.
            </p>
          </div>
          <div>
            <div style={{ ...labelCap, letterSpacing: '.16em' }}>Explain it in</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 11 }}>
              {LANGS.map((l) => {
                const on = lang === l.key;
                return (
                  <button key={l.key} onClick={() => setLang(l.key)} style={{ border: `1px solid ${on ? GREEN : FIELD_BORDER}`, background: on ? GREEN : CARD, color: on ? PAPER_HI : INK, padding: '9px 14px', cursor: 'pointer', fontFamily: l.font, fontSize: 13.5, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: l.font }}>{l.native}</span>
                    <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', opacity: 0.7 }}>{l.abbr}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* input */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '30px 32px 0' }}>
        <div style={{ border: `1px solid ${INK}`, background: CARD }}>
          <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #e0d8c4', flexWrap: 'wrap' }}>
            {[{ key: 'risk', label: 'Find the risks', native: t.risks, shape: 'diamond' }, { key: 'explain', label: 'Explain it to me', native: t.explain, shape: 'circle' }].map((m) => {
              const on = mode === m.key;
              return (
                <button key={m.key} onClick={() => setMode(m.key)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '15px 22px', background: on ? CARD : 'transparent', border: 'none', borderRight: '1px solid #e0d8c4', borderBottom: `2px solid ${on ? GREEN : 'transparent'}`, cursor: 'pointer', fontFamily: SANS }}>
                  <svg viewBox="0 0 18 18" width="15" height="15" aria-hidden="true"><polygon points={shapePts(m.shape, 18)} fill={on ? GREEN : '#b3aa94'} /></svg>
                  <span style={{ fontSize: 14, fontWeight: 600, color: on ? INK : INK_60 }}>{m.label}</span>
                  {m.native && <span style={{ fontFamily: langMeta.font, fontSize: 12, color: '#a09781' }}>{m.native}</span>}
                </button>
              );
            })}
            <div style={{ flex: 1, minWidth: 10 }} />
            <div style={{ padding: '0 20px', fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: INK_60 }}>
              {text ? `${text.length.toLocaleString('en-IN')} characters` : 'No text yet'}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))' }}>
            <div style={{ padding: '24px 26px', borderRight: '1px solid #e0d8c4' }}>
              <div style={labelCap}>Paste the contract text</div>
              <textarea
                value={text}
                onChange={(e) => { setText(e.target.value); setRan(false); setActive(null); }}
                placeholder="Paste a sale deed, rent agreement or leave & license here…"
                style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 10, minHeight: 190, padding: 14, border: `1px solid ${FIELD_BORDER}`, background: PAPER_HI, fontFamily: MONO, fontSize: 12.5, lineHeight: 1.7, color: INK, borderRadius: 0, resize: 'vertical' }}
              />
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginTop: 16 }}>
                <button onClick={() => runAnalysis()} disabled={loading} style={{ background: GREEN, color: PAPER_HI, border: 'none', padding: '14px 26px', fontSize: 14, fontWeight: 600, cursor: loading ? 'wait' : 'pointer', fontFamily: SANS, boxShadow: '4px 4px 0 #c6bda6', opacity: loading ? 0.75 : 1 }}>
                  {loading ? 'Analysing…' : (mode === 'explain' ? 'Explain this contract' : 'Find the risks')}
                </button>
                <label style={{ border: `1px solid ${INK}`, background: CARD, padding: '13px 18px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 9 }}>
                  <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M8 1 V 11 M 4 7 L 8 11 L 12 7 M 2 14 H 14" fill="none" stroke={INK} strokeWidth="1.4" /></svg>
                  Upload a file
                  <input type="file" accept=".txt,.md,.pdf" onChange={onFile} style={{ display: 'none' }} />
                </label>
                <button onClick={() => { setText(''); setRan(false); setActive(null); setFileNote(''); setFindings([]); setError(''); }} style={{ background: 'none', border: '1px solid #d6cdb8', padding: '13px 15px', fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: INK_60, cursor: 'pointer' }}>Clear</button>
              </div>
              {fileNote && <p style={{ fontSize: 12.5, lineHeight: 1.55, color: '#8f3a24', margin: '12px 0 0' }}>{fileNote}</p>}
              {error && <p style={{ fontSize: 12.5, lineHeight: 1.55, color: '#8f2d1c', background: '#f7ece8', border: '1px solid #e3c9c0', padding: '10px 13px', margin: '12px 0 0' }}>{error}</p>}
            </div>

            <div style={{ padding: '24px 26px', background: PAPER_HI }}>
              <div style={labelCap}>Or start from a sample</div>
              <div style={{ display: 'grid', gap: 9, marginTop: 12 }}>
                {SAMPLES.map((s) => (
                  <button key={s.key} onClick={() => loadSample(s)} style={{ display: 'flex', alignItems: 'center', gap: 13, textAlign: 'left', border: `1px solid ${RULE}`, background: CARD, padding: '12px 14px', cursor: 'pointer', fontFamily: SANS }}>
                    <svg viewBox="0 0 20 20" width="17" height="17" style={{ flex: 'none' }} aria-hidden="true"><polygon points={shapePts(s.shape, 20)} fill={s.accent} /></svg>
                    <span style={{ flex: 1 }}>
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: INK }}>{s.label}</span>
                      <span style={{ display: 'block', fontFamily: MONO, fontSize: 9.5, letterSpacing: '.1em', textTransform: 'uppercase', color: '#8c8471', marginTop: 3 }}>{s.meta}</span>
                    </span>
                  </button>
                ))}
              </div>
              <div style={{ borderTop: '1px solid #e0d8c4', marginTop: 16, paddingTop: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={labelCap}>Detected</span>
                <span style={{ border: `1px solid ${accent}`, color: accent, padding: '4px 10px', fontFamily: MONO, fontSize: 10, letterSpacing: '.08em' }}>{det.state || 'State not detected'}</span>
                <span style={{ border: `1px solid ${FIELD_BORDER}`, color: '#5e5648', padding: '4px 10px', fontFamily: MONO, fontSize: 10, letterSpacing: '.08em' }}>{det.type || 'Type not detected'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* risk view */}
      {showRisk && (
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '34px 32px 0', animation: 'piqFadeUp .35s ease-out both' }}>

          <div style={{ border: `1px solid ${INK}`, background: CARD, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,280px),1fr))' }}>
            <div style={{ padding: '28px 26px', borderRight: '1px solid #e0d8c4' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <svg viewBox="0 0 22 22" width="20" height="20" aria-hidden="true"><polygon points={shapePts(meta ? meta.shape : 'circle', 22)} fill={accent} /></svg>
                <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: '#5e5648' }}>
                  {`${det.type || 'Document'} · ${det.state || 'state not detected'}`}
                </span>
              </div>
              <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(21px,2.6vw,29px)', lineHeight: 1.3, fontWeight: 600, margin: '16px 0 0', textWrap: 'pretty' }}>{summaryHead}</h2>
              <p style={{ fontSize: 14.5, lineHeight: 1.65, color: '#4a443b', margin: '12px 0 0', textWrap: 'pretty' }}>{summaryBody}</p>
            </div>

            <div style={{ padding: '28px 26px', borderRight: '1px solid #e0d8c4', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontFamily: SERIF, fontSize: 40, fontWeight: 700, lineHeight: 1 }}>{findings.length}</span>
                <span style={{ ...labelCap, letterSpacing: '.16em' }}>Findings</span>
              </div>
              <div style={{ display: 'grid', marginTop: 18 }}>
                {['high', 'medium', 'low'].map((k) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 0', borderTop: `1px solid ${RULE_2}` }}>
                    <svg viewBox="0 0 10 10" width="9" height="9" style={{ flex: 'none' }} aria-hidden="true"><rect width="10" height="10" fill={SEV[k].color} /></svg>
                    <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: '#5e5648', flex: 1 }}>{SEV[k].label}</span>
                    <div style={{ flex: 2, height: 6, background: '#e9e2d1', minWidth: 30 }}>
                      <div style={{ width: `${findings.length ? (counts[k] / findings.length) * 100 : 0}%`, height: 6, background: SEV[k].color }} />
                    </div>
                    <span style={{ fontFamily: MONO, fontSize: 12, color: INK, width: 16, textAlign: 'right' }}>{counts[k]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '28px 26px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ ...labelCap, letterSpacing: '.16em' }}>Who the terms favour</div>
              <svg viewBox="0 0 200 96" style={{ width: '100%', maxWidth: 230, height: 'auto', marginTop: 10 }} aria-hidden="true">
                <g transform={`rotate(${angle} 100 46)`}>
                  <line x1="26" y1="46" x2="174" y2="46" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
                  <circle cx="26" cy="46" r="9" fill={tilt < -2 ? '#8f2d1c' : CARD} stroke={INK} strokeWidth="1.4" />
                  <circle cx="174" cy="46" r="9" fill={tilt > 2 ? '#8f2d1c' : CARD} stroke={INK} strokeWidth="1.4" />
                </g>
                <path d="M100 44 L 112 84 L 88 84 Z" fill={INK} />
                <line x1="70" y1="88" x2="130" y2="88" stroke={INK} strokeWidth="2" />
                <text x="26" y="16" textAnchor="middle" style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', fill: INK_60 }}>{leftRole}</text>
                <text x="174" y="16" textAnchor="middle" style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', fill: INK_60 }}>{rightRole}</text>
              </svg>
              <div style={{ fontSize: 13, lineHeight: 1.55, color: '#4a443b', marginTop: 10 }}>{beamNote}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginTop: 48 }}>
            <h3 style={{ fontFamily: SERIF, fontSize: 23, fontWeight: 600, margin: 0 }}>The redline</h3>
            {t.redline && <span style={{ fontFamily: langMeta.font, fontSize: 13, color: '#a09781' }}>{t.redline}</span>}
            <div style={{ flex: 1, height: 1, background: INK, minWidth: 20 }} />
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: INK_60 }}>Click a mark or a finding — both panes follow</span>
          </div>

          <div style={{ border: `1px solid ${INK}`, background: CARD, marginTop: 16 }}>
            <div style={{ padding: '13px 20px', borderBottom: '1px solid #e0d8c4', background: PAPER_HI }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ ...labelCap, flex: 'none' }}>Document map</span>
                <div onClick={onMapClick} style={{ position: 'relative', flex: 1, height: 24, border: `1px solid ${FIELD_BORDER}`, background: 'repeating-linear-gradient(90deg,#efe9db 0 6px,#eae3d2 6px 12px)', cursor: 'pointer' }}>
                  {kept.map((m) => (
                    <button
                      key={m.id}
                      title={`${SEV[m.sev].label} — ${m.title}`}
                      onClick={(e) => { e.stopPropagation(); setActive(m.id); setTimeout(() => scrollTo(m.id), 0); }}
                      style={{ position: 'absolute', top: -1, left: `${((m.start / len) * 100).toFixed(2)}%`, width: `${Math.max(0.6, ((m.end - m.start) / len) * 100).toFixed(2)}%`, minWidth: 3, height: 24, background: SEV[m.sev].color, border: 'none', padding: 0, cursor: 'pointer', opacity: active && active !== m.id ? 0.4 : 1 }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.25fr) minmax(0,1fr)' }}>
              <div ref={paneRef} className="piq-pane" style={{ maxHeight: 620, overflowY: 'auto', padding: '26px 28px', borderRight: '1px solid #e0d8c4', background: '#fbf8f1', fontFamily: MONO, fontSize: 12.5, lineHeight: 1.95, color: '#2b2823', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {segments.map((s, i) => {
                  if (!s.mid) return <span key={i}>{s.text}</span>;
                  const on = active === s.mid;
                  return (
                    <span
                      key={i}
                      data-mid={s.mid}
                      onClick={() => setActive(on ? null : s.mid)}
                      style={{ background: on ? SEV[s.sev].color : SEV[s.sev].tint, color: on ? CARD : '#2b2823', boxShadow: on ? 'none' : `inset 0 -0.6em 0 ${SEV[s.sev].tint}`, borderBottom: `2px solid ${SEV[s.sev].color}`, cursor: 'pointer' }}
                    >{s.text}</span>
                  );
                })}
              </div>

              <div className="piq-pane" style={{ display: 'flex', flexDirection: 'column', maxHeight: 620, overflowY: 'auto' }}>
                {findings.map((f) => {
                  const on = active === f.id;
                  const a = SEV[f.sev].color;
                  return (
                    <div
                      key={f.id}
                      onClick={() => { setActive(on ? null : f.id); if (!on) setTimeout(() => scrollTo(f.id), 0); }}
                      style={{ borderBottom: `1px solid ${RULE_2}`, borderLeft: `4px solid ${on ? a : RULE_2}`, background: on ? SEV[f.sev].tint : CARD, padding: '17px 20px', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <svg viewBox="0 0 18 18" width="15" height="15" style={{ flex: 'none' }} aria-hidden="true"><polygon points={shapePts(f.glyph, 18)} fill={a} /></svg>
                        <span style={{ background: a, color: CARD, padding: '2px 8px', fontFamily: MONO, fontSize: 8.5, letterSpacing: '.16em' }}>{SEV[f.sev].label.toUpperCase()}</span>
                        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8c8471' }}>{f.clauseRef}</span>
                      </div>
                      <div style={{ fontFamily: SERIF, fontSize: 16.5, fontWeight: 600, lineHeight: 1.35, marginTop: 9 }}>{f.title}</div>
                      {on && (
                        <div style={{ marginTop: 12 }}>
                          <p style={{ fontSize: 13.5, lineHeight: 1.65, color: '#3d382f', margin: 0 }}>{f.body}</p>
                          <div style={{ borderLeft: `2px solid ${a}`, background: PAPER_HI, padding: '10px 13px', marginTop: 12, fontFamily: MONO, fontSize: 11.5, lineHeight: 1.6, color: '#5e5648' }}>{`“${f.quote}”`}</div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginTop: 13 }}>
                            <svg viewBox="0 0 12 12" width="10" height="10" style={{ marginTop: 3, flex: 'none' }} aria-hidden="true"><polygon points="6,0 12,6 6,12 0,6" fill={a} /></svg>
                            <span style={{ fontFamily: MONO, fontSize: 11.5, lineHeight: 1.55, color: INK }}>{f.source}</span>
                          </div>
                          <div style={{ fontSize: 13, lineHeight: 1.6, color: '#4a443b', marginTop: 8 }}>{f.sourceNote}</div>
                          {f.fix && (
                            <details style={{ marginTop: 13, borderTop: `1px solid ${RULE_2}`, paddingTop: 11 }} onClick={(e) => e.stopPropagation()}>
                              <summary style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#2f5d44' }}>
                                <svg viewBox="0 0 10 10" width="8" height="8" aria-hidden="true"><polygon points="1,1 9,5 1,9" fill="#2f5d44" /></svg>
                                A safer way to word it
                              </summary>
                              <div style={{ border: '1px dashed #2f5d44', background: '#eef3ef', padding: '12px 13px', marginTop: 10, fontSize: 13, lineHeight: 1.65, color: '#23402f' }}>{f.fix}</div>
                            </details>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {findings.length === 0 && (
                  <div style={{ padding: '26px 20px', fontSize: 14, lineHeight: 1.6, color: '#4a443b' }}>
                    Nothing in our clause library matched this text. That is not a clean bill of health — it means none of the patterns we check for appeared. Have an advocate read it.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginTop: 48 }}>
            <h3 style={{ fontFamily: SERIF, fontSize: 23, fontWeight: 600, margin: 0 }}>What is missing</h3>
            {t.missing && <span style={{ fontFamily: langMeta.font, fontSize: 13, color: '#a09781' }}>{t.missing}</span>}
            <div style={{ flex: 1, height: 1, background: INK, minWidth: 20 }} />
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: INK_60 }}>{`${missing.length} of ${mand.length} not found`}</span>
          </div>
          <div style={{ border: `1px solid ${RULE}`, background: CARD, padding: 26, marginTop: 16 }}>
            {missing.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                <svg viewBox="0 0 28 28" width="26" height="26" aria-hidden="true">
                  <circle cx="14" cy="14" r="12.5" fill="none" stroke="#2f5d44" strokeWidth="1" />
                  <path d="M9 14.4 L 12.6 17.8 L 19 9.8" fill="none" stroke="#2f5d44" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <span style={{ fontSize: 14.5, lineHeight: 1.6, color: '#3d382f' }}>
                  Every clause this document type ought to carry appears somewhere in the text. Read each one against what you were told verbally.
                </span>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,330px),1fr))', gap: '0 40px' }}>
                {missing.map((m) => (
                  <div key={m.key} style={{ display: 'grid', gridTemplateColumns: '34px minmax(0,1fr)', gap: 14, padding: '16px 0', borderBottom: `1px solid ${RULE_2}`, alignItems: 'start' }}>
                    <svg viewBox="0 0 28 28" width="27" height="27" style={{ marginTop: 2 }} aria-hidden="true">
                      <circle cx="14" cy="14" r="12.5" fill="none" stroke="#8f2d1c" strokeWidth="1" strokeDasharray="3 3" />
                      <circle cx="14" cy="14" r="8.5" fill="none" stroke="#8f2d1c" strokeWidth="0.6" />
                    </svg>
                    <div>
                      <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.4, color: INK }}>{m.title}</div>
                      <div style={{ fontSize: 13, lineHeight: 1.6, color: '#4a443b', marginTop: 5, textWrap: 'pretty' }}>{m.why}</div>
                      <div style={{ fontFamily: MONO, fontSize: 10.5, lineHeight: 1.5, color: '#8c8471', marginTop: 7 }}>{m.source}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* explain view */}
      {showExplain && (
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '34px 32px 0', animation: 'piqFadeUp .35s ease-out both' }}>
          <div style={{ border: `1px solid ${INK}`, background: CARD, padding: '30px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap' }}>
              <svg viewBox="0 0 22 22" width="20" height="20" aria-hidden="true"><polygon points={shapePts(meta ? meta.shape : 'circle', 22)} fill={accent} /></svg>
              <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: '#5e5648' }}>
                {`${det.type || 'Document'} · ${det.state || 'state not detected'}`}
              </span>
              {t.summary && <span style={{ fontFamily: langMeta.font, fontSize: 13, color: '#a09781' }}>{t.summary}</span>}
            </div>
            <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(22px,2.7vw,31px)', lineHeight: 1.3, fontWeight: 600, margin: '16px 0 0', maxWidth: 820, textWrap: 'pretty' }}>
              {det.type
                ? `This is a ${det.type.toLowerCase()}${det.state ? ` governed by ${det.state} law` : ''}, and here is what it does.`
                : 'Here is what this document does, in plain language.'}
            </h2>
            <p style={{ fontSize: 15.5, lineHeight: 1.7, color: '#3d382f', margin: '14px 0 0', maxWidth: 820, textWrap: 'pretty' }}>
              {isRent
                ? 'One party lets the other occupy a property for a fixed term in return for rent and a deposit. The agreement sets the term, the payment day, the notice each side must give, and who bears maintenance. What matters most is the term — it decides whether registration is compulsory — and whether the termination rights are the same on both sides.'
                : 'One party transfers ownership of a property to another for a stated price. The deed records the consideration and its receipt, warrants that the title is clear, delivers possession, and must be registered within four months of execution. What matters most is that the transfer is by registered deed from the recorded titleholder, and that the schedule identifies the property precisely.'}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,210px),1fr))', gap: 16, marginTop: 20 }}>
            {keyTerms.map((k) => (
              <div key={k.label} style={{ border: `1px solid ${RULE}`, borderTop: `3px solid ${k.accent}`, background: CARD, padding: '18px 18px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={labelCap}>{k.label}</span>
                  <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><polygon points={shapePts(k.shape, 16)} fill={k.accent} opacity="0.55" /></svg>
                </div>
                <div style={{ fontFamily: SERIF, fontSize: 23, fontWeight: 700, lineHeight: 1.15, marginTop: 11 }}>{k.value}</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.5, color: INK_60, marginTop: 7 }}>{k.note}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: 20, marginTop: 20 }}>
            {sides.map((p) => (
              <div key={p.role} style={{ border: `1px solid ${RULE}`, background: CARD, padding: '22px 22px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg viewBox="0 0 18 18" width="15" height="15" aria-hidden="true"><polygon points={shapePts(p.shape, 18)} fill={p.accent} /></svg>
                  <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: p.accent }}>{p.role}</span>
                </div>
                <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 600, marginTop: 10 }}>{p.name}</div>
                <div style={{ marginTop: 12 }}>
                  {p.duties.map((d) => (
                    <div key={d} style={{ display: 'grid', gridTemplateColumns: '18px minmax(0,1fr)', gap: 11, padding: '9px 0', borderTop: `1px solid ${RULE_2}`, alignItems: 'start' }}>
                      <svg viewBox="0 0 10 10" width="8" height="8" style={{ marginTop: 6 }} aria-hidden="true"><rect width="10" height="10" fill={p.accent} opacity="0.7" /></svg>
                      <span style={{ fontSize: 13.5, lineHeight: 1.6, color: '#3d382f' }}>{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ border: '1px solid #8f3a24', background: '#f7f0e9', padding: '22px 24px', marginTop: 20 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: '#8f3a24' }}>Worth a second look</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: '0 34px', marginTop: 6 }}>
              {watchOut.map((w) => (
                <div key={w.id} style={{ display: 'grid', gridTemplateColumns: '20px minmax(0,1fr)', gap: 12, padding: '13px 0', borderBottom: '1px solid #ecdfd3', alignItems: 'start' }}>
                  <svg viewBox="0 0 14 14" width="13" height="13" style={{ marginTop: 3 }} aria-hidden="true"><polygon points="7,1 13,12 1,12" fill="#8f3a24" opacity="0.8" /></svg>
                  <span style={{ fontSize: 13.5, lineHeight: 1.6, color: '#3d382f' }}>{`${w.title} — ${w.body.split('.')[0]}.`}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: '#5e5648', margin: '14px 0 0' }}>
              Switch to <b>Find the risks</b> for the clause-by-clause redline with the provision behind each finding.
            </p>
          </div>
        </section>
      )}

      {/* in development */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '44px 32px 0' }}>
        <div style={{ border: '1px dashed #b9ae94', background: PAPER_HI, padding: '20px 24px', display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ border: '1px solid #9a7b2a', color: '#9a7b2a', padding: '3px 10px', fontFamily: MONO, fontSize: 9.5, letterSpacing: '.18em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>In development</span>
          <span style={{ flex: 1, minWidth: 260, fontSize: 14, lineHeight: 1.65, color: '#4a443b', textWrap: 'pretty' }}>
            OCR for scanned deeds, and cross-language document reading — so a contract drafted in Marathi, Punjabi, Kannada or Hindi can be analysed and explained in the language you read.
          </span>
        </div>
      </section>

      {/* coverage strip + footer */}
      <div style={{ marginTop: 56, borderTop: `1px solid ${INK}`, background: '#ece7d9' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '11px 32px', display: 'flex', gap: 20, flexWrap: 'wrap', fontFamily: MONO, fontSize: 10.5, letterSpacing: '.06em', color: INK_60 }}>
          <span>COVERAGE — HIMACHAL PRADESH · MAHARASHTRA · KARNATAKA · PUNJAB</span>
          <span style={{ color: '#8f3a24' }}>LEGAL INFORMATION, NOT LEGAL ADVICE</span>
        </div>
      </div>

      <footer style={{ background: '#ece7d9', borderTop: `1px solid ${RULE}` }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '22px 32px 40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,280px),1fr))', gap: 20 }}>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: '#5e5648', maxWidth: 520 }}>
            Sample contracts are fictional and engineered to show the analyzer working. Your own text is never sent anywhere in this view.
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
