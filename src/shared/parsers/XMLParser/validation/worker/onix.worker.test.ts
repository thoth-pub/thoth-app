// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { ONIX_VALIDATION_RESOURCE_PATH, ONIX_VALIDATION_RESOURCES, type OnixResourceLoader } from '../resources';
import type { ClientToWorkerMessage, WorkerToClientMessage } from './protocol';

vi.setConfig({ testTimeout: 120_000 });

const PUBLIC_DIR = join(process.cwd(), 'public', 'onix-validation');
const CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36';
/** `WorkerGlobalScope.origin` of a Worker started by a page on this origin. */
const WORKER_ORIGIN = 'http://127.0.0.1:4317';
/** The production (Turbopack) build starts the Worker from a `blob:` bootstrap: its script URL is no base for a path. */
const WORKER_SCRIPT_URL = `blob:${WORKER_ORIGIN}/4f7d2c1a-9b3e-4d58-8a61-0c2e5f9b7d34`;
const PINNED = new Set(ONIX_VALIDATION_RESOURCES.map((resource) => resource.fileName));
const encode = (text: string) => new TextEncoder().encode(text);
const message = (release: string) =>
  `<ONIXMessage release="${release}" xmlns="http://ns.editeur.org/onix/${release}/reference">` +
  '<Header><Sender><SenderName>T</SenderName></Sender><SentDateTime>20260909T1200</SentDateTime></Header>' +
  '<Product><RecordReference>r0</RecordReference><NotificationType>03</NotificationType>' +
  '<ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9780000000002</IDValue></ProductIdentifier></Product>' +
  '</ONIXMessage>';
const TERMINAL = new Set(['result', 'refused', 'cancelled', 'error']);

/**
 * Evaluates the real Worker entry against a fake dedicated-worker scope (with the given Worker-global `origin`) whose
 * fetch serves the pinned resources.
 */
async function bootEntry(workerGlobal: { readonly origin?: string } = { origin: WORKER_ORIGIN }) {
  const events: string[] = [];
  const posted: WorkerToClientMessage[] = [];
  const fetched: string[] = [];
  let deliver: ((event: { data: ClientToWorkerMessage }) => void) | null = null;
  let onTerminal: (message: WorkerToClientMessage) => void = () => undefined;
  const scope = {
    ...workerGlobal,
    navigator: { userAgent: CHROME },
    postMessage(message: WorkerToClientMessage) {
      posted.push(message);
      events.push(`post:${message.type}`);
      if (TERMINAL.has(message.type)) onTerminal(message);
    },
    addEventListener(type: string, listener: (event: { data: ClientToWorkerMessage }) => void) {
      if (type === 'message') deliver = listener;
    },
    close: vi.fn(() => void events.push('close')),
  };
  vi.stubGlobal('self', scope);
  vi.stubGlobal('fetch', async (input: string | URL) => {
    fetched.push(String(input));
    // Parsed as the browser parses it inside that `blob:` Worker: a root-relative path has no base there and fails.
    const url = new URL(input, WORKER_SCRIPT_URL);
    return new Response(readFileSync(join(PUBLIC_DIR, url.pathname.slice(ONIX_VALIDATION_RESOURCE_PATH.length))));
  });
  vi.resetModules();
  await import('./onix.worker');
  /** Delivers one message and resolves with the next terminal message the Worker posts. */
  const send = (data: ClientToWorkerMessage) =>
    new Promise<WorkerToClientMessage>((resolve) => {
      onTerminal = resolve;
      deliver!({ data });
    });
  return { scope, events, posted, fetched, send };
}

/** Every request is an absolute URL on the Worker's own origin, naming a pinned resource beneath the pinned prefix. */
function expectPinnedSameOriginRequests(fetched: readonly string[]) {
  expect(fetched.length).toBeGreaterThan(0);
  for (const requested of fetched) {
    expect(URL.canParse(requested), `${requested} is not an absolute URL`).toBe(true);
    const url = new URL(requested);
    expect(url.origin).toBe(WORKER_ORIGIN);
    expect(url.pathname.startsWith(ONIX_VALIDATION_RESOURCE_PATH), url.pathname).toBe(true);
    expect(PINNED.has(url.pathname.slice(ONIX_VALIDATION_RESOURCE_PATH.length)), url.pathname).toBe(true);
  }
}

afterEach(() => {
  vi.doUnmock('../validator');
  vi.unstubAllGlobals();
});

describe('onix.worker entry: one session, then the Worker ends itself', () => {
  it('posts ready, serves one validation, closes after the terminal message and fetches only pinned resources', async () => {
    const entry = await bootEntry();
    expect(entry.posted[0]).toMatchObject({ type: 'ready', engine: 'chromium', userAgent: CHROME });
    const result = await entry.send({ type: 'begin', runId: 'r1', bytes: encode(message('3.0')) });
    // Addressed on the Worker's own origin, never resolved against its script URL.
    expectPinnedSameOriginRequests(entry.fetched);
    expect(result).toMatchObject({ type: 'result', runId: 'r1', result: { status: 'COMPLETED' } });
    expect(entry.scope.close).toHaveBeenCalledTimes(1);
    expect(entry.events.slice(-2)).toEqual(['post:result', 'close']);
    // Were the closed scope ever to hear another begin, its ended session would refuse it.
    const again = await entry.send({ type: 'begin', runId: 'r2', bytes: encode(message('3.0')) });
    expect(again).toMatchObject({ type: 'error', runId: 'r2', code: 'SESSION_ENDED' });
    expect(entry.scope.close).toHaveBeenCalledTimes(1);
  });

  it('a stage-2 stop ends the Worker as well, without any fetch', async () => {
    const entry = await bootEntry();
    const result = await entry.send({
      type: 'begin',
      runId: 'r1',
      bytes: encode('<!DOCTYPE ONIXMessage>' + message('3.1')),
    });
    expect(result).toMatchObject({ type: 'result', runId: 'r1', result: { status: 'STOPPED' } });
    expect(entry.fetched).toEqual([]);
    expect(entry.scope.close).toHaveBeenCalledTimes(1);
    expect(entry.events.slice(-2)).toEqual(['post:result', 'close']);
  });

  it.each([{ origin: 'null' }, { origin: 'file://' }, {}])(
    'a Worker without a usable http(s) origin ($origin) fails closed before any resource request',
    async (workerGlobal) => {
      const entry = await bootEntry(workerGlobal);
      const result = await entry.send({ type: 'begin', runId: 'r1', bytes: encode(message('3.0')) });
      expect(entry.fetched).toEqual([]);
      expect(result).toMatchObject({ type: 'error', runId: 'r1', code: 'INTERNAL' });
      expect(result).toMatchObject({ message: expect.stringContaining('origin') });
      expect(entry.scope.close).toHaveBeenCalledTimes(1);
      expect(entry.events.slice(-2)).toEqual(['post:error', 'close']);
    },
  );

  it('a resource name resolving outside the pinned prefix fails closed before any request', async () => {
    vi.doMock('../validator', async (importOriginal) => ({
      ...(await importOriginal<Record<string, unknown>>()),
      createOnixSourceValidator: ({ loadResource }: { readonly loadResource: OnixResourceLoader }) => ({
        validate: async () => {
          await loadResource('../api/auth/session');
          throw new Error('the loader must refuse this name');
        },
      }),
    }));
    const entry = await bootEntry();
    const result = await entry.send({ type: 'begin', runId: 'r1', bytes: encode(message('3.0')) });
    expect(entry.fetched).toEqual([]);
    expect(result).toMatchObject({ type: 'error', runId: 'r1', code: 'INTERNAL' });
    expect(result).toMatchObject({ message: expect.stringContaining(ONIX_VALIDATION_RESOURCE_PATH) });
  });
});
