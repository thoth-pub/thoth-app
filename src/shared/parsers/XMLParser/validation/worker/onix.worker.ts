import { ONIX_VALIDATION_RESOURCE_PATH, type OnixResourceLoader } from '../resources';
import { createOnixSourceValidator } from '../validator';
import { classifyEngine } from './envelope';
import { createExecutionControls } from './execution';
import { type ClientToWorkerMessage, ONIX_WORKER_PROTOCOL_VERSION, type WorkerToClientMessage } from './protocol';
import { createWorkerSession } from './session';

/**
 * Dedicated Worker entry of the browser ONIX validation runtime
 * (thoth-app#196). One Worker serves exactly one validation session: the
 * client (`client.ts`) constructs it for that session and terminates it at the
 * session's end, and the Worker closes itself once it has posted the terminal
 * message. Nothing in the live uploader references this module: activation is
 * a separate task.
 *
 * Network boundary: the only requests this Worker ever makes are same-origin
 * fetches of the pinned `/onix-validation/*` resources, each verified against
 * its length and SHA-256 by #190 before use. Publisher metadata URLs are data.
 */
interface DedicatedWorkerScope {
  postMessage(message: WorkerToClientMessage): void;
  addEventListener(type: 'message', listener: (event: { readonly data: ClientToWorkerMessage }) => void): void;
  close(): void;
  readonly navigator: { readonly userAgent: string };
  /** `WorkerGlobalScope.origin`: this Worker's own serialised origin, `"null"` when opaque. */
  readonly origin: string;
}

const scope = self as unknown as DedicatedWorkerScope;

/** This Worker's own origin, or `null` unless it is an http(s) tuple origin. */
function workerOrigin(): URL | null {
  try {
    const origin = new URL(scope.origin);
    const tuple = origin.protocol === 'https:' || origin.protocol === 'http:';
    return tuple && origin.origin === scope.origin ? origin : null;
  } catch {
    return null; // an opaque origin serialises as "null", which is no URL
  }
}

/**
 * Absolute URL of a pinned resource on this Worker's own origin. The
 * production build starts the Worker from a `blob:` bootstrap, whose URL is no
 * base for a root-relative path, so the path is resolved against the Worker's
 * origin instead. The result must stay on that origin beneath the pinned
 * prefix; anything else fails closed before a request is made.
 */
function resourceUrl(fileName: string): URL {
  const origin = workerOrigin();
  if (!origin) throw new Error(`${fileName}: this Worker has no usable http(s) origin (${scope.origin})`);
  const url = new URL(`${ONIX_VALIDATION_RESOURCE_PATH}${fileName}`, origin);
  if (url.origin !== origin.origin || !url.pathname.startsWith(ONIX_VALIDATION_RESOURCE_PATH)) {
    throw new Error(`${fileName}: resolves outside ${origin.origin}${ONIX_VALIDATION_RESOURCE_PATH}`);
  }
  return url;
}

const loadResource: OnixResourceLoader = async (fileName) => {
  const response = await fetch(resourceUrl(fileName), { credentials: 'same-origin' });
  if (!response.ok) throw new Error(`${fileName}: HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
};

const session = createWorkerSession({
  post: (message) => scope.postMessage(message),
  userAgent: scope.navigator.userAgent,
  createValidator: (controls) =>
    createOnixSourceValidator({ loadResource, execution: createExecutionControls(controls) }),
  // The session's terminal message has been posted: this Worker's lifecycle ends with it.
  onEnded: () => scope.close(),
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
