import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FundingEntity } from '@/src/entities/funding/model/funding.types';

const mocks = vi.hoisted(() => {
  const activeFunding: FundingEntity = {
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
    activeFunding,
    updateFunding: vi.fn(),
    update: vi.fn(),
    finishEditing: vi.fn(),
  };
});

vi.mock('@/src/entities/funding', () => ({
  useFundingStateMachine: () => ({
    activeEntity: mocks.activeFunding,
    finishEditing: mocks.finishEditing,
    update: mocks.update,
  }),
  useUpdateFunding: () => ({ updateFunding: mocks.updateFunding, loading: false }),
}));

import { useEditFunding } from './useEditFunding';

describe('useEditFunding', () => {
  beforeEach(() => {
    mocks.updateFunding.mockClear();
    mocks.update.mockClear();
  });

  const defaultProps = { workId: 'work-1' };

  describe('updateProject', () => {
    it('should update state machine and call updateFunding when no callback', async () => {
      const { result } = renderHook(() => useEditFunding(defaultProps));

      await act(async () => {
        await result.current.updateProject({ projectName: 'New Project' });
      });

      expect(mocks.update).toHaveBeenCalledWith(
        expect.objectContaining({ projectName: 'New Project' }),
      );
      expect(mocks.updateFunding).toHaveBeenCalledWith(
        expect.objectContaining({ projectName: 'New Project' }),
      );
    });

    it('should call onProjectUpdate callback instead of updateFunding', () => {
      const onProjectUpdate = vi.fn();
      const { result } = renderHook(() =>
        useEditFunding({ ...defaultProps, onProjectUpdate }),
      );

      act(() => {
        result.current.updateProject({ projectName: 'Callback Project' });
      });

      expect(mocks.updateFunding).not.toHaveBeenCalled();
      expect(onProjectUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ projectName: 'Callback Project' }),
      );
    });

    it('should default projectName to empty string', () => {
      const { result } = renderHook(() => useEditFunding(defaultProps));

      act(() => {
        result.current.updateProject({});
      });

      expect(mocks.update).toHaveBeenCalledWith(
        expect.objectContaining({ projectName: '' }),
      );
    });
  });

  describe('updateProjectShortName', () => {
    it('should call updateFunding when no callback', () => {
      const { result } = renderHook(() => useEditFunding(defaultProps));

      act(() => {
        result.current.updateProjectShortName({ projectShortname: 'NP' });
      });

      expect(mocks.update).toHaveBeenCalledWith(
        expect.objectContaining({ projectShortname: 'NP' }),
      );
      expect(mocks.updateFunding).toHaveBeenCalled();
    });

    it('should call onProjectShortNameUpdate callback', () => {
      const onProjectShortNameUpdate = vi.fn();
      const { result } = renderHook(() =>
        useEditFunding({ ...defaultProps, onProjectShortNameUpdate }),
      );

      act(() => {
        result.current.updateProjectShortName({ projectShortname: 'CALLBACK' });
      });

      expect(mocks.updateFunding).not.toHaveBeenCalled();
      expect(onProjectShortNameUpdate).toHaveBeenCalled();
    });
  });

  describe('updateProgram', () => {
    it('should call updateFunding when no callback', () => {
      const { result } = renderHook(() => useEditFunding(defaultProps));

      act(() => {
        result.current.updateProgram({ program: 'New Program' });
      });

      expect(mocks.updateFunding).toHaveBeenCalled();
    });

    it('should call onProgramUpdate callback', () => {
      const onProgramUpdate = vi.fn();
      const { result } = renderHook(() =>
        useEditFunding({ ...defaultProps, onProgramUpdate }),
      );

      act(() => {
        result.current.updateProgram({ program: 'CB Program' });
      });

      expect(mocks.updateFunding).not.toHaveBeenCalled();
      expect(onProgramUpdate).toHaveBeenCalled();
    });
  });

  describe('updateGrantNumber', () => {
    it('should call updateFunding when no callback', () => {
      const { result } = renderHook(() => useEditFunding(defaultProps));

      act(() => {
        result.current.updateGrantNumber({ grantNumber: 'GRANT-999' });
      });

      expect(mocks.updateFunding).toHaveBeenCalled();
    });

    it('should call onGrantNumberUpdate callback', () => {
      const onGrantNumberUpdate = vi.fn();
      const { result } = renderHook(() =>
        useEditFunding({ ...defaultProps, onGrantNumberUpdate }),
      );

      act(() => {
        result.current.updateGrantNumber({ grantNumber: 'CB-GRANT' });
      });

      expect(mocks.updateFunding).not.toHaveBeenCalled();
      expect(onGrantNumberUpdate).toHaveBeenCalled();
    });
  });

  describe('updateInstitution', () => {
    it('should call updateFunding with institutionId from data', () => {
      const { result } = renderHook(() => useEditFunding(defaultProps));

      act(() => {
        result.current.updateInstitution({ institution: { value: 'inst-2', label: 'New Uni' } });
      });

      expect(mocks.updateFunding).toHaveBeenCalledWith(
        expect.objectContaining({ institutionId: 'inst-2' }),
      );
    });

    it('should call onInstitutionUpdate callback', () => {
      const onInstitutionUpdate = vi.fn();
      const { result } = renderHook(() =>
        useEditFunding({ ...defaultProps, onInstitutionUpdate }),
      );

      act(() => {
        result.current.updateInstitution({ institution: { value: 'inst-3', label: 'CB Uni' } });
      });

      expect(mocks.updateFunding).not.toHaveBeenCalled();
      expect(onInstitutionUpdate).toHaveBeenCalled();
    });
  });

  it('should return activeFunding and finishEditing from state machine', () => {
    const { result } = renderHook(() => useEditFunding(defaultProps));

    expect(result.current.activeFunding).toBe(mocks.activeFunding);
    expect(result.current.finishEditing).toBe(mocks.finishEditing);
  });
});
