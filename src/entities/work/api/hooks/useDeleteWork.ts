'use client';

import { useRouter } from 'next/navigation';

import { type BaseEditSectionProps, NOTIFICATIONS, ROUTES } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';
import { useMutationWithAuth } from '@/src/shared/hooks';

import { DELETE_WORK } from '../../model/work.schema';

const { WORK_DELETE_FAILED } = NOTIFICATIONS;

type UseDeleteWorkProps = Omit<BaseEditSectionProps, 'workId'> & {
  redirect?: boolean;
};

const useDeleteWork = ({ queryToken, redirect = true }: UseDeleteWorkProps) => {
  const router = useRouter();
  const { sendErrorNotification } = useNotifications();

  const [mutate, { client }] = useMutationWithAuth({
    queryToken,
    mutation: DELETE_WORK,
    options: {
      onCompleted: () => {
        client.refetchQueries({ include: 'active' });

        if (redirect) {
          router.replace(ROUTES.WORKS);
        }
      },
      onError: () => {
        sendErrorNotification(WORK_DELETE_FAILED);
      },
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
