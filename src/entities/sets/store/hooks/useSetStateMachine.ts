import { useCallback } from 'react';
import { useUnmount } from 'react-use';

import { SetEntity } from '../../model/set.types';
import { SetStateMachineContext } from '../set.provider';

const useSetStateMachine = () => {
  const activeSet: SetEntity | null = SetStateMachineContext.useSelector((state) => state.context.activeSet);
  const actorRef = SetStateMachineContext.useActorRef();

  const edit = useCallback(
    (set: SetEntity) => {
      actorRef.send({ type: 'setActiveSet', set: set });
    },
    [actorRef],
  );

  const close = useCallback(() => {
    actorRef.send({ type: 'close' });
  }, [actorRef]);

  useUnmount(() => {
    close();
  });

  return { activeSet, edit, close };
};

export default useSetStateMachine;
