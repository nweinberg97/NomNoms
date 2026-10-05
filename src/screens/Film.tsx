import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BackLink, Shell } from '../components/Shell';
import { Icon } from '../components/Icon';
import { Segmented, Spinner, toast } from '../components/ui';
import { downloadBlob } from '../export/offscreen';
import { FILM_H, FILM_W, buildTimeline, drawFrame, loadAssets, pickRecorderType } from '../export/film';
import { firstName, fmtDuration } from '../lib/util';
import { useApp } from '../state/store';

export function Film() {
  const { baby, book, memories, media } = useApp();
  const [mode, setMode] = useState<'highlights' | 'full'>('highlights');
  const tl = useMemo(() => (baby ? buildTimeline(baby, book, memories, media, mode) : null), [baby, book, memories, media, mode]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const assets = useRef<Awaited<ReturnType<typeof loadAssets>> | null>(null);
  const [loading, setLoading] = useState(0);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [recording, setRecording] = useState(false);
  const tRef = useRef(0);
  const raf = useRef(0);
  const recRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    if (!tl) return;
    let alive = true;
    setReady(false);
    setPlaying(false);
    tRef.current = 0;
    setT(0);
    (async () => {
      await Promise.all([document.fonts?.load('400 60px Lora'), document.fonts?.load('italic 400 20px Lora'), document.fonts?.load('500 13px Inter')].map((p) => p?.catch(() => undefined)));
      const a = await loadAssets(tl, (p) => alive && setLoading(p));
      if (!alive) return;
      assets.current = a;
      setReady(true);
      const ctx = canvas.current?.getContext('2d');
      if (ctx) drawFrame(ctx, tl, 0.8, a);
    })();
    return () => {
      alive = false;
    };
  }, [tl]);

  useEffect(() => {
    if (!playing || !tl || !assets.current) return;
    const ctx = canvas.current!.getContext('2d')!;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      tRef.current = Math.min(tl.duration, tRef.current + dt);
      drawFrame(ctx, tl, tRef.current, assets.current!);
      setT(tRef.current);
      if (tRef.current >= tl.duration) {
        setPlaying(false);
        if (recRef.current && recRef.current.state === 'recording') recRef.current.stop();
        return;
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, tl]);

  useEffect(() => () => {
    assets.current?.vids.forEach((v) => v.pause());
    if (recRef.current?.state === 'recording') recRef.current.stop();
  }, []);

  if (!baby || !tl) return null;

  const seek = (v: number) => {
    tRef.current = v;
    setT(v);
    const ctx = canvas.current?.getContext('2d');
    if (ctx && assets.current) drawFrame(ctx, tl, v, assets.current);
  };

  const toggle = () => {
    if (!ready) return;
    if (tRef.current >= tl.duration - 0.05) seek(0);
    setPlaying((p) => !p);
  };

  const record = () => {
    const c = canvas.current;
    const type = pickRecorderType();
    if (!c || !('captureStream' in c) || !type) {
      toast('Saving video isn’t supported in this browser — try Chrome, Edge or Safari 18+.', { icon: 'x', ms: 4800 });
      return;
    }
    const stream = (c as HTMLCanvasElement).captureStream(30);
    const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 6_000_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      setRecording(false);
      recRef.current = null;
      if (tRef.current < tl.duration - 0.2) return toast('Recording cancelled', { icon: 'x' });
      const ext = type.includes('mp4') ? 'mp4' : 'webm';
      downloadBlob(new Blob(chunks, { type: type.split(';')[0] }), `${firstName(baby.name)}-memory-film.${ext}`);
      toast(`Saved your film as .${ext}`, { icon: 'download' });
    };
    recRef.current = rec;
    seek(0);
    rec.start(500);
    setRecording(true);
    setPlaying(true);
  };

  const shot = tl.shots.find((s) => t >= s.start && t < s.start + s.dur);

  return (
    <Shell>
      <div className="film">
        <div className="film-head">
          <BackLink to="/book" label="Book" />
          <Segmented size="sm" value={mode} onChange={(v) => !recording && setMode(v)} options={[{ value: 'highlights', label: 'Highlights' }, { value: 'full', label: 'Full film' }]} />
        </div>
        <div className="film-title reveal">
          <p className="eyebrow">Memory film · {fmtDuration(tl.duration)}</p>
          <h1 className="display">{book?.subtitle ?? 'Our story'}</h1>
        </div>

        <div className="film-screen reveal reveal-1" onClick={toggle}>
          <canvas ref={canvas} width={FILM_W} height={FILM_H} />
          {!ready && (
            <div className="film-loading"><Spinner size={22} /><span>Gathering {Math.round(loading * 100)}%</span></div>
          )}
          {ready && !playing && (
            <button className="film-play" aria-label="Play film"><Icon name="play" size={26} filled stroke={0} /></button>
          )}
          {recording && <span className="film-rec"><i /> Recording</span>}
        </div>

        <div className="film-controls">
          <button className="icon-btn" onClick={toggle} disabled={!ready || recording} aria-label={playing ? 'Pause' : 'Play'}><Icon name={playing ? 'pause' : 'play'} filled={!playing} /></button>
          <span className="film-time">{fmtDuration(t)}</span>
          <input type="range" min={0} max={tl.duration} step={0.05} value={t} onChange={(e) => seek(Number(e.target.value))} disabled={!ready || recording} aria-label="Seek" />
          <span className="film-time">{fmtDuration(tl.duration)}</span>
        </div>
        <p className="muted film-now">{shot && 'title' in shot && shot.title ? shot.title : ' '}</p>

        <div className="film-actions">
          {recording ? (
            <button className="btn btn-ghost" onClick={() => recRef.current?.stop()}><Icon name="stop" size={15} filled /> Cancel recording</button>
          ) : (
            <button className="btn btn-primary" onClick={record} disabled={!ready}><Icon name="download" size={16} /> Save as video</button>
          )}
          <p className="muted small">Recorded in your browser in real time ({fmtDuration(tl.duration)}). Soundtrack and server-quality MP4 rendering are on the roadmap.</p>
        </div>
      </div>
    </Shell>
  );
}
