import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { MediaImg } from '../components/Media';
import { Confirm, Spinner, toast } from '../components/ui';
import { navigate, useRoute } from '../lib/router';
import type { Memory, MemoryType } from '../lib/types';
import { cx, firstName, fmtLong, fmtMonthYear, plural, toISODate, todayISO } from '../lib/util';
import { useApp } from '../state/store';
import { pendingCapture } from '../state/ui';
import { formatBytes } from '../services/backup/BackupService';
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
  const { baby, memories, addMemory, updateMemory, deleteMemory, ingest, forgetMedia, mediaSaved, media } = useApp();
  const [askEmpty, setAskEmpty] = useState(false);
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
  const toLocal = (f: File): Local => ({ file: f, url: URL.createObjectURL(f), kind: (f.type.startsWith('video') ? 'video' : f.type.startsWith('audio') ? 'audio' : 'photo') });
  const addFiles = (files: File[]) => setLocals((l) => [...l, ...files.filter((f) => /^(image|video)\//.test(f.type) || /\.(heic|heif|jpe?g|png|webp|gif|mov|mp4|m4v)$/i.test(f.name)).map(toLocal)]);

  /*
   * One strip for everything in this memory: photos already saved ("s:<id>") and
   * new ones ("n:<url>"). Each can be removed, replaced or moved; the first is the
   * main photo (the one on the timeline, the milestone and the book page). Nothing
   * is changed in storage until Save, so Cancel leaves the memory as it was.
   */
  const [saved, setSaved] = useState<string[]>(() => editing?.mediaIds ?? []);
  const [order, setOrder] = useState<string[]>([]);
  const tiles = useMemo(() => {
    const all = [...saved.map((id) => `s:${id}`), ...locals.map((l) => `n:${l.url}`)];
    const known = new Set(all);
    const kept = order.filter((k) => known.has(k));
    return [...kept, ...all.filter((k) => !kept.includes(k))];
  }, [saved, locals, order]);
  const localOf = (k: string) => locals.find((l) => `n:${l.url}` === k);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= tiles.length || from === to) return;
    const next = [...tiles];
    const [k] = next.splice(from, 1);
    next.splice(to, 0, k);
    setOrder(next);
  };
  const removeTile = (k: string) => {
    if (k.startsWith('s:')) setSaved((s) => s.filter((id) => `s:${id}` !== k));
    else { const l = localOf(k); if (l) URL.revokeObjectURL(l.url); setLocals((ls) => ls.filter((x) => `n:${x.url}` !== k)); }
    setOrder(tiles.filter((x) => x !== k));
  };
  const replacing = useRef<string | null>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const replaceWith = (file: File | undefined) => {
    const k = replacing.current;
    replacing.current = null;
    if (!k || !file) return;
    const l = toLocal(file);
    const at = tiles.indexOf(k);
    if (k.startsWith('s:')) setSaved((s) => s.filter((id) => `s:${id}` !== k));
    else setLocals((ls) => ls.filter((x) => `n:${x.url}` !== k));
    setLocals((ls) => [...ls, l]);
    const next = tiles.filter((x) => x !== k);
    next.splice(Math.max(0, at), 0, `n:${l.url}`);
    setOrder(next);
  };
  const [dragKey, setDragKey] = useState<string | null>(null);

  useEffect(() => {
    const onDrop = (e: Event) => addFiles((e as CustomEvent<File[]>).detail);
    window.addEventListener(EDITOR_DROP_EVENT, onDrop);
    return () => window.removeEventListener(EDITOR_DROP_EVENT, onDrop);
  });

  const ordered = useMemo(() => tiles.map((k) => locals.find((l) => `n:${l.url}` === k)).filter((l): l is Local => !!l), [tiles, locals]);
  const days = useMemo(() => {
    const map = new Map<string, Local[]>();
    for (const l of ordered) {
      const d = l.file.lastModified ? toISODate(new Date(l.file.lastModified)) : date;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(l);
    }
    return map;
  }, [ordered, date]);
  const multiDay = !editing && days.size > 1 && locals.length > 1;

  if (!baby) return null;
  const name = firstName(baby.name);
  const allPeople = [...new Set([...baby.people, ...people])];
  const placeholder =
    type === 'story' ? `Tell ${name} about today…`
      : isMilestoneFlow || type === 'milestone' || type === 'first' ? `What happened? How did it feel?`
        : locals.length ? 'What happened? (optional)' : `What do you want to remember?`;

  const empty = !(tiles.length || caption.trim() || title.trim());
  // editing: Save is always there (removing the last photo is a change too); a new memory needs something in it
  const canSave = editing ? true : !empty;
  const removedSaved = editing ? editing.mediaIds.filter((id) => !saved.includes(id)) : [];

  const save = async () => {
    if (!canSave) return;
    // nothing left in it: offer to remove the whole memory rather than keep an empty one
    if (editing && empty) { setAskEmpty(true); return; }
    setBusy(true);
    try {
      if (editing) {
        // new files first, then the memory gets the strip's order; removed photos are tidied up last
        const fresh = locals.length ? await ingest(locals.map((l) => l.file)) : [];
        if (fresh.length && !(await mediaSaved(fresh.map((f) => f.id)))) {
          // nothing in the memory is changed if the new photos couldn't be stored
          toast('This device is out of space, so the new photos couldn’t be saved. Nothing was changed.', { icon: 'x', ms: 4000 });
          return;
        }
        const idOf = new Map(locals.map((l, i) => [`n:${l.url}`, fresh[i]?.id]));
        const mediaIds = tiles.map((k) => (k.startsWith('s:') ? k.slice(2) : idOf.get(k))).filter((x): x is string => !!x);
        const changed = mediaIds.join() !== editing.mediaIds.join();
        await updateMemory(editing.id, { title: title.trim() || undefined, caption: caption.trim() || undefined, date, type, people, location: location.trim() || undefined, favorite, ...(changed ? { mediaIds } : {}) });
        if (removedSaved.length) await forgetMedia(removedSaved, editing.id);
        toast(removedSaved.length ? `Saved · ${plural(removedSaved.length, 'photo')} removed` : 'Saved', { icon: 'check' });
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
        created = [await addMemory({ ...base, date, files: ordered.map((l) => l.file), title, caption })];
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


  return (
    <div className="editor">
      <header className="editor-top">
        <button className="icon-btn" onClick={() => (history.length > 1 ? history.back() : navigate('/home'))} aria-label="Cancel"><Icon name="x" /></button>
        <p className="eyebrow">{editing ? 'Edit memory' : isMilestoneFlow ? 'New milestone' : kind === 'story' ? 'Write a memory' : 'New memory'}</p>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={!canSave || busy} data-testid="save-top">{busy ? <Spinner size={14} /> : editing ? 'Save' : 'Add'}</button>
      </header>

      <div className="editor-body">
        {tiles.length > 0 && (
          <div className={cx('editor-media', tiles.length === 1 && 'is-single')} data-testid="editor-media">
            {tiles.map((k, i) => {
              const l = k.startsWith('n:') ? localOf(k) : undefined;
              const it = k.startsWith('s:') ? media.get(k.slice(2)) : undefined;
              const kindOf = l?.kind ?? it?.kind ?? 'photo';
              return (
                <div
                  key={k}
                  className={cx('editor-thumb', l && 'reveal', dragKey === k && 'is-dragging')}
                  draggable={tiles.length > 1}
                  onDragStart={(e) => { setDragKey(k); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', k); }}
                  onDragOver={(e) => { if (dragKey) { e.preventDefault(); e.stopPropagation(); } }}
                  onDrop={(e) => { if (dragKey) { e.preventDefault(); e.stopPropagation(); move(tiles.indexOf(dragKey), i); setDragKey(null); } }}
                  onDragEnd={() => setDragKey(null)}
                  data-testid="editor-thumb"
                >
                  {l ? (l.kind === 'video' ? <video src={l.url} muted playsInline preload="metadata" /> : l.kind === 'audio' ? (
                    <div className="editor-audio"><Icon name="mic" size={22} /><audio src={l.url} controls /></div>
                  ) : <img src={l.url} alt="" />) : kindOf === 'audio' ? <div className="editor-audio"><Icon name="mic" /></div> : it ? <MediaImg item={it} size="thumb" /> : <div className="editor-audio"><Icon name="image" /></div>}
                  {kindOf === 'video' && <span className="mcard-play"><Icon name="play" size={10} filled stroke={0} /></span>}
                  {i === 0 && tiles.length > 1 && <span className="editor-main">Main</span>}
                  <button className="editor-thumb-x" onClick={() => removeTile(k)} aria-label={`Remove ${kindOf} ${i + 1}`} data-testid="thumb-remove"><Icon name="x" size={14} /></button>
                  <div className="editor-thumb-tools">
                    {tiles.length > 1 && <button onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Move ${kindOf} ${i + 1} earlier`} data-testid="thumb-earlier"><Icon name="arrow-left" size={13} /></button>}
                    {kindOf !== 'audio' && <button onClick={() => { replacing.current = k; replaceInput.current?.click(); }} aria-label={`Replace ${kindOf} ${i + 1}`} data-testid="thumb-replace"><Icon name="refresh" size={13} /></button>}
                    {tiles.length > 1 && <button onClick={() => move(i, i + 1)} disabled={i === tiles.length - 1} aria-label={`Move ${kindOf} ${i + 1} later`} data-testid="thumb-later"><Icon name="arrow-right" size={13} /></button>}
                  </div>
                </div>
              );
            })}
            <button className="editor-thumb is-add" onClick={() => picker.current?.click()} aria-label="Add more photos or videos"><Icon name="plus" size={22} /></button>
          </div>
        )}
        {tiles.length > 1 && <p className="editor-hint">The first is the main photo. Drag, or use the arrows, to change the order.</p>}
        {removedSaved.length > 0 && <p className="editor-hint is-warn" data-testid="removed-note">{plural(removedSaved.length, 'photo')} will be removed when you save. <button className="link-btn" onClick={() => { setSaved(editing!.mediaIds); setOrder([]); }}>Undo</button></p>}
        <input ref={replaceInput} type="file" accept="image/*,video/*" hidden onChange={(e) => { replaceWith(e.target.files?.[0]); e.target.value = ''; }} data-testid="replace-input" />
        {(() => {
          const big = locals.filter((l) => l.kind === 'video').reduce((n, l) => n + l.file.size, 0);
          return big > 80 * 1024 * 1024 ? (
            <p className="editor-warn" role="note">
              <Icon name="video" size={15} />
              <span>These videos are {formatBytes(big)}. Videos fill this device’s storage quickly. Trim long clips in Photos first, and save a backup in Settings regularly.</span>
            </p>
          ) : null;
        })()}
        {tiles.length === 0 && (
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

      {editing && (
        <Confirm open={askEmpty} onClose={() => setAskEmpty(false)} danger confirmLabel="Delete memory"
          title="Delete this memory?" body="With the photo removed, there’s nothing left in it. Delete the whole memory? To keep it, close this and add a few words or another photo."
          onConfirm={async () => { setAskEmpty(false); await deleteMemory(editing.id); toast('Memory deleted', { icon: 'trash' }); navigate('/memories', { replace: true }); }} />
      )}
      <div className="editor-foot">
        <button className="btn btn-primary btn-lg btn-block" onClick={save} disabled={!canSave || busy} data-testid="save-memory">
          {busy ? <Spinner /> : <Icon name="check" size={18} />} {editing ? 'Save changes' : multiDay && groupByDay ? `Add ${days.size} memories to NomNoms` : 'Add to NomNoms'}
        </button>
      </div>
    </div>
  );
}
