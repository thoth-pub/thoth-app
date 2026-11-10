import { useQuery } from '@tanstack/react-query';

import { useUser } from '@/src/entities/user';
import { QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';

const useAllUserSerieses = () => {
  const { seriesService } = useServices();
  // Keyed on the settled identity: the empty user of a loading `me` or a token rotation would read as "no Series".
  const { identitySettled, settledUser } = useUser();

  const publishersIds = (settledUser?.linkedPublishers ?? []).map((publisher) => publisher.publisherId);

  const {
    data: serieses = [],
    error,
    isLoading,
  } = useQuery({
    queryKey: [QueryKeys.allUserSerieses, ...publishersIds],
    queryFn: () => seriesService.getAllSerieses({ publishersIds }),
    enabled: publishersIds.length > 0,
  });

  return { serieses, error, loading: !identitySettled || isLoading };
};

export default useAllUserSerieses;
