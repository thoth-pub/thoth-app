import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FundingEntity } from '@/src/entities/funding/model/funding.types';

const mocks = vi.hoisted(() => {
  const activeFunding: FundingEntity = {
    id: '0000-0000-0000-0000-0',
    grantNumber: '',
    institutionId: '',
    program: '',
    projectName: '',
    projectShortname: '',
    institutionName: '',
    institutionRor: '',
  };

  return {
    activeFunding,
    finishEditing: vi.fn(),
    createFunding: vi.fn(),
  };
});

vi.mock('@/src/entities/funding', () => ({
  useFundingStateMachine: () => ({
    activeEntity: mocks.activeFunding,
    finishEditing: mocks.finishEditing,
  }),
  useCreateFunding: () => ({
    createFunding: mocks.createFunding,
    loading: false,
  }),
}));

import { useAddFunding } from './useAddFunding';

describe('useAddFunding', () => {
  const defaultProps = { workId: 'work-1' };

  beforeEach(() => {
    mocks.finishEditing.mockClear();
    mocks.createFunding.mockClear();
  });

  it('should return initial funding from state machine', () => {
    const { result } = renderHook(() => useAddFunding(defaultProps));

    expect(result.current.funding).toEqual(mocks.activeFunding);
  });

  describe('create', () => {
    it('should call onCreate callback when provided', () => {
      const onCreate = vi.fn();
      const { result } = renderHook(() =>
        useAddFunding({ ...defaultProps, onCreate }),
      );

      act(() => {
        result.current.create();
      });

      expect(onCreate).toHaveBeenCalledWith(mocks.activeFunding);
      expect(mocks.finishEditing).toHaveBeenCalled();
      expect(mocks.createFunding).not.toHaveBeenCalled();
    });

    it('should call createFunding mutation when no callback', () => {
      const { result } = renderHook(() => useAddFunding(defaultProps));

      act(() => {
        result.current.create();
      });

      expect(mocks.createFunding).toHaveBeenCalledWith(mocks.activeFunding);
      expect(mocks.finishEditing).toHaveBeenCalled();
    });

    it('should call finishEditing after createFunding', () => {
      const { result } = renderHook(() => useAddFunding(defaultProps));

      act(() => {
        result.current.create();
      });

      expect(mocks.finishEditing).toHaveBeenCalled();
    });
  });

  describe('updateProject', () => {
    it('should update project name', () => {
      const { result } = renderHook(() => useAddFunding(defaultProps));

      act(() => {
        result.current.updateProject({ projectName: 'New Project' });
      });

      expect(result.current.funding?.projectName).toBe('New Project');
    });

    it('should do nothing when projectName is empty', () => {
      const { result } = renderHook(() => useAddFunding(defaultProps));

      act(() => {
        result.current.updateProject({ projectName: '' });
      });

      expect(result.current.funding?.projectName).toBe('');
    });
  });

  describe('updateProgram', () => {
    it('should update program', () => {
      const { result } = renderHook(() => useAddFunding(defaultProps));

      act(() => {
        result.current.updateProgram({ program: 'New Program' });
      });

      expect(result.current.funding?.program).toBe('New Program');
    });

    it('should do nothing when program is empty', () => {
      const { result } = renderHook(() => useAddFunding(defaultProps));

      act(() => {
        result.current.updateProgram({ program: '' });
      });

      expect(result.current.funding?.program).toBe('');
    });
  });

  describe('updateGrantNumber', () => {
    it('should update grant number', () => {
      const { result } = renderHook(() => useAddFunding(defaultProps));

      act(() => {
        result.current.updateGrantNumber({ grantNumber: 'GRANT-999' });
      });

      expect(result.current.funding?.grantNumber).toBe('GRANT-999');
    });

    it('should do nothing when grantNumber is empty', () => {
      const { result } = renderHook(() => useAddFunding(defaultProps));

      act(() => {
        result.current.updateGrantNumber({ grantNumber: '' });
      });

      expect(result.current.funding?.grantNumber).toBe('');
    });
  });

  describe('updateInstitution', () => {
    it('should update institution id', () => {
      const { result } = renderHook(() => useAddFunding(defaultProps));

      act(() => {
        result.current.updateInstitution({ institution: { value: 'inst-2', label: 'New Institution' } });
      });

      expect(result.current.funding?.institutionId).toBe('inst-2');
    });
  });
});
