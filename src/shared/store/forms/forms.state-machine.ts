import { assign, setup } from 'xstate';

import type { Id } from '../../interfaces';

type FormContext = {
  activeForm: Id | null;
};

export const formStateMachine = setup({
  types: {
    events: {} as { type: 'setActiveFormId'; id: FormContext['activeForm'] } | { type: 'close' },
  },
}).createMachine({
  id: 'formEditor',
  context: {
    activeForm: null,
  } as FormContext,
  initial: 'init',
  states: {
    init: {
      on: {
        setActiveFormId: {
          target: 'editing',
          actions: assign({
            activeForm: ({ event }) => event?.id ?? null,
          }),
        },
      },
    },
    editing: {
      on: { close: { target: 'init', actions: assign({ activeForm: () => null }) } },
    },
  },
});
