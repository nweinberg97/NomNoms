import { worldAtmosphere, worldBackdrop } from './worlds';
import type { WorldId } from './character';
import { PLACES, type Place } from './catalog';
import { characterMarkup, isPet, type Look } from './character';
import { rng } from './generator';
import { finishInLook } from './looks';
import { softLook, STYLES, darken, styleFilters, stylizeShapes, type StyleMode } from './styles';
import { askMark, hasThing, thingArt } from './things';

/**
 * Draws one story page as SVG (400 × 300): a backdrop built from the place's
 * colours and horizon, a few props, the characters and the page's "big thing".
 * Props, animals and the page's big thing are drawn (things/), never emoji.
 */

const emoji = (e: string, x: number, y: number, size: number, extra = '') => thingArt(e, x, y, size, extra);

const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(k > 0 ? c + (255 - c) * k : c * (1 + k))));
  return `#${[f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
};

let uid = 0;

export function backdrop(p: Place, seed: number): string {
  const id = `sc${++uid}`;
  // story-world places are drawn by hand (worlds.ts)
  if (p.art) { const art = worldBackdrop(p.art, seed, id); if (art) return art; }
  const r = rng(seed);
  const indoor = p.horizon === 'wall';
  const gy = indoor ? 206 : 196;
  let s = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky[0]}"/><stop offset="1" stop-color="${p.sky[1]}"/></linearGradient></defs>
    <rect width="400" height="300" fill="url(#${id})"/>`;
  switch (p.horizon) {
    case 'sea': s += `<rect y="150" width="400" height="${gy - 150}" fill="#7fbcd2"/><path d="M0 ${gy - 10} Q50 ${gy - 22} 100 ${gy - 10} T200 ${gy - 10} T300 ${gy - 10} T400 ${gy - 10} V${gy} H0 Z" fill="#a9d6e3"/>`; break;
    case 'hills': s += `<ellipse cx="90" cy="${gy + 20}" rx="230" ry="70" fill="${shade(p.ground, -0.08)}"/><ellipse cx="340" cy="${gy + 26}" rx="200" ry="60" fill="${shade(p.ground, -0.15)}"/>`; break;
    case 'mountains': s += `<path d="M-20 ${gy} L80 90 L170 ${gy} Z" fill="#9fb3c6"/><path d="M80 90 L104 124 L92 120 L80 132 L68 120 L58 126 Z" fill="#fff"/><path d="M120 ${gy} L250 70 L380 ${gy} Z" fill="#8aa1b6"/><path d="M250 70 L280 112 L264 106 L250 120 L236 106 L222 112 Z" fill="#fff"/><path d="M300 ${gy} L380 120 L440 ${gy} Z" fill="#a9bccc"/>`; break;
    case 'city': s += [20, 64, 112, 168, 220, 272, 318, 360].map((x, i) => { const h = 60 + ((i * 37) % 70); return `<rect x="${x}" y="${gy - h}" width="${36 + (i % 3) * 6}" height="${h}" rx="3" fill="${['#b7c3cf', '#a9b6c3', '#c4ced8'][i % 3]}"/>${Array.from({ length: Math.floor(h / 22) }, (_, k) => `<rect x="${x + 8}" y="${gy - h + 10 + k * 22}" width="8" height="9" fill="#e9eef3" opacity=".8"/><rect x="${x + 22}" y="${gy - h + 10 + k * 22}" width="8" height="9" fill="#e9eef3" opacity=".8"/>`).join('')}`; }).join(''); break;
    case 'wall': s += `<rect x="272" y="44" width="92" height="82" rx="6" fill="${shade(p.sky[0], -0.04)}" stroke="#fff" stroke-opacity=".7" stroke-width="7"/><path d="M318 44 V126 M272 85 H364" stroke="#fff" stroke-opacity=".7" stroke-width="5"/><rect y="${gy - 8}" width="400" height="8" fill="${shade(p.ground, -0.12)}"/>`; break;
    case 'trees': s += Array.from({ length: 7 }, (_, i) => { const x = 20 + i * 62 + (r.next() * 14 - 7); const h = 40 + r.next() * 30; return `<rect x="${x - 4}" y="${gy - h + 20}" width="8" height="${h - 14}" fill="#8a6a4a"/><circle cx="${x}" cy="${gy - h + 10}" r="${24 + r.next() * 10}" fill="${['#6fa257', '#7fb069', '#5f9150'][i % 3]}"/>`; }).join(''); break;
    case 'stars': s += Array.from({ length: 26 }, () => `<circle cx="${r.next() * 400}" cy="${r.next() * (gy - 30)}" r="${0.8 + r.next() * 1.6}" fill="#fff" opacity="${0.5 + r.next() * 0.5}"/>`).join('') + `<circle cx="330" cy="58" r="22" fill="#f6eac2"/><circle cx="340" cy="52" r="20" fill="${p.sky[0]}"/>`; break;
    case 'clouds': s += [[70, 60, 1], [250, 44, 0.8], [350, 90, 1.1]].map(([x, y, k]) => `<g fill="#fff" opacity=".92"><ellipse cx="${x}" cy="${y}" rx="${34 * k}" ry="${14 * k}"/><circle cx="${x - 10 * k}" cy="${y - 8 * k}" r="${14 * k}"/><circle cx="${x + 12 * k}" cy="${y - 10 * k}" r="${16 * k}"/></g>`).join(''); break;
    case 'none': s += Array.from({ length: 4 }, (_, i) => `<path d="M${60 + i * 90} 0 L${30 + i * 90} 300 L${90 + i * 90} 300 Z" fill="#fff" opacity=".06"/>`).join('') + Array.from({ length: 12 }, () => `<circle cx="${r.next() * 400}" cy="${r.next() * 280}" r="${2 + r.next() * 5}" fill="none" stroke="#fff" stroke-opacity=".5"/>`).join(''); break;
  }
  switch (p.groundKind) {
    case 'water': s += `<rect y="${gy}" width="400" height="${300 - gy}" fill="${p.ground}"/>` + Array.from({ length: 5 }, (_, i) => `<path d="M${-20 + i * 30} ${gy + 20 + i * 18} q20 -8 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" stroke="#fff" stroke-opacity=".35" stroke-width="2.5" fill="none"/>`).join(''); break;
    case 'snow': s += `<path d="M0 ${gy} Q100 ${gy - 14} 200 ${gy} T400 ${gy} V300 H0 Z" fill="${p.ground}"/><ellipse cx="300" cy="${gy + 40}" rx="120" ry="12" fill="#dbe7f1"/>`; break;
    case 'space': s += p.horizon === 'clouds' ? `<g fill="#fff">${Array.from({ length: 9 }, (_, i) => `<circle cx="${i * 50}" cy="${gy + 18}" r="${36 + (i % 2) * 8}"/>`).join('')}<rect y="${gy + 20}" width="400" height="${300 - gy}"/></g>` : `<ellipse cx="200" cy="${gy + 90}" rx="300" ry="110" fill="${p.ground}"/><circle cx="120" cy="${gy + 30}" r="10" fill="${shade(p.ground, -0.2)}"/><circle cx="300" cy="${gy + 46}" r="14" fill="${shade(p.ground, -0.2)}"/>`; break;
    case 'floor': s += `<rect y="${gy}" width="400" height="${300 - gy}" fill="${p.ground}"/><ellipse cx="200" cy="${gy + 62}" rx="170" ry="24" fill="${shade(p.ground, -0.08)}"/>`; break;
    default: s += `<path d="M0 ${gy} Q200 ${gy - 10} 400 ${gy} V300 H0 Z" fill="${p.ground}"/>`;
  }
  if (p.night) s += Array.from({ length: 10 }, () => `<circle cx="${r.next() * 400}" cy="${r.next() * 120}" r="1.2" fill="#fff" opacity=".8"/>`).join('');
  // a couple of props, kept clear of the characters
  const spots: [number, number, number][] = [[34, gy - 12, 30], [372, gy - 14, 30], [60, 50, 26], [200, gy + 70, 24], [372, 64, 26]];
  r.shuffle(p.props.filter(hasThing)).slice(0, 3).forEach((e, i) => { const [x, y, z] = spots[(i + Math.floor(r.next() * 2)) % spots.length]; s += emoji(e, x, y, z, 'opacity=".95"'); });
  return s;
}

/** A placement from the page editor (scene units; x, y = where they stand). */
export interface ScenePlace { x?: number; y?: number; scale?: number; flip?: boolean; hidden?: boolean }
export interface SceneCharacter { look: Look; size?: 'small' | 'normal'; /** For editing: the cast id. */ id?: string; place?: ScenePlace }

/** A place drawn or uploaded by the family, used as a backdrop. */
export type DrawnPlace = Place & { image: string };

/** A place made from a photo: its illustrated image and where the horizon sits (0–1 from the top). */
export interface PhotoPlace { image: string; horizon: number }

/** A thing made from a photo, standing on the ground. */
export interface SceneThing { image: string; width: number; height: number; heightRatio: number; x: number; id?: string; place?: ScenePlace }

/** How tall a grown-up stands in a 400 × 300 scene; things are sized against it. */
const PERSON_HEIGHT = 190;

/** A full story picture in an illustration mode. `chars[0]` is the star (drawn on the left). */
/** How tall each age is drawn next to a grown-up. */
const KIND_SCALE = { baby: 0.74, kid: 0.86, adult: 1, elder: 0.97 } as const;

export function sceneSvg(opts: {
  placeId: string;
  /** A drawn place to use instead of the built-in ones. */
  drawn?: DrawnPlace;
  /** A photo place to use instead of the built-in ones. */
  photo?: PhotoPlace;
  things?: SceneThing[];
  seed: number;
  chars: SceneCharacter[];
  focus?: { e: string; count?: number; faded?: boolean };
  /** Where the big thing sits (page editor). */
  focusPlace?: ScenePlace;
  /** The picked item in the page editor ('char:<id>', 'thing:<id>' or 'focus'), outlined. */
  selected?: string;
  /** Mark items so the page editor can pick and move them. */
  editable?: boolean;
  animated?: boolean;
  label?: string;
  style?: StyleMode;
  /** The story world: adds its light and atmosphere over the picture. */
  world?: WorldId;
}): string {
  const mode = opts.style ?? 'pocketlight';
  const id = `s${++uid}`;
  const p = PLACES.find((x) => x.id === opts.placeId) ?? PLACES[0];
  const esc = (u: string) => u.replace(/"/g, '&quot;');
  let back: string;
  if (opts.photo) {
    // drawn once: a second, sliding copy made edges double. A redrawn place's clouds drift on their own.
    back = `<image href="${esc(opts.photo.image)}" x="0" y="0" width="400" height="300" preserveAspectRatio="xMidYMid slice"/>`;
  } else if (opts.drawn) {
    back = `<rect width="400" height="300" fill="#fbf7f0"/><image href="${esc(opts.drawn.image)}" x="0" y="0" width="400" height="300" preserveAspectRatio="xMidYMid slice"/>`;
  } else {
    back = backdrop(p, opts.seed);
  }
  // the mode's background treatment
  const inkFor = (fill: string) => (fill.startsWith('#') && fill.length === 7 ? darken(fill, 0.35) : null);
  if (!opts.photo && !opts.drawn) {
    // the place is made in the look's medium too: clay hills, washes of paint, layers of paper, inked lines
    back = finishInLook(`<g>${back}</g>`, mode, `${id}B`, 'backdrop');
  } else if (opts.drawn && mode === 'gouache') back = `<g filter="url(#grain${id})">${back}</g>`;
  let s = `<defs>${styleFilters(mode, id)}</defs>${back}`;
  // things made from photos stand on the ground, sized against a grown-up
  const box = (key: string, x: number, y: number, w: number, h: number, inner: string, ax = x + w / 2, ay = y + h) => {
    // the picked one gets a dashed outline and a corner handle: drag it to make them bigger or smaller
    const hx = x + w + 4, hy = y - 4;
    const sel = opts.selected === key ? `<rect x="${(x - 4).toFixed(1)}" y="${(y - 4).toFixed(1)}" width="${(w + 8).toFixed(1)}" height="${(h + 8).toFixed(1)}" rx="10" fill="none" stroke="#2f7de1" stroke-width="2.5" stroke-dasharray="7 5" class="bt-sel"/>`
      + `<g data-resize="${key}" class="bt-resize" style="cursor:nesw-resize"><circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="16" fill="transparent"/><circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="9.5" fill="#fff" stroke="#2f7de1" stroke-width="2.5"/>`
      + `<path d="M${(hx - 4).toFixed(1)} ${(hy + 4).toFixed(1)} L${(hx + 4).toFixed(1)} ${(hy - 4).toFixed(1)} M${(hx + 0.5).toFixed(1)} ${(hy - 4).toFixed(1)} H${(hx + 4).toFixed(1)} V${(hy - 0.5).toFixed(1)} M${(hx - 4).toFixed(1)} ${(hy + 0.5).toFixed(1)} V${(hy + 4).toFixed(1)} H${(hx - 0.5).toFixed(1)}" stroke="#2f7de1" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>` : '';
    return opts.editable ? `<g data-edit="${key}" data-ax="${ax.toFixed(1)}" data-ay="${ay.toFixed(1)}" style="cursor:grab">${inner}<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="transparent"/>${sel}</g>` : inner;
  };
  (opts.things ?? []).forEach((t) => {
    const pl = t.place ?? {};
    if (pl.hidden) return;
    const h = Math.max(22, Math.min(270, t.heightRatio * PERSON_HEIGHT)) * (pl.scale ?? 1);
    const w = (h * t.width) / t.height;
    const cx = pl.x ?? t.x * 400, base = pl.y ?? 292, y = base - h;
    const flip = pl.flip ? ` transform="translate(${(2 * cx).toFixed(1)} 0) scale(-1 1)"` : '';
    s += box(`thing:${t.id ?? ''}`, cx - w / 2, y, w, h, `<g${flip}><ellipse cx="${cx.toFixed(1)}" cy="${base.toFixed(1)}" rx="${(w * 0.42).toFixed(1)}" ry="${Math.max(3, h * 0.035).toFixed(1)}" fill="${STYLES[mode].palette.shadow}" opacity=".2"/>
      <image href="${esc(t.image)}" x="${(cx - w / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}"${t.image.startsWith('data:image/svg') ? '' : ` filter="url(#img${id})"`}/></g>`);
  });
  const slots = opts.chars.length >= 3
    ? [{ x: 10, w: 132 }, { x: 140, w: 124 }, { x: 262, w: 124 }]
    : [{ x: 36, w: 156 }, { x: 214, w: 150 }];
  opts.chars.slice(0, slots.length).forEach((c, i) => {
    const slot = slots[i], pl = c.place ?? {};
    if (pl.hidden) return;
    const small = c.size === 'small' || isPet(c.look.kind);
    // little ones are drawn little: a baby comes up to about a grown-up's chest
    const age = KIND_SCALE[c.look.kind as keyof typeof KIND_SCALE] ?? 1;
    const tall = small ? 1 : 1 + 0.12 * Math.max(-1, Math.min(1, c.look.height ?? 0));
    const w = (small ? slot.w * 0.78 : slot.w * age) * tall * (pl.scale ?? 1);
    const h = w * (314 / 240);
    const fx = pl.x ?? slot.x + slot.w / 2, fy = pl.y ?? 296 + (small ? 4 : 0);
    const x = fx - w / 2, y = fy - h;
    const svg = `<svg x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" viewBox="-20 -44 240 314" overflow="visible">${characterMarkup(c.look, { animated: opts.animated, style: mode })}</svg>`;
    const flipped = pl.flip ? `<g transform="translate(${(2 * fx).toFixed(1)} 0) scale(-1 1)">${svg}</g>` : svg;
    // the pick box hugs the figure (the box above includes room for hats and raised arms)
    s += box(`char:${c.id ?? i}`, x + w * 0.12, y + h * 0.1, w * 0.76, h * 0.88, flipped, fx, fy);
  });
  s += worldAtmosphere(opts.world, id, opts.seed);
  if (opts.focus && hasThing(opts.focus.e) && !opts.focusPlace?.hidden) {
    const f = opts.focus, fp = opts.focusPlace ?? {};
    const k = fp.scale ?? 1, cx = fp.x ?? 200, cy = fp.y ?? 76;
    // drawn around (200, 76), then moved and sized as placed
    const at = `translate(${cx.toFixed(1)} ${cy.toFixed(1)}) scale(${k.toFixed(3)}) translate(-200 -76)${fp.flip ? ' translate(400 0) scale(-1 1)' : ''}`;
    let inner: string, bw: number, bh: number;
    if (f.count) {
      const n = f.count, size = n > 3 ? 30 : 38, gap = size + 8, x0 = 200 - ((n - 1) * gap) / 2;
      inner = `<g class="bt-focus">${Array.from({ length: n }, (_, i) => emoji(f.e, x0 + i * gap, 58 + (i % 2) * 10, size)).join('')}</g>`;
      bw = (n - 1) * gap + size; bh = size + 28;
    } else if (f.faded) {
      inner = `<g class="bt-focus" opacity=".9"><circle cx="200" cy="74" r="38" fill="#fff" opacity=".7"/>${emoji(f.e, 200, 74, 46, 'opacity=".35"')}${askMark(232, 46, 26)}</g>`;
      bw = 90; bh = 90;
    } else {
      inner = `<g class="bt-focus"><ellipse cx="200" cy="80" rx="44" ry="40" fill="#fff" opacity=".28"/>${emoji(f.e, 200, 76, 64)}</g>`;
      bw = 88; bh = 84;
    }
    s += box('focus', cx - (bw * k) / 2, cy - (bh * k) / 2, bw * k, bh * k, `<g transform="${at}">${inner}</g>`, cx, cy);
  }
  if (softLook(mode)) s += `<rect width="400" height="300" fill="url(#glow${id})"/><rect width="400" height="300" fill="url(#vig${id})"/>`;
  return `<svg viewBox="0 0 400 300" class="bt-scene st-${mode}${opts.animated ? ' is-animated' : ''}" ${opts.label ? `role="img" aria-label="${opts.label.replace(/"/g, '&quot;')}"` : 'aria-hidden="true"'}>${s}</svg>`;
}
