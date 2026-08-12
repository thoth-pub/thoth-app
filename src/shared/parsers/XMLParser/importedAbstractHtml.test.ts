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

    it('removes a spacer between two real paragraphs, leaving the surrounding whitespace alone', () => {
      // Only the spacer's own characters go. The newlines that flanked it stay where the publisher
      // put them — between block elements they render identically, and the alternative (swallowing
      // adjacent whitespace) is what used to run two inline survivors together.
      expect(normaliseImportedAbstractHtml('<p>One.</p>\n<p><br></p>\n<p>Two.</p>')).toEqual({
        kind: 'content',
        content: '<p>One.</p>\n\n<p>Two.</p>',
      });
    });
  });

  /**
   * Removing a spacer must never join two pieces of surviving text. Between block paragraphs the
   * whitespace around a spacer is decorative, but between inline survivors it is the only thing
   * keeping two words apart, and this transform cannot tell the two apart without reserialising the
   * fragment — so it removes the spacer's own characters and nothing else.
   */
  describe('preserves the separators around a removed spacer', () => {
    it('keeps the space that followed the spacer between two inline survivors', () => {
      expect(normaliseImportedAbstractHtml('<span>Hello</span><p><br></p> <span>world</span>')).toEqual({
        kind: 'content',
        content: '<span>Hello</span> <span>world</span>',
      });
    });

    it('keeps the space that preceded the spacer between two inline survivors', () => {
      expect(normaliseImportedAbstractHtml('<span>Hello</span> <p><br></p><span>world</span>')).toEqual({
        kind: 'content',
        content: '<span>Hello</span> <span>world</span>',
      });
    });

    it('keeps the space after the spacer between two runs of bare text', () => {
      expect(normaliseImportedAbstractHtml('Text<p><br></p> more')).toEqual({
        kind: 'content',
        content: 'Text more',
      });
    });

    it('keeps the space before the spacer between two runs of bare text', () => {
      expect(normaliseImportedAbstractHtml('Text <p><br></p>more')).toEqual({
        kind: 'content',
        content: 'Text more',
      });
    });

    it('keeps every whitespace character that followed the spacer, not just the first', () => {
      expect(normaliseImportedAbstractHtml('<span>Hello</span><p><br></p>\n\t  <span>world</span>')).toEqual({
        kind: 'content',
        content: '<span>Hello</span>\n\t  <span>world</span>',
      });
    });

    it('keeps the separators around each of several removed spacers', () => {
      expect(
        normaliseImportedAbstractHtml('<span>a</span> <p><br></p> <span>b</span> <p>&nbsp;</p> <span>c</span>'),
      ).toEqual({ kind: 'content', content: '<span>a</span>  <span>b</span>  <span>c</span>' });
    });

    it('never invents a separator where the source had none', () => {
      expect(normaliseImportedAbstractHtml('<span>Hello</span><p><br></p><span>world</span>')).toEqual({
        kind: 'content',
        content: '<span>Hello</span><span>world</span>',
      });
    });

    it('still removes the Arc block spacer, whose surrounding whitespace is at the document edge', () => {
      expect(normaliseImportedAbstractHtml('<p>Real abstract.</p>\n<p style="text-align:justify;"><br>\n</p>')).toEqual(
        {
          kind: 'content',
          content: '<p>Real abstract.</p>',
        },
      );
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

  /**
   * An HTML comment renders nothing and contains no markup, however tag-shaped its text looks. Both
   * directions are pinned: a comment can never conjure a structural element that is not there, and
   * it can never hide one that is.
   */
  describe('treats HTML comments as opaque, non-rendering text', () => {
    it('does not read a <br> written inside a comment as a real line break', () => {
      const input = '<p>Text</p><!-- layout uses <br> -->';
      const result = normaliseImportedAbstractHtml(input);

      expect(result).toEqual({ kind: 'content', content: input });
      // The comment itself is content the importer has no business rewriting: it survives verbatim.
      expect(result.kind === 'content' && result.content).toBe(input);
    });

    it('does not flag a comment that is nothing but a break', () => {
      expect(normaliseImportedAbstractHtml('<!-- <br> -->')).toEqual({
        kind: 'content',
        content: '<!-- <br> -->',
      });
    });

    it('does not build a fake spacer paragraph out of commented-out markup', () => {
      const input = '<!-- <p><br></p> --><p>Real.</p>';

      // No paragraph is removed and no break is seen: the only real paragraph carries visible text.
      expect(normaliseImportedAbstractHtml(input)).toEqual({ kind: 'content', content: input });
    });

    it('still removes a spacer paragraph whose only other child is a comment', () => {
      expect(normaliseImportedAbstractHtml('<p><!-- publisher spacer --><br></p>')).toEqual({ kind: 'empty' });
      expect(normaliseImportedAbstractHtml('<p>Real abstract.</p><p><!-- publisher spacer --><br></p>')).toEqual({
        kind: 'content',
        content: '<p>Real abstract.</p>',
      });
    });

    it('keeps a paragraph whose visible text merely sits beside a comment', () => {
      const input = '<p><!-- editor note -->Real text.</p>';

      expect(normaliseImportedAbstractHtml(input)).toEqual({ kind: 'content', content: input });
    });

    it('still blocks a real break that happens to share the field with a commented-out one', () => {
      expect(normaliseImportedAbstractHtml('<p>Hello<br>world</p><!-- <br> -->')).toEqual({
        kind: 'unrepresentable',
      });
      // …and a comment before it cannot smuggle the real break past the check either.
      expect(normaliseImportedAbstractHtml('<!-- <p> --><p>Hello<br>world</p>')).toEqual({
        kind: 'unrepresentable',
      });
    });

    it('leaves two real paragraphs separated by a break-shaped comment untouched', () => {
      const input = '<p>Hello</p><!-- <br> --><p>world</p>';

      expect(normaliseImportedAbstractHtml(input)).toEqual({ kind: 'content', content: input });
    });

    it('does not let a comment end early on a stray -- inside it', () => {
      const input = '<p>Text</p><!-- em--dash and <br> -->';

      expect(normaliseImportedAbstractHtml(input)).toEqual({ kind: 'content', content: input });
    });

    it('treats an unterminated <!-- as ordinary text rather than hiding the rest of the field', () => {
      // Broken markup: reading it as a comment to the end would make everything after it invisible,
      // which could delete real content. Left as text it can only block sooner, never delete more.
      const input = '<p>Text</p><!-- unterminated';
      expect(normaliseImportedAbstractHtml(input)).toEqual({ kind: 'content', content: input });

      expect(normaliseImportedAbstractHtml('<p>Text</p><!-- unterminated <br>')).toEqual({
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
