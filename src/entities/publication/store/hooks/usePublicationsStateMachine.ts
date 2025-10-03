import { useCallback } from 'react';

import { PublicationEntity } from '../../model/publication.types';
import { PublicationsStateMachineContext } from '../publication.provider';

const usePublicationsStateMachine = () => {
  const activePublication = PublicationsStateMachineContext.useSelector((state) => state.context.activePublication);
  const actorRef = PublicationsStateMachineContext.useActorRef();

  const edit = useCallback(
    (publication: PublicationEntity) => {
      actorRef.send({ type: 'setActivePublication', publication: publication });
    },
    [actorRef],
  );

  const close = useCallback(() => {
    actorRef.send({ type: 'close' });
  }, [actorRef]);

  return { activePublication, edit, close };
};

export default usePublicationsStateMachine;
