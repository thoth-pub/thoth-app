/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback } from 'react';
import { useUnmount } from 'react-use';

import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';

import { WorkEntity } from '../../model/work.types';
import { WorkChaptersStateMachineContext } from '../work.provider';

const useWorkChaptersStateMachine = () => {
  const activeWorkChapters: WorkEntity[] | null = WorkChaptersStateMachineContext.useSelector(
    (state) => state.context.activeChapters,
  );
  const actorRef = WorkChaptersStateMachineContext.useActorRef();

  const { close: closeForm } = useFormStateMachine();

  const isSingleChapterSelected = activeWorkChapters ? activeWorkChapters.length === 1 : false;

  const isMultipleChaptersSelected = activeWorkChapters ? activeWorkChapters.length > 1 : false;

  const close = useCallback(() => {
    actorRef.send({ type: 'close' });
  }, [actorRef]);

  const edit = useCallback(
    (workChapters: WorkEntity[]) => {
      closeForm();
      actorRef.send({ type: 'setActiveWorkChapters', chapters: workChapters });
    },
    [actorRef],
  );

  const update = useCallback(
    (workChapters: WorkEntity[]) => {
      actorRef.send({ type: 'activeChapters.update', chapters: workChapters });
    },
    [actorRef],
  );

  useUnmount(() => {
    close();
  });

  return {
    activeWorkChapters,
    isMultipleChaptersSelected,
    isSingleChapterSelected,
    edit,
    update,
    close,
  };
};

export default useWorkChaptersStateMachine;
