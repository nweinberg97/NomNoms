import { ANIMALS_ART } from './animals';
import { NATURE_ART } from './nature';
import { OBJECTS_ART } from './objects';

/**
 * Story things: original drawings of the animals, food, toys, vehicles and
 * places in Baby Tales stories. They replace emoji in story pictures, so a
 * page shows a drawn giraffe or apple in the book's style, the same on every
 * device. Each drawing sits in a 100 × 100 box centred on 0,0, with things
 * that stand on the ground resting at y ≈ 46.
 *
 * Stories still name things by their emoji (it's a compact, readable key);
 * nothing here ever draws an emoji glyph.
 */
const norm = (e: string) => e.replace(/️/g, '');
const ART = new Map<string, string>();
for (const set of [ANIMALS_ART, NATURE_ART, OBJECTS_ART]) for (const [k, v] of Object.entries(set)) ART.set(norm(k), v);

export const hasThing = (e: string) => ART.has(norm(e));
export const thingKeys = () => [...ART.keys()];

/** A drawn thing centred at x, y, about `size` wide; nothing at all if it has no drawing. */
export function thingArt(e: string, x: number, y: number, size: number, extra = ''): string {
  const a = ART.get(norm(e));
  if (!a) return '';
  return `<g class="bt-thing" transform="translate(${x} ${y}) scale(${(size / 100).toFixed(3)})"${extra ? ` ${extra}` : ''}>${a}</g>`;
}

/** A drawn question mark, for a thing that's missing. */
export const askMark = (x: number, y: number, size: number) =>
  `<g transform="translate(${x} ${y}) scale(${(size / 100).toFixed(3)})"><circle r="44" fill="#fff6d6" stroke="#e3b23c" stroke-width="4"/><path d="M-16 -14 Q-16 -32 0 -32 Q18 -32 18 -16 Q18 -4 4 2 Q0 4 0 12" stroke="#c9862e" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="0" cy="28" r="6.5" fill="#c9862e"/></g>`;
