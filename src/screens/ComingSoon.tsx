import React from 'react';
import { DUMPLING_COVERS, LEGENDS_SCENE } from '../data/comingSoonArt';
import { Icon } from '../components/Icon';
import { Shell } from '../components/Shell';
import { navigate } from '../lib/router';

/**
 * "Coming soon": a first look at NomNoms Baby Tales and NomNoms Dumplings.
 * Shown on the landing page, as its own screen in the app, and linked from Home.
 * Purely presentational: nothing here reads or writes family data.
 */
export function ComingSoonSection({ heading = true }: { heading?: boolean }) {
  return (
    <section className="cs" aria-labelledby={heading ? 'cs-title' : undefined} data-testid="coming-soon">
      {heading && (
        <header className="cs-intro">
          <p className="eyebrow">Coming soon</p>
          <h2 id="cs-title" className="display">Two new ways to <em>keep the story going</em></h2>
        </header>
      )}

      <article className="cs-feature">
        <div className="cs-visual">
          <div className="cs-book" role="img" aria-label="An open NomNoms Baby Tales picture book, The Adventures of Juno: Juno dressed as a pirate at the beach with Dad">
            <div className="cs-book-art" dangerouslySetInnerHTML={{ __html: LEGENDS_SCENE }} />
            <div className="cs-book-text">
              <small>The Adventures of Juno · Page 3</small>
              <p>Is it at the beach with <strong>Dad</strong>? No! Just a crab in a tiny hat.</p>
            </div>
          </div>
        </div>
        <div className="cs-copy">
          <span className="cs-pill">Coming soon</span>
          <h3 className="display">NomNoms Baby Tales</h3>
          <p className="cs-one">Turn your little one and their favourite people into storybook characters, starring in adventures made just for them.</p>
          <ul className="cs-chips"><li>Avatars made with Genmoji</li><li>Hats, glasses and costumes</li><li>Printed or digital</li></ul>
        </div>
      </article>

      <article className="cs-feature is-flip">
        <div className="cs-visual">
          <div className="cs-shelf" role="img" aria-label="Four small NomNoms Dumplings books: Juno turns one, Our first Halloween, Stinson Beach, and For Mom">
            {DUMPLING_COVERS.map((c) => (
              <div key={c.id} className={`cs-dumpling is-${c.id}`} dangerouslySetInnerHTML={{ __html: c.svg }} />
            ))}
          </div>
        </div>
        <div className="cs-copy">
          <span className="cs-pill">Coming soon</span>
          <h3 className="display">NomNoms Dumplings</h3>
          <p className="cs-one">Dump your photos from a birthday, holiday or trip, and get back a beautiful little book of that day.</p>
          <ul className="cs-chips"><li>Finds the occasion for you</li><li>A design for every occasion</li><li>Videos go into a mini film</li></ul>
        </div>
      </article>

      <p className="cs-fine">Illustrations are previews. Baby Tales avatars use Genmoji, on Apple devices with Apple Intelligence.</p>
    </section>
  );
}

export function ComingSoon() {
  return (
    <Shell>
      <button className="link-btn cs-back" onClick={() => navigate('/home')}><Icon name="arrow-left" size={15} /> Home</button>
      <ComingSoonSection />
    </Shell>
  );
}

/** Small card on Home that opens the coming soon screen. */
export function ComingSoonCard() {
  return (
    <button className="cs-card" onClick={() => navigate('/coming-soon')} data-testid="coming-soon-card">
      <span className="cs-card-art" dangerouslySetInnerHTML={{ __html: DUMPLING_COVERS[0].svg }} />
      <span className="cs-card-text">
        <span className="eyebrow">Coming soon</span>
        <strong>Baby Tales &amp; Dumplings</strong>
        <small>Storybooks starring your family, and little books for big days.</small>
      </span>
      <Icon name="chevron-right" />
    </button>
  );
}
