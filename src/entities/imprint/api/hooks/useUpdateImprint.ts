import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CurrencyCode, LocaleCode } from '@/gql/graphql';
import { PublisherId } from '@/src/entities/publisher';
import { QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';

import { type ImprintId } from '../../model/imprint.types';

export type UpdateImprintData = {
  name: string;
  id: ImprintId;
  url?: string;
  crossmarkDoi?: string;
  defaultPlace?: string;
  defaultCurrency?: CurrencyCode;
  defaultLocale?: LocaleCode;
};

const useUpdateImprint = () => {
  const { imprintService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ data, publisherId }: { data: UpdateImprintData; publisherId: PublisherId }) => {
      return imprintService.updateImprint(data, publisherId);
    },
  });

  const updateImprint = async ({ data, publisherId }: { data: UpdateImprintData; publisherId: PublisherId }) => {
    await mutateAsync({ data, publisherId });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.publisherImprints, publisherId] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.userInfo] });
  };

  return {
    updateImprint,
    loading: isPending,
  };
};

export default useUpdateImprint;
