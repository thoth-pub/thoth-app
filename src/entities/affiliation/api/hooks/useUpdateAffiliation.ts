'use client';

import { useMutation } from '@tanstack/react-query';

import { useServices } from '@/src/shared';

import { AffiliationEntity } from '../../model/affiliation.types';

const useUpdateAffiliation = () => {
  const { affiliationService } = useServices();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: AffiliationEntity) => {
      return affiliationService.updateAffiliation(data);
    },
  });

  return {
    updateAffiliation: mutateAsync,
    loading: isPending,
  };
};

export default useUpdateAffiliation;
