import { parse } from '@5stones/onix';
import { describe, expect, it, vi } from 'vitest';

import type { WorkEntity } from '@/src/entities/work/model/work.types';

import { PublicationType } from '../../constants/publications';
import { WorkTypes } from '../../constants/work';
import type { ImportIdentifier, ImportPlan } from '../../types';
import type { OnixAdaptedGroup, OnixPlanInputs } from '../../types/onixPlanning';
import { importIdentifierKey } from '../../utils/importPreflight/identifiers';
import { getDefaultPublication } from '../../utils/publications';
import { getDefaultTitle, getDefaultWork } from '../../utils/work';
import type { ExtendedONIXMessageRoot } from './interfaces';
import { planOnixSource } from './onixPlanning';
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
};

const product = ({
  ref,
  notification = '03',
  identifiers = [],
  descriptive = form('BC'),
  related = '',
  envelope = '',
  imprint = 'Example Imprint',
}: ProductSpec) =>
  `<Product><RecordReference>${ref}</RecordReference><NotificationType>${notification}</NotificationType>${envelope}${identifiers.join('')}${descriptive}` +
  `<PublishingDetail><Imprint><ImprintName>${imprint}</ImprintName></Imprint></PublishingDetail>${related ? `<RelatedMaterial>${related}</RelatedMaterial>` : ''}</Product>`;

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
    titles: [getDefaultTitle({ canonical: true, title: `Existing ${id}` })],
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
  const sourcePlan = planOnixSource(message(products, header));
  const lookup = fakeLookup(matches, works);
  const targets = await resolveOnixTargets(sourcePlan, lookup, PUBLISHER_ID);
  const result = resolveOnixImportPlan({
    sourcePlan,
    targets,
    inputs: { ...EMPTY_ONIX_PLAN_INPUTS, ...inputs },
    imprints: IMPRINTS,
  });

  return { sourcePlan, targets, lookup, result };
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
        title: 'Existing w-1',
        publications: [{ publicationId: 'p-1', type: Paperback, isbn: '978-1-80000-001-8' }],
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
      expect(omitted.result.sidecar.products[0]).toMatchObject({
        action: 'OMIT/EXCLUDED',
        evidence: [{ kind: 'MANIFESTATION_OMITTED', reason: 'PUBLISHER_CHOICE' }],
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
      });
      expect(chosen.result.sidecar.blockers).toEqual([]);
      expect(codes(outside.result)).toEqual(['MANIFESTATION_INPUT_REQUIRED']);
    });

    it('needs an explicit acknowledgement before a package manifestation is omitted', async () => {
      const file = [product({ ref: 'box', identifiers: [pid('15', ISBN_A)], descriptive: form('SA', [], '10') })];
      const productKey = `product:gtin13:${ISBN_A}`;
      const pending = await resolve(file, { inputs: { fileWorkType: BookSet } });
      const acknowledged = await resolve(file, {
        inputs: { fileWorkType: BookSet, manifestationChoices: { [productKey]: 'OMIT' } },
      });

      expect(codes(pending.result)).toEqual(['MANIFESTATION_ACKNOWLEDGEMENT_REQUIRED']);
      expect(acknowledged.result.sidecar.products[0]).toMatchObject({
        action: 'OMIT/EXCLUDED',
        evidence: [{ kind: 'MANIFESTATION_OMITTED', reason: 'ACKNOWLEDGED' }],
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
      expect(resolved.result.sidecar.blockers).toEqual([]);
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

  describe('the executable plan', () => {
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
    ): OnixAdaptedGroup => ({
      groupKey,
      workId,
      conflictingFields,
      publications,
    });

    it('carries only faithfully executable new Works, with their resolved type, edition, Work DOI and chosen Publications', async () => {
      const shared = relatedWork(workIdentifier('01', 'W-1', 'id'), workIdentifier('06', '10.1234/work'));
      const sourcePlan = planOnixSource(
        message([
          product({ ref: 'pb', identifiers: [pid('15', ISBN_A)], related: shared }),
          product({ ref: 'x', identifiers: [pid('15', ISBN_B)], descriptive: form('EB', ['E113']), related: shared }),
          product({
            ref: 'present',
            identifiers: [pid('15', ISBN_C)],
            related: relatedWork(workIdentifier('06', '10.1234/present')),
          }),
        ]),
      );
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
        series: [
          {
            name: 'Series',
            target: { kind: 'existing', seriesId: 's-1' },
            members: [{ workId: 'work-new', orderNumber: 1 }],
          },
        ],
      };
      const inputs: OnixPlanInputs = {
        ...EMPTY_ONIX_PLAN_INPUTS,
        fileWorkType: Monograph,
        manifestationChoices: { [`product:gtin13:${ISBN_B}`]: Xml },
      };

      expect(adaptableGroupKeys(sourcePlan, targets, IMPRINTS)).toEqual([newGroup.groupKey]);

      const { plan, sidecar } = resolveOnixImportPlan({
        sourcePlan,
        targets,
        inputs,
        imprints: IMPRINTS,
        candidatePlan,
        adaptation: [
          adapted(newGroup.groupKey, 'work-new', {
            [`product:gtin13:${ISBN_A}`]: { [Paperback]: { publication: paperback, issues: [] } },
            [`product:gtin13:${ISBN_B}`]: {
              [Html]: { publication: html, issues: [] },
              [Xml]: { publication: xml, issues: [] },
            },
          }),
        ],
      });

      expect(sidecar.executable).toBe(true);
      expect(presentGroup.groupKey).not.toBe(newGroup.groupKey);
      expect(plan?.works).toEqual([
        { ...candidatePlan.works[0], type: Monograph, edition: 1, doi: WORK_DOI, publications: [paperback, xml] },
      ]);
      expect(plan?.chapters).toEqual(candidatePlan.chapters);
      expect(plan?.series).toEqual(candidatePlan.series);
      expect(plan?.onix).toBe(sidecar);
      expect(
        sidecar.workGroups.map(({ groupKey, plannedWorkId, target }) => [groupKey, plannedWorkId, target]),
      ).toEqual([
        [newGroup.groupKey, 'work-new', 'NEW_WORK'],
        [presentGroup.groupKey, null, 'EXISTING_WORK'],
      ]);
    });

    it("gives a new Work's chapters the edition the publisher entered for that Work", async () => {
      const sourcePlan = planOnixSource(
        message([
          product({
            ref: 'rev',
            identifiers: [pid('15', ISBN_A)],
            descriptive: form('BC', [], '00', '<EditionType>REV</EditionType>'),
          }),
        ]),
      );
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
        candidatePlan,
        adaptation: [
          adapted(groupKey, 'work-rev', {
            [`product:gtin13:${ISBN_A}`]: { [Paperback]: { publication: paperback, issues: [] } },
          }),
        ],
      });

      expect(plan?.works.map(({ id, edition }) => [id, edition])).toEqual([['work-rev', 3]]);
      expect(plan?.chapters.map(({ id, edition }) => [id, edition])).toEqual([['chapter-1', 3]]);
    });

    it('produces no plan while anything blocks, and blocks a grouped Work whose adapted facts disagree', async () => {
      const shared = relatedWork(workIdentifier('01', 'W-1', 'id'));
      const sourcePlan = planOnixSource(
        message([
          product({ ref: 'pb', identifiers: [pid('15', ISBN_A)], related: shared }),
          product({ ref: 'hb', identifiers: [pid('15', ISBN_B)], descriptive: form('BB'), related: shared }),
        ]),
      );
      const targets = await resolveOnixTargets(sourcePlan, fakeLookup(), PUBLISHER_ID);
      const { groupKey } = sourcePlan.groups[0];

      const { plan, sidecar } = resolveOnixImportPlan({
        sourcePlan,
        targets,
        inputs: { ...EMPTY_ONIX_PLAN_INPUTS, fileWorkType: Monograph },
        imprints: IMPRINTS,
        candidatePlan: { works: [candidate('work-1')], chapters: [], series: [] },
        adaptation: [adapted(groupKey, 'work-1', {}, ['titles'])],
      });

      expect(plan).toBeNull();
      expect(sidecar.blockers).toEqual([
        expect.objectContaining({ code: 'GROUPED_WORK_FACT_CONFLICT', groupKey, detail: { fields: ['titles'] } }),
      ]);
    });
  });
});
