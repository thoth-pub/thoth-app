import { assign, setup } from 'xstate';

import { WorkContribution } from '../model/contribution.types';

type ContributionContext = {
  activeContribution: WorkContribution | null;
};

export const contributionStateMachine = setup({
  types: {
    events: {} as
      | { type: 'setActiveContribution'; contribution: ContributionContext['activeContribution'] }
      | { type: 'activeContribution.update'; contribution: ContributionContext['activeContribution'] }
      | { type: 'close' },
  },
}).createMachine({
  id: 'contributionEditor',
  context: {
    activeContribution: null,
  } as ContributionContext,
  initial: 'init',
  states: {
    init: {
      on: {
        setActiveContribution: {
          target: 'editing',
          actions: assign({
            activeContribution: ({ event }) => event?.contribution ?? null,
          }),
        },
      },
    },
    editing: {
      on: {
        close: { target: 'init', actions: assign({ activeContribution: () => null }) },
        'activeContribution.update': {
          actions: assign({
            activeContribution: ({ event }) => event?.contribution ?? null,
          }),
        },
      },
    },
  },
});
