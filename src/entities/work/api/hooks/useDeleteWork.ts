'use client';

import { useRouter } from 'next/navigation';

import { appConfig, type BaseEditSectionProps, NOTIFICATIONS, ROUTES } from '@/src/shared';
import { useBulkRefetchQueries, useNotifications } from '@/src/shared/hooks';
import { useMutationWithAuth } from '@/src/shared/hooks';

import { DELETE_WORK, GET_WORK, GET_WORK_CHAPTERS } from '../../model/work.schema';
import { useMemo } from 'react';

const { WORK_DELETE_FAILED } = NOTIFICATIONS;

type UseDeleteWorkProps = Omit<BaseEditSectionProps, 'workId'> & {
  redirect?: boolean;
};

const useDeleteWork = ({ queryToken, redirect = true }: UseDeleteWorkProps) => {
  const router = useRouter();
  const { sendErrorNotification } = useNotifications();
  const queriesToRefetch = useBulkRefetchQueries();

  const [mutate] = useMutationWithAuth({
    queryToken,
    mutation: DELETE_WORK,
    options: {
      onCompleted: () => {
        if (redirect) {
          router.replace(ROUTES.WORKS);
        }
      },
      onError: () => {
        sendErrorNotification(WORK_DELETE_FAILED);
      },
      refetchQueries: queriesToRefetch,
    },
  });

  const deleteWork = (workId: string) => {
    mutate({ variables: { workId } });
  };

  return {
    deleteWork,
  };
};

export default useDeleteWork;
