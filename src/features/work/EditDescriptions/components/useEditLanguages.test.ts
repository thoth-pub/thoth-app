import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    languageService: {
      createLanguage: vi.fn().mockResolvedValue({}),
      updateLanguage: vi.fn().mockResolvedValue({}),
      deleteLanguage: vi.fn().mockResolvedValue({}),
    },
    sendErrorNotification: vi.fn(),
    queryClient: { invalidateQueries: vi.fn() },
    languages: [
      { id: 'lang-1', code: 'en', relation: 'ORIGINAL' },
      { id: 'lang-2', code: 'fr', relation: 'TRANSLATION' },
    ],
    work: {
      languages: [
        { id: 'lang-1', code: 'en', relation: 'ORIGINAL' },
        { id: 'lang-2', code: 'fr', relation: 'TRANSLATION' },
      ],
    },
    closeForm: vi.fn(),
    activeFormId: null,
    createLanguage: vi.fn().mockResolvedValue({}),
    updateLanguage: vi.fn().mockResolvedValue({}),
    deleteLanguageMutation: vi.fn().mockResolvedValue({}),
  };
});

vi.mock('@/src/entities/language', () => ({
  useLanguage: () => ({
    createLanguage: mocks.createLanguage,
    updateLanguage: mocks.updateLanguage,
    deleteLanguage: mocks.deleteLanguageMutation,
  }),
}));

vi.mock('@/src/entities/work', () => ({
  useWork: () => ({ work: mocks.work }),
}));

vi.mock('@/src/shared/store/forms/hooks/useFormStateMachine', () => ({
  default: () => ({ closeForm: mocks.closeForm, activeFormId: mocks.activeFormId }),
}));

vi.mock('@/src/shared/utils', () => ({
  isDefaultId: (id: string) => id === '0000-0000-0000-0000-0',
}));

import { useEditLanguages } from './useEditLanguages';

describe('useEditLanguages', () => {
  const defaultProps = { workId: 'work-1', recommended: false };

  beforeEach(() => {
    mocks.createLanguage.mockClear();
    mocks.updateLanguage.mockClear();
    mocks.deleteLanguageMutation.mockClear();
    mocks.closeForm.mockClear();
    mocks.work.languages = [
      { id: 'lang-1', code: 'en', relation: 'ORIGINAL' },
      { id: 'lang-2', code: 'fr', relation: 'TRANSLATION' },
    ];
  });

  it('should return languages from work', () => {
    const { result } = renderHook(() => useEditLanguages(defaultProps));

    expect(result.current.languages).toEqual(mocks.work.languages);
  });

  it('should not show indicator when not recommended', () => {
    const { result } = renderHook(() => useEditLanguages(defaultProps));

    expect(result.current.showIndicator).toBe(false);
  });

  it('should show indicator when recommended and no languages', () => {
    mocks.work.languages = [];

    const { result } = renderHook(() =>
      useEditLanguages({ ...defaultProps, recommended: true }),
    );

    expect(result.current.showIndicator).toBe(true);
  });

  describe('update', () => {
    it('should call onUpdate callback when provided', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useEditLanguages({ ...defaultProps, onUpdate }),
      );

      act(() => {
        result.current.update({ languages: [{ language: { value: 'en', label: 'English' }, languageRelation: 'ORIGINAL' }] });
      });

      expect(onUpdate).toHaveBeenCalled();
      expect(mocks.createLanguage).not.toHaveBeenCalled();
    });

    it('should create new languages and update existing ones', () => {
      mocks.work.languages = [{ id: 'lang-1', code: 'en', relation: 'ORIGINAL' }];

      const { result } = renderHook(() => useEditLanguages(defaultProps));

      act(() => {
        result.current.update({
          languages: [
            { language: { value: 'en', label: 'English' }, languageRelation: 'ORIGINAL' },
            { language: { value: 'de', label: 'German' }, languageRelation: 'TRANSLATION' },
          ],
        });
      });

      // 'en' exists so it should be updated, 'de' is new so created
      expect(mocks.updateLanguage).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'lang-1', code: 'en' }),
      );
      expect(mocks.createLanguage).toHaveBeenCalledWith(
        expect.objectContaining({ id: '', code: 'de' }),
      );
    });

    it('should delete languages not in the form data', () => {
      mocks.work.languages = [
        { id: 'lang-1', code: 'en', relation: 'ORIGINAL' },
        { id: 'lang-2', code: 'fr', relation: 'TRANSLATION' },
      ];

      const { result } = renderHook(() => useEditLanguages(defaultProps));

      act(() => {
        result.current.update({
          languages: [{ language: { value: 'en', label: 'English' }, languageRelation: 'ORIGINAL' }],
        });
      });

      expect(mocks.deleteLanguageMutation).toHaveBeenCalledWith('lang-2');
    });
  });

  describe('deleteLanguage', () => {
    it('should call onDelete callback when provided', () => {
      const onDelete = vi.fn();
      const { result } = renderHook(() =>
        useEditLanguages({ ...defaultProps, onDelete }),
      );

      act(() => {
        result.current.deleteLanguage('lang-1');
      });

      expect(onDelete).toHaveBeenCalledWith('lang-1');
      expect(mocks.deleteLanguageMutation).not.toHaveBeenCalled();
    });

    it('should delete language by id when no callback', () => {
      const { result } = renderHook(() => useEditLanguages(defaultProps));

      act(() => {
        result.current.deleteLanguage('lang-1');
      });

      expect(mocks.deleteLanguageMutation).toHaveBeenCalledWith('lang-1');
    });

    it('should not delete language with default id', () => {
      const { result } = renderHook(() => useEditLanguages(defaultProps));

      act(() => {
        result.current.deleteLanguage('0000-0000-0000-0000-0');
      });

      expect(mocks.deleteLanguageMutation).not.toHaveBeenCalled();
    });
  });
});
