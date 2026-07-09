import { describe, it, expect, vi } from 'vitest';

const mockInvalidate = vi.fn();
const mockSendError = vi.fn();
const mockSendSuccess = vi.fn();
const mockServices = {
  contributorService: { getContributor: vi.fn(), getContributors: vi.fn(), createContributor: vi.fn(), updateContributor: vi.fn(), getLinkedPublishers: vi.fn() },
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
    mutate: (...args: unknown[]) => {
      (mutationFn as (...a: unknown[]) => unknown)(...args)
        .then((result: unknown) => { (onSuccess as (...a: unknown[]) => void)?.(result); })
        .catch((e: Error) => { (onError as (...a: unknown[]) => void)?.(e); });
    },
    isPending: false,
  })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: mockInvalidate })),
  useQuery: vi.fn(() => ({ data: [], error: null, isLoading: false, isFetched: true })),
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

import useContributor from '../useContributor';
import useContributors from '../useContributors';
import useCreateContributor from '../useCreateContributor';
import useUpdateContributor from '../useUpdateContributor';
import useLinkedPublishers from '../useLinkedPublishers';

const CONTRIBUTOR_ID = 'cont-1';
const mockData = { name: 'John Doe' } as any;
const mockOnCompleted = vi.fn();
const mockOnError = vi.fn();

function setup() {
  vi.clearAllMocks();
  mockServices.contributorService.getContributor.mockResolvedValue({ id: CONTRIBUTOR_ID });
  mockServices.contributorService.getContributors.mockResolvedValue([]);
  mockServices.contributorService.createContributor.mockResolvedValue({ id: CONTRIBUTOR_ID });
  mockServices.contributorService.updateContributor.mockResolvedValue({ id: CONTRIBUTOR_ID });
  mockServices.contributorService.getLinkedPublishers.mockResolvedValue([]);
}

describe('useContributor', () => {
  it('queries contributor by id', () => {
    setup();
    const { contributor } = useContributor({ contributorId: CONTRIBUTOR_ID });
    expect(contributor).toBeDefined();
  });
});

describe('useContributors', () => {
  it('queries contributors with filter', () => {
    setup();
    const { contributors } = useContributors({ filter: 'John' });
    expect(contributors).toEqual([]);
  });
});

describe('useLinkedPublishers', () => {
  it('queries linked publishers', () => {
    setup();
    const { contributedToPublishers } = useLinkedPublishers({ id: CONTRIBUTOR_ID });
    expect(contributedToPublishers).toEqual([]);
  });
});

describe('useCreateContributor', () => {
  it('creates contributor via service', () => {
    setup();
    const { createContributor } = useCreateContributor({ onCompleted: mockOnCompleted, onError: mockOnError });
    createContributor(mockData);
    expect(mockServices.contributorService.createContributor).toHaveBeenCalledWith(mockData);
  });

  it('sends success notification and calls onCompleted', async () => {
    setup();
    const { createContributor } = useCreateContributor({ onCompleted: mockOnCompleted, onError: mockOnError });
    createContributor(mockData);
    await vi.waitFor(() => {
      expect(mockSendSuccess).toHaveBeenCalled();
      expect(mockOnCompleted).toHaveBeenCalledWith({ id: CONTRIBUTOR_ID });
    });
  });

  it('sends error notification and calls onError on failure', async () => {
    setup();
    mockServices.contributorService.createContributor.mockRejectedValue(new Error('fail'));
    const { createContributor } = useCreateContributor({ onCompleted: mockOnCompleted, onError: mockOnError });
    createContributor(mockData);
    await vi.waitFor(() => {
      expect(mockSendError).toHaveBeenCalled();
      expect(mockOnError).toHaveBeenCalled();
    });
  });
});

describe('useUpdateContributor', () => {
  it('updates contributor via service', () => {
    setup();
    const { updateContributor } = useUpdateContributor({ onCompleted: mockOnCompleted, onError: mockOnError });
    updateContributor(mockData);
    expect(mockServices.contributorService.updateContributor).toHaveBeenCalledWith(mockData);
  });

  it('calls onCompleted on success', async () => {
    setup();
    const { updateContributor } = useUpdateContributor({ onCompleted: mockOnCompleted, onError: mockOnError });
    updateContributor(mockData);
    await vi.waitFor(() => {
      expect(mockOnCompleted).toHaveBeenCalledWith({ id: CONTRIBUTOR_ID });
    });
  });
});
