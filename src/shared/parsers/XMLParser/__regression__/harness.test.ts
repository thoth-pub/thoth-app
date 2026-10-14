// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { createOnixSourceValidator, PROLOG_SCAN_BOUND } from '../validation';
import { createExecutionControls } from '../validation/worker/execution';
import { toWorkerResult } from '../validation/worker/result';
import {
  expectNormalized,
  expectOutcomes,
  expectPlanning,
  expectSourceGate,
  fixtureDeclarationViolations,
  type OnixFixtureRule,
  type OnixRegressionRun,
  runOnixRegressionFixture,
  runRegisteredOnixFixture,
  withoutAttribution,
} from './assertions';
import { ONIX_REGRESSION_FIXTURES } from './fixtures';
import existingConflict from './fixtures/existing-target-conflict/expected';
import existingEnrichment from './fixtures/existing-target-enrichment/expected';
import existingNoop from './fixtures/existing-target-noop/expected';
import orcidNormalization from './fixtures/orcid-normalization-repeated-contributor/expected';
import recoverableEmptyTextContent from './fixtures/recoverable-empty-textcontent/expected';
import representative from './fixtures/representative-onix31-two-manifestations/expected';
import externalAuthority from './fixtures/source-external-authority-eidr/expected';
import short30 from './fixtures/source-onix30-short-equivalence/expected';
import short31 from './fixtures/source-onix31-short-equivalence/expected';
import ruleNotEvaluable from './fixtures/source-rule-not-evaluable-eidr/expected';
import securityDoctype from './fixtures/source-security-doctype/expected';
import unsupportedFlavour from './fixtures/source-unsupported-flavour/expected';
import unsupportedOnix21 from './fixtures/source-unsupported-onix21/expected';
import languageRole from './fixtures/uolp-language-role-source-invalid/expected';
import {
  ONIX_FIXTURE_FILES,
  onixFixtureDirectories,
  onixFixtureFiles,
  onixFixtureSource,
  sha256Hex,
} from './fixtureSources';
import { countOutcomes, normalizedMessage, outcomeLedger, sourceGateLedger } from './ledger';
import { ONIX_REGRESSION_PUBLISHER_ID, type OnixGateRun, regressionEnvironment, runOnixSourceGate } from './pipeline';
import {
  ONIX_REGRESSION_OUTCOMES,
  type OnixContractClassification,
  type OnixExistingTargetState,
  type OnixPlanningExpectation,
  type OnixPlanningLedger,
  type OnixRegressionFixture,
  type OnixRegressionScenario,
  type OnixSourceFindingEntry,
  type OnixSourceGateExpectation,
  type OnixSourceGateLedger,
  type OnixSourceProvenanceEntry,
  type OnixTargetLedger,
} from './types';

/**
 * Self-tests of the ONIX regression harness (thoth-app#236): the fixture layout, the outcome vocabulary, the rules
 * that keep a known defect of another system from reading as contract behaviour, and the exactness of every
 * assertion. `SOURCE_INVALID` is proven end to end on an in-memory derivative of the representative fixture, never
 * on a second committed source.
 *
 * The source-validation boundary (thoth-app#248) adds: the exactness of the stop, provenance, source-path and
 * stop-evidence projections; Short-to-Reference equivalence between registered twins; and in-memory derivatives of
 * the registered sources for what no committed fixture should carry - a prolog beyond the 1 MiB scan bound, the 3.1
 * form of the DOCTYPE refusal, namespace-prefixed forms of a Short and a Reference source, and the controls that show
 * each refusal is caused by exactly what the fixture says.
 *
 * The empty-target matrix (thoth-app#249) adds: which fixtures state the target ledger, the exactness of its comparison
 * section by section, that it carries nothing but semantic values, and which of its lists the registered matrix
 * exercises with data - the rest are named, each with the reason it stays empty.
 *
 * Existing targets (thoth-app#250) add: that the empty publisher stays every earlier fixture's Thoth and reads nothing;
 * that the existing-target Thoth answers exactly the reads a scenario states, scoped to the active publisher, once, and
 * fails the run on any other; the exactness of the execution-layer and reconciliation comparisons; and, on real runs,
 * that an existing target is never planned as new, a NOOP unit never acts, an existing Work is never written beyond an
 * attached Publication, and a contradiction holds the plan before execution whatever is answered.
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

const decode = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);
const encode = (text: string): Uint8Array => new TextEncoder().encode(text);

/**
 * An in-memory derivative of a registered source: each `[from, to]` replaces every occurrence of `from`, which must
 * occur, so a derivation fails loudly rather than silently testing the unchanged source.
 */
const derive = (fixture: OnixRegressionFixture, replacements: readonly (readonly [string, string])[]): Uint8Array =>
  encode(
    replacements.reduce(
      (text, [from, to]) => {
        if (!text.includes(from)) throw new Error(`${fixture.id} no longer contains ${from}`);

        return text.split(from).join(to);
      },
      decode(onixFixtureSource(fixture)),
    ),
  );

/** The source gate ledger of any bytes, through the uploader's own gate. */
const gateLedgerOf = async (bytes: Uint8Array): Promise<OnixSourceGateLedger> =>
  sourceGateLedger(await runOnixSourceGate(bytes));

/** A gate expectation over the declared one; nothing else of the declaration changes. */
const withGate = (fixture: OnixRegressionFixture, gate: Partial<OnixSourceGateExpectation>): OnixRegressionFixture => ({
  ...fixture,
  gate: { ...fixture.gate, ...gate },
});

/** The stage-2 refusal of a prolog that does not end within the scan bound (it carries no evidence of its own). */
const PROLOG_BOUND_FINDING: OnixSourceFindingEntry = {
  id: 'SECURITY_PROLOG_BOUND',
  tier: 'PROLOG',
  scope: 'SECURITY',
  class: 'PROCESSING_STOP',
  blocking: true,
  projection: 'AUTHORITATIVE',
  recoverability: 'NOT_RECOVERABLE',
  counts: true,
  path: null,
};

/** The stage-2 DOCTYPE refusal of the security fixture's prolog, as declared there. */
const [SECURITY_DTD_FINDING] = securityDoctype.gate.findings;

/** ONIX 3.1.3's own rule against any DOCTYPE, recorded with the security refusal for a 3.1 source. */
const NO_DOCTYPE_31_FINDING: OnixSourceFindingEntry = {
  id: 'R-MSG-NO-DOCTYPE-31',
  tier: 'PROLOG',
  scope: 'VALIDITY',
  class: 'SOURCE_INVALID',
  blocking: true,
  projection: 'AUTHORITATIVE',
  recoverability: 'NOT_RECOVERABLE',
  counts: true,
  path: null,
};

/** The security fixture's DOCTYPE, exactly as its source declares it. */
const SECURITY_DOCTYPE = [
  '<!DOCTYPE ONIXMessage SYSTEM "https://regression.invalid/onix-3.0.dtd" [',
  '  <!ENTITY sender SYSTEM "https://regression.invalid/sender-name.txt">',
  ']>',
].join('\n');

const REFERENCE_IDENTITY: OnixSourceProvenanceEntry = { kind: 'IDENTITY', flavour: 'reference' };

const RECOVERED_TEXT_CONTENT = '/ONIXMessage[1]/Product[1]/CollateralDetail[1]/TextContent[1]';
const SURVIVING_TEXT_CONTENT = '/ONIXMessage[1]/Product[1]/CollateralDetail[1]/TextContent[2]';

/**
 * The provenance of each fixture registered before thoth-app#248, whose expectation files predate the provenance
 * projection and so do not state it. Reference input keeps every name; only the empty-TextContent recovery moves an
 * element - the surviving TextContent, and everything in it - to a canonical path that is not its source path.
 */
const PRE_PROVENANCE_FIXTURES: readonly (readonly [OnixRegressionFixture, OnixSourceProvenanceEntry])[] = [
  [representative, REFERENCE_IDENTITY],
  [languageRole, REFERENCE_IDENTITY],
  [orcidNormalization, REFERENCE_IDENTITY],
  [
    recoverableEmptyTextContent,
    {
      kind: 'REPOSITIONED',
      flavour: 'reference',
      exceptions: ['', '/TextType[1]', '/ContentAudience[1]', '/Text[1]'].map((step) => ({
        path: `${RECOVERED_TEXT_CONTENT}${step}`,
        sourcePath: `${SURVIVING_TEXT_CONTENT}${step}`,
        sourceTag: step === '' ? 'TextContent' : step.slice(1, step.indexOf('[')),
      })),
    },
  ],
];

/** The fixtures registered before thoth-app#249, whose expectation files predate the target ledger and do not state it. */
const PRE_TARGET_FIXTURES: readonly OnixRegressionFixture[] = [
  representative,
  languageRole,
  orcidNormalization,
  recoverableEmptyTextContent,
  short30,
  short31,
  unsupportedOnix21,
  unsupportedFlavour,
  securityDoctype,
  ruleNotEvaluable,
  externalAuthority,
];

/** Every other registered fixture: each states the target ledger in every scenario. */
const TARGET_FIXTURES = ONIX_REGRESSION_FIXTURES.filter((fixture) => !PRE_TARGET_FIXTURES.includes(fixture));

/** The sections of the target ledger, in the order the ledger states them. */
const TARGET_SECTIONS = [
  'findings',
  'identity',
  'descriptive',
  'commercial',
  'priceResolutions',
  'rights',
  'accessibility',
  'components',
  'relatedMaterial',
  'collateral',
  'reviewsPrizes',
  'plan',
] as const satisfies readonly (keyof OnixTargetLedger)[];

/**
 * The lists of the target ledger no registered fixture fills, each with why. Any other list carries data somewhere in
 * the matrix, so a projection that dropped or emptied it fails a fixture.
 */
const OWN_ACTION = 'each is its own CREATE action of its Work’s unit, never on the Work (#187)';

const UNEXERCISED_TARGET_LISTS: Readonly<Record<string, string>> = {
  'plan.works[].additionalResources': OWN_ACTION,
  'plan.works[].bookReviews': OWN_ACTION,
  'plan.works[].endorsements': OWN_ACTION,
  'plan.works[].awards': OWN_ACTION,
  'reviewsPrizes.candidates[].prizes[].sequenceNumbers':
    'the one P.17 Prize is unnumbered, to prove its source-order normalisation (REL-01D rule 133)',
  'rights.products[].deferredRights': 'no fixture states a rights element for a part of a Product',
};

/** Every scenario of every fixture that states the target ledger. */
const TARGET_SCENARIOS = TARGET_FIXTURES.flatMap((fixture) =>
  fixture.scenarios.map((scenario) => ({ fixture, scenario })),
);

/**
 * A scenario's expectation read as the ledger it states. The registered fixtures prove that ledger is what the pipeline
 * produces (`regression.test.ts`); here it is the observation the comparison itself is proven exact against. A scenario
 * that states no execution layer or reconciliation (every one registered before thoth-app#250) is read with none.
 */
const statedLedger = ({
  target,
  blockers,
  findings,
  execution = { units: [] },
  reconciliation = { descriptive: [], references: [] },
  ...planning
}: OnixPlanningExpectation): OnixPlanningLedger => {
  if (target === undefined) throw new Error('the scenario states no target ledger');

  return {
    ...planning,
    blockers: withoutAttribution(blockers),
    findings: withoutAttribution(findings),
    target,
    execution,
    reconciliation,
  };
};

type Step = string | number;

/** The path of the first non-empty list anywhere in a value, depth first, or null. */
const firstList = (value: unknown, path: readonly Step[] = []): readonly Step[] | null => {
  if (Array.isArray(value)) {
    return value.length > 0 ? path : null;
  }
  if (value !== null && typeof value === 'object') {
    for (const [name, child] of Object.entries(value)) {
      const found = firstList(child, [...path, name]);

      if (found !== null) return found;
    }
  }

  return null;
};

/** The path of the first scalar anywhere in a value, depth first, or null. */
const firstScalar = (value: unknown, path: readonly Step[] = []): readonly Step[] | null => {
  if (value === null || typeof value !== 'object') return path;

  for (const [name, child] of Object.entries(value)) {
    const found = firstScalar(child, [...path, Array.isArray(value) ? Number(name) : name]);

    if (found !== null) return found;
  }

  return null;
};

/** A copy of a value with `edit` applied at `path`; nothing else changes. */
const editAt = (value: unknown, path: readonly Step[], edit: (stated: unknown) => unknown): unknown => {
  if (path.length === 0) return edit(value);

  const [step, ...rest] = path;

  if (Array.isArray(value)) return value.map((item, index) => (index === step ? editAt(item, rest, edit) : item));

  const record = value as Record<string, unknown>;

  return { ...record, [step]: editAt(record[step], rest, edit) };
};

const alter = (scalar: unknown): unknown => {
  if (typeof scalar === 'string') return `${scalar}~`;
  if (typeof scalar === 'number') return scalar + 1;
  if (typeof scalar === 'boolean') return !scalar;

  return 'altered';
};

/** A section with one entry missing, one extra and one value altered, wherever it has an entry or a value to change. */
const sectionMutants = (section: unknown): (readonly ['missing' | 'extra' | 'altered', unknown])[] => {
  const list = firstList(section);
  const scalar = firstScalar(section);

  return [
    ...(list === null
      ? []
      : ([
          ['missing', editAt(section, list, (items) => (items as unknown[]).slice(1))],
          ['extra', editAt(section, list, (items) => [...(items as unknown[]), (items as unknown[])[0]])],
        ] as const)),
    ...(scalar === null ? [] : ([['altered', editAt(section, scalar, alter)]] as const)),
  ];
};

/** Whether each list of a value, by its path with list positions dropped, holds an entry anywhere. */
const listsOf = (value: unknown, path: string, lists: Map<string, boolean>): Map<string, boolean> => {
  if (Array.isArray(value)) {
    lists.set(path, (lists.get(path) ?? false) || value.length > 0);
    value.forEach((item) => listsOf(item, `${path}[]`, lists));
  } else if (value !== null && typeof value === 'object') {
    Object.entries(value).forEach(([name, child]) => listsOf(child, path === '' ? name : `${path}.${name}`, lists));
  }

  return lists;
};

/** Every string anywhere in a value. */
const stringsOf = (value: unknown): string[] => {
  if (typeof value === 'string') return [value];
  if (value !== null && typeof value === 'object') return Object.values(value).flatMap(stringsOf);

  return [];
};

const UUIDS = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** Each registered Short fixture and the registered Reference fixture it is the Short-tag twin of. */
const SHORT_TWINS: readonly (readonly [OnixRegressionFixture, OnixRegressionFixture])[] = [
  [short30, recoverableEmptyTextContent],
  [short31, representative],
];

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

    it('accepts every source-boundary fixture as declared', () => {
      for (const fixture of [
        short30,
        short31,
        unsupportedOnix21,
        unsupportedFlavour,
        securityDoctype,
        ruleNotEvaluable,
        externalAuthority,
      ]) {
        expect(rulesOf(fixture, onixFixtureSource(fixture)), fixture.id).toStrictEqual([]);
      }
    });

    it('requires a stop exactly where a processing stop is stated, and never on a permitting gate', () => {
      expect(rulesOf(withGate(securityDoctype, { stop: undefined }))).toStrictEqual(['STOP_UNDECLARED']);
      expect(rulesOf(withGate(unsupportedOnix21, { stop: undefined }))).toStrictEqual(['STOP_UNDECLARED']);
      expect(rulesOf(withGate(representative, { stop: { stage: 2, kind: 'dtd' } }))).toStrictEqual([
        'PERMITTED_WITH_STOP',
      ]);
    });

    it('requires a Short source to state its provenance, and a stopped gate to state none', () => {
      expect(rulesOf(withGate(short31, { provenance: undefined }))).toStrictEqual(['SHORT_WITHOUT_PROVENANCE']);
      expect(rulesOf(withGate(securityDoctype, { provenance: REFERENCE_IDENTITY }))).toStrictEqual([
        'STOPPED_WITH_PROVENANCE',
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

  describe('source-boundary assertions', () => {
    let shortLedger: OnixSourceGateLedger;
    let stoppedLedger: OnixSourceGateLedger;
    let unsupportedLedger: OnixSourceGateLedger;
    let recoveredLedger: OnixSourceGateLedger;
    let representativeLedger: OnixSourceGateLedger;

    beforeAll(async () => {
      shortLedger = await gateLedgerOf(onixFixtureSource(short30));
      stoppedLedger = await gateLedgerOf(onixFixtureSource(securityDoctype));
      unsupportedLedger = await gateLedgerOf(onixFixtureSource(unsupportedOnix21));
      recoveredLedger = await gateLedgerOf(onixFixtureSource(recoverableEmptyTextContent));
      representativeLedger = await gateLedgerOf(onixFixtureSource(representative));
    });

    it('fail on a missing, an extra or a different stop', () => {
      expect(() => expectSourceGate(stoppedLedger, securityDoctype.gate)).not.toThrow();
      expect(() => expectSourceGate(stoppedLedger, { ...securityDoctype.gate, stop: undefined })).toThrow();
      expect(() =>
        expectSourceGate(stoppedLedger, { ...securityDoctype.gate, stop: { stage: 2, kind: 'bound' } }),
      ).toThrow();
      expect(() =>
        expectSourceGate(stoppedLedger, { ...securityDoctype.gate, stop: { stage: 1, kind: 'dtd' } }),
      ).toThrow();
      expect(() =>
        expectSourceGate(representativeLedger, { ...representative.gate, stop: { stage: 2, kind: 'dtd' } }),
      ).toThrow();
    });

    it('fail on a provenance that differs in any part', () => {
      const provenance = short30.gate.provenance;
      if (provenance?.kind !== 'RENAMED') throw new Error('the 3.0 Short twin no longer states a RENAMED provenance');
      const { Text: _text, ...withoutText } = provenance.referenceToSource;
      const different: OnixSourceProvenanceEntry[] = [
        { ...provenance, exceptions: provenance.exceptions.slice(1) },
        {
          ...provenance,
          exceptions: [
            ...provenance.exceptions,
            { path: '/ONIXMessage[1]', sourcePath: '/ONIXmessage[1]', sourceTag: 'ONIXmessage' },
          ],
        },
        { ...provenance, referenceToSource: { ...provenance.referenceToSource, Text: 'd105' } },
        { ...provenance, referenceToSource: withoutText },
        { ...provenance, renamedElementCount: provenance.renamedElementCount - 1 },
        REFERENCE_IDENTITY,
      ];

      expect(() => expectSourceGate(shortLedger, short30.gate)).not.toThrow();
      for (const variant of different) {
        expect(() => expectSourceGate(shortLedger, { ...short30.gate, provenance: variant })).toThrow();
      }
      expect(() => expectSourceGate(shortLedger, { ...short30.gate, provenance: null })).toThrow();
      expect(() =>
        expectSourceGate(stoppedLedger, { ...securityDoctype.gate, provenance: REFERENCE_IDENTITY }),
      ).toThrow();
    });

    it('fail on a missing, an extra or a different source path', () => {
      const [recovered] = short30.gate.findings;
      const { sourcePath: _sourcePath, ...withoutSourcePath } = recovered;
      const [referenceFinding] = recoverableEmptyTextContent.gate.findings;

      expect(() => expectSourceGate(shortLedger, { ...short30.gate, findings: [withoutSourcePath] })).toThrow();
      expect(() =>
        expectSourceGate(shortLedger, {
          ...short30.gate,
          findings: [{ ...recovered, sourcePath: '/ONIXmessage[1]/product[1]/collateraldetail[1]/textcontent[2]' }],
        }),
      ).toThrow();
      expect(() => expectSourceGate(recoveredLedger, recoverableEmptyTextContent.gate)).not.toThrow();
      expect(() =>
        expectSourceGate(recoveredLedger, {
          ...recoverableEmptyTextContent.gate,
          findings: [{ ...referenceFinding, sourcePath: RECOVERED_TEXT_CONTENT }],
        }),
      ).toThrow();
    });

    it('fail on stop evidence that is missing or differs', () => {
      const [unsupported] = unsupportedOnix21.gate.findings;
      const { detail, ...withoutDetail } = unsupported;

      expect(() => expectSourceGate(unsupportedLedger, unsupportedOnix21.gate)).not.toThrow();
      expect(() =>
        expectSourceGate(unsupportedLedger, { ...unsupportedOnix21.gate, findings: [withoutDetail] }),
      ).toThrow();
      for (const changed of [{ release: '3.0' }, { reason: 'NOT_ONIX_FOR_BOOKS' }, { rootName: 'ONIXmessage' }]) {
        expect(() =>
          expectSourceGate(unsupportedLedger, {
            ...unsupportedOnix21.gate,
            findings: [{ ...unsupported, detail: { ...detail, ...changed } }],
          }),
        ).toThrow();
      }
    });

    it('bind to semantic fields only: no source-boundary ledger carries a message or a stop text', () => {
      const names = propertyNames([shortLedger, stoppedLedger, unsupportedLedger, recoveredLedger]);

      expect(names.has('message')).toBe(false);
      expect(names.has('text')).toBe(false);
    });
  });

  describe.each(SHORT_TWINS.map(([short, reference]) => [short.id, reference.id, short, reference] as const))(
    'Short-to-Reference equivalence: %s is the Short twin of %s',
    (_shortId, _referenceId, shortFixture, referenceFixture) => {
      let short: OnixGateRun;
      let reference: OnixGateRun;

      beforeAll(async () => {
        short = await runOnixSourceGate(onixFixtureSource(shortFixture));
        reference = await runOnixSourceGate(onixFixtureSource(referenceFixture));
      });

      it('is the same release in the other flavour', () => {
        expect([short.result.source?.release, short.result.source?.flavour]).toStrictEqual([
          reference.result.source?.release,
          'short',
        ]);
        expect(reference.result.source?.flavour).toBe('reference');
      });

      it('hands on the canonical Reference message of its twin, byte for byte', () => {
        expect(normalizedMessage(short)).toBe(normalizedMessage(reference));
      });

      it('finds and recovers exactly what its twin does, adding only where the Short source has each finding', () => {
        const shortLedger = sourceGateLedger(short);
        const referenceLedger = sourceGateLedger(reference);

        expect(shortLedger.verdict).toBe(referenceLedger.verdict);
        expect(shortLedger.findings.map(({ sourcePath: _sourcePath, ...entry }) => entry)).toStrictEqual(
          referenceLedger.findings,
        );
        expect(shortLedger.findings.filter(({ sourcePath }) => sourcePath === undefined)).toStrictEqual([]);
        expect(shortLedger.recoveries).toStrictEqual(referenceLedger.recoveries);
      });

      it('declares exactly the normalised values and the plans of its twin', () => {
        expect(shortFixture.normalized).toBe(referenceFixture.normalized);
        expect(shortFixture.scenarios).toBe(referenceFixture.scenarios);
      });
    },
  );

  describe('namespace prefixes are lexical', () => {
    /** A registered source with its message namespace bound to the `onix` prefix instead of the default namespace. */
    const withOnixPrefix = (fixture: OnixRegressionFixture): Uint8Array => {
      const text = decode(onixFixtureSource(fixture));
      const prefixed = text
        .replace(/<(\/?)([A-Za-z][A-Za-z0-9]*)(?=[\s/>])/g, '<$1onix:$2')
        .replace(/ xmlns="([^"]+)"/, ' xmlns:onix="$1"');
      if (!/ xmlns:onix="/.test(prefixed)) throw new Error(`${fixture.id} no longer declares a default namespace`);

      return encode(prefixed);
    };

    it('gates a prefixed Short source, its recovery and provenance included, exactly as the unprefixed one', async () => {
      const run = await runOnixSourceGate(withOnixPrefix(short30));

      expectSourceGate(sourceGateLedger(run), short30.gate);
      expectNormalized(run, short30.normalized ?? {});
    });

    it('gates and plans a prefixed Reference source exactly as the unprefixed one', async () => {
      const run = await runOnixRegressionFixture(representative, withOnixPrefix(representative));

      expectSourceGate(run.gateLedger, { ...representative.gate, provenance: REFERENCE_IDENTITY });
      expectNormalized(run.gate, representative.normalized ?? {});
      expect(run.scenarios.map(({ scenario }) => scenario)).toStrictEqual(representative.scenarios);
      run.scenarios.forEach(({ scenario, planning, outcomes }) => {
        expectPlanning(planning, scenario.planning);
        expectOutcomes(outcomes, scenario.outcomes);
      });
    });
  });

  describe('provenance of the fixtures registered before thoth-app#248', () => {
    it.each(PRE_PROVENANCE_FIXTURES.map(([fixture, provenance]) => [fixture.id, fixture, provenance] as const))(
      'pins it for %s, whose expectation does not state it',
      async (_id, fixture, provenance) => {
        expect(fixture.gate.provenance).toBeUndefined();
        expectSourceGate(await gateLedgerOf(onixFixtureSource(fixture)), { ...fixture.gate, provenance });
      },
    );

    it('is stated by every other registered fixture', () => {
      const pinned = new Set(PRE_PROVENANCE_FIXTURES.map(([fixture]) => fixture.id));

      expect(
        ONIX_REGRESSION_FIXTURES.filter(({ id, gate }) => !pinned.has(id) && gate.provenance === undefined).map(
          ({ id }) => id,
        ),
      ).toStrictEqual([]);
    });
  });

  describe('the target ledger (thoth-app#249)', () => {
    it('is stated by no fixture registered before it', () => {
      expect(
        PRE_TARGET_FIXTURES.flatMap(({ id, scenarios }) =>
          scenarios.filter(({ planning }) => planning.target !== undefined).map(({ name }) => `${id}: ${name}`),
        ),
      ).toStrictEqual([]);
    });

    it('is compared only where a scenario states it, so a fixture registered before it is unaffected', () => {
      const [{ scenario }] = TARGET_SCENARIOS;
      const ledger = statedLedger(scenario.planning);

      expect(() => expectPlanning(ledger, { ...scenario.planning, target: undefined })).not.toThrow();
    });

    it.each(TARGET_FIXTURES.map(({ id }) => id))('is stated, every section of it, in every scenario of %s', (id) => {
      const fixture = TARGET_FIXTURES.find((registered) => registered.id === id) as OnixRegressionFixture;

      expect(fixture.scenarios.length).toBeGreaterThan(0);
      fixture.scenarios.forEach(({ planning }) => {
        expect(Object.keys(planning.target ?? {})).toStrictEqual([...TARGET_SECTIONS]);
      });
    });

    it.each(TARGET_SECTIONS)('fails on a missing, an extra or an altered entry of its %s', (section) => {
      const kinds = new Set<string>();

      TARGET_SCENARIOS.forEach(({ scenario }) => {
        const ledger = statedLedger(scenario.planning);

        expect(() => expectPlanning(ledger, scenario.planning)).not.toThrow();
        sectionMutants(ledger.target[section]).forEach(([kind, mutant]) => {
          kinds.add(kind);
          expect(() =>
            expectPlanning(ledger, {
              ...scenario.planning,
              target: { ...ledger.target, [section]: mutant } as OnixTargetLedger,
            }),
          ).toThrow();
        });
      });

      // Somewhere in the matrix the section has an entry to drop or repeat, and a value to change.
      expect([...kinds].sort()).toStrictEqual(['altered', 'extra', 'missing']);
    });

    it('fills every list it projects somewhere in the matrix, except those named with why they stay empty', () => {
      const lists = new Map<string, boolean>();

      TARGET_SCENARIOS.forEach(({ scenario }) => listsOf(scenario.planning.target, '', lists));

      expect(
        [...lists]
          .filter(([, filled]) => !filled)
          .map(([path]) => path)
          .sort(),
      ).toStrictEqual(Object.keys(UNEXERCISED_TARGET_LISTS).sort());
    });

    it('binds to semantic fields only: no message, label, prose loss or identifier the run generated', () => {
      TARGET_SCENARIOS.forEach(({ fixture, scenario }) => {
        const { target, execution, reconciliation } = statedLedger(scenario.planning);
        // The imprints, and every id of what the scenario's Thoth holds (thoth-app#250): an existing Work, its
        // Publications, a contributor or an institution its stated reads return.
        const declared = new Set([
          ...fixture.imprints.map(({ value }) => value),
          ...stringsOf(scenario.target).flatMap((value) => value.match(UUIDS) ?? []),
        ]);
        const names = propertyNames({ target, execution, reconciliation });

        expect(['message', 'label', 'losses'].filter((name) => names.has(name))).toStrictEqual([]);
        // Planned Work and chapter ids are minted per run; the only UUIDs a ledger may carry are declared ones.
        expect(
          stringsOf({ target, execution, reconciliation })
            .flatMap((value) => value.match(UUIDS) ?? [])
            .filter((uuid) => !declared.has(uuid)),
        ).toStrictEqual([]);
      });
    });

    it('keeps the contained-Work descriptive route of thoth-app#253 stated in target-components-hierarchy', () => {
      const fixture = TARGET_FIXTURES.find(({ id }) => id === 'target-components-hierarchy') as OnixRegressionFixture;
      const contained = ({ planning }: OnixRegressionScenario) =>
        (planning.target?.components ?? []).find((entry) => entry.kind === 'CONTAINED_WORK');
      const pendingOf = (scenario: OnixRegressionScenario) => {
        const entry = contained(scenario);

        return entry?.kind === 'CONTAINED_WORK' ? (entry.descriptive?.pendingFindingKeys ?? []) : [];
      };
      // The contained Work's own descriptive questions: raised by the descriptive family, never by the component one.
      const questions = [...new Set(fixture.scenarios.flatMap(pendingOf))];

      expect(questions.length).toBeGreaterThan(0);
      questions.forEach((key) => expect(key.startsWith('COMPONENT|')).toBe(false));

      fixture.scenarios.forEach((scenario) => {
        const { planning, inputs = {} } = scenario;
        const componentKeys = Object.keys(inputs.componentChoices ?? {});
        const descriptiveKeys = Object.keys(inputs.descriptiveChoices ?? {});
        const answered = questions.every((key) => descriptiveKeys.includes(key));
        const misrouted = questions.some((key) => componentKeys.includes(key));

        // Answered in the descriptive map, the Work is planned with its own subjects and no question pending...
        expect(pendingOf(scenario)).toStrictEqual(answered ? [] : questions);
        expect(contained(scenario)?.action).toBe(answered ? 'CREATE_CONTAINED_WORK' : 'BLOCKED');
        expect(planning.target?.plan.containedWorks.map(({ subjects }) => subjects.length > 0)).toStrictEqual(
          answered ? [true] : [],
        );
        // ...and the one answer, routed or misrouted, never reads as a component answer: misrouted it is stale.
        expect(planning.blockers.map(({ code }) => code).includes('COMPONENT_CHOICE_STALE')).toBe(misrouted);
      });
      // The matrix states both states, and the misrouted one.
      expect(fixture.scenarios.filter((scenario) => pendingOf(scenario).length === 0).length).toBeGreaterThan(0);
      expect(fixture.scenarios.filter((scenario) => pendingOf(scenario).length > 0).length).toBeGreaterThan(0);
      expect(
        fixture.scenarios.filter(({ inputs = {} }) =>
          questions.some((key) => Object.keys(inputs.componentChoices ?? {}).includes(key)),
        ).length,
      ).toBe(1);
    });
  });

  describe('existing targets, the execution layer and the reconciliation (thoth-app#250)', () => {
    const EXISTING_FIXTURES: readonly OnixRegressionFixture[] = [existingNoop, existingEnrichment, existingConflict];
    const EXISTING_SCENARIOS = EXISTING_FIXTURES.flatMap((fixture) =>
      fixture.scenarios.map((scenario) => ({ fixture, scenario })),
    );
    const NOOP_THOTH = existingNoop.scenarios[0].target as OnixExistingTargetState;
    const readOf = <M extends OnixExistingTargetState['reads'][number]['method']>(method: M) =>
      NOOP_THOTH.reads.find((read) => read.method === method) as Extract<
        OnixExistingTargetState['reads'][number],
        { method: M }
      >;
    const IDENTIFIERS = [...readOf('findWorks').identifiers];
    const WORK_ID = readOf('getWork').workId;

    it('keeps the empty publisher as the Thoth of every fixture registered before it, stating no new ledger', () => {
      const earlier = ONIX_REGRESSION_FIXTURES.filter((fixture) => !EXISTING_FIXTURES.includes(fixture));

      expect(earlier.length).toBeGreaterThan(0);
      expect(
        earlier.flatMap(({ id, scenarios }) =>
          scenarios
            .filter(
              ({ target, planning }) =>
                target !== 'EMPTY_PUBLISHER' ||
                planning.execution !== undefined ||
                planning.reconciliation !== undefined,
            )
            .map(({ name }) => `${id}: ${name}`),
        ),
      ).toStrictEqual([]);
    });

    it('lets the empty publisher find nothing and read nothing', async () => {
      const empty = regressionEnvironment('EMPTY_PUBLISHER');

      await expect(empty.targetLookup.findWorks(IDENTIFIERS)).resolves.toStrictEqual(new Map());
      await expect(empty.targetLookup.getWork(WORK_ID)).rejects.toThrow();
      await expect(empty.relatedLookup.getWorkRelations(WORK_ID)).rejects.toThrow();
      expect(empty.made).toStrictEqual([]);
      expect(() => empty.settle()).not.toThrow();
    });

    it.each(EXISTING_FIXTURES.map(({ id }) => id))(
      'states its Thoth, the execution layer and the reconciliation in every scenario of %s',
      (id) => {
        const fixture = EXISTING_FIXTURES.find((registered) => registered.id === id) as OnixRegressionFixture;

        expect(fixture.scenarios.length).toBeGreaterThan(0);
        fixture.scenarios.forEach(({ target, planning }) => {
          expect(target).not.toBe('EMPTY_PUBLISHER');
          expect(planning.target).toBeDefined();
          expect(planning.execution).toBeDefined();
          expect(planning.reconciliation).toBeDefined();
        });
      },
    );

    it('compares the execution layer and the reconciliation only where a scenario states them', () => {
      const { scenario } = EXISTING_SCENARIOS[0];
      const ledger = statedLedger(scenario.planning);
      const unstated = { ...scenario.planning, execution: undefined, reconciliation: undefined };

      expect(() => expectPlanning({ ...ledger, execution: { units: [] } }, unstated)).not.toThrow();
      expect(() => expectPlanning({ ...ledger, execution: { units: [] } }, scenario.planning)).toThrow();
    });

    it.each(['execution', 'reconciliation'] as const)(
      'fails on a missing, an extra or an altered entry of its %s',
      (section) => {
        const kinds = new Set<string>();

        EXISTING_SCENARIOS.forEach(({ scenario }) => {
          const ledger = statedLedger(scenario.planning);

          expect(() => expectPlanning(ledger, scenario.planning)).not.toThrow();
          sectionMutants(ledger[section]).forEach(([kind, mutant]) => {
            kinds.add(kind);
            expect(() => expectPlanning(ledger, { ...scenario.planning, [section]: mutant })).toThrow();
          });
        });

        expect([...kinds].sort()).toStrictEqual(['altered', 'extra', 'missing']);
      },
    );

    describe('the existing-target Thoth answers exactly what a scenario states, and nothing else', () => {
      it('answers a stated read once, with copies of the current-domain objects it states', async () => {
        const thoth = regressionEnvironment(NOOP_THOTH);
        const matches = await thoth.targetLookup.findWorks(IDENTIFIERS);
        const work = await thoth.targetLookup.getWork(WORK_ID);

        expect([...matches.keys()]).toStrictEqual(Object.keys(readOf('findWorks').matches));
        expect(work).toStrictEqual(readOf('getWork').work);
        expect(work).not.toBe(readOf('getWork').work);
        // A planner that changed what it was given could never change what the scenario states.
        work.titles.length = 0;
        expect(readOf('getWork').work.titles.length).toBe(1);
        expect(thoth.made.map(({ method }) => method)).toStrictEqual(['findWorks', 'getWork']);
        expect(() => thoth.settle()).not.toThrow();
        // Once each: the same request again is not a read the scenario states.
        await expect(thoth.targetLookup.getWork(WORK_ID)).rejects.toThrow('unexpected lookup');
      });

      it('scopes every exact lookup to the active publisher', async () => {
        const elsewhere = regressionEnvironment(NOOP_THOTH, '00000000-0000-4000-8000-000000000999');

        await expect(elsewhere.targetLookup.findWorks(IDENTIFIERS)).rejects.toThrow('unexpected lookup');
        expect(readOf('findWorks').publisherId).toBe(ONIX_REGRESSION_PUBLISHER_ID);
      });

      it('refuses other identifiers, another Work, and every lookup the scenario never states', async () => {
        const thoth = regressionEnvironment(NOOP_THOTH);

        await expect(thoth.targetLookup.findWorks(IDENTIFIERS.slice(1))).rejects.toThrow('unexpected lookup');
        await expect(thoth.targetLookup.findWorks([...IDENTIFIERS].reverse())).rejects.toThrow('unexpected lookup');
        await expect(thoth.targetLookup.getWork('00000000-0000-4000-8000-000000000999')).rejects.toThrow();
        await expect(thoth.relatedLookup.findWorksGlobally(IDENTIFIERS)).rejects.toThrow('unexpected lookup');
        await expect(thoth.relatedLookup.getWorkRelations(WORK_ID)).rejects.toThrow('unexpected lookup');
        await expect(thoth.relatedLookup.getWorkReferences(WORK_ID)).rejects.toThrow('unexpected lookup');
        await expect(thoth.contributorService.getContributors('Lovelace')).rejects.toThrow('unexpected lookup');
        await expect(thoth.contributorService.getContributorsByOrcids(['0000-0002-1825-0097'])).rejects.toThrow();
        await expect(thoth.institutionService.getInstitutions(0, 1, 'Regression')).rejects.toThrow('unexpected lookup');
        expect(thoth.made).toStrictEqual([]);
      });

      it('fails the run on a refused lookup even when the planner caught it, and on a stated read never made', async () => {
        const refusedButCaught = regressionEnvironment(NOOP_THOTH);
        await refusedButCaught.targetLookup.findWorks(IDENTIFIERS);
        await refusedButCaught.targetLookup.getWork(WORK_ID);
        await refusedButCaught.contributorService.getContributors('Lovelace').catch(() => undefined);

        expect(() => refusedButCaught.settle()).toThrow('does not state');

        const unread = regressionEnvironment(NOOP_THOTH);
        await unread.targetLookup.findWorks(IDENTIFIERS);

        expect(() => unread.settle()).toThrow('never made: getWork');
      });
    });

    describe('on real runs', () => {
      let noopRun: OnixRegressionRun;
      let asNewRun: OnixRegressionRun;
      let unmatchedRun: OnixRegressionRun;

      beforeAll(async () => {
        const source = onixFixtureSource(existingNoop);
        // The same bytes against a Thoth that holds nothing, and against one whose exact lookup matches nothing.
        const unmatched: OnixExistingTargetState = {
          kind: 'EXISTING_TARGET',
          reads: [
            {
              ...readOf('findWorks'),
              matches: Object.fromEntries(Object.keys(readOf('findWorks').matches).map((key) => [key, []])),
            },
          ],
        };

        noopRun = await runRegisteredOnixFixture(existingNoop);
        asNewRun = await runOnixRegressionFixture(
          {
            ...existingNoop,
            scenarios: existingNoop.scenarios.map((scenario) => ({ ...scenario, target: 'EMPTY_PUBLISHER' })),
          },
          source,
        );
        unmatchedRun = await runOnixRegressionFixture(
          {
            ...existingNoop,
            scenarios: existingNoop.scenarios.map((scenario) => ({ ...scenario, target: unmatched })),
          },
          source,
        );
      });

      it('never plans an existing target as new: without its exact match the same file is a new Work, and fails', () => {
        [asNewRun, unmatchedRun].forEach((run) => {
          run.scenarios.forEach(({ scenario, planning }) => {
            expect(planning?.workGroups.map(({ target }) => target)).toStrictEqual(['NEW_WORK']);
            // Read as new, every unit would begin by creating a second copy of the Work Thoth already holds.
            (planning?.execution.units ?? []).forEach(({ actions }) => expect(actions[0]?.kind).toBe('CREATE_WORK'));
            expect(() => expectPlanning(planning, scenario.planning)).toThrow();
          });
          // Once the publisher answers the WorkType a new Work needs, that duplicate is executable.
          expect(run.scenarios.some(({ planning }) => (planning?.execution.units.length ?? 0) > 0)).toBe(true);
        });
        noopRun.scenarios.forEach(({ scenario, planning }) => {
          expect(planning?.workGroups.map(({ target }) => target)).toStrictEqual(['EXISTING_WORK']);
          expect(() => expectPlanning(planning, scenario.planning)).not.toThrow();
        });
      });

      it('gives a NOOP unit no action, and fails the NOOP expectation if it held one', () => {
        noopRun.scenarios.forEach(({ scenario, planning }) => {
          const [unit] = planning?.execution.units ?? [];
          const acting = {
            units: [
              {
                ...unit,
                actions: [
                  {
                    kind: 'CREATE_PUBLICATION' as const,
                    actionKey: `${unit.unitKey}|PUBLICATION|${planning?.products[0].productKey}`,
                    work: unit.target,
                    productKey: planning?.products[0].productKey ?? '',
                    publication: { source: 'WORK' as const, index: 0 },
                  },
                ],
              },
            ],
          };

          expect(planning?.execution.units.map(({ actions }) => actions)).toStrictEqual([[]]);
          expect(planning?.products.map(({ action }) => action)).toStrictEqual(['ALREADY_PRESENT']);
          expect(() => expectPlanning(planning, { ...scenario.planning, execution: acting })).toThrow();
        });
      });

      it('never writes an existing Work beyond attaching a Publication the plan holds whole', () => {
        const units = EXISTING_SCENARIOS.flatMap(({ scenario }) => scenario.planning.execution?.units ?? []);
        const existingUnits = units.filter(({ target }) => target.kind === 'EXISTING_WORK');

        expect(existingUnits.length).toBeGreaterThan(0);
        existingUnits.forEach(({ target, actions }) =>
          actions.forEach((action) => {
            expect(action.kind).toBe('CREATE_PUBLICATION');
            if (action.kind !== 'CREATE_PUBLICATION') return;
            expect(action.work).toStrictEqual(target);
            expect(action.publication.source).toBe('ATTACHMENT');
          }),
        );
        // At least one existing Work is enriched in the matrix, and at least one existing unit has nothing to do.
        expect(existingUnits.some(({ actions }) => actions.length > 0)).toBe(true);
        expect(existingUnits.some(({ actions }) => actions.length === 0)).toBe(true);
      });

      it('attaches only where every compared family holds, and plans no unit where one is contradicted', () => {
        EXISTING_SCENARIOS.forEach(({ scenario: { planning } }) => {
          const outcomes = new Set((planning.reconciliation?.descriptive ?? []).map(({ outcome }) => outcome));
          const attaching = (planning.execution?.units ?? []).some(({ actions }) =>
            actions.some(
              (action) => action.kind === 'CREATE_PUBLICATION' && action.publication.source === 'ATTACHMENT',
            ),
          );

          if (attaching) expect([...outcomes]).toStrictEqual(['COMPATIBLE']);
          if (outcomes.has('CONTRADICTED')) {
            expect(planning.executable).toBe(false);
            expect(planning.execution?.units).toStrictEqual([]);
          }
        });
      });

      it('holds every conflict before execution, with source conflicts no answer clears', () => {
        existingConflict.scenarios.forEach(({ planning }) => {
          expect(planning.executable).toBe(false);
          expect(planning.execution?.units).toStrictEqual([]);
          expect(planning.blockers.length).toBeGreaterThan(0);
          expect(new Set(planning.blockers.map(({ classification }) => classification))).toStrictEqual(
            new Set(['SOURCE_CONFLICT']),
          );
          expect(planning.blockers.map(({ code }) => code)).toContain('EXISTING_PUBLICATION_TYPE_CONTRADICTION');
        });
        // Answers change which contradictions stand, never whether one does.
        expect(existingConflict.scenarios.map(({ inputs }) => inputs !== undefined)).toStrictEqual([false, true, true]);
      });

      it('plans nothing of the file while any Work needs an input, the ready existing Work included', () => {
        const [asUploaded, answered] = existingEnrichment.scenarios;
        const ready = (planning: OnixPlanningExpectation) =>
          planning.workGroups.filter(({ executable }) => executable).map(({ target }) => target);

        expect(asUploaded.planning.blockers.map(({ classification }) => classification)).toStrictEqual([
          'TARGET_INPUT_REQUIRED',
        ]);
        expect(ready(asUploaded.planning)).toStrictEqual(['EXISTING_WORK']);
        expect(asUploaded.planning.executable).toBe(false);
        expect(asUploaded.planning.execution?.units).toStrictEqual([]);
        expect(answered.planning.executable).toBe(true);
        expect(ready(answered.planning)).toStrictEqual(['EXISTING_WORK', 'NEW_WORK']);
      });
    });
  });

  describe('SECURITY and SUPPORT stops', () => {
    const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>\n';
    /** The representative source with a comment of `length` characters right after its XML declaration. */
    const withLongComment = (length: number) =>
      derive(representative, [[XML_DECLARATION, `${XML_DECLARATION}<!--${'x'.repeat(length)}-->\n`]]);
    const beyondBound = withLongComment(PROLOG_SCAN_BOUND);
    const withinBound = withLongComment(PROLOG_SCAN_BOUND - 4_096);
    const doctype31 = derive(securityDoctype, [
      [
        'release="3.0" xmlns="http://ns.editeur.org/onix/3.0/reference"',
        'release="3.1" xmlns="http://ns.editeur.org/onix/3.1/reference"',
      ],
    ]);
    const withoutDoctype = derive(securityDoctype, [
      [`${SECURITY_DOCTYPE}\n`, ''],
      ['&sender;', 'Regression Press'],
    ]);

    it('generates a prolog comment that starts inside the 1 MiB scan bound and ends beyond it, or wholly inside it', () => {
      const beyond = decode(beyondBound);
      const within = decode(withinBound);

      expect(beyondBound.byteLength).toBeGreaterThan(PROLOG_SCAN_BOUND);
      expect(beyond.indexOf('<!--')).toBeLessThan(PROLOG_SCAN_BOUND);
      expect(beyond.indexOf('-->')).toBeGreaterThan(PROLOG_SCAN_BOUND);
      expect(within.indexOf('>', within.indexOf('<ONIXMessage'))).toBeLessThan(PROLOG_SCAN_BOUND);
    });

    it('refuses a prolog beyond the scan bound as SECURITY before resolving anything, and only for the bound', async () => {
      const run = await runOnixSourceGate(beyondBound);

      expectSourceGate(sourceGateLedger(run), {
        verdict: 'SOURCE_REFUSED_SECURITY',
        // The scan stopped before it reached the root, so nothing was resolved.
        release: null,
        flavour: null,
        stop: { stage: 2, kind: 'bound' },
        findings: [PROLOG_BOUND_FINDING],
        recoveries: [],
        provenance: null,
      });
      expect(run.bridged).toBeNull();
      expect(outcomeLedger(sourceGateLedger(run), null)).toStrictEqual([]);
      // Control: the same comment ending inside the bound leaves the representative source exactly as it gates.
      expectSourceGate(await gateLedgerOf(withinBound), { ...representative.gate, provenance: REFERENCE_IDENTITY });
    });

    it('adds the 3.1.3 rule against a DOCTYPE to the SECURITY refusal of a 3.1 source', async () => {
      const ledger = await gateLedgerOf(doctype31);

      expectSourceGate(ledger, {
        verdict: 'SOURCE_INVALID',
        release: '3.1',
        flavour: 'reference',
        stop: { stage: 2, kind: 'dtd' },
        findings: [SECURITY_DTD_FINDING, NO_DOCTYPE_31_FINDING],
        recoveries: [],
        provenance: null,
      });
      expectOutcomes(outcomeLedger(ledger, null), { SOURCE_INVALID: 1 });
    });

    it('refuses the security fixture only for its DOCTYPE: without it the message is permitted with no finding', async () => {
      expectSourceGate(await gateLedgerOf(withoutDoctype), {
        verdict: 'PERMITTED',
        release: '3.0',
        flavour: 'reference',
        findings: [],
        recoveries: [],
        provenance: REFERENCE_IDENTITY,
      });
    });

    it('stops every SUPPORT and SECURITY source before any validation resource is requested', async () => {
      const requested: string[] = [];
      const noResources = createOnixSourceValidator({
        loadResource: async (fileName) => {
          requested.push(fileName);
          throw new Error(`no validation resource may be requested before a stop: ${fileName}`);
        },
        execution: createExecutionControls({
          accelerate: true,
          onStage: () => undefined,
          onProgress: () => undefined,
          shouldCancel: () => false,
          yield: () => Promise.resolve(),
        }),
      });
      const stopped = [
        onixFixtureSource(unsupportedOnix21),
        onixFixtureSource(unsupportedFlavour),
        onixFixtureSource(securityDoctype),
        doctype31,
        beyondBound,
      ];

      for (const bytes of stopped) {
        const result = toWorkerResult(await noResources.validate(bytes));

        expect(result.status).toBe('STOPPED');
        expect(result).toStrictEqual((await runOnixSourceGate(bytes)).result);
      }
      expect(requested).toStrictEqual([]);
    });
  });

  describe('RULE_NOT_EVALUABLE and the external-authority boundary', () => {
    const [notEvaluable1, notEvaluable2] = ruleNotEvaluable.gate.findings;
    const [externalLayout, wrongConstant] = externalAuthority.gate.findings;
    const kernelFinding = (id: string, path: string): OnixSourceFindingEntry => ({
      id,
      tier: 'INVENTORY',
      scope: 'VALIDITY',
      class: 'NORMATIVE_INVALID',
      blocking: true,
      projection: 'AUTHORITATIVE',
      recoverability: 'NOT_RECOVERABLE',
      counts: true,
      path,
    });

    it('never lets an unevaluable rule decide: with every EIDR Party ID conforming, the source is permitted', async () => {
      const conforming = derive(ruleNotEvaluable, [['10.5237/1A2B-3C4D5', '10.5237/5E6F-7A8B']]);

      expectSourceGate(await gateLedgerOf(conforming), {
        ...ruleNotEvaluable.gate,
        verdict: 'PERMITTED',
        findings: [notEvaluable1, notEvaluable2],
      });
    });

    it('adopts the EIDR Content-ID check-character alphabet and nothing beyond it', async () => {
      const outsideAlphabet = derive(externalAuthority, [
        ['10.5240/1A2B-3C4D-5E6F-7A8B-9C0D-K', '10.5240/1A2B-3C4D-5E6F-7A8B-9C0D-*'],
      ]);

      expectSourceGate(await gateLedgerOf(outsideAlphabet), {
        ...externalAuthority.gate,
        verdict: 'SOURCE_INVALID',
        findings: [externalLayout, wrongConstant, kernelFinding('K-EIDR-CONTENT-ID', wrongConstant.path ?? '')],
      });
    });

    it('enforces the ONIX-stated EIDR Party ID structure on the sender whatever the external layout rule says', async () => {
      const nineDigits = derive(externalAuthority, [['10.5237/A1B2C-3D4', '10.5237/A1B2C-3D45']]);

      expectSourceGate(await gateLedgerOf(nineDigits), {
        ...externalAuthority.gate,
        verdict: 'SOURCE_INVALID',
        findings: [externalLayout, wrongConstant, kernelFinding('K-EIDR-PARTY-ID', externalLayout.path ?? '')],
      });
    });
  });
});
