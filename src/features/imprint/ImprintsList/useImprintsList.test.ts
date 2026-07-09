import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const imprints = [
    {
      id: 'imprint-1',
      name: 'Test Imprint',
      url: 'https://example.com',
      crossmarkDoi: '',
      defaultPlace: 'London',
      defaultCurrency: 'GBP',
      defaultLocale: 'en',
      s3Bucket: '',
      cdnDomain: '',
      cloudfrontDistId: '',
      updatedAt: '2024-01-01T00:00:00Z',
      publisherName: 'Test Publisher',
    },
  ];

  return {
    imprints,
    isImprintEditable: true,
    activePublisher: { id: 'publisher-1', name: 'Test Publisher' },
    user: { isSuperuser: false },
    edit: vi.fn(),
    closeForm: vi.fn(),
    activeFormId: null,
    createImprintMutation: vi.fn().mockResolvedValue({}),
    updateImprintMutation: vi.fn().mockResolvedValue({}),
    deleteImprintMutation: vi.fn().mockResolvedValue({}),
  };
});

vi.mock('@/src/entities/imprint', () => ({
  useGetPublisherImprints: () => ({ data: mocks.imprints }),
  useCreateImprint: () => ({ createImprint: mocks.createImprintMutation }),
  useUpdateImprint: () => ({ updateImprint: mocks.updateImprintMutation }),
  useDeleteImprint: () => ({ deleteImprint: mocks.deleteImprintMutation }),
}));

vi.mock('@/src/entities/publisher', () => ({
  useActivePublisherPermissions: () => ({
    isImprintEditable: mocks.isImprintEditable,
  }),
  usePublisherStateMachine: () => ({
    activePublisher: mocks.activePublisher,
  }),
}));

vi.mock('@/src/entities/user', () => ({
  useUser: () => ({ user: mocks.user }),
}));

vi.mock('@/src/shared/store/forms/hooks/useFormStateMachine', () => ({
  default: () => ({
    edit: mocks.edit,
    closeForm: mocks.closeForm,
    activeFormId: mocks.activeFormId,
  }),
}));

import { useImprintsList } from './useImprintsList';

describe('useImprintsList', () => {
  beforeEach(() => {
    mocks.activePublisher = { id: 'publisher-1', name: 'Test Publisher' };
    mocks.activeFormId = null;
    mocks.edit.mockClear();
    mocks.closeForm.mockClear();
    mocks.createImprintMutation.mockClear();
    mocks.updateImprintMutation.mockClear();
    mocks.deleteImprintMutation.mockClear();
  });

  it('should return imprints data', () => {
    const { result } = renderHook(() => useImprintsList());

    expect(result.current.data).toBe(mocks.imprints);
  });

  describe('addNewImprint', () => {
    it('should call edit with the default imprint id', () => {
      const { result } = renderHook(() => useImprintsList());

      act(() => {
        result.current.addNewImprint();
      });

      expect(mocks.edit).toHaveBeenCalled();
    });
  });

  describe('createImprint', () => {
    it('should create imprint and close form', async () => {
      const { result } = renderHook(() => useImprintsList());

      await act(async () => {
        await result.current.createImprint({
          imprintId: '0000-0000-0000-0000-0',
          imprintName: 'New Imprint',
          imprintUrl: '',
          crossmarkDoi: '',
          defaultPlace: '',
          defaultCurrency: 'GBP' as const,
          defaultLocale: 'en' as const,
          s3Bucket: '',
          cdnDomain: '',
          cloudfrontDistId: '',
        });
      });

      expect(mocks.createImprintMutation).toHaveBeenCalledWith({
        publisherId: 'publisher-1',
        imprintName: 'New Imprint',
      });
      expect(mocks.closeForm).toHaveBeenCalled();
    });

    it('should do nothing when no active publisher', async () => {
      mocks.activePublisher = null;

      const { result } = renderHook(() => useImprintsList());

      await act(async () => {
        await result.current.createImprint({
          imprintId: '0000-0000-0000-0000-0',
          imprintName: 'New Imprint',
          imprintUrl: '',
          crossmarkDoi: '',
          defaultPlace: '',
          defaultCurrency: 'GBP' as const,
          defaultLocale: 'en' as const,
          s3Bucket: '',
          cdnDomain: '',
          cloudfrontDistId: '',
        });
      });

      expect(mocks.createImprintMutation).not.toHaveBeenCalled();
    });
  });

  describe('updateImprint', () => {
    it('should update imprint with form data and close form', async () => {
      const { result } = renderHook(() => useImprintsList());

      await act(async () => {
        await result.current.updateImprint({
          imprintId: 'imprint-1',
          imprintName: 'Updated Imprint',
          imprintUrl: 'https://updated.com',
          crossmarkDoi: '',
          defaultPlace: 'Paris',
          defaultCurrency: 'EUR' as const,
          defaultLocale: 'fr' as const,
          s3Bucket: '',
          cdnDomain: '',
          cloudfrontDistId: '',
        });
      });

      expect(mocks.updateImprintMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: expect.objectContaining({
            id: 'imprint-1',
            name: 'Updated Imprint',
            defaultPlace: 'Paris',
          }),
        }),
      );
      expect(mocks.closeForm).toHaveBeenCalled();
    });

    it('should do nothing when imprint is not found in data', async () => {
      const { result } = renderHook(() => useImprintsList());

      await act(async () => {
        await result.current.updateImprint({
          imprintId: 'non-existent',
          imprintName: 'Ghost',
          imprintUrl: '',
          crossmarkDoi: '',
          defaultPlace: '',
          defaultCurrency: 'GBP' as const,
          defaultLocale: 'en' as const,
          s3Bucket: '',
          cdnDomain: '',
          cloudfrontDistId: '',
        });
      });

      expect(mocks.updateImprintMutation).not.toHaveBeenCalled();
    });
  });

  describe('deleteImprint', () => {
    it('should delete imprint and close form', async () => {
      const { result } = renderHook(() => useImprintsList());

      await act(async () => {
        await result.current.deleteImprint('imprint-1');
      });

      expect(mocks.deleteImprintMutation).toHaveBeenCalledWith({
        imprintId: 'imprint-1',
        publisherId: 'publisher-1',
      });
      expect(mocks.closeForm).toHaveBeenCalled();
    });

    it('should do nothing when no active publisher', async () => {
      mocks.activePublisher = null;

      const { result } = renderHook(() => useImprintsList());

      await act(async () => {
        await result.current.deleteImprint('imprint-1');
      });

      expect(mocks.deleteImprintMutation).not.toHaveBeenCalled();
    });
  });

  describe('derived flags', () => {
    it('should disable add button when activeFormId is set', () => {
      mocks.activeFormId = 'some-form';

      const { result } = renderHook(() => useImprintsList());

      expect(result.current.isAddNewButtonDisabled).toBe(true);
    });
  });
});
