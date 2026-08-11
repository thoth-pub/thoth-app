import { parse } from '@5stones/onix';
import { CollectionSequenceType, CollectionType, TitleElementLevel, TitleType } from '@5stones/onix/dist/enums';
import { describe, expect, it } from 'vitest';

import { MarkupFormat } from '@/gql/graphql';

import type {
  ExtendedCollection,
  ExtendedONIXMessageRoot,
  OnixPublishingDate,
  OnixRelatedIdentifier,
  OnixTitleDetail,
} from './interfaces';
import {
  classifyCollectionType,
  extractOnixTitle,
  extractOnixTitlesOfType,
  getOnixDateFormat,
  getOnixLanguage,
  getOnixText,
  getOnixTextFormat,
  isEarlierCalendarDate,
  readOnixDate,
  resolveOnixTextMarkup,
  selectCanonicalDoi,
  selectPublicationOrderSequence,
  selectPublishingDate,
  selectRelatedIdentifier,
  selectSeriesCollection,
  toOnixArray,
} from './onix';

/**
 * Several cases below go through the real `@5stones/onix` parser rather than hand-built
 * objects, because the bugs this module exists to fix are all runtime shape surprises
 * (object vs array, string vs `{ '#text': … }`) that idealised fixtures cannot reproduce.
 */
const parseProduct = (descriptiveDetail: string) => {
  const root = parse(
    `<?xml version="1.0" encoding="UTF-8"?>
     <ONIXMessage release="3.0">
       <Product>
         <RecordReference>9781641891783</RecordReference>
         <DescriptiveDetail>${descriptiveDetail}</DescriptiveDetail>
       </Product>
     </ONIXMessage>`,
  ) as ExtendedONIXMessageRoot;

  const [product] = toOnixArray(root.ONIXMessage.Product);

  return product.DescriptiveDetail;
};

describe('toOnixArray', () => {
  it('wraps a single composite', () => {
    expect(toOnixArray({ a: 1 })).toEqual([{ a: 1 }]);
  });

  it('passes an array through', () => {
    expect(toOnixArray([{ a: 1 }, { a: 2 }])).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it('treats absent composites as empty', () => {
    expect(toOnixArray(undefined)).toEqual([]);
    expect(toOnixArray(null)).toEqual([]);
  });
});

describe('getOnixText', () => {
  it('reads a bare string', () => {
    expect(getOnixText('Arc Companions')).toBe('Arc Companions');
  });

  it('reads an element that carries XML attributes', () => {
    expect(getOnixText({ '#text': 'Arc Companions', '@_language': 'eng' } as never)).toBe('Arc Companions');
  });

  it('reads a numeric value', () => {
    expect(getOnixText(12)).toBe('12');
  });

  it('returns an empty string for absent or empty elements', () => {
    expect(getOnixText(undefined)).toBe('');
    // `<NoPrefix/>` parses to an empty string.
    expect(getOnixText('')).toBe('');
  });
});

describe('extractOnixTitle', () => {
  it('uses TitleText when the file supplies one', () => {
    const titleDetail: OnixTitleDetail = { TitleElement: { TitleText: 'A Companion to the Cavendishes' } };

    expect(extractOnixTitle(titleDetail, TitleElementLevel._01)).toEqual({
      title: 'A Companion to the Cavendishes',
      subtitle: '',
      fullTitle: 'A Companion to the Cavendishes',
      language: '',
      titleType: '',
    });
  });

  it('builds the complete title from TitlePrefix and TitleWithoutPrefix', () => {
    const descriptiveDetail = parseProduct(`
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <TitlePrefix language="eng">A</TitlePrefix>
          <TitleWithoutPrefix language="eng">Companion to the Cavendishes</TitleWithoutPrefix>
        </TitleElement>
      </TitleDetail>`);

    expect(extractOnixTitle(descriptiveDetail?.TitleDetail, TitleElementLevel._01).title).toBe(
      'A Companion to the Cavendishes',
    );
  });

  it('uses TitleWithoutPrefix on its own when NoPrefix is asserted', () => {
    const descriptiveDetail = parseProduct(`
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <NoPrefix/>
          <TitleWithoutPrefix language="eng">Antiracist Medievalisms</TitleWithoutPrefix>
          <Subtitle language="eng">From “Yellow Peril” to Black Lives Matter</Subtitle>
        </TitleElement>
      </TitleDetail>`);

    expect(extractOnixTitle(descriptiveDetail?.TitleDetail, TitleElementLevel._01)).toEqual({
      title: 'Antiracist Medievalisms',
      subtitle: 'From “Yellow Peril” to Black Lives Matter',
      fullTitle: 'Antiracist Medievalisms From “Yellow Peril” to Black Lives Matter',
      language: 'eng',
      titleType: '01',
    });
  });

  it('prefers the distinctive title (TitleType 01) over other title details', () => {
    // Exactly the two-TitleDetail shape every Arc product uses: the second detail is the
    // publisher's internal abbreviated title and must not become the work title.
    const descriptiveDetail = parseProduct(`
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <TitlePrefix language="eng">A</TitlePrefix>
          <TitleWithoutPrefix language="eng">Companion to the Cavendishes</TitleWithoutPrefix>
        </TitleElement>
      </TitleDetail>
      <TitleDetail>
        <TitleType>05</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <NoPrefix/>
          <TitleWithoutPrefix language="eng">COMP_Hopkins-Cavendishes</TitleWithoutPrefix>
        </TitleElement>
      </TitleDetail>`);

    expect(Array.isArray(descriptiveDetail?.TitleDetail)).toBe(true);
    expect(extractOnixTitle(descriptiveDetail?.TitleDetail, TitleElementLevel._01).title).toBe(
      'A Companion to the Cavendishes',
    );
  });

  it('picks the TitleElement matching the requested level', () => {
    const titleDetail: OnixTitleDetail = {
      TitleElement: [
        { TitleElementLevel: TitleElementLevel._02, TitleWithoutPrefix: 'Arc Companions' },
        { TitleElementLevel: TitleElementLevel._01, TitleWithoutPrefix: 'Companion to the Cavendishes' },
      ],
    };

    expect(extractOnixTitle(titleDetail, TitleElementLevel._01).title).toBe('Companion to the Cavendishes');
    expect(extractOnixTitle(titleDetail, TitleElementLevel._02).title).toBe('Arc Companions');
  });

  it('accepts a TitleElement with no level rather than dropping it', () => {
    const titleDetail: OnixTitleDetail = { TitleElement: { TitleText: 'Arc Companions' } };

    expect(extractOnixTitle(titleDetail, TitleElementLevel._02).title).toBe('Arc Companions');
  });

  it('does not duplicate a prefix already present in TitleText', () => {
    const titleDetail: OnixTitleDetail = {
      TitleElement: { TitlePrefix: 'A', TitleText: 'A Companion to the Cavendishes' },
    };

    expect(extractOnixTitle(titleDetail, TitleElementLevel._01).title).toBe('A Companion to the Cavendishes');
  });

  it('splices in a prefix that TitleText is missing', () => {
    const titleDetail: OnixTitleDetail = {
      TitleElement: { TitlePrefix: 'A', TitleText: 'Companion to the Cavendishes' },
    };

    expect(extractOnixTitle(titleDetail, TitleElementLevel._01).title).toBe('A Companion to the Cavendishes');
  });

  it('joins an elided prefix without a space', () => {
    const titleDetail: OnixTitleDetail = {
      TitleElement: { TitlePrefix: "L'", TitleWithoutPrefix: 'Étranger' },
    };

    expect(extractOnixTitle(titleDetail, TitleElementLevel._01).title).toBe("L'Étranger");
  });

  it('returns empty parts when there is no title detail at all', () => {
    expect(extractOnixTitle(undefined, TitleElementLevel._01)).toEqual({
      title: '',
      subtitle: '',
      fullTitle: '',
      language: '',
      titleType: '',
    });
  });

  it('reports the language the selected title claims', () => {
    const descriptiveDetail = parseProduct(`
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <TitleText language="fre">L’Étranger</TitleText>
        </TitleElement>
      </TitleDetail>`);

    expect(extractOnixTitle(descriptiveDetail?.TitleDetail, TitleElementLevel._01).language).toBe('fre');
  });

  it('falls back to the language of another element of the same title', () => {
    // A file that tags only its subtitle still says something usable about the title's language.
    const descriptiveDetail = parseProduct(`
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <TitleText>Antiracist Medievalisms</TitleText>
          <Subtitle language="eng">From “Yellow Peril” to Black Lives Matter</Subtitle>
        </TitleElement>
      </TitleDetail>`);

    expect(extractOnixTitle(descriptiveDetail?.TitleDetail, TitleElementLevel._01).language).toBe('eng');
  });

  it('reports no language for a title that carries no attribute', () => {
    const descriptiveDetail = parseProduct(`
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <TitleText>Beowulf by All</TitleText>
        </TitleElement>
      </TitleDetail>`);

    expect(extractOnixTitle(descriptiveDetail?.TitleDetail, TitleElementLevel._01).language).toBe('');
  });
});

describe('extractOnixTitlesOfType', () => {
  it('enumerates titles in another language (TitleType 06) with their own languages', () => {
    const descriptiveDetail = parseProduct(`
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <TitleText language="fre">L’Étranger</TitleText>
        </TitleElement>
      </TitleDetail>
      <TitleDetail>
        <TitleType>06</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <TitleText language="eng">The Stranger</TitleText>
        </TitleElement>
      </TitleDetail>
      <TitleDetail>
        <TitleType>06</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <TitleText language="ger">Der Fremde</TitleText>
        </TitleElement>
      </TitleDetail>`);

    // Document order, which is the only order ONIX gives.
    expect(
      extractOnixTitlesOfType(descriptiveDetail?.TitleDetail, TitleElementLevel._01, TitleType._06).map(
        ({ title, language }) => [title, language],
      ),
    ).toEqual([
      ['The Stranger', 'eng'],
      ['Der Fremde', 'ger'],
    ]);
  });

  it('never returns a title of another type', () => {
    // Arc's shape: the Type 05 detail is the publisher's internal working title, not a title in
    // another language, and asking for 06 must not surface it.
    const descriptiveDetail = parseProduct(`
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <TitleText>A Companion to the Cavendishes</TitleText>
        </TitleElement>
      </TitleDetail>
      <TitleDetail>
        <TitleType>05</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <TitleText>COMP_Hopkins-Cavendishes</TitleText>
        </TitleElement>
      </TitleDetail>`);

    expect(extractOnixTitlesOfType(descriptiveDetail?.TitleDetail, TitleElementLevel._01, TitleType._06)).toEqual([]);
    expect(
      extractOnixTitlesOfType(descriptiveDetail?.TitleDetail, TitleElementLevel._01, TitleType._01).map(
        ({ title }) => title,
      ),
    ).toEqual(['A Companion to the Cavendishes']);
  });

  it('picks the element at the requested level within each detail', () => {
    const titleDetail: OnixTitleDetail = {
      TitleType: TitleType._06,
      TitleElement: [
        { TitleElementLevel: TitleElementLevel._02, TitleText: 'Arc Companions' },
        { TitleElementLevel: TitleElementLevel._01, TitleText: 'The Stranger' },
      ],
    };

    expect(
      extractOnixTitlesOfType(titleDetail, TitleElementLevel._01, TitleType._06).map(({ title }) => title),
    ).toEqual(['The Stranger']);
  });

  it('drops details that yield no title rather than returning blanks', () => {
    const titleDetail: OnixTitleDetail[] = [
      { TitleType: TitleType._06, TitleElement: { TitleElementLevel: TitleElementLevel._01 } },
      { TitleType: TitleType._06, TitleElement: { TitleElementLevel: TitleElementLevel._01, TitleText: 'Der Fremde' } },
    ];

    expect(
      extractOnixTitlesOfType(titleDetail, TitleElementLevel._01, TitleType._06).map(({ title }) => title),
    ).toEqual(['Der Fremde']);
  });

  it('returns nothing when there is no title detail at all', () => {
    expect(extractOnixTitlesOfType(undefined, TitleElementLevel._01, TitleType._06)).toEqual([]);
  });
});

describe('getOnixLanguage', () => {
  it('reads the language attribute of an element that carries one', () => {
    const descriptiveDetail = parseProduct(`
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement><TitleText language="fre">L’Étranger</TitleText></TitleElement>
      </TitleDetail>`);
    const [detail] = toOnixArray(descriptiveDetail?.TitleDetail);
    const [element] = toOnixArray(detail.TitleElement);

    expect(getOnixLanguage(element.TitleText)).toBe('fre');
  });

  it('reports no language for bare text', () => {
    const descriptiveDetail = parseProduct(`
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement><TitleText>Beowulf by All</TitleText></TitleElement>
      </TitleDetail>`);
    const [detail] = toOnixArray(descriptiveDetail?.TitleDetail);
    const [element] = toOnixArray(detail.TitleElement);

    // The real parser emits a plain string here, not an object with an empty attribute.
    expect(typeof element.TitleText).toBe('string');
    expect(getOnixLanguage(element.TitleText)).toBe('');
  });

  it('reports no language for an element carrying only other attributes', () => {
    expect(getOnixLanguage({ '#text': 'Some description', '@_textformat': '03' } as never)).toBe('');
  });

  it('returns an empty string for absent values', () => {
    expect(getOnixLanguage(undefined)).toBe('');
    expect(getOnixLanguage(null)).toBe('');
    expect(getOnixLanguage(12)).toBe('');
  });
});

describe('selectPublicationOrderSequence', () => {
  const sequence = (number: string, type?: string) => ({
    ...(type ? { CollectionSequenceType: type as CollectionSequenceType } : {}),
    CollectionSequenceNumber: number,
  });

  it('picks the publication-order sequence even when it is not first', () => {
    expect(selectPublicationOrderSequence([sequence('7', '02'), sequence('11', '03')])).toEqual({
      kind: 'ordinal',
      ordinal: 11,
    });
  });

  it('ignores a sequence that declares some other order', () => {
    // An alphabetical position (02) is not an issue number, however early it appears.
    expect(selectPublicationOrderSequence([sequence('7', '02')])).toEqual({ kind: 'none' });
  });

  it('accepts an untyped sequence as a compatibility fallback', () => {
    expect(selectPublicationOrderSequence([sequence('4')])).toEqual({ kind: 'ordinal', ordinal: 4 });
  });

  it('prefers publication order over an untyped sequence', () => {
    expect(selectPublicationOrderSequence([sequence('4'), sequence('11', '03')])).toEqual({
      kind: 'ordinal',
      ordinal: 11,
    });
  });

  it('collapses repeats of the same publication-order number', () => {
    expect(selectPublicationOrderSequence([sequence('11', '03'), sequence('11', '03')])).toEqual({
      kind: 'ordinal',
      ordinal: 11,
    });
  });

  it('reports contradictory publication-order numbers instead of picking one', () => {
    // Deterministic whichever way round the file lists them: no `.find()` winner.
    expect(selectPublicationOrderSequence([sequence('11', '03'), sequence('2', '03')])).toEqual({
      kind: 'conflict',
      ordinals: [2, 11],
    });
    expect(selectPublicationOrderSequence([sequence('2', '03'), sequence('11', '03')])).toEqual({
      kind: 'conflict',
      ordinals: [2, 11],
    });
  });

  it('reports contradictory untyped sequences too', () => {
    expect(selectPublicationOrderSequence([sequence('2'), sequence('11')])).toEqual({
      kind: 'conflict',
      ordinals: [2, 11],
    });
  });

  it('reads a whole positive ordinal', () => {
    expect(selectPublicationOrderSequence([sequence('11', '03')])).toEqual({ kind: 'ordinal', ordinal: 11 });
    // Leading zeros are a formatting choice, not a different number.
    expect(selectPublicationOrderSequence([sequence('0011', '03')])).toEqual({ kind: 'ordinal', ordinal: 11 });
  });

  it('ignores numbers Thoth cannot use as an ordinal', () => {
    // `parseInt` would read `11abc` as 11 and `1.5` as 1, inventing a confident issue ordinal out
    // of a value the file got wrong.
    ['0', '-1', '1.5', '11abc', 'N/A', '', ' '].forEach((number) => {
      expect(selectPublicationOrderSequence([sequence(number, '03')])).toEqual({ kind: 'none' });
    });
  });

  it('reads a sequence parsed from real ONIX', () => {
    const descriptiveDetail = parseProduct(`
      <Collection>
        <CollectionType>10</CollectionType>
        <CollectionSequence>
          <CollectionSequenceType>02</CollectionSequenceType>
          <CollectionSequenceNumber>7</CollectionSequenceNumber>
        </CollectionSequence>
        <CollectionSequence>
          <CollectionSequenceType>03</CollectionSequenceType>
          <CollectionSequenceNumber>11</CollectionSequenceNumber>
        </CollectionSequence>
      </Collection>`);
    const [collection] = toOnixArray(descriptiveDetail?.Collection);

    expect(Array.isArray(collection.CollectionSequence)).toBe(true);
    expect(selectPublicationOrderSequence(toOnixArray(collection.CollectionSequence))).toEqual({
      kind: 'ordinal',
      ordinal: 11,
    });
  });

  it('returns nothing when the collection has no sequence', () => {
    expect(selectPublicationOrderSequence([])).toEqual({ kind: 'none' });
  });

  it('accepts the whole range Thoth can store', () => {
    // `issue.issue_ordinal` is `Int4`, so 1 and 2147483647 are the ends of what exists.
    expect(selectPublicationOrderSequence([sequence('1', '03')])).toEqual({ kind: 'ordinal', ordinal: 1 });
    expect(selectPublicationOrderSequence([sequence('2147483647', '03')])).toEqual({
      kind: 'ordinal',
      ordinal: 2147483647,
    });
  });

  it('reports a number past the end of that range instead of pretending none was given', () => {
    // Falling through as `none` would have the series planner number the work itself, so a
    // publisher who said "issue 2147483648" would silently be given issue 1.
    expect(selectPublicationOrderSequence([sequence('2147483648', '03')])).toEqual({
      kind: 'unrepresentable',
      values: ['2147483648'],
    });
    expect(selectPublicationOrderSequence([sequence('999999999999999999999999', '03')])).toEqual({
      kind: 'unrepresentable',
      values: ['999999999999999999999999'],
    });
  });

  it('reports an out-of-range untyped sequence too', () => {
    expect(selectPublicationOrderSequence([sequence('2147483648')])).toEqual({
      kind: 'unrepresentable',
      values: ['2147483648'],
    });
  });

  it('does not let an out-of-range number be resolved by an in-range one beside it', () => {
    const forwards = [sequence('3', '03'), sequence('2147483648', '03')];

    expect(selectPublicationOrderSequence(forwards)).toEqual({ kind: 'unrepresentable', values: ['2147483648'] });
    expect(selectPublicationOrderSequence([...forwards].reverse())).toEqual(selectPublicationOrderSequence(forwards));
  });

  it('ignores an out-of-range sequence of some other order', () => {
    expect(selectPublicationOrderSequence([sequence('2147483648', '02')])).toEqual({ kind: 'none' });
  });
});

describe('selectRelatedIdentifier', () => {
  const isDoi = (identifier: OnixRelatedIdentifier) => identifier.ProductIDType === '06';

  it('reads the one matching identifier', () => {
    const identifiers: OnixRelatedIdentifier[] = [
      { ProductIDType: '15', IDValue: '9781641891783' },
      { ProductIDType: '06', IDValue: '10.1234/abc' },
    ];

    expect(selectRelatedIdentifier(identifiers, isDoi)).toEqual({ kind: 'value', value: '10.1234/abc' });
  });

  it('does not depend on the order the file lists identifiers in', () => {
    const identifiers: OnixRelatedIdentifier[] = [
      { ProductIDType: '06', IDValue: '10.1234/abc' },
      { ProductIDType: '15', IDValue: '9781641891783' },
    ];

    expect(selectRelatedIdentifier(identifiers, isDoi)).toEqual({ kind: 'value', value: '10.1234/abc' });
  });

  it('collapses repeats of the same value', () => {
    const identifiers: OnixRelatedIdentifier[] = [
      { ProductIDType: '06', IDValue: '10.1234/abc' },
      { ProductIDType: '06', IDValue: '10.1234/abc' },
    ];

    expect(selectRelatedIdentifier(identifiers, isDoi)).toEqual({ kind: 'value', value: '10.1234/abc' });
  });

  it('reports two identifiers of one kind that disagree, whichever order they come in', () => {
    // ONIX says a type should not repeat within one composite, but nothing validates the file on
    // the way in, and picking the first would make the import depend on document order.
    const forwards: OnixRelatedIdentifier[] = [
      { ProductIDType: '06', IDValue: '10.1234/abc' },
      { ProductIDType: '06', IDValue: '10.5678/def' },
    ];

    expect(selectRelatedIdentifier(forwards, isDoi)).toEqual({
      kind: 'conflict',
      values: ['10.1234/abc', '10.5678/def'],
    });
    expect(selectRelatedIdentifier([...forwards].reverse(), isDoi)).toEqual({
      kind: 'conflict',
      values: ['10.1234/abc', '10.5678/def'],
    });
  });

  it('ignores matching identifiers with no value', () => {
    expect(selectRelatedIdentifier([{ ProductIDType: '06' }], isDoi)).toEqual({ kind: 'none' });
  });

  it('returns nothing when nothing matches', () => {
    expect(selectRelatedIdentifier([{ ProductIDType: '15', IDValue: '9781641891783' }], isDoi)).toEqual({
      kind: 'none',
    });
    expect(selectRelatedIdentifier([], isDoi)).toEqual({ kind: 'none' });
  });

  it('reads identifiers parsed from real ONIX', () => {
    const root = parse(
      `<?xml version="1.0" encoding="UTF-8"?>
       <ONIXMessage release="3.0"><Product><RecordReference>x</RecordReference><RelatedMaterial>
         <RelatedProduct>
           <ProductRelationCode>34</ProductRelationCode>
           <ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9781641891783</IDValue></ProductIdentifier>
           <ProductIdentifier><ProductIDType>06</ProductIDType><IDValue>10.1234/abc</IDValue></ProductIdentifier>
         </RelatedProduct>
       </RelatedMaterial></Product></ONIXMessage>`,
    ) as ExtendedONIXMessageRoot;
    const [product] = toOnixArray(root.ONIXMessage.Product);
    const [relatedProduct] = toOnixArray(product.RelatedMaterial?.RelatedProduct);

    expect(Array.isArray(relatedProduct.ProductIdentifier)).toBe(true);
    expect(selectRelatedIdentifier(toOnixArray(relatedProduct.ProductIdentifier), isDoi)).toEqual({
      kind: 'value',
      value: '10.1234/abc',
    });
  });
});

describe('selectCanonicalDoi', () => {
  const CANONICAL = 'https://doi.org/10.1234/x';

  it('finds nothing in nothing', () => {
    expect(selectCanonicalDoi([])).toEqual({ kind: 'none', unusable: [] });
  });

  it('canonicalises a bare DOI', () => {
    expect(selectCanonicalDoi(['10.1234/x'])).toEqual({ kind: 'doi', doi: CANONICAL, unusable: [] });
  });

  it('leaves a DOI that already carries the canonical resolver alone', () => {
    expect(selectCanonicalDoi([CANONICAL])).toEqual({ kind: 'doi', doi: CANONICAL, unusable: [] });
  });

  it('accepts every resolver form the Thoth API accepts', () => {
    // `Doi::from_str` matches `[[http[s]://][www.][dx.]doi.org/]10.XXXX/XXX`, so all of these are
    // the same identifier as far as Thoth is concerned.
    ['http://doi.org/10.1234/x', 'https://www.doi.org/10.1234/x', 'http://dx.doi.org/10.1234/x'].forEach((spelling) =>
      expect(selectCanonicalDoi([spelling])).toEqual({ kind: 'doi', doi: CANONICAL, unusable: [] }),
    );
  });

  it('treats a bare DOI and its resolver-prefixed twin as one DOI', () => {
    // The whole point of canonicalising before comparing: these are one identifier written twice,
    // not two identifiers that disagree.
    expect(selectCanonicalDoi(['10.1234/x', 'https://doi.org/10.1234/x'])).toEqual({
      kind: 'doi',
      doi: CANONICAL,
      unusable: [],
    });
    expect(selectCanonicalDoi(['http://dx.doi.org/10.1234/x', '10.1234/x'])).toEqual({
      kind: 'doi',
      doi: CANONICAL,
      unusable: [],
    });
  });

  it('collapses an identical repeat', () => {
    expect(selectCanonicalDoi(['10.1234/x', '10.1234/x'])).toEqual({ kind: 'doi', doi: CANONICAL, unusable: [] });
  });

  it('refuses to choose between two genuinely different DOIs', () => {
    expect(selectCanonicalDoi(['10.1234/x', '10.5678/y'])).toEqual({
      kind: 'conflict',
      dois: ['https://doi.org/10.1234/x', 'https://doi.org/10.5678/y'],
      unusable: [],
    });
  });

  it('gives the same answer whichever order the conflicting values arrive in', () => {
    expect(selectCanonicalDoi(['10.5678/y', '10.1234/x'])).toEqual(selectCanonicalDoi(['10.1234/x', '10.5678/y']));
  });

  it('never turns a value that is not a DOI into one', () => {
    // `doiPrefix + value` used to make this `https://doi.org/not-a-doi`, which survives the whole
    // import and fails at the API.
    expect(selectCanonicalDoi(['not-a-doi'])).toEqual({ kind: 'none', unusable: ['not-a-doi'] });
  });

  it('keeps a real DOI beside a malformed one and reports the malformed one', () => {
    expect(selectCanonicalDoi(['10.1234/x', 'PROD-1234'])).toEqual({
      kind: 'doi',
      doi: CANONICAL,
      unusable: ['PROD-1234'],
    });
  });

  it('ignores blank values', () => {
    expect(selectCanonicalDoi(['', '   ', '10.1234/x'])).toEqual({ kind: 'doi', doi: CANONICAL, unusable: [] });
    expect(selectCanonicalDoi(['', '  '])).toEqual({ kind: 'none', unusable: [] });
  });

  it('trims before reading', () => {
    expect(selectCanonicalDoi(['  10.1234/x  '])).toEqual({ kind: 'doi', doi: CANONICAL, unusable: [] });
  });

  it('reads DOIs off identifiers parsed from real ONIX', () => {
    const root = parse(
      `<?xml version="1.0" encoding="UTF-8"?>
       <ONIXMessage release="3.0"><Product>
         <RecordReference>x</RecordReference>
         <ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9781641891783</IDValue></ProductIdentifier>
         <ProductIdentifier><ProductIDType>06</ProductIDType><IDValue>10.1234/x</IDValue></ProductIdentifier>
       </Product></ONIXMessage>`,
    ) as ExtendedONIXMessageRoot;
    const [product] = toOnixArray(root.ONIXMessage.Product);
    const identifiers = toOnixArray(product.ProductIdentifier);

    expect(Array.isArray(product.ProductIdentifier)).toBe(true);
    expect(
      selectCanonicalDoi(
        identifiers
          .filter((identifier) => identifier.ProductIDType === '06')
          .map((identifier) => `${identifier.IDValue}`),
      ),
    ).toEqual({ kind: 'doi', doi: CANONICAL, unusable: [] });
  });
});

describe('getOnixDateFormat', () => {
  it('reads the attribute a real parse produces', () => {
    const root = parse(
      `<?xml version="1.0" encoding="UTF-8"?>
       <ONIXMessage release="3.0"><Product><RecordReference>x</RecordReference><PublishingDetail>
         <PublishingDate><PublishingDateRole>01</PublishingDateRole><Date dateformat="00">20240807</Date></PublishingDate>
         <PublishingDate><PublishingDateRole>09</PublishingDateRole><Date>20240808</Date></PublishingDate>
       </PublishingDetail></Product></ONIXMessage>`,
    ) as ExtendedONIXMessageRoot;
    const [product] = toOnixArray(root.ONIXMessage.Product);
    const [attributed, bare] = toOnixArray(product.PublishingDetail?.PublishingDate);

    // An attributed Date is an object holding its text under `#text`; a bare one is a string.
    expect(attributed.Date).toEqual({ '#text': '20240807', '@_dateformat': '00' });
    expect(bare.Date).toBe('20240808');
    expect(getOnixDateFormat(attributed.Date)).toBe('00');
    expect(getOnixDateFormat(bare.Date)).toBe('');
  });

  it('has nothing to say about an absent date', () => {
    expect(getOnixDateFormat(undefined)).toBe('');
    expect(getOnixDateFormat(null)).toBe('');
  });
});

describe('readOnixDate', () => {
  it('reads the complete date Thoth itself writes', () => {
    expect(readOnixDate({ '#text': '20240807', '@_dateformat': '00' })).toBe('2024-08-07');
  });

  it('reads a leap day', () => {
    expect(readOnixDate({ '#text': '20240229', '@_dateformat': '00' })).toBe('2024-02-29');
  });

  it('treats an omitted dateformat as format 00', () => {
    // ONIX: "Each data element on which this attribute may be used specifies a default dateformat
    // if the attribute is not supplied — for most date elements, this is format '00', YYYYMMDD".
    expect(readOnixDate('20240807')).toBe('2024-08-07');
    expect(readOnixDate({ '#text': '20240807' })).toBe('2024-08-07');
  });

  it('rejects a day that does not exist', () => {
    // `dayjs('20240230')` says 1 March. There is no honest way to import a date the sender got
    // wrong, and repairing it silently changes what the file said.
    expect(readOnixDate({ '#text': '20240230', '@_dateformat': '00' })).toBeUndefined();
    expect(readOnixDate({ '#text': '20230229', '@_dateformat': '00' })).toBeUndefined();
  });

  it('rejects an impossible month or day', () => {
    ['20241301', '20240100', '20240132', '20240001'].forEach((digits) =>
      expect(readOnixDate({ '#text': digits, '@_dateformat': '00' })).toBeUndefined(),
    );
  });

  it('rejects anything that is not eight digits', () => {
    ['2024AA01', '2024-08-07', '2024080', '202408070', '', '  '].forEach((digits) =>
      expect(readOnixDate({ '#text': digits, '@_dateformat': '00' })).toBeUndefined(),
    );
  });

  it('never completes a partial date', () => {
    // A year is not 1 January and a month is not its first day; Thoth stores a `NaiveDate`, and
    // inventing the missing precision would store a fact the sender never stated.
    expect(readOnixDate({ '#text': '2024', '@_dateformat': '05' })).toBeUndefined();
    expect(readOnixDate({ '#text': '202408', '@_dateformat': '01' })).toBeUndefined();
  });

  it('refuses every date format that is not a complete Common Era day', () => {
    // Quarters, seasons, spreads, text dates, timestamps and the Hijri calendar forms all mean
    // something a `NaiveDate` cannot hold without changing it.
    [
      '01',
      '02',
      '03',
      '04',
      '05',
      '06',
      '07',
      '08',
      '09',
      '10',
      '11',
      '12',
      '13',
      '14',
      '20',
      '21',
      '25',
      '32',
    ].forEach((dateformat) =>
      expect(readOnixDate({ '#text': '20240807', '@_dateformat': dateformat })).toBeUndefined(),
    );
  });

  it('has nothing to read in an absent date', () => {
    expect(readOnixDate(undefined)).toBeUndefined();
  });
});

describe('isEarlierCalendarDate', () => {
  it('orders canonical dates by time, not by how they are spelled', () => {
    expect(isEarlierCalendarDate('2024-01-01', '2025-01-01')).toBe(true);
    expect(isEarlierCalendarDate('2025-01-01', '2024-01-01')).toBe(false);
    // Fixed-width zero-padded fields are what makes a string comparison a date comparison: a
    // September date must not sort after an October one because `9` > `1`.
    expect(isEarlierCalendarDate('2024-09-30', '2024-10-01')).toBe(true);
    expect(isEarlierCalendarDate('2024-08-09', '2024-08-10')).toBe(true);
  });

  it('is strict, as the backend is', () => {
    // `WorkProperties::validate` rejects on `withdrawn < publication`, so the same day is fine.
    expect(isEarlierCalendarDate('2024-08-07', '2024-08-07')).toBe(false);
  });
});

describe('selectPublishingDate', () => {
  const date = (role: string, value: string, dateformat?: string): OnixPublishingDate => ({
    PublishingDateRole: role,
    Date: dateformat ? { '#text': value, '@_dateformat': dateformat } : value,
  });

  it('reads the date for the role it was asked about', () => {
    expect(selectPublishingDate([date('01', '20240807', '00')], '01')).toEqual({
      kind: 'date',
      date: '2024-08-07',
      unrepresentable: [],
    });
  });

  it('keeps the two roles independent', () => {
    const dates = [date('01', '20240807', '00'), date('13', '20250101', '00')];

    expect(selectPublishingDate(dates, '01')).toEqual({ kind: 'date', date: '2024-08-07', unrepresentable: [] });
    expect(selectPublishingDate(dates, '13')).toEqual({ kind: 'date', date: '2025-01-01', unrepresentable: [] });
  });

  it('ignores roles Thoth has no field for', () => {
    expect(selectPublishingDate([date('09', '20240807', '00')], '01')).toEqual({ kind: 'none', unrepresentable: [] });
  });

  it('collapses the same date stated twice for one role', () => {
    expect(selectPublishingDate([date('01', '20240807', '00'), date('01', '20240807')], '01')).toEqual({
      kind: 'date',
      date: '2024-08-07',
      unrepresentable: [],
    });
  });

  it('refuses to choose between two dates for one role', () => {
    expect(selectPublishingDate([date('01', '20240807', '00'), date('01', '20240808', '00')], '01')).toEqual({
      kind: 'conflict',
      dates: ['2024-08-07', '2024-08-08'],
      unrepresentable: [],
    });
  });

  it('gives the same answer whichever order the contradiction comes in', () => {
    const forwards = [date('01', '20240807', '00'), date('01', '20240808', '00')];

    expect(selectPublishingDate([...forwards].reverse(), '01')).toEqual(selectPublishingDate(forwards, '01'));
  });

  it('reports a date it cannot represent rather than dropping it silently', () => {
    expect(selectPublishingDate([date('01', '2024', '05')], '01')).toEqual({
      kind: 'none',
      unrepresentable: ['2024'],
    });
  });

  it('keeps a usable date beside an unusable one and reports the unusable one', () => {
    expect(selectPublishingDate([date('01', '2024', '05'), date('01', '20240807', '00')], '01')).toEqual({
      kind: 'date',
      date: '2024-08-07',
      unrepresentable: ['2024'],
    });
  });

  it('has nothing to report about an empty Date element', () => {
    expect(selectPublishingDate([date('01', '')], '01')).toEqual({ kind: 'none', unrepresentable: [] });
  });

  it('reads dates parsed from real ONIX, single or repeated', () => {
    const root = parse(
      `<?xml version="1.0" encoding="UTF-8"?>
       <ONIXMessage release="3.0"><Product><RecordReference>x</RecordReference><PublishingDetail>
         <PublishingDate><PublishingDateRole>01</PublishingDateRole><Date dateformat="00">20240807</Date></PublishingDate>
         <PublishingDate><PublishingDateRole>13</PublishingDateRole><Date dateformat="00">20250101</Date></PublishingDate>
       </PublishingDetail></Product></ONIXMessage>`,
    ) as ExtendedONIXMessageRoot;
    const [product] = toOnixArray(root.ONIXMessage.Product);
    const dates = toOnixArray(product.PublishingDetail?.PublishingDate);

    expect(selectPublishingDate(dates, '01')).toEqual({ kind: 'date', date: '2024-08-07', unrepresentable: [] });
    expect(selectPublishingDate(dates, '13')).toEqual({ kind: 'date', date: '2025-01-01', unrepresentable: [] });
  });
});

describe('classifyCollectionType', () => {
  it("treats a publisher collection as the publisher's own series", () => {
    expect(classifyCollectionType(CollectionType._10)).toBe('supported');
  });

  it('treats an ascribed collection as not a publisher series at all', () => {
    expect(classifyCollectionType(CollectionType._20)).toBe('unsupported');
  });

  it('treats unspecified, editorial-line and missing collection types as ambiguous', () => {
    expect(classifyCollectionType(CollectionType._00)).toBe('ambiguous');
    expect(classifyCollectionType(CollectionType._11)).toBe('ambiguous');
    expect(classifyCollectionType(undefined)).toBe('ambiguous');
  });
});

describe('selectSeriesCollection', () => {
  const collectionWithTitle = (title: string, collectionType?: string): ExtendedCollection =>
    ({
      ...(collectionType ? { CollectionType: collectionType } : {}),
      TitleDetail: { TitleElement: { TitleElementLevel: TitleElementLevel._02, TitleWithoutPrefix: title } },
    }) as ExtendedCollection;

  it('prefers the publisher collection (CollectionType 10)', () => {
    const collections = [
      collectionWithTitle('Ascribed Reading List', '20'),
      collectionWithTitle('Arc Companions', '10'),
    ];

    expect(extractOnixTitle(selectSeriesCollection(collections)?.TitleDetail, TitleElementLevel._02).title).toBe(
      'Arc Companions',
    );
  });

  it('falls back to a collection with no CollectionType', () => {
    const collections = [collectionWithTitle('Arc Companions')];

    expect(selectSeriesCollection(collections)).toBe(collections[0]);
  });

  it('prefers a collection that yields a title over one that does not', () => {
    const collections = [{ CollectionType: '10' } as ExtendedCollection, collectionWithTitle('Arc Companions', '10')];

    expect(extractOnixTitle(selectSeriesCollection(collections)?.TitleDetail, TitleElementLevel._02).title).toBe(
      'Arc Companions',
    );
  });

  it('ignores ascribed collections entirely', () => {
    // CollectionType 20 is assigned by somebody other than the publisher, so it is not a
    // Thoth series even when it is the only collection on the product.
    expect(selectSeriesCollection([collectionWithTitle('A Bookseller Grouping', '20')])).toBeUndefined();
    expect(
      selectSeriesCollection([
        collectionWithTitle('A Bookseller Grouping', '20'),
        collectionWithTitle('Arc Companions'),
      ]),
    ).toEqual(collectionWithTitle('Arc Companions'));
  });

  it('still returns a titleless candidate so the caller can report it', () => {
    const collection = { CollectionType: '10' } as ExtendedCollection;

    expect(selectSeriesCollection([collection])).toBe(collection);
  });

  it('returns undefined when there is nothing to consider', () => {
    expect(selectSeriesCollection([])).toBeUndefined();
  });
});

describe('getOnixTextFormat', () => {
  it('reads the attribute a real parse produces, on abstracts and biographies alike', () => {
    const root = parse(
      `<?xml version="1.0" encoding="UTF-8"?>
       <ONIXMessage release="3.0"><Product><RecordReference>x</RecordReference>
         <DescriptiveDetail>
           <Contributor>
             <PersonName>Lisa Hopkins</PersonName>
             <BiographicalNote textformat="06">Co-editor of &lt;I&gt;Shakespeare&lt;/I&gt;</BiographicalNote>
           </Contributor>
         </DescriptiveDetail>
         <CollateralDetail>
           <TextContent><TextType>03</TextType><ContentAudience>00</ContentAudience>
             <Text textformat="02">&lt;p&gt;An &lt;em&gt;HTML&lt;/em&gt; description&lt;/p&gt;</Text>
           </TextContent>
           <TextContent><TextType>02</TextType><ContentAudience>00</ContentAudience>
             <Text>A bare description</Text>
           </TextContent>
         </CollateralDetail>
       </Product></ONIXMessage>`,
    ) as ExtendedONIXMessageRoot;
    const [product] = toOnixArray(root.ONIXMessage.Product);
    const [long, short] = toOnixArray(product.CollateralDetail?.TextContent);
    const [contributor] = toOnixArray(product.DescriptiveDetail?.Contributor);
    const [note] = toOnixArray(contributor.BiographicalNote);

    // An attributed element is an object holding its text under `#text`; a bare one is a string.
    expect(long?.Text).toEqual({ '#text': '<p>An <em>HTML</em> description</p>', '@_textformat': '02' });
    expect(short?.Text).toBe('A bare description');
    expect(getOnixTextFormat(long?.Text)).toBe('02');
    expect(getOnixTextFormat(short?.Text)).toBe('');
    expect(getOnixTextFormat(note)).toBe('06');
  });

  it('reports no format for an element carrying only other attributes', () => {
    expect(getOnixTextFormat({ '#text': 'Some description', '@_language': 'eng' })).toBe('');
  });

  it('trims a malformed runtime value and tolerates non-string ones', () => {
    expect(getOnixTextFormat({ '#text': 'x', '@_textformat': ' 02 ' })).toBe('02');
    expect(getOnixTextFormat({ '#text': 'x', '@_textformat': 2 as never })).toBe('');
  });

  it('has nothing to say about absent or scalar values', () => {
    expect(getOnixTextFormat(undefined)).toBe('');
    expect(getOnixTextFormat(null)).toBe('');
    expect(getOnixTextFormat('bare text')).toBe('');
    expect(getOnixTextFormat(12)).toBe('');
  });
});

describe('resolveOnixTextMarkup', () => {
  const format = (value: MarkupFormat) => ({ kind: 'format', format: value });

  it('resolves markup-free content to plain text whatever was declared', () => {
    // The API's HTML input path refuses content with no tags in it, and a markup-free string
    // says the same thing in every one of these formats, so PLAIN_TEXT is the one safe spelling.
    for (const declared of ['', '02', '03', '05', '06', '07', '99']) {
      expect(resolveOnixTextMarkup(declared, 'A plain description')).toEqual(format(MarkupFormat.PlainText));
    }
  });

  it('does not mistake angle brackets in prose for markup', () => {
    // ONIX plain text may legitimately contain the entities &amp; and &lt;, which parse back
    // to bare characters; the backend's own markup test requires a letter after `<`.
    expect(resolveOnixTextMarkup('06', 'AT&T proved a < b, <3 readers agreed')).toEqual(
      format(MarkupFormat.PlainText),
    );
  });

  it('sends declared HTML with markup down the HTML path', () => {
    expect(resolveOnixTextMarkup('02', '<p>The <em>book</em> is good</p>')).toEqual(format(MarkupFormat.Html));
  });

  it('sends declared XHTML with markup down the HTML path', () => {
    // The API has no separate XHTML input format; its HTML parser handles XHTML fragments.
    expect(resolveOnixTextMarkup('05', '<p>An <i>XHTML</i> fragment<br/></p>')).toEqual(format(MarkupFormat.Html));
  });

  it('reads declared XML within the Thoth JATS subset back as JATS', () => {
    // Thoth's own ONIX exporter writes its stored JATS under textformat="03"; this is what
    // keeps that round trip working. It is a compatibility interpretation, not a claim that
    // arbitrary ONIX XML is JATS.
    expect(
      resolveOnixTextMarkup('03', '<p>Une <italic>description</italic> <bold>longue</bold>.</p>'),
    ).toEqual(format(MarkupFormat.JatsXml));
    expect(resolveOnixTextMarkup('03', '<list list-type="bullet"><list-item><p>Un</p></list-item></list>')).toEqual(
      format(MarkupFormat.JatsXml),
    );
  });

  it('refuses declared XML whose tags are outside the Thoth JATS subset, naming them', () => {
    // Guessing HTML here would reinterpret the sender's declared XML; guessing JATS would fail
    // at the API partway through the import. Neither guess is made.
    expect(resolveOnixTextMarkup('03', '<p>The <em>book</em></p>')).toEqual({
      kind: 'unclassifiable',
      tags: ['em'],
    });
  });

  it('routes plain-text declarations that really contain HTML through the HTML path', () => {
    // Arc's real biographies: textformat 06 with <I> inside. The tag set is compared
    // case-insensitively because the API parses HTML with a real HTML parser.
    expect(resolveOnixTextMarkup('06', 'Co-editor of <I>Shakespeare</I>')).toEqual(format(MarkupFormat.Html));
    expect(resolveOnixTextMarkup('07', 'A <b>bold</b> claim')).toEqual(format(MarkupFormat.Html));
    expect(resolveOnixTextMarkup('', '<p>An <em>undeclared</em> description</p>')).toEqual(
      format(MarkupFormat.Html),
    );
  });

  it('routes plain-text declarations that really contain JATS through the JATS path', () => {
    expect(resolveOnixTextMarkup('06', '<p>Une <italic>description</italic></p>')).toEqual(
      format(MarkupFormat.JatsXml),
    );
  });

  it('treats an unknown declared format like an absent one', () => {
    expect(resolveOnixTextMarkup('99', 'The <em>book</em>')).toEqual(format(MarkupFormat.Html));
  });

  it('refuses markup it cannot classify rather than guessing', () => {
    expect(resolveOnixTextMarkup('06', 'A <blink>bad</blink> idea')).toEqual({
      kind: 'unclassifiable',
      tags: ['blink'],
    });
    // A mix of HTML-only and JATS-only tags belongs to neither input path in full.
    expect(resolveOnixTextMarkup('06', 'The <em>book</em> is <italic>good</italic>')).toEqual({
      kind: 'unclassifiable',
      tags: ['em', 'italic'],
    });
  });
});
