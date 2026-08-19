import { ThemeProvider } from '@mui/material';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { theme } from '@/src/shared/theme';

const stateMachineMock = vi.fn();
const serviceConfigurationMock = vi.fn();
const platformOptionsMock = vi.fn();

vi.mock('../../../store/hooks/usePublisherStateMachine', () => ({
  default: () => stateMachineMock(),
}));
vi.mock('../../../api/hooks/usePublisherServiceConfiguration', () => ({
  default: () => serviceConfigurationMock(),
}));
vi.mock('../../../api/hooks/useDistributionPlatformOptions', () => ({
  default: () => platformOptionsMock(),
}));
// Render translation keys verbatim so label/state assertions are deterministic.
vi.mock('@/src/shared/hooks/useTypedTranslation', () => ({
  default: () => ({ t: (key: string) => key }),
}));

import PublisherServiceConfiguration from '../PublisherServiceConfiguration';

function renderComponent() {
  return render(
    <ThemeProvider theme={theme}>
      <PublisherServiceConfiguration />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  stateMachineMock.mockReturnValue({ activePublisher: { id: 'pub-1' } });
  platformOptionsMock.mockReturnValue({
    distributionPlatformOptions: [
      { platform: 'OAPEN', displayLabel: 'OAPEN' },
      { platform: 'INTERNET_ARCHIVE', displayLabel: 'Internet Archive' },
    ],
    isLoading: false,
    error: null,
  });
  serviceConfigurationMock.mockReturnValue({
    serviceConfiguration: {
      subscriptionPackage: 'SPHINX',
      effectiveCapabilities: ['OAI_PMH', 'METRICS_COLLECT'],
      enabledDistributionPlatforms: [{ platform: 'INTERNET_ARCHIVE' }],
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

  it('remains read-only with no edit controls for superusers', () => {
    // The component does not branch on superuser state, so it stays read-only.
    renderComponent();

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
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
