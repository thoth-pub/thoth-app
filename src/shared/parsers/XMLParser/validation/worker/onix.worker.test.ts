// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { ONIX_VALIDATION_RESOURCE_PATH } from '../resources';
import type { ClientToWorkerMessage, WorkerToClientMessage } from './protocol';

vi.setConfig({ testTimeout: 120_000 });

const PUBLIC_DIR = join(process.cwd(), 'public', 'onix-validation');
const CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36';
const encode = (text: string) => new TextEncoder().encode(text);
const message = (release: string) =>
  `<ONIXMessage release="${release}" xmlns="http://ns.editeur.org/onix/${release}/reference">` +
  '<Header><Sender><SenderName>T</SenderName></Sender><SentDateTime>20260909T1200</SentDateTime></Header>' +
  '<Product><RecordReference>r0</RecordReference><NotificationType>03</NotificationType>' +
  '<ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9780000000002</IDValue></ProductIdentifier></Product>' +
  '</ONIXMessage>';
const TERMINAL = new Set(['result', 'refused', 'cancelled', 'error']);

/** Evaluates the real Worker entry against a fake dedicated-worker scope whose fetch serves the pinned resources. */
async function bootEntry() {
  const events: string[] = [];
  const posted: WorkerToClientMessage[] = [];
  const fetched: string[] = [];
  let deliver: ((event: { data: ClientToWorkerMessage }) => void) | null = null;
  let onTerminal: (message: WorkerToClientMessage) => void = () => undefined;
  const scope = {
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
  vi.stubGlobal('fetch', async (url: string) => {
    fetched.push(url);
    return new Response(readFileSync(join(PUBLIC_DIR, url.slice(ONIX_VALIDATION_RESOURCE_PATH.length))));
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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('onix.worker entry: one session, then the Worker ends itself', () => {
  it('posts ready, serves one validation, closes after the terminal message and fetches only pinned resources', async () => {
    const entry = await bootEntry();
    expect(entry.posted[0]).toMatchObject({ type: 'ready', engine: 'chromium', userAgent: CHROME });
    const result = await entry.send({ type: 'begin', runId: 'r1', bytes: encode(message('3.0')) });
    expect(result).toMatchObject({ type: 'result', runId: 'r1', result: { status: 'COMPLETED' } });
    expect(entry.scope.close).toHaveBeenCalledTimes(1);
    expect(entry.events.slice(-2)).toEqual(['post:result', 'close']);
    expect(entry.fetched.length).toBeGreaterThan(0);
    expect(entry.fetched.every((url) => url.startsWith(ONIX_VALIDATION_RESOURCE_PATH))).toBe(true);
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
});
