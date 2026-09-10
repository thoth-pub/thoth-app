import type { Document } from 'slimdom';

import { evaluateSchematronScheduled } from '../schematronScheduled';
import { createStrictAccelerators, type StrictAccelerators } from '../strict/accelerators';
import { createCharacterClassSet } from '../strict/characterClasses';
import type { Ruleset } from '../strict/ruleset';
import { evaluateStrictScheduled } from '../strict/scheduled';
import type { ExecutionControls } from '../validator';
import { type ElementIndex, indexElements } from '../xdm';
import type { ValidatorControls } from './session';

/**
 * The execution controls a Worker run hands to the canonical validator
 * (thoth-app#196): observation and cooperative cancellation always; with
 * `accelerate`, the approved no-G2 topology (G1 index-served scheduling,
 * A1-A8 strict fast paths with canonical fallback, S1 Schematron scan) -
 * otherwise the unmodified canonical evaluators. The element index is built
 * once per validated (recovered) tree and shared by both stages; the
 * accelerator table is derived once per compiled ruleset.
 */
export function createExecutionControls(controls: ValidatorControls): ExecutionControls {
  const observation: ExecutionControls = {
    onStage: controls.onStage,
    onProgress: controls.onProgress,
    shouldCancel: controls.shouldCancel,
    yield: controls.yield,
  };
  if (!controls.accelerate) return observation;
  const classes = createCharacterClassSet();
  const accelerators = new WeakMap<Ruleset, StrictAccelerators>();
  const indexes = new WeakMap<Document, ElementIndex>();
  const indexFor = (document: Document) => {
    let index = indexes.get(document);
    if (!index) {
      index = indexElements(document);
      indexes.set(document, index);
    }
    return index;
  };
  const acceleratorsFor = (ruleset: Ruleset) => {
    let table = accelerators.get(ruleset);
    if (!table) {
      table = createStrictAccelerators(ruleset, classes);
      accelerators.set(ruleset, table);
    }
    return table;
  };
  return {
    ...observation,
    strict: (ruleset, document, evaluatorControls) =>
      evaluateStrictScheduled(ruleset, document, {
        index: indexFor(document),
        accelerators: acceleratorsFor(ruleset),
        controls: evaluatorControls,
      }),
    schematron: async (ruleset, document, evaluatorControls) =>
      (
        await evaluateSchematronScheduled(ruleset, document, {
          index: indexFor(document),
          classes,
          controls: evaluatorControls,
        })
      ).findings,
  };
}
