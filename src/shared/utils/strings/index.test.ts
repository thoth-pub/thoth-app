import { describe, expect, it } from 'vitest';

import { emptyToNull, escapeMarkdownList } from './index';

describe('escapeMarkdownList', () => {
  it('escapes a literal leading ordered-list marker', () => {
    expect(escapeMarkdownList('1. foo')).toBe('1\\. foo');
  });

  it('leaves converted <ol> list HTML untouched', () => {
    const html = '<ol><li>a</li></ol>';

    expect(escapeMarkdownList(html)).toBe(html);
  });

  it('leaves converted <ul> list HTML untouched', () => {
    const html = '<ul><li>a</li></ul>';

    expect(escapeMarkdownList(html)).toBe(html);
  });
});

describe('emptyToNull', () => {
  it('returns value for non-empty string', () => {
    expect(emptyToNull('hello')).toBe('hello');
  });

  it('returns null for empty string', () => {
    expect(emptyToNull('')).toBeNull();
  });

  it('returns null for null', () => {
    expect(emptyToNull(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(emptyToNull(undefined)).toBeNull();
  });

  it('returns null for whitespace-only string', () => {
    expect(emptyToNull('   ')).toBeNull();
  });

  it('returns trimmed value for string with leading/trailing whitespace', () => {
    expect(emptyToNull('  hello  ')).toBe('hello');
  });
});
