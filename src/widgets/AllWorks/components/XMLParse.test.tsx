import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ONIXMessageRoot } from '@5stones/onix/dist/interfaces';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useServices } from '@/src/shared/context/servicesContext';
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
import { ONIX_PROCESSING_FAILURE_MESSAGE } from '@/src/shared/parsers/XMLParser/XMLParser';
import type { ImportIssue, ImportIssueCode, ImportPlan } from '@/src/shared/types';
import { getDefaultWork } from '@/src/shared/utils/work';

const { mockRawParse, mockParse, mockXMLParser } = vi.hoisted(() => ({
  mockRawParse: vi.fn(),
  mockParse: vi.fn(),
  mockXMLParser: vi.fn(),
}));

vi.mock('@5stones/onix/dist/parse', () => ({
  parse: (...args: unknown[]) => mockRawParse(...args),
}));

vi.mock('@/src/shared/parsers', () => ({
  XMLParser: mockXMLParser,
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

/** Every contributor or institution lookup any rendered uploader could have made. */
const lookupCalls = () =>
  vi
    .mocked(useServices)
    .mock.results.flatMap(({ value }) => {
      const { contributorService, institutionService } = value as Record<string, Record<string, unknown>>;
      return [...Object.values(contributorService), ...Object.values(institutionService)];
    })
    .filter((fn) => vi.isMockFunction(fn))
    .reduce((calls, fn) => calls + vi.mocked(fn).mock.calls.length, 0);

const expectNoTargetWork = () => {
  expect(mockRawParse).not.toHaveBeenCalled();
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
    mockRawParse.mockReturnValue(parsedOnixData);
    mockParse.mockResolvedValue({
      status: 'success',
      data: {
        plan: { works: [], chapters: [], series: [] },
        contributorsForSelection: {},
      },
      issues: [],
    });
    mockXMLParser.mockImplementation(function () {
      return {
        parse: mockParse,
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
      mockXMLParser.mockImplementation(function () {
        order.push('target');
        return { parse: mockParse };
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
      mockParse.mockResolvedValue({ status: 'success', data: { plan, contributorsForSelection: {} }, issues: [] });
      const { callbacks } = renderXMLParse(xmlFile().file);

      await userEvent.click(await screen.findByRole('button', { name: 'preview' }));

      expect(callbacks.onPreview).toHaveBeenCalledWith(plan, [], { type: 'onix', filename: 'test.xml' });
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
      mockParse.mockResolvedValue({ status: 'success', data: { plan, contributorsForSelection: {} }, issues });
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
      let releaseFirstPlan: (value: unknown) => void = () => undefined;
      mockParse.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            releaseFirstPlan = resolve;
          }),
      );
      FakeWorker.reply = answer(resultReply(completed()));
      const { rerender } = render(parseElement(xmlFile('<ONIXMessage/>', 'first.xml').file, callbacks, SAME_KEY));
      await waitFor(() => expect(mockParse).toHaveBeenCalledOnce());

      succeedWith(PLAN_B);
      rerender(parseElement(xmlFile('<ONIXMessage/>', 'second.xml').file, callbacks, SAME_KEY));
      await userEvent.click(await screen.findByRole('button', { name: 'preview' }));
      expect(callbacks.onPreview).toHaveBeenCalledExactlyOnceWith(PLAN_B, [], { type: 'onix', filename: 'second.xml' });

      // The replaced file's planner finally answers, long after its file stopped being the selection.
      act(() => releaseFirstPlan({ status: 'success', data: { plan: PLAN_A, contributorsForSelection: {} }, issues: [WARNING_A] }));
      await tick();

      await userEvent.click(await screen.findByRole('button', { name: 'preview' }));
      expect(callbacks.onPreview).toHaveBeenCalledTimes(2);
      expect(callbacks.onPreview).toHaveBeenLastCalledWith(PLAN_B, [], { type: 'onix', filename: 'second.xml' });
    });

    it('offers only the new file\'s plan, warnings and name once the new file succeeds', async () => {
      const callbacks = handlers();
      const { rerender } = await planFirstFile(callbacks);
      const current = await selectSecondFile(rerender, callbacks);

      succeedWith(PLAN_B);
      act(() => current.emit(resultReply(completed())('run-1')));

      await userEvent.click(await screen.findByRole('button', { name: 'preview' }));
      expect(callbacks.onPreview).toHaveBeenCalledOnce();
      expect(callbacks.onPreview).toHaveBeenCalledWith(PLAN_B, [], { type: 'onix', filename: 'second.xml' });
      // Nothing of the first file rides along: neither its plan nor the warnings raised about it.
      expect(callbacks.onPreview).not.toHaveBeenCalledWith(PLAN_A, expect.anything(), expect.anything());
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
      mockParse.mockResolvedValue({
        status: 'success',
        data: { plan: { works: [work], chapters: [], series: [] }, contributorsForSelection: {} },
        issues: [targetWarning],
      });
      FakeWorker.reply = answer(resultReply(completed([recovered], [marker])));
      const { callbacks } = renderXMLParse(xmlFile().file);

      await userEvent.click(await screen.findByRole('button', { name: 'preview' }));

      const [, warnings] = callbacks.onPreview.mock.calls[0] as [unknown, ImportIssue[]];
      expect(warnings.map(({ severity, code, sourceValidation }) => ({ severity, code, sourceValidation }))).toEqual([
        { severity: 'warning', code: 'onix.source.validity', sourceValidation: { kind: 'finding', finding: recovered } },
        { severity: 'warning', code: 'onix.source.recovered', sourceValidation: { kind: 'recovery', recovery: marker } },
        { severity: 'warning', code: targetWarning.code, sourceValidation: undefined },
      ]);
      expect(warnings[0].message).toContain('onixValidation.disposition.OMIT_INVALID_COMPOSITE');
      expect(warnings[1].message).toContain(removed);
      expect(screen.getByTestId('onix-source-validated')).toHaveTextContent('onixValidation.validated.recovered');
      expect(callbacks.onValidationFailure).not.toHaveBeenCalled();
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
      let resolveParse: (result: unknown) => void = () => {};
      mockParse.mockImplementation(() => new Promise((resolve) => (resolveParse = resolve)));

      renderXMLParse(xmlFile().file);

      await waitFor(() => expect(mockParse).toHaveBeenCalledOnce());
      const phase = screen.getByTestId('import-phase-parsing');
      expect(phase).toBeVisible();
      expect(phase).toHaveTextContent('bulkImport.phase.parsingOnix');
      expect(phase).toHaveAttribute('aria-busy', 'true');
      expect(screen.queryByText(/\d+\s*%/)).not.toBeInTheDocument();

      await act(async () => {
        resolveParse({
          status: 'success',
          data: { plan: { works: [work], chapters: [], series: [] }, contributorsForSelection: {} },
          issues: [],
        });
      });

      await waitFor(() => expect(phase).not.toBeVisible());
    });

    it('carries the plan, its chapters and its warnings through to the preview', async () => {
      const chapter = { ...getDefaultWork({ id: 'chapter-1' }), relationId: work.id };
      const series = [
        {
          name: 'Arc Companions',
          target: { kind: 'existing' as const, seriesId: 'series-1' },
          members: [{ workId: work.id, orderNumber: 3 }],
        },
      ];
      const plan = { works: [work], chapters: [chapter], series };

      mockParse.mockResolvedValue({
        status: 'success',
        data: { plan, contributorsForSelection: {} },
        issues: [warning],
      });

      const { callbacks } = renderXMLParse(xmlFile().file);

      await userEvent.click(await screen.findByRole('button', { name: 'preview' }));

      // One plan, chapters and series membership intact, warnings beside it rather than in it.
      // The source (ONIX, and the file's name) travels alongside, never in the plan.
      expect(callbacks.onPreview).toHaveBeenCalledWith(plan, [warning], { type: 'onix', filename: 'test.xml' });
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
});
