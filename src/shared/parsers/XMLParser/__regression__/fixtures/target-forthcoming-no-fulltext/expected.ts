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
 * A forthcoming frontlist Work in three manifestations, none of which states a full-text resource (thoth-app#249):
 * a PDF whose only supplier website is a landing page and whose price is "to be announced", a paperback with that
 * same landing page and a positive price, and an EPUB with no ProductSupply at all.
 *
 * Contract authority: lifecycle `5542084141` rules 33, 47, 51 (approved `5543477343`); ProductSupply `5541821365`
 * rules 11-17, 33-35, 41, 46, 53-59 (approved `5541897557`), #215 Amendment 1 `5713644155`, #219 Amendment 1
 * `5732005878` and the #187 Location amendments `5941874544`/`5948710990`; manifestation `5543749368` rules 20-28.
 */

const PDF = 'product:gtin13:9781800002012';
const PAPERBACK = 'product:gtin13:9781800002029';
const EPUB = 'product:gtin13:9781800002036';
const WORK = `work:${PDF}`;
const PRODUCTS = [PDF, PAPERBACK, EPUB];

const P = (n: number) => `/ONIXMessage[1]/Product[${n}]`;
const LANDING_PAGE = 'https://regression-press.example/books/frontlist';
const DOI = 'https://doi.org/10.5555/regression.d102';

const RECORDS: OnixRecordEntry[] = PRODUCTS.map((productKey, index) => ({
  index: index + 1,
  recordReference: `regression-press.${productKey.slice('product:gtin13:'.length)}`,
  // NotificationType 02 (advance notification, confirmed) is a complete record (5545771626 rule 12).
  disposition: 'COMPLETE',
  productKey,
  action: 'PLANNED',
}));

const deliveryEb = [{ code: 'DELIVERY_MODE_NOT_REPRESENTED', detail: 'EB' }] as const;

const products = (executable: boolean): OnixProductEntry[] => [
  {
    productKey: PDF,
    groupKey: WORK,
    isbn: '9781800002012',
    // EB + E107 is a PDF; the delivery mode is a disclosed loss (5543749368 rules 24, 28).
    manifestation: { kind: 'RESOLVED', type: Pdf, classification: 'SUPPORTED_NORMALIZED', notes: [...deliveryEb] },
    publicationType: Pdf,
    action: 'CREATE_PUBLICATION',
    executable,
  },
  {
    productKey: PAPERBACK,
    groupKey: WORK,
    isbn: '9781800002029',
    manifestation: { kind: 'RESOLVED', type: Paperback, classification: 'SUPPORTED_LOSSLESS', notes: [] },
    publicationType: Paperback,
    action: 'CREATE_PUBLICATION',
    executable,
  },
  {
    productKey: EPUB,
    groupKey: WORK,
    isbn: '9781800002036',
    manifestation: { kind: 'RESOLVED', type: Epub, classification: 'SUPPORTED_NORMALIZED', notes: [...deliveryEb] },
    publicationType: Epub,
    action: 'CREATE_PUBLICATION',
    executable,
  },
];

const disclosure = (
  code: string,
  classification: OnixPlanFindingEntry['classification'],
  productKey: string,
): OnixPlanFindingEntry => ({
  family: 'COMMERCIAL',
  code,
  classification,
  blocking: false,
  resolution: 'NONE',
  answer: 'NOT_APPLICABLE',
  productKey,
  groupKey: WORK,
});

/** Nothing about supply, price or Location waits on the publisher: frontlist metadata imports as it stands. */
const FINDINGS: OnixPlanFindingEntry[] = [
  // UnpricedItemType 02 (price to be announced) never becomes a zero Price (rules 33-35; #215 Amendment 1).
  disclosure('PRICE_UNPRICED', 'TARGET_UNREPRESENTABLE', PDF),
  // Territory, supplier, ProductAvailability 10 and SupplyDate 08 are supply facts, never the Work's lifecycle (11-17).
  disclosure('SUPPLY_NOT_REPRESENTED', 'TARGET_UNREPRESENTABLE', PDF),
  // A digital half Location with no complete candidate: the PDF imports with no Location (rules 54, 59, 81).
  disclosure('LOCATION_INCOMPLETE', 'SUPPORTED_WITH_WARNING', PDF),
  // The one ordinary retail price is the paperback's GBP Price; its price type and territory are lost (rule 27).
  disclosure('PRICE_REDUCED', 'SUPPORTED_WITH_WARNING', PAPERBACK),
  disclosure('SUPPLY_NOT_REPRESENTED', 'TARGET_UNREPRESENTABLE', PAPERBACK),
];

const supplyDetail = (n: number) => `${P(n)}/ProductSupply[1]/SupplyDetail[1]`;
const GBP_PRICE = `${supplyDetail(2)}/Price[1]`;
const GBP_KEY = `COMMERCIAL|PRICE_REDUCED|${PAPERBACK}|GBP`;

type StatedPrice = { path: string; type: string | null; amount: string | null; currency: string | null };

const supply = (n: number, unpricedItemType: string | null, prices: StatedPrice[]) => [
  {
    path: `${P(n)}/ProductSupply[1]`,
    marketPublishingStatus: null,
    marketDates: [],
    supplyDetails: [
      {
        path: supplyDetail(n),
        supplierRole: '09',
        supplierName: 'Regression Press',
        // Not yet available, expected on the publication date: supply evidence only (rules 11-14).
        availability: '10',
        supplyDates: [{ role: '08', date: '20270315' }],
        unpricedItemType,
        prices,
      },
    ],
  },
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

const NO_ACCESSIBILITY = {
  accessibilityStandard: null,
  accessibilityAdditionalStandard: null,
  accessibilityException: null,
  accessibilityReportUrl: null,
};

const created = (productKey: string, publicationType: PublicationTypeValue) => ({
  productKey,
  publicationType,
  resolved: NO_ACCESSIBILITY,
  sources: [],
  omitted: [],
  action: 'CREATE' as const,
});

const workIdentity = (n: number, productKey: string) => ({
  declarationKey: `${productKey}|${P(n)}/RelatedMaterial[1]/RelatedWork[1]/WorkRelationCode[1]`,
  path: `${P(n)}/RelatedMaterial[1]/RelatedWork[1]`,
  productKey,
  construct: 'RELATED_WORK' as const,
  code: '01',
  outcome: 'WORK_IDENTITY' as const,
  endpoint: null,
  relationType: null,
  edgeKey: null,
});

const EMPTY_ORDERING = {
  BOOK_REVIEW: { status: 'EMPTY' },
  ENDORSEMENT: { status: 'EMPTY' },
  AWARD: { status: 'EMPTY' },
} as const;

const target = (executable: boolean): OnixTargetLedger => ({
  findings: [
    {
      family: 'COMMERCIAL',
      code: 'PRICE_UNPRICED',
      key: `COMMERCIAL|PRICE_UNPRICED|${PDF}|${supplyDetail(1)}/UnpricedItemType[1]`,
      paths: [`${supplyDetail(1)}/UnpricedItemType[1]`],
    },
    {
      family: 'COMMERCIAL',
      code: 'SUPPLY_NOT_REPRESENTED',
      key: `COMMERCIAL|SUPPLY_NOT_REPRESENTED|${PDF}|supply`,
      paths: [
        `${P(1)}/ProductSupply[1]/Market[1]/Territory[1]`,
        `${supplyDetail(1)}/Supplier[1]`,
        `${supplyDetail(1)}/ProductAvailability[1]`,
        `${supplyDetail(1)}/SupplyDate[1]`,
      ],
    },
    {
      family: 'COMMERCIAL',
      code: 'LOCATION_INCOMPLETE',
      key: `COMMERCIAL|LOCATION_INCOMPLETE|${PDF}|DIGITAL|${supplyDetail(1)}/Supplier[1]/Website[1]/WebsiteLink[1]`,
      paths: [`${supplyDetail(1)}/Supplier[1]/Website[1]/WebsiteLink[1]`],
    },
    { family: 'COMMERCIAL', code: 'PRICE_REDUCED', key: GBP_KEY, paths: [GBP_PRICE] },
    {
      family: 'COMMERCIAL',
      code: 'SUPPLY_NOT_REPRESENTED',
      key: `COMMERCIAL|SUPPLY_NOT_REPRESENTED|${PAPERBACK}|supply`,
      paths: [
        `${P(2)}/ProductSupply[1]/Market[1]/Territory[1]`,
        `${supplyDetail(2)}/Supplier[1]`,
        `${supplyDetail(2)}/ProductAvailability[1]`,
        `${supplyDetail(2)}/SupplyDate[1]`,
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
      // PublishingStatus 02 is Forthcoming exactly, dated by its role-01 expected publication date (rules 33, 47).
      lifecycle: {
        status: { kind: 'VALUE', status: 'FORTHCOMING' },
        publicationDate: '2027-03-15',
        withdrawnDate: null,
      },
      cover: { kind: 'ABSENT' },
      profileCover: { kind: 'ABSENT' },
    },
  ],
  commercial: [
    {
      productKey: PDF,
      supplies: supply(1, '02', []),
      prices: [],
      // No candidate can be a canonical digital Location, so the PDF has none (rule 59) ...
      carriers: { DIGITAL: { kind: 'NONE' } },
      // ... and the landing page it states stays planned, never created and never completed (rules 54, 56).
      plannedLocations: [
        {
          landingPage: LANDING_PAGE,
          fullTextUrl: '',
          platform: 'PUBLISHER_WEBSITE',
          suppliers: ['Regression Press'],
          carriers: { DIGITAL: 'NOT_CREATED' },
        },
      ],
    },
    {
      productKey: PAPERBACK,
      supplies: supply(2, null, [{ path: GBP_PRICE, type: '02', amount: '19.99', currency: 'GBP' }]),
      prices: [{ kind: 'SET', currencyCode: 'GBP', unitPrice: 19.99, paths: [GBP_PRICE], findingKey: GBP_KEY }],
      // A paperback Location needs one URL: the role-02 landing page is its canonical Location (rules 46, 55, 57).
      carriers: {
        PHYSICAL: { kind: 'CANONICAL', landingPage: LANDING_PAGE, fullTextUrl: '', platform: 'PUBLISHER_WEBSITE' },
      },
      plannedLocations: [
        {
          landingPage: LANDING_PAGE,
          fullTextUrl: '',
          platform: 'PUBLISHER_WEBSITE',
          suppliers: ['Regression Press'],
          carriers: { PHYSICAL: 'CANONICAL' },
        },
      ],
    },
    // No ProductSupply at all: a frontlist Publication with no Location and no Price (rule 53).
    { productKey: EPUB, supplies: [], prices: [], carriers: { DIGITAL: { kind: 'NONE' } }, plannedLocations: [] },
  ],
  priceResolutions: [
    {
      productKey: PAPERBACK,
      findingKey: GBP_KEY,
      currencyCode: 'GBP',
      basis: 'AUTOMATIC',
      unitPrice: 19.99,
      paths: [GBP_PRICE],
    },
  ],
  rights: {
    products: [silentRights(PDF, 'DIGITAL'), silentRights(PAPERBACK, 'PHYSICAL'), silentRights(EPUB, 'DIGITAL')],
    groups: [{ groupKey: WORK, licence: { kind: 'UNSET' } }],
    licenceActions: [{ groupKey: WORK, action: { kind: 'UNSET' } }],
    acknowledgedFindingKeys: [],
  },
  accessibility: {
    products: [
      noFeatures(PDF, Pdf, 'DIGITAL'),
      noFeatures(PAPERBACK, Paperback, 'PHYSICAL'),
      noFeatures(EPUB, Epub, 'DIGITAL'),
    ],
    contacts: [],
    actions: [created(PDF, Pdf), created(PAPERBACK, Paperback), created(EPUB, Epub)],
  },
  components: [],
  relatedMaterial: {
    outcomes: [workIdentity(1, PDF), workIdentity(2, PAPERBACK), workIdentity(3, EPUB)],
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
    candidates: [{ scope: 'WORK', key: WORK, reviews: [], endorsements: [], prizes: [], ordering: EMPTY_ORDERING }],
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
  plan: executable
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
              publication(Pdf, '9781800002012', [], []),
              publication(
                Paperback,
                '9781800002029',
                [{ currencyCode: 'GBP', unitPrice: 19.99 }],
                [
                  {
                    canonical: true,
                    landingPage: LANDING_PAGE,
                    fullTextUrl: '',
                    locationPlatform: 'PUBLISHER_WEBSITE',
                  },
                ],
              ),
              publication(Epub, '9781800002036', [], []),
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

function publication(
  type: PublicationTypeValue,
  isbn: string,
  prices: { currencyCode: string; unitPrice: number }[],
  locations: { canonical: boolean; landingPage: string; fullTextUrl: string; locationPlatform: string }[],
) {
  return {
    type,
    isbn,
    prices,
    locations,
    accessibilityStandard: null,
    accessibilityAdditionalStandard: null,
    accessibilityException: null,
    accessibilityReportUrl: '',
  };
}

const EDITION = { status: 'RESOLVED', edition: 1, basis: 'DEFAULT_FIRST_EDITION' } as const;
const WORK_DOI = { kind: 'DOI', doi: DOI, basis: 'WORK_IDENTIFIER' } as const;

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
      edition: EDITION,
      workDoi: WORK_DOI,
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
      ],
  findings: FINDINGS,
  works: decided
    ? [
        {
          type: 'MONOGRAPH',
          // Forthcoming, with its expected publication date: never ACTIVE, never today's date (rules 33, 55).
          status: 'FORTHCOMING',
          doi: DOI,
          edition: 1,
          publicationDate: '2027-03-15',
          pageCount: 0,
          titles: [
            {
              canonical: true,
              localeCode: 'EN',
              fullTitle: 'Frontlist Without a Full Text',
              title: 'Frontlist Without a Full Text',
              subtitle: '',
            },
          ],
          publications: [
            { type: 'PDF', isbn: '9781800002012' },
            { type: 'PAPERBACK', isbn: '9781800002029' },
            { type: 'EPUB', isbn: '9781800002036' },
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
  id: 'target-forthcoming-no-fulltext',
  status: 'CONTRACT',
  purpose:
    'Proves that a forthcoming frontlist Work with no full-text resource imports as FORTHCOMING with its expected ' +
    'publication date, that supplier availability and supply dates never become its lifecycle, that an unpriced ' +
    'Product gets no Price and a digital landing page alone no Location, and that a paperback keeps its one-URL Location.',
  source: {
    origin: 'SYNTHETIC',
    provenance:
      'Written for thoth-app#249. Every name, identifier, price and URL is invented; the ISBNs carry valid check ' +
      'characters and the Work DOI uses the 10.5555 test prefix. The canonical source gate admits it with no finding.',
    sha256: 'c657d38a5080e99ed1d219dabb213843fcd613523c827b388d02c04d8e26d755',
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
    '/onix:ONIXMessage/onix:Product/onix:NotificationType': ['02', '02', '02'],
    '/onix:ONIXMessage/onix:Product/onix:PublishingDetail/onix:PublishingStatus': ['02', '02', '02'],
    '/onix:ONIXMessage/onix:Product/onix:PublishingDetail/onix:PublishingDate/onix:Date': [
      '20270315',
      '20270315',
      '20270315',
    ],
    '/onix:ONIXMessage/onix:Product/onix:ProductSupply/onix:SupplyDetail/onix:ProductAvailability': ['10', '10'],
    '/onix:ONIXMessage/onix:Product/onix:ProductSupply/onix:SupplyDetail/onix:Supplier/onix:Website/onix:WebsiteRole': [
      '02',
      '02',
    ],
  },
  scenarios: [
    {
      name: 'as uploaded, before any publisher decision',
      target: 'EMPTY_PUBLISHER',
      planning: planning(false),
      outcomes: {
        SUPPORTED_LOSSLESS: 1,
        SUPPORTED_NORMALIZED: 2,
        SUPPORTED_WITH_WARNING: 2,
        TARGET_UNREPRESENTABLE: 3,
        TARGET_INPUT_REQUIRED: 1,
      },
    },
    {
      name: 'publisher takes MONOGRAPH as the file WorkType',
      target: 'EMPTY_PUBLISHER',
      inputs: { fileWorkType: Monograph },
      planning: planning(true),
      outcomes: {
        SUPPORTED_LOSSLESS: 1,
        SUPPORTED_NORMALIZED: 2,
        SUPPORTED_WITH_WARNING: 2,
        TARGET_UNREPRESENTABLE: 3,
      },
    },
  ],
});
