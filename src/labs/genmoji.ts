import type React from 'react';

/**
 * Catching a Genmoji typed into an editable box.
 *
 * On Apple devices with Apple Intelligence, a Genmoji inserted into a web page
 * arrives as an image (sometimes a <picture> with several sizes). This picks
 * the largest one the browser can open and returns its URL. The Genmoji stays
 * in this page's memory only; nothing is uploaded or saved.
 */
export async function catchGenmoji(box: HTMLElement): Promise<{ url: string; width: number; height: number } | null> {
  const urls: string[] = [];
  box.querySelectorAll('picture source').forEach((s) => {
    const u = (s.getAttribute('srcset') || '').trim().split(/\s+/)[0];
    if (u) urls.push(u);
  });
  box.querySelectorAll('img').forEach((i) => {
    const u = (i as HTMLImageElement).currentSrc || (i as HTMLImageElement).src;
    if (u) urls.push(u);
  });
  let best: { url: string; width: number; height: number } | null = null;
  for (const u of urls) {
    const img = await new Promise<HTMLImageElement | null>((res) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => res(null);
      i.src = u;
    });
    if (img && (!best || img.naturalWidth > best.width)) best = { url: u, width: img.naturalWidth, height: img.naturalHeight };
  }
  return best;
}

/** Image files pasted into the box (e.g. a Genmoji or sticker copied from Messages). */
export function pastedImage(e: ClipboardEvent | React.ClipboardEvent): File | null {
  const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'));
  return files[0] ?? null;
}
