import isbn3 from 'isbn3';

import type { WorkId } from '@/src/entities/work/model/work.types';

import type { ImportIdentifier } from '../../types/importPreflight';
import {
  ONIX_RELATED_MATERIAL_ACKNOWLEDGED,
  ONIX_RELATION_OMIT,
  ONIX_RELATION_PROJECT,
  type OnixCitationFact,
  type OnixCitationIdentifierSelection,
  type OnixCitationInvalidIdentifier,
  type OnixCitationNormalisedIdentifier,
  type OnixComponentRelatedMaterialFact,
  type OnixExistingReference,
  type OnixExistingWorkRelation,
  type OnixPlanBlockerCode,
  type OnixPlannedReference,
  type OnixProductReferences,
  type OnixReferenceFindingCode,
  type OnixRelatedMaterialConstruct,
  type OnixRelatedMaterialDeclaration,
  type OnixRelatedMaterialFinding,
  type OnixRelatedMaterialPlan,
  type OnixRelatedMaterialTargetEvidence,
  type OnixRelatedMaterialWorkMatch,
  type OnixRelationEdge,
  type OnixRelationEndpoint,
  type OnixRelationOrdinal,
  type OnixRelationOutcome,
  type OnixRelationOutcomeKind,
  type OnixRelationSemantics,
  type OnixSourceLocation,
  type OnixSourcePlan,
  type OnixStatedIdentifier,
  type OnixTargetEvidence,
  type OnixWorkReferenceAction,
  type OnixWorkRelationType,
  type OnixWorkTargetAction,
} from '../../types/onixPlanning';
import { importIdentifierKey, normaliseDoi, normaliseIsbn } from '../../utils/importPreflight/identifiers';
import { canonicaliseDoi } from '../../utils/validations';
import type { ExtendedONIXMessageRoot, OnixText } from './interfaces';
import { getOnixText, toOnixArray } from './onix';
import type { ProvenanceResolver } from './validation/worker/provenance';

/**
 * The canonical RelatedMaterial relation graph and Reference planning of thoth-app#224 (APP-IMPORT-ONIX-REL-01B of #185),
 * under the approved RelatedMaterial decision (#179 proposal 5541586341, approval 5541683453), the Phase-A reconciliation
 * (5572448584), #185's compatibility amendments (5665489987, 5667191648) and #224 Specification Amendments 1 (5798149019)
 * and 2 (5812546990).
 *
 * `reduceOnixRelatedMaterial` runs after canonical source validation has permitted target planning, on the adapter value
 * bridged from the final normalised Reference XML, after #182 has grouped Products into Works. It reads the file alone:
 * every RelatedWork and RelatedProduct of every complete Product, kept apart and in source order, each read by its own
 * construct and code (rules 1-3, 7-20) and each identifier by its declared type alone (rule 23), and every RelatedProduct/34
 * citation as the Reference facts its declared identifiers state (rules 42-49).
 *
 * `resolveOnixRelatedMaterialTargets` then asks Thoth only what exact identity can answer - which existing Works, in any
 * publisher, a DOI or ISBN endpoint names, and what relations and References the existing Works the plan could relate or
 * attach to hold - read-only and after every deterministic source decision (rule 39).
 *
 * `resolveOnixRelations` and the Reference resolvers are pure: from the reduction, the grouped Work identities the resolver
 * decided, that evidence and the publisher's answers they reconcile every declaration into semantic edges between stable
 * Work identities (rules 21-34), decide every Reference sequence, and compare an attaching Product's with its existing
 * Work's (Amendment 1). Nothing here is inferred from a title, a contributor, a publisher, a DOI prefix, a lexical shape or
 * any similarity, and nothing here creates a Work relation: that stage is #187's.
 */

export type ReduceOnixRelatedMaterialOptions = {
  /** Maps canonical Reference paths back to the submitted source, for a Short-tag file. */
  readonly provenance?: ProvenanceResolver;
};

/* ------------------------------------------------------------------------------------------------ */
/* Codelists                                                                                        */
/* ------------------------------------------------------------------------------------------------ */

const MESSAGE_PATH = '/ONIXMessage[1]';

/** List 164 translation codes, the only automatic derivation mapping (rules 7-8, 11). */
const TRANSLATION_CODES: Readonly<Record<string, 'HAS_TRANSLATION' | 'IS_TRANSLATION_OF'>> = {
  '29': 'IS_TRANSLATION_OF',
  '49': 'HAS_TRANSLATION',
};

/** List 164 01 and 06: which Work the Product manifests, #182's grouping evidence (rule 9). */
const WORK_IDENTITY_CODES = new Set(['01', '06']);

/** List 164 98 and 99: LRM workarounds, never a Work relation (rule 12). */
const LRM_CODES = new Set(['98', '99']);

/**
 * List 51 part and replacement codes and the one Work relation each is projected as (rules 16-18; #224 Specification
 * Amendment 2 B): by itself between two exact, distinct Works whose identity the grouping has settled, and otherwise only
 * on the publisher's choice.
 */
const PRODUCT_RELATION_CODES: Readonly<Record<string, 'HAS_PART' | 'IS_PART_OF' | 'REPLACES' | 'IS_REPLACED_BY'>> = {
  '01': 'HAS_PART',
  '02': 'IS_PART_OF',
  '03': 'REPLACES',
  '05': 'IS_REPLACED_BY',
};

/**
 * The #182 findings that leave which Work a Product manifests, or which Work a group is, undecided: a record that
 * contradicts another of its Product, an ambiguous ISBN, several Work identities, an alternative format naming several
 * Products, conflicting Work DOIs or Thoth Work ids, or an inconsistent Thoth record identity. A generic Product-level
 * relation touching a Work one of them names is never projected by itself (#224 Specification Amendment 2 B.2).
 */
const GROUPING_UNSETTLED: ReadonlySet<OnixPlanBlockerCode> = new Set<OnixPlanBlockerCode>([
  'PRODUCT_RECORD_CONFLICT',
  'ISBN_AMBIGUOUS',
  'MULTIPLE_WORK_IDENTITIES',
  'ALTERNATIVE_FORMAT_AMBIGUOUS',
  'WORK_DOI_CONFLICT',
  'THOTH_WORK_ID_CONFLICT',
  'THOTH_PROFILE_INCONSISTENT',
]);

const ALTERNATIVE_FORMAT_CODE = '06';
const CITES_CODE = '34';
const IS_CITED_BY_CODE = '35';
const OTHER_LANGUAGE_CODE = '11';

/** List 5 / List 16 identifier types read by their declared meaning (rule 23). */
const PROPRIETARY_TYPE = '01';
const ISBN_10_TYPE = '02';
const GTIN_13_TYPE = '03';
const DOI_TYPE = '06';
const ISBN_13_TYPE = '15';
const ISSN_13_TYPE = '34';

/** Thoth's own exporter's scheme names, decoded only under the verified compatibility profile (rules 22.4, 46). */
const THOTH_WORK_ID_NAME = 'thoth-work-id';
const THOTH_PUBLICATION_ID_NAME = 'thoth-publication-id';
const THOTH_CITATION_NAME = 'unstructured citation';

const UUID_URN = /^urn:uuid:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

const INVERSE: Readonly<Record<OnixWorkRelationType, OnixWorkRelationType>> = {
  HAS_TRANSLATION: 'IS_TRANSLATION_OF',
  IS_TRANSLATION_OF: 'HAS_TRANSLATION',
  HAS_PART: 'IS_PART_OF',
  IS_PART_OF: 'HAS_PART',
  REPLACES: 'IS_REPLACED_BY',
  IS_REPLACED_BY: 'REPLACES',
};

/** The relation families: a pair stating two types of one family states opposite directions of one relation. */
const FAMILY: Readonly<Record<OnixWorkRelationType, string>> = {
  HAS_TRANSLATION: 'TRANSLATION',
  IS_TRANSLATION_OF: 'TRANSLATION',
  HAS_PART: 'PART',
  IS_PART_OF: 'PART',
  REPLACES: 'REPLACEMENT',
  IS_REPLACED_BY: 'REPLACEMENT',
};

/** Every Thoth relation type an existing edge may hold, and its inverse: a pair holds one relation, whatever its type. */
const EXISTING_INVERSE: Readonly<Record<string, string>> = {
  ...INVERSE,
  HAS_CHILD: 'IS_CHILD_OF',
  IS_CHILD_OF: 'HAS_CHILD',
};

const RELATION_WORDS: Readonly<Record<OnixWorkRelationType, string>> = {
  HAS_TRANSLATION: 'has the translation',
  IS_TRANSLATION_OF: 'is a translation of',
  HAS_PART: 'has the part',
  IS_PART_OF: 'is a part of',
  REPLACES: 'replaces',
  IS_REPLACED_BY: 'is replaced by',
};

/* ------------------------------------------------------------------------------------------------ */
/* Reading the adapter                                                                              */
/* ------------------------------------------------------------------------------------------------ */

type Occurrence = { readonly value: unknown; readonly path: string };

type Locate = (path: string) => OnixSourceLocation;

const isElement = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Every occurrence of a named child, in source order, with its canonical path; an empty element is an occurrence. */
const children = (parent: Occurrence | undefined, name: string): Occurrence[] => {
  if (parent === undefined || !isElement(parent.value) || !(name in parent.value)) return [];

  const child = parent.value[name];

  return (Array.isArray(child) ? child : [child])
    .map((value, index) => ({ value: value as unknown, path: `${parent.path}/${name}[${index + 1}]` }))
    .filter(({ value }) => value !== undefined && value !== null);
};

const textOf = (occurrence: Occurrence | undefined): string =>
  occurrence === undefined ? '' : getOnixText(occurrence.value as OnixText);

const childText = (parent: Occurrence | undefined, name: string): string | null => {
  const text = textOf(children(parent, name)[0]);

  return text.length > 0 ? text : null;
};

/** Serialises with object keys sorted, so two equal adapter values serialise alike whatever their key order. */
const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;

  if (isElement(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`;
  }

  return value === undefined ? 'null' : JSON.stringify(value);
};

/**
 * A short fingerprint of plain data (cyrb53), as the other canonical reductions key their findings: equal data always
 * gives the same fingerprint, so a key built from one depends on the file alone. It tells facts apart; it is never an
 * identity.
 */
const fingerprint = (value: unknown): string => {
  const text = typeof value === 'string' ? value : canonicalJson(value);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;

  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);

    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
};

const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

const identifiersOf = (
  composite: Occurrence,
  element: 'WorkIdentifier' | 'ProductIdentifier',
  typeElement: 'WorkIDType' | 'ProductIDType',
  locate: Locate,
): OnixStatedIdentifier[] =>
  children(composite, element).map((identifier) => ({
    ...locate(identifier.path),
    type: childText(identifier, typeElement) ?? '',
    typeName: childText(identifier, 'IDTypeName'),
    value: childText(identifier, 'IDValue') ?? '',
  }));

/* ------------------------------------------------------------------------------------------------ */
/* Identifiers, by declared type alone                                                              */
/* ------------------------------------------------------------------------------------------------ */

/** The ISBN-13 a declared ISBN-13 or ISBN-10 is, by the app's own ISBN parser, or null where it is none. */
const isbn13Of = (type: string, value: string): string | null => {
  const parsed = isbn3.parse(value);

  if (!parsed?.isValid || !parsed.isbn13) return null;
  if (type === ISBN_13_TYPE) return parsed.isIsbn13 ? parsed.isbn13 : null;
  if (type === ISBN_10_TYPE) return parsed.isIsbn10 ? parsed.isbn13 : null;

  return null;
};

/** Whether thirteen digits carry a valid GTIN check digit. */
const isValidGtin13 = (digits: string): boolean => {
  if (!/^\d{13}$/.test(digits)) return false;

  const sum = [...digits.slice(0, 12)].reduce(
    (total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3),
    0,
  );

  return (10 - (sum % 10)) % 10 === Number(digits[12]);
};

/**
 * The ISSN an ISSN-13 (List 5 34) states: `977`, the seven ISSN digits, two variant digits and a GTIN check digit, with an
 * optional 2- or 5-digit add-on. The ISSN is the seven digits with their own check digit, exactly as the ISSN standard
 * derives it; the variant and add-on digits are not part of an ISSN and are reported as what the Reference cannot hold.
 */
const issnOfIssn13 = (value: string): { readonly issn: string; readonly dropped: string | null } | null => {
  if (!/^\d{13}(\d{2}|\d{5})?$/.test(value)) return null;

  const gtin = value.slice(0, 13);

  if (!gtin.startsWith('977') || !isValidGtin13(gtin)) return null;

  const seven = gtin.slice(3, 10);
  const sum = [...seven].reduce((total, digit, index) => total + Number(digit) * (8 - index), 0);
  const check = (11 - (sum % 11)) % 11;
  const variant = gtin.slice(10, 12);
  const addOn = value.slice(13);
  const dropped = [variant === '00' ? '' : `variant ${variant}`, addOn.length > 0 ? `add-on ${addOn}` : '']
    .filter((part) => part.length > 0)
    .join(', ');

  return {
    issn: `${seven.slice(0, 4)}-${seven.slice(4)}${check === 10 ? 'X' : String(check)}`,
    dropped: dropped.length > 0 ? dropped : null,
  };
};

const isThothCitationIdentifier = ({ type, typeName }: Pick<OnixStatedIdentifier, 'type' | 'typeName'>) =>
  type === PROPRIETARY_TYPE && (typeName ?? '').trim().toLowerCase() === THOTH_CITATION_NAME;

/**
 * One value out of several statements of it: none, one (compared by `compareAs`, the spelling kept chosen by sorting, never
 * by position), or several distinct ones, none chosen.
 */
const selectionOf = (
  stated: readonly { readonly value: string; readonly location: OnixSourceLocation }[],
  compareAs: (value: string) => string = (value) => value,
): OnixCitationIdentifierSelection => {
  if (stated.length === 0) return { kind: 'NONE' };

  const spellings = new Map<string, string[]>();

  stated.forEach(({ value }) => spellings.set(compareAs(value), [...(spellings.get(compareAs(value)) ?? []), value]));

  const values = [...spellings.keys()].sort(byText).map((key) => [...(spellings.get(key) as string[])].sort(byText)[0]);
  const locations = stated.map(({ location }) => location);

  return values.length === 1 ? { kind: 'VALUE', value: values[0], locations } : { kind: 'CONFLICT', values, locations };
};

const locationOf = ({ path, sourcePath }: OnixSourceLocation): OnixSourceLocation => ({ path, sourcePath });

/** The Reference facts one RelatedProduct/34's identifiers state, each by its declared type alone (rules 44-47). */
const citationFactOf = (declaration: OnixRelatedMaterialDeclaration, ordinal: number): OnixCitationFact => {
  const dois: { value: string; location: OnixSourceLocation }[] = [];
  const isbns: { value: string; location: OnixSourceLocation }[] = [];
  const issns: { value: string; location: OnixSourceLocation }[] = [];
  const citations: { value: string; location: OnixSourceLocation }[] = [];
  const thothCitationIdentifiers: OnixStatedIdentifier[] = [];
  const invalid: OnixCitationInvalidIdentifier[] = [];
  const normalised: OnixCitationNormalisedIdentifier[] = [];
  const unmapped: OnixStatedIdentifier[] = [];

  declaration.identifiers.forEach((identifier) => {
    const { type, value } = identifier;
    const location = locationOf(identifier);

    if (type === DOI_TYPE) {
      const doi = canonicaliseDoi(value);

      if (doi.length === 0) invalid.push({ ...identifier, field: 'doi' });
      else dois.push({ value: doi, location });
    } else if (type === ISBN_13_TYPE || type === ISBN_10_TYPE) {
      const isbn = isbn13Of(type, value);

      if (isbn === null) {
        invalid.push({ ...identifier, field: 'isbn' });
      } else {
        isbns.push({ value: isbn, location });

        if (type === ISBN_10_TYPE) normalised.push({ ...identifier, field: 'isbn', normalised: isbn, dropped: null });
      }
    } else if (type === ISSN_13_TYPE) {
      const issn = issnOfIssn13(value);

      if (issn === null) {
        invalid.push({ ...identifier, field: 'issn' });
      } else {
        issns.push({ value: issn.issn, location });
        normalised.push({ ...identifier, field: 'issn', normalised: issn.issn, dropped: issn.dropped });
      }
    } else if (isThothCitationIdentifier(identifier)) {
      thothCitationIdentifiers.push(identifier);

      if (value.length > 0) citations.push({ value, location });
    } else {
      unmapped.push(identifier);
    }
  });

  return {
    ...locationOf(declaration),
    citationKey: `${declaration.productKey}|${declaration.codeLocation.path}`,
    productKey: declaration.productKey,
    groupKey: declaration.groupKey,
    ordinal,
    identifiers: declaration.identifiers,
    // DOIs compare case-insensitively, as Thoth compares them.
    doi: selectionOf(dois, (value) => value.toLowerCase()),
    isbn: selectionOf(isbns),
    issn: selectionOf(issns, (value) => value.toUpperCase()),
    thothCitation: selectionOf(citations),
    thothCitationIdentifiers,
    invalid,
    normalised,
    unmapped,
    binding: declaration.binding,
  };
};

/* ------------------------------------------------------------------------------------------------ */
/* The reduction                                                                                    */
/* ------------------------------------------------------------------------------------------------ */

const semanticsOf = (construct: OnixRelatedMaterialConstruct, code: string): OnixRelationSemantics => {
  if (construct === 'RELATED_WORK') {
    if (WORK_IDENTITY_CODES.has(code)) return { kind: 'WORK_IDENTITY' };
    if (TRANSLATION_CODES[code] !== undefined) return { kind: 'TRANSLATION', relationType: TRANSLATION_CODES[code] };
    if (LRM_CODES.has(code)) return { kind: 'LRM_WORKAROUND' };

    return { kind: 'UNREPRESENTABLE' };
  }

  if (code === ALTERNATIVE_FORMAT_CODE) return { kind: 'GROUPING_EVIDENCE' };
  if (code === CITES_CODE) return { kind: 'CITATION' };
  if (code === IS_CITED_BY_CODE) return { kind: 'CITED_BY' };
  if (code === OTHER_LANGUAGE_CODE) return { kind: 'OTHER_LANGUAGE_VERSION' };
  if (PRODUCT_RELATION_CODES[code] !== undefined) {
    return { kind: 'PRODUCT_RELATION', relationType: PRODUCT_RELATION_CODES[code] };
  }

  return { kind: 'UNREPRESENTABLE' };
};

/**
 * The canonical RelatedMaterial reduction of one message: every declaration of every complete Product, read from its
 * representative record, and every RelatedProduct/34 citation - pure, deterministic and network-free.
 */
export const reduceOnixRelatedMaterial = (
  root: ExtendedONIXMessageRoot,
  sourcePlan: OnixSourcePlan,
  options: ReduceOnixRelatedMaterialOptions = {},
): OnixRelatedMaterialPlan => {
  const locate: Locate = (path) => ({ path, sourcePath: options.provenance?.sourcePathOf(path) ?? path });
  const products = toOnixArray(root.ONIXMessage?.Product).filter((product) => !!product && typeof product === 'object');
  const recordByKey = new Map(sourcePlan.records.map((record) => [record.recordKey, record]));
  const declarations: OnixRelatedMaterialDeclaration[] = [];
  const citations: Record<string, OnixCitationFact[]> = {};
  const componentFacts: OnixComponentRelatedMaterialFact[] = [];

  sourcePlan.products
    .map((node) => ({ node, record: recordByKey.get(node.representativeRecordKey) }))
    .filter((entry): entry is { node: typeof entry.node; record: NonNullable<typeof entry.record> } => !!entry.record)
    .sort((a, b) => a.record.index - b.record.index)
    .forEach(({ node, record }) => {
      const product: Occurrence = {
        value: products[record.index - 1],
        path: `${MESSAGE_PATH}/Product[${record.index}]`,
      };
      const [material] = children(product, 'RelatedMaterial');
      const own: OnixRelatedMaterialDeclaration[] = [];
      const declare = (
        composite: Occurrence,
        construct: OnixRelatedMaterialConstruct,
        code: Occurrence,
        identifiers: readonly OnixStatedIdentifier[],
      ) => {
        const codeText = textOf(code);

        own.push({
          ...locate(composite.path),
          declarationKey: `${node.productKey}|${code.path}`,
          productKey: node.productKey,
          groupKey: node.groupKey,
          construct,
          code: codeText,
          codeLocation: locate(code.path),
          recordIndex: record.index,
          order: own.length + 1,
          identifiers,
          semantics: semanticsOf(construct, codeText),
          binding: fingerprint({ path: composite.path, code: code.path, value: composite.value }),
        });
      };

      children(material, 'RelatedWork').forEach((composite) => {
        const identifiers = identifiersOf(composite, 'WorkIdentifier', 'WorkIDType', locate);

        children(composite, 'WorkRelationCode').forEach((code) =>
          declare(composite, 'RELATED_WORK', code, identifiers),
        );
      });
      children(material, 'RelatedProduct').forEach((composite) => {
        const identifiers = identifiersOf(composite, 'ProductIdentifier', 'ProductIDType', locate);

        // ProductRelationCode repeats: one related product, several relations, each read on its own.
        children(composite, 'ProductRelationCode').forEach((code) =>
          declare(composite, 'RELATED_PRODUCT', code, identifiers),
        );
      });

      declarations.push(...own);
      citations[node.productKey] = own
        .filter(({ semantics }) => semantics.kind === 'CITATION')
        .map((declaration, index) => citationFactOf(declaration, index + 1));

      children(children(product, 'ContentDetail')[0], 'ContentItem').forEach((item) => {
        (['RelatedWork', 'RelatedProduct'] as const).forEach((element) =>
          children(item, element).forEach((composite) =>
            componentFacts.push({
              ...locate(composite.path),
              factKey: `${node.productKey}|${composite.path}`,
              productKey: node.productKey,
              groupKey: node.groupKey,
              componentPath: item.path,
              construct: element === 'RelatedWork' ? 'RELATED_WORK' : 'RELATED_PRODUCT',
              codes: children(composite, element === 'RelatedWork' ? 'WorkRelationCode' : 'ProductRelationCode').map(
                textOf,
              ),
              binding: fingerprint({ path: composite.path, value: composite.value }),
            }),
          ),
        );
      });
    });

  return { declarations, citations, componentFacts };
};

/* ------------------------------------------------------------------------------------------------ */
/* Exact endpoints                                                                                  */
/* ------------------------------------------------------------------------------------------------ */

/** One key an endpoint identifier may match under, and the exact Thoth lookup it may be resolved by. */
type EndpointProbe = {
  readonly key: string;
  readonly scope: 'WORK' | 'PRODUCT';
  readonly lookup: ImportIdentifier | null;
};

const doiLookup = (doi: string): ImportIdentifier | null => {
  const value = normaliseDoi(doi);

  return value === null ? null : { basis: 'doi', value };
};

const isbnLookup = (isbn: string): ImportIdentifier | null => {
  const value = normaliseIsbn(isbn);

  return value === null ? null : { basis: 'isbn', value };
};

/** A relation-bearing declaration: one whose endpoint is resolved at all. */
const isRelationCandidate = ({ semantics }: OnixRelatedMaterialDeclaration) =>
  semantics.kind === 'TRANSLATION' ||
  semantics.kind === 'PRODUCT_RELATION' ||
  semantics.kind === 'OTHER_LANGUAGE_VERSION';

/**
 * Whether a Product-level relation is Thoth's own exported shape, decoded deterministically under the verified or
 * confirmed profile (rule 18; 5545771626 rule 94): Thoth's exporter writes a part or replacement relation as RelatedProduct
 * 01/02/03/05 whose one kind of identifier, ProductIDType 06, is the related Work's DOI.
 */
const isThothProfileProductRelation = (declaration: OnixRelatedMaterialDeclaration, profileActive: boolean) =>
  profileActive &&
  declaration.semantics.kind === 'PRODUCT_RELATION' &&
  declaration.identifiers.length > 0 &&
  declaration.identifiers.every(({ type }) => type === DOI_TYPE);

/**
 * The keys and exact lookups one declaration's identifiers resolve by, each by its declared type alone (rules 21-23).
 *
 * A Work identifier matches the same-import Work that states it, or an existing Work by DOI, or by the ISBN of a
 * manifestation whose Publication identifies it (List 16 15 and 02). A Product identifier matches a same-import Product by
 * its strong identity - its ISBN/GTIN-13 family, or its Product DOI exactly as declared - and an existing Work only through
 * a Publication's ISBN: Thoth stores no Product DOI. A proprietary identifier matches only Thoth's own native identity under
 * the verified profile; any other is no strong identifier and matches nothing.
 */
const endpointProbesOf = (declaration: OnixRelatedMaterialDeclaration, profileActive: boolean): EndpointProbe[] =>
  declaration.identifiers.flatMap(({ type, typeName, value }): EndpointProbe[] => {
    if (value.length === 0) return [];

    if (declaration.construct === 'RELATED_WORK') {
      if (type === DOI_TYPE) {
        const doi = canonicaliseDoi(value);

        return doi.length === 0 ? [] : [{ key: `workdoi:${doi.toLowerCase()}`, scope: 'WORK', lookup: doiLookup(doi) }];
      }

      if (type === ISBN_13_TYPE || type === ISBN_10_TYPE) {
        const isbn = isbn13Of(type, value);

        return isbn === null
          ? []
          : [
              { key: `workisbn:${isbn}`, scope: 'WORK', lookup: isbnLookup(isbn) },
              { key: `gtin13:${isbn}`, scope: 'PRODUCT', lookup: null },
            ];
      }

      // Any other declared Work identifier matches only the same identifier a Work of this file declares (#182 aliases);
      // Thoth's native Work id also matches the Work the profile decoded it for, under the verified profile alone.
      const alias: EndpointProbe = { key: `work:${type}:${typeName ?? ''}:${value}`, scope: 'WORK', lookup: null };
      const uuid = UUID_URN.exec(value)?.[1].toLowerCase();

      return profileActive && type === PROPRIETARY_TYPE && typeName === THOTH_WORK_ID_NAME && uuid !== undefined
        ? [{ key: `thothwork:${uuid}`, scope: 'WORK', lookup: null }, alias]
        : [alias];
    }

    if ((type === ISBN_13_TYPE || type === GTIN_13_TYPE) && /^\d{13}$/.test(value)) {
      const valid = isbn3.parse(value);

      return [
        {
          key: `gtin13:${value}`,
          scope: 'PRODUCT',
          lookup: valid?.isValid && valid.isIsbn13 ? isbnLookup(value) : null,
        },
      ];
    }

    if (type === ISBN_10_TYPE) {
      const isbn = isbn13Of(type, value);

      return isbn === null ? [] : [{ key: `gtin13:${isbn}`, scope: 'PRODUCT', lookup: isbnLookup(isbn) }];
    }

    if (type === DOI_TYPE) {
      const doi = canonicaliseDoi(value);

      if (doi.length === 0) return [];

      // Under Thoth's own profile this is the related Work's DOI; anywhere else it identifies a Product, never a Work.
      return isThothProfileProductRelation(declaration, profileActive)
        ? [{ key: `workdoi:${doi.toLowerCase()}`, scope: 'WORK', lookup: doiLookup(doi) }]
        : [{ key: `doi:${doi.toLowerCase()}`, scope: 'PRODUCT', lookup: null }];
    }

    if (type === PROPRIETARY_TYPE && typeName === THOTH_PUBLICATION_ID_NAME) {
      const uuid = UUID_URN.exec(value)?.[1].toLowerCase();

      return profileActive && uuid !== undefined ? [{ key: `thothpub:${uuid}`, scope: 'PRODUCT', lookup: null }] : [];
    }

    return [];
  });

/**
 * The stable same-import Work identities endpoint keys match (rule 22.1): every Work alias, Work DOI and native Work id a
 * Work group of the file holds, and every strong identity or declared identifier one of its Products holds.
 */
const sameImportIndex = (sourcePlan: OnixSourcePlan) => {
  const byWorkKey = new Map<string, Set<string>>();
  const byProductKey = new Map<string, Set<string>>();
  const index = (map: Map<string, Set<string>>, key: string, groupKey: string) =>
    map.set(key, (map.get(key) ?? new Set()).add(groupKey));

  sourcePlan.groups.forEach((group) => {
    group.aliases.forEach(({ key }) => index(byWorkKey, key, group.groupKey));
    if (group.workDoi.kind === 'DOI') index(byWorkKey, `workdoi:${group.workDoi.doi.toLowerCase()}`, group.groupKey);
    if (group.thothWorkId !== null) index(byWorkKey, `thothwork:${group.thothWorkId}`, group.groupKey);
  });
  sourcePlan.products.forEach(({ identityKeys, matchKeys, groupKey }) =>
    [...identityKeys, ...matchKeys].forEach((key) => index(byProductKey, key, groupKey)),
  );

  /** The groups of the file the probes name, by key, once each and in a stable order. */
  return (probes: readonly EndpointProbe[]): string[] =>
    unique(
      probes.flatMap(({ key, scope }) => [...((scope === 'WORK' ? byWorkKey : byProductKey).get(key) ?? [])]),
    ).sort(byText);
};

/**
 * Every exact identifier the plan's relation endpoints may be looked up by, once each, in a stable order: never one of a
 * declaration a Work of the file already answers, since same-import identity always comes first (rule 22.1).
 */
export const onixRelatedMaterialLookupIdentifiers = (
  plan: OnixRelatedMaterialPlan,
  sourcePlan: OnixSourcePlan,
): ImportIdentifier[] => {
  const profileGroups = new Set(
    sourcePlan.groups.filter(({ compatibility }) => compatibility === 'THOTH_PROFILE').map(({ groupKey }) => groupKey),
  );
  const identifiers = new Map<string, ImportIdentifier>();
  const sameImport = sameImportIndex(sourcePlan);

  plan.declarations.filter(isRelationCandidate).forEach((declaration) => {
    // Both readings where the profile could apply: which one does is only known once the profile is verified.
    [false, ...(profileGroups.has(declaration.groupKey) ? [true] : [])].forEach((profileActive) => {
      const probes = endpointProbesOf(declaration, profileActive);

      if (sameImport(probes).length > 0) return;

      probes.forEach(({ lookup }) => {
        if (lookup !== null) identifiers.set(importIdentifierKey(lookup), lookup);
      });
    });
  });

  return [...identifiers.entries()].sort(([a], [b]) => byText(a, b)).map(([, identifier]) => identifier);
};

export type OnixRelatedMaterialLookup = {
  /** Existing Works in any publisher carrying each exact identifier, post-filtered exactly, keyed by `importIdentifierKey`. */
  readonly findWorksGlobally: (
    identifiers: readonly ImportIdentifier[],
  ) => Promise<ReadonlyMap<string, readonly OnixRelatedMaterialWorkMatch[]>>;
  /** Every relation one existing Work holds, read whole. */
  readonly getWorkRelations: (workId: WorkId) => Promise<readonly OnixExistingWorkRelation[]>;
  /** Every Reference one existing Work holds, read whole. */
  readonly getWorkReferences: (workId: WorkId) => Promise<readonly OnixExistingReference[]>;
};

/**
 * What Thoth holds for the plan's RelatedMaterial, read-only: the existing Works each endpoint identifier names in any
 * publisher, and the relations and References of the existing Works the plan's groups resolved to - the only Works a
 * relation of this file could already join to another existing Work, or a Product attach to. A question that cannot be
 * asked or answered throws: it is never read as "nothing matched".
 */
export const resolveOnixRelatedMaterialTargets = async (
  plan: OnixRelatedMaterialPlan,
  sourcePlan: OnixSourcePlan,
  targets: OnixTargetEvidence,
  lookup: OnixRelatedMaterialLookup,
): Promise<OnixRelatedMaterialTargetEvidence> => {
  const identifiers = onixRelatedMaterialLookupIdentifiers(plan, sourcePlan);
  const matches = identifiers.length === 0 ? new Map() : await lookup.findWorksGlobally(identifiers);
  const workIds = unique(targets.works.map(({ workId }) => workId)).sort(byText);
  const needsRelations = plan.declarations.some(isRelationCandidate);
  const needsReferences = Object.values(plan.citations).some((citations) => citations.length > 0);
  const [relations, references] = await Promise.all([
    needsRelations
      ? Promise.all(workIds.map(async (workId) => [workId, await lookup.getWorkRelations(workId)] as const))
      : [],
    needsReferences
      ? Promise.all(workIds.map(async (workId) => [workId, await lookup.getWorkReferences(workId)] as const))
      : [],
  ]);

  return {
    identifiers: identifiers.map((identifier) => ({
      ...identifier,
      works: [...(matches.get(importIdentifierKey(identifier)) ?? [])].sort((a, b) => byText(a.workId, b.workId)),
    })),
    relations: Object.fromEntries(relations),
    references: Object.fromEntries(references),
  };
};

/* ------------------------------------------------------------------------------------------------ */
/* Findings                                                                                         */
/* ------------------------------------------------------------------------------------------------ */

type FindingInput = Omit<OnixRelatedMaterialFinding, 'key' | 'resolution' | 'detail' | 'locations'> & {
  readonly locations: readonly OnixSourceLocation[];
  /** What tells this finding apart from another of the same code about the same scope: always the exact facts. */
  readonly discriminator: string;
  readonly detail?: OnixRelatedMaterialFinding['detail'];
  readonly resolution?: OnixRelatedMaterialFinding['resolution'];
};

const NONE = { kind: 'NONE' } as const;
const ACKNOWLEDGE = { kind: 'ACKNOWLEDGE' } as const;

class RelatedMaterialFindings {
  private readonly byKey = new Map<string, OnixRelatedMaterialFinding>();

  add({
    discriminator,
    resolution = NONE,
    detail = {},
    locations,
    ...input
  }: FindingInput): OnixRelatedMaterialFinding {
    const key = [input.family, input.code, input.productKey ?? input.groupKey, discriminator].join('|');
    const existing = this.byKey.get(key);

    if (existing !== undefined) return existing;

    const finding: OnixRelatedMaterialFinding = {
      ...input,
      key,
      locations: [...new Map(locations.map((location) => [location.path, locationOf(location)])).values()],
      detail,
      resolution,
    };

    this.byKey.set(key, finding);

    return finding;
  }

  all(): OnixRelatedMaterialFinding[] {
    return [...this.byKey.values()];
  }
}

/** Whether an answer is one a relation or Reference finding offers: an option it lists, or its acknowledgement. */
export const isOfferedOnixRelatedMaterialAnswer = (
  finding: Pick<OnixRelatedMaterialFinding, 'resolution'>,
  answer: string,
): boolean => {
  switch (finding.resolution.kind) {
    case 'CHOICE':
      return finding.resolution.options.some(({ key }) => key === answer);
    case 'ACKNOWLEDGE':
      return answer === ONIX_RELATED_MATERIAL_ACKNOWLEDGED;
    default:
      return false;
  }
};

/** The answer a finding holds, where it offers it; any other answer decides nothing. */
const answerOf = (
  finding: OnixRelatedMaterialFinding,
  choices: Readonly<Record<string, string>> | undefined,
): string | null => {
  const answer = choices?.[finding.key];

  return answer !== undefined && isOfferedOnixRelatedMaterialAnswer(finding, answer) ? answer : null;
};

/** Whether a blocking finding still holds the plan: it offers no answer, or none it offers was given. */
const isPending = (finding: OnixRelatedMaterialFinding, choices: Readonly<Record<string, string>> | undefined) =>
  finding.blocking && answerOf(finding, choices) === null;

const describeRecord = (index: number, recordReference: string | null) =>
  recordReference === null ? `product ${index}` : `product ${index} (${recordReference})`;

/* ------------------------------------------------------------------------------------------------ */
/* The relation graph                                                                               */
/* ------------------------------------------------------------------------------------------------ */

/** What the resolver decided about one Work group, which relation endpoints are identified by. */
export type OnixRelationGroupState = {
  readonly groupKey: string;
  readonly target: OnixWorkTargetAction | null;
  readonly existingWorkId: WorkId | null;
  readonly existingImprintId: string | null;
  /** The candidate id the group's new Work has in the plan, once adapted. */
  readonly plannedWorkId: WorkId | null;
  /** Whether Thoth's compatibility profile is verified or confirmed for the group (5545771626 rules 88-89). */
  readonly thothProfileActive: boolean;
  /** The language codes the Work holds or is planned with, where known: the evidence a translation direction may rest on. */
  readonly languageCodes: readonly string[] | null;
  /** The Product the group's components are planned from, and whether the group's Work is one this import creates. */
  readonly representativeProductKey: string | null;
};

export type ResolveOnixRelationsContext = {
  readonly sourcePlan: OnixSourcePlan;
  readonly groups: ReadonlyMap<string, OnixRelationGroupState>;
  /** Absent where Thoth was never asked: then no endpoint outside the file, and no existing edge, is ever assumed. */
  readonly evidence?: OnixRelatedMaterialTargetEvidence;
  /** The active publisher's imprints: the authorization boundary an existing endpoint must sit inside (rule 25). */
  readonly imprintIds: ReadonlySet<string>;
  readonly choices?: Readonly<Record<string, string>>;
};

export type OnixResolvedRelations = {
  readonly outcomes: readonly OnixRelationOutcome[];
  readonly edges: readonly OnixRelationEdge[];
  readonly findings: readonly OnixRelatedMaterialFinding[];
  /** The blocking findings still unanswered, or answered with a value the plan cannot use. */
  readonly pendingFindingKeys: readonly string[];
};

type EndpointResolution =
  | { readonly kind: 'RESOLVED'; readonly endpoint: OnixRelationEndpoint }
  | { readonly kind: 'AMBIGUOUS'; readonly candidates: readonly string[] }
  | { readonly kind: 'UNRESOLVED'; readonly reason: 'NO_STRONG_IDENTIFIER' | 'NO_MATCH' }
  | { readonly kind: 'NOT_LOOKED_UP' };

const identityOf = (endpoint: OnixRelationEndpoint): string =>
  endpoint.kind === 'EXISTING_WORK' ? `work:${endpoint.workId}` : `group:${endpoint.groupKey}`;

/** A relation candidate: one declaration read as one relation from its own Work to its endpoint. */
type Candidate = {
  readonly declaration: OnixRelatedMaterialDeclaration;
  readonly from: OnixRelationEndpoint;
  readonly to: OnixRelationEndpoint;
  readonly relationType: OnixWorkRelationType;
  readonly basis: OnixRelationEdge['basis'];
};

const bySource = (a: OnixRelatedMaterialDeclaration, b: OnixRelatedMaterialDeclaration) =>
  a.recordIndex - b.recordIndex || a.order - b.order;

/**
 * Reconciles every RelatedMaterial declaration into semantic edges between stable Work identities (rules 21-36): exact
 * endpoints only, one edge per Work pair however many declarations state it or its inverse, a contradiction or a second
 * relation between one pair blocked, an existing exact edge satisfied and a conflicting one blocked, and every planned
 * edge's ordinal its source appearance within its type. Every declaration comes out with an outcome, so none is ever
 * silently left out, and every edge the plan would create waits on #187.
 */
export const resolveOnixRelations = (
  plan: OnixRelatedMaterialPlan,
  context: ResolveOnixRelationsContext,
): OnixResolvedRelations => {
  const { sourcePlan, groups, evidence, imprintIds, choices } = context;
  const findings = new RelatedMaterialFindings();
  const outcomes = new Map<string, OnixRelationOutcome>();
  const recordByKey = new Map(sourcePlan.records.map((record) => [record.recordKey, record]));
  const productByKey = new Map(sourcePlan.products.map((node) => [node.productKey, node]));
  const describe = (productKey: string) => {
    const record = recordByKey.get(productByKey.get(productKey)?.representativeRecordKey ?? '');

    return record === undefined ? 'a Product' : describeRecord(record.index, record.recordReference);
  };

  const sameImport = sameImportIndex(sourcePlan);

  const groupEndpoint = (groupKey: string): OnixRelationEndpoint => {
    const state = groups.get(groupKey);

    return state?.target === 'EXISTING_WORK' && state.existingWorkId !== null
      ? { kind: 'EXISTING_WORK', workId: state.existingWorkId, groupKey, imprintId: state.existingImprintId }
      : { kind: 'PLANNED_WORK', groupKey, plannedWorkId: state?.plannedWorkId ?? null };
  };
  const groupOfExisting = (workId: WorkId) =>
    [...groups.values()].find((state) => state.target === 'EXISTING_WORK' && state.existingWorkId === workId);

  const resolveEndpoint = (declaration: OnixRelatedMaterialDeclaration, profileActive: boolean): EndpointResolution => {
    const probes = endpointProbesOf(declaration, profileActive);

    if (probes.length === 0) return { kind: 'UNRESOLVED', reason: 'NO_STRONG_IDENTIFIER' };

    // 1. Stable same-import Work identity, before anything Thoth holds (rule 22.1).
    const inFile = sameImport(probes);

    if (inFile.length > 1) return { kind: 'AMBIGUOUS', candidates: inFile.map((groupKey) => `group:${groupKey}`) };
    if (inFile.length === 1) return { kind: 'RESOLVED', endpoint: groupEndpoint(inFile[0]) };

    // 2-3. An exact existing Work, by a Work identifier or a Publication's ISBN (rules 22.2-22.3).
    const lookups = probes.flatMap(({ lookup }) => (lookup === null ? [] : [lookup]));

    if (lookups.length === 0) return { kind: 'UNRESOLVED', reason: 'NO_MATCH' };

    const resolutions = lookups.map((lookup) =>
      evidence?.identifiers.find(({ basis, value }) => basis === lookup.basis && value === lookup.value),
    );

    if (evidence === undefined || resolutions.some((resolution) => resolution === undefined)) {
      return { kind: 'NOT_LOOKED_UP' };
    }

    const matches = new Map(
      resolutions.flatMap((resolution) => resolution?.works ?? []).map((match) => [match.workId, match]),
    );

    if (matches.size > 1)
      return { kind: 'AMBIGUOUS', candidates: [...matches.keys()].sort(byText).map((id) => `work:${id}`) };
    if (matches.size === 0) return { kind: 'UNRESOLVED', reason: 'NO_MATCH' };

    const [match] = [...matches.values()];

    return {
      kind: 'RESOLVED',
      endpoint: {
        kind: 'EXISTING_WORK',
        workId: match.workId,
        groupKey: groupOfExisting(match.workId)?.groupKey ?? null,
        imprintId: match.imprintId,
      },
    };
  };

  const languagesOf = (endpoint: OnixRelationEndpoint): readonly string[] | null => {
    if (endpoint.groupKey !== null && groups.get(endpoint.groupKey)?.languageCodes) {
      return groups.get(endpoint.groupKey)?.languageCodes ?? null;
    }

    if (endpoint.kind !== 'EXISTING_WORK') return null;

    const match = evidence?.identifiers.flatMap(({ works }) => works).find(({ workId }) => workId === endpoint.workId);

    return match === undefined ? null : match.languageCodes;
  };

  const describeEndpoint = (endpoint: OnixRelationEndpoint) =>
    endpoint.kind === 'EXISTING_WORK'
      ? `the existing Thoth Work ${endpoint.workId}`
      : `the Work this import plans for ${describeGroup(endpoint.groupKey)}`;
  const describeGroup = (groupKey: string) => {
    const first = sourcePlan.groups.find((group) => group.groupKey === groupKey)?.productKeys[0];

    return first === undefined ? 'another Work of this file' : describe(first);
  };
  const describeDeclaration = (declaration: OnixRelatedMaterialDeclaration) =>
    `${declaration.construct === 'RELATED_WORK' ? 'RelatedWork' : 'RelatedProduct'} ${
      declaration.construct === 'RELATED_WORK' ? 'WorkRelationCode' : 'ProductRelationCode'
    } ${declaration.code} of ${describe(declaration.productKey)}`;

  const setOutcome = (
    declaration: Pick<
      OnixRelatedMaterialDeclaration,
      'declarationKey' | 'productKey' | 'groupKey' | 'construct' | 'code'
    > &
      OnixSourceLocation,
    outcome: OnixRelationOutcomeKind,
    extra: Partial<Pick<OnixRelationOutcome, 'endpoint' | 'relationType' | 'edgeKey' | 'findingKeys'>> = {},
  ) =>
    outcomes.set(declaration.declarationKey, {
      path: declaration.path,
      sourcePath: declaration.sourcePath,
      declarationKey: declaration.declarationKey,
      productKey: declaration.productKey,
      groupKey: declaration.groupKey,
      construct: declaration.construct,
      code: declaration.code,
      outcome,
      endpoint: extra.endpoint ?? null,
      relationType: extra.relationType ?? null,
      edgeKey: extra.edgeKey ?? null,
      findingKeys: extra.findingKeys ?? [],
    });

  /** Whether #182's grouping read a RelatedProduct/06 declaration as the alternative-format evidence it states. */
  const isGroupingEvidenceRead = ({ productKey, path }: OnixRelatedMaterialDeclaration) =>
    productByKey.get(productKey)?.alternativeFormats.some((format) => format.path === path) ?? false;

  /*
   * The Work groups whose identity the grouping has not settled (#224 Specification Amendment 2 B.2): a #182 finding leaves
   * which Work one of its Products manifests, or which Work it is, undecided; one of its Products states alternative-format
   * evidence the grouping did not read; or which Work it is in Thoth is not decided.
   */
  const unsettledGroups = new Set([
    ...sourcePlan.blockers
      .filter(({ code }) => GROUPING_UNSETTLED.has(code))
      .flatMap(({ groupKey, productKey }) => [groupKey, productByKey.get(productKey ?? '')?.groupKey ?? null])
      .filter((key): key is string => key !== null),
    ...plan.declarations
      .filter(
        (declaration) => declaration.semantics.kind === 'GROUPING_EVIDENCE' && !isGroupingEvidenceRead(declaration),
      )
      .map(({ groupKey }) => groupKey),
  ]);

  /** Whether an endpoint is one exact Work: one Thoth named exactly, or a group whose identity is settled and decided. */
  const isSettled = (endpoint: OnixRelationEndpoint) =>
    endpoint.groupKey === null ||
    ((groups.get(endpoint.groupKey)?.target ?? null) !== null && !unsettledGroups.has(endpoint.groupKey));

  const candidates: Candidate[] = [];
  const otherLanguage: {
    declaration: OnixRelatedMaterialDeclaration;
    from: OnixRelationEndpoint;
    to: OnixRelationEndpoint;
  }[] = [];

  [...plan.declarations].sort(bySource).forEach((declaration) => {
    const { semantics, productKey, groupKey } = declaration;
    const locations = [declaration.codeLocation, ...declaration.identifiers];
    const scope = { productKey, groupKey };
    const detail = { construct: declaration.construct, code: declaration.code };

    switch (semantics.kind) {
      case 'WORK_IDENTITY':
        setOutcome(declaration, 'WORK_IDENTITY');
        return;
      case 'CITATION':
        setOutcome(declaration, 'CITATION');
        return;
      case 'GROUPING_EVIDENCE': {
        // #182 reads every ProductRelationCode of a RelatedProduct: a 06 beside another code is its evidence too.
        if (isGroupingEvidenceRead(declaration)) {
          setOutcome(declaration, 'GROUPING_EVIDENCE');
          return;
        }

        const unread = findings.add({
          family: 'RELATION',
          code: 'RELATION_GROUPING_EVIDENCE_UNREAD',
          classification: 'PREFLIGHT_GAP',
          blocking: true,
          ...scope,
          locations,
          discriminator: `${declaration.codeLocation.path}|${declaration.binding}`,
          detail,
          message: `${describeDeclaration(declaration)} says it is an alternative format of the same content, but the Product grouping did not read it, so this same-content evidence was not considered and the Works cannot be planned until it is`,
        });

        setOutcome(declaration, 'GAP', { findingKeys: [unread.key] });
        return;
      }
      case 'CITED_BY':
      case 'LRM_WORKAROUND':
      case 'UNREPRESENTABLE': {
        const loss = findings.add({
          family: 'RELATION',
          code:
            semantics.kind === 'CITED_BY'
              ? 'RELATION_CITED_BY_UNREPRESENTABLE'
              : semantics.kind === 'LRM_WORKAROUND'
                ? 'RELATION_LRM_UNREPRESENTABLE'
                : 'RELATION_UNREPRESENTABLE',
          classification: 'TARGET_UNREPRESENTABLE',
          blocking: false,
          ...scope,
          locations,
          discriminator: `${declaration.codeLocation.path}|${declaration.binding}`,
          detail,
          message:
            semantics.kind === 'CITED_BY'
              ? `${describeDeclaration(declaration)} says the related product cites this one; a Thoth Reference only says what a Work cites, so it is not reversed into one and is not imported`
              : semantics.kind === 'LRM_WORKAROUND'
                ? `${describeDeclaration(declaration)} is an LRM manifestation relation, which Thoth holds no Work relation for, so it is not imported`
                : `${describeDeclaration(declaration)} states a relation Thoth has no relation type for, so it is not imported and is never read as another relation`,
        });

        setOutcome(declaration, 'UNREPRESENTABLE', { findingKeys: [loss.key] });
        return;
      }
      default:
        break;
    }

    const from = groupEndpoint(groupKey);
    const profileActive = groups.get(groupKey)?.thothProfileActive ?? false;
    const resolution = resolveEndpoint(declaration, profileActive);
    const discriminator = `${declaration.codeLocation.path}|${declaration.binding}`;

    if (resolution.kind === 'NOT_LOOKED_UP') {
      const gap = findings.add({
        family: 'RELATION',
        code: 'RELATION_TARGETS_NOT_READ',
        classification: 'PREFLIGHT_GAP',
        blocking: true,
        ...scope,
        locations,
        discriminator,
        detail: { ...detail, reason: 'ENDPOINT_NOT_LOOKED_UP' },
        message: `The Work ${describeDeclaration(declaration)} names was never looked up in Thoth, so whether it exists is not known and nothing is assumed about it`,
      });

      setOutcome(declaration, 'GAP', { findingKeys: [gap.key] });
      return;
    }

    if (resolution.kind === 'AMBIGUOUS') {
      const ambiguous = findings.add({
        family: 'RELATION',
        code: 'RELATION_TARGET_AMBIGUOUS',
        classification: 'SOURCE_CONFLICT',
        blocking: true,
        ...scope,
        locations,
        discriminator,
        detail: { ...detail, candidates: resolution.candidates },
        message: `The identifiers of ${describeDeclaration(declaration)} name more than one Work (${resolution.candidates.join(', ')}); none is chosen, so the relation cannot be planned until the file names one`,
      });

      setOutcome(declaration, 'AMBIGUOUS', { findingKeys: [ambiguous.key] });
      return;
    }

    if (resolution.kind === 'UNRESOLVED') {
      const unresolved = findings.add({
        family: 'RELATION',
        code: 'RELATION_TARGET_UNRESOLVED',
        classification: 'TARGET_INPUT_REQUIRED',
        blocking: true,
        ...scope,
        locations,
        discriminator,
        detail: { ...detail, reason: resolution.reason },
        resolution: ACKNOWLEDGE,
        message:
          resolution.reason === 'NO_STRONG_IDENTIFIER'
            ? `${describeDeclaration(declaration)} identifies the related work by nothing Thoth can match exactly - no DOI or ISBN, and no identifier of a Work in this file - so no relation can be created. Acknowledge that it is left out, or correct the file`
            : `No Work in this file or in Thoth carries the identifiers of ${describeDeclaration(declaration)}, so no relation can be created. Acknowledge that it is left out, or correct the file`,
      });

      setOutcome(declaration, answerOf(unresolved, choices) === null ? 'UNRESOLVED' : 'OMITTED', {
        findingKeys: [unresolved.key],
      });
      return;
    }

    const to = resolution.endpoint;
    const workLevel = semantics.kind === 'TRANSLATION' || isThothProfileProductRelation(declaration, profileActive);

    /*
     * A relation whose two ends grouping made one Work contradicts the grouping, whether it names the Work or another of its
     * Products: never a loss to acknowledge, and never answered (#224 Specification Amendment 2 A).
     */
    if (identityOf(from) === identityOf(to)) {
      const self = findings.add({
        family: 'RELATION',
        code: 'RELATION_SELF_AFTER_GROUPING',
        classification: 'SOURCE_CONFLICT',
        blocking: true,
        ...scope,
        locations,
        discriminator,
        detail: { ...detail, endpoint: identityOf(to) },
        message: workLevel
          ? `${describeDeclaration(declaration)} relates the Work to itself: its identifiers name ${describeEndpoint(to)}, the Work it belongs to. Grouping and the relation contradict each other, so nothing can be planned until the file is corrected`
          : `${describeDeclaration(declaration)} relates the Work to itself: its identifiers name a Product the grouping places in ${describeEndpoint(to)}, the Work it belongs to. Grouping and the relation contradict each other, so nothing can be planned until the file is corrected`,
      });

      setOutcome(declaration, 'SELF', { endpoint: to, findingKeys: [self.key] });
      return;
    }

    if (semantics.kind === 'TRANSLATION') {
      candidates.push({
        declaration,
        from,
        to,
        relationType: semantics.relationType,
        basis: 'RELATED_WORK_TRANSLATION',
      });
      return;
    }

    if (semantics.kind === 'PRODUCT_RELATION') {
      if (workLevel) {
        candidates.push({
          declaration,
          from,
          to,
          relationType: semantics.relationType,
          basis: 'THOTH_PROFILE_PRODUCT_RELATION',
        });
        return;
      }

      /*
       * Generic ONIX: a Product-level part or replacement between two Products that resolve exactly, after grouping, to two
       * distinct Works whose identity is settled is the one Work relation its code maps to (rules 16-17; #224 Specification
       * Amendment 2 B). The pair's inverse, conflict and existing-edge checks below still apply to it.
       */
      if (isSettled(from) && isSettled(to)) {
        candidates.push({
          declaration,
          from,
          to,
          relationType: semantics.relationType,
          basis: 'GENERIC_PRODUCT_RELATION',
        });
        return;
      }

      // Where the grouping leaves which Work either end is undecided, only the publisher projects it (rule 18).
      const unsettled = [from, to].filter((endpoint) => !isSettled(endpoint));
      const choice = findings.add({
        family: 'RELATION',
        code: 'RELATION_PROJECTION_CHOICE_REQUIRED',
        classification: 'TARGET_INPUT_REQUIRED',
        blocking: true,
        ...scope,
        locations,
        discriminator: `${discriminator}|${identityOf(from)}|${identityOf(to)}`,
        detail: {
          ...detail,
          relationType: semantics.relationType,
          endpoint: identityOf(to),
          unsettled: unsettled.map(identityOf),
        },
        resolution: {
          kind: 'CHOICE',
          options: [
            { key: ONIX_RELATION_PROJECT, label: semantics.relationType },
            { key: ONIX_RELATION_OMIT, label: ONIX_RELATION_OMIT },
          ],
        },
        message: `${describeDeclaration(declaration)} relates two Products, but the grouping has not settled the identity of ${unsettled.map(describeEndpoint).join(' and ')}, so the Product-level relation does not by itself establish that the Work ${RELATION_WORDS[semantics.relationType]} ${describeEndpoint(to)}. Choose whether the Work relation is created, or leave it out`,
      });
      const answer = answerOf(choice, choices);

      if (answer === ONIX_RELATION_PROJECT) {
        candidates.push({ declaration, from, to, relationType: semantics.relationType, basis: 'PUBLISHER_PROJECTION' });
      } else {
        setOutcome(declaration, answer === null ? 'AWAITING_CHOICE' : 'OMITTED', {
          endpoint: to,
          relationType: semantics.relationType,
          findingKeys: [choice.key],
        });
      }

      return;
    }

    otherLanguage.push({ declaration, from, to });
  });

  /* Other-language versions: redundant beside exact translation evidence, otherwise the publisher's to direct (rule 19). */
  const pairOf = (a: OnixRelationEndpoint, b: OnixRelationEndpoint) =>
    [identityOf(a), identityOf(b)].sort(byText).join('↔');
  const translatedPairs = new Set(
    candidates.filter(({ basis }) => basis === 'RELATED_WORK_TRANSLATION').map(({ from, to }) => pairOf(from, to)),
  );

  otherLanguage.forEach(({ declaration, from, to }) => {
    const scope = { productKey: declaration.productKey, groupKey: declaration.groupKey };
    const locations = [declaration.codeLocation, ...declaration.identifiers];
    const discriminator = `${declaration.codeLocation.path}|${declaration.binding}|${identityOf(to)}`;
    const detail = { construct: declaration.construct, code: declaration.code, endpoint: identityOf(to) };

    if (translatedPairs.has(pairOf(from, to))) {
      const redundant = findings.add({
        family: 'RELATION',
        code: 'RELATION_OTHER_LANGUAGE_REDUNDANT',
        classification: 'SUPPORTED_NORMALIZED',
        blocking: false,
        ...scope,
        locations,
        discriminator,
        detail,
        message: `${describeDeclaration(declaration)} says the two Works are versions in other languages; the translation relation the file states between them already says so, with its direction`,
      });

      setOutcome(declaration, 'REDUNDANT', { endpoint: to, findingKeys: [redundant.key] });
      return;
    }

    const fromLanguages = languagesOf(from) ?? [];
    const toLanguages = languagesOf(to) ?? [];
    const backed =
      fromLanguages.length > 0 &&
      toLanguages.length > 0 &&
      [...fromLanguages].sort(byText).join(',') !== [...toLanguages].sort(byText).join(',');
    const direction = findings.add({
      family: 'RELATION',
      code: 'RELATION_DIRECTION_REQUIRED',
      classification: 'TARGET_INPUT_REQUIRED',
      blocking: true,
      ...scope,
      locations,
      discriminator: `${discriminator}|${backed ? `${fromLanguages.join(',')}>${toLanguages.join(',')}` : 'unbacked'}`,
      detail: { ...detail, languages: fromLanguages, relatedLanguages: toLanguages },
      resolution: backed
        ? {
            kind: 'CHOICE',
            options: [
              { key: 'HAS_TRANSLATION', label: 'HAS_TRANSLATION' },
              { key: 'IS_TRANSLATION_OF', label: 'IS_TRANSLATION_OF' },
              { key: ONIX_RELATION_OMIT, label: ONIX_RELATION_OMIT },
            ],
          }
        : ACKNOWLEDGE,
      message: backed
        ? `${describeDeclaration(declaration)} says ${describeEndpoint(to)} is a version in another language, which does not say which is the translation. Its languages (${toLanguages.join(', ')}) differ from this Work's (${fromLanguages.join(', ')}): choose which way the translation runs, or leave it out`
        : `${describeDeclaration(declaration)} says ${describeEndpoint(to)} is a version in another language, which does not say which is the translation, and no language evidence of both Works tells them apart. Acknowledge that it is left out, or state the translation in the file`,
    });
    const answer = answerOf(direction, choices);

    if (answer === 'HAS_TRANSLATION' || answer === 'IS_TRANSLATION_OF') {
      candidates.push({ declaration, from, to, relationType: answer, basis: 'PUBLISHER_DIRECTION' });
    } else {
      setOutcome(declaration, answer === null ? 'AWAITING_CHOICE' : 'OMITTED', {
        endpoint: to,
        findingKeys: [direction.key],
      });
    }
  });

  /* Semantic edges: one per Work pair, whatever number of declarations or inverses state it (rules 27-30). */
  const byPair = new Map<string, Candidate[]>();

  [...candidates]
    .sort((a, b) => bySource(a.declaration, b.declaration))
    .forEach((candidate) => {
      const pair = pairOf(candidate.from, candidate.to);

      byPair.set(pair, [...(byPair.get(pair) ?? []), candidate]);
    });

  const edges: OnixRelationEdge[] = [];
  const relationsOf = (workId: WorkId) => evidence?.relations[workId];

  byPair.forEach((pairCandidates, pair) => {
    const [first] = pairCandidates;
    // Every candidate read from the first one's side: its own relation, or its inverse.
    const oriented = pairCandidates.map((candidate) =>
      identityOf(candidate.from) === identityOf(first.from) ? candidate.relationType : INVERSE[candidate.relationType],
    );
    const locations = pairCandidates.flatMap(({ declaration }) => [
      declaration.codeLocation,
      ...declaration.identifiers,
    ]);
    const declarationKeys = pairCandidates.map(({ declaration }) => declaration.declarationKey);
    const discriminator = `${pair}|${pairCandidates
      .map(({ declaration }) => `${declaration.declarationKey}#${declaration.binding}`)
      .join(',')}`;
    const scope = {
      productKey: pairCandidates.length === 1 ? first.declaration.productKey : null,
      groupKey: first.declaration.groupKey,
    };
    const outcomeOf = (kind: OnixRelationOutcomeKind, extra: Parameters<typeof setOutcome>[2] = {}) =>
      pairCandidates.forEach((candidate) =>
        setOutcome(candidate.declaration, kind, {
          endpoint: candidate.to,
          relationType: candidate.relationType,
          ...extra,
        }),
      );

    if (new Set(oriented).size > 1) {
      const families = new Set(oriented.map((type) => FAMILY[type]));
      const conflict = findings.add({
        family: 'RELATION',
        code: families.size === 1 ? 'RELATION_INVERSE_CONTRADICTION' : 'RELATION_PAIR_TYPE_CONFLICT',
        classification: families.size === 1 ? 'SOURCE_CONFLICT' : 'TARGET_UNREPRESENTABLE',
        blocking: true,
        ...scope,
        locations,
        discriminator,
        detail: {
          endpoints: pair.split('↔'),
          relationTypes: unique(oriented).sort(byText),
          declarations: declarationKeys,
        },
        message:
          families.size === 1
            ? `The file states opposite directions of one relation between ${describeEndpoint(first.from)} and ${describeEndpoint(first.to)} (${pairCandidates.map(({ declaration }) => describeDeclaration(declaration)).join('; ')}); they contradict each other, so neither is planned until the file is corrected`
            : `The file states different relations between ${describeEndpoint(first.from)} and ${describeEndpoint(first.to)} (${pairCandidates.map(({ declaration }) => describeDeclaration(declaration)).join('; ')}); Thoth holds one relation between two Works, so none is planned until the file states one`,
      });

      outcomeOf('CONFLICT', { findingKeys: [conflict.key] });
      return;
    }

    const relationType = oriented[0];
    const relator = first.from;
    const related = first.to;
    const edgeKey = `EDGE|${pair}|${identityOf(relator) === pair.split('↔')[0] ? relationType : INVERSE[relationType]}`;
    const findingKeys: string[] = [];

    if (pairCandidates.length > 1) {
      findingKeys.push(
        findings.add({
          family: 'RELATION',
          code: 'RELATION_DECLARATIONS_RECONCILED',
          classification: 'SUPPORTED_NORMALIZED',
          blocking: false,
          ...scope,
          locations,
          discriminator,
          detail: { relationType, declarations: declarationKeys },
          message: `${pairCandidates.map(({ declaration }) => describeDeclaration(declaration)).join('; ')} state one relation - ${describeEndpoint(relator)} ${RELATION_WORDS[relationType]} ${describeEndpoint(related)} - or its inverse; it is one Work relation, created once with the inverse Thoth adds itself`,
        }).key,
      );
    }

    const edge = (state: OnixRelationEdge['state'], ordinal: OnixRelationOrdinal, extraKeys: string[] = []) => {
      const keys = [...findingKeys, ...extraKeys];

      edges.push({
        edgeKey,
        relator,
        related,
        relationType,
        basis: first.basis,
        declarationKeys,
        ordinal,
        state,
        findingKeys: keys,
      });
      outcomeOf(
        state === 'PLANNED'
          ? 'PLANNED'
          : state === 'SATISFIED'
            ? 'SATISFIED'
            : state === 'OMITTED'
              ? 'OMITTED'
              : 'CONFLICT',
        { edgeKey, findingKeys: keys },
      );
    };

    /* An edge between two existing Works may already be there (rule 33). */
    if (relator.kind === 'EXISTING_WORK' && related.kind === 'EXISTING_WORK') {
      const fromRelator = relationsOf(relator.workId);
      const fromRelated = relationsOf(related.workId);

      if (fromRelator === undefined && fromRelated === undefined) {
        const gap = findings.add({
          family: 'RELATION',
          code: 'RELATION_TARGETS_NOT_READ',
          classification: 'PREFLIGHT_GAP',
          blocking: true,
          ...scope,
          locations,
          discriminator,
          detail: { reason: 'EXISTING_RELATIONS_NOT_READ', endpoints: pair.split('↔') },
          message: `The relations ${describeEndpoint(relator)} and ${describeEndpoint(related)} already hold were not read, so whether the relation the file states is already there is not known`,
        });

        edge('BLOCKED', { status: 'UNASSIGNED' }, [gap.key]);
        outcomeOf('GAP', { edgeKey, findingKeys: [...findingKeys, gap.key] });
        return;
      }

      const held =
        fromRelator?.find(({ relatedWorkId }) => relatedWorkId === related.workId) ??
        (() => {
          const inverse = fromRelated?.find(({ relatedWorkId }) => relatedWorkId === relator.workId);

          return inverse === undefined
            ? undefined
            : {
                ...inverse,
                relationType: EXISTING_INVERSE[inverse.relationType] ?? inverse.relationType,
                relationOrdinal: 0,
              };
        })();

      if (held !== undefined && held.relationType === relationType) {
        const satisfied = findings.add({
          family: 'RELATION',
          code: 'RELATION_EXISTING_SATISFIED',
          classification: 'SUPPORTED_NORMALIZED',
          blocking: false,
          ...scope,
          locations,
          discriminator,
          detail: { relationType, endpoints: pair.split('↔') },
          message: `${describeEndpoint(relator)} already ${RELATION_WORDS[relationType]} ${describeEndpoint(related)}; nothing is created`,
        });

        edge(
          'SATISFIED',
          held.relationOrdinal > 0 ? { status: 'EXISTING', ordinal: held.relationOrdinal } : { status: 'UNASSIGNED' },
          [satisfied.key],
        );
        return;
      }

      if (held !== undefined) {
        const conflict = findings.add({
          family: 'RELATION',
          code: 'RELATION_EXISTING_CONFLICT',
          classification: 'SOURCE_CONFLICT',
          blocking: true,
          ...scope,
          locations,
          discriminator,
          detail: { relationType, existing: held.relationType, endpoints: pair.split('↔') },
          message: `The file says ${describeEndpoint(relator)} ${RELATION_WORDS[relationType]} ${describeEndpoint(related)}, but Thoth already relates them as ${held.relationType}; a pair holds one relation and this import never changes an existing one, so it cannot continue until the file or the Works agree`,
        });

        edge('BLOCKED', { status: 'UNASSIGNED' }, [conflict.key]);
        return;
      }
    }

    /* An existing endpoint outside the active publisher is an authorization boundary, never "not found" (rule 25). */
    const outside = [relator, related].filter(
      (endpoint): endpoint is Extract<OnixRelationEndpoint, { kind: 'EXISTING_WORK' }> =>
        endpoint.kind === 'EXISTING_WORK' && (endpoint.imprintId === null || !imprintIds.has(endpoint.imprintId)),
    );

    if (outside.length > 0) {
      const unauthorized = findings.add({
        family: 'RELATION',
        code: 'RELATION_TARGET_UNAUTHORIZED',
        classification: 'TARGET_INPUT_REQUIRED',
        blocking: true,
        ...scope,
        locations,
        discriminator: `${discriminator}|${outside.map(({ workId, imprintId }) => `${workId}@${imprintId ?? ''}`).join(',')}`,
        detail: {
          relationType,
          workIds: outside.map(({ workId }) => workId),
          imprintIds: outside.map(({ imprintId }) => imprintId ?? ''),
        },
        resolution: ACKNOWLEDGE,
        message: `${describeEndpoint(relator)} ${RELATION_WORDS[relationType]} ${describeEndpoint(related)}, but ${outside.map(describeEndpoint).join(' and ')} belongs to a publisher outside the one this import is for, so the relation cannot be created from here. Acknowledge that it is left out, or create it with access to both publishers`,
      });

      if (answerOf(unauthorized, choices) === null) {
        edge('BLOCKED', { status: 'UNASSIGNED' }, [unauthorized.key]);
        outcomeOf('UNAUTHORIZED', { edgeKey, findingKeys: [...findingKeys, unauthorized.key] });
      } else {
        edge('OMITTED', { status: 'UNASSIGNED' }, [unauthorized.key]);
      }

      return;
    }

    edge('PLANNED', { status: 'UNASSIGNED' });
  });

  /* Ordinals of the edges to create: source appearance within each relator's relation type (rule 31). */
  const firstDeclaration = new Map(plan.declarations.map((declaration) => [declaration.declarationKey, declaration]));
  const plannedByRelatorType = new Map<string, number[]>();

  edges.forEach((edge, position) => {
    if (edge.state !== 'PLANNED') return;

    const key = `${identityOf(edge.relator)}|${edge.relationType}`;

    plannedByRelatorType.set(key, [...(plannedByRelatorType.get(key) ?? []), position]);
  });

  plannedByRelatorType.forEach((positions) => {
    const ordered = [...positions].sort((a, b) =>
      bySource(
        firstDeclaration.get(edges[a].declarationKeys[0]) as OnixRelatedMaterialDeclaration,
        firstDeclaration.get(edges[b].declarationKeys[0]) as OnixRelatedMaterialDeclaration,
      ),
    );

    ordered.forEach((position, rank) => {
      const current = edges[position];
      const { relator, relationType } = current;
      const held = relator.kind === 'EXISTING_WORK' ? relationsOf(relator.workId) : [];
      const [declaration] = current.declarationKeys.map(
        (key) => firstDeclaration.get(key) as OnixRelatedMaterialDeclaration,
      );
      const scope = { productKey: declaration.productKey, groupKey: declaration.groupKey };
      const locations = [declaration.codeLocation];

      if (held === undefined) {
        const gap = findings.add({
          family: 'RELATION',
          code: 'RELATION_TARGETS_NOT_READ',
          classification: 'PREFLIGHT_GAP',
          blocking: true,
          ...scope,
          locations,
          discriminator: `${current.edgeKey}|ordinal`,
          detail: { reason: 'EXISTING_RELATIONS_NOT_READ', relationType },
          message: `The relations ${describeEndpoint(relator)} already holds were not read, so the position a new ${relationType} relation would take among them is not known`,
        });

        edges[position] = { ...current, state: 'BLOCKED', findingKeys: [...current.findingKeys, gap.key] };
        current.declarationKeys.forEach((key) => {
          const outcome = outcomes.get(key) as OnixRelationOutcome;

          outcomes.set(key, { ...outcome, outcome: 'GAP', findingKeys: [...outcome.findingKeys, gap.key] });
        });
        return;
      }

      const after = Math.max(
        0,
        ...held
          .filter((relation) => relation.relationType === relationType)
          .map(({ relationOrdinal }) => relationOrdinal),
      );
      const ordinal = after + rank + 1;
      const normalised = findings.add({
        family: 'RELATION',
        code: 'RELATION_ORDINAL_NORMALISED',
        classification: 'SUPPORTED_NORMALIZED',
        blocking: false,
        ...scope,
        locations,
        discriminator: `${current.edgeKey}|${ordinal}`,
        detail: { relationType, ordinal, after },
        message: `The relation ${describeEndpoint(relator)} ${RELATION_WORDS[relationType]} ${describeEndpoint(current.related)} takes position ${ordinal} among its ${relationType} relations: ONIX gives a relation no position, so Thoth's is its order of first appearance in the file among relations of its type${after > 0 ? `, after the ${after} it already holds` : ''}`,
      });
      const deferred = findings.add({
        family: 'RELATION',
        code: 'RELATION_EXECUTION_DEFERRED',
        classification: 'EXECUTION_DEFERRED',
        blocking: true,
        ...scope,
        locations: current.declarationKeys.flatMap((key) => {
          const stated = firstDeclaration.get(key) as OnixRelatedMaterialDeclaration;

          return [stated.codeLocation, ...stated.identifiers];
        }),
        discriminator: current.edgeKey,
        detail: { relationType, ordinal, declarations: current.declarationKeys },
        message: `${describeEndpoint(relator)} ${RELATION_WORDS[relationType]} ${describeEndpoint(current.related)}: the relation is planned, but creating ordinary Work relations is not available yet (thoth-app#187), so the import cannot run with it`,
      });

      edges[position] = {
        ...current,
        ordinal: { status: 'ASSIGNED', ordinal, basis: 'SOURCE_ORDER_WITHIN_TYPE', after },
        findingKeys: [...current.findingKeys, normalised.key, deferred.key],
      };
      current.declarationKeys.forEach((key) => {
        const outcome = outcomes.get(key) as OnixRelationOutcome;

        outcomes.set(key, { ...outcome, findingKeys: [...outcome.findingKeys, normalised.key, deferred.key] });
      });
    });
  });

  /* ContentItem relations: no approved decision reduces them, so a Work this import creates waits on their omission. */
  plan.componentFacts.forEach((fact) => {
    const state = groups.get(fact.groupKey);
    const declaration = {
      ...fact,
      declarationKey: fact.factKey,
      code: fact.codes.join(','),
    };

    if (state?.target !== 'NEW_WORK' || state.representativeProductKey !== fact.productKey) {
      setOutcome(declaration, 'NOT_REDUCED');
      return;
    }

    const unsupported = findings.add({
      family: 'RELATION',
      code: 'RELATION_COMPONENT_SCOPE_UNSUPPORTED',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: true,
      productKey: fact.productKey,
      groupKey: fact.groupKey,
      locations: [fact],
      discriminator: `${fact.path}|${fact.binding}`,
      detail: { construct: fact.construct, codes: fact.codes, componentPath: fact.componentPath },
      resolution: ACKNOWLEDGE,
      message: `A ${fact.construct === 'RELATED_WORK' ? 'RelatedWork' : 'RelatedProduct'} (${fact.codes.join(', ') || 'no code'}) is stated inside a ContentItem of ${describe(fact.productKey)}; no approved rule relates a content item to another work, so it is not imported. Acknowledge that it is left out`,
    });

    setOutcome(declaration, answerOf(unsupported, choices) === null ? 'NOT_REDUCED' : 'OMITTED', {
      findingKeys: [unsupported.key],
    });
  });

  const all = findings.all();

  return {
    outcomes: [
      ...plan.declarations.map(({ declarationKey }) => outcomes.get(declarationKey) as OnixRelationOutcome),
      ...plan.componentFacts.map(({ factKey }) => outcomes.get(factKey) as OnixRelationOutcome),
    ],
    edges,
    findings: all,
    pendingFindingKeys: all.filter((finding) => isPending(finding, choices)).map(({ key }) => key),
  };
};

/* ------------------------------------------------------------------------------------------------ */
/* References                                                                                       */
/* ------------------------------------------------------------------------------------------------ */

const REFERENCE_FIELD_NAMES: Readonly<Record<string, string>> = {
  doi: 'DOI',
  isbn: 'ISBN',
  issn: 'ISSN',
  unstructuredCitation: 'citation text',
};

/** The facts one canonical Reference represents, by field: only the ones its source states. */
const representedFacts = (
  reference: Pick<OnixPlannedReference, 'doi' | 'unstructuredCitation' | 'isbn' | 'issn'>,
): [keyof typeof REFERENCE_FIELD_NAMES, string][] =>
  (
    [
      ['doi', reference.doi === null ? null : (normaliseDoi(reference.doi) ?? reference.doi)],
      ['unstructuredCitation', reference.unstructuredCitation?.trim() ?? null],
      ['isbn', reference.isbn === null ? null : (normaliseIsbn(reference.isbn) ?? reference.isbn)],
      ['issn', reference.issn?.trim().toUpperCase() ?? null],
    ] as const
  ).flatMap(([field, value]) => (value === null || value.length === 0 ? [] : [[field, value] as [string, string]]));

const sequenceOf = (references: readonly OnixPlannedReference[]) =>
  canonicalJson(
    references.map(({ referenceOrdinal, ...reference }) => [referenceOrdinal, representedFacts(reference)]),
  );

export type OnixResolvedProductReferences = {
  readonly references: OnixProductReferences;
  readonly findings: readonly OnixRelatedMaterialFinding[];
};

/**
 * One Product's canonical Reference sequence (rules 42-52): each RelatedProduct/34 at its source position as its
 * `referenceOrdinal`, with a DOI, ISBN and ISSN only where the identifier's declared type is one, and the unstructured
 * citation only through Thoth's own convention under its verified profile. Nothing is repaired, guessed or fabricated from
 * other metadata; a citation Thoth cannot store is left out only once the publisher acknowledges it; an exact repeat is
 * imported once, and a repeat that disagrees is never settled by position.
 */
export const resolveOnixProductReferences = (
  plan: OnixRelatedMaterialPlan,
  productKey: string,
  groupKey: string,
  options: {
    readonly thothProfileActive: boolean;
    readonly choices?: Readonly<Record<string, string>>;
    readonly describe: string;
  },
): OnixResolvedProductReferences => {
  const { thothProfileActive, choices, describe } = options;
  const citations = plan.citations[productKey] ?? [];
  const findings = new RelatedMaterialFindings();
  const candidates: { fact: OnixCitationFact; reference: OnixPlannedReference }[] = [];
  const cited = (fact: OnixCitationFact) => `The cited work ${fact.ordinal} (RelatedProduct/34) of ${describe}`;
  const add = (
    input: Omit<FindingInput, 'family' | 'productKey' | 'groupKey' | 'code'> & { code: OnixReferenceFindingCode },
  ) => findings.add({ family: 'REFERENCE', productKey, groupKey, ...input });

  citations.forEach((fact) => {
    const discriminator = `${fact.path}|${fact.binding}`;

    fact.invalid.forEach((identifier) =>
      add({
        code: 'REFERENCE_IDENTIFIER_INVALID',
        classification: 'SUPPORTED_WITH_WARNING',
        blocking: false,
        locations: [identifier],
        discriminator: `${discriminator}|${identifier.path}`,
        detail: { field: identifier.field, type: identifier.type, value: identifier.value },
        message: `${cited(fact)} gives "${identifier.value}" as its ${REFERENCE_FIELD_NAMES[identifier.field]}, which is not a valid one; it is not imported, and never corrected or guessed`,
      }),
    );
    fact.normalised.forEach((identifier) =>
      add({
        code: 'REFERENCE_IDENTIFIER_NORMALISED',
        classification: 'SUPPORTED_NORMALIZED',
        blocking: false,
        locations: [identifier],
        discriminator: `${discriminator}|${identifier.path}`,
        detail: {
          field: identifier.field,
          type: identifier.type,
          value: identifier.value,
          normalised: identifier.normalised,
          ...(identifier.dropped === null ? {} : { dropped: identifier.dropped }),
        },
        message: `${cited(fact)} gives its ${REFERENCE_FIELD_NAMES[identifier.field]} as "${identifier.value}", imported as ${identifier.normalised}${identifier.dropped === null ? '' : `; its ${identifier.dropped} is not part of the ISSN and is not imported`}`,
      }),
    );
    [...fact.unmapped, ...(thothProfileActive ? [] : fact.thothCitationIdentifiers)].forEach((identifier) =>
      add({
        code: 'REFERENCE_IDENTIFIER_UNREPRESENTABLE',
        classification: 'TARGET_UNREPRESENTABLE',
        blocking: false,
        locations: [identifier],
        discriminator: `${discriminator}|${identifier.path}`,
        detail: {
          type: identifier.type,
          ...(identifier.typeName === null ? {} : { typeName: identifier.typeName }),
          reason: isThothCitationIdentifier(identifier) ? 'THOTH_CONVENTION_INACTIVE' : 'NO_REFERENCE_FIELD',
        },
        message: isThothCitationIdentifier(identifier)
          ? `${cited(fact)} gives an "Unstructured citation" identifier, which is Thoth's own export convention and is read as citation text only in a verified Thoth export; here it is not imported`
          : `${cited(fact)} gives a ${identifier.typeName ?? `ProductIDType ${identifier.type}`} identifier, which no Reference field holds; it is not imported, and never read as citation text`,
      }),
    );

    const citation = thothProfileActive ? fact.thothCitation : ({ kind: 'NONE' } as const);
    const selections = { doi: fact.doi, isbn: fact.isbn, issn: fact.issn, unstructuredCitation: citation };
    const conflicted = Object.entries(selections).filter(([, selection]) => selection.kind === 'CONFLICT');

    if (conflicted.length > 0) {
      add({
        code: 'REFERENCE_IDENTIFIER_CONFLICT',
        classification: 'SOURCE_CONFLICT',
        blocking: true,
        locations: conflicted.flatMap(([, selection]) => (selection.kind === 'CONFLICT' ? selection.locations : [])),
        discriminator,
        detail: {
          fields: conflicted.map(([field]) => field),
          values: conflicted.flatMap(([, selection]) => (selection.kind === 'CONFLICT' ? selection.values : [])),
        },
        message: `${cited(fact)} gives more than one ${conflicted.map(([field]) => REFERENCE_FIELD_NAMES[field]).join(' and ')}; none is chosen, so its Reference cannot be planned until the file gives one`,
      });
      return;
    }

    const valueOf = (selection: OnixCitationIdentifierSelection) =>
      selection.kind === 'VALUE' ? selection.value : null;
    const reference: OnixPlannedReference = {
      citationKey: fact.citationKey,
      productKey,
      referenceOrdinal: fact.ordinal,
      doi: valueOf(fact.doi),
      unstructuredCitation: valueOf(citation),
      isbn: valueOf(fact.isbn),
      issn: valueOf(fact.issn),
      locations: [fact],
    };

    // Thoth stores a Reference only with a DOI or a citation text: an ISBN or an ISSN alone is not one.
    if (reference.doi === null && reference.unstructuredCitation === null) {
      const lost = [
        ...(reference.isbn === null ? [] : [`ISBN ${reference.isbn}`]),
        ...(reference.issn === null ? [] : [`ISSN ${reference.issn}`]),
      ];

      add({
        code: 'REFERENCE_UNREPRESENTABLE',
        classification: 'TARGET_UNREPRESENTABLE',
        blocking: true,
        locations: [fact],
        discriminator,
        detail: { ordinal: fact.ordinal, lost },
        resolution: ACKNOWLEDGE,
        message: `${cited(fact)} gives neither a DOI nor citation text Thoth can store${lost.length > 0 ? ` (only ${lost.join(' and ')})` : ''}, so it cannot become a Reference. Acknowledge that it is left out, or correct the file`,
      });
      return;
    }

    candidates.push({ fact, reference });
  });

  /* Exact repeats import once; repeats of one identity that disagree are surfaced (rule 52). */
  const identity = ({ reference }: (typeof candidates)[number]) =>
    reference.doi !== null ? `doi:${reference.doi.toLowerCase()}` : `citation:${reference.unstructuredCitation}`;
  const byIdentity = new Map<string, (typeof candidates)[number][]>();

  candidates.forEach((candidate) =>
    byIdentity.set(identity(candidate), [...(byIdentity.get(identity(candidate)) ?? []), candidate]),
  );

  const dropped = new Set<string>();

  byIdentity.forEach((group) => {
    if (group.length < 2) return;

    const [kept, ...repeats] = group;
    const agree = group.every(
      ({ reference }) => canonicalJson(representedFacts(reference)) === canonicalJson(representedFacts(kept.reference)),
    );

    if (agree) {
      repeats.forEach(({ fact }) => {
        dropped.add(fact.citationKey);
        add({
          code: 'REFERENCE_DUPLICATE_NORMALISED',
          classification: 'SUPPORTED_NORMALIZED',
          blocking: false,
          locations: [fact, kept.fact],
          discriminator: `${fact.path}|${fact.binding}|${kept.fact.path}`,
          detail: { ordinal: fact.ordinal, repeats: kept.fact.ordinal },
          message: `${cited(fact)} repeats cited work ${kept.fact.ordinal} exactly, so it is imported once, at ${kept.fact.ordinal}`,
        });
      });
      return;
    }

    group.forEach(({ fact }) => dropped.add(fact.citationKey));
    add({
      code: 'REFERENCE_DUPLICATE_CONFLICT',
      classification: 'SOURCE_CONFLICT',
      blocking: true,
      locations: group.map(({ fact }) => fact),
      discriminator: group.map(({ fact }) => `${fact.path}|${fact.binding}`).join(','),
      detail: { ordinals: group.map(({ fact }) => String(fact.ordinal)) },
      message: `Cited works ${group.map(({ fact }) => fact.ordinal).join(', ')} of ${describe} name one cited work but state different facts about it; none is taken over the others, so their References cannot be planned until the file agrees`,
    });
  });

  const all = findings.all();

  return {
    references: {
      productKey,
      groupKey,
      asserted: citations.length > 0,
      references: candidates.filter(({ fact }) => !dropped.has(fact.citationKey)).map(({ reference }) => reference),
      pendingFindingKeys: all.filter((finding) => isPending(finding, choices)).map(({ key }) => key),
    },
    findings: all,
  };
};

/**
 * What a new Work's References are: those its Products state, which must be one sequence. A Product stating none is absent
 * evidence; Products stating different sequences contradict each other, and none is taken over another.
 */
export const resolveOnixWorkReferences = (
  groupKey: string,
  target: OnixWorkTargetAction | null,
  members: readonly OnixProductReferences[],
  describe: string,
): { readonly action: OnixWorkReferenceAction; readonly findings: readonly OnixRelatedMaterialFinding[] } => {
  if (target === 'EXISTING_WORK')
    return { action: { groupKey, action: { kind: 'EXISTING_WORK_NOT_UPDATED' } }, findings: [] };

  const asserting = members.filter(({ asserted }) => asserted);

  if (asserting.length === 0) return { action: { groupKey, action: { kind: 'NONE' } }, findings: [] };
  if (asserting.some(({ pendingFindingKeys }) => pendingFindingKeys.length > 0)) {
    return { action: { groupKey, action: { kind: 'BLOCKED' } }, findings: [] };
  }

  const sequences = unique(asserting.map(({ references }) => sequenceOf(references)));

  if (sequences.length > 1) {
    const findings = new RelatedMaterialFindings();

    findings.add({
      family: 'REFERENCE',
      code: 'REFERENCE_GROUP_CONFLICT',
      classification: 'SOURCE_CONFLICT',
      blocking: true,
      productKey: null,
      groupKey,
      locations: asserting.flatMap(({ references }) => references.flatMap(({ locations }) => locations)),
      discriminator: asserting.map(({ productKey, references }) => `${productKey}#${sequenceOf(references)}`).join(','),
      detail: { productKeys: asserting.map(({ productKey }) => productKey) },
      message: `The Products of ${describe} cite different works, or cite them in a different order; a Work has one list of References, and none is taken over another`,
    });

    return { action: { groupKey, action: { kind: 'BLOCKED' } }, findings: findings.all() };
  }

  return {
    action: {
      groupKey,
      action: { kind: 'CREATE', productKey: asserting[0].productKey, references: asserting[0].references },
    },
    findings: [],
  };
};

/**
 * How an attaching Product's canonical Reference sequence compares with the exact existing Work's References (#224
 * Amendment 1): only the fields each source Reference represents are compared, so a target field this source never maps
 * is ignored; equal ordered cardinality, ordinals and represented facts are compatible, and anything else - a source
 * Reference the target lacks, a target-only Reference, a changed fact, order or count - is a contradiction.
 */
export const compareOnixExistingReferences = (
  source: readonly OnixPlannedReference[],
  target: readonly OnixExistingReference[],
): { readonly outcome: 'COMPATIBLE' | 'CONTRADICTED'; readonly reasons: readonly string[] } => {
  const held = [...target].sort((a, b) => a.referenceOrdinal - b.referenceOrdinal);
  const heldFacts = (reference: OnixExistingReference) =>
    new Map(
      representedFacts({
        doi: reference.doi,
        unstructuredCitation: reference.unstructuredCitation,
        isbn: reference.isbn,
        issn: reference.issn,
      }),
    );
  const differing = (stated: OnixPlannedReference, existing: OnixExistingReference) => {
    const facts = heldFacts(existing);

    return representedFacts(stated)
      .filter(([field, value]) => facts.get(field) !== value)
      .map(([field]) => field);
  };
  const agrees = (stated: OnixPlannedReference, existing: OnixExistingReference) =>
    differing(stated, existing).length === 0;
  const reasons: string[] = [];

  if (source.length !== held.length) reasons.push(`CARDINALITY:${source.length}:${held.length}`);

  for (let position = 0; position < Math.max(source.length, held.length); position += 1) {
    const stated = source[position];
    const existing = held[position];

    if (existing === undefined) {
      reasons.push(`SOURCE_ONLY:${stated.referenceOrdinal}`);
    } else if (stated === undefined) {
      reasons.push(`TARGET_ONLY:${existing.referenceOrdinal}`);
    } else if (stated.referenceOrdinal !== existing.referenceOrdinal) {
      reasons.push(`ORDINAL:${stated.referenceOrdinal}:${existing.referenceOrdinal}`);
    } else if (!agrees(stated, existing)) {
      const elsewhere =
        held.some((other) => other !== existing && agrees(stated, other)) &&
        source.some((other) => other !== stated && agrees(other, existing));

      reasons.push(
        elsewhere
          ? `ORDER:${stated.referenceOrdinal}`
          : `FIELDS:${stated.referenceOrdinal}:${differing(stated, existing).join(',')}`,
      );
    }
  }

  return { outcome: reasons.length === 0 ? 'COMPATIBLE' : 'CONTRADICTED', reasons };
};
