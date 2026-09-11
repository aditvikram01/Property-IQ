// PropertyIQ — Toolkit (converter · records · process · exemptions · jurisdiction).
// Drop this in as `src/Toolkit.jsx` in the Property-IQ repo.
//
// Wiring (in src/App.jsx):
//   import Toolkit from './Toolkit';
//   ...
//   {tab === 'toolkit' && <Toolkit onNavigate={setTab} />}
//
// Self-contained: fonts + keyframes injected by the component, inline styles
// only. Reference data mirrors src/data/constants.js.

import { useState, useCallback } from 'react';

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
  "@import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&family=Noto+Serif+Devanagari:wght@400;500&family=Noto+Sans+Kannada:wght@400;500&family=Noto+Sans+Gurmukhi:wght@400;500&display=swap');";

const STYLE_CSS = `${FONT_CSS}
@keyframes piqFadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
.piq-tk a { color:#8f3a24; text-decoration:none; border-bottom:1px solid rgba(143,58,36,.35); }
.piq-tk a:hover { color:${INK}; border-bottom-color:${INK}; }
.piq-tk select:focus, .piq-tk input:focus { outline:2px solid ${GREEN}; outline-offset:-2px; }`;

const S = {
  hp: {
    name: 'Himachal Pradesh', native: 'हिमाचल प्रदेश', nativeFont: DEV, accent: '#2f5d44', tint: '#e7eee9', shape: 'triangle',
    hierarchy: ['District', 'Tehsil', 'Village', 'Khasra No.'], record: 'Jamabandi', recordDesc: 'Land ownership record drawn from the Himbhoomi portal.',
    portal: 'himbhoomilmk.nic.in', sro: 143, langs: 'English or Hindi',
    units: ['Kanal', 'Marla', 'Bigha', 'Biswa', 'Sq. Meter', 'Sq. Feet', 'Hectare', 'Acre'],
    methods: ['e-Stamp (SHCIL)', 'Physical stamp paper', 'Treasury challan'], payPortal: 'ngdrshp.gov.in', payNote: '',
    jurisType: 'Registrar and DC concurrent within the district',
    jurisRule: 'The Registrar or Deputy Commissioner may register a document for their district, but every Sub-Registrar has a specific tehsil-based jurisdiction.',
    jurisTip: 'Go to the SRO covering the village or tehsil where the land actually sits.',
    exempt: [
      { type: 'Female buyer', details: '4% stamp duty against 6% for a male buyer.', saving: '2% of value' },
      { type: 'Family gift deed', details: 'Gift to a lineal descendant at the reduced 3–5% band.', saving: '1–3% of value' },
      { type: 'Government transactions', details: 'Exempt from stamp duty entirely.', saving: 'Full duty' },
    ],
  },
  mh: {
    name: 'Maharashtra', native: 'महाराष्ट्र', nativeFont: DEV, accent: '#33302b', tint: '#e9e6df', shape: 'diamond',
    hierarchy: ['Division', 'District', 'Taluka', 'Village', 'Survey No.'], record: '7/12 Extract (Saat-Baara)', recordDesc: 'Form 7 records ownership, Form 12 records cultivation.',
    portal: 'mahabhulekh.maharashtra.gov.in', sro: 504, langs: 'Marathi or English',
    units: ['Hectare', 'Are', 'Sq. Meter', 'Sq. Feet', 'Acre', 'Guntha'],
    methods: ['GRAS (online)', 'e-Stamp (SHCIL)', 'eSBTR', 'Franking'], payPortal: 'igrmaharashtra.gov.in',
    payNote: 'Cash is not accepted for stamp duty — only for the registration fee.',
    jurisType: 'Concurrent within the city',
    jurisRule: 'Documents may be registered at any Sub-Registrar Office within the same city or district. Rural areas keep strict SRO jurisdiction.',
    jurisTip: 'In Mumbai or Pune any city SRO will do. Outside the municipal limits, go to the specific office.',
    exempt: [
      { type: 'Female buyer', details: '1% concession — 5% against 6% in Mumbai Municipal Corporation.', saving: '1% of value' },
      { type: 'Family gift deed', details: 'Agricultural or residential gift to a spouse, child or grandchild: ₹200.', saving: 'Up to 5–6% of value' },
      { type: 'SEZ agricultural transfer', details: 'Exemptions for transfers to an SEZ developer.', saving: 'Varies' },
      { type: 'Government transactions', details: 'Exempt from stamp duty entirely.', saving: 'Full duty' },
    ],
  },
  ka: {
    name: 'Karnataka', native: 'ಕರ್ನಾಟಕ', nativeFont: KAN, accent: '#8f3a24', tint: '#f2e8e3', shape: 'square',
    hierarchy: ['District', 'Taluk', 'Hobli', 'Village', 'Survey No.'], record: 'RTC (Record of Rights, Tenancy & Crops)', recordDesc: 'Pahani extract drawn from the Bhoomi portal.',
    portal: 'kaveri.karnataka.gov.in', sro: 169, langs: 'English or Kannada only',
    units: ['Acre', 'Gunta', 'Sq. Meter', 'Sq. Feet', 'Hectare', 'Cent'],
    methods: ['e-Stamp (SHCIL)', 'Khajane-2 (state treasury)'], payPortal: 'kaveri.karnataka.gov.in',
    payNote: 'Physical stamp paper was discontinued in 2002 — e-stamping is mandatory.',
    jurisType: 'Mixed — Bengaluru concurrent, elsewhere strict',
    jurisRule: 'Bengaluru Urban has five registration districts, and any SRO within your district will register the document. Other districts keep strict SRO jurisdiction.',
    jurisTip: 'In Bengaluru, any SRO in your registration district works. Outside it, only the specific office.',
    exempt: [
      { type: 'Rural property at or below ₹45 lakh', details: '3% stamp duty instead of 5%.', saving: '2% of value' },
      { type: 'No gender concession', details: 'Karnataka grants no gender-based concession at any value.', saving: 'Nothing' },
      { type: 'Government transactions', details: 'Exempt from stamp duty entirely.', saving: 'Full duty' },
    ],
  },
  pb: {
    name: 'Punjab', native: 'ਪੰਜਾਬ', nativeFont: GUR, accent: '#9a7b2a', tint: '#f1ebdb', shape: 'circle',
    hierarchy: ['District', 'Tehsil / Sub-Tehsil', 'Village', 'Khasra No.'], record: 'Jamabandi / Fard', recordDesc: 'Land ownership record drawn from the PLRS portal.',
    portal: 'igrpunjab.gov.in', sro: 82, langs: 'Punjabi or English',
    units: ['Kanal', 'Marla', 'Acre', 'Sq. Feet', 'Sq. Meter', 'Hectare', 'Bigha'],
    methods: ['e-Stamp (SHCIL)', 'Physical stamp paper', 'Treasury challan'], payPortal: 'igrpunjab.gov.in', payNote: '',
    jurisType: 'Cross-jurisdiction, with conditions',
    jurisRule: 'Where a property falls within more than one registrar or sub-registrar jurisdiction, the document may be registered at any of them.',
    jurisTip: 'For a single-jurisdiction property, go to the specific SRO. For a property spanning two, you may choose.',
    exempt: [
      { type: 'Female buyer', details: '2% concession — 5% against 7% urban, 3% against 5% rural.', saving: '2% of value' },
      { type: 'Rural property', details: 'Rural rates run below urban across every transaction type.', saving: '2% of value' },
      { type: 'Government transactions', details: 'Exempt from stamp duty entirely.', saving: 'Full duty' },
    ],
  },
};
const ORDER = ['hp', 'mh', 'ka', 'pb'];

// Per-state square-foot values. Customary units (Bigha, Biswa) were never
// nationally standardised, so their size genuinely differs by state — HP uses
// the small Bigha (8,712 sq ft = 1/5 acre), Punjab the large Bigha (21,780 sq
// ft = 1/2 acre). Kanal/Marla, and the metric-derived units (Guntha/Gunta,
// Are, Cent) are consistent. Sources: state revenue references, cross-checked;
// see the "verify locally" note in the converter for the uncertain ones.
const UNIT_SQFT_BY_STATE = {
  hp: { 'Sq. Feet': 1, 'Sq. Meter': 10.7639, Hectare: 107639.1, Acre: 43560, Bigha: 8712, Biswa: 435.6, Kanal: 5445, Marla: 272.25 },
  mh: { 'Sq. Feet': 1, 'Sq. Meter': 10.7639, Hectare: 107639.1, Acre: 43560, Guntha: 1089, Are: 1076.39 },
  ka: { 'Sq. Feet': 1, 'Sq. Meter': 10.7639, Hectare: 107639.1, Acre: 43560, Gunta: 1089, Cent: 435.6 },
  pb: { 'Sq. Feet': 1, 'Sq. Meter': 10.7639, Hectare: 107639.1, Acre: 43560, Kanal: 5445, Marla: 272.25, Bigha: 21780, Biswa: 1089 },
};
// Units whose local size is regionally contested — surface a verify-locally note.
const VARIABLE_UNITS = ['Bigha', 'Biswa'];

const TABS = [
  { key: 'conv', label: 'Land unit converter', art: ['M5 18 H 29', 'M5 18 V 6 H 17 V 18', 'M17 12 H 29 V 18'] },
  { key: 'records', label: 'Records & plot IDs', art: ['M17 3 V 21', 'M6 8 H 17', 'M28 13 H 17', 'M6 18 H 17'] },
  { key: 'process', label: 'Registration process', art: ['M4 12 H 30', 'M8 12 m -3 0 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0', 'M26 12 m -3 0 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0'] },
  { key: 'exempt', label: 'Exemptions', art: ['M6 20 L 17 4 L 28 20 Z', 'M17 9 V 14', 'M17 17 V 18'] },
  { key: 'juris', label: 'Jurisdiction', art: ['M6 6 H 28 V 20 H 6 Z', 'M6 11 H 28', 'M14 11 V 20'] },
];

const STEPS = [
  ['Document preparation', 'Gather NOCs and supporting documents for your deed type.'],
  ['Valuation', 'Market value established where the deed type requires it.'],
  ['Duty calculation', 'State rules, exemptions and concessions applied.'],
  ['Payment', 'e-Stamp, challan, franking or treasury, depending on the state.'],
  ['Presentation', 'Document submitted at the SRO with jurisdiction.'],
  ['Admission', 'The SRO confirms execution is willing and uncoerced.'],
  ['Scrutiny', 'Execution date, market value, duty and jurisdiction verified.'],
  ['Identification', 'Biometrics, photographs, Aadhaar eKYC and witnesses.'],
  ['Registration', 'Registering authority signs; digital signature where configured.'],
  ['Handover', 'Document scanned, preserved digitally, original returned.'],
];

const NAV = [
  { key: 'home', label: 'Home' },
  { key: 'eligibility', label: 'Eligibility Check' },
  { key: 'contract', label: 'Decode Contract' },
  { key: 'costs', label: 'Compare Costs' },
  { key: 'toolkit', label: 'Toolkit' },
];

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

function fmt(n) {
  if (!isFinite(n)) return '0';
  if (n >= 1000) return Math.round(n).toLocaleString('en-IN');
  if (n >= 10) return n.toFixed(1).replace(/\.0$/, '');
  return n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

const labelCap = { fontFamily: MONO, fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: INK_60 };
const fieldStyle = { display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 7, padding: 12, border: `1px solid ${FIELD_BORDER}`, background: PAPER_HI, fontSize: 14.5, color: INK, borderRadius: 0 };

/* ------------------------------------------------------------- component */

export default function Toolkit({ onNavigate }) {
  const [tab, setTab] = useState('conv');
  const [amount, setAmount] = useState('5');
  const [fromU, setFrom] = useState('Bigha');
  const [toU, setTo] = useState('Sq. Feet');
  const [unitState, setUnitState] = useState('hp');

  const go = useCallback((key) => { if (typeof onNavigate === 'function') onNavigate(key); }, [onNavigate]);

  // The converter works within a chosen state's system of units, so a Bigha in
  // Himachal converts differently from a Bigha in Punjab.
  const dest = S[unitState];
  const curUnits = dest.units;
  const U = UNIT_SQFT_BY_STATE[unitState];
  const from = curUnits.includes(fromU) ? fromU : curUnits[0];
  const to = curUnits.includes(toU) ? toU : (curUnits.includes('Sq. Feet') ? 'Sq. Feet' : curUnits[0]);

  const pickState = (id) => {
    const u = S[id].units;
    setUnitState(id);
    if (!u.includes(from)) setFrom(u[0]);
    if (!u.includes(to)) setTo(u.includes('Sq. Feet') ? 'Sq. Feet' : (u[1] || u[0]));
  };

  const amt = parseFloat(amount) || 0;
  const fromSq = U[from] ?? 1;
  const toSq = U[to] ?? 1;
  const sqft = amt * fromSq;
  const out = sqft / toSq;

  const bigger = Math.max(fromSq, toSq);
  const sideA = Math.max(7, Math.sqrt(fromSq / bigger) * 150);
  const sideB = Math.max(7, Math.sqrt(toSq / bigger) * 150);
  const variableInPlay = VARIABLE_UNITS.includes(from) || VARIABLE_UNITS.includes(to);

  return (
    <div className="piq-tk" style={{ fontFamily: SANS, background: PAPER, color: INK, minHeight: '100vh', overflowX: 'hidden' }}>
      <style>{STYLE_CSS}</style>

      <header style={{ borderBottom: `1px solid ${INK}`, background: CARD }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
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
              const on = n.key === 'toolkit';
              return <button key={n.key} onClick={() => go(n.key)} style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.06em', padding: '10px 14px', border: 'none', borderBottomWidth: 2, borderBottomStyle: 'solid', borderBottomColor: on ? GREEN : 'transparent', background: 'none', cursor: 'pointer', color: on ? GREEN : INK_60, fontWeight: on ? 600 : 400 }}>{n.label}</button>;
            })}
          </nav>
        </div>
      </header>

      <section style={{ position: 'relative', borderBottom: `1px solid ${INK}`, background: PAPER_HI, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(#cfc6b0 1px,transparent 1px)', backgroundSize: '22px 22px', opacity: 0.45, pointerEvents: 'none' }} />
        <svg viewBox="0 0 200 200" style={{ position: 'absolute', right: -40, bottom: -70, width: 240, height: 240, opacity: 0.5, pointerEvents: 'none' }} aria-hidden="true">
          <g fill="none" stroke="#9a7b2a" strokeWidth="0.7">
            <rect x="20" y="20" width="160" height="160" />
            <rect x="45" y="45" width="110" height="110" />
            <rect x="70" y="70" width="60" height="60" />
            <path d="M20 20 L 180 180 M180 20 L 20 180" />
          </g>
        </svg>
        <div style={{ position: 'relative', maxWidth: 1240, margin: '0 auto', padding: '44px 32px 36px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', background: GREEN, padding: '6px 13px', whiteSpace: 'nowrap', maxWidth: '100%' }}>
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: '#e8e2d2', fontWeight: 500 }}>Toolkit</span>
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(32px,4.4vw,50px)', lineHeight: 1.02, fontWeight: 700, letterSpacing: '-1.2px', margin: '18px 0 0', maxWidth: 740, textWrap: 'pretty' }}>
            The reference material,<br />unbundled.
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: '#3d382f', margin: '18px 0 0', maxWidth: 600, textWrap: 'pretty' }}>
            Convert a Bigha. Find the record that proves ownership. See the ten stages of registration, what each state exempts, and which office has jurisdiction over your plot.
          </p>
        </div>
      </section>

      {/* tabs */}
      <section style={{ maxWidth: 1240, margin: '0 auto', padding: '28px 32px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,180px),1fr))', border: `1px solid ${INK}`, background: CARD }}>
          {TABS.map((tb) => {
            const on = tab === tb.key;
            return (
              <button key={tb.key} onClick={() => setTab(tb.key)} style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start', textAlign: 'left', padding: '16px 18px', background: on ? PAPER_HI : 'transparent', border: 'none', borderRight: `1px solid ${RULE_2}`, borderBottom: `3px solid ${on ? GREEN : 'transparent'}`, cursor: 'pointer', fontFamily: SANS }}>
                <svg viewBox="0 0 34 24" width="34" height="24" aria-hidden="true">
                  <g fill="none" stroke={on ? GREEN : '#b3aa94'} strokeWidth="1.1" strokeLinecap="round">
                    {tb.art.map((d, i) => <path key={i} d={d} />)}
                  </g>
                </svg>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: on ? INK : INK_60, lineHeight: 1.3 }}>{tb.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* converter */}
      {tab === 'conv' && (
        <section style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 32px 0', animation: 'piqFadeUp .3s ease-out both' }}>
          <div style={{ border: `1px solid ${INK}`, background: CARD, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))' }}>
            <div style={{ padding: '28px 26px', borderRight: '1px solid #e0d8c4' }}>
              <h2 style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 600, margin: 0 }}>Land unit converter</h2>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: '#4a443b', margin: '9px 0 0' }}>
                A Bigha in Himachal is not a Bigha in Punjab, and a Gunta is not a Guntha. Convert before you compare a price per unit.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 22 }}>
                <label style={{ display: 'block' }}>
                  <span style={labelCap}>Amount</span>
                  <input type="text" value={amount} onChange={(e) => setAmount((e.target.value || '').replace(/[^0-9.]/g, ''))} style={{ ...fieldStyle, fontFamily: MONO, fontSize: 16 }} />
                </label>
                <label style={{ display: 'block' }}>
                  <span style={labelCap}>From</span>
                  <select value={from} onChange={(e) => setFrom(e.target.value)} style={fieldStyle}>
                    {curUnits.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
                <div style={{ flex: 1, height: 1, background: '#e0d8c4' }} />
                <svg viewBox="0 0 14 14" width="13" height="13" aria-hidden="true"><path d="M7 1 V 13 M 3 9 L 7 13 L 11 9" fill="none" stroke="#8f3a24" strokeWidth="1.3" /></svg>
                <div style={{ flex: 1, height: 1, background: '#e0d8c4' }} />
              </div>
              <label style={{ display: 'block', marginTop: 16 }}>
                <span style={labelCap}>To</span>
                <select value={to} onChange={(e) => setTo(e.target.value)} style={fieldStyle}>
                  {curUnits.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </label>
              <div style={{ border: `1px solid ${GREEN}`, background: '#eef3ef', padding: '18px 20px', marginTop: 20 }}>
                <div style={{ ...labelCap, color: '#2f5d44' }}>{`${fmt(amt)} ${from} in ${dest.name} equals`}</div>
                <div style={{ fontFamily: SERIF, fontSize: 'clamp(28px,3.6vw,40px)', fontWeight: 700, lineHeight: 1.05, marginTop: 8 }}>{`${fmt(out)} ${to}`}</div>
                <div style={{ fontFamily: MONO, fontSize: 11.5, color: '#4a6b57', marginTop: 8 }}>{`${fmt(sqft)} sq ft · ${fmt(sqft / 10.7639)} sq m`}</div>
              </div>
              <div style={{ marginTop: 18 }}>
                <span style={labelCap}>Measured in the units of</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                  {ORDER.map((id) => {
                    const on = unitState === id;
                    return (
                      <button key={id} onClick={() => pickState(id)} style={{ border: `1px solid ${on ? S[id].accent : '#d6cdb8'}`, background: on ? S[id].tint : 'transparent', color: on ? INK : '#5e5648', padding: '6px 11px', fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', cursor: 'pointer' }}>{S[id].name}</button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.55, color: INK_60, marginTop: 10 }}>
                  {`Conversion uses ${dest.name}'s own unit sizes — a ${from} here is not the same area as in another state. These are the units you will see in a ${dest.record.split(' (')[0]}.`}
                </div>
                {variableInPlay && (
                  <div style={{ fontSize: 11.5, lineHeight: 1.5, color: '#8f3a24', marginTop: 8, borderLeft: '2px solid #8f3a24', paddingLeft: 10 }}>
                    Bigha and Biswa were never standardised and still vary by district and by pucca/kaccha usage. Confirm the local size against the revenue record before you rely on an area.
                  </div>
                )}
              </div>
            </div>
            <div style={{ padding: '28px 26px', background: PAPER_HI, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ ...labelCap, letterSpacing: '.16em' }}>One unit against another, to scale</div>
              <svg viewBox="0 0 260 200" style={{ width: '100%', height: 'auto', maxWidth: 420, marginTop: 16 }} aria-hidden="true">
                <defs>
                  <pattern id="piqTkGrid" width="13" height="13" patternUnits="userSpaceOnUse">
                    <path d="M13 0 L 0 0 0 13" fill="none" stroke="#d8cfb8" strokeWidth="0.6" />
                  </pattern>
                </defs>
                <rect x="4" y="4" width="252" height="170" fill="url(#piqTkGrid)" stroke={FIELD_BORDER} strokeWidth="1" />
                <rect x={8} y={172 - sideA} width={sideA} height={sideA} fill="#dfe8e1" stroke="#2f5d44" strokeWidth="1.4" />
                <rect x={252 - sideB - 4} y={172 - sideB} width={sideB} height={sideB} fill="none" stroke="#8f3a24" strokeWidth="1.4" strokeDasharray="5 4" />
                <text x="8" y="190" style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', fill: '#2f5d44' }}>{`1 ${from} = ${fmt(fromSq)} SQ FT`}</text>
                <text x="150" y="190" style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', fill: '#8f3a24' }}>{`1 ${to} = ${fmt(toSq)} SQ FT`}</text>
              </svg>
              <div style={{ marginTop: 20 }}>
                {dest.units.map((u) => (
                  <div key={u} style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '9px 0', borderTop: '1px solid #e0d8c4' }}>
                    <span style={{ flex: 1, fontSize: 13.5, color: '#3d382f' }}>{u}</span>
                    <span style={{ fontFamily: MONO, fontSize: 12, color: INK_60 }}>{`${fmt(U[u] || 0)} sq ft`}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* records */}
      {tab === 'records' && (
        <section style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 32px 0', animation: 'piqFadeUp .3s ease-out both' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,290px),1fr))', gap: 18 }}>
            {ORDER.map((id) => {
              const d = S[id];
              return (
                <div key={id} style={{ border: `1px solid ${RULE}`, borderTop: `3px solid ${d.accent}`, background: CARD, padding: '22px 22px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 600 }}>{d.name}</span>
                    <svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true"><polygon points={shapePts(d.shape, 20)} fill={d.accent} opacity="0.7" /></svg>
                  </div>
                  <div style={{ fontFamily: d.nativeFont, fontSize: 12, color: '#a09781', marginTop: 4 }}>{d.native}</div>
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: INK_60 }}>How a plot is addressed</div>
                    <div style={{ marginTop: 10 }}>
                      {d.hierarchy.map((label, i) => {
                        const last = i === d.hierarchy.length - 1;
                        return (
                          <div key={label} style={{ display: 'grid', gridTemplateColumns: '22px minmax(0,1fr)', gap: 10, alignItems: 'center' }}>
                            <svg viewBox="0 0 22 30" width="20" height="26" aria-hidden="true">
                              <line x1="11" y1="0" x2="11" y2={i === 0 ? 0 : 8} stroke={d.accent} strokeWidth="1" strokeDasharray="2 3" />
                              <circle cx="11" cy="15" r={4 + i * 0.9} fill={last ? d.accent : d.tint} stroke={d.accent} strokeWidth="1" />
                              <line x1="11" y1={last ? 30 : 22} x2="11" y2="30" stroke={d.accent} strokeWidth="1" strokeDasharray="2 3" opacity={last ? 0 : 1} />
                            </svg>
                            <span style={{ fontSize: 13.5, color: INK }}>{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ borderTop: `1px solid ${RULE_2}`, marginTop: 14, paddingTop: 13, display: 'grid', gap: 8 }}>
                    {[
                      ['Record', <span key="r" style={{ fontSize: 13, fontWeight: 600, color: INK }}>{d.record}</span>],
                      ['Portal', <span key="p" style={{ fontFamily: MONO, fontSize: 11.5, color: '#8f3a24', wordBreak: 'break-all' }}>{d.portal}</span>],
                      ['Offices', <span key="o" style={{ fontFamily: MONO, fontSize: 11.5, color: '#5e5648' }}>{`${d.sro} sub-registrars`}</span>],
                      ['Deeds in', <span key="l" style={{ fontSize: 13, color: '#3d382f' }}>{d.langs}</span>],
                    ].map(([k, node]) => (
                      <div key={k} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8c8471', width: 64, flex: 'none' }}>{k}</span>
                        {node}
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.55, color: INK_60, marginTop: 13 }}>{d.recordDesc}</div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* process */}
      {tab === 'process' && (
        <section style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 32px 0', animation: 'piqFadeUp .3s ease-out both' }}>
          <div style={{ border: `1px solid ${INK}`, background: CARD, padding: '28px 26px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
              <h2 style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 600, margin: 0 }}>Ten stages, in order</h2>
              <div style={{ flex: 1, height: 1, background: '#e0d8c4', minWidth: 20 }} />
              <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: INK_60 }}>NGDRS · four-month limit from execution</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,200px),1fr))', marginTop: 20 }}>
              {STEPS.map(([title, desc], i) => (
                <div key={title} style={{ padding: '0 18px 24px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <svg viewBox="0 0 26 26" width="24" height="24" style={{ flex: 'none' }} aria-hidden="true">
                      <circle cx="13" cy="13" r="12" fill={PAPER_HI} stroke={GREEN} strokeWidth="1" />
                      <circle cx="13" cy="13" r="4.4" fill={GREEN} />
                    </svg>
                    <div style={{ flex: 1, height: 1, background: 'repeating-linear-gradient(90deg,#cfc6b0 0 3px,transparent 3px 7px)' }} />
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.14em', color: '#8f3a24', marginTop: 12 }}>{String(i + 1).padStart(2, '0')}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.35, marginTop: 5 }}>{title}</div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, color: INK_60, marginTop: 5 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,280px),1fr))', gap: 18, marginTop: 18 }}>
            {ORDER.map((id) => {
              const d = S[id];
              return (
                <div key={id} style={{ border: `1px solid ${RULE}`, borderLeft: `3px solid ${d.accent}`, background: CARD, padding: '20px 20px 16px' }}>
                  <div style={{ fontFamily: SERIF, fontSize: 16.5, fontWeight: 600 }}>{d.name}</div>
                  <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: INK_60, marginTop: 13 }}>Stamp duty by</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                    {d.methods.map((m) => (
                      <span key={m} style={{ border: `1px solid ${RULE}`, background: PAPER_HI, padding: '4px 9px', fontFamily: MONO, fontSize: 10, color: '#5e5648' }}>{m}</span>
                    ))}
                  </div>
                  {d.payNote && <div style={{ fontSize: 12.5, lineHeight: 1.55, color: '#8f3a24', marginTop: 12 }}>{d.payNote}</div>}
                  <div style={{ fontFamily: MONO, fontSize: 11, color: '#8c8471', marginTop: 12, borderTop: `1px solid ${RULE_2}`, paddingTop: 11 }}>{d.payPortal}</div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* exemptions */}
      {tab === 'exempt' && (
        <section style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 32px 0', animation: 'piqFadeUp .3s ease-out both' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 18 }}>
            {ORDER.map((id) => {
              const d = S[id];
              return (
                <div key={id} style={{ border: `1px solid ${RULE}`, background: CARD, padding: '22px 22px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true"><polygon points={shapePts(d.shape, 20)} fill={d.accent} /></svg>
                    <span style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 600 }}>{d.name}</span>
                  </div>
                  <div style={{ marginTop: 14 }}>
                    {d.exempt.map((e) => (
                      <div key={e.type} style={{ padding: '13px 0', borderTop: `1px solid ${RULE_2}` }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: INK, flex: 1 }}>{e.type}</span>
                          <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.08em', color: e.saving === 'Nothing' ? '#8f2d1c' : '#2f5d44' }}>{e.saving}</span>
                        </div>
                        <div style={{ fontSize: 12.5, lineHeight: 1.55, color: '#4a443b', marginTop: 5 }}>{e.details}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* jurisdiction */}
      {tab === 'juris' && (
        <section style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 32px 0', animation: 'piqFadeUp .3s ease-out both' }}>
          <div style={{ border: `1px solid ${INK}`, background: CARD }}>
            {ORDER.map((id) => {
              const d = S[id];
              const concurrent = /concurrent|cross/i.test(d.jurisType);
              const art = concurrent
                ? ['M20 40 H 180', 'M20 40 V 22', 'M73 40 V 22', 'M126 40 V 22', 'M180 40 V 22']
                : ['M100 42 V 24'];
              const dots = concurrent
                ? [{ cx: 20 }, { cx: 73 }, { cx: 126 }, { cx: 180 }].map((p) => ({ ...p, cy: 18, r: 5, fill: d.tint }))
                : [{ cx: 100, cy: 18, r: 6, fill: d.accent }];
              return (
                <div key={id} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,280px),1fr))', gap: 26, padding: '24px 26px', borderBottom: `1px solid ${RULE_2}` }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <svg viewBox="0 0 22 22" width="19" height="19" aria-hidden="true"><polygon points={shapePts(d.shape, 22)} fill={d.accent} /></svg>
                      <span style={{ fontFamily: SERIF, fontSize: 17.5, fontWeight: 600 }}>{d.name}</span>
                    </div>
                    <div style={{ display: 'inline-block', border: `1px solid ${d.accent}`, color: d.accent, padding: '3px 10px', fontFamily: MONO, fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', marginTop: 12 }}>{d.jurisType}</div>
                    <svg viewBox="0 0 200 54" style={{ width: '100%', maxWidth: 230, height: 'auto', marginTop: 16 }} aria-hidden="true">
                      <g fill="none" stroke={d.accent} strokeWidth="1">
                        {art.map((p, i) => <path key={i} d={p} />)}
                      </g>
                      {dots.map((dot, i) => <circle key={i} cx={dot.cx} cy={dot.cy} r={dot.r} fill={dot.fill} stroke={d.accent} strokeWidth="1" />)}
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, lineHeight: 1.65, color: '#3d382f', textWrap: 'pretty' }}>{d.jurisRule}</div>
                    <div style={{ borderLeft: `2px solid ${d.accent}`, background: PAPER_HI, padding: '11px 14px', marginTop: 14, fontSize: 13.5, lineHeight: 1.6, color: '#4a443b' }}>{d.jurisTip}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section style={{ maxWidth: 1240, margin: '0 auto', padding: '44px 32px 0' }}>
        <div style={{ border: '1px dashed #b9ae94', background: PAPER_HI, padding: '20px 24px', display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ border: '1px solid #9a7b2a', color: '#9a7b2a', padding: '3px 10px', fontFamily: MONO, fontSize: 9.5, letterSpacing: '.18em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>In development</span>
          <span style={{ flex: 1, minWidth: 260, fontSize: 14, lineHeight: 1.65, color: '#4a443b', textWrap: 'pretty' }}>
            Live circle-rate lookup by pincode, and a saved case file that carries your route, costs and checklist across the four tools.
          </span>
        </div>
      </section>

      <div style={{ marginTop: 52, borderTop: `1px solid ${INK}`, background: '#ece7d9' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '11px 32px', display: 'flex', gap: 20, flexWrap: 'wrap', fontFamily: MONO, fontSize: 10.5, letterSpacing: '.06em', color: INK_60 }}>
          <span>COVERAGE — HIMACHAL PRADESH · MAHARASHTRA · KARNATAKA · PUNJAB</span>
          <span style={{ color: '#8f3a24' }}>LEGAL INFORMATION, NOT LEGAL ADVICE</span>
        </div>
      </div>

      <footer style={{ background: '#ece7d9', borderTop: `1px solid ${RULE}` }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '22px 32px 40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,280px),1fr))', gap: 20 }}>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: '#5e5648', maxWidth: 520 }}>
            Conversions are exact arithmetic; the local unit itself can vary by district, so confirm against the record before you rely on an area.
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
