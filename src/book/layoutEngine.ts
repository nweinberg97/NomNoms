import type { Baby, Book, BookPage, Chapter, LayoutType, MediaItem, Memory } from '../lib/types';
import { fmtMonthYear, nowISO, uid } from '../lib/util';
import { buildChapters } from './chapters';

/**
 * Deterministic "book designer".
 *
 * For each chapter it walks memories in order and picks a template from what
 * each memory actually contains — one photo, two, a handful, a video, a long
 * story, a milestone — then smooths the rhythm so two identical layouts never
 * sit side by side. No AI required; the hooks for smarter selection (best
 * photo, duplicates, captions) are the `score*` functions below.
 */

export const LAYOUT_LABELS: Record<LayoutType, string> = {
  cover: 'Cover',
  chapter: 'Chapter opener',
  'full-bleed': 'Full bleed',
  'hero-caption': 'Hero + caption',
  'two-up': 'Editorial two-up',
  split: 'Split image',
  'three-grid': 'Three image grid',
  'four-grid': 'Four image grid',
  collage: 'Memory collage',
  milestone: 'Milestone',
  story: 'Story',
  video: 'Video',
  quote: 'Quote',
  closing: 'Closing',
};

/** How many photo slots each layout shows. */
export const LAYOUT_SLOTS: Partial<Record<LayoutType, number>> = {
  'full-bleed': 1, 'hero-caption': 1, split: 1, story: 1, milestone: 1, chapter: 1, cover: 1,
  'two-up': 2, 'three-grid': 3, 'four-grid': 4, collage: 5, video: 1, quote: 0, closing: 0,
};

export function compatibleLayouts(page: BookPage, mediaCount: number): LayoutType[] {
  if (page.layout === 'cover' || page.layout === 'chapter' || page.layout === 'closing') return [page.layout];
  if (page.layout === 'video') return ['video'];
  const out: LayoutType[] = [];
  if (mediaCount === 0) return ['quote'];
  out.push('full-bleed', 'hero-caption', 'split', 'story', 'milestone');
  if (mediaCount >= 2) out.push('two-up');
  if (mediaCount >= 3) out.push('three-grid');
  if (mediaCount >= 4) out.push('four-grid');
  if (mediaCount >= 5) out.push('collage');
  out.push('quote');
  return out;
}

const LONG_TEXT = 200;

/** Favourites and milestones float to the top when the layout needs a hero. */
function scoreMemory(m: Memory) {
  return (m.favorite ? 4 : 0) + (m.milestoneId || m.type === 'milestone' || m.type === 'first' ? 3 : 0) + (m.caption ? 1 : 0);
}

export interface BuildInput {
  baby: Baby;
  memories: Memory[];
  media: Map<string, MediaItem>;
  previous?: Book;
}

export function generateBook({ baby, memories, media, previous }: BuildInput): { book: Book; chapters: Chapter[] } {
  const hidden = new Set(previous?.hiddenMemoryIds ?? []);
  const visible = memories.filter((m) => !hidden.has(m.id) && (m.mediaIds.length || m.caption || m.title));
  const chapters = buildChapters(baby, visible, previous?.chapterTitles ?? {});
  const byId = new Map(visible.map((m) => [m.id, m]));
  const photosOf = (m: Memory) => m.mediaIds.filter((id) => media.get(id)?.kind === 'photo');
  const videosOf = (m: Memory) => m.mediaIds.filter((id) => media.get(id)?.kind === 'video');

  const pages: BookPage[] = [];
  const first = visible[0]?.date;
  const last = visible[visible.length - 1]?.date;

  // ── cover: the most-loved photo in the whole book
  const coverPick =
    (previous?.coverMediaId && media.has(previous.coverMediaId) ? previous.coverMediaId : undefined) ??
    [...visible].sort((a, b) => scoreMemory(b) - scoreMemory(a)).map((m) => photosOf(m)[0]).find(Boolean) ??
    baby.photoMediaId;
  pages.push({
    id: uid('pg'),
    layout: 'cover',
    memoryIds: [],
    mediaIds: coverPick ? [coverPick] : [],
    title: baby.name,
    subtitle: previous?.subtitle ?? defaultSubtitle(baby, last),
    text: first && last ? `${fmtMonthYear(baby.birthDate < first ? baby.birthDate : first)} — ${fmtMonthYear(last)}` : '',
  });

  for (const ch of chapters) {
    const items = ch.memoryIds.map((id) => byId.get(id)!).filter(Boolean);
    const heroMem = [...items].sort((a, b) => scoreMemory(b) - scoreMemory(a)).find((m) => photosOf(m).length);
    pages.push({
      id: uid('pg'),
      layout: 'chapter',
      chapterId: ch.id,
      memoryIds: [],
      mediaIds: heroMem ? [photosOf(heroMem)[0]] : [],
      title: ch.title,
      subtitle: ch.subtitle,
      text: `Chapter ${String(ch.index + 1).padStart(2, '0')}`,
    });

    const chapterPages: BookPage[] = [];
    let buffer: Memory[] = []; // small everyday single-photo moments, gathered into collages

    const flush = () => {
      if (!buffer.length) return;
      const ids = buffer.map((m) => photosOf(m)[0]);
      const layout: LayoutType = buffer.length === 1 ? 'hero-caption' : buffer.length === 2 ? 'two-up' : buffer.length === 3 ? 'three-grid' : 'four-grid';
      chapterPages.push({ id: uid('pg'), layout, chapterId: ch.id, memoryIds: buffer.map((m) => m.id), mediaIds: ids });
      buffer = [];
    };

    for (const m of items) {
      const photos = photosOf(m);
      const videos = videosOf(m);
      const isMilestone = m.type === 'milestone' || m.type === 'first' || !!m.milestoneId;
      const long = (m.caption?.length ?? 0) > LONG_TEXT || m.type === 'story';

      if (videos.length) {
        flush();
        chapterPages.push({ id: uid('pg'), layout: 'video', chapterId: ch.id, memoryIds: [m.id], mediaIds: [videos[0]] });
        if (photos.length) chapterPages.push(photoPage(ch.id, m, photos));
        continue;
      }
      if (!photos.length) {
        flush();
        chapterPages.push({ id: uid('pg'), layout: 'quote', chapterId: ch.id, memoryIds: [m.id], mediaIds: [] });
        continue;
      }
      if (isMilestone) {
        flush();
        chapterPages.push({ id: uid('pg'), layout: 'milestone', chapterId: ch.id, memoryIds: [m.id], mediaIds: [photos[0]] });
        if (photos.length > 1) chapterPages.push(photoPage(ch.id, m, photos.slice(1), true));
        continue;
      }
      if (long) {
        flush();
        chapterPages.push({ id: uid('pg'), layout: 'story', chapterId: ch.id, memoryIds: [m.id], mediaIds: [photos[0]] });
        if (photos.length > 1) chapterPages.push(photoPage(ch.id, m, photos.slice(1), true));
        continue;
      }
      if (photos.length === 1 && !m.favorite && (m.caption?.length ?? 0) < 90) {
        buffer.push(m);
        if (buffer.length === 4) flush();
        continue;
      }
      flush();
      chapterPages.push(photoPage(ch.id, m, photos));
    }
    flush();
    pages.push(...smoothRhythm(chapterPages, media));
  }

  pages.push({
    id: uid('pg'),
    layout: 'closing',
    memoryIds: [],
    mediaIds: [],
    title: 'To be continued…',
    text: `${visible.length} memories so far. The rest of the story is still being written.`,
  });

  const book: Book = {
    id: previous?.id ?? uid('book'),
    babyId: baby.id,
    title: previous?.title ?? baby.name,
    subtitle: previous?.subtitle ?? defaultSubtitle(baby, last),
    coverMediaId: previous?.coverMediaId,
    pages,
    hiddenMemoryIds: [...hidden],
    chapterTitles: previous?.chapterTitles ?? {},
    builtFrom: fingerprint(memories),
    share: previous?.share ?? { visibility: 'private', token: uid('s').replace('s-', ''), familyEmails: [], updatedAt: nowISO() },
    generatedAt: nowISO(),
    updatedAt: nowISO(),
  };
  return { book, chapters };
}

function photoPage(chapterId: string, m: Memory, photos: string[], continuation = false): BookPage {
  const n = photos.length;
  if (continuation) {
    const layout: LayoutType = n === 1 ? 'full-bleed' : n === 2 ? 'two-up' : n === 3 ? 'three-grid' : n === 4 ? 'four-grid' : 'collage';
    return { id: uid('pg'), layout, chapterId, memoryIds: [m.id], mediaIds: photos.slice(0, LAYOUT_SLOTS[layout] ?? 1), quiet: true };
  }
  const layout: LayoutType =
    n === 1 ? (m.favorite && !continuation ? 'full-bleed' : (m.caption?.length ?? 0) > 60 ? 'split' : 'hero-caption')
      : n === 2 ? 'two-up'
        : n === 3 ? 'three-grid'
          : n === 4 ? 'four-grid'
            : 'collage';
  return { id: uid('pg'), layout, chapterId, memoryIds: [m.id], mediaIds: photos.slice(0, LAYOUT_SLOTS[layout] ?? 1) };
}

/** Swap to a sibling layout whenever the same template would repeat back-to-back. */
function smoothRhythm(pages: BookPage[], media: Map<string, MediaItem>): BookPage[] {
  const alt: Partial<Record<LayoutType, LayoutType[]>> = {
    'hero-caption': ['split', 'full-bleed'],
    split: ['hero-caption'],
    'full-bleed': ['hero-caption', 'split'],
    'two-up': ['split'],
    'three-grid': ['collage'],
    'four-grid': ['collage'],
  };
  for (let i = 1; i < pages.length; i++) {
    const p = pages[i];
    if (p.layout !== pages[i - 1].layout || p.quiet) continue;
    const opts = alt[p.layout] ?? [];
    const swap = opts.find((l) => l !== pages[i - 1].layout && (LAYOUT_SLOTS[l] ?? 1) <= Math.max(1, p.mediaIds.length) && (l !== 'collage' || p.mediaIds.length >= 3));
    if (swap) p.layout = swap;
  }
  // milestones close together alternate between the arch and a full-bleed treatment
  let lastMs = -10;
  pages.forEach((p, i) => {
    if (p.layout !== 'milestone') return;
    if (i - lastMs <= 2) p.variant = pages[lastMs]?.variant === 'b' ? 'a' : 'b';
    lastMs = i;
  });
  // a landscape single photo makes a better full-bleed than a portrait one
  for (const p of pages) {
    if (p.layout === 'hero-caption' && p.mediaIds.length === 1) {
      const mi = media.get(p.mediaIds[0]);
      if (mi?.width && mi.height && mi.width > mi.height * 1.15 && p.memoryIds.length === 1) p.layout = 'full-bleed';
    }
  }
  return pages;
}

function defaultSubtitle(baby: Baby, last?: string) {
  if (!last) return 'Our story';
  const months = (new Date(last).getTime() - new Date(baby.birthDate).getTime()) / (86400000 * 30.4);
  return months >= 11 ? 'Our First Year' : 'Our Story So Far';
}

export function fingerprint(memories: Memory[]) {
  return memories.map((m) => `${m.id}@${m.updatedAt}`);
}

export function newSinceBuild(book: Book | undefined, memories: Memory[]) {
  if (!book) return memories.length;
  const old = new Set(book.builtFrom.map((s) => s.split('@')[0]));
  return memories.filter((m) => !old.has(m.id)).length;
}

/** Group pages into spreads: cover alone on the right, then pairs. */
export function toSpreads(pages: BookPage[]): BookPage[][] {
  if (!pages.length) return [];
  const spreads: BookPage[][] = [[pages[0]]];
  for (let i = 1; i < pages.length; i += 2) spreads.push(pages.slice(i, i + 2));
  return spreads;
}

/**
 * Update an existing book with new memories without undoing the parent's
 * edits: every existing page keeps its position, layout, photos and text.
 * Pages for new memories are slotted in at the end of their chapter (new
 * chapters go in date order). Pages whose memories were all deleted drop out.
 */
export function mergeIntoBook(previous: Book, fresh: Book, memories: Memory[]): Book {
  const alive = new Set(memories.map((m) => m.id));
  const covered = new Set(previous.pages.flatMap((p) => p.memoryIds));

  // keep existing pages; drop ones that only pointed at deleted memories
  const kept = previous.pages
    .map((p) => ({ before: p.memoryIds.length, page: { ...p, memoryIds: p.memoryIds.filter((id) => alive.has(id)) } }))
    .filter(({ before, page }) => before === 0 || page.memoryIds.length > 0)
    .map(({ page }) => page);

  // fresh pages that carry only memories the old book never had
  const additions = fresh.pages.filter(
    (p) => p.memoryIds.length > 0 && p.memoryIds.every((id) => !covered.has(id)),
  );
  if (!additions.length) {
    return { ...previous, pages: kept, builtFrom: fresh.builtFrom, generatedAt: fresh.generatedAt, updatedAt: nowISO() };
  }

  const pages = [...kept];
  const chapterStart = (cid?: string) => fresh.pages.find((p) => p.layout === 'chapter' && p.chapterId === cid);
  for (const add of additions) {
    const lastInChapter = pages.map((p, i) => ({ p, i })).filter(({ p }) => p.chapterId && p.chapterId === add.chapterId).pop();
    if (lastInChapter) {
      pages.splice(lastInChapter.i + 1, 0, add);
      continue;
    }
    // brand-new chapter: add its opener, placed before the first later chapter (or before the closing page)
    const opener = chapterStart(add.chapterId);
    const closingAt = pages.findIndex((p) => p.layout === 'closing');
    let at = closingAt >= 0 ? closingAt : pages.length;
    if (opener) {
      const laterAt = pages.findIndex((p) => p.layout === 'chapter' && (p.chapterId ?? '') > (opener.chapterId ?? ''));
      if (laterAt >= 0) at = laterAt;
      pages.splice(at, 0, opener, add);
    } else pages.splice(at, 0, add);
  }
  return { ...previous, pages, builtFrom: fresh.builtFrom, generatedAt: fresh.generatedAt, updatedAt: nowISO() };
}

/**
 * The book as it prints: videos belong to the film, so video pages drop out
 * and any video on a photo page is removed. Nothing is left as a hole —
 * a page that loses all its pictures becomes a words page (or goes, if it
 * had no words), and a chapter with nothing left loses its opener.
 * The saved book is never changed; this is a view of it.
 */
export function printablePages(pages: BookPage[], media: Map<string, MediaItem>, memories: Map<string, Memory>): BookPage[] {
  const isVideo = (id: string) => media.get(id)?.kind === 'video' || media.get(id)?.kind === 'audio';
  const out: BookPage[] = [];
  for (const p of pages) {
    if (p.layout === 'video') continue;
    if (p.layout === 'cover' || p.layout === 'chapter' || p.layout === 'closing') {
      out.push(p.mediaIds.some(isVideo) ? { ...p, mediaIds: p.mediaIds.filter((id) => !isVideo(id)) } : p);
      continue;
    }
    if (!p.mediaIds.some(isVideo)) {
      out.push(p);
      continue;
    }
    const ids = p.mediaIds.filter((id) => !isVideo(id));
    const hasWords = p.memoryIds.some((id) => memories.get(id)?.caption || memories.get(id)?.title);
    if (!ids.length) {
      if (hasWords && !p.quiet) out.push({ ...p, layout: 'quote', mediaIds: [] });
      continue;
    }
    const n = ids.length;
    const layout: LayoutType = (LAYOUT_SLOTS[p.layout] ?? 1) <= n ? p.layout
      : n === 1 ? 'hero-caption' : n === 2 ? 'two-up' : n === 3 ? 'three-grid' : 'four-grid';
    out.push({ ...p, layout, mediaIds: ids });
  }
  // a chapter opener followed directly by another opener (or the end) has nothing in it
  return out.filter((p, k) => p.layout !== 'chapter' || (out[k + 1] && out[k + 1].layout !== 'chapter' && out[k + 1].layout !== 'closing'));
}

export function printableBook(book: Book, media: Map<string, MediaItem>, memories: Map<string, Memory>): Book {
  return { ...book, pages: printablePages(book.pages, media, memories) };
}
