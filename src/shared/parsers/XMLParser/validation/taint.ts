import { evaluateXPath, evaluateXPathToNodes, parseScript } from 'fontoxpath';
import { Document, type Element, type Node } from 'slimdom';

import type { OrdinaryDefectKind } from './ordinaryStage';
import type { SchemaModel } from './schemaModel';
import { ONIX_NAMESPACES, type OnixRelease } from './types';
import { pathOf } from './xdm';

/**
 * Deterministic ordinary-invalid taint policy (SPIKE-02 v4 `tables/taint_policy.md`),
 * ported from the executable reference `evaluator/run_taint.mjs`:
 *
 * - taint T: BLOCKING -> the invalid subtree; BLOCKING_IDENTITY -> only the key
 *   fields of the violated constraint (else the reported element); RECOVERABLE
 *   -> the approved recovery is applied and only the recovery site is tainted;
 *   an unresolved defect -> the whole document (fail safe);
 * - Dep(F) = {context} U every node selected by every predicate-free prefix of
 *   every path expression of the rule's XPath AST; an unresolvable dependency
 *   falls back to subtree(context) only when static analysis proves the rule
 *   cannot escape it, otherwise to the whole document;
 * - F is SECONDARY iff Dep(F) meets T; a raising rule is NOT_EVALUABLE with the
 *   whole-document fail-safe scope.
 *
 * Dependency sets are represented lazily (explicit nodes + a fallback root) so
 * that a whole-document fallback never materialises a document-sized set per
 * finding; the decision and the reported tainted dependencies are exactly
 * those of the reference's materialised sets.
 */
const XQX = 'http://www.w3.org/2005/XQueryX';
const XS = 'http://www.w3.org/2001/XMLSchema';
const LANGUAGE = { language: evaluateXPath.XPATH_3_1_LANGUAGE };
const astDocument = new Document();

type Resolver = (prefix: string | null) => string | null;

const elementChildren = (n: Node) => Array.from(n.childNodes).filter((c): c is Element => c.nodeType === 1);

export function parseDependencyAst(expression: string): Element | null {
  try {
    return parseScript(
      expression,
      LANGUAGE,
      astDocument as unknown as Parameters<typeof parseScript>[2],
    ) as unknown as Element;
  } catch (_error) {
    return null;
  }
}

const ESCAPING_AXES = new Set([
  'parent',
  'ancestor',
  'ancestor-or-self',
  'preceding',
  'preceding-sibling',
  'following',
  'following-sibling',
]);
const ESCAPING_FUNCTIONS = new Set(['root', 'id', 'idref', 'doc', 'collection', 'element-with-id', 'doc-available']);

/** Whether a rule can reach outside its context subtree. `null` (unparseable) always can. */
export function escapes(ast: Element | null): boolean {
  if (!ast) return true;
  let escaping = false;
  const walk = (n: Node) => {
    for (const c of elementChildren(n)) {
      if (escaping) return;
      if (c.namespaceURI === XQX) {
        if (c.localName === 'rootExpr') escaping = true;
        else if (c.localName === 'xpathAxis' && ESCAPING_AXES.has(c.textContent ?? '')) escaping = true;
        else if (c.localName === 'functionName' && ESCAPING_FUNCTIONS.has(c.textContent ?? '')) escaping = true;
      }
      walk(c);
    }
  };
  walk(ast);
  return escaping;
}

export interface PathSteps {
  readonly steps: readonly string[];
  readonly absolute: boolean;
  readonly unknown: boolean;
}

function pathSteps(pathExpr: Element): PathSteps {
  const steps: string[] = [];
  let absolute = false;
  let unknown = false;
  for (const st of elementChildren(pathExpr)) {
    if (st.localName === 'rootExpr') {
      absolute = true;
      continue;
    }
    if (st.localName !== 'stepExpr') continue;
    const kids = elementChildren(st);
    const filter = kids.find((k) => k.localName === 'filterExpr');
    if (filter) {
      const inner = elementChildren(filter)[0];
      if (inner && inner.localName === 'contextItemExpr' && steps.length === 0) continue;
      unknown = true;
      break;
    }
    const axis = kids.find((k) => k.localName === 'xpathAxis')?.textContent ?? 'child';
    const nameTest = kids.find((k) => k.localName === 'nameTest');
    let test: string | null = null;
    if (nameTest) {
      const prefix = nameTest.getAttributeNS(XQX, 'prefix') || nameTest.getAttribute('xqx:prefix') || '';
      test = (prefix ? prefix + ':' : '') + (nameTest.textContent ?? '');
    } else if (kids.some((k) => k.localName === 'Wildcard')) test = '*';
    else if (kids.some((k) => k.localName === 'anyKindTest')) test = 'node()';
    else if (kids.some((k) => k.localName === 'textTest')) test = 'text()';
    if (!test) {
      unknown = true;
      break;
    }
    steps.push(`${axis}::${test}`);
  }
  return { steps, absolute, unknown };
}

/** Every path expression of the AST, outer before nested, in document order. */
export function pathsOf(ast: Element | null): PathSteps[] {
  const out: PathSteps[] = [];
  if (!ast) return out;
  const walk = (n: Node) => {
    for (const c of elementChildren(n)) {
      if (c.namespaceURI === XQX && c.localName === 'pathExpr') out.push(pathSteps(c));
      walk(c);
    }
  };
  walk(ast);
  return out;
}

function subtree(root: Node): Node[] {
  const out: Node[] = [];
  const walk = (n: Node) => {
    out.push(n);
    for (const c of elementChildren(n)) walk(c);
  };
  walk(root);
  return out;
}

function isWithin(node: Node, root: Node): boolean {
  for (let n: Node | null = node; n; n = n.parentNode) if (n === root) return true;
  return false;
}

export interface DependencySet {
  readonly context: Node;
  /** Context and path-selected nodes, in insertion order. */
  readonly explicit: readonly Node[];
  readonly fallback: 'subtree(context)' | 'document' | null;
  readonly paths: readonly string[];
  /** The materialised set (reference semantics); for tests and diagnostics only. */
  readonly nodes: ReadonlySet<Node>;
}

export function dependencySet(
  context: Node,
  ast: Element | null,
  document: Document,
  resolver: Resolver,
): DependencySet {
  const explicit = new Set<Node>([context]);
  let unresolved = !ast;
  const options = { ...LANGUAGE, namespaceResolver: resolver };
  const paths = pathsOf(ast);
  for (const p of paths) {
    if (p.unknown && p.steps.length === 0) {
      unresolved = true;
      continue;
    }
    for (let k = 1; k <= p.steps.length; k++) {
      const expression = (p.absolute ? '/' : '') + p.steps.slice(0, k).join('/');
      try {
        for (const n of evaluateXPathToNodes<Node>(expression, p.absolute ? document : context, null, {}, options)) {
          explicit.add(n);
        }
      } catch (_error) {
        unresolved = true;
      }
    }
    if (p.unknown) unresolved = true;
  }
  const fallback = unresolved ? (escapes(ast) ? 'document' : 'subtree(context)') : null;
  let materialised: Set<Node> | null = null;
  return {
    context,
    explicit: [...explicit],
    fallback,
    paths: paths.map((p) => (p.absolute ? '/' : '') + p.steps.join('/') + (p.unknown ? '/…?' : '')),
    get nodes() {
      if (!materialised) {
        materialised = new Set(explicit);
        if (fallback) {
          for (const n of subtree(fallback === 'document' ? document.documentElement! : context)) materialised.add(n);
        }
      }
      return materialised;
    },
  };
}

/** The taint set with its members in document order (computed once per document). */
export class TaintSet {
  private readonly members = new Set<Node>();
  private ordered: Node[] | null = null;

  add(node: Node): void {
    this.members.add(node);
    this.ordered = null;
  }

  has(node: Node): boolean {
    return this.members.has(node);
  }

  get size(): number {
    return this.members.size;
  }

  [Symbol.iterator](): Iterator<Node> {
    return this.members[Symbol.iterator]();
  }

  inDocumentOrder(document: Document): readonly Node[] {
    if (!this.ordered) {
      this.ordered = document.documentElement
        ? subtree(document.documentElement).filter((n) => this.members.has(n))
        : [];
    }
    return this.ordered;
  }
}

export interface ProjectedDependency {
  readonly disposition: 'AUTHORITATIVE' | 'SECONDARY' | 'NOT_EVALUABLE';
  readonly fallback: 'subtree(context)' | 'document' | null;
  readonly paths: readonly string[];
  /** The first three tainted dependencies in the reference's insertion order. */
  readonly taintedDependencies: readonly string[];
}

const nodePath = (n: Node) => (n.nodeType === 1 ? pathOf(n as Element) : '/');

function project(
  document: Document,
  taint: TaintSet,
  explicit: readonly Node[],
  fallbackRoot: Node | null,
  notEvaluable: boolean,
): { secondary: boolean; tainted: string[] } {
  if (!taint.size) return { secondary: false, tainted: [] };
  const tainted: Node[] = [];
  const seen = new Set<Node>();
  for (const n of explicit) {
    if (taint.has(n) && !seen.has(n)) {
      seen.add(n);
      tainted.push(n);
    }
  }
  if (fallbackRoot) {
    for (const n of taint.inDocumentOrder(document)) {
      if (tainted.length >= 3) break;
      if (!seen.has(n) && isWithin(n, fallbackRoot)) {
        seen.add(n);
        tainted.push(n);
      }
    }
  }
  const secondary = tainted.length > 0;
  return { secondary, tainted: secondary || notEvaluable ? tainted.slice(0, 3).map(nodePath) : [] };
}

/** Projects one later finding (strict, Schematron or XPath inventory rule). */
export function projectDependency(
  context: Node,
  ast: Element | null,
  document: Document,
  resolver: Resolver,
  taint: TaintSet,
  notEvaluable: boolean,
): ProjectedDependency {
  const dep = dependencySet(context, ast, document, resolver);
  if (notEvaluable) {
    // A raising rule's real dependency is unknown: whole-document fail-safe scope.
    const { tainted } = project(document, taint, [], document.documentElement, true);
    return { disposition: 'NOT_EVALUABLE', fallback: 'document', paths: dep.paths, taintedDependencies: tainted };
  }
  const root = dep.fallback === 'document' ? document.documentElement : dep.fallback ? context : null;
  const { secondary, tainted } = project(document, taint, dep.explicit, root, false);
  return {
    disposition: secondary ? 'SECONDARY' : 'AUTHORITATIVE',
    fallback: dep.fallback,
    paths: dep.paths,
    taintedDependencies: tainted,
  };
}

/** Projects a native inventory rule, whose dependency scope is declared statically. */
export function projectNative(
  context: Node,
  scope: 'CONTEXT' | 'SUBTREE',
  document: Document,
  taint: TaintSet,
  notEvaluable: boolean,
): ProjectedDependency {
  if (notEvaluable) {
    const { tainted } = project(document, taint, [], document.documentElement, true);
    return { disposition: 'NOT_EVALUABLE', fallback: 'document', paths: [], taintedDependencies: tainted };
  }
  const { secondary, tainted } = project(document, taint, [context], scope === 'SUBTREE' ? context : null, false);
  return {
    disposition: secondary ? 'SECONDARY' : 'AUTHORITATIVE',
    fallback: scope === 'SUBTREE' ? 'subtree(context)' : null,
    paths: [],
    taintedDependencies: tainted,
  };
}

// ---------------------------------------------------------------------------
// Ordinary defects -> taint set + the approved recovery overlay
// ---------------------------------------------------------------------------
export interface DefectInput {
  readonly kind: OrdinaryDefectKind;
  readonly node: Element | null;
  readonly message: string;
  readonly xpath: string | null;
}

export interface AppliedDefect extends DefectInput {
  /** Path of the reported node in the source tree, before any recovery. */
  readonly resolvedPath: string | null;
  readonly taint: readonly string[];
}

export interface RecoveryMarker {
  readonly recovery: 'OMIT_INVALID_COMPOSITE';
  readonly removed: string;
  readonly taintSite: string;
}

export interface OrdinaryTaint {
  readonly taint: TaintSet;
  readonly defects: readonly AppliedDefect[];
  readonly recoveries: readonly RecoveryMarker[];
}

function referenceResolver(release: OnixRelease): Resolver {
  const namespace = ONIX_NAMESPACES[release].reference;
  return (prefix) => (prefix === '' || prefix == null ? namespace : prefix === 'xs' ? XS : null);
}

const normaliseConstraintName = (name: string) => name.replace(/[·_ ]/g, '');

function identityFieldNodes(node: Element, message: string, model: SchemaModel, release: OnixRelease): Node[] | null {
  const match = /identity-constraint '\{[^}]*\}([^']+)'/.exec(message) || /identity-constraint '([^']+)'/.exec(message);
  const name = match ? normaliseConstraintName(match[1]) : null;
  let constraint: { fields: readonly string[] } | undefined;
  for (const element of Object.values(model.elements)) {
    constraint = (element.uniques ?? []).find((u) => normaliseConstraintName(u.name) === name);
    if (constraint) break;
  }
  if (!constraint) return null;
  const options = { ...LANGUAGE, namespaceResolver: referenceResolver(release) };
  const out: Node[] = [];
  for (const field of constraint.fields) {
    const expression = field.replace(/onix:/g, '');
    if (expression === '.') {
      out.push(node);
      continue;
    }
    try {
      out.push(...evaluateXPathToNodes<Node>(expression, node, null, {}, options));
    } catch (_error) {
      return null;
    }
  }
  return out.length ? out : null;
}

/**
 * Applies the canonical ordinary defects to the evaluation tree: computes the
 * taint set and applies the only approved recovery (`OMIT_INVALID_COMPOSITE`
 * for a `TextContent` missing `Text`). Every defect node was resolved before
 * any mutation, so recoveries cannot shift one another.
 */
export function applyOrdinaryDefects(
  document: Document,
  defects: readonly DefectInput[],
  model: SchemaModel,
  release: OnixRelease,
): OrdinaryTaint {
  const taint = new TaintSet();
  const resolvedPaths = defects.map((d) => (d.node ? pathOf(d.node) : null));
  const removedFrom = new Map<Element, Element>();
  const recoveries: RecoveryMarker[] = [];
  const applied = defects.map((defect, index): AppliedDefect => {
    const { node } = defect;
    const resolvedPath = resolvedPaths[index];
    if (!node) {
      for (const n of subtree(document.documentElement!)) taint.add(n);
      return { ...defect, resolvedPath, taint: ['(unresolved defect: whole document)'] };
    }
    if (defect.kind === 'RECOVERABLE') {
      let parent = removedFrom.get(node);
      if (!parent) {
        parent = node.parentNode as Element;
        parent.removeChild(node);
        removedFrom.set(node, parent);
        recoveries.push({ recovery: 'OMIT_INVALID_COMPOSITE', removed: resolvedPath!, taintSite: pathOf(parent) });
      }
      taint.add(parent);
      return { ...defect, resolvedPath, taint: ['(recovery site) ' + pathOf(parent)] };
    }
    if (defect.kind === 'BLOCKING_IDENTITY') {
      const fields = identityFieldNodes(node, defect.message, model, release);
      for (const field of fields ?? [node]) for (const n of subtree(field)) taint.add(n);
      return {
        ...defect,
        resolvedPath,
        taint: fields ? fields.map(nodePath) : ['(constraint not resolved: whole element) ' + pathOf(node)],
      };
    }
    for (const n of subtree(node)) taint.add(n);
    return { ...defect, resolvedPath, taint: [pathOf(node) + ' (subtree)'] };
  });
  return { taint, defects: applied, recoveries };
}
