// Integrity tests for the citable clause library. The hardest requirement of
// this project is "never fabricate legal citations" — so we assert the data is
// well-formed and that the only case law cited is the two permitted decisions.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CLAUSE_LIBRARY, clausesForState } from "./clauseLibrary.js";

const REQUIRED = ["clause_type", "document_type", "state", "sample_text", "governing_law", "flag_type", "notes"];
const FLAG_TYPES = new Set(["mandatory_clause", "standard_clause", "risky_clause"]);
const DOC_TYPES = new Set(["sale_deed", "rent_agreement"]);

test("every clause has all required, non-empty string fields", () => {
  CLAUSE_LIBRARY.forEach((c, i) => {
    for (const key of REQUIRED) {
      assert.ok(typeof c[key] === "string" && c[key].trim().length > 0, `clause #${i} missing/empty "${key}"`);
    }
  });
});

test("flag_type and document_type use only known enum values", () => {
  for (const c of CLAUSE_LIBRARY) {
    assert.ok(FLAG_TYPES.has(c.flag_type), `unexpected flag_type: ${c.flag_type}`);
    assert.ok(DOC_TYPES.has(c.document_type), `unexpected document_type: ${c.document_type}`);
  }
});

test("no fabricated case law — only Suraj Lamp (2012) and Pioneer Urban (2019) may be cited", () => {
  const ALLOWED = [/Suraj Lamp/i, /Pioneer Urban/i];
  const CASE_REF = /[A-Z][A-Za-z.&' ]+ v\.? [A-Z][A-Za-z.&' ]+/;
  for (const c of CLAUSE_LIBRARY) {
    if (CASE_REF.test(c.governing_law)) {
      assert.ok(
        ALLOWED.some((re) => re.test(c.governing_law)),
        `clause "${c.clause_type}" cites an unrecognised case: ${c.governing_law}`,
      );
    }
  }
});

test("clausesForState filters by state (incl. central/common) and doc category", () => {
  const mhRent = clausesForState("Maharashtra", "rent_agreement");
  assert.ok(mhRent.length > 0, "expected Maharashtra rent clauses");
  for (const c of mhRent) {
    assert.ok(c.state === "Maharashtra" || c.state === "central/common");
    assert.equal(c.document_type, "rent_agreement");
  }
  // The mandatory MRCA s.55 registration clause must be present for Maharashtra rent.
  assert.ok(mhRent.some((c) => /Maharashtra Rent Control Act 1999, Section 55/.test(c.governing_law)));
});

test("clausesForState with no filters returns the whole library", () => {
  assert.equal(clausesForState(null, null).length, CLAUSE_LIBRARY.length);
});
