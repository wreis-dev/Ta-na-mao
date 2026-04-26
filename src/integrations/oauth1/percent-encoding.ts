// Percent-encoding RFC 3986. OAuth 1.0 (RFC 5849) exige este conjunto:
// "unreserved" = ALPHA / DIGIT / "-" / "." / "_" / "~". Tudo o resto vira %HH.
// encodeURIComponent do JS NAO encoda !*\u0027() - precisamos cobrir.

const UNRESERVED = /^[A-Za-z0-9\-._~]$/;

function toHex(byte: number): string {
  return byte.toString(16).toUpperCase().padStart(2, "0");
}

export function percentEncode(input: string): string {
  const encoder = new TextEncoder();
  let out = "";
  for (const ch of input) {
    if (UNRESERVED.test(ch)) {
      out += ch;
      continue;
    }
    const bytes = encoder.encode(ch);
    for (const b of bytes) out += "%" + toHex(b);
  }
  return out;
}
