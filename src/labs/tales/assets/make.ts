import { trimObject } from './meta';
import { buildBase, type AssetBase, type AssetKind, type Raster } from './pipeline';
import { runSteps, vectorizeAssetSteps, type VectorOptions, type VectorStage } from './vector';
import { cutOut } from './cutout';

/**
 * Make an asset's drawing from the working pixels. Runs in a background
 * worker when the browser allows it (smooth page, smooth animation), and on
 * the page otherwise. Both run the same code and give the same result.
 */
export interface MakeRequest { raster: Raster; kind: AssetKind; mask?: Uint8Array; horizon?: number; seed: number; colours: number; detail: VectorOptions['detail'] }

declare const __NN_ASSET_WORKER__: string;
let worker: Worker | null | undefined;
let nextId = 1;
function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    const code = typeof __NN_ASSET_WORKER__ === 'string' ? __NN_ASSET_WORKER__ : '';
    worker = code && typeof Worker !== 'undefined' ? new Worker(URL.createObjectURL(new Blob([code], { type: 'text/javascript' }))) : null;
  } catch {
    worker = null;
  }
  return worker;
}

async function onPage(req: MakeRequest, onStage?: (s: VectorStage) => void): Promise<AssetBase> {
  await new Promise((r) => setTimeout(r, 60));
  let base = buildBase(req.raster, req.kind, { mask: req.mask, horizon: req.horizon, seed: req.seed, colours: req.colours });
  if (req.kind === 'object') base = trimObject(base);
  return { ...base, vector: await runSteps(vectorizeAssetSteps(req.raster, req.kind, req.mask, req.detail), onStage) };
}

export function makeAsset(req: MakeRequest, onStage?: (s: VectorStage) => void): Promise<AssetBase> {
  const w = getWorker();
  if (!w) return onPage(req, onStage);
  const id = nextId++;
  return new Promise<AssetBase>((resolve, reject) => {
    const done = () => { w.removeEventListener('message', msg); w.removeEventListener('error', fail); };
    const msg = (e: MessageEvent) => {
      if (e.data?.id !== id) return;
      if (e.data.stage) onStage?.(e.data.stage);
      else if (e.data.base) { done(); resolve(e.data.base); }
      else if (e.data.error) { done(); reject(new Error(e.data.error)); }
    };
    // a worker that can't start (blocked by the page's host) falls back to the page
    const fail = () => { done(); worker = null; onPage(req, onStage).then(resolve, reject); };
    w.addEventListener('message', msg);
    w.addEventListener('error', fail);
    // send a copy: the page keeps its own working pixels for 'Try again'
    w.postMessage({ id, ...req, raster: { w: req.raster.w, h: req.raster.h, data: new Uint8ClampedArray(req.raster.data) } });
  });
}

/** Find the thing in a photo (see cutout.ts), in the background worker when possible. */
export function cutOutAsync(raster: Raster, keep = 0): Promise<Uint8Array> {
  const w = getWorker();
  const onPageCut = () => new Promise<Uint8Array>((res) => setTimeout(() => res(cutOut(raster, { keep })), 30));
  if (!w) return onPageCut();
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const done = () => { w.removeEventListener('message', msg); w.removeEventListener('error', fail); };
    const msg = (e: MessageEvent) => {
      if (e.data?.id !== id) return;
      done();
      if (e.data.mask) resolve(e.data.mask); else reject(new Error(e.data.error ?? 'The cut-out failed.'));
    };
    const fail = () => { done(); worker = null; onPageCut().then(resolve, reject); };
    w.addEventListener('message', msg); w.addEventListener('error', fail);
    w.postMessage({ id, type: 'cut', raster: { w: raster.w, h: raster.h, data: new Uint8ClampedArray(raster.data) }, keep });
  });
}
