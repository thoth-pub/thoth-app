import { assign, setup } from 'xstate';

import type { LocationEntity } from '../model/location.types';

type LocationContext = {
  activeLocation: LocationEntity | null;
};

export const locationStateMachine = setup({
  types: {
    events: {} as { type: 'setActiveLocation'; location: LocationContext['activeLocation'] } | { type: 'close' },
  },
}).createMachine({
  id: 'locationEditor',
  context: {
    activeLocation: null,
  } as LocationContext,
  initial: 'init',
  states: {
    init: {
      on: {
        setActiveLocation: {
          target: 'editing',
          actions: assign({
            activeLocation: ({ event }) => event?.location ?? null,
          }),
        },
      },
    },
    editing: {
      on: { close: { target: 'init', actions: assign({ activeLocation: () => null }) } },
    },
  },
});
