import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PersistentStorage } from './PersistentStorage';

vi.mock('@/src/shared/config', () => ({
  appConfig: {
    persistentStorage: { prefix: 'thoth' },
  },
}));

describe('PersistentStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should set and get a string value', async () => {
    const storage = new PersistentStorage();

    await storage.set('key1', 'value1');
    const result = await storage.get<string>('key1');

    expect(result).toBe('value1');
  });

  it('should set and get a JSON value', async () => {
    const storage = new PersistentStorage();

    await storage.set('key2', { a: 1, b: [2, 3] });
    const result = await storage.get<{ a: number; b: number[] }>('key2');

    expect(result).toEqual({ a: 1, b: [2, 3] });
  });

  it('should return raw string when raw option is true', async () => {
    const storage = new PersistentStorage();

    await storage.set('key3', { nested: true });
    const result = await storage.get<string>('key3', { raw: true });

    expect(result).toBe('{"nested":true}');
  });

  it('should return null for non-existent key', async () => {
    const storage = new PersistentStorage();
    const result = await storage.get('nonexistent');

    expect(result).toBeNull();
  });

  it('should prefix keys', async () => {
    const storage = new PersistentStorage();

    await storage.set('test', 'val');
    const rawValue = localStorage.getItem('thoth_test');

    expect(rawValue).toBe('val');
  });

  it('should handle undefined values gracefully', async () => {
    const storage = new PersistentStorage();

    await storage.set('undef', undefined);
    const result = await storage.get('undef');

    expect(result).toBeNull();
  });

  it('should stringify objects', async () => {
    const storage = new PersistentStorage();

    await storage.set('obj', { foo: 'bar' });
    const rawValue = localStorage.getItem('thoth_obj');

    expect(rawValue).toBe('{"foo":"bar"}');
  });

  it('should return null when key is empty', async () => {
    const storage = new PersistentStorage();
    const result = await storage.get('');

    expect(result).toBeNull();
  });
});
