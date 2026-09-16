import { DateFormat, TextFormat } from '@5stones/onix/dist/enums';

import { MarkupFormat } from '@/gql/graphql';

import type { ImportedMarkupFormat } from '../../types/markdown';
import { canonicaliseDoi } from '../../utils/validations';
import type { OnixRelatedIdentifier, OnixText } from './interfaces';

/**
 * Pure helpers for reading the shapes `@5stones/onix` actually emits.
 *
 * `@5stones/onix` is a thin wrapper over `fast-xml-parser` configured with
 * `ignoreAttributes: false` and no `isArray` option, which means:
 *
 * - a composite that occurs once becomes an object, the same composite repeated becomes
 *   an array, and nothing in the parsed output distinguishes the two cases up front;
 * - an element that carries XML attributes becomes `{ '#text': …, '@_attr': … }` rather
 *   than a bare string, so `<TitleWithoutPrefix language="eng">X</TitleWithoutPrefix>` and
 *   `<TitleWithoutPrefix>X</TitleWithoutPrefix>` have different runtime types.
 *
 * Everything here is deliberately synchronous and dependency free so it can be unit tested
 * against real parser output.
 */

/** Normalises a composite that may be emitted as a single object or as an array. */
export const toOnixArray = <T>(value: T | T[] | undefined | null): T[] => {
  if (!value) return [];

  return Array.isArray(value) ? value : [value];
};

/** Reads the text of an element that may or may not carry XML attributes. */
export const getOnixText = (value: OnixText | undefined | null): string => {
  if (value === undefined || value === null) return '';

  if (typeof value === 'string') return value.trim();

  if (typeof value === 'number') return value.toString();

  if (typeof value === 'object' && '#text' in value) return getOnixText(value['#text']);

  return '';
};

/**
 * Reads the `language` attribute of an element that carries one.
 *
 * ONIX puts the language of a title or a piece of text on the element itself rather than in a
 * composite of its own, so this is the only place the information exists. Bare text elements
 * simply have no attribute and yield an empty string; deciding what to do about that is the
 * caller's job, not this helper's.
 */
export const getOnixLanguage = (value: OnixText | undefined | null): string => {
  if (value === undefined || value === null) return '';

  if (typeof value !== 'object') return '';

  const language = value['@_language'];

  return typeof language === 'string' ? language.trim() : '';
};

/**
 * Reads the `dateformat` attribute of a `<Date>`.
 *
 * ONIX List 55 lives in this attribute and nowhere else, so `20240807`, `202408` and `20240` are
 * the same string of digits until it is read. A bare `<Date>` carries no attribute and yields an
 * empty string; what that means is {@link readOnixDate}'s business, not this helper's.
 */
export const getOnixDateFormat = (value: OnixText | undefined | null): string => {
  if (value === undefined || value === null) return '';

  if (typeof value !== 'object') return '';

  const dateFormat = value['@_dateformat'];

  return typeof dateFormat === 'string' ? dateFormat.trim() : '';
};

/**
 * Reads the `textformat` attribute of a `<Text>` or `<BiographicalNote>`.
 *
 * ONIX List 34 lives in this attribute and nowhere else, so `<em>` inside an abstract declared
 * `02` (HTML) and `<italic>` inside one declared `03` (XML) are just angle brackets until it is
 * read. A bare element carries no attribute and yields an empty string; what that means is
 * {@link resolveOnixTextMarkup}'s business, not this helper's.
 */
export const getOnixTextFormat = (value: OnixText | undefined | null): string => {
  if (value === undefined || value === null) return '';

  if (typeof value !== 'object') return '';

  const textFormat = value['@_textformat'];

  return typeof textFormat === 'string' ? textFormat.trim() : '';
};

/**
 * Whether text visibly contains markup, read the way the API reads it: something shaped like an
 * opening or closing tag, `<` followed by a letter. Deliberately the same shape as the backend's
 * `looks_like_markup` (`thoth-api/src/markup/mod.rs`), because the point of asking is to predict
 * which of the backend's input paths the content belongs on — plain prose containing `a < b` or
 * `<3` must not count.
 */
const containsMarkup = (content: string): boolean => /<\/?[A-Za-z][^>]*>/.test(content);

/** Every distinct tag name in the content, in first-appearance order, case preserved. */
const extractTagNames = (content: string): string[] => {
  const names = new Set<string>();

  for (const match of content.matchAll(/<\/?([A-Za-z][A-Za-z0-9-]*)[^>]*>/g)) {
    names.add(match[1]);
  }

  return [...names];
};

/**
 * Tags the API's HTML input path understands, per `html_to_ast` in `thoth-api/src/markup/ast.rs`.
 * Compared case-insensitively because that path parses with a real HTML parser, which lowercases
 * tag names — Arc's `<I>` is `<i>` by the time the backend sees it.
 */
const HTML_INPUT_TAGS = new Set([
  'html',
  'body',
  'div',
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'underline',
  's',
  'strike',
  'del',
  'strikethrough',
  'code',
  'sup',
  'sub',
  'ul',
  'ol',
  'li',
  'span',
  'a',
]);

/**
 * Tags the API's JATS validator accepts for abstracts and biographies, per `validate_jats_subset`
 * in `thoth-api/src/markup/mod.rs`. Compared case-sensitively because that validator is: `<P>` is
 * an unsupported JATS element there, whatever `<p>` is.
 *
 * This is a list of tag *names* only, kept so the importer can route and refuse deterministically
 * before mutation; structural and attribute validation stays the API's job, and this list is not
 * a second implementation of it.
 */
const JATS_INPUT_TAGS = new Set([
  'p',
  'bold',
  'italic',
  'underline',
  'strike',
  'monospace',
  'sup',
  'sub',
  'sc',
  'list',
  'list-item',
  'ext-link',
  'inline-formula',
  'tex-math',
  'email',
  'uri',
]);

/**
 * What one piece of ONIX text resolves to: the single input format the mutation should declare,
 * or the refusal to guess one. `unclassifiable` carries the tags that defeated classification so
 * the issue shown to the user can name them.
 */
export type OnixTextMarkupResolution =
  | { kind: 'format'; format: ImportedMarkupFormat }
  | { kind: 'unclassifiable'; tags: string[] };

const classifyByContent = (tags: string[]): OnixTextMarkupResolution => {
  if (tags.every((tag) => HTML_INPUT_TAGS.has(tag.toLowerCase()))) {
    return { kind: 'format', format: MarkupFormat.Html };
  }

  if (tags.every((tag) => JATS_INPUT_TAGS.has(tag))) {
    return { kind: 'format', format: MarkupFormat.JatsXml };
  }

  return { kind: 'unclassifiable', tags };
};

/**
 * The markup input format one ONIX text element means, decided from what the sender declared
 * (ONIX List 34, via {@link getOnixTextFormat}) *and* what the content visibly contains. This is
 * the only place that decision lives: the services must not rediscover the format from the string
 * after the declaration has been thrown away, which is exactly how HTML abstracts used to reach
 * the API declared as JATS.
 *
 * Content with no markup resolves to plain text whatever was declared. That is not a correction
 * of the sender: a markup-free string is the same text in every one of these formats, and the
 * API's HTML path refuses input with nothing tag-shaped in it, so `PLAIN_TEXT` is the one
 * spelling of that content the API accepts unconditionally.
 *
 * With markup present, the declaration is followed:
 *
 * - `02` (HTML) and `05` (XHTML) go to the API's HTML input path as declared. XHTML has no input
 *   enum of its own, and the backend parses HTML with a real HTML5 parser, which handles XHTML
 *   fragments; tag rewriting (`<em>` -> `<italic>`) is deliberately left to that path too.
 * - `03` (XML) is generic XML in ONIX, but the one XML Thoth's own exporter emits for structured
 *   text is its JATS subset under `textformat="03"`, so XML whose tags all belong to that subset
 *   is read back as JATS. This is a Thoth round-trip compatibility interpretation, not a claim
 *   that arbitrary ONIX XML is JATS: XML with tags outside the subset is refused here, by name,
 *   rather than sent to fail halfway through an import.
 * - `06` and `07` declare plain text, so markup inside them is a contradiction — and a common
 *   one, Arc's biographies being real examples — that would be rejected outright as PLAIN_TEXT.
 *   The compatibility rule is scoped to exactly this case: tags the HTML input path understands
 *   route to HTML, tags wholly within Thoth's JATS subset route to JATS, and anything else is
 *   refused rather than guessed. An unknown or absent declaration is read the same way.
 */
export const resolveOnixTextMarkup = (declaredFormat: string, content: string): OnixTextMarkupResolution => {
  if (!containsMarkup(content)) return { kind: 'format', format: MarkupFormat.PlainText };

  const tags = extractTagNames(content);

  switch (declaredFormat) {
    case TextFormat._02:
    case TextFormat._05:
      return { kind: 'format', format: MarkupFormat.Html };
    case TextFormat._03:
      return tags.every((tag) => JATS_INPUT_TAGS.has(tag))
        ? { kind: 'format', format: MarkupFormat.JatsXml }
        : { kind: 'unclassifiable', tags: tags.filter((tag) => !JATS_INPUT_TAGS.has(tag)) };
    default:
      return classifyByContent(tags);
  }
};

/**
 * What a repeatable identifier composite says, once the caller has said which occurrences it
 * means. `conflict` carries the disagreeing values rather than resolving them.
 */
export type OnixIdentifierSelection =
  | { kind: 'none' }
  | { kind: 'value'; value: string }
  | { kind: 'conflict'; values: string[] };

/**
 * The value of one kind of identifier inside a RelatedProduct or RelatedWork.
 *
 * ONIX says an identifier composite must not repeat the same type within one parent, but files
 * are not validated on the way in, and the whole reason this module exists is that assuming ONIX
 * rules hold at runtime is how the importer broke before. Two occurrences agreeing collapse; two
 * disagreeing are reported, because picking the first would make the imported reference depend on
 * the order the file happened to list them in.
 */
export const selectRelatedIdentifier = (
  identifiers: OnixRelatedIdentifier[],
  matches: (identifier: OnixRelatedIdentifier) => boolean,
): OnixIdentifierSelection => {
  const values = [
    ...new Set(
      identifiers
        .filter(matches)
        .map((identifier) => getOnixText(identifier.IDValue))
        .filter((value) => value.length > 0),
    ),
  ];

  if (values.length === 0) return { kind: 'none' };
  if (values.length === 1) return { kind: 'value', value: values[0] };

  return { kind: 'conflict', values: values.sort() };
};

/**
 * What a set of occurrences that all claim to be DOIs adds up to.
 *
 * `unusable` is carried by every outcome rather than replacing one, because a value Thoth cannot
 * read as a DOI is a separate fact from how many DOIs were found: a product may perfectly well
 * supply its real DOI beside a proprietary code somebody typed into the wrong field.
 */
export type OnixDoiSelection =
  | { kind: 'none'; unusable: string[] }
  | { kind: 'doi'; doi: string; unusable: string[] }
  | { kind: 'conflict'; dois: string[]; unusable: string[] };

/**
 * The one DOI a set of occurrences means, in the single form Thoth stores.
 *
 * The reason this exists rather than a `.find()` is that DOI identity is not string identity.
 * `10.1234/x`, `https://doi.org/10.1234/x` and `http://dx.doi.org/10.1234/x` are three spellings
 * of one identifier — Thoth's own API accepts all three and stores one — so comparing the raw
 * values would report a product that spelled its DOI twice as self-contradictory. Every value is
 * therefore canonicalised first, through the same {@link canonicaliseDoi} the API's grammar backs,
 * and only then compared.
 *
 * What comes out is deliberately not resolved: two genuinely different DOIs are handed back as a
 * conflict, because choosing between them would mean choosing by document order, and a product's
 * DOI must not depend on which identifier the sender happened to list first. Reversing the input
 * cannot change any part of the result.
 */
export const selectCanonicalDoi = (values: string[]): OnixDoiSelection => {
  const canonical = new Set<string>();
  const unreadable = new Set<string>();

  values
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .forEach((value) => {
      const doi = canonicaliseDoi(value);

      // A malformed value never becomes a canonical one. Prefixing a resolver onto whatever
      // arrived is what turned `not-a-doi` into `https://doi.org/not-a-doi`, which looks like a
      // DOI all the way to the API and fails there.
      if (doi.length === 0) unreadable.add(value);
      else canonical.add(doi);
    });

  const dois = [...canonical].sort();
  const unusable = [...unreadable].sort();

  if (dois.length === 0) return { kind: 'none', unusable };
  if (dois.length === 1) return { kind: 'doi', doi: dois[0], unusable };

  return { kind: 'conflict', dois, unusable };
};

/**
 * A complete calendar date, or nothing.
 *
 * Thoth stores publication and withdrawn dates as a PostgreSQL `date` behind chrono's
 * `NaiveDate` — see `Work::publication_date` in `thoth-api/src/model/work/mod.rs` — so the only
 * ONIX date it can hold without changing its meaning is one that names a day.
 *
 * `dateformat` (ONIX List 55) says which of the nineteen possible readings of a string of digits
 * is meant, and only `00`, "Common Era year, month and day", is a complete Common Era day. The
 * ONIX specification makes `00` the default for most date elements when the attribute is omitted
 * ("Each data element on which this attribute may be used specifies a default dateformat if the
 * attribute is not supplied — for most date elements, this is format '00', YYYYMMDD"), which is
 * the reading applied here and the one Thoth's own exporter writes explicitly.
 *
 * Everything else is refused rather than filled in: a year (`05`), a year and month (`01`), a
 * quarter (`03`), a season (`04`), any spread (`06`–`11`), a text date (`12`), a timestamp
 * (`13`, `14`) and the Hijri calendar forms (`20`, `21`, `25`, `32`) all say less, or something
 * other, than a Common Era day. Turning `2024` into `2024-01-01` would not be importing the
 * sender's date, it would be inventing one.
 */
export const readOnixDate = (value: OnixText | undefined): string | undefined => {
  const format = getOnixDateFormat(value);

  if (format.length > 0 && format !== DateFormat._00) return undefined;

  const digits = getOnixText(value);

  if (!/^\d{8}$/.test(digits)) return undefined;

  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));

  // Every JavaScript date constructor rolls impossible components forward — `20240230` becomes
  // 1 March — so the components are read back off the constructed date, and a value that does
  // not survive the round trip was never a real date. The year is set separately because
  // `Date.UTC` maps years 0-99 into the twentieth century.
  const date = new Date(Date.UTC(2000, month - 1, day));
  date.setUTCFullYear(year);

  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return undefined;
  }

  // The application's own calendar-date form, which is what `WorkDtoMapper` expects and what the
  // API parses into a `NaiveDate`.
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
};

/**
 * The largest issue ordinal Thoth can store.
 *
 * `issue.issue_ordinal` is `Int4` in the schema and `i32` on `Issue` — see
 * `thoth-api/src/model/issue/mod.rs` — so the usable range is 1 to 2 147 483 647. Beyond it there
 * is nothing to store, and JavaScript would keep counting happily up to `Number.MAX_SAFE_INTEGER`
 * and past it, so the boundary has to be stated here rather than discovered at the API.
 */
export const MAX_ISSUE_ORDINAL = 2_147_483_647;
