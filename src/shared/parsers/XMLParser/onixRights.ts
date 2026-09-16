import type {
  OnixLicenceExpressionFact,
  OnixLicenceExpressionRole,
  OnixLicenceFact,
  OnixLicenceIdentity,
  OnixManifestationFacts,
  OnixProductLicence,
  OnixProductRights,
  OnixRightsCarrier,
  OnixRightsFinding,
  OnixRightsGroup,
  OnixRightsPlan,
  OnixSourceLocation,
  OnixSourcePlan,
  OnixTechnicalProtectionState,
  OnixUsageConstraintFact,
} from '../../types/onixPlanning';
import type { ExtendedONIXMessageRoot, OnixText } from './interfaces';
import { getOnixText, toOnixArray } from './onix';
import type { ProvenanceResolver } from './validation/worker/provenance';

/**
 * The canonical Product-rights reducer of thoth-app#211, Stage A of #184, under ONIX-AUDIT-LICENCE-USAGE-01 (#179
 * proposal 5568901904, approval 5569159747).
 *
 * It runs after canonical source validation has permitted target planning, on the adapter value bridged from the
 * final normalised Reference XML with its Short-tag provenance, and after #182 has decided which records are Products
 * and which Products manifest one Work. It reads nothing else - no Thoth lookup, no clock, no licence document - and
 * decides nothing about source validity: a fact the validator admitted is never reclassified as invalid here.
 *
 * Rights stay with the Product that states them. Only the grouped Work's licence is decided for the Work, and only
 * from the Products' own intrinsic licences: every other rights fact stays attached to its Product, and whatever
 * Thoth cannot hold keeps the plan from running rather than disappearing from it.
 */

export type ReduceOnixRightsOptions = {
  /** Maps canonical Reference paths back to the submitted source, for a Short-tag file. */
  readonly provenance?: ProvenanceResolver;
};

/* ------------------------------------------------------------------------------------------------ */
/* Supported target licences (rules 15-21, 26-29)                                                    */
/* ------------------------------------------------------------------------------------------------ */

/**
 * How a supported licence may be spelled besides its canonical URL.
 *
 * - `CREATIVE_COMMONS_4_0`: the licence's own `legalcode` or `deed` page, optionally in one language (rule 27: the
 *   existing Creative Commons representation normalisation, kept as an alias of each approved licence only).
 * - `CANONICAL_ONLY`: no alias has been verified, so only the canonical URL names the licence (rule 28).
 */
type OnixLicenceAliases = 'CREATIVE_COMMONS_4_0' | 'CANONICAL_ONLY';

export type OnixSupportedLicence = {
  readonly identity: OnixLicenceIdentity;
  readonly label: string;
  /** The canonical URL Thoth stores as `Work.license`. */
  readonly url: string;
  readonly aliases: OnixLicenceAliases;
};

/** Exactly the approved registry (rule 16): the app's wider licence options never broaden it (rules 18-19). */
export const ONIX_SUPPORTED_LICENCES: readonly OnixSupportedLicence[] = [
  {
    identity: 'CC_BY_4_0',
    label: 'CC BY 4.0',
    url: 'https://creativecommons.org/licenses/by/4.0/',
    aliases: 'CREATIVE_COMMONS_4_0',
  },
  {
    identity: 'CC_BY_SA_4_0',
    label: 'CC BY-SA 4.0',
    url: 'https://creativecommons.org/licenses/by-sa/4.0/',
    aliases: 'CREATIVE_COMMONS_4_0',
  },
  {
    identity: 'CC_BY_ND_4_0',
    label: 'CC BY-ND 4.0',
    url: 'https://creativecommons.org/licenses/by-nd/4.0/',
    aliases: 'CREATIVE_COMMONS_4_0',
  },
  {
    identity: 'CC_BY_NC_4_0',
    label: 'CC BY-NC 4.0',
    url: 'https://creativecommons.org/licenses/by-nc/4.0/',
    aliases: 'CREATIVE_COMMONS_4_0',
  },
  {
    identity: 'CC_BY_NC_SA_4_0',
    label: 'CC BY-NC-SA 4.0',
    url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    aliases: 'CREATIVE_COMMONS_4_0',
  },
  {
    identity: 'CC_BY_NC_ND_4_0',
    label: 'CC BY-NC-ND 4.0',
    url: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
    aliases: 'CREATIVE_COMMONS_4_0',
  },
  {
    identity: 'CC0_1_0',
    label: 'CC0 1.0',
    url: 'https://creativecommons.org/publicdomain/zero/1.0/',
    aliases: 'CANONICAL_ONLY',
  },
  {
    identity: 'PDM_1_0',
    label: 'Public Domain Mark 1.0',
    url: 'https://creativecommons.org/publicdomain/mark/1.0/',
    aliases: 'CANONICAL_ONLY',
  },
];

/**
 * What may follow a Creative Commons 4.0 canonical URL, in full: `legalcode` or `deed`, optionally with one BCP 47
 * language tag of the shape Creative Commons publishes (`deed.fr`, `legalcode.zh-Hant-TW`). Nothing else - no further
 * path, query, fragment or text - so the canonical URL, which ends in a slash, fixes the scheme, host and licence.
 */
const CREATIVE_COMMONS_REPRESENTATION =
  /^(?:legalcode|deed)(?:\.[A-Za-z]{2,3}(?:-[A-Za-z]{4})?(?:-(?:[A-Za-z]{2}|[0-9]{3}))?(?:-(?:[A-Za-z0-9]{5,8}|[0-9][A-Za-z0-9]{3}))*)?$/;

const namesLicence = (link: string, { url, aliases }: OnixSupportedLicence): boolean =>
  link === url ||
  (aliases === 'CREATIVE_COMMONS_4_0' &&
    link.startsWith(url) &&
    CREATIVE_COMMONS_REPRESENTATION.test(link.slice(url.length)));

/**
 * The supported licence an expression link names, through the explicit alias table only, or null.
 *
 * A link is an XML `anyURI`, whose surrounding whitespace is not part of its value; everything else about its
 * spelling is. Nothing here reads a licence name, follows or fetches the link, or matches a domain or a fragment of
 * a path (rules 29, 36): a link the table does not hold names no supported licence.
 */
export const licenceIdentityOf = (link: string): OnixLicenceIdentity | null => {
  const value = link.trim();

  return ONIX_SUPPORTED_LICENCES.find((licence) => namesLicence(value, licence))?.identity ?? null;
};

/* ------------------------------------------------------------------------------------------------ */
/* Reading the adapter                                                                              */
/* ------------------------------------------------------------------------------------------------ */

/** One element occurrence and its canonical path. */
type Occurrence = { readonly value: unknown; readonly path: string };

const isElement = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Every occurrence of a named child, in source order, with its canonical path. `@5stones/onix` emits a single
 * occurrence as a value and a repeated one as an array; positions count same-named siblings from 1, as paths do.
 */
const children = (parent: Occurrence, name: string): Occurrence[] => {
  if (!isElement(parent.value) || !(name in parent.value)) return [];

  const child = parent.value[name];

  return (Array.isArray(child) ? child : [child])
    .map((value, index) => ({ value: value as unknown, path: `${parent.path}/${name}[${index + 1}]` }))
    .filter(({ value }) => value !== undefined && value !== null);
};

const textOf = (occurrence: Occurrence | undefined): string =>
  occurrence === undefined ? '' : getOnixText(occurrence.value as OnixText);

const childText = (parent: Occurrence, name: string): string => textOf(children(parent, name)[0]);

const attributeOf = (occurrence: Occurrence | undefined, name: string): string | null => {
  const value = isElement(occurrence?.value) ? occurrence.value[`@_${name}`] : undefined;

  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
};

const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

/* ------------------------------------------------------------------------------------------------ */
/* Findings                                                                                         */
/* ------------------------------------------------------------------------------------------------ */

type Locate = (path: string) => OnixSourceLocation;

type FindingInput = Omit<OnixRightsFinding, 'key' | 'locations'> & {
  /** Canonical paths of the facts the finding is about, in source order. */
  readonly paths: readonly string[];
  /** What tells this finding apart from another of the same code in the same scope. */
  readonly discriminator: string;
};

/** Raises each finding once per key; the key depends on the file alone, so it is stable across resolutions. */
class RightsFindings {
  private readonly byKey = new Map<string, OnixRightsFinding>();

  constructor(private readonly locate: Locate) {}

  add({ paths, discriminator, ...input }: FindingInput): OnixRightsFinding {
    const key = ['RIGHTS', input.code, input.productKey ?? input.groupKey, discriminator].join('|');
    const existing = this.byKey.get(key);

    if (existing) return existing;

    const finding: OnixRightsFinding = { key, ...input, locations: unique(paths).map(this.locate) };

    this.byKey.set(key, finding);

    return finding;
  }

  all(): OnixRightsFinding[] {
    return [...this.byKey.values()];
  }
}

/* ------------------------------------------------------------------------------------------------ */
/* Product rights (rules 1-14, 22-82)                                                               */
/* ------------------------------------------------------------------------------------------------ */

/** List 218, by what each expression type can be evidence of (rules 22-25). */
const EXPRESSION_ROLES: Readonly<Record<string, OnixLicenceExpressionRole>> = {
  '01': 'INTRINSIC',
  '02': 'INTRINSIC',
  '03': 'ADDITIONAL',
  '04': 'ADDITIONAL',
  '21': 'ADDITIONAL',
  '10': 'POLICY',
  '20': 'POLICY',
};

/** List 144 code 00: the explicit statement that a Product carries no technical protection (rule 46). */
const NO_PROTECTION = '00';

/** List 145 code 00, "No constraints": a statement about the constraint model only, never an open licence (rule 65). */
const NO_CONSTRAINTS = '00';
/** List 145 preview types, which this import has no surface for: an explicit, normally non-blocking, loss (rule 71). */
const PREVIEW_USAGE_TYPES: ReadonlySet<string> = new Set(['01', '10']);
/** List 146: permitted unlimited, permitted subject to limit, prohibited. */
const PERMITTED_UNLIMITED = '01';
const PERMITTED_SUBJECT_TO_LIMIT = '02';
const PROHIBITED = '03';

/** List 150 downloadable and online audio forms, which are digital products although A-forms are otherwise physical. */
const DIGITAL_AUDIO_FORMS: ReadonlySet<string> = new Set(['AJ', 'AN', 'AO']);
/** List 150 families of digital forms: on a digital carrier, delivered electronically, a digital product licence. */
const DIGITAL_FORM = /^[DEL][A-Z]$/;
/** List 150 families of physical forms: audio carriers, books, sheet maps, film, microform, print, video, trade-only and merchandise. */
const PHYSICAL_FORM = /^[ABCFMPVXZ][A-Z]$/;
/** List 2 compositions of a package (thoth-app#182). */
const PACKAGE_COMPOSITIONS: ReadonlySet<string> = new Set(['10', '11', '20', '30', '31']);

/**
 * What a Product's form says about whether its silence on a licence can matter (rule 84). A package or an undefined
 * form is never assumed to be physical: what it contains may be digital.
 */
const carrierOf = ({ composition, form, hasProductParts }: OnixManifestationFacts): OnixRightsCarrier => {
  if (form === null || hasProductParts || (composition !== null && PACKAGE_COMPOSITIONS.has(composition))) {
    return 'UNDETERMINED';
  }

  if (DIGITAL_AUDIO_FORMS.has(form) || DIGITAL_FORM.test(form)) return 'DIGITAL';

  return PHYSICAL_FORM.test(form) ? 'PHYSICAL' : 'UNDETERMINED';
};

/** The ONIX elements that state rights, wherever they are stated. */
const RIGHTS_ELEMENTS: ReadonlySet<string> = new Set(['EpubTechnicalProtection', 'EpubUsageConstraint', 'EpubLicense']);

/**
 * The parts of a Product that hold rights of their own, which Stage A keeps in place and does not reduce (#211;
 * rules 100-115): a ContentItem, a supporting text, a supporting resource version, and a price, whose rights are the
 * ProductSupply contract's. The innermost one holding a rights element is its scope.
 */
const DEFERRED_SCOPE_HOLDERS: Readonly<Record<string, string>> = {
  ContentItem: 'CONTENT_ITEM',
  TextContent: 'TEXT_CONTENT',
  ResourceVersion: 'RESOURCE_VERSION',
  Price: 'PRICE',
};

type ProductContext = {
  readonly productKey: string;
  readonly groupKey: string;
  readonly record: Occurrence;
  readonly describe: string;
  readonly locate: Locate;
  readonly findings: RightsFindings;
};

/** The reduction of one Product, with the findings that decide what its Work's licence can be. */
type ReducedProduct = OnixProductRights & {
  /** The findings that keep its licence from being projected: unidentified, conflicting, dated or unrecognised. */
  readonly licenceFindingKeys: readonly string[];
  /** Material constraints limited or prohibited, which keep any licence from being projected (rule 76). */
  readonly restrictingFindingKeys: readonly string[];
};

const readLicences = (descriptive: Occurrence, locate: Locate): OnixLicenceFact[] =>
  children(descriptive, 'EpubLicense').map((licence) => ({
    ...locate(licence.path),
    names: children(licence, 'EpubLicenseName').map((name) => ({
      ...locate(name.path),
      name: textOf(name),
      language: attributeOf(name, 'language'),
    })),
    expressions: children(licence, 'EpubLicenseExpression').map((expression): OnixLicenceExpressionFact => {
      const type = childText(expression, 'EpubLicenseExpressionType');
      const role = EXPRESSION_ROLES[type] ?? 'UNRECOGNISED';
      const link = childText(expression, 'EpubLicenseExpressionLink');

      return {
        ...locate(expression.path),
        type,
        typeName: childText(expression, 'EpubLicenseExpressionTypeName') || null,
        link,
        role,
        identity: role === 'INTRINSIC' ? licenceIdentityOf(link) : null,
      };
    }),
    dates: children(licence, 'EpubLicenseDate').map((date) => ({
      ...locate(date.path),
      role: childText(date, 'EpubLicenseDateRole'),
      date: childText(date, 'Date'),
      dateFormat: attributeOf(children(date, 'Date')[0], 'dateformat'),
    })),
  }));

const readUsageConstraints = (descriptive: Occurrence, locate: Locate): OnixUsageConstraintFact[] =>
  children(descriptive, 'EpubUsageConstraint').map((constraint) => ({
    ...locate(constraint.path),
    type: childText(constraint, 'EpubUsageType'),
    status: childText(constraint, 'EpubUsageStatus'),
    limits: children(constraint, 'EpubUsageLimit').map((limit) => ({
      ...locate(limit.path),
      quantity: childText(limit, 'Quantity'),
      unit: childText(limit, 'EpubUsageUnit'),
    })),
  }));

const identityUrl = (identity: OnixLicenceIdentity): string =>
  (ONIX_SUPPORTED_LICENCES.find((licence) => licence.identity === identity) as OnixSupportedLicence).url;

/** The intrinsic licence a Product's licences establish, raising what keeps it from being one supported licence. */
const decideLicence = (
  context: ProductContext,
  licences: readonly OnixLicenceFact[],
): { readonly licence: OnixProductLicence; readonly findingKeys: string[] } => {
  const { findings, describe } = context;
  const scope = { productKey: context.productKey, groupKey: context.groupKey };
  const blocking: string[] = [];
  let unsupported = false;

  licences.forEach((licence) => {
    const intrinsic = licence.expressions.filter(({ role }) => role === 'INTRINSIC');

    if (intrinsic.length === 0) {
      unsupported = true;
      blocking.push(
        findings.add({
          ...scope,
          code: 'RIGHTS_LICENCE_UNIDENTIFIED',
          classification: 'TARGET_UNREPRESENTABLE',
          blocking: true,
          paths: [licence.path],
          discriminator: licence.path,
          detail: { names: licence.names.map(({ name }) => name) },
          message: `${describe} states a licence with no human- or professional-readable expression (EpubLicenseExpressionType 01 or 02), and a licence is never identified by its name, so Thoth cannot tell which licence it is; nothing is set from it`,
        }).key,
      );
    }

    licence.expressions.forEach((expression) => {
      if (expression.role === 'INTRINSIC' && expression.identity === null) {
        unsupported = true;
        blocking.push(
          findings.add({
            ...scope,
            code: 'RIGHTS_LICENCE_UNSUPPORTED',
            classification: 'TARGET_UNREPRESENTABLE',
            blocking: true,
            paths: [expression.path],
            discriminator: expression.path,
            detail: { type: expression.type, link: expression.link },
            message: `${describe} states its licence as ${expression.link} (EpubLicenseExpressionType ${expression.type}), which is not one of the licences Thoth can record as a Work licence; the licence is kept as a source fact and is not set`,
          }).key,
        );
      } else if (expression.role === 'UNRECOGNISED') {
        unsupported = true;
        blocking.push(
          findings.add({
            ...scope,
            code: 'RIGHTS_LICENCE_EXPRESSION_UNRECOGNISED',
            classification: 'PREFLIGHT_GAP',
            blocking: true,
            paths: [expression.path],
            discriminator: expression.path,
            detail: { type: expression.type, link: expression.link },
            message: `${describe} states a licence expression of type "${expression.type}", which List 218 does not define, so what its link is evidence of cannot be decided`,
          }).key,
        );
      } else if (expression.role !== 'INTRINSIC') {
        const additional = expression.role === 'ADDITIONAL';

        findings.add({
          ...scope,
          code: additional ? 'RIGHTS_ADDITIONAL_LICENCE_NOT_REPRESENTED' : 'RIGHTS_POLICY_NOT_REPRESENTED',
          classification: 'TARGET_UNREPRESENTABLE',
          blocking: false,
          paths: [expression.path],
          discriminator: expression.path,
          detail: { type: expression.type, link: expression.link },
          message: additional
            ? `${describe} links an additional licence (EpubLicenseExpressionType ${expression.type}: ${expression.link}), which may be obtained besides its own licence; Thoth has nowhere to record it, and it is never taken for the Work's licence`
            : `${describe} links a machine-readable licence policy (EpubLicenseExpressionType ${expression.type}: ${expression.link}); Thoth has nowhere to record it, it is not read or fetched, and it is never taken for the Work's licence`,
        });
      }
    });

    if (licence.dates.length > 0) {
      blocking.push(
        findings.add({
          ...scope,
          code: 'RIGHTS_LICENCE_DATED',
          classification: 'TARGET_INPUT_REQUIRED',
          blocking: true,
          paths: licence.dates.map(({ path }) => path),
          discriminator: licence.path,
          detail: { roles: licence.dates.map(({ role }) => role), dates: licence.dates.map(({ date }) => date) },
          message: `${describe} states when its licence applies (EpubLicenseDate), and a Thoth Work licence has no start or end, so the licence cannot be set as though it always applied`,
        }).key,
      );
    }
  });

  if (licences.length === 0) return { licence: { kind: 'SILENT' }, findingKeys: blocking };

  const identities = unique(
    licences.flatMap(({ expressions }) => expressions.flatMap(({ identity }) => (identity === null ? [] : [identity]))),
  ).sort();

  if (identities.length > 1) {
    blocking.push(
      findings.add({
        ...scope,
        code: 'RIGHTS_LICENCE_EXPRESSION_CONFLICT',
        classification: 'SOURCE_CONFLICT',
        blocking: true,
        paths: licences.flatMap(({ expressions }) =>
          expressions.filter(({ identity }) => identity !== null).map(({ path }) => path),
        ),
        discriminator: 'intrinsic',
        detail: { identities },
        message: `${describe} states its own licence as different licences (${identities.join(', ')}), so none of them is taken`,
      }).key,
    );
  }

  if (unsupported) return { licence: { kind: 'UNSUPPORTED' }, findingKeys: blocking };
  if (identities.length > 1) return { licence: { kind: 'CONFLICT', identities }, findingKeys: blocking };

  return {
    licence: { kind: 'SUPPORTED', identity: identities[0], url: identityUrl(identities[0]) },
    findingKeys: blocking,
  };
};

/** Every technical protection fact of a Product, taken together (rules 45-55). */
const decideTechnicalProtection = (
  context: ProductContext,
  codes: readonly { readonly code: string; readonly path: string }[],
): OnixTechnicalProtectionState => {
  const { findings, describe } = context;
  const scope = { productKey: context.productKey, groupKey: context.groupKey };

  if (codes.length === 0) return 'UNKNOWN';
  if (codes.every(({ code }) => code === NO_PROTECTION)) return 'NONE';

  const stated = codes.map(({ code }) => code);

  if (stated.includes(NO_PROTECTION)) {
    findings.add({
      ...scope,
      code: 'RIGHTS_TECHNICAL_PROTECTION_CONTRADICTION',
      classification: 'SOURCE_CONFLICT',
      blocking: true,
      paths: codes.map(({ path }) => path),
      discriminator: 'protection',
      detail: { codes: stated },
      message: `${describe} states both that it has no technical protection (EpubTechnicalProtection 00) and that it has some (${stated.filter((code) => code !== NO_PROTECTION).join(', ')}), so neither is taken`,
    });

    return 'CONTRADICTORY';
  }

  findings.add({
    ...scope,
    code: 'RIGHTS_TECHNICAL_PROTECTION_UNREPRESENTABLE',
    classification: 'TARGET_UNREPRESENTABLE',
    blocking: true,
    paths: codes.map(({ path }) => path),
    discriminator: 'protection',
    detail: { codes: stated },
    message: `${describe} carries technical protection (EpubTechnicalProtection ${stated.join(', ')}), which Thoth has nowhere to record; importing it without that fact needs an acknowledgement this import cannot take yet`,
  });

  return 'PROTECTED';
};

const limitSignature = ({ status, limits }: OnixUsageConstraintFact) =>
  JSON.stringify([status, limits.map(({ quantity, unit }) => [unit, quantity]).sort()]);

/**
 * Every usage constraint of a Product (rules 56-82). Returns the findings of the material constraints that are limited
 * or prohibited, which also keep a licence from being projected (rule 76).
 */
const decideUsageConstraints = (context: ProductContext, constraints: readonly OnixUsageConstraintFact[]): string[] => {
  const { findings, describe } = context;
  const scope = { productKey: context.productKey, groupKey: context.groupKey };
  const restricting: string[] = [];

  constraints.forEach((constraint) => {
    const { type, status, limits } = constraint;
    const coherent =
      status === PERMITTED_SUBJECT_TO_LIMIT
        ? limits.length > 0
        : (status === PERMITTED_UNLIMITED || status === PROHIBITED) && limits.length === 0;
    const described = `usage type ${type} with status ${status}${limits.length === 0 ? '' : ` and ${limits.length === 1 ? 'a limit' : `${limits.length} limits`}`}`;
    const detail = {
      type,
      status,
      limits: limits.map(({ quantity, unit }) => `${quantity} (unit ${unit})`),
    };
    const paths = [constraint.path];

    if (type === NO_CONSTRAINTS && status === PERMITTED_UNLIMITED && limits.length === 0) return;

    if (PREVIEW_USAGE_TYPES.has(type) && coherent) {
      findings.add({
        ...scope,
        code: 'RIGHTS_USAGE_CONSTRAINT_NOT_REPRESENTED',
        classification: 'TARGET_UNREPRESENTABLE',
        blocking: false,
        paths,
        discriminator: constraint.path,
        detail,
        message: `${describe} states a preview constraint (EpubUsageConstraint ${described}); this import creates no preview, and Thoth has nowhere to record it`,
      });

      return;
    }

    const material = type !== NO_CONSTRAINTS && !PREVIEW_USAGE_TYPES.has(type);
    const finding = findings.add({
      ...scope,
      code: 'RIGHTS_USAGE_CONSTRAINT_UNREPRESENTABLE',
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: true,
      paths,
      discriminator: constraint.path,
      detail,
      message: coherent
        ? `${describe} states how it may be used (EpubUsageConstraint ${described}), which Thoth has nowhere to record; importing it without that restriction needs an acknowledgement this import cannot take yet`
        : `${describe} states a usage constraint whose status and limits do not agree (EpubUsageConstraint ${described}), and it is not read into something they do not say`,
    });

    if (material && (status === PERMITTED_SUBJECT_TO_LIMIT || status === PROHIBITED)) restricting.push(finding.key);
  });

  // One usage type stated more than once must say one thing: a repeat is never first-wins (rule 68).
  unique(constraints.map(({ type }) => type)).forEach((type) => {
    const repeats = constraints.filter((constraint) => constraint.type === type);

    if (unique(repeats.map(limitSignature)).length < 2) return;

    const finding = findings.add({
      ...scope,
      code: 'RIGHTS_USAGE_CONSTRAINT_CONFLICT',
      classification: 'SOURCE_CONFLICT',
      blocking: true,
      paths: repeats.map(({ path }) => path),
      discriminator: `type ${type}`,
      detail: { type, statuses: repeats.map(({ status }) => status) },
      message: `${describe} states usage type ${type} more than once, differently, so none of its statements is taken`,
    });

    if (type !== NO_CONSTRAINTS && !PREVIEW_USAGE_TYPES.has(type)) restricting.push(finding.key);
  });

  return restricting;
};

/** Every child element of an occurrence, by name and in source order, with its canonical path. */
const childElements = (parent: Occurrence): { readonly name: string; readonly occurrence: Occurrence }[] =>
  isElement(parent.value)
    ? Object.keys(parent.value)
        .filter((name) => name !== '#text' && !name.startsWith('@_'))
        .flatMap((name) => children(parent, name).map((occurrence) => ({ name, occurrence })))
    : [];

/**
 * Every rights element stated below the Product itself - anywhere in the record but directly in its DescriptiveDetail,
 * which holds the Product's own rights - with the scope that holds it (or `OTHER`, for a place no approved scope
 * names). They are kept where they are, and each blocks: none is floated to the Product or the Work (rule 4).
 */
const deferredScopesOf = (context: ProductContext): OnixSourceLocation[] => {
  const found: { readonly occurrence: Occurrence; readonly element: string; readonly scope: string }[] = [];
  const walk = (node: Occurrence, scope: string | null) =>
    childElements(node).forEach(({ name, occurrence }) => {
      if (RIGHTS_ELEMENTS.has(name)) found.push({ occurrence, element: name, scope: scope ?? 'OTHER' });
      else walk(occurrence, DEFERRED_SCOPE_HOLDERS[name] ?? scope);
    });

  childElements(context.record).forEach(({ name, occurrence }) => {
    if (name !== 'DescriptiveDetail') {
      walk(occurrence, DEFERRED_SCOPE_HOLDERS[name] ?? null);

      return;
    }

    // The Product's own rights are reduced as the Product's; anything below them in DescriptiveDetail is not.
    childElements(occurrence)
      .filter(({ name: child }) => !RIGHTS_ELEMENTS.has(child))
      .forEach((child) => walk(child.occurrence, DEFERRED_SCOPE_HOLDERS[child.name] ?? null));
  });

  return found.map(({ occurrence, element, scope }) => {
    context.findings.add({
      productKey: context.productKey,
      groupKey: context.groupKey,
      code: 'RIGHTS_SCOPE_DEFERRED',
      classification: 'PREFLIGHT_GAP',
      blocking: true,
      paths: [occurrence.path],
      discriminator: occurrence.path,
      detail: { scope, element },
      message: `${context.describe} states rights (${element}) for one of its parts rather than for the Product itself; they belong to that part alone, reducing them is a later stage's, and the import cannot go ahead with them unread`,
    });

    return context.locate(occurrence.path);
  });
};

const reduceProductRights = (context: ProductContext, facts: OnixManifestationFacts): ReducedProduct => {
  const { record, locate, findings } = context;
  const descriptive = children(record, 'DescriptiveDetail')[0] ?? {
    value: undefined,
    path: `${record.path}/DescriptiveDetail[1]`,
  };
  const before = new Set(findings.all().map(({ key }) => key));

  const licences = readLicences(descriptive, locate);
  const protection = children(descriptive, 'EpubTechnicalProtection').map((occurrence) => ({
    code: textOf(occurrence),
    path: occurrence.path,
  }));
  const usageConstraints = readUsageConstraints(descriptive, locate);

  const { licence, findingKeys: licenceFindingKeys } = decideLicence(context, licences);
  const technicalProtectionState = decideTechnicalProtection(context, protection);
  const restrictingFindingKeys = decideUsageConstraints(context, usageConstraints);
  const deferredScopes = deferredScopesOf(context);

  return {
    productKey: context.productKey,
    groupKey: context.groupKey,
    carrier: carrierOf(facts),
    licences,
    licence,
    dated: licences.some(({ dates }) => dates.length > 0),
    technicalProtection: protection.map(({ code, path }) => ({ ...locate(path), code })),
    technicalProtectionState,
    usageConstraints,
    deferredScopes,
    findingKeys: findings
      .all()
      .map(({ key }) => key)
      .filter((key) => !before.has(key)),
    licenceFindingKeys,
    restrictingFindingKeys,
  };
};

/* ------------------------------------------------------------------------------------------------ */
/* The grouped Work licence (rules 83-92)                                                           */
/* ------------------------------------------------------------------------------------------------ */

/**
 * What a grouped Work's licence becomes, decided from its Products' own intrinsic licences and nothing else.
 *
 * A Product takes part when it states a licence, or when it is not a physical manifestation: a print book says nothing
 * about an e-book licence by not repeating it (rule 84), but a digital manifestation that states none leaves the Work's
 * licence open (rule 87). The Products taking part must name one supported licence between them, with no date and no
 * limited or prohibited material constraint (rules 76, 86); then that licence is the Work's. Otherwise nothing is set
 * automatically, for reasons the findings keep - and a Work none of whose Products gives a licence has none (rule 89).
 * Nothing depends on the order the file states its Products in (rule 92).
 */
const reconcileGroup = (
  groupKey: string,
  members: readonly (ReducedProduct & { readonly recordPath: string })[],
  findings: RightsFindings,
): OnixRightsGroup => {
  const describe = `the Work of ${members.length} grouped products`;
  const participants = members.filter(({ licence, carrier }) => licence.kind !== 'SILENT' || carrier !== 'PHYSICAL');
  const supported = participants.filter(({ licence }) => licence.kind === 'SUPPORTED');
  const silent = participants.filter(({ licence }) => licence.kind === 'SILENT');
  const identities = unique(
    supported.map(({ licence }) => (licence as Extract<OnixProductLicence, { kind: 'SUPPORTED' }>).identity),
  ).sort();
  const evidence = supported.flatMap(({ licences }) =>
    licences.flatMap(({ expressions }) => expressions.filter(({ identity }) => identity !== null)),
  );
  const blocking = participants.flatMap(({ licenceFindingKeys }) => licenceFindingKeys);

  if (identities.length > 1) {
    blocking.push(
      findings.add({
        groupKey,
        productKey: null,
        code: 'RIGHTS_LICENCE_GROUP_CONFLICT',
        classification: 'TARGET_UNREPRESENTABLE',
        blocking: true,
        paths: evidence.map(({ path }) => path),
        discriminator: 'group',
        detail: { identities, productKeys: supported.map(({ productKey }) => productKey).sort() },
        message: `The manifestations of ${describe} are licensed differently (${identities.join(', ')}), and Thoth holds one licence for a Work, so none of them is set`,
      }).key,
    );
  }

  if (identities.length > 0 && silent.length > 0) {
    blocking.push(
      findings.add({
        groupKey,
        productKey: null,
        code: 'RIGHTS_LICENCE_GROUP_AMBIGUOUS',
        classification: 'TARGET_INPUT_REQUIRED',
        blocking: true,
        paths: [...evidence.map(({ path }) => path), ...silent.map(({ recordPath }) => recordPath)],
        discriminator: 'group',
        detail: { identities, silentProductKeys: silent.map(({ productKey }) => productKey).sort() },
        message: `Some manifestations of ${describe} state a licence (${identities.join(', ')}) and a digital or undetermined manifestation states none, so whether the licence is the whole Work's cannot be told from the file; it is not taken for the Work`,
      }).key,
    );
  }

  if (identities.length > 0)
    blocking.push(...participants.flatMap(({ restrictingFindingKeys }) => restrictingFindingKeys));

  if (blocking.length > 0) return { groupKey, licence: { kind: 'BLOCKED', findingKeys: unique(blocking) } };

  if (identities.length === 0) return { groupKey, licence: { kind: 'UNSET' } };

  return {
    groupKey,
    licence: {
      kind: 'SET_SUPPORTED_LICENSE',
      identity: identities[0],
      url: identityUrl(identities[0]),
      productKeys: supported.map(({ productKey }) => productKey).sort(),
      locations: evidence.map(({ path, sourcePath }) => ({ path, sourcePath })),
    },
  };
};

/* ------------------------------------------------------------------------------------------------ */
/* The reduction                                                                                    */
/* ------------------------------------------------------------------------------------------------ */

const describeRecord = (index: number, recordReference: string | null) =>
  recordReference === null ? `product ${index}` : `product ${index} (${recordReference})`;

/**
 * The canonical rights reduction of one message: every Product's rights, and what each grouped Work's licence
 * becomes. Pure and deterministic: the same file always reduces to the same plan.
 */
export const reduceOnixRights = (
  root: ExtendedONIXMessageRoot,
  sourcePlan: OnixSourcePlan,
  options: ReduceOnixRightsOptions = {},
): OnixRightsPlan => {
  const locate: Locate = (path) => ({ path, sourcePath: options.provenance?.sourcePathOf(path) ?? path });
  const findings = new RightsFindings(locate);
  const productValues = toOnixArray(root.ONIXMessage?.Product);
  const recordByKey = new Map(sourcePlan.records.map((record) => [record.recordKey, record]));
  const reduced = new Map<string, ReducedProduct & { readonly recordPath: string }>();

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
      };

      reduced.set(node.productKey, {
        ...reduceProductRights(context, node.manifestationFacts),
        recordPath: record.path,
      });
    });

  const groups = Object.fromEntries(
    sourcePlan.groups.map(({ groupKey }) => [
      groupKey,
      reconcileGroup(
        groupKey,
        [...reduced.values()].filter((product) => product.groupKey === groupKey),
        findings,
      ),
    ]),
  );

  return {
    products: Object.fromEntries(
      [...reduced].map(
        ([productKey, { licenceFindingKeys: _l, restrictingFindingKeys: _r, recordPath: _p, ...rights }]) => [
          productKey,
          rights,
        ],
      ),
    ),
    groups,
    findings: findings.all(),
  };
};
