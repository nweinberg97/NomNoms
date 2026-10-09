import React, { useMemo, useState } from 'react';
import { BookPageView, type PageContext } from '../book/BookPageView';
import { newSinceBuild, printableBook, printablePages } from '../book/layoutEngine';
import { Reader } from '../book/Reader';
import { Icon } from '../components/Icon';
import { Shell } from '../components/Shell';
import { Empty } from '../components/ui';
import { navigate, useRoute } from '../lib/router';
import { cx, firstName, plural } from '../lib/util';
import { useApp } from '../state/store';
import { ShareSheet } from './ShareExport';

/* ───────────── /book ───────────── */

/** The two things NomNoms makes, side by side, so the choice is always clear. */
export function MakeChoices({ hasBook, compact }: { hasBook: boolean; compact?: boolean }) {
  return (
    <div className={cx('make-choices', compact && 'is-compact')}>
      <button className="make-card is-book" onClick={() => navigate(hasBook ? '/book' : '/book/build')} data-testid="make-book">
        <span className="make-icon"><Icon name="book" size={22} /></span>
        <span className="make-text">
          <strong>{hasBook ? 'Your book' : 'Make the book'}</strong>
          <small>Photos and words, designed into pages you can print. Download it as a PDF.</small>
        </span>
        <Icon name="arrow-right" size={18} />
      </button>
      <button className="make-card is-film" onClick={() => navigate('/film')} data-testid="make-film">
        <span className="make-icon"><Icon name="film" size={22} /></span>
        <span className="make-text">
          <strong>Make the film</strong>
          <small>Milestones, photos and video clips as a short movie with music.</small>
        </span>
        <Icon name="arrow-right" size={18} />
      </button>
    </div>
  );
}

export function BookHome() {
  const { baby, book, memories, media } = useApp();
  const [share, setShare] = useState(false);
  const memMap = useMemo(() => new Map(memories.map((m) => [m.id, m])), [memories]);
  const printed = useMemo(() => (book ? printablePages(book.pages, media, memMap) : []), [book, media, memMap]);
  if (!baby) return null;
  const name = firstName(baby.name);
  const ctx: PageContext = { memories: memMap, media, interactive: false };
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
            <p className="eyebrow">Make something to keep</p>
            <h1 className="display">{memories.length ? `${plural(memories.length, 'memory', 'memories')}, ready to become a book or a film.` : 'Your book will build itself.'}</h1>
            <p className="muted">The book is for printing: chapters, the best photos and your words on designed pages. The film is a short movie of the same story, with video clips and music.</p>
            {memories.length ? (
              <MakeChoices hasBook={false} />
            ) : (
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/new?kind=story')}><Icon name="plus" size={18} /> Add a first memory</button>
            )}
          </div>
        </section>
      </Shell>
    );
  }

  const chapters = printed.map((p, i) => ({ p, i })).filter(({ p }) => p.layout === 'chapter');
  const sample = printed.filter((p) => !['cover', 'chapter', 'closing'].includes(p.layout)).slice(0, 6);

  return (
    <Shell>
      <section className="book-home">
        <div className="book-home-cover reveal" onClick={() => navigate('/read')} role="button" aria-label="Open the book">
          <div className="book-object">
            <BookPageView page={printed[0]} ctx={ctx} />
            <span className="book-spine" />
          </div>
        </div>
        <div className="book-home-text reveal reveal-1">
          <p className="eyebrow">The printable book · {plural(printed.length, 'page')} · {plural(chapters.length, 'chapter')}</p>
          <h1 className="display">{book.title}</h1>
          <p className="book-home-sub">{book.subtitle}</p>
          {pending > 0 && (
            <button className="update-banner" onClick={() => navigate('/book/build')} data-testid="update-book">
              <Icon name="sparkle" size={16} />
              <span><strong>{plural(pending, 'new memory', 'new memories')}</strong> to add. Your edits stay as they are</span>
              <Icon name="arrow-right" size={16} />
            </button>
          )}
          <div className="book-actions">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/read')} data-testid="read-book"><Icon name="book" size={18} /> Read</button>
            <button className="btn btn-ghost" onClick={() => navigate('/book/edit')} data-testid="edit-book"><Icon name="layout" size={17} /> Edit & style</button>
            <button className="btn btn-ghost" onClick={() => navigate('/export')} data-testid="book-pdf"><Icon name="download" size={17} /> PDF to print</button>
            <button className="btn btn-ghost" onClick={() => setShare(true)} data-testid="share-book"><Icon name="share" size={17} /> Share</button>
          </div>
          <p className="muted small book-note"><Icon name="film" size={13} /> Videos aren’t printed. They play in the film.</p>
        </div>
      </section>

      <section className="home-section">
        <div className="section-head"><h2 className="display">The film</h2></div>
        <button className="film-cta" onClick={() => navigate('/film')} data-testid="open-film">
          <span className="film-cta-icon"><Icon name="play" size={22} filled stroke={0} /></span>
          <span><strong>Make the film</strong><small>The same story as a short movie, with video clips and music. Watch it here or save it as a video.</small></span>
          <Icon name="arrow-right" size={18} />
        </button>
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
            <div key={p.id} className="page-peek-item" onClick={() => navigate(`/read?p=${printed.indexOf(p)}`)}>
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
        <Empty icon="book" title="No book yet" body="Make it from your memories first.">
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/book/build')}><Icon name="sparkle" size={16} /> Make the book</button>
        </Empty>
      </Shell>
    );
  }
  return (
    <>
      <Reader
        book={printableBook(book, media, new Map(memories.map((m) => [m.id, m])))}
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
