// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';

import { sanitizeHtml } from './sanitize';

describe('sanitizeHtml', () => {
  afterEach(() => {
    vi.doUnmock('sanitize-html');
    vi.restoreAllMocks();
  });

  it('sanitizeHtml_returnsSafeFallbackWhenSanitizerThrows', async () => {
    const unsafeHtml = '<img src=x onerror="alert(1)"><script>alert(2)</script>';

    vi.resetModules();
    vi.doMock('sanitize-html', () => {
      return {
        default: () => {
          throw new Error('Sanitizer failed');
        },
      };
    });

    const { sanitizeHtml: sanitizeHtmlWithThrowingSanitizer } = await import('./sanitize');
    const result = sanitizeHtmlWithThrowingSanitizer(unsafeHtml);

    expect(result).toBe('');
    expect(result).not.toBe(unsafeHtml);
    expect(result).not.toContain('<script>');
  });

  it('sanitizeHtml_sanitizesInServerLikeEnvironment', () => {
    expect(globalThis.window).toBeUndefined();

    const result = sanitizeHtml('<p>Hello <strong>SSR</strong></p><script>alert(1)</script>');

    expect(result).toBe('<p>Hello <strong>SSR</strong></p>');
    expect(result).not.toBe('');
    expect(result).not.toContain('<script>');
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
