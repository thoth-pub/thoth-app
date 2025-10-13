import { assign, setup } from 'xstate';

import type { FundingEntity } from '../model/funding.type';

type FundingContext = {
  activeFunding: FundingEntity | null;
};

export const fundingStateMachine = setup({
  types: {
    events: {} as { type: 'setActiveFunding'; funding: FundingContext['activeFunding'] } | { type: 'close' },
  },
}).createMachine({
  id: 'fundingEditor',
  context: {
    activeFunding: null,
  } as FundingContext,
  initial: 'init',
  states: {
    init: {
      on: {
        setActiveFunding: {
          target: 'editing',
          actions: assign({
            activeFunding: ({ event }) => event?.funding ?? null,
          }),
        },
      },
    },
    editing: {
      on: { close: { target: 'init', actions: assign({ activePublication: () => null }) } },
    },
  },
});
