import React, { useState } from 'react';
import { Icon } from '../components/Icon';
import { AudioNote, MediaImg, VideoCard } from '../components/Media';
import { Confirm, toast } from '../components/ui';
import { shareMemory } from '../export/shareCard';
import { navigate } from '../lib/router';
import { cx, fmtLong } from '../lib/util';
import { useApp } from '../state/store';

export function MemoryDetail({ id }: { id: string }) {
  const { memories, media, baby, toggleFavorite, deleteMemory, milestones } = useApp();
  const m = memories.find((x) => x.id === id);
  const [idx, setIdx] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [sharing, setSharing] = useState(false);

  if (!m || !baby) {
    return (
      <div className="detail-missing">
        <p className="muted">This memory isn’t here anymore.</p>
        <button className="btn btn-ghost" onClick={() => navigate('/memories')}>Back to memories</button>
      </div>
    );
  }
  const items = m.mediaIds.map((x) => media.get(x)).filter(Boolean);
  const visuals = items.filter((i) => i!.kind !== 'audio');
  const audio = items.filter((i) => i!.kind === 'audio');
  const cur = visuals[idx];
  const ms = milestones.find((x) => x.id === m.milestoneId);
  const i = memories.indexOf(m);
  const newer = memories[i - 1];
  const older = memories[i + 1];

  const share = async () => {
    setSharing(true);
    try {
      const r = await shareMemory(m, { memories: new Map(memories.map((x) => [x.id, x])), media });
      toast(r === 'shared' ? 'Shared' : 'Saved a memory card to your downloads', { icon: 'check' });
    } catch (e) {
      console.error(e);
      toast('Couldn’t make the card here — try again', { icon: 'x' });
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="detail">
      <header className="detail-top">
        <button className="icon-btn" onClick={() => (history.length > 1 ? history.back() : navigate('/memories'))} aria-label="Back"><Icon name="arrow-left" /></button>
        <div className="row" style={{ gap: 4 }}>
          <button className={cx('icon-btn', m.favorite && 'is-fav')} onClick={() => toggleFavorite(m.id)} aria-label={m.favorite ? 'Unfavorite' : 'Favorite'} aria-pressed={m.favorite}>
            <Icon name="heart" filled={m.favorite} />
          </button>
          <button className="icon-btn" onClick={share} disabled={sharing} aria-label="Share this memory"><Icon name="share" /></button>
          <button className="icon-btn" onClick={() => navigate(`/memory/${m.id}/edit`)} aria-label="Edit"><Icon name="pen" /></button>
          <button className="icon-btn" onClick={() => setConfirm(true)} aria-label="Delete"><Icon name="trash" /></button>
        </div>
      </header>

      <div className="detail-layout">
        {visuals.length > 0 && (
          <div className="detail-media reveal">
            <div className="detail-stage">
              {cur!.kind === 'video' ? <VideoCard key={cur!.id} item={cur!} /> : <MediaImg key={cur!.id} item={cur} eager />}
              {visuals.length > 1 && (
                <>
                  <button className="detail-nav is-prev" onClick={() => setIdx((idx - 1 + visuals.length) % visuals.length)} aria-label="Previous"><Icon name="chevron-left" /></button>
                  <button className="detail-nav is-next" onClick={() => setIdx((idx + 1) % visuals.length)} aria-label="Next"><Icon name="chevron-right" /></button>
                </>
              )}
            </div>
            {visuals.length > 1 && (
              <div className="detail-dots">
                {visuals.map((v, j) => <button key={v!.id} className={cx(j === idx && 'is-on')} onClick={() => setIdx(j)} aria-label={`Photo ${j + 1}`} />)}
              </div>
            )}
          </div>
        )}

        <article className={cx('detail-text reveal reveal-1', !visuals.length && 'is-text-only')}>
          {ms && <p className="detail-ms"><Icon name="star" size={13} filled /> {ms.title}</p>}
          <p className="eyebrow">{fmtLong(m.date)}{m.location ? ` · ${m.location}` : ''}</p>
          {m.title && <h1 className="display detail-title">{m.title}</h1>}
          {m.caption && <p className="detail-caption">{m.caption}</p>}
          {audio.map((a) => <AudioNote key={a!.id} item={a!} />)}
          {(m.people.length > 0 || m.tags.length > 0) && (
            <div className="chips detail-chips">
              {m.people.map((p) => <span key={p} className="chip is-static"><Icon name="user" size={13} /> {p}</span>)}
              {m.tags.map((t) => <span key={t} className="chip is-static">#{t}</span>)}
            </div>
          )}
          {!m.caption && !m.title && (
            <button className="link-btn" onClick={() => navigate(`/memory/${m.id}/edit`)}>+ Add a few words about this</button>
          )}
        </article>
      </div>

      <nav className="detail-pager">
        {older ? <button onClick={() => { setIdx(0); navigate(`/memory/${older.id}`, { replace: true }); }}><Icon name="arrow-left" size={16} /> <span>{older.title ?? 'Earlier'}</span></button> : <span />}
        {newer ? <button onClick={() => { setIdx(0); navigate(`/memory/${newer.id}`, { replace: true }); }}><span>{newer.title ?? 'Later'}</span> <Icon name="arrow-right" size={16} /></button> : <span />}
      </nav>

      <Confirm
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Delete this memory?"
        body="It will be removed from the timeline and the book. This can’t be undone."
        confirmLabel="Delete"
        danger
        onConfirm={async () => {
          await deleteMemory(m.id);
          toast('Memory deleted', { icon: 'trash' });
          navigate('/memories', { replace: true });
        }}
      />
    </div>
  );
}
