import type { MediaItem } from '../../lib/types';
import { uid } from '../../lib/util';
import type { MediaProvider, StoredObject, UploadInput } from './MediaProvider';

const DB_NAME = 'nomnoms-media';
const STORE = 'files';

interface Row {
  key: string;
  blob: Blob;
  thumb?: Blob;
}

/**
 * Stores photos/videos the parent adds as Blobs in IndexedDB on this device —
 * never in localStorage and never in app state. Object URLs are created on
 * demand and cached for the session.
 *
 * If IndexedDB is unavailable (some private modes / sandboxed embeds) it keeps
 * blobs in memory for the session so capture still works.
 */
export class BrowserMediaProvider implements MediaProvider {
  readonly id = 'browser' as const;
  readonly label = 'This device';
  private dbp: Promise<IDBDatabase | null>;
  private mem = new Map<string, Row>();
  private urls = new Map<string, string>();
  persistent = true;

  constructor() {
    this.dbp = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'key' });
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          this.persistent = false;
          resolve(null);
        };
        req.onblocked = () => resolve(null);
      } catch {
        this.persistent = false;
        resolve(null);
      }
    });
  }

  private async tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
    const db = await this.dbp;
    if (!db) return undefined;
    return new Promise((resolve, reject) => {
      try {
        const t = db.transaction(STORE, mode);
        const r = fn(t.objectStore(STORE));
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  async upload({ file, thumbnail }: UploadInput): Promise<StoredObject> {
    const key = uid('blob');
    const row: Row = { key, blob: file, thumb: thumbnail };
    try {
      const db = await this.dbp;
      if (db) await this.tx('readwrite', (s) => s.put(row));
      else this.mem.set(key, row);
    } catch (e) {
      console.warn('[nomnoms] IndexedDB write failed, keeping in memory', e);
      this.persistent = false;
      this.mem.set(key, row);
    }
    // warm URL cache so the new memory renders instantly
    this.urls.set(key, URL.createObjectURL(file));
    if (thumbnail) this.urls.set(key + ':thumb', URL.createObjectURL(thumbnail));
    return { storageKey: key };
  }

  private async row(key: string): Promise<Row | undefined> {
    if (this.mem.has(key)) return this.mem.get(key);
    try {
      return (await this.tx<Row>('readonly', (s) => s.get(key) as IDBRequest<Row>)) ?? undefined;
    } catch {
      return undefined;
    }
  }

  async get(item: MediaItem) {
    const k = item.storageKey;
    const cached = this.urls.get(k);
    if (cached) return cached;
    const r = await this.row(k);
    if (!r) throw new Error('Media not found on this device');
    const url = URL.createObjectURL(r.blob);
    this.urls.set(k, url);
    return url;
  }

  async getThumbnail(item: MediaItem) {
    const k = item.storageKey + ':thumb';
    const cached = this.urls.get(k);
    if (cached) return cached;
    const r = await this.row(item.storageKey);
    if (!r) throw new Error('Media not found on this device');
    if (!r.thumb) return this.get(item);
    const url = URL.createObjectURL(r.thumb);
    this.urls.set(k, url);
    return url;
  }

  async delete(item: MediaItem) {
    this.mem.delete(item.storageKey);
    for (const k of [item.storageKey, item.storageKey + ':thumb']) {
      const u = this.urls.get(k);
      if (u) URL.revokeObjectURL(u);
      this.urls.delete(k);
    }
    try {
      await this.tx('readwrite', (s) => s.delete(item.storageKey));
    } catch {
      /* ignore */
    }
  }

  async list() {
    try {
      const keys = (await this.tx<IDBValidKey[]>('readonly', (s) => s.getAllKeys())) ?? [];
      return [...keys.map(String), ...this.mem.keys()];
    } catch {
      return [...this.mem.keys()];
    }
  }

  async clear() {
    this.mem.clear();
    try {
      await this.tx('readwrite', (s) => s.clear());
    } catch {
      /* ignore */
    }
  }
}
