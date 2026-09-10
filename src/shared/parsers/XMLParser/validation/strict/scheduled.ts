import type { Document } from 'slimdom';

import type { EvaluatorControls } from '../validator';
import { ValidationCancelledError } from '../validator';
import { type ElementIndex, indexElements } from '../xdm';
import type { StrictAccelerators } from './accelerators';
import {
  evaluateStrictRule,
  type StrictEvaluation,
  type StrictFinding,
  strictFinding,
  strictOptions,
} from './evaluate';
import type { Ruleset, StrictRule } from './ruleset';

/**
 * G1 strict scheduling (thoth-app#196): Product-major, index-served rule
 * binding. Every (rule, element) pair the canonical `evaluateStrict` evaluates
 * is evaluated here exactly once, by the same compiled expression with the
 * same options against the same full document, in a different order; the
 * findings are then restored to the canonical order (document order of the
 * element, then the rule's position in its element's rule list). Accelerated
 * rules take their fast path where its preconditions hold and fall back to
 * the canonical evaluation otherwise. Progress is reported per group (one per
 * Product, plus the global remainder) and cancellation is checked between
 * groups. No expression is rewritten; no G2 exists.
 */
export interface StrictScheduleOptions {
  readonly index?: ElementIndex;
  readonly accelerators?: StrictAccelerators | null;
  readonly controls?: Partial<EvaluatorControls>;
}

export interface ScheduledStrictEvaluation extends StrictEvaluation {
  readonly stats: {
    readonly accelerated: number;
    readonly fallbacks: number;
    readonly canonical: number;
    readonly groups: number;
  };
}

export async function evaluateStrictScheduled(
  ruleset: Ruleset,
  document: Document,
  options: StrictScheduleOptions = {},
): Promise<ScheduledStrictEvaluation> {
  const index = options.index ?? indexElements(document);
  const accelerators = options.accelerators?.byRule ?? null;
  const controls = options.controls ?? {};
  const xpathOptions = strictOptions(ruleset);
  const ruleOrder = new Map<StrictRule, number>();
  for (const rules of ruleset.byElement.values()) rules.forEach((rule, i) => ruleOrder.set(rule, i));

  const findings: (StrictFinding & { readonly ordinal: number; readonly order: number })[] = [];
  let evaluated = 0;
  let accelerated = 0;
  let fallbacks = 0;
  let canonical = 0;
  const groups = index.groups;
  for (let g = 0; g < groups.length; g++) {
    if (controls.shouldCancel?.()) throw new ValidationCancelledError('STRICT');
    const group = groups[g];
    for (const [name, rules] of ruleset.byElement) {
      const elements = group.get(name);
      if (!elements) continue;
      for (const rule of rules) {
        const fastPath = accelerators?.get(rule);
        const order = ruleOrder.get(rule)!;
        for (const element of elements) {
          evaluated++;
          let outcome: boolean | Error | undefined;
          if (fastPath) {
            outcome = fastPath(element);
            if (outcome === undefined) fallbacks++;
            else accelerated++;
          }
          if (outcome === undefined) {
            canonical++;
            outcome = evaluateStrictRule(rule, element, xpathOptions);
          }
          const finding = strictFinding(rule, element, outcome);
          if (finding) findings.push({ ...finding, ordinal: index.ordinalOf(element), order });
        }
      }
    }
    controls.onProgress?.({ stage: 'STRICT', done: g + 1, total: groups.length });
    if (controls.yield) await controls.yield();
  }
  findings.sort((a, b) => a.ordinal - b.ordinal || a.order - b.order);
  return {
    findings: findings.map(({ ordinal: _ordinal, order: _order, ...finding }) => finding),
    evaluated,
    stats: { accelerated, fallbacks, canonical, groups: groups.length },
  };
}
