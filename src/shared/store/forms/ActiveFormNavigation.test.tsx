import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { IDs } from '@/src/shared/constants';

import { ActiveFormNavigationProvider, useActiveFormNavigationTarget } from './ActiveFormNavigation';
import { FormStateMachineContext } from './forms.provider';
import useFormStateMachine from './hooks/useFormStateMachine';

vi.mock('react-i18next', () => ({
  // eslint-disable-next-line @eslint-react/hooks-extra/no-unnecessary-use-prefix
  useTranslation: () => ({
    t: (key: string, options?: { label?: string }) => (options?.label ? `${key}: ${options.label}` : key),
  }),
}));

const Editor = ({ label }: { label?: string }) => {
  const { activeFormId, attentionRequest, edit, closeForm } = useFormStateMachine();
  const formRef = useActiveFormNavigationTarget(IDs.WORK_TITLE, label);

  return (
    <>
      <button type="button" onClick={() => edit(IDs.WORK_TITLE)}>
        Open edit
      </button>
      <button type="button" onClick={closeForm}>
        Cancel edit
      </button>
      <button type="button" onClick={closeForm}>
        Save edit
      </button>
      <span data-testid="active-form">{typeof activeFormId === 'string' ? activeFormId : ''}</span>
      <span data-testid="attention-request">{attentionRequest}</span>
      {activeFormId === IDs.WORK_TITLE && <form ref={formRef} aria-label="Active form" />}
    </>
  );
};

const renderEditor = (label?: string) =>
  render(
    // createActorContext exposes a Provider component, not a React 19 context object.
    // eslint-disable-next-line @eslint-react/no-context-provider
    <FormStateMachineContext.Provider>
      <ActiveFormNavigationProvider>
        <Editor label={label} />
      </ActiveFormNavigationProvider>
    </FormStateMachineContext.Provider>,
  );

const UnmountHarness = () => {
  const [showEditor, setShowEditor] = useState(true);

  return (
    <>
      <button type="button" onClick={() => setShowEditor(false)}>
        Unmount editor
      </button>
      {showEditor && <Editor />}
    </>
  );
};

describe('ActiveFormNavigation', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows a generic persistent indicator only while a form is active', async () => {
    const user = userEvent.setup();
    renderEditor();

    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open edit' }));
    expect(screen.getByRole('status')).toHaveTextContent('activeFormEditing');

    await user.click(screen.getByRole('button', { name: 'Cancel edit' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open edit' }));
    await user.click(screen.getByRole('button', { name: 'Save edit' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('uses a human-readable label without exposing a form id', async () => {
    const user = userEvent.setup();
    renderEditor('Main title');

    await user.click(screen.getByRole('button', { name: 'Open edit' }));

    expect(screen.getByRole('status')).toHaveTextContent('activeFormEditingLabel: Main title');
    expect(screen.getByRole('status')).not.toHaveTextContent(IDs.WORK_TITLE);
  });

  it('smoothly centers the active form and requests fresh attention without changing edit state', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole('button', { name: 'Open edit' }));
    const form = screen.getByRole('form', { name: 'Active form' });
    const scrollIntoView = vi.fn();
    form.scrollIntoView = scrollIntoView;

    await user.click(screen.getByRole('button', { name: 'activeFormGoToEdit' }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    expect(screen.getByTestId('attention-request')).toHaveTextContent('1');
    expect(screen.getByTestId('active-form')).toHaveTextContent(IDs.WORK_TITLE);
    expect(screen.getByRole('form', { name: 'Active form' })).toBe(form);
  });

  it('centers the active form without smooth scrolling when reduced motion is preferred', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    );
    renderEditor();

    await user.click(screen.getByRole('button', { name: 'Open edit' }));
    const form = screen.getByRole('form', { name: 'Active form' });
    const scrollIntoView = vi.fn();
    form.scrollIntoView = scrollIntoView;

    await user.click(screen.getByRole('button', { name: 'activeFormGoToEdit' }));

    expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'center' });
    expect(screen.getByTestId('attention-request')).toHaveTextContent('1');
    expect(screen.getByTestId('active-form')).toHaveTextContent(IDs.WORK_TITLE);
  });

  it('clears the indicator when an active editor unmounts', async () => {
    const user = userEvent.setup();
    render(
      // createActorContext exposes a Provider component, not a React 19 context object.
      // eslint-disable-next-line @eslint-react/no-context-provider
      <FormStateMachineContext.Provider>
        <ActiveFormNavigationProvider>
          <UnmountHarness />
        </ActiveFormNavigationProvider>
      </FormStateMachineContext.Provider>,
    );

    await user.click(screen.getByRole('button', { name: 'Open edit' }));
    expect(screen.getByRole('status')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Unmount editor' }));

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });
});
