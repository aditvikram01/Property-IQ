// CI guard: fail the build if an API key or token is hardcoded in source.
//
// This is the regression test for the secrets that leaked during the hackathon
// (a public repo + a committed Gemini key got the key auto-revoked by Google).
// Keys belong in environment variables or browser localStorage — never in code.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCAN_DIRS = ["src", "server", "api"];
const CODE_EXT = /\.(jsx?|mjs|cjs|tsx?)$/;
const IS_TEST = /\.test\.(m|c)?jsx?$/;

const SECRET_PATTERNS = [
  { name: "Google API key (AIzaSy…)", re: /AIzaSy[0-9A-Za-z_\-]{33}/ },
  { name: "Gemini AQ. access token", re: /\bAQ\.[A-Za-z0-9_\-]{25,}/ },
  { name: "40-hex API token literal", re: /["'`][0-9a-f]{40}["'`]/ },
];

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return; // directory may not exist in every checkout
  }
  for (const name of entries) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (["node_modules", "dist", ".git"].includes(name)) continue;
      yield* walk(full);
    } else if (CODE_EXT.test(name) && !IS_TEST.test(name)) {
      yield full;
    }
  }
}

test("no hardcoded API keys or tokens in source (src, server, api)", () => {
  const violations = [];
  for (const dir of SCAN_DIRS) {
    for (const file of walk(join(ROOT, dir))) {
      const content = readFileSync(file, "utf8");
      for (const { name, re } of SECRET_PATTERNS) {
        if (re.test(content)) violations.push(`${file.replace(ROOT + "/", "")} → ${name}`);
      }
    }
  }
  assert.deepEqual(
    violations,
    [],
    "Hardcoded secret(s) found. Move them to env vars / localStorage, ROTATE the leaked " +
      "credential, and purge it from git history:\n" +
      violations.map((v) => "  • " + v).join("\n"),
  );
});
