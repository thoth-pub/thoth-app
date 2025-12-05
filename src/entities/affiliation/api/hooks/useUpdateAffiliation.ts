'use client';

import { useMutation } from '@tanstack/react-query';

import { type QueryToken,useServices } from '@/src/shared';

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
