import { useCallback } from 'react';
import { useUnmount } from 'react-use';

import { WorkChaptersStateMachineContext } from '../work.provider';
import { WorkEntity } from '../../model/work.types';

const useWorkChaptersStateMachine = () => {
  const activeWorkChapters: WorkEntity[] | null = WorkChaptersStateMachineContext.useSelector(
    (state) => state.context.activeChapters,
  );
  const actorRef = WorkChaptersStateMachineContext.useActorRef();

  const isSingleChapterSelected = activeWorkChapters ? activeWorkChapters.length === 1 : false;

  const isMultipleChaptersSelected = activeWorkChapters ? activeWorkChapters.length > 1 : false;

  const close = useCallback(() => {
    actorRef.send({ type: 'close' });
  }, [actorRef]);

  const edit = useCallback(
    (workChapters: WorkEntity[]) => {
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
