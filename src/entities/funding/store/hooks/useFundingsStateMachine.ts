import { useCallback } from 'react';
import { useUnmount } from 'react-use';

import { FundingEntity } from '../../model/funding.types';
import { FundingStateMachineContext } from '../funding.provider';

const useFundingsStateMachine = () => {
  const activeFunding: FundingEntity | null = FundingStateMachineContext.useSelector(
    (state) => state.context.activeFunding,
  );
  const actorRef = FundingStateMachineContext.useActorRef();

  const edit = useCallback(
    (funding: FundingEntity) => {
      actorRef.send({ type: 'setActiveFunding', funding: funding });
    },
    [actorRef],
  );

  const update = useCallback(
    (funding: FundingEntity) => {
      actorRef.send({ type: 'activeFunding.update', funding: funding });
    },
    [actorRef],
  );

  const close = useCallback(() => {
    actorRef.send({ type: 'close' });
  }, [actorRef]);

  useUnmount(() => {
    close();
  });

  return { activeFunding, edit, update, close };
};

export default useFundingsStateMachine;
