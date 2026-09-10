// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type { SourceFinding } from './findings';
import { type InventoryBinding, KERNEL_BINDINGS } from './inventory/inventory';
import { requestedResourceUrls } from './ordinary';
import { ONIX_VALIDATION_RESOURCES, OnixResourceIntegrityError } from './resources';
import type { SchematronReport } from './strict/ruleset';
import { createConformanceValidator, createOnixSourceValidator, type OnixSourceValidator } from './validator';
import { serializeXdm } from './xdm';

const FIXTURES = join(__dirname, '__fixtures__', 'spike02');
const PUBLIC_DIR = join(process.cwd(), 'public', 'onix-validation');
const fixtureText = (path: string) => readFileSync(join(FIXTURES, path), 'utf8');
const fixtureBytes = (path: string) => new Uint8Array(readFileSync(join(FIXTURES, path)));
const encode = (text: string) => new TextEncoder().encode(text);

const loaded: string[] = [];
const loadResource = async (fileName: string) => {
  loaded.push(fileName);
  return new Uint8Array(readFileSync(join(PUBLIC_DIR, fileName)));
};

let validator: OnixSourceValidator;
beforeAll(() => {
  validator = createOnixSourceValidator({ loadResource });
});

const ids = (findings: readonly SourceFinding[]) => findings.map((f) => f.id);

// ---------------------------------------------------------------------------
// Frozen SPIKE-02 v4 taint reference outputs (out/taint3?.json, out/tainttest3?.json)
// ---------------------------------------------------------------------------
interface V4Finding {
  tier: string;
  id: string;
  klass: string;
  path: string;
  blocking_class: boolean;
  disposition: string;
  scope_fallback?: string | null;
  dependency_paths?: string[];
  tainted_dependencies?: string[];
}
interface V4Record {
  stage2: { id: string }[] | null;
  ordinary: { kind: string; xpath: string; resolved_path: string | null; message: string; taint: string[] }[];
  recoveries: { removed: string; taint_site: string }[];
  findings: V4Finding[];
  counts: Record<string, number>;
}
const TIER: Record<string, string> = { STRICT: 'strict', SCHEMATRON: 'schematron', INVENTORY: 'thoth' };

function asV4(finding: SourceFinding): V4Finding {
  const dependency = finding.detail?.dependency as
    | { fallback: string | null; paths: string[]; taintedDependencies: string[] }
    | undefined;
  return {
    tier: TIER[finding.tier],
    id: finding.id,
    klass: finding.class,
    path: finding.path ?? '/',
    blocking_class: finding.blocking,
    disposition: finding.projection,
    scope_fallback: dependency?.fallback ?? null,
    dependency_paths: (dependency?.paths ?? []).slice(0, 6),
    tainted_dependencies: dependency?.taintedDependencies ?? [],
  };
}
function normaliseV4(f: V4Finding): V4Finding {
  return {
    tier: f.tier,
    id: f.id,
    klass: f.klass,
    path: f.path,
    blocking_class: f.blocking_class,
    disposition: f.disposition.startsWith('NOT_EVALUABLE') ? 'NOT_EVALUABLE' : f.disposition,
    scope_fallback: f.disposition.includes('context expression failed') ? null : (f.scope_fallback ?? null),
    dependency_paths: f.dependency_paths ?? [],
    tainted_dependencies: f.tainted_dependencies ?? [],
  };
}

const TEST_KERNELS: InventoryBinding[] = JSON.parse(fixtureText('testRules/kernel_rules_test.json'));
const TEST_SCHEMATRON: { id: string; kind: 'report' | 'assert'; context: string; test: string; klass: string }[] =
  JSON.parse(fixtureText('testRules/schematron_test_rules.json'));

describe.each([
  ['taint30', 'taint', null],
  ['taint31', 'taint', null],
  ['tainttest30', 'tainttest', 'dtd_suite30'],
  ['tainttest31', 'tainttest', 'dtd_suite31'],
] as const)('frozen v4 taint reference: %s', (set, family, dtdSet) => {
  const expected: Record<string, V4Record> = JSON.parse(fixtureText(`expected/${set}.json`));
  const conformance = createConformanceValidator({
    loadResource,
    // The exact rule sets of the v4 run: the approved kernel bindings, or the injected test rules.
    inventoryBindings: family === 'taint' ? KERNEL_BINDINGS : TEST_KERNELS,
    extraSchematron:
      family === 'tainttest'
        ? TEST_SCHEMATRON.map((t): SchematronReport & { klass: string } => ({
            ...t,
            role: 'test',
            text: t.id,
            prefixes: {},
            klass: t.klass,
          }))
        : [],
  });

  it.each(Object.keys(expected))('%s', async (name) => {
    const want = expected[name];
    const path = name.startsWith('D3_') && dtdSet ? `${dtdSet}/${name}` : `${set}/${name}`;
    const result = await conformance.validate(fixtureBytes(path));
    if (want.stage2) {
      expect(result.status).toBe('STOPPED');
      expect(ids(result.findings)).toEqual(want.stage2.map((f) => f.id));
      return;
    }
    const ordinary = result.findings.filter((f) => f.tier === 'CANONICAL_ORDINARY');
    expect(
      ordinary.map((f) => [
        f.detail?.kind,
        f.detail?.xpath,
        f.path,
        f.message?.slice(0, 160).trimEnd(),
        f.detail?.taint,
      ]),
    ).toEqual(want.ordinary.map((o) => [o.kind, o.xpath, o.resolved_path, o.message.slice(0, 160).trimEnd(), o.taint]));
    expect(result.normalized?.recoveries.map((r) => [r.removed, r.taintSite])).toEqual(
      want.recoveries.map((r) => [r.removed, r.taint_site]),
    );
    const later = result.findings.filter(
      (f) => f.tier === 'STRICT' || f.tier === 'SCHEMATRON' || f.tier === 'INVENTORY',
    );
    expect(later.map(asV4)).toEqual(want.findings.map(normaliseV4));
    const blocking = later.filter((f) => f.blocking);
    const ordinaryBlocking = ordinary.filter((f) => f.recoverability === 'NOT_RECOVERABLE').length;
    expect({
      ordinary_blocking: ordinaryBlocking,
      ordinary_recoverable: ordinary.length - ordinaryBlocking,
      later_blocking_before_projection: blocking.length,
      later_blocking_after_projection: blocking.filter((f) => f.projection === 'AUTHORITATIVE').length,
      later_secondary: later.filter((f) => f.projection === 'SECONDARY').length,
      not_evaluable: later.filter((f) => f.class === 'RULE_NOT_EVALUABLE').length,
      total_blocking_before: ordinaryBlocking + blocking.length,
      total_blocking_after: result.summary.blocking,
    }).toEqual(want.counts);
  });
});

// ---------------------------------------------------------------------------
// Public core API
// ---------------------------------------------------------------------------
describe('createOnixSourceValidator', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('stops a DTD before any parser and returns no normalised source', async () => {
    const result = await validator.validate(fixtureBytes('dtd_suite31/D9_pi_then_public_with_internal_subset.xml'));
    expect(result.status).toBe('STOPPED');
    expect(result.stop?.stage).toBe(2);
    expect(ids(result.findings)).toEqual(['SECURITY_DTD', 'R-MSG-NO-DOCTYPE-31']);
    expect(result.sourceValid).toBe(false);
    expect(result.normalized).toBeNull();
  });

  it('stops unsupported input as a SUPPORT outcome, never as invalid ONIX', async () => {
    const result = await validator.validate(encode('<ONIXMessage release="2.1"><Header/></ONIXMessage>'));
    expect(result.status).toBe('STOPPED');
    expect(result.findings).toEqual([expect.objectContaining({ id: 'UNSUPPORTED_SOURCE', scope: 'SUPPORT' })]);
  });

  it('validates a clean Reference message and hands over the unchanged canonical tree', async () => {
    const text = fixtureText('dtd_suite30/N3_plain.xml');
    const result = await validator.validate(encode(text));
    expect(result.status).toBe('COMPLETED');
    expect(result.source).toEqual({
      release: '3.0',
      schemaRelease: '3.0.8',
      flavour: 'reference',
      namespaceURI: 'http://ns.editeur.org/onix/3.0/reference',
    });
    expect(result.sourceValid).toBe(true);
    expect(result.summary.blocking).toBe(0);
    expect(result.normalized?.serialize()).toBe(serializeXdm(result.normalized!.document));
    expect(result.normalized?.serialize()).toContain('<RecordReference>spike02.DTD</RecordReference>');
  });

  it('reverts schema defaults applied for evaluation', async () => {
    const result = await validator.validate(fixtureBytes('edge/B16_default_conference_role_empty.xml'));
    expect(result.normalized?.serialize()).toContain('<ConferenceRole/>');
  });

  it('applies the approved recovery, keeps the defect truthful and never counts it', async () => {
    const result = await validator.validate(fixtureBytes('taint30/T1_empty_textcontent_recovery.xml'));
    const recovered = result.findings.filter((f) => f.recoverability === 'OMIT_INVALID_COMPOSITE');
    expect(recovered).toEqual([
      expect.objectContaining({ class: 'SOURCE_INVALID', blocking: true, counts: false, tier: 'CANONICAL_ORDINARY' }),
    ]);
    expect(result.normalized?.recoveries).toEqual([
      {
        recovery: 'OMIT_INVALID_COMPOSITE',
        removed: '/ONIXMessage[1]/Product[1]/CollateralDetail[1]/TextContent[1]',
        taintSite: '/ONIXMessage[1]/Product[1]/CollateralDetail[1]',
      },
    ]);
    expect(result.normalized?.serialize()).not.toContain('<TextContent>');
  });

  it('normalises Short input to Reference with source provenance', async () => {
    const short =
      '<ONIXmessage release="3.0" xmlns="http://ns.editeur.org/onix/3.0/short"><header><sender><x298>T</x298></sender><x307>20260909T1200</x307></header>' +
      '<product><a001>r</a001><a002>03</a002><productidentifier><b221>15</b221><b244>9780000000002</b244></productidentifier></product></ONIXmessage>';
    const result = await validator.validate(encode(short));
    expect(result.status).toBe('COMPLETED');
    expect(result.source?.flavour).toBe('short');
    const document = result.normalized!.document;
    expect(document.documentElement?.localName).toBe('ONIXMessage');
    const recordReference = document.getElementsByTagName('RecordReference')[0];
    expect(result.normalized!.provenance.sourcePathOf(recordReference)).toBe('/ONIXmessage[1]/product[1]/a001[1]');
  });

  it('counts same-key LanguageRole 01 + 02 as blocking source invalidity', async () => {
    const text = fixtureText('dtd_suite30/N3_plain.xml').replace(
      '</TitleDetail>',
      '</TitleDetail><Language><LanguageRole>01</LanguageRole><LanguageCode>ger</LanguageCode></Language><Language><LanguageRole>02</LanguageRole><LanguageCode>ger</LanguageCode></Language>',
    );
    const result = await validator.validate(encode(text));
    expect(result.findings.filter((f) => f.id === '_20171218_f_2')).toEqual([
      expect.objectContaining({
        class: 'NORMATIVE_INVALID',
        scope: 'VALIDITY',
        counts: true,
        projection: 'AUTHORITATIVE',
      }),
    ]);
    expect(result.sourceValid).toBe(false);
  });

  it('keeps RULE_NOT_EVALUABLE visible and non-counting while K-EIDR-PARTY-ID blocks', async () => {
    const result = await validator.validate(fixtureBytes('eidr31/K-EIDRP_pos_CopyrightOwnerIdentifier_no_hyphen.xml'));
    expect(result.findings.filter((f) => f.id === '_20171221_j_28')).toEqual([
      expect.objectContaining({ class: 'RULE_NOT_EVALUABLE', counts: false, projection: 'NOT_EVALUABLE' }),
    ]);
    expect(result.findings.filter((f) => f.id === 'K-EIDR-PARTY-ID')).toEqual([
      expect.objectContaining({ class: 'NORMATIVE_INVALID', counts: true }),
    ]);
  });

  it('is deterministic', async () => {
    const bytes = fixtureBytes('taint31/T7_global_rule_with_tainted_product.xml');
    const first = await validator.validate(bytes);
    const second = await validator.validate(bytes);
    expect(JSON.stringify(second.findings)).toBe(JSON.stringify(first.findings));
  });

  it('never fetches: metadata URLs are data, resources come only from the pinned loader', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    vi.stubGlobal('XMLHttpRequest', vi.fn());
    requestedResourceUrls.splice(0);
    loaded.splice(0);
    const fresh = createOnixSourceValidator({ loadResource });
    const text = fixtureText('residual31/S31-0067_xsi_schemalocation_present.xml').replace(
      '</TitleDetail>',
      '</TitleDetail><Contributor><SequenceNumber>1</SequenceNumber><ContributorRole>A01</ContributorRole><PersonName>A</PersonName><Website><WebsiteLink>https://evil.invalid/fetch-me</WebsiteLink></Website></Contributor>',
    );
    const result = await fresh.validate(encode(text));
    expect(result.status).toBe('COMPLETED');
    expect(fetchSpy).not.toHaveBeenCalled();
    const pinned = new Set(ONIX_VALIDATION_RESOURCES.map((r) => r.fileName));
    expect(loaded.filter((name) => !pinned.has(name))).toEqual([]);
    expect(requestedResourceUrls.filter((url) => !pinned.has(url))).toEqual([]);
  });

  it('fails closed when a pinned resource does not match its hash', async () => {
    const tampered = createOnixSourceValidator({
      loadResource: async (fileName) => {
        const bytes = new Uint8Array(readFileSync(join(PUBLIC_DIR, fileName)));
        if (fileName === 'ONIX_BookProduct_CodeLists.xsd') bytes[2000] ^= 1;
        return bytes;
      },
    });
    await expect(tampered.validate(fixtureBytes('dtd_suite30/N3_plain.xml'))).rejects.toBeInstanceOf(
      OnixResourceIntegrityError,
    );
  });
});

describe('source encoding', () => {
  const plain = () => fixtureText('dtd_suite30/N3_plain.xml');

  it('accepts UTF-8 with a byte-order mark', async () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...encode(plain())]);
    expect((await validator.validate(bytes)).status).toBe('COMPLETED');
  });

  it('accepts UTF-16 with a byte-order mark', async () => {
    const text = plain().replace('encoding="UTF-8"', 'encoding="UTF-16"');
    const units = Array.from(text, (c) => c.charCodeAt(0));
    const bytes = new Uint8Array(2 + units.length * 2);
    bytes.set([0xff, 0xfe]);
    units.forEach((u, i) => {
      bytes[2 + i * 2] = u & 0xff;
      bytes[3 + i * 2] = u >> 8;
    });
    const result = await validator.validate(bytes);
    expect(result.status).toBe('COMPLETED');
    expect(result.sourceValid).toBe(true);
  });

  it('stops malformed UTF-8 as not well-formed', async () => {
    const bytes = encode(plain());
    const broken = new Uint8Array([...bytes.slice(0, 200), 0xc3, 0x28, ...bytes.slice(200)]);
    const result = await validator.validate(broken);
    expect(ids(result.findings)).toEqual(['SOURCE_NOT_WELL_FORMED']);
  });

  it('stops a declared encoding outside UTF-8/UTF-16 as unsupported', async () => {
    const result = await validator.validate(encode(plain().replace('encoding="UTF-8"', 'encoding="ISO-8859-1"')));
    expect(result.status).toBe('STOPPED');
    expect(result.findings).toEqual([
      expect.objectContaining({
        id: 'UNSUPPORTED_SOURCE',
        scope: 'SUPPORT',
        detail: expect.objectContaining({ reason: 'UNSUPPORTED_ENCODING' }),
      }),
    ]);
  });
});
