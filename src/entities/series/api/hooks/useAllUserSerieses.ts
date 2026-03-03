import { useQuery } from '@tanstack/react-query';

import { useUser } from '@/src/entities/user';
import { QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';

const useAllUserSerieses = () => {
  const { seriesService } = useServices();
  const { user } = useUser();

  const publishersIds = user.linkedPublishers.map((publisher) => publisher.publisherId);

  const {
    data: serieses = [],
    error,
    isLoading,
  } = useQuery({
    queryKey: [QueryKeys.allUserSerieses, ...publishersIds],
    queryFn: () => seriesService.getAllSerieses({ publishersIds }),
    enabled: publishersIds.length > 0,
  });

  return { serieses, error, loading: isLoading };
};

export default useAllUserSerieses;
