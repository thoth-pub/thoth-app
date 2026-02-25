'use client';

import { skipToken, useQuery } from '@tanstack/react-query';

import { getDefaultWork, isDefaultId, QueryKeys, useServices, WorkTypes } from '@/src/shared';

import type { SetEntity, SetId } from '../../model/set.types';

const useSet = (setId: SetId) => {
  const isValidId = setId.length > 0 && !isDefaultId(setId);

  const { setService } = useServices();

  const {
    data = { ...getDefaultWork({ type: WorkTypes.enum.BookSet }), volumesCount: 0, covers: [] } as SetEntity,
    isLoading,
    error,
  } = useQuery({
    queryKey: [QueryKeys.set, setId],
    queryFn: isValidId ? () => setService.getSet(setId) : skipToken,
  });

  return { set: data, isLoading, error };
};

export default useSet;
