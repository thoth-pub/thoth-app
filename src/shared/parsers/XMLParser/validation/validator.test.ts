// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type { SourceFinding } from './findings';
import {
  type InventoryBinding,
  inventoryBindings,
  KERNEL_BINDINGS,
  SOURCE_RULE_INVENTORY,
} from './inventory/inventory';
import { requestedResourceUrls } from './ordinary';
import { PROLOG_SCAN_BOUND } from './prolog';
import { ONIX_VALIDATION_RESOURCES, OnixResourceIntegrityError } from './resources';
import { evaluateSchematron } from './schematron';
import { evaluateStrict } from './strict/evaluate';
import type { SchematronReport } from './strict/ruleset';
import {
  createConformanceValidator,
  createOnixSourceValidator,
  type ExecutionControls,
  type OnixSourceValidator,
  ValidationCancelledError,
} from './validator';
import { serializeXdm } from './xdm';

// Each validator compiles the pinned XSDs and ~1,300 strict assertions on first use; under coverage
// instrumentation that alone exceeds the default 5 s, so this file allows two minutes per test and hook.
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

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
    expect(
      result.normalized?.recoveries.map((r) =>
        r.recovery === 'OMIT_INVALID_COMPOSITE' ? [r.removed, r.taintSite] : r,
      ),
    ).toEqual(want.recoveries.map((r) => [r.removed, r.taint_site]));
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

  it('stops a root start tag beyond the prolog bound before any resource is loaded or parsed', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const loader = vi.fn(loadResource);
    const fresh = createOnixSourceValidator({ loadResource: loader });
    const root = '<ONIXMessage release="3.0" xmlns="http://ns.editeur.org/onix/3.0/reference"><Header/></ONIXMessage>';
    const text = `<?xml version="1.0"?><!--${'x'.repeat(PROLOG_SCAN_BOUND - 29)}-->${root}`;
    expect(text.indexOf('<ONIXMessage')).toBe(PROLOG_SCAN_BOUND - 1);
    const result = await fresh.validate(encode(text));
    expect(result.status).toBe('STOPPED');
    expect(result.stop).toEqual({ stage: 2, text: 'STOP after stage 2 (prolog bound exceeded)' });
    expect(result.findings).toEqual([
      expect.objectContaining({
        id: 'SECURITY_PROLOG_BOUND',
        scope: 'SECURITY',
        class: 'PROCESSING_STOP',
        counts: true,
      }),
    ]);
    expect(result.source).toBeNull();
    expect(result.normalized).toBeNull();
    expect(loader).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('stops a self-closing root terminator straddling the prolog bound before any resource, parser or later tier', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    requestedResourceUrls.splice(0);
    const loader = vi.fn(loadResource);
    const fresh = createOnixSourceValidator({ loadResource: loader });
    const selfClosing = '<ONIXMessage release="3.0" xmlns="http://ns.editeur.org/onix/3.0/reference"/>';
    const crossing = `<!--${'x'.repeat(PROLOG_SCAN_BOUND - selfClosing.length - 6)}-->${selfClosing}`;
    expect(crossing.indexOf('/>')).toBe(PROLOG_SCAN_BOUND - 1);
    const result = await fresh.validate(encode(crossing));
    expect(result.status).toBe('STOPPED');
    expect(result.stop).toEqual({ stage: 2, text: 'STOP after stage 2 (prolog bound exceeded)' });
    expect(ids(result.findings)).toEqual(['SECURITY_PROLOG_BOUND']);
    expect(result.source).toBeNull();
    expect(result.normalized).toBeNull();
    expect(loader).not.toHaveBeenCalled();
    expect(requestedResourceUrls).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
    // Control: the same terminator one character earlier proceeds into the ordinary tiers.
    const inside = `<!--${'x'.repeat(PROLOG_SCAN_BOUND - selfClosing.length - 7)}-->${selfClosing}`;
    expect(inside.indexOf('/>')).toBe(PROLOG_SCAN_BOUND - 2);
    const control = await fresh.validate(encode(inside));
    expect(control.status).toBe('COMPLETED');
    expect(control.source?.release).toBe('3.0');
    expect(loader).toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
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

  it('lets every conformance tier see the source as supplied before a post-conformance recovery canonicalises it', async () => {
    const text = fixtureText('dtd_suite30/N3_plain.xml').replace(
      /(<Publisher>[\s\S]*?)(<PublisherName>)/,
      '$1<PublisherIdentifier><PublisherIDType>16</PublisherIDType><IDValue>0000-0001-2161-2573</IDValue></PublisherIdentifier>$2',
    );
    expect(text).toContain('<IDValue>0000-0001-2161-2573</IDValue>');
    const seen: string[] = [];
    let evaluated: import('slimdom').Document | null = null;
    const isni = () =>
      evaluated?.getElementsByTagName('PublisherIdentifier')[0]?.getElementsByTagName('IDValue')[0]?.textContent;
    const observed = await createOnixSourceValidator({
      loadResource,
      execution: {
        onStage: (stage) => {
          if (stage === 'INVENTORY') seen.push(`${stage} ${isni()}`);
        },
        strict: (ruleset, document) => {
          evaluated = document;
          seen.push(`STRICT ${isni()}`);
          return evaluateStrict(ruleset, document);
        },
        schematron: (ruleset, document) => {
          seen.push(`SCHEMATRON ${isni()}`);
          return evaluateSchematron(ruleset, document);
        },
      },
    }).validate(encode(text));

    expect(seen).toEqual([
      'STRICT 0000-0001-2161-2573',
      'SCHEMATRON 0000-0001-2161-2573',
      'INVENTORY 0000-0001-2161-2573',
    ]);
    expect(observed.findings.filter((f) => f.id === '_20171126_b_42')).toEqual([
      expect.objectContaining({ tier: 'STRICT', recoverability: 'NORMALIZE_IDENTIFIER_LEXICAL_FORM', counts: false }),
    ]);
    expect(isni()).toBe('0000000121612573');
    expect(observed.normalized?.serialize()).toContain('<IDValue>0000000121612573</IDValue>');
    expect(observed.summary).toEqual({
      total: observed.findings.length,
      blocking: 0,
      secondary: 0,
      notEvaluable: 0,
      recovered: 1,
    });
    expect(observed.sourceValid).toBe(true);
  });

  it('keeps the approved ordinary recovery and a post-conformance recovery apart in one source', async () => {
    const text = fixtureText('taint30/T1_empty_textcontent_recovery.xml');
    const plain = await validator.validate(encode(text));
    const withCategory = await validator.validate(
      encode(
        text.replace(
          '</DescriptiveDetail>',
          '<Subject><SubjectSchemeIdentifier>23</SubjectSchemeIdentifier><SubjectCode>C</SubjectCode></Subject></DescriptiveDetail>',
        ),
      ),
    );
    const omitted = (findings: readonly SourceFinding[]) =>
      findings.filter((f) => f.recoverability === 'OMIT_INVALID_COMPOSITE');
    expect(omitted(withCategory.findings)).toEqual(omitted(plain.findings));
    expect(withCategory.normalized?.recoveries.map((r) => r.recovery)).toEqual([
      'OMIT_INVALID_COMPOSITE',
      'PUBLISHER_CATEGORY_TO_CUSTOM',
    ]);
    expect(withCategory.normalized?.recoveries[0]).toEqual(plain.normalized?.recoveries[0]);
    expect(withCategory.summary.recovered).toBe(plain.summary.recovered + 1);
    expect(withCategory.summary.blocking).toBe(plain.summary.blocking);
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

  it('gives a namespace-prefixed Short message the ledger of its default-namespace Reference twin', async () => {
    const reference =
      '<ONIXMessage release="3.0" xmlns="http://ns.editeur.org/onix/3.0/reference"><Header><Sender><SenderName>T</SenderName></Sender><SentDateTime>20260909T1200</SentDateTime></Header>' +
      '<Product><RecordReference>r</RecordReference><NotificationType>03</NotificationType><ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9780000000002</IDValue></ProductIdentifier>' +
      '<ProductSupply><SupplyDetail><Supplier><SupplierRole>01</SupplierRole><SupplierName>s</SupplierName></Supplier><ProductAvailability>20</ProductAvailability>' +
      '<Price><PriceType>01</PriceType><PriceAmount>0.00</PriceAmount><CurrencyCode>EUR</CurrencyCode></Price></SupplyDetail></ProductSupply></Product></ONIXMessage>';
    const SHORT_TAGS: Record<string, string> = {
      ONIXMessage: 'ONIXmessage',
      Header: 'header',
      Sender: 'sender',
      SenderName: 'x298',
      SentDateTime: 'x307',
      Product: 'product',
      RecordReference: 'a001',
      NotificationType: 'a002',
      ProductIdentifier: 'productidentifier',
      ProductIDType: 'b221',
      IDValue: 'b244',
      ProductSupply: 'productsupply',
      SupplyDetail: 'supplydetail',
      Supplier: 'supplier',
      SupplierRole: 'j292',
      SupplierName: 'j137',
      ProductAvailability: 'j396',
      Price: 'price',
      PriceType: 'x462',
      PriceAmount: 'j151',
      CurrencyCode: 'j152',
    };
    const short = reference
      .replace(/<(\/?)(\w+)/g, (_, close: string, name: string) => `<${close}o:${SHORT_TAGS[name]}`)
      .replace('xmlns="http://ns.editeur.org/onix/3.0/reference"', 'xmlns:o="http://ns.editeur.org/onix/3.0/short"');
    const ledger = (findings: readonly SourceFinding[]) =>
      findings.map((f) => `${f.tier}|${f.id}|${f.path}|${f.class}|${f.projection}|${f.counts}`).sort();

    const [referenceResult, shortResult] = [
      await validator.validate(encode(reference)),
      await validator.validate(encode(short)),
    ];
    expect(shortResult.source?.flavour).toBe('short');
    expect(referenceResult.findings.filter((f) => f.tier === 'CANONICAL_ORDINARY').map((f) => f.path)).toEqual([
      '/ONIXMessage[1]/Product[1]/ProductSupply[1]/SupplyDetail[1]/Price[1]/PriceAmount[1]',
    ]);
    expect(ledger(shortResult.findings)).toEqual(ledger(referenceResult.findings));
    expect(shortResult.summary).toEqual(referenceResult.summary);
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

  it('emits K-EIDR-CONTENT-ID with the approved adoption wording, never the v4 proposal', async () => {
    const result = await validator.validate(fixtureBytes('kernel31/K-EIDR_pos_wrong_shape.xml'));
    const findings = result.findings.filter((f) => f.id === 'K-EIDR-CONTENT-ID');
    expect(findings).toEqual([
      expect.objectContaining({
        class: 'NORMATIVE_INVALID',
        counts: true,
        detail: expect.objectContaining({ authorityClass: 'EXTERNAL_ADOPTED' }),
      }),
    ]);
    expect(findings[0].message).toContain('adopted from EIDR ID Format v1.51');
    expect(findings[0].message).toContain('Adoption approved by the final thoth#895 decision');
    expect(result.findings.filter((f) => f.message?.includes('PROPOSED adoption'))).toEqual([]);
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

// ---------------------------------------------------------------------------
// Cross-Collection residual localisation (independent review of #195, F2)
// ---------------------------------------------------------------------------
describe('cross-Collection residual rules under unrelated sibling taint', () => {
  const P6_LEVEL_02 =
    '<TitleElement><TitleElementLevel>02</TitleElementLevel><TitleText>Great Series</TitleText></TitleElement>';
  const collectionTitle =
    '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>02</TitleElementLevel><TitleText>Sibling</TitleText></TitleElement></TitleDetail>';
  const identifier = (level: string) =>
    `<CollectionIdentifier><CollectionElementLevel>${level}</CollectionElementLevel><CollectionIDType>01</CollectionIDType><IDTypeName>MySeriesID</IDTypeName><IDValue>S-${level}</IDValue></CollectionIdentifier>`;
  // Unrelated ordinary-XSD defects, reported on the Collection element itself or inside it.
  const TAINT = {
    'missing CollectionType (defect on the Collection element)': `<Collection>${identifier('02')}${collectionTitle}</Collection>`,
    'invalid CollectionType code (defect inside the Collection)': `<Collection><CollectionType>99</CollectionType>${identifier('02')}${collectionTitle}</Collection>`,
  };
  const CONFORMING = `<Collection><CollectionType>10</CollectionType>${identifier('02')}${collectionTitle}</Collection>`;
  const message = (collections: string, p6: string) =>
    '<?xml version="1.0" encoding="UTF-8"?><ONIXMessage release="3.1" xmlns="http://ns.editeur.org/onix/3.1/reference">' +
    '<Header><Sender><SenderName>F2</SenderName></Sender><SentDateTime>20260909T1200</SentDateTime></Header>' +
    '<Product><RecordReference>f2</RecordReference><NotificationType>03</NotificationType>' +
    '<ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9780000000002</IDValue></ProductIdentifier>' +
    `<DescriptiveDetail><ProductComposition>00</ProductComposition><ProductForm>BC</ProductForm>${collections}` +
    `<TitleDetail><TitleType>01</TitleType>${p6}<TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText>F2</TitleText></TitleElement></TitleDetail>` +
    '</DescriptiveDetail><PublishingDetail><Publisher><PublishingRole>01</PublishingRole><PublisherName>F2</PublisherName></Publisher>' +
    '<PublishingStatus>04</PublishingStatus><PublishingDate><PublishingDateRole>01</PublishingDateRole><Date>20260101</Date></PublishingDate>' +
    '</PublishingDetail></Product></ONIXMessage>';
  const DD = '/ONIXMessage[1]/Product[1]/DescriptiveDetail[1]';
  const withId = (findings: readonly SourceFinding[], id: string) => findings.filter((f) => f.id === id);

  const CASES: [
    id: string,
    violating: string,
    conformingVariant: string,
    p6: string,
    expectedPath: string,
    ownTaint: [from: string, to: string],
  ][] = [
    [
      'R-COLL-TITLELESS-P6-31',
      // Titleless publisher collection whose Group P.6 title carries no collection-level element.
      '<Collection><CollectionType>10</CollectionType></Collection>',
      '<Collection><CollectionType>10</CollectionType></Collection>',
      '',
      `${DD}/Collection[3]`,
      // CollectionType is a dependency of the rule.
      ['<CollectionType>10</CollectionType>', '<CollectionType>99</CollectionType>'],
    ],
    [
      'R-COLLELEMENTLEVEL-MATCH-31',
      `<Collection><CollectionType>10</CollectionType>${identifier('03')}${collectionTitle}</Collection>`,
      `<Collection><CollectionType>10</CollectionType>${identifier('02')}${collectionTitle}</Collection>`,
      '',
      `${DD}/Collection[3]/CollectionIdentifier[1]`,
      // The Collection's own TitleDetail is a dependency of the rule.
      ['<TitleType>01</TitleType>', ''],
    ],
  ];

  describe.each(Object.entries(TAINT))('%s in Collection[1]', (_label, tainted) => {
    it.each(CASES)('%s stays authoritative and localised to Collection[3]', async (id, violating, _c, p6, path) => {
      const result = await validator.validate(encode(message(`${tainted}${CONFORMING}${violating}`, p6)));
      expect(result.status).toBe('COMPLETED');
      // The sibling defect is real and taints only Collection[1].
      const ordinary = result.findings.filter((f) => f.tier === 'CANONICAL_ORDINARY');
      expect(ordinary.length).toBeGreaterThan(0);
      for (const defect of ordinary)
        expect(defect.path?.startsWith(`${DD}/Collection[1]`), defect.path ?? '').toBe(true);
      // The genuine violation counts, is authoritative and names the responsible construct.
      expect(withId(result.findings, id)).toEqual([
        expect.objectContaining({
          class: 'NORMATIVE_INVALID',
          projection: 'AUTHORITATIVE',
          counts: true,
          path,
          detail: expect.objectContaining({ dependency: expect.objectContaining({ taintedDependencies: [] }) }),
        }),
      ]);
      expect(result.summary.blocking).toBeGreaterThanOrEqual(2);
    });

    it.each(CASES)('%s: the conforming variant of Collection[3] fires nothing', async (id, _v, conforming, p6) => {
      const result = await validator.validate(
        encode(message(`${tainted}${CONFORMING}${conforming}`, `${P6_LEVEL_02}${p6}`)),
      );
      expect(result.status).toBe('COMPLETED');
      expect(withId(result.findings, id)).toEqual([]);
    });
  });

  it.each(CASES)(
    '%s: without sibling taint the same finding is identical apart from the taint',
    async (id, violating, _c, p6, path) => {
      const result = await validator.validate(encode(message(`${CONFORMING}${CONFORMING}${violating}`, p6)));
      expect(result.findings.filter((f) => f.tier === 'CANONICAL_ORDINARY')).toEqual([]);
      expect(withId(result.findings, id)).toEqual([
        expect.objectContaining({ class: 'NORMATIVE_INVALID', projection: 'AUTHORITATIVE', counts: true, path }),
      ]);
    },
  );

  it.each(CASES)(
    '%s: taint on a dependency inside the violating Collection makes its own finding SECONDARY',
    async (id, violating, _c, p6, path, [from, to]) => {
      const own = violating.replace(from, to);
      const result = await validator.validate(encode(message(`${CONFORMING}${CONFORMING}${own}`, p6)));
      const ordinary = result.findings.filter((f) => f.tier === 'CANONICAL_ORDINARY');
      expect(ordinary.map((f) => f.path?.startsWith(`${DD}/Collection[3]`))).toEqual([true]);
      expect(withId(result.findings, id)).toEqual([
        expect.objectContaining({ projection: 'SECONDARY', counts: false, path }),
      ]);
    },
  );

  it.each(CASES)('%s is bound to its inventory owner', (id) => {
    const entry = SOURCE_RULE_INVENTORY.find((e) => e.id === id)!;
    const bindings = inventoryBindings('3.1').filter((b) => b.id === id);
    expect(bindings.map((b) => b.owner)).toEqual([entry.owner]);
  });
});

// ---------------------------------------------------------------------------
// Execution controls (thoth-app#196): observation and scheduling, never semantics
// ---------------------------------------------------------------------------
describe('execution controls', () => {
  const ledger = (result: Awaited<ReturnType<OnixSourceValidator['validate']>>) =>
    JSON.stringify({
      findings: result.findings,
      summary: result.summary,
      source: result.source,
      xml: result.normalized?.serialize() ?? null,
    });
  const withControls = (execution: ExecutionControls) => createOnixSourceValidator({ loadResource, execution });

  it('reports stage transitions in pipeline order and changes nothing in the result', async () => {
    const stages: string[] = [];
    const bytes = fixtureBytes('taint31/T7_global_rule_with_tainted_product.xml');
    const observed = await withControls({ onStage: (s) => void stages.push(s) }).validate(bytes);
    const plain = await validator.validate(bytes);
    expect(stages).toEqual(['DECODING', 'SOURCE_GATE', 'PREPARING', 'ORDINARY', 'STRICT', 'SCHEMATRON', 'INVENTORY']);
    expect(ledger(observed)).toBe(ledger(plain));
  });

  it('a stage-2 stop reports only the gate stages and never prepares', async () => {
    const stages: string[] = [];
    const result = await withControls({ onStage: (s) => void stages.push(s) }).validate(
      fixtureBytes('dtd_suite30/D1_bare_doctype.xml'),
    );
    expect(result.status).toBe('STOPPED');
    expect(stages).toEqual(['DECODING', 'SOURCE_GATE']);
  });

  it.each(['PREPARING', 'ORDINARY', 'STRICT', 'SCHEMATRON'] as const)(
    'cancels cooperatively at the %s point with no partial result',
    async (point) => {
      const seen: string[] = [];
      let armed = true;
      let reached = false;
      const cancelling = withControls({
        onStage: (s) => {
          seen.push(s);
          if (armed && s === point) reached = true;
        },
        shouldCancel: () => reached,
      });
      const failure = await cancelling.validate(fixtureBytes('dtd_suite30/N3_plain.xml')).then(
        () => null,
        (error: unknown) => error,
      );
      expect(failure).toBeInstanceOf(ValidationCancelledError);
      expect((failure as ValidationCancelledError).stage).toBe(point);
      expect(seen[seen.length - 1]).toBe(point);
      // A cancellation leaves no corrupted state in the in-process validator: withdrawn, it completes.
      armed = false;
      reached = false;
      const plain = await cancelling.validate(fixtureBytes('dtd_suite30/N3_plain.xml'));
      expect(plain.status).toBe('COMPLETED');
    },
  );

  it('does not cancel when shouldCancel stays false and exposes the error class', () => {
    expect(new ValidationCancelledError('STRICT')).toMatchObject({ name: 'ValidationCancelledError', stage: 'STRICT' });
  });

  it('injected evaluators receive the canonical ruleset and document and their findings flow into the ledger unchanged', async () => {
    const calls: string[] = [];
    const bytes = fixtureBytes('taint30/T7_global_rule_with_tainted_product.xml');
    const injected = await withControls({
      strict: (ruleset, document, controls) => {
        calls.push('strict');
        controls.onProgress({ stage: 'STRICT', done: 1, total: 1 });
        return evaluateStrict(ruleset, document);
      },
      schematron: async (ruleset, document, controls) => {
        calls.push('schematron');
        await controls.yield();
        expect(controls.shouldCancel()).toBe(false);
        return evaluateSchematron(ruleset, document);
      },
    }).validate(bytes);
    const plain = await validator.validate(bytes);
    expect(calls).toEqual(['strict', 'schematron']);
    expect(ledger(injected)).toBe(ledger(plain));
    expect(injected.findings.some((f) => f.tier === 'STRICT')).toBe(true);
    expect(injected.findings.some((f) => f.tier === 'SCHEMATRON')).toBe(true);
  });

  it('progress and yield controls default to no-ops for injected evaluators', async () => {
    const seen: unknown[] = [];
    await withControls({
      strict: (ruleset, document, controls) => {
        controls.onProgress({ stage: 'STRICT', done: 1, total: 2 });
        seen.push(controls.shouldCancel());
        return evaluateStrict(ruleset, document);
      },
    }).validate(fixtureBytes('dtd_suite30/N3_plain.xml'));
    expect(seen).toEqual([false]);
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
