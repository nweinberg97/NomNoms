import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../components/Icon';
import { toast } from '../../components/ui';
import { cx, firstName } from '../../lib/util';
import { useAppOptional } from '../../state/store';
import { catchGenmoji, pastedImage } from '../genmoji';
import { DemoNote, LabsHeader } from '../LabsHeader';
import { NAMES, PET_NAMES, PLACES, ROLE_LABEL, STORY_TYPES, type Role, type StoryType } from './catalog';
import { EXTRAS, FACE_VIEWBOX, GLASSES, HAIR_COLOURS, HAIR_STYLES, HATS, OUTFITS, SKIN_TONES, characterSvg, type HairStyle, type Kind, type Look } from './character';
import { SAMPLE_PHOTOS, samplePhotoUrl, traitsFromPhoto } from './fromPhoto';
import { fill, generateStory, regeneratePage, tokenize, type CastMember, type Story, type StoryPage } from './generator';
import { sceneSvg } from './scene';

/**
 * NomNoms Baby Tales, the try-it demo.
 * 1. The cast: names, a face from a photo or a Genmoji, looks and wardrobe.
 * 2. The story: pick a kind of story and places; every page can be changed.
 * Everything lives in this screen's memory. Nothing is uploaded or saved.
 */

interface Person { member: CastMember; look: Look }

const KIND: Record<Role, Kind> = { baby: 'baby', parent: 'adult', sibling: 'kid', friend: 'kid', grandparent: 'elder', pet: 'dog' };
const base = (o: Partial<Look>): Look => ({ kind: 'baby', skin: SKIN_TONES[1], hair: HAIR_COLOURS[2], hairStyle: 'tuft', outfit: 'tee', hat: 'none', glasses: 'none', extra: 'none', ...o });

function sampleCast(heroName: string): Person[] {
  const p = (id: string, role: Role, name: string, call: string, look: Partial<Look>): Person => ({ member: { id, role, name, call, inStory: true }, look: base({ kind: KIND[role], ...look }) });
  return [
    p('star', 'baby', heroName, heroName, { skin: '#f1c6a2', hair: '#7a5236', hairStyle: 'tuft', outfit: 'overalls' }),
    p('mom', 'parent', 'Rachel', 'Mom', { skin: '#e3ad86', hair: '#3a281e', hairStyle: 'bob', outfit: 'raincoat' }),
    p('dad', 'parent', 'Mark', 'Dad', { skin: '#f1c6a2', hair: '#2b2420', hairStyle: 'short', beard: true, glasses: 'round', outfit: 'tee' }),
    p('bro', 'sibling', 'Ryan', 'Ryan', { skin: '#f1c6a2', hair: '#7a5236', hairStyle: 'short', outfit: 'dino' }),
    p('friend', 'friend', 'Kylie', 'Kylie', { skin: '#9d6a46', hair: '#2b2420', hairStyle: 'curly', outfit: 'party' }),
    p('gramps', 'grandparent', 'John', 'Grandpa', { skin: '#f7d7bd', hair: '#d8d2c8', hairStyle: 'short', glasses: 'round', outfit: 'tee' }),
    p('pet', 'pet', 'Biscuit', 'Biscuit', { outfit: 'none' }),
  ];
}

type WardrobeTab = 'hat' | 'glasses' | 'outfit' | 'extra';
const WARDROBE: Record<WardrobeTab, [string, Record<string, string>]> = {
  hat: ['Hats', HATS], glasses: ['Glasses', GLASSES], outfit: ['Outfits', OUTFITS], extra: ['Extras', EXTRAS],
};

export function BabyTalesDemo() {
  const app = useAppOptional();
  const heroName = app?.baby ? firstName(app.baby.name) : 'Maya';
  const [cast, setCast] = useState<Person[]>(() => sampleCast(heroName));
  const [sel, setSel] = useState(0);
  const [type, setType] = useState<StoryType>('lost');
  const [seed, setSeed] = useState(7);
  const [places, setPlaces] = useState<string[]>([]);
  const [dressUp, setDressUp] = useState(true);
  const [story, setStory] = useState<Story>(() => generateStory('lost', sampleCast(heroName).map((p) => p.member), { seed: 7 }));
  const [view, setView] = useState(0); // 0 = cover, then pages
  const [tab, setTab] = useState<WardrobeTab>('hat');
  const [busy, setBusy] = useState<string>();
  const [status, setStatus] = useState<string>();
  const fileRef = useRef<HTMLInputElement>(null);
  const genRef = useRef<HTMLDivElement>(null);
  const members = cast.map((p) => p.member);
  const membership = cast.map((p) => `${p.member.id}:${p.member.inStory}`).join();

  // a new story whenever its recipe changes
  useEffect(() => {
    setStory(generateStory(type, members, { seed, places }));
    setView(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, seed, places.join(), membership]);

  const person = cast[sel];
  const update = (i: number, patch: { member?: Partial<CastMember>; look?: Partial<Look> }) =>
    setCast((cs) => cs.map((p, k) => (k === i ? { member: { ...p.member, ...patch.member }, look: { ...p.look, ...patch.look } } : p)));

  const byId = (id: string) => cast.find((p) => p.member.id === id);

  /* ── faces ─────────────────────────────────────────── */
  const fromPhoto = async (src: string, label: string, revoke?: boolean) => {
    setBusy(label);
    setStatus(undefined);
    try {
      const t = await traitsFromPhoto(src);
      update(sel, { look: { skin: t.skin, hair: t.hair, hairStyle: person.look.kind === 'baby' ? (t.hairStyle === 'short' ? 'curly' : 'tuft') : t.hairStyle, face: undefined } });
      setStatus(`Made ${person.member.name}’s character from the photo. The photo wasn’t kept.`);
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      if (revoke) URL.revokeObjectURL(src);
      setBusy(undefined);
    }
  };
  const onGenmoji = async () => {
    if (!genRef.current) return;
    const g = await catchGenmoji(genRef.current);
    if (!g) return;
    genRef.current.innerHTML = '';
    update(sel, { look: { face: g.url, faceScale: 100, faceY: 0, glassesY: 0 } });
    setStatus(`Got ${person.member.name}’s Genmoji (${g.width} × ${g.height} px). Now dress them up.`);
  };

  /* ── story ─────────────────────────────────────────── */
  const page: StoryPage | undefined = view > 0 ? story.pages[view - 1] : undefined;
  const setPage = (patch: Partial<StoryPage>) => setStory((s) => ({ ...s, pages: s.pages.map((p, i) => (i === view - 1 ? { ...p, ...patch } : p)) }));
  const lookFor = (id: string, p?: StoryPage): Look | undefined => {
    const who = byId(id);
    if (!who) return undefined;
    let l = who.look;
    if (p && who.member.role === 'baby') {
      const place = PLACES.find((x) => x.id === p.place);
      // dress for the place, without undoing anything chosen by hand
      if (dressUp && place?.dress) {
        const d = place.dress;
        l = {
          ...l,
          ...(d.hat && l.hat === 'none' ? { hat: d.hat } : {}),
          ...(d.glasses && l.glasses === 'none' ? { glasses: d.glasses } : {}),
          ...(d.outfit && ['tee', 'overalls', 'none'].includes(l.outfit) ? { outfit: d.outfit } : {}),
        };
      }
      if (p.hat) l = { ...l, hat: p.hat };
    }
    return l;
  };
  const art = (p: StoryPage | undefined, animated: boolean) => {
    if (!p) {
      const first = story.pages[0];
      const ids = [cast[0].member.id, ...cast.filter((c, i) => i > 0 && c.member.inStory).slice(0, 2).map((c) => c.member.id)];
      return sceneSvg({ placeId: first?.place ?? 'park', seed: story.seed, chars: ids.map((id) => ({ look: lookFor(id, first)! })), animated, label: 'Story cover' });
    }
    const chars = p.cast.map((id) => lookFor(id, p)).filter(Boolean).map((look) => ({ look: look! }));
    return sceneSvg({ placeId: p.place, seed: story.seed + view, chars, focus: p.focus, animated, label: fill(p.text, members) });
  };
  const bigArt = useMemo(() => art(page, true), [page, cast, dressUp, story, view]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: string) => setPlaces((ps) => (ps.includes(id) ? ps.filter((x) => x !== id) : [...ps, id]));

  return (
    <div className="lab bt">
      <LabsHeader title="Baby Tales" />
      <main className="lab-main">
        <section className="lab-hero">
          <p className="eyebrow">NomNoms Baby Tales · Demo</p>
          <h1 className="display">The Adventures of <em>{cast[0].member.name || 'your little one'}</em></h1>
          <p className="lab-lede">Make storybook characters of your family, dress them up, and get a simple story where they’re the heroes. Change any name, place, outfit or word.</p>
          <DemoNote>Photos are read on this device to make the characters, then let go. Nothing in this demo is uploaded or saved.</DemoNote>
        </section>

        {/* ── 1. the cast ─────────────────────────────── */}
        <section className="lab-section" aria-labelledby="bt-cast">
          <div className="lab-h"><span className="lab-n">1</span><h2 id="bt-cast" className="display">Who’s in the story</h2></div>
          <div className="bt-cast" role="group" aria-label="Cast">
            {cast.map((p, i) => (
              <button key={p.member.id} type="button" className={cx('bt-member', !p.member.inStory && 'is-out')} aria-pressed={i === sel} onClick={() => { setSel(i); setStatus(undefined); }} data-testid={`cast-${p.member.id}`}>
                <span className="bt-face" dangerouslySetInnerHTML={{ __html: characterSvg(p.look, { viewBox: p.look.kind === 'dog' ? '30 20 140 140' : FACE_VIEWBOX }) }} />
                <span className="bt-member-name">{p.member.name || 'No name'}</span>
                <small>{p.member.role === 'parent' || p.member.role === 'grandparent' ? p.member.call : ROLE_LABEL[p.member.role]}</small>
              </button>
            ))}
          </div>

          <div className="bt-studio">
            <div className="bt-stage" dangerouslySetInnerHTML={{ __html: characterSvg(person.look, { animated: true, label: `${person.member.name}’s character` }) }} />

            <div className="bt-panel">
              <div className="lab-card">
                <div className="bt-names">
                  <label className="field"><span>Name</span>
                    <input value={person.member.name} onChange={(e) => update(sel, { member: { name: e.target.value, ...(['parent', 'grandparent'].includes(person.member.role) ? {} : { call: e.target.value }) } })} data-testid="cast-name" />
                  </label>
                  {(person.member.role === 'parent' || person.member.role === 'grandparent') && (
                    <label className="field"><span>{cast[0].member.name || 'The star'} calls them</span>
                      <input value={person.member.call} onChange={(e) => update(sel, { member: { call: e.target.value } })} data-testid="cast-call" />
                    </label>
                  )}
                </div>
                <div className="lab-row">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { const pool = person.member.role === 'pet' ? PET_NAMES : NAMES; const n = pool[Math.floor(Math.random() * pool.length)]; update(sel, { member: { name: n, ...(['parent', 'grandparent'].includes(person.member.role) ? {} : { call: n }) } }); }} data-testid="pick-name">
                    <Icon name="sparkle" size={15} /> Pick a name
                  </button>
                  {sel > 0 && (
                    <label className="lab-switch"><input type="checkbox" checked={person.member.inStory} onChange={(e) => update(sel, { member: { inStory: e.target.checked } })} /> In the story</label>
                  )}
                </div>
              </div>

              {person.look.kind !== 'dog' && (
                <div className="lab-card">
                  <h3>Make the face</h3>
                  <p className="lab-sub">From a photo (read on this device, then let go):</p>
                  <div className="bt-photos">
                    {(SAMPLE_PHOTOS[person.member.role] ?? []).map((s) => (
                      <button key={s.path} type="button" className="bt-photo" onClick={() => fromPhoto(samplePhotoUrl(s.path), s.path)} disabled={!!busy} aria-label={`Sample photo by ${s.by}`} data-testid="sample-photo">
                        <img src={samplePhotoUrl(s.path, 160)} alt="" crossOrigin="anonymous" loading="lazy" />
                        {busy === s.path && <span className="bt-photo-busy" />}
                      </button>
                    ))}
                    <button type="button" className="bt-photo is-own" onClick={() => fileRef.current?.click()} disabled={!!busy} data-testid="own-photo">
                      <Icon name="image" size={20} /><span>Your photo</span>
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void fromPhoto(URL.createObjectURL(f), 'own', true); }} />
                  </div>
                  <p className="lab-sub">Or with Genmoji, on iPhone, iPad or Mac:</p>
                  <div ref={genRef} className="bt-genbox" contentEditable suppressContentEditableWarning data-placeholder="Tap here, open the emoji keyboard and make a Genmoji…" aria-label="Make a Genmoji here"
                    onInput={() => setTimeout(onGenmoji, 150)}
                    onPaste={(e) => { const f = pastedImage(e); if (!f) return; e.preventDefault(); update(sel, { look: { face: URL.createObjectURL(f), faceScale: 100, faceY: 0, glassesY: 0 } }); setStatus('Got it. Now dress them up.'); }} />
                  <p className="lab-hint">On Mac: click the box, press <kbd>fn</kbd> <kbd>E</kbd>, then choose Genmoji. The photo stays with Apple; NomNoms only keeps the finished face.</p>
                  {status && <p className="lab-status" role="status">{status}</p>}
                  {person.look.face && (
                    <div className="bt-fit">
                      <label htmlFor="fs">Face size</label><input id="fs" type="range" min="70" max="135" value={person.look.faceScale ?? 100} onChange={(e) => update(sel, { look: { faceScale: +e.target.value } })} />
                      <label htmlFor="fy">Face height</label><input id="fy" type="range" min="-25" max="25" value={person.look.faceY ?? 0} onChange={(e) => update(sel, { look: { faceY: +e.target.value } })} />
                      <label htmlFor="fg">Glasses height</label><input id="fg" type="range" min="-20" max="20" value={person.look.glassesY ?? 0} onChange={(e) => update(sel, { look: { glassesY: +e.target.value } })} />
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => update(sel, { look: { face: undefined } })}>Use the drawn face</button>
                    </div>
                  )}
                  {!person.look.face && (
                    <>
                      <p className="lab-sub">Skin</p>
                      <div className="bt-swatches">{SKIN_TONES.map((c) => <button key={c} type="button" className="bt-swatch" style={{ background: c }} aria-pressed={person.look.skin === c} aria-label={`Skin tone ${c}`} onClick={() => update(sel, { look: { skin: c } })} />)}</div>
                      <p className="lab-sub">Hair</p>
                      <div className="bt-swatches">{HAIR_COLOURS.map((c) => <button key={c} type="button" className="bt-swatch" style={{ background: c }} aria-pressed={person.look.hair === c} aria-label={`Hair colour ${c}`} onClick={() => update(sel, { look: { hair: c } })} />)}</div>
                      <div className="lab-chips">
                        {(Object.keys(HAIR_STYLES) as HairStyle[]).map((h) => <button key={h} type="button" className="lab-chip" aria-pressed={person.look.hairStyle === h} onClick={() => update(sel, { look: { hairStyle: h } })}>{HAIR_STYLES[h]}</button>)}
                        {person.look.kind === 'adult' || person.look.kind === 'elder' ? <button type="button" className="lab-chip" aria-pressed={!!person.look.beard} onClick={() => update(sel, { look: { beard: !person.look.beard } })}>Beard</button> : null}
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="lab-card">
                <div className="lab-tabs" role="tablist">
                  {(Object.keys(WARDROBE) as WardrobeTab[]).map((k) => <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} data-testid={`tab-${k}`}>{WARDROBE[k][0]}</button>)}
                </div>
                <div className="bt-tiles">
                  {Object.entries(WARDROBE[tab][1]).map(([v, label]) => (
                    <button key={v} type="button" className="bt-tile" aria-pressed={person.look[tab] === v} onClick={() => update(sel, { look: { [tab]: v } as Partial<Look> })} data-testid={`wear-${v}`}>
                      <span dangerouslySetInnerHTML={{ __html: characterSvg({ ...person.look, [tab]: v }) }} />
                      <small>{label}</small>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. the story ─────────────────────────────── */}
        <section className="lab-section" aria-labelledby="bt-story">
          <div className="lab-h"><span className="lab-n">2</span><h2 id="bt-story" className="display">The story</h2></div>
          <div className="lab-card">
            <h3>What kind of story?</h3>
            <div className="bt-types">
              {STORY_TYPES.map((t) => (
                <button key={t.id} type="button" className="bt-type" aria-pressed={type === t.id} onClick={() => setType(t.id)} data-testid={`type-${t.id}`}>
                  <strong>{t.name}</strong><small>{t.blurb}</small>
                </button>
              ))}
            </div>
            <h3>Where does it happen? <small className="lab-sub">{places.length ? `${places.length} chosen` : 'Pick any, or let NomNoms choose'}</small></h3>
            <div className="lab-chips is-wrap">
              {PLACES.filter((p) => p.id !== 'home').map((p) => (
                <button key={p.id} type="button" className="lab-chip" aria-pressed={places.includes(p.id)} onClick={() => toggle(p.id)} data-testid={`place-${p.id}`}>{p.props[0]} {p.name}</button>
              ))}
            </div>
            <div className="lab-row">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setSeed((s) => s + 1)} data-testid="new-story"><Icon name="refresh" size={15} /> New story</button>
              {places.length > 0 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPlaces([])}>Let NomNoms choose</button>}
              <label className="lab-switch"><input type="checkbox" checked={dressUp} onChange={(e) => setDressUp(e.target.checked)} /> Dress for each place</label>
            </div>
          </div>

          <div className="bt-book">
            <div className="bt-spread">
              <div className="bt-art" dangerouslySetInnerHTML={{ __html: bigArt }} />
              <div className="bt-words">
                {view === 0 ? (
                  <>
                    <small>The Adventures of {cast[0].member.name}</small>
                    <input className="bt-title" value={fill(story.title, members)} onChange={(e) => setStory((s) => ({ ...s, title: tokenize(e.target.value, members) }))} aria-label="Story title" data-testid="story-title" />
                    <p className="bt-by">A NomNoms Baby Tale starring {members.filter((m) => m.inStory || m.role === 'baby').map((m) => m.call).join(', ')}</p>
                  </>
                ) : (
                  <>
                    <small>Page {view} of {story.pages.length}</small>
                    <p className="bt-text" data-testid="page-text">{fill(page!.text, members)}</p>
                  </>
                )}
              </div>
            </div>
            <div className="bt-pager">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setView((v) => Math.max(0, v - 1))} disabled={view === 0}>Previous</button>
              <div className="bt-dots">{[0, ...story.pages.map((_, i) => i + 1)].map((i) => <button key={i} type="button" className={cx(i === view && 'on')} aria-label={i ? `Page ${i}` : 'Cover'} onClick={() => setView(i)} />)}</div>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setView((v) => (v >= story.pages.length ? 0 : v + 1))} data-testid="next-page">{view >= story.pages.length ? 'Back to cover' : 'Next page'}</button>
            </div>

            {page && (
              <div className="lab-card bt-edit">
                <h3>Change this page</h3>
                <label className="field"><span>Words</span>
                  <textarea rows={3} value={fill(page.text, members)} onChange={(e) => setPage({ text: tokenize(e.target.value, members), edited: true })} data-testid="page-words" />
                </label>
                <div className="bt-edit-row">
                  <label className="field"><span>Place</span>
                    <select value={page.place} onChange={(e) => setPage({ place: e.target.value })} data-testid="page-place">
                      {PLACES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </label>
                  <div>
                    <p className="lab-sub">In the picture</p>
                    <div className="lab-chips is-wrap">
                      {cast.map((p) => (
                        <button key={p.member.id} type="button" className="lab-chip" aria-pressed={page.cast.includes(p.member.id)} disabled={p.member.role === 'baby'}
                          onClick={() => setPage({ cast: page.cast.includes(p.member.id) ? page.cast.filter((x) => x !== p.member.id) : [...page.cast, p.member.id].slice(0, 3) })}>
                          {p.member.call || p.member.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="lab-row">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { const fresh = regeneratePage(story, view - 1, members, story.seed * 31 + view * 7 + Math.floor(Math.random() * 1000)); setPage({ ...fresh }); toast('New version of this page', { icon: 'sparkle', ms: 1400 }); }} data-testid="page-again">
                    <Icon name="refresh" size={15} /> Try another version
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <p className="lab-fine">A demo of a coming NomNoms feature. Characters and scenes are previews; the finished books will be professionally illustrated. Sample photos from <a href="https://unsplash.com/?utm_source=nomnoms&utm_medium=referral" target="_blank" rel="noreferrer">Unsplash</a>. Genmoji works on Apple devices with Apple Intelligence.</p>
      </main>
    </div>
  );
}
