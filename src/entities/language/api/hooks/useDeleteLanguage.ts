'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { WorkId } from '@/src/entities/work/model/work.types';
import { NOTIFICATIONS, QueryKeys, type QueryToken, useServices } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

type UseDeleteLanguageProps = {
  queryToken: QueryToken;
  workId?: WorkId;
};

const { LANGUAGE_DELETE_FAILED } = NOTIFICATIONS;

const useDeleteLanguage = (props: UseDeleteLanguageProps) => {
  const { queryToken } = props;

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
