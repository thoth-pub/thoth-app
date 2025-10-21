'use client';

import { useRouter } from 'next/navigation';

import { WorkStatus } from '@/gql/graphql';
import { GET_BOOKS, GET_BOOKS_COUNT } from '@/src/entities/book/model/book.schema';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import { type BaseEditSectionProps, NOTIFICATIONS, ROUTES } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';
import { useMutationWithAuth } from '@/src/shared/hooks';

import { DELETE_WORK, GET_WORKS, GET_WORKS_COUNT } from '../../model/work.schema';

const { WORK_DELETE_FAILED } = NOTIFICATIONS;

const useDeleteWork = ({ queryToken }: Omit<BaseEditSectionProps, 'workId'>) => {
  const router = useRouter();
  const { sendErrorNotification } = useNotifications();
  const { activePublisher } = usePublisherStateMachine();

  const [mutate] = useMutationWithAuth({
    queryToken,
    mutation: DELETE_WORK,
    options: {
      onCompleted: () => {
        router.replace(ROUTES.WORKS);
      },
      onError: () => {
        sendErrorNotification(WORK_DELETE_FAILED);
      },
      refetchQueries: [
        { query: GET_WORKS },
        { query: GET_WORKS_COUNT },
        { query: GET_BOOKS },
        { query: GET_BOOKS_COUNT, variables: { publishers: [activePublisher], workStatus: WorkStatus.Active } },
        { query: GET_BOOKS_COUNT, variables: { publishers: [activePublisher], workStatus: WorkStatus.Forthcoming } },
        { query: GET_BOOKS_COUNT },
      ],
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
