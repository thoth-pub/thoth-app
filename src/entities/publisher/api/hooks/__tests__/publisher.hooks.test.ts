import { describe, it, expect, vi } from 'vitest';

const mockInvalidate = vi.fn();
const mockSendError = vi.fn();
const mockSendSuccess = vi.fn();
const mockServices = {
  publisherService: { getPublisher: vi.fn(), createPublisher: vi.fn(), updatePublisher: vi.fn(), createContact: vi.fn(), updateContact: vi.fn(), deleteContact: vi.fn() },
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
  useQuery: vi.fn(() => ({ data: { id: 'pub-1' }, isLoading: false, error: null })),
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

import usePublisher from '../usePublisher';
import useCreatePublisher from '../useCreatePublisher';
import useUpdatePublisher from '../useUpdatePublisher';
import useCreateContact from '../useCreateContact';
import useUpdateContact from '../useUpdateContact';
import useDeleteContact from '../useDeleteContact';

const PUBLISHER_ID = 'pub-1';
const CONTACT_ID = 'con-1';
const mockData = { name: 'Publisher' } as any;

function setup() {
  vi.clearAllMocks();
  mockServices.publisherService.getPublisher.mockResolvedValue({ id: PUBLISHER_ID });
  mockServices.publisherService.createPublisher.mockResolvedValue({ id: PUBLISHER_ID });
  mockServices.publisherService.updatePublisher.mockResolvedValue(undefined);
  mockServices.publisherService.createContact.mockResolvedValue({ id: CONTACT_ID });
  mockServices.publisherService.updateContact.mockResolvedValue(undefined);
  mockServices.publisherService.deleteContact.mockResolvedValue(undefined);
}

describe('usePublisher', () => {
  it('queries publisher by id', () => {
    setup();
    const { publisher } = usePublisher(PUBLISHER_ID);
    expect(publisher).toEqual({ id: PUBLISHER_ID });
  });
});

describe('useCreatePublisher', () => {
  it('creates publisher via service with publisherName', async () => {
    setup();
    const { createPublisher } = useCreatePublisher();
    await createPublisher('New Publisher');
    expect(mockServices.publisherService.createPublisher).toHaveBeenCalledWith('New Publisher');
    expect(mockInvalidate).not.toHaveBeenCalled();
  });

  it('sends error notification on failure', async () => {
    setup();
    mockServices.publisherService.createPublisher.mockRejectedValue(new Error('fail'));
    const { createPublisher } = useCreatePublisher();
    await expect(createPublisher('New Publisher')).rejects.toThrow('fail');
    expect(mockSendError).toHaveBeenCalled();
  });
});

describe('useUpdatePublisher', () => {
  it('updates publisher via service', async () => {
    setup();
    const { updatePublisher } = useUpdatePublisher(PUBLISHER_ID);
    await updatePublisher(mockData);
    expect(mockServices.publisherService.updatePublisher).toHaveBeenCalledWith(mockData, false);
  });

  it('invalidates publisher query on success', async () => {
    setup();
    const { updatePublisher } = useUpdatePublisher(PUBLISHER_ID);
    await updatePublisher(mockData);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['publisher', PUBLISHER_ID] });
  });
});

describe('useCreateContact', () => {
  it('creates contact via service', async () => {
    setup();
    const { createContact } = useCreateContact(PUBLISHER_ID);
    await createContact({ data: mockData, publisherId: PUBLISHER_ID });
    expect(mockServices.publisherService.createContact).toHaveBeenCalledWith(mockData, PUBLISHER_ID);
  });

  it('invalidates publisher query on success', async () => {
    setup();
    const { createContact } = useCreateContact(PUBLISHER_ID);
    await createContact({ data: mockData, publisherId: PUBLISHER_ID });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['publisher', PUBLISHER_ID] });
  });
});

describe('useUpdateContact', () => {
  it('updates contact via service', async () => {
    setup();
    const { updateContact } = useUpdateContact(PUBLISHER_ID);
    await updateContact({ data: mockData, publisherId: PUBLISHER_ID });
    expect(mockServices.publisherService.updateContact).toHaveBeenCalledWith(mockData, PUBLISHER_ID);
  });

  it('invalidates publisher query on success', async () => {
    setup();
    const { updateContact } = useUpdateContact(PUBLISHER_ID);
    await updateContact({ data: mockData, publisherId: PUBLISHER_ID });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['publisher', PUBLISHER_ID] });
  });
});

describe('useDeleteContact', () => {
  it('deletes contact via service', async () => {
    setup();
    const { deleteContact } = useDeleteContact(PUBLISHER_ID);
    await deleteContact(CONTACT_ID);
    expect(mockServices.publisherService.deleteContact).toHaveBeenCalledWith(CONTACT_ID);
  });

  it('invalidates publisher query on success', async () => {
    setup();
    const { deleteContact } = useDeleteContact(PUBLISHER_ID);
    await deleteContact(CONTACT_ID);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['publisher', PUBLISHER_ID] });
  });
});
