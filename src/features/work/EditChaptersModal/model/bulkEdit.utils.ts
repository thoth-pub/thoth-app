import type { LanguageEntity } from '@/src/entities/language/model/language.types';
import type { WorkEntity } from '@/src/entities/work/model/work.types';

export type CommonScalar = {
  // The shared value when every selected chapter agrees, otherwise `null` (mixed).
  value: string | null;
  // `true` when the selected chapters hold different values.
  isMixed: boolean;
};

export type CommonLicense = {
  // The shared licence value when every selected chapter agrees, otherwise `null`.
  license: string | null;
  // `true` when the selected chapters hold different licences.
  isMixed: boolean;
};

export type CommonLanguages = {
  // The shared language set when every selected chapter agrees, otherwise `null`.
  languages: LanguageEntity[] | null;
  // `true` when the selected chapters hold different language sets.
  isMixed: boolean;
};

/**
 * Derives the common value of a scalar chapter field across a bulk selection.
 *
 * - all values agree -> that value, not mixed
 * - values disagree  -> `null`, mixed
 * - no values        -> '' (empty), not mixed
 *
 * Values are normalised to '' beforehand, so absent/empty fields compare equal and an
 * empty-but-shared value (e.g. `All Rights Reserved`, whose licence value is '') is
 * reported as the genuine common value rather than as a mixed/arbitrary default.
 */
export const getCommonScalar = (values: string[]): CommonScalar => {
  if (values.length === 0) return { value: '', isMixed: false };

  const [first, ...rest] = values;

  const isMixed = rest.some((value) => value !== first);

  return isMixed ? { value: null, isMixed: true } : { value: first, isMixed: false };
};

/** Derives the licence to show for a bulk selection. See {@link getCommonScalar}. */
export const getCommonLicense = (chapters: WorkEntity[] | null | undefined): CommonLicense => {
  const { value, isMixed } = getCommonScalar((chapters ?? []).map((chapter) => chapter.license ?? ''));

  return { license: value, isMixed };
};

/** Derives the copyright holder to show for a bulk selection. See {@link getCommonScalar}. */
export const getCommonCopyrightHolder = (chapters: WorkEntity[] | null | undefined): CommonScalar =>
  getCommonScalar((chapters ?? []).map((chapter) => chapter.copyrightHolder ?? ''));

// Languages are compared by their `code`+`relation` pair; ids are per-chapter and so are
// ignored when deciding whether two chapters share the same language set.
const toLanguageKey = ({ code, relation }: LanguageEntity): string => `${code}::${relation}`;

export const areLanguageSetsEqual = (a: LanguageEntity[], b: LanguageEntity[]): boolean => {
  if (a.length !== b.length) return false;

  const aKeys = new Set(a.map(toLanguageKey));

  return b.every((language) => aKeys.has(toLanguageKey(language)));
};

/**
 * Derives the language set to show for a bulk selection, following the same
 * common/mixed rules as {@link getCommonLicense}.
 */
export const getCommonLanguages = (chapters: WorkEntity[] | null | undefined): CommonLanguages => {
  if (!chapters || chapters.length === 0) return { languages: [], isMixed: false };

  const [first, ...rest] = chapters;
  const firstLanguages = first.languages ?? [];

  const isMixed = rest.some((chapter) => !areLanguageSetsEqual(firstLanguages, chapter.languages ?? []));

  return isMixed ? { languages: null, isMixed: true } : { languages: firstLanguages, isMixed: false };
};
