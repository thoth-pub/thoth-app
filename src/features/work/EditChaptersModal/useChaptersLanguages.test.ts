/* eslint-disable @eslint-react/hooks-extra/no-unnecessary-use-prefix */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const chapters = [
    {
      id: 'chapter-1',
      languages: [
        { id: 'lang-1', code: 'en', relation: 'ORIGINAL' },
        { id: 'lang-2', code: 'fr', relation: 'TRANSLATION' },
      ],
    },
    {
      id: 'chapter-2',
      languages: [
        { id: 'lang-3', code: 'en', relation: 'ORIGINAL' },
        { id: 'lang-4', code: 'fr', relation: 'TRANSLATION' },
      ],
    },
  ];

  return {
    chapters,
    activeWorkChapters: chapters,
    languageService: {
      createLanguage: vi.fn().mockResolvedValue({}),
      updateLanguage: vi.fn().mockResolvedValue({}),
      deleteLanguage: vi.fn().mockResolvedValue({}),
    },
    sendErrorNotification: vi.fn(),
    queryClient: { invalidateQueries: vi.fn() },
  };
});

vi.mock('@/src/entities/work/store/hooks/useWorkChaptersStateMachine', () => ({
  useWorkChaptersStateMachine: () => ({
    activeWorkChapters: mocks.activeWorkChapters,
  }),
}));

vi.mock('@/src/shared/context', () => ({
  useServices: () => ({
    languageService: mocks.languageService,
  }),
}));

vi.mock('@/src/shared/hooks', () => ({
  useNotifications: () => ({
    sendErrorNotification: mocks.sendErrorNotification,
  }),
}));

vi.mock('@tanstack/react-query', () => {
  const queryClient = mocks.queryClient;

  return {
    useMutation: (opts: { mutationFn: (...args: unknown[]) => unknown }) => ({
      mutateAsync: opts.mutationFn,
      isPending: false,
    }),
    useQueryClient: () => queryClient,
  };
});

import { useChaptersLanguages } from './useChaptersLanguages';

describe('useChaptersLanguages', () => {
  beforeEach(() => {
    mocks.languageService.createLanguage.mockClear().mockResolvedValue({});
    mocks.languageService.updateLanguage.mockClear().mockResolvedValue({});
    mocks.languageService.deleteLanguage.mockClear().mockResolvedValue({});
    mocks.queryClient.invalidateQueries.mockClear();
    mocks.activeWorkChapters = [...mocks.chapters];
  });

  describe('updateLanguages', () => {
    it('should add a new language to all chapters', async () => {
      const { result } = renderHook(() => useChaptersLanguages());

      await act(async () => {
        await result.current.updateLanguages({
          languages: [
            { language: { value: 'en', label: 'English' }, languageRelation: 'ORIGINAL' },
            { language: { value: 'fr', label: 'French' }, languageRelation: 'TRANSLATION' },
            { language: { value: 'de', label: 'German' }, languageRelation: 'TRANSLATION' },
          ],
        });
      });

      // 'de' should be created for both chapters since it doesn't exist
      expect(mocks.languageService.createLanguage).toHaveBeenCalledTimes(2);
      expect(mocks.languageService.createLanguage).toHaveBeenCalledWith(
        expect.objectContaining({ id: '', code: 'de', relation: 'TRANSLATION' }),
        'chapter-1',
      );
      expect(mocks.languageService.createLanguage).toHaveBeenCalledWith(
        expect.objectContaining({ id: '', code: 'de', relation: 'TRANSLATION' }),
        'chapter-2',
      );
    });

    it('should delete languages that are no longer in the form', async () => {
      const { result } = renderHook(() => useChaptersLanguages());

      await act(async () => {
        await result.current.updateLanguages({
          languages: [
            { language: { value: 'en', label: 'English' }, languageRelation: 'ORIGINAL' },
          ],
        });
      });

      // 'fr' should be deleted from both chapters
      expect(mocks.languageService.deleteLanguage).toHaveBeenCalledTimes(2);
      expect(mocks.languageService.deleteLanguage).toHaveBeenCalledWith('lang-2');
      expect(mocks.languageService.deleteLanguage).toHaveBeenCalledWith('lang-4');
    });

    it('should update language relation when changed', async () => {
      const { result } = renderHook(() => useChaptersLanguages());

      await act(async () => {
        await result.current.updateLanguages({
          languages: [
            { language: { value: 'en', label: 'English' }, languageRelation: 'TRANSLATION' },
            { language: { value: 'fr', label: 'French' }, languageRelation: 'TRANSLATION' },
          ],
        });
      });

      // 'en' relation changed from ORIGINAL to TRANSLATION in both chapters
      expect(mocks.languageService.updateLanguage).toHaveBeenCalledTimes(2);
    });

    it('should do nothing when activeWorkChapters is null', async () => {
      mocks.activeWorkChapters = null;

      const { result } = renderHook(() => useChaptersLanguages());

      await act(async () => {
        await result.current.updateLanguages({
          languages: [
            { language: { value: 'en', label: 'English' }, languageRelation: 'ORIGINAL' },
          ],
        });
      });

      expect(mocks.languageService.createLanguage).not.toHaveBeenCalled();
    });

    it('should invalidate queries after update', async () => {
      const { result } = renderHook(() => useChaptersLanguages());

      await act(async () => {
        await result.current.updateLanguages({
          languages: [
            { language: { value: 'en', label: 'English' }, languageRelation: 'ORIGINAL' },
          ],
        });
      });

      expect(mocks.queryClient.invalidateQueries).toHaveBeenCalled();
    });
  });

  describe('deleteLanguages', () => {
    it('should delete all languages with same code and relation across chapters', async () => {
      mocks.activeWorkChapters = [
        {
          id: 'chapter-1',
          languages: [
            { id: 'lang-1', code: 'en', relation: 'ORIGINAL' },
            { id: 'lang-2', code: 'fr', relation: 'TRANSLATION' },
          ],
        },
        {
          id: 'chapter-2',
          languages: [
            { id: 'lang-3', code: 'en', relation: 'ORIGINAL' },
          ],
        },
      ];

      const { result } = renderHook(() => useChaptersLanguages());

      await act(async () => {
        await result.current.deleteLanguages('lang-1');
      });

      // 'en' with ORIGINAL relation appears in both chapters
      expect(mocks.languageService.deleteLanguage).toHaveBeenCalledTimes(2);
      expect(mocks.languageService.deleteLanguage).toHaveBeenCalledWith('lang-1');
      expect(mocks.languageService.deleteLanguage).toHaveBeenCalledWith('lang-3');
    });

    it('should do nothing when language is not found', async () => {
      const { result } = renderHook(() => useChaptersLanguages());

      await act(async () => {
        await result.current.deleteLanguages('non-existent');
      });

      expect(mocks.languageService.deleteLanguage).not.toHaveBeenCalled();
    });

    it('should invalidate queries after deleting', async () => {
      const { result } = renderHook(() => useChaptersLanguages());

      await act(async () => {
        await result.current.deleteLanguages('lang-1');
      });

      expect(mocks.queryClient.invalidateQueries).toHaveBeenCalled();
    });
  });

  it('should return loading state', () => {
    const { result } = renderHook(() => useChaptersLanguages());

    expect(result.current.loading).toBe(false);
  });
});
