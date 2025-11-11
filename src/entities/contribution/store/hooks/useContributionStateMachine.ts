import { useCallback } from 'react';

import type { WorkContribution } from '@/src/entities/work/model/work.types';

import { ContributionStateMachineContext } from '../contribution.provider';

const useContributionStateMachine = () => {
  const activeContribution: WorkContribution | null = ContributionStateMachineContext.useSelector(
    (state) => state.context.activeContribution,
  );
  const actorRef = ContributionStateMachineContext.useActorRef();

  const edit = useCallback(
    (contribution: WorkContribution) => {
      actorRef.send({ type: 'setActiveContribution', contribution: contribution });
    },
    [actorRef],
  );

  const update = useCallback(
    (contribution: WorkContribution) => {
      actorRef.send({ type: 'activeContribution.update', contribution: contribution });
    },
    [actorRef],
  );

  const close = useCallback(() => {
    actorRef.send({ type: 'close' });
  }, [actorRef]);

  return { activeContribution, edit, update, close };
};

export default useContributionStateMachine;
