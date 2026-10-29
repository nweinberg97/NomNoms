import assert from 'node:assert/strict';
import { test } from 'node:test';
import { characterMarkup, type Look } from '../character';
import { sceneSvg } from '../scene';
import { STYLE_MODES, STYLES, stylizeShapes } from '../styles';

const look: Look = { kind: 'kid', skin: '#a06b46', hair: '#b5532b', hairStyle: 'curly', eyes: '#4f7a4a', outfit: 'stripes', hat: 'none', glasses: 'round', extra: 'none', personality: 'silly' };

test('every mode has a complete configuration', () => {
  assert.deepEqual(STYLE_MODES, ['tales', 'pocketlight', 'gouache', 'wondercut', 'inked']);
  for (const m of STYLE_MODES) {
    const s = STYLES[m];
    assert.equal(s.id, m);
    assert.ok(s.name && s.blurb);
    assert.ok(s.palette.swatches.length >= 6);
    for (const key of ['ink', 'shadow', 'paper', 'light'] as const) assert.match(s.palette[key], /^#[0-9a-f]{6}$/i);
    assert.ok(s.colour.pull >= 0 && s.colour.pull <= 1);
    assert.ok(s.asset.colours >= 4 && s.asset.colours <= 16);
    assert.ok(['soft-volume', 'painted', 'flat', 'cel'].includes(s.materials.shading));
    assert.ok(s.shadow.opacity > 0 && s.shadow.opacity < 1);
  }
});

test('looks are made of different things, not colour filters', () => {
  const out = Object.fromEntries(STYLE_MODES.map((m) => [m, characterMarkup(look, { style: m })]));
  // clay: lit as a 3D surface (a height map from the drawing's own shapes)
  assert.match(out.pocketlight, /feDiffuseLighting[\s\S]*feSpecularLighting/, 'clay is lit like a model');
  assert.doesNotMatch(out.pocketlight, /paint-order="stroke"/, 'clay has no drawn lines');
  // watercolour: a bled wash and a pencil line found from the visible edges
  assert.match(out.gouache, /feDisplacementMap/, 'watercolour wash bleeds');
  assert.match(out.gouache, /feConvolveMatrix/, 'watercolour has a pencil line on visible edges');
  // paper cut: each piece its own slip of paper, the whole figure cut out with a white edge
  assert.match(out.wondercut, /filter="url\(#cut/, 'paper cut lifts each piece');
  assert.match(out.wondercut, /feMorphology[^>]*operator="dilate"[\s\S]*flood-color="#fffaf1"/, 'paper cut has a white cut edge');
  // comic: black ink on every shape and a halftone dot screen in the shadow
  assert.match(out.inked, /stroke="#1d1412"[^>]*paint-order="stroke"/, 'comic inks every shape in black');
  assert.match(out.inked, /<pattern id="ht/, 'comic has a halftone screen');
  // tales: the soft coloured line of the default look
  assert.match(out.tales, /paint-order="stroke"/);
  assert.doesNotMatch(out.tales, /feDiffuseLighting|feConvolveMatrix/);
});

test('a look applies in every story world, not just everyday', () => {
  for (const world of ['fairytale', 'adventure', 'mythic'] as const) {
    const w = { ...look, world };
    assert.match(characterMarkup(w, { style: 'pocketlight' }), /feDiffuseLighting/, `${world}: clay`);
    assert.match(characterMarkup(w, { style: 'gouache' }), /feConvolveMatrix/, `${world}: watercolour`);
    assert.match(characterMarkup(w, { style: 'inked' }), /<pattern id="ht/, `${world}: comic`);
  }
});

test('a character keeps its DNA in every mode', () => {
  for (const m of STYLE_MODES) {
    const svg = characterMarkup(look, { style: m });
    assert.ok(svg.includes(look.skin), `${m}: skin`);
    assert.ok(svg.includes(look.hair), `${m}: hair colour`);
    assert.ok(/<circle cx="78" cy="\d+" r="17"/.test(svg), `${m}: round glasses`);
    assert.ok(svg.includes(`st-${m}`));
  }
});

test('drawings are never edited, only filtered', () => {
  const drawing = 'data:image/png;base64,AAAA';
  for (const m of STYLE_MODES) {
    const svg = characterMarkup({ ...look, drawing }, { style: m });
    assert.ok(svg.includes(`href="${drawing}"`), `${m}: original drawing kept`);
    assert.match(svg, /<image filter="url\(#img/, `${m}: mode treatment as a filter`);
  }
});

test('clip paths and definitions are never restyled', () => {
  const src = '<defs><clipPath id="a"><ellipse cx="1" cy="1" rx="2" ry="2" fill="#fff"/></clipPath></defs><clipPath id="b"><path d="M0 0" fill="#123456"/></clipPath><path d="M1 1" fill="#123456"/>';
  const out = stylizeShapes(src, 'inked', 'x', () => '#000000');
  assert.ok(out.startsWith('<defs><clipPath id="a"><ellipse cx="1" cy="1" rx="2" ry="2" fill="#fff"/></clipPath></defs><clipPath id="b"><path d="M0 0" fill="#123456"/></clipPath>'));
  assert.match(out, /<path d="M1 1" fill="#123456" stroke="#000000"/);
});

test('scenes take the mode, photo places and things', () => {
  const svg = sceneSvg({ placeId: 'park', seed: 1, chars: [{ look }], style: 'wondercut', photo: { image: 'data:image/png;base64,P', horizon: 0.5 }, things: [{ image: 'data:image/png;base64,T', width: 100, height: 200, heightRatio: 0.5, x: 0.8 }] });
  assert.match(svg, /class="bt-scene st-wondercut"/);
  assert.equal(svg.split('data:image/png;base64,P').length - 1, 1, 'a photo place is drawn once (no sliding copy that doubles edges)');
  assert.match(svg, /href="data:image\/png;base64,T"[^>]*height="95.0"/, 'a thing half a grown-up tall is 95 units');
});
