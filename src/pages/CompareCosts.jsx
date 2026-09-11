// PropertyIQ — Compare Costs.
// Drop this in as `src/CompareCosts.jsx` in the Property-IQ repo.
//
// Wiring (in src/App.jsx):
//   import CompareCosts from './CompareCosts';
//   ...
//   {tab === 'costs' && <CompareCosts onNavigate={setTab} />}
//
// Self-contained: fonts + keyframes injected by the component, inline styles
// only. RATES mirrors src/data/constants.js STAMP_DUTY.

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
@keyframes piqGrowBar { from { transform:scaleX(0); } to { transform:scaleX(1); } }
.piq-cc a { color:#8f3a24; text-decoration:none; border-bottom:1px solid rgba(143,58,36,.35); }
.piq-cc a:hover { color:${INK}; border-bottom-color:${INK}; }
.piq-cc input:focus { outline:2px solid ${GREEN}; outline-offset:-2px; }
.piq-cc input[type=range] { -webkit-appearance:none; appearance:none; height:4px; background:${RULE}; }
.piq-cc input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:18px; height:18px; background:${GREEN}; border:2px solid ${PAPER_HI}; cursor:pointer; }`;

const S = {
  hp: { name: 'Himachal Pradesh', native: 'हिमाचल प्रदेश', nativeFont: DEV, accent: '#2f5d44', tint: '#e7eee9', shape: 'triangle', note: 'Non-HP residents are charged 12% duty with 2% registration on a sale deed — the rates here are the resident rates.' },
  mh: { name: 'Maharashtra', native: 'महाराष्ट्र', nativeFont: DEV, accent: '#33302b', tint: '#e9e6df', shape: 'diamond', note: 'Registration fee is capped at ₹30,000. Metro cess of 1% applies in Mumbai, Thane, Navi Mumbai, Pune, PCMC and Nagpur.' },
  ka: { name: 'Karnataka', native: 'ಕರ್ನಾಟಕ', nativeFont: KAN, accent: '#8f3a24', tint: '#f2e8e3', shape: 'square', note: 'No gender concession anywhere in the state. Rural property valued at or below ₹45 lakh drops to the 3% slab.' },
  pb: { name: 'Punjab', native: 'ਪੰਜਾਬ', nativeFont: GUR, accent: '#9a7b2a', tint: '#f1ebdb', shape: 'circle', note: 'A 1% Social Infrastructure Cess applies in some areas. Rural rates run two points below urban.' },
};
const ORDER = ['hp', 'mh', 'ka', 'pb'];

const RATES = {
  hp: {
    sale: { 'General / Urban': { male: 6, female: 4, joint: 5, reg: 2, cess: 0 }, Rural: { male: 6, female: 4, joint: 5, reg: 2, cess: 0 } },
    rent: {
      'General / Urban': { male: 0, female: 0, joint: 0, reg: 0, cess: 0, dutyFlatMax: 500, dutyFlatText: '₹100–500 stamp paper for a term of 11 months or less' },
      Rural: { male: 0, female: 0, joint: 0, reg: 0, cess: 0, dutyFlatMax: 500, dutyFlatText: '₹100–500 stamp paper for a term of 11 months or less' },
    },
    gift: { 'General / Urban': { male: 5, female: 3, joint: 4, reg: 2, cess: 0 }, Rural: { male: 5, female: 3, joint: 4, reg: 2, cess: 0 } },
  },
  mh: {
    sale: {
      'Mumbai Municipal Corp': { male: 6, female: 5, joint: 6, reg: 1, cess: 1, regCap: 30000 },
      'Pune / Nagpur / Other MC': { male: 5, female: 4, joint: 5, reg: 1, cess: 1, regCap: 30000 },
      'Rural Maharashtra': { male: 5, female: 4, joint: 5, reg: 1, cess: 0, regCap: 30000 },
    },
    rent: {
      'Mumbai Municipal Corp': { male: 0.25, female: 0.25, joint: 0.25, reg: 0, cess: 0, regFlat: 1000 },
      'Pune / Nagpur / Other MC': { male: 0.25, female: 0.25, joint: 0.25, reg: 0, cess: 0, regFlat: 1000 },
      'Rural Maharashtra': { male: 0.25, female: 0.25, joint: 0.25, reg: 0, cess: 0, regFlat: 500 },
    },
    gift: {
      'Mumbai Municipal Corp': { male: 3, female: 2, joint: 3, reg: 1, cess: 0 },
      'Pune / Nagpur / Other MC': { male: 3, female: 2, joint: 3, reg: 1, cess: 0 },
      'Rural Maharashtra': { male: 3, female: 2, joint: 3, reg: 1, cess: 0 },
    },
  },
  ka: {
    sale: {
      'Bangalore Urban (BBMP)': { male: 5, female: 5, joint: 5, reg: 1, cess: 0.1 },
      'Other Urban': { male: 5, female: 5, joint: 5, reg: 1, cess: 0.1 },
      'Rural (≤45L value)': { male: 3, female: 3, joint: 3, reg: 1, cess: 0.06 },
    },
    rent: {
      'Bangalore Urban (BBMP)': { male: 1, female: 1, joint: 1, reg: 0, cess: 0, dutyCap: 500 },
      'Other Urban': { male: 1, female: 1, joint: 1, reg: 0, cess: 0, dutyCap: 500 },
      'Rural (≤45L value)': { male: 1, female: 1, joint: 1, reg: 0, cess: 0, dutyCap: 500 },
    },
    gift: {
      'Bangalore Urban (BBMP)': { male: 5, female: 5, joint: 5, reg: 1, cess: 0.1 },
      'Other Urban': { male: 5, female: 5, joint: 5, reg: 1, cess: 0.1 },
      'Rural (≤45L value)': { male: 3, female: 3, joint: 3, reg: 1, cess: 0.06 },
    },
  },
  pb: {
    sale: { 'Urban (MC limits)': { male: 7, female: 5, joint: 6, reg: 1, cess: 1 }, Rural: { male: 5, female: 3, joint: 4, reg: 1, cess: 0 } },
    rent: {
      'Urban (MC limits)': { male: 0, female: 0, joint: 0, reg: 0, cess: 0, dutyFlatMax: 500, dutyFlatText: '₹100–500 stamp paper for a term of 11 months or less' },
      Rural: { male: 0, female: 0, joint: 0, reg: 0, cess: 0, dutyFlatMax: 500, dutyFlatText: '₹100–500 stamp paper for a term of 11 months or less' },
    },
    gift: { 'Urban (MC limits)': { male: 6, female: 4, joint: 5, reg: 1, cess: 0 }, Rural: { male: 4, female: 2, joint: 3, reg: 1, cess: 0 } },
  },
};

const TIER_MAP = {
  urban: { hp: 'General / Urban', mh: 'Mumbai Municipal Corp', ka: 'Bangalore Urban (BBMP)', pb: 'Urban (MC limits)' },
  metroLess: { hp: 'General / Urban', mh: 'Pune / Nagpur / Other MC', ka: 'Other Urban', pb: 'Urban (MC limits)' },
  rural: { hp: 'Rural', mh: 'Rural Maharashtra', ka: 'Rural (≤45L value)', pb: 'Rural' },
};

const EXEMPTIONS = [
  { state: 'hp', type: 'Female buyer', details: '4% stamp duty against 6% for a male buyer.', saving: '2% of property value' },
  { state: 'hp', type: 'Family gift deed', details: 'Gift to a lineal descendant at the reduced 3–5% band.', saving: '1–3% of property value' },
  { state: 'mh', type: 'Female buyer', details: '1% concession — 5% against 6% inside Mumbai Municipal Corporation.', saving: '1% of property value' },
  { state: 'mh', type: 'Family gift deed', details: 'Agricultural or residential gift to a spouse, child or grandchild: ₹200 stamp duty.', saving: 'Up to 5–6% of property value' },
  { state: 'ka', type: 'Rural property at or below ₹45 lakh', details: '3% stamp duty instead of 5%.', saving: '2% of property value' },
  { state: 'ka', type: 'No gender concession', details: 'Karnataka grants no gender-based concession at any value.', saving: 'Nothing' },
  { state: 'pb', type: 'Female buyer', details: '2% concession — 5% against 7% urban, 3% against 5% rural.', saving: '2% of property value' },
  { state: 'pb', type: 'Rural property', details: 'Rural rates run below urban across every transaction type.', saving: '2% of property value' },
];

const NAV = [
  { key: 'home', label: 'Home' },
  { key: 'eligibility', label: 'Eligibility Check' },
  { key: 'contract', label: 'Decode Contract' },
  { key: 'costs', label: 'Compare Costs' },
  { key: 'toolkit', label: 'Toolkit' },
];

const inr = (n) => (isFinite(n) ? `₹${Math.round(n).toLocaleString('en-IN')}` : '₹0');

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

const labelCap = { fontFamily: MONO, fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: INK_60 };

function Pick({ label, options, value, onPick, glyphs }) {
  return (
    <div>
      <span style={labelCap}>{label}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 10 }}>
        {options.map((o) => {
          const on = value === o.key;
          return (
            <button key={o.key} onClick={() => onPick(o.key)} style={{ display: 'flex', alignItems: 'center', gap: 11, border: `1px solid ${on ? GREEN : FIELD_BORDER}`, background: on ? GREEN : PAPER_HI, color: on ? PAPER_HI : INK, padding: '11px 14px', cursor: 'pointer', fontFamily: SANS, fontSize: 13.5, fontWeight: 600, textAlign: 'left' }}>
              {glyphs && o.shape && (
                <svg viewBox="0 0 16 16" width="13" height="13" style={{ flex: 'none' }} aria-hidden="true">
                  <polygon points={shapePts(o.shape, 16)} fill={on ? '#c9a15f' : '#9c947f'} />
                </svg>
              )}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- component */

export default function CompareCosts({ onNavigate }) {
  const [txn, setTxn] = useState('sale');
  const [gender, setGender] = useState('male');
  const [tier, setTier] = useState('urban');
  const [value, setValue] = useState(7500000);

  const go = useCallback((key) => { if (typeof onNavigate === 'function') onNavigate(key); }, [onNavigate]);
  const isRent = txn === 'rent';

  const quote = (id) => {
    const cat = TIER_MAP[tier][id];
    const r = (RATES[id][txn] || {})[cat];
    if (!r) return null;
    const dutyRate = r[gender];

    // Fixed stamp-paper amounts and statutory caps, where the state uses them.
    let duty, dutyFlat = false, dutyCapped = false;
    if (r.dutyFlatMax) { duty = r.dutyFlatMax; dutyFlat = true; }
    else {
      duty = (value * dutyRate) / 100;
      if (r.dutyCap && duty > r.dutyCap) { duty = r.dutyCap; dutyCapped = true; }
    }

    let reg, regFlat = false;
    if (r.regFlat) { reg = r.regFlat; regFlat = true; }
    else {
      reg = (value * r.reg) / 100;
      if (r.regCap && reg > r.regCap) reg = r.regCap;
    }

    const cess = (value * (r.cess || 0)) / 100;
    return { cat, duty, reg, cess, total: duty + reg + cess, dutyRate, regRate: r.reg, cessRate: r.cess || 0,
      dutyFlat, dutyFlatText: r.dutyFlatText, dutyCapped, dutyCap: r.dutyCap, regFlat };
  };

  const quotes = ORDER.map((id) => ({ id, ...S[id], q: quote(id) })).filter((x) => x.q);
  const totals = quotes.map((x) => x.q.total);
  const max = Math.max(...totals, 1);
  const min = Math.min(...totals);
  const cheapest = quotes.find((x) => x.q.total === min);
  const dearest = quotes.find((x) => x.q.total === max);
  const rows = quotes.slice().sort((a, b) => a.q.total - b.q.total);
  const anyFlat = quotes.some((x) => x.q.dutyFlat || x.q.dutyCapped || x.q.regFlat);
  const scale = max > 0 ? 100 / max : 0;

  return (
    <div className="piq-cc" style={{ fontFamily: SANS, background: PAPER, color: INK, minHeight: '100vh', overflowX: 'hidden' }}>
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
              const on = n.key === 'costs';
              return <button key={n.key} onClick={() => go(n.key)} style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.06em', padding: '10px 14px', border: 'none', borderBottomWidth: 2, borderBottomStyle: 'solid', borderBottomColor: on ? GREEN : 'transparent', background: 'none', cursor: 'pointer', color: on ? GREEN : INK_60, fontWeight: on ? 600 : 400 }}>{n.label}</button>;
            })}
          </nav>
        </div>
      </header>

      <section style={{ position: 'relative', borderBottom: `1px solid ${INK}`, background: PAPER_HI, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(#cfc6b0 1px,transparent 1px)', backgroundSize: '22px 22px', opacity: 0.45, pointerEvents: 'none' }} />
        <svg viewBox="0 0 320 160" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, bottom: 0, width: '100%', height: 120, opacity: 0.5, pointerEvents: 'none' }} aria-hidden="true">
          <g fill="none" stroke="#c9c0ac" strokeWidth="0.8">
            <path d="M0 158 H 320 M0 132 H 320 M0 106 H 320 M0 80 H 320 M0 54 H 320" />
          </g>
        </svg>
        <div style={{ position: 'relative', maxWidth: 1240, margin: '0 auto', padding: '44px 32px 38px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', background: GREEN, padding: '6px 13px', whiteSpace: 'nowrap', maxWidth: '100%' }}>
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: '#e8e2d2', fontWeight: 500 }}>Compare costs</span>
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(32px,4.4vw,50px)', lineHeight: 1.02, fontWeight: 700, letterSpacing: '-1.2px', margin: '18px 0 0', maxWidth: 760, textWrap: 'pretty' }}>
            The same deal, priced by four different states.
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: '#3d382f', margin: '18px 0 0', maxWidth: 620, textWrap: 'pretty' }}>
            Stamp duty, registration fee and cess, side by side. Set the deal once and see what each state would charge you — and which concessions it actually grants.
          </p>
        </div>
      </section>

      {/* controls */}
      <section style={{ maxWidth: 1240, margin: '0 auto', padding: '28px 32px 0' }}>
        <div style={{ border: `1px solid ${INK}`, background: CARD, padding: '24px 26px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,230px),1fr))', gap: 24, alignItems: 'start' }}>
          <Pick
            label="Transaction" value={txn} onPick={setTxn} glyphs
            options={[{ key: 'sale', label: 'Sale deed', shape: 'square' }, { key: 'rent', label: 'Rent / Leave & License', shape: 'circle' }, { key: 'gift', label: 'Gift deed', shape: 'diamond' }]}
          />
          <Pick
            label="Registering in the name of" value={gender} onPick={setGender}
            options={[{ key: 'male', label: 'A man' }, { key: 'female', label: 'A woman' }, { key: 'joint', label: 'Jointly held' }]}
          />
          <div>
            <Pick
              label="Where it sits" value={tier} onPick={setTier}
              options={[{ key: 'urban', label: 'Metro / main city' }, { key: 'metroLess', label: 'Other urban' }, { key: 'rural', label: 'Rural' }]}
            />
            <p style={{ fontSize: 12, lineHeight: 1.5, color: '#8c8471', margin: '10px 0 0' }}>Each state names its tiers differently — the row below shows which category is being used.</p>
          </div>
          <div>
            <span style={labelCap}>{isRent ? 'Total rent plus deposit (₹)' : 'Consideration (₹)'}</span>
            <input
              type="text"
              value={value ? value.toLocaleString('en-IN') : ''}
              onChange={(e) => setValue(parseInt((e.target.value || '').replace(/[^0-9]/g, ''), 10) || 0)}
              style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 10, padding: '12px 13px', border: `1px solid ${FIELD_BORDER}`, background: PAPER_HI, fontFamily: MONO, fontSize: 16, color: INK, borderRadius: 0 }}
            />
            <input type="range" min="500000" max="50000000" step="500000" value={value} onChange={(e) => setValue(parseInt(e.target.value, 10) || 0)} style={{ display: 'block', width: '100%', marginTop: 14 }} />
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 12 }}>
              {[{ label: '₹25 L', v: 2500000 }, { label: '₹50 L', v: 5000000 }, { label: '₹75 L', v: 7500000 }, { label: '₹1.5 Cr', v: 15000000 }].map((p) => (
                <button key={p.label} onClick={() => setValue(p.v)} style={{ border: '1px solid #d6cdb8', background: 'none', padding: '5px 10px', fontFamily: MONO, fontSize: 10, letterSpacing: '.06em', color: '#5e5648', cursor: 'pointer' }}>{p.label}</button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* comparison rows */}
      <section style={{ maxWidth: 1240, margin: '0 auto', padding: '34px 32px 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: SERIF, fontSize: 23, fontWeight: 600, margin: 0 }}>Cost to close, state by state</h2>
          <div style={{ flex: 1, height: 1, background: INK, minWidth: 20 }} />
          <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: INK_60 }}>
            {`On ${inr(value)} · ${isRent ? 'rent agreement' : txn === 'gift' ? 'gift deed' : 'sale deed'}`}
          </span>
        </div>

        <div style={{ border: `1px solid ${INK}`, background: CARD, marginTop: 16 }}>
          {rows.map((x) => {
            const q = x.q;
            const isMin = q.total === min, isMax = q.total === max && max !== min;
            return (
              <div key={x.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(170px,220px) minmax(0,1fr) minmax(120px,150px)', gap: 22, alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${RULE_2}`, background: isMin ? x.tint : CARD }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <svg viewBox="0 0 24 24" width="22" height="22" style={{ flex: 'none' }} aria-hidden="true"><polygon points={shapePts(x.shape, 24)} fill={x.accent} /></svg>
                  <div>
                    <div style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 600, lineHeight: 1.15 }}>{x.name}</div>
                    <div style={{ fontFamily: x.nativeFont, fontSize: 11.5, color: '#a09781', marginTop: 3 }}>{x.native}</div>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', height: 26, border: `1px solid ${FIELD_BORDER}`, background: '#efe9db', overflow: 'hidden' }}>
                    {[{ v: q.duty, color: GREEN, t: 'Stamp duty' }, { v: q.reg, color: '#8f3a24', t: 'Registration' }, { v: q.cess, color: '#9a7b2a', t: 'Cess' }].map((b) => (
                      <div key={b.t} title={`${b.t} ${inr(b.v)}`} style={{ width: `${(b.v * scale).toFixed(2)}%`, background: b.color, transformOrigin: 'left', animation: 'piqGrowBar .6s ease-out both' }} />
                    ))}
                    <div style={{ flex: 1 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 9 }}>
                    {[
                      { color: GREEN, text: q.dutyFlat ? q.dutyFlatText
                        : q.dutyCapped ? `${q.dutyRate}% duty, capped at ${inr(q.dutyCap)}`
                        : `${q.dutyRate}% duty · ${inr(q.duty)}` },
                      { color: '#8f3a24', text: q.regFlat ? `flat ${inr(q.reg)} registration` : `${q.regRate}% reg · ${inr(q.reg)}` },
                      { color: '#9a7b2a', text: q.cessRate ? `${q.cessRate}% cess · ${inr(q.cess)}` : 'no cess' },
                    ].map((l) => (
                      <span key={l.text} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: MONO, fontSize: 10, letterSpacing: '.06em', color: '#5e5648' }}>
                        <svg viewBox="0 0 8 8" width="7" height="7" aria-hidden="true"><rect width="8" height="8" fill={l.color} /></svg>
                        {l.text}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: SERIF, fontSize: 21, fontWeight: 700, lineHeight: 1.1, color: isMin ? '#2f5d44' : isMax ? '#8f2d1c' : INK }}>
                    {q.dutyFlat ? `up to ${inr(q.total)}` : inr(q.total)}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', color: '#8c8471', marginTop: 5 }}>
                    {(q.dutyFlat || q.dutyCapped)
                      ? `fixed amount · ${q.cat}`
                      : `${value ? ((q.total / value) * 100).toFixed(2) : '0'}% of value · ${q.cat}`}
                  </div>
                  {!anyFlat && (isMin || isMax) && (
                    <div style={{ display: 'inline-block', marginTop: 8, background: isMin ? '#2f5d44' : '#8f2d1c', color: CARD, padding: '2px 9px', fontFamily: MONO, fontSize: 8.5, letterSpacing: '.14em' }}>
                      {isMin ? 'CHEAPEST' : 'DEAREST'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,260px),1fr))', gap: 22, padding: '22px 24px', background: PAPER_HI }}>
            <div>
              <div style={labelCap}>Spread across the four</div>
              <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 700, marginTop: 8, lineHeight: 1.1 }}>{inr(max - min)}</div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: '#4a443b', marginTop: 7 }}>
                {anyFlat
                  ? 'On a rent agreement most of these are fixed stamp-paper amounts or statutory caps, not a percentage of the value — so the spread here is rupees, not points.'
                  : cheapest && dearest && max !== min
                  ? `${dearest.name} costs ${inr(max - min)} more than ${cheapest.name} on the same deal — ${(((max - min) / (value || 1)) * 100).toFixed(2)}% of the value.`
                  : 'Every state charges the same on this combination.'}
              </div>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.65, color: '#4a443b' }}>
              <p style={{ margin: 0 }}>Stamp duty is levied by the state where the property is located — Indian Stamp Act, s.19 — and is charged on that state&rsquo;s published valuation, not necessarily on your agreed price.</p>
            </div>
          </div>
        </div>
      </section>

      {/* tier cards */}
      <section style={{ maxWidth: 1240, margin: '0 auto', padding: '48px 32px 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: SERIF, fontSize: 23, fontWeight: 600, margin: 0 }}>What the tiers are called</h2>
          <div style={{ flex: 1, height: 1, background: INK, minWidth: 20 }} />
          <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: INK_60 }}>Rate by area category</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,270px),1fr))', gap: 18, marginTop: 16 }}>
          {ORDER.map((id) => {
            const d = S[id];
            const table = RATES[id][txn] || {};
            const activeCat = TIER_MAP[tier][id];
            return (
              <div key={id} style={{ border: `1px solid ${RULE}`, borderTop: `3px solid ${d.accent}`, background: CARD, padding: '20px 20px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontFamily: SERIF, fontSize: 16.5, fontWeight: 600 }}>{d.name}</span>
                  <svg viewBox="0 0 18 18" width="15" height="15" aria-hidden="true"><polygon points={shapePts(d.shape, 18)} fill={d.accent} opacity="0.6" /></svg>
                </div>
                <div style={{ marginTop: 12 }}>
                  {Object.keys(table).map((cat) => {
                    const r = table[cat];
                    const rate = r.dutyFlatMax ? '₹100–500'
                      : r.dutyCap ? `${r[gender]}%, max ${inr(r.dutyCap)}`
                      : r.regFlat ? `${r[gender]}% + ${inr(r.regFlat)}`
                      : `${r[gender]}% + ${r.reg}%`;
                    const on = cat === activeCat;
                    return (
                      <div key={cat} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '9px 0', borderTop: `1px solid ${RULE_2}` }}>
                        <span style={{ flex: 1, fontSize: 13, lineHeight: 1.4, color: on ? INK : '#8c8471', fontWeight: on ? 600 : 400 }}>{cat}</span>
                        <span style={{ fontFamily: MONO, fontSize: 12.5, color: INK }}>{rate}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.55, color: INK_60, marginTop: 12, borderTop: `1px solid ${RULE_2}`, paddingTop: 11 }}>{d.note}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* gender band */}
      <section style={{ position: 'relative', background: GREEN, color: '#eae5d7', marginTop: 56, overflow: 'hidden' }}>
        <svg viewBox="0 0 300 300" style={{ position: 'absolute', right: -70, top: -70, width: 340, height: 340, opacity: 0.13, pointerEvents: 'none' }} aria-hidden="true">
          <g fill="none" stroke="#e8e2d2" strokeWidth="0.8">
            <circle cx="150" cy="150" r="52" /><circle cx="150" cy="150" r="84" />
            <circle cx="150" cy="150" r="116" /><circle cx="150" cy="150" r="148" />
          </g>
        </svg>
        <div style={{ position: 'relative', maxWidth: 1240, margin: '0 auto', padding: '52px 32px 56px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: 34, alignItems: 'end' }}>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: '#c9a15f' }}>The gender concession, measured</div>
              <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(25px,3.2vw,34px)', lineHeight: 1.14, fontWeight: 600, margin: '13px 0 0', letterSpacing: '-.4px', textWrap: 'pretty' }}>
                Three states discount it. One does not.
              </h2>
            </div>
            <p style={{ fontSize: 14.5, lineHeight: 1.66, color: 'rgba(234,229,215,.74)', margin: 0, textWrap: 'pretty' }}>
              Registering in a woman&rsquo;s name changes the duty in Himachal Pradesh, Maharashtra and Punjab. Karnataka has its own Stamp Act and grants no concession at all — the most commonly mispriced assumption on a cross-state purchase.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))', gap: 26, marginTop: 32 }}>
            {ORDER.map((id) => {
              const cat = TIER_MAP[tier][id];
              const r = (RATES[id].sale || {})[cat] || {};
              const top = Math.max(r.male || 0, r.female || 0, 1);
              const delta = (r.male || 0) - (r.female || 0);
              return (
                <div key={id} style={{ borderTop: '1px solid rgba(234,229,215,.28)', paddingTop: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 600, color: '#f4f0e4' }}>{S[id].name}</span>
                    <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', color: '#c9a15f' }}>{delta > 0 ? `−${delta} points` : 'no concession'}</span>
                  </div>
                  <div style={{ display: 'grid', gap: 9, marginTop: 14 }}>
                    {[{ label: 'MALE', v: r.male || 0, color: '#c9a15f' }, { label: 'FEMALE', v: r.female || 0, color: '#eae5d7' }].map((b) => (
                      <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.1em', color: 'rgba(234,229,215,.6)', width: 46 }}>{b.label}</span>
                        <div style={{ flex: 1, height: 9, background: 'rgba(234,229,215,.14)' }}>
                          <div style={{ width: `${((b.v / top) * 100).toFixed(0)}%`, height: 9, background: b.color, transformOrigin: 'left', animation: 'piqGrowBar .6s ease-out both' }} />
                        </div>
                        <span style={{ fontFamily: MONO, fontSize: 11, color: '#f4f0e4', width: 34, textAlign: 'right' }}>{`${b.v}%`}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'rgba(234,229,215,.62)', marginTop: 12 }}>
                    {delta > 0
                      ? `Worth ${inr((value * delta) / 100)} on this value, on a sale deed in the ${cat} band.`
                      : 'Registering in a woman\u2019s name changes nothing here.'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* concessions */}
      <section style={{ maxWidth: 1240, margin: '0 auto', padding: '52px 32px 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: SERIF, fontSize: 23, fontWeight: 600, margin: 0 }}>Concessions each state actually grants</h2>
          <div style={{ flex: 1, height: 1, background: INK, minWidth: 20 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,290px),1fr))', gap: '0 40px', marginTop: 10 }}>
          {EXEMPTIONS.map((e) => {
            const d = S[e.state];
            return (
              <div key={`${e.state}-${e.type}`} style={{ display: 'grid', gridTemplateColumns: '26px minmax(0,1fr)', gap: 14, padding: '17px 0', borderBottom: `1px solid ${RULE}`, alignItems: 'start' }}>
                <svg viewBox="0 0 20 20" width="19" height="19" style={{ marginTop: 3 }} aria-hidden="true"><polygon points={shapePts(d.shape, 20)} fill={d.accent} opacity="0.85" /></svg>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14.5, fontWeight: 600, color: INK }}>{e.type}</span>
                    <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.1em', textTransform: 'uppercase', color: d.accent }}>{d.name}</span>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: '#4a443b', marginTop: 5, textWrap: 'pretty' }}>{e.details}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10.5, color: '#8c8471', marginTop: 6 }}>{`Saves: ${e.saving}`}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section style={{ maxWidth: 1240, margin: '0 auto', padding: '44px 32px 0' }}>
        <div style={{ border: '1px dashed #b9ae94', background: PAPER_HI, padding: '20px 24px', display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ border: '1px solid #9a7b2a', color: '#9a7b2a', padding: '3px 10px', fontFamily: MONO, fontSize: 9.5, letterSpacing: '.18em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Verify before you pay</span>
          <span style={{ flex: 1, minWidth: 260, fontSize: 14, lineHeight: 1.65, color: '#4a443b', textWrap: 'pretty' }}>
            These are the published slab rates. Circle, guidance and ready-reckoner values are revised annually, so confirm the current figure on the state&rsquo;s own portal before you hand over money.
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
            Registration fees, cess and caps differ within a state as well as between states. The category shown on each row is the one being priced.
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
