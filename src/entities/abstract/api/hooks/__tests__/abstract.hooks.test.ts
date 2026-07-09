import { describe, it, expect, vi } from 'vitest';

const mockInvalidate = vi.fn();
const mockSendError = vi.fn();
const mockSendSuccess = vi.fn();
const mockServices = {
  abstractService: { createAbstract: vi.fn(), updateAbstract: vi.fn(), deleteAbstract: vi.fn() },
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

import useCreateAbstract from '../useCreateAbstract';
import useUpdateAbstract from '../useUpdateAbstract';
import useDeleteAbstract from '../useDeleteAbstract';

const WORK_ID = 'work-1';
const ABSTRACT_ID = 'abs-1';
const mockData = { text: 'Abstract' } as any;

function setup() {
  vi.clearAllMocks();
  mockServices.abstractService.createAbstract.mockResolvedValue({ id: ABSTRACT_ID });
  mockServices.abstractService.updateAbstract.mockResolvedValue(undefined);
  mockServices.abstractService.deleteAbstract.mockResolvedValue(undefined);
}

describe('useCreateAbstract', () => {
  it('creates abstract via service with workId', async () => {
    setup();
    const { createAbstract } = useCreateAbstract(WORK_ID);
    await createAbstract({ data: mockData });
    expect(mockServices.abstractService.createAbstract).toHaveBeenCalledWith(mockData, WORK_ID);
  });

  it('invalidates work query on success', async () => {
    setup();
    const { createAbstract } = useCreateAbstract(WORK_ID);
    await createAbstract({ data: mockData });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });

  it('sends error notification on failure', async () => {
    setup();
    mockServices.abstractService.createAbstract.mockRejectedValue(new Error('fail'));
    const { createAbstract } = useCreateAbstract(WORK_ID);
    await expect(createAbstract({ data: mockData })).rejects.toThrow('fail');
    expect(mockSendError).toHaveBeenCalled();
  });
});

describe('useUpdateAbstract', () => {
  it('updates abstract via service', async () => {
    setup();
    const { updateAbstract } = useUpdateAbstract(WORK_ID);
    await updateAbstract({ data: mockData });
    expect(mockServices.abstractService.updateAbstract).toHaveBeenCalledWith(mockData, WORK_ID);
  });

  it('invalidates work query on success', async () => {
    setup();
    const { updateAbstract } = useUpdateAbstract(WORK_ID);
    await updateAbstract({ data: mockData });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });

  it('sends error notification on failure', async () => {
    setup();
    mockServices.abstractService.updateAbstract.mockRejectedValue(new Error('fail'));
    const { updateAbstract } = useUpdateAbstract(WORK_ID);
    await expect(updateAbstract({ data: mockData })).rejects.toThrow('fail');
    expect(mockSendError).toHaveBeenCalled();
  });
});

describe('useDeleteAbstract', () => {
  it('deletes abstract via service', async () => {
    setup();
    const { deleteAbstract } = useDeleteAbstract(WORK_ID);
    await deleteAbstract(ABSTRACT_ID);
    expect(mockServices.abstractService.deleteAbstract).toHaveBeenCalledWith(ABSTRACT_ID);
  });

  it('invalidates work query on success', async () => {
    setup();
    const { deleteAbstract } = useDeleteAbstract(WORK_ID);
    await deleteAbstract(ABSTRACT_ID);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });

  it('sends error notification on failure', async () => {
    setup();
    mockServices.abstractService.deleteAbstract.mockRejectedValue(new Error('fail'));
    const { deleteAbstract } = useDeleteAbstract(WORK_ID);
    await expect(deleteAbstract(ABSTRACT_ID)).rejects.toThrow('fail');
    expect(mockSendError).toHaveBeenCalled();
  });
});