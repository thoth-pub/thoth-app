import { assign, setup } from 'xstate';

type FormContext = {
  activeForm: '1' | '2' | null;
};

export const formStateMachine = setup({
  types: {
    events: {} as { type: 'setFormId'; id: FormContext['activeForm'] } | { type: 'close' },
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
        setFormId: {
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
