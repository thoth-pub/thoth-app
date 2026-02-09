'use client';

import useActiveLocale from './useActiveLocale';

const useIsGermanLocale = () => {
  const locale = useActiveLocale();

  return locale.toLowerCase() === 'de';
};

export default useIsGermanLocale;
