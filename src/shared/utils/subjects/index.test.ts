import { describe, expect, it } from 'vitest';

import { convertThemaSubjectCodeToReadableFormat } from './index';
import { THEMA_NAMES_DE } from './thema-names-de';

describe('convertThemaSubjectCodeToReadableFormat (Thema v1.7, thoth-app#313)', () => {
  it('labels a code Thema v1.7 added', () => {
    expect(convertThemaSubjectCodeToReadableFormat('FKK')).toBe('FKK Folk horror ');
  });

  it('shows a heading v1.7 changed only in letter case as v1.7 writes it', () => {
    expect(convertThemaSubjectCodeToReadableFormat('JN')).toBe('JN Education / educational sciences / pedagogy ');
  });

  it('shows a heading v1.7 reworded as v1.7 words it', () => {
    expect(convertThemaSubjectCodeToReadableFormat('AFK')).toBe('AFK Non-graphic or electronic art forms ');
  });

  it('labels a v1.7 code without its code when asked', () => {
    expect(convertThemaSubjectCodeToReadableFormat('FKK', false)).toBe(' Folk horror ');
  });
});

describe('convertThemaSubjectCodeToReadableFormat with translated names (thoth-app#315)', () => {
  it('labels a code with its translated name, without the code when asked', () => {
    expect(convertThemaSubjectCodeToReadableFormat(' ab ', false, THEMA_NAMES_DE)).toBe(' Kunst: allgemeine Themen ');
  });

  it('labels a code with its translated name and the code', () => {
    expect(convertThemaSubjectCodeToReadableFormat('AB', true, THEMA_NAMES_DE)).toBe('AB Kunst: allgemeine Themen ');
  });

  it('shows an unknown code as the bare code', () => {
    expect(convertThemaSubjectCodeToReadableFormat('ZZZ', true, THEMA_NAMES_DE)).toBe('ZZZ');
  });

  it('falls back to the English name for a code missing from the names', () => {
    expect(convertThemaSubjectCodeToReadableFormat('FKK', true, { AB: 'Kunst: allgemeine Themen' })).toBe(
      'FKK Folk horror ',
    );
  });
});
