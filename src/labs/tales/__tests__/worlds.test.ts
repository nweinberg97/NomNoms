import assert from 'node:assert/strict';
import { test } from 'node:test';
import { characterMarkup, OUTFITS, HATS, EXTRAS, type Look, type WorldId } from '../character';
import { PLACES } from '../catalog';
import { generateStory, type CastMember } from '../generator';
import { sceneSvg } from '../scene';
import { STYLE_MODES } from '../styles';
import { WORLDS, WORLD_IDS, worldBackdrop, worldCostume } from '../worlds';

/*
 * Story worlds change art direction (costumes, places, light, posture, story),
 * never identity. These check the rules; how good each world looks is reviewed
 * by eye in the gallery.
 */

const mom: Look = { kind: 'adult', skin: '#d39a6e', hair: '#1f1a17', hairStyle: 'curtain', eyes: '#5a3a22', outfit: 'dress', hat: 'none', glasses: 'round', extra: 'none', personality: 'calm', shape: { faceWidth: 0.4, eyeGap: -0.3, nose: 0.5 } };
const kid: Look = { kind: 'kid', skin: '#efc19f', hair: '#7a5236', hairStyle: 'messy', eyes: '#4a7fb5', outfit: 'tee', hat: 'none', glasses: 'none', extra: 'none', personality: 'silly' };
const inWorld = (w: WorldId, l: Look, star = false): Look => ({ ...l, ...worldCostume(w, l, star), world: w });
/** The face's own outline: the head shape read from the photo (Character DNA), however it's drawn. */
const headShape = (svg: string) => svg.match(/<path d="(M[\d.]+ [\d.]+ C[^"]+)" fill="url\(#sk/)?.[1];
const IDENTITY: (keyof Look)[] = ['kind', 'skin', 'hair', 'hairStyle', 'eyes', 'shape', 'facial', 'beard', 'freckles', 'lashes', 'face', 'drawing'];

test('every world has its own costumes, places and story', () => {
  for (const w of WORLD_IDS.filter((x) => x !== 'everyday')) {
    const W = WORLDS[w];
    assert.equal(W.places.length, 2);
    for (const id of W.places) { const p = PLACES.find((x) => x.id === id); assert.ok(p?.art && p.world === w, `${id} is drawn for ${w}`); assert.ok(worldBackdrop(p!.art!, 1, 'x'), `${id} has a backdrop`); }
    const c = worldCostume(w, kid, true);
    assert.ok(c.outfit && OUTFITS[c.outfit] && c.hat && HATS[c.hat] && c.extra && EXTRAS[c.extra], `${w} dresses the star`);
  }
  const costumes = WORLD_IDS.filter((x) => x !== 'everyday').map((w) => worldCostume(w, kid, true).outfit);
  assert.equal(new Set(costumes).size, costumes.length, 'a different costume in every world');
});

test('a world changes how someone is drawn, never who they are', () => {
  const base = characterMarkup(mom);
  for (const w of WORLD_IDS) {
    // the costume never touches identity
    for (const star of [true, false]) for (const who of [mom, kid]) {
      const c = worldCostume(w, who, star);
      for (const k of IDENTITY) assert.ok(!(k in c), `${w}: costume leaves ${k} alone`);
    }
    const svg = characterMarkup(inWorld(w, mom));
    assert.ok(svg.includes(mom.skin) && svg.includes(mom.hair) && svg.includes(mom.eyes!), `${w}: same skin, hair and eye colour`);
    assert.ok(/<circle cx="7\d(\.\d+)?" cy="\d+" r="17"/.test(svg), `${w}: still wears their glasses`);
    if (w !== 'everyday') assert.notEqual(svg, base, `${w}: something changes`);
  }
  // each world draws faces its own way, but within a world the face (from the photo) holds
  // across every pose and expression, and the photo's proportions shape it in every world
  for (const w of WORLD_IDS) {
    const shapes = new Set<string | undefined>();
    for (const pose of ['stand', 'point', 'hips', 'cheer', 'wave'] as const) for (const expression of ['smile', 'brave', 'laugh'] as const) shapes.add(headShape(characterMarkup({ ...inWorld(w, mom), pose, expression })));
    assert.equal(shapes.size, 1, `${w}: one face shape across poses and expressions`);
    assert.ok([...shapes][0], `${w}: the face shape is drawn`);
    const wider = headShape(characterMarkup({ ...inWorld(w, mom), shape: { ...mom.shape, faceWidth: 1 } }));
    assert.notEqual(wider, [...shapes][0], `${w}: a wider face in the photo draws a wider face`);
  }
});

test('each world is its own art style, not just a costume', () => {
  const draw = (w: WorldId) => characterMarkup({ ...inWorld(w, mom), outfit: 'tee', hat: 'none', extra: 'none', accent: undefined });
  const [every, fairy, adv, myth] = (['everyday', 'fairytale', 'adventure', 'mythic'] as WorldId[]).map(draw);
  // same clothes: what's left is the world's own drawing
  assert.notEqual(fairy, every); assert.notEqual(adv, every); assert.notEqual(myth, every);
  assert.match(fairy, /bt-twinkle/, 'fairytale glow and twinkles');
  assert.match(myth, /#ffe08a/, 'mythic halo of light');
  assert.match(adv, /#d8c7a6/, 'adventure dust at the feet');
  // its own construction: different head, eyes and line in each world, even in the same clothes
  const heads = new Set([every, fairy, adv, myth].map(headShape));
  assert.equal(heads.size, 4, 'four different face constructions');
  // in the Tales look, one storybook line throughout, as on the drawn story things (Clay, the default here, has no lines)
  for (const w of WORLD_IDS) assert.match(characterMarkup({ ...inWorld(w, mom), outfit: 'tee', hat: 'none', extra: 'none', accent: undefined }, { style: 'tales' }), /stroke-width="2.3" stroke-linejoin="round" paint-order="stroke"/);
  // grown-ups are built differently in each world; babies stay babies
  const bodyScale = (svg: string) => svg.match(/scale\(([\d.]+) ([\d.]+)\) translate\(-100 -252\)/)?.slice(1).map(Number);
  const sz = (['everyday', 'fairytale', 'adventure', 'mythic'] as WorldId[]).map((w) => bodyScale(draw(w)));
  assert.ok(sz[3]![1] > sz[1]![1] && sz[1]![1] > sz[0]![1], 'mythic tallest, fairytale taller than everyday');
  const baby = (w: WorldId) => bodyScale(characterMarkup({ ...kid, kind: 'baby', world: w }))!;
  assert.ok(baby('mythic')[1] - 1 < (sz[3]![1] - 1) / 2, 'a baby is changed much less');
});

test('everyone keeps their own colour in a world costume', () => {
  const dad: Look = { ...kid, kind: 'adult', outfit: 'denim' };
  const a = worldCostume('mythic', mom, false).accent, b = worldCostume('mythic', dad, false).accent;
  assert.ok(a && b && a !== b, 'different people, different capes');
});

test('Dad is not put in a gown: costumes follow what someone already wears', () => {
  const dad: Look = { ...kid, kind: 'adult', outfit: 'denim' };
  assert.notEqual(worldCostume('fairytale', dad, false).outfit, 'gown');
  assert.equal(worldCostume('fairytale', mom, false).outfit, 'gown');
  assert.deepEqual(worldCostume('fairytale', { ...kid, kind: 'dog' }, true), {}, 'pets stay as they are');
});

test('worlds are not colour filters: their scenes differ in what is drawn', () => {
  const scenes = WORLD_IDS.map((w) => sceneSvg({ placeId: w === 'everyday' ? 'park' : WORLDS[w].places[0], seed: 2, world: w, chars: [{ look: inWorld(w, kid, true) }] }));
  for (const [i, w] of WORLD_IDS.entries()) for (const [j] of WORLD_IDS.entries()) if (i < j) assert.notEqual(scenes[i], scenes[j], `${w}`);
  assert.match(scenes[WORLD_IDS.indexOf('fairytale')], /bt-mote/, 'fairytale motes');
  assert.match(scenes[WORLD_IDS.indexOf('mythic')], /#ffd36b/, 'mythic gold rim light');
});

test('world stories are told in their own places, deterministically', () => {
  const cast: CastMember[] = [{ id: 'star', role: 'baby', name: 'Maya', call: 'Maya', inStory: true }, { id: 'mom', role: 'parent', name: 'Rachel', call: 'Mom', inStory: true }, { id: 'dad', role: 'parent', name: 'Mark', call: 'Dad', inStory: true }];
  for (const w of ['fairytale', 'adventure', 'mythic'] as const) {
    const st = generateStory(WORLDS[w].story!, cast, { seed: 5 });
    assert.ok(st.pages.length >= 5);
    assert.ok(st.pages.every((p) => WORLDS[w].places.includes(p.place)), `${w} stays in its places`);
    assert.deepEqual(generateStory(WORLDS[w].story!, cast, { seed: 5 }), st);
    assert.ok(st.pages.some((p) => p.pose), `${w} has body language`);
  }
});

test('every look draws every world', () => {
  for (const m of STYLE_MODES) for (const w of WORLD_IDS) {
    const svg = sceneSvg({ placeId: w === 'everyday' ? 'home' : WORLDS[w].places[1], seed: 1, style: m, world: w, chars: [{ look: inWorld(w, kid, true) }, { look: inWorld(w, mom) }] });
    assert.ok(!/NaN|undefined/.test(svg), `${m}/${w}`);
  }
});
