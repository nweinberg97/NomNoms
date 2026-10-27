import assert from 'node:assert/strict';
import { test } from 'node:test';
import { STYLE_MODES } from '../styles';
import { makeMeta, trimObject } from '../assets/meta';
import { buildBase, colourField, guessHorizon, hideRegions, kmeans, kuwahara, makeRaster, maskCoverage, rotate90, subjectMask, type Raster } from '../assets/pipeline';
import { reducePalette, renderBase } from '../assets/render';

/** A picture made of filled rectangles, with a little noise like a real photo. */
function picture(w: number, h: number, fill: (x: number, y: number) => number[], noise = 6): Raster {
  const r = makeRaster(w, h);
  let seed = 1;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * noise;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = fill(x, y), i = (y * w + x) * 4;
    r.data[i] = c[0] + rnd(); r.data[i + 1] = c[1] + rnd(); r.data[i + 2] = c[2] + rnd(); r.data[i + 3] = 255;
  }
  return r;
}
const teddy = () => picture(120, 90, (x, y) => ((x - 60) ** 2 / 26 ** 2 + (y - 45) ** 2 / 30 ** 2 <= 1 ? [150, 100, 60] : [230, 230, 236]));
const garden = () => picture(120, 90, (_, y) => (y < 40 ? [120, 170, 230] : [80, 150, 70]));

test('smoothing keeps size and leaves flat areas flat', () => {
  const flat = picture(40, 30, () => [100, 120, 140], 0);
  const out = kuwahara(flat, 3);
  assert.equal(out.w, 40); assert.equal(out.h, 30);
  assert.deepEqual([...out.data.subarray(0, 3)], [100, 120, 140]);
});

test('the palette finds the real colours', () => {
  const { palette, labels } = kmeans(garden(), 2);
  assert.equal(palette.length, 2);
  assert.notEqual(labels[0], labels[labels.length - 1]);
  const blue = palette[labels[0]], green = palette[labels[labels.length - 1]];
  assert.ok(blue[2] > blue[1] && green[1] > green[2]);
});

test('the thing in the middle is found, the background is not', () => {
  const r = teddy();
  const m = subjectMask(r);
  const cover = maskCoverage(m);
  const expected = (Math.PI * 26 * 30) / (120 * 90);
  assert.ok(Math.abs(cover - expected) < 0.05, `coverage ${cover.toFixed(3)} vs ${expected.toFixed(3)}`);
  assert.equal(m[45 * 120 + 60], 1, 'centre kept');
  assert.equal(m[0], 0, 'corner cut away');
});

test('hidden areas are filled from their surroundings, not blurred', () => {
  const r = picture(60, 60, (x, y) => (x > 20 && x < 40 && y > 20 && y < 40 ? [230, 20, 20] : [40, 120, 200]), 0);
  const out = hideRegions(r, [{ x: 18, y: 18, w: 25, h: 25 }]);
  for (let y = 21; y < 40; y++) for (let x = 21; x < 40; x++) {
    const i = (y * 60 + x) * 4;
    assert.ok(out.data[i] < 80, 'no red left');
  }
  assert.equal(r.data[(30 * 60 + 30) * 4], 230, 'the input is not changed');
});

test('the horizon is found where the sky meets the ground', () => {
  assert.ok(Math.abs(guessHorizon(garden()) - 40 / 90) < 0.06);
});

test('turning a photo swaps its sides and turns back', () => {
  const r = teddy();
  const t = rotate90(r, 1);
  assert.equal(t.w, r.h); assert.equal(t.h, r.w);
  assert.deepEqual([...rotate90(t, -1).data], [...r.data]);
});

test('a stored asset holds regions and a tiny colour map, never the photo', () => {
  const r = garden();
  const base = buildBase(r, 'place');
  assert.deepEqual(Object.keys(base).sort(), ['field', 'h', 'horizon', 'kind', 'labels', 'lines', 'palette', 'w']);
  // detail lines are a one-bit line map: only 0 or 1, and only a small share of the picture
  assert.ok(base.lines!.every((v) => v === 0 || v === 1));
  assert.ok(base.lines!.reduce((a, v) => a + v, 0) < base.lines!.length * 0.15, 'lines, not a picture');
  assert.ok(base.palette.length <= 16);
  assert.equal(base.labels.length, r.w * r.h);
  assert.ok(base.field!.w <= 24, 'colour map is at most 24 cells wide');
  assert.ok(!('data' in base));
});

test('every mode redraws an asset, differently, keeping a thing cut out', () => {
  const r = teddy();
  const base = trimObject(buildBase(r, 'object', { mask: subjectMask(r) }));
  const outs = STYLE_MODES.map((m) => renderBase(base, m));
  outs.forEach((o) => { assert.equal(o.w, base.w); assert.equal(o.h, base.h); assert.equal(o.data[3], 0, 'corner stays transparent'); });
  for (let i = 0; i < outs.length; i++) for (let j = i + 1; j < outs.length; j++) assert.notDeepEqual(outs[i].data, outs[j].data, `${STYLE_MODES[i]} vs ${STYLE_MODES[j]}`);
});

test('Wondercut uses only a few sheets of colour', () => {
  const base = buildBase(garden(), 'place', { colours: 12 });
  const reduced = reducePalette(base.palette, base.labels, 6);
  assert.ok(reduced.palette.length <= 6);
  assert.ok(Math.max(...reduced.labels) < 6);
});

test('the colour map averages cells and fills empty ones', () => {
  const f = colourField(garden(), 6);
  assert.equal(f.w, 6);
  assert.ok(f.rgb[2] > f.rgb[1], 'top cell is sky blue');
});

test('metadata records mode, handling, size, anchor and placement', () => {
  const r = teddy();
  const base = trimObject(buildBase(r, 'object', { mask: subjectMask(r) }));
  const meta = makeMeta(base, { id: 'a1', name: ' Teddy ', styleMode: 'gouache', hidden: 1, autoFound: 0, boundary: 'automatic+edited', heightRatio: 0.3, now: new Date('2026-10-25T00:00:00Z') });
  assert.equal(meta.name, 'Teddy');
  assert.equal(meta.styleMode, 'gouache');
  assert.deepEqual(meta.source, { photoKept: false, locationDataRemoved: true, hidden: 1, detection: 'manual', boundary: 'automatic+edited', processedOn: 'device' });
  assert.ok(meta.anchor.y > 0.9 && meta.anchor.x > 0.4 && meta.anchor.x < 0.6, 'anchored at the bottom centre');
  assert.equal(meta.placement.layer, 'ground');
  assert.equal(meta.placement.heightRatio, 0.3);
  const place = makeMeta(buildBase(garden(), 'place'), { id: 'p', name: '', styleMode: 'inked', hidden: 0, autoFound: 0, boundary: 'not-applicable' });
  assert.equal(place.name, 'Our place');
  assert.equal(place.placement.layer, 'background');
  assert.equal(place.placement.depthBands!.length, 3);
});
