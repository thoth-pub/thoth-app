import { describe, expect, it } from 'vitest';

import { convertGToOz, convertInToMm, convertMmToIn, convertOzToG } from './dimensions';

describe('convertMmToIn', () => {
  it('converts millimetres to inches', () => {
    expect(convertMmToIn(25.4)).toBe(1);
  });

  it('returns 0 for 0 input', () => {
    expect(convertMmToIn(0)).toBe(0);
  });
});

describe('convertInToMm', () => {
  it('converts inches to millimetres', () => {
    expect(convertInToMm(1)).toBe(25.4);
  });

  it('returns 0 for 0 input', () => {
    expect(convertInToMm(0)).toBe(0);
  });
});

describe('convertOzToG', () => {
  it('converts ounces to grams', () => {
    expect(convertOzToG(1)).toBe(28.35);
  });

  it('returns 0 for 0 input', () => {
    expect(convertOzToG(0)).toBe(0);
  });
});

describe('convertGToOz', () => {
  it('converts grams to ounces', () => {
    expect(convertGToOz(28.35)).toBe(1);
  });

  it('returns 0 for 0 input', () => {
    expect(convertGToOz(0)).toBe(0);
  });
});
