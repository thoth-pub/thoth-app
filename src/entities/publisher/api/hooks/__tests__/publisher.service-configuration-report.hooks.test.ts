import { beforeEach, describe, expect, it, vi } from 'vitest';

// Capture the options passed to useQuery so query identity, enablement and the
// query function can be asserted without a full React render (mirrors
// publisher.service-configuration.hooks.test.ts).
const useQueryMock = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: unknown) => useQueryMock(options),
}));

const mockServices = {
  publisherService: {
    getPublisherServiceConfigurationReport: vi.fn(),
    getPublisherServiceConfigurationReportCount: vi.fn(),
  },
};

vi.mock('@/src/shared/context', () => ({
  useServices: vi.fn(() => mockServices),
}));

import { Direction, PublisherField } from '@/gql/graphql';

import usePublisherServiceConfigurationReport, {
  PUBLISHER_SERVICE_CONFIGURATION_REPORT_COUNT_QUERY_KEY,
  PUBLISHER_SERVICE_CONFIGURATION_REPORT_QUERY_KEY,
} from '../usePublisherServiceConfigurationReport';

type UseQueryOptions = {
  queryKey: unknown[];
  queryFn: () => unknown;
  enabled?: boolean;
};

const createFilters = (overrides?: Partial<Parameters<typeof usePublisherServiceConfigurationReport>[0]['filters']>) =>
  ({
    publishers: ['pub-1'],
    packages: ['SPHINX'],
    enabledPlatforms: ['OAPEN', 'DOAB'],
    jobStatuses: ['FAILED'],
    withoutBackCatalogueJob: null,
    ...overrides,
  }) as Parameters<typeof usePublisherServiceConfigurationReport>[0]['filters'];

const order = { field: PublisherField.PublisherName, direction: Direction.Asc };

const createProps = (
  overrides?: Partial<Parameters<typeof usePublisherServiceConfigurationReport>[0]>,
): Parameters<typeof usePublisherServiceConfigurationReport>[0] => ({
  filters: createFilters(),
  limit: 20,
  offset: 0,
  order,
  isEligible: true,
  ...overrides,
});

// Call order inside the hook: the list query first, then the count query.
const listOptions = (): UseQueryOptions => useQueryMock.mock.calls.at(-2)?.[0] as UseQueryOptions;
const countOptions = (): UseQueryOptions => useQueryMock.mock.calls.at(-1)?.[0] as UseQueryOptions;

beforeEach(() => {
  vi.clearAllMocks();
  useQueryMock.mockReturnValue({ data: undefined, isLoading: false, error: null });
});

describe('usePublisherServiceConfigurationReport', () => {
  it('builds the list query identity from every semantic filter, both page bounds and the full order', () => {
    const filters = createFilters({ withoutBackCatalogueJob: true });

    usePublisherServiceConfigurationReport(createProps({ filters, limit: 20, offset: 40 }));

    expect(listOptions().queryKey).toEqual([
      PUBLISHER_SERVICE_CONFIGURATION_REPORT_QUERY_KEY,
      filters,
      20,
      40,
      { field: PublisherField.PublisherName, direction: Direction.Asc },
    ]);
  });

  it('builds the count query identity from exactly the semantic filters, without pagination or order', () => {
    const filters = createFilters({ withoutBackCatalogueJob: false });

    usePublisherServiceConfigurationReport(createProps({ filters, limit: 20, offset: 40 }));

    expect(countOptions().queryKey).toEqual([PUBLISHER_SERVICE_CONFIGURATION_REPORT_COUNT_QUERY_KEY, filters]);
  });

  it('gives incompatible filters, pages and orders distinct list query identities', () => {
    usePublisherServiceConfigurationReport(createProps());
    const baseKey = listOptions().queryKey;

    usePublisherServiceConfigurationReport(createProps({ filters: createFilters({ jobStatuses: ['SUCCEEDED'] }) }));
    const filterKey = listOptions().queryKey;

    usePublisherServiceConfigurationReport(createProps({ offset: 20 }));
    const pageKey = listOptions().queryKey;

    usePublisherServiceConfigurationReport(createProps({ order: { ...order, direction: Direction.Desc } }));
    const orderKey = listOptions().queryKey;

    expect(filterKey).not.toEqual(baseKey);
    expect(pageKey).not.toEqual(baseKey);
    expect(orderKey).not.toEqual(baseKey);
  });

  it('gives incompatible filters distinct count query identities, while pagination does not affect the count identity', () => {
    usePublisherServiceConfigurationReport(createProps());
    const baseKey = countOptions().queryKey;

    usePublisherServiceConfigurationReport(createProps({ filters: createFilters({ publishers: ['pub-2'] }) }));
    const filterKey = countOptions().queryKey;

    usePublisherServiceConfigurationReport(createProps({ offset: 60 }));
    const pageKey = countOptions().queryKey;

    expect(filterKey).not.toEqual(baseKey);
    expect(pageKey).toEqual(baseKey);
  });

  it('requests the report page through the service with the same filter model, bounds and explicit order', async () => {
    const props = createProps({ limit: 20, offset: 20 });

    usePublisherServiceConfigurationReport(props);

    await listOptions().queryFn();

    expect(mockServices.publisherService.getPublisherServiceConfigurationReport).toHaveBeenCalledWith({
      filters: props.filters,
      limit: 20,
      offset: 20,
      order,
    });
  });

  it('requests the count through the service with the identical semantic filter model as the list', async () => {
    const props = createProps();

    usePublisherServiceConfigurationReport(props);

    await listOptions().queryFn();
    await countOptions().queryFn();

    const listFilters =
      mockServices.publisherService.getPublisherServiceConfigurationReport.mock.calls.at(-1)?.[0].filters;
    const countFilters = mockServices.publisherService.getPublisherServiceConfigurationReportCount.mock.calls.at(-1)?.[0];

    expect(countFilters).toBe(listFilters);
  });

  it('keeps both protected queries disabled until eligibility is confirmed', () => {
    usePublisherServiceConfigurationReport(createProps({ isEligible: false }));

    expect(listOptions().enabled).toBe(false);
    expect(countOptions().enabled).toBe(false);
  });

  it('enables both protected queries once authoritative superuser eligibility is confirmed', () => {
    usePublisherServiceConfigurationReport(createProps({ isEligible: true }));

    expect(listOptions().enabled).toBe(true);
    expect(countOptions().enabled).toBe(true);
  });

  it('exposes loaded rows and total unchanged, including rows whose latest job is null', () => {
    const summaries = [
      {
        configuration: {
          publisher: { publisherId: 'pub-1', publisherName: 'Publisher A' },
          subscriptionPackage: 'OASIS',
          enabledDistributionPlatforms: [],
        },
        lastChange: null,
        latestBackCatalogueJob: null,
      },
    ];
    useQueryMock.mockReturnValueOnce({ data: summaries, isLoading: false, error: null });
    useQueryMock.mockReturnValueOnce({ data: 1, isLoading: false, error: null });

    const result = usePublisherServiceConfigurationReport(createProps());

    expect(result.summaries).toBe(summaries);
    expect(result.summaries?.[0].latestBackCatalogueJob).toBeNull();
    expect(result.totalCount).toBe(1);
  });

  it('exposes a report failure as an error with no rows, never as a valid empty or no-job result', () => {
    const failure = new Error('FORBIDDEN');
    useQueryMock.mockReturnValueOnce({ data: undefined, isLoading: false, error: failure });
    useQueryMock.mockReturnValueOnce({ data: undefined, isLoading: false, error: failure });

    const result = usePublisherServiceConfigurationReport(createProps());

    expect(result.summaries).toBeUndefined();
    expect(result.error).toBe(failure);
    expect(result.countError).toBe(failure);
  });
});
