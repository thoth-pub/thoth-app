import { evaluateXPath, evaluateXPathToBoolean } from 'fontoxpath';
import type { Document, Element } from 'slimdom';

import kernelBindings from '../data/kernelBindings.json';
import sourceRuleInventory from '../data/sourceRuleInventory.json';
import { ONIX_NAMESPACES, type OnixRelease } from '../types';
import { buildXdm, pathOf } from '../xdm';
import type { InventoryBinding, InventoryEnvironment } from './bindings';
import { RESIDUAL_FORMALISATIONS } from './formalisations';

export type { InventoryBinding, InventoryEnvironment, NativeInventoryBinding, XPathInventoryBinding } from './bindings';

/**
 * Binding stage-8 source-rule inventory (SPIKE-02 v4, thoth#895): 60 residual
 * normative rules, 27 normative kernels and 2 security/support policies.
 *
 * Execution routes:
 * - the v4 executable kernel/residual XPath bindings (`kernelBindings.json`,
 *   byte-identical to the approved `kernel_rules.json`);
 * - the implementation-time formalisations of the register-only residual rules
 *   (`formalisations.ts`);
 * - the stage-1/2 policies and `R-MSG-NO-DOCTYPE-31` (`sourceGate.ts`).
 *
 * Thoth rules are evaluated with native XPath 3.1 semantics against the
 * canonical Reference tree, context = owner element, exactly as the v4
 * kernel harness and taint reference do. A raising rule is an explicit
 * finding with its error, never an implicit pass.
 */
export interface SourceRuleInventoryEntry {
  readonly id: string;
  readonly kind: 'RESIDUAL_NORMATIVE_RULE' | 'NORMATIVE_KERNEL_RULE' | 'SECURITY_OR_SUPPORT_POLICY';
  readonly releases: readonly ('3.0.8' | '3.1.3')[];
  readonly owner: string;
  readonly authority_class: string;
  readonly authority: string;
  readonly disposition: string;
  readonly execution_stage: number;
  readonly guard: string | null;
}

export const SOURCE_RULE_INVENTORY = sourceRuleInventory as unknown as readonly SourceRuleInventoryEntry[];

interface KernelBindingRecord {
  readonly id: string;
  readonly kind: 'NORMATIVE_KERNEL_RULE' | 'RESIDUAL_NORMATIVE_RULE';
  readonly owner: string;
  readonly releases: readonly OnixRelease[];
  readonly official: string | null;
  readonly disposition: 'NORMATIVE_INVALID' | 'ADVISORY';
  readonly authority_class: string;
  readonly authority: string;
  readonly guard: string | null;
  readonly xpath: string;
}

/** The v4 executable bindings, in their approved order. */
export const KERNEL_BINDINGS = kernelBindings as unknown as readonly KernelBindingRecord[];

/** Inventory entries executed at stages 1-2 rather than by a stage-8 binding. */
export const STAGE_1_2_RULES: readonly string[] = [
  'P-SUPPORT-RELEASE-FLAVOUR',
  'P-SECURITY-DTD',
  'R-MSG-NO-DOCTYPE-31',
];

export function inventoryBindings(release: OnixRelease): readonly InventoryBinding[] {
  return [...KERNEL_BINDINGS, ...RESIDUAL_FORMALISATIONS].filter((b) => b.releases.includes(release));
}

/**
 * Final-architecture authority overlay over the frozen v4 binding text. The v4
 * evidence recorded the narrow EIDR ID Format v1.51 adoption (Content-ID
 * check-character alphabet only) as a proposal; the final thoth#895 decision
 * approved exactly that adoption. The evidence projection stays byte-identical;
 * the emitted finding states the decision. Nothing else about the rule changes.
 */
const FINAL_AUTHORITY_OVERLAYS: readonly { readonly id: string; readonly from: string; readonly to: string }[] = [
  {
    id: 'K-EIDR-CONTENT-ID',
    from: 'PROPOSED adoption (CTO).',
    to:
      'Adoption approved by the final thoth#895 decision, limited to the Content-ID check-character alphabet ' +
      '(no EIDR checksum, registry or Party-ID layout rule is adopted).',
  },
];

/** The authority (or derivation basis) text a finding of this binding carries. */
export function bindingAuthority(binding: InventoryBinding): string {
  const record = binding as InventoryBinding & { readonly authority?: string };
  const text = record.authority ?? binding.basis ?? '';
  const overlay = FINAL_AUTHORITY_OVERLAYS.find((o) => o.id === binding.id);
  return overlay ? text.replace(overlay.from, overlay.to) : text;
}

const XS = 'http://www.w3.org/2001/XMLSchema';

/** Global element names of the pinned XHTML-subset module. */
export function deriveXhtmlElementNames(xhtmlSubsetXsd: string): ReadonlySet<string> {
  const schema = buildXdm(xhtmlSubsetXsd).document.documentElement;
  const names = new Set<string>();
  if (!schema) return names;
  for (const child of schema.childNodes) {
    if (child.nodeType !== 1) continue;
    const element = child as Element;
    if (element.namespaceURI === XS && element.localName === 'element' && element.getAttribute('name')) {
      names.add(element.getAttribute('name')!);
    }
  }
  return names;
}

export interface InventoryFinding {
  readonly id: string;
  readonly binding: InventoryBinding;
  readonly node: Element;
  readonly path: string;
  readonly disposition: 'NORMATIVE_INVALID' | 'ADVISORY';
  /** First line of the error when the rule raised; `null` when it evaluated to false. */
  readonly error: string | null;
}

export function inventoryOptions(release: OnixRelease) {
  const namespace = ONIX_NAMESPACES[release].reference;
  return {
    language: evaluateXPath.XPATH_3_1_LANGUAGE,
    namespaceResolver: (prefix: string | null) =>
      prefix === '' || prefix == null ? namespace : prefix === 'xs' ? XS : null,
  };
}

export function evaluateInventory(
  document: Document,
  release: OnixRelease,
  environment: InventoryEnvironment,
  bindings: readonly InventoryBinding[] = inventoryBindings(release),
): InventoryFinding[] {
  const options = inventoryOptions(release);
  const byOwner = new Map<string, InventoryBinding[]>();
  const forOwner = (name: string) => {
    let list = byOwner.get(name);
    if (!list) {
      list = bindings.filter((b) => b.owner === name || ('native' in b && b.owner === '*'));
      byOwner.set(name, list);
    }
    return list;
  };
  const findings: InventoryFinding[] = [];
  const stack: Element[] = document.documentElement ? [document.documentElement] : [];
  while (stack.length) {
    const element = stack.pop()!;
    for (let c = element.lastChild; c; c = c.previousSibling) if (c.nodeType === 1) stack.push(c as Element);
    for (const binding of forOwner(element.localName)) {
      let ok: boolean;
      try {
        ok =
          'native' in binding
            ? binding.native(element, environment)
            : evaluateXPathToBoolean(binding.xpath, element, null, {}, options);
      } catch (error) {
        findings.push({
          id: binding.id,
          binding,
          node: element,
          path: pathOf(element),
          disposition: binding.disposition,
          error: String(error).split('\n')[0].slice(0, 160),
        });
        continue;
      }
      if (!ok) {
        findings.push({
          id: binding.id,
          binding,
          node: element,
          path: pathOf(element),
          disposition: binding.disposition,
          error: null,
        });
      }
    }
  }
  return findings;
}
