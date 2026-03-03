'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { appConfig } from '@/src/shared/config';
import { QueryKeys, WorkStatuses } from '@/src/shared/constants';
import { ROUTES } from '@/src/shared/constants/routes';
import { useServices } from '@/src/shared/context';
import { getDefaultWork } from '@/src/shared/utils';

import { WorkEntity } from '../../model/work.types';

const useCreateNewWorkEdition = () => {
  const { workService } = useServices();
  const router = useRouter();

  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ originalWork, edition }: { originalWork: WorkEntity; edition: WorkEntity }) => {
      return workService.createNewWorkEdition(originalWork, edition);
    },
    onSuccess: (data) => {
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
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workEditions] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workPrevEditions] });

      router.push(ROUTES.WORK_PAGE(data.id));
    },
  });

  const createNewWorkEdition = async (originalWork: WorkEntity) => {
    const defaultWork = getDefaultWork({
      status: WorkStatuses.enum.Forthcoming,
      type: originalWork.type,
      titles: originalWork.titles.map((title) => ({
        ...title,
        id: appConfig.defaultId,
      })),
      abstracts: originalWork.abstracts.map((abstract) => ({
        ...abstract,
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
      imprintId: originalWork.imprintId,
      license: originalWork.license,
      edition: (originalWork.edition ?? 1) + 1,
      languages: originalWork.languages.map((language) => ({
        ...language,
        id: appConfig.defaultId,
      })),
    });

    await mutateAsync({ originalWork, edition: defaultWork });
  };

  return {
    createNewWorkEdition,
    loading: isPending,
  };
};

export default useCreateNewWorkEdition;
