'use client';

import { useCallback } from 'react';

import { UiStateMachineContext } from '../ui.provider';

const useUIStateMachine = () => {
  const isExpanded = UiStateMachineContext.useSelector((state) => state.context.isExpanded);
  const actorRef = UiStateMachineContext.useActorRef();

  const update = useCallback(() => {
    actorRef.send({ type: 'setIsExpanded.update' });
  }, [actorRef]);

  return { isExpanded, update };
};

export default useUIStateMachine;
