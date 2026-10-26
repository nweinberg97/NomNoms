import { STYLES, hexToRgb, type StyleMode } from '../styles';
import { deltaE, labToRgb, majority, makeRaster, rgbToLab, type AssetBase, type Raster } from './pipeline';

/**
 * Redraws a stored asset (palette + regions) in an illustration mode. Pure:
 * the same asset and mode always give the same picture, so a story can switch
 * modes and every photo place and thing follows.
 *
 * - Pocketlight 3D: soft forms, light from the top left, gentle glow and vignette
 * - Storybook Gouache: wobbly painted shapes, darker wet edges, brush and paper grain
 * - Wondercut: few colours, crisp cut shapes, smaller pieces casting paper shadows
 * - Classic Ink: flat cel colour with ink lines where colours meet
 */

/* deterministic noise, so textures never shimmer between renders */
const hash = (x: number, y: number, s: number) => {
  let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const smoothNoise = (x: number, y: number, scale: number, s: number) => {
  const gx = x / scale, gy = y / scale, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0, s), b = hash(x0 + 1, y0, s), c = hash(x0, y0 + 1, s), d = hash(x0 + 1, y0 + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};

/** The mode's take on the asset's colours: saturation, brightness, warmth and a pull toward its swatches. */
export function modePalette(palette: number[][], mode: StyleMode): number[][] {
  const s = STYLES[mode];
  const swatches = s.palette.swatches.map((h) => rgbToLab(...hexToRgb(h)));
  return palette.map((c) => {
    let [L, a, b] = rgbToLab(c[0], c[1], c[2]);
    a *= s.colour.saturation; b *= s.colour.saturation;
    L = Math.min(100, L * s.colour.brightness);
    b += s.colour.warmth * 20; a += s.colour.warmth * 6;
    const near = swatches.reduce((best, w) => (deltaE([L, a, b], w) < deltaE([L, a, b], best) ? w : best), swatches[0]);
    const k = s.colour.pull;
    // pull hue toward the swatch, keep most of the lightness so shapes stay readable
    a += (near[1] - a) * k; b += (near[2] - b) * k; L += (near[0] - L) * k * 0.35;
    return labToRgb(L, a, b).map(Math.round);
  });
}

/** Merge the closest colours until only `n` remain (Wondercut's few sheets of paper). */
export function reducePalette(palette: number[][], labels: Uint8Array, n: number): { palette: number[][]; labels: Uint8Array } {
  const counts = new Array(palette.length).fill(0);
  for (let i = 0; i < labels.length; i++) counts[labels[i]]++;
  const groups = palette.map((c, i) => ({ lab: rgbToLab(c[0], c[1], c[2]), n: counts[i], members: [i] })).filter((g) => g.n > 0);
  while (groups.length > n) {
    let bi = 0, bj = 1, bd = Infinity;
    for (let i = 0; i < groups.length; i++) for (let j = i + 1; j < groups.length; j++) { const d = deltaE(groups[i].lab, groups[j].lab); if (d < bd) { bd = d; bi = i; bj = j; } }
    const A = groups[bi], B = groups[bj], t = A.n + B.n;
    A.lab = A.lab.map((v, k) => (v * A.n + B.lab[k] * B.n) / t) as [number, number, number];
    A.n = t; A.members.push(...B.members);
    groups.splice(bj, 1);
  }
  const map = new Uint8Array(256);
  groups.forEach((g, gi) => g.members.forEach((m) => (map[m] = gi)));
  const out = new Uint8Array(labels.length);
  for (let i = 0; i < labels.length; i++) out[i] = map[labels[i]];
  return { palette: groups.map((g) => labToRgb(...g.lab).map(Math.round)), labels: out };
}

export function renderBase(base: AssetBase, mode: StyleMode): Raster {
  const s = STYLES[mode];
  const { w, h } = base;
  let labels = base.labels, palette = base.palette;
  if (palette.length > s.asset.colours) ({ palette, labels } = reducePalette(palette, labels, s.asset.colours));
  if (s.asset.simplify > 1) labels = majority(labels, w, h, s.asset.simplify - 1, palette.length);
  const cols = modePalette(palette, mode);
  const out = makeRaster(w, h);
  const at = (x: number, y: number) => labels[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  const area = new Array(cols.length).fill(0);
  for (let i = 0; i < labels.length; i++) area[labels[i]]++;
  const ink = hexToRgb(s.palette.ink), shadow = hexToRgb(s.palette.shadow), light = hexToRgb(s.palette.light);
  // soft light and gradients from the tiny colour map, in the mode's colours (Wondercut stays flat paper)
  const blend = { pocketlight: 0.55, gouache: 0.42, inked: 0.28, wondercut: 0 }[mode];
  const F = base.field;
  const fcols = F && blend ? modePalette(Array.from({ length: F.w * F.h }, (_, i) => [F.rgb[i * 3], F.rgb[i * 3 + 1], F.rgb[i * 3 + 2]]), mode) : null;
  const fieldAt = (x: number, y: number): number[] => {
    const gx = Math.min(F!.w - 1.001, Math.max(0, ((x + 0.5) * F!.w) / w - 0.5)), gy = Math.min(F!.h - 1.001, Math.max(0, ((y + 0.5) * F!.h) / h - 0.5));
    const x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
    const a = fcols![y0 * F!.w + x0], b = fcols![y0 * F!.w + x0 + 1], c = fcols![(y0 + 1) * F!.w + x0], d = fcols![(y0 + 1) * F!.w + x0 + 1];
    return [0, 1, 2].map((k) => a[k] * (1 - fx) * (1 - fy) + b[k] * fx * (1 - fy) + c[k] * (1 - fx) * fy + d[k] * fx * fy);
  };

  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, o = i * 4;
    let lab = labels[i];
    let c: number[];
    if (mode === 'gouache') {
      // painted shapes wobble: read the region a little off the true position
      const dx = Math.round((smoothNoise(x, y, 14, 3) - 0.5) * 4), dy = Math.round((smoothNoise(x, y, 14, 9) - 0.5) * 4);
      lab = at(x + dx, y + dy);
      c = cols[lab].slice();
      // wet edge: paint pools darker where a region ends
      let edge = 0;
      for (let r = 1; r <= 3 && !edge; r++) if (at(x + dx + r, y + dy) !== lab || at(x + dx - r, y + dy) !== lab || at(x + dx, y + dy + r) !== lab || at(x + dx, y + dy - r) !== lab) edge = (4 - r) / 3;
      const brush = (smoothNoise(x + y * 0.6, y - x * 0.25, 5, 4) - 0.5) * 0.12 * s.texture.intensity * 2;
      const grain = (hash(x, y, 2) - 0.5) * 0.06;
      const k = 1 - edge * 0.16 + brush + grain;
      c = c.map((v) => v * k);
    } else if (mode === 'wondercut') {
      c = cols[lab].slice();
      // a smaller neighbouring piece up and to the left sits on top and casts a shadow here
      const q = at(x - 3, y - 4);
      if (q !== lab && area[q] < area[lab]) c = c.map((v, k) => v * 0.74 + shadow[k] * 0.26 * 0.3);
      const fibre = (smoothNoise(x * 3, y * 0.6, 3, 5) - 0.5) * 0.08 * s.texture.intensity * 2 + (hash(x, y, 6) - 0.5) * 0.04;
      c = c.map((v) => v * (1 + fibre));
    } else if (mode === 'inked') {
      c = cols[lab].slice();
      // ink where two clearly different colours meet
      const r = at(x + 1, y), d = at(x, y + 1), l = at(x - 1, y), u = at(x, y - 1);
      for (const nb of [r, d, l, u]) {
        if (nb !== lab && deltaE(rgbToLab(cols[nb][0], cols[nb][1], cols[nb][2]), rgbToLab(c[0], c[1], c[2])) > 12) {
          const darker = (cols[nb][0] + cols[nb][1] + cols[nb][2]) < (c[0] + c[1] + c[2]) ? cols[nb] : c;
          c = darker.map((v, k) => v * 0.35 + ink[k] * 0.55);
          break;
        }
      }
    } else {
      c = cols[lab].slice();
    }
    if (fcols) { const g = fieldAt(x, y); c = c.map((v, k) => v * (1 - blend) + g[k] * blend); }
    out.data[o] = c[0]; out.data[o + 1] = c[1]; out.data[o + 2] = c[2];
    out.data[o + 3] = base.alpha ? (base.alpha[i] ? 255 : 0) : 255;
  }

  if (mode === 'pocketlight') softLight(out, light, s.lighting.vignette, base.kind === 'place');
  if (base.alpha) featherAlpha(out, base.alpha, mode === 'wondercut' ? 0 : 1);
  return out;
}

/** Pocketlight: soften, then light the forms from the top left with a warm glow. */
function softLight(r: Raster, light: number[], vignette: number, place: boolean) {
  const { w, h, data } = r;
  const blurred = boxBlur(r, place ? 1 : 2);
  const lum = new Float32Array(w * h);
  const big = boxBlur(r, 7);
  for (let i = 0; i < w * h; i++) lum[i] = (big.data[i * 4] * 0.3 + big.data[i * 4 + 1] * 0.59 + big.data[i * 4 + 2] * 0.11) / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, o = i * 4;
    const gx = lum[Math.min(w * h - 1, i + 1)] - lum[Math.max(0, i - 1)];
    const gy = lum[Math.min(w * h - 1, i + w)] - lum[Math.max(0, i - w)];
    const relief = 1 + (-gx - gy) * 1.6; // brighter on slopes facing the top-left light
    const glow = place ? Math.max(0, 1 - Math.hypot(x / w - 0.2, y / h - 0.1) / 0.9) * 0.12 : 0.05;
    const vig = place ? 1 - vignette * Math.max(0, Math.hypot(x / w - 0.5, y / h - 0.45) - 0.35) * 1.6 : 1;
    for (let c = 0; c < 3; c++) {
      const v = blurred.data[o + c] * relief * vig;
      data[o + c] = v + (light[c] - v) * glow;
    }
  }
}

function boxBlur(r: Raster, rad: number): Raster {
  const { w, h } = r;
  const tmp = new Float32Array(w * h * 3), out = makeRaster(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) {
    let s = 0, n = 0;
    for (let k = -rad; k <= rad; k++) { const xx = Math.min(w - 1, Math.max(0, x + k)); s += r.data[(y * w + xx) * 4 + c]; n++; }
    tmp[(y * w + x) * 3 + c] = s / n;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    for (let c = 0; c < 3; c++) {
      let s = 0, n = 0;
      for (let k = -rad; k <= rad; k++) { const yy = Math.min(h - 1, Math.max(0, y + k)); s += tmp[(yy * w + x) * 3 + c]; n++; }
      out.data[(y * w + x) * 4 + c] = s / n;
    }
    out.data[(y * w + x) * 4 + 3] = r.data[(y * w + x) * 4 + 3];
  }
  return out;
}

/** Soft one-pixel edge on cut-out objects (Wondercut keeps its crisp scissor edge). */
function featherAlpha(r: Raster, alpha: Uint8Array, rad: number) {
  if (!rad) return;
  const { w, h, data } = r;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!alpha[i]) continue;
    let edge = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h || !alpha[yy * w + xx]) edge = true; }
    if (edge) data[i * 4 + 3] = 150;
  }
}
