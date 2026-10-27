import { softLook, STYLES, type StyleMode } from '../styles';
import { labToRgb, rgbToLab } from './pipeline';
import { modePalette } from './render';
import type { VectorArt, VShape } from './vector';

/**
 * Draw a traced picture (vector.ts) as a finished illustration in one of the
 * four looks. Every look changes how shapes are drawn, not just their colour:
 *
 *   Pocketlight 3D   soft top-to-bottom light on every shape, warm glow, gentle vignette
 *   Storybook Gouache painted shapes with darker wet edges and paper grain (no warping)
 *   Wondercut        a few flat paper colours, layered with a paper shadow
 *   Classic Ink      two-tone cel shading with ink outlines
 *
 * The photo's sky is replaced by an illustrated sky in the photo's mood (clear,
 * overcast or sunset) with soft clouds. Output is a standalone SVG: sharp at
 * any size, and the same input always gives the same picture.
 */

type RGB = [number, number, number];
const hex = (c: number[]) => `#${c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
const adjust = (c: number[], dL: number, sat = 1): RGB => { const [L, a, b] = rgbToLab(c[0], c[1], c[2]); return labToRgb(Math.max(0, Math.min(100, L + dL)), a * sat, b * sat).map(Math.round) as RGB; };
const lum = (c: number[]) => rgbToLab(c[0], c[1], c[2])[0];

/** A small deterministic random from a number, for cloud placement. */
function rand(seed: number) { let s = (seed * 2654435761) >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const hashArt = (a: VectorArt) => { let h = a.w * 31 + a.h; for (const s of a.shapes.slice(0, 12)) h = (h * 33 + s.d.length + s.top[0]) >>> 0; return h; };

/** The illustrated sky, chosen from the photo sky's mood. */
function skyColours(sky: number[] | undefined): { top: RGB; bottom: RGB; mood: 'clear' | 'overcast' | 'sunset' } {
  if (!sky) return { top: [126, 182, 230], bottom: [226, 240, 248], mood: 'clear' };
  const [L, a, b] = sky;
  const chroma = Math.hypot(a, b);
  if (b > 12 || a > 10) return { top: labToRgb(Math.max(45, L - 18), a * 0.8 + 6, b * 0.6 - 6) as RGB, bottom: labToRgb(Math.min(94, L + 8), 12, 34) as RGB, mood: 'sunset' };
  if (b < -6 && chroma > 8) return { top: labToRgb(Math.max(52, Math.min(68, L - 6)), -4, Math.min(-30, b * 1.4)) as RGB, bottom: labToRgb(Math.min(94, L + 14), -3, Math.max(-12, b * 0.4)) as RGB, mood: 'clear' };
  // grey or white skies: keep them soft and a little blue, never dull
  return { top: labToRgb(Math.max(62, Math.min(80, L - 4)), -3, -16) as RGB, bottom: labToRgb(Math.min(95, L + 10), 0, -4) as RGB, mood: 'overcast' };
}

function clouds(art: VectorArt, seed: number, fill: string, shade: string, mode: StyleMode): string {
  if (!art.sky) return '';
  const r = rand(seed);
  const band = Math.max(0.12, Math.min(0.55, (art.skyLine ?? 0.4) * 0.8)) * art.h;
  if ((art.skyLine ?? 0) < 0.12) return '';
  const n = 2 + Math.floor(r() * 2);
  let out = '';
  for (let i = 0; i < n; i++) {
    const cx = ((i + 0.25 + r() * 0.5) / n) * art.w, cy = band * (0.22 + r() * 0.4), s = Math.min(band * 0.22, art.w * (0.022 + r() * 0.018));
    const puffs = [[-1.3, 0.25, 0.7], [-0.55, -0.2, 0.95], [0.3, -0.35, 1.1], [1.15, 0.05, 0.8], [0.4, 0.3, 0.75]];
    const body = puffs.map(([dx, dy, k]) => `<circle cx="${(cx + dx * s).toFixed(1)}" cy="${(cy + dy * s).toFixed(1)}" r="${(k * s).toFixed(1)}"/>`).join('') + `<rect x="${(cx - 1.6 * s).toFixed(1)}" y="${cy.toFixed(1)}" width="${(3.2 * s).toFixed(1)}" height="${(0.85 * s).toFixed(1)}" rx="${(0.42 * s).toFixed(1)}"/>`;
    const under = mode === 'inked' || softLook(mode) ? `<g fill="${shade}" opacity=".5" transform="translate(0 ${(0.22 * s).toFixed(1)})">${body}</g>` : '';
    const dx = (art.w * (0.02 + r() * 0.02)).toFixed(1), dur = (40 + r() * 30).toFixed(0);
    out += `<g><animateTransform attributeName="transform" type="translate" values="0 0;${dx} 0;0 0" dur="${dur}s" repeatCount="indefinite"/>${under}<g fill="${fill}"${mode === 'inked' ? ` stroke="${shade}" stroke-width="1.2"` : ''}>${body}</g></g>`;
  }
  return out;
}

/** Snap shape colours to a few paper colours (Wondercut), weighted by area. Deterministic. */
function paperColours(shapes: VShape[], k: number): Map<VShape, RGB> {
  const pts = shapes.map((s) => ({ s, lab: rgbToLab(...(s.top.map((v, i) => (v + s.bottom[i]) / 2) as RGB)), w: s.area }));
  const sorted = [...pts].sort((a, b) => b.w - a.w);
  const centres: number[][] = [];
  for (const p of sorted) { if (centres.length >= k) break; if (centres.every((c) => Math.hypot(c[0] - p.lab[0], c[1] - p.lab[1], c[2] - p.lab[2]) > 14)) centres.push([...p.lab]); }
  for (let it = 0; it < 6; it++) {
    const acc = centres.map(() => [0, 0, 0, 0]);
    const near = (l: number[]) => centres.reduce((bi, c, i) => (Math.hypot(c[0] - l[0], c[1] - l[1], c[2] - l[2]) < Math.hypot(centres[bi][0] - l[0], centres[bi][1] - l[1], centres[bi][2] - l[2]) ? i : bi), 0);
    for (const p of pts) { const i = near(p.lab); acc[i][0] += p.lab[0] * p.w; acc[i][1] += p.lab[1] * p.w; acc[i][2] += p.lab[2] * p.w; acc[i][3] += p.w; }
    acc.forEach((a, i) => { if (a[3]) centres[i] = [a[0] / a[3], a[1] / a[3], a[2] / a[3]]; });
  }
  const out = new Map<VShape, RGB>();
  for (const p of pts) {
    const c = centres.reduce((best, cc) => (Math.hypot(cc[0] - p.lab[0], cc[1] - p.lab[1], cc[2] - p.lab[2]) < Math.hypot(best[0] - p.lab[0], best[1] - p.lab[1], best[2] - p.lab[2]) ? cc : best), centres[0]);
    out.set(p.s, labToRgb(c[0], c[1], c[2]).map(Math.round) as RGB);
  }
  return out;
}

export function vectorSvg(art: VectorArt, mode: StyleMode, opts: { id?: string; transparent?: boolean } = {}): string {
  const s = STYLES[mode];
  const id = opts.id ?? 'v';
  const { w, h } = art;
  const drawn = art.shapes.filter((x) => !x.sky);
  // colours, through the look's palette
  // storybook colour: livelier than a hazy photo, then through the look's palette
  const SAT = { pocketlight: 1.3, tales: 1.3, gouache: 1.15, wondercut: 1.35, inked: 1.25 }[mode];
  const tune = (c: RGB) => modePalette([adjust(c, 0, SAT)], mode)[0] as RGB;
  const paper = mode === 'wondercut' ? paperColours(drawn, 9) : null;
  const sky = skyColours(art.sky);
  const skyTop = tune(sky.top), skyBottom = tune(sky.bottom);
  let defs = '', body = '';

  // the sky first (it sits behind everything)
  if (art.sky && !opts.transparent) {
    defs += `<linearGradient id="${id}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hex(skyTop)}"/><stop offset="${Math.min(0.95, (art.skyLine ?? 0.5) + 0.1).toFixed(2)}" stop-color="${hex(skyBottom)}"/></linearGradient>`;
    body += `<rect width="${w}" height="${h}" fill="${mode === 'wondercut' ? hex(skyTop.map((v, i) => (v + skyBottom[i]) / 2)) : `url(#${id}sky)`}"/>`;
    if (softLook(mode)) body += `<circle cx="${(w * 0.82).toFixed(0)}" cy="${(h * 0.08).toFixed(0)}" r="${(w * 0.22).toFixed(0)}" fill="url(#${id}sun)"/>`;
    body += clouds(art, hashArt(art), sky.mood === 'sunset' ? hex(adjust(skyBottom, 6)) : '#ffffff', hex(adjust(skyTop, -6)), mode);
  } else if (!opts.transparent) {
    // no sky: start from the biggest shape's colour so seams never show white
    const big = drawn[0];
    if (big) body += `<rect width="${w}" height="${h}" fill="${hex(tune(big.bottom))}"/>`;
  }
  if (softLook(mode)) defs += `<radialGradient id="${id}sun"><stop offset="0" stop-color="#fff6dc" stop-opacity=".75"/><stop offset="1" stop-color="#fff6dc" stop-opacity="0"/></radialGradient>`;

  // the shapes
  let shapes = '';
  drawn.forEach((sh, i) => {
    let top = tune(sh.top), bottom = tune(sh.bottom);
    let fill: string;
    const big = sh.area > 0.0025;
    if (mode === 'wondercut') {
      fill = hex(paper!.get(sh)!);
    } else if (mode === 'inked') {
      // cel: flat colour per shape; the ink lines do the drawing
      const base = top.map((v, k) => (v + bottom[k]) / 2) as RGB;
      top = base; bottom = base;
      fill = hex(base);
    } else {
      const lift = softLook(mode) ? 10 : 2;
      if (Math.abs(lum(top) - lum(bottom)) < 1.5 && lift < 3) fill = hex(top);
      else { defs += `<linearGradient id="${id}g${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hex(adjust(top, lift))}"/><stop offset="1" stop-color="${hex(bottom)}"/></linearGradient>`; fill = `url(#${id}g${i})`; }
    }
    // a hairline of the shape's own colour hides the tiny gaps between neighbours
    const seam = mode === 'wondercut' ? fill : hex(bottom);
    let stroke = `stroke="${seam}" stroke-width="0.9" stroke-linejoin="round"`;
    if (mode === 'inked' && big) stroke = `stroke="${s.palette.ink}" stroke-opacity=".75" stroke-width="${sh.area > 0.02 ? 1.5 : 1}" stroke-linejoin="round"`;
    if (mode === 'gouache' && big) stroke = `stroke="${hex(adjust(bottom, -12))}" stroke-opacity=".55" stroke-width="1.3" stroke-linejoin="round"`;
    shapes += `<path d="${sh.d}" fill="${fill}" fill-rule="evenodd" ${stroke}/>`;
  });
  if (mode === 'wondercut') {
    defs += `<filter id="${id}cut" x="-2%" y="-2%" width="104%" height="106%"><feDropShadow dx="1.2" dy="2" stdDeviation="1.2" flood-color="${s.palette.shadow}" flood-opacity=".35"/></filter>`;
    body += `<g filter="url(#${id}cut)">${shapes}</g>`;
  } else body += `<g>${shapes}</g>`;

  // finishing light and paper, over the whole picture (no warping, no blur of the picture)
  if (!opts.transparent) {
    if (softLook(mode)) {
      defs += `<radialGradient id="${id}vig" cx=".5" cy=".42" r=".75"><stop offset=".6" stop-color="#2b1c14" stop-opacity="0"/><stop offset="1" stop-color="#2b1c14" stop-opacity=".22"/></radialGradient><linearGradient id="${id}warm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1d6" stop-opacity=".22"/><stop offset=".6" stop-color="#fff1d6" stop-opacity="0"/></linearGradient>`;
      body += `<rect width="${w}" height="${h}" fill="url(#${id}warm)"/><rect width="${w}" height="${h}" fill="url(#${id}vig)"/>`;
    }
    if (mode === 'gouache' || mode === 'wondercut') {
      defs += `<filter id="${id}grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${mode === 'gouache' ? 0.9 : 0.55}" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.28  0 0 0 0 0.22  0 0 0 ${mode === 'gouache' ? 0.55 : 0.4} -0.2"/></filter>`;
      body += `<rect width="${w}" height="${h}" filter="url(#${id}grain)" opacity="${mode === 'gouache' ? 0.5 : 0.35}"/>`;
      if (mode === 'gouache') {
        // paint: soft, uneven pigment inside every shape (light and dark blooms), no warping
        defs += `<filter id="${id}paint" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="8"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 0.97  0 0 0 0 0.9  1.2 0 0 0 -0.55"/></filter>`;
        body += `<rect width="${w}" height="${h}" filter="url(#${id}paint)" opacity=".28"/>`;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"><defs>${defs}</defs>${body}</svg>`;
}

export const vectorUrl = (art: VectorArt, mode: StyleMode, opts: { transparent?: boolean } = {}) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(vectorSvg(art, mode, opts))}`;
