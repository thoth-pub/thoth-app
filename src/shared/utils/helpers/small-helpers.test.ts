import { describe, expect, it } from 'vitest';

import { isDefaultId } from './isDefaultId';
import { isDragAndDropDisabled } from './isDragAndDropDisabled';
import { isUrl } from './isUrl';
import { isValidUUID } from './isValidUUID';
import { normalizedOrcidId } from './normalizedOrcidId';
import { getProtocolPrefix, removePrefix } from './protocolPrefix';
import { truncateString } from './truncateString';
import { prettifyUrlPreview } from './urlPreview';

describe('normalizedOrcidId', () => {
  it('returns null for empty string', () => {
    expect(normalizedOrcidId('')).toBeNull();
  });

  it('returns the id unchanged if it already has the prefix', () => {
    expect(normalizedOrcidId('https://orcid.org/0000-0001-2345-6789')).toBe(
      'https://orcid.org/0000-0001-2345-6789',
    );
  });

  it('prepends the prefix if missing', () => {
    expect(normalizedOrcidId('0000-0001-2345-6789')).toBe('https://orcid.org/0000-0001-2345-6789');
  });
});

describe('getProtocolPrefix', () => {
  it('returns https for https URLs', () => {
    expect(getProtocolPrefix('https://example.com')).toBe('https://');
  });

  it('returns http for http URLs', () => {
    expect(getProtocolPrefix('http://example.com')).toBe('http://');
  });
});

describe('removePrefix', () => {
  it('removes DOI prefix', () => {
    expect(removePrefix('https://doi.org/10.1234/abc')).toBe('10.1234/abc');
  });

  it('removes ROR prefix', () => {
    expect(removePrefix('https://ror.org/123abc')).toBe('123abc');
  });

  it('removes ORCID prefix', () => {
    expect(removePrefix('https://orcid.org/0000-0001-2345-6789')).toBe('0000-0001-2345-6789');
  });

  it('removes protocol prefixes', () => {
    expect(removePrefix('https://example.com')).toBe('example.com');
  });
});

describe('truncateString', () => {
  it('returns the string unchanged if shorter than max length', () => {
    expect(truncateString('short', 10)).toBe('short');
  });

  it('truncates at length minus symbol length and appends symbol', () => {
    expect(truncateString('longer than ten', 10)).toBe('longer ...');
  });

  it('uses custom truncation symbol', () => {
    expect(truncateString('longer than ten', 10, '!!')).toBe('longer t!!');
  });

  it('returns the string unchanged when length equals or exceeds string length', () => {
    expect(truncateString('exact', 5)).toBe('exact');
  });
});

describe('isUrl', () => {
  it('returns true for http URLs', () => {
    expect(isUrl('http://example.com')).toBe(true);
  });

  it('returns true for https URLs', () => {
    expect(isUrl('https://example.com')).toBe(true);
  });

  it('returns false for non-http strings', () => {
    expect(isUrl('ftp://example.com')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isUrl('')).toBe(false);
  });
});

describe('prettifyUrlPreview', () => {
  it('removes the first // pair from a URL', () => {
    expect(prettifyUrlPreview('https://example.com')).toBe('https:example.com');
  });

  it('returns undefined when no URL provided', () => {
    expect(prettifyUrlPreview()).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(prettifyUrlPreview(undefined)).toBeUndefined();
  });
});

describe('isValidUUID', () => {
  it('returns true for a valid UUID', () => {
    expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
  });

  it('returns false for an invalid string', () => {
    expect(isValidUUID('not-a-uuid')).toBe(false);
  });
});

describe('isDragAndDropDisabled', () => {
  it('returns true when count is less than 2', () => {
    expect(isDragAndDropDisabled(0)).toBe(true);
    expect(isDragAndDropDisabled(1)).toBe(true);
  });

  it('returns false when count is 2 or more', () => {
    expect(isDragAndDropDisabled(2)).toBe(false);
    expect(isDragAndDropDisabled(5)).toBe(false);
  });
});

describe('isDefaultId', () => {
  it('returns true when id exactly matches the default', () => {
    expect(isDefaultId('0000-0000-0000-0000')).toBe(true);
  });

  it('returns false for a real id', () => {
    expect(isDefaultId('123e4567-e89b-12d3-a456-426614174000')).toBe(false);
  });
});
