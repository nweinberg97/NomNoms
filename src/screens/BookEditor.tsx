import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookPageView, type PageContext } from '../book/BookPageView';
import { LAYOUT_LABELS, LAYOUT_SLOTS, compatibleLayouts, generateBook } from '../book/layoutEngine';
import { polishBook } from '../book/polish';
import { PALETTES, SHAPES, TYPES, pageRatio, resolveStyle, type PaletteId, type ShapeId, type TypeId } from '../book/styles';
import { Icon } from '../components/Icon';
import { MediaImg } from '../components/Media';
import { Shell } from '../components/Shell';
import { Confirm, Empty, Segmented, Sheet, Spinner, toast } from '../components/ui';
import { navigate } from '../lib/router';
import type { Book, BookPage, BookStyle, LayoutType, Memory } from '../lib/types';
import { cx, fmtShort, plural, uid } from '../lib/util';
import { useApp, useChronological } from '../state/store';

type Tab = 'photos' | 'layout' | 'words' | 'style' | 'page';
const STRUCTURAL: LayoutType[] = ['cover', 'chapter', 'closing'];
const SINGLE: LayoutType[] = ['full-bleed', 'hero-caption', 'split', 'story', 'milestone'];

/** Pick a layout that fits `n` photos, keeping the current one when it still works. */
export function fitLayout(current: LayoutType, n: number): LayoutType {
  if (STRUCTURAL.includes(current) || current === 'video') return current;
  if (n === 0) return 'quote';
  if (current === 'quote') return n === 1 ? 'hero-caption' : fitLayout('two-up', n);
  if (n === 1) return SINGLE.includes(current) ? current : 'hero-caption';
  if ((LAYOUT_SLOTS[current] ?? 1) === n) return current;
  if (current === 'collage' && n >= 5) return 'collage';
  return n === 2 ? 'two-up' : n === 3 ? 'three-grid' : n === 4 ? 'four-grid' : 'collage';
}

/**
 * The book editor, designed for a phone first:
 *  - a big page preview where every photo can be tapped
 *  - four simple tools: Photos, Layout, Words, Page
 *  - a strip of all pages; moving a page is "tap Move, then tap where"
 *  - Undo for every book change
 * On a computer the same pieces sit side by side, and pages can also be dragged.
 */
export function BookEditor() {
  const { book, memories, media, saveBook, updateMemory, buildBook, baby, ingest } = useApp();
  const chron = useChronological();
  const [sel, setSel] = useState(0);
  const [tab, setTab] = useState<Tab>('photos');
  const [slot, setSlot] = useState<number | null>(null);
  const [moving, setMoving] = useState(false);
  const [picker, setPicker] = useState<'replace' | 'add-photo' | 'add-memory' | null>(null);
  const [history, setHistory] = useState<Book[]>([]);
  const [confirmFresh, setConfirmFresh] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const strip = useRef<HTMLDivElement>(null);
  const memMap = useMemo(() => new Map(memories.map((m) => [m.id, m])), [memories]);

  const pages = book?.pages ?? [];
  const i = Math.min(sel, Math.max(0, pages.length - 1));
  const page = pages[i];

  // keep the selected page visible in the strip
  useEffect(() => {
    strip.current?.querySelector<HTMLElement>(`[data-index="${i}"]`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [i]);
  useEffect(() => setSlot(null), [i]);

  if (!book || !baby || !page) {
    return (
      <Shell>
        <Empty icon="book" title="Make your book first" body="Then you can change anything you like.">
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/book/build')}>Make the book</button>
        </Empty>
      </Shell>
    );
  }

  const pageMems = page.memoryIds.map((id) => memMap.get(id)).filter(Boolean) as Memory[];
  const photoOf = (id: string) => media.get(id)?.kind === 'photo';
  const ctx: PageContext = { memories: memMap, media, interactive: false, style: book.style };

  /* ── every change goes through here, so it can be undone ── */
  const commit = async (nextPages: BookPage[], patch: Partial<Book> = {}, msg?: string) => {
    setHistory((h) => [...h.slice(-29), book]);
    await saveBook({ ...book, ...patch, pages: nextPages });
    if (msg) toast(msg, { icon: 'check', ms: 1500 });
  };
  const setPage = (p: BookPage, msg?: string, patch: Partial<Book> = {}) => commit(pages.map((x) => (x.id === p.id ? { ...p, edited: true } : x)), patch, msg);
  const undo = async () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    await saveBook(prev);
    toast('Undone', { icon: 'undo', ms: 1200 });
  };

  /* ── photos ── */
  const setPhotos = (ids: string[], msg: string) => {
    const layout = fitLayout(page.layout, ids.length);
    const patch: Partial<Book> = page.layout === 'cover' && ids[0] ? { coverMediaId: ids[0] } : {};
    void setPage({ ...page, layout, mediaIds: ids }, msg, patch);
  };
  const movePhoto = (from: number, to: number) => {
    if (to < 0 || to >= page.mediaIds.length) return;
    const ids = [...page.mediaIds];
    [ids[from], ids[to]] = [ids[to], ids[from]];
    setPhotos(ids, 'Photo moved');
    setSlot(to);
  };
  const removePhoto = (at: number) => {
    const ids = page.mediaIds.filter((_, k) => k !== at);
    setPhotos(ids, ids.length ? 'Photo removed from this page' : 'Photo removed. This page now shows just the words');
    setSlot(null);
  };
  const choosePhoto = (id: string) => {
    if (picker === 'replace' && slot !== null) {
      const ids = [...page.mediaIds];
      ids[slot] = id;
      setPhotos(ids, 'Photo changed');
    } else {
      setPhotos([...page.mediaIds.filter((x) => x !== id), id], 'Photo added');
      setSlot(page.mediaIds.length);
    }
    setPicker(null);
  };
  const uploadPhotos = async (files: File[]) => {
    if (!files.length) return;
    const items = await ingest(files);
    const owner = pageMems[0];
    if (owner) await updateMemory(owner.id, { mediaIds: [...owner.mediaIds, ...items.map((x) => x.id)] });
    const newIds = items.filter((x) => x.kind === 'photo').map((x) => x.id);
    if (picker === 'replace' && slot !== null && newIds[0]) {
      const ids = [...page.mediaIds];
      ids[slot] = newIds[0];
      setPhotos([...ids, ...newIds.slice(1)], 'Photo changed');
    } else setPhotos([...page.mediaIds, ...newIds], plural(newIds.length, 'photo') + ' added');
    setPicker(null);
  };

  /* ── pages ── */
  const movePage = (from: number, to: number) => {
    if (from === 0 || to < 1 || from === to) return; // the cover always stays first
    const next = [...pages];
    const [it] = next.splice(from, 1);
    next.splice(to > from ? to - 1 : to, 0, it);
    void commit(next, {}, 'Page moved');
    setSel(to > from ? to - 1 : to);
    setMoving(false);
  };
  const hidePage = async () => {
    const hidden = new Set(book.hiddenMemoryIds);
    page.memoryIds.forEach((id) => hidden.add(id));
    await commit(pages.filter((p) => p.id !== page.id), { hiddenMemoryIds: [...hidden] }, 'Page removed from the book. Your memory is still saved');
    setSel(Math.max(0, i - 1));
  };
  const inBook = new Set(pages.flatMap((p) => p.memoryIds));
  const addable = chron.filter((m) => !inBook.has(m.id));
  const insertMemory = async (m: Memory) => {
    const photos = m.mediaIds.filter(photoOf);
    const vid = m.mediaIds.find((id) => media.get(id)?.kind === 'video');
    const layout: LayoutType = vid && !photos.length ? 'video' : fitLayout('hero-caption', Math.min(photos.length, 5));
    const np: BookPage = { id: uid('pg'), layout, chapterId: page.chapterId, memoryIds: [m.id], mediaIds: layout === 'video' ? [vid!] : photos.slice(0, Math.max(1, LAYOUT_SLOTS[layout] ?? 1)) };
    const at = Math.min(i + 1, pages.length - 1 || 1);
    const next = [...pages];
    next.splice(at, 0, np);
    await commit(next, { hiddenMemoryIds: book.hiddenMemoryIds.filter((id) => id !== m.id) }, 'Page added');
    setSel(at);
    setPicker(null);
  };

  /* ── style ── */
  const style = resolveStyle(book.style);
  const setStyle = (patch: BookStyle, msg: string) => commit(pages, { style: { ...style, ...patch } }, msg);
  const polish = async () => {
    const { book: fresh } = generateBook({ baby, memories: chron, media, previous: book });
    const { book: nicer, changed } = polishBook(book, fresh, media, memMap);
    if (!changed) { toast('Already looking its best. Nothing to change', { icon: 'sparkle', ms: 2200 }); return; }
    await commit(nicer.pages, {});
    toast(`${plural(changed, 'page')} redesigned. Your own changes stayed as they were`, { icon: 'sparkle', ms: 2600 });
  };

  /* ── photo pools for the picker ── */
  const chapterMemIds = pages.filter((p) => p.chapterId && p.chapterId === page.chapterId).flatMap((p) => p.memoryIds);
  const pool = {
    memory: [...new Set(pageMems.flatMap((m) => m.mediaIds).filter(photoOf))],
    chapter: [...new Set(chapterMemIds.flatMap((id) => memMap.get(id)?.mediaIds ?? []).filter(photoOf))],
    all: [...new Set(chron.flatMap((m) => m.mediaIds).filter(photoOf))].reverse(),
  };

  /* ── layout options shown as live mini pages ── */
  const layoutPool = [...new Set([...page.mediaIds, ...pool.memory])];
  const layoutOptions = STRUCTURAL.includes(page.layout) || page.layout === 'video'
    ? []
    : compatibleLayouts(page, layoutPool.length).filter((l) => l !== 'quote' || layoutPool.length === 0 || !!pageMems[0]?.caption);
  const withLayout = (l: LayoutType): BookPage => ({
    ...page,
    layout: l,
    variant: undefined,
    mediaIds: l === 'quote' ? [] : layoutPool.slice(0, Math.max(1, LAYOUT_SLOTS[l] ?? 1)),
  });

  const label = i === 0 ? 'Cover' : page.layout === 'chapter' ? 'Chapter opener' : page.layout === 'closing' ? 'Last page' : `Page ${i}`;
  const canPhotos = page.layout !== 'closing' && page.layout !== 'video';

  return (
    <div className="be" style={{ '--pr': pageRatio(book.style) } as React.CSSProperties}>
      <header className="be-top">
        <button className="icon-btn" onClick={() => navigate('/book')} aria-label="Back to the book"><Icon name="arrow-left" /></button>
        <div className="be-title">
          <p className="eyebrow">Editing your book</p>
          <h1>{label} <span className="muted">· {LAYOUT_LABELS[page.layout]}</span></h1>
        </div>
        <button className="icon-btn" onClick={undo} disabled={!history.length} aria-label="Undo" data-testid="undo"><Icon name="undo" /></button>
        <button className="btn btn-primary btn-sm" onClick={() => navigate(`/read?p=${i}`)}>Preview</button>
      </header>

      <div className="be-body">
        <section className="be-stage">
          <button className="be-nav is-prev" onClick={() => setSel(Math.max(0, i - 1))} disabled={i === 0} aria-label="Previous page"><Icon name="chevron-left" /></button>
          <div className="be-page">
            <BookPageView
              page={page}
              ctx={{
                ...ctx,
                interactive: true,
                selectedSlot: slot ?? undefined,
                onPhotoTap: canPhotos ? (_id, s) => { setTab('photos'); setSlot(s); } : undefined,
              }}
            />
          </div>
          <button className="be-nav is-next" onClick={() => setSel(Math.min(pages.length - 1, i + 1))} disabled={i >= pages.length - 1} aria-label="Next page" data-testid="be-next"><Icon name="chevron-right" /></button>
          {canPhotos && page.mediaIds.length > 0 && slot === null && <p className="be-hint">Tap a photo to change, move or remove it</p>}
          {page.layout === 'video' && <p className="be-hint is-film"><Icon name="film" size={13} /> Only in the film. This page isn’t printed</p>}
        </section>

        <section className="be-tools">
          <Segmented<Tab>
            value={tab}
            onChange={(t) => { setTab(t); setMoving(false); }}
            options={[
              { value: 'photos', label: 'Photos', icon: 'image' },
              { value: 'layout', label: 'Layout', icon: 'layout' },
              { value: 'words', label: 'Words', icon: 'pen' },
              { value: 'style', label: 'Style', icon: 'palette' },
              { value: 'page', label: 'Page', icon: 'book' },
            ]}
          />

          <div className="be-panel">
            {tab === 'photos' && (
              !canPhotos ? (
                <p className="muted">{page.layout === 'video' ? 'This page is a video. Videos play in the film. The book and its PDF leave them out without leaving a gap.' : 'This page has no photos.'}</p>
              ) : (
                <>
                  <div className="be-slots">
                    {page.mediaIds.map((id, k) => (
                      <button key={id + k} className={cx('be-slot', slot === k && 'is-on')} onClick={() => setSlot(slot === k ? null : k)} data-testid={`slot-${k}`}>
                        <MediaImg id={id} size="thumb" />
                        <span>{k + 1}</span>
                      </button>
                    ))}
                    {page.layout !== 'cover' && page.layout !== 'chapter' && page.mediaIds.length < 5 && (
                      <button className="be-slot is-add" onClick={() => setPicker('add-photo')} data-testid="add-photo-to-page">
                        <Icon name="plus" size={20} />
                        <span>Add</span>
                      </button>
                    )}
                  </div>
                  {slot !== null && page.mediaIds[slot] ? (
                    <div className="be-actions" data-testid="photo-actions">
                      <button className="btn btn-primary btn-sm" onClick={() => setPicker('replace')} data-testid="replace-photo"><Icon name="refresh" size={15} /> Replace</button>
                      {page.mediaIds.length > 1 && (
                        <>
                          <button className="btn btn-ghost btn-sm" onClick={() => movePhoto(slot, slot - 1)} disabled={slot === 0} data-testid="photo-earlier"><Icon name="arrow-left" size={15} /> Earlier</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => movePhoto(slot, slot + 1)} disabled={slot >= page.mediaIds.length - 1} data-testid="photo-later">Later <Icon name="arrow-right" size={15} /></button>
                        </>
                      )}
                      {page.layout !== 'cover' && page.layout !== 'chapter' && (
                        <button className="btn btn-danger-ghost btn-sm" onClick={() => removePhoto(slot)} data-testid="remove-photo"><Icon name="x" size={15} /> Remove from page</button>
                      )}
                    </div>
                  ) : (
                    <p className="muted small">{page.mediaIds.length ? 'Choose a photo above, or tap one on the page.' : 'Add a photo to this page.'}</p>
                  )}
                </>
              )
            )}

            {tab === 'layout' && (
              layoutOptions.length > 1 ? (
                <div className="be-layouts" role="list">
                  {layoutOptions.map((l) => (
                    <button key={l} role="listitem" className={cx('be-layout', page.layout === l && 'is-on')} onClick={() => setPage(withLayout(l), `${LAYOUT_LABELS[l]} layout`)} data-testid={`layout-${l}`}>
                      <div className="be-layout-page"><BookPageView page={withLayout(l)} ctx={ctx} /></div>
                      <span>{LAYOUT_LABELS[l]}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="muted">{page.layout === 'cover' || page.layout === 'chapter' ? 'This page has one fixed design. Change its photo in Photos, or its title in Words.' : 'Add another photo to this page to unlock more layouts.'}</p>
              )
            )}

            {tab === 'words' && (
              <div className="be-words">
                {page.layout === 'cover' && (
                  <>
                    <label className="field"><span>Title</span><input defaultValue={page.title} key={page.id + 't'} onBlur={(e) => e.target.value !== page.title && setPage({ ...page, title: e.target.value }, 'Saved', { title: e.target.value })} /></label>
                    <label className="field"><span>Subtitle</span><input defaultValue={page.subtitle} key={page.id + 's'} onBlur={(e) => e.target.value !== page.subtitle && setPage({ ...page, subtitle: e.target.value }, 'Saved', { subtitle: e.target.value })} /></label>
                  </>
                )}
                {page.layout === 'chapter' && (
                  <label className="field">
                    <span>Chapter title</span>
                    <input key={page.id} defaultValue={page.title} data-testid="chapter-title"
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== page.title) void setPage({ ...page, title: v }, 'Chapter renamed', { chapterTitles: { ...book.chapterTitles, [page.chapterId!]: v } });
                      }} />
                  </label>
                )}
                {page.layout === 'closing' && (
                  <>
                    <label className="field"><span>Heading</span><input defaultValue={page.title} key={page.id + 'h'} onBlur={(e) => e.target.value !== page.title && setPage({ ...page, title: e.target.value }, 'Saved')} /></label>
                    <label className="field"><span>Note</span><textarea rows={3} defaultValue={page.text} key={page.id + 'n'} onBlur={(e) => e.target.value !== page.text && setPage({ ...page, text: e.target.value }, 'Saved')} /></label>
                  </>
                )}
                {pageMems.map((m) => (
                  <div key={m.id} className="be-mem">
                    <p className="eyebrow">{fmtShort(m.date)}</p>
                    <input className="eb-mem-title" defaultValue={m.title} key={m.id + 't' + m.updatedAt} placeholder="Title" onBlur={(e) => e.target.value !== (m.title ?? '') && updateMemory(m.id, { title: e.target.value || undefined }).then(() => toast('Saved', { icon: 'check', ms: 1200 }))} />
                    <textarea className="eb-mem-cap" defaultValue={m.caption} key={m.id + 'c' + m.updatedAt} rows={3} placeholder="Caption" onBlur={(e) => e.target.value !== (m.caption ?? '') && updateMemory(m.id, { caption: e.target.value || undefined }).then(() => toast('Saved', { icon: 'check', ms: 1200 }))} data-testid="edit-caption" />
                  </div>
                ))}
                {!pageMems.length && !STRUCTURAL.includes(page.layout) && <p className="muted">This page has no words.</p>}
                <p className="muted small">Words you change here also change the memory itself.</p>
              </div>
            )}

            {tab === 'style' && (
              <div className="be-style" data-testid="style-panel">
                <button className="be-nicer" onClick={polish} data-testid="make-nicer">
                  <span className="be-nicer-icon"><Icon name="sparkle" size={18} /></span>
                  <span><strong>Make it nicer</strong><small>Fits photos to their pages and smooths the rhythm. Your own changes stay.</small></span>
                </button>

                <p className="be-style-h">Colours</p>
                <div className="be-swatches" role="radiogroup" aria-label="Colours">
                  {(Object.keys(PALETTES) as PaletteId[]).map((id) => (
                    <button key={id} role="radio" aria-checked={style.palette === id} className={cx('be-swatch', style.palette === id && 'is-on')} onClick={() => style.palette !== id && setStyle({ palette: id }, `${PALETTES[id].label} colours`)} data-testid={`palette-${id}`}>
                      <span className="be-swatch-chip" style={{ background: PALETTES[id].swatch[0] }}>
                        <i style={{ background: PALETTES[id].swatch[1] }} />
                        <i style={{ background: PALETTES[id].swatch[2] }} />
                      </span>
                      <span>{PALETTES[id].label}</span>
                    </button>
                  ))}
                </div>

                <p className="be-style-h">Type</p>
                <div className="be-types" role="radiogroup" aria-label="Type">
                  {(Object.keys(TYPES) as TypeId[]).map((id) => (
                    <button key={id} role="radio" aria-checked={style.type === id} className={cx('be-type', style.type === id && 'is-on')} onClick={() => style.type !== id && setStyle({ type: id }, `${TYPES[id].label} type`)} data-testid={`type-${id}`}>
                      <span className="be-type-aa" style={{ fontFamily: (TYPES[id].vars['--serif'] as string | undefined) ?? 'var(--serif)' }}>Aa</span>
                      <span><strong>{TYPES[id].label}</strong><small>{TYPES[id].sample}</small></span>
                    </button>
                  ))}
                </div>

                <p className="be-style-h">Page shape</p>
                <div className="be-shapes" role="radiogroup" aria-label="Page shape">
                  {(Object.keys(SHAPES) as ShapeId[]).map((id) => (
                    <button key={id} role="radio" aria-checked={style.shape === id} className={cx('be-shape', style.shape === id && 'is-on')} onClick={() => style.shape !== id && setStyle({ shape: id }, `${SHAPES[id].label} pages · ${SHAPES[id].size}`)} data-testid={`shape-${id}`}>
                      <span className="be-shape-box"><i style={{ aspectRatio: `1 / ${SHAPES[id].ratio}`, height: Math.round(28 * Math.min(1, SHAPES[id].ratio)) }} /></span>
                      <span><strong>{SHAPES[id].label}</strong><small>{SHAPES[id].size}</small></span>
                    </button>
                  ))}
                </div>
                <p className="muted small">Changes the whole book, its PDF and the shared link. Undo goes back.</p>
              </div>
            )}

            {tab === 'page' && (
              <div className="be-actions is-col">
                {i > 0 && (
                  <button className={cx('btn btn-sm', moving ? 'btn-primary' : 'btn-ghost')} onClick={() => setMoving((m) => !m)} data-testid="move-page">
                    <Icon name="drag" size={15} /> {moving ? 'Now tap where it should go ↓' : 'Move this page'}
                  </button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => setPicker('add-memory')}><Icon name="plus" size={15} /> Add a memory after this page</button>
                {i > 0 && !STRUCTURAL.includes(page.layout) && (
                  <button className="btn btn-danger-ghost btn-sm" onClick={hidePage} data-testid="hide-page"><Icon name="eye-off" size={15} /> Remove page from the book</button>
                )}
                {book.hiddenMemoryIds.length > 0 && <p className="muted small">{plural(book.hiddenMemoryIds.length, 'memory', 'memories')} left out of the book. Add them back with “Add a memory”.</p>}
                <hr className="be-hr" />
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirmFresh(true)}><Icon name="refresh" size={15} /> Redesign the whole book</button>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* all pages; in move mode, the gaps become drop targets */}
      <nav className={cx('be-strip', moving && 'is-moving')} ref={strip} aria-label="All pages">
        {pages.map((p, k) => (
          <React.Fragment key={p.id}>
            {moving && k > 0 && k !== i && k !== i + 1 && (
              <button className="be-gap" onClick={() => movePage(i, k)} aria-label={`Move here, before page ${k}`} data-testid={`gap-${k}`}><Icon name="arrow-right" size={14} /></button>
            )}
            <button
              data-index={k}
              className={cx('be-thumb', k === i && 'is-on', dragFrom === k && 'is-dragging')}
              onClick={() => (moving ? null : setSel(k))}
              draggable={k !== 0}
              onDragStart={() => setDragFrom(k)}
              onDragOver={(e) => k !== 0 && e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); if (dragFrom !== null) movePage(dragFrom, k > dragFrom ? k + 1 : k); setDragFrom(null); }}
              onDragEnd={() => setDragFrom(null)}
              aria-current={k === i}
              data-testid={`thumb-${k}`}
            >
              <BookPageView page={p} ctx={ctx} />
              {p.layout === 'video' && <i className="be-film-badge">Film</i>}
              <span>{k === 0 ? 'Cover' : k}</span>
            </button>
          </React.Fragment>
        ))}
        {moving && i !== pages.length - 1 && (
          <button className="be-gap" onClick={() => movePage(i, pages.length)} aria-label="Move to the end" data-testid="gap-end"><Icon name="arrow-right" size={14} /></button>
        )}
      </nav>

      <PhotoPicker
        open={picker === 'replace' || picker === 'add-photo'}
        title={picker === 'replace' ? 'Replace this photo' : 'Add a photo to this page'}
        pool={pool}
        current={slot !== null ? page.mediaIds[slot] : undefined}
        onPick={choosePhoto}
        onUpload={uploadPhotos}
        onClose={() => setPicker(null)}
      />

      <Sheet open={picker === 'add-memory'} onClose={() => setPicker(null)} title="Add a memory to the book" wide>
        <div className="sheet-body add-mem-list">
          {addable.length === 0 ? <p className="muted">Every memory is already in the book.</p> : addable.map((m) => (
            <button key={m.id} className="add-mem-row" onClick={() => insertMemory(m)}>
              <span className="add-mem-thumb">{m.mediaIds[0] ? <MediaImg id={m.mediaIds[0]} size="thumb" /> : <Icon name="pen" size={16} />}</span>
              <span><strong>{m.title ?? m.caption?.slice(0, 48) ?? 'A moment'}</strong><small>{fmtShort(m.date)}{book.hiddenMemoryIds.includes(m.id) ? ' · left out' : ''}</small></span>
              <Icon name="plus" size={16} />
            </button>
          ))}
        </div>
      </Sheet>

      <Confirm
        open={confirmFresh}
        onClose={() => setConfirmFresh(false)}
        title="Redesign the whole book?"
        body="NomNoms will lay out every page again from your memories. Your cover photo, chapter titles and left-out memories are kept, but page order and photo choices start fresh. You can undo this."
        confirmLabel="Redesign"
        onConfirm={async () => {
          setHistory((h) => [...h.slice(-29), book]);
          await buildBook('fresh');
          setSel(0);
          toast('Fresh design ready', { icon: 'sparkle' });
        }}
      />
    </div>
  );
}

function PhotoPicker({ open, title, pool, current, onPick, onUpload, onClose }: {
  open: boolean; title: string; pool: { memory: string[]; chapter: string[]; all: string[] }; current?: string;
  onPick: (id: string) => void; onUpload: (files: File[]) => Promise<void>; onClose: () => void;
}) {
  const [from, setFrom] = useState<'memory' | 'chapter' | 'all'>('memory');
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) setFrom(pool.memory.length > 1 ? 'memory' : pool.chapter.length > 1 ? 'chapter' : 'all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const list = pool[from];
  return (
    <Sheet open={open} onClose={onClose} title={title} wide>
      <div className="sheet-body be-picker">
        <div className="row-between" style={{ flexWrap: 'wrap', gap: 10 }}>
          <Segmented size="sm" value={from} onChange={setFrom} options={[
            { value: 'memory', label: `This memory · ${pool.memory.length}` },
            { value: 'chapter', label: `Chapter · ${pool.chapter.length}` },
            { value: 'all', label: `All · ${pool.all.length}` },
          ]} />
          <button className="btn btn-ghost btn-sm" onClick={() => input.current?.click()} disabled={busy} data-testid="picker-upload">
            {busy ? <Spinner size={14} /> : <Icon name="image" size={15} />} From your phone
          </button>
          <input ref={input} type="file" accept="image/*" multiple hidden data-testid="picker-file" onChange={async (e) => {
            const files = [...(e.target.files ?? [])];
            e.target.value = '';
            setBusy(true);
            try { await onUpload(files); } finally { setBusy(false); }
          }} />
        </div>
        {list.length === 0 ? <p className="muted">No photos here yet. Try “All”, or add one from your phone.</p> : (
          <div className="photo-picker">
            {list.map((id) => (
              <button key={id} className={cx(current === id && 'is-on')} onClick={() => onPick(id)} data-testid="picker-photo">
                <MediaImg id={id} size="thumb" />
              </button>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}
