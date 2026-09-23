import { parse } from '@5stones/onix';
import { describe, expect, it, vi } from 'vitest';

import { CurrencyCode } from '@/gql/graphql';
import type { WorkEntity } from '@/src/entities/work/model/work.types';

import { AccessibilityExceptions, AccessibilityStandards } from '../../constants/accessibility';
import { PublicationType } from '../../constants/publications';
import { WorkTypes } from '../../constants/work';
import type { ImportIdentifier, ImportPlan } from '../../types';
import {
  ONIX_ACCESSIBILITY_ACKNOWLEDGED,
  ONIX_ACCESSIBILITY_KEEP_EXCEPTION,
  ONIX_ACCESSIBILITY_KEEP_STANDARDS,
  ONIX_ACCESSIBILITY_OMIT,
  ONIX_COMPONENT_ACKNOWLEDGED,
  ONIX_PRICE_OMIT,
  ONIX_RIGHTS_ACKNOWLEDGED,
  type OnixAdaptedGroup,
  type OnixDescriptiveLookups,
  type OnixPlanFinding,
  type OnixPlanInputs,
  type OnixRightsFinding,
  type OnixSalesRightsFinding,
} from '../../types/onixPlanning';
import { importIdentifierKey } from '../../utils/importPreflight/identifiers';
import { getDefaultPublication } from '../../utils/publications';
import { getDefaultTitle, getDefaultWork } from '../../utils/work';
import type { ExtendedONIXMessageRoot } from './interfaces';
import { reduceOnixAccessibility } from './onixAccessibility';
import { reduceOnixCommercial } from './onixCommercial';
import { reduceOnixComponents } from './onixComponents';
import { reduceOnixDescriptive } from './onixDescriptive';
import { planOnixSource } from './onixPlanning';
import { reduceOnixRights } from './onixRights';
import { reduceOnixSalesRights } from './onixSalesRights';
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
  /** Whatever ProductSupply composites the record states, last in the record as ONIX orders them. */
  supply?: string;
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
  supply = '',
}: ProductSpec) =>
  `<Product><RecordReference>${ref}</RecordReference><NotificationType>${notification}</NotificationType>${envelope}${identifiers.join('')}` +
  (descriptive.includes('<TitleDetail>')
    ? descriptive
    : descriptive.replace('</DescriptiveDetail>', `${MINIMAL_TITLE}</DescriptiveDetail>`)) +
  (content ? `<ContentDetail>${content}</ContentDetail>` : '') +
  `<PublishingDetail><Imprint><ImprintName>${imprint}</ImprintName></Imprint>${publishing}${publishing.includes('<PublishingStatus>') ? '' : MINIMAL_STATUS}</PublishingDetail>` +
  `${related ? `<RelatedMaterial>${related}</RelatedMaterial>` : ''}${supply}</Product>`;

const message = (products: string[], header = headerXml(), release: '3.0' | '3.1' = '3.0') =>
  parse(
    `<ONIXMessage release="${release}" xmlns="${release === '3.0' ? REFERENCE_NS : 'http://ns.editeur.org/onix/3.1/reference'}">${header}${products.join('')}</ONIXMessage>`,
  ) as ExtendedONIXMessageRoot;

type ExistingPublication = {
  id: string;
  type: (typeof PublicationType.enum)[keyof typeof PublicationType.enum];
  isbn?: string;
  /** The accessibility fields the Publication holds in Thoth, as the Work fragment reads them back (thoth-app#221). */
  accessibility?: Partial<
    Pick<
      ReturnType<typeof getDefaultPublication>,
      'accessibilityStandard' | 'accessibilityAdditionalStandard' | 'accessibilityException' | 'accessibilityReportUrl'
    >
  >;
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
    publications: publications.map(({ id: publicationId, type: publicationType, isbn = '', accessibility = {} }) =>
      getDefaultPublication({ id: publicationId, type: publicationType, isbn, ...accessibility }),
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
  release?: '3.0' | '3.1';
  matches?: Record<string, string[]>;
  works?: WorkEntity[];
  inputs?: Partial<OnixPlanInputs>;
  /** Whether the Stage-C sales-rights reduction is given to the resolver, as XMLParse always gives it. */
  withSalesRights?: boolean;
  /** Whether the accessibility reduction (thoth-app#221) is given to the resolver, as XMLParse always gives it. */
  withAccessibility?: boolean;
  /** Whether every group is adapted as a candidate Work of e-book Publications, so that an unblocked plan is built. */
  executable?: boolean;
};

/** A candidate Work and adaptation for every Work group, each Product an Epub, as the parser would adapt them. */
const candidatesFor = (
  sourcePlan: ReturnType<typeof planOnixSource>,
): Pick<Parameters<typeof resolveOnixImportPlan>[0], 'candidatePlan' | 'adaptation'> => {
  const groups = sourcePlan.groups.map(({ groupKey, productKeys }, index) => ({
    groupKey,
    productKeys,
    workId: `work-${index + 1}`,
  }));

  return {
    candidatePlan: {
      works: groups.map(({ workId }) =>
        getDefaultWork({
          id: workId,
          imprintId: IMPRINT_ID,
          titles: [getDefaultTitle({ canonical: true, title: workId })],
        }),
      ),
      chapters: [],
      series: [],
    },
    adaptation: groups.map(({ groupKey, workId, productKeys }) => ({
      groupKey,
      workId,
      conflictingFields: [],
      descriptive: { contributors: {}, institutions: {}, funders: {}, institutionCandidates: {}, chapterWorkIds: {} },
      publications: Object.fromEntries(
        productKeys.map((productKey) => {
          const node = sourcePlan.products.find((candidate) => candidate.productKey === productKey);
          const isbn = node?.isbn.kind === 'ACCEPTED' ? node.isbn.isbn : '';

          return [productKey, { [Epub]: { publication: getDefaultPublication({ type: Epub, isbn }), issues: [] } }];
        }),
      ),
    })),
  };
};

const resolve = async (
  products: string[],
  {
    header,
    release,
    matches,
    works,
    inputs,
    withSalesRights = true,
    withAccessibility = true,
    executable = false,
  }: Scenario = {},
) => {
  const root = message(products, header, release);
  const sourcePlan = planOnixSource(root);
  const descriptive = reduceOnixDescriptive(root, sourcePlan);
  const rights = reduceOnixRights(root, sourcePlan);
  const commercial = reduceOnixCommercial(root, sourcePlan);
  const salesRights = reduceOnixSalesRights(root, sourcePlan, { commercial });
  const accessibility = reduceOnixAccessibility(root, sourcePlan, { rights });
  const lookup = fakeLookup(matches, works);
  const targets = await resolveOnixTargets(sourcePlan, lookup, PUBLISHER_ID);
  const context = {
    sourcePlan,
    targets,
    inputs: { ...EMPTY_ONIX_PLAN_INPUTS, ...inputs },
    imprints: IMPRINTS,
    descriptive,
    rights,
    commercial,
    ...(withSalesRights ? { salesRights } : {}),
    ...(withAccessibility ? { accessibility } : {}),
    serieses: [],
    ...(executable ? candidatesFor(sourcePlan) : {}),
  };
  const result = resolveOnixImportPlan(context);

  return { sourcePlan, descriptive, rights, commercial, salesRights, accessibility, targets, lookup, result, context };
};

/** A canonical path, as a Reference source states it at the same path. */
const located = (path: string) => ({ path, sourcePath: path });

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
        license: '',
        publications: [
          {
            publicationId: 'p-1',
            type: Paperback,
            isbn: '978-1-80000-001-8',
            // Read back for comparison only (thoth-app#221): an unset report URL reads as null, never ''.
            accessibility: {
              accessibilityStandard: null,
              accessibilityAdditionalStandard: null,
              accessibilityException: null,
              accessibilityReportUrl: null,
            },
          },
        ],
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

    it("never writes or clears an existing Work's licence: the same supported licence is already present, a missing one blocks (#211, #217)", async () => {
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
        expect(result.plan).toBeNull();
      });
      // The same licence, already present, is corroboration (5568901904 rule 120); a Work without one is not
      // silently given it (rule 121): ordinary import blocks for a separate metadata-update decision.
      expect(codes(same.result).filter((code) => code.startsWith('RIGHTS_'))).toEqual([]);
      expect(same.result.sidecar.licenceActions?.[0].action).toEqual({
        kind: 'ALREADY_PRESENT',
        identity: 'CC_BY_4_0',
        url: 'https://creativecommons.org/licenses/by/4.0/',
      });
      // A Work holding no licence is not silently given one either: the publisher decides, explicitly, that the
      // licence the file states is not written to it (Correction 1 of the #218 review).
      expect(codes(unset.result).filter((code) => code.startsWith('RIGHTS_'))).toEqual([
        'RIGHTS_ACKNOWLEDGEMENT_REQUIRED',
      ]);
      expect(
        unset.result.sidecar.blockers.find(({ code }) => code === 'RIGHTS_ACKNOWLEDGEMENT_REQUIRED')?.detail,
      ).toEqual({
        findingKey: `RIGHTS|RIGHTS_EXISTING_LICENCE_NOT_SET|${unset.sourcePlan.groups[0].groupKey}`,
        finding: 'RIGHTS_EXISTING_LICENCE_NOT_SET',
      });
      expect(unset.result.sidecar.licenceActions?.[0].action).toEqual({ kind: 'BLOCKED' });
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
          // The price carries rights of its own, so it is also a price only the publisher may take: that decision is
          // answered here, and only the rights it states are left to hold the plan.
          const { commercial } = await resolve([priced(attaching())], scenario);
          const [priceDecision] = commercial.findings.filter(({ code }) => code === 'PRICE_NOT_AUTOMATIC');
          const { result, rights, sourcePlan } = await resolve([priced(attaching())], {
            ...scenario,
            inputs: { ...scenario.inputs, commercialChoices: { [priceDecision.key]: ONIX_PRICE_OMIT } },
          });
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
          ['RIGHTS_ACKNOWLEDGEMENT_REQUIRED', 'RIGHTS_TECHNICAL_PROTECTION_UNREPRESENTABLE'],
        ]);
        expect(result.sidecar.blockers[1]).toEqual({
          code: 'RIGHTS_ACKNOWLEDGEMENT_REQUIRED',
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

    it("creates the Work with its own export's downloadable front cover only once the profile applies (thoth-app#219 Amendment 2)", async () => {
      const COVER = 'https://cdn.example.org/covers/OBP.0001.jpg';
      const collateral =
        '<CollateralDetail><SupportingResource><ResourceContentType>01</ResourceContentType><ContentAudience>00</ContentAudience>' +
        `<ResourceMode>03</ResourceMode><ResourceVersion><ResourceForm>02</ResourceForm><ResourceLink>${COVER}</ResourceLink></ResourceVersion>` +
        '</SupportingResource></CollateralDetail>';
      // The export's EPUB alone, which the executable scenario adapts as it adapts every Product.
      const covered = [
        thothProduct(2, ISBN_B, 'E101').replace('</DescriptiveDetail>', `</DescriptiveDetail>${collateral}`),
      ];
      const confirmed = await resolve(covered, {
        header: THOTH_HEADER,
        executable: true,
        inputs: { fileWorkType: EditedBook, thothCompatibilityConfirmed: true },
      });
      const unconfirmed = await resolve(covered, { header: THOTH_HEADER, inputs: { fileWorkType: EditedBook } });
      const downloadable = (result: typeof confirmed.result) =>
        result.sidecar.descriptive.findings
          .filter(({ code }) => code === 'COVER_DECISION_CANDIDATE' || code === 'COVER_CHOICE_REQUIRED')
          .map(({ code, detail }) => [code, detail.reasons ?? detail.values]);

      expect(confirmed.result.sidecar.blockers).toEqual([]);
      expect(confirmed.result.plan?.works.map(({ coverUrl }) => coverUrl)).toEqual([COVER]);
      expect(downloadable(confirmed.result)).toEqual([]);
      // Until the profile is confirmed, a file to download is the Work's cover link only by the publisher's decision.
      expect(codes(unconfirmed.result)).toEqual([
        'THOTH_COMPATIBILITY_CONFIRMATION_REQUIRED',
        'DESCRIPTIVE_CHOICE_REQUIRED',
      ]);
      expect(downloadable(unconfirmed.result)).toEqual([
        ['COVER_DECISION_CANDIDATE', ['DOWNLOADABLE_FILE']],
        ['COVER_CHOICE_REQUIRED', [COVER]],
      ]);
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

  describe('the Work cover (thoth-app#219 Amendment 2)', () => {
    const COVER = 'https://press.example.org/covers/a-work.jpg';
    const OTHER_COVER = 'https://press.example.org/covers/a-work-large.jpg';
    const collateral = (form = '01', link = COVER) =>
      '<CollateralDetail><SupportingResource><ResourceContentType>01</ResourceContentType><ContentAudience>00</ContentAudience>' +
      `<ResourceMode>03</ResourceMode><ResourceVersion><ResourceForm>${form}</ResourceForm><ResourceLink>${link}</ResourceLink></ResourceVersion>` +
      '</SupportingResource></CollateralDetail>';
    const covered = (ref: string, isbn: string, cover: string, related = '') =>
      product({ ref, identifiers: [pid('15', isbn)], descriptive: form('EA', ['E101']), related }).replace(
        '</DescriptiveDetail>',
        `</DescriptiveDetail>${cover}`,
      );
    /** The plan again, from a candidate Work that already held a cover the reduction never planned. */
    const replanned = ({ context }: Awaited<ReturnType<typeof resolve>>, choices: Record<string, string> = {}) =>
      resolveOnixImportPlan({
        ...context,
        inputs: { ...context.inputs, descriptiveChoices: choices },
        candidatePlan: context.candidatePlan && {
          ...context.candidatePlan,
          works: context.candidatePlan.works.map((work) => ({ ...work, coverUrl: 'https://legacy.example/cover.jpg' })),
        },
      });

    it('creates a new Work with the one eligible front cover its reduction plans, and with none it does not, never the candidate’s', async () => {
      const linkable = await resolve([covered('epub', ISBN_A, collateral())], {
        executable: true,
        inputs: { fileWorkType: Monograph },
      });
      const downloadable = await resolve([covered('epub', ISBN_A, collateral('02'))], {
        executable: true,
        inputs: { fileWorkType: Monograph },
      });

      const [decision] = downloadable.result.sidecar.descriptive.findings.filter(
        ({ code }) => code === 'COVER_CHOICE_REQUIRED',
      );

      expect(replanned(linkable).sidecar.blockers).toEqual([]);
      expect(replanned(linkable).plan?.works.map(({ coverUrl }) => coverUrl)).toEqual([COVER]);
      // Omitted by the publisher, the Work states no cover, never the candidate's.
      expect(replanned(downloadable, { [decision.key]: 'OMIT' }).plan?.works.map(({ coverUrl }) => coverUrl)).toEqual([
        undefined,
      ]);
    });

    it.each([
      ['an external downloadable file (CR-1)', collateral('02'), /download and host/],
      [
        'a required credit (CR-2)',
        collateral().replace(
          '<ResourceVersion>',
          '<ResourceFeature><ResourceFeatureType>01</ResourceFeatureType><FeatureNote>Photo: A. Photographer</FeatureNote></ResourceFeature><ResourceVersion>',
        ),
        /"Photo: A\. Photographer"/,
      ],
    ])(
      'waits for an explicit decision on a front cover with %s: its exact URL with the loss disclosed, or none, and never a stale answer',
      async (_case, cover, warning) => {
        const decided = await resolve([covered('epub', ISBN_A, cover)], {
          executable: true,
          inputs: { fileWorkType: Monograph },
        });
        const [decision] = decided.result.sidecar.descriptive.findings.filter(
          ({ code }) => code === 'COVER_CHOICE_REQUIRED',
        );

        // Unanswered, the plan waits on the one decision, and nothing is created.
        expect(decided.result.plan).toBeNull();
        expect(decided.result.sidecar.blockers).toEqual([
          expect.objectContaining({
            code: 'DESCRIPTIVE_CHOICE_REQUIRED',
            classification: 'TARGET_INPUT_REQUIRED',
            detail: expect.objectContaining({ findingKey: decision.key, family: 'COVER' }),
          }),
        ]);
        expect(decision.message).toMatch(warning);
        expect(decision.resolution).toEqual({
          kind: 'CHOICE',
          options: [
            { key: COVER, label: COVER },
            { key: 'OMIT', label: 'OMIT' },
          ],
        });

        // Its exact URL: the Work's cover, with what it cannot keep said in the preview.
        const used = replanned(decided, { [decision.key]: COVER });
        expect(used.sidecar.blockers).toEqual([]);
        expect(used.plan?.works.map(({ coverUrl, copyrightHolder }) => [coverUrl, copyrightHolder])).toEqual([
          [COVER, ''],
        ]);
        expect(used.warnings).toContainEqual(
          expect.objectContaining({
            code: 'onix.descriptive.disclosure',
            message: expect.stringMatching(warning),
          }),
        );

        // None: no cover at all, never the candidate's.
        expect(replanned(decided, { [decision.key]: 'OMIT' }).plan?.works.map(({ coverUrl }) => coverUrl)).toEqual([
          undefined,
        ]);

        // A stale or invalid answer decides nothing: the plan still waits on the same decision.
        [OTHER_COVER, 'ACKNOWLEDGED', `${COVER}/`].forEach((stale) => {
          const rejected = replanned(decided, { [decision.key]: stale });

          expect(rejected.plan).toBeNull();
          expect(rejected.sidecar.blockers.map(({ detail }) => detail.findingKey)).toEqual([decision.key]);
        });
      },
    );

    it('waits for the publisher where eligible covers of one Work differ, and creates the Work with the one chosen, or none', async () => {
      const twoLinks = collateral().replace(
        `<ResourceLink>${COVER}</ResourceLink>`,
        `<ResourceLink>${COVER}</ResourceLink><ResourceLink>${OTHER_COVER}</ResourceLink>`,
      );
      const differing = await resolve([covered('epub', ISBN_A, twoLinks)], {
        executable: true,
        inputs: { fileWorkType: Monograph },
      });
      const [choice] = differing.result.sidecar.descriptive.findings.filter(
        ({ code }) => code === 'COVER_CHOICE_REQUIRED',
      );

      expect(differing.result.plan).toBeNull();
      expect(differing.result.sidecar.blockers).toEqual([
        expect.objectContaining({
          code: 'DESCRIPTIVE_CHOICE_REQUIRED',
          detail: expect.objectContaining({ findingKey: choice.key }),
        }),
      ]);
      expect(replanned(differing, { [choice.key]: OTHER_COVER }).plan?.works.map(({ coverUrl }) => coverUrl)).toEqual([
        OTHER_COVER,
      ]);
      expect(replanned(differing, { [choice.key]: 'OMIT' }).plan?.works.map(({ coverUrl }) => coverUrl)).toEqual([
        undefined,
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
        salesRights: reduceOnixSalesRights(root, sourcePlan),
        // Every chapter is planned from the canonical component reduction (thoth-app#223), as XMLParse gives it.
        components: reduceOnixComponents(root, sourcePlan),
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
      const { sourcePlan, descriptive, components } = planned([
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
        components,
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
            salesRights: planning.salesRights,
            components: planning.components,
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
          [
            'RIGHTS_ACKNOWLEDGEMENT_REQUIRED',
            'TARGET_UNREPRESENTABLE',
            epubKey,
            groupKey,
            'RIGHTS_LICENCE_UNSUPPORTED',
          ],
          ['RIGHTS_SOURCE_CONFLICT', 'SOURCE_CONFLICT', epubKey, groupKey, 'RIGHTS_TECHNICAL_PROTECTION_CONTRADICTION'],
          [
            'RIGHTS_ACKNOWLEDGEMENT_REQUIRED',
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

    describe('Publication prices and Locations (thoth-app#215)', () => {
      const LANDING = 'https://supplier.example.com/book/a-title';
      const shared = relatedWork(workIdentifier('06', '10.1234/work'));
      const paperbackKey = `product:gtin13:${ISBN_A}`;
      const epubKey = `product:gtin13:${ISBN_B}`;
      const supplyOf = (details: string) =>
        `<ProductSupply><SupplyDetail><Supplier><SupplierRole>01</SupplierRole><SupplierName>Example Supplier</SupplierName>${details}`;
      const priced = (prices: string, websites = '') =>
        `${supplyOf(websites)}</Supplier><ProductAvailability>20</ProductAvailability>${prices}</SupplyDetail></ProductSupply>`;
      const price = (amount: string, currency = 'GBP') =>
        `<Price><PriceType>02</PriceType><PriceAmount>${amount}</PriceAmount><CurrencyCode>${currency}</CurrencyCode></Price>`;
      const website = (role: string, link: string) =>
        `<Website><WebsiteRole>${role}</WebsiteRole><WebsiteLink>${link}</WebsiteLink></Website>`;

      /** A paperback and an e-book of one new Work, adapted as the parser adapts them, with the commercial reduction. */
      const commercialWork = async (
        paperbackSupply: string,
        epubSupply: string,
        publicationOf: typeof getDefaultPublication = getDefaultPublication,
      ) => {
        const root = message([
          product({ ref: 'pb', identifiers: [pid('15', ISBN_A)], related: shared, supply: paperbackSupply }),
          product({
            ref: 'epub',
            identifiers: [pid('15', ISBN_B)],
            descriptive: form('EA', ['E101']),
            related: shared,
            supply: epubSupply,
          }),
        ]);
        const sourcePlan = planOnixSource(root);
        const targets = await resolveOnixTargets(sourcePlan, fakeLookup(), PUBLISHER_ID);
        const [{ groupKey }] = sourcePlan.groups;
        const paperback = publicationOf({ type: Paperback, isbn: ISBN_A });
        const epub = publicationOf({ type: Epub, isbn: ISBN_B });

        return {
          groupKey,
          commercial: reduceOnixCommercial(root, sourcePlan),
          context: {
            sourcePlan,
            targets,
            inputs: { ...EMPTY_ONIX_PLAN_INPUTS, fileWorkType: Monograph },
            imprints: IMPRINTS,
            descriptive: reduceOnixDescriptive(root, sourcePlan),
            rights: reduceOnixRights(root, sourcePlan),
            salesRights: reduceOnixSalesRights(root, sourcePlan),
            serieses: [],
            candidatePlan: { works: [candidate('work-1')], chapters: [], series: [] },
            adaptation: [
              adapted(groupKey, 'work-1', {
                [paperbackKey]: { [Paperback]: { publication: paperback, issues: [] } },
                [epubKey]: { [Epub]: { publication: epub, issues: [] } },
              }),
            ],
          },
        };
      };

      it('creates each Publication with exactly the Prices and canonical Location the commercial reduction takes, never what the candidate held', async () => {
        // A candidate as the legacy adapter built one: a zero-valued price and a territory-derived location.
        const legacyCandidate: typeof getDefaultPublication = (data) =>
          getDefaultPublication({
            ...data,
            prices: [{ id: '0000-0000-0000-0000', currencyCode: CurrencyCode.Gbp, unitPrice: 0 }],
            locations: [
              {
                id: '0000-0000-0000-0000',
                canonical: true,
                landingPage: 'https://legacy.example/x',
                fullTextUrl: '',
                locationPlatform: 'JSTOR' as never,
              },
            ],
          });
        const { context, commercial } = await commercialWork(
          priced(price('20.00') + price('25.00', 'USD'), website('36', LANDING)),
          priced('<UnpricedItemType>01</UnpricedItemType>'),
          legacyCandidate,
        );
        const { plan, sidecar } = resolveOnixImportPlan({ ...context, commercial });

        expect(sidecar.blockers).toEqual([]);
        expect(sidecar.commercial).toBe(commercial);
        // Each Price the plan creates says how it was decided: here, by the approved reduction alone.
        expect(sidecar.priceResolutions).toEqual([
          {
            productKey: paperbackKey,
            findingKey: `COMMERCIAL|PRICE_REDUCED|${paperbackKey}|GBP`,
            currencyCode: 'GBP',
            basis: 'AUTOMATIC',
            unitPrice: 20,
            locations: [located('/ONIXMessage[1]/Product[1]/ProductSupply[1]/SupplyDetail[1]/Price[1]')],
          },
          {
            productKey: paperbackKey,
            findingKey: `COMMERCIAL|PRICE_REDUCED|${paperbackKey}|USD`,
            currencyCode: 'USD',
            basis: 'AUTOMATIC',
            unitPrice: 25,
            locations: [located('/ONIXMessage[1]/Product[1]/ProductSupply[1]/SupplyDetail[1]/Price[2]')],
          },
        ]);
        expect(plan?.works[0].publications.map(({ type, prices, locations }) => ({ type, prices, locations }))).toEqual(
          [
            {
              type: Paperback,
              prices: [
                { id: '0000-0000-0000-0000', currencyCode: 'GBP', unitPrice: 20 },
                { id: '0000-0000-0000-0000', currencyCode: 'USD', unitPrice: 25 },
              ],
              locations: [
                {
                  id: '0000-0000-0000-0000',
                  canonical: true,
                  landingPage: LANDING,
                  fullTextUrl: '',
                  locationPlatform: 'OTHER',
                },
              ],
            },
            // Unpriced, with no website: created with no Price and no Location, never a zero.
            { type: Epub, prices: [], locations: [] },
          ],
        );
      });

      it('keeps every supplier Location in the plan, and creates each Publication with only its canonical one (thoth-app#219 Amendment 1)', async () => {
        const FULL_TEXT = 'https://supplier.example.com/book/a-title.epub';
        const ARCHIVE_LANDING = 'https://archive.example.org/details/a-title';
        const detail = (name: string, websites: string) =>
          `<SupplyDetail><Supplier><SupplierRole>11</SupplierRole><SupplierName>${name}</SupplierName>${websites}</Supplier>` +
          '<ProductAvailability>20</ProductAvailability><UnpricedItemType>01</UnpricedItemType></SupplyDetail>';
        const { context, commercial } = await commercialWork(
          priced('<UnpricedItemType>01</UnpricedItemType>'),
          `<ProductSupply>${detail('THOTH', website('36', LANDING) + website('29', FULL_TEXT))}${detail('INTERNET_ARCHIVE', website('36', ARCHIVE_LANDING))}</ProductSupply>`,
        );
        const { plan, sidecar } = resolveOnixImportPlan({ ...context, commercial });

        expect(sidecar.blockers).toEqual([]);
        expect(
          sidecar.commercial?.products[epubKey].plannedLocations.map(
            ({ landingPage, fullTextUrl, suppliers, carriers }) => [
              landingPage,
              fullTextUrl,
              suppliers.map(({ name }) => name),
              carriers.DIGITAL?.role,
            ],
          ),
        ).toEqual([
          [LANDING, FULL_TEXT, ['THOTH'], 'CANONICAL'],
          [ARCHIVE_LANDING, '', ['INTERNET_ARCHIVE'], 'NON_CANONICAL'],
        ]);
        // Execution is unchanged: the Publication is created with its canonical Location alone (#187 orders the rest).
        expect(plan?.works[0].publications.find(({ type }) => type === Epub)?.locations).toEqual([
          {
            id: '0000-0000-0000-0000',
            canonical: true,
            landingPage: LANDING,
            fullTextUrl: FULL_TEXT,
            locationPlatform: 'OTHER',
          },
        ]);
        expect(sidecar.findings?.find(({ code }) => code === 'LOCATION_NOT_CANONICAL')).toMatchObject({
          classification: 'EXECUTION_DEFERRED',
          blocking: false,
        });
      });

      it('holds a Publication back for every commercial finding that blocks it, once each, and discloses the rest', async () => {
        const { context, commercial, groupKey } = await commercialWork(
          priced(price('20.00') + price('22.00')),
          priced(
            price('abc') +
              '<Price><PriceType>02</PriceType><UnpricedItemType>02</UnpricedItemType><CurrencyCode>USD</CurrencyCode></Price>',
          ),
        );
        const { plan, sidecar } = resolveOnixImportPlan({ ...context, commercial });
        const blocking = commercial.findings.filter(({ blocking: blocks }) => blocks);

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
          ['COMMERCIAL_CHOICE_REQUIRED', 'TARGET_UNREPRESENTABLE', paperbackKey, groupKey, 'PRICE_AMOUNT_CONFLICT'],
          ['COMMERCIAL_PREFLIGHT_GAP', 'PREFLIGHT_GAP', epubKey, groupKey, 'PRICE_AMOUNT_UNUSABLE'],
        ]);
        expect(sidecar.blockers.map(({ detail }) => detail.findingKey)).toEqual(blocking.map(({ key }) => key));
        expect(sidecar.blockers.map(({ paths }) => paths)).toEqual(
          blocking.map(({ locations }) => locations.map(({ path }) => path)),
        );
        // The unpriced reason and every other disclosure stay in the plan, blocking nothing.
        expect(sidecar.commercial?.findings.filter(({ blocking: blocks }) => !blocks).map(({ code }) => code)).toEqual(
          expect.arrayContaining(['PRICE_UNPRICED', 'SUPPLY_NOT_REPRESENTED']),
        );
      });

      it('waits for the publisher on a price only they may take, and creates exactly the amount they choose, or no Price at all', async () => {
        const PRICE = '/ONIXMessage[1]/Product[1]/ProductSupply[1]/SupplyDetail[1]/Price[1]';
        const consumerPrice =
          '<Price><PriceType>02</PriceType><PriceQualifier>05</PriceQualifier><PriceStatus>00</PriceStatus>' +
          '<PriceAmount>24.99</PriceAmount><CurrencyCode>GBP</CurrencyCode></Price>';
        const { context, commercial, groupKey } = await commercialWork(
          priced(consumerPrice),
          priced('<UnpricedItemType>01</UnpricedItemType>'),
        );
        const [decision] = commercial.findings.filter(({ code }) => code === 'PRICE_NOT_AUTOMATIC');
        const resolveWith = (commercialChoices?: Record<string, string>) =>
          resolveOnixImportPlan({
            ...context,
            inputs: { ...context.inputs, ...(commercialChoices === undefined ? {} : { commercialChoices }) },
            commercial,
          });
        const pricesOf = ({ plan }: ReturnType<typeof resolveWith>) =>
          plan?.works[0].publications.map(({ type, prices }) => [
            type,
            prices.map(({ currencyCode, unitPrice }) => [currencyCode, unitPrice]),
          ]) ?? null;

        // Unanswered, nothing is taken or dropped for the publisher: the plan waits on their decision.
        const unanswered = resolveWith();

        expect(pricesOf(unanswered)).toBeNull();
        expect(unanswered.sidecar.blockers).toEqual([
          {
            code: 'COMMERCIAL_CHOICE_REQUIRED',
            classification: 'TARGET_INPUT_REQUIRED',
            recordKey: 'record:1',
            productKey: paperbackKey,
            groupKey,
            paths: [PRICE],
            detail: { findingKey: decision.key, finding: 'PRICE_NOT_AUTOMATIC' },
          },
        ]);
        expect(unanswered.sidecar.priceResolutions).toEqual([]);
        // An answer the decision does not offer answers nothing, and says so: the plan waits until it is corrected.
        const stale = resolveWith({
          [decision.key]: '/ONIXMessage[1]/Product[2]/ProductSupply[1]/SupplyDetail[1]/Price[1]',
        });

        expect(stale.plan).toBeNull();
        expect(
          stale.sidecar.blockers.map(({ code, productKey, detail }) => [code, productKey, detail.findingKey]),
        ).toEqual([['COMMERCIAL_CHOICE_STALE', paperbackKey, decision.key]]);

        // Chosen: exactly that amount, bound into the plan, its inputs and its record of how the Price was decided.
        const chosen = resolveWith({ [decision.key]: PRICE });

        expect(chosen.sidecar.blockers).toEqual([]);
        expect(pricesOf(chosen)).toEqual([
          [Paperback, [['GBP', 24.99]]],
          [Epub, []],
        ]);
        expect(chosen.sidecar.inputs.commercialChoices).toEqual({ [decision.key]: PRICE });
        expect(chosen.sidecar.priceResolutions).toEqual([
          {
            productKey: paperbackKey,
            findingKey: decision.key,
            currencyCode: 'GBP',
            basis: 'PUBLISHER_CHOICE',
            unitPrice: 24.99,
            locations: [located(PRICE)],
          },
        ]);

        // Declined: no Price, and the omission recorded as the publisher's.
        const declined = resolveWith({ [decision.key]: ONIX_PRICE_OMIT });

        expect(declined.sidecar.blockers).toEqual([]);
        expect(pricesOf(declined)).toEqual([
          [Paperback, []],
          [Epub, []],
        ]);
        expect(declined.sidecar.priceResolutions).toEqual([
          {
            productKey: paperbackKey,
            findingKey: decision.key,
            currencyCode: 'GBP',
            basis: 'PUBLISHER_OMISSION',
            unitPrice: null,
            locations: [located(PRICE)],
          },
        ]);
      });

      it('lets the publisher settle a same-currency conflict with one amount the file states, and nothing else', async () => {
        const PRICES = '/ONIXMessage[1]/Product[1]/ProductSupply[1]/SupplyDetail[1]';
        const { context, commercial } = await commercialWork(priced(price('20.00') + price('22.00')), '');
        const [conflict] = commercial.findings.filter(({ code }) => code === 'PRICE_AMOUNT_CONFLICT');
        const { plan, sidecar } = resolveOnixImportPlan({
          ...context,
          inputs: { ...context.inputs, commercialChoices: { [conflict.key]: `${PRICES}/Price[2]` } },
          commercial,
        });

        expect(sidecar.blockers).toEqual([]);
        expect(plan?.works[0].publications.map(({ prices }) => prices.map(({ unitPrice }) => unitPrice))).toEqual([
          [22],
          [],
        ]);
        expect(sidecar.priceResolutions).toEqual([
          expect.objectContaining({
            basis: 'PUBLISHER_CHOICE',
            unitPrice: 22,
            locations: [located(`${PRICES}/Price[2]`)],
          }),
        ]);
      });

      describe('an automatic price with optional alternatives (Specification Amendment 2B)', () => {
        const PRICES = '/ONIXMessage[1]/Product[1]/ProductSupply[1]/SupplyDetail[1]';
        const qualified = (amount: string, qualifier = '10') =>
          `<Price><PriceType>02</PriceType><PriceQualifier>${qualifier}</PriceQualifier><PriceAmount>${amount}</PriceAmount><CurrencyCode>GBP</CurrencyCode></Price>`;

        /** A paperback priced GBP 20 as an ordinary retail price and GBP 60 as a qualified one, and its unpriced e-book. */
        const mixedWork = async (paperbackPrices = price('20.00') + qualified('60.00')) => {
          const { context, commercial, groupKey } = await commercialWork(
            priced(paperbackPrices),
            priced('<UnpricedItemType>01</UnpricedItemType>'),
          );
          const resolveWith = (commercialChoices?: Record<string, string>) =>
            resolveOnixImportPlan({
              ...context,
              inputs: { ...context.inputs, ...(commercialChoices === undefined ? {} : { commercialChoices }) },
              commercial,
            });

          return { commercial, groupKey, resolveWith };
        };
        const pricesOf = ({ plan }: ReturnType<typeof resolveOnixImportPlan>) =>
          plan?.works[0].publications.map(({ type, prices }) => [
            type,
            prices.map(({ currencyCode, unitPrice }) => [currencyCode, unitPrice]),
          ]) ?? null;
        const resolutionsOf = ({ sidecar }: ReturnType<typeof resolveOnixImportPlan>) =>
          sidecar.priceResolutions?.map(({ basis, currencyCode, unitPrice, locations }) => [
            basis,
            currencyCode,
            unitPrice,
            locations.map(({ path }) => path),
          ]);

        it('plans the automatic price unanswered, exactly the alternative chosen or no Price, and the automatic price again once the answer is cleared', async () => {
          const { commercial, resolveWith } = await mixedWork();
          const [automatic] = commercial.findings.filter(({ code }) => code === 'PRICE_REDUCED');

          // The alternatives are offered, beside the automatic default, and nothing waits on them.
          expect(automatic.resolution).toMatchObject({
            kind: 'PRICE_OVERRIDE',
            currencyCode: 'GBP',
            defaultUnitPrice: 20,
            candidates: [{ key: `${PRICES}/Price[2]`, unitPrice: 60, exclusions: ['QUALIFIED'] }],
          });

          const unanswered = resolveWith();

          expect(unanswered.sidecar.blockers).toEqual([]);
          expect(pricesOf(unanswered)).toEqual([
            [Paperback, [['GBP', 20]]],
            [Epub, []],
          ]);
          expect(resolutionsOf(unanswered)).toEqual([['AUTOMATIC', 'GBP', 20, [`${PRICES}/Price[1]`]]]);

          // Chosen: exactly that source amount, with the source price it came from and what it leaves unrecorded.
          const chosen = resolveWith({ [automatic.key]: `${PRICES}/Price[2]` });

          expect(chosen.sidecar.blockers).toEqual([]);
          expect(pricesOf(chosen)).toEqual([
            [Paperback, [['GBP', 60]]],
            [Epub, []],
          ]);
          expect(resolutionsOf(chosen)).toEqual([['PUBLISHER_CHOICE', 'GBP', 60, [`${PRICES}/Price[2]`]]]);
          expect(
            chosen.sidecar.commercial?.findings.find(({ key }) => key === automatic.key)?.resolution,
          ).toMatchObject({
            candidates: [
              {
                lostFacts: expect.arrayContaining(['ProductSupply[1]/SupplyDetail[1]/Price[2]/PriceQualifier[1]: 10']),
              },
            ],
          });

          // Declined: no GBP Price at all.
          const declined = resolveWith({ [automatic.key]: ONIX_PRICE_OMIT });

          expect(declined.sidecar.blockers).toEqual([]);
          expect(pricesOf(declined)).toEqual([
            [Paperback, []],
            [Epub, []],
          ]);
          expect(resolutionsOf(declined)).toEqual([
            ['PUBLISHER_OMISSION', 'GBP', null, [`${PRICES}/Price[1]`, `${PRICES}/Price[2]`]],
          ]);

          // Cleared: the automatic default again.
          const cleared = resolveWith({});

          expect(pricesOf(cleared)).toEqual(pricesOf(unanswered));
          expect(resolutionsOf(cleared)).toEqual([['AUTOMATIC', 'GBP', 20, [`${PRICES}/Price[1]`]]]);
        });

        it('fails closed on an answer the file does not offer, never falling back to the automatic price', async () => {
          const { commercial, groupKey, resolveWith } = await mixedWork();
          const [automatic] = commercial.findings.filter(({ code }) => code === 'PRICE_REDUCED');
          const stale = resolveWith({ [automatic.key]: `${PRICES}/Price[9]` });

          expect(stale.plan).toBeNull();
          expect(stale.sidecar.blockers).toEqual([
            {
              code: 'COMMERCIAL_CHOICE_STALE',
              classification: 'TARGET_INPUT_REQUIRED',
              recordKey: 'record:1',
              productKey: paperbackKey,
              groupKey,
              paths: [`${PRICES}/Price[1]`, `${PRICES}/Price[2]`],
              detail: { findingKey: automatic.key, finding: 'PRICE_REDUCED', answer: `${PRICES}/Price[9]` },
            },
          ]);
          // Nothing is recorded as decided for that Price: no automatic amount stands in for the answer.
          expect(stale.sidecar.priceResolutions).toEqual([]);

          // An answer to a decision this file does not have is no answer either.
          const unknownKey = `COMMERCIAL|PRICE_REDUCED|${paperbackKey}|EUR`;
          const unknown = resolveWith({ [unknownKey]: ONIX_PRICE_OMIT });

          expect(unknown.plan).toBeNull();
          expect(unknown.sidecar.blockers).toEqual([
            {
              code: 'COMMERCIAL_CHOICE_STALE',
              classification: 'TARGET_INPUT_REQUIRED',
              recordKey: null,
              productKey: null,
              groupKey: null,
              paths: [],
              detail: { findingKey: unknownKey, answer: ONIX_PRICE_OMIT },
            },
          ]);
        });

        it('fails closed on a price answer given where no commercial reduction offers any', async () => {
          const { context } = await commercialWork('', '');
          const answerKey = `COMMERCIAL|PRICE_REDUCED|${paperbackKey}|GBP`;
          const answered = resolveOnixImportPlan({
            ...context,
            inputs: { ...context.inputs, commercialChoices: { [answerKey]: ONIX_PRICE_OMIT } },
          });

          // Unanswered, a file stating no ProductSupply plans without the reduction; an answer nothing offers still holds it.
          expect(resolveOnixImportPlan(context).plan).not.toBeNull();
          expect(answered.plan).toBeNull();
          expect(answered.sidecar.blockers).toEqual([
            {
              code: 'COMMERCIAL_CHOICE_STALE',
              classification: 'TARGET_INPUT_REQUIRED',
              recordKey: null,
              productKey: null,
              groupKey: null,
              paths: [],
              detail: { findingKey: answerKey, answer: ONIX_PRICE_OMIT },
            },
          ]);
          // Without a reduction, no Price is decided at all.
          expect(answered.sidecar.priceResolutions).toBeUndefined();
        });

        it('keeps the blocker of a finding nothing answers whatever answer it is given, beside the stale answer itself', async () => {
          const { commercial, resolveWith } = await mixedWork(price('abc'));
          const [unusable] = commercial.findings.filter(({ code }) => code === 'PRICE_AMOUNT_UNUSABLE');
          const answered = resolveWith({ [unusable.key]: ONIX_PRICE_OMIT });

          expect(answered.plan).toBeNull();
          expect(answered.sidecar.blockers.map(({ code, detail }) => [code, detail.finding])).toEqual([
            ['COMMERCIAL_PREFLIGHT_GAP', 'PRICE_AMOUNT_UNUSABLE'],
            ['COMMERCIAL_CHOICE_STALE', 'PRICE_AMOUNT_UNUSABLE'],
          ]);
        });

        it('still takes no automatic winner between different retail amounts, offering the qualified price too, until the publisher answers', async () => {
          const { commercial, resolveWith } = await mixedWork(price('20.00') + price('22.00') + qualified('60.00'));
          const [conflict] = commercial.findings.filter(({ code }) => code === 'PRICE_AMOUNT_CONFLICT');
          const unanswered = resolveWith();

          expect(pricesOf(unanswered)).toBeNull();
          expect(unanswered.sidecar.blockers.map(({ code, detail }) => [code, detail.finding])).toEqual([
            ['COMMERCIAL_CHOICE_REQUIRED', 'PRICE_AMOUNT_CONFLICT'],
          ]);
          expect(
            conflict.resolution.kind === 'PRICE_CHOICE'
              ? conflict.resolution.candidates.map(({ unitPrice }) => unitPrice)
              : [],
          ).toEqual([20, 22, 60]);
          expect(pricesOf(resolveWith({ [conflict.key]: `${PRICES}/Price[3]` }))).toEqual([
            [Paperback, [['GBP', 60]]],
            [Epub, []],
          ]);
        });
      });

      it('holds back nothing for the commercial findings of a Publication the publisher leaves out, and only its own carrier', async () => {
        const conflicting = priced(price('20.00') + price('22.00'));
        const root = message([
          product({ ref: 'binding', identifiers: [pid('15', ISBN_A)], descriptive: form('BA'), supply: conflicting }),
          product({
            ref: 'digital',
            identifiers: [pid('15', ISBN_B)],
            descriptive: form('EA', ['E101']),
            supply: priced(
              '<UnpricedItemType>02</UnpricedItemType>',
              website('36', LANDING) + website('36', `${LANDING}/2`),
            ),
          }),
        ]);
        const sourcePlan = planOnixSource(root);
        const targets = await resolveOnixTargets(sourcePlan, fakeLookup(), PUBLISHER_ID);
        const commercial = reduceOnixCommercial(root, sourcePlan);
        const resolveWith = (inputs: Partial<OnixPlanInputs>) =>
          resolveOnixImportPlan({
            sourcePlan,
            targets,
            inputs: { ...EMPTY_ONIX_PLAN_INPUTS, fileWorkType: Monograph, ...inputs },
            imprints: IMPRINTS,
            descriptive: reduceOnixDescriptive(root, sourcePlan),
            rights: reduceOnixRights(root, sourcePlan),
            salesRights: reduceOnixSalesRights(root, sourcePlan),
            commercial,
            serieses: [],
          });
        const commercialCodes = (inputs: Partial<OnixPlanInputs>) =>
          resolveWith(inputs)
            .sidecar.blockers.filter(({ code }) => code.startsWith('COMMERCIAL_'))
            .map(({ productKey, detail }) => [productKey, detail.finding]);

        // Undecided, the binding still becomes a Publication of one physical carrier or another: its conflict blocks.
        expect(commercialCodes({})).toEqual([
          [paperbackKey, 'PRICE_AMOUNT_CONFLICT'],
          [epubKey, 'LOCATION_PAIRING_AMBIGUOUS'],
        ]);
        // Left out, it is no Publication at all, and nothing about its prices holds the import back.
        expect(commercialCodes({ manifestationChoices: { [paperbackKey]: 'OMIT' } })).toEqual([
          [epubKey, 'LOCATION_PAIRING_AMBIGUOUS'],
        ]);
      });

      it('fails closed without a commercial reduction wherever the file states ProductSupply, and plans as before where it states none', async () => {
        const supplied = await commercialWork(priced(price('20.00')), '');
        const unsupplied = await commercialWork('', '');
        const unreduced = resolveOnixImportPlan(supplied.context);
        const unstated = resolveOnixImportPlan(unsupplied.context);

        expect(unreduced.plan).toBeNull();
        expect(unreduced.sidecar.blockers).toEqual([
          {
            code: 'COMMERCIAL_PREFLIGHT_GAP',
            classification: 'PREFLIGHT_GAP',
            recordKey: 'record:1',
            productKey: paperbackKey,
            groupKey: supplied.groupKey,
            paths: ['/ONIXMessage[1]/Product[1]/ProductSupply[1]'],
            detail: { reason: 'COMMERCIAL_NOT_REDUCED' },
          },
        ]);
        expect(unreduced.sidecar.commercial).toBeUndefined();
        expect(unstated.sidecar.blockers).toEqual([]);
        expect(unstated.plan?.works[0].publications.map(({ prices, locations }) => [prices, locations])).toEqual([
          [[], []],
          [[], []],
        ]);
      });

      it('warns, for each planned digital Publication only, that the half of a supplier location it was given is not imported', async () => {
        const halfOnly = priced('<UnpricedItemType>02</UnpricedItemType>', website('36', LANDING));
        const { context, commercial } = await commercialWork(halfOnly, halfOnly);
        const { plan, sidecar, warnings } = resolveOnixImportPlan({ ...context, commercial });

        expect(sidecar.blockers).toEqual([]);
        // The paperback's one URL is a complete canonical Location; the e-book's is half of one.
        expect(plan?.works[0].publications.map(({ type, locations }) => [type, locations.length])).toEqual([
          [Paperback, 1],
          [Epub, 0],
        ]);
        expect(warnings.filter(({ code }) => code === 'onix.location.unrepresentable_canonical')).toEqual([
          {
            severity: 'warning',
            code: 'onix.location.unrepresentable_canonical',
            message: expect.stringContaining('no full text URL was supplied'),
            source: { kind: 'onix', productIndex: 2, recordReference: 'epub' },
          },
        ]);
      });
    });

    it("gives a new Work's chapters the edition the publisher entered for that Work", async () => {
      const { sourcePlan, descriptive, components } = planned([
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
        components,
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

    describe('components and contained Works (thoth-app#223)', () => {
      const componentItem = ({
        lsn,
        type = '03',
        av,
        text = 'A Component',
        inner = '',
      }: {
        lsn?: string;
        type?: string;
        av?: string;
        text?: string;
        inner?: string;
      }) =>
        `<ContentItem>${lsn === undefined ? '' : `<LevelSequenceNumber>${lsn}</LevelSequenceNumber>`}` +
        (av === undefined
          ? `<TextItem><TextItemType>${type}</TextItemType>${inner}</TextItem>`
          : `<AVItem><AVItemType>${av}</AVItemType></AVItem>`) +
        `<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>04</TitleElementLevel><TitleText language="eng">${text}</TitleText></TitleElement></TitleDetail></ContentItem>`;
      const itemPath = (position: number) => `/ONIXMessage[1]/Product[1]/ContentDetail[1]/ContentItem[${position}]`;
      const PAPERBACK_KEY = `product:gtin13:${ISBN_A}`;

      /** One new paperback Work stating these ContentItems, adapted with a candidate chapter Work for each chapter. */
      const componentWork = async (
        items: string[],
        {
          inputs = {},
          publishing = '',
          withComponents = true,
          adaptedComponents = false,
          candidateChapter = (id: string) => ({ ...candidate(id, { type: BookChapter }), relationId: 'work-1' }),
        }: {
          inputs?: Partial<OnixPlanInputs>;
          publishing?: string;
          withComponents?: boolean;
          adaptedComponents?: boolean;
          candidateChapter?: (id: string) => WorkEntity;
        } = {},
      ) => {
        const planning = planned([
          product({ ref: 'pb', identifiers: [pid('15', ISBN_A)], content: items.join(''), publishing }),
        ]);
        const targets = await resolveOnixTargets(planning.sourcePlan, fakeLookup(), PUBLISHER_ID);
        const [{ groupKey }] = planning.sourcePlan.groups;
        const chapterPaths = planning.sourcePlan.products[0].contentItems
          .filter(({ kind }) => kind === 'CHAPTER')
          .map(({ path }) => path);
        const chapterIds = chapterPaths.map((_path, index) => `chapter-${index + 1}`);
        const paperback = getDefaultPublication({ type: Paperback, isbn: ISBN_A });

        return {
          ...planning,
          groupKey,
          chapterPaths,
          resolved: resolveOnixImportPlan({
            sourcePlan: planning.sourcePlan,
            targets,
            inputs: { ...EMPTY_ONIX_PLAN_INPUTS, fileWorkType: Monograph, ...inputs },
            imprints: IMPRINTS,
            descriptive: planning.descriptive,
            ...(withComponents ? { components: planning.components } : {}),
            serieses: [],
            candidatePlan: {
              works: [candidate('work-1')],
              chapters: chapterIds.map(candidateChapter),
              series: [],
            },
            adaptation: [
              {
                ...adapted(
                  groupKey,
                  'work-1',
                  { [PAPERBACK_KEY]: { [Paperback]: { publication: paperback, issues: [] } } },
                  [],
                  {
                    ...NO_LOOKUPS,
                    chapterWorkIds: Object.fromEntries(chapterPaths.map((path, index) => [path, chapterIds[index]])),
                  },
                ),
                ...(adaptedComponents ? { components: planning.components } : {}),
              },
            ],
          }),
        };
      };
      const componentFinding = (
        sidecar: { readonly findings?: readonly OnixPlanFinding[] },
        code: string,
        position?: number,
      ) =>
        (sidecar.findings ?? []).find(
          (finding) =>
            finding.family === 'COMPONENT' &&
            finding.code === code &&
            (position === undefined || finding.locations.some(({ path }) => path.startsWith(itemPath(position)))),
        ) as OnixPlanFinding;

      it('plans chapters at the positions their LevelSequenceNumbers state, with the canonical pages, page count and DOI, whatever the candidates held', async () => {
        const junk = (id: string) => ({
          ...candidate(id, { type: BookChapter }),
          relationId: 'work-1',
          doi: 'https://doi.org/10.9999/legacy',
          pageCount: 999,
          firstPage: 'legacy',
          lastPage: 'legacy',
        });
        const { resolved } = await componentWork(
          [
            componentItem({
              lsn: '2',
              text: 'Second',
              inner:
                '<TextItemIdentifier><TextItemIDType>06</TextItemIDType><IDValue>10.1234/second</IDValue></TextItemIdentifier><PageRun><FirstPageNumber>21</FirstPageNumber><LastPageNumber>40</LastPageNumber></PageRun><NumberOfPages>20</NumberOfPages>',
            }),
            componentItem({ lsn: '1', type: '02', text: 'First' }),
            componentItem({ lsn: '3', type: '04', text: 'Third', inner: '<NumberOfPages>7</NumberOfPages>' }),
          ],
          { candidateChapter: junk },
        );

        expect(resolved.sidecar.blockers).toEqual([]);
        expect(
          resolved.plan?.chapters.map(({ id, relationId, imprintId, doi, pageCount, firstPage, lastPage, titles }) => [
            id,
            relationId,
            imprintId,
            doi,
            pageCount,
            firstPage,
            lastPage,
            titles.map(({ title }) => title),
          ]),
        ).toEqual([
          ['chapter-2', 'work-1', IMPRINT_ID, '', 0, '', '', ['First']],
          ['chapter-1', 'work-1', IMPRINT_ID, 'https://doi.org/10.1234/second', 20, '21', '40', ['Second']],
          ['chapter-3', 'work-1', IMPRINT_ID, '', 7, '', '', ['Third']],
        ]);
        expect(resolved.sidecar.componentIntents?.map((intent) => [intent.kind, intent.action])).toEqual([
          ['BOOK_CHAPTER', 'CREATE_CHAPTER'],
          ['BOOK_CHAPTER', 'CREATE_CHAPTER'],
          ['BOOK_CHAPTER', 'CREATE_CHAPTER'],
        ]);
        // The front, body and back matter each chapter was stated as is disclosed, not recorded, and holds nothing.
        expect(
          (resolved.sidecar.findings ?? [])
            .filter(({ code }) => code === 'COMPONENT_MATTER_NOT_REPRESENTED')
            .map(({ detail, blocking }) => [detail.matter, blocking]),
        ).toEqual([
          ['BODY', false],
          ['FRONT', false],
          ['BACK', false],
        ]);
      });

      it('never takes a chapter position from the file order: it waits for the one the publisher enters', async () => {
        const missing = await componentWork([componentItem({ text: 'Unnumbered' })]);
        const question = componentFinding(missing.resolved.sidecar, 'COMPONENT_ORDINAL_REQUIRED');

        expect(missing.resolved.plan).toBeNull();
        expect(missing.resolved.sidecar.blockers).toEqual([
          expect.objectContaining({
            code: 'COMPONENT_INPUT_REQUIRED',
            classification: 'TARGET_INPUT_REQUIRED',
            paths: [itemPath(1)],
            detail: {
              findingKey: question.key,
              finding: 'COMPONENT_ORDINAL_REQUIRED',
              componentKey: `${PAPERBACK_KEY}|${itemPath(1)}`,
            },
          }),
        ]);
        expect(question.answer).toEqual({ state: 'UNANSWERED' });

        const answered = await componentWork([componentItem({ text: 'Unnumbered' })], {
          inputs: { componentChoices: { [question.key]: '1' } },
        });

        expect(answered.resolved.sidecar.blockers).toEqual([]);
        expect(answered.resolved.plan?.chapters.map(({ id }) => id)).toEqual(['chapter-1']);
        expect(componentFinding(answered.resolved.sidecar, 'COMPONENT_ORDINAL_REQUIRED').answer).toEqual({
          state: 'ANSWERED',
          value: '1',
        });
      });

      it('holds chapter positions the current executor cannot create exactly, and plans them as stated', async () => {
        const { resolved } = await componentWork([componentItem({ lsn: '1' }), componentItem({ lsn: '3' })]);

        expect(resolved.plan).toBeNull();
        expect(resolved.sidecar.blockers).toEqual([
          expect.objectContaining({
            code: 'COMPONENT_EXECUTION_DEFERRED',
            classification: 'EXECUTION_DEFERRED',
            detail: expect.objectContaining({ finding: 'CHAPTER_ORDINAL_EXECUTION_DEFERRED' }),
          }),
        ]);
        expect(
          resolved.sidecar.componentIntents?.map((intent) =>
            intent.kind === 'BOOK_CHAPTER' && intent.ordinal.status === 'RESOLVED' ? intent.ordinal.ordinal : null,
          ),
        ).toEqual([1, 3]);
      });

      it('never creates a contained Work: it plans the whole intent - never with the file WorkType or the parent lifecycle - and holds the import', async () => {
        const items = [componentItem({ lsn: '1', type: '01', text: 'An Embedded Novel' })];
        const parentActive =
          '<PublishingStatus>04</PublishingStatus><PublishingDate><PublishingDateRole>01</PublishingDateRole><Date>20240101</Date></PublishingDate>';
        const unanswered = await componentWork(items, { publishing: parentActive });
        const typeQuestion = componentFinding(unanswered.resolved.sidecar, 'CONTAINED_WORK_TYPE_REQUIRED');
        const statusQuestion = componentFinding(unanswered.resolved.sidecar, 'CONTAINED_WORK_STATUS_REQUIRED');
        const deferred = componentFinding(unanswered.resolved.sidecar, 'CONTAINED_WORK_EXECUTION_DEFERRED');

        expect(unanswered.resolved.plan).toBeNull();
        expect(unanswered.resolved.sidecar.blockers.map(({ code, detail }) => [code, detail.finding])).toEqual([
          ['COMPONENT_CHOICE_REQUIRED', 'CONTAINED_WORK_TYPE_REQUIRED'],
          ['COMPONENT_CHOICE_REQUIRED', 'CONTAINED_WORK_STATUS_REQUIRED'],
          ['COMPONENT_EXECUTION_DEFERRED', 'CONTAINED_WORK_EXECUTION_DEFERRED'],
        ]);
        // The parent Work is planned as usual, with the file's WorkType and its own lifecycle.
        expect(unanswered.resolved.sidecar.workGroups[0].workType).toEqual({
          status: 'RESOLVED',
          type: Monograph,
          provenance: 'USER_FILE_DEFAULT',
        });
        expect(unanswered.resolved.sidecar.componentIntents).toEqual([
          expect.objectContaining({
            kind: 'CONTAINED_WORK',
            relation: 'IS_PART_OF',
            parent: { groupKey: unanswered.groupKey, plannedWorkId: 'work-1' },
            workType: { status: 'UNRESOLVED', findingKey: typeQuestion.key },
            imprint: expect.objectContaining({
              status: 'RESOLVED',
              imprintId: IMPRINT_ID,
              basis: 'INHERITED_FROM_PARENT',
            }),
            edition: expect.objectContaining({ edition: 1, basis: 'FIRST_EDITION_NORMALISED' }),
            lifecycle: expect.objectContaining({ status: null, publicationDate: null, withdrawnDate: null }),
            ordinal: expect.objectContaining({ status: 'RESOLVED', ordinal: 1, basis: 'LEVEL_SEQUENCE_NUMBER' }),
            descriptive: expect.objectContaining({
              titles: [expect.objectContaining({ title: 'An Embedded Novel' })],
            }),
            action: 'EXECUTION_DEFERRED',
          }),
        ]);

        const answered = await componentWork(items, {
          publishing: parentActive,
          inputs: { componentChoices: { [typeQuestion.key]: Textbook, [statusQuestion.key]: 'FORTHCOMING' } },
        });

        expect(answered.resolved.plan).toBeNull();
        expect(answered.resolved.sidecar.blockers.map(({ detail }) => detail.findingKey)).toEqual([deferred.key]);
        expect(answered.resolved.sidecar.componentIntents).toEqual([
          expect.objectContaining({
            workType: {
              status: 'RESOLVED',
              type: Textbook,
              provenance: 'USER_COMPONENT_CHOICE',
              findingKey: typeQuestion.key,
            },
            lifecycle: expect.objectContaining({ status: 'FORTHCOMING' }),
            action: 'EXECUTION_DEFERRED',
          }),
        ]);
      });

      it('plans the rest of the Work once an audiovisual item is acknowledged as not imported', async () => {
        const items = [componentItem({ lsn: '1' }), componentItem({ lsn: '2', av: '01', text: 'A Film' })];
        const unanswered = await componentWork(items);
        const loss = componentFinding(unanswered.resolved.sidecar, 'COMPONENT_AV_ITEM_UNREPRESENTABLE');

        expect(unanswered.resolved.plan).toBeNull();
        expect(unanswered.resolved.sidecar.blockers).toEqual([
          expect.objectContaining({
            code: 'COMPONENT_ACKNOWLEDGEMENT_REQUIRED',
            classification: 'TARGET_UNREPRESENTABLE',
            detail: expect.objectContaining({ findingKey: loss.key }),
          }),
        ]);

        const acknowledged = await componentWork(items, {
          inputs: { componentChoices: { [loss.key]: ONIX_COMPONENT_ACKNOWLEDGED } },
        });

        expect(acknowledged.resolved.sidecar.blockers).toEqual([]);
        expect(acknowledged.resolved.plan?.works.map(({ id }) => id)).toEqual(['work-1']);
        expect(acknowledged.resolved.plan?.chapters.map(({ id }) => id)).toEqual(['chapter-1']);
        expect(acknowledged.resolved.sidecar.componentIntents?.map(({ kind, action }) => [kind, action])).toEqual([
          ['BOOK_CHAPTER', 'CREATE_CHAPTER'],
          ['AV_ITEM', 'OMIT_WITH_ACKNOWLEDGED_LOSS'],
        ]);
        expect(componentFinding(acknowledged.resolved.sidecar, 'COMPONENT_AV_ITEM_UNREPRESENTABLE').answer).toEqual({
          state: 'ANSWERED',
          value: ONIX_COMPONENT_ACKNOWLEDGED,
        });
      });

      it('holds every component answer the plan does not offer as stale: never applied, never replaced by a default', async () => {
        const items = [componentItem({ lsn: '1', type: '01' })];
        const first = await componentWork(items);
        const typeQuestion = componentFinding(first.resolved.sidecar, 'CONTAINED_WORK_TYPE_REQUIRED');
        const statusQuestion = componentFinding(first.resolved.sidecar, 'CONTAINED_WORK_STATUS_REQUIRED');
        const withdrawalKey = `${statusQuestion.key.replace('CONTAINED_WORK_STATUS_REQUIRED', 'CONTAINED_WORK_DATE_REQUIRED')}|WITHDRAWAL`;
        const { resolved } = await componentWork(items, {
          inputs: {
            componentChoices: {
              // A chapter type is never offered for a contained Work.
              [typeQuestion.key]: BookChapter,
              [statusQuestion.key]: 'ACTIVE',
              // An Active Work may not hold a withdrawal date: no such question is asked, so the answer is stale.
              [withdrawalKey]: '2024-01-01',
              'COMPONENT|CONTAINED_WORK_TYPE_REQUIRED|elsewhere': Monograph,
            },
          },
        });
        const stale = resolved.sidecar.blockers.filter(({ code }) => code === 'COMPONENT_CHOICE_STALE');

        expect(stale.map(({ detail }) => [detail.findingKey, detail.answer])).toEqual([
          [typeQuestion.key, BookChapter],
          [withdrawalKey, '2024-01-01'],
          ['COMPONENT|CONTAINED_WORK_TYPE_REQUIRED|elsewhere', Monograph],
        ]);
        expect(resolved.sidecar.componentIntents).toEqual([
          expect.objectContaining({
            workType: { status: 'UNRESOLVED', findingKey: typeQuestion.key },
            lifecycle: expect.objectContaining({ status: 'ACTIVE', withdrawnDate: null }),
          }),
        ]);
        expect(componentFinding(resolved.sidecar, 'CONTAINED_WORK_TYPE_REQUIRED').answer).toEqual({
          state: 'REJECTED',
          value: BookChapter,
        });
      });

      it('never answers a changed component with the answers given for the fact it was', async () => {
        const before = await componentWork([componentItem({ type: '01', text: 'Before' })]);
        const answers = Object.fromEntries(
          (before.resolved.sidecar.findings ?? [])
            .filter(({ family, resolution }) => family === 'COMPONENT' && resolution.kind !== 'NONE')
            .map(({ key, resolution }) => [key, resolution.kind === 'CHOICE' ? resolution.options[0].key : '1']),
        );
        const after = await componentWork([componentItem({ type: '01', text: 'After' })], {
          inputs: { componentChoices: answers },
        });

        expect(Object.keys(answers)).toHaveLength(3);
        expect(after.resolved.sidecar.blockers.filter(({ code }) => code === 'COMPONENT_CHOICE_STALE')).toHaveLength(3);
        expect(after.resolved.sidecar.componentIntents).toEqual([
          expect.objectContaining({
            workType: expect.objectContaining({ status: 'UNRESOLVED' }),
            lifecycle: expect.objectContaining({ status: null }),
            ordinal: { status: 'UNRESOLVED' },
          }),
        ]);
      });

      it("fails closed on every ContentItem without a component reduction, and plans a chapter only from the adapter's own", async () => {
        const items = [componentItem({ lsn: '1' }), componentItem({ lsn: '2', type: '01' })];
        const none = await componentWork(items, { withComponents: false });

        expect(none.resolved.plan).toBeNull();
        expect(none.resolved.sidecar.blockers).toEqual([
          expect.objectContaining({
            code: 'COMPONENT_UNSUPPORTED',
            classification: 'PREFLIGHT_GAP',
            detail: { kind: 'CHAPTER' },
          }),
          expect.objectContaining({
            code: 'COMPONENT_UNSUPPORTED',
            classification: 'PREFLIGHT_GAP',
            detail: { kind: 'EMBEDDED_WORK' },
          }),
        ]);
        expect(none.resolved.sidecar.componentIntents).toBeUndefined();
        expect(none.resolved.sidecar.components).toBeUndefined();

        const adapterOwn = await componentWork(items, { withComponents: false, adaptedComponents: true });

        expect(adapterOwn.resolved.sidecar.blockers).toEqual([
          expect.objectContaining({
            code: 'COMPONENT_UNSUPPORTED',
            detail: { kind: 'EMBEDDED_WORK' },
            paths: [itemPath(2)],
          }),
        ]);
        expect(adapterOwn.resolved.sidecar.componentIntents?.map(({ kind }) => kind)).toEqual(['BOOK_CHAPTER']);
      });

      it('holds a component that is no chapter of a Work already in Thoth, which this import never changes', async () => {
        const planning = planned([
          product({
            ref: 'pb',
            identifiers: [pid('15', ISBN_A)],
            related: relatedWork(workIdentifier('06', '10.1234/present')),
            content: componentItem({ lsn: '1', av: '01' }),
          }),
        ]);
        const targets = await resolveOnixTargets(
          planning.sourcePlan,
          fakeLookup({ [isbnKey(ISBN_A)]: ['w-1'], [doiKey('https://doi.org/10.1234/present')]: ['w-1'] }, [
            existingWork('w-1', {
              doi: 'https://doi.org/10.1234/present',
              publications: [{ id: 'p-1', type: Paperback, isbn: ISBN_A }],
            }),
          ]),
          PUBLISHER_ID,
        );
        const { sidecar } = resolveOnixImportPlan({
          sourcePlan: planning.sourcePlan,
          targets,
          inputs: EMPTY_ONIX_PLAN_INPUTS,
          imprints: IMPRINTS,
          descriptive: planning.descriptive,
          components: planning.components,
          serieses: [],
        });

        expect(sidecar.workGroups[0].target).toBe('EXISTING_WORK');
        expect(sidecar.blockers).toEqual([
          expect.objectContaining({
            code: 'COMPONENT_UNSUPPORTED',
            classification: 'EXECUTION_DEFERRED',
            paths: [itemPath(1)],
            detail: { kind: 'AV_ITEM', reason: 'EXISTING_WORK' },
          }),
        ]);
        expect(sidecar.componentIntents).toEqual([]);
      });

      it('keeps the whole component reduction and every intent in the sidecar, for the later stages and preflight', async () => {
        const { resolved, components } = await componentWork([componentItem({ lsn: '1' })]);

        expect(resolved.sidecar.components).toBe(components);
        expect(resolved.plan?.onix?.componentIntents).toHaveLength(1);
        expect(resolved.sidecar.inputs.componentChoices).toEqual({});
      });
    });
  });
});

describe('rights acknowledgements, licence actions, sales rights and product contacts (thoth-app#217)', () => {
  const CC_BY = 'https://creativecommons.org/licenses/by/4.0/';
  const CC_BY_NC = 'https://creativecommons.org/licenses/by-nc/4.0/';
  const licence = (link: string, type = '01', dates = '') =>
    `<EpubLicense><EpubLicenseName>A licence</EpubLicenseName><EpubLicenseExpression><EpubLicenseExpressionType>${type}</EpubLicenseExpressionType><EpubLicenseExpressionLink>${link}</EpubLicenseExpressionLink></EpubLicenseExpression>${dates}</EpubLicense>`;
  const epub = (rights = '', rest: Partial<Parameters<typeof product>[0]> = {}) =>
    product({
      ref: 'epub',
      identifiers: [pid('15', ISBN_A)],
      descriptive: form('EA', ['E101'], '00', rights),
      ...rest,
    });
  const salesRightsXml = (type: string, territory: string, extra = '') =>
    `<SalesRights><SalesRightsType>${type}</SalesRightsType><Territory>${territory}</Territory>${extra}</SalesRights>`;
  const WORLD = '<RegionsIncluded>WORLD</RegionsIncluded>';
  const contactXml = (role: string, email = 'permissions@example.org') =>
    `<ProductContact><ProductContactRole>${role}</ProductContactRole><ProductContactName>Example Press</ProductContactName><EmailAddress>${email}</EmailAddress></ProductContact>`;
  const monograph = { fileWorkType: Monograph };
  /** Resolves with every group adapted, so that a plan is built the moment nothing blocks it. */
  const resolveExecutable = (products: string[], scenario: Scenario = {}) =>
    resolve(products, { executable: true, ...scenario });
  const findingOf = (findings: readonly { code: string; key: string }[], code: string) =>
    findings.find((finding) => finding.code === code) as OnixRightsFinding | OnixSalesRightsFinding;
  const rightsBlockers = (result: Awaited<ReturnType<typeof resolve>>['result']) =>
    result.sidecar.blockers
      .filter(({ code }) => /^(RIGHTS|SALES_RIGHTS|PRODUCT_CONTACT)_/.test(code))
      .map(({ code, classification, detail }) => [code, classification, detail.findingKey ?? detail.reason ?? null]);
  const licenceActionOf = (result: Awaited<ReturnType<typeof resolve>>['result']) =>
    result.sidecar.licenceActions?.[0]?.action ?? null;

  describe('the remaining Stage-A rights decisions (5568901904 rules 34, 42, 53, 73-78, 116-118, 137-138)', () => {
    it('holds a Work back for a technical-protection acknowledgement, then creates it with its licence once given', async () => {
      const file = [epub('<EpubTechnicalProtection>03</EpubTechnicalProtection>' + licence(CC_BY))];
      const unanswered = await resolveExecutable(file, { inputs: monograph });
      const key = findingOf(unanswered.rights.findings, 'RIGHTS_TECHNICAL_PROTECTION_UNREPRESENTABLE').key;

      expect(rightsBlockers(unanswered.result)).toEqual([
        ['RIGHTS_ACKNOWLEDGEMENT_REQUIRED', 'TARGET_UNREPRESENTABLE', key],
      ]);
      expect(unanswered.result.plan).toBeNull();
      // Technical protection alone never keeps the licence from being the Work's.
      expect(licenceActionOf(unanswered.result)).toEqual({
        kind: 'SET_SUPPORTED_LICENSE',
        identity: 'CC_BY_4_0',
        url: CC_BY,
      });

      const acknowledged = await resolveExecutable(file, {
        inputs: { ...monograph, rightsChoices: { [key]: ONIX_RIGHTS_ACKNOWLEDGED } },
      });

      expect(rightsBlockers(acknowledged.result)).toEqual([]);
      expect(acknowledged.result.plan?.works[0].license).toBe(CC_BY);
      expect(acknowledged.result.sidecar.acknowledgedRightsFindingKeys).toEqual([key]);
      expect(acknowledged.result.sidecar.inputs.rightsChoices).toEqual({ [key]: ONIX_RIGHTS_ACKNOWLEDGED });
      expect(acknowledged.result.sidecar.licenceActions).toEqual([
        {
          groupKey: acknowledged.sourcePlan.groups[0].groupKey,
          action: { kind: 'SET_SUPPORTED_LICENSE', identity: 'CC_BY_4_0', url: CC_BY },
        },
      ]);
      // No DRM, enforcement or access-control target exists in the plan for it.
      expect(JSON.stringify(acknowledged.result.plan?.works)).not.toMatch(/protection|drm/i);
    });

    it('lets a valid unsupported intrinsic licence proceed only through the explicit omission, with no Work licence', async () => {
      const file = [epub(licence('https://publisher.example/eula'))];
      const unanswered = await resolveExecutable(file, { inputs: monograph });
      const key = findingOf(unanswered.rights.findings, 'RIGHTS_LICENCE_UNSUPPORTED').key;

      expect(rightsBlockers(unanswered.result)).toEqual([
        ['RIGHTS_ACKNOWLEDGEMENT_REQUIRED', 'TARGET_UNREPRESENTABLE', key],
      ]);
      expect(licenceActionOf(unanswered.result)).toEqual({ kind: 'BLOCKED' });

      const acknowledged = await resolveExecutable(file, {
        inputs: { ...monograph, rightsChoices: { [key]: ONIX_RIGHTS_ACKNOWLEDGED } },
      });

      expect(acknowledged.result.sidecar.blockers).toEqual([]);
      expect(acknowledged.result.plan?.works[0].license).toBe('');
      expect(licenceActionOf(acknowledged.result)).toEqual({ kind: 'OMIT_WITH_ACKNOWLEDGED_LOSS', findingKeys: [key] });
      // The omitted licence fact stays visible in the plan the executor consumes.
      expect(acknowledged.result.sidecar.rights?.findings.map(({ key: k }) => k)).toContain(key);
    });

    it('never sets a dated licence from the clock: the publisher omits it with the loss acknowledged, or the plan waits', async () => {
      const now = vi.spyOn(Date, 'now');
      const dated = licence(
        CC_BY,
        '02',
        '<EpubLicenseDate><EpubLicenseDateRole>15</EpubLicenseDateRole><Date dateformat="00">20990101</Date></EpubLicenseDate>',
      );
      const file = [epub(dated)];
      const unanswered = await resolveExecutable(file, { inputs: monograph, release: '3.1' });
      const key = findingOf(unanswered.rights.findings, 'RIGHTS_LICENCE_DATED').key;

      expect(rightsBlockers(unanswered.result)).toEqual([
        ['RIGHTS_ACKNOWLEDGEMENT_REQUIRED', 'TARGET_INPUT_REQUIRED', key],
      ]);
      expect(unanswered.result.plan).toBeNull();

      const omitted = await resolveExecutable(file, {
        inputs: { ...monograph, rightsChoices: { [key]: ONIX_RIGHTS_ACKNOWLEDGED } },
        release: '3.1',
      });

      expect(omitted.result.plan?.works[0].license).toBe('');
      expect(licenceActionOf(omitted.result)).toEqual({ kind: 'OMIT_WITH_ACKNOWLEDGED_LOSS', findingKeys: [key] });
      expect(now).not.toHaveBeenCalled();
      now.mockRestore();
    });

    it('never keeps a supported licence while silently dropping a material constraint: acknowledging the constraint omits the licence too', async () => {
      const prohibited =
        '<EpubUsageConstraint><EpubUsageType>02</EpubUsageType><EpubUsageStatus>03</EpubUsageStatus></EpubUsageConstraint>';
      const licensed = [epub(prohibited + licence(CC_BY))];
      const unanswered = await resolveExecutable(licensed, { inputs: monograph });
      const key = findingOf(unanswered.rights.findings, 'RIGHTS_USAGE_CONSTRAINT_UNREPRESENTABLE').key;

      expect(rightsBlockers(unanswered.result)).toEqual([
        ['RIGHTS_ACKNOWLEDGEMENT_REQUIRED', 'TARGET_UNREPRESENTABLE', key],
      ]);
      expect(licenceActionOf(unanswered.result)).toEqual({ kind: 'BLOCKED' });

      const acknowledged = await resolveExecutable(licensed, {
        inputs: { ...monograph, rightsChoices: { [key]: ONIX_RIGHTS_ACKNOWLEDGED } },
      });

      expect(acknowledged.result.sidecar.blockers).toEqual([]);
      expect(acknowledged.result.plan?.works[0].license).toBe('');
      expect(licenceActionOf(acknowledged.result)).toEqual({ kind: 'OMIT_WITH_ACKNOWLEDGED_LOSS', findingKeys: [key] });

      // The same constraint on a Product stating no licence leaves the Work with none to set either way.
      const unlicensed = await resolveExecutable([epub(prohibited)], { inputs: monograph });
      const unlicensedKey = findingOf(unlicensed.rights.findings, 'RIGHTS_USAGE_CONSTRAINT_UNREPRESENTABLE').key;
      const done = await resolveExecutable([epub(prohibited)], {
        inputs: { ...monograph, rightsChoices: { [unlicensedKey]: ONIX_RIGHTS_ACKNOWLEDGED } },
      });

      expect(done.result.plan?.works[0].license).toBe('');
      expect(licenceActionOf(done.result)).toEqual({ kind: 'UNSET' });
    });

    it('offers no acknowledgement for a source conflict, a deferred scope, an incoherent constraint or a licence ambiguity: an answer is stale and the block stands', async () => {
      const deferred = epub(licence(CC_BY), {
        supply:
          '<ProductSupply><SupplyDetail><Supplier><SupplierRole>01</SupplierRole><SupplierName>S</SupplierName></Supplier><ProductAvailability>20</ProductAvailability>' +
          `<Price><PriceType>02</PriceType>${licence(CC_BY, '02')}<PriceAmount>10.00</PriceAmount><CurrencyCode>GBP</CurrencyCode></Price></SupplyDetail></ProductSupply>`,
      });
      const incoherent = epub(
        '<EpubUsageConstraint><EpubUsageType>02</EpubUsageType><EpubUsageStatus>02</EpubUsageStatus></EpubUsageConstraint>',
      );
      const contradictory = epub(
        '<EpubTechnicalProtection>00</EpubTechnicalProtection><EpubTechnicalProtection>03</EpubTechnicalProtection>',
      );
      const cases: [string, string, string][] = [
        [deferred, 'RIGHTS_SCOPE_DEFERRED', 'RIGHTS_PREFLIGHT_GAP'],
        [incoherent, 'RIGHTS_USAGE_CONSTRAINT_UNREPRESENTABLE', 'RIGHTS_UNREPRESENTABLE'],
        [contradictory, 'RIGHTS_TECHNICAL_PROTECTION_CONTRADICTION', 'RIGHTS_SOURCE_CONFLICT'],
      ];

      for (const [record, code, blockerCode] of cases) {
        const unanswered = await resolveExecutable([record], { inputs: monograph });
        const key = findingOf(unanswered.rights.findings, code).key;

        expect(rightsBlockers(unanswered.result)).toContainEqual([blockerCode, expect.any(String), key]);

        const answered = await resolveExecutable([record], {
          inputs: { ...monograph, rightsChoices: { [key]: ONIX_RIGHTS_ACKNOWLEDGED } },
        });

        expect(rightsBlockers(answered.result)).toEqual([
          [blockerCode, expect.any(String), key],
          ['RIGHTS_CHOICE_STALE', 'TARGET_INPUT_REQUIRED', key],
        ]);
        expect(answered.result.plan).toBeNull();
      }

      // Licence ambiguity across grouped manifestations (rule 87) is fail-closed too.
      const related = relatedWork(workIdentifier('06', '10.1234/work'));
      const ambiguous = [
        product({
          ref: 'epub',
          identifiers: [pid('15', ISBN_A)],
          descriptive: form('EA', ['E101'], '00', licence(CC_BY)),
          related,
        }),
        product({ ref: 'pdf', identifiers: [pid('15', ISBN_B)], descriptive: form('EA', ['E107']), related }),
      ];
      const unanswered = await resolveExecutable(ambiguous, { inputs: monograph });
      const key = findingOf(unanswered.rights.findings, 'RIGHTS_LICENCE_GROUP_AMBIGUOUS').key;
      const answered = await resolveExecutable(ambiguous, {
        inputs: { ...monograph, rightsChoices: { [key]: ONIX_RIGHTS_ACKNOWLEDGED } },
      });

      expect(rightsBlockers(answered.result)).toEqual([
        ['RIGHTS_INPUT_REQUIRED', 'TARGET_INPUT_REQUIRED', key],
        ['RIGHTS_CHOICE_STALE', 'TARGET_INPUT_REQUIRED', key],
      ]);
      expect(licenceActionOf(answered.result)).toEqual({ kind: 'BLOCKED' });
    });

    it('reads an answer that is not the acknowledgement, an answer to a finding nothing offers, or an answer to no finding as stale, never as consent', async () => {
      const file = [
        epub(
          '<EpubTechnicalProtection>03</EpubTechnicalProtection><EpubLicense><EpubLicenseName>A licence</EpubLicenseName>' +
            `<EpubLicenseExpression><EpubLicenseExpressionType>01</EpubLicenseExpressionType><EpubLicenseExpressionLink>${CC_BY}</EpubLicenseExpressionLink></EpubLicenseExpression>` +
            '<EpubLicenseExpression><EpubLicenseExpressionType>10</EpubLicenseExpressionType><EpubLicenseExpressionLink>https://publisher.example/policy.xml</EpubLicenseExpressionLink></EpubLicenseExpression></EpubLicense>',
        ),
      ];
      const { rights } = await resolveExecutable(file, { inputs: monograph });
      const protection = findingOf(rights.findings, 'RIGHTS_TECHNICAL_PROTECTION_UNREPRESENTABLE').key;
      const policy = findingOf(rights.findings, 'RIGHTS_POLICY_NOT_REPRESENTED').key;
      const { result } = await resolveExecutable(file, {
        inputs: {
          ...monograph,
          rightsChoices: {
            [protection]: 'yes',
            [policy]: ONIX_RIGHTS_ACKNOWLEDGED,
            'RIGHTS|GONE': ONIX_RIGHTS_ACKNOWLEDGED,
          },
        },
      });

      expect(rightsBlockers(result)).toEqual([
        ['RIGHTS_ACKNOWLEDGEMENT_REQUIRED', 'TARGET_UNREPRESENTABLE', protection],
        ['RIGHTS_CHOICE_STALE', 'TARGET_INPUT_REQUIRED', protection],
        ['RIGHTS_CHOICE_STALE', 'TARGET_INPUT_REQUIRED', policy],
        ['RIGHTS_CHOICE_STALE', 'TARGET_INPUT_REQUIRED', 'RIGHTS|GONE'],
      ]);
      expect(result.sidecar.blockers.find(({ detail }) => detail.findingKey === 'RIGHTS|GONE')?.detail).toEqual({
        findingKey: 'RIGHTS|GONE',
        answer: ONIX_RIGHTS_ACKNOWLEDGED,
      });
      expect(result.sidecar.acknowledgedRightsFindingKeys).toEqual([]);
    });

    it('re-blocks the plan the moment a required acknowledgement is cleared, and keeps one across unrelated refinement', async () => {
      const file = [epub('<EpubTechnicalProtection>03</EpubTechnicalProtection>' + licence(CC_BY))];
      const { rights } = await resolveExecutable(file, { inputs: monograph });
      const key = findingOf(rights.findings, 'RIGHTS_TECHNICAL_PROTECTION_UNREPRESENTABLE').key;
      const acknowledged = await resolveExecutable(file, {
        inputs: { ...monograph, rightsChoices: { [key]: ONIX_RIGHTS_ACKNOWLEDGED } },
      });
      const refined = await resolveExecutable(file, {
        inputs: { fileWorkType: EditedBook, rightsChoices: { [key]: ONIX_RIGHTS_ACKNOWLEDGED } },
      });
      const cleared = await resolveExecutable(file, { inputs: { ...monograph, rightsChoices: {} } });

      expect(acknowledged.result.plan).not.toBeNull();
      expect(refined.result.plan?.works[0].type).toBe(EditedBook);
      expect(refined.result.sidecar.acknowledgedRightsFindingKeys).toEqual([key]);
      expect(cleared.result.plan).toBeNull();
      expect(rightsBlockers(cleared.result)).toEqual([
        ['RIGHTS_ACKNOWLEDGEMENT_REQUIRED', 'TARGET_UNREPRESENTABLE', key],
      ]);
    });
  });

  describe('existing-Work licence reconciliation (5568901904 rules 119-124)', () => {
    const WORK_ID = 'w-1';
    const withLicence = (license: string): WorkEntity => ({
      ...existingWork(WORK_ID, { doi: WORK_DOI, publications: [{ id: 'p-1', type: Epub, isbn: ISBN_A }], edition: 1 }),
      license,
    });
    const matches = { [doiKey(WORK_DOI)]: [WORK_ID], [isbnKey(ISBN_A)]: [WORK_ID] };
    const present = (rights = '') =>
      product({
        ref: 'epub',
        identifiers: [pid('15', ISBN_A)],
        descriptive: form('EA', ['E101'], '00', rights),
        related: relatedWork(workIdentifier('06', WORK_DOI)),
      });

    it('takes the same supported licence, however spelled, as already present, and writes nothing', async () => {
      const { result, sourcePlan } = await resolveExecutable(
        [present(licence('https://creativecommons.org/licenses/by/4.0/legalcode'))],
        {
          matches,
          works: [withLicence(CC_BY)],
        },
      );

      expect(result.sidecar.workGroups[0].target).toBe('EXISTING_WORK');
      expect(result.sidecar.products[0].action).toBe('ALREADY_PRESENT');
      expect(result.sidecar.blockers).toEqual([]);
      expect(result.sidecar.licenceActions).toEqual([
        {
          groupKey: sourcePlan.groups[0].groupKey,
          action: { kind: 'ALREADY_PRESENT', identity: 'CC_BY_4_0', url: CC_BY },
        },
      ]);
      expect(result.plan?.works).toEqual([]);
      expect(result.sidecar.findings?.filter(({ family }) => family === 'LICENCE_RECONCILIATION')).toEqual([
        expect.objectContaining({
          code: 'RIGHTS_EXISTING_LICENCE_ALREADY_PRESENT',
          classification: 'SUPPORTED_NORMALIZED',
          blocking: false,
          resolution: { kind: 'NONE' },
          answer: { state: 'NOT_APPLICABLE' },
        }),
      ]);
    });

    it('blocks ordinary import where the source states a supported licence different from the existing one', async () => {
      const differs = await resolveExecutable([present(licence(CC_BY))], { matches, works: [withLicence(CC_BY_NC)] });
      const [blocker] = differs.result.sidecar.blockers;
      const differsKey = `RIGHTS|RIGHTS_EXISTING_LICENCE_DIFFERS|${differs.sourcePlan.groups[0].groupKey}`;

      expect(rightsBlockers(differs.result)).toEqual([
        ['RIGHTS_EXISTING_LICENCE_DIFFERS', 'EXECUTION_DEFERRED', differsKey],
      ]);
      expect(blocker).toMatchObject({
        groupKey: differs.sourcePlan.groups[0].groupKey,
        detail: { workId: WORK_ID, existing: CC_BY_NC, incoming: CC_BY },
      });
      expect(licenceActionOf(differs.result)).toEqual({ kind: 'BLOCKED' });
      expect(differs.result.plan).toBeNull();
      // The difference is a finding of the plan too, one nothing here answers: an answer to it is stale.
      expect(differs.result.sidecar.findings?.find(({ key }) => key === differsKey)).toMatchObject({
        family: 'LICENCE_RECONCILIATION',
        code: 'RIGHTS_EXISTING_LICENCE_DIFFERS',
        classification: 'EXECUTION_DEFERRED',
        blocking: true,
        productKey: null,
        resolution: { kind: 'NONE' },
        answer: { state: 'NOT_APPLICABLE' },
      });
      const answered = await resolveExecutable([present(licence(CC_BY))], {
        matches,
        works: [withLicence(CC_BY_NC)],
        inputs: { rightsChoices: { [differsKey]: ONIX_RIGHTS_ACKNOWLEDGED } },
      });

      expect(rightsBlockers(answered.result).map(([code]) => code)).toEqual([
        'RIGHTS_EXISTING_LICENCE_DIFFERS',
        'RIGHTS_CHOICE_STALE',
      ]);
    });

    it('asks an explicit decision where the existing Work holds no licence and the source states a supported one, and writes nothing either way', async () => {
      const unanswered = await resolveExecutable([present(licence(CC_BY))], { matches, works: [withLicence('')] });
      const key = `RIGHTS|RIGHTS_EXISTING_LICENCE_NOT_SET|${unanswered.sourcePlan.groups[0].groupKey}`;

      expect(rightsBlockers(unanswered.result)).toEqual([
        ['RIGHTS_ACKNOWLEDGEMENT_REQUIRED', 'TARGET_INPUT_REQUIRED', key],
      ]);
      expect(licenceActionOf(unanswered.result)).toEqual({ kind: 'BLOCKED' });
      expect(unanswered.result.plan).toBeNull();
      expect(unanswered.result.sidecar.findings?.find((finding) => finding.key === key)).toMatchObject({
        family: 'LICENCE_RECONCILIATION',
        code: 'RIGHTS_EXISTING_LICENCE_NOT_SET',
        classification: 'TARGET_INPUT_REQUIRED',
        blocking: true,
        productKey: null,
        groupKey: unanswered.sourcePlan.groups[0].groupKey,
        detail: { workId: WORK_ID, incoming: CC_BY, identity: 'CC_BY_4_0' },
        resolution: { kind: 'ACKNOWLEDGE' },
        answer: { state: 'UNANSWERED' },
      });

      const acknowledged = await resolveExecutable([present(licence(CC_BY))], {
        matches,
        works: [withLicence('')],
        inputs: { rightsChoices: { [key]: ONIX_RIGHTS_ACKNOWLEDGED } },
      });

      expect(acknowledged.result.sidecar.blockers).toEqual([]);
      expect(licenceActionOf(acknowledged.result)).toEqual({ kind: 'OMIT_WITH_ACKNOWLEDGED_LOSS', findingKeys: [key] });
      expect(acknowledged.result.sidecar.acknowledgedRightsFindingKeys).toEqual([key]);
      expect(acknowledged.result.sidecar.findings?.find((finding) => finding.key === key)?.answer).toEqual({
        state: 'ANSWERED',
        value: ONIX_RIGHTS_ACKNOWLEDGED,
      });
      // The existing Work is never written: the plan creates no Work, and holds no licence for it.
      expect(acknowledged.result.plan?.works).toEqual([]);

      const stale = await resolveExecutable([present(licence(CC_BY))], {
        matches,
        works: [withLicence('')],
        inputs: { rightsChoices: { [key]: 'yes' } },
      });

      expect(rightsBlockers(stale.result).map(([code]) => code)).toEqual([
        'RIGHTS_ACKNOWLEDGEMENT_REQUIRED',
        'RIGHTS_CHOICE_STALE',
      ]);
      expect(stale.result.sidecar.findings?.find((finding) => finding.key === key)?.answer).toEqual({
        state: 'REJECTED',
        value: 'yes',
      });
      // The same key is offered by no other reconciliation: against the same licence it is stale.
      const offeredElsewhere = await resolveExecutable([present(licence(CC_BY))], {
        matches,
        works: [withLicence(CC_BY)],
        inputs: { rightsChoices: { [key]: ONIX_RIGHTS_ACKNOWLEDGED } },
      });

      expect(rightsBlockers(offeredElsewhere.result).map(([code]) => code)).toEqual(['RIGHTS_CHOICE_STALE']);
    });

    it('preserves an existing licence where the source is silent, and clears nothing', async () => {
      const { result, sourcePlan } = await resolveExecutable([present()], { matches, works: [withLicence(CC_BY)] });

      expect(result.sidecar.blockers).toEqual([]);
      expect(result.sidecar.licenceActions).toEqual([
        { groupKey: sourcePlan.groups[0].groupKey, action: { kind: 'EXISTING_PRESERVED', url: CC_BY } },
      ]);
      expect(result.plan?.works).toEqual([]);
      // A silent source against a Work with no licence sets none either.
      const none = await resolveExecutable([present()], { matches, works: [withLicence('')] });

      expect(licenceActionOf(none.result)).toEqual({ kind: 'UNSET' });
    });

    it('cannot verify an unidentifiable source licence against an existing licence, and blocks even when its loss is acknowledged; against no licence the acknowledged omission stands', async () => {
      const eula = present(licence('https://publisher.example/eula'));
      const { rights } = await resolveExecutable([eula], { matches, works: [withLicence(CC_BY)] });
      const key = findingOf(rights.findings, 'RIGHTS_LICENCE_UNSUPPORTED').key;
      const choices = { rightsChoices: { [key]: ONIX_RIGHTS_ACKNOWLEDGED } };
      const licensed = await resolveExecutable([eula], { matches, works: [withLicence(CC_BY)], inputs: choices });
      const unlicensed = await resolveExecutable([eula], { matches, works: [withLicence('')], inputs: choices });

      expect(rightsBlockers(licensed.result)).toEqual([
        [
          'RIGHTS_EXISTING_LICENCE_UNVERIFIED',
          'EXECUTION_DEFERRED',
          `RIGHTS|RIGHTS_EXISTING_LICENCE_UNVERIFIED|${licensed.sourcePlan.groups[0].groupKey}`,
        ],
      ]);
      expect(licenceActionOf(licensed.result)).toEqual({ kind: 'BLOCKED' });
      expect(unlicensed.result.sidecar.blockers).toEqual([]);
      expect(licenceActionOf(unlicensed.result)).toEqual({ kind: 'OMIT_WITH_ACKNOWLEDGED_LOSS', findingKeys: [key] });
    });
  });

  describe('the canonical plan findings (Correction 2 of the #218 review)', () => {
    it('lists every finding of every family once, under one vocabulary, with the answer state the inputs give it', async () => {
      const file = [
        epub('<EpubTechnicalProtection>03</EpubTechnicalProtection>' + licence(CC_BY), {
          publishing:
            salesRightsXml('01', '<RegionsIncluded>WORLD</RegionsIncluded><CountriesExcluded>US</CountriesExcluded>') +
            contactXml('06') +
            contactXml('02', 'press@example.org'),
          supply:
            '<ProductSupply><SupplyDetail><Supplier><SupplierRole>01</SupplierRole><SupplierName>S</SupplierName></Supplier><ProductAvailability>20</ProductAvailability>' +
            '<Price><PriceType>02</PriceType><PriceAmount>20.00</PriceAmount><CurrencyCode>GBP</CurrencyCode></Price>' +
            '<Price><PriceType>02</PriceType><PriceAmount>22.00</PriceAmount><CurrencyCode>GBP</CurrencyCode></Price></SupplyDetail></ProductSupply>',
        }),
      ];
      const { result, rights, salesRights, commercial } = await resolveExecutable(file, { inputs: monograph });
      const findings = result.sidecar.findings ?? [];
      const keysOf = (family: string) => findings.filter((finding) => finding.family === family).map(({ key }) => key);

      // Every family's findings, keyed exactly as the family lists them, each once.
      expect(keysOf('RIGHTS')).toEqual(rights.findings.map(({ key }) => key));
      expect(keysOf('COMMERCIAL')).toEqual(commercial.findings.map(({ key }) => key));
      expect([...keysOf('SALES_RIGHTS'), ...keysOf('PRODUCT_CONTACT')].sort()).toEqual(
        salesRights.findings.map(({ key }) => key).sort(),
      );
      expect(keysOf('DESCRIPTIVE')).toEqual(result.sidecar.descriptive.findings.map(({ key }) => key));
      expect(new Set(findings.map(({ key }) => key)).size).toBe(findings.length);
      // Every blocker that names a finding names one the list holds.
      result.sidecar.blockers.forEach(({ detail }) => {
        if (typeof detail.findingKey === 'string')
          expect(findings.some(({ key }) => key === detail.findingKey)).toBe(true);
      });
      // What each offers, and how it stands, in one vocabulary.
      const byCode = (code: string) => findings.find((finding) => finding.code === code);

      expect(byCode('RIGHTS_TECHNICAL_PROTECTION_UNREPRESENTABLE')).toMatchObject({
        family: 'RIGHTS',
        classification: 'TARGET_UNREPRESENTABLE',
        blocking: true,
        resolution: { kind: 'ACKNOWLEDGE' },
        answer: { state: 'UNANSWERED' },
      });
      expect(byCode('SALES_RIGHTS_TERRITORY_NOT_REPRESENTED')).toMatchObject({
        family: 'SALES_RIGHTS',
        resolution: { kind: 'ACKNOWLEDGE' },
        answer: { state: 'UNANSWERED' },
      });
      expect(byCode('PRODUCT_CONTACT_NOT_REPRESENTED')).toMatchObject({ family: 'PRODUCT_CONTACT' });
      expect(
        findings
          .filter(({ code }) => code === 'PRODUCT_CONTACT_NOT_REPRESENTED')
          .map(({ blocking, resolution, answer }) => [blocking, resolution.kind, answer.state]),
      ).toEqual([
        [true, 'ACKNOWLEDGE', 'UNANSWERED'],
        [false, 'NONE', 'NOT_APPLICABLE'],
      ]);
      const price = byCode('PRICE_AMOUNT_CONFLICT');
      const conflict = commercial.findings.find(({ code }) => code === 'PRICE_AMOUNT_CONFLICT');

      expect(price).toMatchObject({ family: 'COMMERCIAL', blocking: true, answer: { state: 'UNANSWERED' } });
      expect(price?.resolution).toEqual({
        kind: 'CHOICE',
        options: [
          ...(conflict?.resolution.kind === 'PRICE_CHOICE'
            ? conflict.resolution.candidates.map(({ key, label }) => ({ key, label }))
            : []),
          { key: ONIX_PRICE_OMIT, label: ONIX_PRICE_OMIT },
        ],
      });
      // No finding carries the contact's email.
      expect(JSON.stringify(findings)).not.toContain('permissions@example.org');

      const protection =
        rights.findings.find(({ code }) => code === 'RIGHTS_TECHNICAL_PROTECTION_UNREPRESENTABLE')?.key ?? '';
      const contact = salesRights.findings.find(({ blocking }) => blocking)?.key ?? '';
      const answered = await resolveExecutable(file, {
        inputs: {
          ...monograph,
          rightsChoices: { [protection]: ONIX_RIGHTS_ACKNOWLEDGED, [contact]: 'no' },
          commercialChoices: { [conflict?.key ?? '']: ONIX_PRICE_OMIT },
        },
      });
      const answeredFindings = answered.result.sidecar.findings ?? [];
      const stateOf = (key: string) => answeredFindings.find((finding) => finding.key === key)?.answer;

      expect(stateOf(protection)).toEqual({ state: 'ANSWERED', value: ONIX_RIGHTS_ACKNOWLEDGED });
      expect(stateOf(contact)).toEqual({ state: 'REJECTED', value: 'no' });
      expect(stateOf(conflict?.key ?? '')).toEqual({ state: 'ANSWERED', value: ONIX_PRICE_OMIT });
    });

    it('is empty where the reductions found nothing', async () => {
      const bare = await resolveExecutable([epub()], { inputs: monograph });

      expect(bare.result.sidecar.findings).toEqual([]);
    });
  });

  describe('sales rights and product contacts (5543566392 rules 23-38, 55-62, 68-76)', () => {
    it('discloses simple WORLD rights without blocking, holds a high-salience contact for acknowledgement, and creates no contact from it', async () => {
      const file = [epub('', { publishing: salesRightsXml('01', WORLD) + contactXml('06') })];
      const unanswered = await resolveExecutable(file, { inputs: monograph });
      const contact = findingOf(unanswered.salesRights.findings, 'PRODUCT_CONTACT_NOT_REPRESENTED').key;

      expect(unanswered.salesRights.findings.map(({ code, blocking }) => [code, blocking])).toEqual([
        ['SALES_RIGHTS_NOT_REPRESENTED', false],
        ['PRODUCT_CONTACT_NOT_REPRESENTED', true],
      ]);
      expect(rightsBlockers(unanswered.result)).toEqual([
        ['PRODUCT_CONTACT_ACKNOWLEDGEMENT_REQUIRED', 'TARGET_UNREPRESENTABLE', contact],
      ]);
      expect(unanswered.result.sidecar.salesRights).toBe(unanswered.salesRights);

      const acknowledged = await resolveExecutable(file, {
        inputs: { ...monograph, rightsChoices: { [contact]: ONIX_RIGHTS_ACKNOWLEDGED } },
      });

      expect(acknowledged.result.sidecar.blockers).toEqual([]);
      expect(acknowledged.result.plan).not.toBeNull();
      expect(acknowledged.result.sidecar.acknowledgedRightsFindingKeys).toEqual([contact]);
      // Nothing in the executable plan carries the contact, its email, or any territorial right.
      const executable = JSON.stringify({
        works: acknowledged.result.plan?.works,
        series: acknowledged.result.plan?.series,
      });

      expect(executable).not.toContain('permissions@example.org');
      expect(executable).not.toMatch(/SalesRights|contact|WORLD/i);
    });

    it('requires an acknowledgement of each complex rights fact, and blocks a Market contradiction and an unresolved territory outright', async () => {
      const complex = [
        epub('', {
          publishing:
            salesRightsXml('01', '<RegionsIncluded>WORLD</RegionsIncluded><CountriesExcluded>US</CountriesExcluded>') +
            salesRightsXml('03', '<CountriesIncluded>US</CountriesIncluded>') +
            '<ROWSalesRightsType>00</ROWSalesRightsType>',
        }),
      ];
      const { result, salesRights } = await resolveExecutable(complex, { inputs: monograph });

      expect(rightsBlockers(result)).toEqual(
        salesRights.findings.map(({ key }) => ['SALES_RIGHTS_ACKNOWLEDGEMENT_REQUIRED', 'TARGET_UNREPRESENTABLE', key]),
      );

      const contradiction = [
        epub('', {
          publishing:
            salesRightsXml('01', '<CountriesIncluded>GB</CountriesIncluded>') +
            '<ROWSalesRightsType>03</ROWSalesRightsType>',
          supply:
            '<ProductSupply><Market><Territory><CountriesIncluded>US</CountriesIncluded></Territory></Market><SupplyDetail><Supplier><SupplierRole>01</SupplierRole><SupplierName>S</SupplierName></Supplier><ProductAvailability>20</ProductAvailability><Price><PriceType>02</PriceType><PriceAmount>10.00</PriceAmount><CurrencyCode>USD</CurrencyCode></Price></SupplyDetail></ProductSupply>',
        }),
      ];
      const contradicted = await resolveExecutable(contradiction, { inputs: monograph });
      const conflictKey = findingOf(contradicted.salesRights.findings, 'SALES_RIGHTS_MARKET_CONTRADICTION').key;

      expect(rightsBlockers(contradicted.result)).toContainEqual([
        'SALES_RIGHTS_SOURCE_CONFLICT',
        'SOURCE_CONFLICT',
        conflictKey,
      ]);
      // A conflict cannot be acknowledged away: the answer is stale and the conflict stands.
      const answered = await resolveExecutable(contradiction, {
        inputs: { ...monograph, rightsChoices: { [conflictKey]: ONIX_RIGHTS_ACKNOWLEDGED } },
      });

      expect(rightsBlockers(answered.result)).toContainEqual([
        'SALES_RIGHTS_SOURCE_CONFLICT',
        'SOURCE_CONFLICT',
        conflictKey,
      ]);
      expect(rightsBlockers(answered.result)).toContainEqual([
        'RIGHTS_CHOICE_STALE',
        'TARGET_INPUT_REQUIRED',
        conflictKey,
      ]);

      const unresolved = await resolveExecutable(
        [epub('', { publishing: salesRightsXml('01', '<CountriesIncluded>UK</CountriesIncluded>') })],
        {
          inputs: monograph,
        },
      );

      expect(rightsBlockers(unresolved.result)).toContainEqual([
        'SALES_RIGHTS_PREFLIGHT_GAP',
        'PREFLIGHT_GAP',
        expect.stringContaining('SALES_RIGHTS_TERRITORY_NOT_ESTABLISHED'),
      ]);
      const unexpectedRole = await resolveExecutable([epub('', { publishing: contactXml('77') })], {
        inputs: monograph,
      });

      expect(rightsBlockers(unexpectedRole.result)).toEqual([
        ['PRODUCT_CONTACT_PREFLIGHT_GAP', 'PREFLIGHT_GAP', expect.stringContaining('PRODUCT_CONTACT_ROLE_UNEXPECTED')],
      ]);
    });

    it('holds nothing back for a Product that creates nothing, and cannot plan a Work group without the sales-rights reduction beside the rights one', async () => {
      const WORK_ID = 'w-1';
      const present = product({
        ref: 'epub',
        identifiers: [pid('15', ISBN_A)],
        descriptive: form('EA', ['E101']),
        publishing: contactXml('06'),
        related: relatedWork(workIdentifier('06', WORK_DOI)),
      });
      const already = await resolveExecutable([present], {
        matches: { [doiKey(WORK_DOI)]: [WORK_ID], [isbnKey(ISBN_A)]: [WORK_ID] },
        works: [existingWork(WORK_ID, { doi: WORK_DOI, publications: [{ id: 'p-1', type: Epub, isbn: ISBN_A }] })],
      });

      expect(already.result.sidecar.products[0].action).toBe('ALREADY_PRESENT');
      expect(already.salesRights.findings).toHaveLength(1);
      expect(rightsBlockers(already.result)).toEqual([]);

      const unreduced = await resolveExecutable([epub('', { publishing: salesRightsXml('01', WORLD) })], {
        inputs: monograph,
        withSalesRights: false,
      });

      expect(rightsBlockers(unreduced.result)).toEqual([
        ['SALES_RIGHTS_PREFLIGHT_GAP', 'PREFLIGHT_GAP', 'SALES_RIGHTS_NOT_REDUCED'],
      ]);
      expect(unreduced.result.sidecar.salesRights).toBeUndefined();
      expect(unreduced.result.plan).toBeNull();
    });
  });
});

describe('Publication accessibility and ProductFormFeatures (thoth-app#221)', () => {
  const REPORT = 'https://example.org/accessibility';
  const { Wcag21Aa, Wcag22Aa, Wcag22Aaa, EpubA11Y11Aa, EpubA11Y11Aaa } = AccessibilityStandards.enum;
  const { MicroEnterprises } = AccessibilityExceptions.enum;
  const { Mp3, Wav } = PublicationType.enum;
  const featureXml = (type: string, value?: string, descriptions: string[] = []) =>
    `<ProductFormFeature><ProductFormFeatureType>${type}</ProductFormFeatureType>${
      value === undefined ? '' : `<ProductFormFeatureValue>${value}</ProductFormFeatureValue>`
    }${descriptions.map((text) => `<ProductFormFeatureDescription>${text}</ProductFormFeatureDescription>`).join('')}</ProductFormFeature>`;
  const a11y = (...codes: string[]) => codes.map((code) => featureXml('09', code)).join('');
  const epub = (features = '', rest: Partial<Parameters<typeof product>[0]> = {}) =>
    product({
      ref: 'epub',
      identifiers: [pid('15', ISBN_A)],
      descriptive: form('EA', ['E101'], '00', features),
      ...rest,
    });
  const monograph = { fileWorkType: Monograph };
  const resolveExecutable = (products: string[], scenario: Scenario = {}) =>
    resolve(products, { executable: true, ...scenario, inputs: { ...monograph, ...scenario.inputs } });
  type Result = Awaited<ReturnType<typeof resolve>>['result'];
  const accessibilityBlockers = (result: Result) =>
    result.sidecar.blockers
      .filter(({ code }) => /^(ACCESSIBILITY|PRODUCT_FORM_FEATURE)_/.test(code))
      .map(({ code, classification, detail }) => [code, classification, detail.finding ?? detail.reason ?? null]);
  const fieldsOf = (publication: PublicationFields | undefined) =>
    publication === undefined
      ? undefined
      : {
          accessibilityStandard: publication.accessibilityStandard,
          accessibilityAdditionalStandard: publication.accessibilityAdditionalStandard,
          accessibilityException: publication.accessibilityException,
          accessibilityReportUrl: publication.accessibilityReportUrl,
        };
  type PublicationFields = ImportPlan['works'][number]['publications'][number];
  const createdFields = (result: Result) => fieldsOf(result.plan?.works[0].publications[0]);
  const blockerFinding = (result: Result, code: string) =>
    result.sidecar.findings?.find(
      ({ key }) => key === result.sidecar.blockers.find((blocker) => blocker.code === code)?.detail.findingKey,
    );
  const none = {
    accessibilityStandard: null,
    accessibilityAdditionalStandard: null,
    accessibilityException: null,
    accessibilityReportUrl: null,
  };

  describe('new Publications', () => {
    it('creates a Publication with exactly the accessibility its plan resolved, and says what each value came from', async () => {
      const { result } = await resolveExecutable([epub(a11y('82', '86', '04') + featureXml('09', '96', [REPORT]))]);
      const [action] = result.sidecar.accessibilityActions ?? [];

      expect(accessibilityBlockers(result)).toEqual([]);
      expect(createdFields(result)).toEqual({
        accessibilityStandard: Wcag22Aaa,
        accessibilityAdditionalStandard: EpubA11Y11Aaa,
        accessibilityException: null,
        accessibilityReportUrl: REPORT,
      });
      expect(action).toMatchObject({
        publicationType: Epub,
        action: { kind: 'CREATE' },
        resolved: {
          ...none,
          accessibilityStandard: Wcag22Aaa,
          accessibilityAdditionalStandard: EpubA11Y11Aaa,
          accessibilityReportUrl: REPORT,
        },
        omitted: [],
      });
      expect(action.sources.map(({ field, value, basis, codes: stated }) => [field, value, basis, stated])).toEqual([
        ['accessibilityStandard', Wcag22Aaa, 'AUTOMATIC', ['82', '86']],
        ['accessibilityAdditionalStandard', EpubA11Y11Aaa, 'AUTOMATIC', ['04', '86']],
        ['accessibilityReportUrl', REPORT, 'AUTOMATIC', ['96']],
      ]);
    });

    it('plans no accessibility for a file that states none, as before', async () => {
      const { result } = await resolveExecutable([epub()]);

      expect(createdFields(result)).toEqual({ ...none, accessibilityReportUrl: '' });
      expect(result.sidecar.accessibilityActions).toEqual([
        expect.objectContaining({ action: { kind: 'CREATE' }, resolved: none, sources: [], omitted: [] }),
      ]);
    });

    it('holds a Publication with several WCAG values for a choice, never taking one itself, and creates exactly the chosen one', async () => {
      const pending = await resolveExecutable([epub(a11y('81', '82', '85'))]);
      const choice = blockerFinding(pending.result, 'ACCESSIBILITY_CHOICE_REQUIRED');

      expect(accessibilityBlockers(pending.result)).toEqual([
        ['ACCESSIBILITY_CHOICE_REQUIRED', 'TARGET_INPUT_REQUIRED', 'ACCESSIBILITY_PRIMARY_CHOICE_REQUIRED'],
      ]);
      expect(pending.result.plan).toBeNull();
      expect(pending.result.sidecar.accessibilityActions?.[0].action).toEqual({ kind: 'BLOCKED' });
      expect(choice).toMatchObject({ family: 'ACCESSIBILITY', answer: { state: 'UNANSWERED' } });

      const chosen = await resolveExecutable([epub(a11y('81', '82', '85'))], {
        inputs: { accessibilityChoices: { [choice?.key ?? '']: Wcag21Aa } },
      });
      const [action] = chosen.result.sidecar.accessibilityActions ?? [];

      expect(createdFields(chosen.result)).toEqual({
        ...none,
        accessibilityStandard: Wcag21Aa,
        accessibilityReportUrl: '',
      });
      expect(action.sources).toEqual([
        expect.objectContaining({ value: Wcag21Aa, basis: 'PUBLISHER_CHOICE', findingKey: choice?.key }),
      ]);
      expect(action.omitted).toEqual([
        expect.objectContaining({ value: Wcag22Aa, reason: 'NOT_CHOSEN', findingKey: choice?.key }),
      ]);
      expect(chosen.result.sidecar.findings?.find(({ key }) => key === choice?.key)?.answer).toEqual({
        state: 'ANSWERED',
        value: Wcag21Aa,
      });
    });

    it('rejects a stale accessibility answer rather than applying it, whatever it names', async () => {
      const file = [epub(a11y('81', '82', '85') + a11y('11'))];
      const { result: first } = await resolveExecutable(file);
      const choice = blockerFinding(first, 'ACCESSIBILITY_CHOICE_REQUIRED');
      const disclosure = first.sidecar.findings?.find(({ code }) => code === 'ACCESSIBILITY_FACT_NOT_REPRESENTED');
      const { result } = await resolveExecutable(file, {
        inputs: {
          accessibilityChoices: {
            // An option the choice does not offer, an answer to a finding nothing answers, and a finding the file lacks.
            [choice?.key ?? '']: Wcag22Aaa,
            [disclosure?.key ?? '']: ONIX_ACCESSIBILITY_ACKNOWLEDGED,
            'ACCESSIBILITY|ACCESSIBILITY_PRIMARY_CHOICE_REQUIRED|elsewhere': Wcag21Aa,
          },
        },
      });

      expect(result.plan).toBeNull();
      expect(accessibilityBlockers(result)).toEqual([
        ['ACCESSIBILITY_CHOICE_STALE', 'TARGET_INPUT_REQUIRED', 'ACCESSIBILITY_PRIMARY_CHOICE_REQUIRED'],
        ['ACCESSIBILITY_CHOICE_STALE', 'TARGET_INPUT_REQUIRED', 'ACCESSIBILITY_FACT_NOT_REPRESENTED'],
        ['ACCESSIBILITY_CHOICE_STALE', 'TARGET_INPUT_REQUIRED', null],
      ]);
      expect(result.sidecar.accessibilityActions?.[0]).toMatchObject({ resolved: null, action: { kind: 'BLOCKED' } });
      expect(result.sidecar.findings?.find(({ key }) => key === choice?.key)?.answer).toEqual({
        state: 'REJECTED',
        value: Wcag22Aaa,
      });

      // An answer given for other facts names a finding a changed file does not have: it is stale, never re-aimed.
      const { result: changed } = await resolveExecutable([epub(a11y('81', '82', '86'))], {
        inputs: { accessibilityChoices: { [choice?.key ?? '']: Wcag21Aa } },
      });

      expect(accessibilityBlockers(changed)).toEqual([
        ['ACCESSIBILITY_CHOICE_REQUIRED', 'TARGET_INPUT_REQUIRED', 'ACCESSIBILITY_PRIMARY_CHOICE_REQUIRED'],
        ['ACCESSIBILITY_CHOICE_STALE', 'TARGET_INPUT_REQUIRED', null],
      ]);
    });

    it('never plans standards beside an exception: the publisher keeps one, and the other is not imported', async () => {
      const file = [epub(a11y('81', '85', '75'))];
      const { result: pending } = await resolveExecutable(file);
      const choice = blockerFinding(pending, 'ACCESSIBILITY_CHOICE_REQUIRED');

      expect(choice?.code).toBe('ACCESSIBILITY_STANDARD_EXCEPTION_CHOICE_REQUIRED');

      const standards = await resolveExecutable(file, {
        inputs: { accessibilityChoices: { [choice?.key ?? '']: ONIX_ACCESSIBILITY_KEEP_STANDARDS } },
      });
      const exception = await resolveExecutable(file, {
        inputs: { accessibilityChoices: { [choice?.key ?? '']: ONIX_ACCESSIBILITY_KEEP_EXCEPTION } },
      });

      expect(createdFields(standards.result)).toEqual({
        ...none,
        accessibilityStandard: Wcag21Aa,
        accessibilityReportUrl: '',
      });
      expect(createdFields(exception.result)).toEqual({
        ...none,
        accessibilityException: MicroEnterprises,
        accessibilityReportUrl: '',
      });
    });

    it('never invents a primary standard for an additional one: the Publication is created without it once that is acknowledged', async () => {
      const file = [epub(a11y('04', '85'))];
      const { result: pending } = await resolveExecutable(file);
      const loss = blockerFinding(pending, 'ACCESSIBILITY_ACKNOWLEDGEMENT_REQUIRED');

      expect(accessibilityBlockers(pending)).toEqual([
        [
          'ACCESSIBILITY_ACKNOWLEDGEMENT_REQUIRED',
          'TARGET_UNREPRESENTABLE',
          'ACCESSIBILITY_ADDITIONAL_WITHOUT_PRIMARY',
        ],
      ]);
      expect(pending.plan).toBeNull();

      const { result } = await resolveExecutable(file, {
        inputs: { accessibilityChoices: { [loss?.key ?? '']: ONIX_ACCESSIBILITY_ACKNOWLEDGED } },
      });

      expect(createdFields(result)).toEqual({ ...none, accessibilityReportUrl: '' });
      expect(result.sidecar.accessibilityActions?.[0].omitted).toEqual([
        expect.objectContaining({ value: EpubA11Y11Aa, reason: 'NO_PRIMARY_STANDARD' }),
      ]);
    });

    it('keeps limited accessibility in view beside a standard, and keeps the standard only once that loss is acknowledged', async () => {
      const file = [epub(featureXml('09', '09', ['Charts have no text alternative']) + a11y('81', '85'))];
      const { result: pending } = await resolveExecutable(file);
      const loss = blockerFinding(pending, 'ACCESSIBILITY_ACKNOWLEDGEMENT_REQUIRED');

      expect(loss?.code).toBe('ACCESSIBILITY_STATUS_NOT_REPRESENTED');
      expect(pending.sidecar.findings?.map(({ code }) => code)).toContain('ACCESSIBILITY_FACT_NOT_REPRESENTED');

      const { result } = await resolveExecutable(file, {
        inputs: { accessibilityChoices: { [loss?.key ?? '']: ONIX_ACCESSIBILITY_ACKNOWLEDGED } },
      });

      expect(createdFields(result)).toEqual({ ...none, accessibilityStandard: Wcag21Aa, accessibilityReportUrl: '' });
    });

    it('holds a material ProductFormFeature until its loss is acknowledged, and stores it nowhere', async () => {
      const file = [epub(featureXml('14', '01', ['UN3481 lithium ion batteries']))];
      const { result: pending } = await resolveExecutable(file);
      const loss = blockerFinding(pending, 'PRODUCT_FORM_FEATURE_ACKNOWLEDGEMENT_REQUIRED');

      expect(accessibilityBlockers(pending)).toEqual([
        [
          'PRODUCT_FORM_FEATURE_ACKNOWLEDGEMENT_REQUIRED',
          'TARGET_UNREPRESENTABLE',
          'PRODUCT_FORM_FEATURE_NOT_REPRESENTED',
        ],
      ]);
      expect(loss).toMatchObject({ family: 'PRODUCT_FORM_FEATURE', resolution: { kind: 'ACKNOWLEDGE' } });

      const { result } = await resolveExecutable(file, {
        inputs: { accessibilityChoices: { [loss?.key ?? '']: ONIX_ACCESSIBILITY_ACKNOWLEDGED } },
      });

      expect(result.plan).not.toBeNull();
      expect(JSON.stringify(result.plan?.works)).not.toContain('UN3481');
    });
  });

  /*
   * Correction 1 of the #222 review, CR-2: an answer is bound to the exact source fact the publisher saw. A fact changed at
   * the same path is another finding: the earlier answer is stale, and the current finding is asked afresh.
   */
  describe('answers bound to the exact facts (#222 review CR-2)', () => {
    const material = (
      type = '14',
      value = '01',
      description = 'UN3481 lithium ion batteries',
      opening = '<ProductFormFeature>',
    ) => featureXml(type, value, [description]).replace('<ProductFormFeature>', opening);
    const answering = (key: string | undefined, answer: string) => ({
      inputs: { accessibilityChoices: { [key ?? '']: answer } },
    });

    it('never lets an acknowledgement given for one material fact authorise the loss of a changed fact at the same path', async () => {
      const { result: first } = await resolveExecutable([epub(material())]);
      const acknowledged = blockerFinding(first, 'PRODUCT_FORM_FEATURE_ACKNOWLEDGEMENT_REQUIRED');
      const answer = answering(acknowledged?.key, ONIX_ACCESSIBILITY_ACKNOWLEDGED);

      // For the fact it was given for, the acknowledgement stands.
      expect((await resolveExecutable([epub(material())], answer)).result.plan).not.toBeNull();

      for (const changed of [
        material('14', '02'),
        material('21', '01'),
        material('14', '01', 'UN3090 lithium metal batteries'),
        material(
          '14',
          '01',
          'UN3481 lithium ion batteries',
          '<ProductFormFeature datestamp="20260923" sourcename="Distributor" sourcetype="02">',
        ),
      ]) {
        const { result } = await resolveExecutable([epub(changed)], answer);
        const current = result.sidecar.findings?.find(({ family }) => family === 'PRODUCT_FORM_FEATURE');

        expect(current?.locations).toEqual(acknowledged?.locations);
        expect(current?.key).not.toBe(acknowledged?.key);
        expect(current?.answer).toEqual({ state: 'UNANSWERED' });
        expect(result.plan).toBeNull();
        expect(accessibilityBlockers(result)).toEqual([
          [
            'PRODUCT_FORM_FEATURE_ACKNOWLEDGEMENT_REQUIRED',
            'TARGET_UNREPRESENTABLE',
            'PRODUCT_FORM_FEATURE_NOT_REPRESENTED',
          ],
          ['ACCESSIBILITY_CHOICE_STALE', 'TARGET_INPUT_REQUIRED', null],
        ]);
        expect(result.sidecar.blockers.find(({ code }) => code === 'ACCESSIBILITY_CHOICE_STALE')?.detail).toEqual({
          findingKey: acknowledged?.key,
          answer: ONIX_ACCESSIBILITY_ACKNOWLEDGED,
        });
      }
    });

    it('asks again for a status acknowledgement once its limitation prose changes', async () => {
      const status = (prose: string) => epub(featureXml('09', '09', [prose]) + a11y('81', '85'));
      const { result: first } = await resolveExecutable([status('Charts have no text alternative')]);
      const acknowledged = blockerFinding(first, 'ACCESSIBILITY_ACKNOWLEDGEMENT_REQUIRED');
      const { result } = await resolveExecutable(
        [status('Tables have no headers')],
        answering(acknowledged?.key, ONIX_ACCESSIBILITY_ACKNOWLEDGED),
      );

      expect(result.plan).toBeNull();
      expect(accessibilityBlockers(result)).toEqual([
        ['ACCESSIBILITY_ACKNOWLEDGEMENT_REQUIRED', 'TARGET_UNREPRESENTABLE', 'ACCESSIBILITY_STATUS_NOT_REPRESENTED'],
        ['ACCESSIBILITY_CHOICE_STALE', 'TARGET_INPUT_REQUIRED', null],
      ]);
    });

    it('asks again for a value choice once a fact behind it changes', async () => {
      const file = (prose: string) => epub(featureXml('09', '81', [prose]) + a11y('82', '85'));
      const { result: first } = await resolveExecutable([file('Audited 2025')]);
      const choice = blockerFinding(first, 'ACCESSIBILITY_CHOICE_REQUIRED');
      const answer = answering(choice?.key, Wcag21Aa);

      expect((await resolveExecutable([file('Audited 2025')], answer)).result.plan).not.toBeNull();

      const { result } = await resolveExecutable([file('Audited 2026')], answer);

      expect(result.plan).toBeNull();
      expect(accessibilityBlockers(result)).toEqual([
        ['ACCESSIBILITY_CHOICE_REQUIRED', 'TARGET_INPUT_REQUIRED', 'ACCESSIBILITY_PRIMARY_CHOICE_REQUIRED'],
        ['ACCESSIBILITY_CHOICE_STALE', 'TARGET_INPUT_REQUIRED', null],
      ]);
    });
  });

  describe('manifestations', () => {
    it.each([
      ['BC', Paperback],
      ['BB', Hardback],
    ])("keeps a %s Product's type-09 facts as evidence and plans none of them", async (form_, type) => {
      const { result } = await resolve(
        [
          product({
            ref: 'print',
            descriptive: form(form_, [], '00', a11y('81', '85', '75') + featureXml('09', '96', [REPORT])),
          }),
        ],
        { inputs: monograph },
      );
      const [action] = result.sidecar.accessibilityActions ?? [];

      expect(accessibilityBlockers(result)).toEqual([]);
      expect(action).toMatchObject({ publicationType: type, action: { kind: 'CREATE' }, resolved: none });
      expect(action.omitted.map(({ reason }) => reason)).toEqual([
        'PHYSICAL_PUBLICATION',
        'PHYSICAL_PUBLICATION',
        'PHYSICAL_PUBLICATION',
      ]);
      expect(result.sidecar.findings?.find(({ code }) => code === 'ACCESSIBILITY_NOT_PROJECTED')).toMatchObject({
        blocking: false,
      });
    });

    it('fails closed on an audiobook report URL, and plans no audiobook standard', async () => {
      const withReport = await resolve(
        [product({ ref: 'mp3', descriptive: form('AJ', ['A103'], '00', featureXml('09', '96', [REPORT])) })],
        { inputs: monograph },
      );
      const withStandard = await resolve(
        [product({ ref: 'wav', descriptive: form('AJ', ['A104'], '00', a11y('81', '85')) })],
        { inputs: monograph },
      );

      expect(accessibilityBlockers(withReport.result)).toEqual([
        ['ACCESSIBILITY_PREFLIGHT_GAP', 'PREFLIGHT_GAP', 'ACCESSIBILITY_AUDIO_REPORT_URL_UNRESOLVED'],
      ]);
      expect(withReport.result.sidecar.accessibilityActions?.[0]).toMatchObject({
        publicationType: Mp3,
        resolved: null,
        action: { kind: 'BLOCKED' },
      });
      expect(accessibilityBlockers(withStandard.result)).toEqual([]);
      expect(withStandard.result.sidecar.accessibilityActions?.[0]).toMatchObject({
        publicationType: Wav,
        resolved: none,
      });
    });

    it("decides each Product's accessibility alone, never the Work's", async () => {
      const work = relatedWork(workIdentifier('06', '10.1234/work'));
      const { result } = await resolve(
        [
          epub(a11y('81', '85', '04'), { related: work }),
          product({
            ref: 'pdf',
            identifiers: [pid('15', ISBN_B)],
            descriptive: form('EA', ['E107'], '00', a11y('82', '86', '05')),
            related: work,
          }),
        ],
        { inputs: monograph },
      );

      expect(result.sidecar.workGroups).toHaveLength(1);
      expect(
        result.sidecar.accessibilityActions?.map(({ publicationType, resolved }) => [publicationType, resolved]),
      ).toEqual([
        [Epub, { ...none, accessibilityStandard: Wcag21Aa, accessibilityAdditionalStandard: EpubA11Y11Aa }],
        [Pdf, { ...none, accessibilityStandard: Wcag22Aaa, accessibilityAdditionalStandard: 'PDF_UA1' }],
      ]);
    });

    it('asks about accessibility for the one type the publisher chose, only once it is chosen', async () => {
      const open = product({ ref: 'open', descriptive: form('EA', [], '00', a11y('81', '85', '05')) });
      const pending = await resolve([open], { inputs: monograph });

      expect(accessibilityBlockers(pending.result)).toEqual([]);
      expect(pending.result.sidecar.accessibilityActions).toEqual([]);

      const [productKey] = pending.sourcePlan.products.map((node) => node.productKey);
      const asHtml = await resolve([open], { inputs: { ...monograph, manifestationChoices: { [productKey]: Html } } });
      const asPdf = await resolve([open], { inputs: { ...monograph, manifestationChoices: { [productKey]: Pdf } } });

      expect(accessibilityBlockers(asHtml.result)).toEqual([
        ['ACCESSIBILITY_ACKNOWLEDGEMENT_REQUIRED', 'TARGET_UNREPRESENTABLE', 'ACCESSIBILITY_ADDITIONAL_INCOMPATIBLE'],
      ]);
      expect(accessibilityBlockers(asPdf.result)).toEqual([]);
      expect(asPdf.result.sidecar.accessibilityActions?.[0].resolved).toEqual({
        ...none,
        accessibilityStandard: Wcag21Aa,
        accessibilityAdditionalStandard: 'PDF_UA1',
      });
      // Only the chosen type's findings are the plan's: every other candidate type's stay in the reduction alone.
      const otherTypes = asPdf.accessibility.findings.filter(
        ({ publicationType }) => publicationType !== null && publicationType !== Pdf,
      );

      expect(otherTypes.map(({ code }) => code)).toContain('ACCESSIBILITY_ADDITIONAL_INCOMPATIBLE');
      expect(asPdf.result.sidecar.findings?.filter(({ key }) => otherTypes.some((other) => other.key === key))).toEqual(
        [],
      );
      expect(asHtml.result.sidecar.findings?.map(({ code }) => code)).toEqual([
        'ACCESSIBILITY_ADDITIONAL_INCOMPATIBLE',
      ]);
    });
  });

  describe('Publications already in Thoth', () => {
    const WORK_ID = 'w-1';
    const existing = async (features: string, accessibility: ExistingPublication['accessibility'] = {}, inputs = {}) =>
      resolve([epub(features, { related: relatedWork(workIdentifier('06', WORK_DOI)) })], {
        matches: { [doiKey(WORK_DOI)]: [WORK_ID], [isbnKey(ISBN_A)]: [WORK_ID] },
        works: [
          existingWork(WORK_ID, {
            doi: WORK_DOI,
            publications: [{ id: 'p-1', type: Epub, isbn: ISBN_A, accessibility }],
          }),
        ],
        inputs,
      });

    it('reads back the accessibility an existing Publication holds, to compare and never to write', async () => {
      const { targets } = await existing('', {
        accessibilityStandard: Wcag21Aa,
        accessibilityAdditionalStandard: EpubA11Y11Aa,
        accessibilityReportUrl: REPORT,
      });

      expect(targets.works[0].publications[0].accessibility).toEqual({
        ...none,
        accessibilityStandard: Wcag21Aa,
        accessibilityAdditionalStandard: EpubA11Y11Aa,
        accessibilityReportUrl: REPORT,
      });
    });

    it('keeps what the Publication holds where the file states no accessibility', async () => {
      const { result } = await existing('', { accessibilityStandard: Wcag21Aa });

      expect(result.sidecar.executable).toBe(true);
      expect(result.sidecar.accessibilityActions?.[0].action).toEqual({
        kind: 'EXISTING_PRESERVED',
        publicationId: 'p-1',
        existing: { ...none, accessibilityStandard: Wcag21Aa },
      });
      expect(result.sidecar.findings?.find(({ code }) => code === 'ACCESSIBILITY_EXISTING_PRESERVED')).toMatchObject({
        family: 'ACCESSIBILITY_RECONCILIATION',
        blocking: false,
      });
    });

    it('does nothing where the Publication already holds exactly what the file states', async () => {
      const { result } = await existing(a11y('81', '85') + featureXml('09', '96', [REPORT]), {
        accessibilityStandard: Wcag21Aa,
        accessibilityReportUrl: REPORT,
      });

      expect(result.sidecar.executable).toBe(true);
      expect(result.sidecar.accessibilityActions?.[0].action).toMatchObject({ kind: 'NOOP', publicationId: 'p-1' });
    });

    it('plans filling empty fields, but defers it: no existing Publication is ever updated', async () => {
      const { result } = await existing(a11y('81', '85') + featureXml('09', '96', [REPORT]), {
        accessibilityStandard: Wcag21Aa,
      });

      expect(result.sidecar.executable).toBe(false);
      expect(accessibilityBlockers(result)).toEqual([
        [
          'ACCESSIBILITY_EXISTING_ENRICHMENT_DEFERRED',
          'EXECUTION_DEFERRED',
          'ACCESSIBILITY_EXISTING_ENRICHMENT_DEFERRED',
        ],
      ]);
      expect(result.sidecar.accessibilityActions?.[0].action).toEqual({
        kind: 'ENRICHMENT_DEFERRED',
        publicationId: 'p-1',
        existing: { ...none, accessibilityStandard: Wcag21Aa },
        fields: ['accessibilityReportUrl'],
      });

      const empty = await existing(a11y('82', '85'));

      expect(empty.result.sidecar.accessibilityActions?.[0].action).toMatchObject({
        kind: 'ENRICHMENT_DEFERRED',
        fields: ['accessibilityStandard'],
      });
    });

    it('never overwrites a different value, nor fills a field the Publication could then not hold', async () => {
      const differs = await existing(a11y('82', '85'), { accessibilityStandard: Wcag21Aa });
      const exception = await existing(a11y('82', '85'), { accessibilityException: MicroEnterprises });

      expect(accessibilityBlockers(differs.result)).toEqual([
        ['ACCESSIBILITY_EXISTING_CONFLICT', 'TARGET_INPUT_REQUIRED', 'ACCESSIBILITY_EXISTING_CONFLICT'],
      ]);
      expect(differs.result.sidecar.accessibilityActions?.[0].action).toMatchObject({
        kind: 'CONFLICT',
        fields: ['accessibilityStandard'],
      });
      expect(exception.result.sidecar.accessibilityActions?.[0].action).toMatchObject({
        kind: 'CONFLICT',
        fields: ['accessibilityStandard'],
      });
    });

    it('asks which of several values the existing Publication is compared with, and never asks for a loss it does not cause', async () => {
      const file = featureXml('09', '09', ['Some limits']) + a11y('81', '82', '85');
      const pending = await existing(file, { accessibilityStandard: Wcag22Aa });
      const choice = blockerFinding(pending.result, 'ACCESSIBILITY_CHOICE_REQUIRED');

      expect(accessibilityBlockers(pending.result)).toEqual([
        ['ACCESSIBILITY_CHOICE_REQUIRED', 'TARGET_INPUT_REQUIRED', 'ACCESSIBILITY_PRIMARY_CHOICE_REQUIRED'],
      ]);

      const same = await existing(
        file,
        { accessibilityStandard: Wcag22Aa },
        { accessibilityChoices: { [choice?.key ?? '']: Wcag22Aa } },
      );
      const omitted = await existing(
        file,
        { accessibilityStandard: Wcag22Aa },
        {
          accessibilityChoices: { [choice?.key ?? '']: ONIX_ACCESSIBILITY_OMIT },
        },
      );

      expect(same.result.sidecar.accessibilityActions?.[0].action.kind).toBe('NOOP');
      expect(omitted.result.sidecar.accessibilityActions?.[0].action.kind).toBe('EXISTING_PRESERVED');
      expect(accessibilityBlockers(same.result)).toEqual([]);
    });

    it('holds nothing back for a material product fact of a Publication it does not create', async () => {
      const { result } = await existing(featureXml('14', '01'), { accessibilityStandard: Wcag21Aa });

      expect(accessibilityBlockers(result)).toEqual([]);
      expect(result.sidecar.executable).toBe(true);
      expect(result.sidecar.findings?.find(({ family }) => family === 'PRODUCT_FORM_FEATURE')).toMatchObject({
        blocking: true,
        answer: { state: 'UNANSWERED' },
      });
    });
  });

  it('plans no accessibility without its reduction, and holds every accessibility answer as stale', async () => {
    const { result } = await resolveExecutable([epub(a11y('81', '85'))], {
      withAccessibility: false,
      inputs: { accessibilityChoices: { anything: ONIX_ACCESSIBILITY_ACKNOWLEDGED } },
    });

    expect(result.sidecar.accessibility).toBeUndefined();
    expect(result.sidecar.accessibilityActions).toBeUndefined();
    expect(accessibilityBlockers(result)).toEqual([['ACCESSIBILITY_CHOICE_STALE', 'TARGET_INPUT_REQUIRED', null]]);
  });
});
