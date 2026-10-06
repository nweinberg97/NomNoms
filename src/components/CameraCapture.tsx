import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cx, fmtDuration } from '../lib/util';
import { Icon } from './Icon';

/**
 * In-app camera using getUserMedia. Takes several photos in a row or records
 * a video, then hands real Files to the editor. Any failure (no camera,
 * denied permission, embedded frame) falls back to the device's native
 * camera/upload picker instead of breaking.
 */
export function CameraCapture({ mode, onClose, onDone, onFallback }: {
  mode: 'photo' | 'video';
  onClose: () => void;
  onDone: (files: File[]) => void;
  onFallback: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [error, setError] = useState<string>();
  const [ready, setReady] = useState(false);
  const [shots, setShots] = useState<{ file: File; url: string }[]>([]);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [flash, setFlash] = useState(false);
  /** The photo or clip just taken, shown full-screen to keep or retake. */
  const [review, setReview] = useState<{ file: File; url: string; kind: 'photo' | 'video' } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    (async () => {
      try {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1440 } },
          audio: mode === 'video',
        });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setReady(true);
      } catch (e) {
        setError((e as Error)?.name === 'NotAllowedError'
          ? 'Camera access was blocked. You can allow it in your browser settings, or use your device camera instead.'
          : "We couldn't open a camera here. You can use your device's camera or pick from your library instead.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [facing, mode]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    shots.forEach((s) => URL.revokeObjectURL(s.url));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!recording) return;
    const t0 = Date.now();
    const i = setInterval(() => setElapsed((Date.now() - t0) / 1000), 250);
    return () => clearInterval(i);
  }, [recording]);

  const snap = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext('2d')!;
    if (facing === 'user') {
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, 0, 0);
    setFlash(true);
    setTimeout(() => setFlash(false), 180);
    c.toBlob((b) => {
      if (!b) return;
      const file = new File([b], `nomnoms-${Date.now()}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
      setReview({ file, url: URL.createObjectURL(b), kind: 'photo' });
    }, 'image/jpeg', 0.92);
  };

  const toggleRecord = () => {
    if (recording) {
      recRef.current?.stop();
      return;
    }
    const stream = streamRef.current;
    if (!stream) return;
    const type = ['video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'].find((t) => MediaRecorder.isTypeSupported?.(t)) ?? '';
    const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    chunks.current = [];
    rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    rec.onstop = () => {
      setRecording(false);
      const mime = rec.mimeType || 'video/webm';
      const blob = new Blob(chunks.current, { type: mime });
      const ext = mime.includes('mp4') ? 'mp4' : 'webm';
      const file = new File([blob], `nomnoms-${Date.now()}.${ext}`, { type: mime, lastModified: Date.now() });
      setReview({ file, url: URL.createObjectURL(blob), kind: 'video' });
    };
    recRef.current = rec;
    rec.start(250);
    setElapsed(0);
    setRecording(true);
  };

  const retake = () => {
    if (review) URL.revokeObjectURL(review.url);
    setReview(null);
    // the preview <video> may have paused while hidden
    requestAnimationFrame(() => videoRef.current?.play().catch(() => undefined));
  };

  /** Keep this shot: with earlier kept shots ("Take another"), it goes straight to the editor. */
  const keep = (another: boolean) => {
    if (!review) return;
    const kept = [...shots.map((s) => s.file), review.file];
    if (another) {
      setShots((s) => [...s, { file: review.file, url: review.url }]);
      setReview(null);
      requestAnimationFrame(() => videoRef.current?.play().catch(() => undefined));
      return;
    }
    onDone(kept);
  };

  return createPortal(
    <div className="camera" role="dialog" aria-label={mode === 'photo' ? 'Camera' : 'Video camera'}>
      <div className="camera-top">
        <button className="camera-btn" onClick={onClose} aria-label="Close camera"><Icon name="x" /></button>
        {recording && <span className="camera-rec"><i />{fmtDuration(elapsed)}</span>}
        <button className="camera-btn" onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))} aria-label="Flip camera" disabled={recording || !!review}>
          <Icon name="flipcam" />
        </button>
      </div>

      <div className="camera-stage">
        <video ref={videoRef} playsInline muted className={cx(facing === 'user' && 'is-mirrored', ready && 'is-ready')} />
        {flash && <div className="camera-flash" />}
        {review && (
          <div className="camera-review" data-testid="camera-review">
            {review.kind === 'photo' ? (
              <img src={review.url} alt="The photo you just took" />
            ) : (
              <video src={review.url} autoPlay loop playsInline controls />
            )}
          </div>
        )}
        {error && (
          <div className="camera-error">
            <Icon name="camera" size={28} />
            <p>{error}</p>
            <button className="btn btn-light" onClick={onFallback}>Use device camera or library</button>
          </div>
        )}
      </div>

      {review ? (
        <div className="camera-bottom is-review">
          <button className="btn btn-ghost-dark" onClick={retake} data-testid="camera-retake"><Icon name="undo" size={16} /> Retake</button>
          {review.kind === 'photo' && (
            <button className="btn btn-ghost-dark" onClick={() => keep(true)} data-testid="camera-another"><Icon name="plus" size={16} /> Take another</button>
          )}
          <button className="btn btn-light" onClick={() => keep(false)} data-testid="camera-use">
            <Icon name="check" size={16} /> {review.kind === 'photo' ? (shots.length ? `Use ${shots.length + 1} photos` : 'Use photo') : 'Use video'}
          </button>
        </div>
      ) : (
      <div className="camera-bottom">
        <div className="camera-shots">
          {shots.slice(-3).map((s) => <img key={s.url} src={s.url} alt="" />)}
        </div>
        {mode === 'photo' ? (
          <button className="shutter" onClick={snap} disabled={!ready} aria-label="Take photo" data-testid="shutter"><span /></button>
        ) : (
          <button className={cx('shutter is-video', recording && 'is-recording')} onClick={toggleRecord} disabled={!ready} aria-label={recording ? 'Stop recording' : 'Start recording'}><span /></button>
        )}
        <div className="camera-done">
          {mode === 'photo' && shots.length > 0 && (
            <button className="btn btn-light" onClick={() => onDone(shots.map((s) => s.file))} data-testid="camera-done">
              Use {shots.length} <Icon name="arrow-right" size={16} />
            </button>
          )}
        </div>
      </div>
      )}
    </div>,
    document.body,
  );
}
