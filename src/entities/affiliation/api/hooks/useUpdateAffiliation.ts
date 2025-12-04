'use client';

import { type QueryToken } from '@/src/shared';

import { useMutation } from '@tanstack/react-query';
import { AffiliationEntity } from '../../model/affiliation.types';
import { AffiliationService } from '../affiliation.service';

type UseCreateAffiliationProps = {
  queryToken: QueryToken;
};

const affiliationService = new AffiliationService();

const useUpdateAffiliation = (props: UseCreateAffiliationProps) => {
  const { queryToken } = props;

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
