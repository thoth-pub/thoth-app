import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkContribution } from '@/src/entities/contribution/model/contribution.types';

const mocks = vi.hoisted(() => {
  const activeContribution: WorkContribution = {
    id: 'contrib-1',
    contributionId: 'contrib-1',
    contributorId: 'contributor-1',
    fullName: 'John Doe',
    firstName: 'John',
    lastName: 'Doe',
    type: 'AUTHOR',
    isMain: true,
    orderNumber: 1,
    orcidId: '',
    website: '',
    affiliations: [],
    biographies: [],
  };

  return {
    activeContribution,
    work: {
      imprintId: 'imprint-1',
      contributions: [activeContribution],
    },
    user: { isSuperuser: true },
    finishEditing: vi.fn(),
    closeForm: vi.fn(),
    updateWorkContribution: vi.fn(),
    moveAffiliation: vi.fn(),
    updateAffiliations: vi.fn(),
    deleteAffiliation: vi.fn(),
    updateContributor: vi.fn(),
    createBiography: vi.fn(),
    updateBiographyMutation: vi.fn(),
    deleteBiography: vi.fn(),
    computeBiographiesDiff: vi.fn(),
    contributedToPublishers: [],
    sendErrorNotification: vi.fn(),
    queryClient: { invalidateQueries: vi.fn() },
    defaultLocaleOption: { value: 'en', label: 'English' },
    onCompleted: vi.fn(),
    onError: vi.fn(),
  };
});

vi.mock('@/src/entities/contribution', () => ({
  useContributionStateMachine: () => ({
    activeEntity: mocks.activeContribution,
    finishEditing: mocks.finishEditing,
  }),
  useCreateBiography: () => ({ createBiography: mocks.createBiography }),
  useDeleteBiography: () => ({ deleteBiography: mocks.deleteBiography }),
  useUpdateBiography: () => ({ updateBiography: mocks.updateBiographyMutation }),
}));

vi.mock('@/src/entities/contributor', () => ({
  useLinkedPublishers: () => ({ contributedToPublishers: mocks.contributedToPublishers }),
  useUpdateContributor: () => ({
    updateContributor: mocks.updateContributor,
  }),
}));

vi.mock('@/src/entities/user', () => ({
  useUser: () => ({ user: mocks.user }),
}));

vi.mock('@/src/entities/work', () => ({
  useWork: () => ({
    work: mocks.work,
    updateContribution: mocks.updateWorkContribution,
  }),
}));

vi.mock('@/src/entities/affiliation', () => ({
  useAffiliationsForm: () => ({
    updateAffiliations: mocks.updateAffiliations,
    deleteAffiliation: mocks.deleteAffiliation,
  }),
  useMoveAffiliation: () => ({ moveAffiliation: mocks.moveAffiliation }),
}));

vi.mock('@/src/shared/hooks', () => ({
  useDefaultLocaleOption: () => mocks.defaultLocaleOption,
  useNotifications: () => ({ sendErrorNotification: mocks.sendErrorNotification }),
}));

vi.mock('@/src/shared/store/forms/hooks/useFormStateMachine', () => ({
  default: () => ({ closeForm: mocks.closeForm, activeFormId: null }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => mocks.queryClient,
}));

vi.mock('@/src/shared/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/src/shared/utils')>();

  return {
    ...actual,
    removePrefix: (s: string) => s,
  };
});

vi.mock('@/src/shared/utils/biographies', () => ({
  computeBiographiesDiff: mocks.computeBiographiesDiff,
}));

import { useEditContribution } from './useEditContribution';

describe('useEditContribution', () => {
  const defaultProps = { workId: 'work-1' };

  beforeEach(() => {
    mocks.closeForm.mockClear();
    mocks.updateWorkContribution.mockClear();
    mocks.updateContributor.mockClear();
    mocks.createBiography.mockClear();
    mocks.updateBiographyMutation.mockClear();
    mocks.deleteBiography.mockClear();
    mocks.queryClient.invalidateQueries.mockClear();
    mocks.computeBiographiesDiff.mockReset();
    mocks.computeBiographiesDiff.mockReturnValue({
      biographiesToDelete: [],
      updatedBiographies: [],
      unchangedBiographies: [],
      newBiographies: [],
    });
  });

  it('should return contribution from state', () => {
    const { result } = renderHook(() => useEditContribution(defaultProps));

    expect(result.current.contribution).toBeDefined();
  });

  describe('updateNames', () => {
    it('should update contribution names via callback when onNamesUpdate is provided', () => {
      const onNamesUpdate = vi.fn();
      const { result } = renderHook(() =>
        useEditContribution({ ...defaultProps, onNamesUpdate }),
      );

      act(() => {
        result.current.updateNames({ fullName: 'Jane Doe', firstName: 'Jane', lastName: 'Doe' });
      });

      expect(onNamesUpdate).toHaveBeenCalledWith({
        fullName: 'Jane Doe',
        firstName: 'Jane',
        lastName: 'Doe',
      });
      expect(mocks.updateWorkContribution).not.toHaveBeenCalled();
    });

    it('should update contribution names directly when no callback', () => {
      const { result } = renderHook(() => useEditContribution(defaultProps));

      act(() => {
        result.current.updateNames({ fullName: 'Jane Doe', firstName: 'Jane', lastName: 'Doe' });
      });

      expect(mocks.updateWorkContribution).toHaveBeenCalledWith(
        expect.objectContaining({ fullName: 'Jane Doe' }),
      );
    });
  });

  describe('updateType', () => {
    it('should update type via callback when provided', () => {
      const onTypeUpdate = vi.fn();
      const { result } = renderHook(() =>
        useEditContribution({ ...defaultProps, onTypeUpdate }),
      );

      act(() => {
        result.current.updateType({ contributorType: 'EDITOR' });
      });

      expect(onTypeUpdate).toHaveBeenCalledWith({ contributorType: 'EDITOR' });
    });

    it('should update type directly when no callback', () => {
      const { result } = renderHook(() => useEditContribution(defaultProps));

      act(() => {
        result.current.updateType({ contributorType: 'EDITOR' });
      });

      expect(mocks.updateWorkContribution).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'EDITOR' }),
      );
    });
  });

  describe('updateBiography', () => {
    it('should call onBiographiesUpdate callback when provided', async () => {
      const onBiographiesUpdate = vi.fn();
      const { result } = renderHook(() =>
        useEditContribution({ ...defaultProps, onBiographiesUpdate }),
      );

      await act(async () => {
        await result.current.updateBiography({ biographies: [] });
      });

      expect(onBiographiesUpdate).toHaveBeenCalledWith({ biographies: [] });
    });

    it('should handle biographies via direct mutations when no callback', async () => {
      const { result } = renderHook(() => useEditContribution(defaultProps));

      await act(async () => {
        await result.current.updateBiography({ biographies: [] });
      });

      expect(mocks.queryClient.invalidateQueries).toHaveBeenCalled();
    });

    it('rejects when a biography mutation fails', async () => {
      const error = new Error('Biography update failed');
      mocks.computeBiographiesDiff.mockReturnValueOnce({
        biographiesToDelete: [],
        updatedBiographies: [
          {
            id: 'bio-1',
            canonical: true,
            content: 'Updated biography',
            localeCode: 'EN',
            contributionId: 'contrib-1',
          },
        ],
        unchangedBiographies: [],
        newBiographies: [],
      });
      mocks.updateBiographyMutation.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useEditContribution(defaultProps));

      await expect(
        result.current.updateBiography({
          biographies: [
            {
              biographyId: 'bio-1',
              contributorBiography: 'Updated biography',
              language: { value: 'EN', label: 'English' },
            },
          ],
        }),
      ).rejects.toBe(error);

      expect(mocks.queryClient.invalidateQueries).not.toHaveBeenCalled();
    });
  });

  describe('updateOrcid', () => {
    it('should call onOrcidUpdate callback when provided', () => {
      const onOrcidUpdate = vi.fn();
      const { result } = renderHook(() =>
        useEditContribution({ ...defaultProps, onOrcidUpdate }),
      );

      act(() => {
        result.current.updateOrcid({ orcid: '0000-0002-1825-0097' });
      });

      expect(onOrcidUpdate).toHaveBeenCalledWith({ orcid: '0000-0002-1825-0097' });
    });

    it('should call updateContributor when no callback', () => {
      const { result } = renderHook(() => useEditContribution(defaultProps));

      act(() => {
        result.current.updateOrcid({ orcid: '0000-0002-1825-0097' });
      });

      expect(mocks.updateContributor).toHaveBeenCalled();
    });
  });

  describe('updateCanonical', () => {
    it('should call onIsMainSubmit callback when provided', () => {
      const onIsMainSubmit = vi.fn();
      const { result } = renderHook(() =>
        useEditContribution({ ...defaultProps, onIsMainSubmit }),
      );

      act(() => {
        result.current.updateCanonical(false);
      });

      expect(onIsMainSubmit).toHaveBeenCalledWith(false);
    });

    it('should update contribution directly when no callback', () => {
      const { result } = renderHook(() => useEditContribution(defaultProps));

      act(() => {
        result.current.updateCanonical(false);
      });

      expect(mocks.updateWorkContribution).toHaveBeenCalledWith(
        expect.objectContaining({ isMain: false }),
      );
    });
  });

  describe('updateAffiliations', () => {
    it('should call onAffiliationsUpdate when provided', async () => {
      const onAffiliationsUpdate = vi.fn();
      const { result } = renderHook(() =>
        useEditContribution({ ...defaultProps, onAffiliationsUpdate }),
      );

      await act(async () => {
        await result.current.updateAffiliations({
          affiliations: [{ id: 'aff-1', affiliation: { value: 'inst-1', label: 'Inst 1' }, position: 'Author' }],
        });
      });

      expect(onAffiliationsUpdate).toHaveBeenCalled();
    });
  });

  describe('moveAffiliation', () => {
    it('should call onMoveAffiliation callback when provided', () => {
      const onMoveAffiliation = vi.fn();
      const { result } = renderHook(() =>
        useEditContribution({ ...defaultProps, onMoveAffiliation }),
      );

      act(() => {
        result.current.moveAffiliation([
          { id: 'aff-1', affiliation: { value: 'inst-1', label: 'Inst 1' }, position: 'Author' },
        ]);
      });

      expect(onMoveAffiliation).toHaveBeenCalled();
    });
  });
});
