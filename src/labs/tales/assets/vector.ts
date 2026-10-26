import { cropRaster, deltaE, kuwahara, labToRgb, maskBox, rgbToLab, type Raster } from './pipeline';

/**
 * Photo → illustration, by redrawing instead of filtering.
 *
 *   1. smooth away texture (edge-preserving), keep edges
 *   2. superpixels (SLIC): small patches that follow real edges
 *   3. merge neighbouring patches that look alike into real shapes
 *      (sky, a roof, a wall, a window, a tree), and fold specks into neighbours
 *   4. find the sky, so it can be redrawn as an illustrated sky
 *   5. trace every shape into a smooth vector outline
 *
 * The result is a list of shapes with a colour (and a top-to-bottom shade),
 * drawn as SVG, so it is sharp at any size. Nothing photographic is kept:
 * no pixels, only outlines and flat colours.
 *
 * Pure and deterministic: the same picture gives the same shapes.
 */

export interface VShape {
  /** SVG path data in the working picture's pixels (fill-rule evenodd). */
  d: string;
  /** Colour at the top and bottom of the shape. */
  top: [number, number, number];
  bottom: [number, number, number];
  /** Fraction of the picture. */
  area: number;
  /** Centre height, 0 (top) … 1 (bottom). */
  y: number;
  /** Part of the sky. */
  sky?: boolean;
}
export interface VectorArt {
  w: number;
  h: number;
  shapes: VShape[];
  /** The photo's sky colour (Lab), so the drawn sky keeps its mood; absent when there's no sky. */
  sky?: number[];
  /** Where the sky ends, 0 … 1 from the top. */
  skyLine?: number;
}

type Lab = [number, number, number];

/* ── 2. superpixels ──────────────────────────────────────────── */
function slic(lab: Float32Array, w: number, h: number, count: number, compact: number, valid?: Uint8Array): Int32Array {
  const n = w * h;
  const S = Math.max(4, Math.round(Math.sqrt(n / count)));
  const cs: number[][] = []; // l, a, b, x, y
  for (let y = Math.floor(S / 2); y < h; y += S) for (let x = Math.floor(S / 2); x < w; x += S) {
    // nudge to the lowest-gradient spot nearby, so centres don't sit on edges
    let bx = x, by = y, best = Infinity;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = Math.min(w - 2, Math.max(1, x + dx)), yy = Math.min(h - 2, Math.max(1, y + dy));
      const i = yy * w + xx;
      const g = Math.abs(lab[(i + 1) * 3] - lab[(i - 1) * 3]) + Math.abs(lab[(i + w) * 3] - lab[(i - w) * 3]);
      if (g < best) { best = g; bx = xx; by = yy; }
    }
    if (valid && !valid[by * w + bx]) continue;
    const i = by * w + bx;
    cs.push([lab[i * 3], lab[i * 3 + 1], lab[i * 3 + 2], bx, by]);
  }
  const label = new Int32Array(n).fill(-1);
  const dist = new Float32Array(n);
  const m2 = (compact / S) ** 2;
  for (let iter = 0; iter < 8; iter++) {
    dist.fill(Infinity);
    cs.forEach((c, k) => {
      const x0 = Math.max(0, Math.floor(c[3] - S * 2)), x1 = Math.min(w - 1, Math.ceil(c[3] + S * 2));
      const y0 = Math.max(0, Math.floor(c[4] - S * 2)), y1 = Math.min(h - 1, Math.ceil(c[4] + S * 2));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const i = y * w + x;
        if (valid && !valid[i]) continue;
        const dl = lab[i * 3] - c[0], da = lab[i * 3 + 1] - c[1], db = lab[i * 3 + 2] - c[2];
        const dx = x - c[3], dy = y - c[4];
        const d = dl * dl + da * da + db * db + (dx * dx + dy * dy) * m2;
        if (d < dist[i]) { dist[i] = d; label[i] = k; }
      }
    });
    const sum = cs.map(() => [0, 0, 0, 0, 0, 0]);
    for (let i = 0; i < n; i++) {
      const k = label[i]; if (k < 0) continue;
      const s = sum[k];
      s[0] += lab[i * 3]; s[1] += lab[i * 3 + 1]; s[2] += lab[i * 3 + 2]; s[3] += i % w; s[4] += (i / w) | 0; s[5]++;
    }
    cs.forEach((c, k) => { const s = sum[k]; if (s[5]) for (let j = 0; j < 5; j++) c[j] = s[j] / s[5]; });
  }
  // valid pixels a centre never reached join their left/upper neighbour
  for (let i = 0; i < n; i++) if (label[i] < 0 && (!valid || valid[i])) label[i] = i > 0 && label[i - 1] >= 0 ? label[i - 1] : i >= w ? label[i - w] : 0;
  return connected(label, w, h);
}

/** Give every connected piece its own label (−1 stays −1). */
function connected(label: Int32Array, w: number, h: number): Int32Array {
  const out = new Int32Array(label.length).fill(-1);
  let next = 0;
  const stack: number[] = [];
  for (let s = 0; s < label.length; s++) {
    if (out[s] >= 0 || label[s] < 0) continue;
    const want = label[s];
    out[s] = next; stack.push(s);
    while (stack.length) {
      const i = stack.pop()!, x = i % w, y = (i / w) | 0;
      const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
      for (const j of nb) if (j >= 0 && out[j] < 0 && label[j] === want) { out[j] = next; stack.push(j); }
    }
    next++;
  }
  return out;
}

/* ── 3. merge lookalike neighbours into shapes ───────────────── */
interface Region { n: number; l: number; a: number; b: number; l2: number; g: number; top: number; alive: boolean; x0: number; y0: number; x1: number; y1: number }
function regionsOf(label: Int32Array, lab: Float32Array, w: number, grad: Float32Array): Region[] {
  const R: Region[] = [];
  for (let i = 0; i < label.length; i++) {
    const k = label[i]; if (k < 0) continue;
    const r = (R[k] ??= { n: 0, l: 0, a: 0, b: 0, l2: 0, g: 0, top: 0, alive: true, x0: 1e9, y0: 1e9, x1: -1, y1: -1 });
    const x = i % w, y = (i / w) | 0;
    r.n++; r.g += grad[i]; r.l += lab[i * 3]; r.a += lab[i * 3 + 1]; r.b += lab[i * 3 + 2]; r.l2 += lab[i * 3] ** 2;
    if (y === 0) r.top++;
    if (x < r.x0) r.x0 = x; if (x > r.x1) r.x1 = x; if (y < r.y0) r.y0 = y; if (y > r.y1) r.y1 = y;
  }
  return R;
}
const meanOf = (r: Region): Lab => [r.l / r.n, r.a / r.n, r.b / r.n];

function merge(label: Int32Array, lab: Float32Array, grad: Float32Array, w: number, h: number, opts: { threshold: number; minArea: number }) {
  const R = regionsOf(label, lab, w, grad);
  const parent = R.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  // neighbours, with how strong the edge between them is (photo edges keep shapes apart)
  const edges = new Map<number, { a: number; b: number; len: number; grad: number }>();
  const key = (a: number, b: number) => (a < b ? a * 1e6 + b : b * 1e6 + a);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, a = label[i]; if (a < 0) continue;
    for (const j of [x < w - 1 ? i + 1 : -1, y < h - 1 ? i + w : -1]) {
      if (j < 0) continue;
      const b = label[j]; if (b < 0 || b === a) continue;
      const k = key(a, b);
      const e = edges.get(k) ?? { a: Math.min(a, b), b: Math.max(a, b), len: 0, grad: 0 };
      e.len++; e.grad += Math.max(grad[i], grad[j]);
      edges.set(k, e);
    }
  }
  const adj: Map<number, { len: number; grad: number }>[] = R.map(() => new Map());
  for (const e of edges.values()) { adj[e.a].set(e.b, { len: e.len, grad: e.grad }); adj[e.b].set(e.a, { len: e.len, grad: e.grad }); }
  const join = (a: number, b: number) => {
    // b into a
    const ra = R[a], rb = R[b];
    ra.n += rb.n; ra.g += rb.g; ra.l += rb.l; ra.a += rb.a; ra.b += rb.b; ra.l2 += rb.l2; ra.top += rb.top;
    ra.x0 = Math.min(ra.x0, rb.x0); ra.y0 = Math.min(ra.y0, rb.y0); ra.x1 = Math.max(ra.x1, rb.x1); ra.y1 = Math.max(ra.y1, rb.y1);
    rb.alive = false; parent[b] = a;
    for (const [c, e] of adj[b]) {
      if (c === a) continue;
      const cur = adj[a].get(c);
      const v = cur ? { len: cur.len + e.len, grad: cur.grad + e.grad } : { ...e };
      adj[a].set(c, v); adj[c].set(a, v); adj[c].delete(b);
    }
    adj[a].delete(b); adj[b].clear();
  };
  // Busy textures (gravel, leaves, grass) are simplified harder: an illustrator paints
  // them as one area, not as hundreds of specks. An edge only counts if it's stronger
  // than the texture on either side of it.
  const cost = (a: number, b: number) => {
    const e = adj[a].get(b)!;
    const tex = (R[a].g / R[a].n + R[b].g / R[b].n) / 2;
    const edge = Math.max(0, e.grad / e.len - tex);
    // texture can soften a colour difference by at most ~2×, so windows and doors on a busy wall survive
    const d = deltaE(meanOf(R[a]), meanOf(R[b]));
    return d / (1 + Math.min(tex, 5) / 4.5) + 0.5 * edge;
  };
  // greedy: always merge the most alike pair, until nothing is alike enough
  for (;;) {
    let best = Infinity, ba = -1, bb = -1;
    for (let a = 0; a < R.length; a++) {
      if (!R[a]?.alive) continue;
      for (const b of adj[a].keys()) if (b > a) { const c = cost(a, b); if (c < best) { best = c; ba = a; bb = b; } }
    }
    if (best > opts.threshold || ba < 0) break;
    if (R[ba].n >= R[bb].n) join(ba, bb); else join(bb, ba);
  }
  // specks: fold anything too small into its most alike neighbour
  for (let pass = 0; pass < 3; pass++) {
    const small = R.map((r, i) => (r?.alive && r.n < opts.minArea ? i : -1)).filter((i) => i >= 0).sort((x, y) => R[x].n - R[y].n);
    if (!small.length) break;
    for (const s of small) {
      if (!R[s].alive || R[s].n >= opts.minArea) continue;
      let best = Infinity, to = -1;
      for (const b of adj[s].keys()) { const c = deltaE(meanOf(R[s]), meanOf(R[b])); if (c < best) { best = c; to = b; } }
      if (to >= 0) join(to, s);
    }
  }
  const out = new Int32Array(label.length);
  for (let i = 0; i < label.length; i++) out[i] = label[i] < 0 ? -1 : find(label[i]);
  return { label: out, regions: R, adj };
}

/* ── 5. outlines ─────────────────────────────────────────────── */
/** Every closed outline of a region, as pixel-corner loops (holes included). */
function loopsOf(label: Int32Array, w: number, h: number, k: number, box: { x0: number; y0: number; x1: number; y1: number }): number[][][] {
  const W1 = w + 1;
  const out = new Map<number, number[]>(); // from corner → to corners
  const inR = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && label[y * w + x] === k;
  const add = (x0: number, y0: number, x1: number, y1: number) => { const f = y0 * W1 + x0; const list = out.get(f); if (list) list.push(y1 * W1 + x1); else out.set(f, [y1 * W1 + x1]); };
  for (let y = box.y0; y <= box.y1; y++) for (let x = box.x0; x <= box.x1; x++) {
    if (!inR(x, y)) continue;
    if (!inR(x, y - 1)) add(x, y, x + 1, y);
    if (!inR(x + 1, y)) add(x + 1, y, x + 1, y + 1);
    if (!inR(x, y + 1)) add(x + 1, y + 1, x, y + 1);
    if (!inR(x - 1, y)) add(x, y + 1, x, y);
  }
  const loops: number[][][] = [];
  for (const start of [...out.keys()].sort((a, b) => a - b)) {
    while (out.get(start)?.length) {
      const pts: number[][] = [];
      let cur = start;
      for (let guard = 0; guard < 1e6; guard++) {
        pts.push([cur % W1, Math.floor(cur / W1)]);
        const list = out.get(cur);
        if (!list || !list.length) break;
        const nxt = list.shift()!;
        cur = nxt;
        if (cur === start) break;
      }
      if (pts.length >= 4) loops.push(pts);
    }
  }
  return loops;
}

function simplify(pts: number[][], eps: number): number[][] {
  if (pts.length < 4) return pts;
  // closed loop: split at the point farthest from the first, simplify both halves
  let far = 0, fd = -1;
  for (let i = 1; i < pts.length; i++) { const d = (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2; if (d > fd) { fd = d; far = i; } }
  const dp = (p: number[][]): number[][] => {
    if (p.length < 3) return p;
    const [ax, ay] = p[0], [bx, by] = p[p.length - 1];
    const L = Math.hypot(bx - ax, by - ay) || 1;
    let md = -1, mi = 0;
    for (let i = 1; i < p.length - 1; i++) { const d = Math.abs((bx - ax) * (ay - p[i][1]) - (ax - p[i][0]) * (by - ay)) / L; if (d > md) { md = d; mi = i; } }
    if (md <= eps) return [p[0], p[p.length - 1]];
    const l = dp(p.slice(0, mi + 1)), r = dp(p.slice(mi));
    return [...l.slice(0, -1), ...r];
  };
  const a = dp(pts.slice(0, far + 1)), b = dp([...pts.slice(far), pts[0]]);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

/**
 * A closed outline through a polygon: gentle bends become smooth curves, sharp
 * corners (roof peaks, window corners) stay sharp, and long runs stay straight.
 */
function smoothPath(p: number[][]): string {
  const f = (v: number) => (Math.round(v * 10) / 10).toString();
  if (p.length < 3) return '';
  const n = p.length;
  const mid = (a: number[], b: number[]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const sharp = p.map((c, i) => {
    const a = p[(i - 1 + n) % n], b = p[(i + 1) % n];
    const v1 = [c[0] - a[0], c[1] - a[1]], v2 = [b[0] - c[0], b[1] - c[1]];
    const cos = (v1[0] * v2[0] + v1[1] * v2[1]) / ((Math.hypot(...v1) * Math.hypot(...v2)) || 1);
    return cos < 0.45; // turns of more than ~63°
  });
  const m0 = mid(p[n - 1], p[0]);
  let d = `M${f(m0[0])} ${f(m0[1])}`;
  for (let i = 0; i < n; i++) {
    const c = p[i], m = mid(c, p[(i + 1) % n]);
    d += sharp[i] ? `L${f(c[0])} ${f(c[1])}L${f(m[0])} ${f(m[1])}` : `Q${f(c[0])} ${f(c[1])} ${f(m[0])} ${f(m[1])}`;
  }
  return d + 'Z';
}

/* ── the whole thing ─────────────────────────────────────────── */
export interface VectorOptions {
  /** Object pictures: 1 = part of the thing. Places: omit. */
  mask?: Uint8Array;
  /** How many shapes to aim for: 'simple' | 'normal' | 'detailed'. */
  detail?: 'simple' | 'normal' | 'detailed';
  /** Development only: sees the regions along the top edge. */
  debug?: (info: unknown) => void;
}

export function vectorize(src: Raster, opts: VectorOptions = {}): VectorArt {
  const { w, h } = src, n = w * h;
  const smooth = kuwahara(kuwahara(src, 3), 2);
  const lab = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = rgbToLab(smooth.data[i * 4], smooth.data[i * 4 + 1], smooth.data[i * 4 + 2]); lab[i * 3] = v[0]; lab[i * 3 + 1] = v[1]; lab[i * 3 + 2] = v[2]; }
  // edge strength of the original, so real outlines keep shapes apart
  const grad = new Float32Array(n);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    grad[i] = Math.hypot(lab[(i + 1) * 3] - lab[(i - 1) * 3], lab[(i + w) * 3] - lab[(i - w) * 3]) / 2;
  }
  const detail = opts.detail ?? 'normal';
  const count = Math.round(n / ({ simple: 260, normal: 170, detailed: 110 }[detail]));
  const sp = slic(lab, w, h, count, 14, opts.mask);
  const { label, regions } = merge(sp, lab, grad, w, h, { threshold: { simple: 15, normal: 11, detailed: 8 }[detail], minArea: Math.max(12, Math.round(n * { simple: 0.003, normal: 0.0015, detailed: 0.0008 }[detail])) });

  // per-region colour at its top and bottom
  const ids = regions.map((r, i) => (r?.alive ? i : -1)).filter((i) => i >= 0);
  const acc = new Map<number, { t: number[]; tn: number; b: number[]; bn: number }>();
  for (const k of ids) acc.set(k, { t: [0, 0, 0], tn: 0, b: [0, 0, 0], bn: 0 });
  for (let i = 0; i < n; i++) {
    const k = label[i]; if (k < 0) continue;
    const r = regions[k], y = (i / w) | 0, a = acc.get(k)!;
    const span = Math.max(1, r.y1 - r.y0), t = (y - r.y0) / span;
    if (t <= 0.35) { a.t[0] += lab[i * 3]; a.t[1] += lab[i * 3 + 1]; a.t[2] += lab[i * 3 + 2]; a.tn++; }
    if (t >= 0.65) { a.b[0] += lab[i * 3]; a.b[1] += lab[i * 3 + 1]; a.b[2] += lab[i * 3 + 2]; a.bn++; }
  }

  // 4. the sky: shapes along the top edge that are bright and smooth, and alike neighbours of those
  const skyIds = new Set<number>();
  if (!opts.mask) {
    const skyish = (k: number, seed = true) => {
      const r = regions[k], m = meanOf(r);
      const sd = Math.sqrt(Math.max(0, r.l2 / r.n - m[0] ** 2));
      const chroma = Math.hypot(m[1], m[2]);
      const blue = m[2] < -4;
      const high = (r.y0 + r.y1) / 2 < h * 0.6 && r.y1 < h * 0.8; // a sky never reaches the bottom of a photo
      // a smooth band across most of the top is sky even in a dim photo
      const band = r.top >= w * 0.6 && sd < 10 && r.g / r.n < 2 && m[0] > 36 && (r.y0 + r.y1) / 2 < h * 0.35;
      const bright = m[0] > 52 && sd < (m[0] > 70 ? 20 : 14) && r.g / r.n < 9;
      // white or grey (not blue) only counts when it spans the top: indoors, walls and doors are white too
      const neutralOk = !seed || blue || r.top >= w * 0.25 || band;
      return high && (bright || band) && neutralOk && (blue || chroma < 14 || (m[0] > 70 && m[2] < 40));
    };
    // sky touches the top edge (even briefly, between mountains), or is a clear blue area high up
    const seeds = ids.filter((k) => {
      const r = regions[k], m = meanOf(r);
      const touches = r.top > Math.max(3, Math.min((r.x1 - r.x0) * 0.2, 16));
      const blueHigh = (r.y0 + r.y1) / 2 < h * 0.35 && m[2] < -6 && r.n > n * 0.01;
      return (touches || blueHigh) && skyish(k);
    });
    opts.debug?.(ids.filter((k) => regions[k].top > 0).map((k) => { const r = regions[k], m = meanOf(r); return { k, n: r.n, top: r.top, wide: r.x1 - r.x0, L: Math.round(m[0]), a: Math.round(m[1]), b: Math.round(m[2]), sd: Math.round(Math.sqrt(Math.max(0, r.l2 / r.n - m[0] ** 2))), tex: +(r.g / r.n).toFixed(1), cy: +((r.y0 + r.y1) / 2 / h).toFixed(2), sky: skyish(k) }; }));
    // neighbours that touch the sky and match it are sky too (clouds, haze)
    const adj = new Map<number, Set<number>>();
    for (let y = 0; y < h; y++) for (let x = 0; x < w - 1; x++) {
      const a = label[y * w + x], b = label[y * w + x + 1], c = y < h - 1 ? label[(y + 1) * w + x] : a;
      for (const o of [b, c]) if (o !== a && o >= 0 && a >= 0) { (adj.get(a) ?? adj.set(a, new Set()).get(a)!).add(o); (adj.get(o) ?? adj.set(o, new Set()).get(o)!).add(a); }
    }
    const queue = [...seeds];
    seeds.forEach((k) => skyIds.add(k));
    while (queue.length) {
      const k = queue.pop()!;
      for (const o of adj.get(k) ?? []) if (!skyIds.has(o) && skyish(o, false) && deltaE(meanOf(regions[o]), meanOf(regions[k])) < 22) { skyIds.add(o); queue.push(o); }
    }
  }

  const shapes: VShape[] = [];
  const toRgb = (l: number[]) => labToRgb(l[0], l[1], l[2]).map((v) => Math.round(v)) as [number, number, number];
  for (const k of ids) {
    const r = regions[k], a = acc.get(k)!, m = meanOf(r);
    const loops = loopsOf(label, w, h, k, r);
    const d = loops.map((lp) => smoothPath(simplify(lp, 1.5))).join('');
    if (!d) continue;
    const top = a.tn ? a.t.map((v) => v / a.tn) : m, bottom = a.bn ? a.b.map((v) => v / a.bn) : m;
    // keep the shade gentle: no more than a small step from the shape's average
    const clampTo = (c: number[]) => { const dd = deltaE(c, m); const k2 = dd > 9 ? 9 / dd : 1; return c.map((v, j) => m[j] + (v - m[j]) * k2); };
    shapes.push({ d, top: toRgb(clampTo(top)), bottom: toRgb(clampTo(bottom)), area: r.n / n, y: (r.y0 + r.y1) / 2 / h, ...(skyIds.has(k) ? { sky: true } : {}) });
  }
  // big shapes first, so small ones sit on top
  shapes.sort((p, q) => q.area - p.area || p.y - q.y);
  const art: VectorArt = { w, h, shapes };
  if (skyIds.size) {
    let l = 0, A = 0, B = 0, N = 0, low = 0;
    for (const k of skyIds) { const r = regions[k]; l += r.l; A += r.a; B += r.b; N += r.n; low = Math.max(low, r.y1); }
    art.sky = [l / N, A / N, B / N];
    art.skyLine = low / h;
  }
  return art;
}

export const DETAILS = ['normal', 'simple', 'detailed'] as const;

/**
 * Redraw a studio picture. Things are cropped to the same box the asset's
 * other data uses (meta.trimObject: the mask's bounds plus 4 px), so the
 * drawing lines up with its size and anchor.
 */
export function vectorizeAsset(src: Raster, kind: 'place' | 'object', mask: Uint8Array | undefined, detail: VectorOptions['detail'] = 'normal'): VectorArt {
  if (kind === 'place' || !mask) return vectorize(src, { detail });
  const box = maskBox(mask, src.w, src.h);
  if (!box) return vectorize(src, { mask, detail });
  const pad = 4;
  const x0 = Math.max(0, box.x - pad), y0 = Math.max(0, box.y - pad);
  const x1 = Math.min(src.w, box.x + box.w + pad), y1 = Math.min(src.h, box.y + box.h + pad);
  const rect = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  const crop = cropRaster(src, rect);
  const m = new Uint8Array(rect.w * rect.h);
  for (let y = 0; y < rect.h; y++) for (let x = 0; x < rect.w; x++) m[y * rect.w + x] = mask[(y0 + y) * src.w + x0 + x];
  return vectorize(crop, { mask: m, detail });
}
