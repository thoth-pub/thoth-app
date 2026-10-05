import { PublicationType } from '@/src/shared/constants/publications';
import { WorkTypes } from '@/src/shared/constants/work';

import { defineOnixRegressionFixture } from '../../fixtureSources';
import type {
  OnixPlanFindingEntry,
  OnixPlanningExpectation,
  OnixRecordEntry,
  OnixTargetDescriptiveEntry,
  OnixTargetLedger,
} from '../../types';

const { Pdf } = PublicationType.enum;
const { Monograph } = WorkTypes.enum;

/**
 * Two Works of one ISSN-identified publisher collection that both claim issue 7 (thoth-app#249). The first also states
 * an unspecified collection, an ascribed collection, a collection with no publication order, a proprietary collection
 * identifier, a title-order sequence and a collection-level part number.
 *
 * Contract authority: the recovered Series / Collection / Issue decision `5541009506` section F (CTO `agreed`) rules
 * 1-25; title/locale `5551158156` rules 23, 29-30 (approved `5551465280`); #183 issue-number boundary `5683079198`
 * (re-incorporated by `5686547993`). The two Works' issue-7 collision is detected before mutation and no answer clears
 * it (rule 20): the plan stays blocked until the source changes, whatever else the publisher decides.
 */

const FIRST = 'product:gtin13:9781800005013';
const SECOND = 'product:gtin13:9781800005020';
const WORK_A = `work:${FIRST}`;
const WORK_B = `work:${SECOND}`;
const IMPRINT = '11111111-1111-4111-8111-111111111111';
const C = (product: number, n: number) => `/ONIXMessage[1]/Product[${product}]/DescriptiveDetail[1]/Collection[${n}]`;

const seriesKey = (code: string, owner: string, discriminator: string) => `SERIES|${code}|${owner}|${discriminator}`;
const ISSN_IDENTITY = 'issn:2049-3630';
const OCCASIONAL_IDENTITY = 'name:occasional papers in metadata';
const COLLECTION_TYPE_KEY = seriesKey('SERIES_COLLECTION_TYPE_REQUIRED', FIRST, C(1, 2));
const ORDINAL_KEY = seriesKey('SERIES_ORDINAL_REQUIRED', FIRST, C(1, 4));
const STUDIES_TYPE_KEY = seriesKey('SERIES_TYPE_REQUIRED', WORK_A, `proposed:${IMPRINT}|${ISSN_IDENTITY}`);
const ISSN_KEY = seriesKey('SERIES_ISSN_ASSIGNMENT_REQUIRED', WORK_A, `proposed:${IMPRINT}|${ISSN_IDENTITY}`);
const OCCASIONAL_TYPE_KEY = seriesKey('SERIES_TYPE_REQUIRED', WORK_A, `proposed:${IMPRINT}|${OCCASIONAL_IDENTITY}`);
const COLLISION_KEY = seriesKey('SERIES_ORDINAL_COLLISION', WORK_B, `proposed:${IMPRINT}|${ISSN_IDENTITY}|7`);

const RECORDS: OnixRecordEntry[] = [FIRST, SECOND].map((productKey, index) => ({
  index: index + 1,
  recordReference: `regression-press.${productKey.slice('product:gtin13:'.length)}`,
  disposition: 'COMPLETE',
  productKey,
  action: 'PLANNED',
}));

type Answer = 'NONE' | 'UNANSWERED' | 'ANSWERED';

const finding = (
  code: string,
  classification: OnixPlanFindingEntry['classification'],
  productKey: string | null,
  groupKey: string,
  answer: Answer,
  resolution: OnixPlanFindingEntry['resolution'] = 'NONE',
  blocking = answer !== 'NONE',
): OnixPlanFindingEntry => ({
  family: 'DESCRIPTIVE',
  code,
  classification,
  blocking,
  resolution,
  answer: answer === 'NONE' ? 'NOT_APPLICABLE' : answer,
  productKey,
  groupKey,
});

const findings = (decided: boolean): OnixPlanFindingEntry[] => {
  const asked: Answer = decided ? 'ANSWERED' : 'UNANSWERED';

  return [
    // CollectionType 00 is a Series only if the publisher says so (rule 3).
    finding('SERIES_COLLECTION_TYPE_REQUIRED', 'TARGET_INPUT_REQUIRED', FIRST, WORK_A, asked, 'CHOICE'),
    // An ascribed collection (11) is never converted into a Series (rule 4).
    finding('SERIES_COLLECTION_UNREPRESENTABLE', 'TARGET_UNREPRESENTABLE', FIRST, WORK_A, 'NONE'),
    // No publication order: no append-after-max; the membership is omitted only by acknowledgement (rule 16).
    finding('SERIES_ORDINAL_REQUIRED', 'TARGET_INPUT_REQUIRED', FIRST, WORK_A, asked, 'ACKNOWLEDGE'),
    // A proprietary collection identifier and a title-order sequence are explicit losses (rules 10, 15).
    finding('SERIES_IDENTIFIER_UNREPRESENTABLE', 'TARGET_UNREPRESENTABLE', FIRST, WORK_A, 'NONE'),
    finding('SERIES_SEQUENCE_UNREPRESENTABLE', 'TARGET_UNREPRESENTABLE', FIRST, WORK_A, 'NONE'),
    // A new Series needs its type (rule 5) and its ISSN's form (rule 9) from the publisher, once for the import.
    finding('SERIES_TYPE_REQUIRED', 'TARGET_INPUT_REQUIRED', null, WORK_A, asked, 'CHOICE'),
    finding('SERIES_ISSN_ASSIGNMENT_REQUIRED', 'TARGET_INPUT_REQUIRED', null, WORK_A, asked, 'CHOICE'),
    // Once classified a Series, the unspecified collection is a new Series of its own, asked about likewise.
    ...(decided ? [finding('SERIES_TYPE_REQUIRED', 'TARGET_INPUT_REQUIRED', null, WORK_A, 'ANSWERED', 'CHOICE')] : []),
    // The second Work claims the issue the first already takes: detected before mutation, never answered (rule 20).
    finding('SERIES_ORDINAL_COLLISION', 'SOURCE_CONFLICT', null, WORK_B, 'NONE', 'NONE', true),
  ];
};

const membership = (
  key: string,
  name: string,
  path: string,
  values: Partial<OnixTargetDescriptiveEntry['series'][number]> = {},
): OnixTargetDescriptiveEntry['series'][number] => ({
  key,
  name,
  issns: [],
  thothSeriesId: null,
  ordinal: null,
  issueNumber: null,
  classificationFindingKey: null,
  ordinalFindingKey: null,
  paths: [path],
  ...values,
});

const descriptive = (groupKey: string, publicationDate: string, series: OnixTargetDescriptiveEntry['series']) => ({
  groupKey,
  subjects: [],
  primaryChoices: [],
  series,
  noCollection: false,
  lifecycle: { status: { kind: 'VALUE' as const, status: 'ACTIVE' }, publicationDate, withdrawnDate: null },
  cover: { kind: 'ABSENT' as const },
  profileCover: { kind: 'ABSENT' as const },
});

const silentRights = (productKey: string) => ({
  productKey,
  carrier: 'DIGITAL' as const,
  expressions: [],
  licence: { kind: 'SILENT' as const },
  dated: false,
  technicalProtection: [],
  technicalProtectionState: 'UNKNOWN' as const,
  usageConstraints: [],
  deferredRights: [],
});

const noFeatures = (productKey: string) => ({
  productKey,
  features: [],
  primaryStandards: [],
  additionalStandards: [],
  exceptions: [],
  reportUrls: [],
  publications: [
    { publicationType: Pdf, scope: 'DIGITAL' as const, additionalStandards: [], incompatibleAdditionalStandards: [] },
  ],
});

const created = (productKey: string) => ({
  productKey,
  publicationType: Pdf,
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

const target = (decided: boolean): OnixTargetLedger => ({
  findings: [
    { family: 'DESCRIPTIVE', code: 'SERIES_COLLECTION_TYPE_REQUIRED', key: COLLECTION_TYPE_KEY, paths: [C(1, 2)] },
    {
      family: 'DESCRIPTIVE',
      code: 'SERIES_COLLECTION_UNREPRESENTABLE',
      key: seriesKey('SERIES_COLLECTION_UNREPRESENTABLE', FIRST, C(1, 3)),
      paths: [C(1, 3)],
    },
    { family: 'DESCRIPTIVE', code: 'SERIES_ORDINAL_REQUIRED', key: ORDINAL_KEY, paths: [C(1, 4)] },
    {
      family: 'DESCRIPTIVE',
      code: 'SERIES_IDENTIFIER_UNREPRESENTABLE',
      key: seriesKey('SERIES_IDENTIFIER_UNREPRESENTABLE', FIRST, 'identifiers'),
      paths: [`${C(1, 1)}/CollectionIdentifier[2]`],
    },
    {
      family: 'DESCRIPTIVE',
      code: 'SERIES_SEQUENCE_UNREPRESENTABLE',
      key: seriesKey('SERIES_SEQUENCE_UNREPRESENTABLE', FIRST, 'sequences'),
      paths: [`${C(1, 1)}/CollectionSequence[2]`],
    },
    { family: 'DESCRIPTIVE', code: 'SERIES_TYPE_REQUIRED', key: STUDIES_TYPE_KEY, paths: [C(1, 1)] },
    { family: 'DESCRIPTIVE', code: 'SERIES_ISSN_ASSIGNMENT_REQUIRED', key: ISSN_KEY, paths: [C(1, 1)] },
    ...(decided
      ? [{ family: 'DESCRIPTIVE' as const, code: 'SERIES_TYPE_REQUIRED', key: OCCASIONAL_TYPE_KEY, paths: [C(1, 2)] }]
      : []),
    { family: 'DESCRIPTIVE', code: 'SERIES_ORDINAL_COLLISION', key: COLLISION_KEY, paths: [C(2, 1)] },
  ],
  identity: {
    compatibility: { headerMatches: false, ignoredNativeRecordKeys: [], activation: 'NOT_APPLICABLE' },
    groups: [WORK_A, WORK_B].map((groupKey) => ({
      groupKey,
      compatibility: 'GENERIC' as const,
      thothVerification: 'NOT_APPLICABLE' as const,
      edges: [],
      evidence: [{ kind: 'NO_TARGET_MATCH' as const }],
    })),
    products: [FIRST, SECOND].map((productKey, index) => ({
      productKey,
      recordKeys: [`record:${index + 1}`],
      evidence: [{ kind: 'NO_TARGET_MATCH' as const }],
      omittable: false,
    })),
  },
  descriptive: [
    descriptive(WORK_A, '2026-03-01', [
      // ISSN identity first (rule 7); publication order 03 is the ordinal (14); the integer part number the issue
      // number (13); both ISSNs' form is the publisher's (9).
      membership(ISSN_IDENTITY, 'Regression Studies', C(1, 1), { issns: ['2049-3630'], ordinal: 7, issueNumber: 7 }),
      membership(OCCASIONAL_IDENTITY, 'Occasional Papers in Metadata', C(1, 2), {
        ordinal: 2,
        classificationFindingKey: COLLECTION_TYPE_KEY,
      }),
      membership('name:unnumbered notes', 'Unnumbered Notes', C(1, 4), { ordinalFindingKey: ORDINAL_KEY }),
    ]),
    descriptive(WORK_B, '2026-04-01', [
      membership(ISSN_IDENTITY, 'Regression Studies', C(2, 1), { issns: ['2049-3630'], ordinal: 7 }),
    ]),
  ],
  commercial: [FIRST, SECOND].map((productKey) => ({
    productKey,
    supplies: [],
    prices: [],
    carriers: { DIGITAL: { kind: 'NONE' as const } },
    plannedLocations: [],
  })),
  priceResolutions: [],
  rights: {
    products: [silentRights(FIRST), silentRights(SECOND)],
    groups: [
      { groupKey: WORK_A, licence: { kind: 'UNSET' } },
      { groupKey: WORK_B, licence: { kind: 'UNSET' } },
    ],
    licenceActions: [
      { groupKey: WORK_A, action: { kind: 'UNSET' } },
      { groupKey: WORK_B, action: { kind: 'UNSET' } },
    ],
    acknowledgedFindingKeys: [],
  },
  accessibility: {
    products: [noFeatures(FIRST), noFeatures(SECOND)],
    contacts: [],
    actions: [created(FIRST), created(SECOND)],
  },
  components: [],
  relatedMaterial: {
    outcomes: [],
    edges: [],
    productReferences: [FIRST, SECOND].map((productKey) => ({ productKey, asserted: false, references: [] })),
    referenceActions: [
      { groupKey: WORK_A, action: { kind: 'NONE' } },
      { groupKey: WORK_B, action: { kind: 'NONE' } },
    ],
  },
  collateral: {
    textContents: [],
    resources: [],
    candidates: [],
    actions: [WORK_A, WORK_B].map((groupKey) => ({
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
    candidates: [WORK_A, WORK_B].map((groupKey) => ({
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
    actions: [WORK_A, WORK_B].map((groupKey) => ({
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
  // The collision holds the whole plan: nothing is executable, so nothing is written (rule 20).
  plan: { works: [], containedWorks: [], series: [], relations: [] },
});

const product = (productKey: string, groupKey: string, isbn: string, executable: boolean) => ({
  productKey,
  groupKey,
  isbn,
  manifestation: {
    kind: 'RESOLVED' as const,
    type: Pdf,
    classification: 'SUPPORTED_NORMALIZED' as const,
    notes: [{ code: 'DELIVERY_MODE_NOT_REPRESENTED' as const, detail: 'EB' }],
  },
  publicationType: Pdf,
  action: 'CREATE_PUBLICATION' as const,
  executable,
});

/**
 * A group is executable when nothing holds it: once answered, the first Work is, though the collision raised against
 * the second still holds the plan, which is all that is ever confirmed or executed.
 */
const workGroup = (groupKey: string, productKey: string, decided: boolean, executable: boolean) => ({
  groupKey,
  productKeys: [productKey],
  target: 'NEW_WORK' as const,
  workType: decided
    ? { status: 'RESOLVED' as const, type: Monograph, provenance: 'USER_FILE_DEFAULT' as const }
    : { status: 'UNRESOLVED' as const },
  edition: { status: 'RESOLVED' as const, edition: 1, basis: 'DEFAULT_FIRST_EDITION' as const },
  workDoi: { kind: 'NONE' as const },
  executable,
});

const descriptiveBlocker = (
  code: string,
  classification: 'TARGET_INPUT_REQUIRED' | 'SOURCE_CONFLICT',
  record: number,
  productKey: string | null,
  groupKey: string,
) => ({ code, classification, recordKey: `record:${record}`, productKey, groupKey });

const workTypeBlocker = (groupKey: string) => ({
  code: 'WORK_TYPE_INPUT_REQUIRED',
  classification: 'TARGET_INPUT_REQUIRED' as const,
  recordKey: null,
  productKey: null,
  groupKey,
});

const COLLISION_BLOCKER = descriptiveBlocker('DESCRIPTIVE_SOURCE_CONFLICT', 'SOURCE_CONFLICT', 2, null, WORK_B);

const planning = (decided: boolean): OnixPlanningExpectation => ({
  executable: false,
  records: RECORDS,
  products: [product(FIRST, WORK_A, '9781800005013', decided), product(SECOND, WORK_B, '9781800005020', false)],
  workGroups: [workGroup(WORK_A, FIRST, decided, decided), workGroup(WORK_B, SECOND, decided, false)],
  blockers: decided
    ? [COLLISION_BLOCKER]
    : [
        workTypeBlocker(WORK_A),
        descriptiveBlocker('DESCRIPTIVE_CHOICE_REQUIRED', 'TARGET_INPUT_REQUIRED', 1, FIRST, WORK_A),
        descriptiveBlocker('DESCRIPTIVE_ACKNOWLEDGEMENT_REQUIRED', 'TARGET_INPUT_REQUIRED', 1, FIRST, WORK_A),
        workTypeBlocker(WORK_B),
        descriptiveBlocker('DESCRIPTIVE_CHOICE_REQUIRED', 'TARGET_INPUT_REQUIRED', 1, null, WORK_A),
        descriptiveBlocker('DESCRIPTIVE_CHOICE_REQUIRED', 'TARGET_INPUT_REQUIRED', 1, null, WORK_A),
        COLLISION_BLOCKER,
      ],
  findings: findings(decided),
  works: [],
  chapters: [],
  target: target(decided),
});

export default defineOnixRegressionFixture({
  id: 'target-series-issue',
  status: 'CONTRACT',
  purpose:
    'Proves Series, Issue identity and ordering: ISSN identity, publication-order ordinal and integer part number as ' +
    'issue number; publisher classification of an unspecified collection, Series type and ISSN form; explicit losses ' +
    'for ascribed collections, proprietary identifiers and other sequences; no append-after-max ordinal; and an ' +
    'in-file ordinal collision that holds the plan whatever else is answered.',
  source: {
    origin: 'SYNTHETIC',
    provenance:
      'Written for thoth-app#249. Every name and identifier is invented; the ISBNs and the ISSN carry valid check ' +
      'characters. The canonical source gate admits it with one strict advisory (a collection-level PartNumber), ' +
      'which does not count.',
    sha256: '68bc5abf8e8dd87015143db7acda6ed51bd9a2699fd2e818952c80bb80e91a52',
  },
  defects: [],
  asOf: '2026-10-02T12:00:00.000Z',
  imprints: [{ label: 'Regression Press', value: IMPRINT }],
  gate: {
    verdict: 'PERMITTED',
    release: '3.1',
    flavour: 'reference',
    findings: [
      {
        id: '_20181210_c_1',
        tier: 'STRICT',
        scope: 'VALIDITY',
        class: 'ADVISORY',
        blocking: false,
        projection: 'AUTHORITATIVE',
        recoverability: 'NOT_RECOVERABLE',
        counts: false,
        path: `${C(1, 1)}/TitleDetail[1]/TitleElement[1]`,
      },
    ],
    recoveries: [],
    provenance: { kind: 'IDENTITY', flavour: 'reference' },
  },
  normalized: {
    '/onix:ONIXMessage/onix:Product/onix:DescriptiveDetail/onix:Collection/onix:CollectionType': [
      '10',
      '00',
      '11',
      '10',
      '10',
    ],
    '/onix:ONIXMessage/onix:Product/onix:DescriptiveDetail/onix:Collection/onix:CollectionSequence[onix:CollectionSequenceType = "03"]/onix:CollectionSequenceNumber':
      ['7', '2', '7'],
    '/onix:ONIXMessage/onix:Product/onix:DescriptiveDetail/onix:Collection/onix:CollectionIdentifier[onix:CollectionIDType = "02"]/onix:IDValue':
      ['20493630', '20493630'],
  },
  scenarios: [
    {
      name: 'as uploaded, before any publisher decision',
      target: 'EMPTY_PUBLISHER',
      planning: planning(false),
      outcomes: {
        SUPPORTED_NORMALIZED: 2,
        TARGET_UNREPRESENTABLE: 3,
        TARGET_INPUT_REQUIRED: 10,
        SOURCE_CONFLICT: 2,
      },
    },
    {
      name: 'publisher answers every Series question; the ordinal collision still holds the plan',
      target: 'EMPTY_PUBLISHER',
      inputs: {
        fileWorkType: Monograph,
        descriptiveChoices: {
          [COLLECTION_TYPE_KEY]: 'SERIES',
          [ORDINAL_KEY]: 'ACKNOWLEDGED',
          [STUDIES_TYPE_KEY]: 'BOOK_SERIES',
          [ISSN_KEY]: 'DIGITAL',
          [OCCASIONAL_TYPE_KEY]: 'JOURNAL',
        },
      },
      planning: planning(true),
      outcomes: {
        SUPPORTED_NORMALIZED: 2,
        TARGET_UNREPRESENTABLE: 3,
        TARGET_INPUT_REQUIRED: 5,
        SOURCE_CONFLICT: 2,
      },
    },
  ],
});
