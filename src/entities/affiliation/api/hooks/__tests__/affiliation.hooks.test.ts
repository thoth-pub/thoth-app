import { describe, it, expect, vi } from 'vitest';

const mockInvalidate = vi.fn();
const mockSendError = vi.fn();
const mockSendSuccess = vi.fn();
const mockServices = {
  affiliationService: { createAffiliation: vi.fn(), updateAffiliation: vi.fn(), deleteAffiliation: vi.fn(), moveAffiliation: vi.fn() },
};

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn(({ mutationFn, onSuccess, onError }) => ({
    mutateAsync: async (...args: unknown[]) => {
      try {
        const result = await (mutationFn as (...a: unknown[]) => unknown)(...args);
        (onSuccess as (...a: unknown[]) => void)?.(result);
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

import useCreateAffiliation from '../useCreateAffiliation';
import useUpdateAffiliation from '../useUpdateAffiliation';
import useDeleteAffiliation from '../useDeleteAffiliation';
import useMoveAffiliation from '../useMoveAffiliation';
import useMoveBulkAffiliation from '../useMoveBulkAffiliation';

const WORK_ID = 'work-1';
const AFFILIATION_ID = 'aff-1';
const mockData = { name: 'University' } as any;
const mockOnCompleted = vi.fn();

function setup() {
  vi.clearAllMocks();
  mockServices.affiliationService.createAffiliation.mockResolvedValue({ id: AFFILIATION_ID });
  mockServices.affiliationService.updateAffiliation.mockResolvedValue(undefined);
  mockServices.affiliationService.deleteAffiliation.mockResolvedValue(undefined);
  mockServices.affiliationService.moveAffiliation.mockResolvedValue(undefined);
}

describe('useCreateAffiliation', () => {
  it('creates affiliation via service with no invalidation', async () => {
    setup();
    const { createAffiliation } = useCreateAffiliation({});
    await createAffiliation(mockData);
    expect(mockServices.affiliationService.createAffiliation).toHaveBeenCalledWith(mockData);
    expect(mockInvalidate).not.toHaveBeenCalled();
  });

  it('calls onCompleted on success', async () => {
    setup();
    const { createAffiliation } = useCreateAffiliation({ onCompleted: mockOnCompleted });
    await createAffiliation(mockData);
    expect(mockOnCompleted).toHaveBeenCalledWith({ id: AFFILIATION_ID });
  });

  it('sends error notification on failure', async () => {
    setup();
    mockServices.affiliationService.createAffiliation.mockRejectedValue(new Error('fail'));
    const { createAffiliation } = useCreateAffiliation({});
    await expect(createAffiliation(mockData)).rejects.toThrow('fail');
    expect(mockSendError).toHaveBeenCalled();
  });
});

describe('useUpdateAffiliation', () => {
  it('updates affiliation via service with no invalidation', async () => {
    setup();
    const { updateAffiliation } = useUpdateAffiliation();
    await updateAffiliation(mockData);
    expect(mockServices.affiliationService.updateAffiliation).toHaveBeenCalledWith(mockData);
    expect(mockInvalidate).not.toHaveBeenCalled();
  });

  it('sends error notification on failure', async () => {
    setup();
    mockServices.affiliationService.updateAffiliation.mockRejectedValue(new Error('fail'));
    const { updateAffiliation } = useUpdateAffiliation();
    await expect(updateAffiliation(mockData)).rejects.toThrow('fail');
    expect(mockSendError).toHaveBeenCalled();
  });
});

describe('useDeleteAffiliation', () => {
  it('deletes affiliation via service with no invalidation', async () => {
    setup();
    const { deleteAffiliation } = useDeleteAffiliation();
    await deleteAffiliation(AFFILIATION_ID);
    expect(mockServices.affiliationService.deleteAffiliation).toHaveBeenCalledWith(AFFILIATION_ID);
    expect(mockInvalidate).not.toHaveBeenCalled();
  });

  it('sends error notification on failure', async () => {
    setup();
    mockServices.affiliationService.deleteAffiliation.mockRejectedValue(new Error('fail'));
    const { deleteAffiliation } = useDeleteAffiliation();
    await expect(deleteAffiliation(AFFILIATION_ID)).rejects.toThrow('fail');
    expect(mockSendError).toHaveBeenCalled();
  });
});

describe('useMoveAffiliation', () => {
  it('moves affiliation via service', async () => {
    setup();
    const { moveAffiliation } = useMoveAffiliation({ workId: WORK_ID });
    await moveAffiliation({ affiliationId: AFFILIATION_ID, newOrdinal: 1 });
    expect(mockServices.affiliationService.moveAffiliation).toHaveBeenCalledWith({ affiliationId: AFFILIATION_ID, newOrdinal: 1 });
  });

  it('invalidates work and workChapters on success', async () => {
    setup();
    const { moveAffiliation } = useMoveAffiliation({ workId: WORK_ID });
    await moveAffiliation({ affiliationId: AFFILIATION_ID, newOrdinal: 1 });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workChapters'] });
  });

  it('does not invalidate when workId is empty', async () => {
    setup();
    const { moveAffiliation } = useMoveAffiliation({ workId: '' });
    await moveAffiliation({ affiliationId: AFFILIATION_ID, newOrdinal: 1 });
    expect(mockInvalidate).not.toHaveBeenCalled();
  });
});

describe('useMoveBulkAffiliation', () => {
  it('moves multiple affiliations and invalidates', async () => {
    setup();
    const { moveBulkAffiliation } = useMoveBulkAffiliation();
    await moveBulkAffiliation([{ affiliationId: AFFILIATION_ID, newOrdinal: 1 }, { affiliationId: 'aff-2', newOrdinal: 2 }]);
    expect(mockServices.affiliationService.moveAffiliation).toHaveBeenCalledTimes(2);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workChapters'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work'] });
  });

  it('sends error notification on failure', async () => {
    setup();
    mockServices.affiliationService.moveAffiliation.mockRejectedValue(new Error('fail'));
    const { moveBulkAffiliation } = useMoveBulkAffiliation();
    await expect(moveBulkAffiliation([{ affiliationId: AFFILIATION_ID, newOrdinal: 1 }])).rejects.toThrow('fail');
    expect(mockSendError).toHaveBeenCalled();
  });
});
