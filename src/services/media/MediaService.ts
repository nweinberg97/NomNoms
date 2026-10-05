import type { MediaItem, MediaKind, StorageProviderId } from '../../lib/types';
import { nowISO, uid } from '../../lib/util';
import { BrowserMediaProvider } from './BrowserMediaProvider';
import { DemoMediaProvider } from './DemoMediaProvider';
import type { MediaProvider } from './MediaProvider';

interface Resolved {
  full?: string;
  thumb?: string;
  error?: boolean;
}

/**
 * The single front door for media. Components ask for URLs by MediaItem; the
 * service routes to whichever provider stores that item and caches results.
 *
 *   MediaService → DemoMediaProvider     (bundled demo family)
 *                → BrowserMediaProvider  (IndexedDB on this device)
 *                → (future) GoogleDriveProvider, ICloudProvider, S3Provider …
 */
class MediaServiceImpl {
  readonly demo = new DemoMediaProvider();
  readonly browser = new BrowserMediaProvider();
  private providers = new Map<StorageProviderId, MediaProvider>([
    ['demo', this.demo],
    ['browser', this.browser],
  ]);
  private cache = new Map<string, Resolved>();
  private inflight = new Set<string>();
  private listeners = new Set<() => void>();
  private version = 0;

  /** Provider new uploads go to. Swap for a cloud provider when one is connected. */
  uploadProvider: StorageProviderId = 'browser';

  register(p: MediaProvider) {
    this.providers.set(p.id, p);
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getVersion = () => this.version;
  private emit() {
    this.version++;
    this.listeners.forEach((l) => l());
  }

  /** Synchronous best-effort lookup; kicks off resolution if needed. */
  peek(item: MediaItem | undefined): Resolved {
    if (!item) return {};
    if (item.storageProvider === 'demo') {
      return {
        full: this.demo.url(item.storageKey),
        thumb: this.demo.url((item.metadata?.thumb as string) || (item.metadata?.poster as string) || item.storageKey),
      };
    }
    const hit = this.cache.get(item.id);
    if (!hit && !this.inflight.has(item.id)) void this.resolve(item);
    return hit ?? {};
  }

  /** Poster image for a video, or the photo itself. */
  posterUrl(item: MediaItem | undefined): string | undefined {
    if (!item) return undefined;
    const r = this.peek(item);
    if (item.kind === 'video') {
      if (item.storageProvider === 'demo') return this.demo.url(item.metadata?.poster as string);
      return r.thumb;
    }
    return r.full ?? r.thumb;
  }

  async resolve(item: MediaItem): Promise<Resolved> {
    const p = this.providers.get(item.storageProvider);
    if (!p) return { error: true };
    this.inflight.add(item.id);
    try {
      const [full, thumb] = await Promise.all([p.get(item), p.getThumbnail(item).catch(() => undefined)]);
      const r = { full, thumb };
      this.cache.set(item.id, r);
      return r;
    } catch {
      const r = { error: true };
      this.cache.set(item.id, r);
      return r;
    } finally {
      this.inflight.delete(item.id);
      this.emit();
    }
  }

  async urlFor(item: MediaItem, which: 'full' | 'thumb' | 'poster' = 'full'): Promise<string | undefined> {
    if (item.storageProvider !== 'demo' && !this.cache.has(item.id)) await this.resolve(item);
    if (which === 'poster') return this.posterUrl(item);
    const r = this.peek(item);
    return which === 'thumb' ? r.thumb ?? r.full : r.full;
  }

  /** Turn a File from the camera or picker into a stored MediaItem. */
  async ingest(file: Blob, opts: { kind?: MediaKind; name?: string } = {}): Promise<MediaItem> {
    const mime = file.type || 'application/octet-stream';
    const kind: MediaKind = opts.kind ?? (mime.startsWith('video') ? 'video' : mime.startsWith('audio') ? 'audio' : 'photo');
    const meta: { width?: number; height?: number; duration?: number; thumb?: Blob } = {};
    try {
      if (kind === 'photo') Object.assign(meta, await photoInfo(file));
      else if (kind === 'video') Object.assign(meta, await videoInfo(file));
      else if (kind === 'audio') meta.duration = await audioDuration(file);
    } catch (e) {
      console.warn('[nomnoms] could not read media metadata', e);
    }
    const provider = this.providers.get(this.uploadProvider)!;
    const stored = await provider.upload({ file, thumbnail: meta.thumb, fileName: opts.name });
    const item: MediaItem = {
      id: uid('media'),
      kind,
      storageProvider: provider.id,
      storageKey: stored.storageKey,
      url: stored.url,
      thumbnailUrl: stored.thumbnailUrl,
      mimeType: mime,
      width: meta.width,
      height: meta.height,
      duration: meta.duration,
      createdAt: nowISO(),
      metadata: opts.name ? { originalName: opts.name, size: file.size } : { size: file.size },
    };
    await this.resolve(item);
    return item;
  }

  async remove(item: MediaItem) {
    const p = this.providers.get(item.storageProvider);
    this.cache.delete(item.id);
    await p?.delete(item);
  }

  get devicePersistent() {
    return this.browser.persistent;
  }
}

async function photoInfo(file: Blob) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const thumb = await drawThumb(img, img.naturalWidth, img.naturalHeight);
    return { width: img.naturalWidth, height: img.naturalHeight, thumb };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = url;
  });
}

function drawThumb(src: CanvasImageSource, w: number, h: number): Promise<Blob | undefined> {
  const max = 520;
  const s = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * s));
  c.height = Math.max(1, Math.round(h * s));
  c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob((b) => res(b ?? undefined), 'image/jpeg', 0.8));
}

function videoInfo(file: Blob): Promise<{ width: number; height: number; duration: number; thumb?: Blob }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.src = url;
    const done = async () => {
      const thumb = await drawThumb(v, v.videoWidth, v.videoHeight).catch(() => undefined);
      URL.revokeObjectURL(url);
      resolve({ width: v.videoWidth, height: v.videoHeight, duration: isFinite(v.duration) ? v.duration : 0, thumb });
    };
    v.onloadedmetadata = () => {
      // MediaRecorder webm files report Infinity until seeked to the end
      if (!isFinite(v.duration)) {
        v.currentTime = 1e7;
        v.ontimeupdate = () => {
          v.ontimeupdate = null;
          v.currentTime = Math.min(0.3, v.duration / 2 || 0);
          v.onseeked = () => done();
        };
      } else {
        v.currentTime = Math.min(0.5, v.duration / 3);
        v.onseeked = () => done();
      }
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unreadable video'));
    };
    setTimeout(() => reject(new Error('Video metadata timeout')), 8000);
  });
}

function audioDuration(file: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const a = new Audio();
    a.preload = 'metadata';
    a.src = url;
    a.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(isFinite(a.duration) ? a.duration : 0);
    };
    a.onerror = () => resolve(0);
    setTimeout(() => resolve(0), 4000);
  });
}

export const MediaService = new MediaServiceImpl();
