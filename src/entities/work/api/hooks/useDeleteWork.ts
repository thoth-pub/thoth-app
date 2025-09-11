'use client';

import { useRouter } from 'next/navigation';

import { NOTIFICATIONS, type QueryToken, ROUTES } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';
import { useMutationWithAuth } from '@/src/shared/hooks';

import { DELETE_WORK, GET_WORKS } from '../../model/work.schema';
import type { WorkId } from '../../model/work.types';

type UseDeleteWorkProps = {
  workId: WorkId;
  queryToken: QueryToken;
};

const { WORK_DELETE_FAILED } = NOTIFICATIONS;

const useDeleteWork = ({ workId, queryToken }: UseDeleteWorkProps) => {
  const router = useRouter();
  const { sendErrorNotification } = useNotifications();
  const [ mutate ] = useMutationWithAuth({
    queryToken,
    mutation: DELETE_WORK,
    options: {
      variables: { workId },
      onCompleted: () => {
        router.replace(ROUTES.WORKS);
      },
      onError: () => {
        sendErrorNotification(WORK_DELETE_FAILED);
      },
      refetchQueries: [{ query: GET_WORKS }],
    },
  });

  return {
    deleteWork: mutate,
  };
};

export default useDeleteWork;
