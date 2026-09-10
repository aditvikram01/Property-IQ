# ⚖️ PropertyIQ — *Know Before You Buy*

PropertyIQ helps ordinary people figure out a property deal in India **before** they sign anything. Buying or renting across states (Himachal Pradesh, Maharashtra, Karnataka, Punjab) is full of traps — who's even allowed to buy, what it'll cost in stamp duty, and whether the contract is quietly screwing you over. This app answers those questions in plain language, backed by real Indian law.

Built for the **Code of Law Challenge 2026**.

> ⚠️ This is **legal information, not legal advice.** Always confirm with a registered advocate or your nearest DLSA before acting.

---

## What it does

Five tabs, four of them genuinely useful and one that's just nice:

- **🔍 Can I Buy?** — Fill a short form and get a clear "yes / it's complicated / no" verdict, written like a friend explaining it to you. Behind the scenes an AI research agent looks up the actual statutes and case law on India Kanoon, but a hard-coded rule engine always has the final say so the answer is never wrong on the important stuff (e.g. an outsider buying farmland in HP is *always* flagged).
- **📄 Decode Contract** — Upload a PDF (or paste text) of a deed/agreement and get a plain-language explanation **or** a risk analysis, in your language (English, Hindi, Marathi, Punjabi, Kannada — in the right script).
- **💰 Compare Costs** — Stamp duty + registration charges side by side across states, including who gets concessions.
- **🛠️ Toolkit** — Handy reference stuff: unit converter, property-ID hierarchy, jurisdiction lookup, exemptions.
- **🏠 Home** — The landing page.

---

## Run it locally

You'll need **Node 18+**. Then:

```bash
npm install
npm run dev
```

That starts the app at **http://localhost:5173**. Open it and you're good — the rule-based features (eligibility, stamp duty, toolkit) all work out of the box, no keys needed.

### Want the live AI features too? (optional)

The **AI research agent** ("Can I Buy?" deep research) and **Decode Contract** need a little more. In a **second terminal**, start the small backend:

```bash
npm run server
```

That runs on **http://localhost:8787**, and the app automatically talks to it (Vite proxies `/api` → `8787`). When it's up, the "Can I Buy?" tab shows a green *"live legal-research agent"* banner.

The backend needs a **Google Gemini key** (and optionally an India Kanoon token). Pass them as env vars:

```bash
GEMINI_API_KEYS="your-gemini-key" INDIAN_KANOON_TOKEN="your-ik-token" npm run server
```

> 💡 **Free Gemini keys are rate-limited.** The agent makes several calls per request, so on a free key you'll often hit *"servers are busy"* (a 429/quota error). For a smooth demo, enable billing on the key — it's cheap. You can also pass several keys comma-separated (`GEMINI_API_KEYS="key1,key2"`) and it'll rotate between them.

If the backend is down or out of quota, the app quietly falls back to the offline rule engine so you always get an answer.

---

## How it's built

- **Frontend:** React 19 + Vite 8, plain JS/JSX. Almost everything lives in `src/App.jsx`. Data is in `src/data/`, AI + PDF helpers in `src/lib/`.
- **Backend (for the AI agent only):** a tiny zero-dependency Node server (`server/index.js`). It exists because a browser *can't* call the India Kanoon API directly (CORS blocks it), so this holds the keys and does the lookups.
- **The agent:** Gemini does function-calling over three tools — search India Kanoon, read a document, fetch a gov page — then writes a final structured report. A deterministic **rule engine is the source of truth**; the AI just researches and explains. It can only cite sources it actually found, so it never makes up a law.
- **PDF parsing:** done in the browser with Scribe.js (handles both digital and scanned PDFs).

```
src/
  App.jsx            the whole UI
  data/              states, stamp duty, clause library, legal KB
  lib/               gemini client, contract-decode prompts, PDF parsing
server/index.js      local backend (AI agent)
api/                 same backend as Vercel serverless functions
```

---

## Deploy

It's deployed on **Vercel** (connected to GitHub — every push to `main` redeploys).

- The frontend builds with `npm run build`.
- The backend lives in `api/` as serverless functions (`api/health.js`, `api/eligibility.js`).
- Set `GEMINI_API_KEYS` and `INDIAN_KANOON_TOKEN` as environment variables in the Vercel project settings.

> 🔑 **Don't commit real keys.** Keep them in env vars (local shell + Vercel settings), not in the source. If you've shared a key anywhere, rotate it.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the app (http://localhost:5173) |
| `npm run server` | Start the AI backend (http://localhost:8787) |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

---

## Coverage & disclaimer

Covers **Himachal Pradesh, Maharashtra, Karnataka, and Punjab**, for **sale deeds and rent agreements**, with law as of **June 2026**.

PropertyIQ gives you legal *information* to ask better questions — it is **not** a substitute for a lawyer. For anything you're about to sign, get a registered advocate (or your nearest DLSA / free legal aid) to review it.
