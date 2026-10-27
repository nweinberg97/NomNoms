import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ACTIONS, characterMarkup, type Action, type Look } from '../character';
import { STORY_TYPES } from '../catalog';
import { actionFromText, generateStory, type CastMember } from '../generator';
import { sceneSvg } from '../scene';

/*
 * Actions (what someone is doing on a page) and arranging a page picture:
 * moving, resizing, flipping, hiding, holding things. None of it may change
 * who someone is.
 */

const kid: Look = { kind: 'kid', skin: '#e8b48f', hair: '#5a3a24', hairStyle: 'curly', eyes: '#5b3a1f', outfit: 'tee', top: '#4f7bd8', bottom: '#2f4f8c' } as Look;

test('the words pick an action', () => {
  assert.equal(actionFromText('{H} runs to the gate'), 'run');
  assert.equal(actionFromText('Time to sleep, little one'), 'sleep');
  assert.equal(actionFromText('{H} jumps in the puddle!'), 'jump');
  assert.equal(actionFromText('{H} dances with Grandma'), 'dance');
  assert.equal(actionFromText('{H} sits by the pond'), 'sit');
  assert.equal(actionFromText('{H} walks to the park'), 'walk');
  assert.equal(actionFromText('A quiet morning'), 'stand');
});

test('every story page gets an action, and not all the same', () => {
  const cast: CastMember[] = [{ id: 'b', name: 'Mia', call: 'Mia', role: 'baby', inStory: true } as CastMember, { id: 'm', name: 'Ana', call: 'Mom', role: 'mom', inStory: true } as CastMember];
  const seen = new Set<Action>();
  for (const t of STORY_TYPES) for (const seed of [1, 2, 3]) for (const p of generateStory(t.id, cast, { seed }).pages) { assert.ok(p.action && p.action in ACTIONS); seen.add(p.action!); }
  assert.ok(seen.size >= 3, `stories use several actions (${[...seen]})`);
});

test('each action draws differently and keeps the same person', () => {
  const stand = characterMarkup(kid);
  for (const a of Object.keys(ACTIONS) as Action[]) {
    const svg = characterMarkup({ ...kid, action: a });
    assert.ok(svg.includes(kid.skin) && svg.includes(kid.hair), `${a}: same skin and hair`);
    if (a !== 'stand') assert.notEqual(svg, stand, `${a} looks different from standing`);
  }
});

test('someone can hold a thing', () => {
  const svg = characterMarkup({ ...kid, hold: '🎈' });
  assert.ok(svg.includes('bt-thing'), 'the balloon is drawn in their hand');
  assert.ok(!svg.includes('🎈'), 'drawn, not an emoji');
});

test('arranging moves, sizes, flips and hides, and only when asked', () => {
  const base = { placeId: 'park', seed: 3, chars: [{ id: 'b', look: kid }], focus: { e: '🧸' } };
  const plain = sceneSvg(base);
  assert.ok(!plain.includes('data-edit'), 'not editable unless arranging');
  const ed = sceneSvg({ ...base, editable: true, selected: 'char:b' });
  assert.ok(ed.includes('data-edit="char:b"') && ed.includes('data-edit="focus"'), 'people and things can be picked');
  assert.ok(ed.includes('bt-sel'), 'the picked one is outlined');
  const moved = sceneSvg({ ...base, chars: [{ id: 'b', look: kid, place: { x: 80, y: 280, scale: 1.4, flip: true } }] });
  assert.notEqual(moved, plain);
  assert.ok(/scale\(-1 1\)/.test(moved), 'flipped');
  const hidden = sceneSvg({ ...base, focusPlace: { hidden: true } });
  assert.ok(!hidden.includes('bt-thing') || hidden.split('bt-thing').length < plain.split('bt-thing').length, 'the thing can be hidden');
});
