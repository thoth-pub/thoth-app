import { PublicationType } from '@/src/shared/constants/publications';
import { WorkTypes } from '@/src/shared/constants/work';

import { defineOnixRegressionFixture } from '../../fixtureSources';
import type {
  OnixPlanFindingEntry,
  OnixPlanningExpectation,
  OnixTargetComponentEntry,
  OnixTargetLedger,
} from '../../types';

const { Pdf } = PublicationType.enum;
const { Monograph } = WorkTypes.enum;

/**
 * One Work whose ContentDetail holds every component form the importer distinguishes (thoth-app#249): front matter,
 * body matter with two PageRuns, a body section at the multi-level position 2.1, a complete embedded Work, an AVItem
 * and back matter with no LevelSequenceNumber - before and after the publisher answers every question they raise.
 *
 * Contract authority: ContentDetail `5541336717` rules 1-14 (#179); #223 Specification Amendment 1 `5780784445`
 * sections 1-6; correction 1 `54ea3db3` (source order kept, never sorted); #187 `5938391709` / `5938547347` (exact
 * chapter and contained-Work ordinals).
 */

const PRODUCT = 'product:gtin13:9781800006010';
const WORK = `work:${PRODUCT}`;
const IMPRINT = '11111111-1111-4111-8111-111111111111';
const CI = (n: number) => `/ONIXMessage[1]/Product[1]/ContentDetail[1]/ContentItem[${n}]`;

/** Each ContentItem's binding: the fingerprint of everything it states, which every answer about it is bound to. */
const BINDING = ['mqvjfx7dx7', '14lt05rfxqi', '28p2z3bfxjm', '18x9pga82yf', '1fxpj0ockj1', 'iswde7j21x'];
const key = (code: string, n: number, suffix = '') =>
  `COMPONENT|${code}|${PRODUCT}|${CI(n)}|${BINDING[n - 1]}${suffix}`;

const RUNS_KEY = key('COMPONENT_PAGE_RUNS_CHOICE_REQUIRED', 2);
const HIERARCHY_KEY = key('COMPONENT_HIERARCHY_UNREPRESENTABLE', 3);
const NESTED_ORDINAL_KEY = key('COMPONENT_ORDINAL_REQUIRED', 3);
const PAGE_RANGE_KEY = key('COMPONENT_PAGE_RANGE_UNREPRESENTABLE', 4);
const TYPE_KEY = key('CONTAINED_WORK_TYPE_REQUIRED', 4);
const STATUS_KEY = key('CONTAINED_WORK_STATUS_REQUIRED', 4);
const DATE_KEY = key('CONTAINED_WORK_DATE_REQUIRED', 4, '|PUBLICATION');
const AV_KEY = key('COMPONENT_AV_ITEM_UNREPRESENTABLE', 5);
const INDEX_ORDINAL_KEY = key('COMPONENT_ORDINAL_REQUIRED', 6);

const CHOICES = {
  // The first of the two PageRuns, by its canonical path; neither is ever merged or chosen by order (rule 12).
  [RUNS_KEY]: `${CI(2)}/TextItem[1]/PageRun[1]`,
  // Placing 2.1 flat is the publisher's acknowledged loss, at the ordinal they give (rule 7; A1 section 6).
  [HIERARCHY_KEY]: 'ACKNOWLEDGED',
  [NESTED_ORDINAL_KEY]: '3',
  // The embedded Work is a contained Work of the publisher's WorkType and status, never the parent's (A1 1, 4).
  [PAGE_RANGE_KEY]: 'ACKNOWLEDGED',
  [TYPE_KEY]: Monograph,
  [STATUS_KEY]: 'ACTIVE',
  [DATE_KEY]: '2026-03-01',
  [AV_KEY]: 'ACKNOWLEDGED',
  [INDEX_ORDINAL_KEY]: '4',
};

type FindingAnswer = 'NONE' | 'UNANSWERED' | 'ANSWERED';

const finding = (
  code: string,
  classification: OnixPlanFindingEntry['classification'],
  answer: FindingAnswer,
  resolution: OnixPlanFindingEntry['resolution'] = 'NONE',
): OnixPlanFindingEntry => ({
  family: 'COMPONENT',
  code,
  classification,
  blocking: answer !== 'NONE',
  resolution,
  answer: answer === 'NONE' ? 'NOT_APPLICABLE' : answer,
  productKey: PRODUCT,
  groupKey: WORK,
});

const findings = (decided: boolean): OnixPlanFindingEntry[] => {
  const asked: FindingAnswer = decided ? 'ANSWERED' : 'UNANSWERED';

  return [
    // Front, body and back matter become BookChapters that cannot say which matter they were (rule 2).
    finding('COMPONENT_MATTER_NOT_REPRESENTED', 'SUPPORTED_NORMALIZED', 'NONE'),
    finding('COMPONENT_MATTER_NOT_REPRESENTED', 'SUPPORTED_NORMALIZED', 'NONE'),
    finding('COMPONENT_PAGE_RUNS_CHOICE_REQUIRED', 'TARGET_INPUT_REQUIRED', asked, 'CHOICE'),
    finding('COMPONENT_MATTER_NOT_REPRESENTED', 'SUPPORTED_NORMALIZED', 'NONE'),
    finding('COMPONENT_HIERARCHY_UNREPRESENTABLE', 'TARGET_UNREPRESENTABLE', asked, 'ACKNOWLEDGE'),
    finding('COMPONENT_ORDINAL_REQUIRED', 'TARGET_INPUT_REQUIRED', asked, 'INPUT'),
    // Thoth holds a page range only for a BookChapter (A1).
    finding('COMPONENT_PAGE_RANGE_UNREPRESENTABLE', 'TARGET_UNREPRESENTABLE', asked, 'ACKNOWLEDGE'),
    finding('CONTAINED_WORK_TYPE_REQUIRED', 'TARGET_INPUT_REQUIRED', asked, 'CHOICE'),
    finding('CONTAINED_WORK_STATUS_REQUIRED', 'TARGET_INPUT_REQUIRED', asked, 'CHOICE'),
    // Its imprint is the parent's and its edition the first, as explicit normalisations (A1 2-3).
    finding('CONTAINED_WORK_IMPRINT_INHERITED', 'SUPPORTED_NORMALIZED', 'NONE'),
    finding('CONTAINED_WORK_EDITION_NORMALISED', 'SUPPORTED_NORMALIZED', 'NONE'),
    // An AVItem is never a written chapter; it is omitted only by acknowledgement (rule 4).
    finding('COMPONENT_AV_ITEM_UNREPRESENTABLE', 'TARGET_UNREPRESENTABLE', asked, 'ACKNOWLEDGE'),
    finding('COMPONENT_MATTER_NOT_REPRESENTED', 'SUPPORTED_NORMALIZED', 'NONE'),
    // No LevelSequenceNumber: the ordinal is the publisher's, never source order or ComponentNumber (rule 6).
    finding('COMPONENT_ORDINAL_REQUIRED', 'TARGET_INPUT_REQUIRED', asked, 'INPUT'),
    // ACTIVE needs a complete publication date, which the source does not give for the contained Work (A1 4).
    ...(decided ? [finding('CONTAINED_WORK_DATE_REQUIRED', 'TARGET_INPUT_REQUIRED', 'ANSWERED', 'INPUT')] : []),
  ];
};

const targetFindings = (decided: boolean): OnixTargetLedger['findings'] => [
  {
    family: 'COMPONENT',
    code: 'COMPONENT_MATTER_NOT_REPRESENTED',
    key: key('COMPONENT_MATTER_NOT_REPRESENTED', 1),
    paths: [`${CI(1)}/TextItem[1]/TextItemType[1]`],
  },
  {
    family: 'COMPONENT',
    code: 'COMPONENT_MATTER_NOT_REPRESENTED',
    key: key('COMPONENT_MATTER_NOT_REPRESENTED', 2),
    paths: [`${CI(2)}/TextItem[1]/TextItemType[1]`],
  },
  {
    family: 'COMPONENT',
    code: 'COMPONENT_PAGE_RUNS_CHOICE_REQUIRED',
    key: RUNS_KEY,
    paths: [`${CI(2)}/TextItem[1]/PageRun[1]`, `${CI(2)}/TextItem[1]/PageRun[2]`],
  },
  {
    family: 'COMPONENT',
    code: 'COMPONENT_MATTER_NOT_REPRESENTED',
    key: key('COMPONENT_MATTER_NOT_REPRESENTED', 3),
    paths: [`${CI(3)}/TextItem[1]/TextItemType[1]`],
  },
  {
    family: 'COMPONENT',
    code: 'COMPONENT_HIERARCHY_UNREPRESENTABLE',
    key: HIERARCHY_KEY,
    paths: [`${CI(3)}/LevelSequenceNumber[1]`],
  },
  {
    family: 'COMPONENT',
    code: 'COMPONENT_ORDINAL_REQUIRED',
    key: NESTED_ORDINAL_KEY,
    paths: [`${CI(3)}/LevelSequenceNumber[1]`],
  },
  {
    family: 'COMPONENT',
    code: 'COMPONENT_PAGE_RANGE_UNREPRESENTABLE',
    key: PAGE_RANGE_KEY,
    paths: [`${CI(4)}/TextItem[1]/PageRun[1]`],
  },
  { family: 'COMPONENT', code: 'CONTAINED_WORK_TYPE_REQUIRED', key: TYPE_KEY, paths: [CI(4)] },
  { family: 'COMPONENT', code: 'CONTAINED_WORK_STATUS_REQUIRED', key: STATUS_KEY, paths: [CI(4)] },
  {
    family: 'COMPONENT',
    code: 'CONTAINED_WORK_IMPRINT_INHERITED',
    key: key('CONTAINED_WORK_IMPRINT_INHERITED', 4),
    paths: [CI(4)],
  },
  {
    family: 'COMPONENT',
    code: 'CONTAINED_WORK_EDITION_NORMALISED',
    key: key('CONTAINED_WORK_EDITION_NORMALISED', 4),
    paths: [CI(4)],
  },
  { family: 'COMPONENT', code: 'COMPONENT_AV_ITEM_UNREPRESENTABLE', key: AV_KEY, paths: [CI(5)] },
  {
    family: 'COMPONENT',
    code: 'COMPONENT_MATTER_NOT_REPRESENTED',
    key: key('COMPONENT_MATTER_NOT_REPRESENTED', 6),
    paths: [`${CI(6)}/TextItem[1]/TextItemType[1]`],
  },
  { family: 'COMPONENT', code: 'COMPONENT_ORDINAL_REQUIRED', key: INDEX_ORDINAL_KEY, paths: [CI(6)] },
  ...(decided
    ? [{ family: 'COMPONENT' as const, code: 'CONTAINED_WORK_DATE_REQUIRED', key: DATE_KEY, paths: [CI(4)] }]
    : []),
];

const INHERITED = ['imprint', 'status', 'publicationDate', 'withdrawnDate', 'copyrightHolder'] as const;

const base = (n: number) => ({ path: CI(n), productKey: PRODUCT, groupKey: WORK, position: n });

const components = (decided: boolean): OnixTargetComponentEntry[] => [
  {
    ...base(1),
    kind: 'BOOK_CHAPTER',
    matter: 'FRONT',
    ordinal: { status: 'RESOLVED', ordinal: 1, basis: 'LEVEL_SEQUENCE_NUMBER' },
    hierarchy: null,
    doi: null,
    pages: { status: 'RESOLVED', firstPage: '1', lastPage: '8', basis: 'PAGE_RUN' },
    // No NumberOfPages: none is ever calculated from a PageRun (rule 13).
    pageCount: null,
    inherited: [...INHERITED],
    action: 'CREATE_CHAPTER',
  },
  {
    ...base(2),
    kind: 'BOOK_CHAPTER',
    matter: 'BODY',
    ordinal: { status: 'RESOLVED', ordinal: 2, basis: 'LEVEL_SEQUENCE_NUMBER' },
    hierarchy: null,
    doi: null,
    pages: decided
      ? { status: 'RESOLVED', firstPage: '9', lastPage: '30', basis: 'PUBLISHER_CHOICE' }
      : { status: 'UNRESOLVED' },
    pageCount: 26,
    inherited: [...INHERITED],
    action: decided ? 'CREATE_CHAPTER' : 'BLOCKED',
  },
  {
    ...base(3),
    kind: 'BOOK_CHAPTER',
    matter: 'BODY',
    ordinal: decided ? { status: 'RESOLVED', ordinal: 3, basis: 'PUBLISHER_INPUT' } : { status: 'UNRESOLVED' },
    // The multi-level position is kept as evidence, never flattened by itself (rule 7).
    hierarchy: { raw: '2.1', levels: ['2', '1'], acknowledged: decided },
    doi: null,
    pages: { status: 'RESOLVED', firstPage: '31', lastPage: '40', basis: 'PAGE_RUN' },
    pageCount: null,
    inherited: [...INHERITED],
    action: decided ? 'CREATE_CHAPTER' : 'BLOCKED',
  },
  {
    ...base(4),
    kind: 'CONTAINED_WORK',
    workType: decided ? { status: 'RESOLVED', type: Monograph } : { status: 'UNRESOLVED' },
    imprint: { status: 'RESOLVED', imprintId: IMPRINT },
    edition: 1,
    lifecycle: {
      status: decided ? 'ACTIVE' : null,
      publicationDate: decided ? '2026-03-01' : null,
      withdrawnDate: null,
      replacement: 'NOT_REQUIRED',
    },
    // A flat LevelSequenceNumber is its IsPartOf ordinal, a relation set of its own (A1 section 5).
    ordinal: { status: 'RESOLVED', ordinal: 3, basis: 'LEVEL_SEQUENCE_NUMBER' },
    hierarchy: null,
    doi: null,
    pageCount: null,
    action: decided ? 'CREATE_CONTAINED_WORK' : 'BLOCKED',
  },
  {
    ...base(5),
    kind: 'AV_ITEM',
    avItemType: '01',
    action: decided ? 'OMIT_WITH_ACKNOWLEDGED_LOSS' : 'BLOCKED',
  },
  {
    ...base(6),
    kind: 'BOOK_CHAPTER',
    matter: 'BACK',
    ordinal: decided ? { status: 'RESOLVED', ordinal: 4, basis: 'PUBLISHER_INPUT' } : { status: 'UNRESOLVED' },
    hierarchy: null,
    doi: null,
    pages: { status: 'RESOLVED', firstPage: '91', lastPage: '96', basis: 'PAGE_RUN' },
    pageCount: null,
    inherited: [...INHERITED],
    action: decided ? 'CREATE_CHAPTER' : 'BLOCKED',
  },
];

const collateralAction = (target: 'WORK' | 'CHAPTER' | 'CONTAINED_WORK', n: number | null) => ({
  groupKey: WORK,
  productKey: n === null ? null : PRODUCT,
  componentPath: n === null ? null : CI(n),
  target,
  action: 'PLANNED' as const,
  abstracts: [],
  tableOfContents: null,
  generalNote: null,
  resources: [],
});

const reviewsAction = (target: 'WORK' | 'CHAPTER' | 'CONTAINED_WORK', n: number | null) => ({
  groupKey: WORK,
  productKey: n === null ? null : PRODUCT,
  componentPath: n === null ? null : CI(n),
  target,
  // A chapter holds no reviews, endorsements or awards (REL-01D rule 152).
  action: target === 'CHAPTER' ? ('TARGET_UNREPRESENTABLE' as const) : ('PLANNED' as const),
  bookReviews: [],
  endorsements: [],
  awards: [],
});

const target = (decided: boolean): OnixTargetLedger => ({
  findings: targetFindings(decided),
  identity: {
    compatibility: { headerMatches: false, ignoredNativeRecordKeys: [], activation: 'NOT_APPLICABLE' },
    groups: [
      {
        groupKey: WORK,
        compatibility: 'GENERIC',
        thothVerification: 'NOT_APPLICABLE',
        edges: [],
        evidence: [{ kind: 'NO_TARGET_MATCH' }],
      },
    ],
    products: [
      { productKey: PRODUCT, recordKeys: ['record:1'], evidence: [{ kind: 'NO_TARGET_MATCH' }], omittable: false },
    ],
  },
  descriptive: [
    {
      groupKey: WORK,
      subjects: [],
      primaryChoices: [],
      series: [],
      noCollection: false,
      lifecycle: { status: { kind: 'VALUE', status: 'ACTIVE' }, publicationDate: '2026-03-01', withdrawnDate: null },
      cover: { kind: 'ABSENT' },
      profileCover: { kind: 'ABSENT' },
    },
  ],
  commercial: [
    { productKey: PRODUCT, supplies: [], prices: [], carriers: { DIGITAL: { kind: 'NONE' } }, plannedLocations: [] },
  ],
  priceResolutions: [],
  rights: {
    products: [
      {
        productKey: PRODUCT,
        carrier: 'DIGITAL',
        expressions: [],
        licence: { kind: 'SILENT' },
        dated: false,
        technicalProtection: [],
        technicalProtectionState: 'UNKNOWN',
        usageConstraints: [],
        deferredRights: [],
      },
    ],
    groups: [{ groupKey: WORK, licence: { kind: 'UNSET' } }],
    licenceActions: [{ groupKey: WORK, action: { kind: 'UNSET' } }],
    acknowledgedFindingKeys: [],
  },
  accessibility: {
    products: [
      {
        productKey: PRODUCT,
        features: [],
        primaryStandards: [],
        additionalStandards: [],
        exceptions: [],
        reportUrls: [],
        publications: [
          { publicationType: Pdf, scope: 'DIGITAL', additionalStandards: [], incompatibleAdditionalStandards: [] },
        ],
      },
    ],
    contacts: [],
    actions: [
      {
        productKey: PRODUCT,
        publicationType: Pdf,
        resolved: {
          accessibilityStandard: null,
          accessibilityAdditionalStandard: null,
          accessibilityException: null,
          accessibilityReportUrl: null,
        },
        sources: [],
        omitted: [],
        action: 'CREATE',
      },
    ],
  },
  components: components(decided),
  relatedMaterial: {
    outcomes: [],
    edges: [],
    productReferences: [{ productKey: PRODUCT, asserted: false, references: [] }],
    referenceActions: [{ groupKey: WORK, action: { kind: 'NONE' } }],
  },
  collateral: {
    textContents: [],
    resources: [],
    candidates: [],
    actions: [
      collateralAction('WORK', null),
      collateralAction('CHAPTER', 1),
      collateralAction('CHAPTER', 2),
      collateralAction('CHAPTER', 3),
      collateralAction('CONTAINED_WORK', 4),
      collateralAction('CHAPTER', 6),
    ],
  },
  reviewsPrizes: {
    citedContents: [],
    prizes: [],
    candidates: [
      {
        scope: 'WORK',
        key: WORK,
        reviews: [],
        endorsements: [],
        prizes: [],
        ordering: { BOOK_REVIEW: { status: 'EMPTY' }, ENDORSEMENT: { status: 'EMPTY' }, AWARD: { status: 'EMPTY' } },
      },
    ],
    actions: [
      reviewsAction('WORK', null),
      reviewsAction('CHAPTER', 1),
      reviewsAction('CHAPTER', 2),
      reviewsAction('CHAPTER', 3),
      reviewsAction('CONTAINED_WORK', 4),
      reviewsAction('CHAPTER', 6),
    ],
  },
  plan: decided
    ? {
        works: [
          {
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
            publications: [
              {
                type: Pdf,
                isbn: '9781800006010',
                prices: [],
                locations: [],
                accessibilityStandard: null,
                accessibilityAdditionalStandard: null,
                accessibilityException: null,
                accessibilityReportUrl: '',
              },
            ],
            references: [],
            additionalResources: [],
            bookReviews: [],
            endorsements: [],
            awards: [],
          },
        ],
        containedWorks: [
          {
            type: 'MONOGRAPH',
            status: 'ACTIVE',
            fullTitle: 'An Embedded Work',
            publicationDate: '2026-03-01',
            withdrawnDate: null,
            edition: 1,
            imprintId: IMPRINT,
            parent: { kind: 'PLANNED_WORK', list: 'works', index: 0 },
          },
        ],
        series: [],
        relations: [],
      }
    : { works: [], containedWorks: [], series: [], relations: [] },
});

const chapter = (fullTitle: string, firstPage: string, lastPage: string, pageCount: number) => ({
  type: 'BOOK_CHAPTER',
  fullTitle,
  firstPage,
  lastPage,
  pageCount,
});

const planning = (decided: boolean): OnixPlanningExpectation => {
  const componentBlocker = (code: string, classification: 'TARGET_INPUT_REQUIRED' | 'TARGET_UNREPRESENTABLE') => ({
    code,
    classification,
    recordKey: 'record:1',
    productKey: PRODUCT,
    groupKey: WORK,
  });

  return {
    executable: decided,
    records: [
      {
        index: 1,
        recordReference: 'regression-press.9781800006010',
        disposition: 'COMPLETE',
        productKey: PRODUCT,
        action: 'PLANNED',
      },
    ],
    products: [
      {
        productKey: PRODUCT,
        groupKey: WORK,
        isbn: '9781800006010',
        manifestation: {
          kind: 'RESOLVED',
          type: Pdf,
          classification: 'SUPPORTED_NORMALIZED',
          notes: [{ code: 'DELIVERY_MODE_NOT_REPRESENTED', detail: 'EB' }],
        },
        publicationType: Pdf,
        action: 'CREATE_PUBLICATION',
        executable: decided,
      },
    ],
    workGroups: [
      {
        groupKey: WORK,
        productKeys: [PRODUCT],
        target: 'NEW_WORK',
        workType: decided
          ? { status: 'RESOLVED', type: Monograph, provenance: 'USER_FILE_DEFAULT' }
          : { status: 'UNRESOLVED' },
        edition: { status: 'RESOLVED', edition: 1, basis: 'DEFAULT_FIRST_EDITION' },
        workDoi: { kind: 'NONE' },
        executable: decided,
      },
    ],
    // Every unanswered component question holds the plan, by how it is answered (one per finding, in finding order).
    blockers: decided
      ? []
      : [
          {
            code: 'WORK_TYPE_INPUT_REQUIRED',
            classification: 'TARGET_INPUT_REQUIRED',
            recordKey: null,
            productKey: null,
            groupKey: WORK,
          },
          componentBlocker('COMPONENT_CHOICE_REQUIRED', 'TARGET_INPUT_REQUIRED'),
          componentBlocker('COMPONENT_ACKNOWLEDGEMENT_REQUIRED', 'TARGET_UNREPRESENTABLE'),
          componentBlocker('COMPONENT_INPUT_REQUIRED', 'TARGET_INPUT_REQUIRED'),
          componentBlocker('COMPONENT_ACKNOWLEDGEMENT_REQUIRED', 'TARGET_UNREPRESENTABLE'),
          componentBlocker('COMPONENT_CHOICE_REQUIRED', 'TARGET_INPUT_REQUIRED'),
          componentBlocker('COMPONENT_CHOICE_REQUIRED', 'TARGET_INPUT_REQUIRED'),
          componentBlocker('COMPONENT_ACKNOWLEDGEMENT_REQUIRED', 'TARGET_UNREPRESENTABLE'),
          componentBlocker('COMPONENT_INPUT_REQUIRED', 'TARGET_INPUT_REQUIRED'),
        ],
    findings: findings(decided),
    works: decided
      ? [
          {
            type: 'MONOGRAPH',
            status: 'ACTIVE',
            doi: '',
            edition: 1,
            publicationDate: '2026-03-01',
            pageCount: 0,
            titles: [
              {
                canonical: true,
                localeCode: 'EN',
                fullTitle: 'Components in Order',
                title: 'Components in Order',
                subtitle: '',
              },
            ],
            publications: [{ type: 'PDF', isbn: '9781800006010' }],
            contributions: [],
            languages: [{ code: 'ENG', relation: 'ORIGINAL' }],
            subjects: [],
          },
        ]
      : [],
    // Chapters in source order, never sorted by ordinal (correction 1); the AVItem and the contained Work are no chapter.
    chapters: decided
      ? [
          chapter('Preface', '1', '8', 0),
          chapter('Two Runs of Pages', '9', '30', 26),
          chapter('A Nested Section', '31', '40', 0),
          chapter('Index', '91', '96', 0),
        ]
      : [],
    target: target(decided),
  };
};

export default defineOnixRegressionFixture({
  id: 'target-components-hierarchy',
  status: 'CONTRACT',
  purpose:
    'Proves the ContentDetail contract on every component form: front, body and back matter as BookChapters at ' +
    'source or publisher ordinals, a choice between two PageRuns, a multi-level position kept as acknowledged ' +
    'evidence, a complete embedded Work planned as a contained Work of its own, and an AVItem omitted by acknowledgement.',
  source: {
    origin: 'SYNTHETIC',
    provenance:
      'Written for thoth-app#249. Every name and identifier is invented; the ISBN carries a valid check character. The ' +
      'canonical source gate admits it with one strict rule it cannot evaluate for a two-PageRun item, which does not count.',
    sha256: 'e25342fb528626c22ded429bfee3af5713341dd3a965241622fe75d2bfd54726',
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
        id: '_20181113_d_1',
        tier: 'STRICT',
        scope: 'VALIDITY',
        class: 'RULE_NOT_EVALUABLE',
        blocking: false,
        projection: 'NOT_EVALUABLE',
        recoverability: 'NOT_RECOVERABLE',
        counts: false,
        path: `${CI(2)}/TextItem[1]`,
      },
    ],
    recoveries: [],
    provenance: { kind: 'IDENTITY', flavour: 'reference' },
  },
  normalized: {
    '/onix:ONIXMessage/onix:Product/onix:ContentDetail/onix:ContentItem/onix:LevelSequenceNumber': [
      '1',
      '2',
      '2.1',
      '3',
      '4',
    ],
    '/onix:ONIXMessage/onix:Product/onix:ContentDetail/onix:ContentItem/onix:TextItem/onix:TextItemType': [
      '02',
      '03',
      '03',
      '01',
      '04',
    ],
    '/onix:ONIXMessage/onix:Product/onix:ContentDetail/onix:ContentItem/onix:AVItem/onix:AVItemType': ['01'],
    '/onix:ONIXMessage/onix:Product/onix:ContentDetail/onix:ContentItem[2]/onix:TextItem/onix:PageRun/onix:FirstPageNumber':
      ['9', '41'],
  },
  scenarios: [
    {
      name: 'as uploaded, before any publisher decision',
      target: 'EMPTY_PUBLISHER',
      planning: planning(false),
      outcomes: {
        SUPPORTED_NORMALIZED: 7,
        TARGET_INPUT_REQUIRED: 11,
        TARGET_UNREPRESENTABLE: 6,
      },
    },
    {
      name: 'publisher answers every component question and takes MONOGRAPH',
      target: 'EMPTY_PUBLISHER',
      inputs: { fileWorkType: Monograph, componentChoices: CHOICES },
      planning: planning(true),
      outcomes: {
        SUPPORTED_NORMALIZED: 7,
        TARGET_INPUT_REQUIRED: 6,
        TARGET_UNREPRESENTABLE: 3,
      },
    },
  ],
});
