'use client';

import { NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { ReferenceEntity } from '../../model/reference.types';
import { ReferenceService } from '../reference.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const { REFERENCE_CREATION_FAILED } = NOTIFICATIONS;

const useCreateReference = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { referenceService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: ReferenceEntity) => {
      return referenceService.createReference(queryToken, data, workId);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? REFERENCE_CREATION_FAILED);
    },
  });

  return {
    createReference: mutateAsync,
    loading: isPending,
  };
};

export default useCreateReference;
