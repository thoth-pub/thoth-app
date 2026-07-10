import DOMPurify from 'dompurify';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { sanitizeHtml } from './sanitize';

describe('sanitizeHtml', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sanitizeHtml_returnsSafeFallbackWhenDOMPurifyThrows', () => {
    const unsafeHtml = '<img src=x onerror="alert(1)"><script>alert(2)</script>';

    vi.spyOn(DOMPurify, 'sanitize').mockImplementationOnce(() => {
      throw new Error('DOMPurify failed');
    });

    const result = sanitizeHtml(unsafeHtml);

    expect(result).toBe('');
    expect(result).not.toBe(unsafeHtml);
  });

  it('sanitizeHtml_removesUnsafeMarkup', () => {
    const result = sanitizeHtml('<p onclick="alert(1)">Hello</p><script>alert(2)</script>');

    expect(result).toBe('<p>Hello</p>');
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('<script>');
  });

  it('sanitizeHtml_preservesAllowedMarkup', () => {
    const allowedHtml = '<p>Hello <em>em</em> <strong>strong</strong> <sub>sub</sub> <sup>sup</sup></p><ul><li>one</li></ul><ol><li>two</li></ol>';

    expect(sanitizeHtml(allowedHtml)).toBe(allowedHtml);
  });
});
