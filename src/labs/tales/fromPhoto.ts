import { HAIR_COLOURS, SKIN_TONES, type HairStyle } from './character';

/**
 * Photo → character, entirely on this device.
 *
 * The photo is drawn into a small in-memory canvas, the skin and hair colours
 * are read from it, and the canvas is thrown away. Nothing is uploaded or
 * saved; only the resulting colours are kept. (On Apple devices, Genmoji can
 * make the face instead; see the demo screen.)
 */

export interface PhotoTraits {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
}

const hex = (r: number, g: number, b: number) => `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
const rgb = (h: string) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const nearest = (c: number[], palette: string[]) => palette.reduce((best, h) => (dist(rgb(h), c) < dist(rgb(best), c) ? h : best), palette[0]);
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] ?? 0; };
/** Blend a measured colour toward the nearest palette colour, so faces stay in the illustration's style. */
const tame = (c: number[], palette: string[], k: number) => { const p = rgb(nearest(c, palette)); return hex(...(c.map((v, i) => v * (1 - k) + p[i] * k) as [number, number, number])); };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('That photo didn’t load.'));
    img.src = src;
  });
}

export async function traitsFromPhoto(src: string): Promise<PhotoTraits> {
  const img = await loadImage(src);
  const N = 128;
  const canvas = document.createElement('canvas');
  canvas.width = N; canvas.height = N;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  // centre-crop to a square
  const s = Math.min(img.naturalWidth, img.naturalHeight);
  ctx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, N, N);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, N, N).data;
  } catch {
    throw new Error('This browser won’t let the page read that photo.');
  } finally {
    canvas.width = 0; canvas.height = 0;
  }

  // 1. skin: a standard YCbCr skin-colour test
  const skin: number[][] = [];
  const isSkin = new Uint8Array(N * N);
  let top = N, left = N, right = 0;
  const rowCount = new Array(N).fill(0);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const Y = 0.299 * r + 0.587 * g + 0.114 * b;
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
      if (Y > 45 && Y < 245 && cr > 135 && cr < 180 && cb > 80 && cb < 135 && r > g && r > b) {
        isSkin[y * N + x] = 1;
        rowCount[y]++;
        skin.push([r, g, b]);
      }
    }
  }
  if (skin.length < N * N * 0.03) throw new Error('Couldn’t find a face in that photo. Try a closer one.');
  for (let y = 0; y < N; y++) if (rowCount[y] > N * 0.08) { top = y; break; }
  for (let y = top; y < Math.min(N, top + N * 0.4); y++) {
    for (let x = 0; x < N; x++) if (isSkin[y * N + x]) { left = Math.min(left, x); right = Math.max(right, x); }
  }
  const skinRGB = [0, 1, 2].map((k) => median(skin.map((p) => p[k])));

  // 2. hair: the darker, non-skin pixels in a band just above where the face starts
  const hair: number[][] = [];
  let band = 0;
  const y0 = Math.max(0, top - Math.round(N * 0.16)), y1 = Math.min(N, top + Math.round(N * 0.05));
  for (let y = y0; y < y1; y++) {
    for (let x = Math.max(0, left); x <= Math.min(N - 1, right); x++) {
      band++;
      if (isSkin[y * N + x]) continue;
      const i = (y * N + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum < 200) hair.push([r, g, b]);
    }
  }
  const coverage = band ? hair.length / band : 0;
  const hairRGB = hair.length ? [0, 1, 2].map((k) => median(hair.map((p) => p[k]))) : rgb(HAIR_COLOURS[2]);
  return {
    skin: tame(skinRGB, SKIN_TONES, 0.45),
    hair: tame(hairRGB, HAIR_COLOURS, 0.55),
    hairStyle: coverage > 0.5 ? 'short' : coverage > 0.22 ? 'curly' : 'tuft',
  };
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
  pet: [],
};

export const samplePhotoUrl = (path: string, size = 360) =>
  `https://images.unsplash.com/${path}?auto=format&fit=crop&crop=faces&w=${size}&h=${size}&q=75`;
