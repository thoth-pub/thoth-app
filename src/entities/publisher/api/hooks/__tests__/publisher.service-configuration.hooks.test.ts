import { beforeEach, describe, expect, it, vi } from 'vitest';

// Capture the options passed to useQuery so we can assert on query identity and
// the query function without a full React render (mirrors publisher.hooks.test.ts).
const useQueryMock = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: unknown) => useQueryMock(options),
}));

const mockServices = {
  publisherService: {
    getPublisherServiceConfiguration: vi.fn(),
    getDistributionPlatformOptions: vi.fn(),
  },
};

vi.mock('@/src/shared/context', () => ({
  useServices: vi.fn(() => mockServices),
}));

import useDistributionPlatformOptions from '../useDistributionPlatformOptions';
import usePublisherServiceConfiguration from '../usePublisherServiceConfiguration';

type UseQueryOptions = {
  queryKey: unknown[];
  queryFn: () => unknown;
  enabled?: boolean;
};

const lastOptions = (): UseQueryOptions => useQueryMock.mock.calls.at(-1)?.[0] as UseQueryOptions;

beforeEach(() => {
  vi.clearAllMocks();
  useQueryMock.mockReturnValue({ data: undefined, isLoading: false, error: null });
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
