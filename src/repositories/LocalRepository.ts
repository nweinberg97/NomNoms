import { kv, type KeyValueStore } from '../lib/kv';
import type { Baby, Book, MediaItem, Memory, Milestone, Preferences } from '../lib/types';
import type { Repositories } from './types';

/**
 * Prototype persistence: one JSON document per collection, namespaced by
 * account, in localStorage. Metadata only — a year of memories is a few
 * hundred KB. Binaries are handled by MediaService.
 */
export class LocalRepository implements Repositories {
  constructor(private accountId: string, private store: KeyValueStore = kv) {}

  private k(...parts: string[]) {
    return ['nomnoms', 'v1', this.accountId, ...parts].join(':');
  }
  private read<T>(key: string, fallback: T): T {
    return this.store.get<T>(key) ?? fallback;
  }

  babies = {
    getBabies: async () => this.read<Baby[]>(this.k('babies'), []),
    saveBaby: async (baby: Baby) => {
      const all = this.read<Baby[]>(this.k('babies'), []).filter((b) => b.id !== baby.id);
      this.store.set(this.k('babies'), [...all, baby]);
    },
    deleteBaby: async (id: string) => {
      this.store.set(this.k('babies'), this.read<Baby[]>(this.k('babies'), []).filter((b) => b.id !== id));
    },
  };

  memories = {
    listMemories: async (babyId: string) => this.read<Memory[]>(this.k('memories', babyId), []),
    saveMemory: async (m: Memory) => {
      const all = this.read<Memory[]>(this.k('memories', m.babyId), []);
      const i = all.findIndex((x) => x.id === m.id);
      if (i >= 0) all[i] = m;
      else all.push(m);
      this.store.set(this.k('memories', m.babyId), all);
    },
    saveMemories: async (list: Memory[]) => {
      if (!list.length) return;
      const babyId = list[0].babyId;
      const all = this.read<Memory[]>(this.k('memories', babyId), []);
      const byId = new Map(all.map((m) => [m.id, m]));
      list.forEach((m) => byId.set(m.id, m));
      this.store.set(this.k('memories', babyId), [...byId.values()]);
    },
    deleteMemory: async (id: string, babyId: string) => {
      this.store.set(this.k('memories', babyId), this.read<Memory[]>(this.k('memories', babyId), []).filter((m) => m.id !== id));
    },
  };

  milestones = {
    listMilestones: async (babyId: string) => this.read<Milestone[]>(this.k('milestones', babyId), []),
    saveMilestone: async (m: Milestone) => {
      const all = this.read<Milestone[]>(this.k('milestones', m.babyId), []).filter((x) => x.id !== m.id);
      this.store.set(this.k('milestones', m.babyId), [...all, m]);
    },
    deleteMilestone: async (id: string, babyId: string) => {
      this.store.set(this.k('milestones', babyId), this.read<Milestone[]>(this.k('milestones', babyId), []).filter((m) => m.id !== id));
    },
  };

  media = {
    listMedia: async (babyId: string) => this.read<MediaItem[]>(this.k('media', babyId), []),
    saveMedia: async (babyId: string, items: MediaItem[]) => {
      const all = this.read<MediaItem[]>(this.k('media', babyId), []);
      const byId = new Map(all.map((m) => [m.id, m]));
      items.forEach((m) => byId.set(m.id, m));
      this.store.set(this.k('media', babyId), [...byId.values()]);
    },
    deleteMedia: async (babyId: string, id: string) => {
      this.store.set(this.k('media', babyId), this.read<MediaItem[]>(this.k('media', babyId), []).filter((m) => m.id !== id));
    },
  };

  books = {
    getBook: async (babyId: string) => this.store.get<Book>(this.k('book', babyId)),
    saveBook: async (book: Book) => {
      this.store.set(this.k('book', book.babyId), book);
      // share index lives outside the account namespace so a link opens the book on this device
      this.store.set(`nomnoms:v1:share:${book.share.token}`, { accountId: this.accountId, babyId: book.babyId });
    },
    findByShareToken: async (token: string) => {
      const ref = this.store.get<{ accountId: string; babyId: string }>(`nomnoms:v1:share:${token}`);
      if (!ref) return undefined;
      return this.store.get<Book>(['nomnoms', 'v1', ref.accountId, 'book', ref.babyId].join(':'));
    },
  };

  preferences = {
    getPreferences: async () => this.read<Preferences>(this.k('prefs'), {}),
    savePreferences: async (p: Preferences) => this.store.set(this.k('prefs'), p),
  };

  async clearAll() {
    for (const key of this.store.keys(['nomnoms', 'v1', this.accountId].join(':'))) this.store.remove(key);
  }
}

/** Look up a shared book from any account on this device (prototype "link"). */
export function resolveShare(token: string) {
  const ref = kv.get<{ accountId: string; babyId: string }>(`nomnoms:v1:share:${token}`);
  return ref;
}
