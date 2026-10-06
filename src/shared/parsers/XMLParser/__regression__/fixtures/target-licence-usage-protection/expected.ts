import type { PublicationType as PublicationTypeValue } from '@/src/entities/publication/model/publication.types';
import { PublicationType } from '@/src/shared/constants/publications';
import { WorkTypes } from '@/src/shared/constants/work';

import { defineOnixRegressionFixture } from '../../fixtureSources';
import type {
  OnixPlanFindingEntry,
  OnixPlanningExpectation,
  OnixProductEntry,
  OnixRecordEntry,
  OnixTargetLedger,
} from '../../types';

const { Epub, Paperback, Pdf } = PublicationType.enum;
const { Monograph } = WorkTypes.enum;

/**
 * Two Works whose Products state licences, usage constraints and technical protection (thoth-app#249):
 *
 * - Work A (PDF, EPUB, paperback): both digital Products state CC BY 4.0 - one by a CC 4.0 `legalcode` alias - beside
 *   an additional licence, an ONIX-PL policy, technical protection none or watermarking, and a preview and an unlimited
 *   print constraint; the rights-silent paperback is neutral. CC BY 4.0 is set once the two acknowledgeable losses are
 *   acknowledged.
 * - Work B (PDF): CC BY-NC 4.0, one composite of it dated, beside a copy/paste limit: the dated licence and the
 *   restricting constraint keep any licence from being set, and acknowledging them omits it.
 *
 * Work B is also stated to be part of Work A (RelatedProduct 02) and cites one DOI (RelatedProduct 34): a licence is
 * never inherited across that relation, and the relation and the Reference are what prove a planned Work relation and
 * a Work's References reach the executable plan, which the RelatedMaterial fixture cannot (its contradiction is
 * unanswerable by contract).
 *
 * Contract authority: ONIX-AUDIT-LICENCE-USAGE-01 `5568901904` (approved `5569159747`) rules 15-36, 39-44, 45-54,
 * 56-78, 83-92, 119, 135; #211 corrections CR-1..CR-4 (approval `5704096299`); #217 rights-decision UX rules 44-62.
 * The relation and the Reference: ONIX-AUDIT-RELATED-MATERIAL-01 `5541586341` rules 16-18, 37-43; #224 Amendment 2
 * `5812546990` B (an automatic generic product relation between settled Works); #187 `5938391709` section 4 and
 * `5938547347` (CREATE_WORK owns References).
 */

const PDF_A = 'product:gtin13:9781800009011';
const EPUB_A = 'product:gtin13:9781800009028';
const PAPERBACK_A = 'product:gtin13:9781800009035';
const PDF_B = 'product:gtin13:9781800009042';
const WORK_A = `work:${PDF_A}`;
const WORK_B = `work:${PDF_B}`;
const PRODUCTS = [PDF_A, EPUB_A, PAPERBACK_A, PDF_B];
const DOI_A = 'https://doi.org/10.5555/regression.d109a';

const DD = (n: number) => `/ONIXMessage[1]/Product[${n}]/DescriptiveDetail[1]`;
const CC_BY = 'https://creativecommons.org/licenses/by/4.0/';
const CC_BY_NC = 'https://creativecommons.org/licenses/by-nc/4.0/';

const rightsKey = (code: string, productKey: string, discriminator: string) =>
  `RIGHTS|${code}|${productKey}|${discriminator}`;
const ADDITIONAL = `${DD(1)}/EpubLicense[1]/EpubLicenseExpression[2]`;
const POLICY = `${DD(1)}/EpubLicense[1]/EpubLicenseExpression[3]`;
const PREVIEW = `${DD(1)}/EpubUsageConstraint[1]`;
const PRINT = `${DD(1)}/EpubUsageConstraint[2]`;
const COPY_PASTE = `${DD(4)}/EpubUsageConstraint[1]`;
const DATED_LICENCE = `${DD(4)}/EpubLicense[2]`;
const PART_OF = '/ONIXMessage[1]/Product[4]/RelatedMaterial[1]/RelatedProduct[1]/ProductRelationCode[1]';
const PART_EDGE = `EDGE|group:${WORK_A}↔group:${WORK_B}|HAS_PART`;
const CITATION = '/ONIXMessage[1]/Product[4]/RelatedMaterial[1]/RelatedProduct[2]';
const PRINT_KEY = rightsKey('RIGHTS_USAGE_CONSTRAINT_UNREPRESENTABLE', PDF_A, PRINT);
const PROTECTION_KEY = rightsKey('RIGHTS_TECHNICAL_PROTECTION_UNREPRESENTABLE', EPUB_A, 'protection');
const DATED_KEY = rightsKey('RIGHTS_LICENCE_DATED', PDF_B, DATED_LICENCE);
const COPY_PASTE_KEY = rightsKey('RIGHTS_USAGE_CONSTRAINT_UNREPRESENTABLE', PDF_B, COPY_PASTE);
const ACKNOWLEDGED = [PRINT_KEY, PROTECTION_KEY, DATED_KEY, COPY_PASTE_KEY];

const RECORDS: OnixRecordEntry[] = PRODUCTS.map((productKey, index) => ({
  index: index + 1,
  recordReference: `regression-press.${productKey.slice('product:gtin13:'.length)}`,
  disposition: 'COMPLETE',
  productKey,
  action: 'PLANNED',
}));

const deliveryEb = [{ code: 'DELIVERY_MODE_NOT_REPRESENTED', detail: 'EB' }] as const;

const products = (executable: boolean): OnixProductEntry[] => [
  {
    productKey: PDF_A,
    groupKey: WORK_A,
    isbn: '9781800009011',
    manifestation: { kind: 'RESOLVED', type: Pdf, classification: 'SUPPORTED_NORMALIZED', notes: [...deliveryEb] },
    publicationType: Pdf,
    action: 'CREATE_PUBLICATION',
    executable,
  },
  {
    productKey: EPUB_A,
    groupKey: WORK_A,
    isbn: '9781800009028',
    manifestation: { kind: 'RESOLVED', type: Epub, classification: 'SUPPORTED_NORMALIZED', notes: [...deliveryEb] },
    publicationType: Epub,
    action: 'CREATE_PUBLICATION',
    executable,
  },
  {
    productKey: PAPERBACK_A,
    groupKey: WORK_A,
    isbn: '9781800009035',
    manifestation: { kind: 'RESOLVED', type: Paperback, classification: 'SUPPORTED_LOSSLESS', notes: [] },
    publicationType: Paperback,
    action: 'CREATE_PUBLICATION',
    executable,
  },
  {
    productKey: PDF_B,
    groupKey: WORK_B,
    isbn: '9781800009042',
    manifestation: { kind: 'RESOLVED', type: Pdf, classification: 'SUPPORTED_NORMALIZED', notes: [...deliveryEb] },
    publicationType: Pdf,
    action: 'CREATE_PUBLICATION',
    executable,
  },
];

const finding = (
  code: string,
  classification: OnixPlanFindingEntry['classification'],
  productKey: string,
  groupKey: string,
  acknowledgement: 'NONE' | 'UNANSWERED' | 'ANSWERED',
): OnixPlanFindingEntry => ({
  family: 'RIGHTS',
  code,
  classification,
  blocking: acknowledgement !== 'NONE',
  resolution: acknowledgement === 'NONE' ? 'NONE' : 'ACKNOWLEDGE',
  answer: acknowledgement === 'NONE' ? 'NOT_APPLICABLE' : acknowledgement,
  productKey,
  groupKey,
});

const findings = (decided: boolean): OnixPlanFindingEntry[] => {
  const ack = decided ? 'ANSWERED' : 'UNANSWERED';

  return [
    // An additional licence (03) and a policy (10) are never the Product's own licence: disclosed (rules 23-25, 35-36).
    finding('RIGHTS_ADDITIONAL_LICENCE_NOT_REPRESENTED', 'TARGET_UNREPRESENTABLE', PDF_A, WORK_A, 'NONE'),
    finding('RIGHTS_POLICY_NOT_REPRESENTED', 'TARGET_UNREPRESENTABLE', PDF_A, WORK_A, 'NONE'),
    // A coherent preview constraint is a non-blocking disclosure (rule 71) ...
    finding('RIGHTS_USAGE_CONSTRAINT_NOT_REPRESENTED', 'TARGET_UNREPRESENTABLE', PDF_A, WORK_A, 'NONE'),
    // ... a material one (print, unlimited) an acknowledgeable loss that never blocks the licence (rules 72-73).
    finding('RIGHTS_USAGE_CONSTRAINT_UNREPRESENTABLE', 'TARGET_UNREPRESENTABLE', PDF_A, WORK_A, ack),
    // Watermarking is protection Thoth cannot record: acknowledged, never part of the licence decision (rules 48-54, 79).
    finding('RIGHTS_TECHNICAL_PROTECTION_UNREPRESENTABLE', 'TARGET_UNREPRESENTABLE', EPUB_A, WORK_A, ack),
    // A dated licence can never be set automatically (rules 39-41) ...
    finding('RIGHTS_LICENCE_DATED', 'TARGET_INPUT_REQUIRED', PDF_B, WORK_B, ack),
    // ... nor beside a restricting constraint, copy/paste permitted subject to a limit (rules 76-78).
    finding('RIGHTS_USAGE_CONSTRAINT_UNREPRESENTABLE', 'TARGET_UNREPRESENTABLE', PDF_B, WORK_B, ack),
    // The part relation's ordinal is a target normalisation of source order within its type (rules 37-41).
    {
      family: 'RELATION',
      code: 'RELATION_ORDINAL_NORMALISED',
      classification: 'SUPPORTED_NORMALIZED',
      blocking: false,
      resolution: 'NONE',
      answer: 'NOT_APPLICABLE',
      productKey: PDF_B,
      groupKey: WORK_B,
    },
  ];
};

const noSupply = (productKey: string, carrier: 'DIGITAL' | 'PHYSICAL') => ({
  productKey,
  supplies: [],
  prices: [],
  carriers: { [carrier]: { kind: 'NONE' as const } },
  plannedLocations: [],
});

const noFeatures = (productKey: string, publicationType: PublicationTypeValue, scope: 'DIGITAL' | 'PHYSICAL') => ({
  productKey,
  features: [],
  primaryStandards: [],
  additionalStandards: [],
  exceptions: [],
  reportUrls: [],
  publications: [{ publicationType, scope, additionalStandards: [], incompatibleAdditionalStandards: [] }],
});

const created = (productKey: string, publicationType: PublicationTypeValue) => ({
  productKey,
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

const workIdentity = (n: number, productKey: string) => ({
  declarationKey: `${productKey}|/ONIXMessage[1]/Product[${n}]/RelatedMaterial[1]/RelatedWork[1]/WorkRelationCode[1]`,
  path: `/ONIXMessage[1]/Product[${n}]/RelatedMaterial[1]/RelatedWork[1]`,
  productKey,
  construct: 'RELATED_WORK' as const,
  code: '01',
  outcome: 'WORK_IDENTITY' as const,
  endpoint: null,
  relationType: null,
  edgeKey: null,
});

const collateralAction = (groupKey: string) => ({
  groupKey,
  productKey: null,
  componentPath: null,
  target: 'WORK' as const,
  action: 'PLANNED' as const,
  abstracts: [],
  tableOfContents: null,
  generalNote: null,
  resources: [],
});

const reviewsAction = (groupKey: string) => ({
  groupKey,
  productKey: null,
  componentPath: null,
  target: 'WORK' as const,
  action: 'PLANNED' as const,
  bookReviews: [],
  endorsements: [],
  awards: [],
});

const emptyCandidates = (groupKey: string) => ({
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

const plannedWork = (license: string, publications: ReturnType<typeof publication>[]) => ({
  license,
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

const target = (decided: boolean): OnixTargetLedger => ({
  findings: [
    {
      family: 'RIGHTS',
      code: 'RIGHTS_ADDITIONAL_LICENCE_NOT_REPRESENTED',
      key: rightsKey('RIGHTS_ADDITIONAL_LICENCE_NOT_REPRESENTED', PDF_A, ADDITIONAL),
      paths: [ADDITIONAL],
    },
    {
      family: 'RIGHTS',
      code: 'RIGHTS_POLICY_NOT_REPRESENTED',
      key: rightsKey('RIGHTS_POLICY_NOT_REPRESENTED', PDF_A, POLICY),
      paths: [POLICY],
    },
    {
      family: 'RIGHTS',
      code: 'RIGHTS_USAGE_CONSTRAINT_NOT_REPRESENTED',
      key: rightsKey('RIGHTS_USAGE_CONSTRAINT_NOT_REPRESENTED', PDF_A, PREVIEW),
      paths: [PREVIEW],
    },
    { family: 'RIGHTS', code: 'RIGHTS_USAGE_CONSTRAINT_UNREPRESENTABLE', key: PRINT_KEY, paths: [PRINT] },
    {
      family: 'RIGHTS',
      code: 'RIGHTS_TECHNICAL_PROTECTION_UNREPRESENTABLE',
      key: PROTECTION_KEY,
      paths: [`${DD(2)}/EpubTechnicalProtection[1]`],
    },
    { family: 'RIGHTS', code: 'RIGHTS_LICENCE_DATED', key: DATED_KEY, paths: [`${DATED_LICENCE}/EpubLicenseDate[1]`] },
    { family: 'RIGHTS', code: 'RIGHTS_USAGE_CONSTRAINT_UNREPRESENTABLE', key: COPY_PASTE_KEY, paths: [COPY_PASTE] },
    {
      family: 'RELATION',
      code: 'RELATION_ORDINAL_NORMALISED',
      key: `RELATION|RELATION_ORDINAL_NORMALISED|${PDF_B}|${PART_EDGE}|1`,
      paths: [PART_OF],
    },
  ],
  identity: {
    compatibility: { headerMatches: false, ignoredNativeRecordKeys: [], activation: 'NOT_APPLICABLE' },
    groups: [
      {
        groupKey: WORK_A,
        compatibility: 'GENERIC',
        thothVerification: 'NOT_APPLICABLE',
        edges: [{ kind: 'WORK_IDENTITY', key: `workdoi:${DOI_A}`, productKeys: [PDF_A, EPUB_A, PAPERBACK_A] }],
        evidence: [{ kind: 'NO_TARGET_MATCH' }],
      },
      // One Product with no Work identifier is a Work of its own.
      {
        groupKey: WORK_B,
        compatibility: 'GENERIC',
        thothVerification: 'NOT_APPLICABLE',
        edges: [],
        evidence: [{ kind: 'NO_TARGET_MATCH' }],
      },
    ],
    products: PRODUCTS.map((productKey, index) => ({
      productKey,
      recordKeys: [`record:${index + 1}`],
      evidence: [{ kind: 'NO_TARGET_MATCH' }],
      omittable: false,
    })),
  },
  descriptive: [descriptive(WORK_A), descriptive(WORK_B)],
  commercial: [
    noSupply(PDF_A, 'DIGITAL'),
    noSupply(EPUB_A, 'DIGITAL'),
    noSupply(PAPERBACK_A, 'PHYSICAL'),
    noSupply(PDF_B, 'DIGITAL'),
  ],
  priceResolutions: [],
  rights: {
    products: [
      {
        productKey: PDF_A,
        carrier: 'DIGITAL',
        // Type and link together; only the intrinsic 01 expression has an identity, via the CC 4.0 alias (16, 22-28).
        expressions: [
          {
            path: `${DD(1)}/EpubLicense[1]/EpubLicenseExpression[1]`,
            type: '01',
            role: 'INTRINSIC',
            identity: 'CC_BY_4_0',
            link: 'https://creativecommons.org/licenses/by/4.0/legalcode',
          },
          {
            path: ADDITIONAL,
            type: '03',
            role: 'ADDITIONAL',
            identity: null,
            link: 'https://regression-press.example/licences/institutional-terms',
          },
          {
            path: POLICY,
            type: '10',
            role: 'POLICY',
            identity: null,
            link: 'https://regression-press.example/licences/onix-pl.xml',
          },
        ],
        licence: { kind: 'SUPPORTED', identity: 'CC_BY_4_0', url: CC_BY },
        dated: false,
        // Explicit 00 is "no protection", which only it ever says (rule 46).
        technicalProtection: ['00'],
        technicalProtectionState: 'NONE',
        usageConstraints: [
          { path: PREVIEW, type: '01', status: '01', limits: [] },
          { path: PRINT, type: '02', status: '01', limits: [] },
        ],
        deferredRights: [],
      },
      {
        productKey: EPUB_A,
        carrier: 'DIGITAL',
        expressions: [
          {
            path: `${DD(2)}/EpubLicense[1]/EpubLicenseExpression[1]`,
            type: '01',
            role: 'INTRINSIC',
            identity: 'CC_BY_4_0',
            link: CC_BY,
          },
        ],
        licence: { kind: 'SUPPORTED', identity: 'CC_BY_4_0', url: CC_BY },
        dated: false,
        technicalProtection: ['02'],
        technicalProtectionState: 'PROTECTED',
        usageConstraints: [],
        deferredRights: [],
      },
      // A physical Product stating no rights is neutral to its Work's licence (rule 84, CR-1).
      {
        productKey: PAPERBACK_A,
        carrier: 'PHYSICAL',
        expressions: [],
        licence: { kind: 'SILENT' },
        dated: false,
        technicalProtection: [],
        technicalProtectionState: 'UNKNOWN',
        usageConstraints: [],
        deferredRights: [],
      },
      {
        productKey: PDF_B,
        carrier: 'DIGITAL',
        expressions: [
          {
            path: `${DD(4)}/EpubLicense[1]/EpubLicenseExpression[1]`,
            type: '01',
            role: 'INTRINSIC',
            identity: 'CC_BY_NC_4_0',
            link: CC_BY_NC,
          },
          {
            path: `${DATED_LICENCE}/EpubLicenseExpression[1]`,
            type: '02',
            role: 'INTRINSIC',
            identity: 'CC_BY_NC_4_0',
            link: 'https://creativecommons.org/licenses/by-nc/4.0/legalcode.en',
          },
        ],
        // Two composites naming one supported licence corroborate it (rule 31); one of them is dated.
        licence: { kind: 'SUPPORTED', identity: 'CC_BY_NC_4_0', url: CC_BY_NC },
        dated: true,
        // No protection stated is unknown, never "none" (rule 47).
        technicalProtection: [],
        technicalProtectionState: 'UNKNOWN',
        usageConstraints: [{ path: COPY_PASTE, type: '03', status: '02', limits: [{ quantity: '10', unit: '05' }] }],
        deferredRights: [],
      },
    ],
    groups: [
      {
        groupKey: WORK_A,
        licence: {
          kind: 'SET_SUPPORTED_LICENSE',
          identity: 'CC_BY_4_0',
          url: CC_BY,
          productKeys: [PDF_A, EPUB_A],
          paths: [
            `${DD(1)}/EpubLicense[1]/EpubLicenseExpression[1]`,
            `${DD(2)}/EpubLicense[1]/EpubLicenseExpression[1]`,
          ],
        },
      },
      { groupKey: WORK_B, licence: { kind: 'BLOCKED', findingKeys: [DATED_KEY, COPY_PASTE_KEY] } },
    ],
    licenceActions: [
      { groupKey: WORK_A, action: { kind: 'SET_SUPPORTED_LICENSE', identity: 'CC_BY_4_0', url: CC_BY } },
      // Acknowledging what keeps a licence from being set omits it; nothing else is written (rule 34; #217 47-50).
      {
        groupKey: WORK_B,
        action: decided
          ? { kind: 'OMIT_WITH_ACKNOWLEDGED_LOSS', findingKeys: [DATED_KEY, COPY_PASTE_KEY] }
          : { kind: 'BLOCKED' },
      },
    ],
    acknowledgedFindingKeys: decided ? ACKNOWLEDGED : [],
  },
  accessibility: {
    products: [
      noFeatures(PDF_A, Pdf, 'DIGITAL'),
      noFeatures(EPUB_A, Epub, 'DIGITAL'),
      noFeatures(PAPERBACK_A, Paperback, 'PHYSICAL'),
      noFeatures(PDF_B, Pdf, 'DIGITAL'),
    ],
    contacts: [],
    actions: [created(PDF_A, Pdf), created(EPUB_A, Epub), created(PAPERBACK_A, Paperback), created(PDF_B, Pdf)],
  },
  components: [],
  relatedMaterial: {
    outcomes: [
      workIdentity(1, PDF_A),
      workIdentity(2, EPUB_A),
      workIdentity(3, PAPERBACK_A),
      // Both Works are settled new Works of this file, so the generic part relation projects with no question (A2.B).
      {
        declarationKey: `${PDF_B}|${PART_OF}`,
        path: PART_OF.slice(0, -'/ProductRelationCode[1]'.length),
        productKey: PDF_B,
        construct: 'RELATED_PRODUCT',
        code: '02',
        outcome: 'PLANNED',
        endpoint: { kind: 'PLANNED_WORK', groupKey: WORK_A },
        relationType: 'IS_PART_OF',
        edgeKey: PART_EDGE,
      },
      {
        declarationKey: `${PDF_B}|${CITATION}/ProductRelationCode[1]`,
        path: CITATION,
        productKey: PDF_B,
        construct: 'RELATED_PRODUCT',
        code: '34',
        outcome: 'CITATION',
        endpoint: null,
        relationType: null,
        edgeKey: null,
      },
    ],
    // One declaration, so its own Work is the relator (rule 28).
    edges: [
      {
        edgeKey: PART_EDGE,
        relator: { kind: 'PLANNED_WORK', groupKey: WORK_B },
        related: { kind: 'PLANNED_WORK', groupKey: WORK_A },
        relationType: 'IS_PART_OF',
        basis: 'GENERIC_PRODUCT_RELATION',
        declarationKeys: [`${PDF_B}|${PART_OF}`],
        ordinal: { status: 'ASSIGNED', ordinal: 1, after: 0 },
        state: 'PLANNED',
      },
    ],
    productReferences: [
      ...[PDF_A, EPUB_A, PAPERBACK_A].map((productKey) => ({ productKey, asserted: false, references: [] })),
      {
        productKey: PDF_B,
        asserted: true,
        references: [
          {
            referenceOrdinal: 1,
            doi: 'https://doi.org/10.5555/cited.0101',
            unstructuredCitation: null,
            isbn: null,
            issn: null,
            paths: [CITATION],
          },
        ],
      },
    ],
    // A Work's References are its own Product's sequence, created with the Work; none asserted is absent evidence.
    referenceActions: [
      { groupKey: WORK_A, action: { kind: 'NONE' } },
      { groupKey: WORK_B, action: { kind: 'CREATE', productKey: PDF_B, referenceOrdinals: [1] } },
    ],
  },
  collateral: {
    textContents: [],
    resources: [],
    candidates: [],
    actions: [collateralAction(WORK_A), collateralAction(WORK_B)],
  },
  reviewsPrizes: {
    citedContents: [],
    prizes: [],
    candidates: [emptyCandidates(WORK_A), emptyCandidates(WORK_B)],
    actions: [reviewsAction(WORK_A), reviewsAction(WORK_B)],
  },
  plan: decided
    ? {
        works: [
          // Only SET_SUPPORTED_LICENSE writes a licence (rules 137-138) ...
          plannedWork(CC_BY, [
            publication(Pdf, '9781800009011'),
            publication(Epub, '9781800009028'),
            publication(Paperback, '9781800009035'),
          ]),
          // ... an acknowledged omission writes none.
          {
            ...plannedWork('', [publication(Pdf, '9781800009042')]),
            // Unstated fields are the Reference entity's empty values, which its mapper sends as null.
            references: [
              {
                orderNumber: 1,
                doi: 'https://doi.org/10.5555/cited.0101',
                unstructuredCitation: '',
                isbn: '',
                issn: '',
              },
            ],
          },
        ],
        containedWorks: [],
        series: [],
        // The second planned Work is part of the first, with its normalised ordinal (#187: its relator's unit creates it).
        relations: [
          {
            relator: { kind: 'PLANNED_WORK', list: 'works', index: 1 },
            related: { kind: 'PLANNED_WORK', list: 'works', index: 0 },
            relationType: 'IS_PART_OF',
            relationOrdinal: 1,
            status: 'PLANNED',
          },
        ],
      }
    : { works: [], containedWorks: [], series: [], relations: [] },
});

const blocker = (
  code: string,
  classification: 'TARGET_INPUT_REQUIRED' | 'TARGET_UNREPRESENTABLE',
  record: number,
  productKey: string,
  groupKey: string,
) => ({ code, classification, recordKey: `record:${record}`, productKey, groupKey });

const workTypeBlocker = (groupKey: string) => ({
  code: 'WORK_TYPE_INPUT_REQUIRED',
  classification: 'TARGET_INPUT_REQUIRED' as const,
  recordKey: null,
  productKey: null,
  groupKey,
});

const workEntry = (title: string, doi: string, publications: { type: string; isbn: string }[]) => ({
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

const planning = (decided: boolean): OnixPlanningExpectation => ({
  executable: decided,
  records: RECORDS,
  products: products(decided),
  workGroups: [
    {
      groupKey: WORK_A,
      productKeys: [PDF_A, EPUB_A, PAPERBACK_A],
      target: 'NEW_WORK',
      workType: decided
        ? { status: 'RESOLVED', type: Monograph, provenance: 'USER_FILE_DEFAULT' }
        : { status: 'UNRESOLVED' },
      edition: { status: 'RESOLVED', edition: 1, basis: 'DEFAULT_FIRST_EDITION' },
      workDoi: { kind: 'DOI', doi: DOI_A, basis: 'WORK_IDENTIFIER' },
      executable: decided,
    },
    {
      groupKey: WORK_B,
      productKeys: [PDF_B],
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
        workTypeBlocker(WORK_A),
        blocker('RIGHTS_ACKNOWLEDGEMENT_REQUIRED', 'TARGET_UNREPRESENTABLE', 1, PDF_A, WORK_A),
        blocker('RIGHTS_ACKNOWLEDGEMENT_REQUIRED', 'TARGET_UNREPRESENTABLE', 2, EPUB_A, WORK_A),
        workTypeBlocker(WORK_B),
        blocker('RIGHTS_ACKNOWLEDGEMENT_REQUIRED', 'TARGET_INPUT_REQUIRED', 4, PDF_B, WORK_B),
        blocker('RIGHTS_ACKNOWLEDGEMENT_REQUIRED', 'TARGET_UNREPRESENTABLE', 4, PDF_B, WORK_B),
      ],
  findings: findings(decided),
  works: decided
    ? [
        workEntry('Open Licences in Practice', DOI_A, [
          { type: 'PDF', isbn: '9781800009011' },
          { type: 'EPUB', isbn: '9781800009028' },
          { type: 'PAPERBACK', isbn: '9781800009035' },
        ]),
        workEntry('Restricted Reuse', '', [{ type: 'PDF', isbn: '9781800009042' }]),
      ]
    : [],
  chapters: [],
  target: target(decided),
});

export default defineOnixRegressionFixture({
  id: 'target-licence-usage-protection',
  status: 'CONTRACT',
  purpose:
    'Proves the licence candidates, expression roles, usage-constraint and technical-protection states of two Works, ' +
    'and their licence actions: a supported CC BY 4.0 set once its acknowledgeable losses are acknowledged, and a ' +
    'dated, restricted CC BY-NC 4.0 omitted only by acknowledgement - never set, never inferred, never inherited ' +
    'across the planned part relation between the two Works.',
  source: {
    origin: 'SYNTHETIC',
    provenance:
      'Written for thoth-app#249. Every name, identifier and URL is invented except the Creative Commons licence URLs, ' +
      'whose identity is what the fixture is about; the ISBNs carry valid check characters and the Work DOI uses the ' +
      '10.5555 test prefix. The canonical source gate admits it with no finding.',
    sha256: '7a2b35252c123b7d4350ee47ca78318be6aea9de8140b3ae4f4a2a1b1e5c2cba',
  },
  defects: [],
  asOf: '2026-10-02T12:00:00.000Z',
  imprints: [{ label: 'Regression Press', value: '11111111-1111-4111-8111-111111111111' }],
  gate: {
    verdict: 'PERMITTED',
    release: '3.1',
    flavour: 'reference',
    findings: [],
    recoveries: [],
    provenance: { kind: 'IDENTITY', flavour: 'reference' },
  },
  normalized: {
    '/onix:ONIXMessage/onix:Product/onix:DescriptiveDetail/onix:EpubLicense/onix:EpubLicenseExpression/onix:EpubLicenseExpressionType':
      ['01', '03', '10', '01', '01', '02'],
    '/onix:ONIXMessage/onix:Product/onix:DescriptiveDetail/onix:EpubTechnicalProtection': ['00', '02'],
    '/onix:ONIXMessage/onix:Product/onix:DescriptiveDetail/onix:EpubUsageConstraint/onix:EpubUsageType': [
      '01',
      '02',
      '03',
    ],
    '/onix:ONIXMessage/onix:Product/onix:DescriptiveDetail/onix:EpubLicense/onix:EpubLicenseDate/onix:EpubLicenseDateRole':
      ['14'],
  },
  scenarios: [
    {
      name: 'as uploaded, before any publisher decision',
      target: 'EMPTY_PUBLISHER',
      planning: planning(false),
      outcomes: {
        SUPPORTED_LOSSLESS: 1,
        SUPPORTED_NORMALIZED: 4,
        TARGET_UNREPRESENTABLE: 9,
        TARGET_INPUT_REQUIRED: 4,
      },
    },
    {
      name: 'publisher takes MONOGRAPH and acknowledges every rights loss',
      target: 'EMPTY_PUBLISHER',
      inputs: {
        fileWorkType: Monograph,
        rightsChoices: Object.fromEntries(ACKNOWLEDGED.map((findingKey) => [findingKey, 'ACKNOWLEDGED'])),
      },
      planning: planning(true),
      outcomes: {
        SUPPORTED_LOSSLESS: 1,
        SUPPORTED_NORMALIZED: 4,
        TARGET_UNREPRESENTABLE: 6,
        TARGET_INPUT_REQUIRED: 1,
      },
    },
  ],
});
