import { describe, expect, it } from 'vitest';
import { interpret } from 'xstate';

import { createEntityStateMachine } from './index';

describe('createEntityStateMachine', () => {
  it('creates a machine with initial context entity null', () => {
    const { stateMachine } = createEntityStateMachine<{ id: string }>('testEditor');
    const actor = interpret(stateMachine).start();

    expect(actor.getSnapshot().value).toBe('init');
    expect(actor.getSnapshot().context.entity).toBeNull();
  });

  it('transitions from init to editing on setActiveEntity', () => {
    const { stateMachine } = createEntityStateMachine<{ id: string }>('testEditor');
    const actor = interpret(stateMachine).start();
    const entity = { id: 'entity-1' };

    actor.send({ type: 'setActiveEntity', entity });

    expect(actor.getSnapshot().value).toBe('editing');
    expect(actor.getSnapshot().context.entity).toEqual(entity);
  });

  it('sets entity to null when event payload is undefined', () => {
    const { stateMachine } = createEntityStateMachine<{ id: string }>('testEditor');
    const actor = interpret(stateMachine).start();

    actor.send({ type: 'setActiveEntity' } as never);

    expect(actor.getSnapshot().context.entity).toBeNull();
  });

  it('transitions from editing to init on close', () => {
    const { stateMachine } = createEntityStateMachine<{ id: string }>('testEditor');
    const actor = interpret(stateMachine).start();
    actor.send({ type: 'setActiveEntity', entity: { id: 'e1' } });

    actor.send({ type: 'close' });

    expect(actor.getSnapshot().value).toBe('init');
    expect(actor.getSnapshot().context.entity).toBeNull();
  });

  it('updates entity via activeEntity.update in editing state', () => {
    const { stateMachine } = createEntityStateMachine<{ id: string; name: string }>('testEditor');
    const actor = interpret(stateMachine).start();
    actor.send({ type: 'setActiveEntity', entity: { id: 'e1', name: 'original' } });

    actor.send({ type: 'activeEntity.update', entity: { id: 'e1', name: 'updated' } });

    expect(actor.getSnapshot().value).toBe('editing');
    expect(actor.getSnapshot().context.entity).toEqual({ id: 'e1', name: 'updated' });
  });

  it('ignores activeEntity.update in init state', () => {
    const { stateMachine } = createEntityStateMachine<{ id: string }>('testEditor');
    const actor = interpret(stateMachine).start();

    actor.send({ type: 'activeEntity.update', entity: { id: 'e1' } });

    expect(actor.getSnapshot().value).toBe('init');
    expect(actor.getSnapshot().context.entity).toBeNull();
  });

  it('ignores close in init state', () => {
    const { stateMachine } = createEntityStateMachine<{ id: string }>('testEditor');
    const actor = interpret(stateMachine).start();

    actor.send({ type: 'close' });

    expect(actor.getSnapshot().value).toBe('init');
  });

  it('ignores setActiveEntity in editing state', () => {
    const { stateMachine } = createEntityStateMachine<{ id: string }>('testEditor');
    const actor = interpret(stateMachine).start();
    actor.send({ type: 'setActiveEntity', entity: { id: 'e1' } });

    actor.send({ type: 'setActiveEntity', entity: { id: 'e2' } });

    expect(actor.getSnapshot().context.entity).toEqual({ id: 'e1' });
  });

  it('works with different entity types', () => {
    const stringMachine = createEntityStateMachine<string>('stringEditor');
    const actor = interpret(stringMachine.stateMachine).start();

    actor.send({ type: 'setActiveEntity', entity: 'hello' });

    expect(actor.getSnapshot().context.entity).toBe('hello');

    actor.send({ type: 'close' });
    expect(actor.getSnapshot().context.entity).toBeNull();
  });

  it('sets entity to null when activeEntity.update payload is undefined', () => {
    const { stateMachine } = createEntityStateMachine<{ id: string }>('testEditor');
    const actor = interpret(stateMachine).start();
    actor.send({ type: 'setActiveEntity', entity: { id: 'e1' } });

    actor.send({ type: 'activeEntity.update' } as never);

    expect(actor.getSnapshot().context.entity).toBeNull();
  });
});
