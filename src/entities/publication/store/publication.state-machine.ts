import { assign, setup } from 'xstate';

import type { PublicationEntity } from '../model/publication.types';

type PublicationContext = {
  activePublication: PublicationEntity | null;
};

export const publicationStateMachine = setup({
  types: {
    events: {} as
      | { type: 'setActivePublication'; publication: PublicationContext['activePublication'] }
      | { type: 'close' },
  },
}).createMachine({
  id: 'publicationEditor',
  context: {
    activePublication: null,
  } as PublicationContext,
  initial: 'init',
  states: {
    init: {
      on: {
        setActivePublication: {
          target: 'editing',
          actions: assign({
            activePublication: ({ event }) => event?.publication ?? null,
          }),
        },
      },
    },
    editing: {
      on: { close: { target: 'init', actions: assign({ activePublication: () => null }) } },
    },
  },
});
