import { describe, expect, it, vi } from 'vitest';

import { resolveMarkdownRefs } from './resolveMarkdownRefs';

describe('resolveMarkdownRefs', () => {
  it('should replace $md: prefixed values with markdown content', () => {
    const resources = { description: '$md:hello' };
    const markdownContent = { hello: '# Hello World' };

    const result = resolveMarkdownRefs(resources, markdownContent);

    expect(result).toEqual({ description: '# Hello World' });
  });

  it('should warn and keep original value when markdown key is missing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const resources = { description: '$md:missing' };
    const markdownContent = {};

    const result = resolveMarkdownRefs(resources, markdownContent);

    expect(warnSpy).toHaveBeenCalledWith('Missing markdown file for reference: $md:missing');
    expect(result).toEqual({ description: '$md:missing' });
  });

  it('should pass through non-prefixed strings', () => {
    const resources = { name: 'John' };

    const result = resolveMarkdownRefs(resources, {});
    expect(result).toEqual({ name: 'John' });
  });

  it('should pass through non-string values', () => {
    const resources = { count: 42, active: true, data: null };

    const result = resolveMarkdownRefs(resources, {});
    expect(result).toEqual({ count: 42, active: true, data: null });
  });

  it('should pass through arrays', () => {
    const resources = { items: ['$md:a', '$md:b'] };

    const result = resolveMarkdownRefs(resources, {});
    expect(result).toEqual({ items: ['$md:a', '$md:b'] });
  });

  it('should recursively process nested objects', () => {
    const resources = {
      section: {
        title: '$md:title',
        body: '$md:body',
      },
    };
    const markdownContent = { title: 'My Title', body: 'My Body' };

    const result = resolveMarkdownRefs(resources, markdownContent);
    expect(result).toEqual({
      section: {
        title: 'My Title',
        body: 'My Body',
      },
    });
  });

  it('should handle empty objects', () => {
    const result = resolveMarkdownRefs({}, {});
    expect(result).toEqual({});
  });
});
