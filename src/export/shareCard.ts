import type { PageContext } from '../book/BookPageView';
import type { BookPage, Memory } from '../lib/types';
import { downloadBlob, rasterizePages } from './offscreen';

/** Share one memory as a beautifully set page image (Web Share sheet on phones, download elsewhere). */
export async function shareMemory(m: Memory, ctx: PageContext): Promise<'shared' | 'downloaded'> {
  const photos = m.mediaIds.filter((id) => ctx.media.get(id)?.kind === 'photo' || ctx.media.get(id)?.kind === 'video');
  const isMs = !!m.milestoneId || m.type === 'milestone' || m.type === 'first';
  const page: BookPage = {
    id: 'share',
    layout: !photos.length ? 'quote' : isMs ? 'milestone' : (m.caption?.length ?? 0) > 200 ? 'story' : photos.length >= 2 ? 'two-up' : 'hero-caption',
    memoryIds: [m.id],
    mediaIds: photos.slice(0, 2),
  };
  if (page.layout === 'milestone' || page.layout === 'story' || page.layout === 'hero-caption') page.mediaIds = photos.slice(0, 1);
  const [blob] = await rasterizePages([page], ctx, { width: 1080, type: 'image/jpeg', quality: 0.92 });
  const name = `${(m.title ?? 'memory').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'memory'}.jpg`;
  const file = new File([blob], name, { type: 'image/jpeg' });
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: m.title ?? 'A memory' });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'shared';
    }
  }
  await downloadBlob(blob, name);
  return 'downloaded';
}
