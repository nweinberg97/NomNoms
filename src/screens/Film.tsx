import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BackLink, Shell } from '../components/Shell';
import { Icon } from '../components/Icon';
import { MediaImg } from '../components/Media';
import { Segmented, Spinner, toast } from '../components/ui';
import { downloadBlob } from '../export/offscreen';
import {
  FILM_H, FILM_LENGTHS, FILM_W, buildTimeline, drawFrame, loadAssets, pickRecorderType, timelineMemoryIds, type FilmLength,
} from '../export/film';
import { MUSIC_STYLES, decodeSong, renderMusic, type MusicStyle } from '../export/music';
import type { FilmPrefs } from '../lib/types';
import { cx, firstName, fmtDuration, fmtShort } from '../lib/util';
import { MediaService } from '../services/media/MediaService';
import { useApp } from '../state/store';

type MusicChoice = MusicStyle | 'own' | 'none';
const DEFAULTS: FilmPrefs = { length: 'medium', music: 'lullaby', excluded: [] };

/**
 * The film: the same story as the book, told as a short movie. Parents pick a
 * length, a soundtrack (built-in or their own song), and which moments are in
 * it. Settings are remembered. Saved videos include the music.
 */
export function Film() {
  const { baby, book, memories, media, prefs, savePrefs, ingest } = useApp();
  const film: FilmPrefs = { ...DEFAULTS, ...prefs.film };
  const memMap = useMemo(() => new Map(memories.map((m) => [m.id, m])), [memories]);
  const tl = useMemo(
    () => (baby ? buildTimeline(baby, book, memories, media, { length: film.length as FilmLength, excluded: film.excluded }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [baby, book, memories, media, film.length, film.excluded.join(',')],
  );
  const canvas = useRef<HTMLCanvasElement>(null);
  const assets = useRef<Awaited<ReturnType<typeof loadAssets>> | null>(null);
  const [loading, setLoading] = useState(0);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [recording, setRecording] = useState(false);
  const [musicBusy, setMusicBusy] = useState(false);
  const tRef = useRef(0);
  const raf = useRef(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const songInput = useRef<HTMLInputElement>(null);
  const musicToken = useRef(0);
  const playingRef = useRef(false);

  // audio
  const audio = useRef<{ ac: AudioContext; master: GainNode; buffer?: AudioBuffer; src?: AudioBufferSourceNode; key?: string } | null>(null);
  const ownSong = film.ownSongMediaId ? media.get(film.ownSongMediaId) : undefined;
  const musicKey = `${film.music}:${film.ownSongMediaId ?? ''}:${Math.ceil(tl?.duration ?? 0)}`;

  const setFilm = (patch: Partial<FilmPrefs>) => void savePrefs({ film: { ...film, ...patch } });

  /* ── load pictures ── */
  useEffect(() => {
    if (!tl) return;
    let alive = true;
    setReady(false);
    stopAll();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tl]);

  /* ── music buffer for the current choice ── */
  const getMusic = async (): Promise<AudioBuffer | undefined> => {
    if (!tl || film.music === 'none') return undefined;
    if (audio.current?.buffer && audio.current.key === musicKey) return audio.current.buffer;
    setMusicBusy(true);
    try {
      let buf: AudioBuffer | undefined;
      if (film.music === 'own') {
        if (!ownSong) return undefined;
        const url = await MediaService.urlFor(ownSong, 'full');
        if (!url) return undefined;
        buf = await decodeSong(await (await fetch(url)).blob());
      } else buf = await renderMusic(film.music as MusicStyle, tl.duration);
      if (audio.current) {
        audio.current.buffer = buf;
        audio.current.key = musicKey;
      }
      return buf;
    } catch (e) {
      console.error(e);
      toast('That song couldn’t be played. Try another file, or a built-in track.', { icon: 'x', ms: 4200 });
      return undefined;
    } finally {
      setMusicBusy(false);
    }
  };

  const ensureAudio = () => {
    if (!audio.current) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ac = new AC();
      const master = ac.createGain();
      master.connect(ac.destination);
      audio.current = { ac, master };
    }
    return audio.current;
  };

  /** Start the soundtrack in sync with the picture. `from` is read after the music is ready, so it never drifts. */
  const startMusic = async (fromArg?: number) => {
    const a = ensureAudio();
    await a.ac.resume().catch(() => undefined);
    stopMusic();
    const token = ++musicToken.current;
    const buf = await getMusic();
    if (!buf || !tl || token !== musicToken.current) return;
    if (fromArg === undefined && !playingRef.current) return;
    const from = fromArg ?? tRef.current;
    const src = a.ac.createBufferSource();
    src.buffer = buf;
    src.connect(a.master);
    // own songs get the same gentle fade out as the end card
    const now = a.ac.currentTime;
    a.master.gain.cancelScheduledValues(now);
    a.master.gain.setValueAtTime(film.music === 'own' ? 0.85 : 1, now);
    const endAt = now + Math.max(0, tl.duration - from);
    if (film.music === 'own') {
      a.master.gain.setValueAtTime(0.85, Math.max(now, endAt - 3.5));
      a.master.gain.linearRampToValueAtTime(0, endAt);
    }
    src.start(now, Math.min(from, buf.duration - 0.05));
    a.src = src;
  };
  const stopMusic = () => {
    musicToken.current++;
    try {
      audio.current?.src?.stop();
    } catch {
      /* already stopped */
    }
    if (audio.current) audio.current.src = undefined;
  };
  function stopAll() {
    playingRef.current = false;
    setPlaying(false);
    stopMusic();
    assets.current?.vids.forEach((v) => v.pause());
  }

  /* ── animation loop ── */
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
        stopAll();
        if (recRef.current && recRef.current.state === 'recording') recRef.current.stop();
        return;
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, tl]);

  // restart music when the choice changes mid-play
  useEffect(() => {
    if (playingRef.current) void startMusic();
    else stopMusic();
    // render built-in tracks ahead of time so play is instant
    if (tl && film.music !== 'none' && film.music !== 'own') void renderMusic(film.music as MusicStyle, tl.duration).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musicKey]);

  useEffect(() => () => {
    stopAll();
    if (recRef.current?.state === 'recording') recRef.current.stop();
    void audio.current?.ac.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!baby || !tl) return null;

  const seek = (v: number) => {
    tRef.current = v;
    setT(v);
    const ctx = canvas.current?.getContext('2d');
    if (ctx && assets.current) drawFrame(ctx, tl, v, assets.current);
    if (playingRef.current) void startMusic();
  };

  const toggle = async () => {
    if (!ready) return;
    if (playing) {
      stopAll();
      return;
    }
    if (tRef.current >= tl.duration - 0.05) seek(0);
    playingRef.current = true;
    setPlaying(true);
    void startMusic();
  };

  const record = async () => {
    const c = canvas.current;
    const type = pickRecorderType();
    if (!c || !('captureStream' in c) || !type) {
      toast('Saving video isn’t supported in this browser. Try Chrome, Edge or Safari 18+.', { icon: 'x', ms: 4800 });
      return;
    }
    const stream = (c as HTMLCanvasElement).captureStream(30);
    const a = ensureAudio();
    if (film.music !== 'none') {
      const dest = a.ac.createMediaStreamDestination();
      a.master.connect(dest);
      dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
    }
    const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 6_000_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = async () => {
      setRecording(false);
      recRef.current = null;
      if (tRef.current < tl.duration - 0.2) return toast('Recording stopped', { icon: 'x' });
      const ext = type.includes('mp4') ? 'mp4' : 'webm';
      const ok = await downloadBlob(new Blob(chunks, { type: type.split(';')[0] }), `${firstName(baby.name)}-film.${ext}`);
      if (ok) toast(`Saved your film (.${ext})`, { icon: 'download' });
    };
    recRef.current = rec;
    await getMusic();
    seek(0);
    playingRef.current = true;
    await startMusic(0);
    rec.start(500);
    setRecording(true);
    setPlaying(true);
  };

  const pickSong = async (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith('audio') && !/\.(mp3|m4a|aac|wav|ogg)$/i.test(f.name)) {
      toast('Choose a song file (MP3, M4A, WAV).', { icon: 'x' });
      return;
    }
    const [item] = await ingest([new File([f], f.name, { type: f.type || 'audio/mpeg' })]);
    setFilm({ music: 'own', ownSongMediaId: item.id, ownSongName: f.name.replace(/\.[^.]+$/, '') });
    toast('Your song is in the film', { icon: 'check' });
  };

  const inFilm = timelineMemoryIds(tl).map((id) => memMap.get(id)).filter(Boolean);
  const removed = film.excluded.map((id) => memMap.get(id)).filter(Boolean);
  const shot = tl.shots.find((s) => t >= s.start && t < s.start + s.dur);
  const musicOptions: { value: MusicChoice; label: string; sub: string }[] = [
    ...(Object.keys(MUSIC_STYLES) as MusicStyle[]).map((k) => ({ value: k as MusicChoice, label: MUSIC_STYLES[k].label, sub: MUSIC_STYLES[k].mood })),
    { value: 'own', label: ownSong ? film.ownSongName || 'Your song' : 'Your song', sub: ownSong ? 'Tap again to change' : 'MP3 or M4A file' },
    { value: 'none', label: 'No music', sub: 'Silent' },
  ];

  return (
    <Shell>
      <div className="film">
        <div className="film-head">
          <BackLink to="/book" label="Book" />
        </div>
        <div className="film-title reveal">
          <p className="eyebrow">The film · {fmtDuration(tl.duration)}</p>
          <h1 className="display">{book?.subtitle ?? `${firstName(baby.name)}’s story`}</h1>
        </div>

        <div className="film-screen reveal reveal-1" onClick={toggle}>
          <canvas ref={canvas} width={FILM_W} height={FILM_H} />
          {!ready && <div className="film-loading"><Spinner size={22} /><span>Gathering {Math.round(loading * 100)}%</span></div>}
          {ready && !playing && <button className="film-play" aria-label="Play film" data-testid="film-play"><Icon name="play" size={26} filled stroke={0} /></button>}
          {recording && <span className="film-rec"><i /> Recording</span>}
          {musicBusy && <span className="film-music-busy"><Spinner size={14} /> Preparing music</span>}
        </div>

        <div className="film-controls">
          <button className="icon-btn" onClick={toggle} disabled={!ready || recording} aria-label={playing ? 'Pause' : 'Play'}><Icon name={playing ? 'pause' : 'play'} filled={!playing} /></button>
          <span className="film-time">{fmtDuration(t)}</span>
          <input type="range" min={0} max={tl.duration} step={0.05} value={t} onChange={(e) => seek(Number(e.target.value))} disabled={!ready || recording} aria-label="Seek" />
          <span className="film-time">{fmtDuration(tl.duration)}</span>
        </div>
        <p className="muted film-now">{shot && 'title' in shot && shot.title ? shot.title : ' '}</p>

        <section className="film-section">
          <h2 className="film-h">Length</h2>
          <Segmented<FilmLength> value={film.length as FilmLength} onChange={(v) => !recording && setFilm({ length: v })} options={(Object.keys(FILM_LENGTHS) as FilmLength[]).map((k) => ({ value: k, label: FILM_LENGTHS[k].label }))} />
        </section>

        <section className="film-section">
          <h2 className="film-h">Music</h2>
          <div className="film-music">
            {musicOptions.map((o) => (
              <button
                key={o.value}
                className={cx('film-track', film.music === o.value && 'is-on')}
                disabled={recording}
                onClick={() => (o.value === 'own' && (!ownSong || film.music === 'own') ? songInput.current?.click() : setFilm({ music: o.value }))}
                data-testid={`music-${o.value}`}
              >
                <span className="film-track-icon"><Icon name={o.value === 'none' ? 'x' : o.value === 'own' ? 'mic' : 'sparkle'} size={16} /></span>
                <strong>{o.label}</strong>
                <small>{o.sub}</small>
              </button>
            ))}
          </div>
          <input ref={songInput} type="file" accept="audio/*,.mp3,.m4a,.wav" hidden onChange={(e) => { void pickSong(e.target.files?.[0]); e.target.value = ''; }} data-testid="song-input" />
          <p className="muted small">The built-in tracks are composed by NomNoms and free to share. Spotify songs can’t be saved into videos, but you can use a song file you own.</p>
        </section>

        <section className="film-section">
          <h2 className="film-h">Moments in the film <span className="muted">· {inFilm.length}</span></h2>
          <div className="film-moments">
            {inFilm.map((m) => (
              <div key={m!.id} className="film-moment">
                <div className="film-moment-photo"><MediaImg id={m!.mediaIds.find((id) => media.get(id)?.kind !== 'audio')} size="thumb" /></div>
                <span><strong>{m!.title ?? 'A moment'}</strong><small>{fmtShort(m!.date)}</small></span>
                <button className="icon-btn" onClick={() => setFilm({ excluded: [...film.excluded, m!.id] })} disabled={recording} aria-label={`Take ${m!.title ?? 'this moment'} out of the film`} data-testid="moment-remove"><Icon name="x" size={16} /></button>
              </div>
            ))}
          </div>
          {removed.length > 0 && (
            <div className="film-removed">
              <p className="muted small">Taken out. Tap to put back:</p>
              <div className="chips">
                {removed.map((m) => (
                  <button key={m!.id} className="chip is-dashed" onClick={() => setFilm({ excluded: film.excluded.filter((x) => x !== m!.id) })} data-testid="moment-restore">
                    <Icon name="plus" size={13} /> {m!.title ?? fmtShort(m!.date)}
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="muted small">When you take a moment out, the next-best one from that chapter takes its place.</p>
        </section>

        <div className="film-actions">
          {recording ? (
            <button className="btn btn-ghost" onClick={() => recRef.current?.stop()}><Icon name="stop" size={15} filled /> Stop recording</button>
          ) : (
            <button className="btn btn-primary btn-lg" onClick={record} disabled={!ready} data-testid="film-save"><Icon name="download" size={16} /> Save the film as a video</button>
          )}
          <p className="muted small">Saving plays the film once through ({fmtDuration(tl.duration)}) while it records, music included.</p>
        </div>
      </div>
    </Shell>
  );
}
