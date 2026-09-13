// @vitest-environment node
import type { Element, Node } from 'slimdom';
import { describe, expect, it } from 'vitest';

import { SCHEMA_MODELS } from './schemaModel';
import { applyOrdinaryDefects, dependencySet, escapes, parseDependencyAst, pathsOf, projectDependency } from './taint';
import { buildXdm, pathOf } from './xdm';

const NS = 'http://ns.editeur.org/onix/3.0/reference';
const resolver = (prefix: string | null) => (prefix === '' || prefix == null || prefix === 'onix' ? NS : null);

const DOC =
  `<ONIXMessage release="3.0" xmlns="${NS}"><Header><SentDateTime>x</SentDateTime></Header>` +
  `<Product><RecordReference>r1</RecordReference><ProductIdentifier><IDValue>1</IDValue></ProductIdentifier>` +
  `<CollateralDetail><TextContent><TextType>03</TextType></TextContent><TextContent><TextType>02</TextType></TextContent></CollateralDetail></Product>` +
  `<Product><RecordReference>r1</RecordReference></Product></ONIXMessage>`;

const element = (document: ReturnType<typeof buildXdm>['document'], path: string) => {
  const found: Element[] = [];
  const walk = (n: Node) => {
    for (const c of n.childNodes) {
      if (c.nodeType !== 1) continue;
      if (pathOf(c as Element) === path) found.push(c as Element);
      walk(c);
    }
  };
  walk(document);
  return found[0];
};

describe('static dependency analysis over the XQueryX AST (v4 taint reference)', () => {
  it('extracts every path expression as axis steps, nested predicates included', () => {
    expect(pathsOf(parseDependencyAst('ProductIdentifier/IDValue[. = 1] and exists(onix:RecordReference)'))).toEqual([
      { steps: ['child::ProductIdentifier', 'child::IDValue'], absolute: false, unknown: false },
      { steps: ['child::onix:RecordReference'], absolute: false, unknown: false },
    ]);
  });

  it('marks absolute, parent-axis and variable-rooted paths', () => {
    const paths = pathsOf(parseDependencyAst('/ONIXMessage/Header and ../Header and $x/IDValue'));
    expect(paths).toEqual([
      { steps: ['child::ONIXMessage', 'child::Header'], absolute: true, unknown: false },
      { steps: ['parent::node()', 'child::Header'], absolute: false, unknown: false },
      { steps: [], absolute: false, unknown: true },
    ]);
  });

  it('proves confinement only without escaping axes, root expressions or escaping functions', () => {
    expect(escapes(parseDependencyAst('not(every $x in ProductIdentifier satisfies exists($x/IDValue))'))).toBe(false);
    expect(escapes(parseDependencyAst('exists(../Header)'))).toBe(true);
    expect(escapes(parseDependencyAst('exists(/ONIXMessage)'))).toBe(true);
    expect(escapes(parseDependencyAst('exists(root(.)//Header)'))).toBe(true);
    expect(escapes(parseDependencyAst('following-sibling::Product'))).toBe(true);
    expect(escapes(null)).toBe(true);
  });
});

describe('dependency sets', () => {
  it('collects the context and every predicate-free prefix of every path', () => {
    const { document } = buildXdm(DOC);
    const product = element(document, '/ONIXMessage[1]/Product[1]');
    const dep = dependencySet(product, parseDependencyAst('exists(ProductIdentifier/IDValue)'), document, resolver);
    expect(dep.fallback).toBeNull();
    expect([...dep.nodes].map((n) => pathOf(n as Element))).toEqual([
      '/ONIXMessage[1]/Product[1]',
      '/ONIXMessage[1]/Product[1]/ProductIdentifier[1]',
      '/ONIXMessage[1]/Product[1]/ProductIdentifier[1]/IDValue[1]',
    ]);
  });

  it('falls back to the context subtree for an unresolved but confined rule', () => {
    const { document } = buildXdm(DOC);
    const product = element(document, '/ONIXMessage[1]/Product[1]');
    const dep = dependencySet(
      product,
      parseDependencyAst('every $x in ProductIdentifier satisfies exists($x/IDValue)'),
      document,
      resolver,
    );
    expect(dep.fallback).toBe('subtree(context)');
    expect(dep.nodes.has(element(document, '/ONIXMessage[1]/Header[1]'))).toBe(false);
  });

  it('falls back to the whole document for an unresolved rule that can escape', () => {
    const { document } = buildXdm(DOC);
    const product = element(document, '/ONIXMessage[1]/Product[1]');
    const dep = dependencySet(product, parseDependencyAst('exists(root(.)//Header)'), document, resolver);
    expect(dep.fallback).toBe('document');
    expect(dep.nodes.has(element(document, '/ONIXMessage[1]/Header[1]/SentDateTime[1]'))).toBe(true);
  });
});

describe('ordinary defects -> taint set and the approved recovery overlay', () => {
  const model = SCHEMA_MODELS['3.0'];

  it('omits a TextContent missing Text and taints only the recovery site', () => {
    const { document } = buildXdm(DOC);
    const textContent = element(document, '/ONIXMessage[1]/Product[1]/CollateralDetail[1]/TextContent[1]');
    const result = applyOrdinaryDefects(
      document,
      [{ kind: 'RECOVERABLE', node: textContent, message: 'Missing child element(s)', xpath: '/*/*[2]/*[3]/*[1]' }],
      model,
      '3.0',
    );
    expect(result.recoveries).toEqual([
      {
        recovery: 'OMIT_INVALID_COMPOSITE',
        removed: '/ONIXMessage[1]/Product[1]/CollateralDetail[1]/TextContent[1]',
        taintSite: '/ONIXMessage[1]/Product[1]/CollateralDetail[1]',
      },
    ]);
    expect(textContent.parentNode).toBeNull();
    expect([...result.taint].map((n) => pathOf(n as Element))).toEqual([
      '/ONIXMessage[1]/Product[1]/CollateralDetail[1]',
    ]);
  });

  it('recovers adjacent composites independently (nodes were resolved before any removal)', () => {
    const { document } = buildXdm(DOC);
    const first = element(document, '/ONIXMessage[1]/Product[1]/CollateralDetail[1]/TextContent[1]');
    const second = element(document, '/ONIXMessage[1]/Product[1]/CollateralDetail[1]/TextContent[2]');
    const result = applyOrdinaryDefects(
      document,
      [
        { kind: 'RECOVERABLE', node: first, message: 'Missing child element(s)', xpath: null },
        { kind: 'RECOVERABLE', node: second, message: 'Missing child element(s)', xpath: null },
      ],
      model,
      '3.0',
    );
    expect(result.recoveries.map((r) => r.removed)).toEqual([
      '/ONIXMessage[1]/Product[1]/CollateralDetail[1]/TextContent[1]',
      '/ONIXMessage[1]/Product[1]/CollateralDetail[1]/TextContent[2]',
    ]);
    expect(element(document, '/ONIXMessage[1]/Product[1]/CollateralDetail[1]').childNodes).toHaveLength(0);
  });

  it('taints the invalid subtree of a blocking defect', () => {
    const { document } = buildXdm(DOC);
    const header = element(document, '/ONIXMessage[1]/Header[1]');
    const result = applyOrdinaryDefects(
      document,
      [{ kind: 'BLOCKING', node: header, message: 'x', xpath: '/*/*[1]' }],
      model,
      '3.0',
    );
    expect([...result.taint].map((n) => pathOf(n as Element))).toEqual([
      '/ONIXMessage[1]/Header[1]',
      '/ONIXMessage[1]/Header[1]/SentDateTime[1]',
    ]);
    expect(result.defects[0].taint).toEqual(['/ONIXMessage[1]/Header[1] (subtree)']);
  });

  it('taints only the key fields of an identity-constraint violation', () => {
    const { document } = buildXdm(DOC);
    // libxml2 reports a unique-constraint violation on the duplicate selected element.
    const duplicate = element(document, '/ONIXMessage[1]/Product[2]');
    const message = `Element '{${NS}}Product': Duplicate key-sequence ['r1'] in unique identity-constraint '{${NS}}Product_RecordReference_must_be_unique'.`;
    const result = applyOrdinaryDefects(
      document,
      [{ kind: 'BLOCKING_IDENTITY', node: duplicate, message, xpath: '/*/*[3]' }],
      model,
      '3.0',
    );
    expect(result.defects[0].taint).toEqual(['/ONIXMessage[1]/Product[2]/RecordReference[1]']);
    expect(result.taint.has(duplicate)).toBe(false);
    expect(result.taint.has(element(document, '/ONIXMessage[1]/Product[1]/RecordReference[1]'))).toBe(false);
  });

  it('falls back to the whole reported element when the constraint cannot be resolved', () => {
    const { document } = buildXdm(DOC);
    const product = element(document, '/ONIXMessage[1]/Product[1]');
    const message = `Duplicate key-sequence ['x'] in unique identity-constraint '{${NS}}No_such_constraint'.`;
    const result = applyOrdinaryDefects(
      document,
      [{ kind: 'BLOCKING_IDENTITY', node: product, message, xpath: null }],
      model,
      '3.0',
    );
    expect(result.defects[0].taint).toEqual(['(constraint not resolved: whole element) /ONIXMessage[1]/Product[1]']);
    expect(result.taint.has(product)).toBe(true);
  });

  it('taints the whole document when a defect cannot be resolved', () => {
    const { document } = buildXdm(DOC);
    const result = applyOrdinaryDefects(
      document,
      [{ kind: 'BLOCKING', node: null, message: 'x', xpath: '/*/@attr' }],
      model,
      '3.0',
    );
    expect(result.defects[0].taint).toEqual(['(unresolved defect: whole document)']);
    expect(result.taint.has(element(document, '/ONIXMessage[1]/Header[1]/SentDateTime[1]'))).toBe(true);
  });
});

describe('projection', () => {
  it('is SECONDARY iff a dependency is tainted, and NOT_EVALUABLE for a raising rule', () => {
    const { document } = buildXdm(DOC);
    const header = element(document, '/ONIXMessage[1]/Header[1]');
    const product = element(document, '/ONIXMessage[1]/Product[1]');
    const { taint } = applyOrdinaryDefects(
      document,
      [{ kind: 'BLOCKING', node: header, message: 'x', xpath: null }],
      SCHEMA_MODELS['3.0'],
      '3.0',
    );
    const confined = parseDependencyAst('exists(RecordReference)');
    const readsHeader = parseDependencyAst('exists(../Header/SentDateTime)');
    expect(projectDependency(product, confined, document, resolver, taint, false).disposition).toBe('AUTHORITATIVE');
    const secondary = projectDependency(product, readsHeader, document, resolver, taint, false);
    expect(secondary.disposition).toBe('SECONDARY');
    expect(secondary.taintedDependencies).toEqual([
      '/ONIXMessage[1]/Header[1]',
      '/ONIXMessage[1]/Header[1]/SentDateTime[1]',
    ]);
    const notEvaluable = projectDependency(product, confined, document, resolver, taint, true);
    expect([notEvaluable.disposition, notEvaluable.fallback]).toEqual(['NOT_EVALUABLE', 'document']);
  });
});
