// PropertyIQ eligibility report engine (pure, no JSX/DOM).
//
// Relocated verbatim from src/App.jsx so the redesigned wizard page
// (src/pages/Eligibility.jsx) and any test can reuse it. The AI flow is
// unchanged: the page still POSTs `form` to /api/eligibility and falls back to
// buildLocalEligibilityReport(form). `toEligibilityForm` maps the wizard's
// state to the exact 16-field `form` the agent + rule engine expect.

import { STAMP_DUTY, PROPERTY_ID_HIERARCHY, READY_RECKONER_INFO } from "../data/constants.js";
import { PROPERTY_LAW_DB } from "../data/propertyLawDatabase.js";

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


// ---- Wizard → AI form mapping -------------------------------------------
// The redesign wizard stores state keys (hp/mh/ka/pb) for the route and
// AI-exact strings for every Select (they are driven by the constants arrays).
// This assembles the 16-field `form` object the agent + rule engine consume.
export const KEY_TO_STATE = { hp: "Himachal Pradesh", mh: "Maharashtra", ka: "Karnataka", pb: "Punjab" };

export const PINCODES = {
  "Himachal Pradesh": [{ v: "171001", l: "171001 — Urban" }, { v: "175001", l: "175001 — Rural" }],
  Maharashtra: [{ v: "400001", l: "400001 — Urban" }, { v: "413001", l: "413001 — Rural" }],
  Karnataka: [{ v: "560001", l: "560001 — Urban" }, { v: "581301", l: "581301 — Rural" }],
  Punjab: [{ v: "141001", l: "141001 — Urban" }, { v: "141801", l: "141801 — Rural" }],
};

export function toEligibilityForm(w) {
  const buyerState = w.from ? KEY_TO_STATE[w.from] : "";
  const propertyState = w.to ? KEY_TO_STATE[w.to] : "";
  return {
    buyerState,
    propertyState,
    pincode: w.pincode || "",
    txnType: w.txnType || "",
    propType: w.propType || "",
    gender: w.gender || "",
    age: w.age || "",
    buyerType: w.buyerType || "Indian Resident",
    value: w.value || "",
    area: w.area || "",
    municipalStatus: w.municipalStatus || "",
    // Derived: living in the destination state vs. buying across a border.
    residency: buyerState && propertyState
      ? (w.from === w.to ? "Resident of the property state" : "Outsider (resident of another state)")
      : "",
    buyingCapacity: w.buyingCapacity || "",
    sellerRelation: w.sellerRelation || "",
    tribalStatus: w.tribalStatus || "",
    leaseMonths: w.leaseMonths || "",
  };
}

export { buildLocalEligibilityReport, getStampQuote, INDIA_CODE_URL, LEGAL_AID_URL };
