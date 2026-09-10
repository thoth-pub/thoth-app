import { ONIX_VALIDATION_RESOURCE_PATH, type OnixResourceLoader } from '../resources';
import { createOnixSourceValidator } from '../validator';
import { classifyEngine } from './envelope';
import { type ClientToWorkerMessage, ONIX_WORKER_PROTOCOL_VERSION, type WorkerToClientMessage } from './protocol';
import { createWorkerSession } from './session';

/**
 * Dedicated Worker entry of the browser ONIX validation runtime
 * (thoth-app#196). One Worker serves one validation session; the client
 * (`client.ts`) constructs it. Nothing in the live uploader references this
 * module: activation is a separate task.
 *
 * Network boundary: the only requests this Worker ever makes are same-origin
 * fetches of the pinned `/onix-validation/*` resources, each verified against
 * its length and SHA-256 by #190 before use. Publisher metadata URLs are data.
 */
interface DedicatedWorkerScope {
  postMessage(message: WorkerToClientMessage): void;
  addEventListener(type: 'message', listener: (event: { readonly data: ClientToWorkerMessage }) => void): void;
  readonly navigator: { readonly userAgent: string };
}

const scope = self as unknown as DedicatedWorkerScope;

const loadResource: OnixResourceLoader = async (fileName) => {
  const response = await fetch(`${ONIX_VALIDATION_RESOURCE_PATH}${fileName}`, { credentials: 'same-origin' });
  if (!response.ok) throw new Error(`${fileName}: HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
};

const session = createWorkerSession({
  post: (message) => scope.postMessage(message),
  userAgent: scope.navigator.userAgent,
  createValidator: (controls) =>
    createOnixSourceValidator({
      loadResource,
      execution: {
        onStage: controls.onStage,
        onProgress: controls.onProgress,
        shouldCancel: controls.shouldCancel,
        yield: controls.yield,
      },
    }),
});

scope.addEventListener('message', (event) => {
  void session.handle(event.data);
});

scope.postMessage({
  type: 'ready',
  protocolVersion: ONIX_WORKER_PROTOCOL_VERSION,
  engine: classifyEngine(scope.navigator.userAgent),
  userAgent: scope.navigator.userAgent,
});
