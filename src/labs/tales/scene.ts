import { PLACES, type Place } from './catalog';
import { characterMarkup, isPet, type Look } from './character';
import { rng } from './generator';
import { STYLES, darken, styleFilters, stylizeShapes, type StyleMode } from './styles';

/**
 * Draws one story page as SVG (400 × 300): a backdrop built from the place's
 * colours and horizon, a few props, the characters and the page's "big thing".
 * Props and animals are system emoji, which on Apple devices sit naturally
 * beside Genmoji faces.
 */

const EMOJI_FONT = `'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif`;
const emoji = (e: string, x: number, y: number, size: number, extra = '') =>
  `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" dominant-baseline="central" font-family="${EMOJI_FONT}" ${extra}>${e}</text>`;

const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(k > 0 ? c + (255 - c) * k : c * (1 + k))));
  return `#${[f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
};

let uid = 0;

export function backdrop(p: Place, seed: number): string {
  const id = `sc${++uid}`;
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
  r.shuffle(p.props).slice(0, 3).forEach((e, i) => { const [x, y, z] = spots[(i + Math.floor(r.next() * 2)) % spots.length]; s += emoji(e, x, y, z, 'opacity=".95"'); });
  return s;
}

export interface SceneCharacter { look: Look; size?: 'small' | 'normal' }

/** A place drawn or uploaded by the family, used as a backdrop. */
export type DrawnPlace = Place & { image: string };

/** A place made from a photo: its illustrated image and where the horizon sits (0–1 from the top). */
export interface PhotoPlace { image: string; horizon: number }

/** A thing made from a photo, standing on the ground. */
export interface SceneThing { image: string; width: number; height: number; heightRatio: number; x: number }

/** How tall a grown-up stands in a 400 × 300 scene; things are sized against it. */
const PERSON_HEIGHT = 190;

/** A full story picture in an illustration mode. `chars[0]` is the star (drawn on the left). */
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
  animated?: boolean;
  label?: string;
  style?: StyleMode;
}): string {
  const mode = opts.style ?? 'pocketlight';
  const id = `s${++uid}`;
  const p = PLACES.find((x) => x.id === opts.placeId) ?? PLACES[0];
  const esc = (u: string) => u.replace(/"/g, '&quot;');
  let back: string;
  if (opts.photo) {
    // the picture stays put; its ground drifts gently in front of it, with a soft top edge, for depth
    const top = Math.max(0, opts.photo.horizon * 300 * 0.86), fade = 26;
    back = `<defs><linearGradient id="pf${id}" x1="0" x2="0" gradientUnits="userSpaceOnUse" y1="${top.toFixed(1)}" y2="${(top + fade).toFixed(1)}"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient>
        <mask id="pm${id}"><rect x="-20" y="${top.toFixed(1)}" width="440" height="${(300 - top).toFixed(1)}" fill="url(#pf${id})"/></mask></defs>
      <g class="bt-par bt-par-1"><image href="${esc(opts.photo.image)}" x="-10" y="-8" width="420" height="316" preserveAspectRatio="xMidYMid slice"/></g>
      <g class="bt-par bt-par-3" mask="url(#pm${id})"><image href="${esc(opts.photo.image)}" x="-10" y="-8" width="420" height="316" preserveAspectRatio="xMidYMid slice"/></g>`;
  } else if (opts.drawn) {
    back = `<rect width="400" height="300" fill="#fbf7f0"/><image href="${esc(opts.drawn.image)}" x="0" y="0" width="400" height="300" preserveAspectRatio="xMidYMid slice"/>`;
  } else {
    back = backdrop(p, opts.seed);
  }
  // the mode's background treatment
  const inkFor = (fill: string) => (fill.startsWith('#') && fill.length === 7 ? darken(fill, 0.35) : null);
  if (!opts.photo) {
    if (mode === 'gouache') back = `<g filter="url(#grain${id})">${stylizeShapes(back, 'gouache', id, inkFor)}</g>`;
    else if (mode === 'wondercut') back = `<g filter="url(#paper${id})">${stylizeShapes(back, 'wondercut', id, inkFor)}</g>`;
    else if (mode === 'inked') back = `<g filter="url(#bg${id})">${back}</g>`;
  }
  let s = `<defs>${styleFilters(mode, id)}</defs>${back}`;
  // things made from photos stand on the ground, sized against a grown-up
  (opts.things ?? []).forEach((t) => {
    const h = Math.max(22, Math.min(270, t.heightRatio * PERSON_HEIGHT));
    const w = (h * t.width) / t.height;
    const cx = t.x * 400, y = 292 - h;
    s += `<ellipse cx="${cx.toFixed(1)}" cy="292" rx="${(w * 0.42).toFixed(1)}" ry="${Math.max(3, h * 0.035).toFixed(1)}" fill="${STYLES[mode].palette.shadow}" opacity=".2"/>
      <image href="${esc(t.image)}" x="${(cx - w / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" filter="url(#img${id})"/>`;
  });
  const slots = opts.chars.length >= 3
    ? [{ x: 10, w: 132 }, { x: 140, w: 124 }, { x: 262, w: 124 }]
    : [{ x: 36, w: 156 }, { x: 214, w: 150 }];
  opts.chars.slice(0, slots.length).forEach((c, i) => {
    const slot = slots[i];
    const small = c.size === 'small' || isPet(c.look.kind);
    const w = small ? slot.w * 0.78 : slot.w;
    const h = w * 1.25;
    const x = slot.x + (slot.w - w) / 2;
    const y = 296 - h + (small ? 4 : 0);
    s += `<svg x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" viewBox="-20 -30 240 300" overflow="visible">${characterMarkup(c.look, { animated: opts.animated, style: mode })}</svg>`;
  });
  if (opts.focus) {
    const f = opts.focus;
    if (f.count) {
      const n = f.count, size = n > 3 ? 30 : 38, gap = size + 8, x0 = 200 - ((n - 1) * gap) / 2;
      s += `<g class="bt-focus">${Array.from({ length: n }, (_, i) => emoji(f.e, x0 + i * gap, 58 + (i % 2) * 10, size)).join('')}</g>`;
    } else if (f.faded) {
      s += `<g class="bt-focus" opacity=".9"><circle cx="200" cy="74" r="38" fill="#fff" opacity=".7"/>${emoji(f.e, 200, 74, 46, 'opacity=".35"')}${emoji('❓', 232, 46, 26)}</g>`;
    } else {
      s += `<g class="bt-focus">${emoji(f.e, 200, 76, 60)}</g>`;
    }
  }
  if (mode === 'pocketlight') s += `<rect width="400" height="300" fill="url(#glow${id})"/><rect width="400" height="300" fill="url(#vig${id})"/>`;
  return `<svg viewBox="0 0 400 300" class="bt-scene st-${mode}${opts.animated ? ' is-animated' : ''}" ${opts.label ? `role="img" aria-label="${opts.label.replace(/"/g, '&quot;')}"` : 'aria-hidden="true"'}>${s}</svg>`;
}
