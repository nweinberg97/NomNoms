import { DEMO_PHOTOS } from '../../data/demoPhotos';
import type { Book, BookPage, LayoutType, MediaItem, Memory } from '../../lib/types';
import { rng } from '../tales/generator';
import type { Occasion } from './occasions';

/**
 * Builds a Dumpling: a small square book about one occasion, laid out with the
 * same page designs as the NomNoms baby book. The occasion supplies the title,
 * section names, captions and closing line; the photos supply the pages.
 * Nothing is stored; the book lives in the demo screen's memory.
 */

/* ── demo photos, grouped by what they show ───────────────────── */
const TAGS: Record<string, string[]> = {
  beach: ['beach-01', 'beach-02', 'beach-03', 'beach-04', 'beach-05', 'beach-06', 'beach-07', 'beach-08'],
  winter: ['winter-01', 'winter-02', 'winter-03', 'winter-04', 'winter-05', 'winter-06', 'winter-07', 'winter-08'],
  holiday: ['holiday-01', 'holiday-02', 'holiday-03', 'holiday-04', 'holiday-05'],
  autumn: ['autumn-01', 'autumn-02', 'autumn-03', 'autumn-04', 'autumn-05', 'autumn-06', 'autumn-07', 'autumn-08', 'autumn-09'],
  birthday: ['bokeh-04', 'bokeh-05', 'bokeh-06', 'bday-04'],
  garden: ['garden-01', 'garden-02', 'garden-03', 'garden-04', 'garden-05', 'garden-06', 'garden-07', 'garden-08', 'garden-09', 'garden-10'],
  field: ['field-01', 'field-02', 'field-03', 'field-04', 'field-05', 'field-06'],
  family: ['window-01', 'window-02', 'beach-06', 'autumn-07', 'bokeh-01', 'bokeh-02', 'night-03', 'window-07', 'window-08', 'morning-07', 'garden-07'],
  newborn: ['morning-01', 'linen-02', 'night-01', 'window-05', 'window-06', 'linen-03', 'linen-04', 'window-03'],
  food: ['morning-10', 'linen-10', 'window-10', 'bokeh-03'],
  smile: ['morning-04', 'morning-05', 'linen-08', 'linen-09', 'morning-08', 'window-09', 'eleven-01', 'field-05', 'stand-01'],
  night: ['night-02', 'night-04', 'night-05', 'night-06', 'linen-07'],
};

export function demoPhoto(key: string): MediaItem {
  const landscape = parseInt(key.split('-')[1], 10) % 4 === 0;
  return {
    id: `dm-${key}`, kind: 'photo', storageProvider: 'demo', storageKey: `${key}.jpg`, mimeType: 'image/jpeg',
    width: landscape ? 1440 : 1080, height: landscape ? 1080 : 1350, createdAt: '2026-01-01T00:00:00.000Z', metadata: { thumb: `${key}.thumb.jpg` },
  };
}

/** A set of sample photos that suit the occasion. */
export function samplePhotosFor(o: Occasion, seed: number, count = 11): MediaItem[] {
  const r = rng(seed);
  const keys: string[] = [];
  const add = (k: string) => { if (DEMO_PHOTOS[k] && !keys.includes(k)) keys.push(k); };
  o.photos.forEach((tag, i) => r.shuffle(TAGS[tag] ?? []).slice(0, i === 0 ? 7 : 4).forEach(add));
  r.shuffle(TAGS.smile).forEach((k) => keys.length < count && add(k));
  // a big book: keep going with everything else
  if (keys.length < count) r.shuffle(Object.values(TAGS).flat()).forEach((k) => keys.length < count && add(k));
  return keys.slice(0, count).map(demoPhoto);
}

/** A photo added in the demo, held in memory only (never saved). */
export async function memoryPhoto(file: File): Promise<MediaItem> {
  const url = URL.createObjectURL(file);
  const size = await new Promise<[number, number]>((res) => {
    const i = new Image();
    i.onload = () => res([i.naturalWidth, i.naturalHeight]);
    i.onerror = () => res([1200, 1500]);
    i.src = url;
  });
  return { id: `up-${Math.random().toString(36).slice(2, 9)}`, kind: 'photo', storageProvider: 'demo', storageKey: url, mimeType: file.type, width: size[0], height: size[1], createdAt: new Date().toISOString(), metadata: { thumb: url } };
}

export interface DumplingInput {
  occasion: Occasion;
  name: string;
  place: string;
  date: string;
  photos: MediaItem[];
  seed: number;
  /** How many photos share a page: fewer per page means more pages. */
  density?: Density;
}

export type Density = 'roomy' | 'balanced' | 'compact';
export const RHYTHMS: Record<Density, number[]> = {
  roomy: [1, 1, 2, 1, 2, 1, 1, 2, 1, 3],
  balanced: [1, 2, 3, 1, 4, 2, 1, 3],
  compact: [3, 4, 2, 4, 3, 4, 2],
};

export function fillWords(s: string, i: DumplingInput) {
  return s.replace(/\{name\}/g, i.name || 'Baby').replace(/\{place\}/g, i.place || 'the trip').replace(/\{year\}/g, i.date.slice(0, 4));
}

const GENERAL_CAPTIONS = [
  'Little moments', 'Just us', 'Big smiles', 'Look at you', 'Best day', 'All together', 'Again! Again!', 'Our favourite',
  'Can’t stop smiling', 'One more hug', 'So much love', 'Pure joy', 'You, right now', 'Remember this', 'Giggles', 'Sweetest face',
];

const wide = (m?: MediaItem) => !!m?.width && !!m.height && m.width > m.height * 1.15;

export function buildDumpling(input: DumplingInput): { book: Book; memories: Memory[] } {
  const { occasion: o, photos } = input;
  const r = rng(input.seed);
  const now = new Date().toISOString();
  const memories: Memory[] = [];
  const pages: BookPage[] = [];
  // the occasion's own captions first, then gentle general ones, never repeating
  const captions = [...r.shuffle(o.captions.map((c) => fillWords(c, input))), ...r.shuffle(GENERAL_CAPTIONS)];
  const lines = r.shuffle(o.lines.map((c) => fillWords(c, input)));
  let ci = 0, li = 0, n = 0;
  const pid = () => `dp-${input.seed}-${n++}`;
  const memory = (mediaIds: string[], withLine: boolean): Memory => {
    const m: Memory = {
      id: `dm-${input.seed}-${memories.length}`, babyId: 'demo', type: 'moment', title: captions[ci++ % captions.length],
      caption: withLine && li < lines.length ? lines[li++] : undefined, date: input.date, mediaIds, people: [], tags: [], favorite: false, createdAt: now, updatedAt: now,
    };
    memories.push(m);
    return m;
  };

  const [cover, ...rest] = photos;
  pages.push({ id: pid(), layout: 'cover', memoryIds: [], mediaIds: cover ? [cover.id] : [], title: fillWords(o.title, input), subtitle: fillWords(o.eyebrow, input), text: 'A NomNoms Dumpling' });

  // sections only when there are enough photos to fill them
  const sections = rest.length >= 9 ? o.sections.slice(0, Math.min(o.sections.length, Math.floor(rest.length / 4))) : [];
  const per = sections.length ? Math.ceil(rest.length / sections.length) : rest.length;
  const groups = sections.length ? sections.map((_, i) => rest.slice(i * per, (i + 1) * per)) : [rest];

  const rhythm = RHYTHMS[input.density ?? 'balanced'];
  const singles: LayoutType[] = ['hero-caption', 'split', 'full-bleed'];
  let si = Math.floor(r.next() * 3), ri = Math.floor(r.next() * rhythm.length), sinceQuote = -4;

  groups.forEach((group, g) => {
    let queue = [...group];
    if (sections.length) {
      const opener = queue.shift();
      pages.push({ id: pid(), layout: 'chapter', chapterId: `s${g}`, memoryIds: [], mediaIds: opener ? [opener.id] : [], title: fillWords(sections[g], input), text: `Part ${g + 1}` });
    }
    while (queue.length) {
      let k = Math.min(rhythm[ri++ % rhythm.length], queue.length);
      if (queue.length - k === 1 && k > 1) k -= 1; // never leave a single orphan for a 4-grid
      const take = queue.slice(0, k);
      queue = queue.slice(k);
      let layout: LayoutType;
      if (k === 1) layout = wide(take[0]) ? 'full-bleed' : singles[si++ % singles.length];
      else layout = k === 2 ? 'two-up' : k === 3 ? 'three-grid' : 'four-grid';
      const m = memory(take.map((p) => p.id), k === 1 && layout !== 'full-bleed');
      pages.push({ id: pid(), layout, chapterId: sections.length ? `s${g}` : undefined, memoryIds: [m.id], mediaIds: take.map((p) => p.id) });
      // a words-only page now and then, from the occasion's lines
      if (++sinceQuote >= 9 && li < lines.length && queue.length > 2) {
        const q = memory([], true);
        pages.push({ id: pid(), layout: 'quote', memoryIds: [q.id], mediaIds: [] });
        sinceQuote = 0;
      }
    }
  });

  pages.push({ id: pid(), layout: 'closing', memoryIds: [], mediaIds: [], title: fillWords(o.closing, input), text: `${fillWords(o.title, input)} · ${input.date.slice(0, 4)}` });

  const book: Book = {
    id: `dumpling-${o.id}`, babyId: 'demo', title: fillWords(o.title, input), subtitle: fillWords(o.eyebrow, input), coverMediaId: cover?.id,
    pages, hiddenMemoryIds: [], chapterTitles: {}, builtFrom: [],
    share: { visibility: 'private', token: 'demo', familyEmails: [], updatedAt: now },
    style: { palette: 'paper', type: o.type, shape: 'square' }, updatedAt: now,
  };
  return { book, memories };
}

/** Pages for photos added after the book was made: placed before the last page, nothing else changes. */
export function appendPhotos(book: Book, memories: Memory[], photos: MediaItem[], input: DumplingInput): { book: Book; memories: Memory[] } {
  const r = rng(input.seed + book.pages.length * 13 + photos.length);
  const now = new Date().toISOString();
  const captions = r.shuffle([...input.occasion.captions.map((c) => fillWords(c, input)), ...GENERAL_CAPTIONS]);
  const rhythm = RHYTHMS[input.density ?? 'balanced'];
  const singles: LayoutType[] = ['hero-caption', 'split', 'full-bleed'];
  const added: BookPage[] = [];
  const mems: Memory[] = [];
  let queue = [...photos], i = 0;
  while (queue.length) {
    const k = Math.min(rhythm[i % rhythm.length], queue.length);
    const take = queue.slice(0, k);
    queue = queue.slice(k);
    const layout: LayoutType = k === 1 ? (wide(take[0]) ? 'full-bleed' : singles[i % 3]) : k === 2 ? 'two-up' : k === 3 ? 'three-grid' : 'four-grid';
    const m: Memory = { id: `dm-add-${Date.now()}-${i}`, babyId: 'demo', type: 'moment', title: captions[i % captions.length], date: input.date, mediaIds: take.map((p) => p.id), people: [], tags: [], favorite: false, createdAt: now, updatedAt: now };
    mems.push(m);
    added.push({ id: `dp-add-${Date.now()}-${i}`, layout, memoryIds: [m.id], mediaIds: take.map((p) => p.id) });
    i++;
  }
  const pages = [...book.pages];
  pages.splice(Math.max(1, pages.length - 1), 0, ...added);
  return { book: { ...book, pages }, memories: [...memories, ...mems] };
}
