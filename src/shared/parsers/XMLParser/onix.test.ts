import { parse } from '@5stones/onix';
import { CollectionSequenceType, CollectionType, TitleElementLevel, TitleType } from '@5stones/onix/dist/enums';
import { describe, expect, it } from 'vitest';

import type { ExtendedCollection, ExtendedONIXMessageRoot, OnixRelatedIdentifier, OnixTitleDetail } from './interfaces';
import {
  classifyCollectionType,
  extractOnixTitle,
  extractOnixTitlesOfType,
  getOnixLanguage,
  getOnixText,
  selectPublicationOrderSequence,
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
