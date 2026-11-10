/* eslint-disable @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mock factories must match the real hook export names */
import { ThemeProvider } from '@mui/material';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { theme } from '@/src/shared/theme';

import AddSeries from './AddSeries';

type Option = { value: string; label: string };

const imprintOne = { value: 'imprint-1', label: 'Imprint One' };
const imprintTwo = { value: 'imprint-2', label: 'Imprint Two' };

const mocks = vi.hoisted(() => ({
  identity: {} as Record<string, unknown>,
  activeSeries: null as Record<string, unknown> | null,
  createSeries: vi.fn(),
  finishEditing: vi.fn(),
}));

/** `useUser` as a form sees it: the raw fields, and the settled identity latched from authoritative `me`. */
const identity = ({ settled, raw = settled }: { settled: Option[] | null; raw?: Option[] | null }) => ({
  userImprintsOptions: raw ?? [],
  isAuthoritative: raw !== null,
  identitySettled: settled !== null,
  settledImprintsOptions: settled ?? [],
});

vi.mock('@/src/entities/user', () => ({ useUser: () => mocks.identity }));

vi.mock('@/src/entities/publisher', () => ({
  useActivePublisherPermissions: () => ({ isImprintEditable: true }),
}));

vi.mock('@/src/entities/series', () => ({
  useSeriesStateMachine: () => ({
    activeEntity: mocks.activeSeries,
    edit: (series: Record<string, unknown>) => {
      mocks.activeSeries = series;
    },
    finishEditing: mocks.finishEditing,
  }),
  useCreateSeries: () => ({ createSeries: mocks.createSeries }),
  EditSeriesForm: ({
    imprint,
    imprintOptions,
    onImprintChange,
    onNameChange,
  }: {
    imprint: string;
    imprintOptions: Option[];
    onImprintChange: (data: { imprintId: string }) => void;
    onNameChange: (data: { seriesName: string }) => void;
  }) => (
    <div data-testid="edit-series-form">
      <span data-testid="series-imprint">{imprint}</span>
      <span data-testid="imprint-options">{imprintOptions.map(({ label }) => label).join(',')}</span>
      <button type="button" onClick={() => onImprintChange({ imprintId: 'imprint-2' })}>
        pick-imprint-two
      </button>
      <button type="button" onClick={() => onNameChange({ seriesName: 'My Series' })}>
        set-name
      </button>
    </div>
  ),
}));

vi.mock('@/src/shared/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/shared/ui')>()),
  // The speed dial only hides its actions until hovered; render the "New" action directly.
  SpeedDial: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SpeedDialActions: ({ icon }: { icon: React.ReactNode }) => <div>{icon}</div>,
}));

const renderAddSeries = () =>
  render(
    <ThemeProvider theme={theme}>
      <AddSeries />
    </ThemeProvider>,
  );

const openNewSeries = () => fireEvent.click(screen.getByTestId('AddIcon'));
const submitButton = () => screen.getByTestId('CheckIcon').closest('button') as HTMLButtonElement;

describe('AddSeries identity gate (APP-AUTH-IDENTITY-FORMS-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.activeSeries = null;
  });

  it('applies no default imprint and cannot be submitted while identity is loading or expired', () => {
    mocks.identity = identity({ settled: null });
    renderAddSeries();

    openNewSeries();

    expect(mocks.activeSeries).toMatchObject({ imprintId: '', imprintName: '' });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('edit-series-form')).not.toBeInTheDocument();
    expect(submitButton()).toBeDisabled();

    fireEvent.click(submitButton());
    expect(mocks.createSeries).not.toHaveBeenCalled();
  });

  it('defaults to the first imprint and submits it with authoritative identity', () => {
    mocks.identity = identity({ settled: [imprintOne, imprintTwo] });
    renderAddSeries();

    openNewSeries();

    expect(screen.getByTestId('series-imprint')).toHaveTextContent('Imprint One');
    expect(submitButton()).toBeEnabled();

    fireEvent.click(screen.getByText('set-name'));
    fireEvent.click(submitButton());

    expect(mocks.createSeries).toHaveBeenCalledWith(expect.objectContaining({ name: 'My Series', imprintId: 'imprint-1' }));
  });

  it('applies the default imprint once identity settles for a form opened while it loaded', () => {
    mocks.identity = identity({ settled: null });
    const { rerender } = renderAddSeries();
    openNewSeries();

    mocks.identity = identity({ settled: [imprintOne, imprintTwo] });
    rerender(
      <ThemeProvider theme={theme}>
        <AddSeries />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('series-imprint')).toHaveTextContent('Imprint One');

    fireEvent.click(submitButton());
    expect(mocks.createSeries).toHaveBeenCalledWith(expect.objectContaining({ imprintId: 'imprint-1' }));
  });

  it('keeps a form in progress through a background refetch or token rotation', () => {
    mocks.identity = identity({ settled: [imprintOne, imprintTwo] });
    const { rerender } = renderAddSeries();
    openNewSeries();
    fireEvent.click(screen.getByText('pick-imprint-two'));
    fireEvent.click(screen.getByText('set-name'));

    // A rotation: the raw identity is empty until the new `me` settles, the latched one is kept.
    mocks.identity = identity({ settled: [imprintOne, imprintTwo], raw: null });
    rerender(
      <ThemeProvider theme={theme}>
        <AddSeries />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('series-imprint')).toHaveTextContent('Imprint Two');
    expect(screen.getByTestId('imprint-options')).toHaveTextContent('Imprint One,Imprint Two');

    fireEvent.click(submitButton());
    expect(mocks.createSeries).toHaveBeenCalledWith(expect.objectContaining({ name: 'My Series', imprintId: 'imprint-2' }));
  });
});
