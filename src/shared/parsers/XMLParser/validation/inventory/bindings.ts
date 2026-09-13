import type { Element } from 'slimdom';

import type { OnixRelease } from '../types';

/** Facts a native rule may need beyond the tree itself. */
export interface InventoryEnvironment {
  /** The message begins with an XML declaration (from the stage-2 prolog scan). */
  readonly xmlDeclaration: boolean;
  /** Global element names of the pinned XHTML-subset module. */
  readonly xhtmlElementNames: ReadonlySet<string>;
}

interface BindingBase {
  readonly id: string;
  readonly kind: 'NORMATIVE_KERNEL_RULE' | 'RESIDUAL_NORMATIVE_RULE';
  /** Local name of the context element (`*` = every element, native rules only). */
  readonly owner: string;
  readonly releases: readonly OnixRelease[];
  readonly disposition: 'NORMATIVE_INVALID' | 'ADVISORY';
  readonly guard?: string | null;
  /** How an implementation-time formalisation was derived from its approved requirement. */
  readonly basis?: string;
}

/** A rule that holds when its XPath 3.1 expression is true with the owner as context. */
export interface XPathInventoryBinding extends BindingBase {
  readonly xpath: string;
}

/** A rule that XPath cannot state cleanly; `native` returns true when the rule holds. */
export interface NativeInventoryBinding extends BindingBase {
  readonly native: (element: Element, environment: InventoryEnvironment) => boolean;
  /** Static dependency scope for taint projection. */
  readonly dependency: 'CONTEXT' | 'SUBTREE';
}

export type InventoryBinding = XPathInventoryBinding | NativeInventoryBinding;
