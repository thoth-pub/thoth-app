import { useCallback } from 'react';

import { FormStateMachineContext, Id } from '@/src/shared';

const useFormStateMachine = () => {
  const activeFormId = FormStateMachineContext.useSelector((state) => state.context.activeForm);
  const actorRef = FormStateMachineContext.useActorRef();

  const edit = useCallback(
    (formId: Id) => {
      actorRef.send({ type: 'setActiveFormId', id: formId });
    },
    [actorRef],
  );

  const close = useCallback(() => {
    actorRef.send({ type: 'close' });
  }, [actorRef]);

  return { activeFormId, edit, close };
};

export default useFormStateMachine;
