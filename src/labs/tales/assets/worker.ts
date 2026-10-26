/// <reference lib="webworker" />
import { trimObject } from './meta';
import { buildBase } from './pipeline';
import { vectorizeAssetSteps } from './vector';
import type { MakeRequest } from './make';

/**
 * Background worker for turning a photo into a place or thing, so the page
 * (and its waiting animation) stays smooth. It only ever sees the working
 * pixels it is sent, keeps nothing, and sends back outlines and colours.
 */
const ctx = self as unknown as DedicatedWorkerGlobalScope;
ctx.onmessage = (e: MessageEvent<MakeRequest & { id: number }>) => {
  const { id, raster, kind, mask, horizon, seed, colours, detail } = e.data;
  try {
    let base = buildBase(raster, kind, { mask, horizon, seed, colours });
    if (kind === 'object') base = trimObject(base);
    const it = vectorizeAssetSteps(raster, kind, mask, detail);
    for (;;) {
      const r = it.next();
      if (r.done) { base = { ...base, vector: r.value }; break; }
      ctx.postMessage({ id, stage: r.value });
    }
    raster.data.fill(0);
    ctx.postMessage({ id, base });
  } catch (err) {
    ctx.postMessage({ id, error: (err as Error).message });
  }
};
