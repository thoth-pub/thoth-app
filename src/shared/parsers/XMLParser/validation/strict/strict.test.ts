// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { STRICT_DISPOSITIONS } from '../dispositions';
import { createOrdinaryValidator } from '../ordinary';
import { ONIX_VALIDATION_RESOURCES } from '../resources';
import { SCHEMA_MODELS, type SchemaModel } from '../schemaModel';
import { type OnixRelease, SCHEMA_RELEASE } from '../types';
import { buildXdm, pathOf } from '../xdm';
import { applySchemaDefaults, evaluateStrict } from './evaluate';
import { buildRuleset, compileRuleset, type Ruleset } from './ruleset';

const VALIDATION_DIR = join(__dirname, '..');
const FIXTURES = join(VALIDATION_DIR, '__fixtures__', 'spike02');
const PUBLIC_DIR = join(process.cwd(), 'public', 'onix-validation');
const fixture = (set: string, name: string) => readFileSync(join(FIXTURES, set, name), 'utf8');
const errorCode = (message: string | null) =>
  message ? (/^Error: ([A-Z]{4}\d{4})/.exec(message)?.[1] ?? message) : null;

// ---------------------------------------------------------------------------
// Pinned XSD 1.1 semantics (SPIKE-02 v4 §2, verified against Xerces2-J 2.12.2)
// ---------------------------------------------------------------------------
const MINI_XSD = (asserts: string, extra = '') => `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
  targetNamespace="urn:t" xpathDefaultNamespace="##targetNamespace">
  <xs:simpleType name="dt.Pair"><xs:restriction><xs:simpleType><xs:list itemType="xs:string"/></xs:simpleType>
    <xs:assertion id="v_pair" test="count($value) eq 2"/></xs:restriction></xs:simpleType>
  <xs:element name="R"><xs:complexType><xs:sequence/>${asserts}</xs:complexType></xs:element>
  <xs:element name="L2"><xs:complexType><xs:simpleContent><xs:extension base="dt.Pair"/></xs:simpleContent></xs:complexType></xs:element>
  ${extra}
</xs:schema>`;

const MINI_MODEL: SchemaModel = {
  release: 'test',
  ordinarySha256: '',
  defaults: { C: 'C' },
  elements: {
    R: { children: ['P', 'Q', 'S', 'L', 'C', 'T', 'L2'] },
    P: { simple: { primitive: 'decimal', variety: 'atomic' } },
    Q: { simple: { primitive: 'decimal', variety: 'atomic' } },
    S: { simple: { primitive: 'decimal', variety: 'atomic' } },
    L: { simple: { primitive: 'list', variety: 'list' } },
    C: { simple: { primitive: 'string', variety: 'atomic' } },
    T: { simple: { primitive: 'string', variety: 'atomic' } },
    L2: { simple: { primitive: 'list', variety: 'list' } },
  },
};
const UNTYPED_MODEL: SchemaModel = { ...MINI_MODEL, defaults: {}, elements: { R: { children: [] } } };

function probe(test: string, body: string, model: SchemaModel = MINI_MODEL) {
  const rs = compileRuleset(buildRuleset(MINI_XSD(`<xs:assert id="a" test="${test}"/>`)), model);
  const { document } = buildXdm(`<R xmlns="urn:t">${body}</R>`);
  applySchemaDefaults(document, model);
  return evaluateStrict(rs, document).findings.map((f) =>
    f.dynamicError ? `a(dyn ${errorCode(f.dynamicError)})` : 'a',
  );
}

describe('pinned strict evaluation semantics', () => {
  it('evaluates both operands of and/or (a raising operand is never short-circuited)', () => {
    expect(probe('false() and error()', '')).toEqual(['a(dyn FOER0000)']);
    expect(probe('error() and false()', '')).toEqual(['a(dyn FOER0000)']);
    expect(probe('true() or error()', '')).toEqual(['a(dyn FOER0000)']);
    expect(probe('true() and (true() or error())', '')).toEqual(['a(dyn FOER0000)']);
  });

  it('keeps if/some/every lazy', () => {
    expect(probe('if (true()) then true() else error()', '')).toEqual([]);
    expect(probe('some $x in (1,0) satisfies 1 div $x eq 1', '')).toEqual([]);
    expect(probe('not(every $x in (2,0) satisfies 1 div $x eq 1)', '')).toEqual([]);
  });

  it('atomises decimal-typed children as xs:decimal with exact arithmetic', () => {
    const body = '<P>0.1</P><Q>0.2</Q><S>0.3</S>';
    expect(probe('P + Q eq S', body)).toEqual([]);
    // The approved probe forms of SPIKE-02 v4 §2 (repeated decimal-typed children).
    expect(probe('P[1] + P[2] eq P[3]', '<P>0.1</P><P>0.2</P><P>0.3</P>')).toEqual([]);
    expect(probe('sum(P) eq 0.3', '<P>0.1</P><P>0.2</P>')).toEqual([]);
    expect(probe('P = 0.1', '<P>0.10</P>')).toEqual([]);
    // Without the schema-derived typing the same test fails under IEEE doubles.
    expect(probe('P + Q eq S', body, UNTYPED_MODEL)).toEqual(['a']);
  });

  it('atomises list-typed children to their tokens', () => {
    expect(probe("L = 'WORLD'", '<L>GB-ENG WORLD</L>')).toEqual([]);
    expect(probe("L = 'WORLD'", '<L>GB-ENG WORLD</L>', UNTYPED_MODEL)).toEqual(['a']);
  });

  it('applies schema defaults to empty elements, and can revert them', () => {
    expect(probe("C eq 'C'", '<C/>')).toEqual([]);
    expect(probe("C eq 'C'", '<C>  </C>')).toEqual(['a']);
    const { document } = buildXdm('<R xmlns="urn:t"><C/></R>');
    const applied = applySchemaDefaults(document, MINI_MODEL);
    expect(applied).toHaveLength(1);
    expect(document.documentElement?.textContent).toBe('C');
    applied.revert();
    expect(document.documentElement?.textContent).toBe('');
  });

  it('binds $value to the typed value of a simple-type assertion', () => {
    const rs = compileRuleset(buildRuleset(MINI_XSD('')), MINI_MODEL);
    const run = (body: string) =>
      evaluateStrict(rs, buildXdm(`<R xmlns="urn:t">${body}</R>`).document).findings.map((f) => f.id);
    expect(run('<L2>a b</L2>')).toEqual([]);
    expect(run('<L2>a</L2>')).toEqual(['v_pair']);
  });
});

// ---------------------------------------------------------------------------
// Pinned official strict schemas
// ---------------------------------------------------------------------------
const rulesets: Partial<Record<OnixRelease, Ruleset>> = {};
beforeAll(() => {
  for (const release of ['3.0', '3.1'] as const) {
    rulesets[release] = compileRuleset(
      buildRuleset(readFileSync(join(PUBLIC_DIR, `ONIX_BookProduct_${release}_reference_strict.xsd`), 'utf8')),
      SCHEMA_MODELS[release],
    );
  }
}, 120_000);

describe.each([
  ['3.0', 1286, 164],
  ['3.1', 1303, 163],
] as const)('official Reference strict schema %s', (release, boundRules, owners) => {
  it('extracts every assertion, compiles all of them and matches the disposition table exactly', () => {
    const rs = rulesets[release]!;
    const rules = [...rs.byElement.values()].flat();
    if (boundRules !== null) expect(rules).toHaveLength(boundRules);
    if (owners !== null) expect(rs.byElement.size).toBe(owners);
    expect(rules.filter((r) => r.compileError)).toEqual([]);
    const extracted = new Set(rules.map((r) => r.id));
    const table = STRICT_DISPOSITIONS[SCHEMA_RELEASE[release]];
    // Every evaluated rule has a versioned disposition...
    expect([...extracted].filter((id) => !(id in table))).toEqual([]);
    // ...and the only classified rule that is never evaluated is the ownerless 3.1.3 assertion
    // that the v4 table records as inert as shipped (its live duplicate is _20171208_a_46).
    expect(Object.keys(table).filter((id) => !extracted.has(id))).toEqual(release === '3.1' ? ['_20240205_b_4'] : []);
    if (release === '3.1') {
      expect(table['_20240205_b_4'][2]).toBe('INERT_OR_WEAKENED');
      expect(extracted.has('_20171208_a_46')).toBe(true);
    }
  });
});

describe('frozen SPIKE-02 v4 canonical outputs: Class A/B edge fixtures (3.0.8)', () => {
  const expected: Record<string, { defaultsApplied: number; findings: [string, string, string, string | null][] }> =
    JSON.parse(readFileSync(join(FIXTURES, 'expected', 'strict_edge30.json'), 'utf8'));

  it('covers every committed edge fixture', () => {
    expect(Object.keys(expected).sort()).toEqual(readdirSync(join(FIXTURES, 'edge')).sort());
  });

  it.each(Object.keys(expected))('%s', (name) => {
    const { document } = buildXdm(fixture('edge', name));
    const defaults = applySchemaDefaults(document, SCHEMA_MODELS['3.0']);
    const { findings } = evaluateStrict(rulesets['3.0']!, document);
    expect(defaults.length).toBe(expected[name].defaultsApplied);
    expect(findings.map((f) => [f.id, f.element, f.path, errorCode(f.dynamicError)])).toEqual(
      expected[name].findings.map(([id, element, path, error]) => [id, element, path, errorCode(error)]),
    );
  });
});

describe('RULE_NOT_EVALUABLE: 3.1.3 _20171221_j_28 (malformed official regex)', () => {
  const copyrightOwner = (set: string) =>
    readdirSync(join(FIXTURES, set)).filter((n) => n.includes('CopyrightOwnerIdentifier'));

  it('raises FORX0002 for every 3.1 CopyrightOwnerIdentifier, whatever its type', () => {
    const names = copyrightOwner('eidr31');
    expect(names.length).toBeGreaterThan(5);
    for (const name of names) {
      const { findings } = evaluateStrict(rulesets['3.1']!, buildXdm(fixture('eidr31', name)).document);
      const j28 = findings.filter((f) => f.id === '_20171221_j_28');
      expect(j28, name).toHaveLength(1);
      expect(errorCode(j28[0].dynamicError), name).toBe('FORX0002');
      expect(j28[0].path, name).toMatch(/CopyrightOwnerIdentifier\[1\]$/);
    }
  });

  it('never raises for the well-formed 3.0.8 member of the same rule', () => {
    for (const name of copyrightOwner('eidr30')) {
      const { findings } = evaluateStrict(rulesets['3.0']!, buildXdm(fixture('eidr30', name)).document);
      expect(
        findings.filter((f) => f.dynamicError),
        name,
      ).toEqual([]);
    }
  });
});

describe('same-key LanguageRole 01 + 02 (_20171218_f_2, ONIX-AUDIT-LANGUAGE-02)', () => {
  const resources = new Map(
    ONIX_VALIDATION_RESOURCES.map((r) => [r.fileName, new Uint8Array(readFileSync(join(PUBLIC_DIR, r.fileName)))]),
  );
  const language = (role: string, code: string, country = '', script = '') =>
    `<Language><LanguageRole>${role}</LanguageRole><LanguageCode>${code}</LanguageCode>${
      country ? `<CountryCode>${country}</CountryCode>` : ''
    }${script ? `<ScriptCode>${script}</ScriptCode>` : ''}</Language>`;
  const cases: [string, string, boolean][] = [
    ['01/ger + 02/ger', language('01', 'ger') + language('02', 'ger'), true],
    ['01/ger/AT + 02/ger/AT', language('01', 'ger', 'AT') + language('02', 'ger', 'AT'), true],
    ['01/ger/AT + 02/ger/DE', language('01', 'ger', 'AT') + language('02', 'ger', 'DE'), false],
    ['01/ger + 02/fre', language('01', 'ger') + language('02', 'fre'), false],
    ['01/ger + 06/ger', language('01', 'ger') + language('06', 'ger'), false],
    ['01/ger/Latn + 02/ger/Cyrl', language('01', 'ger', '', 'Latn') + language('02', 'ger', '', 'Cyrl'), false],
    ['a lone 02/ger', language('02', 'ger'), false],
  ];

  it.each(['3.0', '3.1'] as const)('%s: fires exactly on the same-key contradiction', async (release) => {
    const validator = await createOrdinaryValidator(resources, `ONIX_BookProduct_${release}_reference.xsd`);
    const base = fixture(release === '3.0' ? 'dtd_suite30' : 'dtd_suite31', 'N3_plain.xml');
    for (const [label, languages, fires] of cases) {
      const text = base.replace('</TitleDetail>', `</TitleDetail>${languages}`);
      expect(validator.validate(new TextEncoder().encode(text)).diagnostics, `${label} is ordinary-valid`).toEqual([]);
      const { document } = buildXdm(text);
      const hits = evaluateStrict(rulesets[release]!, document).findings.filter((f) => f.id === '_20171218_f_2');
      expect(
        hits.map((f) => pathOf(f.node)),
        label,
      ).toEqual(fires ? ['/ONIXMessage[1]/Product[1]/DescriptiveDetail[1]'] : []);
    }
    validator.dispose();
  });

  it('is classified NORMATIVE_INVALID for both releases', () => {
    expect(STRICT_DISPOSITIONS['3.0.8']['_20171218_f_2'][0]).toBe('NORMATIVE_INVALID');
    expect(STRICT_DISPOSITIONS['3.1.3']['_20171218_f_2'][0]).toBe('NORMATIVE_INVALID');
  });
});
