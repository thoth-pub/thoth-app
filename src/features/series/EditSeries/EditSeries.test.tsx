/* eslint-disable @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mock factories must match the real hook export names */
import { ThemeProvider } from '@mui/material';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { theme } from '@/src/shared/theme';

import EditSeries from './EditSeries';

type Option = { value: string; label: string };

const imprintOne = { value: 'imprint-1', label: 'Imprint One' };
const imprintTwo = { value: 'imprint-2', label: 'Imprint Two' };

const mocks = vi.hoisted(() => ({
  identity: {} as Record<string, unknown>,
  updateSeries: vi.fn(),
  series: {
    id: 'series-1',
    name: 'A Series',
    issnPrint: '',
    issnDigital: '',
    type: 'BOOK_SERIES',
    issues: [],
    imprintId: 'imprint-1',
    imprintName: 'Imprint One',
    url: '',
    cfpUrl: '',
    description: '',
    updatedAt: '',
  },
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
  useSeriesStateMachine: () => ({ activeEntity: { id: 'series-1' }, finishEditing: vi.fn() }),
  useSeries: () => ({ series: mocks.series, loading: false, fetching: false }),
  useUpdateSeries: () => ({ updateSeries: mocks.updateSeries }),
  EditSeriesForm: ({
    isImprintEditable,
    imprintOptions,
    onImprintChange,
  }: {
    isImprintEditable: boolean;
    imprintOptions: Option[];
    onImprintChange: (data: { imprintId: string }) => void;
  }) => (
    <div>
      <span data-testid="imprint-editable">{String(isImprintEditable)}</span>
      <span data-testid="imprint-options">{imprintOptions.map(({ label }) => label).join(',')}</span>
      <button type="button" onClick={() => onImprintChange({ imprintId: 'imprint-2' })}>
        pick-imprint-two
      </button>
    </div>
  ),
}));

vi.mock('../../work/EditWorkSeries/components/IssuesList', () => ({ IssuesList: () => null }));
vi.mock('./components/AddBookModal', () => ({ AddBookModal: () => null }));

const tree = () => (
  <ThemeProvider theme={theme}>
    <EditSeries />
  </ThemeProvider>
);

describe('EditSeries identity gate (APP-AUTH-IDENTITY-FORMS-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('offers no imprint to pick while identity is loading or expired', () => {
    mocks.identity = identity({ settled: null });
    render(tree());

    expect(screen.getByTestId('imprint-editable')).toHaveTextContent('false');
    expect(screen.getByTestId('imprint-options')).toBeEmptyDOMElement();

    fireEvent.click(screen.getByText('pick-imprint-two'));
    expect(mocks.updateSeries).not.toHaveBeenCalled();
  });

  it('offers the user imprints and updates the imprint with authoritative identity', () => {
    mocks.identity = identity({ settled: [imprintOne, imprintTwo] });
    render(tree());

    expect(screen.getByTestId('imprint-editable')).toHaveTextContent('true');
    expect(screen.getByTestId('imprint-options')).toHaveTextContent('Imprint One,Imprint Two');

    fireEvent.click(screen.getByText('pick-imprint-two'));
    expect(mocks.updateSeries).toHaveBeenCalledWith(
      expect.objectContaining({ imprintId: 'imprint-2', imprintName: 'Imprint Two' }),
    );
  });

  it('keeps the imprint options through a background refetch or token rotation', () => {
    mocks.identity = identity({ settled: [imprintOne, imprintTwo] });
    const { rerender } = render(tree());

    mocks.identity = identity({ settled: [imprintOne, imprintTwo], raw: null });
    rerender(tree());

    expect(screen.getByTestId('imprint-editable')).toHaveTextContent('true');
    expect(screen.getByTestId('imprint-options')).toHaveTextContent('Imprint One,Imprint Two');

    fireEvent.click(screen.getByText('pick-imprint-two'));
    expect(mocks.updateSeries).toHaveBeenCalledWith(expect.objectContaining({ imprintId: 'imprint-2' }));
  });
});
