/* eslint-disable @eslint-react/hooks-extra/no-unnecessary-use-prefix */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FundingEntity } from '@/src/entities/funding/model/funding.types';
import type { WorkEntity } from '@/src/entities/work/model/work.types';

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------
const chapters: WorkEntity[] = [
  {
    id: 'chapter-1',
    contributions: [],
    fundings: [
      {
        id: 'fund-1',
        grantNumber: 'GRANT-001',
        institutionId: 'inst-1',
        institutionName: 'Uni A',
        program: 'Program X',
        projectName: 'Project Alpha',
        projectShortname: 'PA',
        institutionRor: '',
      },
      {
        id: 'fund-2',
        grantNumber: 'GRANT-002',
        institutionId: 'inst-2',
        institutionName: 'Uni B',
        program: 'Program Y',
        projectName: 'Project Beta',
        projectShortname: 'PB',
        institutionRor: '',
      },
    ],
    languages: [],
    titles: [],
    subjects: [],
  },
  {
    id: 'chapter-2',
    contributions: [],
    fundings: [
      {
        id: 'fund-3',
        grantNumber: 'GRANT-001',
        institutionId: 'inst-1',
        institutionName: 'Uni A',
        program: 'Program X',
        projectName: 'Project Alpha',
        projectShortname: 'PA',
        institutionRor: '',
      },
    ],
    languages: [],
    titles: [],
    subjects: [],
  },
];

const uniqueFundings: FundingEntity[] = [
  {
    id: 'fund-1',
    grantNumber: 'GRANT-001',
    institutionId: 'inst-1',
    institutionName: 'Uni A',
    program: 'Program X',
    projectName: 'Project Alpha',
    projectShortname: 'PA',
    institutionRor: '',
  },
  {
    id: 'fund-2',
    grantNumber: 'GRANT-002',
    institutionId: 'inst-2',
    institutionName: 'Uni B',
    program: 'Program Y',
    projectName: 'Project Beta',
    projectShortname: 'PB',
    institutionRor: '',
  },
];

const mocks = vi.hoisted(() => ({
  deleteFundingsMutation: vi.fn().mockResolvedValue(undefined),
  updateFunding: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/src/entities/funding', () => ({
  useDeleteFunding: () => ({
    deleteFundings: mocks.deleteFundingsMutation,
    loading: false,
  }),
  useUpdateFunding: () => ({
    updateFunding: mocks.updateFunding,
    loading: false,
  }),
}));

import { useChaptersFundings } from '../useChaptersFundings';
import { useChaptersFundingsGrantNumbers } from '../useChaptersFundingsGrantNumbers';
import { useChaptersFundingsInstitutions } from '../useChaptersFundingsInstitutions';
import { useChaptersFundingsProgram } from '../useChaptersFundingsProgram';
import { useChaptersFundingsProjects } from '../useChaptersFundingsProjects';

// ---------------------------------------------------------------------------
// Hook 1 – useChaptersFundings
// ---------------------------------------------------------------------------
describe('useChaptersFundings', () => {
  beforeEach(() => {
    mocks.deleteFundingsMutation.mockClear();
  });

  it('should return unique fundings from all chapters', () => {
    const { result } = renderHook(() => useChaptersFundings(chapters));

    // fund-1 and fund-3 have the same institution/grant/program/project → deduped
    expect(result.current.uniqueFundings).toHaveLength(2);
    expect(result.current.uniqueFundings.map((f) => f.id)).toEqual(['fund-1', 'fund-2']);
  });

  it('should return deleteLoading flag', () => {
    const { result } = renderHook(() => useChaptersFundings(chapters));

    expect(result.current.deleteLoading).toBe(false);
  });

  describe('deleteFundings', () => {
    it('should delete all matching fundings by id', async () => {
      const { result } = renderHook(() => useChaptersFundings(chapters));

      await act(async () => {
        await result.current.deleteFundings('fund-1');
      });

      // fund-1 and fund-3 share the same fields, both should be deleted
      expect(mocks.deleteFundingsMutation).toHaveBeenCalledWith(['fund-1', 'fund-3']);
    });

    it('should do nothing when funding is not found', async () => {
      const { result } = renderHook(() => useChaptersFundings(chapters));

      await act(async () => {
        await result.current.deleteFundings('non-existent');
      });

      expect(mocks.deleteFundingsMutation).not.toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// Hook 2 – useChaptersFundingsGrantNumbers
// ---------------------------------------------------------------------------
describe('useChaptersFundingsGrantNumbers', () => {
  beforeEach(() => {
    mocks.updateFunding.mockClear();
  });

  const params = { chapters, fundings: uniqueFundings };

  it('should update grant numbers for matching fundings across chapters', async () => {
    const updatedFunding: FundingEntity = {
      ...uniqueFundings[0],
      grantNumber: 'GRANT-UPDATED',
    };

    const { result } = renderHook(() => useChaptersFundingsGrantNumbers(params));

    const updated = await act(async () => {
      return result.current.updateGrantNumbers(updatedFunding);
    });

    expect(mocks.updateFunding).toHaveBeenCalled();
    expect(updated).toBeDefined();
    if (updated) {
      expect(updated[0].grantNumber).toBe('GRANT-UPDATED');
    }
  });

  it('should return undefined when no fundings match the update criteria', async () => {
    const { result } = renderHook(() => useChaptersFundingsGrantNumbers(params));

    const updated = await act(async () => {
      return result.current.updateGrantNumbers(uniqueFundings[0]);
    });

    // No change in grant number → nothing to update
    expect(updated).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Hook 3 – useChaptersFundingsInstitutions
// ---------------------------------------------------------------------------
describe('useChaptersFundingsInstitutions', () => {
  beforeEach(() => {
    mocks.updateFunding.mockClear();
  });

  const params = { chapters, fundings: uniqueFundings };

  it('should update institution for matching fundings across chapters', async () => {
    const updatedFunding: FundingEntity = {
      ...uniqueFundings[0],
      institutionId: 'inst-new',
      institutionName: 'New Uni',
    };

    const { result } = renderHook(() => useChaptersFundingsInstitutions(params));

    const updated = await act(async () => {
      return result.current.updateInstitutions(updatedFunding);
    });

    expect(mocks.updateFunding).toHaveBeenCalled();
    expect(updated).toBeDefined();
    if (updated) {
      expect(updated[0].institutionId).toBe('inst-new');
    }
  });

  it('should return undefined when no fundings match', async () => {
    const { result } = renderHook(() => useChaptersFundingsInstitutions(params));

    const updated = await act(async () => {
      return result.current.updateInstitutions(uniqueFundings[0]);
    });

    expect(updated).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Hook 4 – useChaptersFundingsProgram
// ---------------------------------------------------------------------------
describe('useChaptersFundingsProgram', () => {
  beforeEach(() => {
    mocks.updateFunding.mockClear();
  });

  const params = { chapters, fundings: uniqueFundings };

  it('should update program for matching fundings across chapters', async () => {
    const updatedFunding: FundingEntity = {
      ...uniqueFundings[0],
      program: 'New Program',
    };

    const { result } = renderHook(() => useChaptersFundingsProgram(params));

    const updated = await act(async () => {
      return result.current.updatePrograms(updatedFunding);
    });

    expect(mocks.updateFunding).toHaveBeenCalled();
    expect(updated).toBeDefined();
    if (updated) {
      expect(updated[0].program).toBe('New Program');
    }
  });

  it('should return undefined when no fundings match', async () => {
    const { result } = renderHook(() => useChaptersFundingsProgram(params));

    const updated = await act(async () => {
      return result.current.updatePrograms(uniqueFundings[0]);
    });

    expect(updated).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Hook 5 – useChaptersFundingsProjects
// ---------------------------------------------------------------------------
describe('useChaptersFundingsProjects', () => {
  beforeEach(() => {
    mocks.updateFunding.mockClear();
  });

  const params = { chapters, fundings: uniqueFundings };

  describe('updateProjects', () => {
    it('should update project name for matching fundings across chapters', async () => {
      const updatedFunding: FundingEntity = {
        ...uniqueFundings[0],
        projectName: 'New Project',
      };

      const { result } = renderHook(() => useChaptersFundingsProjects(params));

      const updated = await act(async () => {
        return result.current.updateProjects(updatedFunding);
      });

      expect(mocks.updateFunding).toHaveBeenCalled();
      expect(updated).toBeDefined();
      if (updated) {
        expect(updated[0].projectName).toBe('New Project');
      }
    });

    it('should return undefined when no fundings match', async () => {
      const { result } = renderHook(() => useChaptersFundingsProjects(params));

      const updated = await act(async () => {
        return result.current.updateProjects(uniqueFundings[0]);
      });

      expect(updated).toBeUndefined();
    });
  });

  describe('updateProjectsShortName', () => {
    it('should update project short name for matching fundings across chapters', async () => {
      const updatedFunding: FundingEntity = {
        ...uniqueFundings[0],
        projectShortname: 'NP',
      };

      const { result } = renderHook(() => useChaptersFundingsProjects(params));

      const updated = await act(async () => {
        return result.current.updateProjectsShortName(updatedFunding);
      });

      expect(mocks.updateFunding).toHaveBeenCalled();
      expect(updated).toBeDefined();
      if (updated) {
        expect(updated[0].projectShortname).toBe('NP');
      }
    });

    it('should return undefined when no fundings match', async () => {
      const { result } = renderHook(() => useChaptersFundingsProjects(params));

      const updated = await act(async () => {
        return result.current.updateProjectsShortName(uniqueFundings[0]);
      });

      expect(updated).toBeUndefined();
    });
  });
});
