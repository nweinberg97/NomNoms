import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../components/Icon';
import { toast } from '../../components/ui';
import { cx, firstName } from '../../lib/util';
import { useAppOptional } from '../../state/store';
import { catchGenmoji, pastedImage } from '../genmoji';
import { DemoNote, LabsHeader } from '../LabsHeader';
import { OWN_DROP_ATTR } from '../../components/DropZone';
import { NAMES, PET_NAMES, PLACES, ROLE_LABEL, STORY_TYPES, type Place, type Role, type StoryType } from './catalog';
import {
  EXPRESSIONS, EXTRAS, EYE_COLOURS, FACE_VIEWBOX, fitViewBox, FACIAL, GLASSES, HAIR_COLOURS, HAIR_STYLES, HATS, OUTFITS, PERSONALITIES, SKIN_TONES, WEAR_BOX,
  characterSvg, exprOf, isPet, type Expression, type Facial, type HairStyle, type Kind, type Look, type Personality, type WearSlot,
} from './character';
import { DrawPad, type DrawMode } from './DrawPad';
import { SAMPLE_PHOTOS, samplePhotoUrl } from './fromPhoto';
import { likenessFromPhoto } from './likeness/detect';
import { applyDNA, buildDNA, parentTraits } from './likeness/dna';
import type { Measurements } from './likeness/measure';
import { describeDNA, type IdentityKey } from './likeness/dna';
import { SHAPE_KEYS, type ShapeKey } from './likeness/measure';
import { fill, generateStory, regeneratePage, tokenize, type CastMember, type Story, type StoryPage } from './generator';
import { sceneSvg, type DrawnPlace, type SceneThing } from './scene';
import { STYLE_MODES, STYLES, type StyleMode } from './styles';
import { AssetStudio } from './AssetStudio';
import { assetArtUrl } from './assets/browser';
import { deleteAsset, listAssets, saveAsset } from './assets/library';
import type { StoredAsset } from './assets/meta';
import type { AssetKind } from './assets/pipeline';

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
const SHAPE_LABELS: Record<ShapeKey, [string, string, string]> = {
  faceWidth: ['Face width', 'Narrow', 'Wide'], faceLength: ['Face length', 'Short', 'Long'], jaw: ['Jaw', 'Pointed', 'Square'],
  eyeSize: ['Eye size', 'Small', 'Big'], eyeGap: ['Eye spacing', 'Close', 'Apart'], nose: ['Nose', 'Narrow', 'Wide'],
  mouth: ['Mouth', 'Small', 'Wide'], browHeight: ['Brows', 'Low', 'High'], browWeight: ['Brow weight', 'Light', 'Bold'],
};
interface DrawnWear { id: string; slot: WearSlot; name: string; image: string }
const usesCall = (r: Role) => r === 'parent' || r === 'grandparent' || r === 'relative' || r === 'teacher';

/** A place the family made (drawn or from a photo), in words the story generator can use. */
function familyPlace(id: string, name: string): Place {
  const first = name.split(' ')[0];
  const lowered = ['The', 'Our', 'My', 'A', 'An'].includes(first) ? name.charAt(0).toLowerCase() + name.slice(1) : name;
  return {
    id, name, at: `at ${lowered}`, sky: ['#ffffff', '#ffffff'], ground: '#ffffff', groundKind: 'floor', horizon: 'none', props: ['✨', '🌟'],
    surprises: ['just a little bird singing', 'just a big friendly smile', 'just a rainbow of colours', 'just a funny shadow'],
    doing: ['play and play', 'look all around', 'have a little adventure', 'dance and giggle'],
  };
}

function placeFromDrawing(id: string, name: string, image: string): DrawnPlace {
  return { ...familyPlace(id, name), image, props: ['✨', '🎨'] };
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
  const [result, setResult] = useState<{ who: string; from: string; matched: { label: string; sure: boolean }[]; notes: string[]; kept: IdentityKey[] } | null>(null);
  /** Identity traits a parent set by hand, per person: a new photo never overwrites these. */
  const [chosen, setChosen] = useState<Record<string, IdentityKey[]>>({});
  const [dropping, setDropping] = useState<'new' | 'current' | false>(false);
  /** The last photo reading per person (numbers only, no pixels), so the age group can be changed with a tap. */
  const [readings, setReadings] = useState<Record<string, Measurements>>({});

  /* ── undo / redo for every change to the characters ──────── */
  type Snap = { cast: Person[]; chosen: Record<string, IdentityKey[]>; readings: Record<string, Measurements>; sel: number };
  const past = useRef<Snap[]>([]);
  const future = useRef<Snap[]>([]);
  const prevSnap = useRef<Snap>({ cast, chosen, readings, sel });
  const lastPush = useRef(0);
  const restoring = useRef(false);
  const [, setHistoryTick] = useState(0);
  useEffect(() => {
    const now: Snap = { cast, chosen, readings, sel };
    const was = prevSnap.current;
    prevSnap.current = now;
    if (restoring.current) { restoring.current = false; return; }
    if (was.cast === cast && was.chosen === chosen) return; // just picking someone isn't a change
    const t = Date.now();
    // a slider drag or a burst of typing is one step
    if (t - lastPush.current > 700 || !past.current.length) { past.current.push(was); if (past.current.length > 60) past.current.shift(); }
    lastPush.current = t;
    future.current = [];
    setHistoryTick((x) => x + 1);
  }, [cast, chosen, readings, sel]);
  const restore = (to: Snap) => {
    restoring.current = true;
    lastPush.current = 0;
    setCast(to.cast); setChosen(to.chosen); setReadings(to.readings);
    setSel(Math.min(to.sel, to.cast.length - 1));
    setResult(null); setStatus(undefined);
    setHistoryTick((x) => x + 1);
  };
  const undo = () => { const s = past.current.pop(); if (!s) return; future.current.push(prevSnap.current); restore(s); };
  const redo = () => { const s = future.current.pop(); if (!s) return; past.current.push(prevSnap.current); restore(s); };
  const undoRef = useRef(undo); undoRef.current = undo;
  const redoRef = useRef(redo); redoRef.current = redo;
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z' && e.key.toLowerCase() !== 'y') return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && (t as HTMLInputElement).type !== 'range' && (t as HTMLInputElement).type !== 'checkbox')) return; // text keeps its own undo
      e.preventDefault();
      if (e.key.toLowerCase() === 'y' || e.shiftKey) redoRef.current(); else undoRef.current();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  const undoToast = (text: string) => toast(text, { icon: 'check', ms: 5000, action: { label: 'Undo', run: () => undoRef.current() } });
  const [status, setStatus] = useState<string>();
  /** A just-added person still waiting for a photo, a preset or a drawing. */
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pad, setPad] = useState<{ mode: DrawMode; redraw?: string } | null>(null);
  const [wardrobe, setWardrobe] = useState<DrawnWear[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const newFileRef = useRef<HTMLInputElement>(null);
  const studioRef = useRef<HTMLDivElement>(null);
  const genRef = useRef<HTMLDivElement>(null);
  const members = cast.map((p) => p.member);
  const membership = cast.map((p) => `${p.member.id}:${p.member.inStory}`).join();
  /* ── the look, and the family's places and things ───── */
  const [mode, setMode] = useState<StyleMode>('pocketlight');
  const [library, setLibrary] = useState<StoredAsset[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [studio, setStudio] = useState<{ kind: AssetKind } | null>(null);
  useEffect(() => { void listAssets().then((a) => { setLibrary(a); setSaved(new Set(a.map((x) => x.meta.id))); }); }, []);
  // every place and thing is redrawn from its stored regions in the current look
  const art_ = useMemo(() => new Map(library.map((a) => [a.meta.id, assetArtUrl(a.base, mode)])), [library, mode]);
  const photoPlaces = library.filter((a) => a.meta.kind === 'place');
  const things = library.filter((a) => a.meta.kind === 'object');
  const extraPlaces: Place[] = [...drawn, ...photoPlaces.map((a) => familyPlace(a.meta.id, a.meta.name))];
  const onAsset = async (a: StoredAsset, save: boolean) => {
    setStudio(null);
    setLibrary((l) => [a, ...l.filter((x) => x.meta.id !== a.meta.id)]);
    if (a.meta.kind === 'place') setPlaces((ps) => [...ps, a.meta.id]);
    if (save) {
      try {
        await saveAsset(a);
        setSaved((s0) => new Set(s0).add(a.meta.id));
        toast(`“${a.meta.name}” is saved in this browser`, { icon: 'check', ms: 2000 });
      } catch (e) {
        toast((e as Error).message, { icon: 'x', ms: 2600 });
      }
    } else toast(`“${a.meta.name}” is in this story for now`, { icon: 'sparkle', ms: 2000 });
  };
  const removeAsset = async (id: string) => {
    if (saved.has(id)) await deleteAsset(id).catch(() => undefined);
    setLibrary((l) => l.filter((x) => x.meta.id !== id));
    setSaved((s0) => { const n = new Set(s0); n.delete(id); return n; });
    setPlaces((ps) => ps.filter((x) => x !== id));
    setStory((st) => ({ ...st, pages: st.pages.map((pg) => ({ ...pg, things: pg.things?.filter((t) => t !== id) })) }));
  };

  // a new story whenever its recipe changes
  useEffect(() => {
    setStory(generateStory(type, members, { seed, places, extraPlaces }));
    setView(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, seed, places.join(), membership, drawn.length, photoPlaces.length]);

  const person = cast[Math.min(sel, cast.length - 1)];
  const pi = cast.indexOf(person);
  const update = (patch: { member?: Partial<CastMember>; look?: Partial<Look> }, i = pi) =>
    setCast((cs) => cs.map((p, k) => (k === i ? { member: { ...p.member, ...patch.member }, look: { ...p.look, ...patch.look } } : p)));
  const byId = (id: string) => cast.find((p) => p.member.id === id);
  const choose = (i: number) => {
    setStatus(undefined); setResult(null);
    // leaving an untouched new person behind simply drops it
    if (pendingId && cast[i]?.member.id !== pendingId) {
      const id = cast[i].member.id;
      const rest = cast.filter((p) => p.member.id !== pendingId);
      setCast(rest); setPendingId(null); setSel(Math.max(0, rest.findIndex((p) => p.member.id === id)));
      return;
    }
    setSel(i);
  };

  /* ── faces ─────────────────────────────────────────── */
  /** A hand-picked identity trait: change it and remember the parent chose it. */
  const pick = (key: IdentityKey, look: Partial<Look>) => {
    update({ look });
    const id = person.member.id;
    setChosen((c) => ({ ...c, [id]: [...new Set([...(c[id] ?? []), key])] }));
  };
  /**
   * Photo → character. `target` is the selected person, or 'new' to add someone.
   * The photo decides baby / kid / grown-up / grandparent unless a parent chose it.
   */
  const fromPhoto = async (src: string | Blob, label: string, from: string, target: 'current' | 'new' = 'current') => {
    setBusy(label);
    setStatus('Reading the face on this device… (the first time takes a moment)');
    setResult(null);
    const fresh = target === 'new' ? mk('relative', 'Someone new', 'Someone new', { kind: 'adult', hairStyle: 'short', outfit: 'tee', personality: 'sunny' }) : null;
    const who = fresh ?? person;
    const id = who.member.id, kept = fresh ? [] : chosen[id] ?? [];
    try {
      const r = await likenessFromPhoto(src, who.look, kept);
      const m = r.measurements;
      const found = m.skin.status !== 'missing' || SHAPE_KEYS.some((k) => m.shape[k].status !== 'missing');
      if (!found) { setStatus(`${m.warnings[0] ?? 'No face was found.'} Nothing was changed.`); return; }
      const look = { ...r.look, face: undefined };
      if (fresh) {
        const role: Role = look.kind === 'elder' ? 'grandparent' : look.kind === 'adult' ? 'relative' : look.kind === 'baby' ? 'sibling' : 'friend';
        setSel(cast.length);
        setCast((cs) => [...cs, { member: { ...fresh.member, role }, look }]);
        setTimeout(() => studioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
      } else if (id === pendingId) {
        // the new person gets their look, a fitting role, and joins the story
        const role: Role = look.kind === 'elder' ? 'grandparent' : look.kind === 'adult' ? 'relative' : look.kind === 'baby' ? 'sibling' : 'friend';
        setCast((cs) => cs.map((p) => (p.member.id === id ? { member: { ...p.member, role, inStory: true }, look } : p)));
        setPendingId(null);
      } else setCast((cs) => cs.map((p) => (p.member.id === id ? { ...p, look } : p)));
      setReadings((rs) => ({ ...rs, [id]: m }));
      setResult({ who: fresh ? 'Someone new' : who.member.name, from, matched: describeDNA(r.dna), notes: r.dna.warnings, kept });
      setStatus(fresh || id === pendingId ? 'Added! Give them a name below.' : undefined);
      undoToast(fresh ? 'Added someone new from the photo' : `Made ${who.member.name || 'them'} from the photo`);
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(undefined);
    }
  };
  /** Change the age group after a photo: redraw from the same reading, and remember the parent chose it. */
  const setKind = (kind: Kind) => {
    const m = readings[person.member.id];
    const kept = [...new Set([...(chosen[person.member.id] ?? []), 'kind' as const])];
    setChosen((c) => ({ ...c, [person.member.id]: kept }));
    if (!m) { update({ look: { kind } }); return; }
    const dna = buildDNA(m, kind, parentTraits(person.look, kept));
    update({ look: applyDNA(person.look, dna) });
    setResult((r) => (r ? { ...r, matched: describeDNA(dna) } : r));
  };
  const photoFile = (e: React.DragEvent) => [...e.dataTransfer.files].find((x) => x.type.startsWith('image/') || /\.(heic|heif|jpe?g|png|webp)$/i.test(x.name));
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
    toast(`${p.member.call} joined the story`, { icon: 'plus', ms: 1500 });
  };
  /** 'Add': a new, highlighted person of their own, so a photo never replaces anyone else. */
  const startNew = () => {
    const open = pendingId ? cast.findIndex((p) => p.member.id === pendingId) : -1;
    if (open >= 0) { setSel(open); return; }
    const p = mk('relative', 'New person', 'New person', { kind: 'adult', skin: '#e4ad86', hair: '#7a5236', hairStyle: 'short', outfit: 'tee', personality: 'sunny' });
    p.member.inStory = false;
    setCast((cs) => [...cs, p]);
    setSel(cast.length);
    setPendingId(p.member.id);
    setResult(null); setStatus(undefined);
    setTimeout(() => studioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };
  /** The new person becomes a preset (Sister, Grandma, a cat…), in the same spot. */
  const fillPending = (make: () => Person) => {
    const p = make();
    setCast((cs) => cs.map((x) => (x.member.id === pendingId ? { member: { ...p.member, id: x.member.id }, look: p.look } : x)));
    setPendingId(null);
    toast(`${p.member.call} joined the story`, { icon: 'plus', ms: 1500 });
  };
  const cancelNew = () => {
    const rest = cast.filter((p) => p.member.id !== pendingId);
    setCast(rest); setPendingId(null); setSel(Math.min(sel, rest.length - 1));
  };
  const remove = () => {
    if (pi === 0) return;
    const name = person.member.name || 'them';
    setCast((cs) => cs.filter((_, k) => k !== pi));
    setSel(Math.max(0, pi - 1));
    undoToast(`Removed ${name}`);
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
      setCast((cs) => cs.map((p) => (p.member.id === pad.redraw ? { ...p, member: { ...p.member, name, call: name, ...(p.member.id === pendingId ? { inStory: true } : {}) }, look: { ...p.look, drawing: image } } : p)));
      if (pad.redraw === pendingId) setPendingId(null);
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
  const photoPlace = (id?: string) => {
    const a = photoPlaces.find((x) => x.meta.id === id);
    return a && art_.get(a.meta.id) ? { image: art_.get(a.meta.id)!, horizon: a.meta.placement.horizon ?? 0.55 } : undefined;
  };
  const thingsFor = (p?: StoryPage): SceneThing[] => (p?.things ?? []).map((tid, i) => {
    const a = things.find((x) => x.meta.id === tid);
    if (!a || !art_.get(tid)) return null;
    return { image: art_.get(tid)!, width: a.base.w, height: a.base.h, heightRatio: a.meta.placement.heightRatio ?? 0.5, x: [0.86, 0.5, 0.14][i % 3] };
  }).filter(Boolean) as SceneThing[];
  const art = (p: StoryPage | undefined, animated: boolean) => {
    if (!p) {
      const first = story.pages[0];
      const ids = [cast[0].member.id, ...cast.filter((c, i) => i > 0 && c.member.inStory).slice(0, 2).map((c) => c.member.id)];
      return sceneSvg({ placeId: first?.place ?? 'park', drawn: drawnPlace(first?.place), photo: photoPlace(first?.place), seed: story.seed, chars: ids.map((id) => ({ look: lookFor(id, first)! })), animated, label: 'Story cover', style: mode });
    }
    const chars = p.cast.map((id) => lookFor(id, p)).filter(Boolean).map((look) => ({ look: look! }));
    return sceneSvg({ placeId: p.place, drawn: drawnPlace(p.place), photo: photoPlace(p.place), things: thingsFor(p), seed: story.seed + view, chars, focus: p.focus, animated, label: fill(p.text, members), style: mode });
  };
  const bigArt = useMemo(() => art(page, true), [page, cast, dressUp, story, view, drawn, mode, art_]); // eslint-disable-line react-hooks/exhaustive-deps
  // a preview of each look: the star and one friend at the park
  const lookPreviews = useMemo(() => {
    const friend = cast.find((c, i) => i > 0 && !isPet(c.look.kind) && !c.look.drawing) ?? cast[0];
    return new Map(STYLE_MODES.map((m) => [m, sceneSvg({ placeId: 'park', seed: 4, chars: [{ look: cast[0].look }, { look: friend.look }], style: m })]));
  }, [cast]);
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
      <div className="bt-lookbar">
        <div className="bt-lookbar-looks" role="radiogroup" aria-label="Look">
          <span>Look</span>
          {STYLE_MODES.map((m) => <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)} data-testid={`lookbar-${m}`}>{STYLES[m].name}</button>)}
        </div>
        <div className="bt-undo" role="group" aria-label="Undo and redo">
          <button type="button" onClick={undo} disabled={!past.current.length} aria-label="Undo" title="Undo (Ctrl/⌘ Z)" data-testid="undo"><Icon name="undo" size={16} /><em>Undo</em></button>
          <button type="button" onClick={redo} disabled={!future.current.length} aria-label="Redo" title="Redo (Shift Ctrl/⌘ Z)" data-testid="redo"><Icon name="redo" size={16} /></button>
        </div>
      </div>
      <main className="lab-main">
        <section className="lab-hero">
          <p className="eyebrow">NomNoms Baby Tales · Demo</p>
          <h1 className="display">The Adventures of <em>{cast[0].member.name || 'your little one'}</em></h1>
          <p className="lab-lede">Turn your family into storybook characters, dress them up, draw your own places and friends, and get a simple story where they’re the heroes. Change any name, place, outfit or word.</p>
          <DemoNote>Photos are read on this device and never uploaded. Nothing is saved unless you choose “Save to my library”, and then only in this browser.</DemoNote>
        </section>

        {/* ── 1. the look ──────────────────────────────── */}
        <section className="lab-section" aria-labelledby="bt-look">
          <div className="lab-h"><span className="lab-n">1</span><h2 id="bt-look" className="display">The look</h2></div>
          <p className="lab-sub bt-look-sub">Everyone keeps their own face, hair and clothes in every look. Switch any time; nothing in the story changes.</p>
          <div className="bt-looks" role="radiogroup" aria-label="Look of the book">
            {STYLE_MODES.map((m) => (
              <button key={m} type="button" className="bt-look" role="radio" aria-checked={mode === m} onClick={() => setMode(m)} data-testid={`look-${m}`}>
                <span className="bt-look-art" dangerouslySetInnerHTML={{ __html: lookPreviews.get(m)! }} />
                <strong>{STYLES[m].name}</strong>
                <small>{STYLES[m].blurb}</small>
              </button>
            ))}
          </div>
        </section>

        {/* ── 2. the cast ─────────────────────────────── */}
        <section className="lab-section" aria-labelledby="bt-cast">
          <div className="lab-h"><span className="lab-n">2</span><h2 id="bt-cast" className="display">Who’s in the story</h2></div>
          <div className={cx('bt-photohero', dropping === 'new' && 'is-dropping')} {...{ [OWN_DROP_ATTR]: '' }} data-testid="photo-hero"
            onDragOver={(e) => { if (![...e.dataTransfer.types].includes('Files')) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setDropping('new'); }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropping(false); }}
            onDrop={(e) => { e.preventDefault(); setDropping(false); const f = photoFile(e); if (f && !busy) void fromPhoto(f, 'new', '', 'new'); else if (!f) setStatus('That isn’t a photo. Drop a JPEG or PNG.'); }}>
            <span className="bt-photohero-icon"><Icon name="camera" size={26} /></span>
            <div className="bt-photohero-text">
              <strong>Turn a photo into a character</strong>
              <span>Add a photo of anyone in the family. NomNoms finds the face, works out if they’re a baby, kid or grown-up, and draws them. The photo stays on this device and isn’t kept.</span>
            </div>
            <div className="bt-photohero-actions">
              <button type="button" className="btn btn-primary" onClick={() => newFileRef.current?.click()} disabled={!!busy} data-testid="photo-new">
                {busy === 'new' ? 'Reading the face…' : <><Icon name="plus" size={16} /> Add someone from a photo</>}
              </button>
              {!isPet(person.look.kind) && !person.look.drawing && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { fileRef.current?.click(); }} disabled={!!busy} data-testid="photo-current">Use a photo for {person.member.name || 'them'}</button>
              )}
              <small className="bt-drop-hint">or drop a photo here</small>
            </div>
            <input ref={newFileRef} type="file" accept="image/*" hidden data-testid="photo-new-file" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void fromPhoto(f, 'new', '', 'new'); }} />
          </div>
          {status && busy !== undefined && <p className="lab-status" role="status">{status}</p>}
          <div className="bt-cast" role="group" aria-label="Cast">
            {cast.map((p, i) => (
              <button key={p.member.id} type="button" className={cx('bt-member', p.member.id === pendingId ? 'is-new' : !p.member.inStory && 'is-out')} aria-pressed={i === pi} onClick={() => choose(i)} data-testid={`cast-${p.member.id}`}>
                <span className="bt-face" dangerouslySetInnerHTML={{ __html: characterSvg(p.look, { style: mode, viewBox: p.look.drawing ? '-20 -30 240 300' : isPet(p.look.kind) ? '30 14 140 140' : fitViewBox(FACE_VIEWBOX, p.look, mode) }) }} />
                <span className="bt-member-name">{p.member.name || 'No name'}</span>
                <small>{p.member.id === pendingId ? 'Add a photo' : usesCall(p.member.role) ? p.member.call : p.look.drawing ? 'Drawn' : ROLE_LABEL[p.member.role]}</small>
              </button>
            ))}
            <button type="button" className="bt-member is-add is-photo" onClick={() => newFileRef.current?.click()} disabled={!!busy} data-testid="cast-photo">
              <span className="bt-face"><Icon name="camera" size={22} /></span><span className="bt-member-name">Photo</span><small>add from a photo</small>
            </button>
            <button type="button" className="bt-member is-add" onClick={startNew} data-testid="cast-add">
              <span className="bt-face"><Icon name="plus" size={24} /></span><span className="bt-member-name">Add</span><small>someone</small>
            </button>
            <button type="button" className="bt-member is-add" onClick={() => setPad({ mode: 'character' })} data-testid="cast-draw">
              <span className="bt-face"><Icon name="pen" size={22} /></span><span className="bt-member-name">Draw</span><small>a character</small>
            </button>
          </div>

          <div className="bt-studio" ref={studioRef}>
            <div className="bt-stage" dangerouslySetInnerHTML={{ __html: characterSvg(person.look, { animated: true, style: mode, label: `${person.member.name}’s character` }) }} />

            <div className="bt-panel">
              {person.member.id === pendingId && (
                <div className="lab-card bt-newcard" data-testid="cast-adder">
                  <h3>Who’s joining the story?</h3>
                  <p className="lab-sub">Add a photo of them and NomNoms draws them. Nobody else in the story changes.</p>
                  <div className="lab-row">
                    <button type="button" className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={!!busy} data-testid="new-photo">
                      <Icon name="camera" size={16} /> {busy === 'own' ? 'Reading the face…' : 'Add a photo of them'}
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={cancelNew} data-testid="new-cancel">Cancel</button>
                  </div>
                  <p className="lab-sub">Or start from:</p>
                  <div className="lab-chips">
                    {ADDABLE.map((a) => <button key={a.label} type="button" className="lab-chip" onClick={() => fillPending(a.make)} data-testid={`add-${a.label}`}>{a.label}</button>)}
                    <button type="button" className="lab-chip is-accent" onClick={() => setPad({ mode: 'character', redraw: person.member.id })} data-testid="add-drawing"><Icon name="pen" size={14} /> Draw them</button>
                  </div>
                </div>
              )}
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
                      {!pet && !drawing && <span dangerouslySetInnerHTML={{ __html: characterSvg({ ...person.look, personality: k, expression: undefined, face: undefined, hat: 'none', glasses: 'none' }, { style: mode, viewBox: fitViewBox('24 30 152 128', person.look, mode) }) }} />}
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
                <div className={cx('lab-card', dropping === 'current' && 'is-dropping')} {...{ [OWN_DROP_ATTR]: '' }} data-testid="photo-card"
                  onDragOver={(e) => { if (![...e.dataTransfer.types].includes('Files')) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setDropping('current'); }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropping(false); }}
                  onDrop={(e) => { e.preventDefault(); setDropping(false); const f = [...e.dataTransfer.files].find((x) => x.type.startsWith('image/') || /\.(heic|heif|jpe?g|png|webp)$/i.test(x.name)); if (f && !busy) void fromPhoto(f, 'own', ''); else if (!f) setStatus('That isn’t a photo. Drop a JPEG or PNG.'); }}>
                  <h3>Make {person.member.name || 'them'} from a photo</h3>
                  <p className="lab-sub">Pick a sample or use your own. NomNoms finds the face on this device and reads skin, hair, eyes and face shape. The photo is never uploaded or saved.</p>
                  <div className="bt-photos">
                    {(SAMPLE_PHOTOS[person.member.role] ?? SAMPLE_PHOTOS.friend).map((s) => (
                      <button key={s.path} type="button" className="bt-photo" onClick={() => fromPhoto(samplePhotoUrl(s.path), s.path, samplePhotoUrl(s.path, 160))} disabled={!!busy} aria-label={`Sample photo by ${s.by}`} data-testid="sample-photo">
                        <img src={samplePhotoUrl(s.path, 160)} alt="" crossOrigin="anonymous" loading="lazy" />
                        {busy === s.path && <span className="bt-photo-busy" />}
                      </button>
                    ))}
                    <button type="button" className="bt-photo is-own" onClick={() => fileRef.current?.click()} disabled={!!busy} data-testid="own-photo">
                      <Icon name="camera" size={20} /><span>Your photo</span><small className="bt-drop-hint">or drop one here</small>
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void fromPhoto(f, 'own', ''); }} />
                  </div>
                  {result && (
                    <div className="bt-result" role="status" data-testid="photo-result">
                      <span className="bt-result-photo">{result.from ? <img src={result.from} alt="" /> : <Icon name="camera" size={20} />}</span>
                      <Icon name="arrow-right" size={18} />
                      <span className="bt-result-char" dangerouslySetInnerHTML={{ __html: characterSvg(person.look, { style: mode, viewBox: fitViewBox(FACE_VIEWBOX, person.look, mode) }) }} />
                      <div className="bt-result-text">
                        <strong>{result.who}, from the photo</strong>
                        {readings[person.member.id] && !isPet(person.look.kind) && (
                          <div className="bt-kindpick" role="radiogroup" aria-label="Looks like">
                            <span>Looks like</span>
                            {KINDS.map((k) => <button key={k.kind} type="button" role="radio" aria-checked={person.look.kind === k.kind} className="lab-chip" onClick={() => setKind(k.kind)} data-testid={`kind-${k.kind}`}>{k.label}</button>)}
                          </div>
                        )}
                        <div className="bt-matched">{result.matched.map((m) => <span key={m.label} className={m.sure ? '' : 'is-guess'} title={m.sure ? 'Read from the photo' : 'A best guess; check it'}>{m.sure ? '' : '~ '}{m.label}</span>)}</div>
                        {result.kept.length > 0 && <small>Kept your own choice of {result.kept.map((k) => (k === 'hairStyle' ? 'hairstyle' : k === 'shape' ? 'face shape' : k)).join(', ')}.</small>}
                        {result.notes.length > 0 && <ul className="bt-notes">{result.notes.slice(0, 3).map((n) => <li key={n}>{n}</li>)}</ul>}
                        <small>{result.from ? '~ means a best guess. Not quite right? Adjust below.' : 'Your photo wasn’t kept. ~ means a best guess; adjust below if you like.'}</small>
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
                      {pi > 0 && <div className="lab-chips">{KINDS.map((k) => <button key={k.kind} type="button" className="lab-chip" aria-pressed={person.look.kind === k.kind} onClick={() => setKind(k.kind)}>{k.label}</button>)}</div>}
                      <p className="lab-sub">Skin</p>
                      <div className="bt-swatches">{SKIN_TONES.map((c) => <button key={c} type="button" className="bt-swatch" style={{ background: c }} aria-pressed={person.look.skin === c} aria-label={`Skin tone ${c}`} onClick={() => pick('skin', { skin: c })} />)}</div>
                      <p className="lab-sub">Hair colour</p>
                      <div className="bt-swatches">{HAIR_COLOURS.map((c) => <button key={c} type="button" className="bt-swatch" style={{ background: c }} aria-pressed={person.look.hair === c} aria-label={`Hair colour ${c}`} onClick={() => pick('hair', { hair: c })} />)}</div>
                      <p className="lab-sub">Hair</p>
                      <div className="bt-hairs">
                        {(Object.keys(HAIR_STYLES) as HairStyle[]).map((h) => (
                          <button key={h} type="button" className="bt-hair" aria-pressed={person.look.hairStyle === h} onClick={() => pick('hairStyle', { hairStyle: h })} data-testid={`hair-${h}`}>
                            <span dangerouslySetInnerHTML={{ __html: characterSvg({ ...person.look, hairStyle: h, hat: 'none', glasses: 'none' }, { style: mode, viewBox: fitViewBox('10 -10 180 180', person.look, mode) }) }} />
                            <small>{HAIR_STYLES[h]}</small>
                          </button>
                        ))}
                      </div>
                      <p className="lab-sub">Eyes</p>
                      <div className="bt-swatches">{EYE_COLOURS.map((c) => <button key={c} type="button" className="bt-swatch" style={{ background: c }} aria-pressed={person.look.eyes === c} aria-label={`Eye colour ${c}`} onClick={() => pick('eyes', { eyes: c })} />)}</div>
                      <details className="bt-shape" open={!!person.look.shape}>
                        <summary>Face shape {person.look.shape ? <small>· from the photo, adjust to taste</small> : <small>· make them look more like themselves</small>}</summary>
                        {SHAPE_KEYS.map((k) => (
                          <label key={k} className="bt-shape-row">
                            <span>{SHAPE_LABELS[k][0]}</span>
                            <small>{SHAPE_LABELS[k][1]}</small>
                            <input type="range" min={-100} max={100} step={5} value={Math.round((person.look.shape?.[k] ?? 0) * 100)} onChange={(e) => pick('shape', { shape: { ...person.look.shape, [k]: +e.target.value / 100 } })} data-testid={`shape-${k}`} />
                            <small>{SHAPE_LABELS[k][2]}</small>
                          </label>
                        ))}
                        {person.look.shape && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { update({ look: { shape: undefined } }); setChosen((c) => ({ ...c, [person.member.id]: (c[person.member.id] ?? []).filter((x) => x !== 'shape') })); }}>Average face</button>}
                      </details>
                      <p className="lab-sub">Face <small>· in the story it changes with what happens</small></p>
                      <div className="bt-hairs">
                        {(Object.keys(EXPRESSIONS) as Expression[]).map((x) => (
                          <button key={x} type="button" className="bt-hair" aria-pressed={exprOf(person.look) === x} onClick={() => update({ look: { expression: x } })} data-testid={`face-${x}`}>
                            <span dangerouslySetInnerHTML={{ __html: characterSvg({ ...person.look, expression: x, hat: 'none', glasses: 'none' }, { style: mode, viewBox: fitViewBox('24 30 152 128', person.look, mode) }) }} />
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
                            {FACIALS.map((f) => <button key={f} type="button" className="lab-chip" aria-pressed={(person.look.facial ?? (person.look.beard ? 'trim' : 'none')) === f} onClick={() => pick('facial', { facial: f, beard: undefined })} data-testid={`facial-${f}`}>{FACIAL[f]}</button>)}
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
                        <span dangerouslySetInnerHTML={{ __html: characterSvg({ ...person.look, [tab]: 'drawn', worn: { ...person.look.worn, [tab]: w.image } }, { style: mode }) }} />
                        <small>{w.name}</small>
                      </button>
                    ))}
                    {Object.entries(WARDROBE[tab][1]).map(([v, label]) => (
                      <button key={v} type="button" className="bt-tile" aria-pressed={person.look[tab] === v} onClick={() => update({ look: { [tab]: v } as Partial<Look> })} data-testid={`wear-${v}`}>
                        <span dangerouslySetInnerHTML={{ __html: characterSvg({ ...person.look, [tab]: v }, { style: mode }) }} />
                        <small>{label}</small>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── 3. places and things from photos ─────────── */}
        <section className="lab-section" aria-labelledby="bt-things">
          <div className="lab-h"><span className="lab-n">3</span><h2 id="bt-things" className="display">Your places and things</h2></div>
          <div className="lab-card">
            <p className="lab-sub">Take a photo of your house, the zoo, a favourite teddy or the dog, and it becomes part of the storybook, drawn in the book’s look. The photo is turned into a drawing on this device and isn’t uploaded or kept.</p>
            <div className="lab-row">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setStudio({ kind: 'place' })} data-testid="add-photo-place"><Icon name="camera" size={15} /> A place from a photo</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setStudio({ kind: 'object' })} data-testid="add-photo-thing"><Icon name="camera" size={15} /> A thing from a photo</button>
            </div>
            {library.length > 0 ? (
              <div className="bt-library" data-testid="library">
                {library.map((a) => (
                  <div key={a.meta.id} className={cx('bt-asset', a.meta.kind === 'object' && 'is-thing')}>
                    <img src={art_.get(a.meta.id)} alt="" />
                    <div><strong>{a.meta.name}</strong><small>{a.meta.kind === 'place' ? 'Place' : 'Thing'} · {saved.has(a.meta.id) ? 'Saved in this browser' : 'This story only'}</small></div>
                    <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => void removeAsset(a.meta.id)} aria-label={`Delete ${a.meta.name}`} data-testid="asset-delete"><Icon name="x" size={14} /></button>
                  </div>
                ))}
              </div>
            ) : <p className="lab-hint">Nothing yet. Places show up as story places; things can be added to any page.</p>}
          </div>
        </section>

        {/* ── 4. the story ─────────────────────────────── */}
        <section className="lab-section" aria-labelledby="bt-story">
          <div className="lab-h"><span className="lab-n">4</span><h2 id="bt-story" className="display">The story</h2></div>
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
              {photoPlaces.map((a) => (
                <button key={a.meta.id} type="button" className="lab-chip is-drawn" aria-pressed={places.includes(a.meta.id)} onClick={() => toggle(a.meta.id)} data-testid="place-photo">
                  <img src={art_.get(a.meta.id)} alt="" /> {a.meta.name}
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
                      {photoPlaces.length > 0 && <optgroup label="Your photos">{photoPlaces.map((a) => <option key={a.meta.id} value={a.meta.id}>{a.meta.name}</option>)}</optgroup>}
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
                {things.length > 0 && (
                  <div>
                    <p className="lab-sub">Your things on this page (up to 3)</p>
                    <div className="lab-chips">
                      {things.map((a) => (
                        <button key={a.meta.id} type="button" className="lab-chip is-drawn" aria-pressed={!!page.things?.includes(a.meta.id)} data-testid="page-thing"
                          onClick={() => setPage({ things: page.things?.includes(a.meta.id) ? page.things.filter((x) => x !== a.meta.id) : [...(page.things ?? []), a.meta.id].slice(0, 3) })}>
                          <img src={art_.get(a.meta.id)} alt="" /> {a.meta.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
      <AssetStudio open={!!studio} kind={studio?.kind ?? 'place'} mode={mode} star={cast[0].look} onClose={() => setStudio(null)} onDone={(a, save) => void onAsset(a, save)} />
      <DrawPad open={!!pad} mode={pad?.mode ?? 'character'} guide={guideFor(pad?.mode)} onClose={() => setPad(null)} onDone={onDrawn} />
    </div>
  );
}
