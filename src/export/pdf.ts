import { PDFDocument } from 'pdf-lib';
import type { PageContext } from '../book/BookPageView';
import type { Book } from '../lib/types';
import { downloadBlob, rasterizePages } from './offscreen';

const PT_W = 576; // 8in
const PT_H = 720; // 10in

/**
 * Client-side PDF: every page is rendered by the real page component at
 * 1500×1875 (~190 dpi on an 8×10 page), embedded as a JPEG. Typography,
 * layouts, captions and chapter openers come out exactly as on screen.
 * A server-side renderer (vector text, print bleed) can replace this later.
 */
export async function exportBookPdf(book: Book, ctx: PageContext, onProgress?: (done: number, total: number) => void) {
  const pages = book.pages;
  const images = await rasterizePages(pages, ctx, { width: 1350, quality: 0.84, onProgress: (d, t) => onProgress?.(d, t + 1) });
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${book.title} — ${book.subtitle}`);
  pdf.setAuthor('NomNoms');
  pdf.setCreator('NomNoms');
  pdf.setProducer('NomNoms');
  for (const img of images) {
    const bytes = new Uint8Array(await img.arrayBuffer());
    const jpg = bytes[0] === 0xff && bytes[1] === 0xd8 ? await pdf.embedJpg(bytes) : await pdf.embedPng(bytes);
    const page = pdf.addPage([PT_W, PT_H]);
    page.drawImage(jpg, { x: 0, y: 0, width: PT_W, height: PT_H });
  }
  const bytes = await pdf.save();
  onProgress?.(pages.length + 1, pages.length + 1);
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const fname = `${book.title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-')}-${book.subtitle.replace(/\s+/g, '-')}.pdf`;
  await downloadBlob(blob, fname);
  return { blob, name: fname, pages: images.length };
}
