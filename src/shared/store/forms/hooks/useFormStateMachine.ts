import { useCallback } from 'react';
import { useUnmount } from 'react-use';

import type { Id } from '@/src/shared/interfaces';

import { FormStateMachineContext } from '../forms.provider';

const useFormStateMachine = () => {
  const activeFormId: Id | null = FormStateMachineContext.useSelector((state) => state.context.activeForm);
  const actorRef = FormStateMachineContext.useActorRef();

  const edit = useCallback(
    (formId: Id) => {
      actorRef.send({ type: 'setActiveFormId', id: formId });
    },
    [actorRef],
  );

  const closeForm = useCallback(() => {
    actorRef.send({ type: 'close' });
  }, [actorRef]);

  useUnmount(() => {
    closeForm();
  });

  return { activeFormId, edit, closeForm };
};

export default useFormStateMachine;
