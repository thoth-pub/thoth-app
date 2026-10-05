import { PublicationType } from '@/src/shared/constants/publications';
import { WorkTypes } from '@/src/shared/constants/work';

import { defineOnixRegressionFixture } from '../../fixtureSources';
import type {
  OnixPlanFindingEntry,
  OnixPlanningExpectation,
  OnixRecordEntry,
  OnixTargetLedger,
  OnixTargetRelatedMaterialEntry,
} from '../../types';

const { Pdf } = PublicationType.enum;
const { Monograph } = WorkTypes.enum;

/**
 * Three Works whose Products relate to one another and to things outside the file (thoth-app#249):
 *
 * - A and B are one translation, stated from both sides (49 and 29) and again as another-language version (11): one
 *   edge, the redundant version disclosed.
 * - A has C as a part, stated from both sides (01 and 02): one edge, projected automatically between settled Works.
 * - B replaces C and C replaces B (03 both ways): a contradiction no answer can resolve, so the plan never executes.
 * - A also states an LRM workaround (98), a citing work (35), a replacement nobody holds (05), and four citations (34):
 *   a DOI, a DOI with an ISBN-10, the first DOI repeated, and a bare ISBN.
 *
 * Contract authority: ONIX-AUDIT-RELATED-MATERIAL-01 `5541586341` (approved `5541683453`) rules 7-20, 22-33, 42-47;
 * ONIX-AUDIT-PRODUCT-IDENTITY-01 `5545771626` rules 43-47; #224 specification, Amendment 1 `5798149019`, Amendment 2
 * `5812546990` (A: acknowledgement only for unresolved/unauthorized endpoints; B: generic product relations between
 * settled Works), Correction Implementation Authorization 1 `5830576803`; #187 `5938391709` section 4.
 */

const A_PRODUCT = 'product:gtin13:9781800007017';
const B_PRODUCT = 'product:gtin13:9781800007024';
const C_PRODUCT = 'product:gtin13:9781800007031';
const WORK_A = `work:${A_PRODUCT}`;
const WORK_B = `work:${B_PRODUCT}`;
const WORK_C = `work:${C_PRODUCT}`;
const PRODUCTS = [A_PRODUCT, B_PRODUCT, C_PRODUCT];

const RM = (product: number) => `/ONIXMessage[1]/Product[${product}]/RelatedMaterial[1]`;
const RW = (product: number, n: number) => `${RM(product)}/RelatedWork[${n}]`;
const RP = (product: number, n: number) => `${RM(product)}/RelatedProduct[${n}]`;
const declaration = (productKey: string, path: string) =>
  `${productKey}|${path}/${path.includes('RelatedWork') ? 'WorkRelationCode' : 'ProductRelationCode'}[1]`;

const AB = `group:${WORK_A}↔group:${WORK_B}`;
const AC = `group:${WORK_A}↔group:${WORK_C}`;
const BC = `group:${WORK_B}↔group:${WORK_C}`;
const TRANSLATION_EDGE = `EDGE|${AB}|HAS_TRANSLATION`;
const PART_EDGE = `EDGE|${AC}|HAS_PART`;

const UNRESOLVED_KEY = `RELATION|RELATION_TARGET_UNRESOLVED|${A_PRODUCT}|${RP(1, 7)}/ProductRelationCode[1]|5opamozuma`;
const BARE_ISBN_KEY = `REFERENCE|REFERENCE_UNREPRESENTABLE|${A_PRODUCT}|${RP(1, 5)}|13iu9tqv1xf`;

const RECORDS: OnixRecordEntry[] = PRODUCTS.map((productKey, index) => ({
  index: index + 1,
  recordReference: `regression-press.${productKey.slice('product:gtin13:'.length)}`,
  disposition: 'COMPLETE',
  productKey,
  action: 'PLANNED',
}));

const finding = (
  family: 'RELATION' | 'REFERENCE',
  code: string,
  classification: OnixPlanFindingEntry['classification'],
  productKey: string | null,
  groupKey: string,
  resolution: OnixPlanFindingEntry['resolution'] = 'NONE',
  answer: 'UNANSWERED' | 'ANSWERED' | 'NOT_APPLICABLE' = 'NOT_APPLICABLE',
  blocking = resolution !== 'NONE',
): OnixPlanFindingEntry => ({ family, code, classification, blocking, resolution, answer, productKey, groupKey });

const findings = (decided: boolean): OnixPlanFindingEntry[] => {
  const answer = decided ? 'ANSWERED' : 'UNANSWERED';

  return [
    // LRM workarounds and citing works are never Thoth relations, and never reversed into one (rules 12, 15).
    finding('RELATION', 'RELATION_LRM_UNREPRESENTABLE', 'TARGET_UNREPRESENTABLE', A_PRODUCT, WORK_A),
    finding('RELATION', 'RELATION_CITED_BY_UNREPRESENTABLE', 'TARGET_UNREPRESENTABLE', A_PRODUCT, WORK_A),
    // A replacement nobody holds - in this file or, for the empty publisher, in Thoth - is omitted only by
    // acknowledgement (rules 22-26; Amendment 2 A).
    finding(
      'RELATION',
      'RELATION_TARGET_UNRESOLVED',
      'TARGET_INPUT_REQUIRED',
      A_PRODUCT,
      WORK_A,
      'ACKNOWLEDGE',
      answer,
    ),
    // An another-language version beside a stated translation of the same pair adds nothing (rule 19).
    finding('RELATION', 'RELATION_OTHER_LANGUAGE_REDUNDANT', 'SUPPORTED_NORMALIZED', B_PRODUCT, WORK_B),
    // A relation and its inverse agree once oriented: one edge each (rules 27-28).
    finding('RELATION', 'RELATION_DECLARATIONS_RECONCILED', 'SUPPORTED_NORMALIZED', null, WORK_A),
    finding('RELATION', 'RELATION_DECLARATIONS_RECONCILED', 'SUPPORTED_NORMALIZED', null, WORK_A),
    // B replaces C and C replaces B: never resolved by order or by answer (rule 29; Amendment 2 A).
    finding(
      'RELATION',
      'RELATION_INVERSE_CONTRADICTION',
      'SOURCE_CONFLICT',
      null,
      WORK_B,
      'NONE',
      'NOT_APPLICABLE',
      true,
    ),
    // Planned relation ordinals are a target normalisation of source order within each type (rules 37-41).
    finding('RELATION', 'RELATION_ORDINAL_NORMALISED', 'SUPPORTED_NORMALIZED', A_PRODUCT, WORK_A),
    finding('RELATION', 'RELATION_ORDINAL_NORMALISED', 'SUPPORTED_NORMALIZED', A_PRODUCT, WORK_A),
    // An ISBN-10 is held as its ISBN-13 (rule 45).
    finding('REFERENCE', 'REFERENCE_IDENTIFIER_NORMALISED', 'SUPPORTED_NORMALIZED', A_PRODUCT, WORK_A),
    // A bare ISBN is no Reference Thoth can hold: an acknowledged loss (Amendment 1).
    finding(
      'REFERENCE',
      'REFERENCE_UNREPRESENTABLE',
      'TARGET_UNREPRESENTABLE',
      A_PRODUCT,
      WORK_A,
      'ACKNOWLEDGE',
      answer,
    ),
    // The same citation stated twice alike is kept once, at its first ordinal (rule 43).
    finding('REFERENCE', 'REFERENCE_DUPLICATE_NORMALISED', 'SUPPORTED_NORMALIZED', A_PRODUCT, WORK_A),
  ];
};

const withCodes = (path: string, element: 'WorkRelationCode' | 'ProductRelationCode', identifier = 1) => [
  `${path}/${element}[1]`,
  `${path}/${element === 'WorkRelationCode' ? 'WorkIdentifier' : 'ProductIdentifier'}[${identifier}]`,
];

const planned = (groupKey: string) => ({ kind: 'PLANNED_WORK' as const, groupKey });

type Outcome = OnixTargetRelatedMaterialEntry['outcomes'][number];

const outcome = (
  productKey: string,
  path: string,
  code: string,
  kind: Outcome['outcome'],
  endpoint: string | null = null,
  relationType: Outcome['relationType'] = null,
  edgeKey: string | null = null,
): Outcome => ({
  declarationKey: declaration(productKey, path),
  path,
  productKey,
  construct: path.includes('RelatedWork') ? 'RELATED_WORK' : 'RELATED_PRODUCT',
  code,
  outcome: kind,
  endpoint: endpoint === null ? null : planned(endpoint),
  relationType,
  edgeKey,
});

const relatedMaterial = (decided: boolean): OnixTargetRelatedMaterialEntry => ({
  outcomes: [
    outcome(A_PRODUCT, RW(1, 1), '01', 'WORK_IDENTITY'),
    outcome(A_PRODUCT, RW(1, 2), '49', 'PLANNED', WORK_B, 'HAS_TRANSLATION', TRANSLATION_EDGE),
    outcome(A_PRODUCT, RW(1, 3), '98', 'UNREPRESENTABLE'),
    outcome(A_PRODUCT, RP(1, 1), '01', 'PLANNED', WORK_C, 'HAS_PART', PART_EDGE),
    outcome(A_PRODUCT, RP(1, 2), '34', 'CITATION'),
    outcome(A_PRODUCT, RP(1, 3), '34', 'CITATION'),
    outcome(A_PRODUCT, RP(1, 4), '34', 'CITATION'),
    outcome(A_PRODUCT, RP(1, 5), '34', 'CITATION'),
    outcome(A_PRODUCT, RP(1, 6), '35', 'UNREPRESENTABLE'),
    // With no endpoint there is no Work relation to state, so none is recorded (no edge; rules 22-26).
    outcome(A_PRODUCT, RP(1, 7), '05', decided ? 'OMITTED' : 'UNRESOLVED'),
    outcome(B_PRODUCT, RW(2, 1), '01', 'WORK_IDENTITY'),
    outcome(B_PRODUCT, RW(2, 2), '29', 'PLANNED', WORK_A, 'IS_TRANSLATION_OF', TRANSLATION_EDGE),
    outcome(B_PRODUCT, RP(2, 1), '11', 'REDUNDANT', WORK_A),
    outcome(B_PRODUCT, RP(2, 2), '03', 'CONFLICT', WORK_C, 'REPLACES'),
    outcome(C_PRODUCT, RW(3, 1), '01', 'WORK_IDENTITY'),
    outcome(C_PRODUCT, RP(3, 1), '02', 'PLANNED', WORK_A, 'IS_PART_OF', PART_EDGE),
    outcome(C_PRODUCT, RP(3, 2), '03', 'CONFLICT', WORK_B, 'REPLACES'),
  ],
  // The relator is the first declaration's own Work, in file order (rule 28; Correction 1).
  edges: [
    {
      edgeKey: TRANSLATION_EDGE,
      relator: planned(WORK_A),
      related: planned(WORK_B),
      relationType: 'HAS_TRANSLATION',
      basis: 'RELATED_WORK_TRANSLATION',
      declarationKeys: [declaration(A_PRODUCT, RW(1, 2)), declaration(B_PRODUCT, RW(2, 2))],
      ordinal: { status: 'ASSIGNED', ordinal: 1, after: 0 },
      state: 'PLANNED',
    },
    {
      edgeKey: PART_EDGE,
      relator: planned(WORK_A),
      related: planned(WORK_C),
      relationType: 'HAS_PART',
      basis: 'GENERIC_PRODUCT_RELATION',
      declarationKeys: [declaration(A_PRODUCT, RP(1, 1)), declaration(C_PRODUCT, RP(3, 1))],
      ordinal: { status: 'ASSIGNED', ordinal: 1, after: 0 },
      state: 'PLANNED',
    },
  ],
  // Only RelatedProduct/34 is ever a Reference (rule 42); ordinals keep their source position (rule 43; D-B8).
  productReferences: [
    {
      productKey: A_PRODUCT,
      asserted: true,
      references: [
        {
          referenceOrdinal: 1,
          doi: 'https://doi.org/10.5555/cited.0001',
          unstructuredCitation: null,
          isbn: null,
          issn: null,
          paths: [RP(1, 2)],
        },
        {
          referenceOrdinal: 2,
          doi: 'https://doi.org/10.5555/cited.0002',
          unstructuredCitation: null,
          isbn: '9780306406157',
          issn: null,
          paths: [RP(1, 3)],
        },
      ],
    },
    { productKey: B_PRODUCT, asserted: false, references: [] },
    { productKey: C_PRODUCT, asserted: false, references: [] },
  ],
  referenceActions: [
    {
      groupKey: WORK_A,
      action: decided ? { kind: 'CREATE', productKey: A_PRODUCT, referenceOrdinals: [1, 2] } : { kind: 'BLOCKED' },
    },
    { groupKey: WORK_B, action: { kind: 'NONE' } },
    { groupKey: WORK_C, action: { kind: 'NONE' } },
  ],
});

const empty = (groupKey: string) => ({
  descriptive: {
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
  },
  collateral: {
    groupKey,
    productKey: null,
    componentPath: null,
    target: 'WORK' as const,
    action: 'PLANNED' as const,
    abstracts: [],
    tableOfContents: null,
    generalNote: null,
    resources: [],
  },
  candidates: {
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
  },
  reviews: {
    groupKey,
    productKey: null,
    componentPath: null,
    target: 'WORK' as const,
    action: 'PLANNED' as const,
    bookReviews: [],
    endorsements: [],
    awards: [],
  },
});

const WORKS = [WORK_A, WORK_B, WORK_C];

const target = (decided: boolean): OnixTargetLedger => ({
  findings: [
    {
      family: 'RELATION',
      code: 'RELATION_LRM_UNREPRESENTABLE',
      key: `RELATION|RELATION_LRM_UNREPRESENTABLE|${A_PRODUCT}|${RW(1, 3)}/WorkRelationCode[1]|1u5zv2nljr6`,
      paths: withCodes(RW(1, 3), 'WorkRelationCode'),
    },
    {
      family: 'RELATION',
      code: 'RELATION_CITED_BY_UNREPRESENTABLE',
      key: `RELATION|RELATION_CITED_BY_UNREPRESENTABLE|${A_PRODUCT}|${RP(1, 6)}/ProductRelationCode[1]|smbxwmmkja`,
      paths: withCodes(RP(1, 6), 'ProductRelationCode'),
    },
    {
      family: 'RELATION',
      code: 'RELATION_TARGET_UNRESOLVED',
      key: UNRESOLVED_KEY,
      paths: withCodes(RP(1, 7), 'ProductRelationCode'),
    },
    {
      family: 'RELATION',
      code: 'RELATION_OTHER_LANGUAGE_REDUNDANT',
      key: `RELATION|RELATION_OTHER_LANGUAGE_REDUNDANT|${B_PRODUCT}|${RP(2, 1)}/ProductRelationCode[1]|quxm8ee9iy|group:${WORK_A}`,
      paths: withCodes(RP(2, 1), 'ProductRelationCode'),
    },
    {
      family: 'RELATION',
      code: 'RELATION_DECLARATIONS_RECONCILED',
      key:
        `RELATION|RELATION_DECLARATIONS_RECONCILED|${WORK_A}|${AB}|` +
        `${declaration(A_PRODUCT, RW(1, 2))}#45lukj7u4u,${declaration(B_PRODUCT, RW(2, 2))}#uk3vro5wjm`,
      paths: [...withCodes(RW(1, 2), 'WorkRelationCode'), ...withCodes(RW(2, 2), 'WorkRelationCode')],
    },
    {
      family: 'RELATION',
      code: 'RELATION_DECLARATIONS_RECONCILED',
      key:
        `RELATION|RELATION_DECLARATIONS_RECONCILED|${WORK_A}|${AC}|` +
        `${declaration(A_PRODUCT, RP(1, 1))}#20bxagpl48o,${declaration(C_PRODUCT, RP(3, 1))}#1n2tk3tvzpd`,
      paths: [...withCodes(RP(1, 1), 'ProductRelationCode'), ...withCodes(RP(3, 1), 'ProductRelationCode')],
    },
    {
      family: 'RELATION',
      code: 'RELATION_INVERSE_CONTRADICTION',
      key:
        `RELATION|RELATION_INVERSE_CONTRADICTION|${WORK_B}|${BC}|` +
        `${declaration(B_PRODUCT, RP(2, 2))}#ctv2tdczl8,${declaration(C_PRODUCT, RP(3, 2))}#1ribpnkork2`,
      paths: [...withCodes(RP(2, 2), 'ProductRelationCode'), ...withCodes(RP(3, 2), 'ProductRelationCode')],
    },
    {
      family: 'RELATION',
      code: 'RELATION_ORDINAL_NORMALISED',
      key: `RELATION|RELATION_ORDINAL_NORMALISED|${A_PRODUCT}|${TRANSLATION_EDGE}|1`,
      paths: [`${RW(1, 2)}/WorkRelationCode[1]`],
    },
    {
      family: 'RELATION',
      code: 'RELATION_ORDINAL_NORMALISED',
      key: `RELATION|RELATION_ORDINAL_NORMALISED|${A_PRODUCT}|${PART_EDGE}|1`,
      paths: [`${RP(1, 1)}/ProductRelationCode[1]`],
    },
    {
      family: 'REFERENCE',
      code: 'REFERENCE_IDENTIFIER_NORMALISED',
      key: `REFERENCE|REFERENCE_IDENTIFIER_NORMALISED|${A_PRODUCT}|${RP(1, 3)}|1p52lr9zazi|${RP(1, 3)}/ProductIdentifier[2]`,
      paths: [`${RP(1, 3)}/ProductIdentifier[2]`],
    },
    { family: 'REFERENCE', code: 'REFERENCE_UNREPRESENTABLE', key: BARE_ISBN_KEY, paths: [RP(1, 5)] },
    {
      family: 'REFERENCE',
      code: 'REFERENCE_DUPLICATE_NORMALISED',
      key: `REFERENCE|REFERENCE_DUPLICATE_NORMALISED|${A_PRODUCT}|${RP(1, 4)}|1e5hzcziigu|${RP(1, 2)}`,
      paths: [RP(1, 4), RP(1, 2)],
    },
  ],
  // Each Product names its own Work (RelatedWork 01); none shares an alias, so each Work stands alone.
  identity: {
    compatibility: { headerMatches: false, ignoredNativeRecordKeys: [], activation: 'NOT_APPLICABLE' },
    groups: WORKS.map((groupKey) => ({
      groupKey,
      compatibility: 'GENERIC' as const,
      thothVerification: 'NOT_APPLICABLE' as const,
      edges: [],
      evidence: [{ kind: 'NO_TARGET_MATCH' as const }],
    })),
    products: PRODUCTS.map((productKey, index) => ({
      productKey,
      recordKeys: [`record:${index + 1}`],
      evidence: [{ kind: 'NO_TARGET_MATCH' }],
      omittable: false,
    })),
  },
  descriptive: WORKS.map((groupKey) => empty(groupKey).descriptive),
  commercial: PRODUCTS.map((productKey) => ({
    productKey,
    supplies: [],
    prices: [],
    carriers: { DIGITAL: { kind: 'NONE' as const } },
    plannedLocations: [],
  })),
  priceResolutions: [],
  rights: {
    products: PRODUCTS.map((productKey) => ({
      productKey,
      carrier: 'DIGITAL' as const,
      expressions: [],
      licence: { kind: 'SILENT' as const },
      dated: false,
      technicalProtection: [],
      technicalProtectionState: 'UNKNOWN' as const,
      usageConstraints: [],
      deferredRights: [],
    })),
    groups: WORKS.map((groupKey) => ({ groupKey, licence: { kind: 'UNSET' as const } })),
    licenceActions: WORKS.map((groupKey) => ({ groupKey, action: { kind: 'UNSET' as const } })),
    acknowledgedFindingKeys: [],
  },
  accessibility: {
    products: PRODUCTS.map((productKey) => ({
      productKey,
      features: [],
      primaryStandards: [],
      additionalStandards: [],
      exceptions: [],
      reportUrls: [],
      publications: [
        {
          publicationType: Pdf,
          scope: 'DIGITAL' as const,
          additionalStandards: [],
          incompatibleAdditionalStandards: [],
        },
      ],
    })),
    contacts: [],
    actions: PRODUCTS.map((productKey) => ({
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
    })),
  },
  components: [],
  relatedMaterial: relatedMaterial(decided),
  collateral: {
    textContents: [],
    resources: [],
    candidates: [],
    actions: WORKS.map((groupKey) => empty(groupKey).collateral),
  },
  reviewsPrizes: {
    citedContents: [],
    prizes: [],
    candidates: WORKS.map((groupKey) => empty(groupKey).candidates),
    actions: WORKS.map((groupKey) => empty(groupKey).reviews),
  },
  // The contradiction holds the whole plan: nothing is executable, so nothing is written (rule 33).
  plan: { works: [], containedWorks: [], series: [], relations: [] },
});

const blocker = (
  code: string,
  classification: 'TARGET_INPUT_REQUIRED' | 'TARGET_UNREPRESENTABLE' | 'SOURCE_CONFLICT',
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

const CONTRADICTION = blocker('RELATION_SOURCE_CONFLICT', 'SOURCE_CONFLICT', 2, null, WORK_B);

const planning = (decided: boolean): OnixPlanningExpectation => ({
  executable: false,
  records: RECORDS,
  // Once answered, A and C are executable; B, which states the contradiction's first side, never is.
  products: PRODUCTS.map((productKey, index) => ({
    productKey,
    groupKey: WORKS[index],
    isbn: productKey.slice('product:gtin13:'.length),
    manifestation: {
      kind: 'RESOLVED',
      type: Pdf,
      classification: 'SUPPORTED_NORMALIZED',
      notes: [{ code: 'DELIVERY_MODE_NOT_REPRESENTED', detail: 'EB' }],
    },
    publicationType: Pdf,
    action: 'CREATE_PUBLICATION',
    executable: decided && productKey !== B_PRODUCT,
  })),
  workGroups: WORKS.map((groupKey, index) => ({
    groupKey,
    productKeys: [PRODUCTS[index]],
    target: 'NEW_WORK',
    workType: decided
      ? { status: 'RESOLVED', type: Monograph, provenance: 'USER_FILE_DEFAULT' }
      : { status: 'UNRESOLVED' },
    edition: { status: 'RESOLVED', edition: 1, basis: 'DEFAULT_FIRST_EDITION' },
    workDoi: { kind: 'DOI', doi: `https://doi.org/10.5555/regression.d107${'abc'[index]}`, basis: 'WORK_IDENTIFIER' },
    executable: decided && groupKey !== WORK_B,
  })),
  blockers: decided
    ? [CONTRADICTION]
    : [
        workTypeBlocker(WORK_A),
        workTypeBlocker(WORK_B),
        workTypeBlocker(WORK_C),
        blocker('RELATION_ACKNOWLEDGEMENT_REQUIRED', 'TARGET_INPUT_REQUIRED', 1, A_PRODUCT, WORK_A),
        CONTRADICTION,
        blocker('REFERENCE_ACKNOWLEDGEMENT_REQUIRED', 'TARGET_UNREPRESENTABLE', 1, A_PRODUCT, WORK_A),
      ],
  findings: findings(decided),
  works: [],
  chapters: [],
  target: target(decided),
});

const isbn10Notices = [
  {
    id: '_20171212_d_17',
    tier: 'STRICT' as const,
    scope: 'VALIDITY' as const,
    class: 'ADVISORY' as const,
    blocking: false,
    projection: 'AUTHORITATIVE' as const,
    recoverability: 'NOT_RECOVERABLE' as const,
    counts: false,
    path: RP(1, 3),
  },
  {
    id: '_20180202_d_41',
    tier: 'SCHEMATRON' as const,
    scope: 'VALIDITY' as const,
    class: 'DEPRECATED_OR_INFORMATIONAL' as const,
    blocking: false,
    projection: 'AUTHORITATIVE' as const,
    recoverability: 'NOT_RECOVERABLE' as const,
    counts: false,
    path: `${RP(1, 3)}/ProductIdentifier[2]/ProductIDType[1]`,
  },
];

export default defineOnixRegressionFixture({
  id: 'target-related-material',
  status: 'CONTRACT',
  purpose:
    'Proves what each RelatedWork and RelatedProduct declaration comes to: inverse declarations reconciled into one ' +
    'translation edge and one part edge, a redundant other-language version, losses, an unresolved endpoint omitted by ' +
    'acknowledgement, an unanswerable inverse contradiction holding the plan, and the References RelatedProduct/34 ' +
    'plans - normalised, de-duplicated and refused - never from anything else.',
  source: {
    origin: 'SYNTHETIC',
    provenance:
      'Written for thoth-app#249. Every name, identifier and DOI is invented (10.5555 is the test prefix); the ISBNs ' +
      'carry valid check characters, and 9780000000002 names a Product no Thoth publisher holds. The canonical source ' +
      'gate admits it; its only findings are the non-counting notices that ISBN-10 identifiers are deprecated.',
    sha256: 'de4edc9e5cd189ebd7a4bb97b316acbe738c38f6a1c7a4b9511704eb3220b9fe',
  },
  defects: [],
  asOf: '2026-10-02T12:00:00.000Z',
  imprints: [{ label: 'Regression Press', value: '11111111-1111-4111-8111-111111111111' }],
  gate: {
    verdict: 'PERMITTED',
    release: '3.1',
    flavour: 'reference',
    findings: isbn10Notices,
    recoveries: [],
    provenance: { kind: 'IDENTITY', flavour: 'reference' },
  },
  normalized: {
    '/onix:ONIXMessage/onix:Product/onix:RelatedMaterial/onix:RelatedWork/onix:WorkRelationCode': [
      '01',
      '49',
      '98',
      '01',
      '29',
      '01',
    ],
    '/onix:ONIXMessage/onix:Product/onix:RelatedMaterial/onix:RelatedProduct/onix:ProductRelationCode': [
      '01',
      '34',
      '34',
      '34',
      '34',
      '35',
      '05',
      '11',
      '03',
      '02',
      '03',
    ],
  },
  scenarios: [
    {
      name: 'as uploaded, before any publisher decision',
      target: 'EMPTY_PUBLISHER',
      planning: planning(false),
      outcomes: {
        SUPPORTED_NORMALIZED: 10,
        TARGET_UNREPRESENTABLE: 4,
        TARGET_INPUT_REQUIRED: 5,
        SOURCE_CONFLICT: 2,
      },
    },
    {
      name: 'publisher takes MONOGRAPH and acknowledges both losses; the contradiction still holds the plan',
      target: 'EMPTY_PUBLISHER',
      inputs: {
        fileWorkType: Monograph,
        relatedMaterialChoices: { [UNRESOLVED_KEY]: 'ACKNOWLEDGED', [BARE_ISBN_KEY]: 'ACKNOWLEDGED' },
      },
      planning: planning(true),
      outcomes: {
        SUPPORTED_NORMALIZED: 10,
        TARGET_UNREPRESENTABLE: 3,
        TARGET_INPUT_REQUIRED: 1,
        SOURCE_CONFLICT: 2,
      },
    },
  ],
});
