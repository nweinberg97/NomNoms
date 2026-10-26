import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ANIMALS, COLOURS, COUNTABLES, FOODS, LOST, PLACES, STORY_TYPES } from '../catalog';
import { generateStory, type CastMember } from '../generator';
import { sceneSvg } from '../scene';
import { STYLE_MODES } from '../styles';
import { WORLD_IDS } from '../worlds';
import { hasThing, thingArt, thingKeys } from '../things';
import { readFileSync } from 'node:fs';

/*
 * Story pictures show drawn things, never emoji: every animal, food, toy and
 * prop a story can put on a page has a drawing, and no picture contains an
 * emoji character.
 */
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B55}]/u;

test('every thing a story can show has a drawing', () => {
  const named = [
    ...ANIMALS.map((a) => a.e), ...COUNTABLES.map((c) => c.e), ...COLOURS.flatMap((c) => c.things.map((t) => t.e)),
    ...FOODS.map((f) => f.e), ...LOST.map((l) => l.e), ...PLACES.flatMap((p) => p.props),
  ];
  // the fixed big things in the stories (generator.ts)
  const gen = readFileSync('src/labs/tales/generator.ts', 'utf8').match(/e: '([^']+)'/g)?.map((m) => m.slice(4, -1)) ?? [];
  const missing = [...new Set([...named, ...gen])].filter((e) => !hasThing(e));
  assert.deepEqual(missing, [], 'drawings for every thing');
  assert.ok(thingKeys().length >= 200);
});

test('drawings are clean, self-contained SVG', () => {
  for (const k of thingKeys()) {
    const svg = thingArt(k, 0, 0, 100);
    assert.ok(svg.length > 80, `${k} is drawn`);
    assert.ok(!EMOJI.test(svg), `${k}: no emoji inside`);
    assert.ok(!/<(text|image|defs|filter|script)\b|\bid=|url\(/.test(svg), `${k}: plain shapes only`);
    assert.ok(!/NaN|undefined/.test(svg), `${k}: well-formed`);
  }
});

test('no story picture contains an emoji', () => {
  const cast: CastMember[] = [{ id: 'star', role: 'baby', name: 'Maya', call: 'Maya', inStory: true }, { id: 'mom', role: 'parent', name: 'Rachel', call: 'Mom', inStory: true }, { id: 'pet', role: 'pet', name: 'Biscuit', call: 'Biscuit', inStory: true }];
  const look = { kind: 'baby' as const, skin: '#f6d2b7', hair: '#7a5236', hairStyle: 'tuft' as const, outfit: 'tee', hat: 'none', glasses: 'none', extra: 'none' };
  for (const t of STORY_TYPES) for (const seed of [1, 2, 3]) {
    const st = generateStory(t.id, cast, { seed });
    for (const p of st.pages) for (const style of [STYLE_MODES[seed % STYLE_MODES.length]]) {
      const svg = sceneSvg({ placeId: p.place, seed, style, world: WORLD_IDS[seed % 4], focus: p.focus, chars: [{ look }] });
      assert.ok(!EMOJI.test(svg.replace(/<text[^>]*>[a-z]<\/text>/g, '')), `${t.id} page "${p.text.slice(0, 30)}…" has no emoji`);
    }
  }
});
