import { describe, expect, it } from 'vitest';

import { getAuthorizationHeaders } from './getAuthorizationHeaders';

describe('getAuthorizationHeaders', () => {
  it('should return Authorization header with Bearer token', () => {
    const result = getAuthorizationHeaders('my-token');

    expect(result).toEqual({
      Authorization: 'Bearer my-token',
      'Content-Type': 'application/json',
    });
  });

  it('should handle empty token', () => {
    const result = getAuthorizationHeaders('');

    expect(result.Authorization).toBe('Bearer ');
  });
});
