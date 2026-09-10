export const STATES = ["Himachal Pradesh", "Maharashtra", "Karnataka", "Punjab"];

export const TRANSACTION_TYPES = [
  "Sale Deed (Property Purchase)",
  "Rent Agreement",
];

export const PROPERTY_TYPES = ["Residential", "Agricultural", "Commercial", "Industrial"];

export const BUYER_TYPES = ["Indian Resident", "NRI / OCI"];

export const GENDERS = ["Male", "Female", "Joint (Male + Female)"];

export const LANGUAGES = ["Hindi", "Punjabi", "Kannada", "Marathi"];

export const AREA_CATEGORIES = {
  "Himachal Pradesh": ["General / Urban", "Rural"],
  Maharashtra: [
    "Mumbai Municipal Corp",
    "Pune / Nagpur / Other MC",
    "Rural Maharashtra",
  ],
  Karnataka: [
    "Bangalore Urban (BBMP)",
    "Other Urban",
    "Rural (≥45L value)",
  ],
  Punjab: ["Urban (MC limits)", "Rural"],
};

export const STAMP_DUTY = {
  "Himachal Pradesh": {
    "Sale Deed (Property Purchase)": {
      "General / Urban": {
        male: 6, female: 4, joint: 5, regFee: 2, cess: 0,
        notes: "Non-HP residents pay 12% + 2% reg. HP Sec 118 restricts agricultural land purchase by non-agriculturists.",
      },
      Rural: {
        male: 6, female: 4, joint: 5, regFee: 2, cess: 0,
        notes: "Agricultural land: prior State Govt permission required for non-agriculturists under Section 118.",
      },
    },
    "Rent Agreement": {
      "General / Urban": {
        male: 0, female: 0, joint: 0, regFee: 0, cess: 0,
        notes: "≤11 months: stamp paper ₹100-500. >11 months: MUST be registered under Registration Act Sec 17.",
      },
      Rural: {
        male: 0, female: 0, joint: 0, regFee: 0, cess: 0,
        notes: "Same as urban.",
      },
    },
    "Gift Deed": {
      "General / Urban": {
        male: 5, female: 3, joint: 4, regFee: 2, cess: 0,
        notes: "Gift to lineal descendants may attract reduced rate. Gift to non-relative = conveyance rate.",
      },
      Rural: {
        male: 5, female: 3, joint: 4, regFee: 2, cess: 0,
        notes: "Same as urban.",
      },
    },
  },
  Maharashtra: {
    "Sale Deed (Property Purchase)": {
      "Mumbai Municipal Corp": {
        male: 6, female: 5, joint: 6, regFee: 1, cess: 1,
        notes: "Metro Cess 1% in Mumbai, Thane, Navi Mumbai. Registration fee capped at ₹30,000. Ready Reckoner rate applies.",
      },
      "Pune / Nagpur / Other MC": {
        male: 5, female: 4, joint: 5, regFee: 1, cess: 1,
        notes: "Metro Cess 1% in Pune MC, PCMC, Nagpur MC only. 1% female concession.",
      },
      "Rural Maharashtra": {
        male: 5, female: 4, joint: 5, regFee: 1, cess: 0,
        notes: "No metro cess outside MC areas. Registration fee capped at ₹30,000.",
      },
    },
    "Rent Agreement": {
      "Mumbai Municipal Corp": {
        male: 0.25, female: 0.25, joint: 0.25, regFee: 0, cess: 0,
        notes: "Leave & License: 0.25% of (total rent + deposit). Flat ₹1,000 reg fee. MANDATORY registration regardless of duration (MRC Act Sec 55).",
      },
      "Pune / Nagpur / Other MC": {
        male: 0.25, female: 0.25, joint: 0.25, regFee: 0, cess: 0,
        notes: "Same as Mumbai. Leave & License mandatory.",
      },
      "Rural Maharashtra": {
        male: 0.25, female: 0.25, joint: 0.25, regFee: 0, cess: 0,
        notes: "Flat ₹500 reg fee in rural areas.",
      },
    },
    "Gift Deed": {
      "Mumbai Municipal Corp": {
        male: 3, female: 2, joint: 3, regFee: 1, cess: 0,
        notes: "Family gift: 3% male/2% female. Non-family = conveyance rate (5-6%). Family gift of agri/residential to spouse/children: only ₹200.",
      },
      "Pune / Nagpur / Other MC": {
        male: 3, female: 2, joint: 3, regFee: 1, cess: 0,
        notes: "Same as Mumbai for family gifts.",
      },
      "Rural Maharashtra": {
        male: 3, female: 2, joint: 3, regFee: 1, cess: 0,
        notes: "Same rates.",
      },
    },
  },
  Karnataka: {
    "Sale Deed (Property Purchase)": {
      "Bangalore Urban (BBMP)": {
        male: 5, female: 5, joint: 5, regFee: 1, cess: 0.1,
        notes: "NO gender concession in Karnataka. 2% cess on stamp duty. Karnataka has its OWN Stamp Act (1957). Use Kaveri calculator.",
      },
      "Other Urban": {
        male: 5, female: 5, joint: 5, regFee: 1, cess: 0.1,
        notes: "Same as BBMP for properties above ₹45 lakh.",
      },
      "Rural (≥45L value)": {
        male: 3, female: 3, joint: 3, regFee: 1, cess: 0.06,
        notes: "Slab: 3% for properties ≤45 lakh. Lower rate for Tier-2/3 buyers.",
      },
    },
    "Rent Agreement": {
      "Bangalore Urban (BBMP)": {
        male: 1, female: 1, joint: 1, regFee: 0, cess: 0,
        notes: "~1% of annual rent. Karnataka Rent Act 1999 applies only above ₹3,500/month threshold.",
      },
      "Other Urban": {
        male: 1, female: 1, joint: 1, regFee: 0, cess: 0,
        notes: "Same.",
      },
      "Rural (≥45L value)": {
        male: 1, female: 1, joint: 1, regFee: 0, cess: 0,
        notes: "Same.",
      },
    },
    "Gift Deed": {
      "Bangalore Urban (BBMP)": {
        male: 5, female: 5, joint: 5, regFee: 1, cess: 0.1,
        notes: "Family gift may attract reduced rate — verify latest notification.",
      },
      "Other Urban": {
        male: 5, female: 5, joint: 5, regFee: 1, cess: 0.1,
        notes: "Same.",
      },
      "Rural (≥45L value)": {
        male: 3, female: 3, joint: 3, regFee: 1, cess: 0.06,
        notes: "Same slab as sale deed.",
      },
    },
  },
  Punjab: {
    "Sale Deed (Property Purchase)": {
      "Urban (MC limits)": {
        male: 7, female: 5, joint: 6, regFee: 1, cess: 1,
        notes: "2% female concession. Social Infrastructure Cess 1% in some areas. Punjab uses Central Indian Stamp Act with state amendments.",
      },
      Rural: {
        male: 5, female: 3, joint: 4, regFee: 1, cess: 0,
        notes: "Rural rates lower than urban. 2% female concession applies.",
      },
    },
    "Rent Agreement": {
      "Urban (MC limits)": {
        male: 0, female: 0, joint: 0, regFee: 0, cess: 0,
        notes: "≤11 months: stamp paper ₹100-500. >11 months: registration required. Punjab Rent Act 1995 (NOT the repealed 1949 Act).",
      },
      Rural: {
        male: 0, female: 0, joint: 0, regFee: 0, cess: 0,
        notes: "Same.",
      },
    },
    "Gift Deed": {
      "Urban (MC limits)": {
        male: 6, female: 4, joint: 5, regFee: 1, cess: 0,
        notes: "Gift to direct family may have concessions — verify latest Punjab notification.",
      },
      Rural: {
        male: 4, female: 2, joint: 3, regFee: 1, cess: 0,
        notes: "Rural rates lower.",
      },
    },
  },
};

export const REGISTRATION_STEPS = [
  { step: 1, title: "Document Preparation", desc: "Gather NOCs, supporting documents per article type", icon: "📄" },
  { step: 2, title: "Valuation", desc: "Calculate market value (if required by article/deed type)", icon: "📊" },
  { step: 3, title: "Stamp Duty & Fee Calculation", desc: "Apply state-specific rules, exemptions, concessions", icon: "💰" },
  { step: 4, title: "Payment", desc: "Via e-stamp, challan, franking, GRAS, or bank draft (varies by state)", icon: "💳" },
  { step: 5, title: "Presentation at SRO", desc: "Submit document at concerned Sub-Registrar Office within jurisdiction", icon: "🏢" },
  { step: 6, title: "Admission", desc: "SRO verifies willing execution, no coercion, mental stability", icon: "✅" },
  { step: 7, title: "Scrutiny", desc: "SRO verifies execution date, market value, stamp duty, jurisdiction", icon: "🔍" },
  { step: 8, title: "Identification", desc: "Biometric/photo capture, eKYC via Aadhaar, witness verification", icon: "🧑" },
  { step: 9, title: "Final Registration", desc: "Authority signature, digital signature if configured", icon: "✍️" },
  { step: 10, title: "Scanning & Handover", desc: "Document scanned, preserved digitally, original returned", icon: "📤" },
];

export const PROPERTY_ID_HIERARCHY = {
  Maharashtra: {
    hierarchy: ["Division", "District", "Taluka", "Village", "Survey No."],
    portal: "mahabhulekh.maharashtra.gov.in",
    recordName: "7/12 Extract (Saat-Baara)",
    recordDesc: "Form 7 (ownership) + Form 12 (cultivation)",
    sroCount: 504,
  },
  Karnataka: {
    hierarchy: ["District", "Taluk", "Hobli", "Village", "Survey No."],
    portal: "kaveri.karnataka.gov.in",
    recordName: "RTC (Record of Rights, Tenancy & Crops)",
    recordDesc: "Pahani extract from Bhoomi portal",
    sroCount: 169,
  },
  "Himachal Pradesh": {
    hierarchy: ["District", "Tehsil", "Village", "Khasra No."],
    portal: "himbhoomilmk.nic.in",
    recordName: "Jamabandi",
    recordDesc: "Land ownership record from Himbhoomi portal",
    sroCount: 143,
  },
  Punjab: {
    hierarchy: ["District", "Tehsil/Sub-Tehsil", "Village", "Khasra No."],
    portal: "igrpunjab.gov.in",
    recordName: "Jamabandi / Fard",
    recordDesc: "Land ownership record from PLRS portal",
    sroCount: 82,
  },
};

export const LAND_UNITS = {
  "Himachal Pradesh": ["Kanal", "Marla", "Bigha", "Biswa", "Sq. Meter", "Sq. Feet", "Hectare", "Acre"],
  Maharashtra: ["Hectare", "Are", "Sq. Meter", "Sq. Feet", "Acre", "Guntha"],
  Karnataka: ["Acre", "Gunta", "Sq. Meter", "Sq. Feet", "Hectare", "Cent"],
  Punjab: ["Kanal", "Marla", "Acre", "Sq. Feet", "Sq. Meter", "Hectare", "Bigha"],
};

export const UNIT_TO_SQFT = {
  "Sq. Feet": 1,
  "Sq. Meter": 10.7639,
  Hectare: 107639.1,
  Acre: 43560,
  Bigha: 27000,
  Biswa: 1350,
  Kanal: 5445,
  Marla: 272.25,
  Gunta: 1089,
  Guntha: 1089,
  Are: 1076.39,
  Cent: 435.6,
  Decimal: 435.6,
  Katha: 720,
};

export const PAYMENT_METHODS = {
  "Himachal Pradesh": {
    stampDuty: ["e-Stamp (SHCIL)", "Physical Stamp Paper", "Treasury Challan"],
    regFee: ["Cash", "Bank Draft", "Demand Draft"],
    portal: "ngdrshp.gov.in",
  },
  Maharashtra: {
    stampDuty: ["GRAS (Online)", "e-Stamp (SHCIL)", "eSBTR", "Franking"],
    regFee: ["Cash", "Bank Draft"],
    portal: "igrmaharashtra.gov.in",
    note: "Cash NOT accepted for stamp duty — only for registration fee.",
  },
  Karnataka: {
    stampDuty: ["e-Stamp (SHCIL — mandatory since 2002)", "Khajane-2 (State Treasury)"],
    regFee: ["Cash", "Bank Draft"],
    portal: "kaveri.karnataka.gov.in",
    note: "Physical stamp paper discontinued since 2002. e-Stamping mandatory.",
  },
  Punjab: {
    stampDuty: ["e-Stamp (SHCIL)", "Physical Stamp Paper", "Treasury Challan"],
    regFee: ["Cash", "Bank Draft"],
    portal: "igrpunjab.gov.in",
  },
};

export const STATE_EXEMPTIONS = {
  "Himachal Pradesh": [
    { type: "Female buyer", details: "4% stamp duty vs 6% for male (2% concession)", saving: "2% of property value" },
    { type: "Family gift deed", details: "Gift to lineal descendants at reduced rate (3-5%)", saving: "1-3% of property value" },
    { type: "Government transactions", details: "Exempt from stamp duty", saving: "Full stamp duty" },
  ],
  Maharashtra: [
    { type: "Female buyer", details: "1% concession on stamp duty (5% vs 6% in Mumbai MC)", saving: "1% of property value" },
    { type: "Family gift deed", details: "Agri/residential gift to spouse, children, grandchildren: only ₹200 stamp duty", saving: "Up to 5-6% of property value" },
    { type: "Agriculture land (SEZ)", details: "SEZ developer transfer exemptions", saving: "Varies" },
    { type: "Government transactions", details: "Exempt from stamp duty", saving: "Full stamp duty" },
  ],
  Karnataka: [
    { type: "Rural property ≤45L", details: "3% stamp duty instead of 5% for properties valued at or below ₹45 lakh", saving: "2% of property value" },
    { type: "No gender concession", details: "Karnataka does NOT offer gender-based stamp duty concession", saving: "None" },
    { type: "Government transactions", details: "Exempt from stamp duty", saving: "Full stamp duty" },
  ],
  Punjab: [
    { type: "Female buyer", details: "2% concession (5% vs 7% urban, 3% vs 5% rural)", saving: "2% of property value" },
    { type: "Rural property", details: "Lower rates than urban (5% vs 7% for male)", saving: "2% of property value" },
    { type: "Government transactions", details: "Exempt from stamp duty", saving: "Full stamp duty" },
  ],
};

export const JURISDICTION_RULES = {
  "Himachal Pradesh": {
    type: "Registrar/DC concurrent within district",
    rule: "Registrar/DC can register any document for their respective District. Every Sub-Registrar has specific jurisdiction (Tehsil-based).",
    tip: "You MUST visit the SRO covering the specific village/tehsil where property is located.",
  },
  Maharashtra: {
    type: "Concurrent within city",
    rule: "Concurrent jurisdiction allowed within city sub-registrar offices. Documents can be registered at any SRO in the same city/district.",
    tip: "In Mumbai/Pune, you can visit ANY SRO office in the city. Rural areas have strict SRO jurisdiction.",
  },
  Karnataka: {
    type: "Mixed (Bangalore concurrent, others strict)",
    rule: "In Bangalore Urban district, 5 registration districts exist — documents can be registered in any SRO within each. Other districts have strict SRO jurisdiction.",
    tip: "In Bangalore, any SRO in your registration district works. Outside Bangalore, you must go to the specific SRO.",
  },
  Punjab: {
    type: "Cross-jurisdiction with conditions",
    rule: "If document pertains to property falling within more than one registrar/sub-registrar jurisdiction, it can be registered at any of them.",
    tip: "For single-jurisdiction properties, visit the specific SRO. For multi-jurisdiction properties, you have flexibility.",
  },
};

export const STATE_LANGUAGES = {
  "Himachal Pradesh": { registration: ["English", "Hindi"], warning: "Documents in other languages may not be accepted." },
  Maharashtra: { registration: ["Marathi", "English"], warning: "Deeds are primarily in Marathi. English accepted." },
  Karnataka: { registration: ["English", "Kannada"], warning: "Deeds must be in English or Kannada. Hindi/Punjabi NOT accepted." },
  Punjab: { registration: ["Punjabi", "English"], warning: "Deeds are primarily in Punjabi. English accepted." },
};

export const READY_RECKONER_INFO = {
  "Himachal Pradesh": { name: "Circle Rate", frequency: "Annual", lastUpdate: "April 2026", portal: "himbhoomilmk.nic.in" },
  Maharashtra: { name: "Ready Reckoner / ASR", frequency: "Annual (Jan 1)", lastUpdate: "January 2026", portal: "igrmaharashtra.gov.in" },
  Karnataka: { name: "Guidance Value", frequency: "Annual", lastUpdate: "April 2026", portal: "kaveri.karnataka.gov.in" },
  Punjab: { name: "Collector Rate / Circle Rate", frequency: "Annual (April)", lastUpdate: "April 2026", portal: "igrpunjab.gov.in" },
};

export const DOCUMENT_CHECKLIST = {
  "Sale Deed (Property Purchase)": [
    "Original Sale Deed (printed on stamp paper of appropriate value)",
    "Encumbrance Certificate (EC) — 15 years recommended",
    "Title Deed / Previous Sale Deed (source of title)",
    "Khata Certificate / Property Tax Receipt",
    "Latest Tax Paid Receipt",
    "Aadhaar Card of all parties",
    "PAN Card (mandatory for transactions above ₹30 lakh)",
    "2 Passport-size photographs of all parties",
    "2 Witnesses with valid ID proof",
    "NOC from apartment association (if applicable)",
    "RERA registration certificate (for new projects)",
    "Approved building plan (if applicable)",
    "Mutation record / 7/12 extract / Jamabandi (state-specific)",
    "Power of Attorney (if representative is executing)",
  ],
  "Rent Agreement": [
    "Rent/Leave & License Agreement (on appropriate stamp paper)",
    "Aadhaar Card of landlord and tenant",
    "PAN Card of landlord and tenant",
    "2 Passport-size photographs of all parties",
    "Property ownership proof (landlord)",
    "Latest property tax receipt",
    "2 Witnesses with valid ID proof",
    "Police verification form (Maharashtra mandatory)",
    "NOC from housing society (if applicable)",
  ],
  "Gift Deed": [
    "Gift Deed (printed on stamp paper of appropriate value)",
    "Title Deed / Previous ownership document",
    "Encumbrance Certificate (EC)",
    "Relationship proof (for family gift concessions)",
    "Aadhaar Card of donor and donee",
    "PAN Card of donor and donee",
    "2 Passport-size photographs of all parties",
    "2 Witnesses with valid ID proof",
    "Property valuation report",
    "Latest property tax receipt",
  ],
};

// Sample contracts for the "Understand Your Contract" demo. Each is engineered to
// trip specific entries in the clause library (src/data/clauseLibrary.js) so the
// analyzer's grounding can be shown working. Realistic but fictional.
export const SAMPLE_CONTRACTS = {
  "Maharashtra Leave & License (Pune)": `LEAVE AND LICENSE AGREEMENT
This Leave and License Agreement is made at Pune, Maharashtra on 1st June 2026 between:
LICENSOR: Mr. Anil Deshmukh, resident of Kothrud, Pune, Maharashtra.
LICENSEE: Mr. Rohan Gupta, resident of Indore, Madhya Pradesh.

1. The Licensor grants leave and license to occupy Flat No. 7, 2nd Floor, Kothrud, Pune - 411038 for a period of 11 (eleven) months commencing 1st June 2026.
2. The monthly license fee shall be Rs. 30,000/-, payable on or before the 5th of each month, with an escalation of 10% on renewal.
3. The Licensee shall pay an interest-free refundable security deposit of Rs. 1,80,000/- (equal to six months' license fee), refundable at the time of vacating.
4. The Licensor may terminate this agreement and require the Licensee to vacate at any time by giving 15 days' written notice, without assigning any reason. The Licensee shall have no corresponding right to terminate during the term.
5. The Licensee shall not sublet or part with possession of the premises.
6. All maintenance and society charges shall be borne by the Licensee.
7. Stamp duty of Rs. 500/- has been paid on this agreement.`,

  "HP Agricultural Sale Deed (Shimla)": `SALE DEED (AGRICULTURAL LAND)
This Sale Deed is executed on 20th May 2026 at Shimla, Himachal Pradesh between:
SELLER: Shri Ram Lal, S/o Shri Hari Ram, resident of Village Mashobra, Tehsil & District Shimla, Himachal Pradesh ("the Seller").
PURCHASER: Shri Gurpreet Singh, S/o Shri Baldev Singh, resident of Ludhiana, Punjab, occupation Software Engineer ("the Purchaser").

WHEREAS the Seller is the owner of agricultural land measuring 5 Bigha at Village Mashobra, Tehsil Shimla, bearing Khasra No. 234/1 and 234/2.

1. The Seller hereby sells the said agricultural land to the Purchaser for a total consideration of Rs. 75,00,000/- (Seventy-Five Lakhs only), the receipt whereof the Seller acknowledges.
2. This sale is executed and completed through a General Power of Attorney dated 10th May 2026 granted by the Seller in favour of the Purchaser's brother, who shall hold and convey the property.
3. The Seller has delivered vacant and peaceful possession of the land to the Purchaser on the spot.
4. Stamp duty of 5% shall be borne by the Purchaser.
5. The property is sold free from all encumbrances.`,

  "Karnataka Residential Rent (Bengaluru)": `RENTAL AGREEMENT
This Rental Agreement is made at Bengaluru, Karnataka on 1st June 2026 between:
LANDLORD: Mr. Suresh Rao, owner of the premises.
TENANT: Ms. Kavya Nair, resident of Kochi, Kerala.

1. The Landlord lets out Flat No. 402, Sobha Apartments, Sarjapur Road, Bengaluru - 560035 for a period of 11 months from 1st June 2026.
2. The monthly rent shall be Rs. 40,000/-, payable by the 5th of each month, with 5% annual escalation.
3. The Tenant shall pay an interest-free refundable security deposit of Rs. 4,00,000/- (equal to ten months' rent), refundable within 30 days of vacating.
4. As the Tenant is a woman, a concessional female-buyer stamp duty rebate shall apply to this agreement.
5. The stamp duty shall be paid by e-Stamp procured through Kaveri Online Services / SHCIL.
6. Either party may terminate on one month's written notice. The Tenant shall not sublet the premises.`,

  "Punjab Rent — wrong Rent Act (Ludhiana)": `RENT AGREEMENT
This Rent Agreement is made at Ludhiana, Punjab on 1st June 2026 between:
LANDLORD: Mr. Harjeet Singh, owner of the premises.
TENANT: Mr. Mohan Verma.

1. The Landlord lets out House No. 55, Model Town, Ludhiana - 141002 for a period of 24 (twenty-four) months from 1st June 2026.
2. The monthly rent shall be Rs. 18,000/-, payable by the 7th of each month.
3. The Tenant shall pay a refundable security deposit of Rs. 36,000/- (two months' rent).
4. This Agreement and the tenancy hereby created shall be governed by the provisions of the Punjab Rent Act, 1995.
5. The Landlord may evict the Tenant in accordance with the said Act.
6. This agreement is executed on plain stamp paper and need not be registered.`,
};

export const SAMPLE_CLAUSES = [
  {
    label: "Lock-in clause",
    text: "The Licensee shall not be entitled to vacate the premises before the expiry of the lock-in period of 12 months. In the event of early termination, the Licensee shall be liable to pay the rent for the entire remaining lock-in period as liquidated damages.",
  },
  {
    label: "Eviction clause",
    text: "The Licensor reserves the right to revoke this License and demand vacant possession of the Licensed Premises at any time by giving fifteen (15) days written notice, without assigning any reason. The Licensee hereby irrevocably waives all rights under any Rent Control legislation.",
  },
  {
    label: "Indemnity clause",
    text: "The Purchaser shall indemnify and keep indemnified the Vendor against all claims, demands, actions, proceedings, losses, damages, costs and expenses arising out of or in connection with any defect in the title to the said property, whether known or unknown to the Vendor at the time of execution of this Sale Deed.",
  },
  {
    label: "Force Majeure",
    text: 'Neither party shall be liable for any failure or delay in performing their obligations under this Agreement where such failure or delay results from any cause that is beyond the reasonable control of that party including but not limited to acts of God, flood, fire, earthquake, pandemic, government restrictions or sanctions.',
  },
];
