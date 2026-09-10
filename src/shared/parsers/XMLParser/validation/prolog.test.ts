// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { PROLOG_SCAN_BOUND, scanProlog } from './prolog';

const ROOT30 = '<ONIXMessage release="3.0" xmlns="http://ns.editeur.org/onix/3.0/reference"><Header/></ONIXMessage>';

describe('scanProlog: prolog grammar (XML 1.0 §2.8)', () => {
  it('uses a 1 MiB default bound', () => {
    expect(PROLOG_SCAN_BOUND).toBe(1 << 20);
  });

  it('reaches the root of a document without prolog', () => {
    const scan = scanProlog(ROOT30);
    expect(scan).toMatchObject({
      outcome: 'ROOT',
      rootAt: 0,
      doctype: null,
      xmlDecl: false,
    });
    expect(scan.root).toMatchObject({
      localName: 'ONIXMessage',
      namespaceURI: 'http://ns.editeur.org/onix/3.0/reference',
    });
  });

  it('walks a BOM, XML declaration, comments and PIs in valid order', () => {
    const text = `\uFEFF<?xml version="1.0" encoding="UTF-8"?>\n<!-- a -->\n<?xml-stylesheet href="x.xsl"?><!-- b -->\n${ROOT30}`;
    expect(scanProlog(text)).toMatchObject({
      outcome: 'ROOT',
      xmlDecl: true,
      comments: 2,
      pis: 1,
      doctype: null,
    });
  });

  it('does not mistake DOCTYPE text inside a comment for a DTD', () => {
    expect(scanProlog(`<!-- <!DOCTYPE ONIXMessage> -->${ROOT30}`)).toMatchObject({ outcome: 'ROOT', doctype: null });
  });

  it.each([
    ['bare', '<!DOCTYPE ONIXMessage>'],
    ['after the XML declaration', '<?xml version="1.0"?><!DOCTYPE ONIXMessage>'],
    ['after a PI', '<?xml-stylesheet href="x"?>\n<!DOCTYPE ONIXMessage>'],
    ['after XML declaration, comment and PI', '<?xml version="1.0"?><!-- c --><?pi x?><!DOCTYPE ONIXMessage>'],
  ])('detects a DOCTYPE %s and still lexes the root', (_label, prolog) => {
    const scan = scanProlog(`${prolog}\n${ROOT30}`);
    expect(scan.doctype).toEqual({
      name: 'ONIXMessage',
      externalId: null,
      internalSubset: false,
      malformed: false,
    });
    expect(scan.outcome).toBe('ROOT');
    expect(scan.root?.localName).toBe('ONIXMessage');
  });

  it('records SYSTEM and PUBLIC external identifiers without resolving them', () => {
    expect(scanProlog(`<!DOCTYPE ONIXMessage SYSTEM "http://evil.invalid/x.dtd">${ROOT30}`).doctype).toMatchObject({
      externalId: 'SYSTEM',
      internalSubset: false,
    });
    expect(
      scanProlog(`<!DOCTYPE ONIXMessage PUBLIC "-//X//EN" "http://evil.invalid/p.dtd">${ROOT30}`).doctype,
    ).toMatchObject({ externalId: 'PUBLIC' });
  });

  it('skips an internal subset containing quoted ">", "]" and comments', () => {
    const text = `<!DOCTYPE ONIXMessage [
  <!ENTITY a "x > y ]> z">
  <!-- a comment with ]> and "quotes' -->
  <?pi with ]> inside?>
  <!ELEMENT ONIXMessage ANY>
]>
${ROOT30}`;
    const scan = scanProlog(text);
    expect(scan.doctype).toMatchObject({ internalSubset: true });
    expect(scan.outcome).toBe('ROOT');
    expect(scan.root?.localName).toBe('ONIXMessage');
  });

  it('treats a lower-case markup declaration as a malformed DTD construct', () => {
    expect(scanProlog(`<!doctype ONIXMessage>${ROOT30}`).doctype).toEqual({
      name: null,
      externalId: null,
      internalSubset: false,
      malformed: true,
    });
  });

  it('keeps the DTD verdict when the DOCTYPE cannot be closed within the bound', () => {
    const scan = scanProlog(`<!DOCTYPE ONIXMessage [ <!ENTITY a "${'x'.repeat(200)}">`, { bound: 64 });
    expect(scan.doctype).not.toBeNull();
    expect(scan.root).toBeNull();
  });
});

describe('scanProlog: fail-closed bound', () => {
  const bound = 64;

  it.each([
    ['a comment', `<!--${'x'.repeat(bound)}-->${ROOT30}`],
    ['a PI', `<?pi ${'x'.repeat(bound)}?>${ROOT30}`],
    ['the XML declaration', `<?xml version="1.0"${' '.repeat(bound)}?>${ROOT30}`],
  ])('stops when %s begins inside the bound and ends beyond it', (_l, text) => {
    expect(scanProlog(text, { bound }).outcome).toBe('BOUND_EXCEEDED');
  });

  it('stops on a comment straddling the bound followed by a DOCTYPE', () => {
    const scan = scanProlog(`<!--${'x'.repeat(bound)}--><!DOCTYPE ONIXMessage>${ROOT30}`, { bound });
    expect(scan.outcome).toBe('BOUND_EXCEEDED');
  });

  it('stops when whitespace alone exceeds the bound', () => {
    expect(scanProlog(`${' '.repeat(bound + 1)}${ROOT30}`, { bound }).outcome).toBe('BOUND_EXCEEDED');
  });

  it('stops when a terminator lands on the bound so the root lies beyond it', () => {
    const body = 'x'.repeat(bound - 7);
    expect(scanProlog(`<!--${body}-->${ROOT30}`, { bound }).outcome).toBe('BOUND_EXCEEDED');
  });

  it('stops when the root start tag does not close within the bound', () => {
    expect(scanProlog(`<ONIXMessage a="${'x'.repeat(bound)}">`, { bound }).outcome).toBe('BOUND_EXCEEDED');
  });

  it('accepts a prolog and root start tag that both end inside the bound', () => {
    // One absolute endpoint bounds the whole stage-2 scan, the root start tag included.
    expect(scanProlog(`<!--${'x'.repeat(200)}-->${ROOT30}`, { bound: 512 }).outcome).toBe('ROOT');
  });

  describe('root start tag against the absolute endpoint', () => {
    const tag = ROOT30.slice(0, ROOT30.indexOf('>') + 1);
    // A comment of exactly `length` characters, so the root begins at a chosen offset.
    const comment = (length: number) => `<!--${'x'.repeat(length - 7)}-->`;
    const absolute = 256;

    it('stops when the root begins immediately before the bound and closes beyond it', () => {
      const scan = scanProlog(`${' '.repeat(absolute - 1)}${ROOT30}`, { bound: absolute });
      expect(scan).toMatchObject({ outcome: 'BOUND_EXCEEDED', rootAt: absolute - 1, root: null });
    });

    it('stops when the root closing ">" lies one character beyond the bound', () => {
      const text = `${comment(absolute - tag.length + 1)}${ROOT30}`;
      expect(text.indexOf('>', text.indexOf('<ONIXMessage'))).toBe(absolute);
      expect(scanProlog(text, { bound: absolute })).toMatchObject({ outcome: 'BOUND_EXCEEDED', root: null });
    });

    it('accepts the root when its closing ">" is the last character within the bound', () => {
      const text = `${comment(absolute - tag.length)}${ROOT30}`;
      expect(text.indexOf('>', text.indexOf('<ONIXMessage'))).toBe(absolute - 1);
      const scan = scanProlog(text, { bound: absolute });
      expect(scan.outcome).toBe('ROOT');
      expect(scan.root?.namespaceURI).toBe('http://ns.editeur.org/onix/3.0/reference');
    });

    it('never grants the root a fresh bound measured from its own offset', () => {
      // The root tag alone fits inside `absolute`; placed after a prolog it must not.
      expect(scanProlog(ROOT30, { bound: absolute }).outcome).toBe('ROOT');
      expect(scanProlog(`${comment(absolute - 10)}${ROOT30}`, { bound: absolute }).outcome).toBe('BOUND_EXCEEDED');
    });

    it('applies the real 1 MiB bound to a root start tag straddling it', () => {
      const text = `<?xml version="1.0"?>${comment(PROLOG_SCAN_BOUND - 22)}${ROOT30}`;
      expect(text.indexOf('<ONIXMessage')).toBe(PROLOG_SCAN_BOUND - 1);
      expect(scanProlog(text).outcome).toBe('BOUND_EXCEEDED');
    });
  });

  it('applies the real 1 MiB bound to a straddling comment', () => {
    const text = `<?xml version="1.0"?>\n<!--${'x'.repeat(PROLOG_SCAN_BOUND)}-->\n${ROOT30}`;
    expect(scanProlog(text).outcome).toBe('BOUND_EXCEEDED');
  });
});

describe('scanProlog: genuinely malformed prolog', () => {
  it.each([
    ['an unterminated comment', `<!-- never closed ${ROOT30}`],
    ['an unterminated PI', `<?pi never closed ${ROOT30.replace(/\?>/g, '')}`],
    ['text before the root', `junk${ROOT30}`],
    ['an empty document', ''],
  ])('reports %s as malformed, not as a security stop', (_l, text) => {
    expect(scanProlog(text).outcome).toBe('MALFORMED');
  });
});

describe('scanProlog: root start tag', () => {
  it('resolves a prefixed root, single quotes, entities and whitespace', () => {
    const scan = scanProlog(
      `<onix:ONIXMessage\n\trelease='3.1'\n xmlns:onix="http://ns.editeur.org/onix/3.1/reference" note="a &amp; b&#x20;c">`,
    );
    expect(scan.root).toEqual({
      qualifiedName: 'onix:ONIXMessage',
      localName: 'ONIXMessage',
      prefix: 'onix',
      namespaceURI: 'http://ns.editeur.org/onix/3.1/reference',
      attributes: [
        { name: 'release', value: '3.1' },
        { name: 'xmlns:onix', value: 'http://ns.editeur.org/onix/3.1/reference' },
        { name: 'note', value: 'a & b c' },
      ],
      duplicateAttributeNames: [],
    });
  });

  it('reports duplicated attributes', () => {
    expect(scanProlog('<ONIXMessage release="3.0" release="3.1"/>').root?.duplicateAttributeNames).toEqual(['release']);
  });

  it('leaves an unbound prefix without a namespace', () => {
    expect(scanProlog('<onix:ONIXMessage release="3.0"/>').root?.namespaceURI).toBeNull();
  });

  it('reports a syntactically broken root tag as malformed', () => {
    expect(scanProlog('<ONIXMessage release=3.0>').outcome).toBe('MALFORMED');
  });
});
