import { expect, vi } from 'vitest';

import { onixFixtureSource, sha256Hex } from './fixtureSources';
import { countOutcomes, normalizedValues, outcomeLedger, planningLedger, sourceGateLedger } from './ledger';
import { type OnixGateRun, runOnixPlanning, runOnixSourceGate } from './pipeline';
import type {
  Attributed,
  OnixContractClassification,
  OnixNormalizedExpectation,
  OnixOutcomeEntry,
  OnixPlanningExpectation,
  OnixPlanningLedger,
  OnixRegressionFixture,
  OnixRegressionScenario,
  OnixSourceGateExpectation,
  OnixSourceGateLedger,
} from './types';

/**
 * Semantic assertions for ONIX regression fixtures (thoth-app#236). Every comparison is exact and exhaustive: an
 * entry the fixture does not state, or states and the run does not produce, fails. Defect attributions are removed
 * before comparing, so they document an entry without changing what is compared.
 */

/* ------------------------------------------------------------------------------------------------ */
/* Declaration rules                                                                                 */
/* ------------------------------------------------------------------------------------------------ */

export type OnixFixtureRule =
  | 'ID_FORMAT'
  | 'SOURCE_HASH_MISMATCH'
  | 'CONTRACT_DECLARES_DEFECTS'
  | 'CONTRACT_ATTRIBUTES_ENTRY'
  | 'KNOWN_DEFECT_WITHOUT_DEFECTS'
  | 'ATTRIBUTION_UNDECLARED'
  | 'DEFECT_UNUSED'
  | 'KNOWN_DEFECT_BLOCKING_UNATTRIBUTED'
  | 'THOTH_EXPORT_REFUSED_AS_CONTRACT'
  | 'PERMITTED_WITHOUT_SCENARIO'
  | 'PERMITTED_WITHOUT_NORMALIZED'
  | 'PERMITTED_WITH_REFUSED_OUTCOMES'
  | 'REFUSED_WITH_SCENARIO'
  | 'REFUSED_WITH_NORMALIZED'
  | 'REFUSED_WITHOUT_OUTCOMES'
  | 'SCENARIO_NAME_DUPLICATE';

export type OnixFixtureViolation = { readonly rule: OnixFixtureRule; readonly detail: string };

type AttributedEntry = { readonly where: string; readonly blocking: boolean; readonly defect?: string };

/** Every expected entry a fixture states, with whether it is blocking and what it is attributed to. */
const expectedEntries = (fixture: OnixRegressionFixture): AttributedEntry[] => [
  ...fixture.gate.findings.map((entry) => ({
    where: `gate finding ${entry.id} at ${entry.path}`,
    blocking: entry.counts,
    defect: entry.defect,
  })),
  ...fixture.gate.recoveries.map((entry) => ({
    where: `gate recovery ${entry.recovery} at ${entry.path}`,
    blocking: false,
    defect: entry.defect,
  })),
  ...fixture.scenarios.flatMap(({ name, planning }) => [
    ...planning.blockers.map((entry) => ({
      where: `${name}: blocker ${entry.code}`,
      blocking: true,
      defect: entry.defect,
    })),
    ...planning.findings.map((entry) => ({
      where: `${name}: finding ${entry.family}/${entry.code}`,
      blocking: entry.blocking,
      defect: entry.defect,
    })),
  ]),
];

/**
 * Every rule a fixture declaration breaks; empty when it is well formed. Given the source bytes, the declared hash
 * is checked too. The rules keep a known defect of another system from ever reading as accepted contract behaviour.
 */
export const fixtureDeclarationViolations = (
  fixture: OnixRegressionFixture,
  source?: Uint8Array,
): OnixFixtureViolation[] => {
  const violations: OnixFixtureViolation[] = [];
  const violate = (rule: OnixFixtureRule, detail: string) => violations.push({ rule, detail });

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fixture.id)) violate('ID_FORMAT', fixture.id);

  if (source !== undefined) {
    const actual = sha256Hex(source);
    if (actual !== fixture.source.sha256)
      violate('SOURCE_HASH_MISMATCH', `declared ${fixture.source.sha256}, actual ${actual}`);
  }

  const entries = expectedEntries(fixture);
  const declared = new Set(fixture.defects.map(({ reference }) => reference));

  if (fixture.status === 'CONTRACT') {
    if (fixture.defects.length > 0) violate('CONTRACT_DECLARES_DEFECTS', [...declared].join(', '));
    for (const entry of entries) {
      if (entry.defect !== undefined) violate('CONTRACT_ATTRIBUTES_ENTRY', `${entry.where} -> ${entry.defect}`);
    }
  } else {
    if (fixture.defects.length === 0) violate('KNOWN_DEFECT_WITHOUT_DEFECTS', fixture.id);
    for (const entry of entries) {
      if (entry.blocking && entry.defect === undefined) violate('KNOWN_DEFECT_BLOCKING_UNATTRIBUTED', entry.where);
    }
    for (const reference of declared) {
      if (!entries.some(({ defect }) => defect === reference)) violate('DEFECT_UNUSED', reference);
    }
  }

  for (const entry of entries) {
    if (entry.defect !== undefined && !declared.has(entry.defect)) {
      violate('ATTRIBUTION_UNDECLARED', `${entry.where} -> ${entry.defect}`);
    }
  }

  const permitted = fixture.gate.verdict === 'PERMITTED';

  // Thoth's own export refused at the source gate is an exporter defect or an importer defect, never a contract.
  if (fixture.source.origin === 'THOTH_EXPORT' && !permitted) {
    if (fixture.status !== 'KNOWN_DEFECT' || !fixture.defects.some(({ owner }) => owner === 'thoth')) {
      violate('THOTH_EXPORT_REFUSED_AS_CONTRACT', `${fixture.gate.verdict} without a declared thoth defect`);
    }
  }

  if (permitted) {
    if (fixture.scenarios.length === 0) violate('PERMITTED_WITHOUT_SCENARIO', fixture.id);
    if (fixture.normalized === undefined) violate('PERMITTED_WITHOUT_NORMALIZED', fixture.id);
    if (fixture.refusedOutcomes !== undefined) violate('PERMITTED_WITH_REFUSED_OUTCOMES', fixture.id);
  } else {
    if (fixture.scenarios.length > 0)
      violate('REFUSED_WITH_SCENARIO', fixture.scenarios.map(({ name }) => name).join(', '));
    if (fixture.normalized !== undefined) violate('REFUSED_WITH_NORMALIZED', fixture.id);
    if (fixture.refusedOutcomes === undefined) violate('REFUSED_WITHOUT_OUTCOMES', fixture.id);
  }

  const names = fixture.scenarios.map(({ name }) => name);
  for (const name of new Set(names)) {
    if (names.filter((other) => other === name).length > 1) violate('SCENARIO_NAME_DUPLICATE', name);
  }

  return violations;
};

/* ------------------------------------------------------------------------------------------------ */
/* Running a fixture                                                                                 */
/* ------------------------------------------------------------------------------------------------ */

export type OnixScenarioRun = {
  readonly scenario: OnixRegressionScenario;
  readonly planning: OnixPlanningLedger | null;
  readonly outcomes: readonly OnixOutcomeEntry[];
};

export type OnixRegressionRun = {
  readonly gate: OnixGateRun;
  readonly gateLedger: OnixSourceGateLedger;
  /** One run per declared scenario, when the gate permits planning; none otherwise. */
  readonly scenarios: readonly OnixScenarioRun[];
  /** The outcomes of the gate alone, which are the whole run when it refuses. */
  readonly gateOutcomes: readonly OnixOutcomeEntry[];
};

/**
 * Runs a fixture's source through the pipeline once, then plans every scenario under the fixture's clock. The clock is
 * faked for `Date` only, and only for the duration of the run.
 */
export const runOnixRegressionFixture = async (
  fixture: Pick<OnixRegressionFixture, 'asOf' | 'imprints' | 'scenarios'>,
  source: Uint8Array,
): Promise<OnixRegressionRun> => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(fixture.asOf) });
  try {
    const gate = await runOnixSourceGate(source);
    const gateLedger = sourceGateLedger(gate);
    const scenarios: OnixScenarioRun[] = [];

    if (gate.bridged !== null) {
      for (const scenario of fixture.scenarios) {
        const run = await runOnixPlanning(gate.bridged, { imprints: fixture.imprints, inputs: scenario.inputs });
        const planning = planningLedger(run);
        scenarios.push({ scenario, planning, outcomes: outcomeLedger(gateLedger, planning) });
      }
    }

    return { gate, gateLedger, scenarios, gateOutcomes: outcomeLedger(gateLedger, null) };
  } finally {
    vi.useRealTimers();
  }
};

/** A registered fixture's own source. */
export const runRegisteredOnixFixture = (fixture: OnixRegressionFixture): Promise<OnixRegressionRun> =>
  runOnixRegressionFixture(fixture, onixFixtureSource(fixture));

/* ------------------------------------------------------------------------------------------------ */
/* Assertions                                                                                        */
/* ------------------------------------------------------------------------------------------------ */

/** Removes defect attributions, which document an entry and are never compared. */
export const withoutAttribution = <T extends object>(entries: readonly Attributed<T>[]): T[] =>
  entries.map(({ defect: _defect, ...entry }) => entry as unknown as T);

/** The gate's verdict, release, flavour, every canonical finding and every recovery, exactly. */
export const expectSourceGate = (observed: OnixSourceGateLedger, expected: OnixSourceGateExpectation): void => {
  expect(observed).toStrictEqual({
    verdict: expected.verdict,
    release: expected.release,
    flavour: expected.flavour,
    findings: withoutAttribution(expected.findings),
    recoveries: withoutAttribution(expected.recoveries),
  });
};

/** The exact values each stated XPath selects in the normalised Reference source. */
export const expectNormalized = (gate: OnixGateRun, expected: OnixNormalizedExpectation): void => {
  expect(normalizedValues(gate, Object.keys(expected))).toStrictEqual(expected);
};

/** Every record, Product, Work group, blocker, finding and planned Work of one scenario, exactly. */
export const expectPlanning = (observed: OnixPlanningLedger | null, expected: OnixPlanningExpectation): void => {
  expect(observed).toStrictEqual({
    executable: expected.executable,
    records: expected.records,
    products: expected.products,
    workGroups: expected.workGroups,
    blockers: withoutAttribution(expected.blockers),
    findings: withoutAttribution(expected.findings),
    works: expected.works,
    chapters: expected.chapters,
  });
};

/** How many outcomes of each classification the run produced, exactly (classifications absent from both agree). */
export const expectOutcomes = (
  observed: readonly OnixOutcomeEntry[],
  expected: Readonly<Partial<Record<OnixContractClassification, number>>>,
): void => {
  expect(countOutcomes(observed)).toStrictEqual(expected);
};
