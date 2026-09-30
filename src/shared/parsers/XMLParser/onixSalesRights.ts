import type {
  OnixCommercialPlan,
  OnixPostalAddressFact,
  OnixProductContactFact,
  OnixProductContactScope,
  OnixProductSalesRights,
  OnixRowSalesRightsFact,
  OnixSalesRestrictionFact,
  OnixSalesRightsFact,
  OnixSalesRightsFinding,
  OnixSalesRightsPlan,
  OnixSalesRightsSemantics,
  OnixSourceLocation,
  OnixSourcePlan,
  OnixStatedIdentifier,
  OnixStatedText,
  OnixStatedValue,
  OnixTerritoryFact,
} from '../../types/onixPlanning';
import type { ExtendedONIXMessageRoot, OnixText } from './interfaces';
import { getOnixText, toOnixArray } from './onix';
import {
  complementOf,
  evaluateTerritory,
  type OnixEvaluatedTerritory,
  type OnixTerritoryCoverage,
  territoryRelation,
  unionOf,
} from './onixTerritory';
import type { ProvenanceResolver } from './validation/worker/provenance';

/**
 * The canonical SalesRights and ProductContact reducer of thoth-app#217, Stage C of #184, under
 * ONIX-AUDIT-SALES-RIGHTS-CONTACT-01 (#179 proposal 5543566392, approval 5543611447).
 *
 * It runs after canonical source validation has permitted target planning, on the adapter value bridged from the
 * final normalised Reference XML with its Short-tag provenance, after #182 has decided which records are Products,
 * and beside the Stage-B commercial reduction, whose Market territories are the only ProductSupply facts it reads.
 * It reads nothing else - no Thoth lookup, no clock, no network - and decides nothing about source validity: a fact
 * the validator admitted is never reclassified as invalid here, and a relation the pinned vocabulary cannot establish
 * is reported as a gap, never guessed.
 *
 * Thoth has no territorial-rights store and no product-scoped contact. Nothing here plans a mutation: every valid
 * SalesRights, ROWSalesRightsType, SalesRestriction, equivalent-product and ProductContact fact is kept exactly as
 * stated, disclosed, and - where the approved contract says so - held back until the publisher knowingly acknowledges
 * that the import omits it. An acknowledgement creates no rights, no permission and no contact.
 */

export type ReduceOnixSalesRightsOptions = {
  /** Maps canonical Reference paths back to the submitted source, for a Short-tag file. */
  readonly provenance?: ProvenanceResolver;
  /**
   * The canonical commercial reduction of the same source (thoth-app#215): each Product's ProductSupply Markets are
   * compared with its SalesRights (rules 34-38). Without it no market is compared.
   */
  readonly commercial?: OnixCommercialPlan;
  /**
   * The email addresses of the active publisher's existing Accessibility contacts, read back only after source
   * validation (rule 73). An accessibility request contact (role 01) whose email is exactly one of them is shown as
   * evidence only (rule 58). Without them nothing is compared.
   */
  readonly publisherAccessibilityContactEmails?: readonly string[];
};

/* ------------------------------------------------------------------------------------------------ */
/* Codelists (rules 15-17, 21, 60-62)                                                               */
/* ------------------------------------------------------------------------------------------------ */

/** List 46, by what each code means. Codes 07 and 08 are deprecated but remain valid for-sale statements (rule 17). */
const SALES_RIGHTS_SEMANTICS: Readonly<Record<string, OnixSalesRightsSemantics>> = {
  '00': 'UNKNOWN',
  '01': 'FOR_SALE_EXCLUSIVE',
  '02': 'FOR_SALE_NON_EXCLUSIVE',
  '03': 'NOT_FOR_SALE',
  '04': 'NOT_FOR_SALE',
  '05': 'NOT_FOR_SALE',
  '06': 'NOT_FOR_SALE',
  '07': 'FOR_SALE_EXCLUSIVE',
  '08': 'FOR_SALE_NON_EXCLUSIVE',
};

const DEPRECATED_SALES_RIGHTS_TYPES: ReadonlySet<string> = new Set(['07', '08']);
/** The simple positive statements (rule 27): for sale, exclusive or not, with no restriction implied by the code. */
const SIMPLE_POSITIVE_TYPES: ReadonlySet<string> = new Set(['01', '02']);
/** The unspecified not-for-sale code, of which 04-06 are the detailed forms (List 46 note on code 03). */
const NOT_FOR_SALE_UNSPECIFIED = '03';

export const salesRightsSemanticsOf = (code: string): OnixSalesRightsSemantics =>
  SALES_RIGHTS_SEMANTICS[code] ?? 'UNRECOGNISED';

/** List 198, exactly as the pinned codelist holds it. */
const PRODUCT_CONTACT_ROLES: ReadonlySet<string> = new Set([
  '00',
  '01',
  '02',
  '03',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
  '10',
  '11',
  '99',
]);

/**
 * The List 198 roles whose omission needs explicit acknowledgement before execution (rule 60): accessibility request,
 * permissions, CIP / legal deposit, rights and licensing, product safety and product raw materials contacts.
 */
export const ONIX_HIGH_SALIENCE_CONTACT_ROLES: ReadonlySet<string> = new Set(['01', '06', '08', '09', '10', '11']);

/** The product-compliance contacts (rule 62): product safety and product raw materials, never generic publisher contacts. */
const COMPLIANCE_CONTACT_ROLES: ReadonlySet<string> = new Set(['10', '11']);

const ACCESSIBILITY_REQUEST_ROLE = '01';

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

const attributeOf = (occurrence: Occurrence | undefined, name: string): string | null => {
  const value = isElement(occurrence?.value) ? occurrence.value[`@_${name}`] : undefined;

  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
};

const hasChildElements = (occurrence: Occurrence): boolean =>
  isElement(occurrence.value) &&
  Object.keys(occurrence.value).some((name) => name !== '#text' && !name.startsWith('@_'));

const statedValues = (parent: Occurrence, name: string, locate: Locate): OnixStatedValue[] =>
  children(parent, name).map((occurrence) => ({ ...locate(occurrence.path), value: textOf(occurrence) }));

const statedTexts = (parent: Occurrence, name: string, locate: Locate): OnixStatedText[] =>
  children(parent, name).map((occurrence) => ({
    ...locate(occurrence.path),
    value: textOf(occurrence),
    language: attributeOf(occurrence, 'language'),
    textFormat: attributeOf(occurrence, 'textformat'),
    markupNotKept: hasChildElements(occurrence),
  }));

/** Every identifier composite of one name, interpreted by its declared type and IDTypeName alone (rule 53). */
const identifiersOf = (parent: Occurrence, name: string, typeElement: string, locate: Locate): OnixStatedIdentifier[] =>
  children(parent, name).map((identifier) => ({
    ...locate(identifier.path),
    type: childText(identifier, typeElement) ?? '',
    typeName: childText(identifier, 'IDTypeName'),
    value: childText(identifier, 'IDValue') ?? '',
  }));

const datedValue = (parent: Occurrence, name: string): { date: string | null; dateFormat: string | null } => {
  const [dated] = children(parent, name);

  return { date: childText(parent, name), dateFormat: attributeOf(dated, 'dateformat') };
};

const readTerritory = (territory: Occurrence, locate: Locate): OnixTerritoryFact => ({
  ...locate(territory.path),
  countriesIncluded: childText(territory, 'CountriesIncluded'),
  regionsIncluded: childText(territory, 'RegionsIncluded'),
  countriesExcluded: childText(territory, 'CountriesExcluded'),
  regionsExcluded: childText(territory, 'RegionsExcluded'),
});

/** Every restriction whole (rules 43-46): type, outlets, notes and the exact dated interval, never converted. */
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

const readSalesRights = (rights: Occurrence, locate: Locate): OnixSalesRightsFact => {
  const type = childText(rights, 'SalesRightsType') ?? '';
  const [territory] = children(rights, 'Territory');

  return {
    ...locate(rights.path),
    type,
    semantics: salesRightsSemanticsOf(type),
    deprecated: DEPRECATED_SALES_RIGHTS_TYPES.has(type),
    territory: territory === undefined ? null : readTerritory(territory, locate),
    salesRestrictions: children(rights, 'SalesRestriction').map((restriction) =>
      readSalesRestriction(restriction, locate),
    ),
    equivalentProducts: identifiersOf(rights, 'ProductIdentifier', 'ProductIDType', locate),
    equivalentPublisherNames: [
      ...statedValues(rights, 'PublisherName', locate),
      ...statedValues(rights, 'PublisherNameInverted', locate),
    ],
  };
};

const readAddress = (contact: Occurrence): OnixPostalAddressFact | null => {
  const address = {
    streetAddress: childText(contact, 'StreetAddress'),
    locationName: childText(contact, 'LocationName'),
    postalCode: childText(contact, 'PostalCode'),
    regionCode: childText(contact, 'RegionCode'),
    countryCode: childText(contact, 'CountryCode'),
  };

  return Object.values(address).every((value) => value === null) ? null : address;
};

const readProductContact = (
  contact: Occurrence,
  scope: OnixProductContactScope,
  locate: Locate,
): OnixProductContactFact => ({
  ...locate(contact.path),
  scope,
  role: childText(contact, 'ProductContactRole'),
  identifiers: identifiersOf(contact, 'ProductContactIdentifier', 'ProductContactIDType', locate),
  name: childText(contact, 'ProductContactName'),
  contactName: childText(contact, 'ContactName'),
  telephoneNumbers: statedValues(contact, 'TelephoneNumber', locate),
  faxNumbers: statedValues(contact, 'FaxNumber', locate),
  emailAddresses: statedValues(contact, 'EmailAddress', locate),
  address: readAddress(contact),
});

/* ------------------------------------------------------------------------------------------------ */
/* Findings                                                                                         */
/* ------------------------------------------------------------------------------------------------ */

type FindingInput = Omit<OnixSalesRightsFinding, 'family' | 'key' | 'locations'> & {
  /** Canonical paths of the facts the finding is about, in source order. */
  readonly paths: readonly string[];
  /** What tells this finding apart from another of the same code on the same Product. */
  readonly discriminator: string;
};

const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

/** Raises each finding once per key; the key depends on the file alone, so it is stable across resolutions. */
class SalesRightsFindings {
  private readonly byKey = new Map<string, OnixSalesRightsFinding>();

  constructor(private readonly locate: Locate) {}

  add({ paths, discriminator, ...input }: FindingInput): OnixSalesRightsFinding {
    const key = ['SALES_RIGHTS', input.code, input.productKey, discriminator].join('|');
    const existing = this.byKey.get(key);

    if (existing) return existing;

    const finding: OnixSalesRightsFinding = {
      family: input.code.startsWith('PRODUCT_CONTACT_') ? 'PRODUCT_CONTACT' : 'SALES_RIGHTS',
      key,
      ...input,
      locations: unique(paths).map(this.locate),
    };

    this.byKey.set(key, finding);

    return finding;
  }

  all(): OnixSalesRightsFinding[] {
    return [...this.byKey.values()];
  }
}

type ProductContext = {
  readonly productKey: string;
  readonly groupKey: string;
  readonly record: Occurrence;
  readonly describe: string;
  readonly locate: Locate;
  readonly findings: SalesRightsFindings;
  readonly options: ReduceOnixSalesRightsOptions;
};

/** A Territory said in the words of the file: its included tokens, then what it excludes. */
const describeTerritory = (territory: OnixTerritoryFact | null): string => {
  if (territory === null) return '(no territory)';

  const included = [territory.countriesIncluded, territory.regionsIncluded].filter((text) => text !== null).join(' ');
  const excluded = [territory.countriesExcluded, territory.regionsExcluded].filter((text) => text !== null).join(' ');

  return excluded.length > 0 ? `${included} except ${excluded}` : included;
};

const ACKNOWLEDGE = { kind: 'ACKNOWLEDGE' } as const;
const NONE = { kind: 'NONE' } as const;

/** The pinned-vocabulary reading of one Territory, in the SalesRights context. */
const rightsTerritory = (territory: OnixTerritoryFact | null): OnixEvaluatedTerritory | null =>
  territory === null ? null : evaluateTerritory(territory, 'SALES_RIGHTS');

/** Whether one for-sale statement is the simple positive one (rule 27): 01 or 02, WORLD alone, nothing else. */
const isSimplePositiveWorld = ({
  type,
  territory,
  salesRestrictions,
  equivalentProducts,
  equivalentPublisherNames,
}: OnixSalesRightsFact): boolean =>
  SIMPLE_POSITIVE_TYPES.has(type) &&
  territory !== null &&
  territory.regionsIncluded === 'WORLD' &&
  territory.countriesIncluded === null &&
  territory.countriesExcluded === null &&
  territory.regionsExcluded === null &&
  salesRestrictions.length === 0 &&
  equivalentProducts.length === 0 &&
  equivalentPublisherNames.length === 0;

/** Whether two rights types say compatible things about one territory: the same, or 03 beside one of its detailed forms. */
const compatibleTypes = (a: string, b: string): boolean =>
  a === b ||
  ((a === NOT_FOR_SALE_UNSPECIFIED || b === NOT_FOR_SALE_UNSPECIFIED) &&
    salesRightsSemanticsOf(a) === 'NOT_FOR_SALE' &&
    salesRightsSemanticsOf(b) === 'NOT_FOR_SALE');

/* ------------------------------------------------------------------------------------------------ */
/* SalesRights (rules 12-49)                                                                        */
/* ------------------------------------------------------------------------------------------------ */

/** A SalesRights statement with its territory evaluated once. */
type EvaluatedRights = { readonly fact: OnixSalesRightsFact; readonly territory: OnixEvaluatedTerritory | null };

const reduceSalesRights = (
  context: ProductContext,
  publishing: Occurrence | undefined,
): Pick<OnixProductSalesRights, 'salesRights' | 'rowSalesRightsType'> & {
  /** Whether the territory algebra is sound: no unresolved token and no statement of unknown meaning. */
  readonly comparable: boolean;
  readonly evaluated: readonly EvaluatedRights[];
} => {
  const { findings, describe, locate } = context;
  const scope = { productKey: context.productKey, groupKey: context.groupKey };
  const salesRights = children(publishing, 'SalesRights').map((rights) => readSalesRights(rights, locate));
  const [rowOccurrence] = children(publishing, 'ROWSalesRightsType');
  const rowType = textOf(rowOccurrence);
  const rowSalesRightsType: OnixRowSalesRightsFact | null =
    rowOccurrence === undefined || rowType.length === 0
      ? null
      : { ...locate(rowOccurrence.path), type: rowType, semantics: salesRightsSemanticsOf(rowType) };
  const evaluated = salesRights.map((fact) => ({ fact, territory: rightsTerritory(fact.territory) }));
  let comparable = true;

  if (salesRights.length === 0 && rowSalesRightsType === null) {
    return { salesRights, rowSalesRightsType, comparable, evaluated };
  }

  // A code the list does not hold, or 00 outside the ROW rule (rule 16): a gap the validator should have refused.
  evaluated.forEach(({ fact }) => {
    if (fact.semantics !== 'UNKNOWN' && fact.semantics !== 'UNRECOGNISED') return;

    comparable = false;
    findings.add({
      ...scope,
      code: 'SALES_RIGHTS_TYPE_UNEXPECTED',
      classification: 'PREFLIGHT_GAP',
      blocking: true,
      paths: [fact.path],
      discriminator: fact.path,
      detail: { type: fact.type },
      resolution: NONE,
      message: `${describe} states a SalesRightsType of "${fact.type}", which is not an ordinary sales rights type (List 46 code 00 is valid only as the ROWSalesRightsType), so what it grants cannot be decided`,
    });
  });

  // A token the pinned vocabulary does not resolve: no relation is guessed over it (rule 11).
  const unresolved = unique(evaluated.flatMap(({ territory }) => territory?.unresolved ?? []));

  if (unresolved.length > 0) {
    comparable = false;
    findings.add({
      ...scope,
      code: 'SALES_RIGHTS_TERRITORY_NOT_ESTABLISHED',
      classification: 'PREFLIGHT_GAP',
      blocking: true,
      paths: evaluated
        .filter(({ territory }) => territory !== null && territory.unresolved.length > 0)
        .map(({ fact }) => fact.path),
      discriminator: 'territory',
      detail: { unresolved },
      resolution: NONE,
      message: `${describe} states a sales rights territory with a code the pinned ONIX country and region lists do not hold (${unresolved.join(', ')}), so which territories its rights cover cannot be established`,
    });
  }

  evaluated
    .filter(({ fact }) => fact.deprecated)
    .forEach(({ fact }) =>
      findings.add({
        ...scope,
        code: 'SALES_RIGHTS_TYPE_DEPRECATED',
        classification: 'SUPPORTED_WITH_WARNING',
        blocking: false,
        paths: [fact.path],
        discriminator: fact.path,
        detail: { type: fact.type },
        resolution: NONE,
        message: `${describe} states its sales rights with the deprecated List 46 code ${fact.type}; it is read as stated, as for-sale rights to which a sales restriction applies`,
      }),
    );

  const forSale = evaluated.filter(
    ({ fact }) => fact.semantics === 'FOR_SALE_EXCLUSIVE' || fact.semantics === 'FOR_SALE_NON_EXCLUSIVE',
  );
  const simple =
    forSale.length > 0 && rowSalesRightsType === null && forSale.every(({ fact }) => isSimplePositiveWorld(fact));

  if (forSale.length > 0) {
    findings.add({
      ...scope,
      code: simple ? 'SALES_RIGHTS_NOT_REPRESENTED' : 'SALES_RIGHTS_TERRITORY_NOT_REPRESENTED',
      classification: simple ? 'SUPPORTED_WITH_WARNING' : 'TARGET_UNREPRESENTABLE',
      blocking: !simple,
      paths: forSale.map(({ fact }) => fact.path),
      discriminator: 'for-sale',
      detail: {
        types: forSale.map(({ fact }) => fact.type),
        territories: forSale.map(({ fact }) => describeTerritory(fact.territory)),
      },
      resolution: simple ? NONE : ACKNOWLEDGE,
      message: simple
        ? `${describe} states that it is for sale worldwide (SalesRightsType ${forSale[0].fact.type}, WORLD); Thoth has no store for sales rights, so it will not persist or enforce this statement, and whether the rights are exclusive is not kept`
        : `${describe} states territorial sales rights (${forSale.map(({ fact }) => `SalesRightsType ${fact.type} in ${describeTerritory(fact.territory)}`).join('; ')}); Thoth has no store for sales rights, so it will not persist or enforce this contract, and importing the product omits it`,
    });
  }

  evaluated
    .filter(({ fact }) => fact.semantics === 'NOT_FOR_SALE')
    .forEach(({ fact }) =>
      findings.add({
        ...scope,
        code: 'SALES_RIGHTS_NOT_FOR_SALE_NOT_REPRESENTED',
        classification: 'TARGET_UNREPRESENTABLE',
        blocking: true,
        paths: [fact.path],
        discriminator: fact.path,
        detail: { type: fact.type, territory: describeTerritory(fact.territory) },
        resolution: ACKNOWLEDGE,
        message: `${describe} states that it is not for sale in ${describeTerritory(fact.territory)} (SalesRightsType ${fact.type}); Thoth has no store for sales rights, so it cannot preserve that prohibition, and importing the product omits it`,
      }),
    );

  if (rowSalesRightsType !== null) {
    const unknown = rowSalesRightsType.semantics === 'UNKNOWN';

    findings.add({
      ...scope,
      code: unknown ? 'SALES_RIGHTS_ROW_UNKNOWN' : 'SALES_RIGHTS_ROW_NOT_REPRESENTED',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: true,
      paths: [rowSalesRightsType.path],
      discriminator: 'row',
      detail: { type: rowSalesRightsType.type, semantics: rowSalesRightsType.semantics },
      resolution: ACKNOWLEDGE,
      message: unknown
        ? `${describe} states that its sales rights in the rest of the world are unknown or unstated (ROWSalesRightsType 00); that is neither permission nor prohibition, Thoth cannot keep that the rights are unknown there, and importing the product omits it`
        : `${describe} states its sales rights in the rest of the world (ROWSalesRightsType ${rowSalesRightsType.type}); Thoth has no store for sales rights, so it will not persist or enforce this rule, and importing the product omits it`,
    });
  }

  evaluated.forEach(({ fact }) => {
    fact.salesRestrictions.forEach((restriction) =>
      findings.add({
        ...scope,
        code: 'SALES_RESTRICTION_NOT_REPRESENTED',
        classification: 'TARGET_UNREPRESENTABLE',
        blocking: true,
        paths: [restriction.path],
        discriminator: restriction.path,
        detail: {
          type: restriction.type ?? '',
          outlets: restriction.outlets.length,
          notes: restriction.notes.length,
          startDate: restriction.startDate ?? '',
          endDate: restriction.endDate ?? '',
        },
        resolution: ACKNOWLEDGE,
        message: `${describe} restricts the sales its rights in ${describeTerritory(fact.territory)} allow (SalesRestrictionType ${restriction.type ?? ''}${restriction.outlets.length > 0 ? `, ${restriction.outlets.length} sales ${restriction.outlets.length === 1 ? 'outlet' : 'outlets'}` : ''}${restriction.startDate !== null || restriction.endDate !== null ? `, dated ${restriction.startDate ?? ''}${restriction.endDate !== null ? ` to ${restriction.endDate}` : ''}` : ''}); Thoth cannot enforce a channel or outlet restriction, its dates are the restriction's own and never a publication or price date, and importing the product omits it`,
      }),
    );

    if (fact.equivalentProducts.length > 0 || fact.equivalentPublisherNames.length > 0) {
      findings.add({
        ...scope,
        code: 'SALES_RIGHTS_EQUIVALENT_PRODUCT_NOT_REPRESENTED',
        classification: 'TARGET_UNREPRESENTABLE',
        blocking: true,
        paths: [fact.path],
        discriminator: `${fact.path}/equivalent`,
        detail: {
          identifierTypes: fact.equivalentProducts.map(({ type }) => type),
          publisherNames: fact.equivalentPublisherNames.length,
        },
        resolution: ACKNOWLEDGE,
        message: `${describe} names an equivalent product${fact.equivalentPublisherNames.length > 0 ? ' and its publisher' : ''} for the territory of its SalesRightsType ${fact.type} statement; that identifies a replacement within those sales rights only, is never read as this product's identity, a related product or a grouping, and importing the product omits it`,
      });
    }
  });

  // Incompatible rights over deterministically overlapping territory (rules 12, 19): never first-wins.
  if (comparable) {
    const explicit = evaluated.filter(({ territory }) => territory !== null);

    explicit.forEach((a, i) =>
      explicit.slice(i + 1).forEach((b) => {
        if (compatibleTypes(a.fact.type, b.fact.type)) return;

        const relation = territoryRelation(
          unionOf([a.territory as OnixEvaluatedTerritory]),
          unionOf([b.territory as OnixEvaluatedTerritory]),
        );

        if (relation.kind !== 'ESTABLISHED' || !relation.intersects) return;

        findings.add({
          ...scope,
          code: 'SALES_RIGHTS_CONFLICT',
          classification: 'SOURCE_CONFLICT',
          blocking: true,
          paths: [a.fact.path, b.fact.path],
          discriminator: `${a.fact.path}|${b.fact.path}`,
          detail: {
            types: [a.fact.type, b.fact.type],
            territories: [describeTerritory(a.fact.territory), describeTerritory(b.fact.territory)],
          },
          resolution: NONE,
          message: `${describe} states incompatible sales rights over overlapping territory (SalesRightsType ${a.fact.type} in ${describeTerritory(a.fact.territory)} and SalesRightsType ${b.fact.type} in ${describeTerritory(b.fact.territory)}), so neither statement is taken`,
        });
      }),
    );
  }

  return { salesRights, rowSalesRightsType, comparable, evaluated };
};

/* ------------------------------------------------------------------------------------------------ */
/* SalesRights against ProductSupply Markets (rules 34-38)                                          */
/* ------------------------------------------------------------------------------------------------ */

const compareMarkets = (
  context: ProductContext,
  rights: ReturnType<typeof reduceSalesRights>,
  markets: readonly OnixTerritoryFact[],
): void => {
  const { findings, describe } = context;
  const scope = { productKey: context.productKey, groupKey: context.groupKey };
  const { evaluated, rowSalesRightsType, comparable } = rights;

  // No SalesRights: no rights statement to compare a market with (rule 38). Nothing comparable: nothing is guessed.
  if (evaluated.length === 0 || !comparable) return;

  const territoriesOf = (predicate: (fact: OnixSalesRightsFact) => boolean): OnixTerritoryCoverage =>
    unionOf(
      evaluated
        .filter(({ fact, territory }) => territory !== null && predicate(fact))
        .map(({ territory }) => territory as OnixEvaluatedTerritory),
    );
  const notForSale = territoriesOf(({ semantics }) => semantics === 'NOT_FOR_SALE');
  const notForSaleFacts = evaluated.filter(({ fact }) => fact.semantics === 'NOT_FOR_SALE');
  const rest = complementOf(territoriesOf(() => true));
  const rowSemantics = rowSalesRightsType?.semantics ?? null;

  markets.forEach((market) => {
    const territory = evaluateTerritory(market, 'MARKET');

    if (territory.unresolved.length > 0) {
      findings.add({
        ...scope,
        code: 'SALES_RIGHTS_TERRITORY_NOT_ESTABLISHED',
        classification: 'PREFLIGHT_GAP',
        blocking: true,
        paths: [market.path],
        discriminator: market.path,
        detail: { unresolved: territory.unresolved },
        resolution: NONE,
        message: `${describe} states a market territory with a code the pinned ONIX country and region lists do not hold (${territory.unresolved.join(', ')}), so whether the market lies within the territory for sale cannot be established`,
      });

      return;
    }

    const coverage = unionOf([territory]);
    const described = describeTerritory(market);

    // A market that deterministically intersects explicit not-for-sale rights contradicts the source (rule 36).
    const againstNotForSale = territoryRelation(notForSale, coverage);

    if (againstNotForSale.kind === 'ESTABLISHED' && againstNotForSale.intersects) {
      const offending = notForSaleFacts.filter(({ territory: rightsTerritoryOf }) => {
        const relation = territoryRelation(unionOf([rightsTerritoryOf as OnixEvaluatedTerritory]), coverage);

        return relation.kind === 'ESTABLISHED' && relation.intersects;
      });

      findings.add({
        ...scope,
        code: 'SALES_RIGHTS_MARKET_CONTRADICTION',
        classification: 'SOURCE_CONFLICT',
        blocking: true,
        paths: [market.path, ...offending.map(({ fact }) => fact.path)],
        discriminator: market.path,
        detail: { market: described, types: offending.map(({ fact }) => fact.type) },
        resolution: NONE,
        message: `${describe} supplies a market (${described}) that lies partly or wholly within territory it states it is not for sale in (SalesRightsType ${offending.map(({ fact }) => fact.type).join(', ')}), so the source contradicts itself and the product cannot be imported as stated`,
      });

      return;
    }

    // A market reaching the rest of the world takes the ROW rule: for sale passes, not for sale contradicts, unknown
    // or unstated is uncertainty to acknowledge, never permission (rules 21, 37).
    const againstRest = territoryRelation(rest, coverage);

    if (againstRest.kind !== 'ESTABLISHED' || !againstRest.intersects) return;

    if (rowSemantics === 'FOR_SALE_EXCLUSIVE' || rowSemantics === 'FOR_SALE_NON_EXCLUSIVE') return;

    if (rowSemantics === 'NOT_FOR_SALE') {
      findings.add({
        ...scope,
        code: 'SALES_RIGHTS_MARKET_CONTRADICTION',
        classification: 'SOURCE_CONFLICT',
        blocking: true,
        paths: [market.path, (rowSalesRightsType as OnixRowSalesRightsFact).path],
        discriminator: market.path,
        detail: { market: described, types: [(rowSalesRightsType as OnixRowSalesRightsFact).type] },
        resolution: NONE,
        message: `${describe} supplies a market (${described}) that lies partly or wholly in the rest of the world, where it states it is not for sale (ROWSalesRightsType ${(rowSalesRightsType as OnixRowSalesRightsFact).type}), so the source contradicts itself and the product cannot be imported as stated`,
      });

      return;
    }

    const reason = rowSalesRightsType === null ? 'ROW_UNSTATED' : 'ROW_UNKNOWN';

    findings.add({
      ...scope,
      code: 'SALES_RIGHTS_MARKET_UNKNOWN',
      classification: 'TARGET_INPUT_REQUIRED',
      blocking: true,
      paths: [market.path, ...(rowSalesRightsType === null ? [] : [rowSalesRightsType.path])],
      discriminator: market.path,
      detail: { market: described, reason },
      resolution: ACKNOWLEDGE,
      message:
        reason === 'ROW_UNKNOWN'
          ? `${describe} supplies a market (${described}) that lies partly or wholly in the rest of the world, where its sales rights are unknown or unstated (ROWSalesRightsType 00); whether it may be sold there cannot be told from the file, and importing the product takes no view on it`
          : `${describe} supplies a market (${described}) that lies partly or wholly outside every territory its sales rights name, and states no rights for the rest of the world; whether it may be sold there cannot be told from the file, and importing the product takes no view on it`,
    });
  });
};

/* ------------------------------------------------------------------------------------------------ */
/* ProductContact (rules 50-70)                                                                     */
/* ------------------------------------------------------------------------------------------------ */

const describeScope = (scope: OnixProductContactScope): string =>
  scope.kind === 'PUBLISHING_DETAIL'
    ? 'for the whole product'
    : `for the market${scope.marketTerritories.length > 0 ? ` (${scope.marketTerritories.map(describeTerritory).join('; ')})` : ''} of one of its ProductSupply statements`;

const reduceProductContacts = (context: ProductContext, contacts: readonly OnixProductContactFact[]): void => {
  const { findings, describe, options } = context;
  const scope = { productKey: context.productKey, groupKey: context.groupKey };

  contacts.forEach((contact) => {
    const role = contact.role ?? '';

    if (!PRODUCT_CONTACT_ROLES.has(role)) {
      findings.add({
        ...scope,
        code: 'PRODUCT_CONTACT_ROLE_UNEXPECTED',
        classification: 'PREFLIGHT_GAP',
        blocking: true,
        paths: [contact.path],
        discriminator: contact.path,
        detail: { role, scope: contact.scope.kind },
        resolution: NONE,
        message: `${describe} names a product contact with a ProductContactRole of "${role}", which List 198 does not define, so what the contact is for cannot be decided`,
      });

      return;
    }

    const highSalience = ONIX_HIGH_SALIENCE_CONTACT_ROLES.has(role);
    const compliance = COMPLIANCE_CONTACT_ROLES.has(role);
    // An accessibility request contact is compared with the publisher's existing Accessibility contacts by exact
    // email only, as evidence (rule 58): the match changes nothing about the loss, and creates no contact.
    const accessibility: Readonly<Record<string, string>> =
      role !== ACCESSIBILITY_REQUEST_ROLE
        ? {}
        : {
            existingAccessibilityContact:
              options.publisherAccessibilityContactEmails === undefined
                ? 'NOT_COMPARED'
                : contact.emailAddresses.some(({ value }) =>
                      (options.publisherAccessibilityContactEmails as readonly string[]).some(
                        (email) => email.trim() === value.trim(),
                      ),
                    )
                  ? 'MATCHES_EMAIL'
                  : 'NO_MATCH',
          };

    findings.add({
      ...scope,
      code: 'PRODUCT_CONTACT_NOT_REPRESENTED',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: highSalience,
      paths: [contact.path],
      discriminator: contact.path,
      detail: {
        role,
        scope: contact.scope.kind,
        compliance: compliance ? 'true' : 'false',
        identifierTypes: contact.identifiers.map(({ type }) => type),
        emails: contact.emailAddresses.length,
        telephones: contact.telephoneNumbers.length,
        faxes: contact.faxNumbers.length,
        address: contact.address === null ? 'false' : 'true',
        ...accessibility,
      },
      resolution: highSalience ? ACKNOWLEDGE : NONE,
      message: `${describe} names a ${compliance ? 'product-compliance contact' : 'product contact'} (ProductContactRole ${role}) ${describeScope(contact.scope)}; Thoth records no product-scoped contact and will not store or republish it, so importing the product omits the contact${accessibility.existingAccessibilityContact === 'MATCHES_EMAIL' ? ", although one of the publisher's existing Accessibility contacts has the same email address" : ''}`,
    });
  });
};

/* ------------------------------------------------------------------------------------------------ */
/* The reduction                                                                                    */
/* ------------------------------------------------------------------------------------------------ */

const describeRecord = (index: number, recordReference: string | null) =>
  recordReference === null ? `product ${index}` : `product ${index} (${recordReference})`;

/** Every ProductContact of a Product: those of its PublishingDetail, then those of each ProductSupply's market. */
const productContactsOf = (context: ProductContext, publishing: Occurrence | undefined): OnixProductContactFact[] => {
  const { record, locate } = context;

  return [
    ...children(publishing, 'ProductContact').map((contact) =>
      readProductContact(contact, { kind: 'PUBLISHING_DETAIL' }, locate),
    ),
    ...children(record, 'ProductSupply').flatMap((supply) => {
      const marketTerritories = children(supply, 'Market').flatMap((market) =>
        children(market, 'Territory').map((territory) => readTerritory(territory, locate)),
      );
      const scope: OnixProductContactScope = { kind: 'MARKET', productSupply: locate(supply.path), marketTerritories };

      return children(supply, 'MarketPublishingDetail').flatMap((marketPublishing) =>
        children(marketPublishing, 'ProductContact').map((contact) => readProductContact(contact, scope, locate)),
      );
    }),
  ];
};

/**
 * The canonical SalesRights and ProductContact reduction of one message: every Product's facts, and every finding
 * about them. Pure and deterministic: the same file always reduces to the same plan.
 */
export const reduceOnixSalesRights = (
  root: ExtendedONIXMessageRoot,
  sourcePlan: OnixSourcePlan,
  options: ReduceOnixSalesRightsOptions = {},
): OnixSalesRightsPlan => {
  const locate: Locate = (path) => ({ path, sourcePath: options.provenance?.sourcePathOf(path) ?? path });
  const findings = new SalesRightsFindings(locate);
  const productValues = toOnixArray(root.ONIXMessage?.Product);
  const recordByKey = new Map(sourcePlan.records.map((record) => [record.recordKey, record]));
  const products: Record<string, OnixProductSalesRights> = {};

  sourcePlan.products
    .flatMap((node) => {
      const record = recordByKey.get(node.representativeRecordKey);

      return record === undefined ? [] : [{ node, record }];
    })
    .sort((a, b) => a.record.index - b.record.index)
    .forEach(({ node, record }) => {
      const context: ProductContext = {
        productKey: node.productKey,
        groupKey: node.groupKey,
        record: { value: productValues[record.index - 1], path: record.path },
        describe: describeRecord(record.index, record.recordReference),
        locate,
        findings,
        options,
      };
      const before = new Set(findings.all().map(({ key }) => key));
      const [publishing] = children(context.record, 'PublishingDetail');
      const rights = reduceSalesRights(context, publishing);
      const markets = (options.commercial?.products[node.productKey]?.supplies ?? []).flatMap(({ markets: stated }) =>
        stated.flatMap(({ territory }) => (territory === null ? [] : [territory])),
      );

      compareMarkets(context, rights, markets);

      const productContacts = productContactsOf(context, publishing);

      reduceProductContacts(context, productContacts);

      products[node.productKey] = {
        productKey: node.productKey,
        groupKey: node.groupKey,
        salesRights: rights.salesRights,
        rowSalesRightsType: rights.rowSalesRightsType,
        productContacts,
        findingKeys: findings
          .all()
          .map(({ key }) => key)
          .filter((key) => !before.has(key)),
      };
    });

  return { products, findings: findings.all() };
};
