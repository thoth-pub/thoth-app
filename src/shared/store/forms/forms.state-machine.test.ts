import { describe, expect, it } from 'vitest';
import { interpret } from 'xstate';

import { IDs } from '@/src/shared/constants';

import { formStateMachine } from './forms.state-machine';

describe('formStateMachine', () => {
  it('starts in init state with activeForm null', () => {
    const actor = interpret(formStateMachine).start();

    expect(actor.getSnapshot().value).toBe('init');
    expect(actor.getSnapshot().context.activeForm).toBeNull();
    expect(actor.getSnapshot().context.attentionRequest).toBe(0);
  });

  it('transitions from init to editing on setActiveFormId', () => {
    const actor = interpret(formStateMachine).start();

    actor.send({ type: 'setActiveFormId', id: IDs.CREATE_WORK });

    expect(actor.getSnapshot().value).toBe('editing');
    expect(actor.getSnapshot().context.activeForm).toBe(IDs.CREATE_WORK);
  });

  it('sets activeForm to null when id is null', () => {
    const actor = interpret(formStateMachine).start();

    actor.send({ type: 'setActiveFormId', id: null });

    expect(actor.getSnapshot().value).toBe('editing');
    expect(actor.getSnapshot().context.activeForm).toBeNull();
  });

  it('transitions from editing to init on close', () => {
    const actor = interpret(formStateMachine).start();
    actor.send({ type: 'setActiveFormId', id: IDs.PUBLICATION_TYPE });

    actor.send({ type: 'close' });

    expect(actor.getSnapshot().value).toBe('init');
    expect(actor.getSnapshot().context.activeForm).toBeNull();
  });

  it('ignores close in init state', () => {
    const actor = interpret(formStateMachine).start();

    actor.send({ type: 'close' });

    expect(actor.getSnapshot().value).toBe('init');
  });

  it('keeps the first active form and requests attention when another edit is attempted', () => {
    const actor = interpret(formStateMachine).start();
    actor.send({ type: 'setActiveFormId', id: IDs.WORK_TITLE });

    actor.send({ type: 'setActiveFormId', id: IDs.WORK_TYPE });

    expect(actor.getSnapshot().context.activeForm).toBe(IDs.WORK_TITLE);
    expect(actor.getSnapshot().context.attentionRequest).toBe(1);
  });

  it('can request attention repeatedly without replacing the active form', () => {
    const actor = interpret(formStateMachine).start();
    actor.send({ type: 'setActiveFormId', id: IDs.WORK_TITLE });

    actor.send({ type: 'setActiveFormId', id: IDs.WORK_TYPE });
    actor.send({ type: 'setActiveFormId', id: IDs.WORK_TYPE });

    expect(actor.getSnapshot().context.activeForm).toBe(IDs.WORK_TITLE);
    expect(actor.getSnapshot().context.attentionRequest).toBe(2);
  });

  it('clears the attention request when the active form closes', () => {
    const actor = interpret(formStateMachine).start();
    actor.send({ type: 'setActiveFormId', id: IDs.WORK_TITLE });
    actor.send({ type: 'setActiveFormId', id: IDs.WORK_TYPE });

    actor.send({ type: 'close' });

    expect(actor.getSnapshot().context.activeForm).toBeNull();
    expect(actor.getSnapshot().context.attentionRequest).toBe(0);
  });
});
