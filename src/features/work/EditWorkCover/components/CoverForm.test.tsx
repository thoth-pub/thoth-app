/* eslint-disable @eslint-react/hooks-extra/no-unnecessary-use-prefix */
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NOTIFICATIONS } from '@/src/shared/constants';

import { CoverForm } from './CoverForm';

const mocks = vi.hoisted(() => ({
  work: {
    id: 'work-1',
    doi: '10.1234/test',
    coverUrl: 'https://example.com/cover.jpg',
  },
  updateWork: vi.fn(),
  sendSuccessNotification: vi.fn(),
  copyToClipboard: vi.fn(),
  confirmError: undefined as unknown,
}));

vi.mock('@/src/entities/work', () => ({
  useWork: () => ({
    work: mocks.work,
    updateWork: mocks.updateWork,
  }),
}));

vi.mock('@/src/shared/hooks', () => ({
  useNotifications: () => ({
    sendSuccessNotification: mocks.sendSuccessNotification,
  }),
}));

vi.mock('react-use', () => ({
  useCopyToClipboard: () => [null, mocks.copyToClipboard],
}));

vi.mock('./PlaceholderLogo', () => ({
  PlaceholderLogo: () => <div data-testid="placeholder-logo" />,
}));

vi.mock('@/src/shared/ui', () => ({
  CloseButton: ({ onClose }: { onClose: () => void }) => (
    <button onClick={onClose} type="button">
      close
    </button>
  ),
  ConfirmDialog: ({
    open,
    onCancel,
    onConfirm,
  }: {
    open: boolean;
    onCancel: () => void;
    onConfirm: () => Promise<void>;
  }) =>
    open ? (
      <div data-testid="remove-cover-dialog">
        <button
          onClick={() => {
            void onConfirm().catch((error: unknown) => {
              mocks.confirmError = error;
            });
          }}
          type="button"
        >
          confirm remove cover
        </button>
        <button onClick={onCancel} type="button">
          cancel remove cover
        </button>
      </div>
    ) : null,
  ContentWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormFieldLabel: ({ label }: { label: string }) => <label>{label}</label>,
  FormTextField: () => <input />,
  ImageWithFallback: ({ alt }: { alt: string }) => <div aria-label={alt} role="img" />,
  Modal: ({ children, open }: { children: React.ReactNode; open: boolean }) => (open ? <div>{children}</div> : null),
  ModalWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SubmitButton: ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} type="button">
      submit
    </button>
  ),
  TranslatedContent: ({ content }: { content: string }) => <>{content}</>,
  Typography: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const createDeferred = <T,>() => {
  let resolve: (value: T) => void = () => {};
  let reject: (reason?: unknown) => void = () => {};
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
};

const openRemoveCoverDialog = async () => {
  const user = userEvent.setup();
  const { container } = render(<CoverForm workId="work-1" />);
  const buttons = container.querySelectorAll('button');

  await user.click(buttons[2]);
  await user.click(screen.getByRole('button', { name: 'confirm remove cover' }));

  return user;
};

describe('CoverForm', () => {
  beforeEach(() => {
    mocks.work.coverUrl = 'https://example.com/cover.jpg';
    mocks.updateWork.mockReset();
    mocks.sendSuccessNotification.mockReset();
    mocks.copyToClipboard.mockReset();
    mocks.confirmError = undefined;
  });

  afterEach(() => {
    cleanup();
  });

  it('CoverForm_removeCover_successToastOnlyAfterUpdateWorkSuccess', async () => {
    const updateWork = createDeferred<unknown>();
    mocks.updateWork.mockReturnValue(updateWork.promise);

    await openRemoveCoverDialog();

    expect(mocks.updateWork).toHaveBeenCalledWith(expect.objectContaining({ coverUrl: '' }));
    expect(mocks.sendSuccessNotification).not.toHaveBeenCalled();

    await act(async () => {
      updateWork.resolve({});
      await updateWork.promise;
    });

    await waitFor(() => {
      expect(mocks.sendSuccessNotification).toHaveBeenCalledWith(NOTIFICATIONS.COVER_REMOVE_SUCCESS);
    });
  });

  it('CoverForm_removeCover_doesNotShowSuccessWhenUpdateWorkRejects', async () => {
    const error = new Error('Update failed');
    mocks.updateWork.mockRejectedValue(error);

    await openRemoveCoverDialog();

    await waitFor(() => {
      expect(mocks.confirmError).toBe(error);
    });
    expect(mocks.sendSuccessNotification).not.toHaveBeenCalled();
  });

  it('CoverForm_removeCover_keepsDialogOpenWhenUpdateFails', async () => {
    mocks.updateWork.mockRejectedValue(new Error('Update failed'));

    await openRemoveCoverDialog();

    await waitFor(() => {
      expect(screen.getByTestId('remove-cover-dialog')).toBeInTheDocument();
    });
    expect(mocks.sendSuccessNotification).not.toHaveBeenCalled();
  });

  it('CoverForm_doesNotCloseAfterUpdateWorkRejects', async () => {
    mocks.updateWork.mockRejectedValue(new Error('Update failed'));

    const user = userEvent.setup();
    const { container } = render(<CoverForm workId="work-1" />);

    // Open the change-cover modal.
    await user.click(container.querySelectorAll('button')[0]);
    expect(screen.getByText('actions.changeCover')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(mocks.updateWork).toHaveBeenCalledWith(expect.objectContaining({ coverUrl: 'https://example.com/cover.jpg' }));
    });

    // The modal stays open after the rejected update so the user can retry.
    expect(screen.getByText('actions.changeCover')).toBeInTheDocument();
  });

  it('CoverForm_closesAfterUpdateWorkResolves', async () => {
    mocks.updateWork.mockResolvedValue({});

    const user = userEvent.setup();
    const { container } = render(<CoverForm workId="work-1" />);

    await user.click(container.querySelectorAll('button')[0]);
    expect(screen.getByText('actions.changeCover')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'submit' }));

    // The modal closes once the update resolves.
    await waitFor(() => {
      expect(screen.queryByText('actions.changeCover')).not.toBeInTheDocument();
    });
  });
});
