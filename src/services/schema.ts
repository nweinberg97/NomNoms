import { kv } from '../lib/kv';

/**
 * Versioned, additive data migrations for data already on a parent's device.
 *
 * Rules (see README "Protecting user data"):
 *  - storage keys and IndexedDB names never change
 *  - fields are only ever added; old fields keep working
 *  - before any migration runs, the account's metadata is snapshotted, and
 *    restored automatically if the migration throws
 */
export const SCHEMA_VERSION = 1;

type Migration = (accountId: string) => void;

/** Index = version migrated *to*. v1 is the original format, nothing to do. */
const MIGRATIONS: Record<number, Migration> = {};

const schemaKey = (acct: string) => `nomnoms:v1:${acct}:schema`;
const snapPrefix = (acct: string) => `nomnoms:snapshot:${acct}:`;

function accountKeys(acct: string) {
  return kv.keys(`nomnoms:v1:${acct}:`);
}

/** Keep one rolling copy of the account's metadata (not media) for recovery. */
export function snapshotAccount(acct: string, reason: string) {
  const data: Record<string, unknown> = {};
  for (const k of accountKeys(acct)) data[k] = kv.get(k);
  for (const k of kv.keys(snapPrefix(acct))) kv.remove(k);
  kv.set(`${snapPrefix(acct)}latest`, { at: new Date().toISOString(), reason, data });
}

export function restoreSnapshot(acct: string) {
  const snap = kv.get<{ data: Record<string, unknown> }>(`${snapPrefix(acct)}latest`);
  if (!snap) return false;
  for (const [k, v] of Object.entries(snap.data)) kv.set(k, v);
  return true;
}

export function ensureSchema(acct: string) {
  const current = kv.get<number>(schemaKey(acct)) ?? 1;
  if (current >= SCHEMA_VERSION) {
    if (kv.get<number>(schemaKey(acct)) == null) kv.set(schemaKey(acct), SCHEMA_VERSION);
    return;
  }
  snapshotAccount(acct, `before migrating v${current} → v${SCHEMA_VERSION}`);
  try {
    for (let v = current + 1; v <= SCHEMA_VERSION; v++) MIGRATIONS[v]?.(acct);
    kv.set(schemaKey(acct), SCHEMA_VERSION);
  } catch (e) {
    console.error('[nomnoms] migration failed, restoring snapshot', e);
    restoreSnapshot(acct);
  }
}

/** Ask the browser not to clear NomNoms' storage under pressure. Safe to call repeatedly. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
