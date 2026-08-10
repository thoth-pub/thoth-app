import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { IDs } from '@/src/shared/constants';
import FormBlockedFeedback from '@/src/shared/store/forms/FormBlockedFeedback';
import { FormStateMachineContext } from '@/src/shared/store/forms/forms.provider';

import { EditableContentAlt } from './EditableContentAlt';

const mocks = vi.hoisted(() => ({
  sendWarningNotification: vi.fn(),
}));

vi.mock('@/src/shared/hooks', () => ({
  useEscapeKey: vi.fn(),
  useTypedTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/src/shared/hooks/useNotifications', () => ({
  default: () => ({ sendWarningNotification: mocks.sendWarningNotification }),
}));

vi.mock('./FormWrapper', () => ({
  FormWrapper: ({
    defaultValues,
    attentionRequest,
  }: {
    defaultValues?: { text?: string };
    attentionRequest?: number;
  }) => (
    <div>
      <span data-testid="alt-form-value">{defaultValues?.text}</span>
      <span data-testid="alt-attention-request">{attentionRequest}</span>
    </div>
  ),
}));

const validationSchema = z.object({ text: z.string() });

const renderPair = () =>
  render(
    <FormStateMachineContext.Provider>
      <FormBlockedFeedback />
      <EditableContentAlt
        formId={IDs.WORK_TITLE}
        defaultValues={{ text: 'Alt A' }}
        validationSchema={validationSchema}
        onSubmit={vi.fn()}
        formFields={() => null}
        preview={({ onEdit }) => (
          <button type="button" onClick={onEdit}>
            Edit Alt A
          </button>
        )}
      />
      <EditableContentAlt
        formId={IDs.WORK_TYPE}
        defaultValues={{ text: 'Alt B' }}
        validationSchema={validationSchema}
        onSubmit={vi.fn()}
        formFields={() => null}
        preview={({ onEdit }) => (
          <button type="button" onClick={onEdit}>
            Edit Alt B
          </button>
        )}
      />
    </FormStateMachineContext.Provider>,
  );

describe('EditableContentAlt', () => {
  afterEach(() => {
    cleanup();
    mocks.sendWarningNotification.mockReset();
  });

  it('opens normally and reports a blocked second edit without replacing the active form', async () => {
    const user = userEvent.setup();
    renderPair();

    await user.click(screen.getByRole('button', { name: 'Edit Alt A' }));
    await user.click(screen.getByRole('button', { name: 'Edit Alt B' }));

    expect(screen.getByTestId('alt-form-value')).toHaveTextContent('Alt A');
    expect(screen.getByRole('button', { name: 'Edit Alt B' })).toBeInTheDocument();
    expect(screen.getByTestId('alt-attention-request')).toHaveTextContent('1');
    expect(mocks.sendWarningNotification).toHaveBeenCalledWith('activeFormBlocked');
  });
});
