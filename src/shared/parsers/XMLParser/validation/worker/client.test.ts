// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { createOnixSourceValidator, type OnixSourceValidator } from '../validator';
import { createOnixValidationClient, type WorkerPort } from './client';
import {
  type ClientToWorkerMessage,
  type EnvelopeEvidence,
  ONIX_WORKER_PROTOCOL_VERSION,
  type OnixWorkerResult,
  type WorkerToClientMessage,
} from './protocol';
import { createWorkerSession } from './session';

vi.setConfig({ testTimeout: 120_000 });

const PUBLIC_DIR = join(process.cwd(), 'public', 'onix-validation');
const encode = (text: string) => new TextEncoder().encode(text);
const FIREFOX = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:155.0) Gecko/20100101 Firefox/155.0';
const product = (r: string) =>
  `<Product><RecordReference>${r}</RecordReference><NotificationType>03</NotificationType>` +
  '<ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9780000000002</IDValue></ProductIdentifier></Product>';
const message = (products: number) =>
  '<ONIXMessage release="3.0" xmlns="http://ns.editeur.org/onix/3.0/reference"><Header><Sender><SenderName>T</SenderName></Sender><SentDateTime>20260909T1200</SentDateTime></Header>' +
  Array.from({ length: products }, (_, i) => product(`r${i}`)).join('') +
  '</ONIXMessage>';

/** In-process loopback: the client talks to a real session through a fake Worker port with asynchronous delivery. */
function loopback(userAgent = FIREFOX) {
  const loader = vi.fn(async (fileName: string) => new Uint8Array(readFileSync(join(PUBLIC_DIR, fileName))));
  const listeners: ((event: { data: WorkerToClientMessage }) => void)[] = [];
  const received: ClientToWorkerMessage[] = [];
  const validators: OnixSourceValidator[] = [];
  let terminated = false;
  let ended = 0;
  const deliver = (message: WorkerToClientMessage) => {
    if (terminated) return;
    setTimeout(() => listeners.forEach((l) => l({ data: message })), 0);
  };
  const session = createWorkerSession({
    post: deliver,
    userAgent,
    createValidator: () => {
      const validator = createOnixSourceValidator({ loadResource: loader });
      validators.push(validator);
      return validator;
    },
    yieldToEventLoop: () => new Promise((r) => setTimeout(r, 0)),
    onEnded: () => void ended++,
  });
  const port: WorkerPort = {
    postMessage(message) {
      received.push(message);
      if (!terminated) void session.handle(message);
    },
    addEventListener(type, listener) {
      if (type === 'message') listeners.push(listener as (event: { data: WorkerToClientMessage }) => void);
    },
    terminate() {
      terminated = true;
    },
  };
  deliver({ type: 'ready', protocolVersion: ONIX_WORKER_PROTOCOL_VERSION, engine: 'gecko', userAgent });
  return {
    port,
    loader,
    received,
    session,
    validators,
    ended: () => ended,
    isTerminated: () => terminated,
    types: () => received.map((m) => m.type),
  };
}

describe('createOnixValidationClient: one session per client (loopback to a real session)', () => {
  it('boots, validates a normal source, reports progress and disposes its Worker at the terminal outcome', async () => {
    const lb = loopback();
    const createWorker = vi.fn(() => lb.port);
    const client = createOnixValidationClient({ createWorker });
    expect(await client.ready).toEqual({ engine: 'gecko', userAgent: FIREFOX, protocolVersion: 1 });
    const stages: string[] = [];
    client.onProgress((e) => stages.push(e.stage));
    const outcome = await client.begin(encode(message(2)));
    expect(outcome.kind).toBe('result');
    if (outcome.kind !== 'result') return;
    expect(outcome.result.status).toBe('COMPLETED');
    expect(outcome.envelope?.verdict).toBe('NORMAL');
    expect(stages[0]).toBe('DECODING');
    expect(stages).toContain('SERIALIZING');
    const begin = lb.received[0] as { type: string; bytes: Uint8Array };
    expect(begin.type).toBe('begin');
    expect(begin.bytes).toBeInstanceOf(Uint8Array);
    // The session is over: its Worker is terminated and the client serves no second session.
    expect(lb.isTerminated()).toBe(true);
    expect(client.terminated).toBe(true);
    expect(lb.session.state).toBe('ENDED');
    expect(lb.ended()).toBe(1);
    expect(await client.begin(encode(message(1)))).toMatchObject({ kind: 'error', code: 'SESSION_ENDED' });
    expect(lb.types()).toEqual(['begin']);
    expect(createWorker).toHaveBeenCalledTimes(1);
    expect(lb.validators).toHaveLength(1);
  });

  it('pauses on a warning before any resource and resumes the same session through proceed()', async () => {
    const lb = loopback();
    const client = createOnixValidationClient({ createWorker: () => lb.port });
    const outcome = await client.begin(encode(message(501)));
    expect(outcome.kind).toBe('warning');
    if (outcome.kind !== 'warning') return;
    expect(outcome.envelope).toMatchObject({ verdict: 'WARNING', exceeded: ['products'] });
    expect(lb.loader).not.toHaveBeenCalled();
    expect(lb.session.state).toBe('AWAITING_CONTINUATION');
    expect(lb.isTerminated()).toBe(false);
    const resumed = await outcome.proceed();
    expect(resumed.kind).toBe('result');
    expect(resumed.kind === 'result' && resumed.result.status).toBe('COMPLETED');
    expect(lb.loader).toHaveBeenCalled();
    expect(lb.types()).toEqual(['begin', 'continue']);
    expect(lb.validators).toHaveLength(1);
    expect(lb.isTerminated()).toBe(true);
  });

  it('returns a refusal without running validation and ends the session', async () => {
    const lb = loopback(
      'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
    );
    const client = createOnixValidationClient({ createWorker: () => lb.port });
    const outcome = await client.begin(encode(message(1)));
    expect(outcome).toMatchObject({
      kind: 'refused',
      reason: 'UNSUPPORTED_FOR_BROWSER_VALIDATION',
      envelope: { engine: 'webkit' },
    });
    expect(lb.loader).not.toHaveBeenCalled();
    expect(lb.validators).toHaveLength(0);
    expect(lb.isTerminated()).toBe(true);
  });

  it('refuses a second begin while the session is in use; cancelling the waiting warning ends it without a continuation', async () => {
    const lb = loopback();
    const client = createOnixValidationClient({ createWorker: () => lb.port });
    const first = client.begin(encode(message(501)));
    expect(await client.begin(encode(message(1)))).toMatchObject({ kind: 'error', code: 'BUSY' });
    const warning = await first;
    expect(warning.kind).toBe('warning');
    if (warning.kind !== 'warning') return;
    expect(await client.begin(encode(message(1)))).toMatchObject({ kind: 'error', code: 'BUSY' });
    client.cancel();
    expect(client.terminated).toBe(true);
    expect(lb.isTerminated()).toBe(true);
    expect(await warning.proceed()).toMatchObject({ kind: 'error', code: 'SESSION_ENDED' });
    expect(lb.types()).toEqual(['begin']);
    expect(lb.loader).not.toHaveBeenCalled();
  });

  it('terminate() settles the pending run as an error and makes the client unusable; a new client starts fresh', async () => {
    const lb = loopback();
    const client = createOnixValidationClient({ createWorker: () => lb.port });
    await client.ready;
    const pending = client.begin(encode(message(1)));
    client.terminate();
    expect(await pending).toEqual({ kind: 'error', code: 'TERMINATED', message: 'the Worker was terminated' });
    expect(client.terminated).toBe(true);
    expect(lb.isTerminated()).toBe(true);
    expect(await client.begin(encode(message(1)))).toMatchObject({ kind: 'error', code: 'TERMINATED' });
    const fresh = loopback();
    const client2 = createOnixValidationClient({ createWorker: () => fresh.port });
    expect((await client2.begin(encode(message(1)))).kind).toBe('result');
    expect(fresh.validators).toHaveLength(1);
    expect(fresh.validators[0]).not.toBe(lb.validators[0]);
  });

  it('two sessions use two Workers and two validators: nothing compiled is carried across', async () => {
    const a = loopback();
    const b = loopback();
    const createWorker = vi.fn<() => WorkerPort>().mockReturnValueOnce(a.port).mockReturnValueOnce(b.port);
    const first = createOnixValidationClient({ createWorker });
    expect((await first.begin(encode(message(1)))).kind).toBe('result');
    const second = createOnixValidationClient({ createWorker });
    expect((await second.begin(encode(message(1)))).kind).toBe('result');
    expect(createWorker).toHaveBeenCalledTimes(2);
    expect(a.isTerminated()).toBe(true);
    expect(b.isTerminated()).toBe(true);
    expect(a.validators).toHaveLength(1);
    expect(b.validators).toHaveLength(1);
    expect(b.validators[0]).not.toBe(a.validators[0]);
    // Each session fetched and compiled its own resources.
    expect(a.loader.mock.calls.length).toBeGreaterThan(0);
    expect(b.loader.mock.calls.map(([name]) => name)).toEqual(a.loader.mock.calls.map(([name]) => name));
  });

  it('copies a view that does not own its buffer before transferring', async () => {
    const lb = loopback();
    const client = createOnixValidationClient({ createWorker: () => lb.port });
    const whole = encode(`xx${message(1)}`);
    const view = whole.subarray(2);
    const outcome = await client.begin(view);
    expect(outcome.kind).toBe('result');
    expect(whole.byteLength).toBeGreaterThan(0);
    const begin = lb.received[0] as { bytes: Uint8Array };
    expect(begin.bytes.byteOffset).toBe(0);
    expect(begin.bytes.byteLength).toBe(view.byteLength);
  });
});

/** A Worker port whose replies the test delivers explicitly and synchronously: no timers, no race left to chance. */
function scripted() {
  const posted: ClientToWorkerMessage[] = [];
  const onMessage: ((event: { data: WorkerToClientMessage }) => void)[] = [];
  const onError: ((event: { message?: string }) => void)[] = [];
  let terminations = 0;
  const port: WorkerPort = {
    postMessage(message) {
      posted.push(message);
    },
    addEventListener(type, listener) {
      if (type === 'message') onMessage.push(listener as (event: { data: WorkerToClientMessage }) => void);
      else onError.push(listener as (event: { message?: string }) => void);
    },
    terminate() {
      terminations++;
    },
  };
  return {
    port,
    posted,
    types: () => posted.map((m) => m.type),
    emit: (data: WorkerToClientMessage) => onMessage.forEach((l) => l({ data })),
    crash: (message: string) => onError.forEach((l) => l({ message })),
    terminations: () => terminations,
  };
}

const READY: WorkerToClientMessage = {
  type: 'ready',
  protocolVersion: ONIX_WORKER_PROTOCOL_VERSION,
  engine: 'gecko',
  userAgent: FIREFOX,
};
const ENVELOPE: EnvelopeEvidence = {
  engine: 'gecko',
  bytes: 1,
  products: { measured: true, count: 501 },
  verdict: 'WARNING',
  limits: null,
  exceeded: ['products'],
};
const RESULT: OnixWorkerResult = {
  status: 'COMPLETED',
  stop: null,
  source: null,
  findings: [],
  summary: { total: 0, blocking: 0, secondary: 0, notEvaluable: 0, recovered: 0 },
  sourceValid: true,
  normalized: null,
};

/** Whether a promise has settled once the microtask queue has drained - observed without any timer. */
async function settlement(promise: Promise<unknown>): Promise<'pending' | 'fulfilled' | 'rejected'> {
  let state: 'pending' | 'fulfilled' | 'rejected' = 'pending';
  promise.then(
    () => (state = 'fulfilled'),
    () => (state = 'rejected'),
  );
  for (let i = 0; i < 10; i++) await Promise.resolve();
  return state;
}

/** A scripted session brought to its warning. */
async function warned() {
  const w = scripted();
  const client = createOnixValidationClient({ createWorker: () => w.port });
  w.emit(READY);
  const began = client.begin(encode(message(1)));
  const { runId } = w.posted[0] as { runId: string };
  w.emit({ type: 'warning', runId, token: 'token-1', envelope: ENVELOPE });
  const warning = await began;
  if (warning.kind !== 'warning') throw new Error(`expected a warning, got ${warning.kind}`);
  return { w, client, runId, warning };
}

describe('createOnixValidationClient: continuation and lifecycle races (scripted Worker)', () => {
  it('two immediate proceed() calls send one continuation: the second settles BUSY at once, the genuine result settles the first', async () => {
    const { w, client, runId, warning } = await warned();
    const first = warning.proceed();
    const second = warning.proceed();
    expect(w.types()).toEqual(['begin', 'continue']);
    expect(await settlement(second)).toBe('fulfilled');
    expect(await second).toEqual({
      kind: 'error',
      code: 'BUSY',
      message: 'the continuation of this session is already in flight',
    });
    expect(await settlement(first)).toBe('pending');
    // The Worker's genuine continuation result arrives after the blocked second call.
    const stages: string[] = [];
    client.onProgress((e) => stages.push(e.stage));
    w.emit({ type: 'progress', runId, stage: 'STRICT', done: 1, total: 2 });
    w.emit({ type: 'result', runId, result: RESULT, envelope: ENVELOPE });
    expect(await settlement(first)).toBe('fulfilled');
    expect(await first).toEqual({ kind: 'result', result: RESULT, envelope: ENVELOPE });
    expect(stages).toEqual(['STRICT']);
    expect(w.terminations()).toBe(1);
    expect(await warning.proceed()).toMatchObject({ kind: 'error', code: 'SESSION_ENDED' });
    expect(w.types()).toEqual(['begin', 'continue']);
  });

  it('replies that answer nothing in flight, or another run, never settle, end or revive the session', async () => {
    const { w, client, runId, warning } = await warned();
    // While the warning waits for the user nothing is in flight: stray replies for the run are ignored.
    w.emit({ type: 'error', runId, code: 'BUSY', message: 'stray' });
    w.emit({ type: 'result', runId, result: RESULT, envelope: null });
    w.emit({ type: 'cancelled', runId, stage: null });
    expect(client.terminated).toBe(false);
    expect(w.terminations()).toBe(0);
    const continued = warning.proceed();
    expect(w.types()).toEqual(['begin', 'continue']);
    // Replies for another run or for no run cannot settle the continuation in flight.
    w.emit({ type: 'error', runId: 'another-run', code: 'BUSY', message: 'stray' });
    w.emit({ type: 'error', runId: null, code: 'MALFORMED_MESSAGE', message: 'stray' });
    w.emit({ type: 'result', runId: 'another-run', result: RESULT, envelope: null });
    expect(await settlement(continued)).toBe('pending');
    w.emit({ type: 'result', runId, result: RESULT, envelope: ENVELOPE });
    expect(await continued).toEqual({ kind: 'result', result: RESULT, envelope: ENVELOPE });
    // After the terminal outcome late messages change nothing.
    w.emit({ type: 'error', runId, code: 'BUSY', message: 'late' });
    w.emit(READY);
    expect(client.terminated).toBe(true);
    expect(w.terminations()).toBe(1);
  });

  it('terminate() before ready rejects ready at once; it is idempotent and a late ready or reply cannot revive the client', async () => {
    const w = scripted();
    const client = createOnixValidationClient({ createWorker: () => w.port });
    client.terminate();
    expect(await settlement(client.ready)).toBe('rejected');
    await expect(client.ready).rejects.toThrow('the Worker was terminated');
    expect(client.terminated).toBe(true);
    client.terminate();
    expect(w.terminations()).toBe(1);
    w.emit(READY);
    w.emit({ type: 'result', runId: 'run-1', result: RESULT, envelope: null });
    await expect(client.ready).rejects.toThrow('the Worker was terminated');
    expect(await client.begin(encode(message(1)))).toEqual({
      kind: 'error',
      code: 'TERMINATED',
      message: 'the Worker was terminated',
    });
    expect(w.posted).toEqual([]);
  });

  it('terminate() while the continuation is in flight settles it TERMINATED; the late genuine result is ignored', async () => {
    const { w, client, runId, warning } = await warned();
    const continued = warning.proceed();
    client.terminate();
    expect(await continued).toEqual({ kind: 'error', code: 'TERMINATED', message: 'the Worker was terminated' });
    w.emit({ type: 'result', runId, result: RESULT, envelope: ENVELOPE });
    expect(await warning.proceed()).toMatchObject({ kind: 'error', code: 'TERMINATED' });
    expect(w.terminations()).toBe(1);
    await expect(client.ready).resolves.toMatchObject({ engine: 'gecko' });
  });

  it('a Worker failure before ready rejects ready, settles the request in flight and disposes the Worker', async () => {
    const w = scripted();
    const client = createOnixValidationClient({ createWorker: () => w.port });
    const pending = client.begin(encode(message(1)));
    w.crash('script failed to load');
    expect(await pending).toEqual({ kind: 'error', code: 'WORKER_FAILED', message: 'script failed to load' });
    await expect(client.ready).rejects.toThrow('script failed to load');
    expect(w.terminations()).toBe(1);
    expect(client.terminated).toBe(true);
    w.crash('again');
    w.emit(READY);
    expect(await client.begin(encode(message(1)))).toMatchObject({ kind: 'error', code: 'WORKER_FAILED' });
    expect(w.types()).toEqual(['begin']);
    expect(w.terminations()).toBe(1);
  });

  it('a warning that crosses a cancel ends the session cancelled: it can never be proceeded', async () => {
    const w = scripted();
    const client = createOnixValidationClient({ createWorker: () => w.port });
    w.emit(READY);
    const began = client.begin(encode(message(1)));
    const { runId } = w.posted[0] as { runId: string };
    client.cancel();
    client.cancel();
    expect(w.types()).toEqual(['begin', 'cancel']);
    w.emit({ type: 'warning', runId, token: 'token-1', envelope: ENVELOPE });
    expect(await began).toEqual({ kind: 'cancelled', stage: 'ENVELOPE' });
    w.emit({ type: 'cancelled', runId, stage: 'ENVELOPE' });
    expect(w.terminations()).toBe(1);
    expect(client.terminated).toBe(true);
    expect(w.types()).toEqual(['begin', 'cancel']);
  });
});

describe('createOnixValidationClient: one fresh Worker per selected session (scripted Worker)', () => {
  it('constructs exactly one Worker, accepts one begin and disposes the Worker at the terminal outcome', async () => {
    const w = scripted();
    const createWorker = vi.fn(() => w.port);
    const client = createOnixValidationClient({ createWorker });
    expect(createWorker).toHaveBeenCalledTimes(1);
    const began = client.begin(encode(message(1)));
    expect(await client.begin(encode(message(1)))).toMatchObject({ kind: 'error', code: 'BUSY' });
    const { runId } = w.posted[0] as { runId: string };
    w.emit({ type: 'result', runId, result: RESULT, envelope: null });
    expect(await began).toEqual({ kind: 'result', result: RESULT, envelope: null });
    expect(w.terminations()).toBe(1);
    expect(client.terminated).toBe(true);
    expect(await client.begin(encode(message(1)))).toEqual({
      kind: 'error',
      code: 'SESSION_ENDED',
      message: 'this validation session has ended; a new session needs a new client',
    });
    expect(w.types()).toEqual(['begin']);
    expect(createWorker).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      'refused',
      { type: 'refused', reason: 'UNSUPPORTED_FOR_BROWSER_VALIDATION', scope: 'SUPPORT', envelope: ENVELOPE },
      { kind: 'refused', reason: 'UNSUPPORTED_FOR_BROWSER_VALIDATION', envelope: ENVELOPE },
    ],
    [
      'error',
      { type: 'error', code: 'INTERNAL', message: 'boom' },
      { kind: 'error', code: 'INTERNAL', message: 'boom' },
    ],
  ])('a %s outcome ends the session and disposes its Worker', async (_label, reply, outcome) => {
    const w = scripted();
    const client = createOnixValidationClient({ createWorker: () => w.port });
    const began = client.begin(encode(message(1)));
    const { runId } = w.posted[0] as { runId: string };
    w.emit({ ...reply, runId } as WorkerToClientMessage);
    expect(await began).toEqual(outcome);
    expect(w.terminations()).toBe(1);
    expect(await client.begin(encode(message(1)))).toMatchObject({ kind: 'error', code: 'SESSION_ENDED' });
  });

  it('cooperative cancellation reaches the Worker; its cancelled outcome ends the session and disposes the Worker', async () => {
    const w = scripted();
    const client = createOnixValidationClient({ createWorker: () => w.port });
    const began = client.begin(encode(message(1)));
    const { runId } = w.posted[0] as { runId: string };
    client.cancel();
    expect(w.types()).toEqual(['begin', 'cancel']);
    // Cooperative: the Worker chooses the cancellation point; the client does not kill it first.
    expect(w.terminations()).toBe(0);
    expect(await settlement(began)).toBe('pending');
    w.emit({ type: 'cancelled', runId, stage: 'STRICT' });
    expect(await began).toEqual({ kind: 'cancelled', stage: 'STRICT' });
    expect(w.terminations()).toBe(1);
    expect(await client.begin(encode(message(1)))).toMatchObject({ kind: 'error', code: 'SESSION_ENDED' });
    expect(w.types()).toEqual(['begin', 'cancel']);
  });

  it('hard termination then restart: the next session constructs a new Worker and the old one hears nothing more', async () => {
    const old = scripted();
    const next = scripted();
    const createWorker = vi.fn<() => WorkerPort>().mockReturnValueOnce(old.port).mockReturnValueOnce(next.port);
    const first = createOnixValidationClient({ createWorker });
    const pending = first.begin(encode(message(1)));
    first.terminate();
    expect(await pending).toMatchObject({ kind: 'error', code: 'TERMINATED' });
    const second = createOnixValidationClient({ createWorker });
    expect(createWorker).toHaveBeenCalledTimes(2);
    const began = second.begin(encode(message(1)));
    const { runId } = next.posted[0] as { runId: string };
    old.emit({ type: 'result', runId, result: RESULT, envelope: null });
    expect(await settlement(began)).toBe('pending');
    next.emit({ type: 'result', runId, result: RESULT, envelope: null });
    expect(await began).toEqual({ kind: 'result', result: RESULT, envelope: null });
    expect(old.types()).toEqual(['begin']);
    expect(next.types()).toEqual(['begin']);
    expect(old.terminations()).toBe(1);
    expect(next.terminations()).toBe(1);
  });
});
