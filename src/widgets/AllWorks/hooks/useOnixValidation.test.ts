import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type ClientToWorkerMessage,
  ENGINE_ENVELOPES,
  type EngineClass,
  type EnvelopeEvidence,
  ONIX_WORKER_PROTOCOL_VERSION,
  type OnixWorkerResult,
  type WorkerToClientMessage,
} from '@/src/shared/parsers/XMLParser/validation';

import { createOnixValidationWorker, type OnixValidationSettlement, useOnixValidation } from './useOnixValidation';

type WorkerListener = (event: { readonly data?: WorkerToClientMessage; readonly message?: string }) => void;

/** Stands in for the browser `Worker` global, driven by the real #196 client; tests script its replies. */
class FakeWorker {
  static instances: FakeWorker[] = [];
  static engine: EngineClass | null = 'chromium';
  static reply: ((worker: FakeWorker, message: ClientToWorkerMessage) => void) | null = null;
  static onConstruct: ((worker: FakeWorker) => void) | null = null;

  readonly received: ClientToWorkerMessage[] = [];
  terminated = 0;
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
    const { reply } = FakeWorker;
    if (reply) setTimeout(() => reply(this, message), 0);
  }

  terminate() {
    this.terminated += 1;
  }

  emit(data: WorkerToClientMessage) {
    for (const listener of this.listeners.message) listener({ data });
  }
}

const RESULT: OnixWorkerResult = {
  status: 'COMPLETED',
  stop: null,
  source: {
    release: '3.0',
    schemaRelease: '3.0.8',
    flavour: 'reference',
    namespaceURI: 'http://ns.editeur.org/onix/3.0/reference',
  },
  findings: [],
  summary: { total: 0, blocking: 0, secondary: 0, notEvaluable: 0, recovered: 0 },
  sourceValid: true,
  normalized: {
    xml: '<ONIXMessage release="3.0"/>',
    elementCount: 1,
    recoveries: [],
    provenance: { kind: 'IDENTITY', flavour: 'reference' },
  },
};

const envelopeOf = (verdict: EnvelopeEvidence['verdict'], overrides: Partial<EnvelopeEvidence> = {}): EnvelopeEvidence => ({
  engine: 'chromium',
  bytes: 64,
  products: { measured: true, count: 1 },
  verdict,
  limits: ENGINE_ENVELOPES.chromium,
  exceeded: [],
  ...overrides,
});
const NORMAL = envelopeOf('NORMAL');
const WARNING = envelopeOf('WARNING', { products: { measured: true, count: 1_200 }, exceeded: ['products'] });

const result = (runId: string, envelope: EnvelopeEvidence | null = NORMAL): WorkerToClientMessage => ({
  type: 'result',
  runId,
  result: RESULT,
  envelope,
});

const answer =
  (onBegin: (runId: string) => WorkerToClientMessage, onContinue?: (runId: string) => WorkerToClientMessage) =>
  (worker: FakeWorker, message: ClientToWorkerMessage): void => {
    if (message.type === 'begin') worker.emit(onBegin(message.runId));
    else if (message.type === 'continue' && onContinue) worker.emit(onContinue(message.runId));
  };

function xmlFile(content = '<ONIXMessage/>') {
  const file = new File([content], 'test.xml', { type: 'text/xml' });
  const arrayBuffer = vi.fn(async () => new TextEncoder().encode(content).buffer as ArrayBuffer);
  Object.defineProperty(file, 'arrayBuffer', { configurable: true, value: arrayBuffer });
  return { file, arrayBuffer };
}

const renderValidation = (file: File) => {
  const onSettled = vi.fn<(settlement: OnixValidationSettlement) => void>();
  const hook = renderHook(({ file }: { file: File }) => useOnixValidation(file, onSettled), { initialProps: { file } });
  return { onSettled, ...hook };
};

const tick = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 20)));

describe('useOnixValidation', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    FakeWorker.instances = [];
    FakeWorker.engine = 'chromium';
    FakeWorker.onConstruct = null;
    FakeWorker.reply = answer((runId) => result(runId));
    vi.stubGlobal('Worker', FakeWorker);
  });

  it('constructs the dedicated module Worker from its statically discoverable production entry', () => {
    const worker = createOnixValidationWorker() as unknown as FakeWorker;

    expect(worker).toBeInstanceOf(FakeWorker);
    // Under Vite the literal is itself rewritten by the bundler's Worker detection (`?worker_file&type=module`).
    expect(String(worker.url)).toMatch(/\/src\/shared\/parsers\/XMLParser\/validation\/worker\/onix\.worker\.ts(\?.*)?$/);
    expect(worker.options).toEqual({ type: 'module' });
  });

  it('awaits Worker readiness before reading the file, then sends its raw bytes once', async () => {
    FakeWorker.engine = null;
    const { file, arrayBuffer } = xmlFile('<ONIXMessage release="3.0"/>');
    const { result: hook } = renderValidation(file);

    await tick();
    expect(hook.current.view).toEqual({ phase: 'starting' });
    expect(arrayBuffer).not.toHaveBeenCalled();
    const [worker] = FakeWorker.instances;
    expect(worker.types).toEqual([]);

    act(() => worker.boot('chromium'));

    await waitFor(() => expect(worker.types).toEqual(['begin']));
    const [begin] = worker.received;
    expect(begin).toEqual({ type: 'begin', runId: 'run-1', bytes: expect.any(Uint8Array), options: { progress: true } });
    expect(begin.type === 'begin' && new TextDecoder().decode(begin.bytes)).toBe('<ONIXMessage release="3.0"/>');
    expect(arrayBuffer).toHaveBeenCalledOnce();
  });

  it('reports the real stages and passes done/total through untouched', async () => {
    FakeWorker.reply = null;
    const { result: hook } = renderValidation(xmlFile().file);

    await waitFor(() => expect(FakeWorker.instances[0]?.types).toEqual(['begin']));
    expect(hook.current.view).toEqual({ phase: 'validating', stage: null });

    const [worker] = FakeWorker.instances;
    act(() => worker.emit({ type: 'progress', runId: 'run-1', stage: 'DECODING' }));
    expect(hook.current.view).toEqual({ phase: 'validating', stage: 'DECODING' });

    act(() => worker.emit({ type: 'progress', runId: 'run-1', stage: 'STRICT', done: 3, total: 9 }));
    expect(hook.current.view).toEqual({ phase: 'validating', stage: 'STRICT', done: 3, total: 9 });
  });

  it('settles exactly once with the canonical result and disposes the Worker', async () => {
    const { onSettled, result: hook } = renderValidation(xmlFile().file);

    await waitFor(() => expect(onSettled).toHaveBeenCalledOnce());
    expect(onSettled).toHaveBeenCalledWith({ kind: 'result', result: RESULT, envelope: NORMAL });
    expect(hook.current.view).toEqual({ phase: 'settled' });

    const [worker] = FakeWorker.instances;
    expect(worker.terminated).toBe(1);
    act(() => worker.emit(result('run-1')));
    await tick();
    expect(onSettled).toHaveBeenCalledOnce();
  });

  it('settles a refusal with its envelope evidence and a Worker error with its code', async () => {
    const refused = envelopeOf('UNSUPPORTED', { engine: 'webkit', limits: null });
    FakeWorker.reply = answer((runId) => ({
      type: 'refused',
      runId,
      reason: 'UNSUPPORTED_FOR_BROWSER_VALIDATION',
      scope: 'SUPPORT',
      envelope: refused,
    }));
    const first = renderValidation(xmlFile().file);
    await waitFor(() => expect(first.onSettled).toHaveBeenCalledWith({ kind: 'refused', envelope: refused }));
    first.unmount();

    FakeWorker.reply = answer((runId) => ({ type: 'error', runId, code: 'INTERNAL', message: 'boom' }));
    const second = renderValidation(xmlFile().file);
    await waitFor(() =>
      expect(second.onSettled).toHaveBeenCalledWith({ kind: 'error', code: 'INTERNAL', message: 'boom' }),
    );
    expect(FakeWorker.instances.map(({ terminated }) => terminated)).toEqual([1, 1]);
  });

  it('continues a warning at most once, in the same session', async () => {
    FakeWorker.reply = answer(
      (runId) => ({ type: 'warning', runId, token: 'token-1', envelope: WARNING }),
      (runId) => result(runId, WARNING),
    );
    const { onSettled, result: hook } = renderValidation(xmlFile().file);

    await waitFor(() => expect(hook.current.view).toEqual({ phase: 'awaiting-decision', envelope: WARNING }));
    await tick();
    expect(onSettled).not.toHaveBeenCalled();
    const [worker] = FakeWorker.instances;
    expect(worker.types).toEqual(['begin']);

    const { proceed } = hook.current;
    act(() => {
      proceed();
      proceed();
    });

    await waitFor(() => expect(onSettled).toHaveBeenCalledOnce());
    expect(onSettled).toHaveBeenCalledWith({ kind: 'result', result: RESULT, envelope: WARNING });
    expect(worker.received).toEqual([expect.objectContaining({ type: 'begin' }), { type: 'continue', runId: 'run-1', token: 'token-1' }]);

    act(() => hook.current.proceed());
    await tick();
    expect(worker.types).toEqual(['begin', 'continue']);
  });

  it('cancelling a pending warning ends the session with no continuation', async () => {
    FakeWorker.reply = answer((runId) => ({ type: 'warning', runId, token: 'token-1', envelope: WARNING }));
    const { onSettled, result: hook } = renderValidation(xmlFile().file);
    await waitFor(() => expect(hook.current.view.phase).toBe('awaiting-decision'));

    act(() => hook.current.cancel());

    expect(onSettled).toHaveBeenCalledExactlyOnceWith({ kind: 'cancelled' });
    const [worker] = FakeWorker.instances;
    expect(worker.terminated).toBe(1);
    act(() => hook.current.proceed());
    await tick();
    expect(worker.types).toEqual(['begin']);
  });

  it('cancelling during validation terminates at once and ignores the late reply', async () => {
    FakeWorker.reply = null;
    const { onSettled, result: hook } = renderValidation(xmlFile().file);
    await waitFor(() => expect(FakeWorker.instances[0]?.types).toEqual(['begin']));

    act(() => hook.current.cancel());

    expect(onSettled).toHaveBeenCalledExactlyOnceWith({ kind: 'cancelled' });
    const [worker] = FakeWorker.instances;
    expect(worker.terminated).toBe(1);
    act(() => worker.emit(result('run-1')));
    await tick();
    expect(onSettled).toHaveBeenCalledOnce();
  });

  it('unmounting terminates the Worker and settles nothing', async () => {
    FakeWorker.reply = null;
    const { onSettled, unmount } = renderValidation(xmlFile().file);
    await waitFor(() => expect(FakeWorker.instances[0]?.types).toEqual(['begin']));

    unmount();

    const [worker] = FakeWorker.instances;
    expect(worker.terminated).toBe(1);
    act(() => worker.emit(result('run-1')));
    await tick();
    expect(onSettled).not.toHaveBeenCalled();
  });

  it('a new file starts a fresh Worker, and the old session can no longer settle', async () => {
    FakeWorker.reply = null;
    const { onSettled, rerender } = renderValidation(xmlFile('<first/>').file);
    await waitFor(() => expect(FakeWorker.instances[0]?.types).toEqual(['begin']));

    rerender({ file: xmlFile('<second/>').file });

    await waitFor(() => expect(FakeWorker.instances[1]?.types).toEqual(['begin']));
    const [old, current] = FakeWorker.instances;
    expect(old.terminated).toBe(1);
    const [begin] = current.received;
    expect(begin.type === 'begin' && new TextDecoder().decode(begin.bytes)).toBe('<second/>');

    act(() => old.emit(result('run-1')));
    await tick();
    expect(onSettled).not.toHaveBeenCalled();

    act(() => current.emit(result('run-1')));
    await waitFor(() => expect(onSettled).toHaveBeenCalledOnce());
  });

  it('settles a Worker that cannot even be constructed as a runtime failure', async () => {
    FakeWorker.onConstruct = () => {
      throw new Error('Refused to create a worker');
    };
    const { onSettled } = renderValidation(xmlFile().file);

    await waitFor(() => expect(onSettled).toHaveBeenCalledOnce());
    expect(onSettled).toHaveBeenCalledWith({ kind: 'error', code: 'WORKER_FAILED', message: 'Refused to create a worker' });
  });

  it('settles an unreadable file before any validation request', async () => {
    const { file, arrayBuffer } = xmlFile();
    arrayBuffer.mockRejectedValue(new Error('The file could not be read'));
    const { onSettled } = renderValidation(file);

    await waitFor(() => expect(onSettled).toHaveBeenCalledOnce());
    expect(onSettled).toHaveBeenCalledWith({ kind: 'error', code: 'FILE_UNREADABLE', message: 'The file could not be read' });
    const [worker] = FakeWorker.instances;
    expect(worker.types).toEqual([]);
    expect(worker.terminated).toBe(1);
  });
});
