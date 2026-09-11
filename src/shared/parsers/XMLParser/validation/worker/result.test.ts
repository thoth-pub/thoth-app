// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Element } from 'slimdom';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { createOnixSourceValidator, type OnixSourceValidator } from '../validator';
import { buildXdm, forEachElementPath, pathOf, serializeXdm } from '../xdm';
import { assertStructuredCloneSafe } from './cloneSafety';
import type { OnixWorkerResult } from './protocol';
import { createProvenanceResolver } from './provenance';
import { toWorkerResult } from './result';

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const FIXTURES = join(__dirname, '..', '__fixtures__', 'spike02');
const PUBLIC_DIR = join(process.cwd(), 'public', 'onix-validation');
const fixtureBytes = (path: string) => new Uint8Array(readFileSync(join(FIXTURES, path)));
const encode = (text: string) => new TextEncoder().encode(text);
const loadResource = async (fileName: string) => new Uint8Array(readFileSync(join(PUBLIC_DIR, fileName)));

let validator: OnixSourceValidator;
beforeAll(() => {
  validator = createOnixSourceValidator({ loadResource });
});

const REFERENCE_30 =
  '<?xml version="1.0" encoding="UTF-8"?><ONIXMessage release="3.0" xmlns="http://ns.editeur.org/onix/3.0/reference">' +
  '<Header><Sender><SenderName>T</SenderName></Sender><SentDateTime>20260909T1200</SentDateTime></Header>' +
  ['a', 'b']
    .map(
      (r) =>
        `<Product><RecordReference>${r}</RecordReference><NotificationType>03</NotificationType>` +
        '<ProductIdentifier><ProductIDType>01</ProductIDType><IDTypeName>X</IDTypeName><IDValue>1</IDValue></ProductIdentifier>' +
        '<ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9780000000002</IDValue></ProductIdentifier>' +
        '<CollateralDetail><TextContent><TextType>03</TextType><ContentAudience>00</ContentAudience><Text>one</Text></TextContent>' +
        '<TextContent><TextType>03</TextType><ContentAudience>00</ContentAudience></TextContent>' +
        '<TextContent><TextType>04</TextType><ContentAudience>00</ContentAudience><Text textformat="05"><p>x &amp; <b>y</b></p></Text></TextContent></CollateralDetail>' +
        '</Product>',
    )
    .join('') +
  '</ONIXMessage>';

const SHORT_30 =
  '<ONIXmessage release="3.0" xmlns="http://ns.editeur.org/onix/3.0/short"><header><sender><x298>T</x298></sender><x307>20260909T1200</x307></header>' +
  ['a', 'b']
    .map(
      (r) =>
        `<product><a001>${r}</a001><a002>03</a002>` +
        '<productidentifier><b221>01</b221><b233>X</b233><b244>1</b244></productidentifier>' +
        '<productidentifier><b221>15</b221><b244>9780000000002</b244></productidentifier>' +
        '<collateraldetail><textcontent><x426>03</x426><x427>00</x427><d104>one</d104></textcontent>' +
        '<textcontent><x426>03</x426><x427>00</x427></textcontent>' +
        '<textcontent><x426>04</x426><x427>00</x427><d104 textformat="05"><p>x &amp; <b>y</b></p></d104></textcontent></collateraldetail>' +
        '</product>',
    )
    .join('') +
  '</ONIXmessage>';

/** Elements of two structurally identical trees in document order, paired. */
function pairedElements(a: Element, b: Element): [Element, Element][] {
  const listA: Element[] = [];
  const listB: Element[] = [];
  forEachElementPath(
    a.ownerDocument!,
    (e) => e.localName,
    (e) => void listA.push(e),
  );
  forEachElementPath(
    b.ownerDocument!,
    (e) => e.localName,
    (e) => void listB.push(e),
  );
  expect(listB.length).toBe(listA.length);
  return listA.map((e, i) => [e, listB[i]]);
}

describe('Worker result DTO', () => {
  it('cannot carry the in-process normalised source: Document, provenance functions and serialize() are rejected', async () => {
    const result = await validator.validate(encode(REFERENCE_30));
    expect(result.status).toBe('COMPLETED');
    expect(() => assertStructuredCloneSafe(result.normalized)).toThrow(/Document instance|function/);
    expect(() => assertStructuredCloneSafe({ provenance: result.normalized!.provenance })).toThrow(/function/);
    expect(() => assertStructuredCloneSafe(result)).toThrow();
  });

  it.each([
    ['Reference 3.0 with repeated elements and a recovery', () => encode(REFERENCE_30)],
    ['Short 3.0 with repeated elements and a recovery', () => encode(SHORT_30)],
    ['frozen recovery fixture', () => fixtureBytes('taint30/T1_empty_textcontent_recovery.xml')],
    ['DTD stop', () => fixtureBytes('dtd_suite31/D1_bare_doctype.xml')],
    ['unsupported release', () => encode('<ONIXMessage release="2.1"><Header/></ONIXMessage>')],
  ])('%s: the DTO is structured-clone safe and survives structuredClone unchanged', async (_label, bytes) => {
    const dto = toWorkerResult(await validator.validate(bytes()));
    assertStructuredCloneSafe(dto);
    expect(structuredClone(dto)).toEqual(dto);
    expect(JSON.parse(JSON.stringify(dto))).toEqual(dto);
  });

  it('carries the complete ledger, summary, descriptor, stop and recovery markers unchanged', async () => {
    const result = await validator.validate(encode(REFERENCE_30));
    const dto = toWorkerResult(result);
    expect(dto.findings).toEqual(result.findings);
    expect(dto.summary).toEqual(result.summary);
    expect(dto.source).toEqual(result.source);
    expect(dto.sourceValid).toBe(result.sourceValid);
    expect(dto.stop).toBeNull();
    expect(dto.normalized?.recoveries).toEqual(result.normalized?.recoveries);
    expect(dto.normalized?.recoveries.length).toBe(2);
    const stopped = toWorkerResult(await validator.validate(fixtureBytes('dtd_suite31/D1_bare_doctype.xml')));
    expect(stopped).toMatchObject({ status: 'STOPPED', stop: { stage: 2 }, normalized: null, sourceValid: false });
    expect(stopped.findings.map((f) => f.id)).toEqual(['SECURITY_DTD', 'R-MSG-NO-DOCTYPE-31']);
  });

  describe.each([
    ['Reference 3.0', REFERENCE_30, 'IDENTITY'],
    ['Short 3.0', SHORT_30, 'RENAMED'],
  ])('%s normalised source', (_label, text, kind) => {
    let result: Awaited<ReturnType<OnixSourceValidator['validate']>>;
    let dto: OnixWorkerResult;
    beforeAll(async () => {
      result = await validator.validate(encode(text));
      dto = toWorkerResult(result);
    });

    it('serialises the exact validated (recovered) tree, which reparses to the same canonical Reference tree', () => {
      expect(dto.normalized!.xml).toBe(result.normalized!.serialize());
      expect(dto.normalized!.xml).not.toContain(
        '<TextContent><TextType>03</TextType><ContentAudience>00</ContentAudience></TextContent>',
      );
      const reparsed = buildXdm(dto.normalized!.xml);
      expect(serializeXdm(reparsed.document)).toBe(dto.normalized!.xml);
      expect(reparsed.document.documentElement!.localName).toBe('ONIXMessage');
      expect(reparsed.document.documentElement!.namespaceURI).toBe('http://ns.editeur.org/onix/3.0/reference');
      expect(reparsed.elementCount).toBe(dto.normalized!.elementCount);
      for (const [original, copy] of pairedElements(
        result.normalized!.document.documentElement!,
        reparsed.document.documentElement!,
      )) {
        expect(pathOf(copy)).toBe(pathOf(original));
        expect(copy.namespaceURI).toBe(original.namespaceURI);
      }
    });

    it(`ships a ${kind} provenance sidecar that reproduces #190's in-process source tag and path of every element`, () => {
      const provenance = dto.normalized!.provenance;
      expect(provenance.kind).toBe(kind);
      const resolve = createProvenanceResolver(provenance);
      const reparsed = buildXdm(dto.normalized!.xml);
      let checked = 0;
      for (const [original, copy] of pairedElements(
        result.normalized!.document.documentElement!,
        reparsed.document.documentElement!,
      )) {
        const path = pathOf(copy);
        expect(resolve.sourcePathOf(path), path).toBe(result.normalized!.provenance.sourcePathOf(original));
        expect(resolve.sourceTagOf(path), path).toBe(result.normalized!.provenance.sourceTagOf(original));
        checked++;
      }
      expect(checked).toBeGreaterThan(20);
      if (provenance.kind === 'RENAMED') {
        expect(provenance.renamedElementCount).toBe(result.normalized!.provenance.renamedElementCount);
        expect(provenance.exceptions).toEqual([]);
        expect(provenance.referenceToSource).toMatchObject({
          Product: 'product',
          ProductIdentifier: 'productidentifier',
          Text: 'd104',
        });
        expect(provenance.referenceToSource).not.toHaveProperty('p');
        expect(resolve.sourcePathOf('/ONIXMessage[1]/Product[2]/ProductIdentifier[2]/IDValue[1]')).toBe(
          '/ONIXmessage[1]/product[2]/productidentifier[2]/b244[1]',
        );
        expect(
          resolve.sourcePathOf('/ONIXMessage[1]/Product[1]/CollateralDetail[1]/TextContent[2]/Text[1]/p[1]/b[1]'),
        ).toBe('/ONIXmessage[1]/product[1]/collateraldetail[1]/textcontent[2]/d104[1]/p[1]/b[1]');
      }
    });
  });

  it('records explicit exceptions when the tag map alone would misplace an element', async () => {
    // A Short message that also carries literal Reference names in the Short namespace: after renaming, `Product`
    // and `product` become same-named siblings, so map-based positions would be wrong for them.
    const odd = SHORT_30.replace(
      '</header>',
      '</header><Product><a001>odd</a001><a002>03</a002><productidentifier><b221>15</b221><b244>9780000000002</b244></productidentifier></Product>',
    );
    const result = await validator.validate(encode(odd));
    expect(result.status).toBe('COMPLETED');
    const dto = toWorkerResult(result);
    const provenance = dto.normalized!.provenance;
    expect(provenance.kind).toBe('RENAMED');
    if (provenance.kind !== 'RENAMED') return;
    expect(provenance.exceptions.length).toBeGreaterThan(0);
    expect(provenance.exceptions[0]).toEqual({
      path: '/ONIXMessage[1]/Product[1]',
      sourcePath: '/ONIXmessage[1]/Product[1]',
      sourceTag: 'Product',
    });
    const resolve = createProvenanceResolver(provenance);
    const reparsed = buildXdm(dto.normalized!.xml);
    for (const [original, copy] of pairedElements(
      result.normalized!.document.documentElement!,
      reparsed.document.documentElement!,
    )) {
      const path = pathOf(copy);
      expect(resolve.sourcePathOf(path), path).toBe(result.normalized!.provenance.sourcePathOf(original));
      expect(resolve.sourceTagOf(path), path).toBe(result.normalized!.provenance.sourceTagOf(original));
    }
    expect(resolve.sourcePathOf('/ONIXMessage[1]/Product[2]')).toBe('/ONIXmessage[1]/product[1]');
    assertStructuredCloneSafe(dto);
  });
});
