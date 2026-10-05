import type { PublicationType as PublicationTypeValue } from '@/src/entities/publication/model/publication.types';
import { PublicationType } from '@/src/shared/constants/publications';
import { WorkTypes } from '@/src/shared/constants/work';

import { defineOnixRegressionFixture } from '../../fixtureSources';
import type {
  OnixPlanFindingEntry,
  OnixPlanningExpectation,
  OnixRecordEntry,
  OnixTargetLedger,
  OnixTargetPriceCandidateEntry,
} from '../../types';

const { Hardback, Pdf } = PublicationType.enum;
const { Monograph } = WorkTypes.enum;

/**
 * One Work, a PDF and a hardback, whose supply is stated in two markets by three suppliers (thoth-app#249): prices in
 * four currencies - one deduplicated, one with an optional non-retail alternative, one with conflicting retail amounts
 * and one stated only as a qualified price - an unpriced supplier, supplier availability and supply dates, and supplier
 * websites that come to a canonical Location, a non-canonical one and one Thoth has no room for on its platform.
 *
 * Contract authority: ProductSupply `5541821365` rules 1-3, 11-17, 20-37, 38-60 (approved `5541897557`); #215
 * Amendment 1 `5713644155`, Amendment 2B `5717438929` and the neutral-code interpretation `5718892458`; #219 Amendment 1
 * `5732005878`; #187 `5941874544` and the platform-capacity amendment `5948710990`.
 */

const PDF = 'product:gtin13:9781800003019';
const HARDBACK = 'product:gtin13:9781800003026';
const WORK = `work:${PDF}`;
const PRODUCTS = [PDF, HARDBACK];
const DOI = 'https://doi.org/10.5555/regression.d103';

const P1 = '/ONIXMessage[1]/Product[1]';
const P2 = '/ONIXMessage[1]/Product[2]';
const PS1 = `${P1}/ProductSupply[1]`;
const PS2 = `${P1}/ProductSupply[2]`;
const PUBLISHER = `${PS1}/SupplyDetail[1]`;
const OPEN_SHELF = `${PS2}/SupplyDetail[1]`;
const MIRROR = `${PS2}/SupplyDetail[2]`;
const HARDBACK_SUPPLIER = `${P2}/ProductSupply[1]/SupplyDetail[1]`;

const LANDING = 'https://regression-press.example/books/supply';
const FULL_TEXT = 'https://regression-press.example/books/supply/full.pdf';
const OPEN_SHELF_LANDING = 'https://open-shelf.example/titles/9781800003019';
const MIRROR_LANDING = 'https://mirror-books.example/regression/supply';

const key = (code: string, productKey: string, discriminator: string) =>
  `COMMERCIAL|${code}|${productKey}|${discriminator}`;
const CAD_KEY = key('PRICE_NOT_AUTOMATIC', PDF, 'CAD');
const EUR_KEY = key('PRICE_REDUCED', PDF, 'EUR');
const GBP_KEY = key('PRICE_REDUCED', PDF, 'GBP');
const USD_KEY = key('PRICE_AMOUNT_CONFLICT', PDF, 'USD');
const HARDBACK_GBP_KEY = key('PRICE_REDUCED', HARDBACK, 'GBP');
/** The answer that takes the open-shelf supplier's USD retail price (incl. tax): its canonical path (#215 2B). */
const USD_CHOSEN = `${OPEN_SHELF}/Price[2]`;

const RECORDS: OnixRecordEntry[] = PRODUCTS.map((productKey, index) => ({
  index: index + 1,
  recordReference: `regression-press.${productKey.slice('product:gtin13:'.length)}`,
  disposition: 'COMPLETE',
  productKey,
  action: 'PLANNED',
}));

const finding = (
  code: string,
  classification: OnixPlanFindingEntry['classification'],
  productKey: string,
  blocking = false,
  resolution: OnixPlanFindingEntry['resolution'] = 'NONE',
  answer: OnixPlanFindingEntry['answer'] = 'NOT_APPLICABLE',
): OnixPlanFindingEntry => ({
  family: 'COMMERCIAL',
  code,
  classification,
  blocking,
  resolution,
  answer,
  productKey,
  groupKey: WORK,
});

const findings = (decided: boolean): OnixPlanFindingEntry[] => [
  // The mirror supplier's UnpricedItemType 04 (contact supplier) is no Price, and never zero (rules 33-35).
  finding('PRICE_UNPRICED', 'TARGET_UNREPRESENTABLE', PDF),
  // CAD is stated only with PriceQualifier 05: never taken automatically, a mandatory choice (rules 25, 32).
  finding('PRICE_NOT_AUTOMATIC', 'TARGET_INPUT_REQUIRED', PDF, true, 'CHOICE', decided ? 'ANSWERED' : 'UNANSWERED'),
  // EUR: the one retail amount is the default; the supplier's net price stays an optional override (#215 2B).
  finding('PRICE_REDUCED', 'SUPPORTED_WITH_WARNING', PDF, false, 'CHOICE', 'UNANSWERED'),
  // GBP: the same retail amount in both markets is one Price (rule 28).
  finding('PRICE_REDUCED', 'SUPPORTED_WITH_WARNING', PDF),
  // USD: retail amounts differ by market and tax basis; no order picks one (rule 29).
  finding('PRICE_AMOUNT_CONFLICT', 'TARGET_UNREPRESENTABLE', PDF, true, 'CHOICE', decided ? 'ANSWERED' : 'UNANSWERED'),
  // Markets, market publishing, suppliers, availability and supply dates are kept, disclosed, never lifecycle (11-17).
  finding('SUPPLY_NOT_REPRESENTED', 'TARGET_UNREPRESENTABLE', PDF),
  // WebsiteRole 01 (the publisher's corporate site) is never a Publication Location (rule 39).
  finding('LOCATION_WEBSITE_NOT_USED', 'TARGET_UNREPRESENTABLE', PDF),
  // The mirror's PUBLISHER_WEBSITE landing page cannot sit beside the canonical one on that platform (#187 3.3).
  finding('LOCATION_PLATFORM_CAPACITY', 'TARGET_UNREPRESENTABLE', PDF),
  finding('PRICE_REDUCED', 'SUPPORTED_WITH_WARNING', HARDBACK),
  finding('SUPPLY_NOT_REPRESENTED', 'TARGET_UNREPRESENTABLE', HARDBACK),
];

const candidate = (
  path: string,
  currencyCode: string,
  amount: string,
  priceType: string,
  exclusions: OnixTargetPriceCandidateEntry['exclusions'],
  lost: string[],
): OnixTargetPriceCandidateEntry => ({
  key: path,
  path,
  currencyCode,
  amount,
  unitPrice: Number(amount),
  priceType,
  exclusions,
  lost,
});

const CAD_CANDIDATE = candidate(
  `${PUBLISHER}/Price[5]`,
  'CAD',
  '30.00',
  '01',
  ['QUALIFIED'],
  ['PriceType', 'PriceQualifier', 'Market'],
);
const EUR_ALTERNATIVE = candidate(
  `${PUBLISHER}/Price[4]`,
  'EUR',
  '15.00',
  '05',
  ['TYPE_NOT_CONSUMER_RETAIL'],
  ['PriceType', 'Market'],
);
const USD_PUBLISHER = candidate(`${PUBLISHER}/Price[2]`, 'USD', '25.00', '01', [], ['PriceType', 'Market']);
const USD_OPEN_SHELF = candidate(USD_CHOSEN, 'USD', '27.50', '02', [], ['PriceType', 'Market']);

const marketFacts = (supply: string) => [
  `${supply}/Market[1]/Territory[1]`,
  `${supply}/MarketPublishingDetail[1]/MarketPublishingStatus[1]`,
  `${supply}/MarketPublishingDetail[1]/MarketDate[1]`,
];

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

const workIdentity = (product: string, productKey: string) => ({
  declarationKey: `${productKey}|${product}/RelatedMaterial[1]/RelatedWork[1]/WorkRelationCode[1]`,
  path: `${product}/RelatedMaterial[1]/RelatedWork[1]`,
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
  prices: { currencyCode: string; unitPrice: number }[],
  locations: { canonical: boolean; landingPage: string; fullTextUrl: string; locationPlatform: string }[],
) => ({
  type,
  isbn,
  prices,
  locations,
  accessibilityStandard: null,
  accessibilityAdditionalStandard: null,
  accessibilityException: null,
  accessibilityReportUrl: '',
});

const target = (decided: boolean): OnixTargetLedger => ({
  findings: [
    {
      family: 'COMMERCIAL',
      code: 'PRICE_UNPRICED',
      key: key('PRICE_UNPRICED', PDF, `${MIRROR}/UnpricedItemType[1]`),
      paths: [`${MIRROR}/UnpricedItemType[1]`],
    },
    { family: 'COMMERCIAL', code: 'PRICE_NOT_AUTOMATIC', key: CAD_KEY, paths: [`${PUBLISHER}/Price[5]`] },
    {
      family: 'COMMERCIAL',
      code: 'PRICE_REDUCED',
      key: EUR_KEY,
      paths: [`${PUBLISHER}/Price[3]`, `${PUBLISHER}/Price[4]`],
    },
    {
      family: 'COMMERCIAL',
      code: 'PRICE_REDUCED',
      key: GBP_KEY,
      paths: [`${PUBLISHER}/Price[1]`, `${OPEN_SHELF}/Price[1]`],
    },
    { family: 'COMMERCIAL', code: 'PRICE_AMOUNT_CONFLICT', key: USD_KEY, paths: [`${PUBLISHER}/Price[2]`, USD_CHOSEN] },
    {
      family: 'COMMERCIAL',
      code: 'SUPPLY_NOT_REPRESENTED',
      key: key('SUPPLY_NOT_REPRESENTED', PDF, 'supply'),
      paths: [
        ...marketFacts(PS1),
        `${PUBLISHER}/Supplier[1]`,
        `${PUBLISHER}/ProductAvailability[1]`,
        `${PUBLISHER}/SupplyDate[1]`,
        ...marketFacts(PS2),
        `${OPEN_SHELF}/Supplier[1]`,
        `${OPEN_SHELF}/ProductAvailability[1]`,
        `${MIRROR}/Supplier[1]`,
        `${MIRROR}/ProductAvailability[1]`,
        `${MIRROR}/SupplyDate[1]`,
      ],
    },
    {
      family: 'COMMERCIAL',
      code: 'LOCATION_WEBSITE_NOT_USED',
      key: key('LOCATION_WEBSITE_NOT_USED', PDF, PUBLISHER),
      paths: [`${PUBLISHER}/Supplier[1]/Website[3]`],
    },
    {
      family: 'COMMERCIAL',
      code: 'LOCATION_PLATFORM_CAPACITY',
      key: key('LOCATION_PLATFORM_CAPACITY', PDF, 'DIGITAL|PUBLISHER_WEBSITE'),
      paths: [`${MIRROR}/Supplier[1]/Website[1]/WebsiteLink[1]`],
    },
    { family: 'COMMERCIAL', code: 'PRICE_REDUCED', key: HARDBACK_GBP_KEY, paths: [`${HARDBACK_SUPPLIER}/Price[1]`] },
    {
      family: 'COMMERCIAL',
      code: 'SUPPLY_NOT_REPRESENTED',
      key: key('SUPPLY_NOT_REPRESENTED', HARDBACK, 'supply'),
      paths: [
        `${P2}/ProductSupply[1]/Market[1]/Territory[1]`,
        `${HARDBACK_SUPPLIER}/Supplier[1]`,
        `${HARDBACK_SUPPLIER}/ProductAvailability[1]`,
      ],
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
      // The global PublishingDetail decides the lifecycle; no market's status or date does (rule 15).
      lifecycle: { status: { kind: 'VALUE', status: 'ACTIVE' }, publicationDate: '2026-03-01', withdrawnDate: null },
      cover: { kind: 'ABSENT' },
      profileCover: { kind: 'ABSENT' },
    },
  ],
  commercial: [
    {
      productKey: PDF,
      // Both ProductSupply composites and all three SupplyDetails are kept, none chosen (rules 1-3, 5).
      supplies: [
        {
          path: PS1,
          marketPublishingStatus: '04',
          marketDates: [{ role: '01', date: '20260301' }],
          supplyDetails: [
            {
              path: PUBLISHER,
              supplierRole: '09',
              supplierName: 'Regression Press',
              availability: '20',
              supplyDates: [{ role: '08', date: '20260301' }],
              unpricedItemType: null,
              prices: [
                { path: `${PUBLISHER}/Price[1]`, type: '01', amount: '20.00', currency: 'GBP' },
                { path: `${PUBLISHER}/Price[2]`, type: '01', amount: '25.00', currency: 'USD' },
                { path: `${PUBLISHER}/Price[3]`, type: '01', amount: '22.00', currency: 'EUR' },
                { path: `${PUBLISHER}/Price[4]`, type: '05', amount: '15.00', currency: 'EUR' },
                { path: `${PUBLISHER}/Price[5]`, type: '01', amount: '30.00', currency: 'CAD' },
              ],
            },
          ],
        },
        {
          path: PS2,
          marketPublishingStatus: '04',
          marketDates: [{ role: '01', date: '20260415' }],
          supplyDetails: [
            {
              path: OPEN_SHELF,
              supplierRole: '11',
              supplierName: 'Open Shelf Platform',
              availability: '21',
              supplyDates: [],
              unpricedItemType: null,
              prices: [
                { path: `${OPEN_SHELF}/Price[1]`, type: '01', amount: '20.00', currency: 'GBP' },
                { path: USD_CHOSEN, type: '02', amount: '27.50', currency: 'USD' },
              ],
            },
            {
              path: MIRROR,
              supplierRole: '11',
              supplierName: 'Mirror Books',
              availability: '21',
              supplyDates: [{ role: '02', date: '20260415' }],
              unpricedItemType: '04',
              prices: [],
            },
          ],
        },
      ],
      // One decision per currency (rule 20), in currency order.
      prices: [
        {
          kind: 'CHOICE_REQUIRED',
          reason: 'NOT_AUTOMATIC',
          currencyCode: 'CAD',
          candidates: [CAD_CANDIDATE],
          paths: [`${PUBLISHER}/Price[5]`],
          findingKey: CAD_KEY,
        },
        {
          kind: 'DEFAULT_WITH_ALTERNATIVES',
          currencyCode: 'EUR',
          unitPrice: 22,
          paths: [`${PUBLISHER}/Price[3]`],
          alternatives: [EUR_ALTERNATIVE],
          findingKey: EUR_KEY,
        },
        {
          kind: 'SET',
          currencyCode: 'GBP',
          unitPrice: 20,
          paths: [`${PUBLISHER}/Price[1]`, `${OPEN_SHELF}/Price[1]`],
          findingKey: GBP_KEY,
        },
        {
          kind: 'CHOICE_REQUIRED',
          reason: 'AMOUNT_CONFLICT',
          currencyCode: 'USD',
          candidates: [USD_PUBLISHER, USD_OPEN_SHELF],
          paths: [`${PUBLISHER}/Price[2]`, USD_CHOSEN],
          findingKey: USD_KEY,
        },
      ],
      // The publisher's role-02 + role-29 pair is the one complete candidate: the canonical Location (rules 46, 54, 57).
      carriers: {
        DIGITAL: { kind: 'CANONICAL', landingPage: LANDING, fullTextUrl: FULL_TEXT, platform: 'PUBLISHER_WEBSITE' },
      },
      plannedLocations: [
        {
          landingPage: LANDING,
          fullTextUrl: FULL_TEXT,
          platform: 'PUBLISHER_WEBSITE',
          suppliers: ['Regression Press'],
          carriers: { DIGITAL: 'CANONICAL' },
        },
        // A supplier's work page (role 36) on OTHER follows the canonical Location (rules 41, 49, 56, 60).
        {
          landingPage: OPEN_SHELF_LANDING,
          fullTextUrl: '',
          platform: 'OTHER',
          suppliers: ['Open Shelf Platform'],
          carriers: { DIGITAL: 'NON_CANONICAL' },
        },
        // The mirror's role-02 page is on PUBLISHER_WEBSITE, which the canonical Location already holds (#187 3.3).
        {
          landingPage: MIRROR_LANDING,
          fullTextUrl: '',
          platform: 'PUBLISHER_WEBSITE',
          suppliers: ['Mirror Books'],
          carriers: { DIGITAL: 'NOT_CREATED' },
        },
      ],
    },
    {
      productKey: HARDBACK,
      supplies: [
        {
          path: `${P2}/ProductSupply[1]`,
          marketPublishingStatus: null,
          marketDates: [],
          supplyDetails: [
            {
              path: HARDBACK_SUPPLIER,
              supplierRole: '01',
              supplierName: 'Regression Press',
              availability: '20',
              supplyDates: [],
              unpricedItemType: null,
              prices: [{ path: `${HARDBACK_SUPPLIER}/Price[1]`, type: '02', amount: '35.00', currency: 'GBP' }],
            },
          ],
        },
      ],
      // Tax never makes a price non-automatic; its basis is a disclosed loss (rule 26).
      prices: [
        {
          kind: 'SET',
          currencyCode: 'GBP',
          unitPrice: 35,
          paths: [`${HARDBACK_SUPPLIER}/Price[1]`],
          findingKey: HARDBACK_GBP_KEY,
        },
      ],
      carriers: {
        PHYSICAL: { kind: 'CANONICAL', landingPage: LANDING, fullTextUrl: '', platform: 'PUBLISHER_WEBSITE' },
      },
      plannedLocations: [
        {
          landingPage: LANDING,
          fullTextUrl: '',
          platform: 'PUBLISHER_WEBSITE',
          suppliers: ['Regression Press'],
          carriers: { PHYSICAL: 'CANONICAL' },
        },
      ],
    },
  ],
  // How every Price of every planned Publication is decided (#215 2B): automatic, chosen, or declined.
  priceResolutions: [
    ...(decided
      ? [
          {
            productKey: PDF,
            findingKey: CAD_KEY,
            currencyCode: 'CAD',
            basis: 'PUBLISHER_OMISSION' as const,
            unitPrice: null,
            paths: [`${PUBLISHER}/Price[5]`],
          },
        ]
      : []),
    {
      productKey: PDF,
      findingKey: EUR_KEY,
      currencyCode: 'EUR',
      basis: 'AUTOMATIC',
      unitPrice: 22,
      paths: [`${PUBLISHER}/Price[3]`],
    },
    {
      productKey: PDF,
      findingKey: GBP_KEY,
      currencyCode: 'GBP',
      basis: 'AUTOMATIC',
      unitPrice: 20,
      paths: [`${PUBLISHER}/Price[1]`, `${OPEN_SHELF}/Price[1]`],
    },
    ...(decided
      ? [
          {
            productKey: PDF,
            findingKey: USD_KEY,
            currencyCode: 'USD',
            basis: 'PUBLISHER_CHOICE' as const,
            unitPrice: 27.5,
            paths: [USD_CHOSEN],
          },
        ]
      : []),
    {
      productKey: HARDBACK,
      findingKey: HARDBACK_GBP_KEY,
      currencyCode: 'GBP',
      basis: 'AUTOMATIC',
      unitPrice: 35,
      paths: [`${HARDBACK_SUPPLIER}/Price[1]`],
    },
  ],
  rights: {
    products: [silentRights(PDF, 'DIGITAL'), silentRights(HARDBACK, 'PHYSICAL')],
    groups: [{ groupKey: WORK, licence: { kind: 'UNSET' } }],
    licenceActions: [{ groupKey: WORK, action: { kind: 'UNSET' } }],
    acknowledgedFindingKeys: [],
  },
  accessibility: {
    products: [noFeatures(PDF, Pdf, 'DIGITAL'), noFeatures(HARDBACK, Hardback, 'PHYSICAL')],
    contacts: [],
    actions: [created(PDF, Pdf), created(HARDBACK, Hardback)],
  },
  components: [],
  relatedMaterial: {
    outcomes: [workIdentity(P1, PDF), workIdentity(P2, HARDBACK)],
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
            publications: [
              // The declined CAD decision creates no Price; the canonical Location is first, then the OTHER one (#187).
              publication(
                Pdf,
                '9781800003019',
                [
                  { currencyCode: 'EUR', unitPrice: 22 },
                  { currencyCode: 'GBP', unitPrice: 20 },
                  { currencyCode: 'USD', unitPrice: 27.5 },
                ],
                [
                  {
                    canonical: true,
                    landingPage: LANDING,
                    fullTextUrl: FULL_TEXT,
                    locationPlatform: 'PUBLISHER_WEBSITE',
                  },
                  { canonical: false, landingPage: OPEN_SHELF_LANDING, fullTextUrl: '', locationPlatform: 'OTHER' },
                ],
              ),
              publication(
                Hardback,
                '9781800003026',
                [{ currencyCode: 'GBP', unitPrice: 35 }],
                [{ canonical: true, landingPage: LANDING, fullTextUrl: '', locationPlatform: 'PUBLISHER_WEBSITE' }],
              ),
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

const productBlocker = (code: string, classification: 'TARGET_INPUT_REQUIRED' | 'TARGET_UNREPRESENTABLE') => ({
  code,
  classification,
  recordKey: 'record:1',
  productKey: PDF,
  groupKey: WORK,
});

const planning = (decided: boolean): OnixPlanningExpectation => ({
  executable: decided,
  records: RECORDS,
  products: [
    {
      productKey: PDF,
      groupKey: WORK,
      isbn: '9781800003019',
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
    {
      productKey: HARDBACK,
      groupKey: WORK,
      isbn: '9781800003026',
      manifestation: { kind: 'RESOLVED', type: Hardback, classification: 'SUPPORTED_LOSSLESS', notes: [] },
      publicationType: Hardback,
      action: 'CREATE_PUBLICATION',
      executable: decided,
    },
  ],
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
        // Each mandatory price decision holds the plan with its own finding's classification.
        productBlocker('COMMERCIAL_CHOICE_REQUIRED', 'TARGET_INPUT_REQUIRED'),
        productBlocker('COMMERCIAL_CHOICE_REQUIRED', 'TARGET_UNREPRESENTABLE'),
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
              fullTitle: 'Supply in Several Markets',
              title: 'Supply in Several Markets',
              subtitle: '',
            },
          ],
          publications: [
            { type: 'PDF', isbn: '9781800003019' },
            { type: 'HARDBACK', isbn: '9781800003026' },
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
  id: 'target-supply-prices-locations',
  status: 'CONTRACT',
  purpose:
    'Proves that every ProductSupply, SupplyDetail and Price is kept; that one Price per currency is decided without ' +
    'source-order winners - deduplicated, defaulted with an optional alternative, or a mandatory choice; that an ' +
    'unpriced supplier, availability and supply dates never become Prices or lifecycle; and that supplier websites ' +
    'become a canonical Location, a non-canonical one and a platform-capacity loss, created canonical first.',
  source: {
    origin: 'SYNTHETIC',
    provenance:
      'Written for thoth-app#249. Every name, identifier, price and URL is invented; the ISBNs carry valid check ' +
      'characters and the Work DOI uses the 10.5555 test prefix. The canonical source gate admits it with no finding.',
    sha256: 'f5ced054f2b53539bb8cfda382924cf1672909c230f1750ee2c56b5b18d1ee04',
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
    '/onix:ONIXMessage/onix:Product[1]/onix:ProductSupply/onix:SupplyDetail/onix:Supplier/onix:SupplierName': [
      'Regression Press',
      'Open Shelf Platform',
      'Mirror Books',
    ],
    '/onix:ONIXMessage/onix:Product[1]/onix:ProductSupply/onix:SupplyDetail/onix:Price/onix:CurrencyCode': [
      'GBP',
      'USD',
      'EUR',
      'EUR',
      'CAD',
      'GBP',
      'USD',
    ],
    '/onix:ONIXMessage/onix:Product[1]/onix:ProductSupply/onix:SupplyDetail/onix:UnpricedItemType': ['04'],
    '/onix:ONIXMessage/onix:Product[1]/onix:ProductSupply/onix:SupplyDetail/onix:Supplier/onix:Website/onix:WebsiteRole':
      ['02', '29', '01', '36', '02'],
  },
  scenarios: [
    {
      name: 'as uploaded, before any publisher decision',
      target: 'EMPTY_PUBLISHER',
      planning: planning(false),
      outcomes: {
        SUPPORTED_LOSSLESS: 1,
        SUPPORTED_NORMALIZED: 1,
        SUPPORTED_WITH_WARNING: 3,
        TARGET_UNREPRESENTABLE: 7,
        TARGET_INPUT_REQUIRED: 3,
      },
    },
    {
      name: 'publisher takes MONOGRAPH, chooses the open-shelf USD price and declines the qualified CAD price',
      target: 'EMPTY_PUBLISHER',
      inputs: { fileWorkType: Monograph, commercialChoices: { [USD_KEY]: USD_CHOSEN, [CAD_KEY]: 'OMIT' } },
      planning: planning(true),
      outcomes: {
        SUPPORTED_LOSSLESS: 1,
        SUPPORTED_NORMALIZED: 1,
        SUPPORTED_WITH_WARNING: 3,
        TARGET_UNREPRESENTABLE: 6,
        TARGET_INPUT_REQUIRED: 1,
      },
    },
  ],
});
