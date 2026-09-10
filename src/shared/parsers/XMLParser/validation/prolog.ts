import type { RootTag, RootTagAttribute } from './release';

/**
 * Canonical bounded prolog scanner (stage 2 security, thoth#895).
 *
 * It walks `XMLDecl? Misc* (doctypedecl Misc*)?` (XML 1.0 §2.8) over the raw
 * text, before any XML parser or Product sizing, and lexes the root start tag
 * for stage-1 release resolution. It fetches, resolves and parses nothing.
 *
 * Semantics consolidated from SPIKE-02 v4 `prolog.mjs` and the SPIKE-03 v1
 * fail-closed refinement:
 * - any `<!` markup declaration in the prolog that is not a comment is a DTD
 *   construct (lower-case and other malformed forms included);
 * - a comment, PI, XML declaration or root start tag that begins inside the
 *   bound but whose terminator lies beyond it, and any prolog that has not
 *   reached the root by the bound, is `BOUND_EXCEEDED` (fail closed); the
 *   whole scan, root start tag included, uses one absolute endpoint;
 * - only a genuinely unterminated item (no terminator anywhere) or other
 *   non-XML content is `MALFORMED`, left to the well-formedness stop.
 */
export const PROLOG_SCAN_BOUND = 1 << 20;

export interface DoctypeInfo {
  readonly name: string | null;
  readonly externalId: 'SYSTEM' | 'PUBLIC' | null;
  readonly internalSubset: boolean;
  readonly malformed: boolean;
}

export type PrologOutcome = 'ROOT' | 'BOUND_EXCEEDED' | 'MALFORMED';

export interface PrologScan {
  readonly outcome: PrologOutcome;
  readonly bound: number;
  readonly xmlDecl: boolean;
  readonly comments: number;
  readonly pis: number;
  readonly doctype: DoctypeInfo | null;
  readonly doctypeAt: number;
  readonly rootAt: number;
  readonly root: RootTag | null;
  readonly error: string | null;
}

export interface ScanOptions {
  readonly bound?: number;
}

const WS = new Set([' ', '\t', '\n', '\r']);

type Step = { next: number } | { outcome: PrologOutcome; error: string };

/** Closes an item whose terminator must start no later than the bound. */
function closeItem(text: string, terminator: string, from: number, limit: number, what: string): Step {
  const end = text.indexOf(terminator, from);
  if (end < 0) return { outcome: 'MALFORMED', error: `unterminated ${what}` };
  if (end > limit) {
    return { outcome: 'BOUND_EXCEEDED', error: `${what} crosses the bound` };
  }
  return { next: end + terminator.length };
}

/** Outcome when a construct runs past `limit` without closing. */
function overrun(text: string, limit: number, what: string): Step {
  return text.length > limit
    ? { outcome: 'BOUND_EXCEEDED', error: `${what} crosses the bound` }
    : { outcome: 'MALFORMED', error: `unterminated ${what}` };
}

/** Lexically skips a markup declaration (DOCTYPE and its internal subset). */
function skipMarkupDeclaration(text: string, start: number, limit: number): Step {
  let i = start + 2;
  let depth = 0;
  while (i < limit) {
    const c = text[i];
    if (c === '"' || c === "'") {
      const end = text.indexOf(c, i + 1);
      if (end < 0 || end >= limit) return overrun(text, limit, 'DOCTYPE');
      i = end + 1;
    } else if (depth > 0 && text.startsWith('<!--', i)) {
      const end = text.indexOf('-->', i + 4);
      if (end < 0 || end + 3 > limit) return overrun(text, limit, 'DOCTYPE');
      i = end + 3;
    } else if (depth > 0 && text.startsWith('<?', i)) {
      const end = text.indexOf('?>', i + 2);
      if (end < 0 || end + 2 > limit) return overrun(text, limit, 'DOCTYPE');
      i = end + 2;
    } else {
      if (c === '[') depth++;
      else if (c === ']') depth = Math.max(0, depth - 1);
      else if (c === '>' && depth === 0) return { next: i + 1 };
      i++;
    }
  }
  return overrun(text, limit, 'DOCTYPE');
}

/** SPIKE-02 v4 DOCTYPE detail, computed from the same 4096-character head. */
function doctypeInfo(text: string, at: number, limit: number): DoctypeInfo {
  const head = text.slice(at, Math.min(limit, at + 4096));
  const name = /^<!DOCTYPE\s+([^\s[>]+)/.exec(head);
  const ext = /^<!DOCTYPE\s+[^\s[>]+\s+(SYSTEM|PUBLIC)\b/.exec(head);
  const close = head.indexOf('>');
  return {
    name: name ? name[1] : null,
    externalId: ext ? (ext[1] as 'SYSTEM' | 'PUBLIC') : null,
    internalSubset: head.slice(0, close >= 0 ? close : head.length).includes('['),
    malformed: !/^<!DOCTYPE\s/.test(head),
  };
}

const PREDEFINED: Record<string, string> = {
  lt: '<',
  gt: '>',
  amp: '&',
  quot: '"',
  apos: "'",
};

function decodeAttributeValue(raw: string): string {
  return raw.replace(/[\t\n\r]/g, ' ').replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[A-Za-z]+);/g, (ref, body: string) => {
    if (body.startsWith('#x')) {
      return String.fromCodePoint(parseInt(body.slice(2), 16));
    }
    if (body.startsWith('#')) {
      return String.fromCodePoint(parseInt(body.slice(1), 10));
    }
    return PREDEFINED[body] ?? ref;
  });
}

const NAME_END = /[\s/>=]/;

type RootStep = { root: RootTag } | { outcome: PrologOutcome; error: string };

/** Lexes the root start tag up to `limit`, the same absolute endpoint as the rest of the scan. */
function lexRootTag(text: string, start: number, limit: number): RootStep {
  const fail = (what: string): RootStep => overrun(text, limit, what) as RootStep;
  const malformed = (error: string): RootStep => ({
    outcome: 'MALFORMED',
    error,
  });
  let i = start + 1;
  while (i < limit && !NAME_END.test(text[i])) i++;
  if (i >= limit) return fail('root start tag');
  const qualifiedName = text.slice(start + 1, i);
  if (!qualifiedName) return malformed('root start tag has no name');

  const attributes: RootTagAttribute[] = [];
  const seen = new Set<string>();
  const duplicateAttributeNames: string[] = [];
  for (;;) {
    const wsStart = i;
    while (i < limit && WS.has(text[i])) i++;
    if (i >= limit) return fail('root start tag');
    if (text[i] === '>' || text.startsWith('/>', i)) break;
    if (i === wsStart) return malformed('attribute not separated by whitespace');
    const nameStart = i;
    while (i < limit && !NAME_END.test(text[i])) i++;
    const name = text.slice(nameStart, i);
    while (i < limit && WS.has(text[i])) i++;
    if (!name || text[i] !== '=') return malformed('attribute without value');
    i++;
    while (i < limit && WS.has(text[i])) i++;
    const quote = text[i];
    if (quote !== '"' && quote !== "'") {
      return i >= limit ? fail('root start tag') : malformed('unquoted attribute');
    }
    const end = text.indexOf(quote, i + 1);
    if (end < 0 || end >= limit) return fail('root start tag');
    const raw = text.slice(i + 1, end);
    if (raw.includes('<')) return malformed('"<" in attribute value');
    if (seen.has(name)) duplicateAttributeNames.push(name);
    else seen.add(name);
    attributes.push({ name, value: decodeAttributeValue(raw) });
    i = end + 1;
  }

  const colon = qualifiedName.indexOf(':');
  const prefix = colon >= 0 ? qualifiedName.slice(0, colon) : null;
  const localName = colon >= 0 ? qualifiedName.slice(colon + 1) : qualifiedName;
  const declaration = attributes.find((a) => a.name === (prefix === null ? 'xmlns' : `xmlns:${prefix}`));
  const namespaceURI = declaration && declaration.value !== '' ? declaration.value : null;
  return {
    root: {
      qualifiedName,
      localName,
      prefix,
      namespaceURI,
      attributes,
      duplicateAttributeNames,
    },
  };
}

export function scanProlog(text: string, { bound = PROLOG_SCAN_BOUND }: ScanOptions = {}): PrologScan {
  const limit = Math.min(text.length, bound);
  let xmlDecl = false;
  let comments = 0;
  let pis = 0;
  let doctype: DoctypeInfo | null = null;
  let doctypeAt = -1;
  const result = (
    outcome: PrologOutcome,
    error: string | null,
    rootAt = -1,
    root: RootTag | null = null,
  ): PrologScan => ({
    outcome,
    bound,
    xmlDecl,
    comments,
    pis,
    doctype,
    doctypeAt,
    rootAt,
    root,
    error,
  });
  const stop = (step: Step) => ('outcome' in step ? result(step.outcome, step.error) : null);

  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  if (text.startsWith('<?xml', i) && /[\s?]/.test(text[i + 5] ?? '')) {
    const step = closeItem(text, '?>', i, limit, 'XML declaration');
    const stopped = stop(step);
    if (stopped) return stopped;
    xmlDecl = true;
    i = (step as { next: number }).next;
  }

  while (i < limit) {
    const c = text[i];
    if (WS.has(c)) {
      i++;
      continue;
    }
    if (text.startsWith('<!--', i)) {
      const step = closeItem(text, '-->', i + 4, limit, 'comment');
      const stopped = stop(step);
      if (stopped) return stopped;
      comments++;
      i = (step as { next: number }).next;
      continue;
    }
    if (text.startsWith('<?', i)) {
      const step = closeItem(text, '?>', i + 2, limit, 'processing instruction');
      const stopped = stop(step);
      if (stopped) return stopped;
      pis++;
      i = (step as { next: number }).next;
      continue;
    }
    if (text.startsWith('<!', i)) {
      if (!doctype) {
        doctype = doctypeInfo(text, i, limit);
        doctypeAt = i;
      }
      const step = skipMarkupDeclaration(text, i, limit);
      const stopped = stop(step);
      if (stopped) return stopped;
      i = (step as { next: number }).next;
      continue;
    }
    if (c === '<') {
      const lexed = lexRootTag(text, i, limit);
      if ('root' in lexed) return result('ROOT', null, i, lexed.root);
      return result(lexed.outcome, lexed.error, i);
    }
    return result('MALFORMED', `unexpected content in prolog at offset ${i}`);
  }
  return text.length > limit
    ? result('BOUND_EXCEEDED', 'prolog bound exceeded without a root element')
    : result('MALFORMED', 'document has no root element');
}
