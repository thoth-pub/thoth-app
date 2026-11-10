/* eslint-disable @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mock factories must match the real hook export names */
import { ThemeProvider } from '@mui/material';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { theme } from '@/src/shared/theme';

import CreateWorkForm from './CreateWorkForm';

const imprint = (id: string, name: string, defaultLocale: string, defaultPlace: string) => ({
  id,
  name,
  defaultLocale,
  defaultPlace,
  defaultCurrency: 'GBP',
});

const imprintOne = imprint('imprint-1', 'Imprint One', 'FR', 'Paris');
const imprintTwo = imprint('imprint-2', 'Imprint Two', 'DE', 'Berlin');

const mocks = vi.hoisted(() => ({
  identity: {} as Record<string, unknown>,
  createWork: vi.fn(),
}));

/**
 * `useUser` as the form and the default hooks see it: the raw fields, and the settled identity latched from
 * authoritative `me`. The real `useDefaultLocaleOption` and `useDefaultPlace` read the settled imprints.
 */
const identity = ({
  settled,
  raw = settled,
}: {
  settled: (typeof imprintOne)[] | null;
  raw?: (typeof imprintOne)[] | null;
}) => ({
  userImprints: raw ?? [],
  userImprintsOptions: (raw ?? []).map(({ id, name }) => ({ value: id, label: name })),
  isAuthoritative: raw !== null,
  identitySettled: settled !== null,
  settledImprints: settled ?? [],
  settledImprintsOptions: (settled ?? []).map(({ id, name }) => ({ value: id, label: name })),
});

vi.mock('@/src/entities/user', () => ({ useUser: () => mocks.identity }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock('../../api/hooks/useCreateWork', () => ({
  default: () => ({ createWork: mocks.createWork, loading: false }),
}));

const tree = () => (
  <ThemeProvider theme={theme}>
    <CreateWorkForm />
  </ThemeProvider>
);

const createButton = () => screen.getByRole('button', { name: /actions\.create|create/i });
const form = () => document.getElementById('create-work') as HTMLFormElement;
const fieldValue = (name: string) => (form().querySelector(`input[name="${name}"]`) as HTMLInputElement).value;

const typeTitle = (value: string) => {
  const title = form().querySelector('input[name="title"]') as HTMLInputElement;
  fireEvent.change(title, { target: { value } });
};

const pickImprint = async (label: string) => {
  const imprintField = form().querySelector('input[name="imprintId"]')?.parentElement as HTMLElement;
  fireEvent.mouseDown(within(imprintField).getByRole('combobox'));
  fireEvent.click(await screen.findByRole('option', { name: label }));
};

describe('CreateWorkForm identity gate (APP-AUTH-IDENTITY-FORMS-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies no identity default and cannot be submitted while identity is loading or expired', async () => {
    mocks.identity = identity({ settled: null });
    render(tree());

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(form()).not.toBeVisible();
    expect(fieldValue('imprintId')).toBe('');

    typeTitle('A Work');

    await waitFor(() => expect(createButton()).toBeDisabled());

    await act(async () => {
      fireEvent.submit(form());
    });

    expect(mocks.createWork).not.toHaveBeenCalled();
  });

  it('applies the imprint defaults and submits them with authoritative identity', async () => {
    mocks.identity = identity({ settled: [imprintOne, imprintTwo] });
    render(tree());

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    await waitFor(() => expect(fieldValue('imprintId')).toBe('imprint-1'));
    expect(fieldValue('titleLanguage')).toBe('FR');

    typeTitle('A Work');
    await waitFor(() => expect(createButton()).toBeEnabled());

    await act(async () => {
      fireEvent.submit(form());
    });

    expect(mocks.createWork).toHaveBeenCalledWith(
      expect.objectContaining({
        imprintId: 'imprint-1',
        place: 'Paris',
        titles: [expect.objectContaining({ title: 'A Work', localeCode: 'FR' })],
      }),
    );
  });

  it('applies the imprint defaults once identity settles for a form mounted while it loaded', async () => {
    mocks.identity = identity({ settled: null });
    const { rerender } = render(tree());

    mocks.identity = identity({ settled: [imprintOne, imprintTwo] });
    rerender(tree());

    await waitFor(() => expect(fieldValue('imprintId')).toBe('imprint-1'));
    expect(fieldValue('titleLanguage')).toBe('FR');
    expect(form()).toBeVisible();
  });

  it('cannot be submitted once identity is lost, as when the session expires', async () => {
    mocks.identity = identity({ settled: [imprintOne, imprintTwo] });
    const { rerender } = render(tree());
    await waitFor(() => expect(fieldValue('imprintId')).toBe('imprint-1'));
    typeTitle('A Work');

    mocks.identity = identity({ settled: null });
    rerender(tree());

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    await waitFor(() => expect(createButton()).toBeDisabled());

    await act(async () => {
      fireEvent.submit(form());
    });

    expect(mocks.createWork).not.toHaveBeenCalled();
  });

  it('keeps a form in progress through a background refetch or token rotation', async () => {
    mocks.identity = identity({ settled: [imprintOne, imprintTwo] });
    const { rerender } = render(tree());
    await waitFor(() => expect(fieldValue('imprintId')).toBe('imprint-1'));

    typeTitle('A Work');
    await pickImprint('Imprint Two');
    await waitFor(() => expect(fieldValue('titleLanguage')).toBe('DE'));

    // A rotation: the raw identity is empty until the new `me` settles, the latched one is kept.
    mocks.identity = identity({ settled: [imprintOne, imprintTwo], raw: null });
    rerender(tree());

    expect(fieldValue('imprintId')).toBe('imprint-2');
    expect(fieldValue('titleLanguage')).toBe('DE');
    expect(form()).toBeVisible();

    await waitFor(() => expect(createButton()).toBeEnabled());
    await act(async () => {
      fireEvent.submit(form());
    });

    expect(mocks.createWork).toHaveBeenCalledWith(
      expect.objectContaining({ imprintId: 'imprint-2', place: 'Berlin' }),
    );
  });
});
