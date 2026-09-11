import type { EngineClass, EnvelopeEvidence, EnvelopeLimits, ProductCountEvidence } from './protocol';

/**
 * Desktop engine/file envelope of the approved browser validation runtime
 * (thoth#895 final decision, thoth-app#196). Operational policy thresholds,
 * not ONIX validity rules: `1 MB = 1,000,000 bytes` of raw source, Products
 * are namespace-aware start-tag counts.
 *
 * Safari/WebKit stays disabled until a real-Safari acceptance run and a
 * separate engineering-control decision; phones/tablets and unrecognised
 * desktop engines are outside the product contract. All of these are
 * deterministic SUPPORT outcomes, never source invalidity. No RAM-based
 * narrowing exists: `navigator.deviceMemory` never changes an engine class.
 */
export const MEGABYTE = 1_000_000;

export const ENGINE_ENVELOPES: Readonly<Record<'chromium' | 'gecko', EnvelopeLimits>> = {
  chromium: {
    normal: { bytes: 20 * MEGABYTE, products: 1_000 },
    warning: { bytes: 36 * MEGABYTE, products: 1_700 },
  },
  gecko: {
    normal: { bytes: 10 * MEGABYTE, products: 500 },
    warning: { bytes: 20 * MEGABYTE, products: 1_000 },
  },
};

/** Engine class from a user-agent string; phones/tablets are recognised before any engine. */
export function classifyEngine(userAgent: string): EngineClass {
  if (/\b(Mobile|Android|iPhone|iPad|iPod)\b/.test(userAgent)) return 'mobile';
  if (/\bFirefox\/\d/.test(userAgent) && /\bGecko\//.test(userAgent)) return 'gecko';
  if (/\b(Chrome|Chromium|HeadlessChrome)\/\d/.test(userAgent)) return 'chromium';
  if (/\bAppleWebKit\//.test(userAgent) && /\bSafari\/\d/.test(userAgent)) return 'webkit';
  return 'unknown';
}

export function limitsFor(engine: EngineClass): EnvelopeLimits | null {
  return engine === 'chromium' || engine === 'gecko' ? ENGINE_ENVELOPES[engine] : null;
}

/** True when the raw byte length alone already refuses the source on this engine. */
export function exceedsByteCeiling(engine: EngineClass, bytes: number): boolean {
  const limits = limitsFor(engine);
  return limits !== null && bytes > limits.warning.bytes;
}

/**
 * The verdict from raw bytes and the Product count: the more restrictive
 * dimension wins. An unmeasured Product count never refuses or warns by
 * itself; the evidence records why it is missing.
 */
export function evaluateEnvelope(engine: EngineClass, bytes: number, products: ProductCountEvidence): EnvelopeEvidence {
  const limits = limitsFor(engine);
  if (!limits) return { engine, bytes, products, verdict: 'UNSUPPORTED', limits: null, exceeded: [] };
  const count = products.measured ? products.count : null;
  const refused: ('bytes' | 'products')[] = [];
  if (bytes > limits.warning.bytes) refused.push('bytes');
  if (count !== null && count > limits.warning.products) refused.push('products');
  if (refused.length) return { engine, bytes, products, verdict: 'REFUSE', limits, exceeded: refused };
  const warned: ('bytes' | 'products')[] = [];
  if (bytes > limits.normal.bytes) warned.push('bytes');
  if (count !== null && count > limits.normal.products) warned.push('products');
  if (warned.length) return { engine, bytes, products, verdict: 'WARNING', limits, exceeded: warned };
  return { engine, bytes, products, verdict: 'NORMAL', limits, exceeded: [] };
}
