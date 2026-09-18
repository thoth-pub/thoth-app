import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse } from '@5stones/onix';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import type { SeriesEntity } from '@/src/entities/series/model/series.types';

import { WorkTypes } from '../../constants/work';
import type {
  OnixDescriptiveFinding,
  OnixDescriptiveLookups,
  OnixExistingWorkDescriptiveFacts,
  OnixSourcePlan,
} from '../../types/onixPlanning';
import type { ExtendedONIXMessageRoot } from './interfaces';
import {
  buildOnixDescriptiveWork,
  compareOnixDescriptiveFamily,
  descriptiveLookupRequests,
  institutionSearchTerms,
  type OnixDescriptivePlan,
  planOnixDescriptiveSeries,
  reduceOnixDescriptive,
  type ReduceOnixDescriptiveOptions,
  resolveOnixDescriptiveWork,
  suggestOnixWorkType,
} from './onixDescriptive';
import { planOnixSource } from './onixPlanning';
import type { RecoveryMarker } from './validation';
import type { PublisherCategoryMarker } from './validation/recovery';

/**
 * The canonical descriptive reducers of thoth-app#183, driven exactly as the uploader drives them: a real ONIX
 * document parsed by `@5stones/onix`, planned by #182, then reduced. Every fixture is minimal and synthetic.
 */

const REFERENCE_NS = 'http://ns.editeur.org/onix/3.0/reference';

const ISBN_A = '9781800000018';
const ISBN_B = '9781800000025';
const ISBN_C = '9781800000032';
const ISBN_D = '9781800000049';

const headerXml = (extra = '', sender = '<SenderName>Example Press</SenderName>') =>
  `<Header><Sender>${sender}</Sender><SentDateTime>20260915T1200</SentDateTime>${extra}</Header>`;

const titleXml = (text = 'A Work', language = 'eng') =>
  `<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText language="${language}">${text}</TitleText></TitleElement></TitleDetail>`;

type ProductSpec = {
  readonly ref?: string;
  readonly isbn?: string;
  readonly form?: string;
  readonly descriptive?: string;
  readonly publishing?: string;
  readonly related?: string;
  readonly content?: string;
  readonly collateral?: string;
};

const product = ({
  ref = 'r1',
  isbn = ISBN_A,
  form = '<ProductComposition>00</ProductComposition><ProductForm>BC</ProductForm>',
  descriptive = titleXml(),
  publishing = '<PublishingStatus>02</PublishingStatus>',
  related = '',
  content = '',
  collateral = '',
}: ProductSpec = {}) =>
  `<Product><RecordReference>${ref}</RecordReference><NotificationType>03</NotificationType>` +
  `<ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>${isbn}</IDValue></ProductIdentifier>` +
  `<DescriptiveDetail>${form}${descriptive}</DescriptiveDetail>` +
  (collateral ? `<CollateralDetail>${collateral}</CollateralDetail>` : '') +
  (content ? `<ContentDetail>${content}</ContentDetail>` : '') +
  `<PublishingDetail>${publishing}</PublishingDetail>` +
  (related ? `<RelatedMaterial>${related}</RelatedMaterial>` : '') +
  '</Product>';

/** RelatedWork 01 naming one Work DOI: the approved explicit edge that groups manifestations. */
const manifestationOf = (doi = '10.14296/work') =>
  `<RelatedWork><WorkRelationCode>01</WorkRelationCode><WorkIdentifier><WorkIDType>06</WorkIDType><IDValue>${doi}</IDValue></WorkIdentifier></RelatedWork>`;

type Reduced = {
  readonly root: ExtendedONIXMessageRoot;
  readonly sourcePlan: OnixSourcePlan;
  readonly plan: OnixDescriptivePlan;
};

const reduce = (products: string[], options: ReduceOnixDescriptiveOptions = {}, header = headerXml()): Reduced => {
  const root = parse(
    `<ONIXMessage release="3.0" xmlns="${REFERENCE_NS}">${header}${products.join('')}</ONIXMessage>`,
  ) as ExtendedONIXMessageRoot;
  const sourcePlan = planOnixSource(root);

  return { root, sourcePlan, plan: reduceOnixDescriptive(root, sourcePlan, options) };
};

const onlyGroupKey = ({ sourcePlan }: Reduced) => {
  expect(sourcePlan.groups).toHaveLength(1);

  return sourcePlan.groups[0].groupKey;
};

const resolveOnly = (reduced: Reduced, choices: Record<string, string> = {}, thothProfileActive = false) =>
  resolveOnixDescriptiveWork(reduced.plan, onlyGroupKey(reduced), { choices, thothProfileActive });

const findingsOf = (plan: OnixDescriptivePlan, code: OnixDescriptiveFinding['code']) =>
  plan.findings.filter((finding) => finding.code === code);

const PRODUCT_1 = '/ONIXMessage[1]/Product[1]';
const subjectPath = (index: number, product = 1) =>
  `/ONIXMessage[1]/Product[${product}]/DescriptiveDetail[1]/Subject[${index}]`;

type SubjectSpec = {
  readonly scheme: string;
  readonly code?: string;
  readonly heading?: string | readonly string[];
  readonly name?: string;
  readonly version?: string;
  readonly main?: boolean;
};

const subjectXml = ({ scheme, code, heading, name, version, main }: SubjectSpec) =>
  '<Subject>' +
  (main ? '<MainSubject/>' : '') +
  `<SubjectSchemeIdentifier>${scheme}</SubjectSchemeIdentifier>` +
  (name ? `<SubjectSchemeName>${name}</SubjectSchemeName>` : '') +
  (version ? `<SubjectSchemeVersion>${version}</SubjectSchemeVersion>` : '') +
  (code ? `<SubjectCode>${code}</SubjectCode>` : '') +
  (heading === undefined
    ? ''
    : (Array.isArray(heading) ? heading : [heading])
        .map((text) => `<SubjectHeadingText>${text}</SubjectHeadingText>`)
        .join('')) +
  '</Subject>';

const withSubjects = (...subjects: SubjectSpec[]) => titleXml() + subjects.map(subjectXml).join('');

/** The recovery marker #205 records for a code-23 Subject whose SubjectSchemeName is missing. */
const categoryRecovery = (
  path: string,
  valueSource: 'SubjectCode' | 'SubjectHeadingText',
  value: string,
): PublisherCategoryMarker => ({
  recovery: 'PUBLISHER_CATEGORY_TO_CUSTOM',
  rule: '_20171218_a_2',
  path,
  scheme: { element: 'SubjectSchemeIdentifier', code: '23' },
  valueSource,
  valuePath: `${path}/${valueSource}[1]`,
  value,
});

const subjectsOf = (reduced: Reduced, choices: Record<string, string> = {}) =>
  resolveOnly(reduced, choices).values.subjects.map(({ type, code, ordinal }) => ({ type, code, ordinal }));

describe('reduceOnixDescriptive: subjects', () => {
  describe('List 27 code 23 publisher categories -> CUSTOM (thoth#923, #179 5683791471)', () => {
    it('maps a standards-valid code-23 category with a SubjectCode to CUSTOM using that code', () => {
      const reduced = reduce([
        product({
          descriptive: withSubjects({ scheme: '23', name: 'Example categories', code: 'HIST-01', heading: 'History' }),
        }),
      ]);

      expect(subjectsOf(reduced)).toEqual([{ type: 'CUSTOM', code: 'HIST-01', ordinal: 1 }]);
    });

    it('keeps a supplied SubjectSchemeName only as provenance, and says the namespace is not stored', () => {
      const reduced = reduce([
        product({ descriptive: withSubjects({ scheme: '23', name: 'Example categories', code: 'HIST-01' }) }),
      ]);

      const [subject] = reduced.plan.groups[onlyGroupKey(reduced)].subjects.subjects;
      expect(subject.provenance).toEqual([
        expect.objectContaining({
          path: subjectPath(1),
          scheme: '23',
          schemeName: 'Example categories',
          valueSource: 'SubjectCode',
          recovery: null,
        }),
      ]);
      const [loss] = findingsOf(reduced.plan, 'SUBJECT_CUSTOM_NAMESPACE_NOT_REPRESENTED');
      expect(loss).toMatchObject({ family: 'SUBJECTS', classification: 'SUPPORTED_WITH_WARNING', blocking: false });
      expect(loss.detail.schemeNames).toEqual(['Example categories']);
      // The resolved Thoth subject has no namespace field at all: nothing invents or persists one.
      expect(resolveOnly(reduced).values.subjects[0]).toEqual({
        id: expect.any(String),
        type: 'CUSTOM',
        code: 'HIST-01',
        ordinal: 1,
      });
    });

    it('lets a recovered category without SubjectSchemeName reach CUSTOM with its recovery as provenance', () => {
      const recovery = categoryRecovery(subjectPath(1), 'SubjectCode', 'LAW');
      const reduced = reduce([product({ descriptive: withSubjects({ scheme: '23', code: 'LAW' }) })], {
        recoveries: [recovery],
      });

      expect(subjectsOf(reduced)).toEqual([{ type: 'CUSTOM', code: 'LAW', ordinal: 1 }]);
      const [subject] = reduced.plan.groups[onlyGroupKey(reduced)].subjects.subjects;
      expect(subject.provenance[0]).toMatchObject({ schemeName: null, valueSource: 'SubjectCode', recovery });
      // Recovery is the source layer's: the reducer neither raises nor clears a finding about the missing name.
      expect(findingsOf(reduced.plan, 'SUBJECT_CUSTOM_NAMESPACE_NOT_REPRESENTED')).toEqual([]);
      expect(reduced.plan.findings.filter(({ blocking }) => blocking)).toEqual([]);
    });

    it('uses the trimmed heading text of a recovered category that has no usable code', () => {
      const recovery = categoryRecovery(subjectPath(1), 'SubjectHeadingText', 'Medieval history');
      const reduced = reduce(
        [product({ descriptive: withSubjects({ scheme: '23', heading: '  Medieval history  ' }) })],
        { recoveries: [recovery] },
      );

      expect(subjectsOf(reduced)).toEqual([{ type: 'CUSTOM', code: 'Medieval history', ordinal: 1 }]);
      expect(reduced.plan.groups[onlyGroupKey(reduced)].subjects.subjects[0].provenance[0]).toMatchObject({
        valueSource: 'SubjectHeadingText',
        schemeName: null,
      });
    });

    it('prefers a non-empty SubjectCode over the heading text', () => {
      const reduced = reduce([
        product({ descriptive: withSubjects({ scheme: '23', name: 'Cats', code: 'C1', heading: 'Category one' }) }),
      ]);

      expect(subjectsOf(reduced)).toEqual([{ type: 'CUSTOM', code: 'C1', ordinal: 1 }]);
    });

    it('fails closed when a recovery marker and the source disagree about the category value', () => {
      const reduced = reduce([product({ descriptive: withSubjects({ scheme: '23', code: 'LAW' }) })], {
        recoveries: [categoryRecovery(subjectPath(1), 'SubjectCode', 'NOT-LAW')],
      });

      const [mismatch] = findingsOf(reduced.plan, 'SUBJECT_RECOVERY_MISMATCH');
      expect(mismatch).toMatchObject({ classification: 'PREFLIGHT_GAP', blocking: true });
      expect(subjectsOf(reduced)).toEqual([]);
    });

    it('asks which heading a code-23 category means when it has several distinct headings and no code', () => {
      const reduced = reduce([
        product({ descriptive: withSubjects({ scheme: '23', name: 'Cats', heading: ['Law', 'Droit'] }) }),
      ]);

      const [ambiguous] = findingsOf(reduced.plan, 'SUBJECT_CUSTOM_VALUE_AMBIGUOUS');
      expect(ambiguous).toMatchObject({ classification: 'TARGET_INPUT_REQUIRED', blocking: true });
      expect(ambiguous.resolution).toEqual({
        kind: 'CHOICE',
        options: [
          { key: 'Law', label: 'Law' },
          { key: 'Droit', label: 'Droit' },
        ],
      });
      expect(resolveOnly(reduced).pendingFindingKeys).toContain(ambiguous.key);
      expect(subjectsOf(reduced, { [ambiguous.key]: 'Droit' })).toEqual([
        { type: 'CUSTOM', code: 'Droit', ordinal: 1 },
      ]);
    });

    it.each(['24', 'B2', '04', '94', '95', '96', '97', '98', '99'])(
      'never extends the Custom mapping to List 27 code %s',
      (scheme) => {
        const reduced = reduce([
          product({ descriptive: withSubjects({ scheme, name: 'Scheme name', code: 'X1', heading: 'Heading' }) }),
        ]);

        expect(subjectsOf(reduced)).toEqual([]);
        const [loss] = findingsOf(reduced.plan, 'SUBJECT_SCHEME_UNREPRESENTABLE');
        expect(loss).toMatchObject({ classification: 'TARGET_UNREPRESENTABLE', blocking: false });
        expect(loss.detail.scheme).toBe(scheme);
        expect(loss.locations.map(({ path }) => path)).toEqual([subjectPath(1)]);
      },
    );

    it('surfaces distinct category namespaces that collapse onto one Custom value instead of merging them', () => {
      const reduced = reduce([
        product({
          descriptive: withSubjects(
            { scheme: '23', name: 'Shelf codes', code: 'ART' },
            { scheme: '23', name: 'Marketing groups', code: 'ART' },
          ),
        }),
      ]);

      const [collision] = findingsOf(reduced.plan, 'SUBJECT_CUSTOM_NAMESPACE_COLLISION');
      expect(collision).toMatchObject({ classification: 'TARGET_UNREPRESENTABLE', blocking: true });
      expect(collision.resolution).toEqual({ kind: 'ACKNOWLEDGE' });
      expect(collision.detail.value).toBe('ART');
      expect(collision.detail.schemeNames).toEqual(['Shelf codes', 'Marketing groups']);
      expect(collision.locations.map(({ path }) => path)).toEqual([subjectPath(1), subjectPath(2)]);
      expect(resolveOnly(reduced).pendingFindingKeys).toContain(collision.key);
      // Acknowledged, the two source categories become the one Custom subject Thoth can hold.
      expect(subjectsOf(reduced, { [collision.key]: 'ACKNOWLEDGED' })).toEqual([
        { type: 'CUSTOM', code: 'ART', ordinal: 1 },
      ]);
    });

    it('treats the same category repeated in one namespace as one subject, not a collision', () => {
      const reduced = reduce([
        product({
          descriptive: withSubjects(
            { scheme: '23', name: 'Cats', code: 'ART' },
            { scheme: '23', name: 'Cats', code: 'ART' },
          ),
        }),
      ]);

      expect(findingsOf(reduced.plan, 'SUBJECT_CUSTOM_NAMESPACE_COLLISION')).toEqual([]);
      expect(subjectsOf(reduced)).toEqual([{ type: 'CUSTOM', code: 'ART', ordinal: 1 }]);
    });

    it('keeps MainSubject, source order and exact provenance through code-23 reduction', () => {
      const reduced = reduce([
        product({
          descriptive: withSubjects(
            { scheme: '23', name: 'Cats', code: 'A' },
            { scheme: '23', name: 'Cats', code: 'B', main: true },
            { scheme: '23', name: 'Cats', code: 'C' },
          ),
        }),
      ]);

      expect(subjectsOf(reduced)).toEqual([
        { type: 'CUSTOM', code: 'B', ordinal: 1 },
        { type: 'CUSTOM', code: 'A', ordinal: 2 },
        { type: 'CUSTOM', code: 'C', ordinal: 3 },
      ]);
      expect(
        reduced.plan.groups[onlyGroupKey(reduced)].subjects.subjects.map(({ code, main, provenance }) => [
          code,
          main,
          provenance.map(({ path }) => path),
        ]),
      ).toEqual([
        ['A', false, [subjectPath(1)]],
        ['B', true, [subjectPath(2)]],
        ['C', false, [subjectPath(3)]],
      ]);
    });

    it('reduces four manifestations of one Work, each with three recovered categories, to three Work subjects', () => {
      const categories = ['Architecture', 'Urban history', 'London'];
      const products = [ISBN_A, ISBN_B, ISBN_C, ISBN_D].map((isbn, index) =>
        product({
          ref: `uolp-${index + 1}`,
          isbn,
          related: manifestationOf(),
          descriptive: withSubjects(...categories.map((heading) => ({ scheme: '23', heading }))),
        }),
      );
      const recoveries = [1, 2, 3, 4].flatMap((productIndex) =>
        categories.map((heading, subjectIndex) =>
          categoryRecovery(subjectPath(subjectIndex + 1, productIndex), 'SubjectHeadingText', heading),
        ),
      );
      const reduced = reduce(products, { recoveries });

      const groupKey = onlyGroupKey(reduced);
      expect(reduced.sourcePlan.groups[0].productKeys).toHaveLength(4);
      // Three unmarked categories of one scheme: which is primary is the publisher's to say, never file order.
      const [primary] = findingsOf(reduced.plan, 'SUBJECT_PRIMARY_REQUIRED');
      expect(primary).toMatchObject({ groupKey, productKey: null, blocking: true });
      expect(
        subjectsOf(reduced, { [primary.key]: 'FIRST_SOURCE_SUBJECT' }).map(({ type, code, ordinal }) => [
          type,
          code,
          ordinal,
        ]),
      ).toEqual([
        ['CUSTOM', 'Architecture', 1],
        ['CUSTOM', 'Urban history', 2],
        ['CUSTOM', 'London', 3],
      ]);
      // Every one of the twelve recovered source categories is still there, at its exact path, with its marker.
      const provenance = reduced.plan.groups[groupKey].subjects.subjects.flatMap((subject) => subject.provenance);
      expect(provenance).toHaveLength(12);
      expect(provenance.map(({ path }) => path).sort()).toEqual(recoveries.map(({ path }) => path).sort());
      expect(provenance.every(({ recovery }) => recovery !== null)).toBe(true);
    });
  });

  describe('approved scheme mappings', () => {
    it.each([
      ['03', 'LCC', 'PS3563.O8749'],
      ['10', 'BISAC', 'HIS037010'],
      ['12', 'BIC', 'HBJD'],
      ['93', 'THEMA', 'NHD'],
    ])('maps List 27 code %s to %s from SubjectCode', (scheme, type, code) => {
      const reduced = reduce([product({ descriptive: withSubjects({ scheme, code, heading: 'Heading text' }) })]);

      expect(subjectsOf(reduced)).toEqual([{ type, code, ordinal: 1 }]);
    });

    it('warns that BIC is a deprecated scheme while still mapping it', () => {
      const reduced = reduce([product({ descriptive: withSubjects({ scheme: '12', code: 'HBJD' }) })]);

      expect(findingsOf(reduced.plan, 'SUBJECT_BIC_DEPRECATED')).toEqual([
        expect.objectContaining({ classification: 'SUPPORTED_WITH_WARNING', blocking: false }),
      ]);
    });

    it('never substitutes a heading for the missing code of a controlled scheme', () => {
      const reduced = reduce([product({ descriptive: withSubjects({ scheme: '10', heading: 'History / Europe' }) })]);

      expect(subjectsOf(reduced)).toEqual([]);
      expect(findingsOf(reduced.plan, 'SUBJECT_CODE_MISSING')).toEqual([
        expect.objectContaining({ classification: 'TARGET_UNREPRESENTABLE', blocking: false }),
      ]);
    });

    it('splits code-20 keywords on semicolons into ordered, trimmed, non-empty Keyword subjects', () => {
      const reduced = reduce([
        product({
          descriptive: withSubjects(
            { scheme: '20', heading: 'history; architecture ;;  London ' },
            { scheme: '20', heading: 'maps' },
          ),
        }),
      ]);

      expect(subjectsOf(reduced)).toEqual([
        { type: 'KEYWORD', code: 'history', ordinal: 1 },
        { type: 'KEYWORD', code: 'architecture', ordinal: 2 },
        { type: 'KEYWORD', code: 'London', ordinal: 3 },
        { type: 'KEYWORD', code: 'maps', ordinal: 4 },
      ]);
    });

    it('does not coerce a Thema qualifier code given under scheme 93 into a subject category', () => {
      const reduced = reduce([product({ descriptive: withSubjects({ scheme: '93', code: '1DDU' }) })]);

      expect(subjectsOf(reduced)).toEqual([]);
      expect(findingsOf(reduced.plan, 'SUBJECT_THEMA_CODE_UNKNOWN')).toHaveLength(1);
    });

    it('treats a Thema code outside the pinned Thema v1.6 vocabulary as UNKNOWN, never as THEMA', () => {
      const reduced = reduce([product({ descriptive: withSubjects({ scheme: '93', code: 'AHBW', version: '1.6' }) })]);

      expect(subjectsOf(reduced)).toEqual([]);
      expect(findingsOf(reduced.plan, 'SUBJECT_THEMA_CODE_UNKNOWN')).toEqual([
        expect.objectContaining({ classification: 'UNKNOWN', blocking: false }),
      ]);
    });

    it('validates an unversioned Thema code against the pinned default and says so', () => {
      const reduced = reduce([product({ descriptive: withSubjects({ scheme: '93', code: 'NHD' }) })]);

      expect(subjectsOf(reduced)).toEqual([{ type: 'THEMA', code: 'NHD', ordinal: 1 }]);
      expect(findingsOf(reduced.plan, 'SUBJECT_THEMA_DEFAULT_VERSION')).toEqual([
        expect.objectContaining({ classification: 'SUPPORTED_NORMALIZED', blocking: false }),
      ]);
    });

    it.each([
      ['93', 'NHD', '1.5'],
      ['10', 'HIS037010', '2023'],
      ['23', 'LAW', '2'],
    ])(
      'does not guess against another vocabulary version: scheme %s version %s is UNKNOWN',
      (scheme, code, version) => {
        const reduced = reduce([
          product({ descriptive: withSubjects({ scheme, code, version, name: scheme === '23' ? 'Cats' : undefined }) }),
        ]);

        expect(subjectsOf(reduced)).toEqual([]);
        expect(findingsOf(reduced.plan, 'SUBJECT_VERSION_UNKNOWN')).toEqual([
          expect.objectContaining({ classification: 'UNKNOWN', blocking: false }),
        ]);
      },
    );

    it('accepts the pinned Thema version exactly', () => {
      const reduced = reduce([product({ descriptive: withSubjects({ scheme: '93', code: 'NHD', version: '1.6' }) })]);

      expect(subjectsOf(reduced)).toEqual([{ type: 'THEMA', code: 'NHD', ordinal: 1 }]);
      expect(findingsOf(reduced.plan, 'SUBJECT_THEMA_DEFAULT_VERSION')).toEqual([]);
    });

    it('keeps NameAsSubject out of every target field and says so', () => {
      const reduced = reduce([
        product({
          descriptive: titleXml() + '<NameAsSubject><PersonName>Christopher Wren</PersonName></NameAsSubject>',
        }),
      ]);

      expect(subjectsOf(reduced)).toEqual([]);
      expect(findingsOf(reduced.plan, 'SUBJECT_NAME_AS_SUBJECT_UNREPRESENTABLE')).toEqual([
        expect.objectContaining({ classification: 'TARGET_UNREPRESENTABLE', blocking: false }),
      ]);
    });
  });

  describe('primary subjects and ordinals, per target type', () => {
    it('makes the one MainSubject of a type ordinal 1, and orders the rest by source order', () => {
      const reduced = reduce([
        product({
          descriptive: withSubjects(
            { scheme: '93', code: 'NHD' },
            { scheme: '10', code: 'HIS037010' },
            { scheme: '93', code: 'NHB', main: true },
          ),
        }),
      ]);

      expect(subjectsOf(reduced)).toEqual([
        { type: 'THEMA', code: 'NHB', ordinal: 1 },
        { type: 'THEMA', code: 'NHD', ordinal: 2 },
        { type: 'BISAC', code: 'HIS037010', ordinal: 1 },
      ]);
    });

    it('normalises a sole unmarked subject of a type to ordinal 1 without asking', () => {
      const reduced = reduce([product({ descriptive: withSubjects({ scheme: '10', code: 'HIS037010' }) })]);

      expect(subjectsOf(reduced)).toEqual([{ type: 'BISAC', code: 'HIS037010', ordinal: 1 }]);
      expect(findingsOf(reduced.plan, 'SUBJECT_PRIMARY_REQUIRED')).toEqual([]);
    });

    it('asks for the primary subject when several subjects of a type have no MainSubject', () => {
      const reduced = reduce([
        product({ descriptive: withSubjects({ scheme: '93', code: 'NHD' }, { scheme: '93', code: 'NHB' }) }),
      ]);

      const [required] = findingsOf(reduced.plan, 'SUBJECT_PRIMARY_REQUIRED');
      expect(required).toMatchObject({ classification: 'TARGET_INPUT_REQUIRED', blocking: true });
      expect(required.detail.type).toBe('THEMA');
      expect(required.resolution).toEqual({
        kind: 'CHOICE',
        options: [
          { key: 'FIRST_SOURCE_SUBJECT', label: 'NHD' },
          { key: 'NHD', label: 'NHD' },
          { key: 'NHB', label: 'NHB' },
        ],
      });
      const unresolved = resolveOnly(reduced);
      expect(unresolved.pendingFindingKeys).toContain(required.key);
      expect(subjectsOf(reduced, { [required.key]: 'NHB' })).toEqual([
        { type: 'THEMA', code: 'NHB', ordinal: 1 },
        { type: 'THEMA', code: 'NHD', ordinal: 2 },
      ]);
    });

    it.each([
      [
        'declares a scheme version no pinned vocabulary covers',
        { scheme: '10', code: 'LIT004290', version: '2016', main: true },
      ],
      ['names a Thema code outside the pinned vocabulary', { scheme: '93', code: 'ZZZZ', main: true }],
      ['gives no code', { scheme: '12', heading: 'Early modern history', main: true }],
    ])('never promotes another subject to primary when the main subject %s and is not imported', (_label, main) => {
      const type = { '10': 'BISAC', '93': 'THEMA', '12': 'BIC' }[main.scheme];
      const secondary = { '10': 'HIS037020', '93': 'NHDL', '12': 'HBLH' }[main.scheme] as string;
      const reduced = reduce([product({ descriptive: withSubjects(main, { scheme: main.scheme, code: secondary }) })]);

      const [required] = findingsOf(reduced.plan, 'SUBJECT_PRIMARY_REQUIRED');

      expect(required).toMatchObject({ blocking: true, detail: { type, codes: [secondary] } });
      expect(required.message).toContain('marked as the main subject was not imported');
      expect(resolveOnly(reduced).values.subjects).toEqual([]);
      expect(subjectsOf(reduced, { [required.key]: 'FIRST_SOURCE_SUBJECT' })).toEqual([
        { type, code: secondary, ordinal: 1 },
      ]);
    });

    it('asks which MainSubject is primary when a type has more than one', () => {
      const reduced = reduce([
        product({
          descriptive: withSubjects(
            { scheme: '93', code: 'NHD', main: true },
            { scheme: '93', code: 'NHB', main: true },
          ),
        }),
      ]);

      const [ambiguous] = findingsOf(reduced.plan, 'SUBJECT_PRIMARY_AMBIGUOUS');
      expect(ambiguous).toMatchObject({ classification: 'TARGET_INPUT_REQUIRED', blocking: true });
      expect(ambiguous.resolution).toEqual({
        kind: 'CHOICE',
        options: [
          { key: 'NHD', label: 'NHD' },
          { key: 'NHB', label: 'NHB' },
        ],
      });
    });

    it('keeps keyword order as the source gives it, since a keyword carries no primary meaning', () => {
      const reduced = reduce([product({ descriptive: withSubjects({ scheme: '20', heading: 'b; a' }) })]);

      expect(findingsOf(reduced.plan, 'SUBJECT_PRIMARY_REQUIRED')).toEqual([]);
      expect(subjectsOf(reduced).map(({ code }) => code)).toEqual(['b', 'a']);
    });
  });

  describe('grouped manifestations', () => {
    it('never duplicates a subject because several manifestations assert it', () => {
      const products = [ISBN_A, ISBN_B].map((isbn, index) =>
        product({
          ref: `m${index}`,
          isbn,
          related: manifestationOf(),
          descriptive: withSubjects({ scheme: '93', code: 'NHD', main: true }, { scheme: '20', heading: 'history' }),
        }),
      );
      const reduced = reduce(products);

      expect(subjectsOf(reduced)).toEqual([
        { type: 'THEMA', code: 'NHD', ordinal: 1 },
        { type: 'KEYWORD', code: 'history', ordinal: 1 },
      ]);
    });

    it('does not read a manifestation without subjects as contradicting one with subjects', () => {
      const reduced = reduce([
        product({
          ref: 'm1',
          related: manifestationOf(),
          descriptive: withSubjects({ scheme: '10', code: 'HIS037010' }),
        }),
        product({ ref: 'm2', isbn: ISBN_B, related: manifestationOf() }),
      ]);

      expect(subjectsOf(reduced)).toEqual([{ type: 'BISAC', code: 'HIS037010', ordinal: 1 }]);
      expect(reduced.plan.findings.filter(({ blocking }) => blocking)).toEqual([]);
    });
  });

  describe('ContentItem scope', () => {
    it('reduces a ContentItem subject with the same resolver, keeping it on the component', () => {
      const content =
        '<ContentItem><LevelSequenceNumber>1</LevelSequenceNumber><TextItem><TextItemType>03</TextItemType></TextItem>' +
        '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>04</TitleElementLevel><TitleText language="eng">Chapter</TitleText></TitleElement></TitleDetail>' +
        subjectXml({ scheme: '93', code: 'NHD', main: true }) +
        subjectXml({ scheme: '24', name: 'House', code: 'X' }) +
        '</ContentItem>';
      const reduced = reduce([product({ content })]);

      const productKey = reduced.sourcePlan.products[0].productKey;
      const component = reduced.plan.products[productKey].contentItems[`${PRODUCT_1}/ContentDetail[1]/ContentItem[1]`];
      expect(
        component.subjects.subjects.map(({ type, code, main, provenance }) => [type, code, main, provenance[0].path]),
      ).toEqual([['THEMA', 'NHD', true, `${PRODUCT_1}/ContentDetail[1]/ContentItem[1]/Subject[1]`]]);
      // Component subjects are never promoted to the parent Work.
      expect(subjectsOf(reduced)).toEqual([]);
      expect(findingsOf(reduced.plan, 'SUBJECT_SCHEME_UNREPRESENTABLE')[0].locations[0].path).toBe(
        `${PRODUCT_1}/ContentDetail[1]/ContentItem[1]/Subject[2]`,
      );
    });
  });
});

const languageXml = (role: string, code: string, extra = '') =>
  `<Language><LanguageRole>${role}</LanguageRole><LanguageCode>${code}</LanguageCode>${extra}</Language>`;

const withLanguages = (...languages: string[]) => titleXml() + languages.join('');

const languagesOf = (reduced: Reduced, choices: Record<string, string> = {}) =>
  resolveOnly(reduced, choices).values.languages.map(({ code, relation }) => [code, relation]);

const languagePath = (index: number, product = 1) =>
  `/ONIXMessage[1]/Product[${product}]/DescriptiveDetail[1]/Language[${index}]`;

describe('reduceOnixDescriptive: languages (ONIX-AUDIT-LANGUAGE-01 5558297710)', () => {
  it('plans no Work language, and raises nothing, when neither the Product nor the Header gives one', () => {
    const reduced = reduce([product()]);

    expect(languagesOf(reduced)).toEqual([]);
    expect(reduced.plan.findings.filter(({ family }) => family === 'LANGUAGES')).toEqual([]);
  });

  it('reduces a lone language of text to Original under the no-translation convention, with provenance', () => {
    const reduced = reduce([product({ descriptive: withLanguages(languageXml('01', 'eng')) })]);

    expect(languagesOf(reduced)).toEqual([['ENG', 'ORIGINAL']]);
    const [row] = reduced.plan.groups[onlyGroupKey(reduced)].languages.rows;
    expect(row).toMatchObject({ code: 'ENG', relation: 'ORIGINAL', basis: 'NO_TRANSLATION_EVIDENCE' });
    expect(row.provenance.map(({ path, role }) => [path, role])).toEqual([[languagePath(1), '01']]);
  });

  it('reads a text language beside an original-language-not-present as a translation into it', () => {
    const reduced = reduce([
      product({ descriptive: withLanguages(languageXml('01', 'fre'), languageXml('02', 'eng')) }),
    ]);

    expect(languagesOf(reduced)).toEqual([
      ['FRE', 'TRANSLATED_INTO'],
      ['ENG', 'TRANSLATED_FROM'],
    ]);
  });

  it('reduces the University of London Press multilingual set without a false duplicate-code conflict', () => {
    const reduced = reduce([
      product({
        descriptive: withLanguages(
          languageXml('01', 'eng'),
          languageXml('06', 'spa'),
          languageXml('06', 'por'),
          languageXml('07', 'eng'),
        ),
      }),
    ]);

    expect(languagesOf(reduced)).toEqual([
      ['ENG', 'TRANSLATED_INTO'],
      ['SPA', 'ORIGINAL'],
      ['POR', 'ORIGINAL'],
    ]);
    expect(reduced.plan.findings.filter(({ blocking }) => blocking)).toEqual([]);
    const eng = reduced.plan.groups[onlyGroupKey(reduced)].languages.rows.find(({ code }) => code === 'ENG');
    // The generic role-01 fact corroborates the specific role-07 one, and both stay as provenance.
    expect(eng?.provenance.map(({ role, path }) => [role, path])).toEqual([
      ['07', languagePath(4)],
      ['01', languagePath(1)],
    ]);
  });

  it('merges a role-01 language into the compatible role-06 fact for the same language', () => {
    const reduced = reduce([
      product({ descriptive: withLanguages(languageXml('01', 'spa'), languageXml('06', 'spa')) }),
    ]);

    expect(languagesOf(reduced)).toEqual([['SPA', 'ORIGINAL']]);
  });

  it('turns one language code with incompatible relations into a target choice, never two Language rows', () => {
    const reduced = reduce([
      product({ descriptive: withLanguages(languageXml('06', 'eng'), languageXml('07', 'eng')) }),
    ]);

    const [collision] = findingsOf(reduced.plan, 'LANGUAGE_RELATION_COLLISION');
    expect(collision).toMatchObject({
      family: 'LANGUAGES',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: true,
      detail: { code: 'ENG', relations: ['ORIGINAL', 'TRANSLATED_INTO'] },
    });
    expect(collision.resolution).toEqual({
      kind: 'CHOICE',
      options: [
        { key: 'ORIGINAL', label: 'ORIGINAL' },
        { key: 'TRANSLATED_INTO', label: 'TRANSLATED_INTO' },
      ],
    });
    expect(collision.locations.map(({ path }) => path)).toEqual([languagePath(1), languagePath(2)]);
    expect(languagesOf(reduced)).toEqual([]);
    expect(resolveOnly(reduced).pendingFindingKeys).toContain(collision.key);
    expect(languagesOf(reduced, { [collision.key]: 'TRANSLATED_INTO' })).toEqual([['ENG', 'TRANSLATED_INTO']]);
  });

  it('never turns an exact same-key LanguageRole 01 + 02 into target input: the source layer owns that contradiction', () => {
    const reduced = reduce([
      product({ descriptive: withLanguages(languageXml('01', 'ger'), languageXml('02', 'ger')) }),
    ]);

    const [contradiction] = findingsOf(reduced.plan, 'LANGUAGE_SOURCE_CONTRADICTION');
    expect(contradiction).toMatchObject({
      classification: 'PREFLIGHT_GAP',
      blocking: true,
      resolution: { kind: 'NONE' },
    });
    expect(findingsOf(reduced.plan, 'LANGUAGE_RELATION_COLLISION')).toEqual([]);
    expect(languagesOf(reduced, { [contradiction.key]: 'TRANSLATED_FROM' })).toEqual([]);
    expect(resolveOnly(reduced, { [contradiction.key]: 'TRANSLATED_FROM' }).pendingFindingKeys).toContain(
      contradiction.key,
    );
  });

  it.each([
    [
      '01/ger/AT + 02/ger/DE',
      languageXml('01', 'ger', '<CountryCode>AT</CountryCode>'),
      languageXml('02', 'ger', '<CountryCode>DE</CountryCode>'),
    ],
    [
      '01/ger/Latn + 02/ger/Cyrl',
      languageXml('01', 'ger', '<ScriptCode>Latn</ScriptCode>'),
      languageXml('02', 'ger', '<ScriptCode>Cyrl</ScriptCode>'),
    ],
  ])(
    'keeps the source-valid %s as a target collision on the one Thoth code, not a source contradiction',
    (_label, first, second) => {
      const reduced = reduce([product({ descriptive: withLanguages(first, second) })]);

      expect(findingsOf(reduced.plan, 'LANGUAGE_SOURCE_CONTRADICTION')).toEqual([]);
      expect(findingsOf(reduced.plan, 'LANGUAGE_RELATION_COLLISION')).toHaveLength(1);
    },
  );

  it('keeps one Work language, with a warning, when country or script variants share a code and relation', () => {
    const reduced = reduce([
      product({
        descriptive: withLanguages(
          languageXml('01', 'eng', '<CountryCode>GB</CountryCode>'),
          languageXml('01', 'eng', '<CountryCode>US</CountryCode>'),
        ),
      }),
    ]);

    expect(languagesOf(reduced)).toEqual([['ENG', 'ORIGINAL']]);
    expect(findingsOf(reduced.plan, 'LANGUAGE_VARIANT_NOT_REPRESENTED')).toEqual([
      expect.objectContaining({ classification: 'SUPPORTED_WITH_WARNING', blocking: false }),
    ]);
  });

  it.each(['03', '08', '09', '10', '11', '12', '13', '14', '15'])(
    'keeps scoped role %s out of the Work languages without any artificial error',
    (role) => {
      const reduced = reduce([product({ descriptive: withLanguages(languageXml(role, 'eng')) })]);

      expect(languagesOf(reduced)).toEqual([]);
      expect(findingsOf(reduced.plan, 'LANGUAGE_ROLE_SCOPED')).toEqual([
        expect.objectContaining({
          classification: 'TARGET_UNREPRESENTABLE',
          blocking: false,
          detail: { roles: [role] },
        }),
      ]);
    },
  );

  it('reports a valid List 74 code Thoth has no Language for as a loss, never as invalid source', () => {
    const reduced = reduce([product({ descriptive: withLanguages(languageXml('01', 'yue')) })]);

    expect(languagesOf(reduced)).toEqual([]);
    expect(findingsOf(reduced.plan, 'LANGUAGE_CODE_UNREPRESENTABLE')).toEqual([
      expect.objectContaining({
        classification: 'TARGET_UNREPRESENTABLE',
        blocking: false,
        detail: { codes: ['yue'] },
      }),
    ]);
  });

  describe('Header DefaultLanguageOfText', () => {
    const defaultHeader = headerXml('<DefaultLanguageOfText>eng</DefaultLanguageOfText>');

    it('supplies the text language of a Product that gives none, as Original, and says it was inherited', () => {
      const reduced = reduce([product()], {}, defaultHeader);

      expect(languagesOf(reduced)).toEqual([['ENG', 'ORIGINAL']]);
      expect(reduced.plan.groups[onlyGroupKey(reduced)].languages.rows[0].provenance[0]).toMatchObject({
        role: 'HEADER_DEFAULT',
        path: '/ONIXMessage[1]/Header[1]/DefaultLanguageOfText[1]',
      });
      expect(findingsOf(reduced.plan, 'LANGUAGE_HEADER_DEFAULT')).toEqual([
        expect.objectContaining({ classification: 'SUPPORTED_NORMALIZED', blocking: false }),
      ]);
    });

    it('reads the default text language as translated into when role 02 names an original not present', () => {
      const reduced = reduce([product({ descriptive: withLanguages(languageXml('02', 'fre')) })], {}, defaultHeader);

      expect(languagesOf(reduced)).toEqual([
        ['FRE', 'TRANSLATED_FROM'],
        ['ENG', 'TRANSLATED_INTO'],
      ]);
    });

    it('adds nothing where the Product states its own text language', () => {
      const reduced = reduce([product({ descriptive: withLanguages(languageXml('01', 'ger')) })], {}, defaultHeader);

      expect(languagesOf(reduced)).toEqual([['GER', 'ORIGINAL']]);
      expect(findingsOf(reduced.plan, 'LANGUAGE_HEADER_DEFAULT')).toEqual([]);
    });
  });

  it('asks for the relation of a role-01 language a multilingual 06/07 regime does not classify', () => {
    const reduced = reduce([
      product({
        descriptive: withLanguages(languageXml('06', 'spa'), languageXml('07', 'eng'), languageXml('01', 'cat')),
      }),
    ]);

    const [required] = findingsOf(reduced.plan, 'LANGUAGE_RELATION_REQUIRED');
    expect(required).toMatchObject({
      classification: 'TARGET_INPUT_REQUIRED',
      blocking: true,
      detail: { code: 'CAT' },
    });
    expect(languagesOf(reduced)).toEqual([
      ['SPA', 'ORIGINAL'],
      ['ENG', 'TRANSLATED_INTO'],
    ]);
    expect(languagesOf(reduced, { [required.key]: 'ORIGINAL' })).toEqual([
      ['SPA', 'ORIGINAL'],
      ['ENG', 'TRANSLATED_INTO'],
      ['CAT', 'ORIGINAL'],
    ]);
  });

  describe('grouped manifestations', () => {
    it('deduplicates identical Work-language semantics across manifestations', () => {
      const reduced = reduce(
        [ISBN_A, ISBN_B].map((isbn, index) =>
          product({
            ref: `m${index}`,
            isbn,
            related: manifestationOf(),
            descriptive: withLanguages(languageXml('01', 'eng')),
          }),
        ),
      );

      expect(languagesOf(reduced)).toEqual([['ENG', 'ORIGINAL']]);
      expect(reduced.plan.groups[onlyGroupKey(reduced)].languages.rows[0].provenance).toHaveLength(2);
    });

    it('lets a specific multilingual role on one manifestation classify a generic role-01 on another', () => {
      const reduced = reduce([
        product({ ref: 'm1', related: manifestationOf(), descriptive: withLanguages(languageXml('01', 'eng')) }),
        product({
          ref: 'm2',
          isbn: ISBN_B,
          related: manifestationOf(),
          descriptive: withLanguages(languageXml('07', 'eng'), languageXml('06', 'spa')),
        }),
      ]);

      expect(languagesOf(reduced)).toEqual([
        ['ENG', 'TRANSLATED_INTO'],
        ['SPA', 'ORIGINAL'],
      ]);
      expect(reduced.plan.findings.filter(({ blocking }) => blocking)).toEqual([]);
    });

    it('blocks a grouping whose manifestations assert contradictory Work-language regimes', () => {
      const reduced = reduce([
        product({
          ref: 'm1',
          related: manifestationOf(),
          descriptive: withLanguages(languageXml('06', 'eng'), languageXml('07', 'fre')),
        }),
        product({
          ref: 'm2',
          isbn: ISBN_B,
          related: manifestationOf(),
          descriptive: withLanguages(languageXml('06', 'fre'), languageXml('07', 'eng')),
        }),
      ]);

      const conflicts = findingsOf(reduced.plan, 'LANGUAGE_GROUP_CONFLICT');
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toMatchObject({ classification: 'SOURCE_CONFLICT', blocking: true, productKey: null });
      expect(findingsOf(reduced.plan, 'LANGUAGE_RELATION_COLLISION')).toEqual([]);
      expect(languagesOf(reduced)).toEqual([]);
    });
  });

  describe('ContentItem scope', () => {
    const chapter = (languages = '') =>
      '<ContentItem><LevelSequenceNumber>1</LevelSequenceNumber><TextItem><TextItemType>03</TextItemType></TextItem>' +
      '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>04</TitleElementLevel><TitleText>Chapter</TitleText></TitleElement></TitleDetail>' +
      `${languages}</ContentItem>`;
    const itemPath = `${PRODUCT_1}/ContentDetail[1]/ContentItem[1]`;

    it('does not inherit the parent Product languages, nor the Header default', () => {
      const reduced = reduce(
        [product({ descriptive: withLanguages(languageXml('01', 'eng')), content: chapter() })],
        {},
        headerXml('<DefaultLanguageOfText>ger</DefaultLanguageOfText>'),
      );

      const productKey = reduced.sourcePlan.products[0].productKey;
      expect(reduced.plan.products[productKey].contentItems[itemPath].languages.rows).toEqual([]);
    });

    it('reduces explicit component languages with the same whole-set reducer', () => {
      const reduced = reduce([product({ content: chapter(languageXml('01', 'fre') + languageXml('02', 'eng')) })]);

      const productKey = reduced.sourcePlan.products[0].productKey;
      expect(
        reduced.plan.products[productKey].contentItems[itemPath].languages.rows.map(({ code, relation }) => [
          code,
          relation,
        ]),
      ).toEqual([
        ['FRE', 'TRANSLATED_INTO'],
        ['ENG', 'TRANSLATED_FROM'],
      ]);
      expect(languagesOf(reduced)).toEqual([]);
    });
  });
});

type TitleElementSpec = {
  readonly level?: string | null;
  readonly sequence?: string;
  readonly text?: string;
  readonly prefix?: string;
  readonly noPrefix?: boolean;
  readonly without?: string;
  readonly subtitle?: string;
  readonly language?: string;
  readonly subtitleLanguage?: string;
  readonly script?: string;
  readonly partNumber?: string;
  readonly yearOfAnnual?: string;
  readonly collationKey?: string;
};

const textAttributes = (language?: string, script?: string, collationKey?: string) =>
  (language ? ` language="${language}"` : '') +
  (script ? ` textscript="${script}"` : '') +
  (collationKey ? ` collationkey="${collationKey}"` : '');

const titleElementXml = (element: TitleElementSpec) =>
  '<TitleElement>' +
  (element.sequence ? `<SequenceNumber>${element.sequence}</SequenceNumber>` : '') +
  (element.level === null ? '' : `<TitleElementLevel>${element.level ?? '01'}</TitleElementLevel>`) +
  (element.partNumber ? `<PartNumber>${element.partNumber}</PartNumber>` : '') +
  (element.yearOfAnnual ? `<YearOfAnnual>${element.yearOfAnnual}</YearOfAnnual>` : '') +
  (element.text === undefined
    ? ''
    : `<TitleText${textAttributes(element.language, element.script, element.collationKey)}>${element.text}</TitleText>`) +
  (element.prefix ? `<TitlePrefix${textAttributes(element.language)}>${element.prefix}</TitlePrefix>` : '') +
  (element.noPrefix ? '<NoPrefix/>' : '') +
  (element.without
    ? `<TitleWithoutPrefix${textAttributes(element.language)}>${element.without}</TitleWithoutPrefix>`
    : '') +
  (element.subtitle
    ? `<Subtitle${textAttributes(element.subtitleLanguage ?? element.language, element.script)}>${element.subtitle}</Subtitle>`
    : '') +
  '</TitleElement>';

const titleDetailXml = (type: string | null, elements: readonly TitleElementSpec[], statement = '') =>
  '<TitleDetail>' +
  (type === null ? '' : `<TitleType>${type}</TitleType>`) +
  elements.map(titleElementXml).join('') +
  statement +
  '</TitleDetail>';

const titlesOf = (reduced: Reduced, choices: Record<string, string> = {}) =>
  resolveOnly(reduced, choices).values.titles.map(({ canonical, title, subtitle, fullTitle, localeCode }) => [
    canonical,
    title,
    subtitle,
    fullTitle,
    localeCode,
  ]);

const titlePath = (index: number, product = 1) =>
  `/ONIXMessage[1]/Product[${product}]/DescriptiveDetail[1]/TitleDetail[${index}]`;

describe('reduceOnixDescriptive: titles (ONIX-AUDIT-TITLE-LOCALE-01 5551465280)', () => {
  describe('title structure', () => {
    it('maps a Type-01 TitleText and Subtitle, compiling the full title as Thoth does', () => {
      const reduced = reduce([
        product({ descriptive: titleDetailXml('01', [{ text: 'Cities', subtitle: 'A History', language: 'eng' }]) }),
      ]);

      expect(titlesOf(reduced)).toEqual([[true, 'Cities', 'A History', 'Cities: A History', 'EN']]);
      expect(reduced.plan.findings.filter(({ family }) => family === 'TITLE')).toEqual([]);
    });

    it.each([
      ['Why Cities?', 'Why Cities? A History'],
      ['Cities!', 'Cities! A History'],
      ['Cities:', 'Cities: A History'],
      ['Cities.', 'Cities. A History'],
    ])('does not double the punctuation of %s', (text, fullTitle) => {
      const reduced = reduce([
        product({ descriptive: titleDetailXml('01', [{ text, subtitle: 'A History', language: 'eng' }]) }),
      ]);

      expect(titlesOf(reduced)[0][3]).toBe(fullTitle);
    });

    it.each([
      ['The', 'Book of Days', 'The Book of Days'],
      ["L'", 'Histoire', "L'Histoire"],
      ['Al-', 'Kitab', 'Al-Kitab'],
    ])('joins the prefix %s to its title, and discloses the lost sorting boundary', (prefix, without, title) => {
      const reduced = reduce([product({ descriptive: titleDetailXml('01', [{ prefix, without, language: 'eng' }]) })]);

      expect(titlesOf(reduced)).toEqual([[true, title, '', title, 'EN']]);
      expect(findingsOf(reduced.plan, 'TITLE_STRUCTURE_LOSS')).toEqual([
        expect.objectContaining({
          classification: 'SUPPORTED_WITH_WARNING',
          blocking: false,
          detail: expect.objectContaining({ kinds: ['PREFIX_BOUNDARY'] }),
        }),
      ]);
    });

    it('takes TitleWithoutPrefix exactly under NoPrefix, synthesising nothing', () => {
      const reduced = reduce([
        product({ descriptive: titleDetailXml('01', [{ noPrefix: true, without: 'Cities', language: 'eng' }]) }),
      ]);

      expect(titlesOf(reduced)).toEqual([[true, 'Cities', '', 'Cities', 'EN']]);
    });

    it('never borrows another level: a Product with only a Collection-level title has no canonical title', () => {
      const reduced = reduce([
        product({ descriptive: titleDetailXml('01', [{ level: '02', text: 'A Series', language: 'eng' }]) }),
      ]);

      const [missing] = findingsOf(reduced.plan, 'TITLE_CANONICAL_MISSING');
      expect(missing).toMatchObject({
        classification: 'TARGET_INPUT_REQUIRED',
        blocking: true,
        resolution: { kind: 'INPUT', input: 'TEXT' },
      });
      expect(titlesOf(reduced)).toEqual([]);
      expect(resolveOnly(reduced).pendingFindingKeys).toContain(missing.key);
    });

    it('lets the publisher enter the canonical title the source does not give, in the one locale its text states', () => {
      const reduced = reduce([
        product({
          descriptive:
            titleDetailXml('01', [{ level: '02', text: 'A Series', language: 'eng' }]) + languageXml('01', 'fre'),
        }),
      ]);
      const [missing] = findingsOf(reduced.plan, 'TITLE_CANONICAL_MISSING');

      expect(findingsOf(reduced.plan, 'TITLE_LOCALE_UNRESOLVED')).toEqual([]);
      expect(resolveOnly(reduced, { [missing.key]: '  Villes  ' }).values.titles).toEqual([
        expect.objectContaining({
          canonical: true,
          title: 'Villes',
          subtitle: '',
          fullTitle: 'Villes',
          localeCode: 'FR',
          sourceMarkupFormat: 'PLAIN_TEXT',
        }),
      ]);
      // An entry that is empty, or shaped like markup Thoth's plain-text title input refuses, answers nothing.
      expect(resolveOnly(reduced, { [missing.key]: '   ' }).pendingFindingKeys).toContain(missing.key);
      expect(resolveOnly(reduced, { [missing.key]: '<i>Villes</i>' }).pendingFindingKeys).toContain(missing.key);
      expect(resolveOnly(reduced, { [missing.key]: '<i>Villes</i>' }).values.titles).toEqual([]);
    });

    it('asks for the locale of an entered canonical title too when the source states none, never assuming English', () => {
      const reduced = reduce([
        product({ descriptive: titleDetailXml('01', [{ level: '02', text: 'A Series', language: 'eng' }]) }),
      ]);
      const [missing] = findingsOf(reduced.plan, 'TITLE_CANONICAL_MISSING');
      const [locale] = findingsOf(reduced.plan, 'TITLE_LOCALE_UNRESOLVED');

      expect(locale).toMatchObject({ blocking: false, resolution: { kind: 'INPUT', input: 'LOCALE' } });
      expect(resolveOnly(reduced, { [missing.key]: 'Cities' }).pendingFindingKeys).toContain(locale.key);
      expect(titlesOf(reduced, { [missing.key]: 'Cities', [locale.key]: 'EN_GB' })).toEqual([
        [true, 'Cities', '', 'Cities', 'EN_GB'],
      ]);
    });

    it.each([
      ['a TitleType', titleDetailXml(null, [{ text: 'Cities', language: 'eng' }])],
      ['a TitleElementLevel', titleDetailXml('01', [{ level: null, text: 'Cities', language: 'eng' }])],
    ])('repairs nothing when %s the validator requires is missing', (_missing, descriptive) => {
      const reduced = reduce([product({ descriptive })]);

      expect(findingsOf(reduced.plan, 'TITLE_STRUCTURE_UNUSABLE')).toEqual([
        expect.objectContaining({ classification: 'PREFLIGHT_GAP', blocking: true }),
      ]);
      expect(titlesOf(reduced)).toEqual([]);
      expect(findingsOf(reduced.plan, 'TITLE_CANONICAL_MISSING')).toHaveLength(1);
    });

    it('discloses PartNumber, YearOfAnnual and a collation key as title structure Thoth does not keep', () => {
      const reduced = reduce([
        product({
          descriptive: titleDetailXml('01', [
            {
              text: 'Annual Review',
              language: 'eng',
              partNumber: '12',
              yearOfAnnual: '2024',
              collationKey: 'annual review',
            },
          ]),
        }),
      ]);

      expect(titlesOf(reduced)).toEqual([[true, 'Annual Review', '', 'Annual Review', 'EN']]);
      const [loss] = findingsOf(reduced.plan, 'TITLE_STRUCTURE_LOSS');
      expect(loss.detail.kinds).toEqual(['PART_NUMBER', 'YEAR_OF_ANNUAL', 'COLLATION_KEY']);
    });

    it('does not guess how several title elements at one level split into a title and subtitle', () => {
      const reduced = reduce([
        product({
          descriptive: titleDetailXml('01', [
            { sequence: '1', text: 'Part one', language: 'eng' },
            { sequence: '2', text: 'Part two', language: 'eng' },
          ]),
        }),
      ]);

      expect(findingsOf(reduced.plan, 'TITLE_ELEMENTS_UNREPRESENTABLE')).toEqual([
        expect.objectContaining({
          classification: 'TARGET_UNREPRESENTABLE',
          detail: expect.objectContaining({ order: 'SEQUENCED' }),
        }),
      ]);
      expect(titlesOf(reduced)).toEqual([]);
    });

    it('refuses title text Thoth would read as markup rather than stripping or reinterpreting it', () => {
      const reduced = reduce([
        product({ descriptive: titleDetailXml('01', [{ text: 'On &lt;i&gt;Cities&lt;/i&gt;', language: 'eng' }]) }),
      ]);

      const [markup] = findingsOf(reduced.plan, 'TITLE_MARKUP_UNREPRESENTABLE');
      expect(markup.classification).toBe('TARGET_UNREPRESENTABLE');
      expect(titlesOf(reduced)).toEqual([]);
      expect(resolveOnly(reduced).pendingFindingKeys).toContain(markup.key);
    });

    it('plans a plain title as plain text, whatever its characters look like, and never as markup', () => {
      const reduced = reduce([
        product({
          descriptive: titleDetailXml('01', [{ text: 'When a &lt; b &gt; c', subtitle: 'A Proof', language: 'eng' }]),
        }),
      ]);

      expect(resolveOnly(reduced).values.titles).toEqual([
        expect.objectContaining({
          title: 'When a < b > c',
          fullTitle: 'When a < b > c: A Proof',
          sourceMarkupFormat: 'PLAIN_TEXT',
        }),
      ]);
      expect(reduced.plan.findings.filter(({ family }) => family === 'TITLE')).toEqual([]);
    });
  });

  describe('TitleStatement', () => {
    const statementOf = (statement: string) =>
      reduce([
        product({
          descriptive: titleDetailXml('01', [{ text: 'Cities', subtitle: 'A History', language: 'eng' }], statement),
        }),
      ]);
    const plannedOf = (reduced: Reduced) =>
      resolveOnly(reduced).values.titles.map(({ title, subtitle, fullTitle, sourceMarkupFormat }) => [
        title,
        subtitle,
        fullTitle,
        sourceMarkupFormat,
      ]);

    it('prefers a plain TitleStatement as the full title, planned as plain text', () => {
      const reduced = statementOf('<TitleStatement language="eng">Cities — a history in ten walks</TitleStatement>');

      expect(titlesOf(reduced)).toEqual([[true, 'Cities', 'A History', 'Cities — a history in ten walks', 'EN']]);
      expect(plannedOf(reduced)).toEqual([['Cities', 'A History', 'Cities — a history in ten walks', 'PLAIN_TEXT']]);
    });

    it('keeps a TitleStatement in Thoth JATS title markup as the full title, planned as JATS for the whole row', () => {
      const reduced = statementOf(
        '<TitleStatement textformat="03" language="eng">&lt;italic&gt;Cities&lt;/italic&gt;: A History</TitleStatement>',
      );

      expect(plannedOf(reduced)).toEqual([['Cities', 'A History', '<italic>Cities</italic>: A History', 'JATS_XML']]);
      expect(reduced.plan.findings.filter(({ family }) => family === 'TITLE')).toEqual([]);
    });

    it('refuses before any mutation a JATS TitleStatement whose structure a Thoth title cannot hold', () => {
      const reduced = statementOf(
        '<TitleStatement textformat="03">&lt;p&gt;&lt;italic&gt;Cities&lt;/italic&gt;: A History&lt;/p&gt;</TitleStatement>',
      );

      expect(plannedOf(reduced)).toEqual([['Cities', 'A History', 'Cities: A History', 'PLAIN_TEXT']]);
      expect(findingsOf(reduced.plan, 'TITLE_STATEMENT_UNREPRESENTABLE')).toEqual([
        expect.objectContaining({
          classification: 'TARGET_UNREPRESENTABLE',
          blocking: false,
          detail: { reason: 'MARKUP', tags: ['p'] },
        }),
      ]);
    });

    it('does not send an HTML TitleStatement through a row whose plain title and subtitle the HTML input refuses', () => {
      const reduced = statementOf(
        '<TitleStatement textformat="02">&lt;em&gt;Cities&lt;/em&gt;: A History</TitleStatement>',
      );

      expect(plannedOf(reduced)).toEqual([['Cities', 'A History', 'Cities: A History', 'PLAIN_TEXT']]);
      expect(findingsOf(reduced.plan, 'TITLE_STATEMENT_UNREPRESENTABLE')).toEqual([
        expect.objectContaining({
          classification: 'TARGET_UNREPRESENTABLE',
          blocking: false,
          detail: { reason: 'SINGLE_FORMAT_ROW', tags: ['em'] },
        }),
      ]);
    });

    it('keeps the compiled full title, and says why, when the TitleStatement holds XHTML elements', () => {
      const reduced = statementOf('<TitleStatement textformat="05"><em>Cities</em>: A History</TitleStatement>');

      expect(titlesOf(reduced)).toEqual([[true, 'Cities', 'A History', 'Cities: A History', 'EN']]);
      expect(plannedOf(reduced)).toEqual([['Cities', 'A History', 'Cities: A History', 'PLAIN_TEXT']]);
      expect(findingsOf(reduced.plan, 'TITLE_STATEMENT_UNREPRESENTABLE')).toEqual([
        expect.objectContaining({
          classification: 'TARGET_UNREPRESENTABLE',
          blocking: false,
          detail: { reason: 'STRUCTURE', tags: [] },
        }),
      ]);
    });
  });

  describe('canonical and alternate title roles', () => {
    it.each(['03', '06', '16'])(
      'keeps a TitleType %s title in another locale as a non-canonical title, with its role disclosed',
      (type) => {
        const reduced = reduce([
          product({
            descriptive:
              titleDetailXml('01', [{ text: 'Cities', language: 'eng' }]) +
              titleDetailXml(type, [{ text: 'Ciudades', language: 'spa' }]),
          }),
        ]);

        expect(titlesOf(reduced)).toEqual([
          [true, 'Cities', '', 'Cities', 'EN'],
          [false, 'Ciudades', '', 'Ciudades', 'ES'],
        ]);
        expect(findingsOf(reduced.plan, 'TITLE_ROLE_NOT_REPRESENTED')).toEqual([
          expect.objectContaining({ classification: 'SUPPORTED_WITH_WARNING', detail: { titleType: type } }),
        ]);
      },
    );

    it.each(['02', '04', '05', '07', '08', '10', '11', '12', '13', '14', '15'])(
      'keeps TitleType %s out of the Thoth titles as a disclosed loss',
      (type) => {
        const reduced = reduce([
          product({
            descriptive:
              titleDetailXml('01', [{ text: 'Cities', language: 'eng' }]) +
              titleDetailXml(type, [{ text: 'Other', language: 'fre' }]),
          }),
        ]);

        expect(titlesOf(reduced)).toEqual([[true, 'Cities', '', 'Cities', 'EN']]);
        expect(findingsOf(reduced.plan, 'TITLE_TYPE_UNREPRESENTABLE')).toEqual([
          expect.objectContaining({
            classification: 'TARGET_UNREPRESENTABLE',
            blocking: false,
            detail: { titleTypes: [type] },
          }),
        ]);
      },
    );

    it.each(['06', '00', '05'])(
      'never promotes a lone TitleType %s title to canonical: the publisher chooses it',
      (type) => {
        const reduced = reduce([
          product({ descriptive: titleDetailXml(type, [{ text: 'Ciudades', language: 'spa' }]) }),
        ]);

        const [missing] = findingsOf(reduced.plan, 'TITLE_CANONICAL_MISSING');
        expect(missing).toMatchObject({ classification: 'TARGET_INPUT_REQUIRED', blocking: true });
        expect(missing.resolution.kind).toBe('CHOICE');
        expect(titlesOf(reduced)).toEqual([]);
        const [option] = missing.resolution.kind === 'CHOICE' ? missing.resolution.options : [];
        expect(option.label).toContain('Ciudades');
        expect(titlesOf(reduced, { [missing.key]: option.key })).toEqual([[true, 'Ciudades', '', 'Ciudades', 'ES']]);
      },
    );

    it('never picks one of several distinct Type-01 titles by document order', () => {
      const reduced = reduce([
        product({
          descriptive:
            titleDetailXml('01', [{ text: 'Cities', language: 'eng' }]) +
            titleDetailXml('01', [{ text: 'Towns', language: 'eng' }]),
        }),
      ]);

      const [conflict] = findingsOf(reduced.plan, 'TITLE_CANONICAL_CONFLICT');
      expect(conflict).toMatchObject({ classification: 'TARGET_INPUT_REQUIRED', blocking: true });
      expect(titlesOf(reduced)).toEqual([]);
      const options = conflict.resolution.kind === 'CHOICE' ? conflict.resolution.options : [];
      expect(options.map(({ label }) => label)).toEqual(['Cities (EN)', 'Towns (EN)']);
      // The other same-locale candidate cannot also be a Thoth title of the Work.
      expect(titlesOf(reduced, { [conflict.key]: options[1].key })).toEqual([[true, 'Towns', '', 'Towns', 'EN']]);
    });

    it('treats an exact repeat of the Type-01 title as one title', () => {
      const reduced = reduce([
        product({
          descriptive:
            titleDetailXml('01', [{ text: 'Cities', language: 'eng' }]) +
            titleDetailXml('01', [{ text: 'Cities', language: 'eng' }]),
        }),
      ]);

      expect(findingsOf(reduced.plan, 'TITLE_CANONICAL_CONFLICT')).toEqual([]);
      expect(titlesOf(reduced)).toEqual([[true, 'Cities', '', 'Cities', 'EN']]);
    });

    it('drops, with a disclosure, an alternate title that competes with the canonical title for its locale', () => {
      const reduced = reduce([
        product({
          descriptive:
            titleDetailXml('01', [{ text: 'Cities', language: 'eng' }]) +
            titleDetailXml('06', [{ text: 'Towns', language: 'eng' }]),
        }),
      ]);

      expect(titlesOf(reduced)).toEqual([[true, 'Cities', '', 'Cities', 'EN']]);
      expect(findingsOf(reduced.plan, 'TITLE_LOCALE_COLLISION')).toEqual([
        expect.objectContaining({ classification: 'TARGET_UNREPRESENTABLE', blocking: false }),
      ]);
    });
  });

  describe('locale', () => {
    it('uses the one text language of the Product for an untagged title', () => {
      const reduced = reduce([
        product({ descriptive: titleDetailXml('01', [{ text: 'Villes' }]) + languageXml('01', 'fre') }),
      ]);

      expect(titlesOf(reduced)).toEqual([[true, 'Villes', '', 'Villes', 'FR']]);
    });

    it('never defaults an untagged title to English when nothing states a language: the publisher gives the locale', () => {
      const reduced = reduce([product({ descriptive: titleDetailXml('01', [{ text: 'Cities' }]) })]);

      const [unresolved] = findingsOf(reduced.plan, 'TITLE_LOCALE_UNRESOLVED');
      expect(unresolved).toMatchObject({
        classification: 'TARGET_INPUT_REQUIRED',
        resolution: { kind: 'INPUT', input: 'LOCALE' },
      });
      expect(titlesOf(reduced)).toEqual([]);
      expect(resolveOnly(reduced).pendingFindingKeys).toContain(unresolved.key);

      // The answer is plan-bound: stored, it decides the row; cleared or not a Thoth locale, the title waits again.
      expect(titlesOf(reduced, { [unresolved.key]: 'EN_US' })).toEqual([[true, 'Cities', '', 'Cities', 'EN_US']]);
      expect(resolveOnly(reduced, { [unresolved.key]: 'EN_US' }).pendingFindingKeys).not.toContain(unresolved.key);
      expect(resolveOnly(reduced, { [unresolved.key]: 'eng' }).pendingFindingKeys).toContain(unresolved.key);
      expect(resolveOnly(reduced, {}).pendingFindingKeys).toContain(unresolved.key);
    });

    it('asks rather than chooses when the Product text is in more than one language, offering only those locales', () => {
      const reduced = reduce([
        product({
          descriptive: titleDetailXml('01', [{ text: 'Cities' }]) + languageXml('06', 'eng') + languageXml('07', 'fre'),
        }),
      ]);

      const [unresolved] = findingsOf(reduced.plan, 'TITLE_LOCALE_UNRESOLVED');
      expect(unresolved.resolution).toEqual({
        kind: 'CHOICE',
        options: [
          { key: 'EN', label: 'EN' },
          { key: 'FR', label: 'FR' },
        ],
      });
      expect(titlesOf(reduced)).toEqual([]);
      expect(titlesOf(reduced, { [unresolved.key]: 'FR' })).toEqual([[true, 'Cities', '', 'Cities', 'FR']]);
      // A locale the source offers no evidence for is not one of the answers.
      expect(titlesOf(reduced, { [unresolved.key]: 'DE' })).toEqual([]);
    });

    it('lets the publisher give the locale of a title whose language Thoth has no locale for', () => {
      const reduced = reduce([
        product({ descriptive: titleDetailXml('01', [{ text: 'Ciuitates', language: 'lat' }]) }),
      ]);

      const [unresolved] = findingsOf(reduced.plan, 'TITLE_LOCALE_UNRESOLVED');
      expect(unresolved.resolution).toEqual({ kind: 'INPUT', input: 'LOCALE' });
      expect(titlesOf(reduced, { [unresolved.key]: 'IT' })).toEqual([[true, 'Ciuitates', '', 'Ciuitates', 'IT']]);
    });

    it('uses the Header DefaultLanguageOfText and says the title locale was inherited', () => {
      const reduced = reduce(
        [product({ descriptive: titleDetailXml('01', [{ text: 'Städte' }]) })],
        {},
        headerXml('<DefaultLanguageOfText>ger</DefaultLanguageOfText>'),
      );

      expect(titlesOf(reduced)).toEqual([[true, 'Städte', '', 'Städte', 'DE']]);
      expect(findingsOf(reduced.plan, 'TITLE_HEADER_DEFAULT_LANGUAGE')).toEqual([
        expect.objectContaining({ classification: 'SUPPORTED_NORMALIZED', blocking: false }),
      ]);
    });

    it('uses an exact script-qualified locale for a declared script', () => {
      const reduced = reduce([
        product({ descriptive: titleDetailXml('01', [{ text: 'Gradovi', language: 'srp', script: 'Latn' }]) }),
      ]);

      expect(titlesOf(reduced)).toEqual([[true, 'Gradovi', '', 'Gradovi', 'SR_LATN']]);
    });

    it('keeps the base locale, and says so, when Thoth has no locale for the declared script', () => {
      const reduced = reduce([
        product({ descriptive: titleDetailXml('01', [{ text: 'Cities', language: 'eng', script: 'Latn' }]) }),
      ]);

      expect(titlesOf(reduced)).toEqual([[true, 'Cities', '', 'Cities', 'EN']]);
      expect(findingsOf(reduced.plan, 'TITLE_SCRIPT_NOT_REPRESENTED')).toEqual([
        expect.objectContaining({ classification: 'SUPPORTED_WITH_WARNING', blocking: false }),
      ]);
    });

    it('never picks the first language when a title and its subtitle declare different ones: the publisher chooses', () => {
      const reduced = reduce([
        product({
          descriptive: titleDetailXml('01', [
            { text: 'Cities', language: 'eng', subtitle: 'Une histoire', subtitleLanguage: 'fre' },
          ]),
        }),
      ]);

      const [conflict] = findingsOf(reduced.plan, 'TITLE_LANGUAGE_CONFLICT');
      expect(conflict).toMatchObject({
        classification: 'TARGET_INPUT_REQUIRED',
        resolution: {
          kind: 'CHOICE',
          options: [
            { key: 'EN', label: 'EN (eng)' },
            { key: 'FR', label: 'FR (fre)' },
          ],
        },
      });
      expect(titlesOf(reduced)).toEqual([]);
      expect(resolveOnly(reduced).pendingFindingKeys).toContain(conflict.key);
      expect(titlesOf(reduced, { [conflict.key]: 'FR' })).toEqual([
        [true, 'Cities', 'Une histoire', 'Cities: Une histoire', 'FR'],
      ]);
      expect(resolveOnly(reduced, { [conflict.key]: 'FR' }).pendingFindingKeys).toEqual([]);
    });
  });

  describe('grouped manifestations', () => {
    it('makes identical titles across manifestations one Thoth title', () => {
      const reduced = reduce(
        [ISBN_A, ISBN_B].map((isbn, index) =>
          product({
            ref: `m${index}`,
            isbn,
            related: manifestationOf(),
            descriptive: titleDetailXml('01', [{ text: 'Cities', language: 'eng' }]),
          }),
        ),
      );

      expect(titlesOf(reduced)).toEqual([[true, 'Cities', '', 'Cities', 'EN']]);
    });

    it('turns conflicting Type-01 titles across manifestations into one deterministic choice', () => {
      const reduced = reduce([
        product({
          ref: 'm1',
          related: manifestationOf(),
          descriptive: titleDetailXml('01', [{ text: 'Cities', language: 'eng' }]),
        }),
        product({
          ref: 'm2',
          isbn: ISBN_B,
          related: manifestationOf(),
          descriptive: titleDetailXml('01', [{ text: 'Villes', language: 'fre' }]),
        }),
      ]);

      const conflicts = findingsOf(reduced.plan, 'TITLE_CANONICAL_CONFLICT');
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toMatchObject({ productKey: null, blocking: true });
      const options = conflicts[0].resolution.kind === 'CHOICE' ? conflicts[0].resolution.options : [];
      expect(options.map(({ label }) => label)).toEqual(['Cities (EN)', 'Villes (FR)']);
      // The other localized candidate stays, non-canonical: its Type-01 role is what Thoth cannot mark.
      expect(titlesOf(reduced, { [conflicts[0].key]: options[1].key })).toEqual([
        [true, 'Villes', '', 'Villes', 'FR'],
        [false, 'Cities', '', 'Cities', 'EN'],
      ]);
      // The same file, planned twice, asks the same question under the same key.
      const again = reduce([
        product({
          ref: 'm1',
          related: manifestationOf(),
          descriptive: titleDetailXml('01', [{ text: 'Cities', language: 'eng' }]),
        }),
        product({
          ref: 'm2',
          isbn: ISBN_B,
          related: manifestationOf(),
          descriptive: titleDetailXml('01', [{ text: 'Villes', language: 'fre' }]),
        }),
      ]);
      expect(findingsOf(again.plan, 'TITLE_CANONICAL_CONFLICT')[0]).toEqual(conflicts[0]);
    });

    it('does not read a manifestation without titles as a conflict', () => {
      const reduced = reduce([
        product({
          ref: 'm1',
          related: manifestationOf(),
          descriptive: titleDetailXml('01', [{ text: 'Cities', language: 'eng' }]),
        }),
        product({ ref: 'm2', isbn: ISBN_B, related: manifestationOf(), descriptive: '' }),
      ]);

      expect(titlesOf(reduced)).toEqual([[true, 'Cities', '', 'Cities', 'EN']]);
      expect(findingsOf(reduced.plan, 'TITLE_CANONICAL_MISSING')).toEqual([]);
    });
  });

  describe('ContentItem scope', () => {
    const chapter = (title: string) =>
      `<ContentItem><LevelSequenceNumber>1</LevelSequenceNumber><TextItem><TextItemType>03</TextItemType></TextItem>${title}</ContentItem>`;
    const itemPath = `${PRODUCT_1}/ContentDetail[1]/ContentItem[1]`;

    it('reduces a chapter title at its own level with the same reducer, falling back to the Product text language', () => {
      const reduced = reduce([
        product({
          descriptive: titleXml('Cities') + languageXml('01', 'eng'),
          content: chapter(titleDetailXml('01', [{ level: '04', text: 'Walking', subtitle: 'An introduction' }])),
        }),
      ]);

      const productKey = reduced.sourcePlan.products[0].productKey;
      const item = reduced.plan.products[productKey].contentItems[itemPath];
      expect(
        resolveOnixDescriptiveWork(reduced.plan, onlyGroupKey(reduced), { choices: {}, thothProfileActive: false })
          .values.titles,
      ).toHaveLength(1);
      expect(
        item.titles.canonical.map(({ title, subtitle, fullTitle, localeCode }) => [
          title,
          subtitle,
          fullTitle,
          localeCode,
        ]),
      ).toEqual([['Walking', 'An introduction', 'Walking: An introduction', 'EN']]);
    });

    it('never uses a Product-level title for a chapter that has none at its own level', () => {
      const reduced = reduce([
        product({ content: chapter(titleDetailXml('01', [{ level: '01', text: 'Cities', language: 'eng' }])) }),
      ]);

      const productKey = reduced.sourcePlan.products[0].productKey;
      expect(reduced.plan.products[productKey].contentItems[itemPath].titles.canonical).toEqual([]);
      expect(findingsOf(reduced.plan, 'TITLE_CANONICAL_MISSING')).toEqual([
        expect.objectContaining({ locations: [expect.objectContaining({ path: itemPath })] }),
      ]);
    });
  });

  it('never repairs a title from another element when the Product has no TitleDetail at all', () => {
    const reduced = reduce([product({ descriptive: '' })]);

    expect(titlesOf(reduced)).toEqual([]);
    // Nothing is taken from elsewhere in the record: only a title the publisher enters answers it.
    expect(findingsOf(reduced.plan, 'TITLE_CANONICAL_MISSING')).toEqual([
      expect.objectContaining({ blocking: true, resolution: { kind: 'INPUT', input: 'TEXT' } }),
    ]);
    expect(titlePath(1)).toContain('TitleDetail[1]');
  });
});

const date = (role: string, value: string, format = '00') =>
  `<PublishingDate><PublishingDateRole>${role}</PublishingDateRole><Date dateformat="${format}">${value}</Date></PublishingDate>`;

const publishing = (...parts: string[]) => parts.join('');

const lifecycleOf = (reduced: Reduced, choices: Record<string, string> = {}) => {
  const { values } = resolveOnly(reduced, choices);

  return [values.status, values.publicationDate, values.withdrawnDate];
};

const replacedBy = (isbn = ISBN_D) =>
  `<RelatedProduct><ProductRelationCode>05</ProductRelationCode><ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>${isbn}</IDValue></ProductIdentifier></RelatedProduct>`;

describe('reduceOnixDescriptive: lifecycle (ONIX-AUDIT-PUBLISHING-DETAIL-01 5543477343 F-G)', () => {
  it.each([
    ['01', 'CANCELLED'],
    ['02', 'FORTHCOMING'],
    ['03', 'POSTPONED_INDEFINITELY'],
  ])('maps PublishingStatus %s exactly to %s', (code, status) => {
    const reduced = reduce([product({ publishing: `<PublishingStatus>${code}</PublishingStatus>` })]);

    expect(lifecycleOf(reduced)).toEqual([status, null, null]);
    expect(reduced.plan.findings.filter(({ family }) => family === 'LIFECYCLE')).toEqual([]);
  });

  it('maps Active with its complete publication date', () => {
    const reduced = reduce([
      product({ publishing: publishing('<PublishingStatus>04</PublishingStatus>', date('01', '20240315')) }),
    ]);

    expect(lifecycleOf(reduced)).toEqual(['ACTIVE', '2024-03-15', null]);
  });

  it('requires, rather than invents, the publication date an Active Work must have, and takes the one the publisher gives', () => {
    const reduced = reduce([product({ publishing: '<PublishingStatus>04</PublishingStatus>' })]);

    const [required] = findingsOf(reduced.plan, 'LIFECYCLE_DATE_REQUIRED');
    expect(required).toMatchObject({
      classification: 'TARGET_INPUT_REQUIRED',
      blocking: true,
      detail: { status: 'ACTIVE', role: '01' },
      resolution: { kind: 'INPUT', input: 'DATE' },
    });
    expect(resolveOnly(reduced).pendingFindingKeys).toContain(required.key);
    expect(lifecycleOf(reduced)).toEqual([null, null, null]);

    expect(lifecycleOf(reduced, { [required.key]: '2024-03-15' })).toEqual(['ACTIVE', '2024-03-15', null]);
    expect(resolveOnly(reduced, { [required.key]: '2024-03-15' }).pendingFindingKeys).toEqual([]);
  });

  it.each(['2024-02-30', '2023-02-29', '2024-3-15', '2024-03', '20240315', '15/03/2024', '0024-03-15', ''])(
    'never takes %j as the publication date: an incomplete or impossible date still blocks',
    (value) => {
      const reduced = reduce([product({ publishing: '<PublishingStatus>04</PublishingStatus>' })]);
      const [required] = findingsOf(reduced.plan, 'LIFECYCLE_DATE_REQUIRED');

      expect(lifecycleOf(reduced, { [required.key]: value })).toEqual([null, null, null]);
      expect(resolveOnly(reduced, { [required.key]: value }).pendingFindingKeys).toContain(required.key);
    },
  );

  it.each(['13', '18'])('normalises %s to Active and discloses the sales qualifier it loses', (code) => {
    const reduced = reduce([
      product({ publishing: publishing(`<PublishingStatus>${code}</PublishingStatus>`, date('01', '20240315')) }),
    ]);

    expect(lifecycleOf(reduced)).toEqual(['ACTIVE', '2024-03-15', null]);
    expect(findingsOf(reduced.plan, 'LIFECYCLE_STATUS_NORMALISED')).toEqual([
      expect.objectContaining({ classification: 'SUPPORTED_WITH_WARNING', blocking: false }),
    ]);
  });

  it.each(['07', '11', '17'])('maps %s to Withdrawn with its publication and withdrawal dates', (code) => {
    const reduced = reduce([
      product({
        publishing: publishing(
          `<PublishingStatus>${code}</PublishingStatus>`,
          date('01', '20200101'),
          date('13', '20240101'),
        ),
      }),
    ]);

    expect(lifecycleOf(reduced)).toEqual(['WITHDRAWN', '2020-01-01', '2024-01-01']);
  });

  it('requires the withdrawal date a Withdrawn Work must have, and takes one strictly after publication', () => {
    const reduced = reduce([
      product({ publishing: publishing('<PublishingStatus>07</PublishingStatus>', date('01', '20200101')) }),
    ]);

    const [required] = findingsOf(reduced.plan, 'LIFECYCLE_DATE_REQUIRED');
    expect(required).toMatchObject({
      detail: { status: 'WITHDRAWN', role: '13' },
      resolution: { kind: 'INPUT', input: 'DATE' },
    });
    expect(lifecycleOf(reduced, { [required.key]: '2024-01-01' })).toEqual(['WITHDRAWN', '2020-01-01', '2024-01-01']);

    // The same day, or an earlier one, is no withdrawal after publication: the order invariant blocks it.
    ['2020-01-01', '2019-12-31'].forEach((value) => {
      const resolved = resolveOnly(reduced, { [required.key]: value });

      expect([resolved.values.status, resolved.values.withdrawnDate]).toEqual([null, null]);
      expect(resolved.findings).toEqual([
        expect.objectContaining({ code: 'LIFECYCLE_DATE_ORDER_INVALID', blocking: true }),
      ]);
      expect(resolved.pendingFindingKeys).toEqual([resolved.findings[0].key]);
    });
  });

  it('asks for both dates a chosen Withdrawn status needs, keeps the publication date whatever status needs it, and checks their order', () => {
    const reduced = reduce([product({ publishing: '<PublishingStatus>00</PublishingStatus>' })]);
    const [status] = findingsOf(reduced.plan, 'LIFECYCLE_STATUS_REQUIRED');
    const withdrawn = resolveOnly(reduced, { [status.key]: 'WITHDRAWN' });
    const [publication, withdrawal] = withdrawn.findings.filter(({ code }) => code === 'LIFECYCLE_DATE_REQUIRED');

    expect([publication.detail.role, withdrawal.detail.role]).toEqual(['01', '13']);
    expect([publication.resolution, withdrawal.resolution]).toEqual([
      { kind: 'INPUT', input: 'DATE' },
      { kind: 'INPUT', input: 'DATE' },
    ]);
    expect(withdrawn.pendingFindingKeys).toEqual([publication.key, withdrawal.key]);

    const answers = { [status.key]: 'WITHDRAWN', [publication.key]: '2020-05-01', [withdrawal.key]: '2023-05-01' };

    expect(lifecycleOf(reduced, answers)).toEqual(['WITHDRAWN', '2020-05-01', '2023-05-01']);
    expect(lifecycleOf(reduced, { ...answers, [status.key]: 'ACTIVE' })).toEqual(['ACTIVE', '2020-05-01', null]);
    expect(resolveOnly(reduced, { ...answers, [status.key]: 'ACTIVE' }).findings).toEqual([
      expect.objectContaining({ code: 'LIFECYCLE_DATE_REQUIRED', key: publication.key }),
    ]);
    // Cleared, a date question stands again.
    expect(
      resolveOnly(reduced, { [status.key]: 'WITHDRAWN', [withdrawal.key]: '2023-05-01' }).pendingFindingKeys,
    ).toEqual([publication.key]);
    expect(resolveOnly(reduced, { ...answers, [withdrawal.key]: '2020-04-30' }).pendingFindingKeys).toEqual([
      expect.stringContaining('LIFECYCLE_DATE_ORDER_INVALID'),
    ]);
  });

  it('never reads temporary withdrawal (16) as permanent, nor its expected-availability date as a withdrawal date', () => {
    const reduced = reduce([
      product({
        publishing: publishing(
          '<PublishingStatus>16</PublishingStatus>',
          date('01', '20200101'),
          date('22', '20270101'),
        ),
      }),
    ]);

    const [required] = findingsOf(reduced.plan, 'LIFECYCLE_STATUS_REQUIRED');
    expect(required).toMatchObject({
      classification: 'TARGET_INPUT_REQUIRED',
      blocking: true,
      detail: { publishingStatus: '16' },
    });
    const options = required.resolution.kind === 'CHOICE' ? required.resolution.options.map(({ key }) => key) : [];
    expect(options).not.toContain('SUPERSEDED');
    expect(lifecycleOf(reduced)).toEqual([null, '2020-01-01', null]);
    expect(lifecycleOf(reduced, { [required.key]: 'ACTIVE' })).toEqual(['ACTIVE', '2020-01-01', null]);
    // Chosen Withdrawn, it still has no withdrawal date: role 22 is never one.
    expect(resolveOnly(reduced, { [required.key]: 'WITHDRAWN' }).pendingFindingKeys.length).toBeGreaterThan(0);
  });

  it.each([
    ['00', '<PublishingStatus>00</PublishingStatus>'],
    ['09', '<PublishingStatus>09</PublishingStatus>'],
    ['05', '<PublishingStatus>05</PublishingStatus>'],
    ['06', '<PublishingStatus>06</PublishingStatus>'],
    ['10', '<PublishingStatus>10</PublishingStatus>'],
    ['12', '<PublishingStatus>12</PublishingStatus>'],
    ['15', '<PublishingStatus>15</PublishingStatus>'],
    ['08', '<PublishingStatus>08</PublishingStatus>'],
    ['omitted', ''],
  ])('asks for the Work status when PublishingStatus is %s, and never defaults it to Forthcoming', (_code, status) => {
    const reduced = reduce([product({ publishing: status })]);

    expect(findingsOf(reduced.plan, 'LIFECYCLE_STATUS_REQUIRED')).toHaveLength(1);
    expect(lifecycleOf(reduced)[0]).toBeNull();
  });

  it.each(['07', '08', '11', '17'])(
    'leaves a %s record with a replacement relation to the relation reducer instead of guessing Superseded',
    (code) => {
      const reduced = reduce([
        product({
          publishing: publishing(
            `<PublishingStatus>${code}</PublishingStatus>`,
            date('01', '20200101'),
            date('13', '20240101'),
          ),
          related: replacedBy(),
        }),
      ]);

      const [unresolved] = findingsOf(reduced.plan, 'LIFECYCLE_REPLACEMENT_UNRESOLVED');
      expect(unresolved).toMatchObject({
        classification: 'TARGET_INPUT_REQUIRED',
        blocking: true,
        resolution: { kind: 'NONE' },
      });
      expect(lifecycleOf(reduced)[0]).toBeNull();
    },
  );

  it('never accepts 21 as Superseded: an unknown status is reported, not defaulted', () => {
    const reduced = reduce([product({ publishing: '<PublishingStatus>21</PublishingStatus>' })]);

    expect(findingsOf(reduced.plan, 'LIFECYCLE_STATUS_UNUSABLE')).toEqual([
      expect.objectContaining({ classification: 'PREFLIGHT_GAP', blocking: true }),
    ]);
    expect(lifecycleOf(reduced)[0]).toBeNull();
  });

  describe('dates', () => {
    it('never turns a year-only publication date into a day', () => {
      const reduced = reduce([
        product({ publishing: publishing('<PublishingStatus>02</PublishingStatus>', date('01', '2024', '05')) }),
      ]);

      expect(lifecycleOf(reduced)).toEqual(['FORTHCOMING', null, null]);
      expect(findingsOf(reduced.plan, 'LIFECYCLE_DATE_UNREPRESENTABLE')).toEqual([
        expect.objectContaining({ classification: 'TARGET_UNREPRESENTABLE', blocking: false }),
      ]);
    });

    it('collapses repeated equal dates and blocks contradictory ones', () => {
      const equal = reduce([
        product({
          publishing: publishing(
            '<PublishingStatus>04</PublishingStatus>',
            date('01', '20240315'),
            date('01', '20240315'),
          ),
        }),
      ]);
      const conflicting = reduce([
        product({
          publishing: publishing(
            '<PublishingStatus>04</PublishingStatus>',
            date('01', '20240315'),
            date('01', '20240316'),
          ),
        }),
      ]);

      expect(lifecycleOf(equal)).toEqual(['ACTIVE', '2024-03-15', null]);
      expect(findingsOf(conflicting.plan, 'LIFECYCLE_DATE_CONFLICT')).toEqual([
        expect.objectContaining({ classification: 'SOURCE_CONFLICT', blocking: true }),
      ]);
    });

    it('discloses publishing dates in roles Thoth has no field for', () => {
      const reduced = reduce([
        product({
          publishing: publishing(
            '<PublishingStatus>04</PublishingStatus>',
            date('01', '20240315'),
            date('11', '20100101'),
            date('09', '20231201'),
          ),
        }),
      ]);

      expect(findingsOf(reduced.plan, 'LIFECYCLE_DATE_UNREPRESENTABLE')).toEqual([
        expect.objectContaining({ detail: { roles: ['11', '09'] } }),
      ]);
    });

    it('does not store a withdrawal date on a Work whose status cannot hold one, and says so', () => {
      const reduced = reduce([
        product({
          publishing: publishing(
            '<PublishingStatus>04</PublishingStatus>',
            date('01', '20240315'),
            date('13', '20250101'),
          ),
        }),
      ]);

      expect(lifecycleOf(reduced)).toEqual(['ACTIVE', '2024-03-15', null]);
      expect(findingsOf(reduced.plan, 'LIFECYCLE_DATE_NOT_STORED')).toHaveLength(1);
    });

    it('blocks a withdrawal that is not strictly after publication, as the database requires', () => {
      const reduced = reduce([
        product({
          publishing: publishing(
            '<PublishingStatus>07</PublishingStatus>',
            date('01', '20240101'),
            date('13', '20240101'),
          ),
        }),
      ]);

      const [invalid] = findingsOf(reduced.plan, 'LIFECYCLE_DATE_ORDER_INVALID');
      expect(invalid).toMatchObject({ blocking: true });
      expect(resolveOnly(reduced).pendingFindingKeys).toContain(invalid.key);
    });
  });

  describe('grouped manifestations', () => {
    it('keeps the shared lifecycle of manifestations that agree, and ignores one that says nothing', () => {
      const reduced = reduce([
        product({
          ref: 'm1',
          related: manifestationOf(),
          publishing: publishing('<PublishingStatus>04</PublishingStatus>', date('01', '20240315')),
        }),
        product({
          ref: 'm2',
          isbn: ISBN_B,
          related: manifestationOf(),
          publishing: publishing('<PublishingStatus>04</PublishingStatus>'),
        }),
      ]);

      expect(lifecycleOf(reduced)).toEqual(['ACTIVE', '2024-03-15', null]);
    });

    it('blocks manifestations whose statuses or dates disagree rather than picking one', () => {
      const reduced = reduce([
        product({
          ref: 'm1',
          related: manifestationOf(),
          publishing: publishing('<PublishingStatus>04</PublishingStatus>', date('01', '20240315')),
        }),
        product({
          ref: 'm2',
          isbn: ISBN_B,
          related: manifestationOf(),
          publishing: publishing('<PublishingStatus>02</PublishingStatus>', date('01', '20240601')),
        }),
      ]);

      const conflicts = findingsOf(reduced.plan, 'LIFECYCLE_GROUP_CONFLICT');
      expect(conflicts).toEqual([
        expect.objectContaining({
          classification: 'SOURCE_CONFLICT',
          productKey: null,
          detail: { fields: ['status', 'publicationDate'] },
        }),
      ]);
      expect(lifecycleOf(reduced)).toEqual([null, null, null]);
    });
  });
});

const copyright = (...parts: string[]) => `<CopyrightStatement>${parts.join('')}</CopyrightStatement>`;
const personOwner = (name: string) => `<CopyrightOwner><PersonName>${name}</PersonName></CopyrightOwner>`;

describe('reduceOnixDescriptive: copyright (5543477343 H)', () => {
  it('keeps a personal or corporate copyright owner as the Thoth copyright holder', () => {
    const person = reduce([
      product({
        publishing: publishing('<PublishingStatus>02</PublishingStatus>', copyright(personOwner('Ada Lovelace'))),
      }),
    ]);
    const corporate = reduce([
      product({
        publishing: publishing(
          '<PublishingStatus>02</PublishingStatus>',
          copyright('<CopyrightOwner><CorporateName>Example Trust</CorporateName></CopyrightOwner>'),
        ),
      }),
    ]);

    expect(resolveOnly(person).values.copyrightHolder).toBe('Ada Lovelace');
    expect(resolveOnly(corporate).values.copyrightHolder).toBe('Example Trust');
  });

  it('joins every distinct copyright owner in source order, as Thoth itself exports them', () => {
    const reduced = reduce([
      product({
        publishing: publishing(
          '<PublishingStatus>02</PublishingStatus>',
          copyright(personOwner('Ada Lovelace')),
          copyright(personOwner('Charles Babbage'), personOwner('Ada Lovelace')),
        ),
      }),
    ]);

    expect(resolveOnly(reduced).values.copyrightHolder).toBe('Ada Lovelace; Charles Babbage');
    expect(findingsOf(reduced.plan, 'COPYRIGHT_NORMALISED')).toEqual([
      expect.objectContaining({ classification: 'SUPPORTED_NORMALIZED' }),
    ]);
  });

  it('keeps phonogram and database rights, years and owner identifiers out of the holder, and says so', () => {
    const reduced = reduce([
      product({
        publishing: publishing(
          '<PublishingStatus>02</PublishingStatus>',
          copyright('<CopyrightType>C</CopyrightType><CopyrightYear>2024</CopyrightYear>', personOwner('Ada Lovelace')),
          copyright('<CopyrightType>P</CopyrightType>', personOwner('Record Label')),
          copyright(
            '<CopyrightOwner><CopyrightOwnerIdentifier><CopyrightOwnerIDType>16</CopyrightOwnerIDType><IDValue>0000000121032683</IDValue></CopyrightOwnerIdentifier></CopyrightOwner>',
          ),
        ),
      }),
    ]);

    expect(resolveOnly(reduced).values.copyrightHolder).toBe('Ada Lovelace');
    expect(findingsOf(reduced.plan, 'COPYRIGHT_UNREPRESENTABLE')).toEqual([
      expect.objectContaining({ blocking: false, detail: { kinds: ['YEAR', 'RIGHTS_TYPE', 'OWNER_IDENTIFIER'] } }),
    ]);
  });

  it('blocks grouped manifestations that name different copyright holders', () => {
    const reduced = reduce([
      product({
        ref: 'm1',
        related: manifestationOf(),
        publishing: publishing('<PublishingStatus>02</PublishingStatus>', copyright(personOwner('A'))),
      }),
      product({
        ref: 'm2',
        isbn: ISBN_B,
        related: manifestationOf(),
        publishing: publishing('<PublishingStatus>02</PublishingStatus>', copyright(personOwner('B'))),
      }),
    ]);

    expect(findingsOf(reduced.plan, 'COPYRIGHT_GROUP_CONFLICT')).toHaveLength(1);
    expect(resolveOnly(reduced).values.copyrightHolder).toBe('');
  });
});

type FunderSpec = {
  readonly role: string;
  readonly name?: string;
  readonly ror?: string;
  readonly fundref?: string;
  readonly fundings?: readonly string[];
};

const funderXml = ({ role, name = 'Example Foundation', ror, fundref, fundings = [] }: FunderSpec) =>
  `<Publisher><PublishingRole>${role}</PublishingRole>` +
  (ror
    ? `<PublisherIdentifier><PublisherIDType>40</PublisherIDType><IDValue>${ror}</IDValue></PublisherIdentifier>`
    : '') +
  (fundref
    ? `<PublisherIdentifier><PublisherIDType>32</PublisherIDType><IDValue>${fundref}</IDValue></PublisherIdentifier>`
    : '') +
  `<PublisherName>${name}</PublisherName>${fundings.join('')}</Publisher>`;

const fundingXml = (...identifiers: [type: string, value: string, name?: string][]) =>
  `<Funding>${identifiers
    .map(
      ([type, value, name]) =>
        `<FundingIdentifier><FundingIDType>${type}</FundingIDType>${name ? `<IDTypeName>${name}</IDTypeName>` : ''}<IDValue>${value}</IDValue></FundingIdentifier>`,
    )
    .join('')}</Funding>`;

const ROR = 'https://ror.org/02mhbdp94';

describe('reduceOnixDescriptive: funding (5543477343 I)', () => {
  it('plans publication funding for role 14 from a declared ROR', () => {
    const reduced = reduce([
      product({
        publishing: publishing(funderXml({ role: '14', ror: '02mhbdp94' }), '<PublishingStatus>02</PublishingStatus>'),
      }),
    ]);

    expect(resolveOnly(reduced).values.funders).toEqual([
      expect.objectContaining({
        ror: ROR,
        fundrefDoi: null,
        name: 'Example Foundation',
        fundings: [{ program: '', projectName: '', projectShortname: '', grantNumber: '' }],
      }),
    ]);
  });

  it('plans role 16 funding with the research dimension disclosed as lost', () => {
    const reduced = reduce([
      product({
        publishing: publishing(funderXml({ role: '16', ror: ROR }), '<PublishingStatus>02</PublishingStatus>'),
      }),
    ]);

    expect(resolveOnly(reduced).values.funders).toHaveLength(1);
    expect(findingsOf(reduced.plan, 'FUNDING_ROLE_NORMALISED')).toHaveLength(1);
  });

  it('never turns a research-only funder (15) into publication funding', () => {
    const reduced = reduce([
      product({
        publishing: publishing(funderXml({ role: '15', ror: ROR }), '<PublishingStatus>02</PublishingStatus>'),
      }),
    ]);

    expect(resolveOnly(reduced).values.funders).toEqual([]);
    expect(findingsOf(reduced.plan, 'FUNDING_RESEARCH_ONLY_UNREPRESENTABLE')).toEqual([
      expect.objectContaining({ classification: 'TARGET_UNREPRESENTABLE', blocking: false }),
    ]);
  });

  it('keeps a publication funder the file names without a ROR or FundRef DOI, unidentified, never dropped (#209 G)', () => {
    const reduced = reduce([
      product({
        publishing: publishing(
          funderXml({ role: '14', name: 'Arcadia Fund' }),
          funderXml({ role: '15', name: 'A Research Council' }),
          '<PublishingStatus>02</PublishingStatus>',
        ),
      }),
    ]);

    // Planned for the publisher to identify among name suggestions; never matched by its name here.
    expect(resolveOnly(reduced).values.funders).toEqual([
      expect.objectContaining({
        key: 'name:Arcadia Fund',
        ror: null,
        fundrefDoi: null,
        name: 'Arcadia Fund',
        fundings: [{ program: '', projectName: '', projectShortname: '', grantNumber: '' }],
        provenance: [expect.objectContaining({ path: `${PRODUCT_1}/PublishingDetail[1]/Publisher[1]` })],
      }),
    ]);
    // A research-only funder stays a disclosed loss, however it could be identified.
    expect(findingsOf(reduced.plan, 'FUNDING_RESEARCH_ONLY_UNREPRESENTABLE')).toHaveLength(1);
    expect(findingsOf(reduced.plan, 'FUNDING_FUNDER_UNIDENTIFIED')).toEqual([]);
    expect(descriptiveLookupRequests(reduced.plan, onlyGroupKey(reduced)).institutionSearches).toEqual([
      { text: 'Arcadia Fund', ror: null, funderKey: 'name:Arcadia Fund' },
    ]);
  });

  it('blocks a funder whose declared RORs disagree', () => {
    const reduced = reduce([
      product({
        publishing: publishing(
          '<Publisher><PublishingRole>14</PublishingRole><PublisherIdentifier><PublisherIDType>40</PublisherIDType><IDValue>02mhbdp94</IDValue></PublisherIdentifier><PublisherIdentifier><PublisherIDType>40</PublisherIDType><IDValue>05dxps055</IDValue></PublisherIdentifier><PublisherName>X</PublisherName></Publisher>',
          '<PublishingStatus>02</PublishingStatus>',
        ),
      }),
    ]);

    expect(findingsOf(reduced.plan, 'FUNDING_FUNDER_CONFLICT')).toEqual([
      expect.objectContaining({ classification: 'SOURCE_CONFLICT', blocking: true }),
    ]);
  });

  it('keeps a grant DOI and arbitrary proprietary grant schemes out of the grant number', () => {
    const reduced = reduce([
      product({
        publishing: publishing(
          funderXml({
            role: '14',
            ror: ROR,
            fundings: [fundingXml(['06', '10.13039/grant-1'], ['01', 'ABC-1', 'Internal award code'])],
          }),
          '<PublishingStatus>02</PublishingStatus>',
        ),
      }),
    ]);

    expect(resolveOnly(reduced).values.funders[0].fundings).toEqual([
      { program: '', projectName: '', projectShortname: '', grantNumber: '' },
    ]);
    expect(findingsOf(reduced.plan, 'FUNDING_IDENTIFIER_UNREPRESENTABLE')).toEqual([
      expect.objectContaining({ detail: { schemes: ['06', '01:Internal award code'] } }),
    ]);
  });

  it('reads Thoth proprietary funding names only under the active Thoth compatibility profile', () => {
    const fundings = [
      fundingXml(
        ['01', 'Programme X', 'programname'],
        ['01', 'Project Y', 'projectname'],
        ['01', 'G-7', 'grantnumber'],
      ),
    ];
    const reduced = reduce([
      product({
        publishing: publishing(
          funderXml({ role: '16', ror: ROR, fundings }),
          '<PublishingStatus>02</PublishingStatus>',
        ),
      }),
    ]);

    expect(resolveOnly(reduced).values.funders[0].fundings).toEqual([
      { program: '', projectName: '', projectShortname: '', grantNumber: '' },
    ]);
    expect(resolveOnly(reduced, {}, true).values.funders[0].fundings).toEqual([
      { program: 'Programme X', projectName: 'Project Y', projectShortname: '', grantNumber: 'G-7' },
    ]);
  });
});

const website = (role: string, link: string) =>
  `<Website><WebsiteRole>${role}</WebsiteRole><WebsiteLink>${link}</WebsiteLink></Website>`;
const publisherXml = (role: string, ...websites: string[]) =>
  `<Publisher><PublishingRole>${role}</PublishingRole><PublisherName>Example Press</PublisherName>${websites.join('')}</Publisher>`;

describe('reduceOnixDescriptive: landing page and place (5543477343 D-E)', () => {
  it('takes the Work landing page only from a publisher or co-publisher website for the work', () => {
    const reduced = reduce([
      product({
        publishing: publishing(
          '<Imprint><ImprintName>Example</ImprintName></Imprint>',
          publisherXml('01', website('01', 'https://example.org'), website('02', 'https://example.org/cities')),
          publisherXml('03', website('02', 'https://sponsor.example/cities')),
          '<PublishingStatus>02</PublishingStatus>',
        ),
      }),
    ]);

    expect(resolveOnly(reduced).values.landingPage).toBe('https://example.org/cities');
    expect(findingsOf(reduced.plan, 'LANDING_PAGE_UNREPRESENTABLE')).toHaveLength(1);
  });

  it('asks which landing page Thoth keeps when eligible publisher pages differ', () => {
    const reduced = reduce([
      product({
        publishing: publishing(
          publisherXml('01', website('02', 'https://example.org/cities')),
          publisherXml('02', website('02', 'https://copublisher.example/cities')),
          '<PublishingStatus>02</PublishingStatus>',
        ),
      }),
    ]);

    const [choice] = findingsOf(reduced.plan, 'LANDING_PAGE_CHOICE_REQUIRED');
    expect(choice).toMatchObject({ classification: 'TARGET_INPUT_REQUIRED', blocking: true });
    expect(resolveOnly(reduced).values.landingPage).toBe('');
    expect(resolveOnly(reduced, { [choice.key]: 'https://copublisher.example/cities' }).values.landingPage).toBe(
      'https://copublisher.example/cities',
    );
  });

  it('maps one CityOfPublication to the Work place and keeps the country out of it', () => {
    const reduced = reduce([
      product({
        publishing: publishing(
          '<CityOfPublication>London</CityOfPublication><CountryOfPublication>GB</CountryOfPublication>',
          '<PublishingStatus>02</PublishingStatus>',
        ),
      }),
    ]);

    expect(resolveOnly(reduced).values.place).toBe('London');
    expect(findingsOf(reduced.plan, 'PLACE_UNREPRESENTABLE')).toHaveLength(1);
  });

  it('asks which city is the Work place when several are given', () => {
    const reduced = reduce([
      product({
        publishing: publishing(
          '<CityOfPublication>London</CityOfPublication><CityOfPublication>New York</CityOfPublication>',
          '<PublishingStatus>02</PublishingStatus>',
        ),
      }),
    ]);

    const [choice] = findingsOf(reduced.plan, 'PLACE_CHOICE_REQUIRED');
    expect(resolveOnly(reduced).values.place).toBe('');
    expect(resolveOnly(reduced, { [choice.key]: 'New York' }).values.place).toBe('New York');
  });
});

const COVER_URL = 'https://press.example.org/covers/a-work.jpg';
const OTHER_COVER_URL = 'https://press.example.org/covers/a-work-large.jpg';

const resourceFeature = (type: string, note = '') =>
  `<ResourceFeature><ResourceFeatureType>${type}</ResourceFeatureType>${note ? `<FeatureNote>${note}</FeatureNote>` : ''}</ResourceFeature>`;
const versionFeature = (type: string, value: string) =>
  `<ResourceVersionFeature><ResourceVersionFeatureType>${type}</ResourceVersionFeatureType><FeatureValue>${value}</FeatureValue></ResourceVersionFeature>`;
const contentDate = (role: string, value = '20270101') =>
  `<ContentDate><ContentDateRole>${role}</ContentDateRole><Date dateformat="00">${value}</Date></ContentDate>`;

type ResourceVersionSpec = {
  readonly form?: string;
  readonly links?: readonly string[];
  readonly features?: readonly string[];
  /** ONIX 3.1 usage terms of the version: EpubUsageConstraint or EpubLicense. */
  readonly terms?: string;
  readonly dates?: readonly string[];
};

const resourceVersion = ({
  form = '01',
  links = [COVER_URL],
  features = [],
  terms = '',
  dates = [],
}: ResourceVersionSpec = {}) =>
  `<ResourceVersion><ResourceForm>${form}</ResourceForm>${features.join('')}` +
  `${links.map((link) => `<ResourceLink>${link}</ResourceLink>`).join('')}${terms}${dates.join('')}</ResourceVersion>`;

type SupportingResourceSpec = {
  readonly type?: string;
  readonly audiences?: readonly string[];
  readonly territory?: string;
  readonly mode?: string;
  readonly features?: readonly string[];
  readonly versions?: readonly string[];
};

/** One SupportingResource: an unrestricted, linkable front cover image unless the case says otherwise. */
const supportingResource = ({
  type = '01',
  audiences = ['00'],
  territory = '',
  mode = '03',
  features = [],
  versions = [resourceVersion()],
}: SupportingResourceSpec = {}) =>
  `<SupportingResource><ResourceContentType>${type}</ResourceContentType>` +
  `${audiences.map((audience) => `<ContentAudience>${audience}</ContentAudience>`).join('')}${territory}` +
  `<ResourceMode>${mode}</ResourceMode>${features.join('')}${versions.join('')}</SupportingResource>`;

const coverFindings = (plan: OnixDescriptivePlan) => plan.findings.filter(({ family }) => family === 'COVER');

describe('reduceOnixDescriptive: front cover -> Work.coverUrl (ONIX-AUDIT-COLLATERAL-01 rules 13-25, 81-108; thoth-app#219 Amendment 2)', () => {
  const RESOURCE_1 = `${PRODUCT_1}/CollateralDetail[1]/SupportingResource[1]`;

  it('imports an eligible front cover: an unrestricted, linkable image at a link Thoth can store', () => {
    const reduced = reduce([product({ collateral: supportingResource() })]);

    expect(resolveOnly(reduced).values.coverUrl).toBe(COVER_URL);
    expect(coverFindings(reduced.plan)).toEqual([]);
  });

  it('never substitutes another cover image, a thumbnail, full cover or holding image, for the front cover', () => {
    const reduced = reduce([
      product({
        collateral: ['27', '29', '45'].map((type) => supportingResource({ type })).join(''),
      }),
    ]);

    expect(resolveOnly(reduced).values.coverUrl).toBeNull();
    // They are the collateral task's to reduce (#185); nothing about them is a cover finding.
    expect(coverFindings(reduced.plan)).toEqual([]);
  });

  it.each([
    ['a restricted audience', { audiences: ['01'] }, ['AUDIENCE_NOT_UNRESTRICTED']],
    ['an unrestricted audience also marked restricted', { audiences: ['00', '01'] }, ['AUDIENCE_NOT_UNRESTRICTED']],
    ['a targeted audience only', { audiences: ['03'] }, ['AUDIENCE_NOT_UNRESTRICTED']],
    ['a search-engine audience only', { audiences: ['09'] }, ['AUDIENCE_NOT_UNRESTRICTED']],
    [
      'a territory short of the world',
      { territory: '<Territory><CountriesIncluded>GB</CountriesIncluded></Territory>' },
      ['TERRITORY_RESTRICTED'],
    ],
    ['a mode that is not an image', { mode: '04' }, ['NOT_AN_IMAGE']],
    ['a required credit', { features: [resourceFeature('01', 'Photo: A. Photographer')] }, ['CREDIT_REQUIRED']],
    ['an embeddable application', { versions: [resourceVersion({ form: '03' })] }, ['EMBEDDABLE_APPLICATION']],
    [
      'a downloadable file outside the Thoth profile',
      { versions: [resourceVersion({ form: '02' })] },
      ['DOWNLOADABLE_FILE'],
    ],
    ['an availability window', { versions: [resourceVersion({ dates: [contentDate('27')] })] }, ['TEMPORAL_CONTROL']],
    [
      'a link Thoth cannot store',
      { versions: [resourceVersion({ links: ['www.press.example.org/covers/a-work.jpg'] })] },
      ['URL_UNSTORABLE'],
    ],
    [
      'several reasons at once',
      { audiences: ['01'], versions: [resourceVersion({ form: '02', dates: [contentDate('15')] })] },
      ['AUDIENCE_NOT_UNRESTRICTED', 'DOWNLOADABLE_FILE', 'TEMPORAL_CONTROL'],
    ],
  ])('imports no front cover with %s, and names why', (_case, spec, reasons) => {
    const reduced = reduce([product({ collateral: supportingResource(spec as SupportingResourceSpec) })]);
    const [finding] = coverFindings(reduced.plan);

    expect(resolveOnly(reduced).values.coverUrl).toBeNull();
    expect(resolveOnly(reduced).pendingFindingKeys).toEqual([]);
    expect(coverFindings(reduced.plan)).toHaveLength(1);
    expect(finding).toMatchObject({
      family: 'COVER',
      code: 'COVER_UNREPRESENTABLE',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      productKey: reduced.sourcePlan.products[0].productKey,
      locations: [expect.objectContaining({ path: `${RESOURCE_1}/ResourceVersion[1]/ResourceLink[1]` })],
      detail: { reasons },
    });
  });

  it('imports no front cover whose ONIX 3.1 version states usage terms Thoth cannot keep with it', () => {
    const constraint =
      '<EpubUsageConstraint><EpubUsageType>07</EpubUsageType><EpubUsageStatus>03</EpubUsageStatus></EpubUsageConstraint>';
    const root = parse(
      `<ONIXMessage release="3.1" xmlns="http://ns.editeur.org/onix/3.1/reference">${headerXml()}${product({
        collateral: supportingResource({ versions: [resourceVersion({ terms: constraint })] }),
      })}</ONIXMessage>`,
    ) as ExtendedONIXMessageRoot;
    const sourcePlan = planOnixSource(root);
    const plan = reduceOnixDescriptive(root, sourcePlan);

    expect(
      resolveOnixDescriptiveWork(plan, sourcePlan.groups[0].groupKey, { choices: {}, thothProfileActive: false }).values
        .coverUrl,
    ).toBeNull();
    expect(coverFindings(plan).map(({ code, detail }) => [code, detail.reasons])).toEqual([
      ['COVER_UNREPRESENTABLE', ['USAGE_TERMS_STATED']],
    ]);
  });

  it('takes one of several eligible links only by the choice the Work cover asks for, never the first, the largest or none silently', () => {
    const reduced = reduce([
      product({
        collateral: supportingResource({
          versions: [
            resourceVersion({ links: [COVER_URL], features: [versionFeature('02', '600')] }),
            resourceVersion({ links: [OTHER_COVER_URL], features: [versionFeature('02', '2400')] }),
          ],
        }),
      }),
    ]);
    const [choice] = findingsOf(reduced.plan, 'COVER_CHOICE_REQUIRED');

    expect(choice).toMatchObject({
      family: 'COVER',
      classification: 'TARGET_INPUT_REQUIRED',
      blocking: true,
      productKey: null,
      detail: { values: [COVER_URL, OTHER_COVER_URL] },
      resolution: {
        kind: 'CHOICE',
        options: [
          { key: COVER_URL, label: COVER_URL },
          { key: OTHER_COVER_URL, label: OTHER_COVER_URL },
          { key: 'OMIT', label: 'OMIT' },
        ],
      },
    });
    expect(resolveOnly(reduced).values.coverUrl).toBeNull();
    expect(resolveOnly(reduced).pendingFindingKeys).toContain(choice.key);
    expect(resolveOnly(reduced, { [choice.key]: OTHER_COVER_URL }).values.coverUrl).toBe(OTHER_COVER_URL);
    expect(resolveOnly(reduced, { [choice.key]: 'OMIT' }).values.coverUrl).toBeNull();
    expect(resolveOnly(reduced, { [choice.key]: 'OMIT' }).pendingFindingKeys).not.toContain(choice.key);
  });

  it('reconciles the covers of grouped manifestations at Work scope: identical ones collapse, different ones are a choice', () => {
    const grouped = (second: string) =>
      reduce([
        product({ ref: 'pb', isbn: ISBN_A, related: manifestationOf(), collateral: supportingResource() }),
        product({
          ref: 'pdf',
          isbn: ISBN_B,
          related: manifestationOf(),
          collateral: supportingResource({ versions: [resourceVersion({ links: [second] })] }),
        }),
      ]);
    const identical = grouped(COVER_URL);
    const different = grouped(OTHER_COVER_URL);

    expect(resolveOnly(identical).values.coverUrl).toBe(COVER_URL);
    expect(findingsOf(identical.plan, 'COVER_CHOICE_REQUIRED')).toEqual([]);
    expect(findingsOf(different.plan, 'COVER_CHOICE_REQUIRED')).toHaveLength(1);
    expect(resolveOnly(different).values.coverUrl).toBeNull();
  });

  it('takes a Thoth-hosted downloadable cover only under the verified or confirmed Thoth profile, whose own export states it so', () => {
    const reduced = reduce([
      product({ collateral: supportingResource({ versions: [resourceVersion({ form: '02' })] }) }),
    ]);
    const [downloadable] = coverFindings(reduced.plan);
    const generic = resolveOnly(reduced, {}, false);
    const profile = resolveOnly(reduced, {}, true);

    expect(downloadable).toMatchObject({ code: 'COVER_UNREPRESENTABLE', detail: { reasons: ['DOWNLOADABLE_FILE'] } });
    expect(generic.values.coverUrl).toBeNull();
    expect(generic.inapplicableFindingKeys).not.toContain(downloadable.key);
    expect(profile.values.coverUrl).toBe(COVER_URL);
    // The profile reads the cover back, so the disclosure that it was not imported says nothing about this Work.
    expect(profile.inapplicableFindingKeys).toContain(downloadable.key);
  });

  it('asks about a downloadable cover only where the Thoth profile could take it, and never otherwise', () => {
    const reduced = reduce([
      product({ ref: 'pb', isbn: ISBN_A, related: manifestationOf(), collateral: supportingResource() }),
      product({
        ref: 'pdf',
        isbn: ISBN_B,
        related: manifestationOf(),
        collateral: supportingResource({ versions: [resourceVersion({ form: '02', links: [OTHER_COVER_URL] })] }),
      }),
    ]);
    const [profileChoice] = findingsOf(reduced.plan, 'COVER_CHOICE_REQUIRED');
    const generic = resolveOnly(reduced, {}, false);
    const profile = resolveOnly(reduced, {}, true);

    expect(findingsOf(reduced.plan, 'COVER_CHOICE_REQUIRED')).toHaveLength(1);
    expect(profileChoice.detail).toEqual({ values: [COVER_URL, OTHER_COVER_URL] });
    // Without the profile only the linkable cover is eligible, so there is nothing to choose.
    expect(generic.values.coverUrl).toBe(COVER_URL);
    expect(generic.pendingFindingKeys).not.toContain(profileChoice.key);
    expect(generic.inapplicableFindingKeys).toContain(profileChoice.key);
    expect(profile.values.coverUrl).toBeNull();
    expect(profile.pendingFindingKeys).toContain(profileChoice.key);
    expect(resolveOnly(reduced, { [profileChoice.key]: OTHER_COVER_URL }, true).values.coverUrl).toBe(OTHER_COVER_URL);
  });

  it('discloses what an imported cover cannot keep - caption, copyright holder, alternative text, version features and dates - never adding them anywhere', () => {
    const reduced = reduce([
      product({
        collateral: supportingResource({
          features: [
            resourceFeature('02', 'The cover caption'),
            resourceFeature('03', 'A. Photographer'),
            resourceFeature('07', 'A red cover with white lettering'),
          ],
          versions: [
            resourceVersion({
              features: [versionFeature('01', 'D502'), versionFeature('02', '2400')],
              dates: [contentDate('17', '20260101')],
            }),
          ],
        }),
      }),
    ]);
    const resolved = resolveOnly(reduced);

    expect(resolved.values.coverUrl).toBe(COVER_URL);
    expect(resolved.values.copyrightHolder).toBe('');
    expect(coverFindings(reduced.plan)).toEqual([
      expect.objectContaining({
        code: 'COVER_DETAIL_NOT_IMPORTED',
        classification: 'TARGET_UNREPRESENTABLE',
        blocking: false,
        detail: { features: ['02', '03', '07'], versionFeatures: ['01', '02'], dates: ['17'] },
      }),
    ]);
  });

  it.each(['en', 'de', 'es', 'pt'])('names the cover family in %s', async (locale) => {
    const { onixPlan } = (await import(`@/src/shared/i18n/locales/${locale}/common.json`)) as {
      onixPlan: { descriptive: { family: Record<string, string> } };
    };
    const { onixPlan: english } = (await import('@/src/shared/i18n/locales/en/common.json')) as {
      onixPlan: { descriptive: { family: Record<string, string> } };
    };

    expect(onixPlan.descriptive.family.COVER).toEqual(expect.any(String));
    expect(onixPlan.descriptive.family.COVER.length).toBeGreaterThan(0);
    expect(Object.keys(onixPlan.descriptive.family).sort()).toEqual(Object.keys(english.descriptive.family).sort());
  });
});

const extent = (type: string, value: string, unit = '03') =>
  `<Extent><ExtentType>${type}</ExtentType><ExtentValue>${value}</ExtentValue><ExtentUnit>${unit}</ExtentUnit></Extent>`;

describe('reduceOnixDescriptive: Extent -> Work.pageCount (5545670440 F, Amendment 3)', () => {
  it('prefers total numbered pages', () => {
    const reduced = reduce([product({ descriptive: titleXml() + extent('00', '200') + extent('05', '240') })]);

    expect(resolveOnly(reduced).values.pageCount).toBe(240);
  });

  it('derives total numbered pages from main, front and back matter, and says so', () => {
    const reduced = reduce([
      product({ descriptive: titleXml() + extent('00', '200') + extent('03', '12') + extent('04', '28') }),
    ]);

    expect(resolveOnly(reduced).values.pageCount).toBe(240);
    expect(findingsOf(reduced.plan, 'EXTENT_NORMALISED')).toHaveLength(1);
  });

  it('uses a main-content page count alone with a warning', () => {
    const reduced = reduce([product({ descriptive: titleXml() + extent('00', '200') })]);

    expect(resolveOnly(reduced).values.pageCount).toBe(200);
    expect(findingsOf(reduced.plan, 'EXTENT_MAIN_CONTENT_ONLY')).toHaveLength(1);
  });

  it('never reads a duration, a file size or another page measure as the page count', () => {
    const reduced = reduce([
      product({
        descriptive:
          titleXml() + extent('09', '360', '05') + extent('22', '20', '19') + extent('08', '300') + extent('11', '250'),
      }),
    ]);

    expect(resolveOnly(reduced).values.pageCount).toBe(0);
    expect(findingsOf(reduced.plan, 'EXTENT_UNREPRESENTABLE')).toHaveLength(1);
  });

  it('asks which page count applies when one extent type is given different values', () => {
    const reduced = reduce([product({ descriptive: titleXml() + extent('05', '240') + extent('05', '250') })]);

    const [conflict] = findingsOf(reduced.plan, 'EXTENT_VALUE_CONFLICT');
    expect(conflict.resolution.kind).toBe('CHOICE');
    expect(resolveOnly(reduced).values.pageCount).toBe(0);
    expect(resolveOnly(reduced, { [conflict.key]: '250' }).values.pageCount).toBe(250);
  });

  it('never plans a zero page count, which Thoth cannot store', () => {
    const reduced = reduce([product({ descriptive: titleXml() + extent('05', '0') })]);

    expect(resolveOnly(reduced).values.pageCount).toBe(0);
    expect(findingsOf(reduced.plan, 'EXTENT_UNREPRESENTABLE')).toHaveLength(1);
  });

  it('reconciles grouped manifestations: equal counts are one, an omission is no conflict, different counts are a choice', () => {
    const equal = reduce([
      product({ ref: 'm1', related: manifestationOf(), descriptive: titleXml() + extent('05', '240') }),
      product({ ref: 'm2', isbn: ISBN_B, related: manifestationOf(), descriptive: titleXml() + extent('05', '240') }),
      product({ ref: 'm3', isbn: ISBN_C, related: manifestationOf(), descriptive: titleXml() }),
    ]);
    const different = reduce([
      product({ ref: 'm1', related: manifestationOf(), descriptive: titleXml() + extent('05', '240') }),
      product({
        ref: 'm2',
        isbn: ISBN_B,
        related: manifestationOf(),
        descriptive: titleXml() + extent('08', '300') + extent('05', '232'),
      }),
    ]);

    expect(resolveOnly(equal).values.pageCount).toBe(240);
    const [conflict] = findingsOf(different.plan, 'EXTENT_VALUE_CONFLICT');
    expect(conflict).toMatchObject({ productKey: null, blocking: true });
    expect(conflict.resolution).toEqual({
      kind: 'CHOICE',
      options: [
        { key: '240', label: '240' },
        { key: '232', label: '232' },
        { key: 'OMIT', label: 'OMIT' },
      ],
    });
    expect(resolveOnly(different, { [conflict.key]: 'OMIT' }).values.pageCount).toBe(0);
  });
});

const ancillary = (type: string, count?: string, description?: string) =>
  `<AncillaryContent><AncillaryContentType>${type}</AncillaryContentType>${description ? `<AncillaryContentDescription>${description}</AncillaryContentDescription>` : ''}${count === undefined ? '' : `<Number>${count}</Number>`}</AncillaryContent>`;

describe('reduceOnixDescriptive: AncillaryContent and IllustrationsNote (5545670440 H, Amendment 3)', () => {
  it('maps unspecified illustrations and tables to image and table counts', () => {
    const reduced = reduce([product({ descriptive: titleXml() + ancillary('09', '12') + ancillary('11', '3') })]);

    const { values } = resolveOnly(reduced);
    expect([values.imageCount, values.tableCount, values.audioCount, values.videoCount]).toEqual([12, 3, null, null]);
    expect(findingsOf(reduced.plan, 'ANCILLARY_NORMALISED')).toHaveLength(1);
  });

  it('never reads recorded music as audio, nor an unspecified item as video, for a generic sender', () => {
    const reduced = reduce([
      product({
        descriptive: titleXml() + ancillary('19', '4') + ancillary('00', '2', 'Videos') + ancillary('14', '5'),
      }),
    ]);

    const { values } = resolveOnly(reduced);
    expect([values.audioCount, values.videoCount]).toEqual([null, null]);
    // Thoth's own audio/video convention is disclosed apart from genuine losses, since only it can ever be read back.
    expect(findingsOf(reduced.plan, 'ANCILLARY_UNREPRESENTABLE').map(({ detail }) => detail.types)).toEqual([
      ['19', '00'],
      ['14'],
    ]);
  });

  it("reads Thoth's own audio and video convention only under the active Thoth compatibility profile", () => {
    const reduced = reduce([
      product({ descriptive: titleXml() + ancillary('19', '4') + ancillary('00', '2', 'Videos') }),
    ]);

    const { values, inapplicableFindingKeys } = resolveOnly(reduced, {}, true);
    expect([values.audioCount, values.videoCount]).toEqual([4, 2]);
    expect(inapplicableFindingKeys).toEqual(
      findingsOf(reduced.plan, 'ANCILLARY_UNREPRESENTABLE').map(({ key }) => key),
    );
    expect(resolveOnly(reduced).inapplicableFindingKeys).toEqual([]);
  });

  it('asks which count applies when repeated counts of one kind differ, and plans none until it is answered', () => {
    const conflicting = reduce([product({ descriptive: titleXml() + ancillary('09', '12') + ancillary('09', '14') })]);

    expect(findingsOf(conflicting.plan, 'ANCILLARY_COUNT_CONFLICT')).toHaveLength(1);
    expect(resolveOnly(conflicting).values.imageCount).toBeNull();
  });

  it('keeps an explicit zero count as the Thoth value 0, apart from a count the source never states', () => {
    const zero = reduce([product({ descriptive: titleXml() + ancillary('11', '0') + ancillary('09', '00') })]);
    const absent = reduce([product({ descriptive: titleXml() })]);

    const { values } = resolveOnly(zero);
    expect([values.imageCount, values.tableCount, values.audioCount, values.videoCount]).toEqual([0, 0, null, null]);
    expect(findingsOf(zero.plan, 'ANCILLARY_UNREPRESENTABLE')).toEqual([]);
    expect(resolveOnly(absent).values.tableCount).toBeNull();
  });

  it('never reads a missing Number as zero', () => {
    const reduced = reduce([product({ descriptive: titleXml() + ancillary('11') })]);

    expect(resolveOnly(reduced).values.tableCount).toBeNull();
    expect(findingsOf(reduced.plan, 'ANCILLARY_UNREPRESENTABLE')).toEqual([
      expect.objectContaining({ blocking: false, detail: { types: ['11'] } }),
    ]);
  });

  it('reconciles an explicit zero across grouped manifestations like any other count', () => {
    const grouped = (first: string, second: string) =>
      reduce([
        product({ ref: 'print', isbn: ISBN_A, descriptive: titleXml() + first, related: manifestationOf() }),
        product({ ref: 'ebook', isbn: ISBN_B, descriptive: titleXml() + second, related: manifestationOf() }),
      ]);
    const zeroAndAbsent = grouped(ancillary('11', '0'), '');
    const zeroAndFive = grouped(ancillary('11', '0'), ancillary('11', '5'));
    const [conflict] = findingsOf(zeroAndFive.plan, 'ANCILLARY_COUNT_CONFLICT');

    expect(resolveOnly(zeroAndAbsent).values.tableCount).toBe(0);
    expect(conflict.resolution).toEqual({
      kind: 'CHOICE',
      options: [
        { key: '0', label: '0' },
        { key: '5', label: '5' },
        { key: 'OMIT', label: 'OMIT' },
      ],
    });
    expect(resolveOnly(zeroAndFive, { [conflict.key]: '0' }).values.tableCount).toBe(0);
    expect(resolveOnly(zeroAndFive, { [conflict.key]: 'OMIT' }).values.tableCount).toBeNull();
  });

  it('never turns a generic IllustrationsNote into the bibliography note', () => {
    const reduced = reduce([
      product({ descriptive: titleXml() + '<IllustrationsNote>12 maps, 3 tables</IllustrationsNote>' }),
    ]);

    expect(resolveOnly(reduced).values.bibliographyNote).toBe('');
    expect(findingsOf(reduced.plan, 'ILLUSTRATIONS_NOTE_UNREPRESENTABLE')).toEqual([
      expect.objectContaining({ classification: 'TARGET_UNREPRESENTABLE', blocking: false }),
    ]);
    expect(resolveOnly(reduced, {}, true).values.bibliographyNote).toBe('12 maps, 3 tables');
  });
});

type ContributorSpec = {
  readonly roles?: readonly string[];
  readonly sequence?: string;
  readonly personName?: string;
  readonly keyNames?: string;
  readonly namesBeforeKey?: string;
  readonly prefixToKey?: string;
  readonly inverted?: string;
  readonly corporate?: string;
  readonly unnamed?: string;
  readonly identifiers?: readonly [type: string, value: string, name?: string][];
  readonly websites?: readonly [role: string, link: string][];
  readonly affiliations?: readonly string[];
  readonly biographies?: readonly string[];
  readonly extra?: string;
};

const contributorXml = ({
  roles = ['A01'],
  sequence,
  personName,
  keyNames,
  namesBeforeKey,
  prefixToKey,
  inverted,
  corporate,
  unnamed,
  identifiers = [],
  websites = [],
  affiliations = [],
  biographies = [],
  extra = '',
}: ContributorSpec) =>
  '<Contributor>' +
  (sequence ? `<SequenceNumber>${sequence}</SequenceNumber>` : '') +
  roles.map((role) => `<ContributorRole>${role}</ContributorRole>`).join('') +
  identifiers
    .map(
      ([type, value, name]) =>
        `<NameIdentifier><NameIDType>${type}</NameIDType>${name ? `<IDTypeName>${name}</IDTypeName>` : ''}<IDValue>${value}</IDValue></NameIdentifier>`,
    )
    .join('') +
  (personName ? `<PersonName>${personName}</PersonName>` : '') +
  (inverted ? `<PersonNameInverted>${inverted}</PersonNameInverted>` : '') +
  (namesBeforeKey ? `<NamesBeforeKey>${namesBeforeKey}</NamesBeforeKey>` : '') +
  (prefixToKey ? `<PrefixToKey>${prefixToKey}</PrefixToKey>` : '') +
  (keyNames ? `<KeyNames>${keyNames}</KeyNames>` : '') +
  (corporate ? `<CorporateName>${corporate}</CorporateName>` : '') +
  (unnamed ? `<UnnamedPersons>${unnamed}</UnnamedPersons>` : '') +
  affiliations.join('') +
  biographies.join('') +
  websites
    .map(([role, link]) => `<Website><WebsiteRole>${role}</WebsiteRole><WebsiteLink>${link}</WebsiteLink></Website>`)
    .join('') +
  extra +
  '</Contributor>';

const person = (overrides: ContributorSpec = {}) =>
  contributorXml({ personName: 'Ada Lovelace', keyNames: 'Lovelace', namesBeforeKey: 'Ada', ...overrides });

const withContributors = (...contributors: string[]) => titleXml() + contributors.join('');

const affiliationXml = (
  text?: string,
  identifiers: readonly [type: string, value: string][] = [],
  positions: readonly string[] = [],
) =>
  '<ProfessionalAffiliation>' +
  positions.map((position) => `<ProfessionalPosition>${position}</ProfessionalPosition>`).join('') +
  identifiers
    .map(
      ([type, value]) =>
        `<AffiliationIdentifier><AffiliationIDType>${type}</AffiliationIDType><IDValue>${value}</IDValue></AffiliationIdentifier>`,
    )
    .join('') +
  (text ? `<Affiliation>${text}</Affiliation>` : '') +
  '</ProfessionalAffiliation>';

const biographyXml = (text: string, attributes = '') => `<BiographicalNote${attributes}>${text}</BiographicalNote>`;

const contributorDecision = (reduced: Reduced) => reduced.plan.groups[onlyGroupKey(reduced)].contributors;

const contributionsOf = (reduced: Reduced) =>
  contributorDecision(reduced).intents.flatMap(({ fullName, contributions }) =>
    contributions.map(({ type, ordinal }) => [ordinal, type, fullName]),
  );

describe('reduceOnixDescriptive: contributors (ONIX-AUDIT-CONTRIBUTOR-01 5562159621)', () => {
  describe('List 17 roles', () => {
    it.each([
      ['A01', 'AUTHOR'],
      ['B01', 'EDITOR'],
      ['B06', 'TRANSLATOR'],
      ['A08', 'PHOTOGRAPHER'],
      ['A12', 'ILLUSTRATOR'],
      ['A23', 'FOREWORD_BY'],
      ['A24', 'INTRODUCTION_BY'],
      ['A19', 'AFTERWORD_BY'],
      ['A15', 'PREFACE_BY'],
      ['A30', 'SOFTWARE_BY'],
      ['A51', 'RESEARCH_BY'],
      ['A32', 'CONTRIBUTIONS_BY'],
      ['A34', 'INDEXER'],
    ])('maps %s directly to %s', (role, type) => {
      const reduced = reduce([product({ descriptive: withContributors(person({ roles: [role] })) })]);

      expect(contributionsOf(reduced)).toEqual([[1, type, 'Ada Lovelace']]);
      expect(findingsOf(reduced.plan, 'CONTRIBUTOR_ROLE_UNREPRESENTABLE')).toEqual([]);
    });

    it.each(['A06', 'B25', 'A13', 'A02', 'B05', 'B13', 'E07', 'Z04', 'Z99'])(
      'never turns role %s into an Author or any nearby type: the loss is acknowledged instead',
      (role) => {
        const reduced = reduce([product({ descriptive: withContributors(person({ roles: [role] })) })]);

        expect(contributionsOf(reduced)).toEqual([]);
        const [loss] = findingsOf(reduced.plan, 'CONTRIBUTOR_ROLE_UNREPRESENTABLE');
        expect(loss).toMatchObject({
          classification: 'TARGET_UNREPRESENTABLE',
          blocking: true,
          resolution: { kind: 'ACKNOWLEDGE' },
          detail: { roles: [role] },
        });
        expect(resolveOnly(reduced).pendingFindingKeys).toContain(loss.key);
        expect(resolveOnly(reduced, { [loss.key]: 'ACKNOWLEDGED' }).pendingFindingKeys).not.toContain(loss.key);
      },
    );

    it('expands repeated roles of one contributor into adjacent contributions of one person', () => {
      const reduced = reduce([
        product({
          descriptive: withContributors(
            person({ roles: ['B01', 'A24'] }),
            contributorXml({ personName: 'Charles Babbage', keyNames: 'Babbage', roles: ['A01'] }),
          ),
        }),
      ]);

      expect(contributionsOf(reduced)).toEqual([
        [1, 'EDITOR', 'Ada Lovelace'],
        [2, 'INTRODUCTION_BY', 'Ada Lovelace'],
        [3, 'AUTHOR', 'Charles Babbage'],
      ]);
      expect(contributorDecision(reduced).intents).toHaveLength(2);
    });

    it('produces one contribution per target type when roles repeat or overlap', () => {
      const reduced = reduce([
        product({ descriptive: withContributors(person({ roles: ['B10', 'B06', 'B01', 'B10'] })) }),
      ]);

      const [intent] = contributorDecision(reduced).intents;
      expect(intent.contributions).toEqual([
        { type: 'EDITOR', ordinal: 1, sourceRoles: ['B10', 'B01'] },
        { type: 'TRANSLATOR', ordinal: 2, sourceRoles: ['B10', 'B06'] },
      ]);
    });

    it.each([
      ['B08', 'TRANSLATOR'],
      ['A29', 'INTRODUCTION_BY'],
    ])('maps the entailed facet of compound role %s and asks to acknowledge the rest', (role, type) => {
      const reduced = reduce([product({ descriptive: withContributors(person({ roles: [role] })) })]);

      expect(contributionsOf(reduced)).toEqual([[1, type, 'Ada Lovelace']]);
      expect(findingsOf(reduced.plan, 'CONTRIBUTOR_ROLE_FACET_LOST')).toEqual([
        expect.objectContaining({ blocking: true, resolution: { kind: 'ACKNOWLEDGE' }, detail: { roles: [role] } }),
      ]);
    });

    it('keeps the mapped roles of a person with an unmapped one, and asks only about the unmapped one', () => {
      const reduced = reduce([product({ descriptive: withContributors(person({ roles: ['A01', 'A02'] })) })]);

      expect(contributionsOf(reduced)).toEqual([[1, 'AUTHOR', 'Ada Lovelace']]);
      expect(findingsOf(reduced.plan, 'CONTRIBUTOR_ROLE_UNREPRESENTABLE')[0].detail).toEqual({ roles: ['A02'] });
    });

    it('marks every planned contribution as main, and discloses that as a target convention', () => {
      const reduced = reduce([product({ descriptive: withContributors(person()) })]);

      expect(contributorDecision(reduced).intents[0].contributions[0]).toMatchObject({ type: 'AUTHOR' });
      expect(findingsOf(reduced.plan, 'CONTRIBUTOR_MAIN_NORMALISED')).toEqual([
        expect.objectContaining({ classification: 'SUPPORTED_NORMALIZED', blocking: false }),
      ]);
    });
  });

  describe('agents', () => {
    it.each([
      ['a corporate contributor', contributorXml({ corporate: 'Example Institute' })],
      ['an unnamed contributor', contributorXml({ unnamed: '02' })],
    ])('never makes %s a person, and asks to acknowledge the omission', (_label, contributor) => {
      const reduced = reduce([product({ descriptive: withContributors(contributor) })]);

      expect(contributionsOf(reduced)).toEqual([]);
      expect(findingsOf(reduced.plan, 'CONTRIBUTOR_AGENT_UNREPRESENTABLE')).toEqual([
        expect.objectContaining({ blocking: true, resolution: { kind: 'ACKNOWLEDGE' } }),
      ]);
    });

    it('reads NoContributor as zero contributions and nothing to answer', () => {
      const reduced = reduce([product({ descriptive: titleXml() + '<NoContributor/>' })]);

      expect(contributorDecision(reduced)).toMatchObject({ intents: [], noContributor: true });
      expect(reduced.plan.findings.filter(({ family }) => family === 'CONTRIBUTORS')).toEqual([]);
    });

    it('discloses a ContributorStatement without parsing people or roles out of it', () => {
      const reduced = reduce([
        product({
          descriptive: withContributors(
            person(),
            '<ContributorStatement>Edited by Ada Lovelace</ContributorStatement>',
          ),
        }),
      ]);

      expect(contributionsOf(reduced)).toEqual([[1, 'AUTHOR', 'Ada Lovelace']]);
      expect(findingsOf(reduced.plan, 'CONTRIBUTOR_STATEMENT_UNREPRESENTABLE')).toEqual([
        expect.objectContaining({ blocking: false }),
      ]);
    });
  });

  describe('names', () => {
    it('keeps PersonName as the occurrence name and takes surname and forenames from the structured parts', () => {
      const reduced = reduce([
        product({
          descriptive: withContributors(
            contributorXml({
              personName: 'Ludwig van Beethoven',
              namesBeforeKey: 'Ludwig',
              prefixToKey: 'van',
              keyNames: 'Beethoven',
            }),
          ),
        }),
      ]);

      expect(contributorDecision(reduced).intents[0]).toMatchObject({
        fullName: 'Ludwig van Beethoven',
        lastName: 'van Beethoven',
        firstName: 'Ludwig',
      });
    });

    it('builds the display name from structured parts when no PersonName is given', () => {
      const reduced = reduce([
        product({ descriptive: withContributors(contributorXml({ namesBeforeKey: 'Ada', keyNames: 'Lovelace' })) }),
      ]);

      expect(contributorDecision(reduced).intents[0]).toMatchObject({
        fullName: 'Ada Lovelace',
        lastName: 'Lovelace',
        firstName: 'Ada',
      });
    });

    it('never invents a surname from a PersonName alone: the publisher enters it', () => {
      const reduced = reduce([
        product({ descriptive: withContributors(contributorXml({ personName: 'Ada Lovelace' })) }),
      ]);

      const [required] = findingsOf(reduced.plan, 'CONTRIBUTOR_NAME_REQUIRED');
      expect(required).toMatchObject({
        classification: 'TARGET_INPUT_REQUIRED',
        blocking: true,
        detail: expect.objectContaining({ field: 'lastName' }),
        resolution: { kind: 'INPUT', input: 'TEXT' },
      });
      expect(findingsOf(reduced.plan, 'CONTRIBUTOR_NAME_REQUIRED')).toHaveLength(1);
      expect(contributorDecision(reduced).intents[0]).toMatchObject({
        lastName: null,
        nameFindingKey: required.key,
        fullNameFindingKey: null,
      });
    });

    it('never splits an inverted name: the publisher enters the name and the surname', () => {
      const reduced = reduce([
        product({ descriptive: withContributors(contributorXml({ inverted: 'Lovelace, Ada' })) }),
      ]);

      const [surname, name] = findingsOf(reduced.plan, 'CONTRIBUTOR_NAME_REQUIRED');
      expect([surname.detail.field, name.detail.field]).toEqual(['lastName', 'fullName']);
      expect([surname.resolution, name.resolution]).toEqual([
        { kind: 'INPUT', input: 'TEXT' },
        { kind: 'INPUT', input: 'TEXT' },
      ]);
      expect(contributorDecision(reduced).intents[0]).toMatchObject({
        fullName: '',
        lastName: null,
        nameFindingKey: surname.key,
        fullNameFindingKey: name.key,
      });
    });
  });

  describe('ORCID', () => {
    it.each([
      ['the ONIX bare form', '0000000163655189'],
      ['the hyphenated form', '0000-0001-6365-5189'],
      ['the resolver URL', 'https://orcid.org/0000-0001-6365-5189'],
      ['the scheme-less resolver form', 'orcid.org/0000-0001-6365-5189'],
    ])('normalises %s of a declared ORCID', (_label, value) => {
      const reduced = reduce([product({ descriptive: withContributors(person({ identifiers: [['21', value]] })) })]);

      expect(contributorDecision(reduced).intents[0].orcid).toBe('0000-0001-6365-5189');
    });

    it('upper-cases only the check character and finds an ORCID behind another identifier', () => {
      const reduced = reduce([
        product({
          descriptive: withContributors(
            person({
              identifiers: [
                ['16', '0000000121032683'],
                ['21', '000000021694233x'],
              ],
            }),
          ),
        }),
      ]);

      expect(contributorDecision(reduced).intents[0].orcid).toBe('0000-0002-1694-233X');
      expect(findingsOf(reduced.plan, 'CONTRIBUTOR_IDENTIFIER_UNREPRESENTABLE')).toEqual([
        expect.objectContaining({ detail: { types: ['16'] } }),
      ]);
    });

    it('never reads an ORCID-shaped value under another scheme as an ORCID', () => {
      const reduced = reduce([
        product({ descriptive: withContributors(person({ identifiers: [['01', '0000000163655189', 'Author key']] })) }),
      ]);

      expect(contributorDecision(reduced).intents[0].orcid).toBeNull();
    });

    it('collapses equivalent spellings of one ORCID', () => {
      const reduced = reduce([
        product({
          descriptive: withContributors(
            person({
              identifiers: [
                ['21', '0000000163655189'],
                ['21', 'https://orcid.org/0000-0001-6365-5189'],
              ],
            }),
          ),
        }),
      ]);

      expect(contributorDecision(reduced).intents[0].orcid).toBe('0000-0001-6365-5189');
      expect(findingsOf(reduced.plan, 'CONTRIBUTOR_ORCID_CONFLICT')).toEqual([]);
    });

    it('blocks two different ORCIDs on one contributor, never choosing the first', () => {
      const reduced = reduce([
        product({
          descriptive: withContributors(
            person({
              identifiers: [
                ['21', '0000000163655189'],
                ['21', '0000000216942338'],
              ],
            }),
          ),
        }),
      ]);

      const [conflict] = findingsOf(reduced.plan, 'CONTRIBUTOR_ORCID_CONFLICT');
      expect(conflict).toMatchObject({ classification: 'SOURCE_CONFLICT', blocking: true });
      expect(contributorDecision(reduced).intents[0].orcid).toBeNull();
    });

    it('blocks a declared ORCID that is not a valid ORCID rather than importing the person without it', () => {
      const reduced = reduce([
        product({
          descriptive: withContributors(person({ identifiers: [['21', 'https://example.org/0000-0001-6365-5189']] })),
        }),
      ]);

      expect(findingsOf(reduced.plan, 'CONTRIBUTOR_ORCID_INVALID')).toEqual([
        expect.objectContaining({ blocking: true, resolution: { kind: 'NONE' } }),
      ]);
    });

    it('blocks one ORCID given to two distinct contributors in the same role on one Work', () => {
      const reduced = reduce([
        product({
          descriptive: withContributors(
            person({ identifiers: [['21', '0000000163655189']] }),
            contributorXml({
              personName: 'A. Lovelace',
              keyNames: 'Lovelace',
              identifiers: [['21', '0000000163655189']],
            }),
          ),
        }),
      ]);

      expect(findingsOf(reduced.plan, 'CONTRIBUTOR_DUPLICATE_IDENTITY')).toEqual([
        expect.objectContaining({ classification: 'SOURCE_CONFLICT', blocking: true }),
      ]);
    });
  });

  describe('websites', () => {
    it("keeps only the contributor's own website (role 06)", () => {
      const reduced = reduce([
        product({
          descriptive: withContributors(
            person({
              websites: [
                ['23', 'https://blog.example'],
                ['06', 'https://ada.example'],
                ['06', 'https://ada.example'],
              ],
            }),
          ),
        }),
      ]);

      expect(contributorDecision(reduced).intents[0].website).toBe('https://ada.example');
      expect(findingsOf(reduced.plan, 'CONTRIBUTOR_WEBSITE_UNREPRESENTABLE')).toEqual([
        expect.objectContaining({ blocking: false }),
      ]);
    });

    it('asks to acknowledge omitting the website when two own websites differ', () => {
      const reduced = reduce([
        product({
          descriptive: withContributors(
            person({
              websites: [
                ['06', 'https://ada.example'],
                ['06', 'https://lovelace.example'],
              ],
            }),
          ),
        }),
      ]);

      expect(contributorDecision(reduced).intents[0].website).toBe('');
      expect(findingsOf(reduced.plan, 'CONTRIBUTOR_WEBSITE_CONFLICT')).toEqual([
        expect.objectContaining({ blocking: true, resolution: { kind: 'ACKNOWLEDGE' } }),
      ]);
    });
  });

  describe('affiliations', () => {
    it('reads a ROR only from a declared AffiliationIDType 40, in any position, keeping every affiliation in order', () => {
      const reduced = reduce([
        product({
          descriptive: withContributors(
            person({
              affiliations: [
                affiliationXml(
                  'University of Example',
                  [
                    ['01', 'UOE-1'],
                    ['40', '02mhbdp94'],
                  ],
                  ['Professor'],
                ),
                affiliationXml('Second Institute', [['40', 'https://ror.org/05dxps055']]),
              ],
            }),
          ),
        }),
      ]);

      expect(
        contributorDecision(reduced).intents[0].affiliations.map(({ ror, text, position }) => [ror, text, position]),
      ).toEqual([
        ['https://ror.org/02mhbdp94', 'University of Example', 'Professor'],
        ['https://ror.org/05dxps055', 'Second Institute', ''],
      ]);
      expect(findingsOf(reduced.plan, 'CONTRIBUTOR_AFFILIATION_IDENTIFIER_UNREPRESENTABLE')).toHaveLength(1);
    });

    it('keeps an affiliation without a ROR, unidentified, for the publisher to match among name suggestions (#209 F)', () => {
      const reduced = reduce([
        product({
          descriptive: withContributors(
            person({
              affiliations: [affiliationXml('School of Advanced Study, University of London', [], ['Professor'])],
            }),
          ),
        }),
      ]);

      // Never identified by its name here: the source text and its location travel on, and nothing is chosen.
      expect(
        contributorDecision(reduced).intents[0].affiliations.map(({ ror, text, position, provenance }) => [
          ror,
          text,
          position,
          provenance.map(({ path }) => path),
        ]),
      ).toEqual([
        [
          null,
          'School of Advanced Study, University of London',
          'Professor',
          [`${PRODUCT_1}/DescriptiveDetail[1]/Contributor[1]/ProfessionalAffiliation[1]`],
        ],
      ]);
      expect(findingsOf(reduced.plan, 'CONTRIBUTOR_AFFILIATION_UNIDENTIFIED')).toEqual([]);
      expect(descriptiveLookupRequests(reduced.plan, onlyGroupKey(reduced)).institutionSearches).toEqual([
        { text: 'School of Advanced Study, University of London', ror: null, funderKey: null },
      ]);
    });

    it('searches Thoth institutions for the affiliation text as stated, then for each part it lists', () => {
      expect(institutionSearchTerms('  School of Advanced Study,  University of London (United Kingdom) ')).toEqual([
        'School of Advanced Study, University of London (United Kingdom)',
        'School of Advanced Study',
        'University of London',
        'United Kingdom',
      ]);
      expect(institutionSearchTerms('Wellcome Trust')).toEqual(['Wellcome Trust']);
      expect(institutionSearchTerms('UCL; ucl [UK]')).toEqual(['UCL; ucl [UK]', 'UCL']);
      expect(institutionSearchTerms('   ')).toEqual([]);
    });

    it('blocks a malformed declared ROR and contradictory RORs', () => {
      const malformed = reduce([
        product({
          descriptive: withContributors(person({ affiliations: [affiliationXml('X', [['40', 'not-a-ror']])] })),
        }),
      ]);
      const contradictory = reduce([
        product({
          descriptive: withContributors(
            person({
              affiliations: [
                affiliationXml('X', [
                  ['40', '02mhbdp94'],
                  ['40', '05dxps055'],
                ]),
              ],
            }),
          ),
        }),
      ]);

      expect(findingsOf(malformed.plan, 'CONTRIBUTOR_AFFILIATION_ROR_INVALID')).toEqual([
        expect.objectContaining({ blocking: true }),
      ]);
      expect(findingsOf(contradictory.plan, 'CONTRIBUTOR_AFFILIATION_ROR_CONFLICT')).toEqual([
        expect.objectContaining({ blocking: true }),
      ]);
    });

    it('asks to acknowledge omitting a position when an affiliation gives several', () => {
      const reduced = reduce([
        product({
          descriptive: withContributors(
            person({ affiliations: [affiliationXml('X', [['40', '02mhbdp94']], ['Professor', 'Dean'])] }),
          ),
        }),
      ]);

      expect(contributorDecision(reduced).intents[0].affiliations[0].position).toBe('');
      expect(findingsOf(reduced.plan, 'CONTRIBUTOR_POSITION_CONFLICT')).toEqual([
        expect.objectContaining({ blocking: true, resolution: { kind: 'ACKNOWLEDGE' } }),
      ]);
    });
  });

  describe('biographies', () => {
    it('keeps one localized biography as the canonical one, with its markup provenance', () => {
      const reduced = reduce([
        product({
          descriptive: withContributors(
            person({ biographies: [biographyXml('Ada was a mathematician.', ' language="eng"')] }),
          ),
        }),
      ]);

      expect(contributorDecision(reduced).intents[0].biographies).toEqual([
        expect.objectContaining({
          content: 'Ada was a mathematician.',
          localeCode: 'EN',
          canonical: true,
          markup: 'PLAIN_TEXT',
        }),
      ]);
    });

    it("asks for the locale of a biography that declares none, with the Product's text language as evidence only (#209 E)", () => {
      const reduced = reduce([
        product({
          descriptive:
            withContributors(person({ biographies: [biographyXml('Ada was a mathematician.')] })) +
            languageXml('01', 'eng'),
        }),
      ]);
      const [unresolved] = findingsOf(reduced.plan, 'CONTRIBUTOR_BIOGRAPHY_LOCALE_UNRESOLVED');

      expect(unresolved).toMatchObject({
        classification: 'TARGET_INPUT_REQUIRED',
        blocking: true,
        resolution: { kind: 'INPUT', input: 'LOCALE' },
        detail: { language: '', textLocales: ['EN'] },
      });
      expect(unresolved.message).toContain('EN');
      // Kept, with no locale until the publisher gives one: never English because the text is English.
      expect(contributorDecision(reduced).intents[0].biographies).toEqual([
        expect.objectContaining({
          content: 'Ada was a mathematician.',
          localeCode: null,
          localeFindingKey: unresolved.key,
          canonical: true,
        }),
      ]);
      expect(resolveOnly(reduced).pendingFindingKeys).toContain(unresolved.key);
      // Only a Thoth locale answers it; clearing it waits again.
      expect(resolveOnly(reduced, { [unresolved.key]: 'eng' }).pendingFindingKeys).toContain(unresolved.key);
      expect(resolveOnly(reduced, { [unresolved.key]: 'FR' }).pendingFindingKeys).not.toContain(unresolved.key);
      expect(resolveOnly(reduced, {}).pendingFindingKeys).toContain(unresolved.key);
    });

    it('asks for the locale of a biography in a language Thoth has no locale for, and names a Header default as evidence', () => {
      const unrepresentable = reduce([
        product({ descriptive: withContributors(person({ biographies: [biographyXml('Ada.', ' language="lat"')] })) }),
      ]);
      const fromHeader = reduce(
        [product({ descriptive: withContributors(person({ biographies: [biographyXml('Ada.')] })) })],
        {},
        headerXml('<DefaultLanguageOfText>eng</DefaultLanguageOfText>'),
      );

      expect(findingsOf(unrepresentable.plan, 'CONTRIBUTOR_BIOGRAPHY_LOCALE_UNRESOLVED')).toEqual([
        expect.objectContaining({
          resolution: { kind: 'INPUT', input: 'LOCALE' },
          detail: { language: 'lat', textLocales: [] },
        }),
      ]);
      const [headerDefault] = findingsOf(fromHeader.plan, 'CONTRIBUTOR_BIOGRAPHY_LOCALE_UNRESOLVED');
      expect(headerDefault).toMatchObject({
        resolution: { kind: 'INPUT', input: 'LOCALE' },
        detail: { language: '', textLocales: ['EN'] },
      });
      expect(contributorDecision(fromHeader).intents[0].biographies[0].localeCode).toBeNull();
    });

    it('asks which of several localized biographies is canonical, never taking the first', () => {
      const reduced = reduce([
        product({
          descriptive: withContributors(
            person({
              biographies: [
                biographyXml('Ada was a mathematician.', ' language="eng"'),
                biographyXml('Ada war Mathematikerin.', ' language="ger"'),
              ],
            }),
          ),
        }),
      ]);

      const [required] = findingsOf(reduced.plan, 'CONTRIBUTOR_BIOGRAPHY_CANONICAL_REQUIRED');
      expect(required).toMatchObject({ blocking: true });
      expect(required.resolution).toEqual({
        kind: 'CHOICE',
        options: [
          { key: 'EN', label: 'EN' },
          { key: 'DE', label: 'DE' },
        ],
      });
      expect(
        contributorDecision(reduced).intents[0].biographies.map(({ localeCode, canonical }) => [localeCode, canonical]),
      ).toEqual([
        ['EN', null],
        ['DE', null],
      ]);
    });

    it('asks to acknowledge omitting different biographies that share one locale', () => {
      const reduced = reduce([
        product({
          descriptive: withContributors(
            person({
              biographies: [
                biographyXml('One text.', ' language="eng"'),
                biographyXml('Another text.', ' language="eng"'),
              ],
            }),
          ),
        }),
      ]);

      expect(findingsOf(reduced.plan, 'CONTRIBUTOR_BIOGRAPHY_LOCALE_COLLISION')).toEqual([
        expect.objectContaining({ blocking: true, resolution: { kind: 'ACKNOWLEDGE' } }),
      ]);
      expect(contributorDecision(reduced).intents[0].biographies).toEqual([]);
    });

    describe('markup (the importer text contract every imported biography keeps)', () => {
      const biographiesOf = (note: string) => {
        const reduced = reduce([
          product({
            descriptive: withContributors(
              person({ personName: 'Lisa Hopkins', keyNames: 'Hopkins', namesBeforeKey: 'Lisa', biographies: [note] }),
            ),
          }),
        ]);

        return {
          reduced,
          biographies: contributorDecision(reduced).intents[0].biographies.map(({ content, markup }) => [
            content,
            markup,
          ]),
        };
      };

      it('imports the Arc biography shape as HTML, never as JATS or plain text', () => {
        expect(
          biographiesOf(
            biographyXml(
              'Lisa Hopkins is co-editor of &lt;I&gt;Shakespeare&lt;/I&gt;.',
              ' language="eng" textformat="06"',
            ),
          ).biographies,
        ).toEqual([['Lisa Hopkins is co-editor of <I>Shakespeare</I>.', 'HTML']]);
      });

      it('gives each repeated biography its own format rather than the first one’s', () => {
        const reduced = reduce([
          product({
            descriptive: withContributors(
              person({
                biographies: [
                  biographyXml('&lt;p&gt;An &lt;em&gt;editor&lt;/em&gt;.&lt;/p&gt;', ' textformat="02" language="eng"'),
                  biographyXml('Un autore inventato', ' textformat="06" language="ita"'),
                ],
              }),
            ),
          }),
        ]);

        expect(
          contributorDecision(reduced).intents[0].biographies.map(({ content, markup }) => [content, markup]),
        ).toEqual([
          ['<p>An <em>editor</em>.</p>', 'HTML'],
          ['Un autore inventato', 'PLAIN_TEXT'],
        ]);
      });

      it('keeps a biography with no declared format plain', () => {
        expect(biographiesOf(biographyXml('A made-up author', ' language="eng"')).biographies).toEqual([
          ['A made-up author', 'PLAIN_TEXT'],
        ]);
      });

      it('removes a spacer paragraph and keeps the biography HTML', () => {
        expect(
          biographiesOf(
            biographyXml(
              '&lt;p&gt;A real biography.&lt;/p&gt;&lt;p&gt;&lt;br&gt;&lt;/p&gt;',
              ' language="eng" textformat="02"',
            ),
          ).biographies,
        ).toEqual([['<p>A real biography.</p>', 'HTML']]);
      });

      it('normalises meaningful HTML line breaks into paragraphs', () => {
        expect(
          biographiesOf(biographyXml('&lt;p&gt;Hello&lt;br&gt;world&lt;/p&gt;', ' language="eng" textformat="02"'))
            .biographies,
        ).toEqual([['<p>Hello</p><p>world</p>', 'HTML']]);
      });

      it('collapses a tagless declared-HTML biography like an abstract', () => {
        expect(
          biographiesOf(
            biographyXml('Lisa Hopkins is\nProfessor Emerita of English.', ' language="eng" textformat="02"'),
          ).biographies,
        ).toEqual([['Lisa Hopkins is Professor Emerita of English.', 'PLAIN_TEXT']]);
      });

      it.each([
        ['markup that cannot be classified', 'A &lt;marquee&gt;showy&lt;/marquee&gt; author', 'FORMAT'],
        [
          'a plain-text single line break the API cannot represent',
          'Lisa Hopkins writes.\nShe edits too.',
          'STRUCTURE',
        ],
      ])('blocks %s, naming the contributor, and imports no biography', (_label, text, reason) => {
        const { reduced, biographies } = biographiesOf(biographyXml(text, ' language="eng" textformat="06"'));

        expect(biographies).toEqual([]);
        expect(findingsOf(reduced.plan, 'CONTRIBUTOR_BIOGRAPHY_UNREPRESENTABLE')).toEqual([
          expect.objectContaining({
            blocking: true,
            detail: expect.objectContaining({ reason }),
            message: expect.stringContaining('"Lisa Hopkins"'),
          }),
        ]);
      });
    });

    it('blocks a biography whose markup cannot be safely assigned an input format', () => {
      const reduced = reduce([
        product({
          descriptive: withContributors(
            person({ biographies: [biographyXml('&lt;table&gt;x&lt;/table&gt;', ' language="eng" textformat="06"')] }),
          ),
        }),
      ]);

      expect(findingsOf(reduced.plan, 'CONTRIBUTOR_BIOGRAPHY_UNREPRESENTABLE')).toEqual([
        expect.objectContaining({ blocking: true, resolution: { kind: 'NONE' } }),
      ]);
    });
  });

  describe('order', () => {
    it('follows source order when no SequenceNumber is given, with contiguous ordinals over omitted agents', () => {
      const reduced = reduce([
        product({
          descriptive: withContributors(
            person(),
            contributorXml({ corporate: 'Example Institute' }),
            contributorXml({ personName: 'Charles Babbage', keyNames: 'Babbage' }),
          ),
        }),
      ]);

      expect(contributionsOf(reduced)).toEqual([
        [1, 'AUTHOR', 'Ada Lovelace'],
        [2, 'AUTHOR', 'Charles Babbage'],
      ]);
    });

    it('sorts by a complete unique SequenceNumber, never storing the raw numbers', () => {
      const reduced = reduce([
        product({
          descriptive: withContributors(
            person({ sequence: '20' }),
            contributorXml({ personName: 'Charles Babbage', keyNames: 'Babbage', sequence: '10' }),
          ),
        }),
      ]);

      expect(contributionsOf(reduced)).toEqual([
        [1, 'AUTHOR', 'Charles Babbage'],
        [2, 'AUTHOR', 'Ada Lovelace'],
      ]);
    });

    it('asks, rather than tie-breaks by file order, when sequence numbers repeat: the file order or the sequence order', () => {
      const reduced = reduce([
        product({
          descriptive: withContributors(
            person({ sequence: '2' }),
            contributorXml({ personName: 'Charles Babbage', keyNames: 'Babbage', sequence: '1' }),
            contributorXml({ personName: 'Mary Somerville', keyNames: 'Somerville', sequence: '1' }),
          ),
        }),
      ]);

      expect(findingsOf(reduced.plan, 'CONTRIBUTOR_ORDER_AMBIGUOUS')).toEqual([
        expect.objectContaining({
          blocking: true,
          resolution: {
            kind: 'CHOICE',
            options: [
              { key: 'FILE_ORDER', label: 'Ada Lovelace, Charles Babbage, Mary Somerville' },
              { key: 'SEQUENCE_ORDER', label: 'Charles Babbage, Mary Somerville, Ada Lovelace' },
            ],
          },
        }),
      ]);
    });

    it('keeps file order with a warning when only some contributors are numbered, compatibly', () => {
      const reduced = reduce([
        product({
          descriptive: withContributors(
            person({ sequence: '1' }),
            contributorXml({ personName: 'Mary Somerville', keyNames: 'Somerville' }),
            contributorXml({ personName: 'Charles Babbage', keyNames: 'Babbage', sequence: '3' }),
          ),
        }),
      ]);

      expect(contributionsOf(reduced).map(([, , name]) => name)).toEqual([
        'Ada Lovelace',
        'Mary Somerville',
        'Charles Babbage',
      ]);
      expect(findingsOf(reduced.plan, 'CONTRIBUTOR_ORDER_INCOMPLETE')).toEqual([
        expect.objectContaining({ blocking: false }),
      ]);
    });

    it('asks for the order when partial numbering contradicts file order, where the file order is the one complete order', () => {
      const reduced = reduce([
        product({
          descriptive: withContributors(
            person({ sequence: '3' }),
            contributorXml({ personName: 'Mary Somerville', keyNames: 'Somerville' }),
            contributorXml({ personName: 'Charles Babbage', keyNames: 'Babbage', sequence: '1' }),
          ),
        }),
      ]);

      // An unnumbered contributor has no place in a sequence order, so only the file's order is offered.
      expect(findingsOf(reduced.plan, 'CONTRIBUTOR_ORDER_AMBIGUOUS')).toEqual([
        expect.objectContaining({
          resolution: {
            kind: 'CHOICE',
            options: [{ key: 'FILE_ORDER', label: 'Ada Lovelace, Mary Somerville, Charles Babbage' }],
          },
        }),
      ]);
    });

    it("asks once for the contributor inputs grouped manifestations share, never taking one manifestation's answer over another's", () => {
      const reduced = reduce(
        [ISBN_A, ISBN_B].map((isbn, index) =>
          product({
            ref: `m${index}`,
            isbn,
            related: manifestationOf(),
            descriptive: withContributors(
              contributorXml({ personName: 'Ada Lovelace', sequence: '1' }),
              contributorXml({ personName: 'Charles Babbage', keyNames: 'Babbage', sequence: '1' }),
            ),
          }),
        ),
      );
      const names = findingsOf(reduced.plan, 'CONTRIBUTOR_NAME_REQUIRED');
      const orders = findingsOf(reduced.plan, 'CONTRIBUTOR_ORDER_AMBIGUOUS');
      const resolved = resolveOnly(reduced);

      // One Work-level question each (#209), standing for both manifestations' contributors at once.
      expect([names.length, orders.length]).toEqual([1, 1]);
      [...names, ...orders].forEach((finding) => expect(finding.productKey).toBeNull());
      expect(names[0].locations.map(({ path }) => path)).toEqual([
        `${PRODUCT_1}/DescriptiveDetail[1]/Contributor[1]`,
        '/ONIXMessage[1]/Product[2]/DescriptiveDetail[1]/Contributor[1]',
      ]);
      expect(resolved.pendingFindingKeys).toEqual(expect.arrayContaining([names[0].key, orders[0].key]));
      expect(
        resolveOnly(reduced, { [names[0].key]: 'Lovelace', [orders[0].key]: 'FILE_ORDER' }).pendingFindingKeys,
      ).toEqual([]);
    });

    describe('Work-level decisions (#209: the University of London Press shape)', () => {
      const SAS = 'School of Advanced Study, University of London (United Kingdom)';
      const editor = (name: string, keyNames: string, biography: string) =>
        contributorXml({
          roles: ['B01'],
          personName: name,
          keyNames,
          identifiers: [['01', `internal-${keyNames}`, 'system-internal-identifier']],
          affiliations: [affiliationXml(SAS, [], [`Professor of ${keyNames}`])],
          biographies: [biographyXml(biography, ' textformat="06"')],
        });
      const manifestation = (ref: string, isbn: string, form: string, contributors: string[]) =>
        product({
          ref,
          isbn,
          form: `<ProductComposition>00</ProductComposition>${form}`,
          related: manifestationOf(),
          descriptive: withContributors(...contributors) + languageXml('01', 'eng'),
          publishing: publishing(
            funderXml({ role: '14', name: 'Arcadia Fund' }),
            '<PublishingStatus>02</PublishingStatus>',
          ),
        });
      const editors = [
        editor('Charles Burdett', 'Burdett', 'Charles Burdett is a professor.'),
        editor('Naomi Wells', 'Wells', 'Naomi Wells is a lecturer.'),
      ];
      const uolp = () =>
        reduce([
          manifestation('hb', ISBN_A, '<ProductForm>BB</ProductForm>', editors),
          manifestation('pb', ISBN_B, '<ProductForm>BC</ProductForm>', editors),
          manifestation(
            'epub',
            ISBN_C,
            '<ProductForm>EA</ProductForm><ProductFormDetail>E101</ProductFormDetail>',
            editors,
          ),
          manifestation(
            'pdf',
            ISBN_D,
            '<ProductForm>EA</ProductForm><ProductFormDetail>E107</ProductFormDetail>',
            editors,
          ),
        ]);
      const pathsOf = ({ locations }: OnixDescriptiveFinding) => locations.map(({ path }) => path);
      const everyProduct = (suffix: string) =>
        [1, 2, 3, 4].map((index) => `/ONIXMessage[1]/Product[${index}]${suffix}`);

      it('asks each biography locale once for the Work, keeping every manifestation as a source location', () => {
        const reduced = uolp();
        const locales = findingsOf(reduced.plan, 'CONTRIBUTOR_BIOGRAPHY_LOCALE_UNRESOLVED');

        expect(locales).toHaveLength(2);
        locales.forEach((finding) => expect(finding.productKey).toBeNull());
        expect(pathsOf(locales[0])).toEqual(everyProduct('/DescriptiveDetail[1]/Contributor[1]/BiographicalNote[1]'));
        expect(pathsOf(locales[1])).toEqual(everyProduct('/DescriptiveDetail[1]/Contributor[2]/BiographicalNote[1]'));
        expect(
          contributorDecision(reduced).intents.map(({ biographies }) =>
            biographies.map(({ localeFindingKey }) => localeFindingKey),
          ),
        ).toEqual([[locales[0].key], [locales[1].key]]);
        // Every manifestation's provenance stays on the Work's contributors and their affiliations.
        expect(contributorDecision(reduced).intents[0].affiliations[0].provenance.map(({ path }) => path)).toEqual(
          everyProduct('/DescriptiveDetail[1]/Contributor[1]/ProfessionalAffiliation[1]'),
        );
        expect(contributorDecision(reduced).intents[1].provenance.map(({ path }) => path)).toEqual(
          everyProduct('/DescriptiveDetail[1]/Contributor[2]'),
        );
        // One answer settles every manifestation's occurrence.
        expect(resolveOnly(reduced, { [locales[0].key]: 'EN', [locales[1].key]: 'EN_GB' }).pendingFindingKeys).toEqual(
          [],
        );
      });

      it('asks each affiliation and the funder once for the Work, with every manifestation as a source location', () => {
        const reduced = uolp();
        const groupKey = onlyGroupKey(reduced);
        const requests = descriptiveLookupRequests(reduced.plan, groupKey);

        // One name search serves every affiliation stating the same text, and one the funder.
        expect([...new Set(requests.institutionSearches.map(({ text }) => text))]).toEqual([SAS, 'Arcadia Fund']);

        const built = build(reduced, {
          lookups: {
            institutionCandidates: {
              [SAS]: [candidate('institution-sas', 'School of Advanced Study')],
              'Arcadia Fund': [candidate('institution-arcadia', 'Arcadia Fund')],
            },
          },
        });
        const affiliations = built.findings.filter(({ code }) => code === 'CONTRIBUTOR_AFFILIATION_UNIDENTIFIED');
        const funders = built.findings.filter(({ code }) => code === 'FUNDING_FUNDER_UNIDENTIFIED');

        expect(affiliations).toHaveLength(2);
        expect(funders).toHaveLength(1);
        expect(pathsOf(affiliations[1])).toEqual(
          everyProduct('/DescriptiveDetail[1]/Contributor[2]/ProfessionalAffiliation[1]'),
        );
        expect(pathsOf(funders[0])).toEqual(everyProduct('/PublishingDetail[1]/Publisher[1]'));
        expect(pendingCodes(built).sort()).toEqual([
          'CONTRIBUTOR_AFFILIATION_UNIDENTIFIED',
          'CONTRIBUTOR_AFFILIATION_UNIDENTIFIED',
          'CONTRIBUTOR_BIOGRAPHY_LOCALE_UNRESOLVED',
          'CONTRIBUTOR_BIOGRAPHY_LOCALE_UNRESOLVED',
          'FUNDING_FUNDER_UNIDENTIFIED',
        ]);
      });

      it('never merges differing facts: different biographies stay separate questions, and the Work names no contributors', () => {
        const differing = reduce([
          manifestation('hb', ISBN_A, '<ProductForm>BB</ProductForm>', [
            editor('Charles Burdett', 'Burdett', 'One text.'),
          ]),
          manifestation('pb', ISBN_B, '<ProductForm>BC</ProductForm>', [
            editor('Charles Burdett', 'Burdett', 'Another text.'),
          ]),
        ]);

        expect(findingsOf(differing.plan, 'CONTRIBUTOR_BIOGRAPHY_LOCALE_UNRESOLVED').map(pathsOf)).toEqual([
          [`${PRODUCT_1}/DescriptiveDetail[1]/Contributor[1]/BiographicalNote[1]`],
          ['/ONIXMessage[1]/Product[2]/DescriptiveDetail[1]/Contributor[1]/BiographicalNote[1]'],
        ]);
        expect(findingsOf(differing.plan, 'CONTRIBUTOR_GROUP_CONFLICT')).toHaveLength(1);
        expect(contributorDecision(differing).intents).toEqual([]);
      });
    });
  });

  describe('ContentItem scope', () => {
    const chapter = (contributors: string) =>
      '<ContentItem><LevelSequenceNumber>1</LevelSequenceNumber><TextItem><TextItemType>03</TextItemType></TextItem>' +
      '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>04</TitleElementLevel><TitleText language="eng">Chapter</TitleText></TitleElement></TitleDetail>' +
      `${contributors}</ContentItem>`;
    const itemPath = `${PRODUCT_1}/ContentDetail[1]/ContentItem[1]`;

    it('reduces chapter contributors with the same resolver, and never copies the parent contributors in', () => {
      const reduced = reduce([
        product({
          descriptive: withContributors(person()),
          content:
            chapter(contributorXml({ personName: 'Mary Somerville', keyNames: 'Somerville', roles: ['A01', 'A06'] })) +
            chapter('<NoContributor/>'),
        }),
      ]);

      const productKey = reduced.sourcePlan.products[0].productKey;
      const [first, second] = Object.values(reduced.plan.products[productKey].contentItems);
      expect(
        first.contributors.intents.map(({ fullName, contributions }) => [
          fullName,
          contributions.map(({ type }) => type),
        ]),
      ).toEqual([['Mary Somerville', ['AUTHOR']]]);
      expect(second.contributors).toMatchObject({ intents: [], noContributor: true });
      expect(findingsOf(reduced.plan, 'CONTRIBUTOR_ROLE_UNREPRESENTABLE')[0].locations[0].path).toBe(
        `${itemPath}/Contributor[1]`,
      );
    });
  });

  describe('grouped manifestations', () => {
    it('uses the one contributor set every contributing manifestation states, and ignores silence', () => {
      const reduced = reduce([
        product({
          ref: 'm1',
          related: manifestationOf(),
          descriptive: withContributors(person({ identifiers: [['21', '0000000163655189']] })),
        }),
        product({
          ref: 'm2',
          isbn: ISBN_B,
          related: manifestationOf(),
          descriptive: withContributors(person({ identifiers: [['21', '0000-0001-6365-5189']] })),
        }),
        product({ ref: 'm3', isbn: ISBN_C, related: manifestationOf() }),
      ]);

      expect(contributionsOf(reduced)).toEqual([[1, 'AUTHOR', 'Ada Lovelace']]);
      expect(reduced.plan.findings.filter(({ blocking, family }) => blocking && family === 'CONTRIBUTORS')).toEqual([]);
    });

    it('blocks manifestations that assert different contributors for one Work', () => {
      const reduced = reduce([
        product({ ref: 'm1', related: manifestationOf(), descriptive: withContributors(person()) }),
        product({
          ref: 'm2',
          isbn: ISBN_B,
          related: manifestationOf(),
          descriptive: withContributors(contributorXml({ personName: 'Charles Babbage', keyNames: 'Babbage' })),
        }),
      ]);

      expect(findingsOf(reduced.plan, 'CONTRIBUTOR_GROUP_CONFLICT')).toEqual([
        expect.objectContaining({ classification: 'SOURCE_CONFLICT', productKey: null, blocking: true }),
      ]);
      expect(contributorDecision(reduced).intents).toEqual([]);
    });

    it('asks to acknowledge a manifestation that says there is no contributor while another names one', () => {
      const reduced = reduce([
        product({ ref: 'm1', related: manifestationOf(), descriptive: withContributors(person()) }),
        product({ ref: 'm2', isbn: ISBN_B, related: manifestationOf(), descriptive: titleXml() + '<NoContributor/>' }),
      ]);

      const [conflict] = findingsOf(reduced.plan, 'CONTRIBUTOR_NO_CONTRIBUTOR_CONFLICT');
      expect(conflict).toMatchObject({ blocking: true, resolution: { kind: 'ACKNOWLEDGE' } });
      expect(contributionsOf(reduced)).toEqual([[1, 'AUTHOR', 'Ada Lovelace']]);
    });
  });
});

/**
 * #179 WorkType Amendment 1 (5699313101): a clearly non-binding suggestion from the canonical contributor-role
 * evidence of the grouped Work only. It is evidence for the publisher, never a WorkType the plan takes.
 */
describe('suggestOnixWorkType: the non-binding WorkType suggestion (#179 5699313101)', () => {
  const babbage = (roles: readonly string[]) =>
    contributorXml({ roles, personName: 'Charles Babbage', keyNames: 'Babbage', namesBeforeKey: 'Charles' });
  const suggestionFor = (products: string[]) => {
    const reduced = reduce(products);

    return suggestOnixWorkType(reduced.plan, onlyGroupKey(reduced));
  };
  const suggestionOf = (...contributors: string[]) =>
    suggestionFor([product({ descriptive: withContributors(...contributors) })]);

  it('suggests an edited book when the Work names editors and no author', () => {
    expect(suggestionOf(person({ roles: ['B01'] }), babbage(['B01']))).toBe(WorkTypes.enum.EditedBook);
    // Edited and translated by: the editor facet is editor evidence, the translator facet neither.
    expect(suggestionOf(person({ roles: ['B10'] }))).toBe(WorkTypes.enum.EditedBook);
  });

  it('suggests a monograph when the Work names authors and no editor', () => {
    expect(suggestionOf(person(), babbage(['A01']))).toBe(WorkTypes.enum.Monograph);
    expect(suggestionOf(person(), babbage(['B06']))).toBe(WorkTypes.enum.Monograph);
  });

  it('suggests nothing for mixed author and editor evidence, whether on two people or one', () => {
    expect(suggestionOf(person(), babbage(['B01']))).toBeNull();
    expect(suggestionOf(person({ roles: ['A01', 'B01'] }))).toBeNull();
  });

  it('suggests nothing without author or editor evidence', () => {
    expect(suggestionOf()).toBeNull();
    expect(suggestionOf(person({ roles: ['A12'] }), babbage(['B06']))).toBeNull();
    expect(suggestionFor([product({ descriptive: titleXml() + '<NoContributor/>' })])).toBeNull();
  });

  it('suggests nothing where a corporate or unnamed contributor takes an author or editor role', () => {
    expect(suggestionOf(contributorXml({ roles: ['A01'], corporate: 'Example Institute' }))).toBeNull();
    expect(
      suggestionOf(person({ roles: ['B01'] }), contributorXml({ roles: ['A01'], corporate: 'Example Institute' })),
    ).toBeNull();
    expect(suggestionOf(person(), contributorXml({ roles: ['B01'], unnamed: '03' }))).toBeNull();
    // A corporate contributor in another role says nothing about authorship or editing.
    expect(
      suggestionOf(person({ roles: ['B01'] }), contributorXml({ roles: ['A12'], corporate: 'Example Studio' })),
    ).toBe(WorkTypes.enum.EditedBook);
  });

  it("reads the Work's own contributors only: never its chapters' authors, its title, its form or its identifiers", () => {
    const chapter =
      '<ContentItem><LevelSequenceNumber>1</LevelSequenceNumber><TextItem><TextItemType>03</TextItemType></TextItem>' +
      titleDetailXml('01', [{ level: '04', text: 'A Chapter', language: 'eng' }]) +
      babbage(['A01']) +
      '</ContentItem>';

    expect(
      suggestionFor([
        product({
          form: '<ProductComposition>00</ProductComposition><ProductForm>EA</ProductForm><ProductFormDetail>E101</ProductFormDetail>',
          descriptive:
            titleDetailXml('01', [{ text: 'A Monograph of Collected Essays', language: 'eng' }]) +
            person({ roles: ['B01'] }),
          content: chapter,
        }),
      ]),
    ).toBe(WorkTypes.enum.EditedBook);
    expect(
      suggestionFor([
        product({ descriptive: titleDetailXml('01', [{ text: 'An Edited Handbook', language: 'eng' }]) }),
      ]),
    ).toBeNull();
  });

  it('suggests once for grouped manifestations that agree, and nothing for manifestations that name different people', () => {
    expect(
      suggestionFor([
        product({ ref: 'm1', related: manifestationOf(), descriptive: withContributors(person({ roles: ['B01'] })) }),
        product({
          ref: 'm2',
          isbn: ISBN_B,
          related: manifestationOf(),
          descriptive: withContributors(person({ roles: ['B01'] })),
        }),
      ]),
    ).toBe(WorkTypes.enum.EditedBook);
    expect(
      suggestionFor([
        product({ ref: 'm1', related: manifestationOf(), descriptive: withContributors(person({ roles: ['B01'] })) }),
        product({
          ref: 'm2',
          isbn: ISBN_B,
          related: manifestationOf(),
          descriptive: withContributors(babbage(['A01'])),
        }),
      ]),
    ).toBeNull();
  });

  it('is evidence only: a suggestion never becomes the WorkType a resolution takes', () => {
    const reduced = reduce([product({ descriptive: withContributors(person({ roles: ['B01'] })) })]);

    expect(suggestOnixWorkType(reduced.plan, onlyGroupKey(reduced))).toBe(WorkTypes.enum.EditedBook);
    // The descriptive Work carries no WorkType at all: nothing downstream can read the suggestion as a decision.
    expect(Object.keys(resolveOnly(reduced).values)).not.toContain('type');
    expect(JSON.stringify(reduced.plan)).not.toContain(WorkTypes.enum.EditedBook);
  });
});

type CollectionSpec = {
  readonly type?: string | null;
  readonly title?: string | null;
  readonly partNumber?: string;
  readonly sequences?: readonly [type: string, number: string][];
  readonly identifiers?: readonly [type: string, value: string, name?: string][];
  readonly subcollection?: string;
  readonly extra?: string;
};

const collectionXml = ({
  type = '10',
  title = 'Studies in Cities',
  partNumber,
  sequences = [['03', '3']],
  identifiers = [],
  subcollection,
  extra = '',
}: CollectionSpec = {}) =>
  '<Collection>' +
  (type === null ? '' : `<CollectionType>${type}</CollectionType>`) +
  identifiers
    .map(
      ([idType, value, name]) =>
        `<CollectionIdentifier><CollectionIDType>${idType}</CollectionIDType>${name ? `<IDTypeName>${name}</IDTypeName>` : ''}<IDValue>${value}</IDValue></CollectionIdentifier>`,
    )
    .join('') +
  sequences
    .map(
      ([sequenceType, number]) =>
        `<CollectionSequence><CollectionSequenceType>${sequenceType}</CollectionSequenceType><CollectionSequenceNumber>${number}</CollectionSequenceNumber></CollectionSequence>`,
    )
    .join('') +
  (title === null
    ? ''
    : `<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>02</TitleElementLevel>${partNumber ? `<PartNumber>${partNumber}</PartNumber>` : ''}<TitleText>${title}</TitleText></TitleElement>${
        subcollection
          ? `<TitleElement><TitleElementLevel>03</TitleElementLevel><TitleText>${subcollection}</TitleText></TitleElement>`
          : ''
      }</TitleDetail>`) +
  extra +
  '</Collection>';

const withCollections = (...collections: string[]) => titleXml() + collections.join('');

const seriesOf = (reduced: Reduced, choices: Record<string, string> = {}, profile = false) =>
  resolveOnly(reduced, choices, profile).values.series.map(({ name, issns, ordinal, issueNumber, thothSeriesId }) => ({
    name,
    issns,
    ordinal,
    issueNumber,
    thothSeriesId,
  }));

describe('reduceOnixDescriptive: Series / Collection / Issue (recovery ledger 5541009506 F)', () => {
  it('reads a publisher collection with its ISSN, publication-order ordinal and integer part number', () => {
    const reduced = reduce([
      product({ descriptive: withCollections(collectionXml({ identifiers: [['02', '12345679']], partNumber: '7' })) }),
    ]);

    expect(seriesOf(reduced)).toEqual([
      { name: 'Studies in Cities', issns: ['1234-5679'], ordinal: 3, issueNumber: 7, thothSeriesId: null },
    ]);
    expect(reduced.plan.findings.filter(({ family }) => family === 'SERIES')).toEqual([]);
  });

  it('keeps every Series membership of one Product', () => {
    const reduced = reduce([
      product({
        descriptive: withCollections(
          collectionXml(),
          collectionXml({ title: 'Urban Histories', sequences: [['03', '12']] }),
        ),
      }),
    ]);

    expect(seriesOf(reduced).map(({ name, ordinal }) => [name, ordinal])).toEqual([
      ['Studies in Cities', 3],
      ['Urban Histories', 12],
    ]);
  });

  it('asks whether an unspecified collection (00) is a Series before mapping it', () => {
    const reduced = reduce([product({ descriptive: withCollections(collectionXml({ type: '00' })) })]);

    const [required] = findingsOf(reduced.plan, 'SERIES_COLLECTION_TYPE_REQUIRED');
    expect(required.resolution).toEqual({
      kind: 'CHOICE',
      options: [
        { key: 'SERIES', label: 'SERIES' },
        { key: 'NOT_SERIES', label: 'NOT_SERIES' },
      ],
    });
    expect(seriesOf(reduced)).toEqual([]);
    expect(seriesOf(reduced, { [required.key]: 'SERIES' })).toHaveLength(1);
    expect(seriesOf(reduced, { [required.key]: 'NOT_SERIES' })).toEqual([]);
    expect(resolveOnly(reduced, { [required.key]: 'NOT_SERIES' }).pendingFindingKeys).not.toContain(required.key);
  });

  it.each(['11', '20'])('does not convert collection type %s into a Series, and says so', (type) => {
    const reduced = reduce([product({ descriptive: withCollections(collectionXml({ type })) })]);

    expect(seriesOf(reduced)).toEqual([]);
    expect(findingsOf(reduced.plan, 'SERIES_COLLECTION_UNREPRESENTABLE')).toEqual([
      expect.objectContaining({
        classification: 'TARGET_UNREPRESENTABLE',
        blocking: false,
        detail: { collectionType: type },
      }),
    ]);
  });

  it('never guesses a missing publication-order ordinal, not even by appending after the highest one', () => {
    const reduced = reduce([product({ descriptive: withCollections(collectionXml({ sequences: [['02', '4']] })) })]);

    expect(findingsOf(reduced.plan, 'SERIES_SEQUENCE_UNREPRESENTABLE')).toEqual([
      expect.objectContaining({ blocking: false, detail: { sequenceTypes: ['02'] } }),
    ]);
    const [required] = findingsOf(reduced.plan, 'SERIES_ORDINAL_REQUIRED');
    expect(required).toMatchObject({
      classification: 'TARGET_INPUT_REQUIRED',
      blocking: true,
      resolution: { kind: 'ACKNOWLEDGE' },
    });
    expect(seriesOf(reduced)).toEqual([]);
    expect(resolveOnly(reduced).pendingFindingKeys).toContain(required.key);
    // Acknowledged, the membership is omitted: nothing numbers the Work instead.
    expect(seriesOf(reduced, { [required.key]: 'ACKNOWLEDGED' })).toEqual([]);
    expect(resolveOnly(reduced, { [required.key]: 'ACKNOWLEDGED' }).pendingFindingKeys).not.toContain(required.key);
  });

  it('blocks contradictory publication-order numbers and numbers Thoth cannot store', () => {
    const conflicting = reduce([
      product({
        descriptive: withCollections(
          collectionXml({
            sequences: [
              ['03', '3'],
              ['03', '4'],
            ],
          }),
        ),
      }),
    ]);
    const outOfRange = reduce([
      product({ descriptive: withCollections(collectionXml({ sequences: [['03', '3000000000']] })) }),
    ]);

    expect(findingsOf(conflicting.plan, 'SERIES_ORDINAL_CONFLICT')).toEqual([
      expect.objectContaining({ blocking: true }),
    ]);
    expect(findingsOf(outOfRange.plan, 'SERIES_ORDINAL_OUT_OF_RANGE')).toEqual([
      expect.objectContaining({ blocking: true }),
    ]);
  });

  it('never reads a non-integer part number as an issue number', () => {
    const reduced = reduce([product({ descriptive: withCollections(collectionXml({ partNumber: 'IV' })) })]);

    expect(seriesOf(reduced)[0].issueNumber).toBeNull();
    expect(findingsOf(reduced.plan, 'SERIES_PART_NUMBER_UNREPRESENTABLE')).toEqual([
      expect.objectContaining({ blocking: false }),
    ]);
  });

  it('never flattens a subcollection into its collection', () => {
    const reduced = reduce([product({ descriptive: withCollections(collectionXml({ subcollection: 'Part One' })) })]);

    expect(findingsOf(reduced.plan, 'SERIES_HIERARCHY_UNREPRESENTABLE')).toEqual([
      expect.objectContaining({ blocking: true, resolution: { kind: 'NONE' } }),
    ]);
    expect(seriesOf(reduced)).toEqual([]);
  });

  it('blocks a collection with no usable title, and takes it from the Product title only as ONIX allows', () => {
    const untitled = reduce([product({ descriptive: withCollections(collectionXml({ title: null })) })]);
    const productLevel = reduce([
      product({
        descriptive:
          '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText language="eng">A Work</TitleText></TitleElement>' +
          '<TitleElement><TitleElementLevel>02</TitleElementLevel><PartNumber>5</PartNumber><TitleText>Studies in Cities</TitleText></TitleElement></TitleDetail>' +
          collectionXml({ title: null }),
      }),
    ]);

    expect(findingsOf(untitled.plan, 'SERIES_TITLE_MISSING')).toEqual([expect.objectContaining({ blocking: true })]);
    expect(seriesOf(productLevel)).toEqual([
      { name: 'Studies in Cities', issns: [], ordinal: 3, issueNumber: 5, thothSeriesId: null },
    ]);
  });

  it("keeps Thoth's proprietary Series ID only as compatibility evidence", () => {
    const reduced = reduce([
      product({
        descriptive: withCollections(
          collectionXml({
            identifiers: [
              ['01', 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', 'Series ID'],
              ['01', 'https://example.org/series', 'Series URL'],
            ],
          }),
        ),
      }),
    ]);

    expect(seriesOf(reduced)[0].thothSeriesId).toBe('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
    expect(findingsOf(reduced.plan, 'SERIES_IDENTIFIER_UNREPRESENTABLE').map(({ detail }) => detail.schemes)).toEqual([
      ['01:Series URL'],
    ]);
  });

  it('discloses collection metadata no Series field keeps', () => {
    const reduced = reduce([
      product({
        descriptive: withCollections(collectionXml({ extra: '<CollectionFrequency>10</CollectionFrequency>' })),
      }),
    ]);

    expect(findingsOf(reduced.plan, 'SERIES_METADATA_UNREPRESENTABLE')).toEqual([
      expect.objectContaining({ blocking: false }),
    ]);
  });

  it('reads NoCollection as no Series and nothing to answer', () => {
    const reduced = reduce([product({ descriptive: titleXml() + '<NoCollection/>' })]);

    expect(reduced.plan.groups[onlyGroupKey(reduced)].series).toMatchObject({ memberships: [], noCollection: true });
  });

  describe('grouped manifestations', () => {
    it('keeps one membership that every manifestation asserting it agrees on', () => {
      const reduced = reduce([
        product({ ref: 'm1', related: manifestationOf(), descriptive: withCollections(collectionXml()) }),
        product({ ref: 'm2', isbn: ISBN_B, related: manifestationOf(), descriptive: withCollections(collectionXml()) }),
        product({ ref: 'm3', isbn: ISBN_C, related: manifestationOf() }),
      ]);

      expect(seriesOf(reduced)).toHaveLength(1);
    });

    it('blocks manifestations whose memberships disagree rather than selecting one', () => {
      const reduced = reduce([
        product({ ref: 'm1', related: manifestationOf(), descriptive: withCollections(collectionXml()) }),
        product({
          ref: 'm2',
          isbn: ISBN_B,
          related: manifestationOf(),
          descriptive: withCollections(collectionXml({ sequences: [['03', '4']] })),
        }),
      ]);

      expect(findingsOf(reduced.plan, 'SERIES_GROUP_CONFLICT')).toEqual([
        expect.objectContaining({ classification: 'SOURCE_CONFLICT', productKey: null, blocking: true }),
      ]);
      expect(seriesOf(reduced)).toEqual([]);
    });

    it('asks a decision about the collection its manifestations share once, for the Work, located in every one (#209)', () => {
      const unnumbered = withCollections(collectionXml({ type: '00', sequences: [] }));
      const reduced = reduce(
        [ISBN_A, ISBN_B, ISBN_C, ISBN_D].map((isbn, index) =>
          product({ ref: `m${index + 1}`, isbn, related: manifestationOf(), descriptive: unnumbered }),
        ),
      );
      const [classification] = findingsOf(reduced.plan, 'SERIES_COLLECTION_TYPE_REQUIRED');
      const [ordinal] = findingsOf(reduced.plan, 'SERIES_ORDINAL_REQUIRED');
      const everyProduct = [1, 2, 3, 4].map(
        (index) => `/ONIXMessage[1]/Product[${index}]/DescriptiveDetail[1]/Collection[1]`,
      );

      expect(findingsOf(reduced.plan, 'SERIES_COLLECTION_TYPE_REQUIRED')).toHaveLength(1);
      expect(findingsOf(reduced.plan, 'SERIES_ORDINAL_REQUIRED')).toHaveLength(1);
      [classification, ordinal].forEach((finding) => {
        expect(finding.productKey).toBeNull();
        expect(finding.locations.map(({ path }) => path)).toEqual(everyProduct);
      });
      // One answer each settles every manifestation's occurrence.
      expect(
        resolveOnly(reduced, { [classification.key]: 'SERIES', [ordinal.key]: 'ACKNOWLEDGED' }).pendingFindingKeys,
      ).toEqual([]);
    });
  });
});

const existingFacts = (
  overrides: Partial<OnixExistingWorkDescriptiveFacts> = {},
): OnixExistingWorkDescriptiveFacts => ({
  titles: [],
  languages: [],
  subjects: [],
  contributions: [],
  issues: [],
  status: 'ACTIVE',
  publicationDate: null,
  withdrawnDate: null,
  place: '',
  landingPage: '',
  copyrightHolder: '',
  pageCount: 0,
  imageCount: 0,
  tableCount: 0,
  audioCount: 0,
  videoCount: 0,
  bibliographyNote: '',
  fundings: [],
  ...overrides,
});

const IMPRINT_ID = 'imprint-1';

const seriesEntity = (overrides: Partial<SeriesEntity> = {}): SeriesEntity => ({
  id: 'series-1',
  name: 'Studies in Cities',
  type: 'BOOK_SERIES' as SeriesEntity['type'],
  issnPrint: '',
  issnDigital: '',
  updatedAt: '',
  imprintId: IMPRINT_ID,
  imprintName: 'Example',
  url: '',
  cfpUrl: '',
  description: '',
  issues: [],
  ...overrides,
});

const compare = (
  reduced: Reduced,
  family: OnixDescriptiveFinding['family'],
  existing: OnixExistingWorkDescriptiveFacts,
  options: { choices?: Record<string, string>; serieses?: SeriesEntity[]; thothProfileActive?: boolean } = {},
) =>
  compareOnixDescriptiveFamily(reduced.plan, onlyGroupKey(reduced), family, existing, {
    choices: options.choices ?? {},
    thothProfileActive: options.thothProfileActive ?? false,
    serieses: options.serieses ?? [],
    imprintId: IMPRINT_ID,
  });

/**
 * The ISNI recovery (#205) normalises an identifier's lexical form and nothing more. Its result reaches these
 * reductions as an ordinary declared identifier: never re-validated, never read as another scheme's identity, and
 * its marker never reinterpreted.
 */
describe('reduceOnixDescriptive: a recovered ISNI passes through (proof 8)', () => {
  const ISNI_FUNDER = `${PRODUCT_1}/PublishingDetail[1]/Publisher[1]/PublisherIdentifier[1]`;
  // The approved recovery rewrites a Publisher's ISNI only, exactly as #205 records it.
  const isniMarker: RecoveryMarker = {
    recovery: 'NORMALIZE_IDENTIFIER_LEXICAL_FORM',
    rule: '_20171126_b_42',
    path: ISNI_FUNDER,
    valuePath: `${ISNI_FUNDER}/IDValue[1]`,
    scheme: { element: 'PublisherIDType', code: '16' },
    original: '0000-0001-2161-2573',
    canonical: '0000000121612573',
  };
  const source = () => [
    product({
      descriptive: withContributors(person({ identifiers: [['16', '0000000121612573']] })),
      publishing:
        '<PublishingStatus>02</PublishingStatus>' +
        '<Publisher><PublishingRole>16</PublishingRole><PublisherIdentifier><PublisherIDType>16</PublisherIDType><IDValue>0000000121612573</IDValue></PublisherIdentifier><PublisherName>Example Foundation</PublisherName></Publisher>',
    }),
  ];

  it('reduces exactly as it would without the recovery, and never reads the ISNI as an ORCID or a funder identity', () => {
    const recovered = reduce(source(), { recoveries: [isniMarker] });
    const plain = reduce(source());

    expect(recovered.plan).toEqual(plain.plan);
    expect(contributorDecision(recovered).intents.map(({ orcid }) => orcid)).toEqual([null]);
    expect(recovered.plan.findings.map(({ code, classification }) => [code, classification])).toEqual(
      expect.arrayContaining([['CONTRIBUTOR_IDENTIFIER_UNREPRESENTABLE', 'TARGET_UNREPRESENTABLE']]),
    );
    // The funder stays unidentified - no ROR, no FundRef DOI - for the publisher to identify, never by its ISNI.
    expect(resolveOnly(recovered).values.funders.map(({ key, ror, fundrefDoi }) => [key, ror, fundrefDoi])).toEqual([
      ['name:Example Foundation', null, null],
    ]);
    // Source validity is the canonical validator's alone: nothing here says the identifier is invalid.
    expect(recovered.plan.findings.filter(({ classification }) => classification === 'PREFLIGHT_GAP')).toEqual([]);
  });
});

describe('compareOnixDescriptiveFamily: exact existing-Work compatibility (#182 Amendments 2 + 3)', () => {
  const canonical = (title: string, localeCode = 'EN', subtitle = '') => ({
    canonical: true,
    title,
    subtitle,
    fullTitle: subtitle ? `${title}: ${subtitle}` : title,
    localeCode,
  });

  describe('TITLE', () => {
    const source = () =>
      reduce([
        product({ descriptive: titleDetailXml('01', [{ text: 'Cities', subtitle: 'A History', language: 'eng' }]) }),
      ]);

    it('is compatible when the existing canonical title is the source title', () => {
      expect(compare(source(), 'TITLE', existingFacts({ titles: [canonical('Cities', 'EN', 'A History')] }))).toEqual({
        outcome: 'COMPATIBLE',
        reasons: [],
        findingKeys: [],
      });
    });

    it('is contradicted by a different existing canonical title', () => {
      expect(
        compare(source(), 'TITLE', existingFacts({ titles: [canonical('Towns', 'EN', 'A History')] })).outcome,
      ).toBe('CONTRADICTED');
    });

    it('stays unverified when the existing title carries markup it cannot be compared through', () => {
      expect(
        compare(source(), 'TITLE', existingFacts({ titles: [canonical('<italic>Cities</italic>', 'EN', 'A History')] }))
          .outcome,
      ).toBe('UNVERIFIED');
    });

    it('stays unverified when the source full title is markup, which the read-back text cannot be compared with', () => {
      const marked = reduce([
        product({
          descriptive: titleDetailXml(
            '01',
            [{ text: 'Cities', subtitle: 'A History', language: 'eng' }],
            '<TitleStatement textformat="03">&lt;italic&gt;Cities&lt;/italic&gt;: A History</TitleStatement>',
          ),
        }),
      ]);
      const existing = { ...canonical('Cities', 'EN', 'A History'), fullTitle: 'Cities: A History' };

      expect(compare(marked, 'TITLE', existingFacts({ titles: [existing] }))).toEqual({
        outcome: 'UNVERIFIED',
        reasons: ['TITLE_NOT_COMPARABLE'],
        findingKeys: [],
      });
    });

    it("compares the Work title only: a chapter title the source leaves open is the chapters' question", () => {
      const chapterTitle = (text: string) =>
        `<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>04</TitleElementLevel><TitleText language="eng">${text}</TitleText></TitleElement></TitleDetail>`;
      const reduced = reduce([
        product({
          descriptive: titleDetailXml('01', [{ text: 'Cities', subtitle: 'A History', language: 'eng' }]),
          content: `<ContentItem><LevelSequenceNumber>1</LevelSequenceNumber><TextItem><TextItemType>03</TextItemType></TextItem>${chapterTitle('One')}${chapterTitle('Two')}</ContentItem>`,
        }),
      ]);

      expect(findingsOf(reduced.plan, 'TITLE_CANONICAL_CONFLICT')).toEqual([
        expect.objectContaining({ blocking: true }),
      ]);
      expect(
        compare(reduced, 'TITLE', existingFacts({ titles: [canonical('Cities', 'EN', 'A History')] })).outcome,
      ).toBe('COMPATIBLE');
    });

    it('stays unverified while the source leaves its canonical title open', () => {
      const ambiguous = reduce([
        product({
          descriptive:
            titleDetailXml('01', [{ text: 'Cities', language: 'eng' }]) +
            titleDetailXml('01', [{ text: 'Towns', language: 'eng' }]),
        }),
      ]);

      const [choice] = findingsOf(ambiguous.plan, 'TITLE_CANONICAL_CONFLICT');

      expect(compare(ambiguous, 'TITLE', existingFacts({ titles: [canonical('Cities')] }))).toEqual({
        outcome: 'UNVERIFIED',
        reasons: ['TITLE_CANONICAL_CONFLICT'],
        findingKeys: [choice.key],
      });
    });
  });

  describe('CONTRIBUTORS', () => {
    const existing = (overrides: Partial<OnixExistingWorkDescriptiveFacts['contributions'][number]> = {}) =>
      existingFacts({
        contributions: [{ type: 'AUTHOR', orderNumber: 1, fullName: 'Ada Lovelace', orcid: '', ...overrides }],
      });

    it('is compatible when every mapped source contribution is on the Work, whatever losses were acknowledged', () => {
      const reduced = reduce([product({ descriptive: withContributors(person({ roles: ['A01', 'A02'] })) })]);

      expect(compare(reduced, 'CONTRIBUTORS', existing()).outcome).toBe('COMPATIBLE');
    });

    it('identifies people by exact ORCID, not by display name', () => {
      const reduced = reduce([
        product({
          descriptive: withContributors(
            person({ personName: 'A. Lovelace', identifiers: [['21', '0000000163655189']] }),
          ),
        }),
      ]);

      expect(
        compare(reduced, 'CONTRIBUTORS', existing({ orcid: 'https://orcid.org/0000-0001-6365-5189' })).outcome,
      ).toBe('COMPATIBLE');
      expect(
        compare(reduced, 'CONTRIBUTORS', existing({ orcid: 'https://orcid.org/0000-0002-1694-2338' })).outcome,
      ).toBe('CONTRADICTED');
    });

    it('is contradicted by a different role or person at a source position, and unverified where the Work has none', () => {
      const reduced = reduce([
        product({
          descriptive: withContributors(
            person(),
            contributorXml({ personName: 'Charles Babbage', keyNames: 'Babbage' }),
          ),
        }),
      ]);

      expect(compare(reduced, 'CONTRIBUTORS', existing({ type: 'EDITOR' })).outcome).toBe('CONTRADICTED');
      expect(compare(reduced, 'CONTRIBUTORS', existing()).outcome).toBe('UNVERIFIED');
    });

    it('is contradicted when the source says there is no contributor but the Work has contributors', () => {
      const reduced = reduce([product({ descriptive: titleXml() + '<NoContributor/>' })]);

      expect(compare(reduced, 'CONTRIBUTORS', existing()).outcome).toBe('CONTRADICTED');
      expect(compare(reduced, 'CONTRIBUTORS', existingFacts()).outcome).toBe('COMPATIBLE');
    });

    it('compares contributions in the order the publisher chose for ambiguous source numbering', () => {
      const reduced = reduce([
        product({
          descriptive: withContributors(
            person({ sequence: '2' }),
            contributorXml({ personName: 'Charles Babbage', keyNames: 'Babbage', sequence: '1' }),
            contributorXml({ personName: 'Mary Somerville', keyNames: 'Somerville', sequence: '1' }),
          ),
        }),
      ]);
      const [ambiguous] = findingsOf(reduced.plan, 'CONTRIBUTOR_ORDER_AMBIGUOUS');
      const onWork = existingFacts({
        contributions: ['Charles Babbage', 'Mary Somerville', 'Ada Lovelace'].map((fullName, index) => ({
          type: 'AUTHOR',
          orderNumber: index + 1,
          fullName,
          orcid: '',
        })),
      });

      expect(compare(reduced, 'CONTRIBUTORS', onWork)).toEqual({
        outcome: 'UNVERIFIED',
        reasons: ['CONTRIBUTOR_ORDER_AMBIGUOUS'],
        findingKeys: [ambiguous.key],
      });
      expect(compare(reduced, 'CONTRIBUTORS', onWork, { choices: { [ambiguous.key]: 'FILE_ORDER' } }).outcome).toBe(
        'CONTRADICTED',
      );
      expect(compare(reduced, 'CONTRIBUTORS', onWork, { choices: { [ambiguous.key]: 'SEQUENCE_ORDER' } }).outcome).toBe(
        'COMPATIBLE',
      );
    });

    it('never compares a contributor the source names only by an inverted name, whatever name is entered for creation', () => {
      const reduced = reduce([
        product({ descriptive: withContributors(contributorXml({ inverted: 'Lovelace, Ada' })) }),
      ]);
      const [surname, name] = findingsOf(reduced.plan, 'CONTRIBUTOR_NAME_REQUIRED');

      expect(
        compare(reduced, 'CONTRIBUTORS', existing(), {
          choices: { [surname.key]: 'Lovelace', [name.key]: 'Ada Lovelace' },
        }),
      ).toEqual({ outcome: 'UNVERIFIED', reasons: ['CONTRIBUTOR_NAME_NOT_COMPARABLE'], findingKeys: [] });
    });

    it('stays unverified while a source contributor cannot be read', () => {
      const reduced = reduce([
        product({ descriptive: withContributors(person({ identifiers: [['21', 'not-an-orcid']] })) }),
      ]);

      expect(compare(reduced, 'CONTRIBUTORS', existing()).outcome).toBe('UNVERIFIED');
    });
  });

  describe('LANGUAGES and SUBJECTS', () => {
    it('compares Work languages code by code', () => {
      const reduced = reduce([
        product({ descriptive: withLanguages(languageXml('01', 'fre'), languageXml('02', 'eng')) }),
      ]);

      expect(
        compare(
          reduced,
          'LANGUAGES',
          existingFacts({
            languages: [
              { code: 'FRE', relation: 'TRANSLATED_INTO' },
              { code: 'ENG', relation: 'TRANSLATED_FROM' },
              { code: 'GER', relation: 'ORIGINAL' },
            ],
          }),
        ).outcome,
      ).toBe('COMPATIBLE');
      expect(
        compare(reduced, 'LANGUAGES', existingFacts({ languages: [{ code: 'FRE', relation: 'ORIGINAL' }] })).outcome,
      ).toBe('CONTRADICTED');
      expect(
        compare(reduced, 'LANGUAGES', existingFacts({ languages: [{ code: 'FRE', relation: 'TRANSLATED_INTO' }] }))
          .outcome,
      ).toBe('UNVERIFIED');
    });

    it('compares subjects by type and code, and a stated primary subject against the primary one', () => {
      const reduced = reduce([
        product({
          descriptive: withSubjects(
            { scheme: '93', code: 'NHD', main: true },
            { scheme: '23', name: 'Cats', code: 'LAW' },
          ),
        }),
      ]);
      const subjects = [
        { type: 'THEMA', code: 'NHB', ordinal: 1 },
        { type: 'THEMA', code: 'NHD', ordinal: 2 },
        { type: 'CUSTOM', code: 'LAW', ordinal: 1 },
      ];

      expect(compare(reduced, 'SUBJECTS', existingFacts({ subjects })).outcome).toBe('CONTRADICTED');
      expect(
        compare(
          reduced,
          'SUBJECTS',
          existingFacts({ subjects: [{ type: 'THEMA', code: 'NHD', ordinal: 1 }, subjects[2]] }),
        ).outcome,
      ).toBe('COMPATIBLE');
      expect(
        compare(reduced, 'SUBJECTS', existingFacts({ subjects: [{ type: 'THEMA', code: 'NHD', ordinal: 1 }] })).outcome,
      ).toBe('UNVERIFIED');
    });

    it('is compatible when a subject family asserts only facts Thoth cannot hold', () => {
      const reduced = reduce([product({ descriptive: withSubjects({ scheme: '24', name: 'House', code: 'X' }) })]);

      expect(compare(reduced, 'SUBJECTS', existingFacts()).outcome).toBe('COMPATIBLE');
    });
  });

  describe('SERIES', () => {
    const source = (collection = collectionXml()) => reduce([product({ descriptive: withCollections(collection) })]);

    it('compares the issue ordinal in the exact existing Series', () => {
      const serieses = [seriesEntity()];

      expect(
        compare(
          source(),
          'SERIES',
          existingFacts({ issues: [{ seriesId: 'series-1', seriesName: 'Studies in Cities', ordinal: 3 }] }),
          { serieses },
        ).outcome,
      ).toBe('COMPATIBLE');
      expect(
        compare(
          source(),
          'SERIES',
          existingFacts({ issues: [{ seriesId: 'series-1', seriesName: 'Studies in Cities', ordinal: 4 }] }),
          { serieses },
        ).outcome,
      ).toBe('CONTRADICTED');
      expect(compare(source(), 'SERIES', existingFacts(), { serieses }).outcome).toBe('UNVERIFIED');
    });

    it('stays unverified for an issue number the existing Work does not expose, and for a Series Thoth does not have', () => {
      expect(
        compare(
          source(collectionXml({ partNumber: '7' })),
          'SERIES',
          existingFacts({ issues: [{ seriesId: 'series-1', seriesName: 'Studies in Cities', ordinal: 3 }] }),
          { serieses: [seriesEntity()] },
        ).outcome,
      ).toBe('UNVERIFIED');
      expect(compare(source(), 'SERIES', existingFacts(), { serieses: [] }).outcome).toBe('UNVERIFIED');
    });

    it('is contradicted when the source says there is no collection but the Work is in a Series', () => {
      const reduced = reduce([product({ descriptive: titleXml() + '<NoCollection/>' })]);

      expect(
        compare(reduced, 'SERIES', existingFacts({ issues: [{ seriesId: 'series-1', seriesName: 'X', ordinal: 1 }] }))
          .outcome,
      ).toBe('CONTRADICTED');
    });
  });

  describe('Work-level values', () => {
    it.each([
      ['EXTENT', titleXml() + extent('05', '240'), { pageCount: 240 }, { pageCount: 250 }, { pageCount: 0 }],
      [
        'ANCILLARY_CONTENT',
        titleXml() + ancillary('09', '12'),
        { imageCount: 12 },
        { imageCount: 10 },
        { imageCount: 0 },
      ],
    ] as const)(
      '%s: equal is compatible, different is contradicted, an unset target is unverified',
      (family, descriptive, equal, different, unset) => {
        const reduced = reduce([product({ descriptive })]);

        expect(compare(reduced, family, existingFacts(equal)).outcome).toBe('COMPATIBLE');
        expect(compare(reduced, family, existingFacts(different)).outcome).toBe('CONTRADICTED');
        expect(compare(reduced, family, existingFacts(unset)).outcome).toBe('UNVERIFIED');
      },
    );

    it('ANCILLARY_CONTENT: an explicit zero stays unverified, since the read-back cannot tell zero from unset', () => {
      const reduced = reduce([product({ descriptive: titleXml() + ancillary('11', '0') })]);

      expect(compare(reduced, 'ANCILLARY_CONTENT', existingFacts({ tableCount: 0 }))).toEqual({
        outcome: 'UNVERIFIED',
        reasons: ['TABLE_COUNT_NOT_COMPARABLE'],
        findingKeys: [],
      });
      expect(compare(reduced, 'ANCILLARY_CONTENT', existingFacts({ tableCount: 4 })).outcome).toBe('CONTRADICTED');
    });

    it.each([
      [
        'COPYRIGHT',
        publishing('<PublishingStatus>02</PublishingStatus>', copyright(personOwner('Ada Lovelace'))),
        'copyrightHolder',
        'Ada Lovelace',
        'Someone Else',
      ],
      [
        'LANDING_PAGE',
        publishing(
          publisherXml('01', website('02', 'https://example.org/cities')),
          '<PublishingStatus>02</PublishingStatus>',
        ),
        'landingPage',
        'https://example.org/cities',
        'https://example.org/other',
      ],
      [
        'PLACE',
        publishing('<CityOfPublication>London</CityOfPublication>', '<PublishingStatus>02</PublishingStatus>'),
        'place',
        'London',
        'Paris',
      ],
    ] as const)(
      '%s compares exactly, and an empty target field is unverified',
      (family, publishingXml, field, equal, different) => {
        const reduced = reduce([product({ publishing: publishingXml })]);

        expect(compare(reduced, family, existingFacts({ [field]: equal })).outcome).toBe('COMPATIBLE');
        expect(compare(reduced, family, existingFacts({ [field]: different })).outcome).toBe('CONTRADICTED');
        expect(compare(reduced, family, existingFacts({ [field]: '' })).outcome).toBe('UNVERIFIED');
      },
    );

    it('LIFECYCLE compares status and dates, with source absence never a contradiction', () => {
      const reduced = reduce([
        product({ publishing: publishing('<PublishingStatus>04</PublishingStatus>', date('01', '20240315')) }),
      ]);
      const undated = reduce([product({ publishing: '<PublishingStatus>04</PublishingStatus>' })]);

      expect(
        compare(reduced, 'LIFECYCLE', existingFacts({ status: 'ACTIVE', publicationDate: '2024-03-15' })).outcome,
      ).toBe('COMPATIBLE');
      expect(
        compare(reduced, 'LIFECYCLE', existingFacts({ status: 'FORTHCOMING', publicationDate: '2024-03-15' })).outcome,
      ).toBe('CONTRADICTED');
      expect(
        compare(reduced, 'LIFECYCLE', existingFacts({ status: 'ACTIVE', publicationDate: '2024-04-01' })).outcome,
      ).toBe('CONTRADICTED');
      expect(
        compare(undated, 'LIFECYCLE', existingFacts({ status: 'ACTIVE', publicationDate: '2024-03-15' })).outcome,
      ).toBe('COMPATIBLE');
    });

    it('FUNDING matches funders by exact ROR and stays unverified for a DOI-only funder', () => {
      const byRor = reduce([
        product({
          publishing: publishing(funderXml({ role: '14', ror: ROR }), '<PublishingStatus>02</PublishingStatus>'),
        }),
      ]);
      const byDoi = reduce([
        product({
          publishing: publishing(
            funderXml({ role: '14', fundref: '10.13039/501100000780' }),
            '<PublishingStatus>02</PublishingStatus>',
          ),
        }),
      ]);
      const funding = {
        institutionId: 'i1',
        institutionRor: ROR,
        program: '',
        projectName: '',
        projectShortname: '',
        grantNumber: '',
      };

      expect(compare(byRor, 'FUNDING', existingFacts({ fundings: [funding] })).outcome).toBe('COMPATIBLE');
      expect(compare(byRor, 'FUNDING', existingFacts()).outcome).toBe('UNVERIFIED');
      expect(compare(byDoi, 'FUNDING', existingFacts({ fundings: [funding] })).outcome).toBe('UNVERIFIED');
    });

    it('ILLUSTRATIONS_NOTE is compatible as a generic loss, and compared as a bibliography note under the Thoth profile', () => {
      const reduced = reduce([product({ descriptive: titleXml() + '<IllustrationsNote>12 maps</IllustrationsNote>' })]);

      expect(compare(reduced, 'ILLUSTRATIONS_NOTE', existingFacts({ bibliographyNote: 'Other' })).outcome).toBe(
        'COMPATIBLE',
      );
      expect(
        compare(reduced, 'ILLUSTRATIONS_NOTE', existingFacts({ bibliographyNote: '12 maps' }), {
          thothProfileActive: true,
        }).outcome,
      ).toBe('COMPATIBLE');
      expect(
        compare(reduced, 'ILLUSTRATIONS_NOTE', existingFacts({ bibliographyNote: 'Other' }), {
          thothProfileActive: true,
        }).outcome,
      ).toBe('CONTRADICTED');
    });
  });
});

/* ------------------------------------------------------------------------------------------------ */
/* Building the Work from exact lookups and the publisher's answers                                 */
/* ------------------------------------------------------------------------------------------------ */

const LOOKUP_ORCID = '0000-0001-6365-5189';
const LOOKUP_ROR = 'https://ror.org/05dxps055';

/** The lookups the adapter would make for a group, all answered "nothing in Thoth" unless overridden. */
const lookupsFor = (
  reduced: Reduced,
  groupKey: string,
  overrides: Partial<OnixDescriptiveLookups> = {},
): OnixDescriptiveLookups => {
  const requests = descriptiveLookupRequests(reduced.plan, groupKey);

  return {
    contributors: Object.fromEntries(
      requests.contributors.map(({ key }) => [key, { orcidMatch: null, alternatives: [] }]),
    ),
    institutions: Object.fromEntries(requests.rors.map((ror) => [ror, { kind: 'NOT_FOUND' }])),
    funders: Object.fromEntries(requests.funders.map(({ key }) => [key, { kind: 'NOT_FOUND' }])),
    // Every name search the adapter would make, answered with no suggestion.
    institutionCandidates: Object.fromEntries(requests.institutionSearches.map(({ text }) => [text, []])),
    chapterWorkIds: Object.fromEntries(requests.chapterPaths.map((path, index) => [path, `chapter-${index + 1}`])),
    ...overrides,
    ...(overrides.contributors
      ? {
          contributors: {
            ...Object.fromEntries(
              requests.contributors.map(({ key }) => [key, { orcidMatch: null, alternatives: [] }]),
            ),
            ...overrides.contributors,
          },
        }
      : {}),
  };
};

const build = (
  reduced: Reduced,
  options: {
    choices?: Record<string, string>;
    lookups?: Partial<OnixDescriptiveLookups>;
    thothProfileActive?: boolean;
  } = {},
) => {
  const groupKey = onlyGroupKey(reduced);

  return buildOnixDescriptiveWork(reduced.plan, groupKey, {
    choices: options.choices ?? {},
    thothProfileActive: options.thothProfileActive ?? false,
    lookups: lookupsFor(reduced, groupKey, options.lookups),
  });
};

const pendingCodes = (built: ReturnType<typeof build>) =>
  built.pendingFindingKeys.map((key) => built.findings.find((finding) => finding.key === key)?.code);

/** An existing Thoth institution a name search returned: a suggestion, never an identity. */
const candidate = (institutionId: string, name: string, ror = '', doi = '') => ({ institutionId, name, ror, doi });

describe('buildOnixDescriptiveWork: the Work from exact lookups and answers', () => {
  describe('contributions', () => {
    const contributorKey = (reduced: Reduced) =>
      descriptiveLookupRequests(reduced.plan, onlyGroupKey(reduced)).contributors[0].key;

    it('asks what Thoth holds for every contributor intent, affiliation ROR, funder and chapter, once each', () => {
      const reduced = reduce([
        product({
          descriptive: withContributors(
            person({
              identifiers: [['21', LOOKUP_ORCID]],
              affiliations: [affiliationXml('Example University', [['40', LOOKUP_ROR]])],
            }),
          ),
          publishing: `<PublishingStatus>02</PublishingStatus>${funderXml({ role: '16', ror: LOOKUP_ROR })}`,
          content:
            '<ContentItem><LevelSequenceNumber>1</LevelSequenceNumber><TextItem><TextItemType>03</TextItemType></TextItem>' +
            `${titleDetailXml('01', [{ level: '04', text: 'Chapter' }])}${person({ identifiers: [['21', LOOKUP_ORCID]] })}</ContentItem>`,
        }),
      ]);

      const requests = descriptiveLookupRequests(reduced.plan, onlyGroupKey(reduced));

      expect(
        requests.contributors.map(({ key, orcid, fullName, ordinals }) => [key, orcid, fullName, ordinals]),
      ).toEqual([
        [`${PRODUCT_1}/DescriptiveDetail[1]/Contributor[1]`, LOOKUP_ORCID, 'Ada Lovelace', [1]],
        [`${PRODUCT_1}/ContentDetail[1]/ContentItem[1]/Contributor[1]`, LOOKUP_ORCID, 'Ada Lovelace', [1]],
      ]);
      expect(requests.rors).toEqual([LOOKUP_ROR]);
      expect(requests.funders.map(({ ror }) => ror)).toEqual([LOOKUP_ROR]);
      // A name is searched only should the exact identity find nothing: the adapter decides that from its answer.
      expect(requests.institutionSearches).toEqual([
        { text: 'Example University', ror: LOOKUP_ROR, funderKey: null },
        { text: 'Example Foundation', ror: LOOKUP_ROR, funderKey: `ror:${LOOKUP_ROR}` },
      ]);
      expect(requests.chapterPaths).toEqual([`${PRODUCT_1}/ContentDetail[1]/ContentItem[1]`]);
    });

    it('builds one new contributor intent into a contribution per mapped role, sharing one intent', () => {
      const reduced = reduce([product({ descriptive: withContributors(person({ roles: ['B10'] })) })]);

      const built = build(reduced);

      expect(
        built.contributions.map(({ type, orderNumber, contributorId, fullName, lastName }) => [
          type,
          orderNumber,
          contributorId,
          fullName,
          lastName,
        ]),
      ).toEqual([
        ['EDITOR', 1, '0000-0000-0000-0000', 'Ada Lovelace', 'Lovelace'],
        ['TRANSLATOR', 2, '0000-0000-0000-0000', 'Ada Lovelace', 'Lovelace'],
      ]);
      expect(built.contributorIntents).toEqual([{ chapterPath: null, key: contributorKey(reduced), ordinals: [1, 2] }]);
    });

    it('points an exactly ORCID-identified contributor at the existing contributor, which may supply the missing surname', () => {
      const reduced = reduce([
        product({
          descriptive: withContributors(
            contributorXml({ personName: 'Ada Lovelace', identifiers: [['21', LOOKUP_ORCID]] }),
          ),
        }),
      ]);
      const key = contributorKey(reduced);

      expect(pendingCodes(build(reduced))).toEqual(['CONTRIBUTOR_NAME_REQUIRED']);

      const built = build(reduced, {
        lookups: {
          contributors: {
            [key]: {
              orcidMatch: {
                contributorId: 'contributor-1',
                fullName: 'Augusta Ada King',
                lastName: 'King',
                firstName: 'Augusta Ada',
                orcid: LOOKUP_ORCID,
                website: '',
                lastContributionTitle: 'Notes',
              },
              alternatives: [],
            },
          },
        },
      });

      expect(
        built.contributions.map(({ contributorId, fullName, lastName, orcidId }) => [
          contributorId,
          fullName,
          lastName,
          orcidId,
        ]),
      ).toEqual([['contributor-1', 'Ada Lovelace', 'King', LOOKUP_ORCID]]);
      expect(built.pendingFindingKeys).toEqual([]);
      expect(built.findings.filter(({ code }) => code === 'CONTRIBUTOR_ORCID_NAME_ENRICHED')).toEqual([
        expect.objectContaining({ blocking: false, classification: 'SUPPORTED_WITH_WARNING' }),
      ]);
    });

    it('marks canonical the biography the publisher chose, and no other', () => {
      const reduced = reduce([
        product({
          descriptive: withContributors(
            person({
              biographies: [
                biographyXml('An English note', ' language="eng"'),
                biographyXml('Une note', ' language="fre"'),
              ],
            }),
          ),
        }),
      ]);
      const [canonical] = findingsOf(reduced.plan, 'CONTRIBUTOR_BIOGRAPHY_CANONICAL_REQUIRED');

      expect(build(reduced).pendingFindingKeys).toEqual([canonical.key]);

      const built = build(reduced, { choices: { [canonical.key]: 'FR' } });

      expect(
        built.contributions[0].biographies.map(({ localeCode, canonical: isCanonical }) => [localeCode, isCanonical]),
      ).toEqual([
        ['EN', false],
        ['FR', true],
      ]);
      expect(built.pendingFindingKeys).toEqual([]);
    });

    it('writes a biography in the locale the publisher gives it, and no biography while none is given (#209 E)', () => {
      const reduced = reduce([
        product({
          descriptive:
            withContributors(person({ biographies: [biographyXml('Ada was a mathematician.', ' textformat="06"')] })) +
            languageXml('01', 'eng'),
        }),
      ]);
      const [locale] = findingsOf(reduced.plan, 'CONTRIBUTOR_BIOGRAPHY_LOCALE_UNRESOLVED');
      const biographiesOf = (built: ReturnType<typeof build>) =>
        built.contributions[0].biographies.map(({ localeCode, canonical, content, sourceMarkupFormat }) => [
          localeCode,
          canonical,
          content,
          sourceMarkupFormat,
        ]);

      expect(build(reduced).pendingFindingKeys).toEqual([locale.key]);
      expect(biographiesOf(build(reduced))).toEqual([]);
      expect(biographiesOf(build(reduced, { choices: { [locale.key]: 'EN_GB' } }))).toEqual([
        ['EN_GB', true, 'Ada was a mathematician.', 'PLAIN_TEXT'],
      ]);
      expect(build(reduced, { choices: { [locale.key]: 'EN_GB' } }).pendingFindingKeys).toEqual([]);
    });

    it("holds given biography locales to Thoth's one biography per locale, and asks for the canonical one among them", () => {
      const reduced = reduce([
        product({
          descriptive: withContributors(
            person({
              biographies: [
                biographyXml('First text.'),
                biographyXml('Second text.'),
                biographyXml('Third', ' language="ger"'),
              ],
            }),
          ),
        }),
      ]);
      const [first, second] = findingsOf(reduced.plan, 'CONTRIBUTOR_BIOGRAPHY_LOCALE_UNRESOLVED');
      const localesOf = (built: ReturnType<typeof build>) =>
        built.contributions[0].biographies.map(({ localeCode, canonical, content }) => [
          localeCode,
          canonical,
          content,
        ]);

      // The same locale for two different texts is a collision, whose omission the publisher may acknowledge.
      const colliding = build(reduced, { choices: { [first.key]: 'EN', [second.key]: 'EN' } });
      const [collision] = colliding.findings.filter(({ code }) => code === 'CONTRIBUTOR_BIOGRAPHY_LOCALE_COLLISION');

      expect(collision).toMatchObject({
        blocking: true,
        resolution: { kind: 'ACKNOWLEDGE' },
        detail: { localeCode: 'EN' },
      });
      expect(colliding.pendingFindingKeys).toContain(collision.key);

      // Distinct locales leave three biographies, and ONIX says none is primary: the publisher chooses.
      const distinct = build(reduced, { choices: { [first.key]: 'EN', [second.key]: 'FR' } });
      const [canonical] = distinct.findings.filter(({ code }) => code === 'CONTRIBUTOR_BIOGRAPHY_CANONICAL_REQUIRED');

      expect(canonical.resolution).toEqual({
        kind: 'CHOICE',
        options: [
          { key: 'DE', label: 'DE' },
          { key: 'EN', label: 'EN' },
          { key: 'FR', label: 'FR' },
        ],
      });
      expect(distinct.pendingFindingKeys).toEqual([canonical.key]);

      const chosen = build(reduced, { choices: { [first.key]: 'EN', [second.key]: 'FR', [canonical.key]: 'FR' } });

      expect(localesOf(chosen)).toEqual([
        ['DE', false, 'Third'],
        ['EN', false, 'First text.'],
        ['FR', true, 'Second text.'],
      ]);
      expect(chosen.pendingFindingKeys).toEqual([]);
    });

    it('imports an affiliation through the Institution its ROR names, or only the institution the publisher then chooses', () => {
      const reduced = reduce([
        product({
          descriptive: withContributors(
            person({ affiliations: [affiliationXml('Example University', [['40', LOOKUP_ROR]], ['Professor'])] }),
          ),
        }),
      ]);
      const affiliationsOf = (built: ReturnType<typeof build>) =>
        built.contributions[0].affiliations.map(({ institutionId, institutionName, rorId, position, orderNumber }) => [
          institutionId,
          institutionName,
          rorId,
          position,
          orderNumber,
        ]);

      const found = build(reduced, {
        lookups: {
          institutions: {
            [LOOKUP_ROR]: {
              kind: 'FOUND',
              institutionId: 'institution-1',
              name: 'Example University',
              ror: LOOKUP_ROR,
            },
          },
        },
      });

      expect(affiliationsOf(found)).toEqual([['institution-1', 'Example University', LOOKUP_ROR, 'Professor', 1]]);

      // The declared ROR names no Thoth institution: the name suggests some, and a different ROR rules one out.
      const suggested = {
        institutionCandidates: {
          'Example University': [
            candidate('institution-other', 'Example University', 'https://ror.org/0abcdef12'),
            candidate('institution-press', 'Example University Press'),
          ],
        },
      };
      const missing = build(reduced, { lookups: suggested });
      const [unresolved] = missing.findings.filter(({ code }) => code === 'CONTRIBUTOR_AFFILIATION_UNRESOLVED');

      expect(unresolved).toMatchObject({
        blocking: true,
        classification: 'TARGET_INPUT_REQUIRED',
        resolution: {
          kind: 'CHOICE',
          options: [
            { key: 'institution-press', label: 'Example University Press' },
            { key: 'OMIT', label: 'Example University' },
          ],
        },
      });
      expect(missing.pendingFindingKeys).toEqual([unresolved.key]);
      expect(missing.contributions[0].affiliations).toEqual([]);
      expect(
        affiliationsOf(build(reduced, { lookups: suggested, choices: { [unresolved.key]: 'institution-press' } })),
      ).toEqual([['institution-press', 'Example University Press', '', 'Professor', 1]]);
      expect(build(reduced, { lookups: suggested, choices: { [unresolved.key]: 'OMIT' } })).toMatchObject({
        contributions: [expect.objectContaining({ affiliations: [] })],
        pendingFindingKeys: [],
      });
      // An institution the decision does not offer answers nothing.
      expect(
        build(reduced, { lookups: suggested, choices: { [unresolved.key]: 'institution-other' } }).pendingFindingKeys,
      ).toEqual([unresolved.key]);
    });

    it('offers name suggestions for an affiliation without a ROR, choosing none, and binds the institution the publisher chooses', () => {
      const text = 'School of Advanced Study, University of London (United Kingdom)';
      const reduced = reduce([
        product({ descriptive: withContributors(person({ affiliations: [affiliationXml(text, [], ['Professor'])] })) }),
      ]);
      const lookups = {
        institutionCandidates: {
          [text]: [
            candidate('institution-sas', 'School of Advanced Study', 'https://ror.org/04kjz2v51'),
            candidate('institution-uol', 'University of London', 'https://ror.org/04cw6st05'),
          ],
        },
      };

      const unanswered = build(reduced, { lookups });
      const [decision] = unanswered.findings.filter(({ code }) => code === 'CONTRIBUTOR_AFFILIATION_UNIDENTIFIED');

      expect(decision).toMatchObject({
        classification: 'TARGET_INPUT_REQUIRED',
        blocking: true,
        detail: { affiliation: text, position: 'Professor', suggestions: 2 },
        resolution: {
          kind: 'CHOICE',
          options: [
            { key: 'institution-sas', label: 'School of Advanced Study · https://ror.org/04kjz2v51' },
            { key: 'institution-uol', label: 'University of London · https://ror.org/04cw6st05' },
            { key: 'OMIT', label: text },
          ],
        },
      });
      expect(decision.locations.map(({ path }) => path)).toEqual([
        `${PRODUCT_1}/DescriptiveDetail[1]/Contributor[1]/ProfessionalAffiliation[1]`,
      ]);
      expect(unanswered.pendingFindingKeys).toEqual([decision.key]);
      expect(unanswered.contributions[0].affiliations).toEqual([]);

      const chosen = build(reduced, { lookups, choices: { [decision.key]: 'institution-uol' } });

      expect(
        chosen.contributions[0].affiliations.map(({ institutionId, institutionName, rorId, position }) => [
          institutionId,
          institutionName,
          rorId,
          position,
        ]),
      ).toEqual([['institution-uol', 'University of London', 'https://ror.org/04cw6st05', 'Professor']]);
      expect(chosen.pendingFindingKeys).toEqual([]);
      // Clearing the decision blocks again.
      expect(build(reduced, { lookups, choices: {} }).pendingFindingKeys).toEqual([decision.key]);
    });

    it('fails closed on an affiliation name Thoth was never searched for, and offers only no affiliation when nothing matches', () => {
      const reduced = reduce([
        product({ descriptive: withContributors(person({ affiliations: [affiliationXml('Nowhere Institute')] })) }),
      ]);

      expect(pendingCodes(build(reduced, { lookups: { institutionCandidates: {} } }))).toEqual([
        'CONTRIBUTOR_LOOKUP_UNAVAILABLE',
      ]);

      const [decision] = build(reduced).findings.filter(({ code }) => code === 'CONTRIBUTOR_AFFILIATION_UNIDENTIFIED');

      expect(decision.resolution).toEqual({ kind: 'CHOICE', options: [{ key: 'OMIT', label: 'Nowhere Institute' }] });
      expect(build(reduced, { choices: { [decision.key]: 'OMIT' } }).pendingFindingKeys).toEqual([]);
    });

    it('fails closed on a contributor Thoth was never asked about', () => {
      const reduced = reduce([product({ descriptive: withContributors(person()) })]);
      const groupKey = onlyGroupKey(reduced);

      const built = buildOnixDescriptiveWork(reduced.plan, groupKey, {
        choices: {},
        thothProfileActive: false,
        lookups: { ...lookupsFor(reduced, groupKey), contributors: {} },
      });

      expect(pendingCodes(built)).toEqual(['CONTRIBUTOR_LOOKUP_UNAVAILABLE']);
      expect(built.findings.find(({ code }) => code === 'CONTRIBUTOR_LOOKUP_UNAVAILABLE')).toMatchObject({
        classification: 'PREFLIGHT_GAP',
      });
    });
  });

  describe('contributor inputs', () => {
    it('creates a contributor with the name and surname the publisher enters, and waits while either is missing', () => {
      const reduced = reduce([
        product({ descriptive: withContributors(contributorXml({ inverted: 'Lovelace, Ada' })) }),
      ]);
      const [surname, name] = findingsOf(reduced.plan, 'CONTRIBUTOR_NAME_REQUIRED');

      expect(pendingCodes(build(reduced))).toEqual(['CONTRIBUTOR_NAME_REQUIRED', 'CONTRIBUTOR_NAME_REQUIRED']);
      expect(build(reduced).contributions).toEqual([]);
      expect(build(reduced, { choices: { [surname.key]: 'Lovelace' } }).pendingFindingKeys).toEqual([name.key]);
      expect(
        build(reduced, { choices: { [surname.key]: '   ', [name.key]: 'Ada Lovelace' } }).pendingFindingKeys,
      ).toEqual([surname.key]);

      const built = build(reduced, { choices: { [surname.key]: ' Lovelace ', [name.key]: 'Ada Lovelace' } });

      expect(built.pendingFindingKeys).toEqual([]);
      expect(
        built.contributions.map(({ fullName, lastName, orderNumber }) => [fullName, lastName, orderNumber]),
      ).toEqual([['Ada Lovelace', 'Lovelace', 1]]);
    });

    it('numbers contributions in the order the publisher chooses when the source numbering is ambiguous', () => {
      const reduced = reduce([
        product({
          descriptive: withContributors(
            person({ sequence: '2', roles: ['B10'] }),
            contributorXml({ personName: 'Charles Babbage', keyNames: 'Babbage', sequence: '2' }),
            contributorXml({ personName: 'Mary Somerville', keyNames: 'Somerville', sequence: '1' }),
          ),
        }),
      ]);
      const [ambiguous] = findingsOf(reduced.plan, 'CONTRIBUTOR_ORDER_AMBIGUOUS');
      const named = (built: ReturnType<typeof build>) =>
        built.contributions.map(({ orderNumber, type, fullName }) => [orderNumber, type, fullName]);

      expect(pendingCodes(build(reduced))).toEqual(['CONTRIBUTOR_ORDER_AMBIGUOUS']);
      expect(named(build(reduced, { choices: { [ambiguous.key]: 'FILE_ORDER' } }))).toEqual([
        [1, 'EDITOR', 'Ada Lovelace'],
        [2, 'TRANSLATOR', 'Ada Lovelace'],
        [3, 'AUTHOR', 'Charles Babbage'],
        [4, 'AUTHOR', 'Mary Somerville'],
      ]);

      const sequenced = build(reduced, { choices: { [ambiguous.key]: 'SEQUENCE_ORDER' } });

      expect(named(sequenced)).toEqual([
        [1, 'AUTHOR', 'Mary Somerville'],
        [2, 'EDITOR', 'Ada Lovelace'],
        [3, 'TRANSLATOR', 'Ada Lovelace'],
        [4, 'AUTHOR', 'Charles Babbage'],
      ]);
      expect(sequenced.contributorIntents.map(({ ordinals }) => ordinals)).toEqual([[1], [2, 3], [4]]);
      expect(sequenced.pendingFindingKeys).toEqual([]);
    });
  });

  describe('fundings', () => {
    const funded = () =>
      reduce([
        product({
          publishing: `<PublishingStatus>02</PublishingStatus>${funderXml({ role: '16', ror: LOOKUP_ROR, fundings: [fundingXml(['01', 'G-1', 'grantnumber'])] })}`,
        }),
      ]);
    const funderKey = (reduced: Reduced) =>
      descriptiveLookupRequests(reduced.plan, onlyGroupKey(reduced)).funders[0].key;

    it('funds the Work through the Institution the funder identity names, with the fundings its profile reads', () => {
      const reduced = funded();
      const lookups = {
        funders: {
          [funderKey(reduced)]: {
            kind: 'FOUND',
            institutionId: 'institution-1',
            name: 'Example Foundation',
            ror: LOOKUP_ROR,
          } as const,
        },
      };
      const fundingsOf = (built: ReturnType<typeof build>) =>
        built.fundings.map(({ institutionId, institutionName, institutionRor, grantNumber }) => [
          institutionId,
          institutionName,
          institutionRor,
          grantNumber,
        ]);

      expect(fundingsOf(build(reduced, { lookups }))).toEqual([
        ['institution-1', 'Example Foundation', LOOKUP_ROR, ''],
      ]);
      expect(fundingsOf(build(reduced, { lookups, thothProfileActive: true }))).toEqual([
        ['institution-1', 'Example Foundation', LOOKUP_ROR, 'G-1'],
      ]);
      expect(build(reduced, { lookups }).pendingFindingKeys).toEqual([]);
    });

    it('asks which institution a funder no exact identity resolves is, among name suggestions, and blocks one naming two', () => {
      const reduced = funded();
      const suggested = {
        institutionCandidates: {
          'Example Foundation': [
            candidate('institution-other', 'Example Foundation', 'https://ror.org/0abcdef12'),
            candidate('institution-doi', 'Example Foundation', '', 'https://doi.org/10.13039/999'),
            candidate('institution-plain', 'Example Foundation Trust'),
          ],
        },
      };
      const missing = build(reduced, { lookups: suggested });
      const [unresolved] = missing.findings.filter(({ code }) => code === 'FUNDING_FUNDER_UNRESOLVED');

      // A suggestion whose own ROR differs from the declared one cannot be the funder; one without a ROR can.
      expect(unresolved).toMatchObject({
        blocking: true,
        classification: 'TARGET_INPUT_REQUIRED',
        resolution: {
          kind: 'CHOICE',
          options: [
            { key: 'institution-doi', label: 'Example Foundation' },
            { key: 'institution-plain', label: 'Example Foundation Trust' },
            { key: 'OMIT', label: 'Example Foundation' },
          ],
        },
      });
      expect(missing).toMatchObject({ fundings: [], pendingFindingKeys: [unresolved.key] });
      expect(
        build(reduced, { lookups: suggested, choices: { [unresolved.key]: 'institution-plain' } }).fundings.map(
          ({ institutionId, institutionName }) => [institutionId, institutionName],
        ),
      ).toEqual([['institution-plain', 'Example Foundation Trust']]);
      expect(build(reduced, { lookups: suggested, choices: { [unresolved.key]: 'OMIT' } })).toMatchObject({
        fundings: [],
        pendingFindingKeys: [],
      });

      const conflicted = build(reduced, {
        lookups: { ...suggested, funders: { [funderKey(reduced)]: { kind: 'CONFLICT', institutionIds: ['a', 'b'] } } },
      });

      expect(pendingCodes(conflicted)).toEqual(['FUNDING_FUNDER_CONFLICT']);
      expect(conflicted.fundings).toEqual([]);
    });

    it('funds the Work only through the institution the publisher chooses for a funder the file does not identify', () => {
      const reduced = reduce([
        product({
          publishing: `<PublishingStatus>02</PublishingStatus>${funderXml({ role: '14', name: 'Arcadia Fund' })}`,
        }),
      ]);
      const lookups = {
        institutionCandidates: {
          'Arcadia Fund': [candidate('institution-arcadia', 'Arcadia Fund', 'https://ror.org/05t4ynm84')],
        },
      };
      const unanswered = build(reduced, { lookups });
      const [decision] = unanswered.findings.filter(({ code }) => code === 'FUNDING_FUNDER_UNIDENTIFIED');

      // Never automatic, however exactly the name matches.
      expect(decision).toMatchObject({
        blocking: true,
        classification: 'TARGET_INPUT_REQUIRED',
        detail: { funder: 'Arcadia Fund', suggestions: 1 },
        resolution: {
          kind: 'CHOICE',
          options: [
            { key: 'institution-arcadia', label: 'Arcadia Fund · https://ror.org/05t4ynm84' },
            { key: 'OMIT', label: 'Arcadia Fund' },
          ],
        },
      });
      expect(unanswered).toMatchObject({ fundings: [], pendingFindingKeys: [decision.key] });

      const chosen = build(reduced, { lookups, choices: { [decision.key]: 'institution-arcadia' } });

      expect(
        chosen.fundings.map(({ institutionId, institutionName, institutionRor }) => [
          institutionId,
          institutionName,
          institutionRor,
        ]),
      ).toEqual([['institution-arcadia', 'Arcadia Fund', 'https://ror.org/05t4ynm84']]);
      expect(chosen.pendingFindingKeys).toEqual([]);
      expect(build(reduced, { lookups }).pendingFindingKeys).toEqual([decision.key]);
    });
  });

  describe('chapters', () => {
    const chapterItem = (textItemType: string, inner: string) =>
      `<ContentItem><LevelSequenceNumber>1</LevelSequenceNumber><TextItem><TextItemType>${textItemType}</TextItemType></TextItem>${inner}</ContentItem>`;
    const chapterTitle = (text: string, language = 'eng') =>
      `<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>04</TitleElementLevel><TitleText language="${language}">${text}</TitleText></TitleElement></TitleDetail>`;

    it('builds each chapter from its own ContentItem reductions', () => {
      const reduced = reduce([
        product({
          content: chapterItem(
            '03',
            `${chapterTitle('On Engines')}${person({ roles: ['A01'] })}${languageXml('01', 'fre')}${subjectXml({ scheme: '93', code: 'UY', main: true })}`,
          ),
        }),
      ]);

      const [chapter] = build(reduced).chapters;

      expect(chapter.workId).toBe('chapter-1');
      expect(chapter.titles.map(({ title, localeCode, canonical }) => [title, localeCode, canonical])).toEqual([
        ['On Engines', 'EN', true],
      ]);
      expect(chapter.languages.map(({ code, relation }) => [code, relation])).toEqual([['FRE', 'ORIGINAL']]);
      expect(chapter.subjects.map(({ type, code, ordinal }) => [type, code, ordinal])).toEqual([['THEMA', 'UY', 1]]);
      expect(chapter.contributions.map(({ type, orderNumber, fullName }) => [type, orderNumber, fullName])).toEqual([
        ['AUTHOR', 1, 'Ada Lovelace'],
      ]);
    });

    it('never reduces a ContentItem #182 does not plan as a chapter', () => {
      const reduced = reduce([product({ content: chapterItem('01', `${chapterTitle('An Embedded Work', 'xxx')}`) })]);
      const productKey = reduced.sourcePlan.products[0].productKey;

      expect(reduced.plan.products[productKey].contentItems).toEqual({});
      expect(reduced.plan.findings.filter(({ family }) => family === 'TITLE')).toEqual([]);
    });

    it('asks only the representative manifestation to answer for the chapters it supplies', () => {
      const content = chapterItem('03', chapterTitle('On Engines', 'zzz'));
      const reduced = reduce([
        product({ ref: 'm1', related: manifestationOf(), content }),
        product({ ref: 'm2', isbn: ISBN_B, related: manifestationOf(), content }),
      ]);
      const [representative, other] = reduced.sourcePlan.products.map(({ productKey }) => productKey);
      const built = build(reduced);
      const pending = built.pendingFindingKeys.map((key) =>
        reduced.plan.findings.find((finding) => finding.key === key),
      );

      expect(pending.map((finding) => [finding?.code, finding?.productKey])).toEqual([
        ['TITLE_LOCALE_UNRESOLVED', representative],
      ]);
      expect(built.findings.some(({ productKey }) => productKey === other)).toBe(false);
    });
  });
});

describe('planOnixDescriptiveSeries: Series targets across the import', () => {
  const ISSN = '2515-7310';
  const seriesMember = (spec: CollectionSpec = {}) => titleXml() + collectionXml(spec);
  const membershipsOf = (reduced: Reduced, groupKey: string) =>
    resolveOnixDescriptiveWork(reduced.plan, groupKey, { choices: {}, thothProfileActive: false }).values.series;
  const planSeries = (
    reduced: Reduced,
    options: { serieses?: SeriesEntity[]; choices?: Record<string, string> } = {},
  ) =>
    planOnixDescriptiveSeries(
      reduced.sourcePlan.groups.map(({ groupKey }, index) => ({
        groupKey,
        workId: `work-${index + 1}`,
        imprintId: IMPRINT_ID,
        thothProfileActive: false,
        memberships: membershipsOf(reduced, groupKey),
      })),
      { serieses: options.serieses ?? [], choices: options.choices ?? {} },
    );

  it('attaches a Work to the existing Series its ISSN names, with its ordinal and issue number', () => {
    const reduced = reduce([
      product({ descriptive: seriesMember({ identifiers: [['02', ISSN]], title: 'Another Name', partNumber: '7' }) }),
    ]);

    const planned = planSeries(reduced, { serieses: [seriesEntity({ issnDigital: ISSN })] });

    expect(planned.findings).toEqual([]);
    expect(planned.series).toEqual([
      {
        name: 'Another Name',
        target: { kind: 'existing', seriesId: 'series-1' },
        members: [{ workId: 'work-1', orderNumber: 3, issueNumber: 7 }],
      },
    ]);
  });

  it('proposes a Series Thoth does not hold only once its type and its ISSNs are assigned', () => {
    const reduced = reduce([product({ descriptive: seriesMember({ identifiers: [['02', ISSN]] }) })]);
    const pending = planSeries(reduced);
    const [type] = pending.findings.filter(({ code }) => code === 'SERIES_TYPE_REQUIRED');
    const [issn] = pending.findings.filter(({ code }) => code === 'SERIES_ISSN_ASSIGNMENT_REQUIRED');

    expect(type.resolution).toEqual({
      kind: 'CHOICE',
      options: [
        { key: 'BOOK_SERIES', label: 'Studies in Cities' },
        { key: 'JOURNAL', label: 'Studies in Cities' },
      ],
    });
    expect(issn.resolution).toEqual({
      kind: 'CHOICE',
      options: [
        { key: 'PRINT', label: ISSN },
        { key: 'DIGITAL', label: ISSN },
        { key: 'OMIT', label: ISSN },
      ],
    });
    expect(pending.pendingFindingKeys).toEqual([type.key, issn.key]);
    expect(pending.series).toEqual([]);

    const answered = planSeries(reduced, { choices: { [type.key]: 'JOURNAL', [issn.key]: 'DIGITAL' } });

    expect(answered.pendingFindingKeys).toEqual([]);
    expect(answered.series).toEqual([
      {
        name: 'Studies in Cities',
        target: {
          kind: 'proposed',
          series: {
            name: 'Studies in Cities',
            imprintId: IMPRINT_ID,
            type: 'JOURNAL',
            issnPrint: '',
            issnDigital: ISSN,
          },
        },
        members: [{ workId: 'work-1', orderNumber: 3, issueNumber: null }],
      },
    ]);
  });

  it('never picks between existing Series a name matches, and never reuses an ordinal Thoth already holds', () => {
    const reduced = reduce([product({ descriptive: seriesMember() })]);

    const ambiguous = planSeries(reduced, { serieses: [seriesEntity(), seriesEntity({ id: 'series-2' })] });

    expect(pendingCodesOf(ambiguous)).toEqual(['SERIES_MATCH_AMBIGUOUS']);

    const taken = planSeries(reduced, {
      serieses: [
        seriesEntity({
          issues: [{ id: 'issue-1', ordinal: 3, workId: 'other', title: 'Other', seriesId: 'series-1', coverUrl: '' }],
        }),
      ],
    });

    expect(pendingCodesOf(taken)).toEqual(['SERIES_ORDINAL_COLLISION']);
    expect(taken.series).toEqual([]);
  });

  it('plans one proposed Series for every Work of the import that names it, and blocks two Works at one ordinal', () => {
    const shared = reduce([
      product({ ref: 'w1', descriptive: seriesMember({ sequences: [['03', '1']] }) }),
      product({ ref: 'w2', isbn: ISBN_B, descriptive: seriesMember({ sequences: [['03', '2']] }) }),
    ]);
    const [type] = planSeries(shared).findings.filter(({ code }) => code === 'SERIES_TYPE_REQUIRED');
    const planned = planSeries(shared, { choices: { [type.key]: 'BOOK_SERIES' } });

    expect(planned.pendingFindingKeys).toEqual([]);
    expect(
      planned.series.map(({ members }) => members.map(({ workId, orderNumber }) => [workId, orderNumber])),
    ).toEqual([
      [
        ['work-1', 1],
        ['work-2', 2],
      ],
    ]);

    const colliding = reduce([
      product({ ref: 'w1', descriptive: seriesMember() }),
      product({ ref: 'w2', isbn: ISBN_B, descriptive: seriesMember() }),
    ]);

    expect(pendingCodesOf(planSeries(colliding, { serieses: [seriesEntity()] }))).toEqual(['SERIES_ORDINAL_COLLISION']);
  });
});

const pendingCodesOf = ({
  findings,
  pendingFindingKeys,
}: {
  findings: readonly OnixDescriptiveFinding[];
  pendingFindingKeys: readonly string[];
}) => pendingFindingKeys.map((key) => findings.find((finding) => finding.key === key)?.code);

/**
 * Correction Authorization 1 (5696864602), finding 4: a finding whose approved semantics have the publisher supply a
 * target decision offers an answer in the plan. Read from the reducers themselves, so a finding added later without
 * an answer fails here too; the few left without one are named with the approved rule that makes them so.
 */
describe('publisher-answerable TARGET_INPUT_REQUIRED findings (thoth-app#183 Correction Authorization 1)', () => {
  const NOT_ANSWERABLE_HERE: Readonly<Record<string, string>> = {
    LIFECYCLE_REPLACEMENT_UNRESOLVED:
      'Superseded or Withdrawn depends on the replacement relation thoth-app#185 resolves (5543477343 rules 38-40)',
    LIFECYCLE_DATE_ORDER_INVALID:
      "the file's own dates contradict Thoth's order invariant (5543477343 rule 54); a date the publisher gave is changed through its own question",
    CONTRIBUTOR_ORCID_INVALID:
      'a malformed declared ORCID is a deterministic error, never a no-ORCID fallback (5562159621 rule 79)',
    CONTRIBUTOR_AFFILIATION_ROR_INVALID:
      'a malformed declared ROR is a deterministic error, never a name-search fallback (5562159621 rule 112)',
    SERIES_TITLE_MISSING:
      'no approved Series rule has the publisher name or pick the collection a Series is identified by (5541009506 F rules 7, 9)',
  };

  /** Every finding object the reducers build as TARGET_INPUT_REQUIRED, with how it says it is answered. */
  const inputFindings = () => {
    const file = ts.createSourceFile(
      'onixDescriptive.ts',
      readFileSync(join(__dirname, 'onixDescriptive.ts'), 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const found: { code: string; resolution: string }[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isObjectLiteralExpression(node)) {
        const property = (name: string) =>
          node.properties.find(
            (candidate): candidate is ts.PropertyAssignment =>
              ts.isPropertyAssignment(candidate) && candidate.name.getText(file) === name,
          );
        const classification = property('classification')?.initializer;

        if (
          classification !== undefined &&
          ts.isStringLiteral(classification) &&
          classification.text === 'TARGET_INPUT_REQUIRED'
        ) {
          const code = property('code')?.initializer;

          found.push({
            code: code !== undefined && ts.isStringLiteral(code) ? code.text : (code?.getText(file) ?? ''),
            resolution: property('resolution')?.initializer.getText(file) ?? 'NO_RESOLUTION',
          });
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(file);

    return found;
  };

  it('offers an answer for every one, save those whose approved semantics give the publisher none here', () => {
    const findings = inputFindings();
    // A resolution that can be none on any branch counts as none.
    const unanswerable = [
      ...new Set(
        findings
          .filter(({ resolution }) => resolution.includes('NO_RESOLUTION') || resolution.includes("'NONE'"))
          .map(({ code }) => code),
      ),
    ];

    expect(findings.length).toBeGreaterThan(30);
    expect(unanswerable.sort()).toEqual(Object.keys(NOT_ANSWERABLE_HERE).sort());
  });

  const titled = (descriptive: string, publishing = '<PublishingStatus>02</PublishingStatus>') =>
    reduce([product({ descriptive, publishing })]);

  it.each([
    [
      'TITLE_LANGUAGE_CONFLICT',
      () =>
        titled(
          titleDetailXml('01', [
            { text: 'Cities', language: 'eng', subtitle: 'Une histoire', subtitleLanguage: 'fre' },
          ]),
        ),
      'FR',
    ],
    ['TITLE_LOCALE_UNRESOLVED', () => titled(titleDetailXml('01', [{ text: 'Cities' }])), 'EN'],
    [
      'TITLE_CANONICAL_MISSING',
      () =>
        titled(titleDetailXml('01', [{ level: '02', text: 'A Series', language: 'eng' }]) + languageXml('01', 'eng')),
      'Cities',
    ],
    ['LIFECYCLE_DATE_REQUIRED', () => titled(titleXml(), '<PublishingStatus>04</PublishingStatus>'), '2024-03-15'],
    [
      'CONTRIBUTOR_NAME_REQUIRED',
      () => titled(withContributors(contributorXml({ personName: 'Ada Lovelace' }))),
      'Lovelace',
    ],
    [
      'CONTRIBUTOR_ORDER_AMBIGUOUS',
      () =>
        titled(
          withContributors(
            person({ sequence: '1' }),
            contributorXml({ personName: 'Charles Babbage', keyNames: 'Babbage', sequence: '1' }),
          ),
        ),
      'FILE_ORDER',
    ],
  ] as const)('%s: unanswered it blocks, answered it plans, cleared it blocks again', (code, reduced, answer) => {
    const plan = reduced();
    const [finding] = findingsOf(plan.plan, code);

    expect(['CHOICE', 'INPUT']).toContain(finding.resolution.kind);
    expect(resolveOnly(plan).pendingFindingKeys).toContain(finding.key);
    expect(resolveOnly(plan, { [finding.key]: answer }).pendingFindingKeys).toEqual([]);
    expect(resolveOnly(plan, {}).pendingFindingKeys).toContain(finding.key);
  });
});
