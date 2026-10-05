import React, { useEffect, useMemo, useState } from 'react';
import { buildChapters } from '../book/chapters';
import { Icon } from '../components/Icon';
import { MemoryCard } from '../components/MemoryCard';
import { PageHeader, Shell } from '../components/Shell';
import { Empty } from '../components/ui';
import { useRoute } from '../lib/router';
import type { Memory } from '../lib/types';
import { cx, plural } from '../lib/util';
import { useApp, useChronological } from '../state/store';
import { ui } from '../state/ui';

type Filter = 'all' | 'photos' | 'videos' | 'milestones' | 'stories' | 'favorites';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'photos', label: 'Photos' },
  { value: 'videos', label: 'Videos' },
  { value: 'milestones', label: 'Milestones' },
  { value: 'stories', label: 'Stories' },
  { value: 'favorites', label: 'Favorites' },
];

/** The archive, laid out like a photo journal: chapter by chapter, newest first. */
export function Memories() {
  const { baby, media, book } = useApp();
  const chron = useChronological();
  const { query } = useRoute();
  const fresh = useMemo(() => new Set((query.get('new') ?? '').split(',').filter(Boolean)), [query]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [chapterId, setChapterId] = useState('all');

  const chapters = useMemo(() => (baby ? buildChapters(baby, chron, book?.chapterTitles) : []), [baby, chron, book?.chapterTitles]);

  useEffect(() => {
    if (fresh.size) {
      const id = [...fresh][0];
      setTimeout(() => document.getElementById(`mem-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250);
    }
  }, [fresh]);

  const kindOf = (m: Memory) => m.mediaIds.map((id) => media.get(id)?.kind);
  const matches = (m: Memory) => {
    const k = kindOf(m);
    switch (filter) {
      case 'photos': if (!k.includes('photo')) return false; break;
      case 'videos': if (!k.includes('video')) return false; break;
      case 'milestones': if (!(m.milestoneId || m.type === 'milestone' || m.type === 'first')) return false; break;
      case 'stories': if (!(m.type === 'story' || (m.caption?.length ?? 0) > 200)) return false; break;
      case 'favorites': if (!m.favorite) return false; break;
    }
    if (!q.trim()) return true;
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const hay = [m.title, m.caption, m.location, m.type, ...m.people, ...m.tags, m.milestoneId ? 'milestone first' : '', m.date]
      .join(' ')
      .toLowerCase();
    return terms.every((t) => hay.includes(t));
  };

  const memMap = useMemo(() => new Map(chron.map((m) => [m.id, m])), [chron]);
  const searching = q.trim().length > 0 || filter !== 'all';
  const visibleChapters = chapters
    .filter((c) => chapterId === 'all' || c.id === chapterId)
    .map((c) => ({ ...c, items: c.memoryIds.map((id) => memMap.get(id)!).filter((m) => m && matches(m)).reverse() }))
    .filter((c) => c.items.length)
    .reverse();
  const total = visibleChapters.reduce((n, c) => n + c.items.length, 0);

  if (!baby) return null;

  return (
    <Shell>
      <PageHeader eyebrow={`${plural(chron.length, 'memory', 'memories')}`} title="Memories">
        <button className="btn btn-primary btn-sm hide-mobile" onClick={() => ui.openAdd()}><Icon name="plus" size={16} stroke={2} /> Add</button>
      </PageHeader>

      <div className="toolbar reveal reveal-1">
        <label className="search">
          <Icon name="search" size={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search — “grandma”, “beach”, “first”…" aria-label="Search memories" data-testid="search" />
          {q && <button onClick={() => setQ('')} aria-label="Clear search"><Icon name="x" size={16} /></button>}
        </label>
        <select className="select" value={chapterId} onChange={(e) => setChapterId(e.target.value)} aria-label="Jump to chapter">
          <option value="all">All chapters</option>
          {[...chapters].reverse().map((c) => <option key={c.id} value={c.id}>{c.title} — {c.subtitle}</option>)}
        </select>
      </div>
      <div className="chips filter-chips reveal reveal-2">
        {FILTERS.map((f) => (
          <button key={f.value} className={cx('chip', filter === f.value && 'is-on')} onClick={() => setFilter(f.value)}>
            {f.value === 'favorites' && <Icon name="heart" size={13} filled={filter === 'favorites'} />}
            {f.label}
          </button>
        ))}
      </div>

      {chron.length === 0 ? (
        <Empty title="Nothing here yet" body="Your first memory will appear right here, already in its chapter.">
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => ui.openAdd()}><Icon name="plus" size={16} /> Add a memory</button>
        </Empty>
      ) : total === 0 ? (
        <Empty icon="search" title="No memories match" body="Try another word, or clear the filters." />
      ) : (
        <div className="timeline">
          {searching && <p className="muted timeline-count">{plural(total, 'memory', 'memories')}</p>}
          {visibleChapters.map((c, ci) => (
            <section key={c.id} className="tl-chapter">
              <header className="tl-head">
                <p className="eyebrow">{c.subtitle}</p>
                <h2 className="display">{c.title}</h2>
                <p className="muted">{plural(c.items.length, 'memory', 'memories')}</p>
              </header>
              <div className={cx('tl-grid', searching && 'is-flat')}>
                {c.items.map((m, i) => {
                  const big = !searching && (i === 0 || (m.favorite && i % 5 === 0));
                  return (
                    <div key={m.id} id={`mem-${m.id}`} className={cx('tl-item', big && 'is-big')} style={{ animationDelay: `${Math.min(i, 8) * 40 + ci * 30}ms` }}>
                      <MemoryCard m={m} size={big ? 'lg' : 'md'} highlight={fresh.has(m.id)} />
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </Shell>
  );
}
