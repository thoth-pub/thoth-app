export const prettifyUrlPreview = (url?: string) => {
  if (!url) return url;

  return url.replace('//', '');
};
