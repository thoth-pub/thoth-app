import { useWorkStateMachine } from '../work.store';

export const useWorkChaptersStateMachine = () => {
  const { activeEntity: activeWorkChapters, ...rest } = useWorkStateMachine();

  const isMultipleChaptersSelected = activeWorkChapters ? activeWorkChapters.length > 1 : false;

  const isSingleChapterSelected = activeWorkChapters ? activeWorkChapters.length === 1 : false;

  return { activeWorkChapters, isMultipleChaptersSelected, isSingleChapterSelected, ...rest };
};
