// Map raw API errors to a calm, user-facing message. Shared by the eligibility
// page and the Decode Contract tab.
// Order matters: check auth/key problems FIRST so an invalid/expired key is not
// mislabeled as "servers busy" (that masking cost real debugging time before).
export function friendlyError(msg) {
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
