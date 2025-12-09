import { useCallback } from 'react';
import { useUnmount } from 'react-use';

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

  const update = useCallback(
    (reference: ReferenceEntity) => {
      actorRef.send({ type: 'activeReference.update', reference: reference });
    },
    [actorRef],
  );

  const close = useCallback(() => {
    actorRef.send({ type: 'close' });
  }, [actorRef]);

  useUnmount(() => {
    close();
  });

  return { activeReference, edit, update, close };
};

export default useReferencesStateMachine;
