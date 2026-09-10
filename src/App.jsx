import { useState, useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";
import {
  STATES, TRANSACTION_TYPES, PROPERTY_TYPES, BUYER_TYPES, GENDERS,
  AREA_CATEGORIES, STAMP_DUTY, REGISTRATION_STEPS,
  PROPERTY_ID_HIERARCHY, LAND_UNITS, UNIT_TO_SQFT, PAYMENT_METHODS,
  STATE_EXEMPTIONS, JURISDICTION_RULES, STATE_LANGUAGES, READY_RECKONER_INFO,
  DOCUMENT_CHECKLIST, SAMPLE_CONTRACTS,
} from "./data/constants";
import { PROPERTY_LAW_DB } from "./data/propertyLawDatabase";
import INDIA_MAP from "./data/indiaMap.js";
import { parseDocument } from "./lib/parseDocument";
import { callGemini, callGeminiJSON, GEMINI_KEY_STORAGE, DEFAULT_GEMINI_KEY } from "./lib/gemini";
import {
  OUTPUT_LANGUAGES, scriptFor, groundingForText,
  buildExplainPrompt, buildRiskPrompt, RISK_SCHEMA, UNDERSTAND_SYSTEM,
} from "./lib/understand";

const TABS = [
  { id: "home", label: "Home", icon: "⚖️" },
  { id: "eligibility", label: "Can I Buy?", icon: "🔍" },
  { id: "understand", label: "Decode Contract", icon: "📄" },
  { id: "stampduty", label: "Compare Costs", icon: "💰" },
  { id: "tools", label: "Toolkit", icon: "🛠️" },
];

function LoadingDots() {
  const [dots, setDots] = useState("");
  useEffect(() => {
    const i = setInterval(() => setDots((d) => (d.length >= 3 ? "" : d + ".")), 400);
    return () => clearInterval(i);
  }, []);
  return <span style={{ fontFamily: "monospace" }}>Analyzing{dots}</span>;
}

function formatAIResponse(text) {
  if (!text) return null;
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const key = i;
    const trimmed = line.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("### "))
      return <h4 key={key} style={{ color: "var(--accent)", marginTop: 16, marginBottom: 6, fontSize: 15, fontWeight: 700 }}>{trimmed.slice(4)}</h4>;
    if (trimmed.startsWith("## "))
      return <h3 key={key} style={{ marginTop: 20, marginBottom: 8, fontSize: 17, fontWeight: 800, borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>{trimmed.slice(3)}</h3>;
    if (trimmed.startsWith("# "))
      return <h2 key={key} style={{ marginTop: 20, marginBottom: 10, fontSize: 20, fontWeight: 800 }}>{trimmed.slice(2)}</h2>;
    if (trimmed.startsWith("🚫") || trimmed.startsWith("CRITICAL"))
      return <p key={key} className="alert alert-danger">{trimmed}</p>;
    if (trimmed.startsWith("⚠️") || trimmed.startsWith("HIGH") || trimmed.startsWith("WARNING"))
      return <p key={key} className="alert alert-warning">{trimmed}</p>;
    if (trimmed.startsWith("✅"))
      return <p key={key} className="alert alert-success">{trimmed}</p>;
    if (trimmed.startsWith("- ") || trimmed.startsWith("• "))
      return <p key={key} style={{ paddingLeft: 16, margin: "3px 0", fontSize: 13, lineHeight: 1.6, color: "var(--fg-secondary)" }}>{trimmed}</p>;
    if (trimmed.startsWith("**") && trimmed.endsWith("**"))
      return <p key={key} style={{ fontWeight: 700, margin: "8px 0 4px", fontSize: 13 }}>{trimmed.replace(/\*\*/g, "")}</p>;
    if (trimmed.startsWith("ORIGINAL:") || trimmed.startsWith("SUGGESTED:") || trimmed.startsWith("REASON:"))
      return <p key={key} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, padding: "4px 8px", background: "var(--bg)", borderRadius: 4, margin: "4px 0" }}>{trimmed}</p>;
    return <p key={key} style={{ margin: "4px 0", fontSize: 13, lineHeight: 1.7, color: "var(--fg-secondary)" }}>{trimmed.replace(/\*\*/g, "")}</p>;
  });
}

const toStateKey = (state) => state?.toUpperCase();
const isAgriProperty = (form) => form.propType === "Agricultural";
const isRentLike = (type) => type?.includes("Rent") || type?.includes("Lease");
const isSaleLike = (type) => type?.includes("Sale") || type?.includes("Gift") || type?.includes("Exchange");
function dbRows(sheet, state) {
  const rows = PROPERTY_LAW_DB[sheet] || [];
  if (!state) return rows;
  const key = toStateKey(state);
  return rows.filter((r) => r.State === key || r.State === "ALL STATES" || r["State / Scope"] === key || r["State / Scope"] === "ALL");
}

function getStampQuote(form) {
  const val = parseInt(form.value, 10) || 0;
  const rateData = STAMP_DUTY[form.propertyState]?.[form.txnType]?.[form.area];
  if (!val || !rateData) return null;
  const genderKey = form.gender === "Female" ? "female" : form.gender === "Joint (Male + Female)" ? "joint" : "male";
  const stampRate = rateData[genderKey] || 0;
  const regRate = rateData.regFee || 0;
  const cessRate = rateData.cess || 0;
  const stamp = Math.round(val * stampRate / 100);
  const registration = Math.round(val * regRate / 100);
  const cess = Math.round(val * cessRate / 100);
  return {
    stampRate, regRate, cessRate, stamp, registration, cess,
    total: stamp + registration + cess,
    totalRate: stampRate + regRate + cessRate,
    notes: rateData.notes,
  };
}

function makeRisk(level, title, body, source, meta = {}) {
  return { level, title, body, source, ...meta };
}

const VERDICT_TAG = {
  CRITICAL: "Critical, likely a hard stop",
  HIGH: "High risk, clear this first",
  MEDIUM: "Caution, check before you commit",
  LOW: "Looks workable",
};
const INDIA_CODE_URL = "https://www.indiacode.nic.in/";
const LEGAL_AID_URL = "https://nalsa.gov.in/lsams/";
const DEFAULT_OPTIONS = [
  { icon: "doc", title: "Order a 15-year Encumbrance Certificate", desc: "Confirms the property is free of loans and legal claims before you pay anything." },
  { icon: "check", title: "Verify the circle / guidance value", desc: "Stamp duty is charged on the higher of price and government value — check the state portal first." },
  { icon: "swap", title: "Trace the title chain", desc: "Match the seller's name across the prior deeds and the latest land record." },
];

function buildDocPlan(form) {
  const ps = form.propertyState;
  const agri = isAgriProperty(form);
  const record = PROPERTY_ID_HIERARCHY[ps]?.recordName || "Latest land-record extract";
  const obtain = [];
  const have = [];
  const hidden = [];

  if (isRentLike(form.txnType)) {
    obtain.push(
      { name: `${form.txnType} drafted on stamp paper`, where: "your advocate or deed writer" },
      { name: "Owner's title / ownership proof", where: "the landlord" },
      { name: "Latest property tax receipt", where: "the landlord" },
    );
    if (toStateKey(ps) === "MAHARASHTRA") obtain.push({ name: "Police intimation / verification form", where: "the local police station" });
    have.push({ name: "Aadhaar + PAN of landlord and tenant" }, { name: "Two witnesses with valid ID and passport photos" });
    return { obtain, have, hidden };
  }

  const docName = form.txnType.includes("Gift") ? "gift deed" : form.txnType.includes("Mortgage") ? "mortgage deed" : form.txnType.includes("Lease") ? "lease deed" : "sale deed";
  obtain.push(
    { name: `Drafted ${docName} on stamp paper`, where: "your advocate or licensed deed writer" },
    { name: "Encumbrance Certificate (15 years)", where: `the ${ps} Sub-Registrar` },
    { name: record, where: `the ${ps} land-records portal` },
    { name: "Title deed and the prior chain of deeds", where: "the seller" },
    { name: "Latest property tax / Khata receipt", where: "the seller or local body" },
  );
  if (form.txnType.includes("Gift") && form.sellerRelation && form.sellerRelation !== "Not a blood relative") {
    obtain.push({ name: "Relationship proof", where: "to claim the family concession" });
  }
  have.push({ name: "Aadhaar + PAN of every party" }, { name: "Two witnesses with valid ID and passport photos" });
  if (agri) {
    hidden.push({ name: "RERA registration certificate" }, { name: "apartment association NOC" }, { name: "approved building plan" });
  }
  return { obtain, have, hidden };
}

function verdictHeadline(code, level, form) {
  const ps = form.propertyState;
  switch (code) {
    case "HP118":
      return `You probably cannot complete this purchase as planned. ${ps} blocks the sale of agricultural land to non-agriculturists and outsiders — the only legal route, State Government permission, is slow and rarely granted for lifestyle use.`;
    case "MH63":
      return `This purchase is on hold. ${ps} bars non-farmers from buying agricultural land outside municipal limits until you prove agriculturist status or the land is lawfully converted.`;
    case "FEMA":
      return "As an NRI / OCI you cannot buy agricultural land in India. Residential and commercial property is fine — farmland, farmhouses and plantations need RBI permission that is almost never given.";
    case "MINOR":
      return "This purchase cannot be made in the buyer's own name. A person under 18 cannot legally enter a contract — it has to run through a lawful guardian.";
    case "LEASE_REG":
      return `This lease has to be registered. ${ps} does not accept the 11-month shortcut, and an unregistered agreement leaves you legally exposed.`;
    default:
      if (level === "CRITICAL") return "There is a serious blocker on this transaction. Read the reason below carefully before you pay any money.";
      if (level === "HIGH") return "This transaction carries a high risk that you should clear before you proceed.";
      if (level === "MEDIUM") return "No outright blocker — but this transaction has conditions you need to clear first, listed below.";
      return "This looks workable based on what you entered. No hard blocker came up — your job now is diligence: title, encumbrance, valuation and the latest local circulars.";
  }
}

function buildLocalEligibilityReport(form) {
  const definitions = dbRows("Definitions & Eligibility", form.propertyState);
  const stampQuote = getStampQuote(form);
  const risks = [];
  const stateKey = toStateKey(form.propertyState);
  const buyerIsNri = form.buyerType === "NRI / OCI";
  const agri = isAgriProperty(form);
  const outsideMunicipal = form.municipalStatus === "Outside municipal / rural limits";
  const isConverted = form.landUseStatus === "Converted to non-agricultural use";
  const isOutsider = form.residency === "Outsider (resident of another state)";
  const isFarmer = form.farmerStatus === "Yes";
  const isRelative = form.sellerRelation && form.sellerRelation !== "Not a blood relative";
  const age = parseInt(form.age, 10) || 0;

  if (age && age < 18) {
    risks.push(makeRisk(
      "CRITICAL",
      "Buyer is a minor and cannot contract",
      "A person under 18 cannot enter into a valid property contract in their own name. The purchase must be made through a lawful natural or legal guardian, with court permission where the law requires it.",
      "Indian Contract Act, 1872, Section 11",
      { code: "MINOR", lawLink: "https://www.indiacode.nic.in/show-data?actid=AC_CEN_3_20_00035_187209_1523268996428&sectionId=38614&sectionno=11&orderno=11", options: [
        { icon: "check", title: "Buy through a lawful guardian", desc: "A natural or court-appointed guardian can hold the property for the minor, with court permission where required." },
        { icon: "clock", title: "Wait until the buyer turns 18", desc: "Once a major, the buyer can contract in their own name with no guardian needed." },
      ] }
    ));
  }

  if (buyerIsNri && agri) {
    risks.push(makeRisk(
      "CRITICAL",
      "NRI/OCI agricultural land purchase is blocked by FEMA",
      "NRIs/OCIs can generally buy residential or commercial property, but agricultural land, farmhouses, and plantation property need specific RBI permission. Treat this as blocked until a FEMA specialist confirms a permitted route.",
      "FEMA 1999 + RBI Master Direction",
      { code: "FEMA", lawLink: "https://www.indiacode.nic.in/handle/123456789/1988", options: [
        { icon: "swap", title: "Buy residential or commercial instead", desc: "FEMA freely allows NRIs/OCIs to buy these — only farmland, farmhouses and plantations are barred." },
        { icon: "doc", title: "Seek specific RBI permission", desc: "A dedicated RBI approval route exists but is rarely granted; a FEMA specialist should advise." },
        { icon: "check", title: "Let a resident family member acquire it", desc: "Only with proper legal advice — structuring this wrongly can itself breach FEMA." },
      ] }
    ));
  }

  if (agri && stateKey === "HIMACHAL PRADESH" && (isOutsider || !isFarmer) && outsideMunicipal && !isConverted) {
    risks.push(makeRisk(
      "CRITICAL",
      "Section 118 permission is required before purchase",
      "HP restricts transfer of agricultural land to non-agriculturists and outsiders. Permission runs through the Deputy Commissioner and State Government, commonly takes 6-12 months, and carries a high rejection risk for lifestyle / weekend-retreat use.",
      "HP Tenancy and Land Reforms Act, 1972, Section 118",
      { code: "HP118", lawLink: "https://www.indiacode.nic.in/handle/123456789/5723", options: [
        { icon: "doc", title: "Apply for Section 118 permission", desc: "Runs through the Deputy Commissioner and State Government — 6 to 12 months, low odds for lifestyle use, and it can be revoked if the land is not used as stated." },
        { icon: "check", title: "Qualify as an agriculturist in Himachal Pradesh", desc: "Owning farmland in another state does not count; HP looks for an actual cultivation record within HP." },
        { icon: "swap", title: "Buy non-agricultural land instead", desc: "Section 118 does not apply to converted / non-agricultural land — usually the cleanest path to a yes." },
      ] }
    ));
  }

  if (agri && stateKey === "MAHARASHTRA" && outsideMunicipal && !isConverted && !isFarmer) {
    risks.push(makeRisk(
      "CRITICAL",
      "Maharashtra Section 63 agriculturist proof is missing",
      "Agricultural land outside municipal limits generally requires the buyer to prove agriculturist (farmer) status. A non-farmer buyer should not proceed until this proof is documented or the land is lawfully converted.",
      "Maharashtra Tenancy and Agricultural Lands Act, 1948, Section 63",
      { code: "MH63", lawLink: "https://www.indiacode.nic.in/handle/123456789/19824", options: [
        { icon: "check", title: "Prove agriculturist (farmer) status", desc: "Show a 7/12 extract or cultivation record establishing that you are a farmer." },
        { icon: "swap", title: "Buy converted (NA) land or land inside municipal limits", desc: "Section 63 targets agricultural land outside municipal limits; converted plots are not restricted the same way." },
        { icon: "doc", title: "Seek Collector permission", desc: "In some cases the Collector can permit the purchase — ask an advocate whether your case qualifies." },
      ] }
    ));
  }

  if (form.txnType === "Rent Agreement" && form.leaseMonths && Number(form.leaseMonths) > 11) {
    const level = stateKey === "MAHARASHTRA" ? "HIGH" : "MEDIUM";
    risks.push(makeRisk(
      level,
      "Lease term triggers registration scrutiny",
      stateKey === "MAHARASHTRA"
        ? "Maharashtra leave and license agreements must be registered regardless of duration. Do not rely on the 11-month shortcut."
        : "Leases exceeding one year are compulsorily registrable. For 12 months or more, plan SRO registration and correct stamp duty.",
      stateKey === "MAHARASHTRA" ? "Maharashtra Rent Control Act, Section 55" : "Registration Act, 1908, Section 17",
      { code: "LEASE_REG", lawLink: stateKey === "MAHARASHTRA" ? "https://www.indiacode.nic.in/handle/123456789/15817" : "https://www.indiacode.nic.in/show-data?actid=AC_CEN_18_43_00004_190816_1523340837338&orderno=18", options: [
        { icon: "doc", title: "Register the agreement at the SRO", desc: "Mandatory here — budget the stamp duty and registration fee and present it within the deadline." },
        { icon: "swap", title: "Keep the term to 11 months or less", desc: "Shorter tenancies avoid compulsory registration in most states — but NOT in Maharashtra." },
      ] }
    ));
  }

  if (form.buyingCapacity && form.buyingCapacity !== "Individual") {
    risks.push(makeRisk(
      "MEDIUM",
      `Buying as a ${form.buyingCapacity} changes eligibility and documents`,
      "Purchases by companies, banks, trusts/societies, or government bodies follow different KYC, board-resolution, FEMA, and sometimes land-ceiling rules than individual buyers. Confirm the entity is authorised and the right approvals/resolutions are in place.",
      "Companies Act / RBI / state land laws as applicable"
    ));
  }

  if (form.tribalStatus === "Tribal (Scheduled Tribe)") {
    risks.push(makeRisk(
      "MEDIUM",
      "Scheduled-Tribe status affects transfer rules",
      "ST classification can bring both concessions (reduced stamp duty in some states) and restrictions (transfer of tribal-held land is often restricted or needs special permission). Confirm whether the land is tribal-held and what permission applies.",
      "State tribal land protection laws"
    ));
  }

  if (isRelative && isSaleLike(form.txnType)) {
    risks.push(makeRisk(
      "LOW",
      "You may qualify for a family-transfer concession",
      "Transfers between close blood relatives (spouse, children, grandchildren) attract sharply reduced stamp duty in several states — for example a Maharashtra family gift of residential/agricultural property to a spouse or child can attract only nominal duty. Ask the SRO to apply the relative concession and carry relationship proof.",
      "State stamp duty concession notifications"
    ));
  }

  if (isFarmer && agri) {
    risks.push(makeRisk(
      "LOW",
      "Recognised-farmer concessions may apply",
      "Some states grant stamp duty relief to recognised farmers buying agricultural land (for example, purchases made with land-acquisition compensation within a fixed window). Verify the latest notification and carry your agriculturist/farmer proof.",
      "State agriculturist concession rules"
    ));
  }

  if (form.gender === "Female" && stateKey === "KARNATAKA" && isSaleLike(form.txnType)) {
    risks.push(makeRisk(
      "LOW",
      "No female stamp-duty concession in Karnataka",
      "Unlike HP, Maharashtra and Punjab, Karnataka does not offer a gender-based stamp duty concession. Do not budget for a female discount on this purchase.",
      "Karnataka Stamp Act, 1957"
    ));
  }

  if (!risks.length) {
    risks.push(makeRisk(
      "LOW",
      "No hard blocker found from the local database",
      "The transaction looks locally workable based on the entered facts.",
      "Local eligibility database",
      { code: "CLEAR" }
    ));
  }

  const top = risks.some((r) => r.level === "CRITICAL") ? "CRITICAL"
    : risks.some((r) => r.level === "HIGH") ? "HIGH"
      : risks.some((r) => r.level === "MEDIUM") ? "MEDIUM" : "LOW";

  const blockerList = risks.filter((r) => r.level === "CRITICAL" || r.level === "HIGH");
  const lead = blockerList[0];
  const options = lead?.options || DEFAULT_OPTIONS;

  const docPlan = buildDocPlan(form);
  if (risks.some((r) => r.code === "HP118")) docPlan.obtain.unshift({ name: "Section 118 permission", where: "the Deputy Commissioner / State Government" });
  if (risks.some((r) => r.code === "MH63")) docPlan.obtain.unshift({ name: "Agriculturist proof or Collector permission", where: "the Tahsildar / Collector" });

  const txnShort = form.txnType.includes("Sale") ? "Sale deed"
    : form.txnType.includes("Rent") ? "Rent agreement"
      : form.txnType.includes("Gift") ? "Gift deed"
        : form.txnType.includes("Lease") ? "Lease deed"
          : form.txnType.includes("Mortgage") ? "Mortgage deed" : "Power of attorney";
  const propChip = agri ? "Agricultural land" : `${form.propType} property`;
  const buyerChip = buyerIsNri ? "Buyer: NRI / OCI"
    : agri && !isFarmer ? "Buyer: non-agriculturist"
      : isOutsider ? "Buyer: outsider"
        : form.buyingCapacity && form.buyingCapacity !== "Individual" ? `Buyer: ${form.buyingCapacity}`
          : `Buyer: ${form.gender || "individual"}`;

  const verdict = {
    level: top,
    tag: VERDICT_TAG[top],
    headline: verdictHeadline(lead?.code, top, form),
    chips: [`${form.buyerState} to ${form.propertyState}`, txnShort, propChip, buyerChip],
    meterOn: top === "CRITICAL" ? 4 : top === "HIGH" ? 3 : top === "MEDIUM" ? 2 : 1,
  };

  const glossary = definitions.slice(0, 2)
    .map((r) => ({ term: r.Term, plain: r["How to Prove / Document Required"] || r["Why It Matters for Cross-State Buyers"] || "" }))
    .filter((g) => g.term && g.plain);

  return {
    top,
    verdict,
    blockers: blockerList,
    notes: risks.filter((r) => (r.level === "MEDIUM" || r.level === "LOW") && r.code !== "CLEAR"),
    options,
    stampQuote,
    valuationName: READY_RECKONER_INFO[form.propertyState]?.name,
    docPlan,
    registration: {
      count: 6,
      summary: "Prepare the documents, value the property, pay stamp duty and fees, present it at the Sub-Registrar within jurisdiction, complete admission and biometrics before the SRO, then collect the scanned, registered deed. It must be presented within 4 months (120 days) of execution.",
    },
    glossary,
  };
}

function OptIcon({ name }) {
  const p = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  if (name === "check") return <svg {...p}><polyline points="20 6 9 17 4 12" /></svg>;
  if (name === "swap") return <svg {...p}><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>;
  if (name === "clock") return <svg {...p}><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></svg>;
  if (name === "download") return <svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
  if (name === "save") return <svg {...p}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>;
  if (name === "pin") return <svg {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>;
  if (name === "eyeoff") return <svg {...p}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>;
  return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="13" y2="17" /></svg>;
}

function LocalReport({ report, form }) {
  const { verdict } = report;
  const [saved, setSaved] = useState(false);
  const lvlClass = verdict.level === "CRITICAL" ? "verdict-critical" : verdict.level === "HIGH" ? "verdict-high" : verdict.level === "MEDIUM" ? "verdict-medium" : "verdict-low";
  const isCritical = verdict.level === "CRITICAL";
  const q = report.stampQuote;

  const exportBrief = () => {
    const lines = [
      "PropertyIQ — Eligibility brief",
      `${form.buyerState} -> ${form.propertyState}  |  ${form.txnType}  |  ${form.propType}`,
      form.pincode ? `Property pincode: ${form.pincode}` : "",
      "",
      `VERDICT: ${verdict.tag}`,
      verdict.headline,
      "",
    ];
    if (report.blockers.length) {
      lines.push("WHY:");
      report.blockers.forEach((b) => lines.push(`- [${b.level}] ${b.title}\n  ${b.body}\n  Source: ${b.source}`));
      lines.push("");
    }
    lines.push("OPTIONS:");
    report.options.forEach((o) => lines.push(`- ${o.title}: ${o.desc}`));
    lines.push("");
    if (q) {
      lines.push("ESTIMATED COST (if it proceeds):");
      lines.push(`- Stamp ₹${q.stamp.toLocaleString("en-IN")} · Registration ₹${q.registration.toLocaleString("en-IN")} · Cess ₹${q.cess.toLocaleString("en-IN")} · Total ₹${q.total.toLocaleString("en-IN")} (~${q.totalRate.toFixed(1)}%)`);
      lines.push(`- Levied by ${form.propertyState} (Indian Stamp Act, Section 19).`);
      lines.push("");
    }
    lines.push("DOCUMENTS TO OBTAIN:");
    report.docPlan.obtain.forEach((d) => lines.push(`- ${d.name}${d.where ? ` (from ${d.where})` : ""}`));
    lines.push("YOU ALREADY HAVE:");
    report.docPlan.have.forEach((d) => lines.push(`- ${d.name}`));
    lines.push("");
    lines.push("Legal information, not legal advice. Consult a registered advocate or your nearest DLSA.");
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `propertyiq-brief-${form.propertyState.replace(/\s+/g, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveCase = () => {
    try {
      const arr = JSON.parse(localStorage.getItem("propertyiq_saved_cases") || "[]");
      arr.push({ at: new Date().toISOString(), route: `${form.buyerState} -> ${form.propertyState}`, txn: form.txnType, verdict: verdict.tag, headline: verdict.headline });
      localStorage.setItem("propertyiq_saved_cases", JSON.stringify(arr));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { /* storage unavailable */ }
  };

  return (
    <div className="report">
      <div className={`verdict ${lvlClass}`}>
        <div className="verdict-meter">
          {[1, 2, 3, 4].map((i) => <span key={i} className={`seg ${i <= verdict.meterOn ? "on" : ""}`} />)}
          <span className="verdict-tag">{verdict.tag}</span>
        </div>
        <div className="verdict-headline">{verdict.headline}</div>
        <div className="verdict-chips">{verdict.chips.map((c, i) => <span key={i} className="vchip">{c}</span>)}</div>
        {report.options.length > 0 && (
          <button className="verdict-cta" onClick={() => document.getElementById("rep-options")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            See your options {"→"}
          </button>
        )}
      </div>

      {report.blockers.length > 0 && (
        <>
          <div className="report-h">{isCritical ? "Why it's blocked" : "Why it's flagged"}</div>
          {report.blockers.map((b, i) => (
            <div key={i} className="why-card">
              <div className="why-title">{b.title}</div>
              <div className="why-body">{b.body}</div>
              <details className="law">
                <summary>Show the law</summary>
                <div className="law-body">{b.source}. <a href={b.lawLink || INDIA_CODE_URL} target="_blank" rel="noreferrer">Read it on India Code {"→"}</a></div>
              </details>
            </div>
          ))}
        </>
      )}

      <div className="report-h" id="rep-options">{report.blockers.length ? "Your realistic options" : "Your next steps"}</div>
      {report.options.map((o, i) => (
        <div key={i} className="opt-card">
          <span className="opt-icon"><OptIcon name={o.icon} /></span>
          <div>
            <div className="opt-title">{o.title}</div>
            <div className="opt-desc">{o.desc}</div>
          </div>
        </div>
      ))}

      {report.notes.length > 0 && (
        <>
          <div className="report-h">Also worth knowing</div>
          {report.notes.map((n, i) => (
            <div key={i} className="note-item"><b>{n.title}</b><span>{n.body}</span></div>
          ))}
        </>
      )}

      {q && (
        <>
          <div className="report-h">{isCritical ? "If it clears, the cost" : "What it will cost"}</div>
          <div className="cost-line">Levied by {form.propertyState} because the property is there, not by {form.buyerState} (Indian Stamp Act, Section 19).</div>
          <div className="cost-grid">
            <div className="cost-card"><div className="clabel">Stamp</div><div className="cval">{"₹"}{q.stamp.toLocaleString("en-IN")}</div></div>
            <div className="cost-card"><div className="clabel">Registration</div><div className="cval">{"₹"}{q.registration.toLocaleString("en-IN")}</div></div>
            <div className="cost-card"><div className="clabel">Cess</div><div className="cval">{"₹"}{q.cess.toLocaleString("en-IN")}</div></div>
            <div className="cost-card total"><div className="clabel">Total</div><div className="cval">{"₹"}{q.total.toLocaleString("en-IN")}</div></div>
          </div>
          <div className="cost-line" style={{ marginTop: 8 }}>
            About {q.totalRate.toFixed(1)}% on {"₹"}{(parseInt(form.value, 10) || 0).toLocaleString("en-IN")}, charged on the {report.valuationName || "circle rate"}{q.notes ? ` — ${q.notes}` : "."}
          </div>
        </>
      )}

      <div className="report-h">What you will need</div>
      {report.docPlan.obtain.length > 0 && (
        <>
          <div className="doc-group-label">You obtain</div>
          {report.docPlan.obtain.map((d, i) => (
            <label key={i} className="doc-item"><input type="checkbox" /><span>{d.name}{d.where && <span className="where"> — from {d.where}</span>}</span></label>
          ))}
        </>
      )}
      {report.docPlan.have.length > 0 && (
        <>
          <div className="doc-group-label">You already have</div>
          {report.docPlan.have.map((d, i) => (
            <label key={i} className="doc-item"><input type="checkbox" /><span>{d.name}</span></label>
          ))}
        </>
      )}
      {report.docPlan.hidden.length > 0 && (
        <div className="doc-hidden"><OptIcon name="eyeoff" /><span>Hidden, not relevant to this case: {report.docPlan.hidden.map((h) => h.name).join(", ")}.</span></div>
      )}

      <details className="acc">
        <summary>Registration steps ({report.registration.count})</summary>
        <div className="acc-body">{report.registration.summary}</div>
      </details>
      {report.glossary.length > 0 && (
        <details className="acc">
          <summary>Terms in this report ({report.glossary.length})</summary>
          <div className="acc-body">{report.glossary.map((g, i) => <div key={i} style={{ marginBottom: 6 }}><b>{g.term}:</b> {g.plain}</div>)}</div>
        </details>
      )}

      <div className="report-actions">
        <button className="btn btn-outline btn-sm" onClick={exportBrief}><OptIcon name="download" /> Export for advocate</button>
        <button className="btn btn-outline btn-sm" onClick={saveCase}>{saved ? <>Saved {"✓"}</> : <><OptIcon name="save" /> Save case</>}</button>
        <a className="btn btn-outline btn-sm" href={LEGAL_AID_URL} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}><OptIcon name="pin" /> Find legal aid</a>
      </div>

      <div className="report-note">Generated from the property-law database. This is legal information, not legal advice — verify current circulars with the relevant Sub-Registrar or a registered advocate, or your nearest DLSA.</div>
    </div>
  );
}


function HomeTab({ setTab }) {
  const features = [
    { icon: "🔍", title: "Can I Buy This Property?", desc: "A personalized eligibility report — permissions, restrictions, costs, and the documents you'll need.", tab: "eligibility", color: "#0d9488" },
    { icon: "📄", title: "Decode My Contract", desc: "Upload a deed or agreement for a plain-language explanation, and a redline of risky clauses.", tab: "understand", color: "#dc2626" },
    { icon: "💰", title: "Compare Registration Costs", desc: "Stamp duty, registration charges, and exemptions side by side across states.", tab: "stampduty", color: "#c2410c" },
    { icon: "🛠️", title: "Property Law Toolkit", desc: "Unit conversion, property identifiers, registration workflows, exemptions, and jurisdiction guidance.", tab: "tools", color: "#9333ea" },
  ];
  const mistakes = [
    { mi: "🚫", t: "Buying land you're not legally allowed to purchase" },
    { mi: "💰", t: "Unexpected stamp duty and registration costs" },
    { mi: "⚠️", t: "Hidden risks buried in the agreement you signed" },
    { mi: "📑", t: "Missing permissions and mandatory documents" },
    { mi: "⏱", t: "Delays and refusals caused by registration errors" },
    { mi: "🗺️", t: "Cross-state rules that don't work like back home" },
  ];
  return (
    <div className="home">
      <section className="hero">
        <svg className="hero-map-bg" viewBox={INDIA_MAP.viewBox} aria-hidden="true">
          {INDIA_MAP.locations.map((l) => <path key={l.id} d={l.path} />)}
        </svg>
        <div className="hero-inner">
          <div className="hero-badge">{"⚖️"}</div>
          <div className="hero-kicker">Your cross-state property copilot</div>
          <h1 className="hero-title">Buy property with confidence.</h1>
          <p className="hero-sub">
            PropertyIQ is your go-to copilot for buying property across states in India — who's allowed to buy,
            what it will cost, and what's hidden in the contract. All in plain language, backed by real Indian law.
          </p>
          <div className="hero-cta-row">
            <button className="btn btn-primary hero-cta" onClick={() => setTab("eligibility")}>Check if you can buy {"→"}</button>
            <button className="btn btn-outline hero-cta2" onClick={() => setTab("understand")}>Decode a contract</button>
          </div>
          <div className="hero-stats">
            <div><b>4</b><span>states covered</span></div>
            <div><b>Real</b><span>statutes cited</span></div>
            <div><b>Daily</b><span>law updates</span></div>
          </div>
        </div>
      </section>

      <section className="home-body">
        <div className="feature-grid">
          {features.map((c) => (
            <button key={c.tab} className="feature-card" onClick={() => setTab(c.tab)}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = c.color)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}>
              <div className="fc-arrow">{"→"}</div>
              <div className="icon-badge" style={{ background: c.color + "1a", color: c.color }}>{c.icon}</div>
              <div className="title">{c.title}</div>
              <div className="desc">{c.desc}</div>
            </button>
          ))}
        </div>

        <div className="mistakes">
          <h3>Avoid expensive property mistakes</h3>
          <div className="mistakes-grid">
            {mistakes.map((m, i) => (
              <div key={i} className="mistake"><span className="mi">{m.mi}</span><span>{m.t}</span></div>
            ))}
          </div>
          <p style={{ fontSize: 13.5, fontWeight: 700, marginTop: 16 }}>Get answers before you spend a rupee on the transaction.</p>
          <p style={{ fontSize: 11, color: "var(--fg-secondary)", marginTop: 8 }}>
            States covered: <strong>Himachal Pradesh, Maharashtra, Karnataka, Punjab</strong>. Legal information, not legal advice.
          </p>
        </div>
      </section>
    </div>
  );
}

// Map raw API errors to a calm, user-facing message.
// Order matters: check auth/key problems FIRST so an invalid/expired key is not
// mislabeled as "servers busy" (that masking cost real debugging time before).
function friendlyError(msg) {
  const m = String(msg || "");
  // Auth / key problems — surface clearly so the fix is obvious.
  if (/\b(401|403)\b|unauthenticated|invalid authentication|api[_ ]?key|key is (?:invalid|not valid)|invalid.*credential|expired|permission denied/i.test(m)) {
    return "Your Gemini API key is invalid or expired. Please update the key and try again.";
  }
  // Genuine transient overload / rate limiting — worth retrying later.
  if (/\b(500|503|429)\b|quota|high demand|overloaded|unavailable|rate limit|exhausted/i.test(m)) {
    return "Servers are busy, try again later.";
  }
  // Malformed model output.
  if (/not valid json|no output|empty response|blocked/i.test(m)) {
    return "The AI returned an unexpected response. Please try again.";
  }
  return m || "Something went wrong. Please try again.";
}

function verdictBadgeClass(v) {
  const u = String(v || "").toUpperCase();
  return u === "CRITICAL" ? "badge-critical" : u === "HIGH" ? "badge-high" : u === "MEDIUM" ? "badge-medium" : "badge-low";
}

// Friendly, human status label for the eligibility verdict.
function verdictStatus(v) {
  const u = String(v || "").toUpperCase();
  if (u === "CRITICAL") return "Restricted — Government Approval Required";
  if (u === "HIGH") return "Conditional Approval";
  if (u === "MEDIUM") return "Eligible — With Conditions";
  return "Eligible";
}

// Renders the LLM agent's eligibility report: verdict, severity-ordered findings
// with real citations + source links, the sources it consulted, and a research
// trace of the tools it actually called.
function AgentReport({ data }) {
  const report = data.report || {};
  const findings = Array.isArray(report.findings) ? report.findings : [];
  const sources = Array.isArray(report.sources) ? report.sources : [];
  const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...findings].sort((a, b) => (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9));
  return (
    <div className="card report">
      <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>Eligibility Assessment</h3>
      <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span className={`badge ${verdictBadgeClass(report.verdict)}`}>Status: {verdictStatus(report.verdict)}</span>
        {report.confidence && <span className="badge badge-info">Confidence: {String(report.confidence).replace(/^./, (c) => c.toUpperCase())}</span>}
        {report.asOf && <span className="report-note" style={{ margin: 0 }}>As of {report.asOf}</span>}
      </div>
      {report.summary && <div className="verdict-headline" style={{ fontSize: 16, marginBottom: 8 }}>{report.summary}</div>}
      {report.confidenceReason && <div className="report-note" style={{ marginBottom: 12 }}>{report.confidenceReason}</div>}

      {sorted.map((fd, i) => (
        <div key={i} className="why-card">
          <div style={{ marginBottom: 4 }}>
            <span className={`sev sev-${fd.severity}`}>{String(fd.severity || "").toUpperCase()}</span>
            <span className="why-title">{fd.title}</span>
          </div>
          <div className="why-body">{fd.explanation}</div>
          {fd.source && (
            <div style={{ marginTop: 6 }}>
              <a href={fd.source} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>Read the official source →</a>
            </div>
          )}
        </div>
      ))}

      {Array.isArray(report.exceptions) && report.exceptions.length > 0 && (
        <>
          <h4 style={{ fontSize: 14, margin: "16px 0 8px" }}>Exceptions that could help</h4>
          {report.exceptions.map((ex, i) => (
            <div key={i} className="note-item">{ex}</div>
          ))}
        </>
      )}

      {Array.isArray(report.actionPlan) && report.actionPlan.length > 0 && (
        <>
          <h4 style={{ fontSize: 14, margin: "16px 0 8px" }}>Your action plan</h4>
          {report.actionPlan.map((a, i) => (
            <div key={i} className="opt-card">
              <div className="opt-icon"><OptIcon name={i === 0 ? "check" : "doc"} /></div>
              <div>
                <div className="opt-title">{a.step}</div>
                <div className="opt-desc">{a.detail}{a.who ? ` · Who: ${a.who}` : ""}</div>
              </div>
            </div>
          ))}
        </>
      )}

      {sources.length > 0 && (
        <>
          <h4 style={{ fontSize: 14, margin: "16px 0 8px" }}>Sources</h4>
          {sources.map((s, i) => (
            <div key={i} style={{ fontSize: 12, marginBottom: 4 }}>
              {"🔗 "}<a href={s.url} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", fontWeight: 600 }}>{s.title || s.url}</a>
            </div>
          ))}
        </>
      )}

      <div className="alert alert-info" style={{ marginTop: 12, fontSize: 12, fontWeight: 500 }}>
        This is general information to help you understand your situation — not legal advice. Please confirm with a registered advocate or your nearest DLSA before acting.
      </div>
    </div>
  );
}

// The four supported states: ISO id (matches @svg-maps/india) + a one-line hook.
const STATE_ID = { "Himachal Pradesh": "hp", Maharashtra: "mh", Karnataka: "ka", Punjab: "pb" };
const SUPPORTED_IDS = new Set(Object.values(STATE_ID));
const STATE_HOOK = {
  "Himachal Pradesh": "Section 118 blocks non-agriculturists / outsiders from farmland.",
  Maharashtra: "Section 63 needs agriculturist proof for farmland outside city limits.",
  Karnataka: "Liberalized in 2020 — open to non-agriculturist buyers.",
  Punjab: "No identity-based ban — mainly ceiling & anti-fragmentation limits.",
};

// Real India map (state borders) with the chosen property state filled green.
function StateMap({ state }) {
  const activeId = STATE_ID[state];
  return (
    <div className="statemap">
      <div className="statemap-mapwrap">
        <svg viewBox={INDIA_MAP.viewBox} className="india-map" role="img" preserveAspectRatio="xMidYMid meet"
          aria-label={state ? `Map of India highlighting ${state}` : "Map of India"}>
          {INDIA_MAP.locations.map((loc) => {
            const on = loc.id === activeId;
            const sup = SUPPORTED_IDS.has(loc.id);
            return (
              <path key={loc.id} d={loc.path}
                className={`imap-state${sup ? " sup" : ""}${on ? " on" : ""}`}>
                <title>{loc.name}</title>
              </path>
            );
          })}
        </svg>
      </div>
      <div className="statemap-info">
        {state ? (
          <>
            <div className="sm-here">{"📍"} Property in</div>
            <div className="sm-state">{state}</div>
            {STATE_HOOK[state] && <div className="sm-hook">{STATE_HOOK[state]}</div>}
          </>
        ) : (
          <div className="sm-empty">Pick the <b>property state</b> to see it on the map and preview the key rule.</div>
        )}
        <div className="sm-legend"><span className="sm-legend-dot" /> Covered states · <span className="sm-legend-sel" /> your selection</div>
      </div>
    </div>
  );
}

function EligibilityTab() {
  const [form, setForm] = useState({
    buyerState: "", propertyState: "", pincode: "", txnType: "", propType: "",
    gender: "", age: "", buyerType: "Indian Resident", value: "", area: "",
    municipalStatus: "", residency: "", buyingCapacity: "",
    sellerRelation: "", tribalStatus: "", leaseMonths: "",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [agentInfo, setAgentInfo] = useState(null);   // null while probing; { available, ... } after
  const [agentData, setAgentData] = useState(null);    // { report, trace } from the agent
  const [agentError, setAgentError] = useState("");
  const [step, setStep] = useState(0);
  const f = (k, v) => setForm((p) => ({ ...p, [k]: v, ...(k === "propertyState" ? { area: "", pincode: "" } : {}) }));
  const areas = form.propertyState ? AREA_CATEGORIES[form.propertyState] || [] : [];
  const PINCODES = {
    "Himachal Pradesh": [{ v: "171001", l: "171001 — Urban" }, { v: "175001", l: "175001 — Rural" }],
    Maharashtra: [{ v: "400001", l: "400001 — Urban" }, { v: "413001", l: "413001 — Rural" }],
    Karnataka: [{ v: "560001", l: "560001 — Urban" }, { v: "581301", l: "581301 — Rural" }],
    Punjab: [{ v: "141001", l: "141001 — Urban" }, { v: "141801", l: "141801 — Rural" }],
  };
  const canSubmit = form.buyerState && form.propertyState && form.pincode.length === 6 && form.txnType
    && form.propType && form.gender && form.age && form.value && form.area
    && form.municipalStatus && form.residency && form.buyingCapacity;

  // Probe the agent backend once. When it's up, the contextual-RAG agent answers
  // eligibility (retrieval over the bundled legal database + Gemini); otherwise we
  // fall back to the offline deterministic rule engine.
  useEffect(() => {
    let alive = true;
    fetch("/api/health")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("down"))))
      .then((d) => alive && setAgentInfo({ available: true, ...d }))
      .catch(() => alive && setAgentInfo({ available: false }));
    return () => { alive = false; };
  }, []);

  const runCheck = async () => {
    setResult(null); setAgentData(null); setAgentError("");
    setLoading(true);

    // Preferred path: the contextual-RAG agent (backend live).
    if (agentInfo && agentInfo.available) {
      try {
        const r = await fetch("/api/eligibility", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ form }),
        });
        const data = await r.json();
        if (!r.ok || data.error) throw new Error(data.error || `Agent error ${r.status}`);
        setAgentData(data);
      } catch (e) {
        // Graceful fallback (e.g. quota/network) — still give the user an answer.
        setAgentError(friendlyError(e.message));
        setResult(buildLocalEligibilityReport(form));
      } finally {
        setLoading(false);
      }
      return;
    }

    // No backend → deterministic rule-based report (always works offline).
    setResult(buildLocalEligibilityReport(form));
    setLoading(false);
  };

  return (
    <div className="page">
      <h2 className="section-title">{"🔍"} Can I Buy This Property?</h2>
      <p className="section-desc">Answer a few questions to get a complete risk report for your property transaction.</p>

      {form.buyerState && form.propertyState && form.buyerState !== form.propertyState && (
        <div className="alert alert-info" style={{ marginBottom: 12 }}>
          Transaction: {form.buyerState} {"→"} {form.propertyState}.
          {STATE_LANGUAGES[form.propertyState] && ` Documents must be in ${STATE_LANGUAGES[form.propertyState].registration.join(" or ")}.`}
        </div>
      )}

      <StateMap state={form.propertyState} />

      {(() => {
        const steps = [
          { label: "Location", req: ["buyerState", "propertyState", "pincode", "area"] },
          { label: "The deal", req: ["txnType", "propType", "municipalStatus"] },
          { label: "About you", req: ["gender", "age", "value", "residency", "buyingCapacity"] },
        ];
        const done = (i) => steps[i].req.every((k) => (k === "pincode" ? form.pincode.length === 6 : !!form[k]));
        return (
          <div className="card wizard">
            <div className="wiz-steps">
              {steps.map((s, i) => (
                <button key={s.label} type="button" className={`wiz-step ${i === step ? "on" : ""} ${done(i) && i !== step ? "done" : ""}`} onClick={() => setStep(i)}>
                  <span className="wiz-num">{done(i) && i !== step ? "✓" : i + 1}</span>
                  <span className="wiz-label">{s.label}</span>
                </button>
              ))}
            </div>

            <div className="wiz-body" key={step}>
              {step === 0 && (
                <div className="form-grid">
                  <div><label className="form-label">Your Home State</label>
                    <select value={form.buyerState} onChange={(e) => f("buyerState", e.target.value)} className="form-select">
                      <option value="">Select...</option>{STATES.map((s) => <option key={s}>{s}</option>)}</select></div>
                  <div><label className="form-label">Property State</label>
                    <select value={form.propertyState} onChange={(e) => f("propertyState", e.target.value)} className="form-select">
                      <option value="">Select...</option>{STATES.map((s) => <option key={s}>{s}</option>)}</select></div>
                  <div><label className="form-label">Property Pincode</label>
                    <select value={form.pincode} onChange={(e) => f("pincode", e.target.value)} className="form-select" disabled={!form.propertyState}>
                      <option value="">{form.propertyState ? "Select pincode..." : "Select property state first"}</option>
                      {(PINCODES[form.propertyState] || []).map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
                    </select></div>
                  <div><label className="form-label">Area Category</label>
                    <select value={form.area} onChange={(e) => f("area", e.target.value)} className="form-select">
                      <option value="">Select...</option>{areas.map((a) => <option key={a}>{a}</option>)}</select></div>
                </div>
              )}

              {step === 1 && (
                <div className="form-grid">
                  <div><label className="form-label">Transaction Type</label>
                    <select value={form.txnType} onChange={(e) => f("txnType", e.target.value)} className="form-select">
                      <option value="">Select...</option>{TRANSACTION_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
                  <div><label className="form-label">Property Type (Agricultural / Non-Agricultural)</label>
                    <select value={form.propType} onChange={(e) => f("propType", e.target.value)} className="form-select">
                      <option value="">Select...</option>{PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
                  <div><label className="form-label">Municipal / Rural Status</label>
                    <select value={form.municipalStatus} onChange={(e) => f("municipalStatus", e.target.value)} className="form-select">
                      <option value="">Select...</option>
                      {["Within municipal / notified limits", "Outside municipal / rural limits", "Unsure"].map((t) => <option key={t}>{t}</option>)}
                    </select></div>
                  {isRentLike(form.txnType) && (
                    <div><label className="form-label">Lease Term (months)</label>
                      <input type="text" value={form.leaseMonths} onChange={(e) => f("leaseMonths", e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="e.g. 11 or 24" className="form-input" /></div>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="form-grid">
                  <div><label className="form-label">Buyer Gender</label>
                    <select value={form.gender} onChange={(e) => f("gender", e.target.value)} className="form-select">
                      <option value="">Select...</option>{GENDERS.map((g) => <option key={g}>{g}</option>)}</select></div>
                  <div><label className="form-label">Buyer Age</label>
                    <input type="text" value={form.age} onChange={(e) => f("age", e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
                      placeholder="e.g. 35" className="form-input" inputMode="numeric" /></div>
                  <div><label className="form-label">Buyer Type</label>
                    <select value={form.buyerType} onChange={(e) => f("buyerType", e.target.value)} className="form-select">
                      {BUYER_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
                  <div><label className="form-label">Approx. Property Value ({"₹"})</label>
                    <input type="text" value={form.value} onChange={(e) => f("value", e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="e.g. 5000000" className="form-input" /></div>
                  <div><label className="form-label">Resident or Outsider</label>
                    <select value={form.residency} onChange={(e) => f("residency", e.target.value)} className="form-select">
                      <option value="">Select...</option>
                      {["Resident of the property state", "Outsider (resident of another state)"].map((t) => <option key={t}>{t}</option>)}
                    </select></div>
                  <div><label className="form-label">Buying Capacity</label>
                    <select value={form.buyingCapacity} onChange={(e) => f("buyingCapacity", e.target.value)} className="form-select">
                      <option value="">Select...</option>
                      {["Individual", "Company / LLP", "Bank / Financial institution", "Trust / Society", "Government / PSU"].map((t) => <option key={t}>{t}</option>)}
                    </select></div>
                  <div><label className="form-label">Relationship with Seller</label>
                    <select value={form.sellerRelation} onChange={(e) => f("sellerRelation", e.target.value)} className="form-select">
                      <option value="">Select...</option>
                      {["Not a blood relative", "Spouse", "Child", "Grandchild", "Parent", "Sibling", "Other relative"].map((t) => <option key={t}>{t}</option>)}
                    </select></div>
                  <div><label className="form-label">Tribal Classification</label>
                    <select value={form.tribalStatus} onChange={(e) => f("tribalStatus", e.target.value)} className="form-select">
                      <option value="">Select...</option>
                      {["Non-tribal", "Tribal (Scheduled Tribe)", "Unsure"].map((t) => <option key={t}>{t}</option>)}
                    </select></div>
                </div>
              )}
            </div>

            <div className="wiz-nav">
              {step > 0 ? <button className="btn btn-outline" type="button" onClick={() => setStep(step - 1)}>{"← Back"}</button> : <span />}
              {step < steps.length - 1
                ? <button type="button" className={`btn ${done(step) ? "btn-primary" : ""}`} disabled={!done(step)} onClick={() => setStep(step + 1)}>{"Next →"}</button>
                : <button onClick={runCheck} disabled={!canSubmit || loading} className={`btn ${canSubmit ? "btn-primary" : ""}`}>{loading ? <LoadingDots /> : "Check Eligibility"}</button>}
            </div>
          </div>
        );
      })()}

      {form.propertyState && !loading && !result && !agentData && (
        <QuickInfoPanel state={form.propertyState} txnType={form.txnType} />
      )}

      {agentError && <p className="alert alert-warning" style={{ marginTop: 8 }}>{agentError}</p>}

      {agentData && <AgentReport data={agentData} />}

      {result && (typeof result === "string" ? <div className="card">{formatAIResponse(result)}</div> : <LocalReport report={result} form={form} />)}
    </div>
  );
}

function QuickInfoPanel({ state, txnType }) {
  const jurisdiction = JURISDICTION_RULES[state];
  const payment = PAYMENT_METHODS[state];
  const hierarchy = PROPERTY_ID_HIERARCHY[state];
  if (!jurisdiction) return null;

  return (
    <div className="card" style={{ borderColor: "var(--accent)" }}>
      <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: "var(--accent)" }}>
        Quick Reference: {state}
      </h4>
      <div className="info-grid">
        <div className="info-item">
          <div className="label">Jurisdiction</div>
          <div className="value">{jurisdiction.type}</div>
          <div style={{ fontSize: 11, color: "var(--fg-secondary)", marginTop: 2 }}>{jurisdiction.tip}</div>
        </div>
        <div className="info-item">
          <div className="label">Payment Methods</div>
          <div className="value">{payment?.stampDuty.join(", ")}</div>
          {payment?.note && <div style={{ fontSize: 11, color: "var(--danger)", marginTop: 2 }}>{payment.note}</div>}
        </div>
        <div className="info-item">
          <div className="label">SRO Offices</div>
          <div className="value">{hierarchy?.sroCount} Sub-Registrar offices</div>
          <div style={{ fontSize: 11, color: "var(--fg-secondary)", marginTop: 2 }}>Portal: {hierarchy?.portal}</div>
        </div>
      </div>
      {txnType && DOCUMENT_CHECKLIST[txnType] && (
        <div style={{ marginTop: 12 }}>
          <div className="form-label">Required Documents for {txnType}</div>
          <div style={{ fontSize: 12, color: "var(--fg-secondary)", lineHeight: 1.8 }}>
            {DOCUMENT_CHECKLIST[txnType].map((doc, i) => (
              <div key={i} style={{ paddingLeft: 12 }}>{i + 1}. {doc}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

// Defensive normalisation of whatever Gemini returns for Analyze Risk.
function normalizeRisk(data) {
  const findings = Array.isArray(data && data.findings) ? data.findings : [];
  const clean = findings.map((f) => ({
    clauseRef: String((f && f.clauseRef) || "").slice(0, 120),
    clauseQuote: String((f && f.clauseQuote) || "").slice(0, 400),
    risk: String((f && f.risk) || "Risk"),
    severity: ["high", "medium", "low"].includes(f && f.severity) ? f.severity : "medium",
    why: String((f && f.why) || ""),
    suggestion: String((f && f.suggestion) || ""),
    improvedClause: String((f && f.improvedClause) || ""),
    legalBasis: f && f.legalBasis ? String(f.legalBasis) : null,
  }));
  clean.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  return { summary: String((data && data.summary) || ""), findings: clean };
}

function Disclaimer() {
  return (
    <div className="alert alert-info" style={{ marginTop: 12, fontSize: 12, fontWeight: 500 }}>
      This is legal information, not legal advice. Consult a registered advocate or your nearest DLSA (District Legal Services Authority) before acting. Any law cited above comes only from our grounded clause library.
    </div>
  );
}

// Locate each finding's verbatim clauseQuote inside the contract text so we can
// highlight it inline. Exact case-insensitive match; overlaps are dropped.
function findClauseRanges(text, findings) {
  const lower = text.toLowerCase();
  const ranges = [];
  findings.forEach((f, i) => {
    const q = (f.clauseQuote || "").trim();
    if (q.length < 6) return;
    const idx = lower.indexOf(q.toLowerCase());
    if (idx === -1) return; // paraphrased/translated → shown in the list, not highlighted
    ranges.push({ start: idx, end: idx + q.length, i });
  });
  ranges.sort((a, b) => a.start - b.start || b.end - a.end);
  const out = [];
  let lastEnd = -1;
  for (const r of ranges) { if (r.start >= lastEnd) { out.push(r); lastEnd = r.end; } }
  return out;
}

function RedlineDetail({ f }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={`rl-detail rl-detail-${f.severity}`}>
      <div className="rl-detail-h">
        <span className={`sev sev-${f.severity}`}>{f.severity.toUpperCase()}</span>
        <span className="why-title" style={{ marginBottom: 0 }}>{f.risk}</span>
      </div>
      {f.clauseQuote && (
        <>
          <div className="rl-lbl">In your contract</div>
          <div className="rl-quote">{"“"}{f.clauseQuote}{"”"}</div>
        </>
      )}
      <div className="why-body" style={{ marginTop: 10 }}>{f.why}</div>
      {f.suggestion && <div className="fix-box"><b>{"✔ "}</b>{f.suggestion}</div>}
      {f.improvedClause && (
        <div className="rl-improved">
          <div className="rl-improved-h">
            <span>{"✍️ "}Suggested rewrite</span>
            <button className="rl-copy" onClick={() => { try { navigator.clipboard?.writeText(f.improvedClause); } catch { /* clipboard blocked */ } setCopied(true); setTimeout(() => setCopied(false), 1200); }}>
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <div className="rl-improved-body">{f.improvedClause}</div>
        </div>
      )}
      {f.legalBasis && <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 10, fontWeight: 600 }}>{"📖 "}{f.legalBasis}</div>}
    </div>
  );
}

// Redlining view: the contract with risky clauses highlighted; click a highlight
// (or a chip) to open its explanation + a suggested safer rewrite.
function RedlineView({ data, contractText }) {
  const findings = data.findings || [];
  const ranges = findClauseRanges(contractText || "", findings);
  const matched = new Set(ranges.map((r) => r.i));
  const [active, setActive] = useState(0); // findings are severity-sorted → open on the most severe
  const counts = findings.reduce((a, f) => { a[f.severity] = (a[f.severity] || 0) + 1; return a; }, {});

  if (!findings.length) {
    return (
      <div className="card ai-output">
        <p style={{ fontSize: 13 }}>{data.summary || "No specific risks were identified in this contract."}</p>
        <Disclaimer />
      </div>
    );
  }

  const segs = [];
  let cursor = 0;
  ranges.forEach((r) => {
    if (r.start > cursor) segs.push({ t: contractText.slice(cursor, r.start), i: null });
    segs.push({ t: contractText.slice(r.start, r.end), i: r.i });
    cursor = r.end;
  });
  if (cursor < (contractText || "").length) segs.push({ t: contractText.slice(cursor), i: null });

  return (
    <div className="card report" style={{ padding: 0, overflow: "hidden" }}>
      <div className="rl-head">
        <div className="rl-head-title">{"⚖️"} Contract redline</div>
        <div className="rl-head-pills">
          {["high", "medium", "low"].map((s) => counts[s]
            ? <span key={s} className={`rl-pill rl-pill-${s}`}>{counts[s]} {s}</span>
            : null)}
        </div>
      </div>
      {data.summary && <div className="rl-summary">{data.summary}</div>}
      <div className="rl-wrap">
        <div className="rl-doc ai-output">
          {segs.length ? segs.map((s, k) => (
            s.i == null
              ? <span key={k}>{s.t}</span>
              : <mark key={k} className={`rl-mark rl-${findings[s.i].severity} ${active === s.i ? "rl-on" : ""}`}
                  onClick={() => setActive(s.i)} title={findings[s.i].risk}>{s.t}</mark>
          )) : <span style={{ color: "var(--fg-secondary)" }}>The contract text isn’t available to highlight — pick an issue below.</span>}
        </div>
        <div className="rl-side">
          <div className="rl-count">{findings.length} issue{findings.length !== 1 ? "s" : ""} · {ranges.length} highlighted</div>
          <div className="rl-list">
            {findings.map((f, i) => (
              <button key={i} className={`rl-chip rl-chip-${f.severity} ${active === i ? "on" : ""}`} onClick={() => setActive(i)}>
                <span className={`rl-dot rl-dot-${f.severity}`} />
                <span className="rl-chip-t">{f.risk}</span>
                {!matched.has(i) && <span className="rl-nl">·not located</span>}
              </button>
            ))}
          </div>
          <RedlineDetail f={findings[active]} />
        </div>
      </div>
      <div style={{ padding: "0 16px 12px" }}><Disclaimer /></div>
    </div>
  );
}

function UnderstandTab({ geminiKey, setGeminiKey }) {
  const [language, setLanguage] = useState("Hindi");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseNote, setParseNote] = useState("");
  const [explainOut, setExplainOut] = useState(null);
  const [riskOut, setRiskOut] = useState(null);
  const [busy, setBusy] = useState("");          // "" | "explain" | "risk"
  const [error, setError] = useState("");
  const [keyInput, setKeyInput] = useState("");

  // Parsing is client-side (Scribe) and needs no key. The doc is read in English;
  // the chosen OUTPUT language is applied later by Gemini, not here.
  const onFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";                          // allow re-uploading the same file
    if (!file) return;
    setParsing(true); setParseNote(""); setError(""); setFileName(file.name);
    try {
      const { text: t } = await parseDocument({ file });
      if (!t) setParseNote("Couldn't read text from that file. If it's a scan/photo, OCR may have failed — try pasting the text instead.");
      else { setText(t); setParseNote(`Loaded ${t.length.toLocaleString()} characters from ${file.name}.`); }
    } catch (err) {
      setParseNote("Parse failed: " + (err.message || "unknown error") + ". You can paste the text instead.");
    } finally {
      setParsing(false);
    }
  };

  const run = async (op) => {
    setError("");
    if (!geminiKey) return;
    if (text.trim().length < 30) { setError("Add a contract first — upload a PDF or paste at least a clause of text."); return; }
    setBusy(op);
    setExplainOut(null); setRiskOut(null); // only the latest request's output is shown
    try {
      const script = scriptFor(language);
      const { grounding } = groundingForText(text);       // detect state/type + assemble citable sources
      if (op === "explain") {
        const out = await callGemini(geminiKey, {
          system: UNDERSTAND_SYSTEM,
          prompt: buildExplainPrompt({ text, language, script, grounding }),
          temperature: 0.4,
        });
        setExplainOut(out);
      } else {
        const data = await callGeminiJSON(geminiKey, {
          system: UNDERSTAND_SYSTEM,
          prompt: buildRiskPrompt({ text, language, script, grounding }),
          schema: RISK_SCHEMA,
        });
        setRiskOut(normalizeRisk(data));
      }
    } catch (err) {
      setError(friendlyError(err.message));
    } finally {
      setBusy("");
    }
  };

  const ready = text.trim().length >= 30;

  return (
    <div className="page">
      <h2 className="section-title">{"📄"} Decode My Contract</h2>
      <p className="section-desc">Upload a PDF (digital or scanned) or paste the text. Then get a plain-language explanation, or a risk analysis — written in your chosen language.</p>

      {!geminiKey ? (
        <div className="card" style={{ marginBottom: 12 }}>
          <label className="form-label">Google Gemini API key</label>
          <p style={{ fontSize: 12, color: "var(--fg-secondary)", margin: "0 0 8px" }}>
            Stored only in this browser — never committed or sent anywhere except Google. Get a free key at{" "}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a>. (Upload &amp; paste work without a key.)
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="password" autoComplete="off" value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)} placeholder="Paste your Gemini API key"
              style={{ flex: 1, padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 6, font: "inherit" }} />
            <button className="btn btn-primary" disabled={!keyInput.trim()}
              onClick={() => { const k = keyInput.trim(); localStorage.setItem(GEMINI_KEY_STORAGE, k); setGeminiKey(k); setKeyInput(""); }}>
              Save key
            </button>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 11, color: "var(--fg-secondary)", marginBottom: 8 }}>
          {"✓"} Gemini key set ·{" "}
          <button onClick={() => { localStorage.removeItem(GEMINI_KEY_STORAGE); setGeminiKey(""); }}
            style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", padding: 0, font: "inherit", textDecoration: "underline" }}>
            change / remove
          </button>
        </p>
      )}

      <div className="card">
        <div className="form-grid" style={{ marginBottom: 12 }}>
          <div>
            <label className="form-label">Output Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="form-select">
              {OUTPUT_LANGUAGES.map((l) => <option key={l.label} value={l.label}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Upload PDF</label>
            <label className="btn btn-sm btn-outline" style={{ display: "inline-block", cursor: parsing ? "wait" : "pointer" }}>
              {parsing ? "Reading…" : "Choose PDF"}
              <input type="file" accept="application/pdf,.pdf" onChange={onFile} style={{ display: "none" }} disabled={parsing} />
            </label>
          </div>
        </div>

        <div className="chip-row">
          {Object.keys(SAMPLE_CONTRACTS).map((name) => (
            <button key={name} className="btn btn-sm btn-outline" onClick={() => { setText(SAMPLE_CONTRACTS[name]); setParseNote("Loaded sample: " + name); setFileName(""); }}>
              {"📝"} {name}
            </button>
          ))}
        </div>

        <textarea value={text} onChange={(e) => { setText(e.target.value); setFileName(""); }}
          placeholder="Paste your contract / clause text here, or upload a PDF above…" rows={11} className="form-textarea" />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--fg-secondary)" }}>
            {parsing ? <LoadingDots /> : `${text.length.toLocaleString()} characters`}{fileName && !parsing ? ` · ${fileName}` : ""}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => run("explain")} disabled={!geminiKey || !ready || !!busy}
              className={`btn ${geminiKey && ready ? "btn-primary" : ""}`}>
              {busy === "explain" ? <LoadingDots /> : geminiKey ? "Explain" : "Add Gemini key"}
            </button>
            <button onClick={() => run("risk")} disabled={!geminiKey || !ready || !!busy}
              className={`btn ${geminiKey && ready ? "btn-danger" : ""}`}>
              {busy === "risk" ? <LoadingDots /> : geminiKey ? "Analyze Risk" : "Add Gemini key"}
            </button>
          </div>
        </div>
        {parseNote && <p style={{ fontSize: 11, color: "var(--fg-secondary)", marginTop: 8 }}>{parseNote}</p>}
        {error && <p className="alert alert-danger" style={{ marginTop: 10 }}>{error}</p>}
      </div>

      {explainOut && (
        <div className="card ai-output">
          <div className="doc-group-label" style={{ marginTop: 0 }}>Explanation · {language}</div>
          {formatAIResponse(explainOut)}
          <Disclaimer />
        </div>
      )}

      {riskOut && (
        <>
          <div className="doc-group-label">Redline · risky clauses highlighted · {language}</div>
          <RedlineView data={riskOut} contractText={text} />
        </>
      )}
    </div>
  );
}

function StampDutyTab() {
  const [txnType, setTxnType] = useState("Sale Deed (Property Purchase)");
  const [gender, setGender] = useState("Male");
  const [value, setValue] = useState("5000000");
  const val = parseInt(value) || 0;

  const getRate = (state, area) => {
    const stateData = STAMP_DUTY[state]?.[txnType];
    if (!stateData) return null;
    const areaData = stateData[area];
    if (!areaData) return null;
    const genderKey = gender === "Male" ? "male" : gender === "Female" ? "female" : "joint";
    return { ...areaData, rate: areaData[genderKey] };
  };

  let cheapest = { state: "", area: "", total: Infinity };
  let mostExpensive = { state: "", area: "", total: 0 };
  STATES.forEach((state) => {
    (AREA_CATEGORIES[state] || []).forEach((area) => {
      const r = getRate(state, area);
      if (!r) return;
      const total = Math.round(val * (r.rate + (r.regFee || 0) + (r.cess || 0)) / 100);
      if (total < cheapest.total && total > 0) cheapest = { state, area, total };
      if (total > mostExpensive.total) mostExpensive = { state, area, total };
    });
  });

  return (
    <div className="page">
      <h2 className="section-title">{"💰"} Compare Registration Costs</h2>
      <p className="section-desc">Compare stamp duty across all 4 states. Rates as of June 2026 {"—"} verify with your local Sub-Registrar.</p>

      <div className="card" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
        <div>
          <label className="form-label">Transaction</label>
          <select value={txnType} onChange={(e) => setTxnType(e.target.value)} className="form-select">
            {["Sale Deed (Property Purchase)", "Rent Agreement", "Gift Deed"].map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Gender</label>
          <select value={gender} onChange={(e) => setGender(e.target.value)} className="form-select">
            {GENDERS.map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Value ({"₹"})</label>
          <input type="text" value={value} onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ""))}
            className="form-input" style={{ width: 140 }} />
        </div>
      </div>

      {val > 0 && cheapest.total < Infinity && (
        <div className="card" style={{ display: "flex", gap: 16, justifyContent: "space-between", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--success)", textTransform: "uppercase" }}>Cheapest</div>
            <div style={{ fontSize: 16, fontWeight: 900 }}>{cheapest.state} ({cheapest.area})</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--success)" }}>{"₹"}{cheapest.total.toLocaleString("en-IN")}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--danger)", textTransform: "uppercase" }}>Most Expensive</div>
            <div style={{ fontSize: 16, fontWeight: 900 }}>{mostExpensive.state} ({mostExpensive.area})</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--danger)" }}>{"₹"}{mostExpensive.total.toLocaleString("en-IN")}</div>
          </div>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-secondary)", textTransform: "uppercase" }}>Difference</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "var(--accent)" }}>
              {"₹"}{(mostExpensive.total - cheapest.total).toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      )}

      {STATES.map((state) => (
        <div key={state} className="state-block">
          <h3>{state}
            {STATE_EXEMPTIONS[state]?.some(e => e.type.includes("Female") && gender === "Female") &&
              <span className="badge badge-low" style={{ marginLeft: 8, fontSize: 9 }}>Female Concession</span>}
          </h3>
          <div>
            {(AREA_CATEGORIES[state] || []).map((area) => {
              const r = getRate(state, area);
              if (!r) return null;
              const stampAmt = Math.round(val * r.rate / 100);
              const regAmt = r.regFee ? Math.round(val * r.regFee / 100) : 0;
              const cessAmt = r.cess ? Math.round(val * r.cess / 100) : 0;
              const total = stampAmt + regAmt + cessAmt;
              const totalPct = r.rate + (r.regFee || 0) + (r.cess || 0);
              return (
                <div key={area} className="area-row">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{area}</span>
                    <span style={{ fontSize: 16, fontWeight: 900, color: "var(--accent)" }}>{"₹"}{total.toLocaleString("en-IN")}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, fontSize: 11, color: "var(--fg-secondary)", flexWrap: "wrap" }}>
                    <span>Stamp: {r.rate}% ({"₹"}{stampAmt.toLocaleString("en-IN")})</span>
                    {r.regFee > 0 && <span>Reg: {r.regFee}% ({"₹"}{regAmt.toLocaleString("en-IN")})</span>}
                    {r.cess > 0 && <span>Cess: {r.cess}%</span>}
                    <span style={{ fontWeight: 700 }}>Total: {totalPct.toFixed(1)}%</span>
                  </div>
                  {r.notes && <div style={{ fontSize: 11, color: "var(--fg-secondary)", marginTop: 6, lineHeight: 1.5, fontStyle: "italic" }}>{r.notes}</div>}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="alert alert-warning" style={{ fontSize: 11, fontWeight: 500 }}>
        Stamp duty rates are indicative (June 2026). Actual duty depends on circle rate / Ready Reckoner / Guidance Value.
        Under Indian Stamp Act Section 19, duty is always per the state where property is located. Verify at your state&apos;s IGR portal.
      </div>
    </div>
  );
}

function ToolsTab() {
  const [subTab, setSubTab] = useState("converter");

  return (
    <div className="page">
      <h2 className="section-title">{"🛠️"} Property Law Toolkit</h2>
      <p className="section-desc">Unit converter, property ID hierarchy, jurisdiction guide, exemptions, and registration process.</p>

      <div className="inner-tabs">
        {[
          { id: "converter", label: "Unit Converter" },
          { id: "hierarchy", label: "Property ID" },
          { id: "process", label: "Registration Steps" },
          { id: "exemptions", label: "Exemptions" },
          { id: "jurisdiction", label: "Jurisdiction" },
        ].map((t) => (
          <button key={t.id} className={`inner-tab ${subTab === t.id ? "active" : ""}`}
            onClick={() => setSubTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {subTab === "converter" && <UnitConverter />}
      {subTab === "hierarchy" && <PropertyHierarchy />}
      {subTab === "process" && <RegistrationProcess />}
      {subTab === "exemptions" && <ExemptionsGuide />}
      {subTab === "jurisdiction" && <JurisdictionGuide />}
    </div>
  );
}

function UnitConverter() {
  const [fromUnit, setFromUnit] = useState("Kanal");
  const [toUnit, setToUnit] = useState("Sq. Meter");
  const [fromValue, setFromValue] = useState("1");
  const [fromState, setFromState] = useState("Punjab");
  const [toState, setToState] = useState("Karnataka");

  const allUnits = Object.keys(UNIT_TO_SQFT);
  const val = parseFloat(fromValue) || 0;
  const sqft = val * (UNIT_TO_SQFT[fromUnit] || 1);
  const result = sqft / (UNIT_TO_SQFT[toUnit] || 1);

  return (
    <>
      <div className="card">
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
          {"📏"} Land Measurement Converter
        </h4>
        <p style={{ fontSize: 12, color: "var(--fg-secondary)", marginBottom: 12 }}>
          India uses 15+ different land measurement units across states. Convert between them here.
        </p>
        <div className="form-grid">
          <div>
            <label className="form-label">From State</label>
            <select value={fromState} onChange={(e) => { setFromState(e.target.value); setFromUnit(LAND_UNITS[e.target.value]?.[0] || "Sq. Feet"); }}
              className="form-select">
              {STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">To State</label>
            <select value={toState} onChange={(e) => { setToState(e.target.value); setToUnit(LAND_UNITS[e.target.value]?.[0] || "Sq. Feet"); }}
              className="form-select">
              {STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Value</label>
            <input type="text" value={fromValue} onChange={(e) => setFromValue(e.target.value.replace(/[^0-9.]/g, ""))}
              className="form-input" />
          </div>
          <div>
            <label className="form-label">From Unit ({fromState})</label>
            <select value={fromUnit} onChange={(e) => setFromUnit(e.target.value)} className="form-select">
              {(LAND_UNITS[fromState] || allUnits).map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">To Unit ({toState})</label>
            <select value={toUnit} onChange={(e) => setToUnit(e.target.value)} className="form-select">
              {(LAND_UNITS[toState] || allUnits).map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="converter-result">
        <div style={{ fontSize: 14, color: "var(--fg-secondary)", marginBottom: 4 }}>
          {val} {fromUnit} ({fromState}) =
        </div>
        <div className="converter-value">
          {result < 0.01 ? result.toExponential(2) : result.toLocaleString("en-IN", { maximumFractionDigits: 4 })} {toUnit}
        </div>
        <div style={{ fontSize: 12, color: "var(--fg-secondary)", marginTop: 4 }}>
          ({toState} unit) = {sqft.toLocaleString("en-IN", { maximumFractionDigits: 2 })} sq.ft
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Common Conversions</h4>
        <div style={{ fontSize: 12, color: "var(--fg-secondary)", lineHeight: 2 }}>
          <div>1 Kanal = 5,445 sq.ft = 20 Marla (HP/Punjab)</div>
          <div>1 Bigha = 27,000 sq.ft (varies by state)</div>
          <div>1 Acre = 43,560 sq.ft = 40 Gunta (Karnataka)</div>
          <div>1 Hectare = 2.47 Acres = 107,639 sq.ft</div>
          <div>1 Gunta = 1,089 sq.ft (Karnataka/Maharashtra)</div>
          <div>1 Cent = 435.6 sq.ft (Kerala/Karnataka)</div>
        </div>
      </div>
    </>
  );
}

function PropertyHierarchy() {
  return (
    <>
      <div className="card">
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
          {"🗺️"} Property Identification Hierarchy by State
        </h4>
        <p style={{ fontSize: 12, color: "var(--fg-secondary)", marginBottom: 12 }}>
          Every state uses different terminology to identify a piece of land.
          This is the #1 source of confusion for property buyers.
        </p>
      </div>

      {STATES.map((state) => {
        const info = PROPERTY_ID_HIERARCHY[state];
        if (!info) return null;
        return (
          <div key={state} className="card">
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{state}</h4>
            <div className="hierarchy-flow">
              {info.hierarchy.map((item, i) => (
                <span key={item}>
                  <span className="hierarchy-item">{item}</span>
                  {i < info.hierarchy.length - 1 && <span className="hierarchy-arrow"> {"→"} </span>}
                </span>
              ))}
            </div>
            <div className="info-grid" style={{ marginTop: 10 }}>
              <div className="info-item">
                <div className="label">Land Record</div>
                <div className="value">{info.recordName}</div>
                <div style={{ fontSize: 11, color: "var(--fg-secondary)" }}>{info.recordDesc}</div>
              </div>
              <div className="info-item">
                <div className="label">Portal</div>
                <div className="value" style={{ wordBreak: "break-all" }}>{info.portal}</div>
                <div style={{ fontSize: 11, color: "var(--fg-secondary)" }}>{info.sroCount} SRO offices</div>
              </div>
            </div>
          </div>
        );
      })}

      <div className="alert alert-info" style={{ fontSize: 12, fontWeight: 500 }}>
        When buying in another state, understand the mapping: Punjab&apos;s &quot;Tehsil&quot; = Karnataka&apos;s &quot;Taluk&quot;,
        Punjab&apos;s &quot;Khasra No.&quot; = Maharashtra&apos;s &quot;Survey No.&quot;.
        Always verify the property identifier with the local SRO before executing any deed.
      </div>
    </>
  );
}

function RegistrationProcess() {
  return (
    <>
      <div className="card">
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
          {"📋"} 10-Step Registration Process (NGDRS Standard)
        </h4>
        <p style={{ fontSize: 12, color: "var(--fg-secondary)", marginBottom: 12 }}>
          This is the universal registration process documented in the NGDRS SRS.
          Each step may vary by state {"—"} check state-specific portals.
        </p>
      </div>

      {REGISTRATION_STEPS.map((step) => (
        <div key={step.step} className="step-item">
          <div className="step-icon">{step.icon}</div>
          <div>
            <div className="step-num">Step {step.step}</div>
            <div className="step-title">{step.title}</div>
            <div className="step-desc">{step.desc}</div>
          </div>
        </div>
      ))}

      <div className="card" style={{ marginTop: 8 }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--warning)" }}>
          {"⏰"} Timing Rules
        </h4>
        <div style={{ fontSize: 12, color: "var(--fg-secondary)", lineHeight: 1.8 }}>
          <div><strong>Normal window:</strong> 4 months (120 days) from execution date</div>
          <div><strong>Late with penalty:</strong> Up to 8 months (4 additional months) with late fees</div>
          <div><strong>After 8 months:</strong> Document REFUSED by SRO</div>
          <div><strong>Exception:</strong> Wills have NO time limit for presentation</div>
        </div>
      </div>
    </>
  );
}

function ExemptionsGuide() {
  return (
    <>
      <div className="card">
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
          {"💸"} Stamp Duty Exemptions & Concessions
        </h4>
        <p style={{ fontSize: 12, color: "var(--fg-secondary)", marginBottom: 4 }}>
          These are &quot;hidden savings&quot; most citizens don&apos;t know about. Check if you qualify.
        </p>
      </div>

      {STATES.map((state) => {
        const exemptions = STATE_EXEMPTIONS[state];
        if (!exemptions) return null;
        return (
          <div key={state} className="card">
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{state}</h4>
            {exemptions.map((ex, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "120px 1fr 90px",
                gap: 8, padding: "8px 0", borderBottom: i < exemptions.length - 1 ? "1px solid var(--border)" : "none",
                fontSize: 12, alignItems: "center",
              }}>
                <div style={{ fontWeight: 700, color: "var(--accent)" }}>{ex.type}</div>
                <div style={{ color: "var(--fg-secondary)" }}>{ex.details}</div>
                <div style={{ fontWeight: 700, color: "var(--success)", textAlign: "right" }}>{ex.saving}</div>
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}

function JurisdictionGuide() {
  return (
    <>
      <div className="card">
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
          {"🏢"} Jurisdiction Rules by State
        </h4>
        <p style={{ fontSize: 12, color: "var(--fg-secondary)", marginBottom: 4 }}>
          Which SRO office you need to visit depends on the state and area type.
        </p>
      </div>

      {STATES.map((state) => {
        const j = JURISDICTION_RULES[state];
        const payment = PAYMENT_METHODS[state];
        const lang = STATE_LANGUAGES[state];
        if (!j) return null;
        return (
          <div key={state} className="card">
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{state}</h4>
            <div className="info-grid">
              <div className="info-item">
                <div className="label">Jurisdiction Type</div>
                <div className="value">{j.type}</div>
                <div style={{ fontSize: 11, color: "var(--fg-secondary)", marginTop: 2 }}>{j.rule}</div>
              </div>
              <div className="info-item" style={{ background: "var(--accent-light)" }}>
                <div className="label">Tip</div>
                <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>{j.tip}</div>
              </div>
              <div className="info-item">
                <div className="label">Accepted Languages</div>
                <div className="value">{lang?.registration.join(", ")}</div>
                <div style={{ fontSize: 11, color: "var(--danger)", marginTop: 2 }}>{lang?.warning}</div>
              </div>
              <div className="info-item">
                <div className="label">Payment Methods</div>
                <div className="value" style={{ fontSize: 11 }}>{payment?.stampDuty.join(", ")}</div>
                {payment?.note && <div style={{ fontSize: 11, color: "var(--danger)", marginTop: 2 }}>{payment.note}</div>}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

export default function App() {
  const [tab, setTab] = useState("home");
  // Gemini key is supplied by the user and stored only in localStorage (no embedded key).
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem(GEMINI_KEY_STORAGE) || DEFAULT_GEMINI_KEY);

  return (
    <div className="app">
      <nav className="nav">
        {TABS.map((t) => (
          <button key={t.id} className={`nav-btn ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </nav>

      {tab === "home" && <HomeTab setTab={setTab} />}
      {tab === "eligibility" && <EligibilityTab />}
      {tab === "understand" && <UnderstandTab geminiKey={geminiKey} setGeminiKey={setGeminiKey} />}
      {tab === "stampduty" && <StampDutyTab />}
      {tab === "tools" && <ToolsTab />}

      <footer className="footer">
        <strong>{"⚖️"} PropertyIQ</strong> {"—"} Know Before You Buy<br />
        This tool provides legal information, not legal advice. Consult a registered advocate or your nearest DLSA.<br />
        Laws as of June 2026. Built for Code of Law Challenge 2026 by Rhett.legal.<br />        <span style={{ color: "#999" }}>HP {"•"} Maharashtra {"•"} Karnataka {"•"} Punjab</span>
      </footer>
      <Analytics />
    </div>
  );
}
