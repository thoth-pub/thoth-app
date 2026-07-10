import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { FormStateMachineContext } from '@/src/shared/store/forms/forms.provider';

import { EditableContent } from './EditableContent';

vi.mock('@/src/shared/hooks', () => ({
  useEscapeKey: vi.fn(),
  useIsDesktop: () => true,
  useTypedTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('./FormWrapper', () => ({
  FormWrapper: ({
    defaultValues,
    onClose,
    onSubmit,
  }: {
    defaultValues?: { text?: string };
    onClose: () => void;
    onSubmit: (data: { text: string }) => void | Promise<void>;
  }) => (
    <div>
      <span data-testid="form-value">{defaultValues?.text}</span>
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

const FORM_ID = 'editable_content_test';

type TestFormValues = {
  text: string;
};

const validationSchema = z.object({
  text: z.string().min(1),
});

const renderEditableContent = (onSubmit: (data: TestFormValues) => void | Promise<void>) => {
  return render(
    <FormStateMachineContext.Provider>
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

describe('EditableContent', () => {
  afterEach(() => {
    cleanup();
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
});
