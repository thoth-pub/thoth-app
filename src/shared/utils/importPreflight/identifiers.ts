import type { ImportIdentifier, ImportPlan } from '@/src/shared/types';

/**
 * How DOIs and ISBNs are compared during a duplicate preflight.
 *
 * Comparison normalisation, not identity normalisation. The question these answer is only "are
 * these two strings the same identifier written differently?", and they are deliberately timid
 * about it: a form this stage does not already know to be equivalent stays a separate value, and
 * two works that write the same identifier differently enough get no finding rather than a wrong
 * one. Nothing here repairs an invalid identifier — validity is the parsers' job, and a value
 * that failed validation is not made to match anything by being tidied up here.
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
 * Hyphens and whitespace removed, uppercased.
 *
 * ISBNs are written both hyphenated and bare, and Thoth stores the hyphenated ISBN-13 while an
 * ONIX ProductIdentifier or a CSV cell usually carries the bare digits. Those are the same
 * identifier, and the API agrees: its publications filter compares `replace(isbn, '-', '')`.
 * Uppercasing is for the ISBN-10 check digit `X`.
 *
 * An ISBN-10 and the ISBN-13 it converts to stay *different* values. The conversion is a real
 * one, but performing it here would be this stage deciding that two differently-identified
 * publications are the same thing, which is the identity question being left open.
 */
export const normaliseIsbn = (isbn: string): string | null => {
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
