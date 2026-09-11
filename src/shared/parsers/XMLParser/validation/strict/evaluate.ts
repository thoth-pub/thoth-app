import { createTypedValueFactory, evaluateXPath, evaluateXPathToBoolean } from 'fontoxpath';
import type { Document, Element, Node, Text } from 'slimdom';

import { modelDefault, type SchemaModel } from '../schemaModel';
import { pathOf } from '../xdm';
import type { Ruleset, StrictRule } from './ruleset';

/**
 * Canonical strict evaluation (SPIKE-02 v4 `canonical.mjs#evaluateStrictDoc`):
 * document order, every rule bound to the element's local name. XSD 1.1
 * §3.13.4.1: an assertion whose evaluation raises is not satisfied; the
 * finding records the error so the disposition layer can make it an explicit
 * RULE_NOT_EVALUABLE finding, never an implicit pass.
 */
const XS = 'http://www.w3.org/2001/XMLSchema';
const STRING_SEQUENCE = createTypedValueFactory('xs:string*');
const STRING = createTypedValueFactory('xs:string');
/** The typed-value factories accept no DOM facade at runtime (as the reference passes `null`). */
const NO_DOM_FACADE = null as unknown as Parameters<typeof STRING>[1];
type Selector = Parameters<typeof evaluateXPathToBoolean>[0];

export interface StrictFinding {
  readonly id: string;
  readonly element: string;
  readonly path: string;
  readonly message: string;
  readonly source: string;
  readonly node: Element;
  readonly rule: StrictRule;
  /** First line of the dynamic error when the assertion raised; `null` when it evaluated to false. */
  readonly dynamicError: string | null;
}

export interface StrictEvaluation {
  readonly findings: readonly StrictFinding[];
  readonly evaluated: number;
}

export interface AppliedDefaults {
  readonly length: number;
  readonly nodes: readonly Text[];
  /** Removes the default text again, restoring the source tree. */
  revert(): void;
}

/** XSD PSVI: an element's @default applies when it is present and empty. */
export function applySchemaDefaults(document: Document, model: SchemaModel): AppliedDefaults {
  const nodes: Text[] = [];
  const walk = (n: Node) => {
    for (const c of Array.from(n.childNodes)) {
      if (c.nodeType !== 1) continue;
      const element = c as Element;
      const value = modelDefault(model, element.localName);
      if (value !== undefined && element.childNodes.length === 0) {
        nodes.push(element.appendChild(document.createTextNode(value)));
      }
      walk(element);
    }
  };
  walk(document);
  return {
    length: nodes.length,
    nodes,
    revert() {
      for (const node of nodes) node.parentNode?.removeChild(node);
    },
  };
}

export function strictOptions(ruleset: Ruleset) {
  const defaultNamespace = ruleset.xpathDefaultNamespace;
  return {
    language: evaluateXPath.XPATH_3_1_LANGUAGE,
    namespaceResolver: (prefix: string | null) =>
      prefix === '' || prefix == null ? defaultNamespace : prefix === 'xs' ? XS : null,
  };
}

/** Evaluates one compiled rule on one element: `true`, `false` or the raised error. */
export function evaluateStrictRule(
  rule: StrictRule,
  element: Element,
  options: ReturnType<typeof strictOptions>,
): boolean | Error {
  try {
    if (rule.compileError) throw new Error('compile: ' + rule.compileError);
    const selector = (rule.ast ?? rule.body) as unknown as Selector;
    if (rule.valueVariety) {
      const collapsed = (element.textContent ?? '')
        .replace(/[\t\n\r]/g, ' ')
        .replace(/ +/g, ' ')
        .trim();
      const value =
        rule.valueVariety === 'list'
          ? STRING_SEQUENCE(collapsed === '' ? [] : collapsed.split(' '), NO_DOM_FACADE)
          : STRING(collapsed, NO_DOM_FACADE);
      return evaluateXPathToBoolean(selector, null, null, { value }, options);
    }
    return evaluateXPathToBoolean(selector, element, null, {}, options);
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
}

/** The finding of one rule outcome on one element (`null` when the assertion holds). */
export function strictFinding(rule: StrictRule, element: Element, outcome: boolean | Error): StrictFinding | null {
  if (outcome === true) return null;
  return {
    id: rule.id,
    element: element.localName,
    path: pathOf(element),
    message: rule.message,
    source: rule.source,
    node: element,
    rule,
    dynamicError: outcome === false ? null : String(outcome).split('\n')[0].slice(0, 160),
  };
}

export function evaluateStrict(ruleset: Ruleset, document: Document): StrictEvaluation {
  const options = strictOptions(ruleset);
  const findings: StrictFinding[] = [];
  let evaluated = 0;
  const stack: Element[] = document.documentElement ? [document.documentElement] : [];
  while (stack.length) {
    const element = stack.pop()!;
    for (let c = element.lastChild; c; c = c.previousSibling) if (c.nodeType === 1) stack.push(c as Element);
    const rules = ruleset.byElement.get(element.localName);
    if (!rules) continue;
    for (const rule of rules) {
      evaluated++;
      const finding = strictFinding(rule, element, evaluateStrictRule(rule, element, options));
      if (finding) findings.push(finding);
    }
  }
  return { findings, evaluated };
}
