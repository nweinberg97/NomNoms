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

test('each look is its own character design, drawn from the same person', () => {
  const out = Object.fromEntries(STYLE_MODES.map((m) => [m, characterMarkup(look, { style: m })]));
  // every look sets the face up its own way: its own proportions and its own head
  const build = (svg: string) => svg.match(/scale\(([\d.]+) ([\d.]+)\) translate\(-100 -252\)/)?.slice(1).join(' ');
  assert.equal(new Set(STYLE_MODES.map((m) => build(out[m]))).size, STYLE_MODES.length, 'every look has its own proportions');
  const head = (svg: string) => svg.match(/<clipPath id="th[^"]*"><path d="([^"]+)"/)?.[1];
  assert.equal(new Set(STYLE_MODES.map((m) => head(out[m]))).size, STYLE_MODES.length, 'every look has its own head shape');
  // Movie 3D is lit in 3D with no ink line; Classic Fairytale and Sparkle have fine lines and a glow
  assert.match(out.pocketlight, /feDiffuseLighting[\s\S]*feSpecularLighting/);
  assert.doesNotMatch(out.pocketlight, /paint-order="stroke"/);
  assert.match(out.gouache, /stroke-width="2.2" stroke-linejoin="round" paint-order="stroke"/);
  assert.match(out.wondercut, /stroke-width="1.8" stroke-linejoin="round" paint-order="stroke"/);
  // Super Heroes: everyone in their own suit, cape and mask, the same person underneath
  assert.match(out.inked, /stroke-width="2.6" stroke-linejoin="round" paint-order="stroke"/);
  const hero = (l: Look) => characterMarkup(l, { style: 'inked' });
  const kidSuit = hero(look), momSuit = hero({ ...look, kind: 'adult', skin: '#d39a6e', hair: '#1f1a17', hairStyle: 'curtain', lashes: true });
  assert.ok(kidSuit.includes(look.skin) && kidSuit.includes(look.hair) && kidSuit.includes(look.eyes!), 'same person in the suit');
  assert.notEqual(kidSuit.match(/<path d="M62 152 Q100 142 138 152 L176 250[^"]*" fill="([^"]+)"/)?.[1], momSuit.match(/<path d="M62 152 Q100 142 138 152 L176 250[^"]*" fill="([^"]+)"/)?.[1], 'each hero has their own cape colour');
  assert.match(out.tales, /stroke-width="2.3" stroke-linejoin="round" paint-order="stroke"/);
});

test('a look applies in every story world, not just everyday', () => {
  for (const world of ['fairytale', 'adventure', 'mythic', 'ocean', 'space'] as const) {
    const w = { ...look, world };
    assert.match(characterMarkup(w, { style: 'pocketlight' }), /feDiffuseLighting/, `${world}: movie 3D`);
    assert.match(characterMarkup(w, { style: 'inked' }), /stroke-width="2.6"/, `${world}: super heroes`);
    assert.match(characterMarkup(w, { style: "gouache" }), /feComposite in="soft"/, `${world}: chibi glow`);
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

test('a super hero costume can be changed: suit, cape, mask and emblem, and babies wear masks too', () => {
  const baby: Look = { ...look, kind: 'baby' };
  const plain = characterMarkup(baby, { style: 'inked' });
  const mask = /<path d="M[^"]+" fill="(#[0-9a-f]{6})"[^>]*\/><g class="bt-eyes">/;
  assert.match(plain, mask, 'a baby wears a mask');
  const custom = characterMarkup({ ...baby, hero: { suit: '#22a06b', cape: '#7b4bc9', mask: '#2a2a33', emblem: 'heart' } }, { style: 'inked' });
  assert.ok(custom.includes('fill="#22a06b"') && custom.includes('fill="#7b4bc9"'), 'suit and cape colours');
  assert.equal(custom.match(mask)?.[1], '#2a2a33', 'mask colour');
  const bare = characterMarkup({ ...baby, hero: { cape: 'none', mask: 'none' } }, { style: 'inked' });
  assert.doesNotMatch(bare, /L176 250 Q140 240 100 246/, 'no cape');
  assert.doesNotMatch(bare, mask, 'no mask');
  assert.ok(bare.includes(look.skin) && bare.includes(look.eyes!), 'still the same person');
});
