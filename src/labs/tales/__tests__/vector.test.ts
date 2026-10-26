import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeRaster, type Raster } from '../assets/pipeline';
import { vectorize, vectorizeAsset } from '../assets/vector';
import { vectorSvg } from '../assets/vectorRender';
import { STYLE_MODES } from '../styles';

/*
 * Automated checks of photo → place/thing redrawing. They check behaviour
 * (stable, sharp, honest about sky), not beauty; that is reviewed by eye in
 * the before/after gallery.
 */

function picture(w: number, h: number, fill: (x: number, y: number) => number[], noise = 8, seed = 1): Raster {
  const r = makeRaster(w, h);
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647 - 0.5) * noise;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = fill(x, y), i = (y * w + x) * 4;
    r.data[i] = c[0] + rnd(); r.data[i + 1] = c[1] + rnd(); r.data[i + 2] = c[2] + rnd(); r.data[i + 3] = 255;
  }
  return r;
}
/** Blue sky, a red house with a dark door, green grass. */
const house = () => picture(160, 110, (x, y) => {
  if (x > 60 && x < 100 && y > 70 && y < 100) return [60, 40, 30];
  if (x > 40 && x < 120 && y > 40 && y < 100) return [190, 60, 50];
  if (y < 60) return [120, 175, 230];
  return [90, 150, 70];
});
/** Indoors: a white door at the top left, brown walls, grey floor. */
const room = () => picture(160, 110, (x, y) => {
  if (x < 30 && y < 60) return [235, 232, 228];
  if (y > 80) return [130, 128, 125];
  return [140, 95, 60];
});

test('redrawing is deterministic', () => {
  const a = vectorize(house()), b = vectorize(house());
  assert.deepEqual(a, b);
  for (const m of STYLE_MODES) assert.equal(vectorSvg(a, m), vectorSvg(b, m));
});

test('the drawing is clean shapes, not a picture: no pixels, no blur, no warping', () => {
  const art = vectorize(house());
  assert.ok(art.shapes.length >= 3 && art.shapes.length <= 40, `${art.shapes.length} shapes`);
  for (const m of STYLE_MODES) {
    const svg = vectorSvg(art, m);
    assert.ok(!/<image|base64/.test(svg), `${m}: no embedded image`);
    assert.ok(!/feGaussianBlur|feDisplacementMap/.test(svg), `${m}: no blur or warp`);
    assert.ok(!/NaN|undefined/.test(svg), `${m}: no broken numbers`);
  }
  const json = JSON.stringify(art);
  assert.ok(!('data' in art) && json.length < 60000, 'only outlines and colours are kept');
});

test('the house keeps its parts: sky, walls, door, grass', () => {
  const art = vectorize(house());
  const near = (c: number[], t: number[], tol: number) => c.every((v, i) => Math.abs(v - t[i]) < tol);
  const avg = (s: { top: number[]; bottom: number[] }) => s.top.map((v, i) => (v + s.bottom[i]) / 2);
  assert.ok(art.shapes.some((s) => !s.sky && near(avg(s), [190, 60, 50], 30)), 'red wall');
  assert.ok(art.shapes.some((s) => !s.sky && near(avg(s), [60, 40, 30], 30)), 'door');
  assert.ok(art.shapes.some((s) => !s.sky && near(avg(s), [90, 150, 70], 30)), 'grass');
  assert.ok(art.sky, 'the blue sky is found');
  assert.ok(Math.abs(art.skyLine! - 60 / 110) < 0.15, `sky line ${art.skyLine}`);
});

test('a white door indoors is not mistaken for sky', () => {
  assert.equal(vectorize(room()).sky, undefined);
  assert.ok(!vectorSvg(vectorize(room()), 'pocketlight').includes('animateTransform'), 'no clouds indoors');
});

test('every look draws differently', () => {
  const art = vectorize(house());
  const svgs = STYLE_MODES.map((m) => vectorSvg(art, m));
  assert.equal(new Set(svgs).size, 4);
  assert.match(svgs[STYLE_MODES.indexOf('inked')], /stroke-opacity="\.75"/, 'ink outlines');
  assert.match(svgs[STYLE_MODES.indexOf('wondercut')], /feDropShadow/, 'paper shadow');
  assert.match(svgs[STYLE_MODES.indexOf('gouache')], /feTurbulence/, 'paper and paint');
});

test('a thing is cropped to its outline and drawn on nothing', () => {
  const src = picture(120, 90, (x, y) => ((x - 60) ** 2 / 26 ** 2 + (y - 45) ** 2 / 30 ** 2 <= 1 ? [150, 100, 60] : [230, 230, 236]));
  const mask = new Uint8Array(120 * 90);
  for (let y = 0; y < 90; y++) for (let x = 0; x < 120; x++) mask[y * 120 + x] = (x - 60) ** 2 / 26 ** 2 + (y - 45) ** 2 / 30 ** 2 <= 1 ? 1 : 0;
  const art = vectorizeAsset(src, 'object', mask);
  assert.equal(art.w, 52 + 1 + 8, 'mask width + 4 px each side, as trimObject');
  assert.equal(art.sky, undefined);
  const svg = vectorSvg(art, 'pocketlight', { transparent: true });
  assert.ok(!/<rect width/.test(svg.split('</defs>')[1] ?? ''), 'no background behind a thing');
});
