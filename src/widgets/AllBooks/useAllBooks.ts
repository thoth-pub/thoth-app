'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Direction, WorkField } from '@/gql/graphql';
import useBooks from '@/src/entities/book/api/hooks/useBooks';
import useBooksCount from '@/src/entities/book/api/hooks/useBooksCount';
import usePublisherStateMachine from '@/src/entities/publisher/store/hooks/usePublisherStateMachine';
import type { WorkStatus, WorkType } from '@/src/entities/work/model/work.types';
import { appConfig, ROUTES } from '@/src/shared';
import { useDebouncedValue } from '@/src/shared/hooks';

const ITEMS_PER_PAGE = appConfig.data.itemsPerRequestLimit;

export const useAllBooks = () => {
  const router = useRouter();

  const { activePublisher } = usePublisherStateMachine();
  const publishers = activePublisher ? [activePublisher] : [];

  const [workStatus, setWorkStatus] = useState<WorkStatus | 'All'>('All');
  const [workType, setWorkType] = useState<WorkType | 'All'>('All');
  const [orderBy, setOrderBy] = useState(WorkField.UpdatedAtWithRelations);
  const [activePage, setActivePage] = useState(1);
  const [direction, setDirection] = useState<Direction>(Direction.Asc);
  const [searchValue, setSearchValue] = useState('');

  const debouncedValue = useDebouncedValue(searchValue, appConfig.fieldsDebounceDelay);

  const { bookCount } = useBooksCount(publishers, debouncedValue);
  const { books, loading } = useBooks({
    publishersIds: publishers,
    offset: (activePage - 1) * ITEMS_PER_PAGE,
    limit: ITEMS_PER_PAGE,
    direction,
    filter: debouncedValue,
    workStatus: workStatus === 'All' ? undefined : workStatus,
    field: orderBy,
  });

  const totalPagesCount = Math.ceil(bookCount / ITEMS_PER_PAGE);

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
    books,
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
