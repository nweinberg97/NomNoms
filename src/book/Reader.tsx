import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/ui';
import type { Book, BookPage, MediaItem, Memory } from '../lib/types';
import { cx } from '../lib/util';
import { BookPageView, type PageContext } from './BookPageView';
import { toSpreads } from './layoutEngine';

function useWide() {
  const q = '(min-width: 900px) and (min-aspect-ratio: 1/1)';
  const [wide, setWide] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}

/**
 * Full-screen digital book. Two-page spreads on wide screens, single pages
 * on phones; arrows, keys and swipes turn pages; videos play in place.
 */
export function Reader({ book, memories, media, startPage = 0, onClose, banner, actions }: {
  book: Book;
  memories: Memory[];
  media: Map<string, MediaItem>;
  startPage?: number;
  onClose: () => void;
  banner?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const wide = useWide();
  const pages = book.pages;
  const spreads = useMemo(() => (wide ? toSpreads(pages) : pages.map((p) => [p])), [wide, pages]);
  const spreadOf = useCallback((pageIdx: number) => spreads.findIndex((s) => s.some((p) => p.id === pages[pageIdx]?.id)), [spreads, pages]);
  const [cur, setCur] = useState(() => Math.max(0, spreadOf(startPage)));
  const [dir, setDir] = useState<'next' | 'prev'>('next');
  const [toc, setToc] = useState(false);
  const [thumbs, setThumbs] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const firstPageIdx = (s: number) => pages.findIndex((p) => p.id === spreads[s]?.[0]?.id);

  // keep position when switching between spread and single-page modes
  const lastPage = useRef(startPage);
  useEffect(() => {
    setCur(Math.max(0, spreadOf(lastPage.current)));
  }, [wide]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    lastPage.current = firstPageIdx(cur);
    const url = new URL(window.location.href);
    const h = url.hash.split('?')[0];
    history.replaceState(null, '', `${h}?p=${lastPage.current}`);
  }, [cur]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = useCallback((delta: number) => {
    setCur((c) => {
      const n = Math.min(spreads.length - 1, Math.max(0, c + delta));
      if (n !== c) setDir(delta > 0 ? 'next' : 'prev');
      return n;
    });
  }, [spreads.length]);

  const goToPage = (pageIdx: number) => {
    const s = spreadOf(pageIdx);
    setDir(s >= cur ? 'next' : 'prev');
    setCur(Math.max(0, s));
    setToc(false);
    setThumbs(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'VIDEO') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(-1); }
      if (e.key === 'Escape' && !toc) onClose();
      if (e.key === 'Home') goToPage(0);
      if (e.key === 'End') goToPage(pages.length - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const memMap = useMemo(() => new Map(memories.map((m) => [m.id, m])), [memories]);
  const ctxFor = (p: BookPage): PageContext => ({ memories: memMap, media, interactive: true, pageNumber: pages.indexOf(p) });
  const chapters = pages.map((p, i) => ({ p, i })).filter(({ p }) => p.layout === 'chapter');
  const spread = spreads[cur] ?? [];
  const currentChapter = [...chapters].reverse().find(({ i }) => i <= firstPageIdx(cur));
  const progress = spreads.length > 1 ? cur / (spreads.length - 1) : 1;

  return (
    <div className="reader" data-testid="reader">
      <header className="reader-top">
        <button className="reader-btn" onClick={onClose} aria-label="Close book"><Icon name="x" /></button>
        <button className="reader-title" onClick={() => setToc(true)}>
          <span>{book.title}</span>
          <small>{currentChapter ? currentChapter.p.title : book.subtitle} <Icon name="chevron-down" size={13} /></small>
        </button>
        <div className="reader-actions">
          {actions}
          <button className={cx('reader-btn', thumbs && 'is-on')} onClick={() => setThumbs((t) => !t)} aria-label="All pages"><Icon name="grid" /></button>
        </div>
      </header>
      {banner}

      <div
        className="reader-stage"
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          if (!touch.current) return;
          const dx = e.changedTouches[0].clientX - touch.current.x;
          const dy = e.changedTouches[0].clientY - touch.current.y;
          if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) go(dx < 0 ? 1 : -1);
          touch.current = null;
        }}
      >
        <button className="reader-arrow is-prev" onClick={() => go(-1)} disabled={cur === 0} aria-label="Previous page"><Icon name="chevron-left" size={26} stroke={1.4} /></button>
        <div key={`${cur}-${wide}`} className={cx('spread', wide && 'is-wide', spread.length === 1 && wide && 'is-single', `turn-${dir}`)}>
          {wide && spread.length === 1 && firstPageIdx(cur) === 0 && <div className="spread-blank" />}
          {spread.map((p, i) => (
            <div key={p.id} className={cx('spread-page', wide && (spread.length === 1 && firstPageIdx(cur) === 0 ? 'is-right' : i === 0 ? 'is-left' : 'is-right'))}>
              <BookPageView page={p} ctx={ctxFor(p)} />
            </div>
          ))}
        </div>
        <button className="reader-arrow is-next" onClick={() => go(1)} disabled={cur >= spreads.length - 1} aria-label="Next page" data-testid="next-page"><Icon name="chevron-right" size={26} stroke={1.4} /></button>
      </div>

      <footer className="reader-foot">
        <div className="reader-progress"><span style={{ transform: `scaleX(${progress})` }} /></div>
        <p>{wide && spread.length === 2 ? `${firstPageIdx(cur) + 1}–${firstPageIdx(cur) + 2}` : firstPageIdx(cur) + 1} of {pages.length}</p>
      </footer>

      {thumbs && (
        <div className="reader-thumbs" role="dialog" aria-label="All pages">
          <div className="reader-thumbs-grid">
            {pages.map((p, i) => (
              <button key={p.id} className={cx('reader-thumb', spread.some((s) => s.id === p.id) && 'is-on')} onClick={() => goToPage(i)}>
                <BookPageView page={p} ctx={{ memories: memMap, media, interactive: false }} />
                <span>{i === 0 ? 'Cover' : i}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <Sheet open={toc} onClose={() => setToc(false)} title="Contents">
        <div className="sheet-body toc">
          <button className="toc-row" onClick={() => goToPage(0)}><span>Cover</span><small>—</small></button>
          {chapters.map(({ p, i }, n) => (
            <button key={p.id} className="toc-row" onClick={() => goToPage(i)}>
              <span><em>{String(n + 1).padStart(2, '0')}</em> {p.title}<small className="toc-sub">{p.subtitle}</small></span>
              <small>p. {i}</small>
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
