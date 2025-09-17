'use client';

import { useState } from 'react';

import { config } from '@/src/shared/config';

import useDebounceValue from './useDebouncedValue';

const useFilter = () => {
  const [filter, setFilter] = useState('');
  const debouncedFilter = useDebounceValue(filter, config.fieldsDebounceDelay);

  return { filter, debouncedFilter, updateFilter: setFilter };
};

export default useFilter;
