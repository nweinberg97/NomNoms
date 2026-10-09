import JSZip from 'jszip';
import type { Account, Baby, Book, MediaItem, Memory, Milestone, Preferences } from '../../lib/types';
import { nowISO } from '../../lib/util';
import type { Repositories } from '../../repositories/types';
import { MediaService } from '../media/MediaService';
import { SCHEMA_VERSION } from '../schema';

/**
 * Whole-account backup as one .zip a parent can save to Files / iCloud Drive
 * and open on any device.
 *
 *   manifest.json           every record (babies, memories, milestones,
 *                           media references, book, preferences)
 *   media/<key>             the original photo / video / voice note
 *   media/<key>.thumb.jpg   its thumbnail
 *
 * The same file is the import format for a future backend (see README:
 * "Moving to Supabase"). Restore only ever adds or updates — it never deletes
 * anything already on the device.
 */

export const BACKUP_FORMAT = 'nomnoms-backup';
export const BACKUP_FORMAT_VERSION = 1;

export interface BackupBaby {
  baby: Baby;
  memories: Memory[];
  milestones: Milestone[];
  media: MediaItem[];
  book?: Book;
}

export interface BackupManifest {
  format: typeof BACKUP_FORMAT;
  formatVersion: number;
  appSchema: number;
  exportedAt: string;
  includesVideos: boolean;
  account: Pick<Account, 'id' | 'name' | 'provider'>;
  prefs: Preferences;
  babies: BackupBaby[];
  files: { storageKey: string; path: string; thumbPath?: string; mimeType: string; size: number }[];
  skipped: { storageKey: string; reason: 'video-excluded' | 'missing' }[];
}

export interface BackupEstimate {
  photos: number;
  videos: number;
  audio: number;
  photoBytes: number;
  videoBytes: number;
}

const extFor = (mime: string) =>
  mime.includes('jpeg') ? 'jpg' : mime.includes('png') ? 'png' : mime.includes('heic') ? 'heic' : mime.includes('webp') ? 'webp'
    : mime.includes('quicktime') ? 'mov' : mime.includes('mp4') ? (mime.startsWith('audio') ? 'm4a' : 'mp4') : mime.includes('webm') ? 'webm'
      : mime.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'bin';

async function collect(repo: Repositories) {
  const babies = await repo.babies.getBabies();
  const out: BackupBaby[] = [];
  for (const baby of babies) {
    const [memories, milestones, media, book] = await Promise.all([
      repo.memories.listMemories(baby.id),
      repo.milestones.listMilestones(baby.id),
      repo.media.listMedia(baby.id),
      repo.books.getBook(baby.id),
    ]);
    out.push({ baby, memories, milestones, media, book });
  }
  return { babies: out, prefs: await repo.preferences.getPreferences() };
}

/** What a backup would contain, so the parent can choose before waiting. */
export async function estimateBackup(repo: Repositories): Promise<BackupEstimate> {
  const { babies } = await collect(repo);
  const est: BackupEstimate = { photos: 0, videos: 0, audio: 0, photoBytes: 0, videoBytes: 0 };
  for (const b of babies) {
    for (const m of b.media) {
      if (m.storageProvider !== 'browser') continue;
      const size = Number(m.metadata?.size ?? 0);
      if (m.kind === 'video') {
        est.videos++;
        est.videoBytes += size;
      } else {
        if (m.kind === 'audio') est.audio++;
        else est.photos++;
        est.photoBytes += size;
      }
    }
  }
  return est;
}

export async function createBackup(
  repo: Repositories,
  account: Account,
  opts: { includeVideos: boolean; onProgress?: (done: number, total: number) => void },
): Promise<{ blob: Blob; filename: string; manifest: BackupManifest }> {
  const { babies, prefs } = await collect(repo);
  const zip = new JSZip();
  const files: BackupManifest['files'] = [];
  const skipped: BackupManifest['skipped'] = [];

  const deviceMedia = babies.flatMap((b) => b.media).filter((m) => m.storageProvider === 'browser');
  const unique = [...new Map(deviceMedia.map((m) => [m.storageKey, m])).values()];
  let done = 0;
  for (const m of unique) {
    if (m.kind === 'video' && !opts.includeVideos) {
      skipped.push({ storageKey: m.storageKey, reason: 'video-excluded' });
    } else {
      const stored = await MediaService.browser.readStored(m.storageKey);
      if (!stored) {
        skipped.push({ storageKey: m.storageKey, reason: 'missing' });
      } else {
        const path = `media/${m.storageKey}.${extFor(m.mimeType)}`;
        // photos and videos are already compressed; store them as-is
        zip.file(path, stored.blob, { compression: 'STORE' });
        let thumbPath: string | undefined;
        if (stored.thumb) {
          thumbPath = `media/${m.storageKey}.thumb.jpg`;
          zip.file(thumbPath, stored.thumb, { compression: 'STORE' });
        }
        files.push({ storageKey: m.storageKey, path, thumbPath, mimeType: m.mimeType, size: stored.blob.size });
      }
    }
    opts.onProgress?.(++done, unique.length + 1);
  }

  const manifest: BackupManifest = {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    appSchema: SCHEMA_VERSION,
    exportedAt: nowISO(),
    includesVideos: opts.includeVideos,
    account: { id: account.id, name: account.name, provider: account.provider },
    prefs,
    babies,
    files,
    skipped,
  };
  zip.file('manifest.json', JSON.stringify(manifest, null, 2), { compression: 'DEFLATE' });
  zip.file(
    'README.txt',
    'This is a NomNoms backup.\n\nTo restore it, open NomNoms on any device, go to Settings > Your data > Restore from a backup, and choose this file.\nNothing already in NomNoms is deleted when you restore.\n\nmanifest.json holds every memory, milestone and caption; the media folder holds the original photos and videos.\n',
  );
  const blob = await zip.generateAsync({ type: 'blob', streamFiles: true });
  opts.onProgress?.(unique.length + 1, unique.length + 1);
  const name = (babies[0]?.baby.name ?? 'nomnoms').split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'nomnoms';
  const date = new Date().toISOString().slice(0, 10);
  return { blob, filename: `nomnoms-${name}-backup-${date}${opts.includeVideos ? '' : '-no-videos'}.zip`, manifest };
}

export interface RestoreResult {
  babies: number;
  memoriesAdded: number;
  memoriesUpdated: number;
  filesWritten: number;
  filesAlreadyHere: number;
  activeBabyId?: string;
}

/** Read a backup file and describe it without changing anything. */
export async function inspectBackup(file: Blob): Promise<{ zip: JSZip; manifest: BackupManifest }> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new Error('That file isn’t a NomNoms backup. Choose the .zip file you saved from NomNoms.');
  }
  const raw = await zip.file('manifest.json')?.async('string');
  if (!raw) throw new Error('That file isn’t a NomNoms backup. Choose the .zip file you saved from NomNoms.');
  const manifest = JSON.parse(raw) as BackupManifest;
  if (manifest.format !== BACKUP_FORMAT) throw new Error('That file isn’t a NomNoms backup.');
  if (manifest.formatVersion > BACKUP_FORMAT_VERSION) throw new Error('This backup was made by a newer version of NomNoms. Refresh the page and try again.');
  return { zip, manifest };
}

const newer = (a?: string, b?: string) => (a ?? '') > (b ?? '');

/**
 * Merge a backup into this device. Records are matched by id: anything new is
 * added, anything that exists is updated only if the backup's copy is newer.
 * Files already on the device are left untouched.
 */
export async function restoreBackup(
  repo: Repositories,
  zip: JSZip,
  manifest: BackupManifest,
  onProgress?: (done: number, total: number) => void,
): Promise<RestoreResult> {
  const result: RestoreResult = { babies: 0, memoriesAdded: 0, memoriesUpdated: 0, filesWritten: 0, filesAlreadyHere: 0 };
  const total = manifest.files.length + manifest.babies.length;
  let done = 0;

  // 1. files first, so no restored memory ever points at a missing photo
  for (const f of manifest.files) {
    const blob = await zip.file(f.path)?.async('blob');
    if (blob) {
      const typed = blob.type ? blob : new Blob([blob], { type: f.mimeType });
      const thumb = f.thumbPath ? await zip.file(f.thumbPath)?.async('blob') : undefined;
      const r = await MediaService.browser.writeStored(f.storageKey, typed, thumb ? new Blob([thumb], { type: 'image/jpeg' }) : undefined);
      if (r === 'written') result.filesWritten++;
      else result.filesAlreadyHere++;
    }
    onProgress?.(++done, total);
  }

  // 2. records
  for (const b of manifest.babies) {
    const existingBabies = await repo.babies.getBabies();
    const here = existingBabies.find((x) => x.id === b.baby.id);
    if (!here) await repo.babies.saveBaby(b.baby);
    else await repo.babies.saveBaby({ ...here, ...b.baby });
    result.babies++;

    const current = new Map((await repo.memories.listMemories(b.baby.id)).map((m) => [m.id, m]));
    const toSave: Memory[] = [];
    for (const m of b.memories) {
      const cur = current.get(m.id);
      if (!cur) {
        toSave.push(m);
        result.memoriesAdded++;
      } else if (newer(m.updatedAt, cur.updatedAt)) {
        toSave.push(m);
        result.memoriesUpdated++;
      }
    }
    await repo.memories.saveMemories(toSave);

    const curMs = new Map((await repo.milestones.listMilestones(b.baby.id)).map((m) => [m.id, m]));
    for (const ms of b.milestones) if (!curMs.has(ms.id)) await repo.milestones.saveMilestone(ms);
    else await repo.milestones.saveMilestone({ ...curMs.get(ms.id)!, ...ms });

    await repo.media.saveMedia(b.baby.id, b.media);

    if (b.book) {
      const curBook = await repo.books.getBook(b.baby.id);
      if (!curBook || newer(b.book.updatedAt, curBook.updatedAt)) await repo.books.saveBook(b.book);
    }
    onProgress?.(++done, total);
  }

  // 3. show the restored baby first
  const firstId = manifest.babies[0]?.baby.id;
  if (firstId) {
    const all = await repo.babies.getBabies();
    const ordered = [...all.filter((x) => x.id === firstId), ...all.filter((x) => x.id !== firstId)];
    for (const x of all) await repo.babies.deleteBaby(x.id);
    for (const x of ordered) await repo.babies.saveBaby(x);
    result.activeBabyId = firstId;
  }
  const prefs = await repo.preferences.getPreferences();
  await repo.preferences.savePreferences({ ...manifest.prefs, ...prefs });
  return result;
}

export function formatBytes(b: number) {
  if (!b) return '0 MB';
  if (b < 1024 * 1024) return `${Math.max(1, Math.round(b / 1024))} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 / 1024).toFixed(b < 10 * 1024 * 1024 ? 1 : 0)} MB`;
  return `${(b / 1024 ** 3).toFixed(1)} GB`;
}
