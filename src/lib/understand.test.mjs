// Tests for the deterministic core of "Understand Your Contract":
// state/doc detection, language→script mapping, citable grounding, and prompt
// assembly (incl. the never-fabricate-citations guardrail in the schema).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  detectStateAndType,
  scriptFor,
  groundingForText,
  buildExplainPrompt,
  buildRiskPrompt,
  RISK_SCHEMA,
} from "./understand.js";

test("detectStateAndType: detects each of the four supported states", () => {
  assert.equal(detectStateAndType("Property in Shimla, Himachal Pradesh").state, "HIMACHAL PRADESH");
  assert.equal(detectStateAndType("Flat in Pune under a Leave and License").state, "MAHARASHTRA");
  assert.equal(detectStateAndType("Apartment in Bengaluru, Karnataka").state, "KARNATAKA");
  assert.equal(detectStateAndType("House in Ludhiana, Punjab").state, "PUNJAB");
});

test("detectStateAndType: detects the document type", () => {
  assert.equal(detectStateAndType("This Leave and License agreement; Licensor; Licensee").docType, "Leave and License");
  assert.equal(detectStateAndType("This Sale Deed conveys; Vendor; Purchaser").docType, "Sale Deed");
  assert.equal(detectStateAndType("This Gift Deed; Donor; Donee").docType, "Gift Deed");
});

test("detectStateAndType: returns nulls for unrelated text", () => {
  const d = detectStateAndType("the quick brown fox jumps over the lazy dog");
  assert.equal(d.state, null);
  assert.equal(d.docType, null);
});

test("scriptFor: maps each language to its native script; unknown -> Latin", () => {
  assert.match(scriptFor("Hindi"), /Devanagari/);
  assert.match(scriptFor("Marathi"), /Devanagari/);
  assert.match(scriptFor("Punjabi"), /Gurmukhi/);
  assert.match(scriptFor("Kannada"), /Kannada/);
  assert.match(scriptFor("English"), /Latin/);
  assert.match(scriptFor("Klingon"), /Latin/); // falls back to the first (English) entry
});

test("groundingForText: Maharashtra L&L grounds on MRCA s.55 plus central truths", () => {
  const { grounding } = groundingForText(
    "Leave and License at Pune, Maharashtra. The agreement need not be registered.",
  );
  assert.match(grounding, /Maharashtra Rent Control Act, 1999, Section 55/);
  assert.match(grounding, /Indian Stamp Act, 1899, Section 19/); // stamp duty by property state
  assert.match(grounding, /Registration Act, 1908, Section 17/);
});

test("groundingForText: HP agricultural sale grounds on Section 118", () => {
  const { grounding } = groundingForText("Sale of agricultural land in Shimla, Himachal Pradesh");
  assert.match(grounding, /Section 118/);
});

test("buildRiskPrompt: enforces language, citation rule, JSON output, and embeds the contract", () => {
  const p = buildRiskPrompt({
    text: "MY_CONTRACT_TEXT",
    language: "Hindi",
    script: "Devanagari",
    grounding: "SOURCE: X",
  });
  assert.match(p, /Hindi/);
  assert.match(p, /ONLY the legal sources/i); // the anti-fabrication citation rule
  assert.match(p, /JSON/);
  assert.match(p, /MY_CONTRACT_TEXT/);
});

test("buildExplainPrompt: includes the language and contract, and forbids JSON", () => {
  const p = buildExplainPrompt({ text: "EXPLAIN_ME", language: "Kannada", script: "Kannada", grounding: "" });
  assert.match(p, /Kannada/);
  assert.match(p, /EXPLAIN_ME/);
  assert.match(p, /Do not output JSON/i);
});

test("RISK_SCHEMA: legalBasis is nullable (no fabricated citations) and severity is enumerated", () => {
  assert.equal(RISK_SCHEMA.type, "OBJECT");
  assert.deepEqual(RISK_SCHEMA.required, ["summary", "findings"]);
  const finding = RISK_SCHEMA.properties.findings.items;
  assert.equal(finding.properties.legalBasis.nullable, true);
  assert.deepEqual(finding.properties.severity.enum, ["high", "medium", "low"]);
});
