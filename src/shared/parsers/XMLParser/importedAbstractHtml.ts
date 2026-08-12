/**
 * HTML-compatibility normalisation for imported abstract-like text — long abstracts, short
 * abstracts and biographies — whose source markup has *already* been resolved to HTML by
 * {@link resolveOnixTextMarkup}. It runs on the extracted content string, after format
 * resolution and never before it, and it is the one place the importer edits that content.
 *
 * Why it exists. Thoth converts every abstract and biography to a JATS subset in which a line
 * break is not representable: the backend maps HTML `<br>` to an AST `Break`, and `Break` is a
 * child no abstract paragraph may contain and no abstract document may hold at top level either
 * (`validate_abstract_content` in `thoth-api/src/markup/ast.rs`). So *every* `<br>` an imported
 * HTML abstract contains would be rejected by the API — a paragraph holding one fails with
 * "Abstracts and biographies cannot contain nested block elements inside paragraphs", which is the
 * exact production error this hotfix answers.
 *
 * The safe subset. Publisher ONIX (Arc Humanities Press) routinely closes an abstract with an
 * empty layout paragraph such as `<p style="text-align:justify;"><br></p>`. That paragraph holds
 * no visible content: it is pure formatting cruft, and removing the whole paragraph removes its
 * `<br>` with it, losing nothing. A `<br>` inside a paragraph that *does* carry visible content is
 * the opposite — a meaningful line break — and must never be silently deleted or turned into a
 * space. It is reported as unrepresentable so the import blocks in preview, before any mutation
 * runs, rather than being discovered at the API partway through a non-atomic bulk import.
 *
 * Scope. This is a narrow, pure, dependency-free transform, not an HTML sanitiser and not a second
 * copy of the backend's markup validator. It removes structurally-empty paragraphs and detects the
 * `<br>` that survive; every character outside a removed paragraph is copied verbatim, and the only
 * other edit is trimming whitespace from the two ends of the whole field once something has been
 * removed. Nothing between two survivors is ever dropped, so normalisation cannot run two pieces of
 * meaningful text together. Anything else an abstract's markup might get wrong stays the API's job.
 */

/**
 * The outcome of normalising one imported HTML abstract or biography field.
 *
 * - `content` — usable HTML, with any empty spacer paragraphs removed. `content` is non-empty and
 *   still contains markup; the caller creates the entity with it.
 * - `empty` — the field held nothing but spacer markup, so it has no semantic content. The caller
 *   omits the field: an empty abstract or biography is never created.
 * - `unrepresentable` — a meaningful `<br>` remains that Thoth cannot represent. The caller raises
 *   a blocking issue and drops the field, so it never reaches a mutation.
 */
export type ImportedAbstractHtml =
  | { kind: 'content'; content: string }
  | { kind: 'empty' }
  | { kind: 'unrepresentable' };

/** A tag token, named and classified; offsets are into the original string. */
type TagToken = {
  type: 'tag';
  start: number;
  end: number;
  /** The element name, lower-cased — HTML tag names are case-insensitive and the backend's parser lowercases them. */
  name: string;
  /** A closing tag, `</p>`. */
  closing: boolean;
  /** A void or self-closed element, `<br>` / `<br/>`, which opens nothing that needs closing. */
  standalone: boolean;
};

/** A run of text between tags; offsets are into the original string. */
type TextToken = { type: 'text'; start: number; end: number };

/**
 * A whole `<!-- … -->` comment, opener and closer included; offsets are into the original string. A
 * comment renders nothing, and the tag-shaped text it may contain is not markup, so it is neither
 * visible content nor a source of elements.
 */
type CommentToken = { type: 'comment'; start: number; end: number };

type Token = TagToken | TextToken | CommentToken;

/** One top-level `<p>` element: its byte span, and the token index range of its contents. */
type Paragraph = { start: number; end: number; innerFrom: number; innerTo: number };

/**
 * HTML elements that stand alone — they wrap no content and have no separate close tag. Only `br`
 * matters to this importer, but the rest are listed so a self-closing void element is never
 * mistaken for one that opens a region needing a matching close.
 */
const STANDALONE_ELEMENTS = new Set([
  'br',
  'img',
  'hr',
  'wbr',
  'area',
  'base',
  'col',
  'embed',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
]);

/**
 * Inline elements that only wrap text and contribute no visible content of their own, so a
 * paragraph whose sole non-`<br>` children are these — wrapping nothing but whitespace — is still
 * an empty spacer. Anything outside this set (a list, a nested block, an image) is treated as real
 * content, so the paragraph holding it is kept rather than removed.
 *
 * `a` is deliberately absent. An anchor's visible text can be blank while the element still carries
 * a URL the backend keeps — it maps to `Link { url, text }` — so a paragraph holding one is never
 * blank in the sense that matters, and deleting it would throw away publisher data. Keeping the
 * paragraph is the conservative answer, and it is the same answer {@link NON_RENDERING_ELEMENTS}
 * gives: the two sets now agree about anchors. Distinguishing an anchor that has an `href` from one
 * that does not would mean parsing attributes to decide what to delete, which is not a trade this
 * normaliser should make.
 */
const TRANSPARENT_INLINE_ELEMENTS = new Set([
  'abbr',
  'b',
  'big',
  'cite',
  'code',
  'del',
  'dfn',
  'em',
  'i',
  'ins',
  'mark',
  'q',
  's',
  'sc',
  'small',
  'span',
  'strike',
  'strong',
  'sub',
  'sup',
  'tt',
  'u',
  'underline',
  'var',
]);

/**
 * Elements that render nothing of their own, so a field built from these and blank text has no
 * content for Thoth to store. Chosen against what the backend's `html_to_ast` actually does with
 * each one (`thoth-api/src/markup/ast.rs`), not from a general idea of which tags look decorative:
 *
 * - `div`, `html`, `body` and `span` become `Document(children)` — pure containers;
 * - `p` becomes `Paragraph(children)`, which shows nothing when it holds nothing;
 * - the formatting wrappers below become `Bold`/`Italic`/`Underline`/`Strikethrough`/`Code`/
 *   `Superscript`/`Subscript` around their children, contributing no glyph themselves;
 * - the remaining inline names are unknown to the backend, which turns a childless one into
 *   `Text("")`.
 *
 * Everything else counts as content, deliberately. This set is narrower than
 * {@link TRANSPARENT_INLINE_ELEMENTS} — which answers the different question of whether a
 * *paragraph* is blank — and in particular excludes `a`, because the backend maps it to
 * `Link { url, text }` and so an empty one still carries its href; `ul`/`ol`/`li`, which carry list
 * structure; and every standalone element such as `<img>` and `<hr>`. An element this normaliser
 * does not recognise leaves the field as `content`, where the existing validation policy decides its
 * fate — the importer never deletes a field it merely fails to understand.
 */
const NON_RENDERING_ELEMENTS = new Set([
  'abbr',
  'b',
  'big',
  'body',
  'cite',
  'code',
  'del',
  'dfn',
  'div',
  'em',
  'html',
  'i',
  'ins',
  'mark',
  'p',
  'q',
  's',
  'sc',
  'small',
  'span',
  'strike',
  'strikethrough',
  'strong',
  'sub',
  'sup',
  'tt',
  'u',
  'underline',
  'var',
]);

/**
 * Start tags that implicitly end an open `<p>`, because HTML lets a paragraph's end tag be omitted
 * in front of them. Derived from the parsing behaviour itself rather than from a guess at which tags
 * "look like blocks": each name here was checked against a real HTML parser by asking whether
 * `<p>x<tag>y</tag>` puts the element inside the paragraph or after it.
 *
 * `table` is the one judgement call. It closes a paragraph in standards mode and not in quirks mode,
 * and an abstract fragment carries no doctype, so the backend's parser is technically in quirks mode
 * for it. It is included because the HTML specification lists `table` among the elements a `<p>` end
 * tag may be omitted before, and because including it can only spare a valid import a false block:
 * the span removed in front of a table is a paragraph that had to be content-free to be removed at
 * all, so no table and no text can be lost either way.
 *
 * Inline elements are absent by construction — a `<span>` or an `<em>` does not end a paragraph —
 * and so is any tag not listed, including unknown and custom ones, so nothing outside this set can
 * quietly change where a paragraph is judged to begin and end.
 */
const PARAGRAPH_IMPLICIT_END_ELEMENTS = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'center',
  'dd',
  'details',
  'dialog',
  'dir',
  'div',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hgroup',
  'hr',
  'li',
  'listing',
  'main',
  'menu',
  'nav',
  'ol',
  'plaintext',
  'pre',
  'section',
  'summary',
  'table',
  'ul',
  'xmp',
]);

/**
 * The non-breaking space in the forms an ONIX HTML abstract can carry it: the named entity, the
 * decimal and hexadecimal numeric references (with optional leading zeros), and — matched
 * separately, as a literal character — U+00A0 itself. A spacer paragraph may be built from these
 * and ordinary whitespace and nothing else.
 */
const NON_BREAKING_SPACE_ENTITY = /&nbsp;|&#0*160;|&#x0*a0;/gi;

/** Whether a run of text holds anything a reader would see, treating whitespace and NBSP as blank. */
const hasVisibleText = (text: string): boolean =>
  // `\s` already covers U+00A0, so replacing the entity forms with a space is enough for both.
  text.replace(NON_BREAKING_SPACE_ENTITY, ' ').replace(/\s+/g, '').length > 0;

const COMMENT_OPEN = '<!--';
const COMMENT_CLOSE = '-->';

/**
 * The offset just past the `>` that closes a tag whose name starts at `from`, or `-1` if no such
 * `>` exists.
 *
 * The `>` only closes the tag when it sits outside a quoted attribute value, because `>` is a
 * perfectly legal character inside one: `<p title="1 > 0">` is a single opening tag, not a tag
 * ending at the attribute's `>` followed by the text ` 0">`. Both quoting styles count, and a quote
 * of the other kind inside a quoted value is ordinary text (`<p title="it's here">`).
 *
 * A tag whose quoted value is never closed has no `>` outside quotes and reports `-1`; the caller
 * then keeps the `<` as text rather than guessing where the tag ended.
 */
const findTagEnd = (html: string, from: number): number => {
  let quote: string | null = null;

  for (let index = from; index < html.length; index += 1) {
    const char = html[index];

    if (quote !== null) {
      if (char === quote) quote = null;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === '>') return index + 1;
  }

  return -1;
};

/**
 * Splits the fragment into comments, tags and the text between them.
 *
 * A tag is `<`, an optional `/` and a letter — deliberately the same tag shape the backend's markup
 * detection uses, so a stray `<` in prose (`a < b`) stays text and is never read as a tag — run on
 * to the `>` that closes it per {@link findTagEnd}, which skips over quoted attribute values so a
 * `>` inside one cannot cut the tag short.
 *
 * A comment wins over a tag wherever one opens, and is opaque: everything from `<!--` to the first
 * following `-->` is one token, so tag-shaped prose inside it (`<!-- layout uses <br> -->`) is never
 * tokenised as markup. That is what an HTML parser does, and reading such text as a real `<br>`
 * would block an import over a line break that does not exist. Quoted-attribute scanning never runs
 * inside a comment, so a `>` written there is inert too.
 *
 * Markup that never terminates — an unterminated `<!--`, or a tag whose quoted attribute swallows
 * every remaining `>` — is broken rather than markup, and is deliberately left as ordinary text with
 * scanning resumed straight after the opener. Treating it as a region running to the end of the
 * fragment would make everything after it invisible, which could turn a paragraph holding real text
 * into a removable spacer. Leaving it as text can only make this normaliser keep more and block
 * sooner — never delete more.
 */
const tokenise = (html: string): Token[] => {
  const tokens: Token[] = [];
  const markupPattern = /<!--|<\/?[a-zA-Z]/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  const flushText = (until: number) => {
    if (until > cursor) tokens.push({ type: 'text', start: cursor, end: until });
  };

  while ((match = markupPattern.exec(html)) !== null) {
    if (match[0] === COMMENT_OPEN) {
      const closeAt = html.indexOf(COMMENT_CLOSE, match.index + COMMENT_OPEN.length);

      // Unterminated: keep the `<!--` in the surrounding text run and go on scanning after it.
      if (closeAt === -1) continue;

      flushText(match.index);

      const end = closeAt + COMMENT_CLOSE.length;
      tokens.push({ type: 'comment', start: match.index, end });
      cursor = end;
      markupPattern.lastIndex = end;
      continue;
    }

    const end = findTagEnd(html, match.index + match[0].length);

    // Never closed outside a quoted value: keep the `<` in the text run and scan on after it.
    if (end === -1) continue;

    flushText(match.index);

    const raw = html.slice(match.index, end);
    const closing = raw.startsWith('</');
    const name = (/^<\/?\s*([a-zA-Z][a-zA-Z0-9-]*)/.exec(raw)?.[1] ?? '').toLowerCase();
    const standalone = /\/\s*>$/.test(raw) || STANDALONE_ELEMENTS.has(name);

    tokens.push({ type: 'tag', start: match.index, end, name, closing, standalone });
    cursor = end;
    markupPattern.lastIndex = end;
  }

  if (cursor < html.length) {
    tokens.push({ type: 'text', start: cursor, end: html.length });
  }

  return tokens;
};

/**
 * Groups the tokens into top-level `<p>` elements. Paragraphs do not nest in HTML, so an opening
 * `<p>` while one is already open closes the previous one where it stood (as a real HTML parser
 * does), and an unclosed `<p>` runs to the end of the fragment. Content outside any paragraph is
 * simply not part of a returned paragraph — it is never removed, only examined for stray `<br>`.
 *
 * A `<p>` also ends where a block element starts, because HTML lets its end tag be omitted there:
 * `<p><br><div>Real text</div>` is a spacer paragraph followed by a div, not a paragraph containing
 * one, and reading it the second way blocked an import over a `<br>` the parser puts in an empty
 * paragraph. Only the start tags in {@link PARAGRAPH_IMPLICIT_END_ELEMENTS} do this.
 *
 * Where an implicit close lands matters: the paragraph ends at the end of the last token *inside* it,
 * not at the start of the block tag, so any whitespace written between the two stays outside the
 * paragraph's span and survives removal untouched. With nothing between them — the `<div>` above —
 * the two are the same offset and the removed span is exactly `<p><br>`. No `</p>` is invented and
 * nothing is reserialised.
 *
 * End tags are left alone. A `</div>` around an open paragraph does close it in a real parser, but
 * following that needs a nesting stack this scanner does not keep; not closing there can only leave a
 * paragraph looking like content and block, never delete one.
 */
const findParagraphs = (tokens: Token[], length: number): Paragraph[] => {
  const paragraphs: Paragraph[] = [];
  let open: { openIndex: number; start: number } | null = null;

  const close = (innerTo: number, end: number) => {
    if (open) {
      paragraphs.push({ start: open.start, end, innerFrom: open.openIndex + 1, innerTo });
      open = null;
    }
  };

  /** Ends the open paragraph after the last token that belonged to it, before token `index`. */
  const closeBefore = (index: number) => close(index, tokens[index - 1]?.end ?? open?.start ?? 0);

  tokens.forEach((token, index) => {
    if (token.type !== 'tag') return;

    if (token.name === 'p') {
      if (token.closing) {
        close(index, token.end);
      } else if (!token.standalone) {
        if (open) closeBefore(index);
        open = { openIndex: index, start: token.start };
      }

      return;
    }

    // A block element's start tag ends an open paragraph. `<hr>` is one of them and is standalone,
    // so being standalone is no reason to skip the check.
    if (open && !token.closing && PARAGRAPH_IMPLICIT_END_ELEMENTS.has(token.name)) closeBefore(index);
  });

  close(tokens.length, tokens[tokens.length - 1]?.end ?? length);

  return paragraphs;
};

/**
 * Whether a paragraph is a removable spacer: no visible text anywhere inside it, and no child
 * beyond `<br>`, comments and inline wrappers of blank text. A truly empty `<p></p>`, `<p>   </p>`,
 * `<p><br></p>`, `<p><br><br></p>`, `<p>&nbsp;<br></p>`, `<p><strong> </strong><br></p>` and
 * `<p><!-- publisher spacer --><br></p>` all qualify; a single visible character anywhere, or any
 * structural child such as a list, does not.
 */
const isSpacerParagraph = (tokens: Token[], html: string, paragraph: Paragraph): boolean => {
  for (let index = paragraph.innerFrom; index < paragraph.innerTo; index += 1) {
    const token = tokens[index];

    if (token.type === 'text') {
      if (hasVisibleText(html.slice(token.start, token.end))) return false;
      continue;
    }

    // A comment renders nothing, so it never keeps an otherwise-empty paragraph alive.
    if (token.type === 'comment') continue;

    if (token.name === 'br') continue;
    if (TRANSPARENT_INLINE_ELEMENTS.has(token.name)) continue;

    // Any other element (a list, an image, a nested block) is real content: keep the paragraph.
    return false;
  }

  return true;
};

/**
 * Rebuilds the fragment with the given byte spans — the spacer paragraphs — removed, and *only*
 * those spans: every character outside them, whitespace included, is copied verbatim. That is the
 * invariant that keeps surviving content byte-for-byte identical to the input.
 *
 * Nothing adjacent is swallowed, deliberately. The whitespace around a spacer can be the only thing
 * separating two survivors — `<span>Hello</span><p><br></p> <span>world</span>` renders as
 * "Hello world" and must not come back as "Helloworld" — and this transform cannot tell an inline
 * separator from a purely decorative newline between blocks without reserialising the whole
 * fragment. So it leaves the source whitespace exactly where the publisher put it. The cost is that
 * removing a spacer between two block paragraphs can leave the two newlines that surrounded it back
 * to back; that renders identically, and is much cheaper than the risk of running two words
 * together.
 */
const removeSpans = (html: string, spans: [number, number][]): string => {
  const ordered = [...spans].sort((left, right) => left[0] - right[0]);
  let result = '';
  let cursor = 0;

  for (const [start, end] of ordered) {
    if (start < cursor) continue;

    result += html.slice(cursor, start);
    cursor = end;
  }

  return result + html.slice(cursor);
};

/**
 * Whether a fragment would render nothing at all: no visible text anywhere, and no element beyond
 * the non-rendering wrappers of {@link NON_RENDERING_ELEMENTS}. Comments count for nothing, as they
 * do everywhere else here.
 *
 * This is what stands between removing a spacer and creating a content-free entity. Deleting the
 * only paragraph of `<div><p><br></p></div>` leaves `<div></div>`, which is not an empty *string*
 * but is an empty *abstract*: the backend reads `div` as a transparent document container, so the
 * field would reach the API holding nothing. A field like that is omitted instead.
 *
 * It is a deliberately shallow, conservative test rather than a second AST: it asks only whether
 * every surviving token is blank text, a comment, or a wrapper known to render nothing, and answers
 * "not empty" for everything else — an unrecognised element, a standalone one such as `<img>`, a
 * list, a link. Being wrong in that direction keeps a field the API may still reject; being wrong in
 * the other direction would silently drop an abstract.
 */
const rendersNothing = (tokens: Token[], html: string): boolean =>
  tokens.every((token) => {
    if (token.type === 'text') return !hasVisibleText(html.slice(token.start, token.end));
    if (token.type === 'comment') return true;

    return !token.standalone && NON_RENDERING_ELEMENTS.has(token.name);
  });

/**
 * Normalises one imported HTML abstract/biography field for Thoth's representable subset.
 *
 * Removes structurally-empty spacer paragraphs; keeps everything else exactly as it was; and, if a
 * meaningful `<br>` survives — one in a paragraph that carries visible content, or one loose at the
 * top level — reports the field as unrepresentable rather than editing it. A field that renders
 * nothing once the spacers are gone comes back `empty`, so no content-free entity is created for it.
 *
 * The order matters and is fixed: tokenise, find the spacer paragraphs, and only then judge the
 * `<br>` that are *not* inside one. A meaningful break outranks everything, so it is reported before
 * a single character is removed and the emptiness test never runs on a field that still holds a real
 * line break — no `<br>` can be swept away by being declared part of an empty wrapper.
 *
 * Precisely what "exactly as it was" means: a field with no spacer to remove is returned as the very
 * same string. A field that lost a spacer is that string minus the spacer's own characters, then
 * trimmed at its two ends — an edit that can only shorten the document's outermost whitespace and
 * can never bring two survivors into contact. Whitespace *between* survivors is always kept.
 */
export const normaliseImportedAbstractHtml = (content: string): ImportedAbstractHtml => {
  const tokens = tokenise(content);
  const paragraphs = findParagraphs(tokens, content.length);
  const spacers = paragraphs.filter((paragraph) => isSpacerParagraph(tokens, content, paragraph));

  const withinSpacer = (offset: number) => spacers.some(({ start, end }) => offset >= start && offset < end);
  const meaningfulBreak = tokens.some(
    (token) => token.type === 'tag' && token.name === 'br' && !withinSpacer(token.start),
  );

  // A meaningful line break outranks any spacer removal: the field cannot be represented, so it is
  // reported untouched rather than partially cleaned and sent to fail at the API.
  if (meaningfulBreak) return { kind: 'unrepresentable' };

  // Nothing to remove: return the input unchanged, so representable content is never rewritten.
  if (spacers.length === 0) {
    return rendersNothing(tokens, content) ? { kind: 'empty' } : { kind: 'content', content };
  }

  const cleaned = removeSpans(
    content,
    spacers.map(({ start, end }): [number, number] => [start, end]),
  ).trim();

  // Not a length test: what is left may still be wrappers holding nothing, such as the `<div></div>`
  // that removing the only paragraph of `<div><p><br></p></div>` leaves behind.
  return rendersNothing(tokenise(cleaned), cleaned) ? { kind: 'empty' } : { kind: 'content', content: cleaned };
};
