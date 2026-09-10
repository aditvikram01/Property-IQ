# BhoomiSetu — Ideation Brief (for feature/workflow brainstorming)

> Paste this whole document into Claude / Gemini and ask it to ideate. It is self-contained — the model does **not** have access to the codebase.

---

## 1. What the product is

**BhoomiSetu** is a *Cross-State Property Transaction Copilot for India*. It helps ordinary citizens (especially Tier-2/3 buyers) who are buying, selling, renting, or gifting property **in a state different from where they live** — the situation where most costly mistakes happen, because every state has its own stamp duty, land units, terminology, rent law, and registration quirks.

Currently scoped to **4 states**: Himachal Pradesh, Maharashtra, Karnataka, Punjab.

Tagline: *"Navigate cross-state property transactions with confidence."* It provides **legal information, not legal advice.**

## 2. How it's built (constraints any idea must respect)

- **100% client-side React SPA** (React 19 + Vite). No backend, no database, no auth, no server.
- **All knowledge is hardcoded** in front-end data files: a statute "knowledge base", a stamp-duty rate table, a property-law database (8 structured "sheets"), document checklists, and sample contracts.
- **Two operating modes for every feature:**
  1. **Local mode (default, no key):** deterministic rule engine + the hardcoded DB. Must always work fully **offline**.
  2. **AI mode (optional):** if the user pastes an Anthropic API key (stored in browser localStorage), features call Claude directly from the browser to produce richer written explanations. The key is optional enrichment, never required.
- **Design principle:** graceful degradation. The rule-based core must stand on its own; AI only enhances.

## 3. Features that exist today (6 tabs)

1. **Home** — landing page, feature cards, "why this matters" stats, optional API-key entry.
2. **Pre-Flight Check** — a ~19-field form (home state, property state, txn type, property type, gender, value, municipal/rural status, agriculturist status, GPA vs registered deed, RERA, lease term, etc.). Produces an **Eligibility Risk Report**: a top-level risk badge (CRITICAL/HIGH/MEDIUM/LOW), specific flags with statutory source, a stamp-duty estimate, matched DB laws, document list, and registration steps. Has hardcoded rules for the big traps (HP Section 118, Maharashtra Section 63 agriculturist proof, FEMA block on NRI agri land, GPA-sale invalidity, lease-registration thresholds, circle-rate/RERA checks).
3. **Contract Analyzer** — paste a rent agreement / sale deed / gift deed → flags risky clauses & missing mandatory clauses. Local mode does keyword/pattern matching against a "Contract Clause Flags" sheet (wrong rent-control act, lease > registration threshold, GPA transfer, one-sided clauses…). AI mode does a full clause-by-clause review. Has 3 built-in sample contracts.
4. **Stamp Duty Comparator** — enter txn type, gender, value → side-by-side stamp+registration+cess cost across all 4 states and area categories, with cheapest vs most-expensive callout.
5. **Tools & Reference** — sub-tabs: land-unit converter (15+ units), property-ID hierarchy by state, 10-step NGDRS registration process, stamp-duty exemptions guide, jurisdiction guide.
6. **Translate & Explain** — paste a legal clause → plain-language explanation + (AI mode) translation into Hindi / Punjabi / Kannada / Marathi.

## 4. Data assets already in the app (reusable raw material for new features)

- **Statute knowledge base** — per-state law cards (governing acts, the one critical restriction per state, stamp rates, land records portal, ID hierarchy, SRO counts, payment methods) + central laws (Transfer of Property Act, Registration Act, Indian Stamp Act, RERA, FEMA, Hindu Succession Act).
- **Structured property-law DB (8 sheets):** Land Purchase Restrictions · Stamp Duty Rates · Registration Process · Definitions & Eligibility · Central Laws · Contract Clause Flags · Verification Links · TO-DO & Gaps. Columns include things like statutory source, India Code / Indian Kanoon links, penalty for violation, common pitfalls, confidence level, last-verified date.
- **Lookup tables:** area categories, full stamp-duty rate matrix (state × txn × area × gender), registration steps, property-ID hierarchies, land-unit→sqft conversions, payment methods, state exemptions, jurisdiction rules, accepted languages, ready-reckoner/circle-rate info, document checklists, sample contracts, sample clauses.

## 5. Hard guardrails (NON-NEGOTIABLE — ideas must not break these)

- **Never fabricate legal citations.** Cite only statute names + section numbers already in the KB (and the one permitted case, *Suraj Lamp 2012* on GPA≠title). Inventing case law is treated as professional misconduct in this domain.
- **Legal information, not legal advice** — every output must keep the disclaimer + "consult a registered advocate / nearest DLSA."
- **Stamp duty is always levied by the state where the property is located** (Indian Stamp Act §19), not the buyer's home state.
- State-specific truths that must stay correct: Karnataka has **no** gender concession; Maharashtra Leave & License **must** be registered regardless of duration; Punjab is governed by the **1995** Rent Act (not the repealed 1949 act); HP §118 blocks non-agriculturists from agricultural land.
- Must keep working **offline / without an API key.**

## 6. Known gaps & opportunity surface (starting points, not limits)

- Only 4 states; rules are hardcoded and dated "June 2026" — staleness/coverage is a real limitation.
- No document upload/OCR (analyzer is paste-text only); no PDF/Word export of reports.
- No persistence beyond the API key (no saved cases, no history, no shareable links).
- Pre-Flight and Analyzer don't talk to each other; there's no end-to-end "guided journey."
- No cost/timeline planner, no checklist you can tick through, no reminders for the 4-month registration deadline.
- No comparison *between your two states* specifically; comparator shows all 4 generically.
- Translate is clause-by-clause, not whole-document.
- Accessibility, mobile UX, and trust/citation-surfacing (showing the user *exactly* which law a flag came from) are thin.

---

## YOUR TASK (instructions to the brainstorming model)

You are a product strategist + legal-tech designer. Using the brief above, help make BhoomiSetu **more holistic** — a coherent copilot rather than 6 separate tools. Please produce:

1. **5–8 new feature ideas**, each with: the user problem, what it does, why it fits cross-state property pain, which existing data assets it reuses, and rough build complexity (S/M/L) given the *client-side, optionally-AI* architecture.
2. **2–3 connected end-to-end workflows** (user journeys) that chain existing + new features — e.g. "I'm in Punjab buying a farmhouse in HP" walked from first question to registration-ready, with hand-offs between tabs.
3. **Quick wins vs. bigger bets** — sort your ideas.
4. For each idea, note **how it behaves in local (no-key) mode vs. AI mode**, since the app must work offline.

**Respect the guardrails in §5.** Prefer ideas that deepen trust (surfacing the exact statutory source behind every claim), reduce cross-state mistakes, and turn the static knowledge base into guided, personalized journeys. Be concrete and India-property-specific, not generic SaaS advice.
