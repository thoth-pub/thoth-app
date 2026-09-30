import { PublicationType } from '@/src/shared/constants/publications';
import { WorkTypes } from '@/src/shared/constants/work';

import { defineOnixRegressionFixture } from '../../fixtureSources';
import type { OnixPlanFindingEntry, OnixProductEntry, OnixRecordEntry } from '../../types';

const { Paperback, Pdf } = PublicationType.enum;
const { Monograph } = WorkTypes.enum;

/**
 * One Work in two manifestations - a paperback and a PDF - stated by a small, schema-valid ONIX 3.1 Reference message,
 * followed from the uploaded bytes through the source gate and the normalised source to the plan, before and after the
 * one decision the file leaves to the publisher (its WorkType).
 */

const PAPERBACK = 'product:gtin13:9781800000018';
const PDF = 'product:gtin13:9781800000025';
const WORK = `work:${PAPERBACK}`;

const RECORDS: OnixRecordEntry[] = [
  {
    index: 1,
    recordReference: 'regression-press.9781800000018',
    disposition: 'COMPLETE',
    productKey: PAPERBACK,
    action: 'PLANNED',
  },
  {
    index: 2,
    recordReference: 'regression-press.9781800000025',
    disposition: 'COMPLETE',
    productKey: PDF,
    action: 'PLANNED',
  },
];

const products = (executable: boolean): OnixProductEntry[] => [
  {
    productKey: PAPERBACK,
    groupKey: WORK,
    isbn: '9781800000018',
    // ProductForm BC is exactly a Thoth paperback.
    manifestation: { kind: 'RESOLVED', type: Paperback, classification: 'SUPPORTED_LOSSLESS', notes: [] },
    publicationType: Paperback,
    action: 'CREATE_PUBLICATION',
    executable,
  },
  {
    productKey: PDF,
    groupKey: WORK,
    isbn: '9781800000025',
    // EB + E107 is a PDF; the digital delivery mode EB itself has nowhere to go in Thoth.
    manifestation: {
      kind: 'RESOLVED',
      type: Pdf,
      classification: 'SUPPORTED_NORMALIZED',
      notes: [{ code: 'DELIVERY_MODE_NOT_REPRESENTED', detail: 'EB' }],
    },
    publicationType: Pdf,
    action: 'CREATE_PUBLICATION',
    executable,
  },
];

const finding = (
  family: OnixPlanFindingEntry['family'],
  code: string,
  classification: OnixPlanFindingEntry['classification'],
  productKey: string | null,
): OnixPlanFindingEntry => ({
  family,
  code,
  classification,
  blocking: false,
  resolution: 'NONE',
  answer: 'NOT_APPLICABLE',
  productKey,
  groupKey: WORK,
});

/** Nothing here waits on the publisher: every finding is a disclosure of what the import does with the source. */
const FINDINGS: OnixPlanFindingEntry[] = [
  // Only a main-content page count is stated (ExtentType 00); it becomes the Work page count.
  finding('DESCRIPTIVE', 'EXTENT_MAIN_CONTENT_ONLY', 'SUPPORTED_WITH_WARNING', PAPERBACK),
  // ONIX states no main contribution, so every contribution is imported as main.
  finding('DESCRIPTIVE', 'CONTRIBUTOR_MAIN_NORMALISED', 'SUPPORTED_NORMALIZED', PAPERBACK),
  // Thema declared as version 1.5, which no pinned vocabulary covers: fail closed, never imported.
  finding('DESCRIPTIVE', 'SUBJECT_VERSION_UNKNOWN', 'UNKNOWN', PAPERBACK),
  finding('DESCRIPTIVE', 'CONTRIBUTOR_MAIN_NORMALISED', 'SUPPORTED_NORMALIZED', PDF),
  // TextItemType 03 body matter becomes a book chapter that cannot say it was body matter ...
  finding('COMPONENT', 'COMPONENT_MATTER_NOT_REPRESENTED', 'SUPPORTED_NORMALIZED', PAPERBACK),
  // ... and its ComponentTypeName "Chapter" has no Thoth field.
  finding('COMPONENT', 'COMPONENT_LABEL_NOT_REPRESENTED', 'TARGET_UNREPRESENTABLE', PAPERBACK),
  finding('COMPONENT', 'COMPONENT_MATTER_NOT_REPRESENTED', 'SUPPORTED_NORMALIZED', PDF),
  finding('COMPONENT', 'COMPONENT_LABEL_NOT_REPRESENTED', 'TARGET_UNREPRESENTABLE', PDF),
  // The TextType 03 description becomes the Work's long abstract, as no TextType 30 competes with it.
  finding('COLLATERAL', 'COLLATERAL_TEXT_DESCRIPTION_NORMALISED', 'SUPPORTED_NORMALIZED', null),
];

const EDITION = { status: 'RESOLVED', edition: 1, basis: 'DEFAULT_FIRST_EDITION' } as const;
const WORK_DOI = { kind: 'DOI', doi: 'https://doi.org/10.5555/regression.0001', basis: 'WORK_IDENTIFIER' } as const;

export default defineOnixRegressionFixture({
  id: 'representative-onix31-two-manifestations',
  status: 'CONTRACT',
  purpose:
    'Proves the whole pipeline on a schema-valid ONIX 3.1 Reference message: an empty source gate, the normalised ' +
    'Reference source, two manifestations grouped into one new Work by their shared Work DOI, the publisher WorkType ' +
    'decision, and the executable plan it unlocks - with lossless, normalised, warning, unrepresentable, ' +
    'input-required and fail-closed unknown outcomes in one run.',
  source: {
    origin: 'SYNTHETIC',
    provenance:
      'Written for thoth-app#236. Every name, identifier and text is invented; the ISBNs and ORCID carry valid check ' +
      'characters and the DOI uses the 10.5555 test prefix. Independently validated with native xmllint (ordinary XSD), ' +
      'xmlschema 4.3.2 (XSD 1.1 strict) and an elementpath Schematron evaluation of the pinned Issue 74 artefacts: no ' +
      'finding.',
    sha256: '841349952f29fe0502c2ac472ed19e9d02f07d143cac42697657eda4650f3c9b',
  },
  defects: [],
  asOf: '2026-09-28T12:00:00.000Z',
  imprints: [{ label: 'Regression Press', value: '11111111-1111-4111-8111-111111111111' }],
  gate: {
    verdict: 'PERMITTED',
    release: '3.1',
    flavour: 'reference',
    findings: [],
    recoveries: [],
  },
  normalized: {
    '/onix:ONIXMessage/@release': ['3.1'],
    '/onix:ONIXMessage/onix:Product/onix:RecordReference': [
      'regression-press.9781800000018',
      'regression-press.9781800000025',
    ],
    '/onix:ONIXMessage/onix:Product/onix:ProductIdentifier[onix:ProductIDType = "15"]/onix:IDValue': [
      '9781800000018',
      '9781800000025',
    ],
    '/onix:ONIXMessage/onix:Product/onix:DescriptiveDetail/onix:ProductForm': ['BC', 'EB'],
    '/onix:ONIXMessage/onix:Product/onix:ContentDetail/onix:ContentItem/onix:TextItem/onix:PageRun/onix:FirstPageNumber':
      ['1', '1'],
    '/onix:ONIXMessage/onix:Product/onix:DescriptiveDetail/onix:Subject[onix:SubjectSchemeIdentifier = "93"]/onix:SubjectSchemeVersion':
      ['1.5'],
  },
  scenarios: [
    {
      name: 'as uploaded, before any publisher decision',
      target: 'EMPTY_PUBLISHER',
      planning: {
        executable: false,
        records: RECORDS,
        products: products(false),
        workGroups: [
          {
            groupKey: WORK,
            productKeys: [PAPERBACK, PDF],
            target: 'NEW_WORK',
            workType: { status: 'UNRESOLVED' },
            edition: EDITION,
            workDoi: WORK_DOI,
            executable: false,
          },
        ],
        // ONIX does not state a Thoth WorkType; the file never guesses one.
        blockers: [
          {
            code: 'WORK_TYPE_INPUT_REQUIRED',
            classification: 'TARGET_INPUT_REQUIRED',
            recordKey: null,
            productKey: null,
            groupKey: WORK,
          },
        ],
        findings: FINDINGS,
        works: [],
        chapters: [],
      },
      outcomes: {
        SUPPORTED_LOSSLESS: 1,
        SUPPORTED_NORMALIZED: 6,
        SUPPORTED_WITH_WARNING: 1,
        TARGET_UNREPRESENTABLE: 2,
        TARGET_INPUT_REQUIRED: 1,
        UNKNOWN: 1,
      },
    },
    {
      name: 'publisher takes MONOGRAPH as the file WorkType',
      target: 'EMPTY_PUBLISHER',
      inputs: { fileWorkType: Monograph },
      planning: {
        executable: true,
        records: RECORDS,
        products: products(true),
        workGroups: [
          {
            groupKey: WORK,
            productKeys: [PAPERBACK, PDF],
            target: 'NEW_WORK',
            workType: { status: 'RESOLVED', type: Monograph, provenance: 'USER_FILE_DEFAULT' },
            edition: EDITION,
            workDoi: WORK_DOI,
            executable: true,
          },
        ],
        blockers: [],
        findings: FINDINGS,
        works: [
          {
            type: 'MONOGRAPH',
            status: 'ACTIVE',
            doi: 'https://doi.org/10.5555/regression.0001',
            edition: 1,
            publicationDate: '2026-03-01',
            pageCount: 120,
            titles: [
              {
                canonical: true,
                localeCode: 'EN',
                fullTitle: 'Regression Fixtures: A Contract in Five Stages',
                title: 'Regression Fixtures',
                subtitle: 'A Contract in Five Stages',
              },
            ],
            publications: [
              { type: 'PAPERBACK', isbn: '9781800000018' },
              { type: 'PDF', isbn: '9781800000025' },
            ],
            // The bare ORCID the source declares, in the hyphenated form the plan writes.
            contributions: [
              {
                fullName: 'Ada Lovelace',
                type: 'AUTHOR',
                isMain: true,
                orderNumber: 1,
                orcidId: '0000-0002-1825-0097',
              },
            ],
            languages: [{ code: 'ENG', relation: 'ORIGINAL' }],
            // The Thema subject of an unpinned version is not among them.
            subjects: [
              { type: 'BISAC', code: 'COM051000', ordinal: 1 },
              { type: 'KEYWORD', code: 'regression testing', ordinal: 1 },
              { type: 'KEYWORD', code: 'metadata', ordinal: 2 },
            ],
          },
        ],
        chapters: [
          { type: 'BOOK_CHAPTER', fullTitle: 'The Source Gate', firstPage: '1', lastPage: '60', pageCount: 60 },
        ],
      },
      outcomes: {
        SUPPORTED_LOSSLESS: 1,
        SUPPORTED_NORMALIZED: 6,
        SUPPORTED_WITH_WARNING: 1,
        TARGET_UNREPRESENTABLE: 2,
        UNKNOWN: 1,
      },
    },
  ],
});
