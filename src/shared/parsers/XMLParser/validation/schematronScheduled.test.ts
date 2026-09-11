// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { evaluateXPathToNodes } from 'fontoxpath';
import type { Node } from 'slimdom';
import { beforeAll, describe, expect, it, vi } from 'vitest';

// Corpus-scale suites: under coverage instrumentation they exceed the default 5 s per test.
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

import { SCHEMA_MODELS } from './schemaModel';
import { evaluateSchematron, schematronContextKey, type SchematronFinding, schematronOptions } from './schematron';
import {
  evaluateSchematronScheduled,
  plainContextBranches,
  S1_REPORT_IDS,
  s1Pattern,
  scanDescendantText,
} from './schematronScheduled';
import { evaluateSourceGate } from './sourceGate';
import { createCharacterClassSet } from './strict/characterClasses';
import { applySchemaDefaults } from './strict/evaluate';
import { buildRuleset, compileRuleset, type Ruleset, type SchematronReport } from './strict/ruleset';
import type { OnixRelease } from './types';
import { ValidationCancelledError } from './validator';
import { buildXdm, indexElements } from './xdm';

const PUBLIC_DIR = join(process.cwd(), 'public', 'onix-validation');
const FIXTURES = join(__dirname, '__fixtures__', 'spike02');
const NS = {
  '3.0': 'http://ns.editeur.org/onix/3.0/reference',
  '3.1': 'http://ns.editeur.org/onix/3.1/reference',
} as const;

const rulesets: Partial<Record<OnixRelease, Ruleset>> = {};
beforeAll(() => {
  for (const release of ['3.0', '3.1'] as const) {
    rulesets[release] = compileRuleset(
      buildRuleset(readFileSync(join(PUBLIC_DIR, `ONIX_BookProduct_${release}_reference_strict.xsd`), 'utf8')),
      SCHEMA_MODELS[release],
    );
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
  'codelist30',
  'codelist31',
];
const corpus = SETS.flatMap((set) =>
  readdirSync(join(FIXTURES, set))
    .filter((name) => name.endsWith('.xml'))
    .map((name) => `${set}/${name}`),
);

const projection = (findings: readonly SchematronFinding[]) =>
  findings.map((f) => ({
    id: f.id,
    role: f.report.role,
    report: f.report,
    node: f.node,
    path: f.path,
    notEvaluable: f.notEvaluable,
  }));

function prepared(text: string) {
  const gate = evaluateSourceGate(text);
  if (gate.kind !== 'CONTINUE') return null;
  const release = gate.source.release;
  const { document } = buildXdm(text);
  applySchemaDefaults(document, SCHEMA_MODELS[release]);
  return { release, document, ruleset: rulesets[release]! };
}
const fixture = (path: string) => readFileSync(join(FIXTURES, path), 'utf8');

describe('context classification', () => {
  it.each([
    ['//onix:Product', [{ prefix: 'onix', name: 'Product' }]],
    [
      '//onix:Product | //onix:Header',
      [
        { prefix: 'onix', name: 'Product' },
        { prefix: 'onix', name: 'Header' },
      ],
    ],
    ['//Product', [{ prefix: '', name: 'Product' }]],
    ["//onix:Contributor[onix:ContributorRole = 'A01']", null],
    ['//onix:*/@language', null],
    ['//onix:Product/onix:Text', null],
    ['/onix:ONIXMessage', null],
    ["//onix:A[. = 'x|y'] | //onix:B", null],
  ])('%s', (context, branches) => {
    expect(plainContextBranches(context)).toEqual(branches);
  });

  it('S1 accepts only the approved ids whose pattern is a derived class: all ten in 3.0, eight in 3.1', () => {
    const classes = createCharacterClassSet();
    const eligible = (release: OnixRelease) =>
      rulesets[release]!.schematron.filter((r) => s1Pattern(r, classes) !== null);
    expect(
      eligible('3.0')
        .map((r) => r.id)
        .sort(),
    ).toEqual([...S1_REPORT_IDS].sort());
    // The 3.1 Cyrillic and Arabic block unions differ from the 3.0 literals and were not derived: they stay canonical.
    expect(
      eligible('3.1')
        .map((r) => r.id)
        .sort(),
    ).toEqual([...S1_REPORT_IDS].filter((id) => id !== '_20200115_d_2' && id !== '_20200115_d_3').sort());
    for (const id of ['_20200115_d_2', '_20200115_d_3']) {
      const [r30] = rulesets['3.0']!.schematron.filter((r) => r.id === id);
      const [r31] = rulesets['3.1']!.schematron.filter((r) => r.id === id);
      expect(r31.test).not.toBe(r30.test);
      expect(S1_REPORT_IDS.has(id)).toBe(true);
    }
    for (const report of [...eligible('3.0'), ...eligible('3.1')]) {
      expect(report.context).toBe('//onix:ONIXMessage');
      expect(report.test.startsWith("exists(descendant::*[matches(., '")).toBe(true);
    }
    const sample = eligible('3.0')[0];
    const tampered = { ...sample, test: sample.test.replace('descendant::*', 'descendant-or-self::*') };
    expect(s1Pattern(tampered, classes)).toBeNull();
    expect(s1Pattern({ ...sample, id: '_20200115_d_10' }, classes)).toBeNull();
    expect(s1Pattern({ ...sample, test: "exists(descendant::*[matches(., '[abc]')])" }, classes)).toBeNull();
  });
});

describe('G1 plain-context unions keep XPath set semantics', () => {
  const FOREIGN = 'urn:example:foreign';
  const TEXT =
    `<ONIXMessage release="3.0" xmlns="${NS['3.0']}" xmlns:f="${FOREIGN}">` +
    '<Header><Sender><SenderName>T</SenderName></Sender></Header>' +
    '<Product><RecordReference>a</RecordReference><f:Product/></Product>' +
    '<Product><RecordReference>b</RecordReference></Product>' +
    '<f:Product><P xmlns="">x</P></f:Product>' +
    '</ONIXMessage>';
  const ONIX = { '': NS['3.0'], onix: NS['3.0'] };
  const ALT = { ...ONIX, alt: NS['3.0'] };
  const CASES: [label: string, context: string, prefixes: Record<string, string>, indexServed: boolean][] = [
    ['identical duplicate branches', '//onix:Product | //onix:Product', ONIX, true],
    ['two prefixes bound to the same namespace', '//onix:Product | //alt:Product', ALT, true],
    ['a node reached through two of three branches', '//alt:Product | //onix:Header | //onix:Product', ALT, true],
    ['a default-namespace branch overlapping a prefixed one', '//Product | //onix:Product', ONIX, true],
    [
      'disjoint branches listed out of document order',
      '//onix:RecordReference | //onix:Header | //onix:Product',
      ONIX,
      true,
    ],
    ['one local name in two namespaces', '//onix:Product | //f:Product', { ...ONIX, f: FOREIGN }, true],
    ['a single branch', '//onix:RecordReference', ONIX, true],
    ['a prefix bound to the empty namespace (canonical fallback)', '//e:P | //e:P', { ...ONIX, e: '' }, false],
    [
      'an unbound prefix (canonical fallback and its static error)',
      '//onix:Product | //nope:Product',
      { onix: NS['3.0'] },
      false,
    ],
  ];
  const TESTS: [kind: 'report' | 'assert', test: string][] = [
    ['report', 'true()'],
    ['assert', 'false()'],
    ['report', 'error()'],
  ];

  it.each(CASES)(
    '%s: canonical node identity, order, finding count/order and errors',
    async (_label, context, prefixes, indexServed) => {
      const { document } = buildXdm(TEXT);
      const reports = TESTS.map(
        ([kind, test], i): SchematronReport => ({
          kind,
          id: `_union_${i}`,
          role: 'error',
          test,
          context,
          text: 't',
          prefixes,
        }),
      );
      const ruleset: Ruleset = { ...rulesets['3.0']!, schematron: reports };
      const canonical = evaluateSchematron(ruleset, document);
      const scheduled = await evaluateSchematronScheduled(ruleset, document);
      expect(scheduled.findings).toHaveLength(canonical.length);
      scheduled.findings.forEach((finding, i) => {
        expect(finding.report).toBe(canonical[i].report);
        expect(finding.node).toBe(canonical[i].node);
        expect(finding.path).toBe(canonical[i].path);
        expect(finding.notEvaluable).toEqual(canonical[i].notEvaluable);
      });
      expect(scheduled.stats).toMatchObject({
        indexServedContexts: indexServed ? 1 : 0,
        canonicalContexts: indexServed ? 0 : 1,
      });
      // A firing report visits exactly the XPath node sequence: every selected node once, in document order.
      let expected: Node[] | null;
      try {
        expected = evaluateXPathToNodes<Node>(context, document, null, {}, schematronOptions(reports[0]));
      } catch {
        expected = null;
      }
      const visited = scheduled.findings.filter((f) => f.id === '_union_0').map((f) => f.node);
      if (expected === null) {
        expect(visited).toEqual([null]);
      } else {
        expect(new Set(expected).size).toBe(expected.length);
        expect(visited).toHaveLength(expected.length);
        visited.forEach((node, i) => expect(node).toBe(expected![i]));
      }
    },
  );
});

describe('S1 scan cache identity', () => {
  it("a node selected by two contexts is scanned for each context's own classes", async () => {
    const base = rulesets['3.0']!;
    const moved: Ruleset = {
      ...base,
      schematron: base.schematron.map(
        (r): SchematronReport => (r.id === '_20200115_d_4' ? { ...r, context: '/onix:ONIXMessage' } : r),
      ),
    };
    const p = prepared(
      `<ONIXMessage release="3.0" xmlns="${NS['3.0']}"><Header><Sender><SenderName>T</SenderName></Sender></Header>` +
        '<Product><RecordReference>é א</RecordReference></Product></ONIXMessage>',
    )!;
    const canonical = projection(evaluateSchematron(moved, p.document));
    const scheduled = await evaluateSchematronScheduled(moved, p.document);
    expect(projection(scheduled.findings)).toEqual(canonical);
    expect(scheduled.stats.s1Reports).toBe(10);
    expect(canonical.map((f) => f.id)).toEqual(expect.arrayContaining(['_20200115_d_1', '_20200115_d_4']));
  });
});

describe('context cache identity', () => {
  const report = (context: string, prefixes: Record<string, string>): SchematronReport => ({
    kind: 'report',
    id: '_key',
    role: 'error',
    test: 'true()',
    context,
    text: 't',
    prefixes,
  });
  // Each pair is conflated by a space-joined composition of its components (context, then each prefix and namespace).
  const spaceJoined = (r: SchematronReport) => [r.context, ...Object.entries(r.prefixes).flat()].join(' ');
  const PAIRS: [SchematronReport, SchematronReport][] = [
    [report('//a:Product', { a: `${NS['3.0']} b urn:x` }), report('//a:Product', { a: NS['3.0'], b: 'urn:x' })],
    [report('//a:Product a', { b: 'c' }), report('//a:Product', { a: 'b c' })],
    [report('//a:Product | //b:X', { a: NS['3.0'] }), report('//a:Product', { '|': `//b:X a ${NS['3.0']}` })],
  ];

  it('is a tuple encoding that recovers exactly the context and its bindings', () => {
    const inputs = [
      ...PAIRS.flat(),
      report(`//onix:A[. = ' {"onix":"x"}'] | //onix:B`, { '': NS['3.0'] }),
      report('//onix:A', { '': 'urn:"q" \\ {}' }),
      report('', {}),
    ];
    for (const r of inputs) expect(JSON.parse(schematronContextKey(r))).toEqual([r.context, r.prefixes]);
  });

  it('keeps apart inputs a space-joined composition conflates, in the key and in both evaluators', async () => {
    for (const [a, b] of PAIRS) {
      expect(spaceJoined(a)).toBe(spaceJoined(b));
      expect(schematronContextKey(a)).not.toBe(schematronContextKey(b));
    }
    // One context text under two bindings: each report selects through its own bindings.
    const [unbound, bound] = PAIRS[0];
    const { document } = buildXdm(
      `<ONIXMessage release="3.0" xmlns="${NS['3.0']}"><Header/><Product/><Product/></ONIXMessage>`,
    );
    const ruleset: Ruleset = {
      ...rulesets['3.0']!,
      schematron: [
        { ...unbound, id: '_unbound' },
        { ...bound, id: '_bound' },
      ],
    };
    const canonical = evaluateSchematron(ruleset, document);
    const scheduled = await evaluateSchematronScheduled(ruleset, document);
    expect(canonical.map((f) => [f.id, f.path])).toEqual([
      ['_bound', '/ONIXMessage[1]/Product[1]'],
      ['_bound', '/ONIXMessage[1]/Product[2]'],
    ]);
    expect(projection(scheduled.findings)).toEqual(projection(canonical));
  });
});

describe('G1/S1 scheduled Schematron is canonical-equivalent', () => {
  it.each(corpus)('%s: identical findings, order, roles, paths and errors with S1 on and off', async (path) => {
    const p = prepared(fixture(path));
    if (!p) return;
    const canonical = projection(evaluateSchematron(p.ruleset, p.document));
    const off = await evaluateSchematronScheduled(p.ruleset, p.document, { classes: null });
    const on = await evaluateSchematronScheduled(p.ruleset, p.document);
    expect(projection(off.findings)).toEqual(canonical);
    expect(projection(on.findings)).toEqual(canonical);
    expect(off.stats.s1Reports).toBe(0);
    expect(on.stats.s1Reports).toBe(p.release === '3.0' ? 10 : 8);
    expect(on.stats.indexServedContexts).toBeGreaterThan(0);
  });

  const message = (release: OnixRelease, body: string) =>
    `<ONIXMessage release="${release}" xmlns="${NS[release]}"><Header><Sender><SenderName>T</SenderName></Sender></Header>${body}</ONIXMessage>`;
  const SCRIPT_SAMPLES: [id: string, sample: string][] = [
    ['_20200115_d_1', 'é'],
    ['_20200115_d_2', 'Ж'],
    ['_20200115_d_3', 'ع'],
    ['_20200115_d_4', 'א'],
    ['_20200115_d_5', '한'],
    ['_20200115_d_6', '中'],
    ['_20200115_d_7', 'あ'],
    ['_20200115_d_8', 'Ω'],
    ['_20200115_d_9', 'क'],
    ['_20190410_c_1', '́'],
  ];

  describe.each(['3.0', '3.1'] as const)(
    '%s: each accepted class, placed in a descendant, a direct text child, a comment, an attribute',
    (release) => {
      it.each(SCRIPT_SAMPLES)('%s', async (id, sample) => {
        const cases: [label: string, body: string, fires: boolean][] = [
          ['descendant text', `<Product><RecordReference>${sample}</RecordReference></Product>`, true],
          ['descendant CDATA', `<Product><RecordReference><![CDATA[${sample}]]></RecordReference></Product>`, true],
          ['deep descendant', `<Product><Note><Deep><Text>x${sample}y</Text></Deep></Note></Product>`, true],
          [
            'direct text child of ONIXMessage',
            `${sample}<Product><RecordReference>a</RecordReference></Product>`,
            false,
          ],
          ['comment only', `<Product><RecordReference>a<!-- ${sample} --></RecordReference></Product>`, false],
          [
            'processing instruction only',
            `<Product><RecordReference>a<?pi ${sample}?></RecordReference></Product>`,
            false,
          ],
          ['attribute only', `<Product><RecordReference a="${sample}">a</RecordReference></Product>`, false],
          ['absent', '<Product><RecordReference>plain</RecordReference></Product>', false],
        ];
        for (const [label, body, fires] of cases) {
          const p = prepared(message(release, body))!;
          const canonical = evaluateSchematron(p.ruleset, p.document).filter((f) => f.id === id);
          const on = (await evaluateSchematronScheduled(p.ruleset, p.document)).findings.filter((f) => f.id === id);
          expect(canonical.length, `${label} canonical`).toBe(fires ? 1 : 0);
          expect(projection(on), label).toEqual(projection(canonical));
          if (fires) expect(on[0]).toMatchObject({ path: '/ONIXMessage[1]', notEvaluable: null });
        }
      });
    },
  );

  it('a class present only in a direct text child of the context is not scanned', () => {
    const classes = createCharacterClassSet();
    const hebrew = classes.bit('\\p{IsHebrew}')!;
    const { document } = buildXdm(
      `<ONIXMessage xmlns="${NS['3.0']}">א<Header><Sender>א</Sender></Header></ONIXMessage>`,
    );
    const root = document.documentElement!;
    expect(scanDescendantText(root, hebrew, classes)).toBe(hebrew);
    const { document: direct } = buildXdm(`<ONIXMessage xmlns="${NS['3.0']}">א<Header/></ONIXMessage>`);
    expect(scanDescendantText(direct.documentElement!, hebrew, classes)).toBe(0);
  });

  it('a report whose text loses the accepted shape is evaluated canonically, never skipped', async () => {
    const release = '3.0';
    const base = rulesets[release]!;
    const tampered: Ruleset = {
      ...base,
      schematron: base.schematron.map(
        (r): SchematronReport =>
          r.id === '_20200115_d_4' ? { ...r, test: r.test.replace('descendant::*', 'descendant-or-self::*') } : r,
      ),
    };
    const p = prepared(message(release, '<Product><RecordReference>א</RecordReference></Product>'))!;
    const canonical = projection(evaluateSchematron(tampered, p.document));
    const on = await evaluateSchematronScheduled(tampered, p.document);
    expect(projection(on.findings)).toEqual(canonical);
    expect(on.stats.s1Reports).toBe(9);
    expect(on.findings.some((f) => f.id === '_20200115_d_4')).toBe(true);
  });

  it('a raising context and a raising test stay explicit not-evaluable findings', async () => {
    const release = '3.0';
    const base = rulesets[release]!;
    const broken: Ruleset = {
      ...base,
      schematron: [
        ...base.schematron,
        {
          kind: 'report',
          id: '_test_ctx',
          role: 'error',
          test: 'true()',
          context: '//onix:Product[error()]',
          text: 't',
          prefixes: base.schematron[0].prefixes,
        },
        {
          kind: 'report',
          id: '_test_node',
          role: 'warning',
          test: 'error()',
          context: '//onix:Product',
          text: 't',
          prefixes: base.schematron[0].prefixes,
        },
      ],
    };
    const p = prepared(
      message(
        release,
        '<Product><RecordReference>a</RecordReference></Product><Product><RecordReference>b</RecordReference></Product>',
      ),
    )!;
    const canonical = projection(evaluateSchematron(broken, p.document));
    const on = await evaluateSchematronScheduled(broken, p.document);
    expect(projection(on.findings)).toEqual(canonical);
    expect(on.findings.filter((f) => f.id === '_test_ctx')).toMatchObject([
      { path: '/', notEvaluable: { phase: 'context' } },
    ]);
    expect(on.findings.filter((f) => f.id === '_test_node').map((f) => f.path)).toEqual([
      '/ONIXMessage[1]/Product[1]',
      '/ONIXMessage[1]/Product[2]',
    ]);
    expect(on.findings.filter((f) => f.id === '_test_node').every((f) => f.notEvaluable?.phase === 'test')).toBe(true);
  });

  it('reports one progress unit per report, yields between reports and cancels cooperatively', async () => {
    const p = prepared(fixture('taint30/T7_global_rule_with_tainted_product.xml'))!;
    const index = indexElements(p.document);
    const progress: number[] = [];
    let yields = 0;
    await evaluateSchematronScheduled(p.ruleset, p.document, {
      index,
      controls: {
        onProgress: ({ stage, done, total }) => {
          expect(stage).toBe('SCHEMATRON');
          expect(total).toBe(p.ruleset.schematron.length);
          progress.push(done);
        },
        yield: async () => void yields++,
      },
    });
    expect(progress).toEqual(p.ruleset.schematron.map((_, i) => i + 1));
    expect(yields).toBe(p.ruleset.schematron.length);
    let seen = 0;
    await expect(
      evaluateSchematronScheduled(p.ruleset, p.document, { index, controls: { shouldCancel: () => ++seen > 2 } }),
    ).rejects.toBeInstanceOf(ValidationCancelledError);
  });
});
