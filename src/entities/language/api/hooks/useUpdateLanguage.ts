import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { WorkId } from '@/src/entities/work/model/work.types';
import { NOTIFICATIONS, QueryKeys, type QueryToken, useServices } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import { LanguageEntity } from '../../model/language.types';

type UseCreateLanguageProps = {
  queryToken: QueryToken;
  workId?: WorkId;
};

const { LANGUAGE_UPDATE_FAILED } = NOTIFICATIONS;

const useUpdateLanguage = (props: UseCreateLanguageProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { languageService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: LanguageEntity) => {
      return languageService.updateLanguage(queryToken, data, workId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? LANGUAGE_UPDATE_FAILED);
    },
  });

  return {
    updateLanguage: mutateAsync,
    loading: isPending,
  };
};

export default useUpdateLanguage;
