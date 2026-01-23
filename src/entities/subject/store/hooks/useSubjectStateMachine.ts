import { useCallback } from 'react';
import { useUnmount } from 'react-use';

import { SubjectEntity } from '../../model/subject.types';
import { SubjectStateMachineContext } from '../subject.provider';

const useSubjectStateMachine = () => {
  const activeSubject: SubjectEntity | null = SubjectStateMachineContext.useSelector(
    (state) => state.context.activeSubject,
  );
  const actorRef = SubjectStateMachineContext.useActorRef();

  const edit = useCallback(
    (subject: SubjectEntity) => {
      actorRef.send({ type: 'setActiveSubject', subject: subject });
    },
    [actorRef],
  );

  const close = useCallback(() => {
    actorRef.send({ type: 'close' });
  }, [actorRef]);

  useUnmount(() => {
    close();
  });

  return { activeSubject, edit, close };
};

export default useSubjectStateMachine;
