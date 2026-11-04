import type { Document, Element, Node } from 'slimdom';

import { strictDisposition } from './dispositions';
import { makeFinding, type Recoverability, type SourceFinding } from './findings';
import { evaluateStrictRule, strictOptions } from './strict/evaluate';
import type { Ruleset, StrictRule } from './strict/ruleset';
import type { OnixSchemaRelease } from './types';
import { buildXdm, pathOf, serializeXdm } from './xdm';

/**
 * Post-conformance recovery overlay (thoth#923, thoth-app#205).
 *
 * Runs once every conformance tier - ordinary XSD with its `OMIT_INVALID_COMPOSITE` recovery, strict
 * assertions, Schematron and the stage-8 inventory - has evaluated the source and taint projection is
 * complete. Each approved recovery is bound to one exact EDItEUR strict rule and recovers only the
 * authoritative, counting finding of that rule whose own context element proves the recovery safe:
 *
 * - `_20171126_b_42` -> `NORMALIZE_IDENTIFIER_LEXICAL_FORM`: a `PublisherIdentifier` declaring
 *   `PublisherIDType` 16 (ISNI) whose `IDValue` becomes valid by removing ASCII spaces and hyphens
 *   alone. The canonical value must satisfy the pinned strict assertions the validator already runs
 *   (lexical form, range and check character), and must not newly violate any assertion that can read
 *   it; only then is that one `IDValue` rewritten in the normalised tree.
 * - `_20171218_a_2` -> `PUBLISHER_CATEGORY_TO_CUSTOM`: a List 27 code 23 `Subject` without
 *   `SubjectSchemeName` whose category value is deterministic - a non-blank `SubjectCode`, otherwise its
 *   one non-blank `SubjectHeadingText`, trimmed. Nothing in the tree changes: no scheme name is invented,
 *   and the marker carries the category for the downstream `CUSTOM` subject reducer (thoth-app#183).
 * - `_20171126_b_32` -> `NORMALIZE_ORCID_LEXICAL_FORM` (thoth#923 `BULK-IMPORT-ONIX-ORCID-RECOVERY-01`,
 *   thoth-app#240): a `NameIdentifier` declaring `NameIDType` 21 (ORCID) whose `IDValue` is one of the
 *   approved compatibility spellings - the canonical hyphenated identifier, or an exact lower-case
 *   `https://orcid.org/` or `orcid.org/` prefix before the bare or canonical hyphenated identifier. Only
 *   that prefix and the three presentation hyphens are removed; no digit or check character changes. The
 *   bare candidate must make the pinned ORCID lexical, range and check-character assertions true and must
 *   not newly violate any assertion that can read it; only then is that one `IDValue` rewritten. The
 *   declared ORCIDs of one Product are proved together (CR-1), so two a Product-level assertion compares
 *   are canonicalised together or not at all, independently of ledger order, and a pair that cannot be
 *   recovered keeps only itself unrecovered.
 *
 * A recovered finding keeps every field the standard gave it; only its `recoverability` (and so
 * `counts`) changes. Every other finding is returned as the same object. Nothing is fetched and no
 * external identifier authority is consulted.
 */
export const ISNI_LEXICAL_RULE = '_20171126_b_42';
export const PUBLISHER_CATEGORY_RULE = '_20171218_a_2';
export const ORCID_LEXICAL_RULE = '_20171126_b_32';
/** The pinned ORCID lexical, range and check-character assertions every recovered candidate must satisfy. */
export const ORCID_RULE_FAMILY = [ORCID_LEXICAL_RULE, '_20171126_b_106', '_20171126_b_33'] as const;
/**
 * The exact approved ORCID compatibility spellings: an optional exact lower-case resolver prefix, then one
 * identifier either bare (16 characters) or in the canonical four-group hyphenated form. Anything else -
 * another scheme, host, case, query, fragment, path, whitespace or hyphen layout - is not a match.
 */
const ORCID_COMPATIBILITY_FORM =
  /^(?:https:\/\/orcid\.org\/|orcid\.org\/)?(?:([0-9]{15}[0-9Xx])|([0-9]{4})-([0-9]{4})-([0-9]{4})-([0-9]{3}[0-9Xx]))$/;

export interface IdentifierLexicalFormMarker {
  readonly recovery: 'NORMALIZE_IDENTIFIER_LEXICAL_FORM';
  readonly rule: typeof ISNI_LEXICAL_RULE;
  /** Canonical path of the `PublisherIdentifier` the finding reported. */
  readonly path: string;
  /** Canonical path of the one `IDValue` rewritten in the normalised tree. */
  readonly valuePath: string;
  /** The identifier scheme exactly as the source declared it; never inferred from the value. */
  readonly scheme: { readonly element: 'PublisherIDType'; readonly code: '16' };
  /** `IDValue` as supplied. */
  readonly original: string;
  /** `IDValue` with its ASCII spaces and hyphens removed, as it stands in the normalised tree. */
  readonly canonical: string;
}

export interface PublisherCategoryMarker {
  readonly recovery: 'PUBLISHER_CATEGORY_TO_CUSTOM';
  readonly rule: typeof PUBLISHER_CATEGORY_RULE;
  /** Canonical path of the `Subject` the finding reported; the composite is left as supplied. */
  readonly path: string;
  readonly scheme: { readonly element: 'SubjectSchemeIdentifier'; readonly code: '23' };
  /** Where the category value was read from. */
  readonly valueSource: 'SubjectCode' | 'SubjectHeadingText';
  readonly valuePath: string;
  /** The trimmed category value. */
  readonly value: string;
}

export interface OrcidLexicalFormMarker {
  readonly recovery: 'NORMALIZE_ORCID_LEXICAL_FORM';
  readonly rule: typeof ORCID_LEXICAL_RULE;
  /** Canonical path of the `NameIdentifier` the finding reported. */
  readonly path: string;
  /** Canonical path of the one `IDValue` rewritten in the normalised tree. */
  readonly valuePath: string;
  /** The identifier scheme exactly as the source declared it; never inferred from the value. */
  readonly scheme: { readonly element: 'NameIDType'; readonly code: '21' };
  /** `IDValue` as supplied. */
  readonly original: string;
  /** The bare 16-character ORCID, as it stands in the normalised tree. */
  readonly canonical: string;
}

export type PostConformanceRecoveryMarker =
  | IdentifierLexicalFormMarker
  | PublisherCategoryMarker
  | OrcidLexicalFormMarker
  | PublisherSuppliedValueMarker;

export interface RecoveryOverlayInput {
  /** The canonical evaluation tree every tier saw; an ISNI or ORCID recovery rewrites one `IDValue` in it. */
  readonly document: Document;
  readonly schemaRelease: OnixSchemaRelease;
  /** The canonical strict ruleset the validator evaluated. */
  readonly ruleset: Ruleset;
  /** The completed ledger, in stage order. */
  readonly findings: readonly SourceFinding[];
  /** The context element of each strict finding, by its index in `findings`. */
  readonly contexts: ReadonlyMap<number, Element>;
}

export interface RecoveryOverlay {
  readonly findings: readonly SourceFinding[];
  /** One marker per recovered finding, in ledger order. */
  readonly recoveries: readonly PostConformanceRecoveryMarker[];
}

const TEXT_NODE = 3;
const CDATA_SECTION_NODE = 4;
const PRESENTATION_SEPARATORS = /[ -]/g;

export function applyRecoveryOverlay(input: RecoveryOverlayInput): RecoveryOverlay {
  const markers = new Map<number, PostConformanceRecoveryMarker>();
  const orcidCandidates: OrcidCandidate[] = [];
  input.findings.forEach((finding, index) => {
    const context = input.contexts.get(index);
    if (!context || !finding.path || pathOf(context) !== finding.path) return;
    let marker: PostConformanceRecoveryMarker | null = null;
    if (isRecoverable(finding, ISNI_LEXICAL_RULE, input.schemaRelease) && context.localName === 'PublisherIdentifier') {
      marker = recoverIdentifier(context, finding.path, index, input);
    } else if (
      isRecoverable(finding, PUBLISHER_CATEGORY_RULE, input.schemaRelease) &&
      context.localName === 'Subject'
    ) {
      marker = recoverCategory(context, finding.path);
    } else if (
      isRecoverable(finding, ORCID_LEXICAL_RULE, input.schemaRelease) &&
      context.localName === 'NameIdentifier'
    ) {
      const candidate = orcidCandidate(context, finding.path, index, input);
      if (candidate) orcidCandidates.push(candidate);
    }
    if (marker) markers.set(index, marker);
  });
  // ORCID recoveries are proved together, after the sequential ones: two declared ORCIDs a Product-level
  // assertion compares must be canonicalised together or not at all, whatever order the ledger lists them in.
  for (const [index, marker] of recoverOrcids(orcidCandidates, input)) markers.set(index, marker);

  const recoveries = [...markers.entries()].sort(([a], [b]) => a - b).map(([, marker]) => marker);
  const findings = input.findings.map((finding, index) => {
    const marker = markers.get(index);
    if (!marker) return finding;
    const recoverability: Recoverability = marker.recovery;
    return makeFinding({ ...finding, recoverability });
  });
  return { findings, recoveries };
}

/** Only the authoritative, still-counting STRICT validity finding of exactly this rule. */
function isRecoverable(finding: SourceFinding, rule: string, schemaRelease: OnixSchemaRelease): boolean {
  return (
    finding.id === rule &&
    finding.tier === 'STRICT' &&
    finding.stage === 6 &&
    finding.scope === 'VALIDITY' &&
    finding.class === 'NORMATIVE_INVALID' &&
    strictDisposition(schemaRelease, rule)?.[0] === 'NORMATIVE_INVALID' &&
    finding.blocking &&
    finding.projection === 'AUTHORITATIVE' &&
    finding.recoverability === 'NOT_RECOVERABLE' &&
    finding.counts
  );
}

const childElements = (parent: Node): Element[] =>
  Array.from(parent.childNodes).filter((child): child is Element => child.nodeType === 1);

/** The children of one ONIX element with this local name, in the element's own namespace. */
const childrenNamed = (parent: Element, localName: string) =>
  childElements(parent).filter((child) => child.localName === localName && child.namespaceURI === parent.namespaceURI);

function recoverIdentifier(
  identifier: Element,
  path: string,
  index: number,
  input: RecoveryOverlayInput,
): IdentifierLexicalFormMarker | null {
  const value = declaredIdentifierValue(identifier, 'PublisherIDType', '16');
  if (!value) return null;
  const { original } = value;
  const canonical = original.replace(PRESENTATION_SEPARATORS, '');
  if (canonical === original || canonical === '') return null;
  if (hasIndependentDefect(path, index, input)) return null;
  const valuePath = rewriteProven(identifier, value, canonical, input);
  if (valuePath === null) return null;
  return {
    recovery: 'NORMALIZE_IDENTIFIER_LEXICAL_FORM',
    rule: ISNI_LEXICAL_RULE,
    path,
    valuePath,
    scheme: { element: 'PublisherIDType', code: '16' },
    original,
    canonical,
  };
}

/** A declared ORCID the recovery may canonicalise, before anything in the tree has changed. */
interface OrcidCandidate {
  readonly index: number;
  readonly path: string;
  readonly identifier: Element;
  readonly value: DeclaredIdentifierValue;
  readonly canonical: string;
  /** The text node holding `canonical`, created once so a candidate can be shown and hidden repeatedly. */
  readonly replacement: Node;
}

function orcidCandidate(
  identifier: Element,
  path: string,
  index: number,
  input: RecoveryOverlayInput,
): OrcidCandidate | null {
  const value = declaredIdentifierValue(identifier, 'NameIDType', '21');
  if (!value) return null;
  const form = ORCID_COMPATIBILITY_FORM.exec(value.original);
  if (!form) return null;
  // Only the resolver prefix and the presentation hyphens go: the 16 characters are kept exactly as supplied.
  const canonical = form[1] ?? `${form[2]}${form[3]}${form[4]}${form[5]}`;
  if (canonical === value.original) return null;
  if (hasIndependentDefect(path, index, input)) return null;
  return {
    index,
    path,
    identifier,
    value,
    canonical,
    replacement: identifier.ownerDocument!.createTextNode(canonical),
  };
}

/**
 * Proves every ORCID candidate of one Product together (thoth-app#240 CR-1). A Product-level assertion such as
 * `_20191128_c_1` can compare two declared ORCIDs, so canonicalising one of an equal pair alone would break an
 * equality the submitted source satisfies. Starting from all candidates of the Product, each round rewrites the
 * accepted ones together and evaluates every strict assertion that can read any of them (their subtrees and their
 * ancestors within the Product). A candidate is dropped when its own pinned ORCID rules do not all hold. An assertion
 * that held on the submitted source and no longer does is blamed on the dependency clusters (the candidates declaring
 * one ORCID) that break it when rewritten alone against the submitted source; if no cluster breaks it alone, every
 * cluster it contains is blamed. The accepted members of a blamed cluster are dropped together, so a pair is never
 * left half rewritten and a failing cluster never rolls back an unrelated ORCID. Dropped candidates are restored and
 * the round repeats until nothing more is dropped, so every kept rewrite is proved together with all the others.
 * Candidates only ever leave the set and each round depends only on the set, so the result is the same whatever order
 * the ledger or the source lists them in, and it never depends on a value the submitted source did not state.
 */
function recoverOrcids(
  candidates: readonly OrcidCandidate[],
  input: RecoveryOverlayInput,
): [number, OrcidLexicalFormMarker][] {
  const products = new Map<Element, OrcidCandidate[]>();
  for (const candidate of candidates) {
    const product = productOf(candidate.identifier) ?? candidate.identifier;
    products.set(product, [...(products.get(product) ?? []), candidate]);
  }
  const options = strictOptions(input.ruleset);
  const recovered: [number, OrcidLexicalFormMarker][] = [];
  for (const group of products.values()) {
    const scope = proofScope(group.map(({ identifier }) => identifier));
    const before = evaluateScope(scope, input);
    const clusters = orcidClusters(group);
    const accepted = new Set(group);
    const show = (rewritten: ReadonlySet<OrcidCandidate>) => {
      for (const candidate of group) showCanonical(candidate, rewritten.has(candidate));
    };
    while (accepted.size > 0) {
      show(accepted);
      const after = evaluateScope(scope, input);
      const dropped = new Set<OrcidCandidate>();
      for (const candidate of accepted) {
        const own = after.filter(([element]) => element === candidate.identifier);
        const proven = ORCID_RULE_FAMILY.every((id) => {
          const outcomes = own.filter(([, rule]) => rule.id === id);
          return outcomes.length > 0 && outcomes.every(([, , outcome]) => outcome === true);
        });
        if (!proven) dropped.add(candidate);
      }
      after.forEach(([element, rule, outcome], i) => {
        if (before[i][2] !== true || outcome === true) return;
        const involved = clusters
          .map((cluster) => new Set(cluster.filter((candidate) => accepted.has(candidate))))
          .filter((cluster) => [...cluster].some(({ identifier }) => isWithin(identifier, element)));
        const blamed = involved.filter((cluster) => {
          show(cluster);
          return evaluateStrictRule(rule, element, options) !== true;
        });
        // An assertion no accepted candidate can reach cannot have changed; if one did, nothing is trusted.
        const culprits = blamed.length ? blamed : involved.length ? involved : [accepted];
        for (const cluster of culprits) for (const candidate of cluster) dropped.add(candidate);
      });
      if (dropped.size === 0) break;
      for (const candidate of dropped) accepted.delete(candidate);
    }
    show(accepted);
    for (const candidate of group) {
      if (!accepted.has(candidate)) continue;
      recovered.push([
        candidate.index,
        {
          recovery: 'NORMALIZE_ORCID_LEXICAL_FORM',
          rule: ORCID_LEXICAL_RULE,
          path: candidate.path,
          valuePath: pathOf(candidate.value.idValue),
          scheme: { element: 'NameIDType', code: '21' },
          original: candidate.value.original,
          canonical: candidate.canonical,
        },
      ]);
    }
  }
  return recovered;
}

/** Puts a candidate's canonical value, or its supplied nodes, into its `IDValue`. */
function showCanonical(candidate: OrcidCandidate, canonical: boolean): void {
  const { idValue, parts } = candidate.value;
  for (const child of Array.from(idValue.childNodes)) idValue.removeChild(child);
  if (canonical) idValue.appendChild(candidate.replacement);
  else for (const part of parts) idValue.appendChild(part);
}

/**
 * The dependency clusters of one Product's candidates: those declaring one ORCID, however spelt (check character
 * compared case-insensitively). Candidates of different clusters differ in one of their 16 characters, so no assertion
 * can find them equal, as supplied or canonicalised. An assertion that ties clusters some other way is still honoured:
 * blame only chooses what to drop, and every kept rewrite is proved together with all the others.
 */
function orcidClusters(candidates: readonly OrcidCandidate[]): OrcidCandidate[][] {
  const clusters = new Map<string, OrcidCandidate[]>();
  for (const candidate of candidates) {
    const key = candidate.canonical.toUpperCase();
    clusters.set(key, [...(clusters.get(key) ?? []), candidate]);
  }
  return [...clusters.values()];
}

interface DeclaredIdentifierValue {
  readonly idValue: Element;
  /** The text and CDATA nodes `IDValue` holds as supplied, restored when a rewrite is refused. */
  readonly parts: readonly Node[];
  readonly original: string;
}

/** The one text-only `IDValue` of an identifier composite declaring exactly this scheme code; null otherwise. */
function declaredIdentifierValue(
  identifier: Element,
  typeElement: 'PublisherIDType' | 'NameIDType',
  code: '16' | '21',
): DeclaredIdentifierValue | null {
  const types = childrenNamed(identifier, typeElement);
  const values = childrenNamed(identifier, 'IDValue');
  if (types.length !== 1 || types[0].textContent !== code || values.length !== 1) return null;
  const [idValue] = values;
  const parts = Array.from(idValue.childNodes);
  if (!parts.length || parts.some((part) => part.nodeType !== TEXT_NODE && part.nodeType !== CDATA_SECTION_NODE)) {
    return null;
  }
  return { idValue, parts, original: idValue.textContent ?? '' };
}

/** An independent counting defect of the same composite keeps it unrecovered. */
function hasIndependentDefect(path: string, index: number, input: RecoveryOverlayInput): boolean {
  const inside = `${path}/`;
  return input.findings.some(
    (other, i) => i !== index && other.counts && !!other.path && (other.path === path || other.path.startsWith(inside)),
  );
}

/**
 * Every element whose strict assertions can read these identifiers' values: each identifier's own subtree and,
 * since an XSD 1.1 assertion sees only its element's subtree, its ancestors. ONIXMessage-level assertions never
 * read a Publisher or a NameIdentifier (pinned by test) and are left out so a recovery stays bounded by its Product.
 */
function proofScope(identifiers: readonly Element[]): Element[] {
  const scope = new Set<Element>();
  for (const identifier of identifiers) {
    for (const element of [...subtreeOf(identifier), ...ancestorsWithinProduct(identifier)]) scope.add(element);
  }
  return [...scope];
}

type ScopeOutcome = readonly [element: Element, rule: StrictRule, outcome: boolean | Error];

/** Every strict assertion of the scope, evaluated in a fixed order. */
function evaluateScope(scope: readonly Element[], input: RecoveryOverlayInput): ScopeOutcome[] {
  const options = strictOptions(input.ruleset);
  return scope.flatMap((element) =>
    (input.ruleset.byElement.get(element.localName) ?? []).map(
      (rule): ScopeOutcome => [element, rule, evaluateStrictRule(rule, element, options)],
    ),
  );
}

/**
 * Rewrites one declared ISNI `IDValue` to its canonical value and keeps the rewrite only when the pinned ISNI
 * lexical assertion then holds and no assertion that held before now fails; otherwise the supplied nodes are
 * restored. Returns the rewritten `IDValue` path, or null when nothing was kept.
 */
function rewriteProven(
  identifier: Element,
  { idValue, parts }: DeclaredIdentifierValue,
  canonical: string,
  input: RecoveryOverlayInput,
): string | null {
  const scope = proofScope([identifier]);
  const before = evaluateScope(scope, input);
  const replacement = identifier.ownerDocument!.createTextNode(canonical);
  for (const part of parts) idValue.removeChild(part);
  idValue.appendChild(replacement);
  const after = evaluateScope(scope, input);
  const lexical = after.filter(([, rule]) => rule.id === ISNI_LEXICAL_RULE);
  const safe =
    lexical.length > 0 &&
    lexical.every(([, , outcome]) => outcome === true) &&
    after.every(([, , outcome], i) => before[i][2] !== true || outcome === true);
  if (!safe) {
    idValue.removeChild(replacement);
    for (const part of parts) idValue.appendChild(part);
    return null;
  }
  return pathOf(idValue);
}

function recoverCategory(subject: Element, path: string): PublisherCategoryMarker | null {
  const schemes = childrenNamed(subject, 'SubjectSchemeIdentifier');
  if (schemes.length !== 1 || schemes[0].textContent !== '23') return null;
  if (childrenNamed(subject, 'SubjectSchemeName').length) return null;
  const marker = (
    valueSource: PublisherCategoryMarker['valueSource'],
    element: Element,
    value: string,
  ): PublisherCategoryMarker => ({
    recovery: 'PUBLISHER_CATEGORY_TO_CUSTOM',
    rule: PUBLISHER_CATEGORY_RULE,
    path,
    scheme: { element: 'SubjectSchemeIdentifier', code: '23' },
    valueSource,
    valuePath: pathOf(element),
    value,
  });

  const codes = childrenNamed(subject, 'SubjectCode');
  if (codes.length > 1) return null;
  const code = codes[0]?.textContent?.trim();
  if (code) return marker('SubjectCode', codes[0], code);
  const headings = childrenNamed(subject, 'SubjectHeadingText');
  if (headings.length !== 1) return null;
  const heading = headings[0].textContent?.trim();
  return heading ? marker('SubjectHeadingText', headings[0], heading) : null;
}

function subtreeOf(element: Element): Element[] {
  return [element, ...childElements(element).flatMap(subtreeOf)];
}

/** The Product an element lies in, if any. */
function productOf(element: Element): Element | null {
  const ancestors = ancestorsWithinProduct(element);
  const last = ancestors[ancestors.length - 1];
  return last?.localName === 'Product' ? last : null;
}

/** Whether `node` is `container` or lies inside it. */
function isWithin(node: Node, container: Element): boolean {
  for (let current: Node | null = node; current; current = current.parentNode) {
    if (current === container) return true;
  }
  return false;
}

function ancestorsWithinProduct(element: Element): Element[] {
  const ancestors: Element[] = [];
  for (let node = element.parentNode; node && node.nodeType === 1; node = node.parentNode) {
    const ancestor = node as Element;
    if (ancestor.localName === 'ONIXMessage') break;
    ancestors.push(ancestor);
    if (ancestor.localName === 'Product') break;
  }
  return ancestors;
}

/* ------------------------------------------------------------------------------------------------ */
/* Publisher-supplied recoveries (thoth-app#283 APP-IMPORT-ONIX-INLINE-FIX-01)                       */
/* ------------------------------------------------------------------------------------------------ */

/**
 * A publisher-supplied recovery is a recovery of this overlay whose value comes from the publisher, not from
 * the standard or the source: the publisher confirms it in the import review. Each one is bound to one exact
 * allowlisted rule and one finding location, and is applied to the normalised tree only - never to the
 * uploaded bytes. This module holds the pure, tree-level half: the v1 allowlist, the value checks, the edition
 * suggestion, the edit to the normalised tree and the judgement of a re-validation. Running the re-validation
 * and recording the result in the ledger is `revalidatePublisherFix` in `onixSourceBridge.ts`.
 *
 * Nothing here is applied automatically: a suggestion decides nothing, and a fix that the re-validation of the
 * whole normalised source does not prove clean changes nothing.
 */
export const EDITION_STATEMENT_RULE = 'R-EDITION-STATEMENT';
export const SHORT_DESCRIPTION_LENGTH_RULE = '_20171221_e_1';
/** The v1 allowlist, exactly: every further rule needs its own approved amendment (thoth-app#283 item 3). */
export const PUBLISHER_FIX_RULES = [EDITION_STATEMENT_RULE, SHORT_DESCRIPTION_LENGTH_RULE] as const;
export type PublisherFixRule = (typeof PUBLISHER_FIX_RULES)[number];

/** `_20171221_e_1`: a short description must not be longer than 350 characters, including any markup. */
export const SHORT_DESCRIPTION_LIMIT = 350;
/** Thoth stores an edition in a PostgreSQL `integer` (as `onixPlanning.ts` does). */
export const MAX_EDITION_NUMBER = 2_147_483_647;
/** List 153 TextTypes Thoth imports as a Work abstract: short (02) and long (03, 30). */
export const DESCRIPTION_TEXT_TYPES: readonly string[] = ['02', '03', '30'];
const SHORT_DESCRIPTION_TEXT_TYPE = '02';

/** What the publisher asks for, bound to one finding: its rule and its canonical path. */
export type PublisherFix =
  | {
      readonly kind: 'SET_EDITION_NUMBER';
      readonly rule: typeof EDITION_STATEMENT_RULE;
      /** Canonical path of the `DescriptiveDetail` the finding reported. */
      readonly path: string;
      /** The edition number the publisher confirmed; checked by `checkEditionNumber`. */
      readonly edition: number | string;
    }
  | {
      readonly kind: 'REPLACE_SHORT_DESCRIPTION';
      readonly rule: typeof SHORT_DESCRIPTION_LENGTH_RULE;
      /** Canonical path of the `TextContent` the finding reported. */
      readonly path: string;
      /** The replacement, in the editable form `shortDescriptionTarget` returns (markup included). */
      readonly text: string;
    }
  | {
      readonly kind: 'OMIT_SHORT_DESCRIPTION';
      readonly rule: typeof SHORT_DESCRIPTION_LENGTH_RULE;
      /** Canonical path of the `TextContent` the finding reported. */
      readonly path: string;
    };

export type PublisherFixAction = PublisherFix['kind'];

/** Provenance of one applied publisher-supplied recovery: what changed, where, and that the publisher decided it. */
export interface PublisherSuppliedValueMarker {
  readonly recovery: 'PUBLISHER_SUPPLIED_VALUE';
  readonly rule: PublisherFixRule;
  /** Always the publisher: no publisher-supplied value is ever chosen by the importer. */
  readonly decision: 'PUBLISHER';
  readonly action: PublisherFixAction;
  /** Canonical path of the element the finding reported (its context). */
  readonly path: string;
  /** The finding's original source-flavour path (Short provenance), when it recorded one. */
  readonly sourcePath: string | null;
  /** Canonical path of the element written, replaced or left out in the normalised tree, before the fix. */
  readonly valuePath: string;
  /** The value before the fix, in the editable form; `null` when there was none. */
  readonly original: string | null;
  /** The value the publisher supplied; `null` when the publisher chose to leave the element out. */
  readonly value: string | null;
}

export type PublisherFixRefusal =
  | 'RULE_NOT_ALLOWLISTED'
  | 'RULE_MISMATCH'
  | 'NO_FINDING'
  | 'AMBIGUOUS_FINDING'
  | 'NO_NORMALIZED_SOURCE'
  | 'TARGET_NOT_FOUND'
  | 'TARGET_NOT_APPLICABLE'
  | 'AMBIGUOUS_TARGET'
  | 'EDITION_NOT_AN_INTEGER'
  | 'EDITION_NOT_POSITIVE'
  | 'EDITION_TOO_LARGE'
  | 'TEXT_OVER_LIMIT'
  | 'TEXT_EMPTY'
  | 'TEXT_UNCHANGED'
  | 'MALFORMED_MARKUP'
  | 'ONLY_DESCRIPTION';

export type PublisherFixRejection =
  | 'REVALIDATION_UNAVAILABLE'
  | 'FINDING_NOT_REPRODUCED'
  | 'FINDING_REMAINS'
  | 'NEW_BLOCKING_FINDING';

/** Whether a rule is on the v1 allowlist. */
export const isPublisherFixRule = (rule: string): rule is PublisherFixRule =>
  (PUBLISHER_FIX_RULES as readonly string[]).includes(rule);

/** The tier each allowlisted rule is evaluated in; a finding of that id from any other tier is not bound to it. */
const PUBLISHER_FIX_TIER: Readonly<Record<PublisherFixRule, SourceFinding['tier']>> = {
  [EDITION_STATEMENT_RULE]: 'INVENTORY',
  [SHORT_DESCRIPTION_LENGTH_RULE]: 'STRICT',
};

/**
 * Whether a finding is one a publisher fix may recover: an allowlisted rule from its own tier, and still the
 * authoritative, unrecovered, counting NORMATIVE_INVALID finding it was reported as.
 */
export function isPublisherFixable(finding: SourceFinding): boolean {
  return (
    isPublisherFixRule(finding.id) &&
    finding.tier === PUBLISHER_FIX_TIER[finding.id] &&
    finding.scope === 'VALIDITY' &&
    finding.class === 'NORMATIVE_INVALID' &&
    finding.blocking &&
    finding.projection === 'AUTHORITATIVE' &&
    finding.recoverability === 'NOT_RECOVERABLE' &&
    finding.counts &&
    !!finding.path
  );
}

/* Edition number ---------------------------------------------------------------------------------- */

const ORDINAL_WORDS: Readonly<Record<string, number>> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
  ninth: 9,
  tenth: 10,
  eleventh: 11,
  twelfth: 12,
  thirteenth: 13,
  fourteenth: 14,
  fifteenth: 15,
  sixteenth: 16,
  seventeenth: 17,
  eighteenth: 18,
  nineteenth: 19,
  twentieth: 20,
};

/** The English ordinal suffix of a number: 1st, 2nd, 3rd, 4th, 11th-13th, 21st, ... */
const ordinalSuffix = (n: number): string => {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
};

/** The leading token of a statement, and what follows it, which must end the token cleanly. */
const LEADING_TOKEN = /^([A-Za-z]+|[0-9]+(?:st|nd|rd|th)?)(?=$|[\s,;:)])/i;
/** A bare leading number above this is more likely a year or a volume than an edition: no suggestion. */
const MAX_SUGGESTED_BARE_NUMBER = 999;

/**
 * The edition number an `EditionStatement` begins with, when that beginning is an unambiguous English ordinal
 * word ("Third"), numeric ordinal ("3rd", "2nd revised") or small bare number ("3 edition"); otherwise `null`
 * ("New edition", "Revised", "Twenty-first", "2rd", "3.5", "2023 edition"). A suggestion only: it is never
 * applied without the publisher's confirmation.
 */
export function suggestEditionNumber(statement: string | null | undefined): number | null {
  if (!statement) return null;
  const match = LEADING_TOKEN.exec(statement.trim());
  if (!match) return null;
  const token = match[1].toLowerCase();
  if (/^[a-z]+$/.test(token)) return ORDINAL_WORDS[token] ?? null;
  const numeric = /^([0-9]+)(st|nd|rd|th)?$/.exec(token);
  if (!numeric || /^0/.test(numeric[1])) return null;
  const value = Number(numeric[1]);
  if (!Number.isSafeInteger(value) || value < 1) return null;
  if (numeric[2]) return numeric[2] === ordinalSuffix(value) ? checkedEdition(value) : null;
  return value <= MAX_SUGGESTED_BARE_NUMBER ? value : null;
}

const checkedEdition = (value: number) => (value <= MAX_EDITION_NUMBER ? value : null);

export type EditionNumberCheck =
  | { readonly ok: true; readonly value: number }
  | {
      readonly ok: false;
      readonly reason: 'EDITION_NOT_AN_INTEGER' | 'EDITION_NOT_POSITIVE' | 'EDITION_TOO_LARGE';
    };

/**
 * A publisher-supplied edition number: a whole base-10 integer from 1 to `MAX_EDITION_NUMBER`. Zero, negative,
 * fractional, exponent, blank or otherwise non-integer values are refused; nothing is rounded.
 */
export function checkEditionNumber(raw: number | string): EditionNumberCheck {
  const text = typeof raw === 'number' ? (Number.isFinite(raw) ? String(raw) : '') : raw.trim();
  if (!/^[+-]?[0-9]+$/.test(text)) return { ok: false, reason: 'EDITION_NOT_AN_INTEGER' };
  if (text.startsWith('-') || /^[+]?0+$/.test(text)) return { ok: false, reason: 'EDITION_NOT_POSITIVE' };
  const digits = text.replace(/^\+/, '').replace(/^0+/, '');
  if (digits.length > String(MAX_EDITION_NUMBER).length || Number(digits) > MAX_EDITION_NUMBER) {
    return { ok: false, reason: 'EDITION_TOO_LARGE' };
  }
  return { ok: true, value: Number(digits) };
}

/* Short description -------------------------------------------------------------------------------- */

export interface ShortDescriptionMeasure {
  /** Characters (Unicode code points, as XPath `string-length` counts them), markup included. */
  readonly length: number;
  readonly limit: typeof SHORT_DESCRIPTION_LIMIT;
  readonly withinLimit: boolean;
}

/** The live count of a short description in its editable form: every character, markup included. */
export function measureShortDescription(text: string): ShortDescriptionMeasure {
  const length = [...text].length;
  return { length, limit: SHORT_DESCRIPTION_LIMIT, withinLimit: length <= SHORT_DESCRIPTION_LIMIT };
}

/* Tree access ------------------------------------------------------------------------------------- */

const XMLNS_NAMESPACE = 'http://www.w3.org/2000/xmlns/';
const PATH_STEP = /^([^[\]/]+)\[([1-9][0-9]*)\]$/;

/** The element at a canonical path (`pathOf` shape), matched by local name and same-name position. */
export function elementAtPath(document: Document, path: string): Element | null {
  const steps = path.split('/').filter(Boolean);
  let current: Document | Element = document;
  for (const step of steps) {
    const match = PATH_STEP.exec(step);
    if (!match) return null;
    const [, name, position] = match;
    const next: Element | undefined = childElements(current).filter((child) => child.localName === name)[
      Number(position) - 1
    ];
    if (!next) return null;
    current = next;
  }
  return current === document ? null : (current as Element);
}

const singleChildText = (parent: Element, localName: string): string | null => {
  const children = childrenNamed(parent, localName);
  return children.length === 1 ? (children[0].textContent ?? '') : null;
};

/** Whether a `Text` holds markup elements (XHTML), rather than only character data. */
const hasElementChildren = (element: Element) => childElements(element).length > 0;

/**
 * A `Text` in the form the publisher edits and the limit is counted on: its inner XML, markup included, when it
 * holds XHTML elements; otherwise its character data, which is exactly what XPath `string-length` measures.
 */
export function editableTextOf(text: Element): string {
  if (!hasElementChildren(text)) return text.textContent ?? '';
  const serialized = serializeXdm(text);
  if (serialized.endsWith('/>')) return '';
  return serialized.slice(serialized.indexOf('>') + 1, serialized.lastIndexOf('</'));
}

/** The Product an element lies in, if any. */
const productContaining = (element: Element): Element | null => productOf(element);

/** The `Text` children of a short-description `TextContent` and their editable values. */
interface ShortDescriptionTexts {
  readonly textContent: Element;
  readonly texts: readonly { readonly element: Element; readonly value: string }[];
}

function shortDescriptionAt(document: Document, path: string): ShortDescriptionTexts | PublisherFixRefusal {
  const textContent = elementAtPath(document, path);
  if (!textContent) return 'TARGET_NOT_FOUND';
  if (textContent.localName !== 'TextContent') return 'TARGET_NOT_APPLICABLE';
  if (singleChildText(textContent, 'TextType')?.trim() !== SHORT_DESCRIPTION_TEXT_TYPE) return 'TARGET_NOT_APPLICABLE';
  const texts = childrenNamed(textContent, 'Text').map((element) => ({ element, value: editableTextOf(element) }));
  if (!texts.length) return 'TARGET_NOT_APPLICABLE';
  return { textContent, texts };
}

export interface ShortDescriptionTarget {
  /** Canonical path of the one `Text` over the limit. */
  readonly textPath: string;
  /** Its editable value, markup included. */
  readonly original: string;
  readonly measure: ShortDescriptionMeasure;
  /** Whether "don't import a short description for this book" is offered: the Product keeps another description. */
  readonly canOmit: boolean;
}

/**
 * The one `Text` of a short-description `TextContent` that is over the limit, with what the UI needs to edit it.
 * Repeated `Text` elements (languages) of which more than one is over the limit are refused as ambiguous: one fix
 * replaces one value.
 */
export function shortDescriptionTarget(document: Document, path: string): ShortDescriptionTarget | PublisherFixRefusal {
  const found = shortDescriptionAt(document, path);
  if (typeof found === 'string') return found;
  const over = found.texts.filter(({ value }) => !measureShortDescription(value).withinLimit);
  if (over.length === 0) return 'TARGET_NOT_APPLICABLE';
  if (over.length > 1) return 'AMBIGUOUS_TARGET';
  return {
    textPath: pathOf(over[0].element),
    original: over[0].value,
    measure: measureShortDescription(over[0].value),
    canOmit: canOmitShortDescription(document, path),
  };
}

/**
 * Whether the short description at `path` may be left out of the import: only when its Product keeps another
 * description - another `TextContent` of TextType 02, 03 or 30 - so the record never loses its only description.
 */
export function canOmitShortDescription(document: Document, path: string): boolean {
  const textContent = elementAtPath(document, path);
  if (!textContent || textContent.localName !== 'TextContent') return false;
  if (singleChildText(textContent, 'TextType')?.trim() !== SHORT_DESCRIPTION_TEXT_TYPE) return false;
  const product = productContaining(textContent);
  if (!product) return false;
  return subtreeOf(product).some(
    (element) =>
      element !== textContent &&
      element.localName === 'TextContent' &&
      element.namespaceURI === textContent.namespaceURI &&
      DESCRIPTION_TEXT_TYPES.includes(singleChildText(element, 'TextType')?.trim() ?? ''),
  );
}

export interface EditionTarget {
  /** The `EditionStatement` values of the `DescriptiveDetail`, in source order. */
  readonly statements: readonly string[];
  /** The number the first statement begins with, when it is unambiguous; never applied without Confirm. */
  readonly suggestion: number | null;
}

/** The `DescriptiveDetail` an edition fix applies to: statements present, no `EditionType` or `EditionNumber`. */
export function editionTarget(document: Document, path: string): EditionTarget | PublisherFixRefusal {
  const detail = elementAtPath(document, path);
  if (!detail) return 'TARGET_NOT_FOUND';
  if (detail.localName !== 'DescriptiveDetail') return 'TARGET_NOT_APPLICABLE';
  const statements = childrenNamed(detail, 'EditionStatement').map((element) => element.textContent ?? '');
  if (!statements.length) return 'TARGET_NOT_APPLICABLE';
  if (childrenNamed(detail, 'EditionType').length || childrenNamed(detail, 'EditionNumber').length) {
    return 'TARGET_NOT_APPLICABLE';
  }
  return { statements, suggestion: suggestEditionNumber(statements[0]) };
}

/* Applying a fix to the normalised tree ----------------------------------------------------------- */

/** What applying a fix did to the tree: its marker, and the sibling run a removal shifted, if any. */
export interface AppliedPublisherFix {
  readonly marker: Omit<PublisherSuppliedValueMarker, 'sourcePath'>;
  /** A left-out composite: same-named siblings after it now stand one position earlier. */
  readonly removed: { readonly parentPath: string; readonly localName: string; readonly position: number } | null;
}

/** A child element named in its parent's namespace and prefix, as the source would have written it. */
function createSibling(parent: Element, localName: string): Element {
  const prefix = parent.prefix;
  return parent.ownerDocument!.createElementNS(parent.namespaceURI, prefix ? `${prefix}:${localName}` : localName);
}

/** Every namespace declaration in scope at an element, nearest first, as `xmlns` attributes to re-declare. */
function namespaceDeclarationsInScope(element: Element): string {
  const declared = new Map<string, string>();
  for (let node: Node | null = element; node && node.nodeType === 1; node = node.parentNode) {
    for (const attribute of (node as Element).attributes) {
      if (attribute.namespaceURI !== XMLNS_NAMESPACE || declared.has(attribute.name)) continue;
      declared.set(attribute.name, attribute.value);
    }
  }
  return [...declared]
    .map(([name, value]) => ` ${name}="${value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')}"`)
    .join('');
}

/**
 * Parses replacement markup as the content of `text`, in the namespaces in scope there. Returns `null` when it is
 * not well-formed; whether it is valid ONIX is for the re-validation to decide.
 */
function parseTextContent(text: Element, markup: string): Node[] | null {
  let parsed: Document;
  try {
    parsed = buildXdm(`<w${namespaceDeclarationsInScope(text)}>${markup}</w>`).document;
  } catch {
    return null;
  }
  const wrapper = parsed.documentElement!;
  return Array.from(wrapper.childNodes).map((child) => text.ownerDocument!.importNode(child, true));
}

/**
 * Applies one publisher fix to a normalised tree, after checking it can be bound and its value is acceptable.
 * Only the one element the fix names changes: an `EditionNumber` is added to the `DescriptiveDetail`, the one
 * over-limit `Text` is given the publisher's text (never truncated), or the short-description `TextContent` is
 * left out. A refused fix leaves the tree as it was.
 */
export function applyPublisherFixToTree(
  document: Document,
  fix: PublisherFix,
): AppliedPublisherFix | PublisherFixRefusal {
  if (!isPublisherFixRule(fix.rule)) return 'RULE_NOT_ALLOWLISTED';
  const base = { recovery: 'PUBLISHER_SUPPLIED_VALUE' as const, decision: 'PUBLISHER' as const, action: fix.kind };
  switch (fix.kind) {
    case 'SET_EDITION_NUMBER': {
      if (fix.rule !== EDITION_STATEMENT_RULE) return 'RULE_MISMATCH';
      const target = editionTarget(document, fix.path);
      if (typeof target === 'string') return target;
      const checked = checkEditionNumber(fix.edition);
      if (!checked.ok) return checked.reason;
      const detail = elementAtPath(document, fix.path)!;
      const number = createSibling(detail, 'EditionNumber');
      number.appendChild(document.createTextNode(String(checked.value)));
      // XSD sequence: EditionType*, (EditionNumber, EditionVersionNumber?)?, EditionStatement*, NoEdition? ...
      detail.insertBefore(number, childrenNamed(detail, 'EditionStatement')[0]);
      return {
        marker: {
          ...base,
          rule: EDITION_STATEMENT_RULE,
          path: fix.path,
          valuePath: pathOf(number),
          original: null,
          value: String(checked.value),
        },
        removed: null,
      };
    }
    case 'REPLACE_SHORT_DESCRIPTION': {
      if (fix.rule !== SHORT_DESCRIPTION_LENGTH_RULE) return 'RULE_MISMATCH';
      const target = shortDescriptionTarget(document, fix.path);
      if (typeof target === 'string') return target;
      if (fix.text.trim() === '') return 'TEXT_EMPTY';
      if (!measureShortDescription(fix.text).withinLimit) return 'TEXT_OVER_LIMIT';
      if (fix.text === target.original) return 'TEXT_UNCHANGED';
      const text = elementAtPath(document, target.textPath)!;
      const replacement = hasElementChildren(text)
        ? parseTextContent(text, fix.text)
        : [document.createTextNode(fix.text)];
      if (!replacement) return 'MALFORMED_MARKUP';
      for (const child of Array.from(text.childNodes)) text.removeChild(child);
      for (const child of replacement) text.appendChild(child);
      return {
        marker: {
          ...base,
          rule: SHORT_DESCRIPTION_LENGTH_RULE,
          path: fix.path,
          valuePath: target.textPath,
          original: target.original,
          value: fix.text,
        },
        removed: null,
      };
    }
    case 'OMIT_SHORT_DESCRIPTION': {
      if (fix.rule !== SHORT_DESCRIPTION_LENGTH_RULE) return 'RULE_MISMATCH';
      const target = shortDescriptionTarget(document, fix.path);
      if (typeof target === 'string') return target;
      if (!target.canOmit) return 'ONLY_DESCRIPTION';
      const textContent = elementAtPath(document, fix.path)!;
      const parent = textContent.parentNode as Element;
      const position = childrenNamed(parent, 'TextContent').indexOf(textContent) + 1;
      const parentPath = pathOf(parent);
      parent.removeChild(textContent);
      return {
        marker: {
          ...base,
          rule: SHORT_DESCRIPTION_LENGTH_RULE,
          path: fix.path,
          valuePath: fix.path,
          original: target.original,
          value: null,
        },
        removed: { parentPath, localName: 'TextContent', position },
      };
    }
  }
}

/* Judging a re-validation ------------------------------------------------------------------------- */

/**
 * Maps a canonical path of the fixed tree back to the path the same element had before the fix: where a
 * composite was left out, its later same-named siblings move back one position. Every other path is unchanged.
 */
export function pathBeforeFix(path: string, removed: AppliedPublisherFix['removed']): string {
  if (!removed) return path;
  const prefix = `${removed.parentPath}/${removed.localName}[`;
  if (!path.startsWith(prefix)) return path;
  const rest = path.slice(prefix.length);
  const close = rest.indexOf(']');
  const position = Number(rest.slice(0, close));
  return position >= removed.position ? `${prefix}${position + 1}${rest.slice(close)}` : path;
}

const findingKey = (finding: SourceFinding, path: string | null | undefined) =>
  JSON.stringify([finding.id, finding.tier, path ?? null]);

export type RevalidationJudgement =
  | { readonly accepted: true }
  | {
      readonly accepted: false;
      readonly reason: Exclude<PublisherFixRejection, 'REVALIDATION_UNAVAILABLE'>;
      /** The findings of the re-validation that kept the fix from being accepted. */
      readonly findings: readonly SourceFinding[];
    };

/**
 * Judges a re-validation of the whole normalised source: `before` validates the tree without the fix, `after`
 * with it. The fix is accepted only when its own finding (rule and location) counted before and is not reported
 * at all after, and no blocking finding appears after that was not there before - compared by rule, tier and
 * location as multisets, with `after` paths mapped back across a left-out composite. A new blocking finding is
 * refused whether or not it would count: one an automatic recovery would handle (an ordinary omission of invalid
 * markup, say) would otherwise let a fix quietly remove what the publisher meant to supply.
 */
export function judgeRevalidation(
  fix: PublisherFix,
  before: readonly SourceFinding[],
  after: readonly SourceFinding[],
  removed: AppliedPublisherFix['removed'],
): RevalidationJudgement {
  const own = (finding: SourceFinding, path: string | null | undefined) => finding.id === fix.rule && path === fix.path;
  if (!before.some((finding) => finding.counts && own(finding, finding.path))) {
    return { accepted: false, reason: 'FINDING_NOT_REPRODUCED', findings: [] };
  }
  const mapped = after.map((finding) => ({
    finding,
    path: finding.path ? pathBeforeFix(finding.path, removed) : finding.path,
  }));
  const remaining = mapped.filter(({ finding, path }) => own(finding, path)).map(({ finding }) => finding);
  if (remaining.length) return { accepted: false, reason: 'FINDING_REMAINS', findings: remaining };

  const counted = new Map<string, number>();
  for (const finding of before) {
    if (!finding.blocking) continue;
    const key = findingKey(finding, finding.path);
    counted.set(key, (counted.get(key) ?? 0) + 1);
  }
  const added: SourceFinding[] = [];
  for (const { finding, path } of mapped) {
    if (!finding.blocking) continue;
    const key = findingKey(finding, path);
    const left = counted.get(key) ?? 0;
    if (left > 0) counted.set(key, left - 1);
    else added.push(finding);
  }
  return added.length ? { accepted: false, reason: 'NEW_BLOCKING_FINDING', findings: added } : { accepted: true };
}

/**
 * Records an accepted publisher fix in the ledger of the uploaded file: its one finding - the counting finding of
 * exactly that rule at exactly that location - becomes `PUBLISHER_SUPPLIED_VALUE`, so it no longer counts. It keeps
 * every field the standard gave it, its class included; every other finding, advisories included, is returned as
 * the same object. Returns `null` unless exactly one such finding is there.
 */
export function recordPublisherFix(
  findings: readonly SourceFinding[],
  fix: Pick<PublisherFix, 'rule' | 'path'>,
): readonly SourceFinding[] | null {
  const matches = findings.flatMap((finding, index) =>
    isPublisherFixable(finding) && finding.id === fix.rule && finding.path === fix.path ? [index] : [],
  );
  if (matches.length !== 1) return null;
  const [target] = matches;
  return findings.map((finding, index) =>
    index === target ? makeFinding({ ...finding, recoverability: 'PUBLISHER_SUPPLIED_VALUE' }) : finding,
  );
}
