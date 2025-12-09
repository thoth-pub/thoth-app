'use client';

import { useEffect, useRef } from 'react';

import { useIsDesktop } from '@/src/shared/hooks';
import useUIStateMachine from '@/src/shared/store/ui/hooks/useUIStateMachine';

const UpdateNavigationState = () => {
  const isDesktop = useIsDesktop();

  const { isExpanded, update } = useUIStateMachine();
  const isUpdated = useRef(false);

  useEffect(() => {
    if (isDesktop && !isExpanded && !isUpdated.current) {
      update();
      isUpdated.current = true;
    }
  }, [isDesktop]);

  return null;
};

export default UpdateNavigationState;
