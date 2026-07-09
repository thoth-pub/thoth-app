import { useMutation, useQueryClient } from '@tanstack/react-query';

import { LanguageCode } from '@/gql/graphql';
import { useWorkChaptersStateMachine } from '@/src/entities/work/store/hooks/useWorkChaptersStateMachine';
import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';

import { LanguageEntity, LanguagesForm } from '../../../entities/language/model/language.types';

const { LANGUAGE_CREATION_FAILED, LANGUAGE_UPDATE_FAILED, LANGUAGE_DELETE_FAILED } = NOTIFICATIONS;

export const useChaptersLanguages = () => {
  const { activeWorkChapters } = useWorkChaptersStateMachine();

  const { languageService } = useServices();
  const { sendErrorNotification } = useNotifications();
  const queryClient = useQueryClient();

  const { mutateAsync: createLanguage, isPending: isCreatingLanguage } = useMutation({
    mutationFn: async (data: { language: LanguageEntity; chapterId: string }) => {
      return languageService.createLanguage(data.language, data.chapterId);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? LANGUAGE_CREATION_FAILED);
    },
  });

  const { mutateAsync: updateLanguage, isPending: isUpdatingLanguage } = useMutation({
    mutationFn: async (data: { language: LanguageEntity; chapterId: string }) => {
      return languageService.updateLanguage(data.language, data.chapterId);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? LANGUAGE_UPDATE_FAILED);
    },
  });

  const { mutateAsync: deleteLanguage, isPending: isDeletingLanguage } = useMutation({
    mutationFn: async (languageId: string) => {
      return languageService.deleteLanguage(languageId);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? LANGUAGE_DELETE_FAILED);
    },
  });

  const updateLanguages = async (data: LanguagesForm) => {
    if (!activeWorkChapters) return;

    const desiredLanguages = data.languages.map(({ language: { value }, languageRelation }) => ({
      code: value as LanguageCode,
      relation: languageRelation,
    }));
    const desiredCodes = desiredLanguages.map(({ code }) => code);

    try {
      for (const chapter of activeWorkChapters) {
        const languagesToDelete = chapter.languages.filter(({ code }) => !desiredCodes.includes(code));
        const newLanguages = desiredLanguages.filter(
          ({ code }) => !chapter.languages.some((language) => language.code === code),
        );
        const updatedLanguages = desiredLanguages.flatMap(({ code, relation }) => {
          const existingLanguage = chapter.languages.find((language) => language.code === code);

          if (!existingLanguage || existingLanguage.relation === relation) return [];

          return [{ ...existingLanguage, relation }];
        });

        // Each work allows one entry per language code, so removed codes are deleted
        // before the remaining entries are updated or created.
        await Promise.all(languagesToDelete.map(({ id }) => deleteLanguage(id)));
        await Promise.all(updatedLanguages.map((language) => updateLanguage({ language, chapterId: chapter.id })));
        await Promise.all(
          newLanguages.map(({ code, relation }) =>
            createLanguage({ language: { id: '', code, relation }, chapterId: chapter.id }),
          ),
        );
      }
    } catch {
      // The mutations surface error notifications; the remaining chapters are skipped
      // and the invalidation below resyncs local state with whatever was persisted.
    }

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
    loading: isCreatingLanguage || isUpdatingLanguage || isDeletingLanguage,
  };
};
