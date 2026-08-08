import { LocaleCode } from '@/gql/graphql';

import type { LocaleCodeType } from '../../types/languages';

/**
 * Recovering a Thoth locale from an ISO 639 language code.
 *
 * Thoth stores the language of a title, subtitle, abstract or biography as a `LocaleCode`, which
 * is BCP-47 (`en`, `en-GB`, `pt-BR`). Bibliographic formats mostly do not carry a locale: ONIX
 * List 74, MARC and Crossref all express language as an ISO 639-2/B code (`eng`, `fre`, `ger`),
 * and Thoth's own exporters convert `LocaleCode` down to one when they write those formats —
 * see `LocaleCode -> LanguageCode` in `thoth-api/src/model/locale/mod.rs`.
 *
 * That conversion is many-to-one: `En`, `EnGb` and `EnUs` all become `eng`. Its inverse is
 * therefore not a function, and the region is simply gone — nothing in `eng` can say which
 * English it was. The most an importer may honestly recover is the base locale, so that is all
 * this returns; a regional locale is never guessed.
 *
 * The 639-2/B to 639-1 step itself is not hand-written. `Intl.Locale` canonicalises through
 * ICU's CLDR language alias table, which already knows the whole of ISO 639 including the
 * bibliographic codes that trip up naive tables (`fre` -> `fr`, `ger` -> `de`, `chi` -> `zh`,
 * `dut` -> `nl`, `wel` -> `cy`, `baq` -> `eu`). Codes with no two-letter form (`haw`, `chr`,
 * `gsw`) are passed through unchanged, which is correct: Thoth's `LocaleCode` spells those
 * locales with three letters too.
 */

/** Every locale Thoth accepts, as the generated enum spells them: `EN`, `PT_BR`, `ZH_HANS_CN`. */
const THOTH_LOCALES = new Set<string>(Object.values(LocaleCode));

/**
 * The Thoth locale for an ISO 639 language code, or `undefined` when there is no safe answer.
 *
 * A code resolves only when its base language is itself one of Thoth's locales. Macro-languages
 * and collective codes that Thoth does not model as a locale — `nor` (Norwegian, which Thoth
 * splits into `nb` and `nn`), `ber`, `bnt`, `mul`, `und` — deliberately resolve to nothing rather
 * than to an arbitrary member of the group. Callers are expected to fall back, not to guess.
 */
export const localeFromLanguageCode = (languageCode: string | undefined | null): LocaleCodeType | undefined => {
  const trimmed = (languageCode ?? '').trim();

  if (trimmed.length === 0) return undefined;

  let baseLanguage: string | undefined;

  try {
    // `Intl.Locale` throws on anything that is not structurally valid BCP-47, which includes
    // most of the junk a real ONIX file can put in a `language` attribute.
    baseLanguage = new Intl.Locale(trimmed).language;
  } catch {
    return undefined;
  }

  // `und` is BCP-47's explicit "undetermined", which ICU reports as no language at all.
  if (!baseLanguage || baseLanguage === 'und') return undefined;

  const candidate = baseLanguage.toUpperCase();

  return THOTH_LOCALES.has(candidate) ? (candidate as LocaleCodeType) : undefined;
};
