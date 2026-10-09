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
