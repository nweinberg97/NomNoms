import React, { useEffect, useRef, useState } from 'react';
import type JSZip from 'jszip';
import { downloadBlob } from '../export/offscreen';
import { cx, plural } from '../lib/util';
import {
  createBackup, estimateBackup, formatBytes, inspectBackup, restoreBackup,
  type BackupEstimate, type BackupManifest,
} from '../services/backup/BackupService';
import { MediaService } from '../services/media/MediaService';
import { requestPersistentStorage } from '../services/schema';
import { useApp } from '../state/store';
import { Icon } from './Icon';
import { Sheet, Spinner, toast } from './ui';

/** Storage meter + backup/restore. Lives in Settings, and on onboarding as "Restore". */
export function DataCard() {
  const { repo, account, prefs, savePrefs, media, memories } = useApp();
  const [usage, setUsage] = useState<{ used: number; quota: number }>();
  const [persisted, setPersisted] = useState<boolean>();
  const [est, setEst] = useState<BackupEstimate>();
  const [progress, setProgress] = useState<{ label: string; done: number; total: number } | null>(null);

  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => setUsage({ used: e.usage ?? 0, quota: e.quota ?? 0 })).catch(() => undefined);
    navigator.storage?.persisted?.().then(setPersisted).catch(() => undefined);
    if (repo) void estimateBackup(repo).then(setEst);
  }, [repo, media.size, memories.length]);

  if (!repo || !account) return null;
  const pct = usage && usage.quota ? Math.min(100, (usage.used / usage.quota) * 100) : 0;
  const deviceItems = (est?.photos ?? 0) + (est?.videos ?? 0) + (est?.audio ?? 0);
  const last = prefs.lastBackupAt ? new Date(prefs.lastBackupAt) : undefined;

  const backup = async (includeVideos: boolean) => {
    setProgress({ label: 'Packing your memories', done: 0, total: 1 });
    try {
      const r = await createBackup(repo, account, { includeVideos, onProgress: (done, total) => setProgress({ label: 'Packing your memories', done, total }) });
      const saved = await downloadBlob(r.blob, r.filename);
      if (saved) {
        await savePrefs({ lastBackupAt: new Date().toISOString() });
        toast(`Backup saved · ${formatBytes(r.blob.size)}`, { icon: 'check', ms: 4200 });
      }
    } catch (e) {
      console.error(e);
      toast('The backup couldn’t be made. Try “Without videos”, or free up space on the phone.', { icon: 'x', ms: 5200 });
    } finally {
      setProgress(null);
    }
  };

  return (
    <section className="set-card data-card">
      <h2 className="set-h">Your data</h2>
      <p className="muted">
        Everything you add is saved on this device only. Save a backup now and then. It’s also how you move NomNoms to another phone or computer.
      </p>

      <div className="data-meter">
        <div className="row-between">
          <span><strong>{plural(deviceItems, 'photo or video', 'photos & videos')}</strong> on this device{est ? ` · ${formatBytes(est.photoBytes + est.videoBytes)}` : ''}</span>
          {usage && usage.quota ? <small className="muted">{formatBytes(usage.used)} of {formatBytes(usage.quota)} available to NomNoms</small> : null}
        </div>
        <div className="progress"><span style={{ width: `${Math.max(pct, 1)}%` }} className={cx(pct > 80 && 'is-warn')} /></div>
        {est && est.videos > 0 && <small className="muted">{plural(est.videos, 'video')} · {formatBytes(est.videoBytes)}. Videos take the most space.</small>}
        <div className="data-persist">
          {persisted ? (
            <span className="pill is-on"><Icon name="lock" size={12} /> Protected from automatic clean-up</span>
          ) : (
            <button className="link-btn" onClick={async () => setPersisted(await requestPersistentStorage())}>
              <Icon name="lock" size={14} /> Ask this browser to keep NomNoms’ storage
            </button>
          )}
          {!MediaService.devicePersistent && <span className="pill">This browser isn’t saving photos. Save a backup now.</span>}
        </div>
      </div>

      {progress ? (
        <div className="progress-wrap" role="status">
          <div className="progress"><span style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} /></div>
          <small className="muted">{progress.label}… {progress.done} of {progress.total}</small>
        </div>
      ) : (
        <div className="data-actions">
          <button className="btn btn-primary btn-sm" onClick={() => backup(true)} data-testid="backup-all">
            <Icon name="download" size={15} /> Save a backup{est ? ` · ${formatBytes(est.photoBytes + est.videoBytes)}` : ''}
          </button>
          {est && est.videos > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => backup(false)} data-testid="backup-no-video">
              Without videos · {formatBytes(est.photoBytes)}
            </button>
          )}
          <RestoreButton />
        </div>
      )}
      <small className="muted">{last ? `Last backup ${last.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : 'No backup yet'}</small>
    </section>
  );
}

/** Pick a backup file, show what's in it, then merge it in. Never deletes anything. */
export function RestoreButton({ label = 'Restore from a backup', className = 'btn btn-ghost btn-sm' }: { label?: string; className?: string }) {
  const { repo, reload } = useApp();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ zip: JSZip; manifest: BackupManifest; name: string } | null>(null);
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);

  const pick = async (f?: File) => {
    if (!f) return;
    try {
      const r = await inspectBackup(f);
      setPending({ ...r, name: f.name });
    } catch (e) {
      toast((e as Error).message, { icon: 'x', ms: 5200 });
    }
  };

  const run = async () => {
    if (!pending || !repo) return;
    setBusy({ done: 0, total: 1 });
    try {
      const r = await restoreBackup(repo, pending.zip, pending.manifest, (done, total) => setBusy({ done, total }));
      await reload();
      setPending(null);
      toast(`Restored · ${plural(r.memoriesAdded, 'memory', 'memories')} added${r.memoriesUpdated ? `, ${r.memoriesUpdated} updated` : ''}`, { icon: 'check', ms: 5200 });
    } catch (e) {
      console.error(e);
      toast('Restore stopped partway. Nothing was deleted. Try again.', { icon: 'x', ms: 5200 });
    } finally {
      setBusy(null);
    }
  };

  const m = pending?.manifest;
  const counts = m ? {
    memories: m.babies.reduce((n, b) => n + b.memories.length, 0),
    files: m.files.length,
    skippedVideos: m.skipped.filter((s) => s.reason === 'video-excluded').length,
  } : undefined;

  return (
    <>
      <button className={className} onClick={() => input.current?.click()} data-testid="restore-open">
        <Icon name="refresh" size={15} /> {label}
      </button>
      <input ref={input} type="file" accept=".zip,application/zip" hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }} data-testid="restore-input" />
      <Sheet open={!!pending} onClose={() => !busy && setPending(null)} title="Restore this backup?">
        {m && counts && (
          <div className="sheet-body restore-sheet">
            <p><strong>{m.babies.map((b) => b.baby.name).join(', ')}</strong></p>
            <p className="muted">
              Saved {new Date(m.exportedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} · {plural(counts.memories, 'memory', 'memories')} · {plural(counts.files, 'photo or video', 'photos & videos')}
              {counts.skippedVideos ? ` · ${plural(counts.skippedVideos, 'video')} not included` : ''}
            </p>
            <p className="restore-note"><Icon name="lock" size={14} /> Nothing already here is deleted. New memories are added, and changed ones are updated.</p>
            {busy ? (
              <div className="progress-wrap" role="status">
                <div className="progress"><span style={{ width: `${(busy.done / Math.max(1, busy.total)) * 100}%` }} /></div>
                <small className="muted">Restoring… {busy.done} of {busy.total}</small>
              </div>
            ) : (
              <div className="row-end" style={{ marginTop: 18 }}>
                <button className="btn btn-ghost" onClick={() => setPending(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={run} data-testid="restore-confirm">Restore</button>
              </div>
            )}
          </div>
        )}
      </Sheet>
      {busy && !pending && <Spinner />}
    </>
  );
}
