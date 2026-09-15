// AUTO-GENERATED from propertyiq_rag_database.json — do not hand-edit the object below.
// The nightly refresh (scripts/refresh-db.mjs) regenerates this via a staged PR.
export const RAG_DB =
{
  "metadata": {
    "name": "PropertyIQ Cross-State Eligibility RAG Database",
    "version": "1.0.0",
    "created": "2026-09-11",
    "sources": [
      "Cross_State_Property_Law_Database.xlsx",
      "propertyLawDatabase.js",
      "constants.js",
      "1acre.in/guides (Karnataka, Punjab, Himachal Pradesh, Maharashtra)"
    ],
    "states_covered": [
      "Himachal Pradesh",
      "Karnataka",
      "Maharashtra",
      "Punjab"
    ],
    "last_verified": "June 2026",
    "scrape_targets_for_daily_update": [
      {
        "name": "India Code",
        "url": "https://www.indiacode.nic.in",
        "purpose": "Bare act text, amendments"
      },
      {
        "name": "Indian Kanoon",
        "url": "https://indiankanoon.org",
        "purpose": "Case law, section interpretation"
      },
      {
        "name": "Baarat Bench",
        "url": "https://www.barandbench.com",
        "purpose": "Legal news, amendment tracking"
      },
      {
        "name": "LiveLaw",
        "url": "https://www.livelaw.in",
        "purpose": "Court orders, legislative updates"
      },
      {
        "name": "IGR Maharashtra",
        "url": "https://igrmaharashtra.gov.in",
        "purpose": "MH stamp rates, Ready Reckoner"
      },
      {
        "name": "Kaveri Karnataka",
        "url": "https://kaveri.karnataka.gov.in",
        "purpose": "KA guidance values, stamp calc"
      },
      {
        "name": "IGR Punjab",
        "url": "https://igrpunjab.gov.in",
        "purpose": "PB collector rates"
      },
      {
        "name": "HimBhoomi",
        "url": "https://himbhoomilmk.nic.in",
        "purpose": "HP circle rates, land records"
      },
      {
        "name": "1acre.in Guides",
        "url": "https://1acre.in/guides",
        "purpose": "Practical land buying guides per state"
      }
    ],
    "last_refresh_run": "2026-09-15"
  },
  "eligibility_rules": [
    {
      "chunk_id": "HP-LR-001",
      "state": "Himachal Pradesh",
      "category": "land_purchase_restriction",
      "rule_type": "non_agriculturist_ban",
      "property_types_affected": [
        "agricultural"
      ],
      "transaction_types_affected": [
        "sale_deed",
        "gift_deed",
        "exchange",
        "mortgage_with_possession",
        "lease_gt_5yr"
      ],
      "act": "HP Tenancy and Land Reforms Act, 1972",
      "section": "Section 118",
      "summary": "Non-agriculturists cannot purchase agricultural land in Himachal Pradesh without State Government permission. 'Non-agriculturist' means anyone whose principal income source is not agriculture AND who does not personally cultivate land in HP.",
      "who_is_blocked": "ANY non-agriculturist: non-farming Himachalis, out-of-state buyers, companies, NRIs, trusts. A Punjab IT professional, a Shimla shopkeeper, and an NRI are all equally blocked.",
      "what_is_blocked": "Purchase, sale, gift, exchange, mortgage with possession, or lease exceeding 5 years of agricultural land anywhere in HP.",
      "exceptions": [
        "Land within municipal/cantonment/notified area limits",
        "HIMUDA allotments",
        "Land from Development Authority under HP TCP Act 1977",
        "Flats up to 500 sq m in RERA-registered projects (Dec 2024 amendment, verify if notified)",
        "Government/PSU acquisitions",
        "Transfers between agriculturists",
        "Inheritance/succession (no permission needed)",
        "Court-decreed transfers"
      ],
      "permission_process": "Apply to Deputy Commissioner (DC) of the district. DC forwards to State Govt (Revenue Dept, Shimla). Typically 6-12 months. High rejection rate for large tracts. Permission granted as 'conditional' with use-within-period clause. Apply via Form prescribed under Rule 10 of HP T&LR Rules 1975.",
      "penalty_for_violation": "Transaction declared VOID ab initio. Land reverts to Govt/original owner. No refund of consideration. Registrar can refuse registration. Penalty proceedings under Sec 118(5).",
      "nri_applicability": "YES. NRIs/PIOs/OCIs treated as non-agriculturists. Need Sec 118 permission PLUS FEMA compliance. RBI general permission covers residential only, NOT agricultural.",
      "recent_amendments": "Dec 2024 HP Amendment Bill: (1) Flats up to 500 sq m in RERA projects exempt; (2) 10-year rural tourism leases allowed without Sec 118 permission; (3) Co-operative societies can buy for member housing. STATUS: Introduced in Dec 2024 Assembly session. Verify if passed and notified.",
      "section_text_excerpt": "118. Restrictions on transfer of land to non-agriculturist. (1) Notwithstanding anything contained in any law for the time being in force, no sale, gift, exchange, lease or mortgage with possession of any land in any part of the State shall be valid in favour of a non-agriculturist...",
      "demo_scenario": "Buyer from Ludhiana, Punjab wants to buy 2 acres of farmland in Shimla district for a weekend retreat. BLOCKED: Sec 118 applies. Buyer is non-agriculturist. Agricultural land outside MC limits. Permission needed (6-12 months, likely rejected for 'weekend retreat'). Alternative: Buy flat within Shimla MC limits (exempt) or buy from HIMUDA.",
      "confidence": "HIGH",
      "last_verified": "June 2026",
      "case_law_anchor": "Ashok Madan v. State of HP (2004) - HP HC upheld Sec 118. Ninth Schedule protection makes it immune from Art 14/19 challenges.",
      "india_code_url": "https://www.indiacode.nic.in",
      "indian_kanoon_query": "HP Tenancy Land Reforms Act Section 118",
      "related_chunks": [
        "HP-LR-002",
        "HP-LR-003",
        "HP-DEF-001",
        "CENTRAL-FEMA-001"
      ]
    },
    {
      "chunk_id": "HP-LR-002",
      "state": "Himachal Pradesh",
      "category": "land_purchase_restriction",
      "rule_type": "ceiling_limit",
      "property_types_affected": [
        "agricultural"
      ],
      "transaction_types_affected": [
        "sale_deed"
      ],
      "act": "HP Tenancy and Land Reforms Act, 1972",
      "section": "Section 117",
      "summary": "All persons/families holding agricultural land in HP are subject to ceiling limits. Purchase cannot result in buyer exceeding ceiling.",
      "who_is_blocked": "Anyone whose post-purchase total holding would exceed ceiling limits.",
      "what_is_blocked": "Holding agricultural land above ceiling limit.",
      "exceptions": [
        "Tea/coffee/cardamom plantations",
        "Orchards (with conditions)",
        "Government land grants for industrial purposes"
      ],
      "penalty_for_violation": "Surplus land vests in State without compensation beyond prescribed limits.",
      "nri_applicability": "YES, if they hold land in HP.",
      "confidence": "MEDIUM - ceiling figures need verification from latest HP notification",
      "last_verified": "June 2026",
      "related_chunks": [
        "HP-LR-001",
        "HP-LR-003"
      ]
    },
    {
      "chunk_id": "HP-LR-003",
      "state": "Himachal Pradesh",
      "category": "land_purchase_restriction",
      "rule_type": "ceiling_limit",
      "property_types_affected": [
        "agricultural"
      ],
      "transaction_types_affected": [
        "sale_deed"
      ],
      "act": "HP Ceiling on Land Holdings Act, 1972",
      "section": "Section 4, 5",
      "summary": "Specific ceiling numbers: approx 10 acres (irrigated, double-crop) / 15 acres (irrigated, single-crop) / 30 acres (un-irrigated). These vary by land class and are APPROXIMATE.",
      "who_is_blocked": "All landholders (individual and family unit) exceeding ceiling.",
      "penalty_for_violation": "Surplus land acquired by State; compensation at prescribed rates (typically below market).",
      "nri_applicability": "YES",
      "confidence": "MEDIUM - exact ceiling numbers need fresh verification",
      "last_verified": "June 2026",
      "related_chunks": [
        "HP-LR-002"
      ]
    },
    {
      "chunk_id": "MH-LR-001",
      "state": "Maharashtra",
      "category": "land_purchase_restriction",
      "rule_type": "non_agriculturist_ban",
      "property_types_affected": [
        "agricultural"
      ],
      "transaction_types_affected": [
        "sale_deed",
        "exchange"
      ],
      "act": "Maharashtra Tenancy and Agricultural Lands Act, 1948 (Bombay Act LXVII of 1948)",
      "section": "Section 63, read with Section 2(2)",
      "summary": "Non-agriculturists cannot purchase agricultural land outside municipal corporation/council limits in Maharashtra. 'Agriculturist' = person who cultivates land personally AND whose principal income source is agriculture.",
      "who_is_blocked": "Any person who is NOT an 'agriculturist' per Sec 2(2). Proof needed: 7/12 extract showing landholding OR revenue records showing parents/grandparents were agriculturists.",
      "what_is_blocked": "Purchase of agricultural land outside municipal corporation/council limits.",
      "exceptions": [
        "Land within Municipal Corporation/Council limits (since 1 Jan 2016 amendment, Sec 63-1A)",
        "Land within Special Planning Authority areas",
        "Land within New Town Development Authority areas",
        "Land converted to Non-Agricultural (NA) use",
        "Land in SEZ/Industrial areas notified by Govt",
        "Person whose parent/grandparent was agriculturist qualifies even if buyer is not currently farming"
      ],
      "permission_process": "No formal permission process. Buyer must PROVE agriculturist status at time of registration. Sub-Registrar checks buyer's declaration + supporting documents. Disputed cases go to Revenue Officer adjudication.",
      "penalty_for_violation": "Sale deed registered in violation is VOIDABLE (not void ab initio like HP). Revenue authorities can initiate proceedings. Buyer may be ordered to resell to agriculturist.",
      "nri_applicability": "NRIs cannot buy agricultural land under FEMA regardless of agriculturist status. May INHERIT but not PURCHASE.",
      "recent_amendments": "1 Jan 2016 Amendment (Sec 63-1A): Exempted all land within municipal limits from Sec 63. Game-changer for Tier-2 cities (Pune, Nagpur, Nashik).",
      "section_text_excerpt": "63. Restrictions on transfer. (1) No sale (including sales in execution of a decree of a Civil Court or of an award) or gift of the land of a person who is holder and who is not an occupant of land referred to in section 65-A shall be valid in favour of a person who is not an agriculturist...",
      "demo_scenario": "IT engineer from Pune wants to buy 5-acre farm in Raigad (rural, outside MC limits) for weekend farmhouse. BLOCKED: Non-agriculturist (IT salary is principal income). Land outside MC limits. Need to prove agriculturist status OR wait for NA conversion.",
      "confidence": "HIGH",
      "last_verified": "June 2026",
      "caveats": "The 'agriculturist' definition is notoriously tricky. Many urban buyers use loopholes (e.g., showing grandparent's 7/12 extract).",
      "related_chunks": [
        "MH-LR-002",
        "MH-DEF-001",
        "MH-DEF-002",
        "CENTRAL-FEMA-001"
      ]
    },
    {
      "chunk_id": "MH-LR-002",
      "state": "Maharashtra",
      "category": "land_purchase_restriction",
      "rule_type": "ceiling_limit",
      "property_types_affected": [
        "agricultural"
      ],
      "transaction_types_affected": [
        "sale_deed"
      ],
      "act": "Maharashtra Agricultural Lands (Ceiling on Holdings) Act, 1961",
      "section": "Section 5, 6",
      "summary": "Ceiling: approx 54 acres (perennially irrigated, double-crop) / 108 acres (dry/un-irrigated). Varies by district.",
      "who_is_blocked": "All persons/family units whose post-purchase holding would exceed ceiling.",
      "exceptions": [
        "Sugarcane farms (with conditions)",
        "Cooperative farming societies",
        "Educational institutions holding for agricultural research"
      ],
      "penalty_for_violation": "Surplus land vests in State. Penalty for concealment.",
      "confidence": "MEDIUM",
      "last_verified": "June 2026",
      "related_chunks": [
        "MH-LR-001"
      ]
    },
    {
      "chunk_id": "KA-LR-001",
      "state": "Karnataka",
      "category": "land_purchase_restriction",
      "rule_type": "liberalized_no_restriction",
      "property_types_affected": [
        "agricultural"
      ],
      "transaction_types_affected": [
        "sale_deed",
        "gift_deed",
        "exchange"
      ],
      "act": "Karnataka Land Reforms Act, 1961 (as amended by Karnataka Act No. 1 of 2020)",
      "section": "Sections 79A, 79B, 79C (ALL REPEALED in 2020); Section 80, 80-A (amended)",
      "summary": "Post-2020: NO restriction on non-agriculturists buying agricultural land in Karnataka. Companies, trusts, NRIs can now buy. This is a LANDMARK change. Previously Sec 79A banned non-agriculturists and Sec 79B imposed income ceiling of 25 lakh.",
      "who_is_blocked": "NOBODY for non-agriculturist status (post-2020). REMAINING restrictions: SC/ST land (Sec 80-A) and ceiling limits (Sec 63, raised to 20 standard acres).",
      "what_is_blocked": "Only: (a) SC/ST land granted under 1978 Act cannot transfer to non-SC/ST; (b) Ceiling limits still apply.",
      "exceptions": [
        "SC/ST land protection remains"
      ],
      "permission_process": "NO permission needed post-2020. Registration at SRO is sufficient.",
      "penalty_for_violation": "SC/ST land violation: transfer void, land reverts. Ceiling violation: surplus land acquired by State.",
      "nri_applicability": "NRIs can now buy agricultural land under state law. BUT FEMA still blocks NRIs from agricultural land without RBI approval. State law says 'allowed'; Central FEMA says 'not without RBI permission.' DOUBLE CHECK REQUIRED.",
      "recent_amendments": "2020 Amendment (Act No. 1 of 2020): Repealed Sec 79A (non-agriculturist ban), 79B (income ceiling), 79C. Raised ceiling from 10 to 20 units. NOT challenged successfully in court as of June 2026.",
      "section_text_excerpt": "79A. [Restriction on holding of agricultural land by non-agriculturist.] Repealed by Act No. 1 of 2020.",
      "demo_scenario": "Software engineer wants farmland for organic farming. In HP: BLOCKED (Sec 118). In Maharashtra: BLOCKED (Sec 63, non-agriculturist). In Karnataka: ALLOWED (2020 amendment). Side-by-side comparison.",
      "confidence": "HIGH",
      "last_verified": "June 2026",
      "caveats": "Politically sensitive; criticized for enabling corporatization of farmland. SC/ST land remains protected.",
      "related_chunks": [
        "CENTRAL-FEMA-001"
      ]
    },
    {
      "chunk_id": "PB-LR-001",
      "state": "Punjab",
      "category": "land_purchase_restriction",
      "rule_type": "ceiling_and_fragmentation",
      "property_types_affected": [
        "agricultural"
      ],
      "transaction_types_affected": [
        "sale_deed",
        "gift_deed"
      ],
      "act": "Punjab Land Reforms Act, 1972 / Punjab Tenancy Act, 1887 / East Punjab Holdings (Consolidation & Prevention of Fragmentation) Act, 1948",
      "section": "Punjab LR Act: Sec 4-7 (ceiling); Punjab Tenancy Act: Sec 50-56 (transfer); East Punjab Holdings Act: Sec 7 (min holding)",
      "summary": "Punjab does NOT have an outright ban on non-agriculturists buying agricultural land (unlike HP and MH). Main restrictions are ceiling limits (~17.5 acres first-class irrigated per family) and anti-fragmentation rules (cannot create holdings below minimum size).",
      "who_is_blocked": "Only those exceeding ceiling or creating sub-minimum fragments. NO identity-based restriction.",
      "what_is_blocked": "Exceeding ceiling. Creating fragments below minimum economic holding size.",
      "exceptions": [
        "Orchards",
        "Mechanized farms (with conditions)",
        "Close family transfers (father-son, between spouses)",
        "Government acquisitions"
      ],
      "permission_process": "No permission needed for agricultural land purchase by non-agriculturists. Buyer must declare intended use. Mutation must be recorded. CLU needed if non-agricultural purpose.",
      "penalty_for_violation": "Ceiling violation: surplus vests in State. Fragmentation violation: Sub-Registrar may refuse registration.",
      "nri_applicability": "NRIs from Punjab can generally buy agricultural land (no state-level ban), but FEMA restricts NRIs from buying agricultural land. Creates a Central-State conflict.",
      "recent_amendments": "Punjab proposed in 2024 to formally allow NRIs to buy agricultural land. NO final amendment as of June 2026.",
      "confidence": "MEDIUM - Punjab's land law is fragmented across multiple old acts; verify ceiling figures",
      "last_verified": "June 2026",
      "related_chunks": [
        "CENTRAL-FEMA-001"
      ]
    }
  ],
  "stamp_duty": {
    "Himachal Pradesh": {
      "sale_deed": {
        "general": {
          "male": 6,
          "female": 4,
          "joint": 5,
          "reg_fee": 2,
          "cess": 0,
          "total_male": 8,
          "total_female": 6,
          "notes": "Non-HP residents pay 12% + 2% reg. Sec 118 restricts agricultural land for non-agriculturists. No registration fee cap specified.",
          "governing_act": "Indian Stamp Act, 1899 (HP amendments)"
        }
      },
      "rent_agreement": {
        "general": {
          "notes": "11 months or less: stamp paper Rs 100-500. Over 11 months: MUST be registered under Registration Act Sec 17."
        }
      },
      "gift_deed": {
        "general": {
          "male": "4-6",
          "female": "2-4",
          "reg_fee": 2,
          "notes": "Gift to lineal descendants may attract reduced rate. Gift to non-relative = conveyance rate. VERIFY exact rates from latest HP notification."
        }
      },
      "circle_rate_info": {
        "name": "Circle Rate",
        "frequency": "Annual",
        "last_update": "April 2026",
        "portal": "himbhoomilmk.nic.in"
      }
    },
    "Maharashtra": {
      "sale_deed": {
        "mumbai_mc": {
          "male": 6,
          "female": 5,
          "joint": 6,
          "reg_fee": 1,
          "cess": 1,
          "total_male": 8,
          "total_female": 7,
          "reg_fee_cap": 30000,
          "notes": "Metro Cess 1% in Mumbai, Thane, Navi Mumbai. Registration fee capped at Rs 30,000. Ready Reckoner rate applies.",
          "governing_act": "Maharashtra Stamp Act, 1958 (Schedule I, Art 25)"
        },
        "pune_nagpur_other_mc": {
          "male": 5,
          "female": 4,
          "joint": 5,
          "reg_fee": 1,
          "cess": 1,
          "total_male": 7,
          "total_female": 6,
          "reg_fee_cap": 30000,
          "notes": "Metro Cess 1% in Pune MC, PCMC, Nagpur MC only. 1% female concession."
        },
        "rural": {
          "male": 5,
          "female": 4,
          "joint": 5,
          "reg_fee": 1,
          "cess": 0,
          "total_male": 6,
          "total_female": 5,
          "reg_fee_cap": 30000,
          "notes": "No metro cess outside MC areas."
        }
      },
      "rent_agreement": {
        "all_areas": {
          "rate": 0.25,
          "flat_fee": 1000,
          "notes": "Leave & License: 0.25% of (total rent + deposit). MANDATORY registration regardless of duration (MRC Act Sec 55). Flat Rs 1,000 reg fee (Rs 500 rural).",
          "governing_act": "Maharashtra Stamp Act, 1958 (Art 36A)"
        }
      },
      "gift_deed": {
        "family": {
          "male": 3,
          "female": 2,
          "reg_fee": 1,
          "notes": "Gift to family (spouse, brother/sister, lineal ascendant/descendant): 3%/2%. Non-family = conveyance rate (5-6%). Agri/residential to spouse/children: only Rs 200."
        }
      },
      "circle_rate_info": {
        "name": "Ready Reckoner / ASR",
        "frequency": "Annual (Jan 1)",
        "last_update": "January 2026",
        "portal": "igrmaharashtra.gov.in"
      }
    },
    "Karnataka": {
      "sale_deed": {
        "bangalore_bbmp": {
          "male": 5,
          "female": 5,
          "joint": 5,
          "reg_fee": 1,
          "cess": 0.1,
          "total_male": 6.1,
          "total_female": 6.1,
          "reg_fee_cap": "No cap (1% of property value)",
          "notes": "NO gender concession in Karnataka. Uniform rate. Karnataka has its OWN Stamp Act (1957). Use Kaveri calculator. 2% cess on stamp duty.",
          "governing_act": "Karnataka Stamp Act, 1957 (Article 20)"
        },
        "other_urban": {
          "male": 5,
          "female": 5,
          "joint": 5,
          "reg_fee": 1,
          "cess": 0.1,
          "total_male": 6.1,
          "total_female": 6.1
        },
        "rural_under_45l": {
          "male": 3,
          "female": 3,
          "joint": 3,
          "reg_fee": 1,
          "cess": 0.06,
          "total_male": 4.06,
          "total_female": 4.06,
          "notes": "Slab: 3% for properties under Rs 45 lakh. Lower rate for Tier-2/3 buyers. Exact threshold may have been revised."
        }
      },
      "rent_agreement": {
        "all_areas": {
          "rate": 1,
          "notes": "Approx 1% of annual rent. Karnataka Rent Act 1999 applies only above Rs 3,500/month threshold."
        }
      },
      "circle_rate_info": {
        "name": "Guidance Value",
        "frequency": "Annual",
        "last_update": "April 2026",
        "portal": "kaveri.karnataka.gov.in"
      }
    },
    "Punjab": {
      "sale_deed": {
        "urban_mc": {
          "male": 7,
          "female": 5,
          "joint": 6,
          "reg_fee": 1,
          "cess": 1,
          "total_male": "8-9",
          "total_female": "6-7",
          "notes": "Social Infrastructure Cess: Additional 1% in some areas (verify). 2% concession for female buyers.",
          "governing_act": "Indian Stamp Act, 1899 (Punjab amendment rates via state notifications)"
        },
        "rural": {
          "male": 5,
          "female": 3,
          "joint": 4,
          "reg_fee": 1,
          "cess": 0,
          "total_male": 6,
          "total_female": 4,
          "notes": "Rural rates lower than urban. 2% female concession applies in both."
        }
      },
      "rent_agreement": {
        "all_areas": {
          "notes": "Stamp paper Rs 100-500 for 11 months or less. Over 11 months technically requires registration but compliance is LOW."
        }
      },
      "circle_rate_info": {
        "name": "Collector Rate / Circle Rate",
        "frequency": "Annual (April)",
        "last_update": "April 2026",
        "portal": "igrpunjab.gov.in"
      }
    },
    "penalty_for_understamping": "2% per month of deficit (max 200% of deficit). Document inadmissible as evidence until deficit + penalty paid. Criminal prosecution possible (MH Stamp Act Sec 62).",
    "cross_state_rule": "If a document is executed in one state but relates to property in another, stamp duty is payable according to the law of the STATE WHERE THE PROPERTY IS (Indian Stamp Act Sec 19)."
  },
  "definitions": [
    {
      "chunk_id": "HP-DEF-001",
      "state": "Himachal Pradesh",
      "term": "Agriculturist",
      "definition": "A person whose principal source of income is agriculture and who cultivates land personally in Himachal Pradesh (Section 2(6) HP T&LR Act 1972). Includes managing through family labour or hired labour under personal supervision.",
      "source": "HP T&LR Act, 1972, Sec 2(6)",
      "proof_required": "Revenue records showing land ownership in HP + agricultural income proof (ITR showing farm income, Patwari certificate, or records showing cultivation)",
      "cross_state_trap": "A Ludhiana IT professional buying in Shimla is NOT an agriculturist under HP law, even if they own farmland in Punjab. HP requires cultivation IN HP specifically.",
      "misconceptions": [
        "Owning farmland in Punjab does not make you an agriculturist in HP",
        "Non-farming Himachalis (e.g., Shimla shopkeeper) are also blocked under Sec 118"
      ]
    },
    {
      "chunk_id": "MH-DEF-001",
      "state": "Maharashtra",
      "term": "Agriculturist",
      "definition": "Under Section 2(2) of the MH Tenancy Act, 1948: A person who cultivates land personally AND whose principal income source is agriculture. 'Cultivating personally' means by own labour or family member's labour.",
      "source": "MH Tenancy Act, 1948, Sec 2(2) + Sec 2(6)",
      "proof_required": "7/12 extract showing landownership in Maharashtra + evidence of personal cultivation + income certificate showing agriculture as principal income. ALTERNATIVELY: family lineage (parents/grandparents were agriculturists via old 7/12 extracts).",
      "cross_state_trap": "Cross-state buyers won't have a Maharashtra 7/12. Must use family lineage route. If grandfather was farmer in MH, may qualify even as IT professional.",
      "misconceptions": [
        "'I can buy first and convert to NA later' is WRONG - you need agriculturist status to BUY (outside MC limits)",
        "7/12 is NOT a title deed - it is a revenue record, not conclusive proof of ownership"
      ]
    },
    {
      "chunk_id": "MH-DEF-002",
      "state": "Maharashtra",
      "term": "7/12 Extract (Saat-Baara Utara)",
      "definition": "Combined extract of Form 7 (ownership/rights) + Form 12 (cultivation record). Together prove ownership AND current use of agricultural land in Maharashtra.",
      "source": "Maharashtra Land Revenue Code, 1966",
      "proof_required": "Available at bhulekh.mahabhumi.gov.in (Mahabhulekh). Search by district, taluka, village, survey number. Also at Talathi office.",
      "cross_state_trap": "Cross-state buyers won't have this. KEY barrier for proving agriculturist status.",
      "misconceptions": [
        "7/12 is NOT a title deed - it's evidence of possession/cultivation, not conclusive ownership proof. For title you need registered sale deed + EC."
      ]
    },
    {
      "chunk_id": "ALL-DEF-001",
      "state": "ALL",
      "term": "Encumbrance Certificate (EC)",
      "definition": "Certificate from Sub-Registrar showing all registered transactions (sale, mortgage, lease) on a property for a specified period. 30-year Nil EC = clean title indicator.",
      "source": "Registration Act, 1908, Sec 57",
      "proof_required": "Apply at SRO where property is registered. Available online in many states.",
      "cross_state_trap": "Must get EC from the SRO of the STATE WHERE THE PROPERTY IS, not your home state. Punjab buyer purchasing in MH must get EC from Maharashtra SRO.",
      "misconceptions": [
        "EC does NOT prove ownership - it only shows registered transactions. Unregistered encumbrances (informal loans, oral agreements, unregistered court orders) won't appear."
      ]
    },
    {
      "chunk_id": "ALL-DEF-002",
      "state": "ALL",
      "term": "Circle Rate / Ready Reckoner / Guidance Value",
      "definition": "Minimum property valuation set by government for stamp duty. Different names by state: MH = Ready Reckoner/ASR; KA = Guidance Value; PB = Collector Rate; HP = Circle Rate. Stamp duty payable on HIGHER of this or actual price.",
      "source": "State stamp duty notifications, updated annually",
      "cross_state_trap": "A buyer from low-circle-rate area (rural Punjab) may be shocked by high Ready Reckoner rates in Mumbai/Pune. Calculate duty based on DESTINATION state's govt rate.",
      "misconceptions": [
        "Declaring below circle rate to save stamp duty also triggers income-tax implications (deemed gift under Sec 56(2)(x) IT Act)"
      ]
    },
    {
      "chunk_id": "ALL-DEF-003",
      "state": "ALL",
      "term": "NRI / OCI / PIO (FEMA Rules)",
      "definition": "Under FEMA 1999 + RBI Master Directions: NRIs and OCIs can buy residential/commercial property (general permission under Schedule III). They CANNOT buy agricultural land, farmhouse, or plantation without specific RBI permission (rarely granted).",
      "source": "FEMA, 1999 + RBI Master Direction on Acquisition and Transfer of Immovable Property, 2018",
      "proof_required": "Passport + visa/foreign residency proof. Transaction through NRO/NRE account. TDS at source (Sec 195 IT Act).",
      "cross_state_trap": "NRI from Punjab wanting farmland ANYWHERE faces FEMA restrictions on top of state restrictions. Double barrier. Even Karnataka's 2020 liberalization doesn't help because FEMA overrides state law.",
      "misconceptions": [
        "'I'm an Indian citizen just living abroad so I can buy anything' is WRONG for agricultural land"
      ]
    }
  ],
  "central_laws": [
    {
      "chunk_id": "CENTRAL-TPA-001",
      "act": "Transfer of Property Act",
      "year": 1882,
      "key_sections": "Sec 5 (definition), Sec 6 (what can/cannot be transferred), Sec 54 (sale), Sec 58 (mortgage), Sec 105 (lease), Sec 53A (part performance)",
      "relevance": "Sale of immovable property over Rs 100 must be by registered instrument (Sec 54). Sec 53A protects buyers in possession who paid price but registration incomplete."
    },
    {
      "chunk_id": "CENTRAL-REG-001",
      "act": "Registration Act",
      "year": 1908,
      "key_sections": "Sec 17 (mandatory registration), Sec 18 (optional), Sec 23 (4-month time limit), Sec 28 (jurisdiction), Sec 49 (non-registration effect)",
      "relevance": "Registration MUST happen at SRO of the DISTRICT WHERE PROPERTY IS LOCATED (Sec 28). Time limit: 4 months from execution. Late = penalty. Leases over 1 year must be registered.",
      "cross_state_trap": "A Ludhiana buyer purchasing in Shimla must register in Shimla, not Ludhiana."
    },
    {
      "chunk_id": "CENTRAL-STAMP-001",
      "act": "Indian Stamp Act",
      "year": 1899,
      "key_sections": "Sec 3, Sec 17 (who pays), Sec 19 (cross-state rule), Sec 33, Sec 35, Sec 47A, Schedule I",
      "relevance": "Rates set by states. Key: if document relates to property in another state, duty follows PROPERTY state (Sec 19). Most states use ISA with amendments (HP, PB) or own acts (MH: 1958, KA: 1957)."
    },
    {
      "chunk_id": "CENTRAL-RERA-001",
      "act": "RERA",
      "year": 2016,
      "key_sections": "Sec 3 (mandatory registration), Sec 4, Sec 11, Sec 18 (return + interest), Sec 19 (allottee rights)",
      "relevance": "Each state has own RERA authority. Cross-state buyer must check DESTINATION state RERA.",
      "portals": {
        "MH": "maharera.mahaonline.gov.in",
        "KA": "rera.karnataka.gov.in",
        "HP": "hprera.nic.in",
        "PB": "rera.punjab.gov.in"
      }
    },
    {
      "chunk_id": "CENTRAL-FEMA-001",
      "act": "FEMA",
      "year": 1999,
      "key_sections": "Sec 6(3)(i), RBI Master Direction 2018 Schedule III",
      "relevance": "NRIs/OCIs: general permission for residential and commercial. PROHIBITED: agricultural, farmhouse, plantation. OVERRIDES state law. Karnataka's 2020 liberalization does NOT help NRIs because FEMA is Central law.",
      "penalty": "Up to 300% of transaction value."
    },
    {
      "chunk_id": "CENTRAL-HSA-001",
      "act": "Hindu Succession Act (as amended 2005)",
      "year": "1956/2005",
      "key_sections": "Sec 6 (daughters equal coparcenary rights since 2005), Sec 8 (male intestate succession), Sec 15 (female succession)",
      "relevance": "Cross-state inheritance: succession law is uniform (central), but mutation/transfer registration must happen in each state separately."
    }
  ],
  "contract_flags": [
    {
      "flag_id": "CF-001",
      "issue": "Wrong Rent Control Act Referenced",
      "risk": "HIGH",
      "trigger": "Contract cites a Rent Act from a different state than the property's state",
      "states": "All",
      "law": "State-specific Rent Acts",
      "output_template": "This agreement references the {cited_act}, but the property is in {property_state}. The {correct_act} governs rental properties in {property_state}. Several clauses may be unenforceable."
    },
    {
      "flag_id": "CF-002",
      "issue": "Non-Agriculturist Buying Agricultural Land",
      "risk": "CRITICAL",
      "trigger": "Buyer is non-agriculturist + contract for agricultural land in restricted state",
      "states": "HP (Sec 118), MH (Sec 63)",
      "law": "State tenancy/land reform acts",
      "output_template": "TRANSACTION MAY BE VOID: This sale deed transfers agricultural land to a buyer who does not appear to be an agriculturist. Under {state} law, this requires {permission/prohibition}."
    },
    {
      "flag_id": "CF-003",
      "issue": "Stamp Duty Calculated for Wrong State",
      "risk": "MEDIUM",
      "trigger": "Stamp duty in agreement doesn't match property state's rates",
      "states": "All cross-state",
      "law": "Indian Stamp Act Sec 19 + State stamp acts",
      "output_template": "The stamp duty uses {wrong_state} rates, but the property is in {property_state}. Under Section 19, stamp duty must follow the property's state. Expected: {correct}%, document shows: {shown}%."
    },
    {
      "flag_id": "CF-004",
      "issue": "Missing Mandatory Clauses (Rent)",
      "risk": "MEDIUM",
      "trigger": "Rent agreement missing clauses required by property state",
      "states": "MH (mandatory registration + standard terms), KA, HP",
      "law": "State Rent Acts",
      "output_template": "This rent agreement is missing {clause_type} mandatory under {state_rent_act}. Without this clause, {consequence}."
    },
    {
      "flag_id": "CF-005",
      "issue": "Lease Over 11 Months Unregistered",
      "risk": "HIGH",
      "trigger": "Lease/rent agreement >11 months but not registered",
      "states": "All",
      "law": "Registration Act 1908, Sec 17(1)(d)",
      "output_template": "This lease is for {months} months (exceeding 11). Under Section 17, leases exceeding one year MUST be registered. Unregistered = inadmissible as evidence."
    },
    {
      "flag_id": "CF-006",
      "issue": "FEMA Violation - NRI Agricultural Land",
      "risk": "CRITICAL",
      "trigger": "NRI/OCI buyer purchasing agricultural/farmhouse/plantation",
      "states": "All (Central FEMA)",
      "law": "FEMA 1999, RBI Master Direction 2018",
      "output_template": "FEMA VIOLATION: This involves an NRI/OCI buying {land_type}. Under FEMA, NRIs are prohibited from purchasing this category without specific RBI permission. Penalties up to 300% of transaction value."
    },
    {
      "flag_id": "CF-007",
      "issue": "Below Minimum Holding Size (Fragmentation)",
      "risk": "MEDIUM",
      "trigger": "Sale creates parcel below minimum economic holding",
      "states": "Punjab/Haryana, Maharashtra",
      "law": "State fragmentation acts",
      "output_template": "This transaction would create a {size} acre holding, below the minimum {min_size} acres in {state}. Sub-Registrar may refuse registration."
    },
    {
      "flag_id": "CF-008",
      "issue": "Unilateral Termination Clause",
      "risk": "HIGH",
      "trigger": "One-sided termination right with very short notice period",
      "states": "All",
      "law": "State Rent Acts, Contract Act",
      "output_template": "This clause gives the {party} a right to terminate with only {days} days notice while the other party has no corresponding right. This may be unconscionable under contract law and violates tenant protections under {state_rent_act}."
    },
    {
      "flag_id": "CF-009",
      "issue": "GPA-Based Sale (Not Valid Conveyance)",
      "risk": "CRITICAL",
      "trigger": "Sale executed through General Power of Attorney instead of registered sale deed",
      "states": "All",
      "law": "Supreme Court in Suraj Lamp & Industries (2012)",
      "output_template": "This transaction uses a General Power of Attorney as the instrument of transfer. The Supreme Court in Suraj Lamp & Industries (2012) held that GPA sales are NOT valid conveyances. Only a registered sale deed transfers title."
    },
    {
      "flag_id": "CF-010",
      "issue": "Excessive Security Deposit (Rent)",
      "risk": "MEDIUM",
      "trigger": "Security deposit exceeds typical state limits",
      "states": "KA (10 months practice), MH (typically 3-6 months)",
      "law": "State rent acts/practice",
      "output_template": "The security deposit of {deposit_months} months' rent is unusually high for {state}, where the typical range is {typical_range} months. This may be unenforceable or indicate a disguised loan."
    }
  ],
  "registration_process": {
    "Maharashtra": {
      "sale_deed": [
        {
          "step": 1,
          "title": "Title Verification & Due Diligence",
          "desc": "Verify seller's title chain (30 years). Check EC. Verify 7/12 (rural) or property card (urban). Check pending litigation.",
          "docs": "Previous sale deeds (chain), EC from SRO, 7/12 or Property Card, Approved plan, OC/CC, Society NOC",
          "where": "Sub-Registrar (EC); Talathi/Revenue (7/12); Municipal body (plans)",
          "timeline": "EC: 3-5 days; 7/12: online; Plans: 7-15 days",
          "cost": "EC: Rs 50-200; 7/12: Rs 15-50 online",
          "pitfall": "BIGGEST PITFALL: Not checking 30-year chain. Many check only last 1-2 transactions and miss ancestral disputes."
        },
        {
          "step": 2,
          "title": "Draft Sale Deed & Stamp Duty Payment",
          "desc": "Get deed drafted by advocate. Calculate stamp duty on Ready Reckoner rate or actual price (whichever higher). Pay via e-stamping (SHCIL).",
          "where": "Advocate + SHCIL e-Stamp portal (shcilestamp.com) or authorized bank",
          "timeline": "1-3 days",
          "pitfall": "Under-stamping penalty = 2% per month of deficit (max 200%)."
        },
        {
          "step": 3,
          "title": "SRO Appointment & Registration",
          "desc": "Book slot at SRO. Both parties + 2 witnesses must appear. Aadhaar-linked biometric. Photos.",
          "where": "SRO (concurrent within city in Mumbai/Pune)",
          "timeline": "Appointment: same day to 1 week. Registration: 1-2 hours.",
          "cost": "Registration fee: 1% (capped at Rs 30,000)",
          "pitfall": "Missing witnesses or ID mismatch = rejection."
        },
        {
          "step": 4,
          "title": "Post-Registration: Mutation",
          "desc": "Apply for mutation at Talathi/Revenue office. Update 7/12 (rural) or property card (urban) to buyer's name.",
          "where": "Talathi office (rural) or City Survey Office (urban)",
          "timeline": "15-30 days (but often delayed 3-6 months)",
          "pitfall": "MOST MISSED STEP. Mutation is NOT automatic. Without mutation, you won't get property tax notice and won't be in revenue records."
        }
      ]
    },
    "note": "Registration processes for HP, KA, PB need to be added. Only MH is currently detailed."
  },
  "jurisdiction_rules": {
    "Himachal Pradesh": {
      "type": "Registrar/DC concurrent within district",
      "rule": "Every Sub-Registrar has specific jurisdiction (Tehsil-based). Must visit SRO covering the village/tehsil where property is located."
    },
    "Maharashtra": {
      "type": "Concurrent within city",
      "rule": "Documents can be registered at any SRO in the same city/district. Rural areas have strict SRO jurisdiction."
    },
    "Karnataka": {
      "type": "Mixed (Bangalore concurrent, others strict)",
      "rule": "In Bangalore Urban, 5 registration districts. Documents at any SRO within each. Other districts have strict SRO jurisdiction."
    },
    "Punjab": {
      "type": "Cross-jurisdiction with conditions",
      "rule": "Multi-jurisdiction properties can register at any covering SRO. Single-jurisdiction: specific SRO only."
    }
  },
  "state_languages": {
    "Himachal Pradesh": {
      "accepted": [
        "English",
        "Hindi"
      ],
      "warning": "Other languages may not be accepted."
    },
    "Maharashtra": {
      "accepted": [
        "Marathi",
        "English"
      ],
      "warning": "Deeds primarily in Marathi. English accepted."
    },
    "Karnataka": {
      "accepted": [
        "English",
        "Kannada"
      ],
      "warning": "Hindi/Punjabi NOT accepted."
    },
    "Punjab": {
      "accepted": [
        "Punjabi",
        "English"
      ],
      "warning": "Deeds primarily in Punjabi."
    }
  },
  "document_checklists": {
    "sale_deed": [
      "Original Sale Deed (on stamp paper of appropriate value)",
      "Encumbrance Certificate (EC) - 15 years recommended, 30 years ideal",
      "Title Deed / Previous Sale Deed (source of title)",
      "Khata Certificate / Property Tax Receipt",
      "Latest Tax Paid Receipt",
      "Aadhaar Card of all parties",
      "PAN Card (mandatory above Rs 30 lakh)",
      "2 Passport photos of all parties",
      "2 Witnesses with valid ID",
      "NOC from apartment association (if applicable)",
      "RERA registration certificate (new projects)",
      "Approved building plan (if applicable)",
      "Mutation record / 7/12 / Jamabandi (state-specific)",
      "Power of Attorney (if representative executing)"
    ],
    "rent_agreement": [
      "Rent/Leave & License Agreement (on stamp paper)",
      "Aadhaar of landlord and tenant",
      "PAN of landlord and tenant",
      "2 Passport photos of all parties",
      "Property ownership proof (landlord)",
      "Latest property tax receipt",
      "2 Witnesses with valid ID",
      "Police verification form (MH mandatory)",
      "NOC from housing society (if applicable)"
    ],
    "gift_deed": [
      "Gift Deed (on stamp paper)",
      "Title Deed / Previous ownership document",
      "Encumbrance Certificate",
      "Relationship proof (for family concessions)",
      "Aadhaar of donor and donee",
      "PAN of donor and donee",
      "2 Passport photos",
      "2 Witnesses with valid ID",
      "Property valuation report",
      "Latest property tax receipt"
    ]
  },
  "practical_guides": {
    "Karnataka": [
      {
        "title": "Bhoomi",
        "cat": "Services Hub",
        "desc": "Every Karnataka land record service in one place.",
        "url": "https://1acre.in/guides/karnataka/bhoomi"
      },
      {
        "title": "RTC Pahani",
        "cat": "Ownership",
        "desc": "Primary ownership record. Key columns to check.",
        "url": "https://1acre.in/guides/karnataka/rtc-pahani-karnataka"
      },
      {
        "title": "Encumbrance Certificate (Kaveri)",
        "cat": "Certified Records",
        "desc": "Apply on Kaveri portal, read Form 15 vs 16, cover 30 years.",
        "url": "https://1acre.in/guides/karnataka/encumbrance-certificate-karnataka"
      },
      {
        "title": "DC Conversion (Section 95)",
        "cat": "Land Use",
        "desc": "Apply under Section 95, check on Bhoomi, 2025 amendment.",
        "url": "https://1acre.in/guides/karnataka/dc-conversion-certificate-karnataka"
      },
      {
        "title": "Khata Extract",
        "cat": "Ownership",
        "desc": "A vs B Khata risks, get via BBMP e-Aasthi.",
        "url": "https://1acre.in/guides/karnataka/khata-extract-karnataka"
      },
      {
        "title": "E-Swathu (Form 9 & 11B)",
        "cat": "Ownership",
        "desc": "GP-area ownership, A vs B Khata risks.",
        "url": "https://1acre.in/guides/karnataka/e-swathu-karnataka"
      },
      {
        "title": "Mother Deed",
        "cat": "Registration",
        "desc": "Verify on Kaveri Online, 30-year chain, title defects.",
        "url": "https://1acre.in/guides/karnataka/mother-deed-karnataka"
      },
      {
        "title": "How to Buy Land in Karnataka",
        "cat": "Buyer Guide",
        "desc": "Full 2026 guide: A-Khata vs B-Khata, Section 80, DC Conversion, Bhoomi, Kaveri, K-RERA.",
        "url": "https://1acre.in/guides/how-to-buy-land-in-karnataka"
      }
    ],
    "Punjab": [
      {
        "title": "PLRS Jamabandi",
        "cat": "Services Hub",
        "desc": "All Punjab land record services.",
        "url": "https://1acre.in/guides/punjab/jamabandi"
      },
      {
        "title": "Jamabandi (Fard, Khewat)",
        "cat": "Ownership",
        "desc": "Download Fard, verify Khewat, mutation status.",
        "url": "https://1acre.in/guides/punjab/jamabandi-punjab"
      },
      {
        "title": "Intkal Mutation",
        "cat": "Mutation",
        "desc": "Full chain is only proof of title history.",
        "url": "https://1acre.in/guides/punjab/intkal-mutation-punjab"
      },
      {
        "title": "NRI Registered POA",
        "cat": "Registration",
        "desc": "Steps, stamp duty, why notarised-only POA fails.",
        "url": "https://1acre.in/guides/punjab/nri-registered-poa-punjab"
      },
      {
        "title": "How to Buy Land in Punjab",
        "cat": "Buyer Guide",
        "desc": "Full 2026 guide: Collector rate, Shamlat Deh risk, Jamabandi, Punjab RERA.",
        "url": "https://1acre.in/guides/how-to-buy-land-in-punjab"
      }
    ],
    "Himachal Pradesh": [
      {
        "title": "HimBhoomi",
        "cat": "Services Hub",
        "desc": "All HP land record services.",
        "url": "https://1acre.in/guides/himachal-pradesh/himbhoomi"
      },
      {
        "title": "Section 118 Permission",
        "cat": "Land Use",
        "desc": "Outsiders cannot buy agricultural land. The 2-year rule.",
        "url": "https://1acre.in/guides/himachal-pradesh/section-118-permission-himachal-pradesh"
      },
      {
        "title": "Forest Land Check",
        "cat": "Land Use",
        "desc": "68% of HP is recorded forest. Verify before purchase.",
        "url": "https://1acre.in/guides/himachal-pradesh/forest-land-check-himachal-pradesh"
      },
      {
        "title": "Slope Zone Check",
        "cat": "Land Use",
        "desc": "HP bans construction on slopes above 25%.",
        "url": "https://1acre.in/guides/himachal-pradesh/slope-zone-check-25-himachal-pradesh"
      },
      {
        "title": "How to Buy Land in HP",
        "cat": "Buyer Guide",
        "desc": "Full 2026 guide: Section 118, 12% stamp duty, Dec 2024 amendments.",
        "url": "https://1acre.in/guides/how-to-buy-land-in-himachal-pradesh"
      }
    ],
    "Maharashtra": [
      {
        "title": "Mahabhulekh",
        "cat": "Services Hub",
        "desc": "All MH land record services.",
        "url": "https://1acre.in/guides/maharashtra/mahabhulekh"
      },
      {
        "title": "7/12 Utara (Satbara)",
        "cat": "Ownership",
        "desc": "Decode every field, spot fraud.",
        "url": "https://1acre.in/guides/maharashtra/7-12-utara-satbara-maharashtra"
      },
      {
        "title": "Mutation Ferfar",
        "cat": "Mutation",
        "desc": "Confirms ownership change in 7/12.",
        "url": "https://1acre.in/guides/maharashtra/mutation-ferfar-maharashtra"
      },
      {
        "title": "NA Order",
        "cat": "Land Use",
        "desc": "Apply at Collector, decode Sanad, check 7/12 remarks.",
        "url": "https://1acre.in/guides/maharashtra/na-order-non-agricultural-maharashtra"
      },
      {
        "title": "CRZ Clearance",
        "cat": "Land Use",
        "desc": "Konkan coast buyers: check CZMP map.",
        "url": "https://1acre.in/guides/maharashtra/crz-clearance-maharashtra"
      },
      {
        "title": "How to Buy Land in MH",
        "cat": "Buyer Guide",
        "desc": "Full 2026 guide: 7/12, stamp duty, MahaRERA, Section 44 conversion.",
        "url": "https://1acre.in/guides/how-to-buy-land-in-maharashtra"
      }
    ]
  },
  "verification_resources": {
    "bare_acts": [
      {
        "name": "India Code",
        "url": "https://www.indiacode.nic.in",
        "scope": "ALL",
        "notes": "Gold standard for bare-act text. Some state coverage incomplete."
      },
      {
        "name": "Indian Kanoon",
        "url": "https://indiankanoon.org",
        "scope": "ALL",
        "notes": "Case law + section text. Free. Best for court interpretations."
      }
    ],
    "state_portals": {
      "Himachal Pradesh": [
        {
          "name": "HimBhoomi",
          "url": "https://himbhoomilmk.nic.in",
          "for": "Land records, circle rates"
        },
        {
          "name": "IGRS HP",
          "url": "https://igrs.hp.gov.in",
          "for": "Registration, EC"
        },
        {
          "name": "HP RERA",
          "url": "https://hprera.nic.in",
          "for": "Project registration check"
        }
      ],
      "Maharashtra": [
        {
          "name": "IGR Maharashtra",
          "url": "https://igrmaharashtra.gov.in",
          "for": "Registration, Ready Reckoner, e-Search"
        },
        {
          "name": "Mahabhulekh",
          "url": "https://bhulekh.mahabhumi.gov.in",
          "for": "7/12, 8A extracts"
        },
        {
          "name": "MahaRERA",
          "url": "https://maharera.mahaonline.gov.in",
          "for": "RERA check"
        }
      ],
      "Karnataka": [
        {
          "name": "Kaveri 2.0",
          "url": "https://kaveri.karnataka.gov.in",
          "for": "Registration, guidance value, EC, stamp calc"
        },
        {
          "name": "Bhoomi",
          "url": "https://landrecords.karnataka.gov.in",
          "for": "RTC, mutation, land records"
        },
        {
          "name": "K-RERA",
          "url": "https://rera.karnataka.gov.in",
          "for": "RERA check"
        }
      ],
      "Punjab": [
        {
          "name": "IGR Punjab",
          "url": "https://igrpunjab.gov.in",
          "for": "Registration, collector rates"
        },
        {
          "name": "PLRS Jamabandi",
          "url": "https://jamabandi.punjab.gov.in",
          "for": "Land records, Fard, Khewat"
        },
        {
          "name": "Punjab RERA",
          "url": "https://rera.punjab.gov.in",
          "for": "RERA check"
        }
      ]
    },
    "secondary_sources": [
      {
        "name": "ClearTax",
        "url": "https://cleartax.in",
        "for": "Stamp duty summaries"
      },
      {
        "name": "NoBroker",
        "url": "https://www.nobroker.in",
        "for": "City-wise stamp duty calculators"
      },
      {
        "name": "SHCIL e-Stamp",
        "url": "https://www.shcilestamp.com",
        "for": "Official e-stamping"
      }
    ],
    "research_reports": [
      {
        "name": "CPR - Land Conflict in India",
        "stat": "66% civil cases = land/property. 7.7M affected. 20-year avg resolution. $200B threatened."
      },
      {
        "name": "PRS - Land Records and Titles",
        "stat": "Explains India's presumptive titling system and 3-department fragmentation."
      },
      {
        "name": "World Bank Doing Business 2020",
        "stat": "India ranked 154th on registering property: 58 days, 7.8% of property value."
      }
    ],
    "translation_apis": [
      {
        "name": "Bhashini (Govt of India)",
        "url": "https://bhashini.gov.in",
        "languages": 22,
        "notes": "Free. Text, STT, TTS. Developer API available."
      },
      {
        "name": "AI4Bharat IndicTrans2",
        "notes": "Open-source (MIT). Self-host or via Bhashini."
      }
    ]
  },
  "known_gaps": [
    {
      "priority": "P1",
      "state": "HP",
      "area": "Stamp Duty",
      "gap": "Verify exact rates from latest HP Revenue notification (FY 2026-27)"
    },
    {
      "priority": "P1",
      "state": "HP",
      "area": "Land Restrictions",
      "gap": "Confirm whether Dec 2024 Section 118 amendment bill has been PASSED and NOTIFIED"
    },
    {
      "priority": "P1",
      "state": "KA",
      "area": "Stamp Duty",
      "gap": "Verify exact slab structure and threshold amounts for Karnataka 2026-27"
    },
    {
      "priority": "P2",
      "state": "PB",
      "area": "Land Restrictions",
      "gap": "Verify Punjab NRI farmland purchase proposal status (announced 2024)"
    },
    {
      "priority": "P2",
      "state": "ALL",
      "area": "Registration Process",
      "gap": "Add detailed registration process steps for HP, KA, PB (only MH is complete)"
    },
    {
      "priority": "P2",
      "state": "KA",
      "area": "Definitions",
      "gap": "Add Karnataka-specific definitions (RTC/Pahani equivalent of 7/12, guidance value lookup)"
    },
    {
      "priority": "P2",
      "state": "ALL",
      "area": "Central Laws",
      "gap": "Add Benami Transactions (Prohibition) Act, 1988 as amended 2016"
    },
    {
      "priority": "P2",
      "state": "ALL",
      "area": "Stamp Duty",
      "gap": "Add stamp duty for Power of Attorney (GPA/SPA) - critical for NRI transactions"
    },
    {
      "priority": "P2",
      "state": "ALL",
      "area": "Definitions",
      "gap": "Add mutation process and timeline per state"
    },
    {
      "priority": "P3",
      "state": "ALL",
      "area": "Contract Flags",
      "gap": "Add more contract clause flag templates for rent agreements, gift deeds, mortgage deeds"
    }
  ],
  "sample_contracts": {
    "maharashtra_leave_license_pune": "LEAVE AND LICENSE AGREEMENT\nThis Leave and License Agreement is made at Pune, Maharashtra on 1st June 2026 between:\nLICENSOR: Mr. Anil Deshmukh, resident of Kothrud, Pune.\nLICENSEE: Mr. Rohan Gupta, resident of Indore, Madhya Pradesh.\n\n1. Licensor grants leave and license for Flat No. 7, 2nd Floor, Kothrud, Pune for 11 months from 1st June 2026.\n2. Monthly license fee: Rs. 30,000, payable by 5th, 10% escalation on renewal.\n3. Security deposit: Rs. 1,80,000 (six months), interest-free, refundable on vacating.\n4. Licensor may terminate with 15 days notice without reason. Licensee has no corresponding termination right.\n5. No subletting.\n6. All maintenance/society charges borne by Licensee.\n7. Stamp duty of Rs. 500 paid.",
    "hp_agricultural_sale_shimla": "SALE DEED (AGRICULTURAL LAND)\nExecuted on 20th May 2026 at Shimla, HP.\nSELLER: Shri Ram Lal, Village Mashobra, Shimla.\nPURCHASER: Shri Gurpreet Singh, Ludhiana, Punjab. Occupation: Software Engineer.\n\nLand: 5 Bigha at Village Mashobra, Khasra No. 234/1 and 234/2.\n\n1. Consideration: Rs. 75,00,000.\n2. Sale executed through General Power of Attorney dated 10th May 2026.\n3. Vacant possession delivered.\n4. Stamp duty of 5% borne by Purchaser.\n5. Property sold free from all encumbrances.",
    "karnataka_rent_bengaluru": "RENTAL AGREEMENT\nMade at Bengaluru, Karnataka on 1st June 2026.\nLANDLORD: Mr. Suresh Rao.\nTENANT: Ms. Kavya Nair, Kochi, Kerala.\n\n1. Flat No. 402, Sobha Apartments, Sarjapur Road for 11 months from 1st June 2026.\n2. Rent: Rs. 40,000/month by 5th, 5% annual escalation.\n3. Security deposit: Rs. 4,00,000 (ten months), refundable within 30 days.\n4. Concessional female-buyer stamp duty rebate shall apply.\n5. Stamp duty via e-Stamp through Kaveri/SHCIL.\n6. Either party may terminate on one month notice. No subletting.",
    "punjab_rent_wrong_act": "RENT AGREEMENT\nMade at Ludhiana, Punjab on 1st June 2026.\nLANDLORD: Mr. Harjeet Singh.\nTENANT: Mr. Mohan Verma.\n\n1. House No. 55, Model Town, Ludhiana for 24 months from 1st June 2026.\n2. Rent: Rs. 18,000/month by 7th.\n3. Security deposit: Rs. 36,000 (two months).\n4. Governed by Punjab Rent Act, 1995.\n5. Landlord may evict per said Act.\n6. Executed on plain stamp paper; need not be registered."
  },
  "pending_updates": []
};
