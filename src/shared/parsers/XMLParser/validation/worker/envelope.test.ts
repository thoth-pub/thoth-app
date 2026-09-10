// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { classifyEngine, ENGINE_ENVELOPES, evaluateEnvelope, exceedsByteCeiling, MEGABYTE } from './envelope';
import type { EngineClass, ProductCountEvidence } from './protocol';

const measured = (count: number): ProductCountEvidence => ({ measured: true, count });

describe('engine classification', () => {
  it.each([
    [
      'installed desktop Chrome',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
      'chromium',
    ],
    [
      'headless Chrome',
      'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/152.0.0.0 Safari/537.36',
      'chromium',
    ],
    [
      'Edge (Chromium)',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',
      'chromium',
    ],
    ['desktop Firefox', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:155.0) Gecko/20100101 Firefox/155.0', 'gecko'],
    [
      'desktop Safari',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
      'webkit',
    ],
    [
      'Android Chrome (phone)',
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36',
      'mobile',
    ],
    ['Android Firefox (tablet)', 'Mozilla/5.0 (Android 14; Tablet; rv:155.0) Gecko/155.0 Firefox/155.0', 'mobile'],
    [
      'iPhone Safari',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      'mobile',
    ],
    ['unknown desktop engine', 'Mozilla/5.0 (X11; Linux x86_64) Servo/0.0.1', 'unknown'],
    ['empty user agent', '', 'unknown'],
  ])('%s -> %s', (_label, userAgent, engine) => {
    expect(classifyEngine(userAgent)).toBe(engine);
  });
});

describe('approved envelope thresholds', () => {
  it('uses 1 MB = 1,000,000 bytes and the exact #196 limits', () => {
    expect(MEGABYTE).toBe(1_000_000);
    expect(ENGINE_ENVELOPES).toEqual({
      chromium: { normal: { bytes: 20_000_000, products: 1_000 }, warning: { bytes: 36_000_000, products: 1_700 } },
      gecko: { normal: { bytes: 10_000_000, products: 500 }, warning: { bytes: 20_000_000, products: 1_000 } },
    });
  });

  const cases: [engine: 'chromium' | 'gecko', bytes: number, products: number, verdict: string, exceeded: string[]][] =
    [
      // Chromium byte boundaries (Products well inside)
      ['chromium', 20_000_000, 1, 'NORMAL', []],
      ['chromium', 20_000_001, 1, 'WARNING', ['bytes']],
      ['chromium', 36_000_000, 1, 'WARNING', ['bytes']],
      ['chromium', 36_000_001, 1, 'REFUSE', ['bytes']],
      // Chromium Product boundaries (bytes well inside)
      ['chromium', 1, 1_000, 'NORMAL', []],
      ['chromium', 1, 1_001, 'WARNING', ['products']],
      ['chromium', 1, 1_700, 'WARNING', ['products']],
      ['chromium', 1, 1_701, 'REFUSE', ['products']],
      // Gecko byte boundaries
      ['gecko', 10_000_000, 1, 'NORMAL', []],
      ['gecko', 10_000_001, 1, 'WARNING', ['bytes']],
      ['gecko', 20_000_000, 1, 'WARNING', ['bytes']],
      ['gecko', 20_000_001, 1, 'REFUSE', ['bytes']],
      // Gecko Product boundaries
      ['gecko', 1, 500, 'NORMAL', []],
      ['gecko', 1, 501, 'WARNING', ['products']],
      ['gecko', 1, 1_000, 'WARNING', ['products']],
      ['gecko', 1, 1_001, 'REFUSE', ['products']],
      // The more restrictive dimension wins
      ['chromium', 20_000_000, 1_001, 'WARNING', ['products']],
      ['chromium', 36_000_000, 1_701, 'REFUSE', ['products']],
      ['chromium', 36_000_001, 1_000, 'REFUSE', ['bytes']],
      ['chromium', 36_000_001, 1_701, 'REFUSE', ['bytes', 'products']],
      ['gecko', 10_000_001, 501, 'WARNING', ['bytes', 'products']],
      ['gecko', 20_000_001, 1, 'REFUSE', ['bytes']],
      ['gecko', 20_000_000, 1_001, 'REFUSE', ['products']],
      ['chromium', 0, 0, 'NORMAL', []],
    ];
  it.each(cases)('%s: %d bytes, %d Products -> %s %j', (engine, bytes, products, verdict, exceeded) => {
    expect(evaluateEnvelope(engine, bytes, measured(products))).toEqual({
      engine,
      bytes,
      products: measured(products),
      verdict,
      limits: ENGINE_ENVELOPES[engine],
      exceeded,
    });
  });

  it.each(['webkit', 'mobile', 'unknown'] as EngineClass[])(
    '%s is deterministically unsupported at any size',
    (engine) => {
      for (const bytes of [0, 1, 20_000_000, 36_000_001]) {
        expect(evaluateEnvelope(engine, bytes, measured(1))).toEqual({
          engine,
          bytes,
          products: measured(1),
          verdict: 'UNSUPPORTED',
          limits: null,
          exceeded: [],
        });
      }
      expect(exceedsByteCeiling(engine, 1_000_000_000)).toBe(false);
    },
  );

  it('refuses on the byte ceiling alone without a Product count', () => {
    expect(exceedsByteCeiling('chromium', 36_000_000)).toBe(false);
    expect(exceedsByteCeiling('chromium', 36_000_001)).toBe(true);
    expect(exceedsByteCeiling('gecko', 20_000_001)).toBe(true);
    const evidence = evaluateEnvelope('chromium', 36_000_001, { measured: false, reason: 'BYTE_CEILING_EXCEEDED' });
    expect(evidence.verdict).toBe('REFUSE');
    expect(evidence.exceeded).toEqual(['bytes']);
    expect(evidence.products).toEqual({ measured: false, reason: 'BYTE_CEILING_EXCEEDED' });
  });

  it('never invents a Product verdict when sizing could not measure', () => {
    const unmeasured: ProductCountEvidence = { measured: false, reason: 'SIZING_PARSE_ERROR', error: 'x' };
    expect(evaluateEnvelope('gecko', 1, unmeasured)).toMatchObject({
      verdict: 'NORMAL',
      exceeded: [],
      products: unmeasured,
    });
    expect(evaluateEnvelope('gecko', 10_000_001, unmeasured)).toMatchObject({
      verdict: 'WARNING',
      exceeded: ['bytes'],
    });
    expect(evaluateEnvelope('gecko', 20_000_001, unmeasured)).toMatchObject({ verdict: 'REFUSE', exceeded: ['bytes'] });
  });
});
