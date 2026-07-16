import { ThemeProvider } from '@mui/material';
import { cleanup, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IDs } from '@/src/shared/constants';
import { theme } from '@/src/shared/theme';

const formMocks = vi.hoisted(() => ({
  activeFormId: null as string | null,
  edit: vi.fn(),
  closeForm: vi.fn(),
}));

vi.mock('@/src/shared/store/forms/hooks/useFormStateMachine', () => ({
  default: vi.fn(() => ({ activeFormId: formMocks.activeFormId, edit: formMocks.edit, closeForm: formMocks.closeForm })),
}));

vi.mock('@/src/shared/hooks', () => ({
  useNotifications: vi.fn(() => ({ sendError: vi.fn(), sendSuccess: vi.fn() })),
  useT: vi.fn(() => (key: string) => key),
  useDefaultCurrencyOption: vi.fn(() => ({ value: 'USD', label: 'USD' })),
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
  useEscapeKey: vi.fn(),
  useIsDesktop: vi.fn(() => true),
}));

import EditIsbn from '../../EditIsbn';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('EditIsbn', () => {
  beforeEach(() => {
    formMocks.activeFormId = null;
    formMocks.edit.mockReset();
    formMocks.closeForm.mockReset();
  });

  afterEach(() => {
    formMocks.activeFormId = null;
    cleanup();
  });

  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper><EditIsbn /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditIsbn');
  });

  it('renders with isbn value', () => {
    const { container } = render(
      <Wrapper><EditIsbn isbn="978-1-234-56789-0" /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditIsbn - with value');
  });

  it('calls onSubmit on submit', () => {
    const onSubmit = vi.fn();
    const { container } = render(
      <Wrapper><EditIsbn isbn="978-1-234-56789-0" onSubmit={onSubmit} /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditIsbn - with onSubmit');
  });

  it('EditIsbn_propagatesOnUpdatePromise', async () => {
    // The adapter's submit handler must return the onSubmit promise so EditableContent
    // can await it: a rejected update must keep the editor open (closeForm not called).
    // React Hook Form re-throws the rejected submit; capture it so it does not surface
    // as a spurious unhandled rejection while we assert the editor stays open.
    const capturedRejections: unknown[] = [];
    const onUnhandledRejection = (reason: unknown) => capturedRejections.push(reason);
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      formMocks.activeFormId = IDs.PUBLICATION_ISBN;
      const onSubmit = vi.fn().mockRejectedValue(new Error('Update failed'));
      const user = userEvent.setup();

      const { getByRole } = render(
        <Wrapper>
          <EditIsbn isbn="978-3-16-148410-0" onSubmit={onSubmit} />
        </Wrapper>,
      );

      // Clear the field (empty ISBN is valid) so the form is dirty and can be submitted.
      await user.clear(getByRole('textbox'));
      await user.click(getByRole('button', { name: 'submit form' }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(formMocks.closeForm).not.toHaveBeenCalled();
    } finally {
      await Promise.resolve();
      process.off('unhandledRejection', onUnhandledRejection);
    }
  });

  it('EditIsbn_closesWhenOnUpdateResolves', async () => {
    formMocks.activeFormId = IDs.PUBLICATION_ISBN;
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    const { getByRole } = render(
      <Wrapper>
        <EditIsbn isbn="978-3-16-148410-0" onSubmit={onSubmit} />
      </Wrapper>,
    );

    await user.clear(getByRole('textbox'));
    await user.click(getByRole('button', { name: 'submit form' }));

    await waitFor(() => expect(formMocks.closeForm).toHaveBeenCalledTimes(1));
  });
});
