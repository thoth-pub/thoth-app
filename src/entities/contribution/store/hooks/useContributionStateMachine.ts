import { useCallback } from 'react';

import type { WorkContribution } from '@/src/entities/work/model/work.types';

import { ContributionStateMachineContext } from '../contribution.provider';

const useContributionStateMachine = () => {
  const activeContribution = ContributionStateMachineContext.useSelector((state) => state.context.activeContribution);
  const actorRef = ContributionStateMachineContext.useActorRef();

  const edit = useCallback(
    (contribution: WorkContribution) => {
      actorRef.send({ type: 'setActiveContribution', contribution: contribution });
    },
    [actorRef],
  );

  const close = useCallback(() => {
    actorRef.send({ type: 'close' });
  }, [actorRef]);

  return { activeContribution, edit, close };
};

export default useContributionStateMachine;
