// Tests for the defensive JSON parsing used by Analyze Risk.
// Run: npm test   (or: node --test src/lib/gemini.test.mjs)
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseJsonLoose } from "./gemini.js";

test("parseJsonLoose: clean JSON parses", () => {
  assert.deepEqual(parseJsonLoose('{"summary":"ok","findings":[]}'), { summary: "ok", findings: [] });
});

test("parseJsonLoose: strips ```json and ``` fences Gemini sometimes adds", () => {
  assert.deepEqual(parseJsonLoose("```json\n{\"a\":1}\n```"), { a: 1 });
  assert.deepEqual(parseJsonLoose("```\n{\"a\":2}\n```"), { a: 2 });
});

test("parseJsonLoose: tolerates leading/trailing prose around the object", () => {
  assert.deepEqual(parseJsonLoose('Sure! {"b":2} hope that helps'), { b: 2 });
});

test("parseJsonLoose: throws on non-JSON so the UI shows a friendly error", () => {
  assert.throws(() => parseJsonLoose("this is not json at all"));
});
