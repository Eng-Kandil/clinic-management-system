// PHI redaction before sending to OpenAI
const SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;
const PHONE_REGEX = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const MRN_REGEX = /\bMRN[-:\s]?\d{4,12}\b/gi;
const DOB_REGEX = /\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/(\d{4})\b/g;

export function redact(text: string): string {
  return text
    .replace(SSN_REGEX, "[SSN]")
    .replace(PHONE_REGEX, "[PHONE]")
    .replace(EMAIL_REGEX, "[EMAIL]")
    .replace(MRN_REGEX, "[MRN]")
    .replace(DOB_REGEX, "[DOB]");
}

// Wrap user input to prevent prompt injection
export function wrapUserInput(input: string): string {
  return `<<USER INPUT START>>\n${redact(input)}\n<<USER INPUT END>>`;
}
