import { HAIR_COLOURS, SKIN_TONES, type HairStyle, type Kind } from './character';

/**
 * Photo → character, entirely on this device.
 *
 * The photo is drawn into a small in-memory canvas and read for: skin tone,
 * hair colour, whether the hair is long (falls past the chin), curly (busy
 * texture) or big (wider than the face). Those become the character's look.
 * The canvas is thrown away; nothing is uploaded or saved.
 *
 * (A real Genmoji can't be made from a photo by a website. Apple only offers
 * that inside its own keyboard, so the demo shows how to use that too.)
 */

export interface PhotoTraits {
  skin: string;
  /** Missing when the photo shows too little hair to read a colour. */
  hair?: string;
  hairStyle: HairStyle;
  /** What was read from the photo, in plain words, for the "we matched" chips. */
  matched: string[];
}

type RGB = [number, number, number];
const hex = (c: number[]) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
const rgb = (h: string): RGB => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const nearest = (c: number[], palette: string[]) => palette.reduce((best, h) => (dist(rgb(h), c) < dist(rgb(best), c) ? h : best), palette[0]);
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] ?? 0; };
const medianRGB = (ps: number[][]): RGB => [0, 1, 2].map((k) => median(ps.map((p) => p[k]))) as RGB;
const lum = (c: number[]) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];

function hairName(c: number[]) {
  const l = lum(c);
  const warm = c[0] - c[2];
  if (l > 205) return 'white hair';
  if (l > 160 && warm < 30) return 'grey hair';
  if (warm > 70 && c[0] > 140) return 'red hair';
  if (l > 150) return 'blond hair';
  if (l > 95) return 'light brown hair';
  if (l > 55) return 'brown hair';
  return 'dark hair';
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('That photo didn’t load. Try another one.'));
    img.src = src;
  });
}

export async function traitsFromPhoto(src: string, kind: Kind): Promise<PhotoTraits> {
  const img = await loadImage(src);
  const N = 160;
  const canvas = document.createElement('canvas');
  canvas.width = N; canvas.height = N;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const s = Math.min(img.naturalWidth, img.naturalHeight);
  ctx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, N, N);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, N, N).data;
  } catch {
    throw new Error('This browser won’t let the page read that sample photo. Try “Your photo” instead.');
  } finally {
    canvas.width = 0; canvas.height = 0;
  }
  const px = (x: number, y: number): RGB => { const i = (y * N + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };

  // background: what the edges of the photo look like
  const edge: number[][] = [];
  for (let i = 0; i < N; i += 4) edge.push(px(i, 0), px(i, N - 1), px(0, i), px(N - 1, i));
  const bg = medianRGB(edge);

  // 1. skin (YCbCr test, then a looser one for warm or dim photos)
  const findSkin = (loose: boolean) => {
    const mask = new Uint8Array(N * N);
    let count = 0;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const [r, g, b] = px(x, y);
      const Y = 0.299 * r + 0.587 * g + 0.114 * b;
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
      const ok = loose
        ? Y > 30 && Y < 250 && cr > 128 && cr < 185 && cb > 72 && cb < 140 && r >= g
        : Y > 45 && Y < 245 && cr > 135 && cr < 180 && cb > 80 && cb < 135 && r > g && r > b;
      if (ok && dist([r, g, b], bg) > 22) { mask[y * N + x] = 1; count++; }
    }
    return { mask, count };
  };
  let { mask, count } = findSkin(false);
  if (count < N * N * 0.03) ({ mask, count } = findSkin(true));
  if (count < N * N * 0.025) throw new Error('Couldn’t find a face in that photo. Try one where the face is big and well lit.');

  // the face: rows and columns with plenty of skin, around the centre of the photo
  const rowSkin = new Array(N).fill(0);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) rowSkin[y] += mask[y * N + x];
  let top = N, bottom = 0;
  for (let y = 0; y < N; y++) if (rowSkin[y] > N * 0.1) { top = Math.min(top, y); bottom = Math.max(bottom, y); }
  bottom = Math.min(bottom, top + Math.round(N * 0.55));
  let left = N, right = 0;
  for (let y = top; y <= Math.min(bottom, top + Math.round((bottom - top) * 0.6)); y++) for (let x = 0; x < N; x++) if (mask[y * N + x]) { left = Math.min(left, x); right = Math.max(right, x); }
  const faceW = Math.max(10, right - left);
  const skinPx: number[][] = [];
  for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) if (mask[y * N + x]) skinPx.push(px(x, y));
  const skin = medianRGB(skinPx);

  // 2. hair: non-skin, non-background pixels above and beside the top of the face
  const isHairish = (c: number[], x: number, y: number) => !mask[y * N + x] && dist(c, bg) > 40 && lum(c) < 215;
  const hairPx: number[][] = [];
  let band = 0;
  const y0 = Math.max(0, top - Math.round(N * 0.2)), y1 = Math.min(N - 1, top + Math.round((bottom - top) * 0.3));
  const x0 = Math.max(0, left - Math.round(faceW * 0.3)), x1 = Math.min(N - 1, right + Math.round(faceW * 0.3));
  let texture = 0, texN = 0, wideHair = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x <= x1; x++) {
    band++;
    const c = px(x, y);
    if (!isHairish(c, x, y)) continue;
    hairPx.push(c);
    if (x < left - faceW * 0.12 || x > right + faceW * 0.12) wideHair++;
    if (x + 1 < N) { texture += Math.abs(lum(c) - lum(px(x + 1, y))); texN++; }
  }
  const coverage = band ? hairPx.length / band : 0;
  const hairC = hairPx.length > 30 ? medianRGB(hairPx) : rgb(HAIR_COLOURS[3]);
  // long: hair-coloured pixels beside the face, below the chin line
  let longHits = 0, longN = 0;
  for (let y = bottom; y < Math.min(N, bottom + Math.round(N * 0.18)); y++) {
    for (const x of [left - Math.round(faceW * 0.15), left - Math.round(faceW * 0.05), right + Math.round(faceW * 0.05), right + Math.round(faceW * 0.15)]) {
      if (x < 0 || x >= N) continue;
      longN++;
      if (dist(px(x, y), hairC) < 48 && !mask[y * N + x]) longHits++;
    }
  }
  const long = longN > 0 && longHits / longN > 0.4;
  const curly = texN > 0 && texture / texN > 16;
  const big = hairPx.length > 0 && wideHair / hairPx.length > 0.32;

  // 3. choose a hair style a person would recognise
  let hairStyle: HairStyle;
  const matched: string[] = ['Skin tone'];
  if (coverage < 0.12) {
    hairStyle = kind === 'baby' ? 'tuft' : kind === 'elder' ? 'sides' : 'buzz';
    matched.push(kind === 'baby' ? 'A little baby hair' : 'Very short hair');
  } else {
    matched.push(hairName(hairC).replace(/^./, (m) => m.toUpperCase()));
    if (kind === 'baby') hairStyle = curly ? 'curly' : 'tuft';
    else if (curly && big && !long) hairStyle = 'afro';
    else if (curly) hairStyle = long ? 'wavy' : 'curly';
    else if (long) hairStyle = 'long';
    else hairStyle = kind === 'elder' ? 'sides' : 'short';
    if (curly) matched.push('Curls');
    if (long) matched.push('Long hair');
    else if (kind !== 'baby') matched.push('Short hair');
    if (big && curly) matched.push('Lots of volume');
  }

  // keep colours true to the photo but inside the illustration's palette
  const tame = (c: number[], palette: string[], k: number) => { const p = rgb(nearest(c, palette)); return hex(c.map((v, i) => v * (1 - k) + p[i] * k)); };
  return { skin: tame(skin, SKIN_TONES, 0.45), hair: coverage < 0.12 || hairPx.length <= 30 ? undefined : tame(hairC, HAIR_COLOURS, 0.5), hairStyle, matched };
}

/** Free sample photos from Unsplash (Unsplash License), used only in the demo to try photo → character. */
export const SAMPLE_PHOTOS: Record<string, { path: string; by: string }[]> = {
  baby: [
    { path: 'photo-1617331140180-e8262094733a', by: 'Christian Bowen' },
    { path: 'photo-1649880210584-3365f4c4c08b', by: 'Wesley Tingey' },
    { path: 'photo-1564228511755-8adafd74c14c', by: 'Henley Design Studio' },
  ],
  parent: [
    { path: 'photo-1570657891791-e39a9d185540', by: 'Raul Angel' },
    { path: 'photo-1542644425-bc949ec841a4', by: 'Kelly Sikkema' },
    { path: 'photo-1560707854-fb9a10eeaace', by: 'Jonathan Borba' },
  ],
  sibling: [
    { path: 'photo-1568385247005-0d371d214a2c', by: 'Juan Encalada' },
    { path: 'photo-1624272949900-9ae4c56397e8', by: 'Mieke Campbell' },
  ],
  friend: [
    { path: 'photo-1758513422399-68a0aff34c8d', by: 'Brooke Balentine' },
    { path: 'photo-1597117753473-9a20330f5fb7', by: 'Reynardo Etenia Wongso' },
  ],
  grandparent: [
    { path: 'photo-1742696405936-fe5ef4f37b4b', by: 'Jeferson Santu' },
    { path: 'photo-1652300353103-490b43ac8366', by: 'Tim Mossholder' },
  ],
  relative: [
    { path: 'photo-1583710457367-47de0ea21fef', by: 'Hollie Santos' },
    { path: 'photo-1554286421-8cfbce5c9740', by: 'Annie Spratt' },
  ],
  teacher: [
    { path: 'photo-1560707857-b897819e06fb', by: 'Jonathan Borba' },
  ],
  pet: [],
};

export const samplePhotoUrl = (path: string, size = 360) =>
  `https://images.unsplash.com/${path}?auto=format&fit=crop&crop=faces&w=${size}&h=${size}&q=75`;
