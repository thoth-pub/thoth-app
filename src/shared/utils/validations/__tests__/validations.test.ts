import { describe, it, expect } from 'vitest';

import { doiValidation, issnValidation, rorValidation, getRequiredStringValidation } from '../index';

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
