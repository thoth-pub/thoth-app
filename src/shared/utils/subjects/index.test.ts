import { describe, expect, it } from 'vitest';

import { convertThemaSubjectCodeToReadableFormat } from './index';

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
