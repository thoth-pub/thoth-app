import { parse } from '@5stones/onix';
import { describe, expect, it } from 'vitest';

import type { ExtendedONIXMessageRoot } from './interfaces';
import {
  isOnixCodelistValue,
  ONIX_CODELIST_ISSUE,
  ONIX_SPECIFICATIONS,
  ONIX_SUPPORTED_RELEASES,
  releaseDiagnostic,
  resolveOnixRelease,
} from './onixContract';

const message = (attributes: string, body = '<Product><RecordReference>R</RecordReference></Product>') =>
  parse(`<?xml version="1.0" encoding="utf-8"?><ONIXMessage ${attributes}>${body}</ONIXMessage>`) as ExtendedONIXMessageRoot;

describe('the pinned ONIX source contract', () => {
  it('supports exactly ONIX for Books 3.0 and 3.1', () => {
    expect(ONIX_SUPPORTED_RELEASES).toEqual(['3.0', '3.1']);
  });

  it('names the audited final specification family of each supported release', () => {
    expect(ONIX_SPECIFICATIONS).toEqual({ '3.0': '3.0.8', '3.1': '3.1.2' });
  });

  it('pins the codelists at one issue rather than following whatever EDItEUR publishes next', () => {
    expect(ONIX_CODELIST_ISSUE).toBe(74);
  });
});

describe('resolveOnixRelease', () => {
  it('recognises a supported ONIX 3.0 message', () => {
    const resolution = resolveOnixRelease(
      message('release="3.0" xmlns="http://ns.editeur.org/onix/3.0/reference"').ONIXMessage,
    );

    expect(resolution).toEqual({
      kind: 'supported',
      release: '3.0',
      specification: '3.0.8',
      namespace: 'http://ns.editeur.org/onix/3.0/reference',
    });
  });

  it('recognises a supported ONIX 3.1 message', () => {
    const resolution = resolveOnixRelease(
      message('release="3.1" xmlns="http://ns.editeur.org/onix/3.1/reference"').ONIXMessage,
    );

    expect(resolution).toMatchObject({ kind: 'supported', release: '3.1', specification: '3.1.2' });
  });

  it('recognises a supported release declared with no namespace at all', () => {
    expect(resolveOnixRelease(message('release="3.0"').ONIXMessage)).toEqual({
      kind: 'supported',
      release: '3.0',
      specification: '3.0.8',
    });
  });

  it('rejects ONIX 2.1, which bulk ingest does not support', () => {
    expect(resolveOnixRelease(message('release="2.1"').ONIXMessage)).toEqual({ kind: 'unsupported', release: '2.1' });
  });

  it('rejects any other release deterministically rather than guessing at it', () => {
    expect(resolveOnixRelease(message('release="3.2"').ONIXMessage)).toEqual({ kind: 'unsupported', release: '3.2' });
    expect(resolveOnixRelease(message('release="4.0"').ONIXMessage)).toEqual({ kind: 'unsupported', release: '4.0' });
    expect(resolveOnixRelease(message('release="3"').ONIXMessage)).toEqual({ kind: 'unsupported', release: '3' });
  });

  it('reports a message that declares no release as undeclared, whatever namespace it carries', () => {
    // The namespace is recorded as evidence so the finding is actionable, but it is not read as
    // a declaration: which ONIX grammar applies is exactly what the message failed to say.
    expect(resolveOnixRelease(message('xmlns="http://ns.editeur.org/onix/3.0/reference"').ONIXMessage)).toEqual({
      kind: 'undeclared',
      namespace: 'http://ns.editeur.org/onix/3.0/reference',
    });
    expect(resolveOnixRelease(message('').ONIXMessage)).toEqual({ kind: 'undeclared' });
  });

  it('reports an empty or whitespace release as undeclared rather than as a strange release', () => {
    expect(resolveOnixRelease(message('release=""').ONIXMessage)).toEqual({ kind: 'undeclared' });
    expect(resolveOnixRelease(message('release="   "').ONIXMessage)).toEqual({ kind: 'undeclared' });
  });

  it('reports a release that its own ONIX namespace contradicts as ambiguous', () => {
    expect(
      resolveOnixRelease(message('release="3.0" xmlns="http://ns.editeur.org/onix/3.1/reference"').ONIXMessage),
    ).toEqual({
      kind: 'ambiguous',
      release: '3.0',
      namespace: 'http://ns.editeur.org/onix/3.1/reference',
    });
  });

  it('accepts the short-tag namespace of the release the message declares', () => {
    expect(
      resolveOnixRelease(message('release="3.0" xmlns="http://ns.editeur.org/onix/3.0/short"').ONIXMessage),
    ).toMatchObject({ kind: 'supported', release: '3.0' });
  });

  it('ignores a namespace that is not an EDItEUR ONIX namespace instead of reading it as evidence', () => {
    expect(resolveOnixRelease(message('release="3.0" xmlns="urn:example:private"').ONIXMessage)).toMatchObject({
      kind: 'supported',
      release: '3.0',
    });
  });

  it('reports an undeclared release even when the message is otherwise absent', () => {
    expect(resolveOnixRelease(undefined)).toEqual({ kind: 'undeclared' });
  });
});

describe('releaseDiagnostic', () => {
  it('says nothing at all about a supported release', () => {
    expect(releaseDiagnostic({ kind: 'supported', release: '3.0', specification: '3.0.8' })).toBeUndefined();
  });

  it('blocks an unsupported release against the whole file, naming the release it read', () => {
    const diagnostic = releaseDiagnostic({ kind: 'unsupported', release: '2.1' });

    expect(diagnostic).toMatchObject({
      classification: 'SOURCE_INVALID',
      severity: 'error',
      recovery: 'BLOCKING',
      code: 'onix.source.unsupported_release',
      path: 'ONIXMessage',
      sourceValue: '2.1',
      evidence: { release: '2.1' },
    });
    expect(diagnostic?.productIndex).toBeUndefined();
    expect(diagnostic?.message).toContain('2.1');
    expect(diagnostic?.message).toContain('3.0');
  });

  it('blocks an undeclared release and an ambiguous one distinguishably', () => {
    expect(releaseDiagnostic({ kind: 'undeclared' })).toMatchObject({
      code: 'onix.source.undeclared_release',
      recovery: 'BLOCKING',
    });
    expect(
      releaseDiagnostic({ kind: 'ambiguous', release: '3.0', namespace: 'http://ns.editeur.org/onix/3.1/reference' }),
    ).toMatchObject({
      code: 'onix.source.ambiguous_release',
      recovery: 'BLOCKING',
      evidence: { release: '3.0', namespace: 'http://ns.editeur.org/onix/3.1/reference' },
    });
  });
});

describe('isOnixCodelistValue', () => {
  it('accepts the values EDItEUR Issue 74 defines for the lists this parser reads', () => {
    // List 22 language role, 44 name identifier type, 153 text type, 154 content audience.
    expect(isOnixCodelistValue(22, '01')).toBe(true);
    expect(isOnixCodelistValue(22, '15')).toBe(true);
    expect(isOnixCodelistValue(44, '21')).toBe(true);
    expect(isOnixCodelistValue(153, '20')).toBe(true);
    expect(isOnixCodelistValue(154, '00')).toBe(true);
  });

  it('rejects a value the list does not define, including one only a later issue might add', () => {
    expect(isOnixCodelistValue(22, '04')).toBe(false);
    expect(isOnixCodelistValue(22, '99')).toBe(false);
    expect(isOnixCodelistValue(44, '09')).toBe(false);
    expect(isOnixCodelistValue(154, '99')).toBe(false);
  });

  it('is pinned at Issue 74 rather than at whatever the parser library happens to ship', () => {
    // `@5stones/onix` generated its enums from an earlier issue: its List 153 stops at 37 and its
    // List 44 at 44. Validating against those would call valid Issue-74 ONIX malformed.
    expect(isOnixCodelistValue(153, '38')).toBe(true);
    expect(isOnixCodelistValue(153, '39')).toBe(true);
    expect(isOnixCodelistValue(44, '45')).toBe(true);
  });

  it('accepts ISO 639-2/B language codes, which is what List 74 is', () => {
    expect(isOnixCodelistValue(74, 'ger')).toBe(true);
    expect(isOnixCodelistValue(74, 'eng')).toBe(true);
    expect(isOnixCodelistValue(74, 'mul')).toBe(true);
    expect(isOnixCodelistValue(74, 'und')).toBe(true);
    expect(isOnixCodelistValue(74, 'zxx')).toBe(true);
  });

  it('accepts the qaa-qtz range List 74 reserves for local use without enumerating it', () => {
    expect(isOnixCodelistValue(74, 'qaa')).toBe(true);
    expect(isOnixCodelistValue(74, 'qtz')).toBe(true);
    expect(isOnixCodelistValue(74, 'qsp')).toBe(true);
    expect(isOnixCodelistValue(74, 'qua')).toBe(false);
  });

  it('rejects a language code that is not in the list, however plausible it looks', () => {
    // The bibliographic code is the one List 74 uses; the terminological alternative is not in it.
    expect(isOnixCodelistValue(74, 'deu')).toBe(false);
    expect(isOnixCodelistValue(74, 'fra')).toBe(false);
    expect(isOnixCodelistValue(74, 'nld')).toBe(false);
    expect(isOnixCodelistValue(74, 'xxx')).toBe(false);
    expect(isOnixCodelistValue(74, 'en')).toBe(false);
    expect(isOnixCodelistValue(74, '')).toBe(false);
  });

  it('is case sensitive, because the codelists are', () => {
    expect(isOnixCodelistValue(74, 'GER')).toBe(false);
    expect(isOnixCodelistValue(22, ' 01')).toBe(false);
  });
});
