import { exprOf, outfitColours, shade, type Expression, type HairStyle, type Look } from './character';
import type { StyleMode } from './styles';
import { thingArt } from './things';
import { featureCharacter } from './feature';

/**
 * Character designs: each look builds people its own way, like the difference
 * between two animation studios' films, not the same puppet in a different finish.
 *
 *  - Patchwork a handmade rag doll: a big cushion head, embroidered eyes, felt cheeks,
 *              a stitched smile, yarn hair in strands and loops, a soft sack body with a
 *              collar and buttons, tube limbs and mitten hands
 *  - Retro     mid-century shape design: grown-ups are blocks (square heads, boxy
 *              bodies, stick legs), kids are circles, eyes are dots, glasses are bold
 *              frames, hair is a flat graphic shape
 *  - Paper cut flat cut-paper pieces: a round head, scalloped hair, an A-line body,
 *              strip arms, each piece a little off-true like it was cut by hand
 *  - Sketchbook a loose picture-book drawing: tall lanky grown-ups with small egg heads,
 *              long necks, noses with character, big brows, scribbled hair, spindly limbs
 *              and big feet; round little ones
 *
 * Every design draws the same person: skin, hair colour and style, eye colour,
 * glasses, facial hair and freckles come from the Look, and the face proportions read
 * from a photo stretch the head and features. All designs are original; none copies a
 * character or a studio's model sheet. Each draws in the same 200 × 260 box as
 * character.ts, standing on y 252, so scenes, covers and avatars place them alike.
 */

export type DesignMode = StyleMode;
/** Every look except Tales builds its own characters. */
export const onTalesDrawing = (_m: StyleMode) => false;
export const hasDesign = (_m: StyleMode): _m is DesignMode => true;

/* ── shared helpers ─────────────────────────────────────── */
type Fam = 'none' | 'buzz' | 'tuft' | 'short' | 'side' | 'messy' | 'bob' | 'long' | 'curlyShort' | 'curlyLong' | 'afro' | 'bun' | 'pony' | 'pigtails' | 'sides';
const FAM: Record<HairStyle, Fam> = {
  tuft: 'tuft', buzz: 'buzz', crew: 'buzz', short: 'short', slick: 'short', sidepart: 'side', sweep: 'side', quiff: 'side', messy: 'messy', shag: 'messy', pixie: 'messy',
  bob: 'bob', bangs: 'bob', curtain: 'bob', lob: 'bob', long: 'long', wavy: 'long', halfup: 'long', locs: 'long', longcurly: 'curlyLong', curly: 'curlyShort', coils: 'curlyShort',
  twists: 'curlyShort', cornrows: 'curlyShort', afro: 'afro', puff: 'afro', bun: 'bun', topknot: 'bun', ponytail: 'pony', pigtails: 'pigtails', spacebuns: 'pigtails', braids: 'pigtails',
  bald: 'none', sides: 'sides',
};
const n1 = (v: number) => +v.toFixed(1);
const sh = (l: Look, k: string) => Math.max(-1, Math.min(1, (l.shape as Record<string, number> | undefined)?.[k] ?? 0));
const INK = '#2a201c';
type Mouth = 'smile' | 'grin' | 'open' | 'o' | 'flat' | 'wobbly' | 'tongue';
const mouthOf = (e: Expression): Mouth =>
  e === 'laugh' || e === 'starry' ? 'open' : e === 'grin' || e === 'proud' ? 'grin' : e === 'wow' ? 'o' : e === 'sleepy' ? 'o' : e === 'worried' ? 'wobbly' : e === 'silly' ? 'tongue' : e === 'shy' || e === 'dreamy' ? 'flat' : 'smile';
type EyeState = 'open' | 'closed' | 'wink' | 'sleepy' | 'wide';
const eyeOf = (e: Expression): EyeState => (e === 'laugh' || e === 'proud' ? 'closed' : e === 'wink' ? 'wink' : e === 'sleepy' || e === 'dreamy' ? 'sleepy' : e === 'wow' || e === 'starry' ? 'wide' : 'open');

interface Head { cx: number; cy: number; rx: number; ry: number; top: number; chin: number }
interface Arms { left: 'down' | 'up' | 'forward'; right: 'down' | 'up' | 'hold'; legs: 'stand' | 'walk' | 'run' | 'jump' | 'sit' | 'dance'; lift: number; lean: number }
function armsOf(l: Look): Arms {
  switch (l.action ?? 'stand') {
    case 'walk': return { left: 'down', right: 'down', legs: 'walk', lift: 0, lean: 2 };
    case 'run': return { left: 'forward', right: 'down', legs: 'run', lift: 2, lean: 8 };
    case 'jump': return { left: 'up', right: 'up', legs: 'jump', lift: 24, lean: 0 };
    case 'sit': return { left: 'down', right: 'hold', legs: 'sit', lift: -20, lean: 0 };
    case 'wave': return { left: 'up', right: 'hold', legs: 'stand', lift: 0, lean: 0 };
    case 'cheer': return { left: 'up', right: 'up', legs: 'stand', lift: 0, lean: 0 };
    case 'point': return { left: 'forward', right: 'hold', legs: 'stand', lift: 0, lean: 0 };
    case 'dance': return { left: 'up', right: 'up', legs: 'dance', lift: 4, lean: -5 };
    default: {
      const p = l.pose ?? 'stand';
      return { left: p === 'wave' || p === 'cheer' ? 'up' : p === 'point' ? 'forward' : 'down', right: p === 'cheer' ? 'up' : 'hold', legs: 'stand', lift: 0, lean: 0 };
    }
  }
}

/** A tapered limb from (x0,y0) to (x1,y1) with a gentle bend. */
function limb(x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, fill: string, bend = 0): string {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
  const mx = (x0 + x1) / 2 + nx * bend, my = (y0 + y1) / 2 + ny * bend;
  const a = [x0 + (nx * w0) / 2, y0 + (ny * w0) / 2], b = [x0 - (nx * w0) / 2, y0 - (ny * w0) / 2];
  const c = [x1 - (nx * w1) / 2, y1 - (ny * w1) / 2], d = [x1 + (nx * w1) / 2, y1 + (ny * w1) / 2];
  const wm = (w0 + w1) / 4;
  return `<path d="M${n1(a[0])} ${n1(a[1])} Q${n1(mx + nx * wm)} ${n1(my + ny * wm)} ${n1(d[0])} ${n1(d[1])} A${n1(w1 / 2)} ${n1(w1 / 2)} 0 0 1 ${n1(c[0])} ${n1(c[1])} Q${n1(mx - nx * wm)} ${n1(my - ny * wm)} ${n1(b[0])} ${n1(b[1])} A${n1(w0 / 2)} ${n1(w0 / 2)} 0 0 1 ${n1(a[0])} ${n1(a[1])} Z" fill="${fill}"/>`;
}
/** Where a hand ends up for an arm pose, from a shoulder, for an arm of length `len` (side −1 left, 1 right). */
function handAt(sx: number, sy: number, len: number, side: -1 | 1, pose: 'down' | 'up' | 'forward' | 'hold'): [number, number, number] {
  switch (pose) {
    case 'up': return [sx + side * len * 0.42, sy - len * 0.9, -side * 4];
    case 'forward': return [sx + side * len * 0.95, sy - len * 0.12, 0];
    case 'hold': return [sx + side * len * 0.5, sy + len * 0.72, side * 10];
    default: return [sx + side * len * 0.34, sy + len * 0.92, side * 4];
  }
}
function legsAt(cx: number, hipY: number, footY: number, gap: number, kind: Arms['legs']): [[number, number, number, number], [number, number, number, number]] {
  // [hipX, hipY, footX, footY] for left and right
  const L = footY - hipY;
  switch (kind) {
    case 'walk': return [[cx - gap, hipY, cx - gap - L * 0.28, footY], [cx + gap, hipY, cx + gap + L * 0.22, footY]];
    case 'run': return [[cx - gap, hipY, cx - gap - L * 0.5, footY - L * 0.3], [cx + gap, hipY, cx + gap + L * 0.45, footY - L * 0.12]];
    case 'jump': return [[cx - gap, hipY, cx - gap - L * 0.3, footY - L * 0.2], [cx + gap, hipY, cx + gap + L * 0.3, footY - L * 0.2]];
    case 'sit': return [[cx - gap, hipY, cx - gap - L * 0.75, hipY + L * 0.3], [cx + gap, hipY, cx + gap + L * 0.75, hipY + L * 0.3]];
    case 'dance': return [[cx - gap, hipY, cx - gap - L * 0.1, footY], [cx + gap, hipY, cx + gap + L * 0.7, hipY + L * 0.55]];
    default: return [[cx - gap, hipY, cx - gap, footY], [cx + gap, hipY, cx + gap, footY]];
  }
}

/* ── hats (simple versions, sized to each design's head) ─── */
function hat(l: Look, h: Head, flat: boolean): string {
  const w = h.rx, top = h.top, gold = '#e7b43c', c = l.accent ?? '#d9644a';
  const st = flat ? '' : ` stroke="${shade(c, -0.35)}" stroke-width="1.6"`;
  switch (l.hat) {
    case 'crown': return `<path d="M${n1(h.cx - w * 0.62)} ${n1(top + 6)} L${n1(h.cx - w * 0.66)} ${n1(top - 20)} L${n1(h.cx - w * 0.33)} ${n1(top - 6)} L${h.cx} ${n1(top - 26)} L${n1(h.cx + w * 0.33)} ${n1(top - 6)} L${n1(h.cx + w * 0.66)} ${n1(top - 20)} L${n1(h.cx + w * 0.62)} ${n1(top + 6)} Z" fill="${gold}" stroke="#a87b1e" stroke-width="1.6" stroke-linejoin="round"/><circle cx="${h.cx}" cy="${n1(top - 4)}" r="4" fill="#d9534f"/>`;
    case 'tiara': return `<path d="M${n1(h.cx - w * 0.5)} ${n1(top + 8)} Q${h.cx} ${n1(top - 4)} ${n1(h.cx + w * 0.5)} ${n1(top + 8)} L${n1(h.cx + w * 0.3)} ${n1(top + 2)} L${h.cx} ${n1(top - 14)} L${n1(h.cx - w * 0.3)} ${n1(top + 2)} Z" fill="${gold}" stroke="#a87b1e" stroke-width="1.4"/><circle cx="${h.cx}" cy="${n1(top - 4)}" r="3" fill="#7fb6e0"/>`;
    case 'party': case 'wizard': return `<path d="M${n1(h.cx - w * 0.42)} ${n1(top + 8)} L${n1(h.cx + 6)} ${n1(top - 46)} L${n1(h.cx + w * 0.46)} ${n1(top + 8)} Z" fill="${l.hat === 'wizard' ? '#4a4f9a' : c}"${st}/><circle cx="${n1(h.cx + 6)}" cy="${n1(top - 46)}" r="6" fill="${gold}"/>`;
    case 'cap': case 'capback': case 'propeller': case 'visor': {
      const fw = l.hat === 'capback' ? -1 : 1;
      return `<path d="M${n1(h.cx - w * 0.95)} ${n1(top + h.ry * 0.36)} Q${n1(h.cx - w * 0.95)} ${n1(top - 6)} ${h.cx} ${n1(top - 8)} Q${n1(h.cx + w * 0.95)} ${n1(top - 6)} ${n1(h.cx + w * 0.95)} ${n1(top + h.ry * 0.36)} Z" fill="${c}"${st}/><path d="M${n1(h.cx + fw * w * 0.4)} ${n1(top + h.ry * 0.34)} Q${n1(h.cx + fw * w * 1.5)} ${n1(top + h.ry * 0.3)} ${n1(h.cx + fw * w * 1.45)} ${n1(top + h.ry * 0.42)} L${n1(h.cx + fw * w * 0.4)} ${n1(top + h.ry * 0.42)} Z" fill="${shade(c, -0.15)}"/>`;
    }
    case 'beanie': case 'earmuffs': return `<path d="M${n1(h.cx - w * 0.98)} ${n1(top + h.ry * 0.42)} Q${n1(h.cx - w)} ${n1(top - 10)} ${h.cx} ${n1(top - 12)} Q${n1(h.cx + w)} ${n1(top - 10)} ${n1(h.cx + w * 0.98)} ${n1(top + h.ry * 0.42)} Z" fill="${c}"${st}/><rect x="${n1(h.cx - w)}" y="${n1(top + h.ry * 0.3)}" width="${n1(w * 2)}" height="${n1(h.ry * 0.18)}" rx="6" fill="${shade(c, -0.18)}"/><circle cx="${h.cx}" cy="${n1(top - 14)}" r="9" fill="${shade(c, 0.4)}"/>`;
    case 'sunhat': case 'bucket': case 'brimhat': case 'cowboy': return `<ellipse cx="${h.cx}" cy="${n1(top + h.ry * 0.2)}" rx="${n1(w * 1.55)}" ry="${n1(h.ry * 0.16)}" fill="${l.hat === 'sunhat' ? '#f2d58a' : '#b08a5a'}"${st}/><path d="M${n1(h.cx - w * 0.78)} ${n1(top + h.ry * 0.2)} Q${n1(h.cx - w * 0.8)} ${n1(top - 18)} ${h.cx} ${n1(top - 20)} Q${n1(h.cx + w * 0.8)} ${n1(top - 18)} ${n1(h.cx + w * 0.78)} ${n1(top + h.ry * 0.2)} Z" fill="${l.hat === 'sunhat' ? '#f2d58a' : '#b08a5a'}"${st}/><rect x="${n1(h.cx - w * 0.78)}" y="${n1(top + h.ry * 0.06)}" width="${n1(w * 1.56)}" height="6" fill="${c}"/>`;
    case 'bow': return `<g transform="translate(${n1(h.cx + w * 0.55)} ${n1(top + 8)})"><path d="M0 0 L-16 -10 L-16 10 Z M0 0 L16 -10 L16 10 Z" fill="${c}"/><circle r="5" fill="${shade(c, -0.15)}"/></g>`;
    case 'flowers': case 'circlet': case 'laurel': {
      const k = l.hat === 'flowers' ? ['#f6b6c8', '#f2c14e', '#ffffff', '#b9a5e3'] : l.hat === 'laurel' ? [gold] : ['#7fae5f'];
      return Array.from({ length: 7 }, (_, i) => { const a = Math.PI + (i / 6) * Math.PI; return `<circle cx="${n1(h.cx + Math.cos(a) * w * 0.9)}" cy="${n1(h.cy + Math.sin(a) * h.ry * 0.82)}" r="${l.hat === 'flowers' ? 6 : 4.5}" fill="${k[i % k.length]}"/>`; }).join('');
    }
    case 'bunny': case 'catears': return [-1, 1].map((sd) => `<ellipse cx="${n1(h.cx + sd * w * 0.45)}" cy="${n1(top - 18)}" rx="8" ry="${l.hat === 'bunny' ? 22 : 12}" fill="#f5f1ea" transform="rotate(${sd * 12} ${n1(h.cx + sd * w * 0.45)} ${n1(top - 4)})"/>`).join('');
    case 'none': default: return '';
  }
}

/* ── glasses and facial hair, sized to the eyes ───────────── */
function specs(l: Look, ex: number, ey: number, r: number, gap: number, square: boolean, col = INK): string {
  if (!l.glasses || l.glasses === 'none') return '';
  const sun = l.glasses === 'sun';
  const lens = (cx: number) => (square || l.glasses === 'square'
    ? `<rect x="${n1(cx - r)}" y="${n1(ey - r * 0.82)}" width="${n1(r * 2)}" height="${n1(r * 1.64)}" rx="${n1(r * 0.3)}" fill="${sun ? '#2a2f3a' : '#ffffff'}" fill-opacity="${sun ? 0.9 : 0.12}" stroke="${col}" stroke-width="${n1(Math.max(2.2, r * 0.18))}"/>`
    : `<circle cx="${n1(cx)}" cy="${n1(ey)}" r="${n1(r)}" fill="${sun ? '#2a2f3a' : '#ffffff'}" fill-opacity="${sun ? 0.9 : 0.12}" stroke="${col}" stroke-width="${n1(Math.max(2.2, r * 0.16))}"/>`);
  return `${lens(ex - gap)}${lens(ex + gap)}<path d="M${n1(ex - gap + r)} ${n1(ey)} Q${ex} ${n1(ey - r * 0.3)} ${n1(ex + gap - r)} ${n1(ey)}" stroke="${col}" stroke-width="2.2" fill="none"/>`;
}
/* ── appealing eyes, drawn in each look's own way ─────────── */
type EyeStyle = 'retro' | 'paper' | 'doll' | 'sketch';
/**
 * An almond eye under a strong upper lash line with a bright glint, the face turned a
 * little to the right: `side` −1 is the near eye (bigger), 1 the far eye (a touch
 * narrower). Each look draws it in its own medium: Retro a graphic dark pupil, Paper cut
 * a cut-paper lid over a coloured iris, Patchwork a glossy doll's eye with stitched
 * lashes, Sketchbook a pencil-drawn eye.
 */
function appealEye(id: string, x: number, y: number, w0: number, side: -1 | 1, style: EyeStyle, l: Look, state: EyeState, ink: string): string {
  const w = w0 * (side > 0 ? 0.86 : 1), o = side;
  const hK = style === 'doll' ? 0.92 : l.kind === 'baby' ? 0.92 : l.kind === 'kid' ? 0.84 : 0.72;
  const h = w * hK * (state === 'wide' ? 1.2 : 1);
  const xi = x - o * w * 0.5, yi = y + h * 0.06, xo = x + o * w * 0.52, yo = y - h * 0.02;
  const up: [number, number] = [x - o * w * 0.06, y - h * 0.82], lo: [number, number] = [x + o * w * 0.04, y + h * 0.66];
  const lid = `M${n1(xi)} ${n1(yi)} Q${n1(up[0])} ${n1(up[1])} ${n1(xo)} ${n1(yo)}`;
  const shape = `${lid} Q${n1(lo[0])} ${n1(lo[1])} ${n1(xi)} ${n1(yi)} Z`;
  const lw = style === 'sketch' ? 2 : 2.5;
  const eyeCol = l.eyes ?? '#5a3a22';
  if (state === 'closed' || (state === 'wink' && side > 0) || state === 'sleepy') {
    const dip = state === 'sleepy' ? h * 0.15 : -h * 0.55;
    return `<path d="M${n1(xi)} ${n1(y)} Q${n1(x)} ${n1(y + dip)} ${n1(xo)} ${n1(y)}" stroke="${ink}" stroke-width="${lw}" fill="none" stroke-linecap="round"/>${l.lashes ? `<path d="M${n1(xo)} ${n1(y)} l${n1(o * 3)} 1.5" stroke="${ink}" stroke-width="1.6" stroke-linecap="round"/>` : ''}`;
  }
  const cid = `ae${id}${side < 0 ? 'n' : 'f'}`;
  const ix = x + w * 0.08, iy = y + h * 0.06;
  let inside: string;
  switch (style) {
    case 'retro': // a big dark oval pupil, mid-century style
      inside = `<ellipse cx="${n1(ix)}" cy="${n1(iy)}" rx="${n1(h * 0.42)}" ry="${n1(h * 0.54)}" fill="${shade(eyeCol, -0.55)}"/><circle cx="${n1(ix - h * 0.15)}" cy="${n1(iy - h * 0.2)}" r="${n1(h * 0.16)}" fill="#fff"/>`;
      break;
    case 'doll': { // glossy: a big iris with a dark rim, two glints
      const r = h * 0.6;
      inside = `<circle cx="${n1(ix)}" cy="${n1(iy)}" r="${n1(r)}" fill="${shade(eyeCol, -0.35)}"/><circle cx="${n1(ix)}" cy="${n1(iy)}" r="${n1(r * 0.82)}" fill="${eyeCol}"/><ellipse cx="${n1(ix)}" cy="${n1(iy + r * 0.4)}" rx="${n1(r * 0.55)}" ry="${n1(r * 0.3)}" fill="${shade(eyeCol, 0.4)}"/><circle cx="${n1(ix)}" cy="${n1(iy)}" r="${n1(r * 0.4)}" fill="#1a110e"/><circle cx="${n1(ix - r * 0.38)}" cy="${n1(iy - r * 0.4)}" r="${n1(r * 0.32)}" fill="#fff"/><circle cx="${n1(ix + r * 0.36)}" cy="${n1(iy + r * 0.32)}" r="${n1(r * 0.14)}" fill="#fff"/>`;
      break;
    }
    default: { // paper and sketch: a coloured iris, a dark pupil, a glint
      const r = h * 0.54;
      inside = `<circle cx="${n1(ix)}" cy="${n1(iy)}" r="${n1(r)}" fill="${eyeCol}"/><circle cx="${n1(ix)}" cy="${n1(iy)}" r="${n1(r * 0.45)}" fill="#1a110e"/><circle cx="${n1(ix - r * 0.38)}" cy="${n1(iy - r * 0.42)}" r="${n1(r * 0.3)}" fill="#fff"/>`;
    }
  }
  // the lid: a stroke of ink, or (paper) a cut crescent of dark paper
  const lidMark = style === 'paper'
    ? `<path d="${lid} Q${n1(up[0])} ${n1(up[1] + h * 0.42)} ${n1(xi)} ${n1(yi)} Z" fill="${ink}"/><path d="M${n1(xo)} ${n1(yo)} L${n1(xo + o * 4.2)} ${n1(yo - 3.4)} L${n1(xo - o * 1.4)} ${n1(yo - 1.8)} Z" fill="${ink}"/>`
    : `<path d="${lid}" stroke="${ink}" stroke-width="${lw}" fill="none" stroke-linecap="round"/>` + (style === 'doll'
      ? [0.15, 0.5, 0.85].map((t) => { const px = xi + (xo - xi) * t, py = y - h * (0.62 + 0.2 * Math.sin(t * Math.PI)); return `<path d="M${n1(px)} ${n1(py + 1)} l${n1(o * (1 + t * 2))} -3.2" stroke="${ink}" stroke-width="1.5" stroke-linecap="round"/>`; }).join('')
      : `<path d="M${n1(xo - o)} ${n1(yo)} q${n1(o * 3.5)} -1 ${n1(o * 5.5)} ${l.lashes ? -4.5 : -1.5}" stroke="${ink}" stroke-width="${l.lashes ? 2 : 1.6}" fill="none" stroke-linecap="round"/>`);
  const lower = style === 'sketch' ? `<path d="M${n1(xo)} ${n1(yo)} Q${n1(lo[0])} ${n1(lo[1])} ${n1(xi)} ${n1(yi)}" stroke="${ink}" stroke-width="0.9" fill="none" opacity=".6"/>` : '';
  const sleepyLid = '';
  return `<clipPath id="${cid}"><path d="${shape}"/></clipPath><path d="${shape}" fill="#fbf8f2" fill-opacity="1"/><g clip-path="url(#${cid})">${inside}</g>${lidMark}${lower}${sleepyLid}`;
}
const facialOf = (l: Look) => (l.kind === 'adult' || l.kind === 'elder' ? (l.facial ?? (l.beard ? 'trim' : 'none')) : 'none');

/* ── outfit pieces ───────────────────────────────────────── */
function clothes(l: Look) {
  const o = outfitColours(l);
  const skirt = o.skirt;
  const legs = o.bottom || l.skin;
  const sleeve = o.sleeve === 'none' ? l.skin : o.top;
  const longSkirt = l.outfit === 'gown' || l.outfit === 'sunrobe';
  return { top: o.top === 'none' ? '#f7f2ea' : o.top, sleeve, legs, skirt, shoes: o.shoes || shade(l.skin, -0.1), longSkirt, cape: l.outfit === 'cloak' || l.outfit === 'ftunic' || l.outfit === 'hero' ? shade(l.accent ?? o.top, -0.25) : '' };
}
/** Horizontal stripes for the stripes outfit, clipped to a shape. */
const stripes = (l: Look, id: string, clip: string, y0: number, y1: number) =>
  l.outfit === 'stripes' || l.outfit === 'sailor' || l.outfit === 'jersey'
    ? `<clipPath id="st${id}">${clip}</clipPath><g clip-path="url(#st${id})">${Array.from({ length: Math.ceil((y1 - y0) / 14) }, (_, i) => `<rect x="0" y="${n1(y0 + i * 14 + 7)}" width="200" height="6" fill="${l.outfit === 'stripes' ? '#4a76c4' : l.outfit === 'sailor' ? '#2f4a7a' : '#f3f1ec'}" opacity=".85"/>`).join('')}</g>`
    : '';

const held = (l: Look, x: number, y: number) => (l.hold ? thingArt(l.hold, x, y - 16, 46) : '');

/* ═══════════════════════ PATCHWORK: RAG DOLL ═══════════════════════ */
/** A point and the unit normal on a quadratic curve, for stitches across a stitched line. */
function qAt(p0: [number, number], p1: [number, number], p2: [number, number], t: number): [number, number, number, number] {
  const u = 1 - t;
  const x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1];
  const dx = 2 * u * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]), dy = 2 * u * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
  const len = Math.hypot(dx, dy) || 1;
  return [x, y, -dy / len, dx / len];
}
/** A stitched line: the thread, with little cross-stitches along it. */
function stitched(p0: [number, number], p1: [number, number], p2: [number, number], col: string, w = 2.4, ticks = 3, tick = 4): string {
  let s = `<path d="M${n1(p0[0])} ${n1(p0[1])} Q${n1(p1[0])} ${n1(p1[1])} ${n1(p2[0])} ${n1(p2[1])}" stroke="${col}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
  for (let i = 0; i < ticks; i++) {
    const [x, y, nx, ny] = qAt(p0, p1, p2, (i + 1) / (ticks + 1));
    s += `<path d="M${n1(x - nx * tick)} ${n1(y - ny * tick)} L${n1(x + nx * tick)} ${n1(y + ny * tick)}" stroke="${col}" stroke-width="${n1(w * 0.75)}" stroke-linecap="round"/>`;
  }
  return s;
}

function ragdoll(l: Look, id: string): { svg: string; head: Head } {
  const k = l.kind as 'baby' | 'kid' | 'adult' | 'elder';
  const grown = k === 'adult' || k === 'elder';
  const fw = 1 + 0.08 * sh(l, 'faceWidth'), fl = 1 + 0.06 * sh(l, 'faceLength');
  // a soft toy: a big cushion head, a little sack body, stubby tube limbs; grown-ups are taller dolls
  const P = {
    baby: { hw: 54, hh: 48, torso: [156, 214], tw: [50, 68], legW: 19, arm: 34 },
    kid: { hw: 45, hh: 41, torso: [134, 206], tw: [44, 62], legW: 17, arm: 44 },
    adult: { hw: 40, hh: 38, torso: [108, 204], tw: [48, 64], legW: 16, arm: 58 },
    elder: { hw: 42, hh: 37, torso: [112, 204], tw: [54, 72], legW: 16, arm: 54 },
  }[k];
  const hw = P.hw * fw, hh = P.hh * fl, cx = 100, top = P.torso[0] - hh * 2 + 8, cy = top + hh;
  const head: Head = { cx, cy, rx: hw, ry: hh, top, chin: top + hh * 2 };
  const C = clothes(l), A = armsOf(l), ex = exprOf(l);
  const j = 1 + 0.07 * sh(l, 'jaw');
  // cushion head: a soft squircle, plumpest at the cheeks
  const headPath = `M${cx} ${n1(top)} C${n1(cx + hw * 0.82)} ${n1(top)} ${n1(cx + hw)} ${n1(top + hh * 0.28)} ${n1(cx + hw)} ${n1(cy)} C${n1(cx + hw * j)} ${n1(cy + hh * 0.72)} ${n1(cx + hw * 0.72)} ${n1(top + hh * 2)} ${cx} ${n1(top + hh * 2)} C${n1(cx - hw * 0.72)} ${n1(top + hh * 2)} ${n1(cx - hw * j)} ${n1(cy + hh * 0.72)} ${n1(cx - hw)} ${n1(cy)} C${n1(cx - hw)} ${n1(top + hh * 0.28)} ${n1(cx - hw * 0.82)} ${n1(top)} ${cx} ${n1(top)} Z`;
  const thread = '#6e2f2b';
  // embroidered eyes: a disc of eye colour, a dark centre, one bright glint
  const er = (k === 'baby' ? 6.6 : k === 'kid' ? 6 : 5.2) * (1 + 0.1 * sh(l, 'eyeSize'));
  const eY = cy + hh * 0.06, eGap = hw * 0.4 + 2 * sh(l, 'eyeGap');
  const es = eyeOf(ex);
  const eye = (x: number, side: number) => {
    if (es === 'closed' || (es === 'wink' && side > 0) || es === 'sleepy')
      return stitched([x - er * 1.2, eY], [x, eY + (es === 'sleepy' ? er * 0.4 : -er * 1.3)], [x + er * 1.2, eY], '#2a1d18', 2.2, 2, 2.6);
    const r = er * (es === 'wide' ? 1.2 : 1);
    const lash = l.lashes ? `<path d="M${n1(x + side * r * 0.7)} ${n1(eY - r * 0.7)} l${n1(side * 4)} -4" stroke="#2a1d18" stroke-width="1.8" stroke-linecap="round"/>` : '';
    return `<circle cx="${n1(x)}" cy="${n1(eY)}" r="${n1(r)}" fill="${l.eyes ?? '#5a3a22'}"/><circle cx="${n1(x)}" cy="${n1(eY + r * 0.08)}" r="${n1(r * 0.58)}" fill="#1d1512"/><circle cx="${n1(x - r * 0.3)}" cy="${n1(eY - r * 0.34)}" r="${n1(r * 0.26)}" fill="#fff"/>${lash}`;
  };
  const brows = es === 'closed' ? '' : [-1, 1].map((sd) => {
    const bx = cx + sd * eGap, by = eY - er * 2.3 + (ex === 'worried' ? -2 : 0);
    const tilt = ex === 'worried' ? -3 : ex === 'brave' || ex === 'proud' ? 3 : 0;
    return `<path d="M${n1(bx - er)} ${n1(by + sd * tilt)} Q${n1(bx)} ${n1(by - 3)} ${n1(bx + er)} ${n1(by - sd * tilt)}" stroke="${shade(l.hair, -0.15)}" stroke-width="${k === 'baby' ? 2.2 : 3}" fill="none" stroke-linecap="round"/>`;
  }).join('');
  // round felt cheeks, sewn on
  const cheeks = [-1, 1].map((sd) => `<circle cx="${n1(cx + sd * hw * 0.62)}" cy="${n1(eY + hh * 0.3)}" r="${n1(hw * 0.15)}" fill="#f29c96"/>`).join('');
  const nz = 1 + 0.18 * sh(l, 'nose');
  const nose = `<ellipse cx="${cx}" cy="${n1(eY + hh * 0.2)}" rx="${n1((grown ? 4.6 : 3.2) * nz)}" ry="${n1((grown ? 3.8 : 2.6) * nz)}" fill="${shade(l.skin, -0.14)}"/>`;
  // a stitched mouth
  const mY = eY + hh * (grown ? 0.44 : 0.4), mW = hw * 0.26 * (1 + 0.1 * sh(l, 'mouth'));
  const mk = mouthOf(ex);
  const mouth = mk === 'open' || mk === 'grin' || mk === 'tongue'
    ? `<path d="M${n1(cx - mW)} ${n1(mY)} Q${cx} ${n1(mY + mW * 1.1)} ${n1(cx + mW)} ${n1(mY)} Z" fill="#8a3434"/>${mk === 'tongue' ? `<ellipse cx="${n1(cx + 2)}" cy="${n1(mY + mW * 0.5)}" rx="${n1(mW * 0.35)}" ry="${n1(mW * 0.25)}" fill="#ef7f8a"/>` : ''}<path d="M${n1(cx - mW - 2)} ${n1(mY - 1)} Q${cx} ${n1(mY + mW * 1.2)} ${n1(cx + mW + 2)} ${n1(mY - 1)}" stroke="${thread}" stroke-width="2" fill="none" stroke-dasharray="3 2.4" stroke-linecap="round"/>`
    : mk === 'o' ? `<circle cx="${cx}" cy="${n1(mY + 3)}" r="${n1(mW * 0.32)}" fill="#8a3434"/>`
    : mk === 'flat' || mk === 'wobbly' ? stitched([cx - mW * 0.7, mY + 2], [cx, mY + (mk === 'wobbly' ? -2 : 2)], [cx + mW * 0.7, mY + 2], thread, 2.6, 0, 0)
    // the classic rag-doll smile: one curve of thread with a little stitch at each end
    : `<path d="M${n1(cx - mW)} ${n1(mY)} Q${cx} ${n1(mY + mW * 0.75)} ${n1(cx + mW)} ${n1(mY)}" stroke="${thread}" stroke-width="2.8" fill="none" stroke-linecap="round"/>${[-1, 1].map((sd) => `<path d="M${n1(cx + sd * (mW + 1))} ${n1(mY - 3.5)} l${n1(sd * -1.5)} 6" stroke="${thread}" stroke-width="2.2" stroke-linecap="round"/>`).join('')}`;
  // yarn hair: thick strands and loops of wool with a twist running along them
  const fam = FAM[l.hairStyle] ?? 'short', hc = l.hair, hl = shade(hc, 0.28), hd = shade(hc, -0.2);
  const strand = (d: string, w = 7) => `<path d="${d}" stroke="${hc}" stroke-width="${w}" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${hl}" stroke-width="${n1(w * 0.22)}" fill="none" stroke-dasharray="2.5 4" stroke-linecap="round" opacity=".7"/>`;
  const loop = (x: number, y: number, r: number) => `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r)}" fill="${hc}"/><circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r * 0.5)}" fill="none" stroke="${hd}" stroke-width="${n1(Math.max(1.2, r * 0.22))}"/>`;
  const fringe = (n: number, r: number, a0 = 200, a1 = 340, lift = 0.94) => Array.from({ length: n }, (_, i) => {
    const a = ((a0 + ((a1 - a0) * i) / (n - 1)) * Math.PI) / 180;
    return loop(cx + Math.cos(a) * hw * lift, cy + Math.sin(a) * hh * lift, r);
  }).join('');
  const dome = `<path d="M${n1(cx - hw * 1.02)} ${n1(cy - hh * 0.12)} C${n1(cx - hw * 1.05)} ${n1(top - hh * 0.2)} ${n1(cx + hw * 1.05)} ${n1(top - hh * 0.2)} ${n1(cx + hw * 1.02)} ${n1(cy - hh * 0.12)} Q${cx} ${n1(top + hh * 0.42)} ${n1(cx - hw * 1.02)} ${n1(cy - hh * 0.12)} Z" fill="${hc}"/>`;
  const bow = (x: number, y: number) => `<g transform="translate(${n1(x)} ${n1(y)})"><path d="M0 0 L-9 -6 L-9 6 Z M0 0 L9 -6 L9 6 Z" fill="${l.accent ?? '#e06a6a'}"/><circle r="3" fill="${shade(l.accent ?? '#e06a6a', -0.2)}"/></g>`;
  let back = '', front = '';
  const lr = hw * 0.15;
  switch (fam) {
    case 'none': break;
    case 'sides': front = [-1, 1].map((sd) => loop(cx + sd * hw * 0.98, cy - hh * 0.2, lr) + loop(cx + sd * hw * 1.02, cy, lr * 0.9)).join(''); break;
    case 'tuft': front = strand(`M${cx} ${n1(top + 4)} q-3 -14 8 -16 q10 -1 7 9 q-3 6 -9 2`, 5); break;
    case 'buzz': front = `${dome.replace('fill=', 'opacity=".75" fill=')}`; break;
    case 'short': case 'side': case 'messy':
      front = `${dome}${fam === 'side' ? fringe(6, lr, 196, 300) + strand(`M${n1(cx - hw * 0.1)} ${n1(top + 2)} Q${n1(cx + hw * 0.7)} ${n1(top + hh * 0.05)} ${n1(cx + hw * 0.95)} ${n1(cy - hh * 0.3)}`, 9) : fringe(fam === 'messy' ? 8 : 7, lr)}${fam === 'messy' ? loop(cx - hw * 0.3, top - 4, lr * 1.1) + loop(cx + hw * 0.25, top - 6, lr) : ''}`;
      break;
    case 'bob': case 'long': case 'curlyLong': {
      const len = fam === 'bob' ? cy + hh * 0.75 : P.torso[0] + 46;
      // strands from a centre parting, over the head and down past the face
      back = [-1, 1].map((sd) => Array.from({ length: 6 }, (_, i) => {
        const x0 = cx + sd * (2 + i * hw * 0.16), x1 = cx + sd * hw * (0.62 + i * 0.1);
        return strand(`M${n1(x0)} ${n1(top - 1 + i * 2)} Q${n1(cx + sd * hw * (1.25 + i * 0.03))} ${n1(cy - hh * 0.2)} ${n1(x1)} ${n1(len - (i % 2) * 6)}`, 9);
      }).join('')).join('') + (fam === 'curlyLong' ? [-1, 1].map((sd) => [0, 1, 2].map((i) => loop(cx + sd * hw * (0.75 + i * 0.12), len - 4 + (i % 2) * 6, lr * 1.1)).join('')).join('') : '');
      front = [-1, 1].map((sd) => Array.from({ length: 4 }, (_, i) => strand(`M${n1(cx + sd * 2)} ${n1(top + 1)} Q${n1(cx + sd * hw * (0.45 + i * 0.12))} ${n1(top + hh * (0.05 + i * 0.02))} ${n1(cx + sd * hw * (0.9 + i * 0.03))} ${n1(cy - hh * (0.28 - i * 0.12))}`, 8)).join('')).join('')
        + (l.hairStyle === 'bangs' ? fringe(5, lr, 220, 320, 0.7) : '');
      break;
    }
    case 'curlyShort': case 'afro': {
      const n = fam === 'afro' ? 14 : 11, R = fam === 'afro' ? 1.22 : 1.02, r = fam === 'afro' ? hw * 0.26 : hw * 0.19;
      back = Array.from({ length: n }, (_, i) => { const a = Math.PI * (0.9 + (i / (n - 1)) * 1.2); return loop(cx + Math.cos(a) * hw * R, cy - hh * 0.05 + Math.sin(a) * hh * R, r); }).join('')
        + (fam === 'afro' ? `<ellipse cx="${cx}" cy="${n1(cy - hh * 0.35)}" rx="${n1(hw * 1.1)}" ry="${n1(hh * 0.9)}" fill="${hc}"/>` + Array.from({ length: 5 }, (_, i) => loop(cx - hw * 0.7 + i * hw * 0.35, top - hh * 0.2 + (i % 2) * 8, r * 0.9)).join('') : '');
      front = fringe(7, lr * 1.05, 205, 335, 0.9);
      break;
    }
    case 'bun': back = `<circle cx="${cx}" cy="${n1(top - hh * 0.22)}" r="${n1(hw * 0.36)}" fill="${hc}"/>${[0.5, 0.8].map((f) => `<path d="M${n1(cx - hw * 0.36 * f)} ${n1(top - hh * 0.22)} A${n1(hw * 0.36 * f)} ${n1(hw * 0.36 * f)} 0 1 1 ${n1(cx + hw * 0.36 * f)} ${n1(top - hh * 0.22)}" stroke="${hd}" stroke-width="1.6" fill="none"/>`).join('')}`; front = dome + fringe(7, lr); break;
    case 'pony': back = [0, 1, 2].map((i) => strand(`M${n1(cx + hw * 0.7)} ${n1(top + hh * 0.2)} Q${n1(cx + hw * (1.45 + i * 0.08))} ${n1(cy - hh * 0.1)} ${n1(cx + hw * (1.05 + i * 0.1))} ${n1(cy + hh * 0.9)}`, 8)).join('') + bow(cx + hw * 0.92, top + hh * 0.22); front = dome + fringe(7, lr); break;
    case 'pigtails': back = [-1, 1].map((sd) => [0, 1, 2].map((i) => strand(`M${n1(cx + sd * hw * 0.9)} ${n1(cy - hh * 0.4)} Q${n1(cx + sd * hw * (1.45 + i * 0.06))} ${n1(cy - hh * 0.25)} ${n1(cx + sd * hw * (1.2 + i * 0.12))} ${n1(cy + hh * 0.7)}`, 8)).join('') + bow(cx + sd * hw * 1.05, cy - hh * 0.38)).join(''); front = dome + fringe(7, lr); break;
  }
  const fh = facialOf(l);
  const beard = fh === 'full' || fh === 'trim' ? Array.from({ length: 9 }, (_, i) => { const a = Math.PI * (0.12 + (i / 8) * 0.76); return loop(cx + Math.cos(a) * hw * 0.82, cy + Math.sin(a) * hh * 0.92, lr * 1.05); }).join('') : '';
  const stache = fh !== 'none' && fh !== 'stubble' ? [-1, 1].map((sd) => strand(`M${cx} ${n1(mY - 5)} q${n1(sd * mW * 0.7)} -6 ${n1(sd * mW * 1.2)} 2`, 6)).join('') : '';
  const freck = l.freckles ? [-1, 1].flatMap((sd) => [0, 1, 2].map((i) => `<path d="M${n1(cx + sd * (hw * 0.5 + i * 3.4))} ${n1(eY + hh * 0.16 + (i % 2) * 3)} l1.6 1.6" stroke="${shade(l.skin, -0.32)}" stroke-width="1.4" stroke-linecap="round"/>`)).join('') : '';
  // body: a soft sack with a felt collar and two big buttons; tube limbs, mitten hands, round shoes
  const [ty0, ty1] = P.torso, [tw0, tw1] = P.tw;
  const torso = `M${n1(cx - tw0 / 2)} ${ty0 + 8} Q${n1(cx - tw0 / 2)} ${ty0} ${cx} ${ty0 - 2} Q${n1(cx + tw0 / 2)} ${ty0} ${n1(cx + tw0 / 2)} ${ty0 + 8} C${n1(cx + tw1 / 2 + 5)} ${n1((ty0 + ty1) / 2)} ${n1(cx + tw1 / 2 + 2)} ${ty1 - 2} ${n1(cx + tw1 / 2 - 6)} ${ty1 + 2} Q${cx} ${ty1 + 8} ${n1(cx - tw1 / 2 + 6)} ${ty1 + 2} C${n1(cx - tw1 / 2 - 2)} ${ty1 - 2} ${n1(cx - tw1 / 2 - 5)} ${n1((ty0 + ty1) / 2)} ${n1(cx - tw0 / 2)} ${ty0 + 8} Z`;
  const footY = 244, hipY = ty1 - 6;
  const [lg, rg] = legsAt(cx, hipY, footY, tw1 * 0.22, A.legs);
  const legs = [lg, rg].map(([hx, hy, fx, fy]) => (C.longSkirt ? '' : limb(hx, hy, fx, fy, P.legW, P.legW, C.legs))).join('');
  const shoes = [lg, rg].map(([, , fx, fy], i) => `<ellipse cx="${n1(fx + (i ? 3 : -3))}" cy="${n1(fy + 3)}" rx="${n1(P.legW * 0.8)}" ry="${n1(P.legW * 0.55)}" fill="${C.shoes}"/>`).join('');
  const sY = ty0 + 12, sX = tw0 / 2 + 2;
  const arm = (side: -1 | 1, pose: 'down' | 'up' | 'forward' | 'hold') => {
    const [hx, hy] = handAt(cx + side * sX, sY, P.arm, side, pose);
    return limb(cx + side * sX, sY, hx, hy, 15, 14, C.sleeve, side * 2) + `<circle cx="${n1(hx)}" cy="${n1(hy)}" r="${n1(k === 'baby' ? 9 : 8)}" fill="${l.skin}"/>`;
  };
  const skirt = C.skirt ? `<path d="M${n1(cx - tw1 / 2)} ${ty1 - 24} H${n1(cx + tw1 / 2)} L${n1(cx + tw1 / 2 + (C.longSkirt ? 20 : 14))} ${C.longSkirt ? 244 : ty1 + 20} Q${cx} ${C.longSkirt ? 252 : ty1 + 28} ${n1(cx - tw1 / 2 - (C.longSkirt ? 20 : 14))} ${C.longSkirt ? 244 : ty1 + 20} Z" fill="${C.skirt}"/>` : '';
  const cape = C.cape ? `<path d="M${n1(cx - tw0 / 2 - 2)} ${ty0 + 4} H${n1(cx + tw0 / 2 + 2)} L${n1(cx + tw1 / 2 + 16)} ${ty1 + 24} Q${cx} ${ty1 + 30} ${n1(cx - tw1 / 2 - 16)} ${ty1 + 24} Z" fill="${C.cape}"/>` : '';
  const collar = [-1, 1].map((sd) => `<path d="M${cx} ${ty0} Q${n1(cx + sd * 14)} ${ty0 - 2} ${n1(cx + sd * 15)} ${ty0 + 8} Q${n1(cx + sd * 6)} ${ty0 + 12} ${cx} ${ty0 + 4} Z" fill="${shade(C.top, 0.45)}"/>`).join('');
  const buttons = l.outfit === 'overalls' ? '' : [0, 1].map((i) => `<circle cx="${cx}" cy="${n1(ty0 + 20 + i * 16)}" r="3.8" fill="${shade(C.top, -0.32)}"/><circle cx="${n1(cx - 1.1)}" cy="${n1(ty0 + 20 + i * 16)}" r=".8" fill="${shade(C.top, 0.3)}"/><circle cx="${n1(cx + 1.1)}" cy="${n1(ty0 + 20 + i * 16)}" r=".8" fill="${shade(C.top, 0.3)}"/>`).join('');
  const overalls = l.outfit === 'overalls' ? `<path d="M${n1(cx - tw1 * 0.32)} ${n1(ty0 + 22)} H${n1(cx + tw1 * 0.32)} L${n1(cx + tw1 * 0.44)} ${ty1} H${n1(cx - tw1 * 0.44)} Z" fill="${C.legs}"/>${[-1, 1].map((sd) => `<circle cx="${n1(cx + sd * tw1 * 0.22)}" cy="${n1(ty0 + 28)}" r="3.4" fill="#e7b43c"/>`).join('')}` : '';
  const body = `${cape}${legs}${shoes}<path d="${torso}" fill="${C.top}"/>${stripes(l, id, `<path d="${torso}"/>`, ty0, ty1)}${overalls}${buttons}${collar}${skirt}`;
  const ears = [-1, 1].map((sd) => `<circle cx="${n1(cx + sd * hw * 0.98)}" cy="${n1(eY + 2)}" r="${n1(hw * 0.16)}" fill="${l.skin}"/>`).join('');
  const face = `${back}${ears}<path d="${headPath}" fill="${l.skin}"/>${beard}${cheeks}<g transform="translate(${n1(hw * 0.12)} 0)"><g class="bt-eyes">${appealEye(id, cx - eGap, eY, er * 3.5, -1, 'doll', l, es, '#2a1d18')}${appealEye(id, cx + eGap, eY, er * 3.5, 1, 'doll', l, es, '#2a1d18')}</g>${brows}${nose}${mouth}${stache}${freck}</g>${front}<g transform="translate(${n1(hw * 0.12)} 0)">${specs(l, cx, eY, er * 2.1, eGap, false, '#3a2a24')}</g>${hat(l, head, false)}`;
  return { svg: assemble(l, body, face, arm, A, head, held), head };
}

/* ═══════════════════════ SKETCHBOOK: PICTURE-BOOK SKETCH ═══════════════════════ */
function sketch(l: Look, id: string): { svg: string; head: Head } {
  const k = l.kind as 'baby' | 'kid' | 'adult' | 'elder';
  const grown = k === 'adult' || k === 'elder';
  const fw = 1 + 0.1 * sh(l, 'faceWidth'), fl = 1 + 0.08 * sh(l, 'faceLength');
  // a loose picture-book drawing: tall, lanky grown-ups with small heads, long necks and big
  // feet; round little ones; noses with character
  const P = {
    baby: { hw: 44, hh: 42, torso: [152, 214], tw: [40, 62], legW: 9, arm: 32, neck: 0 },
    kid: { hw: 30, hh: 33, torso: [118, 200], tw: [32, 48], legW: 7, arm: 46, neck: 4 },
    adult: { hw: 23, hh: 29, torso: [92, 190], tw: [34, 46], legW: 6.5, arm: 66, neck: 14 },
    elder: { hw: 25, hh: 28, torso: [98, 192], tw: [40, 56], legW: 6.5, arm: 60, neck: 10 },
  }[k];
  const hw = P.hw * fw, hh = P.hh * fl, cx = 100, top = P.torso[0] - P.neck - hh * 2, cy = top + hh;
  const head: Head = { cx, cy, rx: hw, ry: hh, top, chin: top + hh * 2 };
  const C = clothes(l), A = armsOf(l), ex = exprOf(l);
  const j = 1 + 0.1 * sh(l, 'jaw');
  // an egg of a head: narrower at the crown for grown-ups, a round bun for babies
  const crown = grown ? 0.82 : 0.95;
  const headPath = `M${cx} ${n1(top)} C${n1(cx + hw * crown)} ${n1(top)} ${n1(cx + hw)} ${n1(cy - hh * 0.5)} ${n1(cx + hw)} ${n1(cy + hh * 0.05)} C${n1(cx + hw * j)} ${n1(cy + hh * 0.75)} ${n1(cx + hw * 0.55)} ${n1(top + hh * 2)} ${cx} ${n1(top + hh * 2)} C${n1(cx - hw * 0.55)} ${n1(top + hh * 2)} ${n1(cx - hw * j)} ${n1(cy + hh * 0.75)} ${n1(cx - hw)} ${n1(cy + hh * 0.05)} C${n1(cx - hw)} ${n1(cy - hh * 0.5)} ${n1(cx - hw * crown)} ${n1(top)} ${cx} ${n1(top)} Z`;
  const er = (k === 'baby' ? 4.6 : k === 'kid' ? 3.6 : 3) * (1 + 0.12 * sh(l, 'eyeSize'));
  const eY = cy - hh * (grown ? 0.05 : -0.04), eGap = hw * (grown ? 0.38 : 0.36) + 1.5 * sh(l, 'eyeGap');
  const es = eyeOf(ex);
  const graphite = '#3d3632';
  const eye = (x: number, side: number) => es === 'closed' || (es === 'wink' && side > 0) || es === 'sleepy'
    ? `<path d="M${n1(x - er * 1.5)} ${n1(eY)} Q${x} ${n1(eY + (es === 'sleepy' ? er * 0.6 : -er * 1.6))} ${n1(x + er * 1.5)} ${n1(eY)}" stroke="${graphite}" stroke-width="2" fill="none" stroke-linecap="round"/>`
    : `<ellipse cx="${n1(x)}" cy="${n1(eY)}" rx="${n1(er * (es === 'wide' ? 1.3 : 1))}" ry="${n1(er * (es === 'wide' ? 1.5 : 1.2))}" fill="${l.eyes ?? '#5a3a22'}"/><circle cx="${n1(x)}" cy="${n1(eY + er * 0.15)}" r="${n1(er * 0.55)}" fill="#1d1512"/><circle cx="${n1(x - er * 0.35)}" cy="${n1(eY - er * 0.4)}" r="${n1(er * 0.25)}" fill="#fff"/>${l.lashes ? `<path d="M${n1(x + side * er)} ${n1(eY - er * 0.6)} l${n1(side * 3)} -3" stroke="${graphite}" stroke-width="1.4" stroke-linecap="round"/>` : ''}`;
  // big expressive brows: they do most of the acting
  const brows = es === 'closed' ? '' : [-1, 1].map((sd) => {
    const bx = cx + sd * eGap, by = eY - er * (grown ? 3.2 : 2.6);
    const inner = ex === 'worried' ? -4 : ex === 'brave' || ex === 'proud' ? 3 : ex === 'wow' || ex === 'starry' ? -3 : 0;
    return `<path d="M${n1(bx - sd * er * 1.6)} ${n1(by + inner)} Q${n1(bx)} ${n1(by - 3.5)} ${n1(bx + sd * er * 1.9)} ${n1(by + 0.5)}" stroke="${shade(l.hair, -0.3)}" stroke-width="${grown ? 2.6 : 2}" fill="none" stroke-linecap="round"/>`;
  }).join('');
  // the nose has character: a long bulb on grown-ups, a button on kids, a dot on babies
  const nz = (k === 'elder' ? 0.85 : 0.68) * (1 + 0.22 * sh(l, 'nose'));
  const nY = eY + er * 0.8;
  const nose = grown && l.lashes
    ? `<path d="M${n1(cx + 1)} ${n1(nY)} Q${n1(cx + 7 * nz)} ${n1(nY + 12 * nz)} ${n1(cx + 5 * nz)} ${n1(nY + 15 * nz)} Q${n1(cx + 2)} ${n1(nY + 17 * nz)} ${n1(cx - 2)} ${n1(nY + 15 * nz)}" stroke="${graphite}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`
    : grown
    ? `<path d="M${n1(cx - 1)} ${n1(nY - 2)} C${n1(cx + 2)} ${n1(nY + 8 * nz)} ${n1(cx + 11 * nz)} ${n1(nY + 10 * nz)} ${n1(cx + 10 * nz)} ${n1(nY + 16 * nz)} C${n1(cx + 9 * nz)} ${n1(nY + 21 * nz)} ${n1(cx - 1)} ${n1(nY + 21 * nz)} ${n1(cx - 5)} ${n1(nY + 18 * nz)} C${n1(cx - 7)} ${n1(nY + 15 * nz)} ${n1(cx - 3)} ${n1(nY + 6 * nz)} ${n1(cx - 1)} ${n1(nY - 2)} Z" fill="${shade(l.skin, -0.06)}"/>`
    : k === 'kid' ? `<path d="M${n1(cx - 1)} ${n1(nY + 2)} q6 6 1 10 q-4 2 -6 -1" fill="${shade(l.skin, -0.06)}"/>`
    : `<ellipse cx="${cx}" cy="${n1(nY + 7)}" rx="3" ry="2.2" fill="${shade(l.skin, -0.1)}"/>`;
  const mY = grown ? nY + 21 * nz + 6 : nY + (k === 'kid' ? 17 : 14), mW = hw * (grown ? 0.42 : 0.3) * (1 + 0.1 * sh(l, 'mouth'));
  const mk = mouthOf(ex);
  const mouth = mk === 'open' || mk === 'grin' || mk === 'tongue'
    ? `<path d="M${n1(cx - mW)} ${n1(mY)} Q${n1(cx + 2)} ${n1(mY + mW * 1.1)} ${n1(cx + mW)} ${n1(mY - 2)} Q${cx} ${n1(mY + 3)} ${n1(cx - mW)} ${n1(mY)} Z" fill="#7a3030"/>${mk === 'tongue' ? `<ellipse cx="${n1(cx + 2)}" cy="${n1(mY + mW * 0.5)}" rx="${n1(mW * 0.32)}" ry="${n1(mW * 0.24)}" fill="#ef7f8a"/>` : ''}`
    : mk === 'o' ? `<ellipse cx="${cx}" cy="${n1(mY + 3)}" rx="${n1(mW * 0.25)}" ry="${n1(mW * 0.35)}" fill="#7a3030"/>`
    : mk === 'flat' || mk === 'wobbly' ? `<path d="M${n1(cx - mW * 0.6)} ${n1(mY + 2)} q${n1(mW * 0.3)} ${mk === 'wobbly' ? -4 : 1} ${n1(mW * 0.6)} 0 t${n1(mW * 0.6)} 0" stroke="${graphite}" stroke-width="2" fill="none" stroke-linecap="round"/>`
    : `<path d="M${n1(cx - mW)} ${n1(mY - 1)} Q${n1(cx + 2)} ${n1(mY + mW * 0.7)} ${n1(cx + mW)} ${n1(mY - 3)}" stroke="${graphite}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  // rosy cheeks scribbled in with a few strokes of red pencil
  const cheeks = [-1, 1].map((sd) => { const x = cx + sd * hw * 0.58, y = eY + hh * 0.36; return `<path d="M${n1(x - 5)} ${n1(y + 2)} l6 -5 M${n1(x - 3)} ${n1(y + 4)} l6 -5 M${n1(x - 1)} ${n1(y + 6)} l6 -5" stroke="#e8807a" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>`; }).join('');
  // scribbly hair: a shape in the hair colour, gone over with loose pencil strokes
  const fam = FAM[l.hairStyle] ?? 'short', hc = l.hair, hd = shade(hc, -0.35);
  const scrib = (d: string, w = 1.6) => `<path d="${d}" stroke="${hd}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
  const spikes = (n: number, y: number, x0: number, x1: number, up: number) => Array.from({ length: n }, (_, i) => { const x = x0 + ((x1 - x0) * i) / (n - 1); return `L${n1(x)} ${n1(y - (i % 2 ? up : up * 0.35))}`; }).join(' ');
  const mop = `<path d="M${n1(cx - hw * 1.06)} ${n1(cy - hh * 0.05)} C${n1(cx - hw * 1.12)} ${n1(top - hh * 0.05)} ${n1(cx - hw * 0.6)} ${n1(top - hh * 0.12)} ${n1(cx - hw * 0.5)} ${n1(top - hh * 0.06)} ${spikes(7, top, cx - hw * 0.5, cx + hw * 0.7, hh * 0.22)} C${n1(cx + hw * 1.1)} ${n1(top)} ${n1(cx + hw * 1.12)} ${n1(cy - hh * 0.5)} ${n1(cx + hw * 1.06)} ${n1(cy - hh * 0.05)} Q${n1(cx + hw * 0.6)} ${n1(top + hh * 0.42)} ${n1(cx + hw * 0.1)} ${n1(top + hh * 0.34)} Q${n1(cx - hw * 0.5)} ${n1(top + hh * 0.5)} ${n1(cx - hw * 1.06)} ${n1(cy - hh * 0.05)} Z" fill="${hc}"/>`;
  let back = '', front = '';
  switch (fam) {
    case 'none': break;
    case 'sides': front = [-1, 1].map((sd) => `<path d="M${n1(cx + sd * hw * 0.82)} ${n1(cy - hh * 0.5)} q${n1(sd * 12)} 2 ${n1(sd * 9)} ${n1(hh * 0.45)} q${n1(-sd * 6)} -2 ${n1(-sd * 9)} ${n1(-hh * 0.1)} Z" fill="${hc}"/>${scrib(`M${n1(cx + sd * hw * 0.9)} ${n1(cy - hh * 0.4)} q${n1(sd * 8)} 6 ${n1(sd * 6)} ${n1(hh * 0.3)}`)}`).join('') + scrib(`M${n1(cx - 4)} ${n1(top + 1)} q2 -8 7 -9 M${n1(cx + 2)} ${n1(top + 1)} q4 -6 9 -5`, 1.5); break;
    case 'tuft': front = scrib(`M${cx} ${n1(top + 2)} q-4 -12 4 -14 q8 0 5 7 q-3 4 -6 1`, 2.2) + scrib(`M${n1(cx - 6)} ${n1(top + 3)} q-2 -7 3 -9`, 1.6); break;
    case 'buzz': front = mop.replace('fill=', 'opacity=".7" fill=') ; break;
    case 'short': case 'side': case 'messy':
      front = mop + scrib(`M${n1(cx - hw * 0.7)} ${n1(top + hh * 0.2)} q${n1(hw * 0.3)} -10 ${n1(hw * 0.6)} -6 M${n1(cx - hw * 0.1)} ${n1(top + hh * 0.15)} q${n1(hw * 0.3)} -10 ${n1(hw * 0.7)} -4 M${n1(cx + hw * 0.5)} ${n1(top + hh * 0.2)} q8 -6 ${n1(hw * 0.4)} 4`)
        + (fam === 'messy' ? scrib(`M${n1(cx - hw * 0.4)} ${n1(top - 2)} l-5 -10 M${n1(cx + hw * 0.1)} ${n1(top - 4)} l2 -12 M${n1(cx + hw * 0.6)} ${n1(top)} l8 -8`, 2) : '')
        + (fam === 'side' ? `<path d="M${n1(cx - hw * 0.5)} ${n1(top + 2)} Q${n1(cx + hw * 0.8)} ${n1(top - hh * 0.2)} ${n1(cx + hw * 1.1)} ${n1(cy - hh * 0.2)} Q${n1(cx + hw * 0.5)} ${n1(top + hh * 0.25)} ${n1(cx - hw * 0.5)} ${n1(top + 2)} Z" fill="${shade(hc, 0.08)}"/>` : '');
      break;
    case 'bob': case 'long': case 'curlyLong': {
      const len = fam === 'bob' ? cy + hh * 0.85 : P.torso[0] + (grown ? 40 : 30);
      back = `<path d="M${n1(cx - hw * 1.12)} ${n1(cy)} C${n1(cx - hw * 1.3)} ${n1(top - hh * 0.3)} ${n1(cx + hw * 1.3)} ${n1(top - hh * 0.3)} ${n1(cx + hw * 1.12)} ${n1(cy)} C${n1(cx + hw * 1.3)} ${n1(cy + hh * 0.8)} ${n1(cx + hw * 1.5)} ${n1(len - 10)} ${n1(cx + hw * 1.2)} ${n1(len)} Q${n1(cx + hw * 0.9)} ${n1(len - 8)} ${n1(cx + hw * 0.7)} ${n1(len - 2)} L${n1(cx + hw * 0.6)} ${n1(cy + hh * 0.6)} H${n1(cx - hw * 0.6)} L${n1(cx - hw * 0.7)} ${n1(len - 2)} Q${n1(cx - hw * 0.9)} ${n1(len - 8)} ${n1(cx - hw * 1.2)} ${n1(len)} C${n1(cx - hw * 1.5)} ${n1(len - 10)} ${n1(cx - hw * 1.3)} ${n1(cy + hh * 0.8)} ${n1(cx - hw * 1.12)} ${n1(cy)} Z" fill="${hc}"/>`
        + [-1, 1].map((sd) => scrib(`M${n1(cx + sd * hw * 1.1)} ${n1(cy - hh * 0.3)} C${n1(cx + sd * hw * 1.3)} ${n1(cy + hh * 0.4)} ${n1(cx + sd * hw * 1.25)} ${n1(len - 20)} ${n1(cx + sd * hw * 1.15)} ${n1(len - 6)} M${n1(cx + sd * hw * 0.9)} ${n1(cy + hh * 0.3)} q${n1(sd * 6)} ${n1((len - cy) * 0.4)} ${n1(sd * 2)} ${n1((len - cy) * 0.7)}`)).join('')
        + (fam === 'curlyLong' ? [-1, 1].map((sd) => scrib(`M${n1(cx + sd * hw * 1.2)} ${n1(len - 18)} c${n1(sd * 6)} -4 ${n1(sd * 8)} 6 ${n1(sd * 2)} 6 c${n1(-sd * 5)} 0 ${n1(-sd * 3)} -8 ${n1(sd * 2)} -6`, 1.8)).join('') : '');
      front = `<path d="M${n1(cx - hw * 1.06)} ${n1(cy - hh * 0.05)} C${n1(cx - hw * 1.1)} ${n1(top - hh * 0.25)} ${n1(cx + hw * 1.1)} ${n1(top - hh * 0.25)} ${n1(cx + hw * 1.06)} ${n1(cy - hh * 0.05)} Q${n1(cx + hw * 0.5)} ${n1(top + hh * (l.hairStyle === 'bangs' ? 0.7 : 0.25))} ${n1(cx - hw * 0.2)} ${n1(top + hh * (l.hairStyle === 'bangs' ? 0.7 : 0.45))} Q${n1(cx - hw * 0.8)} ${n1(top + hh * 0.55)} ${n1(cx - hw * 1.06)} ${n1(cy - hh * 0.05)} Z" fill="${hc}"/>` + scrib(`M${n1(cx - hw * 0.2)} ${n1(top + hh * 0.4)} Q${n1(cx + hw * 0.3)} ${n1(top + hh * 0.05)} ${n1(cx + hw * 0.9)} ${n1(cy - hh * 0.25)} M${n1(cx - hw * 0.6)} ${n1(top + hh * 0.35)} Q${n1(cx - hw * 0.4)} ${n1(top + hh * 0.05)} ${n1(cx)} ${n1(top + hh * 0.02)}`);
      break;
    }
    case 'curlyShort': case 'afro': {
      const R = fam === 'afro' ? 1.38 : 1.12;
      back = `<ellipse cx="${cx}" cy="${n1(cy - hh * (fam === 'afro' ? 0.25 : 0.12))}" rx="${n1(hw * R)}" ry="${n1(hh * R * 0.98)}" fill="${hc}"/>`
        + Array.from({ length: fam === 'afro' ? 9 : 6 }, (_, i) => { const a = Math.PI * (1.0 + (i / (fam === 'afro' ? 8 : 5)) * 1.0); const x = cx + Math.cos(a) * hw * R * 0.78, y = cy - hh * 0.2 + Math.sin(a) * hh * R * 0.8; return scrib(`M${n1(x)} ${n1(y)} c4 -5 9 0 5 4 c-3 3 -7 -1 -3 -4`, 1.6); }).join('');
      front = `<path d="M${n1(cx - hw)} ${n1(top + hh * 0.42)} Q${n1(cx - hw * 0.5)} ${n1(top + hh * 0.15)} ${cx} ${n1(top + hh * 0.3)} Q${n1(cx + hw * 0.5)} ${n1(top + hh * 0.12)} ${n1(cx + hw)} ${n1(top + hh * 0.42)} V${n1(top - 2)} H${n1(cx - hw)} Z" fill="${hc}"/>` + scrib(`M${n1(cx - hw * 0.6)} ${n1(top + hh * 0.22)} c3 -4 7 0 4 3 M${n1(cx + hw * 0.3)} ${n1(top + hh * 0.18)} c3 -4 7 0 4 3`, 1.6);
      break;
    }
    case 'bun': back = `<circle cx="${n1(cx + 3)}" cy="${n1(top - hh * 0.24)}" r="${n1(hw * 0.42)}" fill="${hc}"/>${scrib(`M${n1(cx - hw * 0.25)} ${n1(top - hh * 0.25)} c6 -10 18 -6 14 4 c-3 6 -12 4 -10 -2`)}`; front = mop; break;
    case 'pony': back = `<path d="M${n1(cx + hw * 0.6)} ${n1(top + 6)} Q${n1(cx + hw * 1.9)} ${n1(cy - hh * 0.2)} ${n1(cx + hw * 1.3)} ${n1(cy + hh * 1.2)} Q${n1(cx + hw * 1.25)} ${n1(cy)} ${n1(cx + hw * 0.5)} ${n1(top + 12)} Z" fill="${hc}"/>${scrib(`M${n1(cx + hw * 0.9)} ${n1(top + 10)} Q${n1(cx + hw * 1.6)} ${n1(cy)} ${n1(cx + hw * 1.3)} ${n1(cy + hh)}`)}`; front = mop; break;
    case 'pigtails': back = [-1, 1].map((sd) => `<path d="M${n1(cx + sd * hw * 0.85)} ${n1(cy - hh * 0.4)} q${n1(sd * hw * 0.9)} ${n1(hh * 0.1)} ${n1(sd * hw * 0.55)} ${n1(hh * 0.9)} q${n1(-sd * hw * 0.2)} ${n1(-hh * 0.4)} ${n1(-sd * hw * 0.5)} ${n1(-hh * 0.5)} Z" fill="${hc}"/>`).join(''); front = mop; break;
  }
  const fh = facialOf(l);
  const beard = fh === 'full' || fh === 'trim' ? `<path d="M${n1(cx - hw * 0.98)} ${n1(cy + hh * 0.05)} Q${n1(cx - hw * 1.05)} ${n1(top + hh * 2.35)} ${n1(cx + 3)} ${n1(top + hh * 2.45)} Q${n1(cx + hw * 1.05)} ${n1(top + hh * 2.3)} ${n1(cx + hw * 0.98)} ${n1(cy + hh * 0.05)} Q${n1(cx + mW)} ${n1(mY + 10)} ${cx} ${n1(mY + 9)} Q${n1(cx - mW)} ${n1(mY + 10)} ${n1(cx - hw * 0.98)} ${n1(cy + hh * 0.05)} Z" fill="${hc}"/>${scrib(`M${n1(cx - hw * 0.5)} ${n1(top + hh * 1.95)} l3 6 M${n1(cx)} ${n1(top + hh * 2.1)} l1 7 M${n1(cx + hw * 0.5)} ${n1(top + hh * 1.95)} l-2 6`)}` : '';
  const stache = fh !== 'none' && fh !== 'stubble' ? `<path d="M${n1(cx + 2)} ${n1(mY - 6)} Q${n1(cx - mW * 0.8)} ${n1(mY - 9)} ${n1(cx - mW * 1.2)} ${n1(mY - 1)} Q${n1(cx - mW * 0.4)} ${n1(mY - 3)} ${n1(cx + 2)} ${n1(mY - 2)} Q${n1(cx + mW * 0.6)} ${n1(mY - 3)} ${n1(cx + mW * 1.3)} ${n1(mY - 2)} Q${n1(cx + mW * 0.9)} ${n1(mY - 10)} ${n1(cx + 2)} ${n1(mY - 6)} Z" fill="${hc}"/>` : '';
  const freck = l.freckles ? [-1, 1].flatMap((sd) => [0, 1, 2].map((i) => `<circle cx="${n1(cx + sd * (hw * 0.45 + i * 3))}" cy="${n1(eY + hh * 0.22 + (i % 2) * 3)}" r="1.1" fill="${shade(l.skin, -0.35)}"/>`)).join('') : '';
  // body: a long coat on grown-ups, a tunic on kids, a round romper on babies; spindly limbs
  const [ty0, ty1] = P.torso, [tw0, tw1] = P.tw;
  const torso = k === 'baby'
    ? `M${cx} ${ty0} C${n1(cx + tw1 / 2 + 8)} ${ty0} ${n1(cx + tw1 / 2 + 6)} ${ty1} ${cx} ${ty1} C${n1(cx - tw1 / 2 - 6)} ${ty1} ${n1(cx - tw1 / 2 - 8)} ${ty0} ${cx} ${ty0} Z`
    : `M${n1(cx - tw0 / 2)} ${ty0 + 6} Q${n1(cx - tw0 / 2 + 2)} ${ty0} ${n1(cx - tw0 / 2 + 8)} ${ty0} H${n1(cx + tw0 / 2 - 8)} Q${n1(cx + tw0 / 2 - 2)} ${ty0} ${n1(cx + tw0 / 2)} ${ty0 + 6} C${n1(cx + tw0 / 2 + 3)} ${n1((ty0 + ty1) / 2)} ${n1(cx + tw1 / 2 - 2)} ${n1(ty1 - 20)} ${n1(cx + tw1 / 2)} ${ty1} H${n1(cx - tw1 / 2)} C${n1(cx - tw1 / 2 + 2)} ${n1(ty1 - 20)} ${n1(cx - tw0 / 2 - 3)} ${n1((ty0 + ty1) / 2)} ${n1(cx - tw0 / 2)} ${ty0 + 6} Z`;
  const neck = P.neck ? `<path d="M${n1(cx - 4)} ${n1(top + hh * 2 - 6)} L${n1(cx - 4.5)} ${ty0 + 2} H${n1(cx + 4.5)} L${n1(cx + 4)} ${n1(top + hh * 2 - 6)} Z" fill="${shade(l.skin, -0.06)}"/>` : '';
  const footY = 246, hipY = ty1 - 2;
  const [lg, rg] = legsAt(cx, hipY, footY, tw1 * 0.2, A.legs);
  const legs = [lg, rg].map(([hx, hy, fx, fy]) => (C.longSkirt ? '' : limb(hx, hy, fx, fy, P.legW, P.legW * 0.85, C.legs))).join('');
  // big feet, pointing out
  const fL = k === 'baby' ? 9 : grown ? 15 : 11;
  const shoes = [lg, rg].map(([, , fx, fy], i) => { const d = i ? 1 : -1; return `<path d="M${n1(fx - d * 4)} ${n1(fy - 3)} Q${n1(fx + d * fL * 0.5)} ${n1(fy - 6)} ${n1(fx + d * fL)} ${n1(fy + 1)} Q${n1(fx + d * fL * 1.05)} ${n1(fy + 5)} ${n1(fx + d * fL * 0.6)} ${n1(fy + 5)} H${n1(fx - d * 5)} Q${n1(fx - d * 7)} ${n1(fy + 2)} ${n1(fx - d * 4)} ${n1(fy - 3)} Z" fill="${C.shoes}"/>`; }).join('');
  const sY = ty0 + 6, sX = tw0 / 2 - 1;
  const arm = (side: -1 | 1, pose: 'down' | 'up' | 'forward' | 'hold') => {
    const [hx, hy] = handAt(cx + side * sX, sY, P.arm, side, pose);
    return limb(cx + side * sX, sY, hx, hy, k === 'baby' ? 10 : 7.5, k === 'baby' ? 9 : 6, C.sleeve, side * 2) + `<ellipse cx="${n1(hx)}" cy="${n1(hy + 1)}" rx="${k === 'baby' ? 6 : 4.6}" ry="${k === 'baby' ? 6.5 : 5.4}" fill="${l.skin}"/>`;
  };
  const skirt = C.skirt ? `<path d="M${n1(cx - tw1 / 2 + 2)} ${ty1 - 28} H${n1(cx + tw1 / 2 - 2)} Q${n1(cx + tw1 / 2 + 10)} ${n1(ty1 - 4)} ${n1(cx + tw1 / 2 + (C.longSkirt ? 22 : 16))} ${C.longSkirt ? 244 : ty1 + 18} Q${cx} ${C.longSkirt ? 250 : ty1 + 24} ${n1(cx - tw1 / 2 - (C.longSkirt ? 22 : 16))} ${C.longSkirt ? 244 : ty1 + 18} Q${n1(cx - tw1 / 2 - 10)} ${n1(ty1 - 4)} ${n1(cx - tw1 / 2 + 2)} ${ty1 - 28} Z" fill="${C.skirt}"/>` : '';
  const cape = C.cape ? `<path d="M${n1(cx - tw0 / 2)} ${ty0 + 2} H${n1(cx + tw0 / 2)} Q${n1(cx + tw1 / 2 + 20)} ${n1((ty0 + ty1) / 2)} ${n1(cx + tw1 / 2 + 18)} ${ty1 + 22} Q${cx} ${ty1 + 28} ${n1(cx - tw1 / 2 - 18)} ${ty1 + 22} Q${n1(cx - tw1 / 2 - 20)} ${n1((ty0 + ty1) / 2)} ${n1(cx - tw0 / 2)} ${ty0 + 2} Z" fill="${C.cape}"/>` : '';
  const placket = grown && (l.outfit === 'cardigan' || l.outfit === 'denim' || l.outfit === 'suit' || l.outfit === 'coat') ? `<path d="M${n1(cx + 1)} ${ty0 + 2} L${n1(cx + 2)} ${ty1}" stroke="${shade(C.top, -0.35)}" stroke-width="1.6"/>${[0, 1, 2].map((i) => `<circle cx="${n1(cx + 5)}" cy="${n1(ty0 + 18 + i * 22)}" r="1.8" fill="${shade(C.top, -0.4)}"/>`).join('')}` : '';
  const overalls = l.outfit === 'overalls' ? `<path d="M${n1(cx - tw1 * 0.3)} ${n1(ty0 + (k === 'baby' ? 22 : 18))} H${n1(cx + tw1 * 0.3)} L${n1(cx + tw1 * 0.42)} ${ty1} H${n1(cx - tw1 * 0.42)} Z" fill="${C.legs}"/>` : '';
  const body = `${cape}${legs}${shoes}${neck}<path d="${torso}" fill="${C.top}"/>${stripes(l, id, `<path d="${torso}"/>`, ty0, ty1)}${overalls}${placket}${skirt}`;
  const ears = [-1, 1].map((sd) => `<ellipse cx="${n1(cx + sd * hw * 0.98)}" cy="${n1(eY + er)}" rx="${n1(Math.max(4, hw * 0.16))}" ry="${n1(Math.max(5.5, hw * 0.22))}" fill="${l.skin}"/>`).join('');
  const face = `${back}${ears}<path d="${headPath}" fill="${l.skin}"/>${beard}${cheeks}<g transform="translate(${n1(hw * 0.16)} 0)"><g class="bt-eyes">${appealEye(id, cx - eGap, eY, er * 3.6, -1, 'sketch', l, es, graphite)}${appealEye(id, cx + eGap, eY, er * 3.6, 1, 'sketch', l, es, graphite)}</g>${brows}${nose}${mouth}${stache}${freck}</g>${front}<g transform="translate(${n1(hw * 0.16)} 0)">${specs(l, cx, eY, er * 2.7, eGap, false, graphite)}</g>${hat(l, head, false)}`;
  return { svg: assemble(l, body, face, arm, A, head, held), head };
}

/* ═════════════════════════ RETRO ═════════════════════════ */
function retro(l: Look, id: string): { svg: string; head: Head } {
  const k = l.kind as 'baby' | 'kid' | 'adult' | 'elder';
  const grown = k === 'adult' || k === 'elder';
  const fw = 1 + 0.1 * sh(l, 'faceWidth'), fl = 1 + 0.08 * sh(l, 'faceLength');
  const P = { baby: { hw: 50, hh: 50, torso: [146, 212], tw: [50, 66], legW: 10, arm: 34 }, kid: { hw: 38, hh: 38, torso: [114, 190], tw: [44, 56], legW: 8, arm: 48 }, adult: { hw: 34, hh: 40, torso: [104, 196], tw: [56, 58], legW: 8, arm: 64 }, elder: { hw: 40, hh: 36, torso: [102, 196], tw: [66, 78], legW: 8, arm: 60 } }[k];
  const hw = P.hw * fw, hh = P.hh * fl, cx = 100, top = P.torso[0] - hh * 2 - (grown ? 8 : 2), cy = top + hh;
  const head: Head = { cx, cy, rx: hw, ry: hh, top, chin: top + hh * 2 };
  const C = clothes(l), A = armsOf(l), ex = exprOf(l);
  // grown-ups are blocks, little ones are circles
  const jaw = 1 + 0.12 * sh(l, 'jaw');
  const headPath = grown
    ? `M${n1(cx - hw)} ${n1(top + 10)} Q${n1(cx - hw)} ${n1(top)} ${n1(cx - hw + 10)} ${n1(top)} H${n1(cx + hw - 10)} Q${n1(cx + hw)} ${n1(top)} ${n1(cx + hw)} ${n1(top + 10)} V${n1(top + hh * 1.5)} Q${n1(cx + hw * jaw)} ${n1(top + hh * 2)} ${n1(cx + hw * 0.6)} ${n1(top + hh * 2)} H${n1(cx - hw * 0.6)} Q${n1(cx - hw * jaw)} ${n1(top + hh * 2)} ${n1(cx - hw)} ${n1(top + hh * 1.5)} Z`
    : `M${n1(cx - hw)} ${n1(cy)} A${n1(hw)} ${n1(hh)} 0 1 1 ${n1(cx + hw)} ${n1(cy)} A${n1(hw)} ${n1(hh)} 0 1 1 ${n1(cx - hw)} ${n1(cy)} Z`;
  const eY = cy - hh * (grown ? 0.02 : -0.05), eGap = hw * (grown ? 0.4 : 0.42) + 2 * sh(l, 'eyeGap');
  const er = (grown ? 4.2 : k === 'kid' ? 4.8 : 5.6) * (1 + 0.12 * sh(l, 'eyeSize'));
  const es = eyeOf(ex);
  const dot = (x: number, side: number) => es === 'closed' || (es === 'wink' && side > 0) || es === 'sleepy'
    ? `<path d="M${n1(x - er * 1.4)} ${n1(eY)} Q${x} ${n1(eY + (es === 'sleepy' ? 0 : er * 1.6) * -1)} ${n1(x + er * 1.4)} ${n1(eY)}" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`
    : `<ellipse cx="${n1(x)}" cy="${n1(eY)}" rx="${n1(er * (es === 'wide' ? 1.25 : 1))}" ry="${n1(er * (es === 'wide' ? 1.5 : 1.25))}" fill="${shade(l.eyes ?? '#3a2a20', -0.5)}"/><circle cx="${n1(x - er * 0.3)}" cy="${n1(eY - er * 0.4)}" r="${n1(er * 0.32)}" fill="#fff"/>`;
  const brow = [-1, 1].map((sd) => `<rect x="${n1(cx + sd * eGap - er * 2)}" y="${n1(eY - er * 3.4 + (ex === 'worried' ? sd * -2 : 0))}" width="${n1(er * 4)}" height="${n1(grown ? 4.4 : 3)}" rx="2" fill="${shade(l.hair, -0.1)}" transform="rotate(${ex === 'worried' ? sd * -10 : ex === 'brave' ? sd * 10 : 0} ${n1(cx + sd * eGap)} ${n1(eY - er * 3)})"/>`).join('');
  // a big graphic nose: a long block on grown-ups, a dot on little ones
  const nz = 1 + 0.18 * sh(l, 'nose');
  const nY = eY + er * 1.6;
  const nose = grown ? `<path d="M${n1(cx - 2)} ${n1(nY - 6)} L${n1(cx + 7 * nz)} ${n1(nY + 16 * nz)} Q${n1(cx + 7 * nz)} ${n1(nY + 21 * nz)} ${n1(cx)} ${n1(nY + 21 * nz)} L${n1(cx - 6 * nz)} ${n1(nY + 19 * nz)} Z" fill="${shade(l.skin, -0.12)}"/>` : `<ellipse cx="${cx}" cy="${n1(nY + 4)}" rx="${n1(4.5 * nz)}" ry="${n1(3.5 * nz)}" fill="${shade(l.skin, -0.14)}"/>`;
  const mY = grown ? nY + 21 * nz + 9 : nY + 14, mW = hw * 0.3 * (1 + 0.1 * sh(l, 'mouth'));
  const mk = mouthOf(ex);
  const mouth = mk === 'open' || mk === 'grin' ? `<path d="M${n1(cx - mW)} ${n1(mY)} Q${cx} ${n1(mY + 12)} ${n1(cx + mW)} ${n1(mY)} Z" fill="#5a2424"/>`
    : mk === 'o' ? `<circle cx="${cx}" cy="${n1(mY + 3)}" r="${n1(mW * 0.36)}" fill="#5a2424"/>`
    : mk === 'wobbly' || mk === 'flat' ? `<path d="M${n1(cx - mW * 0.7)} ${n1(mY + 2)} H${n1(cx + mW * 0.7)}" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`
    : `<path d="M${n1(cx - mW)} ${n1(mY)} Q${cx} ${n1(mY + 8)} ${n1(cx + mW)} ${n1(mY)}" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  const fh = facialOf(l);
  const stache = fh === 'moustache' || fh === 'trim' || fh === 'full' ? `<rect x="${n1(cx - mW * 1.2)}" y="${n1(mY - 9)}" width="${n1(mW * 2.4)}" height="8" rx="4" fill="${l.hair}"/>` : '';
  const beard = fh === 'full' || fh === 'trim' ? `<path d="M${n1(cx - hw)} ${n1(top + hh * 1.25)} V${n1(top + hh * 1.6)} Q${n1(cx - hw)} ${n1(top + hh * 2.25)} ${cx} ${n1(top + hh * 2.3)} Q${n1(cx + hw)} ${n1(top + hh * 2.25)} ${n1(cx + hw)} ${n1(top + hh * 1.6)} V${n1(top + hh * 1.25)} Q${cx} ${n1(mY + 16)} ${n1(cx - hw)} ${n1(top + hh * 1.25)} Z" fill="${l.hair}"/>` : '';
  const freck = l.freckles ? [-1, 1].flatMap((sd) => [0, 1, 2].map((i) => `<circle cx="${n1(cx + sd * (eGap + i * 3 - 3))}" cy="${n1(nY + 6 + (i % 2) * 3)}" r="1.4" fill="${shade(l.skin, -0.3)}"/>`)).join('') : '';
  // flat graphic hair shapes
  const fam = FAM[l.hairStyle] ?? 'short', hc = l.hair;
  let back = '', front = '';
  const capR = grown
    ? `M${n1(cx - hw - 3)} ${n1(top + hh * 0.7)} V${n1(top + 4)} Q${n1(cx - hw - 3)} ${n1(top - 8)} ${n1(cx - hw + 8)} ${n1(top - 8)} H${n1(cx + hw - 8)} Q${n1(cx + hw + 3)} ${n1(top - 8)} ${n1(cx + hw + 3)} ${n1(top + 4)} V${n1(top + hh * 0.7)} H${n1(cx + hw - 6)} V${n1(top + hh * 0.4)} H${n1(cx - hw + 6)} V${n1(top + hh * 0.7)} Z`
    : `M${n1(cx - hw - 2)} ${n1(cy)} A${n1(hw + 2)} ${n1(hh + 2)} 0 0 1 ${n1(cx + hw + 2)} ${n1(cy)} L${n1(cx + hw - 4)} ${n1(cy)} Q${cx} ${n1(top + hh * 0.5)} ${n1(cx - hw + 4)} ${n1(cy)} Z`;
  switch (fam) {
    case 'none': break;
    case 'sides': front = [-1, 1].map((sd) => `<rect x="${n1(sd < 0 ? cx - hw - 4 : cx + hw - 6)}" y="${n1(top + hh * 0.35)}" width="10" height="${n1(hh * 0.6)}" rx="3" fill="${hc}"/>`).join(''); break;
    case 'tuft': front = `<circle cx="${cx}" cy="${n1(top - 2)}" r="6" fill="${hc}"/><path d="M${cx} ${n1(top - 8)} q6 -10 12 -4" stroke="${hc}" stroke-width="4" fill="none"/>`; break;
    case 'buzz': front = `<path d="${capR}" fill="${hc}" opacity=".75"/>`; break;
    case 'short': case 'messy': front = `<path d="${capR}" fill="${hc}"/>${fam === 'messy' ? `<path d="M${n1(cx - hw * 0.8)} ${n1(top - 6)} l8 -12 l6 10 l8 -14 l6 12 l8 -12 l6 12 Z" fill="${hc}"/>` : ''}`; break;
    case 'side': front = `<path d="${capR}" fill="${hc}"/><path d="M${n1(cx - hw * 0.4)} ${n1(top - 8)} Q${n1(cx + hw * 0.9)} ${n1(top - 14)} ${n1(cx + hw + 3)} ${n1(top + hh * 0.5)} L${n1(cx + hw * 0.2)} ${n1(top + hh * 0.3)} Z" fill="${shade(hc, 0.08)}"/>`; break;
    case 'bob': case 'long': case 'curlyLong': {
      const len = fam === 'bob' ? top + hh * 1.7 : P.torso[0] + 34;
      back = `<path d="M${n1(cx - hw - 7)} ${n1(top + 6)} Q${n1(cx - hw - 7)} ${n1(top - 10)} ${cx} ${n1(top - 10)} Q${n1(cx + hw + 7)} ${n1(top - 10)} ${n1(cx + hw + 7)} ${n1(top + 6)} V${n1(len - 10)} Q${n1(cx + hw + 7)} ${n1(len)} ${n1(cx + hw - 6)} ${n1(len)} H${n1(cx + hw * 0.55)} V${n1(top + hh * 1.6)} H${n1(cx - hw * 0.55)} V${n1(len)} H${n1(cx - hw + 6)} Q${n1(cx - hw - 7)} ${n1(len)} ${n1(cx - hw - 7)} ${n1(len - 10)} Z" fill="${hc}"/>`;
      front = `<path d="M${n1(cx - hw - 4)} ${n1(top + hh * 0.6)} V${n1(top)} Q${cx} ${n1(top - 12)} ${n1(cx + hw + 4)} ${n1(top)} V${n1(top + hh * 0.6)} L${n1(cx + hw - 6)} ${n1(top + hh * 0.6)} L${n1(cx + hw - 6)} ${n1(top + hh * 0.42)} H${n1(cx - hw + 6)} V${n1(top + hh * 0.6)} Z" fill="${hc}"/>${l.hairStyle === 'bangs' ? `<rect x="${n1(cx - hw + 4)}" y="${n1(top)}" width="${n1(hw * 2 - 8)}" height="${n1(hh * 0.62)}" fill="${hc}"/>` : ''}`;
      break;
    }
    case 'curlyShort': case 'afro': {
      const r = fam === 'afro' ? hw * 1.45 : hw * 1.12;
      back = `<circle cx="${cx}" cy="${n1(cy - hh * (fam === 'afro' ? 0.3 : 0.15))}" r="${n1(r)}" fill="${hc}"/>`;
      front = `<path d="M${n1(cx - hw)} ${n1(top + hh * 0.36)} Q${cx} ${n1(top + hh * 0.1)} ${n1(cx + hw)} ${n1(top + hh * 0.36)} V${n1(top - 4)} H${n1(cx - hw)} Z" fill="${hc}"/>`;
      break;
    }
    case 'bun': back = `<circle cx="${cx}" cy="${n1(top - hh * 0.35)}" r="${n1(hw * 0.4)}" fill="${hc}"/>`; front = `<path d="${capR}" fill="${hc}"/>`; break;
    case 'pony': back = `<path d="M${n1(cx + hw)} ${n1(top + 10)} L${n1(cx + hw + 26)} ${n1(cy + hh * 0.9)} L${n1(cx + hw + 6)} ${n1(cy + hh * 0.7)} Z" fill="${hc}"/>`; front = `<path d="${capR}" fill="${hc}"/>`; break;
    case 'pigtails': back = [-1, 1].map((sd) => `<circle cx="${n1(cx + sd * (hw + 12))}" cy="${n1(cy - hh * 0.1)}" r="${n1(hw * 0.38)}" fill="${hc}"/>`).join(''); front = `<path d="${capR}" fill="${hc}"/>`; break;
  }
  // body: a box for grown-ups, a rounded block for kids, an egg for babies; stick legs
  const [ty0, ty1] = P.torso, [tw0, tw1] = P.tw;
  const torso = grown ? `M${n1(cx - tw0 / 2)} ${ty0 + 4} Q${n1(cx - tw0 / 2)} ${ty0} ${n1(cx - tw0 / 2 + 6)} ${ty0} H${n1(cx + tw0 / 2 - 6)} Q${n1(cx + tw0 / 2)} ${ty0} ${n1(cx + tw0 / 2)} ${ty0 + 4} L${n1(cx + tw1 / 2)} ${ty1} H${n1(cx - tw1 / 2)} Z`
    : k === 'baby' ? `M${cx} ${ty0} C${n1(cx + tw1 / 2 + 6)} ${ty0} ${n1(cx + tw1 / 2 + 6)} ${ty1} ${cx} ${ty1} C${n1(cx - tw1 / 2 - 6)} ${ty1} ${n1(cx - tw1 / 2 - 6)} ${ty0} ${cx} ${ty0} Z`
    : `M${n1(cx - tw0 / 2)} ${ty0 + 10} Q${n1(cx - tw0 / 2)} ${ty0} ${n1(cx - tw0 / 2 + 10)} ${ty0} H${n1(cx + tw0 / 2 - 10)} Q${n1(cx + tw0 / 2)} ${ty0} ${n1(cx + tw0 / 2)} ${ty0 + 10} L${n1(cx + tw1 / 2)} ${ty1} H${n1(cx - tw1 / 2)} Z`;
  const neck = grown ? `<rect x="${n1(cx - 6)}" y="${n1(top + hh * 2 - 4)}" width="12" height="${n1(ty0 - (top + hh * 2) + 8)}" fill="${shade(l.skin, -0.1)}"/>` : '';
  const footY = 250, hipY = ty1 - 2;
  const [lg, rg] = legsAt(cx, hipY, footY, tw1 * 0.22, A.legs);
  const legs = [lg, rg].map(([hx, hy, fx, fy]) => (C.longSkirt ? '' : limb(hx, hy, fx, fy, P.legW, P.legW, C.legs === l.skin ? shade(l.skin, -0.04) : C.legs))).join('');
  const shoes = [lg, rg].map(([, , fx, fy], i) => `<path d="M${n1(fx - 7)} ${n1(fy + 2)} Q${n1(fx - 7)} ${n1(fy - 6)} ${n1(fx + (i ? 2 : -2))} ${n1(fy - 6)} Q${n1(fx + (i ? 14 : -14))} ${n1(fy - 4)} ${n1(fx + (i ? 14 : -14))} ${n1(fy + 2)} Z" fill="${C.shoes}"/>`).join('');
  const sY = ty0 + 8, sX = tw0 / 2 - 2;
  const arm = (side: -1 | 1, pose: 'down' | 'up' | 'forward' | 'hold') => {
    const [hx, hy] = handAt(cx + side * sX, sY, P.arm, side, pose);
    return limb(cx + side * sX, sY, hx, hy, 9, 8, C.sleeve) + `<circle cx="${n1(hx)}" cy="${n1(hy)}" r="6" fill="${l.skin}"/>`;
  };
  const skirt = C.skirt ? `<path d="M${n1(cx - tw1 / 2)} ${ty1 - 24} H${n1(cx + tw1 / 2)} L${n1(cx + tw1 / 2 + (C.longSkirt ? 24 : 18))} ${C.longSkirt ? 248 : ty1 + 22} H${n1(cx - tw1 / 2 - (C.longSkirt ? 24 : 18))} Z" fill="${C.skirt}"/>` : '';
  const cape = C.cape ? `<path d="M${n1(cx - tw0 / 2)} ${ty0} H${n1(cx + tw0 / 2)} L${n1(cx + tw1 / 2 + 18)} ${ty1 + 24} H${n1(cx - tw1 / 2 - 18)} Z" fill="${C.cape}"/>` : '';
  const body = `${cape}${legs}${shoes}${neck}<path d="${torso}" fill="${C.top}"/>${stripes(l, id, `<path d="${torso}"/>`, ty0, ty1)}${l.outfit === 'overalls' ? `<rect x="${n1(cx - 16)}" y="${n1(ty0 + 22)}" width="32" height="${n1(ty1 - ty0 - 22)}" fill="${C.legs}"/>` : ''}${l.outfit === 'cardigan' || l.outfit === 'denim' ? `<path d="M${cx} ${ty0} V${ty1}" stroke="${shade(C.top, -0.25)}" stroke-width="3"/>` : ''}${skirt}`;
  const ears = grown ? [-1, 1].map((sd) => `<rect x="${n1(sd < 0 ? cx - hw - 6 : cx + hw - 2)}" y="${n1(eY - 4)}" width="8" height="14" rx="4" fill="${l.skin}"/>`).join('') : [-1, 1].map((sd) => `<circle cx="${n1(cx + sd * hw * 0.98)}" cy="${n1(eY + 6)}" r="6" fill="${l.skin}"/>`).join('');
  const face = `${back}${ears}<path d="${headPath}" fill="${l.skin}"/>${beard}<circle cx="${n1(cx - eGap - 4)}" cy="${n1(nY + 10)}" r="${grown ? 0 : 6}" fill="#f08a8a" opacity=".45"/><circle cx="${n1(cx + eGap + 4)}" cy="${n1(nY + 10)}" r="${grown ? 0 : 6}" fill="#f08a8a" opacity=".45"/><g transform="translate(${n1(hw * 0.14)} 0)"><g class="bt-eyes">${appealEye(id, cx - eGap, eY, er * 3.3, -1, 'retro', l, es, INK)}${appealEye(id, cx + eGap, eY, er * 3.3, 1, 'retro', l, es, INK)}</g>${brow}${nose}${mouth}${stache}${freck}</g>${front}<g transform="translate(${n1(hw * 0.14)} 0)">${specs(l, cx, eY, er * 2.7, eGap, true)}</g>${hat(l, head, true)}`;
  return { svg: assemble(l, body, face, arm, A, head, held), head };
}

/* ═══════════════════════ PAPER CUT ═══════════════════════ */
function paper(l: Look, id: string): { svg: string; head: Head } {
  const k = l.kind as 'baby' | 'kid' | 'adult' | 'elder';
  const fw = 1 + 0.08 * sh(l, 'faceWidth'), fl = 1 + 0.06 * sh(l, 'faceLength');
  const P = { baby: { r: 48, torso: [150, 214], tw: [40, 74], legW: 12, arm: 34 }, kid: { r: 38, torso: [118, 204], tw: [30, 70], legW: 11, arm: 46 }, adult: { r: 33, torso: [106, 210], tw: [32, 86], legW: 11, arm: 58 }, elder: { r: 34, torso: [108, 210], tw: [36, 90], legW: 11, arm: 54 } }[k];
  const rx = P.r * fw, ry = P.r * fl, cx = 100, cy = P.torso[0] - ry + 2, top = cy - ry;
  const head: Head = { cx, cy, rx, ry, top, chin: cy + ry };
  const C = clothes(l), A = armsOf(l), ex = exprOf(l);
  const tilt = ((l.skin.charCodeAt(3) + l.hairStyle.length) % 5) - 2; // each piece slightly off-true
  const eY = cy + ry * 0.05, eGap = rx * 0.36 + 2 * sh(l, 'eyeGap'), er = (k === 'baby' ? 4.6 : 3.8) * (1 + 0.1 * sh(l, 'eyeSize'));
  const es = eyeOf(ex);
  const eye = (x: number, side: number) => es === 'closed' || (es === 'wink' && side > 0) || es === 'sleepy'
    ? `<path d="M${n1(x - er * 1.3)} ${n1(eY)} Q${x} ${n1(eY - er * 1.4)} ${n1(x + er * 1.3)} ${n1(eY)}" stroke="#1f1a17" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
    : `<ellipse cx="${n1(x)}" cy="${n1(eY)}" rx="${n1(er)}" ry="${n1(er * 1.35)}" fill="${l.eyes ?? '#5a3a22'}"/><ellipse cx="${n1(x)}" cy="${n1(eY + er * 0.1)}" rx="${n1(er * 0.66)}" ry="${n1(er * 0.92)}" fill="#1f1a17"/>`;
  const mY = eY + ry * 0.42, mW = rx * 0.22 * (1 + 0.1 * sh(l, 'mouth'));
  const mk = mouthOf(ex);
  const mouth = mk === 'open' || mk === 'grin' || mk === 'tongue' ? `<path d="M${n1(cx - mW)} ${n1(mY)} Q${cx} ${n1(mY + mW * 1.3)} ${n1(cx + mW)} ${n1(mY)} Z" fill="#c8423a"/>`
    : mk === 'o' ? `<circle cx="${cx}" cy="${n1(mY + 2)}" r="${n1(mW * 0.45)}" fill="#c8423a"/>`
    : `<path d="M${n1(cx - mW)} ${n1(mY)} Q${cx} ${n1(mY + mW * 0.9)} ${n1(cx + mW)} ${n1(mY)}" stroke="#c8423a" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  const cheeks = [-1, 1].map((sd) => `<circle cx="${n1(cx + sd * rx * 0.55)}" cy="${n1(eY + ry * 0.3)}" r="${n1(rx * 0.14)}" fill="#f08a8a" opacity=".7"/>`).join('');
  const nose = k === 'adult' || k === 'elder' ? `<path d="M${n1(cx - 3)} ${n1(eY + ry * 0.24)} L${cx} ${n1(eY + 4)} L${n1(cx + 4)} ${n1(eY + ry * 0.24)} Z" fill="${shade(l.skin, -0.14)}"/>` : '';
  const fh = facialOf(l);
  const beard = fh === 'full' || fh === 'trim' ? `<path d="M${n1(cx - rx * 0.92)} ${n1(cy + ry * 0.1)} Q${n1(cx - rx * 0.9)} ${n1(cy + ry * 1.25)} ${cx} ${n1(cy + ry * 1.25)} Q${n1(cx + rx * 0.9)} ${n1(cy + ry * 1.25)} ${n1(cx + rx * 0.92)} ${n1(cy + ry * 0.1)} Q${cx} ${n1(mY + 8)} ${n1(cx - rx * 0.92)} ${n1(cy + ry * 0.1)} Z" fill="${l.hair}"/>` : '';
  const stache = fh === 'moustache' || fh === 'trim' || fh === 'full' ? `<path d="M${n1(cx - mW * 1.6)} ${n1(mY - 2)} Q${cx} ${n1(mY - 12)} ${n1(cx + mW * 1.6)} ${n1(mY - 2)} Q${cx} ${n1(mY - 6)} ${n1(cx - mW * 1.6)} ${n1(mY - 2)} Z" fill="${l.hair}"/>` : '';
  const freck = l.freckles ? [-1, 1].flatMap((sd) => [0, 1, 2].map((i) => `<circle cx="${n1(cx + sd * (rx * 0.5 + i * 3 - 3))}" cy="${n1(eY + ry * 0.2 + (i % 2) * 3)}" r="1.3" fill="${shade(l.skin, -0.3)}"/>`)).join('') : '';
  // scalloped paper hair
  const fam = FAM[l.hairStyle] ?? 'short', hc = l.hair;
  const scallop = (y: number, x0: number, x1: number, n: number, r: number) => Array.from({ length: n }, (_, i) => `<circle cx="${n1(x0 + ((x1 - x0) * (i + 0.5)) / n)}" cy="${n1(y)}" r="${n1(r)}" fill="${hc}"/>`).join('');
  const dome = `M${n1(cx - rx * 1.06)} ${n1(cy - ry * 0.02)} A${n1(rx * 1.06)} ${n1(ry * 1.08)} 0 0 1 ${n1(cx + rx * 1.06)} ${n1(cy - ry * 0.02)} Z`;
  let back = '', front = '';
  switch (fam) {
    case 'none': break;
    case 'sides': front = [-1, 1].map((sd) => `<ellipse cx="${n1(cx + sd * rx * 0.95)}" cy="${n1(cy - ry * 0.1)}" rx="7" ry="${n1(ry * 0.3)}" fill="${hc}"/>`).join(''); break;
    case 'tuft': front = `<path d="M${cx} ${n1(top + 2)} q-2 -12 8 -14 q-4 6 2 10 Z" fill="${hc}"/>`; break;
    case 'buzz': front = `<path d="${dome}" fill="${hc}" opacity=".8" clip-path="url(#tp${id})"/><clipPath id="tp${id}"><rect x="0" y="0" width="200" height="${n1(cy - ry * 0.45)}"/></clipPath>`; break;
    case 'short': case 'side': case 'messy': case 'bun': case 'pony': case 'pigtails':
      front = `<clipPath id="tp${id}"><rect x="0" y="0" width="200" height="${n1(cy - ry * 0.35)}"/></clipPath><path d="${dome}" fill="${hc}" clip-path="url(#tp${id})"/>${scallop(cy - ry * 0.38, cx - rx * 0.9, cx + rx * 0.9, fam === 'messy' ? 6 : 5, rx * 0.17)}`;
      if (fam === 'bun') back = `<circle cx="${cx}" cy="${n1(top - ry * 0.28)}" r="${n1(rx * 0.4)}" fill="${hc}"/>`;
      if (fam === 'pony') back = `<path d="M${n1(cx + rx * 0.7)} ${n1(top + 8)} Q${n1(cx + rx * 1.8)} ${n1(cy + ry * 0.5)} ${n1(cx + rx * 1.1)} ${n1(cy + ry * 1.4)} Q${n1(cx + rx * 1.2)} ${n1(cy)} ${n1(cx + rx * 0.5)} ${n1(top + 14)} Z" fill="${hc}"/>`;
      if (fam === 'pigtails') back = [-1, 1].map((sd) => `<path d="M${n1(cx + sd * rx * 0.9)} ${n1(cy - ry * 0.3)} l${n1(sd * rx * 0.7)} ${n1(ry * 0.2)} l${n1(-sd * rx * 0.2)} ${n1(ry * 0.6)} Z" fill="${hc}"/>`).join('');
      break;
    case 'bob': case 'long': case 'curlyLong': {
      const len = fam === 'bob' ? cy + ry * 0.8 : P.torso[0] + 50;
      back = `<path d="M${n1(cx - rx * 1.14)} ${n1(cy)} A${n1(rx * 1.14)} ${n1(ry * 1.16)} 0 0 1 ${n1(cx + rx * 1.14)} ${n1(cy)} V${n1(len)} ${Array.from({ length: 6 }, (_, i) => `L${n1(cx + rx * 1.14 - ((i + 0.5) * rx * 2.28) / 6)} ${n1(len + (i % 2 ? 0 : 8))}`).join(' ')} L${n1(cx - rx * 1.14)} ${n1(len)} Z" fill="${hc}"/>`;
      front = `<clipPath id="tp${id}"><rect x="0" y="0" width="200" height="${n1(cy - ry * (l.hairStyle === 'bangs' ? 0.1 : 0.4))}"/></clipPath><path d="${dome}" fill="${hc}" clip-path="url(#tp${id})"/>`;
      break;
    }
    case 'curlyShort': case 'afro': {
      const n = fam === 'afro' ? 11 : 9, R = fam === 'afro' ? 1.32 : 1.05;
      back = Array.from({ length: n }, (_, i) => { const a = Math.PI * (0.95 + (i / (n - 1)) * 1.1); return `<circle cx="${n1(cx + Math.cos(a) * rx * R)}" cy="${n1(cy + Math.sin(a) * ry * R)}" r="${n1(rx * (fam === 'afro' ? 0.42 : 0.3))}" fill="${hc}"/>`; }).join('');
      front = scallop(cy - ry * 0.55, cx - rx * 0.8, cx + rx * 0.8, 5, rx * 0.2);
      break;
    }
  }
  const [ty0, ty1] = P.torso, [tw0, tw1] = P.tw;
  const torso = `M${n1(cx - tw0 / 2)} ${ty0} H${n1(cx + tw0 / 2)} L${n1(cx + tw1 / 2)} ${ty1} H${n1(cx - tw1 / 2)} Z`;
  const footY = 250, hipY = ty1 - 4;
  const [lg, rg] = legsAt(cx, hipY, footY, tw1 * 0.2, A.legs);
  const legs = [lg, rg].map(([hx, hy, fx, fy]) => (C.longSkirt ? '' : limb(hx, hy, fx, fy, P.legW, P.legW, C.legs === l.skin ? l.skin : C.legs))).join('');
  const shoes = [lg, rg].map(([, , fx, fy], i) => `<path d="M${n1(fx - 9)} ${n1(fy + 3)} A9 8 0 0 1 ${n1(fx + 9 + (i ? 4 : -4))} ${n1(fy + 3)} Z" fill="${C.shoes}"/>`).join('');
  const sY = ty0 + 10, sX = tw0 / 2 + 2;
  const arm = (side: -1 | 1, pose: 'down' | 'up' | 'forward' | 'hold') => {
    const [hx, hy] = handAt(cx + side * sX, sY, P.arm, side, pose);
    return limb(cx + side * sX, sY, hx, hy, 11, 10, C.sleeve) + `<circle cx="${n1(hx)}" cy="${n1(hy)}" r="6.5" fill="${l.skin}"/>`;
  };
  const skirt = C.skirt ? `<path d="M${n1(cx - tw1 / 2 + 4)} ${ty1 - 30} H${n1(cx + tw1 / 2 - 4)} L${n1(cx + tw1 / 2 + (C.longSkirt ? 18 : 10))} ${C.longSkirt ? 248 : ty1 + 14} ${Array.from({ length: 7 }, (_, i) => `L${n1(cx + tw1 / 2 + 10 - ((i + 0.5) * (tw1 + 20)) / 7)} ${n1((C.longSkirt ? 248 : ty1 + 14) + (i % 2 ? 0 : 6))}`).join(' ')} L${n1(cx - tw1 / 2 - (C.longSkirt ? 18 : 10))} ${C.longSkirt ? 248 : ty1 + 14} Z" fill="${C.skirt}"/>` : '';
  const cape = C.cape ? `<path d="M${n1(cx - tw0 / 2)} ${ty0} H${n1(cx + tw0 / 2)} L${n1(cx + tw1 / 2 + 14)} ${ty1 + 20} H${n1(cx - tw1 / 2 - 14)} Z" fill="${C.cape}"/>` : '';
  const neck = `<rect x="${n1(cx - 5)}" y="${n1(cy + ry - 4)}" width="10" height="${n1(ty0 - cy - ry + 8)}" fill="${l.skin}"/>`;
  const body = `${cape}${legs}${shoes}${neck}<path d="${torso}" fill="${C.top}"/>${stripes(l, id, `<path d="${torso}"/>`, ty0, ty1)}${l.outfit === 'overalls' ? `<path d="M${n1(cx - tw1 * 0.28)} ${n1(ty0 + 30)} H${n1(cx + tw1 * 0.28)} L${n1(cx + tw1 * 0.42)} ${ty1} H${n1(cx - tw1 * 0.42)} Z" fill="${C.legs}"/>` : ''}<path d="M${n1(cx - 6)} ${ty0} L${cx} ${ty0 + 10} L${n1(cx + 6)} ${ty0} Z" fill="${l.skin}"/>${skirt}`;
  const face = `<g transform="rotate(${tilt} ${cx} ${n1(cy + ry)})">${back}<ellipse cx="${cx}" cy="${n1(cy)}" rx="${n1(rx)}" ry="${n1(ry)}" fill="${l.skin}"/>${beard}${cheeks}<g transform="translate(${n1(rx * 0.14)} 0)"><g class="bt-eyes">${appealEye(id, cx - eGap, eY, er * 4.3, -1, 'paper', l, es, '#1f1a17')}${appealEye(id, cx + eGap, eY, er * 4.3, 1, 'paper', l, es, '#1f1a17')}</g>${es === 'closed' ? '' : [-1, 1].map((sd) => { const bx = cx + sd * eGap, by = eY - er * 2.7 - (exprOf(l) === 'worried' ? 1.5 : 0); const ww = er * (sd > 0 ? 1.6 : 1.85); return `<path d="M${n1(bx - ww)} ${n1(by + 1.5)} Q${n1(bx)} ${n1(by - 3.2)} ${n1(bx + ww)} ${n1(by + 1.5)} Q${n1(bx)} ${n1(by - 0.6)} ${n1(bx - ww)} ${n1(by + 1.5)} Z" fill="${shade(l.hair, -0.15)}"/>`; }).join('')}${nose}${mouth}${stache}${freck}</g>${front}<g transform="translate(${n1(rx * 0.14)} 0)">${specs(l, cx, eY, er * 2.6, eGap, false, '#1f1a17')}</g>${hat(l, head, true)}</g>`;
  return { svg: assemble(l, body, face, arm, A, head, held), head };
}

/* ── put it together: back arm, body, head, front arm, pose ── */
function assemble(l: Look, body: string, face: string, arm: (side: -1 | 1, pose: 'down' | 'up' | 'forward' | 'hold') => string, A: Arms, h: Head, hold: (l: Look, x: number, y: number) => string): string {
  const shadow = `<ellipse cx="100" cy="255" rx="50" ry="6" fill="#000" opacity=".1"/>`;
  const left = arm(-1, A.left), right = arm(1, A.right);
  // where the right hand ended up, for a held thing (read back from the drawn circle/ellipse)
  const m = /<(?:circle|ellipse) cx="([\d.-]+)" cy="([\d.-]+)"[^>]*\/>(?![\s\S]*<(?:circle|ellipse) cx)/.exec(right);
  const thing = l.hold && m ? hold(l, +m[1] + 4, +m[2]) : '';
  const lean = A.lean ? ` rotate(${A.lean} 100 252)` : '';
  return `${shadow}<g class="bt-body" transform="translate(0 ${-A.lift})${lean}">${body}${left}<g class="bt-head" transform="rotate(-3 ${h.cx} ${n1(h.chin)})">${face}</g>${right}${thing}</g>`;
}

const DRAW: Record<DesignMode, (l: Look, id: string) => { svg: string; head: Head }> = { tales: (l, id) => featureCharacter(l, id, { hat, held, clothes, stripes }), pocketlight: ragdoll, gouache: retro, wondercut: paper, inked: sketch };

/** The character in a look's own design, or null when the old renderer should draw it (pets, image faces, drawings). */
export function designCharacter(l: Look, mode: StyleMode, id: string): { svg: string; head: Head } | null {
  if (!hasDesign(mode) || ['dog', 'cat', 'bunny'].includes(l.kind) || l.face || l.drawing) return null;
  // a parent's own drawn hat, outfit, glasses or toy is fitted to the original construction
  if (l.outfit === 'drawn' || l.hat === 'drawn' || l.glasses === 'drawn' || l.extra === 'drawn') return null;
  return DRAW[mode](l, id);
}

/** Where the head sits in a look's design, for face crops (avatars, cast tiles). */
export function designHead(l: Look, mode: StyleMode): Head | null {
  const r = designCharacter({ ...l, hat: 'none', hold: undefined }, mode, 'probe');
  return r?.head ?? null;
}
