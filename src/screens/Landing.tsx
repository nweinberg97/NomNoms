import React, { useMemo, useState } from 'react';
import { BookPageView, type PageContext } from '../book/BookPageView';
import { AppleMark, GoogleMark, Icon, Wordmark } from '../components/Icon';
import { MediaImg } from '../components/Media';
import { fmtDuration } from '../lib/util';
import { toast, Spinner } from '../components/ui';
import { buildDemoSeed } from '../data/seed';
import { ComingSoonSection } from './ComingSoon';
import { navigate } from '../lib/router';
import type { BookPage } from '../lib/types';
import { authConfig } from '../services/auth/AuthService';
import { useApp } from '../state/store';

export function Landing() {
  const { signIn, loadDemoFamily } = useApp();
  const [busy, setBusy] = useState<string>();

  const go = async (p: 'google' | 'apple' | 'demo') => {
    setBusy(p);
    try {
      const { hasBaby } = await signIn(p);
      if (p === 'demo' && !hasBaby) await loadDemoFamily();
      if ((p === 'google' && !authConfig.googleEnabled) || (p === 'apple' && !authConfig.appleEnabled)) {
        toast('Demo mode — sign-in isn’t configured yet, so you’re in a private account on this device.', { icon: 'lock', ms: 5200 });
      }
      navigate('/home', { replace: true });
    } catch (e) {
      toast((e as Error).message || 'Sign-in didn’t complete', { icon: 'x' });
    } finally {
      setBusy(undefined);
    }
  };

  const preview = useMemo(() => {
    const seed = buildDemoSeed();
    const memories = new Map(seed.memories.map((m) => [m.id, m]));
    const media = new Map(seed.media.map((m) => [m.id, m]));
    const byTitle = (t: string) => seed.memories.find((m) => m.title === t)!;
    const smile = byTitle('First smile');
    const snow = byTitle('First snow');
    const pages: BookPage[] = [
      { id: 'p1', layout: 'milestone', memoryIds: [smile.id], mediaIds: [smile.mediaIds[0]] },
      { id: 'p2', layout: 'four-grid', memoryIds: [snow.id], mediaIds: snow.mediaIds },
      { id: 'p3', layout: 'cover', memoryIds: [], mediaIds: ['m-morning-04'], title: 'Juno', subtitle: 'Our First Year', text: 'September 2025 — September 2026' },
    ];
    const ctx: PageContext = { memories, media, interactive: false };
    const laugh = byTitle('First laugh');
    const video = media.get(laugh.mediaIds[0])!;
    return { pages, ctx, laugh, video };
  }, []);

  return (
    <div className="landing">
      <header className="landing-top">
        <Wordmark size={21} />
        <button className="link-btn" onClick={() => go('demo')} disabled={!!busy}>Explore the demo</button>
      </header>

      <section className="landing-hero">
        <div className="landing-copy">
          <p className="eyebrow reveal">A baby book that builds itself</p>
          <h1 className="display landing-title reveal reveal-1">
            Live the moments.<br /><em>We’ll make the book.</em>
          </h1>
          <p className="landing-sub reveal reveal-2">
            Snap a photo, jot a line, save a first. NomNoms quietly turns it all into a beautiful, chaptered baby book you can read, share and print.
          </p>
          <div className="landing-ctas reveal reveal-3">
            <button className="btn btn-auth" onClick={() => go('google')} disabled={!!busy} data-testid="signin-google">
              {busy === 'google' ? <Spinner /> : <GoogleMark />} Continue with Google
            </button>
            <button className="btn btn-auth is-dark" onClick={() => go('apple')} disabled={!!busy} data-testid="signin-apple">
              {busy === 'apple' ? <Spinner /> : <AppleMark />} Continue with Apple
            </button>
          </div>
          <p className="landing-fine reveal reveal-4"><Icon name="lock" size={14} /> Private by default. Nothing is shared unless you share it.</p>
        </div>

        <div className="landing-art" aria-hidden>
          {preview.pages.map((p, i) => (
            <div key={p.id} className={`landing-page lp-${i}`}>
              <BookPageView page={p} ctx={preview.ctx} />
            </div>
          ))}
          <figure className="landing-video">
            <div className="landing-video-frame">
              <MediaImg item={preview.video} eager />
              <span className="video-play"><span className="video-play-icon"><Icon name="play" size={12} filled stroke={0} /></span>{fmtDuration(preview.video.duration ?? 0)}</span>
            </div>
            <figcaption><strong>{preview.laugh.title}</strong><small>Videos go into the film</small></figcaption>
          </figure>
        </div>
      </section>

      <section className="landing-steps">
        {[
          ['camera', 'Capture', 'Take a photo or a ten-second video. Add a sentence if you like — or don’t.'],
          ['sparkle', 'It organizes itself', 'Moments fall into months, chapters and milestones. No folders, no tagging.'],
          ['book', 'A book you’ll keep', 'Editorial layouts, made for you. Read it here, share a private link, or download the PDF.'],
        ].map(([icon, t, d], i) => (
          <div key={t} className={`landing-step reveal reveal-${i + 3}`}>
            <span className="landing-step-icon"><Icon name={icon} size={20} /></span>
            <h3>{t}</h3>
            <p>{d}</p>
          </div>
        ))}
      </section>

      <div className="landing-soon"><ComingSoonSection /></div>

      <footer className="landing-foot">
        <span>You take care of the memories. NomNoms takes care of the book.</span>
        <small className="landing-credit">Demo photos from <a href="https://unsplash.com/?utm_source=nomnoms&utm_medium=referral" target="_blank" rel="noreferrer">Unsplash</a></small>
      </footer>
    </div>
  );
}
