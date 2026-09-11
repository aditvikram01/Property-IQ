// Shared page chrome (header · hero · coverage strip · footer) in the redesign's
// visual language. Used to wrap the AI-powered pages (Eligibility, Decode
// Contract) so they match the self-contained redesign pages (Home, Compare
// Costs, Toolkit) without touching any of their AI / backend logic.

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

const NAV = [
  { key: 'home', label: 'Home' },
  { key: 'eligibility', label: 'Eligibility Check' },
  { key: 'contract', label: 'Decode Contract' },
  { key: 'costs', label: 'Compare Costs' },
  { key: 'toolkit', label: 'Toolkit' },
];

export function SiteHeader({ active, onNavigate }) {
  const go = (key) => { if (typeof onNavigate === 'function') onNavigate(key); };
  return (
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
            const on = n.key === active;
            return (
              <button key={n.key} onClick={() => go(n.key)} style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.06em', padding: '10px 14px', border: 'none', borderBottomWidth: 2, borderBottomStyle: 'solid', borderBottomColor: on ? GREEN : 'transparent', background: 'none', cursor: 'pointer', color: on ? GREEN : INK_60, fontWeight: on ? 600 : 400 }}>{n.label}</button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

export function Hero({ kicker, title, subtitle }) {
  return (
    <section style={{ position: 'relative', borderBottom: `1px solid ${INK}`, background: PAPER_HI, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(#cfc6b0 1px,transparent 1px)', backgroundSize: '22px 22px', opacity: 0.45, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', maxWidth: 1240, margin: '0 auto', padding: '44px 32px 38px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', background: GREEN, padding: '6px 13px', whiteSpace: 'nowrap', maxWidth: '100%' }}>
          <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: '#e8e2d2', fontWeight: 500 }}>{kicker}</span>
        </div>
        <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(32px,4.4vw,50px)', lineHeight: 1.02, fontWeight: 700, letterSpacing: '-1.2px', margin: '18px 0 0', maxWidth: 760, textWrap: 'pretty' }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 16, lineHeight: 1.6, color: '#3d382f', margin: '18px 0 0', maxWidth: 620, textWrap: 'pretty' }}>{subtitle}</p>}
      </div>
    </section>
  );
}

export function CoverageStrip() {
  return (
    <div style={{ marginTop: 52, borderTop: `1px solid ${INK}`, background: '#ece7d9' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '11px 32px', display: 'flex', gap: 20, flexWrap: 'wrap', fontFamily: MONO, fontSize: 10.5, letterSpacing: '.06em', color: INK_60 }}>
        <span>COVERAGE — HIMACHAL PRADESH · MAHARASHTRA · KARNATAKA · PUNJAB</span>
        <span style={{ color: '#8f3a24' }}>LEGAL INFORMATION, NOT LEGAL ADVICE</span>
      </div>
    </div>
  );
}

export function SiteFooter({ note }) {
  return (
    <footer style={{ background: '#ece7d9', borderTop: `1px solid ${RULE}` }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '22px 32px 40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,280px),1fr))', gap: 20 }}>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: '#5e5648', maxWidth: 520 }}>
          {note || 'Before you sign anything, have a registered advocate read it — or visit your nearest District Legal Services Authority, where the review is free.'}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '.06em', color: '#8c8471', display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-start' }}>
          <span>PROPERTYIQ</span>
          <span>KNOW BEFORE YOU BUY</span>
        </div>
      </div>
    </footer>
  );
}

// Full-page wrapper for the AI tabs: paper theme + shared chrome + a centred
// content column. `children` keep their existing class-based markup, restyled
// globally by index.css — so no AI / backend wiring changes.
export function AIPage({ active, onNavigate, kicker, title, subtitle, footerNote, children }) {
  return (
    <div className="piq-ai" style={{ fontFamily: SANS, background: PAPER, color: INK, minHeight: '100vh', overflowX: 'hidden' }}>
      <SiteHeader active={active} onNavigate={onNavigate} />
      <Hero kicker={kicker} title={title} subtitle={subtitle} />
      <div className="piq-ai-body" style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 32px 0', width: '100%', boxSizing: 'border-box' }}>
        {children}
      </div>
      <CoverageStrip />
      <SiteFooter note={footerNote} />
    </div>
  );
}
