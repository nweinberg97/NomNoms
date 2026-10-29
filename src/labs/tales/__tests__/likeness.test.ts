import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeRaster, type Raster } from '../assets/pipeline';
import { characterMarkup, SKIN_TONES, type Look } from '../character';
import { applyDNA, buildDNA, kindFor, parentTraits, parseDNA, serializeDNA, skinToneFor } from '../likeness/dna';
import { FACE_OVAL, measure, SHAPE_KEYS, type FaceInput } from '../likeness/measure';
import astronaut from './fixtures/astronaut.landmarks.json';
import grace from './fixtures/grace.landmarks.json';

/*
 * Automated checks of the photo → character pipeline. These test behaviour
 * (determinism, honesty about missing data, identity vs expression), not how
 * good the drawings look; that is reviewed by eye on the diagnostics page.
 * Fixtures are face-landmark points from two public-domain adult portraits.
 */

type Fixture = typeof astronaut;
const faceOf = (fx: Fixture, mesh = fx.mesh as number[][]): FaceInput => ({ mesh, score: fx.score, rotation: fx.rotation, faces: 1 });
const blank = (w = 4, h = 4): Raster => makeRaster(w, h);
const LOOK: Look = { kind: 'adult', skin: '#efc19f', hair: '#5a3b26', hairStyle: 'short', eyes: '#5a3a22', outfit: 'tee', hat: 'cap', glasses: 'round', extra: 'balloon', expression: 'wow', personality: 'silly' };

/** Move every landmark: rotate about a point, scale, shift. */
function transform(mesh: number[][], deg: number, k: number, dx: number, dy: number) {
  const t = (deg * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t), cx = 256, cy = 256;
  return mesh.map(([x, y]) => { const X = x - cx, Y = y - cy; return [cx + (X * c - Y * s) * k + dx, cy + (X * s + Y * c) * k + dy]; });
}

/** A photo painted from the landmarks: skin inside the face outline, hair above it, plain background. */
function paint(fx: Fixture, opts: { hair?: boolean } = {}) {
  const r = makeRaster(fx.width, fx.height);
  const person = new Uint8Array(r.w * r.h);
  const oval = FACE_OVAL.map((i) => fx.mesh[i]);
  const inside = (x: number, y: number) => { let s = false; for (let i = 0, j = oval.length - 1; i < oval.length; j = i++) { const [xi, yi] = oval[i], [xj, yj] = oval[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) s = !s; } return s; };
  const top = fx.mesh[10][1], left = fx.mesh[234][0], right = fx.mesh[454][0], chin = fx.mesh[152][1];
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    const i = (y * r.w + x) * 4;
    let c = [70, 120, 200]; // blue background
    const hair = opts.hair !== false && y > top - (right - left) * 0.75 && y < chin + 40 && x > left - 60 && x < right + 60;
    if (hair) { c = [60, 38, 22]; person[y * r.w + x] = 255; }
    if (inside(x, y)) { c = [222, 176, 146]; person[y * r.w + x] = 255; }
    r.data[i] = c[0]; r.data[i + 1] = c[1]; r.data[i + 2] = c[2]; r.data[i + 3] = 255;
  }
  return { raster: r, person };
}

test('the same photo gives the same DNA, every time', () => {
  const a = serializeDNA(buildDNA(measure(faceOf(astronaut), paint(astronaut)), 'adult'));
  const b = serializeDNA(buildDNA(measure(faceOf(astronaut), paint(astronaut)), 'adult'));
  assert.equal(a, b);
  assert.notEqual(a, serializeDNA(buildDNA(measure(faceOf(grace), paint(grace)), 'adult')), 'different people differ');
});

test('DNA text is stable: key order and float noise do not change it', () => {
  const dna = buildDNA(measure(faceOf(grace), paint(grace)), 'adult');
  const s = serializeDNA(dna);
  const shuffled = Object.fromEntries(Object.entries(dna).reverse()) as typeof dna;
  assert.equal(serializeDNA(shuffled), s);
  assert.equal(serializeDNA(parseDNA(s)), s, 'round trip');
  const noisy = { ...dna, shape: Object.fromEntries(Object.entries(dna.shape).map(([k, t]) => [k, { ...t!, value: t!.value + 1e-9 }])) };
  assert.equal(serializeDNA(noisy), s);
  assert.deepEqual(Object.keys(JSON.parse(s)), Object.keys(JSON.parse(s)).sort(), 'keys sorted');
});

test('no face found: nothing is measured, nothing is changed', () => {
  for (const face of [null, { ...faceOf(astronaut), score: 0.2 }, { ...faceOf(astronaut), mesh: astronaut.mesh.slice(0, 100) }, { ...faceOf(astronaut), mesh: astronaut.mesh.map(() => [NaN, NaN]) }]) {
    const m = measure(face as FaceInput | null, { raster: blank() });
    for (const k of SHAPE_KEYS) assert.equal(m.shape[k].status, 'missing');
    for (const k of ['skin', 'hair', 'eyes', 'hairLength', 'bangs'] as const) { assert.equal(m[k].status, 'missing'); assert.equal(m[k].value, undefined); }
    assert.ok(m.warnings.length > 0, 'says why');
    const dna = buildDNA(m, 'adult');
    assert.equal(dna.skin, undefined); assert.equal(dna.hair, undefined); assert.equal(dna.hairStyle, undefined);
    assert.deepEqual(dna.shape, {});
    assert.deepEqual(applyDNA(LOOK, dna), LOOK, 'the look is untouched');
  }
});

test('a face too small to read is refused, not guessed', () => {
  const m = measure(faceOf(astronaut, transform(astronaut.mesh, 0, 0.2, 0, 0)), { raster: blank() });
  assert.equal(m.shape.faceWidth.status, 'missing');
  assert.match(m.warnings.join(' '), /too small/);
});

test('missing pixels are reported missing, never defaulted', () => {
  const m = measure(faceOf(astronaut), { raster: blank() });
  assert.equal(m.skin.status, 'missing');
  assert.equal(m.hair.status, 'missing');
  assert.equal(m.eyes.status, 'missing');
  assert.equal(m.glasses.status, 'missing', 'glasses are never claimed');
  assert.notEqual(m.shape.nose.status, 'missing', 'geometry still read from landmarks');
});

test('extreme or impossible measurements are clamped or rejected', () => {
  const stretch = (k: number) => astronaut.mesh.map(([x, y]) => [256 + (x - 256) * k, y]);
  const wild = measure(faceOf(astronaut, stretch(1.9)), { raster: blank() });
  assert.equal(wild.shape.faceLength.status, 'missing', 'a face this distorted is a detection error');
  assert.match(wild.shape.faceLength.why ?? '', /range of real faces/);
  for (const k of [1.04, 1.12, 0.92]) {
    const m = measure(faceOf(astronaut, stretch(k)), { raster: blank() });
    for (const s of SHAPE_KEYS) { const v = m.shape[s].value; if (v !== undefined) assert.ok(v >= -1 && v <= 1, `${s}=${v}`); }
  }
  const look = applyDNA(LOOK, { ...buildDNA(measure(faceOf(astronaut), { raster: blank() }), 'adult'), shape: { nose: { value: 40, source: 'measured', confidence: 1 } } });
  const svg = characterMarkup(look);
  assert.ok(!/NaN|Infinity/.test(svg));
  const scale = Number(/translate\(100 112\) scale\(([0-9.]+)/.exec(svg)?.[1]);
  assert.ok(scale > 1 && scale <= 1.3001, `renderer limits the nose to its art-directed range (${scale})`);
});

test('identity does not depend on head tilt, photo size or position', () => {
  const ref = measure(faceOf(astronaut), { raster: blank() });
  const moved = measure(faceOf(astronaut, transform(astronaut.mesh, 14, 1.7, -40, 25)), { raster: blank() });
  for (const k of SHAPE_KEYS) {
    const a = ref.shape[k].value, b = moved.shape[k].value;
    if (a === undefined) continue;
    assert.ok(Math.abs(a - (b ?? 99)) < 0.02, `${k}: ${a} vs ${b}`);
  }
});

test('expression is not identity: an open mouth is not read as a long face', () => {
  const open = astronaut.mesh.map((p, i) => ([14, 17, 152, 148, 176, 149, 150, 136, 172, 58, 377, 400, 378, 379, 365, 397, 288].includes(i) ? [p[0], p[1] + 14] : p));
  const m = measure(faceOf(astronaut, open), { raster: blank() });
  assert.notEqual(m.shape.faceLength.status, 'measured', 'face length is held back while the mouth is open');
  const ref = measure(faceOf(astronaut), { raster: blank() });
  for (const k of ['eyeSize', 'eyeGap', 'nose'] as const) assert.equal(m.shape[k].value, ref.shape[k].value, `${k} unaffected`);
});

test('applying DNA changes identity only; expression, clothes and drawings stay', () => {
  const drawnLook: Look = { ...LOOK, worn: { hat: 'data:image/png;base64,HAT' }, hat: 'drawn' };
  const dna = buildDNA(measure(faceOf(grace), paint(grace)), 'adult');
  const out = applyDNA(drawnLook, dna);
  for (const k of ['expression', 'personality', 'outfit', 'hat', 'glasses', 'extra', 'worn', 'kind'] as const) assert.deepEqual(out[k], drawnLook[k], k);
  assert.notEqual(out.skin, drawnLook.skin);
  assert.ok(out.shape && Object.keys(out.shape).length >= 5);
  // and a different expression never changes the measured face
  const a = characterMarkup({ ...out, expression: 'smile' }), b = characterMarkup({ ...out, expression: 'sleepy' });
  const head = (s: string) => /<path d="(M[^"]+)" fill="url\(#sk/.exec(s)?.[1];
  assert.ok(head(a) && head(a) === head(b), 'same head shape across expressions');
});

test('a hand-drawn character and drawn clothes are never overwritten', () => {
  const drawing = 'data:image/png;base64,DRAWN';
  const out = applyDNA({ ...LOOK, drawing }, buildDNA(measure(faceOf(grace), paint(grace)), 'adult'));
  assert.equal(out.drawing, drawing);
  assert.ok(characterMarkup(out).includes(`href="${drawing}"`), 'still drawn exactly as drawn');
});

test('what a parent chose by hand survives a new photo', () => {
  const mine: Look = { ...LOOK, skin: '#123456', hairStyle: 'afro' };
  const dna = buildDNA(measure(faceOf(grace), paint(grace)), 'adult', parentTraits(mine, ['skin', 'hairStyle']));
  assert.equal(dna.skin?.source, 'parent');
  assert.equal(dna.hairStyle?.source, 'parent');
  const out = applyDNA(mine, dna);
  assert.equal(out.skin, '#123456');
  assert.equal(out.hairStyle, 'afro');
  assert.notEqual(out.hair, mine.hair, 'the rest still comes from the photo');
});

test('skin and hair are read from the right places, and say where they came from', () => {
  const m = measure(faceOf(grace), paint(grace));
  assert.equal(m.skin.status, 'measured');
  const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const near = (h: string, c: number[], tol: number) => hex(h).every((v, i) => Math.abs(v - c[i]) <= tol);
  // the painted cheeks are [222, 176, 146]; skin is read as in daylight, so it may come out a touch lighter, never darker
  const sk = hex(m.skin.value!);
  assert.ok(sk.every((v, i) => v >= [222, 176, 146][i] - 6 && v <= [222, 176, 146][i] + 40), `skin ${m.skin.value}`);
  assert.equal(m.hair.status, 'measured');
  assert.ok(near(m.hair.value!, [60, 38, 22], 6), `hair ${m.hair.value}`);
  assert.equal(m.hairTexture.status === 'missing' || m.hairTexture.status === 'inferred', true, 'curls are only ever a best guess');
  const bald = measure(faceOf(grace), paint(grace, { hair: false }));
  assert.equal(bald.hair.status, 'missing', 'no hair, no hair colour');
  assert.equal(bald.hairLength.value, 'none');
  const dna = buildDNA(bald, 'elder');
  assert.ok(dna.hairStyle && ['sides', 'buzz'].includes(dna.hairStyle.value));
  assert.equal(dna.hairStyle.source, 'inferred');
});

test('the same face in a dim room or lamp light keeps its skin tone (a light-skinned baby must not read as dark)', () => {
  const base = paint(grace);
  const lin = (c: number) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const gam = (c: number) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
  const lit = (k: number[]) => { const d = new Uint8ClampedArray(base.raster.data); for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) d[i + c] = gam(Math.min(1, lin(d[i + c]) * k[c])); return { ...base, raster: { ...base.raster, data: d } }; };
  const tone = (px: ReturnType<typeof paint>) => SKIN_TONES.indexOf(skinToneFor(measure(faceOf(grace), px).skin.value!));
  const daylight = tone(base);
  assert.ok(daylight <= 3, `light skin reads light (tone ${daylight})`);
  for (const [name, k] of [['dim room', [0.35, 0.35, 0.35]], ['lamp light', [1, 0.72, 0.42]], ['dim lamp light', [0.45, 0.32, 0.18]], ['blue shade', [0.8, 0.9, 1.1]]] as const) {
    const t = tone(lit([...k]));
    assert.ok(Math.abs(t - daylight) <= 2 && t <= 4, `${name}: tone ${t} vs ${daylight} in daylight`);
  }
});

test('without a person outline, the reader says background may be mistaken for hair', () => {
  const { raster } = paint(astronaut);
  assert.match(measure(faceOf(astronaut), { raster }).warnings.join(' '), /background/);
});

test('characters without photo proportions keep the designed face', () => {
  const svg = characterMarkup(LOOK);
  assert.ok(!svg.includes('translate(100 112) scale'), 'no nose transform without photo proportions');
  const head = (x: string) => /<path d="(M100 [^"]+)" fill="url\(#sk/.exec(x)?.[1];
  const shaped = characterMarkup({ ...LOOK, shape: { faceWidth: 1 } });
  assert.ok(head(svg) && head(shaped) && head(svg) !== head(shaped), 'photo proportions reshape the head');
});

test('the photo picks baby, kid, grown-up or grandparent, and a parent can override it', () => {
  const at = (age?: number) => measure({ ...faceOf(grace), age }, paint(grace));
  assert.equal(at(1.5).ageGroup.value, 'baby');
  assert.equal(at(8).ageGroup.value, 'kid');
  assert.equal(at(29).ageGroup.value, 'adult', 'the astronaut portrait reads 29');
  assert.equal(at(69).ageGroup.value, 'elder', 'the Grace Hopper portrait reads 69');
  // with no age estimate, the face's own proportions decide: both test portraits are grown-ups
  assert.equal(at(undefined).ageGroup.value, 'adult', 'a grown-up face reads as a grown-up');
  assert.equal(measure({ ...faceOf(astronaut) }, paint(astronaut)).ageGroup.value, 'adult');
  for (const a of [1.5, 8, 29, 69]) assert.equal(at(a).ageGroup.status, 'inferred', 'always a best guess');
  // a grown-up photo on the baby star makes a grown-up, not the person as a baby
  assert.equal(kindFor(at(29), 'baby', false), 'adult');
  assert.equal(kindFor(at(29), 'baby', true), 'baby', 'a parent’s choice wins');
  assert.equal(kindFor(at(undefined), 'baby', false), 'adult', 'an adult photo on the baby card makes a grown-up');
  // a baby's face: the same face with a much shorter nose and lower face (baby proportions)
  const babyish = (k: number) => {
    const f = faceOf(grace), m = f.mesh.map((p) => [...p]);
    const eyeY = (m[33][1] + m[263][1]) / 2;
    for (const p of m) if (p[1] > eyeY) p[1] = eyeY + (p[1] - eyeY) * k;
    return measure({ ...f, mesh: m }, paint(grace));
  };
  assert.equal(babyish(0.62).ageGroup.value, 'baby', 'baby proportions read as a baby');
  assert.equal(kindFor(babyish(0.62), 'adult', false), 'baby');
  assert.equal(kindFor(babyish(0.8), 'baby', false), 'baby', 'an unsure "child" never makes a baby bigger');
  assert.equal(kindFor(at(29), 'dog', false), 'dog', 'pets stay pets');
});

test('the age group shapes the whole character, not just its size', () => {
  const m = measure({ ...faceOf(grace), age: 69 }, paint(grace));
  const grown = applyDNA({ ...LOOK, kind: 'baby' }, buildDNA(m, kindFor(m, 'baby', false)));
  assert.equal(grown.kind, 'elder');
  assert.notEqual(grown.hairStyle, 'tuft');
  const baby = applyDNA(LOOK, buildDNA(m, 'baby'));
  assert.equal(baby.kind, 'baby');
  assert.ok(['tuft', 'curly'].includes(baby.hairStyle), `baby hair: ${baby.hairStyle}`);
  assert.equal(buildDNA(m, 'kid').facial, undefined, 'no facial hair for kids');
});

test('the hairstyle follows what the photo shows: side part, tied up, length and texture', async () => {
  const { pickHairStyle } = await import('../likeness/dna');
  const T = <V,>(value: V) => ({ value, source: 'measured' as const, confidence: 0.7 });
  const pick = (d: Record<string, unknown>, kind: 'adult' | 'kid' = 'adult') => pickHairStyle(kind, d as never)!.value;
  assert.equal(pick({ length: T('long'), texture: T('straight'), part: T(0.8) }), 'sweep');
  assert.equal(pick({ length: T('long'), texture: T('straight'), part: T(0) }), 'long');
  assert.equal(pick({ length: T('medium'), texture: T('wavy') }), 'lob');
  assert.equal(pick({ length: T('short'), texture: T('straight'), up: T(0.6) }), 'bun');
  assert.equal(pick({ length: T('short'), texture: T('straight'), up: T(0.6) }, 'kid'), 'topknot');
  assert.equal(pick({ length: T('short'), texture: T('coily'), up: T(0.6) }), 'puff');
  assert.equal(pick({ length: T('medium'), texture: T('coily') }), 'twists');
  assert.equal(pick({ length: T('short'), texture: T('straight'), volume: T(-0.6) }), 'crew');
  assert.equal(pick({ length: T('short'), texture: T('straight'), part: T(-0.7) }), 'sidepart');
});
