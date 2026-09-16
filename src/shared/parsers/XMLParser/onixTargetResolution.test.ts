import { parse } from '@5stones/onix';
import { describe, expect, it, vi } from 'vitest';

import type { WorkEntity } from '@/src/entities/work/model/work.types';

import { PublicationType } from '../../constants/publications';
import { WorkTypes } from '../../constants/work';
import type { ImportIdentifier, ImportPlan } from '../../types';
import type { OnixAdaptedGroup, OnixDescriptiveLookups, OnixPlanInputs } from '../../types/onixPlanning';
import { importIdentifierKey } from '../../utils/importPreflight/identifiers';
import { getDefaultPublication } from '../../utils/publications';
import { getDefaultTitle, getDefaultWork } from '../../utils/work';
import type { ExtendedONIXMessageRoot } from './interfaces';
import { reduceOnixDescriptive } from './onixDescriptive';
import { planOnixSource } from './onixPlanning';
import { reduceOnixRights } from './onixRights';
import {
  adaptableGroupKeys,
  EMPTY_ONIX_PLAN_INPUTS,
  type OnixTargetLookup,
  resolveOnixImportPlan,
  resolveOnixTargets,
} from './onixTargetResolution';

const REFERENCE_NS = 'http://ns.editeur.org/onix/3.0/reference';
const PUBLISHER_ID = 'publisher-1';
const IMPRINT_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_IMPRINT_ID = '22222222-2222-2222-2222-222222222222';
const IMPRINTS = [{ label: 'Example Imprint', value: IMPRINT_ID }];

const ISBN_A = '9781800000018';
const ISBN_B = '9781800000025';
const ISBN_C = '9781800000032';
const ISBN_D = '9781800000049';
const WORK_DOI = 'https://doi.org/10.1234/work';

const { EditedBook, Monograph, Textbook, BookChapter, BookSet, JournalIssue } = WorkTypes.enum;
const { Hardback, Html, Paperback, Pdf, Xml, Epub } = PublicationType.enum;

const headerXml = (sender = '<SenderName>Example Press</SenderName>') =>
  `<Header><Sender>${sender}</Sender><SentDateTime>20260913T1200</SentDateTime></Header>`;
const pid = (type: string, value: string, name?: string) =>
  `<ProductIdentifier><ProductIDType>${type}</ProductIDType>${name ? `<IDTypeName>${name}</IDTypeName>` : ''}<IDValue>${value}</IDValue></ProductIdentifier>`;
const workIdentifier = (type: string, value: string, name?: string) =>
  `<WorkIdentifier><WorkIDType>${type}</WorkIDType>${name ? `<IDTypeName>${name}</IDTypeName>` : ''}<IDValue>${value}</IDValue></WorkIdentifier>`;
const relatedWork = (...identifiers: string[]) =>
  `<RelatedWork><WorkRelationCode>01</WorkRelationCode>${identifiers.join('')}</RelatedWork>`;
const relatedProduct = (...identifiers: string[]) =>
  `<RelatedProduct><ProductRelationCode>06</ProductRelationCode>${identifiers.join('')}</RelatedProduct>`;
const form = (productForm: string, details: string[] = [], composition = '00', extra = '') =>
  `<DescriptiveDetail><ProductComposition>${composition}</ProductComposition><ProductForm>${productForm}</ProductForm>${details
    .map((detail) => `<ProductFormDetail>${detail}</ProductFormDetail>`)
    .join('')}${extra}</DescriptiveDetail>`;

type ProductSpec = {
  ref: string;
  notification?: string;
  identifiers?: string[];
  descriptive?: string;
  related?: string;
  envelope?: string;
  imprint?: string;
  publishing?: string;
  content?: string;
};

/**
 * The least a Work is described by: a title in a stated language and a publishing status. A record states it
 * unless it states its own, so identity, Work and manifestation decisions are never about description, which
 * the canonical descriptive reductions (thoth-app#183) decide and their own suite proves.
 */
const MINIMAL_TITLE =
  '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText language="eng">A Work</TitleText></TitleElement></TitleDetail>';
const MINIMAL_STATUS = '<PublishingStatus>02</PublishingStatus>';

const product = ({
  ref,
  notification = '03',
  identifiers = [],
  descriptive = form('BC'),
  related = '',
  envelope = '',
  imprint = 'Example Imprint',
  publishing = '',
  content = '',
}: ProductSpec) =>
  `<Product><RecordReference>${ref}</RecordReference><NotificationType>${notification}</NotificationType>${envelope}${identifiers.join('')}` +
  (descriptive.includes('<TitleDetail>')
    ? descriptive
    : descriptive.replace('</DescriptiveDetail>', `${MINIMAL_TITLE}</DescriptiveDetail>`)) +
  (content ? `<ContentDetail>${content}</ContentDetail>` : '') +
  `<PublishingDetail><Imprint><ImprintName>${imprint}</ImprintName></Imprint>${publishing}${publishing.includes('<PublishingStatus>') ? '' : MINIMAL_STATUS}</PublishingDetail>` +
  `${related ? `<RelatedMaterial>${related}</RelatedMaterial>` : ''}</Product>`;

const message = (products: string[], header = headerXml()) =>
  parse(
    `<ONIXMessage release="3.0" xmlns="${REFERENCE_NS}">${header}${products.join('')}</ONIXMessage>`,
  ) as ExtendedONIXMessageRoot;

type ExistingPublication = {
  id: string;
  type: (typeof PublicationType.enum)[keyof typeof PublicationType.enum];
  isbn?: string;
};

const existingWork = (
  id: string,
  { doi = '', type = Monograph, edition = 1, imprintId = IMPRINT_ID, publications = [] as ExistingPublication[] } = {},
): WorkEntity =>
  getDefaultWork({
    id,
    doi,
    type,
    edition,
    imprintId,
    // The minimal description every record states unless it states its own.
    titles: [getDefaultTitle({ canonical: true, title: 'A Work', fullTitle: 'A Work' })],
    publications: publications.map(({ id: publicationId, type: publicationType, isbn = '' }) =>
      getDefaultPublication({ id: publicationId, type: publicationType, isbn }),
    ),
  });

/** A lookup that answers exactly, the way the preflight service answers after its exact post-filter. */
const fakeLookup = (matches: Record<string, string[]> = {}, works: WorkEntity[] = []) => {
  const findWorks = vi.fn(
    async (identifiers: readonly ImportIdentifier[]) =>
      new Map(
        identifiers.map((identifier) => [
          importIdentifierKey(identifier),
          (matches[importIdentifierKey(identifier)] ?? []).map((workId) => ({
            workId,
            title: '',
            imprintId: IMPRINT_ID,
            doi: '',
            isbns: [],
          })),
        ]),
      ),
  );
  const getWork = vi.fn(async (workId: string) => {
    const work = works.find(({ id }) => id === workId);

    if (!work) throw new Error(`unexpected getWork(${workId})`);

    return work;
  });

  return { findWorks, getWork } satisfies OnixTargetLookup;
};

type Scenario = {
  header?: string;
  matches?: Record<string, string[]>;
  works?: WorkEntity[];
  inputs?: Partial<OnixPlanInputs>;
};

const resolve = async (products: string[], { header, matches, works, inputs }: Scenario = {}) => {
  const root = message(products, header);
  const sourcePlan = planOnixSource(root);
  const descriptive = reduceOnixDescriptive(root, sourcePlan);
  const rights = reduceOnixRights(root, sourcePlan);
  const lookup = fakeLookup(matches, works);
  const targets = await resolveOnixTargets(sourcePlan, lookup, PUBLISHER_ID);
  const result = resolveOnixImportPlan({
    sourcePlan,
    targets,
    inputs: { ...EMPTY_ONIX_PLAN_INPUTS, ...inputs },
    imprints: IMPRINTS,
    descriptive,
    rights,
    serieses: [],
  });

  return { sourcePlan, descriptive, rights, targets, lookup, result };
};

const codes = (result: Awaited<ReturnType<typeof resolve>>['result']) =>
  result.sidecar.blockers.map(({ code }) => code);
const productOf = (
  result: Awaited<ReturnType<typeof resolve>>['result'],
  ref: string,
  sourcePlan: Awaited<ReturnType<typeof resolve>>['sourcePlan'],
) => {
  const productKey = sourcePlan.records.find(({ recordReference }) => recordReference === ref)?.productKey;

  return result.sidecar.products.find((candidate) => candidate.productKey === productKey);
};

const doiKey = (doi: string) => `doi:${doi.toLowerCase()}`;
const isbnKey = (isbn: string) => `isbn:${isbn}`;

describe('resolveOnixTargets', () => {
  it('looks up only exact Work identity and target-stored Product identity, never a Product DOI, LCCN or OCLC', async () => {
    const { lookup, targets } = await resolve([
      product({
        ref: 'a',
        identifiers: [
          pid('15', ISBN_A),
          pid('06', '10.9999/product'),
          pid('13', '2019012345'),
          pid('23', '1086123456'),
        ],
        related:
          relatedWork(workIdentifier('06', '10.1234/work'), workIdentifier('15', ISBN_C)) +
          relatedProduct(pid('15', ISBN_B)),
      }),
    ]);

    expect(lookup.findWorks).toHaveBeenCalledOnce();
    expect(lookup.findWorks.mock.calls[0][0]).toEqual([
      { basis: 'doi', value: 'https://doi.org/10.1234/work' },
      { basis: 'isbn', value: ISBN_A },
      { basis: 'isbn', value: ISBN_B },
      { basis: 'isbn', value: ISBN_C },
    ]);
    expect(lookup.getWork).not.toHaveBeenCalled();
    expect(targets).toEqual({ publisherId: PUBLISHER_ID, identifiers: expect.any(Array), works: [] });
  });

  it('reads each matched Work exactly once, whatever number of identifiers matched it', async () => {
    const work = existingWork('w-1', {
      doi: WORK_DOI,
      publications: [{ id: 'p-1', type: Paperback, isbn: '978-1-80000-001-8' }],
    });
    const { lookup, targets } = await resolve(
      [
        product({
          ref: 'a',
          identifiers: [pid('15', ISBN_A)],
          related: relatedWork(workIdentifier('06', '10.1234/work')),
        }),
      ],
      { matches: { [doiKey(WORK_DOI)]: ['w-1'], [isbnKey(ISBN_A)]: ['w-1'] }, works: [work] },
    );

    expect(lookup.getWork).toHaveBeenCalledExactlyOnceWith('w-1');
    expect(targets.works).toEqual([
      {
        workId: 'w-1',
        type: Monograph,
        imprintId: IMPRINT_ID,
        edition: 1,
        doi: WORK_DOI,
        title: 'A Work',
        publications: [{ publicationId: 'p-1', type: Paperback, isbn: '978-1-80000-001-8' }],
        descriptive: {
          titles: [{ canonical: true, title: 'A Work', subtitle: '', fullTitle: 'A Work', localeCode: 'EN' }],
          languages: [],
          subjects: [],
          contributions: [],
          issues: [],
          status: 'FORTHCOMING',
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
        },
      },
    ]);
  });

  it('makes no request at all when nothing in the file can identify an existing target', async () => {
    const { lookup } = await resolve([product({ ref: 'a', identifiers: [pid('01', 'SKU', 'code')] })]);

    expect(lookup.findWorks).not.toHaveBeenCalled();
  });
});

describe('resolveOnixImportPlan', () => {
  describe('existing-target resolution', () => {
    const withWorkDoi = (ref: string, isbn: string, descriptive = form('BC')) =>
      product({
        ref,
        identifiers: [pid('15', isbn)],
        descriptive,
        related: relatedWork(workIdentifier('06', '10.1234/work')),
      });

    it('plans a new Work when no exact identity matches anything in Thoth', async () => {
      const { result } = await resolve([withWorkDoi('a', ISBN_A)]);

      expect(result.sidecar.workGroups[0]).toMatchObject({
        target: 'NEW_WORK',
        existingWorkId: null,
        evidence: [{ kind: 'NO_TARGET_MATCH' }],
      });
    });

    it('resolves an existing Work from a WorkIdentifier DOI with exactly one exact match', async () => {
      const { result, sourcePlan } = await resolve([withWorkDoi('a', ISBN_A)], {
        matches: { [doiKey(WORK_DOI)]: ['w-1'] },
        works: [existingWork('w-1', { doi: WORK_DOI })],
      });

      expect(result.sidecar.workGroups[0]).toMatchObject({
        target: 'EXISTING_WORK',
        existingWorkId: 'w-1',
        evidence: [{ kind: 'WORK_DOI', doi: WORK_DOI, workId: 'w-1' }],
        workType: { status: 'RESOLVED', type: Monograph, provenance: 'EXISTING_TARGET' },
      });
      expect(productOf(result, 'a', sourcePlan)).toMatchObject({
        action: 'CREATE_PUBLICATION_ON_EXISTING_WORK',
        executable: false,
      });
    });

    it('blocks a Work identity that matches more than one existing Work, instead of picking the best one', async () => {
      const { result } = await resolve([withWorkDoi('a', ISBN_A)], {
        matches: { [doiKey(WORK_DOI)]: ['w-1', 'w-2'] },
        works: [existingWork('w-1'), existingWork('w-2')],
      });

      expect(result.sidecar.workGroups[0].target).toBeNull();
      expect(codes(result)).toEqual(['EXISTING_TARGET_AMBIGUOUS']);
      expect(result.sidecar.executable).toBe(false);
    });

    it('never resolves a Work by a Product DOI, even when a Thoth Work carries the same DOI string', async () => {
      const { result, lookup } = await resolve(
        [product({ ref: 'a', identifiers: [pid('15', ISBN_A), pid('06', '10.1234/work')] })],
        {
          matches: { [doiKey(WORK_DOI)]: ['w-1'] },
          works: [existingWork('w-1', { doi: WORK_DOI })],
        },
      );

      expect(lookup.findWorks.mock.calls[0][0]).not.toContainEqual(expect.objectContaining({ basis: 'doi' }));
      expect(result.sidecar.workGroups[0].target).toBe('NEW_WORK');
    });

    it('resolves an existing Work through a WorkIdentifier ISBN-13 proxy', async () => {
      const { result } = await resolve(
        [product({ ref: 'a', identifiers: [pid('15', ISBN_A)], related: relatedWork(workIdentifier('15', ISBN_C)) })],
        {
          matches: { [isbnKey(ISBN_C)]: ['w-1'] },
          works: [existingWork('w-1', { publications: [{ id: 'p-9', type: Hardback, isbn: ISBN_C }] })],
        },
      );

      expect(result.sidecar.workGroups[0]).toMatchObject({
        target: 'EXISTING_WORK',
        evidence: [{ kind: 'WORK_ISBN_PROXY', isbn: ISBN_C, workId: 'w-1' }],
      });
    });

    it('lets an exact external alternative-format ISBN make the owning Work the group candidate', async () => {
      const { result, sourcePlan } = await resolve(
        [
          product({
            ref: 'pdf',
            identifiers: [pid('15', ISBN_A)],
            descriptive: form('EB', ['E107']),
            related: relatedProduct(pid('15', ISBN_C)),
          }),
        ],
        {
          matches: { [isbnKey(ISBN_C)]: ['w-1'] },
          works: [existingWork('w-1', { publications: [{ id: 'p-1', type: Paperback, isbn: ISBN_C }] })],
        },
      );

      expect(result.sidecar.workGroups[0]).toMatchObject({
        target: 'EXISTING_WORK',
        evidence: [{ kind: 'ALTERNATIVE_FORMAT_ISBN', isbn: ISBN_C, workId: 'w-1' }],
      });
      expect(productOf(result, 'pdf', sourcePlan)).toMatchObject({
        action: 'CREATE_PUBLICATION_ON_EXISTING_WORK',
        publicationType: Pdf,
      });
      expect(codes(result)).toEqual(['ATTACH_TO_EXISTING_WORK_DEFERRED']);
    });

    it('blocks two exact identity signals that resolve the same group to different existing Works', async () => {
      const { result } = await resolve(
        [
          withWorkDoi('a', ISBN_A).replace(
            '</RelatedMaterial>',
            `${relatedProduct(pid('15', ISBN_C))}</RelatedMaterial>`,
          ),
        ],
        {
          matches: { [doiKey(WORK_DOI)]: ['w-1'], [isbnKey(ISBN_C)]: ['w-2'] },
          works: [existingWork('w-1'), existingWork('w-2')],
        },
      );

      expect(codes(result)).toEqual(['CONFLICTING_EXISTING_WORKS']);
      expect(result.sidecar.workGroups[0].target).toBeNull();
    });

    it('makes a Product whose ISBN already belongs to the resolved Work ALREADY_PRESENT, a truthful no-op', async () => {
      const { result, sourcePlan } = await resolve([withWorkDoi('a', ISBN_A)], {
        matches: { [doiKey(WORK_DOI)]: ['w-1'], [isbnKey(ISBN_A)]: ['w-1'] },
        works: [
          existingWork('w-1', {
            doi: WORK_DOI,
            publications: [{ id: 'p-1', type: Paperback, isbn: '978-1-80000-001-8' }],
          }),
        ],
      });

      expect(productOf(result, 'a', sourcePlan)).toMatchObject({
        action: 'ALREADY_PRESENT',
        executable: true,
        evidence: [{ kind: 'ISBN_MATCH', isbn: ISBN_A, workId: 'w-1', publicationId: 'p-1' }],
      });
      expect(result.sidecar.blockers).toEqual([]);
      expect(result.sidecar.executable).toBe(true);
      expect(result.warnings).toContainEqual(expect.objectContaining({ code: 'onix.target.already_present' }));
    });

    it('blocks a Product whose ISBN belongs to a different Work than the one the group resolved to', async () => {
      const { result } = await resolve([withWorkDoi('a', ISBN_A)], {
        matches: { [doiKey(WORK_DOI)]: ['w-1'], [isbnKey(ISBN_A)]: ['w-2'] },
        works: [
          existingWork('w-1', { doi: WORK_DOI }),
          existingWork('w-2', { publications: [{ id: 'p-2', type: Paperback, isbn: ISBN_A }] }),
        ],
      });

      expect(codes(result)).toEqual(['WRONG_WORK_ISBN']);
    });

    it('blocks a new Work whose Product ISBN already exists in Thoth, rather than creating it again', async () => {
      const { result } = await resolve([product({ ref: 'a', identifiers: [pid('15', ISBN_A)] })], {
        matches: { [isbnKey(ISBN_A)]: ['w-2'] },
        works: [existingWork('w-2', { publications: [{ id: 'p-2', type: Paperback, isbn: ISBN_A }] })],
      });

      expect(result.sidecar.workGroups[0].target).toBe('NEW_WORK');
      expect(codes(result)).toEqual(['WRONG_WORK_ISBN', 'WORK_TYPE_INPUT_REQUIRED']);
    });

    it('surfaces the (work, publication type) collision when the resolved Work already has that type', async () => {
      const { result } = await resolve([withWorkDoi('a', ISBN_A)], {
        matches: { [doiKey(WORK_DOI)]: ['w-1'] },
        works: [existingWork('w-1', { doi: WORK_DOI, publications: [{ id: 'p-1', type: Paperback, isbn: ISBN_B }] })],
      });

      expect(codes(result)).toEqual(['EXISTING_TYPE_COLLISION']);
    });

    it('keeps attach-to-existing non-executable, and lets an explicit omission make the rest of the file importable', async () => {
      const scenario = {
        matches: { [doiKey(WORK_DOI)]: ['w-1'] },
        works: [existingWork('w-1', { doi: WORK_DOI, publications: [{ id: 'p-1', type: Paperback, isbn: ISBN_B }] })],
      };
      const files = [withWorkDoi('pdf', ISBN_A, form('EB', ['E107']))];
      const deferred = await resolve(files, scenario);
      const productKey = deferred.sourcePlan.products[0].productKey;
      const omitted = await resolve(files, { ...scenario, inputs: { manifestationChoices: { [productKey]: 'OMIT' } } });

      expect(deferred.result.sidecar.blockers).toEqual([
        expect.objectContaining({
          code: 'ATTACH_TO_EXISTING_WORK_DEFERRED',
          classification: 'EXECUTION_DEFERRED',
          productKey,
        }),
      ]);
      expect(deferred.result.plan).toBeNull();
      // A Publication this import cannot add to an existing Work may be left out; one it can create never is.
      expect(deferred.result.sidecar.products[0]).toMatchObject({ omittable: true });
      expect(omitted.result.sidecar.products[0]).toMatchObject({
        action: 'OMIT/EXCLUDED',
        evidence: [{ kind: 'MANIFESTATION_OMITTED', reason: 'PUBLISHER_CHOICE' }],
        omittable: true,
      });
      expect(omitted.result.sidecar.executable).toBe(true);
    });

    it('blocks attachment to an existing Work whose facts contradict the source, and only discloses them for a no-op', async () => {
      const edition2 = form('EB', ['E107'], '00', '<EditionNumber>2</EditionNumber>');
      const attach = await resolve([withWorkDoi('pdf', ISBN_A, edition2)], {
        matches: { [doiKey(WORK_DOI)]: ['w-1'] },
        works: [existingWork('w-1', { doi: WORK_DOI, edition: 1 })],
      });
      const noOp = await resolve([withWorkDoi('pdf', ISBN_A, edition2)], {
        matches: { [doiKey(WORK_DOI)]: ['w-1'], [isbnKey(ISBN_A)]: ['w-1'] },
        works: [
          existingWork('w-1', { doi: WORK_DOI, edition: 1, publications: [{ id: 'p-1', type: Pdf, isbn: ISBN_A }] }),
        ],
      });

      expect(codes(attach.result)).toEqual(['ATTACH_TO_EXISTING_WORK_DEFERRED', 'EXISTING_WORK_CONTRADICTION']);
      expect(attach.result.sidecar.blockers[1].detail).toEqual({ fields: ['edition'] });
      expect(codes(noOp.result)).toEqual([]);
      expect(noOp.result.warnings).toContainEqual(
        expect.objectContaining({ code: 'onix.target.existing_work_difference' }),
      );
    });

    it("never selects an existing Work outside the publisher's imprints for an attachment", async () => {
      const { result } = await resolve([withWorkDoi('a', ISBN_A)], {
        matches: { [doiKey(WORK_DOI)]: ['w-1'] },
        works: [existingWork('w-1', { doi: WORK_DOI, imprintId: OTHER_IMPRINT_ID })],
      });

      expect(codes(result)).toContain('EXISTING_WORK_UNAUTHORIZED');
    });
  });

  /**
   * Specification amendments 2 (`5665475597`) and 3 (`5667182357`): resolving an existing Work establishes
   * target identity only. A Work-level family this task does not reduce leaves the attachment unresolved
   * instead of being compared through a legacy projection.
   */
  describe('staged existing-Work compatibility', () => {
    const attaching = (descriptive = form('EB', ['E107']), publishing = '') =>
      product({
        ref: 'pdf',
        identifiers: [pid('15', ISBN_A)],
        descriptive,
        publishing,
        related: relatedWork(workIdentifier('06', '10.1234/work')),
      });

    const target = (works = [existingWork('w-1', { doi: WORK_DOI })]) => ({
      matches: { [doiKey(WORK_DOI)]: ['w-1'] },
      works,
    });

    const title =
      '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleText>A Work</TitleText></TitleElement></TitleDetail>';
    const contributor =
      '<Contributor><ContributorRole>A01</ContributorRole><PersonName>A N Other</PersonName></Contributor>';
    const language = '<Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language>';
    const subject =
      '<Subject><SubjectSchemeIdentifier>93</SubjectSchemeIdentifier><SubjectCode>JBSF1</SubjectCode></Subject>';
    const status = '<PublishingStatus>04</PublishingStatus>';
    const funder = '<Publisher><PublishingRole>16</PublishingRole><PublisherName>A Funder</PublisherName></Publisher>';
    const RECORD = '/ONIXMessage[1]/Product[1]';
    const DESC = `${RECORD}/DescriptiveDetail[1]`;
    const unverified = (result: Awaited<ReturnType<typeof resolve>>['result']) =>
      result.sidecar.blockers.filter(({ code }) => code === 'EXISTING_WORK_COMPATIBILITY_UNVERIFIED');

    it('compares each descriptive family with the exact existing Work, and clears only the compatible ones', async () => {
      const { result, sourcePlan } = await resolve(
        [
          attaching(
            form('EB', ['E107'], '00', `${MINIMAL_TITLE}${contributor}${language}${subject}`),
            `${status}${funder}`,
          ),
        ],
        target(),
      );
      const [nameRequired] = result.sidecar.descriptive.findings.filter(
        ({ code }) => code === 'CONTRIBUTOR_NAME_REQUIRED',
      );

      expect(result.sidecar.workGroups[0]).toMatchObject({
        target: 'EXISTING_WORK',
        existingWorkId: 'w-1',
        evidence: [{ kind: 'WORK_DOI', doi: WORK_DOI, workId: 'w-1' }],
        workType: { status: 'RESOLVED', type: Monograph, provenance: 'EXISTING_TARGET' },
      });
      expect(productOf(result, 'pdf', sourcePlan)).toMatchObject({
        action: null,
        publicationType: null,
        executable: false,
      });
      // The title agrees with the Work, so it no longer stands; the rest do. A funder the file does not identify is
      // a funding it asserts (#209 G), which cannot be told apart from the Work's own fundings: unverified, never
      // compatible.
      expect(
        result.sidecar.descriptive.compatibility.map(({ family, outcome, reasons }) => [family, outcome, reasons]),
      ).toEqual([
        ['TITLE', 'COMPATIBLE', []],
        ['CONTRIBUTORS', 'UNVERIFIED', ['CONTRIBUTOR_NAME_REQUIRED']],
        ['LANGUAGES', 'UNVERIFIED', ['LANGUAGE_NOT_ON_WORK']],
        ['SUBJECTS', 'UNVERIFIED', ['SUBJECT_NOT_ON_WORK']],
        ['LIFECYCLE', 'CONTRADICTED', ['STATUS_DIFFERS']],
        ['FUNDING', 'UNVERIFIED', ['FUNDER_NOT_COMPARABLE']],
      ]);
      expect(result.sidecar.blockers.map(({ code, detail }) => [code, detail.family])).toEqual([
        ['EXISTING_WORK_COMPATIBILITY_UNVERIFIED', 'CONTRIBUTORS'],
        ['EXISTING_WORK_COMPATIBILITY_UNVERIFIED', 'LANGUAGES'],
        ['EXISTING_WORK_COMPATIBILITY_UNVERIFIED', 'SUBJECTS'],
        ['EXISTING_WORK_DESCRIPTIVE_CONTRADICTION', 'LIFECYCLE'],
        ['EXISTING_WORK_COMPATIBILITY_UNVERIFIED', 'FUNDING'],
      ]);
      expect(result.sidecar.blockers[0]).toEqual({
        code: 'EXISTING_WORK_COMPATIBILITY_UNVERIFIED',
        classification: 'PREFLIGHT_GAP',
        recordKey: sourcePlan.records[0].recordKey,
        productKey: sourcePlan.products[0].productKey,
        groupKey: sourcePlan.groups[0].groupKey,
        paths: [`${DESC}/Contributor[1]`],
        detail: {
          workId: 'w-1',
          publicationType: Pdf,
          family: 'CONTRIBUTORS',
          owner: 'APP-IMPORT-ONIX-DESC-01',
          ownerIssue: '#183',
          reasons: ['CONTRIBUTOR_NAME_REQUIRED'],
          findingKeys: [nameRequired.key],
        },
      });
      expect(result.sidecar.blockers[3]).toMatchObject({
        classification: 'SOURCE_CONFLICT',
        paths: [`${RECORD}/PublishingDetail[1]/PublishingStatus[1]`],
        detail: { family: 'LIFECYCLE', reasons: ['STATUS_DIFFERS'] },
      });
      // A contradiction never becomes a disclosure merely so the Publication could attach.
      expect(result.warnings.map(({ code }) => code)).not.toContain('onix.descriptive.disclosure');
      expect(result.sidecar.executable).toBe(false);
      expect(result.plan).toBeNull();
    });

    it('never clears a family #184 or #185 owns, however compatible the descriptive families are', async () => {
      const { result, sourcePlan } = await resolve(
        [
          attaching(
            form(
              'EB',
              ['E107'],
              '00',
              `${MINIMAL_TITLE}<EpubLicense><EpubLicenseName>CC BY 4.0</EpubLicenseName></EpubLicense>`,
            ),
          ).replace(
            '<PublishingDetail>',
            '<CollateralDetail><TextContent><TextType>03</TextType><ContentAudience>00</ContentAudience><Text>An abstract</Text></TextContent></CollateralDetail><PublishingDetail>',
          ),
        ],
        target(),
      );

      expect(result.sidecar.descriptive.compatibility.map(({ family, outcome }) => [family, outcome])).toEqual([
        ['TITLE', 'COMPATIBLE'],
        ['LIFECYCLE', 'COMPATIBLE'],
      ]);
      expect(unverified(result).map(({ detail }) => [detail.family, detail.ownerIssue])).toEqual([
        ['LICENCE', '#184'],
        ['COLLATERAL', '#185'],
      ]);
      expect(productOf(result, 'pdf', sourcePlan)?.action).toBeNull();
    });

    it('represents several families in one fixed order, whatever order the record states them in', async () => {
      const stated = await resolve(
        [attaching(form('EB', ['E107'], '00', `${title}${contributor}${language}`))],
        target(),
      );
      const reversed = await resolve(
        [attaching(form('EB', ['E107'], '00', `${language}${contributor}${title}`))],
        target(),
      );

      expect(unverified(stated.result).map(({ detail }) => detail.family)).toEqual([
        'TITLE',
        'CONTRIBUTORS',
        'LANGUAGES',
      ]);
      expect(unverified(reversed.result)).toEqual(unverified(stated.result));
    });

    it("lets this task's own compatible facts pass while the Work's description stays unverified", async () => {
      const { sourcePlan } = await resolve([attaching()], target());
      const { result } = await resolve(
        [attaching(form('EB', ['E107'], '00', `${title}<EditionNumber>1</EditionNumber>`))],
        {
          ...target([existingWork('w-1', { doi: WORK_DOI, edition: 1, type: Monograph })]),
          inputs: { workTypeOverrides: { [sourcePlan.groups[0].groupKey]: Monograph } },
        },
      );

      expect(result.sidecar.workGroups[0]).toMatchObject({
        target: 'EXISTING_WORK',
        workType: { status: 'RESOLVED', type: Monograph, provenance: 'EXISTING_TARGET' },
        edition: { status: 'RESOLVED', edition: 1, basis: 'EXISTING_TARGET' },
      });
      expect(codes(result)).toEqual(['EXISTING_WORK_COMPATIBILITY_UNVERIFIED']);
    });

    it('compares the value itself: an equal extent attaches, a different one is a contradiction', async () => {
      const extent = (value: string) =>
        `<Extent><ExtentType>05</ExtentType><ExtentValue>${value}</ExtentValue><ExtentUnit>03</ExtentUnit></Extent>`;
      const existing = { ...existingWork('w-1', { doi: WORK_DOI }), pageCount: 300 };
      const equal = await resolve([attaching(form('EB', ['E107'], '00', extent('300')))], target([existing]));
      const different = await resolve([attaching(form('EB', ['E107'], '00', extent('100')))], target([existing]));

      expect(productOf(equal.result, 'pdf', equal.sourcePlan)?.action).toBe('CREATE_PUBLICATION_ON_EXISTING_WORK');
      expect(codes(equal.result)).toEqual(['ATTACH_TO_EXISTING_WORK_DEFERRED']);
      expect(codes(different.result)).toEqual(['EXISTING_WORK_DESCRIPTIVE_CONTRADICTION']);
      expect(different.result.sidecar.blockers[0].detail).toMatchObject({
        family: 'EXTENT',
        reasons: ['PAGE_COUNT_DIFFERS'],
      });
    });

    it.each([
      [
        'an extent Thoth does not hold',
        '<Extent><ExtentType>05</ExtentType><ExtentValue>300</ExtentValue><ExtentUnit>03</ExtentUnit></Extent>',
        'EXTENT',
        ['PAGE_COUNT_NOT_ON_WORK'],
      ],
      [
        'an image count Thoth does not hold',
        '<AncillaryContent><AncillaryContentType>09</AncillaryContentType><Number>12</Number></AncillaryContent>',
        'ANCILLARY_CONTENT',
        ['IMAGE_COUNT_NOT_ON_WORK'],
      ],
    ])(
      'keeps %s unverified: an unset target value is no evidence of agreement',
      async (_label, element, family, reasons) => {
        const { result } = await resolve([attaching(form('EB', ['E107'], '00', element))], target());

        expect(unverified(result).map(({ detail }) => [detail.family, detail.ownerIssue, detail.reasons])).toEqual([
          [family, '#183', reasons],
        ]);
      },
    );

    it('lets a generic illustrations note attach: it is a disclosed loss that contradicts nothing', async () => {
      const { result } = await resolve(
        [attaching(form('EB', ['E107'], '00', '<IllustrationsNote>12 halftones</IllustrationsNote>'))],
        target([{ ...existingWork('w-1', { doi: WORK_DOI }), bibliographyNote: 'A bibliography' }]),
      );

      expect(result.sidecar.descriptive.compatibility.map(({ family, outcome }) => [family, outcome])).toContainEqual([
        'ILLUSTRATIONS_NOTE',
        'COMPATIBLE',
      ]);
      expect(codes(result)).toEqual(['ATTACH_TO_EXISTING_WORK_DEFERRED']);
    });

    it.each([
      [
        'a licence',
        {
          descriptive:
            '<EpubLicense><EpubLicenseName>CC BY 4.0</EpubLicenseName><EpubLicenseExpression><EpubLicenseExpressionType>02</EpubLicenseExpressionType><EpubLicenseExpressionLink>https://creativecommons.org/licenses/by/4.0/</EpubLicenseExpressionLink></EpubLicenseExpression></EpubLicense>',
        },
        'LICENCE',
        'APP-IMPORT-ONIX-PUB-01',
        '#184',
      ],
      [
        'technical protection stated without a licence',
        { descriptive: '<EpubTechnicalProtection>00</EpubTechnicalProtection>' },
        'LICENCE',
        'APP-IMPORT-ONIX-PUB-01',
        '#184',
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
      ],
    ])(
      'names the task that owns %s',
      async (_label, spec: { descriptive?: string; collateral?: string }, family, owner, ownerIssue) => {
        const source = attaching(form('EB', ['E107'], '00', spec.descriptive ?? '')).replace(
          '<PublishingDetail>',
          `${spec.collateral ? `<CollateralDetail>${spec.collateral}</CollateralDetail>` : ''}<PublishingDetail>`,
        );
        const { result } = await resolve([source], target());

        expect(unverified(result).map(({ detail }) => [detail.family, detail.owner, detail.ownerIssue])).toEqual([
          [family, owner, ownerIssue],
        ]);
      },
    );

    it("never writes or clears an existing Work's licence: a supported licence it states stays unverified (#211)", async () => {
      const licensed = `${MINIMAL_TITLE}<EpubTechnicalProtection>00</EpubTechnicalProtection><EpubLicense><EpubLicenseName>CC BY 4.0</EpubLicenseName><EpubLicenseExpression><EpubLicenseExpressionType>02</EpubLicenseExpressionType><EpubLicenseExpressionLink>https://creativecommons.org/licenses/by/4.0/</EpubLicenseExpressionLink></EpubLicenseExpression></EpubLicense>`;
      const same = await resolve(
        [attaching(form('EB', ['E107'], '00', licensed))],
        target([
          { ...existingWork('w-1', { doi: WORK_DOI }), license: 'https://creativecommons.org/licenses/by/4.0/' },
        ]),
      );
      const unset = await resolve([attaching(form('EB', ['E107'], '00', licensed))], target());

      [same, unset].forEach(({ result, rights, sourcePlan }) => {
        // The rights reduction decides the licence it would give a new Work; nothing of it reaches an existing one.
        expect(rights.groups[sourcePlan.groups[0].groupKey].licence).toMatchObject({ kind: 'SET_SUPPORTED_LICENSE' });
        expect(unverified(result).map(({ detail }) => [detail.family, detail.ownerIssue])).toEqual([
          ['LICENCE', '#184'],
        ]);
        expect(codes(result).filter((code) => code.startsWith('RIGHTS_'))).toEqual([]);
        expect(result.plan).toBeNull();
      });
    });

    describe('rights blockers, whatever the target (#211)', () => {
      const PRICE_LICENCE =
        '<ProductSupply><SupplyDetail><Supplier><SupplierRole>01</SupplierRole><SupplierName>A Supplier</SupplierName></Supplier>' +
        '<ProductAvailability>20</ProductAvailability><Price><PriceType>02</PriceType>' +
        '<EpubLicense><EpubLicenseName>A price licence</EpubLicenseName><EpubLicenseExpression><EpubLicenseExpressionType>02</EpubLicenseExpressionType><EpubLicenseExpressionLink>https://creativecommons.org/licenses/by/4.0/</EpubLicenseExpressionLink></EpubLicenseExpression></EpubLicense>' +
        '<PriceAmount>10.00</PriceAmount><CurrencyCode>GBP</CurrencyCode></Price></SupplyDetail></ProductSupply>';
      const priced = (record: string) => record.replace('</Product>', `${PRICE_LICENCE}</Product>`);

      it.each([
        ['a new Work', {}, 'NEW_WORK', 'CREATE_PUBLICATION', false],
        [
          'a Publication it would attach to an existing Work',
          target(),
          'EXISTING_WORK',
          'CREATE_PUBLICATION_ON_EXISTING_WORK',
          false,
        ],
        [
          'a Publication an existing Work already holds',
          {
            matches: { [doiKey(WORK_DOI)]: ['w-1'], [isbnKey(ISBN_A)]: ['w-1'] },
            works: [existingWork('w-1', { doi: WORK_DOI, publications: [{ id: 'p-1', type: Pdf, isbn: ISBN_A }] })],
          },
          'EXISTING_WORK',
          'ALREADY_PRESENT',
          true,
        ],
        [
          'an existing Work Thoth cannot tell apart',
          {
            matches: { [doiKey(WORK_DOI)]: ['w-1', 'w-2'] },
            works: [existingWork('w-1', { doi: WORK_DOI }), existingWork('w-2', { doi: WORK_DOI })],
          },
          null,
          null,
          false,
        ],
      ])(
        "keeps the rights a price states an explicit rights blocker for %s, on no other blocker's account",
        async (_case, scenario: Scenario, workTarget, action, executableWithoutThem) => {
          const { result, rights, sourcePlan } = await resolve([priced(attaching())], scenario);
          const { result: unpriced } = await resolve([attaching()], scenario);
          const [deferred] = rights.findings;

          expect(result.sidecar.workGroups[0].target).toBe(workTarget);
          expect(rights.findings.map(({ code, blocking }) => [code, blocking])).toEqual([
            ['RIGHTS_SCOPE_DEFERRED', true],
          ]);
          // Exactly one blocker for the finding, beside whatever the same record raises without the price's rights -
          // which, for a Publication an existing Work already holds, is nothing at all.
          expect(unpriced.sidecar.executable).toBe(executableWithoutThem);
          expect(codes(result)).toEqual([...codes(unpriced), 'RIGHTS_PREFLIGHT_GAP']);
          expect(result.sidecar.blockers.filter(({ code }) => code.startsWith('RIGHTS_'))).toEqual([
            {
              code: 'RIGHTS_PREFLIGHT_GAP',
              classification: 'PREFLIGHT_GAP',
              recordKey: sourcePlan.records[0].recordKey,
              productKey: sourcePlan.products[0].productKey,
              groupKey: sourcePlan.groups[0].groupKey,
              paths: [`${RECORD}/ProductSupply[1]/SupplyDetail[1]/Price[1]/EpubLicense[1]`],
              detail: { findingKey: deferred.key, finding: 'RIGHTS_SCOPE_DEFERRED' },
            },
          ]);
          expect(result.sidecar.executable).toBe(false);
          // The blocker holds the plan and changes nothing else: each Product's action is what it was without it.
          expect(productOf(result, 'pdf', sourcePlan)?.action).toBe(action);
          expect(productOf(unpriced, 'pdf', sourcePlan)?.action).toBe(action);
        },
      );

      it('keeps a Product rights finding a rights blocker for an existing Work beside the licence family #184 owns, once each', async () => {
        const { result, rights, sourcePlan } = await resolve(
          [attaching(form('EB', ['E107'], '00', '<EpubTechnicalProtection>03</EpubTechnicalProtection>'))],
          target(),
        );
        const [finding] = rights.findings;

        expect(rights.findings.map(({ code }) => code)).toEqual(['RIGHTS_TECHNICAL_PROTECTION_UNREPRESENTABLE']);
        expect(result.sidecar.blockers.map(({ code, detail }) => [code, detail.family ?? detail.finding])).toEqual([
          ['EXISTING_WORK_COMPATIBILITY_UNVERIFIED', 'LICENCE'],
          ['RIGHTS_UNREPRESENTABLE', 'RIGHTS_TECHNICAL_PROTECTION_UNREPRESENTABLE'],
        ]);
        expect(result.sidecar.blockers[1]).toEqual({
          code: 'RIGHTS_UNREPRESENTABLE',
          classification: 'TARGET_UNREPRESENTABLE',
          recordKey: sourcePlan.records[0].recordKey,
          productKey: sourcePlan.products[0].productKey,
          groupKey: sourcePlan.groups[0].groupKey,
          paths: [`${DESC}/EpubTechnicalProtection[1]`],
          detail: { findingKey: finding.key, finding: 'RIGHTS_TECHNICAL_PROTECTION_UNREPRESENTABLE' },
        });
        // Nothing about the existing Work is written or chosen: its licence is not the rights reduction's to change.
        expect(productOf(result, 'pdf', sourcePlan)?.action).toBeNull();
      });

      it('fails an existing Work closed without a rights reduction wherever its record states rights, as it does a new one', async () => {
        const root = message([
          attaching(form('EB', ['E107'], '00', '<EpubTechnicalProtection>00</EpubTechnicalProtection>')),
        ]);
        const sourcePlan = planOnixSource(root);
        const scenario = target();
        const targets = await resolveOnixTargets(
          sourcePlan,
          fakeLookup(scenario.matches, scenario.works),
          PUBLISHER_ID,
        );
        const { sidecar } = resolveOnixImportPlan({
          sourcePlan,
          targets,
          inputs: EMPTY_ONIX_PLAN_INPUTS,
          imprints: IMPRINTS,
          descriptive: reduceOnixDescriptive(root, sourcePlan),
          serieses: [],
        });

        expect(sidecar.workGroups[0].target).toBe('EXISTING_WORK');
        expect(sidecar.blockers.map(({ code, detail }) => [code, detail.family ?? detail.reason])).toEqual([
          ['EXISTING_WORK_COMPATIBILITY_UNVERIFIED', 'LICENCE'],
          ['RIGHTS_PREFLIGHT_GAP', 'RIGHTS_NOT_REDUCED'],
        ]);
        expect(sidecar.blockers[1]).toMatchObject({
          groupKey: sourcePlan.groups[0].groupKey,
          paths: [`${DESC}/EpubTechnicalProtection[1]`],
        });
      });
    });

    it('never asks a new Work for compatibility: there is nothing existing for its record to agree with', async () => {
      const { result, sourcePlan } = await resolve(
        [attaching(form('EB', ['E107'], '00', `${title}${contributor}`), status)],
        { inputs: { fileWorkType: Monograph } },
      );

      expect(result.sidecar.workGroups[0].target).toBe('NEW_WORK');
      expect(productOf(result, 'pdf', sourcePlan)).toMatchObject({
        action: 'CREATE_PUBLICATION',
        publicationType: Pdf,
      });
      expect(unverified(result)).toEqual([]);
    });

    it('keeps an absent family absent: what the Work holds and the record does not state is no contradiction', async () => {
      const { result, sourcePlan } = await resolve(
        [attaching()],
        target([{ ...existingWork('w-1', { doi: WORK_DOI }), pageCount: 300, bibliographyNote: 'Existing note' }]),
      );

      expect(productOf(result, 'pdf', sourcePlan)).toMatchObject({
        action: 'CREATE_PUBLICATION_ON_EXISTING_WORK',
        publicationType: Pdf,
      });
      expect(codes(result)).toEqual(['ATTACH_TO_EXISTING_WORK_DEFERRED']);
    });

    it('leaves an already-present Product a resolved no-op, whatever its record asserts about the Work', async () => {
      const { result, sourcePlan } = await resolve(
        [attaching(form('EB', ['E107'], '00', `${title}${contributor}`), status)],
        {
          matches: { [doiKey(WORK_DOI)]: ['w-1'], [isbnKey(ISBN_A)]: ['w-1'] },
          works: [existingWork('w-1', { doi: WORK_DOI, publications: [{ id: 'p-1', type: Pdf, isbn: ISBN_A }] })],
        },
      );

      expect(productOf(result, 'pdf', sourcePlan)).toMatchObject({ action: 'ALREADY_PRESENT', executable: true });
      expect(result.sidecar.blockers).toEqual([]);
      expect(result.sidecar.executable).toBe(true);
    });

    it('leaves an omitted manifestation resolved, whatever its record asserts about the Work', async () => {
      const source = [attaching(form('EB', ['E107'], '00', `${title}${contributor}`), status)];
      const { sourcePlan } = await resolve(source, target());
      const { result } = await resolve(source, {
        ...target(),
        inputs: { manifestationChoices: { [sourcePlan.products[0].productKey]: 'OMIT' } },
      });

      expect(result.sidecar.products[0]).toMatchObject({
        action: 'OMIT/EXCLUDED',
        evidence: [{ kind: 'MANIFESTATION_OMITTED', reason: 'PUBLISHER_CHOICE' }],
      });
      expect(result.sidecar.blockers).toEqual([]);
      expect(result.sidecar.executable).toBe(true);
    });

    it("still blocks this task's own contradictions on a would-be attachment", async () => {
      const { result } = await resolve(
        [attaching(form('EB', ['E107'], '00', `${title}<EditionNumber>2</EditionNumber>`))],
        target([existingWork('w-1', { doi: WORK_DOI, edition: 1 })]),
      );

      expect(codes(result)).toEqual(['EXISTING_WORK_COMPATIBILITY_UNVERIFIED', 'EXISTING_WORK_CONTRADICTION']);
      expect(result.sidecar.blockers[1].detail).toEqual({ fields: ['edition'] });
    });

    it('still blocks a would-be attachment whose Work DOI contradicts the existing Work', async () => {
      const { result } = await resolve(
        [attaching(form('EB', ['E107'], '00', title))],
        target([existingWork('w-1', { doi: 'https://doi.org/10.1234/another' })]),
      );

      expect(codes(result)).toEqual(['EXISTING_WORK_COMPATIBILITY_UNVERIFIED', 'EXISTING_WORK_CONTRADICTION']);
      expect(result.sidecar.blockers[1].detail).toEqual({ fields: ['doi'] });
    });

    it("still blocks a WorkType override that contradicts the existing Work's own", async () => {
      const { sourcePlan } = await resolve([attaching()], target());
      const { result } = await resolve([attaching(form('EB', ['E107'], '00', title))], {
        ...target(),
        inputs: { workTypeOverrides: { [sourcePlan.groups[0].groupKey]: Textbook } },
      });

      expect(codes(result)).toEqual(['EXISTING_WORK_COMPATIBILITY_UNVERIFIED', 'WORK_TYPE_OVERRIDE_CONFLICT']);
    });

    it('still reports a publication type the existing Work already holds', async () => {
      const { result, sourcePlan } = await resolve(
        [attaching(form('EB', ['E107'], '00', title))],
        target([existingWork('w-1', { doi: WORK_DOI, publications: [{ id: 'p-1', type: Pdf, isbn: ISBN_B }] })]),
      );

      expect(codes(result)).toEqual(['EXISTING_TYPE_COLLISION', 'EXISTING_WORK_COMPATIBILITY_UNVERIFIED']);
      expect(productOf(result, 'pdf', sourcePlan)?.action).toBeNull();
    });

    it('still blocks a Product whose ISBN belongs to another Work, before any compatibility question', async () => {
      const { result } = await resolve([attaching(form('EB', ['E107'], '00', title))], {
        matches: { [doiKey(WORK_DOI)]: ['w-1'], [isbnKey(ISBN_A)]: ['w-2'] },
        works: [
          existingWork('w-1', { doi: WORK_DOI }),
          existingWork('w-2', { publications: [{ id: 'p-2', type: Pdf, isbn: ISBN_A }] }),
        ],
      });

      expect(codes(result)).toEqual(['WRONG_WORK_ISBN']);
    });

    it("still refuses an existing Work outside the publisher's imprints", async () => {
      const { result } = await resolve(
        [attaching(form('EB', ['E107'], '00', title))],
        target([existingWork('w-1', { doi: WORK_DOI, imprintId: OTHER_IMPRINT_ID })]),
      );

      // The unauthorised imprint also contradicts the source's own, and a would-be attachment still blocks on it.
      expect(codes(result)).toEqual([
        'EXISTING_WORK_COMPATIBILITY_UNVERIFIED',
        'EXISTING_WORK_UNAUTHORIZED',
        'EXISTING_WORK_CONTRADICTION',
      ]);
    });

    it('still blocks two would-be attachments that would become the same Publication type', async () => {
      const { result } = await resolve(
        [
          attaching(form('EB', ['E107'], '00', title)),
          attaching(form('EB', ['E107'], '00', title))
            .replace('>pdf<', '>pdf-2<')
            .replace(ISBN_A, ISBN_B),
        ],
        target(),
      );

      expect(codes(result)).toContain('SAME_TYPE_COLLISION');
    });
  });

  describe('WorkType', () => {
    const one = (ref = 'a', isbn = ISBN_A, descriptive = form('BC')) =>
      product({ ref, identifiers: [pid('15', isbn)], descriptive });

    it('stops a generic record at TARGET_INPUT_REQUIRED instead of defaulting it to any WorkType', async () => {
      const { result } = await resolve([one()]);

      expect(result.sidecar.workGroups[0].workType).toEqual({ status: 'UNRESOLVED' });
      expect(result.sidecar.blockers).toEqual([
        expect.objectContaining({ code: 'WORK_TYPE_INPUT_REQUIRED', classification: 'TARGET_INPUT_REQUIRED' }),
      ]);
      expect(result.sidecar.executable).toBe(false);
    });

    it.each([Monograph, EditedBook, Textbook, JournalIssue, BookSet])(
      'applies an explicit file-level %s to every unresolved new Work',
      async (type) => {
        const { result } = await resolve([one('a', ISBN_A), one('b', ISBN_B)], { inputs: { fileWorkType: type } });

        expect(result.sidecar.workGroups.map(({ workType }) => workType)).toEqual([
          { status: 'RESOLVED', type, provenance: 'USER_FILE_DEFAULT' },
          { status: 'RESOLVED', type, provenance: 'USER_FILE_DEFAULT' },
        ]);
        expect(result.sidecar.blockers).toEqual([]);
      },
    );

    it('lets a per-Work override beat the file-level choice for that Work only', async () => {
      const { result, sourcePlan } = await resolve([one('a', ISBN_A), one('b', ISBN_B)], {
        inputs: { fileWorkType: Monograph, workTypeOverrides: { [`work:product:gtin13:${ISBN_B}`]: Textbook } },
      });

      expect(sourcePlan.groups[1].groupKey).toBe(`work:product:gtin13:${ISBN_B}`);
      expect(result.sidecar.workGroups.map(({ workType }) => workType)).toEqual([
        { status: 'RESOLVED', type: Monograph, provenance: 'USER_FILE_DEFAULT' },
        { status: 'RESOLVED', type: Textbook, provenance: 'USER_WORK_OVERRIDE' },
      ]);
    });

    it('resolves one WorkType for every manifestation grouped into one Work', async () => {
      const shared = relatedWork(workIdentifier('01', 'W-1', 'id'));
      const { result } = await resolve(
        [
          product({ ref: 'pb', identifiers: [pid('15', ISBN_A)], related: shared }),
          product({ ref: 'pdf', identifiers: [pid('15', ISBN_B)], descriptive: form('EB', ['E107']), related: shared }),
        ],
        { inputs: { fileWorkType: EditedBook } },
      );

      expect(result.sidecar.workGroups).toHaveLength(1);
      expect(result.sidecar.workGroups[0].workType).toEqual({
        status: 'RESOLVED',
        type: EditedBook,
        provenance: 'USER_FILE_DEFAULT',
      });
    });

    it('holds a standalone BOOK_CHAPTER choice until an exact parent relation plan exists', async () => {
      const { result, sourcePlan } = await resolve([one()], {
        inputs: { workTypeOverrides: { [`work:product:gtin13:${ISBN_A}`]: BookChapter } },
      });

      expect(sourcePlan.groups[0].groupKey).toBe(`work:product:gtin13:${ISBN_A}`);
      expect(result.sidecar.blockers).toEqual([
        expect.objectContaining({ code: 'WORK_TYPE_PARENT_RELATION_REQUIRED' }),
      ]);
    });

    it("keeps an existing Work's own WorkType whatever the file default, and blocks an override that disagrees", async () => {
      const file = [
        product({
          ref: 'a',
          identifiers: [pid('15', ISBN_A)],
          related: relatedWork(workIdentifier('06', '10.1234/work')),
        }),
      ];
      const existing = {
        matches: { [doiKey(WORK_DOI)]: ['w-1'], [isbnKey(ISBN_A)]: ['w-1'] },
        works: [
          existingWork('w-1', {
            doi: WORK_DOI,
            type: EditedBook,
            publications: [{ id: 'p-1', type: Paperback, isbn: ISBN_A }],
          }),
        ],
      };
      const withDefault = await resolve(file, { ...existing, inputs: { fileWorkType: Monograph } });
      const withOverride = await resolve(file, {
        ...existing,
        inputs: { workTypeOverrides: { [withDefault.sourcePlan.groups[0].groupKey]: Monograph } },
      });

      expect(withDefault.result.sidecar.workGroups[0].workType).toEqual({
        status: 'RESOLVED',
        type: EditedBook,
        provenance: 'EXISTING_TARGET',
      });
      expect(withDefault.result.sidecar.blockers).toEqual([]);
      expect(codes(withOverride.result)).toEqual(['WORK_TYPE_OVERRIDE_CONFLICT']);
    });

    it('never reads educational, serial or package evidence as a WorkType', async () => {
      const { result } = await resolve([
        one('school', ISBN_A, form('BC', [], '00', '<TradeCategory>13</TradeCategory><EditionType>SCH</EditionType>')),
        product({
          ref: 'journal',
          identifiers: [pid('15', ISBN_B)],
          descriptive: `<DescriptiveDetail><ProductComposition>00</ProductComposition><ProductForm>BC</ProductForm><Collection><CollectionType>10</CollectionType><CollectionIdentifier><CollectionIDType>02</CollectionIDType><IDValue>12345679</IDValue></CollectionIdentifier></Collection></DescriptiveDetail>`,
        }),
        one('set', ISBN_C, form('SA', [], '10')),
      ]);

      expect(result.sidecar.workGroups.map(({ workType }) => workType)).toEqual([
        { status: 'UNRESOLVED' },
        { status: 'UNRESOLVED' },
        { status: 'UNRESOLVED' },
      ]);
    });
  });

  describe('edition, manifestation and record decisions', () => {
    it('resolves a later edition with no number from an explicit publisher integer, and nothing else', async () => {
      const file = [
        product({
          ref: 'a',
          identifiers: [pid('15', ISBN_A)],
          descriptive: form('BC', [], '00', '<EditionType>REV</EditionType>'),
        }),
      ];
      const groupKey = `work:product:gtin13:${ISBN_A}`;
      const invalid = await resolve(file, { inputs: { fileWorkType: Monograph, editionInputs: { [groupKey]: 0 } } });
      const supplied = await resolve(file, { inputs: { fileWorkType: Monograph, editionInputs: { [groupKey]: 3 } } });

      expect(codes(invalid.result)).toEqual(['EDITION_INPUT_REQUIRED']);
      expect(supplied.result.sidecar.workGroups[0].edition).toEqual({
        status: 'RESOLVED',
        edition: 3,
        basis: 'USER_INPUT',
      });
      expect(supplied.result.sidecar.blockers).toEqual([]);
    });

    it('creates the manifestation type the publisher chose among the candidates, and refuses one outside them', async () => {
      const file = [product({ ref: 'x', identifiers: [pid('15', ISBN_A)], descriptive: form('EB', ['E113']) })];
      const productKey = `product:gtin13:${ISBN_A}`;
      const chosen = await resolve(file, {
        inputs: { fileWorkType: Monograph, manifestationChoices: { [productKey]: Xml } },
      });
      const outside = await resolve(file, {
        inputs: { fileWorkType: Monograph, manifestationChoices: { [productKey]: Epub } },
      });

      expect(chosen.result.sidecar.products[0]).toMatchObject({
        action: 'CREATE_PUBLICATION',
        publicationType: Xml,
        executable: true,
        // Omission stays one of the approved answers to a format the file leaves open (5543749368 rules 32-33).
        omittable: true,
      });
      expect(chosen.result.sidecar.blockers).toEqual([]);
      expect(codes(outside.result)).toEqual(['MANIFESTATION_INPUT_REQUIRED']);
    });

    it('never takes an omission for a manifestation the file already resolves to a Publication, however it arrives', async () => {
      // The University of London Press shape (#209 D): one Work, four manifestations of four distinct supported types.
      const shared = relatedWork(workIdentifier('06', '10.14296/uolp-work'));
      const file = [
        product({ ref: 'hb', identifiers: [pid('15', ISBN_A)], descriptive: form('BB'), related: shared }),
        product({ ref: 'pb', identifiers: [pid('15', ISBN_B)], descriptive: form('BC'), related: shared }),
        product({ ref: 'epub', identifiers: [pid('15', ISBN_C)], descriptive: form('EA', ['E101']), related: shared }),
        product({ ref: 'pdf', identifiers: [pid('15', ISBN_D)], descriptive: form('EA', ['E107']), related: shared }),
      ];
      const plain = await resolve(file, { inputs: { fileWorkType: EditedBook } });
      // A stale or injected omission, such as the arbitrary control this task removed would have recorded.
      const injected = await resolve(file, {
        inputs: {
          fileWorkType: EditedBook,
          manifestationChoices: Object.fromEntries(
            plain.result.sidecar.products.map(({ productKey }) => [productKey, 'OMIT']),
          ),
        },
      });

      [injected, plain].forEach(({ result }) => {
        expect(
          result.sidecar.products.map(({ action, publicationType, omittable, evidence }) => [
            action,
            publicationType,
            omittable,
            evidence,
          ]),
        ).toEqual([
          ['CREATE_PUBLICATION', Hardback, false, [{ kind: 'NO_TARGET_MATCH' }]],
          ['CREATE_PUBLICATION', Paperback, false, [{ kind: 'NO_TARGET_MATCH' }]],
          ['CREATE_PUBLICATION', Epub, false, [{ kind: 'NO_TARGET_MATCH' }]],
          ['CREATE_PUBLICATION', Pdf, false, [{ kind: 'NO_TARGET_MATCH' }]],
        ]);
        expect(result.sidecar.blockers).toEqual([]);
        expect(result.warnings.map(({ code }) => code)).not.toContain('onix.manifestation.omitted');
      });
    });

    it('needs an explicit acknowledgement before a package manifestation is omitted', async () => {
      const file = [product({ ref: 'box', identifiers: [pid('15', ISBN_A)], descriptive: form('SA', [], '10') })];
      const productKey = `product:gtin13:${ISBN_A}`;
      const pending = await resolve(file, { inputs: { fileWorkType: BookSet } });
      const acknowledged = await resolve(file, {
        inputs: { fileWorkType: BookSet, manifestationChoices: { [productKey]: 'OMIT' } },
      });

      expect(codes(pending.result)).toEqual(['MANIFESTATION_ACKNOWLEDGEMENT_REQUIRED']);
      expect(pending.result.sidecar.products[0]).toMatchObject({ action: null, omittable: true });
      expect(acknowledged.result.sidecar.products[0]).toMatchObject({
        action: 'OMIT/EXCLUDED',
        evidence: [{ kind: 'MANIFESTATION_OMITTED', reason: 'ACKNOWLEDGED' }],
        omittable: true,
      });
      expect(acknowledged.result.sidecar.executable).toBe(true);
    });

    it('blocks two grouped Products that would become the same PublicationType until one is omitted', async () => {
      const shared = relatedWork(workIdentifier('01', 'W-1', 'id'));
      const file = [
        product({ ref: 'pdf', identifiers: [pid('15', ISBN_A)], descriptive: form('EB', ['E107']), related: shared }),
        product({ ref: 'pdfa', identifiers: [pid('15', ISBN_B)], descriptive: form('EB', ['E108']), related: shared }),
      ];
      const collided = await resolve(file, { inputs: { fileWorkType: Monograph } });
      const resolved = await resolve(file, {
        inputs: { fileWorkType: Monograph, manifestationChoices: { [`product:gtin13:${ISBN_B}`]: 'OMIT' } },
      });

      expect(collided.result.sidecar.blockers).toEqual([
        expect.objectContaining({
          code: 'SAME_TYPE_COLLISION',
          classification: 'TARGET_UNREPRESENTABLE',
          detail: { publicationType: Pdf, productKeys: [`product:gtin13:${ISBN_A}`, `product:gtin13:${ISBN_B}`] },
        }),
      ]);
      // A Publication Thoth cannot hold beside its twin is the unrepresentable loss an omission acknowledges.
      expect(collided.result.sidecar.products.map(({ omittable }) => omittable)).toEqual([true, true]);
      expect(resolved.result.sidecar.blockers).toEqual([]);
      expect(resolved.result.sidecar.products.map(({ action, omittable }) => [action, omittable])).toEqual([
        ['CREATE_PUBLICATION', true],
        ['OMIT/EXCLUDED', true],
      ]);
    });

    it('lets a non-complete record be excluded explicitly, which also releases the Product it made ambiguous', async () => {
      const file = [
        product({ ref: 'a', identifiers: [pid('15', ISBN_A)] }),
        product({
          ref: 'b',
          notification: '05',
          identifiers: [pid('15', ISBN_A)],
          envelope: '<DeletionText>Sent in error</DeletionText>',
        }),
      ];
      const pending = await resolve(file, { inputs: { fileWorkType: Monograph } });
      const excluded = await resolve(file, { inputs: { fileWorkType: Monograph, excludedRecordKeys: ['record:2'] } });

      expect(codes(pending.result)).toEqual(['RECORD_NOT_COMPLETE', 'RECORD_SEQUENCE_AMBIGUITY']);
      expect(excluded.result.sidecar.records[1]).toMatchObject({
        action: 'OMIT/EXCLUDED',
        disposition: 'DELETE',
        deletionText: ['Sent in error'],
      });
      expect(excluded.result.sidecar.blockers).toEqual([]);
      expect(excluded.result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'onix.record.omitted',
          source: { kind: 'onix', productIndex: 2, recordReference: 'b' },
        }),
      );
    });

    it('never lets an exclusion resolve a source conflict it was not offered for', async () => {
      const { result } = await resolve([product({ ref: 'a', notification: '99', identifiers: [pid('15', ISBN_A)] })], {
        inputs: { excludedRecordKeys: ['record:1'] },
      });

      expect(codes(result)).toEqual(['RECORD_NOTIFICATION_UNRECOGNISED']);
    });
  });

  describe('Thoth ONIX compatibility profile (target evidence)', () => {
    const WORK_UUID = '11111111-2222-4333-8444-555555555555';
    const PUB = (n: number) => `aaaaaaaa-0000-4000-8000-00000000000${n}`;
    const THOTH_HEADER = headerXml('<SenderName>Thoth</SenderName><EmailAddress>distribution@thoth.pub</EmailAddress>');
    const thothProduct = (n: number, isbn: string | null, detail: string) =>
      product({
        ref: `urn:uuid:${PUB(n)}`,
        envelope: '<RecordSourceType>01</RecordSourceType>',
        identifiers: [
          pid('01', `urn:uuid:${WORK_UUID}`, 'thoth-work-id'),
          pid('01', `urn:uuid:${PUB(n)}`, 'thoth-publication-id'),
          ...(isbn ? [pid('15', isbn), pid('03', isbn)] : []),
          pid('06', 'https://doi.org/10.11647/OBP.0001'),
          pid('13', '2019012345'),
          pid('23', '1086123456'),
          pid('01', 'OBP.0001', 'internal-reference'),
        ],
        descriptive: form('EB', [detail]),
      });
    const file = [thothProduct(1, ISBN_A, 'E107'), thothProduct(2, ISBN_B, 'E101'), thothProduct(3, null, 'E105')];
    const nativeWork = (publications: ExistingPublication[], imprintId = IMPRINT_ID) =>
      existingWork(WORK_UUID, { doi: 'https://doi.org/10.11647/OBP.0001', type: EditedBook, publications, imprintId });

    it('verifies native identity from live evidence and reuses the existing Work, its WorkType and its Publications', async () => {
      const { result } = await resolve(file, {
        header: THOTH_HEADER,
        matches: {
          [isbnKey(ISBN_A)]: [WORK_UUID],
          [isbnKey(ISBN_B)]: [WORK_UUID],
          [doiKey('https://doi.org/10.11647/OBP.0001')]: [WORK_UUID],
        },
        works: [
          nativeWork([
            { id: PUB(1), type: Pdf, isbn: ISBN_A },
            { id: PUB(2), type: Epub, isbn: ISBN_B },
            { id: PUB(3), type: Html },
          ]),
        ],
      });

      expect(result.sidecar.compatibility.activation).toBe('VERIFIED');
      expect(result.sidecar.workGroups[0]).toMatchObject({
        thothVerification: 'VERIFIED',
        target: 'EXISTING_WORK',
        existingWorkId: WORK_UUID,
        workType: { status: 'RESOLVED', type: EditedBook, provenance: 'EXISTING_TARGET' },
      });
      expect(result.sidecar.products.map(({ action }) => action)).toEqual([
        'ALREADY_PRESENT',
        'ALREADY_PRESENT',
        'ALREADY_PRESENT',
      ]);
      expect(result.sidecar.products[2].evidence).toEqual([
        { kind: 'THOTH_PUBLICATION_ID', publicationId: PUB(3), workId: WORK_UUID },
      ]);
      expect(result.sidecar.blockers).toEqual([]);
      expect(result.sidecar.executable).toBe(true);
    });

    it('blocks native ids that contradict live target evidence instead of decoding them', async () => {
      const { result } = await resolve(file, {
        header: THOTH_HEADER,
        matches: { [isbnKey(ISBN_A)]: [WORK_UUID] },
        works: [nativeWork([{ id: 'aaaaaaaa-0000-4000-8000-000000000099', type: Pdf, isbn: ISBN_A }])],
      });

      expect(result.sidecar.workGroups[0].thothVerification).toBe('CONTRADICTED');
      expect(codes(result)).toContain('THOTH_PROFILE_CONTRADICTED');
    });

    it('requires an explicit compatibility decision for native ids that do not resolve, and decodes only once confirmed', async () => {
      const unconfirmed = await resolve(file, { header: THOTH_HEADER, inputs: { fileWorkType: EditedBook } });
      const productKeys = unconfirmed.sourcePlan.products.map(({ productKey }) => productKey);
      const confirmed = await resolve(file, {
        header: THOTH_HEADER,
        inputs: { fileWorkType: EditedBook, thothCompatibilityConfirmed: true },
      });

      expect(unconfirmed.result.sidecar.compatibility.activation).toBe('AWAITING_CONFIRMATION');
      expect(codes(unconfirmed.result)).toEqual(['THOTH_COMPATIBILITY_CONFIRMATION_REQUIRED']);
      expect(confirmed.result.sidecar.compatibility.activation).toBe('CONFIRMED');
      expect(confirmed.result.sidecar.workGroups[0]).toMatchObject({
        thothVerification: 'UNVERIFIED',
        target: 'NEW_WORK',
        workDoi: { kind: 'DOI', basis: 'THOTH_PROFILE' },
      });
      expect(confirmed.result.sidecar.products.map(({ productKey, action }) => [productKey, action])).toEqual(
        productKeys.map((key) => [key, 'CREATE_PUBLICATION']),
      );
      expect(confirmed.result.sidecar.blockers).toEqual([]);
    });

    it("never selects a native Work owned outside the publisher's imprints", async () => {
      const { result } = await resolve(file, {
        header: THOTH_HEADER,
        matches: { [isbnKey(ISBN_A)]: [WORK_UUID], [isbnKey(ISBN_B)]: [WORK_UUID] },
        works: [
          nativeWork(
            [
              { id: PUB(1), type: Pdf, isbn: ISBN_A },
              { id: PUB(2), type: Epub, isbn: ISBN_B },
              { id: PUB(3), type: Html },
            ],
            OTHER_IMPRINT_ID,
          ),
        ],
      });

      expect(codes(result)).toContain('THOTH_PROFILE_CONTRADICTED');
    });

    it("adapts nothing for a native Work verified inside the publisher's imprints, or for one the evidence contradicts", async () => {
      const matches = { [isbnKey(ISBN_A)]: [WORK_UUID], [isbnKey(ISBN_B)]: [WORK_UUID] };
      const publications = [
        { id: PUB(1), type: Pdf, isbn: ISBN_A },
        { id: PUB(2), type: Epub, isbn: ISBN_B },
        { id: PUB(3), type: Html },
      ];
      const verified = await resolve(file, { header: THOTH_HEADER, matches, works: [nativeWork(publications)] });
      const outside = await resolve(file, {
        header: THOTH_HEADER,
        matches,
        works: [nativeWork(publications, OTHER_IMPRINT_ID)],
      });
      const unresolved = await resolve(file, { header: THOTH_HEADER });

      // Nothing of an existing Work is created, so none of its Products is adapted, and a contradicted
      // profile is a source conflict no decision can answer.
      expect(adaptableGroupKeys(verified.sourcePlan, verified.targets, IMPRINTS)).toEqual([]);
      expect(adaptableGroupKeys(outside.sourcePlan, outside.targets, IMPRINTS)).toEqual([]);
      expect(adaptableGroupKeys(unresolved.sourcePlan, unresolved.targets, IMPRINTS)).toEqual([
        unresolved.sourcePlan.groups[0].groupKey,
      ]);
    });
  });

  describe('descriptive decisions for a new Work (thoth-app#183)', () => {
    const newWork = (descriptive: string, publishing = '') =>
      product({
        ref: 'a',
        identifiers: [pid('15', ISBN_A)],
        descriptive: form('BC', [], '00', `${MINIMAL_TITLE}${descriptive}`),
        publishing,
      });
    const unnamed =
      '<Contributor><ContributorRole>A01</ContributorRole><PersonName>A N Other</PersonName></Contributor>';
    // A corporate contributor, which Thoth never holds as a person: an omission only the publisher's consent allows.
    const corporate =
      '<Contributor><ContributorRole>A01</ContributorRole><CorporateName>Example Institute</CorporateName></Contributor>';
    const descriptiveBlockers = (result: Awaited<ReturnType<typeof resolve>>['result']) =>
      result.sidecar.blockers
        .filter(({ code }) => code.startsWith('DESCRIPTIVE_'))
        .map(({ code, classification, detail }) => [code, classification, detail.finding]);

    it('blocks a new Work on each unanswered descriptive finding, by the kind of answer that resolves it', async () => {
      const file = [newWork(`${unnamed}${corporate}`, '<PublishingStatus>00</PublishingStatus>')];
      const pending = await resolve(file, { inputs: { fileWorkType: Monograph } });
      const findingKey = (code: string) =>
        pending.result.sidecar.descriptive.findings.find((finding) => finding.code === code)?.key as string;

      expect(descriptiveBlockers(pending.result)).toEqual([
        ['DESCRIPTIVE_CHOICE_REQUIRED', 'TARGET_INPUT_REQUIRED', 'LIFECYCLE_STATUS_REQUIRED'],
        ['DESCRIPTIVE_INPUT_REQUIRED', 'TARGET_INPUT_REQUIRED', 'CONTRIBUTOR_NAME_REQUIRED'],
        ['DESCRIPTIVE_ACKNOWLEDGEMENT_REQUIRED', 'TARGET_UNREPRESENTABLE', 'CONTRIBUTOR_AGENT_UNREPRESENTABLE'],
      ]);
      expect(pending.result.sidecar.blockers.find(({ code }) => code === 'DESCRIPTIVE_CHOICE_REQUIRED')).toMatchObject({
        productKey: null,
        groupKey: pending.sourcePlan.groups[0].groupKey,
        paths: ['/ONIXMessage[1]/Product[1]/PublishingDetail[1]/PublishingStatus[1]'],
        detail: { findingKey: findingKey('LIFECYCLE_STATUS_REQUIRED'), family: 'LIFECYCLE' },
      });

      const answered = await resolve(file, {
        inputs: {
          fileWorkType: Monograph,
          descriptiveChoices: {
            [findingKey('LIFECYCLE_STATUS_REQUIRED')]: 'FORTHCOMING',
            [findingKey('CONTRIBUTOR_AGENT_UNREPRESENTABLE')]: 'ACKNOWLEDGED',
            // An entry that is no valid value answers nothing.
            [findingKey('CONTRIBUTOR_NAME_REQUIRED')]: '   ',
          },
        },
      });

      expect(descriptiveBlockers(answered.result)).toEqual([
        ['DESCRIPTIVE_INPUT_REQUIRED', 'TARGET_INPUT_REQUIRED', 'CONTRIBUTOR_NAME_REQUIRED'],
      ]);

      const entered = await resolve(file, {
        inputs: {
          fileWorkType: Monograph,
          descriptiveChoices: {
            [findingKey('LIFECYCLE_STATUS_REQUIRED')]: 'FORTHCOMING',
            [findingKey('CONTRIBUTOR_AGENT_UNREPRESENTABLE')]: 'ACKNOWLEDGED',
            [findingKey('CONTRIBUTOR_NAME_REQUIRED')]: 'Other',
          },
        },
      });

      expect(descriptiveBlockers(entered.result)).toEqual([]);
      expect(answered.result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'onix.descriptive.acknowledged',
          source: { kind: 'onix', productIndex: 1, recordReference: 'a' },
        }),
      );
    });

    it('fails closed on anything unanswered it cannot name, rather than letting the Work through', async () => {
      const root = message([newWork('', '<PublishingStatus>00</PublishingStatus>')]);
      const sourcePlan = planOnixSource(root);
      const reduced = reduceOnixDescriptive(root, sourcePlan);
      const [status] = reduced.findings.filter(({ code }) => code === 'LIFECYCLE_STATUS_REQUIRED');
      const targets = await resolveOnixTargets(sourcePlan, fakeLookup(), PUBLISHER_ID);

      const { sidecar } = resolveOnixImportPlan({
        sourcePlan,
        targets,
        inputs: { ...EMPTY_ONIX_PLAN_INPUTS, fileWorkType: Monograph },
        imprints: IMPRINTS,
        // The decision still waits on the finding, which is no longer there to name it.
        descriptive: { ...reduced, findings: reduced.findings.filter(({ key }) => key !== status.key) },
        serieses: [],
      });

      expect(sidecar.executable).toBe(false);
      expect(sidecar.blockers).toContainEqual(
        expect.objectContaining({
          code: 'DESCRIPTIVE_PREFLIGHT_GAP',
          classification: 'PREFLIGHT_GAP',
          detail: { findingKey: status.key },
        }),
      );
    });

    it('discloses what a new Work will not hold, and asks nothing of a Work that already exists', async () => {
      const file = [
        product({
          ref: 'a',
          identifiers: [pid('15', ISBN_A)],
          descriptive: form(
            'BC',
            [],
            '00',
            `${MINIMAL_TITLE}<IllustrationsNote>12 halftones</IllustrationsNote>${unnamed}`,
          ),
          related: relatedWork(workIdentifier('06', '10.1234/work')),
        }),
      ];
      const created = await resolve(file, { inputs: { fileWorkType: Monograph } });
      const present = await resolve(file, {
        matches: { [doiKey(WORK_DOI)]: ['w-1'], [isbnKey(ISBN_A)]: ['w-1'] },
        works: [existingWork('w-1', { doi: WORK_DOI, publications: [{ id: 'p-1', type: Paperback, isbn: ISBN_A }] })],
      });

      expect(created.result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'onix.descriptive.disclosure',
          message: expect.stringContaining('illustrations note'),
        }),
      );
      expect(descriptiveBlockers(present.result)).toEqual([]);
      expect(present.result.sidecar.executable).toBe(true);
      expect(present.result.warnings.map(({ code }) => code)).not.toContain('onix.descriptive.disclosure');
    });

    it('asks once for the type of a Series Thoth does not hold, whichever new Works name it', async () => {
      const collection = (ordinal: string) =>
        `<Collection><CollectionType>10</CollectionType><CollectionSequence><CollectionSequenceType>03</CollectionSequenceType><CollectionSequenceNumber>${ordinal}</CollectionSequenceNumber></CollectionSequence>` +
        '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>02</TitleElementLevel><TitleText>New Series</TitleText></TitleElement></TitleDetail></Collection>';
      const file = [
        product({
          ref: 'a',
          identifiers: [pid('15', ISBN_A)],
          descriptive: form('BC', [], '00', `${MINIMAL_TITLE}${collection('1')}`),
        }),
        product({
          ref: 'b',
          identifiers: [pid('15', ISBN_B)],
          descriptive: form('BC', [], '00', `${MINIMAL_TITLE}${collection('2')}`),
        }),
      ];
      const pending = await resolve(file, { inputs: { fileWorkType: Monograph } });
      const [typeFinding] = pending.result.sidecar.descriptive.findings.filter(
        ({ code }) => code === 'SERIES_TYPE_REQUIRED',
      );

      expect(descriptiveBlockers(pending.result)).toEqual([
        ['DESCRIPTIVE_CHOICE_REQUIRED', 'TARGET_INPUT_REQUIRED', 'SERIES_TYPE_REQUIRED'],
      ]);

      const answered = await resolve(file, {
        inputs: { fileWorkType: Monograph, descriptiveChoices: { [typeFinding.key]: 'JOURNAL' } },
      });

      expect(answered.result.sidecar.blockers).toEqual([]);
    });
  });

  describe('the executable plan', () => {
    const NO_LOOKUPS: OnixDescriptiveLookups = {
      contributors: {},
      institutions: {},
      funders: {},
      institutionCandidates: {},
      chapterWorkIds: {},
    };
    const candidate = (id: string, overrides: Partial<WorkEntity> = {}) =>
      getDefaultWork({
        id,
        imprintId: IMPRINT_ID,
        titles: [getDefaultTitle({ canonical: true, title: id })],
        ...overrides,
      });
    const adapted = (
      groupKey: string,
      workId: string,
      publications: OnixAdaptedGroup['publications'],
      conflictingFields: string[] = [],
      descriptive: OnixDescriptiveLookups = NO_LOOKUPS,
    ): OnixAdaptedGroup => ({
      groupKey,
      workId,
      conflictingFields,
      publications,
      descriptive,
    });
    const planned = (products: string[]) => {
      const root = message(products);
      const sourcePlan = planOnixSource(root);

      return {
        sourcePlan,
        descriptive: reduceOnixDescriptive(root, sourcePlan),
        rights: reduceOnixRights(root, sourcePlan),
      };
    };
    const chapterItem =
      '<ContentItem><LevelSequenceNumber>1</LevelSequenceNumber><TextItem><TextItemType>03</TextItemType></TextItem>' +
      '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>04</TitleElementLevel><TitleText language="eng">Chapter One</TitleText></TitleElement></TitleDetail></ContentItem>';
    const CHAPTER_PATH = '/ONIXMessage[1]/Product[1]/ContentDetail[1]/ContentItem[1]';
    const seriesCollection =
      '<Collection><CollectionType>10</CollectionType><CollectionSequence><CollectionSequenceType>03</CollectionSequenceType><CollectionSequenceNumber>1</CollectionSequenceNumber></CollectionSequence>' +
      '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>02</TitleElementLevel><TitleText>Series</TitleText></TitleElement></TitleDetail></Collection>';

    it('carries only faithfully executable new Works, with their resolved type, edition, Work DOI, description and chosen Publications', async () => {
      const shared = relatedWork(workIdentifier('01', 'W-1', 'id'), workIdentifier('06', '10.1234/work'));
      const { sourcePlan, descriptive } = planned([
        product({
          ref: 'pb',
          identifiers: [pid('15', ISBN_A)],
          descriptive: form('BC', [], '00', `${MINIMAL_TITLE}${seriesCollection}`),
          related: shared,
          content: chapterItem,
        }),
        product({
          ref: 'x',
          identifiers: [pid('15', ISBN_B)],
          descriptive: form('EB', ['E113'], '00', `${MINIMAL_TITLE}${seriesCollection}`),
          related: shared,
        }),
        product({
          ref: 'present',
          identifiers: [pid('15', ISBN_C)],
          related: relatedWork(workIdentifier('06', '10.1234/present')),
        }),
      ]);
      const targets = await resolveOnixTargets(
        sourcePlan,
        fakeLookup({ [isbnKey(ISBN_C)]: ['w-9'], [doiKey('https://doi.org/10.1234/present')]: ['w-9'] }, [
          existingWork('w-9', {
            doi: 'https://doi.org/10.1234/present',
            publications: [{ id: 'p-9', type: Paperback, isbn: ISBN_C }],
          }),
        ]),
        PUBLISHER_ID,
      );
      const [newGroup, presentGroup] = sourcePlan.groups;
      const paperback = getDefaultPublication({ type: Paperback, isbn: ISBN_A });
      const html = getDefaultPublication({ type: Html, isbn: ISBN_B });
      const xml = getDefaultPublication({ type: Xml, isbn: ISBN_B });
      const candidatePlan: ImportPlan = {
        works: [candidate('work-new', { publications: [paperback] })],
        chapters: [{ ...candidate('chapter-1', { type: BookChapter }), relationId: 'work-new' }],
        series: [],
      };
      const inputs: OnixPlanInputs = {
        ...EMPTY_ONIX_PLAN_INPUTS,
        fileWorkType: Monograph,
        manifestationChoices: { [`product:gtin13:${ISBN_B}`]: Xml },
      };
      const series = {
        id: 's-1',
        name: 'Series',
        type: 'BOOK_SERIES' as const,
        issnPrint: '',
        issnDigital: '',
        updatedAt: '',
        imprintId: IMPRINT_ID,
        imprintName: '',
        url: '',
        cfpUrl: '',
        description: '',
        issues: [],
      };

      expect(adaptableGroupKeys(sourcePlan, targets, IMPRINTS)).toEqual([newGroup.groupKey]);

      const { plan, sidecar } = resolveOnixImportPlan({
        sourcePlan,
        targets,
        inputs,
        imprints: IMPRINTS,
        descriptive,
        serieses: [series as never],
        candidatePlan,
        adaptation: [
          adapted(
            newGroup.groupKey,
            'work-new',
            {
              [`product:gtin13:${ISBN_A}`]: { [Paperback]: { publication: paperback, issues: [] } },
              [`product:gtin13:${ISBN_B}`]: {
                [Html]: { publication: html, issues: [] },
                [Xml]: { publication: xml, issues: [] },
              },
            },
            [],
            { ...NO_LOOKUPS, chapterWorkIds: { [CHAPTER_PATH]: 'chapter-1' } },
          ),
        ],
      });
      // A planned title row carries the markup format its whole row is written in (thoth-app#183).
      const title = (text: string) => ({
        id: '0000-0000-0000-0000',
        canonical: true,
        title: text,
        subtitle: '',
        fullTitle: text,
        localeCode: 'EN',
        sourceMarkupFormat: 'PLAIN_TEXT',
      });

      expect(sidecar.executable).toBe(true);
      expect(presentGroup.groupKey).not.toBe(newGroup.groupKey);
      expect(plan?.works).toEqual([
        {
          ...candidatePlan.works[0],
          type: Monograph,
          edition: 1,
          doi: WORK_DOI,
          publications: [paperback, xml],
          // Every descriptive field is the canonical reduction's, never the candidate's.
          titles: [title('A Work')],
          languages: [],
          subjects: [],
          status: 'FORTHCOMING',
          publicationDate: null,
          withdrawnDate: null,
          copyrightHolder: '',
          landingPage: '',
          place: '',
          pageCount: 0,
          imageCount: 0,
          tableCount: 0,
          audioCount: 0,
          videoCount: 0,
          bibliographyNote: '',
          fundings: [],
          contributions: [],
        },
      ]);
      expect(plan?.chapters).toEqual([
        {
          ...candidatePlan.chapters[0],
          edition: 1,
          status: 'FORTHCOMING',
          publicationDate: null,
          withdrawnDate: null,
          copyrightHolder: '',
          titles: [title('Chapter One')],
          languages: [],
          subjects: [],
          contributions: [],
        },
      ]);
      expect(plan?.series).toEqual([
        {
          name: 'Series',
          target: { kind: 'existing', seriesId: 's-1' },
          members: [{ workId: 'work-new', orderNumber: 1, issueNumber: null }],
        },
      ]);
      expect(plan?.onix).toBe(sidecar);
      // Nothing states a count, so no count is written as anything but unset.
      expect(sidecar.descriptive.statedCounts).toEqual([]);
      expect(
        sidecar.workGroups.map(({ groupKey, plannedWorkId, target }) => [groupKey, plannedWorkId, target]),
      ).toEqual([
        [newGroup.groupKey, 'work-new', 'NEW_WORK'],
        [presentGroup.groupKey, null, 'EXISTING_WORK'],
      ]);
    });

    describe('the Work licence (thoth-app#211)', () => {
      const LICENSED_EPUB = form(
        'EA',
        ['E101'],
        '00',
        `${MINIMAL_TITLE}<EpubTechnicalProtection>00</EpubTechnicalProtection><EpubLicense><EpubLicenseName>Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License</EpubLicenseName><EpubLicenseExpression><EpubLicenseExpressionType>01</EpubLicenseExpressionType><EpubLicenseExpressionLink>https://creativecommons.org/licenses/by-nc-nd/4.0/legalcode</EpubLicenseExpressionLink></EpubLicenseExpression></EpubLicense>`,
      );
      const shared = relatedWork(workIdentifier('06', '10.1234/work'));
      const epubKey = `product:gtin13:${ISBN_B}`;
      const paperbackKey = `product:gtin13:${ISBN_A}`;

      /** A paperback and a licensed e-book of one new Work, adapted with one chapter, as the parser adapts them. */
      const licensedWork = async (epub = LICENSED_EPUB, candidateLicense = '') => {
        const planning = planned([
          product({ ref: 'pb', identifiers: [pid('15', ISBN_A)], related: shared, content: chapterItem }),
          product({ ref: 'epub', identifiers: [pid('15', ISBN_B)], descriptive: epub, related: shared }),
        ]);
        const targets = await resolveOnixTargets(planning.sourcePlan, fakeLookup(), PUBLISHER_ID);
        const [{ groupKey }] = planning.sourcePlan.groups;
        const paperback = getDefaultPublication({ type: Paperback, isbn: ISBN_A });
        const epubPublication = getDefaultPublication({ type: Epub, isbn: ISBN_B });

        return {
          ...planning,
          groupKey,
          context: {
            sourcePlan: planning.sourcePlan,
            targets,
            inputs: { ...EMPTY_ONIX_PLAN_INPUTS, fileWorkType: Monograph },
            imprints: IMPRINTS,
            descriptive: planning.descriptive,
            serieses: [],
            candidatePlan: {
              works: [candidate('work-1', { license: candidateLicense })],
              chapters: [
                { ...candidate('chapter-1', { type: BookChapter, license: candidateLicense }), relationId: 'work-1' },
              ],
              series: [],
            },
            adaptation: [
              adapted(
                groupKey,
                'work-1',
                {
                  [paperbackKey]: { [Paperback]: { publication: paperback, issues: [] } },
                  [epubKey]: { [Epub]: { publication: epubPublication, issues: [] } },
                },
                [],
                { ...NO_LOOKUPS, chapterWorkIds: { [CHAPTER_PATH]: 'chapter-1' } },
              ),
            ],
          },
        };
      };

      it('gives the new Work the one licence its rights decide, and its chapters none, whatever the candidate held', async () => {
        const { context, rights } = await licensedWork(LICENSED_EPUB, 'https://legacy.example/licence');
        const { plan, sidecar } = resolveOnixImportPlan({ ...context, rights });

        expect(sidecar.blockers).toEqual([]);
        expect(plan?.works.map(({ id, license, publications }) => [id, license, publications.length])).toEqual([
          ['work-1', 'https://creativecommons.org/licenses/by-nc-nd/4.0/', 2],
        ]);
        expect(plan?.chapters.map(({ id, license }) => [id, license])).toEqual([['chapter-1', '']]);
        // The plan keeps every rights fact and decision it rests on.
        expect(sidecar.rights).toBe(rights);
      });

      it('sets no licence where the rights decide none, and never keeps one the candidate held', async () => {
        const silent = form(
          'EA',
          ['E101'],
          '00',
          `${MINIMAL_TITLE}<EpubTechnicalProtection>00</EpubTechnicalProtection>`,
        );
        const { context, rights, groupKey } = await licensedWork(
          silent,
          'https://creativecommons.org/licenses/by/4.0/',
        );
        const { plan } = resolveOnixImportPlan({ ...context, rights });

        expect(rights.groups[groupKey].licence).toEqual({ kind: 'UNSET' });
        expect(plan?.works.map(({ license }) => license)).toEqual(['']);
        expect(plan?.chapters.map(({ license }) => license)).toEqual(['']);
      });

      it('holds a new Work back while any rights finding blocks, one blocker per finding, and discloses the rest', async () => {
        const restricted = form(
          'EA',
          ['E101'],
          '00',
          `${MINIMAL_TITLE}<EpubTechnicalProtection>00</EpubTechnicalProtection><EpubTechnicalProtection>03</EpubTechnicalProtection>` +
            '<EpubUsageConstraint><EpubUsageType>11</EpubUsageType><EpubUsageStatus>03</EpubUsageStatus></EpubUsageConstraint>' +
            '<EpubLicense><EpubLicenseName>An agreement</EpubLicenseName><EpubLicenseExpression><EpubLicenseExpressionType>01</EpubLicenseExpressionType><EpubLicenseExpressionLink>https://publisher.example/eula</EpubLicenseExpressionLink></EpubLicenseExpression>' +
            '<EpubLicenseExpression><EpubLicenseExpressionType>10</EpubLicenseExpressionType><EpubLicenseExpressionLink>https://publisher.example/onix-pl.xml</EpubLicenseExpressionLink></EpubLicenseExpression></EpubLicense>',
        );
        const { context, rights, groupKey } = await licensedWork(restricted);
        const { plan, sidecar } = resolveOnixImportPlan({ ...context, rights });
        const blocking = rights.findings.filter(({ blocking: blocks }) => blocks);

        expect(plan).toBeNull();
        expect(
          sidecar.blockers.map(({ code, classification, productKey, groupKey: scope, detail }) => [
            code,
            classification,
            productKey,
            scope,
            detail.finding,
          ]),
        ).toEqual([
          ['RIGHTS_UNREPRESENTABLE', 'TARGET_UNREPRESENTABLE', epubKey, groupKey, 'RIGHTS_LICENCE_UNSUPPORTED'],
          ['RIGHTS_SOURCE_CONFLICT', 'SOURCE_CONFLICT', epubKey, groupKey, 'RIGHTS_TECHNICAL_PROTECTION_CONTRADICTION'],
          [
            'RIGHTS_UNREPRESENTABLE',
            'TARGET_UNREPRESENTABLE',
            epubKey,
            groupKey,
            'RIGHTS_USAGE_CONSTRAINT_UNREPRESENTABLE',
          ],
        ]);
        expect(sidecar.blockers.map(({ detail }) => detail.findingKey)).toEqual(blocking.map(({ key }) => key));
        expect(sidecar.blockers.map(({ paths }) => paths)).toEqual(
          blocking.map(({ locations }) => locations.map(({ path }) => path)),
        );
        // A loss that blocks nothing - here a machine-readable policy - stays in the plan as the finding that says so.
        const policy = rights.findings.find(({ code }) => code === 'RIGHTS_POLICY_NOT_REPRESENTED');

        expect(policy?.blocking).toBe(false);
        expect(sidecar.rights?.findings).toContainEqual(policy);
        expect(sidecar.blockers.map(({ detail }) => detail.findingKey)).not.toContain(policy?.key);
        expect(sidecar.rights?.groups[groupKey].licence.kind).toBe('BLOCKED');
      });

      it('fails closed without a rights reduction wherever the file states rights, and plans as before where it states none', async () => {
        const licensed = await licensedWork();
        const silent = await licensedWork(form('EA', ['E101']));
        const unreduced = resolveOnixImportPlan(licensed.context);
        const unstated = resolveOnixImportPlan(silent.context);

        expect(unreduced.plan).toBeNull();
        expect(unreduced.sidecar.blockers).toEqual([
          expect.objectContaining({
            code: 'RIGHTS_PREFLIGHT_GAP',
            classification: 'PREFLIGHT_GAP',
            groupKey: licensed.groupKey,
            detail: { reason: 'RIGHTS_NOT_REDUCED' },
          }),
        ]);
        expect(unreduced.sidecar.rights).toBeUndefined();
        expect(unstated.sidecar.blockers).toEqual([]);
        expect(unstated.plan?.works.map(({ license }) => license)).toEqual(['']);
      });
    });

    it("gives a new Work's chapters the edition the publisher entered for that Work", async () => {
      const { sourcePlan, descriptive } = planned([
        product({
          ref: 'rev',
          identifiers: [pid('15', ISBN_A)],
          descriptive: form('BC', [], '00', '<EditionType>REV</EditionType>'),
          content: chapterItem,
        }),
      ]);
      const targets = await resolveOnixTargets(sourcePlan, fakeLookup(), PUBLISHER_ID);
      const [{ groupKey }] = sourcePlan.groups;
      const paperback = getDefaultPublication({ type: Paperback, isbn: ISBN_A });
      // The adapter leaves an unnumbered edition unset on the Work and on each chapter it inherits it.
      const candidatePlan: ImportPlan = {
        works: [candidate('work-rev', { edition: null })],
        chapters: [{ ...candidate('chapter-1', { type: BookChapter, edition: null }), relationId: 'work-rev' }],
        series: [],
      };

      const { plan } = resolveOnixImportPlan({
        sourcePlan,
        targets,
        inputs: { ...EMPTY_ONIX_PLAN_INPUTS, fileWorkType: Monograph, editionInputs: { [groupKey]: 3 } },
        imprints: IMPRINTS,
        descriptive,
        serieses: [],
        candidatePlan,
        adaptation: [
          adapted(
            groupKey,
            'work-rev',
            { [`product:gtin13:${ISBN_A}`]: { [Paperback]: { publication: paperback, issues: [] } } },
            [],
            { ...NO_LOOKUPS, chapterWorkIds: { [CHAPTER_PATH]: 'chapter-1' } },
          ),
        ],
      });

      expect(plan?.works.map(({ id, edition }) => [id, edition])).toEqual([['work-rev', 3]]);
      expect(plan?.chapters.map(({ id, edition }) => [id, edition])).toEqual([['chapter-1', 3]]);
    });

    it('produces no plan while anything blocks, and blocks a grouped Work whose adapted facts disagree', async () => {
      const shared = relatedWork(workIdentifier('01', 'W-1', 'id'));
      const { sourcePlan, descriptive } = planned([
        product({ ref: 'pb', identifiers: [pid('15', ISBN_A)], related: shared }),
        product({ ref: 'hb', identifiers: [pid('15', ISBN_B)], descriptive: form('BB'), related: shared }),
      ]);
      const targets = await resolveOnixTargets(sourcePlan, fakeLookup(), PUBLISHER_ID);
      const { groupKey } = sourcePlan.groups[0];

      const { plan, sidecar } = resolveOnixImportPlan({
        sourcePlan,
        targets,
        inputs: { ...EMPTY_ONIX_PLAN_INPUTS, fileWorkType: Monograph },
        imprints: IMPRINTS,
        descriptive,
        serieses: [],
        candidatePlan: { works: [candidate('work-1')], chapters: [], series: [] },
        adaptation: [adapted(groupKey, 'work-1', {}, ['abstracts'])],
      });

      expect(plan).toBeNull();
      expect(sidecar.blockers).toEqual([
        expect.objectContaining({ code: 'GROUPED_WORK_FACT_CONFLICT', groupKey, detail: { fields: ['abstracts'] } }),
      ]);
    });
  });
});
