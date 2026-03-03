'use client';

import { skipToken, useQuery } from '@tanstack/react-query';

import { QueryKeys, WorkTypes } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { getDefaultWork, isDefaultId } from '@/src/shared/utils';

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
