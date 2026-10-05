import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { generateBook } from '../book/layoutEngine';
import { buildDemoSeed } from '../data/seed';
import type { Account, Baby, Book, MediaItem, Memory, MemoryType, Milestone, Preferences } from '../lib/types';
import { nowISO, todayISO, uid } from '../lib/util';
import { LocalRepository } from '../repositories/LocalRepository';
import type { Repositories } from '../repositories/types';
import { AuthService } from '../services/auth/AuthService';
import { MediaService } from '../services/media/MediaService';

export interface NewMemoryInput {
  type?: MemoryType;
  title?: string;
  caption?: string;
  date?: string;
  files?: Blob[];
  mediaIds?: string[];
  location?: string;
  people?: string[];
  tags?: string[];
  favorite?: boolean;
  milestoneTitle?: string;
}

interface AppState {
  ready: boolean;
  account?: Account;
  baby?: Baby;
  babies: Baby[];
  memories: Memory[]; // sorted newest first
  milestones: Milestone[];
  media: Map<string, MediaItem>;
  book?: Book;
  prefs: Preferences;
}

interface Actions {
  signIn(provider: 'google' | 'apple' | 'demo'): Promise<{ hasBaby: boolean }>;
  signOut(): void;
  createBaby(input: { name: string; birthDate: string; birthPlace?: string; photo?: Blob; people?: string[] }): Promise<Baby>;
  updateBaby(patch: Partial<Baby>, photo?: Blob): Promise<void>;
  loadDemoFamily(): Promise<void>;
  addMemory(input: NewMemoryInput): Promise<Memory>;
  updateMemory(id: string, patch: Partial<Memory>): Promise<void>;
  deleteMemory(id: string): Promise<void>;
  toggleFavorite(id: string): Promise<void>;
  addMediaToMemory(id: string, files: Blob[]): Promise<void>;
  buildBook(): Promise<Book>;
  saveBook(book: Book): Promise<void>;
  resetAll(): Promise<void>;
  savePrefs(p: Preferences): Promise<void>;
  ingest(files: Blob[]): Promise<MediaItem[]>;
}

const Ctx = createContext<(AppState & Actions & { repo?: Repositories }) | null>(null);

const sortMemories = (list: Memory[]) =>
  [...list].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({ ready: false, babies: [], memories: [], milestones: [], media: new Map(), prefs: {} });
  const repoRef = useRef<Repositories>();
  const stateRef = useRef(state);
  stateRef.current = state;

  const loadAccount = useCallback(async (account: Account | undefined) => {
    if (!account) {
      repoRef.current = undefined;
      setState({ ready: true, babies: [], memories: [], milestones: [], media: new Map(), prefs: {} });
      return { hasBaby: false };
    }
    const repo = new LocalRepository(account.id);
    repoRef.current = repo;
    const babies = await repo.babies.getBabies();
    const baby = babies[0];
    const [memories, milestones, mediaList, book, prefs] = baby
      ? await Promise.all([
        repo.memories.listMemories(baby.id),
        repo.milestones.listMilestones(baby.id),
        repo.media.listMedia(baby.id),
        repo.books.getBook(baby.id),
        repo.preferences.getPreferences(),
      ])
      : [[], [], [], undefined, await repo.preferences.getPreferences()];
    setState({
      ready: true, account, babies, baby, memories: sortMemories(memories), milestones,
      media: new Map(mediaList.map((m) => [m.id, m])), book, prefs,
    });
    return { hasBaby: !!baby };
  }, []);

  useEffect(() => {
    void loadAccount(AuthService.current());
  }, [loadAccount]);

  const repo = () => {
    if (!repoRef.current) throw new Error('Not signed in');
    return repoRef.current;
  };

  const ingest = useCallback(async (files: Blob[]) => {
    const babyId = stateRef.current.baby?.id;
    const items: MediaItem[] = [];
    for (const f of files) items.push(await MediaService.ingest(f, { name: (f as File).name }));
    if (babyId) await repo().media.saveMedia(babyId, items);
    setState((s) => {
      const media = new Map(s.media);
      items.forEach((i) => media.set(i.id, i));
      return { ...s, media };
    });
    return items;
  }, []);

  const actions: Actions = useMemo(() => ({
    async signIn(provider) {
      const account =
        provider === 'google' ? await AuthService.signInWithGoogle()
          : provider === 'apple' ? await AuthService.signInWithApple()
            : AuthService.demoAccount('demo');
      return loadAccount(account);
    },

    signOut() {
      AuthService.signOut();
      void loadAccount(undefined);
    },

    async createBaby({ name, birthDate, birthPlace, photo, people }) {
      const r = repo();
      const baby: Baby = {
        id: uid('baby'), name: name.trim(), birthDate, birthPlace,
        people: people?.length ? people : ['Mom', 'Dad', 'Grandma', 'Grandpa'], createdAt: nowISO(),
      };
      let media: MediaItem[] = [];
      if (photo) {
        const item = await MediaService.ingest(photo);
        media = [item];
        baby.photoMediaId = item.id;
        await r.media.saveMedia(baby.id, media);
      }
      await r.babies.saveBaby(baby);
      setState((s) => ({ ...s, babies: [baby], baby, memories: [], milestones: [], book: undefined, media: new Map(media.map((m) => [m.id, m])) }));
      return baby;
    },

    async updateBaby(patch, photo) {
      const s = stateRef.current;
      if (!s.baby) return;
      const next = { ...s.baby, ...patch };
      if (photo) {
        const [item] = await ingest([photo]);
        next.photoMediaId = item.id;
      }
      await repo().babies.saveBaby(next);
      setState((st) => ({ ...st, baby: next, babies: [next] }));
    },

    async loadDemoFamily() {
      const r = repo();
      const seed = buildDemoSeed();
      // replace whatever is there with the demo family
      for (const b of await r.babies.getBabies()) await r.babies.deleteBaby(b.id);
      await r.babies.saveBaby(seed.baby);
      await r.media.saveMedia(seed.baby.id, seed.media);
      await r.memories.saveMemories(seed.memories);
      for (const m of seed.milestones) await r.milestones.saveMilestone(m);
      const book = await r.books.getBook(seed.baby.id);
      setState((s) => ({
        ...s, babies: [seed.baby], baby: seed.baby, memories: sortMemories(seed.memories), milestones: seed.milestones,
        media: new Map(seed.media.map((m) => [m.id, m])), book,
      }));
    },

    async addMemory(input) {
      const s = stateRef.current;
      if (!s.baby) throw new Error('No baby yet');
      const r = repo();
      const items = input.files?.length ? await ingest(input.files) : [];
      const mediaIds = [...(input.mediaIds ?? []), ...items.map((i) => i.id)];
      const now = nowISO();
      const memory: Memory = {
        id: uid('mem'), babyId: s.baby.id, type: input.type ?? 'moment',
        title: input.title?.trim() || undefined, caption: input.caption?.trim() || undefined,
        date: input.date || todayISO(), mediaIds, location: input.location?.trim() || undefined,
        people: input.people ?? [], tags: input.tags ?? [], favorite: !!input.favorite,
        createdAt: now, updatedAt: now,
      };
      let milestone: Milestone | undefined;
      if (input.milestoneTitle || memory.type === 'milestone' || memory.type === 'first') {
        milestone = {
          id: uid('ms'), babyId: s.baby.id, title: (input.milestoneTitle || memory.title || 'A new first').trim(),
          description: memory.caption, date: memory.date, memoryIds: [memory.id],
          photoMediaId: mediaIds.find((id) => (stateRef.current.media.get(id) ?? items.find((i) => i.id === id))?.kind === 'photo') ?? mediaIds[0],
        };
        memory.milestoneId = milestone.id;
        if (memory.type === 'moment') memory.type = 'milestone';
        await r.milestones.saveMilestone(milestone);
      }
      await r.memories.saveMemory(memory);
      setState((st) => ({
        ...st,
        memories: sortMemories([...st.memories, memory]),
        milestones: milestone ? [...st.milestones, milestone] : st.milestones,
      }));
      return memory;
    },

    async updateMemory(id, patch) {
      const s = stateRef.current;
      const cur = s.memories.find((m) => m.id === id);
      if (!cur) return;
      const next: Memory = { ...cur, ...patch, updatedAt: nowISO() };
      await repo().memories.saveMemory(next);
      let milestones = s.milestones;
      if (next.milestoneId) {
        const ms = s.milestones.find((m) => m.id === next.milestoneId);
        if (ms && (patch.date || patch.caption !== undefined)) {
          const upd = { ...ms, date: next.date, description: next.caption };
          await repo().milestones.saveMilestone(upd);
          milestones = s.milestones.map((m) => (m.id === upd.id ? upd : m));
        }
      }
      setState((st) => ({ ...st, memories: sortMemories(st.memories.map((m) => (m.id === id ? next : m))), milestones }));
    },

    async deleteMemory(id) {
      const s = stateRef.current;
      const m = s.memories.find((x) => x.id === id);
      if (!m || !s.baby) return;
      await repo().memories.deleteMemory(id, s.baby.id);
      if (m.milestoneId) await repo().milestones.deleteMilestone(m.milestoneId, s.baby.id);
      for (const mid of m.mediaIds) {
        const item = s.media.get(mid);
        const shared = s.memories.some((o) => o.id !== id && o.mediaIds.includes(mid));
        if (item && item.storageProvider !== 'demo' && !shared) {
          await MediaService.remove(item);
          await repo().media.deleteMedia(s.baby.id, mid);
        }
      }
      setState((st) => ({
        ...st,
        memories: st.memories.filter((x) => x.id !== id),
        milestones: st.milestones.filter((x) => x.id !== m.milestoneId),
      }));
    },

    async toggleFavorite(id) {
      const m = stateRef.current.memories.find((x) => x.id === id);
      if (m) await actions.updateMemory(id, { favorite: !m.favorite });
    },

    async addMediaToMemory(id, files) {
      const items = await ingest(files);
      const m = stateRef.current.memories.find((x) => x.id === id);
      if (m) await actions.updateMemory(id, { mediaIds: [...m.mediaIds, ...items.map((i) => i.id)] });
    },

    async buildBook() {
      const s = stateRef.current;
      if (!s.baby) throw new Error('No baby yet');
      const { book } = generateBook({ baby: s.baby, memories: [...s.memories].reverse(), media: s.media, previous: s.book });
      await repo().books.saveBook(book);
      setState((st) => ({ ...st, book }));
      return book;
    },

    async saveBook(book) {
      const next = { ...book, updatedAt: nowISO() };
      await repo().books.saveBook(next);
      setState((st) => ({ ...st, book: next }));
    },

    async resetAll() {
      await repo().clearAll();
      await MediaService.browser.clear();
      await loadAccount(AuthService.current());
    },

    async savePrefs(p) {
      const prefs = { ...stateRef.current.prefs, ...p };
      await repo().preferences.savePreferences(prefs);
      setState((st) => ({ ...st, prefs }));
    },

    ingest,
  }), [ingest, loadAccount]);

  const value = useMemo(() => ({ ...state, ...actions, repo: repoRef.current }), [state, actions]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside provider');
  return v;
}

/** For components that may render outside the app (off-screen PDF pages, landing preview). */
export function useAppOptional() {
  return useContext(Ctx);
}

/** Memories in reading order (oldest first). */
export function useChronological() {
  const { memories } = useApp();
  return useMemo(() => [...memories].reverse(), [memories]);
}
