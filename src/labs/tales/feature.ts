import { exprOf, outfitColours, shade, type Expression, type HairStyle, type Look } from './character';

/**
 * Tales: a hand-drawn feature-animation character.
 *
 * Built on the principles of classic 2D feature animation (not on any studio's
 * character): the head is turned three-quarters with a slight tilt, eyes are almond
 * shapes under a heavy upper lash line with a big iris and a bright glint, brows are
 * thick-to-thin arches that do the acting, the nose is a single line, lips have a
 * shape, the far cheek has an eye-socket dip, there's a cel shadow under the chin and
 * down the far side of the face, and hair is built from big tapered locks with one
 * shine. Grown-ups are tall with long necks; little ones are round with huge eyes.
 *
 * Draws in the same 200 × 260 box as character.ts, feet on y 252, facing right.
 */

export interface FHead { cx: number; cy: number; rx: number; ry: number; top: number; chin: number }
type Kind = 'baby' | 'kid' | 'adult' | 'elder';
type Pose = 'down' | 'up' | 'forward' | 'hold';

const n1 = (v: number) => +v.toFixed(1);
const P2 = (x: number, y: number) => `${n1(x)} ${n1(y)}`;
const sh = (l: Look, k: string) => Math.max(-1, Math.min(1, (l.shape as Record<string, number> | undefined)?.[k] ?? 0));
const INK = '#2b1d1a';
/** Fill-only shapes (shading, glints): the outline pass leaves anything with a fill-opacity alone. */
const flat = (d: string, fill: string, a = 1) => `<path d="${d}" fill="${fill}" fill-opacity="${a}"/>`;

type Fam = 'none' | 'buzz' | 'tuft' | 'short' | 'side' | 'messy' | 'bob' | 'long' | 'curlyShort' | 'curlyLong' | 'afro' | 'bun' | 'pony' | 'pigtails' | 'sides';
const FAM: Record<HairStyle, Fam> = {
  tuft: 'tuft', buzz: 'buzz', crew: 'buzz', short: 'short', slick: 'short', sidepart: 'side', sweep: 'side', quiff: 'side', messy: 'messy', shag: 'messy', pixie: 'messy',
  bob: 'bob', bangs: 'bob', curtain: 'bob', lob: 'bob', long: 'long', wavy: 'long', halfup: 'long', locs: 'long', longcurly: 'curlyLong', curly: 'curlyShort', coils: 'curlyShort',
  twists: 'curlyShort', cornrows: 'curlyShort', afro: 'afro', puff: 'afro', bun: 'bun', topknot: 'bun', ponytail: 'pony', pigtails: 'pigtails', spacebuns: 'pigtails', braids: 'pigtails',
  bald: 'none', sides: 'sides',
};

type EyeState = 'open' | 'closed' | 'wink' | 'sleepy' | 'wide';
const eyeOf = (e: Expression): EyeState => (e === 'laugh' || e === 'proud' ? 'closed' : e === 'wink' ? 'wink' : e === 'sleepy' || e === 'dreamy' ? 'sleepy' : e === 'wow' || e === 'starry' ? 'wide' : 'open');
type Mouth = 'smile' | 'grin' | 'open' | 'o' | 'flat' | 'wobbly' | 'tongue';
const mouthOf = (e: Expression): Mouth =>
  e === 'laugh' || e === 'starry' ? 'open' : e === 'grin' || e === 'proud' ? 'grin' : e === 'wow' || e === 'sleepy' ? 'o' : e === 'worried' ? 'wobbly' : e === 'silly' ? 'tongue' : e === 'shy' || e === 'dreamy' ? 'flat' : 'smile';

/** A tapered lock of hair (or any leaf shape) from a root of width `w` to a point. */
function lock(x0: number, y0: number, x1: number, y1: number, w: number, bend: number, fill: string): string {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
  const mx = (x0 + x1) / 2 + nx * bend, my = (y0 + y1) / 2 + ny * bend;
  return `<path d="M${P2(x0 + (nx * w) / 2, y0 + (ny * w) / 2)} Q${P2(mx + nx * w * 0.42, my + ny * w * 0.42)} ${P2(x1, y1)} Q${P2(mx - nx * w * 0.42, my - ny * w * 0.42)} ${P2(x0 - (nx * w) / 2, y0 - (ny * w) / 2)} Z" fill="${fill}"/>`;
}
/** A limb that tapers, with a gentle bend. */
function limb(x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, fill: string, bend = 0): string {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
  const mx = (x0 + x1) / 2 + nx * bend, my = (y0 + y1) / 2 + ny * bend, wm = (w0 + w1) / 4;
  const a = [x0 + (nx * w0) / 2, y0 + (ny * w0) / 2], b = [x0 - (nx * w0) / 2, y0 - (ny * w0) / 2];
  const c = [x1 - (nx * w1) / 2, y1 - (ny * w1) / 2], d = [x1 + (nx * w1) / 2, y1 + (ny * w1) / 2];
  return `<path d="M${P2(a[0], a[1])} Q${P2(mx + nx * wm, my + ny * wm)} ${P2(d[0], d[1])} A${n1(w1 / 2)} ${n1(w1 / 2)} 0 0 1 ${P2(c[0], c[1])} Q${P2(mx - nx * wm, my - ny * wm)} ${P2(b[0], b[1])} A${n1(w0 / 2)} ${n1(w0 / 2)} 0 0 1 ${P2(a[0], a[1])} Z" fill="${fill}"/>`;
}

/* ── proportions ─────────────────────────────────────────── */
const PROP: Record<Kind, { W: number; H: number; top: number; neck: number; torso: [number, number]; sw: number; ww: number; hw: number; arm: number; armW: number; legW: number }> = {
  // W, H: half width / half height of the head; torso: shoulders → hips
  baby: { W: 47, H: 46, top: 78, neck: 0, torso: [168, 228], sw: 27, ww: 33, hw: 33, arm: 34, armW: 13, legW: 14 },
  kid: { W: 31, H: 33, top: 80, neck: 4, torso: [150, 204], sw: 22, ww: 19, hw: 22, arm: 46, armW: 9, legW: 10 },
  adult: { W: 25, H: 29, top: 36, neck: 13, torso: [107, 172], sw: 27, ww: 17, hw: 22, arm: 66, armW: 8.5, legW: 10 },
  elder: { W: 26, H: 28, top: 46, neck: 10, torso: [113, 176], sw: 27, ww: 22, hw: 24, arm: 60, armW: 8.5, legW: 10 },
};

function armsOf(l: Look): { left: Pose; right: Pose; legs: 'stand' | 'walk' | 'run' | 'jump' | 'sit' | 'dance'; lift: number; lean: number } {
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

/** The whole character. `hat`, `held` and `specs` come from designs.ts so every look shares them. */
export function featureCharacter(
  l: Look,
  id: string,
  kit: {
    hat: (l: Look, h: FHead, flat: boolean) => string;
    held: (l: Look, x: number, y: number) => string;
    clothes: (l: Look) => { top: string; sleeve: string; legs: string; skirt: string; shoes: string; longSkirt: boolean; cape: string };
    stripes: (l: Look, id: string, clip: string, y0: number, y1: number) => string;
  },
): { svg: string; head: FHead } {
  const k = l.kind as Kind;
  const grown = k === 'adult' || k === 'elder';
  const soft = !!l.lashes; // softer jaw, fuller lips, a lash flick
  const P = PROP[k];
  const fw = 1 + 0.08 * sh(l, 'faceWidth'), fl = 1 + 0.07 * sh(l, 'faceLength');
  const W = P.W * fw, H = P.H * fl;
  const cx = 100, cy = P.top + H, chinY = cy + H;
  const T = k === 'baby' ? 0.18 : 0.28; // how far the face is turned (toward the right)
  const fc = cx + T * W; // the face's centre line
  const head: FHead = { cx: cx + W * 0.12, cy, rx: W, ry: H, top: P.top, chin: chinY };
  const C = kit.clothes(l), A = armsOf(l), ex = exprOf(l);
  const skin = l.skin, skinS = shade(skin, -0.16), skinD = shade(skin, -0.3);
  const jaw = sh(l, 'jaw');

  /* ── head shape: round skull at the back, cheek and chin at the front, the far side
     dipping in at the eye socket and out at the cheekbone ── */
  const round = k === 'baby' ? 1 : k === 'kid' ? 0.75 : soft ? 0.35 : 0.5 + 0.2 * jaw;
  const chinX = fc + W * 0.02;
  const headPath = `M${P2(cx + W * 0.1, cy - H)}
    C${P2(cx - W * 0.6, cy - H)} ${P2(cx - W, cy - H * 0.6)} ${P2(cx - W, cy - H * 0.04)}
    C${P2(cx - W, cy + H * 0.36)} ${P2(cx - W * 0.78, cy + H * (0.58 + 0.12 * round))} ${P2(cx - W * 0.46, cy + H * (0.8 + 0.06 * round))}
    C${P2(cx - W * 0.2, cy + H * 0.97)} ${P2(chinX - W * (0.22 + 0.2 * round), chinY)} ${P2(chinX, chinY)}
    C${P2(chinX + W * (0.2 + 0.25 * round), chinY)} ${P2(cx + W * (0.72 + 0.1 * round), cy + H * 0.74)} ${P2(cx + W * 0.86, cy + H * 0.32)}
    C${P2(cx + W * 0.93, cy + H * 0.14)} ${P2(cx + W * 0.92, cy - H * 0.02)} ${P2(cx + W * (grown ? 0.85 : 0.9), cy - H * 0.12)}
    C${P2(cx + W * 0.9, cy - H * 0.22)} ${P2(cx + W * 0.95, cy - H * 0.32)} ${P2(cx + W * 0.93, cy - H * 0.42)}
    C${P2(cx + W * 0.86, cy - H * 0.86)} ${P2(cx + W * 0.5, cy - H)} ${P2(cx + W * 0.1, cy - H)} Z`;

  /* ── eyes ── */
  const es = eyeOf(ex);
  const eyeY = cy + H * (k === 'baby' ? 0.2 : k === 'kid' ? 0.16 : 0.1);
  const ewN = W * (k === 'baby' ? 0.52 : k === 'kid' ? 0.48 : 0.42) * (1 + 0.1 * sh(l, 'eyeSize'));
  const gap = W * (k === 'baby' ? 0.4 : 0.39) + 1.5 * sh(l, 'eyeGap');
  const eN = { x: fc - gap, w: ewN, o: -1 as const }, eF = { x: fc + gap * 0.9, w: ewN * 0.82, o: 1 as const };
  const ehK = k === 'baby' ? 1.0 : k === 'kid' ? 0.92 : soft ? 0.8 : 0.72;
  const eyeCol = l.eyes ?? '#5a3a22';
  const eye = (e: { x: number; w: number; o: -1 | 1 }, far: boolean) => {
    const { x, w, o } = e;
    const h = w * ehK * (es === 'wide' ? 1.2 : 1);
    const xi = x - o * w * 0.5, yi = eyeY + h * 0.06, xo = x + o * w * 0.52, yo = eyeY - h * (grown ? 0.04 : 0.0);
    const up = [x - o * w * 0.06, eyeY - h * 0.8], lo = [x + o * w * 0.04, eyeY + h * 0.66];
    const lid = `M${P2(xi, yi)} Q${P2(up[0], up[1])} ${P2(xo, yo)}`;
    const shape = `${lid} Q${P2(lo[0], lo[1])} ${P2(xi, yi)} Z`;
    const lw = n1((grown ? 2.4 : 2.6) * (k === 'baby' ? 1.05 : 1));
    if (es === 'closed' || (es === 'wink' && far)) {
      // a happy closed eye: the lid line bowed up, a little lash flick
      return `<path d="M${P2(xi, eyeY)} Q${P2(x, eyeY - h * 0.55)} ${P2(xo, eyeY)}" stroke="${INK}" stroke-width="${lw}" fill="none" stroke-linecap="round"/><path d="M${P2(xo, eyeY)} l${n1(o * 3)} 1.5" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`;
    }
    const r = h * 0.56, ix = x + w * 0.08, iy = eyeY + h * 0.06;
    const clip = `fe${id}${far ? 'f' : 'n'}`;
    const sleepy = es === 'sleepy' ? flat(`M${P2(xi - 2, yi)} L${P2(xi - 2, eyeY - h)} L${P2(xo + 2, eyeY - h)} L${P2(xo + 2, yo)} Q${P2(x, eyeY + h * 0.05)} ${P2(xi - 2, yi)} Z`, skin) + `<path d="M${P2(xi, yi)} Q${P2(x, eyeY + h * 0.1)} ${P2(xo, yo)}" stroke="${INK}" stroke-width="${lw}" fill="none" stroke-linecap="round"/>` : '';
    const lash = soft
      ? `<path d="M${P2(xo - o * 1, yo)} q${n1(o * 4)} -1 ${n1(o * 6)} -4.5" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>${soft ? `<path d="M${P2(xo - o * w * 0.22, yo - h * 0.42)} l${n1(o * 2.6)} -3.4" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>` : ''}`
      : `<path d="M${P2(xo - o * 1, yo)} l${n1(o * 2.6)} -0.8" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`;
    const crease = grown ? `<path d="M${P2(x - o * w * 0.3, eyeY - h * 0.86)} Q${P2(x + o * w * 0.08, eyeY - h * 1.12)} ${P2(x + o * w * 0.48, eyeY - h * 0.5)}" stroke="${skinD}" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".55"/>` : '';
    return `<clipPath id="${clip}"><path d="${shape}"/></clipPath>
      <path d="${shape}" fill="#fbf8f3" fill-opacity="1"/>
      <g clip-path="url(#${clip})">
        ${flat(`M${P2(xi, yi)} Q${P2(up[0], up[1])} ${P2(xo, yo)} L${P2(xo, yo + 3)} Q${P2(up[0], up[1] + 6)} ${P2(xi, yi + 3)} Z`, skinS, 0.35)}
        <circle cx="${n1(ix)}" cy="${n1(iy)}" r="${n1(r)}" fill="${shade(eyeCol, -0.35)}" fill-opacity="1"/>
        <circle cx="${n1(ix)}" cy="${n1(iy)}" r="${n1(r * 0.84)}" fill="${eyeCol}"/>
        <ellipse cx="${n1(ix)}" cy="${n1(iy + r * 0.42)}" rx="${n1(r * 0.6)}" ry="${n1(r * 0.36)}" fill="${shade(eyeCol, 0.4)}" fill-opacity=".75"/>
        <circle cx="${n1(ix)}" cy="${n1(iy)}" r="${n1(r * 0.38)}" fill="#120d0b" fill-opacity="1"/>
        <circle cx="${n1(ix - r * 0.36)}" cy="${n1(iy - r * 0.42)}" r="${n1(r * 0.3)}" fill="#fff" fill-opacity="1"/>
        <circle cx="${n1(ix + r * 0.34)}" cy="${n1(iy + r * 0.3)}" r="${n1(r * 0.12)}" fill="#fff" fill-opacity="1"/>
      </g>
      <path d="${lid}" stroke="${INK}" stroke-width="${lw}" fill="none" stroke-linecap="round"/>
      <path d="M${P2(xo, yo)} Q${P2(lo[0], lo[1])} ${P2(xi, yi)}" stroke="${shade(skin, -0.45)}" stroke-width="1" fill="none" stroke-linecap="round" opacity=".55"/>
      ${lash}${crease}${sleepy}`;
  };

  /* ── brows: thick at the inside, thin and arched at the outside; they do the acting ── */
  const browCol = shade(l.hair, l.hair === '#c9c3bb' || l.hair === '#e8e2d6' ? -0.25 : -0.12);
  const brow = (e: { x: number; w: number; o: -1 | 1 }) => {
    const { x, w, o } = e;
    const lift = ex === 'worried' ? 3 : ex === 'wow' || ex === 'starry' ? 2 : ex === 'brave' ? -2 : 0;
    const by = eyeY - w * ehK * (k === 'baby' ? 1.25 : 1.3) - (ex === 'wow' ? 3 : 0);
    const xi = x - o * w * 0.5, xo = x + o * w * 0.7;
    const th = (k === 'baby' ? 1.8 : grown && !soft ? 3.6 : 3) * (1 + 0.25 * sh(l, 'browWeight'));
    const yi = by + 2 - lift * 1.4, yo = by + 3 + (ex === 'worried' ? 2 : 0);
    const pk = [x + o * w * 0.2, by - (grown ? 4 : 3) - (ex === 'worried' ? -1 : 0)];
    return `<path d="M${P2(xi, yi + th / 2)} Q${P2(pk[0], pk[1] + th * 0.6)} ${P2(xo, yo)} Q${P2(pk[0], pk[1] - th * 0.5)} ${P2(xi, yi - th / 2)} Z" fill="${browCol}"/>`;
  };

  /* ── nose: a single line ── */
  const nz = 1 + 0.2 * sh(l, 'nose');
  const nTop = eyeY + H * 0.04, nTip = eyeY + H * (k === 'baby' ? 0.28 : k === 'kid' ? 0.32 : 0.4) * nz;
  const nx = fc + W * 0.04;
  const nose = k === 'baby'
    ? `<path d="M${P2(nx + 2, nTip - 2)} q2 3 -2 4" stroke="${skinD}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`
    : `<path d="M${P2(nx + W * 0.02, nTop)} Q${P2(nx + W * 0.14 * nz, nTip - H * 0.08)} ${P2(nx + W * 0.13 * nz, nTip)} Q${P2(nx + W * 0.08, nTip + 3)} ${P2(nx - W * 0.03, nTip + 1)}" stroke="${skinD}" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>${flat(`M${P2(nx + W * 0.13 * nz, nTip - 1)} q-3 4 -9 3 q4 -1 9 -3 Z`, skinS, 0.6)}`;

  /* ── mouth ── */
  const mk = mouthOf(ex);
  const mx = fc + W * 0.03, my = eyeY + H * (k === 'baby' ? 0.47 : k === 'kid' ? 0.52 : 0.62);
  const mN = W * (k === 'baby' ? 0.26 : 0.3) * (1 + 0.12 * sh(l, 'mouth')), mF = mN * 0.66;
  const lip = shade(soft ? '#c4544f' : skin, soft ? 0 : -0.22);
  let mouth: string;
  if (mk === 'open' || mk === 'grin' || mk === 'tongue') {
    const dep = mk === 'grin' ? mN * 0.55 : mN * 0.95;
    const o = `M${P2(mx - mN, my - 1)} Q${P2(mx, my + 2)} ${P2(mx + mF, my - 2)} Q${P2(mx + mF * 0.4, my + dep)} ${P2(mx - mN * 0.2, my + dep * 0.96)} Q${P2(mx - mN * 0.8, my + dep * 0.7)} ${P2(mx - mN, my - 1)} Z`;
    mouth = `<clipPath id="fm${id}"><path d="${o}"/></clipPath><path d="${o}" fill="#5b1f23"/>
      <g clip-path="url(#fm${id})">${flat(`M${P2(mx - mN, my - 4)} H${n1(mx + mF + 2)} V${n1(my + dep * 0.28)} Q${P2(mx, my + dep * 0.4)} ${P2(mx - mN, my + dep * 0.28)} Z`, '#fbf8f3')}${mk !== 'grin' ? `<ellipse cx="${n1(mx - mN * 0.1)}" cy="${n1(my + dep)}" rx="${n1(mN * 0.55)}" ry="${n1(dep * 0.42)}" fill="#e2767c" fill-opacity="1"/>` : ''}</g>
      ${soft ? `<path d="M${P2(mx - mN * 0.7, my + dep * 0.98)} Q${P2(mx - mN * 0.1, my + dep * 1.2)} ${P2(mx + mF * 0.3, my + dep * 0.9)}" stroke="${lip}" stroke-width="2.4" fill="none" stroke-linecap="round"/>` : ''}
      <path d="M${P2(mx - mN - 1.5, my - 3)} q-1.5 2.5 0.5 4.5" stroke="${skinD}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
  } else if (mk === 'o') {
    mouth = `<ellipse cx="${n1(mx)}" cy="${n1(my + 2)}" rx="${n1(mN * 0.32)}" ry="${n1(mN * 0.4)}" fill="#5b1f23"/>`;
  } else {
    const curve = mk === 'flat' ? 1 : mk === 'wobbly' ? -2 : 4.5;
    mouth = `${soft ? flat(`M${P2(mx - mN * 0.85, my)} Q${P2(mx - mN * 0.3, my - 3.2)} ${P2(mx - mN * 0.05, my - 1.6)} Q${P2(mx + mF * 0.3, my - 3.2)} ${P2(mx + mF * 0.85, my - 0.5)} Q${P2(mx, my + curve * 0.5)} ${P2(mx - mN * 0.85, my)} Z`, lip, 0.95)
      + flat(`M${P2(mx - mN * 0.75, my + curve * 0.4)} Q${P2(mx - mN * 0.1, my + curve * 0.6 + 5)} ${P2(mx + mF * 0.75, my + curve * 0.2)} Q${P2(mx, my + curve * 0.6 + 0.5)} ${P2(mx - mN * 0.75, my + curve * 0.4)} Z`, shade(lip, 0.08), 0.95) : ''}
      <path d="M${P2(mx - mN, my - 1)} Q${P2(mx - mN * 0.1, my + curve)} ${P2(mx + mF, my - (mk === 'flat' ? 0 : 2.5))}" stroke="${shade(skin, -0.55)}" stroke-width="1.9" fill="none" stroke-linecap="round"/>
      ${mk === 'smile' ? `<path d="M${P2(mx - mN - 1, my - 3.5)} q-1.6 2.2 0.4 4.6" stroke="${skinD}" stroke-width="1.2" fill="none" stroke-linecap="round"/>` : ''}`;
  }

  /* ── cel shading on the face ── */
  const faceShade = `<clipPath id="fh${id}"><path d="${headPath}"/></clipPath><g clip-path="url(#fh${id})">
    ${flat(`M${P2(cx + W * 0.7, cy - H)} C${P2(cx + W * 0.8, cy - H * 0.3)} ${P2(cx + W * 0.7, cy + H * 0.3)} ${P2(cx + W * 0.5, cy + H * 1.1)} L${P2(cx + W * 1.2, cy + H * 1.1)} L${P2(cx + W * 1.2, cy - H)} Z`, skinS, 0.55)}
    ${flat(`M${P2(cx - W * 1.1, cy - H * 0.1)} C${P2(cx - W * 0.9, cy + H * 0.5)} ${P2(cx - W * 0.4, cy + H * 0.95)} ${P2(chinX, chinY + 2)} L${P2(cx - W * 1.1, chinY + 4)} Z`, skinS, 0.35)}
  </g>`;
  const cheeks = [eN, eF].map((e, i) => `<ellipse cx="${n1(e.x + (i ? 2 : -2))}" cy="${n1(eyeY + H * 0.36)}" rx="${n1(e.w * (k === 'baby' ? 0.55 : 0.45))}" ry="${n1(e.w * 0.24)}" fill="#ef8a8a" fill-opacity="${k === 'baby' ? 0.42 : 0.28}"/>`).join('');
  const freck = l.freckles ? [eN, eF].flatMap((e) => [0, 1, 2, 3].map((i) => `<circle cx="${n1(e.x - 4 + i * 2.8)}" cy="${n1(eyeY + H * 0.27 + (i % 2) * 2.2)}" r=".9" fill="${skinD}" fill-opacity=".8"/>`)).join('') : '';
  const ear = `<path d="M${P2(cx - W * 0.42, eyeY - H * 0.08)} C${P2(cx - W * 0.66, eyeY - H * 0.24)} ${P2(cx - W * 0.74, eyeY + H * 0.24)} ${P2(cx - W * 0.44, eyeY + H * 0.3)} Z" fill="${skin}"/><path d="M${P2(cx - W * 0.5, eyeY - H * 0.02)} q-5 7 0 13" stroke="${skinD}" stroke-width="1.2" fill="none" opacity=".7"/>`;

  /* ── facial hair ── */
  const fh = grown ? (l.facial ?? (l.beard ? 'trim' : 'none')) : 'none';
  const hc = l.hair, hS = shade(hc, -0.22), hL = shade(hc, 0.28);
  const beard = fh === 'full' || fh === 'trim'
    ? `<path d="M${P2(cx - W * 0.46, eyeY + H * 0.05)} C${P2(cx - W * 0.6, cy + H * 0.7)} ${P2(chinX - W * 0.4, chinY + H * (fh === 'full' ? 0.36 : 0.18))} ${P2(chinX + 2, chinY + H * (fh === 'full' ? 0.34 : 0.14))} C${P2(chinX + W * 0.4, chinY + H * 0.1)} ${P2(cx + W * 0.8, cy + H * 0.6)} ${P2(cx + W * 0.86, cy + H * 0.3)} C${P2(cx + W * 0.6, cy + H * 0.62)} ${P2(mx + mF + 4, my + 6)} ${P2(mx, my + 5)} C${P2(mx - mN - 4, my + 6)} ${P2(cx - W * 0.3, cy + H * 0.5)} ${P2(cx - W * 0.46, eyeY + H * 0.05)} Z" fill="${hc}"/>`
    : fh === 'stubble' ? flat(`M${P2(cx - W * 0.46, eyeY + H * 0.2)} C${P2(cx - W * 0.5, cy + H * 0.8)} ${P2(chinX - 8, chinY)} ${P2(chinX, chinY)} C${P2(chinX + 10, chinY)} ${P2(cx + W * 0.8, cy + H * 0.6)} ${P2(cx + W * 0.84, cy + H * 0.36)} L${P2(mx, my + 4)} Z`, shade(hc, 0.1), 0.25)
    : '';
  const stache = fh !== 'none' && fh !== 'stubble'
    ? `<path d="M${P2(mx - mN * 1.15, my + 1)} Q${P2(mx - mN * 0.8, my - 7)} ${P2(mx, my - 5.5)} Q${P2(mx + mF * 0.9, my - 7)} ${P2(mx + mF * 1.2, my)} Q${P2(mx + mF * 0.5, my - 2.6)} ${P2(mx, my - 2.2)} Q${P2(mx - mN * 0.6, my - 2.6)} ${P2(mx - mN * 1.15, my + 1)} Z" fill="${hc}"/>`
    : '';

  /* ── hair: big tapered masses, a parting, one shine ── */
  const fam = FAM[l.hairStyle] ?? 'short';
  const shine = (d: string, w = 2.6) => `<path d="${d}" stroke="${hL}" stroke-width="${w}" fill="none" stroke-linecap="round" opacity=".75"/>`;
  // the cap: over the skull, a parting on the near side, the front sweeping across to the far temple
  const capPath = (fringe: number) => `M${P2(cx - W * 0.86, eyeY + H * 0.02)}
    C${P2(cx - W * 1.12, cy - H * 0.5)} ${P2(cx - W * 0.7, cy - H * 1.2)} ${P2(cx + W * 0.08, cy - H * 1.14)}
    C${P2(cx + W * 0.8, cy - H * 1.1)} ${P2(cx + W * 1.08, cy - H * 0.7)} ${P2(cx + W * 0.98, cy - H * 0.3)}
    C${P2(cx + W * 0.8, cy - H * (0.5 - fringe))} ${P2(cx + W * 0.4, cy - H * (0.5 - fringe * 0.6))} ${P2(cx + W * 0.05, cy - H * 0.62)}
    C${P2(cx - W * 0.22, cy - H * 0.72)} ${P2(cx - W * 0.5, cy - H * 0.6)} ${P2(cx - W * 0.6, cy - H * 0.32)}
    C${P2(cx - W * 0.66, cy - H * 0.12)} ${P2(cx - W * 0.62, eyeY - H * 0.04)} ${P2(cx - W * 0.68, eyeY + H * 0.12)} Z`;
  const capShadow = (fringe: number) => flat(`M${P2(cx + W * 0.98, cy - H * 0.3)} C${P2(cx + W * 0.8, cy - H * (0.5 - fringe))} ${P2(cx + W * 0.4, cy - H * (0.5 - fringe * 0.6))} ${P2(cx + W * 0.05, cy - H * 0.62)} C${P2(cx + W * 0.4, cy - H * (0.42 - fringe * 0.6))} ${P2(cx + W * 0.8, cy - H * (0.4 - fringe))} ${P2(cx + W * 0.98, cy - H * 0.3)} Z`, skinS, 0.6);
  const browTop = eyeY - ewN * ehK * 1.5;
  const sweep = (n: number, len: number, fill = hc) => Array.from({ length: n }, (_, i) => lock(cx - W * (0.15 - i * 0.18), cy - H * (1.0 - i * 0.03), cx + W * (0.55 + i * 0.22), Math.min(browTop - 2, cy - H * (0.5 - len * 0.06 * (1 + i))), W * 0.34, -W * 0.14, fill)).join('');
  let back = '', front = '', over = '';
  switch (fam) {
    case 'none': break;
    case 'sides':
      back = `<path d="M${P2(cx - W * 0.4, cy - H * 0.55)} C${P2(cx - W * 1.12, cy - H * 0.5)} ${P2(cx - W * 1.1, cy + H * 0.3)} ${P2(cx - W * 0.7, cy + H * 0.5)} L${P2(cx - W * 0.45, cy + H * 0.1)} Z" fill="${hc}"/>`;
      front = `${lock(cx - W * 0.95, cy - H * 0.4, cx - W * 0.62, cy - H * 0.52, W * 0.2, -2, hc)}${lock(cx - W * 0.98, cy - H * 0.2, cx - W * 0.84, cy + H * 0.42, W * 0.26, -3, hc)}${lock(cx - W * 0.92, cy - H * 0.32, cx - W * 0.68, cy + H * 0.08, W * 0.2, 2, hc)}${lock(cx + W * 0.9, cy - H * 0.5, cx + W * 0.92, cy - H * 0.1, W * 0.12, 2, hc)}`;
      break;
    case 'tuft':
      front = `<path d="M${P2(cx + 2, cy - H + 2)} C${P2(cx - 4, cy - H - 12)} ${P2(cx + 12, cy - H - 16)} ${P2(cx + 13, cy - H - 7)} C${P2(cx + 13, cy - H - 1)} ${P2(cx + 5, cy - H - 2)} ${P2(cx + 6, cy - H - 7)}" stroke="${hc}" stroke-width="4" fill="none" stroke-linecap="round"/>${lock(cx - 8, cy - H + 2, cx - 14, cy - H - 7, 5, -2, hc)}`;
      break;
    case 'buzz':
      front = `<path d="${capPath(0)}" fill="${hc}" fill-opacity=".85"/>`;
      break;
    case 'short': case 'side': case 'messy': {
      front = `<path d="${capPath(0.04)}" fill="${hc}"/>${sweep(fam === 'side' ? 2 : 1, fam === 'side' ? 1 : 0.6)}`;
      if (fam === 'messy') front += [-0.5, -0.1, 0.3].map((t, i) => lock(cx + t * W, cy - H * 1.02, cx + t * W + 6 + i * 3, cy - H * 1.3, W * 0.3, 3, hc)).join('');
      front += shine(`M${P2(cx - W * 0.55, cy - H * 0.7)} Q${P2(cx - W * 0.2, cy - H * 1.02)} ${P2(cx + W * 0.25, cy - H * 0.98)}`);
      over = capShadow(0.04);
      break;
    }
    case 'bob': case 'long': case 'curlyLong': {
      const len = fam === 'bob' ? chinY + H * 0.12 : P.torso[0] + (grown ? 48 : 30);
      // the mass behind: falls from the crown, past the neck and shoulders, ending in points
      back = `<path d="M${P2(cx - W * 0.5, cy - H * 0.9)} C${P2(cx - W * 1.35, cy - H * 0.7)} ${P2(cx - W * 1.3, cy + H * 0.4)} ${P2(cx - W * 1.25, len - 20)}
        Q${P2(cx - W * 1.2, len)} ${P2(cx - W * 0.85, len + 6)} L${P2(cx - W * 0.7, len - 8)} L${P2(cx - W * 0.45, len + 4)} L${P2(cx - W * 0.25, len - 12)}
        C${P2(cx - W * 0.2, cy + H * 0.6)} ${P2(cx + W * 0.2, cy)} ${P2(cx + W * 0.5, cy - H * 0.6)} Z" fill="${hc}"/>`
        + flat(`M${P2(cx - W * 0.9, cy)} C${P2(cx - W * 1.0, cy + H * 0.8)} ${P2(cx - W * 0.9, len - 30)} ${P2(cx - W * 0.6, len - 6)} L${P2(cx - W * 0.25, len - 12)} C${P2(cx - W * 0.25, cy + H * 0.6)} ${P2(cx - W * 0.4, cy + H * 0.2)} ${P2(cx - W * 0.9, cy)} Z`, hS, 0.7);
      // the front: a parting, a big sweep across the forehead, a lock falling past the far cheek
      front = `<path d="${capPath(l.hairStyle === 'bangs' ? 0.32 : 0.1)}" fill="${hc}"/>${sweep(1, l.hairStyle === 'bangs' ? 1.4 : 0.8)}`
        + lock(cx + W * 0.94, cy - H * 0.42, cx + W * 1.02, fam === 'bob' ? chinY - 2 : cy + H * 1.2, W * 0.18, W * 0.1, hc)
        + (fam === 'curlyLong' ? [0, 1, 2].map((i) => `<path d="M${P2(cx - W * (1.15 - i * 0.25), len - 14 + (i % 2) * 6)} c-5 2 -5 9 1 9 c5 0 4 -6 0 -5" stroke="${hS}" stroke-width="1.6" fill="none"/>`).join('') : '')
        + shine(`M${P2(cx - W * 0.6, cy - H * 0.68)} Q${P2(cx - W * 0.25, cy - H * 1.02)} ${P2(cx + W * 0.25, cy - H * 0.98)}`, 3);
      over = capShadow(l.hairStyle === 'bangs' ? 0.32 : 0.1);
      break;
    }
    case 'curlyShort': case 'afro': {
      const R = fam === 'afro' ? 1.38 : 1.12, n = fam === 'afro' ? 12 : 9, lr = W * (fam === 'afro' ? 0.36 : 0.27);
      const lobes = Array.from({ length: n }, (_, i) => { const a = Math.PI * (0.78 + (i / (n - 1)) * 1.42); return `<circle cx="${n1(cx - W * 0.05 + Math.cos(a) * W * R * 0.86)}" cy="${n1(cy - H * 0.2 + Math.sin(a) * H * R * 0.86)}" r="${n1(lr)}" fill="${hc}"/>`; }).join('');
      back = `<ellipse cx="${n1(cx - W * 0.05)}" cy="${n1(cy - H * 0.22)}" rx="${n1(W * R)}" ry="${n1(H * R * 0.96)}" fill="${hc}"/>${lobes}`;
      front = Array.from({ length: 6 }, (_, i) => { const t = i / 5; return `<circle cx="${n1(cx - W * 0.62 + t * W * 1.5)}" cy="${n1(cy - H * (0.62 + 0.18 * Math.sin(t * Math.PI)) + (t > 0.8 ? H * 0.12 : 0))}" r="${n1(W * 0.2)}" fill="${hc}"/>`; }).join('')
        + `<circle cx="${n1(cx - W * 0.78)}" cy="${n1(cy - H * 0.3)}" r="${n1(W * 0.2)}" fill="${hc}"/>`
        + Array.from({ length: 6 }, (_, i) => { const a = Math.PI * (1.05 + (i / 5) * 0.9); const x = cx - W * 0.05 + Math.cos(a) * W * R * 0.7, y = cy - H * 0.2 + Math.sin(a) * H * R * 0.72; return `<path d="M${P2(x, y)} q4 -4 8 0" stroke="${hL}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".6"/>`; }).join('');
      over = capShadow(0);
      break;
    }
    case 'bun': case 'pony': case 'pigtails': {
      front = `<path d="${capPath(0)}" fill="${hc}"/>${lock(cx - W * 0.05, cy - H * 0.98, cx + W * 0.8, cy - H * 0.42, W * 0.3, -W * 0.1, hc)}`
        + shine(`M${P2(cx - W * 0.55, cy - H * 0.7)} Q${P2(cx - W * 0.2, cy - H * 1.02)} ${P2(cx + W * 0.25, cy - H * 0.98)}`);
      if (fam === 'bun') back = `<circle cx="${n1(cx - W * 0.55)}" cy="${n1(cy - H * 0.95)}" r="${n1(W * 0.42)}" fill="${hc}"/>${shine(`M${P2(cx - W * 0.82, cy - H * 1.05)} q6 -8 14 -4`, 2)}`;
      if (fam === 'pony') back = `${lock(cx - W * 0.8, cy - H * 0.5, cx - W * 1.45, chinY + H * 0.9, W * 0.55, -W * 0.35, hc)}<circle cx="${n1(cx - W * 0.84)}" cy="${n1(cy - H * 0.5)}" r="${n1(W * 0.12)}" fill="${l.accent ?? '#e06a6a'}"/>`;
      if (fam === 'pigtails') back = `${lock(cx - W * 0.85, cy - H * 0.3, cx - W * 1.45, chinY + H * 0.6, W * 0.42, -W * 0.25, hc)}${lock(cx + W * 0.7, cy - H * 0.6, cx + W * 1.35, chinY + H * 0.5, W * 0.36, W * 0.25, hc)}`;
      over = capShadow(0);
      break;
    }
  }

  /* ── glasses, turned with the head ── */
  const glasses = !l.glasses || l.glasses === 'none' ? '' : (() => {
    const sun = l.glasses === 'sun', sq = l.glasses === 'square';
    const col = sun ? '#1d1a1a' : INK;
    const rN = eN.w * 0.72, rF = eF.w * 0.72, ry = ewN * 0.62;
    const lens = (x: number, rx: number) => (sq
      ? `<rect x="${n1(x - rx)}" y="${n1(eyeY - ry)}" width="${n1(rx * 2)}" height="${n1(ry * 2)}" rx="${n1(ry * 0.35)}" fill="${sun ? '#2a2f3a' : '#ffffff'}" fill-opacity="${sun ? 0.88 : 0.1}" stroke="${col}" stroke-width="2.2"/>`
      : `<ellipse cx="${n1(x)}" cy="${n1(eyeY)}" rx="${n1(rx)}" ry="${n1(ry)}" fill="${sun ? '#2a2f3a' : '#ffffff'}" fill-opacity="${sun ? 0.88 : 0.1}" stroke="${col}" stroke-width="2.2"/>`);
    return `${lens(eN.x, rN)}${lens(eF.x, rF)}<path d="M${P2(eN.x + rN, eyeY - 1)} Q${P2(fc, eyeY - 4)} ${P2(eF.x - rF, eyeY - 1)}" stroke="${col}" stroke-width="2" fill="none"/><path d="M${P2(eN.x - rN, eyeY - 1)} L${P2(cx - W * 0.5, eyeY - 2)}" stroke="${col}" stroke-width="2" fill="none"/>`;
  })();

  /* ── body: long neck, sloped shoulders, a waist, tapered limbs, hands with a thumb ── */
  const [ty0, ty1] = P.torso;
  const bx = 100 + (k === 'baby' ? 0 : 1);
  const sw = P.sw * (soft && grown ? 0.9 : 1), ww = P.ww * (soft && grown ? 0.86 : 1), hwid = P.hw;
  const waistY = ty0 + (ty1 - ty0) * (k === 'baby' ? 0.5 : 0.62);
  const neckW = k === 'baby' ? 0 : W * (grown ? 0.3 : 0.34);
  const neck = neckW ? `<path d="M${P2(fc - neckW - 1, chinY - H * 0.25)} C${P2(fc - neckW, chinY + 6)} ${P2(fc - neckW - 1, ty0 - 4)} ${P2(fc - neckW - 6, ty0 + 2)} L${P2(fc + neckW + 6, ty0 + 2)} C${P2(fc + neckW + 1, ty0 - 4)} ${P2(fc + neckW, chinY + 2)} ${P2(fc + neckW, chinY - H * 0.3)} Z" fill="${skin}"/>${flat(`M${P2(fc - neckW - 2, chinY - 4)} Q${P2(fc, chinY + H * 0.32)} ${P2(fc + neckW + 2, chinY - 6)} L${P2(fc + neckW + 2, chinY + 8)} Q${P2(fc, chinY + H * 0.4)} ${P2(fc - neckW - 2, chinY + 6)} Z`, skinS, 0.85)}` : '';
  const torso = k === 'baby'
    ? `M${P2(bx, ty0 - 2)} C${P2(bx + ww + 8, ty0)} ${P2(bx + hwid + 6, ty1 - 6)} ${P2(bx + hwid * 0.6, ty1 + 2)} Q${P2(bx, ty1 + 6)} ${P2(bx - hwid * 0.6, ty1 + 2)} C${P2(bx - hwid - 6, ty1 - 6)} ${P2(bx - ww - 8, ty0)} ${P2(bx, ty0 - 2)} Z`
    : `M${P2(bx - sw, ty0 + 7)} Q${P2(bx - sw + 1, ty0)} ${P2(bx - sw + 9, ty0 - 1)} L${P2(bx + sw - 9, ty0 - 1)} Q${P2(bx + sw - 1, ty0)} ${P2(bx + sw, ty0 + 7)}
       C${P2(bx + sw - 2, ty0 + 24)} ${P2(bx + ww + 1, waistY - 12)} ${P2(bx + ww, waistY)} C${P2(bx + ww + 2, waistY + 10)} ${P2(bx + hwid, ty1 - 8)} ${P2(bx + hwid, ty1)}
       L${P2(bx - hwid, ty1)} C${P2(bx - hwid, ty1 - 8)} ${P2(bx - ww - 2, waistY + 10)} ${P2(bx - ww, waistY)} C${P2(bx - ww - 1, waistY - 12)} ${P2(bx - sw + 2, ty0 + 24)} ${P2(bx - sw, ty0 + 7)} Z`;
  const bodyShade = `<clipPath id="fb${id}"><path d="${torso}"/></clipPath><g clip-path="url(#fb${id})">${flat(`M${P2(bx + sw * 0.4, ty0 - 4)} C${P2(bx + sw * 0.7, waistY)} ${P2(bx + hwid * 0.5, ty1)} ${P2(bx + hwid * 0.4, ty1 + 10)} L${P2(bx + sw + 20, ty1 + 10)} L${P2(bx + sw + 20, ty0 - 4)} Z`, '#2a1a20', 0.14)}${flat(`M${P2(fc - neckW - 8, ty0 - 2)} Q${P2(fc, ty0 + 9)} ${P2(fc + neckW + 8, ty0 - 2)} Z`, '#2a1a20', 0.16)}</g>`;
  const top = C.top;
  const neckline = k === 'baby' ? '' : `<path d="M${P2(fc - neckW - 4, ty0)} Q${P2(fc, ty0 + (grown ? 14 : 9))} ${P2(fc + neckW + 4, ty0)} Z" fill="${skin}"/>`;
  const folds = k === 'baby' ? '' : `<path d="M${P2(bx - ww + 3, waistY - 4)} q5 3 9 1" stroke="${shade(top, -0.3)}" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".8"/><path d="M${P2(bx + ww - 3, waistY + 3)} q-4 3 -9 2" stroke="${shade(top, -0.3)}" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".8"/>`;
  const overalls = l.outfit === 'overalls' ? `<path d="M${P2(bx - ww * 0.75, waistY - 16)} H${n1(bx + ww * 0.75)} L${P2(bx + hwid * 0.95, ty1)} H${n1(bx - hwid * 0.95)} Z" fill="${C.legs}"/>${[-1, 1].map((sd) => `<path d="M${P2(bx + sd * ww * 0.6, waistY - 14)} L${P2(bx + sd * sw * 0.55, ty0)}" stroke="${C.legs}" stroke-width="4"/><circle cx="${n1(bx + sd * ww * 0.55)}" cy="${n1(waistY - 12)}" r="2.2" fill="#e7b43c"/>`).join('')}` : '';
  const placket = grown && (l.outfit === 'cardigan' || l.outfit === 'denim' || l.outfit === 'suit' || l.outfit === 'coat') ? `<path d="M${P2(fc + 3, ty0 + 10)} L${P2(bx + 3, ty1)}" stroke="${shade(top, -0.32)}" stroke-width="1.5"/>${[0, 1, 2].map((i) => `<circle cx="${n1(fc + 6 - i * 0.6)}" cy="${n1(ty0 + 20 + i * 15)}" r="1.6" fill="${shade(top, -0.4)}"/>`).join('')}` : '';
  const skirt = C.skirt ? `<path d="M${P2(bx - ww - 1, waistY + 2)} H${n1(bx + ww + 1)} C${P2(bx + hwid + 8, ty1)} ${P2(bx + hwid + (C.longSkirt ? 18 : 14), C.longSkirt ? 238 : ty1 + 14)} ${P2(bx + hwid + (C.longSkirt ? 20 : 15), C.longSkirt ? 246 : ty1 + 20)} Q${P2(bx, C.longSkirt ? 252 : ty1 + 27)} ${P2(bx - hwid - (C.longSkirt ? 20 : 15), C.longSkirt ? 246 : ty1 + 20)} C${P2(bx - hwid - (C.longSkirt ? 18 : 14), C.longSkirt ? 238 : ty1 + 14)} ${P2(bx - hwid - 8, ty1)} ${P2(bx - ww - 1, waistY + 2)} Z" fill="${C.skirt}"/><path d="M${P2(bx + 4, waistY + 8)} q2 ${n1((C.longSkirt ? 246 : ty1 + 20) - waistY - 20)} 6 ${n1((C.longSkirt ? 246 : ty1 + 20) - waistY - 12)}" stroke="${shade(C.skirt, -0.25)}" stroke-width="1.2" fill="none" opacity=".7"/>` : '';
  const cape = C.cape ? `<path d="M${P2(bx - sw, ty0 + 2)} H${n1(bx + sw)} C${P2(bx + sw + 16, waistY)} ${P2(bx + hwid + 22, ty1 + 20)} ${P2(bx + hwid + 18, ty1 + 32)} Q${P2(bx, ty1 + 40)} ${P2(bx - hwid - 18, ty1 + 32)} C${P2(bx - hwid - 22, ty1 + 20)} ${P2(bx - sw - 16, waistY)} ${P2(bx - sw, ty0 + 2)} Z" fill="${C.cape}"/>` : '';
  const footY = 247, hipY = ty1 - 4;
  const L = footY - hipY;
  const legsAt = (): [number, number, number, number][] => {
    const g = hwid * 0.42;
    switch (A.legs) {
      case 'walk': return [[bx - g, hipY, bx - g - L * 0.26, footY], [bx + g, hipY, bx + g + L * 0.22, footY]];
      case 'run': return [[bx - g, hipY, bx - g - L * 0.5, footY - L * 0.3], [bx + g, hipY, bx + g + L * 0.45, footY - L * 0.12]];
      case 'jump': return [[bx - g, hipY, bx - g - L * 0.3, footY - L * 0.2], [bx + g, hipY, bx + g + L * 0.3, footY - L * 0.2]];
      case 'sit': return [[bx - g, hipY, bx - g - L * 0.75, hipY + L * 0.3], [bx + g, hipY, bx + g + L * 0.75, hipY + L * 0.3]];
      case 'dance': return [[bx - g, hipY, bx - g - L * 0.1, footY], [bx + g, hipY, bx + g + L * 0.7, hipY + L * 0.55]];
      default: return [[bx - g, hipY, bx - g - 1, footY], [bx + g, hipY, bx + g + 3, footY]];
    }
  };
  const lgs = legsAt();
  const legs = C.longSkirt ? '' : lgs.map(([x0, y0, x1, y1], i) => limb(x0, y0, x1, y1, P.legW * 1.15, P.legW * 0.7, C.legs, i ? 1.5 : -1.5)).join('');
  const shoes = lgs.map(([, , x1, y1]) => `<path d="M${P2(x1 - P.legW * 0.55, y1 - 3)} Q${P2(x1 - P.legW * 0.6, y1 + 5)} ${P2(x1 + 1, y1 + 5)} L${P2(x1 + P.legW * 1.15, y1 + 5)} Q${P2(x1 + P.legW * 1.25, y1 + 1)} ${P2(x1 + P.legW * 0.4, y1 - 3)} Z" fill="${C.shoes}"/>`).join('');
  const sY = ty0 + 7;
  const handAt = (sx: number, sy: number, len: number, side: -1 | 1, pose: Pose): [number, number] => {
    switch (pose) {
      case 'up': return [sx + side * len * 0.42, sy - len * 0.9];
      case 'forward': return [sx + side * len * 0.95, sy - len * 0.12];
      case 'hold': return [sx + side * len * 0.48, sy + len * 0.72];
      default: return [sx + side * len * 0.2, sy + len * 0.95];
    }
  };
  const hand = (x: number, y: number, side: -1 | 1, up: boolean) => {
    const r = k === 'baby' ? 6.4 : P.armW * 0.68;
    return `<ellipse cx="${n1(x + side * r * 0.5)}" cy="${n1(y + (up ? 0 : -r * 0.2))}" rx="${n1(r * 0.36)}" ry="${n1(r * 0.6)}" fill="${skin}" transform="rotate(${side * -25} ${n1(x)} ${n1(y)})"/><ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(r * 0.82)}" ry="${n1(r)}" fill="${skin}"/>`;
  };
  const arm = (side: -1 | 1, pose: Pose) => {
    const sx = bx + side * (sw - 3);
    const [hx, hy] = handAt(sx, sY, P.arm, side, pose);
    // the elbow bends outward a touch
    return limb(sx, sY, hx, hy, P.armW * 1.2, P.armW * 0.78, C.sleeve, side * (pose === 'up' ? -4 : 4)) + hand(hx, hy, side, pose === 'up');
  };
  const left = arm(-1, A.left), right = arm(1, A.right);
  const m = /<ellipse cx="([\d.-]+)" cy="([\d.-]+)"[^>]*\/>$/.exec(right);
  const thing = l.hold && m ? kit.held(l, +m[1] + 4, +m[2]) : '';

  const body = `${cape}${legs}${shoes}<path d="${torso}" fill="${top}"/>${kit.stripes(l, id, `<path d="${torso}"/>`, ty0, ty1)}${overalls}${neckline}${placket}${folds}${skirt}${bodyShade}`;
  const face = `${back}${neck}${ear}<path d="${headPath}" fill="${skin}"/>${faceShade}${cheeks}${freck}${beard}${over}
    <g class="bt-eyes">${eye(eN, false)}${eye(eF, true)}</g>${es === 'closed' ? '' : brow(eN) + brow(eF)}${nose}${mouth}${stache}${front}${glasses}${kit.hat(l, head, false)}`;
  // a little life in the pose: the head tilts toward the light
  const tilt = k === 'baby' ? -3 : -4;
  const shadow = `<ellipse cx="100" cy="253" rx="${grown ? 34 : 38}" ry="5" fill="#000" opacity=".1"/>`;
  const lean = A.lean ? ` rotate(${A.lean} 100 252)` : '';
  const svg = `${shadow}<g class="bt-body" transform="translate(0 ${-A.lift})${lean}">${body}${left}<g class="bt-head" transform="rotate(${tilt} ${n1(fc)} ${n1(chinY)})">${face}</g>${right}${thing}</g>`;
  return { svg, head };
}
