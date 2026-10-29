import { exprOf, outfitColours, shade, type Expression, type HairStyle, type Look } from './character';
import type { StyleMode } from './styles';
import { thingArt } from './things';

/**
 * Character designs: each look builds people its own way, like the difference
 * between two animation studios' films, not the same puppet in a different finish.
 *
 *  - Clay      stop-motion puppets: heavy, bottom-weighted bean heads, big goggle eyes
 *              under sleepy lids, a bulb nose, a wide toothy grin, stubby legs and big
 *              mitten hands and shoes
 *  - Retro     mid-century shape design: grown-ups are blocks (square heads, boxy
 *              bodies, stick legs), kids are circles, eyes are dots, glasses are bold
 *              frames, hair is a flat graphic shape
 *  - Paper cut flat cut-paper pieces: a round head, scalloped hair, an A-line body,
 *              strip arms, each piece a little off-true like it was cut by hand
 *  - Comic     big-headed comic characters: a huge head on a small body, very large
 *              shining eyes, a tiny nose, chunky pointed locks of hair
 *
 * Every design draws the same person: skin, hair colour and style, eye colour,
 * glasses, facial hair and freckles come from the Look, and the face proportions read
 * from a photo stretch the head and features. All designs are original; none copies a
 * character or a studio's model sheet. Each draws in the same 200 × 260 box as
 * character.ts, standing on y 252, so scenes, covers and avatars place them alike.
 */

export type DesignMode = Exclude<StyleMode, 'tales'>;
export const hasDesign = (m: StyleMode): m is DesignMode => m !== 'tales';

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

/* ═════════════════════════ CLAY ═════════════════════════ */
function clay(l: Look, id: string): { svg: string; head: Head } {
  const k = l.kind as 'baby' | 'kid' | 'adult' | 'elder';
  const fw = 1 + 0.08 * sh(l, 'faceWidth'), fl = 1 + 0.06 * sh(l, 'faceLength');
  const P = { baby: { hw: 58, hh: 60, torso: [152, 214], tw: [66, 92], leg: 14, legW: 20, arm: 40 }, kid: { hw: 48, hh: 52, torso: [136, 208], tw: [56, 82], leg: 26, legW: 19, arm: 48 }, adult: { hw: 44, hh: 50, torso: [128, 210], tw: [62, 98], leg: 30, legW: 22, arm: 56 }, elder: { hw: 46, hh: 48, torso: [130, 210], tw: [66, 104], leg: 26, legW: 22, arm: 54 } }[k];
  const hw = P.hw * fw, hh = P.hh * fl, cx = 100, top = P.torso[0] - hh * 2 + 10, cy = top + hh;
  const head: Head = { cx, cy, rx: hw, ry: hh, top, chin: top + hh * 2 };
  const C = clothes(l), A = armsOf(l), ex = exprOf(l);
  const skinD = shade(l.skin, -0.14);
  // a bean head: wider at the jowls than the crown
  const jw = hw * (1.06 + 0.06 * sh(l, 'jaw'));
  const headPath = `M${cx} ${n1(top)} C${n1(cx + hw * 0.9)} ${n1(top)} ${n1(cx + hw)} ${n1(top + hh * 0.5)} ${n1(cx + jw)} ${n1(cy + hh * 0.3)} C${n1(cx + jw * 1.04)} ${n1(cy + hh * 0.85)} ${n1(cx + hw * 0.5)} ${n1(top + hh * 2)} ${cx} ${n1(top + hh * 2)} C${n1(cx - hw * 0.5)} ${n1(top + hh * 2)} ${n1(cx - jw * 1.04)} ${n1(cy + hh * 0.85)} ${n1(cx - jw)} ${n1(cy + hh * 0.3)} C${n1(cx - hw)} ${n1(top + hh * 0.5)} ${n1(cx - hw * 0.9)} ${n1(top)} ${cx} ${n1(top)} Z`;
  // goggle eyes set close together under heavy lids
  const er = (k === 'baby' ? 13 : k === 'kid' ? 12 : 10.5) * (1 + 0.1 * sh(l, 'eyeSize'));
  const eGap = er * 0.98 + 2 * sh(l, 'eyeGap'), eY = cy - hh * 0.12;
  const eyeState = eyeOf(ex);
  const lid = eyeState === 'sleepy' ? 0.55 : eyeState === 'wide' ? 0.04 : k === 'baby' ? 0.1 : 0.16;
  const oneEye = (x: number, side: number) => {
    if (eyeState === 'closed' || (eyeState === 'wink' && side > 0)) return `<path d="M${n1(x - er)} ${n1(eY)} Q${x} ${n1(eY + er * 0.7)} ${n1(x + er)} ${n1(eY)}" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    return `<ellipse cx="${n1(x)}" cy="${n1(eY)}" rx="${n1(er)}" ry="${n1(er * 1.12)}" fill="#fffdf6" stroke="${shade(l.skin, -0.3)}" stroke-width="1.4"/>
      <circle cx="${n1(x + side * -er * 0.12)}" cy="${n1(eY + er * 0.2)}" r="${n1(er * 0.58)}" fill="${l.eyes ?? '#5a3a22'}"/><circle cx="${n1(x + side * -er * 0.12)}" cy="${n1(eY + er * 0.2)}" r="${n1(er * 0.32)}" fill="#1a110e"/><circle cx="${n1(x + side * -er * 0.12 - er * 0.12)}" cy="${n1(eY + er * 0.06)}" r="${n1(er * 0.11)}" fill="#fff"/>
      <path d="M${n1(x - er * 1.1)} ${n1(eY - er * 1.3)} H${n1(x + er * 1.1)} V${n1(eY - er * 1.12 + er * 2.24 * lid)} Q${x} ${n1(eY - er * 1.12 + er * 2.24 * lid + er * 0.4)} ${n1(x - er * 1.1)} ${n1(eY - er * 1.12 + er * 2.24 * lid)} Z" fill="${shade(l.skin, -0.04)}" clip-path="url(#ce${id}${side})"/>
      <clipPath id="ce${id}${side}"><ellipse cx="${n1(x)}" cy="${n1(eY)}" rx="${n1(er)}" ry="${n1(er * 1.12)}"/></clipPath>
      <path d="M${n1(x - er * 0.98)} ${n1(eY - er * 1.12 + er * 2.24 * lid)} Q${x} ${n1(eY - er * 1.12 + er * 2.24 * lid + er * 0.4)} ${n1(x + er * 0.98)} ${n1(eY - er * 1.12 + er * 2.24 * lid)}" stroke="${shade(l.skin, -0.32)}" stroke-width="1.8" fill="none"/>`;
  };
  const nose = (k === 'baby' ? 6 : k === 'kid' ? 8 : 11) * (1 + 0.15 * sh(l, 'nose'));
  const nY = eY + er * 1.3 + nose * 0.4;
  const mY = nY + nose * 1.1 + (k === 'baby' ? 2 : 6), mW = hw * (k === 'baby' ? 0.32 : 0.6) * (1 + 0.1 * sh(l, 'mouth'));
  const mouthK = mouthOf(ex);
  const mouth = mouthK === 'grin' || mouthK === 'open' || (mouthK === 'smile' && k !== 'baby')
    ? `<path d="M${n1(cx - mW)} ${n1(mY - 3)} Q${cx} ${n1(mY + (mouthK === 'open' ? 22 : 14))} ${n1(cx + mW)} ${n1(mY - 3)} Q${cx} ${n1(mY + 3)} ${n1(cx - mW)} ${n1(mY - 3)} Z" fill="#6b2a2a"/><path d="M${n1(cx - mW * 0.86)} ${n1(mY - 1.5)} Q${cx} ${n1(mY + 3.5)} ${n1(cx + mW * 0.86)} ${n1(mY - 1.5)} L${n1(cx + mW * 0.7)} ${n1(mY + 3.5)} Q${cx} ${n1(mY + 7)} ${n1(cx - mW * 0.7)} ${n1(mY + 3.5)} Z" fill="#fffdf6"/><path d="M${n1(cx - mW - 2)} ${n1(mY - 4)} Q${cx} ${n1(mY + (mouthK === 'open' ? 25 : 17))} ${n1(cx + mW + 2)} ${n1(mY - 4)}" stroke="${skinD}" stroke-width="2.4" fill="none"/>`
    : mouthK === 'o' ? `<ellipse cx="${cx}" cy="${n1(mY + 4)}" rx="${n1(mW * 0.32)}" ry="${n1(mW * 0.42)}" fill="#6b2a2a"/>`
    : mouthK === 'wobbly' ? `<path d="M${n1(cx - mW * 0.6)} ${n1(mY + 4)} q${n1(mW * 0.3)} -5 ${n1(mW * 0.6)} 0 t${n1(mW * 0.6)} 0" stroke="#6b2a2a" stroke-width="3" fill="none" stroke-linecap="round"/>`
    : mouthK === 'tongue' ? `<path d="M${n1(cx - mW * 0.7)} ${n1(mY)} Q${cx} ${n1(mY + 12)} ${n1(cx + mW * 0.7)} ${n1(mY)} Z" fill="#6b2a2a"/><ellipse cx="${n1(cx + 3)}" cy="${n1(mY + 9)}" rx="7" ry="6" fill="#ef7f8a"/>`
    : `<path d="M${n1(cx - mW * 0.55)} ${n1(mY + 1)} Q${cx} ${n1(mY + 9)} ${n1(cx + mW * 0.55)} ${n1(mY + 1)}" stroke="#6b2a2a" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
  const brows = (eyeState === 'closed' ? '' : [-1, 1].map((sd) => `<path d="M${n1(cx + sd * (eGap - er * 0.85))} ${n1(eY - er * 1.95)} Q${n1(cx + sd * eGap)} ${n1(eY - er * 2.45)} ${n1(cx + sd * (eGap + er * 0.95))} ${n1(eY - er * 1.7)}" stroke="${shade(l.hair, -0.1)}" stroke-width="${k === 'baby' ? 2.4 : 4}" fill="none" stroke-linecap="round"/>`).join(''));
  const ears = [-1, 1].map((sd) => `<ellipse cx="${n1(cx + sd * jw * 0.98)}" cy="${n1(eY + 4)}" rx="9" ry="13" fill="${l.skin}"/><ellipse cx="${n1(cx + sd * jw * 0.98)}" cy="${n1(eY + 4)}" rx="4" ry="7" fill="${skinD}"/>`).join('');
  const fh = facialOf(l);
  const beard = fh === 'full' || fh === 'trim' ? `<path d="M${n1(cx - jw * 0.92)} ${n1(cy + hh * 0.2)} Q${n1(cx - jw)} ${n1(top + hh * 2.18)} ${cx} ${n1(top + hh * 2.2)} Q${n1(cx + jw)} ${n1(top + hh * 2.18)} ${n1(cx + jw * 0.92)} ${n1(cy + hh * 0.2)} Q${n1(cx + mW * 1.2)} ${n1(mY + 14)} ${cx} ${n1(mY + 16)} Q${n1(cx - mW * 1.2)} ${n1(mY + 14)} ${n1(cx - jw * 0.92)} ${n1(cy + hh * 0.2)} Z" fill="${l.hair}"/>` : '';
  const stache = fh !== 'none' && fh !== 'stubble' ? `<path d="M${cx} ${n1(nY + nose * 0.6)} Q${n1(cx - mW * 0.9)} ${n1(nY + nose * 0.3)} ${n1(cx - mW * 1.05)} ${n1(mY)} Q${n1(cx - mW * 0.5)} ${n1(nY + nose * 1.5)} ${cx} ${n1(nY + nose * 1.1)} Q${n1(cx + mW * 0.5)} ${n1(nY + nose * 1.5)} ${n1(cx + mW * 1.05)} ${n1(mY)} Q${n1(cx + mW * 0.9)} ${n1(nY + nose * 0.3)} ${cx} ${n1(nY + nose * 0.6)} Z" fill="${l.hair}"/>` : '';
  const freck = l.freckles ? [-1, 1].flatMap((sd) => [[16, 2], [22, 6], [12, 7]].map(([dx, dy]) => `<circle cx="${n1(cx + sd * (eGap + dx * 0.4))}" cy="${n1(nY + dy)}" r="1.6" fill="${skinD}"/>`)).join('') : '';
  // sculpted hair: thick clumps with grooves
  const fam = FAM[l.hairStyle] ?? 'short', hc = l.hair, hd = shade(hc, -0.22);
  const groove = (d: string) => `<path d="${d}" stroke="${hd}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".7"/>`;
  const cap = `M${n1(cx - hw * 1.04)} ${n1(cy - hh * 0.05)} C${n1(cx - hw * 1.08)} ${n1(top - hh * 0.25)} ${n1(cx + hw * 1.08)} ${n1(top - hh * 0.25)} ${n1(cx + hw * 1.04)} ${n1(cy - hh * 0.05)} C${n1(cx + hw * 0.7)} ${n1(top + hh * 0.42)} ${n1(cx - hw * 0.3)} ${n1(top + hh * 0.5)} ${n1(cx - hw * 1.04)} ${n1(cy - hh * 0.05)} Z`;
  let back = '', front = '';
  switch (fam) {
    case 'none': break;
    case 'sides': front = [-1, 1].map((sd) => `<ellipse cx="${n1(cx + sd * jw * 0.92)}" cy="${n1(eY - 6)}" rx="10" ry="16" fill="${hc}"/>`).join(''); break;
    case 'tuft': front = `<path d="M${cx} ${n1(top + 6)} q-4 -16 8 -20 q10 -2 8 8 q-2 6 -8 4" stroke="${hc}" stroke-width="6" fill="none" stroke-linecap="round"/>`; break;
    case 'buzz': front = `<path d="${cap}" fill="${hc}" opacity=".8"/>`; break;
    case 'short': case 'side': case 'messy':
      front = `<path d="${cap}" fill="${hc}"/>${fam === 'side' ? `<path d="M${n1(cx - hw * 0.9)} ${n1(top + hh * 0.3)} Q${n1(cx - hw * 0.1)} ${n1(top - hh * 0.35)} ${n1(cx + hw * 1.0)} ${n1(top + hh * 0.36)} Q${n1(cx + hw * 0.3)} ${n1(top + hh * 0.2)} ${n1(cx - hw * 0.9)} ${n1(top + hh * 0.3)} Z" fill="${shade(hc, 0.1)}"/>` : ''}${fam === 'messy' ? [-0.6, -0.1, 0.4, 0.8].map((t) => `<path d="M${n1(cx + t * hw)} ${n1(top + 2)} q${n1(4 + t * 6)} -18 ${n1(12 + t * 4)} -10 q-6 2 -6 10 Z" fill="${hc}"/>`).join('') : ''}${groove(`M${n1(cx - hw * 0.5)} ${n1(top + hh * 0.08)} Q${cx} ${n1(top - hh * 0.04)} ${n1(cx + hw * 0.5)} ${n1(top + hh * 0.1)}`)}`;
      break;
    case 'bob': case 'long': case 'curlyLong': {
      const len = fam === 'bob' ? cy + hh * 0.6 : P.torso[0] + 44;
      back = `<path d="M${n1(cx - jw * 1.18)} ${n1(cy - hh * 0.2)} C${n1(cx - jw * 1.3)} ${n1(top - hh * 0.3)} ${n1(cx + jw * 1.3)} ${n1(top - hh * 0.3)} ${n1(cx + jw * 1.18)} ${n1(cy - hh * 0.2)} L${n1(cx + jw * 1.2)} ${n1(len)} Q${cx} ${n1(len + 10)} ${n1(cx - jw * 1.2)} ${n1(len)} Z" fill="${hc}"/>${groove(`M${n1(cx - jw * 1.05)} ${n1(cy)} L${n1(cx - jw * 1.08)} ${n1(len - 6)}`)}${groove(`M${n1(cx + jw * 1.05)} ${n1(cy)} L${n1(cx + jw * 1.08)} ${n1(len - 6)}`)}`;
      front = `<path d="M${n1(cx - hw * 1.05)} ${n1(cy - hh * 0.1)} C${n1(cx - hw * 1.1)} ${n1(top - hh * 0.28)} ${n1(cx + hw * 1.1)} ${n1(top - hh * 0.28)} ${n1(cx + hw * 1.05)} ${n1(cy - hh * 0.1)} Q${n1(cx + hw * 0.6)} ${n1(top + hh * (l.hairStyle === 'bangs' ? 0.72 : 0.36))} ${n1(cx - hw * 0.1)} ${n1(top + hh * (l.hairStyle === 'bangs' ? 0.72 : 0.5))} Q${n1(cx - hw * 0.8)} ${n1(top + hh * 0.5)} ${n1(cx - hw * 1.05)} ${n1(cy - hh * 0.1)} Z" fill="${hc}"/>${fam === 'curlyLong' ? Array.from({ length: 8 }, (_, i) => `<circle cx="${n1(cx + (i % 2 ? 1 : -1) * jw * 1.16)}" cy="${n1(cy + (Math.floor(i / 2)) * 18)}" r="9" fill="${hc}"/>`).join('') : ''}`;
      break;
    }
    case 'curlyShort': case 'afro': {
      const R = fam === 'afro' ? 1.42 : 1.12, n = fam === 'afro' ? 13 : 10;
      back = Array.from({ length: n }, (_, i) => { const a = Math.PI * (0.92 + (i / (n - 1)) * 1.16); return `<circle cx="${n1(cx + Math.cos(a) * hw * R)}" cy="${n1(cy - hh * 0.1 + Math.sin(a) * hh * R)}" r="${fam === 'afro' ? 22 : 14}" fill="${hc}"/>`; }).join('') + (fam === 'afro' ? `<ellipse cx="${cx}" cy="${n1(cy - hh * 0.4)}" rx="${n1(hw * 1.3)}" ry="${n1(hh * 1.1)}" fill="${hc}"/>` : '');
      front = Array.from({ length: 6 }, (_, i) => `<circle cx="${n1(cx - hw * 0.8 + i * hw * 0.32)}" cy="${n1(top + hh * 0.12 + (i % 2) * 6)}" r="${fam === 'afro' ? 13 : 12}" fill="${hc}"/>`).join('');
      break;
    }
    case 'bun': back = `<circle cx="${cx}" cy="${n1(top - hh * 0.26)}" r="${n1(hw * 0.42)}" fill="${hc}"/>`; front = `<path d="${cap}" fill="${hc}"/>`; break;
    case 'pony': back = `<path d="M${n1(cx + hw * 0.6)} ${n1(top + 10)} Q${n1(cx + hw * 1.7)} ${n1(cy)} ${n1(cx + hw * 1.1)} ${n1(cy + hh * 1.2)} Q${n1(cx + hw * 1.2)} ${n1(cy)} ${n1(cx + hw * 0.4)} ${n1(top + 16)} Z" fill="${hc}"/>`; front = `<path d="${cap}" fill="${hc}"/>`; break;
    case 'pigtails': back = [-1, 1].map((sd) => `<ellipse cx="${n1(cx + sd * hw * 1.25)}" cy="${n1(cy - hh * 0.1)}" rx="${n1(hw * 0.32)}" ry="${n1(hh * 0.5)}" fill="${hc}"/>`).join(''); front = `<path d="${cap}" fill="${hc}"/>`; break;
  }
  // body: a pear-shaped torso, stubby legs, big shoes, mitten hands
  const [ty0, ty1] = P.torso, [tw0, tw1] = P.tw;
  const torso = `M${n1(cx - tw0 / 2)} ${ty0 + 6} Q${cx} ${ty0 - 6} ${n1(cx + tw0 / 2)} ${ty0 + 6} C${n1(cx + tw1 / 2 + 6)} ${n1((ty0 + ty1) / 2)} ${n1(cx + tw1 / 2 + 4)} ${ty1 - 6} ${n1(cx + tw1 / 2 - 6)} ${ty1} Q${cx} ${ty1 + 8} ${n1(cx - tw1 / 2 + 6)} ${ty1} C${n1(cx - tw1 / 2 - 4)} ${ty1 - 6} ${n1(cx - tw1 / 2 - 6)} ${n1((ty0 + ty1) / 2)} ${n1(cx - tw0 / 2)} ${ty0 + 6} Z`;
  const footY = 252 - 8, hipY = ty1 - 6;
  const [lg, rg] = legsAt(cx, hipY, footY, tw1 * 0.24, A.legs);
  const legs = [lg, rg].map(([hx, hy, fx, fy]) => limb(hx, hy, fx, fy, P.legW, P.legW * 0.9, C.longSkirt ? 'none' : C.legs)).join('');
  const shoes = [lg, rg].map(([, , fx, fy], i) => `<ellipse cx="${n1(fx + (i ? 6 : -6))}" cy="${n1(fy + 4)}" rx="${n1(P.legW * 0.95)}" ry="${n1(P.legW * 0.48)}" fill="${C.shoes}"/>`).join('');
  const sY = ty0 + 16, sX = tw0 / 2 + 4;
  const arm = (side: -1 | 1, pose: 'down' | 'up' | 'forward' | 'hold') => {
    const [hx, hy] = handAt(cx + side * sX, sY, P.arm, side, pose);
    return limb(cx + side * sX, sY, hx, hy, 17, 15, C.sleeve, side * 3) + `<ellipse cx="${n1(hx)}" cy="${n1(hy)}" rx="11" ry="12" fill="${l.skin}"/><ellipse cx="${n1(hx - side * 9)}" cy="${n1(hy - 4)}" rx="5" ry="6.5" fill="${l.skin}"/>`;
  };
  const skirt = C.skirt ? `<path d="M${n1(cx - tw1 / 2 + 2)} ${ty1 - 22} L${n1(cx + tw1 / 2 - 2)} ${ty1 - 22} L${n1(cx + tw1 / 2 + (C.longSkirt ? 16 : 12))} ${C.longSkirt ? 246 : ty1 + 22} Q${cx} ${C.longSkirt ? 252 : ty1 + 30} ${n1(cx - tw1 / 2 - (C.longSkirt ? 16 : 12))} ${C.longSkirt ? 246 : ty1 + 22} Z" fill="${C.skirt}"/>` : '';
  const cape = C.cape ? `<path d="M${n1(cx - tw0 / 2 - 4)} ${ty0 + 4} L${n1(cx + tw0 / 2 + 4)} ${ty0 + 4} L${n1(cx + tw1 / 2 + 16)} ${ty1 + 24} L${n1(cx - tw1 / 2 - 16)} ${ty1 + 24} Z" fill="${C.cape}"/>` : '';
  const body = `${cape}${legs}${shoes}<path d="${torso}" fill="${C.top}"/>${stripes(l, id, `<path d="${torso}"/>`, ty0, ty1)}${l.outfit === 'overalls' ? `<path d="M${n1(cx - 24)} ${n1(ty0 + 30)} H${n1(cx + 24)} V${ty1} H${n1(cx - 24)} Z" fill="${C.legs}"/>` : ''}${skirt}`;
  const face = `${back}${ears}<path d="${headPath}" fill="${l.skin}"/><ellipse cx="${n1(cx - hw * 0.45)}" cy="${n1(cy + hh * 0.35)}" rx="${n1(hw * 0.2)}" ry="${n1(hh * 0.12)}" fill="#f08a8a" opacity=".35"/><ellipse cx="${n1(cx + hw * 0.45)}" cy="${n1(cy + hh * 0.35)}" rx="${n1(hw * 0.2)}" ry="${n1(hh * 0.12)}" fill="#f08a8a" opacity=".35"/>${beard}<g class="bt-eyes">${oneEye(cx - eGap, -1)}${oneEye(cx + eGap, 1)}</g>${brows}<ellipse cx="${cx}" cy="${n1(nY)}" rx="${n1(nose * 0.95)}" ry="${n1(nose * 0.8)}" fill="${shade(l.skin, -0.05)}"/><ellipse cx="${n1(cx - nose * 0.3)}" cy="${n1(nY - nose * 0.3)}" rx="${n1(nose * 0.3)}" ry="${n1(nose * 0.2)}" fill="#fff" opacity=".45"/>${mouth}${stache}${freck}${front}${specs(l, cx, eY, er * 1.25, eGap, false)}${hat(l, head, false)}`;
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
  const face = `${back}${ears}<path d="${headPath}" fill="${l.skin}"/>${beard}<circle cx="${n1(cx - eGap - 4)}" cy="${n1(nY + 10)}" r="${grown ? 0 : 6}" fill="#f08a8a" opacity=".45"/><circle cx="${n1(cx + eGap + 4)}" cy="${n1(nY + 10)}" r="${grown ? 0 : 6}" fill="#f08a8a" opacity=".45"/><g class="bt-eyes">${dot(cx - eGap, -1)}${dot(cx + eGap, 1)}</g>${brow}${nose}${mouth}${stache}${freck}${front}${specs(l, cx, eY, er * 2.6, eGap, true)}${hat(l, head, true)}`;
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
  const face = `<g transform="rotate(${tilt} ${cx} ${n1(cy + ry)})">${back}<ellipse cx="${cx}" cy="${n1(cy)}" rx="${n1(rx)}" ry="${n1(ry)}" fill="${l.skin}"/>${beard}${cheeks}<g class="bt-eyes">${eye(cx - eGap, -1)}${eye(cx + eGap, 1)}</g>${nose}${mouth}${stache}${freck}${front}${specs(l, cx, eY, er * 2.4, eGap, false, '#1f1a17')}${hat(l, head, true)}</g>`;
  return { svg: assemble(l, body, face, arm, A, head, held), head };
}

/* ═════════════════════════ COMIC ═════════════════════════ */
function comic(l: Look, id: string): { svg: string; head: Head } {
  const k = l.kind as 'baby' | 'kid' | 'adult' | 'elder';
  const fw = 1 + 0.06 * sh(l, 'faceWidth'), fl = 1 + 0.05 * sh(l, 'faceLength');
  const P = { baby: { hw: 60, hh: 58, torso: [168, 222], tw: [40, 58], legW: 15, arm: 30 }, kid: { hw: 56, hh: 56, torso: [158, 220], tw: [36, 50], legW: 13, arm: 36 }, adult: { hw: 52, hh: 56, torso: [150, 218], tw: [40, 52], legW: 13, arm: 44 }, elder: { hw: 54, hh: 54, torso: [150, 218], tw: [46, 58], legW: 13, arm: 42 } }[k];
  const hw = P.hw * fw, hh = P.hh * fl, cx = 100, top = P.torso[0] - hh * 2 + 6, cy = top + hh;
  const head: Head = { cx, cy, rx: hw, ry: hh, top, chin: top + hh * 2 };
  const C = clothes(l), A = armsOf(l), ex = exprOf(l);
  // a big round skull with a soft, pointed chin
  const jaw = 0.55 + 0.1 * sh(l, 'jaw');
  const headPath = `M${n1(cx - hw)} ${n1(cy - hh * 0.05)} A${n1(hw)} ${n1(hh * 0.95)} 0 0 1 ${n1(cx + hw)} ${n1(cy - hh * 0.05)} C${n1(cx + hw)} ${n1(cy + hh * 0.55)} ${n1(cx + hw * jaw)} ${n1(top + hh * 1.92)} ${cx} ${n1(top + hh * 2)} C${n1(cx - hw * jaw)} ${n1(top + hh * 1.92)} ${n1(cx - hw)} ${n1(cy + hh * 0.55)} ${n1(cx - hw)} ${n1(cy - hh * 0.05)} Z`;
  // very large shining eyes, low on the face
  const eY = cy + hh * 0.18, eGap = hw * 0.4 + 2 * sh(l, 'eyeGap');
  const ew = hw * 0.25 * (1 + 0.08 * sh(l, 'eyeSize')), eh = ew * (k === 'adult' || k === 'elder' ? 1.15 : 1.35);
  const es = eyeOf(ex), col = l.eyes ?? '#5a3a22';
  const eye = (x: number, side: number) => {
    if (es === 'closed' || (es === 'wink' && side > 0)) return `<path d="M${n1(x - ew)} ${n1(eY)} Q${x} ${n1(eY - eh * 0.9)} ${n1(x + ew)} ${n1(eY)}" stroke="#1a110e" stroke-width="3.4" fill="none" stroke-linecap="round"/>`;
    if (es === 'sleepy') return `<path d="M${n1(x - ew)} ${n1(eY - 2)} H${n1(x + ew)}" stroke="#1a110e" stroke-width="3.4" stroke-linecap="round"/><path d="M${n1(x - ew * 0.8)} ${n1(eY - 2)} Q${x} ${n1(eY + eh * 0.5)} ${n1(x + ew * 0.8)} ${n1(eY - 2)} Z" fill="${col}"/>`;
    const s = es === 'wide' ? 1.1 : 1;
    return `<ellipse cx="${n1(x)}" cy="${n1(eY)}" rx="${n1(ew * s)}" ry="${n1(eh * s)}" fill="#fff"/><ellipse cx="${n1(x + side * -ew * 0.06)}" cy="${n1(eY + eh * 0.1)}" rx="${n1(ew * 0.8 * s)}" ry="${n1(eh * 0.86 * s)}" fill="${col}"/><ellipse cx="${n1(x + side * -ew * 0.06)}" cy="${n1(eY + eh * 0.22)}" rx="${n1(ew * 0.44)}" ry="${n1(eh * 0.5)}" fill="${shade(col, -0.55)}"/><ellipse cx="${n1(x - ew * 0.32)}" cy="${n1(eY - eh * 0.34)}" rx="${n1(ew * 0.34)}" ry="${n1(eh * 0.26)}" fill="#fff"/><circle cx="${n1(x + ew * 0.38)}" cy="${n1(eY + eh * 0.42)}" r="${n1(ew * 0.14)}" fill="#fff"/><path d="M${n1(x - ew * 1.1)} ${n1(eY - eh * 0.82)} Q${x} ${n1(eY - eh * 1.28)} ${n1(x + ew * 1.12)} ${n1(eY - eh * 0.7)}" stroke="#1a110e" stroke-width="${l.lashes ? 4.4 : 3.2}" fill="none" stroke-linecap="round"/>`;
  };
  const brows = [-1, 1].map((sd) => `<path d="M${n1(cx + sd * (eGap - ew * 0.8))} ${n1(eY - eh * 1.55 + (ex === 'worried' ? -3 : 0))} Q${n1(cx + sd * eGap)} ${n1(eY - eh * 1.75)} ${n1(cx + sd * (eGap + ew * 0.8))} ${n1(eY - eh * 1.5 + (ex === 'brave' ? -4 : 0))}" stroke="${shade(l.hair, -0.15)}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`).join('');
  const nY = eY + eh * 1.05;
  const nose = `<path d="M${n1(cx - 1)} ${n1(nY)} l3 3" stroke="${shade(l.skin, -0.35)}" stroke-width="2" stroke-linecap="round"/>`;
  const mY = nY + hh * 0.18, mW = hw * 0.14 * (1 + 0.1 * sh(l, 'mouth'));
  const mk = mouthOf(ex);
  const mouth = mk === 'open' || mk === 'grin' || mk === 'tongue' ? `<path d="M${n1(cx - mW * 1.4)} ${n1(mY)} Q${cx} ${n1(mY + mW * 2.2)} ${n1(cx + mW * 1.4)} ${n1(mY)} Z" fill="#7a2c2c"/><path d="M${n1(cx - mW * 0.8)} ${n1(mY + mW * 1.2)} Q${cx} ${n1(mY + mW * 0.6)} ${n1(cx + mW * 0.8)} ${n1(mY + mW * 1.2)} Q${cx} ${n1(mY + mW * 1.8)} ${n1(cx - mW * 0.8)} ${n1(mY + mW * 1.2)} Z" fill="#ef7f8a"/>`
    : mk === 'o' ? `<ellipse cx="${cx}" cy="${n1(mY + 3)}" rx="${n1(mW * 0.5)}" ry="${n1(mW * 0.7)}" fill="#7a2c2c"/>`
    : mk === 'wobbly' ? `<path d="M${n1(cx - mW)} ${n1(mY + 3)} q${n1(mW / 2)} -4 ${n1(mW)} 0 t${n1(mW)} 0" stroke="#7a2c2c" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
    : `<path d="M${n1(cx - mW)} ${n1(mY)} Q${cx} ${n1(mY + mW * 1.1)} ${n1(cx + mW)} ${n1(mY)}" stroke="#7a2c2c" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  const blush = [-1, 1].map((sd) => `<g opacity=".7">${[0, 1, 2].map((i) => `<path d="M${n1(cx + sd * (eGap + ew * 0.2) + i * 4 - 4)} ${n1(nY + 2)} l-3 5" stroke="#ef7f8a" stroke-width="2" stroke-linecap="round"/>`).join('')}</g>`).join('');
  const fh = facialOf(l);
  const beard = fh === 'full' || fh === 'trim' ? `<path d="M${n1(cx - hw * 0.8)} ${n1(cy + hh * 0.5)} Q${n1(cx - hw * 0.5)} ${n1(top + hh * 2.15)} ${cx} ${n1(top + hh * 2.15)} Q${n1(cx + hw * 0.5)} ${n1(top + hh * 2.15)} ${n1(cx + hw * 0.8)} ${n1(cy + hh * 0.5)} Q${cx} ${n1(mY + 12)} ${n1(cx - hw * 0.8)} ${n1(cy + hh * 0.5)} Z" fill="${l.hair}"/>` : '';
  const stache = fh === 'moustache' || fh === 'trim' || fh === 'full' ? `<path d="M${n1(cx - mW * 1.8)} ${n1(mY - 2)} Q${cx} ${n1(mY - 10)} ${n1(cx + mW * 1.8)} ${n1(mY - 2)} Q${cx} ${n1(mY - 4)} ${n1(cx - mW * 1.8)} ${n1(mY - 2)} Z" fill="${l.hair}"/>` : '';
  const freck = l.freckles ? [-1, 1].flatMap((sd) => [0, 1, 2].map((i) => `<circle cx="${n1(cx + sd * (eGap + i * 3 - 2))}" cy="${n1(nY + 8 + (i % 2) * 3)}" r="1.3" fill="${shade(l.skin, -0.3)}"/>`)).join('') : '';
  // chunky pointed locks
  const fam = FAM[l.hairStyle] ?? 'short', hc = l.hair;
  const lock = (x: number, y: number, len: number, ang: number, w: number) => `<path d="M${n1(x - w)} ${n1(y)} Q${n1(x + Math.sin(ang) * len * 0.5 - w * 0.4)} ${n1(y + Math.cos(ang) * len * 0.6)} ${n1(x + Math.sin(ang) * len)} ${n1(y + Math.cos(ang) * len)} Q${n1(x + Math.sin(ang) * len * 0.4 + w * 0.6)} ${n1(y + Math.cos(ang) * len * 0.5)} ${n1(x + w)} ${n1(y)} Z" fill="${hc}"/>`;
  const crown = `<path d="M${n1(cx - hw * 1.04)} ${n1(cy - hh * 0.12)} A${n1(hw * 1.04)} ${n1(hh * 1.02)} 0 0 1 ${n1(cx + hw * 1.04)} ${n1(cy - hh * 0.12)} C${n1(cx + hw * 0.8)} ${n1(top + hh * 0.42)} ${n1(cx - hw * 0.8)} ${n1(top + hh * 0.42)} ${n1(cx - hw * 1.03)} ${n1(cy - hh * 0.12)} Z" fill="${hc}"/>`;
  // fringe locks rooted on the crown's curve, so none pokes out past the skull
  const fringe = (n: number, len: number) => Array.from({ length: n }, (_, i) => {
    const x = cx - hw * 0.72 + (i * hw * 1.44) / (n - 1), u = (x - cx) / (hw * 1.04);
    const y = cy - hh * 0.12 - Math.sqrt(Math.max(0, 1 - u * u)) * hh * 1.02 + hh * 0.16;
    return lock(x, y, len * (0.8 + (i % 2) * 0.35), (i - (n - 1) / 2) * 0.1, hw * 0.15);
  }).join('');
  let back = '', front = '';
  switch (fam) {
    case 'none': break;
    case 'sides': front = [-1, 1].map((sd) => `<path d="M${n1(cx + sd * hw * 1.02)} ${n1(cy - hh * 0.35)} Q${n1(cx + sd * hw * 1.12)} ${n1(cy)} ${n1(cx + sd * hw * 0.98)} ${n1(cy + hh * 0.25)} Q${n1(cx + sd * hw * 0.88)} ${n1(cy - hh * 0.05)} ${n1(cx + sd * hw * 0.9)} ${n1(cy - hh * 0.3)} Z" fill="${hc}"/>`).join(''); break;
    case 'tuft': front = lock(cx, top + 4, -hh * 0.4, 0.4, 6); break;
    case 'buzz': front = `<path d="M${n1(cx - hw * 1.02)} ${n1(cy - hh * 0.1)} C${n1(cx - hw * 1.04)} ${n1(top - hh * 0.28)} ${n1(cx + hw * 1.04)} ${n1(top - hh * 0.28)} ${n1(cx + hw * 1.02)} ${n1(cy - hh * 0.1)} Q${cx} ${n1(top + hh * 0.05)} ${n1(cx - hw * 1.02)} ${n1(cy - hh * 0.1)} Z" fill="${hc}" opacity=".8"/>`; break;
    case 'short': case 'side': case 'messy': case 'bun': case 'pony': case 'pigtails':
      front = crown + fringe(fam === 'messy' ? 7 : 5, hh * (fam === 'side' ? 0.6 : 0.45)) + (fam === 'messy' ? [-0.5, 0, 0.5].map((t) => lock(cx + t * hw, top - hh * 0.1, -hh * 0.35, t, 8)).join('') : '');
      if (fam === 'bun') back = `<circle cx="${cx}" cy="${n1(top - hh * 0.32)}" r="${n1(hw * 0.32)}" fill="${hc}"/>`;
      if (fam === 'pony') back = lock(cx + hw * 0.7, top + hh * 0.2, hh * 1.4, -0.35, 14);
      if (fam === 'pigtails') back = [-1, 1].map((sd) => lock(cx + sd * hw * 1.05, cy - hh * 0.2, hh * 1.0, sd * -0.5, 13)).join('');
      break;
    case 'bob': case 'long': case 'curlyLong': {
      const len = fam === 'bob' ? hh * 1.0 : hh * 1.9;
      back = `<path d="M${n1(cx - hw * 1.1)} ${n1(cy)} A${n1(hw * 1.1)} ${n1(hh * 1.08)} 0 0 1 ${n1(cx + hw * 1.1)} ${n1(cy)} C${n1(cx + hw * 1.16)} ${n1(cy + len * 0.6)} ${n1(cx + hw * 0.9)} ${n1(cy + len)} ${n1(cx + hw * 0.62)} ${n1(cy + len)} L${n1(cx + hw * 0.5)} ${n1(cy + len * 0.7)} L${n1(cx + hw * 0.3)} ${n1(cy + len * 0.9)} L${n1(cx - hw * 0.3)} ${n1(cy + len * 0.9)} L${n1(cx - hw * 0.5)} ${n1(cy + len * 0.7)} L${n1(cx - hw * 0.62)} ${n1(cy + len)} C${n1(cx - hw * 0.9)} ${n1(cy + len)} ${n1(cx - hw * 1.16)} ${n1(cy + len * 0.6)} ${n1(cx - hw * 1.1)} ${n1(cy)} Z" fill="${hc}"/>`;
      front = crown + fringe(6, hh * (l.hairStyle === 'bangs' ? 0.62 : 0.42)) + [-1, 1].map((sd) => lock(cx + sd * hw * 0.92, cy - hh * 0.3, len * 0.75, sd * 0.05, 9)).join('');
      break;
    }
    case 'curlyShort': case 'afro': {
      const R = fam === 'afro' ? 1.32 : 1.08, n = fam === 'afro' ? 14 : 11;
      back = Array.from({ length: n }, (_, i) => { const a = Math.PI * (0.94 + (i / (n - 1)) * 1.12); return `<circle cx="${n1(cx + Math.cos(a) * hw * R)}" cy="${n1(cy - hh * 0.05 + Math.sin(a) * hh * R)}" r="${n1(hw * (fam === 'afro' ? 0.3 : 0.2))}" fill="${hc}"/>`; }).join('');
      front = Array.from({ length: 7 }, (_, i) => `<circle cx="${n1(cx - hw * 0.8 + i * hw * 0.27)}" cy="${n1(top + hh * 0.18 + (i % 2) * 6)}" r="${n1(hw * 0.17)}" fill="${hc}"/>`).join('');
      break;
    }
  }
  const [ty0, ty1] = P.torso, [tw0, tw1] = P.tw;
  const torso = `M${n1(cx - tw0 / 2)} ${ty0} Q${cx} ${ty0 - 4} ${n1(cx + tw0 / 2)} ${ty0} L${n1(cx + tw1 / 2)} ${ty1} Q${cx} ${ty1 + 4} ${n1(cx - tw1 / 2)} ${ty1} Z`;
  const footY = 250, hipY = ty1 - 4;
  const [lg, rg] = legsAt(cx, hipY, footY, tw1 * 0.22, A.legs);
  const legs = [lg, rg].map(([hx, hy, fx, fy]) => (C.longSkirt ? '' : limb(hx, hy, fx, fy, P.legW, P.legW * 0.85, C.legs))).join('');
  const shoes = [lg, rg].map(([, , fx, fy], i) => `<ellipse cx="${n1(fx + (i ? 3 : -3))}" cy="${n1(fy + 2)}" rx="${n1(P.legW * 0.85)}" ry="${n1(P.legW * 0.5)}" fill="${C.shoes}"/>`).join('');
  const sY = ty0 + 8, sX = tw0 / 2 + 1;
  const arm = (side: -1 | 1, pose: 'down' | 'up' | 'forward' | 'hold') => {
    const [hx, hy] = handAt(cx + side * sX, sY, P.arm, side, pose);
    return limb(cx + side * sX, sY, hx, hy, 11, 10, C.sleeve) + `<circle cx="${n1(hx)}" cy="${n1(hy)}" r="7" fill="${l.skin}"/>`;
  };
  const skirt = C.skirt ? `<path d="M${n1(cx - tw1 / 2)} ${ty1 - 20} H${n1(cx + tw1 / 2)} L${n1(cx + tw1 / 2 + (C.longSkirt ? 14 : 10))} ${C.longSkirt ? 248 : ty1 + 14} Q${cx} ${C.longSkirt ? 252 : ty1 + 20} ${n1(cx - tw1 / 2 - (C.longSkirt ? 14 : 10))} ${C.longSkirt ? 248 : ty1 + 14} Z" fill="${C.skirt}"/>` : '';
  const cape = C.cape ? `<path d="M${n1(cx - tw0 / 2)} ${ty0} H${n1(cx + tw0 / 2)} L${n1(cx + tw1 / 2 + 14)} ${ty1 + 18} Q${cx} ${ty1 + 26} ${n1(cx - tw1 / 2 - 14)} ${ty1 + 18} Z" fill="${C.cape}"/>` : '';
  const body = `${cape}${legs}${shoes}<path d="${torso}" fill="${C.top}"/>${stripes(l, id, `<path d="${torso}"/>`, ty0, ty1)}${l.outfit === 'overalls' ? `<path d="M${n1(cx - tw1 * 0.32)} ${n1(ty0 + 22)} H${n1(cx + tw1 * 0.32)} L${n1(cx + tw1 * 0.46)} ${ty1} H${n1(cx - tw1 * 0.46)} Z" fill="${C.legs}"/>` : ''}${skirt}`;
  const ears = [-1, 1].map((sd) => `<ellipse cx="${n1(cx + sd * hw * 0.98)}" cy="${n1(eY + 2)}" rx="7" ry="10" fill="${l.skin}"/>`).join('');
  const face = `${back}${ears}<path d="${headPath}" fill="${l.skin}"/>${beard}${blush}<g class="bt-eyes">${eye(cx - eGap, -1)}${eye(cx + eGap, 1)}</g>${brows}${nose}${mouth}${stache}${freck}${front}${specs(l, cx, eY, ew * 1.35, eGap, false)}${hat(l, head, false)}`;
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
  return `${shadow}<g class="bt-body" transform="translate(0 ${-A.lift})${lean}">${body}${left}<g class="bt-head">${face}</g>${right}${thing}</g>`;
}

const DRAW: Record<DesignMode, (l: Look, id: string) => { svg: string; head: Head }> = { pocketlight: clay, gouache: retro, wondercut: paper, inked: comic };

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
