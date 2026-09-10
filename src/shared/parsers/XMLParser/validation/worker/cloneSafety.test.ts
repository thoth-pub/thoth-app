// @vitest-environment node
import { Document } from 'slimdom';
import { describe, expect, it } from 'vitest';

import { assertStructuredCloneSafe, NotCloneSafeError } from './cloneSafety';

describe('assertStructuredCloneSafe', () => {
  it('accepts plain data, arrays, typed arrays and nulls', () => {
    expect(() =>
      assertStructuredCloneSafe({
        a: 1,
        b: 'x',
        c: true,
        d: null,
        e: undefined,
        f: [1, { g: [null, 'y'] }],
        h: new Uint8Array([1, 2]),
        i: Object.create(null),
      }),
    ).not.toThrow();
  });

  it.each([
    ['a function', { f: () => 1 }, '$.f', 'function'],
    ['a method on a nested object', { a: { serialize() {} } }, '$.a.serialize', 'function'],
    ['a class instance', { p: new (class Provenance {})() }, '$.p', 'Provenance instance'],
    ['a slimdom Document', { document: new Document() }, '$.document', 'Document instance'],
    ['a WeakMap', { w: new WeakMap() }, '$.w', 'WeakMap instance'],
    ['a Map', { m: new Map() }, '$.m', 'Map instance'],
    ['a symbol', { s: Symbol('x') }, '$.s', 'symbol'],
    ['a bigint', { n: 1n }, '$.n', 'bigint'],
  ])('rejects %s naming the path', (_label, value, path, reason) => {
    expect(() => assertStructuredCloneSafe(value)).toThrow(NotCloneSafeError);
    try {
      assertStructuredCloneSafe(value);
    } catch (error) {
      expect((error as NotCloneSafeError).path).toBe(path);
      expect((error as NotCloneSafeError).reason).toContain(reason);
    }
  });

  it('rejects a cyclic reference', () => {
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    expect(() => assertStructuredCloneSafe(cyclic)).toThrow(/cyclic/);
  });

  it('agrees with structuredClone on accepted values', () => {
    const value = { findings: [{ id: 'x', detail: { taint: ['a'] } }], xml: '<a/>', bytes: new Uint8Array([7]) };
    assertStructuredCloneSafe(value);
    expect(structuredClone(value)).toEqual(value);
  });
});
