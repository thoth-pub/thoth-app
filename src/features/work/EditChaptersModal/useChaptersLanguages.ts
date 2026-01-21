import { useMutation, useQueryClient } from '@tanstack/react-query';

import { LanguageCode } from '@/gql/graphql';
import { useWorkChaptersStateMachine } from '@/src/entities/work';
import { NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications, useQueryToken } from '@/src/shared/hooks';

import { LanguageEntity, LanguagesForm } from '../../../entities/language/model/language.types';

const { LANGUAGE_CREATION_FAILED, LANGUAGE_DELETE_FAILED } = NOTIFICATIONS;

export const useChaptersLanguages = () => {
  const { activeWorkChapters } = useWorkChaptersStateMachine();

  const { languageService } = useServices();
  const { sendErrorNotification } = useNotifications();
  const queryClient = useQueryClient();
  const queryToken = useQueryToken();

  const { mutateAsync: createLanguage, isPending: isCreatingLanguage } = useMutation({
    mutationFn: async (data: { language: LanguageEntity; chapterId: string }) => {
      return languageService.createLanguage(queryToken, data.language, data.chapterId);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? LANGUAGE_CREATION_FAILED);
    },
  });

  const { mutateAsync: deleteLanguage, isPending: isDeletingLanguage } = useMutation({
    mutationFn: async (languageId: string) => {
      return languageService.deleteLanguage(queryToken, languageId);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? LANGUAGE_DELETE_FAILED);
    },
  });

  const updateLanguages = async (data: LanguagesForm) => {
    if (!activeWorkChapters) return;

    const deletionPromises = activeWorkChapters.map((chapter) => {
      return chapter.languages.map((language) => {
        return deleteLanguage(language.id);
      });
    });

    await Promise.all(deletionPromises);

    const creationPromises = activeWorkChapters.map((chapter) => {
      return data.languages.map(({ language: { value }, languageRelation }) => {
        return createLanguage({
          language: {
            id: '',
            code: value as LanguageCode,
            relation: languageRelation,
            isMain: true,
          },
          chapterId: chapter.id,
        });
      });
    });

    await Promise.all(creationPromises);

    queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
  };

  const findSameLanguages = (languageId: string) => {
    if (!activeWorkChapters) return [];

    const allLanguages = activeWorkChapters.flatMap((chapter) => chapter.languages);
    const language = allLanguages.find((language) => language.id === languageId);

    if (!language) return [];

    const sameLanguages = allLanguages.filter(
      (existingLanguage) => existingLanguage.code === language.code && existingLanguage.relation === language.relation,
    );

    return sameLanguages;
  };

  const deleteLanguages = async (languageId: string) => {
    const sameLanguages = findSameLanguages(languageId);

    const promises = sameLanguages.map((language) => deleteLanguage(language.id));

    await Promise.all(promises);

    queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
  };

  return {
    updateLanguages,
    deleteLanguages,
    loading: isCreatingLanguage || isDeletingLanguage,
  };
};
