import { convertRomanToArabic } from '../conversions/romans';

export const isArabicNumeral = (value: string) => {
  if (!value || value.length === 0) return false;

  const num = Number(value);

  return Number.isInteger(num) && num >= 1;
};

/**
 * The strict Roman grammar page labels are held to, byte for byte the one
 * `numberOrRomanNumeralValidation` applies in `src/shared/utils/validations`.
 *
 * It is spelled out again here rather than imported because that module is not a leaf: it reaches
 * `@/src/shared/constants`, whose `formFields` entry imports the `src/shared/utils` barrel that
 * re-exports this file. Importing it would close that loop around a helper every page consumer
 * loads. The equivalence is not left to inspection — `pages.test.ts` pins this grammar against the
 * exported `romanNumeralValidation` so the two cannot drift apart unnoticed.
 *
 * Note that it matches the empty string: every group is optional. Absence is therefore decided
 * before any scheme is consulted, so that a blank page field is not read as a Roman numeral.
 */
const ROMAN_PATTERN = /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;

/**
 * One uppercase ASCII letter followed by the digits of a page number, as used by publishers who
 * number chapters `A1`–`A20`. The digits are held to {@link isArabicNumeral} rather than to a
 * second rule of their own, so `A0` is rejected for exactly the reason `0` is.
 */
const PREFIXED_ARABIC_PATTERN = /^([A-Z])([0-9]+)$/;

/** The page-numbering conventions a chapter page label may be written in. */
export type PageNumberingScheme = 'arabic' | 'roman' | 'prefixedArabic';

export type PageLabel = {
  scheme: PageNumberingScheme;
  /** The label's position on the page sequence, used for ordering and counting only. */
  value: number;
  /** The uppercase letter of a `prefixedArabic` label; absent for the other schemes. */
  prefix?: string;
};

export type PageRangeStatus =
  /** Neither endpoint was supplied. */
  | 'empty'
  /** Exactly one endpoint was supplied, and it is a valid label. */
  | 'incomplete'
  | 'invalidFirstPage'
  | 'invalidLastPage'
  /** Both endpoints are valid labels, but their numbering schemes cannot form a range. */
  | 'incompatibleSchemes'
  /** Both endpoints are explicitly prefixed, but with different letters. */
  | 'prefixMismatch'
  | 'descending'
  | 'valid';

export type PageRangeInterpretation = {
  status: PageRangeStatus;
  first: PageLabel | null;
  last: PageLabel | null;
  /** The inclusive page count, and only for a `valid` range. */
  pageCount: number | null;
};

const isAbsent = (value?: string | null): value is null | undefined | '' => !value || value.length === 0;

/**
 * A page label read as its numbering scheme and position, or `null` when the value is absent or is
 * not one of the three supported conventions.
 *
 * This is the single seam page handling is built on: field validation, pair compatibility, range
 * ordering and the automatic page count all read labels through it, so there is one grammar to
 * agree with rather than one per caller. The schemes are mutually exclusive — Arabic labels carry
 * no letters, Roman labels no digits, and prefixed labels exactly one of each — so the order the
 * schemes are tried in does not decide any value.
 *
 * Conversion is never used as validation: a Roman label is converted only once
 * {@link ROMAN_PATTERN} has accepted it, which is also what makes the conversion total.
 */
export const parsePageLabel = (value?: string | null): PageLabel | null => {
  if (isAbsent(value)) return null;

  if (isArabicNumeral(value)) return { scheme: 'arabic', value: Number(value) };

  const prefixed = PREFIXED_ARABIC_PATTERN.exec(value);

  if (prefixed) {
    const [, prefix, digits] = prefixed;

    return isArabicNumeral(digits) ? { scheme: 'prefixedArabic', value: Number(digits), prefix } : null;
  }

  // Upper-casing before the test is what makes `iv` and `IV` the one numeral they are, exactly as
  // the generic validator has always treated them.
  if (ROMAN_PATTERN.test(value.toUpperCase())) return { scheme: 'roman', value: convertRomanToArabic(value) };

  return null;
};

/** Whether a supplied value is a page label in one of the supported schemes. Absence is not. */
export const isPageLabel = (value?: string | null): boolean => parsePageLabel(value) !== null;

/**
 * The endpoint scheme pairs that can form a range.
 *
 * A prefixed first page may be closed by a plain Arabic last page — `A1`–`20` is how the
 * convention is ordinarily written, with the prefix understood to carry across. The shorthand is
 * deliberately one-directional: `1`–`A20` states a prefix the range never opened with, so it is a
 * mistake rather than an abbreviation.
 */
const canFormRange = (first: PageLabel, last: PageLabel) =>
  first.scheme === last.scheme || (first.scheme === 'prefixedArabic' && last.scheme === 'arabic');

/**
 * The two page fields read as one range: which endpoints are present and valid, whether together
 * they describe an ascending range in a single numbering scheme, and how many pages that covers.
 *
 * The status is deliberately specific enough for a form to explain the failure, and `pageCount` is
 * populated only for a complete valid range — an incomplete or contradictory range yields `null`
 * rather than a number derived from half of it.
 */
export const interpretPageRange = (firstPage?: string | null, lastPage?: string | null): PageRangeInterpretation => {
  const hasFirst = !isAbsent(firstPage);
  const hasLast = !isAbsent(lastPage);

  const first = parsePageLabel(firstPage);
  const last = parsePageLabel(lastPage);

  if (!hasFirst && !hasLast) return { status: 'empty', first: null, last: null, pageCount: null };

  if (hasFirst && !first) return { status: 'invalidFirstPage', first: null, last, pageCount: null };

  if (hasLast && !last) return { status: 'invalidLastPage', first, last: null, pageCount: null };

  if (!first || !last) return { status: 'incomplete', first, last, pageCount: null };

  if (!canFormRange(first, last)) return { status: 'incompatibleSchemes', first, last, pageCount: null };

  if (last.prefix !== undefined && first.prefix !== last.prefix) {
    return { status: 'prefixMismatch', first, last, pageCount: null };
  }

  if (last.value < first.value) return { status: 'descending', first, last, pageCount: null };

  return { status: 'valid', first, last, pageCount: last.value - first.value + 1 };
};

export const getPagesPlaceholder = (
  firstPage: string,
  lastPage: string,
  pageCount: number,
  pagePlaceholder: string,
  pagesPlaceholder: string,
) => {
  let result = '';

  if (firstPage.length > 0) {
    result += firstPage;
  }

  if (lastPage.length > 0 && result.length > 0) {
    result += `–${lastPage}`;
  }

  if (lastPage.length > 0 && result.length === 0) {
    result += lastPage;
  }

  if (pageCount > 0) {
    result += ` (${pageCount}${pageCount > 1 ? pagesPlaceholder : pagePlaceholder})`;
  }

  return result;
};
