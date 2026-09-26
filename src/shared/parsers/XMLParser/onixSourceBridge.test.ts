// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse } from '@5stones/onix/dist/parse';
import type { Element } from 'slimdom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ContributorService } from '@/src/entities/contributor';
import type { InstitutionService } from '@/src/entities/institution';

import { currencyOptions, languageOptions, licenseOptions } from '../../constants';
import type { ImportIssue } from '../../types';
import type { ExtendedONIXMessageRoot } from './interfaces';
import {
  bridgeOnixSource,
  permitsTargetPlanning,
  projectOnixRefusal,
  projectOnixSourceIssues,
  projectOnixUnavailable,
  toAdapterXml,
} from './onixSourceBridge';
import {
  createOnixSourceValidator,
  createProvenanceResolver,
  ENGINE_ENVELOPES,
  type EnvelopeEvidence,
  type OnixSourceValidator,
  type OnixWorkerResult,
  type RecoveryMarker,
  type SourceFinding,
} from './validation';
import { deriveTagMap } from './validation/tagMap';
import { createExecutionControls } from './validation/worker/execution';
import { toWorkerResult } from './validation/worker/result';
import { buildXdm, pathOf } from './validation/xdm';
import XMLParser from './XMLParser';

vi.mock('@5stones/onix/dist/parse', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@5stones/onix/dist/parse')>();
  return { parse: vi.fn(actual.parse) };
});

// Plans carry generated ids; one deterministic sequence per plan makes two plans comparable field for field.
const ids = vi.hoisted(() => ({ next: 0 }));
vi.mock('uuid', () => ({ v4: () => `id-${(ids.next += 1)}` }));

// The canonical validator compiles the pinned schemas and rules once for this file; under coverage that alone
// exceeds the default timeouts.
vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

const PUBLIC_DIR = join(process.cwd(), 'public', 'onix-validation');
const FIXTURES = join(__dirname, 'validation', '__fixtures__', 'spike02');
const REFERENCE_NS = 'http://ns.editeur.org/onix/3.0/reference';
const SHORT_NS = 'http://ns.editeur.org/onix/3.0/short';

/** Echoes the key and its interpolation values, so projected messages can be checked for what they carry. */
const t = (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key);

const noop = () => undefined;
let validator: OnixSourceValidator;

beforeAll(() => {
  validator = createOnixSourceValidator({
    loadResource: async (fileName) => new Uint8Array(readFileSync(join(PUBLIC_DIR, fileName))),
    execution: createExecutionControls({
      accelerate: true,
      onStage: noop,
      onProgress: noop,
      shouldCancel: () => false,
      yield: () => Promise.resolve(),
    }),
  });
});

/** The exact structured-clone-safe result a #196 Worker session posts for these bytes. */
const canonical = async (xml: string): Promise<OnixWorkerResult> =>
  toWorkerResult(await validator.validate(new TextEncoder().encode(xml)));

const blockingIds = (result: OnixWorkerResult) => result.findings.filter((f) => f.counts).map((f) => `${f.id} ${f.path}`);

const tagMap = deriveTagMap(
  readFileSync(join(PUBLIC_DIR, 'ONIX_BookProduct_3.0_reference.xsd'), 'utf8'),
  readFileSync(join(PUBLIC_DIR, 'ONIX_BookProduct_3.0_short.xsd'), 'utf8'),
);

/** The same message in Short tags: every element renamed through the pinned schema correspondence, nothing else. */
const toShort = (reference: string) =>
  reference
    .replace(
      /<(\/?)([A-Za-z][\w.-]*)/g,
      (_, close: string, name: string) => `<${close}${tagMap.referenceToShort.get(name) ?? name}`,
    )
    .replace(`xmlns="${REFERENCE_NS}"`, `xmlns="${SHORT_NS}"`);

/**
 * A representative Reference message: two Products, repeated identifiers, titles and contributors listed out of
 * sequence order, an ORCID, XHTML biography and abstract text with attributes, entities and a hex character
 * reference, languages, extents, subjects and imprints - the facts the target planner reads.
 */
const REFERENCE_SOURCE = `<?xml version="1.0" encoding="UTF-8"?>
<ONIXMessage release="3.0" xmlns="${REFERENCE_NS}">
<Header><Sender><SenderName>Bridge Press</SenderName></Sender><SentDateTime>20260911T1200</SentDateTime></Header>
<!-- a comment the target adapter never sees -->
<Product>
<RecordReference>bridge.9780000000002</RecordReference>
<NotificationType>03</NotificationType>
<ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9780000000002</IDValue></ProductIdentifier>
<ProductIdentifier><ProductIDType>06</ProductIDType><IDValue>10.11647/OBP.0001</IDValue></ProductIdentifier>
<DescriptiveDetail>
<ProductComposition>00</ProductComposition>
<ProductForm>BC</ProductForm>
<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText>Bridges &amp; Borders</TitleText><Subtitle>An Occurrence Study</Subtitle></TitleElement></TitleDetail>
<Contributor><SequenceNumber>2</SequenceNumber><ContributorRole>A01</ContributorRole><PersonName>Charles Babbage</PersonName><NamesBeforeKey>Charles</NamesBeforeKey><KeyNames>Babbage</KeyNames></Contributor>
<Contributor><SequenceNumber>1</SequenceNumber><ContributorRole>A01</ContributorRole><NameIdentifier><NameIDType>21</NameIDType><IDValue>0000000218250097</IDValue></NameIdentifier><PersonName>Ada Lovelace</PersonName><NamesBeforeKey>Ada</NamesBeforeKey><KeyNames>Lovelace</KeyNames><BiographicalNote textformat="05"><p>Ada writes about <em>engines</em>.</p></BiographicalNote></Contributor>
<Contributor><SequenceNumber>3</SequenceNumber><ContributorRole>B01</ContributorRole><PersonName>Mary Somerville</PersonName><NamesBeforeKey>Mary</NamesBeforeKey><KeyNames>Somerville</KeyNames></Contributor>
<Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language>
<Extent><ExtentType>00</ExtentType><ExtentValue>240</ExtentValue><ExtentUnit>03</ExtentUnit></Extent>
<Subject><MainSubject/><SubjectSchemeIdentifier>10</SubjectSchemeIdentifier><SubjectCode>HIS000000</SubjectCode></Subject>
</DescriptiveDetail>
<CollateralDetail>
<TextContent><TextType>03</TextType><ContentAudience>00</ContentAudience><Text textformat="05"><p>An abstract with <strong>markup</strong> &amp; an&#xA0;entity.</p><p>A second paragraph.</p></Text></TextContent>
</CollateralDetail>
<PublishingDetail>
<Imprint><ImprintName>Bridge Imprint</ImprintName></Imprint>
<Publisher><PublishingRole>01</PublishingRole><PublisherName>Bridge Press</PublisherName></Publisher>
<PublishingStatus>04</PublishingStatus>
<PublishingDate><PublishingDateRole>01</PublishingDateRole><Date>20260101</Date></PublishingDate>
</PublishingDetail>
</Product>
<Product>
<RecordReference>bridge.9780000000019</RecordReference>
<NotificationType>03</NotificationType>
<ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9780000000019</IDValue></ProductIdentifier>
<DescriptiveDetail>
<ProductComposition>00</ProductComposition>
<ProductForm>EB</ProductForm>
<ProductFormDetail>E101</ProductFormDetail>
<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText>Second Crossing</TitleText></TitleElement></TitleDetail>
<Contributor><SequenceNumber>1</SequenceNumber><ContributorRole>B01</ContributorRole><PersonName>Mary Somerville</PersonName><NamesBeforeKey>Mary</NamesBeforeKey><KeyNames>Somerville</KeyNames></Contributor>
<Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language>
</DescriptiveDetail>
<PublishingDetail>
<Imprint><ImprintName>Bridge Imprint</ImprintName></Imprint>
<Publisher><PublishingRole>01</PublishingRole><PublisherName>Bridge Press</PublisherName></Publisher>
<PublishingStatus>04</PublishingStatus>
<PublishingDate><PublishingDateRole>01</PublishingDateRole><Date>20260201</Date></PublishingDate>
</PublishingDetail>
</Product>
</ONIXMessage>
`;

const LANGUAGE_PAIR =
  '</TitleDetail><Language><LanguageRole>01</LanguageRole><LanguageCode>ger</LanguageCode></Language>' +
  '<Language><LanguageRole>02</LanguageRole><LanguageCode>ger</LanguageCode></Language>';
const languageRoleInvalid = () =>
  readFileSync(join(FIXTURES, 'dtd_suite30', 'N3_plain.xml'), 'utf8').replace('</TitleDetail>', LANGUAGE_PAIR);

/**
 * The same message with the ONIX namespace bound to a prefix instead of being the default one: the same
 * elements, in the same namespace, spelled the other way XML allows.
 */
const toPrefixed = (reference: string, prefix = 'onix') =>
  reference
    .replace(/<(\/?)([A-Za-z][\w.-]*)/g, (_, close: string, name: string) => `<${close}${prefix}:${name}`)
    .replace(`xmlns="${REFERENCE_NS}"`, `xmlns:${prefix}="${REFERENCE_NS}"`);

/** Every element of a document as the XDM sees it: where it is, what namespace it is in and what it holds. */
const infoset = (xml: string) => {
  const { document } = buildXdm(xml);
  const elements: string[] = [];
  const walk = (node: Element) => {
    const attributes = [...node.attributes]
      .filter((attribute) => attribute.namespaceURI !== 'http://www.w3.org/2000/xmlns/')
      .map((attribute) => `${attribute.namespaceURI ?? ''}}${attribute.name}=${attribute.value}`)
      .sort();
    elements.push(`${pathOf(node)} {${node.namespaceURI ?? ''}}${node.localName} [${attributes.join(' ')}] "${node.textContent ?? ''}"`);
    for (const child of node.childNodes) if (child.nodeType === 1) walk(child as Element);
  };
  walk(document.documentElement as Element);
  return elements;
};

const IMPRINTS = [{ label: 'Bridge Imprint', value: '11111111-1111-1111-1111-111111111111' }];

/** Runs the unchanged target planner over one adapter value, with lookups that find nothing. */
const plan = async (adapter: ExtendedONIXMessageRoot) => {
  ids.next = 0;
  const contributorService = {
    getContributors: vi.fn().mockResolvedValue([]),
    getContributorsByOrcids: vi.fn().mockResolvedValue([]),
  } as unknown as ContributorService;
  const institutionService = { getInstitutions: vi.fn().mockResolvedValue([]) } as unknown as InstitutionService;
  return new XMLParser(
    adapter,
    IMPRINTS,
    licenseOptions,
    [],
    contributorService,
    institutionService,
    languageOptions,
    currencyOptions,
  ).parse();
};

const raw = (xml: string) => parse(xml) as ExtendedONIXMessageRoot;

const scripted = (overrides: Partial<OnixWorkerResult> = {}): OnixWorkerResult => ({
  status: 'COMPLETED',
  stop: null,
  source: { release: '3.0', schemaRelease: '3.0.8', flavour: 'reference', namespaceURI: REFERENCE_NS },
  findings: [],
  summary: { total: 0, blocking: 0, secondary: 0, notEvaluable: 0, recovered: 0 },
  sourceValid: true,
  normalized: {
    xml: `<ONIXMessage release="3.0" xmlns="${REFERENCE_NS}"><Product><RecordReference>r</RecordReference></Product></ONIXMessage>`,
    elementCount: 3,
    recoveries: [],
    provenance: { kind: 'IDENTITY', flavour: 'reference' },
  },
  ...overrides,
});

const finding = (overrides: Partial<SourceFinding> = {}): SourceFinding => ({
  id: 'R-TEST',
  tier: 'STRICT',
  stage: 6,
  scope: 'VALIDITY',
  class: 'NORMATIVE_INVALID',
  blocking: true,
  projection: 'AUTHORITATIVE',
  recoverability: 'NOT_RECOVERABLE',
  counts: true,
  path: '/ONIXMessage[1]/Product[1]',
  sourcePath: '/ONIXMessage[1]/Product[1]',
  message: 'a canonical message',
  ...overrides,
});

describe('onixSourceBridge', () => {
  beforeEach(() => {
    vi.mocked(parse).mockClear();
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-09-11T12:00:00Z') });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('permitsTargetPlanning', () => {
    it('permits only a completed, source-valid result that carries its normalized source', () => {
      expect(permitsTargetPlanning(scripted())).toBe(true);
      expect(permitsTargetPlanning(scripted({ sourceValid: false }))).toBe(false);
      expect(permitsTargetPlanning(scripted({ normalized: null }))).toBe(false);
      expect(permitsTargetPlanning(scripted({ status: 'STOPPED', stop: { stage: 2, text: 'DOCTYPE' }, normalized: null }))).toBe(
        false,
      );
    });
  });

  describe('bridgeOnixSource', () => {
    it('parses exactly the normalized Reference XML, once, and keeps the canonical result beside the adapter value', () => {
      const result = scripted();

      const bridged = bridgeOnixSource(result);

      expect(parse).toHaveBeenCalledExactlyOnceWith(result.normalized?.xml);
      expect(bridged.canonical).toBe(result);
      expect(bridged.adapter).toEqual(raw(result.normalized?.xml as string));
      expect(bridged.provenance.sourcePathOf('/ONIXMessage[1]/Product[1]')).toBe('/ONIXMessage[1]/Product[1]');
    });

    it.each([
      ['a stopped result', scripted({ status: 'STOPPED', stop: { stage: 2, text: 'DOCTYPE' }, normalized: null })],
      ['a source-invalid result', scripted({ sourceValid: false })],
      ['a result without its normalized source', scripted({ normalized: null })],
    ])('refuses to bridge %s, before any adapter parse', (_case, result) => {
      expect(() => bridgeOnixSource(result)).toThrow();
      expect(parse).not.toHaveBeenCalled();
    });
  });

  describe('Reference bridge equivalence', () => {
    it('hands the target adapter exactly what the raw Reference file gave it, occurrence order and facts intact', async () => {
      const result = await canonical(REFERENCE_SOURCE);
      expect(blockingIds(result)).toEqual([]);
      expect(permitsTargetPlanning(result)).toBe(true);

      const { adapter } = bridgeOnixSource(result);

      expect(adapter.ONIXMessage).toEqual(raw(REFERENCE_SOURCE).ONIXMessage);
      const [first, second] = adapter.ONIXMessage.Product as unknown as Record<string, never>[];
      const firstDetail = first.DescriptiveDetail as Record<string, never>;
      expect((first.ProductIdentifier as { IDValue: string }[]).map(({ IDValue }) => IDValue)).toEqual([
        '9780000000002',
        '10.11647/OBP.0001',
      ]);
      expect((firstDetail.Contributor as { KeyNames: string }[]).map(({ KeyNames }) => KeyNames)).toEqual([
        'Babbage',
        'Lovelace',
        'Somerville',
      ]);
      expect(firstDetail.TitleDetail).toEqual({
        TitleType: '01',
        TitleElement: { TitleElementLevel: '01', TitleText: 'Bridges & Borders', Subtitle: 'An Occurrence Study' },
      });
      const text = (first.CollateralDetail as { TextContent: { Text: Record<string, unknown> } }).TextContent.Text;
      expect(text['@_textformat']).toBe('05');
      expect(JSON.stringify(text)).toContain('an entity');
      expect((second.DescriptiveDetail as { TitleDetail: unknown }).TitleDetail).toEqual({
        TitleType: '01',
        TitleElement: { TitleElementLevel: '01', TitleText: 'Second Crossing' },
      });
    });

    it('plans identically from the raw Reference file and from the bridged canonical source', async () => {
      const { adapter } = bridgeOnixSource(await canonical(REFERENCE_SOURCE));

      const fromRaw = await plan(raw(REFERENCE_SOURCE));
      const fromBridge = await plan(adapter);

      expect(fromRaw.status).toBe('success');
      expect(fromRaw.data.plan.works).toHaveLength(2);
      expect(fromBridge).toEqual(fromRaw);
    });
  });

  /**
   * A Reference source may bind the ONIX namespace to a prefix rather than make it the default:
   * `<onix:ONIXMessage xmlns:onix="...reference">` is the same message, in the same namespace, spelled
   * the other way XML allows. Canonical validation is namespace-aware and accepts it, and the
   * normalised XML keeps the source's own prefix because it is part of what was validated.
   * `@5stones/onix` is not namespace-aware - it reads element names - so reconciling the two is the
   * bridge's job, and only the bridge's: the canonical result is never rewritten to suit the adapter.
   */
  describe('namespace-prefixed Reference source', () => {
    const PREFIXED_SOURCE = toPrefixed(REFERENCE_SOURCE);

    it('is valid to canonical validation, which keeps the prefix the convenience adapter cannot read', async () => {
      const result = await canonical(PREFIXED_SOURCE);

      expect(blockingIds(result)).toEqual([]);
      expect(permitsTargetPlanning(result)).toBe(true);
      expect(result.source).toEqual({
        release: '3.0',
        schemaRelease: '3.0.8',
        flavour: 'reference',
        namespaceURI: REFERENCE_NS,
      });
      expect(result.normalized?.xml.startsWith('<onix:ONIXMessage ')).toBe(true);

      // Read as it stands, the canonical representation names the root for a planner that never heard of it.
      const direct = raw(result.normalized?.xml as string) as unknown as Record<string, unknown>;
      expect(Object.keys(direct)).toEqual(['onix:ONIXMessage']);
      expect(direct.ONIXMessage).toBeUndefined();
    });

    it('bridges to the same adapter value and the same plan as its unprefixed twin', async () => {
      const prefixed = bridgeOnixSource(await canonical(PREFIXED_SOURCE));
      const plain = bridgeOnixSource(await canonical(REFERENCE_SOURCE));

      expect(prefixed.adapter.ONIXMessage).toEqual(plain.adapter.ONIXMessage);
      expect(prefixed.adapter.ONIXMessage).toEqual(raw(REFERENCE_SOURCE).ONIXMessage);

      const fromPrefixed = await plan(prefixed.adapter);
      const fromPlain = await plan(plain.adapter);
      expect(fromPlain.status).toBe('success');
      expect(fromPlain.data.plan.works).toHaveLength(2);
      expect(fromPrefixed).toEqual(fromPlain);
    });

    it('leaves the canonical result, its normalized XML and its findings exactly as validation produced them', async () => {
      const result = await canonical(PREFIXED_SOURCE);
      const asValidated = structuredClone(result);

      const bridged = bridgeOnixSource(result);

      expect(bridged.canonical).toBe(result);
      expect(result).toEqual(asValidated);
      expect(result.normalized?.xml).toContain('<onix:ONIXMessage ');
      // Canonical paths never depended on the prefix, so the projected issues are the twin's.
      const plainResult = await canonical(REFERENCE_SOURCE);
      expect(projectOnixSourceIssues(result, t)).toEqual(projectOnixSourceIssues(plainResult, t));
    });

    it('derives the adapter XML with every element left in the namespace it was validated in', async () => {
      const result = await canonical(PREFIXED_SOURCE);
      const adapterXml = toAdapterXml(result.normalized?.xml as string);

      expect(adapterXml).not.toContain('<onix:');
      // Same elements, same namespaces, same order, same attributes, same text - only the spelling differs.
      expect(infoset(adapterXml)).toEqual(infoset(result.normalized?.xml as string));
      expect(infoset(adapterXml)).toEqual(infoset(toAdapterXml((await canonical(REFERENCE_SOURCE)).normalized?.xml as string)));
    });

    it('unprefixes a prefixed element under an unprefixed root, which is the same namespace either way', async () => {
      // Both spellings of the ONIX namespace in one message: the default one, and a prefix bound to it.
      const mixed = REFERENCE_SOURCE.replace(
        `xmlns="${REFERENCE_NS}"`,
        `xmlns="${REFERENCE_NS}" xmlns:onix="${REFERENCE_NS}"`,
      ).replace(
        '<Contributor><SequenceNumber>3</SequenceNumber><ContributorRole>B01</ContributorRole><PersonName>Mary Somerville</PersonName><NamesBeforeKey>Mary</NamesBeforeKey><KeyNames>Somerville</KeyNames></Contributor>',
        '<onix:Contributor><onix:SequenceNumber>3</onix:SequenceNumber><onix:ContributorRole>B01</onix:ContributorRole><onix:PersonName>Mary Somerville</onix:PersonName><onix:NamesBeforeKey>Mary</onix:NamesBeforeKey><onix:KeyNames>Somerville</onix:KeyNames></onix:Contributor>',
      );
      const result = await canonical(mixed);
      expect(blockingIds(result)).toEqual([]);
      expect(result.normalized?.xml).toContain('<onix:Contributor>');

      const { adapter } = bridgeOnixSource(result);

      expect(adapter.ONIXMessage).toEqual(raw(REFERENCE_SOURCE).ONIXMessage);
      expect(await plan(adapter)).toEqual(await plan(raw(REFERENCE_SOURCE)));
    });

    it('hands an already-unprefixed canonical source to the adapter exactly as it stands', async () => {
      const { normalized } = await canonical(REFERENCE_SOURCE);

      expect(toAdapterXml(normalized?.xml as string)).toBe(normalized?.xml);
    });

    it('keeps an element that is in no namespace out of the one it makes the default, and keeps what sits beside the root', () => {
      const xml = `<!--a note--><onix:ONIXMessage xmlns:onix="${REFERENCE_NS}"><onix:Product/><free>x</free></onix:ONIXMessage>`;

      const adapterXml = toAdapterXml(xml);

      expect(adapterXml).toBe(`<!--a note--><ONIXMessage xmlns="${REFERENCE_NS}"><Product/><free xmlns="">x</free></ONIXMessage>`);
      expect(infoset(adapterXml)).toEqual(infoset(xml));
    });

    it('leaves a prefixed document whose root is in no namespace alone', () => {
      // Nothing here is an ONIX message; there is no namespace to make the default, so nothing is derived.
      const xml = '<Root><a:leaf xmlns:a="urn:example">x</a:leaf></Root>';

      expect(toAdapterXml(xml)).toBe(xml);
    });
  });

  describe('Short bridge', () => {
    it('normalizes Short input to the adapter value of its Reference twin, and plans it identically', async () => {
      const short = toShort(REFERENCE_SOURCE);
      expect(short).toContain(`<ONIXmessage release="3.0" xmlns="${SHORT_NS}">`);
      const result = await canonical(short);
      expect(result.source?.flavour).toBe('short');
      expect(blockingIds(result)).toEqual([]);

      const bridged = bridgeOnixSource(result);

      expect(bridged.adapter.ONIXMessage).toEqual(raw(REFERENCE_SOURCE).ONIXMessage);
      expect(await plan(bridged.adapter)).toEqual(await plan(raw(REFERENCE_SOURCE)));
    });

    it('retains the original Short tags and paths beside the Reference convenience parse', async () => {
      const bridged = bridgeOnixSource(await canonical(toShort(REFERENCE_SOURCE)));

      expect(bridged.canonical.normalized.provenance).toMatchObject({ kind: 'RENAMED', flavour: 'short' });
      const keyNames = '/ONIXMessage[1]/Product[1]/DescriptiveDetail[1]/Contributor[2]/KeyNames[1]';
      const shortKeyNames = tagMap.referenceToShort.get('KeyNames');
      expect(bridged.provenance.sourceTagOf(keyNames)).toBe(shortKeyNames);
      expect(bridged.provenance.sourcePathOf(keyNames)).toBe(
        `/ONIXmessage[1]/product[1]/${tagMap.referenceToShort.get('DescriptiveDetail')}[1]/` +
          `${tagMap.referenceToShort.get('Contributor')}[2]/${shortKeyNames}[1]`,
      );
    });

    it('projects a Short finding with its original Short path beside the canonical path', async () => {
      const result = await canonical(toShort(languageRoleInvalid()));
      expect(permitsTargetPlanning(result)).toBe(false);

      const issue = projectOnixSourceIssues(result, t).find(
        ({ sourceValidation }) => sourceValidation?.kind === 'finding' && sourceValidation.finding.id === '_20171218_f_2',
      );

      const evidence = issue?.sourceValidation?.kind === 'finding' ? issue.sourceValidation.finding : null;
      expect(issue?.severity).toBe('error');
      expect(evidence?.sourcePath).toMatch(/^\/ONIXmessage\[1\]\/product\[1\]\//);
      expect(evidence?.path).toMatch(/^\/ONIXMessage\[1\]\/Product\[1\]\/DescriptiveDetail\[1\]/);
      expect(issue?.message).toContain(evidence?.sourcePath);
      expect(issue?.message).toContain(evidence?.path);
    });
  });

  describe('character references', () => {
    it('decodes a decimal character reference as XML does, where the legacy raw parse turned it into a space', async () => {
      const source = REFERENCE_SOURCE.replace('An Occurrence Study', 'An&#160;Occurrence Study');
      const { adapter } = bridgeOnixSource(await canonical(source));

      const subtitle = (adapter.ONIXMessage.Product as unknown as { DescriptiveDetail: { TitleDetail: { TitleElement: { Subtitle: string } } } }[])[0]
        .DescriptiveDetail.TitleDetail.TitleElement.Subtitle;
      expect(subtitle).toBe('An Occurrence Study');
      // The legacy path parsed the raw text, where fast-xml-parser mis-decodes decimal `&#160;` to U+0020.
      const legacy = (raw(source).ONIXMessage.Product as unknown as { DescriptiveDetail: { TitleDetail: { TitleElement: { Subtitle: string } } } }[])[0]
        .DescriptiveDetail.TitleDetail.TitleElement.Subtitle;
      expect(legacy).toBe('An Occurrence Study');
    });
  });

  describe('approved recovery', () => {
    // The second Product gains a TextContent without its required Text: the approved OMIT_INVALID_COMPOSITE case.
    const RECOVERABLE_SOURCE = REFERENCE_SOURCE.replace(
      '</DescriptiveDetail>\n<PublishingDetail>',
      '</DescriptiveDetail>\n<CollateralDetail><TextContent><TextType>03</TextType><ContentAudience>00</ContentAudience>' +
        '</TextContent></CollateralDetail>\n<PublishingDetail>',
    );

    it('hands the adapter the recovered source only and keeps the recovery visible as warnings', async () => {
      const result = await canonical(RECOVERABLE_SOURCE);
      expect(blockingIds(result)).toEqual([]);
      expect(permitsTargetPlanning(result)).toBe(true);
      const marker = {
        recovery: 'OMIT_INVALID_COMPOSITE',
        removed: '/ONIXMessage[1]/Product[2]/CollateralDetail[1]/TextContent[1]',
        taintSite: '/ONIXMessage[1]/Product[2]/CollateralDetail[1]',
      };
      expect(result.normalized?.recoveries).toEqual([marker]);

      const { adapter, canonical: kept } = bridgeOnixSource(result);
      const issues = projectOnixSourceIssues(kept, t);

      const [first, second] = adapter.ONIXMessage.Product as unknown as Record<string, unknown>[];
      expect(JSON.stringify(first)).toContain('TextContent');
      expect(JSON.stringify(second)).not.toContain('TextContent');
      expect(issues.every(({ severity }) => severity === 'warning')).toBe(true);
      expect(issues).toContainEqual(
        expect.objectContaining({ code: 'onix.source.recovered', sourceValidation: { kind: 'recovery', recovery: marker } }),
      );
      expect(issues).toContainEqual(
        expect.objectContaining({
          severity: 'warning',
          code: 'onix.source.validity',
          sourceValidation: {
            kind: 'finding',
            finding: expect.objectContaining({ recoverability: 'OMIT_INVALID_COMPOSITE', class: 'SOURCE_INVALID', counts: false }),
          },
        }),
      );
    });

    it('never lets a recovery make an otherwise blocked source plannable', async () => {
      const result = await canonical(readFileSync(join(FIXTURES, 'taint30', 'T1_empty_textcontent_recovery.xml'), 'utf8'));

      const issues = projectOnixSourceIssues(result, t);

      expect(result.normalized?.recoveries).toHaveLength(1);
      expect(permitsTargetPlanning(result)).toBe(false);
      expect(() => bridgeOnixSource(result)).toThrow();
      expect(issues.filter(({ severity }) => severity === 'error')).toHaveLength(result.summary.blocking);
      expect(issues).toContainEqual(expect.objectContaining({ severity: 'warning', code: 'onix.source.recovered' }));
    });
  });

  describe('post-conformance recoveries (thoth#923)', () => {
    const HYPHENATED_ISNI = '0000-0001-2161-2573';
    const CANONICAL_ISNI = '0000000121612573';
    const withIsni = (source: string, values: readonly string[]) => {
      let product = 0;
      return source.replace(/<Publisher><PublishingRole>01<\/PublishingRole>/g, (match) => {
        const value = values[product++];
        return `${match}<PublisherIdentifier><PublisherIDType>16</PublisherIDType><IDValue>${value}</IDValue></PublisherIdentifier>`;
      });
    };
    const withCategory = (source: string) =>
      source.replace(
        '<SubjectCode>HIS000000</SubjectCode></Subject>',
        '<SubjectCode>HIS000000</SubjectCode></Subject><Subject><SubjectSchemeIdentifier>23</SubjectSchemeIdentifier><SubjectHeadingText> Press history </SubjectHeadingText></Subject>',
      );
    const RECOVERED_SOURCE = withCategory(withIsni(REFERENCE_SOURCE, [HYPHENATED_ISNI, '0000 0001 2161 2573']));
    const PUBLISHER_IDENTIFIER = (product: number) =>
      `/ONIXMessage[1]/Product[${product}]/PublishingDetail[1]/Publisher[1]/PublisherIdentifier[1]`;
    const CATEGORY = '/ONIXMessage[1]/Product[1]/DescriptiveDetail[1]/Subject[2]';

    it('plans from the canonicalised source and keeps every recovered finding and marker visible as warnings', async () => {
      const result = await canonical(RECOVERED_SOURCE);
      expect(blockingIds(result)).toEqual([]);
      expect(permitsTargetPlanning(result)).toBe(true);
      expect(result.normalized?.recoveries).toEqual([
        {
          recovery: 'PUBLISHER_CATEGORY_TO_CUSTOM',
          rule: '_20171218_a_2',
          path: CATEGORY,
          scheme: { element: 'SubjectSchemeIdentifier', code: '23' },
          valueSource: 'SubjectHeadingText',
          valuePath: `${CATEGORY}/SubjectHeadingText[1]`,
          value: 'Press history',
        },
        {
          recovery: 'NORMALIZE_IDENTIFIER_LEXICAL_FORM',
          rule: '_20171126_b_42',
          path: PUBLISHER_IDENTIFIER(1),
          valuePath: `${PUBLISHER_IDENTIFIER(1)}/IDValue[1]`,
          scheme: { element: 'PublisherIDType', code: '16' },
          original: HYPHENATED_ISNI,
          canonical: CANONICAL_ISNI,
        },
        expect.objectContaining({
          path: PUBLISHER_IDENTIFIER(2),
          original: '0000 0001 2161 2573',
          canonical: CANONICAL_ISNI,
        }),
      ]);

      const { adapter, canonical: kept } = bridgeOnixSource(result);
      const issues = projectOnixSourceIssues(kept, t);

      expect(parse).toHaveBeenCalledExactlyOnceWith(result.normalized?.xml);
      expect(kept).toBe(result);
      const products = adapter.ONIXMessage.Product as unknown as Record<string, unknown>[];
      expect(products.map((p) => JSON.stringify(p).includes(`"IDValue":"${CANONICAL_ISNI}"`))).toEqual([true, true]);
      expect(JSON.stringify(adapter)).not.toContain('0001-2161');
      expect(JSON.stringify(adapter)).not.toContain('0001 2161');
      expect(result.normalized?.xml).not.toContain('SubjectSchemeName');

      expect(issues.every(({ severity }) => severity === 'warning')).toBe(true);
      const recovered = issues.filter(({ code }) => code === 'onix.source.recovered');
      expect(recovered.map(({ source, sourceValidation }) => [source, sourceValidation])).toEqual(
        (result.normalized?.recoveries ?? []).map((recovery, i) => [
          { kind: 'onix', productIndex: i === 2 ? 2 : 1 },
          { kind: 'recovery', recovery },
        ]),
      );
      expect(recovered[0].message).toContain('onixValidation.issue.recoveredCategory');
      expect(recovered[0].message).toContain('Press history');
      expect(recovered[0].message).toContain(CATEGORY);
      expect(recovered[1].message).toContain('onixValidation.issue.recoveredIdentifier');
      expect(recovered[1].message).toContain(HYPHENATED_ISNI);
      expect(recovered[1].message).toContain(CANONICAL_ISNI);
      expect(recovered.map(({ message }) => message).join()).not.toContain('onixValidation.issue.recovered ');
      const findingIssue = (id: string) =>
        issues.filter(
          ({ sourceValidation }) => sourceValidation?.kind === 'finding' && sourceValidation.finding.id === id,
        );
      expect(findingIssue('_20171218_a_2').map(({ message }) => message)).toEqual([
        expect.stringContaining('onixValidation.disposition.PUBLISHER_CATEGORY_TO_CUSTOM'),
      ]);
      expect(findingIssue('_20171126_b_42').map(({ message }) => message)).toEqual([
        expect.stringContaining('onixValidation.disposition.NORMALIZE_IDENTIFIER_LEXICAL_FORM'),
        expect.stringContaining('onixValidation.disposition.NORMALIZE_IDENTIFIER_LEXICAL_FORM'),
      ]);
    });

    it('refuses a source in which any counting finding remains beside its recoveries, before any adapter parse', async () => {
      const result = await canonical(
        withCategory(withIsni(REFERENCE_SOURCE, [HYPHENATED_ISNI, '0000-0001-2161-2574'])),
      );
      const issues = projectOnixSourceIssues(result, t);

      expect(blockingIds(result)).toEqual([`_20171126_b_42 ${PUBLISHER_IDENTIFIER(2)}`]);
      expect(result.normalized?.recoveries.map(({ recovery }) => recovery)).toEqual([
        'PUBLISHER_CATEGORY_TO_CUSTOM',
        'NORMALIZE_IDENTIFIER_LEXICAL_FORM',
      ]);
      expect(permitsTargetPlanning(result)).toBe(false);
      expect(() => bridgeOnixSource(result)).toThrow();
      expect(parse).not.toHaveBeenCalled();
      expect(issues.filter(({ severity }) => severity === 'error')).toEqual([
        expect.objectContaining({ code: 'onix.source.validity', source: { kind: 'onix', productIndex: 2 } }),
      ]);
      expect(
        issues.filter(({ code }) => code === 'onix.source.recovered').every(({ severity }) => severity === 'warning'),
      ).toBe(true);
    });

    it('locates a recovery in a Short source by its original Short path', async () => {
      const result = await canonical(toShort(RECOVERED_SOURCE));
      expect(permitsTargetPlanning(result)).toBe(true);
      const recovered = projectOnixSourceIssues(result, t).filter(({ code }) => code === 'onix.source.recovered');
      expect(recovered.map(({ message }) => message)).toEqual([
        expect.stringContaining('onixValidation.issue.locationShort'),
        expect.stringContaining('onixValidation.issue.locationShort'),
        expect.stringContaining('onixValidation.issue.locationShort'),
      ]);
      expect(recovered[0].message).toContain('/ONIXmessage[1]/product[1]/descriptivedetail[1]/subject[2]');
    });

    it('permits a fully recovered result and refuses one whose ledger still counts, whatever it claims', () => {
      const recoveredFinding = finding({
        id: '_20171126_b_42',
        recoverability: 'NORMALIZE_IDENTIFIER_LEXICAL_FORM',
        counts: false,
      });
      const categoryFinding = finding({
        id: '_20171218_a_2',
        recoverability: 'PUBLISHER_CATEGORY_TO_CUSTOM',
        counts: false,
      });
      const recovered = scripted({
        findings: [recoveredFinding, categoryFinding],
        summary: { total: 2, blocking: 0, secondary: 0, notEvaluable: 0, recovered: 2 },
      });
      expect(permitsTargetPlanning(recovered)).toBe(true);
      expect(() => bridgeOnixSource(recovered)).not.toThrow();

      vi.mocked(parse).mockClear();
      const inconsistent = scripted({ findings: [recoveredFinding, finding()], sourceValid: true });
      expect(permitsTargetPlanning(inconsistent)).toBe(false);
      expect(() => bridgeOnixSource(inconsistent)).toThrow();
      expect(parse).not.toHaveBeenCalled();
    });
  });

  describe('omitted composite with a surviving sibling (thoth-app#231)', () => {
    // The first Product gains a malformed TextContent before its abstract: the abstract, uploaded as TextContent[2],
    // survives the approved omission at canonical TextContent[1] - the canonical path the recovery marker names.
    const MOVED_SOURCE = REFERENCE_SOURCE.replace(
      '<CollateralDetail>\n<TextContent>',
      '<CollateralDetail>\n<TextContent><TextType>03</TextType><ContentAudience>00</ContentAudience></TextContent><TextContent>',
    );
    // A third, invalid TextContent after the survivor makes the same source unplannable.
    const MOVED_BLOCKED_SOURCE = MOVED_SOURCE.replace(
      '</TextContent>\n</CollateralDetail>',
      '</TextContent><TextContent><TextType>02</TextType><ContentAudience>00</ContentAudience>' +
        '<Text textformat="07">caf\u00e9</Text></TextContent>\n</CollateralDetail>',
    );
    const COLLATERAL = '/ONIXMessage[1]/Product[1]/CollateralDetail[1]';
    const REMOVED = `${COLLATERAL}/TextContent[1]`;
    const shortCollateral = `/ONIXmessage[1]/product[1]/${tagMap.referenceToShort.get('CollateralDetail')}[1]`;
    const shortTextContent = tagMap.referenceToShort.get('TextContent');
    const flavours = [
      ['Reference', (xml: string) => xml, `${COLLATERAL}/TextContent`, 'Text'],
      ['Short', toShort, `${shortCollateral}/${shortTextContent}`, tagMap.referenceToShort.get('Text')],
    ] as const;
    const recoveredIssues = (result: OnixWorkerResult) =>
      projectOnixSourceIssues(result, t).filter(({ code }) => code === 'onix.source.recovered');

    it.each(flavours)(
      '%s: bridges with the survivor at its uploaded occurrence, through the unchanged gate',
      async (_label, flavour, sourceTextContent, sourceText) => {
        const result = await canonical(flavour(MOVED_SOURCE));
        expect(blockingIds(result)).toEqual([]);
        expect(permitsTargetPlanning(result)).toBe(true);

        const bridged = bridgeOnixSource(result);

        expect(bridged.canonical).toBe(result);
        expect(bridged.provenance.sourcePathOf(REMOVED)).toBe(`${sourceTextContent}[2]`);
        expect(bridged.provenance.sourcePathOf(`${REMOVED}/Text[1]/p[2]`)).toBe(
          `${sourceTextContent}[2]/${sourceText}[1]/p[2]`,
        );
        expect(parse).toHaveBeenCalledExactlyOnceWith(result.normalized?.xml);
        expect(bridged.adapter.ONIXMessage).toEqual(raw(REFERENCE_SOURCE).ONIXMessage);
      },
    );

    it.each(flavours)(
      '%s: still refuses the source when a finding inside a moved survivor counts, and locates that finding truthfully',
      async (label, flavour, sourceTextContent, sourceText) => {
        const result = await canonical(flavour(MOVED_BLOCKED_SOURCE));
        expect(blockingIds(result)).toEqual([`_20180517_a_25 ${COLLATERAL}/TextContent[2]/Text[1]`]);
        expect(permitsTargetPlanning(result)).toBe(false);
        expect(() => bridgeOnixSource(result)).toThrow();
        expect(parse).not.toHaveBeenCalled();

        const invalid = result.findings.find(({ counts }) => counts);
        expect(invalid?.sourcePath).toBe(label === 'Short' ? `${sourceTextContent}[3]/${sourceText}[1]` : undefined);
        const issue = projectOnixSourceIssues(result, t).find(({ severity }) => severity === 'error');
        expect(issue?.message).toContain(
          label === 'Short'
            ? JSON.stringify(
                t('onixValidation.issue.locationShort', {
                  sourcePath: `${sourceTextContent}[3]/${sourceText}[1]`,
                  path: `${COLLATERAL}/TextContent[2]/Text[1]`,
                }),
              )
            : JSON.stringify(t('onixValidation.issue.location', { path: `${COLLATERAL}/TextContent[2]/Text[1]` })),
        );
      },
    );

    it('Reference: locates the omitted composite at its canonical path alone, never at the survivor now there', async () => {
      const result = await canonical(MOVED_SOURCE);
      const survivor = `${COLLATERAL}/TextContent[2]`;
      expect(result.normalized?.recoveries).toEqual([
        { recovery: 'OMIT_INVALID_COMPOSITE', removed: REMOVED, taintSite: COLLATERAL },
      ]);
      // The recovered tree's provenance of that canonical path is the survivor's uploaded occurrence.
      expect(createProvenanceResolver(result.normalized!.provenance).sourcePathOf(REMOVED)).toBe(survivor);

      const [issue] = recoveredIssues(result);

      expect(issue.message).toBe(
        t('onixValidation.issue.recovered', {
          location: t('onixValidation.issue.location', { path: REMOVED }),
          recovery: 'OMIT_INVALID_COMPOSITE',
        }),
      );
      expect(issue.message).not.toContain(survivor);
      expect(issue.source).toEqual({ kind: 'onix', productIndex: 1 });
      expect(issue.sourceValidation).toEqual({ kind: 'recovery', recovery: result.normalized?.recoveries[0] });
    });

    it("Short: locates the omitted composite at its recovered finding's full uploaded Short path", async () => {
      const result = await canonical(toShort(MOVED_SOURCE));
      const omitted = `${shortCollateral}/${shortTextContent}[1]`;
      const survivor = `${shortCollateral}/${shortTextContent}[2]`;
      expect(createProvenanceResolver(result.normalized!.provenance).sourcePathOf(REMOVED)).toBe(survivor);
      const recoveredFinding = result.findings.filter(
        ({ recoverability }) => recoverability === 'OMIT_INVALID_COMPOSITE',
      );
      expect(recoveredFinding).toEqual([
        expect.objectContaining({ id: 'ORDINARY_XSD_INVALID', path: REMOVED, sourcePath: omitted }),
      ]);

      const [issue] = recoveredIssues(result);

      expect(issue.message).toBe(
        t('onixValidation.issue.recovered', {
          location: t('onixValidation.issue.locationShort', { sourcePath: omitted, path: REMOVED }),
          recovery: 'OMIT_INVALID_COMPOSITE',
        }),
      );
      expect(issue.message).not.toContain(survivor);
      // The recovered finding's own issue names the same uploaded occurrence.
      const findingIssue = projectOnixSourceIssues(result, t).find(
        ({ sourceValidation }) =>
          sourceValidation?.kind === 'finding' && sourceValidation.finding === recoveredFinding[0],
      );
      expect(findingIssue?.message).toContain(
        JSON.stringify(t('onixValidation.issue.locationShort', { sourcePath: omitted, path: REMOVED })),
      );
    });

    describe('with a scripted ledger', () => {
      // A sidecar in which the omitted composite's canonical path belongs to a survivor uploaded elsewhere.
      const SURVIVOR = '/uploaded/survivor[2]';
      const omission: RecoveryMarker = { recovery: 'OMIT_INVALID_COMPOSITE', removed: REMOVED, taintSite: COLLATERAL };
      const recoveredFinding = finding({
        id: 'ORDINARY_XSD_INVALID',
        tier: 'CANONICAL_ORDINARY',
        stage: 5,
        class: 'SOURCE_INVALID',
        recoverability: 'OMIT_INVALID_COMPOSITE',
        counts: false,
        path: REMOVED,
        sourcePath: undefined,
      });
      const recoveryPathOf = (recovery: RecoveryMarker) =>
        recovery.recovery === 'OMIT_INVALID_COMPOSITE' ? recovery.removed : recovery.path;
      const withRecovery = (recovery: RecoveryMarker, findings: SourceFinding[], sourcePath = SURVIVOR) =>
        scripted({
          findings,
          normalized: {
            ...scripted().normalized!,
            recoveries: [recovery],
            provenance: {
              kind: 'REPOSITIONED',
              flavour: 'reference',
              exceptions: [{ path: recoveryPathOf(recovery), sourcePath, sourceTag: 'TextContent' }],
            },
          },
        });
      const canonicalOnly = t('onixValidation.issue.recovered', {
        location: t('onixValidation.issue.location', { path: REMOVED }),
        recovery: 'OMIT_INVALID_COMPOSITE',
      });

      it.each([
        ['its recovered finding records no source path (Reference)', [recoveredFinding]],
        ['no recovered finding is in the ledger', []],
        [
          'the finding at that path has another id',
          [{ ...recoveredFinding, id: 'SOURCE_FLAVOUR_XSD_INVALID', sourcePath: '/other' }],
        ],
        [
          'the finding at that path was not recovered',
          [{ ...recoveredFinding, recoverability: 'NOT_RECOVERABLE' as const, sourcePath: '/other' }],
        ],
        [
          'the recovered finding is at another path',
          [{ ...recoveredFinding, path: `${COLLATERAL}/TextContent[2]`, sourcePath: '/other' }],
        ],
        [
          'two recovered findings match',
          [
            { ...recoveredFinding, sourcePath: '/one' },
            { ...recoveredFinding, sourcePath: '/two' },
          ],
        ],
      ])('shows the omitted composite at its canonical path alone when %s, never the survivor', (_label, findings) => {
        const [issue] = recoveredIssues(withRecovery(omission, findings));

        expect(issue.message).toBe(canonicalOnly);
        expect(issue.message).not.toContain(SURVIVOR);
      });

      it('uses the source path its one matching recovered finding records, never the survivor', () => {
        const [issue] = recoveredIssues(
          withRecovery(omission, [{ ...recoveredFinding, sourcePath: '/uploaded/omitted[1]' }]),
        );

        expect(issue.message).toBe(
          t('onixValidation.issue.recovered', {
            location: t('onixValidation.issue.locationShort', { sourcePath: '/uploaded/omitted[1]', path: REMOVED }),
            recovery: 'OMIT_INVALID_COMPOSITE',
          }),
        );
      });

      it('still locates a post-conformance recovery through the provenance of the composite it kept', () => {
        const subject = '/ONIXMessage[1]/Product[1]/DescriptiveDetail[1]/Subject[1]';
        const category: RecoveryMarker = {
          recovery: 'PUBLISHER_CATEGORY_TO_CUSTOM',
          rule: '_20171218_a_2',
          path: subject,
          scheme: { element: 'SubjectSchemeIdentifier', code: '23' },
          valueSource: 'SubjectCode',
          valuePath: `${subject}/SubjectCode[1]`,
          value: 'C',
        };

        const [issue] = recoveredIssues(withRecovery(category, [], '/uploaded/subject[1]'));

        expect(issue.message).toBe(
          t('onixValidation.issue.recoveredCategory', {
            location: t('onixValidation.issue.locationShort', { sourcePath: '/uploaded/subject[1]', path: subject }),
            recovery: 'PUBLISHER_CATEGORY_TO_CUSTOM',
            value: 'C',
            valueSource: 'SubjectCode',
          }),
        );
      });
    });
  });

  describe('projectOnixSourceIssues', () => {
    it('blocks the same-key LanguageRole 01 + 02 source with its canonical finding', async () => {
      const result = await canonical(languageRoleInvalid());

      const issues = projectOnixSourceIssues(result, t);

      expect(permitsTargetPlanning(result)).toBe(false);
      expect(issues).toHaveLength(result.findings.length + (result.normalized?.recoveries.length ?? 0));
      expect(issues).toContainEqual(
        expect.objectContaining({
          severity: 'error',
          code: 'onix.source.validity',
          sourceValidation: {
            kind: 'finding',
            finding: expect.objectContaining({ id: '_20171218_f_2', class: 'NORMATIVE_INVALID', counts: true }),
          },
        }),
      );
    });

    it('keeps a stage-2 DOCTYPE stop as SECURITY and an unsupported release as SUPPORT', async () => {
      const doctype = projectOnixSourceIssues(
        await canonical(readFileSync(join(FIXTURES, 'dtd_suite30', 'D1_bare_doctype.xml'), 'utf8')),
        t,
      );
      const unsupported = projectOnixSourceIssues(await canonical('<ONIXMessage release="2.1"><Header/></ONIXMessage>'), t);

      expect(doctype.map(({ severity, code }) => [severity, code])).toEqual([['error', 'onix.source.security']]);
      expect(unsupported.map(({ severity, code }) => [severity, code])).toEqual([['error', 'onix.source.support']]);
      expect(doctype[0].message).toContain('onixValidation.issue.SECURITY');
      expect(unsupported[0].message).toContain('onixValidation.issue.SUPPORT');
    });

    it('keeps SECONDARY and NOT_EVALUABLE dispositions, and only a counting finding blocks', () => {
      const findings = [
        finding(),
        finding({ id: 'R-SECONDARY', projection: 'SECONDARY', counts: false }),
        finding({ id: 'R-NE', class: 'RULE_NOT_EVALUABLE', blocking: false, projection: 'NOT_EVALUABLE', counts: false }),
        finding({ id: 'R-ADV', class: 'ADVISORY', blocking: false, counts: false }),
      ];
      const issues = projectOnixSourceIssues(scripted({ findings, sourceValid: false }), t);

      expect(issues.map(({ severity }) => severity)).toEqual(['error', 'warning', 'warning', 'warning']);
      expect(issues.map(({ sourceValidation }) => sourceValidation)).toEqual(
        findings.map((f) => ({ kind: 'finding', finding: f })),
      );
      expect(issues[1].message).toContain('onixValidation.disposition.SECONDARY');
      expect(issues[2].message).toContain('onixValidation.disposition.NOT_EVALUABLE');
      expect(issues.every(({ source }) => source.kind === 'file' || source.kind === 'onix')).toBe(true);
    });
  });

  describe('projectOnixRefusal', () => {
    const refusal = (overrides: Partial<EnvelopeEvidence>): EnvelopeEvidence => ({
      engine: 'chromium',
      bytes: 1_000,
      products: { measured: false, reason: 'ENGINE_UNSUPPORTED' },
      verdict: 'UNSUPPORTED',
      limits: null,
      exceeded: [],
      ...overrides,
    });

    it.each([
      ['mobile', refusal({ engine: 'mobile' }), 'onixValidation.support.mobile'],
      ['webkit', refusal({ engine: 'webkit' }), 'onixValidation.support.webkit'],
      ['unknown', refusal({ engine: 'unknown' }), 'onixValidation.support.unknown'],
      [
        'too large',
        refusal({
          engine: 'gecko',
          bytes: 21_000_000,
          products: { measured: false, reason: 'BYTE_CEILING_EXCEEDED' },
          verdict: 'REFUSE',
          limits: ENGINE_ENVELOPES.gecko,
          exceeded: ['bytes'],
        }),
        'onixValidation.support.tooLarge',
      ],
    ])('projects a %s refusal as one SUPPORT outcome with its evidence, never as source invalidity', (_case, envelope, key) => {
      const issues: ImportIssue[] = projectOnixRefusal(envelope, t);

      expect(issues).toEqual([
        { severity: 'error', code: 'onix.source.support', message: expect.stringContaining(key), source: { kind: 'file' }, sourceValidation: { kind: 'support', envelope } },
      ]);
    });
  });

  describe('projectOnixUnavailable', () => {
    it('projects a runtime failure as unavailable validation, never as source invalidity', () => {
      expect(projectOnixUnavailable({ code: 'WORKER_FAILED', message: 'blocked by policy' }, t)).toEqual([
        {
          severity: 'error',
          code: 'onix.source.unavailable',
          message: expect.stringContaining('blocked by policy'),
          source: { kind: 'file' },
          sourceValidation: { kind: 'unavailable', code: 'WORKER_FAILED', message: 'blocked by policy' },
        },
      ]);
    });
  });
});
