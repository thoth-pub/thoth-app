import { ThemeProvider } from '@mui/material';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DistributionPlatform, ThothPackage } from '@/gql/graphql';
import { theme } from '@/src/shared/theme';

const usePublisherAdministrationMock = vi.fn();

vi.mock('./usePublisherAdministration', () => ({
  default: function usePublisherAdministration() {
    return usePublisherAdministrationMock();
  },
}));
// Render translation keys verbatim so copy/state assertions are deterministic.
vi.mock('@/src/shared/hooks/useTypedTranslation', () => ({
  default: () => ({ t: (key: string) => key }),
}));
// Spy proving global active-publisher isolation: nothing in this widget - index
// or editor - may consult the active-publisher state machine.
const stateMachineSpy = vi.fn();
vi.mock('@/src/entities/publisher/store/hooks/usePublisherStateMachine', () => ({
  default: () => stateMachineSpy(),
}));

import PublisherAdministration from './PublisherAdministration';

// Backend-provided display labels; DOAB deliberately has metadata although no
// row membership includes it, to prove labels never add membership.
const DISPLAY_LABELS: Partial<Record<DistributionPlatform, string>> = {
  [DistributionPlatform.Oapen]: 'OAPEN Library',
  [DistributionPlatform.Doab]: 'Directory of Open Access Books',
};

const createSummary = (overrides?: {
  publisherId?: string;
  publisherName?: string;
  subscriptionPackage?: string;
  platforms?: DistributionPlatform[];
  updatedAt?: string;
  lastChange?: { changedAt: string } | null;
  latestBackCatalogueJob?: {
    distributionJobId: string;
    status: string;
    targets: { platform: DistributionPlatform }[];
    updatedAt: string;
  } | null;
}) => ({
  configuration: {
    publisher: {
      publisherId: overrides?.publisherId ?? 'pub-1',
      publisherName: overrides?.publisherName ?? 'Publisher One',
    },
    subscriptionPackage: overrides?.subscriptionPackage ?? 'SPHINX',
    enabledDistributionPlatforms: (overrides?.platforms ?? [DistributionPlatform.Oapen]).map((platform) => ({
      platform,
    })),
    // APP-02B: the version token the row carries into an edit session.
    updatedAt: overrides?.updatedAt ?? '2026-08-12T09:00:00Z',
  },
  lastChange: overrides?.lastChange !== undefined ? overrides.lastChange : { changedAt: '2026-08-12T09:00:00Z' },
  latestBackCatalogueJob:
    overrides?.latestBackCatalogueJob !== undefined
      ? overrides.latestBackCatalogueJob
      : {
          distributionJobId: 'job-1',
          status: 'SUCCEEDED',
          targets: [{ platform: DistributionPlatform.Oapen }],
          updatedAt: '2026-08-11T10:00:00Z',
        },
});

const createHookState = (overrides?: Record<string, unknown>) => ({
  viewState: 'rows',
  summaries: [createSummary()],
  error: null,
  totalCount: 1,
  countError: null,
  totalPagesCount: 1,
  activePage: 1,
  changePage: vi.fn(),
  selectedPublisherIds: [],
  changeSelectedPublisherIds: vi.fn(),
  selectedPackages: [],
  changeSelectedPackages: vi.fn(),
  selectedPlatforms: [],
  changeSelectedPlatforms: vi.fn(),
  selectedJobStatuses: [],
  changeSelectedJobStatuses: vi.fn(),
  jobPresence: 'all',
  changeJobPresence: vi.fn(),
  publisherFilterOptions: [{ id: 'pub-1', name: 'Publisher One' }],
  packageFilterOptions: ['OASIS', 'OBELISK', 'SPHINX', 'PYRAMID'],
  platformFilterOptions: [DistributionPlatform.Oapen, DistributionPlatform.Doab],
  jobStatusFilterOptions: ['PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED'],
  getPlatformDisplayLabel: (platform: DistributionPlatform) => DISPLAY_LABELS[platform] ?? platform,
  editSession: null,
  editPlatformRows: [],
  isSavingEdit: false,
  canStartEdit: true,
  canCancelEdit: false,
  saveOutcome: null,
  startEdit: vi.fn(),
  cancelEdit: vi.fn(),
  changeEditPackage: vi.fn(),
  toggleEditPlatform: vi.fn(),
  saveEdit: vi.fn(),
  ...overrides,
});

const createSession = (overrides?: { publisherId?: string; publisherName?: string; updatedAt?: string }) => ({
  snapshot: {
    publisherId: overrides?.publisherId ?? 'pub-1',
    publisherName: overrides?.publisherName ?? 'Publisher One',
    expectedUpdatedAt: overrides?.updatedAt ?? '2026-08-12T09:00:00Z',
    subscriptionPackage: ThothPackage.Sphinx,
    enabledPlatforms: [DistributionPlatform.Oapen],
  },
  draft: { subscriptionPackage: ThothPackage.Sphinx, enabledPlatforms: [DistributionPlatform.Oapen] },
});

const renderWidget = () =>
  render(
    <ThemeProvider theme={theme}>
      <PublisherAdministration />
    </ThemeProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  usePublisherAdministrationMock.mockReturnValue(createHookState());
});

afterEach(() => {
  cleanup();
});

describe('PublisherAdministration', () => {
  it('presents nothing staff-only while user identity is pending', () => {
    usePublisherAdministrationMock.mockReturnValue(createHookState({ viewState: 'identityPending', summaries: undefined }));

    renderWidget();

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText('notAuthorized')).not.toBeInTheDocument();
    expect(screen.queryByText('Publisher One')).not.toBeInTheDocument();
  });

  it('fails closed for an authoritative non-superuser: bounded copy, no filters, no report data', () => {
    usePublisherAdministrationMock.mockReturnValue(createHookState({ viewState: 'notAuthorized', summaries: undefined }));

    renderWidget();

    expect(screen.getByText('notAuthorized')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText('filterPublisher')).not.toBeInTheDocument();
    expect(screen.queryByText('Publisher One')).not.toBeInTheDocument();
  });

  it('shows a report failure as unavailable, never as an empty or no-job result', () => {
    usePublisherAdministrationMock.mockReturnValue(
      createHookState({ viewState: 'reportError', summaries: undefined, error: new Error('FORBIDDEN') }),
    );

    renderWidget();

    expect(screen.getByText('reportUnavailable')).toBeInTheDocument();
    expect(screen.queryByText('emptyReport')).not.toBeInTheDocument();
    expect(screen.queryByText('noBackCatalogueJobRecorded')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows a valid empty filtered result distinctly from an error', () => {
    usePublisherAdministrationMock.mockReturnValue(createHookState({ viewState: 'emptyReport', summaries: [] }));

    renderWidget();

    expect(screen.getByText('emptyReport')).toBeInTheDocument();
    expect(screen.queryByText('reportUnavailable')).not.toBeInTheDocument();
  });

  it('renders publisher, package, platforms, job and last change from the report row facts', () => {
    usePublisherAdministrationMock.mockReturnValue(
      createHookState({
        summaries: [
          createSummary(),
          createSummary({
            publisherId: 'pub-2',
            publisherName: 'Publisher Two',
            subscriptionPackage: 'OASIS',
            platforms: [],
            lastChange: null,
            latestBackCatalogueJob: null,
          }),
        ],
        totalCount: 2,
      }),
    );

    renderWidget();

    const table = screen.getByRole('table');

    expect(within(table).getByText('Publisher One')).toBeInTheDocument();
    expect(within(table).getByText('Publisher Two')).toBeInTheDocument();
    expect(within(table).getByText('SPHINX')).toBeInTheDocument();
    expect(within(table).getByText('OASIS')).toBeInTheDocument();
    expect(within(table).getByText('2026-08-12T09:00:00Z')).toBeInTheDocument();
    expect(within(table).getByText('noLastChangeRecorded')).toBeInTheDocument();
    expect(within(table).getByText('noDistributionPlatforms')).toBeInTheDocument();
  });

  it('labels platform membership from backend metadata without altering membership', () => {
    renderWidget();

    const table = screen.getByRole('table');

    // The enabled platform is labeled with its backend display label...
    expect(within(table).getAllByText('OAPEN Library').length).toBeGreaterThan(0);
    // ...and metadata for a non-member platform never creates a chip.
    expect(within(table).queryByText('Directory of Open Access Books')).not.toBeInTheDocument();
  });

  it('shows the exact job status with the worker-reported disclaimer and no delivery claim', () => {
    renderWidget();

    expect(screen.getByText('SUCCEEDED')).toBeInTheDocument();
    expect(screen.getByText('jobDeliveryDisclaimer')).toBeInTheDocument();
  });

  it('renders a null latest job only as the no-recorded-job state', () => {
    usePublisherAdministrationMock.mockReturnValue(
      createHookState({ summaries: [createSummary({ latestBackCatalogueJob: null })] }),
    );

    renderWidget();

    expect(screen.getByText('noBackCatalogueJobRecorded')).toBeInTheDocument();
    expect(screen.queryByText('reportUnavailable')).not.toBeInTheDocument();
  });

  it('offers exactly one bounded Edit action per row, and no bulk affordance', () => {
    usePublisherAdministrationMock.mockReturnValue(
      createHookState({
        summaries: [createSummary(), createSummary({ publisherId: 'pub-2', publisherName: 'Publisher Two' })],
        totalCount: 2,
      }),
    );

    renderWidget();

    const table = screen.getByRole('table');

    // One control per row and nothing else: no row checkboxes, no select-all,
    // no apply-to-many action.
    expect(within(table).getAllByRole('button')).toHaveLength(2);
    expect(within(table).queryAllByRole('checkbox')).toHaveLength(0);
    expect(within(table).getByRole('button', { name: 'editAction: Publisher One' })).toBeInTheDocument();
    expect(within(table).getByRole('button', { name: 'editAction: Publisher Two' })).toBeInTheDocument();
    expect(within(table).getByText('actionsColumn')).toBeInTheDocument();
  });

  it('drives count-derived pagination through the page-change handler', async () => {
    const changePage = vi.fn();
    usePublisherAdministrationMock.mockReturnValue(createHookState({ totalPagesCount: 3, changePage }));

    renderWidget();

    await userEvent.click(screen.getByRole('button', { name: /page 2/i }));

    expect(changePage).toHaveBeenCalledWith(2);
  });

  it('reports an unavailable total instead of estimating pagination when the count read failed', () => {
    usePublisherAdministrationMock.mockReturnValue(
      createHookState({ countError: new Error('FORBIDDEN'), totalPagesCount: 0 }),
    );

    renderWidget();

    expect(screen.getByText('totalCountUnavailable')).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  // APP-02B: the bounded single-publisher edit affordance on this same index.
  describe('staff edit action (APP-02B)', () => {
    it('never consults the global active-publisher state machine', () => {
      usePublisherAdministrationMock.mockReturnValue(createHookState({ editSession: createSession() }));

      renderWidget();

      expect(stateMachineSpy).not.toHaveBeenCalled();
    });

    it('shows no Edit affordance at all while user identity is pending', () => {
      usePublisherAdministrationMock.mockReturnValue(
        createHookState({ viewState: 'identityPending', summaries: undefined }),
      );

      renderWidget();

      expect(screen.queryByText('editAction')).not.toBeInTheDocument();
      expect(screen.queryByText('actionsColumn')).not.toBeInTheDocument();
    });

    it('shows no Edit affordance to an authoritative non-superuser', () => {
      usePublisherAdministrationMock.mockReturnValue(
        createHookState({ viewState: 'notAuthorized', summaries: undefined, canStartEdit: false }),
      );

      renderWidget();

      expect(screen.getByText('notAuthorized')).toBeInTheDocument();
      expect(screen.queryByText('editAction')).not.toBeInTheDocument();
      expect(screen.queryByText('editorTitle')).not.toBeInTheDocument();
    });

    it('starts an edit with that exact row own summary, so identity is the row publisher', async () => {
      const startEdit = vi.fn();
      const rowOne = createSummary();
      const rowTwo = createSummary({
        publisherId: 'pub-2',
        publisherName: 'Publisher Two',
        updatedAt: '2026-08-19T07:00:00Z',
      });
      usePublisherAdministrationMock.mockReturnValue(
        createHookState({ summaries: [rowOne, rowTwo], totalCount: 2, startEdit }),
      );

      renderWidget();

      await userEvent.click(screen.getByRole('button', { name: 'editAction: Publisher Two' }));

      // The whole row summary is handed over - its own publisher ID, package,
      // platform set and updatedAt token together - not an index or a name.
      expect(startEdit).toHaveBeenCalledTimes(1);
      expect(startEdit).toHaveBeenCalledWith(rowTwo);
      expect(startEdit.mock.calls[0][0].configuration.publisher.publisherId).toBe('pub-2');
      expect(startEdit.mock.calls[0][0].configuration.updatedAt).toBe('2026-08-19T07:00:00Z');
    });

    it('withholds every row Edit control while a session is open, so no second row can start one', () => {
      usePublisherAdministrationMock.mockReturnValue(
        createHookState({
          summaries: [createSummary(), createSummary({ publisherId: 'pub-2', publisherName: 'Publisher Two' })],
          totalCount: 2,
          canStartEdit: false,
          editSession: createSession(),
        }),
      );

      // Queried through the container rather than by role: the mounted modal
      // marks the page content aria-hidden, and the row controls are asserted
      // here regardless of that.
      const { container } = renderWidget();

      const editButtons = Array.from(container.querySelectorAll('table button'));

      expect(editButtons).toHaveLength(2);
      editButtons.forEach((button) => expect(button).toBeDisabled());
    });

    it('mounts exactly one editor, bound to the session own snapshot', () => {
      usePublisherAdministrationMock.mockReturnValue(
        createHookState({
          summaries: [createSummary(), createSummary({ publisherId: 'pub-2', publisherName: 'Publisher Two' })],
          totalCount: 2,
          canStartEdit: false,
          canCancelEdit: true,
          editSession: createSession({ publisherId: 'pub-2', publisherName: 'Publisher Two' }),
        }),
      );

      renderWidget();

      expect(screen.getAllByText('editorTitle')).toHaveLength(1);
      // The editor names the session's publisher, which need not be the first
      // row and is never the active publisher.
      expect(screen.getByText('pub-2')).toBeInTheDocument();
    });

    it('mounts no editor when there is no session', () => {
      renderWidget();

      expect(screen.queryByText('editorTitle')).not.toBeInTheDocument();
    });

    it('presents a successful save against the attempted publisher, not against a table row', () => {
      // The edited publisher no longer matches the active filters after the
      // save, so the reconciled report legitimately came back empty. The
      // outcome must still be presented, and no stale row may be kept for it.
      usePublisherAdministrationMock.mockReturnValue(
        createHookState({
          viewState: 'emptyReport',
          summaries: [],
          totalCount: 0,
          saveOutcome: { publisherId: 'pub-1', publisherName: 'Publisher One', kind: 'saved' },
        }),
      );

      renderWidget();

      expect(screen.getByRole('status')).toHaveTextContent('editorOutcomeSaved');
      expect(screen.getByRole('status')).toHaveTextContent('Publisher One');
      expect(screen.getByText('emptyReport')).toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('presents a stale write as not saved', () => {
      usePublisherAdministrationMock.mockReturnValue(
        createHookState({
          saveOutcome: { publisherId: 'pub-1', publisherName: 'Publisher One', kind: 'stale' },
        }),
      );

      renderWidget();

      expect(screen.getByRole('status')).toHaveTextContent('editorOutcomeStale');
      expect(screen.queryByText('editorOutcomeSaved')).not.toBeInTheDocument();
      // A new edit has to be started deliberately: no editor is left open.
      expect(screen.queryByText('editorTitle')).not.toBeInTheDocument();
    });

    it('presents a disabled job-creation outcome as not saved, with no job claim', () => {
      usePublisherAdministrationMock.mockReturnValue(
        createHookState({
          saveOutcome: { publisherId: 'pub-1', publisherName: 'Publisher One', kind: 'jobCreationDisabled' },
        }),
      );

      renderWidget();

      expect(screen.getByRole('status')).toHaveTextContent('editorOutcomeJobCreationDisabled');
      expect(screen.queryByText('editorOutcomeSaved')).not.toBeInTheDocument();
      expect(screen.queryByText('editorTitle')).not.toBeInTheDocument();
    });

    it('presents an ambiguous failure as an uncertain outcome, never as success', () => {
      usePublisherAdministrationMock.mockReturnValue(
        createHookState({
          saveOutcome: {
            publisherId: 'pub-1',
            publisherName: 'Publisher One',
            kind: 'failed',
            message: 'Network error',
          },
        }),
      );

      renderWidget();

      expect(screen.getByRole('status')).toHaveTextContent('editorOutcomeFailed');
      expect(screen.getByRole('status')).toHaveTextContent('Network error');
      expect(screen.queryByText('editorOutcomeSaved')).not.toBeInTheDocument();
      expect(screen.queryByText('editorTitle')).not.toBeInTheDocument();
    });

    it('shows a report failure as unavailable even after a save outcome, never as saved rows', () => {
      usePublisherAdministrationMock.mockReturnValue(
        createHookState({
          viewState: 'reportError',
          summaries: undefined,
          error: new Error('FORBIDDEN'),
          saveOutcome: { publisherId: 'pub-1', publisherName: 'Publisher One', kind: 'saved' },
        }),
      );

      renderWidget();

      expect(screen.getByText('reportUnavailable')).toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });
});
