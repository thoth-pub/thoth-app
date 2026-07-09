import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PublicationEntity } from '@/src/entities/publication/model/publication.types';

const mocks = vi.hoisted(() => {
  const publication: PublicationEntity = {
    id: 'pub-1',
    isbn: '978-3-16-148410-0',
    prices: [],
    locations: [],
    publicationType: 'BOOK',
  };

  return {
    publication,
    getDefaultPublication: vi.fn(() => ({
      id: '0000-0000-0000-0000-0',
      isbn: '',
      prices: [],
      locations: [],
      publicationType: 'BOOK',
    })),
    work: {
      type: 'BOOK',
      doi: '10.1234/test',
      landingPage: 'https://example.com',
      publications: [publication],
    },
    edit: vi.fn(),
    finishEditing: vi.fn(),
    deletePublication: vi.fn(),
    activeFormId: null,
  };
});

vi.mock('@/src/entities/publication', () => ({
  usePublicationsStateMachine: () => ({
    activeEntity: mocks.publication,
    finishEditing: mocks.finishEditing,
    edit: mocks.edit,
  }),
}));

vi.mock('@/src/entities/publication/api/hooks/useDeletePublication', () => ({
  default: () => ({
    deletePublication: mocks.deletePublication,
    loading: false,
  }),
}));

vi.mock('@/src/entities/work', () => ({
  useWork: () => ({ work: mocks.work }),
}));

vi.mock('@/src/shared/store/forms/hooks/useFormStateMachine', () => ({
  default: () => ({ activeFormId: mocks.activeFormId }),
}));

vi.mock('@/src/shared/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/src/shared/utils')>();

  return {
    ...actual,
    getDefaultPublication: mocks.getDefaultPublication,
    isDefaultId: (id: string) => id === '0000-0000-0000-0000-0',
  };
});

import { useEditPublications } from './useEditPublications';

describe('useEditPublications', () => {
  beforeEach(() => {
    mocks.edit.mockClear();
    mocks.finishEditing.mockClear();
    mocks.deletePublication.mockClear();
    mocks.publication.id = 'pub-1';
  });

  it('should return publications from work', () => {
    const { result } = renderHook(() => useEditPublications('work-1'));

    expect(result.current.publications).toBe(mocks.work.publications);
  });

  it('should return activePublication from state machine', () => {
    const { result } = renderHook(() => useEditPublications('work-1'));

    expect(result.current.activePublication).toBe(mocks.publication);
  });

  describe('addPublication', () => {
    it('should finish editing active publication then edit a default one', () => {
      const { result } = renderHook(() => useEditPublications('work-1'));

      act(() => {
        result.current.addPublication();
      });

      expect(mocks.finishEditing).toHaveBeenCalledTimes(1);
      expect(mocks.edit).toHaveBeenCalledWith(mocks.getDefaultPublication());
    });

    it('should call finishEditing and edit for active publication', () => {
      const { result } = renderHook(() => useEditPublications('work-1'));

      act(() => {
        result.current.addPublication();
      });

      expect(mocks.finishEditing).toHaveBeenCalledTimes(1);
      expect(mocks.edit).toHaveBeenCalledWith(mocks.getDefaultPublication());
    });
  });

  describe('editPublication', () => {
    it('should find publication by id and edit it', () => {
      const { result } = renderHook(() => useEditPublications('work-1'));

      act(() => {
        result.current.editPublication('pub-1');
      });

      expect(mocks.finishEditing).toHaveBeenCalledTimes(1);
      expect(mocks.edit).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'pub-1', isbn: '978-3-16-148410-0' }),
      );
    });

    it('should not edit when publication is not found', () => {
      const { result } = renderHook(() => useEditPublications('work-1'));

      act(() => {
        result.current.editPublication('non-existent');
      });

      expect(mocks.edit).not.toHaveBeenCalled();
    });
  });

  describe('deletePublication', () => {
    it('should finish editing then delete publication', () => {
      const { result } = renderHook(() => useEditPublications('work-1'));

      act(() => {
        result.current.deletePublication('pub-1');
      });

      expect(mocks.finishEditing).toHaveBeenCalledTimes(1);
      expect(mocks.deletePublication).toHaveBeenCalledWith('pub-1');
    });
  });

  describe('derived flags', () => {
    it('should set isNewPublication when id is a default id', () => {
      vi.mocked(mocks.publication).id = '0000-0000-0000-0000-0';

      const { result } = renderHook(() => useEditPublications('work-1'));

      expect(result.current.isNewPublication).toBe(true);
    });

    it('should set isDimensionFormHidden for BookChapter', () => {
      mocks.work.type = 'BOOK_CHAPTER';

      const { result } = renderHook(() => useEditPublications('work-1'));

      expect(result.current.isDimensionFormHidden).toBe(true);
    });

    it('should enable upload when doi and landingPage are present', () => {
      const { result } = renderHook(() => useEditPublications('work-1'));

      expect(result.current.uploadDisabled).toBe(false);
    });

    it('should disable upload when doi is empty', () => {
      mocks.work.doi = '';

      const { result } = renderHook(() => useEditPublications('work-1'));

      expect(result.current.uploadDisabled).toBe(true);
    });
  });
});
