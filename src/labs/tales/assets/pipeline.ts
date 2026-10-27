/**
 * Photo → illustrated asset, entirely on the device.
 *
 * Every function here is pure (pixels in, pixels out) so it runs the same in a
 * browser and in tests. The photo itself is never kept: `buildBase` reduces it
 * to a small palette and a map of simplified regions (a paint-by-numbers
 * version), which is what an asset stores and what every illustration mode
 * redraws from.
 */

export interface Raster { w: number; h: number; data: Uint8ClampedArray }
export interface Rect { x: number; y: number; w: number; h: number }
export type AssetKind = 'place' | 'object';

/** The working size: big enough for a page, small enough to process in a second on a phone. */
export const MAX_SIDE = 640;

export const makeRaster = (w: number, h: number): Raster => ({ w, h, data: new Uint8ClampedArray(w * h * 4) });

export function fitSize(w: number, h: number, max = MAX_SIDE): [number, number] {
  const k = Math.min(1, max / Math.max(w, h));
  return [Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k))];
}

/* ── geometry ────────────────────────────────────────────── */
export function rotate90(src: Raster, dir: 1 | -1): Raster {
  const out = makeRaster(src.h, src.w);
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
    const nx = dir === 1 ? src.h - 1 - y : y;
    const ny = dir === 1 ? x : src.w - 1 - x;
    const i = (y * src.w + x) * 4, j = (ny * out.w + nx) * 4;
    out.data[j] = src.data[i]; out.data[j + 1] = src.data[i + 1]; out.data[j + 2] = src.data[i + 2]; out.data[j + 3] = src.data[i + 3];
  }
  return out;
}

export function cropRaster(src: Raster, r: Rect): Raster {
  const x0 = Math.max(0, Math.round(r.x)), y0 = Math.max(0, Math.round(r.y));
  const w = Math.max(1, Math.min(src.w - x0, Math.round(r.w))), h = Math.max(1, Math.min(src.h - y0, Math.round(r.h)));
  const out = makeRaster(w, h);
  for (let y = 0; y < h; y++) out.data.set(src.data.subarray(((y0 + y) * src.w + x0) * 4, ((y0 + y) * src.w + x0 + w) * 4), y * w * 4);
  return out;
}

/* ── colour ──────────────────────────────────────────────── */
const lin = (c: number) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const gam = (c: number) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
const fi = (t: number) => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787);

export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const R = lin(r), G = lin(g), B = lin(b);
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
export function labToRgb(L: number, a: number, b: number): [number, number, number] {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const X = fi(fx) * 0.95047, Y = fi(fy), Z = fi(fz) * 1.08883;
  const R = X * 3.2406 - Y * 1.5372 - Z * 0.4986, G = -X * 0.9689 + Y * 1.8758 + Z * 0.0415, B = X * 0.0557 - Y * 0.204 + Z * 1.057;
  return [gam(R), gam(G), gam(B)].map((v) => Math.max(0, Math.min(255, v))) as [number, number, number];
}
export const deltaE = (p: number[], q: number[]) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);

/* ── smoothing: Kuwahara with integral images (keeps edges, flattens texture) ── */
export function kuwahara(src: Raster, radius: number): Raster {
  const { w, h, data } = src;
  const W = w + 1;
  const sum = [new Float64Array(W * (h + 1)), new Float64Array(W * (h + 1)), new Float64Array(W * (h + 1))];
  const lum = new Float64Array(W * (h + 1)), lum2 = new Float64Array(W * (h + 1));
  for (let y = 0; y < h; y++) {
    const rs = [0, 0, 0]; let rl = 0, rl2 = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const L = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      rs[0] += data[i]; rs[1] += data[i + 1]; rs[2] += data[i + 2]; rl += L; rl2 += L * L;
      const k = (y + 1) * W + x + 1, u = y * W + x + 1;
      for (let c = 0; c < 3; c++) sum[c][k] = sum[c][u] + rs[c];
      lum[k] = lum[u] + rl; lum2[k] = lum2[u] + rl2;
    }
  }
  const box = (t: Float64Array, x0: number, y0: number, x1: number, y1: number) => t[(y1 + 1) * W + x1 + 1] - t[y0 * W + x1 + 1] - t[(y1 + 1) * W + x0] + t[y0 * W + x0];
  const out = makeRaster(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let best = Infinity, bx0 = x, by0 = y, bx1 = x, by1 = y;
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const x0 = Math.max(0, Math.min(x, x + dx * radius)), x1 = Math.min(w - 1, Math.max(x, x + dx * radius));
      const y0 = Math.max(0, Math.min(y, y + dy * radius)), y1 = Math.min(h - 1, Math.max(y, y + dy * radius));
      const n = (x1 - x0 + 1) * (y1 - y0 + 1);
      const m = box(lum, x0, y0, x1, y1) / n;
      const v = box(lum2, x0, y0, x1, y1) / n - m * m;
      if (v < best) { best = v; bx0 = x0; by0 = y0; bx1 = x1; by1 = y1; }
    }
    const n = (bx1 - bx0 + 1) * (by1 - by0 + 1), o = (y * w + x) * 4;
    for (let c = 0; c < 3; c++) out.data[o + c] = box(sum[c], bx0, by0, bx1, by1) / n;
    out.data[o + 3] = data[o + 3];
  }
  return out;
}

/* ── palette: k-means in Lab ─────────────────────────────── */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function kmeans(src: Raster, k: number, opts: { seed?: number; mask?: Uint8Array; iterations?: number } = {}): { palette: number[][]; labels: Uint8Array } {
  const { w, h, data } = src;
  const n = w * h;
  const rand = seeded(opts.seed ?? 1);
  const lab = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const c = rgbToLab(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]); lab[i * 3] = c[0]; lab[i * 3 + 1] = c[1]; lab[i * 3 + 2] = c[2]; }
  const usable: number[] = [];
  const stride = Math.max(1, Math.floor(n / 20000));
  for (let i = 0; i < n; i += stride) if (!opts.mask || opts.mask[i]) usable.push(i);
  if (!usable.length) usable.push(0);
  // k-means++ start
  const cents: number[][] = [];
  const first = usable[Math.floor(rand() * usable.length)];
  cents.push([lab[first * 3], lab[first * 3 + 1], lab[first * 3 + 2]]);
  const dist = new Float64Array(usable.length).fill(Infinity);
  while (cents.length < k) {
    let total = 0;
    const c = cents[cents.length - 1];
    usable.forEach((p, j) => { const d = (lab[p * 3] - c[0]) ** 2 + (lab[p * 3 + 1] - c[1]) ** 2 + (lab[p * 3 + 2] - c[2]) ** 2; if (d < dist[j]) dist[j] = d; total += dist[j]; });
    if (total === 0) break;
    let r = rand() * total, pick = usable[usable.length - 1];
    for (let j = 0; j < usable.length; j++) { r -= dist[j]; if (r <= 0) { pick = usable[j]; break; } }
    cents.push([lab[pick * 3], lab[pick * 3 + 1], lab[pick * 3 + 2]]);
  }
  const nearest = (p: number) => {
    let bi = 0, bd = Infinity;
    for (let c = 0; c < cents.length; c++) { const d = (lab[p * 3] - cents[c][0]) ** 2 + (lab[p * 3 + 1] - cents[c][1]) ** 2 + (lab[p * 3 + 2] - cents[c][2]) ** 2; if (d < bd) { bd = d; bi = c; } }
    return bi;
  };
  for (let it = 0; it < (opts.iterations ?? 10); it++) {
    const acc = cents.map(() => [0, 0, 0, 0]);
    for (const p of usable) { const c = nearest(p); acc[c][0] += lab[p * 3]; acc[c][1] += lab[p * 3 + 1]; acc[c][2] += lab[p * 3 + 2]; acc[c][3]++; }
    acc.forEach((a, c) => { if (a[3]) cents[c] = [a[0] / a[3], a[1] / a[3], a[2] / a[3]]; });
  }
  const labels = new Uint8Array(n);
  for (let i = 0; i < n; i++) labels[i] = nearest(i);
  return { palette: cents.map((c) => labToRgb(c[0], c[1], c[2]).map(Math.round)), labels };
}

/** Each pixel takes the most common label around it: removes specks and simplifies outlines. */
export function majority(labels: Uint8Array, w: number, h: number, passes = 1, k = 32): Uint8Array {
  let cur = labels;
  const counts = new Uint16Array(k);
  for (let p = 0; p < passes; p++) {
    const next = new Uint8Array(cur.length);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      counts.fill(0);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = Math.min(w - 1, Math.max(0, x + dx)), yy = Math.min(h - 1, Math.max(0, y + dy));
        counts[cur[yy * w + xx]]++;
      }
      let best = cur[y * w + x], bc = counts[best];
      for (let c = 0; c < k; c++) if (counts[c] > bc) { bc = counts[c]; best = c; }
      next[y * w + x] = best;
    }
    cur = next;
  }
  return cur;
}

/* ── object boundary: grow the background in from the edges ── */
export function borderMask(src: Raster, tolerance = 18): Uint8Array {
  const { w, h, data } = src;
  const n = w * h;
  const lab: number[][] = new Array(n);
  for (let i = 0; i < n; i++) lab[i] = rgbToLab(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
  // the background's colours: medians of each image edge
  const med = (idx: number[]) => [0, 1, 2].map((c) => idx.map((i) => lab[i][c]).sort((a, b) => a - b)[idx.length >> 1]);
  const top = [], bottom = [], left = [], right = [];
  for (let x = 0; x < w; x++) { top.push(x); bottom.push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { left.push(y * w); right.push(y * w + w - 1); }
  const bgs = [med(top), med(bottom), med(left), med(right)];
  const nearBg = (i: number) => Math.min(...bgs.map((b) => deltaE(lab[i], b)));
  const bg = new Uint8Array(n);
  const queue: number[] = [];
  for (const i of [...top, ...bottom, ...left, ...right]) if (!bg[i] && nearBg(i) < tolerance * 1.5) { bg[i] = 1; queue.push(i); }
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q], x = i % w, y = (i - x) / w;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const j = yy * w + xx;
      if (bg[j]) continue;
      if (deltaE(lab[i], lab[j]) < tolerance * 0.6 || nearBg(j) < tolerance) { bg[j] = 1; queue.push(j); }
    }
  }
  const mask = new Uint8Array(n);
  for (let i = 0; i < n; i++) mask[i] = bg[i] ? 0 : 1;
  return fillHoles(largestComponent(mask, w, h), w, h);
}

export function largestComponent(mask: Uint8Array, w: number, h: number): Uint8Array {
  const seen = new Int32Array(mask.length).fill(-1);
  let best = -1, bestSize = 0, label = 0;
  for (let s = 0; s < mask.length; s++) {
    if (!mask[s] || seen[s] >= 0) continue;
    const stack = [s]; seen[s] = label; let size = 0;
    while (stack.length) {
      const i = stack.pop()!; size++;
      const x = i % w, y = (i - x) / w;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const j = yy * w + xx;
        if (mask[j] && seen[j] < 0) { seen[j] = label; stack.push(j); }
      }
    }
    if (size > bestSize) { bestSize = size; best = label; }
    label++;
  }
  const out = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) out[i] = seen[i] === best && best >= 0 ? 1 : 0;
  return out;
}

export function fillHoles(mask: Uint8Array, w: number, h: number): Uint8Array {
  const outside = new Uint8Array(mask.length);
  const stack: number[] = [];
  for (let x = 0; x < w; x++) for (const y of [0, h - 1]) { const i = y * w + x; if (!mask[i] && !outside[i]) { outside[i] = 1; stack.push(i); } }
  for (let y = 0; y < h; y++) for (const x of [0, w - 1]) { const i = y * w + x; if (!mask[i] && !outside[i]) { outside[i] = 1; stack.push(i); } }
  while (stack.length) {
    const i = stack.pop()!, x = i % w, y = (i - x) / w;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const j = yy * w + xx;
      if (!mask[j] && !outside[j]) { outside[j] = 1; stack.push(j); }
    }
  }
  const out = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) out[i] = outside[i] ? 0 : 1;
  return out;
}

/** Paint the mask in or out with a round brush (the parent's boundary fixes). */
export function brushMask(mask: Uint8Array, w: number, h: number, cx: number, cy: number, r: number, value: 0 | 1) {
  for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(h - 1, Math.ceil(cy + r)); y++)
    for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(w - 1, Math.ceil(cx + r)); x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) mask[y * w + x] = value;
}

export function maskBox(mask: Uint8Array, w: number, h: number): Rect | null {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask[y * w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

export const maskCoverage = (mask: Uint8Array) => { let n = 0; for (let i = 0; i < mask.length; i++) n += mask[i]; return n / mask.length; };

/* ── hiding faces, people and writing ───────────────────── */
/** Fills each rectangle from its surroundings (repeated averaging), so the hidden thing is gone, not just blurred. */
export function hideRegions(src: Raster, regions: Rect[]): Raster {
  const out: Raster = { w: src.w, h: src.h, data: new Uint8ClampedArray(src.data) };
  const { w, h, data } = out;
  for (const r0 of regions) {
    const x0 = Math.max(0, Math.floor(r0.x)), y0 = Math.max(0, Math.floor(r0.y));
    const x1 = Math.min(w - 1, Math.ceil(r0.x + r0.w)), y1 = Math.min(h - 1, Math.ceil(r0.y + r0.h));
    if (x1 < x0 || y1 < y0) continue;
    // start from the average colour of the rectangle's border
    const ring: number[][] = [];
    for (let x = x0; x <= x1; x++) for (const y of [Math.max(0, y0 - 1), Math.min(h - 1, y1 + 1)]) ring.push([...data.subarray((y * w + x) * 4, (y * w + x) * 4 + 3)]);
    for (let y = y0; y <= y1; y++) for (const x of [Math.max(0, x0 - 1), Math.min(w - 1, x1 + 1)]) ring.push([...data.subarray((y * w + x) * 4, (y * w + x) * 4 + 3)]);
    const avg = [0, 1, 2].map((c) => ring.reduce((s, p) => s + p[c], 0) / ring.length);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) for (let c = 0; c < 3; c++) data[(y * w + x) * 4 + c] = avg[c];
    // let the edges flow inward
    const passes = Math.min(80, Math.max(x1 - x0, y1 - y0));
    for (let p = 0; p < passes; p++) {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const i = (y * w + x) * 4;
        const nb = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].map(([xx, yy]) => (Math.min(w - 1, Math.max(0, yy)) * w + Math.min(w - 1, Math.max(0, xx))) * 4);
        for (let c = 0; c < 3; c++) data[i + c] = (data[nb[0] + c] + data[nb[1] + c] + data[nb[2] + c] + data[nb[3] + c]) / 4;
      }
    }
  }
  return out;
}

/* ── places: where the horizon is, for depth bands ───────── */
export function guessHorizon(src: Raster): number {
  const { w, h, data } = src;
  const rows: number[][] = [];
  for (let y = 0; y < h; y++) {
    let r = 0, g = 0, b = 0;
    for (let x = 0; x < w; x += 2) { const i = (y * w + x) * 4; r += data[i]; g += data[i + 1]; b += data[i + 2]; }
    const n = Math.ceil(w / 2);
    rows.push(rgbToLab(r / n, g / n, b / n));
  }
  const win = Math.max(2, Math.round(h * 0.08));
  let best = Math.round(h * 0.55), bestD = -1;
  for (let y = Math.round(h * 0.2); y < Math.round(h * 0.85); y++) {
    const above = [0, 1, 2].map((c) => rows.slice(Math.max(0, y - win), y).reduce((s, r) => s + r[c], 0) / Math.min(win, y));
    const below = [0, 1, 2].map((c) => rows.slice(y, Math.min(h, y + win)).reduce((s, r) => s + r[c], 0) / Math.min(win, h - y));
    const d = deltaE(above, below);
    if (d > bestD) { bestD = d; best = y; }
  }
  return +(best / h).toFixed(3);
}

/* ── the stored form of an asset ────────────────────────── */
import type { VectorArt } from './vector';

export interface AssetBase {
  kind: AssetKind;
  w: number;
  h: number;
  /** Up to 16 colours, RGB. */
  palette: number[][];
  /** One palette index per pixel. */
  labels: Uint8Array;
  /** Objects: 1 = part of the thing, 0 = background. */
  alpha?: Uint8Array;
  /** Places: horizon height, 0 (top) to 1 (bottom). */
  horizon?: number;
  /**
   * A tiny colour map (24 cells wide) of the smoothed picture, so modes can
   * bring back soft light and gradients inside each region. Far too small to
   * identify anything in the photo.
   */
  field?: { w: number; h: number; rgb: Uint8Array };
  /** The redrawn illustration (outlines and colours only). Assets saved before it existed don't have one. */
  vector?: VectorArt;
  /**
   * Detail lines (1 = a line): the strongest edges of the picture (window frames, railings, roof lines),
   * traced once so the drawing styles keep small structures crisp. Lines only; never the photo.
   */
  lines?: Uint8Array;
  /** How it's drawn (paintRender.ts); assets made before this have none and draw as shapes. */
  drawStyle?: 'shapes' | 'cartoon' | 'painted' | 'blocks' | 'sketch' | 'watercolour';
}

export const FIELD_W = 24;

/** Average colour per cell of a coarse grid. */
export function colourField(src: Raster, cols = FIELD_W, mask?: Uint8Array): { w: number; h: number; rgb: Uint8Array } {
  const fw = Math.max(2, Math.min(cols, src.w)), fh = Math.max(2, Math.round((fw * src.h) / src.w));
  const acc = new Float64Array(fw * fh * 4);
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
    const i = y * src.w + x;
    if (mask && !mask[i]) continue;
    const c = Math.min(fh - 1, Math.floor((y * fh) / src.h)) * fw + Math.min(fw - 1, Math.floor((x * fw) / src.w));
    acc[c * 4] += src.data[i * 4]; acc[c * 4 + 1] += src.data[i * 4 + 1]; acc[c * 4 + 2] += src.data[i * 4 + 2]; acc[c * 4 + 3]++;
  }
  const rgb = new Uint8Array(fw * fh * 3);
  // empty cells (outside a thing) borrow from their nearest filled neighbour
  for (let c = 0; c < fw * fh; c++) {
    let k = c;
    if (!acc[c * 4 + 3]) {
      let bd = Infinity;
      for (let d = 0; d < fw * fh; d++) if (acc[d * 4 + 3]) { const dd = (d % fw - c % fw) ** 2 + (Math.floor(d / fw) - Math.floor(c / fw)) ** 2; if (dd < bd) { bd = dd; k = d; } }
    }
    const n = acc[k * 4 + 3] || 1;
    rgb[c * 3] = acc[k * 4] / n; rgb[c * 3 + 1] = acc[k * 4 + 1] / n; rgb[c * 3 + 2] = acc[k * 4 + 2] / n;
  }
  return { w: fw, h: fh, rgb };
}

/**
 * Reduce a photo to the simplified regions every mode redraws from. After
 * this the photo is not needed and should be released.
 */
/**
 * Thin lines along the picture's strongest edges: lightness gradient (Sobel) on a lightly smoothed
 * picture, thinned to one pixel along the gradient (non-maximum suppression), weak and tiny bits dropped.
 */
export function detailLines(src: Raster, mask?: Uint8Array): Uint8Array {
  const { w, h, data } = src, n = w * h;
  const L = new Float32Array(n);
  for (let i = 0; i < n; i++) L[i] = rgbToLab(data[i * 4], data[i * 4 + 1], data[i * 4 + 2])[0];
  const mag = new Float32Array(n), dir = new Uint8Array(n);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const gx = L[i - w + 1] + 2 * L[i + 1] + L[i + w + 1] - L[i - w - 1] - 2 * L[i - 1] - L[i + w - 1];
    const gy = L[i + w - 1] + 2 * L[i + w] + L[i + w + 1] - L[i - w - 1] - 2 * L[i - w] - L[i - w + 1];
    mag[i] = Math.hypot(gx, gy) / 8;
    const a = ((Math.atan2(gy, gx) * 180) / Math.PI + 180) % 180;
    dir[i] = a < 22.5 || a >= 157.5 ? 0 : a < 67.5 ? 1 : a < 112.5 ? 2 : 3;
  }
  // a threshold from the picture itself: the strongest ~9% of edges, and never faint texture
  const sample: number[] = [];
  for (let i = 0; i < n; i += 7) if (mag[i] > 1) sample.push(mag[i]);
  sample.sort((a, b) => a - b);
  const thr = Math.max(7, sample.length ? sample[Math.floor(sample.length * 0.91)] : 7);
  const out = new Uint8Array(n);
  const off = [[1, 0], [1, 1], [0, 1], [-1, 1]];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x, m = mag[i];
    if (m < thr || (mask && !mask[i])) continue;
    const [dx, dy] = off[dir[i]];
    if (m >= mag[i + dy * w + dx] && m >= mag[i - dy * w - dx]) out[i] = 1;
  }
  // drop specks: keep connected runs of 10+ pixels (leaf texture makes short bits)
  const seen = new Uint8Array(n), stack: number[] = [];
  for (let s0 = 0; s0 < n; s0++) {
    if (!out[s0] || seen[s0]) continue;
    const comp: number[] = []; seen[s0] = 1; stack.push(s0);
    while (stack.length) {
      const p = stack.pop()!; comp.push(p);
      const x = p % w, y = (p / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const q = yy * w + xx; if (out[q] && !seen[q]) { seen[q] = 1; stack.push(q); }
      }
    }
    if (comp.length < 10) for (const p of comp) out[p] = 0;
  }
  return out;
}

export function buildBase(src: Raster, kind: AssetKind, opts: { mask?: Uint8Array; horizon?: number; colours?: number; seed?: number } = {}): AssetBase {
  const smooth = kuwahara(kuwahara(src, 3), 2);
  const k = opts.colours ?? (kind === 'place' ? 16 : 14);
  const { palette, labels } = kmeans(smooth, k, { seed: opts.seed ?? 7, mask: opts.mask });
  const clean = majority(labels, src.w, src.h, kind === 'place' ? 3 : 2, k);
  const base: AssetBase = { kind, w: src.w, h: src.h, palette, labels: clean, field: colourField(smooth, FIELD_W, opts.mask), lines: detailLines(kuwahara(src, 1), opts.mask) };
  if (kind === 'object') base.alpha = opts.mask ? new Uint8Array(opts.mask) : new Uint8Array(src.w * src.h).fill(1);
  else base.horizon = opts.horizon ?? guessHorizon(smooth);
  return base;
}

/* ── object boundary, the robust way: colour models of edge vs middle ── */
function clusterLab(points: number[][], k: number, rand: () => number): number[][] {
  if (points.length <= k) return points.map((p) => p.slice());
  const cents = Array.from({ length: k }, () => points[Math.floor(rand() * points.length)].slice());
  for (let it = 0; it < 8; it++) {
    const acc = cents.map(() => [0, 0, 0, 0]);
    for (const p of points) {
      let bi = 0, bd = Infinity;
      for (let c = 0; c < k; c++) { const d = (p[0] - cents[c][0]) ** 2 + (p[1] - cents[c][1]) ** 2 + (p[2] - cents[c][2]) ** 2; if (d < bd) { bd = d; bi = c; } }
      acc[bi][0] += p[0]; acc[bi][1] += p[1]; acc[bi][2] += p[2]; acc[bi][3]++;
    }
    acc.forEach((a, c) => { if (a[3]) cents[c] = [a[0] / a[3], a[1] / a[3], a[2] / a[3]]; });
  }
  return cents;
}

/**
 * Finds the thing in the middle of the photo: learns the background's colours
 * from the photo's border and the thing's colours from its middle, sorts every
 * pixel, refines twice, then keeps the piece that touches the centre. Works
 * best when the photo is cropped with a little background around the thing.
 */
export function subjectMask(src: Raster, opts: { seed?: number; bias?: number } = {}): Uint8Array {
  const { w, h, data } = src;
  const n = w * h;
  const rand = seeded(opts.seed ?? 5);
  const lab: number[][] = new Array(n);
  for (let i = 0; i < n; i++) lab[i] = rgbToLab(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
  const band = Math.max(2, Math.round(Math.min(w, h) * 0.06));
  const step = Math.max(1, Math.floor(Math.sqrt(n / 6000)));
  const bgPts: number[][] = [], fgPts: number[][] = [];
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
    const i = y * w + x;
    if (x < band || y < band || x >= w - band || y >= h - band) bgPts.push(lab[i]);
    else if (((x - w / 2) / (w * 0.3)) ** 2 + ((y - h / 2) / (h * 0.3)) ** 2 <= 1) fgPts.push(lab[i]);
  }
  let bg = clusterLab(bgPts, 6, rand), fg = clusterLab(fgPts, 6, rand);
  const near = (p: number[], cs: number[][]) => { let d = Infinity; for (const c of cs) d = Math.min(d, (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2); return Math.sqrt(d); };
  const bias = opts.bias ?? 1;
  let mask: Uint8Array = new Uint8Array(n);
  for (let round = 0; round < 3; round++) {
    for (let i = 0; i < n; i++) mask[i] = near(lab[i], fg) * bias < near(lab[i], bg) ? 1 : 0;
    mask = majority(mask, w, h, 2, 2);
    if (round < 2) {
      // refine both colour models from the current split (GrabCut-style)
      const f2: number[][] = [], b2: number[][] = [];
      for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) (mask[y * w + x] ? f2 : b2).push(lab[y * w + x]);
      if (f2.length > 20 && b2.length > 20) { fg = clusterLab(f2, 6, rand); bg = clusterLab(b2, 6, rand); }
    }
  }
  // keep the piece that holds the centre (or the biggest one)
  const centre = Math.round(h / 2) * w + Math.round(w / 2);
  let keep = largestComponent(mask, w, h);
  if (mask[centre] && !keep[centre]) {
    const seen = new Uint8Array(n), stack = [centre]; seen[centre] = 1;
    while (stack.length) { const i = stack.pop()!, x = i % w, y = (i - x) / w; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const j = yy * w + xx; if (mask[j] && !seen[j]) { seen[j] = 1; stack.push(j); } } }
    keep = seen;
  }
  // round off ragged edges
  return fillHoles(majority(fillHoles(keep, w, h), w, h, 3, 2), w, h);
}
