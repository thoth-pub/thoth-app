import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { IDs, NOTIFICATIONS } from '@/src/shared/constants';

import { ActiveFormNavigationProvider, useActiveFormNavigationTarget } from './ActiveFormNavigation';
import FormBlockedFeedback from './FormBlockedFeedback';
import { FormStateMachineContext } from './forms.provider';
import useFormStateMachine from './hooks/useFormStateMachine';

const mocks = vi.hoisted(() => ({
  sendWarningNotification: vi.fn(),
}));

vi.mock('@/src/shared/hooks/useNotifications', () => ({
  default: () => ({ sendWarningNotification: mocks.sendWarningNotification }),
}));

vi.mock('react-i18next', () => ({
  // eslint-disable-next-line @eslint-react/hooks-extra/no-unnecessary-use-prefix
  useTranslation: () => ({ t: (key: string) => key }),
}));

const Harness = () => {
  const { activeFormId, attentionRequest, edit, closeForm } = useFormStateMachine();
  const formRef = useActiveFormNavigationTarget(IDs.WORK_TITLE, 'Main title');
  const replacementFormRef = useActiveFormNavigationTarget(IDs.WORK_NOTES, 'Notes');

  return (
    <>
      <button type="button" onClick={() => edit(IDs.WORK_TITLE)}>
        Edit first
      </button>
      <button type="button" onClick={() => edit(IDs.WORK_TYPE)}>
        Edit second
      </button>
      <button type="button" onClick={() => edit(IDs.WORK_NOTES)}>
        Edit replacement
      </button>
      <button type="button" onClick={closeForm}>
        Close
      </button>
      <span data-testid="active-form">{typeof activeFormId === 'string' ? activeFormId : ''}</span>
      <span data-testid="attention-request">{attentionRequest}</span>
      {activeFormId === IDs.WORK_TITLE && <form ref={formRef} aria-label="Active form" />}
      {activeFormId === IDs.WORK_NOTES && <form ref={replacementFormRef} aria-label="Replacement form" />}
    </>
  );
};

const renderHarness = () =>
  render(
    // createActorContext exposes a Provider component, not a React 19 context object.
    // eslint-disable-next-line @eslint-react/no-context-provider
    <FormStateMachineContext.Provider>
      <ActiveFormNavigationProvider>
        <FormBlockedFeedback />
        <Harness />
      </ActiveFormNavigationProvider>
    </FormStateMachineContext.Provider>,
  );

describe('FormBlockedFeedback', () => {
  afterEach(() => {
    cleanup();
    mocks.sendWarningNotification.mockReset();
  });

  it('adds a go-to action that preserves the active edit and requests a fresh cue', async () => {
    const user = userEvent.setup();
    renderHarness();

    await user.click(screen.getByRole('button', { name: 'Edit first' }));
    const form = screen.getByRole('form', { name: 'Active form' });
    const scrollIntoView = vi.fn();
    form.scrollIntoView = scrollIntoView;
    await user.click(screen.getByRole('button', { name: 'Edit second' }));

    expect(mocks.sendWarningNotification).toHaveBeenCalledTimes(1);
    const [message, options, action] = mocks.sendWarningNotification.mock.calls[0];
    expect(message).toBe(NOTIFICATIONS.ACTIVE_FORM_BLOCKED);
    expect(options).toBeUndefined();
    expect(action.label).toBe(NOTIFICATIONS.ACTIVE_FORM_GO_TO_OPEN_EDIT);

    act(() => action.onClick());

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    expect(screen.getByTestId('active-form')).toHaveTextContent(IDs.WORK_TITLE);
    expect(screen.getByTestId('attention-request')).toHaveTextContent('2');
    expect(mocks.sendWarningNotification).toHaveBeenCalledTimes(1);
  });

  it('makes a stale warning action a safe no-op after the form closes', async () => {
    const user = userEvent.setup();
    renderHarness();

    await user.click(screen.getByRole('button', { name: 'Edit first' }));
    const form = screen.getByRole('form', { name: 'Active form' });
    const scrollIntoView = vi.fn();
    form.scrollIntoView = scrollIntoView;
    await user.click(screen.getByRole('button', { name: 'Edit second' }));
    const action = mocks.sendWarningNotification.mock.calls[0][2];

    await user.click(screen.getByRole('button', { name: 'Close' }));
    act(() => action.onClick());

    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(screen.getByTestId('active-form')).toBeEmptyDOMElement();
    expect(screen.getByTestId('attention-request')).toHaveTextContent('0');
    expect(mocks.sendWarningNotification).toHaveBeenCalledTimes(1);
  });

  it('does not navigate to a replacement form from a warning created for a closed form', async () => {
    const user = userEvent.setup();
    renderHarness();

    await user.click(screen.getByRole('button', { name: 'Edit first' }));
    await user.click(screen.getByRole('button', { name: 'Edit second' }));
    const staleAction = mocks.sendWarningNotification.mock.calls[0][2];

    await user.click(screen.getByRole('button', { name: 'Close' }));
    await user.click(screen.getByRole('button', { name: 'Edit replacement' }));
    const replacementForm = screen.getByRole('form', { name: 'Replacement form' });
    const scrollIntoView = vi.fn();
    replacementForm.scrollIntoView = scrollIntoView;

    act(() => staleAction.onClick());

    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(screen.getByTestId('active-form')).toHaveTextContent(IDs.WORK_NOTES);
    expect(screen.getByTestId('attention-request')).toHaveTextContent('0');
    expect(mocks.sendWarningNotification).toHaveBeenCalledTimes(1);
  });
});
