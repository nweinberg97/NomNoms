import { deltaE, fillHoles, kuwahara, rgbToLab, subjectMask, type Raster } from './pipeline';
import { slic } from './vector';

/**
 * Cut a thing (a teddy, a toy, a cup) out of its photo.
 *
 * Why the old cut-out lost parts: it judged each pixel by colour alone against
 * a sample from the middle of the photo, smoothed the result (which shaves thin
 * parts like ears), and kept only the one piece touching the centre. A teddy's
 * dark paws, light muzzle or a bow, or anything resembling the floor, got
 * dropped, and an ear or arm cut off by a few wrong pixels vanished with it.
 *
 * This one is GrabCut on edge-following patches (superpixels):
 *   - colour models for "thing" and "background", re-learned a few times
 *   - the background starts from the photo edge's main colours (a teddy
 *     sitting on the bottom edge doesn't count as background)
 *   - the split is the best overall cut: cutting along a strong outline is
 *     cheap, cutting through a smooth area is expensive, so parts that belong
 *     to the thing stay with it even when their colour is unusual
 *   - every real piece is kept, nothing is shaved
 *
 * `keep` (−1 … 1) is the "keep more / keep less" control.
 * Deterministic: the same photo always gives the same cut.
 */
export function cutOut(src: Raster, opts: { keep?: number } = {}): Uint8Array {
  // Close-ups (a face filling the frame) break the "the edge is background" idea, so
  // the cut is also tried without trusting the edges, and the more thing-like result wins.
  // The colour-only cut-out stays as a third candidate: it's the better guess for some
  // close-ups. The edge-aware cut gets a head start since it keeps whole things.
  const keep = opts.keep ?? 0;
  const tries: { m: Uint8Array | null; bonus: number }[] = [
    { m: cutCore(src, keep, true), bonus: 0.35 },
    { m: cutCore(src, keep, false), bonus: 0.15 },
    { m: subjectMask(src, { bias: 1 + keep * 0.25 }), bonus: 0 },
  ];
  let best: Uint8Array | null = null, bestScore = -Infinity;
  for (const t of tries) { if (!t.m) continue; const sc = thingScore(t.m, src.w, src.h) + t.bonus; if (sc > bestScore) { bestScore = sc; best = t.m; } }
  return best ?? middle(src.w, src.h);
}

/** Nothing stood out: start from the middle so the parent can brush from there. */
function middle(w: number, h: number): Uint8Array {
  const m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m[y * w + x] = ((x - w / 2) / (w * 0.32)) ** 2 + ((y - h / 2) / (h * 0.36)) ** 2 <= 1 ? 1 : 0;
  return m;
}

/** How much a mask looks like one thing in a photo: holds the middle, isn't a sliver, doesn't swallow the edges. */
export function thingScore(mask: Uint8Array, w: number, h: number): number {
  let cover = 0, mid = 0, midN = 0, edge = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = mask[y * w + x]; cover += v;
    if (Math.abs(x / w - 0.5) < 0.12 && Math.abs(y / h - 0.5) < 0.14) { mid += v; midN++; }
    if (x === 0 || y === 0 || x === w - 1) edge += v; // the bottom edge is fine to touch
  }
  cover /= w * h;
  const edgeFrac = edge / (2 * h + w);
  return 2 * (mid / Math.max(1, midN)) + (cover > 0.04 && cover < 0.9 ? 1 : 0) - 1.5 * edgeFrac;
}

function cutCore(src: Raster, keepArg: number, trustEdges: boolean): Uint8Array | null {
  const { w, h } = src, n = w * h;
  const keepMore = Math.max(-1, Math.min(1, keepArg));
  const smooth = kuwahara(src, 2);
  const lab = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = rgbToLab(smooth.data[i * 4], smooth.data[i * 4 + 1], smooth.data[i * 4 + 2]); lab[i * 3] = v[0]; lab[i * 3 + 1] = v[1]; lab[i * 3 + 2] = v[2]; }
  const label = slic(lab, w, h, Math.round(n / 70), 10);
  let K = 0; for (let i = 0; i < n; i++) if (label[i] + 1 > K) K = label[i] + 1;

  // patch stats: colour, size, centre, how much of the photo edge it touches
  const col = new Float64Array(K * 3), cnt = new Float64Array(K), cx = new Float64Array(K), cy = new Float64Array(K), edgeTouch = new Int32Array(K), sideTouch = new Int32Array(K);
  for (let i = 0; i < n; i++) {
    const k = label[i]; if (k < 0) continue;
    const x = i % w, y = (i / w) | 0;
    col[k * 3] += lab[i * 3]; col[k * 3 + 1] += lab[i * 3 + 1]; col[k * 3 + 2] += lab[i * 3 + 2]; cnt[k]++; cx[k] += x; cy[k] += y;
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1) edgeTouch[k]++;
    // things often sit on the bottom edge, so only the top and sides are sure background
    if (x === 0 || y === 0 || x === w - 1) sideTouch[k]++;
  }
  const C: number[][] = [];
  for (let k = 0; k < K; k++) { if (cnt[k]) { col[k * 3] /= cnt[k]; col[k * 3 + 1] /= cnt[k]; col[k * 3 + 2] /= cnt[k]; cx[k] /= cnt[k] * w; cy[k] /= cnt[k] * h; } C.push([col[k * 3], col[k * 3 + 1], col[k * 3 + 2]]); }

  // neighbours and the length of their shared border
  const adj = new Map<number, number>(); // key a*K+b (a<b) → border length
  const addAdj = (a: number, b: number) => { if (a === b || a < 0 || b < 0) return; const key = a < b ? a * K + b : b * K + a; adj.set(key, (adj.get(key) ?? 0) + 1); };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (x < w - 1) addAdj(label[i], label[i + 1]); if (y < h - 1) addAdj(label[i], label[i + w]); }
  const pairs = [...adj.entries()].map(([key, len]) => ({ a: Math.floor(key / K), b: key % K, len }));
  let meanD2 = 0; for (const p of pairs) meanD2 += deltaE(C[p.a], C[p.b]) ** 2; meanD2 /= Math.max(1, pairs.length);
  const beta = 1 / (2 * Math.max(1, meanD2));

  // background seeds: patches along the edge in the edge's main colours
  const edgeIds = [...Array(K).keys()].filter((k) => cnt[k] && edgeTouch[k] > 0).sort((a, b) => edgeTouch[b] - edgeTouch[a]);
  const groups: { c: number[]; weight: number; ids: number[] }[] = [];
  for (const k of edgeIds) { const g = groups.find((x) => deltaE(x.c, C[k]) < 14); if (g) { g.ids.push(k); g.weight += edgeTouch[k]; } else groups.push({ c: C[k], weight: edgeTouch[k], ids: [k] }); }
  const border = 2 * (w + h) - 4;
  const hardBg = new Uint8Array(K);
  for (const g of groups) if (g.weight >= border * 0.08) for (const k of g.ids) if (sideTouch[k] > 0 && trustEdges) hardBg[k] = 1;

  // start: the thing is the middle area that isn't a background seed
  let fg = new Uint8Array(K);
  const r0 = trustEdges ? [0.4, 0.42] : [0.3, 0.32];
  for (let k = 0; k < K; k++) if (cnt[k] && !hardBg[k] && ((cx[k] - 0.5) / r0[0]) ** 2 + ((cy[k] - 0.52) / r0[1]) ** 2 <= 1) fg[k] = 1;

  for (let round = 0; round < 5; round++) {
    const fgModel = model(C, cnt, (k) => fg[k] === 1), bgModel = model(C, cnt, (k) => fg[k] === 0 && cnt[k] > 0);
    if (!fgModel.length || !bgModel.length) break;
    // graph: source = thing, sink = background
    const S = K, T = K + 1;
    const g = new Graph(K + 2);
    for (let k = 0; k < K; k++) {
      if (!cnt[k]) continue;
      if (hardBg[k]) { g.add(k, T, 1e9); continue; }
      const dF = cost(C[k], fgModel), dB = cost(C[k], bgModel);
      // a gentle preference for the middle of the photo, and the keep-more/less control
      const centre = ((cx[k] - 0.5) ** 2 + (cy[k] - 0.5) ** 2) * 6;
      const bias = 1.2 * keepMore;
      g.add(S, k, Math.max(0, dB - bias) * cnt[k] * 0.02 + 1e-6);
      g.add(k, T, Math.max(0, dF + centre + bias) * cnt[k] * 0.02 + 1e-6);
    }
    const lambda = 2.2;
    for (const p of pairs) { const wgt = lambda * p.len * Math.exp(-beta * deltaE(C[p.a], C[p.b]) ** 2) + 0.05 * p.len; g.add(p.a, p.b, wgt); g.add(p.b, p.a, wgt); }
    g.maxflow(S, T);
    const side = g.sourceSide(S);
    const next = new Uint8Array(K);
    for (let k = 0; k < K; k++) next[k] = side[k] && !hardBg[k] ? 1 : 0;
    let same = true; for (let k = 0; k < K; k++) if (next[k] !== fg[k]) { same = false; break; }
    fg = next;
    if (same) break;
  }

  let mask: Uint8Array = new Uint8Array(n);
  for (let i = 0; i < n; i++) mask[i] = label[i] >= 0 && fg[label[i]] ? 1 : 0;
  mask = dropSmall(mask, w, h, Math.max(30, Math.round(n * 0.004)));
  mask = fillHoles(mask, w, h);
  const cover = mask.reduce((s, v) => s + v, 0) / n;
  return cover < 0.02 ? null : mask;
}

/* ── colour models: a few weighted clusters with their spread ───────── */
interface Comp { c: number[]; v: number; w: number }
function model(C: number[][], cnt: Float64Array, pick: (k: number) => boolean): Comp[] {
  const ids = C.map((_, k) => k).filter((k) => cnt[k] && pick(k));
  if (!ids.length) return [];
  const K = Math.min(5, ids.length);
  // deterministic start: biggest patches that are far apart
  const sorted = [...ids].sort((a, b) => cnt[b] - cnt[a]);
  const centres: number[][] = [];
  for (const k of sorted) { if (centres.length >= K) break; if (centres.every((c) => deltaE(c, C[k]) > 10)) centres.push([...C[k]]); }
  for (let it = 0; it < 6; it++) {
    const acc = centres.map(() => [0, 0, 0, 0]);
    for (const k of ids) { const j = nearest(centres, C[k]); acc[j][0] += C[k][0] * cnt[k]; acc[j][1] += C[k][1] * cnt[k]; acc[j][2] += C[k][2] * cnt[k]; acc[j][3] += cnt[k]; }
    acc.forEach((a, j) => { if (a[3]) centres[j] = [a[0] / a[3], a[1] / a[3], a[2] / a[3]]; });
  }
  const total = ids.reduce((s, k) => s + cnt[k], 0);
  return centres.map((c, j) => {
    let v = 0, wsum = 0;
    for (const k of ids) if (nearest(centres, C[k]) === j) { v += deltaE(C[k], c) ** 2 * cnt[k]; wsum += cnt[k]; }
    return { c, v: Math.max(16, wsum ? v / wsum : 16), w: Math.max(0.02, wsum / total) };
  });
}
const nearest = (cs: number[][], p: number[]) => { let b = 0, bd = Infinity; cs.forEach((c, j) => { const d = deltaE(c, p); if (d < bd) { bd = d; b = j; } }); return b; };
/** How unlikely a colour is under a model (negative log-likelihood, simplified). */
function cost(p: number[], m: Comp[]): number {
  let best = Infinity;
  for (const c of m) best = Math.min(best, deltaE(p, c.c) ** 2 / (2 * c.v) + 0.5 * Math.log(c.v) - Math.log(c.w));
  return Math.max(0, best);
}

/* ── max-flow / min-cut (Dinic) on a small graph ───────────────────── */
class Graph {
  private to: number[] = []; private cap: number[] = []; private head: Int32Array; private next: number[] = [];
  constructor(private n: number) { this.head = new Int32Array(n).fill(-1); }
  add(a: number, b: number, c: number) {
    this.to.push(b); this.cap.push(c); this.next.push(this.head[a]); this.head[a] = this.to.length - 1;
    this.to.push(a); this.cap.push(0); this.next.push(this.head[b]); this.head[b] = this.to.length - 1;
  }
  maxflow(s: number, t: number) {
    const level = new Int32Array(this.n), it = new Int32Array(this.n);
    const bfs = () => {
      level.fill(-1); level[s] = 0; const q = [s];
      for (let i = 0; i < q.length; i++) { const u = q[i]; for (let e = this.head[u]; e >= 0; e = this.next[e]) if (this.cap[e] > 1e-9 && level[this.to[e]] < 0) { level[this.to[e]] = level[u] + 1; q.push(this.to[e]); } }
      return level[t] >= 0;
    };
    const dfs = (u: number, f: number): number => {
      if (u === t) return f;
      for (; it[u] >= 0; it[u] = this.next[it[u]]) {
        const e = it[u], v = this.to[e];
        if (this.cap[e] > 1e-9 && level[v] === level[u] + 1) { const d = dfs(v, Math.min(f, this.cap[e])); if (d > 0) { this.cap[e] -= d; this.cap[e ^ 1] += d; return d; } }
      }
      return 0;
    };
    while (bfs()) { for (let i = 0; i < this.n; i++) it[i] = this.head[i]; let f; while ((f = dfs(s, Infinity)) > 0) { /* push */ } }
  }
  sourceSide(s: number): Uint8Array {
    const seen = new Uint8Array(this.n); seen[s] = 1; const q = [s];
    for (let i = 0; i < q.length; i++) { const u = q[i]; for (let e = this.head[u]; e >= 0; e = this.next[e]) if (this.cap[e] > 1e-9 && !seen[this.to[e]]) { seen[this.to[e]] = 1; q.push(this.to[e]); } }
    return seen;
  }
}

/** Remove pieces smaller than `min` pixels; keep all the others. */
function dropSmall(mask: Uint8Array, w: number, h: number, min: number): Uint8Array {
  const out = new Uint8Array(mask.length), seen = new Uint8Array(mask.length);
  for (let s = 0; s < mask.length; s++) {
    if (!mask[s] || seen[s]) continue;
    const piece = [s]; seen[s] = 1;
    for (let q = 0; q < piece.length; q++) {
      const i = piece[q], x = i % w, y = (i / w) | 0;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) if (j >= 0 && mask[j] && !seen[j]) { seen[j] = 1; piece.push(j); }
    }
    if (piece.length >= min) for (const i of piece) out[i] = 1;
  }
  return out;
}
