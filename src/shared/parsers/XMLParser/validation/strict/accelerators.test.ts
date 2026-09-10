// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Element } from 'slimdom';
import { beforeAll, describe, expect, it, vi } from 'vitest';

// Corpus-scale suites: under coverage instrumentation they exceed the default 5 s per test.
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

import { SCHEMA_MODELS } from '../schemaModel';
import type { OnixRelease } from '../types';
import { buildXdm } from '../xdm';
import { type AcceleratorFamily, createStrictAccelerators, type StrictAccelerators } from './accelerators';
import { evaluateStrictRule, strictOptions } from './evaluate';
import { buildRuleset, compileRuleset, type Ruleset, type StrictRule } from './ruleset';

const PUBLIC_DIR = join(process.cwd(), 'public', 'onix-validation');
const NS = {
  '3.0': 'http://ns.editeur.org/onix/3.0/reference',
  '3.1': 'http://ns.editeur.org/onix/3.1/reference',
} as const;

const rulesets: Partial<Record<OnixRelease, Ruleset>> = {};
const accelerators: Partial<Record<OnixRelease, StrictAccelerators>> = {};
beforeAll(() => {
  for (const release of ['3.0', '3.1'] as const) {
    rulesets[release] = compileRuleset(
      buildRuleset(readFileSync(join(PUBLIC_DIR, `ONIX_BookProduct_${release}_reference_strict.xsd`), 'utf8')),
      SCHEMA_MODELS[release],
    );
    accelerators[release] = createStrictAccelerators(rulesets[release]!);
  }
});

const ruleById = (release: OnixRelease, id: string): StrictRule =>
  [...rulesets[release]!.byElement.values()].flat().find((r) => r.id === id)!;
const boundRules = (release: OnixRelease, family: AcceleratorFamily): StrictRule[] =>
  [...accelerators[release]!.byRule.keys()].filter((r) => accelerators[release]!.families[family].includes(r.id));

/** An owner element with the given inner XML, in the release's Reference namespace. */
function element(release: OnixRelease, owner: string, inner: string, attributes = ''): Element {
  const { document } = buildXdm(
    `<ONIXMessage xmlns="${NS[release]}"><${owner}${attributes}>${inner}</${owner}></ONIXMessage>`,
  );
  return document.documentElement!.firstChild as Element;
}
/** Canonical verdict of one rule on one element: true/false, or the dynamic error. */
const canonical = (release: OnixRelease, rule: StrictRule, e: Element) =>
  evaluateStrictRule(rule, e, strictOptions(rulesets[release]!));
const fast = (release: OnixRelease, rule: StrictRule, e: Element) => accelerators[release]!.byRule.get(rule)!(e);

/** The fast path must be exactly the canonical boolean, or `undefined` (fallback). */
function agree(release: OnixRelease, rule: StrictRule, e: Element, label: string) {
  const expected = canonical(release, rule, e);
  const actual = fast(release, rule, e);
  if (actual === undefined) return 'fallback';
  expect(expected, `${rule.id} ${label}: canonical raised ${String(expected)}`).not.toBeInstanceOf(Error);
  expect(actual, `${rule.id} ${label}`).toBe(expected);
  return actual ? 'pass' : 'fail';
}

describe.each(['3.0', '3.1'] as const)('A1-A8 binding on the pinned %s strict schema', (release) => {
  it('binds exactly the approved families, never a compile-failed rule, each id in one family', () => {
    const f = accelerators[release]!.families;
    expect([...f.A1].sort()).toEqual(['_20171126_h_1', '_20171126_h_3']);
    expect(f.A2).toEqual(['_20171126_h_2']);
    expect(f.A3).toEqual(['_20170517_g_1']);
    expect(f.A4).toEqual(['_20180109_h_1']);
    // The list-type assertions are inherited by every owner of the type: one binding per owner element.
    expect(boundRules(release, 'A1')).toHaveLength(4);
    expect(boundRules(release, 'A2')).toHaveLength(2);
    expect(new Set(boundRules(release, 'A1').map((r) => r.source))).toEqual(
      new Set(['type:dt.CountryCodeList', 'type:dt.RegionCodeList']),
    );
    const perRelease = release === '3.0' ? 29 : 27;
    for (const family of ['A5', 'A6', 'A7', 'A8'] as const) {
      expect(f[family].length, family).toBe(perRelease);
      expect(boundRules(release, family), family).toHaveLength(perRelease);
      for (const rule of boundRules(release, family)) expect(rule.source).toBe('element');
    }
    for (const rule of accelerators[release]!.byRule.keys()) expect(rule.compileError).toBeNull();
    const all = Object.values(f).flat();
    expect(new Set(all).size).toBe(all.length);
  });

  it('a rule whose text or identity no longer matches the pinned assertion is not accelerated', () => {
    const base = rulesets[release]!;
    const rewrite = (edit: (rule: StrictRule) => StrictRule): Ruleset => ({
      targetNamespace: base.targetNamespace,
      xpathDefaultNamespace: base.xpathDefaultNamespace,
      schematron: base.schematron,
      byElement: new Map([...base.byElement].map(([owner, rules]) => [owner, rules.map((r) => edit({ ...r }))])),
    });
    const tamperedText = createStrictAccelerators(
      rewrite((r) => (r.id === '_20171126_h_2' ? { ...r, body: `${r.body} or true()` } : r)),
    );
    expect(tamperedText.families.A2).toEqual([]);
    expect(tamperedText.families.A1).toHaveLength(2);
    const tamperedId = createStrictAccelerators(
      rewrite((r) => (r.id === '_20180109_h_1' ? { ...r, id: '_renamed' } : r)),
    );
    expect(tamperedId.families.A4).toEqual([]);
    const compileFailed = createStrictAccelerators(
      rewrite((r) => (r.id === '_20170517_g_1' ? { ...r, compileError: 'x' } : r)),
    );
    expect(compileFailed.families.A3).toEqual([]);
  });
});

describe('accelerated rule counts across both releases', () => {
  it('match the accepted evidence: 56 (release, id) pairs for A5; 29 ids per text family in 3.0, 27 in 3.1', () => {
    const count = (release: OnixRelease, family: AcceleratorFamily) => accelerators[release]!.families[family].length;
    expect(count('3.0', 'A5') + count('3.1', 'A5')).toBe(56);
    for (const family of ['A5', 'A6', 'A7', 'A8'] as const) {
      expect([count('3.0', family), count('3.1', family)], family).toEqual([29, 27]);
    }
    // The text-bearing owners differ between releases: 30 distinct ids in all, 26 shared.
    const union = (family: AcceleratorFamily) =>
      new Set([...accelerators['3.0']!.families[family], ...accelerators['3.1']!.families[family]]).size;
    expect([union('A5'), union('A6'), union('A7'), union('A8')]).toEqual([30, 30, 30, 30]);
  });
});

describe.each(['3.0', '3.1'] as const)('A1/A2 list-typed $value assertions (%s)', (release) => {
  const contents = [
    'GB FR',
    'GB GB',
    '',
    '   ',
    '\tGB\n\nFR  ',
    'WORLD',
    'WORLD GB',
    'GB WORLD FR',
    'gb GB',
    'X',
    ' GB ',
  ];
  it.each(['_20171126_h_1', '_20171126_h_3', '_20171126_h_2'])(
    '%s agrees with the canonical $value evaluation on every owner',
    (id) => {
      const rules = [...rulesets[release]!.byElement.entries()].flatMap(([owner, rs]) =>
        rs.filter((r) => r.id === id).map((r) => [owner, r] as const),
      );
      expect(rules.length).toBeGreaterThan(0);
      const outcomes = new Set<string>();
      for (const [owner, rule] of rules) {
        expect(accelerators[release]!.byRule.has(rule)).toBe(true);
        for (const content of contents)
          outcomes.add(agree(release, rule, element(release, owner, content), JSON.stringify(content)));
      }
      expect(outcomes).toContain('pass');
      expect(outcomes).toContain('fail');
      expect(outcomes).not.toContain('fallback');
    },
  );
});

describe.each(['3.0', '3.1'] as const)('A3 countries unique across SalesRights (%s)', (release) => {
  const publishing = (territories: string[]) =>
    element(
      release,
      'PublishingDetail',
      territories
        .map((t) => `<SalesRights><SalesRightsType>01</SalesRightsType><Territory>${t}</Territory></SalesRights>`)
        .join(''),
    );
  it.each([
    ['distinct', ['<CountriesIncluded>GB FR</CountriesIncluded>', '<CountriesIncluded>DE</CountriesIncluded>'], 'pass'],
    [
      'duplicate across composites',
      ['<CountriesIncluded>GB FR</CountriesIncluded>', '<CountriesIncluded>FR</CountriesIncluded>'],
      'fail',
    ],
    ['duplicate within one list', ['<CountriesIncluded>GB GB</CountriesIncluded>'], 'fail'],
    [
      'whitespace normalised',
      ['<CountriesIncluded>\n GB\tFR </CountriesIncluded>', '<CountriesIncluded>  DE</CountriesIncluded>'],
      'pass',
    ],
    ['empty lists', ['<CountriesIncluded></CountriesIncluded>', '<CountriesIncluded> </CountriesIncluded>'], 'pass'],
    ['no territory', [], 'pass'],
  ])('%s', (label, territories, expected) => {
    expect(agree(release, ruleById(release, '_20170517_g_1'), publishing(territories), label)).toBe(expected);
  });
});

describe.each(['3.0', '3.1'] as const)('A4 Market countries covered by for-sale SalesRights (%s)', (release) => {
  const product = (salesRights: string, markets: string) =>
    element(
      release,
      'Product',
      `<PublishingDetail>${salesRights}</PublishingDetail><ProductSupply>${markets}</ProductSupply>`,
    );
  const sr = (type: string, territory: string) =>
    `<SalesRights><SalesRightsType>${type}</SalesRightsType><Territory>${territory}</Territory></SalesRights>`;
  const market = (territory: string) => `<Market><Territory>${territory}</Territory></Market>`;
  it.each([
    [
      'covered by included',
      sr('01', '<CountriesIncluded>GB FR</CountriesIncluded>'),
      market('<CountriesIncluded>GB</CountriesIncluded>'),
      'pass',
    ],
    [
      'not covered',
      sr('01', '<CountriesIncluded>GB</CountriesIncluded>'),
      market('<CountriesIncluded>FR</CountriesIncluded>'),
      'fail',
    ],
    [
      'covered by WORLD',
      sr('02', '<RegionsIncluded>WORLD</RegionsIncluded>'),
      market('<CountriesIncluded>FR</CountriesIncluded>'),
      'pass',
    ],
    [
      'WORLD minus excluded',
      sr('02', '<RegionsIncluded>WORLD</RegionsIncluded><CountriesExcluded>FR</CountriesExcluded>'),
      market('<CountriesIncluded>FR</CountriesIncluded>'),
      'fail',
    ],
    [
      'WORLD among tokens',
      sr('01', '<RegionsIncluded>ECZ WORLD</RegionsIncluded>'),
      market('<CountriesIncluded>FR</CountriesIncluded>'),
      'pass',
    ],
    [
      'not-for-sale rights only',
      sr('03', '<CountriesIncluded>GB</CountriesIncluded>'),
      market('<CountriesIncluded>FR</CountriesIncluded>'),
      'pass',
    ],
    ['no market', sr('01', '<CountriesIncluded>GB</CountriesIncluded>'), '', 'pass'],
    [
      'market without countries',
      sr('01', '<CountriesIncluded>GB</CountriesIncluded>'),
      market('<RegionsIncluded>WORLD</RegionsIncluded>'),
      'pass',
    ],
    [
      'substring semantics of matches()',
      sr('01', '<CountriesIncluded>GBX</CountriesIncluded>'),
      market('<CountriesIncluded>GB</CountriesIncluded>'),
      'pass',
    ],
    [
      'second for-sale composite covers',
      sr('01', '<CountriesIncluded>DE</CountriesIncluded>') + sr('02', '<CountriesIncluded>FR</CountriesIncluded>'),
      market('<CountriesIncluded>FR DE</CountriesIncluded>'),
      'pass',
    ],
    [
      'two markets, one uncovered',
      sr('01', '<CountriesIncluded>DE</CountriesIncluded>'),
      market('<CountriesIncluded>DE</CountriesIncluded>') + market('<CountriesIncluded>FR</CountriesIncluded>'),
      'fail',
    ],
  ])('%s', (label, salesRights, markets, expected) => {
    expect(agree(release, ruleById(release, '_20180109_h_1'), product(salesRights, markets), label)).toBe(expected);
  });

  it.each([
    [
      'two SalesRightsType children (matches() over 2 items raises)',
      '<SalesRights><SalesRightsType>01</SalesRightsType><SalesRightsType>02</SalesRightsType><Territory><CountriesIncluded>GB</CountriesIncluded></Territory></SalesRights>',
      market('<CountriesIncluded>GB</CountriesIncluded>'),
      true,
    ],
    [
      'two CountriesIncluded in one territory (string() over 2 items raises)',
      '<SalesRights><SalesRightsType>01</SalesRightsType><Territory><CountriesIncluded>GB</CountriesIncluded><CountriesIncluded>FR</CountriesIncluded></Territory></SalesRights>',
      market('<CountriesIncluded>GB</CountriesIncluded>'),
      true,
    ],
    [
      'a regex metacharacter in a market token',
      sr('01', '<CountriesIncluded>GB</CountriesIncluded>'),
      market('<CountriesIncluded>G.</CountriesIncluded>'),
      false,
    ],
  ])('falls back to the canonical evaluator on %s', (_label, salesRights, markets, raises) => {
    const rule = ruleById(release, '_20180109_h_1');
    const e = product(salesRights, markets);
    expect(fast(release, rule, e)).toBeUndefined();
    const verdict = canonical(release, rule, e);
    if (raises) expect(verdict).toBeInstanceOf(Error);
    else expect(typeof verdict).toBe('boolean');
  });
});

const TEXT_CASES: [label: string, inner: string, attributes: string][] = [
  ['plain', 'Hello', ''],
  ['empty', '', ''],
  ['whitespace only', ' \n\t ', ''],
  ['NBSP only (XSD non-whitespace)', '\u00a0', ''],
  ['U+2028 only', '\u2028', ''],
  ['markup only default', '<p></p>', ''],
  ['markup only 02', '&lt;p&gt;&lt;/p&gt;', ' textformat="02"'],
  ['markup only 03', '<b></b>', ' textformat="03"'],
  ['markup with text 02', '&lt;p&gt;x&lt;/p&gt;', ' textformat="02"'],
  ['markup with text 05', '<p>x</p>', ' textformat="05"'],
  ['markup 06', '<i>x</i>', ' textformat="06"'],
  ['markup 07', '<i>x</i>', ' textformat="07"'],
  ['ascii 07', 'plain ASCII\ttext\n', ' textformat="07"'],
  ['non-ascii 07', 'café', ' textformat="07"'],
  ['non-ascii default', 'café', ''],
  ['astral 07', 'a\u{1F600}b', ' textformat="07"'],
  ['empty 07', '', ' textformat="07"'],
  ['lone tag start', 'a &lt; b', ''],
  ['escaped lt only', '&lt;', ' textformat="02"'],
  ['digit tag', '&lt;1&gt;', ' textformat="07"'],
  ['tag with attributes', '<a href="x">y</a>', ''],
  ['tag with attributes 02', '&lt;a href="x"&gt;y&lt;/a&gt;', ' textformat="02"'],
  ['cdata markup', '<![CDATA[<p>z</p>]]>', ''],
  ['cdata markup 03', '<![CDATA[<p></p>]]>', ' textformat="03"'],
  ['nested element text', '<x>inner</x>', ' textformat="05"'],
  ['other-namespace textformat attribute', 'x', ' xmlns:o="urn:o" o:textformat="07"'],
];

describe.each(['3.0', '3.1'] as const)('A5-A8 text assertions agree with canonical evaluation (%s)', (release) => {
  it.each(['A5', 'A6', 'A7', 'A8'] as const)('%s on every bound owner and every text case', (family) => {
    const rules = boundRules(release, family);
    expect(rules.length).toBeGreaterThan(0);
    const outcomes = new Set<string>();
    for (const rule of rules) {
      for (const [label, inner, attributes] of TEXT_CASES) {
        outcomes.add(agree(release, rule, element(release, rule.owner, inner, attributes), label));
      }
    }
    expect(outcomes).toContain('pass');
    expect(outcomes).toContain('fail');
    expect(outcomes).not.toContain('fallback');
  });

  it('A5 treats XSD non-whitespace (NBSP) as content and XSD whitespace as empty', () => {
    const rule = boundRules(release, 'A5')[0];
    expect(fast(release, rule, element(release, rule.owner, '\u00a0'))).toBe(true);
    expect(fast(release, rule, element(release, rule.owner, ' \r\n\t'))).toBe(false);
    expect(canonical(release, rule, element(release, rule.owner, '\u00a0'))).toBe(true);
  });

  it('A8 requires a non-empty full-string match and rejects surrogates', () => {
    const rule = boundRules(release, 'A8')[0];
    const owner = rule.owner;
    expect(fast(release, rule, element(release, owner, '', ' textformat="07"'))).toBe(false);
    expect(fast(release, rule, element(release, owner, 'ok', ' textformat="07"'))).toBe(true);
    expect(fast(release, rule, element(release, owner, 'a\u{1F600}', ' textformat="07"'))).toBe(false);
    expect(fast(release, rule, element(release, owner, 'café', ' textformat="06"'))).toBe(true);
    expect(fast(release, rule, element(release, owner, ''))).toBe(true);
  });
});
