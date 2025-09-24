'use client';

import { useState } from 'react';

import { appConfig } from '@/src/shared/config';

import useDebounceValue from './useDebouncedValue';

const useFilter = () => {
  const [filter, setFilter] = useState('');
  const debouncedFilter = useDebounceValue(filter, appConfig.fieldsDebounceDelay);

  return { filter, debouncedFilter, updateFilter: setFilter };
};

export default useFilter;
