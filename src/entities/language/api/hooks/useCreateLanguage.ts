'use client';

import { type BaseEditSectionProps, NOTIFICATIONS, QueryKeys } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import { LanguageEntity } from '../../model/language.types';
import { LanguageService } from '../service';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const { LANGUAGE_CREATION_FAILED } = NOTIFICATIONS;

const languageService = new LanguageService();

const useCreateLanguage = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();

  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: LanguageEntity) => {
      return languageService.createLanguage(queryToken, data, workId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? LANGUAGE_CREATION_FAILED);
    },
  });

  return {
    createLanguage: mutateAsync,
    loading: isPending,
  };
};

export default useCreateLanguage;
