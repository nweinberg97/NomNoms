/**
 * NomNoms domain model.
 *
 * One family → one baby → one living book. Everything references a babyId so
 * more babies (and family members) can be added later without reshaping data.
 * Media binaries never live in these records — only references to wherever a
 * MediaProvider keeps the actual file.
 */

export type ISODate = string; // YYYY-MM-DD
export type ISODateTime = string;

export interface Account {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  provider: 'google' | 'apple' | 'demo';
  isDemo: boolean;
  createdAt: ISODateTime;
}

export interface Baby {
  id: string;
  name: string;
  birthDate: ISODate;
  birthPlace?: string;
  birthTime?: string;
  birthWeight?: string;
  photoMediaId?: string;
  /** People who show up in this baby's story — used for quick tagging. */
  people: string[];
  createdAt: ISODateTime;
}

export type MediaKind = 'photo' | 'video' | 'audio';
export type StorageProviderId = 'demo' | 'browser' | 'google-drive' | 'icloud' | 's3';

export interface MediaItem {
  id: string;
  kind: MediaKind;
  storageProvider: StorageProviderId;
  /** Opaque key the provider understands (file name, IndexedDB key, Drive fileId…). */
  storageKey: string;
  /** Stable URL when the provider has one (demo assets, cloud CDN). Blob URLs are never persisted. */
  url?: string;
  thumbnailUrl?: string;
  mimeType: string;
  width?: number;
  height?: number;
  /** Seconds, for video and audio. */
  duration?: number;
  createdAt: ISODateTime;
  metadata?: Record<string, string | number | boolean>;
}

export type MemoryType =
  | 'moment'
  | 'milestone'
  | 'first'
  | 'funny'
  | 'family'
  | 'adventure'
  | 'story';

export interface Memory {
  id: string;
  babyId: string;
  type: MemoryType;
  title?: string;
  caption?: string;
  date: ISODate;
  mediaIds: string[];
  location?: string;
  people: string[];
  tags: string[];
  favorite: boolean;
  milestoneId?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Milestone {
  id: string;
  babyId: string;
  title: string;
  description?: string;
  date: ISODate;
  memoryIds: string[];
  photoMediaId?: string;
}

/** Chapters are derived from memories (see book/chapters.ts); titles can be overridden per book. */
export interface Chapter {
  id: string; // ch-YYYY-MM of the first month it covers
  babyId: string;
  index: number;
  title: string;
  subtitle: string;
  startDate: ISODate;
  endDate: ISODate;
  memoryIds: string[];
}

export type LayoutType =
  | 'cover'
  | 'chapter'
  | 'full-bleed'
  | 'hero-caption'
  | 'two-up'
  | 'split'
  | 'three-grid'
  | 'four-grid'
  | 'collage'
  | 'milestone'
  | 'story'
  | 'video'
  | 'quote'
  | 'closing';

export interface BookPage {
  id: string;
  layout: LayoutType;
  chapterId?: string;
  memoryIds: string[];
  /** Which media appear on the page, in slot order. */
  mediaIds: string[];
  /** Page-level text (chapter titles, cover title, closing note). Memory text is read live from the memory. */
  title?: string;
  subtitle?: string;
  text?: string;
  /** Continuation page: photos only, the words already appeared on the previous page. */
  quiet?: boolean;
  /** Alternate treatment of the same template, chosen to keep rhythm varied. */
  variant?: 'a' | 'b';
}

export type ShareVisibility = 'private' | 'link' | 'family';

export interface ShareSettings {
  visibility: ShareVisibility;
  token: string;
  familyEmails: string[];
  updatedAt: ISODateTime;
}

export interface Book {
  id: string;
  babyId: string;
  title: string;
  subtitle: string;
  coverMediaId?: string;
  pages: BookPage[];
  hiddenMemoryIds: string[];
  chapterTitles: Record<string, string>;
  /** Memory count/fingerprint at last build, to tell the parent when there's something new. */
  builtFrom: string[];
  share: ShareSettings;
  generatedAt?: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Preferences {
  bookTitle?: string;
  reduceMotion?: boolean;
  lastSeenBuild?: ISODateTime;
}
