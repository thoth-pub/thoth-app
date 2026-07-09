import { describe, it, expect, vi } from 'vitest';

const mockInvalidate = vi.fn();
const mockSendError = vi.fn();
const mockSendSuccess = vi.fn();
const mockServices = {
  fundingService: { createFunding: vi.fn(), updateFunding: vi.fn(), deleteFunding: vi.fn() },
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
  useQuery: vi.fn(),
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

import useCreateFunding from '../useCreateFunding';
import useUpdateFunding from '../useUpdateFunding';
import useDeleteFunding from '../useDeleteFunding';

const WORK_ID = 'work-1';
const FUNDING_ID = 'funding-1';
const mockData = { name: 'Grant' } as any;
const mockServiceResult = { id: FUNDING_ID, name: 'Grant' };

function setup() {
  vi.clearAllMocks();
  mockServices.fundingService.createFunding.mockResolvedValue(mockServiceResult);
  mockServices.fundingService.updateFunding.mockResolvedValue(undefined);
  mockServices.fundingService.deleteFunding.mockResolvedValue(undefined);
}

describe('useCreateFunding', () => {
  it('creates funding via service mutation', async () => {
    setup();
    const { createFunding } = useCreateFunding({ workId: WORK_ID });
    const result = await createFunding(mockData);
    expect(mockServices.fundingService.createFunding).toHaveBeenCalledWith({ data: mockData, relatedWorkId: WORK_ID });
    expect(result).toEqual(mockServiceResult);
  });

  it('invalidates work and workChapters on success', async () => {
    setup();
    const { createFunding } = useCreateFunding({ workId: WORK_ID });
    await createFunding(mockData);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workChapters'] });
  });

  it('sends error notification on failure', async () => {
    setup();
    mockServices.fundingService.createFunding.mockRejectedValue(new Error('fail'));
    const { createFunding } = useCreateFunding({ workId: WORK_ID });
    await expect(createFunding(mockData)).rejects.toThrow('fail');
    expect(mockSendError).toHaveBeenCalled();
  });

  it('creates funding for multiple works', async () => {
    setup();
    const { createFundingForMultipleWorks } = useCreateFunding({ workId: WORK_ID });
    await createFundingForMultipleWorks({ relatedWorkIds: ['w1', 'w2'], funding: mockData });
    expect(mockServices.fundingService.createFunding).toHaveBeenCalledTimes(2);
  });

  it('exposes loading state', () => {
    setup();
    const { loading } = useCreateFunding({ workId: WORK_ID });
    expect(loading).toBe(false);
  });
});

describe('useUpdateFunding', () => {
  it('updates funding via service mutation', async () => {
    setup();
    const { updateFunding } = useUpdateFunding({ workId: WORK_ID });
    await updateFunding(mockData);
    expect(mockServices.fundingService.updateFunding).toHaveBeenCalledWith({ data: mockData, relatedWorkId: WORK_ID });
  });

  it('invalidates query cache on success', async () => {
    setup();
    const { updateFunding } = useUpdateFunding({ workId: WORK_ID });
    await updateFunding(mockData);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workChapters'] });
  });

  it('sends error notification on failure', async () => {
    setup();
    mockServices.fundingService.updateFunding.mockRejectedValue(new Error('fail'));
    const { updateFunding } = useUpdateFunding({ workId: WORK_ID });
    await expect(updateFunding(mockData)).rejects.toThrow('fail');
    expect(mockSendError).toHaveBeenCalled();
  });

  it('updates fundings for multiple works', async () => {
    setup();
    const { updateFundings } = useUpdateFunding({ workId: WORK_ID });
    await updateFundings(mockData, ['w1', 'w2']);
    expect(mockServices.fundingService.updateFunding).toHaveBeenCalledTimes(2);
  });
});

describe('useDeleteFunding', () => {
  it('deletes funding and invalidates cache', async () => {
    setup();
    const { deleteFunding } = useDeleteFunding();
    await deleteFunding(FUNDING_ID);
    expect(mockServices.fundingService.deleteFunding).toHaveBeenCalledWith({ fundingId: FUNDING_ID });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workChapters'] });
  });

  it('deletes multiple fundings', async () => {
    setup();
    const { deleteFundings } = useDeleteFunding();
    await deleteFundings(['f1', 'f2']);
    expect(mockServices.fundingService.deleteFunding).toHaveBeenCalledTimes(2);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work'] });
  });

  it('sends error notification on failure', async () => {
    setup();
    mockServices.fundingService.deleteFunding.mockRejectedValue(new Error('fail'));
    const { deleteFunding } = useDeleteFunding();
    await expect(deleteFunding(FUNDING_ID)).rejects.toThrow('fail');
    expect(mockSendError).toHaveBeenCalled();
  });
});