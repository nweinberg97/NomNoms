import { garlandSvg, motifFor, MOTIFS, patternDef, type GarlandId, type Pal, type PatternId } from './ornaments';
import type { Occasion } from './occasions';

/**
 * A design kit per occasion: the drawn motifs, the garland strung across the
 * cover and section pages, the pattern on the washi tape that holds each photo,
 * and how much decoration there is. Parents can change the pattern, the garland
 * and the amount; the occasion only sets the starting point.
 */
export type Level = 'lots' | 'some' | 'none';
export interface Kit { motifs: string[]; garland: GarlandId; pattern: PatternId; level: Level; colors?: string[] }

const K: Record<string, [GarlandId, PatternId, string[]?]> = {
  christmas: ['lights', 'gingham', ['tree', 'bauble', 'gift', 'holly', 'star']],
  hanukkah: ['stars', 'stars', ['menorah', 'dreidel', 'starofdavid', 'cookie']],
  diwali: ['marigolds', 'diamonds', ['diya', 'rangoli', 'marigold', 'sparkle']],
  eid: ['fanous', 'stars', ['crescent', 'fanous', 'star', 'candy']],
  'lunar-new-year': ['lanterns', 'diamonds', ['lantern', 'redenvelope', 'orange', 'dragon', 'blossom']],
  easter: ['bunting', 'dots', ['egg', 'bunny', 'chick', 'tulip']],
  passover: ['pennants', 'dots', ['matzah', 'cup', 'sprig', 'starofdavid']],
  holi: ['bunting', 'confetti', ['paint', 'heart', 'flower']],
  vaisakhi: ['marigolds', 'diamonds', ['wheat', 'drum', 'marigold', 'heart']],
  halloween: ['bunting', 'dots', ['jackolantern', 'ghost', 'bat', 'candy', 'web']],  // colours: see KIT_COLOURS
  'day-of-the-dead': ['papel', 'diamonds', ['marigold', 'skull', 'candle', 'note']],
  thanksgiving: ['leaves', 'leaves', ['turkey', 'pie', 'corn', 'autumnleaf', 'acorn']],
  'thanksgiving-ca': ['leaves', 'leaves', ['mapleleaf', 'pie', 'autumnleaf', 'apple']],
  'new-year': ['stars', 'confetti', ['firework', 'glasses', 'confetti', 'sparkle']],
  valentines: ['hearts', 'hearts', ['hearts', 'envelope', 'rose', 'heart']],
  'st-patricks': ['pennants', 'gingham', ['shamrock', 'rainbow', 'coin', 'heart']],
  'canada-day': ['pennants', 'stripes', ['mapleleaf', 'firework', 'heart']],
  'fourth-of-july': ['bunting', 'stars', ['firework', 'flag', 'star', 'watermelon']],
  kwanzaa: ['pennants', 'diamonds', ['kinara', 'corn', 'gift', 'heart']],
  'first-birthday': ['bunting', 'confetti', ['cake', 'balloons', 'partyhat', 'confetti']],
  birthday: ['bunting', 'confetti', ['balloons', 'gift', 'partyhat', 'cupcake']],
  'half-birthday': ['bunting', 'dots', ['cupcake', 'balloon', 'star']],
  'baby-shower': ['blossoms', 'dots', ['bottle', 'teddy', 'bow', 'bouquet']],
  'naming-day': ['blossoms', 'dots', ['dove', 'sprig', 'heart', 'sparkle']],
  baptism: ['blossoms', 'dots', ['dove', 'sprig', 'sparkle', 'heart']],
  wedding: ['blossoms', 'hearts', ['rings', 'bouquet', 'glasses', 'heart']],
  reunion: ['bunting', 'gingham', ['house', 'basket', 'tree', 'heart']],
  'playdate-party': ['bunting', 'confetti', ['balloons', 'cake', 'note', 'confetti']],
  'coming-home': ['stars', 'dots', ['house', 'teddy', 'moon', 'bottle']],
  'first-day-daycare': ['pennants', 'checks', ['backpack', 'crayon', 'puzzle', 'apple']],
  'first-day-school': ['pennants', 'checks', ['pencil', 'books', 'apple', 'backpack']],
  'first-steps': ['stars', 'dots', ['footprints', 'star', 'teddy']],
  'first-haircut': ['pennants', 'stripes', ['scissors', 'comb', 'star']],
  'new-sibling': ['hearts', 'dots', ['teddy', 'bottle', 'hearts']],
  'moving-day': ['pennants', 'stripes', ['box', 'key', 'house', 'plant']],
  'gotcha-day': ['pennants', 'dots', ['paw', 'bone', 'heart']],
  spring: ['blossoms', 'blossoms', ['tulip', 'blossom', 'bee', 'butterfly']],
  summer: ['bunting', 'stripes', ['sun', 'watermelon', 'icecream', 'wave']],
  autumn: ['leaves', 'leaves', ['autumnleaf', 'acorn', 'apple', 'mapleleaf']],
  winter: ['snow', 'snow', ['snowflake', 'snowman', 'mitten', 'mug']],
  'first-snow': ['snow', 'snow', ['snowman', 'snowflake', 'mitten']],
  'cherry-blossoms': ['blossoms', 'blossoms', ['blossom', 'butterfly', 'sprig']],
  'rainy-days': ['bunting', 'dots', ['umbrella', 'raincloud', 'rainbow', 'leaf']],
  'pumpkin-patch': ['leaves', 'gingham', ['pumpkin', 'basket', 'autumnleaf', 'apple']],
  'apple-picking': ['leaves', 'gingham', ['apple', 'basket', 'tree', 'leaf']],
  'berry-picking': ['bunting', 'gingham', ['strawberry', 'basket', 'sun', 'flower']],
  'beach-trip': ['shells', 'waves', ['shell', 'starfish', 'wave', 'sun', 'sailboat']],
  'lake-cottage': ['pennants', 'gingham', ['canoe', 'pine', 'fish', 'sun']],
  camping: ['pennants', 'gingham', ['tent', 'campfire', 'pine', 'moon']],
  'road-trip': ['pennants', 'stripes', ['car', 'map', 'mountain', 'pin']],
  'ski-trip': ['snow', 'checks', ['ski', 'mountain', 'snowflake', 'mug']],
  'city-trip': ['pennants', 'stripes', ['city', 'pin', 'map', 'mug']],
  'theme-park': ['lights', 'confetti', ['ferris', 'balloons', 'ticket', 'candy']],
  'grandparents-visit': ['bunting', 'gingham', ['house', 'cookie', 'yarn', 'heart']],
  'farm-stay': ['bunting', 'gingham', ['barn', 'cow', 'sunflower', 'egg']],
  island: ['shells', 'waves', ['palm', 'flower', 'fish', 'sun']],
  hike: ['pennants', 'leaves', ['mountain', 'hikingboot', 'pine', 'feather']],
  'first-flight': ['pennants', 'stripes', ['plane', 'cloud', 'suitcase', 'map']],
  'train-trip': ['pennants', 'stripes', ['train', 'ticket', 'mountain', 'cow']],
  'zoo-day': ['pennants', 'leaves', ['giraffe', 'elephant', 'paw', 'leaf']],
  'aquarium-day': ['shells', 'waves', ['octopus', 'fish', 'turtle', 'bubbles']],
  festival: ['lights', 'confetti', ['ferris', 'popcorn', 'ticket', 'note']],
  cruise: ['shells', 'waves', ['sailboat', 'anchor', 'fish', 'wave']],
  'mothers-day': ['blossoms', 'hearts', ['bouquet', 'tulip', 'heart', 'mug']],
  'fathers-day': ['pennants', 'checks', ['tie', 'trophy', 'mug', 'star']],
  'grandparents-day': ['bunting', 'dots', ['yarn', 'cookie', 'sunflower', 'heart']],
  'family-day': ['bunting', 'gingham', ['house', 'heart', 'basket', 'tree']],
  'sibling-day': ['stars', 'stars', ['teddy', 'puzzle', 'star', 'heart']],
  'ordinary-weekend': ['bunting', 'gingham', ['basket', 'mug', 'daisy', 'book']],
};

/** Garland colours where the palette alone wouldn't say the occasion. */
const KIT_COLOURS: Record<string, string[]> = {
  halloween: ['#e8873e', '#8a5bb0', '#9bc53d', '#f2c230'],
  christmas: ['#c8423a', '#3f8a4a', '#e7b43c', '#fffdf8'],
  'fourth-of-july': ['#c53a3a', '#fffdf8', '#2f4f9a'],
  'canada-day': ['#d52b1e', '#fffdf8'],
  'st-patricks': ['#3d8a4f', '#7fbf6a', '#e7b43c'],
  'lunar-new-year': ['#c8322b', '#e7b43c'],
  holi: ['#e0559a', '#f2c230', '#3fa0d9', '#5cb85c', '#8a6bc6'],
  kwanzaa: ['#c8423a', '#1f1a17', '#2e7d4f'],
  'first-birthday': ['#e86f5b', '#f2c230', '#8ec1de', '#ec8fa6'],
  birthday: ['#7b61c4', '#f2c230', '#ec8fa6', '#8ec1de'],
  summer: ['#f0a632', '#2f8fb0', '#ec5a6a', '#fffdf8'],
  'theme-park': ['#d9469b', '#f2c230', '#3fa0d9', '#5cb85c'],
};

export const GARLANDS: { id: GarlandId; label: string }[] = [
  { id: 'bunting', label: 'Bunting' }, { id: 'lights', label: 'Lights' }, { id: 'pennants', label: 'Flags' }, { id: 'stars', label: 'Stars' },
  { id: 'hearts', label: 'Hearts' }, { id: 'leaves', label: 'Leaves' }, { id: 'blossoms', label: 'Blossoms' }, { id: 'snow', label: 'Snow' },
  { id: 'lanterns', label: 'Red lanterns' }, { id: 'fanous', label: 'Fanous' }, { id: 'marigolds', label: 'Marigolds' }, { id: 'papel', label: 'Papel picado' }, { id: 'shells', label: 'Shells' },
];
export const PATTERNS: { id: PatternId; label: string }[] = [
  { id: 'dots', label: 'Dots' }, { id: 'stripes', label: 'Stripes' }, { id: 'gingham', label: 'Gingham' }, { id: 'checks', label: 'Checks' },
  { id: 'stars', label: 'Stars' }, { id: 'hearts', label: 'Hearts' }, { id: 'confetti', label: 'Confetti' }, { id: 'leaves', label: 'Leaves' },
  { id: 'blossoms', label: 'Blossoms' }, { id: 'snow', label: 'Snow' }, { id: 'waves', label: 'Waves' }, { id: 'diamonds', label: 'Diamonds' },
];

export function kitFor(o: Occasion): Kit {
  const k = K[o.id];
  const fromEmoji = [...new Set(o.motifs.map(motifFor))];
  const motifs = (k?.[2] ?? fromEmoji).filter((m) => MOTIFS[m]);
  return { motifs: motifs.length ? motifs : ['star', 'heart'], garland: k?.[0] ?? 'bunting', pattern: k?.[1] ?? 'dots', level: 'lots', colors: KIT_COLOURS[o.id] };
}

export const palOf = (o: Occasion): Pal => ({ a: o.colors.accent, s: o.colors.soft, i: o.colors.ink, p: o.colors.paper });
const enc = (svg: string) => `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;

/** CSS variables that dress every photo on the page in washi tape of the kit's pattern. */
export function kitVars(o: Occasion, kit: Kit): Record<string, string> {
  if (kit.level === 'none') return {};
  const p = palOf(o);
  const tape = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="30"><defs>${patternDef('t', kit.pattern, p, 1.6)}</defs><path d="M2 2 L6 0 L10 3 L14 0 L18 2 H102 L106 0 L110 3 L114 0 L118 2 V28 L114 30 L110 27 L106 30 L102 28 H18 L14 30 L10 27 L6 30 L2 28 Z" fill="url(#t)"/></svg>`;
  return { '--dp-tape': enc(tape), '--dp-tape-show': 'block', '--dp-photo-overflow': 'visible' };
}

/** The decoration layer for a page, drawn in a 100 × 100 box over the square page. */
export function kitDecor(o: Occasion, kit: Kit, layout: string, pageIndex: number): string {
  if (kit.level === 'none') return '';
  const p = palOf(o);
  const lots = kit.level === 'lots';
  const m = (k: number) => kit.motifs[k % kit.motifs.length];
  const put = (key: string, x: number, y: number, size: number, rot = 0) =>
    `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${(size / 100).toFixed(3)}) translate(-50 -50)">${(MOTIFS[key] ?? MOTIFS.star)(p)}</g>`;
  const garland = (y = 0, k = pageIndex) => `<g transform="translate(0 ${y})">${garlandSvg(kit.garland, p, k, kit.colors)}</g>`;
  switch (layout) {
    case 'cover':
      // stickers on the cover photo's lower corners, clear of the title however long it is
      return garland() + put(m(0), 11, 50, lots ? 17 : 14, -10) + (lots ? put(m(1), 89, 49, 15, 9) : '');
    case 'chapter':
      // a sticker on the corner of the section's photo, clear of the title
      return garland(0, pageIndex + 3) + put(m(pageIndex), 86, 55, lots ? 20 : 15, 8) + (lots ? put(m(pageIndex + 1), 12, 52, 9, -10) : '');
    case 'closing': {
      // an arc of motifs above the closing words and another below, never over them
      const n = lots ? 5 : 3;
      const arc = (cy: number, up: boolean, off: number) => Array.from({ length: n }, (_, k) => {
        const t = n === 1 ? 0.5 : k / (n - 1), x = 18 + t * 64, y = cy + (up ? -1 : 1) * Math.sin(t * Math.PI) * 5;
        return put(m(k + off), x, y, k % 2 ? 9 : 11.5, ((k * 23) % 30) - 15);
      }).join('');
      return garland(0, pageIndex + 7) + arc(26, true, 0) + arc(77, false, 2);
    }
    case 'quote':
      return put(m(pageIndex), 50, 18, 14) + (lots ? put(m(pageIndex + 1), 18, 84, 9, -12) + put(m(pageIndex + 2), 82, 84, 9, 12) : '');
    default:
      // photo pages: one small stamp in a corner, alternating sides, so the theme carries through quietly
      if (!lots && pageIndex % 2) return '';
      return put(m(pageIndex), pageIndex % 2 ? 93 : 7, 94, 7, pageIndex % 2 ? 10 : -10);
  }
}

/** A small drawn icon for an occasion card. */
export const occasionIcon = (o: Occasion) => {
  const kit = kitFor(o);
  return `<svg viewBox="0 0 100 100" width="34" height="34" aria-hidden="true">${(MOTIFS[kit.motifs[0]] ?? MOTIFS.star)(palOf(o))}</svg>`;
};
