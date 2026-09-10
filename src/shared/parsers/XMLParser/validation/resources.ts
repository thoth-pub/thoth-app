import type { OnixFlavour, OnixRelease } from './types';

/**
 * Official EDItEUR runtime artifacts, served unmodified from
 * `public/onix-validation/` and pinned by exact content hash (thoth-app#190).
 *
 * The official Short strict schemas and the stale XHTML subset shipped only in
 * the 3.0 strict archive are deliberately absent: they are evidence artifacts,
 * never runtime authority.
 */
export type OnixResourceRole =
  | 'ORDINARY_REFERENCE'
  | 'ORDINARY_SHORT'
  | 'STRICT_REFERENCE'
  | 'CODELISTS'
  | 'XHTML_SUBSET';

export interface OnixValidationResource {
  readonly fileName: string;
  readonly role: OnixResourceRole;
  readonly release: OnixRelease | null;
  readonly byteLength: number;
  readonly sha256: string;
}

/** Same-origin URL prefix of the pinned resources. */
export const ONIX_VALIDATION_RESOURCE_PATH = '/onix-validation/';

export const ONIX_VALIDATION_RESOURCES: readonly OnixValidationResource[] = [
  {
    fileName: 'ONIX_BookProduct_3.0_reference.xsd',
    role: 'ORDINARY_REFERENCE',
    release: '3.0',
    byteLength: 528183,
    sha256: '5ac4e162cbcc4a549c62fdfa3db47bd3ae0b13e3da26a9f92ec743debf10962d',
  },
  {
    fileName: 'ONIX_BookProduct_3.0_short.xsd',
    role: 'ORDINARY_SHORT',
    release: '3.0',
    byteLength: 517094,
    sha256: '8460dfa70d55675f4388d799b007eb37f4ba0a43d2faed28aea6c154eb4789e6',
  },
  {
    fileName: 'ONIX_BookProduct_3.0_reference_strict.xsd',
    role: 'STRICT_REFERENCE',
    release: '3.0',
    byteLength: 1073710,
    sha256: '2bd82f18a83000b721afdf8f2c3556e0fc2b42c8255c9b619d24b979c220b9cc',
  },
  {
    fileName: 'ONIX_BookProduct_3.1_reference.xsd',
    role: 'ORDINARY_REFERENCE',
    release: '3.1',
    byteLength: 575244,
    sha256: 'd87cdb4aa2ba62a0c9192dcde363e3819720717a8086dfd7724d9e3a200b0d64',
  },
  {
    fileName: 'ONIX_BookProduct_3.1_short.xsd',
    role: 'ORDINARY_SHORT',
    release: '3.1',
    byteLength: 563745,
    sha256: '9a97457c186699e27f5ee502379f5f565961f5b6106aafe5d842be7144158a07',
  },
  {
    fileName: 'ONIX_BookProduct_3.1_reference_strict.xsd',
    role: 'STRICT_REFERENCE',
    release: '3.1',
    byteLength: 1111823,
    sha256: '76f5cfa69c1e3e789df091cfd7f361eeda8786969144da2415315ead8aaf4c3a',
  },
  {
    fileName: 'ONIX_BookProduct_CodeLists.xsd',
    role: 'CODELISTS',
    release: null,
    byteLength: 1386386,
    sha256: 'ba948e26c1bf99ef2d633e17ca7c4767ec629571048feb2ea3ba6428745a3b58',
  },
  {
    fileName: 'ONIX_XHTML_Subset.xsd',
    role: 'XHTML_SUBSET',
    release: null,
    byteLength: 44895,
    sha256: '5192454649d7b32a2b3dde20dcb63f6fc888b9b9e6227d56e981c283c73d1f1c',
  },
];

/** Supplies the raw bytes of one manifest file (e.g. a same-origin fetch). */
export type OnixResourceLoader = (fileName: string) => Promise<Uint8Array>;

export class OnixResourceIntegrityError extends Error {
  constructor(
    readonly fileName: string,
    message: string,
  ) {
    super(`${fileName}: ${message}`);
    this.name = 'OnixResourceIntegrityError';
  }
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes));
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}

const byName = new Map(ONIX_VALIDATION_RESOURCES.map((r) => [r.fileName, r]));

/**
 * Loads one pinned resource and verifies its length and SHA-256 before it can
 * be used. Anything else fails closed: an unknown name never reaches the
 * loader, and altered bytes are never returned.
 */
export async function loadVerifiedResource(
  loader: OnixResourceLoader,
  fileName: string,
): Promise<Uint8Array> {
  const pin = byName.get(fileName);
  if (!pin) {
    throw new OnixResourceIntegrityError(
      fileName,
      'not a pinned ONIX validation resource',
    );
  }
  const bytes = await loader(fileName);
  if (bytes.byteLength !== pin.byteLength) {
    throw new OnixResourceIntegrityError(
      fileName,
      `expected ${pin.byteLength} bytes, received ${bytes.byteLength}`,
    );
  }
  const actual = await sha256Hex(bytes);
  if (actual !== pin.sha256) {
    throw new OnixResourceIntegrityError(
      fileName,
      `SHA-256 ${actual} does not match the pin ${pin.sha256}`,
    );
  }
  return bytes;
}

export interface OnixResourceSelection {
  /** Ordinary schema of the source flavour (stage 3). */
  readonly sourceOrdinary: string;
  /** Canonical Reference ordinary schema (stage 5). */
  readonly referenceOrdinary: string;
  /** Short ordinary schema, needed only to derive the tag map. */
  readonly shortOrdinary: string | null;
  /** Canonical Reference strict schema (rule source for stages 6-7). */
  readonly referenceStrict: string;
  /** Included by every ordinary schema. */
  readonly shared: readonly string[];
}

export function resourcesFor(
  release: OnixRelease,
  flavour: OnixFlavour,
): OnixResourceSelection {
  const pick = (role: OnixResourceRole) => {
    const match = ONIX_VALIDATION_RESOURCES.find(
      (r) => r.role === role && r.release === release,
    );
    if (!match) throw new Error(`no ${role} resource for release ${release}`);
    return match.fileName;
  };
  const referenceOrdinary = pick('ORDINARY_REFERENCE');
  const shortOrdinary = flavour === 'short' ? pick('ORDINARY_SHORT') : null;
  return {
    sourceOrdinary: shortOrdinary ?? referenceOrdinary,
    referenceOrdinary,
    shortOrdinary,
    referenceStrict: pick('STRICT_REFERENCE'),
    shared: ONIX_VALIDATION_RESOURCES.filter((r) => r.release === null).map(
      (r) => r.fileName,
    ),
  };
}
