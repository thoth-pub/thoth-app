import { act, renderHook } from '@testing-library/react';
import { print } from 'graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Direction, DistributionJobStatus, DistributionPlatform, PublisherField, ThothPackage } from '@/gql/graphql';
import { GET_PUBLISHER_SERVICE_CONFIGURATION_REPORT } from '@/src/entities/publisher/model/publisher.schema';

const useUserMock = vi.fn();
const reportHookMock = vi.fn();
const platformOptionsMock = vi.fn();
const editorHookMock = vi.fn();
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
vi.mock('./usePublisherAdministrationEditor', () => ({
  default: (props: unknown) => editorHookMock(props),
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

type EditorHookProps = { isEligible: boolean; distributionPlatformOptions: unknown };

const lastEditorProps = (): EditorHookProps => editorHookMock.mock.calls.at(-1)?.[0] as EditorHookProps;

const idleEditor = {
  session: null,
  isEditing: false,
  isSaving: false,
  canStartEdit: true,
  canCancel: false,
  outcome: null,
  platformRows: [],
  startEdit: vi.fn(),
  cancelEdit: vi.fn(),
  changePackage: vi.fn(),
  togglePlatform: vi.fn(),
  save: vi.fn(),
};

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
  editorHookMock.mockReturnValue(idleEditor);
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

  // A staff edit (APP-02B) can change a publisher's filter membership, so the
  // authoritative filtered population - and with it the valid page range - can
  // shrink underneath the page staff are on when the report and count refetch.
  describe('page normalization against the authoritative count (APP-02B)', () => {
    const PAGE_SIZE = 20;

    const createRow = (index: number) => ({
      configuration: {
        publisher: { publisherId: `pub-${index}`, publisherName: `Publisher ${index}` },
        subscriptionPackage: ThothPackage.Sphinx,
        enabledDistributionPlatforms: [{ platform: DistributionPlatform.Oapen }],
        updatedAt: '2026-08-01T10:00:00Z',
      },
      lastChange: null,
      latestBackCatalogueJob: null,
    });

    // A report that answers the offset it is actually asked for, so a page that
    // no longer exists genuinely comes back with no rows.
    const reportPopulationOf = (totalCount: number) => {
      reportHookMock.mockImplementation((props: ReportHookProps) => ({
        ...idleReport,
        totalCount,
        summaries: Array.from({ length: Math.max(0, Math.min(PAGE_SIZE, totalCount - props.offset)) }, (_, index) =>
          createRow(props.offset + index),
        ),
      }));
    };

    it('clamps to the last valid page when a mutation-driven count refresh removes the current page', () => {
      // 21 matching publishers: page 2 exists and holds exactly one row.
      reportPopulationOf(21);

      const { result, rerender } = renderHook(() => usePublisherAdministration());

      act(() => result.current.changePage(2));

      expect(result.current.activePage).toBe(2);
      expect(lastReportProps().offset).toBe(20);
      expect(result.current.summaries).toHaveLength(1);

      // The edited publisher no longer matches the active filters, so the
      // reconciled report and count come back describing 20 publishers. Page 2
      // no longer exists.
      reportPopulationOf(20);
      rerender();

      // The page is normalized and the report is read at the valid offset...
      expect(result.current.activePage).toBe(1);
      expect(lastReportProps().offset).toBe(0);
      // ...so the 20 publishers that still match are presented as rows, and the
      // out-of-range empty page is never reported as an empty filtered
      // population.
      expect(result.current.viewState).toBe('rows');
      expect(result.current.viewState).not.toBe('emptyReport');
      expect(result.current.summaries).toHaveLength(20);
      expect(result.current.totalPagesCount).toBe(1);
    });

    it('retains the current page when the refreshed count leaves it valid', () => {
      reportPopulationOf(60);

      const { result, rerender } = renderHook(() => usePublisherAdministration());

      act(() => result.current.changePage(3));

      expect(lastReportProps().offset).toBe(40);

      // 45 still spans three pages: page 3 remains valid and must not be reset.
      reportPopulationOf(45);
      rerender();

      expect(result.current.activePage).toBe(3);
      expect(lastReportProps().offset).toBe(40);
      expect(result.current.viewState).toBe('rows');
    });

    it('clamps only as far as the new last valid page, never back to the first page', () => {
      reportPopulationOf(100);

      const { result, rerender } = renderHook(() => usePublisherAdministration());

      act(() => result.current.changePage(5));

      expect(lastReportProps().offset).toBe(80);

      // 50 spans three pages, so page 5 clamps to page 3 - not to page 1.
      reportPopulationOf(50);
      rerender();

      expect(result.current.activePage).toBe(3);
      expect(lastReportProps().offset).toBe(40);
      expect(result.current.viewState).toBe('rows');
    });

    it('normalizes safely to page one when the refreshed count is zero, and then reports a truthful empty result', () => {
      reportPopulationOf(40);

      const { result, rerender } = renderHook(() => usePublisherAdministration());

      act(() => result.current.changePage(2));

      expect(lastReportProps().offset).toBe(20);

      reportPopulationOf(0);
      rerender();

      expect(result.current.activePage).toBe(1);
      expect(lastReportProps().offset).toBe(0);
      expect(result.current.totalPagesCount).toBe(0);
      // Genuinely empty at a valid page: this is the one case where "no
      // publishers match the current filters" is the truthful state.
      expect(result.current.viewState).toBe('emptyReport');
    });

    it('does not treat a still-loading count as evidence that the current page is invalid', () => {
      // The count has not resolved yet, so the valid range is unknown.
      reportHookMock.mockImplementation(() => ({ ...idleReport, summaries: [], totalCount: undefined }));

      const { result, rerender } = renderHook(() => usePublisherAdministration());

      act(() => result.current.changePage(4));
      rerender();

      expect(result.current.activePage).toBe(4);
      expect(lastReportProps().offset).toBe(60);
    });

    it('does not force page one when the count read failed', () => {
      reportHookMock.mockImplementation(() => ({
        ...idleReport,
        summaries: [],
        totalCount: undefined,
        countError: new Error('FORBIDDEN'),
      }));

      const { result, rerender } = renderHook(() => usePublisherAdministration());

      act(() => result.current.changePage(4));
      rerender();

      expect(result.current.activePage).toBe(4);
      expect(lastReportProps().offset).toBe(60);
    });

    it('leaves a page alone when a count change grows the valid range', () => {
      reportPopulationOf(40);

      const { result, rerender } = renderHook(() => usePublisherAdministration());

      act(() => result.current.changePage(2));

      expect(lastReportProps().offset).toBe(20);

      reportPopulationOf(100);
      rerender();

      expect(result.current.activePage).toBe(2);
      expect(lastReportProps().offset).toBe(20);
    });
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

  // APP-02B: the staff edit session is a bounded addition to this same index.
  describe('staff edit session (APP-02B)', () => {
    it('supplies the concurrency token from the report itself, not from an extra read', () => {
      const document = print(GET_PUBLISHER_SERVICE_CONFIGURATION_REPORT);

      // `configuration.updatedAt` is selected on the row the index already
      // reads, so package, platform set and version token come from one
      // internally consistent report row.
      expect(document).toMatch(/configuration \{[\s\S]*updatedAt[\s\S]*\}/);
      // Still exactly one consolidated read: no per-row or editor-open
      // single-publisher protected configuration request was added.
      expect(document).toContain('publisherServiceConfigurations(');
      expect(document).not.toContain('publisherServiceConfiguration(');
    });

    it('gates the edit session on exactly the same authoritative-superuser eligibility as the report', () => {
      renderHook(() => usePublisherAdministration());

      expect(lastEditorProps().isEligible).toBe(true);
      expect(lastEditorProps().isEligible).toBe(lastReportProps().isEligible);
    });

    it('denies the edit session to an authoritative non-superuser', () => {
      useUserMock.mockReturnValue({
        user: { isSuperuser: false, linkedPublishers: [] },
        isAuthoritative: true,
      });

      renderHook(() => usePublisherAdministration());

      expect(lastEditorProps().isEligible).toBe(false);
    });

    it('denies the edit session while user identity is not yet authoritative', () => {
      useUserMock.mockReturnValue({
        user: { isSuperuser: true, linkedPublishers: [] },
        isAuthoritative: false,
      });

      renderHook(() => usePublisherAdministration());

      expect(lastEditorProps().isEligible).toBe(false);
    });

    it('hands the editor the same backend platform metadata the index uses, and nothing else', () => {
      const distributionPlatformOptions = [
        { platform: DistributionPlatform.Oapen, displayLabel: 'OAPEN Library', assignable: true },
      ];
      platformOptionsMock.mockReturnValue({ distributionPlatformOptions });

      renderHook(() => usePublisherAdministration());

      expect(lastEditorProps().distributionPlatformOptions).toBe(distributionPlatformOptions);
    });

    it('exposes the editor session state without reinterpreting it', () => {
      const session = {
        snapshot: {
          publisherId: 'pub-1',
          publisherName: 'Publisher One',
          expectedUpdatedAt: '2026-08-01T10:00:00Z',
          subscriptionPackage: ThothPackage.Sphinx,
          enabledPlatforms: [DistributionPlatform.Oapen],
        },
        draft: { subscriptionPackage: ThothPackage.Sphinx, enabledPlatforms: [DistributionPlatform.Oapen] },
      };
      const outcome = { publisherId: 'pub-1', publisherName: 'Publisher One', kind: 'saved' as const };
      editorHookMock.mockReturnValue({ ...idleEditor, session, outcome, isEditing: true, canStartEdit: false });

      const { result } = renderHook(() => usePublisherAdministration());

      expect(result.current.editSession).toBe(session);
      expect(result.current.saveOutcome).toBe(outcome);
      expect(result.current.canStartEdit).toBe(false);
    });

    it('does not clear or retarget an open edit session when the report page changes underneath it', () => {
      const session = {
        snapshot: {
          publisherId: 'pub-1',
          publisherName: 'Publisher One',
          expectedUpdatedAt: '2026-08-01T10:00:00Z',
          subscriptionPackage: ThothPackage.Sphinx,
          enabledPlatforms: [DistributionPlatform.Oapen],
        },
        draft: { subscriptionPackage: ThothPackage.Sphinx, enabledPlatforms: [DistributionPlatform.Oapen] },
      };
      editorHookMock.mockReturnValue({ ...idleEditor, session, isEditing: true });

      const { result } = renderHook(() => usePublisherAdministration());

      act(() => result.current.changePage(3));
      act(() => result.current.changeSelectedPackages([ThothPackage.Pyramid]));

      // Nothing in the index's filter/pagination state feeds the session: the
      // hook only passes it through.
      expect(result.current.editSession).toBe(session);
      expect(idleEditor.cancelEdit).not.toHaveBeenCalled();
    });

    it('exposes no bulk or multi-publisher mutation affordance', () => {
      const { result } = renderHook(() => usePublisherAdministration());

      const api = Object.keys(result.current);

      expect(api.filter((key) => /bulk|selectRow|selectedRows|applyToAll/i.test(key))).toEqual([]);
      // The only mutation entry point takes exactly one report summary.
      expect(result.current.startEdit).toBe(idleEditor.startEdit);
    });
  });
});
