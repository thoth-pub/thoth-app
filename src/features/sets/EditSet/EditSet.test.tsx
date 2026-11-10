/* eslint-disable @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mock factories must match the real hook export names */
import { ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { theme } from '@/src/shared/theme';

import EditSet from './EditSet';

type Option = { value: string; label: string };

const imprintOne = { value: 'imprint-1', label: 'Imprint One' };
const imprintTwo = { value: 'imprint-2', label: 'Imprint Two' };

const mocks = vi.hoisted(() => ({
  identity: {} as Record<string, unknown>,
  updateSet: vi.fn(),
  set: {
    id: 'set-1',
    titles: [{ id: 'title-1', title: 'A Set', subtitle: '', localeCode: 'EN', canonical: true, fullTitle: 'A Set' }],
    type: 'BOOK_SET',
    updatedAt: '',
    imprintId: 'imprint-1',
    status: 'FORTHCOMING',
    edition: 1,
    volumesCount: 0,
    covers: [],
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

vi.mock('@/src/entities/sets', () => ({
  EditSetTitle: () => null,
  useUpdateSet: () => ({ updateSet: mocks.updateSet }),
}));
vi.mock('@/src/entities/sets/api/hooks/useSet', () => ({ default: () => ({ set: mocks.set }) }));
vi.mock('@/src/entities/sets/store/set.store', () => ({ useSetStateMachine: () => ({ finishEditing: vi.fn() }) }));
vi.mock('@/src/entities/title', () => ({
  useCreateTitle: () => ({ createTitle: vi.fn() }),
  useUpdateTitle: () => ({ updateTitle: vi.fn() }),
  useDeleteTitle: () => ({ deleteTitle: vi.fn() }),
}));
vi.mock('@/src/entities/sets/ui/EditSetImprint/EditSetImprint', () => ({
  default: ({
    disabled,
    imprintOptions,
    onSubmit,
  }: {
    disabled: boolean;
    imprintOptions: Option[];
    onSubmit: (imprintId: string) => void;
  }) => (
    <div>
      <span data-testid="imprint-disabled">{String(disabled)}</span>
      <span data-testid="imprint-options">{imprintOptions.map(({ label }) => label).join(',')}</span>
      <button type="button" onClick={() => onSubmit('imprint-2')}>
        pick-imprint-two
      </button>
    </div>
  ),
}));
vi.mock('./components/SetBooksList', () => ({ SetBooksList: () => null }));

const queryClient = new QueryClient();

const tree = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider theme={theme}>
      <EditSet setId="set-1" isImprintEditable />
    </ThemeProvider>
  </QueryClientProvider>
);

describe('EditSet identity gate (APP-AUTH-IDENTITY-FORMS-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('offers no imprint to pick while identity is loading or expired', () => {
    mocks.identity = identity({ settled: null });
    render(tree());

    expect(screen.getByTestId('imprint-disabled')).toHaveTextContent('true');
    expect(screen.getByTestId('imprint-options')).toBeEmptyDOMElement();
  });

  it('offers the user imprints with authoritative identity', () => {
    mocks.identity = identity({ settled: [imprintOne, imprintTwo] });
    render(tree());

    expect(screen.getByTestId('imprint-disabled')).toHaveTextContent('false');
    expect(screen.getByTestId('imprint-options')).toHaveTextContent('Imprint One,Imprint Two');

    fireEvent.click(screen.getByText('pick-imprint-two'));
    expect(mocks.updateSet).toHaveBeenCalledWith(expect.objectContaining({ imprintId: 'imprint-2' }));
  });

  it('keeps the imprint options through a background refetch or token rotation', () => {
    mocks.identity = identity({ settled: [imprintOne, imprintTwo] });
    const { rerender } = render(tree());

    mocks.identity = identity({ settled: [imprintOne, imprintTwo], raw: null });
    rerender(tree());

    expect(screen.getByTestId('imprint-disabled')).toHaveTextContent('false');
    expect(screen.getByTestId('imprint-options')).toHaveTextContent('Imprint One,Imprint Two');
  });
});
