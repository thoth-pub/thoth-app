import type { Document, Element, Node } from 'slimdom';

import { strictDisposition } from './dispositions';
import { makeFinding, type Recoverability, type SourceFinding } from './findings';
import { evaluateStrictRule, strictOptions } from './strict/evaluate';
import type { Ruleset, StrictRule } from './strict/ruleset';
import type { OnixSchemaRelease } from './types';
import { pathOf } from './xdm';

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
 *   not newly violate any assertion that can read it; only then is that one `IDValue` rewritten.
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
  | OrcidLexicalFormMarker;

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
  const recoveries: PostConformanceRecoveryMarker[] = [];
  const findings = input.findings.map((finding, index) => {
    const context = input.contexts.get(index);
    if (!context || !finding.path || pathOf(context) !== finding.path) return finding;
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
      marker = recoverOrcid(context, finding.path, index, input);
    }
    if (!marker) return finding;
    recoveries.push(marker);
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
  const valuePath = rewriteProven(identifier, value, canonical, path, index, input, [ISNI_LEXICAL_RULE]);
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

function recoverOrcid(
  identifier: Element,
  path: string,
  index: number,
  input: RecoveryOverlayInput,
): OrcidLexicalFormMarker | null {
  const value = declaredIdentifierValue(identifier, 'NameIDType', '21');
  if (!value) return null;
  const { original } = value;
  const form = ORCID_COMPATIBILITY_FORM.exec(original);
  if (!form) return null;
  // Only the resolver prefix and the presentation hyphens go: the 16 characters are kept exactly as supplied.
  const canonical = form[1] ?? `${form[2]}${form[3]}${form[4]}${form[5]}`;
  if (canonical === original) return null;
  const valuePath = rewriteProven(identifier, value, canonical, path, index, input, ORCID_RULE_FAMILY);
  if (valuePath === null) return null;
  return {
    recovery: 'NORMALIZE_ORCID_LEXICAL_FORM',
    rule: ORCID_LEXICAL_RULE,
    path,
    valuePath,
    scheme: { element: 'NameIDType', code: '21' },
    original,
    canonical,
  };
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

/**
 * Rewrites one `IDValue` to its canonical value and keeps the rewrite only when every `required` pinned
 * assertion then holds and no assertion that held before now fails; otherwise the supplied nodes are
 * restored. Returns the rewritten `IDValue` path, or null when nothing was kept.
 */
function rewriteProven(
  identifier: Element,
  { idValue, parts }: DeclaredIdentifierValue,
  canonical: string,
  path: string,
  index: number,
  input: RecoveryOverlayInput,
  required: readonly string[],
): string | null {
  // An independent defect of the same composite keeps it unrecovered.
  const inside = `${path}/`;
  const independent = input.findings.some(
    (other, i) => i !== index && other.counts && !!other.path && (other.path === path || other.path.startsWith(inside)),
  );
  if (independent) return null;

  // Every strict assertion that can read this IDValue: those of the identifier's own subtree and, since an
  // XSD 1.1 assertion sees only its element's subtree, those of its ancestors. ONIXMessage-level assertions
  // never read a Publisher or a NameIdentifier (pinned by test) and are left out so a recovery stays bounded
  // by its Product.
  const scope = [...subtreeOf(identifier), ...ancestorsWithinProduct(identifier)];
  const options = strictOptions(input.ruleset);
  const evaluate = () =>
    scope.flatMap((element) =>
      (input.ruleset.byElement.get(element.localName) ?? []).map((rule): [StrictRule, boolean | Error] => [
        rule,
        evaluateStrictRule(rule, element, options),
      ]),
    );

  const before = evaluate();
  const replacement = identifier.ownerDocument!.createTextNode(canonical);
  for (const part of parts) idValue.removeChild(part);
  idValue.appendChild(replacement);
  const after = evaluate();
  const proven = required.every((id) => {
    const outcomes = after.filter(([rule]) => rule.id === id);
    return outcomes.length > 0 && outcomes.every(([, outcome]) => outcome === true);
  });
  const safe = proven && after.every(([, outcome], i) => before[i][1] !== true || outcome === true);
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
