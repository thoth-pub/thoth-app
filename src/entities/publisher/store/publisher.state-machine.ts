import { assign, setup } from 'xstate';

import type { PublisherId } from '../model/publisher.types';

type LinkedPublisher = {
  id: PublisherId;
  name: string;
  publisherAdmin: boolean;
  workLifecycle: boolean;
  cdnWrite: boolean;
};

export type PublisherContext = {
  activePublisher: PublisherId | null;
  linkedPublishers: LinkedPublisher[];
  isSuperAdmin: boolean;
};

export const publisherStateMachine = setup({
  types: {
    events: {} as
      | {
          type: 'setLinkedPublishers';
          linkedPublishers: PublisherContext['linkedPublishers'];
          isSuperAdmin: boolean;
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
    isSuperAdmin: false,
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
          actions: assign({ activePublisher: () => null, linkedPublishers: () => [], isSuperAdmin: false }),
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
