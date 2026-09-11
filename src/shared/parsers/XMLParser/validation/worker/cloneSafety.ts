/**
 * Runtime contract of the Worker boundary: a value may cross `postMessage`
 * only as plain data. The check is deliberately stricter than the structured
 * clone algorithm itself (which would silently drop functions inside objects
 * or throw on a DOM node): anything that is not a primitive, an array, a
 * plain object or a typed array is rejected, naming the offending path.
 */
export class NotCloneSafeError extends Error {
  constructor(
    readonly path: string,
    readonly reason: string,
  ) {
    super(`${path}: ${reason}`);
    this.name = 'NotCloneSafeError';
  }
}

const PLAIN_PROTOTYPES = new Set<object | null>([Object.prototype, null]);

export function assertStructuredCloneSafe(value: unknown, path = '$'): void {
  const seen = new Set<object>();
  const walk = (v: unknown, at: string): void => {
    if (v === null || v === undefined) return;
    switch (typeof v) {
      case 'string':
      case 'number':
      case 'boolean':
        return;
      case 'bigint':
      case 'symbol':
      case 'function':
        throw new NotCloneSafeError(at, `${typeof v} is not plain data`);
      case 'object':
        break;
      default:
        throw new NotCloneSafeError(at, `unsupported type ${typeof v}`);
    }
    const object = v as object;
    if (seen.has(object)) throw new NotCloneSafeError(at, 'cyclic reference');
    seen.add(object);
    if (ArrayBuffer.isView(object) || object instanceof ArrayBuffer) return;
    if (Array.isArray(object)) {
      object.forEach((item, i) => walk(item, `${at}[${i}]`));
      seen.delete(object);
      return;
    }
    if (!PLAIN_PROTOTYPES.has(Object.getPrototypeOf(object))) {
      const name = (object as { constructor?: { name?: string } }).constructor?.name ?? 'object';
      throw new NotCloneSafeError(at, `${name} instance is not plain data`);
    }
    for (const [key, item] of Object.entries(object)) walk(item, `${at}.${key}`);
    seen.delete(object);
  };
  walk(value, path);
}
