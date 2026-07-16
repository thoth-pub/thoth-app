import { assign, setup } from 'xstate';

import type { ImprintEntity } from '../../imprint';
import type { PublisherId } from '../model/publisher.types';

export type LinkedPublisher = {
  id: PublisherId;
  name: string;
  publisherAdmin: boolean;
  workLifecycle: boolean;
  cdnWrite: boolean;
  imprints: ImprintEntity[];
};

export type PublisherContext = {
  activePublisher: LinkedPublisher | null;
  linkedPublishers: LinkedPublisher[];
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
          publisher: LinkedPublisher;
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
          }),
        },
      },
    },

    authenticated: {
      on: {
        setLinkedPublishers: {
          actions: assign({
            linkedPublishers: ({ event }) => event?.linkedPublishers ?? [],
          }),
        },
        resetLinkedPublishers: {
          target: 'init',
          actions: assign({ activePublisher: () => null, linkedPublishers: () => [] }),
        },
        'activePublisher.update': {
          actions: assign({
            activePublisher: ({ event }) => event?.publisher ?? null,
          }),
        },
      },
    },
  },
});
