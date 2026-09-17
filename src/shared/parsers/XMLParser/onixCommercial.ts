import { CurrencyCode, LocationPlatform } from '@/gql/graphql';
import type { PublicationType } from '@/src/entities/publication/model/publication.types';

import type {
  OnixCarrierCommercial,
  OnixCommercialFinding,
  OnixCommercialPlan,
  OnixComparisonPriceFact,
  OnixEffectiveCode,
  OnixElementFact,
  OnixLocationCandidate,
  OnixLocationCarrier,
  OnixManifestationDecision,
  OnixMarketFact,
  OnixMarketPublishingFact,
  OnixPriceDecision,
  OnixPriceExclusion,
  OnixPriceFact,
  OnixProductCommercial,
  OnixProductSupplyFact,
  OnixSourceLocation,
  OnixSourcePlan,
  OnixSupplierFact,
  OnixSupplierWebsiteFact,
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

const textOf = (occurrence: Occurrence | undefined): string =>
  occurrence === undefined ? '' : getOnixText(occurrence.value as OnixText);

/** The text of the first occurrence of a named child, or null where it states none. */
const childText = (parent: Occurrence | undefined, name: string): string | null => {
  const text = textOf(children(parent, name)[0]);

  return text.length > 0 ? text : null;
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

const readMarket = (market: Occurrence, locate: Locate): OnixMarketFact => {
  const [territory] = children(market, 'Territory');

  return {
    ...locate(market.path),
    territory: territory === undefined ? null : readTerritory(territory, locate),
    salesRestrictions: children(market, 'SalesRestriction').map(({ path }) => locate(path)),
  };
};

const attributeOf = (occurrence: Occurrence | undefined, name: string): string | null => {
  const value = isElement(occurrence?.value) ? occurrence.value[`@_${name}`] : undefined;

  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
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

/** Every child element of an occurrence but those named, each kept by name and location only. */
const elementsExcept = (parent: Occurrence, read: ReadonlySet<string>, locate: Locate): OnixElementFact[] =>
  childElements(parent)
    .filter(({ name }) => !read.has(name))
    .map(({ name, occurrence }) => ({ ...locate(occurrence.path), element: name }));

const MARKET_PUBLISHING_READ: ReadonlySet<string> = new Set(['MarketPublishingStatus', 'MarketDate']);

const readMarketPublishing = (detail: Occurrence, locate: Locate): OnixMarketPublishingFact => ({
  ...locate(detail.path),
  status: childText(detail, 'MarketPublishingStatus'),
  dates: children(detail, 'MarketDate').map((date) => readDate(date, 'MarketDateRole', locate)),
  otherElements: elementsExcept(detail, MARKET_PUBLISHING_READ, locate),
});

/** Every child element of an occurrence, by name and in source order, with its canonical path. */
const childElements = (parent: Occurrence): { readonly name: string; readonly occurrence: Occurrence }[] =>
  isElement(parent.value)
    ? Object.keys(parent.value)
        .filter((name) => name !== '#text' && !name.startsWith('@_'))
        .flatMap((name) => children(parent, name).map((occurrence) => ({ name, occurrence })))
    : [];

/** The child elements named, each kept by name and location only. */
const elementsNamed = (parent: Occurrence, names: ReadonlySet<string>, locate: Locate): OnixElementFact[] =>
  childElements(parent)
    .filter(({ name }) => names.has(name))
    .map(({ name, occurrence }) => ({ ...locate(occurrence.path), element: name }));

/** A supplier's contact points, which are personal or operational data this reduction never copies. */
const CONTACT_ELEMENTS: ReadonlySet<string> = new Set(['TelephoneNumber', 'FaxNumber', 'EmailAddress']);

const readWebsite = (website: Occurrence, locate: Locate): OnixSupplierWebsiteFact => ({
  ...locate(website.path),
  role: childText(website, 'WebsiteRole'),
  links: children(website, 'WebsiteLink')
    .map((link) => ({ ...locate(link.path), link: textOf(link) }))
    .filter(({ link }) => link.length > 0),
});

const readSupplier = (supplier: Occurrence, locate: Locate): OnixSupplierFact => ({
  ...locate(supplier.path),
  role: childText(supplier, 'SupplierRole'),
  name: childText(supplier, 'SupplierName'),
  identifiers: children(supplier, 'SupplierIdentifier').map((identifier) => ({
    ...locate(identifier.path),
    type: childText(identifier, 'SupplierIDType') ?? '',
    typeName: childText(identifier, 'IDTypeName'),
    value: childText(identifier, 'IDValue') ?? '',
  })),
  websites: children(supplier, 'Website').map((website) => readWebsite(website, locate)),
  contactElements: elementsNamed(supplier, CONTACT_ELEMENTS, locate),
});

const PRICE_READ: ReadonlySet<string> = new Set([
  'PriceIdentifier',
  'PriceType',
  'PriceQualifier',
  'PricePer',
  'PriceCondition',
  'MinimumOrderQuantity',
  'PriceStatus',
  'PriceAmount',
  'UnpricedItemType',
  'CurrencyCode',
  'Territory',
  'CurrencyZone',
  'ComparisonProductPrice',
  'PriceDate',
]);

const readComparison = (comparison: Occurrence, locate: Locate): OnixComparisonPriceFact => ({
  ...locate(comparison.path),
  productIdentifiers: children(comparison, 'ProductIdentifier').map((identifier) => ({
    type: childText(identifier, 'ProductIDType') ?? '',
    typeName: childText(identifier, 'IDTypeName'),
    value: childText(identifier, 'IDValue') ?? '',
  })),
  type: childText(comparison, 'PriceType'),
  amount: childText(comparison, 'PriceAmount'),
  currency: childText(comparison, 'CurrencyCode'),
});

const readPrice = (price: Occurrence, defaults: HeaderDefaults, locate: Locate): OnixPriceFact => {
  const [territory] = children(price, 'Territory');

  return {
    ...locate(price.path),
    identifiers: children(price, 'PriceIdentifier').map((identifier) => ({
      ...locate(identifier.path),
      type: childText(identifier, 'PriceIDType') ?? '',
      typeName: childText(identifier, 'IDTypeName'),
      value: childText(identifier, 'IDValue') ?? '',
    })),
    type: effectiveCode(price, 'PriceType', defaults.priceType, locate),
    qualifier: childText(price, 'PriceQualifier'),
    status: childText(price, 'PriceStatus'),
    per: childText(price, 'PricePer'),
    conditions: children(price, 'PriceCondition').map((condition) => ({
      ...locate(condition.path),
      type: childText(condition, 'PriceConditionType') ?? '',
    })),
    minimumOrderQuantity: childText(price, 'MinimumOrderQuantity'),
    amount: childText(price, 'PriceAmount'),
    unpricedItemType: childText(price, 'UnpricedItemType'),
    currency: effectiveCode(price, 'CurrencyCode', defaults.currency, locate),
    territory: territory === undefined ? null : readTerritory(territory, locate),
    currencyZone: childText(price, 'CurrencyZone'),
    dates: children(price, 'PriceDate').map((date) => readDate(date, 'PriceDateRole', locate)),
    comparisons: children(price, 'ComparisonProductPrice').map((comparison) => readComparison(comparison, locate)),
    otherElements: elementsExcept(price, PRICE_READ, locate),
  };
};

const SUPPLY_DETAIL_READ: ReadonlySet<string> = new Set([
  'Supplier',
  'ProductAvailability',
  'SupplyDate',
  'UnpricedItemType',
  'Price',
]);

const readSupplyDetail = (detail: Occurrence, defaults: HeaderDefaults, locate: Locate): OnixSupplyDetailFact => {
  const [supplier] = children(detail, 'Supplier');

  return {
    ...locate(detail.path),
    supplier: supplier === undefined ? null : readSupplier(supplier, locate),
    availability: childText(detail, 'ProductAvailability'),
    supplyDates: children(detail, 'SupplyDate').map((date) => readDate(date, 'SupplyDateRole', locate)),
    unpricedItemType: childText(detail, 'UnpricedItemType'),
    prices: children(detail, 'Price').map((price) => readPrice(price, defaults, locate)),
    otherElements: elementsExcept(detail, SUPPLY_DETAIL_READ, locate),
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

/* ------------------------------------------------------------------------------------------------ */
/* Findings                                                                                         */
/* ------------------------------------------------------------------------------------------------ */

type FindingInput = Omit<OnixCommercialFinding, 'key' | 'locations' | 'carrier'> & {
  /** The carrier the finding applies to alone; any Publication of the Product when omitted. */
  readonly carrier?: OnixLocationCarrier | null;
  /** Canonical paths of the facts the finding is about, in source order. */
  readonly paths: readonly string[];
  /** What tells this finding apart from another of the same code for the same Product. */
  readonly discriminator: string;
};

const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

/** Raises each finding once per key; the key depends on the file alone, so it is stable across resolutions. */
class CommercialFindings {
  private readonly byKey = new Map<string, OnixCommercialFinding>();

  constructor(private readonly locate: Locate) {}

  add({ paths, discriminator, carrier = null, ...input }: FindingInput): OnixCommercialFinding {
    const key = ['COMMERCIAL', input.code, input.productKey, discriminator].join('|');
    const existing = this.byKey.get(key);

    if (existing) return existing;

    const finding: OnixCommercialFinding = { key, ...input, carrier, locations: unique(paths).map(this.locate) };

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
type PriceInSupply = { readonly fact: OnixPriceFact; readonly supply: OnixProductSupplyFact };

type EligiblePrice = PriceInSupply & { readonly currency: string; readonly amount: number };

/**
 * Why a Price is never reduced to a generic target price automatically (rules 23-25): a type that is not ordinary consumer
 * retail, or one it neither states nor inherits; a qualifier, a non-copy unit, a provisional status, a condition, an order
 * quantity, a constraint or rights terms of its own; or a coded price with no amount. A code whose own definition is the
 * absence of that semantic - PriceQualifier 00 "Unqualified price", PricePer 00 "Per copy of whole product",
 * PriceCondition 00 "No conditions", PriceStatus 00 or 02, a minimum order of one - excludes nothing.
 */
const exclusionsOf = (fact: OnixPriceFact): OnixPriceExclusion[] => {
  const named = new Set(fact.otherElements.map(({ element }) => element));
  const type = fact.type.value;
  const exclusions: (OnixPriceExclusion | null)[] = [
    type === null ? 'TYPE_ABSENT' : CONSUMER_RETAIL_PRICE_TYPES.has(type) ? null : 'TYPE_NOT_CONSUMER_RETAIL',
    fact.qualifier !== null && fact.qualifier !== '00' ? 'QUALIFIED' : null,
    fact.per !== null && fact.per !== '00' ? 'PER_UNIT' : null,
    fact.status === '01' ? 'PROVISIONAL' : null,
    fact.conditions.some((condition) => condition.type !== '00') ? 'CONDITIONAL' : null,
    (fact.minimumOrderQuantity !== null && Number(fact.minimumOrderQuantity) !== 1) || named.has('BatchBonus')
      ? 'QUANTITY_CONDITION'
      : null,
    named.has('PriceConstraint') ? 'CONSTRAINED' : null,
    named.has('EpubTechnicalProtection') || named.has('EpubLicense') ? 'OWN_RIGHTS_TERMS' : null,
    named.has('PriceCoded') ? 'CODED' : null,
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
 * What one Price is for the target, raising what keeps it from being an automatic generic target price candidate. An
 * unpriced reason is disclosed where it is read; an amount or a currency no Price can have blocks as a shape canonical
 * validation should already have refused, and is never repaired into zero (rules 21-22). A Price that is never reduced
 * automatically stays a source fact that sets no Price and blocks nothing (rules 24-25, 32).
 */
const assessPrice = (scope: ProductScope, priced: PriceInSupply): EligiblePrice | null => {
  const { fact, supply } = priced;
  const base = { productKey: scope.productKey, groupKey: scope.groupKey };
  const exclusions = exclusionsOf(fact);
  const notAutomatic = () => {
    scope.findings.add({
      ...base,
      code: 'PRICE_NOT_AUTOMATIC',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      paths: [fact.path],
      discriminator: fact.path,
      detail: {
        exclusions,
        priceType: fact.type.value ?? '',
        amount: fact.amount ?? '',
        currency: fact.currency.value ?? '',
      },
      message:
        `${scope.describe} states a price` +
        (fact.amount === null
          ? ''
          : ` of ${[fact.currency.value, fact.amount].filter((part) => part !== null).join(' ')}`) +
        ` that Thoth never takes as its price automatically: ${exclusions.map((exclusion) => EXCLUSION_REASONS[exclusion](fact)).join('; ')}. ` +
        'It is kept as a source fact, and no Price is set from it',
    });

    return null;
  };

  if (fact.unpricedItemType !== null) return null;

  if (fact.amount === null && exclusions.includes('CODED')) return notAutomatic();

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

  if (exclusions.length > 0) return notAutomatic();

  return { fact, supply, currency, amount };
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
    ...fact.otherElements.map(({ element }) => element),
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

/** What each currency's eligible prices come to: one amount is the Publication's Price in that currency. */
const decidePrices = (scope: ProductScope, prices: readonly PriceInSupply[]): OnixPriceDecision[] => {
  const eligible = prices.flatMap((price) => assessPrice(scope, price) ?? []);
  const currencies = unique(eligible.map(({ currency }) => currency)).sort();

  return currencies.map((currencyCode): OnixPriceDecision => {
    const candidates = eligible.filter(({ currency }) => currency === currencyCode);
    const amounts = unique(candidates.map(({ amount }) => amount)).sort((a, b) => a - b);
    const paths = candidates.map(({ fact }) => fact.path);
    const locations = candidates.map(({ fact }) => ({ path: fact.path, sourcePath: fact.sourcePath }));

    // Different amounts for one currency are never settled by supplier, market, file order, type or date (rules 29-30).
    if (amounts.length > 1) {
      const conflict = scope.findings.add({
        productKey: scope.productKey,
        groupKey: scope.groupKey,
        code: 'PRICE_AMOUNT_CONFLICT',
        classification: 'TARGET_UNREPRESENTABLE',
        blocking: true,
        paths,
        discriminator: currencyCode,
        detail: { currency: currencyCode, amounts: amounts.map(String) },
        message: `${scope.describe} states ${amounts.length} different ${currencyCode} prices (${amounts.join(', ')}), and Thoth holds one price per currency for a Publication; none of them is chosen for it by supplier, market, date or file order`,
      });

      return { kind: 'CONFLICT', currencyCode, amounts, locations, findingKey: conflict.key };
    }

    const [amount] = amounts;
    const stated = new Set(candidates.flatMap((candidate) => [...lostSemanticsOf(candidate)]));
    const lost = LOST_PRICE_SEMANTICS.filter((name) => stated.has(name));
    const finding = scope.findings.add({
      productKey: scope.productKey,
      groupKey: scope.groupKey,
      code: 'PRICE_REDUCED',
      classification: 'SUPPORTED_WITH_WARNING',
      blocking: false,
      paths,
      discriminator: currencyCode,
      detail: {
        currency: currencyCode,
        amount: String(amount),
        priceTypes: unique(candidates.map(({ fact }) => fact.type.value as string)).sort(),
        lost,
        sources: candidates.length,
      },
      // One amount stated in several supply contexts is one Price; every context it collapses stays named (rule 28).
      message:
        `${scope.describe} is priced ${currencyCode} ${amount}` +
        (candidates.length > 1 ? `, which ${candidates.length} source prices state alike` : '') +
        `; Thoth's price holds only an amount and a currency, so what the file also states about it (${listed(lost)}) is not recorded`,
    });

    return { kind: 'SET', currencyCode, unitPrice: amount, locations, findingKey: finding.key };
  });
};

/* ------------------------------------------------------------------------------------------------ */
/* Supply facts Thoth has no field for (rules 9-17)                                                 */
/* ------------------------------------------------------------------------------------------------ */

/**
 * Every supply fact a Product states that no Thoth field holds - market geography and restrictions, market publishing,
 * the supplier, its availability, supply dates and operational data - disclosed once for the Product and blocking
 * nothing (rule 17). Availability and supply dates are supply evidence only: they never decide, or overwrite, the Work's
 * lifecycle (rules 11-14).
 */
const discloseSupply = (scope: ProductScope, supplies: readonly OnixProductSupplyFact[]) => {
  const elements: string[] = [];
  const paths: string[] = [];

  supplies.forEach(({ marketReference, markets, marketPublishing, supplyDetails }) => {
    if (marketReference !== null) elements.push('MarketReference');

    markets.forEach(({ path, salesRestrictions }) => {
      elements.push('Market', ...(salesRestrictions.length === 0 ? [] : ['SalesRestriction']));
      paths.push(path);
    });

    if (marketPublishing !== null) {
      elements.push('MarketPublishingDetail');
      paths.push(marketPublishing.path);
    }

    supplyDetails.forEach(({ path, supplier, availability, supplyDates, otherElements }) => {
      elements.push(
        ...(supplier === null ? [] : ['Supplier']),
        ...(availability === null ? [] : ['ProductAvailability']),
        ...(supplyDates.length === 0 ? [] : ['SupplyDate']),
        ...otherElements.map(({ element }) => element),
      );
      paths.push(path);
    });
  });

  if (paths.length === 0) return;

  const details = supplies.flatMap(({ supplyDetails }) => supplyDetails);
  const availability = unique(details.flatMap(({ availability: code }) => (code === null ? [] : [code])));
  const marketPublishingStatus = unique(
    supplies.flatMap(({ marketPublishing }) => (marketPublishing?.status == null ? [] : [marketPublishing.status])),
  );
  const stated = unique(elements);

  scope.findings.add({
    productKey: scope.productKey,
    groupKey: scope.groupKey,
    code: 'SUPPLY_NOT_REPRESENTED',
    classification: 'TARGET_UNREPRESENTABLE',
    blocking: false,
    paths,
    discriminator: 'supply',
    detail: {
      elements: stated,
      ...(availability.length === 0 ? {} : { availability }),
      ...(marketPublishingStatus.length === 0 ? {} : { marketPublishingStatus }),
    },
    message: `${scope.describe} states supply facts Thoth has no field for (${listed(stated)}), so they are not recorded; a supplier's availability or supply dates are never read as the Work's publishing status or dates`,
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
      const supplies = children(product, 'ProductSupply').map((supply) => readProductSupply(supply, defaults, locate));
      const prices = supplies.flatMap((supply) =>
        supply.supplyDetails.flatMap((detail) => detail.prices.map((fact) => ({ fact, supply }))),
      );

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

      discloseSupply(scope, supplies);

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
