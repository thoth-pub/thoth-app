import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphqlError } from '@/src/shared/api/graphqlService';

// Capture the options passed to useQuery/useMutation so we can assert on query
// identity, the query function and the mutation lifecycle without a full React
// render (mirrors publisher.hooks.test.ts).
const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
const setQueryDataMock = vi.fn();
const refetchQueriesMock = vi.fn();
const invalidateQueriesMock = vi.fn();
const useQueryClientMock = vi.fn(() => ({
  setQueryData: setQueryDataMock,
  refetchQueries: refetchQueriesMock,
  invalidateQueries: invalidateQueriesMock,
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: unknown) => useQueryMock(options),
  useMutation: (options: unknown) => useMutationMock(options),
  useQueryClient: () => useQueryClientMock(),
}));

const mockServices = {
  publisherService: {
    getPublisherServiceConfiguration: vi.fn(),
    getDistributionPlatformOptions: vi.fn(),
    replacePublisherServiceConfiguration: vi.fn(),
  },
};

vi.mock('@/src/shared/context', () => ({
  useServices: vi.fn(() => mockServices),
}));

import useDistributionPlatformOptions from '../useDistributionPlatformOptions';
import usePublisherServiceConfiguration from '../usePublisherServiceConfiguration';
import useReplacePublisherServiceConfiguration, {
  DISTRIBUTION_JOB_CREATION_DISABLED,
  getServiceConfigurationErrorType,
  STALE_SERVICE_CONFIGURATION,
} from '../useReplacePublisherServiceConfiguration';

type UseQueryOptions = {
  queryKey: unknown[];
  queryFn: () => unknown;
  enabled?: boolean;
};

type UseMutationOptions = {
  retry?: boolean | number;
  mutationFn: (input: unknown) => unknown;
  onSuccess: (data: unknown) => unknown;
  onError: (error: unknown) => unknown;
};

const lastOptions = (): UseQueryOptions => useQueryMock.mock.calls.at(-1)?.[0] as UseQueryOptions;

const lastMutationOptions = (): UseMutationOptions => useMutationMock.mock.calls.at(-1)?.[0] as UseMutationOptions;

beforeEach(() => {
  vi.clearAllMocks();
  useQueryMock.mockReturnValue({ data: undefined, isLoading: false, error: null });
  useMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
});

describe('usePublisherServiceConfiguration', () => {
  it('scopes the query key to the active publisher id', () => {
    usePublisherServiceConfiguration('pub-A');

    expect(lastOptions().queryKey).toEqual(['publisherServiceConfiguration', 'pub-A']);
  });

  it('uses a distinct cache key per publisher so config cannot be reused across publishers', () => {
    usePublisherServiceConfiguration('pub-A');
    const keyA = lastOptions().queryKey;

    usePublisherServiceConfiguration('pub-B');
    const keyB = lastOptions().queryKey;

    expect(keyA).toEqual(['publisherServiceConfiguration', 'pub-A']);
    expect(keyB).toEqual(['publisherServiceConfiguration', 'pub-B']);
    expect(keyA).not.toEqual(keyB);
  });

  it('reads the protected configuration for the active publisher via the service', async () => {
    usePublisherServiceConfiguration('pub-A');

    await lastOptions().queryFn();

    expect(mockServices.publisherService.getPublisherServiceConfiguration).toHaveBeenCalledWith('pub-A');
  });

  it('disables the query when there is no active publisher id', () => {
    usePublisherServiceConfiguration('');

    expect(lastOptions().enabled).toBe(false);
  });

  it('exposes package, capabilities and enabled platforms from the API result', () => {
    const serviceConfiguration = {
      subscriptionPackage: 'SPHINX',
      effectiveCapabilities: ['OAI_PMH'],
      enabledDistributionPlatforms: [{ platform: 'OAPEN' }],
    };
    useQueryMock.mockReturnValue({ data: serviceConfiguration, isLoading: false, error: null });

    const result = usePublisherServiceConfiguration('pub-A');

    expect(result.serviceConfiguration).toEqual(serviceConfiguration);
  });
});

describe('useDistributionPlatformOptions', () => {
  it('queries platform options under a single stable, non-publisher-scoped key', () => {
    useDistributionPlatformOptions();

    expect(lastOptions().queryKey).toEqual(['distributionPlatformOptions']);
  });

  it('reads platform display metadata via the service', async () => {
    useDistributionPlatformOptions();

    await lastOptions().queryFn();

    expect(mockServices.publisherService.getDistributionPlatformOptions).toHaveBeenCalled();
  });
});

describe('getServiceConfigurationErrorType', () => {
  it('classifies a stale write from extensions.type', () => {
    const error = new GraphqlError('anything at all', { type: 'STALE_SERVICE_CONFIGURATION' });

    expect(getServiceConfigurationErrorType(error)).toBe(STALE_SERVICE_CONFIGURATION);
  });

  it('classifies disabled job creation from extensions.type', () => {
    const error = new GraphqlError('anything at all', { type: 'DISTRIBUTION_JOB_CREATION_DISABLED' });

    expect(getServiceConfigurationErrorType(error)).toBe(DISTRIBUTION_JOB_CREATION_DISABLED);
  });

  it('never classifies from the error message', () => {
    // The message alone names a classification but no extensions were returned,
    // so it must stay unclassified: messages are never parsed.
    const error = new GraphqlError('STALE_SERVICE_CONFIGURATION');

    expect(getServiceConfigurationErrorType(error)).toBeUndefined();
  });

  it('leaves unrelated extension types and non-GraphQL errors unclassified', () => {
    expect(getServiceConfigurationErrorType(new GraphqlError('nope', { type: 'FORBIDDEN' }))).toBeUndefined();
    expect(getServiceConfigurationErrorType(new Error('Network error'))).toBeUndefined();
    expect(getServiceConfigurationErrorType(undefined)).toBeUndefined();
  });
});

describe('useReplacePublisherServiceConfiguration', () => {
  const serverConfiguration = {
    subscriptionPackage: 'PYRAMID',
    effectiveCapabilities: ['OAI_PMH', 'METRICS_COLLECT'],
    enabledDistributionPlatforms: [{ platform: 'OAPEN' }, { platform: 'DOAB' }],
    updatedAt: '2026-08-01T11:00:00Z',
  };

  const input = {
    publisherId: 'pub-A',
    subscriptionPackage: 'PYRAMID',
    enabledDistributionPlatforms: ['OAPEN'],
    expectedUpdatedAt: '2026-08-01T10:00:00Z',
  };

  it('passes the exact replace input, including expectedUpdatedAt, to the service', async () => {
    useReplacePublisherServiceConfiguration('pub-A');

    await lastMutationOptions().mutationFn(input);

    expect(mockServices.publisherService.replacePublisherServiceConfiguration).toHaveBeenCalledWith(input);
  });

  it('never auto-retries a failed replace', () => {
    useReplacePublisherServiceConfiguration('pub-A');

    expect(lastMutationOptions().retry).toBe(false);
  });

  it('replaces the publisher-scoped configuration cache with the exact server response', () => {
    useReplacePublisherServiceConfiguration('pub-A');

    lastMutationOptions().onSuccess(serverConfiguration);

    expect(setQueryDataMock).toHaveBeenCalledWith(['publisherServiceConfiguration', 'pub-A'], serverConfiguration);
  });

  it('writes no locally derived state to the cache', () => {
    useReplacePublisherServiceConfiguration('pub-A');

    lastMutationOptions().onSuccess(serverConfiguration);

    // The cached value is the mutation response object itself, not a merge of the
    // submitted input with anything the client assumed.
    expect(setQueryDataMock.mock.calls[0][1]).toBe(serverConfiguration);
  });

  it('scopes the cache write to the publisher being edited', () => {
    useReplacePublisherServiceConfiguration('pub-B');

    lastMutationOptions().onSuccess(serverConfiguration);

    expect(setQueryDataMock).toHaveBeenCalledWith(['publisherServiceConfiguration', 'pub-B'], serverConfiguration);
  });

  it('refetches the protected configuration after a stale write', async () => {
    useReplacePublisherServiceConfiguration('pub-A');

    await lastMutationOptions().onError(new GraphqlError('changed', { type: 'STALE_SERVICE_CONFIGURATION' }));

    expect(refetchQueriesMock).toHaveBeenCalledWith({ queryKey: ['publisherServiceConfiguration', 'pub-A'] });
    expect(setQueryDataMock).not.toHaveBeenCalled();
  });

  it('refetches the protected configuration when job creation is disabled', async () => {
    useReplacePublisherServiceConfiguration('pub-A');

    await lastMutationOptions().onError(new GraphqlError('disabled', { type: 'DISTRIBUTION_JOB_CREATION_DISABLED' }));

    expect(refetchQueriesMock).toHaveBeenCalledWith({ queryKey: ['publisherServiceConfiguration', 'pub-A'] });
    expect(setQueryDataMock).not.toHaveBeenCalled();
  });

  it('leaves the server-backed cache untouched on an unclassified failure', async () => {
    useReplacePublisherServiceConfiguration('pub-A');

    await lastMutationOptions().onError(new Error('Network error'));

    expect(setQueryDataMock).not.toHaveBeenCalled();
    expect(refetchQueriesMock).not.toHaveBeenCalled();
  });

  it('does not reconcile on a message that merely names a classification', async () => {
    useReplacePublisherServiceConfiguration('pub-A');

    await lastMutationOptions().onError(new GraphqlError('STALE_SERVICE_CONFIGURATION'));

    expect(refetchQueriesMock).not.toHaveBeenCalled();
  });
});
