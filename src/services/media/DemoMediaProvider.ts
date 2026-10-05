import type { MediaItem } from '../../lib/types';
import type { MediaProvider, StoredObject } from './MediaProvider';

declare global {
  interface Window {
    /** Set by the single-file build: demo file name → data URI. */
    __NN_INLINE_ASSETS__?: Record<string, string>;
  }
}

/** Read-only provider for the bundled demo family's photos and clips (public/demo). */
export class DemoMediaProvider implements MediaProvider {
  readonly id = 'demo' as const;
  readonly label = 'Demo library';

  url(file: string): string {
    const inline = window.__NN_INLINE_ASSETS__;
    if (inline && inline[file]) return inline[file];
    if (inline) {
      // single-file build ships one size per photo; fall back to the full image for thumbs
      const full = file.replace('.thumb.jpg', '.jpg');
      if (inline[full]) return inline[full];
    }
    return `demo/${file}`;
  }

  async upload(): Promise<StoredObject> {
    throw new Error('The demo library is read-only');
  }

  async get(item: MediaItem) {
    return this.url(item.storageKey);
  }

  async getThumbnail(item: MediaItem) {
    const thumb = (item.metadata?.thumb as string) || (item.metadata?.poster as string);
    return this.url(thumb || item.storageKey);
  }

  async delete() {
    /* demo assets are shared and never deleted */
  }

  async list() {
    return [];
  }
}
