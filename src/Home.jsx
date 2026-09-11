// PropertyIQ — redesigned Home page.
// Drop this file in as `src/Home.jsx` in the Property-IQ repo.
// It imports the map data already vendored at src/data/indiaMap.js.
//
// Wiring (in src/App.jsx):
//   import Home from './Home';
//   ...
//   {tab === 'home' && <Home onNavigate={setTab} />}
//
// onNavigate is called with one of: 'eligibility' | 'contract' | 'costs' | 'toolkit'
// Map those to whatever tab keys your App already uses. If you pass nothing,
// the buttons are inert but everything else works.

import { useState, useRef, useEffect, useCallback } from 'react';
import indiaMap from './data/indiaMap.js';

/* ---------------------------------------------------------------- tokens */

const PAPER = '#f2eee3';
const PAPER_HI = '#f4f0e6';
const CARD = '#f7f3e9';
const INK = '#191714';
const INK_60 = '#7a7161';
const GREEN = '#1d3a2d';
const RULE = '#ded5c0';
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
.piq-home a { color:#8f3a24; text-decoration:none; border-bottom:1px solid rgba(143,58,36,.35); }
.piq-home a:hover { color:${INK}; border-bottom-color:${INK}; }
.piq-home table { border-collapse:collapse; }`;

/* ------------------------------------------------------------------ data */

const DATA = {
  hp: {
    name: 'Himachal Pradesh', mapName: 'Himachal Pradesh', native: 'हिमाचल प्रदेश', nativeFont: DEV,
    abbr: 'HP', accent: '#2f5d44', tint: '#e7eee9', mapTint: '#cddfd3', shape: 'triangle',
    duty: '6% male · 4% female', reg: '2%', record: 'Jamabandi', portal: 'himbhoomilmk.nic.in',
    unit: 'Bigha, Biswa, Kanal', lang: 'हिन्दी · English', langFont: DEV, sro: '143 offices',
    verdict: 'Himachal applies additional conditions to buyers from outside the state.',
    body: 'Nothing here rules your purchase out, but two conditions are worth settling before you commit. Both are checked first in the eligibility report, and each flag names the section it comes from.',
    checks: [
      'Agricultural land: prior State Government permission is required for a non-agriculturist, under s.118 of the HP Tenancy & Land Reforms Act 1972.',
      'A buyer who is not an HP resident is charged 12% stamp duty plus 2% registration, rather than the resident rate.',
      'Ownership is proved by the Jamabandi record, available on himbhoomilmk.nic.in.',
    ],
  },
  mh: {
    name: 'Maharashtra', mapName: 'Maharashtra', native: 'महाराष्ट्र', nativeFont: DEV,
    abbr: 'MH', accent: '#33302b', tint: '#e9e6df', mapTint: '#d7d3c8', shape: 'diamond',
    duty: '6% male · 5% female (Mumbai MC)', reg: '1%, capped ₹30,000', record: '7/12 Extract (Saat-Baara)',
    portal: 'mahabhulekh.maharashtra.gov.in', unit: 'Guntha, Are, Hectare',
    lang: 'मराठी · English', langFont: DEV, sro: '504 offices',
    verdict: 'Maharashtra registers tenancy differently from most other states.',
    body: 'The rules here are workable, but one common assumption does not hold, and the taxable value may not be the price you agreed. Both are flagged with their source in the eligibility report.',
    checks: [
      'A Leave & License agreement must be registered regardless of duration, under s.55 of the Maharashtra Rent Control Act — the eleven-month practice used elsewhere does not apply.',
      'Stamp duty on a Leave & License is 0.25% of total rent plus deposit.',
      'A sale deed is assessed on the Ready Reckoner rate, which may exceed your agreed consideration.',
    ],
  },
  ka: {
    name: 'Karnataka', mapName: 'Karnataka', native: 'ಕರ್ನಾಟಕ', nativeFont: KAN,
    abbr: 'KA', accent: '#8f3a24', tint: '#f2e8e3', mapTint: '#e8cec3', shape: 'square',
    duty: '5% — no gender concession', reg: '1% + 0.1% cess', record: 'RTC / Pahani',
    portal: 'kaveri.karnataka.gov.in', unit: 'Gunta, Cent, Acre',
    lang: 'ಕನ್ನಡ · English', langFont: KAN, sro: '169 offices',
    verdict: 'Two assumptions carried from northern states do not hold in Karnataka.',
    body: 'Neither is a barrier, but both are easy to discover late — at the counter, or after the draft has been prepared. The eligibility report raises them early, with the relevant provision named.',
    checks: [
      'There is no gender concession in Karnataka: 5% applies to all buyers, under the state\u2019s own Stamp Act of 1957.',
      'Deeds are accepted in English or Kannada only, so a Hindi or Punjabi draft will need to be redrawn.',
      'Physical stamp paper was discontinued in 2002; e-stamping is the only route. Rural property at or below ₹45 lakh is charged at 3%.',
    ],
  },
  pb: {
    name: 'Punjab', mapName: 'Punjab', native: 'ਪੰਜਾਬ', nativeFont: GUR,
    abbr: 'PB', accent: '#9a7b2a', tint: '#f1ebdb', mapTint: '#e7dcbc', shape: 'circle',
    duty: '7% male · 5% female (urban)', reg: '1% + 1% cess', record: 'Jamabandi / Fard',
    portal: 'igrpunjab.gov.in', unit: 'Kanal, Marla, Acre',
    lang: 'ਪੰਜਾਬੀ · English', langFont: GUR, sro: '82 offices',
    verdict: 'Punjab carries the highest urban rate of the four states covered.',
    body: 'The cost is the main thing to plan for, and one citation is worth checking in any draft you are handed. The eligibility report sets out both against their source.',
    checks: [
      'An urban sale deed is charged at 7% for a male buyer and 5% for a female buyer, with a 1% Social Infrastructure Cess in some areas; rural rates are 5% and 3%.',
      'Tenancy is governed by the Punjab Rent Act 1995. Agreements citing the repealed 1949 Act rest on law no longer in force, and we flag that clause.',
      'Ownership is proved by the Jamabandi or Fard record, available on igrpunjab.gov.in.',
    ],
  },
};
const ORDER = ['hp', 'mh', 'ka', 'pb'];

const MOTIF = {
  hp: ['M4 20 L 17 5 L 30 20', 'M24 20 L 36 9 L 48 20', 'M2 20 L 54 20'],
  mh: ['M3 8 Q 15 2 27 8 T 51 8', 'M3 14 Q 15 8 27 14 T 51 14', 'M3 20 Q 15 14 27 20 T 51 20'],
  ka: ['M5 19 L 53 19', 'M11 13 L 47 13', 'M18 7 L 40 7', 'M29 7 L 29 19'],
  pb: ['M4 20 L 54 20', 'M10 20 L 10 6', 'M17 20 L 17 3', 'M24 20 L 24 9', 'M31 20 L 31 4', 'M38 20 L 38 8', 'M45 20 L 45 5'],
};

const NAV = [
  { key: 'home', label: 'Home' },
  { key: 'eligibility', label: 'Eligibility Check' },
  { key: 'contract', label: 'Decode Contract' },
  { key: 'costs', label: 'Compare Costs' },
  { key: 'toolkit', label: 'Toolkit' },
];

const TOOLS = [
  { num: '01', key: 'eligibility', name: 'Eligibility Check', accent: '#2f5d44', shape: 'triangle', desc: 'A short form about who you are and what you are buying, checked against the restrictions in force in your destination state — so a condition like Himachal\u2019s s.118 surfaces before you commit, not after.', meta: 'Every flag names the section behind it' },
  { num: '02', key: 'contract', name: 'Decode Contract', accent: '#33302b', shape: 'diamond', desc: 'Paste or upload a deed or rent agreement. It marks clauses that are one-sided, mandatory clauses that are missing, and any that rest on a repealed act.', meta: 'Hindi · Marathi · Punjabi · Kannada · English' },
  { num: '03', key: 'costs', name: 'Compare Costs', accent: '#8f3a24', shape: 'square', desc: 'Stamp duty, registration fee and cess for all four states side by side, with the concessions each state actually grants — and the ones it does not.', meta: 'Rates, not estimates · verify on the state portal' },
  { num: '04', key: 'toolkit', name: 'Toolkit', accent: '#9a7b2a', shape: 'circle', desc: 'Land-unit converter, property-ID hierarchy, the ten-step registration process, exemptions and jurisdiction rules — the reference material, unbundled.', meta: '15+ land units · 4 state hierarchies' },
];

const CAPS = [
  { q: 'Am I even allowed to buy this?', a: 'Restrictions by state, property type and buyer status — including the agriculturist and NRI conditions.' },
  { q: 'What will it actually cost me?', a: 'Stamp duty, registration fee and cess on your value, in the state where the property sits.' },
  { q: 'Do I qualify for a concession?', a: 'Female, joint, rural and family-gift rates — and the states that grant none.' },
  { q: 'Is this contract fair to me?', a: 'One-sided termination, lock-ins, deposit sizes and waivers of rent-control rights, marked clause by clause.' },
  { q: 'What is missing from the draft?', a: 'Mandatory clauses your deed type requires but the document never mentions.' },
  { q: 'Is a sale through GPA safe?', a: 'A General Power of Attorney does not transfer title, and we say so wherever it appears.' },
  { q: 'Must this be registered?', a: 'Lease-registration thresholds by state, including the Maharashtra rule that disregards duration.' },
  { q: 'Which act governs my tenancy?', a: 'The act currently in force, not the repealed one your agreement may still cite.' },
  { q: 'How large is the plot, really?', a: 'Bigha, Biswa, Kanal, Marla, Guntha, Gunta, Cent and Are, converted to a common measure.' },
  { q: 'Which record proves ownership?', a: 'Jamabandi, 7/12 extract or RTC — and the state portal it is drawn from.' },
  { q: 'Which office do I go to?', a: 'Jurisdiction rules, concurrent-registration exceptions, and the documents to carry.' },
  { q: 'What does this clause mean?', a: 'Plain-language explanation in Hindi, Marathi, Punjabi or Kannada, in the correct script.' },
];

const ROWS = [
  { label: 'Sale deed duty', key: 'duty' },
  { label: 'Registration fee', key: 'reg' },
  { label: 'Land record', key: 'record' },
  { label: 'Records portal', key: 'portal' },
  { label: 'Units used', key: 'unit' },
  { label: 'Deed language', key: 'lang', fontKey: 'langFont' },
  { label: 'Sub-registrars', key: 'sro' },
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

const pad2 = (n) => String(n).padStart(2, '0');

/* ------------------------------------------------------------- component */

export default function Home({ onNavigate }) {
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [centers, setCenters] = useState(null);
  const svgRef = useRef(null);

  const go = useCallback((key) => { if (typeof onNavigate === 'function') onNavigate(key); }, [onNavigate]);

  // Measure state centroids from the rendered map. getBBox() can report an
  // all-zero rect before layout settles, so retry per frame until every
  // covered state measures non-degenerate. viewBox coords — measure once.
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
          let b = null;
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
  }, []);

  const pick = (id) => {
    if (!from) { setFrom(id); setTo(null); return; }
    if (from === id) { setFrom(null); setTo(null); return; }
    if (!to) { setTo(id); return; }
    setFrom(id); setTo(null);
  };
  const reset = () => { setFrom(null); setTo(null); };

  const hasRoute = !!(from && to);
  const src = from ? DATA[from] : null;
  const dest = to ? DATA[to] : null;

  const byName = {};
  ORDER.forEach((id) => { byName[DATA[id].mapName] = id; });
  const locs = indiaMap.locations || [];

  let mapRoute = '';
  let mapMarks = [];
  if (hasRoute && centers) {
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

  const colIds = hasRoute ? [from, to] : ORDER;
  const pickerLabel = !from ? 'Step one — where do you live?' : !to ? 'Step two — where are you buying?' : 'Your route';

  return (
    <div className="piq-home" style={{ fontFamily: SANS, background: PAPER, color: INK, minHeight: '100vh', overflowX: 'hidden' }}>
      <style>{STYLE_CSS}</style>

      {/* ------------------------------------------------------- header */}
      <header style={{ borderBottom: `1px solid ${INK}`, background: CARD, position: 'relative' }}>
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
            {NAV.map((n) => {
              const active = n.key === 'home';
              return (
                <button
                  key={n.key}
                  onClick={() => go(n.key)}
                  style={{
                    fontFamily: MONO, fontSize: 11, letterSpacing: '.06em', padding: '10px 14px',
                    borderBottom: `2px solid ${active ? GREEN : 'transparent'}`,
                    border: 'none', borderBottomWidth: 2, borderBottomStyle: 'solid',
                    borderBottomColor: active ? GREEN : 'transparent',
                    background: 'none', cursor: 'pointer',
                    color: active ? GREEN : INK_60, fontWeight: active ? 600 : 400,
                  }}
                >{n.label}</button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* --------------------------------------------------------- hero */}
      <section style={{ position: 'relative', borderBottom: `1px solid ${INK}`, background: PAPER_HI, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(#cfc6b0 1px,transparent 1px)', backgroundSize: '22px 22px', opacity: 0.5, pointerEvents: 'none' }} />
        <svg viewBox="0 0 400 400" style={{ position: 'absolute', left: -130, bottom: -170, width: 420, height: 420, opacity: 0.5, pointerEvents: 'none' }} aria-hidden="true">
          <g fill="none" stroke={GREEN} strokeWidth="0.7">
            <circle cx="200" cy="200" r="60" /><circle cx="200" cy="200" r="96" />
            <circle cx="200" cy="200" r="132" /><circle cx="200" cy="200" r="168" />
          </g>
        </svg>

        <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '60px 32px 56px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,400px),1fr))', gap: 52, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: GREEN, padding: '6px 13px', whiteSpace: 'nowrap', maxWidth: '100%' }}>
              <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: '#e8e2d2', fontWeight: 500 }}>Cross-state property copilot</span>
            </div>
            <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(40px,5.6vw,64px)', lineHeight: 1, fontWeight: 700, letterSpacing: '-1.8px', margin: '22px 0 0', textWrap: 'pretty' }}>
              Buy property<br />with confidence.
            </h1>
            <div style={{ width: 78, height: 3, background: '#8f3a24', margin: '26px 0 0' }} />
            <p style={{ fontSize: 17, lineHeight: 1.62, color: '#3d382f', margin: '22px 0 0', maxWidth: 540, textWrap: 'pretty' }}>
              PropertyIQ is your copilot for buying, renting or gifting property across states in India — who is allowed to buy, what it will cost, and what is hidden in the contract. In plain language, backed by real Indian law.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 30 }}>
              <button onClick={() => go('eligibility')} style={{ background: GREEN, color: PAPER_HI, padding: '14px 26px', fontSize: 14, fontWeight: 600, fontFamily: SANS, border: 'none', cursor: 'pointer', boxShadow: '4px 4px 0 #c6bda6' }}>Start an eligibility check</button>
              <button onClick={() => go('contract')} style={{ border: `1px solid ${INK}`, background: 'transparent', padding: '14px 24px', fontSize: 14, fontWeight: 600, fontFamily: SANS, color: INK, cursor: 'pointer' }}>Decode a contract</button>
            </div>
          </div>

          {/* map plate */}
          <div style={{ position: 'relative', padding: 14 }}>
            {[
              { left: 0, top: 0, borderLeft: '1px solid #8f3a24', borderTop: '1px solid #8f3a24' },
              { right: 0, top: 0, borderRight: '1px solid #8f3a24', borderTop: '1px solid #8f3a24' },
              { left: 0, bottom: 0, borderLeft: '1px solid #8f3a24', borderBottom: '1px solid #8f3a24' },
              { right: 0, bottom: 0, borderRight: '1px solid #8f3a24', borderBottom: '1px solid #8f3a24' },
            ].map((s, i) => <div key={i} style={{ position: 'absolute', width: 16, height: 16, ...s }} />)}

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <svg ref={svgRef} viewBox={indiaMap.viewBox} style={{ width: '100%', maxWidth: 400, height: 'auto', maxHeight: 460, display: 'block' }} role="img" aria-label="Map of India with covered states highlighted">
                {locs.map((loc) => {
                  const id = byName[loc.name];
                  const sel = id && (id === from || id === to);
                  return (
                    <path
                      key={loc.id}
                      d={loc.path}
                      data-sid={id || loc.id}
                      fill={sel ? DATA[id].accent : id ? DATA[id].mapTint : '#e8e1ce'}
                      stroke={PAPER_HI}
                      strokeWidth={sel ? 1.2 : 0.8}
                      style={{ transition: 'fill .25s' }}
                    />
                  );
                })}
                {/* second pass: covered-state outlines, so no neighbour fill overdraws them */}
                {locs.filter((loc) => byName[loc.name]).map((loc) => {
                  const id = byName[loc.name];
                  const sel = id === from || id === to;
                  return (
                    <path key={`o-${loc.id}`} d={loc.path} fill="none" stroke={sel ? PAPER_HI : DATA[id].accent} strokeWidth={sel ? 1.3 : 1} strokeLinejoin="round" />
                  );
                })}
                {mapRoute && (
                  <path d={mapRoute} fill="none" stroke="#8f3a24" strokeWidth="1.6" strokeDasharray="1200" style={{ animation: 'piqDrawRoute .9s ease-out both' }} />
                )}
                {mapMarks.map((m, i) => (
                  <g key={i} transform={m.t}>
                    <circle cx="0" cy="0" r={m.r} fill="#8f3a24" />
                    <circle cx="0" cy="0" r={m.r2} fill="none" stroke="#8f3a24" strokeWidth="0.8" />
                  </g>
                ))}
              </svg>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', marginTop: 14 }}>
              <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8f3a24', marginRight: 4 }}>
                {hasRoute ? `${src.name} → ${dest.name}` : 'Four states covered'}
              </span>
              {ORDER.map((id) => {
                const sel = id === from || id === to;
                return (
                  <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', border: `1px solid ${sel ? DATA[id].accent : RULE}`, background: sel ? DATA[id].tint : 'transparent' }}>
                    <svg viewBox="0 0 8 8" width="7" height="7"><rect width="8" height="8" fill={DATA[id].accent} /></svg>
                    <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.12em', color: '#5e5648' }}>{DATA[id].name}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------- section statement */}
      <section style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '58px 32px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))', gap: 40, alignItems: 'end' }}>
          <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(27px,3.5vw,40px)', lineHeight: 1.08, fontWeight: 700, letterSpacing: '-.8px', margin: 0, textWrap: 'pretty' }}>
            Every state is a different<br />country when you buy land.
          </h2>
          <p style={{ fontSize: 15.5, lineHeight: 1.62, color: '#4a443b', margin: 0, textWrap: 'pretty' }}>
            The rate, the record, the unit of measurement and the act governing your tenancy all change at the border. Choose where you live, then where you are buying.
          </p>
        </div>
        <div style={{ height: 1, background: INK, marginTop: 24 }} />
        <div style={{ height: 4, background: `repeating-linear-gradient(90deg,${INK} 0 1px,transparent 1px 7px)`, opacity: 0.35 }} />
      </section>

      {/* ------------------------------------------------- state pickers */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 32px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '.18em', textTransform: 'uppercase', color: GREEN, fontWeight: 600 }}>{pickerLabel}</span>
          <div style={{ flex: 1, height: 1, background: RULE, minWidth: 20 }} />
          <button onClick={reset} style={{ background: 'none', border: '1px solid #d6cdb8', padding: '6px 13px', fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: INK_60, cursor: 'pointer' }}>Reset</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,200px),1fr))', gap: 20 }}>
          {ORDER.map((id) => {
            const d = DATA[id];
            const isFrom = from === id, isTo = to === id, sel = isFrom || isTo;
            const accent = sel ? d.accent : '#9c947f';
            return (
              <button key={id} onClick={() => pick(id)} style={{ position: 'relative', display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer', padding: 0, background: 'none', border: 'none', font: 'inherit' }}>
                <div style={{
                  position: 'relative', border: `1px solid ${sel ? d.accent : RULE}`, background: sel ? d.tint : CARD,
                  borderRadius: '999px 999px 2px 2px', padding: '30px 20px 22px', minHeight: 212,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden',
                  transition: 'background .2s,border-color .2s,box-shadow .2s',
                  boxShadow: sel ? `5px 5px 0 ${d.tint}, 5px 5px 0 1px ${d.accent}` : 'none',
                }}>
                  <svg viewBox="0 0 200 120" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: 120, opacity: sel ? 0.5 : 0.22, pointerEvents: 'none' }} aria-hidden="true">
                    <g fill="none" stroke={accent} strokeWidth="0.6">
                      <path d="M -20 118 Q 100 44 220 118" />
                      <path d="M -20 130 Q 100 56 220 130" />
                      <path d="M -20 142 Q 100 68 220 142" />
                    </g>
                  </svg>
                  <svg viewBox="0 0 26 26" width="26" height="26" style={{ display: 'block', position: 'relative' }} aria-hidden="true">
                    <polygon points={shapePts(d.shape, 26)} fill={accent} />
                  </svg>
                  <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.24em', color: accent, marginTop: 14 }}>{d.abbr}</div>
                  <div style={{ fontFamily: SERIF, fontSize: 19, lineHeight: 1.18, fontWeight: 600, textAlign: 'center', marginTop: 8, color: INK }}>{d.name}</div>
                  <div style={{ fontFamily: d.nativeFont, fontSize: 13, color: '#8c8471', marginTop: 6, textAlign: 'center' }}>{d.native}</div>
                  <div style={{ marginTop: 'auto', paddingTop: 18 }}>
                    <svg viewBox="0 0 58 24" width="66" height="27" style={{ display: 'block' }} aria-hidden="true">
                      <g fill="none" stroke={accent} strokeWidth="1" strokeLinecap="round" opacity="0.75">
                        {MOTIF[id].map((p, i) => <path key={i} d={p} />)}
                      </g>
                    </svg>
                  </div>
                </div>
                {sel && (
                  <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', background: d.accent, color: CARD, padding: '3px 11px', fontFamily: MONO, fontSize: 9, fontWeight: 500, letterSpacing: '.18em', whiteSpace: 'nowrap' }}>
                    {isFrom ? 'YOU LIVE HERE' : 'BUYING HERE'}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* --------------------------------------------------- route panel */}
      {hasRoute && (
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 32px 0' }}>
          <div style={{ position: 'relative', background: CARD, border: `1px solid ${INK}`, animation: 'piqFadeUp .34s ease-out both' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '14px 26px', borderBottom: '1px solid #e0d8c4', background: dest.tint }}>
              <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: '#5e5648' }}>
                {`${src.name.toUpperCase()}  →  ${dest.name.toUpperCase()}`}
              </span>
              <div style={{ flex: 1, minWidth: 16 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))' }}>
              <div style={{ padding: '30px 30px 30px 26px', borderRight: '1px solid #e0d8c4' }}>
                <h3 style={{ fontFamily: SERIF, fontSize: 'clamp(20px,2.3vw,27px)', lineHeight: 1.32, fontWeight: 600, margin: 0, textWrap: 'pretty' }}>{dest.verdict}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.68, color: '#4a443b', margin: '14px 0 0', textWrap: 'pretty' }}>{dest.body}</p>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginTop: 26 }}>
                  <button onClick={() => go('eligibility')} style={{ background: GREEN, color: PAPER_HI, padding: '12px 22px', fontSize: 13.5, fontWeight: 600, fontFamily: SANS, border: 'none', cursor: 'pointer', boxShadow: '3px 3px 0 #c6bda6' }}>
                    {`Run the ${dest.name} eligibility check`}
                  </button>
                </div>
              </div>
              <div style={{ padding: '26px 26px 26px 30px' }}>
                {dest.checks.map((text, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '26px minmax(0,1fr)', gap: 12, padding: '13px 0', borderBottom: '1px solid #e8e0cc', alignItems: 'start' }}>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: dest.accent, paddingTop: 4 }}>{pad2(i + 1)}</span>
                    <span style={{ fontSize: 14, lineHeight: 1.55, color: '#3d382f' }}>{text}</span>
                  </div>
                ))}
                <p style={{ fontSize: 12.5, lineHeight: 1.6, color: INK_60, margin: '16px 0 0' }}>
                  Stamp duty is levied by the state where the property is located — Indian Stamp Act, s.19. Your home state&rsquo;s rate does not travel with you.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* -------------------------------------------- comparison table */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 32px 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: SERIF, fontSize: 25, fontWeight: 600, margin: 0 }}>What changes at the border</h2>
          <div style={{ flex: 1, height: 1, background: INK, minWidth: 20 }} />
          <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: INK_60 }}>
            {hasRoute ? 'Showing your two states' : 'Select a route to narrow this'}
          </span>
        </div>

        <div style={{ overflowX: 'auto', marginTop: 18 }}>
          <table style={{ width: '100%', minWidth: 600 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '0 18px 12px 0', width: 180 }} />
                {colIds.map((id) => {
                  const d = DATA[id];
                  const accent = (id === from || id === to) ? d.accent : INK;
                  return (
                    <th key={id} style={{ textAlign: 'left', padding: '0 18px 12px', borderBottom: `2px solid ${accent}` }}>
                      <div style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 600, color: accent }}>{d.name}</div>
                      <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8c8471', marginTop: 4 }}>
                        {id === from ? 'Your state' : id === to ? 'Destination' : 'Covered'}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r, i) => (
                <tr key={r.key}>
                  <td style={{ padding: '16px 18px 16px 0', borderTop: `1px solid ${RULE}`, verticalAlign: 'top', fontFamily: MONO, fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: INK_60, background: i % 2 ? 'transparent' : 'rgba(25,23,20,0.02)' }}>{r.label}</td>
                  {colIds.map((id) => (
                    <td key={id} style={{ padding: '16px 18px', borderTop: `1px solid ${RULE}`, verticalAlign: 'top', fontSize: 14.5, lineHeight: 1.5, color: INK, background: to === id ? DATA[id].tint : 'transparent', fontFamily: r.fontKey ? DATA[id][r.fontKey] : SANS }}>
                      {DATA[id][r.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ------------------------------------------------ capability band */}
      <section style={{ position: 'relative', background: GREEN, color: '#eae5d7', marginTop: 64, overflow: 'hidden' }}>
        <svg viewBox="0 0 300 300" style={{ position: 'absolute', right: -70, top: -70, width: 340, height: 340, opacity: 0.14, pointerEvents: 'none' }} aria-hidden="true">
          <g fill="none" stroke="#e8e2d2" strokeWidth="0.8">
            <circle cx="150" cy="150" r="52" /><circle cx="150" cy="150" r="84" />
            <circle cx="150" cy="150" r="116" /><circle cx="150" cy="150" r="148" />
          </g>
        </svg>
        <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '56px 32px 60px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: 36, alignItems: 'end' }}>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: '#c9a15f' }}>Everything you can settle here</div>
              <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(26px,3.3vw,36px)', lineHeight: 1.12, fontWeight: 600, margin: '14px 0 0', letterSpacing: '-.5px', textWrap: 'pretty' }}>
                Twelve questions you would<br />otherwise pay to have answered.
              </h2>
            </div>
            <p style={{ fontSize: 14.5, lineHeight: 1.66, color: 'rgba(234,229,215,.74)', margin: 0, textWrap: 'pretty' }}>
              Each answer names the statute it came from, so you can check it yourself. Where the law is unsettled, or the question falls outside the four states we cover, we say so rather than guess.
            </p>
          </div>
          <div style={{ height: 1, background: 'rgba(234,229,215,.28)', margin: '26px 0 0' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,290px),1fr))', gap: '0 48px' }}>
            {CAPS.map((c, i) => (
              <div key={c.q} style={{ display: 'grid', gridTemplateColumns: '36px minmax(0,1fr)', gap: 14, padding: '21px 0', borderBottom: '1px solid rgba(234,229,215,.16)', alignItems: 'start' }}>
                <span style={{ fontFamily: MONO, fontSize: 11, color: '#c9a15f', paddingTop: 3 }}>{pad2(i + 1)}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4, color: '#f4f0e4' }}>{c.q}</div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'rgba(234,229,215,.66)', marginTop: 5, textWrap: 'pretty' }}>{c.a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- tool cards */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 32px 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: SERIF, fontSize: 25, fontWeight: 600, margin: 0 }}>The Four tools</h2>
          <div style={{ flex: 1, height: 1, background: INK, minWidth: 20 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,270px),1fr))', gap: 20, marginTop: 22 }}>
          {TOOLS.map((t) => (
            <article
              key={t.num}
              onClick={() => go(t.key)}
              style={{ position: 'relative', background: CARD, border: `1px solid ${RULE}`, borderTop: `3px solid ${t.accent}`, padding: '24px 22px 22px', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontFamily: MONO, fontSize: 11, color: t.accent }}>{t.num}</span>
                <svg viewBox="0 0 18 18" width="15" height="15" aria-hidden="true"><polygon points={shapePts(t.shape, 18)} fill={t.accent} opacity="0.5" /></svg>
              </div>
              <h3 style={{ fontFamily: SERIF, fontSize: 19, fontWeight: 600, margin: '14px 0 0' }}>{t.name}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: '#4a443b', margin: '9px 0 0', textWrap: 'pretty' }}>{t.desc}</p>
              <div style={{ marginTop: 'auto', paddingTop: 18 }}>
                <div style={{ height: 1, background: '#e4dbc7' }} />
                <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.1em', textTransform: 'uppercase', color: '#8c8471', marginTop: 11 }}>{t.meta}</div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ coverage strip */}
      <div style={{ marginTop: 64, borderTop: `1px solid ${INK}`, background: '#ece7d9' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '11px 32px', display: 'flex', gap: 20, flexWrap: 'wrap', fontFamily: MONO, fontSize: 10.5, letterSpacing: '.06em', color: INK_60 }}>
          <span>COVERAGE — HIMACHAL PRADESH · MAHARASHTRA · KARNATAKA · PUNJAB</span>
          <span style={{ color: '#8f3a24' }}>LEGAL INFORMATION, NOT LEGAL ADVICE</span>
        </div>
      </div>

      <footer style={{ background: '#ece7d9', borderTop: `1px solid ${RULE}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '22px 32px 40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,280px),1fr))', gap: 20 }}>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: '#5e5648', maxWidth: 520 }}>
            Before you sign anything, have a registered advocate read it — or visit your nearest District Legal Services Authority, where the review is free.
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
