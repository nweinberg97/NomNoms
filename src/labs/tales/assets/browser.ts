import { renderBase } from './render';
import { vectorUrl } from './vectorRender';
import type { StyleMode } from '../styles';
import { fitSize, makeRaster, type AssetBase, type Raster, type Rect } from './pipeline';

/**
 * The browser side of the pipeline: decode a photo into pixels, look for faces
 * and writing where the browser can, and turn pixels back into a picture.
 * Decoding through a canvas drops the photo's metadata (location, time,
 * camera), so nothing downstream ever sees it.
 */

/** Decode a photo, upright, at most `max` pixels on its long side. The file itself is not kept. */
/** The picture for an asset in a look: the redrawn vector when there is one, else the older pixel rendering. */
export function assetArtUrl(base: AssetBase, mode: StyleMode): string {
  return base.vector ? vectorUrl(base.vector, mode, { transparent: base.kind === 'object' }) : rasterToUrl(renderBase(base, mode), 'image/png');
}

export async function decodePhoto(file: Blob, max = 1024): Promise<Raster> {
  let bmp: ImageBitmap | null = null;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  } catch {
    throw new Error('That photo couldn’t be opened. Try a JPEG or PNG.');
  }
  const [w, h] = fitSize(bmp.width, bmp.height, max);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true })!;
  x.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const data = x.getImageData(0, 0, w, h).data;
  c.width = 0; c.height = 0; // release the canvas memory now
  return { w, h, data };
}

export function rasterToCanvas(r: Raster): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = r.w; c.height = r.h;
  c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(r.data), r.w, r.h), 0, 0);
  return c;
}

export function rasterToUrl(r: Raster, type: 'image/png' | 'image/jpeg' = 'image/png'): string {
  const c = rasterToCanvas(r);
  const url = c.toDataURL(type, 0.9);
  c.width = 0; c.height = 0;
  return url;
}

export function resize(r: Raster, max: number): Raster {
  const [w, h] = fitSize(r.w, r.h, max);
  if (w === r.w && h === r.h) return r;
  const src = rasterToCanvas(r);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true })!;
  x.imageSmoothingQuality = 'high';
  x.drawImage(src, 0, 0, w, h);
  const out = { w, h, data: x.getImageData(0, 0, w, h).data };
  src.width = 0; c.width = 0;
  return out;
}

/** Zero the pixels so nothing of the photo lingers in memory we still hold. */
export function wipe(r: Raster | null | undefined) { if (r) r.data.fill(0); }

interface Detector { detect(img: CanvasImageSource): Promise<{ boundingBox: DOMRectReadOnly }[]> }

/** Which on-device detectors this browser offers (the Shape Detection API; often only on some Android and Chrome builds). */
export const detectors = () => ({
  faces: typeof (window as unknown as { FaceDetector?: unknown }).FaceDetector === 'function',
  text: typeof (window as unknown as { TextDetector?: unknown }).TextDetector === 'function',
});

/** Faces and writing the browser can find, as rectangles to hide. Empty when the browser can't look. */
export async function findThingsToHide(r: Raster): Promise<{ rects: Rect[]; looked: boolean }> {
  const w = window as unknown as { FaceDetector?: new (o?: object) => Detector; TextDetector?: new () => Detector };
  const rects: Rect[] = [];
  let looked = false;
  const c = rasterToCanvas(r);
  try {
    if (w.FaceDetector) {
      looked = true;
      for (const f of await new w.FaceDetector({ fastMode: true, maxDetectedFaces: 20 }).detect(c)) {
        const b = f.boundingBox, pad = b.width * 0.35;
        rects.push({ x: b.x - pad, y: b.y - pad * 1.4, w: b.width + pad * 2, h: b.height + pad * 2.4 });
      }
    }
    if (w.TextDetector) {
      looked = true;
      for (const t of await new w.TextDetector().detect(c)) { const b = t.boundingBox; rects.push({ x: b.x - 3, y: b.y - 3, w: b.width + 6, h: b.height + 6 }); }
    }
  } catch {
    // a detector that fails is treated as "couldn't look", and the parent is asked
    looked = false;
  } finally {
    c.width = 0;
  }
  return { rects, looked };
}

export const emptyRaster = () => makeRaster(1, 1);
