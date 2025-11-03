import { useCallback } from 'react';

import { WorkChaptersStateMachineContext } from '../work.provider';
import { WorkEntity } from '../../model/work.types';
import { isDefaultId } from '@/src/shared';

const useWorkChaptersStateMachine = () => {
  const activeWorkChapters: WorkEntity[] | null = WorkChaptersStateMachineContext.useSelector(
    (state) => state.context.activeChapters,
  );
  const actorRef = WorkChaptersStateMachineContext.useActorRef();

  const isChapterSelected = activeWorkChapters ? activeWorkChapters.length > 0 : false;

  const isSingleExistingChapterSelected = activeWorkChapters
    ? activeWorkChapters.length === 1 && !isDefaultId(activeWorkChapters[0].id)
    : false;

  const isMultipleChaptersSelected = activeWorkChapters ? activeWorkChapters.length > 1 : false;

  const isNewChapterSelected = activeWorkChapters
    ? activeWorkChapters.length === 1 && isDefaultId(activeWorkChapters[0].id)
    : false;

  const edit = useCallback(
    (workChapters: WorkEntity[]) => {
      actorRef.send({ type: 'setActiveWorkChapters', chapters: workChapters });
    },
    [actorRef],
  );

  const close = useCallback(() => {
    actorRef.send({ type: 'close' });
  }, [actorRef]);

  return {
    activeWorkChapters,
    isChapterSelected,
    isMultipleChaptersSelected,
    isNewChapterSelected,
    isSingleExistingChapterSelected,
    edit,
    close,
  };
};

export default useWorkChaptersStateMachine;
