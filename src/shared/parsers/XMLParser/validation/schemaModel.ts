import model30 from './data/schemaModel30.json';
import model31 from './data/schemaModel31.json';
import type { OnixRelease } from './types';

/**
 * Projection of the SPIKE-02 v4 Reference ordinary schema models
 * (`schema_model_3?_reference.json`), reduced to exactly the fields the
 * canonical evaluator reads: simple-type primitive/variety (typed
 * atomisation), child element names in declaration order (static path
 * typing), schema defaults and identity constraints (identity-defect taint).
 */
export interface SchemaModelElement {
  readonly simple?: { readonly primitive: string; readonly variety: string };
  readonly children?: readonly string[];
  readonly uniques?: readonly {
    readonly name: string;
    readonly selector: string;
    readonly fields: readonly string[];
  }[];
}

export interface SchemaModel {
  readonly release: string;
  readonly ordinarySha256: string;
  readonly defaults: Readonly<Record<string, string>>;
  readonly elements: Readonly<Record<string, SchemaModelElement>>;
}

const asModel = (model: unknown) => model as SchemaModel;

export const SCHEMA_MODELS: Readonly<Record<OnixRelease, SchemaModel>> = {
  '3.0': asModel(model30),
  '3.1': asModel(model31),
};

const own = Object.prototype.hasOwnProperty;

/** Own-property lookup (never an inherited `Object.prototype` member). */
export function modelElement(model: SchemaModel, name: string): SchemaModelElement | undefined {
  return own.call(model.elements, name) ? model.elements[name] : undefined;
}

export function modelDefault(model: SchemaModel, name: string): string | undefined {
  return own.call(model.defaults, name) ? model.defaults[name] : undefined;
}
