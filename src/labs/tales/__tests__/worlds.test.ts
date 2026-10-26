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
/** The head as drawn: everything that makes the face theirs. */
const face = (svg: string) => (svg.match(/<g class="bt-head"[\s\S]*?<\/g><\/g>/)?.[0] ?? '')
  // the world's finishing light (gold rim, glints) is lighting, not the face
  .replace(/<path[^>]*(#ffd36b|#ffe6a8|#fff6c9|#ffe0ef)[^>]*\/>/g, '')
  .replace(/c\d+/g, '');

test('every world has its own costumes, places and story', () => {
  for (const w of WORLD_IDS.filter((x) => x !== 'everyday')) {
    const W = WORLDS[w];
    assert.equal(W.places.length, 2);
    for (const id of W.places) { const p = PLACES.find((x) => x.id === id); assert.ok(p?.art && p.world === w, `${id} is drawn for ${w}`); assert.ok(worldBackdrop(p!.art!, 1, 'x'), `${id} has a backdrop`); }
    const c = worldCostume(w, kid, true);
    assert.ok(c.outfit && OUTFITS[c.outfit] && c.hat && HATS[c.hat] && c.extra && EXTRAS[c.extra], `${w} dresses the star`);
  }
  const costumes = WORLD_IDS.filter((x) => x !== 'everyday').map((w) => worldCostume(w, kid, true).outfit);
  assert.equal(new Set(costumes).size, 3, 'three different costumes');
});

test('a world changes the clothes and the posture, never the face', () => {
  const base = characterMarkup(mom);
  for (const w of WORLD_IDS) {
    const svg = characterMarkup(inWorld(w, mom));
    assert.ok(svg.includes(mom.skin) && svg.includes(mom.hair), `${w}: same skin and hair`);
    assert.ok(/<circle cx="7\d(\.\d+)?" cy="\d+" r="17"/.test(svg), `${w}: still wears their glasses`);
    if (w !== 'everyday') assert.notEqual(svg, base, `${w}: something changes`);
  }
  // the same face in every world, every pose and every expression
  const faces = new Set<string>();
  for (const w of WORLD_IDS) for (const pose of ['stand', 'point', 'hips', 'cheer'] as const) faces.add(face(characterMarkup({ ...inWorld(w, mom), hat: 'none', pose, expression: 'smile' })));
  assert.equal(faces.size, 1, 'face drawn identically across worlds and poses');
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
