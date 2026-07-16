import { describe, expect, it } from 'vitest';

import { getDisplayTitle, getMainTitle, isTextContainsAnyMarkdownTag } from './index';

describe('getMainTitle', () => {
  it('getMainTitle_preservesEmptyTitleWhenWorkHasNoTitles', () => {
    const title = getMainTitle([]);

    expect(title.title).toBe('');
    expect(title.fullTitle).toBe('');
  });
});

describe('getDisplayTitle', () => {
  it('returns Untitled when work has no titles', () => {
    const title = getDisplayTitle([]);

    expect(title.title).toBe('Untitled');
    expect(title.fullTitle).toBe('Untitled');
  });

  it('uses title as display fullTitle fallback when real title data exists', () => {
    const title = getDisplayTitle([
      {
        title: 'Real title',
        fullTitle: '',
        subtitle: '',
        id: 'title-1',
        canonical: true,
        localeCode: 'en',
      },
    ]);

    expect(title.fullTitle).toBe('Real title');
  });
});

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
