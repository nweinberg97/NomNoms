import React, { useEffect, useRef, useState } from 'react';
import { cx, fmtDuration } from '../lib/util';
import { Icon } from './Icon';

/** Record a short voice note with MediaRecorder; shows a live level meter. */
export function VoiceRecorder({ onDone }: { onDone: (file: File) => void }) {
  const [state, setState] = useState<'idle' | 'recording' | 'done' | 'error'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>(Array(28).fill(0.08));
  const [file, setFile] = useState<File>();
  const [url, setUrl] = useState<string>();
  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const raf = useRef(0);

  useEffect(() => () => {
    cancelAnimationFrame(raf.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    if (url) URL.revokeObjectURL(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      const ac = new AudioContext();
      const an = ac.createAnalyser();
      an.fftSize = 64;
      ac.createMediaStreamSource(s).connect(an);
      const data = new Uint8Array(an.frequencyBinCount);
      const t0 = Date.now();
      const tick = () => {
        an.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length / 255;
        setLevels((l) => [...l.slice(1), Math.max(0.06, Math.min(1, avg * 2.2))]);
        setElapsed((Date.now() - t0) / 1000);
        raf.current = requestAnimationFrame(tick);
      };
      tick();
      const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported?.(t)) ?? '';
      const r = new MediaRecorder(s, type ? { mimeType: type } : undefined);
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      r.onstop = () => {
        cancelAnimationFrame(raf.current);
        s.getTracks().forEach((t) => t.stop());
        void ac.close();
        const mime = r.mimeType || 'audio/webm';
        const blob = new Blob(chunks, { type: mime });
        const f = new File([blob], `voice-${Date.now()}.${mime.includes('mp4') ? 'm4a' : 'webm'}`, { type: mime, lastModified: Date.now() });
        setFile(f);
        setUrl(URL.createObjectURL(blob));
        setState('done');
      };
      rec.current = r;
      r.start(250);
      setState('recording');
    } catch {
      setState('error');
    }
  };

  return (
    <div className="sheet-body voice">
      <div className={cx('voice-wave', state === 'recording' && 'is-live')}>
        {levels.map((l, i) => <span key={i} style={{ transform: `scaleY(${l})` }} />)}
      </div>
      <p className="voice-time">{fmtDuration(elapsed)}</p>
      {state === 'error' && <p className="muted center">We couldn't reach a microphone here. Check your browser's permission settings.</p>}
      {state === 'done' && url && <audio src={url} controls className="voice-preview" />}
      <div className="row-center" style={{ gap: 12, marginTop: 16 }}>
        {state === 'idle' || state === 'error' ? (
          <button className="btn btn-primary btn-lg" onClick={start}><Icon name="mic" size={18} /> Start recording</button>
        ) : state === 'recording' ? (
          <button className="btn btn-primary btn-lg" onClick={() => rec.current?.stop()}><Icon name="stop" size={16} filled /> Stop</button>
        ) : (
          <>
            <button className="btn btn-ghost" onClick={() => { setState('idle'); setElapsed(0); }}>Record again</button>
            <button className="btn btn-primary" onClick={() => file && onDone(file)}>Keep it <Icon name="arrow-right" size={16} /></button>
          </>
        )}
      </div>
    </div>
  );
}
