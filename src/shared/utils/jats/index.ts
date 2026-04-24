
export const jatsToHtml = (jats: string) => {
  return jats
    .replaceAll('<bold>', '<b>')
    .replaceAll('</bold>', '</b>')
    .replaceAll('<italic>', '<i>')
    .replaceAll('</italic>', '</i>')
    .replaceAll('<strike>', '<s>')
    .replaceAll('</strike>', '</s>')
    .replaceAll('<underline>', '<u>')
    .replaceAll('</underline>', '</u>')
    .replaceAll('<link>', '<a>')
    .replaceAll('</link>', '</a>')
    .replaceAll('<ext-link>', '<a>')
    .replaceAll('</ext-link>', '</a>')
    .replaceAll('ext-link-type="uri" xlink:', '');
};
