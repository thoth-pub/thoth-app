import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { LanguagesForm } from '@/src/entities/language/model/language.types';
import type { WorkEntity } from '@/src/entities/work/model/work.types';

import { useBulkLanguagesState } from './useBulkLanguagesState';

const chaptersWithLanguages = (codes: string[]): WorkEntity[] =>
  [
    { id: '1', languages: codes.map((code) => ({ id: `${code}-1`, code, relation: 'ORIGINAL' })) },
    { id: '2', languages: codes.map((code) => ({ id: `${code}-2`, code, relation: 'ORIGINAL' })) },
  ] as WorkEntity[];

const languagesForm = (codes: string[]): LanguagesForm => ({
  languages: codes.map((code) => ({
    languageId: `${code}-1`,
    language: { value: code, label: code.toUpperCase() },
    languageRelation: 'ORIGINAL',
  })),
}) as LanguagesForm;

describe('useBulkLanguagesState', () => {
  it('derives the common language set from the selected chapters', () => {
    const { result } = renderHook(() =>
      useBulkLanguagesState(chaptersWithLanguages(['en']), vi.fn().mockResolvedValue(undefined), vi.fn()),
    );

    expect(result.current.hasMismatch).toBe(false);
    expect(result.current.displayLanguages.map(({ code }) => code)).toEqual(['en']);
    expect(result.current.savingCount).toBe(2);
  });

  it('reports a mismatch when language sets differ', () => {
    const chapters = [
      { id: '1', languages: [{ id: 'en-1', code: 'en', relation: 'ORIGINAL' }] },
      { id: '2', languages: [{ id: 'fr-2', code: 'fr', relation: 'ORIGINAL' }] },
    ] as unknown as WorkEntity[];

    const { result } = renderHook(() => useBulkLanguagesState(chapters, vi.fn().mockResolvedValue(undefined), vi.fn()));

    expect(result.current.hasMismatch).toBe(true);
    expect(result.current.displayLanguages).toEqual([]);
  });

  it('EditChaptersModal_keepsSubmittedLanguageVisibleWhileSaving', async () => {
    let resolveSave: () => void = () => {};
    const onSubmit = vi.fn(() => new Promise<void>((resolve) => (resolveSave = resolve)));

    const { result } = renderHook(() => useBulkLanguagesState(chaptersWithLanguages(['en']), onSubmit, vi.fn()));

    act(() => {
      result.current.submit(languagesForm(['en', 'de']));
    });

    // While pending, the submitted set is shown and the control marks itself saving.
    expect(result.current.isSaving).toBe(true);
    expect(result.current.displayLanguages.map(({ code }) => code)).toEqual(['en', 'de']);
    expect(onSubmit).toHaveBeenCalled();

    await act(async () => {
      resolveSave();
    });

    expect(result.current.isSaving).toBe(false);
    expect(result.current.displayLanguages.map(({ code }) => code)).toEqual(['en', 'de']);
  });
});
