import { parse } from '@5stones/onix';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { OnixSalesRightsFinding, OnixSalesRightsPlan } from '../../types/onixPlanning';
import type { ExtendedONIXMessageRoot } from './interfaces';
import { reduceOnixCommercial } from './onixCommercial';
import { planOnixSource } from './onixPlanning';
import {
  ONIX_HIGH_SALIENCE_CONTACT_ROLES,
  reduceOnixSalesRights,
  type ReduceOnixSalesRightsOptions,
  salesRightsSemanticsOf,
} from './onixSalesRights';
import type { ProvenanceResolver } from './validation/worker/provenance';

/**
 * The canonical SalesRights and ProductContact reducer of thoth-app#217 (Stage C of #184), under
 * ONIX-AUDIT-SALES-RIGHTS-CONTACT-01 (#179 proposal 5543566392, approval 5543611447), driven as the uploader drives
 * it: a real ONIX document parsed by `@5stones/onix`, planned by #182, its ProductSupply reduced by #215, then reduced.
 * Every fixture is minimal and synthetic.
 */

const ISBN_A = '9781800000018';
const ISBN_B = '9781800000025';
const PRODUCT_1 = '/ONIXMessage[1]/Product[1]';
const PRODUCT_2 = '/ONIXMessage[1]/Product[2]';
const PUBLISHING_1 = `${PRODUCT_1}/PublishingDetail[1]`;

const TITLE =
  '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText language="eng">A Work</TitleText></TitleElement></TitleDetail>';

const record = ({
  ref = 'r1',
  isbn = ISBN_A,
  form = '<ProductForm>BC</ProductForm>',
  publishing = '',
  supply = '',
}: {
  ref?: string;
  isbn?: string;
  form?: string;
  /** SalesRights, ROWSalesRightsType and ProductContact composites, in the PublishingDetail. */
  publishing?: string;
  supply?: string;
} = {}) =>
  `<Product><RecordReference>${ref}</RecordReference><NotificationType>03</NotificationType>` +
  `<ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>${isbn}</IDValue></ProductIdentifier>` +
  `<DescriptiveDetail><ProductComposition>00</ProductComposition>${form}${TITLE}</DescriptiveDetail>` +
  `<PublishingDetail><Imprint><ImprintName>Example Imprint</ImprintName></Imprint><PublishingStatus>02</PublishingStatus>${publishing}</PublishingDetail>` +
  `${supply}</Product>`;

const territory = ({
  countries = '',
  regions = '',
  countriesExcluded = '',
  regionsExcluded = '',
}: {
  countries?: string;
  regions?: string;
  countriesExcluded?: string;
  regionsExcluded?: string;
}) =>
  '<Territory>' +
  (countries ? `<CountriesIncluded>${countries}</CountriesIncluded>` : '') +
  (regions ? `<RegionsIncluded>${regions}</RegionsIncluded>` : '') +
  (countriesExcluded ? `<CountriesExcluded>${countriesExcluded}</CountriesExcluded>` : '') +
  (regionsExcluded ? `<RegionsExcluded>${regionsExcluded}</RegionsExcluded>` : '') +
  '</Territory>';

const WORLD = territory({ regions: 'WORLD' });

const salesRights = (type: string, territoryXml: string, extra = '') =>
  `<SalesRights><SalesRightsType>${type}</SalesRightsType>${territoryXml}${extra}</SalesRights>`;

const row = (type: string) => `<ROWSalesRightsType>${type}</ROWSalesRightsType>`;

const restriction = ({
  type = '04',
  outlets = [] as string[],
  note = '',
  start = '',
  end = '',
}: { type?: string; outlets?: string[]; note?: string; start?: string; end?: string } = {}) =>
  `<SalesRestriction><SalesRestrictionType>${type}</SalesRestrictionType>` +
  outlets
    .map(
      (name) =>
        `<SalesOutlet><SalesOutletIdentifier><SalesOutletIDType>03</SalesOutletIDType><IDValue>${name.toUpperCase()}</IDValue></SalesOutletIdentifier><SalesOutletName>${name}</SalesOutletName></SalesOutlet>`,
    )
    .join('') +
  (note ? `<SalesRestrictionNote>${note}</SalesRestrictionNote>` : '') +
  (start ? `<StartDate dateformat="00">${start}</StartDate>` : '') +
  (end ? `<EndDate dateformat="00">${end}</EndDate>` : '') +
  '</SalesRestriction>';

type ContactSpec = {
  role?: string;
  identifiers?: [type: string, value: string, name?: string][];
  organisation?: string | null;
  name?: string;
  telephones?: string[];
  faxes?: string[];
  emails?: string[];
  address?: { street: string; location: string; postalCode?: string; region?: string; country: string };
};

const contact = ({
  role = '06',
  identifiers = [],
  organisation = 'Example Press Permissions',
  name = '',
  telephones = [],
  faxes = [],
  emails = ['permissions@example.org'],
  address,
}: ContactSpec = {}) =>
  `<ProductContact><ProductContactRole>${role}</ProductContactRole>` +
  identifiers
    .map(
      ([type, value, typeName]) =>
        `<ProductContactIdentifier><ProductContactIDType>${type}</ProductContactIDType>${typeName ? `<IDTypeName>${typeName}</IDTypeName>` : ''}<IDValue>${value}</IDValue></ProductContactIdentifier>`,
    )
    .join('') +
  (organisation === null ? '' : `<ProductContactName>${organisation}</ProductContactName>`) +
  (name ? `<ContactName>${name}</ContactName>` : '') +
  telephones.map((value) => `<TelephoneNumber>${value}</TelephoneNumber>`).join('') +
  faxes.map((value) => `<FaxNumber>${value}</FaxNumber>`).join('') +
  emails.map((value) => `<EmailAddress>${value}</EmailAddress>`).join('') +
  (address
    ? `<StreetAddress>${address.street}</StreetAddress><LocationName>${address.location}</LocationName>` +
      (address.postalCode ? `<PostalCode>${address.postalCode}</PostalCode>` : '') +
      (address.region ? `<RegionCode>${address.region}</RegionCode>` : '') +
      `<CountryCode>${address.country}</CountryCode>`
    : '') +
  '</ProductContact>';

const supplyDetail =
  '<SupplyDetail><Supplier><SupplierRole>01</SupplierRole><SupplierName>Example Supplier</SupplierName></Supplier><ProductAvailability>20</ProductAvailability>' +
  '<Price><PriceType>02</PriceType><PriceAmount>20.00</PriceAmount><CurrencyCode>GBP</CurrencyCode></Price></SupplyDetail>';

const productSupply = ({ market = '', marketPublishing = '' }: { market?: string; marketPublishing?: string } = {}) =>
  `<ProductSupply>${market ? `<Market>${market}</Market>` : ''}${marketPublishing ? `<MarketPublishingDetail>${marketPublishing}</MarketPublishingDetail>` : ''}${supplyDetail}</ProductSupply>`;

/** The reduction of a message, with the Stage-B commercial reduction of the same source given for market comparison. */
const reduce = (
  records: string[],
  options: ReduceOnixSalesRightsOptions & { readonly withCommercial?: boolean; readonly release?: '3.0' | '3.1' } = {},
) => {
  const { withCommercial = true, release = '3.0', ...rest } = options;
  const xml = `<ONIXMessage release="${release}" xmlns="http://ns.editeur.org/onix/${release}/reference"><Header><Sender><SenderName>Example Press</SenderName></Sender><SentDateTime>20260918</SentDateTime></Header>${records.join('')}</ONIXMessage>`;
  const root = parse(xml) as ExtendedONIXMessageRoot;
  const sourcePlan = planOnixSource(root);
  const commercial = withCommercial ? reduceOnixCommercial(root, sourcePlan) : undefined;
  const plan = reduceOnixSalesRights(root, sourcePlan, {
    ...rest,
    ...(commercial === undefined ? {} : { commercial }),
  });
  const [first] = sourcePlan.products;

  return { root, sourcePlan, commercial, plan, productKey: first.productKey, product: plan.products[first.productKey] };
};

const located = (path: string) => ({ path, sourcePath: path });

const codesOf = (plan: OnixSalesRightsPlan) =>
  plan.findings.map(({ code, blocking, resolution }) => [code, blocking, resolution.kind]);

const findingOf = (plan: OnixSalesRightsPlan, code: OnixSalesRightsFinding['code']) =>
  plan.findings.find((finding) => finding.code === code) as OnixSalesRightsFinding;

const PII = [
  'permissions@example.org',
  'access@example.org',
  '+44 20 7946 0000',
  '+44 20 7946 0001',
  '1 Example Street',
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('salesRightsSemanticsOf', () => {
  it.each([
    ['01', 'FOR_SALE_EXCLUSIVE'],
    ['02', 'FOR_SALE_NON_EXCLUSIVE'],
    ['03', 'NOT_FOR_SALE'],
    ['04', 'NOT_FOR_SALE'],
    ['05', 'NOT_FOR_SALE'],
    ['06', 'NOT_FOR_SALE'],
    ['07', 'FOR_SALE_EXCLUSIVE'],
    ['08', 'FOR_SALE_NON_EXCLUSIVE'],
    ['00', 'UNKNOWN'],
    ['99', 'UNRECOGNISED'],
    ['', 'UNRECOGNISED'],
  ])('reads List 46 code %s as %s', (code, semantics) => {
    expect(salesRightsSemanticsOf(code)).toBe(semantics);
  });
});

describe('reduceOnixSalesRights', () => {
  describe('absence and simple positive rights (rules 9, 14, 18, 27)', () => {
    it('fabricates nothing where a Product states no SalesRights: no rights, no ROW rule, no finding', () => {
      const { product, plan } = reduce([record({ supply: productSupply({ market: WORLD }) })]);

      expect(product.salesRights).toEqual([]);
      expect(product.rowSalesRightsType).toBeNull();
      expect(product.productContacts).toEqual([]);
      expect(product.findingKeys).toEqual([]);
      expect(plan.findings).toEqual([]);
    });

    it.each([
      ['01', 'FOR_SALE_EXCLUSIVE'],
      ['02', 'FOR_SALE_NON_EXCLUSIVE'],
    ])('discloses a single simple %s WORLD statement without blocking, keeping the fact exactly', (type, semantics) => {
      const { product, plan, productKey, sourcePlan } = reduce([record({ publishing: salesRights(type, WORLD) })]);

      expect(product.salesRights).toEqual([
        {
          ...located(`${PUBLISHING_1}/SalesRights[1]`),
          type,
          semantics,
          deprecated: false,
          territory: {
            ...located(`${PUBLISHING_1}/SalesRights[1]/Territory[1]`),
            countriesIncluded: null,
            regionsIncluded: 'WORLD',
            countriesExcluded: null,
            regionsExcluded: null,
          },
          salesRestrictions: [],
          equivalentProducts: [],
          equivalentPublisherNames: [],
        },
      ]);
      expect(plan.findings).toEqual([
        {
          family: 'SALES_RIGHTS',
          key: `SALES_RIGHTS|SALES_RIGHTS_NOT_REPRESENTED|${productKey}|for-sale`,
          code: 'SALES_RIGHTS_NOT_REPRESENTED',
          classification: 'SUPPORTED_WITH_WARNING',
          blocking: false,
          productKey,
          groupKey: sourcePlan.products[0].groupKey,
          locations: [located(`${PUBLISHING_1}/SalesRights[1]`)],
          detail: { types: [type], territories: ['WORLD'] },
          resolution: { kind: 'NONE' },
          message: expect.stringContaining('not persist'),
        },
      ]);
      expect(product.findingKeys).toEqual([plan.findings[0].key]);
    });
  });

  describe('complex territorial contracts (rules 12-13, 19-21, 28-29)', () => {
    it('keeps WORLD with exclusions and the ROW rule as exact separate facts, and requires acknowledgement of each', () => {
      const { product, plan } = reduce([
        record({
          publishing: salesRights('01', territory({ regions: 'WORLD', countriesExcluded: 'US CA' })) + row('03'),
        }),
      ]);

      expect(product.salesRights[0].territory).toMatchObject({
        regionsIncluded: 'WORLD',
        countriesExcluded: 'US CA',
        countriesIncluded: null,
        regionsExcluded: null,
      });
      expect(product.rowSalesRightsType).toEqual({
        ...located(`${PUBLISHING_1}/ROWSalesRightsType[1]`),
        type: '03',
        semantics: 'NOT_FOR_SALE',
      });
      expect(codesOf(plan)).toEqual([
        ['SALES_RIGHTS_TERRITORY_NOT_REPRESENTED', true, 'ACKNOWLEDGE'],
        ['SALES_RIGHTS_ROW_NOT_REPRESENTED', true, 'ACKNOWLEDGE'],
      ]);
      expect(findingOf(plan, 'SALES_RIGHTS_TERRITORY_NOT_REPRESENTED')).toMatchObject({
        classification: 'TARGET_UNREPRESENTABLE',
        locations: [located(`${PUBLISHING_1}/SalesRights[1]`)],
        detail: { types: ['01'], territories: ['WORLD except US CA'] },
      });
      expect(findingOf(plan, 'SALES_RIGHTS_ROW_NOT_REPRESENTED')).toMatchObject({
        classification: 'TARGET_UNREPRESENTABLE',
        locations: [located(`${PUBLISHING_1}/ROWSalesRightsType[1]`)],
        detail: { type: '03', semantics: 'NOT_FOR_SALE' },
      });
    });

    it('evaluates exclusive and non-exclusive partitions deterministically, whatever their order, and never first-wins', () => {
      const exclusive = salesRights('01', territory({ countries: 'GB IE' }));
      const nonExclusive = salesRights('02', territory({ regions: 'WORLD', countriesExcluded: 'GB IE' }));
      const stated = reduce([record({ publishing: exclusive + nonExclusive })]);
      const reversed = reduce([record({ publishing: nonExclusive + exclusive })]);

      expect(codesOf(stated.plan)).toEqual([['SALES_RIGHTS_TERRITORY_NOT_REPRESENTED', true, 'ACKNOWLEDGE']]);
      expect(stated.plan.findings[0].locations).toEqual([
        located(`${PUBLISHING_1}/SalesRights[1]`),
        located(`${PUBLISHING_1}/SalesRights[2]`),
      ]);
      expect(stated.plan.findings[0].detail).toEqual({
        types: ['01', '02'],
        territories: ['GB IE', 'WORLD except GB IE'],
      });
      // The same contract stated the other way round is the same finding under the same key.
      expect(reversed.plan.findings.map(({ key, code }) => [key, code])).toEqual(
        stated.plan.findings.map(({ key, code }) => [key, code]),
      );
      expect(reversed.product.salesRights.map(({ type }) => type)).toEqual(['02', '01']);
    });

    it.each(['03', '04', '05', '06'])(
      'keeps not-for-sale type %s explicit and requires acknowledgement of it',
      (type) => {
        const { product, plan } = reduce([
          record({
            publishing:
              salesRights('01', territory({ countries: 'GB' })) + salesRights(type, territory({ countries: 'US' })),
          }),
        ]);

        expect(product.salesRights[1]).toMatchObject({ type, semantics: 'NOT_FOR_SALE', deprecated: false });
        expect(codesOf(plan)).toEqual([
          ['SALES_RIGHTS_TERRITORY_NOT_REPRESENTED', true, 'ACKNOWLEDGE'],
          ['SALES_RIGHTS_NOT_FOR_SALE_NOT_REPRESENTED', true, 'ACKNOWLEDGE'],
        ]);
        expect(findingOf(plan, 'SALES_RIGHTS_NOT_FOR_SALE_NOT_REPRESENTED')).toMatchObject({
          classification: 'TARGET_UNREPRESENTABLE',
          locations: [located(`${PUBLISHING_1}/SalesRights[2]`)],
          detail: { type, territory: 'US' },
        });
      },
    );

    it('keeps ROWSalesRightsType 00 as unknown rights, never permission or prohibition, and requires acknowledgement', () => {
      const { product, plan } = reduce([
        record({ publishing: salesRights('01', territory({ countries: 'GB' })) + row('00') }),
      ]);

      expect(product.rowSalesRightsType).toMatchObject({ type: '00', semantics: 'UNKNOWN' });
      expect(codesOf(plan)).toEqual([
        ['SALES_RIGHTS_TERRITORY_NOT_REPRESENTED', true, 'ACKNOWLEDGE'],
        ['SALES_RIGHTS_ROW_UNKNOWN', true, 'ACKNOWLEDGE'],
      ]);
      expect(findingOf(plan, 'SALES_RIGHTS_ROW_UNKNOWN')).toMatchObject({
        classification: 'TARGET_UNREPRESENTABLE',
        locations: [located(`${PUBLISHING_1}/ROWSalesRightsType[1]`)],
      });
    });

    it('keeps the deprecated 07 and 08 statements as valid for-sale rights with a restriction, disclosed and acknowledged, never reinterpreted', () => {
      const { product, plan } = reduce([record({ publishing: salesRights('07', WORLD) })]);

      expect(product.salesRights[0]).toMatchObject({ type: '07', semantics: 'FOR_SALE_EXCLUSIVE', deprecated: true });
      // A restriction applies, so a WORLD statement under 07 is not the simple positive one.
      expect(codesOf(plan)).toEqual([
        ['SALES_RIGHTS_TYPE_DEPRECATED', false, 'NONE'],
        ['SALES_RIGHTS_TERRITORY_NOT_REPRESENTED', true, 'ACKNOWLEDGE'],
      ]);
    });

    it('never accepts List 46 code 00, or a code the list does not hold, as an ordinary SalesRightsType (rule 16)', () => {
      const unknown = reduce([
        record({ publishing: salesRights('00', WORLD) + salesRights('99', territory({ countries: 'GB' })) }),
      ]);

      expect(unknown.product.salesRights.map(({ semantics }) => semantics)).toEqual(['UNKNOWN', 'UNRECOGNISED']);
      expect(codesOf(unknown.plan)).toEqual([
        ['SALES_RIGHTS_TYPE_UNEXPECTED', true, 'NONE'],
        ['SALES_RIGHTS_TYPE_UNEXPECTED', true, 'NONE'],
      ]);
      expect(unknown.plan.findings.map(({ classification, detail }) => [classification, detail.type])).toEqual([
        ['PREFLIGHT_GAP', '00'],
        ['PREFLIGHT_GAP', '99'],
      ]);
    });
  });

  describe('contradictory rights (rules 12, 19)', () => {
    it('blocks incompatible rights over deterministically overlapping territory, choosing neither', () => {
      const { plan } = reduce([
        record({
          publishing:
            salesRights('01', territory({ countries: 'GB IE' })) + salesRights('02', territory({ countries: 'IE FR' })),
        }),
      ]);
      const conflict = findingOf(plan, 'SALES_RIGHTS_CONFLICT');

      expect(codesOf(plan)).toContainEqual(['SALES_RIGHTS_CONFLICT', true, 'NONE']);
      expect(conflict).toMatchObject({
        classification: 'SOURCE_CONFLICT',
        locations: [located(`${PUBLISHING_1}/SalesRights[1]`), located(`${PUBLISHING_1}/SalesRights[2]`)],
        detail: { types: ['01', '02'] },
      });
    });

    it('blocks for-sale rights overlapping not-for-sale rights, and not where the exclusion keeps them apart', () => {
      const overlapping = reduce([
        record({ publishing: salesRights('01', WORLD) + salesRights('03', territory({ countries: 'US' })) }),
      ]);
      const partitioned = reduce([
        record({
          publishing:
            salesRights('01', territory({ regions: 'WORLD', countriesExcluded: 'US' })) +
            salesRights('03', territory({ countries: 'US' })),
        }),
      ]);

      expect(overlapping.plan.findings.map(({ code }) => code)).toContain('SALES_RIGHTS_CONFLICT');
      expect(partitioned.plan.findings.map(({ code }) => code)).not.toContain('SALES_RIGHTS_CONFLICT');
    });

    it('reads the unspecified not-for-sale code 03 as compatible with its detailed forms, and the detailed forms as incompatible with each other', () => {
      const compatible = reduce([
        record({
          publishing:
            salesRights('03', territory({ countries: 'GB' })) + salesRights('06', territory({ countries: 'GB' })),
        }),
      ]);
      const incompatible = reduce([
        record({
          publishing:
            salesRights('04', territory({ countries: 'GB' })) + salesRights('06', territory({ countries: 'GB' })),
        }),
      ]);
      const repeated = reduce([
        record({
          publishing:
            salesRights('01', territory({ countries: 'GB' })) + salesRights('01', territory({ countries: 'GB' })),
        }),
      ]);

      expect(compatible.plan.findings.map(({ code }) => code)).not.toContain('SALES_RIGHTS_CONFLICT');
      expect(incompatible.plan.findings.map(({ code }) => code)).toContain('SALES_RIGHTS_CONFLICT');
      // A repeated identical statement is not a conflict; both source paths are still retained (rule 11).
      expect(repeated.plan.findings.map(({ code }) => code)).not.toContain('SALES_RIGHTS_CONFLICT');
      expect(repeated.product.salesRights).toHaveLength(2);
    });

    it('guesses no relation over a token the pinned vocabulary does not resolve: it reports the gap and nothing else (rule 11)', () => {
      const { plan } = reduce([
        record({
          publishing:
            salesRights('01', territory({ countries: 'GB UK' })) + salesRights('03', territory({ countries: 'GB' })),
          supply: productSupply({ market: territory({ countries: 'GB' }) }),
        }),
      ]);

      expect(codesOf(plan)).toEqual([
        ['SALES_RIGHTS_TERRITORY_NOT_ESTABLISHED', true, 'NONE'],
        ['SALES_RIGHTS_TERRITORY_NOT_REPRESENTED', true, 'ACKNOWLEDGE'],
        ['SALES_RIGHTS_NOT_FOR_SALE_NOT_REPRESENTED', true, 'ACKNOWLEDGE'],
      ]);
      expect(findingOf(plan, 'SALES_RIGHTS_TERRITORY_NOT_ESTABLISHED')).toMatchObject({
        classification: 'PREFLIGHT_GAP',
        detail: { unresolved: ['UK'] },
      });
    });
  });

  describe('SalesRestriction and equivalent products (rules 14-15, 43-49)', () => {
    it('keeps every restriction whole - type, outlets, notes and dates - under its rights, each needing acknowledgement', () => {
      const { product, plan } = reduce([
        record({
          publishing: salesRights(
            '01',
            WORLD,
            restriction({ type: '04', outlets: ['Example Retailer'], start: '20260101', end: '20261231' }) +
              restriction({ type: '06', note: 'Libraries only' }),
          ),
        }),
      ]);
      const [rights] = product.salesRights;

      expect(rights.salesRestrictions).toEqual([
        {
          ...located(`${PUBLISHING_1}/SalesRights[1]/SalesRestriction[1]`),
          type: '04',
          outlets: [
            {
              ...located(`${PUBLISHING_1}/SalesRights[1]/SalesRestriction[1]/SalesOutlet[1]`),
              identifiers: [
                {
                  ...located(
                    `${PUBLISHING_1}/SalesRights[1]/SalesRestriction[1]/SalesOutlet[1]/SalesOutletIdentifier[1]`,
                  ),
                  type: '03',
                  typeName: null,
                  value: 'EXAMPLE RETAILER',
                },
              ],
              name: 'Example Retailer',
            },
          ],
          notes: [],
          startDate: '20260101',
          startDateFormat: '00',
          endDate: '20261231',
          endDateFormat: '00',
        },
        {
          ...located(`${PUBLISHING_1}/SalesRights[1]/SalesRestriction[2]`),
          type: '06',
          outlets: [],
          notes: [
            {
              ...located(`${PUBLISHING_1}/SalesRights[1]/SalesRestriction[2]/SalesRestrictionNote[1]`),
              value: 'Libraries only',
              language: null,
              textFormat: null,
              markupNotKept: false,
            },
          ],
          startDate: null,
          startDateFormat: null,
          endDate: null,
          endDateFormat: null,
        },
      ]);
      // A restricted WORLD statement is not the simple positive one; each restriction is acknowledged on its own.
      expect(codesOf(plan)).toEqual([
        ['SALES_RIGHTS_TERRITORY_NOT_REPRESENTED', true, 'ACKNOWLEDGE'],
        ['SALES_RESTRICTION_NOT_REPRESENTED', true, 'ACKNOWLEDGE'],
        ['SALES_RESTRICTION_NOT_REPRESENTED', true, 'ACKNOWLEDGE'],
      ]);
      const [first, second] = plan.findings.filter(({ code }) => code === 'SALES_RESTRICTION_NOT_REPRESENTED');

      expect(first).toMatchObject({
        classification: 'TARGET_UNREPRESENTABLE',
        locations: [located(`${PUBLISHING_1}/SalesRights[1]/SalesRestriction[1]`)],
        detail: { type: '04', outlets: 1, startDate: '20260101', endDate: '20261231' },
      });
      expect(second.detail).toMatchObject({ type: '06', outlets: 0 });
      expect(first.key).not.toBe(second.key);
    });

    it("keeps a not-for-sale territory's equivalent product inside that rights scope: never a grouping, identity or related-product edge (rules 47-49)", () => {
      const { product, plan, sourcePlan } = reduce([
        record({
          publishing:
            salesRights('01', territory({ regions: 'WORLD', countriesExcluded: 'US' })) +
            salesRights(
              '06',
              territory({ countries: 'US' }),
              `<ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>${ISBN_B}</IDValue></ProductIdentifier><PublisherName>Other Press</PublisherName>`,
            ),
        }),
      ]);
      const notForSale = product.salesRights[1];

      expect(notForSale.equivalentProducts).toEqual([
        {
          ...located(`${PUBLISHING_1}/SalesRights[2]/ProductIdentifier[1]`),
          type: '15',
          typeName: null,
          value: ISBN_B,
        },
      ]);
      expect(notForSale.equivalentPublisherNames).toEqual([
        { ...located(`${PUBLISHING_1}/SalesRights[2]/PublisherName[1]`), value: 'Other Press' },
      ]);
      expect(plan.findings.map(({ code }) => code)).toContain('SALES_RIGHTS_EQUIVALENT_PRODUCT_NOT_REPRESENTED');
      expect(findingOf(plan, 'SALES_RIGHTS_EQUIVALENT_PRODUCT_NOT_REPRESENTED')).toMatchObject({
        blocking: true,
        resolution: { kind: 'ACKNOWLEDGE' },
        detail: { identifierTypes: ['15'], publisherNames: 1 },
      });
      // The source plan grouped one Product and knows the equivalent ISBN as nothing of this Product's identity.
      expect(sourcePlan.products).toHaveLength(1);
      expect(sourcePlan.groups).toHaveLength(1);
      const [node] = sourcePlan.products;

      expect(node.alternativeFormats).toEqual([]);
      expect([...node.identityKeys, ...node.matchKeys].some((key) => key.includes(ISBN_B))).toBe(false);
    });
  });

  describe('SalesRights against ProductSupply markets (rules 23-28, 34-42)', () => {
    const forSaleGbIe = salesRights('01', territory({ countries: 'GB IE' }));

    it('passes a Market wholly inside the territory for sale, raising nothing', () => {
      const { plan } = reduce([
        record({
          publishing: forSaleGbIe + row('03'),
          supply: productSupply({ market: territory({ countries: 'GB' }) }),
        }),
      ]);

      expect(plan.findings.map(({ code }) => code)).toEqual([
        'SALES_RIGHTS_TERRITORY_NOT_REPRESENTED',
        'SALES_RIGHTS_ROW_NOT_REPRESENTED',
      ]);
    });

    it('blocks a Market that deterministically intersects explicit not-for-sale rights', () => {
      const { plan, commercial, productKey } = reduce([
        record({
          publishing:
            salesRights('01', territory({ regions: 'WORLD', countriesExcluded: 'US' })) +
            salesRights('03', territory({ countries: 'US' })),
          supply: productSupply({ market: territory({ countries: 'US CA' }) }),
        }),
      ]);
      const contradiction = findingOf(plan, 'SALES_RIGHTS_MARKET_CONTRADICTION');
      const marketTerritory = `${PRODUCT_1}/ProductSupply[1]/Market[1]/Territory[1]`;

      expect(contradiction).toMatchObject({
        classification: 'SOURCE_CONFLICT',
        blocking: true,
        resolution: { kind: 'NONE' },
        locations: [located(marketTerritory), located(`${PUBLISHING_1}/SalesRights[2]`)],
        detail: { market: 'US CA', types: ['03'] },
      });
      // The market compared is exactly the Stage-B fact, read and never re-derived.
      expect(commercial?.products[productKey].supplies[0].markets[0].territory?.path).toBe(marketTerritory);
    });

    it('blocks a Market inside a ROW territory that is not for sale, and passes one inside a ROW territory for sale', () => {
      const notForSale = reduce([
        record({
          publishing: forSaleGbIe + row('03'),
          supply: productSupply({ market: territory({ countries: 'FR' }) }),
        }),
      ]);
      const forSale = reduce([
        record({
          publishing: forSaleGbIe + row('02'),
          supply: productSupply({ market: territory({ countries: 'FR' }) }),
        }),
      ]);

      expect(findingOf(notForSale.plan, 'SALES_RIGHTS_MARKET_CONTRADICTION')).toMatchObject({
        locations: [
          located(`${PRODUCT_1}/ProductSupply[1]/Market[1]/Territory[1]`),
          located(`${PUBLISHING_1}/ROWSalesRightsType[1]`),
        ],
        detail: { market: 'FR', types: ['03'] },
      });
      expect(forSale.plan.findings.map(({ code }) => code)).not.toContain('SALES_RIGHTS_MARKET_CONTRADICTION');
      expect(forSale.plan.findings.map(({ code }) => code)).not.toContain('SALES_RIGHTS_MARKET_UNKNOWN');
    });

    it('reads a Market inside unknown or unstated ROW rights as uncertainty needing acknowledgement, never as permission', () => {
      const unknown = reduce([
        record({
          publishing: forSaleGbIe + row('00'),
          supply: productSupply({ market: territory({ countries: 'FR' }) }),
        }),
      ]);
      const unstated = reduce([
        record({ publishing: forSaleGbIe, supply: productSupply({ market: territory({ countries: 'FR' }) }) }),
      ]);

      expect(findingOf(unknown.plan, 'SALES_RIGHTS_MARKET_UNKNOWN')).toMatchObject({
        classification: 'TARGET_INPUT_REQUIRED',
        blocking: true,
        resolution: { kind: 'ACKNOWLEDGE' },
        locations: [
          located(`${PRODUCT_1}/ProductSupply[1]/Market[1]/Territory[1]`),
          located(`${PUBLISHING_1}/ROWSalesRightsType[1]`),
        ],
        detail: { market: 'FR', reason: 'ROW_UNKNOWN' },
      });
      expect(findingOf(unstated.plan, 'SALES_RIGHTS_MARKET_UNKNOWN')).toMatchObject({
        locations: [located(`${PRODUCT_1}/ProductSupply[1]/Market[1]/Territory[1]`)],
        detail: { market: 'FR', reason: 'ROW_UNSTATED' },
      });
      expect(unknown.plan.findings.map(({ code }) => code)).not.toContain('SALES_RIGHTS_MARKET_CONTRADICTION');
    });

    it('invents no Market-versus-rights failure where the source states no SalesRights, and compares no market without the Stage-B reduction', () => {
      const unstated = reduce([record({ supply: productSupply({ market: territory({ countries: 'FR' }) }) })]);
      const unreduced = reduce(
        [
          record({
            publishing: forSaleGbIe + row('03'),
            supply: productSupply({ market: territory({ countries: 'FR' }) }),
          }),
        ],
        { withCommercial: false },
      );

      expect(unstated.plan.findings).toEqual([]);
      expect(unreduced.plan.findings.map(({ code }) => code)).toEqual([
        'SALES_RIGHTS_TERRITORY_NOT_REPRESENTED',
        'SALES_RIGHTS_ROW_NOT_REPRESENTED',
      ]);
    });

    it('compares each Market of each ProductSupply on its own, and a Market without a Territory not at all', () => {
      const { plan } = reduce([
        record({
          publishing: forSaleGbIe + row('03'),
          supply:
            productSupply({ market: territory({ countries: 'GB' }) }) +
            productSupply({ market: territory({ countries: 'US' }) }) +
            productSupply({
              market: '<SalesRestriction><SalesRestrictionType>06</SalesRestrictionType></SalesRestriction>',
            }),
        }),
      ]);

      expect(plan.findings.filter(({ code }) => code === 'SALES_RIGHTS_MARKET_CONTRADICTION')).toHaveLength(1);
      expect(findingOf(plan, 'SALES_RIGHTS_MARKET_CONTRADICTION').locations[0].path).toBe(
        `${PRODUCT_1}/ProductSupply[2]/Market[1]/Territory[1]`,
      );
    });
  });

  describe('ProductContact (rules 50-64)', () => {
    it('keeps a PublishingDetail contact and a MarketPublishingDetail contact in their own scopes, never flattened', () => {
      const { product, plan } = reduce([
        record({
          publishing: contact({ role: '06', emails: ['permissions@example.org'] }),
          supply: productSupply({
            market: territory({ countries: 'US' }),
            marketPublishing: contact({ role: '06', organisation: 'US Agent', emails: ['permissions@example.org'] }),
          }),
        }),
      ]);

      expect(product.productContacts).toHaveLength(2);
      expect(product.productContacts[0]).toMatchObject({
        ...located(`${PUBLISHING_1}/ProductContact[1]`),
        scope: { kind: 'PUBLISHING_DETAIL' },
        role: '06',
        name: 'Example Press Permissions',
        emailAddresses: [
          { ...located(`${PUBLISHING_1}/ProductContact[1]/EmailAddress[1]`), value: 'permissions@example.org' },
        ],
      });
      expect(product.productContacts[1]).toMatchObject({
        ...located(`${PRODUCT_1}/ProductSupply[1]/MarketPublishingDetail[1]/ProductContact[1]`),
        scope: {
          kind: 'MARKET',
          productSupply: located(`${PRODUCT_1}/ProductSupply[1]`),
          marketTerritories: [expect.objectContaining({ countriesIncluded: 'US' })],
        },
        role: '06',
        name: 'US Agent',
      });
      // Two contacts of one role in two scopes are two losses, each acknowledged on its own.
      expect(codesOf(plan)).toEqual([
        ['PRODUCT_CONTACT_NOT_REPRESENTED', true, 'ACKNOWLEDGE'],
        ['PRODUCT_CONTACT_NOT_REPRESENTED', true, 'ACKNOWLEDGE'],
      ]);
      expect(plan.findings.map(({ detail }) => detail.scope)).toEqual(['PUBLISHING_DETAIL', 'MARKET']);
      expect(plan.findings.map(({ family }) => family)).toEqual(['PRODUCT_CONTACT', 'PRODUCT_CONTACT']);
      expect(new Set(plan.findings.map(({ key }) => key)).size).toBe(2);
    });

    it.each(['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '99'])(
      'follows the approved policy for List 198 role %s: high-salience roles need acknowledgement, the rest are disclosed',
      (role) => {
        const { plan } = reduce([record({ publishing: contact({ role }) })]);
        const highSalience = ONIX_HIGH_SALIENCE_CONTACT_ROLES.has(role);
        const [finding] = plan.findings;

        expect(plan.findings).toHaveLength(1);
        expect(finding).toMatchObject({
          code: 'PRODUCT_CONTACT_NOT_REPRESENTED',
          classification: 'TARGET_UNREPRESENTABLE',
          blocking: highSalience,
          resolution: { kind: highSalience ? 'ACKNOWLEDGE' : 'NONE' },
        });
        expect(finding.detail.role).toBe(role);
        // Product safety and raw-materials contacts are product-compliance contacts, said as such (rule 62).
        expect(finding.detail.compliance).toBe(role === '10' || role === '11' ? 'true' : 'false');
      },
    );

    it('speaks the plan-wide finding vocabulary: every finding names its family (Correction 2 of the #218 review)', () => {
      const { plan } = reduce([
        record({ publishing: salesRights('03', territory({ countries: 'US' })) + row('00') + contact({ role: '06' }) }),
      ]);

      expect(plan.findings.map(({ code, family }) => [code, family])).toEqual([
        ['SALES_RIGHTS_NOT_FOR_SALE_NOT_REPRESENTED', 'SALES_RIGHTS'],
        ['SALES_RIGHTS_ROW_UNKNOWN', 'SALES_RIGHTS'],
        ['PRODUCT_CONTACT_NOT_REPRESENTED', 'PRODUCT_CONTACT'],
      ]);
    });

    it('pins exactly the approved high-salience roles (rule 60)', () => {
      expect([...ONIX_HIGH_SALIENCE_CONTACT_ROLES].sort()).toEqual(['01', '06', '08', '09', '10', '11']);
    });

    it('reports a role List 198 does not hold as a gap the validator should have refused, and acknowledges nothing for it', () => {
      const { plan } = reduce([record({ publishing: contact({ role: '77' }) })]);

      expect(codesOf(plan)).toEqual([['PRODUCT_CONTACT_ROLE_UNEXPECTED', true, 'NONE']]);
      expect(plan.findings[0]).toMatchObject({ classification: 'PREFLIGHT_GAP', detail: { role: '77' } });
    });

    it('keeps repeated contacts and repeated telephone, fax and email values as repeatable facts, choosing no first one (rule 63)', () => {
      const { product, plan } = reduce(
        [
          record({
            publishing:
              contact({
                role: '06',
                emails: ['permissions@example.org', 'access@example.org'],
                telephones: ['+44 20 7946 0000', '+44 20 7946 0001'],
                faxes: ['+44 20 7946 0002'],
              }) + contact({ role: '06', organisation: 'Second Office', emails: ['permissions@example.org'] }),
          }),
        ],
        { release: '3.1' },
      );
      const [first, second] = product.productContacts;

      expect(first.emailAddresses.map(({ value }) => value)).toEqual(['permissions@example.org', 'access@example.org']);
      expect(first.telephoneNumbers.map(({ value }) => value)).toEqual(['+44 20 7946 0000', '+44 20 7946 0001']);
      expect(first.faxNumbers.map(({ value }) => value)).toEqual(['+44 20 7946 0002']);
      expect(second.name).toBe('Second Office');
      expect(plan.findings).toHaveLength(2);
      expect(plan.findings[0].detail).toMatchObject({ emails: 2, telephones: 2, faxes: 1 });
      expect(plan.findings[1].detail).toMatchObject({ emails: 1, telephones: 0, faxes: 0 });
    });

    it('interprets an identifier only by its declared List 44 type and IDTypeName, never by the shape of its value (rule 53)', () => {
      const { product, plan } = reduce([
        record({
          publishing: contact({
            role: '09',
            identifiers: [
              ['01', '0000000121032683', 'Internal'],
              ['16', '0000000121032683'],
            ],
            organisation: null,
            name: 'A Person',
          }),
        }),
      ]);
      const [rights] = product.productContacts;

      expect(rights.identifiers).toEqual([
        {
          ...located(`${PUBLISHING_1}/ProductContact[1]/ProductContactIdentifier[1]`),
          type: '01',
          typeName: 'Internal',
          value: '0000000121032683',
        },
        {
          ...located(`${PUBLISHING_1}/ProductContact[1]/ProductContactIdentifier[2]`),
          type: '16',
          typeName: null,
          value: '0000000121032683',
        },
      ]);
      expect(rights.name).toBeNull();
      expect(rights.contactName).toBe('A Person');
      expect(plan.findings[0].detail.identifierTypes).toEqual(['01', '16']);
    });

    it('keeps ONIX 3.1.2 postal data structured, and copies none of it into any message or diagnostic (rule 64)', () => {
      const { product, plan } = reduce(
        [
          record({
            publishing: contact({
              role: '10',
              address: {
                street: '1 Example Street',
                location: 'Exampletown',
                postalCode: 'EX1 1EX',
                region: 'GB-ENG',
                country: 'GB',
              },
            }),
          }),
        ],
        { release: '3.1' },
      );

      expect(product.productContacts[0].address).toEqual({
        streetAddress: '1 Example Street',
        locationName: 'Exampletown',
        postalCode: 'EX1 1EX',
        regionCode: 'GB-ENG',
        countryCode: 'GB',
      });
      expect(plan.findings[0].detail.address).toBe('true');
      expect(JSON.stringify([plan.findings[0].detail, plan.findings[0].message])).not.toContain('Example Street');
      expect(JSON.stringify([plan.findings[0].detail, plan.findings[0].message])).not.toContain('Exampletown');
    });

    it('shows an exact email match of an accessibility request contact to an existing publisher Accessibility contact as evidence only (rule 58)', () => {
      const accessibility = contact({ role: '01', emails: ['access@example.org'] });
      const matched = reduce([record({ publishing: accessibility })], {
        publisherAccessibilityContactEmails: ['other@example.org', 'access@example.org'],
      });
      const unmatched = reduce([record({ publishing: accessibility })], {
        publisherAccessibilityContactEmails: ['other@example.org'],
      });
      const notCompared = reduce([record({ publishing: accessibility })]);
      const otherRole = reduce([record({ publishing: contact({ role: '06', emails: ['access@example.org'] }) })], {
        publisherAccessibilityContactEmails: ['access@example.org'],
      });

      expect(matched.plan.findings[0].detail.existingAccessibilityContact).toBe('MATCHES_EMAIL');
      expect(unmatched.plan.findings[0].detail.existingAccessibilityContact).toBe('NO_MATCH');
      expect(notCompared.plan.findings[0].detail.existingAccessibilityContact).toBe('NOT_COMPARED');
      expect(otherRole.plan.findings[0].detail.existingAccessibilityContact).toBeUndefined();
      // The match erases nothing: the product-scoped contact is still lost, still blocking, still to acknowledge.
      expect(matched.plan.findings[0]).toMatchObject({ blocking: true, resolution: { kind: 'ACKNOWLEDGE' } });
      expect(matched.product.productContacts[0].emailAddresses[0].value).toBe('access@example.org');
    });

    it('keeps different contacts of two Products under one publisher as two product-scoped losses, never a publisher update', () => {
      const { plan, sourcePlan } = reduce([
        record({ ref: 'r1', isbn: ISBN_A, publishing: contact({ role: '06', emails: ['permissions@example.org'] }) }),
        record({
          ref: 'r2',
          isbn: ISBN_B,
          publishing: contact({ role: '06', organisation: 'Other Office', emails: ['access@example.org'] }),
        }),
      ]);

      expect(plan.findings.map(({ productKey, code }) => [productKey, code])).toEqual([
        [sourcePlan.products[0].productKey, 'PRODUCT_CONTACT_NOT_REPRESENTED'],
        [sourcePlan.products[1].productKey, 'PRODUCT_CONTACT_NOT_REPRESENTED'],
      ]);
      expect(plan.findings[1].locations).toEqual([located(`${PRODUCT_2}/PublishingDetail[1]/ProductContact[1]`)]);
    });
  });

  describe('privacy, provenance and purity (rules 65-70, 73)', () => {
    it('puts no raw email, telephone, fax or street value into any finding, and writes nothing to the console', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      const { plan } = reduce(
        [
          record({
            publishing:
              contact({
                role: '01',
                emails: ['access@example.org'],
                telephones: ['+44 20 7946 0000'],
                faxes: ['+44 20 7946 0001'],
                address: { street: '1 Example Street', location: 'Exampletown', country: 'GB' },
              }) + salesRights('01', WORLD),
          }),
        ],
        { release: '3.1', publisherAccessibilityContactEmails: ['access@example.org'] },
      );
      const serialised = JSON.stringify(plan.findings);

      PII.forEach((value) => expect(serialised).not.toContain(value));
      expect(error).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
      expect(log).not.toHaveBeenCalled();
    });

    it('locates every fact and finding by its canonical path and the source path provenance maps it to', () => {
      const provenance = {
        sourcePathOf: (path: string) => path.replace('/ONIXMessage[1]', '/x:ONIXMessage[1]'),
      } as unknown as ProvenanceResolver;
      const { product, plan } = reduce([record({ publishing: salesRights('01', WORLD) + contact({ role: '06' }) })], {
        provenance,
      });

      expect(product.salesRights[0]).toMatchObject({
        path: `${PUBLISHING_1}/SalesRights[1]`,
        sourcePath: `${PUBLISHING_1.replace('/ONIXMessage[1]', '/x:ONIXMessage[1]')}/SalesRights[1]`,
      });
      expect(product.productContacts[0].sourcePath).toContain('/x:ONIXMessage[1]');
      plan.findings.forEach(({ locations }) =>
        locations.forEach(({ path, sourcePath }) =>
          expect(sourcePath).toBe(path.replace('/ONIXMessage[1]', '/x:ONIXMessage[1]')),
        ),
      );
    });

    it('is pure and deterministic: no fetch, no clock, and the same message reduces to the same plan', () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('never fetched'));
      const now = vi.spyOn(Date, 'now');
      const records = [
        record({
          publishing:
            salesRights(
              '01',
              territory({ regions: 'WORLD', countriesExcluded: 'US' }),
              restriction({ start: '20990101' }),
            ) +
            salesRights('03', territory({ countries: 'US' })) +
            row('00') +
            contact({ role: '08' }),
          supply: productSupply({ market: territory({ countries: 'GB' }) }),
        }),
      ];

      expect(reduce(records).plan).toEqual(reduce(records).plan);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(now).not.toHaveBeenCalled();
    });

    it('lists every finding of a Product on that Product, in the order raised, and reduces Products in file order', () => {
      const { plan, sourcePlan } = reduce([
        record({ ref: 'r1', isbn: ISBN_A, publishing: contact({ role: '02' }) }),
        record({ ref: 'r2', isbn: ISBN_B, publishing: salesRights('01', WORLD) }),
      ]);
      const [first, second] = sourcePlan.products;

      expect(plan.products[first.productKey].findingKeys).toEqual([plan.findings[0].key]);
      expect(plan.products[second.productKey].findingKeys).toEqual([plan.findings[1].key]);
      expect(plan.findings.map(({ productKey }) => productKey)).toEqual([first.productKey, second.productKey]);
    });
  });
});
