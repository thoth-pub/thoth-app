import { parse } from '@5stones/onix';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AbstractService } from '@/src/entities/abstract/api/abstract.service';
import { AffiliationService } from '@/src/entities/affiliation/api/affiliation.service';
import { ContributionService } from '@/src/entities/contribution/api/contribution.service';
import { ContributorService } from '@/src/entities/contributor';
import { FundingService } from '@/src/entities/funding/api/funding.service';
import { LanguageService } from '@/src/entities/language/api/language.service';
import { LocationService } from '@/src/entities/locations/api/location.service';
import { PriceService } from '@/src/entities/price/api/price.service';
import { PublicationService } from '@/src/entities/publication/api/publication.service';
import { ReferenceService } from '@/src/entities/reference/api/reference.service';
import { SeriesService } from '@/src/entities/series';
import { SubjectService } from '@/src/entities/subject/api/subject.service';
import { TitleService } from '@/src/entities/title/api/title.service';
import { WorkService } from '@/src/entities/work/api/work.service';
import type { WorkEntity } from '@/src/entities/work/model/work.types';
import { GraphqlService } from '@/src/shared/api/graphqlService';

import { currencyOptions, languageOptions, licenseOptions } from '../../constants';
import { PublicationType } from '../../constants/publications';
import { WorkTypes } from '../../constants/work';
import type { ImportIdentifier, OnixPlanInputs } from '../../types';
import { importIdentifierKey } from '../../utils/importPreflight/identifiers';
import { getDefaultPublication } from '../../utils/publications';
import { getDefaultTitle, getDefaultWork } from '../../utils/work';
import type { ExtendedONIXMessageRoot } from './interfaces';
import { planOnixSource } from './onixPlanning';
import {
  adaptableGroupKeys,
  EMPTY_ONIX_PLAN_INPUTS,
  resolveOnixImportPlan,
  resolveOnixTargets,
} from './onixTargetResolution';
import XMLParser from './XMLParser';

/**
 * The identity, Work and manifestation planning slice (thoth-app#182), end to end: a real ONIX document
 * parsed by `@5stones/onix`, planned from the file alone, reconciled against exact target evidence, adapted
 * by the real `XMLParser`, resolved with the publisher's decisions, and - only when the resolver offers a
 * plan - executed by the real `WorkService` over a stubbed GraphQL transport. Assertions are about the
 * mutations the app would send, and about the mutations it would not.
 */

const IMPRINT_ID = '11111111-1111-1111-1111-111111111111';
const IMPRINT_NAME = 'Example Imprint';
const IMPRINTS = [{ label: IMPRINT_NAME, value: IMPRINT_ID }];
const PUBLISHER_ID = 'publisher-1';

const ISBN_PB = '9781800000018';
const ISBN_PDF = '9781800000025';
const ISBN_EPUB = '9781800000032';
const ISBN_OTHER = '9781800000049';

const { EditedBook, Monograph } = WorkTypes.enum;
const { Epub, Html, Paperback, Pdf } = PublicationType.enum;

const pid = (type: string, value: string, name?: string) =>
  `<ProductIdentifier><ProductIDType>${type}</ProductIDType>${name ? `<IDTypeName>${name}</IDTypeName>` : ''}<IDValue>${value}</IDValue></ProductIdentifier>`;
const alternativeFormat = (isbn: string) =>
  `<RelatedProduct><ProductRelationCode>06</ProductRelationCode>${pid('15', isbn)}</RelatedProduct>`;
const manifestationOf = (doi: string) =>
  `<RelatedWork><WorkRelationCode>01</WorkRelationCode><WorkIdentifier><WorkIDType>06</WorkIDType><IDValue>${doi}</IDValue></WorkIdentifier></RelatedWork>`;

type ProductSpec = {
  ref: string;
  notification?: string;
  identifiers?: string[];
  form: string;
  title?: string;
  edition?: string;
  related?: string;
  content?: string;
  envelope?: string;
};

const onixProduct = ({
  ref,
  notification = '03',
  identifiers = [],
  form,
  title = 'A Shared Work',
  edition = '',
  related = '',
  content = '',
  envelope = '',
}: ProductSpec) => `
  <Product>
    <RecordReference>${ref}</RecordReference>
    <NotificationType>${notification}</NotificationType>${envelope}
    ${identifiers.join('')}
    <DescriptiveDetail>
      <ProductComposition>00</ProductComposition>
      ${form}
      <TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText language="eng">${title}</TitleText></TitleElement></TitleDetail>
      ${edition}
      <Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language>
    </DescriptiveDetail>
    ${content}
    <PublishingDetail><Imprint><ImprintName>${IMPRINT_NAME}</ImprintName></Imprint><PublishingStatus>02</PublishingStatus></PublishingDetail>
    ${related ? `<RelatedMaterial>${related}</RelatedMaterial>` : ''}
  </Product>`;

const onix = (products: string[], sender = '<SenderName>Example Press</SenderName>') =>
  `<?xml version="1.0" encoding="UTF-8"?><ONIXMessage release="3.0" xmlns="http://ns.editeur.org/onix/3.0/reference"><Header><Sender>${sender}</Sender><SentDateTime>20260913T1200</SentDateTime></Header>${products.join('')}</ONIXMessage>`;

const BC = '<ProductForm>BC</ProductForm>';
const PDF = '<ProductForm>EB</ProductForm><ProductFormDetail>E107</ProductFormDetail>';
const EPUB = '<ProductForm>EB</ProductForm><ProductFormDetail>E101</ProductFormDetail>';

/** A University of London Press style Work: print and two e-book manifestations, one without an ISBN of its own. */
const multiManifestation = (overrides: { pdfTitle?: string } = {}) => [
  onixProduct({
    ref: 'pb',
    identifiers: [pid('15', ISBN_PB)],
    form: BC,
    related: manifestationOf('10.14296/work') + alternativeFormat(ISBN_PDF),
  }),
  onixProduct({
    ref: 'pdf',
    identifiers: [pid('15', ISBN_PDF)],
    form: PDF,
    title: overrides.pdfTitle,
    related: manifestationOf('10.14296/work'),
  }),
  onixProduct({
    ref: 'epub',
    identifiers: [pid('01', 'UOLP-EPUB-1', 'UoLP product code')],
    form: EPUB,
    related: manifestationOf('https://doi.org/10.14296/work'),
  }),
];

type MutationCall = { operation: string; variables: Record<string, unknown> };

type Scenario = {
  matches?: Record<string, string[]>;
  works?: WorkEntity[];
  inputs?: Partial<OnixPlanInputs>;
};

describe('ONIX identity, Work and manifestation planning, end to end', () => {
  let mutations: MutationCall[];
  let workService: WorkService;
  let contributorService: ContributorService;

  const operationNameOf = (document: unknown) =>
    (document as { definitions: { name?: { value: string } }[] }).definitions[0].name?.value ?? 'unknown';

  beforeEach(() => {
    mutations = [];
    let created = 0;

    const graphqlService = {
      query: vi.fn().mockResolvedValue({ contributors: [] }),
      mutation: vi.fn(async (document: unknown, variables: Record<string, unknown>) => {
        const operation = operationNameOf(document);
        mutations.push({ operation, variables });

        switch (operation) {
          case 'CreateWork':
            created += 1;
            return { createWork: { workId: `created-${created}`, titles: [] } };
          case 'CreateTitle':
            return { createTitle: { titleId: `title-${mutations.length}`, ...(variables.data as object) } };
          case 'CreateLanguage':
            return { createLanguage: { languageId: `language-${mutations.length}`, ...(variables.data as object) } };
          case 'CreatePublication':
            return {
              createPublication: {
                publicationId: `publication-${mutations.length}`,
                ...(variables.data as object),
                work: { titles: [], doi: '', imprint: { publisher: { publisherName: IMPRINT_NAME } } },
                prices: [],
                locations: [],
              },
            };
          case 'CreateWorkRelation':
            return { createWorkRelation: { workRelationId: `relation-${mutations.length}` } };
          default:
            return {};
        }
      }),
    } as unknown as GraphqlService;

    contributorService = new ContributorService(graphqlService);
    workService = new WorkService({
      graphqlService,
      fundingService: new FundingService(graphqlService),
      subjectService: new SubjectService(graphqlService),
      contributionService: new ContributionService({
        graphqlService,
        contributorService,
        affiliationService: new AffiliationService(graphqlService),
      }),
      publicationService: new PublicationService({
        graphqlService,
        locationService: new LocationService(graphqlService),
        priceService: new PriceService(graphqlService),
        fileStorage: { uploadWorkCover: vi.fn() } as never,
      }),
      languageService: new LanguageService(graphqlService),
      seriesService: new SeriesService(graphqlService),
      referenceService: new ReferenceService(graphqlService),
      titleService: new TitleService(graphqlService),
      abstractService: new AbstractService(graphqlService),
    });
  });

  /** What XMLParse does with a validated source, step for step, with an exact-answer lookup standing in for Thoth. */
  const plan = async (
    products: string[],
    { matches = {}, works = [], inputs = {} }: Scenario = {},
    sender?: string,
  ) => {
    const adapter = parse(onix(products, sender)) as ExtendedONIXMessageRoot;
    const sourcePlan = planOnixSource(adapter);
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
    const getWork = vi.fn(async (workId: string) => works.find(({ id }) => id === workId) as WorkEntity);
    const targets = await resolveOnixTargets(sourcePlan, { findWorks, getWork }, PUBLISHER_ID);
    const parsed = await new XMLParser(
      adapter,
      IMPRINTS,
      licenseOptions,
      [],
      { getContributors: async () => [], getContributorsByOrcids: async () => [] } as never,
      { getInstitutions: async () => [] } as never,
      languageOptions,
      currencyOptions,
      { sourcePlan, adaptGroupKeys: adaptableGroupKeys(sourcePlan, targets, IMPRINTS) },
    ).parse();
    const resolved = resolveOnixImportPlan({
      sourcePlan,
      targets,
      inputs: { ...EMPTY_ONIX_PLAN_INPUTS, ...inputs },
      imprints: IMPRINTS,
      candidatePlan: parsed.data.plan,
      adaptation: parsed.data.onix?.groups,
    });

    return { sourcePlan, parsed, resolved, findWorks };
  };

  const named = (operation: string) => mutations.filter((call) => call.operation === operation);
  const data = (call: MutationCall) => call.variables.data as Record<string, unknown>;

  const execute = async (resolved: Awaited<ReturnType<typeof plan>>['resolved']) => {
    if (resolved.plan === null) throw new Error('the resolver offered no plan');

    await workService.bulkCreateWorks(resolved.plan);
  };

  describe('multi-manifestation grouping', () => {
    it('creates one Work with all three manifestations, once the WorkType is chosen, and never before', async () => {
      const pending = await plan(multiManifestation());
      const chosen = await plan(multiManifestation(), { inputs: { fileWorkType: EditedBook } });

      expect(pending.parsed.status).toBe('success');
      expect(pending.resolved.plan).toBeNull();
      expect(pending.resolved.sidecar.blockers.map(({ code }) => code)).toEqual(['WORK_TYPE_INPUT_REQUIRED']);

      await execute(chosen.resolved);

      expect(named('CreateWork')).toHaveLength(1);
      expect(data(named('CreateWork')[0])).toMatchObject({
        workType: EditedBook,
        edition: 1,
        doi: 'https://doi.org/10.14296/work',
        lccn: null,
        oclc: null,
      });
      expect(named('CreatePublication').map((call) => [data(call).publicationType, data(call).isbn ?? null])).toEqual([
        [Paperback, ISBN_PB],
        [Pdf, ISBN_PDF],
        [Epub, null],
      ]);
    });

    it('keeps the plan and the sidecar on one Work id, with every Product and its action', async () => {
      const { resolved } = await plan(multiManifestation(), { inputs: { fileWorkType: EditedBook } });

      expect(resolved.plan?.works).toHaveLength(1);
      expect(resolved.sidecar.workGroups).toEqual([
        expect.objectContaining({
          target: 'NEW_WORK',
          plannedWorkId: resolved.plan?.works[0].id,
          workType: { status: 'RESOLVED', type: EditedBook, provenance: 'USER_FILE_DEFAULT' },
        }),
      ]);
      expect(resolved.sidecar.products.map(({ action }) => action)).toEqual([
        'CREATE_PUBLICATION',
        'CREATE_PUBLICATION',
        'CREATE_PUBLICATION',
      ]);
    });

    it('blocks the grouped Work, and creates nothing, when its manifestations disagree on a Work-level fact', async () => {
      const { resolved } = await plan(multiManifestation({ pdfTitle: 'A Different Title' }), {
        inputs: { fileWorkType: EditedBook },
      });

      expect(resolved.plan).toBeNull();
      expect(resolved.sidecar.blockers).toEqual([
        expect.objectContaining({ code: 'GROUPED_WORK_FACT_CONFLICT', detail: { fields: ['titles'] } }),
      ]);
    });

    it('groups exactly the same way whatever order the file lists the manifestations in', async () => {
      const forwards = await plan(multiManifestation(), { inputs: { fileWorkType: EditedBook } });
      const backwards = await plan([...multiManifestation()].reverse(), { inputs: { fileWorkType: EditedBook } });

      expect(backwards.resolved.sidecar.workGroups.map(({ groupKey, productKeys }) => [groupKey, productKeys])).toEqual(
        forwards.resolved.sidecar.workGroups.map(({ groupKey, productKeys }) => [groupKey, productKeys]),
      );
      expect(backwards.resolved.plan?.works[0].publications.map(({ type }) => type).sort()).toEqual([
        Epub,
        Paperback,
        Pdf,
      ]);
    });
  });

  describe('identity scope, edition and manifestation', () => {
    it("never sends a Product DOI, LCCN or OCLC number as the Work's", async () => {
      const { resolved } = await plan(
        [
          onixProduct({
            ref: 'a',
            identifiers: [
              pid('15', ISBN_PB),
              pid('06', '10.9999/product'),
              pid('13', '2019012345'),
              pid('23', '1086123456'),
            ],
            form: BC,
          }),
        ],
        { inputs: { fileWorkType: Monograph } },
      );

      await execute(resolved);

      expect(data(named('CreateWork')[0])).toMatchObject({ doi: null, lccn: null, oclc: null });
    });

    it('sends the EditionNumber the file really states, where ONIX states it', async () => {
      const { resolved } = await plan(
        [
          onixProduct({
            ref: 'a',
            identifiers: [pid('15', ISBN_PB)],
            form: BC,
            edition: '<EditionNumber>2</EditionNumber>',
          }),
        ],
        {
          inputs: { fileWorkType: Monograph },
        },
      );

      await execute(resolved);

      expect(data(named('CreateWork')[0])).toMatchObject({ edition: 2, workType: Monograph });
    });

    it('creates no Publication for a format-less digital download until the publisher names the format', async () => {
      const file = [
        onixProduct({ ref: 'dl', identifiers: [pid('15', ISBN_PB)], form: '<ProductForm>ED</ProductForm>' }),
      ];
      const pending = await plan(file, { inputs: { fileWorkType: Monograph } });
      const chosen = await plan(file, {
        inputs: { fileWorkType: Monograph, manifestationChoices: { [`product:gtin13:${ISBN_PB}`]: Html } },
      });

      expect(pending.resolved.plan).toBeNull();
      await execute(chosen.resolved);
      expect(named('CreatePublication').map((call) => data(call).publicationType)).toEqual([Html]);
    });
  });

  describe('records that are not ordinary complete records', () => {
    it('never lets a delete, update or ownership notice reach a mutation, and imports the rest once they are excluded', async () => {
      const file = [
        onixProduct({ ref: 'live', identifiers: [pid('15', ISBN_PB)], form: BC }),
        onixProduct({
          ref: 'gone',
          notification: '05',
          identifiers: [pid('15', ISBN_OTHER)],
          form: BC,
          title: 'Deleted',
          envelope: '<DeletionText>Issued in error</DeletionText>',
        }),
        onixProduct({ ref: 'test', notification: '89', identifiers: [pid('15', ISBN_EPUB)], form: BC, title: 'Test' }),
      ];
      const pending = await plan(file, { inputs: { fileWorkType: Monograph } });
      const excluded = await plan(file, { inputs: { fileWorkType: Monograph, excludedRecordKeys: ['record:2'] } });

      expect(pending.resolved.plan).toBeNull();
      await execute(excluded.resolved);
      expect(named('CreateWork')).toHaveLength(1);
      expect(named('CreateTitle').map((call) => data(call).title)).toEqual(['A Shared Work']);
    });
  });

  const existing = (
    id: string,
    doi: string,
    publications: {
      id: string;
      type: (typeof PublicationType.enum)[keyof typeof PublicationType.enum];
      isbn?: string;
    }[],
    type = EditedBook,
  ) =>
    getDefaultWork({
      id,
      doi,
      type,
      imprintId: IMPRINT_ID,
      titles: [getDefaultTitle({ canonical: true, title: 'Already here' })],
      publications: publications.map(({ id: publicationId, type: publicationType, isbn = '' }) =>
        getDefaultPublication({ id: publicationId, type: publicationType, isbn }),
      ),
    });

  describe('existing targets', () => {
    it('creates nothing again for a manifestation that is already present, and still creates the new Work beside it', async () => {
      const { resolved } = await plan(
        [
          onixProduct({
            ref: 'present',
            identifiers: [pid('15', ISBN_PB)],
            form: BC,
            related: manifestationOf('10.1234/present'),
          }),
          onixProduct({ ref: 'new', identifiers: [pid('15', ISBN_OTHER)], form: BC, title: 'New Work' }),
        ],
        {
          matches: { 'doi:https://doi.org/10.1234/present': ['w-1'], [`isbn:${ISBN_PB}`]: ['w-1'] },
          works: [existing('w-1', 'https://doi.org/10.1234/present', [{ id: 'p-1', type: Paperback, isbn: ISBN_PB }])],
          inputs: { fileWorkType: Monograph },
        },
      );

      await execute(resolved);

      expect(resolved.sidecar.products.map(({ action }) => action)).toEqual(['ALREADY_PRESENT', 'CREATE_PUBLICATION']);
      expect(named('CreateWork')).toHaveLength(1);
      expect(named('CreateTitle').map((call) => data(call).title)).toEqual(['New Work']);
    });

    it('never turns a new manifestation of an existing Work into a new Work, and offers no plan while it stands', async () => {
      const file = [
        onixProduct({
          ref: 'pdf',
          identifiers: [pid('15', ISBN_PDF)],
          form: PDF,
          related: manifestationOf('10.1234/present'),
        }),
      ];
      const scenario = {
        matches: { 'doi:https://doi.org/10.1234/present': ['w-1'] },
        works: [existing('w-1', 'https://doi.org/10.1234/present', [{ id: 'p-1', type: Paperback, isbn: ISBN_PB }])],
        inputs: { fileWorkType: Monograph },
      };
      const { resolved } = await plan(file, scenario);

      expect(resolved.sidecar.products[0]).toMatchObject({
        action: 'CREATE_PUBLICATION_ON_EXISTING_WORK',
        executable: false,
      });
      expect(resolved.sidecar.workGroups[0]).toMatchObject({
        target: 'EXISTING_WORK',
        existingWorkId: 'w-1',
        plannedWorkId: null,
      });
      expect(resolved.plan).toBeNull();
    });
  });

  describe('Thoth ONIX round trip', () => {
    const WORK_ID = '11111111-2222-4333-8444-555555555555';
    const publication = (n: number) => `aaaaaaaa-0000-4000-8000-00000000000${n}`;
    const THOTH_SENDER = '<SenderName>Thoth</SenderName><EmailAddress>distribution@thoth.pub</EmailAddress>';
    const exported = (n: number, isbn: string | null, form: string, related = '') =>
      onixProduct({
        ref: `urn:uuid:${publication(n)}`,
        envelope: '<RecordSourceType>01</RecordSourceType>',
        identifiers: [
          pid('01', `urn:uuid:${WORK_ID}`, 'thoth-work-id'),
          pid('01', `urn:uuid:${publication(n)}`, 'thoth-publication-id'),
          ...(isbn ? [pid('15', isbn), pid('03', isbn)] : []),
          pid('06', 'https://doi.org/10.11647/OBP.0001'),
          pid('13', '2019012345'),
          pid('23', '1086123456'),
          pid('01', 'OBP.0001', 'internal-reference'),
        ],
        form,
        related,
      });
    const THOTH_EXPORT = [
      exported(1, ISBN_PDF, PDF, alternativeFormat(ISBN_EPUB)),
      exported(2, ISBN_EPUB, EPUB, alternativeFormat(ISBN_PDF)),
      exported(3, null, '<ProductForm>EB</ProductForm><ProductFormDetail>E105</ProductFormDetail>'),
    ];

    it('changes nothing when the export comes back to the instance it came from', async () => {
      const { resolved } = await plan(
        THOTH_EXPORT,
        {
          matches: {
            [`isbn:${ISBN_PDF}`]: [WORK_ID],
            [`isbn:${ISBN_EPUB}`]: [WORK_ID],
            'doi:https://doi.org/10.11647/obp.0001': [WORK_ID],
          },
          works: [
            existing(
              WORK_ID,
              'https://doi.org/10.11647/OBP.0001',
              [
                { id: publication(1), type: Pdf, isbn: ISBN_PDF },
                { id: publication(2), type: Epub, isbn: ISBN_EPUB },
                { id: publication(3), type: Html },
              ],
              Monograph,
            ),
          ],
        },
        THOTH_SENDER,
      );

      await execute(resolved);

      expect(resolved.sidecar.compatibility.activation).toBe('VERIFIED');
      expect(resolved.sidecar.workGroups[0].workType).toEqual({
        status: 'RESOLVED',
        type: Monograph,
        provenance: 'EXISTING_TARGET',
      });
      expect(mutations).toEqual([]);
    });

    it('recreates one Work with its recovered Work fields in an instance where it does not exist, once confirmed and typed', async () => {
      const unconfirmed = await plan(THOTH_EXPORT, {}, THOTH_SENDER);
      const confirmed = await plan(THOTH_EXPORT, { inputs: { thothCompatibilityConfirmed: true } }, THOTH_SENDER);
      const typed = await plan(
        THOTH_EXPORT,
        { inputs: { thothCompatibilityConfirmed: true, fileWorkType: Monograph } },
        THOTH_SENDER,
      );

      expect(unconfirmed.resolved.sidecar.blockers.map(({ code }) => code)).toEqual([
        'THOTH_COMPATIBILITY_CONFIRMATION_REQUIRED',
        'WORK_TYPE_INPUT_REQUIRED',
      ]);
      // The export carries no WorkType, so native identity alone never supplies one.
      expect(confirmed.resolved.sidecar.blockers.map(({ code }) => code)).toEqual(['WORK_TYPE_INPUT_REQUIRED']);

      await execute(typed.resolved);

      expect(named('CreateWork')).toHaveLength(1);
      expect(data(named('CreateWork')[0])).toMatchObject({
        workType: Monograph,
        doi: 'https://doi.org/10.11647/OBP.0001',
        lccn: '2019012345',
        oclc: '1086123456',
        reference: 'OBP.0001',
      });
      expect(named('CreatePublication').map((call) => data(call).publicationType)).toEqual([Pdf, Epub, Html]);
    });

    it('decodes nothing Thoth-native from a file whose Header only claims the name', async () => {
      const { resolved, sourcePlan } = await plan(
        THOTH_EXPORT,
        { inputs: { fileWorkType: Monograph } },
        '<SenderName>Thoth</SenderName>',
      );

      expect(sourcePlan.compatibility.headerMatches).toBe(false);
      expect(resolved.sidecar.workGroups.map(({ compatibility }) => compatibility)).toEqual(['GENERIC', 'GENERIC']);
      await execute(resolved);
      expect(named('CreateWork').map((call) => data(call).doi)).toEqual([null, null]);
    });
  });

  describe('structural chapters', () => {
    const chapter = (type: string, title: string) =>
      `<ContentItem><LevelSequenceNumber>1</LevelSequenceNumber><TextItem><TextItemType>${type}</TextItemType></TextItem><TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>04</TitleElementLevel><TitleText>${title}</TitleText></TitleElement></TitleDetail></ContentItem>`;

    it('creates a TextItemType 03 content item as a BookChapter of the Work without asking for its WorkType', async () => {
      const { resolved } = await plan(
        [
          onixProduct({
            ref: 'a',
            identifiers: [pid('15', ISBN_PB)],
            form: BC,
            content: `<ContentDetail>${chapter('03', 'Chapter One')}</ContentDetail>`,
          }),
        ],
        {
          inputs: { fileWorkType: EditedBook },
        },
      );

      await execute(resolved);

      expect(named('CreateWork').map((call) => data(call).workType)).toEqual([EditedBook, WorkTypes.enum.BookChapter]);
      expect(named('CreateWorkRelation')).toHaveLength(1);
    });

    it('creates nothing for a Work carrying a complete embedded work, which is never made a chapter', async () => {
      const { resolved } = await plan(
        [
          onixProduct({
            ref: 'a',
            identifiers: [pid('15', ISBN_PB)],
            form: BC,
            content: `<ContentDetail>${chapter('01', 'A Novel Within')}</ContentDetail>`,
          }),
        ],
        {
          inputs: { fileWorkType: EditedBook },
        },
      );

      expect(resolved.plan).toBeNull();
      expect(resolved.sidecar.blockers).toEqual([
        expect.objectContaining({ code: 'COMPONENT_UNSUPPORTED', detail: { kind: 'EMBEDDED_WORK' } }),
      ]);
    });
  });
});
