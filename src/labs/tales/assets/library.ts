import type { StoredAsset } from './meta';

/**
 * The parent's library of illustrated places and things, kept only in this
 * browser. It lives in its own database, separate from the baby book's data,
 * and is only written when the parent confirms "Save to my library".
 */

const DB = 'nomnoms-labs';
const STORE = 'assets';

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    if (typeof indexedDB === 'undefined') { rej(new Error('This browser can’t save items. They’ll stay for this visit only.')); return; }
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'meta.id' }); };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error ?? new Error('Couldn’t open the library'));
  });
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then((db) => new Promise<T>((res, rej) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => { db.close(); res(req.result); };
    tx.onerror = () => { db.close(); rej(tx.error ?? new Error('The library didn’t save')); };
  }));
}

export async function listAssets(): Promise<StoredAsset[]> {
  try {
    const all = await run<StoredAsset[]>('readonly', (s) => s.getAll() as IDBRequest<StoredAsset[]>);
    return all.sort((a, b) => b.meta.createdAt.localeCompare(a.meta.createdAt));
  } catch {
    return [];
  }
}

export const saveAsset = (a: StoredAsset) => run('readwrite', (s) => s.put(a));
export const deleteAsset = (id: string) => run('readwrite', (s) => s.delete(id));
