
export const jatsToHtml = (jats: string) => {
  return jats
    .replace('<bold>', '<b>')
    .replace('</bold>', '</b>')
    .replace('<italic>', '<i>')
    .replace('</italic>', '</i>')
    .replace('<strike>', '<s>')
    .replace('</strike>', '</s>')
    .replace('<underline>', '<u>')
    .replace('</underline>', '</u>')
    .replace('<link>', '<a>')
    .replace('</link>', '</a>')
    .replace('<ext-link>', '<a>')
    .replace('</ext-link>', '</a>')
    .replace('ext-link-type="uri" xlink:', '')
};
