// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Document } from 'slimdom';
import { describe, expect, it, vi } from 'vitest';

import { deriveTagMap } from '../tagMap';
import { createOnixSourceValidator } from '../validator';
import { assertStructuredCloneSafe, NotCloneSafeError } from './cloneSafety';
import { createProvenanceResolver } from './provenance';
import { toWorkerResult } from './result';

describe('assertStructuredCloneSafe', () => {
  it('accepts plain data, arrays, typed arrays and nulls', () => {
    expect(() =>
      assertStructuredCloneSafe({
        a: 1,
        b: 'x',
        c: true,
        d: null,
        e: undefined,
        f: [1, { g: [null, 'y'] }],
        h: new Uint8Array([1, 2]),
        i: Object.create(null),
      }),
    ).not.toThrow();
  });

  it.each([
    ['a function', { f: () => 1 }, '$.f', 'function'],
    ['a method on a nested object', { a: { serialize() {} } }, '$.a.serialize', 'function'],
    ['a class instance', { p: new (class Provenance {})() }, '$.p', 'Provenance instance'],
    ['a slimdom Document', { document: new Document() }, '$.document', 'Document instance'],
    ['a WeakMap', { w: new WeakMap() }, '$.w', 'WeakMap instance'],
    ['a Map', { m: new Map() }, '$.m', 'Map instance'],
    ['a symbol', { s: Symbol('x') }, '$.s', 'symbol'],
    ['a bigint', { n: BigInt(1) }, '$.n', 'bigint'],
  ])('rejects %s naming the path', (_label, value, path, reason) => {
    expect(() => assertStructuredCloneSafe(value)).toThrow(NotCloneSafeError);
    try {
      assertStructuredCloneSafe(value);
    } catch (error) {
      expect((error as NotCloneSafeError).path).toBe(path);
      expect((error as NotCloneSafeError).reason).toContain(reason);
    }
  });

  it('rejects a cyclic reference', () => {
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    expect(() => assertStructuredCloneSafe(cyclic)).toThrow(/cyclic/);
  });

  it('agrees with structuredClone on accepted values', () => {
    const value = { findings: [{ id: 'x', detail: { taint: ['a'] } }], xml: '<a/>', bytes: new Uint8Array([7]) };
    assertStructuredCloneSafe(value);
    expect(structuredClone(value)).toEqual(value);
  });
});

describe('recovery data on the Worker wire contract', () => {
  // The canonical validator compiles the pinned schemas and strict assertions on first use.
  vi.setConfig({ testTimeout: 300_000 });

  const PUBLIC_DIR = join(process.cwd(), 'public', 'onix-validation');
  const source =
    '<?xml version="1.0" encoding="UTF-8"?><ONIXMessage release="3.0" xmlns="http://ns.editeur.org/onix/3.0/reference">' +
    '<Header><Sender><SenderName>Clone</SenderName></Sender><SentDateTime>20260915T1200</SentDateTime></Header>' +
    '<Product><RecordReference>clone.1</RecordReference><NotificationType>03</NotificationType>' +
    '<ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9780000000002</IDValue></ProductIdentifier>' +
    '<DescriptiveDetail><ProductComposition>00</ProductComposition><ProductForm>BC</ProductForm>' +
    '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText>Clone</TitleText></TitleElement></TitleDetail>' +
    '<Subject><SubjectSchemeIdentifier>23</SubjectSchemeIdentifier><SubjectCode>C</SubjectCode></Subject></DescriptiveDetail>' +
    '<CollateralDetail><TextContent><TextType>03</TextType><ContentAudience>00</ContentAudience></TextContent></CollateralDetail>' +
    '<PublishingDetail><Publisher><PublishingRole>01</PublishingRole><PublisherIdentifier><PublisherIDType>16</PublisherIDType>' +
    '<IDValue>0000-0001-2161-2573</IDValue></PublisherIdentifier><PublisherName>Clone</PublisherName></Publisher>' +
    '<PublishingStatus>04</PublishingStatus></PublishingDetail></Product></ONIXMessage>';

  it('carries every recovery kind, and its recovered findings, as plain data that clones deterministically', async () => {
    const validator = createOnixSourceValidator({
      loadResource: async (fileName) => new Uint8Array(readFileSync(join(PUBLIC_DIR, fileName))),
    });
    const result = toWorkerResult(await validator.validate(new TextEncoder().encode(source)));

    expect(result.normalized?.recoveries.map((r) => r.recovery)).toEqual([
      'OMIT_INVALID_COMPOSITE',
      'PUBLISHER_CATEGORY_TO_CUSTOM',
      'NORMALIZE_IDENTIFIER_LEXICAL_FORM',
    ]);
    expect(result.findings.map((f) => f.recoverability).filter((r) => r !== 'NOT_RECOVERABLE')).toEqual([
      'OMIT_INVALID_COMPOSITE',
      'PUBLISHER_CATEGORY_TO_CUSTOM',
      'NORMALIZE_IDENTIFIER_LEXICAL_FORM',
    ]);
    expect(() => assertStructuredCloneSafe(result)).not.toThrow();
    const cloned = structuredClone(result);
    expect(cloned).toEqual(result);
    expect(JSON.stringify(cloned.normalized?.recoveries)).toBe(JSON.stringify(result.normalized?.recoveries));
    expect(JSON.stringify(cloned.findings)).toBe(JSON.stringify(result.findings));
  });

  // thoth-app#231: the omitted first TextContent moves both later survivors to other canonical paths.
  const moved = (release: '3.0' | '3.1', flavour: 'reference' | 'short') => {
    const reference = source
      .replace('release="3.0"', `release="${release}"`)
      .replace('/onix/3.0/reference', `/onix/${release}/reference`)
      .replace(
        /<CollateralDetail>.*<\/CollateralDetail>/,
        '<CollateralDetail><TextContent><TextType>03</TextType><ContentAudience>00</ContentAudience></TextContent>' +
          '<TextContent><TextType>03</TextType><ContentAudience>00</ContentAudience><Text>second</Text></TextContent>' +
          '<TextContent><TextType>04</TextType><ContentAudience>00</ContentAudience><Text>third</Text></TextContent>' +
          '</CollateralDetail>',
      );
    if (flavour === 'reference') return reference;
    const { referenceToShort } = deriveTagMap(
      readFileSync(join(PUBLIC_DIR, `ONIX_BookProduct_${release}_reference.xsd`), 'utf8'),
      readFileSync(join(PUBLIC_DIR, `ONIX_BookProduct_${release}_short.xsd`), 'utf8'),
    );
    return reference
      .replace(
        /<(\/?)([A-Za-z][\w.-]*)/g,
        (_, close: string, name: string) => `<${close}${referenceToShort.get(name) ?? name}`,
      )
      .replace(`/onix/${release}/reference"`, `/onix/${release}/short"`);
  };

  it.each([
    ['Reference 3.0', '3.0', 'reference', 'REPOSITIONED'],
    ['Reference 3.1', '3.1', 'reference', 'REPOSITIONED'],
    ['Short 3.0', '3.0', 'short', 'RENAMED'],
    ['Short 3.1', '3.1', 'short', 'RENAMED'],
  ] as const)(
    '%s: carries the uploaded occurrence of every moved element as plain data that clones deterministically',
    async (_label, release, flavour, kind) => {
      const validator = createOnixSourceValidator({
        loadResource: async (fileName) => new Uint8Array(readFileSync(join(PUBLIC_DIR, fileName))),
      });
      const bytes = new TextEncoder().encode(moved(release, flavour));
      const result = toWorkerResult(await validator.validate(bytes));
      const provenance = result.normalized!.provenance;
      expect(provenance.kind).toBe(kind);
      expect(provenance.kind === 'IDENTITY' ? [] : provenance.exceptions.length).toBeGreaterThan(0);

      expect(() => assertStructuredCloneSafe(result)).not.toThrow();
      const cloned = structuredClone(result);
      expect(cloned).toEqual(result);
      expect(JSON.stringify(cloned.normalized?.provenance)).toBe(JSON.stringify(provenance));
      // A second validation of the same bytes ships the identical sidecar.
      const again = toWorkerResult(await validator.validate(bytes));
      expect(JSON.stringify(again.normalized?.provenance)).toBe(JSON.stringify(provenance));

      const fromClone = createProvenanceResolver(cloned.normalized!.provenance);
      const collateral = '/ONIXMessage[1]/Product[1]/CollateralDetail[1]';
      const sourceCollateral = flavour === 'reference' ? collateral : '/ONIXmessage[1]/product[1]/collateraldetail[1]';
      const textContent = flavour === 'reference' ? 'TextContent' : 'textcontent';
      expect(fromClone.sourcePathOf(`${collateral}/TextContent[1]`)).toBe(`${sourceCollateral}/${textContent}[2]`);
      expect(fromClone.sourcePathOf(`${collateral}/TextContent[2]/Text[1]`)).toBe(
        `${sourceCollateral}/${textContent}[3]/${flavour === 'reference' ? 'Text' : 'd104'}[1]`,
      );
      expect(fromClone.sourceTagOf(`${collateral}/TextContent[2]`)).toBe(textContent);
    },
  );
});
