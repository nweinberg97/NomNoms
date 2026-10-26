import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeRaster, type Raster } from '../assets/pipeline';
import { characterMarkup, type Look } from '../character';
import { applyDNA, buildDNA, parentTraits, parseDNA, serializeDNA } from '../likeness/dna';
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
  assert.ok(near(m.skin.value!, [222, 176, 146], 6), `skin ${m.skin.value}`);
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

test('without a person outline, the reader says background may be mistaken for hair', () => {
  const { raster } = paint(astronaut);
  assert.match(measure(faceOf(astronaut), { raster }).warnings.join(' '), /background/);
});

test('characters without photo proportions draw exactly as before', () => {
  const svg = characterMarkup(LOOK);
  assert.match(svg, /<ellipse cx="100" cy="94" rx="57" ry="60"/);
  assert.ok(!svg.includes('translate(100 112) scale'), 'no nose transform');
  const shaped = characterMarkup({ ...LOOK, shape: { eyeGap: 1 } });
  assert.match(shaped, /<path d="M43 9\d/, 'shaped heads are a path');
});
