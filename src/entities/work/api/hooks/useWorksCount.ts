import { useSuspenseQuery } from '@apollo/client/react';

import type { PublisherId } from '@/src/entities/publisher';

import { GET_WORKS_COUNT } from '../../model/work.schema';
import { WorkStatus, WorkType } from '../../model/work.types';

type UseWorksCountProps = {
  publishersIds: PublisherId[];
  filter?: string;
  workStatus?: WorkStatus;
  workTypes?: WorkType[];
};

const useWorksCount = (props: UseWorksCountProps) => {
  const { publishersIds, filter, workStatus, workTypes } = props;

  const { data: { workCount } = { workCount: 0 }, error } = useSuspenseQuery(GET_WORKS_COUNT, {
    variables: { publishers: publishersIds, filter, workStatus, workTypes },
    skip: publishersIds.length === 0,
  });

  return { workCount, error };
};

export default useWorksCount;
