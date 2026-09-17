import { CurrencyCode, LocationPlatform } from '@/gql/graphql';
import type { PublicationType } from '@/src/entities/publication/model/publication.types';

import type {
  OnixCarrierCommercial,
  OnixCommercialFinding,
  OnixCommercialPlan,
  OnixCommercialResolution,
  OnixComparisonPriceFact,
  OnixContactPointsFact,
  OnixEffectiveCode,
  OnixLocationCandidate,
  OnixLocationCarrier,
  OnixManifestationDecision,
  OnixMarketFact,
  OnixMarketPublishingFact,
  OnixNewSupplierFact,
  OnixPriceCandidate,
  OnixPriceDecision,
  OnixPriceExclusion,
  OnixPriceFact,
  OnixPriceRightsTermFact,
  OnixProductCommercial,
  OnixProductSupplyFact,
  OnixPublisherRepresentativeFact,
  OnixReissueFact,
  OnixSalesRestrictionFact,
  OnixSourceLocation,
  OnixSourcePlan,
  OnixStatedIdentifier,
  OnixStatedText,
  OnixStatedValue,
  OnixStockFact,
  OnixSupplierFact,
  OnixSupplierWebsiteFact,
  OnixSupplyContactFact,
  OnixSupplyDateFact,
  OnixSupplyDetailFact,
  OnixTerritoryFact,
} from '../../types/onixPlanning';
import { isFullTextUrlAvailable } from '../../utils/publications';
import type { ExtendedONIXMessageRoot, OnixText } from './interfaces';
import { getOnixText, toOnixArray } from './onix';
import type { ProvenanceResolver } from './validation/worker/provenance';

/**
 * The canonical ProductSupply, price and Publication Location reducer of thoth-app#215, Stage B of #184, under
 * ONIX-AUDIT-PRODUCT-SUPPLY-01 (#179 proposal 5541821365, approval 5541897557) and specification amendment 5713644155.
 *
 * It runs after canonical source validation has permitted target planning, on the adapter value bridged from the final
 * normalised Reference XML with its Short-tag provenance, and after #182 has decided which records are Products and
 * which Products manifest one Work. It reads nothing else - no Thoth lookup, no clock, no URL - and decides nothing about
 * source validity.
 */

export type ReduceOnixCommercialOptions = {
  /** Maps canonical Reference paths back to the submitted source, for a Short-tag file. */
  readonly provenance?: ProvenanceResolver;
};

const MESSAGE_PATH = '/ONIXMessage[1]';

/* ------------------------------------------------------------------------------------------------ */
/* Reading the adapter                                                                              */
/* ------------------------------------------------------------------------------------------------ */

/** One element occurrence and its canonical path. */
type Occurrence = { readonly value: unknown; readonly path: string };

type Locate = (path: string) => OnixSourceLocation;

const isElement = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Every occurrence of a named child, in source order, with its canonical path. `@5stones/onix` emits a single
 * occurrence as a value and a repeated one as an array; positions count same-named siblings from 1, as paths do.
 */
const children = (parent: Occurrence | undefined, name: string): Occurrence[] => {
  if (parent === undefined || !isElement(parent.value) || !(name in parent.value)) return [];

  const child = parent.value[name];

  return (Array.isArray(child) ? child : [child])
    .map((value, index) => ({ value: value as unknown, path: `${parent.path}/${name}[${index + 1}]` }))
    .filter(({ value }) => value !== undefined && value !== null);
};

/** Every child element of an occurrence, by name and in source order, with its canonical path. */
const childElements = (parent: Occurrence): { readonly name: string; readonly occurrence: Occurrence }[] =>
  isElement(parent.value)
    ? Object.keys(parent.value)
        .filter((name) => name !== '#text' && !name.startsWith('@_'))
        .flatMap((name) => children(parent, name).map((occurrence) => ({ name, occurrence })))
    : [];

const textOf = (occurrence: Occurrence | undefined): string =>
  occurrence === undefined ? '' : getOnixText(occurrence.value as OnixText);

/** The text of the first occurrence of a named child, or null where it states none. */
const childText = (parent: Occurrence | undefined, name: string): string | null => {
  const text = textOf(children(parent, name)[0]);

  return text.length > 0 ? text : null;
};

const attributeOf = (occurrence: Occurrence | undefined, name: string): string | null => {
  const value = isElement(occurrence?.value) ? occurrence.value[`@_${name}`] : undefined;

  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
};

/** Every occurrence of a named child that may repeat, each with the value it states. */
const statedValues = (parent: Occurrence, name: string, locate: Locate): OnixStatedValue[] =>
  children(parent, name).map((occurrence) => ({ ...locate(occurrence.path), value: textOf(occurrence) }));

/** A name, description or note, with its declared language and text format; XHTML child elements are not kept. */
const statedText = (occurrence: Occurrence, locate: Locate): OnixStatedText => ({
  ...locate(occurrence.path),
  value: textOf(occurrence),
  language: attributeOf(occurrence, 'language'),
  textFormat: attributeOf(occurrence, 'textformat'),
  markupNotKept: childElements(occurrence).length > 0,
});

const statedTexts = (parent: Occurrence, name: string, locate: Locate): OnixStatedText[] =>
  children(parent, name).map((occurrence) => statedText(occurrence, locate));

/** Every identifier composite of one name, with the element naming its type. */
const identifiersOf = (parent: Occurrence, name: string, typeElement: string, locate: Locate): OnixStatedIdentifier[] =>
  children(parent, name).map((identifier) => ({
    ...locate(identifier.path),
    type: childText(identifier, typeElement) ?? '',
    typeName: childText(identifier, 'IDTypeName'),
    value: childText(identifier, 'IDValue') ?? '',
  }));

const contactPointsOf = (parent: Occurrence, locate: Locate): OnixContactPointsFact => ({
  telephoneNumbers: statedValues(parent, 'TelephoneNumber', locate),
  faxNumbers: statedValues(parent, 'FaxNumber', locate),
  emailAddresses: statedValues(parent, 'EmailAddress', locate),
});

/** A dated element's value and the format its `dateformat` attribute declares. */
const datedValue = (parent: Occurrence, name: string): { date: string | null; dateFormat: string | null } => {
  const [dated] = children(parent, name);

  return { date: childText(parent, name), dateFormat: attributeOf(dated, 'dateformat') };
};

/* ------------------------------------------------------------------------------------------------ */
/* Source facts (rules 1-19)                                                                        */
/* ------------------------------------------------------------------------------------------------ */

/** The Header defaults a Price inherits where it states no value of its own (rule 4). */
type HeaderDefaults = {
  readonly priceType: Occurrence | undefined;
  readonly currency: Occurrence | undefined;
};

/** A code a Price states, or else the valid Header default it inherits. */
const effectiveCode = (
  price: Occurrence,
  name: string,
  headerDefault: Occurrence | undefined,
  locate: Locate,
): OnixEffectiveCode => {
  const [stated] = children(price, name);
  const explicit = textOf(stated);

  if (stated !== undefined && explicit.length > 0) {
    return { value: explicit, origin: 'EXPLICIT', location: locate(stated.path) };
  }

  const inherited = textOf(headerDefault);

  return headerDefault !== undefined && inherited.length > 0
    ? { value: inherited, origin: 'HEADER_DEFAULT', location: locate(headerDefault.path) }
    : { value: null, origin: 'ABSENT', location: null };
};

const readTerritory = (territory: Occurrence, locate: Locate): OnixTerritoryFact => ({
  ...locate(territory.path),
  countriesIncluded: childText(territory, 'CountriesIncluded'),
  regionsIncluded: childText(territory, 'RegionsIncluded'),
  countriesExcluded: childText(territory, 'CountriesExcluded'),
  regionsExcluded: childText(territory, 'RegionsExcluded'),
});

const readSalesRestriction = (restriction: Occurrence, locate: Locate): OnixSalesRestrictionFact => {
  const start = datedValue(restriction, 'StartDate');
  const end = datedValue(restriction, 'EndDate');

  return {
    ...locate(restriction.path),
    type: childText(restriction, 'SalesRestrictionType'),
    outlets: children(restriction, 'SalesOutlet').map((outlet) => ({
      ...locate(outlet.path),
      identifiers: identifiersOf(outlet, 'SalesOutletIdentifier', 'SalesOutletIDType', locate),
      name: childText(outlet, 'SalesOutletName'),
    })),
    notes: statedTexts(restriction, 'SalesRestrictionNote', locate),
    startDate: start.date,
    startDateFormat: start.dateFormat,
    endDate: end.date,
    endDateFormat: end.dateFormat,
  };
};

const readMarket = (market: Occurrence, locate: Locate): OnixMarketFact => {
  const [territory] = children(market, 'Territory');

  return {
    ...locate(market.path),
    territory: territory === undefined ? null : readTerritory(territory, locate),
    salesRestrictions: children(market, 'SalesRestriction').map((restriction) =>
      readSalesRestriction(restriction, locate),
    ),
  };
};

/** A dated composite: its role and its Date, whose format is the Date's own attribute or, in ONIX 3.0, a DateFormat. */
const readDate = (dated: Occurrence, roleName: string, locate: Locate): OnixSupplyDateFact => {
  const [date] = children(dated, 'Date');

  return {
    ...locate(dated.path),
    role: childText(dated, roleName) ?? '',
    date: textOf(date),
    dateFormat: attributeOf(date, 'dateformat') ?? childText(dated, 'DateFormat'),
  };
};

const readWebsite = (website: Occurrence, locate: Locate): OnixSupplierWebsiteFact => ({
  ...locate(website.path),
  role: childText(website, 'WebsiteRole'),
  descriptions: statedTexts(website, 'WebsiteDescription', locate),
  links: children(website, 'WebsiteLink')
    .map((link) => ({ ...locate(link.path), link: textOf(link) }))
    .filter(({ link }) => link.length > 0),
});

const websitesOf = (party: Occurrence, locate: Locate): OnixSupplierWebsiteFact[] =>
  children(party, 'Website').map((website) => readWebsite(website, locate));

const readRepresentative = (agent: Occurrence, locate: Locate): OnixPublisherRepresentativeFact => ({
  ...locate(agent.path),
  role: childText(agent, 'AgentRole'),
  identifiers: identifiersOf(agent, 'AgentIdentifier', 'AgentIDType', locate),
  name: childText(agent, 'AgentName'),
  ...contactPointsOf(agent, locate),
  websites: websitesOf(agent, locate),
});

const ADDRESS_ELEMENTS = ['StreetAddress', 'LocationName', 'PostalCode', 'RegionCode', 'CountryCode'];

/** A SupplyContact or a ProductContact, whose role, identifier and name elements carry its own element name. */
const readContact = (
  contact: Occurrence,
  element: 'SupplyContact' | 'ProductContact',
  locate: Locate,
): OnixSupplyContactFact => ({
  ...locate(contact.path),
  role: childText(contact, `${element}Role`),
  identifiers: identifiersOf(contact, `${element}Identifier`, `${element}IDType`, locate),
  name: childText(contact, `${element}Name`),
  contactName: childText(contact, 'ContactName'),
  ...contactPointsOf(contact, locate),
  address: ADDRESS_ELEMENTS.some((name) => children(contact, name).length > 0)
    ? {
        streetAddress: childText(contact, 'StreetAddress'),
        locationName: childText(contact, 'LocationName'),
        postalCode: childText(contact, 'PostalCode'),
        regionCode: childText(contact, 'RegionCode'),
        countryCode: childText(contact, 'CountryCode'),
      }
    : null,
});

const readMarketPublishing = (detail: Occurrence, locate: Locate): OnixMarketPublishingFact => {
  const [promotionContact] = children(detail, 'PromotionContact');

  return {
    ...locate(detail.path),
    publisherRepresentatives: children(detail, 'PublisherRepresentative').map((agent) =>
      readRepresentative(agent, locate),
    ),
    productContacts: children(detail, 'ProductContact').map((contact) =>
      readContact(contact, 'ProductContact', locate),
    ),
    status: childText(detail, 'MarketPublishingStatus'),
    statusNotes: statedTexts(detail, 'MarketPublishingStatusNote', locate),
    dates: children(detail, 'MarketDate').map((date) => readDate(date, 'MarketDateRole', locate)),
    promotionCampaigns: statedTexts(detail, 'PromotionCampaign', locate),
    promotionContact: promotionContact === undefined ? null : statedText(promotionContact, locate),
    initialPrintRuns: statedTexts(detail, 'InitialPrintRun', locate),
    reprintDetails: statedTexts(detail, 'ReprintDetail', locate),
    copiesSold: statedTexts(detail, 'CopiesSold', locate),
    bookClubAdoptions: statedTexts(detail, 'BookClubAdoption', locate),
  };
};

const readSupplier = (supplier: Occurrence, locate: Locate): OnixSupplierFact => ({
  ...locate(supplier.path),
  role: childText(supplier, 'SupplierRole'),
  name: childText(supplier, 'SupplierName'),
  identifiers: identifiersOf(supplier, 'SupplierIdentifier', 'SupplierIDType', locate),
  ...contactPointsOf(supplier, locate),
  websites: websitesOf(supplier, locate),
});

const readNewSupplier = (party: Occurrence, locate: Locate): OnixNewSupplierFact => ({
  ...locate(party.path),
  identifiers: identifiersOf(party, 'SupplierIdentifier', 'SupplierIDType', locate),
  name: childText(party, 'SupplierName'),
  ...contactPointsOf(party, locate),
  websites: websitesOf(party, locate),
});

const readStock = (stock: Occurrence, locate: Locate): OnixStockFact => ({
  ...locate(stock.path),
  locationIdentifiers: identifiersOf(stock, 'LocationIdentifier', 'LocationIDType', locate),
  locationNames: statedTexts(stock, 'LocationName', locate),
  quantitiesCoded: children(stock, 'StockQuantityCoded').map((coded) => ({
    ...locate(coded.path),
    type: childText(coded, 'StockQuantityCodeType'),
    typeName: childText(coded, 'StockQuantityCodeTypeName'),
    code: childText(coded, 'StockQuantityCode'),
  })),
  onHand: childText(stock, 'OnHand'),
  reserved: childText(stock, 'Reserved'),
  onOrder: childText(stock, 'OnOrder'),
  cbo: childText(stock, 'CBO'),
  proximities: statedValues(stock, 'Proximity', locate),
  onOrderDetails: children(stock, 'OnOrderDetail').map((detail) => {
    const expected = datedValue(detail, 'ExpectedDate');

    return {
      ...locate(detail.path),
      onOrder: childText(detail, 'OnOrder'),
      proximity: childText(detail, 'Proximity'),
      expectedDate: expected.date,
      expectedDateFormat: expected.dateFormat,
    };
  }),
  velocities: children(stock, 'Velocity').map((velocity) => ({
    ...locate(velocity.path),
    metric: childText(velocity, 'VelocityMetric'),
    rate: childText(velocity, 'Rate'),
    proximity: childText(velocity, 'Proximity'),
  })),
});

const readComparison = (comparison: Occurrence, locate: Locate): OnixComparisonPriceFact => ({
  ...locate(comparison.path),
  productIdentifiers: identifiersOf(comparison, 'ProductIdentifier', 'ProductIDType', locate),
  type: childText(comparison, 'PriceType'),
  amount: childText(comparison, 'PriceAmount'),
  currency: childText(comparison, 'CurrencyCode'),
});

/** The rights elements a Price may state, whose facts are the rights reduction's (thoth-app#211). */
const PRICE_RIGHTS_ELEMENTS: ReadonlySet<string> = new Set<OnixPriceRightsTermFact['element']>([
  'EpubTechnicalProtection',
  'EpubLicense',
]);

const readPrice = (price: Occurrence, defaults: HeaderDefaults, locate: Locate): OnixPriceFact => {
  const [territory] = children(price, 'Territory');
  const [coded] = children(price, 'PriceCoded');
  const [taxExempt] = children(price, 'TaxExempt');

  return {
    ...locate(price.path),
    identifiers: identifiersOf(price, 'PriceIdentifier', 'PriceIDType', locate),
    type: effectiveCode(price, 'PriceType', defaults.priceType, locate),
    typeDescriptions: statedTexts(price, 'PriceTypeDescription', locate),
    qualifier: childText(price, 'PriceQualifier'),
    rightsTerms: childElements(price)
      .filter(({ name }) => PRICE_RIGHTS_ELEMENTS.has(name))
      .map(({ name, occurrence }) => ({
        ...locate(occurrence.path),
        element: name as OnixPriceRightsTermFact['element'],
      })),
    constraints: children(price, 'PriceConstraint').map((constraint) => ({
      ...locate(constraint.path),
      type: childText(constraint, 'PriceConstraintType'),
      status: childText(constraint, 'PriceConstraintStatus'),
      limits: children(constraint, 'PriceConstraintLimit').map((limit) => ({
        ...locate(limit.path),
        quantity: childText(limit, 'Quantity'),
        unit: childText(limit, 'PriceConstraintUnit'),
      })),
    })),
    per: childText(price, 'PricePer'),
    conditions: children(price, 'PriceCondition').map((condition) => ({
      ...locate(condition.path),
      type: childText(condition, 'PriceConditionType') ?? '',
      quantities: children(condition, 'PriceConditionQuantity').map((quantity) => ({
        ...locate(quantity.path),
        type: childText(quantity, 'PriceConditionQuantityType'),
        quantity: childText(quantity, 'Quantity'),
        unit: childText(quantity, 'QuantityUnit'),
      })),
      productIdentifiers: identifiersOf(condition, 'ProductIdentifier', 'ProductIDType', locate),
    })),
    minimumOrderQuantity: childText(price, 'MinimumOrderQuantity'),
    batchBonuses: children(price, 'BatchBonus').map((bonus) => ({
      ...locate(bonus.path),
      batchQuantity: childText(bonus, 'BatchQuantity'),
      freeQuantity: childText(bonus, 'FreeQuantity'),
    })),
    discountsCoded: children(price, 'DiscountCoded').map((discount) => ({
      ...locate(discount.path),
      type: childText(discount, 'DiscountCodeType'),
      typeName: childText(discount, 'DiscountCodeTypeName'),
      code: childText(discount, 'DiscountCode'),
    })),
    discounts: children(price, 'Discount').map((discount) => ({
      ...locate(discount.path),
      type: childText(discount, 'DiscountType'),
      quantity: childText(discount, 'Quantity'),
      toQuantity: childText(discount, 'ToQuantity'),
      percent: childText(discount, 'DiscountPercent'),
      amount: childText(discount, 'DiscountAmount'),
    })),
    status: childText(price, 'PriceStatus'),
    amount: childText(price, 'PriceAmount'),
    coded:
      coded === undefined
        ? null
        : {
            ...locate(coded.path),
            type: childText(coded, 'PriceCodeType'),
            typeName: childText(coded, 'PriceCodeTypeName'),
            code: childText(coded, 'PriceCode'),
          },
    taxes: children(price, 'Tax').map((tax) => ({
      ...locate(tax.path),
      productIdentifiers: identifiersOf(tax, 'ProductIdentifier', 'ProductIDType', locate),
      pricePartDescriptions: statedTexts(tax, 'PricePartDescription', locate),
      type: childText(tax, 'TaxType'),
      rateCode: childText(tax, 'TaxRateCode'),
      ratePercent: childText(tax, 'TaxRatePercent'),
      taxableAmount: childText(tax, 'TaxableAmount'),
      taxAmount: childText(tax, 'TaxAmount'),
    })),
    taxExempt: taxExempt === undefined ? null : locate(taxExempt.path),
    unpricedItemType: childText(price, 'UnpricedItemType'),
    currency: effectiveCode(price, 'CurrencyCode', defaults.currency, locate),
    territory: territory === undefined ? null : readTerritory(territory, locate),
    currencyZone: childText(price, 'CurrencyZone'),
    comparisons: children(price, 'ComparisonProductPrice').map((comparison) => readComparison(comparison, locate)),
    dates: children(price, 'PriceDate').map((date) => readDate(date, 'PriceDateRole', locate)),
    printedOnProduct: childText(price, 'PrintedOnProduct'),
    positionOnProduct: childText(price, 'PositionOnProduct'),
  };
};

const readReissue = (reissue: Occurrence, defaults: HeaderDefaults, locate: Locate): OnixReissueFact => {
  const { date, dateFormat } = datedValue(reissue, 'ReissueDate');
  const [description] = children(reissue, 'ReissueDescription');

  return {
    ...locate(reissue.path),
    date,
    dateFormat,
    description: description === undefined ? null : statedText(description, locate),
    prices: children(reissue, 'Price').map((price) => readPrice(price, defaults, locate)),
    supportingResources: children(reissue, 'SupportingResource').map(({ path }) => locate(path)),
  };
};

const readSupplyDetail = (detail: Occurrence, defaults: HeaderDefaults, locate: Locate): OnixSupplyDetailFact => {
  const [supplier] = children(detail, 'Supplier');
  const [newSupplier] = children(detail, 'NewSupplier');
  const [reissue] = children(detail, 'Reissue');

  return {
    ...locate(detail.path),
    supplier: supplier === undefined ? null : readSupplier(supplier, locate),
    supplyContacts: children(detail, 'SupplyContact').map((contact) => readContact(contact, 'SupplyContact', locate)),
    supplierOwnCodings: children(detail, 'SupplierOwnCoding').map((coding) => ({
      ...locate(coding.path),
      type: childText(coding, 'SupplierCodeType'),
      typeName: childText(coding, 'SupplierCodeTypeName'),
      value: childText(coding, 'SupplierCodeValue'),
    })),
    returnsConditions: children(detail, 'ReturnsConditions').map((conditions) => ({
      ...locate(conditions.path),
      type: childText(conditions, 'ReturnsCodeType'),
      typeName: childText(conditions, 'ReturnsCodeTypeName'),
      code: childText(conditions, 'ReturnsCode'),
      notes: statedTexts(conditions, 'ReturnsNote', locate),
    })),
    availability: childText(detail, 'ProductAvailability'),
    supplyDates: children(detail, 'SupplyDate').map((date) => readDate(date, 'SupplyDateRole', locate)),
    orderTime: childText(detail, 'OrderTime'),
    newSupplier: newSupplier === undefined ? null : readNewSupplier(newSupplier, locate),
    stocks: children(detail, 'Stock').map((stock) => readStock(stock, locate)),
    packQuantity: childText(detail, 'PackQuantity'),
    palletQuantity: childText(detail, 'PalletQuantity'),
    orderQuantityMinimums: statedValues(detail, 'OrderQuantityMinimum', locate),
    orderQuantityMultiple: childText(detail, 'OrderQuantityMultiple'),
    unpricedItemType: childText(detail, 'UnpricedItemType'),
    prices: children(detail, 'Price').map((price) => readPrice(price, defaults, locate)),
    reissue: reissue === undefined ? null : readReissue(reissue, defaults, locate),
  };
};

const readProductSupply = (supply: Occurrence, defaults: HeaderDefaults, locate: Locate): OnixProductSupplyFact => {
  const [marketPublishing] = children(supply, 'MarketPublishingDetail');

  return {
    ...locate(supply.path),
    marketReference: childText(supply, 'MarketReference'),
    markets: children(supply, 'Market').map((market) => readMarket(market, locate)),
    marketPublishing: marketPublishing === undefined ? null : readMarketPublishing(marketPublishing, locate),
    supplyDetails: children(supply, 'SupplyDetail').map((detail) => readSupplyDetail(detail, defaults, locate)),
  };
};

/**
 * The child elements the pinned ONIX 3.0 and 3.1 Reference schemas give each ProductSupply composite, by its name. An
 * element named here as a child but not as a key holds only text.
 */
const SUPPLY_CONTENT: ReadonlyMap<string, ReadonlySet<string>> = new Map(
  Object.entries({
    ProductSupply: ['MarketReference', 'Market', 'MarketPublishingDetail', 'SupplyDetail'],
    Market: ['Territory', 'SalesRestriction'],
    Territory: ['CountriesIncluded', 'RegionsIncluded', 'CountriesExcluded', 'RegionsExcluded'],
    SalesRestriction: ['SalesRestrictionType', 'SalesOutlet', 'SalesRestrictionNote', 'StartDate', 'EndDate'],
    SalesOutlet: ['SalesOutletIdentifier', 'SalesOutletName'],
    SalesOutletIdentifier: ['SalesOutletIDType', 'IDTypeName', 'IDValue'],
    MarketPublishingDetail: [
      'PublisherRepresentative',
      'ProductContact',
      'MarketPublishingStatus',
      'MarketPublishingStatusNote',
      'MarketDate',
      'PromotionCampaign',
      'PromotionContact',
      'InitialPrintRun',
      'ReprintDetail',
      'CopiesSold',
      'BookClubAdoption',
    ],
    PublisherRepresentative: [
      'AgentRole',
      'AgentIdentifier',
      'AgentName',
      'TelephoneNumber',
      'FaxNumber',
      'EmailAddress',
      'Website',
    ],
    AgentIdentifier: ['AgentIDType', 'IDTypeName', 'IDValue'],
    Website: ['WebsiteRole', 'WebsiteDescription', 'WebsiteLink'],
    ProductContact: [
      'ProductContactRole',
      'ProductContactIdentifier',
      'ProductContactName',
      'ContactName',
      'TelephoneNumber',
      'FaxNumber',
      'EmailAddress',
      ...ADDRESS_ELEMENTS,
    ],
    ProductContactIdentifier: ['ProductContactIDType', 'IDTypeName', 'IDValue'],
    MarketDate: ['MarketDateRole', 'DateFormat', 'Date'],
    SupplyDetail: [
      'Supplier',
      'SupplyContact',
      'SupplierOwnCoding',
      'ReturnsConditions',
      'ProductAvailability',
      'SupplyDate',
      'OrderTime',
      'NewSupplier',
      'Stock',
      'PackQuantity',
      'PalletQuantity',
      'OrderQuantityMinimum',
      'OrderQuantityMultiple',
      'UnpricedItemType',
      'Price',
      'Reissue',
    ],
    Supplier: [
      'SupplierRole',
      'SupplierIdentifier',
      'SupplierName',
      'TelephoneNumber',
      'FaxNumber',
      'EmailAddress',
      'Website',
    ],
    SupplierIdentifier: ['SupplierIDType', 'IDTypeName', 'IDValue'],
    SupplyContact: [
      'SupplyContactRole',
      'SupplyContactIdentifier',
      'SupplyContactName',
      'ContactName',
      'TelephoneNumber',
      'FaxNumber',
      'EmailAddress',
      ...ADDRESS_ELEMENTS,
    ],
    SupplyContactIdentifier: ['SupplyContactIDType', 'IDTypeName', 'IDValue'],
    SupplierOwnCoding: ['SupplierCodeType', 'SupplierCodeTypeName', 'SupplierCodeValue'],
    ReturnsConditions: ['ReturnsCodeType', 'ReturnsCodeTypeName', 'ReturnsCode', 'ReturnsNote'],
    SupplyDate: ['SupplyDateRole', 'DateFormat', 'Date'],
    NewSupplier: ['SupplierIdentifier', 'SupplierName', 'TelephoneNumber', 'FaxNumber', 'EmailAddress', 'Website'],
    Stock: [
      'LocationIdentifier',
      'LocationName',
      'StockQuantityCoded',
      'OnHand',
      'Proximity',
      'Reserved',
      'OnOrder',
      'CBO',
      'OnOrderDetail',
      'Velocity',
    ],
    LocationIdentifier: ['LocationIDType', 'IDTypeName', 'IDValue'],
    StockQuantityCoded: ['StockQuantityCodeType', 'StockQuantityCodeTypeName', 'StockQuantityCode'],
    OnOrderDetail: ['OnOrder', 'Proximity', 'ExpectedDate'],
    Velocity: ['VelocityMetric', 'Rate', 'Proximity'],
    Price: [
      'PriceIdentifier',
      'PriceType',
      'PriceQualifier',
      'EpubTechnicalProtection',
      'PriceConstraint',
      'EpubLicense',
      'PriceTypeDescription',
      'PricePer',
      'PriceCondition',
      'MinimumOrderQuantity',
      'BatchBonus',
      'DiscountCoded',
      'Discount',
      'PriceStatus',
      'PriceAmount',
      'PriceCoded',
      'Tax',
      'TaxExempt',
      'UnpricedItemType',
      'CurrencyCode',
      'Territory',
      'CurrencyZone',
      'ComparisonProductPrice',
      'PriceDate',
      'PrintedOnProduct',
      'PositionOnProduct',
    ],
    PriceIdentifier: ['PriceIDType', 'IDTypeName', 'IDValue'],
    PriceConstraint: ['PriceConstraintType', 'PriceConstraintStatus', 'PriceConstraintLimit'],
    PriceConstraintLimit: ['Quantity', 'PriceConstraintUnit'],
    PriceCondition: ['PriceConditionType', 'PriceConditionQuantity', 'ProductIdentifier'],
    PriceConditionQuantity: ['PriceConditionQuantityType', 'Quantity', 'QuantityUnit'],
    ProductIdentifier: ['ProductIDType', 'IDTypeName', 'IDValue'],
    BatchBonus: ['BatchQuantity', 'FreeQuantity'],
    DiscountCoded: ['DiscountCodeType', 'DiscountCodeTypeName', 'DiscountCode'],
    Discount: ['DiscountType', 'Quantity', 'ToQuantity', 'DiscountPercent', 'DiscountAmount'],
    PriceCoded: ['PriceCodeType', 'PriceCodeTypeName', 'PriceCode'],
    Tax: [
      'ProductIdentifier',
      'PricePartDescription',
      'TaxType',
      'TaxRateCode',
      'TaxRatePercent',
      'TaxableAmount',
      'TaxAmount',
    ],
    ComparisonProductPrice: ['ProductIdentifier', 'PriceType', 'PriceAmount', 'CurrencyCode'],
    PriceDate: ['PriceDateRole', 'DateFormat', 'Date'],
    Reissue: ['ReissueDate', 'ReissueDescription', 'Price', 'SupportingResource'],
  }).map(([name, content]) => [name, new Set(content)]),
);

/** Texts that may hold XHTML, whose child elements are that markup rather than content the schemas structure. */
const MARKUP_TEXTS: ReadonlySet<string> = new Set([
  'SalesRestrictionNote',
  'MarketPublishingStatusNote',
  'WebsiteDescription',
  'PromotionCampaign',
  'PromotionContact',
  'InitialPrintRun',
  'ReprintDetail',
  'CopiesSold',
  'BookClubAdoption',
  'ReissueDescription',
]);

/** Composites another reduction reads whole: rights terms (thoth-app#211) and supporting resources (#185). */
const OWNED_ELEMENTS: ReadonlySet<string> = new Set(['EpubLicense', 'SupportingResource']);

/**
 * Every element below a ProductSupply composite that the pinned schemas do not define there, in source order. A text
 * element's XHTML children and what another reduction owns are not looked into.
 */
const unexpectedIn = (
  occurrence: Occurrence,
  name: string,
): { readonly name: string; readonly occurrence: Occurrence }[] => {
  if (OWNED_ELEMENTS.has(name) || MARKUP_TEXTS.has(name)) return [];

  const content = SUPPLY_CONTENT.get(name);

  return childElements(occurrence).flatMap((child) =>
    content?.has(child.name) ? unexpectedIn(child.occurrence, child.name) : [child],
  );
};

const NOTHING: ReadonlySet<string> = new Set();

/** A canonical path as a record states it: relative to the Product record, or to the message for a Header default. */
const relativePath = (path: string, recordPath: string): string =>
  path.startsWith(`${recordPath}/`) ? path.slice(recordPath.length + 1) : path.replace(/^\/ONIXMessage\[1\]\//, '');

/** The element name a canonical path ends in. */
const elementOf = (path: string): string => /([^/[]+)\[\d+\]$/.exec(path)?.[1] ?? path;

/**
 * Every value an element states, for a disclosure: a text element's text, or each value below a composite as
 * `Element value`, in source order. What another reduction owns is named only.
 */
const valuesOf = (occurrence: Occurrence, name: string, except: ReadonlySet<string> = NOTHING): string => {
  if (childElements(occurrence).length === 0 || MARKUP_TEXTS.has(name)) return textOf(occurrence);

  const pairs = (node: Occurrence, nodeName: string, skip: ReadonlySet<string>): string[] =>
    OWNED_ELEMENTS.has(nodeName)
      ? [nodeName]
      : childElements(node)
          .filter(({ name: child }) => !skip.has(child))
          .flatMap(({ name: child, occurrence: inner }) =>
            childElements(inner).length === 0 || MARKUP_TEXTS.has(child)
              ? [`${child} ${textOf(inner)}`.trim()]
              : pairs(inner, child, NOTHING),
          );

  return pairs(occurrence, name, except).join(', ');
};

/** One fact Thoth does not record, as a disclosure names it: where the record states it, and every value it states. */
const describeFact = (occurrence: Occurrence, recordPath: string): string => {
  const where = relativePath(occurrence.path, recordPath);
  const values = valuesOf(occurrence, elementOf(occurrence.path));

  return values.length === 0 ? where : `${where}: ${values}`;
};

/* ------------------------------------------------------------------------------------------------ */
/* Findings                                                                                         */
/* ------------------------------------------------------------------------------------------------ */

type FindingInput = Omit<OnixCommercialFinding, 'key' | 'locations' | 'carrier' | 'resolution'> & {
  /** The carrier the finding applies to alone; any Publication of the Product when omitted. */
  readonly carrier?: OnixLocationCarrier | null;
  /** How a publisher answers it; nothing in the app does when omitted. */
  readonly resolution?: OnixCommercialResolution;
  /** Canonical paths of the facts the finding is about, in source order. */
  readonly paths: readonly string[];
  /** What tells this finding apart from another of the same code for the same Product. */
  readonly discriminator: string;
};

const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

const NO_RESOLUTION: OnixCommercialResolution = { kind: 'NONE' };

/** Raises each finding once per key; the key depends on the file alone, so it is stable across resolutions. */
class CommercialFindings {
  private readonly byKey = new Map<string, OnixCommercialFinding>();

  constructor(private readonly locate: Locate) {}

  add({
    paths,
    discriminator,
    carrier = null,
    resolution = NO_RESOLUTION,
    ...input
  }: FindingInput): OnixCommercialFinding {
    const key = ['COMMERCIAL', input.code, input.productKey, discriminator].join('|');
    const existing = this.byKey.get(key);

    if (existing) return existing;

    const finding: OnixCommercialFinding = {
      key,
      ...input,
      carrier,
      resolution,
      locations: unique(paths).map(this.locate),
    };

    this.byKey.set(key, finding);

    return finding;
  }

  all(): OnixCommercialFinding[] {
    return [...this.byKey.values()];
  }
}

/* ------------------------------------------------------------------------------------------------ */
/* Price reduction (rules 19-37)                                                                    */
/* ------------------------------------------------------------------------------------------------ */

/** The currencies Thoth's Price can hold (rule 22). */
const TARGET_CURRENCIES: ReadonlySet<string> = new Set(Object.values(CurrencyCode));

/** List 58 ordinary consumer retail prices: RRP, fixed retail price and publisher retail price on agency terms (rule 23). */
const CONSUMER_RETAIL_PRICE_TYPES: ReadonlySet<string> = new Set(['01', '02', '03', '04', '41', '42']);

/** An xs:decimal as ONIX states a PriceAmount: digits with an optional fraction, and nothing else. */
const DECIMAL = /^\+?(?:\d+(?:\.\d*)?|\.\d+)$/;

/** The positive amount a PriceAmount states, or null: an absent or unusable amount is never zero (rule 21). */
const positiveAmount = (amount: string | null): number | null => {
  if (amount === null || !DECIMAL.test(amount)) return null;

  const value = Number(amount);

  return Number.isFinite(value) && value > 0 ? value : null;
};

type ProductScope = {
  readonly productKey: string;
  readonly groupKey: string;
  readonly describe: string;
  readonly findings: CommercialFindings;
};

/** One Price with the ProductSupply it is stated in, whose market scope is part of what it means. */
type PriceInSupply = {
  readonly fact: OnixPriceFact;
  readonly supply: OnixProductSupplyFact;
  /** Every fact the Price and its Markets state that an amount and a currency cannot keep, with its values. */
  readonly lostFacts: readonly string[];
  /** Where the record states the Price, and every value it states beside its amount and currency. */
  readonly stated: { readonly where: string; readonly values: string };
};

/**
 * What one Price can be for its Publication: an ordinary retail amount the reduction may take (rules 23, 27), an amount
 * only the publisher may take (rules 24-25, 32), or a coded price, which states no amount at all.
 */
type AssessedPrice =
  | (PriceInSupply & { readonly kind: 'AUTOMATIC'; readonly currency: string; readonly amount: number })
  | (PriceInSupply & {
      readonly kind: 'NOT_AUTOMATIC';
      readonly currency: string;
      readonly amount: number;
      readonly exclusions: readonly OnixPriceExclusion[];
    })
  | (PriceInSupply & {
      readonly kind: 'CODED';
      readonly currency: string | null;
      readonly exclusions: readonly OnixPriceExclusion[];
    });

type AmountPrice = Exclude<AssessedPrice, { readonly kind: 'CODED' }>;

/**
 * Why a Price is never reduced to a generic target price automatically (rules 23-25): a type that is not ordinary consumer
 * retail, or one it neither states nor inherits; a qualifier, a non-copy unit, a provisional status, a condition, an order
 * quantity, a constraint or rights terms of its own; or a coded price with no amount. A code whose own definition is the
 * absence of that semantic - PriceQualifier 00 "Unqualified price", PricePer 00 "Per copy of whole product",
 * PriceCondition 00 "No conditions", PriceStatus 00 or 02, a minimum order of one - excludes nothing.
 */
const exclusionsOf = (fact: OnixPriceFact): OnixPriceExclusion[] => {
  const type = fact.type.value;
  const exclusions: (OnixPriceExclusion | null)[] = [
    type === null ? 'TYPE_ABSENT' : CONSUMER_RETAIL_PRICE_TYPES.has(type) ? null : 'TYPE_NOT_CONSUMER_RETAIL',
    fact.qualifier !== null && fact.qualifier !== '00' ? 'QUALIFIED' : null,
    fact.per !== null && fact.per !== '00' ? 'PER_UNIT' : null,
    fact.status === '01' ? 'PROVISIONAL' : null,
    fact.conditions.some((condition) => condition.type !== '00') ? 'CONDITIONAL' : null,
    (fact.minimumOrderQuantity !== null && Number(fact.minimumOrderQuantity) !== 1) || fact.batchBonuses.length > 0
      ? 'QUANTITY_CONDITION'
      : null,
    fact.constraints.length > 0 ? 'CONSTRAINED' : null,
    fact.rightsTerms.length > 0 ? 'OWN_RIGHTS_TERMS' : null,
    fact.coded !== null ? 'CODED' : null,
  ];

  return exclusions.filter((exclusion): exclusion is OnixPriceExclusion => exclusion !== null);
};

const EXCLUSION_REASONS: Readonly<Record<OnixPriceExclusion, (fact: OnixPriceFact) => string>> = {
  TYPE_ABSENT: () => 'no PriceType is stated or defaulted',
  TYPE_NOT_CONSUMER_RETAIL: ({ type }) =>
    `PriceType ${type.value} is not a recommended, fixed or publisher retail price to consumers`,
  QUALIFIED: ({ qualifier }) => `it carries PriceQualifier ${qualifier}`,
  PER_UNIT: ({ per }) => `it is priced per unit (PricePer ${per})`,
  PROVISIONAL: () => 'its PriceStatus is provisional',
  CONDITIONAL: ({ conditions }) =>
    `it carries PriceCondition ${unique(conditions.map(({ type }) => type).filter((type) => type !== '00')).join(', ')}`,
  QUANTITY_CONDITION: () => 'it depends on an order quantity',
  CONSTRAINED: () => 'it carries a PriceConstraint',
  OWN_RIGHTS_TERMS: () => 'it carries technical protection or licence terms of its own',
  CODED: () => 'it is a coded price with no amount',
};

/**
 * What one Price is for the target. An unpriced reason is disclosed where it is read; an amount or a currency no Price can
 * have blocks as a shape canonical validation should already have refused, and is never repaired into zero (rules 21-22).
 * Everything else is a price: one taken automatically, or one only the publisher may take or decline (rules 24-25, 32).
 */
const assessPrice = (scope: ProductScope, priced: PriceInSupply): AssessedPrice | null => {
  const { fact } = priced;
  const base = { productKey: scope.productKey, groupKey: scope.groupKey };
  const exclusions = exclusionsOf(fact);

  if (fact.unpricedItemType !== null) return null;

  if (fact.amount === null && fact.coded !== null) {
    return { ...priced, kind: 'CODED', currency: fact.currency.value, exclusions };
  }

  const amount = positiveAmount(fact.amount);

  if (amount === null) {
    scope.findings.add({
      ...base,
      code: 'PRICE_AMOUNT_UNUSABLE',
      classification: 'PREFLIGHT_GAP',
      blocking: true,
      paths: [fact.path],
      discriminator: fact.path,
      detail: { amount: fact.amount ?? '' },
      message:
        `${scope.describe} states a price ${fact.amount === null ? 'with no amount' : `with the amount "${fact.amount}"`}, ` +
        'which is not a positive decimal amount; it is never read as zero or as any other amount, and a validated file should not carry it',
    });

    return null;
  }

  const currency = fact.currency.value;

  if (currency === null) {
    scope.findings.add({
      ...base,
      code: 'PRICE_CURRENCY_ABSENT',
      classification: 'PREFLIGHT_GAP',
      blocking: true,
      paths: [fact.path],
      discriminator: fact.path,
      detail: { amount: fact.amount ?? '' },
      message: `${scope.describe} states a price of ${fact.amount} in no currency, and the Header gives no default currency; it is not taken in any currency, and a validated file should not carry it`,
    });

    return null;
  }

  if (!TARGET_CURRENCIES.has(currency)) {
    scope.findings.add({
      ...base,
      code: 'PRICE_CURRENCY_UNSUPPORTED',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      paths: [fact.currency.location?.path ?? fact.path],
      discriminator: fact.path,
      detail: { currency, amount: fact.amount ?? '' },
      message: `${scope.describe} states a price of ${currency} ${fact.amount}, and Thoth holds no price in ${currency}; it is not recorded, and no other amount or currency stands in for it`,
    });

    return null;
  }

  return exclusions.length > 0
    ? { ...priced, kind: 'NOT_AUTOMATIC', currency, amount, exclusions }
    : { ...priced, kind: 'AUTOMATIC', currency, amount };
};

/**
 * The Price semantics a reduced amount leaves behind, in one fixed order (rules 26, 30-31): Thoth's Price holds an amount
 * and a currency and nothing of its type, tax basis, territory, market, effective dates or trade terms.
 */
const LOST_PRICE_SEMANTICS = [
  'PriceType',
  'PriceQualifier',
  'PricePer',
  'PriceCondition',
  'MinimumOrderQuantity',
  'PriceStatus',
  'Tax',
  'TaxExempt',
  'Territory',
  'CurrencyZone',
  'Market',
  'PriceDate',
  'PriceIdentifier',
  'PriceTypeDescription',
  'Discount',
  'DiscountCoded',
  'PrintedOnProduct',
  'PositionOnProduct',
] as const;

/** The semantics one eligible Price states that its reduced amount cannot keep. */
const lostSemanticsOf = ({ fact, supply }: PriceInSupply): Set<string> => {
  const stated = new Set<string>([
    ...(fact.type.value === null ? [] : ['PriceType']),
    ...(fact.qualifier === null ? [] : ['PriceQualifier']),
    ...(fact.per === null ? [] : ['PricePer']),
    ...(fact.conditions.length === 0 ? [] : ['PriceCondition']),
    ...(fact.minimumOrderQuantity === null ? [] : ['MinimumOrderQuantity']),
    ...(fact.status === null ? [] : ['PriceStatus']),
    ...(fact.territory === null ? [] : ['Territory']),
    ...(fact.currencyZone === null ? [] : ['CurrencyZone']),
    ...(supply.markets.length === 0 ? [] : ['Market']),
    ...(fact.dates.length === 0 ? [] : ['PriceDate']),
    ...(fact.identifiers.length === 0 ? [] : ['PriceIdentifier']),
    ...(fact.typeDescriptions.length === 0 ? [] : ['PriceTypeDescription']),
    ...(fact.taxes.length === 0 ? [] : ['Tax']),
    ...(fact.taxExempt === null ? [] : ['TaxExempt']),
    ...(fact.discountsCoded.length === 0 ? [] : ['DiscountCoded']),
    ...(fact.discounts.length === 0 ? [] : ['Discount']),
    ...(fact.printedOnProduct === null ? [] : ['PrintedOnProduct']),
    ...(fact.positionOnProduct === null ? [] : ['PositionOnProduct']),
  ]);

  return stated;
};

const listed = (names: readonly string[]) =>
  names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

/** List 57, whose reasons are materially different and are never read as one another or as a price (rule 34). */
const UNPRICED_ITEM_TYPES: Readonly<Record<string, string>> = {
  '01': 'Free of charge',
  '02': 'Price to be announced',
  '03': 'Not sold separately',
  '04': 'Contact supplier',
  '05': 'Not sold as set',
  '06': 'Revenue share',
  '07': 'Calculated from contents',
  '08': 'Supplier does not supply',
};

/**
 * An unpriced reason, wherever it is stated: never a Price, never zero, and nothing more than the reason it gives
 * (amendment 5713644155; rules 33-35). Thoth records an unpriced Publication as one with no Price, so the reason itself
 * is an explicitly approved, non-blocking loss.
 */
const discloseUnpriced = (scope: ProductScope, reason: string, path: string, currency: string | null) => {
  const label = UNPRICED_ITEM_TYPES[reason] ?? `code ${reason}`;

  scope.findings.add({
    productKey: scope.productKey,
    groupKey: scope.groupKey,
    code: 'PRICE_UNPRICED',
    classification: 'TARGET_UNREPRESENTABLE',
    blocking: false,
    paths: [path],
    discriminator: path,
    detail: { reason, label, ...(currency === null ? {} : { currency }) },
    message:
      `${scope.describe} is stated unpriced${currency === null ? '' : ` in ${currency}`} (UnpricedItemType ${reason}, ${label}); ` +
      'Thoth holds an unpriced Publication as one with no Price, so no Price is created for it, the reason is not recorded, and nothing more is read into it',
  });
};

/** Another Product's price, given for comparison: never this Publication's price (amendment 5713644155, rule 7). */
const discloseComparisons = (scope: ProductScope, fact: OnixPriceFact) => {
  if (fact.comparisons.length === 0) return;

  const comparisons = fact.comparisons.map(
    ({ currency, amount, productIdentifiers }) =>
      `${[currency, amount].filter((part) => part !== null).join(' ')} (${unique(productIdentifiers.map(({ value }) => value)).join(', ')})`,
  );

  scope.findings.add({
    productKey: scope.productKey,
    groupKey: scope.groupKey,
    code: 'PRICE_COMPARISON_NOT_REPRESENTED',
    classification: 'TARGET_UNREPRESENTABLE',
    blocking: false,
    paths: fact.comparisons.map(({ path }) => path),
    discriminator: fact.path,
    detail: { comparisons },
    message: `${scope.describe} gives the prices of other products for comparison (ComparisonProductPrice: ${comparisons.join('; ')}); they are not this Publication's prices and are not recorded`,
  });
};

/** Every exclusion, in the one order findings name them. */
const EXCLUSION_ORDER = Object.keys(EXCLUSION_REASONS) as OnixPriceExclusion[];

const locationOf = ({ path, sourcePath }: OnixSourceLocation): OnixSourceLocation => ({ path, sourcePath });

/** Why a price is never taken automatically, in words. */
const reasonsOf = (price: Exclude<AssessedPrice, { readonly kind: 'AUTOMATIC' }>): string =>
  price.exclusions.map((exclusion) => EXCLUSION_REASONS[exclusion](price.fact)).join('; ');

/** One source price as a candidate a publisher may choose, with everything choosing it would not record. */
const candidateOf = (price: AmountPrice): OnixPriceCandidate => {
  const stated = lostSemanticsOf(price);

  return {
    ...locationOf(price.fact),
    key: price.fact.path,
    currencyCode: price.currency,
    amount: price.fact.amount as string,
    unitPrice: price.amount,
    priceType: price.fact.type.value,
    exclusions: price.kind === 'NOT_AUTOMATIC' ? price.exclusions : [],
    lost: LOST_PRICE_SEMANTICS.filter((name) => stated.has(name)),
    lostFacts: price.lostFacts,
    label:
      `${price.currency} ${price.fact.amount} - ${price.stated.where}` +
      (price.stated.values.length === 0 ? '' : ` (${price.stated.values})`),
  };
};

/** What choosing any of these candidates leaves behind, as the decision explains it (rules 26, 30). */
const choiceConsequence = (candidates: readonly OnixPriceCandidate[], currencyCode: string): string =>
  `Choose the price whose amount the Publication's ${currencyCode} Price takes - what the file also says about that price is not recorded` +
  (candidates.some(({ lost }) => lost.includes('PriceDate')) ? ', and no schedule of prices is kept' : '') +
  ` - or choose to create no ${currencyCode} price`;

/** One ordinary retail amount the file's retail prices in a currency agree on: the Publication's Price in it (rules 27-28). */
const reduceAgreed = (
  scope: ProductScope,
  currencyCode: string,
  automatic: readonly AmountPrice[],
  amount: number,
): OnixPriceDecision => {
  const stated = new Set(automatic.flatMap((price) => [...lostSemanticsOf(price)]));
  const lost = LOST_PRICE_SEMANTICS.filter((name) => stated.has(name));
  const locations = automatic.map(({ fact }) => locationOf(fact));
  const finding = scope.findings.add({
    productKey: scope.productKey,
    groupKey: scope.groupKey,
    code: 'PRICE_REDUCED',
    classification: 'SUPPORTED_WITH_WARNING',
    blocking: false,
    paths: locations.map(({ path }) => path),
    discriminator: currencyCode,
    detail: {
      currency: currencyCode,
      amount: String(amount),
      priceTypes: unique(automatic.map(({ fact }) => fact.type.value as string)).sort(),
      lost,
      lostFacts: unique(automatic.flatMap(({ lostFacts }) => lostFacts)),
      sources: automatic.length,
    },
    // One amount stated in several supply contexts is one Price; every context it collapses stays named (rule 28).
    message:
      `${scope.describe} is priced ${currencyCode} ${amount}` +
      (automatic.length > 1 ? `, which ${automatic.length} source prices state alike` : '') +
      `; Thoth's price holds only an amount and a currency, so what the file also states about it (${listed(lost)}) is not recorded`,
  });

  return { kind: 'SET', currencyCode, unitPrice: amount, locations, findingKey: finding.key };
};

/**
 * A price never taken automatically, beside the one ordinary retail amount its currency's Price is taken from (rule 27):
 * kept as a source fact and named as not taken, since that Price already holds the one amount Thoth has room for.
 */
const discloseNotTaken = (
  scope: ProductScope,
  price: Exclude<AssessedPrice, { readonly kind: 'AUTOMATIC' }>,
  currencyCode: string,
) =>
  scope.findings.add({
    productKey: scope.productKey,
    groupKey: scope.groupKey,
    code: 'PRICE_CANDIDATE_NOT_TAKEN',
    classification: 'TARGET_UNREPRESENTABLE',
    blocking: false,
    paths: [price.fact.path],
    discriminator: price.fact.path,
    detail: { currency: currencyCode, amount: price.fact.amount ?? '', exclusions: price.exclusions },
    message:
      `${scope.describe} states a price${price.fact.amount === null ? '' : ` of ${currencyCode} ${price.fact.amount}`} that Thoth never takes as its price automatically (${reasonsOf(price)}), ` +
      `beside the ordinary retail price its ${currencyCode} Price is taken from; it is kept as a source fact and is not recorded`,
  });

/**
 * Retail prices stating different amounts in one currency: no winner is taken by supplier, market, date, type or order
 * (rules 29-30). Every price the currency states is a candidate, and the publisher chooses one amount, or none.
 */
const chooseAmongConflicting = (
  scope: ProductScope,
  currencyCode: string,
  prices: readonly AmountPrice[],
  amounts: readonly number[],
): OnixPriceDecision => {
  const candidates = prices.map(candidateOf);
  const locations = candidates.map(locationOf);
  const finding = scope.findings.add({
    productKey: scope.productKey,
    groupKey: scope.groupKey,
    code: 'PRICE_AMOUNT_CONFLICT',
    classification: 'TARGET_UNREPRESENTABLE',
    blocking: true,
    paths: locations.map(({ path }) => path),
    discriminator: currencyCode,
    detail: { currency: currencyCode, amounts: amounts.map(String), candidates: candidates.map(({ label }) => label) },
    resolution: { kind: 'PRICE_CHOICE', currencyCode, candidates },
    message:
      `${scope.describe} states ${amounts.length} different ${currencyCode} prices (${amounts.join(', ')}), and Thoth holds one price per currency for a Publication; none of them is chosen for it by supplier, market, date or file order. ` +
      choiceConsequence(candidates, currencyCode),
  });

  return {
    kind: 'CHOICE_REQUIRED',
    reason: 'AMOUNT_CONFLICT',
    currencyCode,
    candidates,
    locations,
    findingKey: finding.key,
  };
};

/**
 * Prices in a currency that Thoth never takes automatically, and no ordinary retail price beside them (rules 24-25, 32):
 * never taken, and never dropped, for the publisher, who chooses one amount or none.
 */
const chooseAmongNotAutomatic = (
  scope: ProductScope,
  currencyCode: string,
  prices: readonly Extract<AssessedPrice, { readonly kind: 'NOT_AUTOMATIC' }>[],
): OnixPriceDecision => {
  const candidates = prices.map(candidateOf);
  const locations = candidates.map(locationOf);
  const finding = scope.findings.add({
    productKey: scope.productKey,
    groupKey: scope.groupKey,
    code: 'PRICE_NOT_AUTOMATIC',
    classification: 'TARGET_INPUT_REQUIRED',
    blocking: true,
    paths: locations.map(({ path }) => path),
    discriminator: currencyCode,
    detail: {
      currency: currencyCode,
      exclusions: EXCLUSION_ORDER.filter((exclusion) => prices.some((price) => price.exclusions.includes(exclusion))),
      candidates: candidates.map(({ label }) => label),
    },
    resolution: { kind: 'PRICE_CHOICE', currencyCode, candidates },
    message:
      `${scope.describe} states ${prices.length === 1 ? `a ${currencyCode} price` : `${prices.length} ${currencyCode} prices`} that Thoth never takes as its price by itself ` +
      `(${prices.map((price) => `${currencyCode} ${price.fact.amount}: ${reasonsOf(price)}`).join('; ')}). ` +
      choiceConsequence(candidates, currencyCode),
  });

  return {
    kind: 'CHOICE_REQUIRED',
    reason: 'NOT_AUTOMATIC',
    currencyCode,
    candidates,
    locations,
    findingKey: finding.key,
  };
};

/** A coded price states no amount to take (rule 32): the publisher can only decline it, and it is never declined for them. */
const declineCoded = (
  scope: ProductScope,
  price: Extract<AssessedPrice, { readonly kind: 'CODED' }>,
): OnixPriceDecision => {
  const finding = scope.findings.add({
    productKey: scope.productKey,
    groupKey: scope.groupKey,
    code: 'PRICE_NOT_AUTOMATIC',
    classification: 'TARGET_INPUT_REQUIRED',
    blocking: true,
    paths: [price.fact.path],
    discriminator: `coded|${price.fact.path}`,
    detail: { currency: price.currency ?? '', exclusions: price.exclusions, coded: price.stated.values },
    resolution: { kind: 'PRICE_CHOICE', currencyCode: price.currency, candidates: [] },
    message: `${scope.describe} states a coded price with no amount (${price.stated.values}), which Thoth cannot hold as a price; choose to create no price from it`,
  });

  return {
    kind: 'CHOICE_REQUIRED',
    reason: 'NOT_AUTOMATIC',
    currencyCode: price.currency,
    candidates: [],
    locations: [locationOf(price.fact)],
    findingKey: finding.key,
  };
};

/**
 * What the prices a Product states come to, currency by currency: the one amount its ordinary retail prices agree on, or a
 * decision the publisher takes; then a decision for each coded price in a currency no retail price settles.
 */
const decidePrices = (scope: ProductScope, prices: readonly PriceInSupply[]): OnixPriceDecision[] => {
  const assessed = prices.flatMap((price) => assessPrice(scope, price) ?? []);
  const amounts = assessed.filter((price): price is AmountPrice => price.kind !== 'CODED');
  const settled = new Set<string>();
  const decisions = unique(amounts.map(({ currency }) => currency))
    .sort()
    .map((currencyCode): OnixPriceDecision => {
      const inCurrency = amounts.filter(({ currency }) => currency === currencyCode);
      const automatic = inCurrency.filter(({ kind }) => kind === 'AUTOMATIC');
      const notAutomatic = inCurrency.filter(
        (price): price is Extract<AssessedPrice, { readonly kind: 'NOT_AUTOMATIC' }> => price.kind === 'NOT_AUTOMATIC',
      );
      const agreed = unique(automatic.map(({ amount }) => amount)).sort((a, b) => a - b);

      if (automatic.length === 0) return chooseAmongNotAutomatic(scope, currencyCode, notAutomatic);

      if (agreed.length > 1) return chooseAmongConflicting(scope, currencyCode, inCurrency, agreed);

      const decision = reduceAgreed(scope, currencyCode, automatic, agreed[0]);

      settled.add(currencyCode);
      notAutomatic.forEach((price) => discloseNotTaken(scope, price, currencyCode));

      return decision;
    });
  const coded = assessed
    .filter((price): price is Extract<AssessedPrice, { readonly kind: 'CODED' }> => price.kind === 'CODED')
    .flatMap((price) => {
      if (price.currency !== null && settled.has(price.currency)) {
        discloseNotTaken(scope, price, price.currency);

        return [];
      }

      return [declineCoded(scope, price)];
    });

  return [...decisions, ...coded];
};

/* ------------------------------------------------------------------------------------------------ */
/* Supply facts Thoth has no field for (rules 9-17)                                                 */
/* ------------------------------------------------------------------------------------------------ */

/**
 * The facts one ProductSupply states that no Thoth field holds, each as the unit a disclosure names: a MarketReference,
 * each child of a Market or a MarketPublishingDetail, and each child of a SupplyDetail but its prices and unpriced
 * reason, which the price reduction discloses. An element the schemas do not define is disclosed as unexpected instead.
 */
const lostSupplyFactsOf = (supply: Occurrence): Occurrence[] =>
  childElements(supply).flatMap(({ name, occurrence }) => {
    const known = SUPPLY_CONTENT.get(name);
    const within = (except: ReadonlySet<string>) =>
      childElements(occurrence)
        .filter((child) => known?.has(child.name) && !except.has(child.name))
        .map((child) => child.occurrence);

    if (name === 'MarketReference') return [occurrence];
    if (name === 'Market' || name === 'MarketPublishingDetail') return within(new Set());
    if (name === 'SupplyDetail') return within(PRICE_ELEMENTS_OF_SUPPLY);

    return [];
  });

/** What a Price states as its amount and currency, which a candidate names on their own. */
const AMOUNT_ELEMENTS: ReadonlySet<string> = new Set(['PriceAmount', 'CurrencyCode']);

/** What a SupplyDetail states about its price, which the price reduction reads and discloses. */
const PRICE_ELEMENTS_OF_SUPPLY: ReadonlySet<string> = new Set(['Price', 'UnpricedItemType']);

/** Every fact one Price and its ProductSupply's Markets state that an amount and a currency cannot keep, with its values. */
const lostPriceFactsOf = (price: Occurrence, supply: Occurrence, fact: OnixPriceFact, recordPath: string): string[] => {
  const lostHere: ReadonlySet<string> = new Set(LOST_PRICE_SEMANTICS);
  const inheritedType = fact.type.origin === 'HEADER_DEFAULT' ? fact.type.location : null;

  return [
    ...childElements(price)
      .filter(({ name }) => lostHere.has(name))
      .map(({ occurrence }) => describeFact(occurrence, recordPath)),
    ...(inheritedType === null ? [] : [`${relativePath(inheritedType.path, recordPath)}: ${fact.type.value}`]),
    ...children(supply, 'Market').flatMap((market) =>
      childElements(market).map(({ occurrence }) => describeFact(occurrence, recordPath)),
    ),
  ];
};

/**
 * Every supply fact a Product states that no Thoth field holds - market geography and restrictions, market publishing,
 * the supplier, its availability, supply dates and operational data - disclosed once for the Product and blocking
 * nothing (rule 17). Availability and supply dates are supply evidence only: they never decide, or overwrite, the Work's
 * lifecycle (rules 11-14).
 */
const discloseSupply = (
  scope: ProductScope,
  supplies: readonly OnixProductSupplyFact[],
  supplyOccurrences: readonly Occurrence[],
  recordPath: string,
) => {
  const lost = supplyOccurrences.flatMap(lostSupplyFactsOf);

  if (lost.length === 0) return;

  const details = supplies.flatMap(({ supplyDetails }) => supplyDetails);
  const availability = unique(details.flatMap(({ availability: code }) => (code === null ? [] : [code])));
  const marketPublishingStatus = unique(
    supplies.flatMap(({ marketPublishing }) => (marketPublishing?.status == null ? [] : [marketPublishing.status])),
  );
  const elements = unique(lost.map(({ path }) => elementOf(path)));

  scope.findings.add({
    productKey: scope.productKey,
    groupKey: scope.groupKey,
    code: 'SUPPLY_NOT_REPRESENTED',
    classification: 'TARGET_UNREPRESENTABLE',
    blocking: false,
    paths: lost.map(({ path }) => path),
    discriminator: 'supply',
    detail: {
      elements,
      // Every lost fact with every value it states, in source order, as each location names it: a later diagnostic
      // needs nothing but the reduction to say what is not recorded.
      facts: lost.map((occurrence) => describeFact(occurrence, recordPath)),
      ...(availability.length === 0 ? {} : { availability }),
      ...(marketPublishingStatus.length === 0 ? {} : { marketPublishingStatus }),
    },
    message: `${scope.describe} states supply facts Thoth has no field for (${listed(elements)}), so they are not recorded; a supplier's availability or supply dates are never read as the Work's publishing status or dates`,
  });
};

/**
 * Elements a ProductSupply holds that the pinned ONIX schemas do not define there: never read, and never passed over
 * silently. A validated file cannot carry them, so they block as a preflight gap rather than as anything the file says.
 */
const holdUnexpected = (
  scope: ProductScope,
  unexpected: readonly { readonly name: string; readonly occurrence: Occurrence }[],
) => {
  if (unexpected.length === 0) return;

  const elements = unexpected.map(({ name }) => name);

  scope.findings.add({
    productKey: scope.productKey,
    groupKey: scope.groupKey,
    code: 'SUPPLY_SHAPE_UNEXPECTED',
    classification: 'PREFLIGHT_GAP',
    blocking: true,
    paths: unexpected.map(({ occurrence }) => occurrence.path),
    discriminator: 'shape',
    detail: { elements },
    message: `${scope.describe} states elements in its ProductSupply that the ONIX schemas do not define there (${listed(unique(elements))}); nothing is read from them, and a validated file should not carry them`,
  });
};

/* ------------------------------------------------------------------------------------------------ */
/* Publication Locations (rules 38-63)                                                              */
/* ------------------------------------------------------------------------------------------------ */

/** List 73 roles naming the web page of the specified work: the publisher's (02) and a supplier's (36-38), rule 41. */
const LANDING_PAGE_ROLES: ReadonlySet<string> = new Set(['02', '36', '37', '38']);
/** List 73 29, "Web page for full content" (rule 40). */
const FULL_TEXT_ROLE = '29';
/** List 73 02, "Publisher's website for a specified work" (rule 46). */
const PUBLISHER_WORK_WEBSITE_ROLE = '02';

type WebsiteLink = OnixSupplierWebsiteFact['links'][number];

/** What one supply context's Supplier websites state about a Location. */
type ContextLocation =
  | { readonly kind: 'CANDIDATE'; readonly candidate: OnixLocationCandidate }
  /** Several distinct landing pages or full text URLs: which pairs with which cannot be told. */
  | {
      readonly kind: 'AMBIGUOUS';
      readonly landingPages: readonly string[];
      readonly fullTextUrls: readonly string[];
      readonly links: readonly WebsiteLink[];
    };

/** The URL shape Thoth's location check accepts for a landing page or a full text URL (thoth-api `location` checks). */
const TARGET_URL = /^[^:]*:\/\/(?:[^/:]*:[^/@]*@)?(?:[^/:.]*\.)+([^:/]+)/i;

/** A link of a Location role that Thoth's location check refuses. */
type UnstorableLink = WebsiteLink & { readonly role: string };

/**
 * The Location one SupplyDetail's Supplier websites state, if any, and the links of a Location role Thoth could not
 * store. Landing page and full text URL pair only inside one supply context (rule 43): a candidate never takes a URL from
 * another supplier, market or the publisher. A context stating several distinct URLs for either half pairs nothing,
 * since no order may say which goes with which.
 */
const contextLocation = (
  detail: OnixSupplyDetailFact,
): { readonly location: ContextLocation | null; readonly unstorable: readonly UnstorableLink[] } => {
  const unstorable: UnstorableLink[] = [];
  const websites = (detail.supplier?.websites ?? []).map((website) => ({
    ...website,
    links: website.links.filter((link) => {
      const locationRole =
        website.role !== null && (LANDING_PAGE_ROLES.has(website.role) || website.role === FULL_TEXT_ROLE);

      if (!locationRole || TARGET_URL.test(link.link)) return true;

      unstorable.push({ ...link, role: website.role as string });

      return false;
    }),
  }));
  const landingLinks = websites
    .filter(({ role }) => role !== null && LANDING_PAGE_ROLES.has(role))
    .flatMap((website) => website.links);
  const fullTextLinks = websites.filter(({ role }) => role === FULL_TEXT_ROLE).flatMap((website) => website.links);
  const landingPages = unique(landingLinks.map(({ link }) => link));
  const fullTextUrls = unique(fullTextLinks.map(({ link }) => link));
  const links = websites
    .filter(({ role }) => role !== null && (LANDING_PAGE_ROLES.has(role) || role === FULL_TEXT_ROLE))
    .flatMap((website) => website.links);

  return { location: pairContext(websites, landingPages, fullTextUrls, links), unstorable };
};

const pairContext = (
  websites: readonly OnixSupplierWebsiteFact[],
  landingPages: readonly string[],
  fullTextUrls: readonly string[],
  links: readonly WebsiteLink[],
): ContextLocation | null => {
  if (landingPages.length === 0 && fullTextUrls.length === 0) return null;

  if (landingPages.length > 1 || fullTextUrls.length > 1)
    return { kind: 'AMBIGUOUS', landingPages, fullTextUrls, links };

  // A landing page the file itself types as the publisher's website for the work may be the publisher website platform
  // (rule 46). No other platform is inferred: not from a market, a supplier's name or role, or a URL's host (rules 45-49).
  const publisherWebsite = websites.some(
    ({ role, links: stated }) =>
      role === PUBLISHER_WORK_WEBSITE_ROLE && stated.some(({ link }) => link === landingPages[0]),
  );

  return {
    kind: 'CANDIDATE',
    candidate: {
      landingPage: landingPages[0] ?? '',
      fullTextUrl: fullTextUrls[0] ?? '',
      platform: publisherWebsite ? LocationPlatform.PublisherWebsite : LocationPlatform.Other,
      locations: links.map(({ path, sourcePath }) => ({ path, sourcePath })),
    },
  };
};

/** What a Publication of a type demands of its canonical Location: at least one URL for a physical book, both otherwise. */
export const locationCarrierOf = (type: PublicationType): OnixLocationCarrier =>
  isFullTextUrlAvailable(type) ? 'DIGITAL' : 'PHYSICAL';

/** The carriers a Product's Publication could have: those of every type its manifestation could still become. */
const carriersOf = (manifestation: OnixManifestationDecision): OnixLocationCarrier[] => {
  const types =
    manifestation.kind === 'RESOLVED'
      ? [manifestation.type]
      : manifestation.kind === 'INPUT_REQUIRED'
        ? manifestation.candidates
        : [];

  return unique(types.map(locationCarrierOf)).sort();
};

const completeFor = (carrier: OnixLocationCarrier, { landingPage, fullTextUrl }: OnixLocationCandidate): boolean =>
  carrier === 'DIGITAL'
    ? landingPage.length > 0 && fullTextUrl.length > 0
    : landingPage.length > 0 || fullTextUrl.length > 0;

/**
 * Every candidate that cannot be canonical could follow the canonical Location as a non-canonical one (rules 56, 60), but
 * Publication execution creates every Location at once, and the backend refuses a non-canonical Location that arrives
 * before the canonical one (rule 62): until Location execution is ordered, none is created, and each says so.
 */
const deferNonCanonical = (
  scope: ProductScope,
  carrier: OnixLocationCarrier,
  candidates: readonly OnixLocationCandidate[],
  canonical: readonly OnixLocationCandidate[],
  findingKeys: string[],
) =>
  candidates
    .filter((candidate) => !canonical.includes(candidate))
    .forEach((candidate) => {
      findingKeys.push(
        scope.findings.add({
          productKey: scope.productKey,
          groupKey: scope.groupKey,
          carrier,
          code: 'LOCATION_NOT_CANONICAL',
          classification: 'EXECUTION_DEFERRED',
          blocking: false,
          paths: candidate.locations.map(({ path }) => path),
          discriminator: `${carrier}|${candidate.locations.map(({ path }) => path).join(',')}`,
          detail: { landingPage: candidate.landingPage, fullTextUrl: candidate.fullTextUrl },
          message: `A further supplier location of ${scope.describe} (${candidate.landingPage || '-'} | ${candidate.fullTextUrl || '-'}) could only be a non-canonical location beside its canonical one, which this import cannot yet create in the order Thoth requires; it is not imported`,
        }).key,
      );
    });

/**
 * Which Location each carrier of the Product's Publication is created with. A digital candidate holding half a pair is
 * never completed from anywhere else (rules 43-44, 54): with no complete candidate the Publication is created with no
 * Location, and the half it was given stays a warning (rules 59, 81).
 */
const decideLocations = (
  scope: ProductScope,
  supplies: readonly OnixProductSupplyFact[],
  carriers: readonly OnixLocationCarrier[],
): Partial<Record<OnixLocationCarrier, OnixCarrierCommercial>> => {
  const contexts = supplies.flatMap(({ supplyDetails }) =>
    supplyDetails.flatMap((detail) => {
      const { location, unstorable } = contextLocation(detail);
      // A website whose role is not about the work or its content is never a Location: it stays a source fact (rules 39, 42).
      const unused = (detail.supplier?.websites ?? []).filter(
        ({ role }) => role === null || !(LANDING_PAGE_ROLES.has(role) || role === FULL_TEXT_ROLE),
      );

      if (unused.length > 0) {
        scope.findings.add({
          productKey: scope.productKey,
          groupKey: scope.groupKey,
          code: 'LOCATION_WEBSITE_NOT_USED',
          classification: 'TARGET_UNREPRESENTABLE',
          blocking: false,
          paths: unused.map(({ path }) => path),
          discriminator: detail.path,
          detail: {
            roles: unused.map(({ role }) => role ?? 'none'),
            links: unused.flatMap(({ links }) => links.map(({ link }) => link)),
          },
          message: `Supplier websites of ${scope.describe} that are not the web page of this work or its content (WebsiteRole ${unused.map(({ role }) => role ?? 'not stated').join(', ')}) are not Publication locations, and Thoth has nowhere else to record them`,
        });
      }

      unstorable.forEach(({ link, role, path }) =>
        scope.findings.add({
          productKey: scope.productKey,
          groupKey: scope.groupKey,
          code: 'LOCATION_URL_UNREPRESENTABLE',
          classification: 'TARGET_UNREPRESENTABLE',
          blocking: false,
          paths: [path],
          discriminator: path,
          detail: { link, role },
          message: `A supplier website of ${scope.describe} (WebsiteRole ${role}: ${link}) is not a link Thoth can store in a location, so no location is made from it`,
        }),
      );

      return location === null ? [] : [location];
    }),
  );
  const ambiguityKeys = contexts.flatMap((context) => {
    if (context.kind !== 'AMBIGUOUS') return [];

    const paths = context.links.map(({ path }) => path);

    return [
      scope.findings.add({
        productKey: scope.productKey,
        groupKey: scope.groupKey,
        code: 'LOCATION_PAIRING_AMBIGUOUS',
        classification: 'TARGET_INPUT_REQUIRED',
        blocking: true,
        paths,
        discriminator: paths.join(','),
        detail: { landingPages: context.landingPages, fullTextUrls: context.fullTextUrls },
        message: `A supplier of ${scope.describe} states ${context.landingPages.length} landing page(s) and ${context.fullTextUrls.length} full text URL(s) for one location, so which of them belong together cannot be told from the file; no location is paired from them by order`,
      }).key,
    ];
  });

  // Exact-equivalent candidates are one candidate, stated in every context that states it (rule 50).
  const byIdentity = new Map<string, OnixLocationCandidate>();

  contexts.forEach((context) => {
    if (context.kind !== 'CANDIDATE') return;

    const { candidate } = context;
    const identity = JSON.stringify([candidate.landingPage, candidate.fullTextUrl, candidate.platform]);
    const known = byIdentity.get(identity);

    byIdentity.set(
      identity,
      known === undefined ? candidate : { ...known, locations: [...known.locations, ...candidate.locations] },
    );
  });

  const candidates = [...byIdentity.values()];

  return Object.fromEntries(
    carriers.map((carrier) => {
      // Which location a context whose URLs cannot be paired would have stated is unknown, so no canonical choice holds.
      if (ambiguityKeys.length > 0) {
        return [carrier, { location: { kind: 'INPUT_REQUIRED', findingKeys: ambiguityKeys }, findingKeys: [] }];
      }

      const canonical = candidates.filter((candidate) => completeFor(carrier, candidate));
      const findingKeys: string[] = [];

      if (canonical.length === 0) {
        candidates.forEach((candidate) => {
          const missing = candidate.landingPage.length === 0 ? 'landingPage' : 'fullTextUrl';

          findingKeys.push(
            scope.findings.add({
              productKey: scope.productKey,
              groupKey: scope.groupKey,
              carrier,
              code: 'LOCATION_INCOMPLETE',
              classification: 'SUPPORTED_WITH_WARNING',
              blocking: false,
              paths: candidate.locations.map(({ path }) => path),
              discriminator: `${carrier}|${candidate.locations.map(({ path }) => path).join(',')}`,
              detail: { landingPage: candidate.landingPage, fullTextUrl: candidate.fullTextUrl, missing },
              message:
                `The supplier location for ${scope.describe} was not imported because Thoth requires both a landing page and a full text URL ` +
                `for a canonical location on a digital publication, and ${missing === 'fullTextUrl' ? 'no full text URL' : 'no landing page'} was supplied. ` +
                'The publication itself is imported without it.',
            }).key,
          );
        });
      }

      // More than one candidate could be canonical: the file does not say which is, and no order, supplier, role, platform
      // or URL decides it (rule 58). A half that could only follow whichever is chosen is still named.
      if (canonical.length > 1) {
        const labels = canonical
          .map(({ landingPage, fullTextUrl }) => `${landingPage || '-'} | ${fullTextUrl || '-'}`)
          .sort();
        const ambiguous = scope.findings.add({
          productKey: scope.productKey,
          groupKey: scope.groupKey,
          carrier,
          code: 'LOCATION_CANONICAL_AMBIGUOUS',
          classification: 'TARGET_INPUT_REQUIRED',
          blocking: true,
          paths: canonical.flatMap(({ locations }) => locations.map(({ path }) => path)),
          discriminator: carrier,
          detail: { candidates: labels },
          message: `${scope.describe} states ${canonical.length} supplier locations that could each be its canonical location (${labels.join('; ')}), and Thoth holds one canonical location for a Publication; which one it is cannot be told from the file, and none is chosen by order, supplier or platform`,
        });

        findingKeys.push(ambiguous.key);
        deferNonCanonical(scope, carrier, candidates, canonical, findingKeys);

        return [carrier, { location: { kind: 'INPUT_REQUIRED', findingKeys: [ambiguous.key] }, findingKeys }];
      }

      if (canonical.length === 1) {
        deferNonCanonical(scope, carrier, candidates, canonical, findingKeys);

        return [carrier, { location: { kind: 'CANONICAL', candidate: canonical[0] }, findingKeys }];
      }

      return [carrier, { location: { kind: 'NONE' }, findingKeys }];
    }),
  );
};

/* ------------------------------------------------------------------------------------------------ */
/* The reduction                                                                                    */
/* ------------------------------------------------------------------------------------------------ */

const describeRecord = (index: number, recordReference: string | null) =>
  recordReference === null ? `product ${index}` : `product ${index} (${recordReference})`;

/**
 * The canonical commercial reduction of one message: every Product's ProductSupply facts. Pure and deterministic: the
 * same file always reduces to the same plan.
 */
export const reduceOnixCommercial = (
  root: ExtendedONIXMessageRoot,
  sourcePlan: OnixSourcePlan,
  options: ReduceOnixCommercialOptions = {},
): OnixCommercialPlan => {
  const locate: Locate = (path) => ({ path, sourcePath: options.provenance?.sourcePathOf(path) ?? path });
  const productValues = toOnixArray(root.ONIXMessage?.Product);
  const header: Occurrence = { value: root.ONIXMessage?.Header, path: `${MESSAGE_PATH}/Header[1]` };
  const defaults: HeaderDefaults = {
    priceType: children(header, 'DefaultPriceType')[0],
    currency: children(header, 'DefaultCurrencyCode')[0],
  };
  const recordByKey = new Map(sourcePlan.records.map((record) => [record.recordKey, record]));
  const products: Record<string, OnixProductCommercial> = {};
  const findings = new CommercialFindings(locate);

  sourcePlan.products
    .flatMap((node) => {
      const record = recordByKey.get(node.representativeRecordKey);

      return record === undefined ? [] : [{ node, record }];
    })
    .sort((a, b) => a.record.index - b.record.index)
    .forEach(({ node, record }) => {
      const product: Occurrence = { value: productValues[record.index - 1], path: record.path };
      const scope: ProductScope = {
        productKey: node.productKey,
        groupKey: node.groupKey,
        describe: describeRecord(record.index, record.recordReference),
        findings,
      };
      const supplyOccurrences = children(product, 'ProductSupply');
      const supplies = supplyOccurrences.map((supply) => readProductSupply(supply, defaults, locate));
      const prices = supplyOccurrences.flatMap((supplyOccurrence, supplyIndex) => {
        const supply = supplies[supplyIndex];

        return children(supplyOccurrence, 'SupplyDetail').flatMap((detail, detailIndex) =>
          children(detail, 'Price').map((price, priceIndex): PriceInSupply => {
            const fact = supply.supplyDetails[detailIndex].prices[priceIndex];

            return {
              fact,
              supply,
              lostFacts: lostPriceFactsOf(price, supplyOccurrence, fact, record.path),
              stated: {
                where: relativePath(price.path, record.path),
                values: valuesOf(price, 'Price', AMOUNT_ELEMENTS),
              },
            };
          }),
        );
      });

      supplies.forEach(({ supplyDetails }) =>
        supplyDetails.forEach((detail) => {
          if (detail.unpricedItemType !== null) {
            discloseUnpriced(scope, detail.unpricedItemType, `${detail.path}/UnpricedItemType[1]`, null);
          }

          detail.prices.forEach((fact) => {
            if (fact.unpricedItemType !== null) {
              discloseUnpriced(scope, fact.unpricedItemType, `${fact.path}/UnpricedItemType[1]`, fact.currency.value);
            }

            discloseComparisons(scope, fact);
          });
        }),
      );

      const decisions = decidePrices(scope, prices);

      discloseSupply(scope, supplies, supplyOccurrences, record.path);
      holdUnexpected(
        scope,
        supplyOccurrences.flatMap((supply) => unexpectedIn(supply, 'ProductSupply')),
      );

      products[node.productKey] = {
        productKey: node.productKey,
        groupKey: node.groupKey,
        supplies,
        prices: decisions,
        carriers: decideLocations(scope, supplies, carriersOf(node.manifestation)),
      };
    });

  return { products, findings: findings.all() };
};
