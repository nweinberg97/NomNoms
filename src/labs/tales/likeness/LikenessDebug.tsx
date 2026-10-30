import React, { useEffect, useRef, useState } from 'react';
import { LabsHeader } from '../../LabsHeader';
import { characterSvg, FACE_VIEWBOX, fitViewBox, type Kind, type Look } from '../character';
import { STYLE_MODES, STYLES } from '../styles';
import { openPhoto, readFace, type Reading } from './detect';
import { applyDNA, buildDNA, serializeDNA, type CharacterDNA } from './dna';
import { SHAPE_KEYS, type Measurement } from './measure';

/**
 * Developer diagnostics for photo → character. Not linked from the app.
 * Everything stays in this tab: the photo is read locally, nothing is
 * uploaded, logged or saved, and "Clear" wipes the pixels.
 */

const BASE: Look = { kind: 'adult', skin: '#efc19f', hair: '#5a3b26', hairStyle: 'short', eyes: '#5a3a22', outfit: 'tee', hat: 'none', glasses: 'none', extra: 'none', expression: 'smile' };

interface Run { reading: Reading; dna: CharacterDNA; look: Look; text: string }

export function LikenessDebug() {
  const [kind, setKind] = useState<Kind>('adult');
  const [file, setFile] = useState<File | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [err, setErr] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [layers, setLayers] = useState({ mesh: true, person: true, hair: true, regions: true });
  const canvas = useRef<HTMLCanvasElement>(null);
  const run = runs[runs.length - 1];

  const go = async (f: File, k: Kind = kind) => {
    setBusy(true); setErr(undefined);
    try {
      const raster = await openPhoto(f);
      const reading = await readFace(raster, { keepForDebug: true });
      const dna = buildDNA(reading.measurements, k);
      setRuns((rs) => [...rs.slice(-1), { reading, dna, look: applyDNA({ ...BASE, kind: k }, dna), text: serializeDNA(dna) }]);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const clear = () => {
    for (const r of runs) { r.reading.debug?.raster.data.fill(0); r.reading.debug?.person?.fill(0); }
    setRuns([]); setFile(null);
    const c = canvas.current; if (c) { c.width = 0; c.height = 0; }
  };
  useEffect(() => () => clear(), []); // eslint-disable-line react-hooks/exhaustive-deps
  // for the developer test bench: read a photo (a data URL) and return what was measured, without the pixels
  useEffect(() => {
    const w = window as unknown as { __lkdRead?: (url: string) => Promise<unknown> };
    w.__lkdRead = async (url: string) => {
      const blob = await (await fetch(url)).blob();
      const reading = await readFace(await openPhoto(new File([blob], 'x')), {});
      const { debug, ...m } = reading.measurements;
      return { ...m, extra: debug.extra, look: applyDNA({ ...BASE }, buildDNA(reading.measurements, 'adult')) };
    };
    return () => { delete w.__lkdRead; };
  }, []);

  useEffect(() => {
    const c = canvas.current, d = run?.reading.debug;
    if (!c || !d) return;
    const { raster, person } = d, m = run.reading.measurements.debug;
    c.width = raster.w; c.height = raster.h;
    const x = c.getContext('2d')!;
    const img = new ImageData(new Uint8ClampedArray(raster.data), raster.w, raster.h);
    for (let i = 0; i < raster.w * raster.h; i++) {
      const o = i * 4;
      if (layers.person && person && person[i] <= 127) { img.data[o] *= 0.45; img.data[o + 1] *= 0.45; img.data[o + 2] = img.data[o + 2] * 0.45 + 60; }
      if (layers.hair && m.hairPixels?.[i]) { img.data[o] = 255; img.data[o + 1] *= 0.4; img.data[o + 2] *= 0.4; }
    }
    x.putImageData(img, 0, 0);
    const lw = Math.max(1, raster.w / 360);
    const poly = (pts: number[][], colour: string, close = true) => { x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); if (close) x.closePath(); x.strokeStyle = colour; x.lineWidth = lw; x.stroke(); };
    const circle = (cx: number, cy: number, r: number, colour: string) => { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.strokeStyle = colour; x.lineWidth = lw; x.stroke(); };
    if (d.box) { x.strokeStyle = '#ffd400'; x.lineWidth = lw * 1.5; x.strokeRect(d.box[0], d.box[1], d.box[2], d.box[3]); }
    if (layers.mesh && d.mesh) { x.fillStyle = 'rgba(0,255,170,.8)'; for (const p of d.mesh) x.fillRect(p[0] - lw / 2, p[1] - lw / 2, lw, lw); }
    poly(m.oval, '#00e5ff');
    m.skinPatches.forEach((p) => circle(p.x, p.y, p.r, '#ff9f1c'));
    m.irises.forEach((p) => circle(p.x, p.y, p.r, '#ff4fd8'));
    if (layers.regions) {
      x.font = `${Math.round(11 * lw)}px sans-serif`;
      m.regions.forEach((r) => { poly(r.poly, 'rgba(255,255,255,.75)'); x.fillStyle = '#fff'; x.fillText(r.name, r.poly[0][0] + 3, r.poly[0][1] + 12 * lw); });
    }
  }, [run, layers]);

  const meas = run?.reading.measurements;
  const row = (key: string, m: Measurement<unknown>) => (
    <tr key={key} className={`is-${m.status}`}>
      <td>{key}</td><td>{m.status}</td>
      <td>{m.value === undefined ? '—' : typeof m.value === 'object' ? JSON.stringify(m.value) : String(m.value)}</td>
      <td>{m.raw ?? ''}</td><td>{m.average ?? ''}</td><td>{m.confidence}</td><td>{m.why ?? ''}</td>
    </tr>
  );
  const same = runs.length === 2 ? runs[0].text === runs[1].text : undefined;

  return (
    <div className="labs lkd">
      <LabsHeader title="Likeness diagnostics" />
      <main className="lab-main">
        <p className="lab-sub">Developer view for photo → character. The photo is read in this tab only; nothing is uploaded, logged or saved. Use photos you have the right to use, and test with adults.</p>
        <div className="lab-row">
          <label className="btn btn-primary btn-sm">Choose a photo<input type="file" accept="image/*" hidden data-testid="lkd-file" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { clear(); setFile(f); void go(f); } }} /></label>
          <select value={kind} onChange={(e) => { const k = e.target.value as Kind; setKind(k); if (file) void go(file, k); }} aria-label="Who this is">
            {(['baby', 'kid', 'adult', 'elder'] as Kind[]).map((k) => <option key={k}>{k}</option>)}
          </select>
          <button type="button" className="btn btn-ghost btn-sm" disabled={!file || busy} onClick={() => file && go(file)} data-testid="lkd-again">Run again</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={clear}>Clear</button>
          {busy && <span data-testid="lkd-busy">Reading…</span>}
        </div>
        {err && <p className="lab-status" role="alert">{err}</p>}
        {same !== undefined && <p data-testid="lkd-same" className={same ? 'lkd-ok' : 'lkd-bad'}>Two runs, same DNA: {same ? 'yes' : 'NO — investigate'}</p>}
        {run && meas && (
          <>
            <div className="lab-chips">{(Object.keys(layers) as (keyof typeof layers)[]).map((k) => <button key={k} type="button" className="lab-chip" aria-pressed={layers[k]} onClick={() => setLayers((l) => ({ ...l, [k]: !l[k] }))}>{k}</button>)}</div>
            <div className="lkd-grid">
              <canvas ref={canvas} className="lkd-canvas" data-testid="lkd-canvas" />
              <div className="lkd-chars">
                {STYLE_MODES.map((s) => <figure key={s}><span dangerouslySetInnerHTML={{ __html: characterSvg(run.look, { style: s, viewBox: fitViewBox(FACE_VIEWBOX, run.look, s) }) }} /><figcaption>{STYLES[s].name}</figcaption></figure>)}
                <figure><span dangerouslySetInnerHTML={{ __html: characterSvg({ ...BASE, kind }, { viewBox: fitViewBox(FACE_VIEWBOX, BASE) }) }} /><figcaption>Before (no photo)</figcaption></figure>
              </div>
            </div>
            <p className="lkd-key">Yellow box: detector · green: 478 landmarks · cyan: face outline · orange: skin patches · pink: irises · white: hair regions · red: pixels read as hair · dimmed blue: not the person</p>
            <h3>Detection</h3>
            <pre data-testid="lkd-quality">{JSON.stringify({ ...meas.quality, backend: run.reading.debug?.backend, ms: run.reading.debug?.ms }, null, 1)}</pre>
            <h3>Warnings</h3>
            {meas.warnings.length ? <ul data-testid="lkd-warnings">{meas.warnings.map((w) => <li key={w}>{w}</li>)}</ul> : <p>None.</p>}
            <h3>Measurements</h3>
            <div className="lkd-table"><table data-testid="lkd-table">
              <thead><tr><th>trait</th><th>status</th><th>value</th><th>raw</th><th>average</th><th>conf.</th><th>why</th></tr></thead>
              <tbody>
                {SHAPE_KEYS.map((k) => row(k, meas.shape[k]))}
                {(['skin', 'hair', 'eyes', 'hairLength', 'hairVolume', 'hairTexture', 'bangs', 'facialHair', 'glasses'] as const).map((k) => row(k, meas[k] as Measurement<unknown>))}
              </tbody>
            </table></div>
            <h3>Character DNA</h3>
            <pre data-testid="lkd-dna">{JSON.stringify(JSON.parse(run.text), null, 1)}</pre>
            <h3>What the renderer gets</h3>
            <pre data-testid="lkd-look">{JSON.stringify({ kind: run.look.kind, skin: run.look.skin, hair: run.look.hair, hairStyle: run.look.hairStyle, eyes: run.look.eyes, facial: run.look.facial, shape: run.look.shape }, null, 1)}</pre>
          </>
        )}
      </main>
    </div>
  );
}
