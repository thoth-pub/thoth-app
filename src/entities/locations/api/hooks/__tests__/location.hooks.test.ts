import { describe, it, expect, vi } from 'vitest';

const mockInvalidate = vi.fn();
const mockSendError = vi.fn();
const mockSendSuccess = vi.fn();
const mockServices = {
  locationService: { createLocation: vi.fn(), updateLocation: vi.fn(), deleteLocation: vi.fn() },
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

import useCreateLocation from '../useCreateLocation';
import useUpdateLocation from '../useUpdateLocation';
import useDeleteLocation from '../useDeleteLocation';

const WORK_ID = 'work-1';
const LOCATION_ID = 'loc-1';
const PUBLICATION_ID = 'pub-1';
const mockData = { address: '123 Main', publicationId: PUBLICATION_ID } as any;

function setup() {
  vi.clearAllMocks();
  mockServices.locationService.createLocation.mockResolvedValue({ id: LOCATION_ID });
  mockServices.locationService.updateLocation.mockResolvedValue(undefined);
  mockServices.locationService.deleteLocation.mockResolvedValue(undefined);
}

describe('useCreateLocation', () => {
  it('creates location via service with publicationId', async () => {
    setup();
    const { createLocation } = useCreateLocation({ workId: WORK_ID });
    await createLocation(mockData);
    expect(mockServices.locationService.createLocation).toHaveBeenCalledWith(mockData, mockData.publicationId);
  });

  it('invalidates work query on success', async () => {
    setup();
    const { createLocation } = useCreateLocation({ workId: WORK_ID });
    await createLocation(mockData);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });

  it('sends error notification on failure', async () => {
    setup();
    mockServices.locationService.createLocation.mockRejectedValue(new Error('fail'));
    const { createLocation } = useCreateLocation({ workId: WORK_ID });
    await expect(createLocation(mockData)).rejects.toThrow('fail');
    expect(mockSendError).toHaveBeenCalled();
  });
});

describe('useUpdateLocation', () => {
  it('updates location via service with publicationId', async () => {
    setup();
    const { updateLocation } = useUpdateLocation({ workId: WORK_ID });
    await updateLocation(mockData);
    expect(mockServices.locationService.updateLocation).toHaveBeenCalledWith(mockData, mockData.publicationId);
  });

  it('invalidates work query on success', async () => {
    setup();
    const { updateLocation } = useUpdateLocation({ workId: WORK_ID });
    await updateLocation(mockData);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });

  it('sends error notification on failure', async () => {
    setup();
    mockServices.locationService.updateLocation.mockRejectedValue(new Error('fail'));
    const { updateLocation } = useUpdateLocation({ workId: WORK_ID });
    await expect(updateLocation(mockData)).rejects.toThrow('fail');
    expect(mockSendError).toHaveBeenCalled();
  });
});

describe('useDeleteLocation', () => {
  it('deletes location via service', async () => {
    setup();
    const { deleteLocation } = useDeleteLocation({ workId: WORK_ID });
    await deleteLocation(LOCATION_ID);
    expect(mockServices.locationService.deleteLocation).toHaveBeenCalledWith(LOCATION_ID);
  });

  it('invalidates work query on success', async () => {
    setup();
    const { deleteLocation } = useDeleteLocation({ workId: WORK_ID });
    await deleteLocation(LOCATION_ID);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work', WORK_ID] });
  });
});
