import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Direction, DistributionJobStatus, DistributionPlatform, PublisherField, ThothPackage } from '@/gql/graphql';

const useUserMock = vi.fn();
const reportHookMock = vi.fn();
const platformOptionsMock = vi.fn();
// Spy proving global active-publisher isolation: the staff index hook must
// never consult the active-publisher state machine for anything.
const stateMachineSpy = vi.fn();

vi.mock('@/src/entities/user', () => ({
  useUser: () => useUserMock(),
}));
vi.mock('@/src/entities/publisher/api/hooks/usePublisherServiceConfigurationReport', () => ({
  default: (props: unknown) => reportHookMock(props),
}));
vi.mock('@/src/entities/publisher/api/hooks/useDistributionPlatformOptions', () => ({
  default: () => platformOptionsMock(),
}));
vi.mock('@/src/entities/publisher/store/hooks/usePublisherStateMachine', () => ({
  default: () => stateMachineSpy(),
}));

import usePublisherAdministration from './usePublisherAdministration';

type ReportHookProps = {
  filters: {
    publishers: string[];
    packages: string[];
    enabledPlatforms: string[];
    jobStatuses: string[];
    withoutBackCatalogueJob: boolean | null;
  };
  limit: number;
  offset: number;
  order: { field: string; direction: string };
  isEligible: boolean;
};

const lastReportProps = (): ReportHookProps => reportHookMock.mock.calls.at(-1)?.[0] as ReportHookProps;

const superuser = {
  user: {
    isSuperuser: true,
    linkedPublishers: [
      { publisherId: 'pub-1', publisherName: 'Publisher One' },
      { publisherId: 'pub-2', publisherName: 'Publisher Two' },
    ],
  },
  isAuthoritative: true,
};

const idleReport = {
  summaries: undefined,
  isLoading: false,
  error: null,
  totalCount: undefined,
  isCountLoading: false,
  countError: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  useUserMock.mockReturnValue(superuser);
  reportHookMock.mockReturnValue(idleReport);
  platformOptionsMock.mockReturnValue({ distributionPlatformOptions: undefined });
});

describe('usePublisherAdministration', () => {
  it('keeps the report ineligible while user identity is not yet authoritative', () => {
    useUserMock.mockReturnValue({
      user: { isSuperuser: true, linkedPublishers: [] },
      isAuthoritative: false,
    });

    const { result } = renderHook(() => usePublisherAdministration());

    expect(lastReportProps().isEligible).toBe(false);
    expect(result.current.viewState).toBe('identityPending');
  });

  it('keeps the report ineligible for an authoritative non-superuser and reports the fail-closed view state', () => {
    useUserMock.mockReturnValue({
      user: { isSuperuser: false, linkedPublishers: [] },
      isAuthoritative: true,
    });

    const { result } = renderHook(() => usePublisherAdministration());

    expect(lastReportProps().isEligible).toBe(false);
    expect(result.current.viewState).toBe('notAuthorized');
  });

  it('marks the report eligible only for an authoritative superuser', () => {
    renderHook(() => usePublisherAdministration());

    expect(lastReportProps().isEligible).toBe(true);
  });

  it('sends an explicit publisher-name-ascending order and explicit server-side pagination by default', () => {
    renderHook(() => usePublisherAdministration());

    expect(lastReportProps().order).toEqual({ field: PublisherField.PublisherName, direction: Direction.Asc });
    expect(lastReportProps().limit).toBe(20);
    expect(lastReportProps().offset).toBe(0);
  });

  it('starts with every filter dimension unfiltered', () => {
    renderHook(() => usePublisherAdministration());

    expect(lastReportProps().filters).toEqual({
      publishers: [],
      packages: [],
      enabledPlatforms: [],
      jobStatuses: [],
      withoutBackCatalogueJob: null,
    });
  });

  it('maps the publisher filter to exactly the selected publisher IDs', () => {
    const { result } = renderHook(() => usePublisherAdministration());

    act(() => result.current.changeSelectedPublisherIds(['pub-2', 'pub-1']));

    expect(lastReportProps().filters.publishers).toEqual(['pub-2', 'pub-1']);
  });

  it('maps the package filter to exactly the selected ThothPackage values', () => {
    const { result } = renderHook(() => usePublisherAdministration());

    act(() => result.current.changeSelectedPackages([ThothPackage.Sphinx, ThothPackage.Oasis]));

    expect(lastReportProps().filters.packages).toEqual([ThothPackage.Sphinx, ThothPackage.Oasis]);
  });

  it('passes multiple platform selections as one conjunctive enabledPlatforms argument', () => {
    const { result } = renderHook(() => usePublisherAdministration());

    act(() => result.current.changeSelectedPlatforms([DistributionPlatform.Oapen, DistributionPlatform.Doab]));

    // One report request with every selected platform: the backend narrows to
    // publishers that have all of them enabled. No client-side splitting or
    // union re-interpretation happens.
    expect(lastReportProps().filters.enabledPlatforms).toEqual([DistributionPlatform.Oapen, DistributionPlatform.Doab]);
  });

  it('passes multiple job-status selections as one disjunctive jobStatuses argument', () => {
    const { result } = renderHook(() => usePublisherAdministration());

    act(() =>
      result.current.changeSelectedJobStatuses([DistributionJobStatus.Failed, DistributionJobStatus.Cancelled]),
    );

    // One report request with every selected status: the backend widens to
    // latest jobs matching any of them. No client-side intersection happens.
    expect(lastReportProps().filters.jobStatuses).toEqual([
      DistributionJobStatus.Failed,
      DistributionJobStatus.Cancelled,
    ]);
  });

  it('maps job presence explicitly onto the nullable withoutBackCatalogueJob argument', () => {
    const { result } = renderHook(() => usePublisherAdministration());

    expect(lastReportProps().filters.withoutBackCatalogueJob).toBeNull();

    act(() => result.current.changeJobPresence('withoutJob'));
    expect(lastReportProps().filters.withoutBackCatalogueJob).toBe(true);

    act(() => result.current.changeJobPresence('withJob'));
    expect(lastReportProps().filters.withoutBackCatalogueJob).toBe(false);

    act(() => result.current.changeJobPresence('all'));
    expect(lastReportProps().filters.withoutBackCatalogueJob).toBeNull();
  });

  it('translates page changes into server-side offsets', () => {
    const { result } = renderHook(() => usePublisherAdministration());

    act(() => result.current.changePage(3));

    expect(lastReportProps().offset).toBe(40);
    expect(lastReportProps().limit).toBe(20);
  });

  it('resets pagination whenever any filter changes, so a page from one filter identity is never reused', () => {
    const { result } = renderHook(() => usePublisherAdministration());

    const changes: ((r: typeof result.current) => void)[] = [
      (r) => r.changeSelectedPublisherIds(['pub-1']),
      (r) => r.changeSelectedPackages([ThothPackage.Sphinx]),
      (r) => r.changeSelectedPlatforms([DistributionPlatform.Oapen]),
      (r) => r.changeSelectedJobStatuses([DistributionJobStatus.Failed]),
      (r) => r.changeJobPresence('withoutJob'),
    ];

    for (const change of changes) {
      act(() => result.current.changePage(3));
      expect(lastReportProps().offset).toBe(40);

      act(() => change(result.current));
      expect(lastReportProps().offset).toBe(0);
      expect(result.current.activePage).toBe(1);
    }
  });

  it('derives the page count from the server-provided total', () => {
    reportHookMock.mockReturnValue({ ...idleReport, summaries: [], totalCount: 57 });

    const { result } = renderHook(() => usePublisherAdministration());

    expect(result.current.totalPagesCount).toBe(3);
  });

  it('offers linked publishers as filter-control options only, without them driving the report rows', () => {
    const { result } = renderHook(() => usePublisherAdministration());

    expect(result.current.publisherFilterOptions).toEqual([
      { id: 'pub-1', name: 'Publisher One' },
      { id: 'pub-2', name: 'Publisher Two' },
    ]);
    // The report request itself stays unfiltered until an explicit selection.
    expect(lastReportProps().filters.publishers).toEqual([]);
  });

  it('maps platform display labels from backend metadata with the platform code as fallback', () => {
    platformOptionsMock.mockReturnValue({
      distributionPlatformOptions: [{ platform: DistributionPlatform.Oapen, displayLabel: 'OAPEN Library' }],
    });

    const { result } = renderHook(() => usePublisherAdministration());

    expect(result.current.getPlatformDisplayLabel(DistributionPlatform.Oapen)).toBe('OAPEN Library');
    expect(result.current.getPlatformDisplayLabel(DistributionPlatform.Doab)).toBe(DistributionPlatform.Doab);
  });

  it('distinguishes loading, error, valid empty and rows view states', () => {
    reportHookMock.mockReturnValue({ ...idleReport, isLoading: true });
    const loading = renderHook(() => usePublisherAdministration());
    expect(loading.result.current.viewState).toBe('reportLoading');

    reportHookMock.mockReturnValue({ ...idleReport, error: new Error('FORBIDDEN') });
    const failed = renderHook(() => usePublisherAdministration());
    expect(failed.result.current.viewState).toBe('reportError');

    reportHookMock.mockReturnValue({ ...idleReport, summaries: [], totalCount: 0 });
    const empty = renderHook(() => usePublisherAdministration());
    expect(empty.result.current.viewState).toBe('emptyReport');

    reportHookMock.mockReturnValue({
      ...idleReport,
      summaries: [
        {
          configuration: {
            publisher: { publisherId: 'pub-1', publisherName: 'Publisher One' },
            subscriptionPackage: 'OASIS',
            enabledDistributionPlatforms: [],
          },
          lastChange: null,
          latestBackCatalogueJob: null,
        },
      ],
      totalCount: 1,
    });
    const rows = renderHook(() => usePublisherAdministration());
    expect(rows.result.current.viewState).toBe('rows');
  });

  it('never consults the global active-publisher state machine', () => {
    const { result } = renderHook(() => usePublisherAdministration());

    act(() => result.current.changeSelectedPublisherIds(['pub-1']));
    act(() => result.current.changePage(2));

    expect(stateMachineSpy).not.toHaveBeenCalled();
  });
});
