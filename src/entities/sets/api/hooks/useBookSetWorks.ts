import { useQuery } from '@tanstack/react-query';

import { QueryKeys, useServices } from '@/src/shared';

import type { SetId } from '../../model/set.types';

export const useBookSetWorks = (setId: SetId) => {
  const { setService } = useServices();

  const {
    data = [],
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: [QueryKeys.bookSetWorks, setId],
    queryFn: () => setService.getBookSetWorks(setId),
  });

  return { bookSetWorks: data.sort((a, b) => a.ordinal - b.ordinal), isLoading, isFetching, error };
};
