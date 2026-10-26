import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeRaster, subjectMask, type Raster } from '../assets/pipeline';
import { cutOut } from '../assets/cutout';

/*
 * The cut-out must keep the whole thing: a teddy whose muzzle matches the wall,
 * with dark paws, a red bow and round ears, used to lose parts.
 */

type Shape = { e: [number, number, number, number]; c: number[]; part?: boolean };
function teddy(w = 240, h = 180, cx = 120, cy = 86, s = 0.6, opts: { floor?: boolean } = {}) {
  const r = makeRaster(w, h), truth = new Uint8Array(w * h);
  const br = [150, 102, 62], wall = [231, 216, 192], paw = [80, 55, 35];
  const shapes: Shape[] = [
    { e: [cx - 56 * s, cy - 92 * s, 30 * s, 30 * s], c: br, part: true }, { e: [cx + 26 * s, cy - 92 * s, 30 * s, 30 * s], c: br, part: true }, // ears
    { e: [cx - 46 * s, cy - 80 * s, 92 * s, 86 * s], c: br, part: true }, // head
    { e: [cx - 52 * s, cy - 6 * s, 104 * s, 86 * s], c: br, part: true }, // body
    { e: [cx - 78 * s, cy + 4 * s, 34 * s, 36 * s], c: paw, part: true }, { e: [cx + 44 * s, cy + 4 * s, 34 * s, 36 * s], c: paw, part: true },
    { e: [cx - 50 * s, cy + 60 * s, 36 * s, 30 * s], c: paw, part: true }, { e: [cx + 14 * s, cy + 60 * s, 36 * s, 30 * s], c: paw, part: true },
    { e: [cx - 20 * s, cy - 34 * s, 40 * s, 28 * s], c: wall }, // muzzle, the wall's colour
    { e: [cx - 22 * s, cy + 2 * s, 44 * s, 20 * s], c: [200, 40, 50] }, // bow
  ];
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 10;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let c = opts.floor && y > h * 0.72 ? [168, 128, 88] : wall;
    for (const sh of shapes) {
      const [x0, y0, ew, eh] = sh.e;
      if (((x - x0 - ew / 2) / (ew / 2)) ** 2 + ((y - y0 - eh / 2) / (eh / 2)) ** 2 <= 1) { c = sh.c; truth[y * w + x] = 1; }
    }
    const i = (y * w + x) * 4;
    r.data[i] = c[0] + rnd(); r.data[i + 1] = c[1] + rnd(); r.data[i + 2] = c[2] + rnd(); r.data[i + 3] = 255;
  }
  return { r, truth };
}
const score = (m: Uint8Array, t: Uint8Array) => {
  let i = 0, u = 0, miss = 0, g = 0;
  for (let k = 0; k < m.length; k++) { if (m[k] && t[k]) i++; if (m[k] || t[k]) u++; if (t[k]) { g++; if (!m[k]) miss++; } }
  return { iou: i / u, missed: miss / g };
};

test('a teddy comes out whole: ears, dark paws, light muzzle and bow', () => {
  for (const [cx, cy, s] of [[120, 86, 0.6], [80, 76, 0.5], [120, 92, 0.85]] as const) {
    const { r, truth } = teddy(240, 180, cx, cy, s);
    const got = score(cutOut(r), truth);
    assert.ok(got.missed < 0.02, `missed ${(got.missed * 100).toFixed(1)}% at ${cx},${cy}`);
    assert.ok(got.iou > 0.95, `overlap ${got.iou.toFixed(3)}`);
  }
});

test('better than the old cut-out on the same teddies', () => {
  const { r, truth } = teddy(240, 180, 80, 76, 0.5);
  assert.ok(score(cutOut(r), truth).iou > score(subjectMask(r), truth).iou);
});

test('a teddy sitting on the floor keeps most of itself', () => {
  const { r, truth } = teddy(240, 180, 125, 125, 0.68, { floor: true });
  const got = score(cutOut(r), truth);
  assert.ok(got.iou > 0.7, `overlap ${got.iou.toFixed(3)}`);
});

test('the same photo always gives the same cut, and "keep more" keeps at least as much', () => {
  const { r } = teddy();
  assert.deepEqual(cutOut(r), cutOut(r));
  const count = (m: Uint8Array) => m.reduce((s, v) => s + v, 0);
  assert.ok(count(cutOut(r, { keep: 1 })) >= count(cutOut(r, { keep: -1 })));
});
