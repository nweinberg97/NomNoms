/**
 * Ways to draw a place (or thing) made from a photo, crisp at full size, from
 * the asset's simplified colours (its palette and per-pixel labels, never the
 * photo). Each style is a different illustration technique, not a blur filter:
 *
 *   cartoon    a clean flat illustration: bright simplified colours, smooth
 *              edges, a fine dark outline where colours meet
 *   painted    a painted film backdrop: the same shapes with soft light and
 *              colour moving inside them, brush grain, a warm glow, no outlines
 *   blocks     a block world: the picture built from little shaded cubes
 *   sketch     ink and wash: pale washes of colour under hand-drawn ink lines
 *   shapes     the paper-shape vector redraw (vectorRender.ts)
 *
 * Everything is computed from numbers (no AI, nothing leaves the device), is
 * the same every time for the same asset, and is drawn at twice the asset's
 * size so edges stay sharp on phones.
 */
import { STYLES, type StyleMode } from '../styles';
import { labToRgb, makeRaster, rgbToLab, type AssetBase, type Raster } from './pipeline';

export type DrawStyle = 'shapes' | 'cartoon' | 'film' | 'clay' | 'painted' | 'blocks' | 'sketch';
export const DRAW_STYLES: DrawStyle[] = ['film', 'clay', 'cartoon', 'painted', 'blocks', 'sketch', 'shapes'];
export const DRAW_STYLE_NAMES: Record<DrawStyle, string> = {
  film: 'Storybook film',
  clay: 'Clay',
  cartoon: 'Cartoon',
  painted: 'Soft paint',
  blocks: 'Block world',
  sketch: 'Ink & wash',
  shapes: 'Paper shapes',
};
/** Older saved assets may name a style that was replaced; map it to the nearest one. */
export const drawStyleOf = (s: string | undefined): DrawStyle =>
  s === 'cartoon' || s === 'film' || s === 'clay' || s === 'painted' || s === 'blocks' || s === 'sketch' || s === 'shapes' ? s : s === 'watercolour' ? 'painted' : 'shapes';

type RGB = [number, number, number];

/** Small regions (specks, leaf noise) join the neighbour they share the most edge with. */
function cleanLabels(labels: Uint8Array, w: number, h: number, minArea: number, alpha?: Uint8Array): Uint8Array {
  const out = new Uint8Array(labels);
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  const nb = (p: number) => { const x = p % w, y = (p / w) | 0; return [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]; };
  for (let s = 0; s < w * h; s++) {
    if (seen[s] || (alpha && !alpha[s])) continue;
    const lab = out[s], pix: number[] = [];
    seen[s] = 1; stack.push(s);
    while (stack.length) {
      const p = stack.pop()!; pix.push(p);
      for (const q of nb(p)) if (q >= 0 && !seen[q] && out[q] === lab && (!alpha || alpha[q])) { seen[q] = 1; stack.push(q); }
    }
    if (pix.length >= minArea) continue;
    const votes = new Map<number, number>();
    for (const p of pix) for (const q of nb(p)) if (q >= 0 && out[q] !== lab && (!alpha || alpha[q])) votes.set(out[q], (votes.get(out[q]) ?? 0) + 1);
    let best = -1, bc = 0;
    for (const [k, c] of votes) if (c > bc) { bc = c; best = k; }
    if (best >= 0) for (const p of pix) out[p] = best;
  }
  return out;
}

/** Labels at S× the size with smooth (not stair-stepped) edges: each new pixel takes the label with most weight among its four neighbours. */
function upLabels(labels: Uint8Array, w: number, h: number, S: number): Uint8Array {
  const W = w * S, H = h * S, out = new Uint8Array(W * H);
  const wt = new Float32Array(256);
  for (let Y = 0; Y < H; Y++) {
    const fy = (Y + 0.5) / S - 0.5, y0 = Math.max(0, Math.floor(fy)), y1 = Math.min(h - 1, y0 + 1), ty = Math.min(1, Math.max(0, fy - y0));
    for (let X = 0; X < W; X++) {
      const fx = (X + 0.5) / S - 0.5, x0 = Math.max(0, Math.floor(fx)), x1 = Math.min(w - 1, x0 + 1), tx = Math.min(1, Math.max(0, fx - x0));
      const a = labels[y0 * w + x0], b = labels[y0 * w + x1], c = labels[y1 * w + x0], d = labels[y1 * w + x1];
      wt[a] = 0; wt[b] = 0; wt[c] = 0; wt[d] = 0;
      wt[a] += (1 - tx) * (1 - ty); wt[b] += tx * (1 - ty); wt[c] += (1 - tx) * ty; wt[d] += tx * ty;
      let best = a; for (const k of [b, c, d]) if (wt[k] > wt[best]) best = k;
      out[Y * W + X] = best;
    }
  }
  return out;
}

/** Brighter, cleaner illustration colours: more chroma, a touch more contrast, warmer in warm looks. */
function illustrate(c: number[], mode: StyleMode, chroma = 1.28): RGB {
  const [L, a, b] = rgbToLab(c[0], c[1], c[2]);
  const warm = STYLES[mode].colour.warmth * 30;
  const L2 = Math.max(4, Math.min(97, 50 + (L - 50) * 1.08 + 3));
  // photo foliage reads olive; illustrated foliage is a fresher green (yellow-greens turn toward green)
  let A = a, Bv = b;
  const hue = (Math.atan2(b, a) * 180) / Math.PI;
  if (hue > 95 && hue < 135 && Math.hypot(a, b) > 12) { const r = Math.hypot(a, b), t = ((Math.min(135, hue + 14)) * Math.PI) / 180; A = r * Math.cos(t); Bv = r * Math.sin(t); }
  return labToRgb(L2, A * chroma + warm * 0.2, Bv * chroma + warm * 0.5).map(Math.round) as RGB;
}
const shadeRgb = (c: RGB, dL: number): RGB => { const [L, a, b] = rgbToLab(c[0], c[1], c[2]); return labToRgb(Math.max(0, Math.min(100, L + dL)), a, b).map(Math.round) as RGB; };
const dE = (p: number[], q: number[]) => { const A = rgbToLab(p[0], p[1], p[2]), B = rgbToLab(q[0], q[1], q[2]); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
const lumOf = (c: number[]) => rgbToLab(c[0], c[1], c[2])[0];
/** A cheap repeatable noise in [0, 1). */
const hash = (x: number, y: number) => { let v = (x * 374761393 + y * 668265263) | 0; v = Math.imul(v ^ (v >>> 13), 1274126177); return ((v ^ (v >>> 16)) >>> 0) / 4294967296; };

/** Bilinear sample of the asset's tiny colour map (soft light and colour moving inside shapes). */
function fieldAt(base: AssetBase, u: number, v: number): RGB | null {
  const F = base.field;
  if (!F) return null;
  const fx = u * F.w - 0.5, fy = v * F.h - 0.5;
  const x0 = Math.max(0, Math.min(F.w - 1, Math.floor(fx))), y0 = Math.max(0, Math.min(F.h - 1, Math.floor(fy)));
  const x1 = Math.min(F.w - 1, x0 + 1), y1 = Math.min(F.h - 1, y0 + 1);
  const tx = Math.min(1, Math.max(0, fx - x0)), ty = Math.min(1, Math.max(0, fy - y0));
  const at = (x: number, y: number, c: number) => F.rgb[(y * F.w + x) * 3 + c];
  return [0, 1, 2].map((c) => at(x0, y0, c) * (1 - tx) * (1 - ty) + at(x1, y0, c) * tx * (1 - ty) + at(x0, y1, c) * (1 - tx) * ty + at(x1, y1, c) * tx * ty) as RGB;
}

/**
 * How far each pixel is from the edge of its own shape (in pixels, capped): a height map that
 * turns every flat shape into a rounded volume, so it can be lit like a sculpted or painted form.
 */
function shapeDepth(L: Uint8Array, W: number, H: number, cap: number): Float32Array {
  const d = new Float32Array(W * H).fill(cap);
  for (let i = 0; i < W * H; i++) {
    const x = i % W, y = (i / W) | 0, k = L[i];
    if ((x > 0 && L[i - 1] !== k) || (x < W - 1 && L[i + 1] !== k) || (y > 0 && L[i - W] !== k) || (y < H - 1 && L[i + W] !== k)) d[i] = 0;
  }
  // two-pass chamfer distance (within each shape)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (x > 0 && L[i - 1] === L[i]) d[i] = Math.min(d[i], d[i - 1] + 1); if (y > 0 && L[i - W] === L[i]) d[i] = Math.min(d[i], d[i - W] + 1); if (x > 0 && y > 0 && L[i - W - 1] === L[i]) d[i] = Math.min(d[i], d[i - W - 1] + 1.414); if (x < W - 1 && y > 0 && L[i - W + 1] === L[i]) d[i] = Math.min(d[i], d[i - W + 1] + 1.414); }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (x < W - 1 && L[i + 1] === L[i]) d[i] = Math.min(d[i], d[i + 1] + 1); if (y < H - 1 && L[i + W] === L[i]) d[i] = Math.min(d[i], d[i + W] + 1); if (x < W - 1 && y < H - 1 && L[i + W + 1] === L[i]) d[i] = Math.min(d[i], d[i + W + 1] + 1.414); if (x > 0 && y < H - 1 && L[i + W - 1] === L[i]) d[i] = Math.min(d[i], d[i + W - 1] + 1.414); }
  return d;
}

/** The finished picture for a style (other than 'shapes'), at twice the asset's size. */
export function stylizeBase(base: AssetBase, style: Exclude<DrawStyle, 'shapes'>, mode: StyleMode): Raster {
  const sculpt = style === 'clay' || style === 'film';
  const { w, h } = base, S = 2, W = w * S, H = h * S;
  const alpha = base.alpha;
  const out = makeRaster(W, H);
  const put = (i: number, c: number[], a = 255) => { out.data[i * 4] = c[0]; out.data[i * 4 + 1] = c[1]; out.data[i * 4 + 2] = c[2]; out.data[i * 4 + 3] = a; };

  if (style === 'blocks') {
    // a block world: about 46 blocks across the long side, each one colour, bevelled and lightly textured
    const b1 = Math.max(4, Math.round(Math.max(w, h) / 46)), B = b1 * S;
    const pal = base.palette.map((c) => illustrate(c, mode, 1.22));
    const counts = new Uint16Array(256);
    for (let by = 0; by * b1 < h; by++) for (let bx = 0; bx * b1 < w; bx++) {
      counts.fill(0); let any = 0, tot = 0;
      for (let y = by * b1; y < Math.min(h, (by + 1) * b1); y++) for (let x = bx * b1; x < Math.min(w, (bx + 1) * b1); x++) {
        const i = y * w + x; tot++; if (alpha && !alpha[i]) continue; counts[base.labels[i]]++; any++;
      }
      const filled = any > tot * 0.45;
      let best = 0; for (let k = 1; k < 256; k++) if (counts[k] > counts[best]) best = k;
      const c = pal[best] ?? ([200, 200, 200] as RGB);
      const light = shadeRgb(c, 9), dark = shadeRgb(c, -12), edge = shadeRgb(c, -24), speckA = shadeRgb(c, 5), speckB = shadeRgb(c, -6);
      const bev = Math.max(2, Math.round(B / 8));
      for (let Y = by * B; Y < Math.min(H, (by + 1) * B); Y++) for (let X = bx * B; X < Math.min(W, (bx + 1) * B); X++) {
        const i = Y * W + X;
        if (!filled) { put(i, [0, 0, 0], 0); continue; }
        const lx = X - bx * B, ly = Y - by * B;
        let col: RGB = lx < bev || ly < bev ? light : lx >= B - bev || ly >= B - bev ? dark : c;
        if (lx === 0 || ly === 0) col = edge;
        // a little pixel texture on each face, like the blocks in a building game
        if (col === c) { const t = hash((X / 3) | 0, (Y / 3) | 0); if (t > 0.8) col = t > 0.9 ? speckA : speckB; }
        put(i, col);
      }
    }
    return out;
  }

  const clean = cleanLabels(base.labels, w, h, Math.max(16, Math.round(w * h * (style === 'clay' ? 0.0025 : style === 'sketch' || style === 'film' ? 0.0012 : 0.0007))), alpha);
  const L2 = upLabels(clean, w, h, S);
  const A2 = alpha ? upLabels(alpha, w, h, S) : null;
  // a rounded volume for every shape (clay is puffier than film)
  const cap = Math.round(Math.max(W, H) * (style === 'clay' ? 0.03 : 0.022));
  const depth = sculpt ? shapeDepth(L2, W, H, cap) : null;
  const profile = (i: number) => { const t = Math.min(1, depth![i] / cap); return Math.sqrt(t * (2 - t)); }; // a round profile
  // the distance map is faceted (it makes ridges like a pyramid); blurred, it's a smooth rounded surface
  let hm: Float32Array | null = null;
  if (depth) {
    hm = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) hm[i] = profile(i);
    const r = Math.max(2, Math.round(cap * 0.35)), tmp = new Float32Array(W * H);
    const pre = new Float64Array(Math.max(W, H) + 1);
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < H; y++) {
        const row = y * W; pre[0] = 0; for (let x = 0; x < W; x++) pre[x + 1] = pre[x] + hm[row + x];
        for (let x = 0; x < W; x++) { const a0 = Math.max(0, x - r), a1 = Math.min(W, x + r + 1); tmp[row + x] = (pre[a1] - pre[a0]) / (a1 - a0); }
      }
      for (let x = 0; x < W; x++) {
        pre[0] = 0; for (let y = 0; y < H; y++) pre[y + 1] = pre[y] + tmp[y * W + x];
        for (let y = 0; y < H; y++) { const a0 = Math.max(0, y - r), a1 = Math.min(H, y + r + 1); hm[y * W + x] = (pre[a1] - pre[a0]) / (a1 - a0); }
      }
    }
  }
  const heightAt = (i: number) => hm![i];
  const pal = base.palette.map((c) => illustrate(c, mode, style === 'sketch' ? 0.9 : style === 'painted' ? 1.15 : style === 'clay' ? 1.35 : style === 'film' ? 1.2 : 1.3));
  // ink only between colours that really differ; the ink is a deep version of the darker side
  const inks = new Map<number, RGB | null>();
  const inkOf = (a: number, b: number): RGB | null => {
    const key = a * 256 + b;
    if (inks.has(key)) return inks.get(key)!;
    const pa = pal[a], pb = pal[b];
    let ink: RGB | null = null;
    if (pa && pb && dE(pa, pb) >= (style === 'sketch' ? 10 : 15)) ink = style === 'sketch' ? [58, 46, 40] : shadeRgb(lumOf(pa) < lumOf(pb) ? pa : pb, -30);
    inks.set(key, ink);
    return ink;
  };
  // the soft colour map in illustration colours, worked out once (sampled per pixel below)
  const litField: AssetBase = { ...base, field: base.field && { ...base.field, rgb: (() => { const F = base.field!, o = new Uint8Array(F.rgb.length); for (let j = 0; j < F.w * F.h; j++) { const c = illustrate([F.rgb[j * 3], F.rgb[j * 3 + 1], F.rgb[j * 3 + 2]], mode, 1.12); o[j * 3] = c[0]; o[j * 3 + 1] = c[1]; o[j * 3 + 2] = c[2]; } return o; })() } };
  const glow = STYLES[mode].palette.light;
  const gl = [1, 3, 5].map((o) => parseInt(glow.slice(o, o + 2), 16));
  // the sky: colours that fill much of the top edge and are pale or blue are drawn as an illustrated sky
  const sky = new Uint8Array(256);
  let skyLow = 0;
  if (!alpha) {
    const topCount = new Uint32Array(256), count = new Uint32Array(256), high = new Uint32Array(256), sumY = new Float64Array(256);
    for (let x = 0; x < w; x++) topCount[clean[x]]++;
    for (let i = 0; i < w * h; i++) { const y = (i / w) | 0, k = clean[i]; count[k]++; sumY[k] += y; if (y < h * 0.45) high[k]++; }
    base.palette.forEach((c, k) => {
      const [L, a, b] = rgbToLab(c[0], c[1], c[2]);
      // a sky spans the top edge, lives in the upper part of the picture, and is pale or blue (a white wall indoors is not)
      const upper = count[k] > 0 && high[k] / count[k] > 0.85 && sumY[k] / count[k] < h * 0.3;
      if (topCount[k] > w * 0.18 && upper && L > 55 && (b < -6 || (Math.hypot(a, b) < 8 && topCount[k] > w * 0.4))) sky[k] = 1;
    });
    if (sky.some((v) => v)) { let low = 0; for (let i = 0; i < w * h; i++) if (sky[clean[i]]) low = Math.max(low, (i / w) | 0); skyLow = low / h; }
  }
  const skyTop = illustrate([96, 158, 222], mode, 1), skyBot = illustrate([214, 234, 246], mode, 1);
  const skyAt = (v: number) => { const t = Math.min(1, v / Math.max(0.2, skyLow)); return skyTop.map((c, j) => c + (skyBot[j] - c) * t); };
  // a few soft, round illustrated clouds in the sky band
  const clouds: [number, number, number][] = [];
  if (skyLow > 0.08) for (let j = 0; j < 3; j++) { const r = 0.05 + hash(j, 7) * 0.03; clouds.push([0.15 + j * 0.33 + (hash(j, 3) - 0.5) * 0.12, Math.min(skyLow * 0.55, 0.05 + hash(j, 5) * skyLow * 0.4), r]); }
  const inCloud = (u: number, v: number) => { for (const [cx, cy, r] of clouds) { const d = Math.min(Math.hypot((u - cx) / r, (v - cy) / (r * 0.62)), Math.hypot((u - cx - r * 0.9) / (r * 0.75), (v - cy - r * 0.12) / (r * 0.5)), Math.hypot((u - cx + r * 0.9) / (r * 0.7), (v - cy - r * 0.15) / (r * 0.45))); if (d < 1) return d; } return -1; };
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
    const i = Y * W + X;
    if (A2 && !A2[i]) { put(i, [0, 0, 0], 0); continue; }
    const k = L2[i];
    let c: number[] = pal[k] ?? [200, 200, 200];
    if (sky[k]) {
      const u = X / W, v = Y / H, cl = inCloud(u, v * (H / W));
      c = skyAt(v);
      if (cl >= 0) c = style === 'cartoon' && cl > 0.9 ? shadeRgb([250, 250, 252], -22) : [253, 253, 255];
      if (cl >= 0 && sculpt) c = [253, 252, 250].map((v, j) => v * (0.8 + 0.2 * Math.sqrt(1 - cl * cl)) + (j === 2 ? 6 : 0) * cl);
      if (style === 'sketch') c = c.map((x) => x * 0.45 + 251 * 0.55);
      put(i, c);
      continue;
    }
    if (sculpt) {
      // light from the top left on each rounded shape: the slope of the height map is the surface normal
      const x = i % W, y = (i / W) | 0;
      const hx = (x < W - 1 && L2[i + 1] === k ? heightAt(i + 1) : heightAt(i)) - (x > 0 && L2[i - 1] === k ? heightAt(i - 1) : heightAt(i));
      const hy = (y < H - 1 && L2[i + W] === k ? heightAt(i + W) : heightAt(i)) - (y > 0 && L2[i - W] === k ? heightAt(i - W) : heightAt(i));
      const sc = cap / 3, nx = -hx * sc, ny = -hy * sc, nz = 1, nl = Math.hypot(nx, ny, nz);
      const lx = -0.5, ly = -0.62, lz = 0.6, ll = Math.hypot(lx, ly, lz);
      const lam = Math.max(0, (nx * lx + ny * ly + nz * lz) / (nl * ll));
      const ht = profile(i);
      if (style === 'clay') {
        // matte clay: strong soft shading, a gentle sheen near the top, dark creases where pieces press together
        const shade = 0.58 + 0.55 * lam;
        c = c.map((v) => v * shade);
        const spec = Math.pow(Math.max(0, (nx * 0.2 + ny * -0.3 + nz * 1) / nl), 24) * 0.18 * ht;
        c = c.map((v) => v + (255 - v) * spec);
        if (ht < 0.18) c = c.map((v) => v * (0.62 + ht * 2));
        // fingerprints and tool marks in the clay
        const t = hash((x / 3) | 0, (y / 3) | 0) - 0.5, t2 = hash((x / 9) | 0, (y / 7) | 0) - 0.5;
        c = c.map((v) => v * (1 + t * 0.05 + t2 * 0.06));
      } else {
        // storybook film: painted light (two soft tones, not a gradient), a warm glow, a cool shadow and a rim of light
        const lit = 0.5 + 0.5 * Math.tanh((lam - 0.62) * 6);
        const shadow = c.map((v, j) => v * 0.72 + [70, 80, 140][j] * 0.08);
        c = c.map((v, j) => shadow[j] + (Math.min(255, v * 1.06) - shadow[j]) * lit);
        if (ht < 0.12 && lam > 0.7) c = c.map((v, j) => v + (gl[j] - v) * 0.45);
        const fi = fieldAt(litField, X / W, Y / H);
        if (fi) c = c.map((v, j) => v * 0.8 + fi[j] * 0.2);
        const g = Math.max(0, 1 - Math.hypot(X / W - 0.2, Y / H - 0.05) / 0.95) * 0.25;
        c = c.map((v, j) => v + (gl[j] - v) * g);
        const t = hash((x / 4) | 0, (y / 2) | 0) - 0.5;
        c = c.map((v) => v * (1 + t * 0.035));
      }
    } else if (style === 'painted') {
      // colour and light moving inside each shape, from the picture's own soft colour map
      const fi = fieldAt(litField, X / W, Y / H);
      if (fi) c = c.map((v, j) => v * 0.62 + fi[j] * 0.38);
      // a warm glow from the top left, and brush grain along the strokes
      const g = Math.max(0, 1 - Math.hypot(X / W - 0.18, Y / H - 0.1) / 0.9) * 0.22;
      c = c.map((v, j) => v + (gl[j] - v) * g);
      const t = hash((X / 5) | 0, (Y / 2) | 0) - 0.5, t2 = hash(X, Y) - 0.5;
      c = c.map((v) => v * (1 + t * 0.07 + t2 * 0.03));
    } else if (style === 'sketch') {
      const t = hash(X, Y) - 0.5;
      c = c.map((v) => v * 0.5 + 251 * 0.5 + t * 6);
    } else {
      c = c.map((v) => v * (1.03 - 0.06 * (Y / H)));
    }
    if (style !== 'painted' && style !== 'clay') {
      const r = X < W - 1 ? L2[i + 1] : k, d = Y < H - 1 ? L2[i + W] : k, l = X > 0 ? L2[i - 1] : k, u = Y > 0 ? L2[i - W] : k;
      const other = r !== k ? r : d !== k ? d : l !== k ? l : u !== k ? u : -1;
      if (other >= 0) {
        const ink = inkOf(k, other);
        // the sketch line breaks now and then, like a hand-drawn one
        if (ink && (style !== 'sketch' || hash((X / 5) | 0, (Y / 5) | 0) > 0.1)) c = style === 'sketch' ? ink : c.map((v, j) => v * (style === 'film' ? 0.55 : 0.15) + ink[j] * (style === 'film' ? 0.45 : 0.85));
      }
    }
    put(i, c);
  }
  return out;
}
