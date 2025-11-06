'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Direction, WorkField } from '@/gql/graphql';
import usePublisherStateMachine from '@/src/entities/publisher/store/hooks/usePublisherStateMachine';
import { useWorks, useWorksCount } from '@/src/entities/work';
import type { WorkStatus, WorkType } from '@/src/entities/work/model/work.types';
import { appConfig, ROUTES, WorkTypes } from '@/src/shared';
import { useDebouncedValue } from '@/src/shared/hooks';

const ITEMS_PER_PAGE = appConfig.data.itemsPerRequestLimit;

export const useAllWorks = () => {
  const router = useRouter();

  const { activePublisher, isAdmin } = usePublisherStateMachine();
  const publishers = activePublisher ? [activePublisher] : [];

  const [workStatus, setWorkStatus] = useState<WorkStatus | 'All'>('All');
  const [workType, setWorkType] = useState<WorkType | 'All'>('All');
  const [orderBy, setOrderBy] = useState(WorkField.UpdatedAtWithRelations);
  const [activePage, setActivePage] = useState(1);
  const [direction, setDirection] = useState<Direction>(Direction.Desc);
  const [searchValue, setSearchValue] = useState('');

  const debouncedValue = useDebouncedValue(searchValue, appConfig.fieldsDebounceDelay);

  const baseProps = {
    publishersIds: publishers,
    isAdmin,
    filter: debouncedValue,
    workStatus: workStatus === 'All' ? undefined : workStatus,
    workTypes:
      workType === 'All'
        ? [WorkTypes.enum.EditedBook, WorkTypes.enum.JournalIssue, WorkTypes.enum.Monograph, WorkTypes.enum.Textbook]
        : [workType],
  };

  const { workCount } = useWorksCount(baseProps);
  const { works, loading } = useWorks({
    offset: (activePage - 1) * ITEMS_PER_PAGE,
    limit: ITEMS_PER_PAGE,
    direction,
    field: orderBy,
    ...baseProps,
  });

  const totalPagesCount = Math.ceil(workCount / ITEMS_PER_PAGE);

  const changePage = (value: number) => {
    setActivePage(value);
  };

  const changeDirection = (value: Direction) => {
    setDirection(value);
  };

  const navigateToWork = (id: string) => {
    router.push(ROUTES.WORK_PAGE(id));
  };

  const changeWorkStatus = (value: WorkStatus | 'All') => {
    setWorkStatus(value);
  };

  const changeWorkType = (value: WorkType | 'All') => {
    setWorkType(value);
  };

  const changeOrderBy = (value: WorkField) => {
    setOrderBy(value);
  };

  return {
    // Data
    loading,
    works,
    navigateToWork,

    // Search
    searchValue,
    setSearchValue,

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
  };
};
