
export const jatsToHtml = (jats: string) => {
  const withLists = jats.replace(
    /<list\b[^>]*\blist-type="(bullet|order)"[^>]*>([\s\S]*?)<\/list>/g,
    (_match, listType: string, inner: string) => {
      const wrapper = listType === 'order' ? 'ol' : 'ul';
      const items = inner
        .replace(/<list-item>\s*<p>([\s\S]*?)<\/p>\s*<\/list-item>/g, '<li>$1</li>')
        .replace(/<list-item>([\s\S]*?)<\/list-item>/g, '<li>$1</li>'); // defensive: items without <p>

      return `<${wrapper}>${items}</${wrapper}>`;
    },
  );

  return withLists
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
    .replace(/<ext-link\b([^>]*)>/g, (_match, attrs: string) => {
      const cleaned = attrs
        .replace(/\s*ext-link-type="[^"]*"/g, '') // drop the JATS ext-link-type attribute
        .replace(/xlink:/g, ''); // xlink:href -> href

      return `<a${cleaned}>`;
    })
    .replaceAll('</ext-link>', '</a>');
};
