// Client-side document parsing. No API key required.
//
// IMPORTANT: the language Scribe reads the document in is SEPARATE from the
// output language. Scribe extracts the *contract text* (Indian legal documents
// are almost always in English, so OCR defaults to 'eng'). The chosen output
// language/script is applied later by Gemini when it writes the explanation or
// risk analysis — not here.
//
// scribe.js-ocr is bundled by Vite (imported, not loaded from a CDN). It runs
// fully in the browser: for a text-native PDF it extracts the embedded text; for
// an image-native PDF (a scan or phone photo) it runs OCR. OCR is heavy — the
// first run downloads recognition assets and a scanned page takes a few seconds,
// so callers MUST show a loading state while awaiting parseDocument().

// Scribe is loaded LAZILY (dynamic import) so its heavy, worker/wasm-laden module
// graph stays off the app's startup path — the app boots and the paste path work
// even before Scribe is fetched, and Scribe only loads when a PDF is uploaded.
let scribePromise = null;
function getScribe() {
  if (!scribePromise) scribePromise = import("scribe.js-ocr").then((m) => m.default || m);
  return scribePromise;
}

/**
 * @typedef {{ text: string, source: "pdf" | "paste" }} ParseResult
 */

/**
 * Parse a document into plain text.
 * @param {{ file?: File, text?: string }} input
 * @returns {Promise<ParseResult>}
 */
export async function parseDocument(input) {
  // Paste path — instant, no Scribe, no key.
  if (input && typeof input.text === "string" && input.text.trim()) {
    return { text: input.text.trim(), source: "paste" };
  }

  // PDF path — Scribe decides text-extract vs OCR automatically.
  if (input && input.file) {
    const file = input.file;
    const scribe = await getScribe();
    try {
      // extractText(files, langs) — langs is the OCR language (English here),
      // used only if the page has no embedded text and must be recognised.
      const text = await scribe.extractText([file], ["eng"]);
      return { text: (text || "").trim(), source: "pdf" };
    } finally {
      // Free Scribe's workers/wasm so repeated parses don't leak.
      try {
        await scribe.terminate();
      } catch {
        /* terminate is best-effort */
      }
    }
  }

  throw new Error("Nothing to parse: provide a PDF file or pasted text.");
}
