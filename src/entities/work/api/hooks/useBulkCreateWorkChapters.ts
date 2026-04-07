'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';

import { WorkEntity, WorkId } from '../../model/work.types';

type CreationProgress = { current: number; total: number };

type UseBulkCreateWorkChaptersProps = {
  onSingleCompleted?: (chapter: WorkEntity) => void;
  onBulkCompleted?: () => void;
};

const useBulkCreateWorkChapters = (props: UseBulkCreateWorkChaptersProps) => {
  const { onSingleCompleted, onBulkCompleted } = props;

  const { workService } = useServices();
  const { sendErrorNotification, sendSuccessNotification } = useNotifications();
  const queryClient = useQueryClient();

  const [progress, setProgress] = useState<CreationProgress | null>(null);

  const createChapters = async (chapters: WorkEntity[], relatedWorkId: WorkId, startOrdinal: number) => {
    const total = chapters.length;
    setProgress({ current: 0, total });

    let createdCount = 0;
    let lastCreatedChapter: WorkEntity | null = null;

    try {
      for (let i = 0; i < total; i++) {
        lastCreatedChapter = await workService.createChapter(chapters[i], relatedWorkId, startOrdinal + i);
        createdCount++;
        setProgress({ current: i + 1, total });
      }

      if (total === 1 && lastCreatedChapter) {
        sendSuccessNotification(NOTIFICATIONS.CHAPTER_CREATION_SUCCESS);
        onSingleCompleted?.(lastCreatedChapter);
      } else {
        sendSuccessNotification(NOTIFICATIONS.CHAPTER_BULK_CREATION_SUCCESS, { count: createdCount });
        onBulkCompleted?.();
      }

    } catch (error) {
      sendErrorNotification((error as Error)?.message ?? NOTIFICATIONS.CHAPTER_CREATION_FAILED);
    } finally {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
      setProgress(null);
    }
  };

  return {
    createChapters,
    progress,
    isCreating: !!progress,
  };
};

export default useBulkCreateWorkChapters;
