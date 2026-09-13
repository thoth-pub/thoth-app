// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  loadVerifiedResource,
  ONIX_VALIDATION_RESOURCES,
  OnixResourceIntegrityError,
  resourcesFor,
  sha256Hex,
} from './resources';

const PUBLIC_DIR = join(process.cwd(), 'public', 'onix-validation');

// The exact SHA-256 pins recorded by the #190 specification. Deliberately
// repeated here rather than imported, so the manifest is checked against the
// authorization and not against itself.
const APPROVED_PINS: Record<string, string> = {
  'ONIX_BookProduct_3.0_reference.xsd': '5ac4e162cbcc4a549c62fdfa3db47bd3ae0b13e3da26a9f92ec743debf10962d',
  'ONIX_BookProduct_3.0_short.xsd': '8460dfa70d55675f4388d799b007eb37f4ba0a43d2faed28aea6c154eb4789e6',
  'ONIX_BookProduct_3.0_reference_strict.xsd': '2bd82f18a83000b721afdf8f2c3556e0fc2b42c8255c9b619d24b979c220b9cc',
  'ONIX_BookProduct_3.1_reference.xsd': 'd87cdb4aa2ba62a0c9192dcde363e3819720717a8086dfd7724d9e3a200b0d64',
  'ONIX_BookProduct_3.1_short.xsd': '9a97457c186699e27f5ee502379f5f565961f5b6106aafe5d842be7144158a07',
  'ONIX_BookProduct_3.1_reference_strict.xsd': '76f5cfa69c1e3e789df091cfd7f361eeda8786969144da2415315ead8aaf4c3a',
  'ONIX_BookProduct_CodeLists.xsd': 'ba948e26c1bf99ef2d633e17ca7c4767ec629571048feb2ea3ba6428745a3b58',
  'ONIX_XHTML_Subset.xsd': '5192454649d7b32a2b3dde20dcb63f6fc888b9b9e6227d56e981c283c73d1f1c',
};

const readPublic = (fileName: string) => new Uint8Array(readFileSync(join(PUBLIC_DIR, fileName)));

describe('pinned ONIX validation resources', () => {
  it('pins exactly the eight approved runtime files', () => {
    expect(Object.fromEntries(ONIX_VALIDATION_RESOURCES.map((r) => [r.fileName, r.sha256]))).toEqual(APPROVED_PINS);
  });

  it('ships exactly the pinned files plus the attribution notice', () => {
    expect(readdirSync(PUBLIC_DIR).sort()).toEqual([...Object.keys(APPROVED_PINS), 'NOTICE.md'].sort());
  });

  it('ships every file byte-for-byte as pinned', async () => {
    for (const resource of ONIX_VALIDATION_RESOURCES) {
      const bytes = readPublic(resource.fileName);
      expect(bytes.byteLength, resource.fileName).toBe(resource.byteLength);
      expect(await sha256Hex(bytes), resource.fileName).toBe(resource.sha256);
    }
  });

  it('keeps the official notices inside every schema file', () => {
    for (const resource of ONIX_VALIDATION_RESOURCES) {
      const head = new TextDecoder().decode(readPublic(resource.fileName).subarray(0, 8192));
      expect(head, resource.fileName).toMatch(/EDItEUR/);
    }
  });

  it('selects the ordinary, strict and shared files for each release and flavour', () => {
    expect(resourcesFor('3.0', 'reference')).toEqual({
      sourceOrdinary: 'ONIX_BookProduct_3.0_reference.xsd',
      referenceOrdinary: 'ONIX_BookProduct_3.0_reference.xsd',
      shortOrdinary: null,
      referenceStrict: 'ONIX_BookProduct_3.0_reference_strict.xsd',
      shared: ['ONIX_BookProduct_CodeLists.xsd', 'ONIX_XHTML_Subset.xsd'],
    });
    expect(resourcesFor('3.1', 'short')).toEqual({
      sourceOrdinary: 'ONIX_BookProduct_3.1_short.xsd',
      referenceOrdinary: 'ONIX_BookProduct_3.1_reference.xsd',
      shortOrdinary: 'ONIX_BookProduct_3.1_short.xsd',
      referenceStrict: 'ONIX_BookProduct_3.1_reference_strict.xsd',
      shared: ['ONIX_BookProduct_CodeLists.xsd', 'ONIX_XHTML_Subset.xsd'],
    });
  });
});

describe('loadVerifiedResource', () => {
  const name = 'ONIX_XHTML_Subset.xsd';

  it('returns the bytes when they match the pin', async () => {
    const bytes = readPublic(name);
    await expect(loadVerifiedResource(async () => bytes, name)).resolves.toBe(bytes);
  });

  it('fails closed on a single altered byte', async () => {
    const bytes = readPublic(name).slice();
    bytes[100] ^= 1;
    await expect(loadVerifiedResource(async () => bytes, name)).rejects.toBeInstanceOf(OnixResourceIntegrityError);
  });

  it('fails closed on truncated bytes', async () => {
    const bytes = readPublic(name).subarray(0, 1000);
    await expect(loadVerifiedResource(async () => bytes, name)).rejects.toBeInstanceOf(OnixResourceIntegrityError);
  });

  it('refuses a file name outside the manifest without calling the loader', async () => {
    let called = false;
    await expect(
      loadVerifiedResource(async () => {
        called = true;
        return new Uint8Array();
      }, 'ONIX_BookProduct_3.0_short_strict.xsd'),
    ).rejects.toBeInstanceOf(OnixResourceIntegrityError);
    expect(called).toBe(false);
  });
});
