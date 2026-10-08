import { LanguageCode, LanguageRelation, LocaleCode } from '@/gql/graphql';
import { appConfig } from '@/src/shared/config';
import { PublicationType } from '@/src/shared/constants/publications';
import { WorkStatuses, WorkTypes } from '@/src/shared/constants/work';
import { getDefaultPublication } from '@/src/shared/utils/publications';
import { getDefaultTitle, getDefaultWork } from '@/src/shared/utils/work';

import { defineOnixRegressionFixture } from '../../fixtureSources';
import { ONIX_REGRESSION_PUBLISHER_ID } from '../../pipeline';
import type {
  OnixExecutionLedger,
  OnixExistingTargetState,
  OnixPlanningExpectation,
  OnixTargetLedger,
} from '../../types';

const { Epub, Paperback, Pdf } = PublicationType.enum;
const { Monograph } = WorkTypes.enum;

/**
 * An existing Work gains a format, beside a new Work (thoth-app#250). The first two Products are the PDF and EPUB of the
 * Work DOI `10.5555/regression.e02`, which Thoth holds with only the PDF; the third is the paperback of a new Work by a
 * contributor and an institution Thoth already holds.
 *
 * Contract authority: the existing-target actions (#182, `resolveGroupTarget`); the compatibility of an attachment with
 * the exact existing Work, compared family by family with its canonical reductions (#183 specification amendments
 * `5665475597`, `5667182357`), and attachment executed only from the exact Publication the adapter built before
 * confirmation (#187); an existing Work's licence is preserved, never replaced (#217, 5568901904 rules 119-124); a
 * Product already in Thoth creates no Publication, so its supply holds nothing back and none of it is written (#215); the
 * canonical Location first, then the non-canonical one (#187 CR-1, CR-2); an exact ORCID and an exact ROR name the one
 * existing contributor and institution, never a name match (#183, #209). Until the new Work's WorkType is chosen, nothing
 * of the file - the attachment included - is executable (#186).
 */

const PDF = 'product:gtin13:9781800060029';
const EPUB = 'product:gtin13:9781800060036';
const PAPERBACK = 'product:gtin13:9781800060043';
const EXISTING_GROUP = `work:${PDF}`;
const NEW_GROUP = `work:${PAPERBACK}`;
const IMPRINT = '11111111-1111-4111-8111-111111111111';
const DOI = 'https://doi.org/10.5555/regression.e02';
const NEW_DOI = 'https://doi.org/10.5555/regression.e03';
const WORK_ID = '00000000-0000-4000-8000-000000250201';
const PDF_PUBLICATION_ID = '00000000-0000-4000-8000-000000250202';
const CONTRIBUTOR_ID = '00000000-0000-4000-8000-000000250301';
const INSTITUTION_ID = '00000000-0000-4000-8000-000000250401';
const TITLE = 'An Existing Work Gains a Format';
const LICENCE = 'https://creativecommons.org/licenses/by/4.0/';
const ORCID = 'https://orcid.org/0000-0002-1825-0097';
const ROR = 'https://ror.org/05reg2e51';
const LANDING = 'https://regression-press.example/books/gains-a-format';
const FULL_TEXT = 'https://regression-press.example/books/gains-a-format/full.epub';
const OPEN_SHELF = 'https://open-shelf.example/titles/9781800060036';
const P = (product: number) => `/ONIXMessage[1]/Product[${product}]`;
const SUPPLY = (product: number) => `${P(product)}/ProductSupply[1]`;

/**
 * The existing Work, exactly as `WorkService.getWork` returns it: the PDF only, and Work metadata the file never states -
 * a licence and a landing page - which nothing in this import may replace.
 */
const EXISTING_WORK = getDefaultWork({
  id: WORK_ID,
  type: Monograph,
  status: WorkStatuses.enum.Active,
  imprintId: IMPRINT,
  imprintName: 'Regression Press',
  doi: DOI,
  edition: 1,
  publicationDate: '2025-03-01',
  license: LICENCE,
  landingPage: 'https://regression-press.example/books/an-existing-work',
  titles: [
    getDefaultTitle({
      id: '00000000-0000-4000-8000-000000250203',
      canonical: true,
      title: TITLE,
      fullTitle: TITLE,
      localeCode: LocaleCode.En,
    }),
  ],
  languages: [
    { id: '00000000-0000-4000-8000-000000250204', code: LanguageCode.Eng, relation: LanguageRelation.Original },
  ],
  publications: [getDefaultPublication({ id: PDF_PUBLICATION_ID, type: Pdf, isbn: '978-1-80006-002-9' })],
});

const MATCH = { workId: WORK_ID, title: TITLE, imprintId: IMPRINT, doi: DOI, isbns: ['978-1-80006-002-9'] };

/**
 * What Thoth holds. The publisher-scoped exact lookup is asked every identifier the file carries, once: the Work DOI and
 * the PDF's ISBN name the existing Work, and nothing names the EPUB, the new Work's DOI or the paperback. The existing Work
 * is read back once. Only the new Work is adapted, so only its contributor's ORCID and affiliation ROR are looked up -
 * each by its exact identifier.
 */
const THOTH: OnixExistingTargetState = {
  kind: 'EXISTING_TARGET',
  reads: [
    {
      method: 'findWorks',
      publisherId: ONIX_REGRESSION_PUBLISHER_ID,
      identifiers: [
        { basis: 'doi', value: DOI },
        { basis: 'doi', value: NEW_DOI },
        { basis: 'isbn', value: '9781800060029' },
        { basis: 'isbn', value: '9781800060036' },
        { basis: 'isbn', value: '9781800060043' },
      ],
      matches: {
        [`doi:${DOI}`]: [MATCH],
        [`doi:${NEW_DOI}`]: [],
        'isbn:9781800060029': [MATCH],
        'isbn:9781800060036': [],
        'isbn:9781800060043': [],
      },
    },
    { method: 'getWork', workId: WORK_ID, work: EXISTING_WORK },
    {
      method: 'getContributorsByOrcids',
      orcids: [ORCID],
      contributors: [
        {
          id: CONTRIBUTOR_ID,
          name: 'Ada Lovelace',
          orcid: ORCID,
          updatedAt: '2026-01-01T00:00:00Z',
          lastName: 'Lovelace',
          fullName: 'Ada Lovelace',
          firstName: 'Ada',
          website: '',
          lastContributionTitle: '',
        },
      ],
    },
    {
      method: 'getInstitutions',
      offset: 0,
      limit: appConfig.data.maxItemsPerRequestLimit,
      filter: ROR,
      institutions: [
        {
          id: INSTITUTION_ID,
          name: 'Regression University',
          doi: '',
          ror: ROR,
          countryCode: 'GBR',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ],
    },
  ],
};

const commercialFinding = (code: 'PRICE_REDUCED' | 'SUPPLY_NOT_REPRESENTED', product: string) => ({
  family: 'COMMERCIAL' as const,
  code,
  classification: code === 'PRICE_REDUCED' ? ('SUPPORTED_WITH_WARNING' as const) : ('TARGET_UNREPRESENTABLE' as const),
  blocking: false,
  resolution: 'NONE' as const,
  answer: 'NOT_APPLICABLE' as const,
  productKey: product,
  groupKey: EXISTING_GROUP,
});

const FINDINGS: OnixPlanningExpectation['findings'] = [
  {
    family: 'DESCRIPTIVE',
    code: 'CONTRIBUTOR_MAIN_NORMALISED',
    classification: 'SUPPORTED_NORMALIZED',
    blocking: false,
    resolution: 'NONE',
    answer: 'NOT_APPLICABLE',
    productKey: PAPERBACK,
    groupKey: NEW_GROUP,
  },
  // The existing Work's licence is kept as Thoth holds it; the file states none to replace it with.
  {
    family: 'LICENCE_RECONCILIATION',
    code: 'RIGHTS_EXISTING_LICENCE_PRESERVED',
    classification: 'SUPPORTED_NORMALIZED',
    blocking: false,
    resolution: 'NONE',
    answer: 'NOT_APPLICABLE',
    productKey: null,
    groupKey: EXISTING_GROUP,
  },
  // The PDF's own supply is disclosed like any Product's, and - already in Thoth - written nowhere.
  commercialFinding('PRICE_REDUCED', PDF),
  commercialFinding('SUPPLY_NOT_REPRESENTED', PDF),
  commercialFinding('PRICE_REDUCED', EPUB),
  commercialFinding('SUPPLY_NOT_REPRESENTED', EPUB),
];

const price = (product: number, detail: number, amount: string) => ({
  path: `${SUPPLY(product)}/SupplyDetail[${detail}]/Price[1]`,
  type: '01',
  amount,
  currency: 'EUR',
});

const TARGET = (answered: boolean): OnixTargetLedger => ({
  findings: [
    {
      family: 'DESCRIPTIVE',
      code: 'CONTRIBUTOR_MAIN_NORMALISED',
      key: `CONTRIBUTORS|CONTRIBUTOR_MAIN_NORMALISED|${PAPERBACK}|`,
      paths: [`${P(3)}/DescriptiveDetail[1]/Contributor[1]`],
    },
    {
      family: 'LICENCE_RECONCILIATION',
      code: 'RIGHTS_EXISTING_LICENCE_PRESERVED',
      key: `RIGHTS|RIGHTS_EXISTING_LICENCE_PRESERVED|${EXISTING_GROUP}`,
      paths: [],
    },
    {
      family: 'COMMERCIAL',
      code: 'PRICE_REDUCED',
      key: `COMMERCIAL|PRICE_REDUCED|${PDF}|EUR`,
      paths: [`${SUPPLY(1)}/SupplyDetail[1]/Price[1]`],
    },
    {
      family: 'COMMERCIAL',
      code: 'SUPPLY_NOT_REPRESENTED',
      key: `COMMERCIAL|SUPPLY_NOT_REPRESENTED|${PDF}|supply`,
      paths: [
        `${SUPPLY(1)}/Market[1]/Territory[1]`,
        `${SUPPLY(1)}/SupplyDetail[1]/Supplier[1]`,
        `${SUPPLY(1)}/SupplyDetail[1]/ProductAvailability[1]`,
      ],
    },
    {
      family: 'COMMERCIAL',
      code: 'PRICE_REDUCED',
      key: `COMMERCIAL|PRICE_REDUCED|${EPUB}|EUR`,
      paths: [`${SUPPLY(2)}/SupplyDetail[1]/Price[1]`, `${SUPPLY(2)}/SupplyDetail[2]/Price[1]`],
    },
    {
      family: 'COMMERCIAL',
      code: 'SUPPLY_NOT_REPRESENTED',
      key: `COMMERCIAL|SUPPLY_NOT_REPRESENTED|${EPUB}|supply`,
      paths: [
        `${SUPPLY(2)}/Market[1]/Territory[1]`,
        `${SUPPLY(2)}/SupplyDetail[1]/Supplier[1]`,
        `${SUPPLY(2)}/SupplyDetail[1]/ProductAvailability[1]`,
        `${SUPPLY(2)}/SupplyDetail[2]/Supplier[1]`,
        `${SUPPLY(2)}/SupplyDetail[2]/ProductAvailability[1]`,
      ],
    },
  ],
  identity: {
    compatibility: { headerMatches: false, ignoredNativeRecordKeys: [], activation: 'NOT_APPLICABLE' },
    groups: [
      // One Work DOI groups the PDF and the EPUB, and names exactly one existing Work of the publisher.
      {
        groupKey: EXISTING_GROUP,
        compatibility: 'GENERIC',
        thothVerification: 'NOT_APPLICABLE',
        edges: [{ kind: 'WORK_IDENTITY', key: `workdoi:${DOI}`, productKeys: [PDF, EPUB] }],
        evidence: [{ kind: 'WORK_DOI', doi: DOI, workId: WORK_ID }],
      },
      {
        groupKey: NEW_GROUP,
        compatibility: 'GENERIC',
        thothVerification: 'NOT_APPLICABLE',
        edges: [],
        evidence: [{ kind: 'NO_TARGET_MATCH' }],
      },
    ],
    products: [
      {
        productKey: PDF,
        recordKeys: ['record:1'],
        evidence: [{ kind: 'ISBN_MATCH', isbn: '9781800060029', workId: WORK_ID, publicationId: PDF_PUBLICATION_ID }],
        omittable: false,
      },
      // The EPUB is not on the existing Work: it becomes a Publication of it - or the publisher may leave it out.
      {
        productKey: EPUB,
        recordKeys: ['record:2'],
        evidence: [{ kind: 'EXISTING_WORK_WITHOUT_THIS_PUBLICATION', workId: WORK_ID }],
        omittable: true,
      },
      { productKey: PAPERBACK, recordKeys: ['record:3'], evidence: [{ kind: 'NO_TARGET_MATCH' }], omittable: false },
    ],
  },
  descriptive: [
    {
      groupKey: EXISTING_GROUP,
      subjects: [],
      primaryChoices: [],
      series: [],
      noCollection: false,
      lifecycle: { status: { kind: 'VALUE', status: 'ACTIVE' }, publicationDate: '2025-03-01', withdrawnDate: null },
      cover: { kind: 'ABSENT' },
      profileCover: { kind: 'ABSENT' },
    },
    {
      groupKey: NEW_GROUP,
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
    {
      productKey: PDF,
      supplies: [
        {
          path: SUPPLY(1),
          marketPublishingStatus: null,
          marketDates: [],
          supplyDetails: [
            {
              path: `${SUPPLY(1)}/SupplyDetail[1]`,
              supplierRole: '09',
              supplierName: 'Regression Press',
              availability: '20',
              supplyDates: [],
              unpricedItemType: null,
              prices: [price(1, 1, '9.00')],
            },
          ],
        },
      ],
      prices: [
        {
          kind: 'SET',
          currencyCode: 'EUR',
          unitPrice: 9,
          paths: [`${SUPPLY(1)}/SupplyDetail[1]/Price[1]`],
          findingKey: `COMMERCIAL|PRICE_REDUCED|${PDF}|EUR`,
        },
      ],
      carriers: { DIGITAL: { kind: 'NONE' } },
      plannedLocations: [],
    },
    {
      productKey: EPUB,
      supplies: [
        {
          path: SUPPLY(2),
          marketPublishingStatus: null,
          marketDates: [],
          supplyDetails: [
            {
              path: `${SUPPLY(2)}/SupplyDetail[1]`,
              supplierRole: '09',
              supplierName: 'Regression Press',
              availability: '20',
              supplyDates: [],
              unpricedItemType: null,
              prices: [price(2, 1, '12.00')],
            },
            {
              path: `${SUPPLY(2)}/SupplyDetail[2]`,
              supplierRole: '11',
              supplierName: 'Open Shelf Platform',
              availability: '21',
              supplyDates: [],
              unpricedItemType: null,
              prices: [price(2, 2, '12.00')],
            },
          ],
        },
      ],
      // One amount in one currency: set automatically.
      prices: [
        {
          kind: 'SET',
          currencyCode: 'EUR',
          unitPrice: 12,
          paths: [`${SUPPLY(2)}/SupplyDetail[1]/Price[1]`, `${SUPPLY(2)}/SupplyDetail[2]/Price[1]`],
          findingKey: `COMMERCIAL|PRICE_REDUCED|${EPUB}|EUR`,
        },
      ],
      // The publisher's landing page and full text are the canonical Location; the supplier's work page follows it.
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
        {
          landingPage: OPEN_SHELF,
          fullTextUrl: '',
          platform: 'OTHER',
          suppliers: ['Open Shelf Platform'],
          carriers: { DIGITAL: 'NON_CANONICAL' },
        },
      ],
    },
    { productKey: PAPERBACK, supplies: [], prices: [], carriers: { PHYSICAL: { kind: 'NONE' } }, plannedLocations: [] },
  ],
  // Only the Publication this import creates has a resolved Price: the PDF already in Thoth has none.
  priceResolutions: [
    {
      productKey: EPUB,
      findingKey: `COMMERCIAL|PRICE_REDUCED|${EPUB}|EUR`,
      currencyCode: 'EUR',
      basis: 'AUTOMATIC',
      unitPrice: 12,
      paths: [`${SUPPLY(2)}/SupplyDetail[1]/Price[1]`, `${SUPPLY(2)}/SupplyDetail[2]/Price[1]`],
    },
  ],
  rights: {
    products: [
      [PDF, 'DIGITAL'],
      [EPUB, 'DIGITAL'],
      [PAPERBACK, 'PHYSICAL'],
    ].map(([productKey, carrier]) => ({
      productKey,
      carrier: carrier as 'DIGITAL' | 'PHYSICAL',
      expressions: [],
      licence: { kind: 'SILENT' as const },
      dated: false,
      technicalProtection: [],
      technicalProtectionState: 'UNKNOWN' as const,
      usageConstraints: [],
      deferredRights: [],
    })),
    groups: [
      { groupKey: EXISTING_GROUP, licence: { kind: 'UNSET' } },
      { groupKey: NEW_GROUP, licence: { kind: 'UNSET' } },
    ],
    // The existing Work's licence is preserved exactly as held (rules 119-124); nothing replaces it.
    licenceActions: [
      { groupKey: EXISTING_GROUP, action: { kind: 'EXISTING_PRESERVED', url: LICENCE } },
      { groupKey: NEW_GROUP, action: { kind: 'UNSET' } },
    ],
    acknowledgedFindingKeys: [],
  },
  accessibility: {
    products: [
      [PDF, Pdf, 'DIGITAL'],
      [EPUB, Epub, 'DIGITAL'],
      [PAPERBACK, Paperback, 'PHYSICAL'],
    ].map(([productKey, publicationType, scope]) => ({
      productKey,
      features: [],
      primaryStandards: [],
      additionalStandards: [],
      exceptions: [],
      reportUrls: [],
      publications: [
        {
          publicationType: publicationType as typeof Pdf,
          scope: scope as 'DIGITAL' | 'PHYSICAL',
          additionalStandards: [],
          incompatibleAdditionalStandards: [],
        },
      ],
    })),
    contacts: [],
    actions: [
      // The PDF in Thoth keeps what it holds; the EPUB and paperback are created with none.
      [PDF, Pdf, 'EXISTING_PRESERVED'],
      [EPUB, Epub, 'CREATE'],
      [PAPERBACK, Paperback, 'CREATE'],
    ].map(([productKey, publicationType, action]) => ({
      productKey,
      publicationType: publicationType as typeof Pdf,
      resolved: {
        accessibilityStandard: null,
        accessibilityAdditionalStandard: null,
        accessibilityException: null,
        accessibilityReportUrl: null,
      },
      sources: [],
      omitted: [],
      action: action as 'EXISTING_PRESERVED' | 'CREATE',
    })),
  },
  components: [],
  relatedMaterial: {
    outcomes: [1, 2, 3].map((product) => {
      const productKey = [PDF, EPUB, PAPERBACK][product - 1];
      const path = `${P(product)}/RelatedMaterial[1]/RelatedWork[1]`;

      return {
        declarationKey: `${productKey}|${path}/WorkRelationCode[1]`,
        path,
        productKey,
        construct: 'RELATED_WORK' as const,
        code: '01',
        outcome: 'WORK_IDENTITY' as const,
        endpoint: null,
        relationType: null,
        edgeKey: null,
      };
    }),
    edges: [],
    productReferences: [PDF, EPUB, PAPERBACK].map((productKey) => ({ productKey, asserted: false, references: [] })),
    referenceActions: [
      { groupKey: EXISTING_GROUP, action: { kind: 'EXISTING_WORK_NOT_UPDATED' } },
      { groupKey: NEW_GROUP, action: { kind: 'NONE' } },
    ],
  },
  collateral: {
    textContents: [],
    resources: [],
    candidates: [],
    actions: [
      [EXISTING_GROUP, 'EXISTING_WORK_NOT_UPDATED'],
      [NEW_GROUP, 'PLANNED'],
    ].map(([groupKey, action]) => ({
      groupKey,
      productKey: null,
      componentPath: null,
      target: 'WORK' as const,
      action: action as 'EXISTING_WORK_NOT_UPDATED' | 'PLANNED',
      abstracts: [],
      tableOfContents: null,
      generalNote: null,
      resources: [],
    })),
  },
  reviewsPrizes: {
    citedContents: [],
    prizes: [],
    candidates: [EXISTING_GROUP, NEW_GROUP].map((key) => ({
      scope: 'WORK' as const,
      key,
      reviews: [],
      endorsements: [],
      prizes: [],
      ordering: {
        BOOK_REVIEW: { status: 'EMPTY' as const },
        ENDORSEMENT: { status: 'EMPTY' as const },
        AWARD: { status: 'EMPTY' as const },
      },
    })),
    actions: [
      [EXISTING_GROUP, 'EXISTING_WORK_NOT_UPDATED'],
      [NEW_GROUP, 'PLANNED'],
    ].map(([groupKey, action]) => ({
      groupKey,
      productKey: null,
      componentPath: null,
      target: 'WORK' as const,
      action: action as 'EXISTING_WORK_NOT_UPDATED' | 'PLANNED',
      bookReviews: [],
      endorsements: [],
      awards: [],
    })),
  },
  // Only the new Work is a Work the plan creates; the existing one is written nothing beyond its unit's attachment.
  plan: answered
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
                type: Paperback,
                isbn: '9781800060043',
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
        series: [],
        relations: [],
      }
    : { works: [], containedWorks: [], series: [], relations: [] },
});

/**
 * The two units of the answered plan, in source order. The existing Work's unit owns exactly one action: the EPUB, whole -
 * its Price and its two Locations, the canonical one first. The new Work's unit creates the Work, naming the existing
 * contributor and institution its exact identifiers returned, then its paperback.
 */
const EXECUTION: OnixExecutionLedger = {
  units: [
    {
      unitKey: `UNIT|${EXISTING_GROUP}`,
      sourceOrder: 1,
      groupKey: EXISTING_GROUP,
      target: { kind: 'EXISTING_WORK', workId: WORK_ID },
      display: { title: TITLE, reference: DOI },
      actions: [
        {
          kind: 'CREATE_PUBLICATION',
          actionKey: `UNIT|${EXISTING_GROUP}|PUBLICATION|${EPUB}`,
          work: { kind: 'EXISTING_WORK', workId: WORK_ID },
          productKey: EPUB,
          publication: {
            source: 'ATTACHMENT',
            type: Epub,
            isbn: '9781800060036',
            prices: [{ currencyCode: 'EUR', unitPrice: 12 }],
            locations: [
              { canonical: true, landingPage: LANDING, fullTextUrl: FULL_TEXT, locationPlatform: 'PUBLISHER_WEBSITE' },
              { canonical: false, landingPage: OPEN_SHELF, fullTextUrl: '', locationPlatform: 'OTHER' },
            ],
            accessibilityStandard: null,
            accessibilityAdditionalStandard: null,
            accessibilityException: null,
            accessibilityReportUrl: '',
          },
        },
      ],
    },
    {
      unitKey: `UNIT|${NEW_GROUP}`,
      sourceOrder: 2,
      groupKey: NEW_GROUP,
      target: { kind: 'PLANNED_WORK', list: 'works', index: 0 },
      display: { title: 'A New Work Beside It', reference: NEW_DOI },
      actions: [
        {
          kind: 'CREATE_WORK',
          actionKey: `UNIT|${NEW_GROUP}|WORK`,
          work: { kind: 'PLANNED_WORK', list: 'works', index: 0 },
          contributions: [{ orderNumber: 1, contributorId: CONTRIBUTOR_ID, institutionIds: [INSTITUTION_ID] }],
        },
        {
          kind: 'CREATE_PUBLICATION',
          actionKey: `UNIT|${NEW_GROUP}|PUBLICATION|${PAPERBACK}`,
          work: { kind: 'PLANNED_WORK', list: 'works', index: 0 },
          productKey: PAPERBACK,
          publication: { source: 'WORK', index: 0 },
        },
      ],
    },
  ],
};

const product = (productKey: string, groupKey: string, isbn: string, executable: boolean) => {
  const pdfOrEpub = productKey !== PAPERBACK;

  return {
    productKey,
    groupKey,
    isbn,
    manifestation: pdfOrEpub
      ? {
          kind: 'RESOLVED' as const,
          type: productKey === PDF ? Pdf : Epub,
          classification: 'SUPPORTED_NORMALIZED' as const,
          notes: [{ code: 'DELIVERY_MODE_NOT_REPRESENTED' as const, detail: 'EB' }],
        }
      : { kind: 'RESOLVED' as const, type: Paperback, classification: 'SUPPORTED_LOSSLESS' as const, notes: [] },
    publicationType: productKey === PDF ? null : productKey === EPUB ? Epub : Paperback,
    action:
      productKey === PDF
        ? ('ALREADY_PRESENT' as const)
        : productKey === EPUB
          ? ('CREATE_PUBLICATION_ON_EXISTING_WORK' as const)
          : ('CREATE_PUBLICATION' as const),
    executable,
  };
};

const planning = (answered: boolean): OnixPlanningExpectation => ({
  // Nothing of the file is executable until every input of every Work is given (#186): the attachment waits too.
  executable: answered,
  records: [PDF, EPUB, PAPERBACK].map((productKey, index) => ({
    index: index + 1,
    recordReference: `regression-press.${productKey.slice('product:gtin13:'.length)}`,
    disposition: 'COMPLETE',
    productKey,
    action: 'PLANNED',
  })),
  products: [
    product(PDF, EXISTING_GROUP, '9781800060029', true),
    product(EPUB, EXISTING_GROUP, '9781800060036', true),
    product(PAPERBACK, NEW_GROUP, '9781800060043', answered),
  ],
  workGroups: [
    {
      groupKey: EXISTING_GROUP,
      productKeys: [PDF, EPUB],
      target: 'EXISTING_WORK',
      workType: { status: 'RESOLVED', type: Monograph, provenance: 'EXISTING_TARGET' },
      edition: { status: 'RESOLVED', edition: 1, basis: 'EXISTING_TARGET' },
      workDoi: { kind: 'DOI', doi: DOI, basis: 'WORK_IDENTIFIER' },
      executable: true,
    },
    {
      groupKey: NEW_GROUP,
      productKeys: [PAPERBACK],
      target: 'NEW_WORK',
      workType: answered
        ? { status: 'RESOLVED', type: Monograph, provenance: 'USER_FILE_DEFAULT' }
        : { status: 'UNRESOLVED' },
      edition: { status: 'RESOLVED', edition: 1, basis: 'DEFAULT_FIRST_EDITION' },
      workDoi: { kind: 'DOI', doi: NEW_DOI, basis: 'WORK_IDENTIFIER' },
      executable: answered,
    },
  ],
  blockers: answered
    ? []
    : [
        {
          code: 'WORK_TYPE_INPUT_REQUIRED',
          classification: 'TARGET_INPUT_REQUIRED',
          recordKey: null,
          productKey: null,
          groupKey: NEW_GROUP,
        },
      ],
  findings: FINDINGS,
  works: answered
    ? [
        {
          type: Monograph,
          status: 'ACTIVE',
          doi: NEW_DOI,
          edition: 1,
          publicationDate: '2026-03-01',
          pageCount: 0,
          titles: [
            {
              canonical: true,
              localeCode: LocaleCode.En,
              fullTitle: 'A New Work Beside It',
              title: 'A New Work Beside It',
              subtitle: '',
            },
          ],
          publications: [{ type: Paperback, isbn: '9781800060043' }],
          contributions: [{ fullName: 'Ada Lovelace', type: 'AUTHOR', isMain: true, orderNumber: 1, orcidId: ORCID }],
          languages: [{ code: LanguageCode.Eng, relation: LanguageRelation.Original }],
          subjects: [],
        },
      ]
    : [],
  chapters: [],
  target: TARGET(answered),
  execution: answered ? EXECUTION : { units: [] },
  // The EPUB would attach: every descriptive family the file asserts is compared with the existing Work, and holds.
  reconciliation: {
    descriptive: (['TITLE', 'CONTRIBUTORS', 'LANGUAGES', 'LIFECYCLE'] as const).map((family) => ({
      productKey: EPUB,
      groupKey: EXISTING_GROUP,
      workId: WORK_ID,
      family,
      outcome: 'COMPATIBLE' as const,
      reasons: [],
    })),
    references: [],
  },
});

const OUTCOMES = {
  SUPPORTED_LOSSLESS: 1,
  SUPPORTED_NORMALIZED: 4,
  SUPPORTED_WITH_WARNING: 2,
  TARGET_UNREPRESENTABLE: 2,
};

export default defineOnixRegressionFixture({
  id: 'existing-target-enrichment',
  status: 'CONTRACT',
  purpose:
    'Proves approved additive enrichment of a correctly identified existing Work: its missing EPUB is attached, whole and ' +
    'canonical Location first, only once every asserted family is compatible, while its held PDF, licence and other ' +
    'metadata are never written; a new Work beside it names the existing contributor and institution its exact ORCID and ' +
    'ROR return; and nothing of the file executes while any Work still needs an input.',
  source: {
    origin: 'SYNTHETIC',
    provenance:
      'Written for thoth-app#250. Every name and identifier is invented; the ISBNs, the ORCID and the ROR carry valid ' +
      'check characters. The canonical source gate admits it with no finding.',
    sha256: 'ca141788dea3e071bca2121d88f47b83fde3749800a4a1536e81c53218d04ade',
  },
  defects: [],
  asOf: '2026-10-07T12:00:00.000Z',
  imprints: [{ label: 'Regression Press', value: IMPRINT }],
  gate: {
    verdict: 'PERMITTED',
    release: '3.1',
    flavour: 'reference',
    findings: [],
    recoveries: [],
    provenance: { kind: 'IDENTITY', flavour: 'reference' },
  },
  normalized: {
    '/onix:ONIXMessage/onix:Product/onix:ProductIdentifier/onix:IDValue': [
      '9781800060029',
      '9781800060036',
      '9781800060043',
    ],
    '/onix:ONIXMessage/onix:Product/onix:DescriptiveDetail/onix:Contributor/onix:ProfessionalAffiliation/onix:AffiliationIdentifier/onix:IDValue':
      ['05reg2e51'],
  },
  scenarios: [
    {
      name: 'as uploaded: the new Work still needs its WorkType, so nothing of the file executes - the attachment included',
      target: THOTH,
      planning: planning(false),
      outcomes: { ...OUTCOMES, TARGET_INPUT_REQUIRED: 1 },
    },
    {
      name: 'publisher takes MONOGRAPH for the new Work: the existing Work gains only its EPUB',
      target: THOTH,
      inputs: { fileWorkType: Monograph },
      planning: planning(true),
      outcomes: OUTCOMES,
    },
  ],
});
