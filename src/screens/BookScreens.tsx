import React, { useMemo, useState } from 'react';
import { BookPageView, type PageContext } from '../book/BookPageView';
import { LAYOUT_LABELS, compatibleLayouts, newSinceBuild, LAYOUT_SLOTS } from '../book/layoutEngine';
import { Reader } from '../book/Reader';
import { Icon } from '../components/Icon';
import { MediaImg } from '../components/Media';
import { PageHeader, Shell } from '../components/Shell';
import { Confirm, Empty, Sheet, toast } from '../components/ui';
import { navigate, useRoute } from '../lib/router';
import type { BookPage, LayoutType, Memory } from '../lib/types';
import { cx, firstName, fmtShort, plural, uid } from '../lib/util';
import { useApp, useChronological } from '../state/store';
import { ShareSheet } from './ShareExport';

/* ───────────── /book ───────────── */
export function BookHome() {
  const { baby, book, memories, media } = useApp();
  const [share, setShare] = useState(false);
  if (!baby) return null;
  const name = firstName(baby.name);
  const ctx: PageContext = { memories: new Map(memories.map((m) => [m.id, m])), media, interactive: false };
  const pending = newSinceBuild(book, memories);

  if (!book) {
    return (
      <Shell>
        <section className="book-intro">
          <div className="book-intro-art reveal" aria-hidden>
            <div className="bi-page bi-0" />
            <div className="bi-page bi-1" />
            <div className="bi-page bi-2"><span className="display">{name}</span><small>Our story</small></div>
          </div>
          <div className="book-intro-text reveal reveal-1">
            <p className="eyebrow">Your baby book</p>
            <h1 className="display">{memories.length ? `${plural(memories.length, 'memory', 'memories')}, ready to become a book.` : 'Your book will build itself.'}</h1>
            <p className="muted">NomNoms sorts everything into chapters, picks the strongest photos, and designs every page — full-bleed photographs, milestone pages, little stories, videos you can play right on the page.</p>
            {memories.length ? (
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/book/build')} data-testid="build-book-main"><Icon name="sparkle" size={18} /> Build my book</button>
            ) : (
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/new?kind=story')}><Icon name="plus" size={18} /> Add a first memory</button>
            )}
          </div>
        </section>
      </Shell>
    );
  }

  const chapters = book.pages.map((p, i) => ({ p, i })).filter(({ p }) => p.layout === 'chapter');
  const sample = book.pages.filter((p) => !['cover', 'chapter', 'closing'].includes(p.layout)).slice(0, 6);

  return (
    <Shell>
      <section className="book-home">
        <div className="book-home-cover reveal" onClick={() => navigate('/read')} role="button" aria-label="Open the book">
          <div className="book-object">
            <BookPageView page={book.pages[0]} ctx={ctx} />
            <span className="book-spine" />
          </div>
        </div>
        <div className="book-home-text reveal reveal-1">
          <p className="eyebrow">{plural(book.pages.length, 'page')} · {plural(chapters.length, 'chapter')} · updated {fmtShort(book.updatedAt.slice(0, 10))}</p>
          <h1 className="display">{book.title}</h1>
          <p className="book-home-sub">{book.subtitle}</p>
          {pending > 0 && (
            <button className="update-banner" onClick={() => navigate('/book/build')}>
              <Icon name="sparkle" size={16} />
              <span><strong>{plural(pending, 'new memory', 'new memories')}</strong> since your last build — update the book</span>
              <Icon name="arrow-right" size={16} />
            </button>
          )}
          <div className="book-actions">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/read')} data-testid="read-book"><Icon name="book" size={18} /> Read</button>
            <button className="btn btn-ghost" onClick={() => navigate('/book/edit')} data-testid="edit-book"><Icon name="layout" size={17} /> Edit pages</button>
            <button className="btn btn-ghost" onClick={() => navigate('/export')}><Icon name="download" size={17} /> Export</button>
            <button className="btn btn-ghost" onClick={() => setShare(true)} data-testid="share-book"><Icon name="share" size={17} /> Share</button>
            <button className="btn btn-ghost" onClick={() => navigate('/film')}><Icon name="film" size={17} /> Memory film</button>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="section-head"><h2 className="display">Contents</h2></div>
        <ol className="contents">
          {chapters.map(({ p, i }, n) => (
            <li key={p.id} className="reveal" style={{ animationDelay: `${n * 40}ms` }}>
              <button onClick={() => navigate(`/read?p=${i}`)}>
                <span className="contents-n">{String(n + 1).padStart(2, '0')}</span>
                <span className="contents-t">{p.title}<small>{p.subtitle}</small></span>
                <span className="contents-p">{i}</span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      <section className="home-section">
        <div className="section-head"><h2 className="display">Inside</h2><button className="link-btn" onClick={() => navigate('/read?p=1')}>Start reading <Icon name="arrow-right" size={15} /></button></div>
        <div className="page-peek">
          {sample.map((p) => (
            <div key={p.id} className="page-peek-item" onClick={() => navigate(`/read?p=${book.pages.indexOf(p)}`)}>
              <BookPageView page={p} ctx={ctx} />
            </div>
          ))}
        </div>
      </section>

      <ShareSheet open={share} onClose={() => setShare(false)} />
    </Shell>
  );
}

/* ───────────── /read ───────────── */
export function ReadScreen() {
  const { book, memories, media } = useApp();
  const { query } = useRoute();
  const [share, setShare] = useState(false);
  const [start] = useState(() => Number(query.get('p') ?? 0) || 0);
  if (!book) {
    return (
      <Shell>
        <Empty icon="book" title="No book yet" body="Build it from your memories first.">
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/book/build')}><Icon name="sparkle" size={16} /> Build my book</button>
        </Empty>
      </Shell>
    );
  }
  return (
    <>
      <Reader
        book={book}
        memories={memories}
        media={media}
        startPage={start}
        onClose={() => navigate('/book')}
        actions={
          <>
            <button className="reader-btn" onClick={() => navigate('/book/edit')} aria-label="Edit pages"><Icon name="layout" /></button>
            <button className="reader-btn" onClick={() => setShare(true)} aria-label="Share"><Icon name="share" /></button>
          </>
        }
      />
      <ShareSheet open={share} onClose={() => setShare(false)} />
    </>
  );
}

/* ───────────── /book/edit ───────────── */
export function BookEditor() {
  const { book, memories, media, saveBook, updateMemory, buildBook, baby } = useApp();
  const chron = useChronological();
  const [sel, setSel] = useState(0);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [picker, setPicker] = useState<'photo' | 'add' | null>(null);
  const [slot, setSlot] = useState(0);
  const memMap = useMemo(() => new Map(memories.map((m) => [m.id, m])), [memories]);

  if (!book || !baby) {
    return (
      <Shell><Empty icon="book" title="Build your book first" body="Then you can tweak anything you like."><button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/book/build')}>Build my book</button></Empty></Shell>
    );
  }
  const pages = book.pages;
  const page = pages[Math.min(sel, pages.length - 1)];
  const ctx: PageContext = { memories: memMap, media, interactive: false };
  const pageMems = page.memoryIds.map((id) => memMap.get(id)).filter(Boolean) as Memory[];

  const commit = async (nextPages: BookPage[], patch: Partial<typeof book> = {}, msg?: string) => {
    await saveBook({ ...book, ...patch, pages: nextPages });
    if (msg) toast(msg, { icon: 'check', ms: 1800 });
  };
  const setPage = (p: BookPage, msg?: string) => commit(pages.map((x) => (x.id === p.id ? p : x)), {}, msg);

  const move = (from: number, to: number) => {
    if (from === to || to < 1 || to >= pages.length || from === 0) return; // cover stays first
    const next = [...pages];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    void commit(next, {}, 'Page moved');
    setSel(to);
  };

  const hidePage = async () => {
    const hidden = new Set(book.hiddenMemoryIds);
    page.memoryIds.forEach((id) => hidden.add(id));
    const next = pages.filter((p) => p.id !== page.id);
    await commit(next, { hiddenMemoryIds: [...hidden] }, page.memoryIds.length ? 'Hidden from the book' : 'Page removed');
    setSel(Math.max(0, sel - 1));
  };

  const inBook = new Set(pages.flatMap((p) => p.memoryIds));
  const addable = chron.filter((m) => !inBook.has(m.id));

  const insertMemory = async (m: Memory) => {
    const photos = m.mediaIds.filter((id) => media.get(id)?.kind === 'photo');
    const vid = m.mediaIds.find((id) => media.get(id)?.kind === 'video');
    const layout: LayoutType = vid ? 'video' : !photos.length ? 'quote' : photos.length === 1 ? 'hero-caption' : photos.length === 2 ? 'two-up' : photos.length === 3 ? 'three-grid' : 'four-grid';
    const np: BookPage = { id: uid('pg'), layout, chapterId: page.chapterId, memoryIds: [m.id], mediaIds: vid ? [vid] : photos.slice(0, LAYOUT_SLOTS[layout] ?? 1) };
    const at = Math.min(sel + 1, pages.length - 1);
    const next = [...pages];
    next.splice(at, 0, np);
    const hidden = book.hiddenMemoryIds.filter((id) => id !== m.id);
    await commit(next, { hiddenMemoryIds: hidden }, 'Page added');
    setSel(at);
    setPicker(null);
  };

  // photos you can swap into this page: its own memories first, then the rest of the chapter
  const chapterMemIds = pages.filter((p) => p.chapterId && p.chapterId === page.chapterId).flatMap((p) => p.memoryIds);
  const swapCandidates = [...new Set([...page.memoryIds, ...chapterMemIds, ...(page.layout === 'cover' ? chron.filter((m) => m.favorite).map((m) => m.id) : [])])]
    .flatMap((id) => memMap.get(id)?.mediaIds ?? [])
    .filter((id) => media.get(id)?.kind === 'photo');

  return (
    <div className="editor-book">
      <header className="eb-top">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/book')}><Icon name="arrow-left" size={16} /> Book</button>
        <div className="eb-title">
          <p className="eyebrow">Editing</p>
          <h1 className="display">{book.title}</h1>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setConfirmRegen(true)}><Icon name="refresh" size={16} /> <span className="hide-mobile">Regenerate</span></button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate(`/read?p=${sel}`)}><Icon name="book" size={16} /> <span className="hide-mobile">Preview</span></button>
        </div>
      </header>

      <div className="eb-layout">
        <div className="eb-pages" role="list" aria-label="Pages — drag to reorder">
          {pages.map((p, i) => (
            <div
              key={p.id}
              role="listitem"
              className={cx('eb-page', i === sel && 'is-on', dragOver === i && 'is-over', i === 0 && 'is-fixed')}
              draggable={i !== 0}
              onDragStart={() => setDragFrom(i)}
              onDragOver={(e) => { e.preventDefault(); if (i !== 0) setDragOver(i); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => { e.preventDefault(); if (dragFrom !== null) move(dragFrom, i); setDragFrom(null); setDragOver(null); }}
              onDragEnd={() => { setDragFrom(null); setDragOver(null); }}
              onClick={() => { setSel(i); setSlot(0); }}
            >
              <BookPageView page={p} ctx={ctx} />
              <span className="eb-page-n">{i === 0 ? 'Cover' : i}</span>
              {i !== 0 && <span className="eb-drag" aria-hidden><Icon name="drag" size={14} /></span>}
            </div>
          ))}
          <button className="eb-page is-add" onClick={() => setPicker('add')}>
            <Icon name="plus" size={22} />
            <span>Add a memory</span>
          </button>
        </div>

        <aside className="eb-panel">
          <div className="eb-preview"><BookPageView page={page} ctx={{ ...ctx, interactive: true }} /></div>
          <div className="eb-controls">
            <div className="row-between">
              <p className="eyebrow">{sel === 0 ? 'Cover' : `Page ${sel}`} · {LAYOUT_LABELS[page.layout]}</p>
              <div className="row" style={{ gap: 4 }}>
                <button className="icon-btn" disabled={sel <= 1} onClick={() => move(sel, sel - 1)} aria-label="Move page earlier"><Icon name="chevron-left" /></button>
                <button className="icon-btn" disabled={sel === 0 || sel >= pages.length - 1} onClick={() => move(sel, sel + 1)} aria-label="Move page later"><Icon name="chevron-right" /></button>
              </div>
            </div>

            {page.layout === 'cover' && (
              <>
                <label className="field"><span>Title</span><input defaultValue={page.title} key={page.id + 't'} onBlur={(e) => setPage({ ...page, title: e.target.value }, 'Saved')} /></label>
                <label className="field"><span>Subtitle</span><input defaultValue={page.subtitle} key={page.id + 's'} onBlur={(e) => commit(pages.map((x) => (x.id === page.id ? { ...page, subtitle: e.target.value } : x)), { subtitle: e.target.value, title: page.title ?? book.title }, 'Saved')} /></label>
              </>
            )}

            {page.layout === 'chapter' && (
              <label className="field">
                <span>Chapter title</span>
                <input
                  key={page.id}
                  defaultValue={page.title}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (!v || v === page.title) return;
                    void commit(pages.map((x) => (x.id === page.id ? { ...page, title: v } : x)), { chapterTitles: { ...book.chapterTitles, [page.chapterId!]: v } }, 'Chapter renamed');
                  }}
                  data-testid="chapter-title"
                />
              </label>
            )}

            {compatibleLayouts(page, Math.max(page.mediaIds.length, pageMems.flatMap((m) => m.mediaIds).filter((id) => media.get(id)?.kind === 'photo').length)).length > 1 && (
              <div className="field-group">
                <p className="eyebrow">Layout</p>
                <div className="chips">
                  {compatibleLayouts(page, pageMems.flatMap((m) => m.mediaIds).filter((id) => media.get(id)?.kind === 'photo').length || page.mediaIds.length).map((l) => (
                    <button key={l} className={cx('chip', page.layout === l && 'is-on')} onClick={() => {
                      const photos = [...new Set([...page.mediaIds, ...pageMems.flatMap((m) => m.mediaIds).filter((id) => media.get(id)?.kind === 'photo')])];
                      setPage({ ...page, layout: l, mediaIds: photos.slice(0, Math.max(1, LAYOUT_SLOTS[l] ?? 1)) });
                    }}>{LAYOUT_LABELS[l]}</button>
                  ))}
                </div>
              </div>
            )}

            {page.mediaIds.length > 0 && page.layout !== 'video' && (
              <div className="field-group">
                <p className="eyebrow">Photos — tap one to change it</p>
                <div className="eb-slots">
                  {page.mediaIds.map((id, i) => (
                    <button key={id + i} className={cx('eb-slot', slot === i && 'is-on')} onClick={() => { setSlot(i); setPicker('photo'); }}>
                      <MediaImg id={id} size="thumb" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {pageMems.map((m) => (
              <div key={m.id} className="field-group eb-mem">
                <p className="eyebrow">{fmtShort(m.date)}</p>
                <input className="eb-mem-title" defaultValue={m.title} key={m.id + 't' + m.updatedAt} placeholder="Title" onBlur={(e) => e.target.value !== (m.title ?? '') && updateMemory(m.id, { title: e.target.value || undefined }).then(() => toast('Caption saved', { icon: 'check', ms: 1600 }))} />
                <textarea className="eb-mem-cap" defaultValue={m.caption} key={m.id + 'c' + m.updatedAt} rows={3} placeholder="Caption" onBlur={(e) => e.target.value !== (m.caption ?? '') && updateMemory(m.id, { caption: e.target.value || undefined }).then(() => toast('Caption saved', { icon: 'check', ms: 1600 }))} data-testid="edit-caption" />
              </div>
            ))}

            {sel !== 0 && page.layout !== 'closing' && (
              <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setPicker('add')}><Icon name="plus" size={15} /> Add a page after</button>
                {page.layout !== 'chapter' && <button className="btn btn-ghost btn-sm" onClick={hidePage} data-testid="hide-page"><Icon name="eye-off" size={15} /> Hide from book</button>}
              </div>
            )}
            {book.hiddenMemoryIds.length > 0 && <p className="muted small">{plural(book.hiddenMemoryIds.length, 'memory', 'memories')} hidden from the book. Add them back with “Add a memory”.</p>}
          </div>
        </aside>
      </div>

      <Sheet open={picker === 'photo'} onClose={() => setPicker(null)} title="Choose a photo" wide>
        <div className="sheet-body photo-picker">
          {[...new Set(swapCandidates)].map((id) => (
            <button key={id} className={cx(page.mediaIds[slot] === id && 'is-on')} onClick={() => {
              const ids = [...page.mediaIds];
              ids[slot] = id;
              const patch: Partial<typeof book> = page.layout === 'cover' ? { coverMediaId: id } : {};
              void commit(pages.map((x) => (x.id === page.id ? { ...page, mediaIds: ids } : x)), patch, 'Photo changed');
              setPicker(null);
            }}>
              <MediaImg id={id} size="thumb" />
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={picker === 'add'} onClose={() => setPicker(null)} title="Add a memory to the book" wide>
        <div className="sheet-body add-mem-list">
          {addable.length === 0 ? <p className="muted">Every memory is already in the book. Add a new one from the timeline and it’ll show up here.</p> : addable.map((m) => (
            <button key={m.id} className="add-mem-row" onClick={() => insertMemory(m)}>
              <span className="add-mem-thumb">{m.mediaIds[0] ? <MediaImg id={m.mediaIds[0]} size="thumb" /> : <Icon name="pen" size={16} />}</span>
              <span><strong>{m.title ?? m.caption?.slice(0, 48) ?? 'A moment'}</strong><small>{fmtShort(m.date)}{book.hiddenMemoryIds.includes(m.id) ? ' · hidden' : ''}</small></span>
              <Icon name="plus" size={16} />
            </button>
          ))}
        </div>
      </Sheet>

      <Confirm
        open={confirmRegen}
        onClose={() => setConfirmRegen(false)}
        title="Regenerate the layout?"
        body="NomNoms will redesign every page from your memories. Hidden memories, chapter titles and your cover photo are kept; manual page order is reset."
        confirmLabel="Regenerate"
        onConfirm={async () => {
          await buildBook();
          setSel(0);
          toast('Fresh layout ready', { icon: 'sparkle' });
        }}
      />
    </div>
  );
}
