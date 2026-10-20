import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookPageView, type PageContext } from '../../book/BookPageView';
import { LAYOUT_LABELS } from '../../book/layoutEngine';
import { Icon } from '../../components/Icon';
import { MediaImg } from '../../components/Media';
import { Spinner, toast } from '../../components/ui';
import { exportBookPdf } from '../../export/pdf';
import type { Book, BookPage, LayoutType, MediaItem, Memory } from '../../lib/types';
import { cx, firstName, todayISO } from '../../lib/util';
import { useAppOptional } from '../../state/store';
import { DemoNote, LabsHeader } from '../LabsHeader';
import { buildDumpling, memoryPhoto, samplePhotosFor } from './generator';
import { CATEGORIES, OCCASIONS, occasionVars, suggestFor, type Category, type Occasion } from './occasions';

/**
 * NomNoms Dumplings, the try-it demo: pick an occasion, drop in photos, get a
 * little themed book. Uses the same page designs as the baby book; the
 * occasion changes the colours, type, motifs and words. Nothing is saved.
 */

const LAYOUTS_FOR: Record<number, LayoutType[]> = { 1: ['hero-caption', 'split', 'full-bleed', 'story'], 2: ['two-up'], 3: ['three-grid', 'collage'], 4: ['four-grid', 'collage'] };

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

export function DumplingsDemo() {
  const app = useAppOptional();
  const [date, setDate] = useState(todayISO());
  const suggestions = useMemo(() => suggestFor(date), [date]);
  const [occasion, setOccasion] = useState<Occasion>(() => suggestFor(todayISO())[0] ?? OCCASIONS.find((o) => o.id === 'first-birthday')!);
  const [cat, setCat] = useState<'Suggested' | Category | 'All'>('Suggested');
  const [query, setQuery] = useState('');
  const [name, setName] = useState(app?.baby ? firstName(app.baby.name) : 'Maya');
  const [place, setPlace] = useState('Stinson Beach');
  const [sampleSeed, setSampleSeed] = useState(3);
  const [photos, setPhotos] = useState<MediaItem[]>(() => samplePhotosFor(occasion, 3));
  const [designSeed, setDesignSeed] = useState(11);
  const [book, setBook] = useState<Book>();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [cur, setCur] = useState(0);
  const [pdf, setPdf] = useState<[number, number] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploads = useRef<string[]>([]);

  useEffect(() => () => uploads.current.forEach((u) => URL.revokeObjectURL(u)), []);

  // pick new sample photos when the occasion changes (keeping any of your own)
  const chooseOccasion = (o: Occasion) => {
    setOccasion(o);
    setPhotos((ps) => {
      const own = ps.filter((p) => p.id.startsWith('up-'));
      return own.length >= 4 ? own : [...own, ...samplePhotosFor(o, sampleSeed)].slice(0, Math.max(11, own.length));
    });
    setCur(0);
    document.getElementById('dp-book')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // (re)design the book whenever its ingredients change
  useEffect(() => {
    const t = setTimeout(() => {
      const { book: b, memories: m } = buildDumpling({ occasion, name, place, date, photos, seed: designSeed });
      setBook(b);
      setMemories(m);
      setCur((c) => Math.min(c, b.pages.length - 1));
    }, 250);
    return () => clearTimeout(t);
  }, [occasion, name, place, date, photos, designSeed]);

  const media = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos]);
  const memMap = useMemo(() => new Map(memories.map((m) => [m.id, m])), [memories]);
  const vars = useMemo(() => occasionVars(occasion), [occasion]);
  const ctx: PageContext = useMemo(() => ({ memories: memMap, media, interactive: false, style: book?.style, vars, decorate: (p: BookPage) => <Decor o={occasion} page={p} /> }), [memMap, media, book?.style, vars, occasion]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? OCCASIONS.filter((o) => `${o.name} ${o.category}`.toLowerCase().includes(q))
      : cat === 'Suggested' ? suggestions : cat === 'All' ? OCCASIONS : OCCASIONS.filter((o) => o.category === cat);
    return list;
  }, [query, cat, suggestions]);

  /* ── editing ─────────────────────────────────────────── */
  const page = book?.pages[cur];
  const pageMem = page ? memMap.get(page.memoryIds[0]) : undefined;
  const setPage = (patch: Partial<BookPage>) => setBook((b) => b && { ...b, pages: b.pages.map((p, i) => (i === cur ? { ...p, ...patch } : p)) });
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
    toast('Page removed', { icon: 'check', ms: 1200 });
  };
  const addPhotos = async (files: File[]) => {
    const items = await Promise.all(files.filter((f) => f.type.startsWith('image/')).slice(0, 24).map(memoryPhoto));
    items.forEach((i) => uploads.current.push(i.storageKey));
    setPhotos((ps) => [...items, ...ps.filter((p) => p.id.startsWith('up-')), ...ps.filter((p) => !p.id.startsWith('up-'))].slice(0, 30));
    if (items.length) toast(`${items.length} photo${items.length > 1 ? 's' : ''} added. They stay on this device and aren’t saved.`, { icon: 'image', ms: 2600 });
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

  return (
    <div className="lab dp">
      <LabsHeader title="Dumplings" />
      <main className="lab-main">
        <section className="lab-hero">
          <p className="eyebrow">NomNoms Dumplings · Demo</p>
          <h1 className="display">A little book for <em>every big day</em></h1>
          <p className="lab-lede">Dump in your photos from a birthday, a holiday or a trip, and get back a little book designed for that occasion. Change the words, the order and the look.</p>
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
              {photos.map((p) => (
                <div key={p.id} className="dp-thumb">
                  <MediaImg item={p} size="thumb" />
                  <button type="button" aria-label="Remove this photo" onClick={() => setPhotos((ps) => ps.filter((x) => x.id !== p.id))}><Icon name="x" size={13} /></button>
                </div>
              ))}
            </div>
            <div className="lab-row">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()} data-testid="dp-add"><Icon name="image" size={15} /> Add your photos</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { const s = sampleSeed + 1; setSampleSeed(s); setPhotos((ps) => [...ps.filter((p) => p.id.startsWith('up-')), ...samplePhotosFor(occasion, s)]); }} data-testid="dp-samples"><Icon name="refresh" size={15} /> Different sample photos</button>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { const f = [...(e.target.files ?? [])]; e.target.value = ''; void addPhotos(f); }} />
            </div>
            <p className="lab-sub">{photos.length} photos. Videos would go into a short film instead, so the book never has gaps.</p>
          </div>
        </section>

        {/* ── 3. the book ─────────────────────────────── */}
        <section className="lab-section" aria-labelledby="dp-book-h" id="dp-book">
          <div className="lab-h"><span className="lab-n">3</span><h2 id="dp-book-h" className="display">Your Dumpling</h2></div>
          {!book || !page ? <div className="dp-loading"><Spinner /></div> : (
            <div className="dp-studio">
              <div className="dp-stage">
                <div className="dp-page" data-testid="dp-page"><BookPageView page={page} ctx={{ ...ctx, pageNumber: cur }} /></div>
                <div className="dp-nav">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCur((c) => Math.max(0, c - 1))} disabled={cur === 0}>Previous</button>
                  <span className="lab-sub">{cur === 0 ? 'Cover' : cur === book.pages.length - 1 ? 'Last page' : `Page ${cur} of ${book.pages.length - 2}`}</span>
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
                  <h3>{page.layout === 'cover' ? 'The cover' : page.layout === 'chapter' ? 'Section page' : page.layout === 'closing' ? 'Last page' : LAYOUT_LABELS[page.layout]}</h3>
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
                  {LAYOUTS_FOR[page.mediaIds.length] && page.layout !== 'cover' && page.layout !== 'chapter' && (
                    <>
                      <p className="lab-sub">Layout</p>
                      <div className="lab-chips is-wrap">
                        {LAYOUTS_FOR[page.mediaIds.length].map((l) => <button key={l} type="button" className="lab-chip" aria-pressed={page.layout === l} onClick={() => setPage({ layout: l })} data-testid={`dp-layout-${l}`}>{LAYOUT_LABELS[l]}</button>)}
                      </div>
                    </>
                  )}
                  {cur > 0 && cur < book.pages.length - 1 && (
                    <div className="lab-row">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => movePage(-1)} disabled={cur <= 1}><Icon name="arrow-left" size={15} /> Earlier</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => movePage(1)} disabled={cur >= book.pages.length - 2}>Later <Icon name="arrow-right" size={15} /></button>
                      <button type="button" className="btn btn-danger-ghost btn-sm" onClick={removePage} data-testid="dp-remove"><Icon name="x" size={15} /> Remove page</button>
                    </div>
                  )}
                </div>
                <div className="lab-card">
                  <h3>The whole book</h3>
                  <p className="lab-sub">{occasion.emoji} {occasion.name} design · {book.pages.length} pages · 8 × 8 in</p>
                  <div className="lab-row">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setDesignSeed((s) => s + 1); toast('A fresh design. Your photos stay the same.', { icon: 'sparkle', ms: 1800 }); }} data-testid="dp-shuffle"><Icon name="sparkle" size={15} /> Try another design</button>
                    <button type="button" className="btn btn-primary btn-sm" onClick={downloadPdf} disabled={!!pdf} data-testid="dp-pdf">
                      {pdf ? <><Spinner size={14} /> Page {Math.min(pdf[0] + 1, pdf[1])} of {pdf[1]}</> : <><Icon name="download" size={15} /> Download PDF</>}
                    </button>
                  </div>
                  <p className="lab-hint">Changing the occasion, photos, name or place designs the book again.</p>
                </div>
              </div>
            </div>
          )}
        </section>

        <p className="lab-fine">A demo of a coming NomNoms feature. Sample photos from <a href="https://unsplash.com/?utm_source=nomnoms&utm_medium=referral" target="_blank" rel="noreferrer">Unsplash</a>. Holiday dates are approximate and only used for suggestions.</p>
      </main>
    </div>
  );
}
