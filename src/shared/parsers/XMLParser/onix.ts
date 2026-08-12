import {
  CollectionSequenceType,
  CollectionType,
  DateFormat,
  TextFormat,
  TitleElementLevel,
  TitleType,
} from '@5stones/onix/dist/enums';

import { MarkupFormat } from '@/gql/graphql';

import type { ImportedMarkupFormat } from '../../types/markdown';
import { canonicaliseDoi } from '../../utils/validations';
import type {
  OnixCollectionLike,
  OnixCollectionSequence,
  OnixPublishingDate,
  OnixRelatedIdentifier,
  OnixText,
  OnixTitleDetail,
  OnixTitleElement,
} from './interfaces';

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

export type OnixTitle = {
  title: string;
  subtitle: string;
  fullTitle: string;
  /**
   * The ISO 639 language this title claims, taken from the `language` attribute of whichever
   * element supplied the text. Empty when the file does not say.
   */
  language: string;
  /** The TitleType of the TitleDetail this came from. Empty when the file omits it. */
  titleType: string;
};

const EMPTY_TITLE: OnixTitle = { title: '', subtitle: '', fullTitle: '', language: '', titleType: '' };

/**
 * ONIX prefixes are normally whole words ("A", "The", "Le") and join with a space, but
 * elided articles such as "L'" or "D'" join directly to the rest of the title.
 */
const joinPrefix = (prefix: string, rest: string): string => {
  if (prefix.length === 0) return rest;
  if (rest.length === 0) return prefix;

  return /['’-]$/.test(prefix) ? `${prefix}${rest}` : `${prefix} ${rest}`;
};

/** Lower is better. A TitleElement at the level we asked for always wins. */
const scoreLevel = (element: OnixTitleElement, level: TitleElementLevel): number => {
  const elementLevel = getOnixText(element.TitleElementLevel);

  if (elementLevel === level) return 0;
  // ONIX makes TitleElementLevel mandatory, but plenty of real files omit it. An element
  // with no level is a usable candidate; one that explicitly claims a different level is a
  // last resort.
  if (elementLevel.length === 0) return 1;

  return 2;
};

/** Lower is better. TitleType 01 is the distinctive title, which is the one we want. */
const scoreType = (detail: OnixTitleDetail): number => {
  const titleType = getOnixText(detail.TitleType);

  if (titleType === TitleType._01) return 0;
  if (titleType.length === 0) return 1;

  return 2;
};

/** Turns one TitleElement into Thoth's title/subtitle/fullTitle triple plus its provenance. */
const readTitleElement = (element: OnixTitleElement, titleType: string): OnixTitle => {
  const titleText = getOnixText(element.TitleText);
  const prefix = getOnixText(element.TitlePrefix);
  const withoutPrefix = getOnixText(element.TitleWithoutPrefix);
  const subtitle = getOnixText(element.Subtitle);

  // `NoPrefix` is an empty marker element asserting that there is no prefix, so it needs no
  // handling of its own: an absent `TitlePrefix` already yields an empty prefix.
  //
  // ONIX treats `TitleText` and `TitlePrefix`/`TitleWithoutPrefix` as alternative encodings
  // of the same title, `TitleText` being the complete form. We therefore trust `TitleText`
  // when it is present and only splice the prefix in when a file supplies both and the
  // prefix is genuinely missing from `TitleText`.
  const title =
    titleText.length > 0
      ? titleText.toLowerCase().startsWith(prefix.toLowerCase())
        ? titleText
        : joinPrefix(prefix, titleText)
      : joinPrefix(prefix, withoutPrefix);

  // Thoth stores one locale for the whole title row, so one language is read for the whole
  // element. The elements are tried in the order they contribute to the title, and a file that
  // tags only its subtitle still says something usable about the title's language.
  const language =
    [element.TitleText, element.TitleWithoutPrefix, element.TitlePrefix, element.Subtitle]
      .map(getOnixLanguage)
      .find((candidate) => candidate.length > 0) ?? '';

  return {
    title,
    subtitle,
    fullTitle: [title, subtitle].filter((part) => part.length > 0).join(' '),
    language,
    titleType,
  };
};

/** Every TitleElement in the message, tagged with how well it answers the caller's question. */
const rankTitleElements = (titleDetail: OnixTitleDetail | OnixTitleDetail[] | undefined, level: TitleElementLevel) =>
  toOnixArray(titleDetail)
    .flatMap((detail) =>
      toOnixArray(detail.TitleElement).map((element) => ({
        element,
        levelScore: scoreLevel(element, level),
        typeScore: scoreType(detail),
        titleType: getOnixText(detail.TitleType),
      })),
    )
    .map((candidate, order) => ({ ...candidate, order }));

/**
 * Picks the TitleElement that best describes the requested level and turns it into
 * Thoth's title/subtitle/fullTitle triple.
 *
 * Both `TitleDetail` and `TitleElement` are repeatable in ONIX and repeatable at runtime,
 * so every combination is scored and the best one wins. Ranking is by
 * `(TitleElementLevel match, TitleType match, document order)` — level first, because level
 * is what separates the product title (01) from the collection title (02) and the content
 * item title (04), which are the three things this importer needs to tell apart.
 */
export const extractOnixTitle = (
  titleDetail: OnixTitleDetail | OnixTitleDetail[] | undefined,
  level: TitleElementLevel,
): OnixTitle => {
  const candidates = rankTitleElements(titleDetail, level);

  if (candidates.length === 0) return EMPTY_TITLE;

  const [best] = candidates.sort(
    (a, b) => a.levelScore - b.levelScore || a.typeScore - b.typeScore || a.order - b.order,
  );

  return readTitleElement(best.element, best.titleType);
};

/**
 * Every title of one exact TitleType, at the requested level, in ONIX document order.
 *
 * This is the enumerating counterpart to {@link extractOnixTitle}, which ranks across types to
 * find the single best one. Here the type is the question, so it is matched exactly and nothing
 * is scored across types: asking for TitleType 06 can never return a 01 or a 05, which is what
 * keeps a publisher's internal title (05) out of Thoth's alternate-language titles.
 *
 * One TitleDetail may still hold several TitleElements — a collection level and a product level,
 * say — so the best element per detail is chosen by the same level ranking, and titles that come
 * out empty are dropped rather than handed on as blank rows.
 */
export const extractOnixTitlesOfType = (
  titleDetail: OnixTitleDetail | OnixTitleDetail[] | undefined,
  level: TitleElementLevel,
  titleType: TitleType,
): OnixTitle[] =>
  toOnixArray(titleDetail)
    .filter((detail) => getOnixText(detail.TitleType) === titleType)
    .map((detail) => {
      const [best] = rankTitleElements(detail, level).sort((a, b) => a.levelScore - b.levelScore || a.order - b.order);

      return best ? readTitleElement(best.element, best.titleType) : EMPTY_TITLE;
    })
    .filter(({ title }) => title.length > 0);

/**
 * How an ONIX Collection relates to a Thoth series.
 *
 * Meanings are taken from the code list the library itself cites for CollectionType
 * (ONIX List 148, https://ns.editeur.org/onix/en/148):
 *
 * - `10` Publisher collection — the publisher's own series structure, which is exactly what a
 *   Thoth series models.
 * - `11` Collection éditoriale — a French editorial-line concept, publisher-curated but not the
 *   same thing as a book series — and `00` Unspecified, where the sender declined to say. Both
 *   may legitimately name a series, so both are still resolved against Thoth. A missing
 *   CollectionType (which ONIX makes mandatory) is treated the same way.
 * - `20` Ascribed collection — assigned by somebody other than the publisher, so it is not the
 *   publisher's series at all and is never a series candidate.
 */
export type CollectionSupport = 'supported' | 'ambiguous' | 'unsupported';

export const classifyCollectionType = (collectionType: OnixText | undefined): CollectionSupport => {
  const value = getOnixText(collectionType);

  if (value === CollectionType._10) return 'supported';
  if (value === CollectionType._20) return 'unsupported';

  return 'ambiguous';
};

/**
 * Picks the Collection that represents the work's series.
 *
 * ONIX allows several Collection composites per product. Ascribed collections are excluded
 * outright — they are somebody else's grouping, not the publisher's series — and a publisher
 * collection is preferred over an ambiguous one. A collection that yields no title is only
 * chosen as a last resort, so a malformed collection cannot mask a usable one; the caller
 * reports the empty title.
 */
export const selectSeriesCollection = <T extends OnixCollectionLike>(collections: T[]): T | undefined => {
  const [best] = collections
    .map((collection, order) => ({
      collection,
      support: classifyCollectionType(collection.CollectionType),
      hasTitle: extractOnixTitle(collection.TitleDetail, TitleElementLevel._02).title.length > 0,
      order,
    }))
    .filter(({ support }) => support !== 'unsupported')
    .sort(
      (a, b) =>
        Number(b.hasTitle) - Number(a.hasTitle) ||
        Number(a.support === 'ambiguous') - Number(b.support === 'ambiguous') ||
        a.order - b.order,
    );

  return best?.collection;
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
 * Whether one calendar date falls strictly before another.
 *
 * Both arguments are expected to come from {@link readOnixDate}, which only ever produces
 * `YYYY-MM-DD`: a four-digit year, a two-digit month and a two-digit day, each zero-padded, with
 * the separators always in the same columns. In that shape a string comparison *is* a date
 * comparison — the fields run most significant first and every field occupies the same width in
 * every value, so no two dates can compare differently from the way they fall in time. It would
 * not be safe on ONIX's own `YYYYMMDD` for a year of fewer than four digits, which is exactly why
 * `readOnixDate` refuses anything but eight digits.
 *
 * Strict, to match the backend's `withdrawn < publication`: a work withdrawn on the day it was
 * published is accepted there and must be accepted here.
 */
export const isEarlierCalendarDate = (date: string, other: string): boolean => date < other;

/**
 * What a product's PublishingDates say about one role.
 *
 * Shaped like {@link OnixDoiSelection} and for the same reasons: `unrepresentable` carries the
 * raw values Thoth cannot store as a calendar date whatever else was found, and a disagreement
 * between two usable dates is reported rather than resolved.
 */
export type OnixDateSelection =
  | { kind: 'none'; unrepresentable: string[] }
  | { kind: 'date'; date: string; unrepresentable: string[] }
  | { kind: 'conflict'; dates: string[]; unrepresentable: string[] };

/**
 * The date a product gives for one PublishingDateRole.
 *
 * PublishingDate is repeatable, and the role is what says which date each occurrence is; taking
 * the first occurrence of a role would let a file that states its publication date twice import
 * whichever came first. Identical dates collapse — two spellings of one day are one fact — and
 * two different days are a contradiction the sender has to resolve.
 */
export const selectPublishingDate = (dates: OnixPublishingDate[], role: string): OnixDateSelection => {
  const complete = new Set<string>();
  const partial = new Set<string>();

  dates
    .filter((date) => getOnixText(date.PublishingDateRole) === role)
    .forEach((date) => {
      const day = readOnixDate(date.Date);

      if (day === undefined) {
        const raw = getOnixText(date.Date);

        // An empty `<Date>` says nothing; there is no lost information to report.
        if (raw.length > 0) partial.add(raw);

        return;
      }

      complete.add(day);
    });

  const found = [...complete].sort();
  const unrepresentable = [...partial].sort();

  if (found.length === 0) return { kind: 'none', unrepresentable };
  if (found.length === 1) return { kind: 'date', date: found[0], unrepresentable };

  return { kind: 'conflict', dates: found, unrepresentable };
};

/**
 * What a Collection's sequences say about the work's position in its series.
 *
 * `conflict` carries the numbers that disagree so the caller can name them; it is not resolved
 * here, because there is no honest way to choose between two publisher-supplied ordinals.
 */
export type OnixSequenceSelection =
  | { kind: 'none' }
  | { kind: 'ordinal'; ordinal: number }
  | { kind: 'conflict'; ordinals: number[] }
  | { kind: 'unrepresentable'; values: string[] };

/**
 * The largest issue ordinal Thoth can store.
 *
 * `issue.issue_ordinal` is `Int4` in the schema and `i32` on `Issue` — see
 * `thoth-api/src/model/issue/mod.rs` — so the usable range is 1 to 2 147 483 647. Beyond it there
 * is nothing to store, and JavaScript would keep counting happily up to `Number.MAX_SAFE_INTEGER`
 * and past it, so the boundary has to be stated here rather than discovered at the API.
 */
export const MAX_ISSUE_ORDINAL = 2_147_483_647;

/**
 * What one CollectionSequenceNumber is worth to Thoth.
 *
 * `parseInt` is the wrong tool here. It reads `11abc` as 11 and `1.5` as 1, which would turn a
 * malformed ONIX value into a confident issue ordinal — the file said something this importer
 * does not understand, and inventing a plausible number from its first characters is worse than
 * admitting that. Leading zeros are harmless and kept.
 *
 * A well-formed number outside Thoth's storable range is a different failure from a value that is
 * not a number at all, and is kept separate: `11abc` leaves us not knowing what position was
 * meant, while `2147483648` tells us exactly, and tells us Thoth cannot hold it.
 */
type SequenceNumber = { kind: 'usable'; ordinal: number } | { kind: 'out_of_range'; value: string } | { kind: 'none' };

const readSequenceNumber = (sequence: OnixCollectionSequence): SequenceNumber => {
  const value = getOnixText(sequence.CollectionSequenceNumber);

  if (!/^\d+$/.test(value)) return { kind: 'none' };

  const parsed = Number.parseInt(value, 10);

  if (parsed <= 0) return { kind: 'none' };

  return parsed <= MAX_ISSUE_ORDINAL ? { kind: 'usable', ordinal: parsed } : { kind: 'out_of_range', value };
};

/**
 * Picks the sequence number that means "this is issue N of the series".
 *
 * CollectionSequenceType (ONIX List 197) says what a CollectionSequenceNumber counts, and the
 * composite is repeatable: a product may state its publication order, its alphabetical order by
 * title and the publisher's own arbitrary ordering side by side. Thoth's issue ordinal is
 * publication order — it is what `CollectionSequenceType` 03 means, and what Thoth's own ONIX
 * exporter writes when it emits an issue ordinal — so type 03 is what is looked for, wherever it
 * appears in the document.
 *
 * A sequence with no type at all is a compatibility fallback: ONIX makes the type mandatory, but
 * files that omit it are almost always giving the issue number, and refusing it would lose
 * metadata a previous version of this importer accepted. A sequence that explicitly declares some
 * other type is never used — an alphabetical position is not an issue number, and taking one
 * because it happened to come first is exactly the bug this replaces.
 *
 * Repeats of the same number collapse. Genuinely different numbers of the same kind are reported
 * as a conflict rather than resolved by document order, and a number Thoth has no room for is
 * reported as such rather than quietly discarded — dropping it would leave the caller unable to
 * tell "this product stated no position" from "this product stated a position we threw away",
 * and the series planner would then hand the work a different number of its own invention.
 */
export const selectPublicationOrderSequence = (sequences: OnixCollectionSequence[]): OnixSequenceSelection => {
  const numbered = sequences.map((sequence) => ({
    type: getOnixText(sequence.CollectionSequenceType),
    number: readSequenceNumber(sequence),
  }));

  const publicationOrder = numbered.filter(({ type }) => type === CollectionSequenceType._03);
  const untyped = numbered.filter(({ type }) => type.length === 0);
  const chosen = publicationOrder.length > 0 ? publicationOrder : untyped;

  const outOfRange = [
    ...new Set(chosen.map(({ number }) => (number.kind === 'out_of_range' ? number.value : undefined))),
  ].filter((value) => value !== undefined);

  if (outOfRange.length > 0) return { kind: 'unrepresentable', values: outOfRange.sort() };

  const ordinals = [
    ...new Set(chosen.map(({ number }) => (number.kind === 'usable' ? number.ordinal : undefined))),
  ].filter((ordinal) => ordinal !== undefined);

  if (ordinals.length === 0) return { kind: 'none' };
  if (ordinals.length === 1) return { kind: 'ordinal', ordinal: ordinals[0] };

  return { kind: 'conflict', ordinals: ordinals.sort((a, b) => a - b) };
};

/**
 * What one contributor's SequenceNumber is worth as an ordering signal.
 *
 * ONIX List makes SequenceNumber a positive integer, and this reads it as one or not at all —
 * `parseInt`'s tolerance for `1.5` or `2nd` would let a malformed value masquerade as a position.
 * `absent` and a value that is not a positive integer are kept apart because the caller warns
 * about the second and stays quiet about the first: a file that simply omits SequenceNumber has
 * lost nothing by being ordered on its source order, while one that supplied `0`, `-1` or `abc`
 * offered an ordering this importer then declined to trust.
 */
type ContributorSequence = { kind: 'usable'; ordinal: number } | { kind: 'invalid' } | { kind: 'absent' };

const readContributorSequenceNumber = (value: OnixText | undefined): ContributorSequence => {
  // Read through getOnixText, never coerced: a SequenceNumber carrying any XML attribute arrives
  // as `{ '#text': … }`, which `${value}` would turn into "[object Object]".
  const text = getOnixText(value);

  if (text.length === 0) return { kind: 'absent' };
  if (!/^\d+$/.test(text)) return { kind: 'invalid' };

  const ordinal = Number.parseInt(text, 10);

  if (ordinal <= 0) return { kind: 'invalid' };

  return { kind: 'usable', ordinal };
};

/** One ONIX contributor paired with the position it will hold in Thoth. */
export type OrderedOnixContributor<T> = {
  contributor: T;
  /** The contributor's index in the ONIX source list, kept as tie-break and fallback evidence. */
  sourceIndex: number;
  /**
   * The Thoth contribution ordinal: contiguous `1..n` over the resolved order, never the raw
   * SequenceNumber. `contribution_ordinal` is a positive, per-work-unique `i32`, so the ordering
   * ONIX expresses is honoured while the numbers Thoth stores stay inside its own invariant — a
   * file numbering its authors 10 and 20 becomes contributions 1 and 2, not 10 and 20.
   */
  orderNumber: number;
};

export type OnixContributorOrdering<T> = {
  ordered: OrderedOnixContributor<T>[];
  /**
   * True when explicit SequenceNumber data was present but could not be used as a complete,
   * unique ordering, so ONIX source order was used instead. False when SequenceNumber was simply
   * absent — source order is a representable ordering, not a fallback worth warning about.
   */
  sequenceFallback: boolean;
};

/**
 * Resolves ONIX contributors into the order Thoth will store them in, with contiguous ordinals.
 *
 * One explicit, deterministic policy, decided from the file rather than from lookup timing:
 *
 * - every contributor carries a usable, unique, positive-integer SequenceNumber → sort ascending
 *   by SequenceNumber (this is the case that proves SequenceNumber is interpreted, not ignored);
 * - SequenceNumber is absent throughout → keep ONIX source order;
 * - anything in between — some numbered and some not, duplicates, zero, negative, decimal,
 *   non-numeric — → keep ONIX source order for the whole list, rather than invent a hybrid
 *   interleaving of numbered and unnumbered contributors.
 *
 * Either way the resolved order is then numbered `1..n`, so the result is always positive, unique
 * within the list and contiguous — the three things the backend's
 * `contribution_contribution_ordinal_work_id_uniq` and `contribution_ordinal > 0` require. The
 * input array is not mutated: the sort runs on a fresh mapping, and source order is the
 * documented tie-break so the output cannot depend on `Array.prototype.sort` stability.
 */
export const resolveOnixContributorOrder = <T extends { SequenceNumber?: OnixText }>(
  contributors: T[],
): OnixContributorOrdering<T> => {
  const withSequence = contributors.map((contributor, sourceIndex) => ({
    contributor,
    sourceIndex,
    sequence: readContributorSequenceNumber(contributor.SequenceNumber),
  }));

  const usableOrdinals = withSequence
    .map(({ sequence }) => (sequence.kind === 'usable' ? sequence.ordinal : undefined))
    .filter((ordinal) => ordinal !== undefined);

  const everyContributorNumbered = usableOrdinals.length === withSequence.length && withSequence.length > 0;
  const ordinalsAreUnique = new Set(usableOrdinals).size === usableOrdinals.length;
  const useSequenceOrder = everyContributorNumbered && ordinalsAreUnique;

  const resolved = useSequenceOrder
    ? [...withSequence].sort((a, b) => {
        const left = a.sequence.kind === 'usable' ? a.sequence.ordinal : 0;
        const right = b.sequence.kind === 'usable' ? b.sequence.ordinal : 0;

        return left - right || a.sourceIndex - b.sourceIndex;
      })
    : withSequence;

  const ordered = resolved.map(({ contributor, sourceIndex }, position) => ({
    contributor,
    sourceIndex,
    orderNumber: position + 1,
  }));

  // Warn only when the file actually offered sequence data we then declined to use. Absent reads
  // as "no data"; anything non-empty — usable but inconsistent, or outright invalid — is a signal
  // the publisher meant an ordering this importer could not honour wholesale.
  const hadExplicitSequence = withSequence.some(({ sequence }) => sequence.kind !== 'absent');

  return { ordered, sequenceFallback: !useSequenceOrder && hadExplicitSequence };
};
