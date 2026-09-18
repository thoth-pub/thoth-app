import { parse } from '@5stones/onix';
import { describe, expect, it } from 'vitest';

import { PublicationType } from '../../constants/publications';
import type { OnixSourcePlan } from '../../types/onixPlanning';
import type { ExtendedONIXMessageRoot } from './interfaces';
import { normaliseEditionNumber, planOnixSource, reduceManifestation } from './onixPlanning';
import type { ProvenanceResolver } from './validation/worker/provenance';

const REFERENCE_NS = 'http://ns.editeur.org/onix/3.0/reference';

/** Valid ISBN-13s (and the ISBN-10 of the first), so identity never rests on a malformed value by accident. */
const ISBN_A = '9781800000018';
const ISBN_A10 = '1800000014';
const ISBN_B = '9781800000025';
const ISBN_C = '9781800000032';

const headerXml = (sender = '<SenderName>Example Press</SenderName>') =>
  `<Header><Sender>${sender}</Sender><SentDateTime>20260913T1200</SentDateTime></Header>`;

const pid = (type: string, value: string, name?: string) =>
  `<ProductIdentifier><ProductIDType>${type}</ProductIDType>${name ? `<IDTypeName>${name}</IDTypeName>` : ''}<IDValue>${value}</IDValue></ProductIdentifier>`;

type ProductSpec = {
  ref?: string;
  notification?: string | null;
  envelope?: string;
  identifiers?: string[];
  descriptive?: string;
  related?: string;
  publishing?: string;
};

const DEFAULT_DESCRIPTIVE =
  '<DescriptiveDetail><ProductComposition>00</ProductComposition><ProductForm>BC</ProductForm></DescriptiveDetail>';

const product = ({
  ref = 'rec-1',
  notification = '03',
  envelope = '',
  identifiers = [pid('15', ISBN_A)],
  descriptive = DEFAULT_DESCRIPTIVE,
  related = '',
  publishing = '',
}: ProductSpec = {}) =>
  `<Product><RecordReference>${ref}</RecordReference>${notification === null ? '' : `<NotificationType>${notification}</NotificationType>`}${envelope}${identifiers.join('')}${descriptive}${publishing}${related ? `<RelatedMaterial>${related}</RelatedMaterial>` : ''}</Product>`;

const message = (products: string[], header = headerXml()) =>
  parse(
    `<ONIXMessage release="3.0" xmlns="${REFERENCE_NS}">${header}${products.join('')}</ONIXMessage>`,
  ) as ExtendedONIXMessageRoot;

const plan = (products: string[], header?: string, provenance?: ProvenanceResolver): OnixSourcePlan =>
  planOnixSource(message(products, header), { provenance });

const blockerCodes = (sourcePlan: OnixSourcePlan) => sourcePlan.blockers.map(({ code }) => code);

describe('planOnixSource', () => {
  describe('source record envelope', () => {
    it('keeps RecordReference as the identity of the information record, never of the Product', () => {
      const sourcePlan = plan([product({ ref: ISBN_B, identifiers: [pid('15', ISBN_A)] })]);

      const [record] = sourcePlan.records;
      expect(record.recordReference).toBe(ISBN_B);
      expect(record.sourceRecordKey).toBe(`${sourcePlan.header.authority}|${ISBN_B}`);
      // An ISBN-looking RecordReference is not inserted into the Product identifier set.
      expect(record.identifiers.map(({ value }) => value)).toEqual([ISBN_A]);
      const [productNode] = sourcePlan.products;
      expect(productNode.identityKeys).toEqual([`gtin13:${ISBN_A}`]);
      expect(productNode.productKey).not.toContain(ISBN_B);
    });

    it('normalises the envelope facts: NotificationType, DeletionText and the record source', () => {
      const envelope =
        '<DeletionText>Issued in error</DeletionText><RecordSourceType>04</RecordSourceType>' +
        '<RecordSourceIdentifier><RecordSourceIDType>06</RecordSourceIDType><IDValue>5012345678900</IDValue></RecordSourceIdentifier>' +
        '<RecordSourceName>Distributor</RecordSourceName>';
      const sourcePlan = plan([product({ notification: '05', envelope })]);

      expect(sourcePlan.records[0]).toMatchObject({
        notificationType: '05',
        disposition: 'DELETE',
        deletionText: ['Issued in error'],
        recordSourceType: '04',
        recordSourceIdentifiers: [{ type: '06', typeName: null, value: '5012345678900' }],
        recordSourceName: 'Distributor',
      });
    });

    it('scopes source records to strong sender identifiers when the Header has them', () => {
      const identified = plan(
        [product()],
        headerXml(
          '<SenderIdentifier><SenderIDType>06</SenderIDType><IDValue>5012345000009</IDValue></SenderIdentifier><SenderName>Example Press</SenderName><EmailAddress>onix@example.org</EmailAddress>',
        ),
      );
      const unidentified = plan([product()], headerXml('<SenderName>Example Press</SenderName>'));

      expect(identified.header).toMatchObject({
        senderName: 'Example Press',
        senderEmail: 'onix@example.org',
        senderIdentifiers: [{ type: '06', typeName: null, value: '5012345000009' }],
        authority: 'sender:06:5012345000009',
      });
      // A name is not a globally unique identity: the file is its own scope.
      expect(unidentified.header.authority).toBe('this-file');
    });

    it('records canonical and original source paths for every record', () => {
      const provenance: ProvenanceResolver = {
        sourcePathOf: (path) => path.replace('/Product[', '/product['),
        sourceTagOf: () => 'product',
      };
      const sourcePlan = plan(
        [product({ ref: 'a' }), product({ ref: 'b', identifiers: [pid('15', ISBN_B)] })],
        undefined,
        provenance,
      );

      expect(sourcePlan.records.map(({ path, sourcePath }) => [path, sourcePath])).toEqual([
        ['/ONIXMessage[1]/Product[1]', '/ONIXMessage[1]/product[1]'],
        ['/ONIXMessage[1]/Product[2]', '/ONIXMessage[1]/product[2]'],
      ]);
      expect(sourcePlan.records[1].identifiers[0].path).toBe('/ONIXMessage[1]/Product[2]/ProductIdentifier[1]');
    });
  });

  describe('NotificationType', () => {
    it.each(['01', '02', '03'])('reads %s as a complete record eligible for ordinary planning', (code) => {
      const sourcePlan = plan([product({ notification: code })]);

      expect(sourcePlan.records[0].disposition).toBe('COMPLETE');
      expect(sourcePlan.records[0].productKey).toBe(sourcePlan.products[0].productKey);
      expect(sourcePlan.groups).toHaveLength(1);
      expect(sourcePlan.blockers).toEqual([]);
    });

    it.each([
      ['04', 'PARTIAL_UPDATE'],
      ['05', 'DELETE'],
      ['08', 'OWNERSHIP_TRANSFER'],
      ['09', 'OWNERSHIP_TRANSFER'],
    ])(
      'never plans a %s record as a Product, however complete its blocks look, and blocks it until excluded',
      (code, disposition) => {
        const sourcePlan = plan([product({ notification: code })]);

        expect(sourcePlan.records[0]).toMatchObject({ disposition, productKey: null });
        expect(sourcePlan.products).toEqual([]);
        expect(sourcePlan.groups).toEqual([]);
        expect(sourcePlan.blockers).toEqual([
          expect.objectContaining({
            code: 'RECORD_NOT_COMPLETE',
            classification: 'TARGET_INPUT_REQUIRED',
            recordKey: sourcePlan.records[0].recordKey,
            detail: { notificationType: code },
          }),
        ]);
      },
    );

    it.each(['88', '89'])('omits a %s test record from planning without blocking the file', (code) => {
      const sourcePlan = plan([
        product({ notification: code }),
        product({ ref: 'live', identifiers: [pid('15', ISBN_B)] }),
      ]);

      expect(sourcePlan.records[0]).toMatchObject({ disposition: 'TEST', productKey: null });
      expect(sourcePlan.products).toHaveLength(1);
      expect(sourcePlan.blockers).toEqual([]);
      expect(sourcePlan.warnings).toContainEqual(
        expect.objectContaining({
          severity: 'warning',
          code: 'onix.record.omitted',
          source: { kind: 'onix', productIndex: 1, recordReference: 'rec-1' },
        }),
      );
    });

    it.each([null, '99'])('never reads a missing or unrecognised NotificationType (%s) as 03', (code) => {
      const sourcePlan = plan([product({ notification: code })]);

      expect(sourcePlan.records[0]).toMatchObject({ disposition: 'UNRECOGNISED', productKey: null });
      expect(sourcePlan.products).toEqual([]);
      expect(blockerCodes(sourcePlan)).toEqual(['RECORD_NOTIFICATION_UNRECOGNISED']);
    });

    it('blocks a complete record whose Product a non-complete record in the same file also addresses', () => {
      const sourcePlan = plan([
        product({ ref: 'complete', notification: '03' }),
        product({ ref: 'update', notification: '04' }),
      ]);

      expect(sourcePlan.products).toHaveLength(1);
      expect(blockerCodes(sourcePlan)).toEqual(['RECORD_NOT_COMPLETE', 'RECORD_SEQUENCE_AMBIGUITY']);
      expect(sourcePlan.blockers[1]).toMatchObject({
        productKey: sourcePlan.products[0].productKey,
        detail: { recordKeys: ['record:2'] },
      });
    });
  });

  describe('Product identifiers', () => {
    it('keeps every occurrence with its declared type, scheme name, value and path', () => {
      const sourcePlan = plan([
        product({
          identifiers: [
            pid('01', 'SKU-1', 'Warehouse code'),
            pid('15', ISBN_A),
            pid('03', ISBN_A),
            pid('06', '10.1234/abc'),
          ],
        }),
      ]);

      expect(
        sourcePlan.records[0].identifiers.map(({ type, typeName, value, path }) => ({ type, typeName, value, path })),
      ).toEqual([
        {
          type: '01',
          typeName: 'Warehouse code',
          value: 'SKU-1',
          path: '/ONIXMessage[1]/Product[1]/ProductIdentifier[1]',
        },
        { type: '15', typeName: null, value: ISBN_A, path: '/ONIXMessage[1]/Product[1]/ProductIdentifier[2]' },
        { type: '03', typeName: null, value: ISBN_A, path: '/ONIXMessage[1]/Product[1]/ProductIdentifier[3]' },
        { type: '06', typeName: null, value: '10.1234/abc', path: '/ONIXMessage[1]/Product[1]/ProductIdentifier[4]' },
      ]);
    });

    it('prefers a valid ISBN-13 (15) for the Publication ISBN', () => {
      const [productNode] = plan([product({ identifiers: [pid('15', ISBN_A)] })]).products;

      expect(productNode.isbn).toEqual({
        kind: 'ACCEPTED',
        isbn: ISBN_A,
        declaredAs: '15',
        path: '/ONIXMessage[1]/Product[1]/ProductIdentifier[1]',
      });
    });

    it('accepts a GTIN-13 (03) that is itself a valid ISBN-13 when no ISBN-13 is declared, and says it was a GTIN', () => {
      const [productNode] = plan([product({ identifiers: [pid('03', ISBN_A)] })]).products;

      expect(productNode.isbn).toMatchObject({ kind: 'ACCEPTED', isbn: ISBN_A, declaredAs: '03' });
    });

    it('treats an equal 03 and 15 as corroborating one Product identity, not two', () => {
      const [productNode] = plan([product({ identifiers: [pid('03', ISBN_A), pid('15', ISBN_A)] })]).products;

      expect(productNode.isbn).toMatchObject({ kind: 'ACCEPTED', isbn: ISBN_A, declaredAs: '15' });
      expect(productNode.identityKeys).toEqual([`gtin13:${ISBN_A}`]);
    });

    it('keeps the ISBN-13 when a different GTIN-13 is also declared, and reports the GTIN as unrepresentable', () => {
      const sourcePlan = plan([product({ identifiers: [pid('15', ISBN_A), pid('03', ISBN_B)] })]);

      expect(sourcePlan.products[0].isbn).toMatchObject({ kind: 'ACCEPTED', isbn: ISBN_A, declaredAs: '15' });
      expect(sourcePlan.products[0].identityKeys).toEqual([`gtin13:${ISBN_A}`, `gtin13:${ISBN_B}`]);
      expect(sourcePlan.warnings).toContainEqual(
        expect.objectContaining({ code: 'onix.identifier.unrepresentable', message: expect.stringContaining(ISBN_B) }),
      );
    });

    it('never makes a lone legacy ISBN-10 (02) the Publication ISBN, but still reads it as the same Product identity', () => {
      const sourcePlan = plan([product({ identifiers: [pid('02', ISBN_A10)] })]);

      expect(sourcePlan.products[0].isbn).toEqual({ kind: 'NONE' });
      expect(sourcePlan.products[0].identityKeys).toEqual([`gtin13:${ISBN_A}`]);
    });

    it('never replaces the Product ISBN with a co-publisher ISBN-13 (24)', () => {
      const sourcePlan = plan([product({ identifiers: [pid('24', ISBN_B)] })]);

      expect(sourcePlan.products[0].isbn).toEqual({ kind: 'NONE' });
      expect(sourcePlan.products[0].identityKeys).toEqual([]);
    });

    it('refuses to choose between two distinct valid ISBN-13s', () => {
      const sourcePlan = plan([product({ identifiers: [pid('15', ISBN_B), pid('15', ISBN_A)] })]);

      expect(sourcePlan.products[0].isbn).toEqual({ kind: 'AMBIGUOUS', candidates: [ISBN_A, ISBN_B] });
      expect(blockerCodes(sourcePlan)).toEqual(['ISBN_AMBIGUOUS']);
    });

    it('does not accept an ISBN-13 whose check digit is wrong', () => {
      const [productNode] = plan([product({ identifiers: [pid('15', '9781800000019')] })]).products;

      expect(productNode.isbn).toEqual({ kind: 'NONE' });
    });

    it('reads Product DOI (06), LCCN (13), OCLC (23) and proprietary ids as Product facts, never as Work identity', () => {
      const sourcePlan = plan([
        product({
          identifiers: [
            pid('15', ISBN_A),
            pid('06', '10.1234/abc'),
            pid('13', '2019012345'),
            pid('23', '1086123456'),
            pid('01', 'W-1', 'work'),
          ],
        }),
      ]);

      const [productNode] = sourcePlan.products;
      expect(productNode.identityKeys).toEqual([`gtin13:${ISBN_A}`]);
      expect(productNode.workIdentityAliases).toEqual([]);
      expect(sourcePlan.groups[0].workDoi).toEqual({ kind: 'NONE' });
      expect(sourcePlan.warnings.filter(({ code }) => code === 'onix.identifier.unrepresentable')).toHaveLength(4);
    });
  });

  describe('duplicate Product assertions', () => {
    it('collapses identical complete records of one ISBN into one Product, keeping every record and warning once', () => {
      const sourcePlan = plan([
        product({ ref: 'first', identifiers: [pid('15', ISBN_A)] }),
        product({ ref: 'unrelated', identifiers: [pid('15', ISBN_B)] }),
        product({ ref: 'second', identifiers: [pid('15', ISBN_A)] }),
      ]);

      expect(sourcePlan.products).toHaveLength(2);
      const collapsed = sourcePlan.products.find(({ identityKeys }) => identityKeys.includes(`gtin13:${ISBN_A}`));
      expect(collapsed).toMatchObject({
        duplicate: 'COLLAPSED',
        recordKeys: ['record:1', 'record:3'],
        representativeRecordKey: 'record:1',
      });
      expect(sourcePlan.records[2].productKey).toBe(collapsed?.productKey);
      expect(sourcePlan.blockers).toEqual([]);
      expect(sourcePlan.warnings.filter(({ code }) => code === 'onix.record.duplicate_collapsed')).toEqual([
        expect.objectContaining({ message: expect.stringContaining('product 1 (first), product 3 (second)') }),
      ]);
      expect(sourcePlan.groups).toHaveLength(2);
    });

    it('blocks conflicting records of one ISBN as one Product-record conflict, never as two Works', () => {
      const sourcePlan = plan([
        product({ ref: 'paperback', identifiers: [pid('15', ISBN_A)] }),
        product({
          ref: 'hardback',
          identifiers: [pid('15', ISBN_A)],
          descriptive:
            '<DescriptiveDetail><ProductComposition>00</ProductComposition><ProductForm>BB</ProductForm></DescriptiveDetail>',
        }),
      ]);

      expect(sourcePlan.products).toHaveLength(1);
      expect(sourcePlan.groups).toHaveLength(1);
      expect(sourcePlan.products[0].duplicate).toBe('CONFLICT');
      expect(sourcePlan.blockers).toEqual([
        expect.objectContaining({
          code: 'PRODUCT_RECORD_CONFLICT',
          classification: 'SOURCE_CONFLICT',
          productKey: sourcePlan.products[0].productKey,
          paths: ['/ONIXMessage[1]/Product[1]', '/ONIXMessage[1]/Product[2]'],
          detail: { recordKeys: ['record:1', 'record:2'] },
        }),
      ]);
    });

    it('collapses a record the file repeats under one RecordReference, and blocks two different ones under it', () => {
      const repeated = plan([product({ ref: 'same' }), product({ ref: 'same' })]);
      const contradictory = plan([
        product({ ref: 'same', identifiers: [pid('15', ISBN_A)] }),
        product({ ref: 'same', identifiers: [pid('15', ISBN_B)] }),
      ]);

      expect(repeated.products.map(({ duplicate }) => duplicate)).toEqual(['COLLAPSED']);
      expect(repeated.blockers).toEqual([]);
      expect(contradictory.products.map(({ duplicate }) => duplicate)).toEqual(['CONFLICT']);
      expect(blockerCodes(contradictory)).toEqual(['PRODUCT_RECORD_CONFLICT']);
    });

    it('does not read a shared Product DOI, LCCN, OCLC or proprietary id as one Product', () => {
      const shared = [
        pid('06', '10.1234/work'),
        pid('13', '2019012345'),
        pid('23', '1086123456'),
        pid('01', 'W-1', 'work'),
      ];
      const sourcePlan = plan([
        product({ ref: 'pdf', identifiers: [pid('15', ISBN_A), ...shared] }),
        product({ ref: 'epub', identifiers: [pid('15', ISBN_B), ...shared] }),
      ]);

      expect(sourcePlan.products.map(({ duplicate }) => duplicate)).toEqual(['SINGLE', 'SINGLE']);
      expect(sourcePlan.blockers).toEqual([]);
    });

    it('joins an ISBN-13 and the ISBN-10 of the same book as one Product', () => {
      const sourcePlan = plan([
        product({ ref: 'modern', identifiers: [pid('15', ISBN_A)] }),
        product({ ref: 'legacy', identifiers: [pid('02', ISBN_A10), pid('15', ISBN_A)] }),
      ]);

      expect(sourcePlan.products).toHaveLength(1);
      expect(sourcePlan.products[0].duplicate).toBe('CONFLICT');
    });
  });

  describe('Product -> Work grouping', () => {
    const workId = (type: string, value: string, name?: string) =>
      `<WorkIdentifier><WorkIDType>${type}</WorkIDType>${name ? `<IDTypeName>${name}</IDTypeName>` : ''}<IDValue>${value}</IDValue></WorkIdentifier>`;
    const relatedWork = (code: string, ...identifiers: string[]) =>
      `<RelatedWork><WorkRelationCode>${code}</WorkRelationCode>${identifiers.join('')}</RelatedWork>`;
    const relatedProduct = (code: string, ...identifiers: string[]) =>
      `<RelatedProduct><ProductRelationCode>${code}</ProductRelationCode>${identifiers.join('')}</RelatedProduct>`;

    /** Group memberships as sets of RecordReferences, independent of any key or order. */
    const memberships = (sourcePlan: OnixSourcePlan) =>
      sourcePlan.groups
        .map((group) =>
          group.productKeys
            .flatMap((productKey) => sourcePlan.records.filter((record) => record.productKey === productKey))
            .map(({ recordReference }) => recordReference)
            .sort()
            .join('+'),
        )
        .sort();

    it('groups Products manifesting the same Work through RelatedWork 01', () => {
      const shared = relatedWork('01', workId('01', 'W-1', 'Publisher work id'));
      const sourcePlan = plan([
        product({ ref: 'pb', identifiers: [pid('15', ISBN_A)], related: shared }),
        product({ ref: 'pdf', identifiers: [pid('15', ISBN_B)], related: shared }),
      ]);

      expect(memberships(sourcePlan)).toEqual(['pb+pdf']);
      expect(sourcePlan.groups[0].edges).toEqual([
        expect.objectContaining({ kind: 'WORK_IDENTITY', key: 'work:01:Publisher work id:W-1' }),
      ]);
      expect(sourcePlan.groups[0].aliases.map(({ relation, path }) => [relation, path])).toEqual([
        ['01', '/ONIXMessage[1]/Product[1]/RelatedMaterial[1]/RelatedWork[1]/WorkIdentifier[1]'],
        ['01', '/ONIXMessage[1]/Product[2]/RelatedMaterial[1]/RelatedWork[1]/WorkIdentifier[1]'],
      ]);
    });

    it('groups through RelatedWork 06 (manifestation of the original work) as well', () => {
      const shared = relatedWork('06', workId('06', '10.1234/work'));
      const sourcePlan = plan([
        product({ ref: 'pb', identifiers: [pid('15', ISBN_A)], related: shared }),
        product({ ref: 'pdf', identifiers: [pid('15', ISBN_B)], related: shared }),
      ]);

      expect(memberships(sourcePlan)).toEqual(['pb+pdf']);
      expect(sourcePlan.groups[0].workDoi).toEqual({
        kind: 'DOI',
        doi: 'https://doi.org/10.1234/work',
        basis: 'WORK_IDENTIFIER',
      });
    });

    it('unions every alias one RelatedWork composite asserts for the same Work', () => {
      const sourcePlan = plan([
        product({
          ref: 'a',
          identifiers: [pid('15', ISBN_A)],
          related: relatedWork('01', workId('06', '10.1234/work'), workId('01', 'W-1', 'id')),
        }),
        product({ ref: 'b', identifiers: [pid('15', ISBN_B)], related: relatedWork('01', workId('01', 'W-1', 'id')) }),
        product({
          ref: 'c',
          identifiers: [pid('15', ISBN_C)],
          related: relatedWork('01', workId('06', 'https://doi.org/10.1234/WORK')),
        }),
      ]);

      expect(memberships(sourcePlan)).toEqual(['a+b+c']);
    });

    it('groups through an exact one-sided RelatedProduct 06, without requiring the reciprocal', () => {
      const sourcePlan = plan([
        product({ ref: 'pb', identifiers: [pid('15', ISBN_A)], related: relatedProduct('06', pid('15', ISBN_B)) }),
        product({ ref: 'pdf', identifiers: [pid('15', ISBN_B)] }),
      ]);

      expect(memberships(sourcePlan)).toEqual(['pb+pdf']);
      const [paperback, pdf] = sourcePlan.products;
      expect(paperback.alternativeFormats[0].resolution).toEqual({ kind: 'IN_FILE', productKey: pdf.productKey });
      expect(sourcePlan.groups[0].edges).toEqual([
        {
          kind: 'ALTERNATIVE_FORMAT',
          from: paperback.productKey,
          to: pdf.productKey,
          path: '/ONIXMessage[1]/Product[1]/RelatedMaterial[1]/RelatedProduct[1]',
        },
      ]);
    });

    it('joins groups transitively through connected identity edges', () => {
      const sourcePlan = plan([
        product({ ref: 'a', identifiers: [pid('15', ISBN_A)], related: relatedProduct('06', pid('15', ISBN_B)) }),
        product({ ref: 'b', identifiers: [pid('15', ISBN_B)], related: relatedWork('01', workId('01', 'W-9', 'id')) }),
        product({ ref: 'c', identifiers: [pid('15', ISBN_C)], related: relatedWork('01', workId('01', 'W-9', 'id')) }),
      ]);

      expect(memberships(sourcePlan)).toEqual(['a+b+c']);
    });

    it('leaves a RelatedProduct 06 that matches nothing in the file unresolved, carrying its ISBN for target lookup', () => {
      const sourcePlan = plan([
        product({ ref: 'pb', related: relatedProduct('06', pid('15', ISBN_C), pid('03', ISBN_C)) }),
      ]);

      expect(sourcePlan.products[0].alternativeFormats[0].resolution).toEqual({ kind: 'EXTERNAL', isbns: [ISBN_C] });
      expect(sourcePlan.groups[0].externalIsbns).toEqual([ISBN_C]);
      expect(sourcePlan.blockers).toEqual([]);
    });

    it('blocks a RelatedProduct 06 whose endpoint matches more than one Product, and groups nothing through it', () => {
      const sharedSku = pid('01', 'SKU-7', 'Warehouse code');
      const sourcePlan = plan([
        product({ ref: 'a', identifiers: [pid('15', ISBN_A)], related: relatedProduct('06', sharedSku) }),
        product({ ref: 'b', identifiers: [pid('15', ISBN_B), sharedSku] }),
        product({ ref: 'c', identifiers: [pid('15', ISBN_C), sharedSku] }),
      ]);

      expect(memberships(sourcePlan)).toEqual(['a', 'b', 'c']);
      expect(sourcePlan.blockers).toEqual([
        expect.objectContaining({
          code: 'ALTERNATIVE_FORMAT_AMBIGUOUS',
          classification: 'SOURCE_CONFLICT',
          productKey: sourcePlan.products[0].productKey,
        }),
      ]);
    });

    it('ignores a RelatedProduct 06 that only names the Product itself', () => {
      const sourcePlan = plan([product({ ref: 'pb', related: relatedProduct('06', pid('15', ISBN_A)) })]);

      expect(sourcePlan.products[0].alternativeFormats[0].resolution).toEqual({ kind: 'SELF' });
      expect(sourcePlan.groups[0].edges).toEqual([]);
    });

    it.each([
      ['RelatedWork 02 (derived from)', relatedWork('02', workId('01', 'W-1', 'id'))],
      ['RelatedWork 98 (LRM workaround)', relatedWork('98', workId('01', 'W-1', 'id'))],
      ['RelatedProduct 01 (includes)', relatedProduct('01', pid('01', 'W-1', 'id'))],
      ['RelatedProduct 03 (replaces)', relatedProduct('03', pid('01', 'W-1', 'id'))],
      ['RelatedProduct 11 (other-language version)', relatedProduct('11', pid('01', 'W-1', 'id'))],
    ])('does not group through %s', (_label, related) => {
      const sourcePlan = plan([
        product({ ref: 'a', identifiers: [pid('15', ISBN_A), pid('01', 'W-1', 'id')], related }),
        product({ ref: 'b', identifiers: [pid('15', ISBN_B), pid('01', 'W-1', 'id')], related }),
      ]);

      expect(memberships(sourcePlan)).toEqual(['a', 'b']);
    });

    it('never groups Products merely because every descriptive fact and every non-identity identifier agrees', () => {
      const descriptive =
        '<DescriptiveDetail><ProductComposition>00</ProductComposition><ProductForm>BC</ProductForm>' +
        '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText>Same Title</TitleText><Subtitle>Same Subtitle</Subtitle></TitleElement></TitleDetail>' +
        '<Contributor><SequenceNumber>1</SequenceNumber><ContributorRole>A01</ContributorRole><PersonName>Ada Lovelace</PersonName></Contributor>' +
        '<EditionNumber>2</EditionNumber><Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language>' +
        '<Subject><SubjectSchemeIdentifier>93</SubjectSchemeIdentifier><SubjectCode>DSB</SubjectCode></Subject></DescriptiveDetail>';
      const publishing =
        '<PublishingDetail><Imprint><ImprintName>Same Imprint</ImprintName></Imprint><Publisher><PublishingRole>01</PublishingRole><PublisherName>Same Press</PublisherName></Publisher>' +
        '<PublishingDate><PublishingDateRole>01</PublishingDateRole><Date>20260101</Date></PublishingDate></PublishingDetail>';
      const sameIdentifiers = [pid('06', '10.1234/same'), pid('13', '2019012345'), pid('23', '1086123456')];
      const sourcePlan = plan([
        product({ ref: 'a', identifiers: [pid('15', ISBN_A), ...sameIdentifiers], descriptive, publishing }),
        product({ ref: 'b', identifiers: [pid('15', ISBN_B), ...sameIdentifiers], descriptive, publishing }),
      ]);

      expect(memberships(sourcePlan)).toEqual(['a', 'b']);
      expect(sourcePlan.groups.every(({ edges }) => edges.length === 0)).toBe(true);
    });

    it('builds the same groups, with the same keys, whatever order the file lists its Products in', () => {
      const products = [
        product({ ref: 'a', identifiers: [pid('15', ISBN_A)], related: relatedProduct('06', pid('15', ISBN_C)) }),
        product({ ref: 'b', identifiers: [pid('15', ISBN_B)] }),
        product({ ref: 'c', identifiers: [pid('15', ISBN_C)], related: relatedWork('01', workId('01', 'W-2', 'id')) }),
        product({
          ref: 'd',
          identifiers: [pid('15', '9781800000049')],
          related: relatedWork('01', workId('01', 'W-2', 'id')),
        }),
      ];
      const keyedMembership = (sourcePlan: OnixSourcePlan) =>
        Object.fromEntries(sourcePlan.groups.map(({ groupKey, productKeys }) => [groupKey, productKeys]));

      const forwards = plan(products);
      const backwards = plan([...products].reverse());
      const shuffled = plan([products[2], products[0], products[3], products[1]]);

      expect(memberships(forwards)).toEqual(['a+c+d', 'b']);
      expect(keyedMembership(backwards)).toEqual(keyedMembership(forwards));
      expect(keyedMembership(shuffled)).toEqual(keyedMembership(forwards));
    });

    it('blocks a Product that asserts two unrelated Works, and groups nothing through either', () => {
      const sourcePlan = plan([
        product({
          ref: 'a',
          identifiers: [pid('15', ISBN_A)],
          related: relatedWork('01', workId('01', 'W-1', 'id')) + relatedWork('01', workId('01', 'W-2', 'id')),
        }),
        product({ ref: 'b', identifiers: [pid('15', ISBN_B)], related: relatedWork('01', workId('01', 'W-1', 'id')) }),
      ]);

      expect(memberships(sourcePlan)).toEqual(['a', 'b']);
      expect(sourcePlan.blockers).toEqual([
        expect.objectContaining({
          code: 'MULTIPLE_WORK_IDENTITIES',
          classification: 'SOURCE_CONFLICT',
          productKey: sourcePlan.products[0].productKey,
        }),
      ]);
    });

    it('requires a decision rather than choosing between two distinct Work DOIs asserted for one Work', () => {
      const sourcePlan = plan([
        product({
          ref: 'a',
          identifiers: [pid('15', ISBN_A)],
          related: relatedWork('01', workId('01', 'W-1', 'id'), workId('06', '10.1234/one')),
        }),
        product({
          ref: 'b',
          identifiers: [pid('15', ISBN_B)],
          related: relatedWork('01', workId('01', 'W-1', 'id'), workId('06', '10.1234/two')),
        }),
      ]);

      expect(sourcePlan.groups[0].workDoi).toEqual({
        kind: 'CONFLICT',
        dois: ['https://doi.org/10.1234/one', 'https://doi.org/10.1234/two'],
      });
      expect(sourcePlan.blockers).toEqual([
        expect.objectContaining({
          code: 'WORK_DOI_CONFLICT',
          classification: 'TARGET_INPUT_REQUIRED',
          groupKey: sourcePlan.groups[0].groupKey,
        }),
      ]);
    });

    it('drops, and reports, a Work DOI Thoth cannot read as a DOI', () => {
      const sourcePlan = plan([product({ ref: 'a', related: relatedWork('01', workId('06', 'not-a-doi')) })]);

      expect(sourcePlan.groups[0].workDoi).toEqual({ kind: 'NONE' });
      expect(sourcePlan.warnings).toContainEqual(
        expect.objectContaining({
          code: 'onix.identifier.unusable_doi',
          message: expect.stringContaining('not-a-doi'),
        }),
      );
    });

    // thoth-app#219 Specification Amendment 2: only an approved Work DOI source populates Work.doi.
    it('takes the Work DOI from the approved Work-level identifier, never from the generic Product DOI beside it', () => {
      const sourcePlan = plan([
        product({
          ref: 'pdf',
          identifiers: [pid('15', ISBN_A), pid('06', '10.1234/work.pdf')],
          related: relatedWork('01', workId('06', '10.1234/work')),
        }),
      ]);

      expect(sourcePlan.groups[0].workDoi).toEqual({
        kind: 'DOI',
        doi: 'https://doi.org/10.1234/work',
        basis: 'WORK_IDENTIFIER',
      });
    });

    it('populates no Work DOI from a generic Product DOI alone', () => {
      const sourcePlan = plan([
        product({ ref: 'pdf', identifiers: [pid('15', ISBN_A), pid('06', '10.1234/work.pdf')] }),
      ]);

      expect(sourcePlan.groups).toEqual([
        expect.objectContaining({ compatibility: 'GENERIC', workDoi: { kind: 'NONE' } }),
      ]);
    });
  });

  describe('edition', () => {
    const descriptive = (edition: string) =>
      `<DescriptiveDetail><ProductComposition>00</ProductComposition><ProductForm>BC</ProductForm>${edition}</DescriptiveDetail>`;
    const sameWork =
      '<RelatedWork><WorkRelationCode>01</WorkRelationCode><WorkIdentifier><WorkIDType>01</WorkIDType><IDTypeName>id</IDTypeName><IDValue>W-1</IDValue></WorkIdentifier></RelatedWork>';
    const grouped = (first: string, second: string) =>
      plan([
        product({ ref: 'a', identifiers: [pid('15', ISBN_A)], descriptive: descriptive(first), related: sameWork }),
        product({ ref: 'b', identifiers: [pid('15', ISBN_B)], descriptive: descriptive(second), related: sameWork }),
      ]);

    it.each([
      ['2', { kind: 'VALID', value: 2 }],
      ['02', { kind: 'VALID', value: 2 }],
      ['+3', { kind: 'VALID', value: 3 }],
      ['2147483647', { kind: 'VALID', value: 2147483647 }],
      ['2nd', { kind: 'SOURCE_INVALID', raw: '2nd' }],
      ['2.5', { kind: 'SOURCE_INVALID', raw: '2.5' }],
      ['2x', { kind: 'SOURCE_INVALID', raw: '2x' }],
      ['', { kind: 'SOURCE_INVALID', raw: '' }],
      ['0', { kind: 'SOURCE_INVALID', raw: '0' }],
      ['-1', { kind: 'SOURCE_INVALID', raw: '-1' }],
      ['2147483648', { kind: 'TARGET_UNREPRESENTABLE', raw: '2147483648' }],
      ['99999999999999999999', { kind: 'TARGET_UNREPRESENTABLE', raw: '99999999999999999999' }],
    ])('reads EditionNumber %j strictly, with no truncation or fallback', (raw, expected) => {
      expect(normaliseEditionNumber(raw)).toEqual(expected);
    });

    it('reads a missing EditionNumber as absent, not as 1', () => {
      expect(normaliseEditionNumber(undefined)).toEqual({ kind: 'ABSENT' });
    });

    it('maps an explicit EditionNumber read from DescriptiveDetail, where ONIX puts it', () => {
      const sourcePlan = plan([
        product({ descriptive: descriptive('<EditionType>REV</EditionType><EditionNumber>2</EditionNumber>') }),
      ]);

      expect(sourcePlan.products[0].edition).toMatchObject({ number: { kind: 'VALID', value: 2 }, types: ['REV'] });
      expect(sourcePlan.groups[0].edition).toEqual({ kind: 'EXPLICIT', edition: 2 });
      expect(sourcePlan.blockers).toEqual([]);
    });

    it('normalises an omitted first edition to 1, disclosing the normalisation once', () => {
      const sourcePlan = plan([product({ descriptive: descriptive('') })]);

      expect(sourcePlan.groups[0].edition).toEqual({ kind: 'DEFAULT_FIRST_EDITION', edition: 1 });
      expect(sourcePlan.warnings.filter(({ code }) => code === 'onix.edition.normalised')).toHaveLength(1);
    });

    it('treats NoEdition as an omission with no contrary evidence', () => {
      const sourcePlan = plan([product({ descriptive: descriptive('<NoEdition/>') })]);

      expect(sourcePlan.products[0].edition.noEdition).toBe(true);
      expect(sourcePlan.groups[0].edition).toEqual({ kind: 'DEFAULT_FIRST_EDITION', edition: 1 });
    });

    it.each(['NED', 'REV', 'ENL'])(
      'never falls back to 1 for a %s edition without a number: the publisher must say',
      (type) => {
        const sourcePlan = plan([product({ descriptive: descriptive(`<EditionType>${type}</EditionType>`) })]);

        expect(sourcePlan.groups[0].edition).toEqual({ kind: 'INPUT_REQUIRED', evidence: [`EditionType ${type}`] });
        expect(sourcePlan.blockers).toEqual([
          expect.objectContaining({
            code: 'EDITION_INPUT_REQUIRED',
            classification: 'TARGET_INPUT_REQUIRED',
            groupKey: sourcePlan.groups[0].groupKey,
          }),
        ]);
      },
    );

    it('does not mine an EditionStatement for a number, and does not assume 1 while one stands unread', () => {
      const sourcePlan = plan([
        product({ descriptive: descriptive('<EditionStatement>Second edition, revised</EditionStatement>') }),
      ]);

      expect(sourcePlan.groups[0].edition).toEqual({
        kind: 'INPUT_REQUIRED',
        evidence: ['EditionStatement "Second edition, revised"'],
      });
    });

    it('keeps other edition types as distinct semantics, never as numbers', () => {
      const sourcePlan = plan([
        product({ descriptive: descriptive('<EditionType>ILL</EditionType><EditionType>SPE</EditionType>') }),
      ]);

      expect(sourcePlan.groups[0].edition).toEqual({ kind: 'DEFAULT_FIRST_EDITION', edition: 1 });
      expect(sourcePlan.warnings).toContainEqual(
        expect.objectContaining({ code: 'onix.edition.unrepresentable', message: expect.stringContaining('ILL, SPE') }),
      );
    });

    it('lets an explicit number on one grouped manifestation stand over another manifestation that omits it', () => {
      expect(grouped('', '<EditionNumber>2</EditionNumber>').groups[0].edition).toEqual({
        kind: 'EXPLICIT',
        edition: 2,
      });
    });

    it('blocks distinct explicit numbers across one grouped Work instead of choosing one', () => {
      const sourcePlan = grouped('<EditionNumber>2</EditionNumber>', '<EditionNumber>3</EditionNumber>');

      expect(sourcePlan.groups[0].edition).toEqual({
        kind: 'BLOCKED',
        reason: 'CONFLICTING_NUMBERS',
        values: ['2', '3'],
      });
      expect(blockerCodes(sourcePlan)).toEqual(['EDITION_CONFLICT']);
    });

    it('blocks a number that is not a positive integer, and one Thoth cannot store', () => {
      const invalid = plan([product({ descriptive: descriptive('<EditionNumber>2nd</EditionNumber>') })]);
      const tooLarge = plan([product({ descriptive: descriptive('<EditionNumber>2147483648</EditionNumber>') })]);

      expect(invalid.groups[0].edition).toEqual({ kind: 'BLOCKED', reason: 'SOURCE_INVALID', values: ['2nd'] });
      expect(blockerCodes(invalid)).toEqual(['EDITION_SOURCE_INVALID']);
      expect(tooLarge.groups[0].edition).toEqual({
        kind: 'BLOCKED',
        reason: 'TARGET_UNREPRESENTABLE',
        values: ['2147483648'],
      });
      expect(blockerCodes(tooLarge)).toEqual(['EDITION_UNREPRESENTABLE']);
    });

    it('blocks grouped manifestations whose explicit edition types or statements differ, but not an omission', () => {
      const types = grouped('<EditionType>ABR</EditionType>', '<EditionType>UBR</EditionType>');
      const statements = grouped(
        '<EditionStatement>Revised</EditionStatement><EditionNumber>2</EditionNumber>',
        '<EditionStatement>Illustrated</EditionStatement><EditionNumber>2</EditionNumber>',
      );
      const omission = grouped('<EditionType>REV</EditionType><EditionNumber>2</EditionNumber>', '');

      expect(types.groups[0].edition).toEqual({
        kind: 'BLOCKED',
        reason: 'CONFLICTING_EVIDENCE',
        values: ['ABR', 'UBR'],
      });
      expect(blockerCodes(types)).toEqual(['EDITION_EVIDENCE_CONFLICT']);
      expect(blockerCodes(statements)).toEqual(['EDITION_EVIDENCE_CONFLICT']);
      expect(omission.groups[0].edition).toEqual({ kind: 'EXPLICIT', edition: 2 });
    });

    it('round-trips Thoth ONIX edition export: omitted for 1, emitted above 1', () => {
      expect(plan([product({ descriptive: descriptive('') })]).groups[0].edition).toEqual({
        kind: 'DEFAULT_FIRST_EDITION',
        edition: 1,
      });
      expect(
        plan([product({ descriptive: descriptive('<EditionNumber>3</EditionNumber>') })]).groups[0].edition,
      ).toEqual({ kind: 'EXPLICIT', edition: 3 });
    });
  });

  describe('manifestation', () => {
    const { Azw3, Docx, Epub, FictionBook, Hardback, Html, Mobi, Mp3, Paperback, Pdf, Wav, Xml } = PublicationType.enum;
    const DIGITAL_TEXT = [Pdf, Epub, Html, Xml, Mobi, Azw3, Docx, FictionBook];
    const facts = (
      form: string | null,
      formDetails: string[] = [],
      composition: string | null = '00',
      hasProductParts = false,
    ) => ({
      composition,
      form,
      formDetails,
      hasProductParts,
    });
    const note = (code: string, detail: string | null = null) => ({ code, detail });

    it.each([
      ['BB', [], Hardback],
      ['BC', [], Paperback],
    ])('maps %s to its PublicationType losslessly', (form, details, type) => {
      expect(reduceManifestation(facts(form, details))).toEqual({
        kind: 'RESOLVED',
        type,
        classification: 'SUPPORTED_LOSSLESS',
        notes: [],
      });
    });

    it('keeps a binding detail Thoth cannot store as an explicit loss', () => {
      expect(reduceManifestation(facts('BC', ['B306']))).toEqual({
        kind: 'RESOLVED',
        type: Paperback,
        classification: 'SUPPORTED_NORMALIZED',
        notes: [note('DETAIL_NOT_REPRESENTED', 'B306')],
      });
    });

    it('does not choose paperback or hardback for BA (book, detail unspecified)', () => {
      expect(reduceManifestation(facts('BA'))).toEqual({
        kind: 'INPUT_REQUIRED',
        reason: 'BINDING_UNSPECIFIED',
        candidates: [Paperback, Hardback],
        notes: [],
      });
    });

    it.each(['BD', 'BE', 'BZ'])('does not coerce the other book form %s into paperback or hardback', (form) => {
      expect(reduceManifestation(facts(form))).toEqual({
        kind: 'UNREPRESENTABLE',
        reason: 'FORM_UNREPRESENTABLE',
        acknowledgementRequired: false,
        notes: [],
      });
    });

    it.each([
      ['E101', Epub],
      ['E104', Docx],
      ['E105', Html],
      ['E107', Pdf],
    ])('derives the file format of a digital Product from the format-defining detail %s', (detail, type) => {
      expect(reduceManifestation(facts('EB', [detail]))).toEqual({
        kind: 'RESOLVED',
        type,
        classification: 'SUPPORTED_NORMALIZED',
        notes: [note('DELIVERY_MODE_NOT_REPRESENTED', 'EB')],
      });
    });

    it.each([
      ['E108', Pdf, 'PDF_A_NOT_REPRESENTED'],
      ['E150', Epub, 'EPUB_A_NOT_REPRESENTED'],
    ])('maps %s with a warning that the conformance level is not represented', (detail, type, code) => {
      expect(reduceManifestation(facts('ED', [detail]))).toEqual({
        kind: 'RESOLVED',
        type,
        classification: 'SUPPORTED_NORMALIZED',
        notes: [note('DELIVERY_MODE_NOT_REPRESENTED', 'ED'), note(code, detail)],
      });
    });

    it('maps Mobipocket (E127) to MOBI', () => {
      expect(reduceManifestation(facts('EB', ['E127']))).toMatchObject({ kind: 'RESOLVED', type: Mobi });
    });

    it.each([
      ['E113', 'XHTML_HTML_OR_XML', [Html, Xml]],
      ['E116', 'KINDLE_FAMILY', [Mobi, Azw3]],
      ['E100', 'OTHER_EPUBLICATION_FORMAT', DIGITAL_TEXT],
    ])('asks the publisher rather than guessing for %s', (detail, reason, candidates) => {
      expect(reduceManifestation(facts('EB', [detail]))).toEqual({
        kind: 'INPUT_REQUIRED',
        reason,
        candidates,
        notes: [note('DELIVERY_MODE_NOT_REPRESENTED', 'EB')],
      });
    });

    it.each(['EA', 'EB', 'EC', 'ED'])(
      'never reads the delivery form %s itself as a file format, PDF least of all',
      (form) => {
        const decision = reduceManifestation(facts(form));

        expect(decision).toEqual({
          kind: 'INPUT_REQUIRED',
          reason: 'DIGITAL_FORMAT_UNSPECIFIED',
          candidates: DIGITAL_TEXT,
          notes: [note('DELIVERY_MODE_NOT_REPRESENTED', form)],
        });
      },
    );

    it.each(['E102', 'E103', 'E112', 'E141', 'E148'])(
      'keeps the unsupported format %s an explicit target loss',
      (detail) => {
        expect(reduceManifestation(facts('EB', [detail]))).toEqual({
          kind: 'UNREPRESENTABLE',
          reason: 'FORMAT_UNREPRESENTABLE',
          acknowledgementRequired: false,
          notes: [note('DELIVERY_MODE_NOT_REPRESENTED', 'EB'), note('UNSUPPORTED_FORMAT_DETAIL', detail)],
        });
      },
    );

    it('deduplicates format details that resolve to the same type, keeping each as a source fact', () => {
      expect(reduceManifestation(facts('EB', ['E107', 'E108']))).toEqual({
        kind: 'RESOLVED',
        type: Pdf,
        classification: 'SUPPORTED_NORMALIZED',
        notes: [note('DELIVERY_MODE_NOT_REPRESENTED', 'EB'), note('PDF_A_NOT_REPRESENTED', 'E108')],
      });
    });

    it('asks the publisher when format details resolve to different types, or sit beside an unsupported one', () => {
      expect(reduceManifestation(facts('EB', ['E101', 'E105']))).toMatchObject({
        kind: 'INPUT_REQUIRED',
        reason: 'MULTIPLE_FORMATS',
        candidates: [Epub, Html],
      });
      expect(reduceManifestation(facts('EB', ['E101', 'E102']))).toMatchObject({
        kind: 'INPUT_REQUIRED',
        reason: 'MULTIPLE_FORMATS',
        candidates: [Epub],
        notes: [note('DELIVERY_MODE_NOT_REPRESENTED', 'EB'), note('UNSUPPORTED_FORMAT_DETAIL', 'E102')],
      });
    });

    it('never mistakes a characteristic detail for the file format, nor a detail meant for another form', () => {
      expect(reduceManifestation(facts('EB', ['E200', 'E101']))).toMatchObject({
        kind: 'RESOLVED',
        type: Epub,
        notes: [note('DELIVERY_MODE_NOT_REPRESENTED', 'EB'), note('DETAIL_NOT_REPRESENTED', 'E200')],
      });
      expect(reduceManifestation(facts('BC', ['E107']))).toEqual({
        kind: 'RESOLVED',
        type: Paperback,
        classification: 'SUPPORTED_NORMALIZED',
        notes: [note('DETAIL_NOT_FOR_THIS_FORM', 'E107')],
      });
      expect(reduceManifestation(facts('EB', ['A103']))).toMatchObject({
        kind: 'INPUT_REQUIRED',
        reason: 'DIGITAL_FORMAT_UNSPECIFIED',
      });
    });

    it.each([
      ['AN', ['A103'], { kind: 'RESOLVED', type: Mp3 }],
      ['AJ', ['A104'], { kind: 'RESOLVED', type: Wav }],
      ['AJ', [], { kind: 'INPUT_REQUIRED', reason: 'AUDIO_FORMAT_UNSPECIFIED', candidates: [Mp3, Wav] }],
      ['AO', ['A105'], { kind: 'UNREPRESENTABLE', reason: 'FORMAT_UNREPRESENTABLE', acknowledgementRequired: false }],
      ['AJ', ['A103', 'A104'], { kind: 'INPUT_REQUIRED', reason: 'MULTIPLE_FORMATS', candidates: [Mp3, Wav] }],
    ])('reduces the downloadable/online audio form %s with details %j exactly', (form, details, expected) => {
      expect(reduceManifestation(facts(form, details))).toMatchObject(expected);
    });

    it.each(['AC', 'AZ', 'DA', 'PC', 'VA', 'XA', 'ZA'])(
      'keeps the valid form %s Thoth has no PublicationType for an explicit loss',
      (form) => {
        expect(reduceManifestation(facts(form))).toMatchObject({
          kind: 'UNREPRESENTABLE',
          reason: 'FORM_UNREPRESENTABLE',
          acknowledgementRequired: false,
        });
      },
    );

    it('never defaults ProductForm 00 (undefined) to any type', () => {
      expect(reduceManifestation(facts('00'))).toEqual({
        kind: 'UNREPRESENTABLE',
        reason: 'FORM_UNDEFINED',
        acknowledgementRequired: false,
        notes: [],
      });
    });

    it('discloses a single component that is not available separately', () => {
      expect(reduceManifestation(facts('BC', [], '01'))).toEqual({
        kind: 'RESOLVED',
        type: Paperback,
        classification: 'SUPPORTED_NORMALIZED',
        notes: [note('NOT_AVAILABLE_SEPARATELY', '01')],
      });
    });

    it.each([
      ['composition 10', facts('BC', [], '10')],
      ['composition 11', facts('BC', [], '11')],
      ['composition 20', facts('BC', [], '20')],
      ['composition 30', facts('BC', [], '30')],
      ['composition 31', facts('BC', [], '31')],
      ['multiple-component form SA', facts('SA', [], '10')],
      ['multiple-component form SG', facts('SG', [], '10')],
      ['ProductParts', facts('BC', [], '00', true)],
    ])(
      'never flattens a package (%s) into one Publication; its omission needs acknowledgement',
      (_label, packageFacts) => {
        expect(reduceManifestation(packageFacts)).toEqual({
          kind: 'UNREPRESENTABLE',
          reason: 'PACKAGE',
          acknowledgementRequired: true,
          notes: [],
        });
      },
    );

    it('reads every repeated ProductFormDetail and ProductPart from the Product', () => {
      const sourcePlan = plan([
        product({
          descriptive:
            '<DescriptiveDetail><ProductComposition>00</ProductComposition><ProductForm>EB</ProductForm><ProductFormDetail>E200</ProductFormDetail><ProductFormDetail>E101</ProductFormDetail></DescriptiveDetail>',
        }),
        product({
          ref: 'set',
          identifiers: [pid('15', ISBN_B)],
          descriptive:
            '<DescriptiveDetail><ProductComposition>10</ProductComposition><ProductForm>SA</ProductForm><ProductPart><ProductForm>BC</ProductForm><NumberOfCopies>2</NumberOfCopies></ProductPart></DescriptiveDetail>',
        }),
      ]);

      expect(sourcePlan.products[0].manifestationFacts).toEqual({
        composition: '00',
        form: 'EB',
        formDetails: ['E200', 'E101'],
        hasProductParts: false,
      });
      expect(sourcePlan.products[0].manifestation).toMatchObject({ kind: 'RESOLVED', type: Epub });
      expect(sourcePlan.products[1].manifestationFacts.hasProductParts).toBe(true);
      expect(sourcePlan.products[1].manifestation).toMatchObject({ kind: 'UNREPRESENTABLE', reason: 'PACKAGE' });
    });

    const withForm = (form: string, details = '', composition = '00') =>
      `<DescriptiveDetail><ProductComposition>${composition}</ProductComposition><ProductForm>${form}</ProductForm>${details}</DescriptiveDetail>`;

    it('discloses a normalised manifestation and an omitted one without blocking, and blocks what needs a decision', () => {
      const sourcePlan = plan([
        product({
          ref: 'pdfa',
          identifiers: [pid('15', ISBN_A)],
          descriptive: withForm('EB', '<ProductFormDetail>E108</ProductFormDetail>'),
        }),
        product({ ref: 'dvd', identifiers: [pid('15', ISBN_B)], descriptive: withForm('VI') }),
        product({
          ref: 'xhtml',
          identifiers: [pid('15', ISBN_C)],
          descriptive: withForm('EB', '<ProductFormDetail>E113</ProductFormDetail>'),
        }),
        product({ ref: 'box', identifiers: [pid('15', '9781800000049')], descriptive: withForm('SA', '', '10') }),
      ]);

      expect(
        sourcePlan.warnings.filter(({ code }) => code === 'onix.manifestation.normalised').map(({ source }) => source),
      ).toEqual([
        { kind: 'onix', productIndex: 1, recordReference: 'pdfa' },
        { kind: 'onix', productIndex: 1, recordReference: 'pdfa' },
        { kind: 'onix', productIndex: 3, recordReference: 'xhtml' },
      ]);
      expect(sourcePlan.warnings).toContainEqual(
        expect.objectContaining({
          code: 'onix.manifestation.omitted',
          source: { kind: 'onix', productIndex: 2, recordReference: 'dvd' },
        }),
      );
      expect(
        sourcePlan.blockers.map(({ code, classification, productKey, detail }) => ({
          code,
          classification,
          productKey,
          detail,
        })),
      ).toEqual([
        {
          code: 'MANIFESTATION_INPUT_REQUIRED',
          classification: 'TARGET_INPUT_REQUIRED',
          productKey: sourcePlan.products[2].productKey,
          detail: { reason: 'XHTML_HTML_OR_XML', candidates: [PublicationType.enum.Html, PublicationType.enum.Xml] },
        },
        {
          code: 'MANIFESTATION_ACKNOWLEDGEMENT_REQUIRED',
          classification: 'TARGET_UNREPRESENTABLE',
          productKey: sourcePlan.products[3].productKey,
          detail: { reason: 'PACKAGE' },
        },
      ]);
    });
  });

  describe('content items', () => {
    const withContent = (...items: string[]) =>
      `<DescriptiveDetail><ProductComposition>00</ProductComposition><ProductForm>BC</ProductForm></DescriptiveDetail><ContentDetail>${items.join('')}</ContentDetail>`;
    const textItem = (type: string) =>
      `<ContentItem><LevelSequenceNumber>1</LevelSequenceNumber><TextItem><TextItemType>${type}</TextItemType></TextItem></ContentItem>`;

    it.each(['02', '03', '04'])('classifies a TextItemType %s content item as a structural chapter', (type) => {
      const sourcePlan = plan([product({ descriptive: withContent(textItem(type)) })]);

      expect(sourcePlan.products[0].contentItems).toEqual([
        {
          kind: 'CHAPTER',
          textItemType: type,
          path: '/ONIXMessage[1]/Product[1]/ContentDetail[1]/ContentItem[1]',
          sourcePath: '/ONIXMessage[1]/Product[1]/ContentDetail[1]/ContentItem[1]',
        },
      ]);
      expect(sourcePlan.blockers).toEqual([]);
    });

    it.each([
      ['a complete embedded work (TextItemType 01)', textItem('01'), 'EMBEDDED_WORK', 'TARGET_INPUT_REQUIRED'],
      [
        'an audiovisual item',
        '<ContentItem><AVItem><AVItemType>01</AVItemType></AVItem></ContentItem>',
        'AV_ITEM',
        'TARGET_UNREPRESENTABLE',
      ],
    ])(
      'never turns %s into a chapter, and holds its Work until the component can be represented',
      (_label, item, kind, classification) => {
        const sourcePlan = plan([product({ descriptive: withContent(textItem('03'), item) })]);

        expect(sourcePlan.products[0].contentItems.map((fact) => fact.kind)).toEqual(['CHAPTER', kind]);
        expect(sourcePlan.blockers).toEqual([
          expect.objectContaining({
            code: 'COMPONENT_UNSUPPORTED',
            classification,
            productKey: sourcePlan.products[0].productKey,
            paths: ['/ONIXMessage[1]/Product[1]/ContentDetail[1]/ContentItem[2]'],
            detail: { kind },
          }),
        ]);
      },
    );
  });

  describe('Work-level compatibility families', () => {
    type FamilySpec = {
      descriptive?: string;
      collateral?: string;
      publishing?: string;
      related?: string;
      content?: string;
    };

    const asserting = ({
      descriptive = '',
      collateral = '',
      publishing = '',
      related = '',
      content = '',
    }: FamilySpec) =>
      `<Product><RecordReference>rec-1</RecordReference><NotificationType>03</NotificationType>${pid('15', ISBN_A)}` +
      `<DescriptiveDetail><ProductComposition>00</ProductComposition><ProductForm>BC</ProductForm>${descriptive}</DescriptiveDetail>` +
      (collateral ? `<CollateralDetail>${collateral}</CollateralDetail>` : '') +
      `<PublishingDetail><Imprint><ImprintName>Example Imprint</ImprintName></Imprint>${publishing}</PublishingDetail>` +
      (related ? `<RelatedMaterial>${related}</RelatedMaterial>` : '') +
      (content ? `<ContentDetail>${content}</ContentDetail>` : '') +
      `</Product>`;

    const assertions = (sourcePlan: OnixSourcePlan) =>
      sourcePlan.products[0].compatibilityAssertions.map(({ family, owner, ownerIssue, locations }) => ({
        family,
        owner,
        ownerIssue,
        paths: locations.map(({ path }) => path),
      }));
    const PRODUCT = '/ONIXMessage[1]/Product[1]';
    const DESC = `${PRODUCT}/DescriptiveDetail[1]`;
    const PUBLISHING = `${PRODUCT}/PublishingDetail[1]`;

    it('asserts no family for a record that states only its identity, its imprint and its form', () => {
      const sourcePlan = plan([asserting({})]);

      expect(sourcePlan.products[0].compatibilityAssertions).toEqual([]);
    });

    it.each([
      [
        'a title',
        {
          descriptive:
            '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleText>A Work</TitleText></TitleElement></TitleDetail>',
        },
        'TITLE',
        'APP-IMPORT-ONIX-DESC-01',
        '#183',
        `${DESC}/TitleDetail[1]`,
      ],
      [
        'a contributor',
        {
          descriptive:
            '<Contributor><ContributorRole>A01</ContributorRole><PersonName>A N Other</PersonName></Contributor>',
        },
        'CONTRIBUTORS',
        'APP-IMPORT-ONIX-DESC-01',
        '#183',
        `${DESC}/Contributor[1]`,
      ],
      [
        'a contributor statement',
        { descriptive: '<ContributorStatement>Edited by A N Other</ContributorStatement>' },
        'CONTRIBUTORS',
        'APP-IMPORT-ONIX-DESC-01',
        '#183',
        `${DESC}/ContributorStatement[1]`,
      ],
      [
        'an explicit absence of contributors',
        { descriptive: '<NoContributor/>' },
        'CONTRIBUTORS',
        'APP-IMPORT-ONIX-DESC-01',
        '#183',
        `${DESC}/NoContributor[1]`,
      ],
      [
        'a language',
        { descriptive: '<Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language>' },
        'LANGUAGES',
        'APP-IMPORT-ONIX-DESC-01',
        '#183',
        `${DESC}/Language[1]`,
      ],
      [
        'a subject',
        {
          descriptive:
            '<Subject><SubjectSchemeIdentifier>93</SubjectSchemeIdentifier><SubjectCode>JBSF1</SubjectCode></Subject>',
        },
        'SUBJECTS',
        'APP-IMPORT-ONIX-DESC-01',
        '#183',
        `${DESC}/Subject[1]`,
      ],
      [
        'a person as subject',
        { descriptive: '<NameAsSubject><PersonName>A N Other</PersonName></NameAsSubject>' },
        'SUBJECTS',
        'APP-IMPORT-ONIX-DESC-01',
        '#183',
        `${DESC}/NameAsSubject[1]`,
      ],
      [
        'a series',
        {
          descriptive:
            '<Collection><CollectionType>10</CollectionType><TitleDetail><TitleType>01</TitleType><TitleElement><TitleText>A Series</TitleText></TitleElement></TitleDetail></Collection>',
        },
        'SERIES',
        'APP-IMPORT-ONIX-DESC-01',
        '#183',
        `${DESC}/Collection[1]`,
      ],
      [
        'an explicit absence of a series',
        { descriptive: '<NoCollection/>' },
        'SERIES',
        'APP-IMPORT-ONIX-DESC-01',
        '#183',
        `${DESC}/NoCollection[1]`,
      ],
      [
        'an extent',
        {
          descriptive:
            '<Extent><ExtentType>11</ExtentType><ExtentValue>300</ExtentValue><ExtentUnit>03</ExtentUnit></Extent>',
        },
        'EXTENT',
        'APP-IMPORT-ONIX-DESC-01',
        '#183',
        `${DESC}/Extent[1]`,
      ],
      [
        'ancillary content',
        {
          descriptive:
            '<AncillaryContent><AncillaryContentType>09</AncillaryContentType><Number>12</Number></AncillaryContent>',
        },
        'ANCILLARY_CONTENT',
        'APP-IMPORT-ONIX-DESC-01',
        '#183',
        `${DESC}/AncillaryContent[1]`,
      ],
      [
        'an illustrations note',
        {
          descriptive:
            '<IllustrationsNote><IllustrationsNoteText>12 halftones</IllustrationsNoteText></IllustrationsNote>',
        },
        'ILLUSTRATIONS_NOTE',
        'APP-IMPORT-ONIX-DESC-01',
        '#183',
        `${DESC}/IllustrationsNote[1]`,
      ],
      [
        'a licence',
        {
          descriptive:
            '<EpubLicense><EpubLicenseName>CC BY 4.0</EpubLicenseName><EpubLicenseExpression><EpubLicenseExpressionType>02</EpubLicenseExpressionType><EpubLicenseExpressionLink>https://creativecommons.org/licenses/by/4.0/</EpubLicenseExpressionLink></EpubLicenseExpression></EpubLicense>',
        },
        'LICENCE',
        'APP-IMPORT-ONIX-PUB-01',
        '#184',
        `${DESC}/EpubLicense[1]`,
      ],
      [
        'technical protection alone',
        { descriptive: '<EpubTechnicalProtection>03</EpubTechnicalProtection>' },
        'LICENCE',
        'APP-IMPORT-ONIX-PUB-01',
        '#184',
        `${DESC}/EpubTechnicalProtection[1]`,
      ],
      [
        'a usage constraint alone',
        {
          descriptive:
            '<EpubUsageConstraint><EpubUsageType>02</EpubUsageType><EpubUsageStatus>03</EpubUsageStatus></EpubUsageConstraint>',
        },
        'LICENCE',
        'APP-IMPORT-ONIX-PUB-01',
        '#184',
        `${DESC}/EpubUsageConstraint[1]`,
      ],
      [
        'a publishing status',
        { publishing: '<PublishingStatus>04</PublishingStatus>' },
        'LIFECYCLE',
        'APP-IMPORT-ONIX-DESC-01',
        '#183',
        `${PUBLISHING}/PublishingStatus[1]`,
      ],
      [
        'a publishing status note',
        { publishing: '<PublishingStatusNote>Withdrawn at the author&#x2019;s request</PublishingStatusNote>' },
        'LIFECYCLE',
        'APP-IMPORT-ONIX-DESC-01',
        '#183',
        `${PUBLISHING}/PublishingStatusNote[1]`,
      ],
      [
        'a publishing date',
        {
          publishing:
            '<PublishingDate><PublishingDateRole>01</PublishingDateRole><Date dateformat="00">20260101</Date></PublishingDate>',
        },
        'LIFECYCLE',
        'APP-IMPORT-ONIX-DESC-01',
        '#183',
        `${PUBLISHING}/PublishingDate[1]`,
      ],
      [
        'a copyright statement',
        {
          publishing:
            '<CopyrightStatement><CopyrightOwner><PersonName>A N Other</PersonName></CopyrightOwner></CopyrightStatement>',
        },
        'COPYRIGHT',
        'APP-IMPORT-ONIX-DESC-01',
        '#183',
        `${PUBLISHING}/CopyrightStatement[1]`,
      ],
      [
        'a funder',
        {
          publishing:
            '<Publisher><PublishingRole>16</PublishingRole><PublisherName>A Funder</PublisherName></Publisher>',
        },
        'FUNDING',
        'APP-IMPORT-ONIX-DESC-01',
        '#183',
        `${PUBLISHING}/Publisher[1]`,
      ],
      [
        'a funding composite',
        {
          publishing:
            '<Publisher><PublishingRole>01</PublishingRole><PublisherName>Example Press</PublisherName><Funding><FundingIdentifier><FundingIDType>01</FundingIDType><IDTypeName>grantnumber</IDTypeName><IDValue>G-1</IDValue></FundingIdentifier></Funding></Publisher>',
        },
        'FUNDING',
        'APP-IMPORT-ONIX-DESC-01',
        '#183',
        `${PUBLISHING}/Publisher[1]/Funding[1]`,
      ],
      [
        "a Work's landing page",
        {
          publishing:
            '<Publisher><PublishingRole>01</PublishingRole><PublisherName>Example Press</PublisherName><Website><WebsiteRole>02</WebsiteRole><WebsiteLink>https://example.press/work</WebsiteLink></Website></Publisher>',
        },
        'LANDING_PAGE',
        'APP-IMPORT-ONIX-DESC-01',
        '#183',
        `${PUBLISHING}/Publisher[1]/Website[1]`,
      ],
      [
        'a city of publication',
        { publishing: '<CityOfPublication>Cambridge</CityOfPublication>' },
        'PLACE',
        'APP-IMPORT-ONIX-DESC-01',
        '#183',
        `${PUBLISHING}/CityOfPublication[1]`,
      ],
      [
        'collateral text',
        {
          collateral:
            '<TextContent><TextType>03</TextType><ContentAudience>00</ContentAudience><Text>An abstract</Text></TextContent>',
        },
        'COLLATERAL',
        'APP-IMPORT-ONIX-REL-01',
        '#185',
        `${PRODUCT}/CollateralDetail[1]/TextContent[1]`,
      ],
      [
        'a supporting resource',
        {
          collateral:
            '<SupportingResource><ResourceContentType>01</ResourceContentType><ContentAudience>00</ContentAudience><ResourceMode>03</ResourceMode></SupportingResource>',
        },
        'COLLATERAL',
        'APP-IMPORT-ONIX-REL-01',
        '#185',
        `${PRODUCT}/CollateralDetail[1]/SupportingResource[1]`,
      ],
      [
        'a bibliographic reference',
        {
          related: `<RelatedProduct><ProductRelationCode>34</ProductRelationCode>${pid('15', ISBN_B)}</RelatedProduct>`,
        },
        'REFERENCES',
        'APP-IMPORT-ONIX-REL-01',
        '#185',
        `${PRODUCT}/RelatedMaterial[1]/RelatedProduct[1]`,
      ],
      [
        'a component',
        {
          content:
            '<ContentItem><LevelSequenceNumber>1</LevelSequenceNumber><TextItem><TextItemType>03</TextItemType></TextItem></ContentItem>',
        },
        'COMPONENTS',
        'APP-IMPORT-ONIX-REL-01',
        '#185',
        `${PRODUCT}/ContentDetail[1]/ContentItem[1]`,
      ],
    ])(
      'records %s as an unreduced Work-level family, with its owner and its exact source path',
      (_label, spec: FamilySpec, family, owner, ownerIssue, path) => {
        const sourcePlan = plan([asserting(spec)]);

        expect(assertions(sourcePlan)).toEqual([{ family, owner, ownerIssue, paths: [path] }]);
      },
    );

    it('reads presence only: a family with no value in it is still asserted, and no value is carried', () => {
      const sourcePlan = plan([asserting({ descriptive: '<Extent/>' })]);

      expect(assertions(sourcePlan)).toEqual([
        {
          family: 'EXTENT',
          owner: 'APP-IMPORT-ONIX-DESC-01',
          ownerIssue: '#183',
          paths: [`${DESC}/Extent[1]`],
        },
      ]);
      expect(JSON.stringify(sourcePlan.products[0].compatibilityAssertions)).not.toContain('300');
    });

    it('owns every Product-rights structure as one licence family, by presence only, never by what it says (#211)', () => {
      const sourcePlan = plan([
        asserting({
          descriptive:
            '<EpubTechnicalProtection>00</EpubTechnicalProtection><EpubTechnicalProtection>03</EpubTechnicalProtection>' +
            '<EpubUsageConstraint><EpubUsageType>11</EpubUsageType><EpubUsageStatus>03</EpubUsageStatus></EpubUsageConstraint>' +
            '<EpubLicense><EpubLicenseName>An agreement</EpubLicenseName></EpubLicense>',
        }),
      ]);

      expect(assertions(sourcePlan)).toEqual([
        {
          family: 'LICENCE',
          owner: 'APP-IMPORT-ONIX-PUB-01',
          ownerIssue: '#184',
          paths: [
            `${DESC}/EpubTechnicalProtection[1]`,
            `${DESC}/EpubTechnicalProtection[2]`,
            `${DESC}/EpubUsageConstraint[1]`,
            `${DESC}/EpubLicense[1]`,
          ],
        },
      ]);
      // Presence is all the source planner reads: no code, status or licence name is carried, let alone decided.
      expect(JSON.stringify(sourcePlan.products[0].compatibilityAssertions)).not.toMatch(/"0[03]"|agreement|"11"/);
    });

    it('collects every occurrence of one family, in source order', () => {
      const sourcePlan = plan([
        asserting({
          descriptive:
            '<Contributor><ContributorRole>A01</ContributorRole><PersonName>First</PersonName></Contributor>' +
            '<Contributor><ContributorRole>B01</ContributorRole><PersonName>Second</PersonName></Contributor>' +
            '<ContributorStatement>First and Second</ContributorStatement>',
        }),
      ]);

      expect(assertions(sourcePlan)).toEqual([
        {
          family: 'CONTRIBUTORS',
          owner: 'APP-IMPORT-ONIX-DESC-01',
          ownerIssue: '#183',
          paths: [`${DESC}/Contributor[1]`, `${DESC}/Contributor[2]`, `${DESC}/ContributorStatement[1]`],
        },
      ]);
    });

    it.each(['14', '15', '16'])('treats a PublishingRole %s publisher as a funding assertion', (role) => {
      const sourcePlan = plan([
        asserting({
          publishing: `<Publisher><PublishingRole>${role}</PublishingRole><PublisherName>A Funder</PublisherName></Publisher>`,
        }),
      ]);

      expect(assertions(sourcePlan).map(({ family, paths }) => [family, paths])).toEqual([
        ['FUNDING', [`${PUBLISHING}/Publisher[1]`]],
      ]);
    });

    it.each([
      [
        'the publishing publisher itself',
        '<Publisher><PublishingRole>01</PublishingRole><PublisherName>Example Press</PublisherName></Publisher>',
      ],
      [
        "a publisher's own website that is not the Work's landing page",
        '<Publisher><PublishingRole>01</PublishingRole><Website><WebsiteRole>01</WebsiteRole><WebsiteLink>https://example.press</WebsiteLink></Website></Publisher>',
      ],
    ])('leaves %s to this task, which already decides publisher and imprint authorization', (_label, publishing) => {
      const sourcePlan = plan([asserting({ publishing })]);

      expect(sourcePlan.products[0].compatibilityAssertions).toEqual([]);
    });

    it('leaves the identity relations this task owns out of the unreduced families', () => {
      const sourcePlan = plan([
        asserting({
          related:
            `<RelatedProduct><ProductRelationCode>06</ProductRelationCode>${pid('15', ISBN_B)}</RelatedProduct>` +
            `<RelatedWork><WorkRelationCode>01</WorkRelationCode><WorkIdentifier><WorkIDType>06</WorkIDType><IDValue>10.1234/work</IDValue></WorkIdentifier></RelatedWork>`,
        }),
      ]);

      expect(sourcePlan.products[0].compatibilityAssertions).toEqual([]);
    });

    it("attributes the message's default language of text to every Product that the Header covers", () => {
      const sourcePlan = plan(
        [asserting({}), asserting({}).replace('rec-1', 'rec-2').replace(ISBN_A, ISBN_B)],
        `<Header><Sender><SenderName>Example Press</SenderName></Sender><SentDateTime>20260913T1200</SentDateTime><DefaultLanguageOfText>eng</DefaultLanguageOfText></Header>`,
      );

      expect(sourcePlan.products.map(({ compatibilityAssertions }) => compatibilityAssertions)).toEqual([
        [
          {
            family: 'LANGUAGES',
            owner: 'APP-IMPORT-ONIX-DESC-01',
            ownerIssue: '#183',
            locations: [
              {
                path: '/ONIXMessage[1]/Header[1]/DefaultLanguageOfText[1]',
                sourcePath: '/ONIXMessage[1]/Header[1]/DefaultLanguageOfText[1]',
              },
            ],
          },
        ],
        [
          {
            family: 'LANGUAGES',
            owner: 'APP-IMPORT-ONIX-DESC-01',
            ownerIssue: '#183',
            locations: [
              {
                path: '/ONIXMessage[1]/Header[1]/DefaultLanguageOfText[1]',
                sourcePath: '/ONIXMessage[1]/Header[1]/DefaultLanguageOfText[1]',
              },
            ],
          },
        ],
      ]);
    });

    it('carries each family back to the submitted source, not only to the canonical path', () => {
      const provenance: ProvenanceResolver = {
        sourcePathOf: (path) =>
          path.replace('/DescriptiveDetail[1]/TitleDetail[1]', '/descriptivedetail[1]/titledetail[1]'),
        sourceTagOf: () => 'titledetail',
      };
      const sourcePlan = plan(
        [
          asserting({
            descriptive:
              '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleText>A Work</TitleText></TitleElement></TitleDetail>',
          }),
        ],
        undefined,
        provenance,
      );

      expect(sourcePlan.products[0].compatibilityAssertions).toEqual([
        {
          family: 'TITLE',
          owner: 'APP-IMPORT-ONIX-DESC-01',
          ownerIssue: '#183',
          locations: [
            {
              path: `${DESC}/TitleDetail[1]`,
              sourcePath: `${PRODUCT}/descriptivedetail[1]/titledetail[1]`,
            },
          ],
        },
      ]);
    });
  });

  describe('ProductSupply presence (thoth-app#215)', () => {
    const SUPPLY =
      '<ProductSupply><SupplyDetail><Supplier><SupplierRole>01</SupplierRole><SupplierName>A Supplier</SupplierName></Supplier>' +
      '<ProductAvailability>20</ProductAvailability><Price><PriceType>02</PriceType><PriceAmount>300.00</PriceAmount><CurrencyCode>GBP</CurrencyCode></Price></SupplyDetail></ProductSupply>';

    it('records where each Product states ProductSupply, reading nothing it says, which the commercial reduction alone decides', () => {
      const provenance: ProvenanceResolver = {
        sourcePathOf: (path) => path.replace('/ProductSupply[', '/productsupply['),
        sourceTagOf: () => 'productsupply',
      };
      const sourcePlan = plan(
        [
          product().replace('</Product>', `${SUPPLY}${SUPPLY}</Product>`),
          product({ ref: 'rec-2', identifiers: [pid('15', ISBN_B)] }),
        ],
        undefined,
        provenance,
      );

      expect(sourcePlan.products.map(({ supplyLocations }) => supplyLocations)).toEqual([
        [1, 2].map((position) => ({
          path: `/ONIXMessage[1]/Product[1]/ProductSupply[${position}]`,
          sourcePath: `/ONIXMessage[1]/Product[1]/productsupply[${position}]`,
        })),
        [],
      ]);
      expect(JSON.stringify(sourcePlan)).not.toContain('300');
    });
  });

  describe('Thoth ONIX compatibility profile (structure)', () => {
    const WORK = 'urn:uuid:11111111-2222-4333-8444-555555555555';
    const PUB_A = 'urn:uuid:aaaaaaaa-0000-4000-8000-000000000001';
    const PUB_B = 'urn:uuid:aaaaaaaa-0000-4000-8000-000000000002';
    const PUB_C = 'urn:uuid:aaaaaaaa-0000-4000-8000-000000000003';
    const THOTH_HEADER = headerXml('<SenderName>Thoth</SenderName><EmailAddress>distribution@thoth.pub</EmailAddress>');
    const ebook = (detail: string) =>
      `<DescriptiveDetail><ProductComposition>00</ProductComposition><ProductForm>EB</ProductForm><ProductFormDetail>${detail}</ProductFormDetail></DescriptiveDetail>`;

    type ThothSpec = {
      publication?: string;
      work?: string;
      ref?: string;
      isbn?: string;
      detail?: string;
      notification?: string;
      workDoi?: string;
      lccn?: string;
      related?: string;
      extra?: string[];
    };

    /** A Product exactly as Thoth's canonical ONIX 3.0 exporter writes one Publication of a Work. */
    const thothProduct = ({
      publication = PUB_A,
      work = WORK,
      ref = publication,
      isbn,
      detail = 'E107',
      notification = '03',
      workDoi = 'https://doi.org/10.11647/OBP.0001',
      lccn = '2019012345',
      related = '',
      extra = [],
    }: ThothSpec = {}) =>
      product({
        ref,
        notification,
        envelope: '<RecordSourceType>01</RecordSourceType>',
        identifiers: [
          pid('01', work, 'thoth-work-id'),
          pid('01', publication, 'thoth-publication-id'),
          ...(isbn ? [pid('15', isbn), pid('03', isbn)] : []),
          pid('06', workDoi),
          pid('13', lccn),
          pid('23', '1086123456'),
          pid('01', 'OBP.0001', 'internal-reference'),
          ...extra,
        ],
        descriptive: ebook(detail),
        related,
      });

    const canonicalExport = (header = THOTH_HEADER) =>
      plan(
        [
          thothProduct({
            publication: PUB_A,
            isbn: ISBN_A,
            detail: 'E107',
            related: `<RelatedProduct><ProductRelationCode>06</ProductRelationCode>${pid('15', ISBN_B)}${pid('03', ISBN_B)}</RelatedProduct>`,
          }),
          thothProduct({
            publication: PUB_B,
            isbn: ISBN_B,
            detail: 'E101',
            related: `<RelatedProduct><ProductRelationCode>06</ProductRelationCode>${pid('15', ISBN_A)}${pid('03', ISBN_A)}</RelatedProduct>`,
          }),
          thothProduct({ publication: PUB_C, detail: 'E105' }),
        ],
        header,
      );

    it('decodes the canonical profile: one Work group per thoth-work-id, publication ids as Product identity, agreed Work fields', () => {
      const sourcePlan = canonicalExport();

      expect(sourcePlan.compatibility).toEqual({
        version: 'thoth-onix-3-canonical-v1',
        headerMatches: true,
        ignoredNativeRecordKeys: [],
      });
      expect(sourcePlan.records.map(({ thoth }) => thoth)).toEqual([
        {
          kind: 'NATIVE',
          workId: '11111111-2222-4333-8444-555555555555',
          publicationId: 'aaaaaaaa-0000-4000-8000-000000000001',
        },
        {
          kind: 'NATIVE',
          workId: '11111111-2222-4333-8444-555555555555',
          publicationId: 'aaaaaaaa-0000-4000-8000-000000000002',
        },
        {
          kind: 'NATIVE',
          workId: '11111111-2222-4333-8444-555555555555',
          publicationId: 'aaaaaaaa-0000-4000-8000-000000000003',
        },
      ]);
      expect(sourcePlan.groups).toHaveLength(1);
      expect(sourcePlan.groups[0]).toMatchObject({
        compatibility: 'THOTH_PROFILE',
        thothWorkId: '11111111-2222-4333-8444-555555555555',
        workDoi: { kind: 'DOI', doi: 'https://doi.org/10.11647/OBP.0001', basis: 'THOTH_PROFILE' },
        thothWorkFields: { lccn: '2019012345', oclc: '1086123456', reference: 'OBP.0001' },
      });
      expect(sourcePlan.products.find(({ isbn }) => isbn.kind === 'NONE')?.identityKeys).toEqual([
        'thothpub:aaaaaaaa-0000-4000-8000-000000000003',
      ]);
      expect(sourcePlan.blockers).toEqual([]);
      expect(sourcePlan.warnings.filter(({ code }) => code === 'onix.identifier.unrepresentable')).toEqual([]);
    });

    it.each([
      ['SenderName alone', headerXml('<SenderName>Thoth</SenderName>')],
      [
        'a different sender email',
        headerXml('<SenderName>Thoth</SenderName><EmailAddress>onix@example.org</EmailAddress>'),
      ],
    ])('never activates the profile from %s: native ids stay generic proprietary identifiers', (_label, header) => {
      const sourcePlan = canonicalExport(header);

      expect(sourcePlan.compatibility.headerMatches).toBe(false);
      expect(sourcePlan.compatibility.ignoredNativeRecordKeys).toEqual(['record:1', 'record:2', 'record:3']);
      expect(sourcePlan.records.every(({ thoth }) => thoth.kind === 'NONE')).toBe(true);
      expect(sourcePlan.groups.map(({ compatibility, workDoi }) => [compatibility, workDoi.kind])).toEqual([
        ['GENERIC', 'NONE'],
        ['GENERIC', 'NONE'],
      ]);
      expect(sourcePlan.warnings).toContainEqual(expect.objectContaining({ code: 'onix.compatibility.not_applied' }));
    });

    it.each([
      [
        'a malformed native id',
        { publication: 'aaaaaaaa-0000-4000-8000-000000000001', ref: PUB_A },
        ['PUBLICATION_ID_NOT_UUID_URN', 'RECORD_REFERENCE_MISMATCH'],
      ],
      ['a RecordReference that is not the publication id', { ref: PUB_B }, ['RECORD_REFERENCE_MISMATCH']],
      ['a missing thoth-work-id', { work: '' }, ['WORK_ID_MISSING']],
      [
        'a repeated thoth-publication-id',
        { extra: [pid('01', PUB_A, 'thoth-publication-id')] },
        ['PUBLICATION_ID_REPEATED'],
      ],
      ['a non-03 notification', { notification: '02' }, ['NOTIFICATION_TYPE']],
    ])('blocks %s as mismatched provenance instead of falling back to generic mapping', (_label, spec, reasons) => {
      const sourcePlan = plan([thothProduct({ isbn: ISBN_A, ...spec })], THOTH_HEADER);

      expect(sourcePlan.records[0].thoth).toEqual({ kind: 'INCONSISTENT', reasons });
      expect(sourcePlan.blockers).toEqual([
        expect.objectContaining({
          code: 'THOTH_PROFILE_INCONSISTENT',
          classification: 'SOURCE_CONFLICT',
          detail: { reasons },
        }),
      ]);
    });

    it('never lets one thoth-publication-id stand under two thoth-work-ids', () => {
      const sourcePlan = plan(
        [
          thothProduct({ publication: PUB_A, isbn: ISBN_A }),
          thothProduct({ publication: PUB_A, work: 'urn:uuid:99999999-2222-4333-8444-555555555555', isbn: ISBN_A }),
        ],
        THOTH_HEADER,
      );

      expect(sourcePlan.products).toHaveLength(1);
      expect(blockerCodes(sourcePlan)).toEqual(['PRODUCT_RECORD_CONFLICT']);
    });

    it('blocks Work fields the exporter repeats when the grouped Products disagree, never picking one manifestation', () => {
      const sourcePlan = plan(
        [
          thothProduct({ publication: PUB_A, isbn: ISBN_A }),
          thothProduct({ publication: PUB_B, isbn: ISBN_B, lccn: '2020000001' }),
        ],
        THOTH_HEADER,
      );

      expect(sourcePlan.groups).toHaveLength(1);
      expect(sourcePlan.groups[0].thothWorkFields).toBeNull();
      expect(sourcePlan.blockers).toEqual([
        expect.objectContaining({
          code: 'THOTH_WORK_FIELD_CONFLICT',
          classification: 'SOURCE_CONFLICT',
          detail: { field: 'lccn', values: ['2019012345', '2020000001'] },
        }),
      ]);
    });

    it('blocks two thoth-work-ids joined into one group by an alternative-format edge', () => {
      const sourcePlan = plan(
        [
          thothProduct({
            publication: PUB_A,
            isbn: ISBN_A,
            related: `<RelatedProduct><ProductRelationCode>06</ProductRelationCode>${pid('15', ISBN_B)}</RelatedProduct>`,
          }),
          thothProduct({ publication: PUB_B, isbn: ISBN_B, work: 'urn:uuid:99999999-2222-4333-8444-555555555555' }),
        ],
        THOTH_HEADER,
      );

      expect(sourcePlan.groups).toHaveLength(1);
      expect(blockerCodes(sourcePlan)).toEqual(['THOTH_WORK_ID_CONFLICT']);
    });
  });
});
