import type { Baby, Book, MediaItem, Memory } from '../lib/types';
import { fmtLong, fmtMonthYear } from '../lib/util';
import { MediaService } from '../services/media/MediaService';

/**
 * Memory Film: a deterministic timeline of title cards and photo/video shots,
 * drawn to a <canvas> with slow Ken Burns motion and crossfades. The same
 * renderer powers the in-app player and the browser-side video export
 * (canvas.captureStream + MediaRecorder). A server-side pipeline could render
 * the identical timeline to MP4 with music later.
 */

export const FILM_W = 1280;
export const FILM_H = 720;
const FADE = 0.7;

export type Shot =
  | { kind: 'title'; dur: number; title: string; sub: string; line: string }
  | { kind: 'chapter'; dur: number; n: number; title: string; sub: string }
  | { kind: 'photo'; dur: number; media: MediaItem; title?: string; date: string; caption?: string; milestone?: boolean; seed: number; memoryId?: string }
  | { kind: 'video'; dur: number; media: MediaItem; title?: string; date: string; memoryId?: string }
  | { kind: 'end'; dur: number; title: string; sub: string };

export interface Timeline {
  shots: (Shot & { start: number })[];
  duration: number;
}

export type FilmLength = 'short' | 'medium' | 'long';
export const FILM_LENGTHS: Record<FilmLength, { label: string; perChapter: number; photo: number; chapter: number; videoMax: number }> = {
  short: { label: 'Short', perChapter: 1, photo: 2.8, chapter: 2.2, videoMax: 4 },
  medium: { label: 'Medium', perChapter: 2, photo: 3.2, chapter: 2.6, videoMax: 5 },
  long: { label: 'Long', perChapter: 4, photo: 3.6, chapter: 3, videoMax: 6 },
};

export interface TimelineOptions {
  length: FilmLength;
  /** Memory ids the parent took out of the film. */
  excluded?: string[];
}

/** Memory ids in the film, in order (for the "moments" list). */
export function timelineMemoryIds(tl: Timeline) {
  return tl.shots.flatMap((s) => ('memoryId' in s && s.memoryId ? [s.memoryId] : []));
}

export function buildTimeline(baby: Baby, book: Book | undefined, memories: Memory[], media: Map<string, MediaItem>, mode: 'highlights' | 'full' | TimelineOptions): Timeline {
  const opts: TimelineOptions = typeof mode === 'string' ? { length: mode === 'highlights' ? 'short' : 'long' } : mode;
  const L = FILM_LENGTHS[opts.length];
  const excluded = new Set(opts.excluded ?? []);
  const memMap = new Map(memories.map((m) => [m.id, m]));
  const hl = opts.length === 'short';
  const shots: Shot[] = [];
  const chron = [...memories].sort((a, b) => a.date.localeCompare(b.date));
  const first = chron[0]?.date ?? baby.birthDate;
  const last = chron[chron.length - 1]?.date ?? baby.birthDate;
  shots.push({ kind: 'title', dur: hl ? 3.6 : 4.5, title: baby.name, sub: book?.subtitle ?? 'Our Story', line: `${fmtMonthYear(first < baby.birthDate ? first : baby.birthDate)} — ${fmtMonthYear(last)}` });

  // chapters from the book if it exists, otherwise by month
  const groups: { title: string; sub: string; mems: Memory[] }[] = [];
  if (book) {
    let cur: { title: string; sub: string; mems: Memory[] } | null = null;
    for (const p of book.pages) {
      if (p.layout === 'chapter') {
        cur = { title: p.title ?? '', sub: p.subtitle ?? '', mems: [] };
        groups.push(cur);
      } else if (cur) {
        for (const id of p.memoryIds) {
          const m = memMap.get(id);
          if (m && !cur.mems.includes(m)) cur.mems.push(m);
        }
      }
    }
  } else {
    const by = new Map<string, Memory[]>();
    chron.forEach((m) => {
      const k = m.date.slice(0, 7);
      if (!by.has(k)) by.set(k, []);
      by.get(k)!.push(m);
    });
    for (const [, mems] of by) groups.push({ title: fmtMonthYear(mems[0].date), sub: '', mems });
  }

  let seed = 1;
  groups.forEach((g, gi) => {
    const ranked = [...g.mems]
      .filter((m) => !excluded.has(m.id) && m.mediaIds.some((id) => media.get(id)?.kind !== 'audio'))
      .map((m) => ({ m, score: (m.favorite ? 4 : 0) + (m.milestoneId ? 3 : 0) + (m.caption ? 1 : 0) }))
      .sort((a, b) => b.score - a.score);
    const picks = ranked.slice(0, L.perChapter).map((r) => r.m).sort((a, b) => a.date.localeCompare(b.date));
    if (!picks.length) return;
    shots.push({ kind: 'chapter', dur: L.chapter, n: gi + 1, title: g.title, sub: g.sub });
    for (const m of picks) {
      const vid = m.mediaIds.map((id) => media.get(id)).find((x) => x?.kind === 'video');
      const photo = m.mediaIds.map((id) => media.get(id)).find((x) => x?.kind === 'photo');
      if (vid && (!hl || !photo)) shots.push({ kind: 'video', dur: Math.min(L.videoMax, Math.max(3, vid.duration ?? 5)), media: vid, title: m.title, date: fmtLong(m.date), memoryId: m.id });
      else if (photo || vid) shots.push({ kind: 'photo', dur: L.photo, media: (photo ?? vid)!, title: m.title, date: fmtLong(m.date), caption: hl ? undefined : m.caption, milestone: !!m.milestoneId, seed: seed++, memoryId: m.id });
    }
  });
  shots.push({ kind: 'end', dur: 4, title: 'To be continued…', sub: 'Made with NomNoms' });

  let t = 0;
  const timed = shots.map((s) => {
    const r = { ...s, start: t };
    t += s.dur;
    return r;
  });
  return { shots: timed, duration: t };
}

/** Preload everything a timeline needs; returns lookup of drawable sources. */
export async function loadAssets(tl: Timeline, onProgress?: (p: number) => void) {
  const imgs = new Map<string, HTMLImageElement>();
  const vids = new Map<string, HTMLVideoElement>();
  const work = tl.shots.filter((s) => s.kind === 'photo' || s.kind === 'video') as (Extract<Shot, { media: MediaItem }> & { start: number })[];
  let done = 0;
  await Promise.all(
    work.map(async (s) => {
      try {
        if (s.kind === 'video') {
          const url = await MediaService.urlFor(s.media, 'full');
          const poster = await MediaService.urlFor(s.media, 'poster');
          const v = document.createElement('video');
          v.muted = true;
          v.playsInline = true;
          v.preload = 'auto';
          v.crossOrigin = 'anonymous';
          v.src = url!;
          await new Promise<void>((res) => {
            v.onloadeddata = () => res();
            v.onerror = () => res();
            setTimeout(res, 6000);
          });
          vids.set(s.media.id, v);
          if (poster) imgs.set(s.media.id, await loadImg(poster));
        } else {
          const url = s.media.kind === 'video' ? await MediaService.urlFor(s.media, 'poster') : await MediaService.urlFor(s.media, 'full');
          if (url) imgs.set(s.media.id, await loadImg(url));
        }
      } catch {
        /* a missing asset just renders as paper */
      }
      onProgress?.(++done / Math.max(1, work.length));
    }),
  );
  return { imgs, vids };
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

const PAPER = '#f6f1e9';
const INK = '#26221f';
const MUTED = '#8f857b';
const ACCENT = '#b2694b';
const ease = (t: number) => 0.5 - Math.cos(Math.PI * Math.min(1, Math.max(0, t))) / 2;

export function drawFrame(ctx: CanvasRenderingContext2D, tl: Timeline, t: number, assets: Awaited<ReturnType<typeof loadAssets>>) {
  ctx.save();
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, FILM_W, FILM_H);
  const i = tl.shots.findIndex((s) => t >= s.start && t < s.start + s.dur);
  const idx = i < 0 ? tl.shots.length - 1 : i;
  const s = tl.shots[idx];
  const local = t - s.start;
  drawShot(ctx, s, local, assets, 1);
  // crossfade into next shot
  const next = tl.shots[idx + 1];
  if (next && local > s.dur - FADE) {
    const a = ease((local - (s.dur - FADE)) / FADE);
    drawShot(ctx, next, local - s.dur, assets, a);
  }
  // fade in from / out to paper at the very ends
  if (t < 0.6) {
    ctx.globalAlpha = 1 - t / 0.6;
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, FILM_W, FILM_H);
  }
  ctx.restore();
}

function drawShot(ctx: CanvasRenderingContext2D, s: Shot, local: number, assets: Awaited<ReturnType<typeof loadAssets>>, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const p = Math.max(0, local) / s.dur;
  switch (s.kind) {
    case 'title': {
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, FILM_W, FILM_H);
      ctx.textAlign = 'center';
      ctx.fillStyle = MUTED;
      ctx.font = '500 15px Inter, sans-serif';
      spaced(ctx, s.sub.toUpperCase(), FILM_W / 2, 280, 4);
      ctx.fillStyle = INK;
      ctx.font = '400 92px Lora, Georgia, serif';
      ctx.globalAlpha = alpha * ease(p * 3);
      ctx.fillText(s.title, FILM_W / 2, 380 - 12 * (1 - ease(p * 2)));
      ctx.font = 'italic 400 24px Lora, Georgia, serif';
      ctx.fillStyle = '#57504a';
      ctx.fillText(s.line, FILM_W / 2, 440);
      break;
    }
    case 'chapter': {
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, FILM_W, FILM_H);
      ctx.textAlign = 'left';
      ctx.fillStyle = ACCENT;
      ctx.font = '500 14px Inter, sans-serif';
      spaced(ctx, `CHAPTER ${String(s.n).padStart(2, '0')}`, 140, 300, 4, 'left');
      ctx.fillStyle = INK;
      ctx.font = '400 72px Lora, Georgia, serif';
      ctx.fillText(s.title, 136 + 10 * (1 - ease(p * 2)), 390);
      ctx.font = 'italic 400 24px Lora, Georgia, serif';
      ctx.fillStyle = '#57504a';
      ctx.fillText(s.sub, 140, 440);
      ctx.strokeStyle = '#d4c8b8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(140, 480);
      ctx.lineTo(140 + 220 * ease(p * 1.6), 480);
      ctx.stroke();
      break;
    }
    case 'photo':
    case 'video': {
      const img = assets.imgs.get(s.media.id);
      const vid = s.kind === 'video' ? assets.vids.get(s.media.id) : undefined;
      let src: CanvasImageSource | undefined = img;
      let sw = img?.naturalWidth ?? 0;
      let sh = img?.naturalHeight ?? 0;
      if (vid && vid.readyState >= 2) {
        const want = Math.min(local, (vid.duration || 6) - 0.05);
        if (Math.abs(vid.currentTime - want) > 0.25) {
          try { vid.currentTime = Math.max(0, want); } catch { /* ignore */ }
        }
        if (vid.paused && local >= 0) vid.play().catch(() => undefined);
        src = vid;
        sw = vid.videoWidth;
        sh = vid.videoHeight;
      }
      if (src && sw && sh) {
        const portrait = sh > sw;
        if (portrait) {
          // blurred fill + sharp photo on the right, words on the left
          ctx.save();
          ctx.filter = 'blur(36px) brightness(1.05)';
          cover(ctx, src, sw, sh, 0, 0, FILM_W, FILM_H, 1.15, 0.5, 0.5);
          ctx.restore();
          ctx.fillStyle = 'rgba(246,241,233,.82)';
          ctx.fillRect(0, 0, FILM_W, FILM_H);
          const ph = FILM_H - 96;
          const pw = Math.round(ph * 0.8);
          const px = FILM_W - pw - 80;
          ctx.save();
          ctx.shadowColor = 'rgba(40,30,20,.25)';
          ctx.shadowBlur = 40;
          ctx.shadowOffsetY = 14;
          ctx.fillStyle = '#fff';
          ctx.fillRect(px, 48, pw, ph);
          ctx.restore();
          ctx.save();
          ctx.beginPath();
          ctx.rect(px, 48, pw, ph);
          ctx.clip();
          const z = 1.02 + 0.08 * p;
          cover(ctx, src, sw, sh, px, 48, pw, ph, z, 0.5, 0.45 + 0.1 * p);
          ctx.restore();
          words(ctx, s, 120, FILM_W - pw - 240);
        } else {
          const seed = 'seed' in s ? s.seed : 1;
          const z = 1.04 + 0.1 * (seed % 2 ? p : 1 - p);
          cover(ctx, src, sw, sh, 0, 0, FILM_W, FILM_H, z, 0.5 + 0.06 * (seed % 3 - 1) * p, 0.5);
          const g = ctx.createLinearGradient(0, FILM_H * 0.5, 0, FILM_H);
          g.addColorStop(0, 'rgba(25,20,16,0)');
          g.addColorStop(1, 'rgba(25,20,16,.62)');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, FILM_W, FILM_H);
          ctx.fillStyle = '#fffaf2';
          ctx.textAlign = 'left';
          if (s.title) {
            ctx.font = '400 46px Lora, Georgia, serif';
            ctx.fillText(s.title, 80, FILM_H - 104);
          }
          ctx.font = '500 13px Inter, sans-serif';
          ctx.globalAlpha *= 0.85;
          spaced(ctx, s.date.toUpperCase(), 82, FILM_H - 66, 3, 'left');
        }
        if (s.kind === 'video') {
          ctx.globalAlpha = alpha * 0.9;
          ctx.fillStyle = 'rgba(255,250,243,.9)';
          roundRect(ctx, 40, 36, 96, 30, 15);
          ctx.fill();
          ctx.fillStyle = INK;
          ctx.font = '600 12px Inter, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('▶  VIDEO', 58, 56);
        }
      }
      break;
    }
    case 'end': {
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, FILM_W, FILM_H);
      ctx.textAlign = 'center';
      ctx.fillStyle = INK;
      ctx.font = 'italic 400 60px Lora, Georgia, serif';
      ctx.fillText(s.title, FILM_W / 2, 360);
      ctx.fillStyle = MUTED;
      ctx.font = '500 13px Inter, sans-serif';
      spaced(ctx, s.sub.toUpperCase(), FILM_W / 2, 420, 4);
      // fade to paper at the very end
      ctx.globalAlpha = Math.max(0, (p - 0.75) / 0.25);
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, FILM_W, FILM_H);
      break;
    }
  }
  ctx.restore();
}

function words(ctx: CanvasRenderingContext2D, s: Extract<Shot, { media: MediaItem }>, x: number, maxW: number) {
  ctx.textAlign = 'left';
  let y = 250;
  if ('milestone' in s && s.milestone) {
    ctx.fillStyle = ACCENT;
    ctx.font = '500 13px Inter, sans-serif';
    spaced(ctx, 'A FIRST', x, y - 66, 4, 'left');
  }
  ctx.fillStyle = INK;
  ctx.font = '400 52px Lora, Georgia, serif';
  for (const line of wrap(ctx, s.title ?? '', maxW).slice(0, 3)) {
    ctx.fillText(line, x, y);
    y += 60;
  }
  ctx.fillStyle = MUTED;
  ctx.font = '500 13px Inter, sans-serif';
  spaced(ctx, s.date.toUpperCase(), x, y + 4, 3, 'left');
  if ('caption' in s && s.caption) {
    ctx.fillStyle = '#57504a';
    ctx.font = 'italic 400 21px Lora, Georgia, serif';
    let cy = y + 56;
    for (const line of wrap(ctx, s.caption, maxW).slice(0, 6)) {
      ctx.fillText(line, x, cy);
      cy += 32;
    }
  }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const out: string[] = [];
  let line = '';
  for (const w of text.split(/\s+/)) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > max && line) {
      out.push(line);
      line = w;
    } else line = test;
  }
  if (line) out.push(line);
  return out;
}

function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number, align: 'center' | 'left' = 'center') {
  const chars = [...text];
  const w = chars.reduce((a, c) => a + ctx.measureText(c).width + spacing, -spacing);
  let cx = align === 'center' ? x - w / 2 : x;
  const prev = ctx.textAlign;
  ctx.textAlign = 'left';
  for (const c of chars) {
    ctx.fillText(c, cx, y);
    cx += ctx.measureText(c).width + spacing;
  }
  ctx.textAlign = prev;
}

function cover(ctx: CanvasRenderingContext2D, src: CanvasImageSource, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number, zoom: number, fx: number, fy: number) {
  const scale = Math.max(dw / sw, dh / sh) * zoom;
  const w = sw * scale;
  const h = sh * scale;
  const x = dx + (dw - w) * fx;
  const y = dy + (dh - h) * fy;
  ctx.drawImage(src, x, y, w, h);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function pickRecorderType() {
  const types = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
  return types.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(t)) ?? '';
}
