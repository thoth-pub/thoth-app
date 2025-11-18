import { assign, setup } from 'xstate';

type UiContext = {
  isExpanded: boolean;
};

export const uiStateMachine = setup({
  types: {
    events: {} as { type: 'setIsExpanded.update' },
  },
}).createMachine({
  id: 'ui',
  context: {
    isExpanded: false,
  } as UiContext,
  initial: 'init',
  states: {
    init: {
      on: {
        'setIsExpanded.update': {
          actions: assign({
            isExpanded: ({ context }) => !context.isExpanded,
          }),
        },
      },
    },
  },
});
