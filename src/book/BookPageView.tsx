import React from 'react';
import { Logo } from '../components/Icon';
import { MediaImg, VideoCard } from '../components/Media';
import type { BookPage, MediaItem, Memory } from '../lib/types';
import { cx, fmtLong, fmtShort } from '../lib/util';

export interface PageContext {
  memories: Map<string, Memory>;
  media: Map<string, MediaItem>;
  pageNumber?: number;
  /** When false (thumbnails, PDF), videos render as stills. */
  interactive?: boolean;
}

/** Scales body text down as it gets longer so every page stays composed. */
function textSize(s?: string) {
  const n = s?.length ?? 0;
  if (n > 420) return 'tx-xs';
  if (n > 300) return 'tx-s';
  if (n > 160) return 'tx-m';
  return 'tx-l';
}

function Caption({ m, align = 'left', showTitle = true }: { m?: Memory; align?: 'left' | 'center'; showTitle?: boolean }) {
  if (!m) return null;
  return (
    <div className={cx('bp-caption', align === 'center' && 'is-center')}>
      {showTitle && m.title && <h3 className="bp-title">{m.title}</h3>}
      <p className="bp-date">{fmtLong(m.date)}{m.location ? ` · ${m.location}` : ''}</p>
      {m.caption && <p className={cx('bp-text', textSize(m.caption))}>{m.caption}</p>}
    </div>
  );
}

function Photo({ id, ctx, className }: { id?: string; ctx: PageContext; className?: string }) {
  const item = id ? ctx.media.get(id) : undefined;
  return (
    <div className={cx('bp-photo', className)}>
      <MediaImg item={item} eager={!ctx.interactive ? true : undefined} />
    </div>
  );
}

export function BookPageView({ page, ctx, className, onClick }: { page: BookPage; ctx: PageContext; className?: string; onClick?: () => void }) {
  const mems = page.memoryIds.map((id) => ctx.memories.get(id)).filter(Boolean) as Memory[];
  const m = page.quiet ? undefined : mems[0];
  const ids = page.mediaIds;
  const pn = ctx.pageNumber;

  let body: React.ReactNode = null;
  switch (page.layout) {
    case 'cover':
      body = (
        <div className="bp-cover">
          <Photo id={ids[0]} ctx={ctx} className="bp-cover-photo" />
          <div className="bp-cover-text">
            <p className="bp-eyebrow">{page.subtitle}</p>
            <h1 className="bp-cover-title">{page.title}</h1>
            {page.text && <p className="bp-cover-dates">{page.text}</p>}
          </div>
        </div>
      );
      break;

    case 'chapter':
      body = (
        <div className="bp-chapter">
          <div className="bp-chapter-text">
            <p className="bp-eyebrow">{page.text}</p>
            <h2 className="bp-chapter-title">{page.title}</h2>
            <p className="bp-chapter-sub">{page.subtitle}</p>
          </div>
          {ids[0] && <Photo id={ids[0]} ctx={ctx} className="bp-chapter-photo" />}
        </div>
      );
      break;

    case 'full-bleed':
      body = (
        <div className="bp-fullbleed">
          <Photo id={ids[0]} ctx={ctx} />
          {m && (
            <div className="bp-fullbleed-cap">
              {m.title && <h3>{m.title}</h3>}
              <p>{fmtLong(m.date)}</p>
            </div>
          )}
        </div>
      );
      break;

    case 'hero-caption':
      body = (
        <div className="bp-hero">
          <Photo id={ids[0]} ctx={ctx} className="bp-hero-photo" />
          <Caption m={m} />
        </div>
      );
      break;

    case 'split':
      body = (
        <div className="bp-split">
          <Photo id={ids[0]} ctx={ctx} className="bp-split-photo" />
          <div className="bp-split-text"><Caption m={m} /></div>
        </div>
      );
      break;

    case 'two-up':
      body = (
        <div className="bp-twoup">
          <div className="bp-twoup-row">
            {ids.slice(0, 2).map((id, i) => (
              <figure key={id + i}>
                <Photo id={id} ctx={ctx} />
                {!page.quiet && mems.length > 1 && mems[i] && <figcaption>{mems[i].title || fmtShort(mems[i].date)}</figcaption>}
              </figure>
            ))}
          </div>
          {page.quiet ? null : mems.length === 1 ? <Caption m={m} /> : <MultiCaption mems={mems} list={false} />}
        </div>
      );
      break;

    case 'three-grid':
      body = (
        <div className="bp-three">
          <div className="bp-three-grid">
            {ids.slice(0, 3).map((id, i) => <Photo key={id + i} id={id} ctx={ctx} className={`slot-${i}`} />)}
          </div>
          {page.quiet ? null : mems.length === 1 ? <Caption m={m} /> : <MultiCaption mems={mems} />}
        </div>
      );
      break;

    case 'four-grid':
      body = (
        <div className="bp-four">
          <div className="bp-four-grid">
            {ids.slice(0, 4).map((id, i) => <Photo key={id + i} id={id} ctx={ctx} />)}
          </div>
          {page.quiet ? null : mems.length === 1 ? <Caption m={m} /> : <MultiCaption mems={mems} />}
        </div>
      );
      break;

    case 'collage':
      body = (
        <div className="bp-collage">
          <div className="bp-collage-grid">
            {ids.slice(0, 5).map((id, i) => <Photo key={id + i} id={id} ctx={ctx} className={`slot-${i}`} />)}
          </div>
          {page.quiet ? null : mems.length === 1 ? <Caption m={m} /> : <MultiCaption mems={mems} />}
        </div>
      );
      break;

    case 'milestone':
      body = page.variant === 'b' && ids[0] ? (
        <div className="bp-milestone-b">
          <Photo id={ids[0]} ctx={ctx} />
          <div className="bp-milestone-b-text">
            <p className="bp-eyebrow">A first · {m ? fmtLong(m.date) : ''}</p>
            <h2 className="bp-milestone-title">{m?.title ?? page.title}</h2>
            {m?.caption && <p className={cx('bp-milestone-text', textSize(m.caption))}>{m.caption}</p>}
          </div>
        </div>
      ) : (
        <div className="bp-milestone">
          <p className="bp-eyebrow">A first</p>
          <h2 className="bp-milestone-title">{m?.title ?? page.title}</h2>
          <p className="bp-milestone-date">{m ? fmtLong(m.date) : ''}</p>
          {ids[0] && <Photo id={ids[0]} ctx={ctx} className="bp-arch" />}
          {m?.caption && <p className={cx('bp-milestone-text', textSize(m.caption))}>{m.caption}</p>}
        </div>
      );
      break;

    case 'story':
      body = (
        <div className="bp-story">
          {ids[0] && <Photo id={ids[0]} ctx={ctx} className="bp-story-photo" />}
          <div className="bp-story-body">
            <p className="bp-eyebrow">{m ? fmtLong(m.date) : ''}</p>
            {m?.title && <h3 className="bp-story-title">{m.title}</h3>}
            {m?.caption && <p className={cx('bp-story-text', textSize(m.caption))}>{m.caption}</p>}
          </div>
        </div>
      );
      break;

    case 'video': {
      const item = ctx.media.get(ids[0]);
      body = (
        <div className="bp-video">
          <div className="bp-video-frame">
            {item && ctx.interactive ? <VideoCard item={item} /> : (
              <div className="video-card">
                <MediaImg item={item} eager />
                {item && <span className="video-play is-static"><span className="video-play-icon">▶</span>{item.duration ? <span>{`0:${String(Math.round(item.duration)).padStart(2, '0')}`}</span> : null}</span>}
              </div>
            )}
          </div>
          <Caption m={m} />
        </div>
      );
      break;
    }

    case 'quote':
      body = (
        <div className="bp-quote">
          <span className="bp-quote-mark" aria-hidden>“</span>
          {m?.caption ? <p className={cx('bp-quote-text', textSize(m.caption))}>{m.caption}</p> : <p className="bp-quote-text tx-l">{m?.title}</p>}
          <div className="bp-quote-meta">
            {m?.caption && m?.title && <p className="bp-quote-title">{m.title}</p>}
            <p className="bp-date">{m ? fmtLong(m.date) : ''}</p>
          </div>
        </div>
      );
      break;

    case 'closing':
      body = (
        <div className="bp-closing">
          <Logo size={34} />
          <h2>{page.title}</h2>
          <p>{page.text}</p>
          <p className="bp-made">Made with NomNoms</p>
        </div>
      );
      break;
  }

  return (
    <div className={cx('bp', `bp-${page.layout}-page`, onClick && 'is-clickable', className)} onClick={onClick} data-layout={page.layout}>
      {body}
      {pn !== undefined && page.layout !== 'cover' && page.layout !== 'full-bleed' && <span className="bp-num">{pn}</span>}
    </div>
  );
}

function MultiCaption({ mems, list = true }: { mems: Memory[]; list?: boolean }) {
  const titled = mems.filter((m) => m.title);
  return (
    <div className="bp-caption bp-multicap">
      <h3 className="bp-title">{titled.length === 1 ? titled[0].title : 'Little moments'}</h3>
      <p className="bp-date">
        {fmtShort(mems[0].date)}
        {mems.length > 1 ? ` – ${fmtShort(mems[mems.length - 1].date)}` : ''}
      </p>
      {list && mems.length > 1 && titled.length > 1 && (
        <p className="bp-text tx-s">{titled.map((m) => m.title).join(' · ')}</p>
      )}
    </div>
  );
}
