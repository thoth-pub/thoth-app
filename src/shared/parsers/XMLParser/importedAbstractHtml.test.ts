import { describe, expect, it } from 'vitest';

import { normaliseImportedAbstractHtml } from './importedAbstractHtml';

/**
 * The pure HTML-compatibility normaliser for imported abstracts and biographies. Every case pins
 * both directions: what is removed *and* what survives, so an implementation that accidentally
 * dropped the whole abstract could never pass by merely not containing `<br>`.
 */
describe('normaliseImportedAbstractHtml', () => {
  describe('removes structurally-empty spacer paragraphs', () => {
    it('drops the exact Arc trailing spacer and keeps the meaningful paragraph verbatim', () => {
      // The production shape from Arc product 9781802700596: one real paragraph followed by an
      // empty layout paragraph that carries a <br> and nothing else.
      const input = '<p>Real abstract.</p>\n<p style="text-align:justify;"><br>\n</p>';

      expect(normaliseImportedAbstractHtml(input)).toEqual({
        kind: 'content',
        content: '<p>Real abstract.</p>',
      });
    });

    it('drops a self-closing <br/> spacer', () => {
      expect(normaliseImportedAbstractHtml('<p>Real abstract.</p><p><br/></p>')).toEqual({
        kind: 'content',
        content: '<p>Real abstract.</p>',
      });
    });

    it('drops a whitespace-padded <br /> spacer', () => {
      expect(normaliseImportedAbstractHtml('<p>Real abstract.</p><p>\n   <br />\n</p>')).toEqual({
        kind: 'content',
        content: '<p>Real abstract.</p>',
      });
    });

    it('drops a spacer made of several <br> and nothing else', () => {
      expect(normaliseImportedAbstractHtml('<p>Real abstract.</p><p><br><br></p>')).toEqual({
        kind: 'content',
        content: '<p>Real abstract.</p>',
      });
    });

    it('drops an empty <p></p> and a whitespace-only paragraph', () => {
      expect(normaliseImportedAbstractHtml('<p>Real abstract.</p><p></p>')).toEqual({
        kind: 'content',
        content: '<p>Real abstract.</p>',
      });
      expect(normaliseImportedAbstractHtml('<p>Real abstract.</p><p>   </p>')).toEqual({
        kind: 'content',
        content: '<p>Real abstract.</p>',
      });
    });

    it('treats every non-breaking-space form as blank', () => {
      for (const nbsp of ['&nbsp;<br>', '&#160;', '&#xA0;', '&#XA0;', ' ', '&nbsp;&nbsp;']) {
        expect(normaliseImportedAbstractHtml(`<p>Real abstract.</p><p>${nbsp}</p>`)).toEqual({
          kind: 'content',
          content: '<p>Real abstract.</p>',
        });
      }
    });

    it('drops a spacer whose <br> sits inside a blank inline wrapper', () => {
      expect(normaliseImportedAbstractHtml('<p>Real abstract.</p><p><strong> </strong><br></p>')).toEqual({
        kind: 'content',
        content: '<p>Real abstract.</p>',
      });
    });

    it('removes a spacer between two real paragraphs without leaving a doubled blank line', () => {
      expect(normaliseImportedAbstractHtml('<p>One.</p>\n<p><br></p>\n<p>Two.</p>')).toEqual({
        kind: 'content',
        content: '<p>One.</p>\n<p>Two.</p>',
      });
    });
  });

  describe('leaves representable content untouched', () => {
    it('returns normal inline HTML byte-for-byte unchanged', () => {
      const input = '<p>Hello <em>world</em>.</p>';
      const result = normaliseImportedAbstractHtml(input);

      expect(result).toEqual({ kind: 'content', content: input });
      // The very same string, not a rebuilt copy: no reserialisation can alter a survivor.
      expect(result.kind === 'content' && result.content).toBe(input);
    });

    it('returns multiple real paragraphs unchanged', () => {
      const input = '<p>One.</p><p>Two.</p>';

      expect(normaliseImportedAbstractHtml(input)).toEqual({ kind: 'content', content: input });
    });

    it('leaves inline-only HTML with no paragraphs unchanged', () => {
      const input = '<em>Only italic</em>';

      expect(normaliseImportedAbstractHtml(input)).toEqual({ kind: 'content', content: input });
    });
  });

  describe('omits a field that is nothing but spacer markup', () => {
    it('reports a lone <p><br></p> as empty', () => {
      expect(normaliseImportedAbstractHtml('<p><br></p>')).toEqual({ kind: 'empty' });
    });

    it('reports several spacer paragraphs and nothing else as empty', () => {
      expect(normaliseImportedAbstractHtml('<p><br></p><p>&nbsp;</p><p>   </p>')).toEqual({ kind: 'empty' });
    });

    it('reports a bare empty paragraph as empty', () => {
      expect(normaliseImportedAbstractHtml('<p></p>')).toEqual({ kind: 'empty' });
    });
  });

  describe('blocks a meaningful line break as unrepresentable', () => {
    it('flags a break between two words', () => {
      expect(normaliseImportedAbstractHtml('<p>Hello<br>world</p>')).toEqual({ kind: 'unrepresentable' });
    });

    it('flags a break before content', () => {
      expect(normaliseImportedAbstractHtml('<p><br>Hello</p>')).toEqual({ kind: 'unrepresentable' });
    });

    it('flags a trailing break in a paragraph that has content', () => {
      expect(normaliseImportedAbstractHtml('<p><em>Hello</em><br></p>')).toEqual({ kind: 'unrepresentable' });
      expect(normaliseImportedAbstractHtml('<p><a href="https://example.com">Link</a><br></p>')).toEqual({
        kind: 'unrepresentable',
      });
    });

    it('flags a break sitting next to visible text even behind a blank wrapper', () => {
      expect(normaliseImportedAbstractHtml('<p><strong> </strong><br>Actual text</p>')).toEqual({
        kind: 'unrepresentable',
      });
    });

    it('flags a loose top-level break with no paragraph at all', () => {
      expect(normaliseImportedAbstractHtml('Line one<br>Line two')).toEqual({ kind: 'unrepresentable' });
    });

    it('flags a meaningful break even when a separate spacer paragraph was removable', () => {
      // The spacer alone would be dropped, but the break in the third paragraph is meaningful, so
      // the whole field is unrepresentable rather than partially cleaned and sent to fail.
      expect(normaliseImportedAbstractHtml('<p>One.</p><p><br></p><p>Two<br>three</p>')).toEqual({
        kind: 'unrepresentable',
      });
    });
  });

  describe('preserves the semantic abstract exactly (positive and negative)', () => {
    it('keeps the whole first paragraph and removes only the spacer', () => {
      const meaningful =
        '<p>This book examines how the military orders and the ideology of crusading gave rise to a new sacred landscape in the medieval Baltic region, an outpost of Latin Christianity.</p>';
      const input = `${meaningful}\n<p style="text-align:justify;"><br>\n</p>`;

      const result = normaliseImportedAbstractHtml(input);

      expect(result).toEqual({ kind: 'content', content: meaningful });
      // Negative controls: neither the break nor the spacer's styling can survive.
      expect(result.kind === 'content' && result.content).not.toContain('<br');
      expect(result.kind === 'content' && result.content).not.toContain('text-align');
    });
  });
});
