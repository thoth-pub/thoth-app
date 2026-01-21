'use client';
import { useMutation } from '@tanstack/react-query';

import type { ContributionId } from '@/src/entities/contributor/model/contributor.types';
import { NOTIFICATIONS, useServices } from '@/src/shared';
import { useNotifications, useQueryToken } from '@/src/shared/hooks';

import { BiographyEntity } from '../../model/contribution.types';

const { BIOGRAPHY_CREATION_FAILED } = NOTIFICATIONS;

export const useCreateBiography = () => {
  const { sendErrorNotification } = useNotifications();
  const queryToken = useQueryToken();
  const { contributionService } = useServices();

  const { mutateAsync: createBiography, isPending } = useMutation({
    mutationFn: async ({
      data,
      contributionId,
    }: {
      data: BiographyEntity;
      contributionId: ContributionId;
    }) => {
      return contributionService.createBiography(queryToken, data, contributionId);
    },
    onSuccess: () => { },
    onError: (error) => {
      sendErrorNotification(error?.message ?? BIOGRAPHY_CREATION_FAILED);
    },
  });

  return { createBiography, loading: isPending };
};
