/* eslint-disable @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mock factories must match the real hook export names */
import { ThemeProvider } from '@mui/material';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { theme } from '@/src/shared/theme';

import AddSet from './AddSet';

type Option = { value: string; label: string };

const imprintOne = { value: 'imprint-1', label: 'Imprint One' };
const imprintTwo = { value: 'imprint-2', label: 'Imprint Two' };

const mocks = vi.hoisted(() => ({
  identity: {} as Record<string, unknown>,
  activeSet: null as Record<string, unknown> | null,
  createSet: vi.fn(),
  finishEditing: vi.fn(),
}));

/** `useUser` as a form sees it: the raw fields, and the settled identity latched from authoritative `me`. */
const identity = ({ settled, raw = settled }: { settled: Option[] | null; raw?: Option[] | null }) => ({
  userImprintsOptions: raw ?? [],
  isAuthoritative: raw !== null,
  identitySettled: settled !== null,
  settledImprintsOptions: settled ?? [],
});

const title = { id: 'title-1', title: 'A Set', subtitle: '', localeCode: 'EN', canonical: true, fullTitle: 'A Set' };

vi.mock('@/src/entities/user', () => ({ useUser: () => mocks.identity }));

vi.mock('@/src/entities/publisher', () => ({
  useActivePublisherPermissions: () => ({ isImprintEditable: true }),
}));

vi.mock('@/src/entities/sets', () => ({
  useCreateSet: () => ({ createSet: mocks.createSet }),
}));

vi.mock('@/src/entities/sets/store/set.store', () => ({
  useSetStateMachine: () => ({
    activeEntity: mocks.activeSet,
    edit: (set: Record<string, unknown>) => {
      mocks.activeSet = set;
    },
    finishEditing: mocks.finishEditing,
  }),
}));

vi.mock('@/src/entities/sets/ui/AddNewSetForm/AddNewSetForm', () => ({
  AddNewSetForm: ({
    set,
    imprintOptions,
    onUpdateImprint,
    onUpdateTitles,
  }: {
    set: { imprintId: string };
    imprintOptions: Option[];
    onUpdateImprint: (imprintId: string) => void;
    onUpdateTitles: (titles: (typeof title)[]) => void;
  }) => (
    <div data-testid="add-new-set-form">
      <span data-testid="set-imprint">{set.imprintId}</span>
      <span data-testid="imprint-options">{imprintOptions.map(({ label }) => label).join(',')}</span>
      <button type="button" onClick={() => onUpdateImprint('imprint-2')}>
        pick-imprint-two
      </button>
      <button type="button" onClick={() => onUpdateTitles([title])}>
        set-title
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

const tree = () => (
  <ThemeProvider theme={theme}>
    <AddSet />
  </ThemeProvider>
);

const openNewSet = () => fireEvent.click(screen.getByTestId('AddIcon'));
const submitButton = () => screen.getByTestId('CheckIcon').closest('button') as HTMLButtonElement;

describe('AddSet identity gate (APP-AUTH-IDENTITY-FORMS-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.activeSet = null;
  });

  it('applies no default imprint and cannot be submitted while identity is loading or expired', () => {
    mocks.identity = identity({ settled: null });
    render(tree());

    openNewSet();

    expect(mocks.activeSet).toMatchObject({ imprintId: '' });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('add-new-set-form')).not.toBeInTheDocument();
    expect(submitButton()).toBeDisabled();

    fireEvent.click(submitButton());
    expect(mocks.createSet).not.toHaveBeenCalled();
  });

  it('defaults to the first imprint and submits it with authoritative identity', () => {
    mocks.identity = identity({ settled: [imprintOne, imprintTwo] });
    render(tree());

    openNewSet();
    expect(screen.getByTestId('set-imprint')).toHaveTextContent('imprint-1');

    fireEvent.click(screen.getByText('set-title'));
    fireEvent.click(submitButton());

    expect(mocks.createSet).toHaveBeenCalledWith({
      data: expect.objectContaining({ imprintId: 'imprint-1', titles: [title] }),
    });
  });

  it('applies the default imprint once identity settles for a form opened while it loaded', () => {
    mocks.identity = identity({ settled: null });
    const { rerender } = render(tree());
    openNewSet();

    mocks.identity = identity({ settled: [imprintOne, imprintTwo] });
    rerender(tree());

    expect(screen.getByTestId('set-imprint')).toHaveTextContent('imprint-1');
  });

  it('keeps a form in progress through a background refetch or token rotation', () => {
    mocks.identity = identity({ settled: [imprintOne, imprintTwo] });
    const { rerender } = render(tree());
    openNewSet();
    fireEvent.click(screen.getByText('pick-imprint-two'));
    fireEvent.click(screen.getByText('set-title'));

    mocks.identity = identity({ settled: [imprintOne, imprintTwo], raw: null });
    rerender(tree());

    expect(screen.getByTestId('set-imprint')).toHaveTextContent('imprint-2');
    expect(screen.getByTestId('imprint-options')).toHaveTextContent('Imprint One,Imprint Two');

    fireEvent.click(submitButton());
    expect(mocks.createSet).toHaveBeenCalledWith({
      data: expect.objectContaining({ imprintId: 'imprint-2', titles: [title] }),
    });
  });
});
