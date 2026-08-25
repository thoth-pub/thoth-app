import { ThemeProvider } from '@mui/material';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DistributionJobStatus, DistributionPlatform, ThothPackage } from '@/gql/graphql';
import { theme } from '@/src/shared/theme';

// Render translation keys verbatim so label/handler assertions are deterministic.
vi.mock('@/src/shared/hooks/useTypedTranslation', () => ({
  default: () => ({ t: (key: string) => key }),
}));
// APP-SHELL-SU-01: the relocated Add Publisher action is the existing
// `AddNewPublisher` component, rendered for real here. Only its existing
// `useAddNewPublisher` seam is stubbed - the same seam the component already
// owned - so this file proves the header reuses that component and delegates to
// that hook, without reaching for a query client, the publisher state machine or
// any duplicated creation logic.
const openModalMock = vi.fn();
const useAddNewPublisherMock = vi.fn(() => ({
  isOpen: false,
  control: {},
  submitDisabled: false,
  openModal: openModalMock,
  closeModal: vi.fn(),
  createNewPublisher: vi.fn(),
  handleSubmit: vi.fn(() => vi.fn()),
}));
vi.mock('@/src/entities/publisher/ui/AddNewPublisher/useAddNewPublisher', () => ({
  useAddNewPublisher: () => useAddNewPublisherMock(),
}));

import PublisherAdministrationHeader from './PublisherAdministrationHeader';

type HeaderProps = ComponentProps<typeof PublisherAdministrationHeader>;

const DISPLAY_LABELS: Partial<Record<DistributionPlatform, string>> = {
  [DistributionPlatform.Oapen]: 'OAPEN Library',
  [DistributionPlatform.Doab]: 'Directory of Open Access Books',
};

const createProps = (overrides?: Partial<HeaderProps>): HeaderProps => ({
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
  publisherFilterOptions: [
    { id: 'pub-1', name: 'Publisher One' },
    { id: 'pub-2', name: 'Publisher Two' },
  ],
  packageFilterOptions: [ThothPackage.Oasis, ThothPackage.Sphinx],
  platformFilterOptions: [DistributionPlatform.Oapen, DistributionPlatform.Doab],
  jobStatusFilterOptions: [DistributionJobStatus.Pending, DistributionJobStatus.Failed],
  getPlatformDisplayLabel: (platform: DistributionPlatform) => DISPLAY_LABELS[platform] ?? platform,
  ...overrides,
});

const renderHeader = (overrides?: Partial<HeaderProps>): HeaderProps => {
  const props = createProps(overrides);
  render(
    <ThemeProvider theme={theme}>
      <PublisherAdministrationHeader {...props} />
    </ThemeProvider>,
  );
  return props;
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('PublisherAdministrationHeader (APP-02C local multi-select correction)', () => {
  it('renders every filter control', () => {
    renderHeader();

    expect(screen.getByRole('combobox', { name: 'filterPublisher' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'filterPackages' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'filterEnabledPlatforms' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'filterJobStatuses' })).toBeInTheDocument();
    expect(screen.getByLabelText('filterJobPresence')).toBeInTheDocument();
  });

  it('keeps multiple selected values readable as chips within the field', () => {
    renderHeader({ selectedPublisherIds: ['pub-1', 'pub-2'] });

    // Both selected publishers are shown; nothing is dropped or hidden.
    expect(screen.getByText('Publisher One')).toBeInTheDocument();
    expect(screen.getByText('Publisher Two')).toBeInTheDocument();
  });

  it('still maps a multi-select choice to the exact backend value (semantics unchanged)', async () => {
    const { changeSelectedPackages } = renderHeader();

    await userEvent.click(screen.getByRole('combobox', { name: 'filterPackages' }));
    await userEvent.click(await screen.findByRole('option', { name: ThothPackage.Sphinx }));

    expect(changeSelectedPackages).toHaveBeenCalledWith([ThothPackage.Sphinx]);
  });

  it('still maps an enabled-platform choice through its display label to its exact enum value', async () => {
    const { changeSelectedPlatforms } = renderHeader();

    await userEvent.click(screen.getByRole('combobox', { name: 'filterEnabledPlatforms' }));
    await userEvent.click(await screen.findByRole('option', { name: 'OAPEN Library' }));

    // The label is display-only; the value passed through is the exact enum.
    expect(changeSelectedPlatforms).toHaveBeenCalledWith([DistributionPlatform.Oapen]);
  });

  it('still maps the job-presence control to its exact tri-state value', async () => {
    const { changeJobPresence } = renderHeader();

    await userEvent.selectOptions(screen.getByLabelText('filterJobPresence'), 'withoutJob');

    expect(changeJobPresence).toHaveBeenCalledWith('withoutJob');
  });
});

// APP-SHELL-SU-01: Add Publisher left the application shell and became this
// staff surface's primary action.
describe('PublisherAdministrationHeader Add Publisher action (APP-SHELL-SU-01)', () => {
  it('presents Add Publisher as a button in the title/action row', () => {
    renderHeader();

    const action = screen.getByRole('button', { name: /actions\.addPublisher/ });
    const title = screen.getByRole('heading', { name: 'title' });

    expect(action).toBeInTheDocument();
    // Same row as the page title, not appended somewhere below the filters.
    expect(title.parentElement?.contains(action)).toBe(true);
  });

  it('reuses the existing AddNewPublisher component and its creation hook', () => {
    renderHeader();

    // The hook the existing component already owned is the only creation seam
    // consulted; the header adds none of its own.
    expect(useAddNewPublisherMock).toHaveBeenCalled();
    expect(screen.getByTestId('PersonAddIcon')).toBeInTheDocument();
  });

  it('delegates activation to the existing hook rather than re-implementing it', async () => {
    renderHeader();

    await userEvent.click(screen.getByRole('button', { name: /actions\.addPublisher/ }));

    expect(openModalMock).toHaveBeenCalledTimes(1);
  });

  it('leaves every filter control untouched by the added action', () => {
    renderHeader();

    expect(screen.getByRole('combobox', { name: 'filterPublisher' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'filterPackages' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'filterEnabledPlatforms' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'filterJobStatuses' })).toBeInTheDocument();
    expect(screen.getByLabelText('filterJobPresence')).toBeInTheDocument();
  });
});
