import React, { useEffect, useState } from 'react';
import { navigate, useRoute } from '../lib/router';
import { pendingCapture } from '../state/ui';
import { useApp } from '../state/store';
import { Icon } from './Icon';

/** Custom event the memory editor listens for, so drops while editing add to that memory. */
export const EDITOR_DROP_EVENT = 'nomnoms:drop-files';

function mediaFiles(dt: DataTransfer | null): File[] {
  return [...(dt?.files ?? [])].filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/') || /\.(heic|heif|jpe?g|png|webp|gif|mov|mp4|m4v)$/i.test(f.name));
}

/**
 * Drag photos or videos from anywhere — the Photos app (iCloud Photos on a
 * Mac), Finder, the desktop — and drop them on NomNoms. Outside the editor a
 * drop starts a new memory; inside the editor it adds to the one being edited.
 */
export function DropZone() {
  const { baby } = useApp();
  const { path } = useRoute();
  const [over, setOver] = useState(false);

  useEffect(() => {
    if (!baby) return;
    let depth = 0;
    const hasFiles = (e: DragEvent) => [...(e.dataTransfer?.types ?? [])].includes('Files');
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth++;
      setOver(true);
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (!depth) setOver(false);
    };
    const overFn = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setOver(false);
      const files = mediaFiles(e.dataTransfer);
      if (!files.length) return;
      const editing = path === '/new' || /^\/memory\/[^/]+\/edit$/.test(path);
      if (editing) {
        window.dispatchEvent(new CustomEvent(EDITOR_DROP_EVENT, { detail: files }));
      } else {
        pendingCapture.set({ files });
        navigate('/new');
      }
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', overFn);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragover', overFn);
      window.removeEventListener('drop', drop);
    };
  }, [baby, path]);

  if (!over) return null;
  return (
    <div className="dropzone" aria-hidden>
      <div className="dropzone-card">
        <Icon name="image" size={28} />
        <strong>Drop to add to NomNoms</strong>
        <span>Photos and videos from the Photos app, Finder or your desktop</span>
      </div>
    </div>
  );
}
