import { assign, setup } from 'xstate';

import type { Id } from '../../interfaces';

type FormContext = {
  activeForm: Id | null;
  attentionRequest: number;
};

export const formStateMachine = setup({
  types: {
    events: {} as { type: 'setActiveFormId'; id: FormContext['activeForm'] } | { type: 'close' },
  },
}).createMachine({
  id: 'formEditor',
  context: {
    activeForm: null,
    attentionRequest: 0,
  } as FormContext,
  initial: 'init',
  states: {
    init: {
      on: {
        setActiveFormId: {
          target: 'editing',
          actions: assign({
            activeForm: ({ event }) => event?.id ?? null,
            attentionRequest: () => 0,
          }),
        },
      },
    },
    editing: {
      on: {
        setActiveFormId: {
          actions: assign({
            attentionRequest: ({ context }) => context.attentionRequest + 1,
          }),
        },
        close: {
          target: 'init',
          actions: assign({ activeForm: () => null, attentionRequest: () => 0 }),
        },
      },
    },
  },
});
