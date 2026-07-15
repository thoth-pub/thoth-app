import { sanitize as sanitizeWithDOMPurify } from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
  'p', 'br', 'b', 'i', 'em', 'strong', 'u', 'sub', 'sup',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a', 'img', 'blockquote', 'pre', 'code', 'hr',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'div', 'span', 'section',
];

const ALLOWED_ATTR = [
  'href', 'target', 'rel', 'src', 'alt', 'title',
  'class', 'id', 'style', 'type', 'start',
  'colspan', 'rowspan',
];

export const sanitizeHtml = (html: string): string => {
  try {
    return sanitizeWithDOMPurify(html, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      ALLOW_DATA_ATTR: false,
    });
  } catch {
    return '';
  }
};
