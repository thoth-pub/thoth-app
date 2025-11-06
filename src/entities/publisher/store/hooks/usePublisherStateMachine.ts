'use client';

import { useCallback, useMemo } from 'react';

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
  const isSuperAdmin: PublisherContext['isSuperAdmin'] = PublisherStateMachineContext.useSelector(
    (state) => state.context.isAdmin,
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
    (publisherId: PublisherId) => {
      actorRef.send({ type: 'activePublisher.update', publisherId });
    },
    [actorRef],
  );

  const isAdmin = useMemo(() => {
    return (isSuperAdmin || linkedPublishers.find((publisher) => publisher.id === activePublisher)?.isAdmin) ?? false;
  }, [linkedPublishers, isSuperAdmin, activePublisher]);

  return {
    linkedPublishers,
    activePublisher,
    isAdmin,
    isSuperAdmin,
    resetLinkedPublishers,
    changeActivePublisher,
    setLinkedPublishers,
  };
};

export default usePublisherStateMachine;
