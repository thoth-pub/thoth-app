// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { createOrdinaryValidator, hardenedParse, type OrdinaryValidator, requestedResourceUrls } from './ordinary';
import { ONIX_VALIDATION_RESOURCES } from './resources';

const PUBLIC_DIR = join(process.cwd(), 'public', 'onix-validation');
const resources = new Map(
  ONIX_VALIDATION_RESOURCES.map((r) => [r.fileName, new Uint8Array(readFileSync(join(PUBLIC_DIR, r.fileName)))]),
);
const bytes = (text: string) => new TextEncoder().encode(text);
const fixture = (set: string, name: string) =>
  new Uint8Array(readFileSync(join(__dirname, '__fixtures__', 'spike02', set, name)));

const REF30 = 'http://ns.editeur.org/onix/3.0/reference';
const minimalReference30 = (productBody: string) =>
  `<ONIXMessage release="3.0" xmlns="${REF30}"><Header><Sender><SenderName>T</SenderName></Sender><SentDateTime>20260909T1200</SentDateTime></Header><Product><RecordReference>r</RecordReference><NotificationType>03</NotificationType><ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9780000000002</IDValue></ProductIdentifier>${productBody}</Product></ONIXMessage>`;

// Short tags of the same minimal message (ONIX 3.0 Short: header/sender/x298/x307, product/a001/a002,
// productidentifier/b221/b244).
const minimalShort30 = `<ONIXmessage release="3.0" xmlns="http://ns.editeur.org/onix/3.0/short"><header><sender><x298>T</x298></sender><x307>20260909T1200</x307></header><product><a001>r</a001><a002>03</a002><productidentifier><b221>15</b221><b244>9780000000002</b244></productidentifier></product></ONIXmessage>`;

describe('ordinary XSD tier (libxml2-wasm, hardened)', () => {
  let reference30: OrdinaryValidator;
  let short30: OrdinaryValidator;

  beforeAll(async () => {
    reference30 = await createOrdinaryValidator(resources, 'ONIX_BookProduct_3.0_reference.xsd');
    short30 = await createOrdinaryValidator(resources, 'ONIX_BookProduct_3.0_short.xsd');
  });

  it('compiles a schema from the pinned in-memory files only', async () => {
    requestedResourceUrls.splice(0);
    const validator = await createOrdinaryValidator(resources, 'ONIX_BookProduct_3.1_reference.xsd');
    validator.dispose();
    expect([...requestedResourceUrls].sort()).toEqual(['ONIX_BookProduct_CodeLists.xsd', 'ONIX_XHTML_Subset.xsd']);
  });

  it('refuses to compile a schema that is not pinned', async () => {
    await expect(createOrdinaryValidator(resources, 'ONIX_BookProduct_3.0_short_strict.xsd')).rejects.toThrow();
  });

  it('accepts a schema-valid Reference message', () => {
    expect(reference30.validate(fixture('dtd_suite30', 'N3_plain.xml'))).toEqual({
      wellFormed: true,
      diagnostics: [],
    });
  });

  it('accepts a schema-valid Short message against the Short schema', () => {
    expect(short30.validate(bytes(minimalShort30))).toEqual({ wellFormed: true, diagnostics: [] });
  });

  it('rejects Short tags against the Reference schema (flavours never mix)', () => {
    const result = reference30.validate(bytes(minimalShort30.replace('/short', '/reference')));
    expect(result.wellFormed).toBe(true);
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  it('reports every datatype and content-model defect with a node path', () => {
    const doc = minimalReference30(
      '<CollateralDetail><TextContent><TextType>03</TextType><ContentAudience>00</ContentAudience></TextContent></CollateralDetail>' +
        '<ProductSupply><SupplyDetail><Supplier><SupplierRole>01</SupplierRole><SupplierName>s</SupplierName></Supplier><ProductAvailability>20</ProductAvailability><Price><PriceType>01</PriceType><PriceAmount>0.00</PriceAmount><CurrencyCode>EUR</CurrencyCode></Price></SupplyDetail></ProductSupply>',
    );
    const result = reference30.validate(bytes(doc));
    expect(result.wellFormed).toBe(true);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        xpath: '/*/*[2]/*[4]/*',
        message: expect.stringMatching(/TextContent[\s\S]*Missing child element/),
      }),
      expect.objectContaining({
        xpath: '/*/*[2]/*[5]/*/*[3]/*[2]',
        message: expect.stringMatching(/PriceAmount[\s\S]*minExclusive/),
      }),
    ]);
  });

  it('reports a malformed document as not well-formed', () => {
    const result = reference30.validate(bytes('<ONIXMessage><Header></ONIXMessage>'));
    expect(result.wellFormed).toBe(false);
    expect(result.diagnostics[0].message).toMatch(/mismatch/);
  });
});

describe('hardened parse: no external resolution', () => {
  it.each([
    ['SYSTEM DTD', fixture('dtd_suite31', 'D7_external_system.xml')],
    ['PUBLIC DTD', fixture('dtd_suite31', 'D8_external_public.xml')],
    ['PUBLIC DTD with an external entity', fixture('dtd_suite31', 'D9_pi_then_public_with_internal_subset.xml')],
    [
      'an external general entity reference',
      bytes('<!DOCTYPE r [<!ENTITY e SYSTEM "http://evil.invalid/e.txt">]><r>&e;</r>'),
    ],
    ['an external parameter entity', bytes('<!DOCTYPE r [<!ENTITY % p SYSTEM "http://evil.invalid/p.ent"> %p;]><r/>')],
  ])('never requests a URL for %s', (_label, input) => {
    requestedResourceUrls.splice(0);
    const parsed = hardenedParse(input);
    if (parsed.document) parsed.document.dispose();
    expect(requestedResourceUrls).toEqual([]);
  });
});
