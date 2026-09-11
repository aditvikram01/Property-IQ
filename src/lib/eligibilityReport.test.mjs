// Tests for the eligibility report engine + the wizard→AI form mapper.
// The redesigned wizard stores state keys and its own labels; toEligibilityForm
// must emit the EXACT strings the /api/eligibility agent + rule engine expect,
// and buildLocalEligibilityReport must keep matching STAMP_DUTY.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toEligibilityForm,
  buildLocalEligibilityReport,
  getStampQuote,
} from "./eligibilityReport.js";

test("toEligibilityForm: maps route keys to full state names + derives residency (cross-border)", () => {
  const f = toEligibilityForm({
    from: "mh", to: "hp", pincode: "175001",
    txnType: "Sale Deed (Property Purchase)", propType: "Agricultural",
    gender: "Male", age: "35", value: "7500000", area: "Rural",
    municipalStatus: "Outside municipal / rural limits", buyingCapacity: "Individual",
  });
  assert.equal(f.buyerState, "Maharashtra");
  assert.equal(f.propertyState, "Himachal Pradesh");
  assert.equal(f.residency, "Outsider (resident of another state)");
  // AI-exact strings preserved verbatim.
  assert.equal(f.txnType, "Sale Deed (Property Purchase)");
  assert.equal(f.gender, "Male");
  assert.equal(f.municipalStatus, "Outside municipal / rural limits");
  assert.equal(f.pincode, "175001");
});

test("toEligibilityForm: same-state route derives resident, defaults buyerType", () => {
  const f = toEligibilityForm({ from: "ka", to: "ka" });
  assert.equal(f.residency, "Resident of the property state");
  assert.equal(f.buyerType, "Indian Resident");
});

test("toEligibilityForm: no route → empty states and empty residency", () => {
  const f = toEligibilityForm({});
  assert.equal(f.buyerState, "");
  assert.equal(f.propertyState, "");
  assert.equal(f.residency, "");
});

test("getStampQuote: Karnataka Bangalore sale matches STAMP_DUTY (5% + 1% reg + 0.1% cess)", () => {
  const q = getStampQuote(toEligibilityForm({
    from: "ka", to: "ka", txnType: "Sale Deed (Property Purchase)",
    area: "Bangalore Urban (BBMP)", gender: "Male", value: "10000000",
  }));
  assert.equal(q.stampRate, 5);
  assert.equal(q.regRate, 1);
  assert.equal(q.cessRate, 0.1);
  assert.equal(q.stamp, 500000);
  assert.equal(q.registration, 100000);
});

test("buildLocalEligibilityReport: MH→HP agricultural sale outside municipal flags HP Section 118 (CRITICAL)", () => {
  const r = buildLocalEligibilityReport(toEligibilityForm({
    from: "mh", to: "hp", pincode: "175001",
    txnType: "Sale Deed (Property Purchase)", propType: "Agricultural",
    gender: "Male", age: "35", value: "7500000", area: "Rural",
    municipalStatus: "Outside municipal / rural limits", buyingCapacity: "Individual",
  }));
  assert.equal(r.verdict.level, "CRITICAL");
  assert.ok(r.blockers.some((b) => b.code === "HP118"));
  assert.ok(r.stampQuote && r.stampQuote.total > 0);
});
