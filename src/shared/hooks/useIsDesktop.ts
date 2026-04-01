'use client';

import { useMedia } from 'react-use';

const useIsDesktop = (width = 1024) => {
  const isDesktop = useMedia(`(min-width: ${width}px)`, false);

  return isDesktop;
};

export default useIsDesktop;
