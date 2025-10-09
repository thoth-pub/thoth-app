'use client';

import { useCallback } from 'react';

import { PublisherId } from '@/src/entities/publisher';

import { PublisherStateMachineContext } from '../publisher.provider';
import { PublisherContext } from '../publisher.state-machine';

const usePublisherStateMachine = () => {
  const linkedPublishers: PublisherContext['linkedPublishers'] = PublisherStateMachineContext.useSelector(
    (state) => state.context.linkedPublishers,
  );
  const activePublisher: PublisherContext['activePublisher'] = PublisherStateMachineContext.useSelector(
    (state) => state.context.activePublisher,
  );
  const actorRef = PublisherStateMachineContext.useActorRef();

  const setLinkedPublishers = useCallback(
    (publishers: PublisherContext['linkedPublishers']) => {
      actorRef.send({ type: 'setLinkedPublishers', linkedPublishers: publishers });
    },
    [actorRef],
  );

  const resetLinkedPublishers = useCallback(() => {
    actorRef.send({ type: 'resetLinkedPublishers' });
  }, [actorRef]);

  const changeActivePublisher = useCallback(
    (publisherId: PublisherId) => {
      actorRef.send({ type: 'activePublisher.update', publisherId });
    },
    [actorRef],
  );

  return { linkedPublishers, activePublisher, resetLinkedPublishers, changeActivePublisher, setLinkedPublishers };
};

export default usePublisherStateMachine;
