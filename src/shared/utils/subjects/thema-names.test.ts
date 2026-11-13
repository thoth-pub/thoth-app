import { createHash } from 'node:crypto';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { themaFormFields, themaFormFieldsFor } from '../../constants/themaFormFields';
import { THEMA_CODES } from './thema-codes';
import {
  getLoadedThemaNames,
  loadThemaNames,
  resetThemaNamesLoader,
  subscribeThemaNames,
  themaName,
  type ThemaNames,
  themaNamesLocaleOf,
} from './thema-names';
import { THEMA_NAMES_DE } from './thema-names-de';
import { THEMA_NAMES_ES } from './thema-names-es';
import { THEMA_NAMES_PT } from './thema-names-pt';

/**
 * The committed oracles of thoth-app#315: each map is EDItEUR's Thema v1.7 translation, keyed in `THEMA_CODES`
 * order. Each hash is the SHA-256 of UTF-8 `code<TAB>name` lines, each followed by `\n`, sorted by code point.
 */

const sha256OfLines = (lines: readonly string[]) =>
  createHash('sha256')
    .update(lines.map((line) => `${line}\n`).join(''), 'utf8')
    .digest('hex');

const byCodePoint = (values: readonly string[]) => [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

const deferred = () => {
  let resolve: (names: ThemaNames) => void = () => {};
  let reject: (error: unknown) => void = () => {};
  const promise = new Promise<ThemaNames>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
};

const translations = [
  {
    language: 'de',
    names: THEMA_NAMES_DE,
    hash: '358e1abcc70eddb7eb5c30289ed479dbb3663433285626680d9438c37198ec25',
    spots: { AB: 'Kunst: allgemeine Themen', PDA: 'Wissenschaftsphilosophie und -theorie', FKK: 'Folk horror' },
  },
  {
    language: 'es',
    names: THEMA_NAMES_ES,
    hash: '85602e8af3f003286a31eb3070f91abe86e20ee91e9e96016b16a231da913374',
    spots: { AB: 'Artes: aspectos generales', FKK: 'Folk horror' },
  },
  {
    language: 'pt',
    names: THEMA_NAMES_PT,
    hash: 'e2b5d70b3e541ab0526141a92d10164a43dd1109ea5d1ee0507041a39d4668fc',
    spots: { AB: 'Artes: tópicos gerais', VXQ: 'Fenômenos inexplicáveis / o paranormal', FKK: 'Folk horror' },
  },
];

beforeEach(() => {
  resetThemaNamesLoader();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe.each(translations)('Thema v1.7 names in $language (thoth-app#315)', ({ names, hash, spots }) => {
  it('has a name for every code of THEMA_CODES, in THEMA_CODES order', () => {
    expect(Object.keys(names)).toHaveLength(9448);
    expect(Object.keys(names)).toEqual(Object.keys(THEMA_CODES));
  });

  it("holds exactly EDItEUR's names", () => {
    expect(sha256OfLines(byCodePoint(Object.entries(names).map(([code, name]) => `${code}\t${name}`)))).toBe(hash);
  });

  it('has no empty name, no edge whitespace, no U+00A0 and no U+200B', () => {
    const bad = Object.entries(names).filter(
      ([, name]) => name.length === 0 || name !== name.trim() || /[\u00a0\u200b]/.test(name),
    );

    expect(bad).toEqual([]);
  });

  it('has the expected spot values', () => {
    for (const [code, name] of Object.entries(spots)) {
      expect(names[code]).toBe(name);
    }
  });
});

describe('themaNamesLocaleOf', () => {
  it.each([
    ['en', 'en'],
    ['de', 'de'],
    ['es', 'es'],
    ['pt', 'pt'],
    ['pt-BR', 'pt'],
    ['pt_BR', 'pt'],
    ['DE', 'de'],
    ['de-AT', 'de'],
    ['fr', 'en'],
    ['zh-Hans', 'en'],
    ['', 'en'],
    [undefined, 'en'],
    [null, 'en'],
  ])('maps %s to %s', (language, locale) => {
    expect(themaNamesLocaleOf(language)).toBe(locale);
  });
});

describe('loadThemaNames', () => {
  it('gives THEMA_CODES itself for English', async () => {
    await expect(loadThemaNames('en')).resolves.toBe(THEMA_CODES);
    expect(getLoadedThemaNames('en')).toBe(THEMA_CODES);
  });

  it('loads German through the dynamic import and keeps it', async () => {
    expect(getLoadedThemaNames('de')).toBeUndefined();

    await expect(loadThemaNames('de')).resolves.toBe(THEMA_NAMES_DE);
    expect(getLoadedThemaNames('de')).toBe(THEMA_NAMES_DE);
  });

  it('makes one importer call for two concurrent loads', async () => {
    const importer = vi.fn(() => Promise.resolve(THEMA_NAMES_DE));
    resetThemaNamesLoader({ de: importer });

    const [first, second] = await Promise.all([loadThemaNames('de'), loadThemaNames('de')]);

    expect(first).toBe(THEMA_NAMES_DE);
    expect(second).toBe(THEMA_NAMES_DE);
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it('notifies a subscriber once when a load completes, and not after it unsubscribes', async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeThemaNames(listener);

    await loadThemaNames('de');
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    await loadThemaNames('es');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('gives English on a failed load, warns once, notifies no one, and loads on a later call', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const listener = vi.fn();
    const unsubscribe = subscribeThemaNames(listener);
    resetThemaNamesLoader({ de: () => Promise.reject(new Error('offline')) });

    await expect(loadThemaNames('de')).resolves.toBe(THEMA_CODES);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('de');
    expect(listener).not.toHaveBeenCalled();
    expect(getLoadedThemaNames('de')).toBeUndefined();

    resetThemaNamesLoader({ de: () => Promise.resolve(THEMA_NAMES_DE) });
    await expect(loadThemaNames('de')).resolves.toBe(THEMA_NAMES_DE);
    expect(getLoadedThemaNames('de')).toBe(THEMA_NAMES_DE);
    expect(warn).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('retries a failed load on the next call with the same importer', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const importer = vi
      .fn<() => Promise<ThemaNames>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(THEMA_NAMES_DE);
    resetThemaNamesLoader({ de: importer });

    await expect(loadThemaNames('de')).resolves.toBe(THEMA_CODES);
    await expect(loadThemaNames('de')).resolves.toBe(THEMA_NAMES_DE);
    expect(importer).toHaveBeenCalledTimes(2);
  });

  it('forgets loaded languages on reset', async () => {
    await loadThemaNames('de');
    expect(getLoadedThemaNames('de')).toBe(THEMA_NAMES_DE);

    resetThemaNamesLoader();
    expect(getLoadedThemaNames('de')).toBeUndefined();
  });

  it('discards a load that started before a reset', async () => {
    const load = deferred();
    resetThemaNamesLoader({ de: () => load.promise });
    const listener = vi.fn();
    const unsubscribe = subscribeThemaNames(listener);

    const pending = loadThemaNames('de');
    resetThemaNamesLoader();
    load.resolve(THEMA_NAMES_DE);
    await pending;

    expect(getLoadedThemaNames('de')).toBeUndefined();
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});

describe('themaName', () => {
  const names: ThemaNames = { AB: 'Kunst: allgemeine Themen' };

  it('gives the name in names for an own key', () => {
    expect(themaName(names, 'AB')).toBe('Kunst: allgemeine Themen');
  });

  it('gives the English name for a code missing from names', () => {
    expect(themaName(names, 'FKK')).toBe('Folk horror');
  });

  it('gives undefined for a code in neither', () => {
    expect(themaName(names, 'ZZZ')).toBeUndefined();
  });

  it('never gives an inherited property', () => {
    expect(themaName(names, 'constructor')).toBeUndefined();
  });
});

describe('themaFormFieldsFor', () => {
  it('gives one option per code, in THEMA_CODES order', () => {
    const options = themaFormFieldsFor(THEMA_NAMES_DE);

    expect(options).toHaveLength(9448);
    expect(options.map((option) => option.value)).toEqual(Object.keys(THEMA_CODES));
  });

  it('labels each option with the translated name, in the existing format', () => {
    expect(themaFormFieldsFor(THEMA_NAMES_DE).find((option) => option.value === 'A')?.label).toBe('A (Kunst) ');
  });

  it('gives the same array for the same names', () => {
    expect(themaFormFieldsFor(THEMA_NAMES_DE)).toBe(themaFormFieldsFor(THEMA_NAMES_DE));
    expect(themaFormFieldsFor(THEMA_CODES)).toBe(themaFormFields);
  });

  it('keeps the English options unchanged', () => {
    expect(themaFormFields).toHaveLength(9448);
    expect(themaFormFields.find((option) => option.value === 'AB')?.label).toBe('AB (The arts: general topics) ');
  });
});
