import { describe, it, expect, vi } from 'vitest';

const mockInvalidate = vi.fn();
const mockSendError = vi.fn();
const mockSendSuccess = vi.fn();
const mockServices = {
  contributionService: {
    createContribution: vi.fn(), updateContribution: vi.fn(), deleteContribution: vi.fn(),
    moveContribution: vi.fn(), createBiography: vi.fn(), updateBiography: vi.fn(),
    deleteBiography: vi.fn(), getContribution: vi.fn(),
  },
};

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn(({ mutationFn, onSuccess, onError }) => ({
    mutateAsync: async (...args: unknown[]) => {
      try {
        const result = await (mutationFn as (...a: unknown[]) => unknown)(...args);
        (onSuccess as (...a: unknown[]) => void)?.();
        return result;
      } catch (e) {
        (onError as (...a: unknown[]) => void)?.(e as Error);
        throw e;
      }
    },
    isPending: false,
  })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: mockInvalidate })),
  useQuery: vi.fn(() => ({ data: { id: 'cont-1' }, error: null, isLoading: false })),
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

import { useCreateContribution } from '../useCreateContribution';
import { useUpdateContribution } from '../useUpdateContribution';
import { useDeleteContribution } from '../useDeleteContribution';
import { useMoveContribution } from '../useMoveContribution';
import { useContribution } from '../useContribution';
import { useCreateBiography } from '../useCreateBiography';
import { useUpdateBiography } from '../useUpdateBiography';
import { useDeleteBiography } from '../useDeleteBiography';
import useContributionsBulkUpdate from '../useContributionsBulkUpdate';
import useContributionsBulkDelete from '../useContributionsBulkDelete';

const WORK_ID = 'work-1';
const CONT_ID = 'cont-1';
const RELATED_WORK_ID = 'related-1';
const mockData = { role: 'Author' } as any;

function setup() {
  vi.clearAllMocks();
  mockServices.contributionService.createContribution.mockResolvedValue({ id: CONT_ID });
  mockServices.contributionService.updateContribution.mockResolvedValue(undefined);
  mockServices.contributionService.deleteContribution.mockResolvedValue(undefined);
  mockServices.contributionService.moveContribution.mockResolvedValue(undefined);
  mockServices.contributionService.createBiography.mockResolvedValue({ id: 'bio-1' });
  mockServices.contributionService.updateBiography.mockResolvedValue(undefined);
  mockServices.contributionService.deleteBiography.mockResolvedValue(undefined);
  mockServices.contributionService.getContribution.mockResolvedValue({ id: CONT_ID });
}

describe('useCreateContribution', () => {
  it('creates contribution via service', async () => {
    setup();
    const { createContribution } = useCreateContribution();
    await createContribution({ data: mockData, relatedWorkId: RELATED_WORK_ID });
    expect(mockServices.contributionService.createContribution).toHaveBeenCalledWith(mockData, RELATED_WORK_ID);
  });

  it('invalidates work and workChapters', async () => {
    setup();
    const { createContribution } = useCreateContribution();
    await createContribution({ data: mockData, relatedWorkId: RELATED_WORK_ID });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workChapters'] });
  });

  it('sends error notification on failure', async () => {
    setup();
    mockServices.contributionService.createContribution.mockRejectedValue(new Error('fail'));
    const { createContribution } = useCreateContribution();
    await expect(createContribution({ data: mockData, relatedWorkId: RELATED_WORK_ID })).rejects.toThrow('fail');
    expect(mockSendError).toHaveBeenCalled();
  });
});

describe('useUpdateContribution', () => {
  it('updates contribution via service', async () => {
    setup();
    const { updateContribution } = useUpdateContribution({ relatedWorkId: RELATED_WORK_ID });
    await updateContribution(mockData);
    expect(mockServices.contributionService.updateContribution).toHaveBeenCalledWith(mockData, RELATED_WORK_ID);
  });

  it('invalidates work, chapter, and list caches', async () => {
    setup();
    const { updateContribution } = useUpdateContribution({ relatedWorkId: RELATED_WORK_ID });
    await updateContribution(mockData);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workChapters'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['works'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['books'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['latestUpdatedBooks'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['latestPublishedBooks'] });
  });
});

describe('useDeleteContribution', () => {
  it('deletes contribution via service', async () => {
    setup();
    const { deleteContribution } = useDeleteContribution();
    await deleteContribution(CONT_ID);
    expect(mockServices.contributionService.deleteContribution).toHaveBeenCalledWith(CONT_ID);
  });

  it('invalidates work and workChapters', async () => {
    setup();
    const { deleteContribution } = useDeleteContribution();
    await deleteContribution(CONT_ID);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workChapters'] });
  });
});

describe('useMoveContribution', () => {
  it('moves contribution via service', async () => {
    setup();
    const { moveContribution } = useMoveContribution({ workId: WORK_ID });
    await moveContribution({ contributionId: CONT_ID, newOrdinal: 1 });
    expect(mockServices.contributionService.moveContribution).toHaveBeenCalledWith(CONT_ID, 1);
  });

  it('invalidates work and workChapters', async () => {
    setup();
    const { moveContribution } = useMoveContribution({ workId: WORK_ID });
    await moveContribution({ contributionId: CONT_ID, newOrdinal: 1 });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workChapters'] });
  });
});

describe('useCreateBiography', () => {
  it('creates biography via service', async () => {
    setup();
    const { createBiography } = useCreateBiography();
    await createBiography({ data: mockData, contributionId: CONT_ID });
    expect(mockServices.contributionService.createBiography).toHaveBeenCalledWith(mockData, CONT_ID);
  });

  it('sends error notification on failure', async () => {
    setup();
    mockServices.contributionService.createBiography.mockRejectedValue(new Error('fail'));
    const { createBiography } = useCreateBiography();
    await expect(createBiography({ data: mockData, contributionId: CONT_ID })).rejects.toThrow('fail');
    expect(mockSendError).toHaveBeenCalled();
  });
});

describe('useUpdateBiography', () => {
  it('updates biography via service', async () => {
    setup();
    const { updateBiography } = useUpdateBiography(WORK_ID);
    await updateBiography({ data: mockData });
    expect(mockServices.contributionService.updateBiography).toHaveBeenCalledWith(mockData);
  });

  it('invalidates work and workChapters', async () => {
    setup();
    const { updateBiography } = useUpdateBiography(WORK_ID);
    await updateBiography({ data: mockData });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workChapters'] });
  });
});

describe('useDeleteBiography', () => {
  it('deletes biography via service', async () => {
    setup();
    const { deleteBiography } = useDeleteBiography();
    await deleteBiography('bio-1');
    expect(mockServices.contributionService.deleteBiography).toHaveBeenCalledWith('bio-1');
  });

  it('sends error notification on failure', async () => {
    setup();
    mockServices.contributionService.deleteBiography.mockRejectedValue(new Error('fail'));
    const { deleteBiography } = useDeleteBiography();
    await expect(deleteBiography('bio-1')).rejects.toThrow('fail');
    expect(mockSendError).toHaveBeenCalled();
  });
});

describe('useContribution', () => {
  it('queries contribution by id', () => {
    setup();
    const { contribution } = useContribution(CONT_ID);
    expect(contribution).toEqual({ id: CONT_ID });
  });
});

describe('useContributionsBulkUpdate', () => {
  it('updates multiple contributions and invalidates work, chapter, and list caches', async () => {
    setup();
    const { updateContributions } = useContributionsBulkUpdate();
    await updateContributions([{ id: RELATED_WORK_ID, contribution: mockData }]);
    expect(mockServices.contributionService.updateContribution).toHaveBeenCalledWith(mockData, RELATED_WORK_ID);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workChapters'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['works'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['books'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['latestUpdatedBooks'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['latestPublishedBooks'] });
  });

  it('invalidates caches and rejects after a partial-success update', async () => {
    setup();
    const error = new Error('second update failed');
    mockServices.contributionService.updateContribution
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(error);
    const { updateContributions } = useContributionsBulkUpdate();

    await expect(
      updateContributions([
        { id: 'work-1', contribution: mockData },
        { id: 'work-2', contribution: mockData },
      ]),
    ).rejects.toBe(error);

    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workChapters'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['works'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['books'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['latestUpdatedBooks'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['latestPublishedBooks'] });
  });

  it('rejects without invalidating when every update fails', async () => {
    setup();
    const error = new Error('all updates failed');
    mockServices.contributionService.updateContribution.mockRejectedValue(error);
    const { updateContributions } = useContributionsBulkUpdate();

    await expect(
      updateContributions([
        { id: 'work-1', contribution: mockData },
        { id: 'work-2', contribution: mockData },
      ]),
    ).rejects.toBe(error);

    expect(mockInvalidate).not.toHaveBeenCalled();
  });
});

describe('useContributionsBulkDelete', () => {
  it('deletes multiple contributions and invalidates', async () => {
    setup();
    const { deleteContributions } = useContributionsBulkDelete();
    await deleteContributions([CONT_ID]);
    expect(mockServices.contributionService.deleteContribution).toHaveBeenCalledWith(CONT_ID);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workChapters'] });
  });
});
