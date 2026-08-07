import { CollectionType, TitleElementLevel, TitleType } from '@5stones/onix/dist/enums';

import type { OnixCollectionLike, OnixText, OnixTitleDetail, OnixTitleElement } from './interfaces';

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

export type OnixTitle = {
  title: string;
  subtitle: string;
  fullTitle: string;
};

const EMPTY_TITLE: OnixTitle = { title: '', subtitle: '', fullTitle: '' };

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
  const candidates = toOnixArray(titleDetail)
    .flatMap((detail) =>
      toOnixArray(detail.TitleElement).map((element) => ({
        element,
        levelScore: scoreLevel(element, level),
        typeScore: scoreType(detail),
      })),
    )
    .map((candidate, order) => ({ ...candidate, order }));

  if (candidates.length === 0) return EMPTY_TITLE;

  const [best] = candidates.sort(
    (a, b) => a.levelScore - b.levelScore || a.typeScore - b.typeScore || a.order - b.order,
  );

  const { element } = best;
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

  return {
    title,
    subtitle,
    fullTitle: [title, subtitle].filter((part) => part.length > 0).join(' '),
  };
};

/**
 * Picks the Collection that represents the work's series.
 *
 * ONIX allows several Collection composites per product. CollectionType 10 is the
 * publisher collection, which is what a Thoth series models, so it is preferred over an
 * ascribed collection (20) or an unspecified one (00). Collections that yield no title are
 * skipped so a malformed one cannot mask a usable one.
 */
export const selectSeriesCollection = <T extends OnixCollectionLike>(collections: T[]): T | undefined => {
  const scoreCollection = (collection: T): number => {
    const collectionType = getOnixText(collection.CollectionType);

    if (collectionType === CollectionType._10) return 0;
    if (collectionType.length === 0) return 1;
    if (collectionType === CollectionType._00) return 2;

    return 3;
  };

  return collections
    .map((collection, order) => ({ collection, score: scoreCollection(collection), order }))
    .sort((a, b) => a.score - b.score || a.order - b.order)
    .map(({ collection }) => collection)
    .find((collection) => extractOnixTitle(collection.TitleDetail, TitleElementLevel._02).title.length > 0);
};
