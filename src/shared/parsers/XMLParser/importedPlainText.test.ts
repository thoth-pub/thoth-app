import { describe, expect, it } from 'vitest';

import { normaliseImportedPlainText } from './importedPlainText';

/**
 * The pure plain-text-compatibility normaliser for imported abstracts and biographies. Every case
 * pins both directions: what whitespace is rewritten or refused *and* what content survives
 * untouched, so an implementation that flattened meaning — or invented a rejection — could not
 * pass.
 */
describe('normaliseImportedPlainText', () => {
  describe('markup-free text declared HTML (02) or XHTML (05): whitespace collapses as it would render', () => {
    it('collapses the physical newline of a wrapped HTML source line to a space', () => {
      // The production shape from Arc product 9781942401353: an abstract declared textformat="02"
      // with no tags at all, wrapped across physical lines by the publisher's XML tooling.
      expect(normaliseImportedPlainText('02', 'Hello\nworld')).toEqual({
        kind: 'content',
        content: 'Hello world',
      });
    });

    it('treats an XHTML (05) declaration exactly like HTML', () => {
      expect(normaliseImportedPlainText('05', 'Hello\nworld')).toEqual({
        kind: 'content',
        content: 'Hello world',
      });
    });

    it('collapses every run of HTML-collapsible whitespace — tab, CRLF, CR, form feed — to one space', () => {
      expect(normaliseImportedPlainText('02', 'a\tb\r\nc\rd\fe  f')).toEqual({
        kind: 'content',
        content: 'a b c d e f',
      });
    });

    it('collapses a trailing-space-then-newline wrap, the shape Arc actually writes, to one space', () => {
      expect(normaliseImportedPlainText('02', 'a wide range of \ninterdisciplinary methods')).toEqual({
        kind: 'content',
        content: 'a wide range of interdisciplinary methods',
      });
    });

    it('preserves NBSP and narrow no-break space: HTML renders them, so they are content', () => {
      expect(normaliseImportedPlainText('02', 'page\u00A01 and §\u202F2\nnext')).toEqual({
        kind: 'content',
        content: 'page\u00A01 and §\u202F2 next',
      });
    });

    it('preserves punctuation and non-ASCII text around the collapse', () => {
      expect(normaliseImportedPlainText('02', 'Colour and Space, \n2012–16 — an Open Access publication.')).toEqual({
        kind: 'content',
        content: 'Colour and Space, 2012–16 — an Open Access publication.',
      });
    });

    it('leaves one-line prose without collapsible runs byte-for-byte untouched', () => {
      const prose = 'A study of medieval medicine and the maternal body.';

      expect(normaliseImportedPlainText('02', prose)).toEqual({ kind: 'content', content: prose });
    });

    it('trims the edges rather than leaving a leading or trailing space', () => {
      // Whitespace at the edge of an HTML block collapses away entirely, not to a space.
      expect(normaliseImportedPlainText('02', ' Hello\nworld\n')).toEqual({
        kind: 'content',
        content: 'Hello world',
      });
    });

    it('reports a whitespace-only field as empty rather than creating a blank abstract', () => {
      expect(normaliseImportedPlainText('02', ' \n\t ')).toEqual({ kind: 'empty' });
    });
  });

  describe('any other declaration: a literal single line break is unrepresentable', () => {
    it.each(['06', '07', '03', ''])('blocks a single newline under declaration %j', (declared) => {
      expect(normaliseImportedPlainText(declared, 'Hello\nworld')).toEqual({ kind: 'unrepresentable' });
    });

    it('blocks an unknown declaration the same conservative way', () => {
      expect(normaliseImportedPlainText('99', 'Hello\nworld')).toEqual({ kind: 'unrepresentable' });
    });

    it('reads CRLF as one line break, not two', () => {
      expect(normaliseImportedPlainText('06', 'Hello\r\nworld')).toEqual({ kind: 'unrepresentable' });
    });

    it('reads a bare carriage return as a line break too', () => {
      // The API would silently keep a bare \r as a control character inside the text; refusing it
      // is deliberately stricter, because it was a line break where the file came from.
      expect(normaliseImportedPlainText('06', 'Hello\rworld')).toEqual({ kind: 'unrepresentable' });
    });

    it('passes blank-line paragraph separation through: the API represents it as two paragraphs', () => {
      expect(normaliseImportedPlainText('06', 'Paragraph one\n\nParagraph two')).toEqual({
        kind: 'content',
        content: 'Paragraph one\n\nParagraph two',
      });
    });

    it('canonicalises CRLF paragraph separation so no stray carriage return reaches the API', () => {
      expect(normaliseImportedPlainText('06', 'Paragraph one\r\n\r\nParagraph two')).toEqual({
        kind: 'content',
        content: 'Paragraph one\n\nParagraph two',
      });
    });

    it('reads a separator padded with blank-line whitespace as the API does', () => {
      // plain_text_to_ast splits on \n\s*\n, so extra newlines or spaces between paragraphs are
      // still one separator — and Rust's \s is Unicode White_Space, which includes NBSP.
      expect(normaliseImportedPlainText('06', 'One\n\n\nTwo')).toEqual({ kind: 'content', content: 'One\n\n\nTwo' });
      expect(normaliseImportedPlainText('06', 'One\n \nTwo')).toEqual({ kind: 'content', content: 'One\n \nTwo' });
      expect(normaliseImportedPlainText('06', 'One\n\u00A0\nTwo')).toEqual({
        kind: 'content',
        content: 'One\n\u00A0\nTwo',
      });
    });

    it('still blocks when a paragraph holds a lone newline beside a real separator', () => {
      expect(normaliseImportedPlainText('06', 'One\n\nTwo\nThree')).toEqual({ kind: 'unrepresentable' });
    });

    it('does not read U+FEFF between newlines as a blank separator, because the API does not', () => {
      // JavaScript's \s matches U+FEFF; Rust's Unicode White_Space — what the API's \n\s*\n
      // resolves to — does not. Judged a separator here, these two newlines would reach the API's
      // plain-text path and become two rejected Breaks.
      expect(normaliseImportedPlainText('06', 'One\n\uFEFF\nTwo')).toEqual({ kind: 'unrepresentable' });
    });

    it('leaves single-paragraph prose untouched, whatever it declares', () => {
      const prose = 'A study of medieval medicine and the maternal body.';

      expect(normaliseImportedPlainText('06', prose)).toEqual({ kind: 'content', content: prose });
      expect(normaliseImportedPlainText('', prose)).toEqual({ kind: 'content', content: prose });
    });

    it('never collapses interior spaces or tabs: plain-text whitespace is literal', () => {
      expect(normaliseImportedPlainText('06', 'Columns:  a\tb')).toEqual({
        kind: 'content',
        content: 'Columns:  a\tb',
      });
    });

    it('reports a whitespace-only field as empty rather than creating a blank abstract', () => {
      expect(normaliseImportedPlainText('06', ' \n \n ')).toEqual({ kind: 'empty' });
    });
  });
});
