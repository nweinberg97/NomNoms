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
  ACTIONS, type Action,
  EXPRESSIONS, EXTRAS, EYE_COLOURS, FACE_VIEWBOX, fitViewBox, FACIAL, GLASSES, HAIR_COLOURS, HAIR_STYLES, HATS, OUTFITS, PERSONALITIES, SKIN_TONES, WEAR_BOX,
  characterSvg, exprOf, isPet, type Expression, type Facial, type HairStyle, type Kind, type Look, type Personality, type WearSlot, type WorldId,
} from './character';
import { DrawPad, type DrawMode } from './DrawPad';
import { SAMPLE_PHOTOS, samplePhotoUrl } from './fromPhoto';
import { likenessFromPhoto } from './likeness/detect';
import { applyDNA, buildDNA, parentTraits } from './likeness/dna';
import type { Measurements } from './likeness/measure';
import { describeDNA, type IdentityKey } from './likeness/dna';
import { SHAPE_KEYS, type ShapeKey } from './likeness/measure';
import { fill, generateStory, regeneratePage, tokenize, type CastMember, type PageLayout, type Placement, type Story, type StoryPage } from './generator';
import { hasThing } from './things';
import { sceneSvg, type DrawnPlace, type SceneThing } from './scene';
import { STYLE_MODES, STYLES, type StyleMode } from './styles';
import { AssetStudio } from './AssetStudio';
import { DrawingMagic } from './DrawingMagic';
import { WORLDS, WORLD_IDS, worldCostume, worldPose } from './worlds';
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
type EditorTab = 'photo' | 'face' | 'clothes' | 'personality';
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

const isAppleSafari = typeof navigator !== 'undefined' && /Safari/.test(navigator.userAgent) && !/Chrome|Chromium|CriOS|Edg|Firefox|FxiOS/.test(navigator.userAgent);
const clampX = (x: number) => Math.round(Math.min(400, Math.max(0, x)));
const clampY = (y: number) => Math.round(Math.min(300, Math.max(40, y)));
const clampScale = (v: number) => Math.round(Math.min(1.7, Math.max(0.5, v)) * 100) / 100;
/** Drawn things a character can hold in their hand. */
const HOLDABLE: [string, string][] = ([
  ['🎈', 'Balloon'], ['🧸', 'Teddy'], ['⚽', 'Ball'], ['📖', 'Book'], ['🌷', 'Flower'], ['🍦', 'Ice cream'], ['🪁', 'Kite'], ['🎁', 'Present'], ['🏮', 'Lantern'],
  ['🗺️', 'Map'], ['🍎', 'Apple'], ['⭐', 'Star'], ['☔', 'Umbrella'], ['🧁', 'Cupcake'], ['🍪', 'Cookie'], ['🔦', 'Torch'], ['🪣', 'Bucket'], ['🍭', 'Lollipop'],
  ['🧭', 'Compass'], ['🔭', 'Telescope'], ['💎', 'Gem'], ['🌻', 'Sunflower'], ['🐥', 'Chick'], ['🐶', 'Puppy'],
] as [string, string][]).filter(([e]) => hasThing(e));

/** A small square preview of a photo (about 96px, in memory only) so a parent can check which photo was read. */
async function photoThumb(src: string | Blob, size = 96): Promise<string> {
  let img: CanvasImageSource & { width: number; height: number };
  if (typeof src === 'string') {
    img = await new Promise<HTMLImageElement>((res, rej) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = rej; im.src = src; });
  } else img = await createImageBitmap(src);
  const w = img.width, h = img.height, side = Math.min(w, h);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  c.getContext('2d')!.drawImage(img, (w - side) / 2, (h - side) / 2.6, side, side, 0, 0, size, size);
  return c.toDataURL('image/jpeg', 0.72);
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
  /** The picked person or thing in the page picture ('char:<id>', 'thing:<id>', 'focus'), and a drag in progress. */
  const [picked, setPicked] = useState<string | null>(null);
  const [live, setLive] = useState<{ key: string; x?: number; y?: number; scale?: number } | null>(null);
  const drag = useRef<{ key: string; sx: number; sy: number; ax: number; ay: number; k: number; moved: boolean; resize?: { s0: number; d0: number; ox: number; oy: number } } | null>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const [writing, setWriting] = useState(false);
  useEffect(() => { setPicked(null); setLive(null); setWriting(false); }, [view]);
  const [tab, setTab] = useState<WardrobeTab>('hat');
  const [editorTab, setEditorTab] = useState<EditorTab>('face');
  const [showAllTypes, setShowAllTypes] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState<string>();
  const [result, setResult] = useState<{ who: string; from: string; matched: { label: string; sure: boolean }[]; notes: string[]; kept: IdentityKey[]; accepted?: boolean } | null>(null);
  /** Identity traits a parent set by hand, per person: a new photo never overwrites these. */
  const [chosen, setChosen] = useState<Record<string, IdentityKey[]>>({});
  const [dropping, setDropping] = useState<'new' | 'current' | false>(false);
  /** The last photo reading per person (numbers only, no pixels), so the age group can be changed with a tap. */
  const [readings, setReadings] = useState<Record<string, Measurements>>({});

  /* ── undo / redo for every change to the characters ──────── */
  type Snap = { cast: Person[]; chosen: Record<string, IdentityKey[]>; readings: Record<string, Measurements>; sel: number; story: Story };
  const past = useRef<Snap[]>([]);
  const future = useRef<Snap[]>([]);
  const prevSnap = useRef<Snap>({ cast, chosen, readings, sel, story });
  const lastPush = useRef(0);
  const restoring = useRef(false);
  /** The story was rebuilt from its recipe (not edited by hand), or brought back by undo. */
  const autoStory = useRef(false);
  const keepStory = useRef(false);
  const [, setHistoryTick] = useState(0);
  useEffect(() => {
    const now: Snap = { cast, chosen, readings, sel, story };
    const was = prevSnap.current;
    prevSnap.current = now;
    if (restoring.current) { restoring.current = false; return; }
    const auto = autoStory.current;
    autoStory.current = false;
    // just picking someone isn't a change, and nor is the story redrawing itself for a new cast
    if (was.cast === cast && was.chosen === chosen && (was.story === story || (auto && !was.story.edited))) return;
    if (auto && was.story.edited) toast('New story made. Your page edits are one Undo away.', { icon: 'refresh', ms: 4000, action: { label: 'Undo', run: () => undoRef.current() } });
    const t = Date.now();
    // a slider drag or a burst of typing is one step
    if (t - lastPush.current > 700 || !past.current.length) { past.current.push(was); if (past.current.length > 60) past.current.shift(); }
    lastPush.current = t;
    future.current = [];
    setHistoryTick((x) => x + 1);
  }, [cast, chosen, readings, sel, story]);
  const restore = (to: Snap) => {
    restoring.current = true;
    lastPush.current = 0;
    keepStory.current = to.cast.map((p) => `${p.member.id}:${p.member.inStory}`).join() !== membership; // the story would redraw for the cast
    setCast(to.cast); setChosen(to.chosen); setReadings(to.readings); setStory(to.story);
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
  /** The story world (art direction for the whole book) and what people wear in each one. */
  const [world, setWorld] = useState<WorldId>('everyday');
  const [worldWear, setWorldWear] = useState<Record<string, Partial<Look>>>({});
  const [library, setLibrary] = useState<StoredAsset[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [studio, setStudio] = useState<{ kind: AssetKind } | null>(null);
  useEffect(() => { void listAssets().then((a) => { setLibrary(a); setSaved(new Set(a.map((x) => x.meta.id))); }); }, []);
  // every place and thing is redrawn from its stored regions in the current look
  const art_ = useMemo(() => new Map(library.map((a) => [a.meta.id, assetArtUrl(a.base, mode)])), [library, mode]);
  const photoPlaces = library.filter((a) => a.meta.kind === 'place');
  const things = library.filter((a) => a.meta.kind === 'object');
  const extraPlaces: Place[] = [...drawn, ...photoPlaces.map((a) => familyPlace(a.meta.id, a.meta.name))];
  /** "Our place", then "Our place 2"…, so two places never share a name. */
  const uniqueName = (name: string, skip?: string) => {
    const taken = new Set([...library.filter((x) => x.meta.id !== skip).map((x) => x.meta.name), ...drawn.filter((d) => d.id !== skip).map((d) => d.name)].map((n) => n.toLowerCase()));
    if (!taken.has(name.toLowerCase())) return name;
    let i = 2;
    while (taken.has(`${name} ${i}`.toLowerCase())) i++;
    return `${name} ${i}`;
  };
  /** Rename a family place or thing: the story's headings that used the old name follow along. */
  const renamePlace = (id: string, name: string) => {
    const old = library.find((x) => x.meta.id === id)?.meta.name ?? drawn.find((d) => d.id === id)?.name;
    setLibrary((l) => l.map((x) => (x.meta.id === id ? { ...x, meta: { ...x.meta, name } } : x)));
    setDrawn((ds) => ds.map((d) => (d.id === id ? placeFromDrawing(id, name, d.image) : d)));
    if (old != null) setStory((st) => ({ ...st, pages: st.pages.map((pg) => (pg.place === id && (pg.heading ?? '') === old ? { ...pg, heading: name } : pg)) }));
  };
  /** Keep a renamed photo place or thing saved (only if it was saved already). */
  const keepName = (id: string) => {
    const a = library.find((x) => x.meta.id === id);
    if (!a) return;
    const name = a.meta.name.trim() ? uniqueName(a.meta.name.trim(), id) : uniqueName(a.meta.kind === 'place' ? 'Our place' : 'Our thing', id);
    if (name !== a.meta.name) renamePlace(id, name);
    if (saved.has(id)) void saveAsset({ ...a, meta: { ...a.meta, name } }).catch(() => undefined);
  };
  const onAsset = async (a0: StoredAsset, save: boolean) => {
    const a = { ...a0, meta: { ...a0.meta, name: uniqueName(a0.meta.name) } };
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
    if (keepStory.current) { keepStory.current = false; return; } // undo brought back the story as it was, edits and all
    autoStory.current = true;
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
      const [r, thumb] = await Promise.all([likenessFromPhoto(src, who.look, kept), photoThumb(src).catch(() => '')]);
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
      // a small preview of the photo, kept only on this screen until it's accepted, so you can check it read the right one
      setEditorTab('photo'); setResult({ who: fresh ? 'Someone new' : who.member.name, from: thumb || from, matched: describeDNA(r.dna), notes: r.dna.warnings, kept });
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
      setDrawn((ds) => [...ds, placeFromDrawing(id, uniqueName(name), image)]);
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
  const setPage = (patch: Partial<StoryPage>) => setStory((s) => ({ ...s, edited: true, pages: s.pages.map((p, i) => (i === view - 1 ? { ...p, ...patch } : p)) }));
  /** Someone as they appear in the current world: their own look, dressed for it. Identity never changes. */
  const dressed = (who: Person, w: WorldId = world): Look => (w === 'everyday' || who.look.drawing ? who.look : { ...who.look, ...worldCostume(w, who.look, who.member.id === cast[0]?.member.id), ...worldWear[`${w}:${who.member.id}`], world: w });
  const lookFor = (id: string, p?: StoryPage): Look | undefined => {
    const who = byId(id);
    if (!who) return undefined;
    let l = dressed(who);
    if (p && world !== 'everyday' && !l.drawing) {
      if (who.member.role === 'baby') { if (p.mood) l = { ...l, expression: p.mood }; l = { ...l, pose: p.pose ?? worldPose(world, l.pose, p.mood) }; }
      else if (p.mood && ['laugh', 'starry', 'wow', 'proud'].includes(p.mood)) l = { ...l, expression: l.personality ? PERSONALITIES[l.personality].react : 'laugh', pose: worldPose(world, l.pose, p.mood) };
      return l;
    }
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
  /* ── arranging a page picture: move, size, flip; what each person does and holds ── */
  const placeOf = (p: StoryPage | undefined, key: string): (Placement & { hidden?: boolean }) | undefined => {
    const L = p?.layout;
    if (!L) return undefined;
    return key === 'focus' ? L.focus : key.startsWith('char:') ? L.chars?.[key.slice(5)] : L.things?.[key.slice(6)];
  };
  /** A placement with the drag in progress applied. */
  const placed = (p: StoryPage | undefined, key: string) => {
    const pl = placeOf(p, key);
    return live && live.key === key && p === page ? { ...pl, ...(live.x != null ? { x: live.x, y: live.y } : {}), ...(live.scale != null ? { scale: live.scale } : {}) } : pl;
  };
  const setPlace = (key: string, patch: Partial<Placement> & { hidden?: boolean }) => {
    if (!page) return;
    const L: PageLayout = { ...(page.layout ?? {}) };
    if (key === 'focus') L.focus = { ...L.focus, ...patch };
    else if (key.startsWith('char:')) L.chars = { ...L.chars, [key.slice(5)]: { ...L.chars?.[key.slice(5)], ...patch } };
    else L.things = { ...L.things, [key.slice(6)]: { ...L.things?.[key.slice(6)], ...patch } };
    setPage({ layout: L });
  };
  const nudge = (key: string, dx: number, dy: number) => {
    const el = artRef.current?.querySelector<SVGGElement>(`[data-edit="${CSS.escape(key)}"]`);
    if (!el) return;
    const pl = placeOf(page, key);
    const x = pl?.x ?? +el.dataset.ax!, y = pl?.y ?? +el.dataset.ay!;
    setPlace(key, { x: clampX(x + dx), y: clampY(y + dy) });
  };
  const resize = (key: string, by: number) => setPlace(key, { scale: clampScale((placeOf(page, key)?.scale ?? 1) + by) });
  const onArtDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!page) return;
    const g = (e.target as Element).closest<SVGGElement>('[data-edit]');
    if (!g) { setPicked(null); return; }
    const svg = artRef.current?.querySelector('svg');
    const r = svg?.getBoundingClientRect();
    const k = r ? 400 / r.width : 1;
    const key = g.dataset.edit!, pl = placeOf(page, key);
    const ax = pl?.x ?? +g.dataset.ax!, ay = pl?.y ?? +g.dataset.ay!;
    // the corner handle resizes around the feet (or the thing's centre)
    const handle = (e.target as Element).closest('[data-resize]');
    const ox = r ? r.left + ax / k : 0, oy = r ? r.top + (key === 'focus' ? ay : ay - 60) / k : 0;
    const resize = handle && r ? { s0: pl?.scale ?? 1, d0: Math.max(12, Math.hypot(e.clientX - ox, e.clientY - oy)), ox, oy } : undefined;
    drag.current = { key, sx: e.clientX, sy: e.clientY, ax, ay, k, moved: false, resize };
    setPicked(key);
    (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
    e.preventDefault();
  };
  const onArtMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.sx) * d.k, dy = (e.clientY - d.sy) * d.k;
    if (!d.moved && Math.hypot(dx, dy) < 3) return;
    d.moved = true;
    if (d.resize) {
      const { s0, d0, ox, oy } = d.resize;
      setLive({ key: d.key, scale: clampScale(s0 * Math.hypot(e.clientX - ox, e.clientY - oy) / d0) });
    } else setLive({ key: d.key, x: clampX(d.ax + dx), y: clampY(d.ay + dy) });
  };
  const onArtUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.moved && live && live.key === d.key) setPlace(d.key, live.scale != null ? { scale: live.scale } : { x: live.x, y: live.y });
    setLive(null);
  };
  const onArtKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!picked) return;
    const step = e.shiftKey ? 20 : 6;
    const m: Record<string, () => void> = {
      ArrowLeft: () => nudge(picked, -step, 0), ArrowRight: () => nudge(picked, step, 0), ArrowUp: () => nudge(picked, 0, -step), ArrowDown: () => nudge(picked, 0, step),
      '+': () => resize(picked, 0.1), '=': () => resize(picked, 0.1), '-': () => resize(picked, -0.1), Escape: () => setPicked(null),
    };
    if (m[e.key]) { e.preventDefault(); m[e.key](); }
  };
  const placeName = (id: string) => extraPlaces.find((p) => p.id === id)?.name ?? PLACES.find((p) => p.id === id)?.name ?? '';
  /** A new setting for this page; a heading that was just the old place's name follows along. */
  const setSetting = (id: string) => {
    if (!page) return;
    setPage({ place: id, ...(!page.heading || page.heading === placeName(page.place) ? { heading: placeName(id) } : {}) });
  };
  /** Put someone else in a person's spot on this page, keeping where they stood and what they were doing. */
  const swapPerson = (from: string, to: string) => {
    if (!page || from === to) return;
    const L = page.layout;
    const chars = L?.chars?.[from] ? { ...L.chars, [to]: L.chars[from] } : L?.chars;
    if (chars) delete chars[from];
    setPage({ cast: page.cast.map((x) => (x === from ? to : x)), ...(L ? { layout: { ...L, chars } } : {}) });
    setPicked(`char:${to}`);
  };
  const editPerson = (id: string) => {
    const i = cast.findIndex((c) => c.member.id === id);
    if (i < 0) return;
    setSel(i);
    setTimeout(() => studioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };
  const drawnPlace = (id?: string) => drawn.find((d) => d.id === id);
  const photoPlace = (id?: string) => {
    const a = photoPlaces.find((x) => x.meta.id === id);
    return a && art_.get(a.meta.id) ? { image: art_.get(a.meta.id)!, horizon: a.meta.placement.horizon ?? 0.55 } : undefined;
  };
  const thingsFor = (p?: StoryPage): SceneThing[] => (p?.things ?? []).map((tid, i) => {
    const a = things.find((x) => x.meta.id === tid);
    if (!a || !art_.get(tid)) return null;
    return { image: art_.get(tid)!, width: a.base.w, height: a.base.h, heightRatio: a.meta.placement.heightRatio ?? 0.5, x: [0.86, 0.5, 0.14][i % 3], id: tid, place: placed(p, `thing:${tid}`) };
  }).filter(Boolean) as SceneThing[];
  const art = (p: StoryPage | undefined, animated: boolean, arranging = false) => {
    if (!p) {
      const first = story.pages[0];
      const ids = [cast[0].member.id, ...cast.filter((c, i) => i > 0 && c.member.inStory).slice(0, 2).map((c) => c.member.id)];
      return sceneSvg({ placeId: first?.place ?? 'park', drawn: drawnPlace(first?.place), photo: photoPlace(first?.place), seed: story.seed, chars: ids.map((id) => ({ look: lookFor(id, first)! })), animated, label: 'Story cover', style: mode, world });
    }
    const chars = p.cast.map((id) => {
      const look = lookFor(id, p);
      if (!look) return null;
      const pl = placed(p, `char:${id}`) ?? {};
      // what they're doing: the parent's choice, else (for the star) what the words say
      const action = pl.action ?? (id === cast[0]?.member.id ? p.action : undefined);
      return { id, look: { ...look, ...(action ? { action } : {}), ...(pl.hold ? { hold: pl.hold } : {}) }, place: pl };
    }).filter(Boolean) as { id: string; look: Look; place: Placement }[];
    return sceneSvg({ placeId: p.place, drawn: drawnPlace(p.place), photo: photoPlace(p.place), things: thingsFor(p), seed: story.seed + view, chars, focus: p.focus, focusPlace: placed(p, 'focus'), selected: arranging ? picked ?? undefined : undefined, editable: arranging, animated, label: fill(p.text, members), style: mode, world });
  };
  const bigArt = useMemo(() => art(page, true, true), [page, cast, dressUp, story, view, drawn, mode, art_, world, worldWear, picked, live]); // eslint-disable-line react-hooks/exhaustive-deps
  // a preview of each look: the star and one friend at the park
  const lookPreviews = useMemo(() => {
    const friend = cast.find((c, i) => i > 0 && !isPet(c.look.kind) && !c.look.drawing) ?? cast[0];
    const at = world === 'everyday' ? 'park' : WORLDS[world].places[0];
    return new Map(STYLE_MODES.map((m) => [m, sceneSvg({ placeId: at, seed: 4, chars: [{ look: dressed(cast[0]) }, { look: dressed(friend) }], style: m, world })]));
  }, [cast, world, worldWear]); // eslint-disable-line react-hooks/exhaustive-deps
  // a preview of each story world, in the current look
  const worldPreviews = useMemo(() => {
    const friend = cast.find((c, i) => i > 0 && !isPet(c.look.kind) && !c.look.drawing) ?? cast[0];
    return new Map(WORLD_IDS.map((w) => [w, sceneSvg({ placeId: w === 'everyday' ? 'park' : WORLDS[w].places[0], seed: 4, chars: [{ look: { ...dressed(cast[0], w), expression: 'laugh', pose: w === 'everyday' ? undefined : 'cheer' } }, { look: dressed(friend, w) }], style: mode, world: w })]));
  }, [cast, mode, worldWear]); // eslint-disable-line react-hooks/exhaustive-deps
  /** Step into a world: everyone dresses for it, and its story and places come along. */
  const chooseWorld = (w: WorldId) => {
    setWorld(w);
    if (w === 'everyday') { if (['fairytale', 'expedition', 'legend'].includes(type)) setType('lost'); setPlaces((ps) => ps.filter((id) => !PLACES.find((x) => x.id === id)?.world)); }
    else { setType(WORLDS[w].story!); setPlaces(WORLDS[w].places); }
  };
  /** Wardrobe changes made inside a world stay in that world; Everyday clothes are untouched. */
  const wear = (patch: Partial<Look>) => {
    if (world === 'everyday') { update({ look: patch }); return; }
    const key = `${world}:${person.member.id}`;
    setWorldWear((ww) => ({ ...ww, [key]: { ...ww[key], ...patch } }));
  };
  const toggle = (id: string) => setPlaces((ps) => (ps.includes(id) ? ps.filter((x) => x !== id) : [...ps, id]));
  const pet = isPet(person.look.kind);
  const shown = dressed(person);
  const WORLD_WEAR: Record<WorldId, Partial<Record<WardrobeTab, string[]>>> = {
    everyday: {},
    fairytale: { outfit: ['gown', 'ftunic', 'cloak', 'fairy'], hat: ['crown', 'tiara', 'circlet', 'flowers', 'wizard'], extra: ['lantern', 'staff', 'wand'] },
    adventure: { outfit: ['explorer', 'ranger'], hat: ['brimhat', 'bandana', 'bucket', 'sunhat'], extra: ['map', 'spyglass', 'net'] },
    mythic: { outfit: ['armour', 'sunrobe', 'knight'], hat: ['laurel', 'helm'], extra: ['shield', 'staff'] },
  };
  const worldPicks = (t: WardrobeTab) => WORLD_WEAR[world][t] ?? [];
  /** The world's own pieces first, then everything else. */
  const wardrobeOrder = (t: WardrobeTab) => { const all = Object.entries(WARDROBE[t][1]); const picks = worldPicks(t); return [...all.filter(([v]) => picks.includes(v)), ...all.filter(([v]) => !picks.includes(v))]; };
  const drawing = !!person.look.drawing;
  /** A faint picture of the character, cropped to where a drawn hat, outfit or toy will go. */
  const guideFor = (mode?: DrawMode) => {
    if (!mode || mode === 'place' || mode === 'character' || drawing) return undefined;
    const [x, y, w, h] = WEAR_BOX[mode];
    return characterSvg({ ...person.look, [mode]: 'none', expression: undefined }, { viewBox: `${x} ${y} ${w} ${h}` });
  };

  const placeOptions = (
    <>
      {photoPlaces.length > 0 && <optgroup label="Your photos">{photoPlaces.map((a) => <option key={a.meta.id} value={a.meta.id}>{a.meta.name}</option>)}</optgroup>}
      {drawn.length > 0 && <optgroup label="Your drawings">{drawn.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</optgroup>}
      {world !== 'everyday' && <optgroup label={WORLDS[world].name}>{WORLDS[world].places.map((id) => { const p = PLACES.find((x) => x.id === id)!; return <option key={id} value={id}>{p.name}</option>; })}</optgroup>}
      <optgroup label="Places">{PLACES.filter((p) => !p.world).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>
    </>
  );
  const FEATURED: StoryType[] = ['fairytale', 'expedition', 'legend', 'lost', 'animals', 'bedtime'];
  const typesShown = showAllTypes ? STORY_TYPES : STORY_TYPES.filter((t) => FEATURED.includes(t.id) || t.id === type);
  const placeSummary = places.length ? `${places.length} chosen` : 'Let NomNoms choose';
  const tabs: [EditorTab, string][] = [...(!pet && !drawing ? [['photo', 'Photo'] as [EditorTab, string]] : []), ['face', pet ? 'Pet' : drawing ? 'Drawing' : 'Face & hair'], ...(!drawing ? [['clothes', 'Clothes'] as [EditorTab, string]] : []), ['personality', 'Personality']];
  const activeTab: EditorTab = tabs.some(([t]) => t === editorTab) ? editorTab : tabs[0][0];

  return (
    <div className="lab bt">
      <LabsHeader title="Baby Tales" />
      {/* one place to change how the whole book looks: always in reach */}
      <div className="bt-lookbar">
        <label className="bt-pick"><span>Look</span>
          <select value={mode} onChange={(e) => setMode(e.target.value as StyleMode)} data-testid="lookbar">
            {STYLE_MODES.map((m) => <option key={m} value={m}>{STYLES[m].name}</option>)}
          </select>
        </label>
        <label className="bt-pick"><span>World</span>
          <select value={world} onChange={(e) => chooseWorld(e.target.value as WorldId)} data-testid="worldbar">
            {WORLD_IDS.map((w) => <option key={w} value={w}>{WORLDS[w].name}</option>)}
          </select>
        </label>
        <div className="bt-undo" role="group" aria-label="Undo and redo">
          <button type="button" onClick={undo} disabled={!past.current.length} aria-label="Undo" title="Undo (Ctrl/⌘ Z)" data-testid="undo"><Icon name="undo" size={16} /><em>Undo</em></button>
          <button type="button" onClick={redo} disabled={!future.current.length} aria-label="Redo" title="Redo (Shift Ctrl/⌘ Z)" data-testid="redo"><Icon name="redo" size={16} /></button>
        </div>
      </div>
      <main className="lab-main">
        <section className="lab-hero">
          <p className="eyebrow">NomNoms Baby Tales · Demo</p>
          <h1 className="display">The Adventures of <em>{cast[0].member.name || 'your little one'}</em></h1>
          <p className="lab-lede">Your family as storybook characters, starring in a story you can change, page by page.</p>
          <DemoNote>Photos are read on this device and never uploaded. Nothing is saved unless you choose “Save to my library”.</DemoNote>
        </section>

        <div className="bt-layout">
          {/* ── the book: first on phones, beside the editing on wide screens ── */}
          <section className="lab-section bt-booksec" aria-labelledby="bt-story-h">
            <div className="lab-h"><h2 id="bt-story-h" className="display">Your book</h2></div>
            <div className="bt-book">
              <div className="bt-spread">
                <div className={cx('bt-art', page && 'bt-arrange-on', page && picked && 'is-picking')} ref={artRef} tabIndex={page ? 0 : undefined} aria-label={page ? 'Page picture: tap someone or something to move it' : undefined}
                  onPointerDown={onArtDown} onPointerMove={onArtMove} onPointerUp={onArtUp} onPointerCancel={onArtUp} onKeyDown={onArtKey}
                  dangerouslySetInnerHTML={{ __html: bigArt }} data-testid="page-art" />
                <div className="bt-words">
                  {view === 0 ? (
                    <>
                      <small>The Adventures of {cast[0].member.name}</small>
                      <input className="bt-title" value={fill(story.title, members)} onChange={(e) => setStory((s) => ({ ...s, title: tokenize(e.target.value, members), edited: true }))} aria-label="Story title" data-testid="story-title" />
                      <textarea className="bt-about" rows={2} value={fill(story.about ?? '', members)} placeholder="What this book is about" onChange={(e) => setStory((s) => ({ ...s, about: tokenize(e.target.value, members), edited: true }))} aria-label="What this book is about" data-testid="story-about" />
                      <input className="bt-dedication" value={fill(story.dedication ?? '', members)} placeholder="For…" onChange={(e) => setStory((s) => ({ ...s, dedication: tokenize(e.target.value, members), edited: true }))} aria-label="Dedication" data-testid="story-dedication" />
                      {cast[0].look.personality && <p className="bt-tagline">{PERSONALITIES[cast[0].look.personality].line.replace(/\{H\}/g, cast[0].member.call || cast[0].member.name)}</p>}
                      <p className="bt-by">A NomNoms Baby Tale starring {members.filter((m) => m.inStory || m.role === 'baby').map((m) => m.call).join(', ')}</p>
                    </>
                  ) : (
                    <>
                      <small>Page {view} of {story.pages.length}</small>
                      <input className="bt-heading" value={fill(page!.heading ?? '', members)} placeholder="Add a heading" onChange={(e) => setPage({ heading: tokenize(e.target.value, members) })} aria-label="Page heading" data-testid="page-heading" />
                      {writing ? (
                        <textarea className="bt-text bt-text-edit" autoFocus rows={4} value={fill(page!.text, members)} onChange={(e) => setPage({ text: tokenize(e.target.value, members), edited: true })} onBlur={() => setWriting(false)} aria-label="Page words" data-testid="page-text-edit" />
                      ) : (
                        <p className="bt-text bt-text-tap" role="button" tabIndex={0} title="Tap to change the words" onClick={() => setWriting(true)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setWriting(true); } }} data-testid="page-text">{fill(page!.text, members)}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="bt-pager">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setView((v) => Math.max(0, v - 1))} disabled={view === 0} data-testid="prev-page">Previous</button>
                <div className="bt-dots">{[0, ...story.pages.map((_, i) => i + 1)].map((i) => <button key={i} type="button" className={cx(i === view && 'on')} aria-label={i ? `Page ${i}` : 'Cover'} onClick={() => setView(i)} />)}</div>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setView((v) => (v >= story.pages.length ? 0 : v + 1))} data-testid="next-page">{view >= story.pages.length ? 'Back to cover' : 'Next page'}</button>
              </div>

              {page && (() => {
                const pl = picked ? placeOf(page, picked) : undefined;
                const who = picked?.startsWith('char:') ? cast.find((c) => c.member.id === picked.slice(5)) : undefined;
                const isStar = who && who.member.id === cast[0]?.member.id;
                const doing: Action = (pl?.action ?? (isStar ? page.action : undefined) ?? 'stand');
                const holdable = [...(page.focus && hasThing(page.focus.e) && !HOLDABLE.some(([e]) => e === page.focus!.e) ? [[page.focus.e, 'The thing on this page'] as [string, string]] : []), ...HOLDABLE];
                const name = who ? who.member.name || 'them' : picked === 'focus' ? 'the thing on this page' : 'this';
                return (
                  <div className="lab-card bt-arrange" data-testid="arrange">
                    {!picked ? (
                      <>
                        <p className="lab-sub bt-arrange-hint">Tap someone or something in the picture to pick it. Drag to move it, drag the round corner handle to resize it, or use the buttons here to swap them or change what they're doing.</p>
                        <div className="bt-arrange-row">
                          <label className="field bt-setting"><span>Setting</span>
                            <select value={page.place} onChange={(e) => setSetting(e.target.value)} data-testid="arrange-setting">{placeOptions}</select>
                          </label>
                          {page.layout && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPage({ layout: undefined })} data-testid="arrange-reset">Reset this picture</button>}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="bt-arrange-top"><strong>Arranging {name}</strong>
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => setPicked(null)} data-testid="arrange-done">Done</button>
                        </div>
                        <div className="bt-size">
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => resize(picked, -0.1)} aria-label="Smaller" data-testid="arrange-smaller">Smaller</button>
                          <label className="field"><span>Size {Math.round((pl?.scale ?? 1) * 100)}%</span>
                            <input type="range" min={50} max={170} step={5} value={Math.round((pl?.scale ?? 1) * 100)} onChange={(e) => setPlace(picked, { scale: +e.target.value / 100 })} data-testid="arrange-size" />
                          </label>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => resize(picked, 0.1)} aria-label="Bigger" data-testid="arrange-bigger">Bigger</button>
                        </div>
                        {who && (
                          <div className="bt-arrange-row">
                            <label className="field"><span>Swap for</span>
                              <select value={who.member.id} onChange={(e) => swapPerson(who.member.id, e.target.value)} data-testid="arrange-swap">
                                {cast.filter((c) => c.member.id !== pendingId && (c.member.id === who.member.id || !page.cast.includes(c.member.id))).map((c) => <option key={c.member.id} value={c.member.id}>{c.member.call || c.member.name}</option>)}
                              </select>
                            </label>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => editPerson(who.member.id)} data-testid="arrange-edit-look"><Icon name="pen" size={14} /> Edit {name}'s look</button>
                            {!isStar && page.cast.length > 1 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setPage({ cast: page.cast.filter((x) => x !== who.member.id) }); setPicked(null); }} data-testid="arrange-remove">Take out of this picture</button>}
                          </div>
                        )}
                        {who && who.member.role !== 'pet' && (
                          <>
                            <p className="lab-sub">What {name} is doing</p>
                            <div className="lab-chips">{(Object.keys(ACTIONS) as Action[]).map((a) => <button key={a} type="button" className="lab-chip" aria-pressed={doing === a} onClick={() => setPlace(picked, { action: a })} data-testid={`act-${a}`}>{ACTIONS[a]}</button>)}</div>
                            <label className="field"><span>Holding</span>
                              <select value={pl?.hold ?? ''} onChange={(e) => setPlace(picked, { hold: e.target.value || undefined })} data-testid="arrange-hold">
                                <option value="">Nothing</option>
                                {holdable.map(([e, n]) => <option key={e} value={e}>{n}</option>)}
                              </select>
                            </label>
                          </>
                        )}

                        <div className="bt-arrange-row">
                          <button type="button" className="btn btn-ghost btn-sm" aria-label="Move left" onClick={() => nudge(picked, -10, 0)} data-testid="nudge-left">←</button>
                          <button type="button" className="btn btn-ghost btn-sm" aria-label="Move up" onClick={() => nudge(picked, 0, -10)} data-testid="nudge-up">↑</button>
                          <button type="button" className="btn btn-ghost btn-sm" aria-label="Move down" onClick={() => nudge(picked, 0, 10)} data-testid="nudge-down">↓</button>
                          <button type="button" className="btn btn-ghost btn-sm" aria-label="Move right" onClick={() => nudge(picked, 10, 0)} data-testid="nudge-right">→</button>
                          <button type="button" className="btn btn-ghost btn-sm" aria-pressed={!!pl?.flip} onClick={() => setPlace(picked, { flip: !pl?.flip })} data-testid="arrange-flip">Flip</button>
                          {!who && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setPlace(picked, { hidden: true }); setPicked(null); }} data-testid="arrange-hide">Hide</button>}
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setPage({ layout: undefined }); setPicked(null); }} data-testid="arrange-reset">Reset this picture</button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              {page && (
                <details className="lab-card bt-edit" open={editOpen} onToggle={(e) => setEditOpen((e.target as HTMLDetailsElement).open)} data-testid="page-editor">
                  <summary><Icon name="pen" size={15} /> Edit this page</summary>
                  <label className="field"><span>Words</span>
                    <textarea rows={3} value={fill(page.text, members)} onChange={(e) => setPage({ text: tokenize(e.target.value, members), edited: true })} data-testid="page-words" />
                  </label>
                  <div className="bt-edit-row">
                    <label className="field"><span>Place</span>
                      <select value={page.place} onChange={(e) => setSetting(e.target.value)} data-testid="page-place">{placeOptions}</select>
                    </label>
                    <div>
                      <p className="lab-sub">In the picture (up to 3)</p>
                      <div className="lab-chips">
                        {cast.filter((p) => p.member.id !== pendingId).map((p) => (
                          <button key={p.member.id} type="button" className="lab-chip" aria-pressed={page.cast.includes(p.member.id)} disabled={p.member.role === 'baby'}
                            onClick={() => setPage({ cast: page.cast.includes(p.member.id) ? page.cast.filter((x) => x !== p.member.id) : [...page.cast, p.member.id].slice(0, 3) })}>
                            {p.member.call || p.member.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="lab-sub">Your things on this page (up to 3)</p>
                    <div className="lab-chips">
                      {things.map((a) => (
                        <button key={a.meta.id} type="button" className="lab-chip is-drawn" aria-pressed={!!page.things?.includes(a.meta.id)} data-testid="page-thing"
                          onClick={() => setPage({ things: page.things?.includes(a.meta.id) ? page.things.filter((x) => x !== a.meta.id) : [...(page.things ?? []), a.meta.id].slice(0, 3) })}>
                          <img src={art_.get(a.meta.id)} alt="" /> {a.meta.name}
                        </button>
                      ))}
                      <button type="button" className="lab-chip is-accent" onClick={() => setStudio({ kind: 'object' })} data-testid="page-add-thing"><Icon name="camera" size={14} /> A thing from a photo</button>
                    </div>
                  </div>
                  <div className="lab-row">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => { const fresh = regeneratePage(story, view - 1, members, story.seed * 31 + view * 7 + Math.floor(Math.random() * 1000), extraPlaces); setPage({ ...fresh }); toast('New version of this page', { icon: 'sparkle', ms: 1400 }); }} data-testid="page-again">
                      <Icon name="refresh" size={15} /> Try another version
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPad({ mode: 'place' })}><Icon name="pen" size={15} /> Draw a place for this page</button>
                  </div>
                </details>
              )}

              <details className="bt-compare" data-testid="compare-styles">
                <summary>Compare looks and worlds</summary>
                <div className="bt-looks" role="radiogroup" aria-label="Look of the book">
                  {STYLE_MODES.map((m) => (
                    <button key={m} type="button" className="bt-look" role="radio" aria-checked={mode === m} onClick={() => setMode(m)} data-testid={`look-${m}`}>
                      <span className="bt-look-art" dangerouslySetInnerHTML={{ __html: lookPreviews.get(m)! }} />
                      <strong>{STYLES[m].name}</strong><small>{STYLES[m].blurb}</small>
                    </button>
                  ))}
                </div>
                <div className="bt-worlds" role="radiogroup" aria-label="Story world">
                  {WORLD_IDS.map((w) => (
                    <button key={w} type="button" className="bt-look bt-world" role="radio" aria-checked={world === w} onClick={() => chooseWorld(w)} data-testid={`world-${w}`}>
                      <span className="bt-look-art" dangerouslySetInnerHTML={{ __html: worldPreviews.get(w)! }} />
                      <strong>{WORLDS[w].name}</strong><small>{WORLDS[w].feeling}</small>
                    </button>
                  ))}
                </div>
              </details>
            </div>
          </section>

          <div className="bt-edits">
            {/* ── the cast ─────────────────────────────── */}
            <section className="lab-section" aria-labelledby="bt-cast">
              <div className="lab-h"><h2 id="bt-cast" className="display">Who’s in it</h2></div>
              {world !== 'everyday' && <p className="lab-sub" data-testid="world-style-note">In {WORLDS[world].name}, everyone is drawn in its own style: {WORLDS[world].feeling.toLowerCase()}.</p>}
              <div className={cx('bt-cast', dropping === 'new' && 'is-dropping')} role="group" aria-label="Cast" {...{ [OWN_DROP_ATTR]: '' }}
                onDragOver={(e) => { if (![...e.dataTransfer.types].includes('Files')) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setDropping('new'); }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropping(false); }}
                onDrop={(e) => { e.preventDefault(); setDropping(false); const f = photoFile(e); if (f && !busy) void fromPhoto(f, 'new', '', 'new'); else if (!f) setStatus('That isn’t a photo. Drop a JPEG or PNG.'); }}
                data-testid="photo-hero">
                <button type="button" className="bt-member is-add is-photo" onClick={startNew} data-testid="cast-add">
                  <span className="bt-face"><Icon name="plus" size={24} /></span><span className="bt-member-name">Add</span><small>someone new</small>
                </button>
                {cast.map((p, i) => (
                  <button key={p.member.id} type="button" className={cx('bt-member', p.member.id === pendingId ? 'is-new' : !p.member.inStory && 'is-out')} aria-pressed={i === pi} onClick={() => choose(i)} data-testid={`cast-${p.member.id}`}>
                    <span className="bt-face" dangerouslySetInnerHTML={{ __html: characterSvg(dressed(p), { style: mode, viewBox: p.look.drawing ? '-20 -30 240 300' : isPet(p.look.kind) ? '30 14 140 140' : fitViewBox(FACE_VIEWBOX, dressed(p), mode) }) }} />
                    <span className="bt-member-name">{p.member.name || 'No name'}</span>
                    <small>{p.member.id === pendingId ? 'Add a photo' : usesCall(p.member.role) ? p.member.call : p.look.drawing ? 'Drawn' : ROLE_LABEL[p.member.role]}</small>
                  </button>
                ))}
                <input ref={newFileRef} type="file" accept="image/*" hidden data-testid="photo-new-file" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void fromPhoto(f, 'new', '', 'new'); }} />
              </div>
              {busy === 'new' && <DrawingMagic variant="face" compact />}

              <div className="bt-studio" ref={studioRef}>
                <div className="bt-stage" dangerouslySetInnerHTML={{ __html: characterSvg(shown, { animated: true, style: mode, label: `${person.member.name}’s character` }) }} />

                <div className="bt-panel">
                  {person.member.id === pendingId && (
                    <div className="lab-card bt-newcard" data-testid="cast-adder">
                      <h3>Who’s joining the story?</h3>
                      <p className="lab-sub">Add a photo of them and NomNoms draws them. Nobody else changes.</p>
                      <div className="lab-row">
                        <button type="button" className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={!!busy} data-testid="new-photo">
                          <Icon name="camera" size={16} /> {busy === 'own' ? 'Reading the face…' : 'Add a photo of them'}
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={cancelNew} data-testid="new-cancel">Cancel</button>
                      </div>
                      {busy === 'own' && <DrawingMagic variant="face" compact />}
                      <p className="lab-sub">Or start from:</p>
                      <div className="lab-chips">
                        {ADDABLE.map((a) => <button key={a.label} type="button" className="lab-chip" onClick={() => fillPending(a.make)} data-testid={`add-${a.label}`}>{a.label}</button>)}
                        <button type="button" className="lab-chip is-accent" onClick={() => setPad({ mode: 'character', redraw: person.member.id })} data-testid="add-drawing"><Icon name="pen" size={14} /> Draw them</button>
                      </div>
                    </div>
                  )}

                  <div className="bt-who">
                    <label className="field"><span>Name</span>
                      <input value={person.member.name} onChange={(e) => update({ member: { name: e.target.value, ...(usesCall(person.member.role) ? {} : { call: e.target.value }) } })} data-testid="cast-name" />
                    </label>
                    {usesCall(person.member.role) && (
                      <label className="field"><span>{cast[0].member.name || 'The star'} calls them</span>
                        <input value={person.member.call} onChange={(e) => update({ member: { call: e.target.value } })} data-testid="cast-call" />
                      </label>
                    )}
                    <div className="lab-row">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => { const pool = person.member.role === 'pet' ? PET_NAMES : NAMES; const n = pool[Math.floor(Math.random() * pool.length)]; update({ member: { name: n, ...(usesCall(person.member.role) ? {} : { call: n }) } }); }} data-testid="pick-name">
                        <Icon name="sparkle" size={15} /> Pick a name
                      </button>
                      {pi > 0 && person.member.id !== pendingId && <label className="lab-switch"><input type="checkbox" checked={person.member.inStory} onChange={(e) => update({ member: { inStory: e.target.checked } })} /> In the story</label>}
                      {pi > 0 && person.member.id !== pendingId && <button type="button" className="btn btn-danger-ghost btn-sm" onClick={remove} data-testid="cast-remove"><Icon name="x" size={14} /> Remove</button>}
                    </div>
                  </div>

                  <div className="lab-tabs bt-editor-tabs" role="tablist" aria-label={`Change ${person.member.name || 'them'}`}>
                    {tabs.map(([t, label]) => <button key={t} type="button" role="tab" aria-selected={activeTab === t} onClick={() => setEditorTab(t)} data-testid={`etab-${t}`}>{label}</button>)}
                  </div>

                  {activeTab === 'personality' && (
                    <div className="lab-card" data-testid="personality-card">
                      <p className="lab-sub">Sets {person.member.name || 'their'}{person.member.name ? '’s' : ''} face, how they move and how they react in the story.</p>
                      <div className="bt-pers">
                        {(Object.keys(PERSONALITIES) as Personality[]).map((k) => (
                          <button key={k} type="button" className="bt-per" aria-pressed={person.look.personality === k} onClick={() => update({ look: { personality: k, expression: undefined } })} data-testid={`pers-${k}`}>
                            {!pet && !drawing && <span dangerouslySetInnerHTML={{ __html: characterSvg({ ...shown, personality: k, expression: undefined, face: undefined, hat: 'none', glasses: 'none' }, { style: mode, viewBox: fitViewBox('24 30 152 128', shown, mode) }) }} />}
                            <strong>{PERSONALITIES[k].label}</strong><small>{PERSONALITIES[k].blurb}</small>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'face' && drawing && (
                    <div className="lab-card">
                      <p className="lab-sub">{person.member.name} appears in the story exactly as drawn.</p>
                      <div className="lab-row"><button type="button" className="btn btn-ghost btn-sm" onClick={() => setPad({ mode: 'character', redraw: person.member.id })}><Icon name="pen" size={15} /> Draw again</button></div>
                    </div>
                  )}

                  {activeTab === 'photo' && (
                    <div className={cx('lab-card', dropping === 'current' && 'is-dropping')} {...{ [OWN_DROP_ATTR]: '' }} data-testid="photo-card"
                      onDragOver={(e) => { if (![...e.dataTransfer.types].includes('Files')) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setDropping('current'); }}
                      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropping(false); }}
                      onDrop={(e) => { e.preventDefault(); setDropping(false); const f = [...e.dataTransfer.files].find((x) => x.type.startsWith('image/') || /\.(heic|heif|jpe?g|png|webp)$/i.test(x.name)); if (f && !busy) void fromPhoto(f, 'own', ''); else if (!f) setStatus('That isn’t a photo. Drop a JPEG or PNG.'); }}>
                      <p className="lab-sub">NomNoms finds the face on this device and draws {person.member.name || 'them'}: skin, hair, eyes, face shape and age. The photo is never uploaded or saved.</p>
                      <div className="bt-photos">
                        <button type="button" className="bt-photo is-own" onClick={() => fileRef.current?.click()} disabled={!!busy} data-testid="own-photo">
                          <Icon name="camera" size={20} /><span>Your photo</span><small className="bt-drop-hint">or drop one here</small>
                        </button>
                        {(SAMPLE_PHOTOS[person.member.role] ?? SAMPLE_PHOTOS.friend).map((s) => (
                          <button key={s.path} type="button" className="bt-photo" onClick={() => fromPhoto(samplePhotoUrl(s.path), s.path, samplePhotoUrl(s.path, 160))} disabled={!!busy} aria-label={`Sample photo by ${s.by}`} data-testid="sample-photo">
                            <img src={samplePhotoUrl(s.path, 160)} alt="" crossOrigin="anonymous" loading="lazy" />
                            {busy === s.path && <span className="bt-photo-busy" />}
                          </button>
                        ))}
                      </div>
                      {result && (
                        <div className="bt-result" role="status" data-testid="photo-result">
                          {result.from && !result.accepted && <><span className="bt-result-photo"><img src={result.from} alt="The photo that was used" data-testid="photo-thumb" onError={() => setResult((r) => (r ? { ...r, from: '' } : r))} /></span><Icon name="arrow-right" size={18} /></>}
                          <span className="bt-result-char" dangerouslySetInnerHTML={{ __html: characterSvg(shown, { style: mode, viewBox: fitViewBox(FACE_VIEWBOX, shown, mode) }) }} />
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
                            <small>~ means a best guess. Fine-tune in Face & hair.</small>
                            {result.accepted ? (
                              <p className="bt-accepted" data-testid="photo-accepted"><Icon name="check" size={14} /> Photo removed. Only the character is kept; your photo was never uploaded or stored.</p>
                            ) : (
                              <div className="bt-result-actions">
                                <button type="button" className="btn btn-primary btn-sm" onClick={() => setResult((r) => (r ? { ...r, from: '', accepted: true } : r))} data-testid="photo-accept"><Icon name="check" size={14} /> Looks right</button>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} data-testid="photo-retry">Use a different photo</button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {busy && busy !== 'new' && person.member.id !== pendingId ? <DrawingMagic variant="face" compact /> : status && <p className="lab-status" role="status">{status}</p>}

                      <details className="bt-genmoji">
                        <summary><span>Use a real Genmoji</span><small>iPhone, iPad or Mac with Apple Intelligence</small></summary>
                        <ol>
                          <li>On a Mac, open this page in <strong>Safari</strong> (other browsers can only insert Genmoji you’ve already made).</li>
                          <li>Click the box below, then press <kbd>fn</kbd> <kbd>E</kbd> (or <kbd>Control</kbd> <kbd>Command</kbd> <kbd>Space</kbd>) to open the emoji viewer.</li>
                          <li>Click the <strong>Genmoji</strong> button at its top right to make a <em>new</em> one: describe {person.member.name || 'them'} (“a toddler with red curls and a big smile”) or choose them from your Photos.</li>
                          <li>Click <strong>Add</strong>, then pick the new Genmoji to drop it in the box. It becomes their face, and you can still dress them up.</li>
                        </ol>
                        <p className="lab-hint">Apple makes Genmoji only inside its own emoji viewer, so a website can’t create one by itself; this box catches the one you make. The photo stays with Apple; NomNoms only keeps the finished face.{!isAppleSafari && <><br /><strong>You’re not in Safari, so the Genmoji button may not appear here.</strong></>}</p>
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
                  )}
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void fromPhoto(f, 'own', ''); }} data-testid="photo-file" />

                  {activeTab === 'face' && !drawing && (person.look.face ? (
                    <div className="lab-card"><p className="lab-sub">{person.member.name} has a Genmoji face. <button type="button" className="btn btn-ghost btn-sm" onClick={() => update({ look: { face: undefined } })}>Use the drawn face</button></p></div>
                  ) : (
                    <div className="lab-card" data-testid="look-card">
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
                          <details className="bt-more">
                            <summary>Faces, freckles{(person.look.kind === 'adult' || person.look.kind === 'elder') ? ' and facial hair' : ''}</summary>
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
                          </details>
                        </>
                      )}
                    </div>
                  ))}

                  {activeTab === 'clothes' && (
                    <div className="lab-card">
                      {world !== 'everyday' && <p className="lab-sub">Dressed for {WORLDS[world].name}. Changes here stay in this world; ✦ marks its own pieces.</p>}
                      <div className="lab-tabs" role="tablist">
                        {(Object.keys(WARDROBE) as WardrobeTab[]).map((k) => <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} data-testid={`tab-${k}`}>{WARDROBE[k][0]}</button>)}
                      </div>
                      <div className="bt-tiles">
                        <button type="button" className="bt-tile is-draw" onClick={() => setPad({ mode: tab })} data-testid={`draw-${tab}`}>
                          <span><Icon name="pen" size={22} /></span><small>Draw your own</small>
                        </button>
                        {wardrobe.filter((w) => w.slot === tab).map((w) => (
                          <button key={w.id} type="button" className="bt-tile" aria-pressed={shown[tab] === 'drawn' && shown.worn?.[tab] === w.image} onClick={() => wear({ [tab]: 'drawn', worn: { ...shown.worn, [tab]: w.image } } as Partial<Look>)} data-testid="wear-drawn">
                            <span dangerouslySetInnerHTML={{ __html: characterSvg({ ...shown, [tab]: 'drawn', worn: { ...shown.worn, [tab]: w.image } }, { style: mode }) }} />
                            <small>{w.name}</small>
                          </button>
                        ))}
                        {wardrobeOrder(tab).map(([v, label]) => (
                          <button key={v} type="button" className={cx('bt-tile', worldPicks(tab).includes(v) && 'is-world')} aria-pressed={shown[tab] === v} onClick={() => wear({ [tab]: v } as Partial<Look>)} data-testid={`wear-${v}`}>
                            <span dangerouslySetInnerHTML={{ __html: characterSvg({ ...shown, [tab]: v }, { style: mode }) }} />
                            <small>{label}</small>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ── the story ─────────────────────────────── */}
            <section className="lab-section" aria-labelledby="bt-story">
              <div className="lab-h"><h2 id="bt-story" className="display">The story</h2></div>
              <div className="lab-card">
                <div className="bt-types">
                  {typesShown.map((t) => (
                    <button key={t.id} type="button" className="bt-type" aria-pressed={type === t.id} onClick={() => { const w = WORLD_IDS.find((x) => WORLDS[x].story === t.id); if (w) chooseWorld(w); else setType(t.id); }} data-testid={`type-${t.id}`}>
                      <strong>{t.name}</strong><small>{t.blurb}</small>
                    </button>
                  ))}
                </div>
                <div className="lab-row">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAllTypes((v) => !v)} aria-expanded={showAllTypes} data-testid="more-types">{showAllTypes ? 'Fewer kinds of story' : `More kinds of story (${STORY_TYPES.length - typesShown.length})`}</button>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setSeed((s) => s + 1)} data-testid="new-story"><Icon name="refresh" size={15} /> New story</button>
                </div>

                <details className="bt-places" data-testid="places">
                  <summary><span>Places & things</span><small>{placeSummary}</small></summary>
                  <div className="lab-row">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStudio({ kind: 'place' })} data-testid="add-photo-place"><Icon name="camera" size={15} /> A place from a photo</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPad({ mode: 'place' })} data-testid="draw-place"><Icon name="pen" size={15} /> Draw a place</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStudio({ kind: 'object' })} data-testid="add-photo-thing"><Icon name="camera" size={15} /> A thing from a photo</button>
                    {places.length > 0 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPlaces([])}>Let NomNoms choose</button>}
                  </div>
                  <div className="lab-chips">
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
                    {[...PLACES.filter((p) => p.world && p.world === world), ...PLACES.filter((p) => p.id !== 'home' && !p.world)].map((p) => (
                      <button key={p.id} type="button" className="lab-chip" aria-pressed={places.includes(p.id)} onClick={() => toggle(p.id)} data-testid={`place-${p.id}`}>{p.props[0]} {p.name}</button>
                    ))}
                  </div>
                  <label className="lab-switch"><input type="checkbox" checked={dressUp} onChange={(e) => setDressUp(e.target.checked)} /> Dress for each place</label>
                  {(library.length > 0 || drawn.length > 0) && (
                    <div className="bt-library" data-testid="library">
                      <p className="lab-sub">Your places and things <small>(tap a name to rename it)</small></p>
                      {drawn.map((d) => (
                        <div key={d.id} className="bt-asset">
                          <img src={d.image} alt="" />
                          <div><input className="bt-asset-name" value={d.name} onChange={(e) => renamePlace(d.id, e.target.value)} onBlur={() => { if (!d.name.trim()) renamePlace(d.id, uniqueName('Our place', d.id)); }} aria-label={`Rename ${d.name}`} data-testid="rename-place" /><small>Drawn place · This story only</small></div>
                        </div>
                      ))}
                      {library.map((a) => (
                        <div key={a.meta.id} className={cx('bt-asset', a.meta.kind === 'object' && 'is-thing')}>
                          <img src={art_.get(a.meta.id)} alt="" />
                          <div><input className="bt-asset-name" value={a.meta.name} onChange={(e) => renamePlace(a.meta.id, e.target.value)} onBlur={() => keepName(a.meta.id)} aria-label={`Rename ${a.meta.name}`} data-testid="rename-place" /><small>{a.meta.kind === 'place' ? 'Place' : 'Thing'} · {saved.has(a.meta.id) ? 'Saved in this browser' : 'This story only'}</small></div>
                          <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => void removeAsset(a.meta.id)} aria-label={`Delete ${a.meta.name}`} data-testid="asset-delete"><Icon name="x" size={14} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </details>
              </div>
            </section>
          </div>
        </div>

        <p className="lab-fine">A demo of a coming NomNoms feature. Characters and scenes are previews. Sample photos from <a href="https://unsplash.com/?utm_source=nomnoms&utm_medium=referral" target="_blank" rel="noreferrer">Unsplash</a>. Genmoji works on Apple devices with Apple Intelligence.</p>
      </main>
      <AssetStudio open={!!studio} kind={studio?.kind ?? 'place'} mode={mode} star={cast[0].look} onClose={() => setStudio(null)} onDone={(a, save) => void onAsset(a, save)} />
      <DrawPad open={!!pad} mode={pad?.mode ?? 'character'} guide={guideFor(pad?.mode)} onClose={() => setPad(null)} onDone={onDrawn} />
    </div>
  );
}
