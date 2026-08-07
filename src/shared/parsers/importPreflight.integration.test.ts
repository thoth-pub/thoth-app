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
import { SubjectService } from '@/src/entities/subject/api/subject.service';
import { TitleService } from '@/src/entities/title/api/title.service';
import { ImportPreflightService } from '@/src/entities/work/api/importPreflight.service';
import { WorkService } from '@/src/entities/work/api/work.service';
import type { WorkEntity } from '@/src/entities/work/model/work.types';
import type { ImportPlan } from '@/src/shared/types';
import { buildImportPreflightReport, collectImportIdentifiers } from '@/src/shared/utils/importPreflight';

import { licenseOptions } from '../constants';
import CSVParser from './CSVParser/CSVParser';
import { getCsvConfig } from './CSVParser/getCsvConfig';

/**
 * The confirmation boundary, end to end: a real CSV parsed by the real parser, carried through
 * contributor resolution, checked by the real preflight service and report builder, and then
 * confirmed into the real `WorkService`. Only the GraphQL transport is stubbed.
 *
 * What it is here to prove is that the preflight sits *beside* the import rather than inside it.
 * It reads, it reports, and the plan that reaches the mutation is the same object the user was
 * shown — findings or no findings.
 */

const IMPRINT_ID = '11111111-1111-1111-1111-111111111111';
const IMPRINT_NAME = 'Arc Humanities Press';
const PUBLISHER_ID = '44444444-4444-4444-4444-444444444444';
const EXISTING_WORK_ID = '55555555-5555-5555-5555-555555555555';

const SHARED_DOI = 'https://doi.org/10.11647/obp.0288';
const SHARED_ISBN = '9781800641884';

const imprints = [{ label: IMPRINT_NAME, value: IMPRINT_ID }];

const t = (key: string, options?: Record<string, unknown>) => (options ? `${key}:${JSON.stringify(options)}` : key);

/**
 * Three works: two sharing a DOI with each other, and the second also carrying an ISBN that an
 * existing Thoth work already has. The third shares nothing and has no identifier at all.
 */
const ROWS: Record<string, string>[] = [
  { title: 'A Companion to the Cavendishes', doi: SHARED_DOI },
  { title: 'The Medieval Womb', doi: SHARED_DOI, publication_paperback_isbn: SHARED_ISBN },
  { title: 'Beowulf by All' },
];

const buildCsv = () => {
  const headers = getCsvConfig(imprints, licenseOptions, t).headers.map((header) => header.name);
  const row = (values: Record<string, string>) =>
    headers.map((name) => `"${(values[name] ?? '').replace(/"/g, '""')}"`).join(',');

  return [
    headers.join(','),
    ...ROWS.map((values) => row({ imprint: IMPRINT_NAME, work_type: 'MONOGRAPH', work_status: 'ACTIVE', ...values })),
  ].join('\n');
};

const existingWorkDto = (workId: string, { doi = '', isbns = [] as string[], title = 'An Existing Book' } = {}) => ({
  workId,
  doi,
  imprintId: IMPRINT_ID,
  titles: [{ titleId: `${workId}-title`, canonical: true, fullTitle: title, localeCode: 'en', subtitle: null, title }],
  publications: isbns.map((isbn) => ({ isbn })),
});

type Call = { operation: string; variables: Record<string, unknown> };

describe('import preflight, end to end', () => {
  let graphqlService: GraphqlService;
  let workService: WorkService;
  let preflightService: ImportPreflightService;
  let contributorService: ContributorService;
  let institutionService: InstitutionService;
  let queries: Call[];
  let mutations: Call[];
  let createdWorkCount: number;

  const operationNameOf = (document: unknown) => {
    const [definition] = (document as { definitions: { name?: { value: string } }[] }).definitions;

    return definition.name?.value ?? 'unknown';
  };

  beforeEach(() => {
    queries = [];
    mutations = [];
    createdWorkCount = 0;

    graphqlService = {
      query: vi.fn(async (document: unknown, variables: Record<string, unknown>) => {
        const operation = operationNameOf(document);
        queries.push({ operation, variables });

        // One existing work in Thoth holds the ISBN the second row carries. Nothing holds
        // either DOI, so the DOI signal is internal to the upload.
        if (operation === 'GetPublicationsByIsbnFilter') {
          return {
            publications: [
              {
                publicationId: 'existing-publication',
                isbn: '978-1-80064-188-4',
                work: existingWorkDto(EXISTING_WORK_ID, { isbns: ['978-1-80064-188-4'] }),
              },
            ],
          };
        }

        return {};
      }),
      mutation: vi.fn(async (document: unknown, variables: Record<string, unknown>) => {
        const operation = operationNameOf(document);
        mutations.push({ operation, variables });

        switch (operation) {
          case 'CreateWork':
            createdWorkCount += 1;
            return { createWork: { workId: `work-${createdWorkCount}`, titles: [] } };
          case 'CreateTitle':
            return { createTitle: { titleId: 'title-1', ...(variables.data as object) } };
          case 'CreatePublication':
            return {
              createPublication: {
                publicationId: `publication-${mutations.length}`,
                ...(variables.data as object),
                prices: [],
                locations: [],
                work: { titles: [], doi: '', imprint: { publisher: { publisherName: '' } } },
              },
            };
          default:
            return {};
        }
      }),
    } as unknown as GraphqlService;

    contributorService = new ContributorService(graphqlService);
    institutionService = new InstitutionService(graphqlService);
    preflightService = new ImportPreflightService(graphqlService);

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

  const parseUpload = async () => {
    const file = new File([buildCsv()], 'import.csv', { type: 'text/csv' });

    const parser = new CSVParser(
      file,
      getCsvConfig(imprints, licenseOptions, t),
      imprints,
      licenseOptions,
      [],
      contributorService,
      institutionService,
      t,
    );

    return parser.parse();
  };

  /**
   * What `ContributorsSelection` hands on: the same plan with contributor choices applied. This
   * upload has no contributors to resolve, so the choices are empty — but the plan is rebuilt the
   * way the component rebuilds it, so the object that goes into the preflight is the same *kind*
   * of object the preview really receives, and not the parser's own.
   */
  const resolveContributors = (plan: ImportPlan): ImportPlan => ({
    ...plan,
    works: plan.works.map((work: WorkEntity) => work),
    chapters: plan.chapters.map((chapter: WorkEntity) => chapter),
  });

  it('parses, resolves, checks, reports, and creates the very same plan', async () => {
    const parsed = await parseUpload();

    expect(parsed.status).toBe('success');

    // --- parse -> contributor resolution -> final plan --------------------
    const finalPlan = resolveContributors(parsed.data.plan);

    expect(finalPlan.works.map((work) => work.titles[0].title)).toEqual(ROWS.map(({ title }) => title));

    // --- preflight --------------------------------------------------------
    const identifiers = collectImportIdentifiers(finalPlan);

    expect(identifiers).toEqual([
      { basis: 'doi', value: SHARED_DOI },
      { basis: 'isbn', value: SHARED_ISBN },
    ]);

    const existingMatches = await preflightService.findExistingIdentifierMatches({
      publisherId: PUBLISHER_ID,
      identifiers,
    });

    // The check is reads only. This is the assertion that keeps a future "resolve it for them"
    // from being added here by accident.
    expect(mutations).toEqual([]);
    expect(queries.map(({ operation }) => operation).sort()).toEqual([
      'GetPublicationsByIsbnFilter',
      'GetWorksByIdentifierFilter',
    ]);
    queries.forEach(({ variables }) => expect(variables.publishers).toEqual([PUBLISHER_ID]));

    // --- report -----------------------------------------------------------
    const report = buildImportPreflightReport(finalPlan, existingMatches);

    expect(report.summary).toMatchObject({
      works: 3,
      chapters: 0,
      worksWithDoi: 2,
      worksWithIsbn: 1,
      worksWithAnyCheckedIdentifier: 2,
      worksWithoutCheckedIdentifier: 1,
      affectedWorks: 2,
      duplicateFindings: 2,
    });

    expect(
      report.duplicateFindings.map(({ basis, value, importedWorks, existingWorks }) => ({
        basis,
        value,
        imported: importedWorks.map(({ importIndex }) => importIndex),
        existing: existingWorks.map(({ workId }) => workId),
      })),
    ).toEqual([
      { basis: 'doi', value: SHARED_DOI, imported: [0, 1], existing: [] },
      { basis: 'isbn', value: SHARED_ISBN, imported: [1], existing: [EXISTING_WORK_ID] },
    ]);

    // --- confirmation ------------------------------------------------------
    const bulkCreateWorks = vi.spyOn(workService, 'bulkCreateWorks');

    await workService.bulkCreateWorks(finalPlan);

    // The plan reached the service whole and alone: the report went to the screen, not the API.
    expect(bulkCreateWorks).toHaveBeenCalledTimes(1);
    expect(bulkCreateWorks.mock.calls[0]).toHaveLength(1);
    expect(bulkCreateWorks.mock.calls[0][0]).toBe(finalPlan);

    // A duplicate signal is not a veto. All three works were created, including both works that
    // share a DOI and the one whose ISBN an existing Thoth work already carries.
    expect(mutations.filter(({ operation }) => operation === 'CreateWork')).toHaveLength(3);
  });

  it('reports nothing to look up, and asks nothing, when no work carries a DOI or ISBN', async () => {
    const parsed = await parseUpload();
    const finalPlan = resolveContributors(parsed.data.plan);
    const withoutIdentifiers: ImportPlan = {
      ...finalPlan,
      works: finalPlan.works.map((work) => ({ ...work, doi: '', publications: [] })),
    };

    const identifiers = collectImportIdentifiers(withoutIdentifiers);
    const existingMatches = await preflightService.findExistingIdentifierMatches({
      publisherId: PUBLISHER_ID,
      identifiers,
    });

    expect(queries).toEqual([]);

    const report = buildImportPreflightReport(withoutIdentifiers, existingMatches);

    expect(report.duplicateFindings).toEqual([]);
    // Nothing found, because nothing could be checked — and the summary says so rather than
    // implying the upload is clean.
    expect(report.summary.worksWithAnyCheckedIdentifier).toBe(0);
    expect(report.summary.worksWithoutCheckedIdentifier).toBe(3);
  });
});
