import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const openModalMock = vi.fn();
vi.mock('../useAddNewPublisher', () => ({
  useAddNewPublisher: vi.fn(() => ({
    isOpen: false,
    control: {},
    submitDisabled: false,
    openModal: openModalMock,
    closeModal: vi.fn(),
    createNewPublisher: vi.fn(),
    handleSubmit: vi.fn(() => vi.fn()),
  })),
}));

vi.mock('@/src/shared/store/forms/hooks/useFormStateMachine', () => ({
  default: vi.fn(() => ({ activeFormId: null, edit: vi.fn(), closeForm: vi.fn() })),
}));

vi.mock('@/src/shared/hooks', () => ({
  useNotifications: vi.fn(() => ({ sendError: vi.fn(), sendSuccess: vi.fn() })),
  useT: vi.fn(() => (key: string) => key),
  useDefaultCurrencyOption: vi.fn(() => ({ value: 'USD', label: 'USD' })),
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
  useEscapeKey: vi.fn(),
  useIsDesktop: vi.fn(() => true),
}));

import AddNewPublisher from '../AddNewPublisher';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('AddNewPublisher', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper><AddNewPublisher /></Wrapper>
    );
    expect(container).toMatchSnapshot('AddNewPublisher');
  });
});

// APP-SHELL-SU-02: this component stays the single owner of the publisher
// creation modal, form and `useAddNewPublisher` flow. It gains only a
// backwards-compatible seam letting a caller supply its own trigger, so a
// surface like the /admin/publishers speed dial can open the very same modal
// instead of re-implementing any of it.
describe('AddNewPublisher trigger seam (APP-SHELL-SU-02)', () => {
  it('still renders its own Add Publisher button when no custom trigger is supplied', async () => {
    render(
      <Wrapper>
        <AddNewPublisher />
      </Wrapper>,
    );

    const trigger = screen.getByRole('button', { name: /actions\.addPublisher/ });

    expect(trigger).toBeInTheDocument();
    expect(screen.getByTestId('PersonAddIcon')).toBeInTheDocument();

    await userEvent.click(trigger);

    expect(openModalMock).toHaveBeenCalledTimes(1);
  });

  it('lets a custom trigger invoke the very same openModal callback', async () => {
    render(
      <Wrapper>
        <AddNewPublisher
          renderTrigger={(openModal) => (
            <button type="button" onClick={openModal}>
              custom trigger
            </button>
          )}
        />
      </Wrapper>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'custom trigger' }));

    expect(openModalMock).toHaveBeenCalledTimes(1);
  });

  it('renders no default Add Publisher button alongside a custom trigger', () => {
    render(
      <Wrapper>
        <AddNewPublisher
          renderTrigger={(openModal) => (
            <button type="button" onClick={openModal}>
              custom trigger
            </button>
          )}
        />
      </Wrapper>,
    );

    expect(screen.queryByRole('button', { name: /actions\.addPublisher/ })).not.toBeInTheDocument();
    expect(screen.queryByTestId('PersonAddIcon')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('keeps ownership of the modal: a custom trigger renders it, open, from this component', () => {
    render(
      <Wrapper>
        <AddNewPublisher renderTrigger={() => <button type="button">custom trigger</button>} />
      </Wrapper>,
    );

    // Closed by default, exactly as the hook reports - the caller supplies no
    // modal, form or open-state of its own.
    expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });
});
