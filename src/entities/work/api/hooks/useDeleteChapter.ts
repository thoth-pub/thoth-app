'use client';

import { type BaseEditSectionProps, NOTIFICATIONS } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';
import { useMutationWithAuth } from '@/src/shared/hooks';

import { DELETE_WORK, GET_WORK_CHAPTERS } from '../../model/work.schema';
import { WorkId } from '../../model/work.types';

const { WORK_DELETE_FAILED } = NOTIFICATIONS;

const useDeleteChapter = ({ queryToken, workId }: BaseEditSectionProps) => {
  const { sendErrorNotification } = useNotifications();

  const [mutate, { client }] = useMutationWithAuth({
    queryToken,
    mutation: DELETE_WORK,
    options: {
      onError: () => {
        sendErrorNotification(WORK_DELETE_FAILED);
      },
    },
  });

  const deleteChapter = async (workId: WorkId) => {
    await mutate({ variables: { workId } });
    await client.refetchQueries({ include: [GET_WORK_CHAPTERS] });
  };

  const deleteChapters = async (workIds: WorkId[]) => {
    workIds.forEach(async (workId) => {
      await mutate({ variables: { workId } });
    });
    await client.refetchQueries({ include: [GET_WORK_CHAPTERS] });
  };

  return {
    deleteChapter,
    deleteChapters,
  };
};

export default useDeleteChapter;
