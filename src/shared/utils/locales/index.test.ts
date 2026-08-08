import { describe, expect, it } from 'vitest';

import { LocaleCode } from '@/gql/graphql';

import { localeFromLanguageCode } from '.';

describe('localeFromLanguageCode', () => {
  it('recovers the base locale from an ISO 639-2/B code', () => {
    expect(localeFromLanguageCode('eng')).toBe(LocaleCode.En);
    expect(localeFromLanguageCode('spa')).toBe(LocaleCode.Es);
    expect(localeFromLanguageCode('ita')).toBe(LocaleCode.It);
  });

  it('handles the bibliographic codes that differ from the terminological ones', () => {
    // These are the codes a hand-written table gets wrong: ONIX List 74 is 639-2/B, so French is
    // `fre` rather than `fra` and German is `ger` rather than `deu`.
    expect(localeFromLanguageCode('fre')).toBe(LocaleCode.Fr);
    expect(localeFromLanguageCode('ger')).toBe(LocaleCode.De);
    expect(localeFromLanguageCode('dut')).toBe(LocaleCode.Nl);
    expect(localeFromLanguageCode('chi')).toBe(LocaleCode.Zh);
    expect(localeFromLanguageCode('wel')).toBe(LocaleCode.Cy);
    expect(localeFromLanguageCode('gre')).toBe(LocaleCode.El);
    expect(localeFromLanguageCode('cze')).toBe(LocaleCode.Cs);
    expect(localeFromLanguageCode('ice')).toBe(LocaleCode.Is);
  });

  it('passes through languages that have no two-letter code', () => {
    // Thoth spells these locales with three letters too, so nothing is lost.
    expect(localeFromLanguageCode('haw')).toBe(LocaleCode.Haw);
    expect(localeFromLanguageCode('chr')).toBe(LocaleCode.Chr);
    expect(localeFromLanguageCode('gsw')).toBe(LocaleCode.Gsw);
  });

  it('accepts a two-letter code as readily as a three-letter one', () => {
    expect(localeFromLanguageCode('en')).toBe(LocaleCode.En);
    expect(localeFromLanguageCode('pt')).toBe(LocaleCode.Pt);
  });

  it('is insensitive to case and surrounding whitespace', () => {
    expect(localeFromLanguageCode('ENG')).toBe(LocaleCode.En);
    expect(localeFromLanguageCode('  fre  ')).toBe(LocaleCode.Fr);
  });

  it('never invents a region', () => {
    // `eng` may have been En, EnGb or EnUs before an exporter flattened it. The region is gone,
    // and the base locale is the most that can honestly be recovered.
    expect(localeFromLanguageCode('eng')).toBe(LocaleCode.En);
    // A code that does carry a region keeps only its language, for the same reason: Thoth's own
    // ONIX never writes one, so a regional code is not evidence this importer should act on.
    expect(localeFromLanguageCode('en-GB')).toBe(LocaleCode.En);
  });

  it('declines to guess a member of a macro-language or a collective code', () => {
    // Thoth models Norwegian as nb and nn; `nor` says which of those it is not.
    expect(localeFromLanguageCode('nor')).toBeUndefined();
    expect(localeFromLanguageCode('ber')).toBeUndefined();
    expect(localeFromLanguageCode('bnt')).toBeUndefined();
    expect(localeFromLanguageCode('mul')).toBeUndefined();
  });

  it('declines undetermined, empty and malformed codes', () => {
    expect(localeFromLanguageCode('und')).toBeUndefined();
    expect(localeFromLanguageCode('')).toBeUndefined();
    expect(localeFromLanguageCode('   ')).toBeUndefined();
    expect(localeFromLanguageCode(undefined)).toBeUndefined();
    expect(localeFromLanguageCode(null)).toBeUndefined();
    expect(localeFromLanguageCode('not a language')).toBeUndefined();
    expect(localeFromLanguageCode('!!')).toBeUndefined();
  });

  it('only ever returns a locale Thoth accepts', () => {
    const locales = new Set<string>(Object.values(LocaleCode));

    ['eng', 'fre', 'ger', 'spa', 'por', 'ita', 'rus', 'jpn', 'ara', 'zul', 'haw'].forEach((code) => {
      const locale = localeFromLanguageCode(code);

      expect(locale).toBeDefined();
      expect(locales.has(locale as string)).toBe(true);
    });
  });
});
