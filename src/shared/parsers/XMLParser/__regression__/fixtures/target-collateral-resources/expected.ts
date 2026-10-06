import { ResourceType } from '@/src/shared/constants/additionalResources';
import { PublicationType } from '@/src/shared/constants/publications';
import { WorkTypes } from '@/src/shared/constants/work';

import { defineOnixRegressionFixture } from '../../fixtureSources';
import type { OnixPlanFindingEntry, OnixPlanningExpectation, OnixTargetLedger } from '../../types';

const { Pdf } = PublicationType.enum;
const { Monograph } = WorkTypes.enum;
const { Document, Video } = ResourceType.enum;

/**
 * One Work's collateral in every projection the importer distinguishes (thoth-app#249): short and long descriptions,
 * a table of contents, a publisher's notice and a restricted text; a captioned front cover, a trailer, a downloadable
 * table-of-contents file, full content, a restricted sample and an interview targeted at the press.
 *
 * Contract authority: ONIX-AUDIT-COLLATERAL-01 `5562227566` (approved `5568781349`, with the trailer amendment, rules
 * 141-147) rules 13-20, 32-55, 70-89, 90-108, 109-126, 135-137, 141-146; #219 Amendment 2 `5732730402` and corrections
 * `5757764013` (cover); #225 approval `5856147562`; #187 `2febfcdb` (AdditionalResource intents are CREATE).
 */

const PRODUCT = 'product:gtin13:9781800008014';
const WORK = `work:${PRODUCT}`;
const CD = '/ONIXMessage[1]/Product[1]/CollateralDetail[1]';
const TC = (n: number) => `${CD}/TextContent[${n}]`;
const SR = (n: number) => `${CD}/SupportingResource[${n}]`;
const LINK = (n: number) => `${SR(n)}/ResourceVersion[1]/ResourceLink[1]`;

const COVER = 'https://regression-press.example/covers/collateral.jpg';
const TRAILER = 'https://video.regression-press.example/trailers/collateral';
const CONTENTS_FILE = 'https://regression-press.example/files/collateral-contents.pdf';
const FULL_CONTENT = 'https://regression-press.example/read/collateral';
const INTERVIEW = 'https://video.regression-press.example/interviews/collateral';

const FULL_CONTENT_KEY = `COLLATERAL|COLLATERAL_RESOURCE_FULL_CONTENT|${PRODUCT}||${SR(4)}|g98f4do93q`;
const CONTENTS_FILE_DECISION = `COLLATERAL|COLLATERAL_RESOURCE_DECISION_REQUIRED|${WORK}||jhrd0ikpyh`;
const INTERVIEW_DECISION = `COLLATERAL|COLLATERAL_RESOURCE_DECISION_REQUIRED|${WORK}||13xlld3qcmb`;

const SHORT_ABSTRACT = 'Resources that travel with a book.';
const LONG_ABSTRACT = '<p>A long description of the <em>collateral</em> a book carries.</p>';
const CONTENTS = '1. Covers. 2. Trailers. 3. Files.';
const NOTICE = 'Published with the support of the Regression Fund.';
const CAPTION = 'An empty shelf under a window.';

const finding = (
  family: 'DESCRIPTIVE' | 'COLLATERAL',
  code: string,
  classification: OnixPlanFindingEntry['classification'],
  productKey: string | null,
  answer: 'NONE' | 'UNANSWERED' | 'ANSWERED' = 'NONE',
  resolution: OnixPlanFindingEntry['resolution'] = 'NONE',
): OnixPlanFindingEntry => ({
  family,
  code,
  classification,
  blocking: answer !== 'NONE',
  resolution,
  answer: answer === 'NONE' ? 'NOT_APPLICABLE' : answer,
  productKey,
  groupKey: WORK,
});

const findings = (decided: boolean): OnixPlanFindingEntry[] => {
  const asked = decided ? 'ANSWERED' : 'UNANSWERED';

  return [
    // The cover is the one automatic front cover; the caption's language is a fact it cannot keep (rules 94, 104-106).
    finding('DESCRIPTIVE', 'COVER_DETAIL_NOT_IMPORTED', 'TARGET_UNREPRESENTABLE', PRODUCT),
    // The table of contents and the general note hold plain text with no locale; the notice role is a loss (44, 51, 55).
    finding('COLLATERAL', 'COLLATERAL_TEXT_DETAIL_NOT_IMPORTED', 'SUPPORTED_WITH_WARNING', PRODUCT),
    finding('COLLATERAL', 'COLLATERAL_TEXT_DETAIL_NOT_IMPORTED', 'SUPPORTED_WITH_WARNING', PRODUCT),
    // Restricted collateral is never projected and its content never repeated (rules 14-15).
    finding('COLLATERAL', 'COLLATERAL_TEXT_RESTRICTED', 'TARGET_UNREPRESENTABLE', PRODUCT),
    // Full content is never an AdditionalResource or a Location: an acknowledged loss only (rules 135-137).
    finding('COLLATERAL', 'COLLATERAL_RESOURCE_FULL_CONTENT', 'TARGET_INPUT_REQUIRED', PRODUCT, asked, 'ACKNOWLEDGE'),
    finding('COLLATERAL', 'COLLATERAL_RESOURCE_RESTRICTED', 'TARGET_UNREPRESENTABLE', PRODUCT),
    // What each AdditionalResource candidate cannot keep - its role and form at least - is disclosed (rules 110, 124-126).
    finding('COLLATERAL', 'COLLATERAL_RESOURCE_DETAIL_NOT_IMPORTED', 'SUPPORTED_WITH_WARNING', null),
    finding('COLLATERAL', 'COLLATERAL_RESOURCE_DETAIL_NOT_IMPORTED', 'SUPPORTED_WITH_WARNING', null),
    // A downloadable file is an AdditionalResource only by the publisher's decision (rules 82-84).
    finding('COLLATERAL', 'COLLATERAL_RESOURCE_DECISION_REQUIRED', 'TARGET_INPUT_REQUIRED', null, asked, 'CHOICE'),
    finding('COLLATERAL', 'COLLATERAL_RESOURCE_DETAIL_NOT_IMPORTED', 'SUPPORTED_WITH_WARNING', null),
    // So is a resource stated only for a targeted audience (rules 16-19).
    finding('COLLATERAL', 'COLLATERAL_RESOURCE_DECISION_REQUIRED', 'TARGET_INPUT_REQUIRED', null, asked, 'CHOICE'),
    // A Description (03) with no Abstract (30) competing is the Long abstract, as a normalisation (rule 34).
    finding('COLLATERAL', 'COLLATERAL_TEXT_DESCRIPTION_NORMALISED', 'SUPPORTED_NORMALIZED', null),
  ];
};

const collateralKey = (code: string, owner: string, discriminator: string) =>
  `COLLATERAL|${code}|${owner}||${discriminator}`;

const target = (decided: boolean): OnixTargetLedger => ({
  findings: [
    {
      family: 'DESCRIPTIVE',
      code: 'COVER_DETAIL_NOT_IMPORTED',
      key: `COVER|COVER_DETAIL_NOT_IMPORTED|${PRODUCT}|${SR(1)}/ResourceVersion[1]`,
      paths: [LINK(1), `${SR(1)}/ResourceFeature[1]`],
    },
    {
      family: 'COLLATERAL',
      code: 'COLLATERAL_TEXT_DETAIL_NOT_IMPORTED',
      key: collateralKey('COLLATERAL_TEXT_DETAIL_NOT_IMPORTED', PRODUCT, TC(3)),
      paths: [TC(3)],
    },
    {
      family: 'COLLATERAL',
      code: 'COLLATERAL_TEXT_DETAIL_NOT_IMPORTED',
      key: collateralKey('COLLATERAL_TEXT_DETAIL_NOT_IMPORTED', PRODUCT, TC(4)),
      paths: [TC(4)],
    },
    {
      family: 'COLLATERAL',
      code: 'COLLATERAL_TEXT_RESTRICTED',
      key: collateralKey('COLLATERAL_TEXT_RESTRICTED', PRODUCT, TC(5)),
      paths: [TC(5)],
    },
    { family: 'COLLATERAL', code: 'COLLATERAL_RESOURCE_FULL_CONTENT', key: FULL_CONTENT_KEY, paths: [SR(4)] },
    {
      family: 'COLLATERAL',
      code: 'COLLATERAL_RESOURCE_RESTRICTED',
      key: collateralKey('COLLATERAL_RESOURCE_RESTRICTED', PRODUCT, SR(5)),
      paths: [SR(5)],
    },
    {
      family: 'COLLATERAL',
      code: 'COLLATERAL_RESOURCE_DETAIL_NOT_IMPORTED',
      key: collateralKey('COLLATERAL_RESOURCE_DETAIL_NOT_IMPORTED', WORK, '9luiw4o3tp'),
      paths: [LINK(2)],
    },
    {
      family: 'COLLATERAL',
      code: 'COLLATERAL_RESOURCE_DETAIL_NOT_IMPORTED',
      key: collateralKey('COLLATERAL_RESOURCE_DETAIL_NOT_IMPORTED', WORK, 'jhrd0ikpyh'),
      paths: [LINK(3)],
    },
    {
      family: 'COLLATERAL',
      code: 'COLLATERAL_RESOURCE_DECISION_REQUIRED',
      key: CONTENTS_FILE_DECISION,
      paths: [LINK(3)],
    },
    {
      family: 'COLLATERAL',
      code: 'COLLATERAL_RESOURCE_DETAIL_NOT_IMPORTED',
      key: collateralKey('COLLATERAL_RESOURCE_DETAIL_NOT_IMPORTED', WORK, '13xlld3qcmb'),
      paths: [LINK(6)],
    },
    { family: 'COLLATERAL', code: 'COLLATERAL_RESOURCE_DECISION_REQUIRED', key: INTERVIEW_DECISION, paths: [LINK(6)] },
    {
      family: 'COLLATERAL',
      code: 'COLLATERAL_TEXT_DESCRIPTION_NORMALISED',
      key: collateralKey('COLLATERAL_TEXT_DESCRIPTION_NORMALISED', WORK, 'LONG_ABSTRACT|EN|1u8yci55yal'),
      paths: [`${TC(2)}/Text[1]`],
    },
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
      subjects: [],
      primaryChoices: [],
      series: [],
      noCollection: false,
      lifecycle: { status: { kind: 'VALUE', status: 'ACTIVE' }, publicationDate: '2026-03-01', withdrawnDate: null },
      // One unrestricted, image-only, linkable front cover: the automatic Work cover in either reading (rules 94, 96).
      cover: { kind: 'VALUE', value: COVER },
      profileCover: { kind: 'VALUE', value: COVER },
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
    // Each TextContent by its List 153 type alone (rules 32-69); the restricted one is withheld from the plan.
    textContents: [
      {
        path: TC(1),
        productKey: PRODUCT,
        scope: 'PRODUCT',
        textType: '02',
        role: 'SHORT_ABSTRACT',
        audiences: ['00'],
        redacted: false,
      },
      {
        path: TC(2),
        productKey: PRODUCT,
        scope: 'PRODUCT',
        textType: '03',
        role: 'LONG_ABSTRACT',
        audiences: ['00'],
        redacted: false,
      },
      {
        path: TC(3),
        productKey: PRODUCT,
        scope: 'PRODUCT',
        textType: '04',
        role: 'TABLE_OF_CONTENTS',
        audiences: ['00'],
        redacted: false,
      },
      {
        path: TC(4),
        productKey: PRODUCT,
        scope: 'PRODUCT',
        textType: '13',
        role: 'GENERAL_NOTE',
        audiences: ['00'],
        redacted: false,
      },
      {
        path: TC(5),
        productKey: PRODUCT,
        scope: 'PRODUCT',
        textType: '03',
        role: 'LONG_ABSTRACT',
        audiences: ['01'],
        redacted: true,
      },
    ],
    // Each SupportingResource by its List 158 type and scope alone, never by its link (rules 8-9, 90-140).
    resources: [
      {
        path: SR(1),
        productKey: PRODUCT,
        scope: 'PRODUCT',
        contentType: '01',
        role: 'FRONT_COVER',
        audiences: ['00'],
        modes: ['03'],
        versions: [{ form: '01', links: [COVER] }],
        redacted: false,
      },
      {
        path: SR(2),
        productKey: PRODUCT,
        scope: 'PRODUCT',
        contentType: '26',
        role: 'WORK_RESOURCE',
        audiences: ['00'],
        modes: ['05'],
        versions: [{ form: '01', links: [TRAILER] }],
        redacted: false,
      },
      {
        path: SR(3),
        productKey: PRODUCT,
        scope: 'PRODUCT',
        contentType: '25',
        role: 'WORK_RESOURCE',
        audiences: ['00'],
        modes: ['04'],
        versions: [{ form: '02', links: [CONTENTS_FILE] }],
        redacted: false,
      },
      {
        path: SR(4),
        productKey: PRODUCT,
        scope: 'PRODUCT',
        contentType: '28',
        role: 'FULL_CONTENT',
        audiences: ['00'],
        modes: ['04'],
        versions: [{ form: '01', links: [FULL_CONTENT] }],
        redacted: false,
      },
      // A restricted resource's links are withheld from the plan (rule 15).
      {
        path: SR(5),
        productKey: PRODUCT,
        scope: 'PRODUCT',
        contentType: '15',
        role: 'WORK_RESOURCE',
        audiences: ['01'],
        modes: ['04'],
        versions: [{ form: '01', links: [null] }],
        redacted: true,
      },
      {
        path: SR(6),
        productKey: PRODUCT,
        scope: 'PRODUCT',
        contentType: '11',
        role: 'WORK_RESOURCE',
        audiences: ['07'],
        modes: ['05'],
        versions: [{ form: '01', links: [INTERVIEW] }],
        redacted: false,
      },
    ],
    // Title is the pinned List 158 label; ResourceType comes from the one mode (video, or text as a document)
    // (rules 111-120, 141-146): the trailer by itself, the downloadable file and targeted interview only by decision.
    candidates: [
      {
        groupKey: WORK,
        componentPath: null,
        productKeys: [PRODUCT],
        contentType: '26',
        modes: ['05'],
        form: '01',
        audiences: ['00'],
        target: {
          title: 'Trailer',
          description: null,
          attribution: null,
          resourceType: Video,
          url: TRAILER,
          date: null,
        },
        reasons: [],
        decisionFindingKey: null,
      },
      {
        groupKey: WORK,
        componentPath: null,
        productKeys: [PRODUCT],
        contentType: '25',
        modes: ['04'],
        form: '02',
        audiences: ['00'],
        target: {
          title: 'Table of contents',
          description: null,
          attribution: null,
          resourceType: Document,
          url: CONTENTS_FILE,
          date: null,
        },
        reasons: ['DOWNLOADABLE_FILE'],
        decisionFindingKey: CONTENTS_FILE_DECISION,
      },
      {
        groupKey: WORK,
        componentPath: null,
        productKeys: [PRODUCT],
        contentType: '11',
        modes: ['05'],
        form: '01',
        audiences: ['07'],
        target: {
          title: 'Contributor interview',
          description: null,
          attribution: null,
          resourceType: Video,
          url: INTERVIEW,
          date: null,
        },
        reasons: ['AUDIENCE_TARGETED'],
        decisionFindingKey: INTERVIEW_DECISION,
      },
    ],
    actions: [
      {
        groupKey: WORK,
        productKey: null,
        componentPath: null,
        target: 'WORK',
        action: decided ? 'PLANNED' : 'BLOCKED',
        abstracts: [
          {
            type: 'SHORT',
            localeCode: 'EN',
            content: SHORT_ABSTRACT,
            markupFormat: 'PLAIN_TEXT',
            canonical: true,
            canonicalBasis: 'SINGLE',
            textTypes: ['02'],
          },
          {
            type: 'LONG',
            localeCode: 'EN',
            content: LONG_ABSTRACT,
            markupFormat: 'HTML',
            canonical: true,
            canonicalBasis: 'SINGLE',
            textTypes: ['03'],
          },
        ],
        tableOfContents: { content: CONTENTS, textTypes: ['04'] },
        generalNote: { content: NOTICE, textTypes: ['13'] },
        resources: [
          {
            target: {
              title: 'Trailer',
              description: null,
              attribution: null,
              resourceType: Video,
              url: TRAILER,
              date: null,
            },
            resourceOrdinal: 1,
            basis: 'AUTOMATIC',
          },
          ...(decided
            ? [
                {
                  target: {
                    title: 'Table of contents',
                    description: null,
                    attribution: null,
                    resourceType: Document,
                    url: CONTENTS_FILE,
                    date: null,
                  },
                  resourceOrdinal: 2,
                  basis: 'PUBLISHER_DECISION' as const,
                },
              ]
            : []),
        ],
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
            coverUrl: COVER,
            coverCaption: CAPTION,
            toc: CONTENTS,
            generalNote: NOTICE,
            bibliographyNote: '',
            lccn: '',
            oclc: '',
            reference: '',
            abstracts: [
              { type: 'SHORT', localeCode: 'EN', canonical: true, content: SHORT_ABSTRACT },
              { type: 'LONG', localeCode: 'EN', canonical: true, content: LONG_ABSTRACT },
            ],
            publications: [
              {
                type: Pdf,
                isbn: '9781800008014',
                prices: [],
                locations: [],
                accessibilityStandard: null,
                accessibilityAdditionalStandard: null,
                accessibilityException: null,
                accessibilityReportUrl: '',
              },
            ],
            references: [],
            // The Work is created with none: each planned AdditionalResource intent above is its own CREATE action, which
            // execution takes after the Work (thoth-app#187), so it is never on the Work as well.
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

const groupBlocker = {
  code: 'COLLATERAL_CHOICE_REQUIRED',
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
      recordReference: 'regression-press.9781800008014',
      disposition: 'COMPLETE',
      productKey: PRODUCT,
      action: 'PLANNED',
    },
  ],
  products: [
    {
      productKey: PRODUCT,
      groupKey: WORK,
      isbn: '9781800008014',
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
        groupBlocker,
        groupBlocker,
        {
          code: 'COLLATERAL_ACKNOWLEDGEMENT_REQUIRED',
          classification: 'TARGET_INPUT_REQUIRED',
          recordKey: 'record:1',
          productKey: PRODUCT,
          groupKey: WORK,
        },
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
              fullTitle: 'Collateral in Every Form',
              title: 'Collateral in Every Form',
              subtitle: '',
            },
          ],
          publications: [{ type: 'PDF', isbn: '9781800008014' }],
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
  id: 'target-collateral-resources',
  status: 'CONTRACT',
  purpose:
    'Proves how collateral reaches a Work: abstracts, table of contents and general note from their TextTypes, a ' +
    'captioned front cover, a trailer as a video AdditionalResource, a downloadable file and a targeted interview only ' +
    'by decision, full content only as an acknowledged loss, and restricted collateral never repeated.',
  source: {
    origin: 'SYNTHETIC',
    provenance:
      'Written for thoth-app#249. Every name, identifier, text and URL is invented; the ISBN carries a valid check ' +
      'character. The canonical source gate admits it with no finding.',
    sha256: 'a93b3383964e6ff90f270b3638005d49716c6abd78cb62aee70d34752b3647cb',
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
    '/onix:ONIXMessage/onix:Product/onix:CollateralDetail/onix:TextContent/onix:TextType': [
      '02',
      '03',
      '04',
      '13',
      '03',
    ],
    '/onix:ONIXMessage/onix:Product/onix:CollateralDetail/onix:SupportingResource/onix:ResourceContentType': [
      '01',
      '26',
      '25',
      '28',
      '15',
      '11',
    ],
    '/onix:ONIXMessage/onix:Product/onix:CollateralDetail/onix:SupportingResource/onix:ResourceVersion/onix:ResourceForm':
      ['01', '01', '02', '01', '01', '01'],
  },
  scenarios: [
    {
      name: 'as uploaded, before any publisher decision',
      target: 'EMPTY_PUBLISHER',
      planning: planning(false),
      outcomes: {
        SUPPORTED_NORMALIZED: 2,
        SUPPORTED_WITH_WARNING: 5,
        TARGET_UNREPRESENTABLE: 3,
        TARGET_INPUT_REQUIRED: 7,
      },
    },
    {
      name: 'publisher takes MONOGRAPH, projects the contents file, omits the interview and acknowledges full content',
      target: 'EMPTY_PUBLISHER',
      inputs: {
        fileWorkType: Monograph,
        collateralChoices: {
          [FULL_CONTENT_KEY]: 'ACKNOWLEDGED',
          [CONTENTS_FILE_DECISION]: 'PROJECT',
          [INTERVIEW_DECISION]: 'OMIT',
        },
      },
      planning: planning(true),
      outcomes: {
        SUPPORTED_NORMALIZED: 2,
        SUPPORTED_WITH_WARNING: 5,
        TARGET_UNREPRESENTABLE: 3,
        TARGET_INPUT_REQUIRED: 3,
      },
    },
  ],
});
