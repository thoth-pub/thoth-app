import { appConfig } from '../config';

export class PersistentStorage {
  private keyPrefix = appConfig.persistentStorage.prefix;

  private getKey(key: string): string {
    return `${this.keyPrefix}_${key}`;
  }

  async get<T>(key: string, { raw = false } = {}): Promise<T | null | string> {
    if (!key || typeof window === 'undefined' || !localStorage) return null;

    try {
      const localStorageValue = localStorage.getItem(this.getKey(key));

      if (localStorageValue === null || raw) {
        return localStorageValue as T;
      }

      try {
        return JSON.parse(localStorageValue);
      } catch {
        return localStorageValue as T;
      }
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  async set(key: string, newVal: unknown): Promise<void> {
    if (typeof newVal === 'undefined' || typeof window === 'undefined' || !localStorage) return;

    try {
      const value = typeof newVal === 'string' ? newVal : JSON.stringify(newVal);

      localStorage.setItem(this.getKey(key), value);
    } catch (err) {
      console.error(err);
    }
  }
}
