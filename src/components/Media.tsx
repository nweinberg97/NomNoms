import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { MediaItem } from '../lib/types';
import { cx, fmtDuration } from '../lib/util';
import { MediaService } from '../services/media/MediaService';
import { useAppOptional } from '../state/store';
import { Icon } from './Icon';

export function useMediaVersion() {
  return useSyncExternalStore(MediaService.subscribe, MediaService.getVersion);
}

export function useMediaItem(id?: string) {
  const app = useAppOptional();
  return id ? app?.media.get(id) : undefined;
}

/** Displayable URL for a media item (photo → image, video → poster). Re-renders when it resolves. */
export function useMediaUrl(item: MediaItem | undefined, size: 'full' | 'thumb' = 'full') {
  useMediaVersion();
  if (!item) return undefined;
  if (item.kind === 'video') return MediaService.posterUrl(item);
  const r = MediaService.peek(item);
  return size === 'thumb' ? r.thumb ?? r.full : r.full ?? r.thumb;
}

interface ImgProps {
  id?: string;
  item?: MediaItem;
  size?: 'full' | 'thumb';
  className?: string;
  alt?: string;
  style?: React.CSSProperties;
  eager?: boolean;
}

/** Photo (or video poster) that fades in once decoded. */
export function MediaImg({ id, item, size = 'full', className, alt = '', style, eager }: ImgProps) {
  const fromStore = useMediaItem(id);
  const it = item ?? fromStore;
  const url = useMediaUrl(it, size);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    setLoaded(false);
  }, [url]);
  useEffect(() => {
    if (ref.current?.complete && ref.current.naturalWidth) setLoaded(true);
  }, [url]);
  if (!url) return <div className={cx('media-ph', className)} style={style} />;
  return (
    <img
      ref={ref}
      src={url}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      onLoad={() => setLoaded(true)}
      className={cx('media-img', loaded && 'is-loaded', className)}
      style={style}
    />
  );
}

/** A video presented as part of the page: poster + play pill; plays inline on tap. */
export function VideoCard({ item, className, autoFocusPlay, compact }: { item: MediaItem; className?: string; autoFocusPlay?: boolean; compact?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [src, setSrc] = useState<string>();
  const poster = useMediaUrl(item);
  const vref = useRef<HTMLVideoElement>(null);

  const start = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = await MediaService.urlFor(item, 'full');
    setSrc(url);
    setPlaying(true);
    requestAnimationFrame(() => vref.current?.play().catch(() => undefined));
  };

  return (
    <div className={cx('video-card', playing && 'is-playing', compact && 'is-compact', className)} onClick={playing ? (e) => e.stopPropagation() : start}>
      {playing && src ? (
        <video
          ref={vref}
          src={src}
          poster={poster}
          controls
          playsInline
          autoPlay
          onEnded={() => setPlaying(false)}
        />
      ) : (
        <>
          <MediaImg item={item} />
          <button className="video-play" onClick={start} aria-label="Play video" autoFocus={autoFocusPlay}>
            <span className="video-play-icon"><Icon name="play" size={compact ? 12 : 14} filled stroke={0} /></span>
            {item.duration ? <span>{fmtDuration(item.duration)}</span> : null}
          </button>
        </>
      )}
    </div>
  );
}

export function AudioNote({ item }: { item: MediaItem }) {
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    void MediaService.urlFor(item).then(setSrc);
  }, [item]);
  return (
    <div className="audio-note">
      <Icon name="mic" size={18} />
      {src ? <audio src={src} controls preload="metadata" /> : <span className="muted">Loading voice note…</span>}
    </div>
  );
}
