import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/ui';
import { cx } from '../../lib/util';

/**
 * Draw a place or a character for Baby Tales, or bring in a drawing from
 * paper (a photo of it). Places are a 4:3 picture; characters are drawn on a
 * see-through canvas so they can stand inside any scene. Everything stays in
 * this page's memory.
 */

export type DrawMode = 'place' | 'character' | 'hat' | 'glasses' | 'outfit' | 'extra';
const SIZE: Record<DrawMode, [number, number]> = { place: [800, 600], character: [600, 750], hat: [800, 500], glasses: [720, 300], outfit: [700, 600], extra: [450, 875] };
const TITLE: Record<DrawMode, string> = { place: 'Draw a place', character: 'Draw a character', hat: 'Draw a hat', glasses: 'Draw glasses', outfit: 'Draw an outfit', extra: 'Draw something to hold' };
const DEFAULT_NAME: Record<DrawMode, string> = { place: 'Our special place', character: 'My drawing', hat: 'My hat', glasses: 'My glasses', outfit: 'My outfit', extra: 'My thing' };
const HINT: Record<DrawMode, string> = {
  place: 'Draw anywhere: Grandma’s house, a magic forest, the moon…',
  character: 'Draw someone or something to star in the story',
  hat: 'Draw a hat on their head', glasses: 'Draw glasses over their eyes', outfit: 'Draw clothes over their body', extra: 'Draw something for them to hold',
};
const COLOURS = ['#2a201c', '#e86f5b', '#f2a33a', '#f2c14e', '#7fb069', '#3f9c8f', '#5e8fb8', '#8e6bb8', '#ef9fb6', '#a8744a', '#ffffff', '#9aa3ab'];
const SIZES = [4, 10, 22];

/** `guide` is a faint picture of the character under the canvas, so wardrobe drawings land in the right spot. */
export function DrawPad({ open, mode, guide, onClose, onDone }: { open: boolean; mode: DrawMode; guide?: string; onClose: () => void; onDone: (image: string, name: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const [colour, setColour] = useState(COLOURS[1]);
  const [size, setSize] = useState(SIZES[1]);
  const [erase, setErase] = useState(false);
  const [name, setName] = useState('');
  const [blank, setBlank] = useState(true);
  const history = useRef<ImageData[]>([]);
  const drawing = useRef<{ x: number; y: number } | null>(null);
  const [W, H] = SIZE[mode];
  const wear = mode !== 'place' && mode !== 'character';

  const ctx = () => canvas.current!.getContext('2d', { willReadFrequently: true })!;
  const reset = () => {
    const c = ctx();
    c.clearRect(0, 0, W, H);
    if (mode === 'place') { c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H); }
    history.current = [];
    setBlank(true);
  };
  useEffect(() => {
    if (!open) return;
    setName(DEFAULT_NAME[mode]);
    setErase(false);
    requestAnimationFrame(reset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  const pos = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };
  const snapshot = () => { history.current = [...history.current.slice(-19), ctx().getImageData(0, 0, W, H)]; };
  const stroke = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const c = ctx();
    c.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
    if (erase && mode === 'place') { c.globalCompositeOperation = 'source-over'; c.strokeStyle = '#ffffff'; } else c.strokeStyle = colour;
    c.lineWidth = size * (W / 400);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.lineTo(b.x + 0.01, b.y);
    c.stroke();
    c.globalCompositeOperation = 'source-over';
  };
  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    canvas.current!.setPointerCapture(e.pointerId);
    snapshot();
    const p = pos(e);
    drawing.current = p;
    stroke(p, p);
    setBlank(false);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const p = pos(e);
    stroke(drawing.current, p);
    drawing.current = p;
  };
  const up = () => { drawing.current = null; };
  const undo = () => {
    const last = history.current.pop();
    if (last) ctx().putImageData(last, 0, 0);
  };

  /** A photo of a drawing on paper: fit it in, and for characters lift the paper away. */
  const upload = async (f: File) => {
    const url = URL.createObjectURL(f);
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    snapshot();
    const c = ctx();
    const k = mode === 'place' ? Math.max(W / img.naturalWidth, H / img.naturalHeight) : Math.min(W / img.naturalWidth, H / img.naturalHeight);
    const w = img.naturalWidth * k, h = img.naturalHeight * k;
    c.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    URL.revokeObjectURL(url);
    if (mode !== 'place') {
      const d = c.getImageData(0, 0, W, H);
      for (let i = 0; i < d.data.length; i += 4) {
        const r = d.data[i], g = d.data[i + 1], b = d.data[i + 2];
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        if (max > 200 && max - min < 38) d.data[i + 3] = 0; // white or grey paper
      }
      c.putImageData(d, 0, 0);
    }
    setBlank(false);
  };

  const done = () => {
    let out = canvas.current!;
    if (mode === 'character') {
      // trim to the drawing so the character fills its spot in a scene
      const d = ctx().getImageData(0, 0, W, H).data;
      let x0 = W, y0 = H, x1 = 0, y1 = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 12) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      if (x1 > x0 && y1 > y0) {
        const pad = 12;
        const t = document.createElement('canvas');
        t.width = x1 - x0 + pad * 2; t.height = y1 - y0 + pad * 2;
        t.getContext('2d')!.drawImage(out, x0 - pad, y0 - pad, t.width, t.height, 0, 0, t.width, t.height);
        out = t;
      }
    }
    onDone(out.toDataURL('image/png'), name.trim() || DEFAULT_NAME[mode]);
  };

  return (
    <Sheet open={open} onClose={onClose} title={TITLE[mode]} wide>
      <div className="sheet-body dpad">
        <div className={cx('dpad-board', mode !== 'place' && 'is-clear', wear && 'is-wear')} style={{ aspectRatio: `${W} / ${H}`, width: `min(100%, calc(62vh * ${(W / H).toFixed(3)}))` }}>
          {wear && guide && <div className="dpad-guide" aria-hidden="true" dangerouslySetInnerHTML={{ __html: guide }} />}
          <canvas ref={canvas} width={W} height={H} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up} aria-label="Drawing area" data-testid="draw-canvas" />
          {blank && <p className="dpad-hint">{HINT[mode]}</p>}
        </div>
        <div className="dpad-tools">
          <div className="dpad-colours" role="radiogroup" aria-label="Colour">
            {COLOURS.map((c) => <button key={c} type="button" className="dpad-colour" style={{ background: c }} aria-pressed={!erase && colour === c} aria-label={`Colour ${c}`} onClick={() => { setColour(c); setErase(false); }} />)}
          </div>
          <div className="lab-row">
            {SIZES.map((s) => <button key={s} type="button" className="dpad-size" aria-pressed={size === s} aria-label={`Brush size ${s}`} onClick={() => setSize(s)}><i style={{ width: Math.max(4, s * 0.9), height: Math.max(4, s * 0.9) }} /></button>)}
            <button type="button" className={cx('lab-chip')} aria-pressed={erase} onClick={() => setErase((v) => !v)}>Eraser</button>
            <button type="button" className="lab-chip" onClick={undo}><Icon name="undo" size={14} /> Undo</button>
            <button type="button" className="lab-chip" onClick={reset}>Clear</button>
            <button type="button" className="lab-chip" onClick={() => file.current?.click()} data-testid="draw-upload"><Icon name="image" size={14} /> Upload a drawing</button>
            <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void upload(f); }} />
          </div>
          <label className="field"><span>{mode === 'place' ? 'Name this place' : mode === 'character' ? 'Name this character' : 'Name it'}</span><input value={name} onChange={(e) => setName(e.target.value)} data-testid="draw-name" /></label>
          <p className="lab-hint">{mode === 'place' ? 'Your drawing becomes the background for any page you choose.' : mode === 'character' ? 'Uploading a photo of a paper drawing? The white paper is removed so just the character is left.' : 'Anyone in the story can wear it. Uploading a paper drawing? The white paper is removed.'}</p>
          <div className="lab-row">
            <button type="button" className="btn btn-primary" onClick={done} disabled={blank} data-testid="draw-done">{mode === 'place' ? 'Use this place' : mode === 'character' ? 'Add to the story' : 'Put it on'}</button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
