// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { evaluateSourceGate } from '../sourceGate';
import { ONIX_NAMESPACES, type OnixSourceDescriptor } from '../types';
import { countProducts } from './sizing';

const descriptor = (release: '3.0' | '3.1', flavour: 'reference' | 'short'): OnixSourceDescriptor => ({
  release,
  schemaRelease: release === '3.0' ? '3.0.8' : '3.1.3',
  flavour,
  namespaceURI: ONIX_NAMESPACES[release][flavour],
});

const reference = (release: '3.0' | '3.1', body: string) =>
  `<?xml version="1.0"?><ONIXMessage release="${release}" xmlns="${ONIX_NAMESPACES[release].reference}"><Header/>${body}</ONIXMessage>`;
const short = (release: '3.0' | '3.1', body: string) =>
  `<ONIXmessage release="${release}" xmlns="${ONIX_NAMESPACES[release].short}"><header/>${body}</ONIXmessage>`;

describe('countProducts', () => {
  it.each([
    ['3.0', 'reference'],
    ['3.1', 'reference'],
  ] as const)('%s %s counts Product start tags in the resolved namespace', (release, flavour) => {
    const text = reference(release, '<Product/><Product><RecordReference>a</RecordReference></Product><Product/>');
    expect(countProducts(text, descriptor(release, flavour))).toEqual({ measured: true, count: 3 });
  });

  it.each([
    ['3.0', 'short'],
    ['3.1', 'short'],
  ] as const)('%s %s counts lower-case product start tags only', (release, flavour) => {
    const text = short(release, '<product/><product><a001>a</a001></product><Product/>');
    expect(countProducts(text, descriptor(release, flavour))).toEqual({ measured: true, count: 2 });
  });

  it('ignores comments, CDATA, processing instructions, text and attribute lookalikes', () => {
    const text = reference(
      '3.0',
      '<!-- <Product/> --><?pi <Product/> ?><Product><Text><![CDATA[<Product/>]]>&lt;Product/&gt; Product</Text></Product>' +
        '<Note a="&lt;Product/&gt;" b="Product"/>',
    );
    expect(countProducts(text, descriptor('3.0', 'reference'))).toEqual({ measured: true, count: 1 });
  });

  it('ignores Product elements in another namespace and of another release', () => {
    const text = reference(
      '3.0',
      '<Product/><x:Product xmlns:x="urn:other"/><Product xmlns="http://ns.editeur.org/onix/3.1/reference"/>' +
        '<product/><PRODUCT/><ProductIdentifier/>',
    );
    expect(countProducts(text, descriptor('3.0', 'reference'))).toEqual({ measured: true, count: 1 });
  });

  it('counts prefixed Product start tags bound to the resolved namespace', () => {
    const text =
      '<o:ONIXMessage release="3.1" xmlns:o="http://ns.editeur.org/onix/3.1/reference"><o:Header/><o:Product/><o:Product/></o:ONIXMessage>';
    const gate = evaluateSourceGate(text);
    expect(gate.kind).toBe('CONTINUE');
    if (gate.kind !== 'CONTINUE') return;
    expect(countProducts(text, gate.source)).toEqual({ measured: true, count: 2 });
  });

  it('counts nested and empty start tags alike (start tags, not composites)', () => {
    const text = reference('3.0', '<Product><Product/></Product>');
    expect(countProducts(text, descriptor('3.0', 'reference'))).toEqual({ measured: true, count: 2 });
  });

  it('reports a parser failure as not measured, never as a count or a diagnosis', () => {
    const evidence = countProducts(reference('3.0', '<Product><Unclosed></Product>'), descriptor('3.0', 'reference'));
    expect(evidence.measured).toBe(false);
    if (evidence.measured) return;
    expect(evidence.reason).toBe('SIZING_PARSE_ERROR');
    expect(evidence.error).toMatch(/./);
  });

  it('refuses a DOCTYPE outright (never reachable after stage 2)', () => {
    const evidence = countProducts(
      '<!DOCTYPE ONIXMessage><ONIXMessage xmlns="http://ns.editeur.org/onix/3.0/reference"><Product/></ONIXMessage>',
      descriptor('3.0', 'reference'),
    );
    expect(evidence).toMatchObject({ measured: false, reason: 'SIZING_PARSE_ERROR' });
  });

  it('scales to a large Product count', () => {
    const text = reference('3.0', '<Product><RecordReference>r</RecordReference></Product>'.repeat(1701));
    expect(countProducts(text, descriptor('3.0', 'reference'))).toEqual({ measured: true, count: 1701 });
  });
});
