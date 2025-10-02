'use client';

import { useRouter } from 'next/navigation';

import { type BaseEditSectionProps, NOTIFICATIONS, ROUTES } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';
import { useMutationWithAuth } from '@/src/shared/hooks';

import { DELETE_WORK, GET_WORKS } from '../../model/work.schema';

const { WORK_DELETE_FAILED } = NOTIFICATIONS;

const useDeleteWork = ({ workId, queryToken }: BaseEditSectionProps) => {
  const router = useRouter();
  const { sendErrorNotification } = useNotifications();
  const [mutate] = useMutationWithAuth({
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
