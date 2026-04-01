'use client';

import { useEffect, useState } from 'react';

const useDebounceValue = <T>(value: T, delay = 0) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(id);
  }, [value, delay]);

  return debouncedValue;
};

export default useDebounceValue;
