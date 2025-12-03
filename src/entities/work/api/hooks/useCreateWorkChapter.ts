'use client';

import { WorkEntity, WorkId } from '../../model/work.types';

import { NOTIFICATIONS, QueryKeys, type QueryToken } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { WorkService } from '../work.service';

type UseCreateWorkChapterProps = {
  queryToken: QueryToken;
  onCompleted?: (chapter: WorkEntity) => void;
};

const workService = new WorkService();

const { CHAPTER_CREATION_SUCCESS, CHAPTER_CREATION_FAILED } = NOTIFICATIONS;
const { workChapters } = QueryKeys;

const useCreateWorkChapter = (props: UseCreateWorkChapterProps) => {
  const { queryToken, onCompleted } = props;

  const { sendErrorNotification, sendSuccessNotification } = useNotifications();

  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({
      chapter,
      relatedWorkId,
      ordinal,
    }: {
      chapter: WorkEntity;
      relatedWorkId: WorkId;
      ordinal: number;
    }) => workService.createChapter(queryToken, chapter, relatedWorkId, ordinal),
    onSuccess: (data) => {
      sendSuccessNotification(CHAPTER_CREATION_SUCCESS);
      onCompleted?.(data);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? CHAPTER_CREATION_FAILED);
    },
  });

  const createChapter = async ({
    chapter,
    relatedWorkId,
    ordinal,
  }: {
    chapter: WorkEntity;
    relatedWorkId: WorkId;
    ordinal: number;
  }) => {
    await mutateAsync({ chapter, relatedWorkId, ordinal });
    queryClient.invalidateQueries({
      queryKey: [workChapters],
    });
  };

  return {
    createChapter,
    loading: isPending,
  };
};

export default useCreateWorkChapter;
