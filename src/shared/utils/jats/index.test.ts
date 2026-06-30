import { describe, expect, it } from 'vitest';

import { jatsToHtml } from './index';

describe('jatsToHtml', () => {
  describe('lists', () => {
    it('converts a bullet list to <ul>/<li>', () => {
      const jats =
        '<list list-type="bullet"><list-item><p>a</p></list-item><list-item><p>b</p></list-item></list>';

      expect(jatsToHtml(jats)).toBe('<ul><li>a</li><li>b</li></ul>');
    });

    it('converts an ordered list to <ol>/<li>', () => {
      const jats =
        '<list list-type="order"><list-item><p>a</p></list-item><list-item><p>b</p></list-item></list>';

      expect(jatsToHtml(jats)).toBe('<ol><li>a</li><li>b</li></ol>');
    });

    it('converts a single-item list', () => {
      const jats = '<list list-type="bullet"><list-item><p>only</p></list-item></list>';

      expect(jatsToHtml(jats)).toBe('<ul><li>only</li></ul>');
    });

    it('converts inline tags inside list items', () => {
      const jats = '<list list-type="bullet"><list-item><p><bold>x</bold></p></list-item></list>';

      expect(jatsToHtml(jats)).toBe('<ul><li><b>x</b></li></ul>');
    });

    it('converts multiple lists in one string', () => {
      const jats =
        '<list list-type="bullet"><list-item><p>a</p></list-item></list>' +
        '<list list-type="order"><list-item><p>b</p></list-item></list>';

      expect(jatsToHtml(jats)).toBe('<ul><li>a</li></ul><ol><li>b</li></ol>');
    });

    it('converts prose mixed with a list', () => {
      const jats = '<bold>Heading</bold><list list-type="bullet"><list-item><p>a</p></list-item></list>';

      expect(jatsToHtml(jats)).toBe('<b>Heading</b><ul><li>a</li></ul>');
    });

    it('falls back to <li> for list items without an inner <p>', () => {
      const jats = '<list list-type="bullet"><list-item>a</list-item></list>';

      expect(jatsToHtml(jats)).toBe('<ul><li>a</li></ul>');
    });

    it('tolerates reordered/extra attributes on <list>', () => {
      const jats = '<list id="l1" list-type="order" specific-use="x"><list-item><p>a</p></list-item></list>';

      expect(jatsToHtml(jats)).toBe('<ol><li>a</li></ol>');
    });
  });

  describe('inline tags (regression)', () => {
    it('converts the existing inline tags', () => {
      const jats = '<bold>b</bold><italic>i</italic><strike>s</strike><underline>u</underline>';

      expect(jatsToHtml(jats)).toBe('<b>b</b><i>i</i><s>s</s><u>u</u>');
    });

    it('converts bare link and ext-link tags', () => {
      const jats = '<ext-link>site</ext-link><link>x</link>';

      expect(jatsToHtml(jats)).toBe('<a>site</a><a>x</a>');
    });

    it('converts an ext-link with xlink:href to an anchor with href', () => {
      const jats = '<ext-link xlink:href="#">site</ext-link>';

      expect(jatsToHtml(jats)).toBe('<a href="#">site</a>');
    });

    it('strips the ext-link-type attribute from legacy ext-link markup', () => {
      const jats = '<ext-link ext-link-type="uri" xlink:href="#">site</ext-link>';

      expect(jatsToHtml(jats)).toBe('<a href="#">site</a>');
    });

    it('leaves plain text unchanged', () => {
      expect(jatsToHtml('just text')).toBe('just text');
    });
  });
});
