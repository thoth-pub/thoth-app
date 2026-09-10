// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { SCHEMA_MODELS } from '../schemaModel';
import { evaluateSourceGate } from '../sourceGate';
import type { OnixRelease } from '../types';
import { ValidationCancelledError } from '../validator';
import { buildXdm, indexElements } from '../xdm';
import { createStrictAccelerators, type StrictAccelerators } from './accelerators';
import { applySchemaDefaults, evaluateStrict, type StrictEvaluation } from './evaluate';
import { buildRuleset, compileRuleset, type Ruleset } from './ruleset';
import { evaluateStrictScheduled } from './scheduled';

const PUBLIC_DIR = join(process.cwd(), 'public', 'onix-validation');
const FIXTURES = join(__dirname, '..', '__fixtures__', 'spike02');

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

const SETS = [
  'edge',
  'taint30',
  'taint31',
  'kernel30',
  'kernel31',
  'residual30',
  'residual31',
  'dynerr30',
  'dynerr31',
  'eidr30',
  'eidr31',
];
const corpus = SETS.flatMap((set) =>
  readdirSync(join(FIXTURES, set))
    .filter((name) => name.endsWith('.xml'))
    .map((name) => `${set}/${name}`),
);

/** Comparable projection of a strict evaluation (node and rule identity kept). */
const projection = (evaluation: StrictEvaluation) => ({
  evaluated: evaluation.evaluated,
  findings: evaluation.findings.map((f) => ({
    id: f.id,
    element: f.element,
    path: f.path,
    dynamicError: f.dynamicError,
    message: f.message,
    source: f.source,
    node: f.node,
    rule: f.rule,
  })),
});

function prepared(path: string) {
  const text = readFileSync(join(FIXTURES, path), 'utf8');
  const gate = evaluateSourceGate(text);
  if (gate.kind !== 'CONTINUE') return null;
  const release = gate.source.release;
  const { document } = buildXdm(text);
  applySchemaDefaults(document, SCHEMA_MODELS[release]);
  return { release, document, ruleset: rulesets[release]!, accelerators: accelerators[release]! };
}

describe('G1 scheduled strict evaluation is canonical-equivalent', () => {
  it('covers a corpus with dynamic errors and accelerated rules', () => {
    expect(corpus.length).toBeGreaterThan(150);
  });

  it.each(corpus)(
    '%s: same findings, order, dynamic errors and evaluation count, accelerators on and off',
    async (path) => {
      const p = prepared(path);
      if (!p) return;
      const canonical = projection(evaluateStrict(p.ruleset, p.document));
      const off = await evaluateStrictScheduled(p.ruleset, p.document, { accelerators: null });
      const on = await evaluateStrictScheduled(p.ruleset, p.document, { accelerators: p.accelerators });
      expect(projection(off)).toEqual(canonical);
      expect(projection(on)).toEqual(canonical);
      expect(off.stats.accelerated).toBe(0);
      expect(on.stats.accelerated + on.stats.canonical).toBe(on.evaluated);
      expect(on.stats.canonical).toBe(off.stats.canonical - on.stats.accelerated);
    },
  );

  it('the corpus exercises fast paths and dynamic errors', async () => {
    let accelerated = 0;
    let dynamic = 0;
    for (const path of corpus) {
      const p = prepared(path);
      if (!p) continue;
      const on = await evaluateStrictScheduled(p.ruleset, p.document, { accelerators: p.accelerators });
      accelerated += on.stats.accelerated;
      dynamic += on.findings.filter((f) => f.dynamicError).length;
    }
    expect(accelerated).toBeGreaterThan(100);
    expect(dynamic).toBeGreaterThan(0);
  });

  it('a forced fallback is evaluated canonically and its dynamic error is not swallowed', async () => {
    const release = '3.0';
    const { document } = buildXdm(
      '<ONIXMessage xmlns="http://ns.editeur.org/onix/3.0/reference"><Header/><Product><PublishingDetail><SalesRights>' +
        '<SalesRightsType>01</SalesRightsType><SalesRightsType>02</SalesRightsType><Territory><CountriesIncluded>GB</CountriesIncluded></Territory>' +
        '</SalesRights></PublishingDetail><ProductSupply><Market><Territory><CountriesIncluded>GB</CountriesIncluded></Territory></Market></ProductSupply></Product></ONIXMessage>',
    );
    const on = await evaluateStrictScheduled(rulesets[release]!, document, { accelerators: accelerators[release]! });
    const canonical = evaluateStrict(rulesets[release]!, document);
    expect(on.stats.fallbacks).toBeGreaterThan(0);
    const h1 = on.findings.filter((f) => f.id === '_20180109_h_1');
    expect(h1).toHaveLength(1);
    expect(h1[0].dynamicError).toMatch(/XPTY0004|Multiplicity|sequence/i);
    expect(projection(on)).toEqual(projection(canonical));
  });

  it('reports progress per group, yields between groups and cancels cooperatively', async () => {
    const p = prepared('taint30/T7_global_rule_with_tainted_product.xml')!;
    const index = indexElements(p.document);
    expect(index.productCount).toBeGreaterThan(1);
    const progress: [number, number][] = [];
    let yields = 0;
    const on = await evaluateStrictScheduled(p.ruleset, p.document, {
      index,
      accelerators: p.accelerators,
      controls: {
        onProgress: ({ stage, done, total }) => {
          expect(stage).toBe('STRICT');
          progress.push([done, total]);
        },
        yield: async () => void yields++,
      },
    });
    const groups = index.productCount + 1;
    expect(on.stats.groups).toBe(groups);
    expect(progress).toEqual(Array.from({ length: groups }, (_, i) => [i + 1, groups]));
    expect(yields).toBe(groups);
    let seen = 0;
    await expect(
      evaluateStrictScheduled(p.ruleset, p.document, { index, controls: { shouldCancel: () => ++seen > 1 } }),
    ).rejects.toBeInstanceOf(ValidationCancelledError);
  });
});
