import type {
  BeginOptions,
  ClientToWorkerMessage,
  EngineClass,
  EnvelopeEvidence,
  OnixWorkerResult,
  ValidationStageName,
  WorkerErrorCode,
  WorkerToClientMessage,
} from './protocol';

/** The subset of the Web Worker surface the client uses (a real `Worker`, or a loopback in tests). */
export interface WorkerPort {
  postMessage(message: ClientToWorkerMessage, transfer?: Transferable[]): void;
  addEventListener(type: 'message', listener: (event: { readonly data: WorkerToClientMessage }) => void): void;
  addEventListener(type: 'error', listener: (event: { readonly message?: string }) => void): void;
  terminate(): void;
}

export interface ProgressEvent {
  readonly runId: string;
  readonly stage: ValidationStageName;
  readonly done?: number;
  readonly total?: number;
}

export type ValidationOutcome =
  | { readonly kind: 'result'; readonly result: OnixWorkerResult; readonly envelope: EnvelopeEvidence | null }
  | {
      readonly kind: 'refused';
      readonly reason: 'UNSUPPORTED_FOR_BROWSER_VALIDATION';
      readonly envelope: EnvelopeEvidence;
    }
  | {
      readonly kind: 'warning';
      readonly envelope: EnvelopeEvidence;
      readonly token: string;
      /** Validates the exact bytes retained in the Worker for this session. */
      proceed(): Promise<ValidationOutcome>;
    }
  | { readonly kind: 'cancelled'; readonly stage: ValidationStageName | null }
  | {
      readonly kind: 'error';
      readonly code: WorkerErrorCode | 'WORKER_FAILED' | 'TERMINATED';
      readonly message: string;
    };

export interface OnixValidationClient {
  /** Resolves once the Worker has booted and reported its engine class. */
  readonly ready: Promise<{
    readonly engine: EngineClass;
    readonly userAgent: string;
    readonly protocolVersion: number;
  }>;
  begin(bytes: Uint8Array, options?: BeginOptions): Promise<ValidationOutcome>;
  /** Cooperative cancellation of the current run; the outcome becomes `cancelled`. */
  cancel(): void;
  /** Hard termination of the Worker; the client is finished afterwards and a new one starts fresh state. */
  terminate(): void;
  onProgress(listener: (event: ProgressEvent) => void): () => void;
  readonly terminated: boolean;
}

export interface OnixValidationClientOptions {
  /** Constructs the dedicated Worker for this session (e.g. `() => new Worker(url, { type: 'module' })`). */
  readonly createWorker: () => WorkerPort;
}

/**
 * Promise client over the Worker protocol: one dedicated Worker per client,
 * one run at a time, raw bytes posted once (transferred when the array owns
 * its whole buffer). A warning outcome exposes `proceed()`, bound to the
 * session token the Worker issued.
 */
export function createOnixValidationClient(options: OnixValidationClientOptions): OnixValidationClient {
  const worker = options.createWorker();
  const listeners = new Set<(event: ProgressEvent) => void>();
  let terminated = false;
  let sequence = 0;
  let currentRunId: string | null = null;
  let settle: ((outcome: ValidationOutcome) => void) | null = null;

  let resolveReady!: (ready: { engine: EngineClass; userAgent: string; protocolVersion: number }) => void;
  let rejectReady!: (error: Error) => void;
  const ready = new Promise<{ engine: EngineClass; userAgent: string; protocolVersion: number }>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  ready.catch(() => undefined);

  const fail = (code: 'WORKER_FAILED' | 'TERMINATED', message: string) => {
    const pending = settle;
    settle = null;
    currentRunId = null;
    pending?.({ kind: 'error', code, message });
  };

  worker.addEventListener('error', (event) => {
    rejectReady(new Error(event.message ?? 'worker error'));
    fail('WORKER_FAILED', event.message ?? 'worker error');
  });

  worker.addEventListener('message', ({ data }) => {
    if (data.type === 'ready') {
      resolveReady({ engine: data.engine, userAgent: data.userAgent, protocolVersion: data.protocolVersion });
      return;
    }
    if (data.type === 'progress') {
      if (data.runId === currentRunId) for (const listener of listeners) listener(data);
      return;
    }
    if (data.type === 'error' && data.runId === null) return;
    if (data.runId !== currentRunId || !settle) return;
    const pending = settle;
    const outcome = toOutcome(data);
    if (outcome.kind !== 'warning') {
      settle = null;
      currentRunId = null;
    }
    pending(outcome);
  });

  function toOutcome(
    data: Exclude<WorkerToClientMessage, { type: 'ready' } | { type: 'progress' }>,
  ): ValidationOutcome {
    switch (data.type) {
      case 'result':
        return { kind: 'result', result: data.result, envelope: data.envelope };
      case 'refused':
        return { kind: 'refused', reason: data.reason, envelope: data.envelope };
      case 'cancelled':
        return { kind: 'cancelled', stage: data.stage };
      case 'error':
        return { kind: 'error', code: data.code, message: data.message };
      case 'warning': {
        const { runId, token, envelope } = data;
        return {
          kind: 'warning',
          envelope,
          token,
          proceed: () =>
            new Promise<ValidationOutcome>((resolve) => {
              if (terminated)
                return resolve({ kind: 'error', code: 'TERMINATED', message: 'the Worker was terminated' });
              settle = resolve;
              currentRunId = runId;
              worker.postMessage({ type: 'continue', runId, token });
            }),
        };
      }
    }
  }

  return {
    ready,
    get terminated() {
      return terminated;
    },
    begin(bytes, beginOptions = {}) {
      return new Promise<ValidationOutcome>((resolve) => {
        if (terminated) return resolve({ kind: 'error', code: 'TERMINATED', message: 'the Worker was terminated' });
        if (settle) return resolve({ kind: 'error', code: 'BUSY', message: 'a run is in progress on this client' });
        const runId = `run-${++sequence}`;
        settle = resolve;
        currentRunId = runId;
        const owned = bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength;
        const payload = owned ? bytes : bytes.slice();
        worker.postMessage({ type: 'begin', runId, bytes: payload, options: beginOptions }, [payload.buffer]);
      });
    },
    cancel() {
      if (currentRunId && !terminated) worker.postMessage({ type: 'cancel', runId: currentRunId });
    },
    terminate() {
      if (terminated) return;
      terminated = true;
      worker.terminate();
      fail('TERMINATED', 'the Worker was terminated');
    },
    onProgress(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
