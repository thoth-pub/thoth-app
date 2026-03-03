import { createActorContext } from '@xstate/react';
import { useCallback } from 'react';
import { assign, setup } from 'xstate';

export const createEntityStateMachine = <T>(id: string) => {
  const stateMachine = setup({
    types: {
      context: {
        entity: null as T | null,
      },
      events: {} as
        | { type: 'setActiveEntity'; entity: T }
        | { type: 'activeEntity.update'; entity: T }
        | { type: 'close' },
    },
  }).createMachine({
    id,
    context: {
      entity: null,
    },
    initial: 'init',
    states: {
      init: {
        on: {
          setActiveEntity: {
            target: 'editing',
            actions: assign({
              entity: ({ event }) => event?.entity ?? null,
            }),
          },
        },
      },
      editing: {
        on: {
          close: { target: 'init', actions: assign({ entity: () => null }) },
          'activeEntity.update': {
            actions: assign({
              entity: ({ event }) => event?.entity ?? null,
            }),
          },
        },
      },
    },
  });

  const StateMachineContext = createActorContext(stateMachine);

  const useStateMachine = () => {
    const actorRef = StateMachineContext.useActorRef();

    const activeEntity = StateMachineContext.useSelector((state) => state.context.entity);

    const edit = useCallback((entity: T) => actorRef.send({ type: 'setActiveEntity', entity }), [actorRef]);

    const update = useCallback((entity: T) => actorRef.send({ type: 'activeEntity.update', entity }), [actorRef]);

    const close = useCallback(() => actorRef.send({ type: 'close' }), [actorRef]);

    return {
      activeEntity,
      edit,
      update,
      close,
    };
  };

  return { useStateMachine, StateMachineContext };
};
