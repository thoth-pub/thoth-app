'use client';

import { useMutation } from '@tanstack/react-query';

import { useServices } from '@/src/shared';
import { useQueryToken } from '@/src/shared/hooks';

import { AffiliationEntity } from '../../model/affiliation.types';

const useUpdateAffiliation = () => {
  const queryToken = useQueryToken();
  const { affiliationService } = useServices();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: AffiliationEntity) => {
      return affiliationService.updateAffiliation({ token: queryToken, data });
    },
  });

  return {
    updateAffiliation: mutateAsync,
    loading: isPending,
  };
};

export default useUpdateAffiliation;
