import { parse } from '@5stones/onix';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { OnixCommercialPlan } from '../../types/onixPlanning';
import type { ExtendedONIXMessageRoot } from './interfaces';
import { reduceOnixCommercial } from './onixCommercial';
import { planOnixSource } from './onixPlanning';
import { reduceOnixRights } from './onixRights';

const REFERENCE_NS = 'http://ns.editeur.org/onix/3.0/reference';
const PRODUCT_1 = '/ONIXMessage[1]/Product[1]';

const header = (defaults = '') =>
  `<Header><Sender><SenderName>Example Press</SenderName></Sender><SentDateTime>20260917</SentDateTime>${defaults}</Header>`;

const TITLE =
  '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText language="eng">A Work</TitleText></TitleElement></TitleDetail>';

/** One complete Product record: a paperback unless a form is given, with whatever ProductSupply the case states. */
const record = ({
  ref = 'r1',
  isbn = '9781800000018',
  form = '<ProductForm>BC</ProductForm>',
  supply = '',
}: {
  ref?: string;
  isbn?: string;
  form?: string;
  supply?: string;
}) =>
  `<Product><RecordReference>${ref}</RecordReference><NotificationType>03</NotificationType>` +
  `<ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>${isbn}</IDValue></ProductIdentifier>` +
  `<DescriptiveDetail><ProductComposition>00</ProductComposition>${form}${TITLE}</DescriptiveDetail>` +
  '<PublishingDetail><Imprint><ImprintName>Example Imprint</ImprintName></Imprint><PublishingStatus>02</PublishingStatus></PublishingDetail>' +
  `${supply}</Product>`;

const supplier = ({ role = '01', name = 'Example Supplier', websites = '' } = {}) =>
  `<Supplier><SupplierRole>${role}</SupplierRole><SupplierName>${name}</SupplierName>${websites}</Supplier>`;

const price = ({ type = '02', amount = '20.00', currency = 'GBP', before = '', after = '' } = {}) =>
  `<Price>${type === '' ? '' : `<PriceType>${type}</PriceType>`}${before}<PriceAmount>${amount}</PriceAmount>` +
  `${currency === '' ? '' : `<CurrencyCode>${currency}</CurrencyCode>`}${after}</Price>`;

const supplyDetail = ({
  supplierXml = supplier(),
  availability = '20',
  dates = '',
  prices = [] as string[],
  unpriced = '',
} = {}) =>
  `<SupplyDetail>${supplierXml}<ProductAvailability>${availability}</ProductAvailability>${dates}` +
  `${unpriced === '' ? prices.join('') : `<UnpricedItemType>${unpriced}</UnpricedItemType>`}</SupplyDetail>`;

const market = (territory: string) => `<Market><Territory>${territory}</Territory></Market>`;

const productSupply = (details: string[], markets = '') =>
  `<ProductSupply>${markets}${details.join('')}</ProductSupply>`;

const reduce = (records: string[], headerXml = header(), release: '3.0' | '3.1' = '3.0') => {
  const root = parse(
    `<ONIXMessage release="${release}" xmlns="http://ns.editeur.org/onix/${release}/reference">${headerXml}${records.join('')}</ONIXMessage>`,
  ) as ExtendedONIXMessageRoot;
  const sourcePlan = planOnixSource(root);

  return { root, sourcePlan, plan: reduceOnixCommercial(root, sourcePlan) };
};

/** A reduction's price findings, in the order they were raised: everything but its supply disclosures. */
const priceFindings = (plan: OnixCommercialPlan) => plan.findings.filter(({ code }) => code.startsWith('PRICE_'));

/** A canonical path, as a Reference source states it at the same path. */
const located = (path: string) => ({ path, sourcePath: path });

/** A stated text: its value, with the language and text format its element declares. */
const text = (value: string, language: string | null = null, textFormat: string | null = null) => ({
  value,
  language,
  textFormat,
  markupNotKept: false,
});

describe('reduceOnixCommercial', () => {
  describe('source normalisation (ONIX-AUDIT-PRODUCT-SUPPLY-01 rules 1-8)', () => {
    it('keeps every ProductSupply, SupplyDetail and Price the record states, each at its own path and in its own market', () => {
      const { plan, sourcePlan } = reduce([
        record({
          supply:
            productSupply(
              [
                supplyDetail({
                  supplierXml: supplier({ name: 'UK Distributor' }),
                  prices: [price({ amount: '20.00' }), price({ type: '01', amount: '16.67' })],
                }),
                supplyDetail({ supplierXml: supplier({ role: '04', name: 'UK Wholesaler' }), prices: [price()] }),
              ],
              market('<CountriesIncluded>GB IE</CountriesIncluded>'),
            ) +
            productSupply(
              [
                supplyDetail({
                  supplierXml: supplier({ name: 'US Distributor' }),
                  prices: [price({ amount: '25.00', currency: 'USD' })],
                }),
              ],
              market('<CountriesIncluded>US</CountriesIncluded>'),
            ),
        }),
      ]);
      const [{ productKey }] = sourcePlan.products;

      expect(
        plan.products[productKey].supplies.map(({ path, markets, supplyDetails }) => [
          path,
          markets.map(({ territory }) => territory?.countriesIncluded ?? null),
          supplyDetails.map(({ path: detailPath, supplier: party, prices }) => [
            detailPath,
            party?.role ?? null,
            party?.name ?? null,
            prices.map(({ path: pricePath, type, amount, currency }) => [
              pricePath,
              type.value,
              amount,
              currency.value,
            ]),
          ]),
        ]),
      ).toEqual([
        [
          `${PRODUCT_1}/ProductSupply[1]`,
          ['GB IE'],
          [
            [
              `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]`,
              '01',
              'UK Distributor',
              [
                [`${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]/Price[1]`, '02', '20.00', 'GBP'],
                [`${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]/Price[2]`, '01', '16.67', 'GBP'],
              ],
            ],
            [
              `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[2]`,
              '04',
              'UK Wholesaler',
              [[`${PRODUCT_1}/ProductSupply[1]/SupplyDetail[2]/Price[1]`, '02', '20.00', 'GBP']],
            ],
          ],
        ],
        [
          `${PRODUCT_1}/ProductSupply[2]`,
          ['US'],
          [
            [
              `${PRODUCT_1}/ProductSupply[2]/SupplyDetail[1]`,
              '01',
              'US Distributor',
              [[`${PRODUCT_1}/ProductSupply[2]/SupplyDetail[1]/Price[1]`, '02', '25.00', 'USD']],
            ],
          ],
        ],
      ]);
    });

    it('takes a PriceType or CurrencyCode a Price does not state from the Header default, and says which it took', () => {
      const { plan, sourcePlan } = reduce(
        [
          record({
            supply: productSupply([
              supplyDetail({
                prices: [
                  price({ type: '', currency: '', amount: '20.00' }),
                  price({ type: '01', currency: 'USD', amount: '25.00' }),
                ],
              }),
            ]),
          }),
        ],
        header('<DefaultPriceType>02</DefaultPriceType><DefaultCurrencyCode>GBP</DefaultCurrencyCode>'),
      );
      const [{ productKey }] = sourcePlan.products;
      const [inherited, stated] = plan.products[productKey].supplies[0].supplyDetails[0].prices;
      const PRICES = `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]`;

      expect([inherited.type, inherited.currency]).toEqual([
        {
          value: '02',
          origin: 'HEADER_DEFAULT',
          location: {
            path: '/ONIXMessage[1]/Header[1]/DefaultPriceType[1]',
            sourcePath: '/ONIXMessage[1]/Header[1]/DefaultPriceType[1]',
          },
        },
        {
          value: 'GBP',
          origin: 'HEADER_DEFAULT',
          location: {
            path: '/ONIXMessage[1]/Header[1]/DefaultCurrencyCode[1]',
            sourcePath: '/ONIXMessage[1]/Header[1]/DefaultCurrencyCode[1]',
          },
        },
      ]);
      expect([stated.type, stated.currency]).toEqual([
        {
          value: '01',
          origin: 'EXPLICIT',
          location: { path: `${PRICES}/Price[2]/PriceType[1]`, sourcePath: `${PRICES}/Price[2]/PriceType[1]` },
        },
        {
          value: 'USD',
          origin: 'EXPLICIT',
          location: { path: `${PRICES}/Price[2]/CurrencyCode[1]`, sourcePath: `${PRICES}/Price[2]/CurrencyCode[1]` },
        },
      ]);

      const { plan: withoutDefaults, sourcePlan: plain } = reduce([
        record({ supply: productSupply([supplyDetail({ prices: [price({ type: '', currency: '' })] })]) }),
      ]);
      const [none] = withoutDefaults.products[plain.products[0].productKey].supplies[0].supplyDetails[0].prices;

      expect([none.type, none.currency]).toEqual([
        { value: null, origin: 'ABSENT', location: null },
        { value: null, origin: 'ABSENT', location: null },
      ]);
    });

    it('keeps who supplies it - role, identifiers, name, every contact point with its value, and every website with its descriptions and links', () => {
      const SUPPLIER = `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]/Supplier[1]`;
      const { plan, sourcePlan } = reduce([
        record({
          supply: productSupply([
            supplyDetail({
              supplierXml:
                '<Supplier><SupplierRole>11</SupplierRole>' +
                '<SupplierIdentifier><SupplierIDType>06</SupplierIDType><IDValue>5012345678900</IDValue></SupplierIdentifier>' +
                '<SupplierIdentifier><SupplierIDType>01</SupplierIDType><IDTypeName>Own code</IDTypeName><IDValue>DIST-9</IDValue></SupplierIdentifier>' +
                '<SupplierName>Example Distribution</SupplierName>' +
                '<TelephoneNumber>+44 20 7946 0000</TelephoneNumber><FaxNumber>+44 20 7946 0001</FaxNumber>' +
                '<EmailAddress>orders@distribution.example</EmailAddress><EmailAddress>returns@distribution.example</EmailAddress>' +
                '<Website><WebsiteRole>36</WebsiteRole><WebsiteDescription language="eng">Product page</WebsiteDescription><WebsiteLink>https://distribution.example/book</WebsiteLink></Website>' +
                '<Website><WebsiteRole>29</WebsiteRole><WebsiteLink language="eng">https://distribution.example/book.pdf</WebsiteLink><WebsiteLink language="fre">https://distribution.example/livre.pdf</WebsiteLink></Website>' +
                '<Website><WebsiteLink>https://distribution.example/</WebsiteLink></Website>' +
                '</Supplier>',
              prices: [price()],
            }),
          ]),
        }),
      ]);
      const [{ productKey }] = sourcePlan.products;

      expect(plan.products[productKey].supplies[0].supplyDetails[0].supplier).toEqual({
        ...located(SUPPLIER),
        role: '11',
        name: 'Example Distribution',
        identifiers: [
          { ...located(`${SUPPLIER}/SupplierIdentifier[1]`), type: '06', typeName: null, value: '5012345678900' },
          { ...located(`${SUPPLIER}/SupplierIdentifier[2]`), type: '01', typeName: 'Own code', value: 'DIST-9' },
        ],
        // Every contact point keeps the value the file states, each where it is stated.
        telephoneNumbers: [{ ...located(`${SUPPLIER}/TelephoneNumber[1]`), value: '+44 20 7946 0000' }],
        faxNumbers: [{ ...located(`${SUPPLIER}/FaxNumber[1]`), value: '+44 20 7946 0001' }],
        emailAddresses: [
          { ...located(`${SUPPLIER}/EmailAddress[1]`), value: 'orders@distribution.example' },
          { ...located(`${SUPPLIER}/EmailAddress[2]`), value: 'returns@distribution.example' },
        ],
        websites: [
          {
            ...located(`${SUPPLIER}/Website[1]`),
            role: '36',
            descriptions: [
              { ...located(`${SUPPLIER}/Website[1]/WebsiteDescription[1]`), ...text('Product page', 'eng') },
            ],
            links: [{ ...located(`${SUPPLIER}/Website[1]/WebsiteLink[1]`), link: 'https://distribution.example/book' }],
          },
          {
            ...located(`${SUPPLIER}/Website[2]`),
            role: '29',
            descriptions: [],
            links: [
              { ...located(`${SUPPLIER}/Website[2]/WebsiteLink[1]`), link: 'https://distribution.example/book.pdf' },
              { ...located(`${SUPPLIER}/Website[2]/WebsiteLink[2]`), link: 'https://distribution.example/livre.pdf' },
            ],
          },
          {
            ...located(`${SUPPLIER}/Website[3]`),
            role: null,
            descriptions: [],
            links: [{ ...located(`${SUPPLIER}/Website[3]/WebsiteLink[1]`), link: 'https://distribution.example/' }],
          },
        ],
      });
    });

    it('keeps what a SupplyDetail says about ordering, stock and returns with its values - own coding, returns, order time, stock, pack, pallet and order quantities', () => {
      const DETAIL = `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]`;
      const { plan, sourcePlan } = reduce(
        [
          record({
            supply: productSupply([
              '<SupplyDetail>' +
                supplier() +
                '<SupplierOwnCoding><SupplierCodeType>01</SupplierCodeType><SupplierCodeTypeName>Discount group</SupplierCodeTypeName><SupplierCodeValue>TRADE-A</SupplierCodeValue></SupplierOwnCoding>' +
                '<ReturnsConditions><ReturnsCodeType>02</ReturnsCodeType><ReturnsCode>Y</ReturnsCode><ReturnsNote language="eng">Returnable within 90 days</ReturnsNote></ReturnsConditions>' +
                '<ProductAvailability>21</ProductAvailability>' +
                '<OrderTime>7</OrderTime>' +
                '<Stock><LocationIdentifier><LocationIDType>06</LocationIDType><IDValue>5012345000001</IDValue></LocationIdentifier>' +
                '<LocationName language="eng">Central warehouse</LocationName><OnHand>12</OnHand><Proximity>03</Proximity><Reserved>2</Reserved><OnOrder>40</OnOrder>' +
                '<OnOrderDetail><OnOrder>40</OnOrder><Proximity>02</Proximity><ExpectedDate dateformat="00">20261015</ExpectedDate></OnOrderDetail>' +
                '<Velocity><VelocityMetric>01</VelocityMetric><Rate>9</Rate></Velocity></Stock>' +
                '<Stock><StockQuantityCoded><StockQuantityCodeType>01</StockQuantityCodeType><StockQuantityCodeTypeName>Band</StockQuantityCodeTypeName><StockQuantityCode>LOW</StockQuantityCode></StockQuantityCoded></Stock>' +
                '<PackQuantity>20</PackQuantity><PalletQuantity>400</PalletQuantity>' +
                '<OrderQuantityMinimum>10</OrderQuantityMinimum><OrderQuantityMinimum>40</OrderQuantityMinimum><OrderQuantityMultiple>5</OrderQuantityMultiple>' +
                price() +
                '</SupplyDetail>',
            ]),
          }),
        ],
        header(),
        '3.1',
      );
      const [detail] = plan.products[sourcePlan.products[0].productKey].supplies[0].supplyDetails;

      expect(detail).toMatchObject({
        supplierOwnCodings: [
          {
            ...located(`${DETAIL}/SupplierOwnCoding[1]`),
            type: '01',
            typeName: 'Discount group',
            value: 'TRADE-A',
          },
        ],
        returnsConditions: [
          {
            ...located(`${DETAIL}/ReturnsConditions[1]`),
            type: '02',
            typeName: null,
            code: 'Y',
            notes: [
              {
                ...located(`${DETAIL}/ReturnsConditions[1]/ReturnsNote[1]`),
                ...text('Returnable within 90 days', 'eng'),
              },
            ],
          },
        ],
        availability: '21',
        orderTime: '7',
        stocks: [
          {
            ...located(`${DETAIL}/Stock[1]`),
            locationIdentifiers: [
              {
                ...located(`${DETAIL}/Stock[1]/LocationIdentifier[1]`),
                type: '06',
                typeName: null,
                value: '5012345000001',
              },
            ],
            locationNames: [{ ...located(`${DETAIL}/Stock[1]/LocationName[1]`), ...text('Central warehouse', 'eng') }],
            quantitiesCoded: [],
            onHand: '12',
            reserved: '2',
            onOrder: '40',
            cbo: null,
            proximities: [{ ...located(`${DETAIL}/Stock[1]/Proximity[1]`), value: '03' }],
            onOrderDetails: [
              {
                ...located(`${DETAIL}/Stock[1]/OnOrderDetail[1]`),
                onOrder: '40',
                proximity: '02',
                expectedDate: '20261015',
                expectedDateFormat: '00',
              },
            ],
            velocities: [{ ...located(`${DETAIL}/Stock[1]/Velocity[1]`), metric: '01', rate: '9', proximity: null }],
          },
          {
            ...located(`${DETAIL}/Stock[2]`),
            locationIdentifiers: [],
            locationNames: [],
            quantitiesCoded: [
              {
                ...located(`${DETAIL}/Stock[2]/StockQuantityCoded[1]`),
                type: '01',
                typeName: 'Band',
                code: 'LOW',
              },
            ],
            onHand: null,
            reserved: null,
            onOrder: null,
            cbo: null,
            proximities: [],
            onOrderDetails: [],
            velocities: [],
          },
        ],
        packQuantity: '20',
        palletQuantity: '400',
        orderQuantityMinimums: [
          { ...located(`${DETAIL}/OrderQuantityMinimum[1]`), value: '10' },
          { ...located(`${DETAIL}/OrderQuantityMinimum[2]`), value: '40' },
        ],
        orderQuantityMultiple: '5',
      });
    });

    it('keeps a new supplier and every supply contact the SupplyDetail names, with their values', () => {
      const DETAIL = `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]`;
      const { plan, sourcePlan } = reduce(
        [
          record({
            supply: productSupply([
              '<SupplyDetail>' +
                supplier() +
                '<SupplyContact><SupplyContactRole>09</SupplyContactRole>' +
                '<SupplyContactIdentifier><SupplyContactIDType>06</SupplyContactIDType><IDValue>5012345000002</IDValue></SupplyContactIdentifier>' +
                '<SupplyContactName>Example Distribution returns</SupplyContactName><ContactName>R. Clerk</ContactName>' +
                '<TelephoneNumber>+44 20 7946 0002</TelephoneNumber><EmailAddress>returns@distribution.example</EmailAddress>' +
                '<StreetAddress>1 Example Street</StreetAddress><LocationName>London</LocationName><PostalCode>N1 1AA</PostalCode><CountryCode>GB</CountryCode>' +
                '</SupplyContact>' +
                '<ProductAvailability>43</ProductAvailability>' +
                '<NewSupplier><SupplierIdentifier><SupplierIDType>06</SupplierIDType><IDValue>5012345000003</IDValue></SupplierIdentifier>' +
                '<SupplierName>New Distribution</SupplierName><TelephoneNumber>+44 20 7946 0003</TelephoneNumber>' +
                '<EmailAddress>orders@new.example</EmailAddress>' +
                '<Website><WebsiteRole>33</WebsiteRole><WebsiteLink>https://new.example/</WebsiteLink></Website></NewSupplier>' +
                '<UnpricedItemType>04</UnpricedItemType>' +
                '</SupplyDetail>',
            ]),
          }),
        ],
        header(),
        '3.1',
      );
      const [detail] = plan.products[sourcePlan.products[0].productKey].supplies[0].supplyDetails;

      expect(detail.supplyContacts).toEqual([
        {
          ...located(`${DETAIL}/SupplyContact[1]`),
          role: '09',
          identifiers: [
            {
              ...located(`${DETAIL}/SupplyContact[1]/SupplyContactIdentifier[1]`),
              type: '06',
              typeName: null,
              value: '5012345000002',
            },
          ],
          name: 'Example Distribution returns',
          contactName: 'R. Clerk',
          telephoneNumbers: [
            { ...located(`${DETAIL}/SupplyContact[1]/TelephoneNumber[1]`), value: '+44 20 7946 0002' },
          ],
          faxNumbers: [],
          emailAddresses: [
            { ...located(`${DETAIL}/SupplyContact[1]/EmailAddress[1]`), value: 'returns@distribution.example' },
          ],
          address: {
            streetAddress: '1 Example Street',
            locationName: 'London',
            postalCode: 'N1 1AA',
            regionCode: null,
            countryCode: 'GB',
          },
        },
      ]);
      expect(detail.newSupplier).toEqual({
        ...located(`${DETAIL}/NewSupplier[1]`),
        identifiers: [
          {
            ...located(`${DETAIL}/NewSupplier[1]/SupplierIdentifier[1]`),
            type: '06',
            typeName: null,
            value: '5012345000003',
          },
        ],
        name: 'New Distribution',
        telephoneNumbers: [{ ...located(`${DETAIL}/NewSupplier[1]/TelephoneNumber[1]`), value: '+44 20 7946 0003' }],
        faxNumbers: [],
        emailAddresses: [{ ...located(`${DETAIL}/NewSupplier[1]/EmailAddress[1]`), value: 'orders@new.example' }],
        websites: [
          {
            ...located(`${DETAIL}/NewSupplier[1]/Website[1]`),
            role: '33',
            descriptions: [],
            links: [{ ...located(`${DETAIL}/NewSupplier[1]/Website[1]/WebsiteLink[1]`), link: 'https://new.example/' }],
          },
        ],
      });
      // A new supplier's website is where to order from next, never this Publication's Location.
      expect(plan.products[sourcePlan.products[0].productKey].carriers).toEqual({
        PHYSICAL: { location: { kind: 'NONE' }, findingKeys: [] },
      });
    });

    it('keeps every Market sales restriction as stated - type, outlets, notes and dates - and never reads it as sales rights', () => {
      const MARKET = `${PRODUCT_1}/ProductSupply[1]/Market[1]`;
      const { plan, sourcePlan } = reduce([
        record({
          supply: productSupply(
            [supplyDetail({ prices: [price()] })],
            '<Market><Territory><CountriesIncluded>GB</CountriesIncluded><RegionsExcluded>GB-NIR</RegionsExcluded></Territory>' +
              '<SalesRestriction><SalesRestrictionType>04</SalesRestrictionType>' +
              '<SalesOutlet><SalesOutletIdentifier><SalesOutletIDType>03</SalesOutletIDType><IDValue>WAT</IDValue></SalesOutletIdentifier><SalesOutletName>Waterstones</SalesOutletName></SalesOutlet>' +
              '<SalesOutlet><SalesOutletName>Example Books</SalesOutletName></SalesOutlet>' +
              '<SalesRestrictionNote language="eng">Retailer exclusive</SalesRestrictionNote>' +
              '<StartDate dateformat="00">20260101</StartDate><EndDate dateformat="00">20261231</EndDate></SalesRestriction></Market>',
          ),
        }),
      ]);
      const [supply] = plan.products[sourcePlan.products[0].productKey].supplies;

      expect(supply.markets).toEqual([
        {
          ...located(MARKET),
          territory: {
            ...located(`${MARKET}/Territory[1]`),
            countriesIncluded: 'GB',
            regionsIncluded: null,
            countriesExcluded: null,
            regionsExcluded: 'GB-NIR',
          },
          salesRestrictions: [
            {
              ...located(`${MARKET}/SalesRestriction[1]`),
              type: '04',
              outlets: [
                {
                  ...located(`${MARKET}/SalesRestriction[1]/SalesOutlet[1]`),
                  identifiers: [
                    {
                      ...located(`${MARKET}/SalesRestriction[1]/SalesOutlet[1]/SalesOutletIdentifier[1]`),
                      type: '03',
                      typeName: null,
                      value: 'WAT',
                    },
                  ],
                  name: 'Waterstones',
                },
                {
                  ...located(`${MARKET}/SalesRestriction[1]/SalesOutlet[2]`),
                  identifiers: [],
                  name: 'Example Books',
                },
              ],
              notes: [
                {
                  ...located(`${MARKET}/SalesRestriction[1]/SalesRestrictionNote[1]`),
                  ...text('Retailer exclusive', 'eng'),
                },
              ],
              startDate: '20260101',
              startDateFormat: '00',
              endDate: '20261231',
              endDateFormat: '00',
            },
          ],
        },
      ]);
      // A sales restriction is a supply fact here, disclosed as one, and nothing is read into sales rights from it.
      expect(plan.findings.map(({ code }) => code)).toEqual(['PRICE_REDUCED', 'SUPPLY_NOT_REPRESENTED']);
      expect(JSON.stringify(plan)).not.toMatch(/salesRights|SALES_RIGHTS/);
    });

    it('keeps what a MarketPublishingDetail states with its values - representatives, contacts, status notes, dates, campaigns, print runs and sales', () => {
      const DETAIL = `${PRODUCT_1}/ProductSupply[1]/MarketPublishingDetail[1]`;
      const { plan, sourcePlan } = reduce(
        [
          record({
            supply:
              '<ProductSupply><MarketReference>UK-TRADE</MarketReference>' +
              '<Market><Territory><CountriesIncluded>GB</CountriesIncluded></Territory></Market>' +
              '<MarketPublishingDetail>' +
              '<PublisherRepresentative><AgentRole>07</AgentRole>' +
              '<AgentIdentifier><AgentIDType>06</AgentIDType><IDValue>5012345000004</IDValue></AgentIdentifier>' +
              '<AgentName>Example Agency</AgentName><TelephoneNumber>+44 20 7946 0004</TelephoneNumber>' +
              '<EmailAddress>agency@agency.example</EmailAddress>' +
              '<Website><WebsiteRole>01</WebsiteRole><WebsiteLink>https://agency.example/</WebsiteLink></Website></PublisherRepresentative>' +
              '<ProductContact><ProductContactRole>01</ProductContactRole><ProductContactName>Example Press accessibility</ProductContactName>' +
              '<ContactName>A. Person</ContactName><EmailAddress>access@press.example</EmailAddress></ProductContact>' +
              '<MarketPublishingStatus>02</MarketPublishingStatus>' +
              '<MarketPublishingStatusNote language="eng">Delayed for the UK market</MarketPublishingStatusNote>' +
              '<MarketDate><MarketDateRole>01</MarketDateRole><Date dateformat="00">20261001</Date></MarketDate>' +
              '<PromotionCampaign>National press campaign</PromotionCampaign>' +
              '<InitialPrintRun>2,000 copies</InitialPrintRun><ReprintDetail>Second printing 2027</ReprintDetail>' +
              '<CopiesSold>1,500 copies in hardback</CopiesSold><BookClubAdoption>Book of the month</BookClubAdoption>' +
              '</MarketPublishingDetail>' +
              supplyDetail({ availability: '10', unpriced: '02' }) +
              '</ProductSupply>',
          }),
        ],
        header(),
        '3.1',
      );
      const [supply] = plan.products[sourcePlan.products[0].productKey].supplies;

      expect(supply.marketReference).toBe('UK-TRADE');
      expect(supply.marketPublishing).toEqual({
        ...located(DETAIL),
        publisherRepresentatives: [
          {
            ...located(`${DETAIL}/PublisherRepresentative[1]`),
            role: '07',
            identifiers: [
              {
                ...located(`${DETAIL}/PublisherRepresentative[1]/AgentIdentifier[1]`),
                type: '06',
                typeName: null,
                value: '5012345000004',
              },
            ],
            name: 'Example Agency',
            telephoneNumbers: [
              { ...located(`${DETAIL}/PublisherRepresentative[1]/TelephoneNumber[1]`), value: '+44 20 7946 0004' },
            ],
            faxNumbers: [],
            emailAddresses: [
              { ...located(`${DETAIL}/PublisherRepresentative[1]/EmailAddress[1]`), value: 'agency@agency.example' },
            ],
            websites: [
              {
                ...located(`${DETAIL}/PublisherRepresentative[1]/Website[1]`),
                role: '01',
                descriptions: [],
                links: [
                  {
                    ...located(`${DETAIL}/PublisherRepresentative[1]/Website[1]/WebsiteLink[1]`),
                    link: 'https://agency.example/',
                  },
                ],
              },
            ],
          },
        ],
        // Kept as a supply fact only: what a product contact means is the ProductContact stage's.
        productContacts: [
          {
            ...located(`${DETAIL}/ProductContact[1]`),
            role: '01',
            identifiers: [],
            name: 'Example Press accessibility',
            contactName: 'A. Person',
            telephoneNumbers: [],
            faxNumbers: [],
            emailAddresses: [
              { ...located(`${DETAIL}/ProductContact[1]/EmailAddress[1]`), value: 'access@press.example' },
            ],
            address: null,
          },
        ],
        status: '02',
        statusNotes: [
          { ...located(`${DETAIL}/MarketPublishingStatusNote[1]`), ...text('Delayed for the UK market', 'eng') },
        ],
        dates: [{ ...located(`${DETAIL}/MarketDate[1]`), role: '01', date: '20261001', dateFormat: '00' }],
        promotionCampaigns: [{ ...located(`${DETAIL}/PromotionCampaign[1]`), ...text('National press campaign') }],
        promotionContact: null,
        initialPrintRuns: [{ ...located(`${DETAIL}/InitialPrintRun[1]`), ...text('2,000 copies') }],
        reprintDetails: [{ ...located(`${DETAIL}/ReprintDetail[1]`), ...text('Second printing 2027') }],
        copiesSold: [{ ...located(`${DETAIL}/CopiesSold[1]`), ...text('1,500 copies in hardback') }],
        bookClubAdoptions: [{ ...located(`${DETAIL}/BookClubAdoption[1]`), ...text('Book of the month') }],
      });
      // A market's publishing status and dates stay the market's: nothing about the Work's lifecycle is decided.
      expect(JSON.stringify(plan)).not.toMatch(/workStatus|publicationDate|withdrawnDate/);
    });

    it('keeps every semantic of a Price with its values - tax, conditions, constraints, bonuses, discounts, descriptions, territory, dates, comparisons', () => {
      const PRICE = `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]/Price[1]`;
      const UNPRICED = `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]/Price[2]`;
      const { root, plan, sourcePlan } = reduce([
        record({
          supply: productSupply([
            supplyDetail({
              prices: [
                '<Price><PriceIdentifier><PriceIDType>01</PriceIDType><IDTypeName>List</IDTypeName><IDValue>P-1</IDValue></PriceIdentifier>' +
                  '<PriceType>04</PriceType><PriceQualifier>10</PriceQualifier>' +
                  '<EpubTechnicalProtection>03</EpubTechnicalProtection>' +
                  '<PriceConstraint><PriceConstraintType>07</PriceConstraintType><PriceConstraintStatus>02</PriceConstraintStatus>' +
                  '<PriceConstraintLimit><Quantity>3</Quantity><PriceConstraintUnit>10</PriceConstraintUnit></PriceConstraintLimit></PriceConstraint>' +
                  '<PriceTypeDescription language="eng">Library price for institutions</PriceTypeDescription>' +
                  '<PricePer>01</PricePer>' +
                  '<PriceCondition><PriceConditionType>03</PriceConditionType>' +
                  '<PriceConditionQuantity><PriceConditionQuantityType>01</PriceConditionQuantityType><Quantity>12</Quantity><QuantityUnit>09</QuantityUnit></PriceConditionQuantity>' +
                  '<ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9781800000025</IDValue></ProductIdentifier></PriceCondition>' +
                  '<MinimumOrderQuantity>5</MinimumOrderQuantity><BatchBonus><BatchQuantity>10</BatchQuantity><FreeQuantity>1</FreeQuantity></BatchBonus>' +
                  '<DiscountCoded><DiscountCodeType>02</DiscountCodeType><DiscountCodeTypeName>Trade band</DiscountCodeTypeName><DiscountCode>B2</DiscountCode></DiscountCoded>' +
                  '<Discount><DiscountType>01</DiscountType><Quantity>20</Quantity><ToQuantity>49</ToQuantity><DiscountPercent>35</DiscountPercent></Discount>' +
                  '<PriceStatus>01</PriceStatus><PriceAmount>18.50</PriceAmount>' +
                  '<Tax><ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9781800000032</IDValue></ProductIdentifier>' +
                  '<PricePartDescription language="eng">Printed part</PricePartDescription><TaxType>01</TaxType><TaxRateCode>R</TaxRateCode>' +
                  '<TaxRatePercent>7</TaxRatePercent><TaxableAmount>17.29</TaxableAmount><TaxAmount>1.21</TaxAmount></Tax>' +
                  '<Tax><TaxType>01</TaxType><TaxRateCode>Z</TaxRateCode><TaxRatePercent>0</TaxRatePercent></Tax>' +
                  '<CurrencyCode>EUR</CurrencyCode><Territory><CountriesIncluded>DE AT</CountriesIncluded></Territory><CurrencyZone>EUR</CurrencyZone>' +
                  '<PriceDate><PriceDateRole>14</PriceDateRole><Date dateformat="00">20270101</Date></PriceDate>' +
                  '<PrintedOnProduct>02</PrintedOnProduct><PositionOnProduct>01</PositionOnProduct></Price>',
                '<Price><PriceType>02</PriceType><PriceQualifier>05</PriceQualifier><PriceStatus>00</PriceStatus>' +
                  '<UnpricedItemType>01</UnpricedItemType><CurrencyCode>GBP</CurrencyCode>' +
                  '<ComparisonProductPrice><ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9781800000025</IDValue></ProductIdentifier>' +
                  '<PriceType>02</PriceType><PriceAmount>75.00</PriceAmount><CurrencyCode>GBP</CurrencyCode></ComparisonProductPrice></Price>',
              ],
            }),
          ]),
        }),
      ]);
      const [{ productKey }] = sourcePlan.products;
      const [rich, unpriced] = plan.products[productKey].supplies[0].supplyDetails[0].prices;

      expect(rich).toMatchObject({
        ...located(PRICE),
        identifiers: [{ ...located(`${PRICE}/PriceIdentifier[1]`), type: '01', typeName: 'List', value: 'P-1' }],
        qualifier: '10',
        typeDescriptions: [
          { ...located(`${PRICE}/PriceTypeDescription[1]`), ...text('Library price for institutions', 'eng') },
        ],
        constraints: [
          {
            ...located(`${PRICE}/PriceConstraint[1]`),
            type: '07',
            status: '02',
            limits: [{ ...located(`${PRICE}/PriceConstraint[1]/PriceConstraintLimit[1]`), quantity: '3', unit: '10' }],
          },
        ],
        status: '01',
        per: '01',
        amount: '18.50',
        unpricedItemType: null,
        coded: null,
        conditions: [
          {
            ...located(`${PRICE}/PriceCondition[1]`),
            type: '03',
            quantities: [
              {
                ...located(`${PRICE}/PriceCondition[1]/PriceConditionQuantity[1]`),
                type: '01',
                quantity: '12',
                unit: '09',
              },
            ],
            productIdentifiers: [
              {
                ...located(`${PRICE}/PriceCondition[1]/ProductIdentifier[1]`),
                type: '15',
                typeName: null,
                value: '9781800000025',
              },
            ],
          },
        ],
        minimumOrderQuantity: '5',
        batchBonuses: [{ ...located(`${PRICE}/BatchBonus[1]`), batchQuantity: '10', freeQuantity: '1' }],
        discountsCoded: [{ ...located(`${PRICE}/DiscountCoded[1]`), type: '02', typeName: 'Trade band', code: 'B2' }],
        discounts: [
          {
            ...located(`${PRICE}/Discount[1]`),
            type: '01',
            quantity: '20',
            toQuantity: '49',
            percent: '35',
            amount: null,
          },
        ],
        taxes: [
          {
            ...located(`${PRICE}/Tax[1]`),
            productIdentifiers: [
              {
                ...located(`${PRICE}/Tax[1]/ProductIdentifier[1]`),
                type: '15',
                typeName: null,
                value: '9781800000032',
              },
            ],
            pricePartDescriptions: [
              { ...located(`${PRICE}/Tax[1]/PricePartDescription[1]`), ...text('Printed part', 'eng') },
            ],
            type: '01',
            rateCode: 'R',
            ratePercent: '7',
            taxableAmount: '17.29',
            taxAmount: '1.21',
          },
          {
            ...located(`${PRICE}/Tax[2]`),
            productIdentifiers: [],
            pricePartDescriptions: [],
            type: '01',
            rateCode: 'Z',
            ratePercent: '0',
            taxableAmount: null,
            taxAmount: null,
          },
        ],
        taxExempt: null,
        territory: { ...located(`${PRICE}/Territory[1]`), countriesIncluded: 'DE AT' },
        currencyZone: 'EUR',
        dates: [{ ...located(`${PRICE}/PriceDate[1]`), role: '14', date: '20270101', dateFormat: '00' }],
        comparisons: [],
        printedOnProduct: '02',
        positionOnProduct: '01',
        // A Price's own rights terms are named where they are: the rights reduction holds what they state.
        rightsTerms: [{ ...located(`${PRICE}/EpubTechnicalProtection[1]`), element: 'EpubTechnicalProtection' }],
      });
      expect(reduceOnixRights(root, sourcePlan).products[productKey].deferredRights).toEqual([
        expect.objectContaining({
          element: 'EpubTechnicalProtection',
          scope: 'PRICE',
          path: `${PRICE}/EpubTechnicalProtection[1]`,
          code: '03',
        }),
      ]);
      // The University of London Press digital shape: an unpriced reason and no amount, whose comparison price is
      // another Product's, kept as comparison metadata only (amendment 5713644155).
      expect(unpriced).toMatchObject({
        ...located(UNPRICED),
        qualifier: '05',
        status: '00',
        amount: null,
        unpricedItemType: '01',
        currency: { value: 'GBP', origin: 'EXPLICIT' },
        comparisons: [
          {
            ...located(`${UNPRICED}/ComparisonProductPrice[1]`),
            productIdentifiers: [
              {
                ...located(`${UNPRICED}/ComparisonProductPrice[1]/ProductIdentifier[1]`),
                type: '15',
                typeName: null,
                value: '9781800000025',
              },
            ],
            type: '02',
            amount: '75.00',
            currency: 'GBP',
          },
        ],
      });
    });

    it('keeps an ONIX 3.1 coded price and tax exemption as stated', () => {
      const PRICE = `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]/Price[1]`;
      const { plan, sourcePlan } = reduce(
        [
          record({
            supply: productSupply([
              supplyDetail({
                prices: [
                  '<Price><PriceType>02</PriceType>' +
                    '<PriceCoded><PriceCodeType>01</PriceCodeType><PriceCodeTypeName>Band</PriceCodeTypeName><PriceCode>A</PriceCode></PriceCoded>' +
                    '<TaxExempt/><CurrencyCode>GBP</CurrencyCode></Price>',
                ],
              }),
            ]),
          }),
        ],
        header(),
        '3.1',
      );
      const [coded] = plan.products[sourcePlan.products[0].productKey].supplies[0].supplyDetails[0].prices;

      expect(coded).toMatchObject({
        amount: null,
        coded: { ...located(`${PRICE}/PriceCoded[1]`), type: '01', typeName: 'Band', code: 'A' },
        taxes: [],
        taxExempt: located(`${PRICE}/TaxExempt[1]`),
      });
    });

    it('keeps the values of codes that state no qualification, which exclude nothing from the reduction', () => {
      const PRICES = `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]`;
      const { plan, sourcePlan } = reduce([
        record({
          supply: productSupply([
            supplyDetail({
              prices: [
                price({
                  amount: '20.00',
                  before:
                    '<PriceQualifier>00</PriceQualifier><PricePer>00</PricePer><PriceCondition><PriceConditionType>00</PriceConditionType></PriceCondition>' +
                    '<MinimumOrderQuantity>1</MinimumOrderQuantity><PriceStatus>02</PriceStatus>',
                }),
                price({ amount: '20.00', before: '<PriceStatus>00</PriceStatus>' }),
              ],
            }),
          ]),
        }),
      ]);
      const product = plan.products[sourcePlan.products[0].productKey];

      expect(product.prices).toMatchObject([{ kind: 'SET', currencyCode: 'GBP', unitPrice: 20 }]);
      expect(product.supplies[0].supplyDetails[0].prices).toMatchObject([
        {
          qualifier: '00',
          per: '00',
          conditions: [
            { ...located(`${PRICES}/Price[1]/PriceCondition[1]`), type: '00', quantities: [], productIdentifiers: [] },
          ],
          minimumOrderQuantity: '1',
          status: '02',
        },
        { qualifier: null, per: null, conditions: [], minimumOrderQuantity: null, status: '00' },
      ]);
    });

    it('keeps what an ONIX 3.0 record alone states - a Reissue with its prices, a promotion contact and a DateFormat element - and takes no reissue price as current', () => {
      const SUPPLY = `${PRODUCT_1}/ProductSupply[1]`;
      const DETAIL = `${SUPPLY}/SupplyDetail[1]`;
      const { plan, sourcePlan } = reduce([
        record({
          supply:
            '<ProductSupply><Market><Territory><CountriesIncluded>GB</CountriesIncluded></Territory></Market>' +
            '<MarketPublishingDetail><MarketPublishingStatus>04</MarketPublishingStatus>' +
            '<MarketDate><MarketDateRole>01</MarketDateRole><DateFormat>00</DateFormat><Date>20260301</Date></MarketDate>' +
            '<PromotionContact>Example Press publicity</PromotionContact></MarketPublishingDetail>' +
            '<SupplyDetail>' +
            supplier() +
            '<ProductAvailability>20</ProductAvailability>' +
            '<SupplyDate><SupplyDateRole>08</SupplyDateRole><DateFormat>00</DateFormat><Date>20260917</Date></SupplyDate>' +
            price() +
            '<Reissue><ReissueDate dateformat="00">20270301</ReissueDate><ReissueDescription language="eng">New edition with a new cover</ReissueDescription>' +
            price({ amount: '25.00' }) +
            '<SupportingResource><ResourceContentType>01</ResourceContentType><ContentAudience>00</ContentAudience><ResourceMode>03</ResourceMode>' +
            '<ResourceVersion><ResourceForm>02</ResourceForm><ResourceLink>https://press.example/cover.jpg</ResourceLink></ResourceVersion></SupportingResource>' +
            '</Reissue></SupplyDetail></ProductSupply>',
        }),
      ]);
      const product = plan.products[sourcePlan.products[0].productKey];
      const [supply] = product.supplies;

      expect(supply.marketPublishing).toMatchObject({
        dates: [
          {
            ...located(`${SUPPLY}/MarketPublishingDetail[1]/MarketDate[1]`),
            role: '01',
            date: '20260301',
            dateFormat: '00',
          },
        ],
        promotionContact: {
          ...located(`${SUPPLY}/MarketPublishingDetail[1]/PromotionContact[1]`),
          ...text('Example Press publicity'),
        },
      });
      expect(supply.supplyDetails[0].supplyDates).toEqual([
        { ...located(`${DETAIL}/SupplyDate[1]`), role: '08', date: '20260917', dateFormat: '00' },
      ]);
      expect(supply.supplyDetails[0].reissue).toMatchObject({
        ...located(`${DETAIL}/Reissue[1]`),
        date: '20270301',
        dateFormat: '00',
        description: {
          ...located(`${DETAIL}/Reissue[1]/ReissueDescription[1]`),
          ...text('New edition with a new cover', 'eng'),
        },
        prices: [{ ...located(`${DETAIL}/Reissue[1]/Price[1]`), amount: '25.00', currency: { value: 'GBP' } }],
        // A supporting resource is the collateral stage's: it is kept where it is.
        supportingResources: [located(`${DETAIL}/Reissue[1]/SupportingResource[1]`)],
      });
      // The price that applies from a reissue is never read as the current one.
      expect(product.prices).toMatchObject([{ kind: 'SET', currencyCode: 'GBP', unitPrice: 20 }]);
    });

    it('holds back an element the pinned ONIX schemas do not define in ProductSupply, as a shape validation should have refused', () => {
      const DETAIL = `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]`;
      const { plan } = reduce([
        record({
          supply: productSupply([
            supplyDetail({
              dates: '<Stock><OnHand>12</OnHand><Shelf>A4</Shelf></Stock>',
              prices: [price({ after: '<Rebate>5</Rebate>' })],
            }),
          ]),
        }),
      ]);

      expect(
        plan.findings
          .filter(({ code }) => code === 'SUPPLY_SHAPE_UNEXPECTED')
          .map(({ classification, blocking, detail, locations }) => [
            classification,
            blocking,
            detail,
            locations.map(({ path }) => path),
          ]),
      ).toEqual([
        [
          'PREFLIGHT_GAP',
          true,
          { elements: ['Shelf', 'Rebate'] },
          [`${DETAIL}/Stock[1]/Shelf[1]`, `${DETAIL}/Price[1]/Rebate[1]`],
        ],
      ]);
    });
  });

  describe('price reduction (rules 19-37)', () => {
    /** The one Product's price decisions, as kind, currency and amount - or the amounts a publisher chooses between. */
    const decisionsOf = ({ plan, sourcePlan }: ReturnType<typeof reduce>, index = 0) =>
      plan.products[sourcePlan.products[index].productKey].prices.map((decision) =>
        decision.kind === 'SET'
          ? [decision.kind, decision.currencyCode, decision.unitPrice]
          : [
              decision.kind,
              decision.currencyCode,
              decision.candidates.map(({ unitPrice }) => unitPrice).sort((a, b) => a - b),
            ],
      );
    const findingsOf = ({ plan }: ReturnType<typeof reduce>) =>
      priceFindings(plan).map(({ code, classification, blocking, detail }) => [code, classification, blocking, detail]);

    it('takes one ordinary consumer retail price per supported currency, whatever order the file gives them in, and says what the amount leaves behind', () => {
      const gbp = price({ amount: '20.00' });
      const usd = price({ type: '01', amount: '25.50', currency: 'USD' });
      const [inOrder, reversed] = [
        [gbp, usd],
        [usd, gbp],
      ].map((prices) => reduce([record({ supply: productSupply([supplyDetail({ prices })]) })]));

      expect(decisionsOf(inOrder)).toEqual([
        ['SET', 'GBP', 20],
        ['SET', 'USD', 25.5],
      ]);
      expect(decisionsOf(reversed)).toEqual(decisionsOf(inOrder));
      expect(findingsOf(inOrder)).toEqual([
        [
          'PRICE_REDUCED',
          'SUPPORTED_WITH_WARNING',
          false,
          {
            currency: 'GBP',
            amount: '20',
            priceTypes: ['02'],
            lost: ['PriceType'],
            lostFacts: ['ProductSupply[1]/SupplyDetail[1]/Price[1]/PriceType[1]: 02'],
            sources: 1,
          },
        ],
        [
          'PRICE_REDUCED',
          'SUPPORTED_WITH_WARNING',
          false,
          {
            currency: 'USD',
            amount: '25.5',
            priceTypes: ['01'],
            lost: ['PriceType'],
            lostFacts: ['ProductSupply[1]/SupplyDetail[1]/Price[2]/PriceType[1]: 01'],
            sources: 1,
          },
        ],
      ]);
      expect(priceFindings(inOrder.plan)[0]).toMatchObject({
        productKey: inOrder.sourcePlan.products[0].productKey,
        locations: [
          {
            path: `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]/Price[1]`,
            sourcePath: `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]/Price[1]`,
          },
        ],
        message: expect.stringContaining('GBP 20'),
      });
    });

    it('takes no winner where eligible prices state different amounts in one currency - by supplier, market or date - and leaves the amount, or no Price, to the publisher, whatever the order', () => {
      const current = price({ amount: '20.00' });
      const scheduled = price({
        amount: '22.00',
        after: '<PriceDate><PriceDateRole>14</PriceDateRole><Date dateformat="00">20270101</Date></PriceDate>',
      });
      const other = price({ amount: '19.99' });
      const cases = [
        [productSupply([supplyDetail({ prices: [current, scheduled] })])],
        [productSupply([supplyDetail({ prices: [scheduled, current] })])],
        [
          productSupply([supplyDetail({ prices: [current] })], market('<CountriesIncluded>GB</CountriesIncluded>')),
          productSupply([supplyDetail({ prices: [other] })], market('<CountriesIncluded>IE</CountriesIncluded>')),
        ],
        [
          productSupply([
            supplyDetail({ supplierXml: supplier({ name: 'A' }), prices: [other] }),
            supplyDetail({ supplierXml: supplier({ name: 'B' }), prices: [current] }),
          ]),
        ],
      ].map((supplies) => reduce([record({ supply: supplies.join('') })]));

      const PRICES = `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]`;

      expect(cases.map((reduced) => decisionsOf(reduced))).toEqual([
        [['CHOICE_REQUIRED', 'GBP', [20, 22]]],
        [['CHOICE_REQUIRED', 'GBP', [20, 22]]],
        [['CHOICE_REQUIRED', 'GBP', [19.99, 20]]],
        [['CHOICE_REQUIRED', 'GBP', [19.99, 20]]],
      ]);
      cases.forEach((reduced) =>
        expect(findingsOf(reduced)).toEqual([
          [
            'PRICE_AMOUNT_CONFLICT',
            'TARGET_UNREPRESENTABLE',
            true,
            expect.objectContaining({ currency: 'GBP', amounts: expect.any(Array) }),
          ],
        ]),
      );

      const [conflict] = priceFindings(cases[0].plan);
      const [decision] = cases[0].plan.products[cases[0].sourcePlan.products[0].productKey].prices;

      expect(conflict.locations.map(({ path }) => path)).toEqual([`${PRICES}/Price[1]`, `${PRICES}/Price[2]`]);
      // Every source price stays a candidate, with what choosing it would leave behind; none is chosen, none dropped.
      expect(conflict.resolution).toEqual({
        kind: 'PRICE_CHOICE',
        currencyCode: 'GBP',
        candidates: [
          expect.objectContaining({
            key: `${PRICES}/Price[1]`,
            amount: '20.00',
            unitPrice: 20,
            exclusions: [],
            lost: ['PriceType'],
          }),
          expect.objectContaining({
            key: `${PRICES}/Price[2]`,
            amount: '22.00',
            unitPrice: 22,
            exclusions: [],
            lost: ['PriceType', 'PriceDate'],
          }),
        ],
      });
      expect(decision).toMatchObject({
        kind: 'CHOICE_REQUIRED',
        reason: 'AMOUNT_CONFLICT',
        findingKey: conflict.key,
        candidates: conflict.resolution.kind === 'PRICE_CHOICE' ? conflict.resolution.candidates : [],
      });
    });

    it('offers every price a conflicting currency states, one never taken automatically too, each with what choosing it leaves behind', () => {
      const PRICES = `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]`;
      const reduced = reduce([
        record({
          supply: productSupply([
            supplyDetail({
              prices: [
                price({ amount: '20.00' }),
                price({ amount: '22.00' }),
                price({ before: '<PriceQualifier>10</PriceQualifier>', amount: '60.00' }),
              ],
            }),
          ]),
        }),
      ]);
      const [decision] = reduced.plan.products[reduced.sourcePlan.products[0].productKey].prices;

      expect(decision).toMatchObject({
        kind: 'CHOICE_REQUIRED',
        reason: 'AMOUNT_CONFLICT',
        candidates: [
          { key: `${PRICES}/Price[1]`, unitPrice: 20, exclusions: [] },
          { key: `${PRICES}/Price[2]`, unitPrice: 22, exclusions: [] },
          {
            key: `${PRICES}/Price[3]`,
            unitPrice: 60,
            exclusions: ['QUALIFIED'],
            lost: ['PriceType', 'PriceQualifier'],
          },
        ],
      });
      expect(findingsOf(reduced).map(([code, , blocking]) => [code, blocking])).toEqual([
        ['PRICE_AMOUNT_CONFLICT', true],
      ]);
    });

    it('collapses one amount stated in several supply contexts into one Price, keeping and naming every context it collapses', () => {
      const reduced = reduce([
        record({
          supply:
            productSupply(
              [
                supplyDetail({ supplierXml: supplier({ name: 'A' }), prices: [price({ amount: '20.00' })] }),
                supplyDetail({ supplierXml: supplier({ name: 'B' }), prices: [price({ amount: '20' })] }),
              ],
              market('<CountriesIncluded>GB</CountriesIncluded>'),
            ) +
            productSupply(
              [supplyDetail({ prices: [price({ type: '04', amount: '20.0' })] })],
              market('<RegionsIncluded>WORLD</RegionsIncluded>'),
            ),
        }),
      ]);
      const [decision] = reduced.plan.products[reduced.sourcePlan.products[0].productKey].prices;

      expect(decision).toMatchObject({ kind: 'SET', currencyCode: 'GBP', unitPrice: 20 });
      expect(decision.locations.map(({ path }) => path)).toEqual([
        `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]/Price[1]`,
        `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[2]/Price[1]`,
        `${PRODUCT_1}/ProductSupply[2]/SupplyDetail[1]/Price[1]`,
      ]);
      expect(priceFindings(reduced.plan)).toEqual([
        expect.objectContaining({
          code: 'PRICE_REDUCED',
          blocking: false,
          locations: decision.locations,
          detail: expect.objectContaining({ amount: '20', priceTypes: ['02', '04'], sources: 3 }),
          message: expect.stringContaining('3 source prices'),
        }),
      ]);
    });

    it('names every semantic an amount cannot keep - tax, territory, market, dates, status, discounts - so none is flattened silently', () => {
      const reduced = reduce([
        record({
          supply: productSupply(
            [
              supplyDetail({
                prices: [
                  price({
                    amount: '12.00',
                    before: '<Discount><DiscountPercent>40</DiscountPercent></Discount><PriceStatus>02</PriceStatus>',
                    after:
                      '<Territory><CountriesIncluded>GB</CountriesIncluded></Territory>' +
                      '<PriceDate><PriceDateRole>15</PriceDateRole><Date dateformat="00">20271231</Date></PriceDate>',
                  }).replace(
                    '<CurrencyCode>',
                    '<Tax><TaxType>01</TaxType><TaxRateCode>Z</TaxRateCode><TaxRatePercent>0</TaxRatePercent></Tax><CurrencyCode>',
                  ),
                ],
              }),
            ],
            market('<CountriesIncluded>GB</CountriesIncluded>'),
          ),
        }),
      ]);
      const [finding] = priceFindings(reduced.plan);

      expect(finding).toMatchObject({
        code: 'PRICE_REDUCED',
        classification: 'SUPPORTED_WITH_WARNING',
        blocking: false,
        detail: {
          currency: 'GBP',
          amount: '12',
          lost: ['PriceType', 'PriceStatus', 'Tax', 'Territory', 'Market', 'PriceDate', 'Discount'],
        },
      });
      expect(finding.message).toContain('PriceType, PriceStatus, Tax, Territory, Market, PriceDate and Discount');
    });

    describe('unpriced items (amendment 5713644155, rules 33-36)', () => {
      const EPUB = '<ProductForm>EA</ProductForm><ProductFormDetail>E101</ProductFormDetail>';
      const PDF = '<ProductForm>EA</ProductForm><ProductFormDetail>E107</ProductFormDetail>';
      /** The University of London Press digital Price: an unpriced reason, no amount, and the print prices for comparison. */
      const UNPRICED_WITH_COMPARISONS =
        '<Price><PriceType>02</PriceType><PriceQualifier>05</PriceQualifier><PriceStatus>00</PriceStatus>' +
        '<UnpricedItemType>01</UnpricedItemType><CurrencyCode>GBP</CurrencyCode>' +
        '<ComparisonProductPrice><ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9781800000032</IDValue></ProductIdentifier>' +
        '<PriceType>02</PriceType><PriceAmount>75.00</PriceAmount><CurrencyCode>GBP</CurrencyCode></ComparisonProductPrice>' +
        '<ComparisonProductPrice><ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9781800000049</IDValue></ProductIdentifier>' +
        '<PriceType>02</PriceType><PriceAmount>24.99</PriceAmount><CurrencyCode>GBP</CurrencyCode></ComparisonProductPrice></Price>';

      it('creates no Price, of any amount, for an unpriced reason and keeps each exact reason where the file states it', () => {
        const reduced = reduce([
          record({
            ref: 'epub',
            form: EPUB,
            supply: productSupply([supplyDetail({ availability: '10', prices: [UNPRICED_WITH_COMPARISONS] })]),
          }),
          record({
            ref: 'pdf',
            isbn: '9781800000025',
            form: PDF,
            supply: productSupply([
              supplyDetail({ supplierXml: supplier({ name: 'A' }), unpriced: '02' }),
              supplyDetail({ supplierXml: supplier({ name: 'B' }), unpriced: '04' }),
              supplyDetail({ supplierXml: supplier({ name: 'C' }), unpriced: '08' }),
            ]),
          }),
        ]);
        const { plan, sourcePlan } = reduced;
        const PRODUCT_2 = '/ONIXMessage[1]/Product[2]';

        expect(sourcePlan.products.map(({ productKey }) => plan.products[productKey].prices)).toEqual([[], []]);
        // Nothing becomes a zero, or any other number, standing for an unpriced item.
        expect(JSON.stringify(plan)).not.toMatch(/"unitPrice"/);
        expect(
          priceFindings(plan).map(({ code, classification, blocking, detail, locations }) => [
            code,
            classification,
            blocking,
            detail,
            locations.map(({ path }) => path),
          ]),
        ).toEqual([
          [
            'PRICE_UNPRICED',
            'TARGET_UNREPRESENTABLE',
            false,
            { reason: '01', label: 'Free of charge', currency: 'GBP' },
            [`${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]/Price[1]/UnpricedItemType[1]`],
          ],
          [
            'PRICE_COMPARISON_NOT_REPRESENTED',
            'TARGET_UNREPRESENTABLE',
            false,
            { comparisons: ['GBP 75.00 (9781800000032)', 'GBP 24.99 (9781800000049)'] },
            [
              `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]/Price[1]/ComparisonProductPrice[1]`,
              `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]/Price[1]/ComparisonProductPrice[2]`,
            ],
          ],
          [
            'PRICE_UNPRICED',
            'TARGET_UNREPRESENTABLE',
            false,
            { reason: '02', label: 'Price to be announced' },
            [`${PRODUCT_2}/ProductSupply[1]/SupplyDetail[1]/UnpricedItemType[1]`],
          ],
          [
            'PRICE_UNPRICED',
            'TARGET_UNREPRESENTABLE',
            false,
            { reason: '04', label: 'Contact supplier' },
            [`${PRODUCT_2}/ProductSupply[1]/SupplyDetail[2]/UnpricedItemType[1]`],
          ],
          [
            'PRICE_UNPRICED',
            'TARGET_UNREPRESENTABLE',
            false,
            { reason: '08', label: 'Supplier does not supply' },
            [`${PRODUCT_2}/ProductSupply[1]/SupplyDetail[3]/UnpricedItemType[1]`],
          ],
        ]);
        // An unpriced reason says nothing else: no open access, licence or rights fact is read into it.
        expect(priceFindings(plan)[0].message).toContain('Free of charge');
        expect(JSON.stringify(plan)).not.toMatch(/licen[cs]e|open access/i);
      });
    });

    it('never reads a missing, malformed, zero or negative amount as zero: it blocks as a shape validation should have refused', () => {
      const amountless = '<Price><PriceType>02</PriceType><CurrencyCode>GBP</CurrencyCode></Price>';
      const reduced = reduce([
        record({
          supply: productSupply([
            supplyDetail({
              prices: [
                amountless,
                price({ amount: '0.00' }),
                price({ amount: '12,50', currency: 'USD' }),
                price({ amount: 'abc', currency: 'EUR' }),
                price({ amount: '-5.00', currency: 'CAD' }),
                price({ amount: '1e3', currency: 'AUD' }),
              ],
            }),
          ]),
        }),
      ]);
      const PRICES = `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]`;

      expect(decisionsOf(reduced)).toEqual([]);
      expect(JSON.stringify(reduced.plan)).not.toMatch(/"unitPrice"/);
      expect(
        priceFindings(reduced.plan).map(({ code, classification, blocking, detail, locations }) => [
          code,
          classification,
          blocking,
          detail,
          locations.map(({ path }) => path),
        ]),
      ).toEqual([
        ['PRICE_AMOUNT_UNUSABLE', 'PREFLIGHT_GAP', true, { amount: '' }, [`${PRICES}/Price[1]`]],
        ['PRICE_AMOUNT_UNUSABLE', 'PREFLIGHT_GAP', true, { amount: '0.00' }, [`${PRICES}/Price[2]`]],
        ['PRICE_AMOUNT_UNUSABLE', 'PREFLIGHT_GAP', true, { amount: '12,50' }, [`${PRICES}/Price[3]`]],
        ['PRICE_AMOUNT_UNUSABLE', 'PREFLIGHT_GAP', true, { amount: 'abc' }, [`${PRICES}/Price[4]`]],
        ['PRICE_AMOUNT_UNUSABLE', 'PREFLIGHT_GAP', true, { amount: '-5.00' }, [`${PRICES}/Price[5]`]],
        ['PRICE_AMOUNT_UNUSABLE', 'PREFLIGHT_GAP', true, { amount: '1e3' }, [`${PRICES}/Price[6]`]],
      ]);
    });

    it('never gives a price with no currency, or one Thoth cannot hold, an amount of zero or a currency of its own', () => {
      const reduced = reduce([
        record({
          supply: productSupply([
            supplyDetail({
              prices: [
                price({ currency: '' }),
                price({ amount: '150000', currency: 'SLE' }),
                price({ amount: '9.99' }),
              ],
            }),
          ]),
        }),
      ]);
      const PRICES = `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]`;

      // The price Thoth can hold is still taken; the other two are findings, never a Price.
      expect(decisionsOf(reduced)).toEqual([['SET', 'GBP', 9.99]]);
      expect(
        priceFindings(reduced.plan).map(({ code, classification, blocking, detail, locations }) => [
          code,
          classification,
          blocking,
          detail,
          locations.map(({ path }) => path),
        ]),
      ).toEqual([
        ['PRICE_CURRENCY_ABSENT', 'PREFLIGHT_GAP', true, { amount: '20.00' }, [`${PRICES}/Price[1]`]],
        [
          'PRICE_CURRENCY_UNSUPPORTED',
          'TARGET_UNREPRESENTABLE',
          false,
          { currency: 'SLE', amount: '150000' },
          [`${PRICES}/Price[2]/CurrencyCode[1]`],
        ],
        expect.arrayContaining(['PRICE_REDUCED']),
      ]);
    });

    describe('prices that are never reduced automatically (rules 23-25, 32)', () => {
      type Case = { label: string; priceXml: string; exclusions: string[] };

      const cases: Case[] = [
        { label: "a supplier's net price", priceXml: price({ type: '05' }), exclusions: ['TYPE_NOT_CONSUMER_RETAIL'] },
        { label: 'a pre-publication price', priceXml: price({ type: '22' }), exclusions: ['TYPE_NOT_CONSUMER_RETAIL'] },
        { label: 'a price of no stated or default type', priceXml: price({ type: '' }), exclusions: ['TYPE_ABSENT'] },
        {
          label: 'a consumer price (qualifier 05), as the University of London Press print records state',
          priceXml: price({
            before: '<PriceQualifier>05</PriceQualifier><PriceStatus>00</PriceStatus>',
            amount: '75.00',
          }),
          exclusions: ['QUALIFIED'],
        },
        {
          label: 'a library price',
          priceXml: price({ before: '<PriceQualifier>10</PriceQualifier>' }),
          exclusions: ['QUALIFIED'],
        },
        {
          label: 'a provisional price',
          priceXml: price({ before: '<PriceStatus>01</PriceStatus>' }),
          exclusions: ['PROVISIONAL'],
        },
        { label: 'a price per page', priceXml: price({ before: '<PricePer>01</PricePer>' }), exclusions: ['PER_UNIT'] },
        {
          label: 'a conditional price',
          priceXml: price({ before: '<PriceCondition><PriceConditionType>10</PriceConditionType></PriceCondition>' }),
          exclusions: ['CONDITIONAL'],
        },
        {
          label: 'a price for a minimum quantity',
          priceXml: price({ before: '<MinimumOrderQuantity>5</MinimumOrderQuantity>' }),
          exclusions: ['QUANTITY_CONDITION'],
        },
        {
          label: 'a price with a batch bonus',
          priceXml: price({
            before: '<BatchBonus><BatchQuantity>10</BatchQuantity><FreeQuantity>1</FreeQuantity></BatchBonus>',
          }),
          exclusions: ['QUANTITY_CONDITION'],
        },
        {
          label: 'a constrained price',
          priceXml: price({
            before:
              '<PriceConstraint><PriceConstraintType>07</PriceConstraintType><PriceConstraintStatus>02</PriceConstraintStatus></PriceConstraint>',
          }),
          exclusions: ['CONSTRAINED'],
        },
        {
          label: 'a price carrying rights terms of its own',
          priceXml: price({ before: '<EpubTechnicalProtection>03</EpubTechnicalProtection>' }),
          exclusions: ['OWN_RIGHTS_TERMS'],
        },
        {
          label: 'a coded price with no amount',
          priceXml:
            '<Price><PriceType>02</PriceType><PriceCoded><PriceCodeType>01</PriceCodeType><PriceCode>A</PriceCode></PriceCoded><CurrencyCode>GBP</CurrencyCode></Price>',
          exclusions: ['CODED'],
        },
        {
          label: 'a qualified, provisional net price per page',
          priceXml: price({
            type: '07',
            before: '<PriceQualifier>06</PriceQualifier><PricePer>01</PricePer><PriceStatus>01</PriceStatus>',
          }),
          exclusions: ['TYPE_NOT_CONSUMER_RETAIL', 'QUALIFIED', 'PER_UNIT', 'PROVISIONAL'],
        },
      ];

      it.each(cases)(
        'keeps $label as a price the publisher chooses or declines: never taken, and never dropped, by itself',
        ({ priceXml, exclusions }) => {
          const PRICE = `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]/Price[1]`;
          const reduced = reduce([record({ supply: productSupply([supplyDetail({ prices: [priceXml] })]) })]);
          const [finding] = priceFindings(reduced.plan);
          const [decision] = reduced.plan.products[reduced.sourcePlan.products[0].productKey].prices;

          expect(findingsOf(reduced)).toEqual([
            ['PRICE_NOT_AUTOMATIC', 'TARGET_INPUT_REQUIRED', true, expect.objectContaining({ exclusions })],
          ]);
          expect(finding.locations.map(({ path }) => path)).toEqual([PRICE]);
          expect(decision).toMatchObject({ kind: 'CHOICE_REQUIRED', reason: 'NOT_AUTOMATIC', findingKey: finding.key });
          expect(finding.resolution).toMatchObject({ kind: 'PRICE_CHOICE' });
          // A coded price states no amount to choose: only declining it answers.
          expect(decision.kind === 'CHOICE_REQUIRED' ? decision.candidates : null).toEqual(
            exclusions.includes('CODED') ? [] : [expect.objectContaining({ key: PRICE, exclusions })],
          );
        },
      );

      it('asks the publisher about a University of London Press print price - PriceType 02, PriceQualifier 05 - for its amount or no Price, and decides neither', () => {
        const PRICE = `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]/Price[1]`;
        const reduced = reduce([
          record({
            form: '<ProductForm>BB</ProductForm>',
            supply: productSupply([
              supplyDetail({
                availability: '10',
                prices: [
                  price({
                    before: '<PriceQualifier>05</PriceQualifier><PriceStatus>00</PriceStatus>',
                    amount: '75.00',
                  }),
                ],
              }),
            ]),
          }),
        ]);
        const product = reduced.plan.products[reduced.sourcePlan.products[0].productKey];
        const [finding] = priceFindings(reduced.plan);
        const candidate = {
          ...located(PRICE),
          key: PRICE,
          currencyCode: 'GBP',
          amount: '75.00',
          unitPrice: 75,
          priceType: '02',
          exclusions: ['QUALIFIED'],
          lost: ['PriceType', 'PriceQualifier', 'PriceStatus'],
          lostFacts: [
            'ProductSupply[1]/SupplyDetail[1]/Price[1]/PriceType[1]: 02',
            'ProductSupply[1]/SupplyDetail[1]/Price[1]/PriceQualifier[1]: 05',
            'ProductSupply[1]/SupplyDetail[1]/Price[1]/PriceStatus[1]: 00',
          ],
          label:
            'GBP 75.00 - ProductSupply[1]/SupplyDetail[1]/Price[1] (PriceType 02, PriceQualifier 05, PriceStatus 00)',
        };

        expect(product.prices).toEqual([
          {
            kind: 'CHOICE_REQUIRED',
            reason: 'NOT_AUTOMATIC',
            currencyCode: 'GBP',
            candidates: [candidate],
            locations: [located(PRICE)],
            findingKey: finding.key,
          },
        ]);
        expect(finding).toMatchObject({
          code: 'PRICE_NOT_AUTOMATIC',
          classification: 'TARGET_INPUT_REQUIRED',
          blocking: true,
          carrier: null,
          resolution: { kind: 'PRICE_CHOICE', currencyCode: 'GBP', candidates: [candidate] },
          detail: { currency: 'GBP', exclusions: ['QUALIFIED'], candidates: [candidate.label] },
        });
        expect(finding.message).toContain('PriceQualifier 05');
        expect(finding.message).toMatch(/choose/i);
      });

      it('still takes the ordinary retail price beside them, and reads codes that state no qualification as none', () => {
        const trivial = price({
          amount: '20.00',
          before:
            '<PriceQualifier>00</PriceQualifier><PricePer>00</PricePer><PriceCondition><PriceConditionType>00</PriceConditionType></PriceCondition>' +
            '<MinimumOrderQuantity>1</MinimumOrderQuantity><PriceStatus>02</PriceStatus>',
        });
        const PRICES = `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]`;
        const reduced = reduce([
          record({
            supply: productSupply([
              supplyDetail({
                prices: [
                  price({ type: '05', amount: '12.00' }),
                  trivial,
                  price({ before: '<PriceQualifier>10</PriceQualifier>', amount: '60.00' }),
                  '<Price><PriceType>02</PriceType><PriceCoded><PriceCodeType>01</PriceCodeType><PriceCode>A</PriceCode></PriceCoded><CurrencyCode>GBP</CurrencyCode></Price>',
                ],
              }),
            ]),
          }),
        ]);

        // The one ordinary retail amount is the GBP Price (rule 27); the prices never taken automatically beside it are
        // kept and named as not taken, each where it is stated.
        expect(decisionsOf(reduced)).toEqual([['SET', 'GBP', 20]]);
        expect(
          priceFindings(reduced.plan).map(({ code, blocking, locations, detail }) => [
            code,
            blocking,
            locations.map(({ path }) => path),
            detail.exclusions ?? null,
          ]),
        ).toEqual([
          ['PRICE_REDUCED', false, [`${PRICES}/Price[2]`], null],
          ['PRICE_CANDIDATE_NOT_TAKEN', false, [`${PRICES}/Price[1]`], ['TYPE_NOT_CONSUMER_RETAIL']],
          ['PRICE_CANDIDATE_NOT_TAKEN', false, [`${PRICES}/Price[3]`], ['QUALIFIED']],
          ['PRICE_CANDIDATE_NOT_TAKEN', false, [`${PRICES}/Price[4]`], ['CODED']],
        ]);
      });
    });
  });

  describe('supply facts Thoth has no field for (rules 9-17)', () => {
    it('discloses market, supplier, availability and supply dates once for the Product, blocking nothing and deciding no lifecycle', () => {
      const SUPPLY = `${PRODUCT_1}/ProductSupply[1]`;
      const { plan, sourcePlan } = reduce([
        record({
          supply:
            '<ProductSupply>' +
            '<Market><Territory><CountriesIncluded>GB</CountriesIncluded></Territory><SalesRestriction><SalesRestrictionType>04</SalesRestrictionType></SalesRestriction></Market>' +
            '<MarketPublishingDetail><MarketPublishingStatus>07</MarketPublishingStatus></MarketPublishingDetail>' +
            supplyDetail({
              availability: '40',
              dates:
                '<SupplyDate><SupplyDateRole>08</SupplyDateRole><Date dateformat="00">20260917</Date></SupplyDate><Stock><OnHand>0</OnHand></Stock>',
              prices: [price()],
            }) +
            '</ProductSupply>',
        }),
        record({ ref: 'frontlist', isbn: '9781800000025' }),
      ]);
      const supplyFindings = plan.findings.filter(({ code }) => code === 'SUPPLY_NOT_REPRESENTED');

      expect(supplyFindings).toEqual([
        {
          key: expect.any(String),
          code: 'SUPPLY_NOT_REPRESENTED',
          classification: 'TARGET_UNREPRESENTABLE',
          blocking: false,
          productKey: sourcePlan.products[0].productKey,
          groupKey: sourcePlan.products[0].groupKey,
          carrier: null,
          // Every lost fact at its own location, named with every value it states.
          locations: [
            `${SUPPLY}/Market[1]/Territory[1]`,
            `${SUPPLY}/Market[1]/SalesRestriction[1]`,
            `${SUPPLY}/MarketPublishingDetail[1]/MarketPublishingStatus[1]`,
            `${SUPPLY}/SupplyDetail[1]/Supplier[1]`,
            `${SUPPLY}/SupplyDetail[1]/ProductAvailability[1]`,
            `${SUPPLY}/SupplyDetail[1]/SupplyDate[1]`,
            `${SUPPLY}/SupplyDetail[1]/Stock[1]`,
          ].map(located),
          detail: {
            elements: [
              'Territory',
              'SalesRestriction',
              'MarketPublishingStatus',
              'Supplier',
              'ProductAvailability',
              'SupplyDate',
              'Stock',
            ],
            facts: [
              'ProductSupply[1]/Market[1]/Territory[1]: CountriesIncluded GB',
              'ProductSupply[1]/Market[1]/SalesRestriction[1]: SalesRestrictionType 04',
              'ProductSupply[1]/MarketPublishingDetail[1]/MarketPublishingStatus[1]: 07',
              'ProductSupply[1]/SupplyDetail[1]/Supplier[1]: SupplierRole 01, SupplierName Example Supplier',
              'ProductSupply[1]/SupplyDetail[1]/ProductAvailability[1]: 40',
              'ProductSupply[1]/SupplyDetail[1]/SupplyDate[1]: SupplyDateRole 08, Date 20260917',
              'ProductSupply[1]/SupplyDetail[1]/Stock[1]: OnHand 0',
            ],
            availability: ['40'],
            marketPublishingStatus: ['07'],
          },
          resolution: { kind: 'NONE' },
          message: expect.stringContaining('never read as the Work'),
        },
      ]);
      // A Product stating no supply has nothing to disclose.
      expect(plan.findings.filter(({ productKey }) => productKey === sourcePlan.products[1].productKey)).toEqual([]);
      // Nothing about a Work's lifecycle is decided here.
      expect(JSON.stringify(plan)).not.toMatch(
        /workStatus|lifecycle|publicationDate|withdrawnDate|WITHDRAWN|OUT_OF_PRINT/,
      );
    });
  });

  describe('what a later diagnostic reads from the reduction alone', () => {
    /** The located fact of a reduction at one canonical path, found without reading the source again. */
    const factAt = (plan: OnixCommercialPlan, path: string): unknown => {
      const walk = (value: unknown): unknown => {
        if (Array.isArray(value)) return value.map(walk).find((found) => found !== undefined);
        if (value === null || typeof value !== 'object') return undefined;
        if ((value as { path?: unknown }).path === path) return value;

        return Object.values(value)
          .map(walk)
          .find((found) => found !== undefined);
      };

      return walk(plan.products);
    };

    it('names every supply and price fact Thoth does not record, with its values and exact location, so ProductSupply is never read again', () => {
      const SUPPLY = `${PRODUCT_1}/ProductSupply[1]`;
      const DETAIL = `${SUPPLY}/SupplyDetail[1]`;
      const { plan } = reduce([
        record({
          supply:
            '<ProductSupply><Market><Territory><CountriesIncluded>GB</CountriesIncluded></Territory>' +
            '<SalesRestriction><SalesRestrictionType>04</SalesRestrictionType><SalesOutlet><SalesOutletName>Waterstones</SalesOutletName></SalesOutlet></SalesRestriction></Market>' +
            '<MarketPublishingDetail><MarketPublishingStatus>02</MarketPublishingStatus></MarketPublishingDetail>' +
            '<SupplyDetail>' +
            '<Supplier><SupplierRole>01</SupplierRole><SupplierName>Example Supplier</SupplierName><EmailAddress>orders@supplier.example</EmailAddress></Supplier>' +
            '<ReturnsConditions><ReturnsCodeType>02</ReturnsCodeType><ReturnsCode>Y</ReturnsCode></ReturnsConditions>' +
            '<ProductAvailability>21</ProductAvailability>' +
            '<SupplyDate><SupplyDateRole>08</SupplyDateRole><Date dateformat="00">20260917</Date></SupplyDate>' +
            '<OrderTime>7</OrderTime><Stock><OnHand>12</OnHand><Proximity>03</Proximity></Stock><PackQuantity>20</PackQuantity>' +
            '<Price><PriceType>02</PriceType><PriceAmount>12.00</PriceAmount>' +
            '<Tax><TaxType>01</TaxType><TaxRateCode>Z</TaxRateCode><TaxRatePercent>0</TaxRatePercent></Tax>' +
            '<CurrencyCode>GBP</CurrencyCode><Territory><CountriesIncluded>GB</CountriesIncluded></Territory>' +
            '<PriceDate><PriceDateRole>15</PriceDateRole><Date dateformat="00">20271231</Date></PriceDate></Price>' +
            '</SupplyDetail></ProductSupply>',
        }),
      ]);
      const [supplyFinding] = plan.findings.filter(({ code }) => code === 'SUPPLY_NOT_REPRESENTED');
      const [priceFinding] = plan.findings.filter(({ code }) => code === 'PRICE_REDUCED');

      // Each lost supply fact is located exactly, and named with every value it states.
      expect(supplyFinding.locations).toEqual(
        [
          `${SUPPLY}/Market[1]/Territory[1]`,
          `${SUPPLY}/Market[1]/SalesRestriction[1]`,
          `${SUPPLY}/MarketPublishingDetail[1]/MarketPublishingStatus[1]`,
          `${DETAIL}/Supplier[1]`,
          `${DETAIL}/ReturnsConditions[1]`,
          `${DETAIL}/ProductAvailability[1]`,
          `${DETAIL}/SupplyDate[1]`,
          `${DETAIL}/OrderTime[1]`,
          `${DETAIL}/Stock[1]`,
          `${DETAIL}/PackQuantity[1]`,
        ].map(located),
      );
      expect(supplyFinding.detail.facts).toEqual([
        'ProductSupply[1]/Market[1]/Territory[1]: CountriesIncluded GB',
        'ProductSupply[1]/Market[1]/SalesRestriction[1]: SalesRestrictionType 04, SalesOutletName Waterstones',
        'ProductSupply[1]/MarketPublishingDetail[1]/MarketPublishingStatus[1]: 02',
        'ProductSupply[1]/SupplyDetail[1]/Supplier[1]: SupplierRole 01, SupplierName Example Supplier, EmailAddress orders@supplier.example',
        'ProductSupply[1]/SupplyDetail[1]/ReturnsConditions[1]: ReturnsCodeType 02, ReturnsCode Y',
        'ProductSupply[1]/SupplyDetail[1]/ProductAvailability[1]: 21',
        'ProductSupply[1]/SupplyDetail[1]/SupplyDate[1]: SupplyDateRole 08, Date 20260917',
        'ProductSupply[1]/SupplyDetail[1]/OrderTime[1]: 7',
        'ProductSupply[1]/SupplyDetail[1]/Stock[1]: OnHand 12, Proximity 03',
        'ProductSupply[1]/SupplyDetail[1]/PackQuantity[1]: 20',
      ]);
      // The reduction holds each of them as a typed fact: a composite at its own path, a single value in its composite.
      expect(factAt(plan, `${DETAIL}/Stock[1]`)).toMatchObject({ onHand: '12', proximities: [{ value: '03' }] });
      expect(factAt(plan, `${DETAIL}/ReturnsConditions[1]`)).toMatchObject({ type: '02', code: 'Y' });
      expect(factAt(plan, `${SUPPLY}/Market[1]/SalesRestriction[1]`)).toMatchObject({
        type: '04',
        outlets: [{ name: 'Waterstones' }],
      });
      expect(factAt(plan, DETAIL)).toMatchObject({ availability: '21', orderTime: '7', packQuantity: '20' });

      // What the reduced amount leaves behind is named with its values too, and held by the Price the amount is taken from.
      expect(priceFinding.detail.lostFacts).toEqual([
        'ProductSupply[1]/SupplyDetail[1]/Price[1]/PriceType[1]: 02',
        'ProductSupply[1]/SupplyDetail[1]/Price[1]/Tax[1]: TaxType 01, TaxRateCode Z, TaxRatePercent 0',
        'ProductSupply[1]/SupplyDetail[1]/Price[1]/Territory[1]: CountriesIncluded GB',
        'ProductSupply[1]/SupplyDetail[1]/Price[1]/PriceDate[1]: PriceDateRole 15, Date 20271231',
        'ProductSupply[1]/Market[1]/Territory[1]: CountriesIncluded GB',
        'ProductSupply[1]/Market[1]/SalesRestriction[1]: SalesRestrictionType 04, SalesOutletName Waterstones',
      ]);
      expect(factAt(plan, priceFinding.locations[0].path)).toMatchObject({
        taxes: [{ type: '01', rateCode: 'Z', ratePercent: '0' }],
        territory: { countriesIncluded: 'GB' },
        dates: [{ role: '15', date: '20271231' }],
      });
    });

    it('names a lost default the Header gives a price, relative to the message', () => {
      const { plan } = reduce(
        [record({ supply: productSupply([supplyDetail({ prices: [price({ type: '' })] })]) })],
        header('<DefaultPriceType>01</DefaultPriceType>'),
      );
      const [priceFinding] = plan.findings.filter(({ code }) => code === 'PRICE_REDUCED');

      expect(priceFinding.detail.lostFacts).toEqual(['Header[1]/DefaultPriceType[1]: 01']);
    });
  });

  describe('Publication Locations from Supplier websites (rules 38-63)', () => {
    const EPUB = '<ProductForm>EA</ProductForm><ProductFormDetail>E101</ProductFormDetail>';
    const LANDING = 'https://supplier.example.com/book/a-title';
    const FULL_TEXT = 'https://supplier.example.com/book/a-title.epub';
    const website = (role: string, link: string) =>
      `<Website><WebsiteRole>${role}</WebsiteRole><WebsiteLink>${link}</WebsiteLink></Website>`;
    const productOf = ({ plan, sourcePlan }: ReturnType<typeof reduce>, index = 0) =>
      plan.products[sourcePlan.products[index].productKey];

    it('reads Supplier websites where no Price is stated, planning a physical Publication its one-URL canonical Location', () => {
      const reduced = reduce([
        record({
          supply: productSupply([
            supplyDetail({ supplierXml: supplier({ websites: website('36', LANDING) }), unpriced: '02' }),
          ]),
        }),
        // A forthcoming e-book with no Price and no URL at all: nothing to plan, and nothing lost.
        record({
          ref: 'frontlist',
          isbn: '9781800000025',
          form: EPUB,
          supply: productSupply([supplyDetail({ unpriced: '02' })]),
        }),
      ]);
      const paperback = productOf(reduced);
      const frontlist = productOf(reduced, 1);
      const LINK = `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]/Supplier[1]/Website[1]/WebsiteLink[1]`;

      expect(paperback.prices).toEqual([]);
      expect(paperback.carriers).toEqual({
        PHYSICAL: {
          location: {
            kind: 'CANONICAL',
            candidate: {
              landingPage: LANDING,
              fullTextUrl: '',
              platform: 'OTHER',
              locations: [{ path: LINK, sourcePath: LINK }],
            },
          },
          findingKeys: [],
        },
      });
      expect(frontlist.carriers).toEqual({ DIGITAL: { location: { kind: 'NONE' }, findingKeys: [] } });
      expect(reduced.plan.findings.filter(({ code }) => code.startsWith('LOCATION_'))).toEqual([]);
    });

    it('plans a digital Publication no Location from half a pair, never completing it, and keeps the half it was given', () => {
      const reduced = reduce([
        record({
          form: EPUB,
          supply: productSupply([
            supplyDetail({ supplierXml: supplier({ websites: website('36', LANDING) }), unpriced: '02' }),
          ]),
        }),
        record({
          ref: 'complete',
          isbn: '9781800000025',
          form: EPUB,
          supply: productSupply([
            supplyDetail({
              supplierXml: supplier({ websites: website('36', LANDING) + website('29', FULL_TEXT) }),
              unpriced: '02',
            }),
          ]),
        }),
      ]);
      const half = productOf(reduced);
      const complete = productOf(reduced, 1);
      const LINK = `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]/Supplier[1]/Website[1]/WebsiteLink[1]`;
      const [finding] = reduced.plan.findings.filter(({ code }) => code.startsWith('LOCATION_'));

      expect(finding).toMatchObject({
        code: 'LOCATION_INCOMPLETE',
        classification: 'SUPPORTED_WITH_WARNING',
        blocking: false,
        carrier: 'DIGITAL',
        productKey: reduced.sourcePlan.products[0].productKey,
        locations: [{ path: LINK, sourcePath: LINK }],
        detail: { landingPage: LANDING, fullTextUrl: '', missing: 'fullTextUrl' },
        message: expect.stringContaining('no full text URL'),
      });
      expect(half.carriers).toEqual({ DIGITAL: { location: { kind: 'NONE' }, findingKeys: [finding.key] } });
      expect(complete.carriers.DIGITAL?.location).toMatchObject({
        kind: 'CANONICAL',
        candidate: { landingPage: LANDING, fullTextUrl: FULL_TEXT },
      });
      expect(reduced.plan.findings.filter(({ code }) => code.startsWith('LOCATION_'))).toHaveLength(1);
    });

    it("never pairs one supplier's landing page with another's full text URL, and takes no canonical Location by order", () => {
      const supplierA = supplyDetail({
        supplierXml: supplier({ name: 'A', websites: website('36', LANDING) }),
        unpriced: '02',
      });
      const supplierB = supplyDetail({
        supplierXml: supplier({ name: 'B', websites: website('29', FULL_TEXT) }),
        unpriced: '02',
      });
      const [digital, physical, reordered] = [
        [EPUB, [supplierA, supplierB]],
        ['<ProductForm>BB</ProductForm>', [supplierA, supplierB]],
        ['<ProductForm>BB</ProductForm>', [supplierB, supplierA]],
      ].map(([form, details]) =>
        reduce([record({ form: form as string, supply: productSupply(details as string[]) })]),
      );
      const locationFindings = ({ plan }: ReturnType<typeof reduce>) =>
        plan.findings.filter(({ code }) => code.startsWith('LOCATION_'));

      // Digital: two halves from two suppliers are two incomplete candidates, never one Location.
      expect(productOf(digital).carriers.DIGITAL?.location).toEqual({ kind: 'NONE' });
      expect(locationFindings(digital).map(({ code, detail }) => [code, detail])).toEqual([
        ['LOCATION_INCOMPLETE', { landingPage: LANDING, fullTextUrl: '', missing: 'fullTextUrl' }],
        ['LOCATION_INCOMPLETE', { landingPage: '', fullTextUrl: FULL_TEXT, missing: 'landingPage' }],
      ]);

      // Physical: each alone could be canonical, so the file does not say which is: nothing is chosen by order.
      [physical, reordered].forEach((reduced) => {
        const [ambiguous] = locationFindings(reduced);

        expect(locationFindings(reduced)).toHaveLength(1);
        expect(ambiguous).toMatchObject({
          code: 'LOCATION_CANONICAL_AMBIGUOUS',
          classification: 'TARGET_INPUT_REQUIRED',
          blocking: true,
          carrier: 'PHYSICAL',
        });
        expect([...(ambiguous.detail.candidates as string[])]).toEqual([`${LANDING} | -`, `- | ${FULL_TEXT}`].sort());
        expect(productOf(reduced).carriers.PHYSICAL).toEqual({
          location: { kind: 'INPUT_REQUIRED', findingKeys: [ambiguous.key] },
          findingKeys: [ambiguous.key],
        });
      });
    });

    it('plans the one complete candidate as canonical, and keeps a half that could only follow it as a Location not created yet', () => {
      const OTHER_LANDING = 'https://other.example.org/book/a-title';
      const reduced = reduce([
        record({
          form: EPUB,
          supply: productSupply([
            supplyDetail({
              supplierXml: supplier({ name: 'Half', websites: website('36', OTHER_LANDING) }),
              unpriced: '02',
            }),
            supplyDetail({
              supplierXml: supplier({ name: 'Complete', websites: website('36', LANDING) + website('29', FULL_TEXT) }),
              unpriced: '02',
            }),
          ]),
        }),
      ]);
      const locationFindings = reduced.plan.findings.filter(({ code }) => code.startsWith('LOCATION_'));
      const HALF_LINK = `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]/Supplier[1]/Website[1]/WebsiteLink[1]`;

      expect(productOf(reduced).carriers.DIGITAL).toEqual({
        location: {
          kind: 'CANONICAL',
          candidate: expect.objectContaining({ landingPage: LANDING, fullTextUrl: FULL_TEXT }),
        },
        findingKeys: [locationFindings[0].key],
      });
      expect(locationFindings).toEqual([
        expect.objectContaining({
          code: 'LOCATION_NOT_CANONICAL',
          classification: 'EXECUTION_DEFERRED',
          blocking: false,
          carrier: 'DIGITAL',
          locations: [{ path: HALF_LINK, sourcePath: HALF_LINK }],
          detail: { landingPage: OTHER_LANDING, fullTextUrl: '' },
        }),
      ]);
    });

    it('still names a half that could only follow whichever canonical Location the publisher is left to choose', () => {
      const reduced = reduce([
        record({
          form: EPUB,
          supply: productSupply([
            supplyDetail({
              supplierXml: supplier({ name: 'A', websites: website('36', LANDING) + website('29', FULL_TEXT) }),
              unpriced: '02',
            }),
            supplyDetail({
              supplierXml: supplier({
                name: 'B',
                websites: website('36', 'https://b.example.org/a') + website('29', 'https://b.example.org/a.epub'),
              }),
              unpriced: '02',
            }),
            supplyDetail({
              supplierXml: supplier({ name: 'Half', websites: website('36', 'https://half.example.org/a') }),
              unpriced: '02',
            }),
          ]),
        }),
      ]);

      expect(
        reduced.plan.findings
          .filter(({ code }) => code.startsWith('LOCATION_'))
          .map(({ code, blocking, carrier, detail }) => [code, blocking, carrier, detail]),
      ).toEqual([
        ['LOCATION_CANONICAL_AMBIGUOUS', true, 'DIGITAL', expect.anything()],
        ['LOCATION_NOT_CANONICAL', false, 'DIGITAL', { landingPage: 'https://half.example.org/a', fullTextUrl: '' }],
      ]);
    });

    it('reads one Location stated alike in several supply contexts as one candidate, keeping every context', () => {
      const websites = website('36', LANDING) + website('29', FULL_TEXT);
      const reduced = reduce([
        record({
          form: EPUB,
          supply:
            productSupply(
              [supplyDetail({ supplierXml: supplier({ websites }), unpriced: '02' })],
              market('<CountriesIncluded>GB</CountriesIncluded>'),
            ) +
            productSupply(
              [supplyDetail({ supplierXml: supplier({ websites }), unpriced: '02' })],
              market('<CountriesIncluded>US</CountriesIncluded>'),
            ),
        }),
      ]);
      const links = [1, 2].flatMap((supply) =>
        [1, 2].map(
          (site) => `${PRODUCT_1}/ProductSupply[${supply}]/SupplyDetail[1]/Supplier[1]/Website[${site}]/WebsiteLink[1]`,
        ),
      );

      expect(productOf(reduced).carriers.DIGITAL).toEqual({
        location: {
          kind: 'CANONICAL',
          candidate: {
            landingPage: LANDING,
            fullTextUrl: FULL_TEXT,
            platform: 'OTHER',
            locations: links.map((path) => ({ path, sourcePath: path })),
          },
        },
        findingKeys: [],
      });
      expect(reduced.plan.findings.filter(({ code }) => code.startsWith('LOCATION_'))).toEqual([]);
    });

    it('pairs nothing inside one supply context that states several landing pages or full text URLs, and decides no canonical Location', () => {
      const FULL_TEXT_FR = 'https://supplier.example.com/livre/un-titre.epub';
      const variants =
        website('36', LANDING) +
        `<Website><WebsiteRole>29</WebsiteRole><WebsiteLink language="eng">${FULL_TEXT}</WebsiteLink><WebsiteLink language="fre">${FULL_TEXT_FR}</WebsiteLink></Website>`;
      const reduced = reduce([
        record({
          form: EPUB,
          supply: productSupply([
            supplyDetail({ supplierXml: supplier({ name: 'Variants', websites: variants }), unpriced: '02' }),
            // A complete candidate elsewhere does not settle what the ambiguous context would have stated.
            supplyDetail({
              supplierXml: supplier({
                name: 'Other',
                websites:
                  website('36', 'https://other.example.org/a') + website('29', 'https://other.example.org/a.epub'),
              }),
              unpriced: '02',
            }),
          ]),
        }),
        record({
          ref: 'hardback',
          isbn: '9781800000025',
          form: '<ProductForm>BB</ProductForm>',
          supply: productSupply([
            supplyDetail({
              supplierXml: supplier({
                websites: website('36', LANDING) + website('38', 'https://supplier.example.com/b2c/a-title'),
              }),
              unpriced: '02',
            }),
          ]),
        }),
      ]);
      const ambiguities = reduced.plan.findings.filter(({ code }) => code === 'LOCATION_PAIRING_AMBIGUOUS');

      expect(
        ambiguities.map(({ productKey, classification, blocking, carrier, detail }) => [
          productKey,
          classification,
          blocking,
          carrier,
          detail,
        ]),
      ).toEqual([
        [
          reduced.sourcePlan.products[0].productKey,
          'TARGET_INPUT_REQUIRED',
          true,
          null,
          { landingPages: [LANDING], fullTextUrls: [FULL_TEXT, FULL_TEXT_FR] },
        ],
        [
          reduced.sourcePlan.products[1].productKey,
          'TARGET_INPUT_REQUIRED',
          true,
          null,
          { landingPages: [LANDING, 'https://supplier.example.com/b2c/a-title'], fullTextUrls: [] },
        ],
      ]);
      expect(ambiguities[0].locations.map(({ path }) => path)).toEqual([
        `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]/Supplier[1]/Website[1]/WebsiteLink[1]`,
        `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]/Supplier[1]/Website[2]/WebsiteLink[1]`,
        `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]/Supplier[1]/Website[2]/WebsiteLink[2]`,
      ]);
      expect(productOf(reduced).carriers.DIGITAL).toEqual({
        location: { kind: 'INPUT_REQUIRED', findingKeys: [ambiguities[0].key] },
        findingKeys: [],
      });
      expect(productOf(reduced, 1).carriers.PHYSICAL?.location).toEqual({
        kind: 'INPUT_REQUIRED',
        findingKeys: [ambiguities[1].key],
      });
    });

    it("takes a platform only from a website the file types as the publisher's own, never from a market, a supplier name or a URL", () => {
      const cases = [
        // The publisher's website for the specified work may be the publisher website platform (rule 46).
        { websites: website('02', 'https://press.example.ac.uk/book/a-title'), market: '', name: 'Example Press' },
        // A market's region list is geography, never a platform (rules 9, 49; fixture 86).
        {
          websites: website('36', LANDING),
          market: market('<RegionsIncluded>JSTOR</RegionsIncluded>'),
          name: 'Example',
        },
        // A supplier's name is a party, never a platform (rule 45).
        { websites: website('36', 'https://www.jstor.org/stable/10.1234/a-title'), market: '', name: 'JSTOR' },
        // A URL on a Thoth-hosted domain never makes the superuser-only Thoth platform (rule 48; fixture 87).
        { websites: website('37', 'https://books.thoth.pub/a-title'), market: '', name: 'Thoth' },
      ];

      expect(
        cases.map(({ websites, market: markets, name }) => {
          const reduced = reduce([
            record({
              supply: productSupply(
                [supplyDetail({ supplierXml: supplier({ name, websites }), unpriced: '02' })],
                markets,
              ),
            }),
          ]);
          const location = productOf(reduced).carriers.PHYSICAL?.location;

          return location?.kind === 'CANONICAL' ? location.candidate.platform : location?.kind;
        }),
      ).toEqual(['PUBLISHER_WEBSITE', 'OTHER', 'OTHER', 'OTHER']);
    });

    it("leaves out, and names, a URL Thoth's location check refuses, pairing only what remains", () => {
      const UNSTORABLE = 'www.supplier.example.com/book/a-title';
      const reduced = reduce([
        record({
          supply: productSupply([
            supplyDetail({
              supplierXml: supplier({ websites: website('36', UNSTORABLE) + website('29', FULL_TEXT) }),
              unpriced: '02',
            }),
          ]),
        }),
      ]);
      const LINK = `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]/Supplier[1]/Website[1]/WebsiteLink[1]`;

      expect(productOf(reduced).carriers.PHYSICAL?.location).toMatchObject({
        kind: 'CANONICAL',
        candidate: { landingPage: '', fullTextUrl: FULL_TEXT },
      });
      expect(reduced.plan.findings.filter(({ code }) => code.startsWith('LOCATION_'))).toEqual([
        expect.objectContaining({
          code: 'LOCATION_URL_UNREPRESENTABLE',
          classification: 'TARGET_UNREPRESENTABLE',
          blocking: false,
          carrier: null,
          locations: [{ path: LINK, sourcePath: LINK }],
          detail: { link: UNSTORABLE, role: '36' },
        }),
      ]);
    });

    it('never makes a Location of a supplier website that is not about the work itself, keeping it as a source fact', () => {
      const SUPPLIER = `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]/Supplier[1]`;
      const reduced = reduce([
        record({
          supply: productSupply([
            supplyDetail({
              supplierXml: supplier({
                websites:
                  website('33', 'https://supplier.example.com/') +
                  website('01', 'https://press.example.com/') +
                  '<Website><WebsiteLink>https://supplier.example.com/about</WebsiteLink></Website>',
              }),
              unpriced: '02',
            }),
          ]),
        }),
      ]);

      expect(productOf(reduced).carriers.PHYSICAL?.location).toEqual({ kind: 'NONE' });
      expect(
        reduced.plan.findings
          .filter(({ code }) => code.startsWith('LOCATION_'))
          .map(({ code, blocking, detail, locations }) => [code, blocking, detail, locations.map(({ path }) => path)]),
      ).toEqual([
        [
          'LOCATION_WEBSITE_NOT_USED',
          false,
          {
            roles: ['33', '01', 'none'],
            links: [
              'https://supplier.example.com/',
              'https://press.example.com/',
              'https://supplier.example.com/about',
            ],
          },
          [`${SUPPLIER}/Website[1]`, `${SUPPLIER}/Website[2]`, `${SUPPLIER}/Website[3]`],
        ],
      ]);
      // Each website stays a source fact where the file states it.
      expect(productOf(reduced).supplies[0].supplyDetails[0].supplier?.websites.map(({ role }) => role)).toEqual([
        '33',
        '01',
        null,
      ]);
    });
  });

  /**
   * Issue #173's canonical Location matrix, which the adapter used to decide and this reduction now does: a physical
   * canonical Location needs one URL and a digital one both, a half is never completed - not from the publisher's own
   * Work page either - and a Publication with no Location is an ordinary, importable one.
   */
  describe('the canonical Location matrix of issue #173', () => {
    const LANDING = 'https://supplier.example.com/book/a-frontlist-title';
    const FULL_TEXT = 'https://supplier.example.com/book/a-frontlist-title.pdf';
    const PUBLISHER_PAGE =
      '<Publisher><PublishingRole>01</PublishingRole><PublisherName>Example Press</PublisherName>' +
      '<Website><WebsiteRole>02</WebsiteRole><WebsiteLink>https://publisher.example.com/book/a-frontlist-title/</WebsiteLink></Website></Publisher>';
    type Urls = { landingPage?: string; fullTextUrl?: string };

    const reduceWith = (form: string, urls: Urls | null, publisherPage = false) => {
      const websites =
        (urls?.landingPage === undefined
          ? ''
          : `<Website><WebsiteRole>02</WebsiteRole><WebsiteLink>${urls.landingPage}</WebsiteLink></Website>`) +
        (urls?.fullTextUrl === undefined
          ? ''
          : `<Website><WebsiteRole>29</WebsiteRole><WebsiteLink>${urls.fullTextUrl}</WebsiteLink></Website>`);
      const recordXml = record({
        ref: '9781802700000',
        form,
        supply:
          urls === null
            ? ''
            : productSupply([supplyDetail({ supplierXml: supplier({ websites }), prices: [price({ amount: '10' })] })]),
      });
      const reduced = reduce([
        publisherPage ? recordXml.replace('<PublishingStatus>', `${PUBLISHER_PAGE}<PublishingStatus>`) : recordXml,
      ]);
      const product = reduced.plan.products[reduced.sourcePlan.products[0].productKey];

      return {
        location: Object.values(product.carriers)[0]?.location,
        findings: reduced.plan.findings.filter(({ code }) => code.startsWith('LOCATION_')),
      };
    };
    const canonical = (landingPage: string, fullTextUrl: string) => ({
      kind: 'CANONICAL',
      candidate: expect.objectContaining({ landingPage, fullTextUrl }),
    });

    describe.each([
      ['Paperback (BC)', '<ProductForm>BC</ProductForm>'],
      ['Hardback (BB)', '<ProductForm>BB</ProductForm>'],
    ])('a physical publication, %s', (_label, form) => {
      it.each([
        ['neither URL', {}, { kind: 'NONE' }],
        ['a landing page alone', { landingPage: LANDING }, canonical(LANDING, '')],
        ['a full text URL alone', { fullTextUrl: FULL_TEXT }, canonical('', FULL_TEXT)],
        ['both URLs', { landingPage: LANDING, fullTextUrl: FULL_TEXT }, canonical(LANDING, FULL_TEXT)],
      ])(
        'plans from %s exactly the canonical Location the Supplier states, warning about nothing',
        (_case, urls, expected) => {
          const { location, findings } = reduceWith(form, urls);

          expect(location).toEqual(expected);
          expect(findings).toEqual([]);
        },
      );
    });

    describe.each([
      ['PDF (ED + E107)', '<ProductForm>ED</ProductForm><ProductFormDetail>E107</ProductFormDetail>'],
      ['MP3 (AJ + A103)', '<ProductForm>AJ</ProductForm><ProductFormDetail>A103</ProductFormDetail>'],
    ])('a digital publication, %s', (_label, form) => {
      it('plans no Location, and warns about nothing, when the Supplier carries neither URL', () => {
        expect(reduceWith(form, {})).toEqual({ location: { kind: 'NONE' }, findings: [] });
      });

      it.each([
        ['landing page', { landingPage: LANDING }, 'no full text URL was supplied'],
        ['full text URL', { fullTextUrl: FULL_TEXT }, 'no landing page was supplied'],
      ])(
        'plans no Location from a %s alone, and warns once, naming the product and the missing half',
        (_case, urls, missing) => {
          const { location, findings } = reduceWith(form, urls);

          expect(location).toEqual({ kind: 'NONE' });
          expect(findings.map(({ code, blocking }) => [code, blocking])).toEqual([['LOCATION_INCOMPLETE', false]]);
          expect(findings[0].message).toContain(missing);
          expect(findings[0].message).toContain('9781802700000');
          expect(findings[0].message).toContain('The publication itself is imported without it');
        },
      );

      it('plans one canonical Location when the Supplier supplies both URLs', () => {
        expect(reduceWith(form, { landingPage: LANDING, fullTextUrl: FULL_TEXT }).location).toEqual(
          canonical(LANDING, FULL_TEXT),
        );
      });
    });

    it("never completes a half-supplied digital Location from the publisher's own Work page, and plans nothing for no ProductSupply", () => {
      const pdf = '<ProductForm>ED</ProductForm><ProductFormDetail>E107</ProductFormDetail>';

      expect(reduceWith(pdf, { fullTextUrl: FULL_TEXT }, true).location).toEqual({ kind: 'NONE' });
      expect(reduceWith(pdf, null, true)).toEqual({ location: { kind: 'NONE' }, findings: [] });
    });
  });

  describe('a pure reduction', () => {
    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    const deepFreeze = <T>(value: T): T => {
      if (value !== null && typeof value === 'object') {
        Object.values(value).forEach(deepFreeze);
        Object.freeze(value);
      }

      return value;
    };

    const SCHEDULED =
      productSupply([
        supplyDetail({
          supplierXml: supplier({
            websites:
              '<Website><WebsiteRole>36</WebsiteRole><WebsiteLink>https://supplier.example.com/a</WebsiteLink></Website>',
          }),
          prices: [
            price({
              amount: '20.00',
              after: '<PriceDate><PriceDateRole>15</PriceDateRole><Date dateformat="00">20261231</Date></PriceDate>',
            }),
            price({
              amount: '22.00',
              after: '<PriceDate><PriceDateRole>14</PriceDateRole><Date dateformat="00">20270101</Date></PriceDate>',
            }),
            price({ amount: '25.00', currency: 'USD' }),
          ],
        }),
      ]) + productSupply([supplyDetail({ unpriced: '01' })]);

    it('reduces the same file to the same serialisable plan, whatever the clock says, reading no network and changing nothing it is given', () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const root = deepFreeze(
        parse(
          `<ONIXMessage release="3.0" xmlns="${REFERENCE_NS}">${header('<DefaultPriceType>02</DefaultPriceType>')}${record({ supply: SCHEDULED })}</ONIXMessage>`,
        ) as ExtendedONIXMessageRoot,
      );
      const before = JSON.stringify(root);
      const sourcePlan = deepFreeze(planOnixSource(root));

      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-01T00:00:00Z'));
      const beforeTheScheduledPrice = reduceOnixCommercial(root, sourcePlan);
      vi.setSystemTime(new Date('2027-06-01T00:00:00Z'));
      const afterTheScheduledPrice = reduceOnixCommercial(root, sourcePlan);

      // No price is taken according to today's date: the schedule is a conflict before and after it starts (rule 30).
      expect(afterTheScheduledPrice).toEqual(beforeTheScheduledPrice);
      expect(
        beforeTheScheduledPrice.products[sourcePlan.products[0].productKey].prices.map(({ kind }) => kind),
      ).toEqual(['CHOICE_REQUIRED', 'SET']);
      expect(JSON.parse(JSON.stringify(beforeTheScheduledPrice))).toEqual(beforeTheScheduledPrice);
      expect(JSON.stringify(root)).toBe(before);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
