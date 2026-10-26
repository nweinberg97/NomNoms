import type { Raster } from '../assets/pipeline';
import { decodePhoto, rasterToCanvas, wipe } from '../assets/browser';
import { measure, type FaceInput, type Measurements } from './measure';
import { applyDNA, buildDNA, parentTraits, type CharacterDNA, type IdentityKey } from './dna';
import type { Look } from '../character';

/**
 * The face reader: MediaPipe face landmarks and person segmentation, run by
 * @vladmandic/human inside this browser tab. The library and its models are
 * served from NomNoms' own site (public/vendor/human) and loaded only the first
 * time someone uses a photo. The photo itself never leaves the device, is never
 * written to storage, and its pixels are wiped as soon as it has been read.
 */

declare const __NN_VENDOR__: string;
const VENDOR = typeof __NN_VENDOR__ !== 'undefined' ? __NN_VENDOR__ : 'vendor/';
/** The biggest side a photo is read at: plenty for a face, quick on a phone. */
export const READ_SIDE = 720;

/* eslint-disable @typescript-eslint/no-explicit-any */
type HumanLike = any;
let loading: Promise<HumanLike> | null = null;

export class ReaderUnavailable extends Error {}

/** Load the reader once; later calls reuse it. */
export function loadReader(): Promise<HumanLike> {
  if (!loading) {
    loading = (async () => {
      const base = new URL(`${VENDOR}human/`, document.baseURI).href;
      let mod: any;
      try {
        mod = await import(/* not bundled */ `${base}human.esm.js`);
      } catch {
        throw new ReaderUnavailable('The face reader couldn’t load here. You can still pick skin, hair and face shape by hand below.');
      }
      const human = new mod.Human({
        backend: 'webgl', modelBasePath: `${base}models/`, cacheModels: false, debug: false, async: true, warmup: 'none', cacheSensitivity: 0, filter: { enabled: false },
        face: {
          enabled: true, detector: { rotation: true, maxDetected: 4, minConfidence: 0.4, return: false }, mesh: { enabled: true }, iris: { enabled: true },
          description: { enabled: false }, emotion: { enabled: false }, antispoof: { enabled: false }, liveness: { enabled: false }, attention: { enabled: false },
        },
        body: { enabled: false }, hand: { enabled: false }, object: { enabled: false }, gesture: { enabled: false },
        segmentation: { enabled: true, modelPath: 'selfie.json', mode: 'alpha' },
      });
      try {
        await human.load();
      } catch {
        throw new ReaderUnavailable('The face reader couldn’t start on this device. You can still pick skin, hair and face shape by hand below.');
      }
      return human;
    })().catch((e) => { loading = null; throw e; });
  }
  return loading;
}

export interface Reading {
  measurements: Measurements;
  /** Everything needed to redraw the debug view; only kept when asked for. */
  debug?: { raster: Raster; person?: Uint8Array; box?: number[]; mesh?: number[][]; faces: number; backend: string; ms: number };
}

/** Read one photo. The raster is wiped afterwards unless `keepForDebug`. */
export async function readFace(raster: Raster, opts: { keepForDebug?: boolean } = {}): Promise<Reading> {
  const human = await loadReader();
  const t0 = performance.now();
  const canvas = rasterToCanvas(raster);
  let person: Uint8Array | undefined;
  let face: FaceInput | null = null;
  let box: number[] | undefined;
  let mesh: number[][] | undefined;
  try {
    const res = await human.detect(canvas);
    const faces = (res.face ?? []).filter((f: any) => f.mesh?.length >= 468);
    if (faces.length) {
      const big = faces.reduce((a: any, b: any) => (b.box[2] * b.box[3] > a.box[2] * a.box[3] ? b : a));
      box = big.box;
      mesh = big.mesh;
      face = { mesh: big.mesh, score: big.faceScore ?? big.score ?? 0, rotation: big.rotation?.angle, faces: faces.length };
    }
    try {
      const t = await human.segmentation(canvas);
      if (t) {
        const d = await t.data();
        human.tf.dispose(t);
        if (d.length === raster.w * raster.h) { person = new Uint8Array(d.length); for (let i = 0; i < d.length; i++) person[i] = d[i]; }
      }
    } catch { /* no outline: measure() says so in its warnings */ }
  } finally {
    canvas.width = 0; canvas.height = 0;
  }
  const measurements = measure(face, { raster, person });
  const ms = Math.round(performance.now() - t0);
  if (opts.keepForDebug) return { measurements, debug: { raster, person, box, mesh, faces: face?.faces ?? 0, backend: human.tf.getBackend?.() ?? '?', ms } };
  wipe(raster);
  person?.fill(0);
  delete (measurements.debug as { hairPixels?: Uint8Array }).hairPixels;
  return { measurements };
}

/** Open a photo from a file or a URL as pixels, upright, at reading size. */
export async function openPhoto(src: Blob | string): Promise<Raster> {
  let blob: Blob;
  if (typeof src === 'string') {
    const r = await fetch(src, { mode: 'cors', credentials: 'omit' }).catch(() => null);
    if (!r || !r.ok) throw new Error('That photo didn’t load. Try another one.');
    blob = await r.blob();
  } else blob = src;
  return decodePhoto(blob, READ_SIDE);
}

/** Photo → DNA → look, keeping whatever the parent already chose by hand. */
export async function likenessFromPhoto(src: Blob | string, look: Look, chosen: IdentityKey[]): Promise<{ dna: CharacterDNA; look: Look; measurements: Measurements }> {
  const raster = await openPhoto(src);
  const { measurements } = await readFace(raster);
  const dna = buildDNA(measurements, look.kind, parentTraits(look, chosen));
  return { dna, look: applyDNA(look, dna), measurements };
}
