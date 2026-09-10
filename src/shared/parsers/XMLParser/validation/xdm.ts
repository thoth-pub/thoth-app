import { SaxesParser, type SaxesTagNS } from 'saxes';
import { Document, type Element, type Node } from 'slimdom';

/**
 * XDM layer: saxes -> slimdom, node for node (the SPIKE-03 builder proven
 * equivalent to the SPIKE-02 evaluation trees), with optional schema-derived
 * Short-to-Reference renaming and lazy source provenance.
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
  /** Original source-flavour path of an element (same shape as `pathOf`). */
  sourcePathOf(element: Element): string;
}

export interface Xdm {
  readonly document: Document;
  readonly provenance: XdmProvenance;
  readonly elementCount: number;
}

export function buildXdm(text: string, options: { readonly rename?: XdmRename } = {}): Xdm {
  const { rename } = options;
  const document = new Document();
  const originalTag = new WeakMap<Element, string>();
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
    let sourceTag: string | null = null;
    if (rename && namespaceURI === rename.sourceNamespace) {
      sourceTag = localName;
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
    if (sourceTag !== null) originalTag.set(element, sourceTag);
    current.appendChild(element);
    current = element;
    elementCount++;
  });
  parser.on('closetag', () => {
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

  const tagOf = (element: Element) => originalTag.get(element) ?? element.localName;
  return {
    document,
    elementCount,
    provenance: {
      renamedElementCount,
      sourceTagOf: tagOf,
      sourcePathOf: (element) => pathWith(element, tagOf),
    },
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

/** Canonical path with 1-based same-local-name positions (SPIKE-02 `pathOf`). */
export function pathOf(node: Element): string {
  return pathWith(node, (element) => element.localName);
}

/**
 * Visits every element in document order with its canonical path and its
 * path under `nameOf` (the same two shapes `pathOf` and `sourcePathOf`
 * produce), in one pass with per-parent counters (thoth-app#196 provenance
 * sidecar). Positions are those of the tree as it is at the time of the walk.
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
