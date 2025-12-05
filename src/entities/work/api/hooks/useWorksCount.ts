import type { PublisherId } from '@/src/entities/publisher';

import { WorkStatus, WorkType } from '../../model/work.types';
import { useSuspenseQuery } from '@tanstack/react-query';
import { QueryKeys, useServices } from '@/src/shared';

type UseWorksCountProps = {
  publishersIds: PublisherId[];
  isAdmin: boolean;
  filter?: string;
  workStatus?: WorkStatus;
  workTypes?: WorkType[];
};

const useWorksCount = (props: UseWorksCountProps) => {
  const { publishersIds, isAdmin = false, filter, workStatus, workTypes } = props;

  const { workService } = useServices();

  const { data: workCount = 0, error } = useSuspenseQuery({
    queryKey: [QueryKeys.worksCount, ...publishersIds, isAdmin, filter, workStatus, workTypes],
    queryFn: () => workService.getWorksCount({ publishersIds, filter, workStatus, workTypes }),
  });

  return { workCount, error };
};

export default useWorksCount;
