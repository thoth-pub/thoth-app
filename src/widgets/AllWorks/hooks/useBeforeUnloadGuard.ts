'use client';

import { useEffect } from 'react';

/**
 * While `active` is true, warns the user before the browser unloads the page — a refresh, a tab
 * close, or a navigation away. A bulk import runs entirely in this tab, so leaving mid-run can
 * cut it off partway; the native "Leave site?" prompt is the only thing that can catch that.
 *
 * The custom-message argument is set for the handful of browsers that still read it, but modern
 * browsers show their own fixed wording — this cannot promise the user any particular text, only
 * that a prompt appears where the browser supports one.
 *
 * The listener is torn down as soon as `active` goes false — on success, on failure, and on
 * unmount — so it never lingers to warn about a page that is no longer doing anything.
 */
export const useBeforeUnloadGuard = (active: boolean) => {
  useEffect(() => {
    if (!active) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Legacy assignment kept for older browsers; ignored by current ones, which show fixed text.
      event.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [active]);
};
