import {
  ONIX_NAMESPACES,
  ONIX_ROOT_NAME,
  type OnixFlavour,
  type OnixRelease,
  type OnixSourceDescriptor,
  SCHEMA_RELEASE,
} from './types';

export interface RootTagAttribute {
  readonly name: string;
  readonly value: string;
}

/** Lexical view of the root element start tag (no XML parser involved). */
export interface RootTag {
  readonly qualifiedName: string;
  readonly localName: string;
  readonly prefix: string | null;
  readonly namespaceURI: string | null;
  readonly attributes: readonly RootTagAttribute[];
  readonly duplicateAttributeNames: readonly string[];
}

export type ReleaseFlavourInvalidReason =
  | 'AMBIGUOUS_ROOT'
  | 'MIXED_FLAVOUR'
  | 'ROOT_NOT_ONIX_MESSAGE'
  | 'RELEASE_UNDECLARED'
  | 'RELEASE_NAMESPACE_CONFLICT'
  | 'NAMESPACE_UNDECLARED';

export type ReleaseFlavourUnsupportedReason =
  | 'UNSUPPORTED_ONIX_RELEASE'
  | 'NOT_ONIX_FOR_BOOKS';

export interface RootSummary {
  readonly rootName: string;
  readonly namespaceURI: string | null;
  readonly release: string | null;
}

export type ReleaseFlavourResolution =
  | { readonly kind: 'RESOLVED'; readonly source: OnixSourceDescriptor }
  | {
      readonly kind: 'INVALID';
      readonly reason: ReleaseFlavourInvalidReason;
      readonly detail: RootSummary;
    }
  | {
      readonly kind: 'UNSUPPORTED';
      readonly reason: ReleaseFlavourUnsupportedReason;
      readonly detail: RootSummary;
    };

const EDITEUR_ONIX_NAMESPACE = /^https?:\/\/(?:ns\.|www\.)?editeur\.org\/onix\//i;

function lookupOnix3(
  namespaceURI: string | null,
): { release: OnixRelease; flavour: OnixFlavour } | null {
  for (const release of Object.keys(ONIX_NAMESPACES) as OnixRelease[]) {
    for (const flavour of Object.keys(
      ONIX_NAMESPACES[release],
    ) as OnixFlavour[]) {
      if (ONIX_NAMESPACES[release][flavour] === namespaceURI) {
        return { release, flavour };
      }
    }
  }
  return null;
}

/**
 * Stage 1: resolve the release and tag flavour from the root element's
 * namespace and `release` attribute (thoth#895 stage 1). A mixed, undeclared
 * or contradictory declaration is `SOURCE_INVALID`; anything outside the
 * supported boundary is a SUPPORT stop, never a validity verdict.
 */
export function resolveReleaseFlavour(root: RootTag): ReleaseFlavourResolution {
  const releaseAttrs = root.attributes.filter((a) => a.name === 'release');
  const release = releaseAttrs.length ? releaseAttrs[0].value : null;
  const detail: RootSummary = {
    rootName: root.qualifiedName,
    namespaceURI: root.namespaceURI,
    release,
  };

  if (
    root.duplicateAttributeNames.some(
      (n) => n === 'release' || n === 'xmlns' || n.startsWith('xmlns:'),
    )
  ) {
    return { kind: 'INVALID', reason: 'AMBIGUOUS_ROOT', detail };
  }

  const known = lookupOnix3(root.namespaceURI);
  if (known) {
    const otherFlavour: OnixFlavour =
      known.flavour === 'reference' ? 'short' : 'reference';
    if (root.localName === ONIX_ROOT_NAME[otherFlavour]) {
      return { kind: 'INVALID', reason: 'MIXED_FLAVOUR', detail };
    }
    if (root.localName !== ONIX_ROOT_NAME[known.flavour]) {
      return { kind: 'INVALID', reason: 'ROOT_NOT_ONIX_MESSAGE', detail };
    }
    if (release === null) {
      return { kind: 'INVALID', reason: 'RELEASE_UNDECLARED', detail };
    }
    if (release !== known.release) {
      return { kind: 'INVALID', reason: 'RELEASE_NAMESPACE_CONFLICT', detail };
    }
    return {
      kind: 'RESOLVED',
      source: {
        release: known.release,
        schemaRelease: SCHEMA_RELEASE[known.release],
        flavour: known.flavour,
        namespaceURI: ONIX_NAMESPACES[known.release][known.flavour],
      },
    };
  }

  if (root.namespaceURI && EDITEUR_ONIX_NAMESPACE.test(root.namespaceURI)) {
    return { kind: 'UNSUPPORTED', reason: 'UNSUPPORTED_ONIX_RELEASE', detail };
  }

  if (
    root.namespaceURI === null &&
    (root.localName === ONIX_ROOT_NAME.reference ||
      root.localName === ONIX_ROOT_NAME.short)
  ) {
    if (release === '3.0' || release === '3.1') {
      return { kind: 'INVALID', reason: 'NAMESPACE_UNDECLARED', detail };
    }
    return { kind: 'UNSUPPORTED', reason: 'UNSUPPORTED_ONIX_RELEASE', detail };
  }

  return { kind: 'UNSUPPORTED', reason: 'NOT_ONIX_FOR_BOOKS', detail };
}
