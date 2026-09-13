import type { Element } from 'slimdom';

import { buildXdm } from './xdm';

/**
 * Schema-derived Short-to-Reference tag correspondence (SPIKE-02 §10), derived
 * at runtime from the unmodified pinned ordinary schemas: global element
 * declarations are paired by position, then local named declarations by
 * position. Any count mismatch or local/global conflict fails loudly.
 */
export interface TagMap {
  readonly shortToReference: ReadonlyMap<string, string>;
  readonly referenceToShort: ReadonlyMap<string, string>;
  readonly shortNamespace: string;
  readonly referenceNamespace: string;
  readonly globalCount: number;
  readonly localCount: number;
}

const XS = 'http://www.w3.org/2001/XMLSchema';

const isNamedDeclaration = (node: Element) =>
  node.namespaceURI === XS && node.localName === 'element' && !!node.getAttribute('name');

function declarations(xsd: string): { globals: string[]; locals: string[]; targetNamespace: string } {
  const schema = buildXdm(xsd).document.documentElement;
  if (!schema) throw new Error('schema has no root element');
  const globals: string[] = [];
  const locals: string[] = [];
  const walk = (node: Element, topLevel: boolean) => {
    for (const child of node.childNodes) {
      if (child.nodeType !== 1) continue;
      const element = child as Element;
      if (isNamedDeclaration(element)) (topLevel ? globals : locals).push(element.getAttribute('name')!);
      walk(element, false);
    }
  };
  walk(schema, true);
  return { globals, locals, targetNamespace: schema.getAttribute('targetNamespace') ?? '' };
}

export function deriveTagMap(referenceXsd: string, shortXsd: string): TagMap {
  const reference = declarations(referenceXsd);
  const short = declarations(shortXsd);
  if (reference.globals.length !== short.globals.length) {
    throw new Error(`global declaration count mismatch: ${reference.globals.length} vs ${short.globals.length}`);
  }
  if (reference.locals.length !== short.locals.length) {
    throw new Error(`local declaration count mismatch: ${reference.locals.length} vs ${short.locals.length}`);
  }
  const shortToReference = new Map<string, string>();
  short.globals.forEach((name, i) => shortToReference.set(name, reference.globals[i]));
  short.locals.forEach((name, i) => {
    const existing = shortToReference.get(name);
    if (existing !== undefined && existing !== reference.locals[i]) {
      throw new Error(`local/global conflict for ${name}`);
    }
    shortToReference.set(name, reference.locals[i]);
  });
  const referenceToShort = new Map<string, string>();
  for (const [shortName, referenceName] of shortToReference) {
    if (referenceToShort.has(referenceName)) throw new Error(`not a bijection at ${referenceName}`);
    referenceToShort.set(referenceName, shortName);
  }
  return {
    shortToReference,
    referenceToShort,
    shortNamespace: short.targetNamespace,
    referenceNamespace: reference.targetNamespace,
    globalCount: reference.globals.length,
    localCount: reference.locals.length,
  };
}
