// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  resolveReleaseFlavour,
  type RootTag,
  type RootTagAttribute,
} from './release';

const REF30 = 'http://ns.editeur.org/onix/3.0/reference';
const SHORT30 = 'http://ns.editeur.org/onix/3.0/short';
const REF31 = 'http://ns.editeur.org/onix/3.1/reference';
const SHORT31 = 'http://ns.editeur.org/onix/3.1/short';

function root(
  localName: string,
  namespaceURI: string | null,
  release: string | null,
  extra: Partial<RootTag> = {},
): RootTag {
  const attributes: RootTagAttribute[] = [];
  if (release !== null) attributes.push({ name: 'release', value: release });
  if (namespaceURI !== null)
    attributes.push({ name: 'xmlns', value: namespaceURI });
  return {
    qualifiedName: localName,
    localName,
    prefix: null,
    namespaceURI,
    attributes,
    duplicateAttributeNames: [],
    ...extra,
  };
}

describe('resolveReleaseFlavour', () => {
  it.each([
    ['ONIXMessage', REF30, '3.0', '3.0', '3.0.8', 'reference'],
    ['ONIXmessage', SHORT30, '3.0', '3.0', '3.0.8', 'short'],
    ['ONIXMessage', REF31, '3.1', '3.1', '3.1.3', 'reference'],
    ['ONIXmessage', SHORT31, '3.1', '3.1', '3.1.3', 'short'],
  ])(
    'resolves %s in %s with release %s',
    (localName, ns, release, onixRelease, schemaRelease, flavour) => {
      expect(resolveReleaseFlavour(root(localName, ns, release))).toEqual({
        kind: 'RESOLVED',
        source: {
          release: onixRelease,
          schemaRelease,
          flavour,
          namespaceURI: ns,
        },
      });
    },
  );

  it('resolves a namespace-prefixed root', () => {
    const result = resolveReleaseFlavour({
      qualifiedName: 'onix:ONIXMessage',
      localName: 'ONIXMessage',
      prefix: 'onix',
      namespaceURI: REF30,
      attributes: [
        { name: 'xmlns:onix', value: REF30 },
        { name: 'release', value: '3.0' },
      ],
      duplicateAttributeNames: [],
    });
    expect(result.kind).toBe('RESOLVED');
  });

  it.each([
    ['ONIXmessage', REF30, '3.0'],
    ['ONIXMessage', SHORT31, '3.1'],
  ])('rejects mixed flavour: root %s in %s', (localName, ns, release) => {
    expect(resolveReleaseFlavour(root(localName, ns, release))).toMatchObject({
      kind: 'INVALID',
      reason: 'MIXED_FLAVOUR',
    });
  });

  it('rejects a missing release attribute on a 3.x root', () => {
    expect(resolveReleaseFlavour(root('ONIXMessage', REF31, null))).toMatchObject(
      { kind: 'INVALID', reason: 'RELEASE_UNDECLARED' },
    );
  });

  it('rejects a release that contradicts the namespace', () => {
    expect(
      resolveReleaseFlavour(root('ONIXMessage', REF30, '3.1')),
    ).toMatchObject({ kind: 'INVALID', reason: 'RELEASE_NAMESPACE_CONFLICT' });
  });

  it('rejects a 3.x release declared without the ONIX namespace', () => {
    expect(resolveReleaseFlavour(root('ONIXMessage', null, '3.0'))).toMatchObject(
      { kind: 'INVALID', reason: 'NAMESPACE_UNDECLARED' },
    );
  });

  it('rejects an ONIX 3 element other than the message as the root', () => {
    expect(resolveReleaseFlavour(root('Product', REF30, '3.0'))).toMatchObject({
      kind: 'INVALID',
      reason: 'ROOT_NOT_ONIX_MESSAGE',
    });
  });

  it('rejects an ambiguous root with duplicated release attributes', () => {
    expect(
      resolveReleaseFlavour(
        root('ONIXMessage', REF30, '3.0', {
          duplicateAttributeNames: ['release'],
        }),
      ),
    ).toMatchObject({ kind: 'INVALID', reason: 'AMBIGUOUS_ROOT' });
  });

  it.each([
    ['ONIX 2.1 without namespace', root('ONIXMessage', null, '2.1')],
    ['ONIX 2.1 without release', root('ONIXmessage', null, null)],
    [
      'ONIX 2.1 namespace',
      root('ONIXMessage', 'http://www.editeur.org/onix/2.1/reference', null),
    ],
    [
      'a future ONIX release',
      root('ONIXMessage', 'http://ns.editeur.org/onix/3.2/reference', '3.2'),
    ],
    ['a non-ONIX document', root('html', 'http://www.w3.org/1999/xhtml', null)],
    ['a no-namespace non-ONIX document', root('catalogue', null, null)],
  ])('stops %s as unsupported', (_label, tag) => {
    expect(resolveReleaseFlavour(tag)).toMatchObject({ kind: 'UNSUPPORTED' });
  });
});
