import { ThemeProvider } from '@mui/material';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DistributionPlatform } from '@/gql/graphql';
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
  ...overrides,
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

  it('contains no mutation or edit affordance in the report table', () => {
    renderWidget();

    expect(within(screen.getByRole('table')).queryAllByRole('button')).toHaveLength(0);
    expect(screen.queryByText('editServiceConfiguration')).not.toBeInTheDocument();
    expect(screen.queryByText('saveServiceConfiguration')).not.toBeInTheDocument();
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
});
