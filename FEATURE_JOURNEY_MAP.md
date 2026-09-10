# PropertyIQ — Feature ↔ User-Journey Map

> A detailed mapping of **what PropertyIQ does today** against the **ideal end-to-end property-buying journey**, with the tech behind each feature and an honest gap analysis.
>
> Scope today: Himachal Pradesh, Maharashtra, Karnataka, Punjab · sale deeds + rent agreements · law as of June 2026.
> PropertyIQ gives **legal information, not legal advice.**

---

## 1. The ideal buyer journey (the target)

A cross-state property purchase in India is really a chain of 13 questions. The safe buyer answers them **in order** — a "no" at any step should stop the deal.

| # | The buyer's question | Journey stage |
|---|---|---|
| 1 | Can I buy this? | Eligibility |
| 2 | What exactly am I buying? | Identification |
| 3 | Who actually owns it? | Ownership |
| 4 | Is the land legally transferable to me? | Transferability |
| 5 | Do I need Section 118 permission? | State restriction |
| 6 | Can I use it for what I want? | Land use / zoning |
| 7 | Is the development/project legal? | RERA / approvals |
| 8 | Is the seller's title clean? | Title diligence |
| 9 | What conditions apply to my purchase? | Conditions |
| 10 | Can I safely sign? | Contract review |
| 11 | Can I register? | Registration |
| 12 | Do the government records now show me as owner? | Mutation / records |
| 13 | What can I do with it after purchase? | Post-purchase |

---

## 2. Coverage at a glance

**Legend:** ✅ Covered well · 🟡 Partial / adjacent · ❌ Not built yet

| # | Journey question | Status | Handled by |
|---|---|---|---|
| 1 | Can I buy this? | ✅ | **Can I Buy?** (eligibility engine) |
| 2 | What exactly am I buying? | 🟡 | Form fields + **Toolkit** (property-ID hierarchy, unit converter) — no parcel verification |
| 3 | Who actually owns it? | ❌ | — (KB links to land-record portals; no lookup) |
| 4 | Is the land legally transferable to me? | ✅ | **Can I Buy?** rule engine (FEMA, §118, §63, tribal, capacity) |
| 5 | Do I need Section 118 permission? | ✅ | **Can I Buy?** (explicit HP §118 rule + application options) |
| 6 | Can I use it for what I want? | ❌ | — (no zoning / land-use / conversion check) |
| 7 | Is the development/project legal? | ❌ | — (no RERA verification) |
| 8 | Is the seller's title clean? | ❌ | — (**Decode** reads a supplied deed, not the title chain) |
| 9 | What conditions apply to my purchase? | 🟡 | **Can I Buy?** (findings, options, document plan, stamp estimate) |
| 10 | Can I safely sign? | ✅ | **Decode Contract** (clause-by-clause risk review) |
| 11 | Can I register? | 🟡 | **Toolkit** (NGDRS 10-step process) + **Compare Costs** (stamp/registration) — guidance, not e-registration |
| 12 | Do the government records now show me as owner? | ❌ | — (no mutation / record verification) |
| 13 | What can I do with it after purchase? | ❌ | — |

**The one-sentence read:** PropertyIQ today owns the **"eligibility & legality"** middle of the journey (steps 1, 4, 5, 9, 10) extremely well — that is its differentiator. The **identity, ownership, title, records, and post-purchase** slices (steps 2, 3, 6, 7, 8, 12, 13) are open — largely because they require *live government land-record and RERA data*, which the app does not yet integrate.

---

## 3. Current features — detailed table

| Current Feature | What does it do? | What does it *not* do? | Problem we solve in the user journey | How does the tech work? |
|---|---|---|---|---|
| **🔍 Can I Buy?** *(Eligibility engine)* | Takes a ~16-field form (home state, property state, pincode, transaction type, agri/non-agri, gender, age, resident type, buyer type incl. NRI/OCI, value, area, municipal-vs-rural, buying capacity, seller relationship, tribal status, lease months) and returns a **risk verdict** (CRITICAL / HIGH / MEDIUM / LOW) with specific flags, the statutory basis, alternative "what you can do instead" options, a stamp-duty estimate, and a document plan. Answers journey steps **1, 4, 5**. | Does **not** verify the *actual* parcel, its owner, its title chain, its zoning, or RERA status — it reasons from what the user *declares*, not from live land records. Does not collect land-use-conversion / GPA / RERA inputs, so those branches don't fire from the UI. | **1. Can I buy this? · 4. Is it transferable to me? · 5. Do I need §118?** The costliest cross-state mistakes (an outsider buying HP farmland; an NRI buying agri land; a non-farmer buying MH agri land) are caught *before* money moves. | **Rule engine is the source of truth; AI only explains.** On submit it always runs `buildLocalEligibilityReport(form)` — a deterministic set of `if`-rules encoding the hard traps (HP §118, FEMA agri block, MH §63, lease>11mo registration, minor/entity/tribal, Karnataka no-female-concession). If the optional backend agent is live, it POSTs `{form, ruleReport}` to `/api/eligibility`; a **Gemini function-calling loop** (≤5 rounds) researches the live law via 3 allow-listed tools (`search_indian_kanoon`, `get_indian_kanoon_doc`, `fetch_url` → indiankanoon.org / indiacode.nic.in only), then a second call emits a structured JSON report. A hard **cross-check** forces the AI verdict to never be *less* severe than the rule engine's, and the model may cite **only** sources it actually retrieved. If the backend is down/quota-limited, it silently falls back to the local rule report. |
| **📄 Decode Contract** | Upload a PDF (or paste text) of a deed/agreement → choose **Explain** (plain-language walkthrough) or **Analyze Risk** (clause-by-clause flags: risky, one-sided, or missing-mandatory clauses), output in the user's chosen **language and native script** (English, Hindi, Marathi, Punjabi, Kannada). Answers journey step **10** (and adjacent to **8**). | Does **not** check whether the *title* is clean or the seller truly owns the property — it only analyses the **text of the document it is given**. Does not fetch encumbrance certificates or prior deeds. Requires the user's own Gemini key. | **10. Can I safely sign?** Ordinary buyers can't tell a fair clause from a predatory one, or spot a *missing* mandatory clause — this reads the contract for them in their own language. | Runs **entirely client-side**. PDFs are parsed in-browser with **Scribe.js OCR** (handles scanned + digital). The text is passed to **Gemini** (browser → Google API, bring-your-own-key in `localStorage`). Before calling, `understand.js` **assembles a grounding context** — authoritative state/central legal "truths" + a mined clause library filtered to the detected state & document type — and the prompt permits citing **only** those sources (`legalBasis` must be `null` otherwise). Risk mode uses a strict JSON schema; a language rule forces every user-facing string into the chosen script. |
| **💰 Compare Costs** *(Stamp Duty)* | Enter transaction type, gender, and value → a **side-by-side table** of stamp duty + registration + cess across all four states and area categories, with a cheapest-vs-most-expensive callout. Supports journey steps **9** and **11**. | Does **not** file or pay anything, and does not read the live state ready-reckoner / circle rate — rates are from a hardcoded June-2026 table. | **9. What will it cost? / 11. Can I register (and for how much)?** Removes the biggest budgeting surprise in cross-state deals: duty is levied by the **property's** state, not the buyer's, and gender concessions differ (Karnataka has none). | Pure deterministic lookup over a hardcoded **rate matrix** (`state × transaction × area × gender`) in `src/data/`. No AI, no network — instant and always available offline. |
| **🛠️ Toolkit** *(Tools & Reference)* | A reference kit: **land-unit converter** (15+ regional units → sq ft), **property-ID hierarchy** per state, the **NGDRS 10-step registration process**, **stamp-duty exemptions** guide, and a **jurisdiction** lookup. Supports journey steps **2** and **11**. | Does **not** look up a *specific* property's ID/survey number or its jurisdiction from records — it explains the *system*, it doesn't query it. | **2. What am I buying? / 11. How do I register?** Demystifies the state-specific vocabulary (bigha vs guntha vs kanal), the ID hierarchy, and the registration steps a first-time cross-state buyer has never seen. | Static-data-driven React views over lookup tables in `src/data/` (unit conversions, ID hierarchies, registration steps, exemptions, jurisdiction rules). Deterministic; no AI or network. |
| **🏠 Home** | Landing page — branding ("PropertyIQ / Know Before You Buy"), feature cards, "why this matters" framing, and the entry point into each tab. | Not a functional step in the transaction. | Orientation / trust-building before the journey begins. | Static React component. |

---

## 4. Journey walkthrough — step by step

**Steps PropertyIQ answers well today**

- **1. Can I buy this?** → *Can I Buy?* gives an immediate risk verdict from the declared facts.
- **4. Is the land legally transferable to me?** → the rule engine encodes the real transfer restrictions: FEMA block on NRI/OCI agri land, HP §118, Maharashtra §63 agriculturist proof, entity/tribal/capacity rules. This is the app's **core differentiator**.
- **5. Do I need Section 118 permission?** → an explicit CRITICAL rule fires for HP agricultural land bought by an outsider/non-agriculturist, with concrete next-step options (apply via the DC/State Govt, qualify as an HP agriculturist, or buy converted land).
- **10. Can I safely sign?** → *Decode Contract* reviews the actual agreement clause-by-clause, in the buyer's language, grounded in real statutes only.

**Steps we touch but don't fully own**

- **2. What exactly am I buying?** → the form captures property type/area/pincode and the *Toolkit* explains the ID hierarchy, but there is **no verification of the actual parcel** against records.
- **9. What conditions apply?** → surfaced as eligibility findings, "what you can do instead" options, and a document plan — but not a personalised, trackable checklist.
- **11. Can I register?** → *Toolkit* explains the NGDRS steps and *Compare Costs* estimates the fees, but the app doesn't take the user through an actual registration.

**Steps that are genuine gaps (need live government / RERA data)**

- **3. Who actually owns it?** — no land-record/owner lookup (KB only links out to state portals).
- **6. Can I use it for what I want?** — no zoning / land-use / NA-conversion check; the `landUseStatus` signal isn't even collected in the current form.
- **7. Is the development/project legal?** — no RERA project verification.
- **8. Is the seller's title clean?** — no title-chain / encumbrance-certificate diligence (*Decode* only reads a document you already hold).
- **12. Do the records now show me as owner?** — no post-registration mutation / record check.
- **13. What can I do with it after purchase?** — no post-purchase guidance.

---

## 5. Where this points (opportunity surface)

The current product is a **pre-transaction legal-eligibility copilot**. To become a full end-to-end journey it would need to move from *"reasoning over what the user declares"* to *"verifying against live records"*:

- **Ownership & title (steps 3, 8, 12):** integrate state land-record portals / encumbrance certificates — the single biggest trust upgrade.
- **Land use & RERA (steps 6, 7):** add a land-use/zoning check and a RERA project lookup; start by re-adding the `landUseStatus` / RERA form inputs the rule engine is already partly written for.
- **Connective tissue (steps 9→11):** turn eligibility findings into a **guided, tick-through checklist** that chains into the document plan and registration steps, so the journey is one flow rather than five separate tabs.

Each of these respects the app's non-negotiables: **works offline in a rule-based mode, AI only enhances, and never fabricates a legal citation.**

---

*Companion docs: `README.md` (overview & run), `HANDOVER.md` (architecture & history), `IDEATION_BRIEF.md` (product brainstorming brief).*
