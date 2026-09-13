'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';

import {
  createOnixValidationClient,
  type OnixValidationClient,
  type ValidationOutcome,
  type WorkerPort,
} from '@/src/shared/parsers/XMLParser/validation/worker/client';
import type {
  EnvelopeEvidence,
  OnixWorkerResult,
  ValidationStageName,
  WorkerErrorCode,
} from '@/src/shared/parsers/XMLParser/validation/worker/protocol';

/**
 * The dedicated Worker of one ONIX validation session. It is spelled as a literal
 * `new Worker(new URL(…, import.meta.url))` so that the production bundler discovers the #196 Worker
 * entry statically and emits it with the application.
 */
export const createOnixValidationWorker = (): WorkerPort =>
  new Worker(new URL('../../../shared/parsers/XMLParser/validation/worker/onix.worker.ts', import.meta.url), {
    type: 'module',
  });

/** How one validation session ended: exactly once per session, and never once it has been disposed. */
export type OnixValidationSettlement =
  | { readonly kind: 'result'; readonly result: OnixWorkerResult; readonly envelope: EnvelopeEvidence | null }
  | { readonly kind: 'refused'; readonly envelope: EnvelopeEvidence }
  | {
      readonly kind: 'error';
      readonly code: WorkerErrorCode | 'WORKER_FAILED' | 'TERMINATED' | 'FILE_UNREADABLE';
      readonly message: string;
    }
  | { readonly kind: 'cancelled' };

/** What the session is doing now, for the uploader to show. */
export type OnixValidationView =
  | { readonly phase: 'starting' }
  | {
      readonly phase: 'validating';
      readonly stage: ValidationStageName | null;
      /** Work-unit counts, exactly as the Worker reported them for the stage, if it did. */
      readonly done?: number;
      readonly total?: number;
    }
  | { readonly phase: 'awaiting-decision'; readonly envelope: EnvelopeEvidence }
  | { readonly phase: 'settled' };

type WarningOutcome = Extract<ValidationOutcome, { kind: 'warning' }>;

interface SessionControls {
  proceed(): void;
  cancel(): void;
}

const STARTING: OnixValidationView = { phase: 'starting' };
const SETTLED: OnixValidationView = { phase: 'settled' };

const messageOf = (error: unknown) => (error instanceof Error && error.message ? error.message : String(error));

/**
 * One #196 validation session per selected ONIX file (thoth-app#197): a fresh client and dedicated
 * Worker, readiness first, then the file's raw bytes, sent once. A NORMAL envelope validates at once;
 * a WARNING waits for `proceed()`, which continues that same session over the bytes its Worker kept;
 * a refusal, an error or a cancellation ends it. Browser and device support is decided in the Worker
 * session, never here, and never as a finding about the source.
 *
 * The session settles exactly once, through `onSettled`, which is told which file settled: a settlement
 * belongs to the file its session was started for, never to whichever file is selected by the time the
 * uploader hears about it. Its Worker is terminated when it settles, when it is cancelled, when the file
 * changes and on unmount, and nothing a disposed session sends afterwards reaches the uploader.
 */
export function useOnixValidation(file: File, onSettled: (settlement: OnixValidationSettlement, file: File) => void) {
  const [state, setState] = useState<{ readonly file: File; readonly view: OnixValidationView }>(() => ({
    file,
    view: STARTING,
  }));
  const controls = useRef<SessionControls | null>(null);
  const settle = useEffectEvent(onSettled);

  useEffect(() => {
    let active = true;
    let client: OnixValidationClient | null = null;
    let warning: WarningOutcome | null = null;

    const show = (view: OnixValidationView) => {
      if (active) setState({ file, view });
    };

    /** Ends the session once: its Worker is terminated, and nothing it sends later is heard. */
    const finish = (settlement: OnixValidationSettlement) => {
      if (!active) return;
      show(SETTLED);
      active = false;
      warning = null;
      client?.terminate();
      settle(settlement, file);
    };

    const accept = (outcome: ValidationOutcome) => {
      if (!active) return;
      switch (outcome.kind) {
        case 'warning':
          warning = outcome;
          show({ phase: 'awaiting-decision', envelope: outcome.envelope });
          return;
        case 'result':
          return finish({ kind: 'result', result: outcome.result, envelope: outcome.envelope });
        case 'refused':
          return finish({ kind: 'refused', envelope: outcome.envelope });
        case 'cancelled':
          return finish({ kind: 'cancelled' });
        case 'error':
          return finish({ kind: 'error', code: outcome.code, message: outcome.message });
      }
    };

    controls.current = {
      proceed() {
        // The warning's own continuation runs once, over the bytes its Worker retained; never a second time.
        const pending = warning;
        if (!active || !pending) return;
        warning = null;
        show({ phase: 'validating', stage: null });
        void pending.proceed().then(accept);
      },
      cancel() {
        finish({ kind: 'cancelled' });
      },
    };

    const run = async () => {
      try {
        client = createOnixValidationClient({ createWorker: createOnixValidationWorker });
      } catch (error) {
        return finish({ kind: 'error', code: 'WORKER_FAILED', message: messageOf(error) });
      }
      const session = client;
      session.onProgress(({ stage, done, total }) => show({ phase: 'validating', stage, done, total }));
      try {
        await session.ready;
      } catch (error) {
        return finish({ kind: 'error', code: 'WORKER_FAILED', message: messageOf(error) });
      }
      if (!active) return;
      let bytes: Uint8Array;
      try {
        bytes = new Uint8Array(await file.arrayBuffer());
      } catch (error) {
        return finish({ kind: 'error', code: 'FILE_UNREADABLE', message: messageOf(error) });
      }
      if (!active) return;
      show({ phase: 'validating', stage: null });
      accept(await session.begin(bytes, { progress: true }));
    };
    void run();

    return () => {
      active = false;
      warning = null;
      client?.terminate();
    };
  }, [file]);

  return {
    view: state.file === file ? state.view : STARTING,
    proceed: () => controls.current?.proceed(),
    cancel: () => controls.current?.cancel(),
  };
}
