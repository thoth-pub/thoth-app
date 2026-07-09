'use client';

import { createContext, ReactNode, use, useCallback, useMemo, useState } from 'react';

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
  const [isUpdatedByUser, setIsUpdatedByUser] = useState(false);
  // Follow the viewport until the user makes an explicit choice, adjusting during
  // render instead of in an effect:
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevIsDesktop, setPrevIsDesktop] = useState(isDesktop);

  if (prevIsDesktop !== isDesktop) {
    setPrevIsDesktop(isDesktop);

    if (!isUpdatedByUser) {
      setIsExpanded(isDesktop);
    }
  }

  const updateIsExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
    setIsUpdatedByUser(true);
  }, []);

  const contextValue: UIContextValue = useMemo(
    () => ({ isExpanded, updateIsExpanded }),
    [isExpanded, updateIsExpanded],
  );

  return <UIContext value={contextValue}>{children}</UIContext>;
};

export const useUIContext = () => use(UIContext);
