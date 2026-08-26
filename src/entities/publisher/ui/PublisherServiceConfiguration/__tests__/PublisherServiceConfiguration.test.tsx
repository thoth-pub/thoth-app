import { ThemeProvider } from '@mui/material';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphqlError } from '@/src/shared/api/graphqlService';
import { theme } from '@/src/shared/theme';

const stateMachineMock = vi.fn();
const serviceConfigurationMock = vi.fn();
const platformOptionsMock = vi.fn();
const useUserMock = vi.fn();
const replaceServiceConfigurationMock = vi.fn();
const backCatalogueJobMock = vi.fn();

vi.mock('../../../store/hooks/usePublisherStateMachine', () => ({
  default: () => stateMachineMock(),
}));
vi.mock('../../../api/hooks/usePublisherServiceConfiguration', () => ({
  default: () => serviceConfigurationMock(),
}));
vi.mock('../../../api/hooks/useDistributionPlatformOptions', () => ({
  default: () => platformOptionsMock(),
}));
// The arguments are captured so the tests can prove the component wires the
// exact active publisher and its superuser presentation eligibility into the
// report hook, whose `enabled` mechanism is what suppresses the staff request.
vi.mock('../../../api/hooks/usePublisherBackCatalogueJob', () => ({
  default: (publisherId: string, isSuperuser: boolean) => backCatalogueJobMock(publisherId, isSuperuser),
}));
// Only the mutation hook itself is replaced. The real classification helper and
// classification constants are kept so these tests exercise the same
// `extensions.type` reading the component ships with.
vi.mock('../../../api/hooks/useReplacePublisherServiceConfiguration', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../api/hooks/useReplacePublisherServiceConfiguration')>()),
  default: () => ({ replaceServiceConfiguration: replaceServiceConfigurationMock, loading: false }),
}));
vi.mock('@/src/entities/user', () => ({
  useUser: () => useUserMock(),
}));
// Render translation keys verbatim so label/state assertions are deterministic.
vi.mock('@/src/shared/hooks/useTypedTranslation', () => ({
  default: () => ({ t: (key: string) => key }),
}));

import PublisherServiceConfiguration from '../PublisherServiceConfiguration';

const LOADED_UPDATED_AT = '2026-08-01T10:00:00Z';
const PUBLISHER_B_UPDATED_AT = '2026-08-05T09:00:00Z';

function renderComponent() {
  return render(
    <ThemeProvider theme={theme}>
      <PublisherServiceConfiguration />
    </ThemeProvider>,
  );
}

const rerenderComponent = (rerender: ReturnType<typeof render>['rerender']) =>
  rerender(
    <ThemeProvider theme={theme}>
      <PublisherServiceConfiguration />
    </ThemeProvider>,
  );

// Simulates the persistent-navigation publisher selector: the active publisher
// and its protected configuration change while the component stays mounted.
const switchActivePublisherToB = () => {
  stateMachineMock.mockReturnValue({ activePublisher: { id: 'pub-2' } });
  serviceConfigurationMock.mockReturnValue({
    serviceConfiguration: {
      subscriptionPackage: 'PYRAMID',
      effectiveCapabilities: ['OAI_PMH'],
      enabledDistributionPlatforms: [{ platform: 'OAPEN' }],
      updatedAt: PUBLISHER_B_UPDATED_AT,
    },
    isLoading: false,
    error: null,
  });
};

const asSuperuser = () => useUserMock.mockReturnValue({ user: { isSuperuser: true } });

const startEditing = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'editServiceConfiguration' }));
};

const save = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'saveServiceConfiguration' }));
};

const sentInput = () => replaceServiceConfigurationMock.mock.calls[0][0];

beforeEach(() => {
  vi.clearAllMocks();
  stateMachineMock.mockReturnValue({ activePublisher: { id: 'pub-1' } });
  useUserMock.mockReturnValue({ user: { isSuperuser: false } });
  backCatalogueJobMock.mockReturnValue({ report: undefined, isLoading: false, error: null });
  replaceServiceConfigurationMock.mockResolvedValue({
    subscriptionPackage: 'SPHINX',
    effectiveCapabilities: ['OAI_PMH', 'METRICS_COLLECT'],
    enabledDistributionPlatforms: [{ platform: 'INTERNET_ARCHIVE' }],
    updatedAt: '2026-08-01T11:00:00Z',
  });
  platformOptionsMock.mockReturnValue({
    distributionPlatformOptions: [
      {
        platform: 'OAPEN',
        displayLabel: 'OAPEN',
        assignable: true,
        linkedGroup: 'OAPEN_DOAB',
        backCatalogueBehaviour: 'AUTOMATIC_PUSH',
      },
      {
        platform: 'DOAB',
        displayLabel: 'DOAB',
        assignable: true,
        linkedGroup: 'OAPEN_DOAB',
        backCatalogueBehaviour: 'AUTOMATIC_PUSH',
      },
      {
        platform: 'INTERNET_ARCHIVE',
        displayLabel: 'Internet Archive',
        assignable: true,
        linkedGroup: null,
        backCatalogueBehaviour: 'AUTOMATIC_PUSH',
      },
      {
        platform: 'JISC_NBK',
        displayLabel: 'Jisc NBK',
        assignable: false,
        linkedGroup: null,
        backCatalogueBehaviour: 'MANUAL',
      },
    ],
    isLoading: false,
    error: null,
  });
  serviceConfigurationMock.mockReturnValue({
    serviceConfiguration: {
      subscriptionPackage: 'SPHINX',
      effectiveCapabilities: ['OAI_PMH', 'METRICS_COLLECT'],
      enabledDistributionPlatforms: [{ platform: 'INTERNET_ARCHIVE' }],
      updatedAt: LOADED_UPDATED_AT,
    },
    isLoading: false,
    error: null,
  });
});

afterEach(() => {
  cleanup();
});

describe('PublisherServiceConfiguration', () => {
  it('renders the API-backed subscription package', () => {
    renderComponent();

    expect(screen.getByText('SPHINX')).toBeInTheDocument();
  });

  it('renders capabilities directly from effectiveCapabilities', () => {
    renderComponent();

    expect(screen.getByText('OAI_PMH')).toBeInTheDocument();
    expect(screen.getByText('METRICS_COLLECT')).toBeInTheDocument();
  });

  it('renders enabled platforms using backend display labels, not raw codes', () => {
    renderComponent();

    // INTERNET_ARCHIVE is enabled; it must be shown via its backend displayLabel.
    expect(screen.getByText('Internet Archive')).toBeInTheDocument();
    expect(screen.queryByText('INTERNET_ARCHIVE')).not.toBeInTheDocument();
  });

  it('falls back to the backend platform code when no option metadata exists', () => {
    platformOptionsMock.mockReturnValue({
      distributionPlatformOptions: [],
      isLoading: false,
      error: null,
    });

    renderComponent();

    expect(screen.getByText('INTERNET_ARCHIVE')).toBeInTheDocument();
  });

  it('exposes no edit controls (read-only) for ordinary publishers', () => {
    renderComponent();

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('offers superusers an edit affordance without changing the read-only default view', () => {
    asSuperuser();

    renderComponent();

    // APP-01B: the only control before an edit session starts is Edit; the
    // configuration itself is still rendered read-only.
    expect(screen.getByRole('button', { name: 'editServiceConfiguration' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByText('SPHINX')).toBeInTheDocument();
  });

  it('does not fabricate configuration when the protected read fails', () => {
    serviceConfigurationMock.mockReturnValue({
      serviceConfiguration: undefined,
      isLoading: false,
      error: new Error('FORBIDDEN'),
    });

    renderComponent();

    expect(screen.getByText('serviceConfigurationUnavailable')).toBeInTheDocument();
    expect(screen.queryByText('SPHINX')).not.toBeInTheDocument();
  });

  it('shows a loading state without fabricating configuration', () => {
    serviceConfigurationMock.mockReturnValue({
      serviceConfiguration: undefined,
      isLoading: true,
      error: null,
    });

    const { container } = renderComponent();

    expect(screen.queryByText('SPHINX')).not.toBeInTheDocument();
    expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
  });

  it('renders nothing when there is no active publisher', () => {
    stateMachineMock.mockReturnValue({ activePublisher: null });

    const { container } = renderComponent();

    expect(container).toBeEmptyDOMElement();
  });

  it('shows truthful empty states when nothing is enabled', () => {
    serviceConfigurationMock.mockReturnValue({
      serviceConfiguration: {
        subscriptionPackage: 'OASIS',
        effectiveCapabilities: [],
        enabledDistributionPlatforms: [],
      },
      isLoading: false,
      error: null,
    });

    renderComponent();

    expect(screen.getByText('OASIS')).toBeInTheDocument();
    expect(screen.getByText('noCapabilities')).toBeInTheDocument();
    expect(screen.getByText('noDistributionPlatforms')).toBeInTheDocument();
  });
});

describe('PublisherServiceConfiguration superuser editing', () => {
  it('initializes the edit session from the loaded API configuration', async () => {
    asSuperuser();
    renderComponent();

    await startEditing();

    expect(screen.getByRole('combobox')).toHaveValue('SPHINX');
    expect(screen.getByRole('checkbox', { name: 'Internet Archive' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'OAPEN' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'DOAB' })).not.toBeChecked();
  });

  it('sends the exact updatedAt loaded for the session as expectedUpdatedAt', async () => {
    asSuperuser();
    renderComponent();

    await startEditing();
    await save();

    expect(sentInput()).toEqual({
      publisherId: 'pub-1',
      subscriptionPackage: 'SPHINX',
      enabledDistributionPlatforms: ['INTERNET_ARCHIVE'],
      expectedUpdatedAt: LOADED_UPDATED_AT,
    });
  });

  it('leaves platform selection untouched when the package changes', async () => {
    asSuperuser();
    renderComponent();

    await startEditing();
    await userEvent.selectOptions(screen.getByRole('combobox'), 'PYRAMID');

    expect(screen.getByRole('checkbox', { name: 'Internet Archive' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'OAPEN' })).not.toBeChecked();

    await save();

    expect(sentInput().subscriptionPackage).toBe('PYRAMID');
    expect(sentInput().enabledDistributionPlatforms).toEqual(['INTERNET_ARCHIVE']);
  });

  it('offers every package from the generated contract enum', async () => {
    asSuperuser();
    renderComponent();

    await startEditing();

    const values = Array.from(screen.getByRole('combobox').querySelectorAll('option')).map((option) => option.value);

    expect(values).toEqual(expect.arrayContaining(['OASIS', 'OBELISK', 'SPHINX', 'PYRAMID']));
  });

  it('cannot newly select an absent platform the backend marks non-assignable', async () => {
    asSuperuser();
    renderComponent();

    await startEditing();

    const nonAssignable = screen.getByRole('checkbox', { name: 'Jisc NBK' });

    expect(nonAssignable).toBeDisabled();
    expect(nonAssignable).not.toBeChecked();
    expect(screen.getAllByText('distributionPlatformNotAssignable').length).toBeGreaterThan(0);
  });

  it('can remove an already-enabled platform that is now non-assignable, and cannot re-add it', async () => {
    serviceConfigurationMock.mockReturnValue({
      serviceConfiguration: {
        subscriptionPackage: 'SPHINX',
        effectiveCapabilities: ['OAI_PMH'],
        enabledDistributionPlatforms: [{ platform: 'JISC_NBK' }],
        updatedAt: LOADED_UPDATED_AT,
      },
      isLoading: false,
      error: null,
    });
    asSuperuser();
    renderComponent();

    await startEditing();

    const nonAssignable = screen.getByRole('checkbox', { name: 'Jisc NBK' });

    expect(nonAssignable).toBeEnabled();
    expect(nonAssignable).toBeChecked();

    await userEvent.click(nonAssignable);

    // Once removed it is no longer selectable, because the backend still says it
    // may not be assigned.
    expect(screen.getByRole('checkbox', { name: 'Jisc NBK' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Jisc NBK' })).toBeDisabled();

    await save();

    expect(sentInput().enabledDistributionPlatforms).toEqual([]);
  });

  it('applies no local linked-group closure when a linked platform is toggled', async () => {
    asSuperuser();
    renderComponent();

    await startEditing();
    await userEvent.click(screen.getByRole('checkbox', { name: 'OAPEN' }));

    // OAPEN and DOAB share a linked group, but only the toggled platform changes.
    expect(screen.getByRole('checkbox', { name: 'OAPEN' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'DOAB' })).not.toBeChecked();

    await save();

    expect(sentInput().enabledDistributionPlatforms).toEqual(['INTERNET_ARCHIVE', 'OAPEN']);
  });

  it('explains linked-group ownership without acting on it', async () => {
    asSuperuser();
    renderComponent();

    await startEditing();

    expect(screen.getByText('linkedGroupNotice')).toBeInTheDocument();
    expect(screen.getAllByText(/linkedGroupLabel/).length).toBeGreaterThan(0);
  });

  it('shows the server-normalized configuration, not the submitted selection, after a save', async () => {
    asSuperuser();
    // The server normalizes the desired set by adding the linked DOAB member and
    // issues a fresh version token; the hook writes that to the query cache.
    const normalized = {
      subscriptionPackage: 'SPHINX',
      effectiveCapabilities: ['OAI_PMH', 'METRICS_COLLECT'],
      enabledDistributionPlatforms: [{ platform: 'INTERNET_ARCHIVE' }, { platform: 'OAPEN' }, { platform: 'DOAB' }],
      updatedAt: '2026-08-01T11:00:00Z',
    };
    replaceServiceConfigurationMock.mockImplementation(async () => {
      serviceConfigurationMock.mockReturnValue({ serviceConfiguration: normalized, isLoading: false, error: null });

      return normalized;
    });

    renderComponent();

    await startEditing();
    await userEvent.click(screen.getByRole('checkbox', { name: 'OAPEN' }));
    await save();

    await waitFor(() => expect(screen.getByText('serviceConfigurationSaved')).toBeInTheDocument());

    // DOAB was never selected locally but is displayed because the server said so.
    expect(screen.getByText('DOAB')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('reports success only after the mutation resolves', async () => {
    asSuperuser();
    let resolveMutation: (value: unknown) => void = () => {};
    replaceServiceConfigurationMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveMutation = resolve;
        }),
    );

    renderComponent();

    await startEditing();
    await save();

    expect(screen.queryByText('serviceConfigurationSaved')).not.toBeInTheDocument();

    resolveMutation({ subscriptionPackage: 'SPHINX', effectiveCapabilities: [], enabledDistributionPlatforms: [] });

    await waitFor(() => expect(screen.getByText('serviceConfigurationSaved')).toBeInTheDocument());
  });

  it('discards the edit session on cancel without calling the mutation', async () => {
    asSuperuser();
    renderComponent();

    await startEditing();
    await userEvent.click(screen.getByRole('checkbox', { name: 'OAPEN' }));
    await userEvent.click(screen.getByRole('button', { name: 'cancelServiceConfigurationEdit' }));

    expect(replaceServiceConfigurationMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByText('Internet Archive')).toBeInTheDocument();
  });

  describe('STALE_SERVICE_CONFIGURATION', () => {
    beforeEach(() => {
      replaceServiceConfigurationMock.mockRejectedValue(
        new GraphqlError('anything at all', { type: 'STALE_SERVICE_CONFIGURATION' }),
      );
    });

    it('shows no success, explains the change and discards the stale session', async () => {
      asSuperuser();
      renderComponent();

      await startEditing();
      await save();

      await waitFor(() => expect(screen.getByText('serviceConfigurationStale')).toBeInTheDocument());
      expect(screen.queryByText('serviceConfigurationSaved')).not.toBeInTheDocument();
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'editServiceConfiguration' })).toBeInTheDocument();
    });

    it('never auto-retries the stale write', async () => {
      asSuperuser();
      renderComponent();

      await startEditing();
      await save();

      await waitFor(() => expect(screen.getByText('serviceConfigurationStale')).toBeInTheDocument());
      expect(replaceServiceConfigurationMock).toHaveBeenCalledTimes(1);
    });

    it('never reuses the stale token: a new edit uses the refetched updatedAt', async () => {
      asSuperuser();
      const { rerender } = renderComponent();

      await startEditing();
      await save();

      await waitFor(() => expect(screen.getByText('serviceConfigurationStale')).toBeInTheDocument());

      // The hook refetched the protected configuration; the query now reports the
      // server's newer token and its newer platform set.
      serviceConfigurationMock.mockReturnValue({
        serviceConfiguration: {
          subscriptionPackage: 'SPHINX',
          effectiveCapabilities: ['OAI_PMH'],
          enabledDistributionPlatforms: [{ platform: 'OAPEN' }],
          updatedAt: '2026-08-02T09:00:00Z',
        },
        isLoading: false,
        error: null,
      });
      replaceServiceConfigurationMock.mockResolvedValue({
        subscriptionPackage: 'SPHINX',
        effectiveCapabilities: ['OAI_PMH'],
        enabledDistributionPlatforms: [{ platform: 'OAPEN' }],
        updatedAt: '2026-08-02T10:00:00Z',
      });
      rerender(
        <ThemeProvider theme={theme}>
          <PublisherServiceConfiguration />
        </ThemeProvider>,
      );

      // A deliberate new edit/save, initialized from the freshly fetched state.
      await startEditing();
      await save();

      expect(replaceServiceConfigurationMock.mock.calls[1][0].expectedUpdatedAt).toBe('2026-08-02T09:00:00Z');
      expect(replaceServiceConfigurationMock.mock.calls[1][0].expectedUpdatedAt).not.toBe(LOADED_UPDATED_AT);
      expect(replaceServiceConfigurationMock.mock.calls[1][0].enabledDistributionPlatforms).toEqual(['OAPEN']);
    });

    it('classifies from extensions.type, not from the message', async () => {
      asSuperuser();
      // Same message, no extensions: this must fall through to the generic path.
      replaceServiceConfigurationMock.mockRejectedValue(new GraphqlError('STALE_SERVICE_CONFIGURATION'));

      renderComponent();

      await startEditing();
      await save();

      await waitFor(() => expect(screen.getByText(/serviceConfigurationSaveFailed/)).toBeInTheDocument());
      expect(screen.queryByText('serviceConfigurationStale')).not.toBeInTheDocument();
    });
  });

  describe('DISTRIBUTION_JOB_CREATION_DISABLED', () => {
    beforeEach(() => {
      replaceServiceConfigurationMock.mockRejectedValue(
        new GraphqlError('anything at all', { type: 'DISTRIBUTION_JOB_CREATION_DISABLED' }),
      );
    });

    it('reports the change as not saved and resets to server state', async () => {
      asSuperuser();
      renderComponent();

      await startEditing();
      await userEvent.click(screen.getByRole('checkbox', { name: 'OAPEN' }));
      await save();

      await waitFor(() => expect(screen.getByText('serviceConfigurationJobCreationDisabled')).toBeInTheDocument());
      expect(screen.queryByText('serviceConfigurationSaved')).not.toBeInTheDocument();
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      // The unsaved OAPEN activation is gone; only server state is displayed.
      expect(screen.queryByText('OAPEN')).not.toBeInTheDocument();
      expect(screen.getByText('Internet Archive')).toBeInTheDocument();
    });

    it('never auto-retries and creates no synthetic job state', async () => {
      asSuperuser();
      renderComponent();

      await startEditing();
      await save();

      await waitFor(() => expect(screen.getByText('serviceConfigurationJobCreationDisabled')).toBeInTheDocument());
      expect(replaceServiceConfigurationMock).toHaveBeenCalledTimes(1);

      // The only thing reported is the failure itself: no pending, queued or
      // otherwise synthesised job representation is rendered.
      const statuses = screen.getAllByRole('status');

      expect(statuses).toHaveLength(1);
      expect(statuses[0]).toHaveTextContent('serviceConfigurationJobCreationDisabled');
      expect(screen.queryByText(/pending|queued|in progress|created/i)).toBeNull();
    });

    it('classifies from extensions.type, not from the message', async () => {
      asSuperuser();
      replaceServiceConfigurationMock.mockRejectedValue(new GraphqlError('DISTRIBUTION_JOB_CREATION_DISABLED'));

      renderComponent();

      await startEditing();
      await save();

      await waitFor(() => expect(screen.getByText(/serviceConfigurationSaveFailed/)).toBeInTheDocument());
      expect(screen.queryByText('serviceConfigurationJobCreationDisabled')).not.toBeInTheDocument();
    });
  });

  describe('generic/unclassified failure', () => {
    beforeEach(() => {
      replaceServiceConfigurationMock.mockRejectedValue(new Error('Network error'));
    });

    it('shows the preserved failure message, no success, and never auto-retries', async () => {
      asSuperuser();
      renderComponent();

      await startEditing();
      await userEvent.click(screen.getByRole('checkbox', { name: 'OAPEN' }));
      await save();

      await waitFor(() =>
        expect(screen.getByRole('status')).toHaveTextContent('serviceConfigurationSaveFailed: Network error'),
      );
      expect(screen.queryByText('serviceConfigurationSaved')).not.toBeInTheDocument();
      expect(replaceServiceConfigurationMock).toHaveBeenCalledTimes(1);
    });

    it('discards the failed draft and returns the display to server-backed state', async () => {
      asSuperuser();
      renderComponent();

      await startEditing();
      await userEvent.click(screen.getByRole('checkbox', { name: 'OAPEN' }));
      await save();

      await waitFor(() => expect(screen.getByText(/serviceConfigurationSaveFailed/)).toBeInTheDocument());

      // The attempt's outcome is ambiguous (the server may have committed), so
      // its local draft is discarded: the editor is closed, the unsaved OAPEN
      // activation is not displayed, and only the server-backed configuration
      // the hook reconciled is shown.
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
      expect(screen.queryByText('OAPEN')).not.toBeInTheDocument();
      expect(screen.getByText('Internet Archive')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'editServiceConfiguration' })).toBeInTheDocument();
    });

    it("initializes a subsequent edit from the reconciled state, never the failed attempt's token", async () => {
      asSuperuser();
      const { rerender } = renderComponent();

      await startEditing();
      await userEvent.click(screen.getByRole('checkbox', { name: 'OAPEN' }));
      await save();

      await waitFor(() => expect(screen.getByText(/serviceConfigurationSaveFailed/)).toBeInTheDocument());

      // The hook reconciled the protected configuration; the query now reports
      // what the server actually holds - here the ambiguous replace did commit -
      // under a fresh version token.
      serviceConfigurationMock.mockReturnValue({
        serviceConfiguration: {
          subscriptionPackage: 'SPHINX',
          effectiveCapabilities: ['OAI_PMH'],
          enabledDistributionPlatforms: [{ platform: 'INTERNET_ARCHIVE' }, { platform: 'OAPEN' }],
          updatedAt: '2026-08-02T09:00:00Z',
        },
        isLoading: false,
        error: null,
      });
      replaceServiceConfigurationMock.mockResolvedValue({
        subscriptionPackage: 'SPHINX',
        effectiveCapabilities: ['OAI_PMH'],
        enabledDistributionPlatforms: [{ platform: 'INTERNET_ARCHIVE' }, { platform: 'OAPEN' }],
        updatedAt: '2026-08-02T10:00:00Z',
      });
      rerenderComponent(rerender);

      // A deliberate new edit/save, initialized from the freshly fetched state.
      await startEditing();
      await save();

      expect(replaceServiceConfigurationMock.mock.calls[1][0].expectedUpdatedAt).toBe('2026-08-02T09:00:00Z');
      expect(replaceServiceConfigurationMock.mock.calls[1][0].expectedUpdatedAt).not.toBe(LOADED_UPDATED_AT);
      expect(replaceServiceConfigurationMock.mock.calls[1][0].enabledDistributionPlatforms).toEqual([
        'INTERNET_ARCHIVE',
        'OAPEN',
      ]);
    });
  });

  describe('active publisher switching', () => {
    it("discards publisher A's edit session and resets to B's server-backed state on switch", async () => {
      asSuperuser();
      const { rerender } = renderComponent();

      await startEditing();
      await userEvent.click(screen.getByRole('checkbox', { name: 'OAPEN' }));

      switchActivePublisherToB();
      rerenderComponent(rerender);

      // A's edit session is gone without any mutation being constructed: the
      // editor is closed and nothing was submitted.
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'saveServiceConfiguration' })).not.toBeInTheDocument();
      expect(replaceServiceConfigurationMock).not.toHaveBeenCalled();

      // B's server-backed configuration is displayed read-only.
      expect(screen.getByText('PYRAMID')).toBeInTheDocument();
      expect(screen.getByText('OAPEN')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'editServiceConfiguration' })).toBeInTheDocument();
    });

    it("submits nothing of A's edit state or token when a new edit is made on B", async () => {
      asSuperuser();
      const { rerender } = renderComponent();

      // A's session diverges from A's server state before the switch.
      await startEditing();
      await userEvent.click(screen.getByRole('checkbox', { name: 'OAPEN' }));

      switchActivePublisherToB();
      rerenderComponent(rerender);

      // A deliberate new edit for B initializes from B's own configuration.
      await startEditing();

      expect(screen.getByRole('combobox')).toHaveValue('PYRAMID');
      expect(screen.getByRole('checkbox', { name: 'OAPEN' })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'Internet Archive' })).not.toBeChecked();

      await save();

      // The only mutation ever sent carries B's id, B's token and B's state -
      // none of A's session (its package, its platform set or LOADED_UPDATED_AT).
      expect(replaceServiceConfigurationMock).toHaveBeenCalledTimes(1);
      expect(sentInput()).toEqual({
        publisherId: 'pub-2',
        subscriptionPackage: 'PYRAMID',
        enabledDistributionPlatforms: ['OAPEN'],
        expectedUpdatedAt: PUBLISHER_B_UPDATED_AT,
      });
    });

    it("clears a previous publisher's save outcome when the active publisher changes", async () => {
      asSuperuser();
      replaceServiceConfigurationMock.mockRejectedValue(new Error('Network error'));
      const { rerender } = renderComponent();

      await startEditing();
      await save();

      await waitFor(() => expect(screen.getByText(/serviceConfigurationSaveFailed/)).toBeInTheDocument());

      switchActivePublisherToB();
      rerenderComponent(rerender);

      expect(screen.queryByText(/serviceConfigurationSaveFailed/)).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('never presents a save that settles after a publisher switch against the new publisher', async () => {
      asSuperuser();
      let resolveMutation: (value: unknown) => void = () => {};
      replaceServiceConfigurationMock.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveMutation = resolve;
          }),
      );
      const { rerender } = renderComponent();

      await startEditing();
      await save();

      switchActivePublisherToB();
      rerenderComponent(rerender);

      // A's replace resolves only now, while B is the active publisher.
      await act(async () => {
        resolveMutation({
          subscriptionPackage: 'SPHINX',
          effectiveCapabilities: ['OAI_PMH', 'METRICS_COLLECT'],
          enabledDistributionPlatforms: [{ platform: 'INTERNET_ARCHIVE' }],
          updatedAt: '2026-08-01T11:00:00Z',
        });
      });

      // No success belonging to A is shown against B; B's read-only server
      // state remains displayed.
      expect(screen.queryByText('serviceConfigurationSaved')).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.getByText('PYRAMID')).toBeInTheDocument();
    });

    it("leaves B's new edit session untouched when A's failure settles after the switch", async () => {
      asSuperuser();
      let rejectMutation: (reason?: unknown) => void = () => {};
      replaceServiceConfigurationMock.mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            rejectMutation = reject;
          }),
      );
      const { rerender } = renderComponent();

      await startEditing();
      await save();

      switchActivePublisherToB();
      rerenderComponent(rerender);

      // A fresh session for B is already open when A's failure finally lands.
      await startEditing();

      await act(async () => {
        rejectMutation(new Error('Network error'));
      });

      // Only the exact failed attempt's session may be discarded: B's session
      // stays open and no failure belonging to A is presented against B.
      expect(screen.getByRole('combobox')).toHaveValue('PYRAMID');
      expect(screen.getByRole('checkbox', { name: 'OAPEN' })).toBeChecked();
      expect(screen.queryByText(/serviceConfigurationSaveFailed/)).not.toBeInTheDocument();
    });
  });
});

describe('PublisherServiceConfiguration latest back-catalogue job (APP-01C)', () => {
  const createJob = (overrides?: Record<string, unknown>) => ({
    distributionJobId: 'job-1',
    status: 'SUCCEEDED',
    attemptCount: 3,
    targets: [{ platform: 'INTERNET_ARCHIVE' }],
    cancellationReason: null,
    lastErrorCode: null,
    lastErrorDetail: null,
    createdAt: '2026-08-10T10:00:00Z',
    updatedAt: '2026-08-11T11:00:00Z',
    completedAt: null,
    ...overrides,
  });

  const withJobReport = (latestBackCatalogueJob: ReturnType<typeof createJob> | null, publisherId = 'pub-1') =>
    backCatalogueJobMock.mockReturnValue({
      report: { configuration: { publisher: { publisherId } }, latestBackCatalogueJob },
      isLoading: false,
      error: null,
    });

  it('passes the active publisher and non-superuser eligibility to the report hook for ordinary users', () => {
    renderComponent();

    // Suppression of the staff request lives in the hook's `enabled` mechanism;
    // the component's part is to wire eligibility through truthfully.
    expect(backCatalogueJobMock).toHaveBeenCalledWith('pub-1', false);
  });

  it('passes superuser eligibility and the active publisher to the report hook', () => {
    asSuperuser();

    renderComponent();

    expect(backCatalogueJobMock).toHaveBeenCalledWith('pub-1', true);
  });

  it('renders no job section for ordinary publishers even when report data would exist', () => {
    withJobReport(createJob());

    renderComponent();

    expect(screen.queryByText('latestBackCatalogueJob')).not.toBeInTheDocument();
    expect(screen.queryByText(/SUCCEEDED/)).not.toBeInTheDocument();
    expect(screen.queryByText(/backCatalogueJob/)).not.toBeInTheDocument();
  });

  it('shows a bounded loading state without fabricating job state', () => {
    asSuperuser();
    backCatalogueJobMock.mockReturnValue({ report: undefined, isLoading: true, error: null });

    const { container } = renderComponent();

    expect(screen.getByText('latestBackCatalogueJob')).toBeInTheDocument();
    expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
    expect(screen.queryByText('noBackCatalogueJobRecorded')).not.toBeInTheDocument();
    expect(screen.queryByText('backCatalogueJobUnavailable')).not.toBeInTheDocument();
  });

  it('renders a report error as unavailable, never as no job', () => {
    asSuperuser();
    backCatalogueJobMock.mockReturnValue({ report: undefined, isLoading: false, error: new Error('FORBIDDEN') });

    renderComponent();

    expect(screen.getByText('backCatalogueJobUnavailable')).toBeInTheDocument();
    expect(screen.queryByText('noBackCatalogueJobRecorded')).not.toBeInTheDocument();
  });

  it('renders a missing/mismatched summary as unavailable, never as no job', () => {
    asSuperuser();
    backCatalogueJobMock.mockReturnValue({ report: null, isLoading: false, error: null });

    renderComponent();

    expect(screen.getByText('backCatalogueJobUnavailable')).toBeInTheDocument();
    expect(screen.queryByText('noBackCatalogueJobRecorded')).not.toBeInTheDocument();
  });

  it('renders a valid null job as the explicit no-recorded-job state, with no status', () => {
    asSuperuser();
    withJobReport(null);

    renderComponent();

    expect(screen.getByText('noBackCatalogueJobRecorded')).toBeInTheDocument();
    expect(screen.queryByText('backCatalogueJobUnavailable')).not.toBeInTheDocument();
    expect(screen.queryByText(/backCatalogueJobStatus/)).not.toBeInTheDocument();
    expect(screen.queryByText(/PENDING|RUNNING|SUCCEEDED|FAILED|CANCELLED/)).not.toBeInTheDocument();
  });

  it('displays the exact API status, not one derived from enabled platforms', () => {
    asSuperuser();
    // The configuration has INTERNET_ARCHIVE enabled, yet the job is FAILED with
    // a different target: everything shown comes from the job itself.
    withJobReport(createJob({ status: 'FAILED', targets: [{ platform: 'OAPEN' }] }));

    renderComponent();

    expect(screen.getByText(/backCatalogueJobStatus/)).toHaveTextContent('backCatalogueJobStatus: FAILED');
    expect(screen.queryByText(/SUCCEEDED/)).not.toBeInTheDocument();
  });

  it('takes target membership only from the job targets, with backend display labels', () => {
    asSuperuser();
    // Enabled configuration platform: JISC_NBK. Job target: INTERNET_ARCHIVE.
    serviceConfigurationMock.mockReturnValue({
      serviceConfiguration: {
        subscriptionPackage: 'SPHINX',
        effectiveCapabilities: ['OAI_PMH'],
        enabledDistributionPlatforms: [{ platform: 'JISC_NBK' }],
        updatedAt: LOADED_UPDATED_AT,
      },
      isLoading: false,
      error: null,
    });
    withJobReport(createJob({ targets: [{ platform: 'INTERNET_ARCHIVE' }] }));

    renderComponent();

    // The job target renders via its backend display label, not the raw code.
    expect(screen.getAllByText('Internet Archive')).toHaveLength(1);
    expect(screen.queryByText('INTERNET_ARCHIVE')).not.toBeInTheDocument();
    // The enabled-but-untargeted platform appears only in the configuration
    // section; the label lookup never adds it to the job's target set.
    expect(screen.getAllByText('Jisc NBK')).toHaveLength(1);
  });

  it('falls back to the raw platform code without changing target membership when metadata is missing', () => {
    asSuperuser();
    withJobReport(createJob({ targets: [{ platform: 'OAPEN' }, { platform: 'FUTURE_PLATFORM' }] }));

    renderComponent();

    expect(screen.getByText('OAPEN')).toBeInTheDocument();
    expect(screen.getByText('FUTURE_PLATFORM')).toBeInTheDocument();
  });

  it('displays the exact attempt count and infers no retry budget or outcome', () => {
    asSuperuser();
    withJobReport(createJob({ attemptCount: 7 }));

    renderComponent();

    expect(screen.getByText(/backCatalogueJobAttemptCount/)).toHaveTextContent('backCatalogueJobAttemptCount: 7');
    expect(screen.queryByText(/remaining|retry|maximum|budget/i)).not.toBeInTheDocument();
  });

  it('shows worker-reported failure fields only when supplied, under worker-reported labels', () => {
    asSuperuser();
    withJobReport(
      createJob({ status: 'FAILED', lastErrorCode: 'DESTINATION_REJECTED', lastErrorDetail: 'bounded detail' }),
    );

    renderComponent();

    expect(screen.getByText(/backCatalogueJobLastErrorCode/)).toHaveTextContent(
      'backCatalogueJobLastErrorCode: DESTINATION_REJECTED',
    );
    expect(screen.getByText(/backCatalogueJobLastErrorDetail/)).toHaveTextContent(
      'backCatalogueJobLastErrorDetail: bounded detail',
    );
  });

  it('invents no failure reason for a failed job with null failure fields', () => {
    asSuperuser();
    withJobReport(createJob({ status: 'FAILED', lastErrorCode: null, lastErrorDetail: null }));

    renderComponent();

    expect(screen.getByText(/backCatalogueJobStatus/)).toHaveTextContent('backCatalogueJobStatus: FAILED');
    expect(screen.queryByText(/backCatalogueJobLastErrorCode/)).not.toBeInTheDocument();
    expect(screen.queryByText(/backCatalogueJobLastErrorDetail/)).not.toBeInTheDocument();
    expect(screen.queryByText(/unknown/i)).not.toBeInTheDocument();
  });

  it('shows the cancellation reason only when the API provides it', () => {
    asSuperuser();
    withJobReport(createJob({ status: 'CANCELLED', cancellationReason: 'ASSIGNMENT_DISABLED' }));

    renderComponent();

    expect(screen.getByText(/backCatalogueJobCancellationReason/)).toHaveTextContent(
      'backCatalogueJobCancellationReason: ASSIGNMENT_DISABLED',
    );
  });

  it('omits the cancellation reason when the API provides none', () => {
    asSuperuser();
    withJobReport(createJob({ status: 'CANCELLED', cancellationReason: null }));

    renderComponent();

    expect(screen.queryByText(/backCatalogueJobCancellationReason/)).not.toBeInTheDocument();
  });

  it('renders only API timestamps and gives a null completedAt no extra meaning', () => {
    asSuperuser();
    withJobReport(createJob({ completedAt: null }));

    renderComponent();

    expect(screen.getByText(/backCatalogueJobCreatedAt/)).toHaveTextContent(
      'backCatalogueJobCreatedAt: 2026-08-10T10:00:00Z',
    );
    expect(screen.getByText(/backCatalogueJobUpdatedAt/)).toHaveTextContent(
      'backCatalogueJobUpdatedAt: 2026-08-11T11:00:00Z',
    );
    expect(screen.queryByText(/backCatalogueJobCompletedAt/)).not.toBeInTheDocument();
  });

  it('renders completedAt from the API when present', () => {
    asSuperuser();
    withJobReport(createJob({ completedAt: '2026-08-12T12:00:00Z' }));

    renderComponent();

    expect(screen.getByText(/backCatalogueJobCompletedAt/)).toHaveTextContent(
      'backCatalogueJobCompletedAt: 2026-08-12T12:00:00Z',
    );
  });

  it('presents SUCCEEDED with the delivery disclaimer and no observed-delivery claim', () => {
    asSuperuser();
    withJobReport(createJob({ status: 'SUCCEEDED', completedAt: '2026-08-12T12:00:00Z' }));

    renderComponent();

    expect(screen.getByText(/backCatalogueJobStatus/)).toHaveTextContent('backCatalogueJobStatus: SUCCEEDED');
    // The staff-facing statement that durable job state is not confirmation of
    // observed remote delivery accompanies every real job presentation.
    expect(screen.getByText('backCatalogueJobDeliveryDisclaimer')).toBeInTheDocument();
    expect(screen.queryByText(/delivered|disseminated|accepted by/i)).not.toBeInTheDocument();
  });

  it("replaces publisher A's job presentation with publisher B's own query state on switch", () => {
    asSuperuser();
    // The hook resolves per publisher, as the publisher-scoped query key does:
    // A has a FAILED job; B's report is still loading.
    backCatalogueJobMock.mockImplementation((publisherId: string) =>
      publisherId === 'pub-1'
        ? {
            report: {
              configuration: { publisher: { publisherId: 'pub-1' } },
              latestBackCatalogueJob: createJob({ status: 'FAILED' }),
            },
            isLoading: false,
            error: null,
          }
        : { report: undefined, isLoading: true, error: null },
    );

    const { rerender } = renderComponent();

    expect(screen.getByText(/backCatalogueJobStatus/)).toHaveTextContent('backCatalogueJobStatus: FAILED');

    switchActivePublisherToB();
    rerenderComponent(rerender);

    // Nothing of A's job survives the switch: B renders its own (loading) query
    // state, never A's cached presentation.
    expect(backCatalogueJobMock).toHaveBeenLastCalledWith('pub-2', true);
    expect(screen.queryByText(/backCatalogueJobStatus/)).not.toBeInTheDocument();
    expect(screen.queryByText(/FAILED/)).not.toBeInTheDocument();
  });
});
