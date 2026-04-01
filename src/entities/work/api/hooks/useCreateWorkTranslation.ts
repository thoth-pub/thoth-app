'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { appConfig } from '@/src/shared/config';
import { LanguageRelation, NOTIFICATIONS, QueryKeys, ROUTES, WorkStatuses } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';
import { getDefaultWork } from '@/src/shared/utils';

import { WorkEntity, WorkId } from '../../model/work.types';

const { WORK_TRANSLATION_CREATION_SUCCESS, WORK_TRANSLATION_CREATION_FAILED } = NOTIFICATIONS;

const useCreateWorkTranslation = () => {
  const { workService } = useServices();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { sendSuccessNotification, sendErrorNotification } = useNotifications();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ originalWorkId, translation }: { originalWorkId: WorkId; translation: WorkEntity }) => {
      return workService.createWorkTranslation(originalWorkId, translation);
    },
    onSuccess: (data) => {
      sendSuccessNotification(WORK_TRANSLATION_CREATION_SUCCESS);
      queryClient.invalidateQueries({ queryKey: [QueryKeys.books] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.booksCount] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.forthcomingBooksCount] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.publishedBooksCount] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.latestUpdatedBooks] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.latestPublishedBooks] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.works] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.worksCount] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.serieses] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.seriesesCount] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.series] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workTranslations] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.translatedWorks] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.sets] });

      router.push(ROUTES.WORK_PAGE(data.id));
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? WORK_TRANSLATION_CREATION_FAILED);
    },
  });

  const createWorkTranslation = async (originalWork: WorkEntity) => {
    const originalLanguages = originalWork.languages
      .filter((language) => language.relation === LanguageRelation.enum.Original)
      .map((language) => ({
        ...language,
        relation: LanguageRelation.enum.TranslatedFrom,
        id: appConfig.defaultId,
      }));

    const defaultWork = getDefaultWork({
      status: WorkStatuses.enum.Forthcoming,
      type: originalWork.type,
      titles: originalWork.titles.map((title) => ({
        ...title,
        id: appConfig.defaultId,
      })),
      contributions: originalWork.contributions.map((contribution) => ({
        ...contribution,
        id: appConfig.defaultId,
      })),
      subjects: originalWork.subjects.map((subject) => ({
        ...subject,
        id: appConfig.defaultId,
      })),
      languages: originalLanguages,
      abstracts: originalWork.abstracts.map((abstract) => ({
        ...abstract,
        id: appConfig.defaultId,
      })),
      imprintId: originalWork.imprintId,
    });

    await mutateAsync({ originalWorkId: originalWork.id, translation: defaultWork });
  };

  return {
    createWorkTranslation,
    loading: isPending,
  };
};

export default useCreateWorkTranslation;
