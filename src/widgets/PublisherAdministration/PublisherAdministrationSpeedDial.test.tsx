import { ThemeProvider } from '@mui/material';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { theme } from '@/src/shared/theme';

// Render translation keys verbatim so the action label can be asserted by key.
vi.mock('@/src/shared/hooks/useTypedTranslation', () => ({
  default: () => ({ t: (key: string) => key }),
}));
// The real AddNewPublisher component renders here; only the creation seam it
// already owned is stubbed. That is what proves this speed dial delegates to
// the existing flow instead of carrying one of its own.
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

import PublisherAdministrationSpeedDial from './PublisherAdministrationSpeedDial';

const renderSpeedDial = () =>
  render(
    <ThemeProvider theme={theme}>
      <PublisherAdministrationSpeedDial />
    </ThemeProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

// APP-SHELL-SU-02: /admin/publishers gets the same fixed speed-dial affordance
// already established on /admin/works, narrowed to this surface's single
// publisher action.
describe('PublisherAdministrationSpeedDial', () => {
  it('offers exactly one action', () => {
    renderSpeedDial();

    expect(screen.getAllByRole('menuitem')).toHaveLength(1);
  });

  it('names that action Add Publisher, for assistive technology and as its tooltip', () => {
    renderSpeedDial();

    const action = screen.getByRole('menuitem');

    expect(action).toHaveAccessibleName('actions.addPublisher');
    // The established convention renders the label as a persistent static
    // tooltip beside the action.
    expect(screen.getByText('actions.addPublisher')).toBeInTheDocument();
    expect(screen.getByTestId('PersonAddIcon')).toBeInTheDocument();
  });

  it('gives the dial its own accessible name and the established fixed bottom-right placement', () => {
    renderSpeedDial();

    const dial = screen.getByRole('button', { name: 'Publishers SpeedDial' });
    const root = dial.parentElement;

    expect(root).not.toBeNull();

    const styles = window.getComputedStyle(root as HTMLElement);

    expect(styles.position).toBe('fixed');
    expect(styles.bottom).toBe('60px');
    expect(styles.right).toBe('40px');
  });

  it('delegates activation to the existing AddNewPublisher creation flow', async () => {
    renderSpeedDial();

    // Same sequence a user performs: open the dial, then activate its action.
    await userEvent.hover(screen.getByRole('button', { name: 'Publishers SpeedDial' }));
    await userEvent.click(screen.getByRole('menuitem'));

    expect(useAddNewPublisherMock).toHaveBeenCalled();
    expect(openModalMock).toHaveBeenCalledTimes(1);
  });

  it('duplicates no creation logic: the modal stays owned by AddNewPublisher', () => {
    renderSpeedDial();

    // Nothing else renders a second Add Publisher button, form or modal.
    expect(screen.queryByRole('button', { name: /actions\.addPublisher/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
    expect(useAddNewPublisherMock).toHaveBeenCalledTimes(1);
  });
});
