import { describe, expect, it } from 'vitest';

import { emptyToNull } from './index';

describe('emptyToNull', () => {
  it('returns value for non-empty string', () => {
    expect(emptyToNull('hello')).toBe('hello');
  });

  it('returns null for empty string', () => {
    expect(emptyToNull('')).toBeNull();
  });

  it('returns null for null', () => {
    expect(emptyToNull(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(emptyToNull(undefined)).toBeNull();
  });

  it('returns null for whitespace-only string', () => {
    expect(emptyToNull('   ')).toBeNull();
  });

  it('returns trimmed value for string with leading/trailing whitespace', () => {
    expect(emptyToNull('  hello  ')).toBe('hello');
  });
});
