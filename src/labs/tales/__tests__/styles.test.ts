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

test('each look is made of something different', () => {
  const out = Object.fromEntries(STYLE_MODES.map((m) => [m, characterMarkup(look, { style: m })]));
  // Retro and Paper cut build their own characters; Plush and Pencil are the Tales characters in another material
  const shapes = (svg: string) => (svg.match(/<(path|ellipse|circle|rect)\b/g) ?? []).length;
  assert.notEqual(shapes(out.gouache), shapes(out.tales));
  assert.notEqual(shapes(out.wondercut), shapes(out.tales));
  assert.notEqual(shapes(out.gouache), shapes(out.wondercut));
  // plush: felt — fuzzy edge, puffed up, fibre; pencil: strokes through a hatch mask over a light first layer
  assert.match(out.pocketlight, /feDisplacementMap[\s\S]*feDiffuseLighting/);
  assert.doesNotMatch(out.pocketlight, /feSpecularLighting/, 'no clay sheen any more');
  assert.match(out.inked, /<mask id="hm[^"]*"[\s\S]*mask="url\(#hm/);
  assert.doesNotMatch(out.inked, /stroke="#1d1412"/, 'no comic ink any more');
  assert.match(out.gouache, /feOffset in="darks"/, 'retro print');
  assert.match(out.wondercut, /flood-color="#fffaf1"/);
  assert.match(out.tales, /paint-order="stroke"/);
});

test('a look applies in every story world, not just everyday', () => {
  for (const world of ['fairytale', 'adventure', 'mythic'] as const) {
    const w = { ...look, world };
    assert.match(characterMarkup(w, { style: 'pocketlight' }), /feDiffuseLighting/, `${world}: plush`);
    assert.match(characterMarkup(w, { style: 'gouache' }), /feOffset in="darks"/, `${world}: retro`);
    assert.match(characterMarkup(w, { style: 'inked' }), /<pattern id="ht/, `${world}: pencil`);
  }
});

test('a character keeps its DNA in every look', () => {
  for (const m of STYLE_MODES) {
    const svg = characterMarkup(look, { style: m });
    assert.ok(svg.includes(look.skin), `${m}: skin`);
    assert.ok(svg.includes(look.hair), `${m}: hair colour`);
    assert.ok(look.eyes && svg.includes(look.eyes) || m === 'gouache', `${m}: eye colour`);
    assert.match(svg, /stroke-width="[\d.]+"\/>[\s\S]*<path d="M[\d.]+ [\d.]+ Q/, `${m}: glasses drawn`);
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
