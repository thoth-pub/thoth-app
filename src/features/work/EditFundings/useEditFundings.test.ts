import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FundingEntity } from '@/src/entities/funding/model/funding.types';

const mocks = vi.hoisted(() => {
  const funding: FundingEntity = {
    id: 'fund-1',
    grantNumber: 'GRANT-001',
    institutionId: 'inst-1',
    program: 'Test Program',
    projectName: 'Test Project',
    projectShortname: 'TP',
    institutionName: 'Test University',
    institutionRor: 'https://ror.org/test',
  };

  return {
    funding,
    getDefaultFunding: vi.fn(() => ({
      id: '0000-0000-0000-0000-0',
      grantNumber: '',
      institutionId: '',
      program: '',
      projectName: '',
      projectShortname: '',
      institutionName: '',
      institutionRor: '',
    })),
    work: {
      fundings: [funding],
    },
    edit: vi.fn(),
    finishEditing: vi.fn(),
    deleteFunding: vi.fn(),
    activeFormId: null,
    isFundingsRequired: false,
    isFundingsEmpty: false,
  };
});

vi.mock('@/src/entities/funding', () => ({
  useFundingStateMachine: () => ({
    activeEntity: mocks.funding,
    edit: mocks.edit,
    finishEditing: mocks.finishEditing,
  }),
  useDeleteFunding: () => ({
    deleteFunding: mocks.deleteFunding,
    loading: false,
  }),
}));

vi.mock('@/src/entities/work', () => ({
  useWork: () => ({ work: mocks.work }),
  useWorkRecommendations: () => ({
    isFundingsRequired: mocks.isFundingsRequired,
    isFundingsEmpty: mocks.isFundingsEmpty,
  }),
}));

vi.mock('@/src/shared/store/forms/hooks/useFormStateMachine', () => ({
  default: () => ({ activeFormId: mocks.activeFormId }),
}));

vi.mock('@/src/shared/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/src/shared/utils')>();

  return {
    ...actual,
    getDefaultFunding: mocks.getDefaultFunding,
    isDefaultId: (id: string) => id === '0000-0000-0000-0000-0',
  };
});

import { useEditFundings } from './useEditFundings';

describe('useEditFundings', () => {
  beforeEach(() => {
    mocks.edit.mockClear();
    mocks.finishEditing.mockClear();
    mocks.deleteFunding.mockClear();
  });

  it('should return fundings from work', () => {
    const { result } = renderHook(() => useEditFundings('work-1'));

    expect(result.current.fundings).toBe(mocks.work.fundings);
  });

  it('should return activeFunding from state machine', () => {
    const { result } = renderHook(() => useEditFundings('work-1'));

    expect(result.current.activeFunding).toBe(mocks.funding);
  });

  describe('addFunding', () => {
    it('should edit a default funding', () => {
      const { result } = renderHook(() => useEditFundings('work-1'));

      act(() => {
        result.current.addFunding();
      });

      expect(mocks.edit).toHaveBeenCalledWith(mocks.getDefaultFunding());
    });
  });

  describe('editFunding', () => {
    it('should find funding by id and edit it', () => {
      const { result } = renderHook(() => useEditFundings('work-1'));

      act(() => {
        result.current.editFunding('fund-1');
      });

      expect(mocks.edit).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'fund-1', grantNumber: 'GRANT-001' }),
      );
    });

    it('should not edit when funding is not found', () => {
      const { result } = renderHook(() => useEditFundings('work-1'));

      act(() => {
        result.current.editFunding('non-existent');
      });

      expect(mocks.edit).not.toHaveBeenCalled();
    });
  });

  describe('deleteFunding', () => {
    it('should call deleteFunding mutation', () => {
      const { result } = renderHook(() => useEditFundings('work-1'));

      act(() => {
        result.current.deleteFunding('fund-1');
      });

      expect(mocks.deleteFunding).toHaveBeenCalledWith('fund-1');
    });
  });

  describe('derived flags', () => {
    it('should set isNewFunding when id is a default id', () => {
      vi.mocked(mocks.funding).id = '0000-0000-0000-0000-0';

      const { result } = renderHook(() => useEditFundings('work-1'));

      expect(result.current.isNewFunding).toBe(true);
    });

    it('should forward fundings recommendation flags', () => {
      mocks.isFundingsRequired = true;
      mocks.isFundingsEmpty = true;

      const { result } = renderHook(() => useEditFundings('work-1'));

      expect(result.current.isFundingsRequired).toBe(true);
      expect(result.current.isFundingsEmpty).toBe(true);
    });

    it('should set editDisabled when activeFormId is truthy', () => {
      mocks.activeFormId = 'some-form';

      const { result } = renderHook(() => useEditFundings('work-1'));

      expect(result.current.editDisabled).toBe(true);
    });
  });
});
