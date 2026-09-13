// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { SourceFinding } from '../findings';
import { evaluateSchematron } from '../schematron';
import { evaluateStrict } from '../strict/evaluate';
import {
  createOnixSourceValidator,
  type ExecutionControls,
  type OnixSourceValidationResult,
  type OnixSourceValidator,
} from '../validator';
import { createExecutionControls } from './execution';
import { toWorkerResult } from './result';
import type { ValidatorControls } from './session';

vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

const FIXTURES = join(__dirname, '..', '__fixtures__', 'spike02');
const PUBLIC_DIR = join(process.cwd(), 'public', 'onix-validation');
const loadResource = async (fileName: string) => new Uint8Array(readFileSync(join(PUBLIC_DIR, fileName)));
const bytes = (path: string) => new Uint8Array(readFileSync(join(FIXTURES, path)));

const SETS = [
  'edge',
  'taint30',
  'taint31',
  'kernel30',
  'kernel31',
  'residual30',
  'residual31',
  'residual30x',
  'residual31x',
  'dynerr30',
  'dynerr31',
  'eidr30',
  'eidr31',
  'dtd_suite30',
  'dtd_suite31',
  'skernel30',
  'skernel31',
];
const corpus = SETS.flatMap((set) =>
  readdirSync(join(FIXTURES, set))
    .filter((name) => name.endsWith('.xml'))
    .map((name) => `${set}/${name}`),
);

const noop = () => undefined;
const controls = (accelerate: boolean, extra: Partial<ValidatorControls> = {}): ValidatorControls => ({
  accelerate,
  onStage: noop,
  onProgress: noop,
  shouldCancel: () => false,
  yield: () => Promise.resolve(),
  ...extra,
});

/** Everything a consumer can observe, as plain data. */
const observable = (result: OnixSourceValidationResult) => {
  const dto = toWorkerResult(result);
  return {
    status: dto.status,
    stop: dto.stop,
    source: dto.source,
    findings: dto.findings,
    summary: dto.summary,
    sourceValid: dto.sourceValid,
    xml: dto.normalized?.xml ?? null,
    provenance: dto.normalized?.provenance ?? null,
    recoveries: dto.normalized?.recoveries ?? null,
    elementCount: dto.normalized?.elementCount ?? null,
  };
};

let canonical: OnixSourceValidator;
let optimized: OnixSourceValidator;
let plain: OnixSourceValidator;
beforeAll(() => {
  plain = createOnixSourceValidator({ loadResource });
  canonical = createOnixSourceValidator({ loadResource, execution: createExecutionControls(controls(false)) });
  optimized = createOnixSourceValidator({ loadResource, execution: createExecutionControls(controls(true)) });
});

describe('createExecutionControls', () => {
  it('without accelerate installs observation only: the canonical evaluators run', () => {
    const execution = createExecutionControls(controls(false));
    expect(execution.strict).toBeUndefined();
    expect(execution.schematron).toBeUndefined();
    expect(typeof execution.onStage).toBe('function');
    expect(typeof execution.shouldCancel).toBe('function');
  });

  it('with accelerate installs the scheduled evaluators', () => {
    const execution = createExecutionControls(controls(true));
    expect(typeof execution.strict).toBe('function');
    expect(typeof execution.schematron).toBe('function');
  });
});

describe('accelerators ON vs canonical OFF: exact equivalence of everything observable', () => {
  it('covers the frozen SPIKE-02 corpus', () => {
    expect(corpus.length).toBeGreaterThan(300);
  });

  it.each(corpus)('%s', async (path) => {
    const source = bytes(path);
    const off = observable(await canonical.validate(source));
    const on = observable(await optimized.validate(source));
    const reference = observable(await plain.validate(source));
    expect(on).toEqual(off);
    expect(off).toEqual(reference);
  });

  it('progress enabled vs disabled yields the identical result and progress counts are real denominators', async () => {
    const progress: { stage: string; done: number; total: number }[] = [];
    const stages: string[] = [];
    const loud = createOnixSourceValidator({
      loadResource,
      execution: createExecutionControls(
        controls(true, { onStage: (s) => void stages.push(s), onProgress: (p) => void progress.push(p) }),
      ),
    });
    const source = bytes('taint31/T7_global_rule_with_tainted_product.xml');
    expect(observable(await loud.validate(source))).toEqual(observable(await optimized.validate(source)));
    expect(stages).toEqual(['DECODING', 'SOURCE_GATE', 'PREPARING', 'ORDINARY', 'STRICT', 'SCHEMATRON', 'INVENTORY']);
    const strict = progress.filter((p) => p.stage === 'STRICT');
    const schematron = progress.filter((p) => p.stage === 'SCHEMATRON');
    expect(strict.map((p) => p.done)).toEqual(strict.map((_, i) => i + 1));
    expect(strict[strict.length - 1].done).toBe(strict[0].total);
    expect(schematron[schematron.length - 1].done).toBe(schematron[0].total);
  });

  it('the injected evaluators are the scheduled ones and their output equals the canonical evaluators on the validated tree', async () => {
    const seen: { strictFindings: number; schematronFindings: number }[] = [];
    const execution: ExecutionControls = {
      ...createExecutionControls(controls(true)),
    };
    const probe = createOnixSourceValidator({
      loadResource,
      execution: {
        ...execution,
        strict: async (ruleset, document, c) => {
          const scheduled = await execution.strict!(ruleset, document, c);
          const reference = evaluateStrict(ruleset, document);
          expect(scheduled.findings.map((f) => [f.id, f.path, f.dynamicError])).toEqual(
            reference.findings.map((f) => [f.id, f.path, f.dynamicError]),
          );
          expect(scheduled.evaluated).toBe(reference.evaluated);
          seen.push({ strictFindings: scheduled.findings.length, schematronFindings: -1 });
          return scheduled;
        },
        schematron: async (ruleset, document, c) => {
          const scheduled = await execution.schematron!(ruleset, document, c);
          const reference = evaluateSchematron(ruleset, document);
          expect(scheduled.map((f) => [f.id, f.path, f.notEvaluable])).toEqual(
            reference.map((f) => [f.id, f.path, f.notEvaluable]),
          );
          seen[seen.length - 1].schematronFindings = scheduled.length;
          return scheduled;
        },
      },
    });
    await probe.validate(bytes('taint30/T7_global_rule_with_tainted_product.xml'));
    expect(seen).toHaveLength(1);
    expect(seen[0].schematronFindings).toBeGreaterThanOrEqual(0);
  });

  it('RULE_NOT_EVALUABLE findings are identical with accelerators on', async () => {
    const source = bytes('eidr31/K-EIDRP_pos_CopyrightOwnerIdentifier_no_hyphen.xml');
    const pick = (findings: readonly SourceFinding[]) =>
      findings
        .filter((f) => f.class === 'RULE_NOT_EVALUABLE')
        .map((f) => [f.id, f.path, f.projection, f.detail?.error]);
    const off = await canonical.validate(source);
    const on = await optimized.validate(source);
    expect(pick(on.findings)).toEqual(pick(off.findings));
    expect(pick(on.findings).length).toBeGreaterThan(0);
  });
});
