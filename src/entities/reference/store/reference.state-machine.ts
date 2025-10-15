import { assign, setup } from 'xstate';

import type { ReferenceEntity } from '../model/reference.types';

type ReferenceContext = {
  activeReference: ReferenceEntity | null;
};

export const referenceStateMachine = setup({
  types: {
    events: {} as { type: 'setActiveReference'; reference: ReferenceContext['activeReference'] } | { type: 'close' },
  },
}).createMachine({
  id: 'referenceEditor',
  context: {
    activeReference: null,
  } as ReferenceContext,
  initial: 'init',
  states: {
    init: {
      on: {
        setActiveReference: {
          target: 'editing',
          actions: assign({
            activeReference: ({ event }) => event?.reference ?? null,
          }),
        },
      },
    },
    editing: {
      on: { close: { target: 'init', actions: assign({ activeReference: () => null }) } },
    },
  },
});
