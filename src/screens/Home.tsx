import React, { useMemo } from 'react';
import { buildChapters } from '../book/chapters';
import { newSinceBuild } from '../book/layoutEngine';
import { Icon } from '../components/Icon';
import { MediaImg } from '../components/Media';
import { MemoryCard } from '../components/MemoryCard';
import { Shell } from '../components/Shell';
import { MakeChoices } from './BookScreens';
import { Empty } from '../components/ui';
import { navigate } from '../lib/router';
import { ageLabel, cx, firstName, fmtLong, fmtShort, plural, todayISO } from '../lib/util';
import { useApp, useChronological } from '../state/store';
import { ui } from '../state/ui';

export function Home() {
  const { baby, memories, milestones, media, book } = useApp();
  const chron = useChronological();
  const chapters = useMemo(() => (baby ? buildChapters(baby, chron, book?.chapterTitles) : []), [baby, chron, book?.chapterTitles]);
  if (!baby) return null;
  const name = firstName(baby.name);
  const latest = chapters[chapters.length - 1];
  const latestMems = latest ? latest.memoryIds.map((id) => memories.find((m) => m.id === id)!).filter(Boolean) : [];
  const heroPhotos = [...latestMems]
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.date.localeCompare(a.date))
    .flatMap((m) => m.mediaIds)
    .filter((id) => media.get(id)?.kind !== 'audio')
    .slice(0, 3);
  const videos = memories.filter((m) => m.mediaIds.some((id) => media.get(id)?.kind === 'video')).length;
  const stories = memories.filter((m) => m.type === 'story').length;
  const pending = newSinceBuild(book, memories);
  const recent = memories.slice(0, 8);
  const recentMilestones = [...milestones].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  // "A year ago today"-style resurfacing
  const t = todayISO();
  const onThisDay = memories.find((m) => m.date.slice(5, 7) === t.slice(5, 7) && m.date.slice(0, 4) < t.slice(0, 4) && m.mediaIds.length);

  return (
    <Shell>
      <section className="home-head">
        <div className="home-id reveal">
          <button className="home-avatar" onClick={() => navigate('/settings')} aria-label="Edit baby details">
            {baby.photoMediaId ? <MediaImg id={baby.photoMediaId} size="thumb" eager /> : <span>{name[0]}</span>}
          </button>
          <div>
            <h1 className="display home-name">{baby.name}</h1>
            <p className="home-meta">Born {fmtLong(baby.birthDate)}{baby.birthPlace ? ` · ${baby.birthPlace}` : ''}</p>
          </div>
        </div>
        <div className="home-age reveal reveal-1">
          <span className="eyebrow">Age</span>
          <span className="home-age-val">{ageLabel(baby.birthDate)}</span>
        </div>
      </section>

      {memories.length === 0 ? (
        <Empty icon="sparkle" title={`${name}’s book starts with one moment`} body="Take a photo, add one from your library, or write a single sentence. NomNoms does the rest.">
          <div className="row-center" style={{ gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => ui.openAdd()} data-testid="empty-add"><Icon name="plus" size={16} stroke={2} /> Add the first memory</button>
          </div>
        </Empty>
      ) : (
        <>
          <section className="story-hero reveal reveal-2" onClick={() => navigate(book ? '/read' : '/book')}>
            <div className={cx('story-hero-photos', `n-${heroPhotos.length}`)}>
              {heroPhotos.map((id, i) => <div key={id} className={`shp shp-${i}`}><MediaImg id={id} eager /></div>)}
            </div>
            <div className="story-hero-text">
              <p className="eyebrow">Your story so far</p>
              {latest && (
                <>
                  <p className="story-hero-ch">Chapter {latest.index + 1}</p>
                  <h2 className="display story-hero-title">{latest.title}</h2>
                  <p className="story-hero-sub">{latest.subtitle}</p>
                </>
              )}
              <div className="stats">
                <Stat n={memories.length} label="memories" />
                <Stat n={milestones.length} label="milestones" />
                <Stat n={videos} label="videos" />
                <Stat n={stories} label="little stories" />
              </div>
            </div>
          </section>

          <section className="home-make reveal reveal-3">
            {book && pending > 0 && (
              <button className="update-banner" onClick={() => navigate('/book/build')} data-testid="build-book">
                <Icon name="sparkle" size={16} />
                <span><strong>{plural(pending, 'new memory', 'new memories')}</strong> to add to {name}’s book. Your edits stay as they are</span>
                <Icon name="arrow-right" size={16} />
              </button>
            )}
            <MakeChoices hasBook={!!book} compact />
          </section>

          {onThisDay && (
            <section className="otd reveal reveal-3" onClick={() => navigate(`/memory/${onThisDay.id}`)}>
              <div className="otd-photo"><MediaImg id={onThisDay.mediaIds[0]} size="thumb" /></div>
              <div>
                <p className="eyebrow">This month, a year ago</p>
                <h3 className="display">{onThisDay.title ?? 'A little moment'}</h3>
                <p className="muted">{fmtLong(onThisDay.date)}</p>
              </div>
              <Icon name="chevron-right" />
            </section>
          )}

          <section className="home-section">
            <div className="section-head">
              <h2 className="display">Recently</h2>
              <a href="#/memories" className="link-btn">All memories <Icon name="arrow-right" size={15} /></a>
            </div>
            <div className="hscroll">
              {recent.map((m, i) => <MemoryCard key={m.id} m={m} size="sm" className={`reveal reveal-${Math.min(i + 1, 6)}`} />)}
            </div>
          </section>

          {recentMilestones.length > 0 && (
            <section className="home-section">
              <div className="section-head">
                <h2 className="display">Milestones</h2>
                <a href="#/milestones" className="link-btn">All firsts <Icon name="arrow-right" size={15} /></a>
              </div>
              <div className="ms-strip">
                {recentMilestones.map((ms) => (
                  <button key={ms.id} className="ms-chip" onClick={() => navigate(`/memory/${ms.memoryIds[0]}`)}>
                    <span className="ms-chip-photo">{ms.photoMediaId ? <MediaImg id={ms.photoMediaId} size="thumb" /> : <Icon name="star" size={16} />}</span>
                    <span className="ms-chip-text">
                      <strong>{ms.title}</strong>
                      <small>{fmtShort(ms.date)}</small>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <section className="quick-add">
        <p className="eyebrow">Capture something</p>
        <div className="quick-add-row">
          <button onClick={() => ui.openAdd('camera-photo')}><Icon name="camera" size={20} /> Photo</button>
          <button onClick={() => ui.openAdd()}><Icon name="image" size={20} /> Library</button>
          <button onClick={() => navigate('/new?kind=story')}><Icon name="pen" size={20} /> Note</button>
          <button onClick={() => navigate('/new?kind=milestone')}><Icon name="star" size={20} /> First</button>
        </div>
      </section>
    </Shell>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="stat">
      <span className="stat-n">{n}</span>
      <span className="stat-l">{label}</span>
    </div>
  );
}
