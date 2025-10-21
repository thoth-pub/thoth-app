'use client';

import { useMedia } from 'react-use';

const useIsDesktop = () => {
  const isDesktop = useMedia('(min-width: 1024px)');

  return isDesktop;
};

export default useIsDesktop;
