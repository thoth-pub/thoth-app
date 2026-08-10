import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { IDs } from '@/src/shared/constants';
import FormBlockedFeedback from '@/src/shared/store/forms/FormBlockedFeedback';
import { FormStateMachineContext } from '@/src/shared/store/forms/forms.provider';

import { EditableContent } from './EditableContent';

const mocks = vi.hoisted(() => ({
  sendWarningNotification: vi.fn(),
}));

vi.mock('@/src/shared/hooks', () => ({
  useEscapeKey: vi.fn(),
  useIsDesktop: () => true,
  useTypedTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/src/shared/hooks/useNotifications', () => ({
  default: () => ({ sendWarningNotification: mocks.sendWarningNotification }),
}));

vi.mock('./FormWrapper', () => ({
  FormWrapper: ({
    defaultValues,
    onClose,
    onSubmit,
    attentionRequest,
  }: {
    defaultValues?: { text?: string };
    onClose: () => void;
    onSubmit: (data: { text: string }) => void | Promise<void>;
    attentionRequest?: number;
  }) => (
    <div>
      <span data-testid="form-value">{defaultValues?.text}</span>
      <span data-testid="attention-request">{attentionRequest}</span>
      <button
        type="button"
        onClick={() => {
          void Promise.resolve(onSubmit({ text: 'Unsaved value' })).catch(() => {});
        }}
      >
        Submit rejected value
      </button>
      <button
        type="button"
        onClick={() => {
          void Promise.resolve(onSubmit({ text: 'Persisted value' })).catch(() => {});
        }}
      >
        Submit resolved value
      </button>
      <button type="button" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

const FORM_ID = IDs.WORK_NOTES;

type TestFormValues = {
  text: string;
};

const validationSchema = z.object({
  text: z.string().min(1),
});

const renderEditableContent = (onSubmit: (data: TestFormValues) => void | Promise<void>) => {
  return render(
    <FormStateMachineContext.Provider>
      <FormBlockedFeedback />
      <EditableContent<TestFormValues>
        formId={FORM_ID}
        defaultValues={{ text: 'Saved value' }}
        validationSchema={validationSchema}
        onSubmit={onSubmit}
        formFields={() => null}
        preview={({ data, onEdit }) => (
          <div>
            <span data-testid="preview-value">{data?.text}</span>
            <button type="button" onClick={onEdit}>
              Edit
            </button>
          </div>
        )}
      />
    </FormStateMachineContext.Provider>,
  );
};

const renderEditablePair = (
  onSubmitA: (data: TestFormValues) => void | Promise<void> = vi.fn(),
  onSubmitB: (data: TestFormValues) => void | Promise<void> = vi.fn(),
) => {
  return render(
    <FormStateMachineContext.Provider>
      <FormBlockedFeedback />
      <EditableContent<TestFormValues>
        formId={IDs.WORK_TITLE}
        defaultValues={{ text: 'Form A' }}
        validationSchema={validationSchema}
        onSubmit={onSubmitA}
        formFields={() => null}
        preview={({ onEdit }) => (
          <div data-testid="preview-a">
            <button type="button" onClick={onEdit}>
              Edit A
            </button>
          </div>
        )}
      />
      <EditableContent<TestFormValues>
        formId={IDs.WORK_TYPE}
        defaultValues={{ text: 'Form B' }}
        validationSchema={validationSchema}
        onSubmit={onSubmitB}
        formFields={() => null}
        preview={({ onEdit, disabled }) => (
          <div data-testid="preview-b">
            <button type="button" onClick={onEdit} disabled={disabled}>
              Edit B
            </button>
          </div>
        )}
      />
    </FormStateMachineContext.Provider>,
  );
};

describe('EditableContent', () => {
  afterEach(() => {
    cleanup();
    mocks.sendWarningNotification.mockReset();
  });

  it('EditableContent_doesNotCloseOrPreviewSubmittedValues_whenOnSubmitRejects', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error('save failed'));

    renderEditableContent(onSubmit);

    expect(screen.getByTestId('preview-value')).toHaveTextContent('Saved value');

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: 'Submit rejected value' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ text: 'Unsaved value' }));

    expect(screen.getByTestId('form-value')).toHaveTextContent('Saved value');
    expect(screen.queryByTestId('preview-value')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.getByTestId('preview-value')).toHaveTextContent('Saved value');
  });

  it('EditableContent_closesAndUpdatesPreview_whenOnSubmitResolves', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    renderEditableContent(onSubmit);

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: 'Submit resolved value' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ text: 'Persisted value' }));

    await waitFor(() => expect(screen.queryByTestId('form-value')).not.toBeInTheDocument());
    expect(screen.getByTestId('preview-value')).toHaveTextContent('Persisted value');
  });

  it('keeps the current editor open and gives repeatable feedback when a second edit is requested', async () => {
    const user = userEvent.setup();
    renderEditablePair();

    await user.click(screen.getByRole('button', { name: 'Edit A' }));
    await user.click(screen.getByRole('button', { name: 'Edit B' }));

    expect(screen.getByTestId('form-value')).toHaveTextContent('Form A');
    expect(screen.getByTestId('preview-b')).toBeInTheDocument();
    expect(screen.getByTestId('attention-request')).toHaveTextContent('1');
    expect(mocks.sendWarningNotification).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Edit B' }));

    expect(screen.getByTestId('form-value')).toHaveTextContent('Form A');
    expect(screen.getByTestId('attention-request')).toHaveTextContent('2');
    expect(mocks.sendWarningNotification).toHaveBeenCalledTimes(2);
  });

  it('allows another editor after the current editor is cancelled', async () => {
    const user = userEvent.setup();
    renderEditablePair();

    await user.click(screen.getByRole('button', { name: 'Edit A' }));
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await user.click(screen.getByRole('button', { name: 'Edit B' }));

    expect(screen.getByTestId('form-value')).toHaveTextContent('Form B');
    expect(mocks.sendWarningNotification).not.toHaveBeenCalled();
  });

  it('allows another editor after the current editor is saved', async () => {
    const user = userEvent.setup();
    renderEditablePair(vi.fn().mockResolvedValue(undefined));

    await user.click(screen.getByRole('button', { name: 'Edit A' }));
    await user.click(screen.getByRole('button', { name: 'Submit resolved value' }));
    await waitFor(() => expect(screen.getByTestId('preview-a')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Edit B' }));

    expect(screen.getByTestId('form-value')).toHaveTextContent('Form B');
    expect(mocks.sendWarningNotification).not.toHaveBeenCalled();
  });

  it('reports a blocked double-click through the same feedback path', async () => {
    const user = userEvent.setup();
    renderEditablePair();

    await user.click(screen.getByRole('button', { name: 'Edit A' }));
    await user.dblClick(screen.getByTestId('preview-b'));

    expect(screen.getByTestId('form-value')).toHaveTextContent('Form A');
    expect(screen.getByTestId('preview-b')).toBeInTheDocument();
    expect(mocks.sendWarningNotification).toHaveBeenCalled();
  });

  it('keeps a genuinely disabled field native-disabled without active-edit feedback', async () => {
    const user = userEvent.setup();

    render(
      <FormStateMachineContext.Provider>
        <FormBlockedFeedback />
        <EditableContent<TestFormValues>
          formId={IDs.WORK_LCCN}
          isDisabled
          defaultValues={{ text: 'Disabled' }}
          validationSchema={validationSchema}
          onSubmit={vi.fn()}
          formFields={() => null}
          preview={({ onEdit, disabled }) => (
            <button type="button" onClick={onEdit} disabled={disabled}>
              Disabled edit
            </button>
          )}
        />
      </FormStateMachineContext.Provider>,
    );

    const button = screen.getByRole('button', { name: 'Disabled edit' });
    expect(button).toBeDisabled();
    await user.click(button);

    expect(screen.queryByTestId('form-value')).not.toBeInTheDocument();
    expect(mocks.sendWarningNotification).not.toHaveBeenCalled();
  });
});
