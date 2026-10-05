import type { Baby, Book, MediaItem, Memory, Milestone, Preferences } from '../lib/types';

/**
 * Persistence contracts. Components never touch storage directly — they go
 * through the app store, which talks to these. Today `LocalRepository`
 * implements them on top of localStorage (metadata only). A Supabase or other
 * cloud implementation can replace it without touching the UI.
 */
export interface BabyRepository {
  getBabies(): Promise<Baby[]>;
  saveBaby(baby: Baby): Promise<void>;
  deleteBaby(id: string): Promise<void>;
}

export interface MemoryRepository {
  listMemories(babyId: string): Promise<Memory[]>;
  saveMemory(memory: Memory): Promise<void>;
  saveMemories(memories: Memory[]): Promise<void>;
  deleteMemory(id: string, babyId: string): Promise<void>;
}

export interface MilestoneRepository {
  listMilestones(babyId: string): Promise<Milestone[]>;
  saveMilestone(m: Milestone): Promise<void>;
  deleteMilestone(id: string, babyId: string): Promise<void>;
}

/** Media *references* (never binaries — those live with a MediaProvider). */
export interface MediaRepository {
  listMedia(babyId: string): Promise<MediaItem[]>;
  saveMedia(babyId: string, items: MediaItem[]): Promise<void>;
  deleteMedia(babyId: string, id: string): Promise<void>;
}

export interface BookRepository {
  getBook(babyId: string): Promise<Book | undefined>;
  saveBook(book: Book): Promise<void>;
  findByShareToken(token: string): Promise<Book | undefined>;
}

export interface PreferencesRepository {
  getPreferences(): Promise<Preferences>;
  savePreferences(p: Preferences): Promise<void>;
}

export interface Repositories {
  babies: BabyRepository;
  memories: MemoryRepository;
  milestones: MilestoneRepository;
  media: MediaRepository;
  books: BookRepository;
  preferences: PreferencesRepository;
  /** Remove everything stored for this account. */
  clearAll(): Promise<void>;
}
