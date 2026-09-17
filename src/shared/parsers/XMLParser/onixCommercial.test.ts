import { parse } from '@5stones/onix';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { OnixCommercialPlan } from '../../types/onixPlanning';
import type { ExtendedONIXMessageRoot } from './interfaces';
import { reduceOnixCommercial } from './onixCommercial';
import { planOnixSource } from './onixPlanning';

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

const reduce = (records: string[], headerXml = header()) => {
  const root = parse(
    `<ONIXMessage release="3.0" xmlns="${REFERENCE_NS}">${headerXml}${records.join('')}</ONIXMessage>`,
  ) as ExtendedONIXMessageRoot;
  const sourcePlan = planOnixSource(root);

  return { root, sourcePlan, plan: reduceOnixCommercial(root, sourcePlan) };
};

/** A reduction's price findings, in the order they were raised: everything but its supply disclosures. */
const priceFindings = (plan: OnixCommercialPlan) => plan.findings.filter(({ code }) => code.startsWith('PRICE_'));

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

    it('keeps who supplies it - role, identifiers, name and every website with each of its links - and only names contact details', () => {
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
                '<TelephoneNumber>+44 20 7946 0000</TelephoneNumber><EmailAddress>orders@distribution.example</EmailAddress>' +
                '<Website><WebsiteRole>36</WebsiteRole><WebsiteDescription>Product page</WebsiteDescription><WebsiteLink>https://distribution.example/book</WebsiteLink></Website>' +
                '<Website><WebsiteRole>29</WebsiteRole><WebsiteLink language="eng">https://distribution.example/book.pdf</WebsiteLink><WebsiteLink language="fre">https://distribution.example/livre.pdf</WebsiteLink></Website>' +
                '<Website><WebsiteLink>https://distribution.example/</WebsiteLink></Website>' +
                '</Supplier>',
              prices: [price()],
            }),
          ]),
        }),
      ]);
      const [{ productKey }] = sourcePlan.products;
      const located = (path: string) => ({ path, sourcePath: path });

      expect(plan.products[productKey].supplies[0].supplyDetails[0].supplier).toEqual({
        ...located(SUPPLIER),
        role: '11',
        name: 'Example Distribution',
        identifiers: [
          { ...located(`${SUPPLIER}/SupplierIdentifier[1]`), type: '06', typeName: null, value: '5012345678900' },
          { ...located(`${SUPPLIER}/SupplierIdentifier[2]`), type: '01', typeName: 'Own code', value: 'DIST-9' },
        ],
        websites: [
          {
            ...located(`${SUPPLIER}/Website[1]`),
            role: '36',
            links: [{ ...located(`${SUPPLIER}/Website[1]/WebsiteLink[1]`), link: 'https://distribution.example/book' }],
          },
          {
            ...located(`${SUPPLIER}/Website[2]`),
            role: '29',
            links: [
              { ...located(`${SUPPLIER}/Website[2]/WebsiteLink[1]`), link: 'https://distribution.example/book.pdf' },
              { ...located(`${SUPPLIER}/Website[2]/WebsiteLink[2]`), link: 'https://distribution.example/livre.pdf' },
            ],
          },
          {
            ...located(`${SUPPLIER}/Website[3]`),
            role: null,
            links: [{ ...located(`${SUPPLIER}/Website[3]/WebsiteLink[1]`), link: 'https://distribution.example/' }],
          },
        ],
        // A telephone number or an email address is named where it is stated, and never copied.
        contactElements: [
          { ...located(`${SUPPLIER}/TelephoneNumber[1]`), element: 'TelephoneNumber' },
          { ...located(`${SUPPLIER}/EmailAddress[1]`), element: 'EmailAddress' },
        ],
      });
      expect(JSON.stringify(plan)).not.toContain('orders@distribution.example');
      expect(JSON.stringify(plan)).not.toContain('7946');
    });

    it('keeps availability, supply dates, market scope and market publishing as supply facts, each where it is stated', () => {
      const SUPPLY = `${PRODUCT_1}/ProductSupply[1]`;
      const DETAIL = `${SUPPLY}/SupplyDetail[1]`;
      const { plan, sourcePlan } = reduce(
        [
          record({
            supply:
              '<ProductSupply><MarketReference>UK-TRADE</MarketReference>' +
              '<Market><Territory><CountriesIncluded>GB</CountriesIncluded><RegionsExcluded>GB-NIR</RegionsExcluded></Territory>' +
              '<SalesRestriction><SalesRestrictionType>04</SalesRestrictionType></SalesRestriction></Market>' +
              '<MarketPublishingDetail><PublisherRepresentative><AgentRole>07</AgentRole><AgentName>Example Agency</AgentName></PublisherRepresentative>' +
              '<MarketPublishingStatus>02</MarketPublishingStatus>' +
              '<MarketDate><MarketDateRole>01</MarketDateRole><Date dateformat="00">20261001</Date></MarketDate></MarketPublishingDetail>' +
              supplyDetail({
                availability: '10',
                dates:
                  '<SupplyDate><SupplyDateRole>08</SupplyDateRole><Date dateformat="00">20260917</Date></SupplyDate>' +
                  '<OrderTime>7</OrderTime><Stock><OnHand>12</OnHand></Stock><PackQuantity>20</PackQuantity>',
                unpriced: '02',
              }) +
              '</ProductSupply>',
          }),
        ],
        header('<DefaultCurrencyCode>GBP</DefaultCurrencyCode>'),
      );
      const [{ productKey }] = sourcePlan.products;
      const [supply] = plan.products[productKey].supplies;
      const [detail] = supply.supplyDetails;
      const located = (path: string) => ({ path, sourcePath: path });

      expect(supply.marketReference).toBe('UK-TRADE');
      expect(supply.markets).toEqual([
        {
          ...located(`${SUPPLY}/Market[1]`),
          territory: {
            ...located(`${SUPPLY}/Market[1]/Territory[1]`),
            countriesIncluded: 'GB',
            regionsIncluded: null,
            countriesExcluded: null,
            regionsExcluded: 'GB-NIR',
          },
          // What a sales restriction means is the SalesRights stage's: it is kept where it is, unread.
          salesRestrictions: [located(`${SUPPLY}/Market[1]/SalesRestriction[1]`)],
        },
      ]);
      expect(supply.marketPublishing).toEqual({
        ...located(`${SUPPLY}/MarketPublishingDetail[1]`),
        status: '02',
        dates: [
          {
            ...located(`${SUPPLY}/MarketPublishingDetail[1]/MarketDate[1]`),
            role: '01',
            date: '20261001',
            dateFormat: '00',
          },
        ],
        otherElements: [
          {
            ...located(`${SUPPLY}/MarketPublishingDetail[1]/PublisherRepresentative[1]`),
            element: 'PublisherRepresentative',
          },
        ],
      });
      expect(detail).toMatchObject({
        availability: '10',
        supplyDates: [{ ...located(`${DETAIL}/SupplyDate[1]`), role: '08', date: '20260917', dateFormat: '00' }],
        unpricedItemType: '02',
        prices: [],
        otherElements: [
          { ...located(`${DETAIL}/OrderTime[1]`), element: 'OrderTime' },
          { ...located(`${DETAIL}/Stock[1]`), element: 'Stock' },
          { ...located(`${DETAIL}/PackQuantity[1]`), element: 'PackQuantity' },
        ],
      });
      // An agent's name is the market's, and is named, never copied.
      expect(JSON.stringify(plan)).not.toContain('Example Agency');
    });

    it('keeps every semantic of a Price - qualifier, status, unit, conditions, tax, territory, dates, comparisons - before any reduction', () => {
      const PRICE = `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]/Price[1]`;
      const UNPRICED = `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]/Price[2]`;
      const { plan, sourcePlan } = reduce([
        record({
          supply: productSupply([
            supplyDetail({
              prices: [
                '<Price><PriceIdentifier><PriceIDType>01</PriceIDType><IDTypeName>List</IDTypeName><IDValue>P-1</IDValue></PriceIdentifier>' +
                  '<PriceType>04</PriceType><PriceQualifier>10</PriceQualifier><PricePer>01</PricePer>' +
                  '<PriceCondition><PriceConditionType>01</PriceConditionType></PriceCondition>' +
                  '<MinimumOrderQuantity>5</MinimumOrderQuantity><BatchBonus><BatchQuantity>10</BatchQuantity><FreeQuantity>1</FreeQuantity></BatchBonus>' +
                  '<Discount><DiscountPercent>35</DiscountPercent></Discount><PriceStatus>01</PriceStatus><PriceAmount>18.50</PriceAmount>' +
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
      const located = (path: string) => ({ path, sourcePath: path });

      expect(rich).toMatchObject({
        ...located(PRICE),
        identifiers: [{ ...located(`${PRICE}/PriceIdentifier[1]`), type: '01', typeName: 'List', value: 'P-1' }],
        qualifier: '10',
        status: '01',
        per: '01',
        amount: '18.50',
        unpricedItemType: null,
        conditions: [{ ...located(`${PRICE}/PriceCondition[1]`), type: '01' }],
        minimumOrderQuantity: '5',
        territory: { ...located(`${PRICE}/Territory[1]`), countriesIncluded: 'DE AT' },
        currencyZone: 'EUR',
        dates: [{ ...located(`${PRICE}/PriceDate[1]`), role: '14', date: '20270101', dateFormat: '00' }],
        comparisons: [],
        otherElements: [
          { ...located(`${PRICE}/BatchBonus[1]`), element: 'BatchBonus' },
          { ...located(`${PRICE}/Discount[1]`), element: 'Discount' },
          { ...located(`${PRICE}/Tax[1]`), element: 'Tax' },
          { ...located(`${PRICE}/PrintedOnProduct[1]`), element: 'PrintedOnProduct' },
          { ...located(`${PRICE}/PositionOnProduct[1]`), element: 'PositionOnProduct' },
        ],
      });
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
            productIdentifiers: [{ type: '15', typeName: null, value: '9781800000025' }],
            type: '02',
            amount: '75.00',
            currency: 'GBP',
          },
        ],
      });
    });
  });

  describe('price reduction (rules 19-37)', () => {
    /** The one Product's price decisions, as kind, currency and amount. */
    const decisionsOf = ({ plan, sourcePlan }: ReturnType<typeof reduce>, index = 0) =>
      plan.products[sourcePlan.products[index].productKey].prices.map((decision) =>
        decision.kind === 'SET'
          ? [decision.kind, decision.currencyCode, decision.unitPrice]
          : [decision.kind, decision.currencyCode, decision.amounts],
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
          { currency: 'GBP', amount: '20', priceTypes: ['02'], lost: ['PriceType'], sources: 1 },
        ],
        [
          'PRICE_REDUCED',
          'SUPPORTED_WITH_WARNING',
          false,
          { currency: 'USD', amount: '25.5', priceTypes: ['01'], lost: ['PriceType'], sources: 1 },
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

    it('takes no winner where eligible prices state different amounts in one currency - by supplier, market or date - and blocks, whatever the order', () => {
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

      expect(cases.map((reduced) => decisionsOf(reduced))).toEqual([
        [['CONFLICT', 'GBP', [20, 22]]],
        [['CONFLICT', 'GBP', [20, 22]]],
        [['CONFLICT', 'GBP', [19.99, 20]]],
        [['CONFLICT', 'GBP', [19.99, 20]]],
      ]);
      cases.forEach((reduced) =>
        expect(findingsOf(reduced)).toEqual([
          ['PRICE_AMOUNT_CONFLICT', 'TARGET_UNREPRESENTABLE', true, { currency: 'GBP', amounts: expect.any(Array) }],
        ]),
      );
      expect(priceFindings(cases[0].plan)[0].locations.map(({ path }) => path)).toEqual([
        `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]/Price[1]`,
        `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]/Price[2]`,
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
        'keeps $label as a source fact, sets no Price from it and blocks nothing',
        ({ priceXml, exclusions }) => {
          const reduced = reduce([record({ supply: productSupply([supplyDetail({ prices: [priceXml] })]) })]);

          expect(decisionsOf(reduced)).toEqual([]);
          expect(findingsOf(reduced)).toEqual([
            ['PRICE_NOT_AUTOMATIC', 'TARGET_UNREPRESENTABLE', false, expect.objectContaining({ exclusions })],
          ]);
          expect(priceFindings(reduced.plan)[0].locations.map(({ path }) => path)).toEqual([
            `${PRODUCT_1}/ProductSupply[1]/SupplyDetail[1]/Price[1]`,
          ]);
        },
      );

      it('still takes the ordinary retail price beside them, and reads codes that state no qualification as none', () => {
        const trivial = price({
          amount: '20.00',
          before:
            '<PriceQualifier>00</PriceQualifier><PricePer>00</PricePer><PriceCondition><PriceConditionType>00</PriceConditionType></PriceCondition>' +
            '<MinimumOrderQuantity>1</MinimumOrderQuantity><PriceStatus>02</PriceStatus>',
        });
        const reduced = reduce([
          record({
            supply: productSupply([
              supplyDetail({
                prices: [
                  price({ type: '05', amount: '12.00' }),
                  trivial,
                  price({ before: '<PriceQualifier>10</PriceQualifier>', amount: '60.00' }),
                ],
              }),
            ]),
          }),
        ]);

        // Neither the net price nor the library price competes with, or displaces, the retail price.
        expect(decisionsOf(reduced)).toEqual([['SET', 'GBP', 20]]);
        expect(findingsOf(reduced).map(([code, , blocking]) => [code, blocking])).toEqual([
          ['PRICE_NOT_AUTOMATIC', false],
          ['PRICE_NOT_AUTOMATIC', false],
          ['PRICE_REDUCED', false],
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
          locations: [`${SUPPLY}/Market[1]`, `${SUPPLY}/MarketPublishingDetail[1]`, `${SUPPLY}/SupplyDetail[1]`].map(
            (path) => ({ path, sourcePath: path }),
          ),
          detail: {
            elements: [
              'Market',
              'SalesRestriction',
              'MarketPublishingDetail',
              'Supplier',
              'ProductAvailability',
              'SupplyDate',
              'Stock',
            ],
            availability: ['40'],
            marketPublishingStatus: ['07'],
          },
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
      ).toEqual(['CONFLICT', 'SET']);
      expect(JSON.parse(JSON.stringify(beforeTheScheduledPrice))).toEqual(beforeTheScheduledPrice);
      expect(JSON.stringify(root)).toBe(before);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
