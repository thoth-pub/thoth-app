// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from 'vitest';

import {
  expectOutcomes,
  expectPlanning,
  expectSourceGate,
  fixtureDeclarationViolations,
  type OnixFixtureRule,
  type OnixRegressionRun,
  runOnixRegressionFixture,
  runRegisteredOnixFixture,
} from './assertions';
import { ONIX_REGRESSION_FIXTURES } from './fixtures';
import representative from './fixtures/representative-onix31-two-manifestations/expected';
import {
  ONIX_FIXTURE_FILES,
  onixFixtureDirectories,
  onixFixtureFiles,
  onixFixtureSource,
  sha256Hex,
} from './fixtureSources';
import { countOutcomes, outcomeLedger } from './ledger';
import {
  ONIX_REGRESSION_OUTCOMES,
  type OnixContractClassification,
  type OnixRegressionFixture,
  type OnixSourceFindingEntry,
} from './types';

/**
 * Self-tests of the ONIX regression harness (thoth-app#236): the fixture layout, the outcome vocabulary, the rules
 * that keep a known defect of another system from reading as contract behaviour, and the exactness of every
 * assertion. `SOURCE_INVALID` is proven end to end on an in-memory derivative of the representative fixture, never
 * on a second committed source.
 */

vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

const rulesOf = (fixture: OnixRegressionFixture, source?: Uint8Array): OnixFixtureRule[] =>
  fixtureDeclarationViolations(fixture, source).map(({ rule }) => rule);

/**
 * The representative source with each chapter's PageRun and NumberOfPages written after its TextItem closes: the
 * defect shape of the Thoth ONIX exporter recorded in thoth-pub/thoth#955, reproduced on synthetic data.
 */
const withPageRunOutsideTextItem = (xml: string): string => {
  const derived = xml.replace(
    /(\n\s*<PageRun>[\s\S]*?<\/PageRun>\n\s*<NumberOfPages>\d+<\/NumberOfPages>)(\n\s*<\/TextItem>)/g,
    '$2$1',
  );
  if (derived === xml) throw new Error('the representative source no longer has a PageRun to move');

  return derived;
};

const DEFECT_REFERENCE = 'thoth-pub/thoth#955';

const pageRunFinding = (product: number): OnixSourceFindingEntry => ({
  id: 'ORDINARY_XSD_INVALID',
  tier: 'CANONICAL_ORDINARY',
  scope: 'VALIDITY',
  class: 'SOURCE_INVALID',
  blocking: true,
  projection: 'AUTHORITATIVE',
  recoverability: 'NOT_RECOVERABLE',
  counts: true,
  path: `/ONIXMessage[1]/Product[${product}]/ContentDetail[1]/ContentItem[1]/PageRun[1]`,
});

/** A KNOWN_DEFECT declaration of the derivative: the importer's refusal stated exactly, each entry attributed. */
const knownDefectDeclaration = (source: Uint8Array): OnixRegressionFixture => ({
  id: 'derived-pagerun-outside-textitem',
  status: 'KNOWN_DEFECT',
  purpose: 'A source carrying the thoth#955 exporter defect shape is refused at the source gate, as a defect.',
  source: {
    origin: 'SYNTHETIC',
    provenance: 'The representative fixture with PageRun and NumberOfPages moved after TextItem, in memory.',
    sha256: sha256Hex(source),
  },
  defects: [
    { reference: DEFECT_REFERENCE, owner: 'thoth', summary: 'PageRun and NumberOfPages written outside TextItem' },
  ],
  asOf: representative.asOf,
  imprints: representative.imprints,
  gate: {
    verdict: 'SOURCE_INVALID',
    release: '3.1',
    flavour: 'reference',
    findings: [
      { ...pageRunFinding(1), defect: DEFECT_REFERENCE },
      { ...pageRunFinding(2), defect: DEFECT_REFERENCE },
    ],
    recoveries: [],
  },
  scenarios: [],
  refusedOutcomes: { SOURCE_INVALID: 1 },
});

/** Every property name anywhere in a value. */
const propertyNames = (value: unknown, names = new Set<string>()): Set<string> => {
  if (Array.isArray(value)) value.forEach((item) => propertyNames(item, names));
  else if (value !== null && typeof value === 'object') {
    for (const [name, child] of Object.entries(value)) {
      names.add(name);
      propertyNames(child, names);
    }
  }

  return names;
};

describe('ONIX regression harness', () => {
  describe('fixture layout', () => {
    it('registers every fixture directory, and only those', () => {
      expect(ONIX_REGRESSION_FIXTURES.map(({ id }) => id).sort()).toStrictEqual(onixFixtureDirectories());
    });

    it.each(ONIX_REGRESSION_FIXTURES.map(({ id }) => id))('keeps exactly its source and expectation in %s', (id) => {
      expect(onixFixtureFiles(id)).toStrictEqual([...ONIX_FIXTURE_FILES]);
    });
  });

  describe('outcome vocabulary', () => {
    it('is the programme test matrix of thoth-app#188 and #236', () => {
      expect([...ONIX_REGRESSION_OUTCOMES]).toStrictEqual([
        'SOURCE_INVALID',
        'SUPPORTED_LOSSLESS',
        'SUPPORTED_NORMALIZED',
        'SUPPORTED_WITH_WARNING',
        'TARGET_UNREPRESENTABLE',
        'TARGET_INPUT_REQUIRED',
        'UNKNOWN',
      ]);
    });

    it('counts every classification a ledger carries, and drops none', () => {
      const classifications: OnixContractClassification[] = [
        ...ONIX_REGRESSION_OUTCOMES,
        'SOURCE_CONFLICT',
        'PREFLIGHT_GAP',
        'EXECUTION_DEFERRED',
      ];
      const entries = classifications.map((outcome) => ({
        stage: 'PLAN_FINDING' as const,
        outcome,
        code: `TEST/${outcome}`,
        subject: null,
        blocking: false,
      }));

      expect(countOutcomes(entries)).toStrictEqual(Object.fromEntries(classifications.map((outcome) => [outcome, 1])));
    });
  });

  describe('declaration rules', () => {
    it('accepts the representative CONTRACT fixture as declared', () => {
      expect(rulesOf(representative, onixFixtureSource(representative))).toStrictEqual([]);
    });

    it('binds a fixture to the exact bytes of its source', () => {
      const edited = new TextEncoder().encode(`${new TextDecoder().decode(onixFixtureSource(representative))}\n`);

      expect(rulesOf(representative, edited)).toStrictEqual(['SOURCE_HASH_MISMATCH']);
    });

    it('never lets a CONTRACT fixture carry a defect', () => {
      const [scenario, ...rest] = representative.scenarios;
      const attributed: OnixRegressionFixture = {
        ...representative,
        defects: [{ reference: DEFECT_REFERENCE, owner: 'thoth', summary: 'a defect' }],
        scenarios: [
          {
            ...scenario,
            planning: {
              ...scenario.planning,
              findings: scenario.planning.findings.map((entry) => ({ ...entry, defect: DEFECT_REFERENCE })),
            },
          },
          ...rest,
        ],
      };

      expect(new Set(rulesOf(attributed))).toStrictEqual(
        new Set<OnixFixtureRule>(['CONTRACT_DECLARES_DEFECTS', 'CONTRACT_ATTRIBUTES_ENTRY']),
      );
    });

    it('checks that a planning gate has scenarios and a normalised source, and a refusing gate has neither', () => {
      expect(rulesOf({ ...representative, scenarios: [], normalized: undefined })).toStrictEqual([
        'PERMITTED_WITHOUT_SCENARIO',
        'PERMITTED_WITHOUT_NORMALIZED',
      ]);
      expect(rulesOf({ ...representative, refusedOutcomes: {} })).toStrictEqual(['PERMITTED_WITH_REFUSED_OUTCOMES']);
      expect(rulesOf({ ...representative, gate: { ...representative.gate, verdict: 'SOURCE_INVALID' } })).toStrictEqual(
        ['REFUSED_WITH_SCENARIO', 'REFUSED_WITH_NORMALIZED', 'REFUSED_WITHOUT_OUTCOMES'],
      );
    });

    it('rejects an id that is not a directory-safe slug and a repeated scenario name', () => {
      const [scenario] = representative.scenarios;

      expect(rulesOf({ ...representative, id: 'Not A Slug', scenarios: [scenario, scenario] })).toStrictEqual([
        'ID_FORMAT',
        'SCENARIO_NAME_DUPLICATE',
      ]);
    });
  });

  describe('SOURCE_INVALID, end to end, as a known defect', () => {
    const source = new TextEncoder().encode(
      withPageRunOutsideTextItem(new TextDecoder().decode(onixFixtureSource(representative))),
    );
    const declaration = knownDefectDeclaration(source);
    let run: OnixRegressionRun;

    beforeAll(async () => {
      run = await runOnixRegressionFixture(declaration, source);
    });

    it('refuses the source at the gate, exactly as the declaration states, and plans nothing', () => {
      expectSourceGate(run.gateLedger, declaration.gate);
      expect(run.gate.bridged).toBeNull();
      expect(run.scenarios).toStrictEqual([]);
      expectOutcomes(run.gateOutcomes, { SOURCE_INVALID: 1 });
    });

    it('is a well-formed KNOWN_DEFECT declaration', () => {
      expect(rulesOf(declaration, source)).toStrictEqual([]);
    });

    it('requires every blocking entry of a known-defect fixture to be attributed to a declared defect', () => {
      const unattributed = {
        ...declaration,
        gate: {
          ...declaration.gate,
          findings: [pageRunFinding(1), { ...pageRunFinding(2), defect: 'thoth-pub/thoth#0' }],
        },
      };

      expect(rulesOf(unattributed)).toStrictEqual([
        'KNOWN_DEFECT_BLOCKING_UNATTRIBUTED',
        'DEFECT_UNUSED',
        'ATTRIBUTION_UNDECLARED',
      ]);
      expect(rulesOf({ ...declaration, defects: [] })).toContain('KNOWN_DEFECT_WITHOUT_DEFECTS');
    });

    it('never accepts a refused Thoth export as a contract', () => {
      const thothExport = (fixture: OnixRegressionFixture): OnixRegressionFixture => ({
        ...fixture,
        source: { ...fixture.source, origin: 'THOTH_EXPORT' },
      });
      const asContract: OnixRegressionFixture = {
        ...declaration,
        status: 'CONTRACT',
        defects: [],
        gate: { ...declaration.gate, findings: [pageRunFinding(1), pageRunFinding(2)] },
      };

      expect(rulesOf(thothExport(asContract))).toStrictEqual(['THOTH_EXPORT_REFUSED_AS_CONTRACT']);
      expect(rulesOf(thothExport(declaration))).toStrictEqual([]);
    });
  });

  describe('assertions', () => {
    let run: OnixRegressionRun;

    beforeAll(async () => {
      run = await runRegisteredOnixFixture(representative);
    });

    it('fail on a missing or an unexpected plan entry', () => {
      const [, decided] = representative.scenarios;
      const [observed] = run.scenarios.filter(({ scenario }) => scenario === decided);

      expect(() => expectPlanning(observed.planning, decided.planning)).not.toThrow();
      expect(() =>
        expectPlanning(observed.planning, { ...decided.planning, findings: decided.planning.findings.slice(1) }),
      ).toThrow();
      expect(() =>
        expectPlanning(observed.planning, {
          ...decided.planning,
          blockers: [
            {
              code: 'WORK_TYPE_INPUT_REQUIRED',
              classification: 'TARGET_INPUT_REQUIRED',
              recordKey: null,
              productKey: null,
              groupKey: null,
            },
          ],
        }),
      ).toThrow();
    });

    it('fail on a source finding the gate did not state', () => {
      expect(() =>
        expectSourceGate(run.gateLedger, { ...representative.gate, findings: [pageRunFinding(1)] }),
      ).toThrow();
    });

    it('fail on an outcome count that differs', () => {
      const [asUploaded] = run.scenarios;

      expect(() => expectOutcomes(asUploaded.outcomes, { ...asUploaded.scenario.outcomes, UNKNOWN: 2 })).toThrow();
    });

    it('bind to semantic fields only: no ledger carries a message', () => {
      const ledgers = [run.gateLedger, ...run.scenarios.map(({ planning }) => planning)];

      expect(propertyNames(ledgers).has('message')).toBe(false);
    });

    it('exercise every programme outcome on real pipeline runs, with the derived refusal', async () => {
      const refused = await runOnixRegressionFixture(
        { asOf: representative.asOf, imprints: representative.imprints, scenarios: [] },
        new TextEncoder().encode(
          withPageRunOutsideTextItem(new TextDecoder().decode(onixFixtureSource(representative))),
        ),
      );
      const observed = new Set(
        [...run.scenarios.flatMap(({ outcomes }) => outcomes), ...outcomeLedger(refused.gateLedger, null)].map(
          ({ outcome }) => outcome,
        ),
      );

      expect(ONIX_REGRESSION_OUTCOMES.filter((outcome) => !observed.has(outcome))).toStrictEqual([]);
    });
  });
});
