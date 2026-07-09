import { describe, it, expect, vi } from 'vitest';

const mockInvalidate = vi.fn();
const mockSendError = vi.fn();
const mockSendSuccess = vi.fn();
const mockServices = {
  referenceService: { createReference: vi.fn(), updateReference: vi.fn(), deleteReference: vi.fn(), moveReference: vi.fn() },
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

import useCreateReference from '../useCreateReference';
import useUpdateReference from '../useUpdateReference';
import useDeleteReference from '../useDeleteReference';
import useMoveReferences from '../useMoveReferences';

const WORK_ID = 'work-1';
const REF_ID = 'ref-1';
const mockData = { text: 'Reference text' } as any;

function setup() {
  vi.clearAllMocks();
  mockServices.referenceService.createReference.mockResolvedValue({ id: REF_ID });
  mockServices.referenceService.updateReference.mockResolvedValue(undefined);
  mockServices.referenceService.deleteReference.mockResolvedValue(undefined);
  mockServices.referenceService.moveReference.mockResolvedValue(undefined);
}

describe('useCreateReference', () => {
  it('creates reference via service with workId', async () => {
    setup();
    const { createReference } = useCreateReference({ workId: WORK_ID });
    await createReference(mockData);
    expect(mockServices.referenceService.createReference).toHaveBeenCalledWith(mockData, WORK_ID);
  });

  it('invalidates work query on success', async () => {
    setup();
    const { createReference } = useCreateReference({ workId: WORK_ID });
    await createReference(mockData);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });

  it('sends error notification on failure', async () => {
    setup();
    mockServices.referenceService.createReference.mockRejectedValue(new Error('fail'));
    const { createReference } = useCreateReference({ workId: WORK_ID });
    await expect(createReference(mockData)).rejects.toThrow('fail');
    expect(mockSendError).toHaveBeenCalled();
  });
});

describe('useUpdateReference', () => {
  it('updates reference via service', async () => {
    setup();
    const { updateReference } = useUpdateReference({ workId: WORK_ID });
    await updateReference(mockData);
    expect(mockServices.referenceService.updateReference).toHaveBeenCalledWith(mockData, WORK_ID);
  });

  it('invalidates work query on success', async () => {
    setup();
    const { updateReference } = useUpdateReference({ workId: WORK_ID });
    await updateReference(mockData);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });
});

describe('useDeleteReference', () => {
  it('deletes reference via service and invalidates work query', async () => {
    setup();
    const { deleteReference } = useDeleteReference({ workId: WORK_ID });
    await deleteReference(REF_ID);
    expect(mockServices.referenceService.deleteReference).toHaveBeenCalledWith(REF_ID);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });

  it('sends error notification on failure', async () => {
    setup();
    mockServices.referenceService.deleteReference.mockRejectedValue(new Error('fail'));
    const { deleteReference } = useDeleteReference({ workId: WORK_ID });
    await expect(deleteReference(REF_ID)).rejects.toThrow('fail');
    expect(mockSendError).toHaveBeenCalled();
  });
});

describe('useMoveReferences', () => {
  it('moves reference via service', async () => {
    setup();
    const { moveReferences } = useMoveReferences({ workId: WORK_ID });
    await moveReferences({ referenceId: REF_ID, newOrdinal: 1 });
    expect(mockServices.referenceService.moveReference).toHaveBeenCalledWith(REF_ID, 1);
  });

  it('invalidates work query on success', async () => {
    setup();
    const { moveReferences } = useMoveReferences({ workId: WORK_ID });
    await moveReferences({ referenceId: REF_ID, newOrdinal: 1 });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });
});
