import { describe, it, expect, vi } from 'vitest';

const mockInvalidate = vi.fn();
const mockSendError = vi.fn();
const mockSendSuccess = vi.fn();
const mockServices = {
  imprintService: { createImprint: vi.fn(), updateImprint: vi.fn(), deleteImprint: vi.fn(), getPublisherImprints: vi.fn() },
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
  useQuery: vi.fn(() => ({ data: [], isLoading: false })),
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

vi.mock('@/src/entities/user', () => ({
  useUser: vi.fn(() => ({ user: { isSuperuser: false } })),
}));

import useCreateImprint from '../useCreateImprint';
import useUpdateImprint from '../useUpdateImprint';
import useDeleteImprint from '../useDeleteImprint';
import useGetPublisherImprints from '../useGetPublisherImprints';

const PUBLISHER_ID = 'pub-1';
const IMPRINT_ID = 'imp-1';
const mockEntity = { name: 'Academic Press' } as any;

function setup() {
  vi.clearAllMocks();
  mockServices.imprintService.createImprint.mockResolvedValue({ id: IMPRINT_ID });
  mockServices.imprintService.updateImprint.mockResolvedValue(undefined);
  mockServices.imprintService.deleteImprint.mockResolvedValue(undefined);
  mockServices.imprintService.getPublisherImprints.mockResolvedValue([]);
}

describe('useCreateImprint', () => {
  it('creates imprint via service and invalidates publisherImprints and userInfo', async () => {
    setup();
    const { createImprint } = useCreateImprint();
    await createImprint({ publisherId: PUBLISHER_ID, imprintName: 'Academic Press' });
    expect(mockServices.imprintService.createImprint).toHaveBeenCalledWith({ publisherId: PUBLISHER_ID, imprintName: 'Academic Press' });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['publisherImprints', PUBLISHER_ID] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['userInfo'] });
  });

  it('sends error notification on failure', async () => {
    setup();
    mockServices.imprintService.createImprint.mockRejectedValue(new Error('fail'));
    const { createImprint } = useCreateImprint();
    await expect(createImprint({ publisherId: PUBLISHER_ID, imprintName: 'Academic Press' })).rejects.toThrow('fail');
    expect(mockSendError).toHaveBeenCalled();
  });
});

describe('useUpdateImprint', () => {
  it('updates imprint via service with publisherId and isSuperuser', async () => {
    setup();
    const { updateImprint } = useUpdateImprint();
    await updateImprint({ entity: mockEntity, publisherId: PUBLISHER_ID });
    expect(mockServices.imprintService.updateImprint).toHaveBeenCalledWith(mockEntity, PUBLISHER_ID, false);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['publisherImprints', PUBLISHER_ID] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['userInfo'] });
  });
});

describe('useDeleteImprint', () => {
  it('deletes imprint via service and invalidates', async () => {
    setup();
    const { deleteImprint } = useDeleteImprint();
    await deleteImprint({ imprintId: IMPRINT_ID, publisherId: PUBLISHER_ID });
    expect(mockServices.imprintService.deleteImprint).toHaveBeenCalledWith(IMPRINT_ID);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['publisherImprints', PUBLISHER_ID] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['userInfo'] });
  });
});

describe('useGetPublisherImprints', () => {
  it('queries publisher imprints', () => {
    setup();
    const { data } = useGetPublisherImprints(PUBLISHER_ID);
    expect(data).toEqual([]);
  });
});
