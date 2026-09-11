# HANDOVER - 2026-06-08

Shift-change report for the next Claude session. Read this first.

## TL;DR
**PropertyIQ** — an AI property due-diligence web app for India (React/Vite SPA + a small Node backend for an agentic eligibility checker). This session was a **demo-day firefight followed by a full security hardening pass**. The headline outcome:

- We discovered the GitHub repo (`SpunkyMartian/bhoomisetu`) was **PUBLIC with live API keys committed**. **Google auto-revokes API keys found in public repos**, which is why every Gemini key we created kept dying within minutes during the demo.
- **Fixed it properly:** removed all hardcoded secrets, added an in-app "paste your Gemini key" box, added CI + a test suite (including a guard that blocks committing secrets), cleaned up lint/dead code, and **made the repo private**.
- **Current state: green.** Lint clean · 19/19 tests pass · build OK · pushed (commit `773b26b`) with no secret-scanning block · deployed to Vercel with **zero keys in the bundle**.

Live URL: **https://propertyiq.vercel.app** (Vercel project `propertyiq`).

> **Migration note (2026-08-17):** The old Vercel project `spunkymartians-projects/legal-ai-hackathon` (URL `https://legal-ai-hackathon-gamma.vercel.app`) was retired. The app now lives at the new project/URL above. If the old URL is still reachable, delete the old project in the Vercel dashboard (Project → Settings → Delete Project).

---

## The product (5 nav tabs)
- **Home** — branding (PropertyIQ / "Know Before You Buy").
- **Can I Buy?** (`EligibilityTab`) — form → LLM research agent verdict, grounded in live India Kanoon lookups, with a deterministic rule-engine floor and an **offline rule-based fallback** if the backend is down. *(Backend-dependent.)*
- **Decode Contract** (`UnderstandTab`) — upload PDF (Scribe.js, client-side) or paste text → **Explain** or **Analyze Risk** via Gemini, output in the user's chosen language + native script. **Now runs server-side** (`POST /api/understand`): the Gemini key lives in a server env var, the browser sends only the contract text, and the user pastes no key. *(Backend-dependent.)*
- **Compare Costs** (`StampDutyTab`) and **Toolkit** (`ToolsTab`) — deterministic stamp-duty comparison + reference tools.

## Architecture
- **Frontend:** React 19 + Vite 8, plain JS/JSX. Almost everything is in `src/App.jsx` (~1800 lines). Data in `src/data/`, AI/parse helpers in `src/lib/`.
- **Backend (eligibility agent only):** exists because a browser cannot call the India Kanoon API / scrape gov sites (CORS preflight 401). Two deploy targets, **kept in sync by hand**:
  - Local: `server/index.js` (zero-dep Node http, port 8787; Vite proxies `/api` → 8787 via `npm run server`).
  - Vercel: `api/eligibility.js` + `api/health.js` (serverless; `vercel.json` sets `maxDuration: 60`).
- **Keys now (post-remediation):**
  - **Server (both features):** the eligibility agent AND Decode Contract read `GEMINI_API_KEYS` (comma-separated, round-robin + 429/503 failover) and `INDIAN_KANOON_TOKEN` from env vars only. **No code fallback**, and no key ships in the client bundle. Set these locally (env) and on Vercel. Decode's server path is `src/lib/decodeContract.js`, exposed by `api/understand.js` (Vercel) and `server/index.js` (local).

---

## What got done this session
1. **Demo firefight** (see Gotchas) — fixed a frozen-localhost (stale dev server) and chased dying Gemini keys.
2. **Security review** (`/security-review`) — 2 confirmed HIGH findings: committed Gemini key (client bundle + 4 files) and committed India Kanoon token (3 files + HANDOVER). CORS/SSRF/XSS examined and ruled out / downgraded.
3. **Full remediation (the "full fix"):**
   - Stripped every hardcoded key/token from `src/lib/gemini.js`, `server/index.js`, `api/eligibility.js`, `api/health.js`, and `HANDOVER.md`.
   - Added the in-app Gemini-key box in `UnderstandTab` (threads `setGeminiKey`; verified paste→Save→enabled).
   - Added CI + tests (see File map).
   - Fixed eslint (Node globals for `server/**`,`api/**`) and removed dead code (`callClaude`, `LEGAL_KB`, `LANGUAGES`, `SAMPLE_CLAUSES`, unused `rr`).
   - Made the repo **private**; committed (`773b26b`) and pushed cleanly.

## What worked / what didn't (bugs found & fixed)
- **"Can't click anything" / frozen localhost** — NOT a code bug. A Vite dev server left running for hours across many commits serves a corrupted hot-reload bundle. **Fix: kill the vite process, restart, and hard-refresh the browser (Cmd+Shift+R).**
- **Dropdowns "won't open"** — NOT a code bug. Native `<select>` popups don't render inside embedded preview panes/webviews. **Fix: open in a real standalone browser window.** (Verified the dropdowns + cascade work in the actual code.)
- **Gemini keys dying within minutes** — root cause was **public-repo key auto-revocation by Google**, not ephemeral tokens. Deploys made it worse (a ~2-min build outlived the key). **Fixed by removing keys from the repo entirely + making it private.**
- **"Servers are busy" masking real errors** — `friendlyError()` (App.jsx) used too broad a regex (matched the word "gemini"), hiding 401/auth failures. **Fixed:** auth/key errors now say "Your Gemini API key is invalid or expired"; only genuine 500/503/429 say "Servers are busy".
- **GitHub push protection** blocked pushes containing keys (twice we used the one-click unblock URL). After removing all keys, pushes succeed with no block.
- **`understand.js` not Node-importable** — it imported `../data/clauseLibrary` without the `.js` extension (Vite tolerated it, Node ESM doesn't). **Fixed** → unblocked `node --test`.

## Key decisions & why
- **Keys never in code.** Client = user-supplied (localStorage); server = env vars only. The only way to be safe in a client-side app + avoid auto-revocation.
- **Made the repo private** (was public) — stops Google from revoking any future committed key and limits exposure.
- **CI guard over trust** — `test/no-hardcoded-secrets.test.mjs` fails the build if any `AIzaSy…`/`AQ.`/40-hex literal lands in `src/server/api`. This is the regression test for the exact disaster that happened.
- **Tests target pure logic** (Node `node:test`, zero new deps) — `App.jsx` (React/JSX) isn't unit-tested; the testable domain logic lives in `src/lib/` and `src/data/`.
- **Never fabricate citations** remains the core guardrail; a test asserts the clause library cites only Suraj Lamp (2012) + Pioneer Urban (2019).

## Gotchas for the next session
- **`server/index.js` ⇄ `api/eligibility.js` are duplicated — keep them IN SYNC** on any agent/prompt/schema/tool change.
- **Don't commit keys.** CI will fail (`no-hardcoded-secrets.test.mjs`), and if the repo ever goes public again, keys get auto-revoked.
- **Frozen localhost?** Restart the dev server + hard-refresh. **Dropdowns won't open?** Use a real browser, not a preview pane. (Neither is a code bug.)
- **`gemini-2.5-flash` thinking truncates JSON** — keep `thinkingConfig.thinkingBudget: 0` on every JSON-mode call (already set in `gemini.js` + both backends).
- The user's Gemini keys are **`AQ.`-format** and DO work when not leaked; durable non-expiring keys (`AIzaSy…`) come from a **billing-enabled** Google Cloud project.
- `npm test` uses Node's built-in runner (`node --test`); test files are `*.test.mjs`.

## Next steps (prioritized)
1. **⚠️ ROTATE the leaked credentials** (they were public → compromised): regenerate the Gemini key(s) at https://aistudio.google.com/apikey and reissue the India Kanoon token. (User action.)
2. **Set fresh Vercel env vars**: `GEMINI_API_KEYS` (comma-separated) and `INDIAN_KANOON_TOKEN` → Redeploy. **Both** the eligibility agent and Decode Contract now use `GEMINI_API_KEYS` server-side, so it must be set for every environment you deploy (Production + Preview). The variable name must be exactly `GEMINI_API_KEYS` (or `GEMINI_API_KEY`) — any other name is ignored.
3. **(Optional) Purge git history** — old commits still contain the keys (rotation makes them useless, but to scrub): `pip install git-filter-repo` → put each leaked string in `secrets.txt` → `git filter-repo --replace-text secrets.txt` → `git push --force --all`. Rewrites history (done before this repo).
4. **Optional polish:** extend the live India-Kanoon agent to "Decode Contract" so it cites live sources; add more states/pincodes; address the Vite chunk-size warning (dynamic-import Scribe more aggressively).

## File map (most important first)
- `src/App.jsx` — entire UI: `TABS`, `HomeTab`, `EligibilityTab` (+ `AgentReport`, `LocalReport`, rule engine, `friendlyError`, `PINCODES`), `UnderstandTab` (now with the **Gemini-key box**), `StampDutyTab`, `ToolsTab`.
- `src/lib/gemini.js` — browser Gemini client (`callGemini`/`callGeminiJSON`); `DEFAULT_GEMINI_KEY = ""`; retry/backoff; `thinkingBudget:0`; `GEMINI_KEY_STORAGE = "propertyiq_gemini_key"`.
- `src/lib/understand.js` — Decode prompts, language→script map, grounding assembler. (Imports `clauseLibrary.js` **with** `.js`.)
- `src/lib/parseDocument.js` — Scribe.js client-side PDF parse (dynamic import) + paste path; `scribe-canvas-stub.js`/`node-stub.js` make it build for the browser.
- `src/data/clauseLibrary.js` — 25 mined clauses (the analyzer's citable grounding; only real statutes + Suraj Lamp/Pioneer Urban).
- `src/data/constants.js`, `legalKB.js`, `propertyLawDatabase.js` — KB / rule-engine / stamp-duty / tools data.
- `server/index.js` — local backend agent (Node http, port 8787; env-only keys; `runAgent`; `SYSTEM` prompt; CORS; `fetch_url` allow-list).
- `api/eligibility.js`, `api/health.js` — Vercel serverless mirrors (env-only keys).
- **CI & tests (new this session):**
  - `.github/workflows/ci.yml` — lint → test → build on push/PR (Node 22).
  - `src/lib/gemini.test.mjs` — `parseJsonLoose` defenses.
  - `src/lib/understand.test.mjs` — state/doc detection, script map, grounding, prompt rules, RISK_SCHEMA.
  - `src/data/clauseLibrary.test.mjs` — data integrity + no-fabricated-citations guard.
  - `test/no-hardcoded-secrets.test.mjs` — **fails CI if a key/token is committed.**
- `eslint.config.js` — adds Node globals for `server/**`,`api/**`.
- `vite.config.js` — react plugin, scribe aliases, worker externals, `/api` dev proxy.
- `package.json` — name `propertyiq`; scripts: `dev`, `server`, `build`, `lint`, `test`.

## Run locally
```bash
npm install
npm run dev        # app → http://localhost:5173  (Decode + eligibility call the backend on :8787)

# Optional, for the "Can I Buy?" live agent (rule-based fallback works without it):
GEMINI_API_KEYS="<key>" INDIAN_KANOON_TOKEN="<token>" npm run server   # backend → :8787

npm test           # 19 tests (logic + secret guard)
npm run lint       # clean
npm run build
```
