import { useCallback } from 'react';
import { useUnmount } from 'react-use';

import { LocationEntity } from '../../model/location.types';
import { LocationStateMachineContext } from '../location.provider';

const useLocationStateMachine = () => {
  const activeLocation: LocationEntity | null = LocationStateMachineContext.useSelector((state) => state.context.activeLocation);
  const actorRef = LocationStateMachineContext.useActorRef();

  const edit = useCallback(
    (location: LocationEntity) => {
      actorRef.send({ type: 'setActiveLocation', location: location });
    },
    [actorRef],
  );

  const close = useCallback(() => {
    actorRef.send({ type: 'close' });
  }, [actorRef]);

  useUnmount(() => {
    close();
  });

  return { activeLocation, edit, close };
};

export default useLocationStateMachine;
