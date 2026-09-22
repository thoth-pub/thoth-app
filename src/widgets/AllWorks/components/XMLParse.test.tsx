import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ONIXMessageRoot } from '@5stones/onix/dist/interfaces';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getDefaultContribution, PublicationType, WorkTypes } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context/servicesContext';
import type { ExtendedONIXMessageRoot } from '@/src/shared/parsers/XMLParser/interfaces';
import { descriptiveLookupRequests } from '@/src/shared/parsers/XMLParser/onixDescriptive';
import {
  classifyEngine,
  type ClientToWorkerMessage,
  createOnixSourceValidator,
  ENGINE_ENVELOPES,
  type EngineClass,
  type EnvelopeEvidence,
  type EnvelopeVerdict,
  ONIX_WORKER_PROTOCOL_VERSION,
  type OnixWorkerResult,
  type RecoveryMarker,
  type SourceFinding,
  type WorkerToClientMessage,
} from '@/src/shared/parsers/XMLParser/validation';
import { createExecutionControls } from '@/src/shared/parsers/XMLParser/validation/worker/execution';
import { createWorkerSession } from '@/src/shared/parsers/XMLParser/validation/worker/session';
import { ONIX_PROCESSING_FAILURE_MESSAGE, type XMLParserOptions } from '@/src/shared/parsers/XMLParser/XMLParser';
import type { ImportIssue, ImportIssueCode, ImportParseResult, ImportPlan } from '@/src/shared/types';
import { importIdentifierKey } from '@/src/shared/utils/importPreflight/identifiers';
import { getDefaultPublication } from '@/src/shared/utils/publications';
import { getDefaultTitle, getDefaultWork } from '@/src/shared/utils/work';

const {
  mockRawParse,
  mockParse,
  mockXMLParser,
  mockReduceOnixRights,
  mockReduceOnixCommercial,
  mockReduceOnixSalesRights,
  mockReduceOnixAccessibility,
  publisherState,
} = vi.hoisted(() => ({
  mockRawParse: vi.fn(),
  mockParse: vi.fn(),
  mockXMLParser: vi.fn(),
  mockReduceOnixRights: vi.fn(),
  mockReduceOnixCommercial: vi.fn(),
  mockReduceOnixSalesRights: vi.fn(),
  mockReduceOnixAccessibility: vi.fn(),
  publisherState: { activePublisher: { id: 'publisher-1' } as { id: string } | null },
}));

vi.mock('@5stones/onix/dist/parse', () => ({
  parse: (...args: unknown[]) => mockRawParse(...args),
}));

vi.mock('@/src/shared/parsers', () => ({
  XMLParser: mockXMLParser,
}));

// The canonical rights reduction runs for real; the spy only records when, and on what, it runs (thoth-app#211).
vi.mock('@/src/shared/parsers/XMLParser/onixRights', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/src/shared/parsers/XMLParser/onixRights')>();

  mockReduceOnixRights.mockImplementation(actual.reduceOnixRights);

  return { ...actual, reduceOnixRights: mockReduceOnixRights };
});

// So does the canonical commercial reduction: the spy only records when, and on what, it runs (thoth-app#215).
vi.mock('@/src/shared/parsers/XMLParser/onixCommercial', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/src/shared/parsers/XMLParser/onixCommercial')>();

  mockReduceOnixCommercial.mockImplementation(actual.reduceOnixCommercial);

  return { ...actual, reduceOnixCommercial: mockReduceOnixCommercial };
});

// And the canonical sales-rights and contact reduction (thoth-app#217).
vi.mock('@/src/shared/parsers/XMLParser/onixSalesRights', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/src/shared/parsers/XMLParser/onixSalesRights')>();

  mockReduceOnixSalesRights.mockImplementation(actual.reduceOnixSalesRights);

  return { ...actual, reduceOnixSalesRights: mockReduceOnixSalesRights };
});

vi.mock('@/src/shared/parsers/XMLParser/onixAccessibility', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/src/shared/parsers/XMLParser/onixAccessibility')>();

  mockReduceOnixAccessibility.mockImplementation(actual.reduceOnixAccessibility);

  return { ...actual, reduceOnixAccessibility: mockReduceOnixAccessibility };
});

vi.mock('@/src/entities/publisher', () => ({
  usePublisherStateMachine: vi.fn(() => ({ activePublisher: publisherState.activePublisher })),
}));

// Interpolation values stay visible in the rendered text, so issue messages can be checked for what they carry.
vi.mock('@/src/shared/hooks', () => ({
  useTypedTranslation: vi.fn(() => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key),
  })),
}));

import { XMLParse } from './XMLParse';

type WorkerListener = (event: { readonly data?: WorkerToClientMessage; readonly message?: string }) => void;

/**
 * Stands in for the browser `Worker` global. The uploader constructs it exactly as it constructs the real
 * dedicated validation Worker, and the real #196 client drives it; each test scripts what the Worker sends.
 */
class FakeWorker {
  static instances: FakeWorker[] = [];
  /** The engine the Worker reports as soon as it boots, or `null` to boot it by hand. */
  static engine: EngineClass | null = 'chromium';
  static reply: ((worker: FakeWorker, message: ClientToWorkerMessage) => void) | null = null;
  static onConstruct: ((worker: FakeWorker) => void) | null = null;

  readonly received: ClientToWorkerMessage[] = [];
  readonly sent: WorkerToClientMessage[] = [];
  terminated = 0;
  handle: ((message: ClientToWorkerMessage) => void) | null = null;
  private readonly listeners = { message: new Set<WorkerListener>(), error: new Set<WorkerListener>() };

  constructor(
    readonly url: string | URL,
    readonly options?: WorkerOptions,
  ) {
    FakeWorker.instances.push(this);
    FakeWorker.onConstruct?.(this);
    const { engine } = FakeWorker;
    if (engine) setTimeout(() => this.boot(engine), 0);
  }

  get types() {
    return this.received.map(({ type }) => type);
  }

  boot(engine: EngineClass) {
    this.emit({ type: 'ready', protocolVersion: ONIX_WORKER_PROTOCOL_VERSION, engine, userAgent: 'test' });
  }

  addEventListener(type: 'message' | 'error', listener: WorkerListener) {
    this.listeners[type].add(listener);
  }

  postMessage(message: ClientToWorkerMessage) {
    this.received.push(message);
    if (this.handle) return this.handle(message);
    const { reply } = FakeWorker;
    if (reply) setTimeout(() => reply(this, message), 0);
  }

  terminate() {
    this.terminated += 1;
  }

  /** Delivers a message as the Worker would, including one still queued when the Worker was terminated. */
  emit(data: WorkerToClientMessage) {
    this.sent.push(data);
    for (const listener of this.listeners.message) listener({ data });
  }

  crash(message: string) {
    for (const listener of this.listeners.error) listener({ message });
  }
}

const REFERENCE_NS = 'http://ns.editeur.org/onix/3.0/reference';
const NORMALIZED_XML =
  `<ONIXMessage release="3.0" xmlns="${REFERENCE_NS}"><Header><Sender><SenderName>T</SenderName></Sender>` +
  '<SentDateTime>20260911T1200</SentDateTime></Header><Product><RecordReference>r0</RecordReference>' +
  '<NotificationType>03</NotificationType></Product></ONIXMessage>';

const finding = (overrides: Partial<SourceFinding> = {}): SourceFinding => ({
  id: '_20171218_f_2',
  tier: 'STRICT',
  stage: 6,
  scope: 'VALIDITY',
  class: 'NORMATIVE_INVALID',
  blocking: true,
  projection: 'AUTHORITATIVE',
  recoverability: 'NOT_RECOVERABLE',
  counts: true,
  path: '/ONIXMessage[1]/Product[1]/DescriptiveDetail[1]/Language[2]',
  sourcePath: '/ONIXMessage[1]/Product[1]/DescriptiveDetail[1]/Language[2]',
  message: 'LanguageRole 01 and 02 carry the same LanguageCode',
  ...overrides,
});

const summaryOf = (findings: readonly SourceFinding[]) => ({
  total: findings.length,
  blocking: findings.filter((f) => f.counts).length,
  secondary: findings.filter((f) => f.projection === 'SECONDARY').length,
  notEvaluable: findings.filter((f) => f.class === 'RULE_NOT_EVALUABLE').length,
  recovered: findings.filter((f) => f.recoverability !== 'NOT_RECOVERABLE').length,
});

const completed = (
  findings: readonly SourceFinding[] = [],
  recoveries: readonly RecoveryMarker[] = [],
  xml = NORMALIZED_XML,
): OnixWorkerResult => ({
  status: 'COMPLETED',
  stop: null,
  source: { release: '3.0', schemaRelease: '3.0.8', flavour: 'reference', namespaceURI: REFERENCE_NS },
  findings,
  summary: summaryOf(findings),
  sourceValid: findings.every((f) => !f.counts),
  normalized: { xml, elementCount: 9, recoveries, provenance: { kind: 'IDENTITY', flavour: 'reference' } },
});

const stopped = (stage: 1 | 2, stop: SourceFinding): OnixWorkerResult => ({
  status: 'STOPPED',
  stop: { stage, text: stop.message ?? stop.id },
  source: null,
  findings: [stop],
  summary: summaryOf([stop]),
  sourceValid: false,
  normalized: null,
});

const envelopeOf = (verdict: EnvelopeVerdict, overrides: Partial<EnvelopeEvidence> = {}): EnvelopeEvidence => ({
  engine: 'chromium',
  bytes: 1_234,
  products: { measured: true, count: 1 },
  verdict,
  limits: ENGINE_ENVELOPES.chromium,
  exceeded: [],
  ...overrides,
});

type Reply = (runId: string) => WorkerToClientMessage;

const resultReply =
  (result: OnixWorkerResult, envelope: EnvelopeEvidence | null = envelopeOf('NORMAL')): Reply =>
  (runId) => ({ type: 'result', runId, result, envelope });

/** Answers the session's `begin`, and its continuation after a warning, with scripted Worker messages. */
const answer =
  (onBegin: Reply, onContinue?: Reply) =>
  (worker: FakeWorker, message: ClientToWorkerMessage): void => {
    if (message.type === 'begin') worker.emit(onBegin(message.runId));
    else if (message.type === 'continue' && onContinue) worker.emit(onContinue(message.runId));
  };

function xmlFile(content = '<ONIXMessage/>', name = 'test.xml') {
  const file = new File([content], name, { type: 'text/xml' });
  const text = vi.fn(async () => content);
  const arrayBuffer = vi.fn(async () => new TextEncoder().encode(content).buffer as ArrayBuffer);
  Object.defineProperty(file, 'text', { configurable: true, value: text });
  Object.defineProperty(file, 'arrayBuffer', { configurable: true, value: arrayBuffer });
  return { file, text, arrayBuffer };
}

const handlers = () => ({ onValidationFailure: vi.fn(), onCancel: vi.fn(), onPreview: vi.fn() });

const parseElement = (file: File, callbacks: ReturnType<typeof handlers>, key = 'selection-1') => (
  <XMLParse key={key} file={file} imprints={[]} serieses={[]} {...callbacks} />
);

const renderXMLParse = (file: File, callbacks = handlers()) => ({
  callbacks,
  ...render(parseElement(file, callbacks)),
});

/** The lookups the target side may make: contributors, institutions, and Thoth's existing Works by exact identifier. */
const services = {
  contributorService: { getContributors: vi.fn(), getContributorsByOrcids: vi.fn() },
  institutionService: { getInstitutions: vi.fn() },
  importPreflightService: { findExistingIdentifierMatches: vi.fn() },
  workService: { getWork: vi.fn() },
  /** Read back only for the emails of the publisher's existing Accessibility contacts (thoth-app#217). */
  publisherService: { getPublisher: vi.fn() },
};

/** Every contributor, institution or existing-Work lookup any rendered uploader could have made. */
const lookupCalls = () =>
  vi
    .mocked(useServices)
    .mock.results.flatMap(({ value }) => {
      const { contributorService, institutionService, importPreflightService, workService, publisherService } =
        value as Record<string, Record<string, unknown>>;
      return [
        ...Object.values(contributorService),
        ...Object.values(institutionService),
        ...Object.values(importPreflightService ?? {}),
        ...Object.values(workService ?? {}),
        ...Object.values(publisherService ?? {}),
      ];
    })
    .filter((fn) => vi.isMockFunction(fn))
    .reduce((calls, fn) => calls + vi.mocked(fn).mock.calls.length, 0);

const expectNoTargetWork = () => {
  expect(mockRawParse).not.toHaveBeenCalled();
  expect(mockReduceOnixRights).not.toHaveBeenCalled();
  expect(mockReduceOnixCommercial).not.toHaveBeenCalled();
  expect(mockReduceOnixSalesRights).not.toHaveBeenCalled();
  expect(mockReduceOnixAccessibility).not.toHaveBeenCalled();
  expect(mockXMLParser).not.toHaveBeenCalled();
  expect(mockParse).not.toHaveBeenCalled();
  expect(lookupCalls()).toBe(0);
};

const failureIssues = (callbacks: ReturnType<typeof handlers>): ImportIssue[] =>
  callbacks.onValidationFailure.mock.calls[0][0];

const tick = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 20)));

const parsedOnixData: ONIXMessageRoot = {
  ONIXMessage: {
    Product: [],
  },
};

const IMPRINTS = [{ label: 'Example Imprint', value: 'imprint-1' }];

/** The least a Work is described by: a title in a stated language, and a publishing status (thoth-app#183). */
const DESCRIBED = {
  DescriptiveDetail: {
    ProductForm: 'BC',
    TitleDetail: {
      TitleType: '01',
      TitleElement: { TitleElementLevel: '01', TitleText: { '#text': 'A Work', '@_language': 'eng' } },
    },
  },
  PublishingDetail: { PublishingStatus: '02' },
  ContentDetail: {
    ContentItem: {
      LevelSequenceNumber: '1',
      TextItem: { TextItemType: '03' },
      TitleDetail: {
        TitleType: '01',
        TitleElement: { TitleElementLevel: '04', TitleText: { '#text': 'A Chapter', '@_language': 'eng' } },
      },
    },
  },
};

/**
 * One complete, described paperback record with no identifier Thoth could match: planned from the file alone, it
 * is one new Work with one chapter, whose only open decision is its WorkType.
 */
const plannableOnixData = {
  ONIXMessage: { Product: [{ RecordReference: 'r0', NotificationType: '03', ...DESCRIBED }] },
} as unknown as ExtendedONIXMessageRoot;

/**
 * What the real adapter returns for the Work groups XMLParse asks it to adapt: the candidate plan, and for each
 * group of the source plan it was handed - in order, one per candidate Work - the Paperback its Product became.
 */
const adaptedParse =
  (plan: ImportPlan, issues: ImportIssue[] = [], contributorsForSelection = {}) =>
  async (options?: XMLParserOptions): Promise<ImportParseResult> => ({
    status: 'success',
    data: {
      plan,
      contributorsForSelection,
      onix: {
        sourcePlan: options!.sourcePlan!,
        groups: options!.sourcePlan!.groups.flatMap((group, index) =>
          plan.works[index] === undefined
            ? []
            : [
                {
                  groupKey: group.groupKey,
                  workId: plan.works[index].id,
                  conflictingFields: [],
                  // Thoth holds nothing the descriptive reductions ask about; the plan's chapters are its chapters.
                  descriptive: (() => {
                    const requests = descriptiveLookupRequests(options!.descriptive!, group.groupKey);

                    return {
                      contributors: Object.fromEntries(
                        requests.contributors.map(({ key }) => [key, { orcidMatch: null, alternatives: [] }]),
                      ),
                      institutions: Object.fromEntries(
                        requests.rors.map((ror) => [ror, { kind: 'NOT_FOUND' as const }]),
                      ),
                      funders: Object.fromEntries(
                        requests.funders.map(({ key }) => [key, { kind: 'NOT_FOUND' as const }]),
                      ),
                      institutionCandidates: Object.fromEntries(
                        requests.institutionSearches.map(({ text }) => [text, []]),
                      ),
                      chapterWorkIds: Object.fromEntries(
                        requests.chapterPaths.flatMap((path, chapterIndex) =>
                          plan.chapters[chapterIndex] === undefined ? [] : [[path, plan.chapters[chapterIndex].id]],
                        ),
                      ),
                    };
                  })(),
                  publications: Object.fromEntries(
                    group.productKeys.map((productKey) => [
                      productKey,
                      {
                        [PublicationType.enum.Paperback]: {
                          publication: getDefaultPublication({ type: PublicationType.enum.Paperback }),
                          issues: [],
                        },
                      },
                    ]),
                  ),
                },
              ],
        ),
      },
    },
    issues,
  });

/** The only plan XMLParse ever previews: the resolver's, for the WorkType the publisher chose. */
const resolvedFrom = (plan: ImportPlan, type: string = WorkTypes.enum.Monograph) =>
  expect.objectContaining({
    works: plan.works.map(({ id }) => expect.objectContaining({ id, type })),
    chapters: plan.chapters.map(({ id }) => expect.objectContaining({ id })),
    series: plan.series,
    onix: expect.objectContaining({ kind: 'onix', executable: true }),
  });

/** The WorkType decision of a one-Work file: the one control the planning panel offers for it (#209). */
const WORK_TYPE_CONTROL = { name: /^onixPlan\.workType\.workLabel/ };

/** Answers the one decision a plannable file leaves open, as the publisher does in the planning panel. */
const chooseWorkType = async (type: string = WorkTypes.enum.Monograph) =>
  userEvent.selectOptions(await screen.findByRole('combobox', WORK_TYPE_CONTROL), type);

const PUBLIC_DIR = join(process.cwd(), 'public', 'onix-validation');
const FIXTURES = join(process.cwd(), 'src', 'shared', 'parsers', 'XMLParser', 'validation', '__fixtures__', 'spike02');
const fixture = (path: string) => readFileSync(join(FIXTURES, path), 'utf8');

const CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36';

/** The production Worker entry's wiring (`onix.worker.ts`) around the real #196 session and #190 validator, in-process. */
const wireRealSession = (userAgent: string) => {
  FakeWorker.engine = null;
  FakeWorker.onConstruct = (worker) => {
    const session = createWorkerSession({
      post: (message) =>
        setTimeout(() => {
          if (!worker.terminated) worker.emit(message);
        }, 0),
      userAgent,
      createValidator: (controls) =>
        createOnixSourceValidator({
          loadResource: async (fileName) => new Uint8Array(readFileSync(join(PUBLIC_DIR, fileName))),
          execution: createExecutionControls(controls),
        }),
    });
    worker.handle = (message) => {
      if (!worker.terminated) void session.handle(message);
    };
    setTimeout(() => worker.boot(classifyEngine(userAgent)), 0);
  };
};

describe('XMLParse', () => {
  // The project does not enable vitest globals, so RTL's auto-cleanup does not run.
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    FakeWorker.instances = [];
    FakeWorker.engine = 'chromium';
    FakeWorker.onConstruct = null;
    FakeWorker.reply = answer(resultReply(completed()));
    vi.stubGlobal('Worker', FakeWorker);
    publisherState.activePublisher = { id: 'publisher-1' };
    vi.mocked(useServices).mockImplementation(() => services as never);
    services.importPreflightService.findExistingIdentifierMatches.mockResolvedValue(new Map());
    mockRawParse.mockReturnValue(parsedOnixData);
    mockParse.mockImplementation(adaptedParse({ works: [], chapters: [], series: [] }));
    // The adapter is handed the source plan and the groups to adapt as its last argument; `parse` sees them too.
    mockXMLParser.mockImplementation(function (...args: unknown[]) {
      return {
        parse: () => mockParse(args[8]),
      };
    });
  });

  describe('canonical source gate', () => {
    it('validates the raw bytes in one dedicated Worker before any target adapter, parser or lookup runs', async () => {
      const order: string[] = [];
      const source = `<ONIXMessage release="3.0" xmlns="${REFERENCE_NS}"><Product/></ONIXMessage>`;
      const { file, text, arrayBuffer } = xmlFile(source);
      FakeWorker.onConstruct = () => order.push('worker');
      const reply = answer(resultReply(completed()));
      FakeWorker.reply = (worker, message) => {
        order.push(`worker:${message.type}`);
        reply(worker, message);
      };
      mockRawParse.mockImplementation(() => {
        order.push('adapter');
        return parsedOnixData;
      });
      mockXMLParser.mockImplementation(function (...args: unknown[]) {
        order.push('target');
        return { parse: () => mockParse(args[8]) };
      });

      renderXMLParse(file);

      await waitFor(() => expect(mockParse).toHaveBeenCalledOnce());
      expect(order).toEqual(['worker', 'worker:begin', 'adapter', 'target']);

      expect(FakeWorker.instances).toHaveLength(1);
      const [worker] = FakeWorker.instances;
      // The one statically discoverable production entry, as a module Worker (Vite's own Worker detection rewrites
      // the literal to `?worker_file&type=module` under test).
      expect(String(worker.url)).toMatch(/\/src\/shared\/parsers\/XMLParser\/validation\/worker\/onix\.worker\.ts(\?.*)?$/);
      expect(worker.options).toEqual({ type: 'module' });
      // The raw bytes, sent once; the file is never read as text on the main thread.
      expect(worker.types).toEqual(['begin']);
      const [begin] = worker.received;
      expect(begin.type === 'begin' && new TextDecoder().decode(begin.bytes)).toBe(source);
      expect(arrayBuffer).toHaveBeenCalledOnce();
      expect(text).not.toHaveBeenCalled();
      // The legacy adapter parses the Worker's normalized Reference XML, and only that.
      expect(mockRawParse).toHaveBeenCalledExactlyOnceWith(NORMALIZED_XML);
      expect(mockXMLParser).toHaveBeenCalledWith(
        parsedOnixData,
        [],
        expect.any(Array),
        [],
        expect.any(Object),
        expect.any(Object),
        expect.any(Array),
        expect.any(Array),
        {
          sourcePlan: expect.objectContaining({ records: [], groups: [] }),
          descriptive: { products: {}, groups: {}, findings: [] },
          adaptGroupKeys: [],
        },
      );
    });

    it('validates a file larger than the former server request boundary in the browser, with no request', async () => {
      const formerServerRequestBoundaryBytes = 4_500_000;
      const xml = `<ONIXMessage>${' '.repeat(formerServerRequestBoundaryBytes)}</ONIXMessage>`;
      const { file, text } = xmlFile(xml);
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      expect(file.size).toBeGreaterThan(formerServerRequestBoundaryBytes);
      renderXMLParse(file);

      await waitFor(() => expect(mockXMLParser).toHaveBeenCalledOnce());
      const [begin] = FakeWorker.instances[0].received;
      expect(begin.type === 'begin' && begin.bytes.byteLength).toBe(file.size);
      expect(text).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    const refused =
      (envelope: EnvelopeEvidence): Reply =>
      (runId) => ({ type: 'refused', runId, reason: 'UNSUPPORTED_FOR_BROWSER_VALIDATION', scope: 'SUPPORT', envelope });

    const STOPS: [string, () => void, ImportIssueCode][] = [
      [
        'a stage-2 DOCTYPE stop',
        () => {
          const stop = finding({
            id: 'SECURITY_DTD',
            tier: 'PROLOG',
            stage: 2,
            scope: 'SECURITY',
            class: 'PROCESSING_STOP',
            path: null,
            sourcePath: null,
            message: 'the source declares a DOCTYPE',
          });
          FakeWorker.reply = answer(resultReply(stopped(2, stop), null));
        },
        'onix.source.security',
      ],
      [
        'a stage-1 unsupported release',
        () => {
          const stop = finding({
            id: 'UNSUPPORTED_SOURCE',
            tier: 'RELEASE_FLAVOUR',
            stage: 1,
            scope: 'SUPPORT',
            class: 'PROCESSING_STOP',
            path: null,
            sourcePath: null,
            message: 'ONIX 2.1 is not a supported release',
          });
          FakeWorker.reply = answer(resultReply(stopped(1, stop), null));
        },
        'onix.source.support',
      ],
      [
        'a stage-2 not-well-formed source',
        () => {
          const stop = finding({
            id: 'SOURCE_NOT_WELL_FORMED',
            tier: 'WELL_FORMEDNESS',
            stage: 2,
            class: 'SOURCE_INVALID',
            path: null,
            sourcePath: null,
            message: 'unclosed tag',
          });
          FakeWorker.reply = answer(resultReply(stopped(2, stop), null));
        },
        'onix.source.validity',
      ],
      [
        'a blocking source-invalid result',
        () => {
          FakeWorker.reply = answer(resultReply(completed([finding()])));
        },
        'onix.source.validity',
      ],
      [
        'an envelope refusal',
        () => {
          const envelope = envelopeOf('REFUSE', { products: { measured: true, count: 1_701 }, exceeded: ['products'] });
          FakeWorker.reply = answer(refused(envelope));
        },
        'onix.source.support',
      ],
      [
        'an unsupported desktop engine',
        () => {
          FakeWorker.engine = 'webkit';
          const envelope = envelopeOf('UNSUPPORTED', {
            engine: 'webkit',
            limits: null,
            products: { measured: false, reason: 'ENGINE_UNSUPPORTED' },
          });
          FakeWorker.reply = answer(refused(envelope));
        },
        'onix.source.support',
      ],
      [
        'a Worker that fails before it is ready',
        () => {
          FakeWorker.engine = null;
          FakeWorker.onConstruct = (worker) => setTimeout(() => worker.crash('the Worker script was blocked'), 0);
        },
        'onix.source.unavailable',
      ],
      [
        'a Worker that fails mid-validation',
        () => {
          FakeWorker.reply = (worker, message) => {
            if (message.type === 'begin') worker.crash('out of memory');
          };
        },
        'onix.source.unavailable',
      ],
      [
        'an internal Worker error',
        () => {
          FakeWorker.reply = answer((runId) => ({ type: 'error', runId, code: 'INTERNAL', message: 'boom' }));
        },
        'onix.source.unavailable',
      ],
    ];

    it.each(STOPS)('%s reaches no target adapter, parser or lookup', async (_outcome, setup, code) => {
      setup();
      const { callbacks } = renderXMLParse(xmlFile().file);

      await waitFor(() => expect(callbacks.onValidationFailure).toHaveBeenCalledOnce());
      // One distinct, actionable issue: SOURCE, SUPPORT, SECURITY and runtime outcomes never collapse.
      expect(failureIssues(callbacks).map(({ severity, code }) => [severity, code])).toEqual([['error', code]]);
      expectNoTargetWork();
      expect(callbacks.onPreview).not.toHaveBeenCalled();
      expect(callbacks.onCancel).not.toHaveBeenCalled();
      // The session is disposed once, and a stopped session is never continued.
      const [worker] = FakeWorker.instances;
      expect(worker.terminated).toBe(1);
      expect(worker.types).not.toContain('continue');
    });

    it('fails closed, and says why, on a blocked result that carries no blocking finding', async () => {
      FakeWorker.reply = answer(resultReply({ ...completed(), sourceValid: false }));
      const { callbacks } = renderXMLParse(xmlFile().file);

      await waitFor(() => expect(callbacks.onValidationFailure).toHaveBeenCalledOnce());
      expect(failureIssues(callbacks).map(({ severity, code }) => [severity, code])).toEqual([
        ['error', 'onix.source.unavailable'],
      ]);
      expectNoTargetWork();
    });

    it('offers no server fallback for a refusal', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const envelope = envelopeOf('REFUSE', { bytes: 37_000_000, exceeded: ['bytes'] });
      FakeWorker.reply = answer(refused(envelope));
      const { callbacks } = renderXMLParse(xmlFile().file);

      await waitFor(() => expect(callbacks.onValidationFailure).toHaveBeenCalledOnce());
      const [issue] = failureIssues(callbacks);
      expect(issue.sourceValidation).toEqual({ kind: 'support', envelope });
      expect(issue.message).toContain('onixValidation.support.tooLarge');
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('continues a NORMAL envelope automatically and plans from the validated source', async () => {
      const work = getDefaultWork({ id: 'work-1' });
      const plan = { works: [work], chapters: [], series: [] };
      mockRawParse.mockReturnValue(plannableOnixData);
      mockParse.mockImplementation(adaptedParse(plan));
      const { callbacks } = renderXMLParse(xmlFile().file);

      await chooseWorkType();
      await userEvent.click(await screen.findByRole('button', { name: 'preview' }));

      expect(callbacks.onPreview).toHaveBeenCalledWith(resolvedFrom(plan), expect.any(Array), {
        type: 'onix',
        filename: 'test.xml',
      });
      expect(FakeWorker.instances[0].types).toEqual(['begin']);
      expect(screen.queryByTestId('onix-validation-warning')).not.toBeInTheDocument();
      expect(screen.getByTestId('onix-source-validated')).toBeInTheDocument();
    });
  });

  describe('warning envelope', () => {
    const warning = envelopeOf('WARNING', {
      engine: 'gecko',
      bytes: 18_531_220,
      products: { measured: true, count: 866 },
      limits: ENGINE_ENVELOPES.gecko,
      exceeded: ['bytes', 'products'],
    });

    beforeEach(() => {
      FakeWorker.engine = 'gecko';
      FakeWorker.reply = answer(
        (runId) => ({ type: 'warning', runId, token: 'token-1', envelope: warning }),
        resultReply(completed(), warning),
      );
    });

    it('shows the real engine, raw bytes, Products and thresholds, and waits for an explicit decision', async () => {
      const { callbacks } = renderXMLParse(xmlFile().file);

      const panel = await screen.findByTestId('onix-validation-warning');
      expect(panel).toHaveTextContent('onixValidation.engine.gecko');
      expect(panel).toHaveTextContent('18,531,220');
      expect(panel).toHaveTextContent('866');
      // Gecko's normal and upper thresholds, in bytes and Products.
      expect(panel).toHaveTextContent('10,000,000');
      expect(panel).toHaveTextContent('500');
      expect(panel).toHaveTextContent('20,000,000');
      expect(panel).toHaveTextContent('1,000');

      await tick();
      const [worker] = FakeWorker.instances;
      expect(worker.types).toEqual(['begin']);
      expectNoTargetWork();
      expect(callbacks.onValidationFailure).not.toHaveBeenCalled();
    });

    it('continues the same session over the bytes already retained by the Worker, exactly once', async () => {
      const { file, arrayBuffer } = xmlFile();
      renderXMLParse(file);

      const proceed = await screen.findByRole('button', { name: 'onixValidation.warning.continue' });
      await userEvent.dblClick(proceed);

      await waitFor(() => expect(mockXMLParser).toHaveBeenCalledOnce());
      const [worker] = FakeWorker.instances;
      expect(FakeWorker.instances).toHaveLength(1);
      expect(worker.received).toEqual([expect.objectContaining({ type: 'begin' }), { type: 'continue', runId: 'run-1', token: 'token-1' }]);
      // Nothing is read or sent again: the continuation validates the retained bytes.
      expect(arrayBuffer).toHaveBeenCalledOnce();
      expect(mockRawParse).toHaveBeenCalledExactlyOnceWith(NORMALIZED_XML);
      expect(screen.queryByRole('button', { name: 'onixValidation.warning.continue' })).not.toBeInTheDocument();
    });

    it('cancels without continuation, target plan or lookup', async () => {
      const { callbacks } = renderXMLParse(xmlFile().file);

      await userEvent.click(await screen.findByRole('button', { name: 'onixValidation.warning.cancel' }));

      expect(callbacks.onCancel).toHaveBeenCalledOnce();
      const [worker] = FakeWorker.instances;
      expect(worker.terminated).toBe(1);
      expect(worker.types).toEqual(['begin']);
      await tick();
      expectNoTargetWork();
      expect(callbacks.onValidationFailure).not.toHaveBeenCalled();
      expect(callbacks.onPreview).not.toHaveBeenCalled();
    });
  });

  describe('session lifecycle', () => {
    const inFlight = () => {
      FakeWorker.reply = answer((runId) => ({ type: 'progress', runId, stage: 'STRICT', done: 1, total: 4 }));
    };

    it('cancelling during validation terminates the Worker; a new selection starts a fresh one', async () => {
      inFlight();
      const first = handlers();
      const { rerender } = render(parseElement(xmlFile().file, first, 'selection-1'));

      await userEvent.click(await screen.findByRole('button', { name: 'onixValidation.actions.cancel' }));

      expect(first.onCancel).toHaveBeenCalledOnce();
      const [old] = FakeWorker.instances;
      expect(old.terminated).toBe(1);
      // A result that was already on its way when the Worker was terminated changes nothing.
      act(() => old.emit(resultReply(completed())('run-1')));
      await tick();
      expectNoTargetWork();

      FakeWorker.reply = answer(resultReply(completed()));
      const second = handlers();
      rerender(parseElement(xmlFile('<ONIXMessage/>', 'next.xml').file, second, 'selection-2'));

      await waitFor(() => expect(mockXMLParser).toHaveBeenCalledOnce());
      expect(FakeWorker.instances).toHaveLength(2);
      expect(FakeWorker.instances[1]).not.toBe(old);
      expect(first.onValidationFailure).not.toHaveBeenCalled();
      expect(first.onPreview).not.toHaveBeenCalled();
    });

    it('replacing the file disposes the old session, whose late result never reaches the new selection', async () => {
      inFlight();
      const first = handlers();
      const { rerender } = render(parseElement(xmlFile().file, first, 'selection-1'));
      await waitFor(() => expect(FakeWorker.instances[0].types).toEqual(['begin']));

      FakeWorker.reply = null;
      const second = handlers();
      rerender(parseElement(xmlFile('<ONIXMessage/>', 'next.xml').file, second, 'selection-2'));
      await waitFor(() => expect(FakeWorker.instances[1].types).toEqual(['begin']));

      const [old, current] = FakeWorker.instances;
      expect(old.terminated).toBe(1);
      expect(current.terminated).toBe(0);

      // The superseded session's blocking result arrives late: nothing of it is applied anywhere.
      act(() => old.emit(resultReply(completed([finding()]))('run-1')));
      await tick();
      expect(first.onValidationFailure).not.toHaveBeenCalled();
      expect(second.onValidationFailure).not.toHaveBeenCalled();
      expectNoTargetWork();

      act(() => current.emit(resultReply(completed())('run-1')));
      await waitFor(() => expect(mockXMLParser).toHaveBeenCalledOnce());
      expect(second.onValidationFailure).not.toHaveBeenCalled();
    });

    it('unmounting terminates the Worker and ignores anything it still sends', async () => {
      inFlight();
      const { callbacks, unmount } = renderXMLParse(xmlFile().file);
      await waitFor(() => expect(FakeWorker.instances[0].types).toEqual(['begin']));

      unmount();

      const [worker] = FakeWorker.instances;
      expect(worker.terminated).toBe(1);
      act(() => worker.emit(resultReply(completed([finding()]))('run-1')));
      await tick();
      expect(callbacks.onValidationFailure).not.toHaveBeenCalled();
      expect(callbacks.onCancel).not.toHaveBeenCalled();
      expectNoTargetWork();
    });

    it('disposes the Worker exactly once when validation completes', async () => {
      renderXMLParse(xmlFile().file);

      await waitFor(() => expect(mockXMLParser).toHaveBeenCalledOnce());
      expect(FakeWorker.instances[0].terminated).toBe(1);
    });
  });

  /**
   * Replacing one XML selection with the next is the parent's business: it may remount the parser or
   * hand the same instance a new `file`. These render one instance and never change its key, so React
   * keeps that instance and nothing but the `file` prop changes - the component itself has to let go of
   * the previous file. Anything the old file produced that survives here would be shown beside, or
   * submitted as, the new file.
   */
  describe('replacing the file on the same instance', () => {
    /** One key for both renders: the instance is reused, so only the `file` prop changes. */
    const SAME_KEY = 'one-instance';
    const planOf = (id: string): ImportPlan => ({ works: [getDefaultWork({ id })], chapters: [], series: [] });
    const PLAN_A = planOf('work-a');
    const PLAN_B = planOf('work-b');
    const WARNING_A: ImportIssue = { severity: 'warning', code: 'onix.validation', message: 'a warning about the first file', source: { kind: 'file' } };

    const succeedWith = (plan: ImportPlan, issues: ImportIssue[] = []) => {
      mockRawParse.mockReturnValue(plannableOnixData);
      mockParse.mockImplementation(adaptedParse(plan, issues));
    };

    /** Holds the next session at its first progress report: it has begun and cannot have settled. */
    const holdInFlight = () => {
      FakeWorker.reply = answer((runId) => ({ type: 'progress', runId, stage: 'STRICT', done: 1, total: 4 }));
    };

    /** The first file, validated and planned, with its validated source and preview on screen. */
    const planFirstFile = async (callbacks: ReturnType<typeof handlers>) => {
      succeedWith(PLAN_A, [WARNING_A]);
      FakeWorker.reply = answer(resultReply(completed([finding({ counts: false, blocking: false })])));
      const view = render(parseElement(xmlFile('<ONIXMessage/>', 'first.xml').file, callbacks, SAME_KEY));
      await chooseWorkType();
      expect(await screen.findByRole('button', { name: 'preview' })).toBeInTheDocument();
      expect(screen.getByTestId('onix-source-validated')).toBeInTheDocument();
      return view;
    };

    /** Hands the reused instance the next file while that file's own validation is still running. */
    const selectSecondFile = async (rerender: (ui: React.ReactElement) => void, callbacks: ReturnType<typeof handlers>) => {
      holdInFlight();
      rerender(parseElement(xmlFile('<ONIXMessage/>', 'second.xml').file, callbacks, SAME_KEY));
      await waitFor(() => expect(FakeWorker.instances[1].types).toEqual(['begin']));
      return FakeWorker.instances[1];
    };

    /** Nothing of a superseded file is on screen, and none of it can be submitted. */
    const expectNothingOfTheFirstFile = (callbacks: ReturnType<typeof handlers>) => {
      expect(screen.queryByTestId('onix-source-validated')).not.toBeInTheDocument();
      expect(screen.queryByTestId('onix-plan-resolution')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'preview' })).not.toBeInTheDocument();
      expect(screen.getByTestId('import-phase-parsing')).not.toBeVisible();
      expect(callbacks.onPreview).not.toHaveBeenCalled();
    };

    it('drops the previous file\'s validated source, plan, contributors and preview as soon as the file changes', async () => {
      const callbacks = handlers();
      const { rerender } = await planFirstFile(callbacks);

      await selectSecondFile(rerender, callbacks);

      // The first file's plan cannot be previewed under the second file's name while the second validates.
      expectNothingOfTheFirstFile(callbacks);
      expect(screen.getByTestId('onix-validation-status')).toBeVisible();
    });

    it('does not bring the previous file\'s plan back when the new file is blocked', async () => {
      const callbacks = handlers();
      const { rerender } = await planFirstFile(callbacks);
      const current = await selectSecondFile(rerender, callbacks);

      const blocking = finding();
      act(() => current.emit(resultReply(completed([blocking]))('run-1')));

      await waitFor(() => expect(callbacks.onValidationFailure).toHaveBeenCalledOnce());
      expect(failureIssues(callbacks).map(({ severity }) => severity)).toEqual(['error']);
      expectNothingOfTheFirstFile(callbacks);
    });

    it('does not bring the previous file\'s plan back when the new file is refused', async () => {
      const callbacks = handlers();
      const { rerender } = await planFirstFile(callbacks);
      const current = await selectSecondFile(rerender, callbacks);

      const envelope = envelopeOf('REFUSE', { bytes: 37_000_000, exceeded: ['bytes'] });
      act(() =>
        current.emit({ type: 'refused', runId: 'run-1', reason: 'UNSUPPORTED_FOR_BROWSER_VALIDATION', scope: 'SUPPORT', envelope }),
      );

      await waitFor(() => expect(callbacks.onValidationFailure).toHaveBeenCalledOnce());
      expect(failureIssues(callbacks)[0].code).toBe('onix.source.support');
      expectNothingOfTheFirstFile(callbacks);
    });

    it('does not bring the previous file\'s plan back when the new file errors', async () => {
      const callbacks = handlers();
      const { rerender } = await planFirstFile(callbacks);
      const current = await selectSecondFile(rerender, callbacks);

      act(() => current.crash('the Worker stopped'));

      await waitFor(() => expect(callbacks.onValidationFailure).toHaveBeenCalledOnce());
      expect(failureIssues(callbacks)[0].code).toBe('onix.source.unavailable');
      expectNothingOfTheFirstFile(callbacks);
    });

    it('refuses a superseded file\'s planner result even when it lands after the new file has planned', async () => {
      const callbacks = handlers();
      // The first file's target planning never finishes until this is released.
      let releaseFirstPlan: () => void = () => undefined;
      mockRawParse.mockReturnValue(plannableOnixData);
      mockParse.mockImplementationOnce(
        (options?: XMLParserOptions) =>
          new Promise((resolve) => {
            releaseFirstPlan = () => resolve(adaptedParse(PLAN_A, [WARNING_A])(options));
          }),
      );
      FakeWorker.reply = answer(resultReply(completed()));
      const { rerender } = render(parseElement(xmlFile('<ONIXMessage/>', 'first.xml').file, callbacks, SAME_KEY));
      await waitFor(() => expect(mockParse).toHaveBeenCalledOnce());

      succeedWith(PLAN_B);
      rerender(parseElement(xmlFile('<ONIXMessage/>', 'second.xml').file, callbacks, SAME_KEY));
      await chooseWorkType();
      await userEvent.click(await screen.findByRole('button', { name: 'preview' }));
      expect(callbacks.onPreview).toHaveBeenCalledExactlyOnceWith(resolvedFrom(PLAN_B), expect.any(Array), {
        type: 'onix',
        filename: 'second.xml',
      });

      // The replaced file's planner finally answers, long after its file stopped being the selection.
      act(() => releaseFirstPlan());
      await tick();

      await userEvent.click(await screen.findByRole('button', { name: 'preview' }));
      expect(callbacks.onPreview).toHaveBeenCalledTimes(2);
      expect(callbacks.onPreview).toHaveBeenLastCalledWith(
        resolvedFrom(PLAN_B),
        expect.not.arrayContaining([WARNING_A]),
        {
          type: 'onix',
          filename: 'second.xml',
        },
      );
    });

    it('asks the new file for its own WorkType: a decision made for the previous file is not carried over', async () => {
      const callbacks = handlers();
      const { rerender } = await planFirstFile(callbacks);
      const current = await selectSecondFile(rerender, callbacks);

      succeedWith(PLAN_B);
      act(() => current.emit(resultReply(completed())('run-1')));

      const workType = await screen.findByRole('combobox', WORK_TYPE_CONTROL);
      expect(workType).toHaveValue('');
      expect(screen.queryByRole('button', { name: 'preview' })).not.toBeInTheDocument();
      expect(screen.getByTestId('onix-plan-blockers')).toHaveTextContent('onixPlan.blocker.WORK_TYPE_INPUT_REQUIRED');
    });

    it('offers only the new file\'s plan, warnings and name once the new file succeeds', async () => {
      const callbacks = handlers();
      const { rerender } = await planFirstFile(callbacks);
      const current = await selectSecondFile(rerender, callbacks);

      succeedWith(PLAN_B);
      act(() => current.emit(resultReply(completed())('run-1')));

      await chooseWorkType();
      await userEvent.click(await screen.findByRole('button', { name: 'preview' }));
      expect(callbacks.onPreview).toHaveBeenCalledOnce();
      // Nothing of the first file rides along: neither its plan nor the warnings raised about it.
      expect(callbacks.onPreview).toHaveBeenCalledWith(resolvedFrom(PLAN_B), expect.not.arrayContaining([WARNING_A]), {
        type: 'onix',
        filename: 'second.xml',
      });
      expect(callbacks.onPreview).not.toHaveBeenCalledWith(resolvedFrom(PLAN_A), expect.anything(), expect.anything());
      expect(screen.getByTestId('onix-source-validated')).toBeInTheDocument();
    });
  });

  describe('source finding projection', () => {
    it('keeps every canonical finding with its disposition: SECONDARY and NOT_EVALUABLE stay visible and non-blocking', async () => {
      const blocking = finding();
      const secondary = finding({
        id: '_20171221_j_5',
        projection: 'SECONDARY',
        counts: false,
        path: '/ONIXMessage[1]/Product[1]/DescriptiveDetail[1]/TitleDetail[1]',
      });
      const notEvaluable = finding({
        id: '_20171221_j_28',
        class: 'RULE_NOT_EVALUABLE',
        blocking: false,
        projection: 'NOT_EVALUABLE',
        counts: false,
        detail: { error: 'FORX0002' },
      });
      const advisory = finding({ id: 'R-ADVISORY', tier: 'SCHEMATRON', stage: 7, class: 'ADVISORY', blocking: false, counts: false });
      FakeWorker.reply = answer(resultReply(completed([blocking, secondary, notEvaluable, advisory])));
      const { callbacks } = renderXMLParse(xmlFile().file);

      await waitFor(() => expect(callbacks.onValidationFailure).toHaveBeenCalledOnce());
      const issues = failureIssues(callbacks);
      expect(issues.map(({ severity, code, sourceValidation }) => ({ severity, code, sourceValidation }))).toEqual([
        { severity: 'error', code: 'onix.source.validity', sourceValidation: { kind: 'finding', finding: blocking } },
        { severity: 'warning', code: 'onix.source.validity', sourceValidation: { kind: 'finding', finding: secondary } },
        { severity: 'warning', code: 'onix.source.validity', sourceValidation: { kind: 'finding', finding: notEvaluable } },
        { severity: 'warning', code: 'onix.source.validity', sourceValidation: { kind: 'finding', finding: advisory } },
      ]);
      expect(issues[0].message).toContain(blocking.id);
      expect(issues[0].message).toContain(blocking.path);
      expect(issues[1].message).toContain('onixValidation.disposition.SECONDARY');
      expect(issues[2].message).toContain('onixValidation.disposition.NOT_EVALUABLE');
      expectNoTargetWork();
    });

    it('keeps the approved recovery visible as recovered-source warnings, never as a valid-source claim', async () => {
      const removed = '/ONIXMessage[1]/Product[1]/CollateralDetail[1]/TextContent[1]';
      const recovered = finding({
        id: 'ORDINARY_XSD_INVALID',
        tier: 'CANONICAL_ORDINARY',
        stage: 5,
        class: 'SOURCE_INVALID',
        recoverability: 'OMIT_INVALID_COMPOSITE',
        counts: false,
        path: `${removed}/Text[1]`,
        message: 'Text: element is empty',
      });
      const marker: RecoveryMarker = {
        recovery: 'OMIT_INVALID_COMPOSITE',
        removed,
        taintSite: '/ONIXMessage[1]/Product[1]/CollateralDetail[1]',
      };
      const work = getDefaultWork({ id: 'work-1' });
      const targetWarning: ImportIssue = {
        severity: 'warning',
        code: 'onix.series.non_publisher_collection_skipped',
        message: 'Series "Editorial Studies" will not be created',
        source: { kind: 'onix', productIndex: 1 },
      };
      mockRawParse.mockReturnValue(plannableOnixData);
      mockParse.mockImplementation(adaptedParse({ works: [work], chapters: [], series: [] }, [targetWarning]));
      FakeWorker.reply = answer(resultReply(completed([recovered], [marker])));
      const { callbacks } = renderXMLParse(xmlFile().file);

      await chooseWorkType();
      await userEvent.click(await screen.findByRole('button', { name: 'preview' }));

      const [, warnings] = callbacks.onPreview.mock.calls[0] as [unknown, ImportIssue[]];
      // Source findings first, then the adapter's warnings, then what planning the identity of the file disclosed.
      expect(warnings.map(({ severity, code, sourceValidation }) => ({ severity, code, sourceValidation }))).toEqual([
        { severity: 'warning', code: 'onix.source.validity', sourceValidation: { kind: 'finding', finding: recovered } },
        { severity: 'warning', code: 'onix.source.recovered', sourceValidation: { kind: 'recovery', recovery: marker } },
        { severity: 'warning', code: targetWarning.code, sourceValidation: undefined },
        { severity: 'warning', code: 'onix.edition.normalised', sourceValidation: undefined },
      ]);
      expect(warnings[0].message).toContain('onixValidation.disposition.OMIT_INVALID_COMPOSITE');
      expect(warnings[1].message).toContain(removed);
      expect(screen.getByTestId('onix-source-validated')).toHaveTextContent('onixValidation.validated.recovered');
      expect(callbacks.onValidationFailure).not.toHaveBeenCalled();
    });
  });

  describe('post-conformance recoveries (thoth#923)', () => {
    const ISNI_PATH = '/ONIXMessage[1]/Product[1]/PublishingDetail[1]/Publisher[1]/PublisherIdentifier[1]';
    const CATEGORY_PATH = '/ONIXMessage[1]/Product[1]/DescriptiveDetail[1]/Subject[1]';
    const isniFinding = finding({
      id: '_20171126_b_42',
      recoverability: 'NORMALIZE_IDENTIFIER_LEXICAL_FORM',
      counts: false,
      path: ISNI_PATH,
      sourcePath: ISNI_PATH,
      message: 'IDValue must be a valid ISNI (invalid characters)',
    });
    const categoryFinding = finding({
      id: '_20171218_a_2',
      recoverability: 'PUBLISHER_CATEGORY_TO_CUSTOM',
      counts: false,
      path: CATEGORY_PATH,
      sourcePath: CATEGORY_PATH,
      message: 'A publisher’s own category code requires SubjectSchemeName',
    });
    const isniMarker: RecoveryMarker = {
      recovery: 'NORMALIZE_IDENTIFIER_LEXICAL_FORM',
      rule: '_20171126_b_42',
      path: ISNI_PATH,
      valuePath: `${ISNI_PATH}/IDValue[1]`,
      scheme: { element: 'PublisherIDType', code: '16' },
      original: '0000-0001-2161-2573',
      canonical: '0000000121612573',
    };
    const categoryMarker: RecoveryMarker = {
      recovery: 'PUBLISHER_CATEGORY_TO_CUSTOM',
      rule: '_20171218_a_2',
      path: CATEGORY_PATH,
      scheme: { element: 'SubjectSchemeIdentifier', code: '23' },
      valueSource: 'SubjectCode',
      valuePath: `${CATEGORY_PATH}/SubjectCode[1]`,
      value: 'UOLP-HIST',
    };

    it('plans a source whose only blocking findings were recovered, keeping each finding and marker as a warning', async () => {
      const work = getDefaultWork({ id: 'work-1' });
      mockRawParse.mockReturnValue(plannableOnixData);
      mockParse.mockImplementation(adaptedParse({ works: [work], chapters: [], series: [] }));
      FakeWorker.reply = answer(resultReply(completed([categoryFinding, isniFinding], [categoryMarker, isniMarker])));
      const { callbacks } = renderXMLParse(xmlFile().file);

      await chooseWorkType();
      await userEvent.click(await screen.findByRole('button', { name: 'preview' }));

      expect(callbacks.onValidationFailure).not.toHaveBeenCalled();
      const [, warnings] = callbacks.onPreview.mock.calls[0] as [unknown, ImportIssue[]];
      const source = warnings.filter(({ sourceValidation }) => sourceValidation !== undefined);
      expect(source.map(({ severity, code, sourceValidation }) => ({ severity, code, sourceValidation }))).toEqual([
        {
          severity: 'warning',
          code: 'onix.source.validity',
          sourceValidation: { kind: 'finding', finding: categoryFinding },
        },
        {
          severity: 'warning',
          code: 'onix.source.validity',
          sourceValidation: { kind: 'finding', finding: isniFinding },
        },
        {
          severity: 'warning',
          code: 'onix.source.recovered',
          sourceValidation: { kind: 'recovery', recovery: categoryMarker },
        },
        {
          severity: 'warning',
          code: 'onix.source.recovered',
          sourceValidation: { kind: 'recovery', recovery: isniMarker },
        },
      ]);
      expect(source[0].message).toContain('onixValidation.disposition.PUBLISHER_CATEGORY_TO_CUSTOM');
      expect(source[1].message).toContain('onixValidation.disposition.NORMALIZE_IDENTIFIER_LEXICAL_FORM');
      expect(source[2].message).toContain('onixValidation.issue.recoveredCategory');
      expect(source[2].message).toContain(CATEGORY_PATH);
      expect(source[3].message).toContain('onixValidation.issue.recoveredIdentifier');
      expect(source[3].message).toContain('0000000121612573');
      expect(source.map(({ source: where }) => where)).toEqual(Array(4).fill({ kind: 'onix', productIndex: 1 }));
      expect(screen.getByTestId('onix-source-validated')).toHaveTextContent('onixValidation.validated.recovered');
    });

    it('imports a recovered publisher category as a Custom subject that keeps its recovery, and keeps every recovery warning', async () => {
      const work = getDefaultWork({ id: 'work-1' });
      const [product] = (plannableOnixData.ONIXMessage.Product as object[]) ?? [];
      mockRawParse.mockReturnValue({
        ONIXMessage: {
          Product: [
            {
              ...product,
              DescriptiveDetail: {
                ...DESCRIBED.DescriptiveDetail,
                Subject: { SubjectSchemeIdentifier: '23', SubjectCode: 'UOLP-HIST' },
              },
            },
          ],
        },
      });
      mockParse.mockImplementation(adaptedParse({ works: [work], chapters: [], series: [] }));
      FakeWorker.reply = answer(resultReply(completed([categoryFinding, isniFinding], [categoryMarker, isniMarker])));
      const { callbacks } = renderXMLParse(xmlFile().file);

      await chooseWorkType();
      await userEvent.click(await screen.findByRole('button', { name: 'preview' }));

      // The descriptive reductions read the same canonical source, with the approved marker as the recovered
      // category's evidence; they never see a finding that still counts, and reclassify none.
      const { descriptive } = mockXMLParser.mock.calls[0][8] as XMLParserOptions;
      const [group] = Object.values(descriptive?.groups ?? {});
      expect(group.subjects.subjects.map(({ type, code, provenance }) => [type, code, provenance[0].recovery])).toEqual([
        ['CUSTOM', 'UOLP-HIST', categoryMarker],
      ]);
      const [plan, warnings] = callbacks.onPreview.mock.calls[0] as [ImportPlan, ImportIssue[]];
      expect(plan.works[0].subjects.map(({ type, code, ordinal }) => [type, code, ordinal])).toEqual([['CUSTOM', 'UOLP-HIST', 1]]);
      expect(warnings.filter(({ code }) => code === 'onix.source.recovered').map(({ sourceValidation }) => sourceValidation)).toEqual([
        { kind: 'recovery', recovery: categoryMarker },
        { kind: 'recovery', recovery: isniMarker },
      ]);
    });

    it('blocks before any target work when one counting finding remains beside the recoveries', async () => {
      const blocking = finding();
      FakeWorker.reply = answer(
        resultReply(completed([categoryFinding, isniFinding, blocking], [categoryMarker, isniMarker])),
      );
      const { callbacks } = renderXMLParse(xmlFile().file);

      await waitFor(() => expect(callbacks.onValidationFailure).toHaveBeenCalledOnce());
      const issues = failureIssues(callbacks);
      expect(
        issues.filter(({ severity }) => severity === 'error').map(({ sourceValidation }) => sourceValidation),
      ).toEqual([{ kind: 'finding', finding: blocking }]);
      expect(issues.filter(({ code }) => code === 'onix.source.recovered')).toHaveLength(2);
      expectNoTargetWork();
    });

    it('blocks before any target work when a result claims source validity while its ledger still counts', async () => {
      const blocking = finding();
      FakeWorker.reply = answer(
        resultReply({ ...completed([isniFinding, blocking], [isniMarker]), sourceValid: true }),
      );
      const { callbacks } = renderXMLParse(xmlFile().file);

      await waitFor(() => expect(callbacks.onValidationFailure).toHaveBeenCalledOnce());
      expect(failureIssues(callbacks).filter(({ severity }) => severity === 'error')).toEqual([
        expect.objectContaining({ sourceValidation: { kind: 'finding', finding: blocking } }),
      ]);
      expectNoTargetWork();
    });
  });

  describe('progress', () => {
    it('shows the real stages, and a fraction only while the Worker supplies both done and total', async () => {
      FakeWorker.reply = null;
      renderXMLParse(xmlFile().file);
      await waitFor(() => expect(FakeWorker.instances[0].types).toEqual(['begin']));
      const [worker] = FakeWorker.instances;
      const progress = (stage: 'ORDINARY' | 'STRICT' | 'SCHEMATRON', done?: number, total?: number) =>
        act(() => worker.emit({ type: 'progress', runId: 'run-1', stage, done, total }));

      progress('ORDINARY');
      expect(screen.getByTestId('onix-validation-status')).toHaveTextContent('onixValidation.stage.ORDINARY');
      expect(screen.getByTestId('onix-validation-status')).toHaveAttribute('aria-busy', 'true');
      expect(screen.queryByTestId('onix-validation-fraction')).not.toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();

      progress('STRICT', 250, 1_000);
      expect(screen.getByTestId('onix-validation-status')).toHaveTextContent('onixValidation.stage.STRICT');
      expect(screen.getByTestId('onix-validation-fraction')).toHaveTextContent('250 / 1,000');
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');

      progress('SCHEMATRON');
      expect(screen.queryByTestId('onix-validation-fraction')).not.toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.queryByText(/\d+\s*%/)).not.toBeInTheDocument();
    });
  });

  describe('the real #196 session and #190 validator', () => {
    it('blocks the same-key LanguageRole 01 + 02 source before any target parser or lookup', async () => {
      wireRealSession(CHROME);
      const source = fixture('dtd_suite30/N3_plain.xml').replace(
        '</TitleDetail>',
        '</TitleDetail><Language><LanguageRole>01</LanguageRole><LanguageCode>ger</LanguageCode></Language>' +
          '<Language><LanguageRole>02</LanguageRole><LanguageCode>ger</LanguageCode></Language>',
      );
      const { callbacks } = renderXMLParse(xmlFile(source).file);

      await waitFor(() => expect(callbacks.onValidationFailure).toHaveBeenCalledOnce(), { timeout: 240_000 });
      const blocking = failureIssues(callbacks).filter(({ severity }) => severity === 'error');
      expect(blocking).toContainEqual(
        expect.objectContaining({
          code: 'onix.source.validity',
          sourceValidation: {
            kind: 'finding',
            finding: expect.objectContaining({ id: '_20171218_f_2', class: 'NORMATIVE_INVALID', counts: true }),
          },
        }),
      );
      expectNoTargetWork();
      expect(FakeWorker.instances[0].terminated).toBe(1);
    }, 300_000);

    it('stops a DOCTYPE at stage 2 as a SECURITY outcome, before any resource or target work', async () => {
      wireRealSession(CHROME);
      const { callbacks } = renderXMLParse(xmlFile(fixture('dtd_suite30/D1_bare_doctype.xml')).file);

      await waitFor(() => expect(callbacks.onValidationFailure).toHaveBeenCalledOnce(), { timeout: 60_000 });
      expect(failureIssues(callbacks).map(({ severity, code }) => [severity, code])).toEqual([
        ['error', 'onix.source.security'],
      ]);
      expectNoTargetWork();
    }, 90_000);

    it.each([
      ['a phone', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', 'mobile'],
      ['a tablet', 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'mobile'],
      ['desktop Safari', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15', 'webkit'],
      ['an unrecognised desktop engine', 'Mozilla/5.0 (X11; Linux x86_64) Servo/1.0 Firefox/0', 'unknown'],
    ])('refuses %s as a SUPPORT outcome, never as source invalidity', async (_device, userAgent, engine) => {
      wireRealSession(userAgent);
      const { callbacks } = renderXMLParse(xmlFile(fixture('dtd_suite30/N3_plain.xml')).file);

      await waitFor(() => expect(callbacks.onValidationFailure).toHaveBeenCalledOnce(), { timeout: 60_000 });
      const issues = failureIssues(callbacks);
      expect(issues).toEqual([
        expect.objectContaining({
          severity: 'error',
          code: 'onix.source.support',
          sourceValidation: {
            kind: 'support',
            envelope: expect.objectContaining({ engine, verdict: 'UNSUPPORTED', limits: null }),
          },
        }),
      ]);
      expect(issues[0].message).toContain(`onixValidation.support.${engine}`);
      expectNoTargetWork();
    }, 90_000);

    /** The observed publisher-file defects, synthesised: a hyphenated declared ISNI and a code-23 category without a scheme name. */
    const recoverable = (isni: string) =>
      fixture('dtd_suite30/N3_plain.xml')
        .replace(
          '</TitleDetail>',
          '</TitleDetail><Subject><SubjectSchemeIdentifier>23</SubjectSchemeIdentifier><SubjectCode>UOLP-HIST</SubjectCode></Subject>',
        )
        .replace(
          '<PublisherName>',
          `<PublisherIdentifier><PublisherIDType>16</PublisherIDType><IDValue>${isni}</IDValue></PublisherIdentifier><PublisherName>`,
        );

    it('reaches target parsing from the canonicalised XML once both approved defects are recovered', async () => {
      wireRealSession(CHROME);
      const { parse } = await vi.importActual<typeof import('@5stones/onix/dist/parse')>('@5stones/onix/dist/parse');
      mockRawParse.mockImplementation(parse);
      const { callbacks } = renderXMLParse(xmlFile(recoverable('0000-0001-2161-2573')).file);

      await waitFor(() => expect(mockXMLParser).toHaveBeenCalledOnce(), { timeout: 240_000 });
      const reply = FakeWorker.instances[0].sent.find((message) => message.type === 'result');
      const result = reply?.type === 'result' ? reply.result : undefined;
      expect(result?.sourceValid).toBe(true);
      expect(result?.summary).toMatchObject({ blocking: 0, recovered: 2 });
      expect(
        result?.findings.filter((f) => f.recoverability !== 'NOT_RECOVERABLE').map((f) => [f.id, f.recoverability]),
      ).toEqual([
        ['_20171218_a_2', 'PUBLISHER_CATEGORY_TO_CUSTOM'],
        ['_20171126_b_42', 'NORMALIZE_IDENTIFIER_LEXICAL_FORM'],
      ]);
      const xml = result?.normalized?.xml as string;
      expect(xml).toContain('<IDValue>0000000121612573</IDValue>');
      expect(xml).not.toContain('0000-0001-2161-2573');
      expect(xml).not.toContain('SubjectSchemeName');
      expect(mockRawParse).toHaveBeenCalledExactlyOnceWith(xml);
      expect(mockXMLParser.mock.calls[0][0]).toEqual(parse(xml));
      expect(callbacks.onValidationFailure).not.toHaveBeenCalled();
    }, 300_000);

    it('blocks before any target parser or lookup when the stripped ISNI is still invalid', async () => {
      wireRealSession(CHROME);
      const { callbacks } = renderXMLParse(xmlFile(recoverable('0000-0001-2161-2574')).file);

      await waitFor(() => expect(callbacks.onValidationFailure).toHaveBeenCalledOnce(), { timeout: 240_000 });
      const issues = failureIssues(callbacks);
      expect(issues.filter(({ severity }) => severity === 'error')).toEqual([
        expect.objectContaining({
          code: 'onix.source.validity',
          sourceValidation: {
            kind: 'finding',
            finding: expect.objectContaining({ id: '_20171126_b_42', recoverability: 'NOT_RECOVERABLE', counts: true }),
          },
        }),
      ]);
      expect(issues).toContainEqual(
        expect.objectContaining({
          severity: 'warning',
          code: 'onix.source.recovered',
          sourceValidation: {
            kind: 'recovery',
            recovery: expect.objectContaining({ recovery: 'PUBLISHER_CATEGORY_TO_CUSTOM' }),
          },
        }),
      );
      expectNoTargetWork();
    }, 300_000);

    it('parses exactly the normalized Reference XML the Worker returned for a valid source', async () => {
      wireRealSession(CHROME);
      const { parse } = await vi.importActual<typeof import('@5stones/onix/dist/parse')>('@5stones/onix/dist/parse');
      mockRawParse.mockImplementation(parse);
      renderXMLParse(xmlFile(fixture('dtd_suite30/N3_plain.xml')).file);

      await waitFor(() => expect(mockXMLParser).toHaveBeenCalledOnce(), { timeout: 240_000 });
      const reply = FakeWorker.instances[0].sent.find((message) => message.type === 'result');
      const xml = reply?.type === 'result' ? reply.result.normalized?.xml : undefined;
      expect(reply?.type === 'result' && reply.result.sourceValid).toBe(true);
      expect(mockRawParse).toHaveBeenCalledExactlyOnceWith(xml);
      expect(mockXMLParser.mock.calls[0][0]).toEqual(parse(xml as string));
    }, 300_000);
  });

  describe('failures around the source gate', () => {
    it('reports a file that cannot be read as a file.validation issue, before any validation request', async () => {
      const { file, arrayBuffer } = xmlFile();
      arrayBuffer.mockRejectedValue(new Error('Unable to read selected file'));
      const { callbacks } = renderXMLParse(file);

      await waitFor(() => {
        expect(callbacks.onValidationFailure).toHaveBeenCalledWith([
          {
            severity: 'error',
            code: 'file.validation',
            message: 'Unable to read selected file',
            source: { kind: 'file' },
          },
        ]);
      });
      const [worker] = FakeWorker.instances;
      expect(worker.types).toEqual([]);
      expect(worker.terminated).toBe(1);
      expectNoTargetWork();
    });

    it('reports an adapter failure on the validated source as a processing failure', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      mockRawParse.mockImplementation(() => {
        throw new Error('adapter exploded');
      });
      const { callbacks } = renderXMLParse(xmlFile().file);

      await waitFor(() => {
        expect(callbacks.onValidationFailure).toHaveBeenCalledWith([
          {
            severity: 'error',
            code: 'onix.processing_failed',
            message: ONIX_PROCESSING_FAILURE_MESSAGE,
            source: { kind: 'file' },
          },
        ]);
      });
      expect(mockXMLParser).not.toHaveBeenCalled();
    });
  });

  describe('issues from the parser', () => {
    const work = getDefaultWork({ id: 'work-1' });

    const warning: ImportIssue = {
      severity: 'warning',
      code: 'onix.series.non_publisher_collection_skipped',
      message: 'Series "Editorial Studies" will not be created',
      source: { kind: 'onix', productIndex: 1 },
    };

    it('shows a truthful planning phase after validation, with no fabricated percentage', async () => {
      let resolveParse: () => void = () => {};
      mockRawParse.mockReturnValue(plannableOnixData);
      mockParse.mockImplementation(
        (options?: XMLParserOptions) =>
          new Promise((resolve) => {
            resolveParse = () => resolve(adaptedParse({ works: [work], chapters: [], series: [] })(options));
          }),
      );

      renderXMLParse(xmlFile().file);

      await waitFor(() => expect(mockParse).toHaveBeenCalledOnce());
      const phase = screen.getByTestId('import-phase-parsing');
      expect(phase).toBeVisible();
      expect(phase).toHaveTextContent('bulkImport.phase.parsingOnix');
      expect(phase).toHaveAttribute('aria-busy', 'true');
      expect(screen.queryByText(/\d+\s*%/)).not.toBeInTheDocument();
      // Nothing is offered for decision while the file is still being planned.
      expect(screen.queryByTestId('onix-plan-resolution')).not.toBeInTheDocument();

      await act(async () => {
        resolveParse();
      });

      await waitFor(() => expect(phase).not.toBeVisible());
      expect(screen.getByTestId('onix-plan-resolution')).toBeInTheDocument();
    });

    it('carries the plan, its chapters and its warnings through to the preview', async () => {
      const chapter = { ...getDefaultWork({ id: 'chapter-1' }), relationId: work.id };
      // The file states no Series: membership comes from the descriptive reductions, never from the candidate.
      const plan = { works: [work], chapters: [chapter], series: [] };

      mockRawParse.mockReturnValue(plannableOnixData);
      mockParse.mockImplementation(adaptedParse(plan, [warning]));

      const { callbacks } = renderXMLParse(xmlFile().file);

      await chooseWorkType();
      await userEvent.click(await screen.findByRole('button', { name: 'preview' }));

      // One plan, chapters intact, warnings beside it rather than in it.
      // The source (ONIX, and the file's name) travels alongside, never in the plan.
      expect(callbacks.onPreview).toHaveBeenCalledWith(
        resolvedFrom(plan),
        [warning, expect.objectContaining({ code: 'onix.edition.normalised' })],
        { type: 'onix', filename: 'test.xml' },
      );
      // A warning is not a validation failure, so the upload step never hears about it.
      expect(callbacks.onValidationFailure).not.toHaveBeenCalled();
    });

    it('stops at the upload step when the parser reports an error', async () => {
      const error: ImportIssue = {
        severity: 'error',
        code: 'onix.validation',
        message: 'Imprint Unknown not found for product 1',
        source: { kind: 'onix', productIndex: 1 },
      };

      mockParse.mockResolvedValue({
        status: 'failed',
        data: { plan: { works: [], chapters: [], series: [] }, contributorsForSelection: {} },
        issues: [warning, error],
      });

      const { callbacks } = renderXMLParse(xmlFile().file);

      // Warnings raised alongside the error are handed on too, in the parser's order.
      await waitFor(() => expect(callbacks.onValidationFailure).toHaveBeenCalledWith([warning, error]));
      expect(callbacks.onPreview).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: 'preview' })).not.toBeInTheDocument();
      await waitFor(() => expect(screen.getByTestId('import-phase-parsing')).not.toBeVisible());
    });

    it('hands the display-ready processing failure to the upload step without translating it as a key', async () => {
      const processingFailure: ImportIssue = {
        severity: 'error',
        code: 'onix.processing_failed',
        message: ONIX_PROCESSING_FAILURE_MESSAGE,
        source: { kind: 'file' },
      };

      mockParse.mockResolvedValue({
        status: 'failed',
        data: { plan: { works: [], chapters: [], series: [] }, contributorsForSelection: {} },
        issues: [processingFailure],
      });

      const { callbacks } = renderXMLParse(xmlFile().file);

      await waitFor(() => expect(callbacks.onValidationFailure).toHaveBeenCalledWith([processingFailure]));
      expect(callbacks.onValidationFailure.mock.calls[0][0][0].message).toBe(ONIX_PROCESSING_FAILURE_MESSAGE);
      expect(callbacks.onPreview).not.toHaveBeenCalled();
      await waitFor(() => expect(screen.getByTestId('import-phase-parsing')).not.toBeVisible());
    });
  });

  /**
   * thoth-app#182, on the target side of a validated source: the file is planned on its own, its identifiers
   * are resolved exactly within the active publisher, only the Work groups that evidence leaves new are
   * adapted, and the one plan ever offered for preview is the resolver's, for the decisions made here.
   */
  describe('identity, Work and manifestation planning', () => {
    const ISBN = '9781800000018';
    const WORK_DOI = '10.1234/existing';

    const isbnOnixData = (related?: object, contributor?: object): ExtendedONIXMessageRoot =>
      ({
        ONIXMessage: {
          Product: [
            {
              RecordReference: 'r0',
              NotificationType: '03',
              ProductIdentifier: { ProductIDType: '15', IDValue: ISBN },
              ...DESCRIBED,
              DescriptiveDetail: { ...DESCRIBED.DescriptiveDetail, ...(contributor ? { Contributor: contributor } : {}) },
              ...related,
            },
          ],
        },
      }) as unknown as ExtendedONIXMessageRoot;

    /** The same record, stating the Work it manifests by that Work's DOI. */
    const manifestationOfExistingWork = isbnOnixData({
      RelatedMaterial: {
        RelatedWork: { WorkRelationCode: '01', WorkIdentifier: { WorkIDType: '06', IDValue: WORK_DOI } },
      },
    });

    /** Thoth's exact answer: every identifier asked about is carried by the one existing Work. */
    const existingWorkCarriesEverything = () => {
      services.importPreflightService.findExistingIdentifierMatches.mockImplementation(
        async ({ identifiers }: { identifiers: Parameters<typeof importIdentifierKey>[0][] }) =>
          new Map(
            identifiers.map((identifier) => [
              importIdentifierKey(identifier),
              [{ workId: 'existing-1', title: 'Existing', imprintId: 'imprint-1', doi: WORK_DOI, isbns: [ISBN] }],
            ]),
          ),
      );
      services.workService.getWork.mockResolvedValue(
        getDefaultWork({
          id: 'existing-1',
          type: WorkTypes.enum.Monograph,
          imprintId: 'imprint-1',
          doi: `https://doi.org/${WORK_DOI}`,
          titles: [getDefaultTitle({ canonical: true, title: 'Existing' })],
          publications: [
            getDefaultPublication({ id: 'publication-1', type: PublicationType.enum.Paperback, isbn: ISBN }),
          ],
        }),
      );
    };

    it("resolves the file's identifiers within the active publisher before adapting only the Work groups left new", async () => {
      const order: string[] = [];
      mockRawParse.mockReturnValue(isbnOnixData());
      services.importPreflightService.findExistingIdentifierMatches.mockImplementation(async () => {
        order.push('targets');
        return new Map();
      });
      mockXMLParser.mockImplementation(function (...args: unknown[]) {
        order.push('adapter');
        return { parse: () => mockParse(args[8]) };
      });
      renderXMLParse(xmlFile().file);

      await waitFor(() => expect(mockParse).toHaveBeenCalledOnce());
      expect(order).toEqual(['targets', 'adapter']);
      expect(services.importPreflightService.findExistingIdentifierMatches).toHaveBeenCalledExactlyOnceWith({
        publisherId: 'publisher-1',
        identifiers: [{ basis: 'isbn', value: ISBN }],
      });
      const { sourcePlan, adaptGroupKeys } = mockXMLParser.mock.calls[0][8] as XMLParserOptions;
      expect(sourcePlan?.records.map(({ recordReference, disposition }) => [recordReference, disposition])).toEqual([
        ['r0', 'COMPLETE'],
      ]);
      expect(adaptGroupKeys).toEqual(sourcePlan?.groups.map(({ groupKey }) => groupKey));
    });

    it('reduces the rights of the validated source once planning is permitted, and plans the Work licence from them (#211)', async () => {
      const candidate = { works: [getDefaultWork({ id: 'work-1' })], chapters: [], series: [] };
      const licensed = isbnOnixData();
      const [record] = licensed.ONIXMessage.Product as unknown as { DescriptiveDetail: object }[];

      record.DescriptiveDetail = {
        ...record.DescriptiveDetail,
        EpubTechnicalProtection: '00',
        EpubLicense: {
          EpubLicenseName: 'Creative Commons Attribution 4.0 International',
          EpubLicenseExpression: {
            EpubLicenseExpressionType: '01',
            EpubLicenseExpressionLink: 'https://creativecommons.org/licenses/by/4.0/deed.en',
          },
        },
      };
      mockRawParse.mockReturnValue(licensed);
      mockParse.mockImplementation(adaptedParse(candidate));
      const { callbacks } = renderXMLParse(xmlFile().file);

      await chooseWorkType();
      await userEvent.click(await screen.findByRole('button', { name: 'preview' }));

      // Once, on the very adapter value bridged from the canonical source, with the plan and provenance planning used.
      expect(mockReduceOnixRights).toHaveBeenCalledOnce();
      const [adapter, sourcePlan, options] = mockReduceOnixRights.mock.calls[0];
      expect(adapter).toBe(licensed);
      expect(sourcePlan).toBe((mockXMLParser.mock.calls[0][8] as XMLParserOptions).sourcePlan);
      expect(options).toEqual({ provenance: expect.objectContaining({ sourcePathOf: expect.any(Function) }) });

      const [plan] = callbacks.onPreview.mock.calls[0] as [ImportPlan];
      expect(plan.works.map(({ license }) => license)).toEqual(['https://creativecommons.org/licenses/by/4.0/']);
      expect(plan.onix?.rights?.groups[plan.onix.workGroups[0].groupKey].licence).toMatchObject({
        kind: 'SET_SUPPORTED_LICENSE',
        identity: 'CC_BY_4_0',
      });
    });

    it('reduces the ProductSupply of the validated source once planning is permitted, and prices and locates the Publication from it alone (#215)', async () => {
      const candidate = { works: [getDefaultWork({ id: 'work-1' })], chapters: [], series: [] };
      const supplied = isbnOnixData();
      const [record] = supplied.ONIXMessage.Product as unknown as Record<string, unknown>[];

      record.ProductSupply = {
        SupplyDetail: {
          Supplier: {
            SupplierRole: '01',
            SupplierName: 'A Supplier',
            Website: { WebsiteRole: '36', WebsiteLink: 'https://supplier.example.com/a-work' },
          },
          ProductAvailability: '20',
          Price: [
            { PriceType: '02', PriceAmount: '20.00', CurrencyCode: 'GBP' },
            { PriceType: '02', UnpricedItemType: '01', CurrencyCode: 'USD' },
          ],
        },
      };
      mockRawParse.mockReturnValue(supplied);
      mockParse.mockImplementation(adaptedParse(candidate));
      const { callbacks } = renderXMLParse(xmlFile().file);

      await chooseWorkType();
      await userEvent.click(await screen.findByRole('button', { name: 'preview' }));

      // Once, on the very adapter value bridged from the canonical source, with the plan and provenance planning used.
      expect(mockReduceOnixCommercial).toHaveBeenCalledOnce();
      const [adapter, sourcePlan, options] = mockReduceOnixCommercial.mock.calls[0];
      expect(adapter).toBe(supplied);
      expect(sourcePlan).toBe((mockXMLParser.mock.calls[0][8] as XMLParserOptions).sourcePlan);
      expect(options).toEqual({
        provenance: expect.objectContaining({ sourcePathOf: expect.any(Function) }),
        normalizedXml: NORMALIZED_XML,
      });

      const [plan] = callbacks.onPreview.mock.calls[0] as [ImportPlan];
      expect(
        plan.works[0].publications.map(({ prices, locations }) => [
          prices.map(({ currencyCode, unitPrice }) => [currencyCode, unitPrice]),
          locations.map(({ canonical, landingPage }) => [canonical, landingPage]),
        ]),
      ).toEqual([[[['GBP', 20]], [[true, 'https://supplier.example.com/a-work']]]]);
      expect(plan.onix?.commercial?.findings.map(({ code }) => code)).toEqual(
        expect.arrayContaining(['PRICE_UNPRICED', 'PRICE_REDUCED', 'SUPPLY_NOT_REPRESENTED']),
      );
    });

    it('orders stock evidence from the normalised source canonical validation produced, never the uploaded file, and leaves the canonical ledger as it was (Specification Amendment 2A)', async () => {
      const supplyXml = (stock: string) =>
        '<ProductSupply><SupplyDetail><Supplier><SupplierRole>01</SupplierRole><SupplierName>A Supplier</SupplierName></Supplier>' +
        `<ProductAvailability>21</ProductAvailability>${stock}<UnpricedItemType>02</UnpricedItemType></SupplyDetail></ProductSupply>`;
      const normalized = NORMALIZED_XML.replace(
        '</Product>',
        `${supplyXml('<Stock><OnHand>12</OnHand><Reserved>2</Reserved><Proximity>02</Proximity></Stock>')}</Product>`,
      );
      // The uploaded bytes state other stock evidence, which is never read.
      const uploaded = xmlFile(
        NORMALIZED_XML.replace(
          '</Product>',
          `${supplyXml('<Stock><OnHand>99</OnHand><Proximity>09</Proximity></Stock>')}</Product>`,
        ),
      );
      const result = completed([], [], normalized);
      const ledger = JSON.parse(JSON.stringify(result)) as OnixWorkerResult;
      const candidate = { works: [getDefaultWork({ id: 'work-1' })], chapters: [], series: [] };
      const supplied = isbnOnixData();
      const [record] = supplied.ONIXMessage.Product as unknown as Record<string, unknown>[];

      record.ProductSupply = {
        SupplyDetail: {
          Supplier: { SupplierRole: '01', SupplierName: 'A Supplier' },
          ProductAvailability: '21',
          Stock: { OnHand: '12', Reserved: '2', Proximity: '02' },
          UnpricedItemType: '02',
        },
      };
      FakeWorker.reply = answer(resultReply(result));
      mockRawParse.mockReturnValue(supplied);
      mockParse.mockImplementation(adaptedParse(candidate));
      const { callbacks } = renderXMLParse(uploaded.file);

      await chooseWorkType();
      await userEvent.click(await screen.findByRole('button', { name: 'preview' }));

      // The commercial reduction is given the Worker's normalised source, exactly, beside the adapter parsed from it.
      expect(mockRawParse).toHaveBeenCalledExactlyOnceWith(normalized);
      expect(mockReduceOnixCommercial.mock.calls[0][2]).toEqual({
        provenance: expect.objectContaining({ sourcePathOf: expect.any(Function) }),
        normalizedXml: normalized,
      });

      const [plan] = callbacks.onPreview.mock.calls[0] as [ImportPlan];
      const [product] = Object.values(plan.onix?.commercial?.products ?? {});

      // The Proximity qualifies Reserved, which it follows in that source - not OnHand, and nothing the upload says.
      expect(product.supplies[0].supplyDetails[0].stocks[0]).toMatchObject({
        quantities: [
          { element: 'OnHand', value: '12', proximity: null },
          { element: 'Reserved', value: '2', proximity: { value: '02' } },
        ],
        proximityAssociation: 'ORDERED_SOURCE',
        unassociatedProximities: [],
      });
      // The canonical result - findings, verdict, recoveries, normalised source and provenance - is as the Worker returned it.
      expect(JSON.parse(JSON.stringify(result))).toEqual(ledger);
    });

    it('offers no preview while a price decision is open, then previews exactly the amount the publisher chose, bound to its decision (#215)', async () => {
      const PRICE = '/ONIXMessage[1]/Product[1]/ProductSupply[1]/SupplyDetail[1]/Price[1]';
      const candidate = { works: [getDefaultWork({ id: 'work-1' })], chapters: [], series: [] };
      const supplied = isbnOnixData();
      const [record] = supplied.ONIXMessage.Product as unknown as Record<string, unknown>[];

      // A consumer price the file qualifies (PriceQualifier 05), as the University of London Press print records do.
      record.ProductSupply = {
        SupplyDetail: {
          Supplier: { SupplierRole: '01', SupplierName: 'A Supplier' },
          ProductAvailability: '10',
          Price: {
            PriceType: '02',
            PriceQualifier: '05',
            PriceStatus: '00',
            PriceAmount: '75.00',
            CurrencyCode: 'GBP',
          },
        },
      };
      mockRawParse.mockReturnValue(supplied);
      mockParse.mockImplementation(adaptedParse(candidate));
      const { callbacks } = renderXMLParse(xmlFile().file);

      await chooseWorkType();

      const price = await screen.findByRole('combobox', { name: /^onixPlan\.commercial\.priceLabel/ });

      // Nothing is taken, or dropped, for the publisher: the price waits on them, and so does the preview.
      expect(price).toHaveValue('');
      expect(screen.getByTestId('onix-plan-blockers')).toHaveTextContent('onixPlan.blocker.COMMERCIAL_CHOICE_REQUIRED');
      expect(screen.queryByRole('button', { name: 'preview' })).not.toBeInTheDocument();

      await userEvent.selectOptions(price, PRICE);
      await userEvent.click(await screen.findByRole('button', { name: 'preview' }));

      const [plan] = callbacks.onPreview.mock.calls[0] as [ImportPlan];
      expect(
        plan.works[0].publications.map(({ prices }) =>
          prices.map(({ currencyCode, unitPrice }) => [currencyCode, unitPrice]),
        ),
      ).toEqual([[['GBP', 75]]]);
      const [decision] = (plan.onix?.commercial?.findings ?? []).filter(({ code }) => code === 'PRICE_NOT_AUTOMATIC');
      expect(plan.onix?.inputs.commercialChoices).toEqual({ [decision.key]: PRICE });
      expect(plan.onix?.priceResolutions).toEqual([
        expect.objectContaining({ findingKey: decision.key, basis: 'PUBLISHER_CHOICE', unitPrice: 75 }),
      ]);
    });

    it('previews the automatic price while an optional alternative stays unanswered, and each answer from a plan resolved again from the inputs, never an edited candidate (Specification Amendment 2B)', async () => {
      const PRICES = '/ONIXMessage[1]/Product[1]/ProductSupply[1]/SupplyDetail[1]';
      const candidate = { works: [getDefaultWork({ id: 'work-1' })], chapters: [], series: [] };
      const supplied = isbnOnixData();
      const [record] = supplied.ONIXMessage.Product as unknown as Record<string, unknown>[];

      record.ProductSupply = {
        SupplyDetail: {
          Supplier: { SupplierRole: '01', SupplierName: 'A Supplier' },
          ProductAvailability: '20',
          Price: [
            { PriceType: '02', PriceAmount: '20.00', CurrencyCode: 'GBP' },
            { PriceType: '02', PriceQualifier: '10', PriceAmount: '60.00', CurrencyCode: 'GBP' },
          ],
        },
      };
      mockRawParse.mockReturnValue(supplied);
      mockParse.mockImplementation(adaptedParse(candidate));
      const candidateBefore = JSON.stringify(candidate);
      const { callbacks } = renderXMLParse(xmlFile().file);
      const override = () => screen.getByRole('combobox', { name: /^onixPlan\.commercial\.overrideLabel/ });
      const preview = async () => {
        await userEvent.click(await screen.findByRole('button', { name: 'preview' }));

        const plan = callbacks.onPreview.mock.lastCall?.[0] as ImportPlan;

        return {
          prices: plan.works[0].publications.map(({ prices }) =>
            prices.map(({ currencyCode, unitPrice }) => [currencyCode, unitPrice]),
          ),
          resolutions: plan.onix?.priceResolutions?.map(({ basis, unitPrice }) => [basis, unitPrice]),
        };
      };

      await chooseWorkType();

      // Unanswered, the optional alternative waits on nothing: the automatic price is previewed.
      expect(override()).toHaveValue('');
      expect(await preview()).toEqual({ prices: [[['GBP', 20]]], resolutions: [['AUTOMATIC', 20]] });

      await userEvent.selectOptions(override(), `${PRICES}/Price[2]`);
      expect(await preview()).toEqual({ prices: [[['GBP', 60]]], resolutions: [['PUBLISHER_CHOICE', 60]] });

      await userEvent.selectOptions(override(), 'OMIT');
      expect(await preview()).toEqual({ prices: [[]], resolutions: [['PUBLISHER_OMISSION', null]] });

      await userEvent.selectOptions(override(), '');
      expect(await preview()).toEqual({ prices: [[['GBP', 20]]], resolutions: [['AUTOMATIC', 20]] });

      // Every plan was resolved from the inputs: the candidate the adapter built was never edited.
      expect(JSON.stringify(candidate)).toBe(candidateBefore);
    });

    it("offers no preview while a decision is open, then previews the resolver's plan and its sidecar, never the candidate", async () => {
      const candidate = { works: [getDefaultWork({ id: 'work-1' })], chapters: [], series: [] };
      mockRawParse.mockReturnValue(isbnOnixData());
      mockParse.mockImplementation(adaptedParse(candidate));
      const { callbacks } = renderXMLParse(xmlFile().file);

      const workType = await screen.findByRole('combobox', WORK_TYPE_CONTROL);
      // No WorkType is preselected, and nothing can be previewed until one is chosen.
      expect(workType).toHaveValue('');
      expect(screen.getByTestId('onix-plan-blockers')).toHaveTextContent('onixPlan.blocker.WORK_TYPE_INPUT_REQUIRED');
      expect(screen.queryByRole('button', { name: 'preview' })).not.toBeInTheDocument();

      await userEvent.selectOptions(workType, WorkTypes.enum.Textbook);
      expect(screen.queryByTestId('onix-plan-blockers')).not.toBeInTheDocument();
      await userEvent.click(await screen.findByRole('button', { name: 'preview' }));

      const [plan] = callbacks.onPreview.mock.calls[0] as [ImportPlan];
      // The candidate's placeholder WorkType is replaced by the publisher's choice, and the plan says why.
      expect(candidate.works[0].type).toBe(WorkTypes.enum.EditedBook);
      expect(plan.works).toEqual([
        expect.objectContaining({ id: 'work-1', type: WorkTypes.enum.Textbook, edition: 1 }),
      ]);
      expect(plan.onix).toEqual(
        expect.objectContaining({
          kind: 'onix',
          executable: true,
          // The file's one Work is decided for itself: no file-level choice stands beside it.
          inputs: expect.objectContaining({
            fileWorkType: null,
            workTypeOverrides: { [plan.onix?.workGroups[0].groupKey as string]: WorkTypes.enum.Textbook },
          }),
          products: [
            expect.objectContaining({
              isbn: ISBN,
              action: 'CREATE_PUBLICATION',
              publicationType: PublicationType.enum.Paperback,
            }),
          ],
          workGroups: [
            expect.objectContaining({
              target: 'NEW_WORK',
              plannedWorkId: 'work-1',
              workType: { status: 'RESOLVED', type: WorkTypes.enum.Textbook, provenance: 'USER_WORK_OVERRIDE' },
            }),
          ],
        }),
      );
    });

    it('reads back the one existing Work exact evidence names, adapts nothing of it, and offers nothing to preview', async () => {
      existingWorkCarriesEverything();
      mockRawParse.mockReturnValue(manifestationOfExistingWork);
      const callbacks = handlers();
      render(<XMLParse file={xmlFile().file} imprints={IMPRINTS} serieses={[]} {...callbacks} />);

      const panel = await screen.findByTestId('onix-plan-resolution');
      await waitFor(() => expect(panel).toHaveTextContent('onixPlan.productStatus.ALREADY_PRESENT'));
      expect(services.workService.getWork).toHaveBeenCalledExactlyOnceWith('existing-1');
      expect(mockXMLParser.mock.calls[0][8]).toEqual(expect.objectContaining({ adaptGroupKeys: [] }));
      expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.status.nothingToCreate');
      expect(screen.queryByRole('button', { name: 'preview' })).not.toBeInTheDocument();
      expect(callbacks.onValidationFailure).not.toHaveBeenCalled();
    });

    it("fails closed, before adapting anything, when Thoth cannot answer for the file's identifiers", async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      mockRawParse.mockReturnValue(isbnOnixData());
      services.importPreflightService.findExistingIdentifierMatches.mockRejectedValue(new Error('502 Bad Gateway'));
      const { callbacks } = renderXMLParse(xmlFile().file);

      await waitFor(() => expect(callbacks.onValidationFailure).toHaveBeenCalledOnce());
      expect(failureIssues(callbacks)).toEqual([
        {
          severity: 'error',
          code: 'onix.target.unavailable',
          message: 'onixPlan.targetUnavailable',
          source: { kind: 'file' },
        },
      ]);
      expect(mockXMLParser).not.toHaveBeenCalled();
      expect(callbacks.onPreview).not.toHaveBeenCalled();
      await waitFor(() => expect(screen.getByTestId('import-phase-parsing')).not.toBeVisible());
    });

    it("fails closed when there is no active publisher to resolve the file's identifiers within", async () => {
      publisherState.activePublisher = null;
      mockRawParse.mockReturnValue(isbnOnixData());
      const { callbacks } = renderXMLParse(xmlFile().file);

      await waitFor(() => expect(callbacks.onValidationFailure).toHaveBeenCalledOnce());
      expect(failureIssues(callbacks).map(({ severity, code }) => [severity, code])).toEqual([
        ['error', 'onix.target.unavailable'],
      ]);
      expect(services.importPreflightService.findExistingIdentifierMatches).not.toHaveBeenCalled();
      expect(mockXMLParser).not.toHaveBeenCalled();
    });

    it('keeps the ONIX sidecar through contributor selection, with the contributor the publisher picked', async () => {
      const work = getDefaultWork({ id: 'work-1' });
      const contribution = (contributorId: string) =>
        getDefaultContribution({ contributorId, fullName: 'Jane Doe', firstName: 'Jane', lastName: 'Doe' });
      // The source contributor the choice is for, by the key its canonical reduction gives it.
      const intent = '/ONIXMessage[1]/Product[1]/DescriptiveDetail[1]/Contributor[1]';
      mockRawParse.mockReturnValue(
        isbnOnixData(undefined, { ContributorRole: 'A01', PersonName: 'Jane Doe', NamesBeforeKey: 'Jane', KeyNames: 'Doe' }),
      );
      mockParse.mockImplementation(
        adaptedParse({ works: [work], chapters: [], series: [] }, [], {
          [work.id]: {
            [intent]: [
              { ...contribution('00000000-0000-0000-0000-000000000000'), selected: true, lastContribution: '' },
              { ...contribution('contributor-1'), selected: false, lastContribution: 'An earlier book' },
            ],
          },
        }),
      );
      const { callbacks } = renderXMLParse(xmlFile().file);

      await chooseWorkType();
      const [, existingRadio] = await screen.findAllByRole('radio');
      await userEvent.click(existingRadio);
      await userEvent.click(screen.getByRole('button', { name: 'preview' }));

      const [plan] = callbacks.onPreview.mock.calls[0] as [ImportPlan];
      expect(plan.works[0].contributions).toEqual([expect.objectContaining({ contributorId: 'contributor-1' })]);
      expect(plan.onix).toEqual(expect.objectContaining({ kind: 'onix', executable: true }));
      expect(plan.onix?.workGroups[0].plannedWorkId).toBe(work.id);
    });

    it('shows the WorkType the reduced contributor roles suggest as evidence only, and previews the WorkType chosen', async () => {
      const work = getDefaultWork({ id: 'work-1' });
      // An editor and no author: #179 WorkType Amendment 1 (5699313101) suggests an edited book, and selects nothing.
      mockRawParse.mockReturnValue(
        isbnOnixData(undefined, {
          ContributorRole: 'B01',
          PersonName: 'Jane Doe',
          NamesBeforeKey: 'Jane',
          KeyNames: 'Doe',
        }),
      );
      mockParse.mockImplementation(adaptedParse({ works: [work], chapters: [], series: [] }));
      const { callbacks } = renderXMLParse(xmlFile().file);

      const workType = await screen.findByRole('combobox', WORK_TYPE_CONTROL);
      expect(screen.getByTestId('onix-plan-worktype-suggestion')).toHaveTextContent(
        'onixPlan.workType.suggestion {"type":"onixPlan.workType.EDITED_BOOK"}',
      );
      expect(workType).toHaveValue('');
      expect(screen.queryByRole('button', { name: 'preview' })).not.toBeInTheDocument();

      await userEvent.selectOptions(workType, WorkTypes.enum.Monograph);
      await userEvent.click(await screen.findByRole('button', { name: 'preview' }));

      const [plan] = callbacks.onPreview.mock.calls[0] as [ImportPlan];
      // The publisher's choice stands, with its own provenance; the suggestion never crosses into the plan.
      expect(plan.works[0].type).toBe(WorkTypes.enum.Monograph);
      expect(plan.onix?.workGroups[0].workType).toEqual({
        status: 'RESOLVED',
        type: WorkTypes.enum.Monograph,
        provenance: 'USER_WORK_OVERRIDE',
      });
      expect(JSON.stringify(plan)).not.toContain(WorkTypes.enum.EditedBook);
    });

    it('reduces the sales rights and contacts of the validated source beside the commercial reduction, reads the publisher back only for an accessibility request contact, and offers the plan only once the contact is acknowledged (#217)', async () => {
      const candidate = { works: [getDefaultWork({ id: 'work-1' })], chapters: [], series: [] };
      const contacted = isbnOnixData();
      const [record] = contacted.ONIXMessage.Product as unknown as Record<string, unknown>[];

      record.PublishingDetail = {
        PublishingStatus: '02',
        ProductContact: {
          ProductContactRole: '01',
          ProductContactName: 'Example Press',
          EmailAddress: 'access@example.org',
        },
      };
      mockRawParse.mockReturnValue(contacted);
      mockParse.mockImplementation(adaptedParse(candidate));
      services.publisherService.getPublisher.mockResolvedValue({
        id: 'publisher-1',
        contacts: [
          { id: 'c-1', type: 'ACCESSIBILITY', email: 'other@example.org' },
          { id: 'c-2', type: 'ACCESSIBILITY', email: 'access@example.org' },
        ],
      });
      const { callbacks } = renderXMLParse(xmlFile().file);

      await chooseWorkType();
      // The contact holds the plan: no preview is offered until its omission is acknowledged, in the panel.
      const box = await screen.findByRole('checkbox', { name: /^onixPlan\.productContact\.acknowledge / });

      expect(screen.queryByRole('button', { name: 'preview' })).not.toBeInTheDocument();
      expect(screen.getByTestId('onix-plan-product-contacts')).toHaveTextContent(
        'onixPlan.productContact.accessibilityMatch',
      );
      await userEvent.click(box);
      await userEvent.click(await screen.findByRole('button', { name: 'preview' }));

      // The publisher was read once, by id, and only its Accessibility contact emails reached the reduction.
      expect(services.publisherService.getPublisher).toHaveBeenCalledExactlyOnceWith('publisher-1');
      const calls = mockReduceOnixSalesRights.mock.calls;
      const [adapter, sourcePlan, options] = calls[calls.length - 1];

      expect(adapter).toBe(contacted);
      expect(sourcePlan).toBe((mockXMLParser.mock.calls[0][8] as XMLParserOptions).sourcePlan);
      expect(options).toEqual({
        provenance: expect.objectContaining({ sourcePathOf: expect.any(Function) }),
        commercial: mockReduceOnixCommercial.mock.results[0].value,
        publisherAccessibilityContactEmails: ['other@example.org', 'access@example.org'],
      });

      const [plan] = callbacks.onPreview.mock.calls[0] as [ImportPlan];

      expect(plan.onix?.salesRights?.findings.map(({ code }) => code)).toEqual(['PRODUCT_CONTACT_NOT_REPRESENTED']);
      expect(plan.onix?.acknowledgedRightsFindingKeys).toEqual([plan.onix?.salesRights?.findings[0].key]);
      expect(plan.onix?.inputs.rightsChoices).toEqual({
        [plan.onix?.salesRights?.findings[0].key ?? '']: 'ACKNOWLEDGED',
      });
      // No contact, email or publisher mutation reaches the executable Work.
      expect(JSON.stringify(plan.works)).not.toContain('access@example.org');
      expect(services.publisherService.getPublisher.mock.calls.every(([, superuser]) => superuser === undefined)).toBe(
        true,
      );
    });

    it('reads the publisher back for no other contact role, and plans without the evidence when the read fails (#217)', async () => {
      const candidate = { works: [getDefaultWork({ id: 'work-1' })], chapters: [], series: [] };
      const promotional = isbnOnixData();
      const [record] = promotional.ONIXMessage.Product as unknown as Record<string, unknown>[];

      record.PublishingDetail = {
        PublishingStatus: '02',
        ProductContact: {
          ProductContactRole: '02',
          ProductContactName: 'Press Office',
          EmailAddress: 'press@example.org',
        },
      };
      mockRawParse.mockReturnValue(promotional);
      mockParse.mockImplementation(adaptedParse(candidate));
      renderXMLParse(xmlFile().file);
      await chooseWorkType();
      await screen.findByRole('button', { name: 'preview' });

      expect(services.publisherService.getPublisher).not.toHaveBeenCalled();
      expect(mockReduceOnixSalesRights).toHaveBeenCalledOnce();
      expect(mockReduceOnixSalesRights.mock.calls[0][2]).not.toHaveProperty('publisherAccessibilityContactEmails');
      cleanup();

      const accessibility = isbnOnixData();
      const [accessible] = accessibility.ONIXMessage.Product as unknown as Record<string, unknown>[];

      accessible.PublishingDetail = {
        PublishingStatus: '02',
        ProductContact: {
          ProductContactRole: '01',
          ProductContactName: 'Example Press',
          EmailAddress: 'access@example.org',
        },
      };
      mockRawParse.mockReturnValue(accessibility);
      services.publisherService.getPublisher.mockRejectedValue(new Error('publisher unavailable'));
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderXMLParse(xmlFile().file);
      await chooseWorkType();
      const box = await screen.findByRole('checkbox', { name: /^onixPlan\.productContact\.acknowledge / });

      expect(box).toBeInTheDocument();
      expect(screen.getByTestId('onix-plan-product-contacts')).not.toHaveTextContent('accessibilityMatch');
      const lastOptions = mockReduceOnixSalesRights.mock.calls[mockReduceOnixSalesRights.mock.calls.length - 1][2];

      expect(lastOptions).not.toHaveProperty('publisherAccessibilityContactEmails');
      // The failure is logged without the contact's data.
      expect(JSON.stringify(error.mock.calls)).not.toContain('access@example.org');
      error.mockRestore();
    });

    it('reduces every ProductFormFeature of the validated source beside its rights, keeps print accessibility as evidence, and offers the plan only once a material loss is acknowledged (#221)', async () => {
      const candidate = { works: [getDefaultWork({ id: 'work-1' })], chapters: [], series: [] };
      const featured = isbnOnixData();
      const [record] = featured.ONIXMessage.Product as unknown as { DescriptiveDetail: Record<string, unknown> }[];
      const fetchSpy = vi.fn();

      record.DescriptiveDetail = {
        ...record.DescriptiveDetail,
        ProductFormFeature: [
          { ProductFormFeatureType: '09', ProductFormFeatureValue: '81' },
          { ProductFormFeatureType: '09', ProductFormFeatureValue: '85' },
          {
            ProductFormFeatureType: '09',
            ProductFormFeatureValue: '96',
            ProductFormFeatureDescription: 'https://example.org/accessibility',
          },
          {
            ProductFormFeatureType: '14',
            ProductFormFeatureValue: '01',
            ProductFormFeatureDescription: 'UN3481 lithium ion batteries packed with equipment',
          },
        ],
      };
      vi.stubGlobal('fetch', fetchSpy);
      mockRawParse.mockReturnValue(featured);
      mockParse.mockImplementation(adaptedParse(candidate));
      const { callbacks } = renderXMLParse(xmlFile().file);

      await chooseWorkType();
      // The dangerous-goods fact holds the plan: no preview until its omission is acknowledged, in the panel.
      const box = await screen.findByRole('checkbox', { name: /^onixPlan\.productFormFeature\.acknowledge / });

      expect(screen.queryByRole('button', { name: 'preview' })).not.toBeInTheDocument();
      expect(screen.getByTestId('onix-plan-product-form-features')).toHaveTextContent(
        'UN3481 lithium ion batteries packed with equipment',
      );
      // The paperback's accessibility detail is shown as evidence, and nothing is projected to it.
      expect(screen.getByTestId('onix-plan-accessibility')).toHaveTextContent('onixPlan.accessibility.action.CREATE');
      await userEvent.click(box);
      await userEvent.click(await screen.findByRole('button', { name: 'preview' }));

      // Reduced once, from the bridged adapter value and the source plan, beside the rights reduction.
      expect(mockReduceOnixAccessibility).toHaveBeenCalledOnce();
      const [adapter, sourcePlan, options] = mockReduceOnixAccessibility.mock.calls[0];

      expect(adapter).toBe(featured);
      expect(sourcePlan).toBe((mockXMLParser.mock.calls[0][8] as XMLParserOptions).sourcePlan);
      expect(options).toEqual({
        provenance: expect.objectContaining({ sourcePathOf: expect.any(Function) }),
        rights: mockReduceOnixRights.mock.results[0].value,
      });

      const [plan] = callbacks.onPreview.mock.calls[0] as [ImportPlan];
      const [productKey] = Object.keys(plan.onix?.accessibility?.products ?? {});
      const [publication] = plan.works[0].publications;

      expect(plan.onix?.accessibility?.products[productKey].features).toHaveLength(4);
      expect(plan.onix?.accessibilityActions).toEqual([
        expect.objectContaining({
          publicationType: PublicationType.enum.Paperback,
          action: { kind: 'CREATE' },
          resolved: {
            accessibilityStandard: null,
            accessibilityAdditionalStandard: null,
            accessibilityException: null,
            accessibilityReportUrl: null,
          },
        }),
      ]);
      expect([
        publication.accessibilityStandard,
        publication.accessibilityAdditionalStandard,
        publication.accessibilityException,
        publication.accessibilityReportUrl,
      ]).toEqual([null, null, null, '']);
      expect(Object.values(plan.onix?.inputs.accessibilityChoices ?? {})).toEqual(['ACKNOWLEDGED']);
      expect(JSON.stringify(plan.works)).not.toContain('UN3481');
      expect(fetchSpy).not.toHaveBeenCalled();
      vi.unstubAllGlobals();
    });
  });
});
