import React from 'react';
import { createRoot } from 'react-dom/client';
import { getFontEmbedCSS, toCanvas } from 'html-to-image';
import { BookPageView, type PageContext } from '../book/BookPageView';
import type { BookPage } from '../lib/types';

/**
 * Renders book pages off-screen with the exact same component the reader
 * uses, then rasterizes each one. Used for the PDF, memory cards and the film.
 */
export async function rasterizePages(
  pages: BookPage[],
  ctx: PageContext,
  opts: { width?: number; type?: 'image/jpeg' | 'image/png'; quality?: number; onProgress?: (done: number, total: number) => void } = {},
): Promise<Blob[]> {
  const width = opts.width ?? 1200;
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  Object.assign(host.style, { position: 'fixed', left: '-20000px', top: '0', width: `${width}px`, pointerEvents: 'none', zIndex: '-1' });
  document.body.appendChild(host);
  const root = createRoot(host);
  const out: Blob[] = [];
  let fontCSS: string | undefined;
  try {
    for (let i = 0; i < pages.length; i++) {
      await new Promise<void>((resolve) => {
        root.render(
          <div style={{ width }} className="raster-page">
            <BookPageView page={pages[i]} ctx={{ ...ctx, interactive: false }} />
          </div>,
        );
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      const node = host.firstElementChild as HTMLElement;
      await waitForImages(node);
      if (fontCSS === undefined) {
        try {
          fontCSS = await getFontEmbedCSS(node);
        } catch {
          fontCSS = '';
        }
      }
      const canvas = await toCanvas(node, {
        width,
        height: Math.round(width * 1.25),
        pixelRatio: 1,
        backgroundColor: '#fbf8f2',
        fontEmbedCSS: fontCSS || undefined,
        skipFonts: !fontCSS,
        cacheBust: false,
      });
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, opts.type ?? 'image/jpeg', opts.quality ?? 0.9));
      if (!blob) throw new Error('Could not render page ' + (i + 1));
      out.push(blob);
      opts.onProgress?.(i + 1, pages.length);
    }
  } finally {
    root.unmount();
    host.remove();
  }
  return out;
}

async function waitForImages(node: HTMLElement) {
  const imgs = [...node.querySelectorAll('img')];
  await Promise.all(
    imgs.map((img) =>
      img.complete && img.naturalWidth
        ? img.decode().catch(() => undefined)
        : new Promise<void>((res) => {
          img.onload = () => res();
          img.onerror = () => res();
          setTimeout(res, 6000);
        }),
    ),
  );
  // let the fade-in transition settle so pages aren't captured mid-fade
  node.querySelectorAll('.media-img').forEach((el) => el.classList.add('is-loaded'));
  await new Promise((r) => setTimeout(r, 40));
}

/**
 * Save a generated file. Inside a hosted artifact viewer, saves go through
 * the host's `downloads` capability (the viewer confirms); everywhere else
 * a normal browser download.
 */
export async function downloadBlob(blob: Blob, name: string): Promise<boolean> {
  const host = (window as unknown as { claude?: { use?: (n: string) => Promise<{ save: (r: { filename: string; data: Blob }) => Promise<unknown> } | null> } }).claude;
  if (host?.use) {
    const downloads = await host.use('downloads').catch(() => null);
    if (downloads) {
      try {
        await downloads.save({ filename: name, data: blob });
        return true;
      } catch {
        return false;
      }
    }
  }
  plainDownload(blob, name);
  return true;
}

function plainDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
