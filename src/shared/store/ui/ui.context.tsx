'use client';

import { createContext, ReactNode, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import useIsDesktop from '../../hooks/useIsDesktop';

type UIContextValue = {
  isExpanded: boolean;
  updateIsExpanded: () => void;
};

export const UIContext = createContext<UIContextValue>({
  isExpanded: false,
  updateIsExpanded: () => {},
});

export const UIProvider = ({ children }: { children: Readonly<ReactNode> }) => {
  const isDesktop = useIsDesktop();
  const [isExpanded, setIsExpanded] = useState(isDesktop);
  const isUpdatedByUser = useRef(false);

  useEffect(() => {
    if (isUpdatedByUser.current) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsExpanded(isDesktop);
  }, [isDesktop]);

  const updateIsExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
    isUpdatedByUser.current = true;
  }, []);

  const contextValue: UIContextValue = useMemo(
    () => ({ isExpanded, updateIsExpanded }),
    [isExpanded, updateIsExpanded],
  );

  return <UIContext value={contextValue}>{children}</UIContext>;
};

export const useUIContext = () => use(UIContext);
