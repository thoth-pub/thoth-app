import { describe, it, expect, vi } from 'vitest';
import { useQuery } from '@tanstack/react-query';

const mockInvalidate = vi.fn();
const mockSendError = vi.fn();
const mockSendSuccess = vi.fn();
const mockRouterReplace = vi.fn();
const mockRouterPush = vi.fn();
const mockServices = {
  workService: {
    getWork: vi.fn(), getWorks: vi.fn(), getWorksCount: vi.fn(), getWorkChapters: vi.fn(),
    getWorkEditions: vi.fn(), getWorkPrevEditions: vi.fn(), getTranslatedWorks: vi.fn(),
    getWorkTranslations: vi.fn(), getWorkSet: vi.fn(), createWork: vi.fn(), updateWork: vi.fn(),
    deleteWork: vi.fn(), bulkCreateWorks: vi.fn(), createChapter: vi.fn(),
    createNewWorkEdition: vi.fn(), createWorkTranslation: vi.fn(), moveWorkRelation: vi.fn(),
  },
  fileStorage: { uploadWorkCover: vi.fn() },
};

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn(({ mutationFn, onSuccess, onError }) => {
    const wrapped = async (...args: unknown[]) => {
      try {
        const result = await (mutationFn as (...a: unknown[]) => unknown)(...args);
        (onSuccess as (...a: unknown[]) => void)?.(result);
        return result;
      } catch (e) {
        (onError as (...a: unknown[]) => void)?.(e as Error);
        throw e;
      }
    };
    return {
      mutate: wrapped,
      mutateAsync: wrapped,
      isPending: false,
    };
  }),
  useQueryClient: vi.fn(() => ({ invalidateQueries: mockInvalidate })),
  useQuery: vi.fn(() => ({ data: undefined, error: null, isLoading: false, isFetched: true, isFetching: false })),
}));

vi.mock('@/src/shared/context/servicesContext', () => ({
  useServices: vi.fn(() => mockServices),
  ServicesProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/src/shared/hooks', () => ({
  useNotifications: vi.fn(() => ({
    sendErrorNotification: mockSendError,
    sendSuccessNotification: mockSendSuccess,
    sendProgressNotification: vi.fn(),
    dismissNotification: vi.fn(),
  })),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ replace: mockRouterReplace, push: mockRouterPush })),
}));

vi.mock('@/src/entities/contribution', () => ({
  useCreateContribution: () => ({ createContribution: vi.fn(), loading: false }),
  useUpdateContribution: () => ({ updateContribution: vi.fn(), loading: false }),
  useDeleteContribution: () => ({ deleteContribution: vi.fn(), loading: false }),
}));

import useCreateWork from '../useCreateWork';
import { useUpdateWork } from '../useUpdateWork';
import useDeleteWork from '../useDeleteWork';
import useUpdateWorks from '../useUpdateWorks';
import useBulkCreateWorks from '../useBulkCreateWorks';
import useCreateWorkChapter from '../useCreateWorkChapter';
import useDeleteChapter from '../useDeleteChapter';
import useCreateNewWorkEdition from '../useCreateNewWorkEdition';
import useCreateWorkTranslation from '../useCreateWorkTranslation';
import useUpdateWorkFrontCover from '../useUpdateWorkFrontCover';
import { useWorkMoveRelation } from '../useWorkMoveRelation';
import useGetWork from '../useGetWork';
import useWork from '../useWork';
import useWorks from '../useWorks';
import useWorksCount from '../useWorksCount';
import useWorkChapters from '../useWorkChapters';
import useWorkEditions from '../useWorkEditions';
import useTranslatedWorks from '../useTranslatedWorks';
import useWorkTranslations from '../useWorkTranslations';
import useWorkSet from '../useWorkSet';
import useBulkCreateWorkChapters from '../useBulkCreateWorkChapters';

const WORK_ID = 'work-1';
const mockData = { title: 'My Book' } as any;
const mockFile = new File([''], 'cover.jpg');
const mockOnCompleted = vi.fn();
const mockWorkEntity = { id: WORK_ID, titles: [], languages: [], subjects: [], fundings: [], contributions: [], edition: 1, doi: '', landingPage: '', coverUrl: '', pageCount: 0, imprintId: '', license: '', abstracts: [] } as any;

function setup() {
  vi.clearAllMocks();
  mockServices.workService.getWork.mockResolvedValue({ id: WORK_ID, titles: [], languages: [], subjects: [], fundings: [], contributions: [], edition: 1, doi: '', landingPage: '', coverUrl: '', pageCount: 0 });
  mockServices.workService.getWorks.mockResolvedValue([]);
  mockServices.workService.getWorksCount.mockResolvedValue(0);
  mockServices.workService.getWorkChapters.mockResolvedValue([]);
  mockServices.workService.getWorkEditions.mockResolvedValue([]);
  mockServices.workService.getWorkPrevEditions.mockResolvedValue([]);
  mockServices.workService.getTranslatedWorks.mockResolvedValue([]);
  mockServices.workService.getWorkTranslations.mockResolvedValue([]);
  mockServices.workService.getWorkSet.mockResolvedValue([]);
  mockServices.workService.createWork.mockResolvedValue({ id: WORK_ID });
  mockServices.workService.updateWork.mockResolvedValue(undefined);
  mockServices.workService.deleteWork.mockResolvedValue(undefined);
  mockServices.workService.bulkCreateWorks.mockResolvedValue([]);
  mockServices.workService.createChapter.mockResolvedValue({ id: 'chapter-1' });
  mockServices.workService.createNewWorkEdition.mockResolvedValue({ id: 'new-edition-1' });
  mockServices.workService.createWorkTranslation.mockResolvedValue({ id: 'new-translation-1' });
  mockServices.workService.moveWorkRelation.mockResolvedValue(undefined);
  mockServices.fileStorage.uploadWorkCover.mockResolvedValue('https://example.com/cover.jpg');
}

describe('useCreateWork', () => {
  it('creates work via service using mutate', async () => {
    setup();
    const { createWork } = useCreateWork({ onCompleted: mockOnCompleted });
    await createWork(mockData);
    expect(mockServices.workService.createWork).toHaveBeenCalledWith(mockData);
  });

  it('sends success notification and invalidates on success', async () => {
    setup();
    const { createWork } = useCreateWork({ onCompleted: mockOnCompleted });
    await createWork(mockData);
    expect(mockSendSuccess).toHaveBeenCalled();
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['books'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['works'] });
  });

  it('calls onCompleted on success', async () => {
    setup();
    const { createWork } = useCreateWork({ onCompleted: mockOnCompleted });
    await createWork(mockData);
    expect(mockOnCompleted).toHaveBeenCalledWith({ id: WORK_ID });
  });

  it('sends error notification on failure', async () => {
    setup();
    mockServices.workService.createWork.mockRejectedValue(new Error('fail'));
    const { createWork } = useCreateWork({ onCompleted: mockOnCompleted });
    await expect(createWork(mockData)).rejects.toThrow('fail');
    expect(mockSendError).toHaveBeenCalled();
  });
});

describe('useUpdateWork', () => {
  it('updates work via service', async () => {
    setup();
    const { updateWork } = useUpdateWork({ workId: WORK_ID });
    await updateWork(mockData);
    expect(mockServices.workService.updateWork).toHaveBeenCalledWith(mockData);
  });

  it('invalidates many query keys on success', async () => {
    setup();
    const { updateWork } = useUpdateWork({ workId: WORK_ID });
    await updateWork(mockData);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workChapters'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workTranslations', WORK_ID] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['translatedWorks', WORK_ID] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workEditions', WORK_ID] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workPrevEditions', WORK_ID] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['works'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['books'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['forthcomingBooksCount'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['publishedBooksCount'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['latestUpdatedBooks'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['latestPublishedBooks'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['serieses'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['series'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['sets'] });
  });
});

describe('useDeleteWork', () => {
  it('deletes work via service', async () => {
    setup();
    const { deleteWork } = useDeleteWork({});
    await deleteWork(WORK_ID);
    expect(mockServices.workService.deleteWork).toHaveBeenCalledWith(WORK_ID);
  });

  it('redirects to works on success', async () => {
    setup();
    const { deleteWork } = useDeleteWork({});
    await deleteWork(WORK_ID);
    expect(mockRouterReplace).toHaveBeenCalled();
  });

  it('does not redirect when redirect is false', async () => {
    setup();
    const { deleteWork } = useDeleteWork({ redirect: false });
    await deleteWork(WORK_ID);
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });
});

describe('useGetWork', () => {
  it('queries work by id', () => {
    setup();
    const { work } = useGetWork(WORK_ID);
    expect(work).toBeDefined();
  });
});

describe('useWork', () => {
  it('combines work operations', () => {
    setup();
    const result = useWork(WORK_ID);
    expect(result).toHaveProperty('work');
    expect(result).toHaveProperty('deleteWork');
    expect(result).toHaveProperty('updateWork');
  });
});

describe('useWorks', () => {
  it('queries works with publishersIds', () => {
    setup();
    const { works } = useWorks({ publishersIds: ['pub-1'] });
    expect(works).toEqual([]);
  });

  it('disables the query when publishersIds is empty', () => {
    setup();

    useWorks({ publishersIds: [] });

    expect(vi.mocked(useQuery)).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });
});

describe('useWorksCount', () => {
  it('queries works count', () => {
    setup();
    const { workCount } = useWorksCount({ publishersIds: ['pub-1'] });
    expect(workCount).toBe(0);
  });

  it('disables the query when publishersIds is empty', () => {
    setup();

    useWorksCount({ publishersIds: [] });

    expect(vi.mocked(useQuery)).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });
});

describe('useWorkChapters', () => {
  it('queries work chapters', () => {
    setup();
    const { chapters } = useWorkChapters({ workId: WORK_ID });
    expect(chapters).toEqual([]);
  });
});

describe('useWorkEditions', () => {
  it('queries work editions', () => {
    setup();
    const { loading } = useWorkEditions(WORK_ID, 1);
    expect(loading).toBe(false);
  });
});

describe('useTranslatedWorks', () => {
  it('queries translated works', () => {
    setup();
    const { translatedWorks } = useTranslatedWorks(WORK_ID);
    expect(translatedWorks).toEqual([]);
  });
});

describe('useWorkTranslations', () => {
  it('queries work translations', () => {
    setup();
    const { translations } = useWorkTranslations(WORK_ID);
    expect(translations).toEqual([]);
  });
});

describe('useWorkSet', () => {
  it('queries work set', () => {
    setup();
    const { workSet } = useWorkSet(WORK_ID);
    expect(workSet).toEqual([]);
  });
});

describe('useUpdateWorks', () => {
  it('useUpdateWorks_invalidatesAfterPartialSuccessAndRethrows', async () => {
    setup();
    const error = new Error('Second update failed');
    const firstWork = { ...mockData, id: 'work-1' };
    const secondWork = { ...mockData, id: 'work-2' };
    mockServices.workService.updateWork.mockResolvedValueOnce(undefined).mockRejectedValueOnce(error);
    const { updateWorks } = useUpdateWorks();

    await expect(updateWorks([firstWork, secondWork])).rejects.toBe(error);

    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workChapters'] });
    expect(mockInvalidate).toHaveBeenCalledTimes(2);
  });

  it('useUpdateWorks_invalidatesAfterAllSuccess', async () => {
    setup();
    const firstWork = { ...mockData, id: 'work-1' };
    const secondWork = { ...mockData, id: 'work-2' };
    const { updateWorks } = useUpdateWorks();

    await updateWorks([firstWork, secondWork]);

    expect(mockServices.workService.updateWork).toHaveBeenCalledWith(firstWork);
    expect(mockServices.workService.updateWork).toHaveBeenCalledWith(secondWork);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workChapters'] });
    expect(mockInvalidate).toHaveBeenCalledTimes(2);
  });

  it('useUpdateWorks_rejectsWhenAllFail', async () => {
    setup();
    const firstError = new Error('First update failed');
    const secondError = new Error('Second update failed');
    const firstWork = { ...mockData, id: 'work-1' };
    const secondWork = { ...mockData, id: 'work-2' };
    mockServices.workService.updateWork.mockRejectedValueOnce(firstError).mockRejectedValueOnce(secondError);
    const { updateWorks } = useUpdateWorks();

    await expect(updateWorks([firstWork, secondWork])).rejects.toBe(firstError);

    expect(mockInvalidate).not.toHaveBeenCalled();
  });
});

describe('useBulkCreateWorks', () => {
  it('bulk creates works via service', async () => {
    setup();
    const { bulkCreateWorks } = useBulkCreateWorks();
    await bulkCreateWorks({ works: [mockData], serieses: [], chapters: [] });
    expect(mockServices.workService.bulkCreateWorks).toHaveBeenCalledWith([mockData], [], []);
  });
});

describe('useCreateWorkChapter', () => {
  it('creates chapter and invalidates workChapters', async () => {
    setup();
    const { createChapter } = useCreateWorkChapter({});
    await createChapter({ chapter: mockData, relatedWorkId: WORK_ID, ordinal: 1 });
    expect(mockServices.workService.createChapter).toHaveBeenCalledWith(mockData, WORK_ID, 1);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workChapters'] });
  });
});



describe('useDeleteChapter', () => {
  it('deletes chapter and invalidates workChapters', async () => {
    setup();
    const { deleteChapter } = useDeleteChapter();
    await deleteChapter(WORK_ID);
    expect(mockServices.workService.deleteWork).toHaveBeenCalledWith(WORK_ID);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workChapters'] });
  });

  it('deletes multiple chapters', async () => {
    setup();
    const { deleteChapters } = useDeleteChapter();
    await deleteChapters([WORK_ID]);
    expect(mockServices.workService.deleteWork).toHaveBeenCalledWith(WORK_ID);
  });
});

describe('useCreateNewWorkEdition', () => {
  it('creates new work edition and navigates', async () => {
    setup();
    const { createNewWorkEdition } = useCreateNewWorkEdition();
    await createNewWorkEdition(mockWorkEntity);
    expect(mockServices.workService.createNewWorkEdition).toHaveBeenCalled();
    expect(mockRouterPush).toHaveBeenCalled();
  });
});

describe('useCreateWorkTranslation', () => {
  it('creates work translation and navigates', async () => {
    setup();
    const { createWorkTranslation } = useCreateWorkTranslation();
    await createWorkTranslation(mockWorkEntity);
    expect(mockServices.workService.createWorkTranslation).toHaveBeenCalled();
    expect(mockRouterPush).toHaveBeenCalled();
  });
});

describe('useUpdateWorkFrontCover', () => {
  it('uploads cover via fileStorage and invalidates', async () => {
    setup();
    const { updateWorkFrontCover } = useUpdateWorkFrontCover(WORK_ID);
    await updateWorkFrontCover(mockFile);
    expect(mockServices.fileStorage.uploadWorkCover).toHaveBeenCalledWith(WORK_ID, mockFile);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });
});

describe('useWorkMoveRelation', () => {
  it('moves work relation and invalidates workChapters', async () => {
    setup();
    const { moveWorkRelation } = useWorkMoveRelation();
    await moveWorkRelation({ workRelationId: 'rel-1', newOrdinal: 1 });
    expect(mockServices.workService.moveWorkRelation).toHaveBeenCalledWith('rel-1', 1);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workChapters'] });
  });
});
