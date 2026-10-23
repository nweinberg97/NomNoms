import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookPageView, type PageContext } from '../../book/BookPageView';
import { LAYOUT_LABELS } from '../../book/layoutEngine';
import { Icon } from '../../components/Icon';
import { MediaImg } from '../../components/Media';
import { Sheet, Spinner, toast } from '../../components/ui';
import { exportBookPdf } from '../../export/pdf';
import type { Book, BookPage, LayoutType, MediaItem, Memory } from '../../lib/types';
import { cx, firstName, todayISO } from '../../lib/util';
import { fitLayout } from '../../screens/BookEditor';
import { useAppOptional } from '../../state/store';
import { DemoNote, LabsHeader } from '../LabsHeader';
import { appendPhotos, buildDumpling, memoryPhoto, samplePhotosFor, type Density } from './generator';
import { CATEGORIES, OCCASIONS, occasionVars, suggestFor, type Category, type Occasion } from './occasions';

/**
 * NomNoms Dumplings, the try-it demo: pick an occasion, drop in photos, get a
 * little themed book. Uses the same page designs as the baby book; the
 * occasion changes the colours, type, motifs and words.
 *
 * Every page can be edited: tap a photo to replace, move or remove it, add
 * photos or pages, change layouts and words. Books grow with the photos (up to
 * 150), and "Book length" decides how many share a page. Nothing is saved.
 */

const MAX_PHOTOS = 150;
const LAYOUTS_FOR: Record<number, LayoutType[]> = { 1: ['hero-caption', 'split', 'full-bleed', 'story'], 2: ['two-up'], 3: ['three-grid', 'collage'], 4: ['four-grid', 'collage'], 5: ['collage'] };
const LENGTHS: { id: Density; label: string; hint: string }[] = [
  { id: 'roomy', label: 'More pages', hint: '1–2 photos a page' },
  { id: 'balanced', label: 'Balanced', hint: '1–4 photos a page' },
  { id: 'compact', label: 'Fewer pages', hint: '2–4 photos a page' },
];

function Decor({ o, page }: { o: Occasion; page: BookPage }) {
  if (!['cover', 'chapter', 'closing'].includes(page.layout)) return null;
  const spots = page.layout === 'cover'
    ? [[2, 2, 10, -12], [86, 3, 9, 10], [4, 91, 5.5, 8], [90, 91, 5.5, -6]]
    : page.layout === 'chapter'
      ? [[78, 8, 9, 10], [88, 26, 6, -8], [8, 6, 6, -10]]
      : [[14, 18, 9, -10], [80, 16, 8, 12], [20, 78, 7, 8], [76, 80, 9, -8], [48, 10, 6, 0]];
  return (
    <div className="dp-decor" aria-hidden="true">
      {spots.map(([x, y, s, r], i) => (
        <span key={i} style={{ left: `${x}%`, top: `${y}%`, fontSize: `${s}cqmin`, transform: `rotate(${r}deg)` }}>{o.motifs[i % o.motifs.length]}</span>
      ))}
      {page.layout !== 'chapter' && Array.from({ length: 14 }, (_, i) => (
        <i key={`c${i}`} style={{ left: `${(i * 37) % 100}%`, top: `${page.layout === 'cover' ? 94 + ((i * 53) % 5) : (i * 29) % 100}%`, background: i % 2 ? o.colors.accent : o.colors.soft }} />
      ))}
    </div>
  );
}

type Picking = { mode: 'replace' | 'add' | 'new-page' | 'cover' } | null;

export function DumplingsDemo() {
  const app = useAppOptional();
  const [date, setDate] = useState(todayISO());
  const suggestions = useMemo(() => suggestFor(date), [date]);
  const [occasion, setOccasion] = useState<Occasion>(() => suggestFor(todayISO())[0] ?? OCCASIONS.find((o) => o.id === 'first-birthday')!);
  const [cat, setCat] = useState<'Suggested' | Category | 'All'>('Suggested');
  const [query, setQuery] = useState('');
  const [name, setName] = useState(app?.baby ? firstName(app.baby.name) : 'Maya');
  const [place, setPlace] = useState('Stinson Beach');
  const [density, setDensity] = useState<Density>('balanced');
  const [sampleSeed, setSampleSeed] = useState(3);
  const [pool, setPool] = useState<MediaItem[]>(() => samplePhotosFor(occasion, 3));
  const [designSeed, setDesignSeed] = useState(11);
  const [book, setBook] = useState<Book>();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [cur, setCur] = useState(0);
  const [slot, setSlot] = useState<number | null>(null);
  const [picking, setPicking] = useState<Picking>(null);
  const [pdf, setPdf] = useState<[number, number] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pickFile = useRef<HTMLInputElement>(null);
  const uploads = useRef<string[]>([]);
  const words = useRef({ name, place, date });

  useEffect(() => () => uploads.current.forEach((u) => URL.revokeObjectURL(u)), []);
  useEffect(() => setSlot(null), [cur]);

  const input = (photos = pool) => ({ occasion, name, place, date, photos, seed: designSeed, density });

  // a full design: when the occasion, the design or the book length changes
  const design = (photos = pool) => {
    const { book: b, memories: m } = buildDumpling(input(photos));
    setBook(b);
    setMemories(m);
    setCur((c) => Math.min(c, b.pages.length - 1));
    words.current = { name, place, date };
  };
  useEffect(() => { design(); }, [occasion, designSeed, density]); // eslint-disable-line react-hooks/exhaustive-deps

  // name, place and date changes are written into the existing book, keeping every edit
  useEffect(() => {
    const prev = words.current;
    if (!book || (prev.name === name && prev.place === place && prev.date === date)) return;
    const swap = (s?: string) => {
      if (!s) return s;
      let out = s;
      if (prev.name && name && prev.name !== name) out = out.split(prev.name).join(name);
      if (prev.place && place && prev.place !== place) out = out.split(prev.place).join(place);
      if (prev.date.slice(0, 4) !== date.slice(0, 4)) out = out.split(prev.date.slice(0, 4)).join(date.slice(0, 4));
      return out;
    };
    setBook((b) => b && { ...b, title: swap(b.title)!, subtitle: swap(b.subtitle)!, pages: b.pages.map((p) => ({ ...p, title: swap(p.title), subtitle: swap(p.subtitle), text: swap(p.text) })) });
    setMemories((ms) => ms.map((m) => ({ ...m, title: swap(m.title), caption: swap(m.caption), date })));
    words.current = { name, place, date };
  }, [name, place, date]); // eslint-disable-line react-hooks/exhaustive-deps

  const media = useMemo(() => new Map(pool.map((p) => [p.id, p])), [pool]);
  const memMap = useMemo(() => new Map(memories.map((m) => [m.id, m])), [memories]);
  const vars = useMemo(() => occasionVars(occasion), [occasion]);
  const ctx: PageContext = useMemo(() => ({ memories: memMap, media, interactive: false, style: book?.style, vars, decorate: (p: BookPage) => <Decor o={occasion} page={p} /> }), [memMap, media, book?.style, vars, occasion]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? OCCASIONS.filter((o) => `${o.name} ${o.category}`.toLowerCase().includes(q))
      : cat === 'Suggested' ? suggestions : cat === 'All' ? OCCASIONS : OCCASIONS.filter((o) => o.category === cat);
  }, [query, cat, suggestions]);

  const chooseOccasion = (o: Occasion) => {
    setOccasion(o);
    const own = pool.filter((p) => p.id.startsWith('up-'));
    if (own.length < 4) setPool([...own, ...samplePhotosFor(o, sampleSeed, Math.max(11, pool.length - own.length))].slice(0, MAX_PHOTOS));
    setCur(0);
    document.getElementById('dp-book')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  // the pool changes with a new occasion; design again once it has
  useEffect(() => { design(); }, [pool.length === 0 ? 0 : pool[0].id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── photos in and out ───────────────────────────────── */
  const addToBook = (items: MediaItem[], quiet = false) => {
    const fresh = items.filter((i) => !media.has(i.id)).slice(0, MAX_PHOTOS - pool.length);
    if (!fresh.length) { toast(`A Dumpling holds up to ${MAX_PHOTOS} photos`, { icon: 'image', ms: 2000 }); return []; }
    const nextPool = [...pool, ...fresh];
    setPool(nextPool);
    if (book) {
      const r = appendPhotos(book, memories, fresh, input(nextPool));
      setBook(r.book);
      setMemories(r.memories);
    }
    if (!quiet) toast(`${fresh.length} photo${fresh.length > 1 ? 's' : ''} added as new pages at the end`, { icon: 'image', ms: 2200 });
    return fresh;
  };
  const upload = async (files: File[], quiet = false) => {
    const items = await Promise.all(files.filter((f) => f.type.startsWith('image/')).slice(0, 100).map(memoryPhoto));
    items.forEach((i) => uploads.current.push(i.storageKey));
    return addToBook(items, quiet);
  };
  const moreSamples = () => {
    const all = samplePhotosFor(occasion, sampleSeed + 1, 80).filter((p) => !media.has(p.id)).slice(0, 10);
    setSampleSeed((s) => s + 1);
    if (!all.length) { toast('That’s every sample photo. Add your own to make it longer.', { icon: 'image', ms: 2200 }); return; }
    addToBook(all);
  };
  const removeFromBook = (id: string) => {
    const nextPool = pool.filter((p) => p.id !== id);
    setPool(nextPool);
    const strip = (p: BookPage): BookPage => {
      if (!p.mediaIds.includes(id)) return p;
      if (p.layout === 'cover') return { ...p, mediaIds: nextPool[0] ? [nextPool[0].id] : [] };
      const ids = p.mediaIds.filter((x) => x !== id);
      return { ...p, mediaIds: ids, layout: ids.length ? fitLayout(p.layout, ids.length) : p.layout };
    };
    const keep = (p: BookPage) => ['cover', 'closing', 'chapter', 'quote'].includes(p.layout) || p.mediaIds.length > 0;
    setBook((b) => b && { ...b, pages: b.pages.map(strip).filter(keep) });
    setCur((c) => Math.min(c, (book?.pages.length ?? 1) - 1));
  };

  /* ── page editing ─────────────────────────────────────── */
  const page = book?.pages[cur];
  const pageMem = page ? memMap.get(page.memoryIds[0]) : undefined;
  const isPhotoPage = !!page && !['cover', 'chapter', 'closing', 'quote'].includes(page.layout);
  const setPage = (patch: Partial<BookPage>) => setBook((b) => b && { ...b, pages: b.pages.map((p, i) => (i === cur ? { ...p, ...patch } : p)) });
  const setPhotos = (ids: string[]) => page && setPage({ mediaIds: ids, layout: isPhotoPage ? fitLayout(page.layout, ids.length) : page.layout });
  const setMem = (patch: Partial<Memory>) => pageMem && setMemories((ms) => ms.map((m) => (m.id === pageMem.id ? { ...m, ...patch } : m)));
  const movePage = (d: number) => {
    if (!book || cur + d < 1 || cur + d >= book.pages.length - 1 || cur === 0 || cur === book.pages.length - 1) return;
    const pages = [...book.pages];
    [pages[cur], pages[cur + d]] = [pages[cur + d], pages[cur]];
    setBook({ ...book, pages });
    setCur(cur + d);
  };
  const removePage = () => {
    if (!book || !page || page.layout === 'cover' || page.layout === 'closing') return;
    setBook({ ...book, pages: book.pages.filter((_, i) => i !== cur) });
    setCur((c) => Math.max(0, c - 1));
    toast('Page removed. Its photos are still in your photos above.', { icon: 'check', ms: 1800 });
  };
  const swapPhoto = (d: number) => {
    if (!page || slot === null || slot + d < 0 || slot + d >= page.mediaIds.length) return;
    const ids = [...page.mediaIds];
    [ids[slot], ids[slot + d]] = [ids[slot + d], ids[slot]];
    setPhotos(ids);
    setSlot(slot + d);
  };
  const removePhoto = () => {
    if (!page || slot === null) return;
    const ids = page.mediaIds.filter((_, i) => i !== slot);
    if (!ids.length) { removePage(); return; }
    setPhotos(ids);
    setSlot(null);
  };
  const addWordsPage = () => {
    if (!book) return;
    const now = new Date().toISOString();
    const m: Memory = { id: `dm-words-${Date.now()}`, babyId: 'demo', type: 'story', title: 'A few words', caption: 'Write something here about this day.', date, mediaIds: [], people: [], tags: [], favorite: false, createdAt: now, updatedAt: now };
    const p: BookPage = { id: `dp-words-${Date.now()}`, layout: 'quote', memoryIds: [m.id], mediaIds: [] };
    const pages = [...book.pages];
    const at = Math.min(cur + 1, pages.length - 1);
    pages.splice(at, 0, p);
    setMemories((ms) => [...ms, m]);
    setBook({ ...book, pages });
    setCur(at);
  };
  const pick = (id: string) => {
    if (!book || !page || !picking) return;
    if (picking.mode === 'replace' && slot !== null) { const ids = [...page.mediaIds]; ids[slot] = id; setPhotos(ids); }
    else if (picking.mode === 'add') setPhotos([...page.mediaIds.filter((x) => x !== id), id].slice(0, 5));
    else if (picking.mode === 'cover') setPage({ mediaIds: [id] });
    else if (picking.mode === 'new-page') {
      const now = new Date().toISOString();
      const m: Memory = { id: `dm-new-${Date.now()}`, babyId: 'demo', type: 'moment', title: 'Another moment', date, mediaIds: [id], people: [], tags: [], favorite: false, createdAt: now, updatedAt: now };
      const p: BookPage = { id: `dp-new-${Date.now()}`, layout: 'hero-caption', memoryIds: [m.id], mediaIds: [id] };
      const pages = [...book.pages];
      const at = Math.min(cur + 1, pages.length - 1);
      pages.splice(at, 0, p);
      setMemories((ms) => [...ms, m]);
      setBook({ ...book, pages });
      setCur(at);
    }
    setPicking(null);
  };
  const downloadPdf = async () => {
    if (!book) return;
    setPdf([0, 1]);
    try {
      await exportBookPdf(book, ctx, (d, t) => setPdf([d, t]));
    } catch (e) {
      toast((e as Error).message || 'The PDF didn’t finish', { icon: 'x' });
    } finally {
      setPdf(null);
    }
  };

  const total = book ? book.pages.length - 2 : 0;
  return (
    <div className="lab dp">
      <LabsHeader title="Dumplings" />
      <main className="lab-main">
        <section className="lab-hero">
          <p className="eyebrow">NomNoms Dumplings · Demo</p>
          <h1 className="display">A little book for <em>every big day</em></h1>
          <p className="lab-lede">Dump in your photos from a birthday, a holiday or a trip, and get back a book designed for that occasion. Add as many photos as you like, and change any page.</p>
          <DemoNote>This demo uses sample photos. Photos you add stay on this device and aren’t saved.</DemoNote>
        </section>

        {/* ── 1. occasion ─────────────────────────────── */}
        <section className="lab-section" aria-labelledby="dp-occ">
          <div className="lab-h"><span className="lab-n">1</span><h2 id="dp-occ" className="display">What’s the occasion?</h2></div>
          <div className="lab-card">
            <div className="dp-find">
              <label className="field"><span>When was it?</span><input type="date" value={date} onChange={(e) => setDate(e.target.value || todayISO())} data-testid="dp-date" /></label>
              <label className="field"><span>Search {OCCASIONS.length} occasions</span><input type="search" value={query} placeholder="Birthday, Diwali, ski trip…" onChange={(e) => setQuery(e.target.value)} data-testid="dp-search" /></label>
            </div>
            {!query && (
              <div className="lab-chips is-scroll" role="tablist">
                {(['Suggested', ...CATEGORIES, 'All'] as const).map((c) => (
                  <button key={c} type="button" role="tab" className="lab-chip" aria-pressed={cat === c} onClick={() => setCat(c)} data-testid={`dp-cat-${c}`}>
                    {c === 'Suggested' ? `For this date${suggestions.length ? ` · ${suggestions.length}` : ''}` : c}
                  </button>
                ))}
              </div>
            )}
            {shown.length === 0 ? (
              <p className="lab-sub">{cat === 'Suggested' && !query ? 'Nothing special on that date. Pick any occasion below, or try another date.' : 'No occasion matches that. Try another word.'}</p>
            ) : (
              <div className="dp-occasions">
                {shown.map((o) => (
                  <button key={o.id} type="button" className="dp-occ" aria-pressed={occasion.id === o.id} onClick={() => chooseOccasion(o)} style={{ background: o.colors.paper, color: o.colors.ink }} data-testid={`occ-${o.id}`}>
                    <span className="dp-occ-emoji">{o.emoji}</span>
                    <strong>{o.name}</strong>
                    <small style={{ color: o.colors.accent }}>{o.category}</small>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── 2. photos and names ─────────────────────── */}
        <section className="lab-section" aria-labelledby="dp-photos">
          <div className="lab-h"><span className="lab-n">2</span><h2 id="dp-photos" className="display">The photos</h2></div>
          <div className="lab-card">
            <div className="dp-find">
              <label className="field"><span>Whose book?</span><input value={name} onChange={(e) => setName(e.target.value)} data-testid="dp-name" /></label>
              {occasion.askPlace && <label className="field"><span>Where did you go?</span><input value={place} onChange={(e) => setPlace(e.target.value)} data-testid="dp-place" /></label>}
            </div>
            <div className="dp-thumbs">
              {pool.map((p) => (
                <div key={p.id} className="dp-thumb">
                  <MediaImg item={p} size="thumb" />
                  <button type="button" aria-label="Take this photo out of the book" onClick={() => removeFromBook(p.id)}><Icon name="x" size={13} /></button>
                </div>
              ))}
            </div>
            <div className="lab-row">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()} data-testid="dp-add"><Icon name="image" size={15} /> Add your photos</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={moreSamples} data-testid="dp-more"><Icon name="plus" size={15} /> 10 more sample photos</button>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { const f = [...(e.target.files ?? [])]; e.target.value = ''; void upload(f); }} />
            </div>
            <p className="lab-sub">{pool.length} of up to {MAX_PHOTOS} photos. Videos would go into a short film instead, so the book never has gaps.</p>
          </div>
        </section>

        {/* ── 3. the book ─────────────────────────────── */}
        <section className="lab-section" aria-labelledby="dp-book-h" id="dp-book">
          <div className="lab-h"><span className="lab-n">3</span><h2 id="dp-book-h" className="display">Your Dumpling</h2></div>
          {!book || !page ? <div className="dp-loading"><Spinner /></div> : (
            <div className="dp-studio">
              <div className="dp-stage">
                <div className="dp-page" data-testid="dp-page">
                  <BookPageView page={page} ctx={{ ...ctx, pageNumber: cur, selectedSlot: slot ?? undefined, onPhotoTap: isPhotoPage || page.layout === 'cover' ? (_id, s) => setSlot(slot === s ? null : s) : undefined }} />
                </div>
                <div className="dp-nav">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCur((c) => Math.max(0, c - 1))} disabled={cur === 0}>Previous</button>
                  <span className="lab-sub">{cur === 0 ? 'Cover' : cur === book.pages.length - 1 ? 'Last page' : `Page ${cur} of ${total}`}</span>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setCur((c) => Math.min(book.pages.length - 1, c + 1))} disabled={cur === book.pages.length - 1} data-testid="dp-next">Next</button>
                </div>
                <nav className="dp-strip" aria-label="All pages">
                  {book.pages.map((p, i) => (
                    <button key={p.id} type="button" className={cx('dp-strip-page', i === cur && 'is-on')} onClick={() => setCur(i)} aria-label={i === 0 ? 'Cover' : `Page ${i}`}>
                      <BookPageView page={p} ctx={ctx} />
                    </button>
                  ))}
                </nav>
              </div>

              <div className="dp-tools">
                <div className="lab-card">
                  <h3>{page.layout === 'cover' ? 'The cover' : page.layout === 'chapter' ? 'Section page' : page.layout === 'closing' ? 'Last page' : page.layout === 'quote' ? 'Words page' : LAYOUT_LABELS[page.layout]}</h3>
                  {(isPhotoPage || page.layout === 'cover') && (
                    slot !== null ? (
                      <div className="dp-slot" data-testid="dp-slot-actions">
                        <p className="lab-sub">Photo {slot + 1} selected</p>
                        <div className="lab-row">
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => setPicking({ mode: 'replace' })} data-testid="dp-replace"><Icon name="refresh" size={15} /> Replace</button>
                          {page.mediaIds.length > 1 && <>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => swapPhoto(-1)} disabled={slot === 0}><Icon name="arrow-left" size={15} /> Earlier</button>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => swapPhoto(1)} disabled={slot >= page.mediaIds.length - 1}>Later <Icon name="arrow-right" size={15} /></button>
                          </>}
                          {page.layout !== 'cover' && <button type="button" className="btn btn-danger-ghost btn-sm" onClick={removePhoto} data-testid="dp-remove-photo"><Icon name="x" size={15} /> Remove from page</button>}
                        </div>
                      </div>
                    ) : (
                      <p className="lab-hint dp-tap">Tap a photo on the page to replace, move or remove it.</p>
                    )
                  )}
                  {page.layout === 'cover' && slot === null && <div className="lab-row"><button type="button" className="btn btn-ghost btn-sm" onClick={() => setPicking({ mode: 'cover' })}><Icon name="image" size={15} /> Change cover photo</button></div>}
                  {isPhotoPage && page.mediaIds.length < 5 && slot === null && (
                    <div className="lab-row"><button type="button" className="btn btn-ghost btn-sm" onClick={() => setPicking({ mode: 'add' })} data-testid="dp-add-to-page"><Icon name="plus" size={15} /> Add a photo to this page</button></div>
                  )}
                  {(page.layout === 'cover' || page.layout === 'chapter' || page.layout === 'closing') && (
                    <label className="field"><span>{page.layout === 'closing' ? 'Closing words' : 'Title'}</span><input value={page.title ?? ''} onChange={(e) => setPage({ title: e.target.value })} data-testid="dp-title" /></label>
                  )}
                  {page.layout === 'cover' && <label className="field"><span>Small line above</span><input value={page.subtitle ?? ''} onChange={(e) => setPage({ subtitle: e.target.value })} /></label>}
                  {pageMem && (
                    <>
                      {page.layout !== 'quote' && <label className="field"><span>Caption</span><input value={pageMem.title ?? ''} onChange={(e) => setMem({ title: e.target.value })} data-testid="dp-caption" /></label>}
                      <label className="field"><span>Words</span><textarea rows={3} value={pageMem.caption ?? ''} placeholder="Add a line about this moment" onChange={(e) => setMem({ caption: e.target.value || undefined })} data-testid="dp-words" /></label>
                    </>
                  )}
                  {isPhotoPage && LAYOUTS_FOR[page.mediaIds.length] && (
                    <>
                      <p className="lab-sub">Layout</p>
                      <div className="lab-chips">
                        {LAYOUTS_FOR[page.mediaIds.length].map((l) => <button key={l} type="button" className="lab-chip" aria-pressed={page.layout === l} onClick={() => setPage({ layout: l })} data-testid={`dp-layout-${l}`}>{LAYOUT_LABELS[l]}</button>)}
                      </div>
                    </>
                  )}
                  {cur > 0 && cur < book.pages.length - 1 && (
                    <div className="lab-row">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => movePage(-1)} disabled={cur <= 1}><Icon name="arrow-left" size={15} /> Move page earlier</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => movePage(1)} disabled={cur >= book.pages.length - 2}>Later <Icon name="arrow-right" size={15} /></button>
                      <button type="button" className="btn btn-danger-ghost btn-sm" onClick={removePage} data-testid="dp-remove"><Icon name="x" size={15} /> Remove page</button>
                    </div>
                  )}
                  <div className="dp-add-page">
                    <p className="lab-sub">Add a page after this one</p>
                    <div className="lab-row">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPicking({ mode: 'new-page' })} disabled={cur === book.pages.length - 1} data-testid="dp-new-photo-page"><Icon name="image" size={15} /> Photo page</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={addWordsPage} disabled={cur === book.pages.length - 1} data-testid="dp-new-words-page"><Icon name="pen" size={15} /> Words page</button>
                    </div>
                  </div>
                </div>
                <div className="lab-card">
                  <h3>The whole book</h3>
                  <p className="lab-sub">{occasion.emoji} {occasion.name} design · {total} pages · {pool.length} photos · 8 × 8 in</p>
                  <p className="lab-sub">Book length</p>
                  <div className="lab-chips" role="radiogroup" aria-label="Book length">
                    {LENGTHS.map((l) => (
                      <button key={l.id} type="button" className="lab-chip" aria-pressed={density === l.id} onClick={() => setDensity(l.id)} data-testid={`dp-length-${l.id}`}>{l.label} <small>· {l.hint}</small></button>
                    ))}
                  </div>
                  <div className="lab-row">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setDesignSeed((s) => s + 1); toast('A fresh design. Your photos stay the same.', { icon: 'sparkle', ms: 1800 }); }} data-testid="dp-shuffle"><Icon name="sparkle" size={15} /> Try another design</button>
                    <button type="button" className="btn btn-primary btn-sm" onClick={downloadPdf} disabled={!!pdf} data-testid="dp-pdf">
                      {pdf ? <><Spinner size={14} /> Page {Math.min(pdf[0] + 1, pdf[1])} of {pdf[1]}</> : <><Icon name="download" size={15} /> Download PDF</>}
                    </button>
                  </div>
                  <p className="lab-hint">Changing the occasion, the book length or “Try another design” lays the book out again. Names, places and added photos keep your edits.</p>
                </div>
              </div>
            </div>
          )}
        </section>

        <p className="lab-fine">A demo of a coming NomNoms feature. Sample photos from <a href="https://unsplash.com/?utm_source=nomnoms&utm_medium=referral" target="_blank" rel="noreferrer">Unsplash</a>. Holiday dates are approximate and only used for suggestions.</p>
      </main>

      <Sheet open={!!picking} onClose={() => setPicking(null)} title={picking?.mode === 'replace' ? 'Replace this photo' : picking?.mode === 'cover' ? 'Choose the cover photo' : picking?.mode === 'new-page' ? 'Pick a photo for the new page' : 'Add a photo to this page'} wide>
        <div className="sheet-body dp-picker">
          <div className="lab-row">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => pickFile.current?.click()}><Icon name="image" size={15} /> From your device</button>
            <input ref={pickFile} type="file" accept="image/*" hidden onChange={async (e) => { const f = [...(e.target.files ?? [])]; e.target.value = ''; const added = await upload(f, true); if (added[0]) pick(added[0].id); }} />
          </div>
          <div className="dp-pick-grid">
            {pool.map((p) => (
              <button key={p.id} type="button" className={cx('dp-pick', page?.mediaIds.includes(p.id) && 'is-on')} onClick={() => pick(p.id)} data-testid="dp-pick">
                <MediaImg item={p} size="thumb" />
              </button>
            ))}
          </div>
        </div>
      </Sheet>
    </div>
  );
}
