import type { Book, BookPage, LayoutType, MediaItem, Memory } from '../lib/types';
import { LAYOUT_SLOTS } from './layoutEngine';
import { resolveStyle } from './styles';

/**
 * "Make it nicer": a gentle design pass over the whole book.
 *
 * It only changes the layout of pages the parent hasn't touched, never the
 * photos, words or page order. A page counts as touched when it is flagged
 * `edited`, or when its layout/photos no longer match what NomNoms would lay
 * out for the same memory today (that catches edits made before the flag
 * existed). Everything it does is one undoable book change.
 */

const SINGLE: LayoutType[] = ['full-bleed', 'hero-caption', 'split', 'story'];
const FIXED: LayoutType[] = ['cover', 'chapter', 'closing', 'video', 'quote'];

const key = (p: BookPage) => `${p.memoryIds.join(',')}|${p.mediaIds[0] ?? ''}`;

function orientation(m?: MediaItem): 'wide' | 'tall' | 'square' | undefined {
  if (!m?.width || !m.height) return undefined;
  const r = m.width / m.height;
  return r > 1.15 ? 'wide' : r < 0.87 ? 'tall' : 'square';
}

export function untouchedPages(book: Book, fresh: Book): Set<string> {
  const designed = new Map(fresh.pages.map((p) => [key(p), p]));
  const out = new Set<string>();
  for (const p of book.pages) {
    if (p.edited || FIXED.includes(p.layout)) continue;
    const f = designed.get(key(p));
    if (f && f.layout === p.layout && f.mediaIds.join() === p.mediaIds.join()) out.add(p.id);
  }
  return out;
}

export function polishBook(book: Book, fresh: Book, media: Map<string, MediaItem>, memories: Map<string, Memory>): { book: Book; changed: number } {
  const free = untouchedPages(book, fresh);
  const shape = resolveStyle(book.style).shape;
  const pages = book.pages.map((p) => ({ ...p }));
  const before = new Map(book.pages.map((p) => [p.id, `${p.layout}:${p.variant ?? ''}`]));

  const set = (p: BookPage, l: LayoutType) => {
    if ((LAYOUT_SLOTS[l] ?? 1) > Math.max(1, p.mediaIds.length) && l !== 'collage') return;
    p.layout = l;
  };

  // 1. fit single photos to the page: the photo's shape decides the treatment
  for (const p of pages) {
    if (!free.has(p.id) || p.quiet || p.mediaIds.length !== 1 || !SINGLE.includes(p.layout) || p.layout === 'story') continue;
    const m = memories.get(p.memoryIds[0]);
    const words = (m?.caption?.length ?? 0);
    const o = orientation(media.get(p.mediaIds[0]));
    if (words > 260) { set(p, 'story'); continue; }
    if (shape === 'landscape') {
      if (o === 'tall') set(p, 'split');
      else if (o === 'wide' && words < 140) set(p, 'full-bleed');
    } else if (shape === 'square') {
      if (o === 'wide') set(p, words > 80 ? 'hero-caption' : 'full-bleed');
    } else {
      if (o === 'wide' && words > 140) set(p, 'hero-caption');
      else if (o === 'tall' && m?.favorite && words < 140) set(p, 'full-bleed');
    }
    // long words never sit over a photo
    if (p.layout === 'full-bleed' && words > 140) set(p, 'split');
  }

  // 2. rhythm: never the same template twice in a row
  const alt: Partial<Record<LayoutType, LayoutType[]>> = {
    'hero-caption': ['split', 'full-bleed'],
    split: ['hero-caption', 'full-bleed'],
    'full-bleed': ['split', 'hero-caption'],
    'two-up': ['split'],
    'three-grid': ['collage'],
    'four-grid': ['collage'],
  };
  for (let i = 1; i < pages.length; i++) {
    const p = pages[i];
    if (!free.has(p.id) || p.layout !== pages[i - 1].layout) continue;
    const words = memories.get(p.memoryIds[0])?.caption?.length ?? 0;
    const swap = (alt[p.layout] ?? []).find((l) =>
      l !== pages[i - 1].layout && l !== pages[i + 1]?.layout
      && (LAYOUT_SLOTS[l] ?? 1) <= Math.max(1, p.mediaIds.length)
      && (l !== 'collage' || p.mediaIds.length >= 3)
      && (l !== 'full-bleed' || words <= 140)
      && (l !== 'split' || p.mediaIds.length === 1));
    if (swap) {
      p.layout = swap;
      if (swap === 'split' || swap === 'full-bleed' || swap === 'hero-caption') p.mediaIds = p.mediaIds.slice(0, 1);
    }
  }

  // 3. milestones close together alternate between the arch and the full photo
  let last = -10;
  pages.forEach((p, i) => {
    if (p.layout !== 'milestone') return;
    if (free.has(p.id) && i - last <= 2) p.variant = pages[last]?.variant === 'b' ? 'a' : 'b';
    last = i;
  });

  const changed = pages.filter((p) => before.get(p.id) !== `${p.layout}:${p.variant ?? ''}`).length;
  return { book: { ...book, pages }, changed };
}
