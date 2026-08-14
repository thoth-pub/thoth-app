/**
 * Saves plain text to the user's machine, entirely client-side.
 *
 * A Blob is wrapped in a short-lived object URL, handed to a throwaway anchor, and clicked; the
 * URL is revoked in a `finally` so it is released whether or not the click threw. No report ever
 * leaves the browser: there is no endpoint, no upload, and no server-side store. Kept as one small
 * function so the browser side effects it needs can be exercised with mocked object-URL APIs.
 */
export const downloadTextFile = (filename: string, contents: string): void => {
  const blob = new Blob([contents], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
};
