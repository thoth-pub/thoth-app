export const getPagesPlaceholder = (firstPage: string, lastPage: string, pageCount: number) => {
  let result = '';

  if (firstPage.length > 0) {
    result += firstPage;
  }

  if (lastPage.length > 0 && result.length > 0) {
    result += ` \u2014 ${lastPage}`;
  }

  if (lastPage.length > 0 && result.length === 0) {
    result += lastPage;
  }

  if (pageCount > 0) {
    result += ` (${pageCount} ${pageCount > 1 ? 'pages' : 'page'})`;
  }

  return result;
};
