import { describe, expect, it } from 'vitest';

import { romanNumeralValidation } from '../validations';
import { getPagesPlaceholder, interpretPageRange, isArabicNumeral, parsePageLabel } from './pages';

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

describe('parsePageLabel', () => {
  it('treats an absent value as absent rather than as a Roman numeral', () => {
    // The shared Roman grammar matches the empty string, so absence has to be
    // decided before the numbering schemes are consulted.
    expect(parsePageLabel('')).toBeNull();
    expect(parsePageLabel(undefined)).toBeNull();
    expect(parsePageLabel(null)).toBeNull();
  });

  it.each([
    ['1', 1],
    ['20', 20],
    ['125', 125],
  ])('parses the Arabic label %s as %i', (label, value) => {
    expect(parsePageLabel(label)).toEqual({ scheme: 'arabic', value });
  });

  it.each(['0', '1.5', 'abc'])('rejects %s, which isArabicNumeral already rejects', (label) => {
    expect(parsePageLabel(label)).toBeNull();
  });

  it.each([
    ['I', 1],
    ['IV', 4],
    ['XI', 11],
    ['MCMXCIX', 1999],
  ])('parses the Roman label %s as %i', (label, value) => {
    expect(parsePageLabel(label)).toEqual({ scheme: 'roman', value });
  });

  it.each([
    ['i', 1],
    ['iv', 4],
    ['mcmxcix', 1999],
  ])('keeps the current case acceptance and parses %s as %i', (label, value) => {
    expect(parsePageLabel(label)).toEqual({ scheme: 'roman', value });
  });

  it.each(['IIII', 'VV', 'IC', 'XXXX', 'MMMM'])('keeps the malformed Roman spelling %s invalid', (label) => {
    expect(parsePageLabel(label)).toBeNull();
  });

  it.each([
    ['A1', 'A', 1],
    ['A20', 'A', 20],
    ['B1', 'B', 1],
    ['B20', 'B', 20],
    ['Z125', 'Z', 125],
    ['A8', 'A', 8],
    ['A18', 'A', 18],
    // The digits are held to isArabicNumeral, so they read exactly as the same digits alone would.
    ['A01', 'A', 1],
    // A single Roman symbol is still just a one-letter prefix; both rules yield the same prefix.
    ['I3', 'I', 3],
    ['X3', 'X', 3],
  ])('parses the prefixed Arabic label %s as %s%i', (label, prefix, value) => {
    expect(parsePageLabel(label)).toEqual({ scheme: 'prefixedArabic', value, prefix });
  });

  it.each([
    ['III3', 'III', 3],
    ['III6', 'III', 6],
    ['IV10', 'IV', 10],
    ['XIV12', 'XIV', 12],
    ['MMMCMXCIX1', 'MMMCMXCIX', 1],
    // The suffix keeps the positive-Arabic semantics a one-letter prefix has.
    ['III03', 'III', 3],
  ])(
    'parses the Roman-prefixed Arabic label %s as %s%i, keeping the prefix out of the value',
    (label, prefix, value) => {
      expect(parsePageLabel(label)).toEqual({ scheme: 'prefixedArabic', value, prefix });
    },
  );

  it.each(['a1', 'AA1', '1A', 'A0', 'A-1', 'Appendix1', 'A 1', ' A1', 'A1.5'])(
    'rejects %s, which is not a permitted prefix followed by a positive page number',
    (label) => {
      expect(parsePageLabel(label)).toBeNull();
    },
  );

  it.each([
    // Arbitrary multi-letter alphabetic prefixes.
    'AA3',
    'ABC3',
    'IIIA3',
    // Malformed Roman prefixes under the strict grammar.
    'IIX3',
    'VV3',
    'IIII3',
    'MMMM3',
    // Compound prefixes are uppercase only, unlike standalone Roman labels.
    'iii3',
    'Iii3',
    // Custom text, wrong direction, non-positive or non-integer positions, separators.
    'Appendix3',
    '3III',
    'III0',
    'III3.5',
    'III-3',
    'III 3',
  ])('rejects the compound label %s', (label) => {
    expect(parsePageLabel(label)).toBeNull();
  });

  it.each(['II', 'III', 'IV', 'XIV', 'MCMXCIX', 'MMMCMXCIX', 'IIX', 'VV', 'IIII', 'MMMM', 'IC', 'XM', 'AA', 'ABC'])(
    'accepts %s as a multi-letter prefix exactly when the shared validator accepts it as a Roman numeral',
    (prefix) => {
      // Multi-letter prefixes are admitted only through the copied strict Roman grammar, so they
      // are pinned to the shared validator the same way standalone Roman labels are below.
      expect(parsePageLabel(`${prefix}3`) !== null).toBe(romanNumeralValidation.safeParse(prefix).success);
    },
  );

  it.each([
    'I',
    'IV',
    'XI',
    'MCMXCIX',
    'mcmxcix',
    'MMMCMXCIX',
    'IIII',
    'VV',
    'IC',
    'XXXX',
    'MMMM',
    'IL',
    'XM',
    'VX',
    'ABC',
  ])('reads the Roman grammar for %s exactly as the shared validator does', (label) => {
    // The pattern this helper applies is a copy of the one in src/shared/utils/validations, which
    // cannot be imported without closing an import loop. This is what keeps the copy honest.
    expect(parsePageLabel(label)?.scheme === 'roman').toBe(romanNumeralValidation.safeParse(label).success);
  });
});

describe('interpretPageRange', () => {
  it.each([
    ['1', '20', 20],
    ['I', 'XI', 11],
    ['IV', 'IX', 6],
    ['A1', 'A20', 20],
    ['B6', 'B20', 15],
  ])('accepts the same-scheme range %s to %s and counts %i pages', (firstPage, lastPage, pageCount) => {
    expect(interpretPageRange(firstPage, lastPage)).toMatchObject({ status: 'valid', pageCount });
  });

  it.each([
    ['A1', '20', 20],
    ['B6', '20', 15],
  ])('accepts the prefixed shorthand %s to %s and counts %i pages', (firstPage, lastPage, pageCount) => {
    expect(interpretPageRange(firstPage, lastPage)).toMatchObject({ status: 'valid', pageCount });
  });

  it.each([
    ['7', '7'],
    ['V', 'V'],
    ['A3', 'A3'],
    ['A3', '3'],
  ])('accepts the equal endpoints %s to %s as a one-page range', (firstPage, lastPage) => {
    expect(interpretPageRange(firstPage, lastPage)).toMatchObject({ status: 'valid', pageCount: 1 });
  });

  it.each([
    ['I', '10'],
    ['1', 'X'],
    ['I', 'A10'],
    ['A1', 'XI'],
    ['1', 'A20'],
  ])('rejects the mixed-scheme range %s to %s', (firstPage, lastPage) => {
    expect(interpretPageRange(firstPage, lastPage)).toMatchObject({
      status: 'incompatibleSchemes',
      pageCount: null,
    });
  });

  it('rejects a prefix change between explicitly prefixed endpoints', () => {
    expect(interpretPageRange('A1', 'B20')).toMatchObject({ status: 'prefixMismatch', pageCount: null });
  });

  it.each([
    ['20', '1'],
    ['XI', 'I'],
    ['A20', 'A1'],
    ['A20', '1'],
  ])('rejects the descending range %s to %s', (firstPage, lastPage) => {
    expect(interpretPageRange(firstPage, lastPage)).toMatchObject({ status: 'descending', pageCount: null });
  });

  it('reports an invalid first page independently of the last page', () => {
    expect(interpretPageRange('a1', '20')).toMatchObject({ status: 'invalidFirstPage', pageCount: null });
    expect(interpretPageRange('Appendix1', '')).toMatchObject({ status: 'invalidFirstPage', pageCount: null });
  });

  it('reports an invalid last page independently of the first page', () => {
    expect(interpretPageRange('1', 'a20')).toMatchObject({ status: 'invalidLastPage', pageCount: null });
    expect(interpretPageRange('', 'AA20')).toMatchObject({ status: 'invalidLastPage', pageCount: null });
  });

  it.each([
    ['1', ''],
    ['', '20'],
    ['A1', undefined],
    ['I', null],
  ])('derives no page count from the incomplete range %s to %s', (firstPage, lastPage) => {
    expect(interpretPageRange(firstPage, lastPage)).toMatchObject({ status: 'incomplete', pageCount: null });
  });

  it('reports an entirely empty range as empty rather than incomplete', () => {
    expect(interpretPageRange('', '')).toMatchObject({ status: 'empty', pageCount: null });
    expect(interpretPageRange(undefined, undefined)).toMatchObject({ status: 'empty', pageCount: null });
  });

  it('exposes the parsed endpoints so callers never reparse the labels', () => {
    expect(interpretPageRange('B6', '20')).toEqual({
      status: 'valid',
      first: { scheme: 'prefixedArabic', value: 6, prefix: 'B' },
      last: { scheme: 'arabic', value: 20 },
      pageCount: 15,
    });
  });

  it.each([
    ['A8', 'A18', 11],
    ['A8', '18', 11],
  ])('keeps the one-letter prefixed range %s to %s at %i pages', (firstPage, lastPage, pageCount) => {
    expect(interpretPageRange(firstPage, lastPage)).toMatchObject({ status: 'valid', pageCount });
  });

  it.each([
    ['III3', 'III6', 4],
    ['III3', '6', 4],
    ['XIV10', 'XIV12', 3],
    ['III3', 'III3', 1],
    ['III3', '3', 1],
  ])('accepts the Roman-prefixed range %s to %s and counts %i pages', (firstPage, lastPage, pageCount) => {
    expect(interpretPageRange(firstPage, lastPage)).toMatchObject({ status: 'valid', pageCount });
  });

  it('keeps a Roman prefix out of the page arithmetic', () => {
    // XIV is sequence metadata only: were it folded into the position, 10 and 12 would not be the values.
    expect(interpretPageRange('XIV10', '12')).toEqual({
      status: 'valid',
      first: { scheme: 'prefixedArabic', value: 10, prefix: 'XIV' },
      last: { scheme: 'arabic', value: 12 },
      pageCount: 3,
    });
  });

  it.each([
    ['III3', 'IV6'],
    ['XIV10', 'XV12'],
    ['I3', 'III6'],
    ['A3', 'III6'],
  ])('rejects the prefix change %s to %s by comparing the complete prefix', (firstPage, lastPage) => {
    expect(interpretPageRange(firstPage, lastPage)).toMatchObject({ status: 'prefixMismatch', pageCount: null });
  });

  it.each([
    ['III6', 'III3'],
    ['III6', '3'],
  ])('rejects the descending Roman-prefixed range %s to %s', (firstPage, lastPage) => {
    expect(interpretPageRange(firstPage, lastPage)).toMatchObject({ status: 'descending', pageCount: null });
  });

  it.each([
    ['III3', 'XI'],
    ['3', 'III6'],
    ['III', 'III6'],
  ])('rejects the mixed-scheme Roman-prefixed range %s to %s', (firstPage, lastPage) => {
    expect(interpretPageRange(firstPage, lastPage)).toMatchObject({
      status: 'incompatibleSchemes',
      pageCount: null,
    });
  });

  it('reports an invalid compound endpoint against that endpoint alone', () => {
    expect(interpretPageRange('iii3', '6')).toMatchObject({ status: 'invalidFirstPage', pageCount: null });
    expect(interpretPageRange('III3', 'IIX6')).toMatchObject({ status: 'invalidLastPage', pageCount: null });
  });

  it.each([
    ['III3', ''],
    ['', 'XIV12'],
  ])('derives no page count from the incomplete Roman-prefixed range %s to %s', (firstPage, lastPage) => {
    expect(interpretPageRange(firstPage, lastPage)).toMatchObject({ status: 'incomplete', pageCount: null });
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

  it('preserves the entered labels rather than normalising them', () => {
    expect(getPagesPlaceholder('A1', '20', 20, 'p.', 'pp.')).toBe('A1–20 (20pp.)');
    expect(getPagesPlaceholder('IV', 'IX', 6, 'p.', 'pp.')).toBe('IV–IX (6pp.)');
    expect(getPagesPlaceholder('III3', '6', 4, 'p.', 'pp.')).toBe('III3–6 (4pp.)');
  });
});
