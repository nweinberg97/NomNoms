import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { MediaImg } from '../components/Media';
import { Spinner, toast } from '../components/ui';
import { navigate, useRoute } from '../lib/router';
import type { Memory, MemoryType } from '../lib/types';
import { cx, firstName, fmtLong, fmtMonthYear, plural, toISODate, todayISO } from '../lib/util';
import { useApp } from '../state/store';
import { pendingCapture } from '../state/ui';
import { EDITOR_DROP_EVENT } from '../components/DropZone';

const TYPES: { value: MemoryType; label: string }[] = [
  { value: 'moment', label: 'Everyday moment' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'first', label: 'First' },
  { value: 'funny', label: 'Funny' },
  { value: 'family', label: 'Family' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'story', label: 'Story' },
];

export const SUGGESTED_FIRSTS = [
  'First smile', 'First laugh', 'First bath', 'Rolled over', 'Sat up', 'First crawl', 'First steps', 'First word',
  'First tooth', 'First haircut', 'First solid food', 'First trip', 'First time at the beach', 'Met grandparents',
  'First Christmas', 'First birthday', 'Slept through the night', 'First wave',
];

interface Local {
  file: File;
  url: string;
  kind: 'photo' | 'video' | 'audio';
}

/**
 * The lightweight editor between capture and the book. Everything is optional:
 * a photo can be saved with nothing but the date it was taken.
 */
export function MemoryEditor({ editId }: { editId?: string }) {
  const { baby, memories, addMemory, updateMemory, addMediaToMemory, media } = useApp();
  const { query } = useRoute();
  const editing = editId ? memories.find((m) => m.id === editId) : undefined;
  const kindParam = (query.get('kind') as MemoryType | 'voice' | null) ?? undefined;

  const [capture] = useState(() => (editId ? null : pendingCapture.peek()));
  const kind = capture?.kind ?? kindParam;
  const [locals, setLocals] = useState<Local[]>(() =>
    (capture?.files ?? []).map((f) => ({
      file: f,
      url: URL.createObjectURL(f),
      kind: f.type.startsWith('video') ? 'video' : f.type.startsWith('audio') ? 'audio' : 'photo',
    })),
  );

  // date guess: when the photos were taken (file timestamps), else today
  const guessed = useMemo(() => {
    const stamps = locals.map((l) => l.file.lastModified).filter(Boolean);
    if (!stamps.length) return todayISO();
    const d = toISODate(new Date(Math.min(...stamps)));
    return baby && d < baby.birthDate ? todayISO() : d;
  }, [locals, baby]);

  const isMilestoneFlow = kind === 'milestone' || kind === 'first';
  const [title, setTitle] = useState(editing?.title ?? capture?.presetTitle ?? query.get('title') ?? '');
  const [caption, setCaption] = useState(editing?.caption ?? '');
  const [date, setDate] = useState(editing?.date ?? guessed);
  const [type, setType] = useState<MemoryType>(editing?.type ?? (kind === 'story' ? 'story' : isMilestoneFlow ? 'milestone' : 'moment'));
  const [people, setPeople] = useState<string[]>(editing?.people ?? []);
  const [location, setLocation] = useState(editing?.location ?? '');
  const [favorite, setFavorite] = useState(editing?.favorite ?? false);
  const [details, setDetails] = useState(!!editing || isMilestoneFlow);
  const [newPerson, setNewPerson] = useState('');
  const [busy, setBusy] = useState(false);
  const [groupByDay, setGroupByDay] = useState(true);
  const picker = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing && locals.length) setDate(guessed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guessed]);
  useEffect(() => () => locals.forEach((l) => URL.revokeObjectURL(l.url)), []); // eslint-disable-line react-hooks/exhaustive-deps
  const addFiles = (files: File[]) =>
    setLocals((l) => [...l, ...files.map((f) => ({ file: f, url: URL.createObjectURL(f), kind: (f.type.startsWith('video') ? 'video' : 'photo') as Local['kind'] }))]);

  useEffect(() => {
    const onDrop = (e: Event) => addFiles((e as CustomEvent<File[]>).detail);
    window.addEventListener(EDITOR_DROP_EVENT, onDrop);
    return () => window.removeEventListener(EDITOR_DROP_EVENT, onDrop);
  });

  const days = useMemo(() => {
    const map = new Map<string, Local[]>();
    for (const l of locals) {
      const d = l.file.lastModified ? toISODate(new Date(l.file.lastModified)) : date;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(l);
    }
    return map;
  }, [locals, date]);
  const multiDay = !editing && days.size > 1 && locals.length > 1;

  if (!baby) return null;
  const name = firstName(baby.name);
  const allPeople = [...new Set([...baby.people, ...people])];
  const placeholder =
    type === 'story' ? `Tell ${name} about today…`
      : isMilestoneFlow || type === 'milestone' || type === 'first' ? `What happened? How did it feel?`
        : locals.length ? 'What happened? (optional)' : `What do you want to remember?`;

  const canSave = !!(locals.length || caption.trim() || title.trim() || (editing && editing.mediaIds.length));

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    try {
      if (editing) {
        await updateMemory(editing.id, { title: title.trim() || undefined, caption: caption.trim() || undefined, date, type, people, location: location.trim() || undefined, favorite });
        if (locals.length) await addMediaToMemory(editing.id, locals.map((l) => l.file));
        toast('Saved', { icon: 'check' });
        navigate(`/memory/${editing.id}`, { replace: true });
        return;
      }
      const base = { type, people, location, favorite, milestoneTitle: type === 'milestone' || type === 'first' ? title || undefined : undefined };
      let created: Memory[] = [];
      if (multiDay && groupByDay) {
        // a big import: one memory per day, the editor's words go on the first
        let first = true;
        for (const [d, ls] of [...days.entries()].sort()) {
          created.push(await addMemory({ ...base, date: d, files: ls.map((l) => l.file), title: first ? title : undefined, caption: first ? caption : undefined, milestoneTitle: first ? base.milestoneTitle : undefined }));
          first = false;
        }
      } else {
        created = [await addMemory({ ...base, date, files: locals.map((l) => l.file), title, caption })];
      }
      pendingCapture.take();
      const m = created[created.length - 1];
      toast(created.length > 1 ? `${created.length} memories added across ${days.size} days` : `Added to ${fmtMonthYear(m.date)}`, { icon: 'check' });
      navigate(`/memories?new=${created.map((c) => c.id).join(',')}`, { replace: true });
    } catch (e) {
      console.error(e);
      toast('Something went wrong saving that. Please try again.', { icon: 'x' });
    } finally {
      setBusy(false);
    }
  };

  const existing = editing ? editing.mediaIds.map((id) => media.get(id)).filter(Boolean) : [];

  return (
    <div className="editor">
      <header className="editor-top">
        <button className="icon-btn" onClick={() => (history.length > 1 ? history.back() : navigate('/home'))} aria-label="Cancel"><Icon name="x" /></button>
        <p className="eyebrow">{editing ? 'Edit memory' : isMilestoneFlow ? 'New milestone' : kind === 'story' ? 'Write a memory' : 'New memory'}</p>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={!canSave || busy} data-testid="save-top">{busy ? <Spinner size={14} /> : editing ? 'Save' : 'Add'}</button>
      </header>

      <div className="editor-body">
        {(locals.length > 0 || existing.length > 0) && (
          <div className={cx('editor-media', (locals.length + existing.length) === 1 && 'is-single')}>
            {existing.map((it) => (
              <div key={it!.id} className="editor-thumb">
                {it!.kind === 'audio' ? <div className="editor-audio"><Icon name="mic" /></div> : <MediaImg item={it} size="thumb" />}
              </div>
            ))}
            {locals.map((l, i) => (
              <div key={l.url} className="editor-thumb reveal">
                {l.kind === 'video' ? <video src={l.url} muted playsInline preload="metadata" /> : l.kind === 'audio' ? (
                  <div className="editor-audio"><Icon name="mic" size={22} /><audio src={l.url} controls /></div>
                ) : <img src={l.url} alt="" />}
                {l.kind === 'video' && <span className="mcard-play"><Icon name="play" size={10} filled stroke={0} /></span>}
                <button className="editor-thumb-x" onClick={() => setLocals((ls) => ls.filter((_, j) => j !== i))} aria-label="Remove"><Icon name="x" size={14} /></button>
              </div>
            ))}
            <button className="editor-thumb is-add" onClick={() => picker.current?.click()} aria-label="Add more photos or videos"><Icon name="plus" size={22} /></button>
          </div>
        )}
        {locals.length === 0 && existing.length === 0 && (
          <div className="editor-add-media">
            <button className="editor-add-main" onClick={() => picker.current?.click()} data-testid="editor-add-photos">
              <Icon name="image" size={22} />
              <span>
                <strong>Add photos or a video</strong>
                <small>{isMilestoneFlow ? 'The picture that goes with this first' : 'Optional, but it makes the page'}</small>
              </span>
            </button>
            <button className="editor-add-cam" onClick={() => camera.current?.click()} aria-label="Take a photo">
              <Icon name="camera" size={20} />
              <span>Camera</span>
            </button>
          </div>
        )}
        <input ref={picker} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => { addFiles([...(e.target.files ?? [])]); e.target.value = ''; }} data-testid="editor-file-input" />
        <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { addFiles([...(e.target.files ?? [])]); e.target.value = ''; }} />

        {isMilestoneFlow && !editing && (
          <div className="editor-firsts">
            <p className="eyebrow">Which first?</p>
            <div className="chips">
              {SUGGESTED_FIRSTS.map((f) => (
                <button key={f} className={cx('chip', title === f && 'is-on')} onClick={() => setTitle(f)}>{f}</button>
              ))}
            </div>
          </div>
        )}

        <input
          className="editor-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={isMilestoneFlow ? 'Or name your own first' : 'Title (optional)'}
          data-testid="memory-title"
        />
        <textarea
          className="editor-caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder={placeholder}
          rows={kind === 'story' ? 7 : 3}
          autoFocus={!locals.length}
          data-testid="memory-caption"
        />

        {multiDay && (
          <label className="editor-group">
            <input type="checkbox" checked={groupByDay} onChange={(e) => setGroupByDay(e.target.checked)} />
            <span>
              <strong>Organize by day</strong>
              <small>These {locals.length} files span {days.size} days — save them as {plural(days.size, 'memory', 'memories')}, each on its own date.</small>
            </span>
          </label>
        )}

        <div className="editor-row">
          <label className="pill-field">
            <Icon name="calendar" size={16} />
            <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} aria-label="Date" data-testid="memory-date" />
            <span className="pill-field-label">{fmtLong(date)}</span>
          </label>
          <button className={cx('pill-toggle', favorite && 'is-on')} onClick={() => setFavorite((f) => !f)} aria-pressed={favorite}>
            <Icon name="heart" size={16} filled={favorite} /> Favorite
          </button>
        </div>

        {!details ? (
          <button className="link-btn editor-more" onClick={() => setDetails(true)}>+ Add details (type, people, place)</button>
        ) : (
          <div className="editor-details reveal">
            <div className="field-group">
              <p className="eyebrow">Type</p>
              <div className="chips">
                {TYPES.map((t) => (
                  <button key={t.value} className={cx('chip', type === t.value && 'is-on')} onClick={() => setType(t.value)}>{t.label}</button>
                ))}
              </div>
            </div>
            <div className="field-group">
              <p className="eyebrow">Who was there</p>
              <div className="chips">
                {allPeople.map((p) => (
                  <button key={p} className={cx('chip', people.includes(p) && 'is-on')} onClick={() => setPeople((ps) => (ps.includes(p) ? ps.filter((x) => x !== p) : [...ps, p]))}>{p}</button>
                ))}
                <form className="chip-input" onSubmit={(e) => { e.preventDefault(); const v = newPerson.trim(); if (v) { setPeople((ps) => [...new Set([...ps, v])]); setNewPerson(''); } }}>
                  <input value={newPerson} onChange={(e) => setNewPerson(e.target.value)} placeholder="+ Someone else" />
                </form>
              </div>
            </div>
            <label className="field">
              <span className="eyebrow">Where</span>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Home, Grandma’s, the beach…" />
            </label>
          </div>
        )}
      </div>

      <div className="editor-foot">
        <button className="btn btn-primary btn-lg btn-block" onClick={save} disabled={!canSave || busy} data-testid="save-memory">
          {busy ? <Spinner /> : <Icon name="check" size={18} />} {editing ? 'Save changes' : multiDay && groupByDay ? `Add ${days.size} memories to NomNoms` : 'Add to NomNoms'}
        </button>
      </div>
    </div>
  );
}
