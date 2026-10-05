import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookPageView } from '../book/BookPageView';
import { Icon } from '../components/Icon';
import { MediaImg } from '../components/Media';
import { navigate } from '../lib/router';
import type { Book } from '../lib/types';
import { cx, firstName, plural } from '../lib/util';
import { useApp } from '../state/store';

const STEPS = [
  'Gathering your memories…',
  'Finding the best photos…',
  'Organizing your chapters…',
  'Designing your pages…',
];

/**
 * The magic moment. Layout is deterministic and takes milliseconds, but the
 * sequence gives the parent a beat to watch their year come together.
 */
export function BuildBook() {
  const { baby, memories, media, buildBook } = useApp();
  const [step, setStep] = useState(0);
  const [book, setBook] = useState<Book>();
  const started = useRef(false);

  const photos = useMemo(() => {
    const ids = [...memories]
      .sort((a, b) => Number(b.favorite) - Number(a.favorite))
      .flatMap((m) => m.mediaIds)
      .filter((id) => media.get(id)?.kind !== 'audio');
    return ids.slice(0, 14);
  }, [memories, media]);

  useEffect(() => {
    if (started.current || !baby) return;
    started.current = true;
    let built: Book | undefined;
    void buildBook().then((b) => (built = b));
    const fast = memories.length < 4;
    const durations = fast ? [700, 600, 600, 700] : [1200, 1150, 1100, 1250];
    let t = 0;
    const timers = durations.map((d, i) => {
      t += d;
      return setTimeout(() => {
        if (i < STEPS.length - 1) setStep(i + 1);
        else {
          setStep(STEPS.length);
          setBook(built);
        }
      }, t);
    });
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baby]);

  // in case generation finished after the animation
  const { book: storeBook } = useApp();
  const ready = step >= STEPS.length;
  const finalBook = book ?? (ready ? storeBook : undefined);

  if (!baby) return null;
  const chapterCount = finalBook?.pages.filter((p) => p.layout === 'chapter').length ?? 0;
  const ctx = { memories: new Map(memories.map((m) => [m.id, m])), media, interactive: false };

  return (
    <div className={cx('magic', ready && 'is-ready')}>
      <button className="icon-btn magic-close" onClick={() => navigate('/book')} aria-label="Close"><Icon name="x" /></button>

      {!ready ? (
        <div className="magic-stage">
          <div className={`magic-photos step-${step}`} aria-hidden>
            {photos.map((id, i) => (
              <div key={id + i} className="magic-photo" style={{ transform: magicPos(i, photos.length, step), animationDelay: `${i * 70}ms`, zIndex: step === 1 && i % 3 === 2 ? 2 : undefined }}>
                <MediaImg id={id} size="thumb" eager />
              </div>
            ))}
          </div>
          <div className="magic-steps" role="status" aria-live="polite">
            {STEPS.map((s, i) => (
              <p key={s} className={cx('magic-step', i === step && 'is-current', i < step && 'is-done')}>
                <span className="magic-check">{i < step ? <Icon name="check" size={14} stroke={2.2} /> : <i />}</span>
                {s}
              </p>
            ))}
          </div>
        </div>
      ) : (
        <div className="magic-done">
          {finalBook && (
            <div className="magic-cover" onClick={() => navigate('/read')}>
              <BookPageView page={finalBook.pages[0]} ctx={ctx} />
            </div>
          )}
          <div className="magic-done-text">
            <p className="eyebrow">{firstName(baby.name)}’s book is ready</p>
            <h1 className="display">{finalBook?.subtitle ?? 'Your book'}</h1>
            <p className="muted">
              {finalBook ? `${plural(finalBook.pages.length, 'page')} · ${plural(chapterCount, 'chapter')} · ${plural(memories.length, 'memory', 'memories')}` : ''}
            </p>
            <div className="row" style={{ gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/read')} data-testid="open-book"><Icon name="book" size={18} /> Open the book</button>
              <button className="btn btn-ghost btn-lg" onClick={() => navigate('/book/edit')}>Edit pages</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Where each photo floats at each step: scattered → gathered → sorted into rows → stacked into a book. */
function magicPos(i: number, n: number, step: number) {
  const a = i - (n - 1) / 2;
  const unit = Math.min(1, window.innerWidth / 640);
  switch (step) {
    case 0:
      return `translate(calc(-50% + ${a * 38 * unit}px), calc(-50% + ${Math.sin(a * 1.7) * 60 * unit}px)) rotate(${a * 7}deg)`;
    case 1:
      return `translate(calc(-50% + ${a * 22 * unit}px), calc(-50% + ${(i % 3 === 2 ? -30 : Math.sin(a) * 16) * unit}px)) rotate(${a * 3}deg) scale(${i % 3 === 2 ? 1.12 : 1.04})`;
    case 2: {
      const col = (i % 5) - 2;
      const row = Math.floor(i / 5) - 1;
      return `translate(calc(-50% + ${col * 108 * unit}px), calc(-50% + ${row * 40 * unit}px)) scale(.82)`;
    }
    default:
      return `translate(-50%, -50%) rotate(${a * 0.6}deg) scale(1.3)`;
  }
}
