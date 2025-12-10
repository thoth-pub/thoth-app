'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications, useQueryToken } from '@/src/shared/hooks';

const { LANGUAGE_DELETE_FAILED } = NOTIFICATIONS;

const useDeleteLanguage = () => {
  const queryToken = useQueryToken();
  const { sendErrorNotification } = useNotifications();
  const { languageService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (languageId: string) => {
      return languageService.deleteLanguage(queryToken, languageId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? LANGUAGE_DELETE_FAILED);
    },
  });

  return {
    deleteLanguage: mutateAsync,
    loading: isPending,
  };
};

export default useDeleteLanguage;
