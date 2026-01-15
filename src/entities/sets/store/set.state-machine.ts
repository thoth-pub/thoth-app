import { assign, setup } from 'xstate';

import type { SetEntity } from '../model/set.types';

type SetContext = {
  activeSet: SetEntity | null;
};

export const setStateMachine = setup({
  types: {
    events: {} as { type: 'setActiveSet'; set: SetContext['activeSet'] } | { type: 'close' },
  },
}).createMachine({
  id: 'setEditor',
  context: {
    activeSet: null,
  } as SetContext,
  initial: 'init',
  states: {
    init: {
      on: {
        setActiveSet: {
          target: 'editing',
          actions: assign({
            activeSet: ({ event }) => event?.set ?? null,
          }),
        },
      },
    },
    editing: {
      on: { close: { target: 'init', actions: assign({ activeSet: () => null }) } },
    },
  },
});
