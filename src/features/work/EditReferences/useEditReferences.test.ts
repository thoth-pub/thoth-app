import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReferenceEntity } from '@/src/entities/reference/model/reference.types';

const mocks = vi.hoisted(() => {
  const makeRef = (overrides?: Partial<ReferenceEntity>): ReferenceEntity => ({
    id: `ref-${Object.keys(overrides ?? {}).length}`,
    doi: '',
    journalTitle: '',
    articleTitle: '',
    seriesTitle: '',
    volumeTitle: '',
    url: '',
    orderNumber: 0,
    unstructuredCitation: '',
    ...overrides,
  });

  const initialReferences = [
    makeRef({ id: 'ref-1', orderNumber: 1, unstructuredCitation: 'Ref 1' }),
    makeRef({ id: 'ref-2', orderNumber: 2, unstructuredCitation: 'Ref 2' }),
    makeRef({ id: 'ref-3', orderNumber: 3, unstructuredCitation: 'Ref 3' }),
  ];

  return {
    makeRef,
    initialReferences,
    work: {
      references: [...initialReferences],
    },
    activeReference: null as ReferenceEntity | null,
    updateReference: vi.fn(),
    deleteReference: vi.fn(),
    moveReferences: vi.fn(),
    edit: vi.fn(),
  };
});

vi.mock('@/src/entities/reference', () => ({
  useReferenceStateMachine: () => ({
    activeEntity: mocks.activeReference,
    edit: mocks.edit,
  }),
  useUpdateReference: () => ({ updateReference: mocks.updateReference, loading: false }),
  useDeleteReference: () => ({ deleteReference: mocks.deleteReference, loading: false }),
  useMoveReferences: () => ({ moveReferences: mocks.moveReferences, loading: false }),
}));

vi.mock('@/src/entities/work', () => ({
  useWork: () => ({ work: mocks.work, loading: false, fetching: false }),
}));

vi.mock('@/src/shared/store/forms/hooks/useFormStateMachine', () => ({
  default: () => ({ activeFormId: null }),
}));

import { useEditReferences } from './useEditReferences';

describe('useEditReferences', () => {
  beforeEach(() => {
    mocks.work.references = mocks.initialReferences.map((r) => ({ ...r }));
    mocks.updateReference.mockClear();
    mocks.deleteReference.mockClear();
    mocks.moveReferences.mockClear();
    mocks.edit.mockClear();
  });

  describe('deleteReference', () => {
    it('should delete the reference and renumber remaining ones', async () => {
      mocks.deleteReference.mockResolvedValue(undefined);
      mocks.updateReference.mockResolvedValue(undefined);

      const { result } = renderHook(() => useEditReferences('work-1'));

      await act(async () => {
        await result.current.deleteReference('ref-2');
      });

      expect(mocks.deleteReference).toHaveBeenCalledWith('ref-2');
      expect(mocks.updateReference).toHaveBeenCalledTimes(1);
      expect(mocks.updateReference).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'ref-3', orderNumber: 2 }),
      );
    });

    it('should skip renumbering when orderNumbers already match', async () => {
      mocks.deleteReference.mockResolvedValue(undefined);
      mocks.work.references = [
        mocks.makeRef({ id: 'ref-1', orderNumber: 1, unstructuredCitation: 'A' }),
        mocks.makeRef({ id: 'ref-2', orderNumber: 2, unstructuredCitation: 'B' }),
      ];

      const { result } = renderHook(() => useEditReferences('work-1'));

      await act(async () => {
        await result.current.deleteReference('ref-2');
      });

      expect(mocks.updateReference).not.toHaveBeenCalled();
    });

    it('should not throw when delete fails', async () => {
      mocks.deleteReference.mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useEditReferences('work-1'));

      await act(async () => {
        await result.current.deleteReference('ref-1');
      });

      expect(mocks.updateReference).not.toHaveBeenCalled();
    });
  });

  describe('dragEnd', () => {
    it('should call moveReferences with first changed reference', async () => {
      mocks.moveReferences.mockResolvedValue(undefined);

      const { result } = renderHook(() => useEditReferences('work-1'));

      const reordered: ReferenceEntity[] = [
        { ...mocks.work.references[1], orderNumber: 1 },
        { ...mocks.work.references[0], orderNumber: 2 },
        { ...mocks.work.references[2], orderNumber: 3 },
      ];

      await act(async () => {
        await result.current.dragEnd(reordered);
      });

      expect(mocks.moveReferences).toHaveBeenCalledWith({
        referenceId: 'ref-2',
        newOrdinal: 1,
      });
    });

    it('should not call moveReferences when order is unchanged', async () => {
      const { result } = renderHook(() => useEditReferences('work-1'));

      await act(async () => {
        await result.current.dragEnd([
          { ...mocks.work.references[0], orderNumber: 1 },
          { ...mocks.work.references[1], orderNumber: 2 },
          { ...mocks.work.references[2], orderNumber: 3 },
        ]);
      });

      expect(mocks.moveReferences).not.toHaveBeenCalled();
    });
  });

  describe('addReference', () => {
    it('should edit a default reference', () => {
      const { result } = renderHook(() => useEditReferences('work-1'));

      act(() => {
        result.current.addReference();
      });

      expect(mocks.edit).toHaveBeenCalledWith(
        expect.objectContaining({
          doi: '',
          unstructuredCitation: '',
          orderNumber: 0,
        }),
      );
    });
  });

  describe('editReference', () => {
    it('should find and edit the reference by id', () => {
      const { result } = renderHook(() => useEditReferences('work-1'));

      act(() => {
        result.current.editReference('ref-2');
      });

      expect(mocks.edit).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'ref-2', orderNumber: 2 }),
      );
    });

    it('should not edit when reference is not found', () => {
      const { result } = renderHook(() => useEditReferences('work-1'));

      act(() => {
        result.current.editReference('non-existent');
      });

      expect(mocks.edit).not.toHaveBeenCalled();
    });
  });

  it('should return references from work', () => {
    const { result } = renderHook(() => useEditReferences('work-1'));

    expect(result.current.references).toBe(mocks.work.references);
  });
});
