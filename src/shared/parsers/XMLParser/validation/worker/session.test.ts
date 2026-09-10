// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it, type Mock, vi } from 'vitest';

import { decodeSource } from '../encoding';
import { PROLOG_SCAN_BOUND } from '../prolog';
import { evaluateSourceGate } from '../sourceGate';
import { createOnixSourceValidator, type OnixSourceValidator } from '../validator';
import type { ClientToWorkerMessage, WorkerToClientMessage } from './protocol';
import { createWorkerSession, type ValidatorControls } from './session';
import { countProducts } from './sizing';

vi.setConfig({ testTimeout: 120_000 });

const PUBLIC_DIR = join(process.cwd(), 'public', 'onix-validation');
const encode = (text: string) => new TextEncoder().encode(text);
const CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36';
const FIREFOX = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:155.0) Gecko/20100101 Firefox/155.0';
const SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15';

const product = (r: string) =>
  `<Product><RecordReference>${r}</RecordReference><NotificationType>03</NotificationType>` +
  '<ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9780000000002</IDValue></ProductIdentifier></Product>';
const message = (products: number, release = '3.0') =>
  `<?xml version="1.0" encoding="UTF-8"?><ONIXMessage release="${release}" xmlns="http://ns.editeur.org/onix/${release}/reference">` +
  '<Header><Sender><SenderName>T</SenderName></Sender><SentDateTime>20260909T1200</SentDateTime></Header>' +
  Array.from({ length: products }, (_, i) => product(`r${i}`)).join('') +
  '</ONIXMessage>';

interface Harness {
  posted: WorkerToClientMessage[];
  calls: string[];
  loader: Mock<(fileName: string) => Promise<Uint8Array>>;
  session: ReturnType<typeof createWorkerSession>;
  controls: ValidatorControls[];
}

function harness(userAgent: string, validatorFactory?: (controls: ValidatorControls) => OnixSourceValidator): Harness {
  const posted: WorkerToClientMessage[] = [];
  const calls: string[] = [];
  const loader = vi.fn(async (fileName: string) => {
    calls.push(`load:${fileName}`);
    return new Uint8Array(readFileSync(join(PUBLIC_DIR, fileName)));
  });
  const controls: ValidatorControls[] = [];
  const session = createWorkerSession({
    post: (m) => void posted.push(m),
    userAgent,
    createValidator: (c) => {
      controls.push(c);
      calls.push('createValidator');
      return validatorFactory
        ? validatorFactory(c)
        : createOnixSourceValidator({
            loadResource: loader,
            execution: { onStage: c.onStage, onProgress: c.onProgress, shouldCancel: c.shouldCancel, yield: c.yield },
          });
    },
    decode: (bytes) => {
      calls.push('decode');
      return decodeSource(bytes);
    },
    gate: (text) => {
      calls.push('gate');
      return evaluateSourceGate(text);
    },
    sizing: (text, source) => {
      calls.push('sizing');
      return countProducts(text, source);
    },
    newToken: () => 'token-1',
    now: () => 0,
  });
  return { posted, calls, loader, session, controls };
}

const begin = (bytes: Uint8Array, options?: ClientToWorkerMessage extends infer _M ? Record<string, unknown> : never) =>
  ({ type: 'begin', runId: 'r1', bytes, options }) as ClientToWorkerMessage;
const types = (h: Harness) => h.posted.map((m) => m.type);
const last = (h: Harness) => h.posted[h.posted.length - 1];

describe('worker session: stage-1/2 stops precede sizing and every resource', () => {
  it.each([
    ['DTD', '<!DOCTYPE ONIXMessage>' + message(1, '3.1'), ['SECURITY_DTD', 'R-MSG-NO-DOCTYPE-31']],
    ['prolog bound', `<!--${'x'.repeat(PROLOG_SCAN_BOUND)}-->${message(1)}`, ['SECURITY_PROLOG_BOUND']],
    ['unsupported release', '<ONIXMessage release="2.1"><Header/></ONIXMessage>', ['UNSUPPORTED_SOURCE']],
    ['malformed prolog', 'junk<ONIXMessage/>', ['SOURCE_NOT_WELL_FORMED']],
  ])('%s: canonical stopped result, no sizing, no resource load', async (_label, text, ids) => {
    const h = harness(CHROME);
    await h.session.handle(begin(encode(text)));
    expect(types(h).filter((t) => t !== 'progress')).toEqual(['result']);
    const result = last(h);
    expect(result.type === 'result' && result.result.status).toBe('STOPPED');
    expect(result.type === 'result' && result.result.findings.map((f) => f.id)).toEqual(ids);
    expect(result.type === 'result' && result.envelope).toBeNull();
    expect(h.calls).not.toContain('sizing');
    expect(h.calls.filter((c) => c.startsWith('load:'))).toEqual([]);
    expect(h.loader).not.toHaveBeenCalled();
    expect(h.session.state).toBe('IDLE');
  });

  it('stops an unsupported encoding through the canonical validator without decoding twice into sizing', async () => {
    const h = harness(CHROME);
    await h.session.handle(begin(encode(message(1).replace('UTF-8', 'ISO-8859-1'))));
    const result = last(h);
    expect(result.type === 'result' && result.result.findings.map((f) => f.id)).toEqual(['UNSUPPORTED_SOURCE']);
    expect(h.calls).toEqual(['decode', 'createValidator']);
    expect(h.loader).not.toHaveBeenCalled();
  });
});

describe('worker session: normal path', () => {
  it('decodes, gates, sizes, classifies and only then loads resources and validates', async () => {
    const h = harness(CHROME);
    await h.session.handle(begin(encode(message(2))));
    expect(h.calls.slice(0, 4)).toEqual(['decode', 'gate', 'sizing', 'createValidator']);
    expect(h.calls.filter((c) => c.startsWith('load:')).length).toBeGreaterThan(0);
    const result = last(h);
    expect(result.type).toBe('result');
    if (result.type !== 'result') return;
    expect(result.result.status).toBe('COMPLETED');
    expect(result.result.source?.release).toBe('3.0');
    expect(result.envelope).toMatchObject({
      engine: 'chromium',
      verdict: 'NORMAL',
      products: { measured: true, count: 2 },
    });
    expect(result.envelope?.bytes).toBe(encode(message(2)).byteLength);
    expect(types(h).filter((t) => t === 'progress').length).toBeGreaterThan(3);
    expect(h.posted.filter((m) => m.type === 'progress').map((m) => m.type === 'progress' && m.stage)).toEqual([
      'DECODING',
      'SOURCE_GATE',
      'ENVELOPE',
      'SIZING',
      'ENVELOPE',
      'DECODING',
      'SOURCE_GATE',
      'PREPARING',
      'ORDINARY',
      'STRICT',
      'SCHEMATRON',
      'INVENTORY',
      'SERIALIZING',
    ]);
    expect(h.session.state).toBe('IDLE');
    expect(h.controls[0].accelerate).toBe(true);
  });

  it('measures the envelope in raw bytes: a UTF-16 source counts its byte length, not its string length', async () => {
    const text = message(1).replace('encoding="UTF-8"', 'encoding="UTF-16"');
    const bytes = new Uint8Array(2 + text.length * 2);
    bytes.set([0xff, 0xfe]);
    for (let i = 0; i < text.length; i++) {
      bytes[2 + i * 2] = text.charCodeAt(i) & 0xff;
      bytes[3 + i * 2] = text.charCodeAt(i) >> 8;
    }
    const h = harness(CHROME);
    await h.session.handle(begin(bytes));
    const result = last(h);
    expect(result.type === 'result' && result.envelope?.bytes).toBe(bytes.byteLength);
    expect(bytes.byteLength).toBe(2 * text.length + 2);
    expect(result.type === 'result' && result.result.status).toBe('COMPLETED');
  });

  it('emits no progress when disabled and the same canonical result', async () => {
    const quiet = harness(CHROME);
    await quiet.session.handle(begin(encode(message(1)), { progress: false }));
    expect(types(quiet)).toEqual(['result']);
    const loud = harness(CHROME);
    await loud.session.handle(begin(encode(message(1))));
    expect(JSON.stringify(last(quiet))).toBe(JSON.stringify(last(loud)));
  });

  it('hands a sizing parser failure to the canonical validator instead of inventing a diagnosis', async () => {
    const h = harness(CHROME);
    const text = message(1).replace('</ONIXMessage>', '<Product></ONIXMessage>');
    await h.session.handle(begin(encode(text)));
    expect(h.calls).toContain('sizing');
    const result = last(h);
    expect(result.type).toBe('result');
    if (result.type !== 'result') return;
    expect(result.envelope?.products).toMatchObject({ measured: false, reason: 'SIZING_PARSE_ERROR' });
    expect(result.result.status).toBe('STOPPED');
    expect(result.result.findings.map((f) => f.id)).toEqual(['SOURCE_NOT_WELL_FORMED']);
  });
});

describe('worker session: envelope refusals', () => {
  it.each([
    ['Safari', SAFARI, 'webkit'],
    ['unknown desktop engine', 'Mozilla/5.0 (X11) Servo/1.0', 'unknown'],
    ['phone', 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/152.0.0.0 Mobile Safari/537.36', 'mobile'],
  ])('%s: deterministic SUPPORT refusal before sizing or resources', async (_label, userAgent, engine) => {
    const h = harness(userAgent);
    await h.session.handle(begin(encode(message(1))));
    expect(last(h)).toEqual({
      type: 'refused',
      runId: 'r1',
      reason: 'UNSUPPORTED_FOR_BROWSER_VALIDATION',
      scope: 'SUPPORT',
      envelope: expect.objectContaining({
        engine,
        verdict: 'UNSUPPORTED',
        products: { measured: false, reason: 'ENGINE_UNSUPPORTED' },
      }),
    });
    expect(h.calls).toEqual(['decode', 'gate']);
    expect(h.loader).not.toHaveBeenCalled();
  });

  it('refuses on the raw byte ceiling alone, without walking the document for Products', async () => {
    const h = harness(FIREFOX);
    const text = message(1).replace('</Header>', `</Header><!--${'x'.repeat(20_000_001)}-->`);
    const bytes = encode(text);
    expect(bytes.byteLength).toBeGreaterThan(20_000_000);
    await h.session.handle(begin(bytes));
    expect(last(h)).toMatchObject({
      type: 'refused',
      envelope: {
        engine: 'gecko',
        verdict: 'REFUSE',
        exceeded: ['bytes'],
        products: { measured: false, reason: 'BYTE_CEILING_EXCEEDED' },
      },
    });
    expect(h.calls).not.toContain('sizing');
    expect(h.loader).not.toHaveBeenCalled();
  });

  it('refuses on the Product ceiling after sizing, without loading resources', async () => {
    const h = harness(FIREFOX);
    await h.session.handle(begin(encode(message(1001))));
    expect(last(h)).toMatchObject({
      type: 'refused',
      envelope: {
        engine: 'gecko',
        verdict: 'REFUSE',
        exceeded: ['products'],
        products: { measured: true, count: 1001 },
      },
    });
    expect(h.calls).toEqual(['decode', 'gate', 'sizing']);
    expect(h.loader).not.toHaveBeenCalled();
    expect(h.session.state).toBe('IDLE');
  });
});

describe('worker session: warning continuation state machine', () => {
  it('retains the exact bytes, waits for the token, rejects stale tokens and validates only on the matching continuation', async () => {
    const h = harness(FIREFOX);
    const bytes = encode(message(501));
    await h.session.handle(begin(bytes));
    expect(last(h)).toEqual({
      type: 'warning',
      runId: 'r1',
      token: 'token-1',
      envelope: expect.objectContaining({
        engine: 'gecko',
        verdict: 'WARNING',
        exceeded: ['products'],
        products: { measured: true, count: 501 },
      }),
    });
    expect(h.calls).toEqual(['decode', 'gate', 'sizing']);
    expect(h.loader).not.toHaveBeenCalled();
    expect(h.session.state).toBe('AWAITING_CONTINUATION');

    await h.session.handle({ type: 'continue', runId: 'r1', token: 'wrong' });
    expect(last(h)).toMatchObject({ type: 'error', runId: 'r1', code: 'STALE_SESSION' });
    await h.session.handle({ type: 'continue', runId: 'r2', token: 'token-1' });
    expect(last(h)).toMatchObject({ type: 'error', runId: 'r2', code: 'STALE_SESSION' });
    expect(h.loader).not.toHaveBeenCalled();
    expect(h.session.state).toBe('AWAITING_CONTINUATION');

    await h.session.handle({ type: 'continue', runId: 'r1', token: 'token-1' });
    const result = last(h);
    expect(result.type).toBe('result');
    if (result.type !== 'result') return;
    expect(result.result.status).toBe('COMPLETED');
    expect(result.envelope?.verdict).toBe('WARNING');
    expect(h.loader).toHaveBeenCalled();
    // The retained bytes were validated: same ledger as a direct canonical validation of those bytes.
    const direct = await createOnixSourceValidator({ loadResource: h.loader }).validate(bytes);
    expect(result.result.findings).toEqual(direct.findings);
    expect(result.result.summary).toEqual(direct.summary);
    expect(h.session.state).toBe('IDLE');
    // The session is consumed: the same token cannot be replayed.
    await h.session.handle({ type: 'continue', runId: 'r1', token: 'token-1' });
    expect(last(h)).toMatchObject({ type: 'error', code: 'NO_SESSION' });
  });

  it('a continuation without a retained session fails closed', async () => {
    const h = harness(CHROME);
    await h.session.handle({ type: 'continue', runId: 'r1', token: 'token-1' });
    expect(last(h)).toMatchObject({ type: 'error', code: 'NO_SESSION' });
    expect(h.calls).toEqual([]);
  });

  it('cancelling a pending warning drops the retained bytes', async () => {
    const h = harness(FIREFOX);
    await h.session.handle(begin(encode(message(501))));
    await h.session.handle({ type: 'cancel', runId: 'r1' });
    expect(last(h)).toEqual({ type: 'cancelled', runId: 'r1', stage: 'ENVELOPE' });
    expect(h.session.state).toBe('IDLE');
    await h.session.handle({ type: 'continue', runId: 'r1', token: 'token-1' });
    expect(last(h)).toMatchObject({ type: 'error', code: 'NO_SESSION' });
    expect(h.loader).not.toHaveBeenCalled();
  });

  it('a new begin replaces a pending warning session', async () => {
    const h = harness(FIREFOX);
    await h.session.handle(begin(encode(message(501))));
    await h.session.handle({ type: 'begin', runId: 'r2', bytes: encode(message(1)) });
    expect(last(h)).toMatchObject({ type: 'result', runId: 'r2' });
    await h.session.handle({ type: 'continue', runId: 'r1', token: 'token-1' });
    expect(last(h)).toMatchObject({ type: 'error', code: 'NO_SESSION' });
  });
});

describe('worker session: running state and cancellation', () => {
  const deferredValidator = () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const factory = (controls: ValidatorControls) => ({
      async validate() {
        controls.onStage('STRICT');
        await gate;
        await controls.yield();
        if (controls.shouldCancel()) throw new Error('cancelled by controls');
        controls.onProgress({ stage: 'STRICT', done: 1, total: 1 });
        return {
          status: 'COMPLETED' as const,
          stop: null,
          source: null,
          findings: [],
          summary: { total: 0, blocking: 0, secondary: 0, notEvaluable: 0, recovered: 0 },
          sourceValid: true,
          normalized: null,
        };
      },
    });
    return { factory, release: () => release() };
  };

  it('rejects a second begin while a run is in progress', async () => {
    const v = deferredValidator();
    const h = harness(CHROME, v.factory);
    const first = h.session.handle(begin(encode(message(1))));
    await new Promise((r) => setTimeout(r, 0));
    expect(h.session.state).toBe('RUNNING');
    await h.session.handle({ type: 'begin', runId: 'r2', bytes: encode(message(1)) });
    expect(last(h)).toMatchObject({ type: 'error', runId: 'r2', code: 'BUSY' });
    v.release();
    await first;
    expect(last(h)).toMatchObject({ type: 'result', runId: 'r1' });
  });

  it('cooperative cancel discards the run and posts cancelled with the last stage; a fresh begin then works', async () => {
    const v = deferredValidator();
    const h = harness(CHROME, v.factory);
    const first = h.session.handle(begin(encode(message(1))));
    await new Promise((r) => setTimeout(r, 0));
    await h.session.handle({ type: 'cancel', runId: 'r1' });
    v.release();
    await first;
    expect(types(h).filter((t) => t !== 'progress')).toEqual(['cancelled']);
    expect(last(h)).toEqual({ type: 'cancelled', runId: 'r1', stage: 'STRICT' });
    expect(h.session.state).toBe('IDLE');
    const v2 = deferredValidator();
    v2.release();
    const h2 = harness(CHROME, v2.factory);
    await h2.session.handle(begin(encode(message(1))));
    expect(last(h2)).toMatchObject({ type: 'result', runId: 'r1', result: { status: 'COMPLETED' } });
  });

  it('a result computed after a late cancel is discarded, never delivered', async () => {
    const factory = (controls: ValidatorControls) => ({
      async validate() {
        controls.onStage('STRICT');
        await new Promise((r) => setTimeout(r, 0));
        return {
          status: 'COMPLETED' as const,
          stop: null,
          source: null,
          findings: [],
          summary: { total: 0, blocking: 0, secondary: 0, notEvaluable: 0, recovered: 0 },
          sourceValid: true,
          normalized: null,
        };
      },
    });
    const h = harness(CHROME, factory);
    const run = h.session.handle(begin(encode(message(1))));
    await h.session.handle({ type: 'cancel', runId: 'r1' });
    await run;
    expect(types(h).filter((t) => t !== 'progress')).toEqual(['cancelled']);
  });

  it('reuses one validator per acceleration mode across runs, with controls bound to the active run', async () => {
    const h = harness(CHROME);
    await h.session.handle(begin(encode(message(1))));
    await h.session.handle({ type: 'begin', runId: 'r2', bytes: encode(message(1)) });
    await h.session.handle({ type: 'begin', runId: 'r3', bytes: encode(message(1)), options: { accelerate: false } });
    expect(h.calls.filter((c) => c === 'createValidator')).toHaveLength(2);
    expect(h.controls.map((c) => c.accelerate)).toEqual([true, false]);
    const loads = h.calls.filter((c) => c.startsWith('load:')).length;
    expect(loads).toBeGreaterThan(0);
    expect(h.posted.filter((m) => m.type === 'result').map((m) => m.runId)).toEqual(['r1', 'r2', 'r3']);
    const stages = h.posted
      .filter((m) => m.type === 'progress' && m.runId === 'r2')
      .map((m) => m.type === 'progress' && m.stage);
    expect(stages).toContain('STRICT');
    expect(h.controls[0].shouldCancel()).toBe(false);
  });

  it('cancel outside a run answers cancelled without state', async () => {
    const h = harness(CHROME);
    await h.session.handle({ type: 'cancel', runId: 'r9' });
    expect(last(h)).toEqual({ type: 'cancelled', runId: 'r9', stage: null });
  });

  it('rejects malformed messages', async () => {
    const h = harness(CHROME);
    await h.session.handle({} as ClientToWorkerMessage);
    expect(last(h)).toMatchObject({ type: 'error', code: 'MALFORMED_MESSAGE' });
    await h.session.handle({ type: 'begin', runId: 'r1', bytes: 'text' as unknown as Uint8Array });
    expect(last(h)).toMatchObject({ type: 'error', code: 'MALFORMED_MESSAGE' });
    expect(h.calls).toEqual([]);
  });

  it('throttles counted progress to the configured interval but always posts the final count', async () => {
    let t = 0;
    const factory = (controls: ValidatorControls) => ({
      async validate() {
        for (let i = 1; i <= 5; i++) {
          t += 30;
          controls.onProgress({ stage: 'STRICT', done: i, total: 5 });
        }
        return {
          status: 'COMPLETED' as const,
          stop: null,
          source: null,
          findings: [],
          summary: { total: 0, blocking: 0, secondary: 0, notEvaluable: 0, recovered: 0 },
          sourceValid: true,
          normalized: null,
        };
      },
    });
    const posted: WorkerToClientMessage[] = [];
    const session = createWorkerSession({
      post: (m) => void posted.push(m),
      userAgent: CHROME,
      createValidator: factory,
      now: () => t,
      progressIntervalMs: 100,
    });
    await session.handle(begin(encode(message(1))));
    const counted = posted
      .filter((m) => m.type === 'progress' && m.done !== undefined)
      .map((m) => m.type === 'progress' && m.done);
    expect(counted).toEqual([1, 5]);
  });
});
