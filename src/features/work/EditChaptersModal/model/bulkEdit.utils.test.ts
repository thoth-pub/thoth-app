import { describe, expect, it } from 'vitest';

import type { LanguageEntity } from '@/src/entities/language/model/language.types';
import type { WorkEntity } from '@/src/entities/work/model/work.types';

import {
  areLanguageSetsEqual,
  getCommonCopyrightHolder,
  getCommonLanguages,
  getCommonLicense,
  getCommonScalar,
} from './bulkEdit.utils';

const CC_BY = 'https://creativecommons.org/licenses/by/4.0/';
const CC0 = 'https://creativecommons.org/publicdomain/zero/1.0/';

const chapterWithLicense = (license: string | null | undefined): WorkEntity => ({ license } as WorkEntity);

const chapterWithCopyrightHolder = (copyrightHolder: string | null | undefined): WorkEntity =>
  ({ copyrightHolder } as WorkEntity);

const chapterWithLanguages = (languages: LanguageEntity[]): WorkEntity => ({ languages } as WorkEntity);

const lang = (code: string, relation = 'ORIGINAL'): LanguageEntity =>
  ({ id: `${code}-id`, code, relation } as unknown as LanguageEntity);

describe('getCommonLicense', () => {
  it('returns the shared licence when all chapters agree', () => {
    const result = getCommonLicense([chapterWithLicense(CC_BY), chapterWithLicense(CC_BY)]);

    expect(result).toEqual({ license: CC_BY, isMixed: false });
  });

  it('flags a mixed selection when chapters disagree', () => {
    const result = getCommonLicense([chapterWithLicense(CC_BY), chapterWithLicense(CC0)]);

    expect(result).toEqual({ license: null, isMixed: true });
  });

  it('treats empty/missing licences as the shared All Rights Reserved value', () => {
    const result = getCommonLicense([chapterWithLicense(''), chapterWithLicense(null), chapterWithLicense(undefined)]);

    expect(result).toEqual({ license: '', isMixed: false });
  });

  it('returns an empty, non-mixed value for no chapters', () => {
    expect(getCommonLicense([])).toEqual({ license: '', isMixed: false });
    expect(getCommonLicense(null)).toEqual({ license: '', isMixed: false });
  });
});

describe('getCommonScalar', () => {
  it('returns the shared value when all agree', () => {
    expect(getCommonScalar(['a', 'a'])).toEqual({ value: 'a', isMixed: false });
  });

  it('flags mixed values', () => {
    expect(getCommonScalar(['a', 'b'])).toEqual({ value: null, isMixed: true });
  });

  it('returns an empty, non-mixed value for no values', () => {
    expect(getCommonScalar([])).toEqual({ value: '', isMixed: false });
  });
});

describe('getCommonCopyrightHolder', () => {
  it('returns the shared holder when all chapters agree', () => {
    const result = getCommonCopyrightHolder([
      chapterWithCopyrightHolder('Jane Doe'),
      chapterWithCopyrightHolder('Jane Doe'),
    ]);

    expect(result).toEqual({ value: 'Jane Doe', isMixed: false });
  });

  it('flags a mixed selection and treats missing holders as empty', () => {
    expect(getCommonCopyrightHolder([chapterWithCopyrightHolder('Jane Doe'), chapterWithCopyrightHolder(null)])).toEqual(
      { value: null, isMixed: true },
    );
    expect(
      getCommonCopyrightHolder([chapterWithCopyrightHolder(''), chapterWithCopyrightHolder(undefined)]),
    ).toEqual({ value: '', isMixed: false });
  });
});

describe('areLanguageSetsEqual', () => {
  it('ignores order and ids', () => {
    expect(areLanguageSetsEqual([lang('en'), lang('fr', 'TRANSLATION')], [lang('fr', 'TRANSLATION'), lang('en')])).toBe(
      true,
    );
  });

  it('detects a differing relation', () => {
    expect(areLanguageSetsEqual([lang('en', 'ORIGINAL')], [lang('en', 'TRANSLATION')])).toBe(false);
  });

  it('detects a differing length', () => {
    expect(areLanguageSetsEqual([lang('en')], [lang('en'), lang('fr')])).toBe(false);
  });
});

describe('getCommonLanguages', () => {
  it('returns the shared set when all chapters agree', () => {
    const languages = [lang('en'), lang('fr', 'TRANSLATION')];

    const result = getCommonLanguages([chapterWithLanguages(languages), chapterWithLanguages([...languages].reverse())]);

    expect(result.isMixed).toBe(false);
    expect(result.languages).toEqual(languages);
  });

  it('flags a mixed selection when chapters disagree', () => {
    const result = getCommonLanguages([
      chapterWithLanguages([lang('en')]),
      chapterWithLanguages([lang('en'), lang('de')]),
    ]);

    expect(result).toEqual({ languages: null, isMixed: true });
  });

  it('returns an empty, non-mixed set for no chapters', () => {
    expect(getCommonLanguages([])).toEqual({ languages: [], isMixed: false });
  });
});
