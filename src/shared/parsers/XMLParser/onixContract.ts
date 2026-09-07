import type { OnixSourceDiagnostic } from '../../types';
import type { ExtendedONIXMessage } from './interfaces';
import { ONIX_MESSAGE_PATH } from './onixSourcePath';

/**
 * The supported ONIX source boundary, owned by code rather than assumed.
 *
 * Until now the importer read whatever XML it was handed: `@5stones/onix` parses a document and
 * casts the result, so an ONIX 2.1 file — a different standard, with different element names and
 * different semantics — reached the same target mapping as a 3.0 one and produced whatever fell
 * out. The audit (#179) classified that as a preflight gap. The boundary is enforced here, once,
 * before anything reads a Product.
 */

export { isOnixCodelistValue, ONIX_CODELIST_ISSUE, type OnixCodelistNumber } from './onixCodelists';

/** The ONIX for Books releases bulk ingest supports. 2.1 is deliberately not among them. */
export const ONIX_SUPPORTED_RELEASES = ['3.0', '3.1'] as const;

export type OnixRelease = (typeof ONIX_SUPPORTED_RELEASES)[number];

/**
 * The final specification family each supported release is validated against, as audited.
 *
 * A release is a family, not a document: 3.0 has had eight revisions. Naming the exact revision
 * this importer was written against is what makes a later divergence a decision rather than a
 * surprise.
 */
export const ONIX_SPECIFICATIONS: Record<OnixRelease, string> = { '3.0': '3.0.8', '3.1': '3.1.2' };

/**
 * EDItEUR's ONIX namespaces, which are `…/onix/<release>/<reference|short>`.
 *
 * Matched as a pattern rather than listed, so a short-tag document and a reference one are read
 * alike and a namespace for a release this code has never heard of is still recognised as an
 * ONIX namespace making a claim about the release.
 */
const EDITEUR_ONIX_NAMESPACE = /^https?:\/\/ns\.editeur\.org\/onix\/(\d+\.\d+)\/(?:reference|short)$/;

/** What the message says its release is, and whether that is something this importer can read. */
export type OnixReleaseResolution =
  | { kind: 'supported'; release: OnixRelease; specification: string; namespace?: string }
  /** A release outside the supported boundary — ONIX 2.1, or anything else the file names. */
  | { kind: 'unsupported'; release: string; namespace?: string }
  /** No release declared, so which ONIX grammar applies is not knowable. */
  | { kind: 'undeclared'; namespace?: string }
  /** A declared release its own ONIX namespace contradicts. */
  | { kind: 'ambiguous'; release: string; namespace: string };

const isSupported = (release: string): release is OnixRelease =>
  (ONIX_SUPPORTED_RELEASES as readonly string[]).includes(release);

/**
 * The release a message declares.
 *
 * Read from the `release` attribute, which is where an ONIX message states its release. A
 * namespace is corroborating evidence only: an EDItEUR ONIX namespace naming a different release
 * makes the message ambiguous, but one is never read *instead* of a declaration. A message that
 * declares no release is `undeclared` and blocks, whatever namespace it carries — the namespace
 * travels on the finding as evidence so it is actionable, not as a substitute for the missing
 * declaration.
 */
export const resolveOnixRelease = (message: ExtendedONIXMessage | undefined | null): OnixReleaseResolution => {
  const declared = (message?.['@_release'] ?? '').toString().trim();
  const declaredNamespace = ((message as { '@_xmlns'?: string } | undefined)?.['@_xmlns'] ?? '').toString().trim();
  const onixNamespace = EDITEUR_ONIX_NAMESPACE.exec(declaredNamespace);
  // Only an EDItEUR ONIX namespace says anything about the release. A sender's own default
  // namespace is not evidence and is not carried as though it were.
  const namespace = onixNamespace ? { namespace: declaredNamespace } : {};

  if (declared.length === 0) return { kind: 'undeclared', ...namespace };

  if (onixNamespace && onixNamespace[1] !== declared) {
    return { kind: 'ambiguous', release: declared, namespace: declaredNamespace };
  }

  if (!isSupported(declared)) return { kind: 'unsupported', release: declared, ...namespace };

  return { kind: 'supported', release: declared, specification: ONIX_SPECIFICATIONS[declared], ...namespace };
};

const SUPPORTED_RELEASES_TEXT = ONIX_SUPPORTED_RELEASES.join(' and ');

/**
 * Why a message cannot be read, or nothing when it can.
 *
 * Every outcome blocks: unlike a malformed composite inside one Product, an unreadable release
 * cannot be isolated and omitted. Nothing in the file has a known meaning, so there is nothing
 * to recover and nothing to plan.
 */
export const releaseDiagnostic = (resolution: OnixReleaseResolution): OnixSourceDiagnostic | undefined => {
  const blocking = {
    classification: 'SOURCE_INVALID',
    severity: 'error',
    recovery: 'BLOCKING',
    path: ONIX_MESSAGE_PATH,
  } as const;

  switch (resolution.kind) {
    case 'supported':
      return undefined;
    case 'unsupported':
      return {
        ...blocking,
        code: 'onix.source.unsupported_release',
        message:
          `This file declares ONIX release ${resolution.release}. Thoth's bulk import reads ONIX for Books ` +
          `${SUPPORTED_RELEASES_TEXT} only, so nothing has been read from it.`,
        sourceValue: resolution.release,
        evidence: { release: resolution.release, ...(resolution.namespace ? { namespace: resolution.namespace } : {}) },
      };
    case 'undeclared':
      return {
        ...blocking,
        code: 'onix.source.undeclared_release',
        message:
          'This file does not declare an ONIX release, so Thoth cannot tell which version of ONIX it is written ' +
          `in. Add a release attribute to the ONIXMessage element — ONIX for Books ${SUPPORTED_RELEASES_TEXT} are ` +
          'supported.',
        ...(resolution.namespace ? { evidence: { namespace: resolution.namespace } } : {}),
      };
    case 'ambiguous':
      return {
        ...blocking,
        code: 'onix.source.ambiguous_release',
        message:
          `This file declares ONIX release ${resolution.release} but uses the ONIX namespace ` +
          `${resolution.namespace}. Thoth cannot tell which of the two is right, so nothing has been read from it.`,
        sourceValue: resolution.release,
        evidence: { release: resolution.release, namespace: resolution.namespace },
      };
  }
};
