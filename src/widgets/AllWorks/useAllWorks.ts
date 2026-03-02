'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { WorkField } from '@/gql/graphql';
import usePublisherStateMachine from '@/src/entities/publisher/store/hooks/usePublisherStateMachine';
import { useCreateNewWorkEdition, useCreateWorkTranslation, useWorks, useWorksCount } from '@/src/entities/work';
import type { WorkStatus, WorkType } from '@/src/entities/work/model/work.types';
import { getPagesCount, ROUTES, type WorkCopyVariant, WorkTypes } from '@/src/shared';
import { useEntityList } from '@/src/shared/hooks';

export const useAllWorks = () => {
  const router = useRouter();
  const { createNewWorkEdition } = useCreateNewWorkEdition();
  const { createWorkTranslation } = useCreateWorkTranslation();

  const { activePublisher } = usePublisherStateMachine();
  const publisherId = activePublisher && activePublisher.id ? activePublisher.id : '';

  const [workStatus, setWorkStatus] = useState<WorkStatus | 'All'>('All');
  const [workType, setWorkType] = useState<WorkType | 'All'>('All');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const {
    activePage,
    direction,
    orderBy,
    searchValue,
    debouncedValue,
    offset,
    limit,
    changeSearchValue,
    changePage,
    changeDirection,
    changeOrderBy,
  } = useEntityList({ initialOrderBy: WorkField.UpdatedAtWithRelations });

  const baseProps = {
    publishersIds: [publisherId],
    filter: debouncedValue,
    workStatus: workStatus === 'All' ? undefined : workStatus,
    workTypes:
      workType === 'All'
        ? [WorkTypes.enum.EditedBook, WorkTypes.enum.JournalIssue, WorkTypes.enum.Monograph, WorkTypes.enum.Textbook]
        : [workType],
  };

  const { workCount } = useWorksCount(baseProps);

  const { works, loading, isFetched } = useWorks({
    offset,
    limit,
    direction,
    field: orderBy,
    ...baseProps,
  });

  const totalPagesCount = getPagesCount(workCount);

  const navigateToWork = (id: string) => {
    router.push(ROUTES.WORK_PAGE(id));
  };

  const changeWorkStatus = (value: WorkStatus | 'All') => {
    setWorkStatus(value);
  };

  const changeWorkType = (value: WorkType | 'All') => {
    setWorkType(value);
  };

  const openUpload = () => {
    setIsUploadModalOpen(true);
  };

  const closeUpload = () => {
    setIsUploadModalOpen(false);
  };

  const navigateToCopyWork = (variant: WorkCopyVariant) => {
    router.push(ROUTES.COPY_WORK(variant));
  };

  return {
    // Data
    loading,
    isFetched,
    works,

    // Search
    searchValue,
    changeSearchValue,

    // Pagination
    activePage,
    totalPagesCount,
    changePage,

    // Filter
    direction,
    changeDirection,
    workStatus,
    changeWorkStatus,
    workType,
    changeWorkType,
    orderBy,
    changeOrderBy,

    // Upload
    isUploadModalOpen,
    openUpload,
    closeUpload,

    // Navigation
    navigateToWork,
    navigateToCopyWork,

    // Create copy
    createNewWorkEdition,
    createWorkTranslation,
  };
};
