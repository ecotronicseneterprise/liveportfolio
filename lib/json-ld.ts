// JSON-LD goes inside a <script> element via dangerouslySetInnerHTML. JSON.stringify does not escape "<", so a value
// containing "</script><script>..." (name, role, headline, location, e-mail ... all user-controlled) would break out
// of the element and run on the portfolio's origin. Escape the characters that can open or close tags/comments, and
// the two line separators that JavaScript string literals disallow. JSON.parse reads the escapes back to the same data.
const LINE_SEP = new RegExp(String.fromCharCode(0x2028), 'g')
const PARA_SEP = new RegExp(String.fromCharCode(0x2029), 'g')
const BACKSLASH = String.fromCharCode(92)

export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, BACKSLASH + 'u003c')
    .replace(/>/g, BACKSLASH + 'u003e')
    .replace(/&/g, BACKSLASH + 'u0026')
    .replace(LINE_SEP, BACKSLASH + 'u2028')
    .replace(PARA_SEP, BACKSLASH + 'u2029')
}
