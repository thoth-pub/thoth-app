// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { createOrdinaryValidator, type OrdinaryValidator } from './ordinary';
import { type OrdinaryStageResult, runOrdinaryStage } from './ordinaryStage';
import { ONIX_VALIDATION_RESOURCES } from './resources';
import { deriveTagMap, type TagMap } from './tagMap';
import { ONIX_NAMESPACES, type OnixFlavour, type OnixRelease, SCHEMA_RELEASE } from './types';
import { buildXdm, pathOf, serializeXdm } from './xdm';

const PUBLIC_DIR = join(process.cwd(), 'public', 'onix-validation');
const readPublic = (name: string) => readFileSync(join(PUBLIC_DIR, name));
const resources = new Map(ONIX_VALIDATION_RESOURCES.map((r) => [r.fileName, new Uint8Array(readPublic(r.fileName))]));
const fixture = (set: string, name: string) =>
  readFileSync(join(__dirname, '__fixtures__', 'spike02', set, name), 'utf8');
const base = (release: OnixRelease) => fixture(release === '3.0' ? 'dtd_suite30' : 'dtd_suite31', 'N3_plain.xml');

const validators: Record<string, OrdinaryValidator> = {};
const maps: Partial<Record<OnixRelease, TagMap>> = {};

beforeAll(async () => {
  for (const release of ['3.0', '3.1'] as const) {
    for (const flavour of ['reference', 'short'] as const) {
      validators[`${release}/${flavour}`] = await createOrdinaryValidator(
        resources,
        `ONIX_BookProduct_${release}_${flavour}.xsd`,
      );
    }
    maps[release] = deriveTagMap(
      readPublic(`ONIX_BookProduct_${release}_reference.xsd`).toString('utf8'),
      readPublic(`ONIX_BookProduct_${release}_short.xsd`).toString('utf8'),
    );
  }
});

function toShort(reference: string, release: OnixRelease): string {
  const map = maps[release]!;
  return serializeXdm(
    buildXdm(reference, {
      rename: {
        shortToReference: map.referenceToShort,
        sourceNamespace: map.referenceNamespace,
        targetNamespace: map.shortNamespace,
      },
    }).document,
  );
}

function run(text: string, release: OnixRelease, flavour: OnixFlavour): OrdinaryStageResult {
  return runOrdinaryStage({
    source: {
      release,
      schemaRelease: SCHEMA_RELEASE[release],
      flavour,
      namespaceURI: ONIX_NAMESPACES[release][flavour],
    },
    bytes: new TextEncoder().encode(text),
    text,
    sourceValidator: validators[`${release}/${flavour}`],
    referenceValidator: validators[`${release}/reference`],
    tagMap: flavour === 'short' ? maps[release]! : null,
  });
}

function ok(result: OrdinaryStageResult) {
  if (result.kind !== 'OK') throw new Error(`expected OK, got ${JSON.stringify(result.findings)}`);
  return result;
}

const referenceValid = (text: string, release: OnixRelease) =>
  validators[`${release}/reference`].validate(new TextEncoder().encode(text)).diagnostics;

describe('runOrdinaryStage: Reference input (stage 3 is the canonical verdict)', () => {
  it('accepts a schema-valid message', () => {
    const result = ok(run(base('3.0'), '3.0', 'reference'));
    expect(result.canonicalDefects).toEqual([]);
    expect(result.sourceOnly).toEqual([]);
    expect(result.xdm.document.documentElement?.localName).toBe('ONIXMessage');
  });

  it('classifies a missing Text as RECOVERABLE and a datatype error as BLOCKING', () => {
    const text = base('3.0').replace(
      '</DescriptiveDetail>',
      '</DescriptiveDetail><CollateralDetail><TextContent><TextType>03</TextType><ContentAudience>00</ContentAudience></TextContent></CollateralDetail>',
    );
    const invalid = text.replace(
      '</Product>',
      '<ProductSupply><SupplyDetail><Supplier><SupplierRole>01</SupplierRole><SupplierName>s</SupplierName></Supplier><ProductAvailability>20</ProductAvailability><Price><PriceType>01</PriceType><PriceAmount>0.00</PriceAmount><CurrencyCode>EUR</CurrencyCode></Price></SupplyDetail></ProductSupply></Product>',
    );
    const result = ok(run(invalid, '3.0', 'reference'));
    expect(result.canonicalDefects.map((d) => [d.kind, d.node && pathOf(d.node)])).toEqual([
      ['RECOVERABLE', '/ONIXMessage[1]/Product[1]/CollateralDetail[1]/TextContent[1]'],
      ['BLOCKING', '/ONIXMessage[1]/Product[1]/ProductSupply[1]/SupplyDetail[1]/Price[1]/PriceAmount[1]'],
    ]);
  });

  it('resolves every defect before any recovery, so adjacent recoverable composites stay recoverable', () => {
    const empty = '<TextContent><TextType>03</TextType><ContentAudience>00</ContentAudience></TextContent>';
    const text = base('3.0').replace(
      '</DescriptiveDetail>',
      `</DescriptiveDetail><CollateralDetail>${empty}${empty}</CollateralDetail>`,
    );
    const result = ok(run(text, '3.0', 'reference'));
    expect(result.canonicalDefects.map((d) => [d.kind, d.node && pathOf(d.node)])).toEqual([
      ['RECOVERABLE', '/ONIXMessage[1]/Product[1]/CollateralDetail[1]/TextContent[1]'],
      ['RECOVERABLE', '/ONIXMessage[1]/Product[1]/CollateralDetail[1]/TextContent[2]'],
    ]);
  });

  it('classifies an identity-constraint violation as BLOCKING_IDENTITY', () => {
    const text = base('3.0');
    const product = text.slice(text.indexOf('<Product>'), text.indexOf('</Product>') + '</Product>'.length);
    const result = ok(run(text.replace(product, product + product), '3.0', 'reference'));
    expect(result.canonicalDefects.map((d) => d.kind)).toEqual(['BLOCKING_IDENTITY']);
  });

  it('stops a document that is not well-formed with the parser diagnostic', () => {
    const result = run(base('3.0').replace('</Header>', ''), '3.0', 'reference');
    expect(result.kind).toBe('STOP');
    expect(result.kind === 'STOP' && result.findings).toEqual([
      expect.objectContaining({ id: 'SOURCE_NOT_WELL_FORMED', stage: 2, class: 'SOURCE_INVALID', blocking: true }),
    ]);
  });
});

describe('runOrdinaryStage: Short input (source flavour, then canonical Reference verdict)', () => {
  it.each(['3.0', '3.1'] as const)('%s: a valid Short message normalises with no defect', (release) => {
    const result = ok(run(toShort(base(release), release), release, 'short'));
    expect(result.canonicalDefects).toEqual([]);
    expect(result.sourceOnly).toEqual([]);
    expect(result.xdm.document.documentElement?.namespaceURI).toBe(ONIX_NAMESPACES[release].reference);
    expect(result.xdm.provenance.renamedElementCount).toBeGreaterThan(10);
  });

  it('merges a Short diagnostic into the canonical defect it reproduces', () => {
    const reference = base('3.0').replace(
      '</Product>',
      '<ProductSupply><SupplyDetail><Supplier><SupplierRole>01</SupplierRole><SupplierName>s</SupplierName></Supplier><ProductAvailability>20</ProductAvailability><Price><PriceType>01</PriceType><PriceAmount>0.00</PriceAmount><CurrencyCode>EUR</CurrencyCode></Price></SupplyDetail></ProductSupply></Product>',
    );
    const result = ok(run(toShort(reference, '3.0'), '3.0', 'short'));
    expect(result.sourceOnly).toEqual([]);
    expect(result.canonicalDefects).toHaveLength(1);
    const [defect] = result.canonicalDefects;
    expect(defect.kind).toBe('BLOCKING');
    expect(pathOf(defect.node!)).toMatch(/PriceAmount\[1\]$/);
    expect(defect.sourceDiagnostics).toHaveLength(1);
    expect(defect.sourceDiagnostics[0].message).toMatch(/j151/);
  });

  it('localises and merges defects of a namespace-prefixed message exactly as for a default namespace', () => {
    const reference = base('3.0').replace(
      '</Product>',
      '<ProductSupply><SupplyDetail><Supplier><SupplierRole>01</SupplierRole><SupplierName>s</SupplierName></Supplier><ProductAvailability>20</ProductAvailability><Price><PriceType>01</PriceType><PriceAmount>0.00</PriceAmount><CurrencyCode>EUR</CurrencyCode></Price></SupplyDetail></ProductSupply></Product>',
    );
    const prefixed = (text: string) =>
      text.replace(/<(\/?)([A-Za-z_][\w.-]*)/g, '<$1p:$2').replace(' xmlns="', ' xmlns:p="');

    const referenceResult = ok(run(prefixed(reference), '3.0', 'reference'));
    expect(referenceResult.canonicalDefects.map((d) => [d.kind, d.node && pathOf(d.node)])).toEqual([
      ['BLOCKING', '/ONIXMessage[1]/Product[1]/ProductSupply[1]/SupplyDetail[1]/Price[1]/PriceAmount[1]'],
    ]);

    const shortResult = ok(run(prefixed(toShort(reference, '3.0')), '3.0', 'short'));
    expect(shortResult.sourceOnly).toEqual([]);
    expect(shortResult.canonicalDefects.map((d) => [d.kind, d.node && pathOf(d.node)])).toEqual([
      ['BLOCKING', '/ONIXMessage[1]/Product[1]/ProductSupply[1]/SupplyDetail[1]/Price[1]/PriceAmount[1]'],
    ]);
    expect(shortResult.canonicalDefects[0].sourceDiagnostics.map((d) => d.xpath)).toEqual([
      expect.stringMatching(/p:j151$/),
    ]);
  });

  it('blocks a Short-only error that is not a registered artifact defect (flavour purity)', () => {
    const short = toShort(base('3.0'), '3.0').replace('<x298>', '<SenderName>').replace('</x298>', '</SenderName>');
    const result = ok(run(short, '3.0', 'short'));
    expect(result.canonicalDefects).toEqual([]);
    expect(result.sourceOnly.map((d) => [d.artifactDefect, d.node && pathOf(d.node)])).toEqual([
      [null, '/ONIXMessage[1]/Header[1]/Sender[1]/SenderName[1]'],
    ]);
  });

  it('FD-2: an empty ConferenceRole rejected only by the Short schema is an artifact defect', () => {
    const reference = fixture('edge', 'B16_default_conference_role_empty.xml');
    expect(referenceValid(reference, '3.0')).toEqual([]);
    const result = ok(run(toShort(reference, '3.0'), '3.0', 'short'));
    expect(result.canonicalDefects).toEqual([]);
    expect(result.sourceOnly.map((d) => d.artifactDefect)).toEqual(['FD-2']);
  });

  it('FD-1: two SalesOutlet in a CoverResource are valid Reference but rejected by the 3.0 Short schema', () => {
    const reference = base('3.0').replace(
      '</PublishingDetail>',
      '</PublishingDetail><ProductionDetail><ProductionManifest><CoverManifest><CoverResource>' +
        '<SalesOutlet><SalesOutletName>A</SalesOutletName></SalesOutlet><SalesOutlet><SalesOutletName>B</SalesOutletName></SalesOutlet>' +
        '<NoResource/></CoverResource></CoverManifest>' +
        '<BodyManifest><BodyResource><ResourceFileLink>https://example.org/body.pdf</ResourceFileLink></BodyResource></BodyManifest>' +
        '</ProductionManifest></ProductionDetail>',
    );
    expect(referenceValid(reference, '3.0')).toEqual([]);
    const result = ok(run(toShort(reference, '3.0'), '3.0', 'short'));
    expect(result.canonicalDefects).toEqual([]);
    expect(result.sourceOnly.map((d) => d.artifactDefect)).toEqual(['FD-1']);
  });

  it('FD-3: a ProductSupply without SupplyDetail is valid Reference but rejected by the 3.1 Short schema', () => {
    const reference = base('3.1').replace(
      '</PublishingDetail>',
      '</PublishingDetail><ProductSupply><MarketReference>M1</MarketReference></ProductSupply>',
    );
    expect(referenceValid(reference, '3.1')).toEqual([]);
    const result = ok(run(toShort(reference, '3.1'), '3.1', 'short'));
    expect(result.canonicalDefects).toEqual([]);
    expect(result.sourceOnly.map((d) => d.artifactDefect)).toEqual(['FD-3']);
  });

  it('FD-4: repeated Affiliation with an AffiliationIdentifier is valid Reference but rejected by the 3.1 Short schema', () => {
    const reference = base('3.1').replace(
      '</TitleDetail>',
      '</TitleDetail><Contributor><SequenceNumber>1</SequenceNumber><ContributorRole>A01</ContributorRole><PersonName>Ann Author</PersonName>' +
        '<ProfessionalAffiliation><AffiliationIdentifier><AffiliationIDType>01</AffiliationIDType><IDTypeName>Inst</IDTypeName><IDValue>X1</IDValue></AffiliationIdentifier>' +
        '<Affiliation language="eng">University</Affiliation><Affiliation language="ger">Universität</Affiliation></ProfessionalAffiliation></Contributor>',
    );
    expect(referenceValid(reference, '3.1')).toEqual([]);
    const result = ok(run(toShort(reference, '3.1'), '3.1', 'short'));
    expect(result.canonicalDefects).toEqual([]);
    expect(result.sourceOnly.map((d) => d.artifactDefect)).toEqual(['FD-4']);
  });
});
