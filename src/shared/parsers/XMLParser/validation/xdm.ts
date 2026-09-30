import { SaxesParser, type SaxesTagNS } from 'saxes';
import { Document, type Element, type Node } from 'slimdom';

/**
 * XDM layer: saxes -> slimdom, node for node (the SPIKE-03 builder proven
 * equivalent to the SPIKE-02 evaluation trees), with optional schema-derived
 * Short-to-Reference renaming and source provenance fixed at parse time.
 *
 * It only ever receives text that passed the stage-2 prolog scan, so a
 * DOCTYPE is refused rather than interpreted, and no entity is resolved.
 */
const XMLNS = 'http://www.w3.org/2000/xmlns/';
const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const CDATA_SECTION_NODE = 4;
const PROCESSING_INSTRUCTION_NODE = 7;
const COMMENT_NODE = 8;
const DOCUMENT_NODE = 9;

export class XdmParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'XdmParseError';
  }
}

export interface XdmRename {
  readonly shortToReference: ReadonlyMap<string, string>;
  readonly sourceNamespace: string;
  readonly targetNamespace: string;
}

export interface XdmProvenance {
  /** Number of elements whose tag was changed by Short-to-Reference renaming. */
  readonly renamedElementCount: number;
  /** Original source-flavour local name of an element. */
  sourceTagOf(element: Element): string;
  /**
   * Original source-flavour path of an element (same shape as `pathOf`): its uploaded occurrence, as
   * parsed. A recovery that later removes an element from the tree moves the canonical path of the
   * same-named siblings after it, never their source path, and the removed element keeps its own.
   */
  sourcePathOf(element: Element): string;
}

/** Where an element occurred in the uploaded source: its parent, its source tag and its position among that tag. */
interface SourceOccurrence {
  readonly parent: Element | null;
  readonly tag: string;
  readonly position: number;
}

export interface Xdm {
  readonly document: Document;
  readonly provenance: XdmProvenance;
  readonly elementCount: number;
}

export function buildXdm(text: string, options: { readonly rename?: XdmRename } = {}): Xdm {
  const { rename } = options;
  const document = new Document();
  const occurrences = new WeakMap<Element, SourceOccurrence>();
  // Element children seen so far under each open element (the document first), counted by source tag.
  const openCounts: (Map<string, number> | null)[] = [null];
  let current: Document | Element = document;
  let elementCount = 0;
  let renamedElementCount = 0;

  const parser = new SaxesParser({ xmlns: true, position: false });
  parser.on('error', (error) => {
    throw new XdmParseError(error.message);
  });
  parser.on('doctype', () => {
    throw new XdmParseError('a DOCTYPE is never accepted after the stage-2 prolog scan');
  });
  parser.on('opentag', (tag: SaxesTagNS) => {
    let namespaceURI: string | null = tag.uri === '' ? null : tag.uri;
    let localName = tag.local;
    if (rename && namespaceURI === rename.sourceNamespace) {
      const referenceName = rename.shortToReference.get(localName);
      if (referenceName !== undefined) {
        localName = referenceName;
        renamedElementCount++;
      }
      namespaceURI = rename.targetNamespace;
    }
    const element = document.createElementNS(namespaceURI, tag.prefix ? `${tag.prefix}:${localName}` : localName);
    for (const attribute of Object.values(tag.attributes)) {
      let attributeNamespace = attribute.prefix === '' || attribute.uri === '' ? null : attribute.uri;
      if (attribute.prefix === '' && attribute.name === 'xmlns') attributeNamespace = XMLNS;
      let value = attribute.value;
      if (rename && attributeNamespace === XMLNS && value === rename.sourceNamespace) {
        value = rename.targetNamespace;
      }
      const node = document.createAttributeNS(attributeNamespace, attribute.name);
      node.value = value;
      element.setAttributeNode(node);
    }
    const counts = (openCounts[openCounts.length - 1] ??= new Map());
    const position = (counts.get(tag.local) ?? 0) + 1;
    counts.set(tag.local, position);
    occurrences.set(element, { parent: current === document ? null : (current as Element), tag: tag.local, position });
    openCounts.push(null);
    current.appendChild(element);
    current = element;
    elementCount++;
  });
  parser.on('closetag', () => {
    openCounts.pop();
    current = current.parentNode as Document | Element;
  });
  parser.on('text', (data) => {
    if (current !== document) current.appendChild(document.createTextNode(data));
  });
  parser.on('cdata', (data) => {
    current.appendChild(document.createCDATASection(data));
  });
  parser.on('comment', (data) => {
    current.appendChild(document.createComment(data));
  });
  parser.on('processinginstruction', (pi) => {
    current.appendChild(document.createProcessingInstruction(pi.target ?? '', pi.body));
  });

  try {
    parser.write(text).close();
  } catch (error) {
    if (error instanceof XdmParseError) throw error;
    throw new XdmParseError(String(error));
  }
  if (!document.documentElement) throw new XdmParseError('no root element');

  const tagOf = (element: Element) => occurrences.get(element)?.tag ?? element.localName;
  // Read from the occurrences recorded above, never from the tree as it stands; only an element this parse
  // never produced (so not in the source) is named where it now stands.
  const sourcePathOf = (element: Element) => {
    let path = '';
    for (let o = occurrences.get(element); o; o = o.parent ? occurrences.get(o.parent) : undefined) {
      path = `/${o.tag}[${o.position}]${path}`;
    }
    return path || pathWith(element, tagOf);
  };
  return {
    document,
    elementCount,
    provenance: { renamedElementCount, sourceTagOf: tagOf, sourcePathOf },
  };
}

function pathWith(node: Element, nameOf: (element: Element) => string): string {
  const parts: string[] = [];
  for (let n: Node | null = node; n && n.nodeType === ELEMENT_NODE; n = n.parentNode) {
    const element = n as Element;
    const name = nameOf(element);
    let position = 1;
    for (let s = element.previousSibling; s; s = s.previousSibling) {
      if (s.nodeType === ELEMENT_NODE && nameOf(s as Element) === name) position++;
    }
    parts.unshift(`${name}[${position}]`);
  }
  return '/' + parts.join('/');
}

/**
 * Document-order element index (thoth-app#196 G1 scheduling): every element's
 * ordinal, every element by local name, and one name index per Product
 * (a direct child of the root with the given local name) followed by the
 * index of every element outside a Product (root, Header, ...). Built on the
 * tree exactly as it is at the time of the call; it changes no node.
 */
export interface ElementIndex {
  readonly ordinalOf: (element: Element) => number;
  readonly byName: ReadonlyMap<string, readonly Element[]>;
  /** Product groups in document order, then the global group. */
  readonly groups: readonly ReadonlyMap<string, readonly Element[]>[];
  readonly productCount: number;
  readonly elementCount: number;
}

export function indexElements(document: Document, productLocalName = 'Product'): ElementIndex {
  const ordinals = new Map<Element, number>();
  const byName = new Map<string, Element[]>();
  const products: Map<string, Element[]>[] = [];
  const global = new Map<string, Element[]>();
  const add = (map: Map<string, Element[]>, element: Element) => {
    const list = map.get(element.localName);
    if (list) list.push(element);
    else map.set(element.localName, [element]);
  };
  const root = document.documentElement;
  const stack: { element: Element; group: Map<string, Element[]> }[] = root ? [{ element: root, group: global }] : [];
  let ordinal = 0;
  while (stack.length) {
    const { element, group: parentGroup } = stack.pop()!;
    ordinals.set(element, ++ordinal);
    let group = parentGroup;
    if (element.parentNode === root && element.localName === productLocalName) {
      group = new Map();
      products.push(group);
    }
    add(byName, element);
    add(group, element);
    for (let child = element.lastChild; child; child = child.previousSibling) {
      if (child.nodeType === ELEMENT_NODE) stack.push({ element: child as Element, group });
    }
  }
  return {
    ordinalOf: (element) => ordinals.get(element) ?? 0,
    byName,
    groups: [...products, global],
    productCount: products.length,
    elementCount: ordinal,
  };
}

/** Canonical path with 1-based same-local-name positions (SPIKE-02 `pathOf`). */
export function pathOf(node: Element): string {
  return pathWith(node, (element) => element.localName);
}

/**
 * Visits every element in document order with its canonical path and its
 * path under `nameOf` (the shape of `pathOf`), in one pass with per-parent
 * counters. Positions are those of the tree as it is at the time of the walk,
 * so a path under source tags is a source path only while nothing has been
 * removed: `XdmProvenance.sourcePathOf` is the source path.
 */
export function forEachElementPath(
  root: Document | Element,
  nameOf: (element: Element) => string,
  visit: (element: Element, path: string, namedPath: string) => void,
): void {
  const walk = (parent: Document | Element, prefix: string, namedPrefix: string) => {
    const counts = new Map<string, number>();
    const namedCounts = new Map<string, number>();
    for (const child of parent.childNodes) {
      if (child.nodeType !== ELEMENT_NODE) continue;
      const element = child as Element;
      const name = element.localName;
      const named = nameOf(element);
      const position = (counts.get(name) ?? 0) + 1;
      const namedPosition = (namedCounts.get(named) ?? 0) + 1;
      counts.set(name, position);
      namedCounts.set(named, namedPosition);
      const path = `${prefix}/${name}[${position}]`;
      const namedPath = `${namedPrefix}/${named}[${namedPosition}]`;
      visit(element, path, namedPath);
      walk(element, path, namedPath);
    }
  };
  walk(root, '', '');
}

/**
 * Resolves a libxml2 node path to an element: `/*[k]` and `name[k]` steps
 * exactly as the SPIKE-02 v4 taint reference does, and the `prefix:name[k]`
 * steps libxml2 writes for a namespace-prefixed document, matched by prefix,
 * name and same-name position (libxml2's own counting), so a node's identity
 * never depends on the prefix a source chose. `nameOf` names elements as the
 * validated document did (the source tags of a renamed Short tree). Anything
 * else, including attribute steps, is unresolved (`null`) and becomes
 * whole-document taint.
 */
export function resolveLibxmlPath(
  document: Document,
  xpath: string,
  nameOf: (element: Element) => string = (element) => element.localName,
): Element | null {
  const steps = xpath.replace(/^\//, '').split('/').filter(Boolean);
  let current: Document | Element = document;
  for (const step of steps) {
    const match = /^(?:(\*)|(?:([A-Za-z_][\w.-]*):)?([A-Za-z_][\w.-]*))(?:\[(\d+)\])?$/.exec(
      step.replace(/^\*\[local-name\(\)='([^']+)'\]/, '$1'),
    );
    if (!match) return null;
    const [, wildcard, prefix, name, position] = match;
    const index = position ? Number(position) : 1;
    let seen = 0;
    let found: Element | null = null;
    for (const child of current.childNodes) {
      if (child.nodeType !== ELEMENT_NODE) continue;
      const element = child as Element;
      if (!wildcard && (nameOf(element) !== name || (prefix !== undefined && element.prefix !== prefix))) continue;
      if (++seen === index) {
        found = element;
        break;
      }
    }
    if (!found) return null;
    current = found;
  }
  return current.nodeType === ELEMENT_NODE ? (current as Element) : null;
}

const escapeText = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r/g, '&#13;');

const escapeAttribute = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;')
    .replace(/\t/g, '&#9;')
    .replace(/\n/g, '&#10;')
    .replace(/\r/g, '&#13;');

/**
 * Serialises an XDM tree so that re-parsing yields the same tree: namespace
 * declarations are ordinary attributes of the tree, and every character a
 * parser would normalise is written as a character reference.
 */
export function serializeXdm(root: Document | Element): string {
  const out: string[] = [];
  const write = (node: Node) => {
    switch (node.nodeType) {
      case DOCUMENT_NODE:
        for (const child of node.childNodes) write(child);
        break;
      case ELEMENT_NODE: {
        const element = node as Element;
        out.push('<', element.nodeName);
        for (const attribute of element.attributes) {
          out.push(' ', attribute.name, '="', escapeAttribute(attribute.value), '"');
        }
        if (!element.childNodes.length) {
          out.push('/>');
          break;
        }
        out.push('>');
        for (const child of element.childNodes) write(child);
        out.push('</', element.nodeName, '>');
        break;
      }
      case TEXT_NODE:
        out.push(escapeText((node as unknown as { data: string }).data));
        break;
      case CDATA_SECTION_NODE:
        out.push('<![CDATA[', (node as unknown as { data: string }).data, ']]>');
        break;
      case COMMENT_NODE:
        out.push('<!--', (node as unknown as { data: string }).data, '-->');
        break;
      case PROCESSING_INSTRUCTION_NODE: {
        const pi = node as unknown as { target: string; data: string };
        out.push('<?', pi.target, pi.data ? ` ${pi.data}` : '', '?>');
        break;
      }
    }
  };
  write(root);
  return out.join('');
}
