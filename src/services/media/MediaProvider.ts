import type { MediaItem, StorageProviderId } from '../../lib/types';

export interface UploadInput {
  file: Blob;
  thumbnail?: Blob;
  fileName?: string;
}

export interface StoredObject {
  storageKey: string;
  /** A durable URL if the provider has one (cloud CDN, demo asset). */
  url?: string;
  thumbnailUrl?: string;
}

/**
 * Where media binaries live. The app only ever holds references (MediaItem);
 * a provider turns a reference into something a <img>/<video> can display.
 *
 * Implemented today: `demo` (bundled assets) and `browser` (IndexedDB on this
 * device). Google Drive / iCloud / S3 slot in by implementing this interface —
 * nothing above the MediaService needs to change.
 */
export interface MediaProvider {
  readonly id: StorageProviderId;
  readonly label: string;
  upload(input: UploadInput): Promise<StoredObject>;
  /** Resolve a displayable URL for the full-size media. */
  get(item: MediaItem): Promise<string>;
  getThumbnail(item: MediaItem): Promise<string>;
  delete(item: MediaItem): Promise<void>;
  list(): Promise<string[]>;
}
