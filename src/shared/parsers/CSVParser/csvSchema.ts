import { ContributionType, LocationPlatform, WorkStatus, WorkType } from '@/gql/graphql';

import { appConfig } from '../../config';

export type CsvFieldDisposition = 'imported' | 'compatibility-only';

export type CsvRequiredErrorRule = 'fieldRequired';

/**
 * How a field treats accidental leading/trailing whitespace.
 *
 * - `canonicalise` — permitted only where an existing authoritative Thoth contract already
 *   performs the transformation, so preflight introduces no repair of its own: the DOI (whose
 *   `canonicaliseDoi` contract trims before canonicalising) and the two series fields (which
 *   `parseSeries` has always trimmed). The canonical value is then what every validator sees
 *   *and* what the ImportPlan carries.
 * - `report` — everywhere else that boundary whitespace or hidden characters change what the
 *   value *is* (dates, imprint, license, ISBNs, currencies, languages, ORCID, ROR, contributor
 *   names): the defect is reported as one actionable preflight error, never silently trimmed
 *   away, so no value becomes valid merely because preflight repaired it and no identity is
 *   rewritten before lookup.
 *
 * Enum-backed fields (work type/status, roles, location platform) need no policy: the existing
 * alias normalisation already resolves a whitespace-wrapped supported alias to its canonical
 * member, exactly as on every previous release.
 *
 * Fields with no policy and no alias normalisation (titles, abstracts, biographies, free prose)
 * are never trimmed or rewritten: publisher content is imported as supplied.
 */
export type CsvBoundaryPolicy = 'canonicalise' | 'report';

/**
 * Deterministic preflight rules evaluated on every trustworthy canonical row, named here so the
 * schema stays the one authoritative field contract; implementations live in `csvPreflight.ts`,
 * exactly as `CsvValidationRule` names are implemented by `getCsvConfig`.
 */
export type CsvPreflightRule = 'isoDate' | 'doi' | 'orcid' | 'ror' | 'integer' | 'decimal' | 'importedText';

export type CsvValidationRule =
  | 'imprint'
  | 'workType'
  | 'workStatus'
  | 'title'
  | 'subtitle'
  | 'edition'
  | 'license'
  | 'contributorRole'
  | 'language'
  | 'isbn'
  | 'currency'
  | 'locationPlatform';

type CsvEnumNormaliser = {
  kind: 'enum';
  values: Record<string, string>;
};

type CsvHeaderAlias = {
  header: string;
  caseInsensitive?: boolean;
};

type CsvFieldDefinitionInput<Header extends string, Key extends string> = {
  header: Header;
  key: Key;
  required: boolean;
  optionalColumn?: boolean;
  aliases?: readonly CsvHeaderAlias[];
  validation?: CsvValidationRule;
  requiredError?: CsvRequiredErrorRule;
  normalise?: CsvEnumNormaliser;
  boundary?: CsvBoundaryPolicy;
  preflight?: CsvPreflightRule;
  disposition: CsvFieldDisposition;
  consumer: string;
  destination: string;
  notes?: string;
};

type ContributorFieldGroupInput = {
  constant: string;
  headerSuffix: string;
  keySuffix: string;
  validation?: CsvValidationRule;
  normalise?: CsvEnumNormaliser;
  boundary?: CsvBoundaryPolicy;
  preflight?: CsvPreflightRule;
  disposition: CsvFieldDisposition;
  consumer: string;
  destination: string;
  notes?: string;
};

const defineFields = <const Fields extends readonly CsvFieldDefinitionInput<string, string>[]>(fields: Fields) =>
  fields;

const workFields = defineFields([
  {
    header: 'imprint',
    key: 'imprint',
    required: true,
    aliases: [{ header: 'publisher', caseInsensitive: true }],
    validation: 'imprint',
    requiredError: 'fieldRequired',
    boundary: 'report',
    disposition: 'imported',
    consumer: 'parseImprint / parseRow',
    destination: 'WorkEntity.imprintId / publisherName',
  },
  {
    header: 'work_type',
    key: 'workType',
    required: true,
    validation: 'workType',
    normalise: { kind: 'enum', values: WorkType },
    disposition: 'imported',
    consumer: 'parseRow',
    destination: 'WorkEntity.type',
  },
  {
    header: 'work_status',
    key: 'workStatus',
    required: true,
    validation: 'workStatus',
    normalise: { kind: 'enum', values: WorkStatus },
    disposition: 'imported',
    consumer: 'parseRow',
    destination: 'WorkEntity.status',
  },
  {
    header: 'title',
    key: 'title',
    required: true,
    validation: 'title',
    disposition: 'imported',
    consumer: 'parseTitles',
    destination: 'WorkEntity.titles[].title',
  },
  {
    header: 'subtitle',
    key: 'subtitle',
    required: false,
    validation: 'subtitle',
    disposition: 'imported',
    consumer: 'parseTitles',
    destination: 'WorkEntity.titles[].subtitle',
  },
  {
    header: 'edition',
    key: 'edition',
    required: false,
    validation: 'edition',
    disposition: 'imported',
    consumer: 'parseRow',
    destination: 'WorkEntity.edition',
  },
  {
    header: 'publication_date',
    key: 'publicationDate',
    required: false,
    boundary: 'report',
    preflight: 'isoDate',
    disposition: 'imported',
    consumer: 'parseRow',
    destination: 'WorkEntity.publicationDate',
  },
  {
    header: 'withdrawn_date',
    key: 'withdrawnDate',
    required: false,
    boundary: 'report',
    preflight: 'isoDate',
    disposition: 'imported',
    consumer: 'parseRow',
    destination: 'WorkEntity.withdrawnDate',
  },
  {
    header: 'place_of_publication',
    key: 'placeOfPublication',
    required: false,
    disposition: 'imported',
    consumer: 'parseRow',
    destination: 'WorkEntity.place',
    notes: 'Exact one-to-one mapping; imported since this schema consolidation.',
  },
  {
    header: 'cover_url',
    key: 'coverUrl',
    required: false,
    disposition: 'imported',
    consumer: 'parseRow',
    destination: 'WorkEntity.coverUrl',
  },
  {
    header: 'doi',
    key: 'doi',
    required: false,
    boundary: 'canonicalise',
    preflight: 'doi',
    disposition: 'imported',
    consumer: 'parseRow',
    destination: 'WorkEntity.doi',
    notes: 'Canonicalised to the https://doi.org/ resolver form during canonical-row construction.',
  },
  {
    header: 'page_count',
    key: 'pageCount',
    required: false,
    preflight: 'integer',
    disposition: 'imported',
    consumer: 'parseRow',
    destination: 'WorkEntity.pageCount',
  },
  {
    header: 'page_breakdown',
    key: 'pageBreakdown',
    required: false,
    disposition: 'imported',
    consumer: 'parsePageBreakdownField',
    destination: 'WorkEntity frontmatter/page/backmatter counts',
  },
  {
    header: 'image_count',
    key: 'imageCount',
    required: false,
    preflight: 'integer',
    disposition: 'imported',
    consumer: 'parseRow',
    destination: 'WorkEntity.imageCount',
  },
  {
    header: 'table_count',
    key: 'tableCount',
    required: false,
    preflight: 'integer',
    disposition: 'imported',
    consumer: 'parseRow',
    destination: 'WorkEntity.tableCount',
  },
  {
    header: 'audio_count',
    key: 'audioCount',
    required: false,
    preflight: 'integer',
    disposition: 'imported',
    consumer: 'parseRow',
    destination: 'WorkEntity.audioCount',
  },
  {
    header: 'video_count',
    key: 'videoCount',
    required: false,
    preflight: 'integer',
    disposition: 'imported',
    consumer: 'parseRow',
    destination: 'WorkEntity.videoCount',
  },
  {
    header: 'license',
    key: 'license',
    required: false,
    validation: 'license',
    boundary: 'report',
    disposition: 'imported',
    consumer: 'parseLicenseField',
    destination: 'WorkEntity.license',
  },
  {
    header: 'copyright_holder',
    key: 'copyrightHolder',
    required: false,
    disposition: 'imported',
    consumer: 'parseRow',
    destination: 'WorkEntity.copyrightHolder',
  },
  {
    header: 'landing_page',
    key: 'landingPage',
    required: false,
    disposition: 'imported',
    consumer: 'parseRow',
    destination: 'WorkEntity.landingPage',
  },
  {
    header: 'short_abstract',
    key: 'shortAbstract',
    required: false,
    preflight: 'importedText',
    disposition: 'imported',
    consumer: 'parseAbstracts',
    destination: 'WorkEntity.abstracts[] (SHORT)',
  },
  {
    header: 'long_abstract',
    key: 'longAbstract',
    required: false,
    preflight: 'importedText',
    disposition: 'imported',
    consumer: 'parseAbstracts',
    destination: 'WorkEntity.abstracts[] (LONG)',
  },
] as const);

const contributorFieldGroup = [
  {
    constant: 'FIRST_NAME',
    headerSuffix: 'first_name',
    keySuffix: 'FirstName',
    boundary: 'report',
    disposition: 'imported',
    consumer: 'parseContributors',
    destination: 'WorkContribution.firstName / fullName',
    notes: 'Boundary whitespace is reported, never trimmed: the name is the lookup identity.',
  },
  {
    constant: 'LAST_NAME',
    headerSuffix: 'surname',
    keySuffix: 'LastName',
    boundary: 'report',
    disposition: 'imported',
    consumer: 'parseContributors',
    destination: 'WorkContribution.lastName / fullName',
    notes: 'Boundary whitespace is reported, never trimmed: the name is the lookup identity.',
  },
  {
    constant: 'ROLE',
    headerSuffix: 'role',
    keySuffix: 'Role',
    validation: 'contributorRole',
    normalise: { kind: 'enum', values: ContributionType },
    disposition: 'imported',
    consumer: 'parseContributors',
    destination: 'WorkContribution.type',
  },
  {
    constant: 'BIOGRAPHY',
    headerSuffix: 'biography',
    keySuffix: 'Biography',
    preflight: 'importedText',
    disposition: 'imported',
    consumer: 'parseContributors',
    destination: 'WorkContribution.biographies[]',
  },
  {
    constant: 'ORCID',
    headerSuffix: 'orcid',
    keySuffix: 'Orcid',
    boundary: 'report',
    preflight: 'orcid',
    disposition: 'imported',
    consumer: 'parseContributors',
    destination: 'WorkContribution.orcidId',
  },
  {
    constant: 'WEBSITE',
    headerSuffix: 'website',
    keySuffix: 'Website',
    disposition: 'imported',
    consumer: 'parseContributors',
    destination: 'WorkContribution.website',
  },
  {
    constant: 'AFFILIATION_POSITION',
    headerSuffix: 'affiliation_position',
    keySuffix: 'AffiliationPosition',
    disposition: 'imported',
    consumer: 'parseContributors',
    destination: 'AffiliationEntity.position when a ROR resolves',
  },
  {
    constant: 'AFFILIATION_INSTITUTION_NAME',
    headerSuffix: 'affiliation_institution_name',
    keySuffix: 'AffiliationInstitutionName',
    disposition: 'compatibility-only',
    consumer: 'accepted but not consumed',
    destination: 'none',
    notes: 'Institution filtering is substring-based across name, ROR, and DOI; no exact name policy exists.',
  },
  {
    constant: 'AFFILIATION_INSTITUTION_ROR',
    headerSuffix: 'affiliation_institution_ror',
    keySuffix: 'AffiliationInstitutionRor',
    boundary: 'report',
    preflight: 'ror',
    disposition: 'imported',
    notes: 'Canonicalised to the https://ror.org/ resolver form — the form institutions carry — during canonical-row construction.',
    consumer: 'parseContributors',
    destination: 'AffiliationEntity institution fields',
  },
] as const satisfies readonly ContributorFieldGroupInput[];

const trailingFields = defineFields([
  {
    header: 'original_language',
    key: 'originalLanguage',
    required: false,
    validation: 'language',
    boundary: 'report',
    disposition: 'imported',
    consumer: 'parseLanguages',
    destination: 'WorkEntity.languages[] (ORIGINAL)',
  },
  {
    header: 'translated_from_language',
    key: 'translatedFromLanguage',
    required: false,
    validation: 'language',
    boundary: 'report',
    disposition: 'imported',
    consumer: 'parseLanguages',
    destination: 'WorkEntity.languages[] (TRANSLATED_FROM)',
  },
  {
    header: 'translated_into_language',
    key: 'translatedIntoLanguage',
    required: false,
    validation: 'language',
    boundary: 'report',
    disposition: 'imported',
    consumer: 'parseLanguages',
    destination: 'WorkEntity.languages[] (TRANSLATED_INTO)',
  },
  {
    header: 'thema_subjects',
    key: 'themaSubjects',
    required: false,
    disposition: 'imported',
    consumer: 'parseSubjects',
    destination: 'WorkEntity.subjects[] (THEMA)',
  },
  {
    header: 'bic_subjects',
    key: 'bicSubjects',
    required: false,
    disposition: 'imported',
    consumer: 'parseSubjects',
    destination: 'WorkEntity.subjects[] (BIC)',
  },
  {
    header: 'bisac_subjects',
    key: 'bisacSubjects',
    required: false,
    disposition: 'imported',
    consumer: 'parseSubjects',
    destination: 'WorkEntity.subjects[] (BISAC)',
  },
  {
    header: 'lcc_subjects',
    key: 'lccSubjects',
    required: false,
    optionalColumn: true,
    disposition: 'imported',
    consumer: 'parseSubjects',
    destination: 'WorkEntity.subjects[] (LCC)',
  },
  {
    header: 'keywords',
    key: 'keywords',
    required: false,
    disposition: 'imported',
    consumer: 'parseSubjects',
    destination: 'WorkEntity.subjects[] (KEYWORD)',
  },
  {
    header: 'publication_paperback_isbn',
    key: 'publicationPaperbackIsbn',
    required: false,
    validation: 'isbn',
    boundary: 'report',
    disposition: 'imported',
    consumer: 'parsePublication',
    destination: 'PublicationEntity.isbn (PAPERBACK)',
  },
  {
    header: 'publication_paperback_price_1_currency_code',
    key: 'publicationPaperbackPrice1CurrencyCode',
    required: false,
    validation: 'currency',
    boundary: 'report',
    disposition: 'imported',
    consumer: 'parsePublication',
    destination: 'PublicationEntity.prices[].currencyCode (PAPERBACK)',
  },
  {
    header: 'publication_paperback_price_1_unit_price',
    key: 'publicationPaperbackPrice1UnitPrice',
    required: false,
    preflight: 'decimal',
    disposition: 'imported',
    consumer: 'parsePublication',
    destination: 'PublicationEntity.prices[].unitPrice (PAPERBACK)',
  },
  {
    header: 'publication_hardback_isbn',
    key: 'publicationHardbackIsbn',
    required: false,
    validation: 'isbn',
    boundary: 'report',
    disposition: 'imported',
    consumer: 'parsePublication',
    destination: 'PublicationEntity.isbn (HARDBACK)',
  },
  {
    header: 'publication_hardback_price_1_currency_code',
    key: 'publicationHardbackPrice1CurrencyCode',
    required: false,
    validation: 'currency',
    boundary: 'report',
    disposition: 'imported',
    consumer: 'parsePublication',
    destination: 'PublicationEntity.prices[].currencyCode (HARDBACK)',
  },
  {
    header: 'publication_hardback_price_1_unit_price',
    key: 'publicationHardbackPrice1UnitPrice',
    required: false,
    preflight: 'decimal',
    disposition: 'imported',
    consumer: 'parsePublication',
    destination: 'PublicationEntity.prices[].unitPrice (HARDBACK)',
  },
  {
    header: 'publication_pdf_isbn',
    key: 'publicationPdfIsbn',
    required: false,
    validation: 'isbn',
    boundary: 'report',
    disposition: 'imported',
    consumer: 'parsePublication',
    destination: 'PublicationEntity.isbn (PDF)',
  },
  {
    header: 'publication_pdf_location_landing_page',
    key: 'publicationPdfLocationLandingPage',
    required: false,
    disposition: 'imported',
    consumer: 'parsePublication',
    destination: 'PublicationEntity.locations[].landingPage (PDF)',
  },
  {
    header: 'publication_pdf_location_full_text_url',
    key: 'publicationPdfLocationFullTextUrl',
    required: false,
    disposition: 'imported',
    consumer: 'parsePublication',
    destination: 'PublicationEntity.locations[].fullTextUrl (PDF)',
  },
  {
    header: 'publication_pdf_location_platform',
    key: 'publicationPdfLocationPlatform',
    required: false,
    validation: 'locationPlatform',
    normalise: { kind: 'enum', values: LocationPlatform },
    disposition: 'imported',
    consumer: 'parsePublication',
    destination: 'PublicationEntity.locations[].locationPlatform (PDF)',
  },
  {
    header: 'series_name',
    key: 'seriesName',
    required: false,
    boundary: 'canonicalise',
    disposition: 'imported',
    consumer: 'parseSeries',
    destination: 'SeriesImportPlan identity/name',
  },
  {
    header: 'series_issn',
    key: 'seriesIssn',
    required: false,
    disposition: 'compatibility-only',
    consumer: 'accepted but not consumed',
    destination: 'none',
    notes: 'Silently ignored: one value cannot distinguish print from digital ISSN and is not series identity.',
  },
  {
    header: 'series_issue_number',
    key: 'seriesIssueNumber',
    required: false,
    boundary: 'canonicalise',
    disposition: 'imported',
    consumer: 'parseSeries / parseIssueNumber',
    destination: 'SeriesImportPlan member ordinal',
  },
] as const);

type StaticField = (typeof workFields)[number] | (typeof trailingFields)[number];
type ContributorFieldBase = (typeof contributorFieldGroup)[number];

type InclusiveIntegerRange<
  Maximum extends number,
  Values extends unknown[] = [],
  Range = never,
> = Values['length'] extends Maximum
  ? Range | Maximum
  : InclusiveIntegerRange<Maximum, [...Values, unknown], Range | Values['length']>;

export type CsvContributorIndex = Exclude<InclusiveIntegerRange<typeof appConfig.maxCsvContributorsCount>, 0>;

export type CsvHeaderName =
  | StaticField['header']
  | `contribution_${CsvContributorIndex}_${ContributorFieldBase['headerSuffix']}`;

export type CsvFieldKey = StaticField['key'] | `contribution${CsvContributorIndex}${ContributorFieldBase['keySuffix']}`;

export type CsvFieldDefinition = CsvFieldDefinitionInput<CsvHeaderName, CsvFieldKey> & {
  contributorIndex?: number;
  contributorField?: ContributorFieldBase['constant'];
};

export type CsvRow = Record<CsvFieldKey, string>;

/** The validator advertises this wider cell union. It is narrowed once at the parser boundary. */
export type CsvValidatorCell = string | number | boolean;
export type CsvValidatorRow = Partial<Record<CsvFieldKey, CsvValidatorCell>>;

const contributorFields: CsvFieldDefinition[] = Array.from(
  { length: appConfig.maxCsvContributorsCount },
  (_, offset) => {
    // Array.from is bounded by the same literal used by CsvContributorIndex.
    const index = (offset + 1) as CsvContributorIndex;
    // These flags are deliberately parity data for csv-file-validator. The installed library's
    // `optional` flag does not omit headers; normalization supplies missing columns. Historically
    // only contributor slots 6+ set it, so the adapter must keep that exact observable config.
    const optionalColumn = index >= 6;

    return contributorFieldGroup.map((field: ContributorFieldBase & ContributorFieldGroupInput) => {
      const {
        constant,
        headerSuffix,
        keySuffix,
        validation,
        normalise,
        boundary,
        preflight,
        disposition,
        consumer,
        destination,
        notes,
      } = field;

      return {
        header: `contribution_${index}_${headerSuffix}` as const,
        key: `contribution${index}${keySuffix}` as const,
        required: false,
        ...(optionalColumn ? { optionalColumn: true } : {}),
        ...(validation ? { validation } : {}),
        ...(normalise ? { normalise } : {}),
        ...(boundary ? { boundary } : {}),
        ...(preflight ? { preflight } : {}),
        disposition,
        consumer,
        destination,
        ...(notes ? { notes } : {}),
        contributorIndex: index,
        contributorField: constant,
      };
    });
  },
).flat();

/** The one authoritative, ordered description of every canonical CSV field. */
export const csvSchema: readonly CsvFieldDefinition[] = [...workFields, ...contributorFields, ...trailingFields];

type StaticCsvKeys = {
  readonly [Field in StaticField as Uppercase<Field['header']>]: Field['key'];
};

/** Readable parser constants, mechanically derived from the schema's static fields. */
export const CSV_KEYS = Object.freeze(
  Object.fromEntries(
    [...workFields, ...trailingFields].map(({ header, key }) => [header.toUpperCase(), key]),
  ) as StaticCsvKeys,
);

export type ContributorFields = {
  readonly [Field in ContributorFieldBase as Field['constant']]: `contribution${CsvContributorIndex}${Field['keySuffix']}`;
};

/** Returns the schema-backed keys for one contributor slot; programmer misuse fails loudly. */
export const getContributorFieldsByIndex = (position: number): ContributorFields => {
  if (!Number.isInteger(position) || position < 1 || position > appConfig.maxCsvContributorsCount) {
    throw new RangeError(`CSV contributor index must be between 1 and ${appConfig.maxCsvContributorsCount}`);
  }

  const fields = csvSchema.filter(({ contributorIndex }) => contributorIndex === position);

  return Object.fromEntries(fields.map(({ contributorField, key }) => [contributorField, key])) as ContributorFields;
};

const buildEnumAliasMap = (enumValues: Record<string, string>): ReadonlyMap<string, string> => {
  const aliases = new Map<string, string>();

  for (const [key, value] of Object.entries(enumValues)) {
    const display = key.replace(/([A-Z])/g, ' $1').trim();

    aliases.set(value.toLowerCase(), value);
    aliases.set(key.toLowerCase(), value);
    aliases.set(display.toLowerCase(), value);
  }

  return aliases;
};

const enumAliases = new Map(
  csvSchema
    .filter((field) => field.normalise?.kind === 'enum')
    .map((field) => [field.key, buildEnumAliasMap(field.normalise!.values)] as const),
);

export const normaliseCsvValue = (field: CsvFieldDefinition, value: string): string => {
  if (!field.normalise || value.trim() === '') return value;

  return enumAliases.get(field.key)?.get(value.trim().toLowerCase()) ?? value;
};

export const normaliseCsvHeader = (value: string): string => {
  const trimmed = value.trim();

  for (const field of csvSchema) {
    const alias = field.aliases?.find(({ header, caseInsensitive }) =>
      caseInsensitive ? header.toLowerCase() === trimmed.toLowerCase() : header === trimmed,
    );

    if (alias) return field.header;
  }

  return trimmed;
};
