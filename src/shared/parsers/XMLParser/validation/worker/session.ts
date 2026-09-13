import { decodeSource } from '../encoding';
import { evaluateSourceGate } from '../sourceGate';
import type { OnixSourceValidator } from '../validator';
import { classifyEngine, evaluateEnvelope, exceedsByteCeiling } from './envelope';
import type {
  BeginOptions,
  ClientToWorkerMessage,
  EnvelopeEvidence,
  ValidationStageName,
  WorkerToClientMessage,
} from './protocol';
import { toWorkerResult } from './result';
import { countProducts } from './sizing';

/**
 * Execution controls the session hands to the canonical validator of one run:
 * stage/progress reporting, cooperative cancellation between bounded work
 * units and the evidence-backed fast-path switch. Semantics never depend on
 * them; they only schedule and observe canonical work.
 */
export interface ValidatorControls {
  readonly accelerate: boolean;
  readonly onStage: (stage: ValidationStageName) => void;
  readonly onProgress: (progress: {
    readonly stage: 'STRICT' | 'SCHEMATRON';
    readonly done: number;
    readonly total: number;
  }) => void;
  readonly shouldCancel: () => boolean;
  readonly yield: () => Promise<void>;
}

export interface WorkerSessionDependencies {
  readonly post: (message: WorkerToClientMessage) => void;
  readonly userAgent: string;
  /**
   * Creates the canonical #190 validator of the session's one validation. It
   * must load and compile the standards resources lazily, only when a
   * validation proceeds past the envelope; the session calls it at most once
   * and never for refused or unconfirmed-warning sources.
   */
  readonly createValidator: (controls: ValidatorControls) => OnixSourceValidator;
  readonly decode?: typeof decodeSource;
  readonly gate?: typeof evaluateSourceGate;
  readonly sizing?: typeof countProducts;
  readonly newToken?: () => string;
  readonly yieldToEventLoop?: () => Promise<void>;
  readonly now?: () => number;
  /** Minimum interval between two `progress` messages carrying counts. */
  readonly progressIntervalMs?: number;
  /** Called once, right after the session's terminal message: the Worker entry closes itself. */
  readonly onEnded?: () => void;
}

export interface WorkerSession {
  handle(message: ClientToWorkerMessage): Promise<void>;
  readonly state: SessionState['kind'];
}

type SessionState =
  | { readonly kind: 'IDLE' }
  | { readonly kind: 'RUNNING'; readonly runId: string }
  | {
      readonly kind: 'AWAITING_CONTINUATION';
      readonly runId: string;
      readonly token: string;
      readonly bytes: Uint8Array;
      readonly envelope: EnvelopeEvidence;
      readonly options: BeginOptions;
    }
  | { readonly kind: 'ENDED' };

type TerminalMessage = Extract<WorkerToClientMessage, { type: 'result' | 'refused' | 'cancelled' | 'error' }>;

const defaultToken = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const defaultYield = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * The Worker-side state machine (thoth-app#196): a Worker serves exactly one
 * validation session, receiving the raw bytes once.
 *
 * begin: decode -> #190 stage-1/2 source gate -> (stop: canonical stopped
 * result) -> engine -> byte ceiling -> namespace-aware Product sizing ->
 * envelope -> NORMAL: validate; WARNING: retain the exact bytes, hand out a
 * continuation token; REFUSE / unsupported engine: deterministic SUPPORT
 * refusal. continue: validates the retained bytes of that token only; a
 * stale or unknown token fails closed. cancel: cooperative between bounded
 * units, discarding every partial finding.
 *
 * The session's terminal message (result, refusal, cancellation, internal
 * error) ends it: `onEnded` lets the entry close the Worker, and a later
 * begin is refused SESSION_ENDED - never replaced or rerun. The one validator
 * a session may build, with its compiled engines, and the retained source
 * never outlive the session; a new session is a new Worker with fresh state.
 */
export function createWorkerSession(deps: WorkerSessionDependencies): WorkerSession {
  const decode = deps.decode ?? decodeSource;
  const gate = deps.gate ?? evaluateSourceGate;
  const sizing = deps.sizing ?? countProducts;
  const newToken = deps.newToken ?? defaultToken;
  const yieldToEventLoop = deps.yieldToEventLoop ?? defaultYield;
  const now = deps.now ?? (() => Date.now());
  const progressIntervalMs = deps.progressIntervalMs ?? 100;
  const engine = classifyEngine(deps.userAgent);

  let state: SessionState = { kind: 'IDLE' };
  let cancelRequested = false;
  let lastStage: ValidationStageName | null = null;

  const post = deps.post;
  const error = (
    runId: string | null,
    code: 'BUSY' | 'NO_SESSION' | 'STALE_SESSION' | 'SESSION_ENDED' | 'MALFORMED_MESSAGE',
    message: string,
  ) => post({ type: 'error', runId, code, message });

  /** Posts the session's terminal message and ends the session. */
  function finish(message: TerminalMessage): void {
    state = { kind: 'ENDED' };
    post(message);
    deps.onEnded?.();
  }

  /** Runs one step of the session; an unexpected failure ends it with INTERNAL instead of rejecting the handler. */
  async function guarded(runId: string, step: () => Promise<void>): Promise<void> {
    try {
      await step();
    } catch (failure) {
      finish({ type: 'error', runId, code: 'INTERNAL', message: String(failure).slice(0, 300) });
    }
  }

  async function begin(runId: string, bytes: Uint8Array, options: BeginOptions): Promise<void> {
    state = { kind: 'RUNNING', runId };
    cancelRequested = false;
    lastStage = null;
    const stage = (name: ValidationStageName) => {
      lastStage = name;
      if (options.progress !== false) post({ type: 'progress', runId, stage: name });
    };
    stage('DECODING');
    const decoded = decode(bytes);
    if (decoded.kind !== 'TEXT') return finishCanonicalStop(runId, bytes, options);
    stage('SOURCE_GATE');
    const gated = gate(decoded.text);
    if (gated.kind === 'STOP') return finishCanonicalStop(runId, bytes, options);

    const byteLength = bytes.byteLength;
    stage('ENVELOPE');
    if (engine !== 'chromium' && engine !== 'gecko') {
      return refuse(runId, evaluateEnvelope(engine, byteLength, { measured: false, reason: 'ENGINE_UNSUPPORTED' }));
    }
    if (exceedsByteCeiling(engine, byteLength)) {
      return refuse(runId, evaluateEnvelope(engine, byteLength, { measured: false, reason: 'BYTE_CEILING_EXCEEDED' }));
    }
    stage('SIZING');
    const products = sizing(decoded.text, gated.source);
    stage('ENVELOPE');
    const envelope = evaluateEnvelope(engine, byteLength, products);
    if (envelope.verdict === 'REFUSE' || envelope.verdict === 'UNSUPPORTED') return refuse(runId, envelope);
    if (envelope.verdict === 'WARNING') {
      const token = newToken();
      state = { kind: 'AWAITING_CONTINUATION', runId, token, bytes, envelope, options };
      post({ type: 'warning', runId, token, envelope });
      return;
    }
    await run(runId, bytes, envelope, options);
  }

  function refuse(runId: string, envelope: EnvelopeEvidence): void {
    finish({ type: 'refused', runId, reason: 'UNSUPPORTED_FOR_BROWSER_VALIDATION', scope: 'SUPPORT', envelope });
  }

  /** A stage-1/2 stop: the canonical validator produces the exact stopped result without touching any resource. */
  async function finishCanonicalStop(runId: string, bytes: Uint8Array, options: BeginOptions): Promise<void> {
    const result = await deps.createValidator(controls(runId, options)).validate(bytes);
    finish({ type: 'result', runId, result: toWorkerResult(result), envelope: null });
  }

  function controls(runId: string, options: BeginOptions): ValidatorControls {
    let lastCounted = -Infinity;
    return {
      accelerate: options.accelerate !== false,
      onStage: (name) => {
        lastStage = name;
        if (options.progress !== false) post({ type: 'progress', runId, stage: name });
      },
      onProgress: ({ stage: name, done, total }) => {
        lastStage = name;
        if (options.progress === false) return;
        const t = now();
        if (done !== total && t - lastCounted < progressIntervalMs) return;
        lastCounted = t;
        post({ type: 'progress', runId, stage: name, done, total });
      },
      shouldCancel: () => cancelRequested,
      yield: yieldToEventLoop,
    };
  }

  async function run(
    runId: string,
    bytes: Uint8Array,
    envelope: EnvelopeEvidence,
    options: BeginOptions,
  ): Promise<void> {
    state = { kind: 'RUNNING', runId };
    const validator = deps.createValidator(controls(runId, options));
    let result;
    try {
      result = await validator.validate(bytes);
    } catch (failure) {
      if (cancelRequested) return finish({ type: 'cancelled', runId, stage: lastStage });
      throw failure;
    }
    if (cancelRequested) {
      // Cancelled after the last cooperative check: the result is discarded, never delivered.
      return finish({ type: 'cancelled', runId, stage: lastStage });
    }
    lastStage = 'SERIALIZING';
    if (options.progress !== false) post({ type: 'progress', runId, stage: 'SERIALIZING' });
    finish({ type: 'result', runId, result: toWorkerResult(result), envelope });
  }

  return {
    get state() {
      return state.kind;
    },
    async handle(message) {
      if (!message || typeof message !== 'object' || typeof (message as { type?: unknown }).type !== 'string') {
        return error(null, 'MALFORMED_MESSAGE', 'not a protocol message');
      }
      switch (message.type) {
        case 'begin': {
          if (typeof message.runId !== 'string' || !(message.bytes instanceof Uint8Array)) {
            return error(
              typeof message.runId === 'string' ? message.runId : null,
              'MALFORMED_MESSAGE',
              'begin needs runId and bytes',
            );
          }
          if (state.kind === 'ENDED') {
            return error(
              message.runId,
              'SESSION_ENDED',
              "this Worker's session has ended; a new session needs a new Worker",
            );
          }
          if (state.kind === 'RUNNING') return error(message.runId, 'BUSY', `run ${state.runId} is in progress`);
          if (state.kind === 'AWAITING_CONTINUATION') {
            return error(message.runId, 'BUSY', `run ${state.runId} awaits its continuation`);
          }
          const { runId, bytes, options } = message;
          return guarded(runId, () => begin(runId, bytes, options ?? {}));
        }
        case 'continue': {
          if (state.kind === 'IDLE' || state.kind === 'ENDED') {
            return error(message.runId, 'NO_SESSION', 'no source is awaiting continuation');
          }
          if (state.kind === 'RUNNING') return error(message.runId, 'BUSY', `run ${state.runId} is in progress`);
          if (state.runId !== message.runId || state.token !== message.token) {
            return error(message.runId, 'STALE_SESSION', 'continuation token does not match the retained source');
          }
          const { runId, bytes, envelope, options } = state;
          cancelRequested = false;
          return guarded(runId, () => run(runId, bytes, envelope, options));
        }
        case 'cancel': {
          if (state.kind === 'AWAITING_CONTINUATION' && state.runId === message.runId) {
            return finish({ type: 'cancelled', runId: message.runId, stage: 'ENVELOPE' });
          }
          if (state.kind === 'RUNNING' && state.runId === message.runId) {
            cancelRequested = true;
            return;
          }
          post({ type: 'cancelled', runId: message.runId, stage: null });
          return;
        }
        default:
          return error(
            null,
            'MALFORMED_MESSAGE',
            `unknown message type ${String((message as { type: unknown }).type)}`,
          );
      }
    },
  };
}
