import { useCallback } from 'react';

import { SeriesEntity } from '../../model/series.types';
import { SeriesStateMachineContext } from '../series.provider';

const useSeriesStateMachine = () => {
  const activeSeries = SeriesStateMachineContext.useSelector((state) => state.context.activeSeries);
  const actorRef = SeriesStateMachineContext.useActorRef();

  const edit = useCallback(
    (series: SeriesEntity) => {
      actorRef.send({ type: 'setActiveSeries', series: series });
    },
    [actorRef],
  );

  const close = useCallback(() => {
    actorRef.send({ type: 'close' });
  }, [actorRef]);

  return { activeSeries, edit, close };
};

export default useSeriesStateMachine;
