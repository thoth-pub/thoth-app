import { MarkupFormat } from '@/gql/graphql';
import { AwardRoles } from '@/src/shared/constants/awards';
import { CountryCode } from '@/src/shared/constants/countries';
import { PublicationType } from '@/src/shared/constants/publications';
import { WorkTypes } from '@/src/shared/constants/work';

import { defineOnixRegressionFixture } from '../../fixtureSources';
import type { OnixPlanFindingEntry, OnixPlanningExpectation, OnixTargetLedger } from '../../types';

const { Pdf } = PublicationType.enum;
const { Monograph } = WorkTypes.enum;
const { ShortListed } = AwardRoles.enum;
const { Gbr } = CountryCode.enum;

/**
 * One Work's reviews, endorsements, prizes and cited content (thoth-app#249): a numbered review quote and a numbered
 * cited review, which as different constructs need the publisher's consent to the file order; two numbered endorsements,
 * one with no attribution; a bestseller-list citation; a shortlisting the publisher scopes to the Work; a contributor's
 * own prize; and a review quote of a chapter, which Thoth cannot hold.
 *
 * The attributed endorsement also states its one source link, which becomes the Endorsement URL (rule 84).
 *
 * Contract authority: ONIX-AUDIT-REVIEWS-PRIZES-01 `5569333445` (approved `5571407265`) rules 19-31, 33, 36-55, 56-75,
 * 76-91, 102-135, 146-153; #226 package `5856409637`, CORR-02 `5917406564` and CORR-03 `5917963574` (ordering
 * precedence), final approval `5918373766`; #187 `2febfcdb` (intents are CREATE actions of execution, never on the Work).
 */

const PRODUCT = 'product:gtin13:9781800011014';
const WORK = `work:${PRODUCT}`;
const CD = '/ONIXMessage[1]/Product[1]/CollateralDetail[1]';
const TC = (n: number) => `${CD}/TextContent[${n}]`;
const CC = (n: number) => `${CD}/CitedContent[${n}]`;
const PRIZE = `${CD}/Prize[1]`;
const CONTRIBUTOR = '/ONIXMessage[1]/Product[1]/DescriptiveDetail[1]/Contributor[1]';
const CONTRIBUTOR_PRIZE = `${CONTRIBUTOR}/Prize[1]`;
const CHAPTER = '/ONIXMessage[1]/Product[1]/ContentDetail[1]/ContentItem[1]';

const REVIEW_TEXT = '<p>A <em>superb</em> account of regression.</p>';
const ENDORSEMENT_TEXT = 'Indispensable for anyone who imports metadata.';
const ENDORSER_LINK = 'https://endorsers.example/endorser-two';
const CITED_REVIEW = 'https://reviews.example/fixture-review/praise-and-prizes';
const PRIZE_NAME = 'Regression Book of the Year';

const reviewsKey = (code: string, discriminator: string) => `REVIEWS_PRIZES|${code}|${WORK}||${discriminator}`;
const UNATTRIBUTED_KEY = reviewsKey('ENDORSEMENT_ATTRIBUTION_MISSING', `${WORK}|1sqfgb44jjo`);
const PRIZE_SCOPE_KEY = reviewsKey('PRIZE_SCOPE_REQUIRED', `${WORK}|dyi4jnlcnn`);
const REVIEW_ORDER_KEY = reviewsKey('REVIEWS_PRIZES_ORDER_UNRESOLVED', 'BOOK_REVIEW|1agl5762x5u');

const finding = (
  family: 'DESCRIPTIVE' | 'COMPONENT' | 'REVIEWS_PRIZES',
  code: string,
  classification: OnixPlanFindingEntry['classification'],
  productKey: string | null,
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
    // A contributor's prize is body-of-work metadata, never the Work's Award (rules 26, 106).
    finding('DESCRIPTIVE', 'CONTRIBUTOR_METADATA_UNREPRESENTABLE', 'TARGET_UNREPRESENTABLE', PRODUCT),
    finding('DESCRIPTIVE', 'CONTRIBUTOR_MAIN_NORMALISED', 'SUPPORTED_NORMALIZED', PRODUCT),
    finding('COMPONENT', 'COMPONENT_MATTER_NOT_REPRESENTED', 'SUPPORTED_NORMALIZED', PRODUCT),
    // A chapter's review stays at the chapter's path, never moved to the Work (rules 33, 152-153, 157).
    finding('REVIEWS_PRIZES', 'REVIEW_CHAPTER_UNREPRESENTABLE', 'TARGET_UNREPRESENTABLE', PRODUCT),
    // A bestseller listing is no review, Award or Reference (rules 24, 30-31).
    finding('REVIEWS_PRIZES', 'CITED_CONTENT_UNREPRESENTABLE', 'TARGET_UNREPRESENTABLE', PRODUCT),
    finding('REVIEWS_PRIZES', 'CONTRIBUTOR_PRIZE_UNREPRESENTABLE', 'TARGET_UNREPRESENTABLE', PRODUCT),
    // What each candidate cannot keep - its source title, role, language - is disclosed (rules 38, 44-46, 63-67, 82-90).
    finding('REVIEWS_PRIZES', 'REVIEW_DETAIL_NOT_IMPORTED', 'SUPPORTED_WITH_WARNING', null),
    finding('REVIEWS_PRIZES', 'REVIEW_DETAIL_NOT_IMPORTED', 'SUPPORTED_WITH_WARNING', null),
    // An endorsement with no attribution is never Anonymous, the publisher or the Work's author (rules 81, 91).
    finding('REVIEWS_PRIZES', 'ENDORSEMENT_ATTRIBUTION_MISSING', 'TARGET_INPUT_REQUIRED', null, 'ACKNOWLEDGE', answer),
    finding('REVIEWS_PRIZES', 'REVIEW_DETAIL_NOT_IMPORTED', 'SUPPORTED_WITH_WARNING', null),
    finding('REVIEWS_PRIZES', 'REVIEW_DETAIL_NOT_IMPORTED', 'SUPPORTED_WITH_WARNING', null),
    // Whether a P.17 Prize was won by the Work or by this manifestation is never assumed (rules 102-106).
    finding('REVIEWS_PRIZES', 'PRIZE_SCOPE_REQUIRED', 'TARGET_INPUT_REQUIRED', null, 'CHOICE', answer),
    finding('REVIEWS_PRIZES', 'PRIZE_DETAIL_NOT_IMPORTED', 'SUPPORTED_WITH_WARNING', null),
    // Numbered reviews of two constructs share no order the source states (CORR-03 precedence 4).
    finding('REVIEWS_PRIZES', 'REVIEWS_PRIZES_ORDER_UNRESOLVED', 'TARGET_INPUT_REQUIRED', null, 'ACKNOWLEDGE', answer),
  ];
};

const review = {
  authorName: 'Reviewer One',
  url: null,
  reviewDate: '2026-04-01',
  text: REVIEW_TEXT,
  textMarkupFormat: MarkupFormat.Html as const,
};

const citedReview = {
  authorName: null,
  url: CITED_REVIEW,
  reviewDate: '2026-04-15',
  text: null,
  textMarkupFormat: null,
};

const endorsement = {
  target: {
    authorName: 'Endorser Two',
    attributionBasis: 'TEXT_AUTHOR' as const,
    url: ENDORSER_LINK,
    text: ENDORSEMENT_TEXT,
    textMarkupFormat: MarkupFormat.PlainText as const,
  },
  // Its own SequenceNumber, whatever is omitted beside it (rules 147, 150).
  orderNumber: 2,
  orderBasis: 'SEQUENCE_NUMBER' as const,
};

const target = (decided: boolean): OnixTargetLedger => ({
  findings: [
    {
      family: 'DESCRIPTIVE',
      code: 'CONTRIBUTOR_METADATA_UNREPRESENTABLE',
      key: `CONTRIBUTORS|CONTRIBUTOR_METADATA_UNREPRESENTABLE|${PRODUCT}|`,
      paths: [CONTRIBUTOR_PRIZE],
    },
    {
      family: 'DESCRIPTIVE',
      code: 'CONTRIBUTOR_MAIN_NORMALISED',
      key: `CONTRIBUTORS|CONTRIBUTOR_MAIN_NORMALISED|${PRODUCT}|`,
      paths: [CONTRIBUTOR],
    },
    {
      family: 'COMPONENT',
      code: 'COMPONENT_MATTER_NOT_REPRESENTED',
      key: `COMPONENT|COMPONENT_MATTER_NOT_REPRESENTED|${PRODUCT}|${CHAPTER}|1ms7iuwr5fs`,
      paths: [`${CHAPTER}/TextItem[1]/TextItemType[1]`],
    },
    {
      family: 'REVIEWS_PRIZES',
      code: 'REVIEW_CHAPTER_UNREPRESENTABLE',
      key: `REVIEWS_PRIZES|REVIEW_CHAPTER_UNREPRESENTABLE|${PRODUCT}|${CHAPTER}|${CHAPTER}/TextContent[1]|12py4qdp3n5`,
      paths: [`${CHAPTER}/TextContent[1]`],
    },
    {
      family: 'REVIEWS_PRIZES',
      code: 'CITED_CONTENT_UNREPRESENTABLE',
      key: `REVIEWS_PRIZES|CITED_CONTENT_UNREPRESENTABLE|${PRODUCT}||${CC(2)}|24rpqm4ha6v`,
      paths: [CC(2)],
    },
    {
      family: 'REVIEWS_PRIZES',
      code: 'CONTRIBUTOR_PRIZE_UNREPRESENTABLE',
      key: `REVIEWS_PRIZES|CONTRIBUTOR_PRIZE_UNREPRESENTABLE|${PRODUCT}||${CONTRIBUTOR_PRIZE}|53521bq5wz`,
      paths: [CONTRIBUTOR_PRIZE],
    },
    {
      family: 'REVIEWS_PRIZES',
      code: 'REVIEW_DETAIL_NOT_IMPORTED',
      key: reviewsKey('REVIEW_DETAIL_NOT_IMPORTED', `${WORK}|19ccwkxw1ht`),
      paths: [TC(1)],
    },
    {
      family: 'REVIEWS_PRIZES',
      code: 'REVIEW_DETAIL_NOT_IMPORTED',
      key: reviewsKey('REVIEW_DETAIL_NOT_IMPORTED', `${WORK}|13le9i6vcta`),
      paths: [TC(2)],
    },
    { family: 'REVIEWS_PRIZES', code: 'ENDORSEMENT_ATTRIBUTION_MISSING', key: UNATTRIBUTED_KEY, paths: [TC(3)] },
    {
      family: 'REVIEWS_PRIZES',
      code: 'REVIEW_DETAIL_NOT_IMPORTED',
      key: reviewsKey('REVIEW_DETAIL_NOT_IMPORTED', `${WORK}|1sqfgb44jjo`),
      paths: [TC(3)],
    },
    {
      family: 'REVIEWS_PRIZES',
      code: 'REVIEW_DETAIL_NOT_IMPORTED',
      key: reviewsKey('REVIEW_DETAIL_NOT_IMPORTED', `${WORK}|1dbcbefe1w`),
      paths: [CC(1)],
    },
    { family: 'REVIEWS_PRIZES', code: 'PRIZE_SCOPE_REQUIRED', key: PRIZE_SCOPE_KEY, paths: [PRIZE] },
    {
      family: 'REVIEWS_PRIZES',
      code: 'PRIZE_DETAIL_NOT_IMPORTED',
      key: reviewsKey('PRIZE_DETAIL_NOT_IMPORTED', `${WORK}|dyi4jnlcnn`),
      paths: [PRIZE],
    },
    { family: 'REVIEWS_PRIZES', code: 'REVIEWS_PRIZES_ORDER_UNRESOLVED', key: REVIEW_ORDER_KEY, paths: [TC(1), CC(1)] },
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
  // The one ContentItem is an ordinary body chapter, created as such (ContentDetail contract).
  components: [
    {
      path: CHAPTER,
      productKey: PRODUCT,
      groupKey: WORK,
      position: 1,
      kind: 'BOOK_CHAPTER',
      matter: 'BODY',
      ordinal: { status: 'RESOLVED', ordinal: 1, basis: 'LEVEL_SEQUENCE_NUMBER' },
      hierarchy: null,
      doi: null,
      pages: { status: 'RESOLVED', firstPage: '1', lastPage: '40', basis: 'PAGE_RUN' },
      pageCount: null,
      inherited: ['imprint', 'status', 'publicationDate', 'withdrawnDate', 'copyrightHolder'],
      action: 'CREATE_CHAPTER',
    },
  ],
  relatedMaterial: {
    outcomes: [],
    edges: [],
    productReferences: [{ productKey: PRODUCT, asserted: false, references: [] }],
    referenceActions: [{ groupKey: WORK, action: { kind: 'NONE' } }],
  },
  collateral: {
    // Review and endorsement TextContents are collateral facts whose projection is REL-01D's, never an abstract or note.
    textContents: [
      {
        path: TC(1),
        productKey: PRODUCT,
        scope: 'PRODUCT',
        textType: '06',
        role: 'REVIEW',
        audiences: ['00'],
        redacted: false,
      },
      {
        path: TC(2),
        productKey: PRODUCT,
        scope: 'PRODUCT',
        textType: '09',
        role: 'REVIEW',
        audiences: ['00'],
        redacted: false,
      },
      {
        path: TC(3),
        productKey: PRODUCT,
        scope: 'PRODUCT',
        textType: '09',
        role: 'REVIEW',
        audiences: ['00'],
        redacted: false,
      },
      {
        path: `${CHAPTER}/TextContent[1]`,
        productKey: PRODUCT,
        scope: 'COMPONENT',
        textType: '06',
        role: 'REVIEW',
        audiences: ['00'],
        redacted: false,
      },
    ],
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
      {
        groupKey: WORK,
        productKey: PRODUCT,
        componentPath: CHAPTER,
        target: 'CHAPTER',
        action: 'PLANNED',
        abstracts: [],
        tableOfContents: null,
        generalNote: null,
        resources: [],
      },
    ],
  },
  reviewsPrizes: {
    citedContents: [
      {
        path: CC(1),
        productKey: PRODUCT,
        scope: 'PRODUCT',
        citedContentType: '01',
        sourceType: '01',
        audiences: ['00'],
      },
      {
        path: CC(2),
        productKey: PRODUCT,
        scope: 'PRODUCT',
        citedContentType: '02',
        sourceType: '02',
        audiences: ['00'],
      },
    ],
    prizes: [
      { path: PRIZE, productKey: PRODUCT, scope: 'PRODUCT', code: '04' },
      { path: CONTRIBUTOR_PRIZE, productKey: PRODUCT, scope: 'CONTRIBUTOR', code: '01' },
    ],
    candidates: [
      {
        scope: 'WORK',
        key: WORK,
        // A review quote and a cited review are distinct candidates, never paired by themselves; these state different
        // review dates, so no pairing is even offered (rules 74-75, 146).
        reviews: [
          {
            kind: 'REVIEW_QUOTE',
            productKeys: [PRODUCT],
            sourceCode: '06',
            audience: 'UNRESTRICTED',
            texts: [{ content: REVIEW_TEXT, markupFormat: 'HTML' }],
            attributions: ['Reviewer One'],
            links: [],
            reviewDate: '2026-04-01',
            sequenceNumbers: ['1'],
          },
          {
            kind: 'CITED_REVIEW',
            productKeys: [PRODUCT],
            sourceCode: '01',
            audience: 'UNRESTRICTED',
            texts: [],
            attributions: [],
            links: [CITED_REVIEW],
            reviewDate: '2026-04-15',
            sequenceNumbers: ['1'],
          },
        ],
        endorsements: [
          {
            kind: 'ENDORSEMENT',
            productKeys: [PRODUCT],
            sourceCode: '09',
            audience: 'UNRESTRICTED',
            texts: [{ content: ENDORSEMENT_TEXT, markupFormat: 'PLAIN_TEXT' }],
            attributions: ['Endorser Two'],
            links: [ENDORSER_LINK],
            reviewDate: null,
            sequenceNumbers: ['2'],
          },
          {
            kind: 'ENDORSEMENT',
            productKeys: [PRODUCT],
            sourceCode: '09',
            audience: 'UNRESTRICTED',
            texts: [{ content: 'A book everyone should read.', markupFormat: 'PLAIN_TEXT' }],
            attributions: [],
            links: [],
            reviewDate: null,
            sequenceNumbers: ['3'],
          },
        ],
        // List 41 04 is SHORT_LISTED; List 91 GB is GBR by the explicit crosswalk (rules 112-119).
        prizes: [
          {
            productKeys: [PRODUCT],
            names: [{ name: PRIZE_NAME, language: 'eng' }],
            code: '04',
            role: 'SHORT_LISTED',
            year: '2026',
            country: 'GBR',
            sequenceNumbers: [],
          },
        ],
        ordering: {
          BOOK_REVIEW: { status: 'UNRESOLVED', reason: 'MIXED_CONSTRUCTS' },
          ENDORSEMENT: { status: 'RESOLVED', basis: 'SEQUENCE_NUMBER' },
          AWARD: { status: 'RESOLVED', basis: 'SOURCE_ORDER_TARGET_NORMALIZATION' },
        },
      },
    ],
    actions: [
      {
        groupKey: WORK,
        productKey: null,
        componentPath: null,
        target: 'WORK',
        action: decided ? 'PLANNED' : 'BLOCKED',
        // With the publisher's consent, the file order: TextContent before CitedContent.
        bookReviews: decided
          ? [
              { source: 'REVIEW_QUOTE', target: review, orderNumber: 1, orderBasis: 'PUBLISHER_FILE_ORDER' },
              { source: 'CITED_REVIEW', target: citedReview, orderNumber: 2, orderBasis: 'PUBLISHER_FILE_ORDER' },
            ]
          : [],
        // The unattributed endorsement is omitted by acknowledgement; the other keeps its number either way.
        endorsements: [endorsement],
        awards: decided
          ? [
              {
                target: {
                  title: PRIZE_NAME,
                  role: ShortListed,
                  year: '2026',
                  country: Gbr,
                  jury: 'Ada Lovelace, Alan Turing',
                  prizeStatement: null,
                  prizeStatementMarkupFormat: null,
                  category: null,
                  url: null,
                },
                orderNumber: 1,
                orderBasis: 'SOURCE_ORDER_TARGET_NORMALIZATION',
              },
            ]
          : [],
      },
      // A chapter holds no reviews (rule 152).
      {
        groupKey: WORK,
        productKey: PRODUCT,
        componentPath: CHAPTER,
        target: 'CHAPTER',
        action: 'TARGET_UNREPRESENTABLE',
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
                isbn: '9781800011014',
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
            // Each planned review, endorsement and award is its own CREATE action after the Work (#187), never on it.
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

const choiceBlocker = (code: string) => ({
  code,
  classification: 'TARGET_INPUT_REQUIRED' as const,
  recordKey: 'record:1',
  productKey: null,
  groupKey: WORK,
});

const planning = (decided: boolean): OnixPlanningExpectation => ({
  executable: decided,
  records: [
    {
      index: 1,
      recordReference: 'regression-press.9781800011014',
      disposition: 'COMPLETE',
      productKey: PRODUCT,
      action: 'PLANNED',
    },
  ],
  products: [
    {
      productKey: PRODUCT,
      groupKey: WORK,
      isbn: '9781800011014',
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
        choiceBlocker('REVIEWS_PRIZES_ACKNOWLEDGEMENT_REQUIRED'),
        choiceBlocker('REVIEWS_PRIZES_ACKNOWLEDGEMENT_REQUIRED'),
        choiceBlocker('REVIEWS_PRIZES_CHOICE_REQUIRED'),
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
              fullTitle: 'Praise and Prizes',
              title: 'Praise and Prizes',
              subtitle: '',
            },
          ],
          publications: [{ type: 'PDF', isbn: '9781800011014' }],
          // Reviewers and endorsers are never Work contributors (rules 33-35).
          contributions: [{ fullName: 'Grace Hopper', type: 'AUTHOR', isMain: true, orderNumber: 1, orcidId: '' }],
          languages: [{ code: 'ENG', relation: 'ORIGINAL' }],
          subjects: [],
        },
      ]
    : [],
  chapters: decided
    ? [{ type: 'BOOK_CHAPTER', fullTitle: 'A Reviewed Chapter', firstPage: '1', lastPage: '40', pageCount: 0 }]
    : [],
  target: target(decided),
});

const deprecatedTextAuthor = (path: string) => ({
  id: '_20260222_a_1',
  tier: 'SCHEMATRON' as const,
  scope: 'VALIDITY' as const,
  class: 'DEPRECATED_OR_INFORMATIONAL' as const,
  blocking: false,
  projection: 'AUTHORITATIVE' as const,
  recoverability: 'NOT_RECOVERABLE' as const,
  counts: false,
  path,
});

export default defineOnixRegressionFixture({
  id: 'target-reviews-prizes-cited-content',
  status: 'CONTRACT',
  purpose:
    'Proves how reviews, endorsements, prizes and cited content reach a Work: a review quote and a cited review as two ' +
    'BookReviews in the consented file order, a numbered endorsement, an unattributed one omitted, a Work-scoped Award ' +
    'with its mapped role and country, and a bestseller listing, a contributor prize and a chapter review never projected.',
  source: {
    origin: 'SYNTHETIC',
    provenance:
      'Written for thoth-app#249. Every name, identifier, text, prize and URL is invented; the ISBN carries a valid ' +
      'check character. The canonical source gate admits it; its only findings are the 3.1 informational Schematron ' +
      'notices that TextAuthor is deprecated, which REL-01D still reads as the approved attribution (rules 39, 77).',
    sha256: 'a83583f96b24d90e16696a5f1451c24577a03f903c89e64b7a8578ce1f597800',
  },
  defects: [],
  asOf: '2026-10-02T12:00:00.000Z',
  imprints: [{ label: 'Regression Press', value: '11111111-1111-4111-8111-111111111111' }],
  gate: {
    verdict: 'PERMITTED',
    release: '3.1',
    flavour: 'reference',
    findings: [
      deprecatedTextAuthor(TC(1)),
      deprecatedTextAuthor(TC(2)),
      deprecatedTextAuthor(`${CHAPTER}/TextContent[1]`),
    ],
    recoveries: [],
    provenance: { kind: 'IDENTITY', flavour: 'reference' },
  },
  normalized: {
    '/onix:ONIXMessage/onix:Product/onix:CollateralDetail/onix:TextContent/onix:TextType': ['06', '09', '09'],
    '/onix:ONIXMessage/onix:Product/onix:CollateralDetail/onix:CitedContent/onix:CitedContentType': ['01', '02'],
    '/onix:ONIXMessage/onix:Product/onix:CollateralDetail/onix:Prize/onix:PrizeCode': ['04'],
    '/onix:ONIXMessage/onix:Product/onix:DescriptiveDetail/onix:Contributor/onix:Prize/onix:PrizeCode': ['01'],
  },
  scenarios: [
    {
      name: 'as uploaded, before any publisher decision',
      target: 'EMPTY_PUBLISHER',
      planning: planning(false),
      outcomes: {
        SUPPORTED_NORMALIZED: 3,
        SUPPORTED_WITH_WARNING: 5,
        TARGET_UNREPRESENTABLE: 4,
        TARGET_INPUT_REQUIRED: 7,
      },
    },
    {
      name: 'publisher takes MONOGRAPH, scopes the prize to the Work, consents to the file order and omits the unattributed endorsement',
      target: 'EMPTY_PUBLISHER',
      inputs: {
        fileWorkType: Monograph,
        reviewsPrizesChoices: {
          [UNATTRIBUTED_KEY]: 'ACKNOWLEDGED',
          [PRIZE_SCOPE_KEY]: 'WORK_AWARD',
          [REVIEW_ORDER_KEY]: 'ACKNOWLEDGED',
        },
      },
      planning: planning(true),
      outcomes: {
        SUPPORTED_NORMALIZED: 3,
        SUPPORTED_WITH_WARNING: 5,
        TARGET_UNREPRESENTABLE: 4,
        TARGET_INPUT_REQUIRED: 3,
      },
    },
  ],
});
