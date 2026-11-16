import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { THEMA_CODES } from './thema-codes';
import { THEMA_ACCEPTED_VERSIONS, THEMA_DEFAULT_VERSION, THEMA_V1_7_ADDED_CODES } from './thema-versions';

/**
 * The committed oracles of thoth-app#313: `THEMA_CODES` is EDItEUR's Thema v1.7 English subject list, and
 * `THEMA_V1_7_ADDED_CODES` the codes v1.7 added to v1.6. Each hash is the SHA-256 of UTF-8 lines, each followed by
 * `\n`, sorted by code point unless the oracle says otherwise.
 */

const sha256OfLines = (lines: readonly string[]) =>
  createHash('sha256')
    .update(lines.map((line) => `${line}\n`).join(''), 'utf8')
    .digest('hex');

const byCodePoint = (values: readonly string[]) => [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

const codes = Object.keys(THEMA_CODES);
const headings: Readonly<Record<string, string>> = THEMA_CODES;

describe('Thema v1.7 vocabulary (thoth-app#313)', () => {
  it('has 9,448 codes', () => {
    expect(codes).toHaveLength(9448);
  });

  it('holds exactly the v1.7 codes', () => {
    expect(sha256OfLines(byCodePoint(codes))).toBe('e4417f57f44fd01bc47d03f9cc2d6236c83304e84ccd66376cbb5ebae8702c6e');
  });

  it('holds exactly the v1.7 English headings', () => {
    expect(sha256OfLines(byCodePoint(codes.map((code) => `${code}\t${headings[code]}`)))).toBe(
      'c50263c4e301548ab50af9c5f77dd7439eb9924557e3f02ea28d35f5b2855043',
    );
  });

  it('keeps its codes in their order', () => {
    expect(sha256OfLines(codes)).toBe('14c33c03bdfc3fffd87b84e215ec048308bad518fcb5e8d12c4ddffc3bf51db9');
  });

  it('names the 261 codes v1.7 added, every one of them a code of THEMA_CODES', () => {
    const added = [...THEMA_V1_7_ADDED_CODES];

    expect(added).toHaveLength(261);
    expect(added.filter((code) => !(code in THEMA_CODES))).toEqual([]);
    expect(sha256OfLines(byCodePoint(added))).toBe('ce66c6994fdc62288b9bc4f39fe8872ee932e34cae491b175bebf274e386493f');
  });

  it('leaves exactly the v1.6 codes once the v1.7 additions are taken away', () => {
    expect(sha256OfLines(byCodePoint(codes.filter((code) => !THEMA_V1_7_ADDED_CODES.has(code))))).toBe(
      '0f2d95b2323eaa71f8db43d7ee6036992f486775cc4230f901ed81065ceb2340',
    );
  });

  it('defaults to v1.7 and accepts only the declared versions 1.6 and 1.7', () => {
    expect(THEMA_DEFAULT_VERSION).toBe('1.7');
    expect(THEMA_ACCEPTED_VERSIONS).toEqual(['1.6', '1.7']);
  });
});
