import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkContribution } from '@/src/entities/contribution/model/contribution.types';

const mocks = vi.hoisted(() => {
  const getActiveContribution = (): WorkContribution => ({
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
  });

  return {
    getActiveContribution,
    activeContribution: getActiveContribution(),
    contributor: {
      id: 'contributor-1',
      fullName: 'John Doe',
      firstName: 'John',
      lastName: 'Doe',
      name: 'John Doe',
      updatedAt: '',
      lastContributionTitle: '',
    },
    update: vi.fn(),
    finishEditing: vi.fn(),
    updateContributor: vi.fn(),
    work: {
      imprintId: 'imprint-1',
      contributions: [getActiveContribution()],
    },
    createContribution: vi.fn(),
    defaultLocaleOption: { value: 'en', label: 'English' },
  };
});

vi.mock('@/src/entities/contribution', () => ({
  useContributionStateMachine: () => ({
    activeEntity: mocks.getActiveContribution(),
    update: mocks.update,
    finishEditing: mocks.finishEditing,
  }),
}));

vi.mock('@/src/entities/contributor', () => ({
  useContributor: () => ({ contributor: mocks.contributor }),
  useUpdateContributor: () => ({
    updateContributor: mocks.updateContributor,
  }),
}));

vi.mock('@/src/entities/work', () => ({
  useWork: () => ({
    work: mocks.work,
    createContribution: mocks.createContribution,
  }),
}));

vi.mock('@/src/shared/hooks', () => ({
  useDefaultLocaleOption: () => mocks.defaultLocaleOption,
}));

import { useAddNewContribution } from './useAddNewContribution';

describe('useAddNewContribution', () => {
  const defaultProps = { workId: 'work-1' };

  beforeEach(() => {
    mocks.update.mockClear();
    mocks.finishEditing.mockClear();
    mocks.updateContributor.mockClear();
    mocks.createContribution.mockClear();
  });

  it('should return contribution and default locale', () => {
    const { result } = renderHook(() => useAddNewContribution(defaultProps));

    expect(result.current.contribution).toStrictEqual(mocks.activeContribution);
    expect(result.current.defaultLocaleOption).toBe(mocks.defaultLocaleOption);
  });

  describe('updateNames', () => {
    it('should update contribution with names', () => {
      const { result } = renderHook(() => useAddNewContribution(defaultProps));

      act(() => {
        result.current.updateNames({ fullName: 'Jane Doe', firstName: 'Jane', lastName: 'Doe' });
      });

      expect(mocks.update).toHaveBeenCalledWith(
        expect.objectContaining({ fullName: 'Jane Doe', firstName: 'Jane', lastName: 'Doe' }),
      );
    });

    it('should not crash with empty first name', () => {
      const { result } = renderHook(() => useAddNewContribution(defaultProps));

      act(() => {
        result.current.updateNames({ fullName: 'Jane Doe', firstName: '', lastName: 'Doe' });
      });

      expect(mocks.update).toHaveBeenCalledWith(
        expect.objectContaining({ fullName: 'Jane Doe', firstName: '', lastName: 'Doe' }),
      );
    });
  });

  describe('updateContributorType', () => {
    it('should update contribution type', () => {
      const { result } = renderHook(() => useAddNewContribution(defaultProps));

      act(() => {
        result.current.updateContributorType({ contributorType: 'EDITOR' });
      });

      expect(mocks.update).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'EDITOR' }),
      );
    });
  });

  describe('updateOrcid', () => {
    it('should update contribution orcid', () => {
      const { result } = renderHook(() => useAddNewContribution(defaultProps));

      act(() => {
        result.current.updateOrcid({ orcid: '0000-0002-1825-0097' });
      });

      expect(mocks.update).toHaveBeenCalledWith(
        expect.objectContaining({ orcidId: '0000-0002-1825-0097' }),
      );
    });
  });

  describe('updateCanonical', () => {
    it('should set isMain to true', () => {
      const { result } = renderHook(() => useAddNewContribution(defaultProps));

      act(() => {
        result.current.updateCanonical(true);
      });

      expect(mocks.update).toHaveBeenCalledWith(
        expect.objectContaining({ isMain: true }),
      );
    });
  });

  describe('create', () => {
    it('should call onCreate callback when provided', () => {
      const onCreate = vi.fn();
      const { result } = renderHook(() =>
        useAddNewContribution({ ...defaultProps, onCreate }),
      );

      act(() => {
        result.current.create();
      });

      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'contrib-1' }),
      );
      expect(mocks.finishEditing).not.toHaveBeenCalled();
      expect(mocks.createContribution).not.toHaveBeenCalled();
    });

    it('should create contribution with next order number', () => {
      const { result } = renderHook(() => useAddNewContribution(defaultProps));

      act(() => {
        result.current.create();
      });

      expect(mocks.createContribution).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ orderNumber: 2 }),
          relatedWorkId: 'work-1',
        }),
      );
      expect(mocks.finishEditing).toHaveBeenCalled();
    });

    it('should call finishEditing after creation', () => {
      const { result } = renderHook(() => useAddNewContribution(defaultProps));

      act(() => {
        result.current.create();
      });

      expect(mocks.finishEditing).toHaveBeenCalled();
    });
  });
});
