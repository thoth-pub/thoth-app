import { TextFormat } from '@5stones/onix/dist/enums';

/**
 * Plain-text-compatibility normalisation for imported abstract-like text — long abstracts, short
 * abstracts and biographies — whose source markup has *already* been resolved to plain text by
 * {@link resolveOnixTextMarkup}. It runs on the extracted content string, after format resolution
 * and never before it, and it is the plain-text counterpart of `normaliseImportedAbstractHtml`.
 *
 * Why it exists. A markup-free string resolves to PLAIN_TEXT whatever the sender declared, because
 * it is the same text in every input format and the API's HTML path refuses input with nothing
 * tag-shaped in it. But the *whitespace* in that string does not mean the same thing in every
 * declared format, and the API's plain-text path takes newlines literally: `plain_text_to_ast`
 * (`thoth-api/src/markup/ast.rs`) turns a lone `\n` inside a paragraph into an AST `Break`, and
 * `Break` is a child no abstract paragraph may contain — so a single physical newline is rejected
 * with "Abstracts and biographies cannot contain nested block elements inside paragraphs", which is
 * the exact production error this fix answers (Arc product 9781942401353: an abstract declared
 * HTML, containing no tags, wrapped across physical source lines).
 *
 * Two declarations, two whitespace semantics:
 *
 * - Declared `02` (HTML) or `05` (XHTML): the sender said the text is HTML, and in rendered HTML a
 *   run of ASCII whitespace — including the newlines a publisher's XML tooling wraps lines with —
 *   collapses to a single space. Collapsing it here preserves what the sender's declaration meant
 *   while keeping PLAIN_TEXT as the mutation format the markup-free result belongs on. Only HTML's
 *   own collapsible set (space, tab, LF, FF, CR) collapses; NBSP, narrow no-break space and every
 *   other visible or non-collapsible character survive untouched.
 *
 * - Any other declaration (`03`, `06`, `07`, absent, unknown): plain-text whitespace is literal, so
 *   a single newline is a deliberate line break — and Thoth cannot represent one in an abstract or
 *   biography. Silently flattening it would destroy meaning; sending it would fail at the API
 *   partway through a non-atomic bulk import. It is reported as unrepresentable so the import
 *   blocks in preview, before any mutation runs. Blank-line paragraph separation is the one break
 *   structure the API *does* represent (it splits paragraphs on `\n\s*\n` before line-splitting),
 *   so it passes through — mirroring exactly the boundary `plain_text_to_ast` draws.
 *
 * Scope. A narrow, pure, dependency-free transform. It never invents or removes visible characters:
 * the HTML branch rewrites collapsible whitespace runs only, and the plain-text branch either
 * passes content through (line endings canonicalised) or refuses it whole.
 */

/**
 * The outcome of normalising one imported plain-text abstract or biography field.
 *
 * - `content` — usable plain text; the caller creates the entity with it.
 * - `empty` — the field held nothing but collapsible whitespace, so it has no content. The caller
 *   omits the field: an empty abstract or biography is never created. (Unreachable through
 *   `XMLParser`, which drops whitespace-only fields before resolution, but the helper answers for
 *   every string it could be handed.)
 * - `unrepresentable` — a literal line break remains that Thoth cannot represent. The caller raises
 *   a blocking issue and drops the field, so it never reaches a mutation.
 */
export type ImportedPlainText = { kind: 'content'; content: string } | { kind: 'empty' } | { kind: 'unrepresentable' };

/**
 * The declarations whose whitespace is HTML's. XHTML shares HTML's rendering rules, exactly as it
 * shares its input path in `resolveOnixTextMarkup` when markup is present.
 */
const HTML_WHITESPACE_DECLARATIONS = new Set<string>([TextFormat._02, TextFormat._05]);

/**
 * HTML's collapsible "ASCII whitespace" (the HTML standard's term, and html5ever's): space, tab,
 * LF, FF, CR. Deliberately not `\s`, which would also collapse NBSP and other Unicode whitespace
 * that HTML renders as-is.
 */
const HTML_COLLAPSIBLE_WHITESPACE_RUN = /[ \t\n\f\r]+/g;

/**
 * The character class the API's paragraph-separator regex `\n\s*\n` actually matches between the
 * two newlines: Rust's `regex` crate resolves `\s` to Unicode `White_Space`. Spelled out here
 * because JavaScript's `\s` is a *different* set — it includes U+FEFF, which the API does not, and
 * a separator judged blank here but not by the API would wave a `Break`-producing newline through.
 */
const API_WHITESPACE_CLASS = '[\\t-\\r \\u0085\\u00A0\\u1680\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000]';

/**
 * A blank-line paragraph separator, exactly as `plain_text_to_ast` splits: a newline, optional
 * whitespace, a newline. Global so every separator can be removed before asking what newlines are
 * left inside paragraphs.
 */
const PARAGRAPH_SEPARATOR = new RegExp(`\\n${API_WHITESPACE_CLASS}*\\n`, 'g');

/**
 * Normalises one markup-free imported field according to what its ONIX `textformat` declaration
 * said its whitespace means. `declaredFormat` is the raw List 34 code from
 * `getOnixTextFormat` — empty when the element carried none.
 */
export const normaliseImportedPlainText = (declaredFormat: string, content: string): ImportedPlainText => {
  if (HTML_WHITESPACE_DECLARATIONS.has(declaredFormat)) {
    // Collapse, then trim: whitespace at the edges of an HTML block collapses away entirely, not
    // to a leading or trailing space.
    const collapsed = content.replace(HTML_COLLAPSIBLE_WHITESPACE_RUN, ' ').trim();

    return collapsed.length === 0 ? { kind: 'empty' } : { kind: 'content', content: collapsed };
  }

  // Line endings first, so one physical line break is one `\n` whatever tooling wrote the file:
  // `\r\n` is a single break, and a bare `\r` is read as a break too. The API would actually leave
  // a bare `\r` embedded in the text as a control character — deliberately stricter here, because
  // a carriage return was a line break where the file came from, not content worth importing.
  const canonical = content.replace(/\r\n?/g, '\n');

  // Mirror the API: trim, drop every blank-line paragraph separator, and ask what newlines remain.
  // Any survivor sits inside a paragraph, where `plain_text_to_ast` would make it a `Break` the
  // abstract validator rejects.
  const withoutSeparators = canonical.trim().replace(PARAGRAPH_SEPARATOR, '');

  if (withoutSeparators.includes('\n')) return { kind: 'unrepresentable' };

  return canonical.trim().length === 0 ? { kind: 'empty' } : { kind: 'content', content: canonical };
};
