import React from 'react';
import { navigate } from '../lib/router';
import type { Memory } from '../lib/types';
import { cx, fmtDuration, fmtShort } from '../lib/util';
import { useApp } from '../state/store';
import { Icon } from './Icon';
import { MediaImg } from './Media';

/** One memory as it appears in streams: photo-forward, or a little note card when there's no media. */
export function MemoryCard({ m, size = 'md', className, style, highlight }: {
  m: Memory; size?: 'sm' | 'md' | 'lg'; className?: string; style?: React.CSSProperties; highlight?: boolean;
}) {
  const { media, toggleFavorite } = useApp();
  const items = m.mediaIds.map((id) => media.get(id)).filter(Boolean);
  const visual = items.find((i) => i!.kind !== 'audio');
  const hasAudio = items.some((i) => i!.kind === 'audio');
  const isMilestone = !!m.milestoneId || m.type === 'milestone' || m.type === 'first';
  const open = () => navigate(`/memory/${m.id}`);

  if (!visual) {
    return (
      <article className={cx('mcard is-note', `is-${size}`, isMilestone && 'is-milestone', highlight && 'is-new', className)} style={style} onClick={open} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && open()}>
        <div className="mcard-note">
          {hasAudio && <span className="mcard-badge"><Icon name="mic" size={13} /> Voice note</span>}
          {isMilestone && <span className="mcard-badge is-star"><Icon name="star" size={12} filled /> {m.type === 'first' ? 'First' : 'Milestone'}</span>}
          {m.title && <h3>{m.title}</h3>}
          {m.caption && <p>{m.caption}</p>}
          <time>{fmtShort(m.date)}</time>
        </div>
        <Fav m={m} onToggle={() => toggleFavorite(m.id)} />
      </article>
    );
  }

  const isVideo = visual!.kind === 'video';
  return (
    <article className={cx('mcard', `is-${size}`, isMilestone && 'is-milestone', highlight && 'is-new', className)} style={style} onClick={open} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && open()}>
      <div className="mcard-media">
        <MediaImg item={visual} size={size === 'lg' ? 'full' : 'thumb'} />
        {isVideo && (
          <span className="mcard-play"><Icon name="play" size={11} filled stroke={0} /> {fmtDuration(visual!.duration)}</span>
        )}
        {items.length > 1 && <span className="mcard-count">{items.length}</span>}
        {isMilestone && <span className="mcard-star" title="Milestone"><Icon name="star" size={12} filled /></span>}
      </div>
      <div className="mcard-body">
        {m.title ? <h3>{m.title}</h3> : m.caption ? <h3 className="is-caption">{m.caption}</h3> : null}
        <time>{fmtShort(m.date)}{m.location ? ` · ${m.location}` : ''}</time>
      </div>
      <Fav m={m} onToggle={() => toggleFavorite(m.id)} />
    </article>
  );
}

function Fav({ m, onToggle }: { m: Memory; onToggle: () => void }) {
  return (
    <button
      className={cx('mcard-fav', m.favorite && 'is-on')}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label={m.favorite ? 'Remove from favorites' : 'Add to favorites'}
      aria-pressed={m.favorite}
    >
      <Icon name="heart" size={16} filled={m.favorite} stroke={1.7} />
    </button>
  );
}
