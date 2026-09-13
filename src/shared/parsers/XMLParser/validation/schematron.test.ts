// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { SCHEMATRON_DISPOSITIONS, schematronDisposition } from './dispositions';
import { createOrdinaryValidator } from './ordinary';
import { ONIX_VALIDATION_RESOURCES } from './resources';
import { SCHEMA_MODELS } from './schemaModel';
import { evaluateSchematron } from './schematron';
import { evaluateSourceGate } from './sourceGate';
import { applySchemaDefaults, evaluateStrict } from './strict/evaluate';
import { buildRuleset, compileRuleset, type Ruleset } from './strict/ruleset';
import { type OnixRelease, SCHEMA_RELEASE } from './types';
import { buildXdm } from './xdm';

const FIXTURES = join(__dirname, '__fixtures__', 'spike02');
const PUBLIC_DIR = join(process.cwd(), 'public', 'onix-validation');
const fixture = (set: string, name: string) => readFileSync(join(FIXTURES, set, name), 'utf8');
const base = (release: OnixRelease) => fixture(release === '3.0' ? 'dtd_suite30' : 'dtd_suite31', 'N3_plain.xml');

const MINI = `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:sch="http://purl.oclc.org/dsdl/schematron"
  targetNamespace="urn:t"><xs:annotation><xs:appinfo><sch:pattern xmlns="urn:t" xmlns:onix="urn:t">
  <sch:rule context="//onix:A">
    <sch:report id="r1" role="warn" test=". eq 'x'">A is x</sch:report>
    <sch:assert id="a1" test=". eq 'x'">A must be x</sch:assert>
  </sch:rule>
  <sch:rule context="//onix:B"><sch:report id="r2" test="error()">raises</sch:report></sch:rule>
  <sch:rule context="error()"><sch:report id="r3" test="true()">context raises</sch:report></sch:rule>
  <sch:rule context="//onix:*/@code"><sch:report id="r4" test=". eq 'y'">attribute context</sch:report></sch:rule>
  <sch:rule context="//zz:A"><sch:report id="r5" test="true()">unknown prefix falls back to the default</sch:report></sch:rule>
</sch:pattern></xs:appinfo></xs:annotation></xs:schema>`;

describe('Schematron evaluation semantics', () => {
  it('fires reports, fails asserts, and keeps every raise as an explicit not-evaluable finding', () => {
    const rs = buildRuleset(MINI);
    const { document } = buildXdm('<R xmlns="urn:t"><A>x</A><A>z</A><B/><C code="y"/></R>');
    expect(
      evaluateSchematron(rs, document).map((f) => [
        f.id,
        f.path,
        f.notEvaluable ? `${f.notEvaluable.phase}:${/^Error: (\w+)/.exec(f.notEvaluable.error)?.[1]}` : null,
      ]),
    ).toEqual([
      ['r1', '/R[1]/A[1]', null],
      ['a1', '/R[1]/A[2]', null],
      ['r2', '/R[1]/B[1]', 'test:FOER0000'],
      ['r3', '/', 'context:FOER0000'],
      ['r4', '/', null],
      // An undeclared prefix resolves to the report's default namespace, as in the reference.
      ['r5', '/R[1]/A[1]', null],
      ['r5', '/R[1]/A[2]', null],
    ]);
  });
});

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
  ['3.0', 140],
  ['3.1', 142],
] as const)('official embedded Schematron %s', (release, reports) => {
  it('extracts every report and classifies each one in the versioned table', () => {
    const ids = rulesets[release]!.schematron.map((s) => s.id);
    expect(ids).toHaveLength(reports);
    expect([...ids].sort()).toEqual(Object.keys(SCHEMATRON_DISPOSITIONS[SCHEMA_RELEASE[release]]).sort());
  });
});

describe('blocking Schematron rules decide by disposition, never by role', () => {
  const resources = new Map(
    ONIX_VALIDATION_RESOURCES.map((r) => [r.fileName, new Uint8Array(readFileSync(join(PUBLIC_DIR, r.fileName)))]),
  );
  const cases: [OnixRelease, string, string, string, string][] = [
    ['3.0', '_20180202_d_36', 'warn', '</TitleDetail>', '</TitleDetail><EditionType>ALT</EditionType>'],
    ['3.1', '_20180202_d_36', 'warn', '</TitleDetail>', '</TitleDetail><EditionType>ALT</EditionType>'],
    [
      '3.1',
      '_20180202_d_51',
      'error',
      '</TitleDetail>',
      '</TitleDetail><Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode><RegionCode>ECZ</RegionCode></Language>',
    ],
    [
      '3.1',
      '_20180202_d_52',
      'error',
      '</DescriptiveDetail>',
      '</DescriptiveDetail><CollateralDetail><SupportingResource><ResourceContentType>99</ResourceContentType><ContentAudience>00</ContentAudience><ResourceMode>03</ResourceMode><ResourceVersion><ResourceForm>02</ResourceForm><ResourceLink>https://example.org/x.pdf</ResourceLink></ResourceVersion></SupportingResource></CollateralDetail>',
    ],
    [
      '3.1',
      '_20180202_d_64',
      'error',
      '</PublishingDate>',
      '</PublishingDate><SalesRights><SalesRightsType>00</SalesRightsType><Territory><RegionsIncluded>WORLD</RegionsIncluded></Territory></SalesRights>',
    ],
    [
      '3.1',
      '_20180202_d_53',
      'error',
      '</PublishingDate>',
      '</PublishingDate><SalesRights><SalesRightsType>07</SalesRightsType><Territory><RegionsIncluded>WORLD</RegionsIncluded></Territory></SalesRights>',
    ],
  ];

  it.each(cases)(
    '%s %s (role %s) fires as NORMATIVE_INVALID on ordinary-valid input',
    async (release, id, role, anchor, insert) => {
      const text = base(release).replace(anchor, insert);
      const validator = await createOrdinaryValidator(resources, `ONIX_BookProduct_${release}_reference.xsd`);
      expect(validator.validate(new TextEncoder().encode(text)).diagnostics).toEqual([]);
      validator.dispose();
      const hits = evaluateSchematron(rulesets[release]!, buildXdm(text).document).filter((f) => f.id === id);
      expect(hits).toHaveLength(1);
      expect(hits[0].report.role).toBe(role);
      expect(schematronDisposition(SCHEMA_RELEASE[release], id)).toBe('NORMATIVE_INVALID');
    },
  );

  it('keeps the internal-use code rule outside source validity', () => {
    expect(schematronDisposition('3.0.8', '_20180202_d_65')).toBe('NOT_SOURCE_VALIDITY');
    expect(schematronDisposition('3.1.3', '_20180202_d_65')).toBe('NOT_SOURCE_VALIDITY');
  });
});

// ---------------------------------------------------------------------------
// Frozen SPIKE-02 v4 canonical outputs (strict + Schematron) for every synthetic probe fixture set
// ---------------------------------------------------------------------------
const PROBE_SETS = [
  'residual30',
  'residual31',
  'residual30x',
  'residual31x',
  'kernel30',
  'kernel31',
  'skernel30',
  'skernel31',
  'codelist30',
  'codelist31',
  'dynerr30',
  'dynerr31',
  'eidr30',
  'eidr31',
];

describe.each(PROBE_SETS)('frozen v4 canonical outputs: %s', (set) => {
  const expected: Record<
    string,
    { release: OnixRelease; stage2: string[] | null; strict: string[]; schematron: string[] }
  > = JSON.parse(readFileSync(join(FIXTURES, 'expected', `probe_${set}.json`), 'utf8'));

  it('reproduces every fixture exactly', () => {
    // The v4 probe transcripts record sorted de-duplicated sets (bin/residual_probe_batch.sh:
    // `sorted(set(...))`), so that is the granularity compared here; order and multiplicity are
    // pinned exactly by the edge suite and the full differentials.
    const asSet = (values: string[]) => [...new Set(values)].sort();
    const mismatches: string[] = [];
    for (const [name, want] of Object.entries(expected)) {
      const text = fixture(set, name);
      if (evaluateSourceGate(text).kind === 'STOP') {
        // The reference stops before any later tier as well.
        if (want.strict.length || want.schematron.length) mismatches.push(`${name}: stopped but v4 has findings`);
        continue;
      }
      const { document } = buildXdm(text);
      applySchemaDefaults(document, SCHEMA_MODELS[want.release]);
      const strict = asSet(evaluateStrictIds(rulesets[want.release]!, document));
      const schematron = asSet(
        evaluateSchematron(rulesets[want.release]!, document)
          .filter((f) => !f.notEvaluable)
          .map((f) => `${f.id}/${f.report.role}`),
      );
      if (JSON.stringify(strict) !== JSON.stringify(want.strict)) {
        mismatches.push(`${name} strict ${JSON.stringify(strict)} != ${JSON.stringify(want.strict)}`);
      }
      if (JSON.stringify(schematron) !== JSON.stringify(want.schematron)) {
        mismatches.push(`${name} schematron ${JSON.stringify(schematron)} != ${JSON.stringify(want.schematron)}`);
      }
    }
    expect(mismatches).toEqual([]);
  }, 120_000);
});

function evaluateStrictIds(rs: Ruleset, document: ReturnType<typeof buildXdm>['document']): string[] {
  return evaluateStrict(rs, document).findings.map((f) => (f.dynamicError ? `${f.id}(dyn)` : f.id));
}
