import type { Element } from 'slimdom';

import type { SchemaModel } from '../schemaModel';
import { buildXdm } from '../xdm';
import { compileRule } from './compile';
import { registerDecimalFunctions } from './decimal';

/**
 * Rule extraction from the UNMODIFIED official Reference strict XSD (SPIKE-02
 * v4 `canonical.mjs#buildRuleset`): element `xs:assert`/`xs:assertion`,
 * simple-type assertions inherited through `xs:extension`/`xs:restriction`
 * (evaluated with `$value`), and the embedded Schematron reports.
 */
const XS = 'http://www.w3.org/2001/XMLSchema';
const SCH = 'http://purl.oclc.org/dsdl/schematron';

export interface StrictRule {
  readonly id: string;
  readonly test: string;
  readonly body: string;
  readonly message: string;
  /** `element`, or `type:<simple type>` for an inherited simple-type assertion. */
  readonly source: string;
  readonly owner: string;
  /** Set for simple-type assertions, which bind `$value` instead of a context item. */
  readonly valueVariety: 'list' | 'atomic' | null;
  ast: Element | null;
  compileError: string | null;
}

export interface SchematronReport {
  readonly kind: 'report' | 'assert';
  readonly id: string;
  readonly role: string;
  readonly test: string;
  readonly context: string;
  readonly text: string;
  /** In-scope namespace prefixes of the report (`''` = default namespace). */
  readonly prefixes: Readonly<Record<string, string>>;
}

export interface Ruleset {
  readonly targetNamespace: string | null;
  readonly xpathDefaultNamespace: string | null;
  readonly byElement: ReadonlyMap<string, readonly StrictRule[]>;
  readonly schematron: readonly SchematronReport[];
}

const kids = (n: Element): Element[] => Array.from(n.childNodes).filter((c): c is Element => c.nodeType === 1);
function descend(root: Element, ns: string, name: string): Element[] {
  const out: Element[] = [];
  const walk = (n: Element) => {
    for (const c of kids(n)) {
      if (c.namespaceURI === ns && c.localName === name) out.push(c);
      walk(c);
    }
  };
  walk(root);
  return out;
}

function splitMessage(test: string): { message: string; body: string } {
  const parts: string[] = [];
  const body = test.replace(/\(:([\s\S]*?):\)/g, (_m, text: string) => {
    parts.push(text.trim().replace(/\s+/g, ' '));
    return ' ';
  });
  return { message: parts.join(' | '), body };
}

export function buildRuleset(xsdText: string): Ruleset {
  const schema = buildXdm(xsdText).document.documentElement;
  if (!schema) throw new Error('strict schema has no root element');
  const targetNamespace = schema.getAttribute('targetNamespace');
  const raw = schema.getAttribute('xpathDefaultNamespace');
  let xpathDefaultNamespace: string | null;
  if (raw === '##targetNamespace') xpathDefaultNamespace = targetNamespace;
  else if (raw === '##defaultNamespace') xpathDefaultNamespace = schema.lookupNamespaceURI(null);
  else if (raw === '##local' || raw == null) xpathDefaultNamespace = null;
  else xpathDefaultNamespace = raw;

  const typeAsserts = new Map<string, { id: string; test: string; variety: 'list' | 'atomic' }[]>();
  for (const st of descend(schema, XS, 'simpleType')) {
    const name = st.getAttribute('name');
    if (!name) continue;
    const asserts = descend(st, XS, 'assertion').concat(descend(st, XS, 'assert'));
    const variety = descend(st, XS, 'list').length ? 'list' : 'atomic';
    if (asserts.length) {
      typeAsserts.set(
        name,
        asserts.map((a) => ({ id: a.getAttribute('id') ?? '', test: a.getAttribute('test') ?? '', variety })),
      );
    }
  }

  const byElement = new Map<string, StrictRule[]>();
  for (const declaration of kids(schema).filter((k) => k.namespaceURI === XS && k.localName === 'element')) {
    const name = declaration.getAttribute('name');
    if (!name) continue;
    const rules: StrictRule[] = [];
    for (const a of descend(declaration, XS, 'assert').concat(descend(declaration, XS, 'assertion'))) {
      const test = a.getAttribute('test') ?? '';
      rules.push({
        id: a.getAttribute('id') ?? '',
        test,
        ...splitMessage(test),
        source: 'element',
        owner: name,
        valueVariety: null,
        ast: null,
        compileError: null,
      });
    }
    for (const derivation of descend(declaration, XS, 'extension').concat(descend(declaration, XS, 'restriction'))) {
      const base = (derivation.getAttribute('base') ?? '').split(':').pop() ?? '';
      for (const a of typeAsserts.get(base) ?? []) {
        rules.push({
          id: a.id,
          test: a.test,
          ...splitMessage(a.test),
          source: `type:${base}`,
          owner: name,
          valueVariety: a.variety,
          ast: null,
          compileError: null,
        });
      }
    }
    if (rules.length) byElement.set(name, rules);
  }

  const schematron: SchematronReport[] = [];
  for (const rule of descend(schema, SCH, 'rule')) {
    const context = rule.getAttribute('context') ?? '';
    for (const report of kids(rule).filter(
      (c) => c.namespaceURI === SCH && (c.localName === 'report' || c.localName === 'assert'),
    )) {
      const prefixes: Record<string, string> = {};
      const has = (p: string) => Object.prototype.hasOwnProperty.call(prefixes, p);
      for (let e: Element | null = report; e && e.nodeType === 1; e = e.parentNode as Element | null) {
        for (const attribute of Array.from(e.attributes)) {
          if (attribute.name === 'xmlns') {
            if (!has('')) prefixes[''] = attribute.value;
          } else if (attribute.name.startsWith('xmlns:')) {
            const p = attribute.name.slice(6);
            if (!has(p)) prefixes[p] = attribute.value;
          }
        }
      }
      schematron.push({
        kind: report.localName as 'report' | 'assert',
        id: report.getAttribute('id') ?? '',
        role: report.getAttribute('role') || 'error',
        test: report.getAttribute('test') ?? '',
        context,
        text: (report.textContent ?? '').replace(/\s+/g, ' ').trim(),
        prefixes,
      });
    }
  }
  return { targetNamespace, xpathDefaultNamespace, byElement, schematron };
}

/** Compiles every assertion with the pinned rewrites; a compile failure is kept, never dropped. */
export function compileRuleset(ruleset: Ruleset, model: SchemaModel): Ruleset {
  registerDecimalFunctions();
  for (const [owner, rules] of ruleset.byElement) {
    for (const rule of rules) {
      try {
        rule.ast = compileRule(rule.body, { strictAndOr: true, typed: !rule.valueVariety, model, owner });
      } catch (error) {
        rule.compileError = String(error).slice(0, 300);
      }
    }
  }
  return ruleset;
}
