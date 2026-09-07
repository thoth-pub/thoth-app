import type { OnixSourceDiagnostic, OnixSourcePath } from '../../types';

/**
 * The normalised-source layer: what an ONIX message says, read once, deterministically, before
 * anything asks what Thoth can do with it.
 *
 * `@5stones/onix` types describe a tidier document than `fast-xml-parser` produces. A repeatable
 * composite is an object when it occurs once and an array when it repeats; a missing one is
 * simply absent. Every reader that meets that ambiguity on its own writes its own
 * `Array.isArray(…) ? … : …`, and the ones that forget silently read the first occurrence of a
 * construct the standard says may repeat. This module normalises the ambiguity once, and keeps
 * the two things later reducers need in order not to have to re-read the file: source order, and
 * the exact path each fact came from.
 *
 * Nothing here looks anything up in Thoth, mutates anything, or fetches any URL a file happens
 * to contain. It is deterministic over the parsed document and nothing else.
 */

/** The root of every source path. */
export const ONIX_MESSAGE_PATH: OnixSourcePath = 'ONIXMessage';

/**
 * The path of a child element.
 *
 * `occurrence` is given for a repeatable element and numbers it from one in source order. It is
 * given even when the element occurs once, so that a singleton and a one-element array — which
 * the runtime distinguishes and the standard does not — produce the same path.
 */
export const childPath = (parent: OnixSourcePath, element: string, occurrence?: number): OnixSourcePath =>
  occurrence === undefined ? `${parent}/${element}` : `${parent}/${element}[${occurrence}]`;

/** One occurrence of a repeatable element, with where it came from and where it sat. */
export type OnixOccurrence<T> = {
  value: T;
  /** Position in the source document, numbered from one. */
  ordinal: number;
  path: OnixSourcePath;
};

/**
 * Every occurrence of a repeatable element, in source order, each addressable on its own.
 *
 * Absent becomes an empty array, a singleton becomes one occurrence and an array becomes as many
 * as it holds, so a caller never has to know which shape the parser chose. Ordinals count
 * positions in the document rather than positions in the result: a hole — `<Language/>`, which
 * parses to an empty string rather than to a composite — is dropped without renumbering the
 * occurrences after it, because a path that pointed at the wrong element would be worse than no
 * path at all.
 */
export const normaliseOnixOccurrences = <T>(
  value: T | T[] | undefined | null,
  parent: OnixSourcePath,
  element: string,
): OnixOccurrence<NonNullable<T>>[] => {
  if (value === undefined || value === null) return [];

  const occurrences = Array.isArray(value) ? value : [value];

  return occurrences
    .map((occurrence, index) => ({ occurrence, ordinal: index + 1 }))
    .filter(({ occurrence }) => !!occurrence && typeof occurrence === 'object')
    .map(({ occurrence, ordinal }) => ({
      value: occurrence as NonNullable<T>,
      ordinal,
      path: childPath(parent, element, ordinal),
    }));
};

export type { OnixSourceDiagnostic };
