// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from 'vitest';

import {
  expectNormalized,
  expectOutcomes,
  expectPlanning,
  expectSourceGate,
  fixtureDeclarationViolations,
  type OnixRegressionRun,
  runRegisteredOnixFixture,
} from './assertions';
import { ONIX_REGRESSION_FIXTURES } from './fixtures';
import { onixFixtureSource } from './fixtureSources';

/**
 * The ONIX contract regression suite (thoth-app#236): every registered fixture's source is run through the pipeline
 * the uploader runs, and each stage is compared, exactly, with what the fixture states the accepted contract does.
 */

// The canonical validator compiles the pinned schemas and ~1,300 strict assertions once per process; under coverage
// instrumentation that alone exceeds the default timeouts.
vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

describe.each(ONIX_REGRESSION_FIXTURES.map((fixture) => [fixture.id, fixture] as const))(
  'ONIX regression fixture %s',
  (_id, fixture) => {
    let run: OnixRegressionRun;

    beforeAll(async () => {
      run = await runRegisteredOnixFixture(fixture);
    });

    it(`is a well-formed ${fixture.status} declaration`, () => {
      expect(fixtureDeclarationViolations(fixture, onixFixtureSource(fixture))).toStrictEqual([]);
    });

    it('meets its source gate expectation', () => {
      expectSourceGate(run.gateLedger, fixture.gate);
    });

    const { normalized, refusedOutcomes } = fixture;
    if (normalized !== undefined) {
      it('hands the target side the normalised source it expects', () => {
        expectNormalized(run.gate, normalized);
      });
    } else {
      it('hands the target side nothing, with only the outcomes the gate states', () => {
        expect(run.gate.bridged).toBeNull();
        expect(run.scenarios).toStrictEqual([]);
        expectOutcomes(run.gateOutcomes, refusedOutcomes ?? {});
      });
    }

    fixture.scenarios.forEach((scenario, index) => {
      describe(`planning: ${scenario.name}`, () => {
        it('plans exactly what the scenario states', () => {
          expect(run.scenarios[index].scenario).toBe(scenario);
          expectPlanning(run.scenarios[index].planning, scenario.planning);
        });

        it('produces exactly the outcomes the scenario states', () => {
          expectOutcomes(run.scenarios[index].outcomes, scenario.outcomes);
        });
      });
    });
  },
);
