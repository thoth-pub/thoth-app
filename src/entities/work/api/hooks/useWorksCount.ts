import { useQuery } from '@tanstack/react-query';

import type { PublisherId } from '@/src/entities/publisher';
import { QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';

import { WorkStatus, WorkType } from '../../model/work.types';

type UseWorksCountProps = {
  publishersIds: PublisherId[];
  filter?: string;
  workStatus?: WorkStatus;
  workTypes?: WorkType[];
};

const useWorksCount = (props: UseWorksCountProps) => {
  const { publishersIds, filter, workStatus, workTypes } = props;

  const { workService } = useServices();

  const { data: workCount = 0, error } = useQuery({
    queryKey: [QueryKeys.worksCount, ...publishersIds, filter, workStatus, workTypes],
    queryFn: () => workService.getWorksCount({ publishersIds, filter, workStatus, workTypes }),
    enabled: publishersIds.length > 0,
  });

  return { workCount, error };
};

export default useWorksCount;
