import { parse } from '@5stones/onix';
import { CollectionType, TitleElementLevel } from '@5stones/onix/dist/enums';
import { describe, expect, it } from 'vitest';

import type { ExtendedCollection, ExtendedONIXMessageRoot, OnixTitleDetail } from './interfaces';
import { classifyCollectionType, extractOnixTitle, getOnixText, selectSeriesCollection, toOnixArray } from './onix';

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
    expect(extractOnixTitle(undefined, TitleElementLevel._01)).toEqual({ title: '', subtitle: '', fullTitle: '' });
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
