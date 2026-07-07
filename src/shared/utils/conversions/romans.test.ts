import { describe, expect, it } from 'vitest';

import { convertArabicToRoman, convertRomanToArabic } from './romans';

describe('convertRomanToArabic', () => {
  it('converts a valid roman numeral to arabic', () => {
    expect(convertRomanToArabic('IV')).toBe(4);
  });

  it('converts larger roman numerals', () => {
    expect(convertRomanToArabic('MCMXCIX')).toBe(1999);
  });

  it('returns 0 for invalid input', () => {
    expect(convertRomanToArabic('invalid')).toBe(0);
  });
});

describe('convertArabicToRoman', () => {
  it('converts a valid arabic number to roman', () => {
    expect(convertArabicToRoman(4)).toBe('IV');
  });

  it('converts larger numbers', () => {
    expect(convertArabicToRoman(1999)).toBe('MCMXCIX');
  });

  it('returns "nulla" for 0 (library behaviour)', () => {
    expect(convertArabicToRoman(0)).toBe('nulla');
  });
});
