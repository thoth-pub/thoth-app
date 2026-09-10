// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { createOnixSourceValidator } from '../validator';
import { createOnixValidationClient, type WorkerPort } from './client';
import { ONIX_WORKER_PROTOCOL_VERSION, type WorkerToClientMessage } from './protocol';
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
  const received: unknown[] = [];
  let terminated = false;
  const deliver = (message: WorkerToClientMessage) => {
    if (terminated) return;
    setTimeout(() => listeners.forEach((l) => l({ data: message })), 0);
  };
  const session = createWorkerSession({
    post: deliver,
    userAgent,
    createValidator: () => createOnixSourceValidator({ loadResource: loader }),
    yieldToEventLoop: () => new Promise((r) => setTimeout(r, 0)),
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
  return { port, loader, received, session, isTerminated: () => terminated };
}

describe('createOnixValidationClient (loopback to a real session)', () => {
  it('boots, validates a normal source and reports progress on the main side', async () => {
    const lb = loopback();
    const client = createOnixValidationClient({ createWorker: () => lb.port });
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
    const resumed = await outcome.proceed();
    expect(resumed.kind).toBe('result');
    expect(resumed.kind === 'result' && resumed.result.status).toBe('COMPLETED');
    expect(lb.loader).toHaveBeenCalled();
    expect(lb.received.map((m) => (m as { type: string }).type)).toEqual(['begin', 'continue']);
  });

  it('returns a refusal without running validation', async () => {
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
  });

  it('refuses a second begin while a run is pending and cancels a pending warning', async () => {
    const lb = loopback();
    const client = createOnixValidationClient({ createWorker: () => lb.port });
    const first = client.begin(encode(message(501)));
    expect(await client.begin(encode(message(1)))).toMatchObject({ kind: 'error', code: 'BUSY' });
    const warning = await first;
    expect(warning.kind).toBe('warning');
    client.cancel();
    await new Promise((r) => setTimeout(r, 10));
    expect(lb.session.state).toBe('IDLE');
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
