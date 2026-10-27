import type { StyleMode } from '../styles';
import { maskBox, type AssetBase, type AssetKind } from './pipeline';

/** What every saved asset records about itself (the PRD's required metadata). */
export interface AssetMeta {
  id: string;
  kind: AssetKind;
  name: string;
  createdAt: string;
  /** The mode the parent approved it in. It can still be redrawn in any mode. */
  styleMode: StyleMode;
  /** How the source photo was handled. The photo itself is never stored. */
  source: {
    photoKept: false;
    locationDataRemoved: true;
    /** People, faces or writing hidden before simplifying, and how they were found. */
    hidden: number;
    detection: 'automatic' | 'manual' | 'automatic+manual' | 'none';
    /** Objects: how the boundary was set. */
    boundary: 'automatic' | 'automatic+edited' | 'manual' | 'not-applicable';
    /** Always on-device in this version; nothing is sent anywhere. */
    processedOn: 'device';
  };
  dimensions: { width: number; height: number };
  /** Normalised point the asset is placed by: the bottom centre of a thing, the horizon centre of a place. */
  anchor: { x: number; y: number };
  placement: {
    layer: 'background' | 'ground';
    /** Things: height compared with a grown-up (1 = as tall as a grown-up). */
    heightRatio?: number;
    /** Places: horizon height and the overlapping depth bands (0 top, 1 bottom) used for parallax. */
    horizon?: number;
    depthBands?: [number, number][];
  };
}

export interface StoredAsset { meta: AssetMeta; base: AssetBase }

export const depthBands = (horizon: number): [number, number][] => [[0, horizon * 0.95], [horizon * 0.55, Math.min(1, horizon * 1.25)], [horizon * 0.9, 1]];

export function makeMeta(base: AssetBase, opts: {
  id: string; name: string; styleMode: StyleMode; hidden: number; autoFound: number; boundary: AssetMeta['source']['boundary']; heightRatio?: number; now?: Date;
}): AssetMeta {
  const manual = opts.hidden - opts.autoFound;
  const detection: AssetMeta['source']['detection'] = opts.autoFound && manual > 0 ? 'automatic+manual' : opts.autoFound ? 'automatic' : manual > 0 ? 'manual' : 'none';
  let anchor = { x: 0.5, y: 1 };
  let dimensions = { width: base.w, height: base.h };
  if (base.kind === 'object' && base.alpha) {
    const box = maskBox(base.alpha, base.w, base.h);
    if (box) { anchor = { x: +((box.x + box.w / 2) / base.w).toFixed(3), y: +((box.y + box.h) / base.h).toFixed(3) }; dimensions = { width: box.w, height: box.h }; }
  }
  if (base.kind === 'place') anchor = { x: 0.5, y: base.horizon ?? 0.55 };
  return {
    id: opts.id,
    kind: base.kind,
    name: opts.name.trim() || (base.kind === 'place' ? 'Our place' : 'Our thing'),
    createdAt: (opts.now ?? new Date()).toISOString(),
    styleMode: opts.styleMode,
    source: { photoKept: false, locationDataRemoved: true, hidden: opts.hidden, detection, boundary: base.kind === 'object' ? opts.boundary : 'not-applicable', processedOn: 'device' },
    dimensions,
    anchor,
    placement: base.kind === 'object'
      ? { layer: 'ground', heightRatio: opts.heightRatio ?? 0.5 }
      : { layer: 'background', horizon: base.horizon ?? 0.55, depthBands: depthBands(base.horizon ?? 0.55) },
  };
}

/** Crop an object's stored regions to its own bounds so it is light and anchors cleanly. */
export function trimObject(base: AssetBase): AssetBase {
  if (base.kind !== 'object' || !base.alpha) return base;
  const box = maskBox(base.alpha, base.w, base.h);
  if (!box) return base;
  const pad = 4;
  const x0 = Math.max(0, box.x - pad), y0 = Math.max(0, box.y - pad);
  const x1 = Math.min(base.w, box.x + box.w + pad), y1 = Math.min(base.h, box.y + box.h + pad);
  const w = x1 - x0, h = y1 - y0;
  const labels = new Uint8Array(w * h), alpha = new Uint8Array(w * h), lines = base.lines ? new Uint8Array(w * h) : undefined;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const j = (y0 + y) * base.w + x0 + x; labels[y * w + x] = base.labels[j]; alpha[y * w + x] = base.alpha[j]; if (lines) lines[y * w + x] = base.lines![j]; }
  return { ...base, w, h, labels, alpha, ...(lines ? { lines } : {}) };
}
