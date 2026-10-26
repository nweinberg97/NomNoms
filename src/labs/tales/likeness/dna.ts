import { EYE_COLOURS, HAIR_COLOURS, SKIN_TONES, type Facial, type HairStyle, type Kind, type Look } from '../character';
import { SHAPE_KEYS, type HairLength, type HairTexture, type Measurement, type Measurements, type ShapeKey } from './measure';

/**
 * Character DNA: who someone is, separate from how they look right now.
 *
 * It holds identity only: skin, hair, eyes, face shape and hairstyle. It never
 * holds expression, pose, outfit, hats, glasses or extras, so a new photo can't
 * change those and changing those can't change identity.
 *
 * Every trait records where it came from:
 *   measured  read from the photo
 *   inferred  read from the photo, but a best guess (lighting, pose, expression)
 *   parent    chosen by hand; a new photo never overwrites it
 * A trait that couldn't be read is simply absent, never filled with a default.
 */

export type Source = 'measured' | 'inferred' | 'parent';
export interface Trait<T> { value: T; source: Source; confidence: number; basis?: string }
export type IdentityKey = 'skin' | 'hair' | 'eyes' | 'hairStyle' | 'facial' | 'shape' | 'kind';
export const IDENTITY_KEYS: IdentityKey[] = ['skin', 'hair', 'eyes', 'hairStyle', 'facial', 'shape', 'kind'];

export interface CharacterDNA {
  version: 1;
  /** Baby, kid, grown-up or grandparent: from the photo unless the parent chose it. */
  kind: Kind;
  /** What the photo suggested, kept so the parent can see and change it. */
  ageGroup?: Trait<Kind>;
  skin?: Trait<string>;
  hair?: Trait<string>;
  eyes?: Trait<string>;
  hairStyle?: Trait<HairStyle>;
  facial?: Trait<Facial>;
  shape: Partial<Record<ShapeKey, Trait<number>>>;
  /** The hair readings the hairstyle was chosen from. */
  hairDetail: { length?: Trait<HairLength>; texture?: Trait<HairTexture>; volume?: Trait<number>; bangs?: Trait<boolean> };
  warnings: string[];
}

export type FaceShape = Partial<Record<ShapeKey, number>>;

const trait = <T,>(m: Measurement<T>): Trait<T> | undefined =>
  m.status === 'missing' || m.value === undefined ? undefined : { value: m.value, source: m.status, confidence: m.confidence, ...(m.why ? { basis: m.why } : {}) };

/* ── colours: true to the photo, kept inside the illustration's range ── */
const rgb = (h: string) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const hex = (c: number[]) => `#${c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
const nearest = (c: number[], palette: string[]) => palette.reduce((best, h) => { const d = (p: number[]) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]); return d(rgb(h)) < d(rgb(best)) ? h : best; }, palette[0]);
/** Pull a photo colour part-way toward the nearest illustration colour, so a dim photo doesn't make a muddy character. */
export const tame = (h: string, palette: string[], k: number) => { const c = rgb(h), p = rgb(nearest(c, palette)); return hex(c.map((v, i) => v * (1 - k) + p[i] * k)); };

/* ── hairstyle: chosen from readings, never at random ──────────── */
export function pickHairStyle(kind: Kind, d: CharacterDNA['hairDetail']): Trait<HairStyle> | undefined {
  const len = d.length?.value;
  if (!len) return undefined;
  const tex = d.texture && d.texture.confidence >= 0.2 ? d.texture.value : 'straight';
  const big = (d.volume?.value ?? 0) > 0.3;
  const fringe = !!d.bangs?.value;
  const conf = Math.min(d.length!.confidence, d.texture?.confidence ?? 0.5, 0.7);
  const style = ((): HairStyle => {
    if (len === 'none') return kind === 'baby' ? 'tuft' : kind === 'kid' ? 'buzz' : (d.volume?.value ?? -1) > -0.6 ? 'sides' : 'buzz';
    if (kind === 'baby') return tex === 'curly' || tex === 'coily' ? 'curly' : 'tuft';
    if (tex === 'coily') return len === 'long' ? 'longcurly' : big ? 'afro' : 'coils';
    if (tex === 'curly') return len === 'long' ? 'longcurly' : 'curly';
    if (tex === 'wavy') return len === 'long' ? 'wavy' : len === 'medium' ? (fringe ? 'bangs' : 'bob') : fringe ? 'pixie' : 'short';
    if (len === 'long') return fringe ? 'bangs' : 'long';
    if (len === 'medium') return fringe ? 'bangs' : 'bob';
    return fringe ? 'pixie' : 'short';
  })();
  const why = [`length: ${len}`, `texture: ${tex}${d.texture ? '' : ' (not read)'}`, big ? 'lots of volume' : '', fringe ? 'fringe' : ''].filter(Boolean).join(', ');
  return { value: style, source: 'inferred', confidence: Math.round(conf * 100) / 100, basis: why };
}

function pickFacial(kind: Kind, m: Measurement<{ moustache: number; chin: number; jaw: number }>): Trait<Facial> | undefined {
  if (kind !== 'adult' && kind !== 'elder') return undefined;
  const v = trait(m);
  if (!v) return undefined;
  const { moustache: t, chin: c, jaw: j } = v.value;
  // Only clear, strong evidence is used. Shadows under the nose and jaw look like
  // stubble, so stubble is never inferred, and weak evidence leaves the choice to the parent.
  const f: Facial | null = t >= 0.55 && c >= 0.55 && j >= 0.45 ? 'full' : t >= 0.55 && c >= 0.55 ? 'trim' : t >= 0.6 ? 'moustache' : t < 0.2 && c < 0.2 && j < 0.2 ? 'none' : null;
  if (!f) return undefined;
  return { value: f, source: 'inferred', confidence: v.confidence, basis: `dark pixels: moustache ${t}, chin ${c}, jaw ${j}` };
}

/** The age group to draw: the parent's choice if they made one, else the photo's guess, else the current one. */
export const kindFor = (m: Measurements, current: Kind, chosenByParent: boolean): Kind =>
  chosenByParent || isPetKind(current) || m.ageGroup.status === 'missing' || !m.ageGroup.value ? current : m.ageGroup.value;
const isPetKind = (k: Kind) => !['baby', 'kid', 'adult', 'elder'].includes(k);

/** Turn photo measurements into DNA. Parent-chosen traits in `keep` are carried over untouched. */
export function buildDNA(m: Measurements, kind: Kind, keep: Partial<Pick<CharacterDNA, Exclude<IdentityKey, 'kind'>>> = {}): CharacterDNA {
  const shape: CharacterDNA['shape'] = {};
  for (const k of SHAPE_KEYS) { const t = trait(m.shape[k]); if (t) shape[k] = t; }
  const hairDetail: CharacterDNA['hairDetail'] = {};
  const len = trait(m.hairLength), tex = trait(m.hairTexture), vol = trait(m.hairVolume), bangs = trait(m.bangs);
  if (len) hairDetail.length = len;
  if (tex) hairDetail.texture = tex;
  if (vol) hairDetail.volume = vol;
  if (bangs) hairDetail.bangs = bangs;
  const dna: CharacterDNA = { version: 1, kind, shape, hairDetail, warnings: [...m.warnings] };
  const age = trait(m.ageGroup);
  if (age) dna.ageGroup = age;
  const skin = trait(m.skin), hair = trait(m.hair), eyes = trait(m.eyes);
  if (skin) dna.skin = skin;
  if (hair) dna.hair = hair;
  if (eyes) dna.eyes = eyes;
  const style = pickHairStyle(kind, hairDetail);
  if (style) dna.hairStyle = style;
  const facial = pickFacial(kind, m.facialHair);
  if (facial) dna.facial = facial;
  for (const k of IDENTITY_KEYS) if (k !== 'kind' && keep[k] !== undefined) (dna as unknown as Record<string, unknown>)[k] = keep[k];
  return dna;
}

/**
 * Apply DNA to a look. Only identity fields change; expression, personality,
 * outfit, hat, glasses, extras, drawn clothes and drawings stay as they are.
 * Traits the DNA doesn't have leave the look's current value in place.
 */
export function applyDNA(look: Look, dna: CharacterDNA): Look {
  const next: Look = { ...look, kind: dna.kind };
  if (dna.skin) next.skin = dna.skin.source === 'parent' ? dna.skin.value : tame(dna.skin.value, SKIN_TONES, 0.35);
  if (dna.hair) next.hair = dna.hair.source === 'parent' ? dna.hair.value : tame(dna.hair.value, HAIR_COLOURS, 0.4);
  if (dna.eyes) next.eyes = dna.eyes.source === 'parent' ? dna.eyes.value : tame(dna.eyes.value, EYE_COLOURS, 0.5);
  if (dna.hairStyle) next.hairStyle = dna.hairStyle.value;
  if (dna.facial) next.facial = dna.facial.value;
  const shape: FaceShape = {};
  for (const k of SHAPE_KEYS) { const t = dna.shape[k]; if (t) shape[k] = t.value; }
  // shapes the photo couldn't read keep their current value
  if (Object.keys(shape).length) next.shape = { ...look.shape, ...shape };
  return next;
}

/** A trait a parent chose by hand, for `buildDNA(…, keep)`. */
export function parentTraits(look: Look, keys: IdentityKey[]): Partial<Pick<CharacterDNA, Exclude<IdentityKey, 'kind'>>> {
  const out: Partial<Pick<CharacterDNA, Exclude<IdentityKey, 'kind'>>> = {};
  const p = <T,>(value: T): Trait<T> => ({ value, source: 'parent', confidence: 1 });
  for (const k of keys) {
    if (k === 'skin') out.skin = p(look.skin);
    else if (k === 'hair') out.hair = p(look.hair);
    else if (k === 'eyes' && look.eyes) out.eyes = p(look.eyes);
    else if (k === 'hairStyle') out.hairStyle = p(look.hairStyle);
    else if (k === 'facial' && look.facial) out.facial = p(look.facial);
    else if (k === 'shape' && look.shape) out.shape = Object.fromEntries(Object.entries(look.shape).map(([s, v]) => [s, p(v as number)]));
  }
  return out;
}

/** Stable text form: sorted keys, rounded numbers. The same DNA always gives the same string. */
export function serializeDNA(dna: CharacterDNA): string {
  const norm = (v: unknown): unknown => {
    if (typeof v === 'number') return Math.round(v * 1000) / 1000;
    if (Array.isArray(v)) return v.map(norm);
    if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().filter((k) => (v as Record<string, unknown>)[k] !== undefined).map((k) => [k, norm((v as Record<string, unknown>)[k])]));
    return v;
  };
  return JSON.stringify(norm(dna));
}
export const parseDNA = (s: string): CharacterDNA => JSON.parse(s) as CharacterDNA;

/** Plain-words chips for the result card: what was read, and how sure. */
export function describeDNA(dna: CharacterDNA): { label: string; sure: boolean }[] {
  const out: { label: string; sure: boolean }[] = [];
  const add = (t: Trait<unknown> | undefined, label: string) => { if (t && t.source !== 'parent') out.push({ label, sure: t.source === 'measured' && t.confidence >= 0.6 }); };
  add(dna.skin, 'Skin tone');
  add(dna.hair, 'Hair colour');
  add(dna.hairStyle, dna.hairStyle ? `Hair: ${dna.hairStyle.value}` : '');
  add(dna.eyes, 'Eye colour');
  const shapes = SHAPE_KEYS.filter((k) => dna.shape[k] && dna.shape[k]!.source !== 'parent');
  if (shapes.length) out.push({ label: `Face shape (${shapes.length} of ${SHAPE_KEYS.length})`, sure: shapes.filter((k) => dna.shape[k]!.source === 'measured').length >= 4 });
  add(dna.facial, dna.facial ? (dna.facial.value === 'none' ? 'No beard' : `Facial hair: ${dna.facial.value}`) : '');
  return out;
}
