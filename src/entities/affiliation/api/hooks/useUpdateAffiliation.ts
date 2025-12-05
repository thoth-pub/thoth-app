'use client';

import { useServices, type QueryToken } from '@/src/shared';

import { useMutation } from '@tanstack/react-query';
import { AffiliationEntity } from '../../model/affiliation.types';

type UseCreateAffiliationProps = {
  queryToken: QueryToken;
};

const useUpdateAffiliation = (props: UseCreateAffiliationProps) => {
  const { queryToken } = props;

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
