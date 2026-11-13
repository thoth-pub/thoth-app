import type { z } from 'zod';

import { LOCALES } from '../../constants/locales';
import { THEMA_CODES } from './thema-codes';

/**
 * Thema subject names in the interface language (thoth-app#315).
 *
 * English is `THEMA_CODES` and is always available. German, Spanish and Brazilian Portuguese are EDItEUR's
 * translations, each in its own module, loaded on first use through a dynamic import so that each becomes its own
 * client chunk. A loaded language is kept for the session. React reads the loaded maps through
 * `subscribeThemaNames` and `getLoadedThemaNames` (see `useThemaNames`).
 */

export type ThemaNames = Readonly<Record<string, string>>;

export type ThemaNamesLocale = z.infer<typeof LOCALES>;

type TranslatedLocale = Exclude<ThemaNamesLocale, 'en'>;

type ThemaNamesImporter = () => Promise<ThemaNames>;

const ENGLISH: ThemaNames = THEMA_CODES;

const DEFAULT_IMPORTERS: Readonly<Record<TranslatedLocale, ThemaNamesImporter>> = {
  de: () => import('./thema-names-de').then((module) => module.THEMA_NAMES_DE),
  es: () => import('./thema-names-es').then((module) => module.THEMA_NAMES_ES),
  pt: () => import('./thema-names-pt').then((module) => module.THEMA_NAMES_PT),
};

let importers: Record<TranslatedLocale, ThemaNamesImporter> = { ...DEFAULT_IMPORTERS };
const loaded = new Map<TranslatedLocale, ThemaNames>();
const inFlight = new Map<TranslatedLocale, Promise<ThemaNames>>();
const listeners = new Set<() => void>();
// Bumped by every reset, so that a load started before a reset neither stores its result nor notifies anyone.
let generation = 0;

const isTranslated = (locale: ThemaNamesLocale): locale is TranslatedLocale => locale !== LOCALES.enum.en;

const notify = () => {
  for (const listener of [...listeners]) {
    listener();
  }
};

/** The interface language whose Thema names to show: the primary subtag if it is a `LOCALES` value, else English. */
export const themaNamesLocaleOf = (language: string | null | undefined): ThemaNamesLocale => {
  const primary = (language ?? '').split(/[-_]/)[0]?.toLowerCase() ?? '';
  const parsed = LOCALES.safeParse(primary);

  return parsed.success ? parsed.data : LOCALES.enum.en;
};

/** The names of a language, loading them first if needed. A failed load gives the English names and is not kept. */
export const loadThemaNames = (locale: ThemaNamesLocale): Promise<ThemaNames> => {
  if (!isTranslated(locale)) {
    return Promise.resolve(ENGLISH);
  }

  const names = loaded.get(locale);
  if (names) {
    return Promise.resolve(names);
  }

  const pending = inFlight.get(locale);
  if (pending) {
    return pending;
  }

  const startedIn = generation;
  const importer = importers[locale];
  const load = new Promise<ThemaNames>((resolve) => resolve(importer()))
    .then((loadedNames) => {
      if (startedIn === generation) {
        loaded.set(locale, loadedNames);
        inFlight.delete(locale);
        notify();
      }

      return loadedNames;
    })
    .catch((error: unknown) => {
      if (startedIn === generation) {
        inFlight.delete(locale);
        console.warn(`Could not load the Thema subject names for "${locale}"; showing the English names.`, error);
      }

      return ENGLISH;
    });

  inFlight.set(locale, load);

  return load;
};

/** The names of a language if they are loaded; English is always loaded. */
export const getLoadedThemaNames = (locale: ThemaNamesLocale): ThemaNames | undefined =>
  isTranslated(locale) ? loaded.get(locale) : ENGLISH;

/** Calls `listener` after any language finishes loading. Returns the unsubscribe function. */
export const subscribeThemaNames = (listener: () => void): (() => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

/**
 * For tests only: forgets every loaded and loading language, and replaces the given importers (the others, or all
 * of them when none are given, go back to the dynamic imports). Subscribers stay subscribed.
 */
export const resetThemaNamesLoader = (overrides: Partial<Record<TranslatedLocale, ThemaNamesImporter>> = {}) => {
  generation += 1;
  loaded.clear();
  inFlight.clear();
  importers = { ...DEFAULT_IMPORTERS, ...overrides };
};

/** The name of `code` in `names`, else its English name, else `undefined`. Only own keys count. */
export const themaName = (names: ThemaNames, code: string): string | undefined => {
  if (Object.hasOwn(names, code)) {
    return names[code];
  }

  if (Object.hasOwn(ENGLISH, code)) {
    return ENGLISH[code];
  }

  return undefined;
};
