import { useCallback } from 'react';

import { FundingEntity } from '../../model/funding.type';
import { FundingStateMachineContext } from '../funding.provider';

const useFundingsStateMachine = () => {
  const activeFunding = FundingStateMachineContext.useSelector((state) => state.context.activeFunding);
  const actorRef = FundingStateMachineContext.useActorRef();

  const edit = useCallback(
    (funding: FundingEntity) => {
      actorRef.send({ type: 'setActiveFunding', funding: funding });
    },
    [actorRef],
  );

  const close = useCallback(() => {
    actorRef.send({ type: 'close' });
  }, [actorRef]);

  return { activeFunding, edit, close };
};

export default useFundingsStateMachine;
