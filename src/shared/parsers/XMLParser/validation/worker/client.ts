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
      /**
       * Validates the exact bytes retained in the Worker for this session. Single-flight: only the first call
       * continues the session; a call while that continuation is in flight settles `BUSY` at once, and a call
       * after the session ended settles with that end.
       */
      proceed(): Promise<ValidationOutcome>;
    }
  | { readonly kind: 'cancelled'; readonly stage: ValidationStageName | null }
  | {
      readonly kind: 'error';
      readonly code: WorkerErrorCode | 'WORKER_FAILED' | 'TERMINATED';
      readonly message: string;
    };

export interface OnixValidationClient {
  /** Resolves once the Worker has booted and reported its engine class; rejects if the session ends first. */
  readonly ready: Promise<{
    readonly engine: EngineClass;
    readonly userAgent: string;
    readonly protocolVersion: number;
  }>;
  /** Starts this client's one session; a second begin settles `BUSY`, or with the end once the session is over. */
  begin(bytes: Uint8Array, options?: BeginOptions): Promise<ValidationOutcome>;
  /** Cooperative cancellation of the session: the outcome in flight becomes `cancelled`, which ends the session. */
  cancel(): void;
  /** Hard termination of the Worker: ends the session at once, settling whatever is in flight as `TERMINATED`. */
  terminate(): void;
  onProgress(listener: (event: ProgressEvent) => void): () => void;
  /** True once the session has ended and its Worker has been terminated, whatever ended it. */
  readonly terminated: boolean;
}

export interface OnixValidationClientOptions {
  /** Constructs the dedicated Worker of this one session (e.g. `() => new Worker(url, { type: 'module' })`). */
  readonly createWorker: () => WorkerPort;
}

type ReadyInfo = Awaited<OnixValidationClient['ready']>;
type EndOutcome = Extract<ValidationOutcome, { kind: 'error' }>;
type TerminalMessage = Extract<WorkerToClientMessage, { type: 'result' | 'refused' | 'cancelled' | 'error' }>;

/** The client side of the one session: at most one request is ever in flight. */
type Phase =
  | { readonly kind: 'IDLE' }
  | { readonly kind: 'IN_FLIGHT'; readonly settle: (outcome: ValidationOutcome) => void; cancelRequested: boolean }
  | { readonly kind: 'AWAITING_CONTINUATION'; readonly token: string }
  | { readonly kind: 'ENDED'; readonly outcome: EndOutcome };

/** The session's one run; its Worker is dedicated, so no other run shares the channel. */
const RUN_ID = 'run-1';
const TERMINATED: EndOutcome = { kind: 'error', code: 'TERMINATED', message: 'the Worker was terminated' };
const SESSION_ENDED: EndOutcome = {
  kind: 'error',
  code: 'SESSION_ENDED',
  message: 'this validation session has ended; a new session needs a new client',
};
const busy = (message: string): EndOutcome => ({ kind: 'error', code: 'BUSY', message });

function toOutcome(data: TerminalMessage): ValidationOutcome {
  switch (data.type) {
    case 'result':
      return { kind: 'result', result: data.result, envelope: data.envelope };
    case 'refused':
      return { kind: 'refused', reason: data.reason, envelope: data.envelope };
    case 'cancelled':
      return { kind: 'cancelled', stage: data.stage };
    case 'error':
      return { kind: 'error', code: data.code, message: data.message };
  }
}

/**
 * Promise client over the Worker protocol for ONE selected ONIX validation
 * session (thoth-app#196). It constructs one dedicated Worker, posts it one
 * `begin` (raw bytes transferred when the array owns its whole buffer) and,
 * after a warning, at most one continuation of that same session. At most
 * one request is in flight, so every reply answers exactly that request;
 * replies that answer nothing in flight are ignored. The session's terminal
 * outcome (result, refusal, cancellation, error), a Worker failure or
 * `terminate()` ends it: the Worker is terminated, a pending `ready` is
 * rejected and every later call settles at once without reaching a Worker.
 * A new session needs a new client, hence a fresh Worker with fresh
 * compiled state.
 */
export function createOnixValidationClient(options: OnixValidationClientOptions): OnixValidationClient {
  const worker = options.createWorker();
  const listeners = new Set<(event: ProgressEvent) => void>();
  let phase: Phase = { kind: 'IDLE' };

  let resolveReady!: (ready: ReadyInfo) => void;
  let rejectReady!: (error: Error) => void;
  const ready = new Promise<ReadyInfo>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  ready.catch(() => undefined);

  /** Ends the session once: terminates the Worker, rejects a pending `ready`, settles the request in flight. */
  const end = (after: EndOutcome, inFlightOutcome: ValidationOutcome = after) => {
    if (phase.kind === 'ENDED') return;
    const inFlight = phase.kind === 'IN_FLIGHT' ? phase.settle : null;
    phase = { kind: 'ENDED', outcome: after };
    worker.terminate();
    rejectReady(new Error(after.message));
    inFlight?.(inFlightOutcome);
  };

  /** Posts the phase's one request; the promise settles with its reply, or with the session's end. */
  const request = (message: ClientToWorkerMessage, transfer?: Transferable[]) =>
    new Promise<ValidationOutcome>((resolve) => {
      phase = { kind: 'IN_FLIGHT', settle: resolve, cancelRequested: false };
      if (transfer) worker.postMessage(message, transfer);
      else worker.postMessage(message);
    });

  const warning = (token: string, envelope: EnvelopeEvidence): ValidationOutcome => ({
    kind: 'warning',
    envelope,
    token,
    proceed: () => {
      if (phase.kind === 'ENDED') return Promise.resolve(phase.outcome);
      if (phase.kind !== 'AWAITING_CONTINUATION' || phase.token !== token) {
        return Promise.resolve(busy('the continuation of this session is already in flight'));
      }
      return request({ type: 'continue', runId: RUN_ID, token });
    },
  });

  worker.addEventListener('error', (event) => {
    end({ kind: 'error', code: 'WORKER_FAILED', message: event.message ?? 'worker error' });
  });

  worker.addEventListener('message', ({ data }) => {
    // Nothing revives an ended session: a late ready, reply or progress message is ignored.
    if (phase.kind === 'ENDED') return;
    if (data.type === 'ready') {
      resolveReady({ engine: data.engine, userAgent: data.userAgent, protocolVersion: data.protocolVersion });
      return;
    }
    // Only the request in flight can be answered; anything else is stale.
    if (phase.kind !== 'IN_FLIGHT' || data.runId !== RUN_ID) return;
    if (data.type === 'progress') {
      for (const listener of listeners) listener(data);
      return;
    }
    if (data.type === 'warning') {
      const { settle, cancelRequested } = phase;
      if (cancelRequested) {
        // The warning crossed a cancel: the session ends cancelled and is never offered for continuation.
        end(SESSION_ENDED, { kind: 'cancelled', stage: 'ENVELOPE' });
        return;
      }
      phase = { kind: 'AWAITING_CONTINUATION', token: data.token };
      settle(warning(data.token, data.envelope));
      return;
    }
    end(SESSION_ENDED, toOutcome(data));
  });

  return {
    ready,
    get terminated() {
      return phase.kind === 'ENDED';
    },
    begin(bytes, beginOptions = {}) {
      if (phase.kind === 'ENDED') return Promise.resolve(phase.outcome);
      if (phase.kind !== 'IDLE') {
        return Promise.resolve(
          busy('this client already serves a validation session; a new session needs a new client'),
        );
      }
      const owned = bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength;
      const payload = owned ? bytes : bytes.slice();
      return request({ type: 'begin', runId: RUN_ID, bytes: payload, options: beginOptions }, [payload.buffer]);
    },
    cancel() {
      if (phase.kind === 'IN_FLIGHT') {
        if (phase.cancelRequested) return;
        phase.cancelRequested = true;
        worker.postMessage({ type: 'cancel', runId: RUN_ID });
      } else if (phase.kind === 'AWAITING_CONTINUATION') {
        // Nothing runs while a warning waits: ending the session disposes the retained bytes with the Worker.
        end(SESSION_ENDED);
      }
    },
    terminate() {
      end(TERMINATED);
    },
    onProgress(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
