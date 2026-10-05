/**
 * Tiny key/value adapter over localStorage for *metadata only*.
 * Falls back to memory when storage is unavailable (private mode, sandboxed
 * iframes) so the app still runs — it just won't persist.
 */
export interface KeyValueStore {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
  keys(prefix: string): string[];
  readonly persistent: boolean;
}

class LocalStorageKV implements KeyValueStore {
  private mem = new Map<string, string>();
  readonly persistent: boolean;

  constructor() {
    let ok = false;
    try {
      const k = '__nn_probe__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      ok = true;
    } catch {
      ok = false;
    }
    this.persistent = ok;
  }

  get<T>(key: string): T | undefined {
    try {
      const raw = this.persistent ? window.localStorage.getItem(key) : this.mem.get(key) ?? null;
      return raw == null ? undefined : (JSON.parse(raw) as T);
    } catch {
      return undefined;
    }
  }

  set<T>(key: string, value: T) {
    const raw = JSON.stringify(value);
    if (this.persistent) {
      try {
        window.localStorage.setItem(key, raw);
        return;
      } catch (e) {
        console.warn('[nomnoms] localStorage write failed, keeping in memory', e);
      }
    }
    this.mem.set(key, raw);
  }

  remove(key: string) {
    try {
      if (this.persistent) window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    this.mem.delete(key);
  }

  keys(prefix: string) {
    const out = new Set<string>();
    try {
      if (this.persistent) {
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith(prefix)) out.add(k);
        }
      }
    } catch {
      /* ignore */
    }
    for (const k of this.mem.keys()) if (k.startsWith(prefix)) out.add(k);
    return [...out];
  }
}

export const kv: KeyValueStore = new LocalStorageKV();
