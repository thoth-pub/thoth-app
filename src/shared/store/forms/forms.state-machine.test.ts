import { describe, expect, it } from 'vitest';
import { interpret } from 'xstate';

import { formStateMachine } from './forms.state-machine';

describe('formStateMachine', () => {
  it('starts in init state with activeForm null', () => {
    const actor = interpret(formStateMachine).start();

    expect(actor.getSnapshot().value).toBe('init');
    expect(actor.getSnapshot().context.activeForm).toBeNull();
  });

  it('transitions from init to editing on setActiveFormId', () => {
    const actor = interpret(formStateMachine).start();

    actor.send({ type: 'setActiveFormId', id: 'createWork' });

    expect(actor.getSnapshot().value).toBe('editing');
    expect(actor.getSnapshot().context.activeForm).toBe('createWork');
  });

  it('sets activeForm to null when id is null', () => {
    const actor = interpret(formStateMachine).start();

    actor.send({ type: 'setActiveFormId', id: null });

    expect(actor.getSnapshot().value).toBe('editing');
    expect(actor.getSnapshot().context.activeForm).toBeNull();
  });

  it('transitions from editing to init on close', () => {
    const actor = interpret(formStateMachine).start();
    actor.send({ type: 'setActiveFormId', id: 'editPublication' });

    actor.send({ type: 'close' });

    expect(actor.getSnapshot().value).toBe('init');
    expect(actor.getSnapshot().context.activeForm).toBeNull();
  });

  it('ignores close in init state', () => {
    const actor = interpret(formStateMachine).start();

    actor.send({ type: 'close' });

    expect(actor.getSnapshot().value).toBe('init');
  });

  it('ignores setActiveFormId in editing state', () => {
    const actor = interpret(formStateMachine).start();
    actor.send({ type: 'setActiveFormId', id: 'firstForm' });

    actor.send({ type: 'setActiveFormId', id: 'secondForm' });

    expect(actor.getSnapshot().context.activeForm).toBe('firstForm');
  });
});
