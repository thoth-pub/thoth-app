/**
 * Raw bytes -> text for the stage-1/2 scan and the XDM tree (XML 1.0 Appendix
 * F). The bytes themselves go unchanged to libxml2, which applies the same
 * encoding rules. UTF-8 (with or without BOM) and UTF-16 (with BOM) — the two
 * encodings every XML processor must support — are decoded strictly: bytes
 * that are not valid in the encoding make the document not well-formed. Any
 * other declared encoding is outside the supported processing boundary.
 */
export type DecodedSource =
  | { readonly kind: 'TEXT'; readonly text: string; readonly encoding: 'UTF-8' | 'UTF-16LE' | 'UTF-16BE' }
  | { readonly kind: 'UNSUPPORTED_ENCODING'; readonly declared: string }
  | { readonly kind: 'MALFORMED'; readonly reason: string };

function decode(bytes: Uint8Array, label: 'utf-8' | 'utf-16le' | 'utf-16be'): string | null {
  try {
    return new TextDecoder(label, { fatal: true }).decode(bytes);
  } catch (_error) {
    return null;
  }
}

export function decodeSource(bytes: Uint8Array): DecodedSource {
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    const text = decode(bytes, 'utf-16be');
    return text === null
      ? { kind: 'MALFORMED', reason: 'invalid UTF-16BE' }
      : { kind: 'TEXT', text, encoding: 'UTF-16BE' };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    const text = decode(bytes, 'utf-16le');
    return text === null
      ? { kind: 'MALFORMED', reason: 'invalid UTF-16LE' }
      : { kind: 'TEXT', text, encoding: 'UTF-16LE' };
  }
  const start = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0;
  const head = String.fromCharCode(...bytes.subarray(start, Math.min(bytes.length, start + 1024)));
  const declared = /^<\?xml\s[^>]*?encoding\s*=\s*["']([^"']+)["']/.exec(head)?.[1] ?? null;
  if (declared !== null && !/^utf-?8$/i.test(declared)) return { kind: 'UNSUPPORTED_ENCODING', declared };
  const text = decode(bytes, 'utf-8');
  return text === null ? { kind: 'MALFORMED', reason: 'invalid UTF-8' } : { kind: 'TEXT', text, encoding: 'UTF-8' };
}
