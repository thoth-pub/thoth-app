/* eslint-disable @eslint-react/hooks-extra/no-unnecessary-use-prefix */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkContribution } from '@/src/entities/contribution/model/contribution.types';
import type { WorkEntity } from '@/src/entities/work/model/work.types';

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------
const chapters: WorkEntity[] = [
  {
    id: 'chapter-1',
    contributions: [
      {
        id: 'contrib-1',
        contributionId: 'contrib-1',
        contributorId: 'ctb-1',
        fullName: 'Alice Author',
        firstName: 'Alice',
        lastName: 'Author',
        type: 'AUTHOR',
        isMain: true,
        orderNumber: 1,
        orcidId: '',
        website: '',
        affiliations: [
          {
            id: 'aff-1',
            institutionId: 'inst-1',
            institutionName: 'Uni A',
            orderNumber: 1,
            position: 'Author',
            contributionId: 'contrib-1',
            rorId: '',
          },
        ],
        biographies: [
          { id: 'bio-1', content: 'Bio A', localeCode: 'en', canonical: true, contributionId: 'contrib-1' },
        ],
      },
    ],
    fundings: [],
    languages: [],
    titles: [],
    subjects: [],
  },
  {
    id: 'chapter-2',
    contributions: [
      {
        id: 'contrib-2',
        contributionId: 'contrib-2',
        contributorId: 'ctb-1',
        fullName: 'Alice Author',
        firstName: 'Alice',
        lastName: 'Author',
        type: 'AUTHOR',
        isMain: true,
        orderNumber: 2,
        orcidId: '',
        website: '',
        affiliations: [
          {
            id: 'aff-2',
            institutionId: 'inst-1',
            institutionName: 'Uni A',
            orderNumber: 1,
            position: 'Author',
            contributionId: 'contrib-2',
            rorId: '',
          },
        ],
        biographies: [
          { id: 'bio-2', content: 'Bio A', localeCode: 'en', canonical: true, contributionId: 'contrib-2' },
        ],
      },
    ],
    fundings: [],
    languages: [],
    titles: [],
    subjects: [],
  },
];

const uniqueContributors: WorkContribution[] = [
  {
    id: 'contrib-1',
    contributionId: 'contrib-1',
    contributorId: 'ctb-1',
    fullName: 'Alice Author',
    firstName: 'Alice',
    lastName: 'Author',
    type: 'AUTHOR',
    isMain: true,
    orderNumber: 1,
    orcidId: '',
    website: '',
    affiliations: [
      {
        id: 'aff-1',
        institutionId: 'inst-1',
        institutionName: 'Uni A',
        orderNumber: 1,
        position: 'Author',
        contributionId: 'contrib-1',
        rorId: '',
      },
    ],
    biographies: [{ id: 'bio-1', content: 'Bio A', localeCode: 'en', canonical: true, contributionId: 'contrib-1' }],
  },
];

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => ({
  moveBulkAffiliation: vi.fn().mockResolvedValue(undefined),
  deleteBiography: vi.fn().mockResolvedValue(undefined),
  createBiography: vi.fn().mockResolvedValue({ id: 'bio-new' }),
  updateBiography: vi.fn().mockResolvedValue(undefined),
  moveContribution: vi.fn().mockResolvedValue(undefined),
  updateContributions: vi.fn().mockResolvedValue(undefined),
  deleteContributions: vi.fn().mockResolvedValue(undefined),
  deleteBulkAffiliations: vi.fn().mockResolvedValue(undefined),
  queryClient: { invalidateQueries: vi.fn() },
}));

vi.mock('@/src/entities/affiliation', () => ({
  useMoveBulkAffiliation: () => ({ moveBulkAffiliation: mocks.moveBulkAffiliation }),
}));

vi.mock('@/src/entities/contribution', () => ({
  useDeleteBiography: () => ({ deleteBiography: mocks.deleteBiography }),
  useCreateBiography: () => ({ createBiography: mocks.createBiography }),
  useUpdateBiography: () => ({ updateBiography: mocks.updateBiography }),
  useMoveContribution: () => ({ moveContribution: mocks.moveContribution }),
}));

vi.mock('@/src/entities/contribution/api/hooks/useContributionsBulkUpdate', () => ({
  default: () => ({ updateContributions: mocks.updateContributions }),
}));

vi.mock('@/src/entities/contribution/api/hooks/useContributionsBulkDelete', () => ({
  default: () => ({ deleteContributions: mocks.deleteContributions, loading: false }),
}));

vi.mock('@/src/entities/affiliation/ui/useAffiliationsForm', () => ({
  default: () => ({ deleteBulkAffiliations: mocks.deleteBulkAffiliations }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => mocks.queryClient,
}));

// ---------------------------------------------------------------------------
// Hook 1 – useChaptersAffiliations
// ---------------------------------------------------------------------------
import { useChaptersAffiliations } from '../useChaptersAffiliations';
import { useChaptersAffiliationsOrderUpdate } from '../useChaptersAffiliationsOrderUpdate';
import { useChaptersBiographiesUpdate } from '../useChaptersBiographiesUpdate';
import { useChaptersContributionsReorder } from '../useChaptersContributionsReorder';
import { useChaptersContributionsUpdate } from '../useChaptersContributionsUpdate';
import { useChaptersUniqueContributors } from '../useChaptersUniqueContributors';
import { useDeleteChaptersAffiliations } from '../useDeleteChaptersAffiliations';
import { useDeleteChaptersContributions } from '../useDeleteChaptersContributions';

describe('useChaptersAffiliations', () => {
  it('should collect all affiliations from all contributions across all chapters', () => {
    const { result } = renderHook(() => useChaptersAffiliations(chapters));

    expect(result.current.affiliations).toHaveLength(2);
    expect(result.current.affiliations[0].id).toBe('aff-1');
    expect(result.current.affiliations[1].id).toBe('aff-2');
  });

  it('should return empty array when contributions have no affiliations', () => {
    const chaptersNoAffs: WorkEntity[] = [
      {
        ...chapters[0],
        contributions: chapters[0].contributions.map((c) => ({ ...c, affiliations: [] })),
      },
    ];
    const { result } = renderHook(() => useChaptersAffiliations(chaptersNoAffs));

    expect(result.current.affiliations).toHaveLength(0);
  });

  it('should return empty array for empty chapters', () => {
    const { result } = renderHook(() => useChaptersAffiliations([]));

    expect(result.current.affiliations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Hook 2 – useChaptersAffiliationsOrderUpdate
// ---------------------------------------------------------------------------
describe('useChaptersAffiliationsOrderUpdate', () => {
  beforeEach(() => {
    mocks.moveBulkAffiliation.mockClear();
  });

  it('should call moveBulkAffiliation with first changed affiliation', async () => {
    const { result } = renderHook(() => useChaptersAffiliationsOrderUpdate());

    await act(async () => {
      await result.current.updateChaptersAffiliationsOrder({
        data: [{ affiliationId: 'aff-1', affiliation: { value: 'inst-1', label: 'Uni A' }, position: 'Editor' }],
        chapters,
        uniqueContributors,
      });
    });

    expect(mocks.moveBulkAffiliation).toHaveBeenCalled();
  });

  it('preserves authoritative ROR state and affiliation semantics when reordering', async () => {
    const rorId = 'https://ror.org/012345678';
    const contribution: WorkContribution = {
      ...uniqueContributors[0],
      affiliations: [
        {
          id: 'aff-with-ror',
          institutionId: 'inst-with-ror',
          institutionName: 'University with ROR',
          orderNumber: 1,
          position: 'Author',
          contributionId: 'contrib-1',
          rorId,
        },
        {
          id: 'aff-without-ror',
          institutionId: 'inst-without-ror',
          institutionName: 'University without ROR',
          orderNumber: 2,
          position: 'Editor',
          contributionId: 'contrib-1',
          rorId: '',
        },
      ],
    };
    const chaptersWithAffiliations: WorkEntity[] = [
      {
        ...chapters[0],
        contributions: [
          contribution,
          {
            ...contribution,
            id: 'filler-contribution',
            contributorId: 'filler-contributor',
            affiliations: [],
          },
        ],
      },
    ];
    const { result } = renderHook(() => useChaptersAffiliationsOrderUpdate());

    const updated = await act(async () => {
      return result.current.updateChaptersAffiliationsOrder({
        data: [
          {
            id: 'aff-without-ror',
            affiliationId: 'aff-without-ror',
            affiliation: { value: 'inst-without-ror', label: 'University without ROR' },
            position: 'Editor',
          },
          {
            id: 'aff-with-ror',
            affiliationId: 'aff-with-ror',
            affiliation: { value: 'inst-with-ror', label: 'University with ROR' },
            position: 'Author',
          },
        ],
        chapters: chaptersWithAffiliations,
        uniqueContributors: [contribution],
      });
    });

    expect(mocks.moveBulkAffiliation).toHaveBeenCalledWith([{ affiliationId: 'aff-without-ror', newOrdinal: 1 }]);
    expect(updated[0].affiliations).toEqual([
      {
        id: 'aff-without-ror',
        institutionId: 'inst-without-ror',
        institutionName: 'University without ROR',
        rorId: '',
        contributionId: 'contrib-1',
        orderNumber: 1,
        position: 'Editor',
      },
      {
        id: 'aff-with-ror',
        institutionId: 'inst-with-ror',
        institutionName: 'University with ROR',
        rorId,
        contributionId: 'contrib-1',
        orderNumber: 2,
        position: 'Author',
      },
    ]);
    expect(updated[0].affiliations[1].rorId).not.toBe('inst-with-ror');
  });

  it('uses an empty ROR when the reordered affiliation has no local ID match', async () => {
    const chapterContribution: WorkContribution = {
      ...uniqueContributors[0],
      affiliations: [
        {
          ...uniqueContributors[0].affiliations[0],
          id: 'chapter-affiliation',
          rorId: 'https://ror.org/012345678',
        },
      ],
    };
    const localContribution: WorkContribution = {
      ...chapterContribution,
      affiliations: [
        {
          ...chapterContribution.affiliations[0],
          id: 'different-local-affiliation',
        },
      ],
    };
    const { result } = renderHook(() => useChaptersAffiliationsOrderUpdate());

    const updated = await act(async () => {
      return result.current.updateChaptersAffiliationsOrder({
        data: [
          {
            id: 'chapter-affiliation',
            affiliationId: 'chapter-affiliation',
            affiliation: { value: 'inst-1', label: 'Uni A' },
            position: 'Editor',
          },
        ],
        chapters: [{ ...chapters[0], contributions: [chapterContribution] }],
        uniqueContributors: [localContribution],
      });
    });

    expect(updated[0].affiliations).toEqual([
      {
        id: 'chapter-affiliation',
        institutionId: 'inst-1',
        institutionName: 'Uni A',
        rorId: '',
        contributionId: 'contrib-1',
        orderNumber: 1,
        position: 'Editor',
      },
    ]);
  });

  it('should return empty array when no matching chapter found', async () => {
    const { result } = renderHook(() => useChaptersAffiliationsOrderUpdate());

    const result_data = await act(async () => {
      return result.current.updateChaptersAffiliationsOrder({
        data: [
          { affiliationId: 'non-existent', affiliation: { value: 'inst-99', label: 'Ghost' }, position: 'Author' },
        ],
        chapters,
        uniqueContributors,
      });
    });

    expect(result_data).toEqual([]);
  });

  it('should not call moveBulkAffiliation when order is unchanged', async () => {
    const { result } = renderHook(() => useChaptersAffiliationsOrderUpdate());

    await act(async () => {
      await result.current.updateChaptersAffiliationsOrder({
        data: [{ affiliationId: 'aff-1', affiliation: { value: 'inst-1', label: 'Uni A' }, position: 'Author' }],
        chapters: [chapters[0]],
        uniqueContributors,
      });
    });

    // Order hasn't changed, position and institution are same
    expect(mocks.moveBulkAffiliation).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Hook 3 – useChaptersBiographiesUpdate
// ---------------------------------------------------------------------------
describe('useChaptersBiographiesUpdate', () => {
  beforeEach(() => {
    mocks.deleteBiography.mockClear();
    mocks.createBiography.mockClear();
    mocks.updateBiography.mockClear();
    mocks.queryClient.invalidateQueries.mockClear();
  });

  it('should return empty array when no same contributions found', async () => {
    const { result } = renderHook(() => useChaptersBiographiesUpdate());

    const updated = await act(async () => {
      return result.current.updateChaptersBiographies({
        contributionId: 'non-existent',
        chapters,
        data: { biographies: [] },
        uniqueContributors,
      });
    });

    expect(updated).toEqual([]);
  });

  it('should process biographies for matched contributions', async () => {
    const { result } = renderHook(() => useChaptersBiographiesUpdate());

    await act(async () => {
      await result.current.updateChaptersBiographies({
        contributionId: 'contrib-1',
        chapters,
        data: {
          biographies: [
            { biographyId: 'bio-1', language: { value: 'en', label: 'English' }, contributorBiography: 'Updated Bio' },
          ],
        },
        uniqueContributors,
      });
    });

    expect(mocks.queryClient.invalidateQueries).toHaveBeenCalled();
  });

  it('should filter out empty biography content', async () => {
    const { result } = renderHook(() => useChaptersBiographiesUpdate());

    await act(async () => {
      await result.current.updateChaptersBiographies({
        contributionId: 'contrib-1',
        chapters,
        data: {
          biographies: [
            { biographyId: 'bio-1', language: { value: 'en', label: 'English' }, contributorBiography: '' },
          ],
        },
        uniqueContributors,
      });
    });

    expect(mocks.queryClient.invalidateQueries).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Hook 4 – useChaptersContributionsReorder
// ---------------------------------------------------------------------------
describe('useChaptersContributionsReorder', () => {
  beforeEach(() => {
    mocks.moveContribution.mockClear();
    mocks.queryClient.invalidateQueries.mockClear();
  });

  it('should call moveContribution for the first changed contribution', async () => {
    const reordered: WorkContribution[] = [
      uniqueContributors[0],
      { ...uniqueContributors[0], id: 'contrib-99', contributionId: 'contrib-99' },
    ];

    const { result } = renderHook(() => useChaptersContributionsReorder());

    await act(async () => {
      await result.current.reorderChaptersContributions({
        data: reordered,
        chapters,
        uniqueContributors,
      });
    });

    expect(mocks.moveContribution).toHaveBeenCalled();
  });

  it('should not call moveContribution when order is unchanged', async () => {
    const { result } = renderHook(() => useChaptersContributionsReorder());

    await act(async () => {
      await result.current.reorderChaptersContributions({
        data: uniqueContributors,
        chapters,
        uniqueContributors,
      });
    });

    expect(mocks.moveContribution).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Hook 5 – useChaptersUniqueContributors
// ---------------------------------------------------------------------------
describe('useChaptersUniqueContributors', () => {
  it('should return unique contributors by identity fields', () => {
    const chaptersWithDuplicate: WorkEntity[] = [
      chapters[0],
      {
        ...chapters[1],
        contributions: [
          {
            ...chapters[1].contributions[0],
            fullName: 'Alice Author',
            type: 'AUTHOR',
            isMain: true,
          },
        ],
      },
    ];

    const { result } = renderHook(() => useChaptersUniqueContributors(chaptersWithDuplicate));

    expect(result.current.uniqueContributors).toHaveLength(1);
  });

  it('should keep contributors with different names as unique', () => {
    const chaptersWithDifferent: WorkEntity[] = [
      chapters[0],
      {
        ...chapters[1],
        contributions: [
          {
            ...chapters[1].contributions[0],
            id: 'contrib-3',
            fullName: 'Bob Builder',
            firstName: 'Bob',
            lastName: 'Builder',
          },
        ],
      },
    ];

    const { result } = renderHook(() => useChaptersUniqueContributors(chaptersWithDifferent));

    expect(result.current.uniqueContributors).toHaveLength(2);
  });

  it('should return empty array for empty chapters', () => {
    const { result } = renderHook(() => useChaptersUniqueContributors([]));

    expect(result.current.uniqueContributors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Hook 6 – useChaptersContributionsUpdate
// ---------------------------------------------------------------------------
describe('useChaptersContributionsUpdate', () => {
  beforeEach(() => {
    mocks.updateContributions.mockClear();
  });

  it('should return same uniqueContributors when updatedData is empty', async () => {
    const { result } = renderHook(() => useChaptersContributionsUpdate());

    const updated = await act(async () => {
      return result.current.updateChaptersContributions({
        id: 'contrib-1',
        chapters,
        uniqueContributors,
        updatedData: undefined,
      });
    });

    expect(updated).toBe(uniqueContributors);
    expect(mocks.updateContributions).not.toHaveBeenCalled();
  });

  it('should update contribution data and call bulk update', async () => {
    const { result } = renderHook(() => useChaptersContributionsUpdate());

    const updated = await act(async () => {
      return result.current.updateChaptersContributions({
        id: 'contrib-1',
        chapters,
        uniqueContributors,
        updatedData: { isMain: false },
      });
    });

    expect(mocks.updateContributions).toHaveBeenCalled();
    expect(updated[0].isMain).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Hook 7 – useDeleteChaptersAffiliations
// ---------------------------------------------------------------------------
describe('useDeleteChaptersAffiliations', () => {
  beforeEach(() => {
    mocks.deleteBulkAffiliations.mockClear();
  });

  const affiliations = [
    {
      id: 'aff-1',
      institutionId: 'inst-1',
      institutionName: 'Uni A',
      orderNumber: 1,
      position: 'Author',
      contributionId: 'contrib-1',
      rorId: '',
    },
    {
      id: 'aff-2',
      institutionId: 'inst-1',
      institutionName: 'Uni A',
      orderNumber: 1,
      position: 'Author',
      contributionId: 'contrib-2',
      rorId: '',
    },
  ];

  it('should delete matched affiliations across same contributions', async () => {
    const { result } = renderHook(() => useDeleteChaptersAffiliations({ affiliations }));

    const outcome = await act(async () => {
      return result.current.deleteChaptersAffiliations({
        id: 'aff-1',
        contributionId: 'contrib-1',
        chapters,
        affiliations,
        uniqueContributors,
      });
    });

    expect(mocks.deleteBulkAffiliations).toHaveBeenCalled();
    expect(outcome.deletedIds).toHaveLength(2); // aff-1 and aff-2 matched across chapters
  });

  it('should return empty when no related affiliation found', async () => {
    const { result } = renderHook(() => useDeleteChaptersAffiliations({ affiliations }));

    const outcome = await act(async () => {
      return result.current.deleteChaptersAffiliations({
        id: 'non-existent',
        contributionId: 'contrib-1',
        chapters,
        affiliations,
        uniqueContributors,
      });
    });

    expect(outcome.deletedIds).toHaveLength(0);
    expect(mocks.deleteBulkAffiliations).not.toHaveBeenCalled();
  });

  it('should return empty when no same contributions found', async () => {
    const { result } = renderHook(() => useDeleteChaptersAffiliations({ affiliations }));

    const outcome = await act(async () => {
      return result.current.deleteChaptersAffiliations({
        id: 'aff-1',
        contributionId: 'non-existent',
        chapters,
        affiliations,
        uniqueContributors,
      });
    });

    expect(outcome.deletedIds).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Hook 8 – useDeleteChaptersContributions
// ---------------------------------------------------------------------------
describe('useDeleteChaptersContributions', () => {
  beforeEach(() => {
    mocks.deleteContributions.mockClear();
  });

  it('should delete same contributions across chapters and return filtered list', async () => {
    const { result } = renderHook(() => useDeleteChaptersContributions());

    const updated = await act(async () => {
      return result.current.deleteChaptersContributions({
        id: 'contrib-1',
        chapters,
        uniqueContributors,
      });
    });

    expect(mocks.deleteContributions).toHaveBeenCalledWith(['contrib-1', 'contrib-2']);
    expect(updated).toHaveLength(0);
  });

  it('should return empty array when no same contributions found', async () => {
    const { result } = renderHook(() => useDeleteChaptersContributions());

    const updated = await act(async () => {
      return result.current.deleteChaptersContributions({
        id: 'non-existent',
        chapters,
        uniqueContributors,
      });
    });

    expect(updated).toEqual([]);
    expect(mocks.deleteContributions).not.toHaveBeenCalled();
  });

  it('should return deleteLoading flag', () => {
    const { result } = renderHook(() => useDeleteChaptersContributions());

    expect(result.current.deleteLoading).toBe(false);
  });
});
