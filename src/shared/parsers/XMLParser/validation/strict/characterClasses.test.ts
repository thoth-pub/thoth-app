// @vitest-environment node
import { createHash } from 'node:crypto';

import { evaluateXPath, evaluateXPathToBoolean } from 'fontoxpath';
import { describe, expect, it, vi } from 'vitest';

// Corpus-scale suites: under coverage instrumentation they exceed the default 5 s per test.
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

import { createCharacterClassSet, DERIVED_CHARACTER_CLASSES } from './characterClasses';

const OPTIONS = { language: evaluateXPath.XPATH_3_1_LANGUAGE };
/** The engine's own verdict: fn:matches over the exact pattern literal. */
const engineMatches = (text: string, pattern: string) =>
  evaluateXPathToBoolean('matches($s, $p)', null, null, { s: text, p: pattern }, OPTIONS);

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

const CJK =
  '(\\p{IsCJKUnifiedIdeographs}|\\p{IsCJKUnifiedIdeographsExtensionA}|\\p{IsCJKUnifiedIdeographsExtensionB}|\\p{IsCJKUnifiedIdeographsExtensionC}|\\p{IsCJKUnifiedIdeographsExtensionD}|[\\u{2B820}-\\u{2CEAF}]|[\\u{2CEB0}-\\u{2EBEF}])';

describe('derived character classes', () => {
  it('is the accepted xspattern-derived table (SPIKE-03 regex_classes_v2.json projection, 18 classes)', () => {
    expect(DERIVED_CHARACTER_CLASSES).toHaveLength(18);
    const projection = DERIVED_CHARACTER_CLASSES.map((c) => ({
      pattern: c.pattern,
      ranges: c.ranges.map(([lo, hi]) => [lo, hi]),
    }));
    expect(createHash('sha256').update(canonicalJson(projection), 'utf8').digest('hex')).toBe(
      'f983ad9fdf98bf01ad317c7e286f05404644d371076a03196243cb1ad99c4407',
    );
    for (const klass of DERIVED_CHARACTER_CLASSES) {
      let previous = -1;
      for (const [lo, hi] of klass.ranges) {
        expect(lo).toBeGreaterThan(previous);
        expect(hi).toBeGreaterThanOrEqual(lo);
        previous = hi;
      }
    }
  });

  it('carries the classes the accelerators need', () => {
    const set = createCharacterClassSet();
    for (const pattern of ['\\S', '[A-Za-z]', '[^(>|&gt;)]', '[^>]', '(\\n|\\r|\\t|[ -~])', '\\p{IsHebrew}']) {
      expect(set.bit(pattern), pattern).toBeDefined();
    }
    expect(set.bit('\\s')).toBeUndefined();
    expect(set.ranges('(\\n|\\r|\\t|[ -~])')).toEqual([
      [9, 10],
      [13, 13],
      [32, 126],
    ]);
    expect(set.ranges('(\\n|\\r|\\t|[ -~])')!.reduce((n, [lo, hi]) => n + hi - lo + 1, 0)).toBe(98);
  });

  it.each(DERIVED_CHARACTER_CLASSES.map((c) => [c.pattern.slice(0, 60), c] as const))(
    'agrees with fontoxpath at every range boundary of %s',
    (_label, klass) => {
      const set = createCharacterClassSet();
      const bit = set.bit(klass.pattern)!;
      const inClass = (cp: number) => klass.ranges.some(([lo, hi]) => cp >= lo && cp <= hi);
      const samples = new Set<number>();
      for (const [lo, hi] of klass.ranges) for (const cp of [lo - 1, lo, lo + 1, hi - 1, hi, hi + 1]) samples.add(cp);
      for (const cp of [0, 0x20, 0x41, 0x7f, 0xa0, 0xd7ff, 0xe000, 0xffff, 0x10000, 0x20000, 0x10ffff]) samples.add(cp);
      let checked = 0;
      for (const cp of samples) {
        if (cp < 0 || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) continue;
        const text = String.fromCodePoint(cp);
        const expected = inClass(cp);
        expect(engineMatches(text, klass.pattern), `U+${cp.toString(16)}`).toBe(expected);
        expect(set.has(cp, bit), `U+${cp.toString(16)}`).toBe(expected);
        expect(set.scan(text, bit) === bit, `scan U+${cp.toString(16)}`).toBe(expected);
        checked++;
      }
      expect(checked).toBeGreaterThan(5);
    },
  );

  it("reproduces the engine's \\S over the whole BMP, which is not JavaScript's \\S", () => {
    const set = createCharacterClassSet();
    const S = set.bit('\\S')!;
    let differsFromJs = 0;
    for (let cp = 0; cp <= 0xffff; cp++) {
      if (cp >= 0xd800 && cp <= 0xdfff) continue;
      const text = String.fromCharCode(cp);
      const engine = engineMatches(text, '\\S');
      expect(set.has(cp, S), `U+${cp.toString(16)}`).toBe(engine);
      if (/\S/.test(text) !== engine) differsFromJs++;
    }
    // XSD whitespace is exactly #x20 #x9 #xA #xD; JavaScript's \s also covers NBSP, U+2028, U+FEFF, ...
    expect(differsFromJs).toBeGreaterThan(0);
    expect(set.has(0xa0, S)).toBe(true);
    expect(engineMatches('\u00a0', '\\S')).toBe(true);
    expect(/\S/.test('\u00a0')).toBe(false);
  });

  it('decodes surrogate pairs to code points and never classifies a lone surrogate', () => {
    const set = createCharacterClassSet();
    const cjk = set.bit(
      DERIVED_CHARACTER_CLASSES.find((c) => c.pattern.startsWith('(\\p{IsCJKUnifiedIdeographs}'))!.pattern,
    )!;
    const S = set.bit('\\S')!;
    expect(set.scan('a\u{20000}b', cjk)).toBe(cjk);
    expect(engineMatches('\u{20000}', '\\p{IsCJKUnifiedIdeographsExtensionB}')).toBe(true);
    expect(
      engineMatches(
        '\u{20000}',
        CJK.replace(/\\u\{([0-9A-F]+)\}/g, (_m, hex: string) => String.fromCodePoint(parseInt(hex, 16))),
      ),
    ).toBe(true);
    expect(set.scan('ab', cjk)).toBe(0);
    expect(set.scan('\ud800', S)).toBe(0);
    expect(set.scan('\udc00', S | cjk)).toBe(0);
    expect(set.has(0x10ffff, S)).toBe(true);
  });

  it('early-exits once every wanted class is found and accumulates a prior mask', () => {
    const set = createCharacterClassSet();
    const S = set.bit('\\S')!;
    const hebrew = set.bit('\\p{IsHebrew}')!;
    expect(set.scan('   ', S | hebrew)).toBe(0);
    expect(set.scan('   x', S | hebrew)).toBe(S);
    expect(set.scan('א', S | hebrew)).toBe(S | hebrew);
    expect(set.scan('', S, hebrew)).toBe(hebrew);
  });
});
