'use client';

import { useCallback } from 'react';

import { PublisherStateMachineContext } from '../publisher.provider';
import { LinkedPublisher, PublisherContext } from '../publisher.state-machine';

const usePublisherStateMachine = () => {
  const linkedPublishers: PublisherContext['linkedPublishers'] = PublisherStateMachineContext.useSelector(
    (state) => state.context.linkedPublishers,
  );
  const activePublisher: PublisherContext['activePublisher'] = PublisherStateMachineContext.useSelector(
    (state) => state.context.activePublisher,
  );
  const actorRef = PublisherStateMachineContext.useActorRef();

  const setLinkedPublishers = useCallback(
    (publishers: PublisherContext['linkedPublishers'], isSuperAdmin: boolean) => {
      actorRef.send({ type: 'setLinkedPublishers', linkedPublishers: publishers, isSuperAdmin });
    },
    [actorRef],
  );

  const resetLinkedPublishers = useCallback(() => {
    actorRef.send({ type: 'resetLinkedPublishers' });
  }, [actorRef]);

  const changeActivePublisher = useCallback(
    (publisher: LinkedPublisher) => {
      actorRef.send({ type: 'activePublisher.update', publisher });
    },
    [actorRef],
  );

  return {
    linkedPublishers,
    activePublisher,
    resetLinkedPublishers,
    changeActivePublisher,
    setLinkedPublishers,
  };
};

export default usePublisherStateMachine;
