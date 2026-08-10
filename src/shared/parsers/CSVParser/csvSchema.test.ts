import { describe, expect, it } from 'vitest';

import { appConfig } from '../../config';
import { csvSchema, getContributorFieldsByIndex } from './csvSchema';
import { getCsvConfig } from './getCsvConfig';

const contributorSuffixes = [
  ['first_name', 'FirstName'],
  ['surname', 'LastName'],
  ['role', 'Role'],
  ['biography', 'Biography'],
  ['orcid', 'Orcid'],
  ['website', 'Website'],
  ['affiliation_position', 'AffiliationPosition'],
  ['affiliation_institution_name', 'AffiliationInstitutionName'],
  ['affiliation_institution_ror', 'AffiliationInstitutionRor'],
] as const;

const staticContract = [
  ['imprint', 'imprint', true],
  ['work_type', 'workType', true],
  ['work_status', 'workStatus', true],
  ['title', 'title', true],
  ['subtitle', 'subtitle', false],
  ['edition', 'edition', false],
  ['publication_date', 'publicationDate', false],
  ['withdrawn_date', 'withdrawnDate', false],
  ['place_of_publication', 'placeOfPublication', false],
  ['cover_url', 'coverUrl', false],
  ['doi', 'doi', false],
  ['page_count', 'pageCount', false],
  ['page_breakdown', 'pageBreakdown', false],
  ['image_count', 'imageCount', false],
  ['table_count', 'tableCount', false],
  ['audio_count', 'audioCount', false],
  ['video_count', 'videoCount', false],
  ['license', 'license', false],
  ['copyright_holder', 'copyrightHolder', false],
  ['landing_page', 'landingPage', false],
  ['short_abstract', 'shortAbstract', false],
  ['long_abstract', 'longAbstract', false],
  ['original_language', 'originalLanguage', false],
  ['translated_from_language', 'translatedFromLanguage', false],
  ['translated_into_language', 'translatedIntoLanguage', false],
  ['thema_subjects', 'themaSubjects', false],
  ['bic_subjects', 'bicSubjects', false],
  ['bisac_subjects', 'bisacSubjects', false],
  ['lcc_subjects', 'lccSubjects', false, true],
  ['keywords', 'keywords', false],
  ['publication_paperback_isbn', 'publicationPaperbackIsbn', false],
  ['publication_paperback_price_1_currency_code', 'publicationPaperbackPrice1CurrencyCode', false],
  ['publication_paperback_price_1_unit_price', 'publicationPaperbackPrice1UnitPrice', false],
  ['publication_hardback_isbn', 'publicationHardbackIsbn', false],
  ['publication_hardback_price_1_currency_code', 'publicationHardbackPrice1CurrencyCode', false],
  ['publication_hardback_price_1_unit_price', 'publicationHardbackPrice1UnitPrice', false],
  ['publication_pdf_isbn', 'publicationPdfIsbn', false],
  ['publication_pdf_location_landing_page', 'publicationPdfLocationLandingPage', false],
  ['publication_pdf_location_full_text_url', 'publicationPdfLocationFullTextUrl', false],
  ['publication_pdf_location_platform', 'publicationPdfLocationPlatform', false],
  ['series_name', 'seriesName', false],
  ['series_issn', 'seriesIssn', false],
  ['series_issue_number', 'seriesIssueNumber', false],
] as const;

const headStaticCount = 22;

const expectedContract = [
  ...staticContract.slice(0, headStaticCount),
  ...Array.from({ length: appConfig.maxCsvContributorsCount }, (_, offset) => {
    const index = offset + 1;

    return contributorSuffixes.map(
      ([headerSuffix, keySuffix]) =>
        [
          `contribution_${index}_${headerSuffix}`,
          `contribution${index}${keySuffix}`,
          false,
          index >= 6 ? true : undefined,
        ] as const,
    );
  }).flat(),
  ...staticContract.slice(headStaticCount),
].map(([header, key, required, optional]) => [header, key, required, optional]);

describe('CSV schema', () => {
  it('preserves the complete public header, inputName, required, optional contract in order', () => {
    const config = getCsvConfig([{ label: 'Imprint', value: 'id' }], [], (key) => key);

    expect(
      config.headers.map(({ name, inputName, required, optional }) => [name, inputName, required, optional]),
    ).toEqual(expectedContract);
    expect(config.headers).toHaveLength(223);
  });

  it('has unique canonical headers and internal keys in deterministic order', () => {
    const headers = csvSchema.map(({ header }) => header);
    const keys = csvSchema.map(({ key }) => key);

    expect(new Set(headers).size).toBe(headers.length);
    expect(new Set(keys).size).toBe(keys.length);
    expect(headers).toEqual(expectedContract.map(([header]) => header));
  });

  it('generates the configured contributor groups in stable field order', () => {
    const groups = Map.groupBy(
      csvSchema.filter(({ contributorIndex }) => contributorIndex !== undefined),
      ({ contributorIndex }) => contributorIndex,
    );

    expect(groups.size).toBe(appConfig.maxCsvContributorsCount);
    expect([...groups.values()].every((group) => group.length === contributorSuffixes.length)).toBe(true);

    for (const [index, group] of groups) {
      expect(group.map(({ header }) => header)).toEqual(
        contributorSuffixes.map(([suffix]) => `contribution_${index}_${suffix}`),
      );
    }
  });

  it('preserves the historical optional flags for contributor slots and LCC', () => {
    const contributorOptionality = (index: number) =>
      csvSchema
        .filter(({ contributorIndex }) => contributorIndex === index)
        .map(({ optionalColumn }) => optionalColumn);

    expect(contributorOptionality(1)).toEqual(new Array(contributorSuffixes.length).fill(undefined));
    expect(contributorOptionality(5)).toEqual(new Array(contributorSuffixes.length).fill(undefined));
    expect(contributorOptionality(6)).toEqual(new Array(contributorSuffixes.length).fill(true));
    expect(contributorOptionality(appConfig.maxCsvContributorsCount)).toEqual(
      new Array(contributorSuffixes.length).fill(true),
    );
    expect(csvSchema.find(({ header }) => header === 'lcc_subjects')?.optionalColumn).toBe(true);
  });

  it('maps every compatibility alias to exactly one canonical field', () => {
    const aliases = csvSchema.flatMap(
      (field) => field.aliases?.map(({ header }) => [header, field.header] as const) ?? [],
    );

    expect(aliases).toEqual([['publisher', 'imprint']]);
    expect(new Set(aliases.map(([alias]) => alias)).size).toBe(aliases.length);
  });

  it('keeps enum normalisation attached only to fields in the schema', () => {
    const enumHeaders = csvSchema.filter(({ normalise }) => normalise?.kind === 'enum').map(({ header }) => header);

    expect(enumHeaders).toEqual([
      'work_type',
      'work_status',
      ...Array.from({ length: appConfig.maxCsvContributorsCount }, (_, offset) => `contribution_${offset + 1}_role`),
      'publication_pdf_location_platform',
    ]);
    expect(enumHeaders.every((header) => csvSchema.some((field) => field.header === header))).toBe(true);
  });

  it('gives every field an explicit disposition and pins the compatibility-only set', () => {
    expect(
      csvSchema.every(({ disposition }) => disposition === 'imported' || disposition === 'compatibility-only'),
    ).toBe(true);
    expect(
      csvSchema.filter(({ disposition }) => disposition === 'compatibility-only').map(({ header }) => header),
    ).toEqual([
      ...Array.from(
        { length: appConfig.maxCsvContributorsCount },
        (_, offset) => `contribution_${offset + 1}_affiliation_institution_name`,
      ),
      'series_issn',
    ]);
  });

  it('returns every schema-backed contributor key and rejects invalid indexes', () => {
    expect(() => getContributorFieldsByIndex(0)).toThrow(RangeError);
    expect(getContributorFieldsByIndex(1)).toEqual({
      FIRST_NAME: 'contribution1FirstName',
      LAST_NAME: 'contribution1LastName',
      ROLE: 'contribution1Role',
      BIOGRAPHY: 'contribution1Biography',
      ORCID: 'contribution1Orcid',
      WEBSITE: 'contribution1Website',
      AFFILIATION_POSITION: 'contribution1AffiliationPosition',
      AFFILIATION_INSTITUTION_NAME: 'contribution1AffiliationInstitutionName',
      AFFILIATION_INSTITUTION_ROR: 'contribution1AffiliationInstitutionRor',
    });
    expect(getContributorFieldsByIndex(appConfig.maxCsvContributorsCount).ROLE).toBe(
      `contribution${appConfig.maxCsvContributorsCount}Role`,
    );
    expect(() => getContributorFieldsByIndex(appConfig.maxCsvContributorsCount + 1)).toThrow(RangeError);
  });
});
