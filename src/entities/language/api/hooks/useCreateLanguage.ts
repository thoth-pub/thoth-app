'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';
import { type BaseEditSectionProps } from '@/src/shared/types';

import { LanguageEntity } from '../../model/language.types';

const { LANGUAGE_CREATION_FAILED } = NOTIFICATIONS;

const useCreateLanguage = (props: BaseEditSectionProps) => {
  const { workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { languageService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: LanguageEntity) => {
      return languageService.createLanguage(data, workId);
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
