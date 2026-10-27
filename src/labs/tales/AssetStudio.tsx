import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/ui';
import { cx } from '../../lib/util';
import { characterSvg, type Look } from './character';
import { STYLE_MODES, STYLES, type StyleMode } from './styles';
import { sceneSvg } from './scene';
import { decodePhoto, findThingsToHide, rasterToCanvas, rasterToUrl, resize, wipe, detectors } from './assets/browser';
import { makeMeta, type StoredAsset } from './assets/meta';
import { brushMask, cropRaster, hideRegions, maskCoverage, rotate90, MAX_SIDE, type AssetKind, type Raster, type Rect } from './assets/pipeline';
import { assetArtUrl } from './assets/browser';
import { DRAW_STYLES, DRAW_STYLE_NAMES, type DrawStyle } from './assets/paintRender';
import { DETAILS, type VectorStage } from './assets/vector';
import { cutOutAsync, makeAsset } from './assets/make';
import { DrawingMagic } from './DrawingMagic';

/**
 * Photo → illustrated place or thing, on this device.
 * Frame it, hide faces and writing, fix a thing's edge, then review the
 * result beside the photo. Approving asks before anything is saved, and only
 * the simplified drawing is kept, never the photo.
 */

type Step = 'pick' | 'adjust' | 'working' | 'review';
type Tool = 'frame' | 'hide' | 'edge';

const SIZES = [
  { label: 'Toy', ratio: 0.22 }, { label: 'Pet', ratio: 0.35 }, { label: 'Chair', ratio: 0.5 },
  { label: 'Bike', ratio: 0.6 }, { label: 'Grown-up', ratio: 1 }, { label: 'Tree', ratio: 2.4 },
];

let n = 0;
const newId = () => `asset-${Date.now().toString(36)}-${(n++).toString(36)}`;

export function AssetStudio({ open, kind: startKind, mode: startMode, star, onClose, onDone }: {
  open: boolean;
  kind: AssetKind;
  mode: StyleMode;
  /** The story's star, shown next to the result for scale. */
  star: Look;
  onClose: () => void;
  /** `save` = the parent confirmed saving to this browser's library. */
  onDone: (asset: StoredAsset, save: boolean) => void;
}) {
  const [step, setStep] = useState<Step>('pick');
  const [kind, setKind] = useState<AssetKind>(startKind);
  const [name, setName] = useState('');
  const [mode, setMode] = useState<StyleMode>(startMode);
  const [photo, setPhoto] = useState<Raster | null>(null);
  const [crop, setCrop] = useState<Rect | null>(null);
  const [hides, setHides] = useState<Rect[]>([]);
  const [autoFound, setAutoFound] = useState(0);
  const [looked, setLooked] = useState(false);
  const [tool, setTool] = useState<Tool>('frame');
  const [mask, setMask] = useState<Uint8Array | null>(null);
  const [maskEdited, setMaskEdited] = useState(false);
  const [brush, setBrush] = useState<0 | 1>(1);
  const [height, setHeight] = useState(0.35);
  const [horizon, setHorizon] = useState<number | null>(null);
  const [seed, setSeed] = useState(7);
  const [stage, setStage] = useState<VectorStage | 'start'>('start');
  const [result, setResult] = useState<StoredAsset | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string>();
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState<Rect | null>(null);
  const can = useMemo(() => (typeof window === 'undefined' ? { faces: false, text: false } : detectors()), []);

  // start fresh every time the studio opens; wipe everything when it closes
  const reset = () => {
    wipe(photo); wipe(work.current);
    setStep('pick'); setPhoto(null); setCrop(null); setHides([]); setAutoFound(0); setLooked(false); setTool('frame'); setKeep(0);
    setMask(null); setMaskEdited(false); setResult(null); setConfirm(false); setError(undefined); setName(''); setHorizon(null); setSeed(7); setDrawStyle('film');
  };
  useEffect(() => { if (open) { setKind(startKind); setMode(startMode); setHeight(startKind === 'object' ? 0.35 : 1); } else reset(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 1. pick ─────────────────────────────────────────── */
  const pick = async (file: File) => {
    setError(undefined);
    try {
      const p = await decodePhoto(file, 1024);
      setPhoto(p);
      setCrop({ x: 0, y: 0, w: p.w, h: p.h });
      setStep('adjust');
      setTool(kind === 'object' ? 'edge' : 'frame');
      const found = await findThingsToHide(p);
      setLooked(found.looked);
      setHides(found.rects);
      setAutoFound(found.rects.length);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  /* the working copy: framed, with hidden areas filled in, at the working size */
  const work = useRef<Raster | null>(null);
  const [workVersion, setWorkVersion] = useState(0);
  const workVersionRef = useRef(0); workVersionRef.current = workVersion;
  const cutting = useRef(false);
  const [finding, setFinding] = useState(false);
  const [keep, setKeep] = useState(0);
  useEffect(() => {
    if (!photo || !crop) return;
    const local = hides
      .map((r) => ({ x: r.x - crop.x, y: r.y - crop.y, w: r.w, h: r.h }))
      .filter((r) => r.x + r.w > 0 && r.y + r.h > 0 && r.x < crop.w && r.y < crop.h);
    const framed = cropRaster(photo, crop);
    const next = resize(hideRegions(framed, local), MAX_SIDE);
    wipe(work.current);
    work.current = next;
    setMask(null);
    setMaskEdited(false);
    setWorkVersion((v) => v + 1);
  }, [photo, crop, hides]);

  // a thing's boundary is found automatically as soon as its edge step opens
  useEffect(() => {
    if (kind !== 'object' || !work.current || mask || cutting.current) return;
    // find the thing as soon as there's a picture, so the parent sees what will be kept
    const r = work.current, ver = workVersion;
    cutting.current = true; setFinding(true);
    cutOutAsync(r, keep).then((m) => { if (ver === workVersionRef.current) setMask(m); }).finally(() => { cutting.current = false; setFinding(false); });
  }, [kind, workVersion, mask, keep]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── drawing the adjust canvas ───────────────────────── */
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || step !== 'adjust') return;
    const ctx = c.getContext('2d')!;
    if (tool === 'edge' && work.current) {
      const r = work.current;
      c.width = r.w; c.height = r.h;
      const img = new ImageData(new Uint8ClampedArray(r.data), r.w, r.h);
      if (mask) for (let i = 0; i < mask.length; i++) if (!mask[i]) { img.data[i * 4] = img.data[i * 4] * 0.25 + 40; img.data[i * 4 + 1] = img.data[i * 4 + 1] * 0.25 + 40; img.data[i * 4 + 2] = img.data[i * 4 + 2] * 0.25 + 60; }
      ctx.putImageData(img, 0, 0);
      return;
    }
    if (!photo) return;
    c.width = photo.w; c.height = photo.h;
    ctx.putImageData(new ImageData(new Uint8ClampedArray(photo.data), photo.w, photo.h), 0, 0);
    const lw = Math.max(2, photo.w / 220);
    if (crop && (crop.w < photo.w || crop.h < photo.h)) {
      ctx.fillStyle = 'rgba(20,16,14,.55)';
      ctx.fillRect(0, 0, photo.w, crop.y); ctx.fillRect(0, crop.y + crop.h, photo.w, photo.h - crop.y - crop.h);
      ctx.fillRect(0, crop.y, crop.x, crop.h); ctx.fillRect(crop.x + crop.w, crop.y, photo.w - crop.x - crop.w, crop.h);
    }
    // hidden areas show as soft grey patches
    ctx.fillStyle = 'rgba(160,150,140,.92)';
    hides.forEach((r) => { ctx.fillRect(r.x, r.y, r.w, r.h); });
    ctx.strokeStyle = '#e86f5b'; ctx.lineWidth = lw; ctx.setLineDash([lw * 3, lw * 2]);
    hides.forEach((r) => ctx.strokeRect(r.x, r.y, r.w, r.h));
    if (draft) { ctx.strokeStyle = tool === 'frame' ? '#fff' : '#e86f5b'; ctx.strokeRect(draft.x, draft.y, draft.w, draft.h); }
    ctx.setLineDash([]);
    if (kind === 'place' && horizon !== null && crop) { ctx.strokeStyle = '#5e8fb8'; ctx.lineWidth = lw; const y = crop.y + horizon * crop.h; ctx.beginPath(); ctx.moveTo(crop.x, y); ctx.lineTo(crop.x + crop.w, y); ctx.stroke(); }
  }, [step, tool, photo, crop, hides, draft, mask, workVersion, kind, horizon]);

  const toPx = (e: React.PointerEvent) => {
    const c = canvasRef.current!, b = c.getBoundingClientRect();
    return { x: ((e.clientX - b.left) / b.width) * c.width, y: ((e.clientY - b.top) / b.height) * c.height };
  };
  const rectOf = (a: { x: number; y: number }, b: { x: number; y: number }): Rect => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) });
  const paint = (p: { x: number; y: number }) => {
    if (!mask || !work.current) return;
    const next = new Uint8Array(mask);
    brushMask(next, work.current.w, work.current.h, p.x, p.y, Math.max(6, work.current.w / 28), brush);
    setMask(next);
    setMaskEdited(true);
  };
  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    canvasRef.current!.setPointerCapture(e.pointerId);
    const p = toPx(e);
    drag.current = p;
    if (tool === 'edge') paint(p);
  };
  const move = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const p = toPx(e);
    if (tool === 'edge') paint(p);
    else setDraft(rectOf(drag.current, p));
  };
  const up = () => {
    if (drag.current && draft && draft.w > 8 && draft.h > 8) {
      if (tool === 'frame') setCrop(draft);
      else if (tool === 'hide') setHides((hs) => [...hs, draft]);
    }
    drag.current = null;
    setDraft(null);
  };
  const rotate = (dir: 1 | -1) => {
    if (!photo) return;
    const r = rotate90(photo, dir);
    wipe(photo);
    setPhoto(r);
    setCrop({ x: 0, y: 0, w: r.w, h: r.h });
    setHides([]);
    setAutoFound(0);
  };

  /* ── 2. make it ──────────────────────────────────────── */
  const make = (nextSeed = seed) => {
    if (!work.current) return;
    setStep('working');
    setStage('start');
    setError(undefined);
    setTimeout(async () => {
      try {
        const w = work.current!;
        const m = kind === 'object' ? mask ?? (await cutOutAsync(w, keep)) : undefined;
        if (m && maskCoverage(m) < 0.01) throw new Error('No thing was found in the middle of the photo. Use “Fix the edge” to paint it in.');
        // the heavy work runs in a background worker; the animation follows its stages
        const base = await makeAsset({ raster: w, kind, mask: m, horizon: horizon ?? undefined, seed: nextSeed, colours: 12 + (nextSeed % 3) * 2, detail: DETAILS[(((nextSeed - 7) % 3) + 3) % 3] }, setStage);
        if (kind === 'place' && horizon === null) setHorizon(base.horizon ?? 0.55);
        const meta = makeMeta(base, {
          id: result?.meta.id ?? newId(), name, styleMode: mode, hidden: hides.length, autoFound,
          boundary: kind === 'object' ? (maskEdited ? 'automatic+edited' : 'automatic') : 'not-applicable', heightRatio: height,
        });
        setResult({ meta, base });
        setStep('review');
      } catch (e) {
        setError((e as Error).message);
        setStep('adjust');
      }
    }, 30);
  };

  /* ── 3. review ───────────────────────────────────────── */
  const [drawStyle, setDrawStyle] = useState<DrawStyle>('film');
  const preview = useMemo(() => (result ? assetArtUrl({ ...result.base, drawStyle }, mode) : ''), [result, mode, drawStyle]);
  const beforeUrl = useMemo(() => (step === 'review' && work.current ? rasterToUrl(work.current, 'image/jpeg') : ''), [step, workVersion]); // eslint-disable-line react-hooks/exhaustive-deps
  const inScene = useMemo(() => {
    if (!result || !preview) return '';
    const b = result.base;
    return result.meta.kind === 'place'
      ? sceneSvg({ placeId: 'park', photo: { image: preview, horizon: b.horizon ?? 0.55 }, seed: 1, chars: [{ look: star }], style: mode })
      : sceneSvg({ placeId: 'home', seed: 1, chars: [{ look: star }], things: [{ image: preview, width: b.w, height: b.h, heightRatio: height, x: 0.72 }], style: mode });
  }, [result, preview, mode, star, height]);

  const finish = (save: boolean) => {
    if (!result) return;
    const meta = { ...result.meta, name: name.trim() || result.meta.name, styleMode: mode, placement: { ...result.meta.placement, ...(kind === 'object' ? { heightRatio: height } : {}) } };
    onDone({ meta, base: { ...result.base, drawStyle } }, save);
    reset();
  };

  const title = step === 'pick' ? 'Make something from a photo' : kind === 'place' ? 'A place from a photo' : 'A thing from a photo';
  return (
    <Sheet open={open} onClose={() => { reset(); onClose(); }} title={title} wide>
      <div className="sheet-body ast" data-testid="asset-studio">
        <p className="ast-private"><Icon name="lock" size={14} /> The photo is turned into a drawing on this device. It isn’t uploaded, and it isn’t kept.</p>

        {step === 'pick' && (
          <div className="ast-pick">
            <div className="lab-chips" role="radiogroup" aria-label="What is it?">
              <button type="button" className="lab-chip" aria-pressed={kind === 'place'} onClick={() => setKind('place')} data-testid="ast-kind-place">A place</button>
              <button type="button" className="lab-chip" aria-pressed={kind === 'object'} onClick={() => setKind('object')} data-testid="ast-kind-object">A thing</button>
            </div>
            <p className="lab-sub">{kind === 'place' ? 'A room, the house, a garden, the playground, the zoo, the beach…' : 'A teddy, a tree, a bike, the dog, a favourite chair… Stand back a little so there’s some background around it.'}</p>
            <button type="button" className="btn btn-primary" onClick={() => fileRef.current?.click()} data-testid="ast-pick"><Icon name="image" size={16} /> Choose a photo</button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void pick(f); }} data-testid="ast-file" />
            {error && <p className="lab-status" role="alert">{error}</p>}
          </div>
        )}

        {step === 'adjust' && photo && (
          <div className="ast-adjust">
            <div className="lab-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={tool === 'frame'} onClick={() => setTool('frame')} data-testid="ast-tool-frame">1. Frame it</button>
              <button type="button" role="tab" aria-selected={tool === 'hide'} onClick={() => setTool('hide')} data-testid="ast-tool-hide">2. Hide faces &amp; writing</button>
              {kind === 'object' && <button type="button" role="tab" aria-selected={tool === 'edge'} onClick={() => setTool('edge')} data-testid="ast-tool-edge">3. Fix the edge</button>}
            </div>
            <div className="ast-canvas">
              <canvas ref={canvasRef} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} data-testid="ast-canvas" aria-label="Your photo" />
            </div>
            {tool === 'frame' && (
              <div className="ast-tools">
                <p className="lab-hint">Drag across the photo to frame {kind === 'place' ? 'the place' : 'the thing, with a little background around it'}.</p>
                <div className="lab-row">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => rotate(-1)} data-testid="ast-rotate"><Icon name="undo" size={14} /> Turn left</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => rotate(1)}>Turn right</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCrop({ x: 0, y: 0, w: photo.w, h: photo.h })}>Whole photo</button>
                </div>
              </div>
            )}
            {tool === 'hide' && (
              <div className="ast-tools">
                {looked
                  ? <p className="lab-status">{autoFound ? `Found and hid ${autoFound} face${autoFound > 1 ? 's' : ''} or bit${autoFound > 1 ? 's' : ''} of writing. Check the photo for any more.` : 'No faces or writing found automatically. Check the photo yourself.'}</p>
                  : <p className="lab-status" data-testid="ast-no-detector">This browser can’t look for faces or writing by itself. Drag over any faces, people, house numbers or name signs to hide them.</p>}
                <div className="lab-row">
                  <span className="lab-sub">{hides.length} hidden</span>
                  {hides.length > 0 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setHides((hs) => hs.slice(0, -1))}><Icon name="undo" size={14} /> Undo last</button>}
                </div>
              </div>
            )}
            {tool === 'edge' && (
              <div className="ast-tools">
                <p className="lab-hint">{finding ? 'Finding the thing in your photo…' : 'The dimmed part will be cut away. Missing a bit? Tap “Keep more”, or paint it back.'}</p>
                <div className="lab-row">
                  <button type="button" className="lab-chip" disabled={finding || keep <= -1} onClick={() => { setKeep((k) => Math.max(-1, k - 0.5)); setMask(null); setMaskEdited(false); }} data-testid="ast-keep-less">Keep less</button>
                  <button type="button" className="lab-chip" disabled={finding || keep >= 1} onClick={() => { setKeep((k) => Math.min(1, k + 0.5)); setMask(null); setMaskEdited(false); }} data-testid="ast-keep-more">Keep more</button>
                </div>
                <div className="lab-row">
                  <button type="button" className="lab-chip" aria-pressed={brush === 1} onClick={() => setBrush(1)} data-testid="ast-brush-keep">Keep</button>
                  <button type="button" className="lab-chip" aria-pressed={brush === 0} onClick={() => setBrush(0)} data-testid="ast-brush-remove">Cut away</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setMask(null); setMaskEdited(false); }}>Start over</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { if (work.current) { setMask(new Uint8Array(work.current.w * work.current.h).fill(1)); setMaskEdited(true); } }}>Keep the background</button>
                </div>
              </div>
            )}
            <div className="ast-fields">
              <label className="field"><span>{kind === 'place' ? 'Name this place' : 'What is it?'}</span><input value={name} placeholder={kind === 'place' ? 'Grandma’s garden' : 'Teddy'} onChange={(e) => setName(e.target.value)} data-testid="ast-name" /></label>
              {kind === 'object' ? (
                <div className="field"><span>How tall is it next to a grown-up?</span>
                  <div className="lab-chips">{SIZES.map((s) => <button key={s.label} type="button" className="lab-chip" aria-pressed={Math.abs(height - s.ratio) < 0.01} onClick={() => setHeight(s.ratio)}>{s.label}</button>)}</div>
                  <input type="range" min="0.1" max="3" step="0.05" value={height} onChange={(e) => setHeight(+e.target.value)} aria-label="Height compared with a grown-up" data-testid="ast-height" />
                </div>
              ) : (
                <label className="field"><span>Where the ground meets the sky (for depth)</span>
                  <input type="range" min="0.2" max="0.9" step="0.01" value={horizon ?? 0.55} onChange={(e) => setHorizon(+e.target.value)} data-testid="ast-horizon" />
                </label>
              )}
            </div>
            {error && <p className="lab-status" role="alert">{error}</p>}
            <div className="lab-row">
              <button type="button" className="btn btn-primary" onClick={() => make()} data-testid="ast-make"><Icon name="sparkle" size={16} /> Turn it into a drawing</button>
              <button type="button" className="btn btn-ghost" onClick={() => { reset(); onClose(); }}>Discard</button>
            </div>
          </div>
        )}

        {step === 'working' && <div className="ast-working" data-testid="ast-working"><DrawingMagic variant="place" stage={stage} /></div>}

        {step === 'review' && result && (
          <div className="ast-review" data-testid="ast-review">
            <div className="ast-compare">
              <figure><img src={beforeUrl} alt="Your photo, framed" /><figcaption>Your photo (only here, not kept)</figcaption></figure>
              <figure className={cx(result.meta.kind === 'object' && 'is-thing')}><img src={preview} alt="The drawing" data-testid="ast-result" /><figcaption>The drawing</figcaption></figure>
            </div>
            <p className="lab-sub">Look</p>
            <div className="lab-chips" role="radiogroup" aria-label="Look">
              {STYLE_MODES.map((m) => <button key={m} type="button" className="lab-chip" aria-pressed={mode === m} onClick={() => setMode(m)} data-testid={`ast-mode-${m}`}>{STYLES[m].name}</button>)}
            </div>
            <p className="lab-sub">Drawing style</p>
            <div className="lab-chips" role="radiogroup" aria-label="Drawing style">
              {DRAW_STYLES.map((d) => <button key={d} type="button" className="lab-chip" role="radio" aria-checked={drawStyle === d} aria-pressed={drawStyle === d} onClick={() => setDrawStyle(d)} data-testid={`ast-style-${d}`}>{DRAW_STYLE_NAMES[d]}</button>)}
            </div>
            <div className="ast-scene" dangerouslySetInnerHTML={{ __html: inScene }} />
            <p className="lab-hint">In a story it follows whatever look the book uses.</p>
            <div className="lab-row">
              <button type="button" className="btn btn-primary" onClick={() => setConfirm(true)} data-testid="ast-approve"><Icon name="check" size={16} /> Looks good</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { const s2 = seed + 1; setSeed(s2); make(s2); }} data-testid="ast-retry"><Icon name="refresh" size={14} /> Try again</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep('adjust')} data-testid="ast-edit"><Icon name="pen" size={14} /> Edit</button>
              <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => { reset(); onClose(); }} data-testid="ast-discard"><Icon name="x" size={14} /> Discard</button>
            </div>
            {confirm && (
              <div className="ast-confirm" role="dialog" aria-label="Save it?" data-testid="ast-confirm">
                <strong>Save “{name.trim() || result.meta.name}” to your library?</strong>
                <p>Only the drawing is saved, in this browser on this device. The photo isn’t saved anywhere. You can delete it any time.</p>
                <div className="lab-row">
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => finish(true)} data-testid="ast-save">Save to my library</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => finish(false)} data-testid="ast-use-once">Use just for now</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirm(false)}>Back</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}

/** A small picture of a character, used in the mode picker. */
export const modeSample = (look: Look, mode: StyleMode) => characterSvg(look, { style: mode, viewBox: '10 -14 180 200' });
export { rasterToCanvas };
