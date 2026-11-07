// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse } from '@5stones/onix/dist/parse';
import type { Element } from 'slimdom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import type { ContributorService } from '@/src/entities/contributor';
import type { InstitutionService } from '@/src/entities/institution';
import type { WorkEntity } from '@/src/entities/work/model/work.types';

import { currencyOptions, languageOptions, licenseOptions } from '../../constants';
import { PublicationType } from '../../constants/publications';
import { WorkTypes } from '../../constants/work';
import type { ImportIdentifier, ImportIssue } from '../../types';
import { importIdentifierKey } from '../../utils/importPreflight/identifiers';
import { getDefaultPublication } from '../../utils/publications';
import { getDefaultTitle, getDefaultWork } from '../../utils/work';
import { runOnixPlanning } from './__regression__/pipeline';
import type { ExtendedONIXMessageRoot } from './interfaces';
import { reduceOnixAccessibility } from './onixAccessibility';
import { reduceOnixCollateral } from './onixCollateral';
import { reduceOnixCommercial } from './onixCommercial';
import { reduceOnixComponents } from './onixComponents';
import { reduceOnixDescriptive } from './onixDescriptive';
import { planOnixSource } from './onixPlanning';
import {
  type OnixRelatedMaterialLookup,
  onixRelatedMaterialLookupIdentifiers,
  reduceOnixRelatedMaterial,
  resolveOnixRelatedMaterialTargets,
} from './onixRelations';
import { reduceOnixReviewsPrizes } from './onixReviewsPrizes';
import { reduceOnixRights } from './onixRights';
import { reduceOnixSalesRights } from './onixSalesRights';
import {
  attributeCountingFindings,
  bridgeAttributedOnixSource,
  bridgeOnixSource,
  createPublisherFixContext,
  EDITION_STATEMENT_RULE,
  measureShortDescription,
  partitionOnixSourcePlan,
  permitsTargetPlanning,
  productIndexOfPath,
  projectOnixRefusal,
  projectOnixSourceIssues,
  projectOnixUnavailable,
  type PublisherFix,
  publisherFixEligibility,
  type PublisherFixOutcome,
  publisherFixProvenance,
  type PublisherSuppliedValueMarker,
  revalidatePublisherFix,
  SHORT_DESCRIPTION_LENGTH_RULE,
  startPublisherFixSession,
  toAdapterXml,
} from './onixSourceBridge';
import {
  adaptableGroupKeys,
  EMPTY_ONIX_PLAN_INPUTS,
  heldBackGroupsOf,
  type OnixTargetLookup,
  resolveOnixImportPlan,
  resolveOnixTargets,
} from './onixTargetResolution';
import {
  createOnixSourceValidator,
  createProvenanceResolver,
  ENGINE_ENVELOPES,
  type EnvelopeEvidence,
  type OnixSourceValidator,
  type OnixWorkerResult,
  type Recoverability,
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

  describe('ORCID lexical compatibility recovery (thoth#923, thoth-app#240)', () => {
    const ORCID = '0000-0002-1825-0097';
    const ORCID_BARE = '0000000218250097';
    const PROPRIETARY = '0000000304327134';
    const NAME_IDENTIFIER = (product: number) =>
      `/ONIXMessage[1]/Product[${product}]/DescriptiveDetail[1]/Contributor[1]/NameIdentifier[2]`;
    const CONFLICTS = [
      'CONTRIBUTOR_ORCID_CONFLICT',
      'CONTRIBUTOR_ORCID_INVALID',
      'CONTRIBUTOR_GROUP_CONFLICT',
      'CONTRIBUTOR_DUPLICATE_IDENTITY',
    ];

    /** One Product of a two-manifestation Work whose one contributor states a proprietary id before its ORCID. */
    const manifestation = (isbn: string, form: string, orcid: string, orcidType = '21') =>
      `<Product><RecordReference>bridge.${isbn}</RecordReference><NotificationType>03</NotificationType>` +
      `<ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>${isbn}</IDValue></ProductIdentifier>` +
      `<DescriptiveDetail><ProductComposition>00</ProductComposition>${form}` +
      '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText>Identity</TitleText></TitleElement></TitleDetail>' +
      '<Contributor><SequenceNumber>1</SequenceNumber><ContributorRole>A01</ContributorRole>' +
      `<NameIdentifier><NameIDType>01</NameIDType><IDTypeName>Bridge Press author</IDTypeName><IDValue>${PROPRIETARY}</IDValue></NameIdentifier>` +
      `<NameIdentifier><NameIDType>${orcidType}</NameIDType>${orcidType === '01' ? '<IDTypeName>Resolver</IDTypeName>' : ''}<IDValue>${orcid}</IDValue></NameIdentifier>` +
      '<PersonName>Ada Lovelace</PersonName><NamesBeforeKey>Ada</NamesBeforeKey><KeyNames>Lovelace</KeyNames></Contributor>' +
      '<Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language></DescriptiveDetail>' +
      '<PublishingDetail><Imprint><ImprintName>Bridge Imprint</ImprintName></Imprint><PublishingStatus>04</PublishingStatus>' +
      '<PublishingDate><PublishingDateRole>01</PublishingDateRole><Date>20260101</Date></PublishingDate></PublishingDetail>' +
      '<RelatedMaterial><RelatedWork><WorkRelationCode>01</WorkRelationCode><WorkIdentifier><WorkIDType>06</WorkIDType>' +
      '<IDValue>10.5555/bridge.orcid</IDValue></WorkIdentifier></RelatedWork></RelatedMaterial></Product>';
    const groupedWork = (paperback: string, pdf: string, orcidType = '21') =>
      `<?xml version="1.0" encoding="UTF-8"?><ONIXMessage release="3.0" xmlns="${REFERENCE_NS}">` +
      '<Header><Sender><SenderName>Bridge Press</SenderName></Sender><SentDateTime>20260929T1200</SentDateTime></Header>' +
      manifestation('9780000000002', '<ProductForm>BC</ProductForm>', paperback, orcidType) +
      manifestation(
        '9780000000019',
        '<ProductForm>EB</ProductForm><ProductFormDetail>E107</ProductFormDetail>',
        pdf,
        orcidType,
      ) +
      '</ONIXMessage>';

    /** The planned Work of a bridged source once the publisher has taken the one decision it needs, its WorkType. */
    const plannedWork = async (result: OnixWorkerResult) => {
      const run = await runOnixPlanning(bridgeOnixSource(result), {
        imprints: IMPRINTS,
        inputs: { fileWorkType: WorkTypes.enum.Monograph },
      });
      const findings = run.resolution?.sidecar.findings ?? [];
      return {
        works: run.resolution?.plan?.works ?? [],
        conflicts: findings.filter(({ code }) => CONFLICTS.includes(code)).map(({ code }) => code),
        unrepresentedIdentifiers: findings
          .filter(({ code }) => code === 'CONTRIBUTOR_IDENTIFIER_UNREPRESENTABLE')
          .map(({ detail }) => detail),
      };
    };

    it.each([
      ['canonical hyphenated', ORCID],
      ['HTTPS resolver', `https://orcid.org/${ORCID}`],
      ['HTTPS resolver, bare', `https://orcid.org/${ORCID_BARE}`],
      ['scheme-less resolver', `orcid.org/${ORCID}`],
      ['scheme-less resolver, bare', `orcid.org/${ORCID_BARE}`],
    ])(
      'recovers a %s ORCID beside a bare one, projects it truthfully, and plans one canonical contributor identity',
      async (_label, spelling) => {
        const result = await canonical(groupedWork(ORCID_BARE, spelling));

        expect(blockingIds(result)).toEqual([]);
        expect(permitsTargetPlanning(result)).toBe(true);
        expect(result.normalized?.recoveries).toEqual([
          {
            recovery: 'NORMALIZE_ORCID_LEXICAL_FORM',
            rule: '_20171126_b_32',
            path: NAME_IDENTIFIER(2),
            valuePath: `${NAME_IDENTIFIER(2)}/IDValue[1]`,
            scheme: { element: 'NameIDType', code: '21' },
            original: spelling,
            canonical: ORCID_BARE,
          },
        ]);
        // The bridge hands the target side the bare standards-compatible ORCID, twice, and never the supplied spelling.
        expect(result.normalized?.xml.split(`<IDValue>${ORCID_BARE}</IDValue>`)).toHaveLength(3);
        expect(result.normalized?.xml).not.toContain(`<IDValue>${spelling}</IDValue>`);
        expect(result.normalized?.xml.split(`<IDValue>${PROPRIETARY}</IDValue>`)).toHaveLength(3);

        const issues = projectOnixSourceIssues(result, t);
        expect(issues.every(({ severity }) => severity === 'warning')).toBe(true);
        const recovered = issues.filter(({ code }) => code === 'onix.source.recovered');
        expect(recovered).toEqual([
          expect.objectContaining({
            source: { kind: 'onix', productIndex: 2 },
            sourceValidation: { kind: 'recovery', recovery: result.normalized?.recoveries[0] },
          }),
        ]);
        expect(recovered[0].message).toContain('onixValidation.issue.recoveredOrcid');
        expect(recovered[0].message).toContain(JSON.stringify(spelling).slice(1, -1));
        expect(recovered[0].message).toContain(ORCID_BARE);
        expect(recovered[0].message).toContain(NAME_IDENTIFIER(2));
        expect(recovered[0].message).not.toContain('recoveredIdentifier');
        const orcidFindings = issues.filter(
          ({ sourceValidation }) =>
            sourceValidation?.kind === 'finding' && sourceValidation.finding.id === '_20171126_b_32',
        );
        expect(orcidFindings.map(({ severity, message }) => [severity, message])).toEqual([
          ['warning', expect.stringContaining('onixValidation.disposition.NORMALIZE_ORCID_LEXICAL_FORM')],
        ]);

        const { works, conflicts, unrepresentedIdentifiers } = await plannedWork(result);
        expect(works).toHaveLength(1);
        expect(works[0].contributions.map(({ fullName, orcidId }) => [fullName, orcidId])).toEqual([
          ['Ada Lovelace', ORCID],
        ]);
        expect(conflicts).toEqual([]);
        // The ORCID-shaped proprietary identifier is disclosed as unrepresentable in both manifestations, never read as ORCID.
        expect(unrepresentedIdentifiers).toEqual([{ types: ['01'] }, { types: ['01'] }]);
      },
    );

    it.each([
      ['a lower-case check character behind a resolver', '000000020001001X', 'https://orcid.org/0000-0002-0001-001x'],
      ['a lower-case check character on both sides', '000000020001001x', 'orcid.org/0000-0002-0001-001x'],
    ])('keeps %s exactly and still plans the one canonical ORCID', async (_label, paperback, pdf) => {
      const result = await canonical(groupedWork(paperback, pdf));

      expect(permitsTargetPlanning(result)).toBe(true);
      expect(result.normalized?.recoveries).toEqual([
        expect.objectContaining({ original: pdf, canonical: '000000020001001x' }),
      ]);
      const { works, conflicts } = await plannedWork(result);
      expect(works[0].contributions.map(({ orcidId }) => orcidId)).toEqual(['0000-0002-0001-001X']);
      expect(conflicts).toEqual([]);
    });

    it('never reads a resolver-shaped value declared under another identifier type as an ORCID', async () => {
      const resolverShaped = `https://orcid.org/${ORCID}`;
      const result = await canonical(groupedWork(resolverShaped, resolverShaped, '01'));

      expect(blockingIds(result)).toEqual([]);
      expect(result.findings.filter(({ id }) => id === '_20171126_b_32')).toEqual([]);
      expect(result.normalized?.recoveries).toEqual([]);
      expect(result.normalized?.xml.split(`<IDValue>${resolverShaped}</IDValue>`)).toHaveLength(3);
      const { works, conflicts, unrepresentedIdentifiers } = await plannedWork(result);
      // No manifestation declares an ORCID, so the planned contributor has none, whatever the values look like.
      expect(works[0].contributions.map(({ fullName, orcidId }) => [fullName, orcidId || null])).toEqual([
        ['Ada Lovelace', null],
      ]);
      expect(conflicts).toEqual([]);
      expect(unrepresentedIdentifiers).toEqual([{ types: ['01'] }, { types: ['01'] }]);
    });

    it.each([
      ['an http resolver', `http://orcid.org/${ORCID}`],
      ['a www host', `https://www.orcid.org/${ORCID}`],
      ['a check-character error', 'https://orcid.org/0000-0002-1825-0098'],
      ['an out-of-range value', 'orcid.org/0000-0000-0000-0001'],
    ])('refuses a source whose ORCID has %s, before any adapter parse', async (_label, spelling) => {
      const result = await canonical(groupedWork(ORCID_BARE, spelling));
      const issues = projectOnixSourceIssues(result, t);

      expect(blockingIds(result)).toEqual([`_20171126_b_32 ${NAME_IDENTIFIER(2)}`]);
      expect(result.normalized?.recoveries).toEqual([]);
      expect(permitsTargetPlanning(result)).toBe(false);
      expect(() => bridgeOnixSource(result)).toThrow();
      expect(parse).not.toHaveBeenCalled();
      expect(issues.filter(({ severity }) => severity === 'error')).toEqual([
        expect.objectContaining({ code: 'onix.source.validity', source: { kind: 'onix', productIndex: 2 } }),
      ]);
    });

    it.each(['en', 'de', 'es', 'pt'])('%s: describes every recovery kind, the ORCID one included', async (locale) => {
      // Exhaustive by type: a recovery kind added without its messages fails to compile here.
      const MESSAGES = {
        OMIT_INVALID_COMPOSITE: 'recovered',
        NORMALIZE_IDENTIFIER_LEXICAL_FORM: 'recoveredIdentifier',
        PUBLISHER_CATEGORY_TO_CUSTOM: 'recoveredCategory',
        NORMALIZE_ORCID_LEXICAL_FORM: 'recoveredOrcid',
        PUBLISHER_SUPPLIED_VALUE: 'recoveredPublisherValue',
      } satisfies Record<Exclude<Recoverability, 'NOT_RECOVERABLE'>, string>;
      type Messages = { onixValidation: { issue: Record<string, string>; disposition: Record<string, string> } };
      const { onixValidation } = (await import(`@/src/shared/i18n/locales/${locale}/common.json`)) as Messages;
      const { onixValidation: english } = (await import('@/src/shared/i18n/locales/en/common.json')) as Messages;
      const placeholders = (text: string) => [...text.matchAll(/\{\{(\w+)\}\}/g)].map(([, name]) => name).sort();

      for (const [kind, key] of Object.entries(MESSAGES)) {
        expect(onixValidation.disposition[kind], kind).toEqual(expect.stringMatching(/\S/));
        expect(onixValidation.issue[key], key).toEqual(expect.stringMatching(/\S/));
        expect(placeholders(onixValidation.issue[key]), key).toEqual(placeholders(english.issue[key]));
      }
      expect(placeholders(onixValidation.issue.recoveredOrcid)).toEqual([
        'canonical',
        'location',
        'original',
        'recovery',
      ]);
      expect(Object.keys(onixValidation.disposition).sort()).toEqual(Object.keys(english.disposition).sort());
      expect(Object.keys(onixValidation.issue).sort()).toEqual(Object.keys(english.issue).sort());
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

/* ------------------------------------------------------------------------------------------------ */
/* Product-scoped blocking, partial import and idempotent re-upload (thoth-app#282)                 */
/* ------------------------------------------------------------------------------------------------ */

const REFERENCE_31_NS = 'http://ns.editeur.org/onix/3.1/reference';
const PARTIAL_IMPRINT = '11111111-1111-4111-8111-111111111111';
const PARTIAL_IMPRINTS = [{ label: 'Regression Press', value: PARTIAL_IMPRINT }];
const PARTIAL_PUBLISHER = 'publisher-282';

/** An ISBN-13 of the synthetic prefix 978-1-80282-0, with its valid check digit. */
const isbnOf = (sequence: number) => {
  const base = `9781802820${String(sequence).padStart(2, '0')}`;
  const sum = [...base].reduce((total, digit, position) => total + Number(digit) * (position % 2 === 0 ? 1 : 3), 0);
  return `${base}${(10 - (sum % 10)) % 10}`;
};

type FeedProduct = {
  readonly isbn: string;
  readonly title: string;
  readonly notification?: string;
  readonly form?: string;
  /** DescriptiveDetail content between NoContributor and Language, in schema order. */
  readonly edition?: string;
  readonly collateral?: string;
  readonly related?: string;
};

const feedProduct = ({
  isbn,
  title,
  notification = '03',
  form = '<ProductForm>BC</ProductForm>',
  edition = '',
  collateral = '',
  related = '',
}: FeedProduct) =>
  `<Product><RecordReference>regression-press.${isbn}</RecordReference><NotificationType>${notification}</NotificationType>` +
  `<ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>${isbn}</IDValue></ProductIdentifier>` +
  `<DescriptiveDetail><ProductComposition>00</ProductComposition>${form}<TitleDetail><TitleType>01</TitleType>` +
  `<TitleElement><TitleElementLevel>01</TitleElementLevel><NoPrefix/><TitleWithoutPrefix language="eng">${title}</TitleWithoutPrefix>` +
  `</TitleElement></TitleDetail><NoContributor/>${edition}<Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language>` +
  `</DescriptiveDetail>${collateral}<PublishingDetail><Imprint><ImprintName>Regression Press</ImprintName></Imprint>` +
  '<Publisher><PublishingRole>01</PublishingRole><PublisherName>Regression Press</PublisherName></Publisher>' +
  '<PublishingStatus>04</PublishingStatus><PublishingDate><PublishingDateRole>01</PublishingDateRole><Date>20260301</Date>' +
  `</PublishingDate></PublishingDetail>${related ? `<RelatedMaterial>${related}</RelatedMaterial>` : ''}</Product>`;

const feed = (products: readonly string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?><ONIXMessage release="3.1" xmlns="${REFERENCE_31_NS}"><Header><Sender>` +
  '<SenderName>Regression Press</SenderName><EmailAddress>metadata@regression-press.example</EmailAddress></Sender>' +
  `<MessageNumber>282</MessageNumber><SentDateTime>20261104T120000Z</SentDateTime></Header>${products.join('')}</ONIXMessage>`;

const shortDescription = (length: number) => {
  const text =
    'This short description states what the book is about in plain words, and its length decides whether the ONIX ' +
    'short-description limit of three hundred and fifty characters holds for it.';
  return `<CollateralDetail><TextContent><TextType>02</TextType><ContentAudience>00</ContentAudience><Text language="eng">${`${text} ${'x'.repeat(length)}`.slice(
    0,
    length,
  )}</Text></TextContent></CollateralDetail>`;
};

/** A distributor feed of 24 Products, each its own Work; as supplied, Products 1 and 4 each carry one blocking finding. */
const distributorFeed = ({ corrected = false } = {}) =>
  feed(
    Array.from({ length: 24 }, (_, position) => {
      const n = position + 1;
      if (n === 1) {
        return feedProduct({
          isbn: isbnOf(n),
          title: 'A Book Held Back by Its Description',
          collateral: shortDescription(corrected ? 300 : 526),
        });
      }
      if (n === 4) {
        return feedProduct({
          isbn: isbnOf(n),
          title: 'A Book Held Back by Its Edition',
          edition: `${corrected ? '<EditionNumber>2</EditionNumber>' : ''}<EditionStatement>Revised and expanded</EditionStatement>`,
        });
      }
      return feedProduct({ isbn: isbnOf(n), title: `Partial Import Book ${String(n).padStart(2, '0')}` });
    }),
  );

/** A Thoth that holds the given existing Works, answering exactly as the publisher-scoped preflight lookup does. */
const thothHolding = (works: readonly WorkEntity[] = []): OnixTargetLookup & { findWorks: Mock; getWork: Mock } => ({
  findWorks: vi.fn(async (identifiers: readonly ImportIdentifier[]) => {
    return new Map(
      identifiers.map((identifier) => [
        importIdentifierKey(identifier),
        works
          .filter(({ publications }) =>
            publications.some(({ isbn }) => identifier.basis === 'isbn' && isbn.replace(/-/g, '') === identifier.value),
          )
          .map(({ id, imprintId }) => ({ workId: id, title: '', imprintId, doi: '', isbns: [] })),
      ]),
    );
  }),
  getWork: vi.fn(async (workId: string) => {
    const work = works.find(({ id }) => id === workId);
    if (!work) throw new Error(`unexpected getWork(${workId})`);
    return work;
  }),
});

const NOTHING_RELATED: OnixRelatedMaterialLookup = {
  findWorksGlobally: async () => new Map(),
  getWorkRelations: async () => [],
  getWorkReferences: async () => [],
};

/**
 * What `XMLParse.tsx` plans from one canonical result, stage for stage: attribution, bridge, whole-file source plan,
 * partition, every reduction over the partitioned plan, existing targets, the adapter and the resolver.
 */
const planPartially = async (result: OnixWorkerResult, lookup = thothHolding()) => {
  const attribution = attributeCountingFindings(result);
  if (attribution.kind === 'FILE') return { attribution, partition: null, resolution: null } as const;
  const bridged = bridgeAttributedOnixSource(attribution);
  const { adapter, provenance } = bridged;
  const { recoveries, xml: normalizedXml } = bridged.canonical.normalized;
  const partition = partitionOnixSourcePlan(planOnixSource(adapter, { provenance }), attribution, adapter);
  if (partition.kind === 'FILE') return { attribution, partition, resolution: null } as const;
  const { sourcePlan, heldBack } = partition;
  const descriptive = reduceOnixDescriptive(adapter, sourcePlan, { provenance, recoveries });
  const rights = reduceOnixRights(adapter, sourcePlan, { provenance });
  const commercial = reduceOnixCommercial(adapter, sourcePlan, { provenance, normalizedXml });
  const salesRights = reduceOnixSalesRights(adapter, sourcePlan, { provenance, commercial });
  const accessibility = reduceOnixAccessibility(adapter, sourcePlan, { provenance, rights });
  const components = reduceOnixComponents(adapter, sourcePlan, { provenance });
  const relatedMaterial = reduceOnixRelatedMaterial(adapter, sourcePlan, { provenance });
  const collateral = reduceOnixCollateral(adapter, sourcePlan, { provenance, recoveries, descriptive });
  const reviewsPrizes = reduceOnixReviewsPrizes(adapter, sourcePlan, collateral, { provenance });
  const targets = await resolveOnixTargets(sourcePlan, lookup, PARTIAL_PUBLISHER);
  const relatedMaterialTargets = await resolveOnixRelatedMaterialTargets(
    relatedMaterial,
    sourcePlan,
    targets,
    NOTHING_RELATED,
  );
  ids.next = 0;
  const parsed = await new XMLParser(
    adapter,
    PARTIAL_IMPRINTS,
    licenseOptions,
    [],
    {
      getContributors: vi.fn().mockResolvedValue([]),
      getContributorsByOrcids: vi.fn().mockResolvedValue([]),
    } as unknown as ContributorService,
    { getInstitutions: vi.fn().mockResolvedValue([]) } as unknown as InstitutionService,
    languageOptions,
    currencyOptions,
    {
      sourcePlan,
      descriptive,
      components,
      collateral,
      adaptGroupKeys: adaptableGroupKeys(sourcePlan, targets, PARTIAL_IMPRINTS),
    },
  ).parse();
  if (parsed.status === 'failed' || parsed.data.onix === undefined) throw new Error('the adapter failed');
  const resolution = resolveOnixImportPlan({
    sourcePlan,
    descriptive,
    rights,
    commercial,
    salesRights,
    accessibility,
    components,
    relatedMaterial,
    relatedMaterialTargets,
    collateral,
    reviewsPrizes,
    targets,
    issues: [...projectOnixSourceIssues(bridged.canonical, t), ...parsed.issues],
    serieses: [],
    candidatePlan: parsed.data.plan,
    adaptation: parsed.data.onix.groups,
    attachmentPublications: parsed.data.onix.attachmentPublications,
    ...(heldBack.length === 0 ? {} : { heldBack }),
    inputs: { ...EMPTY_ONIX_PLAN_INPUTS, fileWorkType: WorkTypes.enum.Monograph },
    imprints: PARTIAL_IMPRINTS,
  });
  return { attribution, partition, resolution, lookup } as const;
};

/** The Work an earlier import created for one Product of the feed: its paperback, in the publisher's imprint. */
const importedWork = (sequence: number, imprintId = PARTIAL_IMPRINT) =>
  getDefaultWork({
    id: `00000000-0000-4000-8000-000000282${String(sequence).padStart(3, '0')}`,
    type: WorkTypes.enum.Monograph,
    imprintId,
    edition: 1,
    titles: [getDefaultTitle({ canonical: true, title: `Partial Import Book ${String(sequence).padStart(2, '0')}` })],
    publications: [
      getDefaultPublication({
        id: `pub-282-${sequence}`,
        type: PublicationType.enum.Paperback,
        isbn: isbnOf(sequence),
      }),
    ],
  });

describe('partial import (thoth-app#282)', () => {
  describe('attributeCountingFindings', () => {
    const twoProducts = feed([
      feedProduct({ isbn: isbnOf(1), title: 'One' }),
      feedProduct({ isbn: isbnOf(2), title: 'Two' }),
    ]);
    const invalid = (findings: SourceFinding[], overrides: Partial<OnixWorkerResult> = {}) =>
      scripted({
        findings,
        sourceValid: false,
        normalized: {
          xml: twoProducts,
          elementCount: 0,
          recoveries: [],
          provenance: { kind: 'IDENTITY', flavour: 'reference' },
        },
        ...overrides,
      });

    it('attributes nothing for a source-valid result, which is then planned whole', () => {
      const attribution = attributeCountingFindings(scripted({ findings: [finding({ counts: false })] }));
      expect(attribution).toMatchObject({ kind: 'PRODUCTS' });
      expect(attribution.kind === 'PRODUCTS' && attribution.blockingByProduct.size).toBe(0);
    });

    it('attributes each counting finding to the one Product it lies in, and leaves non-counting findings alone', () => {
      const blocking = finding({ path: '/ONIXMessage[1]/Product[2]/DescriptiveDetail[1]' });
      const attribution = attributeCountingFindings(
        invalid([finding({ counts: false, path: '/ONIXMessage[1]/Product[1]' }), blocking]),
      );
      expect(attribution.kind === 'PRODUCTS' && [...attribution.blockingByProduct]).toEqual([[2, [blocking]]]);
    });

    it('holds the whole file for a stage 1-2 stop', () => {
      expect(
        attributeCountingFindings(
          scripted({
            status: 'STOPPED',
            stop: { stage: 2, text: 'DOCTYPE' },
            sourceValid: false,
            normalized: null,
            findings: [finding({ path: null })],
          }),
        ),
      ).toEqual({ kind: 'FILE', reason: 'NOT_COMPLETED' });
    });

    it('holds the whole file for a Header, root or path-less counting finding, whatever else lies in Products', () => {
      const inProduct = finding({ path: '/ONIXMessage[1]/Product[2]/DescriptiveDetail[1]' });
      for (const path of ['/ONIXMessage[1]/Header[1]/Sender[1]', '/ONIXMessage[1]', null, undefined, '']) {
        expect(attributeCountingFindings(invalid([inProduct, finding({ path })]))).toEqual({
          kind: 'FILE',
          reason: 'MESSAGE_LEVEL_FINDING',
        });
      }
      // A path that only looks like a Product's is not one.
      expect(attributeCountingFindings(invalid([finding({ path: '/ONIXMessage[1]/Product[2]x' })]))).toEqual({
        kind: 'FILE',
        reason: 'MESSAGE_LEVEL_FINDING',
      });
    });

    it('holds the whole file for a counting finding on a Product element itself, whatever its tier (review B1)', () => {
      const inProduct = finding({ path: '/ONIXMessage[1]/Product[1]/CollateralDetail[1]/TextContent[1]' });
      const tiers: [SourceFinding['tier'], SourceFinding['class']][] = [
        ['CANONICAL_ORDINARY', 'SOURCE_INVALID'],
        ['STRICT', 'NORMATIVE_INVALID'],
        ['SCHEMATRON', 'NORMATIVE_INVALID'],
        ['INVENTORY', 'NORMATIVE_INVALID'],
      ];
      for (const [tier, klass] of tiers) {
        const onProduct = finding({ tier, class: klass, path: '/ONIXMessage[1]/Product[2]' });
        for (const findings of [[onProduct], [inProduct, onProduct], [onProduct, inProduct]]) {
          expect(attributeCountingFindings(invalid(findings))).toEqual({
            kind: 'FILE',
            reason: 'PRODUCT_ELEMENT_FINDING',
          });
        }
      }
      // Anything below the Product element is still that Product's, and a non-counting finding on it holds nothing.
      for (const path of [
        '/ONIXMessage[1]/Product[2]/DescriptiveDetail[1]',
        '/ONIXMessage[1]/Product[2]/RecordReference[1]',
      ]) {
        const attribution = attributeCountingFindings(
          invalid([finding({ counts: false, path: '/ONIXMessage[1]/Product[1]' }), finding({ path })]),
        );
        expect(attribution.kind === 'PRODUCTS' && [...attribution.blockingByProduct.keys()]).toEqual([2]);
      }
    });

    it('holds the whole file when a finding names a Product past the last one, or every Product is blocked', () => {
      expect(attributeCountingFindings(invalid([finding({ path: '/ONIXMessage[1]/Product[3]/X[1]' })]))).toEqual({
        kind: 'FILE',
        reason: 'PRODUCT_UNRESOLVED',
      });
      expect(
        attributeCountingFindings(
          invalid([
            finding({ path: '/ONIXMessage[1]/Product[1]/X[1]' }),
            finding({ path: '/ONIXMessage[1]/Product[2]/X[1]' }),
          ]),
        ),
      ).toEqual({ kind: 'FILE', reason: 'NOTHING_LEFT' });
    });

    it('holds the whole file when a recovery omitted a whole Product, so positions cannot be trusted', () => {
      const omitted = {
        recovery: 'OMIT_INVALID_COMPOSITE',
        removed: '/ONIXMessage[1]/Product[1]',
      } as unknown as RecoveryMarker;
      expect(
        attributeCountingFindings(
          invalid([finding({ path: '/ONIXMessage[1]/Product[2]' })], {
            normalized: {
              xml: twoProducts,
              elementCount: 0,
              recoveries: [omitted],
              provenance: { kind: 'IDENTITY', flavour: 'reference' },
            },
          }),
        ),
      ).toEqual({ kind: 'FILE', reason: 'PRODUCT_OMITTED' });
    });

    it('holds the whole file for a blocked result with no counting finding', () => {
      expect(attributeCountingFindings(invalid([]))).toEqual({ kind: 'FILE', reason: 'VERDICT_UNEXPLAINED' });
    });
  });

  describe('partitionOnixSourcePlan', () => {
    const ISBN_A = isbnOf(31);
    const ISBN_B = isbnOf(32);
    const ISBN_C = isbnOf(33);
    const alternative = (isbn: string) =>
      `<RelatedProduct><ProductRelationCode>06</ProductRelationCode><ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>${isbn}</IDValue></ProductIdentifier></RelatedProduct>`;
    const replaces = (isbn: string) =>
      `<RelatedProduct><ProductRelationCode>03</ProductRelationCode><ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>${isbn}</IDValue></ProductIdentifier></RelatedProduct>`;
    /** A paperback and its PDF, one Work group by their in-file alternative-format link, and a second book. */
    const multiProduct = (third = feedProduct({ isbn: ISBN_C, title: 'Another Book' })) =>
      feed([
        feedProduct({ isbn: ISBN_A, title: 'A Two-Format Book', related: alternative(ISBN_B) }),
        feedProduct({
          isbn: ISBN_B,
          title: 'A Two-Format Book',
          form: '<ProductForm>EB</ProductForm><ProductFormDetail>E107</ProductFormDetail>',
        }),
        third,
      ]);
    const partitionOf = (xml: string, paths: readonly string[]) => {
      const attribution = attributeCountingFindings(
        scripted({
          findings: paths.map((path) => finding({ path })),
          sourceValid: false,
          normalized: { xml, elementCount: 0, recoveries: [], provenance: { kind: 'IDENTITY', flavour: 'reference' } },
        }),
      );
      if (attribution.kind !== 'PRODUCTS') throw new Error(`attribution held the file: ${attribution.reason}`);
      const adapter = raw(xml);
      const whole = planOnixSource(adapter);
      return { whole, adapter, partition: partitionOnixSourcePlan(whole, attribution, adapter) };
    };

    it('holds back the whole Work group a blocking finding on one of its manifestations lies in, and plans the rest unchanged', () => {
      const { whole, partition } = partitionOf(multiProduct(), ['/ONIXMessage[1]/Product[2]/DescriptiveDetail[1]']);
      expect(whole.groups).toHaveLength(2);
      if (partition.kind !== 'PLANNED') throw new Error('held the file');
      const [held] = partition.heldBack;
      expect(partition.heldBack).toHaveLength(1);
      expect(held).toMatchObject({
        title: 'A Two-Format Book',
        isbns: [ISBN_A, ISBN_B],
        records: [
          { index: 1, recordReference: `regression-press.${ISBN_A}`, isbn: ISBN_A },
          { index: 2, recordReference: `regression-press.${ISBN_B}`, isbn: ISBN_B },
        ],
        findings: [expect.objectContaining({ path: '/ONIXMessage[1]/Product[2]/DescriptiveDetail[1]' })],
      });
      expect(held.productKeys).toHaveLength(2);
      // Nothing of the held-back group is left to plan; the other group is exactly as the whole file planned it.
      const other = whole.groups.find(({ groupKey }) => groupKey !== held.groupKey);
      expect(partition.sourcePlan.groups).toEqual([other]);
      expect(partition.sourcePlan.products).toEqual(
        whole.products.filter(({ groupKey }) => groupKey === other?.groupKey),
      );
      expect(partition.sourcePlan.records.map(({ index }) => index)).toEqual([3]);
    });

    it('plans a group that relates to a held-back Product as if that Product were not in the file', () => {
      const xml = multiProduct(feedProduct({ isbn: ISBN_C, title: 'A Replacing Book', related: replaces(ISBN_A) }));
      const { whole, adapter, partition } = partitionOf(xml, ['/ONIXMessage[1]/Product[1]/DescriptiveDetail[1]']);
      if (partition.kind !== 'PLANNED') throw new Error('held the file');
      const wholeRelated = reduceOnixRelatedMaterial(adapter, whole);
      const partialRelated = reduceOnixRelatedMaterial(adapter, partition.sourcePlan);
      // In the whole file the replaced Product is answered in the file itself; held back, it is not in the file, so its
      // ISBN is only an exact identity to look up in Thoth - never an edge to a Work this import would create.
      expect(onixRelatedMaterialLookupIdentifiers(wholeRelated, whole)).toEqual([]);
      expect(onixRelatedMaterialLookupIdentifiers(partialRelated, partition.sourcePlan)).toEqual([
        { basis: 'isbn', value: ISBN_A },
      ]);
    });

    it('holds the whole file when the blocked Product is no complete record of a planned Work group', () => {
      const xml = multiProduct(feedProduct({ isbn: ISBN_C, title: 'A Test Record', notification: '88' }));
      expect(partitionOf(xml, ['/ONIXMessage[1]/Product[3]/DescriptiveDetail[1]']).partition).toEqual({
        kind: 'FILE',
        reason: 'PRODUCT_UNRESOLVED',
      });
    });

    it('holds the whole file when a record is not the Product the canonical position names (review finding 1)', () => {
      const xml = multiProduct();
      const attribution = attributeCountingFindings(
        scripted({
          findings: [finding({ path: '/ONIXMessage[1]/Product[3]/DescriptiveDetail[1]' })],
          sourceValid: false,
          normalized: { xml, elementCount: 0, recoveries: [], provenance: { kind: 'IDENTITY', flavour: 'reference' } },
        }),
      );
      if (attribution.kind !== 'PRODUCTS') throw new Error('held the file');
      // The planner's records come from Products in another order than the canonical message holds them.
      const reordered = raw(
        feed([
          feedProduct({ isbn: ISBN_C, title: 'Another Book' }),
          feedProduct({ isbn: ISBN_A, title: 'A Two-Format Book', related: alternative(ISBN_B) }),
          feedProduct({
            isbn: ISBN_B,
            title: 'A Two-Format Book',
            form: '<ProductForm>EB</ProductForm><ProductFormDetail>E107</ProductFormDetail>',
          }),
        ]),
      );
      expect(partitionOnixSourcePlan(planOnixSource(reordered), attribution, reordered)).toEqual({
        kind: 'FILE',
        reason: 'PRODUCT_POSITIONS_UNPROVEN',
      });
    });

    it('holds the whole file when a Product start tag is not a Product of the message', () => {
      const xml = multiProduct().replace('</Header>', '</Header><!-- <Product> quoted in a comment -->');
      expect(partitionOf(xml, ['/ONIXMessage[1]/Product[1]/DescriptiveDetail[1]']).partition).toEqual({
        kind: 'FILE',
        reason: 'PRODUCT_POSITIONS_UNPROVEN',
      });
    });

    it('holds the whole file when every Work group is held back', () => {
      expect(
        partitionOf(multiProduct(), [
          '/ONIXMessage[1]/Product[1]/DescriptiveDetail[1]',
          '/ONIXMessage[1]/Product[3]/DescriptiveDetail[1]',
        ]).partition,
      ).toEqual({ kind: 'FILE', reason: 'NOTHING_LEFT' });
    });

    it('hands a source without a counting finding its whole plan, the very same object', () => {
      const adapter = raw(multiProduct());
      const whole = planOnixSource(adapter);
      const attribution = attributeCountingFindings(scripted());
      if (attribution.kind !== 'PRODUCTS') throw new Error('held the file');
      expect(partitionOnixSourcePlan(whole, attribution, adapter)).toEqual({
        kind: 'PLANNED',
        sourcePlan: whole,
        heldBack: [],
      });
      expect((partitionOnixSourcePlan(whole, attribution, adapter) as { sourcePlan: unknown }).sourcePlan).toBe(whole);
    });
  });

  describe('partial import of a 24-Product feed, with the real validator', () => {
    const HELD_BACK = [isbnOf(1), isbnOf(4)];

    it('plans and executes the 22 clean books, and holds back the 2 with blocking findings with zero mutations', async () => {
      const result = await canonical(distributorFeed());
      // Validation is unchanged: the file is source-invalid, with exactly the two counting findings, each in one Product.
      expect(result.sourceValid).toBe(false);
      expect(permitsTargetPlanning(result)).toBe(false);
      expect(blockingIds(result)).toEqual([
        '_20171221_e_1 /ONIXMessage[1]/Product[1]/CollateralDetail[1]/TextContent[1]',
        'R-EDITION-STATEMENT /ONIXMessage[1]/Product[4]/DescriptiveDetail[1]',
      ]);

      const { partition, resolution } = await planPartially(result);
      if (partition?.kind !== 'PLANNED' || resolution === null) throw new Error('the file was held');

      // Disclosed by title and ISBN, with the finding that holds each back.
      expect(
        partition.heldBack.map(({ title, isbns, records, findings }) => ({
          title,
          isbns,
          records: records.map(({ index }) => index),
          findings: findings.map(({ id }) => id),
        })),
      ).toEqual([
        { title: 'A Book Held Back by Its Description', isbns: [isbnOf(1)], records: [1], findings: ['_20171221_e_1'] },
        {
          title: 'A Book Held Back by Its Edition',
          isbns: [isbnOf(4)],
          records: [4],
          findings: ['R-EDITION-STATEMENT'],
        },
      ]);
      expect(heldBackGroupsOf(resolution.sidecar)).toEqual(partition.heldBack);
      expect(
        resolution.sidecar.issues
          .filter(({ code }) => code === 'onix.record.omitted')
          .map(({ severity, source }) => [severity, source]),
      ).toEqual([
        ['warning', { kind: 'onix', productIndex: 1, recordReference: `regression-press.${isbnOf(1)}` }],
        ['warning', { kind: 'onix', productIndex: 4, recordReference: `regression-press.${isbnOf(4)}` }],
      ]);
      // The two counting findings stay in the ledger exactly as validation projected them.
      expect(resolution.sidecar.issues.filter(({ severity }) => severity === 'error')).toEqual(
        projectOnixSourceIssues(result, t).filter(({ severity }) => severity === 'error'),
      );

      // 22 Work groups planned, executable, each a unit that creates its Work; none of the held-back Products anywhere.
      expect(resolution.sidecar.blockers).toEqual([]);
      expect(resolution.sidecar.executable).toBe(true);
      expect(resolution.sidecar.workGroups).toHaveLength(22);
      expect(resolution.sidecar.workGroups.every(({ target }) => target === 'NEW_WORK')).toBe(true);
      expect(resolution.sidecar.products.map(({ isbn }) => isbn)).toEqual(
        Array.from({ length: 24 }, (_, i) => isbnOf(i + 1)).filter((isbn) => !HELD_BACK.includes(isbn)),
      );
      const units = resolution.plan?.execution?.units ?? [];
      expect(units).toHaveLength(22);
      expect(units.every(({ actions }) => actions.length > 0)).toBe(true);
      const heldGroupKeys = new Set(partition.heldBack.map(({ groupKey }) => groupKey));
      expect(units.filter(({ groupKey }) => heldGroupKeys.has(groupKey))).toEqual([]);
      // Nothing a run would write names a held-back Product: not a Work, chapter, Series or unit action.
      const { works, chapters, series, execution } = resolution.plan ?? {};
      expect(JSON.stringify({ works, chapters, series, execution })).not.toMatch(new RegExp(HELD_BACK.join('|')));
      expect(resolution.plan?.works.map((work) => work.titles[0]?.title).sort()).toEqual(
        Array.from({ length: 24 }, (_, i) => i + 1)
          .filter((n) => n !== 1 && n !== 4)
          .map((n) => `Partial Import Book ${String(n).padStart(2, '0')}`),
      );
    });

    it('recognises the 22 imported books on a re-upload of the corrected file, and plans only the 2 held back', async () => {
      const result = await canonical(distributorFeed({ corrected: true }));
      expect(result.sourceValid).toBe(true);
      const imported = Array.from({ length: 24 }, (_, i) => i + 1).filter((n) => n !== 1 && n !== 4);
      const thoth = thothHolding(imported.map((n) => importedWork(n)));

      const { partition, resolution } = await planPartially(result, thoth);
      if (partition?.kind !== 'PLANNED' || resolution === null) throw new Error('the file was held');

      // Only the lookup the preflight always made: every accepted Product ISBN, at once.
      expect(thoth.findWorks).toHaveBeenCalledOnce();
      expect(partition.heldBack).toEqual([]);
      expect(heldBackGroupsOf(resolution.sidecar)).toEqual([]);
      expect('heldBack' in resolution.sidecar).toBe(false);
      expect(resolution.sidecar.blockers).toEqual([]);
      expect(resolution.sidecar.executable).toBe(true);
      const byIsbn = new Map(resolution.sidecar.products.map((product) => [product.isbn, product]));
      const groupOf = (n: number) =>
        resolution.sidecar.workGroups.find(({ groupKey }) => groupKey === byIsbn.get(isbnOf(n))?.groupKey);
      imported.forEach((n) => {
        expect(groupOf(n)).toMatchObject({ target: 'EXISTING_WORK', existingWorkId: importedWork(n).id });
        expect(byIsbn.get(isbnOf(n))).toMatchObject({ action: 'ALREADY_PRESENT', executable: true });
      });
      [1, 4].forEach((n) => {
        expect(groupOf(n)).toMatchObject({ target: 'NEW_WORK' });
        expect(byIsbn.get(isbnOf(n))).toMatchObject({ action: 'CREATE_PUBLICATION' });
      });
      // 22 NOOP units that write nothing, and 2 that create the corrected books.
      const units = resolution.plan?.execution?.units ?? [];
      expect(units).toHaveLength(24);
      expect(units.filter(({ actions }) => actions.length === 0).map(({ target }) => target)).toEqual(
        imported.map((n) => ({ kind: 'EXISTING_WORK', workId: importedWork(n).id })),
      );
      expect(resolution.plan?.works.map((work) => work.titles[0]?.title)).toEqual([
        'A Book Held Back by Its Description',
        'A Book Held Back by Its Edition',
      ]);
    });

    it.each([
      ['self-closing', '<Product/>'],
      ['empty', '<Product></Product>'],
      ['text-only', '<Product>junk</Product>'],
    ])(
      "holds the whole file when a %s Product would shift the planner's positions (review finding 1)",
      async (_, empty) => {
        const books = [1, 3, 4, 5].map((n) =>
          feedProduct({
            isbn: isbnOf(n),
            title: `Book ${n}`,
            collateral: n === 4 ? shortDescription(526) : '',
          }),
        );
        const result = await canonical(feed([books[0], empty, ...books.slice(1)]));
        // Validation completes with counting findings in Product 2 (the empty one) and Product 4 (the long description).
        expect(result.status).toBe('COMPLETED');
        expect(result.findings.filter(({ counts }) => counts).map(({ path }) => productIndexOfPath(path))).toEqual(
          expect.arrayContaining([2, 4]),
        );

        // The empty Product's own schema finding lies on the Product element, which alone holds the whole file.
        expect(await planPartially(result)).toEqual({
          attribution: { kind: 'FILE', reason: 'PRODUCT_ELEMENT_FINDING' },
          partition: null,
          resolution: null,
        });
        // Were that finding not there, the positions the planner numbers its records by would still hold the file.
        const below = result.findings.filter(({ path }) => !/\/Product\[\d+\]$/.test(path ?? ''));
        const outcome = await planPartially({ ...result, findings: below });
        expect(outcome.resolution).toBeNull();
        expect(outcome.partition).toEqual({ kind: 'FILE', reason: 'PRODUCT_POSITIONS_UNPROVEN' });
      },
    );

    describe('a message-level schema finding the validator reports on Product 1 (review B1)', () => {
      const books = [1, 2, 3].map((n) => feedProduct({ isbn: isbnOf(n), title: `Book ${n}` }));
      const clean = feed(books);
      const header = clean.slice(clean.indexOf('<Header>'), clean.indexOf('</Header>') + '</Header>'.length);

      it.each([
        ['without a Header', clean.replace(header, '')],
        ['with the Header after Product 1', clean.replace(header, '').replace(books[0], `${books[0]}${header}`)],
        ['with a NoProduct before the Products', clean.replace(header, `${header}<NoProduct/>`)],
      ])('holds the whole file %s, as before', async (_, xml) => {
        expect((await canonical(clean)).sourceValid).toBe(true);
        const result = await canonical(xml);
        expect(result.status).toBe('COMPLETED');
        expect(permitsTargetPlanning(result)).toBe(false);
        // Every counting finding is the schema's, on the bare Product element - none lies inside Book 1.
        const counting = result.findings.filter(({ counts }) => counts);
        expect(counting.length).toBeGreaterThan(0);
        expect(counting.map(({ tier, path }) => [tier, path])).toEqual(
          counting.map(() => ['CANONICAL_ORDINARY', '/ONIXMessage[1]/Product[1]']),
        );

        expect(await planPartially(result)).toEqual({
          attribution: { kind: 'FILE', reason: 'PRODUCT_ELEMENT_FINDING' },
          partition: null,
          resolution: null,
        });
      });

      it('still holds back only the books whose findings lie inside them', async () => {
        const result = await canonical(
          feed([
            feedProduct({ isbn: isbnOf(1), title: 'Book 1', collateral: shortDescription(526) }),
            books[1],
            feedProduct({
              isbn: isbnOf(3),
              title: 'Book 3',
              edition: '<EditionStatement>Revised and expanded</EditionStatement>',
            }),
            feedProduct({ isbn: isbnOf(4), title: 'Book 4' }),
          ]),
        );
        expect(blockingIds(result)).toEqual([
          '_20171221_e_1 /ONIXMessage[1]/Product[1]/CollateralDetail[1]/TextContent[1]',
          'R-EDITION-STATEMENT /ONIXMessage[1]/Product[3]/DescriptiveDetail[1]',
        ]);

        const { partition, resolution } = await planPartially(result);
        if (partition?.kind !== 'PLANNED' || resolution === null) throw new Error('the file was held');
        expect(partition.heldBack.map(({ isbns }) => isbns)).toEqual([[isbnOf(1)], [isbnOf(3)]]);
        expect(resolution.sidecar.workGroups).toHaveLength(2);
        expect(resolution.sidecar.products.map(({ isbn }) => isbn)).toEqual([isbnOf(2), isbnOf(4)]);
        expect(resolution.sidecar.executable).toBe(true);
      });
    });

    it('holds the whole file, as before, when a blocking finding lies outside every Product', async () => {
      const result = await canonical(distributorFeed());
      const header = finding({ id: 'R-HEADER', path: '/ONIXMessage[1]/Header[1]' });
      const withHeader = { ...result, findings: [...result.findings, header] };
      expect(await planPartially(withHeader)).toMatchObject({
        attribution: { kind: 'FILE', reason: 'MESSAGE_LEVEL_FINDING' },
        resolution: null,
      });
    });
  });
});

describe('publisher-supplied fixes (thoth-app#283 APP-IMPORT-ONIX-INLINE-FIX-01, Phase A)', () => {
  /** The pinned ONIX XHTML subset, read as the uploader loads it, and the importer's own rules. */
  const CONTEXT = createPublisherFixContext(readFileSync(join(PUBLIC_DIR, 'ONIX_XHTML_Subset.xsd'), 'utf8'));
  const start = (result: OnixWorkerResult) => startPublisherFixSession(result, CONTEXT);
  const PRODUCT = '/ONIXMessage[1]/Product';
  const EDITION_DETAIL = `${PRODUCT}[1]/DescriptiveDetail[1]`;
  const SHORT_TEXT_CONTENT = `${PRODUCT}[2]/CollateralDetail[1]/TextContent[1]`;
  const text = (length: number, word = 'abcdefghi ') => word.repeat(Math.ceil(length / word.length)).slice(0, length);

  /** One Product per book: a statement-only edition (Product 1) and an over-limit short description (Product 2). */
  const product = (isbn: string, detail: string, collateral: string, content = '') =>
    `<Product><RecordReference>fix.${isbn}</RecordReference><NotificationType>03</NotificationType>` +
    `<ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>${isbn}</IDValue></ProductIdentifier>` +
    '<DescriptiveDetail><ProductComposition>00</ProductComposition><ProductForm>BC</ProductForm>' +
    `<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText>Book ${isbn}</TitleText></TitleElement></TitleDetail>` +
    '<Contributor><SequenceNumber>1</SequenceNumber><ContributorRole>A01</ContributorRole><PersonName>Ada Lovelace</PersonName><NamesBeforeKey>Ada</NamesBeforeKey><KeyNames>Lovelace</KeyNames></Contributor>' +
    `${detail}<Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language></DescriptiveDetail>` +
    (collateral ? `<CollateralDetail>${collateral}</CollateralDetail>` : '') +
    (content ? `<ContentDetail>${content}</ContentDetail>` : '') +
    '<PublishingDetail><Imprint><ImprintName>Bridge Imprint</ImprintName></Imprint><PublishingStatus>04</PublishingStatus>' +
    '<PublishingDate><PublishingDateRole>01</PublishingDateRole><Date>20260101</Date></PublishingDate></PublishingDetail></Product>';
  const textContent = (type: string, body: string, format = '06') =>
    `<TextContent><TextType>${type}</TextType><ContentAudience>00</ContentAudience><Text textformat="${format}">${body}</Text></TextContent>`;
  const message = (statement: string, collateral: string, content = '') =>
    `<?xml version="1.0" encoding="UTF-8"?><ONIXMessage release="3.0" xmlns="${REFERENCE_NS}">` +
    '<Header><Sender><SenderName>Bridge Press</SenderName></Sender><SentDateTime>20261104T1200</SentDateTime></Header>' +
    product('9780000000002', `<EditionStatement>${statement}</EditionStatement>`, '') +
    product('9780000000019', '', collateral, content) +
    '</ONIXMessage>';

  const validateCalls = { count: 0 };
  /** What Phase B's uploader hands the layer: a fresh validation of bytes, exactly as a Worker session posts it. */
  const validate = async (bytes: Uint8Array) => {
    validateCalls.count += 1;
    return canonical(new TextDecoder().decode(bytes));
  };
  beforeEach(() => {
    validateCalls.count = 0;
  });

  const findingOf = (result: OnixWorkerResult, id: string) => {
    const matches = result.findings.filter((finding) => finding.id === id);
    expect(matches).toHaveLength(1);
    return matches[0];
  };
  const counting = (result: OnixWorkerResult) => result.findings.filter((f) => f.counts).map((f) => [f.id, f.path]);
  const editionFix = (edition: number | string): PublisherFix => ({
    kind: 'SET_EDITION_NUMBER',
    rule: EDITION_STATEMENT_RULE,
    path: EDITION_DETAIL,
    edition,
  });
  const shortFix = (value: string, path = SHORT_TEXT_CONTENT): PublisherFix => ({
    kind: 'REPLACE_SHORT_DESCRIPTION',
    rule: SHORT_DESCRIPTION_LENGTH_RULE,
    path,
    text: value,
  });
  const applied = (outcome: PublisherFixOutcome) => {
    expect(outcome.kind).toBe('APPLIED');
    return (outcome as Extract<PublisherFixOutcome, { kind: 'APPLIED' }>).state;
  };
  const workEditions = async (result: OnixWorkerResult) => {
    const run = await runOnixPlanning(bridgeOnixSource(result), {
      imprints: IMPRINTS,
      inputs: { fileWorkType: WorkTypes.enum.Monograph },
    });
    return (run.resolution?.plan?.works ?? []).map((work) => work.edition);
  };

  /** What planning imports: every planned abstract, and whether any collateral text was unrepresentable. */
  const plannedAbstracts = async (result: OnixWorkerResult) => {
    const run = await runOnixPlanning(bridgeOnixSource(result), {
      imprints: IMPRINTS,
      inputs: { fileWorkType: WorkTypes.enum.Monograph },
    });
    const collateral = run.resolution?.sidecar.collateral;
    return {
      abstracts: (collateral?.actions ?? []).flatMap(({ abstracts }) =>
        abstracts.map(({ type, content, markupFormat }) => ({ type, content, markupFormat })),
      ),
      unrepresentable: (collateral?.findings ?? []).filter(({ code }) => code === 'COLLATERAL_TEXT_UNREPRESENTABLE'),
    };
  };
  const escaped = (markup: string) => markup.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  describe('the source as uploaded', () => {
    it('blocks on exactly the two allowlisted findings, and keeps the advisory', async () => {
      const result = await canonical(message('Third, revised edition', textContent('02', text(351))));

      expect(counting(result)).toEqual([
        [SHORT_DESCRIPTION_LENGTH_RULE, SHORT_TEXT_CONTENT],
        [EDITION_STATEMENT_RULE, EDITION_DETAIL],
      ]);
      expect(findingOf(result, '_20190410_c_2')).toEqual(expect.objectContaining({ class: 'ADVISORY', counts: false }));
      expect(permitsTargetPlanning(result)).toBe(false);
    });
  });

  describe('eligibility', () => {
    it('offers an edition control with the suggestion, a short-description control with its count, and nothing else', async () => {
      const result = await canonical(message('Third, revised edition', textContent('02', text(351))));
      const state = start(result);

      expect(publisherFixEligibility(state, findingOf(result, EDITION_STATEMENT_RULE))).toEqual({
        eligible: true,
        rule: EDITION_STATEMENT_RULE,
        path: EDITION_DETAIL,
        edition: { statements: ['Third, revised edition'], suggestion: 3 },
      });
      expect(publisherFixEligibility(state, findingOf(result, SHORT_DESCRIPTION_LENGTH_RULE))).toEqual({
        eligible: true,
        rule: SHORT_DESCRIPTION_LENGTH_RULE,
        path: SHORT_TEXT_CONTENT,
        shortDescription: {
          textPath: `${SHORT_TEXT_CONTENT}/Text[1]`,
          original: text(351),
          measure: { length: 351, limit: 350, withinLimit: false },
          canOmit: false,
          storedAsEscapedHtml: false,
        },
      });
      // Any other rule - here a non-blocking advisory - gets no inline control.
      expect(publisherFixEligibility(state, findingOf(result, '_20190410_c_2'))).toEqual({
        eligible: false,
        reason: 'RULE_NOT_ALLOWLISTED',
      });
      expect(validateCalls.count).toBe(0);
    });

    it.each(['New edition', 'Revised', 'Revised and expanded', '2023 edition'])(
      'an ambiguous statement (%s) offers no suggestion',
      async (statement) => {
        const result = await canonical(message(statement, textContent('02', text(100))));
        const eligibility = publisherFixEligibility(start(result), findingOf(result, EDITION_STATEMENT_RULE));

        expect(eligibility).toEqual(
          expect.objectContaining({ eligible: true, edition: { statements: [statement], suggestion: null } }),
        );
      },
    );
  });

  describe('R-EDITION-STATEMENT', () => {
    it('applies the edition only on confirm, re-validates clean, and plans the Work as edition 3', async () => {
      const result = await canonical(message('Third, revised edition', textContent('02', text(120))));
      const state = start(result);

      // A suggestion decides nothing: until a fix is confirmed the source is exactly as validated.
      expect(state.result).toBe(result);
      expect(state.fixes).toEqual([]);
      expect(result.normalized?.xml).not.toContain('EditionNumber');

      const outcome = await revalidatePublisherFix(state, editionFix(3), validate);
      const fixed = applied(outcome);

      // The whole normalised source was validated without and then with the fix.
      expect(validateCalls.count).toBe(2);
      expect(counting(fixed.result)).toEqual([]);
      expect(permitsTargetPlanning(fixed.result)).toBe(true);
      // The finding stays in the ledger as the standard reported it; only its recoverability (and so counting) changed.
      const before = findingOf(result, EDITION_STATEMENT_RULE);
      expect(findingOf(fixed.result, EDITION_STATEMENT_RULE)).toEqual({
        ...before,
        recoverability: 'PUBLISHER_SUPPLIED_VALUE',
        counts: false,
      });
      // Every other finding, the advisory included, is the same object.
      expect(fixed.result.findings.filter((f) => f.id !== EDITION_STATEMENT_RULE)).toEqual(
        result.findings.filter((f) => f.id !== EDITION_STATEMENT_RULE),
      );
      expect(findingOf(fixed.result, '_20190410_c_2')).toBe(findingOf(result, '_20190410_c_2'));
      expect(fixed.result.summary).toEqual({ ...result.summary, blocking: 0, recovered: 1 });

      const provenance: PublisherSuppliedValueMarker = {
        recovery: 'PUBLISHER_SUPPLIED_VALUE',
        rule: EDITION_STATEMENT_RULE,
        decision: 'PUBLISHER',
        action: 'SET_EDITION_NUMBER',
        path: EDITION_DETAIL,
        sourcePath: null,
        valuePath: `${EDITION_DETAIL}/EditionNumber[1]`,
        original: null,
        value: '3',
        originalTextFormat: null,
        valueTextFormat: null,
      };
      expect(fixed.fixes).toEqual([provenance]);
      expect(publisherFixProvenance(fixed.result)).toEqual([provenance]);
      expect(fixed.result.normalized?.xml).toContain(
        '<EditionNumber>3</EditionNumber><EditionStatement>Third, revised edition</EditionStatement>',
      );
      expect(fixed.result.normalized?.elementCount).toBe((result.normalized?.elementCount ?? 0) + 1);

      // Product 1's Work carries the confirmed edition; Product 2's says nothing about one and stays edition 1.
      expect(await workEditions(fixed.result)).toEqual([3, 1]);

      // The import report states the publisher decision, at the finding's location.
      const issues = projectOnixSourceIssues(fixed.result, t);
      expect(issues.at(-1)).toEqual(
        expect.objectContaining({
          severity: 'warning',
          code: 'onix.source.recovered',
          message: expect.stringContaining('onixValidation.issue.recoveredPublisherValue'),
          source: { kind: 'onix', productIndex: 1 },
          sourceValidation: { kind: 'recovery', recovery: provenance },
        }),
      );
      expect(
        issues.find(
          (issue) =>
            issue.sourceValidation?.kind === 'finding' && issue.sourceValidation.finding.id === EDITION_STATEMENT_RULE,
        )?.message,
      ).toContain('onixValidation.disposition.PUBLISHER_SUPPLIED_VALUE');
    });

    it.each([
      [0, 'EDITION_NOT_POSITIVE'],
      ['0', 'EDITION_NOT_POSITIVE'],
      [-2, 'EDITION_NOT_POSITIVE'],
      ['-2', 'EDITION_NOT_POSITIVE'],
      [2.5, 'EDITION_NOT_AN_INTEGER'],
      ['2.5', 'EDITION_NOT_AN_INTEGER'],
      ['3rd', 'EDITION_NOT_AN_INTEGER'],
      ['', 'EDITION_NOT_AN_INTEGER'],
      [Number.NaN, 'EDITION_NOT_AN_INTEGER'],
      ['2147483648', 'EDITION_TOO_LARGE'],
    ])('refuses edition %j (%s) without validating or changing anything', async (edition, reason) => {
      const result = await canonical(message('Third, revised edition', textContent('02', text(120))));
      const state = start(result);

      const outcome = await revalidatePublisherFix(state, editionFix(edition), validate);

      expect(outcome).toEqual({ kind: 'REFUSED', reason, state });
      expect(outcome.state).toBe(state);
      expect(validateCalls.count).toBe(0);
    });

    it('records the Short source path of the finding it recovered', async () => {
      const result = await canonical(toShort(message('2nd revised', textContent('02', text(120)))));
      const finding = findingOf(result, EDITION_STATEMENT_RULE);
      const state = start(result);

      expect(publisherFixEligibility(state, finding)).toEqual(
        expect.objectContaining({ eligible: true, edition: { statements: ['2nd revised'], suggestion: 2 } }),
      );
      const fixed = applied(await revalidatePublisherFix(state, editionFix(2), validate));

      expect(finding.sourcePath).toBe('/ONIXmessage[1]/product[1]/descriptivedetail[1]');
      expect(fixed.fixes[0]).toEqual(expect.objectContaining({ sourcePath: finding.sourcePath, value: '2' }));
      expect(fixed.result.normalized?.provenance.kind).toBe('RENAMED');
      expect(counting(fixed.result)).toEqual([]);
      expect(await workEditions(fixed.result)).toEqual([2, 1]);
    });
  });

  describe('_20171221_e_1', () => {
    it('refuses 351 characters and accepts 350, which re-validation clears; nothing is ever truncated', async () => {
      const result = await canonical(message('Third, revised edition', textContent('02', text(526))));
      const state = start(result);

      const over = await revalidatePublisherFix(state, shortFix(text(351, 'zyxwvutsr ')), validate);
      expect(over).toEqual({ kind: 'REFUSED', reason: 'TEXT_OVER_LIMIT', state });
      expect(validateCalls.count).toBe(0);
      expect(state.result.normalized?.xml).toContain(text(526));

      const fixed = applied(await revalidatePublisherFix(state, shortFix(text(350, 'zyxwvutsr ')), validate));
      expect(counting(fixed.result)).toEqual([[EDITION_STATEMENT_RULE, EDITION_DETAIL]]);
      expect(findingOf(fixed.result, SHORT_DESCRIPTION_LENGTH_RULE).recoverability).toBe('PUBLISHER_SUPPLIED_VALUE');
      expect(fixed.fixes).toEqual([
        expect.objectContaining({
          action: 'REPLACE_SHORT_DESCRIPTION',
          valuePath: `${SHORT_TEXT_CONTENT}/Text[1]`,
          original: text(526),
          value: text(350, 'zyxwvutsr '),
        }),
      ]);
      expect(fixed.result.normalized?.xml).toContain(`<Text textformat="06">${text(350, 'zyxwvutsr ')}</Text>`);
      expect(fixed.result.normalized?.xml).not.toContain(text(526));

      // Fixes accumulate: the edition is then confirmed against the last accepted state, with one more validation.
      const both = applied(await revalidatePublisherFix(fixed, editionFix('3'), validate));
      expect(validateCalls.count).toBe(3);
      expect(counting(both.result)).toEqual([]);
      expect(publisherFixProvenance(both.result).map(({ action }) => action)).toEqual([
        'REPLACE_SHORT_DESCRIPTION',
        'SET_EDITION_NUMBER',
      ]);
      expect(permitsTargetPlanning(both.result)).toBe(true);
    });

    it('counts markup, and refuses a markup-only edit that stays over the limit', async () => {
      const body = `<p>${text(200)}</p><p><strong>${text(170)}</strong></p>`;
      const result = await canonical(message('Third, revised edition', textContent('02', body, '05')));
      const state = start(result);
      const eligibility = publisherFixEligibility(state, findingOf(result, SHORT_DESCRIPTION_LENGTH_RULE));

      expect(eligibility).toEqual(
        expect.objectContaining({
          shortDescription: expect.objectContaining({
            original: body,
            measure: { length: 401, limit: 350, withinLimit: false },
          }),
        }),
      );
      // Dropping the <strong> markup and the paragraph break leaves 377 characters including markup: still refused.
      const markupOnly = `<p>${text(200)}${text(170)}</p>`;
      expect(markupOnly).toHaveLength(377);
      expect(await revalidatePublisherFix(state, shortFix(markupOnly), validate)).toEqual({
        kind: 'REFUSED',
        reason: 'TEXT_OVER_LIMIT',
        state,
      });

      const shortened = `<p>${text(150)}</p><p><strong>${text(150)}</strong></p>`;
      const fixed = applied(await revalidatePublisherFix(state, shortFix(shortened), validate));
      // Stored as escaped HTML (02): the same markup as character data, which string-length counts in full.
      expect(fixed.result.normalized?.xml).toContain(`<Text textformat="02">${escaped(shortened)}</Text>`);
      expect(counting(fixed.result)).toEqual([[EDITION_STATEMENT_RULE, EDITION_DETAIL]]);
    });

    it('stores a corrected XHTML short description as escaped HTML, which re-validates clean and is imported', async () => {
      const body = `<p>${text(200)}</p><p><strong>${text(190)}</strong></p>`;
      const result = await canonical(message('Third, revised edition', textContent('02', body, '05')));
      const state = start(result);

      expect(publisherFixEligibility(state, findingOf(result, SHORT_DESCRIPTION_LENGTH_RULE))).toEqual(
        expect.objectContaining({
          shortDescription: expect.objectContaining({ original: body, storedAsEscapedHtml: true, canOmit: false }),
        }),
      );
      // 351 characters including markup is still refused.
      const over = `<p>${text(344)}</p>`;
      expect(measureShortDescription(over).length).toBe(351);
      expect(await revalidatePublisherFix(state, shortFix(over), validate)).toEqual({
        kind: 'REFUSED',
        reason: 'TEXT_OVER_LIMIT',
        state,
      });

      const corrected = `<p>A <strong>short</strong> description &amp; more.</p><p>${text(250)}</p>`;
      expect(measureShortDescription(corrected).withinLimit).toBe(true);
      const both = applied(
        await revalidatePublisherFix(
          applied(await revalidatePublisherFix(state, shortFix(corrected), validate)),
          editionFix(3),
          validate,
        ),
      );

      expect(both.result.sourceValid).toBe(true);
      expect(counting(both.result)).toEqual([]);
      expect(both.fixes[0]).toEqual(
        expect.objectContaining({
          action: 'REPLACE_SHORT_DESCRIPTION',
          original: body,
          originalTextFormat: '05',
          value: corrected,
          valueTextFormat: '02',
        }),
      );
      expect(both.result.normalized?.xml).toContain(`<Text textformat="02">${escaped(corrected)}</Text>`);

      const planned = await plannedAbstracts(both.result);
      expect(planned.unrepresentable).toEqual([]);
      expect(planned.abstracts).toEqual([
        expect.objectContaining({ type: 'SHORT', content: expect.stringContaining('<strong>short</strong>') }),
      ]);
    });

    it('refuses a corrected text the importer would not take, with nothing applied', async () => {
      const xhtml = await canonical(message('Third, revised edition', textContent('02', `<p>${text(400)}</p>`, '05')));
      const xhtmlState = start(xhtml);
      // Well-formed markup that renders nothing: the abstract normaliser imports nothing for it.
      expect(await revalidatePublisherFix(xhtmlState, shortFix('<p></p><p> </p>'), validate)).toEqual({
        kind: 'REFUSED',
        reason: 'TEXT_NOT_IMPORTABLE',
        state: xhtmlState,
      });

      // A plain-text short description whose correction keeps a line break inside a paragraph.
      const plain = await canonical(message('Third, revised edition', textContent('02', text(400))));
      const plainState = start(plain);
      expect(await revalidatePublisherFix(plainState, shortFix('Line one\nline two'), validate)).toEqual({
        kind: 'REFUSED',
        reason: 'TEXT_NOT_IMPORTABLE',
        state: plainState,
      });
      expect(plainState.result.normalized?.xml).toContain(text(400));
      expect(xhtmlState.result.normalized?.xml).toContain(`<Text textformat="05"><p>${text(400)}</p></Text>`);
      expect(validateCalls.count).toBe(0);
    });

    it('keeps a plain-text short description plain, and imports it', async () => {
      const result = await canonical(message('Third, revised edition', textContent('02', text(400))));
      const state = start(result);
      expect(publisherFixEligibility(state, findingOf(result, SHORT_DESCRIPTION_LENGTH_RULE))).toEqual(
        expect.objectContaining({ shortDescription: expect.objectContaining({ storedAsEscapedHtml: false }) }),
      );

      const both = applied(
        await revalidatePublisherFix(
          applied(await revalidatePublisherFix(state, shortFix(text(300)), validate)),
          editionFix(3),
          validate,
        ),
      );
      expect(both.fixes[0]).toEqual(
        expect.objectContaining({ originalTextFormat: '06', valueTextFormat: '06', value: text(300) }),
      );
      expect(both.result.normalized?.xml).toContain(`<Text textformat="06">${text(300)}</Text>`);
      const planned = await plannedAbstracts(both.result);
      expect(planned.unrepresentable).toEqual([]);
      expect(planned.abstracts).toEqual([{ type: 'SHORT', content: text(300).trim(), markupFormat: 'PLAIN_TEXT' }]);
    });

    it('rejects a fix that introduces a new blocking finding, with nothing applied', async () => {
      // A plain-text (06) short description given HTML markup: the importer would read it as HTML, but the standard
      // forbids markup under textformat 06 (_20180129_f_*), so re-validation finds a new blocking finding.
      const result = await canonical(message('Third, revised edition', textContent('02', text(400))));
      const state = start(result);

      const broken = await revalidatePublisherFix(state, shortFix('A <b>short</b> one.'), validate);

      expect(broken).toEqual({
        kind: 'REJECTED',
        reason: 'NEW_BLOCKING_FINDING',
        findings: [expect.objectContaining({ id: expect.stringMatching(/^_20180129_f_/), blocking: true })],
        state,
      });
      expect(broken.state).toBe(state);
      expect(state.result).toBe(result);
      expect(publisherFixProvenance(state.result)).toEqual([]);

      const xhtml = await canonical(message('Third, revised edition', textContent('02', `<p>${text(400)}</p>`, '05')));
      const xhtmlState = start(xhtml);

      expect(await revalidatePublisherFix(xhtmlState, shortFix('<p>Unclosed'), validate)).toEqual({
        kind: 'REFUSED',
        reason: 'MALFORMED_MARKUP',
        state: xhtmlState,
      });
    });

    it('offers "don\'t import a short description" only where the book keeps another description', async () => {
      const only = await canonical(message('Third, revised edition', textContent('02', text(400))));
      const onlyState = start(only);
      const omit: PublisherFix = {
        kind: 'OMIT_SHORT_DESCRIPTION',
        rule: SHORT_DESCRIPTION_LENGTH_RULE,
        path: SHORT_TEXT_CONTENT,
      };

      expect(publisherFixEligibility(onlyState, findingOf(only, SHORT_DESCRIPTION_LENGTH_RULE))).toEqual(
        expect.objectContaining({ shortDescription: expect.objectContaining({ canOmit: false }) }),
      );
      expect(await revalidatePublisherFix(onlyState, omit, validate)).toEqual({
        kind: 'REFUSED',
        reason: 'ONLY_DESCRIPTION',
        state: onlyState,
      });

      // The long description follows the short one, so leaving the short one out moves it to TextContent[1].
      const result = await canonical(
        message('Third, revised edition', textContent('02', text(400)) + textContent('03', 'A long description.')),
      );
      const state = start(result);
      expect(publisherFixEligibility(state, findingOf(result, SHORT_DESCRIPTION_LENGTH_RULE))).toEqual(
        expect.objectContaining({ shortDescription: expect.objectContaining({ canOmit: true }) }),
      );

      const fixed = applied(await revalidatePublisherFix(state, omit, validate));
      expect(fixed.result.normalized?.xml).not.toContain(text(400));
      expect(fixed.result.normalized?.xml).toContain('A long description.');
      expect(fixed.fixes).toEqual([
        expect.objectContaining({ action: 'OMIT_SHORT_DESCRIPTION', original: text(400), value: null }),
      ]);
      expect(fixed.removals).toEqual([
        { parentPath: `${PRODUCT}[2]/CollateralDetail[1]`, localName: 'TextContent', position: 1 },
      ]);
      expect(counting(fixed.result)).toEqual([[EDITION_STATEMENT_RULE, EDITION_DETAIL]]);
    });
  });

  describe('namespace-prefixed sources (review R1)', () => {
    /** The same message with the ONIX namespace bound to the prefix `onix`, every element prefixed, XHTML included. */
    const prefixed = (xml: string, namespace = REFERENCE_NS) =>
      xml
        .replace(`xmlns="${namespace}"`, `xmlns:onix="${namespace}"`)
        .replace(/<(\/?)([A-Za-z][\w.-]*)(?=[\s/>])/g, '<$1onix:$2');
    const XHTML_BODY = `<p>${text(200)}</p><p><strong>${text(190)}</strong></p>`;

    it.each([
      ['Reference', (xml: string) => prefixed(xml)],
      ['Short', (xml: string) => prefixed(toShort(xml), SHORT_NS)],
    ])(
      '%s: offers bare HTML names, measures them, refuses a prefixed element, and imports <p>Short.</p>',
      async (_flavour, flavour) => {
        const source = flavour(message('Third, revised edition', textContent('02', XHTML_BODY, '05')));
        expect(source).toContain('<onix:p>');
        const result = await canonical(source);
        const state = start(result);
        const eligibility = publisherFixEligibility(state, findingOf(result, SHORT_DESCRIPTION_LENGTH_RULE));

        // The editor shows the HTML the publisher knows - no prefix, no declaration - and counts that.
        expect(eligibility).toEqual(
          expect.objectContaining({
            shortDescription: expect.objectContaining({
              original: XHTML_BODY,
              measure: { length: [...XHTML_BODY].length, limit: 350, withinLimit: false },
              storedAsEscapedHtml: true,
            }),
          }),
        );

        expect(await revalidatePublisherFix(state, shortFix('<onix:p>Short.</onix:p>'), validate)).toEqual({
          kind: 'REFUSED',
          reason: 'TEXT_NOT_IMPORTABLE',
          state,
        });
        expect(validateCalls.count).toBe(0);

        const both = applied(
          await revalidatePublisherFix(
            applied(await revalidatePublisherFix(state, shortFix('<p>Short.</p>'), validate)),
            editionFix(3),
            validate,
          ),
        );
        expect(both.result.sourceValid).toBe(true);
        expect(both.fixes[0]).toEqual(
          expect.objectContaining({
            original: XHTML_BODY,
            originalTextFormat: '05',
            value: '<p>Short.</p>',
            valueTextFormat: '02',
          }),
        );
        const planned = await plannedAbstracts(both.result);
        expect(planned.unrepresentable).toEqual([]);
        expect(planned.abstracts).toEqual([{ type: 'SHORT', content: '<p>Short.</p>', markupFormat: 'HTML' }]);
      },
    );

    it('refuses script, event attributes and markup outside the subset through the bridge, with nothing applied', async () => {
      const result = await canonical(message('Third, revised edition', textContent('02', XHTML_BODY, '05')));
      const state = start(result);
      for (const value of ['<p>Short.</p><script>alert(1)</script>', '<p onclick="alert(1)">Short.</p>']) {
        expect(await revalidatePublisherFix(state, shortFix(value), validate)).toEqual({
          kind: 'REFUSED',
          reason: 'TEXT_NOT_IMPORTABLE',
          state,
        });
      }
      expect(validateCalls.count).toBe(0);
      const accepted = applied(
        await revalidatePublisherFix(
          state,
          shortFix('<p>A <em>short</em> one.</p><ul><li>One</li><li>Two</li></ul><p>Line<br/>break</p>'),
          validate,
        ),
      );
      expect(counting(accepted.result)).toEqual([[EDITION_STATEMENT_RULE, EDITION_DETAIL]]);
    });
  });

  describe('the XHTML content model and attribute types (review R3)', () => {
    const XHTML_BODY = `<p>${text(200)}</p><p><strong>${text(190)}</strong></p>`;
    const xhtmlSource = () => canonical(message('Third, revised edition', textContent('02', XHTML_BODY, '05')));

    it.each([
      ['a list item outside a list', '<li>Short.</li>'],
      ['a table cell outside a table', '<td>Short.</td>'],
      ['a paragraph inside a paragraph', '<p>a<p>b</p></p>'],
      ['a link inside a link', '<p><a href="https://example.org/">a <a href="https://example.org/b">b</a></a></p>'],
      ['a division inside a paragraph', '<p><div>Short.</div></p>'],
      ['a dir outside ltr and rtl', '<p dir="sideways">Short.</p>'],
      ['a duplicate id', '<p id="x">a</p><p id="x">b</p>'],
    ])('refuses %s after a schema probe of its element form, with nothing applied', async (_label, value) => {
      const result = await xhtmlSource();
      const state = start(result);

      expect(await revalidatePublisherFix(state, shortFix(value), validate)).toEqual({
        kind: 'REFUSED',
        reason: 'TEXT_NOT_IMPORTABLE',
        state,
      });
      // The baseline and the one schema probe of the element form; the escaped form is never validated or stored.
      expect(validateCalls.count).toBe(2);
      expect(state.result).toBe(result);
      expect(publisherFixProvenance(state.result)).toEqual([]);
    });

    it.each([
      [
        'a paragraph with emphasis, strong and a link',
        '<p>A <em>short</em>, <strong>strong</strong> <a href="https://example.org/">link</a>.</p>',
        '<a href="https://example.org/">link</a>',
      ],
      ['an unordered list', '<p>Two points:</p><ul><li>One</li><li>Two</li></ul>', '<li>Two</li>'],
      ['an ordered list', '<ol><li>First</li><li>Second</li></ol>', '<li>Second</li>'],
      ['a definition list', '<dl><dt>Term</dt><dd>Definition</dd></dl>', '<dd>Definition</dd>'],
      ['a table', '<table><tbody><tr><td>Cell</td></tr></tbody></table>', '<td>Cell</td>'],
    ])('accepts and imports %s', async (_label, value, imported) => {
      const result = await xhtmlSource();
      const state = applied(await revalidatePublisherFix(start(result), shortFix(value), validate));
      // Baseline, the schema probe of the element form, and the escaped form: one extra validation.
      expect(validateCalls.count).toBe(3);
      const both = applied(await revalidatePublisherFix(state, editionFix(3), validate));
      expect(both.result.sourceValid).toBe(true);

      const planned = await plannedAbstracts(both.result);
      expect(planned.unrepresentable).toEqual([]);
      expect(planned.abstracts).toEqual([
        expect.objectContaining({ type: 'SHORT', content: expect.stringContaining(imported) }),
      ]);
    });
  });

  describe('an escaped-HTML (02) short description is held to the XHTML subset too (CTO, 2026-11-07)', () => {
    const HTML_BODY = `<p>${text(380)}</p>`;
    const escapedSource = () =>
      canonical(message('Third, revised edition', textContent('02', escaped(HTML_BODY), '02')));

    it('offers the HTML as the file states it, as escaped character data', async () => {
      const result = await escapedSource();
      expect(publisherFixEligibility(start(result), findingOf(result, SHORT_DESCRIPTION_LENGTH_RULE))).toEqual(
        expect.objectContaining({
          shortDescription: expect.objectContaining({ original: HTML_BODY, storedAsEscapedHtml: false }),
        }),
      );
    });

    it('refuses script, event attributes and markup outside the subset, with nothing validated', async () => {
      const result = await escapedSource();
      const state = start(result);
      for (const value of [
        '<p>Short.</p><script>alert(1)</script>',
        '<p onclick="alert(1)">Short.</p>',
        '<p onclick="x()">hi</p><script>alert(1)</script><a href="javascript:1">l</a>',
        '<p>ok<img src="x" onerror="alert(1)"/></p>',
      ]) {
        expect(await revalidatePublisherFix(state, shortFix(value), validate)).toEqual({
          kind: 'REFUSED',
          reason: 'TEXT_NOT_IMPORTABLE',
          state,
        });
      }
      expect(await revalidatePublisherFix(state, shortFix('<p>Short.<br></p>'), validate)).toEqual({
        kind: 'REFUSED',
        reason: 'MALFORMED_MARKUP',
        state,
      });
      expect(validateCalls.count).toBe(0);
      expect(publisherFixProvenance(state.result)).toEqual([]);
    });

    it('refuses a breach of the content model after a schema probe of its element form', async () => {
      const result = await escapedSource();
      const state = start(result);

      expect(await revalidatePublisherFix(state, shortFix('<p>a<p>b</p></p>'), validate)).toEqual({
        kind: 'REFUSED',
        reason: 'TEXT_NOT_IMPORTABLE',
        state,
      });
      // The baseline and the one schema probe of the element form; the escaped form is never validated or stored.
      expect(validateCalls.count).toBe(2);
      expect(state.result).toBe(result);
    });

    it('accepts subset markup, keeps it escaped HTML (02) and imports it', async () => {
      const result = await escapedSource();
      const value = '<p>A <em>short</em> one &amp; more.</p>';
      const state = applied(await revalidatePublisherFix(start(result), shortFix(value), validate));
      // Baseline, the schema probe of the element form, and the escaped form: one extra validation.
      expect(validateCalls.count).toBe(3);
      const both = applied(await revalidatePublisherFix(state, editionFix(3), validate));
      expect(both.result.sourceValid).toBe(true);
      expect(both.fixes[0]).toEqual(
        expect.objectContaining({ original: HTML_BODY, originalTextFormat: '02', value, valueTextFormat: '02' }),
      );

      const planned = await plannedAbstracts(both.result);
      expect(planned.unrepresentable).toEqual([]);
      expect(planned.abstracts).toEqual([{ type: 'SHORT', content: value, markupFormat: 'HTML' }]);
    });

    it('refuses a javascript: link typed into a 02 or a 05 original, with nothing validated', async () => {
      for (const format of ['02', '05']) {
        const body = format === '02' ? escaped(HTML_BODY) : HTML_BODY;
        const result = await canonical(message('Third, revised edition', textContent('02', body, format)));
        const state = start(result);
        expect(
          await revalidatePublisherFix(state, shortFix('<p><a href="javascript:alert(1)">Short.</a></p>'), validate),
        ).toEqual({ kind: 'REFUSED', reason: 'TEXT_NOT_IMPORTABLE', state });
      }
      expect(validateCalls.count).toBe(0);
    });

    it('stores text with no markup as typed: it is plain text, so no subset check or probe runs', async () => {
      const result = await escapedSource();
      const value = 'Tom & Jerry, < 3 friends.';
      const state = applied(await revalidatePublisherFix(start(result), shortFix(value), validate));
      expect(validateCalls.count).toBe(2);
      expect(state.fixes[0]).toEqual(expect.objectContaining({ value, valueTextFormat: '02' }));

      const both = applied(await revalidatePublisherFix(state, editionFix(3), validate));
      const planned = await plannedAbstracts(both.result);
      expect(planned.abstracts).toEqual([{ type: 'SHORT', content: value, markupFormat: 'PLAIN_TEXT' }]);
    });
  });

  describe("a chapter's description is never the book's (review F1)", () => {
    const CHAPTER = `${PRODUCT}[2]/ContentDetail[1]/ContentItem[1]`;
    const chapter = (texts: string) =>
      '<ContentItem><LevelSequenceNumber>1</LevelSequenceNumber><TextItem><TextItemType>03</TextItemType></TextItem>' +
      '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>04</TitleElementLevel>' +
      `<TitleText>A chapter</TitleText></TitleElement></TitleDetail>${texts}</ContentItem>`;
    const omit = (path: string): PublisherFix => ({
      kind: 'OMIT_SHORT_DESCRIPTION',
      rule: SHORT_DESCRIPTION_LENGTH_RULE,
      path,
    });

    it("refuses to leave out the book's only short description because a chapter has a description", async () => {
      const result = await canonical(
        message(
          'Third, revised edition',
          textContent('02', text(400)) + textContent('13', 'A notice.'),
          chapter(textContent('03', 'A chapter description.')),
        ),
      );
      const state = start(result);

      expect(counting(result)).toEqual([
        [SHORT_DESCRIPTION_LENGTH_RULE, SHORT_TEXT_CONTENT],
        [EDITION_STATEMENT_RULE, EDITION_DETAIL],
      ]);
      expect(publisherFixEligibility(state, findingOf(result, SHORT_DESCRIPTION_LENGTH_RULE))).toEqual(
        expect.objectContaining({ shortDescription: expect.objectContaining({ canOmit: false }) }),
      );
      expect(await revalidatePublisherFix(state, omit(SHORT_TEXT_CONTENT), validate)).toEqual({
        kind: 'REFUSED',
        reason: 'ONLY_DESCRIPTION',
        state,
      });
      expect(validateCalls.count).toBe(0);
    });

    it("refuses to leave out a chapter's only short description because the book has a description", async () => {
      const result = await canonical(
        message(
          'Third, revised edition',
          textContent('03', 'The book description.'),
          chapter(textContent('02', text(400))),
        ),
      );
      const state = start(result);
      const finding = result.findings.find(
        (f) => f.id === SHORT_DESCRIPTION_LENGTH_RULE && f.path === `${CHAPTER}/TextContent[1]`,
      );

      expect(finding?.counts).toBe(true);
      expect(publisherFixEligibility(state, finding!)).toEqual(
        expect.objectContaining({ shortDescription: expect.objectContaining({ canOmit: false }) }),
      );
      expect(await revalidatePublisherFix(state, omit(`${CHAPTER}/TextContent[1]`), validate)).toEqual({
        kind: 'REFUSED',
        reason: 'ONLY_DESCRIPTION',
        state,
      });
    });
  });

  describe('the layer refuses what it was not approved for', () => {
    it('refuses a rule outside the v1 allowlist, a missing finding and an unavailable re-validation', async () => {
      const result = await canonical(message('Third, revised edition', textContent('02', text(400))));
      const state = start(result);

      const notAllowlisted = { ...editionFix(3), rule: '_20190410_c_2' } as unknown as PublisherFix;
      expect(await revalidatePublisherFix(state, notAllowlisted, validate)).toEqual({
        kind: 'REFUSED',
        reason: 'RULE_NOT_ALLOWLISTED',
        state,
      });
      expect(
        await revalidatePublisherFix(state, { ...editionFix(3), path: `${PRODUCT}[2]/DescriptiveDetail[1]` }, validate),
      ).toEqual({
        kind: 'REFUSED',
        reason: 'NO_FINDING',
        state,
      });
      // The edition rule bound to the short-description finding's location is not a fix of that finding.
      expect(await revalidatePublisherFix(state, { ...editionFix(3), path: SHORT_TEXT_CONTENT }, validate)).toEqual({
        kind: 'REFUSED',
        reason: 'NO_FINDING',
        state,
      });
      expect(validateCalls.count).toBe(0);

      // A validation that throws (a Worker that failed) proves nothing either: nothing is applied.
      const failing = async (): Promise<OnixWorkerResult> => {
        throw new Error('worker failed');
      };
      const thrown = await revalidatePublisherFix(state, editionFix(3), failing);
      expect(thrown).toEqual({ kind: 'REJECTED', reason: 'REVALIDATION_UNAVAILABLE', findings: [], state });
      expect(thrown.state).toBe(state);
      // ...also when only the validation with the fix fails.
      let calls = 0;
      const failingSecond = async (bytes: Uint8Array) => {
        calls += 1;
        if (calls === 2) throw new Error('worker failed');
        return validate(bytes);
      };
      expect(await revalidatePublisherFix(state, editionFix(3), failingSecond)).toEqual({
        kind: 'REJECTED',
        reason: 'REVALIDATION_UNAVAILABLE',
        findings: [],
        state,
      });

      const stopped: OnixWorkerResult = { ...result, status: 'STOPPED', normalized: null, sourceValid: false };
      expect(await revalidatePublisherFix(state, editionFix(3), async () => stopped)).toEqual({
        kind: 'REJECTED',
        reason: 'REVALIDATION_UNAVAILABLE',
        findings: [],
        state,
      });
    });

    it('never touches the uploaded bytes: a fresh validation of the original file shows the original findings', async () => {
      const uploaded = new TextEncoder().encode(message('Third, revised edition', textContent('02', text(526))));
      const copy = uploaded.slice();
      const result = toWorkerResult(await validator.validate(uploaded));

      let state = start(result);
      state = applied(await revalidatePublisherFix(state, editionFix(3), validate));
      state = applied(await revalidatePublisherFix(state, shortFix(text(300)), validate));
      expect(permitsTargetPlanning(state.result)).toBe(true);

      expect(uploaded).toEqual(copy);
      const again = toWorkerResult(await validator.validate(uploaded));
      expect(again).toEqual(result);
      expect(counting(again)).toEqual([
        [SHORT_DESCRIPTION_LENGTH_RULE, SHORT_TEXT_CONTENT],
        [EDITION_STATEMENT_RULE, EDITION_DETAIL],
      ]);
    });
  });
});
