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
   * Creates the canonical #190 validator for one run. It must load and
   * compile the standards resources lazily, only when a validation proceeds
   * past the envelope; the session never triggers that for stopped, refused
   * or unconfirmed-warning sources.
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
    };

const defaultToken = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const defaultYield = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * The Worker-side state machine (thoth-app#196): one session per Worker,
 * receiving the raw bytes once.
 *
 * begin: decode -> #190 stage-1/2 source gate -> (stop: canonical stopped
 * result) -> engine -> byte ceiling -> namespace-aware Product sizing ->
 * envelope -> NORMAL: validate; WARNING: retain the exact bytes, hand out a
 * continuation token; REFUSE / unsupported engine: deterministic SUPPORT
 * refusal. continue: validates the retained bytes of that token only; a
 * stale or unknown token fails closed. cancel: cooperative between bounded
 * units, discarding every partial finding.
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

  // One validator per acceleration mode for the life of the Worker, so compiled engines survive across runs
  // (a warning continuation, a run after a cancel); its controls forward to the active run only.
  let active: ValidatorControls | null = null;
  const validators = new Map<boolean, OnixSourceValidator>();
  const validatorFor = (accelerate: boolean): OnixSourceValidator => {
    let validator = validators.get(accelerate);
    if (!validator) {
      validator = deps.createValidator({
        accelerate,
        onStage: (name) => active?.onStage(name),
        onProgress: (progress) => active?.onProgress(progress),
        shouldCancel: () => active?.shouldCancel() ?? false,
        yield: () => active?.yield() ?? Promise.resolve(),
      });
      validators.set(accelerate, validator);
    }
    return validator;
  };

  const post = deps.post;
  const error = (
    runId: string | null,
    code: 'BUSY' | 'NO_SESSION' | 'STALE_SESSION' | 'MALFORMED_MESSAGE' | 'INTERNAL',
    message: string,
  ) => post({ type: 'error', runId, code, message });

  async function begin(runId: string, bytes: Uint8Array, options: BeginOptions): Promise<void> {
    state = { kind: 'RUNNING', runId };
    cancelRequested = false;
    lastStage = null;
    const stage = (name: ValidationStageName) => {
      lastStage = name;
      if (options.progress !== false) post({ type: 'progress', runId, stage: name });
    };
    try {
      stage('DECODING');
      const decoded = decode(bytes);
      if (decoded.kind !== 'TEXT') return await finishCanonicalStop(runId, bytes, options);
      stage('SOURCE_GATE');
      const gated = gate(decoded.text);
      if (gated.kind === 'STOP') return await finishCanonicalStop(runId, bytes, options);

      const byteLength = bytes.byteLength;
      stage('ENVELOPE');
      if (engine !== 'chromium' && engine !== 'gecko') {
        return refuse(runId, evaluateEnvelope(engine, byteLength, { measured: false, reason: 'ENGINE_UNSUPPORTED' }));
      }
      if (exceedsByteCeiling(engine, byteLength)) {
        return refuse(
          runId,
          evaluateEnvelope(engine, byteLength, { measured: false, reason: 'BYTE_CEILING_EXCEEDED' }),
        );
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
    } catch (failure) {
      state = { kind: 'IDLE' };
      error(runId, 'INTERNAL', String(failure).slice(0, 300));
    }
  }

  function refuse(runId: string, envelope: EnvelopeEvidence): void {
    state = { kind: 'IDLE' };
    post({ type: 'refused', runId, reason: 'UNSUPPORTED_FOR_BROWSER_VALIDATION', scope: 'SUPPORT', envelope });
  }

  /** A stage-1/2 stop: the canonical validator produces the exact stopped result without touching any resource. */
  async function finishCanonicalStop(runId: string, bytes: Uint8Array, options: BeginOptions): Promise<void> {
    active = controls(runId, options);
    try {
      const result = await validatorFor(active.accelerate).validate(bytes);
      post({ type: 'result', runId, result: toWorkerResult(result), envelope: null });
    } finally {
      active = null;
      state = { kind: 'IDLE' };
    }
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
    active = controls(runId, options);
    let result;
    try {
      result = await validatorFor(active.accelerate).validate(bytes);
    } catch (failure) {
      active = null;
      state = { kind: 'IDLE' };
      if (cancelRequested) {
        post({ type: 'cancelled', runId, stage: lastStage });
        return;
      }
      throw failure;
    }
    active = null;
    if (cancelRequested) {
      // Cancelled after the last cooperative check: the result is discarded, never delivered.
      state = { kind: 'IDLE' };
      post({ type: 'cancelled', runId, stage: lastStage });
      return;
    }
    lastStage = 'SERIALIZING';
    if (options.progress !== false) post({ type: 'progress', runId, stage: 'SERIALIZING' });
    const dto = toWorkerResult(result);
    state = { kind: 'IDLE' };
    post({ type: 'result', runId, result: dto, envelope });
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
          if (state.kind === 'RUNNING') return error(message.runId, 'BUSY', `run ${state.runId} is in progress`);
          return begin(message.runId, message.bytes, message.options ?? {});
        }
        case 'continue': {
          if (state.kind === 'IDLE') return error(message.runId, 'NO_SESSION', 'no source is awaiting continuation');
          if (state.kind === 'RUNNING') return error(message.runId, 'BUSY', `run ${state.runId} is in progress`);
          if (state.runId !== message.runId || state.token !== message.token) {
            return error(message.runId, 'STALE_SESSION', 'continuation token does not match the retained source');
          }
          const { bytes, envelope, options } = state;
          cancelRequested = false;
          return run(message.runId, bytes, envelope, options);
        }
        case 'cancel': {
          if (state.kind === 'AWAITING_CONTINUATION' && state.runId === message.runId) {
            state = { kind: 'IDLE' };
            post({ type: 'cancelled', runId: message.runId, stage: 'ENVELOPE' });
            return;
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
