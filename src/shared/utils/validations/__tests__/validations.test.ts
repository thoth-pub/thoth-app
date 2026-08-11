import { describe, expect, it } from 'vitest';

import { ERRORS } from '@/src/shared/constants';

import {
  canonicaliseDoi,
  doiValidation,
  getFileValidation,
  getRequiredStringValidation,
  issnValidation,
  rorValidation,
} from '../index';

describe('doiValidation', () => {
  it('accepts a valid DOI', () => {
    const result = doiValidation.safeParse('https://doi.org/10.1234/abc.def');
    expect(result.success).toBe(true);
  });

  it('accepts a DOI with path characters', () => {
    const result = doiValidation.safeParse('https://doi.org/10.1234/abc.def-ghi_jkl;123');
    expect(result.success).toBe(true);
  });

  it('rejects a DOI without the proper prefix', () => {
    const result = doiValidation.safeParse('https://example.org/10.1234/abc');
    expect(result.success).toBe(false);
  });

  it('rejects a DOI with invalid structure', () => {
    const result = doiValidation.safeParse('https://doi.org/not-a-doi');
    expect(result.success).toBe(false);
  });

  it('accepts empty/undefined values', () => {
    expect(doiValidation.safeParse(undefined).success).toBe(true);
    expect(doiValidation.safeParse('').success).toBe(true);
  });
});

/**
 * The accepted input forms come from `Doi::from_str` in `thoth-api/src/model/mod.rs`, which
 * matches `[[http[s]://][www.][dx.]doi.org/]10.XXXX/XXX` case-insensitively and stores the
 * identifier behind the canonical resolver. Anything the API rejects must not survive here either.
 */
describe('canonicaliseDoi', () => {
  it('canonicalises a bare DOI', () => {
    expect(canonicaliseDoi('10.1234/abc.def')).toBe('https://doi.org/10.1234/abc.def');
  });

  it('leaves a canonical DOI alone', () => {
    expect(canonicaliseDoi('https://doi.org/10.1234/abc.def')).toBe('https://doi.org/10.1234/abc.def');
  });

  it('canonicalises the other resolver forms the API accepts', () => {
    expect(canonicaliseDoi('http://doi.org/10.1234/abc')).toBe('https://doi.org/10.1234/abc');
    expect(canonicaliseDoi('https://dx.doi.org/10.1234/abc')).toBe('https://doi.org/10.1234/abc');
    expect(canonicaliseDoi('http://dx.doi.org/10.1234/abc')).toBe('https://doi.org/10.1234/abc');
    expect(canonicaliseDoi('www.doi.org/10.1234/abc')).toBe('https://doi.org/10.1234/abc');
    expect(canonicaliseDoi('doi.org/10.1234/abc')).toBe('https://doi.org/10.1234/abc');
    // The API matches the resolver case-insensitively.
    expect(canonicaliseDoi('HTTPS://DOI.ORG/10.1234/abc')).toBe('https://doi.org/10.1234/abc');
  });

  it('tolerates surrounding whitespace', () => {
    expect(canonicaliseDoi('  10.1234/abc  ')).toBe('https://doi.org/10.1234/abc');
  });

  it('returns nothing for a value that is not a DOI', () => {
    // The bug this exists to prevent: a prefix concatenated onto anything at all.
    expect(canonicaliseDoi('not-a-doi')).toBe('');
    expect(canonicaliseDoi('PROD-1234')).toBe('');
    expect(canonicaliseDoi('9781641891783')).toBe('');
    // A registrant code that is too short for the API's `10.\d{4,9}`.
    expect(canonicaliseDoi('10.12/abc')).toBe('');
    // A directory indicator with no suffix.
    expect(canonicaliseDoi('10.1234/')).toBe('');
    expect(canonicaliseDoi('https://example.org/10.1234/abc')).toBe('');
  });

  it('returns nothing for an empty value', () => {
    expect(canonicaliseDoi('')).toBe('');
    expect(canonicaliseDoi('   ')).toBe('');
  });

  it('only ever returns something the app already considers a valid DOI', () => {
    ['10.1234/abc', 'https://dx.doi.org/10.1234/abc-def_ghi;1', 'doi.org/10.123456789/x'].forEach((input) => {
      expect(doiValidation.safeParse(canonicaliseDoi(input)).success).toBe(true);
    });
  });
});

describe('issnValidation', () => {
  it('accepts a valid ISSN', () => {
    const result = issnValidation.safeParse('1234-5678');
    expect(result.success).toBe(true);
  });

  it('accepts ISSN with X check digit', () => {
    const result = issnValidation.safeParse('1234-567X');
    expect(result.success).toBe(true);
  });

  it('rejects ISSN without hyphen', () => {
    const result = issnValidation.safeParse('12345678');
    expect(result.success).toBe(false);
  });

  it('rejects ISSN with wrong length', () => {
    const result = issnValidation.safeParse('1234-56789');
    expect(result.success).toBe(false);
  });

  it('rejects ISSN with letters other than X', () => {
    const result = issnValidation.safeParse('1234-56AB');
    expect(result.success).toBe(false);
  });

  it('accepts empty/undefined values', () => {
    expect(issnValidation.safeParse(undefined).success).toBe(true);
    expect(issnValidation.safeParse('').success).toBe(true);
  });
});

describe('rorValidation', () => {
  it('accepts a valid ROR ID', () => {
    const result = rorValidation.safeParse('https://ror.org/012345678');
    expect(result.success).toBe(true);
  });

  it('rejects a ROR without proper structure', () => {
    const result = rorValidation.safeParse('https://ror.org/invalid');
    expect(result.success).toBe(false);
  });

  it('rejects a ROR without the prefix', () => {
    const result = rorValidation.safeParse('012345678');
    expect(result.success).toBe(false);
  });
});

describe('getRequiredStringValidation', () => {
  it('rejects strings exceeding maxLength', () => {
    const validation = getRequiredStringValidation(undefined, 5);
    expect(validation.safeParse('toolong').success).toBe(false);
    expect(validation.safeParse('short').success).toBe(true);
  });

  it('works without maxLength', () => {
    const validation = getRequiredStringValidation();
    expect(validation.safeParse('any string').success).toBe(true);
  });
});

describe('getFileValidation', () => {
  const makeFile = (name: string, type: string, size = 50) => new File([new Uint8Array(size)], name, { type });
  const { FILE_FORMAT_INVALID, MAX_FILE_SIZE_EXCEEDED, MIN_FILE_SIZE_NOT_MET } = ERRORS;
  const validation = getFileValidation(
    10,
    100,
    ['application/pdf'],
    FILE_FORMAT_INVALID,
    MAX_FILE_SIZE_EXCEEDED,
    MIN_FILE_SIZE_NOT_MET,
    ['.pdf'],
  );
  const validate = (file: File, schema = validation) => schema.safeParse([file] as unknown as FileList);

  it('accepts a supported non-empty MIME type regardless of the filename', () => {
    expect(validate(makeFile('renamed.dat', 'application/pdf')).success).toBe(true);
  });

  it('rejects a known unsupported MIME type even when the extension looks supported', () => {
    expect(validate(makeFile('book.pdf', 'application/x-msdownload')).success).toBe(false);
  });

  it('falls back to the extension allowlist only when the MIME type is empty', () => {
    expect(validate(makeFile('book.pdf', '')).success).toBe(true);
    expect(validate(makeFile('malware.exe', '')).success).toBe(false);
  });

  it('matches extensions case-insensitively', () => {
    expect(validate(makeFile('BOOK.PDF', '')).success).toBe(true);
  });

  it('keeps rejecting empty MIME types for callers without an extension allowlist', () => {
    const mimeOnly = getFileValidation(
      10,
      100,
      ['application/pdf'],
      FILE_FORMAT_INVALID,
      MAX_FILE_SIZE_EXCEEDED,
      MIN_FILE_SIZE_NOT_MET,
    );
    expect(validate(makeFile('book.pdf', ''), mimeOnly).success).toBe(false);
  });

  it('still enforces size bounds for empty-MIME files', () => {
    expect(validate(makeFile('book.pdf', '', 5)).success).toBe(false);
    expect(validate(makeFile('book.pdf', '', 500)).success).toBe(false);
  });
});
