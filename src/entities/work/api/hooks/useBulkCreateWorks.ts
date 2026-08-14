'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';
import type { ImportExecutionObserver, ImportPlan } from '@/src/shared/types';

const { WORK_BULK_CREATION_SUCCESS, WORK_BULK_CREATION_FAILED } = NOTIFICATIONS;

/**
 * What one bulk import needs: the plan to run, and an optional observer to report its progress
 * to. The plan still crosses the boundary whole — the observer travels beside it, never inside
 * it — and it is only ever read, so it cannot change what gets created.
 */
type BulkCreateVariables = {
  plan: ImportPlan;
  observer?: ImportExecutionObserver;
};

const useBulkCreateWorks = () => {
  const { sendErrorNotification, sendSuccessNotification } = useNotifications();
  const { workService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    // The plan is the whole payload: what the user confirmed in the preview is what gets
    // created, with nothing reassembled on the way. Diagnostics are deliberately not part of
    // it — a warning describes the source file and has no business reaching the API.
    mutationFn: async ({ plan, observer }: BulkCreateVariables) => workService.bulkCreateWorks(plan, observer),
    onSuccess: () => {
      sendSuccessNotification(WORK_BULK_CREATION_SUCCESS);
      queryClient.invalidateQueries({ queryKey: [QueryKeys.books] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.booksCount] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.forthcomingBooksCount] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.publishedBooksCount] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.latestUpdatedBooks] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.latestPublishedBooks] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.works] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.worksCount] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? WORK_BULK_CREATION_FAILED);
    },
    // A bulk import can create series, and a failed one can create some of them before it
    // stops. Refreshing the series list either way is what lets a retry of the same file match
    // the series this run already created instead of proposing them a second time.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.series] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.serieses] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.seriesesCount] });
      // The importer reads its series list from useAllUserSerieses, which is keyed separately
      // from the admin list. Missing this key is what would let a retry propose a series the
      // failed run had already created.
      queryClient.invalidateQueries({ queryKey: [QueryKeys.allUserSerieses] });
    },
  });

  // The plan stays the caller's first argument; the observer is an optional second, so a caller
  // that does not care about progress passes nothing and the call reads exactly as before.
  const bulkCreateWorks = (plan: ImportPlan, observer?: ImportExecutionObserver) => mutateAsync({ plan, observer });

  return {
    bulkCreateWorks,
    loading: isPending,
  };
};

export default useBulkCreateWorks;
