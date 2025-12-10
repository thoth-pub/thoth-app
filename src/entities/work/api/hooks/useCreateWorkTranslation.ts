'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { appConfig, getDefaultWork, LanguageRelation, QueryKeys, ROUTES, useServices, WorkStatuses } from '@/src/shared';
import { useQueryToken } from '@/src/shared/hooks';

import { WorkEntity, WorkId } from '../../model/work.types';

const useCreateWorkTranslation = () => {
  const { workService } = useServices();
  const queryToken = useQueryToken();
  const queryClient = useQueryClient();
  const router = useRouter();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ originalWorkId, translation }: { originalWorkId: WorkId; translation: WorkEntity }) => {
      return workService.createWorkTranslation(queryToken, originalWorkId, translation);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.books] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.booksCount] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.forthcomingBooksCount] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.publishedBooksCount] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.works] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.worksCount] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.serieses] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.seriesesCount] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.series] });

      router.push(ROUTES.WORK_PAGE(data.id));
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
      title: originalWork.title,
      fullTitle: originalWork.fullTitle,
      contributions: originalWork.contributions.map((contribution) => ({
        ...contribution,
        id: appConfig.defaultId,
      })),
      subjects: originalWork.subjects.map((subject) => ({
        ...subject,
        id: appConfig.defaultId,
      })),
      languages: originalLanguages,
      shortAbstract: originalWork.shortAbstract,
      longAbstract: originalWork.longAbstract,
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
