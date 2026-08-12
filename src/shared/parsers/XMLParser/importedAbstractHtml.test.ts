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
   * `>` is legal inside a quoted attribute value, so a tag does not end at the first `>` — it ends
   * at the first one outside quotes. Getting this wrong turned the tail of an attribute into visible
   * paragraph text, which kept an empty spacer alive and blocked the import over its `<br>`.
   */
  describe('ends a tag only at a > outside quoted attribute values', () => {
    it('treats a double-quoted attribute holding > as one opening tag', () => {
      expect(normaliseImportedAbstractHtml('<p title="1 > 0"><br></p>')).toEqual({ kind: 'empty' });
    });

    it('treats a single-quoted attribute holding > as one opening tag', () => {
      expect(normaliseImportedAbstractHtml("<p title='1 > 0'><br></p>")).toEqual({ kind: 'empty' });
    });

    it('keeps a paragraph whose attribute holds > and whose body is real text', () => {
      const input = '<p title="1 > 0">Real text.</p>';

      expect(normaliseImportedAbstractHtml(input)).toEqual({ kind: 'content', content: input });
    });

    it('still blocks a real break in a paragraph whose attribute holds >', () => {
      expect(normaliseImportedAbstractHtml('<p title="1 > 0">Hello<br>world</p>')).toEqual({
        kind: 'unrepresentable',
      });
    });

    it('handles several > inside one attribute, and several quoted attributes', () => {
      expect(normaliseImportedAbstractHtml('<p data-note="a > b > c"><br></p>')).toEqual({ kind: 'empty' });
      expect(normaliseImportedAbstractHtml('<p data-note="a > b > c" class="x"><br></p>')).toEqual({ kind: 'empty' });
      expect(normaliseImportedAbstractHtml("<p data-note='a > b' class='x'><br></p>")).toEqual({ kind: 'empty' });
    });

    it('reads a quote of the other kind inside a quoted value as ordinary text', () => {
      const input = `<p title="it's > here">Real text.</p>`;

      expect(normaliseImportedAbstractHtml(input)).toEqual({ kind: 'content', content: input });
      expect(normaliseImportedAbstractHtml(`<p title='say "hi" > now'><br></p>`)).toEqual({ kind: 'empty' });
    });

    it('keeps the attribute verbatim on a paragraph that survives beside a removed spacer', () => {
      expect(normaliseImportedAbstractHtml('<p title="1 > 0">Real text.</p><p><br></p>')).toEqual({
        kind: 'content',
        content: '<p title="1 > 0">Real text.</p>',
      });
    });

    it('does not tokenise a quoted > written inside a comment', () => {
      const input = '<!-- <p title="1 > 0"><br></p> --><p>Real.</p>';

      expect(normaliseImportedAbstractHtml(input)).toEqual({ kind: 'content', content: input });
      expect(normaliseImportedAbstractHtml('<p>Text</p><!-- documentation says x > y and uses <br> -->')).toEqual({
        kind: 'content',
        content: '<p>Text</p><!-- documentation says x > y and uses <br> -->',
      });
    });

    it('removes a spacer whose attribute holds > and whose comment holds > and <br>', () => {
      expect(normaliseImportedAbstractHtml('<p title="a > b"><!-- comment contains > and <br> --><br></p>')).toEqual({
        kind: 'empty',
      });
    });

    it('leaves a tag whose quoted value never closes as text rather than guessing where it ended', () => {
      // Broken markup. Keeping it as text can only preserve more and block sooner; inventing a tag
      // boundary could turn a paragraph holding real text into a removable spacer.
      const input = '<p title="oops>Real text.';

      expect(normaliseImportedAbstractHtml(input)).toEqual({ kind: 'content', content: input });
    });
  });

  /**
   * A field that renders nothing must be omitted rather than created empty. Removing the only
   * paragraph of `<div><p><br></p></div>` leaves `<div></div>` — not an empty string, but an empty
   * abstract, since the backend reads `div` as a transparent document container.
   */
  describe('reports a field that renders nothing as empty', () => {
    it('keeps a paragraph holding an anchor, whose text may be blank but whose href is not', () => {
      // Spacer classification and emptiness must agree about anchors: the backend keeps an anchor's
      // URL (`Link { url, text }`), so a blank-looking one is still publisher data.
      const hrefOnly = '<p><a href="https://example.com"></a></p>';

      expect(normaliseImportedAbstractHtml(hrefOnly)).toEqual({ kind: 'content', content: hrefOnly });
    });

    it('omits a wrapper left holding nothing after its spacer went', () => {
      expect(normaliseImportedAbstractHtml('<div><p><br></p></div>')).toEqual({ kind: 'empty' });
      expect(normaliseImportedAbstractHtml('<div><p> </p></div>')).toEqual({ kind: 'empty' });
      expect(normaliseImportedAbstractHtml('<div><p>&nbsp;</p></div>')).toEqual({ kind: 'empty' });
      expect(normaliseImportedAbstractHtml('<div><!-- note --><p><br></p></div>')).toEqual({ kind: 'empty' });
      expect(normaliseImportedAbstractHtml('<div><span></span><p><br></p></div>')).toEqual({ kind: 'empty' });
    });

    it('omits wrapper-only markup that never had a spacer to remove', () => {
      for (const input of [
        '<div></div>',
        '<div>   </div>',
        '<div><!-- note --></div>',
        '<div><span></span></div>',
        '<div><span> </span></div>',
        '<span></span>',
        '<strong></strong>',
        '<em> </em>',
        '<div><span><!-- note --> &nbsp; </span></div>',
      ]) {
        expect(normaliseImportedAbstractHtml(input)).toEqual({ kind: 'empty' });
      }
    });

    it('keeps a wrapper that holds real text', () => {
      for (const input of ['<div><span>Hello</span></div>', '<div><p>Real.</p></div>', '<span>Hello</span>']) {
        expect(normaliseImportedAbstractHtml(input)).toEqual({ kind: 'content', content: input });
      }
    });

    it('keeps the surviving text when a wrapper holds both content and a spacer', () => {
      expect(normaliseImportedAbstractHtml('<div><span>Real.</span><p><br></p></div>')).toEqual({
        kind: 'content',
        content: '<div><span>Real.</span></div>',
      });
    });

    it('keeps a real paragraph beside a wrapper that emptied out', () => {
      expect(normaliseImportedAbstractHtml('<div><p><br></p></div><p>Real.</p>')).toEqual({
        kind: 'content',
        content: '<div></div><p>Real.</p>',
      });
    });

    it('never calls an element it does not recognise empty', () => {
      // Conservative by design: an unknown or standalone element may carry meaning the backend
      // understands, so the field is kept and existing validation decides — data is never deleted
      // merely because this normaliser cannot read it.
      for (const input of [
        '<div><img src="cover.jpg"></div>',
        '<div><hr></div>',
        '<div><a href="https://example.com"></a></div>',
        '<div><ul><li></li></ul></div>',
        '<figure><figcaption></figcaption></figure>',
      ]) {
        expect(normaliseImportedAbstractHtml(input)).toEqual({ kind: 'content', content: input });
      }
    });

    it('still blocks a real break inside a wrapper rather than calling the wrapper empty', () => {
      expect(normaliseImportedAbstractHtml('<div><p>Hello<br>world</p></div>')).toEqual({ kind: 'unrepresentable' });
      // A loose break in a wrapper is not a spacer paragraph, so it blocks rather than vanishing.
      expect(normaliseImportedAbstractHtml('<div><br></div>')).toEqual({ kind: 'unrepresentable' });
    });
  });

  /**
   * An anchor is never blank in the sense that lets a paragraph be deleted: its text can be empty
   * while the element still carries a URL the backend keeps. Every case here pins that the anchor —
   * and the paragraph around it — survives, and that a real `<br>` beside one still blocks instead
   * of the paragraph being swept away as a spacer.
   */
  describe('never removes a paragraph because an anchor looks blank', () => {
    it('keeps an href-only anchor and the paragraph holding it', () => {
      const input = '<p><a href="https://example.com"></a></p>';

      expect(normaliseImportedAbstractHtml(input)).toEqual({ kind: 'content', content: input });
      // The URL is what would have been lost, so assert on it directly.
      expect(normaliseImportedAbstractHtml(input)).toEqual(
        expect.objectContaining({ content: expect.stringContaining('https://example.com') }),
      );
    });

    it('blocks a real break beside an href-only anchor instead of deleting the href', () => {
      expect(normaliseImportedAbstractHtml('<p><a href="https://example.com"></a><br></p>')).toEqual({
        kind: 'unrepresentable',
      });
    });

    it('keeps an anchor that has visible text, and blocks a break beside it', () => {
      const input = '<p><a href="https://example.com">Example</a></p>';

      expect(normaliseImportedAbstractHtml(input)).toEqual({ kind: 'content', content: input });
      expect(normaliseImportedAbstractHtml('<p><a href="https://example.com">Example</a><br></p>')).toEqual({
        kind: 'unrepresentable',
      });
    });

    it('keeps even an anchor with no attributes at all', () => {
      // Deciding by attribute would mean parsing them to justify a deletion; keeping is cheaper and
      // cannot lose anything.
      const input = '<p><a></a></p>';

      expect(normaliseImportedAbstractHtml(input)).toEqual({ kind: 'content', content: input });
    });

    it('still removes the Arc spacer, which holds no anchor', () => {
      expect(normaliseImportedAbstractHtml('<p style="text-align:justify;"><br></p>')).toEqual({ kind: 'empty' });
      expect(normaliseImportedAbstractHtml('<p>Real.</p><p style="text-align:justify;"><br></p>')).toEqual({
        kind: 'content',
        content: '<p>Real.</p>',
      });
    });
  });

  /**
   * HTML lets a paragraph's end tag be omitted before a block element, and the API parses with a
   * real HTML parser, so `<p><br><div>Real text</div>` is a spacer paragraph *followed by* a div.
   * Reading the div as paragraph content made the spacer look meaningful and blocked the import.
   */
  describe('ends a paragraph where a block element implicitly closes it', () => {
    it('removes only the spacer and keeps the block that ended it', () => {
      expect(normaliseImportedAbstractHtml('<p><br><div>Real text</div>')).toEqual({
        kind: 'content',
        content: '<div>Real text</div>',
      });
    });

    it('handles each representative block start tag', () => {
      const cases: [string, string][] = [
        ['<p><br><section>Real text</section>', '<section>Real text</section>'],
        ['<p><br><article>Real text</article>', '<article>Real text</article>'],
        ['<p><br><blockquote>Quoted</blockquote>', '<blockquote>Quoted</blockquote>'],
        ['<p><br><ul><li>Item</li></ul>', '<ul><li>Item</li></ul>'],
        ['<p><br><ol><li>Item</li></ol>', '<ol><li>Item</li></ol>'],
        ['<p><br><table><tr><td>Cell</td></tr></table>', '<table><tr><td>Cell</td></tr></table>'],
        ['<p><br><h1>Heading</h1>', '<h1>Heading</h1>'],
        ['<p><br><pre>code</pre>', '<pre>code</pre>'],
      ];

      for (const [input, content] of cases) {
        expect(normaliseImportedAbstractHtml(input)).toEqual({ kind: 'content', content });
      }
    });

    it('still closes a paragraph at the next opening <p>, as it always did', () => {
      expect(normaliseImportedAbstractHtml('<p><br><p>Real paragraph</p>')).toEqual({
        kind: 'content',
        content: '<p>Real paragraph</p>',
      });
    });

    it('keeps the whitespace that sat outside the implicitly closed paragraph', () => {
      // Whitespace *before* the `<p>` was never part of it and must survive, exactly as it does for
      // an explicitly closed spacer. (Whitespace after the `<br>` is inside the paragraph — a real
      // parser puts it there, since the `<div>` is what ends the paragraph — so it goes with it.)
      expect(normaliseImportedAbstractHtml('<span>a</span> <p><br><div>Real</div>')).toEqual({
        kind: 'content',
        content: '<span>a</span> <div>Real</div>',
      });
      expect(normaliseImportedAbstractHtml('<span>a</span>\n\t<p><br><section>Real</section>')).toEqual({
        kind: 'content',
        content: '<span>a</span>\n\t<section>Real</section>',
      });
      // At the document edge the existing outer trim takes it, as before.
      expect(normaliseImportedAbstractHtml('<p><br>\n<section>Real text</section>')).toEqual({
        kind: 'content',
        content: '<section>Real text</section>',
      });
    });

    it('keeps a paragraph that a block ends but that carried real text', () => {
      const input = '<p>Hello<div>Real</div>';

      expect(normaliseImportedAbstractHtml(input)).toEqual({ kind: 'content', content: input });
    });

    it('still blocks a break belonging to a meaningful paragraph a block ended', () => {
      expect(normaliseImportedAbstractHtml('<p>Hello<br><div>Real</div>')).toEqual({ kind: 'unrepresentable' });
    });

    it('does not let an inline element end a paragraph', () => {
      // A `<span>` keeps the paragraph open, so the break sits beside visible text and blocks.
      expect(normaliseImportedAbstractHtml('<p><br><span>Inline</span></p>')).toEqual({ kind: 'unrepresentable' });
      expect(normaliseImportedAbstractHtml('<p><br><em>Inline</em></p>')).toEqual({ kind: 'unrepresentable' });
    });

    it('does not let an unknown or custom element end a paragraph', () => {
      // Unlisted names must not silently change where a paragraph is judged to end.
      expect(normaliseImportedAbstractHtml('<p><br><custom-tag>Real</custom-tag></p>')).toEqual({
        kind: 'unrepresentable',
      });
    });

    it('treats a comment before the block as the non-rendering thing it is', () => {
      expect(normaliseImportedAbstractHtml('<p><br><!-- note --><div>Real</div>')).toEqual({
        kind: 'content',
        content: '<div>Real</div>',
      });
    });

    it('closes a paragraph before a standalone <hr>, which HTML also ends a paragraph with', () => {
      expect(normaliseImportedAbstractHtml('<p><br><hr>')).toEqual({ kind: 'content', content: '<hr>' });
    });

    it('keeps quoted attributes and comments working across an implicit close', () => {
      expect(normaliseImportedAbstractHtml('<p title="1 > 0"><br><div>Real text</div>')).toEqual({
        kind: 'content',
        content: '<div>Real text</div>',
      });
      expect(normaliseImportedAbstractHtml('<p><br><div title="a > b">Real</div>')).toEqual({
        kind: 'content',
        content: '<div title="a > b">Real</div>',
      });
      // A block name written inside a comment is not a block start and ends nothing.
      expect(normaliseImportedAbstractHtml('<p>Hello<!-- <div> -->world</p>')).toEqual({
        kind: 'content',
        content: '<p>Hello<!-- <div> -->world</p>',
      });
    });
  });

  /**
   * The third way a paragraph ends: an element that was open *around* it closes. `</div>` cannot
   * close while a paragraph inside it is still open, so the paragraph goes first — while `</span>`
   * for a span opened *inside* the paragraph closes only itself. The difference is ancestry, not the
   * tag name, and both directions are pinned here.
   */
  describe('ends a paragraph when an element open around it closes', () => {
    it('removes a spacer whose parent closed, keeping the parent and what follows', () => {
      expect(normaliseImportedAbstractHtml('<div><p><br></div><p>Real text</p>')).toEqual({
        kind: 'content',
        content: '<div></div><p>Real text</p>',
      });
    });

    it('omits the field when the parent close leaves nothing that renders', () => {
      expect(normaliseImportedAbstractHtml('<div><p><br></div>')).toEqual({ kind: 'empty' });
    });

    it('lets whitespace inside the spacer leave with it and touches nothing outside', () => {
      expect(normaliseImportedAbstractHtml('<div><p><br>\n</div><p>Real text</p>')).toEqual({
        kind: 'content',
        content: '<div></div><p>Real text</p>',
      });
      // Whitespace before the `<p>` was never inside it and survives.
      expect(normaliseImportedAbstractHtml('<div>\n<p><br></div><p>Real.</p>')).toEqual({
        kind: 'content',
        content: '<div>\n</div><p>Real.</p>',
      });
    });

    it('closes at the innermost ancestor and deletes nothing further out', () => {
      expect(normaliseImportedAbstractHtml('<section><div><p><br></div></section><p>Real.</p>')).toEqual({
        kind: 'content',
        content: '<section><div></div></section><p>Real.</p>',
      });
    });

    it('ends a paragraph whose surrounding inline element closes', () => {
      // `<span>` was open before the `<p>`, so it is an ancestor and its end tag closes the
      // paragraph — exactly as a real parser does.
      expect(normaliseImportedAbstractHtml('<span><p><br></span><p>Real.</p>')).toEqual({
        kind: 'content',
        content: '<span></span><p>Real.</p>',
      });
    });

    it('does not let a descendant inline close end the paragraph', () => {
      // `</span>` closes a span opened inside the paragraph, so the paragraph keeps going and its
      // visible text makes the break meaningful.
      expect(normaliseImportedAbstractHtml('<div><p><span><br></span>Real text</p></div>')).toEqual({
        kind: 'unrepresentable',
      });
      expect(normaliseImportedAbstractHtml('<div><p><em>Hello</em><br></p></div>')).toEqual({
        kind: 'unrepresentable',
      });
      expect(normaliseImportedAbstractHtml('<p><em>Hello</em></p>')).toEqual({
        kind: 'content',
        content: '<p><em>Hello</em></p>',
      });
    });

    it('still blocks a real break when the parent close follows visible text', () => {
      expect(normaliseImportedAbstractHtml('<div><p>Hello<br></div>')).toEqual({ kind: 'unrepresentable' });
    });

    it('removes a parent-closed spacer built from a blank formatting wrapper', () => {
      expect(normaliseImportedAbstractHtml('<div><p><strong> </strong><br></div>')).toEqual({ kind: 'empty' });
    });

    it('leaves an explicitly closed paragraph behaving exactly as before', () => {
      expect(normaliseImportedAbstractHtml('<div><p><br></p></div>')).toEqual({ kind: 'empty' });
    });

    it('ignores a stray end tag rather than letting it authorise a deletion', () => {
      // Nothing of that name is open. A real parser drops the tag and would call this paragraph
      // empty; blocking instead is the safe direction, since the alternative is deleting on the
      // strength of markup we could not make sense of.
      expect(normaliseImportedAbstractHtml('<p><br></div>')).toEqual({ kind: 'unrepresentable' });
      expect(normaliseImportedAbstractHtml('<p>Real.</p></div>')).toEqual({
        kind: 'content',
        content: '<p>Real.</p></div>',
      });
    });

    it('keeps the block-start close working alongside the parent close', () => {
      expect(normaliseImportedAbstractHtml('<p><br><div>Real text</div>')).toEqual({
        kind: 'content',
        content: '<div>Real text</div>',
      });
      expect(normaliseImportedAbstractHtml('<div><p><br><section>Real</section></div>')).toEqual({
        kind: 'content',
        content: '<div><section>Real</section></div>',
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
      // Not unrepresentable — the commented `<br>` is not a break. It is `empty` rather than
      // `content` because a field consisting only of a comment renders nothing, so there is no
      // abstract to create; that is the same rule that omits `<div><p><br></p></div>`.
      expect(normaliseImportedAbstractHtml('<!-- <br> -->')).toEqual({ kind: 'empty' });
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
