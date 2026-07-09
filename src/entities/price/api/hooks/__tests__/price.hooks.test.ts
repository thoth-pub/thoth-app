import { describe, it, expect, vi } from 'vitest';

const mockInvalidate = vi.fn();
const mockSendError = vi.fn();
const mockSendSuccess = vi.fn();
const mockServices = {
  priceService: { createPrice: vi.fn(), updatePrice: vi.fn(), deletePrice: vi.fn() },
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

import useCreatePrice from '../useCreatePrice';
import useUpdatePrice from '../useUpdatePrice';
import useDeletePrice from '../useDeletePrice';

const WORK_ID = 'work-1';
const PRICE_ID = 'price-1';
const PUBLICATION_ID = 'pub-1';
const mockData = { amount: 10, publicationId: PUBLICATION_ID } as any;

function setup() {
  vi.clearAllMocks();
  mockServices.priceService.createPrice.mockResolvedValue({ id: PRICE_ID });
  mockServices.priceService.updatePrice.mockResolvedValue(undefined);
  mockServices.priceService.deletePrice.mockResolvedValue(undefined);
}

describe('useCreatePrice', () => {
  it('creates price via service with publicationId', async () => {
    setup();
    const { createPrice } = useCreatePrice({ workId: WORK_ID });
    await createPrice(mockData);
    expect(mockServices.priceService.createPrice).toHaveBeenCalledWith(mockData, mockData.publicationId);
  });

  it('invalidates work query on success', async () => {
    setup();
    const { createPrice } = useCreatePrice({ workId: WORK_ID });
    await createPrice(mockData);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });

  it('sends error notification on failure', async () => {
    setup();
    mockServices.priceService.createPrice.mockRejectedValue(new Error('fail'));
    const { createPrice } = useCreatePrice({ workId: WORK_ID });
    await expect(createPrice(mockData)).rejects.toThrow('fail');
    expect(mockSendError).toHaveBeenCalled();
  });
});

describe('useUpdatePrice', () => {
  it('updates price via service with publicationId', async () => {
    setup();
    const { updatePrice } = useUpdatePrice({ workId: WORK_ID });
    await updatePrice(mockData);
    expect(mockServices.priceService.updatePrice).toHaveBeenCalledWith(mockData, mockData.publicationId);
  });

  it('invalidates work query on success', async () => {
    setup();
    const { updatePrice } = useUpdatePrice({ workId: WORK_ID });
    await updatePrice(mockData);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });

  it('sends error notification on failure', async () => {
    setup();
    mockServices.priceService.updatePrice.mockRejectedValue(new Error('fail'));
    const { updatePrice } = useUpdatePrice({ workId: WORK_ID });
    await expect(updatePrice(mockData)).rejects.toThrow('fail');
    expect(mockSendError).toHaveBeenCalled();
  });
});

describe('useDeletePrice', () => {
  it('deletes price via service', async () => {
    setup();
    const { deletePrice } = useDeletePrice({ workId: WORK_ID });
    await deletePrice(PRICE_ID);
    expect(mockServices.priceService.deletePrice).toHaveBeenCalledWith(PRICE_ID);
  });

  it('invalidates work query on success', async () => {
    setup();
    const { deletePrice } = useDeletePrice({ workId: WORK_ID });
    await deletePrice(PRICE_ID);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });
});
