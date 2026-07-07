import { describe, expect, it } from 'vitest';

import { isTextContainsAnyMarkdownTag } from './index';

describe('isTextContainsAnyMarkdownTag', () => {
  it('detects JATS list markup', () => {
    const text = '<list list-type="bullet"><list-item><p>a</p></list-item></list>';

    expect(isTextContainsAnyMarkdownTag(text)).toBe(true);
  });

  it('detects inline JATS markup', () => {
    expect(isTextContainsAnyMarkdownTag('<bold>x</bold>')).toBe(true);
  });

  it('returns false for plain text', () => {
    expect(isTextContainsAnyMarkdownTag('just text')).toBe(false);
  });
});
