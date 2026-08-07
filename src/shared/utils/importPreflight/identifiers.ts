import isbn3 from 'isbn3';

import type { ImportIdentifier, ImportPlan } from '@/src/shared/types';

/**
 * How DOIs and ISBNs are compared during a duplicate preflight.
 *
 * Comparison normalisation, not identity normalisation. The question these answer is only "are
 * these two strings the same identifier written differently?", and the answer follows Thoth's own
 * idea of how each identifier is written rather than inventing a broader one. Nothing here repairs
 * an invalid identifier — validity is the parsers' job, and a value that failed validation is
 * never turned into one that looks valid.
 */

/**
 * Trimmed and lowercased.
 *
 * Both sides are already in Thoth's standardised `https://doi.org/10.x/y` form — the app's
 * `doiValidation` requires it and the API's `Doi` parser rewrites anything else into it — so no
 * structural rewriting is needed or wanted here. Case is folded because Thoth itself treats DOIs
 * case-insensitively: the API looks them up with `lower(doi)` and its works filter is `ilike`.
 *
 * Blank is not an identifier and returns `null`, so a file full of works without DOIs cannot
 * produce a finding on the empty string.
 */
export const normaliseDoi = (doi: string): string | null => {
  const trimmed = doi.trim();

  return trimmed.length > 0 ? trimmed.toLowerCase() : null;
};

/**
 * The canonical hyphenless ISBN-13, via the same `isbn3` parser the app validates with.
 *
 * ISBN-13 is how Thoth writes an ISBN, on both sides of its boundary: `isbnValidation` parses
 * whatever the user types and stores `parsed.isbn13h`, and the API's `Isbn` type parses through
 * `Isbn13` and holds the hyphenated thirteen-digit form. So an ISBN-10 and its ISBN-13 are not
 * two identifiers Thoth might one day decide are related — they are one identifier, and Thoth has
 * already picked which way round to write it. Reading them as the same comparison value is
 * representation normalisation, not a claim about works.
 *
 * That also settles hyphenation, internal spacing and the ISBN-10 check digit's letter case: the
 * parser accepts all of those and returns the same canonical value, which is what the API's own
 * `replace(isbn, '-', '')` comparison does more crudely.
 *
 * `isbn3.parse` returns `null` for anything it cannot validate — a bad check digit, a wrong
 * length, letters — so an invalid value can never be converted into a valid-looking one here. It
 * falls back to the stripped, uppercased characters instead: two works carrying the same
 * malformed ISBN still signal to each other, which is worth knowing, and CSV rows do reach the
 * plan without ISBN validation. A fallback value cannot collide with a canonical one, because
 * anything equal to a real ISBN-13 would have parsed.
 *
 * Blank is not an identifier and returns `null`.
 */
export const normaliseIsbn = (isbn: string): string | null => {
  const parsed = isbn3.parse(isbn);

  if (parsed?.isValid && parsed.isbn13) return parsed.isbn13;

  const stripped = isbn.replace(/[\s-]/g, '').toUpperCase();

  return stripped.length > 0 ? stripped : null;
};

/** Stable key for one identifier, so basis and value cannot collide across bases. */
export const importIdentifierKey = ({ basis, value }: ImportIdentifier): string => `${basis}:${value}`;

/**
 * Every normalised identifier one planned work carries, deduplicated.
 *
 * Deduplicated *within the work* because a work with several publications can easily carry the
 * same ISBN twice, and one work repeating an identifier is not two records sharing one. Without
 * this, a single work would appear twice in its own finding and look like a duplicate of itself.
 */
export const collectWorkIdentifiers = (work: { doi: string; publications: { isbn: string }[] }): ImportIdentifier[] => {
  const identifiers: ImportIdentifier[] = [];
  const seen = new Set<string>();

  const add = (basis: ImportIdentifier['basis'], value: string | null) => {
    if (value === null) return;

    const identifier = { basis, value };
    const key = importIdentifierKey(identifier);

    if (seen.has(key)) return;

    seen.add(key);
    identifiers.push(identifier);
  };

  add('doi', normaliseDoi(work.doi));
  work.publications.forEach((publication) => add('isbn', normaliseIsbn(publication.isbn)));

  return identifiers;
};

/**
 * The distinct identifiers a plan's top-level works carry, in first-appearance order.
 *
 * Distinct because this is the lookup list: one backend query per value, never two for the same
 * one however many works carry it. Ordered by first appearance so the same plan always produces
 * the same list, which is what keeps the lookups — and the tests that assert on them —
 * reproducible.
 *
 * `plan.chapters` are not collected. Chapter identity is a harder version of the same postponed
 * question, and this stage does not open it.
 */
export const collectImportIdentifiers = (plan: ImportPlan): ImportIdentifier[] => {
  const identifiers: ImportIdentifier[] = [];
  const seen = new Set<string>();

  plan.works.forEach((work) => {
    collectWorkIdentifiers(work).forEach((identifier) => {
      const key = importIdentifierKey(identifier);

      if (seen.has(key)) return;

      seen.add(key);
      identifiers.push(identifier);
    });
  });

  return identifiers;
};
