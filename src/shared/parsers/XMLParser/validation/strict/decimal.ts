import { registerCustomXPathFunction } from 'fontoxpath';

/**
 * Exact xs:decimal arithmetic for the canonical strict evaluator (port of
 * SPIKE-02 `decimal.mjs`): fontoxpath's xs:decimal is float-backed, so the
 * AST rewrite routes decimal-typed arithmetic and comparisons through these
 * functions over decimal lexical strings with BigInt and an explicit scale.
 *
 * +, -, * are exact; div is exact when terminating, otherwise truncated to 18
 * fractional digits; comparisons are exact; an empty operand propagates
 * (arithmetic) or yields false (comparison), as in XPath.
 */
export const DECIMAL_NAMESPACE = 'urn:thoth:dec';

interface Decimal {
  readonly v: bigint;
  readonly scale: number;
}

const TEN = BigInt(10);
const ZERO = BigInt(0);
const PLUS = BigInt(1);
const MINUS = BigInt(-1);
const DIVISION_SCALE = 18;

function parse(input: string): Decimal {
  const s = String(input).trim();
  const m = /^([+-])?(\d*)(?:\.(\d*))?$/.exec(s);
  if (!m || (m[2] === '' && (m[3] === undefined || m[3] === ''))) {
    throw new Error('FORG0001: not a decimal: ' + s);
  }
  const sign = m[1] === '-' ? MINUS : PLUS;
  const integerPart = m[2] || '0';
  const fractionPart = m[3] || '';
  return { v: sign * BigInt(integerPart + fractionPart), scale: fractionPart.length };
}

function align(a: Decimal, b: Decimal): [bigint, bigint, number] {
  const scale = Math.max(a.scale, b.scale);
  return [a.v * TEN ** BigInt(scale - a.scale), b.v * TEN ** BigInt(scale - b.scale), scale];
}

function format(d: Decimal): string {
  let v = d.v;
  const negative = v < ZERO;
  if (negative) v = -v;
  let s = v.toString();
  if (d.scale > 0) {
    s = s.padStart(d.scale + 1, '0');
    s = s.slice(0, -d.scale) + '.' + s.slice(-d.scale);
    s = s.replace(/\.?0+$/, '');
    if (s.endsWith('.')) s = s.slice(0, -1);
  }
  if (s === '') s = '0';
  return (negative && s !== '0' ? '-' : '') + s;
}

const arithmetic: Record<'add' | 'sub' | 'mul' | 'div', (a: Decimal, b: Decimal) => Decimal> = {
  add: (a, b) => {
    const [x, y, scale] = align(a, b);
    return { v: x + y, scale };
  },
  sub: (a, b) => {
    const [x, y, scale] = align(a, b);
    return { v: x - y, scale };
  },
  mul: (a, b) => ({ v: a.v * b.v, scale: a.scale + b.scale }),
  div: (a, b) => {
    if (b.v === ZERO) throw new Error('FOAR0001: Division by zero');
    const numerator = a.v * TEN ** BigInt(DIVISION_SCALE + b.scale);
    const denominator = b.v * TEN ** BigInt(a.scale);
    return { v: numerator / denominator, scale: DIVISION_SCALE };
  },
};

function compare(a: Decimal, b: Decimal): number {
  const [x, y] = align(a, b);
  return x < y ? -1 : x > y ? 1 : 0;
}

let registered = false;

export function registerDecimalFunctions(): void {
  if (registered) return;
  registered = true;
  const register = (
    name: string,
    params: string[],
    returns: string,
    fn: Parameters<typeof registerCustomXPathFunction>[3],
  ) => registerCustomXPathFunction({ namespaceURI: DECIMAL_NAMESPACE, localName: name }, params, returns, fn);

  for (const [name, op] of Object.entries(arithmetic)) {
    register(name, ['xs:string?', 'xs:string?'], 'xs:string?', (_c, a: string | null, b: string | null) =>
      a == null || b == null ? null : format(op(parse(a), parse(b))),
    );
  }
  register('abs', ['xs:string?'], 'xs:string?', (_c, a: string | null) => {
    if (a == null) return null;
    const d = parse(a);
    return format({ v: d.v < ZERO ? -d.v : d.v, scale: d.scale });
  });
  register('neg', ['xs:string?'], 'xs:string?', (_c, a: string | null) => {
    if (a == null) return null;
    const d = parse(a);
    return format({ v: -d.v, scale: d.scale });
  });
  register('sum', ['xs:string*'], 'xs:string', (_c, values: string[]) => {
    let total: Decimal = { v: ZERO, scale: 0 };
    for (const value of values) total = arithmetic.add(total, parse(value));
    return format(total);
  });
  for (const [name, better] of [
    ['min', (c: number) => c < 0],
    ['max', (c: number) => c > 0],
  ] as const) {
    register(name, ['xs:string*'], 'xs:string?', (_c, values: string[]) => {
      if (!values.length) return null;
      let best = parse(values[0]);
      for (const value of values.slice(1)) {
        const d = parse(value);
        if (better(compare(d, best))) best = d;
      }
      return format(best);
    });
  }
  const tests: [string, (c: number) => boolean][] = [
    ['eq', (c) => c === 0],
    ['ne', (c) => c !== 0],
    ['lt', (c) => c < 0],
    ['le', (c) => c <= 0],
    ['gt', (c) => c > 0],
    ['ge', (c) => c >= 0],
  ];
  for (const [name, test] of tests) {
    register(name, ['xs:string?', 'xs:string?'], 'xs:boolean', (_c, a: string | null, b: string | null) =>
      a == null || b == null ? false : test(compare(parse(a), parse(b))),
    );
    // General comparison over sequences (existential).
    register(`g${name}`, ['xs:string*', 'xs:string*'], 'xs:boolean', (_c, as: string[], bs: string[]) => {
      for (const a of as) for (const b of bs) if (test(compare(parse(a), parse(b)))) return true;
      return false;
    });
  }
  register('todouble', ['xs:string?'], 'xs:double?', (_c, a: string | null) => (a == null ? null : Number(a)));
}
