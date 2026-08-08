import { CollectionSequenceType, CollectionType, TitleElementLevel, TitleType } from '@5stones/onix/dist/enums';

import type {
  OnixCollectionLike,
  OnixCollectionSequence,
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
 * What a Collection's sequences say about the work's position in its series.
 *
 * `conflict` carries the numbers that disagree so the caller can name them; it is not resolved
 * here, because there is no honest way to choose between two publisher-supplied ordinals.
 */
export type OnixSequenceSelection =
  | { kind: 'none' }
  | { kind: 'ordinal'; ordinal: number }
  | { kind: 'conflict'; ordinals: number[] };

/**
 * A sequence number Thoth can use: a positive whole ordinal, and nothing that merely starts like
 * one.
 *
 * `parseInt` is the wrong tool here. It reads `11abc` as 11 and `1.5` as 1, which would turn a
 * malformed ONIX value into a confident issue ordinal — the file said something this importer
 * does not understand, and inventing a plausible number from its first characters is worse than
 * admitting that. Leading zeros are harmless and kept.
 */
const usableSequenceNumber = (sequence: OnixCollectionSequence): number | undefined => {
  const value = getOnixText(sequence.CollectionSequenceNumber);

  if (!/^\d+$/.test(value)) return undefined;

  const parsed = Number.parseInt(value, 10);

  return parsed > 0 ? parsed : undefined;
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
 * as a conflict rather than resolved by document order.
 */
export const selectPublicationOrderSequence = (sequences: OnixCollectionSequence[]): OnixSequenceSelection => {
  const numbered = sequences.map((sequence) => ({
    type: getOnixText(sequence.CollectionSequenceType),
    number: usableSequenceNumber(sequence),
  }));

  const publicationOrder = numbered.filter(({ type }) => type === CollectionSequenceType._03);
  const untyped = numbered.filter(({ type }) => type.length === 0);
  const chosen = publicationOrder.length > 0 ? publicationOrder : untyped;

  const ordinals = [...new Set(chosen.map(({ number }) => number).filter((number) => number !== undefined))];

  if (ordinals.length === 0) return { kind: 'none' };
  if (ordinals.length === 1) return { kind: 'ordinal', ordinal: ordinals[0] };

  return { kind: 'conflict', ordinals: ordinals.sort((a, b) => a - b) };
};
