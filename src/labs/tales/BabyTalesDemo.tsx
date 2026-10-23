import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../components/Icon';
import { toast } from '../../components/ui';
import { cx, firstName } from '../../lib/util';
import { useAppOptional } from '../../state/store';
import { catchGenmoji, pastedImage } from '../genmoji';
import { DemoNote, LabsHeader } from '../LabsHeader';
import { NAMES, PET_NAMES, PLACES, ROLE_LABEL, STORY_TYPES, type Place, type Role, type StoryType } from './catalog';
import {
  EXPRESSIONS, EXTRAS, EYE_COLOURS, FACE_VIEWBOX, FACIAL, GLASSES, HAIR_COLOURS, HAIR_STYLES, HATS, OUTFITS, PERSONALITIES, SKIN_TONES, WEAR_BOX,
  characterSvg, exprOf, isPet, type Expression, type Facial, type HairStyle, type Kind, type Look, type Personality, type WearSlot,
} from './character';
import { DrawPad, type DrawMode } from './DrawPad';
import { SAMPLE_PHOTOS, samplePhotoUrl, traitsFromPhoto } from './fromPhoto';
import { fill, generateStory, regeneratePage, tokenize, type CastMember, type Story, type StoryPage } from './generator';
import { sceneSvg, type DrawnPlace } from './scene';

/**
 * NomNoms Baby Tales, the try-it demo.
 * 1. The cast: add anyone, make each face from a photo, a Genmoji or a drawing,
 *    then choose their look and dress them up.
 * 2. The story: pick a kind of story and places (including ones you draw);
 *    every page can be changed.
 * Everything lives in this screen's memory. Nothing is uploaded or saved.
 */

interface Person { member: CastMember; look: Look }

const base = (o: Partial<Look>): Look => ({ kind: 'baby', skin: SKIN_TONES[2], hair: HAIR_COLOURS[3], hairStyle: 'tuft', eyes: EYE_COLOURS[0], outfit: 'tee', hat: 'none', glasses: 'none', extra: 'none', ...o });
let nextId = 1;
const mk = (role: Role, name: string, call: string, look: Partial<Look>, id = `p${nextId++}`): Person => ({ member: { id, role, name, call, inStory: true }, look: base(look) });

function sampleCast(heroName: string): Person[] {
  return [
    mk('baby', heroName, heroName, { kind: 'baby', skin: '#f6d2b7', hair: '#7a5236', hairStyle: 'tuft', eyes: '#4a7fb5', outfit: 'overalls', personality: 'sunny' }, 'star'),
    mk('parent', 'Rachel', 'Mom', { kind: 'adult', skin: '#d39a6e', hair: '#1f1a17', hairStyle: 'curtain', lashes: true, outfit: 'cardigan', personality: 'calm' }, 'mom'),
    mk('parent', 'Mark', 'Dad', { kind: 'adult', skin: '#efc19f', hair: '#3b2a20', hairStyle: 'sidepart', glasses: 'round', outfit: 'denim', personality: 'cheeky' }, 'dad'),
    mk('sibling', 'Ryan', 'Ryan', { kind: 'kid', skin: '#efc19f', hair: '#7a5236', hairStyle: 'messy', eyes: '#4a7fb5', outfit: 'stripes', hat: 'capback', personality: 'silly' }, 'bro'),
    mk('friend', 'Kylie', 'Kylie', { kind: 'kid', skin: '#a06b46', hair: '#1f1a17', hairStyle: 'puff', lashes: true, outfit: 'sweater', personality: 'excited' }, 'friend'),
    mk('grandparent', 'John', 'Grandpa', { kind: 'elder', skin: '#f6d2b7', hair: '#c9c3bb', hairStyle: 'sides', glasses: 'round', outfit: 'cardigan', personality: 'proud' }, 'gramps'),
    mk('pet', 'Biscuit', 'Biscuit', { kind: 'dog', hair: '#c08b52', outfit: 'none', personality: 'excited' }, 'pet'),
  ];
}

/** People and pets that can be added to the cast. */
const ADDABLE: { label: string; make: () => Person }[] = [
  { label: 'Sister', make: () => mk('sibling', 'Zoe', 'Zoe', { kind: 'kid', skin: '#efc19f', hair: '#3b2a20', hairStyle: 'spacebuns', lashes: true, outfit: 'tutu', personality: 'cheeky' }) },
  { label: 'Brother', make: () => mk('sibling', 'Leo', 'Leo', { kind: 'kid', skin: '#efc19f', hair: '#5a3b26', hairStyle: 'quiff', outfit: 'jersey', personality: 'brave' }) },
  { label: 'Cousin', make: () => mk('relative', 'Mila', 'Mila', { kind: 'kid', skin: '#bd8259', hair: '#1f1a17', hairStyle: 'braids', lashes: true, outfit: 'overalls', personality: 'curious' }) },
  { label: 'Friend', make: () => mk('friend', 'Theo', 'Theo', { kind: 'kid', skin: '#fbe2cf', hair: '#e0bd78', hairStyle: 'messy', freckles: true, outfit: 'raincoat', personality: 'shy' }) },
  { label: 'Grandma', make: () => mk('grandparent', 'Ruth', 'Grandma', { kind: 'elder', skin: '#f6d2b7', hair: '#f3f0ea', hairStyle: 'bun', glasses: 'round', lashes: true, outfit: 'cardigan', personality: 'calm' }) },
  { label: 'Grandpa', make: () => mk('grandparent', 'Lou', 'Grandpa', { kind: 'elder', skin: '#865637', hair: '#c9c3bb', hairStyle: 'sides', facial: 'moustache', outfit: 'sweater', personality: 'silly' }) },
  { label: 'Aunt', make: () => mk('relative', 'Priya', 'Auntie Priya', { kind: 'adult', skin: '#bd8259', hair: '#1f1a17', hairStyle: 'longcurly', lashes: true, outfit: 'dress', personality: 'dreamy' }) },
  { label: 'Uncle', make: () => mk('relative', 'Sam', 'Uncle Sam', { kind: 'adult', skin: '#6b4329', hair: '#1f1a17', hairStyle: 'topknot', facial: 'trim', outfit: 'puffer', personality: 'sunny' }) },
  { label: 'Teacher', make: () => mk('teacher', 'Ms. Ana', 'Ms. Ana', { kind: 'adult', skin: '#e4ad86', hair: '#9c6a3f', hairStyle: 'halfup', glasses: 'cateye', lashes: true, outfit: 'cardigan', personality: 'calm' }) },
  { label: 'Baby', make: () => mk('sibling', 'Bea', 'Bea', { kind: 'baby', skin: '#865637', hair: '#1f1a17', hairStyle: 'coils', outfit: 'pajamas', personality: 'sleepy' }) },
  { label: 'Dog', make: () => mk('pet', 'Pepper', 'Pepper', { kind: 'dog', hair: '#3b2a20', outfit: 'none', personality: 'silly' }) },
  { label: 'Cat', make: () => mk('pet', 'Mochi', 'Mochi', { kind: 'cat', hair: '#d97a4a', outfit: 'none', personality: 'dreamy' }) },
  { label: 'Bunny', make: () => mk('pet', 'Bean', 'Bean', { kind: 'bunny', hair: '#c9c3bb', outfit: 'none', personality: 'shy' }) },
];

type WardrobeTab = 'hat' | 'glasses' | 'outfit' | 'extra';
const WARDROBE: Record<WardrobeTab, [string, Record<string, string>]> = {
  hat: ['Hats', HATS], glasses: ['Glasses', GLASSES], outfit: ['Outfits', OUTFITS], extra: ['Extras', EXTRAS],
};
const KINDS: { kind: Kind; label: string }[] = [{ kind: 'baby', label: 'Baby' }, { kind: 'kid', label: 'Kid' }, { kind: 'adult', label: 'Grown-up' }, { kind: 'elder', label: 'Grandparent' }];
const PETS: { kind: Kind; label: string }[] = [{ kind: 'dog', label: 'Dog' }, { kind: 'cat', label: 'Cat' }, { kind: 'bunny', label: 'Bunny' }];
const FACIALS = Object.keys(FACIAL) as Facial[];
interface DrawnWear { id: string; slot: WearSlot; name: string; image: string }
const usesCall = (r: Role) => r === 'parent' || r === 'grandparent' || r === 'relative' || r === 'teacher';

function placeFromDrawing(id: string, name: string, image: string): DrawnPlace {
  const first = name.split(' ')[0];
  const lowered = ['The', 'Our', 'My', 'A', 'An'].includes(first) ? name.charAt(0).toLowerCase() + name.slice(1) : name;
  return {
    id, name, at: `at ${lowered}`, image, sky: ['#ffffff', '#ffffff'], ground: '#ffffff', groundKind: 'floor', horizon: 'none', props: ['✨', '🎨'],
    surprises: ['just a little bird singing', 'just a big friendly smile', 'just a rainbow of colours', 'just a funny shadow'],
    doing: ['play and play', 'look all around', 'have a little adventure', 'dance and giggle'],
  };
}

export function BabyTalesDemo() {
  const app = useAppOptional();
  const heroName = app?.baby ? firstName(app.baby.name) : 'Maya';
  const [cast, setCast] = useState<Person[]>(() => sampleCast(heroName));
  const [sel, setSel] = useState(0);
  const [type, setType] = useState<StoryType>('lost');
  const [seed, setSeed] = useState(7);
  const [places, setPlaces] = useState<string[]>([]);
  const [drawn, setDrawn] = useState<DrawnPlace[]>([]);
  const [dressUp, setDressUp] = useState(true);
  const [story, setStory] = useState<Story>(() => generateStory('lost', sampleCast(heroName).map((p) => p.member), { seed: 7 }));
  const [view, setView] = useState(0); // 0 = cover, then pages
  const [tab, setTab] = useState<WardrobeTab>('hat');
  const [busy, setBusy] = useState<string>();
  const [result, setResult] = useState<{ who: string; from: string; matched: string[] } | null>(null);
  const [status, setStatus] = useState<string>();
  const [adding, setAdding] = useState(false);
  const [pad, setPad] = useState<{ mode: DrawMode; redraw?: string } | null>(null);
  const [wardrobe, setWardrobe] = useState<DrawnWear[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const genRef = useRef<HTMLDivElement>(null);
  const members = cast.map((p) => p.member);
  const membership = cast.map((p) => `${p.member.id}:${p.member.inStory}`).join();
  const extraPlaces: Place[] = drawn;

  // a new story whenever its recipe changes
  useEffect(() => {
    setStory(generateStory(type, members, { seed, places, extraPlaces }));
    setView(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, seed, places.join(), membership, drawn.length]);

  const person = cast[Math.min(sel, cast.length - 1)];
  const pi = cast.indexOf(person);
  const update = (patch: { member?: Partial<CastMember>; look?: Partial<Look> }, i = pi) =>
    setCast((cs) => cs.map((p, k) => (k === i ? { member: { ...p.member, ...patch.member }, look: { ...p.look, ...patch.look } } : p)));
  const byId = (id: string) => cast.find((p) => p.member.id === id);
  const choose = (i: number) => { setSel(i); setStatus(undefined); setResult(null); };

  /* ── faces ─────────────────────────────────────────── */
  const fromPhoto = async (src: string, label: string, from: string, revoke?: boolean) => {
    setBusy(label);
    setStatus(undefined);
    setResult(null);
    try {
      const t = await traitsFromPhoto(src, person.look.kind);
      update({ look: { skin: t.skin, hair: t.hair ?? person.look.hair, hairStyle: t.hairStyle, face: undefined, drawing: undefined } });
      setResult({ who: person.member.name, from, matched: t.matched });
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
    update({ look: { face: g.url, faceScale: 100, faceY: 0, glassesY: 0, drawing: undefined } });
    setStatus(`Got ${person.member.name}’s Genmoji. It’s now their face in every picture.`);
  };

  /* ── cast ──────────────────────────────────────────── */
  const add = (make: () => Person) => {
    const p = make();
    setCast((cs) => [...cs, p]);
    setSel(cast.length);
    setAdding(false);
    toast(`${p.member.call} joined the story`, { icon: 'plus', ms: 1500 });
  };
  const remove = () => {
    if (pi === 0) return;
    setCast((cs) => cs.filter((_, k) => k !== pi));
    setSel(Math.max(0, pi - 1));
  };
  const onDrawn = (image: string, name: string) => {
    if (pad && pad.mode !== 'place' && pad.mode !== 'character') {
      const slot = pad.mode;
      setWardrobe((w) => [...w, { id: `wear-${Date.now()}`, slot, name, image }]);
      update({ look: { [slot]: 'drawn', worn: { ...person.look.worn, [slot]: image } } as Partial<Look> });
      setTab(slot);
      toast(`${person.member.call || person.member.name} is wearing “${name}”`, { icon: 'sparkle', ms: 1800 });
    } else if (pad?.mode === 'place') {
      const id = `draw-${Date.now()}`;
      setDrawn((ds) => [...ds, placeFromDrawing(id, name, image)]);
      setPlaces((ps) => [...ps, id]);
      toast(`“${name}” is in the story now`, { icon: 'sparkle', ms: 1800 });
    } else if (pad?.redraw) {
      setCast((cs) => cs.map((p) => (p.member.id === pad.redraw ? { ...p, member: { ...p.member, name, call: name }, look: { ...p.look, drawing: image } } : p)));
    } else {
      const p = mk('friend', name, name, { kind: 'kid', drawing: image });
      setCast((cs) => [...cs, p]);
      setSel(cast.length);
      toast(`${name} joined the story`, { icon: 'sparkle', ms: 1800 });
    }
    setPad(null);
  };

  /* ── story ─────────────────────────────────────────── */
  const page: StoryPage | undefined = view > 0 ? story.pages[view - 1] : undefined;
  const setPage = (patch: Partial<StoryPage>) => setStory((s) => ({ ...s, pages: s.pages.map((p, i) => (i === view - 1 ? { ...p, ...patch } : p)) }));
  const lookFor = (id: string, p?: StoryPage): Look | undefined => {
    const who = byId(id);
    if (!who) return undefined;
    let l = who.look;
    if (p && who.member.role === 'baby' && !l.drawing) {
      const place = PLACES.find((x) => x.id === p.place);
      // dress for the place, without undoing anything chosen by hand
      if (dressUp && place?.dress && !p.outfit) {
        const d = place.dress;
        l = {
          ...l,
          ...(d.hat && l.hat === 'none' ? { hat: d.hat } : {}),
          ...(d.glasses && l.glasses === 'none' ? { glasses: d.glasses } : {}),
          ...(d.outfit && ['tee', 'overalls', 'none'].includes(l.outfit) ? { outfit: d.outfit } : {}),
        };
      }
      if (p.hat) l = { ...l, hat: p.hat };
      if (p.outfit) l = { ...l, outfit: p.outfit };
      if (p.mood) l = { ...l, expression: p.mood };
    } else if (p?.mood && ['laugh', 'starry', 'wow', 'proud', 'sleepy'].includes(p.mood) && !l.drawing) {
      // friends join in with the big moments, each in their own way
      const react = p.mood === 'sleepy' ? 'sleepy' : l.personality ? PERSONALITIES[l.personality].react : 'laugh';
      l = { ...l, expression: react };
    }
    return l;
  };
  const drawnPlace = (id?: string) => drawn.find((d) => d.id === id);
  const art = (p: StoryPage | undefined, animated: boolean) => {
    if (!p) {
      const first = story.pages[0];
      const ids = [cast[0].member.id, ...cast.filter((c, i) => i > 0 && c.member.inStory).slice(0, 2).map((c) => c.member.id)];
      return sceneSvg({ placeId: first?.place ?? 'park', drawn: drawnPlace(first?.place), seed: story.seed, chars: ids.map((id) => ({ look: lookFor(id, first)! })), animated, label: 'Story cover' });
    }
    const chars = p.cast.map((id) => lookFor(id, p)).filter(Boolean).map((look) => ({ look: look! }));
    return sceneSvg({ placeId: p.place, drawn: drawnPlace(p.place), seed: story.seed + view, chars, focus: p.focus, animated, label: fill(p.text, members) });
  };
  const bigArt = useMemo(() => art(page, true), [page, cast, dressUp, story, view, drawn]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = (id: string) => setPlaces((ps) => (ps.includes(id) ? ps.filter((x) => x !== id) : [...ps, id]));
  const pet = isPet(person.look.kind);
  const drawing = !!person.look.drawing;
  /** A faint picture of the character, cropped to where a drawn hat, outfit or toy will go. */
  const guideFor = (mode?: DrawMode) => {
    if (!mode || mode === 'place' || mode === 'character' || drawing) return undefined;
    const [x, y, w, h] = WEAR_BOX[mode];
    return characterSvg({ ...person.look, [mode]: 'none', expression: undefined }, { viewBox: `${x} ${y} ${w} ${h}` });
  };

  return (
    <div className="lab bt">
      <LabsHeader title="Baby Tales" />
      <main className="lab-main">
        <section className="lab-hero">
          <p className="eyebrow">NomNoms Baby Tales · Demo</p>
          <h1 className="display">The Adventures of <em>{cast[0].member.name || 'your little one'}</em></h1>
          <p className="lab-lede">Turn your family into storybook characters, dress them up, draw your own places and friends, and get a simple story where they’re the heroes. Change any name, place, outfit or word.</p>
          <DemoNote>Photos are read on this device to make the characters, then let go. Nothing in this demo is uploaded or saved.</DemoNote>
        </section>

        {/* ── 1. the cast ─────────────────────────────── */}
        <section className="lab-section" aria-labelledby="bt-cast">
          <div className="lab-h"><span className="lab-n">1</span><h2 id="bt-cast" className="display">Who’s in the story</h2></div>
          <div className="bt-cast" role="group" aria-label="Cast">
            {cast.map((p, i) => (
              <button key={p.member.id} type="button" className={cx('bt-member', !p.member.inStory && 'is-out')} aria-pressed={i === pi} onClick={() => choose(i)} data-testid={`cast-${p.member.id}`}>
                <span className="bt-face" dangerouslySetInnerHTML={{ __html: characterSvg(p.look, { viewBox: p.look.drawing ? '-20 -30 240 300' : isPet(p.look.kind) ? '30 14 140 140' : FACE_VIEWBOX }) }} />
                <span className="bt-member-name">{p.member.name || 'No name'}</span>
                <small>{usesCall(p.member.role) ? p.member.call : p.look.drawing ? 'Drawn' : ROLE_LABEL[p.member.role]}</small>
              </button>
            ))}
            <button type="button" className="bt-member is-add" onClick={() => setAdding((a) => !a)} aria-expanded={adding} data-testid="cast-add">
              <span className="bt-face"><Icon name="plus" size={24} /></span><span className="bt-member-name">Add</span><small>someone</small>
            </button>
            <button type="button" className="bt-member is-add" onClick={() => setPad({ mode: 'character' })} data-testid="cast-draw">
              <span className="bt-face"><Icon name="pen" size={22} /></span><span className="bt-member-name">Draw</span><small>a character</small>
            </button>
          </div>
          {adding && (
            <div className="lab-card bt-adder" data-testid="cast-adder">
              <h3>Add to the story</h3>
              <div className="lab-chips">
                {ADDABLE.map((a) => <button key={a.label} type="button" className="lab-chip" onClick={() => add(a.make)} data-testid={`add-${a.label}`}>{a.label}</button>)}
                <button type="button" className="lab-chip is-accent" onClick={() => { setAdding(false); setPad({ mode: 'character' }); }} data-testid="add-drawing"><Icon name="pen" size={14} /> Draw a character</button>
              </div>
            </div>
          )}

          <div className="bt-studio">
            <div className="bt-stage" dangerouslySetInnerHTML={{ __html: characterSvg(person.look, { animated: true, label: `${person.member.name}’s character` }) }} />

            <div className="bt-panel">
              <div className="lab-card">
                <div className="bt-names">
                  <label className="field"><span>Name</span>
                    <input value={person.member.name} onChange={(e) => update({ member: { name: e.target.value, ...(usesCall(person.member.role) ? {} : { call: e.target.value }) } })} data-testid="cast-name" />
                  </label>
                  {usesCall(person.member.role) && (
                    <label className="field"><span>{cast[0].member.name || 'The star'} calls them</span>
                      <input value={person.member.call} onChange={(e) => update({ member: { call: e.target.value } })} data-testid="cast-call" />
                    </label>
                  )}
                </div>
                <div className="lab-row">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { const pool = person.member.role === 'pet' ? PET_NAMES : NAMES; const n = pool[Math.floor(Math.random() * pool.length)]; update({ member: { name: n, ...(usesCall(person.member.role) ? {} : { call: n }) } }); }} data-testid="pick-name">
                    <Icon name="sparkle" size={15} /> Pick a name
                  </button>
                  {pi > 0 && <label className="lab-switch"><input type="checkbox" checked={person.member.inStory} onChange={(e) => update({ member: { inStory: e.target.checked } })} /> In the story</label>}
                  {pi > 0 && <button type="button" className="btn btn-danger-ghost btn-sm" onClick={remove} data-testid="cast-remove"><Icon name="x" size={14} /> Remove</button>}
                </div>
              </div>

              <div className="lab-card" data-testid="personality-card">
                <h3>Personality</h3>
                <p className="lab-sub">Sets {person.member.name || 'their'}{person.member.name ? '’s' : ''} face, how they move and how they react in the story.</p>
                <div className="bt-pers">
                  {(Object.keys(PERSONALITIES) as Personality[]).map((k) => (
                    <button key={k} type="button" className="bt-per" aria-pressed={person.look.personality === k} onClick={() => update({ look: { personality: k, expression: undefined } })} data-testid={`pers-${k}`}>
                      {!pet && !drawing && <span dangerouslySetInnerHTML={{ __html: characterSvg({ ...person.look, personality: k, expression: undefined, face: undefined, hat: 'none', glasses: 'none' }, { viewBox: '24 30 152 128' }) }} />}
                      <strong>{PERSONALITIES[k].label}</strong><small>{PERSONALITIES[k].blurb}</small>
                    </button>
                  ))}
                </div>
              </div>

              {drawing ? (
                <div className="lab-card">
                  <h3>A drawn character</h3>
                  <p className="lab-sub">{person.member.name} appears in the story exactly as drawn.</p>
                  <div className="lab-row"><button type="button" className="btn btn-ghost btn-sm" onClick={() => setPad({ mode: 'character', redraw: person.member.id })}><Icon name="pen" size={15} /> Draw again</button></div>
                </div>
              ) : !pet ? (
                <div className="lab-card">
                  <h3>Make {person.member.name || 'them'} from a photo</h3>
                  <p className="lab-sub">Pick a sample or use your own. NomNoms reads skin tone, hair colour, length and curls on this device, then lets the photo go.</p>
                  <div className="bt-photos">
                    {(SAMPLE_PHOTOS[person.member.role] ?? SAMPLE_PHOTOS.friend).map((s) => (
                      <button key={s.path} type="button" className="bt-photo" onClick={() => fromPhoto(samplePhotoUrl(s.path), s.path, samplePhotoUrl(s.path, 160))} disabled={!!busy} aria-label={`Sample photo by ${s.by}`} data-testid="sample-photo">
                        <img src={samplePhotoUrl(s.path, 160)} alt="" crossOrigin="anonymous" loading="lazy" />
                        {busy === s.path && <span className="bt-photo-busy" />}
                      </button>
                    ))}
                    <button type="button" className="bt-photo is-own" onClick={() => fileRef.current?.click()} disabled={!!busy} data-testid="own-photo">
                      <Icon name="camera" size={20} /><span>Your photo</span>
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void fromPhoto(URL.createObjectURL(f), 'own', '', true); }} />
                  </div>
                  {result && (
                    <div className="bt-result" role="status" data-testid="photo-result">
                      <span className="bt-result-photo">{result.from ? <img src={result.from} alt="" /> : <Icon name="camera" size={20} />}</span>
                      <Icon name="arrow-right" size={18} />
                      <span className="bt-result-char" dangerouslySetInnerHTML={{ __html: characterSvg(person.look, { viewBox: FACE_VIEWBOX }) }} />
                      <div className="bt-result-text">
                        <strong>{result.who}, from the photo</strong>
                        <div className="bt-matched">{result.matched.map((m) => <span key={m}>{m}</span>)}</div>
                        <small>{result.from ? 'Not quite right? Adjust the look below.' : 'Your photo wasn’t kept. Adjust the look below if you like.'}</small>
                      </div>
                    </div>
                  )}
                  {status && <p className="lab-status" role="status">{status}</p>}

                  <details className="bt-genmoji">
                    <summary><span>Use a real Genmoji</span><small>iPhone, iPad or Mac with Apple Intelligence</small></summary>
                    <ol>
                      <li>Tap the box below and open the emoji keyboard (on Mac, press <kbd>fn</kbd> <kbd>E</kbd>).</li>
                      <li>Choose <strong>Genmoji</strong>, then pick {person.member.name || 'them'} from your Photos or describe them.</li>
                      <li>Insert it. It becomes their face, and you can still dress them up.</li>
                    </ol>
                    <p className="lab-hint">Apple only makes Genmoji inside its own keyboard, so a website can’t turn a photo into one by itself. The photo stays with Apple; NomNoms only keeps the finished face.</p>
                    <div ref={genRef} className="bt-genbox" contentEditable suppressContentEditableWarning data-placeholder="Tap here and insert a Genmoji…" aria-label="Insert a Genmoji here"
                      onInput={() => setTimeout(onGenmoji, 150)}
                      onPaste={(e) => { const f = pastedImage(e); if (!f) return; e.preventDefault(); update({ look: { face: URL.createObjectURL(f), faceScale: 100, faceY: 0, glassesY: 0 } }); setStatus('Got it. Now dress them up.'); }} />
                  </details>
                  {person.look.face && (
                    <div className="bt-fit">
                      <label htmlFor="fs">Face size</label><input id="fs" type="range" min="70" max="135" value={person.look.faceScale ?? 100} onChange={(e) => update({ look: { faceScale: +e.target.value } })} />
                      <label htmlFor="fy">Face height</label><input id="fy" type="range" min="-25" max="25" value={person.look.faceY ?? 0} onChange={(e) => update({ look: { faceY: +e.target.value } })} />
                      <label htmlFor="fg">Glasses height</label><input id="fg" type="range" min="-20" max="20" value={person.look.glassesY ?? 0} onChange={(e) => update({ look: { glassesY: +e.target.value } })} />
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => update({ look: { face: undefined } })}>Use the drawn face</button>
                    </div>
                  )}
                </div>
              ) : null}

              {!drawing && !person.look.face && (
                <div className="lab-card" data-testid="look-card">
                  <h3>{pet ? 'Pet' : 'Look'}</h3>
                  {pet ? (
                    <>
                      <div className="lab-chips">{PETS.map((k) => <button key={k.kind} type="button" className="lab-chip" aria-pressed={person.look.kind === k.kind} onClick={() => update({ look: { kind: k.kind } })}>{k.label}</button>)}</div>
                      <p className="lab-sub">Fur</p>
                      <div className="bt-swatches">{HAIR_COLOURS.map((c) => <button key={c} type="button" className="bt-swatch" style={{ background: c }} aria-pressed={person.look.hair === c} aria-label={`Fur colour ${c}`} onClick={() => update({ look: { hair: c } })} />)}</div>
                    </>
                  ) : (
                    <>
                      {pi > 0 && <div className="lab-chips">{KINDS.map((k) => <button key={k.kind} type="button" className="lab-chip" aria-pressed={person.look.kind === k.kind} onClick={() => update({ look: { kind: k.kind } })}>{k.label}</button>)}</div>}
                      <p className="lab-sub">Skin</p>
                      <div className="bt-swatches">{SKIN_TONES.map((c) => <button key={c} type="button" className="bt-swatch" style={{ background: c }} aria-pressed={person.look.skin === c} aria-label={`Skin tone ${c}`} onClick={() => update({ look: { skin: c } })} />)}</div>
                      <p className="lab-sub">Hair colour</p>
                      <div className="bt-swatches">{HAIR_COLOURS.map((c) => <button key={c} type="button" className="bt-swatch" style={{ background: c }} aria-pressed={person.look.hair === c} aria-label={`Hair colour ${c}`} onClick={() => update({ look: { hair: c } })} />)}</div>
                      <p className="lab-sub">Hair</p>
                      <div className="bt-hairs">
                        {(Object.keys(HAIR_STYLES) as HairStyle[]).map((h) => (
                          <button key={h} type="button" className="bt-hair" aria-pressed={person.look.hairStyle === h} onClick={() => update({ look: { hairStyle: h } })} data-testid={`hair-${h}`}>
                            <span dangerouslySetInnerHTML={{ __html: characterSvg({ ...person.look, hairStyle: h, hat: 'none', glasses: 'none' }, { viewBox: '10 -10 180 180' }) }} />
                            <small>{HAIR_STYLES[h]}</small>
                          </button>
                        ))}
                      </div>
                      <p className="lab-sub">Eyes</p>
                      <div className="bt-swatches">{EYE_COLOURS.map((c) => <button key={c} type="button" className="bt-swatch" style={{ background: c }} aria-pressed={person.look.eyes === c} aria-label={`Eye colour ${c}`} onClick={() => update({ look: { eyes: c } })} />)}</div>
                      <p className="lab-sub">Face <small>· in the story it changes with what happens</small></p>
                      <div className="bt-hairs">
                        {(Object.keys(EXPRESSIONS) as Expression[]).map((x) => (
                          <button key={x} type="button" className="bt-hair" aria-pressed={exprOf(person.look) === x} onClick={() => update({ look: { expression: x } })} data-testid={`face-${x}`}>
                            <span dangerouslySetInnerHTML={{ __html: characterSvg({ ...person.look, expression: x, hat: 'none', glasses: 'none' }, { viewBox: '24 30 152 128' }) }} />
                            <small>{EXPRESSIONS[x]}</small>
                          </button>
                        ))}
                      </div>
                      <div className="lab-chips">
                        <button type="button" className="lab-chip" aria-pressed={!!person.look.freckles} onClick={() => update({ look: { freckles: !person.look.freckles } })}>Freckles</button>
                        <button type="button" className="lab-chip" aria-pressed={!!person.look.lashes} onClick={() => update({ look: { lashes: !person.look.lashes } })}>Lashes</button>
                      </div>
                      {(person.look.kind === 'adult' || person.look.kind === 'elder') && (
                        <>
                          <p className="lab-sub">Facial hair</p>
                          <div className="lab-chips">
                            {FACIALS.map((f) => <button key={f} type="button" className="lab-chip" aria-pressed={(person.look.facial ?? (person.look.beard ? 'trim' : 'none')) === f} onClick={() => update({ look: { facial: f, beard: undefined } })} data-testid={`facial-${f}`}>{FACIAL[f]}</button>)}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}

              {!drawing && (
                <div className="lab-card">
                  <div className="lab-tabs" role="tablist">
                    {(Object.keys(WARDROBE) as WardrobeTab[]).map((k) => <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} data-testid={`tab-${k}`}>{WARDROBE[k][0]}</button>)}
                  </div>
                  <div className="bt-tiles">
                    <button type="button" className="bt-tile is-draw" onClick={() => setPad({ mode: tab })} data-testid={`draw-${tab}`}>
                      <span><Icon name="pen" size={22} /></span><small>Draw your own</small>
                    </button>
                    {wardrobe.filter((w) => w.slot === tab).map((w) => (
                      <button key={w.id} type="button" className="bt-tile" aria-pressed={person.look[tab] === 'drawn' && person.look.worn?.[tab] === w.image} onClick={() => update({ look: { [tab]: 'drawn', worn: { ...person.look.worn, [tab]: w.image } } as Partial<Look> })} data-testid="wear-drawn">
                        <span dangerouslySetInnerHTML={{ __html: characterSvg({ ...person.look, [tab]: 'drawn', worn: { ...person.look.worn, [tab]: w.image } }) }} />
                        <small>{w.name}</small>
                      </button>
                    ))}
                    {Object.entries(WARDROBE[tab][1]).map(([v, label]) => (
                      <button key={v} type="button" className="bt-tile" aria-pressed={person.look[tab] === v} onClick={() => update({ look: { [tab]: v } as Partial<Look> })} data-testid={`wear-${v}`}>
                        <span dangerouslySetInnerHTML={{ __html: characterSvg({ ...person.look, [tab]: v }) }} />
                        <small>{label}</small>
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
            <div className="lab-chips">
              <button type="button" className="lab-chip is-accent" onClick={() => setPad({ mode: 'place' })} data-testid="draw-place"><Icon name="pen" size={14} /> Draw a place</button>
              {drawn.map((d) => (
                <button key={d.id} type="button" className="lab-chip is-drawn" aria-pressed={places.includes(d.id)} onClick={() => toggle(d.id)}>
                  <img src={d.image} alt="" /> {d.name}
                </button>
              ))}
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
                    {cast[0].look.personality && <p className="bt-tagline">{PERSONALITIES[cast[0].look.personality].line.replace(/\{H\}/g, cast[0].member.call || cast[0].member.name)}</p>}
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
                      {drawn.length > 0 && <optgroup label="Your drawings">{drawn.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</optgroup>}
                      <optgroup label="Places">{PLACES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>
                    </select>
                  </label>
                  <div>
                    <p className="lab-sub">In the picture (up to 3)</p>
                    <div className="lab-chips">
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
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { const fresh = regeneratePage(story, view - 1, members, story.seed * 31 + view * 7 + Math.floor(Math.random() * 1000), extraPlaces); setPage({ ...fresh }); toast('New version of this page', { icon: 'sparkle', ms: 1400 }); }} data-testid="page-again">
                    <Icon name="refresh" size={15} /> Try another version
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPad({ mode: 'place' })}><Icon name="pen" size={15} /> Draw a place for this page</button>
                </div>
              </div>
            )}
          </div>
        </section>

        <p className="lab-fine">A demo of a coming NomNoms feature. Characters and scenes are previews. Sample photos from <a href="https://unsplash.com/?utm_source=nomnoms&utm_medium=referral" target="_blank" rel="noreferrer">Unsplash</a>. Genmoji works on Apple devices with Apple Intelligence.</p>
      </main>
      <DrawPad open={!!pad} mode={pad?.mode ?? 'character'} guide={guideFor(pad?.mode)} onClose={() => setPad(null)} onDone={onDrawn} />
    </div>
  );
}
