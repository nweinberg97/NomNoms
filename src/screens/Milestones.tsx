import React from 'react';
import { Icon } from '../components/Icon';
import { MediaImg } from '../components/Media';
import { PageHeader, Shell } from '../components/Shell';
import { Empty } from '../components/ui';
import { navigate } from '../lib/router';
import { ageLabel, firstName, fmtLong, plural } from '../lib/util';
import { useApp } from '../state/store';
import { SUGGESTED_FIRSTS } from './MemoryEditor';

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');

/** Firsts, big and small — a timeline of what's happened and a quiet list of what's to come. */
export function Milestones() {
  const { baby, milestones, memories } = useApp();
  if (!baby) return null;
  const sorted = [...milestones].sort((a, b) => a.date.localeCompare(b.date));
  const done = new Set(sorted.map((m) => norm(m.title)));
  const doneAlt = (s: string) => {
    const n = norm(s);
    return done.has(n) || [...done].some((d) => d.includes(n.replace('first', '')) && n.replace('first', '').length > 3);
  };
  const upcoming = SUGGESTED_FIRSTS.filter((f) => !doneAlt(f));
  const name = firstName(baby.name);

  return (
    <Shell>
      <PageHeader eyebrow={`${plural(sorted.length, 'milestone')} so far`} title={<>{name}’s firsts</>} sub="The big developmental moments and the tiny family ones — they all count.">
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/new?kind=milestone')} data-testid="add-milestone"><Icon name="star" size={15} /> Add a first</button>
      </PageHeader>

      {sorted.length === 0 ? (
        <Empty icon="star" title="No firsts yet" body={`First smile, first bath, first time ${name} stole someone’s glasses — they’ll gather here.`} />
      ) : (
        <ol className="ms-timeline">
          {sorted.map((ms, i) => {
            const mem = memories.find((m) => m.id === ms.memoryIds[0]);
            return (
              <li key={ms.id} className="ms-item reveal" style={{ animationDelay: `${Math.min(i, 10) * 50}ms` }}>
                <div className="ms-rail"><span className="ms-dot"><Icon name="star" size={11} filled /></span></div>
                <button className="ms-card" onClick={() => mem && navigate(`/memory/${mem.id}`)}>
                  {ms.photoMediaId ? (
                    <div className="ms-photo"><MediaImg id={ms.photoMediaId} size="thumb" /></div>
                  ) : mem ? (
                    <span className="ms-photo is-empty" role="button" tabIndex={0} aria-label="Add a photo" onClick={(e) => { e.stopPropagation(); navigate(`/memory/${mem.id}/edit`); }}>
                      <Icon name="camera" size={20} />
                      <small>Add photo</small>
                    </span>
                  ) : null}
                  <div className="ms-text">
                    <p className="eyebrow">{fmtLong(ms.date)} · {ageLabel(baby.birthDate, ms.date)}</p>
                    <h3 className="display">{ms.title}</h3>
                    {ms.description && <p className="muted ms-desc">{ms.description}</p>}
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {upcoming.length > 0 && (
        <section className="ms-upcoming reveal">
          <p className="eyebrow">Still to come</p>
          <h2 className="display">Firsts to look forward to</h2>
          <div className="chips">
            {upcoming.map((f) => (
              <button key={f} className="chip is-dashed" onClick={() => navigate(`/new?kind=milestone&title=${encodeURIComponent(f)}`)}>
                <Icon name="plus" size={13} /> {f}
              </button>
            ))}
          </div>
          <p className="muted small">Every baby has their own timeline. These are just prompts — never a checklist.</p>
        </section>
      )}
    </Shell>
  );
}
