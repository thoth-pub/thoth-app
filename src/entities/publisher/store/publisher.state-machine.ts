import { assign, setup } from 'xstate';

import type { PublisherEntity, PublisherId } from '../model/publisher.types';

export type PublisherContext = {
  activePublisher: PublisherId | null;
  linkedPublishers: PublisherEntity[];
};

export const publisherStateMachine = setup({
  types: {
    events: {} as
      | {
          type: 'setLinkedPublishers';
          linkedPublishers: PublisherContext['linkedPublishers'];
        }
      | {
          type: 'activePublisher.update';
          publisherId: PublisherId;
        }
      | { type: 'resetLinkedPublishers' },
  },
}).createMachine({
  id: 'publisher',
  initial: 'init',
  context: {
    activePublisher: null,
    linkedPublishers: [],
  } as PublisherContext,
  states: {
    init: {
      on: {
        setLinkedPublishers: {
          target: 'authenticated',
          actions: assign({
            linkedPublishers: ({ event }) => event?.linkedPublishers ?? [],
            activePublisher: ({ event }) => event?.linkedPublishers[0]?.id ?? null,
          }),
        },
      },
    },

    authenticated: {
      on: {
        resetLinkedPublishers: {
          target: 'init',
          actions: assign({ activePublisher: () => null, linkedPublishers: () => [] }),
        },
        'activePublisher.update': {
          actions: assign({
            activePublisher: ({ event }) => event?.publisherId ?? null,
          }),
        },
      },
    },
  },
});
