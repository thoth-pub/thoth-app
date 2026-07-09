import { describe, it, expect, vi } from 'vitest';

const mockInvalidate = vi.fn();
const mockSendError = vi.fn();
const mockSendSuccess = vi.fn();
const mockServices = {
  awardService: { createAward: vi.fn(), updateAward: vi.fn(), deleteAward: vi.fn(), moveAward: vi.fn() },
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

import useCreateAward from '../useCreateAward';
import useUpdateAward from '../useUpdateAward';
import useDeleteAward from '../useDeleteAward';
import useMoveAward from '../useMoveAward';

const WORK_ID = 'work-1';
const AWARD_ID = 'award-1';
const mockData = { name: 'Nobel' } as any;

function setup() {
  vi.clearAllMocks();
  mockServices.awardService.createAward.mockResolvedValue({ id: AWARD_ID });
  mockServices.awardService.updateAward.mockResolvedValue(undefined);
  mockServices.awardService.deleteAward.mockResolvedValue(undefined);
  mockServices.awardService.moveAward.mockResolvedValue(undefined);
}

describe('useCreateAward', () => {
  it('creates award via service with workId', async () => {
    setup();
    const { createAward } = useCreateAward({ workId: WORK_ID });
    await createAward(mockData);
    expect(mockServices.awardService.createAward).toHaveBeenCalledWith(mockData, WORK_ID);
  });

  it('invalidates work query on success', async () => {
    setup();
    const { createAward } = useCreateAward({ workId: WORK_ID });
    await createAward(mockData);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });

  it('sends error notification on failure', async () => {
    setup();
    mockServices.awardService.createAward.mockRejectedValue(new Error('fail'));
    const { createAward } = useCreateAward({ workId: WORK_ID });
    await expect(createAward(mockData)).rejects.toThrow('fail');
    expect(mockSendError).toHaveBeenCalled();
  });
});

describe('useUpdateAward', () => {
  it('updates award via service', async () => {
    setup();
    const { updateAward } = useUpdateAward({ workId: WORK_ID });
    await updateAward(mockData);
    expect(mockServices.awardService.updateAward).toHaveBeenCalledWith(mockData, WORK_ID);
  });

  it('invalidates work query on success', async () => {
    setup();
    const { updateAward } = useUpdateAward({ workId: WORK_ID });
    await updateAward(mockData);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });
});

describe('useDeleteAward', () => {
  it('deletes award via service', async () => {
    setup();
    const { deleteAward } = useDeleteAward({ workId: WORK_ID });
    await deleteAward(AWARD_ID);
    expect(mockServices.awardService.deleteAward).toHaveBeenCalledWith(AWARD_ID);
  });

  it('invalidates work query on success', async () => {
    setup();
    const { deleteAward } = useDeleteAward({ workId: WORK_ID });
    await deleteAward(AWARD_ID);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });
});

describe('useMoveAward', () => {
  it('moves award via service', async () => {
    setup();
    const { moveAward } = useMoveAward({ workId: WORK_ID });
    await moveAward({ awardId: AWARD_ID, newOrdinal: 1 } as any);
    expect(mockServices.awardService.moveAward).toHaveBeenCalledWith(AWARD_ID, 1);
  });

  it('invalidates work query', async () => {
    setup();
    const { moveAward } = useMoveAward({ workId: WORK_ID });
    await moveAward({ awardId: AWARD_ID, newOrdinal: 1 } as any);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });
});