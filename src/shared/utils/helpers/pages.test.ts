import { describe, expect, it } from 'vitest';

import { getPagesPlaceholder, isArabicNumeral } from './pages';

describe('isArabicNumeral', () => {
  it('returns false for empty string', () => {
    expect(isArabicNumeral('')).toBe(false);
  });

  it('returns false for non-numeric string', () => {
    expect(isArabicNumeral('abc')).toBe(false);
  });

  it('returns false for zero', () => {
    expect(isArabicNumeral('0')).toBe(false);
  });

  it('returns false for decimal numbers', () => {
    expect(isArabicNumeral('1.5')).toBe(false);
  });

  it('returns true for positive integers', () => {
    expect(isArabicNumeral('1')).toBe(true);
    expect(isArabicNumeral('100')).toBe(true);
  });
});

describe('getPagesPlaceholder', () => {
  it('formats with first page, last page, and plural page count', () => {
    expect(getPagesPlaceholder('1', '100', 100, 'p.', 'pp.')).toBe('1–100 (100pp.)');
  });

  it('formats with only first page and singular page count', () => {
    expect(getPagesPlaceholder('5', '', 1, 'p.', 'pp.')).toBe('5 (1p.)');
  });

  it('formats with only last page', () => {
    expect(getPagesPlaceholder('', '50', 0, 'p.', 'pp.')).toBe('50');
  });

  it('returns empty string when no values provided', () => {
    expect(getPagesPlaceholder('', '', 0, 'p.', 'pp.')).toBe('');
  });

  it('formats with only page count', () => {
    expect(getPagesPlaceholder('', '', 5, 'p.', 'pp.')).toBe(' (5pp.)');
  });
});
