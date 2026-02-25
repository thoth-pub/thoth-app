'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { type BaseEditSectionProps, NOTIFICATIONS, QueryKeys, ROUTES, useServices } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

const { WORK_DELETE_FAILED } = NOTIFICATIONS;

type UseDeleteWorkProps = Omit<BaseEditSectionProps, 'workId'> & {
  redirect?: boolean;
};

const useDeleteWork = ({ redirect = true }: UseDeleteWorkProps) => {
  const router = useRouter();
  const { sendErrorNotification } = useNotifications();
  const { workService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (workId: string) => {
      return workService.deleteWork(workId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.works] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.worksCount] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.books] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.booksCount] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.forthcomingBooksCount] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.publishedBooksCount] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.latestUpdatedBooks] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.latestPublishedBooks] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.serieses] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.seriesesCount] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.series] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workTranslations] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workEditions] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workPrevEditions] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.translatedWorks] });

      if (redirect) {
        router.replace(ROUTES.WORKS);
      }
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? WORK_DELETE_FAILED);
    },
  });

  return {
    deleteWork: mutateAsync,
    loading: isPending,
  };
};

export default useDeleteWork;
