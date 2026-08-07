/* eslint-disable simple-import-sort/imports */
import { parse } from '@5stones/onix';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphqlService } from '@/src/shared/api/graphqlService';
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
import { SeriesEntity } from '@/src/entities/series/model/series.types';
import { SubjectService } from '@/src/entities/subject/api/subject.service';
import { TitleService } from '@/src/entities/title/api/title.service';
import { WorkService } from '@/src/entities/work/api/work.service';

import { currencyOptions, languageOptions, licenseOptions } from '../../constants';
import { SeriesType } from '../../constants/series';
import { SeriesImportPlan } from '../../types';
import { ExtendedONIXMessageRoot } from './interfaces';
import XMLParser from './XMLParser';

/**
 * End-to-end cover for the whole bulk-import path: a real ONIX document parsed by the real
 * `@5stones/onix`, planned by the real `XMLParser`, then imported by the real `WorkService`
 * wired to real `SeriesService`, `TitleService` and friends.
 *
 * Only the GraphQL transport is stubbed, so the assertions are about the mutations the app
 * would actually send — not about a mocked service being called.
 */

const IMPRINT_ID = '11111111-1111-1111-1111-111111111111';
const IMPRINT_NAME = 'Arc Humanities Press';
const FOUNDATIONS_ID = '22222222-2222-2222-2222-222222222222';
const CREATED_SERIES_ID = '33333333-3333-3333-3333-333333333333';

/** Three products in a series Thoth does not have, one in a series it does. */
const product = (isbn: string, title: string, seriesName: string) => `
  <Product>
    <RecordReference>${isbn}</RecordReference>
    <ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>${isbn}</IDValue></ProductIdentifier>
    <DescriptiveDetail>
      <ProductForm>BC</ProductForm>
      <Collection>
        <CollectionType>10</CollectionType>
        <TitleDetail>
          <TitleType>01</TitleType>
          <TitleElement>
            <TitleElementLevel>02</TitleElementLevel>
            <NoPrefix/>
            <TitleWithoutPrefix>${seriesName}</TitleWithoutPrefix>
          </TitleElement>
        </TitleDetail>
      </Collection>
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <NoPrefix/>
          <TitleWithoutPrefix language="eng">${title}</TitleWithoutPrefix>
        </TitleElement>
      </TitleDetail>
      <TitleDetail>
        <TitleType>05</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <NoPrefix/>
          <TitleWithoutPrefix>INTERNAL_${isbn}</TitleWithoutPrefix>
        </TitleElement>
      </TitleDetail>
      <Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language>
    </DescriptiveDetail>
    <PublishingDetail>
      <Imprint><ImprintName>${IMPRINT_NAME}</ImprintName></Imprint>
      <PublishingStatus>04</PublishingStatus>
    </PublishingDetail>
  </Product>`;

const ONIX = `<?xml version="1.0" encoding="UTF-8"?>
<ONIXMessage release="3.0">
  ${product('9781641891783', 'A Companion to the Cavendishes', 'Arc Companions')}
  ${product('9781641893763', 'The Medieval Womb', 'Arc Companions')}
  ${product('9781802704488', 'Beowulf by All', 'Foundations')}
  ${product('9781802703306', 'Trans Histories of the Medieval Book', 'Arc Companions')}
</ONIXMessage>`;

const foundations: SeriesEntity = {
  id: FOUNDATIONS_ID,
  name: 'Foundations',
  type: SeriesType.enum.BookSeries,
  issnPrint: '',
  issnDigital: '',
  updatedAt: '',
  imprintId: IMPRINT_ID,
  imprintName: IMPRINT_NAME,
  url: '',
  cfpUrl: '',
  description: '',
  issues: [
    { id: 'issue-1', ordinal: 1, workId: 'w-1', title: 'Existing', seriesId: FOUNDATIONS_ID, coverUrl: '' },
    { id: 'issue-2', ordinal: 2, workId: 'w-2', title: 'Existing', seriesId: FOUNDATIONS_ID, coverUrl: '' },
  ],
};

type MutationCall = { operation: string; variables: Record<string, unknown> };

describe('ONIX bulk import, end to end', () => {
  let graphqlService: GraphqlService;
  let workService: WorkService;
  let seriesService: SeriesService;
  let mutations: MutationCall[];
  let createdWorkCount: number;

  const operationNameOf = (document: unknown) => {
    const [definition] = (document as { definitions: { name?: { value: string } }[] }).definitions;

    return definition.name?.value ?? 'unknown';
  };

  beforeEach(() => {
    mutations = [];
    createdWorkCount = 0;

    graphqlService = {
      query: vi.fn().mockResolvedValue({}),
      mutation: vi.fn(async (document: unknown, variables: Record<string, unknown>) => {
        const operation = operationNameOf(document);
        mutations.push({ operation, variables });

        switch (operation) {
          case 'CreateWork':
            createdWorkCount += 1;
            return { createWork: { workId: `work-${createdWorkCount}`, titles: [] } };
          case 'CreateSeries':
            return { createSeries: { seriesId: CREATED_SERIES_ID } };
          case 'CreateIssue':
            return { createIssue: { issueId: `issue-${mutations.length}` } };
          case 'CreateTitle':
            return { createTitle: { titleId: 'title-1', ...(variables.data as object) } };
          case 'CreateLanguage':
            return { createLanguage: { languageId: 'language-1', ...(variables.data as object) } };
          case 'CreatePublication':
            return {
              createPublication: {
                publicationId: 'publication-1',
                ...(variables.data as object),
                work: { titles: [], doi: '', imprint: { publisher: { publisherName: IMPRINT_NAME } } },
                prices: [],
                locations: [],
              },
            };
          default:
            return {};
        }
      }),
    } as unknown as GraphqlService;

    seriesService = new SeriesService(graphqlService);

    const contributorService = new ContributorService(graphqlService);

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
      seriesService,
      referenceService: new ReferenceService(graphqlService),
      titleService: new TitleService(graphqlService),
      abstractService: new AbstractService(graphqlService),
    });
  });

  const parseUpload = async (serieses: SeriesEntity[]) => {
    // Step 1: what app/actions/validateXml.ts does.
    const xml = (await parse(ONIX)) as ExtendedONIXMessageRoot;

    // Step 2: what XMLParse.tsx does.
    const parser = new XMLParser(
      xml,
      [{ label: IMPRINT_NAME, value: IMPRINT_ID }],
      licenseOptions,
      serieses,
      { getContributors: async () => [] } as never,
      { getInstitutions: async () => [] } as never,
      languageOptions,
      currencyOptions,
    );

    return parser.parse();
  };

  const mutationsNamed = (operation: string) => mutations.filter((call) => call.operation === operation);

  it('uploads, previews, confirms, and creates the missing series with its issues', async () => {
    const result = await parseUpload([foundations]);

    // --- upload + preview -------------------------------------------------
    expect(result.status).toBe('success');
    expect(result.errors).toEqual([]);
    expect(result.data.works).toHaveLength(4);
    expect(result.data.works.map((work) => work.titles[0].title)).toEqual([
      'A Companion to the Cavendishes',
      'The Medieval Womb',
      'Beowulf by All',
      'Trans Histories of the Medieval Book',
    ]);

    const plan = result.data.series as SeriesImportPlan;

    // The preview shows one series to be created and one existing series reused.
    expect(
      plan.map((group) => ({
        name: group.name,
        willBeCreated: group.target.kind === 'proposed',
        ordinals: group.works.map((work) => work.orderNumber),
      })),
    ).toEqual([
      { name: 'Arc Companions', willBeCreated: true, ordinals: [1, 2, 3] },
      // Appended after the two issues Foundations already has.
      { name: 'Foundations', willBeCreated: false, ordinals: [3] },
    ]);

    // Nothing has been written yet: parsing and previewing are side-effect free.
    expect(mutations).toEqual([]);

    // --- confirmation: exactly what PreviewStep hands to the mutation -----
    await workService.bulkCreateWorks(result.data.works, plan, result.data.chapters);

    // --- created series ---------------------------------------------------
    const createSeriesCalls = mutationsNamed('CreateSeries');

    expect(createSeriesCalls).toHaveLength(1);
    expect(createSeriesCalls[0].variables.data).toMatchObject({
      seriesName: 'Arc Companions',
      imprintId: IMPRINT_ID,
      seriesType: SeriesType.enum.BookSeries,
    });
    // Nothing was invented for fields ONIX does not supply.
    expect(createSeriesCalls[0].variables.data).toMatchObject({
      issnPrint: null,
      issnDigital: null,
      seriesUrl: null,
      seriesCfpUrl: null,
      seriesDescription: null,
    });

    // --- created issues ---------------------------------------------------
    expect(mutationsNamed('CreateWork')).toHaveLength(4);
    expect(mutationsNamed('CreateIssue').map((call) => call.variables.data)).toEqual([
      // The three new-series works all point at the id the API returned for the one series.
      { seriesId: CREATED_SERIES_ID, workId: 'work-1', issueOrdinal: 1 },
      { seriesId: CREATED_SERIES_ID, workId: 'work-2', issueOrdinal: 2 },
      // The existing series keeps its own id and continues its ordinals.
      { seriesId: FOUNDATIONS_ID, workId: 'work-3', issueOrdinal: 3 },
      { seriesId: CREATED_SERIES_ID, workId: 'work-4', issueOrdinal: 3 },
    ]);
  });

  it('reuses the series a previous partial run created instead of creating a second one', async () => {
    // The retry sees the series list refreshed by useBulkCreateWorks' onSettled invalidation.
    const arcCompanions: SeriesEntity = {
      ...foundations,
      id: CREATED_SERIES_ID,
      name: 'Arc Companions',
      issues: [],
    };

    const result = await parseUpload([foundations, arcCompanions]);
    const plan = result.data.series as SeriesImportPlan;

    expect(plan.map((group) => group.target.kind)).toEqual(['existing', 'existing']);

    await workService.bulkCreateWorks(result.data.works, plan, result.data.chapters);

    expect(mutationsNamed('CreateSeries')).toHaveLength(0);
    expect(mutationsNamed('CreateIssue').map((call) => call.variables.data)).toEqual([
      { seriesId: CREATED_SERIES_ID, workId: 'work-1', issueOrdinal: 1 },
      { seriesId: CREATED_SERIES_ID, workId: 'work-2', issueOrdinal: 2 },
      { seriesId: FOUNDATIONS_ID, workId: 'work-3', issueOrdinal: 3 },
      { seriesId: CREATED_SERIES_ID, workId: 'work-4', issueOrdinal: 3 },
    ]);
  });
});
