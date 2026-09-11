import { evaluateXPath, evaluateXPathToBoolean, evaluateXPathToNodes } from 'fontoxpath';
import type { Document, Element, Node } from 'slimdom';

import type { Ruleset, SchematronReport } from './strict/ruleset';
import { pathOf } from './xdm';

/**
 * Canonical Reference Schematron (thoth#895 stage 7): the `sch:report` and
 * `sch:assert` rules embedded in the pinned strict XSD, evaluated exactly as
 * the SPIKE-02 v4 taint reference does. A context or test that raises is an
 * explicit not-evaluable finding, never an implicit pass. The `role`
 * attribute is carried for display only; the versioned disposition table
 * decides severity.
 */
export interface SchematronFinding {
  readonly id: string;
  readonly report: SchematronReport;
  /** Context node; `null` when the context expression itself raised. */
  readonly node: Node | null;
  /** Element path of the context node; `/` for a non-element context or a context failure. */
  readonly path: string;
  readonly notEvaluable: { readonly phase: 'context' | 'test'; readonly error: string } | null;
}

const own = (record: Readonly<Record<string, string>>, key: string) =>
  Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;

/** Prefix resolution of the reference: the report's in-scope prefix, else its default namespace. */
export function schematronOptions(report: SchematronReport) {
  return {
    language: evaluateXPath.XPATH_3_1_LANGUAGE,
    namespaceResolver: (prefix: string | null) =>
      own(report.prefixes, prefix ?? '') ?? own(report.prefixes, '') ?? null,
  };
}

export const schematronPath = (node: Node) => (node.nodeType === 1 ? pathOf(node as Element) : '/');

/**
 * Cache key of a report's context: identical contexts evaluate to identical node lists on the unchanged tree.
 * A JSON tuple of the context and its prefix bindings, so the key is structurally unambiguous: `JSON.parse`
 * recovers both exactly, and no two distinct (context, bindings) pairs can share a key.
 */
export const schematronContextKey = (report: SchematronReport) => JSON.stringify([report.context, report.prefixes]);

/** Canonical context selection of one report over the whole document; a raising context is returned as the error. */
export function evaluateSchematronContext(report: SchematronReport, document: Document): Node[] | Error {
  try {
    return evaluateXPathToNodes<Node>(report.context, document, null, {}, schematronOptions(report));
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
}

/** The explicit not-evaluable finding of a report whose context expression raised. */
export function schematronContextFailure(report: SchematronReport, error: Error): SchematronFinding {
  return {
    id: report.id,
    report,
    node: null,
    path: '/',
    notEvaluable: { phase: 'context', error: String(error).slice(0, 300) },
  };
}

/**
 * Canonical evaluation of one report on one context node (the per-node body
 * of the SPIKE-02 v4 loop): the finding when the report fires or the test
 * raises, else `null`. Scheduled evaluators reuse exactly this.
 */
export function evaluateSchematronOnNode(
  report: SchematronReport,
  node: Node,
  options: ReturnType<typeof schematronOptions> = schematronOptions(report),
): SchematronFinding | null {
  let hit: boolean;
  try {
    hit = evaluateXPathToBoolean(report.test, node, null, {}, options);
  } catch (error) {
    return {
      id: report.id,
      report,
      node,
      path: schematronPath(node),
      notEvaluable: { phase: 'test', error: String(error).slice(0, 300) },
    };
  }
  return (report.kind === 'report' ? hit : !hit)
    ? { id: report.id, report, node, path: schematronPath(node), notEvaluable: null }
    : null;
}

export function evaluateSchematron(ruleset: Ruleset, document: Document): SchematronFinding[] {
  const findings: SchematronFinding[] = [];
  const contexts = new Map<string, Node[] | Error>();
  for (const report of ruleset.schematron) {
    const options = schematronOptions(report);
    const key = schematronContextKey(report);
    let nodes = contexts.get(key);
    if (nodes === undefined) {
      nodes = evaluateSchematronContext(report, document);
      contexts.set(key, nodes);
    }
    if (nodes instanceof Error) {
      findings.push(schematronContextFailure(report, nodes));
      continue;
    }
    for (const node of nodes) {
      const finding = evaluateSchematronOnNode(report, node, options);
      if (finding) findings.push(finding);
    }
  }
  return findings;
}
