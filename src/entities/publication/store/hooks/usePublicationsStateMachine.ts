import { useCallback } from 'react';
import { useUnmount } from 'react-use';

import { PublicationEntity } from '../../model/publication.types';
import { PublicationsStateMachineContext } from '../publication.provider';

const usePublicationsStateMachine = () => {
  const activePublication: PublicationEntity | null = PublicationsStateMachineContext.useSelector(
    (state) => state.context.activePublication,
  );
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

  useUnmount(() => {
    close();
  });

  return { activePublication, edit, close };
};

export default usePublicationsStateMachine;
