// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Document, Element } from 'slimdom';
import { beforeAll, describe, expect, it } from 'vitest';

import { createOrdinaryValidator, type OrdinaryValidator } from './ordinary';
import { ONIX_VALIDATION_RESOURCES } from './resources';
import { deriveTagMap, type TagMap } from './tagMap';
import { buildXdm, serializeXdm } from './xdm';

const XS = 'http://www.w3.org/2001/XMLSchema';
const PUBLIC_DIR = join(process.cwd(), 'public', 'onix-validation');
const read = (name: string) => readFileSync(join(PUBLIC_DIR, name), 'utf8');
const resources = new Map(
  ONIX_VALIDATION_RESOURCES.map((r) => [r.fileName, new Uint8Array(readFileSync(join(PUBLIC_DIR, r.fileName)))]),
);

const elementChildren = (node: Element | Document) =>
  Array.from(node.childNodes).filter((c): c is Element => c.nodeType === 1);
const descendants = (node: Element, predicate: (e: Element) => boolean): Element[] => {
  const out: Element[] = [];
  const walk = (n: Element) => {
    for (const c of elementChildren(n)) {
      if (predicate(c)) out.push(c);
      walk(c);
    }
  };
  walk(node);
  return out;
};
const isXs = (localName: string) => (e: Element) => e.namespaceURI === XS && e.localName === localName;

/** Global element declarations of a schema, by name. */
function globalDeclarations(xsd: string): Map<string, Element> {
  const root = buildXdm(xsd).document.documentElement!;
  return new Map(
    elementChildren(root)
      .filter((e) => isXs('element')(e) && e.getAttribute('name'))
      .map((e) => [e.getAttribute('name')!, e]),
  );
}

/** The single enumerated value of the `refname` / `shortname` attribute of a declaration. */
function declaredName(declaration: Element, attribute: 'refname' | 'shortname'): string | null {
  const attr = descendants(declaration, (e) => isXs('attribute')(e) && e.getAttribute('name') === attribute)[0];
  if (!attr) return null;
  const values = descendants(attr, isXs('enumeration')).map((e) => e.getAttribute('value'));
  return values.length === 1 ? values[0] : null;
}

describe.each([
  ['3.0', 512, 0],
  ['3.1', 510, 5],
] as const)('schema-derived Short-to-Reference map, ONIX %s', (release, globals, locals) => {
  const referenceXsd = read(`ONIX_BookProduct_${release}_reference.xsd`);
  const shortXsd = read(`ONIX_BookProduct_${release}_short.xsd`);
  let map: TagMap;

  beforeAll(() => {
    map = deriveTagMap(referenceXsd, shortXsd);
  });

  it('pairs every global declaration positionally, plus the local declarations', () => {
    expect(map.globalCount).toBe(globals);
    expect(map.localCount).toBe(locals);
    expect(map.shortNamespace).toBe(`http://ns.editeur.org/onix/${release}/short`);
    expect(map.referenceNamespace).toBe(`http://ns.editeur.org/onix/${release}/reference`);
  });

  it('is a bijection', () => {
    expect(map.referenceToShort.size).toBe(map.shortToReference.size);
    for (const [short, reference] of map.shortToReference) {
      expect(map.referenceToShort.get(reference)).toBe(short);
    }
  });

  it("agrees with EDItEUR's own refname/shortname declarations in both schemas", () => {
    const failures: string[] = [];
    for (const [name, declaration] of globalDeclarations(referenceXsd)) {
      if (declaredName(declaration, 'refname') !== name) failures.push(`ref refname ${name}`);
      if (declaredName(declaration, 'shortname') !== map.referenceToShort.get(name))
        failures.push(`ref shortname ${name}`);
    }
    for (const [name, declaration] of globalDeclarations(shortXsd)) {
      if (declaredName(declaration, 'shortname') !== name) failures.push(`short shortname ${name}`);
      if (declaredName(declaration, 'refname') !== map.shortToReference.get(name))
        failures.push(`short refname ${name}`);
    }
    expect(failures).toEqual([]);
  });

  it('maps every child reference and attribute set of every declaration exactly', () => {
    const references = globalDeclarations(referenceXsd);
    const shorts = globalDeclarations(shortXsd);
    const mismatches: string[] = [];
    for (const [short, reference] of map.shortToReference) {
      const r = references.get(reference);
      const s = shorts.get(short);
      if (!r || !s) continue; // local declarations are checked by the round trip below
      const refs = (d: Element) =>
        descendants(d, (e) => isXs('element')(e) && !!e.getAttribute('ref')).map((e) => e.getAttribute('ref')!);
      const attributes = (d: Element) =>
        descendants(d, (e) => isXs('attribute')(e) && !!e.getAttribute('name'))
          .map((e) => e.getAttribute('name'))
          .sort();
      if (
        refs(s)
          .map((x) => map.shortToReference.get(x))
          .join() !== refs(r).join()
      )
        mismatches.push(`refs ${reference}`);
      if (attributes(s).join() !== attributes(r).join()) mismatches.push(`attributes ${reference}`);
    }
    expect(mismatches).toEqual([]);
  });
});

describe('Short twins normalise back to the original Reference message', () => {
  let short30: OrdinaryValidator;
  let short31: OrdinaryValidator;
  const maps = {
    '3.0': deriveTagMap(read('ONIX_BookProduct_3.0_reference.xsd'), read('ONIX_BookProduct_3.0_short.xsd')),
    '3.1': deriveTagMap(read('ONIX_BookProduct_3.1_reference.xsd'), read('ONIX_BookProduct_3.1_short.xsd')),
  };

  beforeAll(async () => {
    short30 = await createOrdinaryValidator(resources, 'ONIX_BookProduct_3.0_short.xsd');
    short31 = await createOrdinaryValidator(resources, 'ONIX_BookProduct_3.1_short.xsd');
  });

  const toShort = (reference: string, map: TagMap) =>
    serializeXdm(
      buildXdm(reference, {
        rename: {
          shortToReference: map.referenceToShort,
          sourceNamespace: map.referenceNamespace,
          targetNamespace: map.shortNamespace,
        },
      }).document,
    );

  it.each([
    ['3.0', 'dtd_suite30'],
    ['3.1', 'dtd_suite31'],
  ] as const)('%s: an XSD-valid Short twin round-trips through normalisation', (release, set) => {
    const map = maps[release];
    const reference = serializeXdm(
      buildXdm(readFileSync(join(__dirname, '__fixtures__', 'spike02', set, 'N3_plain.xml'), 'utf8')).document,
    );
    const short = toShort(reference, map);
    expect((release === '3.0' ? short30 : short31).validate(new TextEncoder().encode(short))).toEqual({
      wellFormed: true,
      diagnostics: [],
    });
    const normalised = buildXdm(short, {
      rename: {
        shortToReference: map.shortToReference,
        sourceNamespace: map.shortNamespace,
        targetNamespace: map.referenceNamespace,
      },
    });
    expect(serializeXdm(normalised.document)).toBe(reference);
  });

  it('3.1: the locally declared EpubLicense pair round-trips', () => {
    expect(maps['3.1'].shortToReference.get('epublicense')).toBe('EpubLicense');
  });
});
