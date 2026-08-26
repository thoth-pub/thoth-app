import { ThemeProvider } from '@mui/material';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { theme } from '@/src/shared/theme';

const useChangeActivePublisherMock = vi.fn();

// The whole state seam - selection, persistence, publisher-scoped query reset,
// redirects and linked-publisher derivation - stays in the unchanged
// `useChangeActivePublisher` hook, which has its own regression suite. Stubbing
// it here keeps this file to what APP-SHELL-SU-01 actually changed: the
// presentation of the context switcher.
vi.mock('./useChangeActivePublisher', () => ({
  useChangeActivePublisher: (props: { isHidden?: boolean }) => useChangeActivePublisherMock(props),
}));
// Render translation keys verbatim so the label can be asserted by key.
vi.mock('@/src/shared/hooks/useTypedTranslation', () => ({
  default: () => ({ t: (key: string) => key }),
}));

import ChangeActivePublisher from './ChangeActivePublisher';

const PUBLISHER_OPTIONS = [
  { value: 'pub-1', label: 'Publisher One' },
  { value: 'pub-2', label: 'Publisher Two' },
];

const updateActivePublisher = vi.fn();

const stubHook = (overrides?: {
  activePublisher?: { id: string } | null;
  publishersOptions?: { value: string; label: string }[];
  hideSelector?: boolean;
}) => {
  useChangeActivePublisherMock.mockReturnValue({
    activePublisher: overrides?.activePublisher !== undefined ? overrides.activePublisher : { id: 'pub-1' },
    publishersOptions: overrides?.publishersOptions ?? PUBLISHER_OPTIONS,
    hideSelector: overrides?.hideSelector ?? false,
    updateActivePublisher,
  });
};

const renderSelector = (isHidden?: boolean) =>
  render(
    <ThemeProvider theme={theme}>
      <ChangeActivePublisher isHidden={isHidden} />
    </ThemeProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  stubHook();
});

afterEach(() => {
  cleanup();
});

describe('ChangeActivePublisher (APP-SHELL-SU-01 presentation)', () => {
  it('exposes the selector as a named publisher-context control rather than an unlabelled field', () => {
    renderSelector();

    expect(screen.getByRole('combobox', { name: 'currentPublisher' })).toBeInTheDocument();
  });

  it('shows the current publisher as the selected context', () => {
    renderSelector();

    expect(screen.getByRole('combobox', { name: 'currentPublisher' })).toHaveTextContent('Publisher One');
  });

  it('still changes context through the existing updateActivePublisher seam, with the exact publisher id', async () => {
    renderSelector();

    await userEvent.click(screen.getByRole('combobox', { name: 'currentPublisher' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Publisher Two' }));

    expect(updateActivePublisher).toHaveBeenCalledTimes(1);
    expect(updateActivePublisher).toHaveBeenCalledWith('pub-2');
  });

  it('passes the shell hidden flag straight through to the unchanged hook', () => {
    renderSelector(true);

    expect(useChangeActivePublisherMock).toHaveBeenCalledWith({ isHidden: true });
  });

  it('defaults the hidden flag to false when the shell does not set it', () => {
    renderSelector();

    expect(useChangeActivePublisherMock).toHaveBeenCalledWith({ isHidden: false });
  });

  it('stays disabled - and therefore cannot switch context - when only one publisher is available', async () => {
    stubHook({ publishersOptions: [PUBLISHER_OPTIONS[0]] });

    renderSelector();

    const selector = screen.getByRole('combobox', { name: 'currentPublisher' });

    expect(selector).toHaveAttribute('aria-disabled', 'true');

    await userEvent.click(selector);

    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    expect(updateActivePublisher).not.toHaveBeenCalled();
  });

  it('is rendered invisibly, not unmounted, while the hook asks for it to be hidden', () => {
    stubHook({ hideSelector: true });

    renderSelector(true);

    // Staying mounted is what keeps the hook's initialisation and persistence
    // behaviour running in the collapsed shell exactly as before.
    const selector = screen.getByRole('combobox', { name: 'currentPublisher' });

    expect(selector.closest('.MuiFormControl-root')).toHaveClass('opacity-0');
  });

  it('is fully visible while the hook does not ask for it to be hidden', () => {
    renderSelector();

    expect(screen.getByRole('combobox', { name: 'currentPublisher' }).closest('.MuiFormControl-root')).toHaveClass(
      'opacity-100',
    );
  });
});
