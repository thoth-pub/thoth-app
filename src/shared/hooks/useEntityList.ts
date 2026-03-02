'use client';

import { useState } from 'react';

import { Direction, WorkField } from '@/gql/graphql';

import { appConfig } from '../config';
import useDebouncedValue from './useDebouncedValue';

type UseEntityListProps = Partial<{
  initialActivePage: number;
  initialDirection: Direction;
  initialOrderBy: WorkField;
  initialSearchValue: string;
}>;

const limit = appConfig.data.itemsPerRequestLimit;

const useEntityList = (props: UseEntityListProps) => {
  const {
    initialActivePage = 1,
    initialDirection = Direction.Asc,
    initialOrderBy = WorkField.UpdatedAt,
    initialSearchValue = '',
  } = props;

  const [activePage, setActivePage] = useState(initialActivePage);
  const [direction, setDirection] = useState(initialDirection);
  const [orderBy, setOrderBy] = useState(initialOrderBy);
  const [searchValue, setSearchValue] = useState(initialSearchValue);

  const debouncedValue = useDebouncedValue(searchValue, appConfig.fieldsDebounceDelay);

  const offset = (activePage - 1) * limit;

  return {
    activePage,
    direction,
    orderBy,
    searchValue,
    debouncedValue,
    offset,
    limit,
    changePage: setActivePage,
    changeDirection: setDirection,
    changeOrderBy: setOrderBy,
    changeSearchValue: setSearchValue,
  };
};

export default useEntityList;
