'use client';

import { useMedia } from 'react-use';

const useIsDesktop = () => {
  const isDesktop = useMedia('(min-width: 1024px)', true);

  return isDesktop;
};

export default useIsDesktop;
