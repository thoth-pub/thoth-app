import type { PublicationType as PublicationTypeValue } from '@/src/entities/publication/model/publication.types';
import { AccessibilityExceptions, AccessibilityStandards } from '@/src/shared/constants/accessibility';
import { PublicationType } from '@/src/shared/constants/publications';
import { WorkTypes } from '@/src/shared/constants/work';
import type { OnixGeneralAttributes } from '@/src/shared/types/onixPlanning';

import { defineOnixRegressionFixture } from '../../fixtureSources';
import type {
  OnixPlanFindingEntry,
  OnixPlanningExpectation,
  OnixProductEntry,
  OnixRecordEntry,
  OnixTargetAccessibilityEntry,
  OnixTargetLedger,
} from '../../types';

const { Epub, Html, Paperback, Pdf } = PublicationType.enum;
const { Monograph } = WorkTypes.enum;
const { EpubA11Y10Aa, PdfUa1, Wcag21Aa, Wcag22Aaa } = AccessibilityStandards.enum;
const { FundamentalAlteration } = AccessibilityExceptions.enum;

/**
 * One Work in four manifestations whose ProductFormFeatures exercise every accessibility path (thoth-app#249):
 *
 * - EPUB: WCAG 2.1 AA (81 + 85, with their general attributes), EPUB Accessibility 1.0 AA (03), an EAA exception (75,
 *   described), a report URL (96), a limited-accessibility status (09) and a feature (22), beside a format version (List
 *   79 type 10), an access-control feature (type 18) and an accessibility request contact (List 198 01). Standards and
 *   an exception are never held together, so the publisher chooses; the status, the access control and the contact are
 *   acknowledged losses.
 * - PDF: WCAG 2.2 AAA (82 + 86) and PDF/UA-1 (05) automatically, unknown accessibility (08) acknowledged beside them, and
 *   a code-96 description that is no URL.
 * - HTML: two EAA exceptions (76, 77), of which the publisher keeps one, and a PDF/UA-2 claim (06) no HTML Publication
 *   can hold, acknowledged.
 * - Paperback: a WCAG claim no physical Publication can hold, and a colour feature (type 01).
 *
 * Contract authority: ONIX-AUDIT-ACCESSIBILITY-01 `5571562316` (approved `5572432531`, reconciled `5572448584`) rules
 * 1-27, 28-68, 71-84; thoth-app#221 specification, invariants `5774583022` and correction approval `5779727658` (CR-1,
 * CR-2); thoth#893 Amendment 3 `5764154050` and final receipt `5765513303`; ONIX-AUDIT-SALES-RIGHTS-CONTACT-01
 * `5543566392` rule 81 and #217 rules 29-43 (ProductContact).
 */

const EPUB = 'product:gtin13:9781800010017';
const PDF = 'product:gtin13:9781800010024';
const HTML = 'product:gtin13:9781800010031';
const PAPERBACK = 'product:gtin13:9781800010048';
const WORK = `work:${EPUB}`;
const PRODUCTS = [EPUB, PDF, HTML, PAPERBACK];
const DOI = 'https://doi.org/10.5555/regression.d110';

const PFF = (product: number, n: number) =>
  `/ONIXMessage[1]/Product[${product}]/DescriptiveDetail[1]/ProductFormFeature[${n}]`;
const CONTACT = '/ONIXMessage[1]/Product[1]/PublishingDetail[1]/ProductContact[1]';
const REPORT_URL = 'https://regression-press.example/accessibility/accessible-by-design';
const NOT_A_URL = 'See the accessibility statement on our website.';

const CONTACT_KEY = `SALES_RIGHTS|PRODUCT_CONTACT_NOT_REPRESENTED|${EPUB}|${CONTACT}`;
const ACCESS_CONTROL_KEY = `PRODUCT_FORM_FEATURE|PRODUCT_FORM_FEATURE_NOT_REPRESENTED|${EPUB}|-|${PFF(1, 9)}|vqt3i700wc`;
const STANDARD_OR_EXCEPTION_KEY = `ACCESSIBILITY|ACCESSIBILITY_STANDARD_EXCEPTION_CHOICE_REQUIRED|${EPUB}|EPUB|mxl1s8b2g0`;
const EPUB_STATUS_KEY = `ACCESSIBILITY|ACCESSIBILITY_STATUS_NOT_REPRESENTED|${EPUB}|EPUB|18recgn0jg1`;
const PDF_STATUS_KEY = `ACCESSIBILITY|ACCESSIBILITY_STATUS_NOT_REPRESENTED|${PDF}|PDF|fbuk05u93l`;
const EXCEPTION_KEY = `ACCESSIBILITY|ACCESSIBILITY_EXCEPTION_CHOICE_REQUIRED|${HTML}|HTML|flcz40ci1t`;
const INCOMPATIBLE_KEY = `ACCESSIBILITY|ACCESSIBILITY_ADDITIONAL_INCOMPATIBLE|${HTML}|HTML|127jfsvl1tj`;

const RECORDS: OnixRecordEntry[] = PRODUCTS.map((productKey, index) => ({
  index: index + 1,
  recordReference: `regression-press.${productKey.slice('product:gtin13:'.length)}`,
  disposition: 'COMPLETE',
  productKey,
  action: 'PLANNED',
}));

const deliveryEb = [{ code: 'DELIVERY_MODE_NOT_REPRESENTED', detail: 'EB' }] as const;

const digital = (
  productKey: string,
  isbn: string,
  type: PublicationTypeValue,
  executable: boolean,
): OnixProductEntry => ({
  productKey,
  groupKey: WORK,
  isbn,
  manifestation: { kind: 'RESOLVED', type, classification: 'SUPPORTED_NORMALIZED', notes: [...deliveryEb] },
  publicationType: type,
  action: 'CREATE_PUBLICATION',
  executable,
});

const products = (executable: boolean): OnixProductEntry[] => [
  digital(EPUB, '9781800010017', Epub, executable),
  digital(PDF, '9781800010024', Pdf, executable),
  digital(HTML, '9781800010031', Html, executable),
  {
    productKey: PAPERBACK,
    groupKey: WORK,
    isbn: '9781800010048',
    manifestation: { kind: 'RESOLVED', type: Paperback, classification: 'SUPPORTED_LOSSLESS', notes: [] },
    publicationType: Paperback,
    action: 'CREATE_PUBLICATION',
    executable,
  },
];

const finding = (
  family: 'ACCESSIBILITY' | 'PRODUCT_FORM_FEATURE' | 'PRODUCT_CONTACT',
  code: string,
  classification: OnixPlanFindingEntry['classification'],
  productKey: string,
  resolution: OnixPlanFindingEntry['resolution'] = 'NONE',
  answer: 'UNANSWERED' | 'ANSWERED' = 'UNANSWERED',
): OnixPlanFindingEntry => ({
  family,
  code,
  classification,
  blocking: resolution !== 'NONE',
  resolution,
  answer: resolution === 'NONE' ? 'NOT_APPLICABLE' : answer,
  productKey,
  groupKey: WORK,
});

const findings = (decided: boolean): OnixPlanFindingEntry[] => {
  const answer = decided ? 'ANSWERED' : 'UNANSWERED';

  return [
    // An accessibility request contact is never a Publisher contact the import writes: an acknowledged loss (#217 r32).
    finding(
      'PRODUCT_CONTACT',
      'PRODUCT_CONTACT_NOT_REPRESENTED',
      'TARGET_UNREPRESENTABLE',
      EPUB,
      'ACKNOWLEDGE',
      answer,
    ),
    // List 79 types other than 09 are never mapped: a format version is disclosed, access control acknowledged (r13-17).
    finding('PRODUCT_FORM_FEATURE', 'PRODUCT_FORM_FEATURE_NOT_REPRESENTED', 'TARGET_UNREPRESENTABLE', EPUB),
    finding(
      'PRODUCT_FORM_FEATURE',
      'PRODUCT_FORM_FEATURE_NOT_REPRESENTED',
      'TARGET_UNREPRESENTABLE',
      EPUB,
      'ACKNOWLEDGE',
      answer,
    ),
    // The exception's description has no target field (r27, r66-67).
    finding('ACCESSIBILITY', 'ACCESSIBILITY_DESCRIPTION_NOT_REPRESENTED', 'SUPPORTED_WITH_WARNING', EPUB),
    // A status (09) and a detailed feature (22) are disclosed, never hidden (r51-57).
    finding('ACCESSIBILITY', 'ACCESSIBILITY_FACT_NOT_REPRESENTED', 'TARGET_UNREPRESENTABLE', EPUB),
    finding('ACCESSIBILITY', 'ACCESSIBILITY_FACT_NOT_REPRESENTED', 'TARGET_UNREPRESENTABLE', EPUB),
    // Standards and an exception are never held together; which is kept is the publisher's (Amendment 3; #221 T7).
    finding(
      'ACCESSIBILITY',
      'ACCESSIBILITY_STANDARD_EXCEPTION_CHOICE_REQUIRED',
      'TARGET_INPUT_REQUIRED',
      EPUB,
      'CHOICE',
      answer,
    ),
    // A status beside a primary standard needs its acknowledgement (r54-56).
    finding(
      'ACCESSIBILITY',
      'ACCESSIBILITY_STATUS_NOT_REPRESENTED',
      'TARGET_UNREPRESENTABLE',
      EPUB,
      'ACKNOWLEDGE',
      answer,
    ),
    finding('ACCESSIBILITY', 'ACCESSIBILITY_FACT_NOT_REPRESENTED', 'TARGET_UNREPRESENTABLE', PDF),
    // A code-96 description that is no http(s) URL is no report-URL candidate (r78, r84).
    finding('ACCESSIBILITY', 'ACCESSIBILITY_REPORT_URL_UNUSABLE', 'TARGET_UNREPRESENTABLE', PDF),
    finding(
      'ACCESSIBILITY',
      'ACCESSIBILITY_STATUS_NOT_REPRESENTED',
      'TARGET_UNREPRESENTABLE',
      PDF,
      'ACKNOWLEDGE',
      answer,
    ),
    // Two exceptions are never reduced by order (f20, r68).
    finding(
      'ACCESSIBILITY',
      'ACCESSIBILITY_EXCEPTION_CHOICE_REQUIRED',
      'TARGET_INPUT_REQUIRED',
      HTML,
      'CHOICE',
      answer,
    ),
    // An HTML Publication holds no additional standard at all: the claim is an acknowledged loss (r48; #221 T3-T5).
    finding(
      'ACCESSIBILITY',
      'ACCESSIBILITY_ADDITIONAL_INCOMPATIBLE',
      'TARGET_UNREPRESENTABLE',
      HTML,
      'ACKNOWLEDGE',
      answer,
    ),
    finding('PRODUCT_FORM_FEATURE', 'PRODUCT_FORM_FEATURE_NOT_REPRESENTED', 'TARGET_UNREPRESENTABLE', PAPERBACK),
    // A physical Publication holds no standard: disclosed, never acknowledged (r20; #221 AC12).
    finding('ACCESSIBILITY', 'ACCESSIBILITY_NOT_PROJECTED', 'TARGET_UNREPRESENTABLE', PAPERBACK),
  ];
};

const NO_ATTRIBUTES = { datestamp: null, sourceName: null, sourceType: null };
const AUDITED = { datestamp: '20260901', sourceName: 'Regression Accessibility Audit', sourceType: '06' };

type Feature = OnixTargetAccessibilityEntry['products'][number]['features'][number];

const feature = (
  path: string,
  type: string,
  value: string,
  role: 'ACCESSIBILITY' | 'FORMAT_EVIDENCE' | 'MATERIAL' | 'OTHER',
  descriptions: string[] = [],
  attributes: OnixGeneralAttributes = NO_ATTRIBUTES,
): Feature => ({
  path,
  type,
  value,
  role,
  attributes,
  typeAttributes: NO_ATTRIBUTES,
  valueAttributes: NO_ATTRIBUTES,
  descriptions: descriptions.map((text) => ({ text, language: 'eng', attributes: NO_ATTRIBUTES })),
});

const RESOLVED_NONE = {
  accessibilityStandard: null,
  accessibilityAdditionalStandard: null,
  accessibilityException: null,
  accessibilityReportUrl: null,
};

/** An incompatible additional standard is omitted whatever is answered (5.7 step 2c). */
const INCOMPATIBLE_OMISSION = {
  field: 'accessibilityAdditionalStandard' as const,
  value: 'PDF_UA2',
  reason: 'INCOMPATIBLE_ADDITIONAL' as const,
  codes: ['06'],
};

const accessibility = (decided: boolean): OnixTargetAccessibilityEntry => ({
  products: [
    {
      productKey: EPUB,
      // Every ProductFormFeature, repeats included, at its own path with its general attributes (r1-6; CR-1).
      features: [
        feature(PFF(1, 1), '09', '81', 'ACCESSIBILITY', [], AUDITED),
        feature(PFF(1, 2), '09', '85', 'ACCESSIBILITY', [], AUDITED),
        feature(PFF(1, 3), '09', '03', 'ACCESSIBILITY'),
        feature(PFF(1, 4), '09', '75', 'ACCESSIBILITY', ['The publisher is a micro-enterprise.']),
        feature(PFF(1, 5), '09', '96', 'ACCESSIBILITY', [REPORT_URL]),
        feature(PFF(1, 6), '09', '09', 'ACCESSIBILITY'),
        feature(PFF(1, 7), '09', '22', 'ACCESSIBILITY'),
        feature(PFF(1, 8), '10', '3.3', 'FORMAT_EVIDENCE'),
        feature(PFF(1, 9), '18', '02', 'MATERIAL', ['Registration with the reading platform is required.']),
      ],
      // 81 + 85 is WCAG 2.1 AA (r28); the one level 85 also completes 03 as EPUB Accessibility 1.0 AA (r39).
      primaryStandards: ['WCAG21AA'],
      additionalStandards: ['EPUB_A11Y10AA'],
      exceptions: ['MICRO_ENTERPRISES'],
      reportUrls: [REPORT_URL],
      publications: [
        {
          publicationType: Epub,
          scope: 'DIGITAL',
          additionalStandards: ['EPUB_A11Y10AA'],
          incompatibleAdditionalStandards: [],
        },
      ],
    },
    {
      productKey: PDF,
      features: [
        feature(PFF(2, 1), '09', '82', 'ACCESSIBILITY'),
        feature(PFF(2, 2), '09', '86', 'ACCESSIBILITY'),
        feature(PFF(2, 3), '09', '05', 'ACCESSIBILITY'),
        feature(PFF(2, 4), '09', '08', 'ACCESSIBILITY'),
        feature(PFF(2, 5), '09', '96', 'ACCESSIBILITY', [NOT_A_URL]),
      ],
      primaryStandards: ['WCAG22AAA'],
      additionalStandards: ['PDF_UA1'],
      exceptions: [],
      reportUrls: [],
      publications: [
        {
          publicationType: Pdf,
          scope: 'DIGITAL',
          additionalStandards: ['PDF_UA1'],
          incompatibleAdditionalStandards: [],
        },
      ],
    },
    {
      productKey: HTML,
      features: [
        feature(PFF(3, 1), '09', '76', 'ACCESSIBILITY'),
        feature(PFF(3, 2), '09', '77', 'ACCESSIBILITY'),
        feature(PFF(3, 3), '09', '06', 'ACCESSIBILITY'),
      ],
      primaryStandards: [],
      // The candidate is the Product's; the HTML Publication can hold it in no slot.
      additionalStandards: ['PDF_UA2'],
      exceptions: ['DISPROPORTIONATE_BURDEN', 'FUNDAMENTAL_ALTERATION'],
      reportUrls: [],
      publications: [
        {
          publicationType: Html,
          scope: 'DIGITAL',
          additionalStandards: [],
          incompatibleAdditionalStandards: ['PDF_UA2'],
        },
      ],
    },
    {
      productKey: PAPERBACK,
      features: [
        feature(PFF(4, 1), '09', '81', 'ACCESSIBILITY'),
        feature(PFF(4, 2), '09', '85', 'ACCESSIBILITY'),
        feature(PFF(4, 3), '01', 'BLK', 'OTHER'),
      ],
      // Candidates are the Product's; the paperback's Publication holds none of them.
      primaryStandards: ['WCAG21AA'],
      additionalStandards: [],
      exceptions: [],
      reportUrls: [],
      publications: [
        { publicationType: Paperback, scope: 'PHYSICAL', additionalStandards: [], incompatibleAdditionalStandards: [] },
      ],
    },
  ],
  contacts: [{ productKey: EPUB, path: CONTACT, role: '01', scope: 'PUBLISHING_DETAIL' }],
  actions: [
    decided
      ? {
          productKey: EPUB,
          publicationType: Epub,
          // STANDARDS keeps the WCAG and EPUB conformance claims and leaves the exception out (Amendment 3).
          resolved: {
            accessibilityStandard: Wcag21Aa,
            accessibilityAdditionalStandard: EpubA11Y10Aa,
            accessibilityException: null,
            accessibilityReportUrl: REPORT_URL,
          },
          sources: [
            { field: 'accessibilityStandard', value: 'WCAG21AA', basis: 'AUTOMATIC', codes: ['81', '85'] },
            {
              field: 'accessibilityAdditionalStandard',
              value: 'EPUB_A11Y10AA',
              basis: 'AUTOMATIC',
              codes: ['03', '85'],
            },
            { field: 'accessibilityReportUrl', value: REPORT_URL, basis: 'AUTOMATIC', codes: ['96'] },
          ],
          omitted: [
            { field: 'accessibilityException', value: 'MICRO_ENTERPRISES', reason: 'STANDARDS_CHOSEN', codes: ['75'] },
          ],
          action: 'CREATE',
        }
      : {
          productKey: EPUB,
          publicationType: Epub,
          // Every single candidate stands automatically, but nothing is set until the standards-or-exception choice is made.
          resolved: null,
          sources: [
            { field: 'accessibilityStandard', value: 'WCAG21AA', basis: 'AUTOMATIC', codes: ['81', '85'] },
            {
              field: 'accessibilityAdditionalStandard',
              value: 'EPUB_A11Y10AA',
              basis: 'AUTOMATIC',
              codes: ['03', '85'],
            },
            { field: 'accessibilityException', value: 'MICRO_ENTERPRISES', basis: 'AUTOMATIC', codes: ['75'] },
            { field: 'accessibilityReportUrl', value: REPORT_URL, basis: 'AUTOMATIC', codes: ['96'] },
          ],
          omitted: [],
          action: 'BLOCKED',
        },
    // The status acknowledgement never changes what is resolved (#221 action rules).
    {
      productKey: PDF,
      publicationType: Pdf,
      resolved: {
        accessibilityStandard: Wcag22Aaa,
        accessibilityAdditionalStandard: PdfUa1,
        accessibilityException: null,
        accessibilityReportUrl: null,
      },
      sources: [
        { field: 'accessibilityStandard', value: 'WCAG22AAA', basis: 'AUTOMATIC', codes: ['82', '86'] },
        { field: 'accessibilityAdditionalStandard', value: 'PDF_UA1', basis: 'AUTOMATIC', codes: ['05'] },
      ],
      omitted: [],
      action: 'CREATE',
    },
    decided
      ? {
          productKey: HTML,
          publicationType: Html,
          resolved: { ...RESOLVED_NONE, accessibilityException: FundamentalAlteration },
          sources: [
            {
              field: 'accessibilityException',
              value: 'FUNDAMENTAL_ALTERATION',
              basis: 'PUBLISHER_CHOICE',
              codes: ['77'],
            },
          ],
          omitted: [
            INCOMPATIBLE_OMISSION,
            { field: 'accessibilityException', value: 'DISPROPORTIONATE_BURDEN', reason: 'NOT_CHOSEN', codes: ['76'] },
          ],
          action: 'CREATE',
        }
      : {
          productKey: HTML,
          publicationType: Html,
          resolved: null,
          sources: [],
          omitted: [INCOMPATIBLE_OMISSION],
          action: 'BLOCKED',
        },
    {
      productKey: PAPERBACK,
      publicationType: Paperback,
      resolved: RESOLVED_NONE,
      sources: [],
      omitted: [
        { field: 'accessibilityStandard', value: 'WCAG21AA', reason: 'PHYSICAL_PUBLICATION', codes: ['81', '85'] },
      ],
      action: 'CREATE',
    },
  ],
});

const noSupply = (productKey: string, carrier: 'DIGITAL' | 'PHYSICAL') => ({
  productKey,
  supplies: [],
  prices: [],
  carriers: { [carrier]: { kind: 'NONE' as const } },
  plannedLocations: [],
});

const silentRights = (productKey: string, carrier: 'DIGITAL' | 'PHYSICAL') => ({
  productKey,
  carrier,
  expressions: [],
  licence: { kind: 'SILENT' as const },
  dated: false,
  technicalProtection: [],
  technicalProtectionState: 'UNKNOWN' as const,
  usageConstraints: [],
  deferredRights: [],
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

const publication = (
  type: PublicationTypeValue,
  isbn: string,
  state: {
    accessibilityStandard: string | null;
    accessibilityAdditionalStandard: string | null;
    accessibilityException: string | null;
    accessibilityReportUrl: string;
  },
) => ({ type, isbn, prices: [], locations: [], ...state });

const target = (decided: boolean): OnixTargetLedger => ({
  findings: [
    { family: 'PRODUCT_CONTACT', code: 'PRODUCT_CONTACT_NOT_REPRESENTED', key: CONTACT_KEY, paths: [CONTACT] },
    {
      family: 'PRODUCT_FORM_FEATURE',
      code: 'PRODUCT_FORM_FEATURE_NOT_REPRESENTED',
      key: `PRODUCT_FORM_FEATURE|PRODUCT_FORM_FEATURE_NOT_REPRESENTED|${EPUB}|-|${PFF(1, 8)}|204b6k49h68`,
      paths: [PFF(1, 8)],
    },
    {
      family: 'PRODUCT_FORM_FEATURE',
      code: 'PRODUCT_FORM_FEATURE_NOT_REPRESENTED',
      key: ACCESS_CONTROL_KEY,
      paths: [PFF(1, 9)],
    },
    {
      family: 'ACCESSIBILITY',
      code: 'ACCESSIBILITY_DESCRIPTION_NOT_REPRESENTED',
      key: `ACCESSIBILITY|ACCESSIBILITY_DESCRIPTION_NOT_REPRESENTED|${EPUB}|-|${PFF(1, 4)}`,
      paths: [PFF(1, 4), `${PFF(1, 4)}/ProductFormFeatureDescription[1]`],
    },
    {
      family: 'ACCESSIBILITY',
      code: 'ACCESSIBILITY_FACT_NOT_REPRESENTED',
      key: `ACCESSIBILITY|ACCESSIBILITY_FACT_NOT_REPRESENTED|${EPUB}|-|${PFF(1, 6)}`,
      paths: [PFF(1, 6)],
    },
    {
      family: 'ACCESSIBILITY',
      code: 'ACCESSIBILITY_FACT_NOT_REPRESENTED',
      key: `ACCESSIBILITY|ACCESSIBILITY_FACT_NOT_REPRESENTED|${EPUB}|-|${PFF(1, 7)}`,
      paths: [PFF(1, 7)],
    },
    // Bound to every fact behind the offered options, attributes included (CR-2).
    {
      family: 'ACCESSIBILITY',
      code: 'ACCESSIBILITY_STANDARD_EXCEPTION_CHOICE_REQUIRED',
      key: STANDARD_OR_EXCEPTION_KEY,
      paths: [PFF(1, 1), PFF(1, 2), PFF(1, 3), PFF(1, 4)],
    },
    { family: 'ACCESSIBILITY', code: 'ACCESSIBILITY_STATUS_NOT_REPRESENTED', key: EPUB_STATUS_KEY, paths: [PFF(1, 6)] },
    {
      family: 'ACCESSIBILITY',
      code: 'ACCESSIBILITY_FACT_NOT_REPRESENTED',
      key: `ACCESSIBILITY|ACCESSIBILITY_FACT_NOT_REPRESENTED|${PDF}|-|${PFF(2, 4)}`,
      paths: [PFF(2, 4)],
    },
    {
      family: 'ACCESSIBILITY',
      code: 'ACCESSIBILITY_REPORT_URL_UNUSABLE',
      key: `ACCESSIBILITY|ACCESSIBILITY_REPORT_URL_UNUSABLE|${PDF}|-|${PFF(2, 5)}|${NOT_A_URL}`,
      paths: [PFF(2, 5)],
    },
    { family: 'ACCESSIBILITY', code: 'ACCESSIBILITY_STATUS_NOT_REPRESENTED', key: PDF_STATUS_KEY, paths: [PFF(2, 4)] },
    {
      family: 'ACCESSIBILITY',
      code: 'ACCESSIBILITY_EXCEPTION_CHOICE_REQUIRED',
      key: EXCEPTION_KEY,
      paths: [PFF(3, 1), PFF(3, 2)],
    },
    {
      family: 'ACCESSIBILITY',
      code: 'ACCESSIBILITY_ADDITIONAL_INCOMPATIBLE',
      key: INCOMPATIBLE_KEY,
      paths: [PFF(3, 3)],
    },
    {
      family: 'PRODUCT_FORM_FEATURE',
      code: 'PRODUCT_FORM_FEATURE_NOT_REPRESENTED',
      key: `PRODUCT_FORM_FEATURE|PRODUCT_FORM_FEATURE_NOT_REPRESENTED|${PAPERBACK}|-|${PFF(4, 3)}|xe8m0nnfr`,
      paths: [PFF(4, 3)],
    },
    {
      family: 'ACCESSIBILITY',
      code: 'ACCESSIBILITY_NOT_PROJECTED',
      key: `ACCESSIBILITY|ACCESSIBILITY_NOT_PROJECTED|${PAPERBACK}|PAPERBACK|hzklynmage`,
      paths: [PFF(4, 1), PFF(4, 2)],
    },
  ],
  identity: {
    compatibility: { headerMatches: false, ignoredNativeRecordKeys: [], activation: 'NOT_APPLICABLE' },
    groups: [
      {
        groupKey: WORK,
        compatibility: 'GENERIC',
        thothVerification: 'NOT_APPLICABLE',
        edges: [{ kind: 'WORK_IDENTITY', key: `workdoi:${DOI}`, productKeys: PRODUCTS }],
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
    noSupply(EPUB, 'DIGITAL'),
    noSupply(PDF, 'DIGITAL'),
    noSupply(HTML, 'DIGITAL'),
    noSupply(PAPERBACK, 'PHYSICAL'),
  ],
  priceResolutions: [],
  rights: {
    products: [
      silentRights(EPUB, 'DIGITAL'),
      silentRights(PDF, 'DIGITAL'),
      silentRights(HTML, 'DIGITAL'),
      silentRights(PAPERBACK, 'PHYSICAL'),
    ],
    groups: [{ groupKey: WORK, licence: { kind: 'UNSET' } }],
    licenceActions: [{ groupKey: WORK, action: { kind: 'UNSET' } }],
    acknowledgedFindingKeys: decided ? [CONTACT_KEY] : [],
  },
  accessibility: accessibility(decided),
  components: [],
  relatedMaterial: {
    outcomes: PRODUCTS.map((productKey, index) => workIdentity(index + 1, productKey)),
    edges: [],
    productReferences: PRODUCTS.map((productKey) => ({ productKey, asserted: false, references: [] })),
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
            // Each created Publication receives exactly its resolved state; an empty report URL is '' (#221 AC19).
            publications: [
              publication(Epub, '9781800010017', {
                accessibilityStandard: 'WCAG21AA',
                accessibilityAdditionalStandard: 'EPUB_A11Y10AA',
                accessibilityException: null,
                accessibilityReportUrl: REPORT_URL,
              }),
              publication(Pdf, '9781800010024', {
                accessibilityStandard: 'WCAG22AAA',
                accessibilityAdditionalStandard: 'PDF_UA1',
                accessibilityException: null,
                accessibilityReportUrl: '',
              }),
              publication(Html, '9781800010031', {
                accessibilityStandard: null,
                accessibilityAdditionalStandard: null,
                accessibilityException: 'FUNDAMENTAL_ALTERATION',
                accessibilityReportUrl: '',
              }),
              publication(Paperback, '9781800010048', {
                accessibilityStandard: null,
                accessibilityAdditionalStandard: null,
                accessibilityException: null,
                accessibilityReportUrl: '',
              }),
            ],
            references: [],
            additionalResources: [],
            bookReviews: [],
            endorsements: [],
            awards: [],
          },
        ],
        containedWorks: [],
        series: [],
        relations: [],
      }
    : { works: [], containedWorks: [], series: [], relations: [] },
});

const blocker = (
  code: string,
  classification: 'TARGET_INPUT_REQUIRED' | 'TARGET_UNREPRESENTABLE',
  record: number,
  productKey: string,
) => ({ code, classification, recordKey: `record:${record}`, productKey, groupKey: WORK });

const planning = (decided: boolean): OnixPlanningExpectation => ({
  executable: decided,
  records: RECORDS,
  products: products(decided),
  workGroups: [
    {
      groupKey: WORK,
      productKeys: PRODUCTS,
      target: 'NEW_WORK',
      workType: decided
        ? { status: 'RESOLVED', type: Monograph, provenance: 'USER_FILE_DEFAULT' }
        : { status: 'UNRESOLVED' },
      edition: { status: 'RESOLVED', edition: 1, basis: 'DEFAULT_FIRST_EDITION' },
      workDoi: { kind: 'DOI', doi: DOI, basis: 'WORK_IDENTIFIER' },
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
        blocker('PRODUCT_CONTACT_ACKNOWLEDGEMENT_REQUIRED', 'TARGET_UNREPRESENTABLE', 1, EPUB),
        blocker('PRODUCT_FORM_FEATURE_ACKNOWLEDGEMENT_REQUIRED', 'TARGET_UNREPRESENTABLE', 1, EPUB),
        blocker('ACCESSIBILITY_CHOICE_REQUIRED', 'TARGET_INPUT_REQUIRED', 1, EPUB),
        // Until the exception is chosen over it, the standard may be kept, so its status acknowledgement stands.
        blocker('ACCESSIBILITY_ACKNOWLEDGEMENT_REQUIRED', 'TARGET_UNREPRESENTABLE', 1, EPUB),
        blocker('ACCESSIBILITY_ACKNOWLEDGEMENT_REQUIRED', 'TARGET_UNREPRESENTABLE', 2, PDF),
        blocker('ACCESSIBILITY_CHOICE_REQUIRED', 'TARGET_INPUT_REQUIRED', 3, HTML),
        blocker('ACCESSIBILITY_ACKNOWLEDGEMENT_REQUIRED', 'TARGET_UNREPRESENTABLE', 3, HTML),
      ],
  findings: findings(decided),
  works: decided
    ? [
        {
          type: 'MONOGRAPH',
          status: 'ACTIVE',
          doi: DOI,
          edition: 1,
          publicationDate: '2026-03-01',
          pageCount: 0,
          titles: [
            {
              canonical: true,
              localeCode: 'EN',
              fullTitle: 'Accessible by Design',
              title: 'Accessible by Design',
              subtitle: '',
            },
          ],
          publications: [
            { type: 'EPUB', isbn: '9781800010017' },
            { type: 'PDF', isbn: '9781800010024' },
            { type: 'HTML', isbn: '9781800010031' },
            { type: 'PAPERBACK', isbn: '9781800010048' },
          ],
          contributions: [],
          languages: [{ code: 'ENG', relation: 'ORIGINAL' }],
          subjects: [],
        },
      ]
    : [],
  chapters: [],
  target: target(decided),
});

export default defineOnixRegressionFixture({
  id: 'target-accessibility-features',
  status: 'CONTRACT',
  purpose:
    'Proves every accessibility outcome of one Work in four manifestations: WCAG and EPUB/PDF conformance candidates, ' +
    'the standards-or-exception and exception choices, status, access-control and contact acknowledgements, an ' +
    'unusable report URL, and a physical Publication holding none - each Publication receiving exactly its resolved state.',
  source: {
    origin: 'SYNTHETIC',
    provenance:
      'Written for thoth-app#249. Every name, identifier, URL and contact is invented; the ISBNs carry valid check ' +
      'characters and the Work DOI uses the 10.5555 test prefix. The canonical source gate admits it with no finding.',
    sha256: '82653c66b2ddc97a9d1740ba63aaebf921861b9ea56125e0aa8f970ffcbc0f35',
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
    '/onix:ONIXMessage/onix:Product/onix:DescriptiveDetail/onix:ProductFormFeature/onix:ProductFormFeatureType': [
      '09',
      '09',
      '09',
      '09',
      '09',
      '09',
      '09',
      '10',
      '18',
      '09',
      '09',
      '09',
      '09',
      '09',
      '09',
      '09',
      '09',
      '09',
      '09',
      '01',
    ],
    '/onix:ONIXMessage/onix:Product/onix:DescriptiveDetail/onix:ProductFormFeature/onix:ProductFormFeatureValue': [
      '81',
      '85',
      '03',
      '75',
      '96',
      '09',
      '22',
      '3.3',
      '02',
      '82',
      '86',
      '05',
      '08',
      '96',
      '76',
      '77',
      '06',
      '81',
      '85',
      'BLK',
    ],
    '/onix:ONIXMessage/onix:Product/onix:PublishingDetail/onix:ProductContact/onix:ProductContactRole': ['01'],
  },
  scenarios: [
    {
      name: 'as uploaded, before any publisher decision',
      target: 'EMPTY_PUBLISHER',
      planning: planning(false),
      outcomes: {
        SUPPORTED_LOSSLESS: 1,
        SUPPORTED_NORMALIZED: 3,
        SUPPORTED_WITH_WARNING: 1,
        TARGET_UNREPRESENTABLE: 17,
        TARGET_INPUT_REQUIRED: 5,
      },
    },
    {
      name: 'publisher takes MONOGRAPH, keeps the standards, chooses one exception and acknowledges every loss',
      target: 'EMPTY_PUBLISHER',
      inputs: {
        fileWorkType: Monograph,
        accessibilityChoices: {
          [STANDARD_OR_EXCEPTION_KEY]: 'STANDARDS',
          [EPUB_STATUS_KEY]: 'ACKNOWLEDGED',
          [PDF_STATUS_KEY]: 'ACKNOWLEDGED',
          [EXCEPTION_KEY]: 'FUNDAMENTAL_ALTERATION',
          [ACCESS_CONTROL_KEY]: 'ACKNOWLEDGED',
          [INCOMPATIBLE_KEY]: 'ACKNOWLEDGED',
        },
        rightsChoices: { [CONTACT_KEY]: 'ACKNOWLEDGED' },
      },
      planning: planning(true),
      outcomes: {
        SUPPORTED_LOSSLESS: 1,
        SUPPORTED_NORMALIZED: 3,
        SUPPORTED_WITH_WARNING: 1,
        TARGET_UNREPRESENTABLE: 12,
        TARGET_INPUT_REQUIRED: 2,
      },
    },
  ],
});
