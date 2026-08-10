import { useCallback } from 'react';
import { useUnmount } from 'react-use';

import type { Id } from '@/src/shared/interfaces';

import { FormStateMachineContext } from '../forms.provider';

export const useRequestFormAttention = () => {
  const actorRef = FormStateMachineContext.useActorRef();

  return useCallback(() => {
    actorRef.send({ type: 'requestAttention' });
  }, [actorRef]);
};

const useFormStateMachine = () => {
  const activeFormId: Id | null = FormStateMachineContext.useSelector((state) => state.context.activeForm);
  const attentionRequest = FormStateMachineContext.useSelector((state) => state.context.attentionRequest);
  const actorRef = FormStateMachineContext.useActorRef();
  const requestAttention = useRequestFormAttention();

  const edit = useCallback(
    (formId: Id) => {
      const isEditing = actorRef.getSnapshot().value === 'editing';

      actorRef.send({ type: 'setActiveFormId', id: formId });

      return !isEditing;
    },
    [actorRef],
  );

  const closeForm = useCallback(() => {
    actorRef.send({ type: 'close' });
  }, [actorRef]);

  useUnmount(() => {
    closeForm();
  });

  return { activeFormId, attentionRequest, edit, closeForm, requestAttention };
};

export default useFormStateMachine;
