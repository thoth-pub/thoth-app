import { PublicationType } from '@/src/shared/constants/publications';
import { WorkTypes } from '@/src/shared/constants/work';

import { defineOnixRegressionFixture } from '../../fixtureSources';
import type {
  OnixPlanFindingEntry,
  OnixPlanningExpectation,
  OnixSourceFindingEntry,
  OnixTargetDescriptiveEntry,
  OnixTargetLedger,
} from '../../types';

const { Pdf } = PublicationType.enum;
const { Monograph } = WorkTypes.enum;

/**
 * One Product stating a Subject in every List 27 situation the importer distinguishes (thoth-app#249): LC classification,
 * BISAC with one MainSubject, BIC with and without a declared version (its MainSubject on the unverifiable one), Thema at
 * the pinned version, without a version and at an unpinned version - two of them MainSubject - a Thema qualifier,
 * Keywords, hidden B2 keywords, an LC subject heading, Dewey, a publisher category (23) and a proprietary scheme (24).
 *
 * The Work is also issue 4 of an ISSN-identified publisher collection: its only questions, the new Series' type and
 * its ISSN's form, answered, are what proves a planned Series membership reaches the executable plan, which the Series
 * fixture cannot (its in-file collision is unanswerable by contract).
 *
 * Importer-side semantics only: thoth#892 (the Thoth subject exporter) is open, and nothing here claims a Thoth ->
 * ONIX -> Thoth subject round trip (REG-01F / thoth-app#251).
 *
 * Contract authority: ONIX-AUDIT-SUBJECTS-01 `5541439462` (approved `5541524582`) rules 4-28; the code-23 amendment
 * `5683791471` (superseding rule 16) as restated by #183 Specification Refresh 4 `5686547993`; classification
 * vocabulary `5572448584`. The Series: the recovered Series / Collection / Issue decision `5541009506` section F (CTO
 * `agreed`) rules 5-9, 13-14; #183 issue-number boundary `5683079198` (re-incorporated by `5686547993`).
 */

const PRODUCT = 'product:gtin13:9781800004016';
const WORK = `work:${PRODUCT}`;
const DD = '/ONIXMessage[1]/Product[1]/DescriptiveDetail[1]';
const S = (n: number) => `${DD}/Subject[${n}]`;

const subjectKey = (code: string, owner: string, discriminator = '') => `SUBJECTS|${code}|${owner}|${discriminator}`;
const BIC_PRIMARY = subjectKey('SUBJECT_PRIMARY_REQUIRED', WORK, '|BIC');
const IMPRINT = '11111111-1111-4111-8111-111111111111';
const COLLECTION = `${DD}/Collection[1]`;
const ISSN_IDENTITY = 'issn:0317-8471';
const SERIES_TYPE = `SERIES|SERIES_TYPE_REQUIRED|${WORK}|proposed:${IMPRINT}|${ISSN_IDENTITY}`;
const SERIES_ISSN = `SERIES|SERIES_ISSN_ASSIGNMENT_REQUIRED|${WORK}|proposed:${IMPRINT}|${ISSN_IDENTITY}`;
const THEMA_PRIMARY = subjectKey('SUBJECT_PRIMARY_AMBIGUOUS', WORK, '|THEMA');

const advisory = (id: string, path: string): OnixSourceFindingEntry => ({
  id,
  tier: 'SCHEMATRON',
  scope: 'VALIDITY',
  class: 'DEPRECATED_OR_INFORMATIONAL',
  blocking: false,
  projection: 'AUTHORITATIVE',
  recoverability: 'NOT_RECOVERABLE',
  counts: false,
  path,
});

const notEvaluable = (id: string): OnixSourceFindingEntry => ({
  id,
  tier: 'STRICT',
  scope: 'VALIDITY',
  class: 'RULE_NOT_EVALUABLE',
  blocking: false,
  projection: 'NOT_EVALUABLE',
  recoverability: 'NOT_RECOVERABLE',
  counts: false,
  path: DD,
});

const finding = (
  code: string,
  classification: OnixPlanFindingEntry['classification'],
  productKey: string | null,
  choice?: 'UNANSWERED' | 'ANSWERED',
): OnixPlanFindingEntry => ({
  family: 'DESCRIPTIVE',
  code,
  classification,
  blocking: choice !== undefined,
  resolution: choice === undefined ? 'NONE' : 'CHOICE',
  answer: choice ?? 'NOT_APPLICABLE',
  productKey,
  groupKey: WORK,
});

const findings = (decided: boolean): OnixPlanFindingEntry[] => [
  // One explicit, non-blocking loss per unsupported valid scheme: Thema qualifier 94, hidden B2 keywords, LC subject
  // heading 04, Dewey 01 and proprietary 24 - none coerced into LCC, Keyword or Custom (rules 4, 6, 10, 13, 15, 34).
  finding('SUBJECT_SCHEME_UNREPRESENTABLE', 'TARGET_UNREPRESENTABLE', PRODUCT),
  finding('SUBJECT_SCHEME_UNREPRESENTABLE', 'TARGET_UNREPRESENTABLE', PRODUCT),
  finding('SUBJECT_SCHEME_UNREPRESENTABLE', 'TARGET_UNREPRESENTABLE', PRODUCT),
  finding('SUBJECT_SCHEME_UNREPRESENTABLE', 'TARGET_UNREPRESENTABLE', PRODUCT),
  finding('SUBJECT_SCHEME_UNREPRESENTABLE', 'TARGET_UNREPRESENTABLE', PRODUCT),
  // A declared version no pinned resource covers fails closed (rule 19): BIC 2.1 and Thema 1.5 are not imported.
  finding('SUBJECT_VERSION_UNKNOWN', 'UNKNOWN', PRODUCT),
  finding('SUBJECT_VERSION_UNKNOWN', 'UNKNOWN', PRODUCT),
  // A Thema subject declaring no version is validated against the pinned default, and says so (rule 20).
  finding('SUBJECT_THEMA_DEFAULT_VERSION', 'SUPPORTED_NORMALIZED', PRODUCT),
  // BIC maps with a deprecation warning, never converted to Thema (rule 8).
  finding('SUBJECT_BIC_DEPRECATED', 'SUPPORTED_WITH_WARNING', PRODUCT),
  // A publisher category is Custom; its scheme name has nowhere to go (code-23 amendment).
  finding('SUBJECT_CUSTOM_NAMESPACE_NOT_REPRESENTED', 'SUPPORTED_WITH_WARNING', PRODUCT),
  // BIC's MainSubject was not imported, so which remaining BIC subject is primary is the publisher's (rules 25, 27).
  finding('SUBJECT_PRIMARY_REQUIRED', 'TARGET_INPUT_REQUIRED', null, decided ? 'ANSWERED' : 'UNANSWERED'),
  // Two Thema MainSubjects (versions 1.6 and none) map to one target type: never chosen by parser order (rule 26).
  finding('SUBJECT_PRIMARY_AMBIGUOUS', 'TARGET_INPUT_REQUIRED', null, decided ? 'ANSWERED' : 'UNANSWERED'),
  // A new Series needs its type (rule 5) and its ISSN's form (rule 9) from the publisher.
  finding('SERIES_TYPE_REQUIRED', 'TARGET_INPUT_REQUIRED', null, decided ? 'ANSWERED' : 'UNANSWERED'),
  finding('SERIES_ISSN_ASSIGNMENT_REQUIRED', 'TARGET_INPUT_REQUIRED', null, decided ? 'ANSWERED' : 'UNANSWERED'),
];

type PlannedSubject = OnixTargetDescriptiveEntry['subjects'][number];

const planned = (
  type: string,
  code: string,
  main: boolean,
  n: number,
  scheme: string,
  options: { version?: string; heading?: boolean; namespace?: string } = {},
): PlannedSubject => ({
  type,
  code,
  main,
  namespace: options.namespace ?? null,
  sources: [
    {
      path: S(n),
      scheme,
      schemeVersion: options.version ?? null,
      valueSource: options.heading ? 'SubjectHeadingText' : 'SubjectCode',
      main,
    },
  ],
});

/** The subjects the reduction imports, in source order; ordinals are the resolver's, per type (rules 21-23). */
const SUBJECTS: PlannedSubject[] = [
  planned('LCC', 'PN1009.A1', true, 1, '03'),
  planned('BISAC', 'LAN009000', false, 2, '10'),
  planned('BISAC', 'LIT004130', true, 3, '10'),
  planned('BIC', 'DSB', false, 4, '12'),
  planned('THEMA', 'DSBH', true, 6, '93', { version: '1.6' }),
  planned('THEMA', 'DSBF', true, 7, '93'),
  // One code-20 heading split on semicolons into trimmed, non-empty keywords, in order (rule 12).
  planned('KEYWORD', 'literary theory', false, 10, '20', { heading: true }),
  planned('KEYWORD', 'reading', false, 10, '20', { heading: true }),
  planned('KEYWORD', 'criticism', false, 10, '20', { heading: true }),
  planned('CUSTOM', 'REG-LIT', false, 14, '23', { namespace: 'Regression Press categories' }),
];

const target = (decided: boolean): OnixTargetLedger => ({
  findings: [
    ...[
      [9, '94'],
      [11, 'B2'],
      [12, '04'],
      [13, '01'],
      [15, '24'],
    ].map(([n, scheme]) => ({
      family: 'DESCRIPTIVE' as const,
      code: 'SUBJECT_SCHEME_UNREPRESENTABLE',
      key: subjectKey('SUBJECT_SCHEME_UNREPRESENTABLE', PRODUCT, `|${scheme}`),
      paths: [S(n as number)],
    })),
    {
      family: 'DESCRIPTIVE',
      code: 'SUBJECT_VERSION_UNKNOWN',
      key: subjectKey('SUBJECT_VERSION_UNKNOWN', PRODUCT, '|12|2.1'),
      paths: [S(5)],
    },
    {
      family: 'DESCRIPTIVE',
      code: 'SUBJECT_VERSION_UNKNOWN',
      key: subjectKey('SUBJECT_VERSION_UNKNOWN', PRODUCT, '|93|1.5'),
      paths: [S(8)],
    },
    {
      family: 'DESCRIPTIVE',
      code: 'SUBJECT_THEMA_DEFAULT_VERSION',
      key: subjectKey('SUBJECT_THEMA_DEFAULT_VERSION', PRODUCT),
      paths: [S(7)],
    },
    {
      family: 'DESCRIPTIVE',
      code: 'SUBJECT_BIC_DEPRECATED',
      key: subjectKey('SUBJECT_BIC_DEPRECATED', PRODUCT),
      paths: [S(4)],
    },
    {
      family: 'DESCRIPTIVE',
      code: 'SUBJECT_CUSTOM_NAMESPACE_NOT_REPRESENTED',
      key: subjectKey('SUBJECT_CUSTOM_NAMESPACE_NOT_REPRESENTED', PRODUCT),
      paths: [S(14)],
    },
    { family: 'DESCRIPTIVE', code: 'SUBJECT_PRIMARY_REQUIRED', key: BIC_PRIMARY, paths: [S(4)] },
    { family: 'DESCRIPTIVE', code: 'SUBJECT_PRIMARY_AMBIGUOUS', key: THEMA_PRIMARY, paths: [S(6), S(7)] },
    { family: 'DESCRIPTIVE', code: 'SERIES_TYPE_REQUIRED', key: SERIES_TYPE, paths: [COLLECTION] },
    { family: 'DESCRIPTIVE', code: 'SERIES_ISSN_ASSIGNMENT_REQUIRED', key: SERIES_ISSN, paths: [COLLECTION] },
  ],
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
      subjects: SUBJECTS,
      primaryChoices: ['BIC', 'THEMA'],
      // ISSN identity (rule 7); publication order 03 is the ordinal (14); the integer part number the issue number (13).
      series: [
        {
          key: ISSN_IDENTITY,
          name: 'Subjects in Series',
          issns: ['0317-8471'],
          thothSeriesId: null,
          ordinal: 4,
          issueNumber: 4,
          classificationFindingKey: null,
          ordinalFindingKey: null,
          paths: [COLLECTION],
        },
      ],
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
  components: [],
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
      {
        groupKey: WORK,
        productKey: null,
        componentPath: null,
        target: 'WORK',
        action: 'PLANNED',
        abstracts: [],
        tableOfContents: null,
        generalNote: null,
        resources: [],
      },
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
      {
        groupKey: WORK,
        productKey: null,
        componentPath: null,
        target: 'WORK',
        action: 'PLANNED',
        bookReviews: [],
        endorsements: [],
        awards: [],
      },
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
                isbn: '9781800004016',
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
        containedWorks: [],
        // A new Series of the imprint, typed and its ISSN placed as the publisher said, holding the Work as issue 4. The
        // unassigned print ISSN is the Series entity's empty value, which its mapper sends as null.
        series: [
          {
            name: 'Subjects in Series',
            target: {
              kind: 'proposed',
              type: 'BOOK_SERIES',
              imprintId: IMPRINT,
              issnPrint: '',
              issnDigital: '0317-8471',
            },
            members: [{ work: { kind: 'PLANNED_WORK', list: 'works', index: 0 }, orderNumber: 4, issueNumber: 4 }],
          },
        ],
        relations: [],
      }
    : { works: [], containedWorks: [], series: [], relations: [] },
});

const descriptiveBlocker = {
  code: 'DESCRIPTIVE_CHOICE_REQUIRED',
  classification: 'TARGET_INPUT_REQUIRED' as const,
  recordKey: 'record:1',
  productKey: null,
  groupKey: WORK,
};

const planning = (decided: boolean): OnixPlanningExpectation => ({
  executable: decided,
  records: [
    {
      index: 1,
      recordReference: 'regression-press.9781800004016',
      disposition: 'COMPLETE',
      productKey: PRODUCT,
      action: 'PLANNED',
    },
  ],
  products: [
    {
      productKey: PRODUCT,
      groupKey: WORK,
      isbn: '9781800004016',
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
        descriptiveBlocker,
        descriptiveBlocker,
        descriptiveBlocker,
        descriptiveBlocker,
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
              fullTitle: 'Subjects in Every Scheme',
              title: 'Subjects in Every Scheme',
              subtitle: '',
            },
          ],
          publications: [{ type: 'PDF', isbn: '9781800004016' }],
          contributions: [],
          languages: [{ code: 'ENG', relation: 'ORIGINAL' }],
          // Ordinal 1 is the primary of each type (rule 22): the one LCC subject (24); BISAC's MainSubject, the rest in
          // source order (23); the publisher's BIC and Thema answers; keywords in order (12); the one Custom value.
          subjects: [
            { type: 'LCC', code: 'PN1009.A1', ordinal: 1 },
            { type: 'BISAC', code: 'LIT004130', ordinal: 1 },
            { type: 'BISAC', code: 'LAN009000', ordinal: 2 },
            { type: 'BIC', code: 'DSB', ordinal: 1 },
            { type: 'THEMA', code: 'DSBF', ordinal: 1 },
            { type: 'THEMA', code: 'DSBH', ordinal: 2 },
            { type: 'KEYWORD', code: 'literary theory', ordinal: 1 },
            { type: 'KEYWORD', code: 'reading', ordinal: 2 },
            { type: 'KEYWORD', code: 'criticism', ordinal: 3 },
            { type: 'CUSTOM', code: 'REG-LIT', ordinal: 1 },
          ],
        },
      ]
    : [],
  chapters: [],
  target: target(decided),
});

export default defineOnixRegressionFixture({
  id: 'target-subject-matrix',
  status: 'CONTRACT',
  purpose:
    'Proves the importer-side List 27 subject contract: which schemes map to which Thoth subject type, which are ' +
    'explicit losses, how a declared, an omitted and an unpinned scheme version are treated, and how MainSubject ' +
    'decides - or leaves to the publisher - the primary subject of each type; and that a decided Series membership ' +
    'reaches the executable plan.',
  source: {
    origin: 'SYNTHETIC',
    provenance:
      'Written for thoth-app#249. Every name and identifier is invented; subject codes are real codes of their schemes, ' +
      'chosen only for their scheme semantics, and the ISBN carries a valid check character. The canonical source gate ' +
      'admits it with two BIC deprecation notes, a strict advisory on the collection-level PartNumber and two strict ' +
      'rules it cannot evaluate, none of them counting. The ISSN carries a valid check character.',
    sha256: '3ad042062403009e37f24a02bd11f4fa872b9f3c584f0589c1d54a93ec921b01',
  },
  defects: [],
  asOf: '2026-10-02T12:00:00.000Z',
  imprints: [{ label: 'Regression Press', value: IMPRINT }],
  gate: {
    verdict: 'PERMITTED',
    release: '3.1',
    flavour: 'reference',
    findings: [
      notEvaluable('_20190107_e_1'),
      notEvaluable('_20190107_f_1'),
      {
        id: '_20181210_c_1',
        tier: 'STRICT',
        scope: 'VALIDITY',
        class: 'ADVISORY',
        blocking: false,
        projection: 'AUTHORITATIVE',
        recoverability: 'NOT_RECOVERABLE',
        counts: false,
        path: `${COLLECTION}/TitleDetail[1]/TitleElement[1]`,
      },
      advisory('_20180202_d_63', `${S(4)}/SubjectSchemeIdentifier[1]`),
      advisory('_20180202_d_63', `${S(5)}/SubjectSchemeIdentifier[1]`),
    ],
    recoveries: [],
    provenance: { kind: 'IDENTITY', flavour: 'reference' },
  },
  normalized: {
    '/onix:ONIXMessage/onix:Product/onix:DescriptiveDetail/onix:Subject/onix:SubjectSchemeIdentifier': [
      '03',
      '10',
      '10',
      '12',
      '12',
      '93',
      '93',
      '93',
      '94',
      '20',
      'B2',
      '04',
      '01',
      '23',
      '24',
    ],
    '/onix:ONIXMessage/onix:Product/onix:DescriptiveDetail/onix:Subject[onix:MainSubject]/onix:SubjectCode': [
      'PN1009.A1',
      'LIT004130',
      'DSK',
      'DSBH',
      'DSBF',
    ],
    '/onix:ONIXMessage/onix:Product/onix:DescriptiveDetail/onix:Subject/onix:SubjectSchemeVersion': [
      '2.1',
      '1.6',
      '1.5',
    ],
  },
  scenarios: [
    {
      name: 'as uploaded, before any publisher decision',
      target: 'EMPTY_PUBLISHER',
      planning: planning(false),
      outcomes: {
        SUPPORTED_NORMALIZED: 2,
        SUPPORTED_WITH_WARNING: 2,
        TARGET_UNREPRESENTABLE: 5,
        TARGET_INPUT_REQUIRED: 9,
        UNKNOWN: 2,
      },
    },
    {
      name: 'publisher takes MONOGRAPH, chooses DSB and DSBF as primary subjects, and types the Series and its ISSN',
      target: 'EMPTY_PUBLISHER',
      inputs: {
        fileWorkType: Monograph,
        descriptiveChoices: {
          [BIC_PRIMARY]: 'DSB',
          [THEMA_PRIMARY]: 'DSBF',
          [SERIES_TYPE]: 'BOOK_SERIES',
          [SERIES_ISSN]: 'DIGITAL',
        },
      },
      planning: planning(true),
      outcomes: {
        SUPPORTED_NORMALIZED: 2,
        SUPPORTED_WITH_WARNING: 2,
        TARGET_UNREPRESENTABLE: 5,
        TARGET_INPUT_REQUIRED: 4,
        UNKNOWN: 2,
      },
    },
  ],
});
