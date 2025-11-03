import { assign, setup } from 'xstate';

import { WorkEntity } from '../model/work.types';

type WorkChaptersContext = {
  activeChapters: WorkEntity[] | null;
};

export const workChaptersStateMachine = setup({
  types: {
    events: {} as
      | { type: 'setActiveWorkChapters'; chapters: WorkChaptersContext['activeChapters'] }
      | { type: 'close' },
  },
}).createMachine({
  id: 'workChaptersEditor',
  context: {
    activeChapters: null,
  } as WorkChaptersContext,
  initial: 'init',
  states: {
    init: {
      on: {
        setActiveWorkChapters: {
          target: 'editing',
          actions: assign({
            activeChapters: ({ event }) => event?.chapters ?? null,
          }),
        },
      },
    },
    editing: {
      on: { close: { target: 'init', actions: assign({ activeChapters: () => null }) } },
    },
  },
});
