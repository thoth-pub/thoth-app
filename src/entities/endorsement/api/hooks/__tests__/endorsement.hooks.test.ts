import { describe, it, expect, vi } from 'vitest';

const mockInvalidate = vi.fn();
const mockSendError = vi.fn();
const mockSendSuccess = vi.fn();
const mockServices = {
  endorsementService: { createEndorsement: vi.fn(), updateEndorsement: vi.fn(), deleteEndorsement: vi.fn(), moveEndorsement: vi.fn() },
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

import useCreateEndorsement from '../useCreateEndorsement';
import useUpdateEndorsement from '../useUpdateEndorsement';
import useDeleteEndorsement from '../useDeleteEndorsement';
import useMoveEndorsement from '../useMoveEndorsement';

const WORK_ID = 'work-1';
const ENDORSEMENT_ID = 'end-1';
const mockData = { text: 'Great book' } as any;

function setup() {
  vi.clearAllMocks();
  mockServices.endorsementService.createEndorsement.mockResolvedValue({ id: ENDORSEMENT_ID });
  mockServices.endorsementService.updateEndorsement.mockResolvedValue(undefined);
  mockServices.endorsementService.deleteEndorsement.mockResolvedValue(undefined);
  mockServices.endorsementService.moveEndorsement.mockResolvedValue(undefined);
}

describe('useCreateEndorsement', () => {
  it('creates endorsement via service with workId', async () => {
    setup();
    const { createEndorsement } = useCreateEndorsement({ workId: WORK_ID });
    await createEndorsement(mockData);
    expect(mockServices.endorsementService.createEndorsement).toHaveBeenCalledWith(mockData, WORK_ID);
  });

  it('invalidates work query on success', async () => {
    setup();
    const { createEndorsement } = useCreateEndorsement({ workId: WORK_ID });
    await createEndorsement(mockData);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });

  it('sends error notification on failure', async () => {
    setup();
    mockServices.endorsementService.createEndorsement.mockRejectedValue(new Error('fail'));
    const { createEndorsement } = useCreateEndorsement({ workId: WORK_ID });
    await expect(createEndorsement(mockData)).rejects.toThrow('fail');
    expect(mockSendError).toHaveBeenCalled();
  });
});

describe('useUpdateEndorsement', () => {
  it('updates endorsement via service', async () => {
    setup();
    const { updateEndorsement } = useUpdateEndorsement({ workId: WORK_ID });
    await updateEndorsement(mockData);
    expect(mockServices.endorsementService.updateEndorsement).toHaveBeenCalledWith(mockData, WORK_ID);
  });

  it('invalidates work query on success', async () => {
    setup();
    const { updateEndorsement } = useUpdateEndorsement({ workId: WORK_ID });
    await updateEndorsement(mockData);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });

  it('sends error notification on failure', async () => {
    setup();
    mockServices.endorsementService.updateEndorsement.mockRejectedValue(new Error('fail'));
    const { updateEndorsement } = useUpdateEndorsement({ workId: WORK_ID });
    await expect(updateEndorsement(mockData)).rejects.toThrow('fail');
    expect(mockSendError).toHaveBeenCalled();
  });
});

describe('useDeleteEndorsement', () => {
  it('deletes endorsement via service', async () => {
    setup();
    const { deleteEndorsement } = useDeleteEndorsement({ workId: WORK_ID });
    await deleteEndorsement(ENDORSEMENT_ID);
    expect(mockServices.endorsementService.deleteEndorsement).toHaveBeenCalledWith(ENDORSEMENT_ID);
  });

  it('invalidates work query on success', async () => {
    setup();
    const { deleteEndorsement } = useDeleteEndorsement({ workId: WORK_ID });
    await deleteEndorsement(ENDORSEMENT_ID);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });
});

describe('useMoveEndorsement', () => {
  it('moves endorsement via service', async () => {
    setup();
    const { moveEndorsement } = useMoveEndorsement({ workId: WORK_ID });
    await moveEndorsement({ endorsementId: ENDORSEMENT_ID, newOrdinal: 1 });
    expect(mockServices.endorsementService.moveEndorsement).toHaveBeenCalledWith(ENDORSEMENT_ID, 1);
  });

  it('invalidates work query on success', async () => {
    setup();
    const { moveEndorsement } = useMoveEndorsement({ workId: WORK_ID });
    await moveEndorsement({ endorsementId: ENDORSEMENT_ID, newOrdinal: 1 });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });
});
