import { useCallback } from 'react';

import { ReferenceEntity } from '../../model/reference.types';
import { ReferenceStateMachineContext } from '../reference.provider';

const useReferencesStateMachine = () => {
  const activeReference = ReferenceStateMachineContext.useSelector((state) => state.context.activeReference);
  const actorRef = ReferenceStateMachineContext.useActorRef();

  const edit = useCallback(
    (reference: ReferenceEntity) => {
      actorRef.send({ type: 'setActiveReference', reference: reference });
    },
    [actorRef],
  );

  const close = useCallback(() => {
    actorRef.send({ type: 'close' });
  }, [actorRef]);

  return { activeReference, edit, close };
};

export default useReferencesStateMachine;
