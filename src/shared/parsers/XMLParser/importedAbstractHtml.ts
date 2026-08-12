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
 * `<br>` that survive; everything it keeps is preserved byte-for-byte from the input. Anything else
 * an abstract's markup might get wrong stays the API's job.
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

type Token = TagToken | TextToken;

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
 */
const TRANSPARENT_INLINE_ELEMENTS = new Set([
  'a',
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

/**
 * Splits the fragment into tags and the text between them. A tag is `<` immediately followed by an
 * optional `/` and a letter, up to the next `>` — deliberately the same tag shape the backend's
 * markup detection uses, so a stray `<` in prose (`a < b`) stays text and is never read as a tag.
 * A `>` inside an attribute value would end a tag early here; abstract paragraph styling never
 * contains one, and the fallback if it did is to keep the paragraph, never to corrupt it.
 */
const tokenise = (html: string): Token[] => {
  const tokens: Token[] = [];
  const tagPattern = /<\/?[a-zA-Z][^>]*>/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(html)) !== null) {
    if (match.index > cursor) {
      tokens.push({ type: 'text', start: cursor, end: match.index });
    }

    const raw = match[0];
    const closing = raw.startsWith('</');
    const name = (/^<\/?\s*([a-zA-Z][a-zA-Z0-9-]*)/.exec(raw)?.[1] ?? '').toLowerCase();
    const standalone = /\/\s*>$/.test(raw) || STANDALONE_ELEMENTS.has(name);

    tokens.push({ type: 'tag', start: match.index, end: tagPattern.lastIndex, name, closing, standalone });
    cursor = tagPattern.lastIndex;
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

  tokens.forEach((token, index) => {
    if (token.type !== 'tag' || token.name !== 'p') return;

    if (token.closing) {
      close(index, token.end);
    } else if (!token.standalone) {
      // An opening <p> implicitly closes a still-open one at the previous token's end.
      if (open) close(index, tokens[index - 1]?.end ?? open.start);
      open = { openIndex: index, start: token.start };
    }
  });

  close(tokens.length, tokens[tokens.length - 1]?.end ?? length);

  return paragraphs;
};

/**
 * Whether a paragraph is a removable spacer: no visible text anywhere inside it, and no child
 * beyond `<br>` and inline wrappers of blank text. A truly empty `<p></p>`, `<p>   </p>`,
 * `<p><br></p>`, `<p><br><br></p>`, `<p>&nbsp;<br></p>` and `<p><strong> </strong><br></p>` all
 * qualify; a single visible character anywhere, or any structural child such as a list, does not.
 */
const isSpacerParagraph = (tokens: Token[], html: string, paragraph: Paragraph): boolean => {
  for (let index = paragraph.innerFrom; index < paragraph.innerTo; index += 1) {
    const token = tokens[index];

    if (token.type === 'text') {
      if (hasVisibleText(html.slice(token.start, token.end))) return false;
      continue;
    }

    if (token.name === 'br') continue;
    if (TRANSPARENT_INLINE_ELEMENTS.has(token.name)) continue;

    // Any other element (a list, an image, a nested block) is real content: keep the paragraph.
    return false;
  }

  return true;
};

/**
 * Rebuilds the fragment with the given byte spans removed, swallowing the whitespace that
 * immediately follows each removed span so deleting a paragraph between two others does not leave a
 * doubled blank line. The spans are the spacer paragraphs; everything outside them is copied
 * verbatim, which is what keeps surviving content byte-for-byte identical to the input.
 */
const removeSpans = (html: string, spans: [number, number][]): string => {
  const ordered = [...spans].sort((left, right) => left[0] - right[0]);
  let result = '';
  let cursor = 0;

  for (const [start, end] of ordered) {
    if (start < cursor) continue;

    result += html.slice(cursor, start);

    let next = end;
    while (next < html.length && /\s/.test(html[next])) next += 1;
    cursor = next;
  }

  return result + html.slice(cursor);
};

/**
 * Normalises one imported HTML abstract/biography field for Thoth's representable subset.
 *
 * Removes structurally-empty spacer paragraphs; keeps everything else exactly as it was; and, if a
 * meaningful `<br>` survives — one in a paragraph that carries visible content, or one loose at the
 * top level — reports the field as unrepresentable rather than editing it. A field that was nothing
 * but spacer markup comes back `empty`, so no empty entity is created for it.
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
  if (spacers.length === 0) return { kind: 'content', content };

  const cleaned = removeSpans(
    content,
    spacers.map(({ start, end }): [number, number] => [start, end]),
  ).trim();

  return cleaned.length === 0 ? { kind: 'empty' } : { kind: 'content', content: cleaned };
};
