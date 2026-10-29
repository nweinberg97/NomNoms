import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GARLANDS, kitDecor, kitFor, kitVars, occasionIcon, PATTERNS } from '../kits';
import { OCCASIONS } from '../occasions';
import { garlandSvg, MOTIFS, patternDef } from '../ornaments';

/**
 * Dumplings decorations: every occasion is dressed in drawn ornaments (never
 * emoji), has its own garland and tape pattern, and can be turned down or off.
 */
const EMOJI = /\p{Extended_Pictographic}/u;
const LAYOUTS = ['cover', 'chapter', 'closing', 'quote', 'hero-caption', 'two-up', 'four-grid'];

test('every occasion has a kit of drawn motifs, a garland and a tape pattern', () => {
  for (const o of OCCASIONS) {
    const kit = kitFor(o);
    assert.ok(kit.motifs.length >= 2, `${o.id}: at least two motifs`);
    for (const m of kit.motifs) assert.ok(MOTIFS[m], `${o.id}: motif ${m} is drawn`);
    assert.ok(GARLANDS.some((g) => g.id === kit.garland), `${o.id}: garland`);
    assert.ok(PATTERNS.some((p) => p.id === kit.pattern), `${o.id}: pattern`);
  }
});

test('decorations are drawings, not emoji, on every kind of page', () => {
  for (const o of OCCASIONS) {
    const kit = kitFor(o);
    for (const [i, layout] of LAYOUTS.entries()) {
      const svg = kitDecor(o, kit, layout, i);
      assert.doesNotMatch(svg, EMOJI, `${o.id} ${layout}: no emoji`);
      assert.ok(!/NaN|undefined/.test(svg), `${o.id} ${layout}: well formed`);
    }
    assert.match(kitDecor(o, kit, 'cover', 0), /<path|<circle|<ellipse/, `${o.id}: the cover is decorated`);
    assert.doesNotMatch(occasionIcon(o), EMOJI);
  }
});

test('garlands and patterns all draw', () => {
  const p = { a: '#c8423a', s: '#eadfcf', i: '#2c2521', p: '#fbf6ee' };
  for (const g of GARLANDS) assert.ok(garlandSvg(g.id, p).length > 100, g.id);
  for (const t of PATTERNS) assert.match(patternDef('x', t.id, p), /<pattern id="x"/, t.id);
});

test('a parent can turn decorations down or off', () => {
  const o = OCCASIONS.find((x) => x.id === 'halloween')!;
  const kit = kitFor(o);
  const lots = kitDecor(o, kit, 'cover', 0), some = kitDecor(o, { ...kit, level: 'some' }, 'cover', 0);
  assert.ok(some.length < lots.length, 'a little is less than lots');
  assert.equal(kitDecor(o, { ...kit, level: 'none' }, 'cover', 0), '');
  assert.deepEqual(kitVars(o, { ...kit, level: 'none' }), {}, 'no tape when decorations are off');
  assert.match(kitVars(o, kit)['--dp-tape'], /^url\("data:image\/svg\+xml/);
});

test('each occasion looks like itself: Eid has its own lanterns, Lunar New Year red ones', () => {
  const eid = OCCASIONS.find((x) => x.id === 'eid')!, lny = OCCASIONS.find((x) => x.id === 'lunar-new-year')!;
  assert.equal(kitFor(eid).garland, 'fanous');
  assert.equal(kitFor(lny).garland, 'lanterns');
  assert.notEqual(kitFor(OCCASIONS.find((x) => x.id === 'christmas')!).garland, kitFor(OCCASIONS.find((x) => x.id === 'halloween')!).garland);
});
