/* eslint-disable simple-import-sort/imports */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphqlService } from '@/src/shared/api/graphqlService';
import { AbstractService } from '@/src/entities/abstract/api/abstract.service';
import { AffiliationService } from '@/src/entities/affiliation/api/affiliation.service';
import { ContributionService } from '@/src/entities/contribution/api/contribution.service';
import { ContributorService } from '@/src/entities/contributor';
import { FundingService } from '@/src/entities/funding/api/funding.service';
import { InstitutionService } from '@/src/entities/institution';
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

import { licenseOptions } from '../../constants';
import { SeriesType } from '../../constants/series';
import CSVParser from './CSVParser';
import { getCsvConfig } from './getCsvConfig';

/**
 * End-to-end cover for the whole CSV bulk-import path: a real CSV file run through the real
 * `csv-file-validator` config, planned by the real `CSVParser`, then imported by the real
 * `WorkService` wired to real `SeriesService`, `TitleService` and friends.
 *
 * Only the GraphQL transport is stubbed, so the assertions are about the mutations the app
 * would actually send — not about a mocked service being called. The ONIX equivalent lives in
 * `XMLParser/onixImport.integration.test.ts`; both formats must reach the same plan shape.
 */

const IMPRINT_ID = '11111111-1111-1111-1111-111111111111';
const IMPRINT_NAME = 'Arc Humanities Press';
const FOUNDATIONS_ID = '22222222-2222-2222-2222-222222222222';
const CREATED_SERIES_ID = '33333333-3333-3333-3333-333333333333';

const imprints = [{ label: IMPRINT_NAME, value: IMPRINT_ID }];

const t = (key: string, options?: Record<string, unknown>) => (options ? `${key}:${JSON.stringify(options)}` : key);

/** Two rows in a series Thoth does not have, one in a series it does. */
const ROWS: Record<string, string>[] = [
  { title: 'A Companion to the Cavendishes', place_of_publication: 'Cambridge', series_name: 'Arc Companions' },
  { title: 'The Medieval Womb', series_name: 'Arc Companions' },
  { title: 'Beowulf by All', series_name: 'Foundations' },
];

/** A real CSV in the real template's column order, so the real validator has something to do. */
const buildCsv = () => {
  const headers = getCsvConfig(imprints, licenseOptions, t).headers.map((header) => header.name);
  const row = (values: Record<string, string>) =>
    headers.map((name) => `"${(values[name] ?? '').replace(/"/g, '""')}"`).join(',');

  return [
    headers.join(','),
    ...ROWS.map((values) => row({ imprint: IMPRINT_NAME, work_type: 'EDITED_BOOK', work_status: 'ACTIVE', ...values })),
  ].join('\n');
};

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

describe('CSV bulk import, end to end', () => {
  let graphqlService: GraphqlService;
  let workService: WorkService;
  let contributorService: ContributorService;
  let institutionService: InstitutionService;
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
          default:
            return {};
        }
      }),
    } as unknown as GraphqlService;

    // Real services over the same stubbed transport: the GraphQL boundary is the only thing
    // mocked for parser and service behaviour. `getContributors` and `getInstitutions` read
    // their result off the query response, so the stub's empty payload gives them empty lists
    // through their real mapping code rather than through a hand-written fake.
    contributorService = new ContributorService(graphqlService);
    institutionService = new InstitutionService(graphqlService);

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

  const parseUpload = async (serieses: SeriesEntity[]) => {
    // Step 1 and 2: exactly what CSVParse.tsx does with the uploaded file.
    const file = new File([buildCsv()], 'import.csv', { type: 'text/csv' });

    const parser = new CSVParser(
      file,
      getCsvConfig(imprints, licenseOptions, t),
      imprints,
      licenseOptions,
      serieses,
      contributorService,
      institutionService,
      t,
    );

    return parser.parse();
  };

  const mutationsNamed = (operation: string) => mutations.filter((call) => call.operation === operation);

  it('uploads, previews, confirms, and creates the missing series with its issues', async () => {
    const result = await parseUpload([foundations]);

    // --- upload + preview -------------------------------------------------
    expect(result.status).toBe('success');
    expect(result.issues).toEqual([]);
    // The plan the parser produced is the plan the import runs: nothing is reassembled here.
    const plan = result.data.plan;

    expect(plan.works.map((work) => work.titles[0].title)).toEqual(ROWS.map(({ title }) => title));
    expect(plan.works[0].place).toBe('Cambridge');
    // A CSV import has no chapters.
    expect(plan.chapters).toEqual([]);

    // The preview shows one series to be created and one existing series reused.
    expect(
      plan.series.map((group) => ({
        name: group.name,
        willBeCreated: group.target.kind === 'proposed',
        ordinals: group.members.map((member) => member.orderNumber),
      })),
    ).toEqual([
      // Neither row supplied an issue number, so the new series is numbered from 1.
      { name: 'Arc Companions', willBeCreated: true, ordinals: [1, 2] },
      // Appended after the two issues Foundations already has.
      { name: 'Foundations', willBeCreated: false, ordinals: [3] },
    ]);

    // Nothing has been written yet: parsing and previewing are side-effect free.
    expect(mutations).toEqual([]);

    // --- confirmation: exactly what PreviewStep hands to the mutation -----
    await workService.bulkCreateWorks(plan);

    expect(mutationsNamed('CreateWork')[0].variables.data).toMatchObject({ place: 'Cambridge' });

    // --- created series ---------------------------------------------------
    const createSeriesCalls = mutationsNamed('CreateSeries');

    expect(createSeriesCalls).toHaveLength(1);
    expect(createSeriesCalls[0].variables.data).toMatchObject({
      seriesName: 'Arc Companions',
      imprintId: IMPRINT_ID,
      seriesType: SeriesType.enum.BookSeries,
    });
    // Nothing was invented for fields the CSV does not supply — `series_issn` has no mapping.
    expect(createSeriesCalls[0].variables.data).toMatchObject({
      issnPrint: null,
      issnDigital: null,
      seriesUrl: null,
      seriesCfpUrl: null,
      seriesDescription: null,
    });

    // --- created issues ---------------------------------------------------
    expect(mutationsNamed('CreateWork')).toHaveLength(3);
    expect(mutationsNamed('CreateIssue').map((call) => call.variables.data)).toEqual([
      // Both new-series works point at the id the API returned for the one created series.
      { seriesId: CREATED_SERIES_ID, workId: 'work-1', issueOrdinal: 1 },
      { seriesId: CREATED_SERIES_ID, workId: 'work-2', issueOrdinal: 2 },
      // The existing series keeps its own id and continues its ordinals.
      { seriesId: FOUNDATIONS_ID, workId: 'work-3', issueOrdinal: 3 },
    ]);
  });

  it('reuses a series an earlier run created rather than creating it again', async () => {
    const arcCompanions: SeriesEntity = { ...foundations, id: CREATED_SERIES_ID, name: 'Arc Companions', issues: [] };

    const result = await parseUpload([foundations, arcCompanions]);
    const plan = result.data.plan;

    expect(plan.series.map((group) => group.target.kind)).toEqual(['existing', 'existing']);

    await workService.bulkCreateWorks(plan);

    expect(mutationsNamed('CreateSeries')).toHaveLength(0);
    expect(mutationsNamed('CreateIssue').map((call) => call.variables.data)).toEqual([
      { seriesId: CREATED_SERIES_ID, workId: 'work-1', issueOrdinal: 1 },
      { seriesId: CREATED_SERIES_ID, workId: 'work-2', issueOrdinal: 2 },
      { seriesId: FOUNDATIONS_ID, workId: 'work-3', issueOrdinal: 3 },
    ]);
  });
});
