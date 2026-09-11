import type { Document, Element, Node } from 'slimdom';

import {
  evaluateSchematronContext,
  evaluateSchematronOnNode,
  schematronContextFailure,
  schematronContextKey,
  type SchematronFinding,
  schematronOptions,
  schematronPath,
} from './schematron';
import { type CharacterClassSet, createCharacterClassSet } from './strict/characterClasses';
import type { Ruleset, SchematronReport } from './strict/ruleset';
import type { EvaluatorControls } from './validator';
import { ValidationCancelledError } from './validator';
import { type ElementIndex, indexElements } from './xdm';

/**
 * G1/S1 Schematron scheduling (thoth-app#196). Reports are evaluated in their
 * canonical order, on the canonical node list of their context:
 * - a plain context (`//p:Name`, or a union of them) whose every prefix
 *   resolves to a non-empty namespace is served from the document-order name
 *   index, filtered by that namespace, with XPath union set semantics: each
 *   selected node once (deduplicated by identity), in document order -
 *   exactly the nodes the XPath selects;
 * - every other context is evaluated once per distinct context by the
 *   canonical XPath, as `evaluateSchematron` does;
 * - each (report, node) pair runs the canonical per-node evaluation
 *   (`evaluateSchematronOnNode`, continue-on-error), except the ten accepted
 *   Unicode-block reports (S1), which read one scan per (context, node) of the
 *   text/CDATA children of the node's proper descendants against the derived
 *   class table; direct text children of the context are never scanned,
 *   matching `descendant::*[matches(., R)]`. Any report whose test does not
 *   have the accepted single-class shape stays canonical.
 * Tests are never batched: per-node evaluation is kernel-equivalent by
 * construction. Progress is one unit per report; cancellation is checked
 * between reports.
 */
export const S1_REPORT_IDS: ReadonlySet<string> = new Set([
  '_20200115_d_1',
  '_20200115_d_2',
  '_20200115_d_3',
  '_20200115_d_4',
  '_20200115_d_5',
  '_20200115_d_6',
  '_20200115_d_7',
  '_20200115_d_8',
  '_20200115_d_9',
  '_20190410_c_1',
]);

/** `exists(descendant::*[matches(., 'PATTERN')])` with a single derived character-class pattern. */
const S1_SHAPE = /^exists\(descendant::\*\[matches\(\., '((?:[^'\\]|\\.)*)'\)\]\)$/;
const PLAIN_STEP = /^\/\/(?:([A-Za-z_][\w.-]*):)?([A-Za-z_][\w.-]*)$/;

type Branch = { readonly prefix: string; readonly name: string };

/** Splits a context on top-level `|` (outside brackets, parentheses and string literals). */
function splitUnion(context: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let current = '';
  for (const ch of context) {
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') quote = ch;
    else if (ch === '[' || ch === '(') depth++;
    else if (ch === ']' || ch === ')') depth--;
    if (ch === '|' && depth === 0) {
      out.push(current);
      current = '';
    } else current += ch;
  }
  out.push(current);
  return out.map((s) => s.trim());
}

/** The plain branches of a context, or `null` when any branch is not `//p:Name`. */
export function plainContextBranches(context: string): Branch[] | null {
  const branches: Branch[] = [];
  for (const part of splitUnion(context)) {
    const match = PLAIN_STEP.exec(part);
    if (!match) return null;
    branches.push({ prefix: match[1] ?? '', name: match[2] });
  }
  return branches;
}

/** The S1 pattern literal of a report, or `null` when the report is not an accepted S1 shape. */
export function s1Pattern(report: SchematronReport, classes: CharacterClassSet): string | null {
  if (!S1_REPORT_IDS.has(report.id)) return null;
  const match = S1_SHAPE.exec(report.test.trim());
  if (!match) return null;
  return classes.bit(match[1]) === undefined ? null : match[1];
}

/** One scan of the text/CDATA children of the proper descendant elements of `context`. */
export function scanDescendantText(context: Element, want: number, classes: CharacterClassSet): number {
  let found = 0;
  const stack: Element[] = [];
  for (let c = context.firstChild; c; c = c.nextSibling) if (c.nodeType === 1) stack.push(c as Element);
  while (stack.length && (found & want) !== want) {
    const element = stack.pop()!;
    for (let c = element.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 1) stack.push(c as Element);
      else if (c.nodeType === 3 || c.nodeType === 4) {
        found = classes.scan((c as unknown as { data: string }).data, want, found);
        if ((found & want) === want) return found;
      }
    }
  }
  return found;
}

export interface SchematronScheduleOptions {
  readonly index?: ElementIndex;
  /** `null` disables S1; the generic canonical per-node evaluation runs for every report. */
  readonly classes?: CharacterClassSet | null;
  readonly controls?: Partial<EvaluatorControls>;
}

export interface ScheduledSchematronEvaluation {
  readonly findings: SchematronFinding[];
  readonly stats: {
    readonly indexServedContexts: number;
    readonly canonicalContexts: number;
    readonly s1Reports: number;
    readonly s1Nodes: number;
    readonly canonicalNodes: number;
  };
}

export async function evaluateSchematronScheduled(
  ruleset: Ruleset,
  document: Document,
  options: SchematronScheduleOptions = {},
): Promise<ScheduledSchematronEvaluation> {
  const index = options.index ?? indexElements(document);
  const classes = options.classes === undefined ? createCharacterClassSet() : options.classes;
  const controls = options.controls ?? {};
  const contexts = new Map<string, Node[] | Error>();
  const stats = { indexServedContexts: 0, canonicalContexts: 0, s1Reports: 0, s1Nodes: 0, canonicalNodes: 0 };

  const nodesOf = (report: SchematronReport, key: string): Node[] | Error => {
    let nodes = contexts.get(key);
    if (nodes !== undefined) return nodes;
    const branches = plainContextBranches(report.context);
    const resolve = schematronOptions(report).namespaceResolver;
    const namespaces = branches?.map((branch) => resolve(branch.prefix)) ?? [];
    // Index-served only when every branch resolves to a non-empty namespace; anything else is canonical XPath.
    if (branches && namespaces.every((namespace) => namespace !== null && namespace !== '')) {
      // XPath union: every selected node once, deduplicated by identity, then put in document order.
      const selected = new Map<Element, number>();
      branches.forEach((branch, i) => {
        for (const element of index.byName.get(branch.name) ?? []) {
          if (element.namespaceURI === namespaces[i] && !selected.has(element)) {
            selected.set(element, index.ordinalOf(element));
          }
        }
      });
      const ordered = [...selected];
      if (branches.length > 1) ordered.sort((a, b) => a[1] - b[1]);
      nodes = ordered.map(([element]) => element);
      stats.indexServedContexts++;
    } else {
      nodes = evaluateSchematronContext(report, document);
      stats.canonicalContexts++;
    }
    contexts.set(key, nodes);
    return nodes;
  };

  // S1: one scan per (context, node) covering every S1 report of that context. Keyed by context as well as by
  // node, so a node that several contexts select is scanned for each context's own classes.
  const s1Bits = new Map<SchematronReport, number>();
  const wantByContext = new Map<string, number>();
  if (classes) {
    for (const report of ruleset.schematron) {
      const pattern = s1Pattern(report, classes);
      if (pattern === null) continue;
      const bit = classes.bit(pattern)!;
      s1Bits.set(report, bit);
      const key = schematronContextKey(report);
      wantByContext.set(key, (wantByContext.get(key) ?? 0) | bit);
    }
  }
  const scans = new Map<string, Map<Node, number>>();
  const scanFor = (key: string, node: Element) => {
    let byNode = scans.get(key);
    if (!byNode) {
      byNode = new Map();
      scans.set(key, byNode);
    }
    let found = byNode.get(node);
    if (found === undefined) {
      found = scanDescendantText(node, wantByContext.get(key)!, classes!);
      byNode.set(node, found);
    }
    return found;
  };

  const findings: SchematronFinding[] = [];
  const reports = ruleset.schematron;
  for (let i = 0; i < reports.length; i++) {
    if (controls.shouldCancel?.()) throw new ValidationCancelledError('SCHEMATRON');
    const report = reports[i];
    const key = schematronContextKey(report);
    const nodes = nodesOf(report, key);
    if (nodes instanceof Error) {
      findings.push(schematronContextFailure(report, nodes));
    } else {
      const bit = s1Bits.get(report);
      const xpathOptions = schematronOptions(report);
      if (bit !== undefined) stats.s1Reports++;
      for (const node of nodes) {
        if (bit !== undefined && node.nodeType === 1) {
          stats.s1Nodes++;
          const hit = (scanFor(key, node as Element) & bit) !== 0;
          if (report.kind === 'report' ? hit : !hit) {
            findings.push({ id: report.id, report, node, path: schematronPath(node), notEvaluable: null });
          }
          continue;
        }
        stats.canonicalNodes++;
        const finding = evaluateSchematronOnNode(report, node, xpathOptions);
        if (finding) findings.push(finding);
      }
    }
    controls.onProgress?.({ stage: 'SCHEMATRON', done: i + 1, total: reports.length });
    if (controls.yield) await controls.yield();
  }
  return { findings, stats };
}
