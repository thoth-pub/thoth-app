import { describe, expect, it } from 'vitest';
import { interpret } from 'xstate';

import { publisherStateMachine } from './publisher.state-machine';

describe('publisherStateMachine', () => {
  it('starts in init state with default context', () => {
    const actor = interpret(publisherStateMachine).start();

    expect(actor.getSnapshot().value).toBe('init');
    expect(actor.getSnapshot().context.activePublisher).toBeNull();
    expect(actor.getSnapshot().context.linkedPublishers).toEqual([]);
  });

  it('transitions from init to authenticated on setLinkedPublishers', () => {
    const actor = interpret(publisherStateMachine).start();
    const publishers = [
      { id: 'pub-1', name: 'Test Publisher', publisherAdmin: true, workLifecycle: true, cdnWrite: false, imprints: [] },
    ];

    actor.send({ type: 'setLinkedPublishers', linkedPublishers: publishers, isSuperAdmin: false });

    expect(actor.getSnapshot().value).toBe('authenticated');
    expect(actor.getSnapshot().context.linkedPublishers).toEqual(publishers);
    expect(actor.getSnapshot().context.activePublisher).toBeNull();
  });

  it('sets linkedPublishers to empty array when event payload is undefined', () => {
    const actor = interpret(publisherStateMachine).start();

    actor.send({ type: 'setLinkedPublishers' } as never);

    expect(actor.getSnapshot().context.linkedPublishers).toEqual([]);
  });

  it('updates activePublisher via activePublisher.update self-transition', () => {
    const actor = interpret(publisherStateMachine).start();
    const publishers = [
      { id: 'pub-1', name: 'Test Publisher', publisherAdmin: true, workLifecycle: true, cdnWrite: false, imprints: [] },
    ];
    actor.send({ type: 'setLinkedPublishers', linkedPublishers: publishers, isSuperAdmin: false });

    const newPublisher = { id: 'pub-2', name: 'Updated Publisher', publisherAdmin: false, workLifecycle: true, cdnWrite: true, imprints: [] };
    actor.send({ type: 'activePublisher.update', publisher: newPublisher });

    expect(actor.getSnapshot().value).toBe('authenticated');
    expect(actor.getSnapshot().context.activePublisher).toEqual(newPublisher);
  });

  it('sets activePublisher to null when event payload is undefined', () => {
    const actor = interpret(publisherStateMachine).start();
    const publishers = [
      { id: 'pub-1', name: 'Test Publisher', publisherAdmin: true, workLifecycle: true, cdnWrite: false, imprints: [] },
    ];
    actor.send({ type: 'setLinkedPublishers', linkedPublishers: publishers, isSuperAdmin: false });
    actor.send({ type: 'activePublisher.update', publisher: publishers[0] });
    expect(actor.getSnapshot().context.activePublisher).toEqual(publishers[0]);

    actor.send({ type: 'activePublisher.update' } as never);

    expect(actor.getSnapshot().context.activePublisher).toBeNull();
  });

  it('transitions from authenticated to init on resetLinkedPublishers', () => {
    const actor = interpret(publisherStateMachine).start();
    const publishers = [
      { id: 'pub-1', name: 'Test Publisher', publisherAdmin: true, workLifecycle: true, cdnWrite: false, imprints: [] },
    ];
    actor.send({ type: 'setLinkedPublishers', linkedPublishers: publishers, isSuperAdmin: false });
    actor.send({ type: 'activePublisher.update', publisher: publishers[0] });

    actor.send({ type: 'resetLinkedPublishers' });

    expect(actor.getSnapshot().value).toBe('init');
    expect(actor.getSnapshot().context.activePublisher).toBeNull();
    expect(actor.getSnapshot().context.linkedPublishers).toEqual([]);
  });

  it('ignores resetLinkedPublishers in init state', () => {
    const actor = interpret(publisherStateMachine).start();

    actor.send({ type: 'resetLinkedPublishers' });

    expect(actor.getSnapshot().value).toBe('init');
  });

  it('ignores activePublisher.update in init state', () => {
    const actor = interpret(publisherStateMachine).start();
    const publisher = { id: 'pub-1', name: 'Test', publisherAdmin: true, workLifecycle: true, cdnWrite: false, imprints: [] };

    actor.send({ type: 'activePublisher.update', publisher });

    expect(actor.getSnapshot().value).toBe('init');
    expect(actor.getSnapshot().context.activePublisher).toBeNull();
  });

  it('updates linkedPublishers via setLinkedPublishers in authenticated state', () => {
    const actor = interpret(publisherStateMachine).start();
    const initialPublishers = [
      { id: 'pub-1', name: 'First', publisherAdmin: true, workLifecycle: true, cdnWrite: false, imprints: [] },
    ];
    actor.send({ type: 'setLinkedPublishers', linkedPublishers: initialPublishers, isSuperAdmin: false });

    const newPublishers = [
      { id: 'pub-2', name: 'Second', publisherAdmin: false, workLifecycle: false, cdnWrite: false, imprints: [] },
    ];
    actor.send({ type: 'setLinkedPublishers', linkedPublishers: newPublishers, isSuperAdmin: false });

    expect(actor.getSnapshot().value).toBe('authenticated');
    expect(actor.getSnapshot().context.linkedPublishers).toEqual(newPublishers);
    expect(actor.getSnapshot().context.activePublisher).toBeNull();
  });
});
