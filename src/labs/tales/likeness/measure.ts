import { deltaE, labToRgb, rgbToLab, type Raster } from '../assets/pipeline';
import { CALIBRATION } from './calibration';
import { CANON } from './canon';

/**
 * Face measurements from a face-landmark model's output plus the photo's pixels.
 *
 * Pure and deterministic: the same landmarks and pixels always give the same
 * numbers. Nothing here guesses. A measurement is either
 *   - "measured":  read directly from landmarks or pixels,
 *   - "inferred":  read, but sensitive to lighting, pose or expression, so a
 *                  best guess the parent should glance at, or
 *   - "missing":   could not be read; `why` says why. Missing values are never
 *                  replaced by a default here.
 *
 * Geometry is put in a face-local frame first (eye line horizontal, pupil
 * distance = 1), then compared with how this landmark model reads the average
 * adult (calibration.ts), so the numbers don't depend on photo size, head tilt
 * or distance from the camera. The mean-face file (canon.ts) is only used for
 * the neutral-expression baselines (mouth open, smile).
 */

export type Status = 'measured' | 'inferred' | 'missing';
export interface Measurement<T = number> {
  status: Status;
  /** Present unless missing. For shapes: −1…1, how far from the average face. */
  value?: T;
  /** 0…1 */
  confidence: number;
  /** The number actually read (in pupil distances, or a fraction), for the debug view. */
  raw?: number;
  /** The same number on the average face. */
  average?: number;
  why?: string;
}

export type ShapeKey = 'faceWidth' | 'faceLength' | 'jaw' | 'eyeSize' | 'eyeGap' | 'nose' | 'mouth' | 'browHeight' | 'browWeight';
export const SHAPE_KEYS: ShapeKey[] = ['faceWidth', 'faceLength', 'jaw', 'eyeSize', 'eyeGap', 'nose', 'mouth', 'browHeight', 'browWeight'];
export type HairLength = 'none' | 'short' | 'medium' | 'long';
export type HairTexture = 'straight' | 'wavy' | 'curly' | 'coily';

export interface FaceInput {
  /** 468 face points (+10 iris points when available) in image pixels: [x, y, z?]. */
  mesh: number[][];
  /** Detector confidence 0…1. */
  score: number;
  /** Head turn in radians, when the model gives it. */
  rotation?: { yaw: number; pitch: number; roll: number };
  /** How many faces were found in the photo. */
  faces: number;
}
export interface PixelInput {
  raster: Raster;
  /** Person-vs-background, 0…255 per pixel, same size as the raster. */
  person?: Uint8Array | Uint8ClampedArray;
}

export interface Measurements {
  quality: { score: number; faces: number; iodPx: number; yaw?: number; pitch?: number; roll: number; mouthOpen: number; smile: number; brightness?: number };
  shape: Record<ShapeKey, Measurement>;
  skin: Measurement<string>;
  eyes: Measurement<string>;
  hair: Measurement<string>;
  hairLength: Measurement<HairLength>;
  hairVolume: Measurement;
  hairTexture: Measurement<HairTexture>;
  bangs: Measurement<boolean>;
  facialHair: Measurement<{ moustache: number; chin: number; jaw: number }>;
  glasses: Measurement<boolean>;
  warnings: string[];
  /** Points and regions in image pixels, for drawing the debug overlay. */
  debug: {
    oval: number[][];
    eyes: number[][];
    skinPatches: { x: number; y: number; r: number }[];
    irises: { x: number; y: number; r: number }[];
    regions: { name: string; poly: number[][] }[];
    hairPixels?: Uint8Array;
  };
}

/* ── landmark indices (MediaPipe face mesh) ─────────────────────────── */
export const LM = {
  eyeROut: 33, eyeRIn: 133, eyeLIn: 362, eyeLOut: 263,
  lidRUp: 159, lidRLow: 145, lidLUp: 386, lidLLow: 374,
  cheekR: 234, cheekL: 454, top: 10, chin: 152, jawR: 172, jawL: 397,
  noseR: 129, noseL: 358, noseBase: 2, mouthR: 61, mouthL: 291,
  lipInUp: 13, lipInLow: 14, lipUp: 0, lipLow: 17,
  browR: 105, browL: 334, browRIn: 107, browLIn: 336, browROut: 70, browLOut: 300,
  skinR: 50, skinL: 280, skinR2: 205, skinL2: 425,
} as const;
export const FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];

/** ±1 means this many between-person standard deviations from average (calibration.ts). */
const FULL_SCALE_SD = 1.5;
/** Further than this many standard deviations is treated as a detection error, not a face. */
const IMPLAUSIBLE_SD = 5;

type P = [number, number];
const clamp = (v: number, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, v));
const round = (v: number, d = 3) => Math.round(v * 10 ** d) / 10 ** d;
const mid = (a: P, b: P): P => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const dist = (a: P, b: P) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const median = (xs: number[]) => { if (!xs.length) return NaN; const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const medianLab = (xs: number[][]) => [0, 1, 2].map((k) => median(xs.map((p) => p[k])));
const hexOf = (lab: number[]) => `#${labToRgb(lab[0], lab[1], lab[2]).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
const missing = <T,>(why: string): Measurement<T> => ({ status: 'missing', confidence: 0, why });

/** A face-local frame: origin between the eyes, x along the eye line, 1 unit = pupil distance. */
export interface Frame { o: P; angle: number; iod: number; toLocal: (p: P) => P; toImage: (p: P) => P }
export function frameFrom(pt: (i: number) => P): Frame {
  const r = mid(pt(LM.eyeROut), pt(LM.eyeRIn)), l = mid(pt(LM.eyeLIn), pt(LM.eyeLOut));
  const o = mid(r, l), iod = dist(r, l) || 1, angle = Math.atan2(l[1] - r[1], l[0] - r[0]);
  const c = Math.cos(angle), s = Math.sin(angle);
  return {
    o, angle, iod,
    toLocal: ([x, y]) => { const dx = x - o[0], dy = y - o[1]; return [(dx * c + dy * s) / iod, (-dx * s + dy * c) / iod]; },
    toImage: ([x, y]) => [o[0] + (x * c - y * s) * iod, o[1] + (x * s + y * c) * iod],
  };
}

/** The landmark ratios that describe a face's shape, all in pupil distances. */
export function ratios(pt: (i: number) => P) {
  const f = frameFrom(pt), L = (i: number) => f.toLocal(pt(i));
  const d = (a: number, b: number) => dist(L(a), L(b));
  return {
    faceWidth: d(LM.cheekR, LM.cheekL),
    faceLength: L(LM.chin)[1],
    jaw: d(LM.jawR, LM.jawL) / d(LM.cheekR, LM.cheekL),
    eyeSize: (d(LM.eyeROut, LM.eyeRIn) + d(LM.eyeLIn, LM.eyeLOut)) / 2,
    eyeGap: d(LM.eyeRIn, LM.eyeLIn),
    nose: d(LM.noseR, LM.noseL),
    mouth: d(LM.mouthR, LM.mouthL),
    browHeight: ((L(LM.lidRUp)[1] - L(LM.browR)[1]) + (L(LM.lidLUp)[1] - L(LM.browL)[1])) / 2,
    mouthOpen: d(LM.lipInUp, LM.lipInLow),
    /** Mouth corners above the lip centre line: positive when smiling. */
    smile: (L(LM.lipUp)[1] + L(LM.lipLow)[1]) / 2 - (L(LM.mouthR)[1] + L(LM.mouthL)[1]) / 2,
    eyeOpen: (d(LM.lidRUp, LM.lidRLow) + d(LM.lidLUp, LM.lidLLow)) / 2,
  };
}
export const AVERAGE = ratios((i) => CANON[i]);

function pointInPoly(p: P, poly: P[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function measure(face: FaceInput | null, px: PixelInput): Measurements {
  const warnings: string[] = [];
  const allMissing = (why: string): Measurements => ({
    quality: { score: face?.score ?? 0, faces: face?.faces ?? 0, iodPx: 0, roll: 0, mouthOpen: 0, smile: 0 },
    shape: Object.fromEntries(SHAPE_KEYS.map((k) => [k, missing(why)])) as Record<ShapeKey, Measurement>,
    skin: missing(why), eyes: missing(why), hair: missing(why), hairLength: missing(why), hairVolume: missing(why), hairTexture: missing(why), bangs: missing(why), facialHair: missing(why), glasses: missing(why),
    warnings: [why], debug: { oval: [], eyes: [], skinPatches: [], irises: [], regions: [] },
  });
  if (!face || !face.mesh || face.mesh.length < 468) return allMissing('No face was found in this photo.');
  if (!(face.score >= 0.5)) return allMissing('The face in this photo is unclear, so nothing was read from it.');
  if (face.mesh.slice(0, 468).some((p) => !Number.isFinite(p[0]) || !Number.isFinite(p[1]))) return allMissing('The face points came back broken, so nothing was read.');

  const pt = (i: number): P => [face.mesh[i][0], face.mesh[i][1]];
  const f = frameFrom(pt);
  const L = (i: number) => f.toLocal(pt(i));
  const r = ratios(pt);
  const yaw = face.rotation?.yaw, pitch = face.rotation?.pitch;
  const iodPx = f.iod;
  if (face.faces > 1) warnings.push(`${face.faces} faces in this photo; the biggest one was used.`);
  if (iodPx < 12) return allMissing('The face is too small in this photo. Try one where the face fills more of the picture.');

  /* ── shape ─────────────────────────────────────────────────────── */
  const sizeConf = clamp(iodPx / 40, 0.3, 1);
  const turned = yaw === undefined ? 0.15 : Math.abs(yaw);
  const tilted = pitch === undefined ? 0.15 : Math.abs(pitch);
  const poseConf = (amount: number) => (amount <= 0.15 ? 1 : clamp(1 - (amount - 0.15) / 0.3, 0, 1));
  const mouthOpen = r.mouthOpen - AVERAGE.mouthOpen;
  const smile = r.smile - AVERAGE.smile;
  if (turned > 0.45) warnings.push('The head is turned to the side, so face width, jaw, eyes, nose and mouth weren’t measured.');
  if (tilted > 0.4) warnings.push('The head is tipped up or down, so face length and brows weren’t measured.');
  if (yaw === undefined) warnings.push('Head turn unknown; measurements assume a front-on photo.');

  const shape = {} as Record<ShapeKey, Measurement>;
  for (const k of Object.keys(CALIBRATION) as (keyof typeof CALIBRATION)[]) {
    const cal = CALIBRATION[k], raw = r[k], avg = cal.mean, sds = (raw - avg) / cal.sd;
    const vertical = k === 'faceLength' || k === 'browHeight';
    const pose = vertical ? tilted : turned;
    let why: string | undefined;
    let conf = face.score * sizeConf * poseConf(pose) * cal.reliability;
    let status: Status = 'measured';
    if (vertical ? tilted > 0.4 : turned > 0.45) why = vertical ? 'Head tipped up or down' : 'Head turned to the side';
    else if (!Number.isFinite(sds) || Math.abs(sds) > IMPLAUSIBLE_SD) why = 'Out of the range of real faces, so treated as a detection error';
    else if (k === 'faceLength' && mouthOpen > 0.12) why = 'Mouth open, which lengthens the face';
    else if (k === 'mouth' && smile > 0.1) why = 'A big smile widens the mouth';
    if (why) { shape[k] = { status: 'missing', confidence: 0, raw: round(raw), average: round(avg), why }; continue; }
    // expression can nudge these; read them, but as a best guess
    if (k === 'mouth' && smile > 0.04) { status = 'inferred'; conf *= 0.5; why = 'Smiling a little, so the mouth may read wide'; }
    if (k === 'browHeight') { status = 'inferred'; conf *= 0.6; why = 'Raised or lowered brows change this'; }
    if (k === 'faceLength' && mouthOpen > 0.05) { status = 'inferred'; conf *= 0.6; why = 'Mouth a little open'; }
    shape[k] = { status, value: round(clamp(sds / FULL_SCALE_SD)), confidence: round(conf, 2), raw: round(raw), average: round(avg), ...(why ? { why } : {}) };
  }

  /* ── pixels ────────────────────────────────────────────────────── */
  const { raster } = px;
  const W = raster.w, H = raster.h, data = raster.data;
  const labCache = new Map<number, number[]>();
  const labAt = (x: number, y: number) => {
    const xi = Math.round(x), yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= W || yi >= H) return null;
    const i = yi * W + xi;
    let v = labCache.get(i);
    if (!v) { v = rgbToLab(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]); labCache.set(i, v); }
    return v;
  };
  const personAt = (x: number, y: number) => {
    if (!px.person) return true;
    const xi = Math.round(x), yi = Math.round(y);
    return xi >= 0 && yi >= 0 && xi < W && yi < H && px.person[yi * W + xi] > 127;
  };
  if (!px.person) warnings.push('No person outline was available, so background colours could be mistaken for hair.');
  const step = 1 / Math.max(1, iodPx); // one image pixel, in local units
  /** Visit every pixel of a local-frame box; returns how many fell outside the photo. */
  const scan = (x0: number, x1: number, y0: number, y1: number, fn: (lx: number, ly: number, ix: number, iy: number) => void) => {
    let outside = 0, total = 0;
    const s = Math.max(step, (x1 - x0) / 160); // cap the work on big photos
    for (let ly = y0; ly <= y1; ly += s) for (let lx = x0; lx <= x1; lx += s) {
      const [ix, iy] = f.toImage([lx, ly]);
      total++;
      if (ix < 0 || iy < 0 || ix >= W || iy >= H) { outside++; continue; }
      fn(lx, ly, ix, iy);
    }
    return { outside, total };
  };
  const ovalLocal = FACE_OVAL.map((i) => L(i));
  const inOval = (p: P) => pointInPoly(p, ovalLocal);

  // skin: two patches on each cheek. Glasses frames, shine and shadow are dropped
  // as outliers: anything far from the patches' typical colour isn't skin.
  const patchR = 0.16;
  const patchAt = (c: P) => {
    const labs: number[][] = [];
    scan(c[0] - patchR, c[0] + patchR, c[1] - patchR, c[1] + patchR, (lx, ly, ix, iy) => {
      if (Math.hypot(lx - c[0], ly - c[1]) > patchR || !inOval([lx, ly])) return;
      const v = labAt(ix, iy); if (v) labs.push(v);
    });
    return labs;
  };
  const sides = [[LM.skinR, LM.skinR2], [LM.skinL, LM.skinL2]].map((ids) => ids.flatMap((i) => patchAt(L(i))));
  let skinLab: number[] | null = null;
  let skin: Measurement<string>;
  let both = [...sides[0], ...sides[1]];
  if (both.length >= 20) {
    for (let pass = 0; pass < 2; pass++) { const m = medianLab(both); const kept = both.filter((p) => deltaE(p, m) < 14); if (kept.length >= 20) both = kept; }
  }
  if (both.length < 20) skin = missing('Not enough cheek showing to read skin tone.');
  else {
    const Ls = both.map((p) => p[0]).sort((a, b) => a - b);
    const lo = Ls[Math.floor(Ls.length * 0.1)], hi = Ls[Math.floor(Ls.length * 0.9)];
    skinLab = medianLab(both.filter((p) => p[0] >= lo && p[0] <= hi));
    let conf = 0.9, status: Status = 'measured';
    const why: string[] = [];
    const sideL = sides.map((s) => (s.length ? median(s.map((p) => p[0])) : NaN));
    if (Number.isFinite(sideL[0]) && Number.isFinite(sideL[1]) && Math.abs(sideL[0] - sideL[1]) > 12) { conf *= 0.7; why.push('Light is brighter on one side'); }
    if (skinLab[0] < 25) { conf *= 0.5; status = 'inferred'; why.push('The photo is dark'); }
    if (skinLab[0] > 90) { conf *= 0.5; status = 'inferred'; why.push('The photo is very bright'); }
    if (Math.abs(skinLab[2]) > 45 || skinLab[1] > 40 || skinLab[1] < -5) { conf *= 0.5; status = 'inferred'; why.push('Coloured light may be tinting the skin'); }
    skin = { status, value: hexOf(skinLab), confidence: round(conf, 2), raw: round(skinLab[0], 1), ...(why.length ? { why: why.join('; ') } : {}) };
    if (why.length) warnings.push(`Skin tone: ${why.join('; ').toLowerCase()}. Check it looks right.`);
  }

  // background model, used only when there is no person outline
  let bgLab: number[] | null = null;
  if (!px.person) {
    const edge: number[][] = [];
    for (let i = 0; i < W; i += 4) { const a = labAt(i, 0), b = labAt(i, H - 1); if (a) edge.push(a); if (b) edge.push(b); }
    for (let i = 0; i < H; i += 4) { const a = labAt(0, i), b = labAt(W - 1, i); if (a) edge.push(a); if (b) edge.push(b); }
    bgLab = medianLab(edge);
  }

  /* ── hair ──────────────────────────────────────────────────────── */
  const topY = L(LM.top)[1], chinY = L(LM.chin)[1];
  const halfW = Math.abs(L(LM.cheekL)[0] - L(LM.cheekR)[0]) / 2;
  const jawHalf = Math.abs(L(LM.jawL)[0] - L(LM.jawR)[0]) / 2;
  const browY = Math.min(L(LM.browR)[1], L(LM.browL)[1]);
  const notSkin = (v: number[]) => (skinLab ? deltaE(v, skinLab) > 15 : true);
  const notBg = (v: number[]) => (bgLab ? deltaE(v, bgLab) > 12 : true);
  const candidate = (lx: number, ly: number, ix: number, iy: number) => {
    if (inOval([lx, ly]) || !personAt(ix, iy)) return null;
    const v = labAt(ix, iy);
    return v && notSkin(v) && notBg(v) ? v : null;
  };
  const band = (name: string, x0: number, x1: number, y0: number, y1: number, mirror = false) => {
    const found: number[][] = [];
    let n = 0, out = 0, tot = 0;
    for (const sgn of mirror ? [-1, 1] : [1]) {
      const [a, b] = mirror ? (sgn < 0 ? [-x1, -x0] : [x0, x1]) : [x0, x1];
      const res = scan(a, b, y0, y1, (lx, ly, ix, iy) => { n++; const v = candidate(lx, ly, ix, iy); if (v) found.push(v); });
      out += res.outside; tot += res.total;
    }
    return { name, found, n, outsideFrac: tot ? out / tot : 1 };
  };
  const crown = band('crown', -0.95, 0.95, topY - 0.85, topY - 0.05);
  const temples = band('sides', halfW + 0.05, halfW + 0.9, topY, 0.3, true);
  // where hair almost always shows and hats rarely sit: just outside the face, beside the forehead
  const temple = band('temple', halfW - 0.2, halfW + 0.35, topY + 0.1, -0.25, true);
  let hair: Measurement<string>, hairLength: Measurement<HairLength>, hairVolume: Measurement, hairTexture: Measurement<HairTexture>, bangs: Measurement<boolean>;
  let hairLab: number[] | null = null;
  const crownFrac = crown.n ? crown.found.length / crown.n : 0;
  const sideFrac = temples.n ? temples.found.length / temples.n : 0;
  const hairConf = px.person ? 1 : 0.6;
  if (crown.outsideFrac > 0.5) warnings.push('The top of the head is cut off in this photo, so hair was read from the sides only.');
  const templeFrac = temple.n ? temple.found.length / temple.n : 0;
  const crownLab = crown.found.length >= 30 && crownFrac >= 0.25 ? medianLab(crown.found) : null;
  const templeLab = temple.found.length >= 20 && templeFrac >= 0.2 ? medianLab(temple.found) : null;
  let covered = false;
  // a hat: the top of the head is a different colour from the hair beside the face, either a
  // different hue or much darker. Hair that's just lighter on top (sunlight) isn't a hat.
  const hueGap = crownLab && templeLab ? Math.hypot(crownLab[1] - templeLab[1], crownLab[2] - templeLab[2]) : 0;
  if (crownLab && templeLab && deltaE(crownLab, templeLab) > 22 && (hueGap > 12 || crownLab[0] < templeLab[0] - 15)) {
    covered = true;
    warnings.push('Something seems to cover the top of the head (a hat?), so hair was read from beside the face.');
  }
  if (templeLab && (covered || !crownLab)) hairLab = templeLab;
  else if (crownLab) hairLab = crownLab;
  else if (temples.found.length >= 30 && sideFrac >= 0.2) hairLab = medianLab(temples.found);
  const hairPixels = new Uint8Array(W * H);
  if (!hairLab) {
    const little = crown.outsideFrac <= 0.5 && crown.n > 50;
    hair = missing(little ? 'Very little hair showing, so no hair colour was read.' : 'Not enough hair in the photo to read.');
    hairLength = little ? { status: 'inferred', value: 'none', confidence: round(0.6 * hairConf, 2), raw: round(crownFrac, 2), why: 'Little or no hair on top' } : missing('Not enough hair in the photo to read.');
    hairVolume = missing('No hair to measure.'); hairTexture = missing('No hair to measure.'); bangs = missing('No hair to measure.');
  } else {
    const spread = median([...crown.found, ...temples.found].map((v) => deltaE(v, hairLab!)));
    const thr = clamp(spread * 2.5, 10, 26);
    const isHair = (lx: number, ly: number, ix: number, iy: number, inside = false) => {
      const v = inside ? labAt(ix, iy) : candidate(lx, ly, ix, iy);
      return !!v && deltaE(v, hairLab!) < thr && (!inside || notSkin(v));
    };
    const fracOf = (x0: number, x1: number, y0: number, y1: number, inside = false, mirror = false, code = 1) => {
      let n = 0, hit = 0;
      for (const sgn of mirror ? [-1, 1] : [1]) {
        const [a, b] = mirror ? (sgn < 0 ? [-x1, -x0] : [x0, x1]) : [x0, x1];
        scan(a, b, y0, y1, (lx, ly, ix, iy) => {
          if (inside && !inOval([lx, ly])) return;
          n++;
          if (isHair(lx, ly, ix, iy, inside)) { hit++; const j = Math.round(iy) * W + Math.round(ix); if (!hairPixels[j]) hairPixels[j] = code; }
        });
      }
      return n ? hit / n : 0;
    };
    const coverTop = covered ? 1 : fracOf(-0.95, 0.95, topY - 0.85, topY - 0.05, false, false, 2);
    const coverSide = fracOf(halfW + 0.05, halfW + 0.9, topY, 0.3, false, true);
    // length: hair must first be beside the face at ear height, then it is followed
    // down row by row until it stops, so collars and dark clothes don't count as hair
    const earLevel = fracOf(halfW - 0.05, halfW + 0.55, 0.3, chinY - 0.5, false, true);
    let lastRow = -Infinity, gap = 0, ranOff = false;
    const rowStep = 0.08;
    for (let y = chinY - 0.9; earLevel > 0.22 && y <= chinY + 1.8; y += rowStep) {
      const fr = fracOf(jawHalf + 0.1, halfW + 0.75, y, y + rowStep, false, true);
      const [, iy] = f.toImage([0, y]);
      if (iy >= H) { ranOff = lastRow > y - 0.3; break; }
      if (fr > 0.18) { lastRow = y; gap = 0; } else if ((gap += rowStep) > 0.2 && lastRow > -Infinity) break;
    }
    const lengthY = lastRow - chinY;
    const len: HairLength = lastRow === -Infinity ? 'short' : lengthY < -0.3 ? 'short' : lengthY < 0.5 ? 'medium' : 'long';
    hair = { status: 'measured', value: hexOf(hairLab), confidence: round(0.85 * hairConf, 2), raw: round(hairLab[0], 1) };
    hairLength = { status: 'inferred', value: len, confidence: round((ranOff ? 0.5 : 0.7) * hairConf, 2), raw: Number.isFinite(lengthY) ? round(lengthY, 2) : undefined, why: ranOff ? 'Hair runs past the bottom of the photo' : 'Measured beside the jaw; tied-up hair reads as short' };
    if (coverTop < 0.3 && coverSide < 0.15) hairLength = { status: 'inferred', value: 'none', confidence: round(0.6 * hairConf, 2), raw: round(coverTop, 2), why: 'Little or no hair on top' };
    hairVolume = { status: 'measured', value: round(clamp((coverSide - 0.3) / 0.3)), confidence: round(0.7 * hairConf, 2), raw: round(coverSide, 2), average: 0.3 };
    // texture: how busy the hair is, relative to its own contrast. Read beside the face
    // first, where hat badges and hair clips rarely are; the top only if needed.
    const d = Math.max(1, Math.round(iodPx / 40));
    let g = 0, gn = 0;
    const Lvals: number[] = [];
    let sideCount = 0;
    for (let i = 0; i < hairPixels.length; i++) if (hairPixels[i] === 1) sideCount++;
    const use = sideCount >= 60 ? 1 : 0;
    for (let i = 0; i < hairPixels.length; i++) {
      if (!hairPixels[i] || (use && hairPixels[i] !== use)) continue;
      const x = i % W, y = (i / W) | 0;
      const a = labAt(x, y), b = labAt(x + d, y), c = labAt(x, y + d);
      if (!a || !b || !c) continue;
      Lvals.push(a[0]);
      g += Math.hypot(b[0] - a[0], c[0] - a[0]); gn++;
    }
    if (gn < 60) hairTexture = missing('Not enough hair to judge curls.');
    else {
      const mean = Lvals.reduce((s, v) => s + v, 0) / Lvals.length;
      const sd = Math.sqrt(Lvals.reduce((s, v) => s + (v - mean) ** 2, 0) / Lvals.length);
      const busy = g / gn / (sd + 4);
      const t: HairTexture = busy < 0.55 ? 'straight' : busy < 0.75 ? 'wavy' : busy < 0.95 ? 'curly' : 'coily';
      hairTexture = { status: 'inferred', value: t, confidence: round(0.4 * hairConf * sizeConf, 2), raw: round(busy, 3), why: 'Curls are a best guess from how busy the hair looks' };
    }
    const bangFrac = fracOf(-0.7, 0.7, topY + 0.05, browY - 0.25, true);
    bangs = browY - 0.25 <= topY + 0.1 ? missing('Forehead too small to check for a fringe.') : { status: 'measured', value: bangFrac > 0.4, confidence: round(0.75 * hairConf, 2), raw: round(bangFrac, 2) };
  }

  /* ── facial hair (read for everyone; the DNA only uses it for grown-ups) ── */
  let facialHair: Measurement<{ moustache: number; chin: number; jaw: number }>;
  if (!skinLab) facialHair = missing('Skin tone unknown, so facial hair can’t be told apart.');
  else {
    const dark = (x0: number, x1: number, y0: number, y1: number, mirror = false) => {
      let n = 0, hit = 0;
      for (const sgn of mirror ? [-1, 1] : [1]) {
        const [a, b] = mirror ? (sgn < 0 ? [-x1, -x0] : [x0, x1]) : [x0, x1];
        scan(a, b, y0, y1, (lx, ly, ix, iy) => {
          if (!inOval([lx, ly])) return;
          const v = labAt(ix, iy); if (!v) return;
          n++; if (v[0] < skinLab![0] - 10 && deltaE(v, skinLab!) > 10) hit++;
        });
      }
      return n ? round(hit / n, 2) : 0;
    };
    const noseY = L(LM.noseBase)[1], lipTop = L(LM.lipUp)[1], lipLow = L(LM.lipLow)[1], mouthY = L(LM.mouthR)[1];
    const v = {
      moustache: lipTop - noseY > 0.12 ? dark(-0.42, 0.42, noseY + 0.06, lipTop - 0.04) : 0,
      chin: dark(-0.45, 0.45, lipLow + 0.08, chinY - 0.06),
      jaw: dark(Math.min(0.62, jawHalf - 0.1), jawHalf, mouthY, chinY - 0.15, true),
    };
    facialHair = turned > 0.35 ? missing('Head turned, so facial hair wasn’t checked.') : { status: 'inferred', value: v, confidence: round(0.45 * sizeConf, 2), why: 'Shadows can look like stubble; please check' };
  }

  /* ── eye colour, from the iris ring ────────────────────────────── */
  let eyes: Measurement<string>;
  const irises: { x: number; y: number; r: number }[] = [];
  if (face.mesh.length < 478) eyes = missing('This face model doesn’t find irises.');
  else if (r.eyeOpen < 0.05) eyes = missing('Eyes closed or squinting.');
  else {
    const labs: number[][] = [];
    for (const [c0, lids] of [[468, [LM.lidRUp, LM.lidRLow]], [473, [LM.lidLUp, LM.lidLLow]]] as const) {
      const c = pt(c0), ring = [1, 2, 3, 4].map((k) => pt(c0 + k));
      const R = ring.reduce((s, q) => s + dist(c, q), 0) / 4;
      irises.push({ x: c[0], y: c[1], r: R });
      if (R < 3.5) continue;
      const up = L(lids[0])[1], low = L(lids[1])[1];
      for (let y = Math.floor(c[1] - R); y <= c[1] + R; y++) for (let x = Math.floor(c[0] - R); x <= c[0] + R; x++) {
        const rr = Math.hypot(x - c[0], y - c[1]);
        if (rr < 0.4 * R || rr > 0.9 * R) continue;
        const ly = f.toLocal([x, y])[1];
        if (ly < up + 0.01 || ly > low - 0.01) continue;
        const v = labAt(x, y);
        if (v && v[0] > 6 && v[0] < 75) labs.push(v);
      }
    }
    if (labs.length < 12) eyes = missing(irises.every((i) => i.r < 3.5) ? 'Eyes too small in this photo to read their colour.' : 'Couldn’t see enough of the eyes.');
    else eyes = { status: 'inferred', value: hexOf(medianLab(labs)), confidence: round(clamp(labs.length / 120, 0.3, 0.8), 2), raw: labs.length, why: 'Eye colour reads darker in photos than in life' };
  }

  /* ── brow weight: how much darker the brows are than the skin ──── */
  if (shape.browHeight.status !== 'missing' && skinLab) {
    const vals: number[] = [];
    for (const [a, b, c] of [[LM.browROut, LM.browR, LM.browRIn], [LM.browLOut, LM.browL, LM.browLIn]]) {
      const pts = [L(a), L(b), L(c)];
      for (let k = 0; k < 2; k++) for (let t = 0; t <= 1; t += 0.05) {
        const x = pts[k][0] + (pts[k + 1][0] - pts[k][0]) * t, y0 = pts[k][1] + (pts[k + 1][1] - pts[k][1]) * t;
        for (let dy = -0.06; dy <= 0.06; dy += step) { const [ix, iy] = f.toImage([x, y0 + dy]); const v = labAt(ix, iy); if (v) vals.push(v[0]); }
      }
    }
    if (vals.length < 20) shape.browWeight = missing('Brows not visible.');
    else {
      vals.sort((a, b) => a - b);
      const darkHalf = median(vals.slice(0, vals.length >> 1));
      const contrast = skinLab[0] - darkHalf;
      shape.browWeight = { status: 'inferred', value: round(clamp((contrast - 20) / 15)), confidence: round(0.45 * sizeConf, 2), raw: round(contrast, 1), average: 20, why: 'Light hair or makeup changes this' };
    }
  } else shape.browWeight = missing(skinLab ? 'Brows not readable.' : 'Skin tone unknown.');

  const toImg = (poly: P[]) => poly.map((p) => f.toImage(p));
  const rect = (x0: number, x1: number, y0: number, y1: number): P[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  return {
    quality: { score: round(face.score, 3), faces: face.faces, iodPx: round(iodPx, 1), yaw: yaw === undefined ? undefined : round(yaw, 3), pitch: pitch === undefined ? undefined : round(pitch, 3), roll: round(f.angle, 3), mouthOpen: round(mouthOpen, 3), smile: round(smile, 3), brightness: skinLab ? round(skinLab[0], 1) : undefined },
    shape, skin, eyes, hair, hairLength, hairVolume, hairTexture, bangs, facialHair,
    glasses: missing('Glasses aren’t detected; choose them in the wardrobe.'),
    warnings,
    debug: {
      oval: FACE_OVAL.map((i) => pt(i)),
      eyes: [LM.eyeROut, LM.eyeRIn, LM.eyeLIn, LM.eyeLOut].map((i) => pt(i)),
      skinPatches: [LM.skinR, LM.skinL, LM.skinR2, LM.skinL2].map((i) => ({ x: pt(i)[0], y: pt(i)[1], r: patchR * iodPx })),
      irises,
      regions: [
        { name: 'crown', poly: toImg(rect(-0.95, 0.95, topY - 0.85, topY - 0.05)) },
        { name: 'side', poly: toImg(rect(halfW + 0.05, halfW + 0.9, topY, 0.3)) },
        { name: 'side', poly: toImg(rect(-halfW - 0.9, -halfW - 0.05, topY, 0.3)) },
        { name: 'length', poly: toImg(rect(jawHalf + 0.1, halfW + 0.75, chinY - 0.9, chinY + 1.8)) },
        { name: 'length', poly: toImg(rect(-halfW - 0.75, -jawHalf - 0.1, chinY - 0.9, chinY + 1.8)) },
        { name: 'temple', poly: toImg(rect(halfW - 0.2, halfW + 0.35, topY + 0.1, -0.25)) },
        { name: 'temple', poly: toImg(rect(-halfW - 0.35, -halfW + 0.2, topY + 0.1, -0.25)) },
        { name: 'ear', poly: toImg(rect(halfW - 0.05, halfW + 0.55, 0.3, chinY - 0.5)) },
        { name: 'fringe', poly: toImg(rect(-0.7, 0.7, topY + 0.05, browY - 0.25)) },
      ],
      hairPixels,
    },
  };
}

