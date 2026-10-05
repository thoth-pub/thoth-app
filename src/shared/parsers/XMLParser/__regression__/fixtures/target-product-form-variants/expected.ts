import type { PublicationType as PublicationTypeValue } from '@/src/entities/publication/model/publication.types';
import { PublicationType } from '@/src/shared/constants/publications';
import { WorkTypes } from '@/src/shared/constants/work';

import { defineOnixRegressionFixture } from '../../fixtureSources';
import type {
  OnixPlanningExpectation,
  OnixProductEntry,
  OnixRecordEntry,
  OnixSourceFindingEntry,
  OnixTargetLedger,
} from '../../types';

const { Azw3, Epub, Hardback, Mobi, Mp3, Paperback, Pdf } = PublicationType.enum;
const { Monograph } = WorkTypes.enum;

/**
 * Nine Products, two Works, every manifestation outcome (thoth-app#249):
 *
 * - Work 1, grouped by its Work DOI: a hardback, a book of unspecified binding, an EPUB with a layout detail, a PDF/A
 *   download and an online PDF - two PDFs, which the Work can hold only one of;
 * - Work 2, grouped by alternative-format (RelatedProduct 06) edges from its downloadable MP3: an Amazon Kindle file,
 *   a multiple-component package and an audio CD.
 *
 * The Header names Thoth as sender without Thoth's distribution address, so the Thoth-native identifiers the hardback
 * record carries are never decoded: the record is listed as ignored and the Product planned generically.
 *
 * Contract authority: ONIX-AUDIT-DESCRIPTIVE-MANIFESTATION-01 `5543749368` rules 8-47 (approved `5545670440`);
 * ONIX-AUDIT-PRODUCT-IDENTITY-01 `5545771626` rules 43-55, 85-86, 95, 140 (approved `5551075412`); #182 authorization
 * `5653959949` and Amendment 4 `5812548957`; #209 section D (omission controls).
 */

const ISBNS = [
  '9781800001015',
  '9781800001022',
  '9781800001039',
  '9781800001046',
  '9781800001053',
  '9781800001060',
  '9781800001077',
  '9781800001084',
  '9781800001091',
];
const KEY = ISBNS.map((isbn) => `product:gtin13:${isbn}`);
const [HARDBACK, UNSPECIFIED, _EPUB, _PDF_A, PDF_ONLINE, MP3, KINDLE, PACKAGE, AUDIO_CD] = KEY;
const WORK_1 = `work:${HARDBACK}`;
const WORK_2 = `work:${MP3}`;
const DOI = 'https://doi.org/10.5555/regression.d101';
const PUBLICATION_UUID = '0cdbb160-2e47-511a-a825-8c5bf7f6b0ca';

const RECORDS: OnixRecordEntry[] = KEY.map((productKey, index) => ({
  index: index + 1,
  recordReference: index === 0 ? `urn:uuid:${PUBLICATION_UUID}` : `regression-press.${ISBNS[index]}`,
  disposition: 'COMPLETE',
  productKey,
  action: 'PLANNED',
}));

const note = (code: string, detail: string) => ({ code, detail }) as OnixProductEntry['manifestation']['notes'][number];

type Decided = 'AS_UPLOADED' | 'DECIDED';

const products = (state: Decided): OnixProductEntry[] => {
  const decided = state === 'DECIDED';
  const entry = (
    index: number,
    groupKey: string,
    manifestation: OnixProductEntry['manifestation'],
    publicationType: PublicationTypeValue | null,
    action: OnixProductEntry['action'],
  ): OnixProductEntry => ({
    productKey: KEY[index],
    groupKey,
    isbn: ISBNS[index],
    manifestation,
    publicationType,
    action,
    executable: decided,
  });

  return [
    // BB is exactly a Thoth hardback (rule 20).
    entry(
      0,
      WORK_1,
      { kind: 'RESOLVED', type: Hardback, classification: 'SUPPORTED_LOSSLESS', notes: [] },
      Hardback,
      'CREATE_PUBLICATION',
    ),
    // BA chooses no binding: the publisher does, never a default (rule 22).
    entry(
      1,
      WORK_1,
      { kind: 'INPUT_REQUIRED', reason: 'BINDING_UNSPECIFIED', candidates: [Paperback, Hardback], notes: [] },
      decided ? Paperback : null,
      decided ? 'CREATE_PUBLICATION' : null,
    ),
    // E101 is EPUB; the delivery mode and the E200 layout detail are disclosed losses (rules 24-25, 42).
    entry(
      2,
      WORK_1,
      {
        kind: 'RESOLVED',
        type: Epub,
        classification: 'SUPPORTED_NORMALIZED',
        notes: [note('DELIVERY_MODE_NOT_REPRESENTED', 'EB'), note('DETAIL_NOT_REPRESENTED', 'E200')],
      },
      Epub,
      'CREATE_PUBLICATION',
    ),
    // E108 is PDF, with PDF/A conformance not represented (rule 29); ED is a download, never itself a PDF (rule 19).
    entry(
      3,
      WORK_1,
      {
        kind: 'RESOLVED',
        type: Pdf,
        classification: 'SUPPORTED_NORMALIZED',
        notes: [note('DELIVERY_MODE_NOT_REPRESENTED', 'ED'), note('PDF_A_NOT_REPRESENTED', 'E108')],
      },
      Pdf,
      'CREATE_PUBLICATION',
    ),
    // A second PDF of the same Work: the Work holds one Publication per type (rules 46-47).
    entry(
      4,
      WORK_1,
      {
        kind: 'RESOLVED',
        type: Pdf,
        classification: 'SUPPORTED_NORMALIZED',
        notes: [note('DELIVERY_MODE_NOT_REPRESENTED', 'EC')],
      },
      decided ? null : Pdf,
      decided ? 'OMIT/EXCLUDED' : 'CREATE_PUBLICATION',
    ),
    // AJ + A103 is MP3; AJ alone never would be (rules 36-37, 39).
    entry(
      5,
      WORK_2,
      {
        kind: 'RESOLVED',
        type: Mp3,
        classification: 'SUPPORTED_NORMALIZED',
        notes: [note('DELIVERY_MODE_NOT_REPRESENTED', 'AJ')],
      },
      Mp3,
      'CREATE_PUBLICATION',
    ),
    // E116 Amazon Kindle is not automatically AZW3 or MOBI (rule 33).
    entry(
      6,
      WORK_2,
      {
        kind: 'INPUT_REQUIRED',
        reason: 'KINDLE_FAMILY',
        candidates: [Mobi, Azw3],
        notes: [note('DELIVERY_MODE_NOT_REPRESENTED', 'EB')],
      },
      decided ? Azw3 : null,
      decided ? 'CREATE_PUBLICATION' : null,
    ),
    // A multiple-component retail product (composition 10, SA, ProductParts) is never one Publication (rules 10, 14-15).
    entry(
      7,
      WORK_2,
      { kind: 'UNREPRESENTABLE', reason: 'PACKAGE', acknowledgementRequired: true, notes: [] },
      null,
      decided ? 'OMIT/EXCLUDED' : null,
    ),
    // An audio CD has no Thoth PublicationType: an explicit loss with no acknowledgement (rules 23, 40).
    entry(
      8,
      WORK_2,
      { kind: 'UNREPRESENTABLE', reason: 'FORM_UNREPRESENTABLE', acknowledgementRequired: false, notes: [] },
      null,
      'OMIT/EXCLUDED',
    ),
  ];
};

const ADVISORY_PATH = (product: number) => `/ONIXMessage[1]/Product[${product}]/DescriptiveDetail[1]/ProductForm[1]`;
const genericForm = (product: number): OnixSourceFindingEntry => ({
  id: '_20240412_c_1',
  tier: 'SCHEMATRON',
  scope: 'VALIDITY',
  class: 'ADVISORY',
  blocking: false,
  projection: 'AUTHORITATIVE',
  recoverability: 'NOT_RECOVERABLE',
  counts: false,
  path: ADVISORY_PATH(product),
});

const silentRights = (index: number, carrier: 'DIGITAL' | 'PHYSICAL' | 'UNDETERMINED') => ({
  productKey: KEY[index],
  carrier,
  expressions: [],
  licence: { kind: 'SILENT' as const },
  dated: false,
  technicalProtection: [],
  technicalProtectionState: 'UNKNOWN' as const,
  usageConstraints: [],
  deferredRights: [],
});

const features = (index: number, publications: [PublicationTypeValue, 'PHYSICAL' | 'DIGITAL' | 'AUDIO'][]) => ({
  productKey: KEY[index],
  features: [],
  primaryStandards: [],
  additionalStandards: [],
  exceptions: [],
  reportUrls: [],
  publications: publications.map(([publicationType, scope]) => ({
    publicationType,
    scope,
    additionalStandards: [],
    incompatibleAdditionalStandards: [],
  })),
});

const created = (index: number, publicationType: PublicationTypeValue) => ({
  productKey: KEY[index],
  publicationType,
  resolved: {
    accessibilityStandard: null,
    accessibilityAdditionalStandard: null,
    accessibilityException: null,
    accessibilityReportUrl: null,
  },
  sources: [],
  omitted: [],
  action: 'CREATE' as const,
});

const noSupply = (index: number, carriers: ('DIGITAL' | 'PHYSICAL')[]) => ({
  productKey: KEY[index],
  supplies: [],
  prices: [],
  carriers: Object.fromEntries(carriers.map((carrier) => [carrier, { kind: 'NONE' as const }])),
  plannedLocations: [],
});

const workIdentity = (index: number) => ({
  declarationKey: `${KEY[index]}|/ONIXMessage[1]/Product[${index + 1}]/RelatedMaterial[1]/RelatedWork[1]/WorkRelationCode[1]`,
  path: `/ONIXMessage[1]/Product[${index + 1}]/RelatedMaterial[1]/RelatedWork[1]`,
  productKey: KEY[index],
  construct: 'RELATED_WORK' as const,
  code: '01',
  outcome: 'WORK_IDENTITY' as const,
  endpoint: null,
  relationType: null,
  edgeKey: null,
});

const alternativeFormat = (n: number) => ({
  declarationKey: `${MP3}|/ONIXMessage[1]/Product[6]/RelatedMaterial[1]/RelatedProduct[${n}]/ProductRelationCode[1]`,
  path: `/ONIXMessage[1]/Product[6]/RelatedMaterial[1]/RelatedProduct[${n}]`,
  productKey: MP3,
  construct: 'RELATED_PRODUCT' as const,
  code: '06',
  // Same-content manifestation evidence the grouping read, never a Work relation (RelatedMaterial rule 13).
  outcome: 'GROUPING_EVIDENCE' as const,
  endpoint: null,
  relationType: null,
  edgeKey: null,
});

const evidence = (state: Decided, index: number) => {
  if (index === 8) return [{ kind: 'MANIFESTATION_OMITTED' as const, reason: 'UNREPRESENTABLE' as const }];
  if (state === 'DECIDED' && index === 4)
    return [{ kind: 'MANIFESTATION_OMITTED' as const, reason: 'PUBLISHER_CHOICE' as const }];
  if (state === 'DECIDED' && index === 7)
    return [{ kind: 'MANIFESTATION_OMITTED' as const, reason: 'ACKNOWLEDGED' as const }];
  // A Product whose manifestation is still undecided has no action, and so no evidence for one.
  if (state === 'AS_UPLOADED' && [1, 6, 7].includes(index)) return [];

  return [{ kind: 'NO_TARGET_MATCH' as const }];
};

/**
 * Only a format the file leaves open, a package and a type another Product of the Work also takes may be omitted
 * (#209 section D); never a Publication the file resolves on its own.
 */
const OMITTABLE = [false, true, false, true, true, false, true, true, false];

const publication = (type: PublicationTypeValue, isbn: string) => ({
  type,
  isbn,
  prices: [],
  locations: [],
  accessibilityStandard: null,
  accessibilityAdditionalStandard: null,
  accessibilityException: null,
  accessibilityReportUrl: '',
});

const plannedWork = (publications: ReturnType<typeof publication>[]) => ({
  license: '',
  withdrawnDate: null,
  landingPage: '',
  place: '',
  copyrightHolder: '',
  coverUrl: null,
  coverCaption: null,
  toc: null,
  generalNote: '',
  bibliographyNote: '',
  lccn: '',
  oclc: '',
  reference: '',
  abstracts: [],
  publications,
  references: [],
  additionalResources: [],
  bookReviews: [],
  endorsements: [],
  awards: [],
});

const descriptive = (groupKey: string) => ({
  groupKey,
  subjects: [],
  primaryChoices: [],
  series: [],
  noCollection: false,
  lifecycle: {
    status: { kind: 'VALUE' as const, status: 'ACTIVE' },
    publicationDate: '2026-03-01',
    withdrawnDate: null,
  },
  cover: { kind: 'ABSENT' as const },
  profileCover: { kind: 'ABSENT' as const },
});

const target = (state: Decided): OnixTargetLedger => {
  const decided = state === 'DECIDED';

  return {
    findings: [],
    identity: {
      // SenderName "Thoth" alone never activates the profile (rule 85): the native ids are ignored, and said so.
      compatibility: { headerMatches: false, ignoredNativeRecordKeys: ['record:1'], activation: 'NOT_APPLICABLE' },
      groups: [
        {
          groupKey: WORK_1,
          compatibility: 'GENERIC',
          thothVerification: 'NOT_APPLICABLE',
          edges: [{ kind: 'WORK_IDENTITY', key: `workdoi:${DOI}`, productKeys: KEY.slice(0, 5) }],
          evidence: [{ kind: 'NO_TARGET_MATCH' }],
        },
        {
          groupKey: WORK_2,
          compatibility: 'GENERIC',
          thothVerification: 'NOT_APPLICABLE',
          // In-file alternative formats join the Products into one Work (rules 51-55).
          edges: [KINDLE, PACKAGE, AUDIO_CD].map((to, n) => ({
            kind: 'ALTERNATIVE_FORMAT' as const,
            from: MP3,
            to,
            path: `/ONIXMessage[1]/Product[6]/RelatedMaterial[1]/RelatedProduct[${n + 1}]`,
          })),
          evidence: [{ kind: 'NO_TARGET_MATCH' }],
        },
      ],
      products: KEY.map((productKey, index) => ({
        productKey,
        recordKeys: [`record:${index + 1}`],
        evidence: evidence(state, index),
        omittable: OMITTABLE[index],
      })),
    },
    descriptive: [descriptive(WORK_1), descriptive(WORK_2)],
    // A Location carrier for every type the manifestation could still become; none for a package or an audio CD.
    commercial: [
      noSupply(0, ['PHYSICAL']),
      noSupply(1, ['PHYSICAL']),
      noSupply(2, ['DIGITAL']),
      noSupply(3, ['DIGITAL']),
      noSupply(4, ['DIGITAL']),
      noSupply(5, ['DIGITAL']),
      noSupply(6, ['DIGITAL']),
      noSupply(7, []),
      noSupply(8, []),
    ],
    priceResolutions: [],
    rights: {
      products: [
        silentRights(0, 'PHYSICAL'),
        silentRights(1, 'PHYSICAL'),
        silentRights(2, 'DIGITAL'),
        silentRights(3, 'DIGITAL'),
        silentRights(4, 'DIGITAL'),
        silentRights(5, 'DIGITAL'),
        silentRights(6, 'DIGITAL'),
        // A package's carrier is never assumed physical (licence rule 84).
        silentRights(7, 'UNDETERMINED'),
        silentRights(8, 'PHYSICAL'),
      ],
      groups: [
        { groupKey: WORK_1, licence: { kind: 'UNSET' } },
        { groupKey: WORK_2, licence: { kind: 'UNSET' } },
      ],
      licenceActions: [
        { groupKey: WORK_1, action: { kind: 'UNSET' } },
        { groupKey: WORK_2, action: { kind: 'UNSET' } },
      ],
      acknowledgedFindingKeys: [],
    },
    accessibility: {
      products: [
        features(0, [[Hardback, 'PHYSICAL']]),
        features(1, [
          [Paperback, 'PHYSICAL'],
          [Hardback, 'PHYSICAL'],
        ]),
        features(2, [[Epub, 'DIGITAL']]),
        features(3, [[Pdf, 'DIGITAL']]),
        features(4, [[Pdf, 'DIGITAL']]),
        features(5, [[Mp3, 'AUDIO']]),
        features(6, [
          [Mobi, 'DIGITAL'],
          [Azw3, 'DIGITAL'],
        ]),
        features(7, []),
        features(8, []),
      ],
      contacts: [],
      // Only a Publication the plan creates, as the one type it takes, has an accessibility action.
      actions: decided
        ? [
            created(0, Hardback),
            created(1, Paperback),
            created(2, Epub),
            created(3, Pdf),
            created(5, Mp3),
            created(6, Azw3),
          ]
        : [created(0, Hardback), created(2, Epub), created(3, Pdf), created(4, Pdf), created(5, Mp3)],
    },
    components: [],
    relatedMaterial: {
      outcomes: [0, 1, 2, 3, 4].map(workIdentity).concat([1, 2, 3].map(alternativeFormat) as never[]),
      edges: [],
      productReferences: KEY.map((productKey) => ({ productKey, asserted: false, references: [] })),
      referenceActions: [
        { groupKey: WORK_1, action: { kind: 'NONE' } },
        { groupKey: WORK_2, action: { kind: 'NONE' } },
      ],
    },
    collateral: {
      textContents: [],
      resources: [],
      candidates: [],
      actions: [WORK_1, WORK_2].map((groupKey) => ({
        groupKey,
        productKey: null,
        componentPath: null,
        target: 'WORK' as const,
        action: 'PLANNED' as const,
        abstracts: [],
        tableOfContents: null,
        generalNote: null,
        resources: [],
      })),
    },
    reviewsPrizes: {
      citedContents: [],
      prizes: [],
      candidates: [WORK_1, WORK_2].map((groupKey) => ({
        scope: 'WORK' as const,
        key: groupKey,
        reviews: [],
        endorsements: [],
        prizes: [],
        ordering: {
          BOOK_REVIEW: { status: 'EMPTY' as const },
          ENDORSEMENT: { status: 'EMPTY' as const },
          AWARD: { status: 'EMPTY' as const },
        },
      })),
      actions: [WORK_1, WORK_2].map((groupKey) => ({
        groupKey,
        productKey: null,
        componentPath: null,
        target: 'WORK' as const,
        action: 'PLANNED' as const,
        bookReviews: [],
        endorsements: [],
        awards: [],
      })),
    },
    plan: decided
      ? {
          works: [
            plannedWork([
              publication(Hardback, ISBNS[0]),
              publication(Paperback, ISBNS[1]),
              publication(Epub, ISBNS[2]),
              publication(Pdf, ISBNS[3]),
            ]),
            plannedWork([publication(Mp3, ISBNS[5]), publication(Azw3, ISBNS[6])]),
          ],
          containedWorks: [],
          series: [],
          relations: [],
        }
      : { works: [], containedWorks: [], series: [], relations: [] },
  };
};

const workTypeBlocker = (groupKey: string) => ({
  code: 'WORK_TYPE_INPUT_REQUIRED',
  classification: 'TARGET_INPUT_REQUIRED' as const,
  recordKey: null,
  productKey: null,
  groupKey,
});

const workGroups = (state: Decided): OnixPlanningExpectation['workGroups'] => {
  const decided = state === 'DECIDED';
  const workType = decided
    ? ({ status: 'RESOLVED', type: Monograph, provenance: 'USER_FILE_DEFAULT' } as const)
    : ({ status: 'UNRESOLVED' } as const);

  return [
    {
      groupKey: WORK_1,
      productKeys: KEY.slice(0, 5),
      target: 'NEW_WORK',
      workType,
      edition: { status: 'RESOLVED', edition: 1, basis: 'DEFAULT_FIRST_EDITION' },
      workDoi: { kind: 'DOI', doi: DOI, basis: 'WORK_IDENTIFIER' },
      executable: decided,
    },
    {
      groupKey: WORK_2,
      productKeys: KEY.slice(5),
      target: 'NEW_WORK',
      workType,
      edition: { status: 'RESOLVED', edition: 1, basis: 'DEFAULT_FIRST_EDITION' },
      workDoi: { kind: 'NONE' },
      executable: decided,
    },
  ];
};

const work = (title: string, doi: string, publications: { type: string; isbn: string }[]) => ({
  type: 'MONOGRAPH',
  status: 'ACTIVE',
  doi,
  edition: 1,
  publicationDate: '2026-03-01',
  pageCount: 0,
  titles: [{ canonical: true, localeCode: 'EN', fullTitle: title, title, subtitle: '' }],
  publications,
  contributions: [],
  languages: [{ code: 'ENG', relation: 'ORIGINAL' }],
  subjects: [],
});

const planning = (state: Decided): OnixPlanningExpectation => ({
  executable: state === 'DECIDED',
  records: RECORDS,
  products: products(state),
  workGroups: workGroups(state),
  blockers:
    state === 'DECIDED'
      ? []
      : [
          {
            code: 'MANIFESTATION_INPUT_REQUIRED',
            classification: 'TARGET_INPUT_REQUIRED',
            recordKey: null,
            productKey: UNSPECIFIED,
            groupKey: null,
          },
          {
            code: 'MANIFESTATION_INPUT_REQUIRED',
            classification: 'TARGET_INPUT_REQUIRED',
            recordKey: null,
            productKey: KINDLE,
            groupKey: null,
          },
          // A package omission needs the publisher's source-bound acknowledgement (rule 15).
          {
            code: 'MANIFESTATION_ACKNOWLEDGEMENT_REQUIRED',
            classification: 'TARGET_UNREPRESENTABLE',
            recordKey: null,
            productKey: PACKAGE,
            groupKey: null,
          },
          // Two grouped Products normalise to PDF: never silently deduplicated (rule 46).
          {
            code: 'SAME_TYPE_COLLISION',
            classification: 'TARGET_UNREPRESENTABLE',
            recordKey: null,
            productKey: null,
            groupKey: WORK_1,
          },
          workTypeBlocker(WORK_1),
          workTypeBlocker(WORK_2),
        ],
  // Manifestation decisions are the Products' own; nothing here is a plan finding.
  findings: [],
  works:
    state === 'DECIDED'
      ? [
          work('Forms of One Work', DOI, [
            { type: 'HARDBACK', isbn: ISBNS[0] },
            { type: 'PAPERBACK', isbn: ISBNS[1] },
            { type: 'EPUB', isbn: ISBNS[2] },
            { type: 'PDF', isbn: ISBNS[3] },
          ]),
          work('Formats Grouped by Alternative', '', [
            { type: 'MP3', isbn: ISBNS[5] },
            { type: 'AZW3', isbn: ISBNS[6] },
          ]),
        ]
      : [],
  chapters: [],
  target: target(state),
});

export default defineOnixRegressionFixture({
  id: 'target-product-form-variants',
  status: 'CONTRACT',
  purpose:
    'Proves the ProductComposition / ProductForm / ProductFormDetail matrix - lossless, normalised, input-required and ' +
    'unrepresentable manifestations with their notes - Work grouping by Work DOI and by alternative-format edges, the ' +
    'one-Publication-per-type collision and its omission, and that Thoth-native identifiers under a non-Thoth Header ' +
    'are ignored and listed rather than decoded.',
  source: {
    origin: 'SYNTHETIC',
    provenance:
      'Written for thoth-app#249. Every name, identifier and UUID is invented; the ISBNs carry valid check characters ' +
      'and the Work DOI uses the 10.5555 test prefix. The canonical source gate admits it with two best-practice notes ' +
      'on the generic forms BA and SA, which do not count.',
    sha256: 'cf02ab43e5d1904ad7198ac2c4fab0ed303650365c13324d811caacb55e67645',
  },
  defects: [],
  asOf: '2026-10-02T12:00:00.000Z',
  imprints: [{ label: 'Regression Press', value: '11111111-1111-4111-8111-111111111111' }],
  gate: {
    verdict: 'PERMITTED',
    release: '3.1',
    flavour: 'reference',
    findings: [genericForm(2), genericForm(8)],
    recoveries: [],
    provenance: { kind: 'IDENTITY', flavour: 'reference' },
  },
  normalized: {
    '/onix:ONIXMessage/onix:Header/onix:Sender/onix:SenderName': ['Thoth'],
    '/onix:ONIXMessage/onix:Product/onix:DescriptiveDetail/onix:ProductForm': [
      'BB',
      'BA',
      'EB',
      'ED',
      'EC',
      'AJ',
      'EB',
      'SA',
      'AC',
    ],
    '/onix:ONIXMessage/onix:Product/onix:DescriptiveDetail/onix:ProductFormDetail': [
      'E101',
      'E200',
      'E108',
      'E107',
      'A103',
      'E116',
    ],
    '/onix:ONIXMessage/onix:Product/onix:ProductIdentifier[onix:ProductIDType = "01"]/onix:IDTypeName': [
      'thoth-publication-id',
      'thoth-work-id',
    ],
  },
  scenarios: [
    {
      name: 'as uploaded, before any publisher decision',
      target: 'EMPTY_PUBLISHER',
      planning: planning('AS_UPLOADED'),
      outcomes: {
        SUPPORTED_LOSSLESS: 1,
        SUPPORTED_NORMALIZED: 4,
        TARGET_INPUT_REQUIRED: 4,
        TARGET_UNREPRESENTABLE: 2,
      },
    },
    {
      name: 'publisher takes MONOGRAPH, a paperback binding and AZW3, and omits the package and the online PDF',
      target: 'EMPTY_PUBLISHER',
      inputs: {
        fileWorkType: Monograph,
        manifestationChoices: { [UNSPECIFIED]: Paperback, [KINDLE]: Azw3, [PACKAGE]: 'OMIT', [PDF_ONLINE]: 'OMIT' },
      },
      planning: planning('DECIDED'),
      outcomes: { SUPPORTED_LOSSLESS: 1, SUPPORTED_NORMALIZED: 4 },
    },
  ],
});
