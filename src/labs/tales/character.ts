import { designCharacter, designHead, hasDesign, onTalesDrawing } from './designs';
import { finishInLook } from './looks';
import { STYLES, darken, hexToRgb, rgbToHex, styleFilters, stylizeShapes, type StyleMode } from './styles';
import { thingArt } from './things';

/**
 * Baby Tales characters: soft, rounded, full-body avatars in the spirit of
 * Bitmoji and animated-film storybooks: big glossy eyes with real eye colours,
 * expressive brows and mouths, layered hair with highlights, gentle 3D shading,
 * and clothes with sleeves, trousers and shoes. All drawn as SVG, so a character
 * looks the same in the cast list, the dress-up studio and every story page.
 *
 * Geometry: a 200 × 260 box, head centred at (100, 94). Hats, glasses and
 * extras are separate layers, so they fit every face, drawn or pasted in.
 */

export type Kind = 'baby' | 'kid' | 'adult' | 'elder' | 'dog' | 'cat' | 'bunny';
export type HairStyle =
  | 'tuft' | 'buzz' | 'short' | 'sidepart' | 'messy' | 'quiff' | 'pixie' | 'sides' | 'bob' | 'bangs' | 'curtain' | 'long' | 'wavy' | 'longcurly'
  | 'halfup' | 'ponytail' | 'pigtails' | 'bun' | 'topknot' | 'spacebuns' | 'curly' | 'coils' | 'puff' | 'afro' | 'braids' | 'cornrows' | 'locs' | 'bald'
  | 'crew' | 'slick' | 'sweep' | 'lob' | 'shag' | 'twists';
export type Expression = 'grin' | 'smile' | 'laugh' | 'wow' | 'starry' | 'wink' | 'silly' | 'proud' | 'brave' | 'shy' | 'dreamy' | 'worried' | 'sleepy';
export type Facial = 'none' | 'stubble' | 'moustache' | 'trim' | 'full';
export type Personality = 'sunny' | 'silly' | 'brave' | 'curious' | 'shy' | 'dreamy' | 'cheeky' | 'excited' | 'calm' | 'proud' | 'sleepy';
export type WearSlot = 'hat' | 'glasses' | 'outfit' | 'extra';

export interface Look {
  kind: Kind;
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  eyes?: string;
  /** Set by hand; otherwise the personality's resting face. */
  expression?: Expression;
  personality?: Personality;
  freckles?: boolean;
  lashes?: boolean;
  /** Older looks used a yes/no beard; `facial` replaces it. */
  beard?: boolean;
  facial?: Facial;
  outfit: string;
  hat: string;
  glasses: string;
  extra: string;
  /** Drawn wardrobe pieces, used when that slot is set to "drawn". */
  worn?: Partial<Record<WearSlot, string>>;
  /** An image used as the face (a parent's own picture). */
  face?: string;
  faceScale?: number;
  faceY?: number;
  glassesY?: number;
  /** A drawing used as the whole character. */
  drawing?: string;
  /**
   * Face proportions read from a photo, each −1…1 away from an average face
   * (see likeness/measure.ts). Missing keys mean "average". Identity only:
   * expressions and looks change around these, never these themselves.
   */
  shape?: Partial<Record<'faceWidth' | 'faceLength' | 'jaw' | 'eyeSize' | 'eyeGap' | 'nose' | 'mouth' | 'browHeight' | 'browWeight', number>>;
  /** Body language for this moment (performance, not identity): what the free arm does. */
  pose?: Pose;
  /** What they're doing on this page (performance): walking, running, jumping… */
  action?: Action;
  /** A drawn story thing (by its emoji key) held in the hand, in place of the usual prop. */
  hold?: string;
  /** The story world being drawn (art direction, not identity): posture and finishing light. */
  world?: WorldId;
  /** A world costume's signature colour, carried over from the person's everyday clothes. */
  /** Super Heroes: the costume a parent chose (suit, cape and mask colours, 'none' for no cape or mask, and the emblem). */
  hero?: { suit?: string; cape?: string; mask?: string; emblem?: string };
  accent?: string;
  /** Taller or shorter than most people their age, −1…1 (story pictures only; photos can't tell height). */
  height?: number;
}
export type Pose = 'stand' | 'point' | 'hips' | 'cheer' | 'wave';
/** What someone is doing in a picture. */
export type Action = 'stand' | 'walk' | 'run' | 'jump' | 'sit' | 'wave' | 'cheer' | 'point' | 'dance' | 'sleep';
export const ACTIONS: Record<Action, string> = { stand: 'Stand', walk: 'Walk', run: 'Run', jump: 'Jump', sit: 'Sit', wave: 'Wave', cheer: 'Cheer', point: 'Point', dance: 'Dance', sleep: 'Sleep' };
export type WorldId = 'everyday' | 'fairytale' | 'adventure' | 'mythic' | 'ocean' | 'space';
/**
 * How each story world draws people: its art direction. Identity (skin, hair colour and
 * style, eye colour, face shape, facial hair, glasses: the Character DNA) is never touched;
 * the world decides the build, how the eyes and brows are drawn, the finish on the hair,
 * the light around the character and their stance.
 *
 *   Classic Fairytale: graceful and a little taller, big starry eyes, soft brows, glossy
 *     hair, a rosy glow with twinkles.
 *   Adventure Story: sporty and sturdy, bright lively eyes, windswept hair, wind and dust.
 *   Mythic Hero: tall and broad-shouldered, a determined look with strong angled brows,
 *     a golden rim light and a halo of light behind.
 */
export const WORLD_BODY: Record<WorldId, { head: number; body: number; slim: number }> = {
  everyday: { head: 1, body: 1, slim: 1 },
  fairytale: { head: 0.92, body: 1.1, slim: 0.92 },
  adventure: { head: 0.95, body: 1.04, slim: 1.04 },
  mythic: { head: 0.88, body: 1.16, slim: 1.1 },
  ocean: { head: 0.94, body: 1.06, slim: 0.96 },
  space: { head: 0.98, body: 1, slim: 1.04 },
};
/** Babies stay babies: the world's build is applied gently to little ones. */
const WORLD_BODY_K: Record<string, number> = { baby: 0.35, kid: 0.7, adult: 1, elder: 0.85 };
export function worldBody(world: WorldId | undefined, kind: Kind): { head: number; body: number; slim: number } {
  const b = WORLD_BODY[world ?? 'everyday'], k = WORLD_BODY_K[kind] ?? 0;
  return { head: 1 + (b.head - 1) * k, body: 1 + (b.body - 1) * k, slim: 1 + (b.slim - 1) * k };
}
/** A look's proportions times the world's build, kept within what still reads as the same person. */
function buildOf(base: { head: number; body: number; slim: number }, wb: { head: number; body: number; slim: number }) {
  return { head: Math.max(0.6, base.head * wb.head), body: Math.min(1.75, base.body * wb.body), slim: Math.max(0.82, Math.min(1.2, base.slim * wb.slim)) };
}
/** How each world draws eyes (width, height) and brows (weight, inner end down). */
const WORLD_ART: Record<WorldId, { eye: [number, number]; brow: [number, number] }> = {
  everyday: { eye: [1, 1], brow: [1, 0] },
  fairytale: { eye: [1.1, 1.14], brow: [0.85, -1.5] },
  adventure: { eye: [1.04, 1.04], brow: [1.12, 1] },
  mythic: { eye: [1.04, 0.88], brow: [1.4, 4] },
  ocean: { eye: [1.1, 1.14], brow: [0.85, -1.5] },
  space: { eye: [1.1, 1.14], brow: [0.85, -1.5] },
};
/** The world being drawn right now (set by characterMarkup; 'everyday' for pets, drawings and image faces). */
let WORLD: WorldId = 'everyday';
/** The story world as chosen (WORLD is how faces and bodies are drawn for it). */
let RAW_WORLD: WorldId = 'everyday';

/** A face proportion, clamped, and softened for babies and kids, whose storybook proportions lead. */
export const shapeOf = (l: Look, k: keyof NonNullable<Look['shape']>) =>
  Math.max(-1, Math.min(1, l.shape?.[k] ?? 0)) * (l.kind === 'baby' ? 0.5 : l.kind === 'kid' ? 0.75 : 1);
/** How far each proportion may move the drawing at ±1. Art-directed: enough to recognise, never a caricature. */
export const SHAPE_RANGE = { faceWidth: 0.07, faceLength: 0.06, jaw: 0.14, eyeSize: 0.14, eyeGap: 5, nose: 0.3, mouth: 0.16, browHeight: 4, browWeight: 0.4 } as const;

export const SKIN_TONES = ['#fbe2cf', '#f6d2b7', '#efc19f', '#e4ad86', '#d39a6e', '#bd8259', '#a06b46', '#865637', '#6b4329', '#52321f'];
export const HAIR_COLOURS = ['#1f1a17', '#3b2a20', '#5a3b26', '#7a5236', '#9c6a3f', '#c08b52', '#e0bd78', '#f0d9a4', '#b5532b', '#d97a4a', '#c9c3bb', '#f3f0ea'];
export const EYE_COLOURS = ['#5a3a22', '#2f2018', '#8a6a2f', '#4f7a4a', '#4a7fb5', '#7b8a94'];
export const HAIR_STYLES: Record<HairStyle, string> = {
  tuft: 'Baby curl', buzz: 'Buzz', short: 'Short', sidepart: 'Side part', messy: 'Messy', quiff: 'Swoop', pixie: 'Pixie', sides: 'Sides only',
  bob: 'Bob', bangs: 'Bangs', curtain: 'Curtain bangs', long: 'Long', wavy: 'Wavy', longcurly: 'Long curls', halfup: 'Half up', ponytail: 'Ponytail',
  pigtails: 'Pigtails', bun: 'Bun', topknot: 'Top knot', spacebuns: 'Space buns', curly: 'Curly', coils: 'Short coils', puff: 'Puff', afro: 'Afro',
  braids: 'Braids', cornrows: 'Cornrows', locs: 'Locs', crew: 'Crew cut', slick: 'Slicked back', sweep: 'Side-swept', lob: 'Shoulder length', shag: 'Shag', twists: 'Twists', bald: 'None',
};
export const EXPRESSIONS: Record<Expression, string> = {
  grin: 'Big smile', smile: 'Smile', laugh: 'Giggle', wow: 'Wow', starry: 'Excited', wink: 'Wink', silly: 'Silly', proud: 'Proud',
  brave: 'Brave', shy: 'Shy', dreamy: 'Dreamy', worried: 'Uh-oh', sleepy: 'Sleepy',
};
export const FACIAL: Record<Facial, string> = { none: 'None', stubble: 'Stubble', moustache: 'Moustache', trim: 'Short beard', full: 'Full beard' };

/** Each personality has a resting face, a face for big moments, a way of moving and a line for the story. */
export const PERSONALITIES: Record<Personality, { label: string; blurb: string; rest: Expression; react: Expression; motion: string; line: string }> = {
  sunny: { label: 'Sunny', blurb: 'Always smiling', rest: 'grin', react: 'laugh', motion: 'bounce', line: '{H} has the biggest smile in town.' },
  silly: { label: 'Silly', blurb: 'Makes everyone giggle', rest: 'silly', react: 'laugh', motion: 'wiggle', line: '{H} is the silliest one in the family.' },
  brave: { label: 'Brave', blurb: 'Ready for anything', rest: 'brave', react: 'proud', motion: 'bob', line: 'Nothing is too big for brave {H}!' },
  curious: { label: 'Curious', blurb: 'Wants to see everything', rest: 'wow', react: 'starry', motion: 'sway', line: '{H} wants to know about everything!' },
  shy: { label: 'Shy & sweet', blurb: 'Quiet and kind', rest: 'shy', react: 'smile', motion: 'sway', line: '{H} is quiet, gentle and very kind.' },
  dreamy: { label: 'Dreamy', blurb: 'Head in the clouds', rest: 'dreamy', react: 'smile', motion: 'float', line: '{H} loves to daydream.' },
  cheeky: { label: 'Cheeky', blurb: 'Up to something', rest: 'wink', react: 'laugh', motion: 'wiggle', line: '{H} always has a cheeky plan.' },
  excited: { label: 'Excited', blurb: 'Bouncing off the walls', rest: 'starry', react: 'laugh', motion: 'hop', line: '{H} can hardly wait!' },
  calm: { label: 'Calm & cosy', blurb: 'Gives the best cuddles', rest: 'smile', react: 'grin', motion: 'bob', line: '{H} gives the best cuddles.' },
  proud: { label: 'Can-do', blurb: '“I can do it myself!”', rest: 'proud', react: 'grin', motion: 'bob', line: '{H} likes to say, “I can do it myself!”' },
  sleepy: { label: 'Sleepy', blurb: 'Loves a cosy nap', rest: 'sleepy', react: 'smile', motion: 'float', line: '{H} loves a cosy nap.' },
};

export const HATS: Record<string, string> = {
  none: 'No hat', capback: 'Backwards cap', cap: 'Cap', beanie: 'Beanie', bucket: 'Bucket hat', headphones: 'Headphones', headband: 'Sweatband',
  sunhat: 'Sun hat', visor: 'Visor', beret: 'Beret', bandana: 'Bandana', earmuffs: 'Earmuffs', helmet: 'Bike helmet', catears: 'Cat ears', bunny: 'Bunny ears',
  bow: 'Big bow', clips: 'Hair clips', flowers: 'Flower crown', party: 'Party', propeller: 'Propeller cap', crown: 'Crown', pirate: 'Pirate',
  cowboy: 'Cowboy', chef: 'Chef', wizard: 'Wizard',
  circlet: 'Leaf circlet', tiara: 'Tiara', brimhat: 'Explorer hat', laurel: 'Golden laurel', helm: 'Hero helm',
};
export const GLASSES: Record<string, string> = { none: 'None', round: 'Round', square: 'Square', cateye: 'Cat-eye', sun: 'Sunglasses', aviator: 'Aviators', hearts: 'Hearts', stars: 'Stars', goggles: 'Goggles', mask: 'Hero mask', nose: 'Funny nose' };
export const OUTFITS: Record<string, string> = {
  tee: 'T-shirt', stripes: 'Stripes', overalls: 'Overalls', hoodie: 'Hoodie', sweater: 'Sweater', denim: 'Denim jacket', puffer: 'Puffer', jersey: 'Sports jersey',
  dress: 'Dress', cardigan: 'Cardigan', sailor: 'Sailor', pajamas: 'Pajamas', swimsuit: 'Swimsuit', raincoat: 'Raincoat', snowsuit: 'Snowsuit', party: 'Party dress',
  tutu: 'Tutu', apron: 'Chef', doctor: 'Doctor', firefighter: 'Firefighter', knight: 'Knight', fairy: 'Fairy', bee: 'Bee', dino: 'Dinosaur', pirate: 'Pirate',
  astronaut: 'Astronaut', hero: 'Superhero', supersuit: 'Super suit', none: 'Onesie',
  gown: 'Storybook gown', ftunic: 'Tunic & cape', cloak: 'Hooded cloak',
  explorer: 'Explorer vest', ranger: 'Trail jacket',
  armour: 'Hero armour', sunrobe: 'Sun robe',
};
export const EXTRAS: Record<string, string> = {
  none: 'Nothing', balloon: 'Balloon', teddy: 'Teddy', ball: 'Ball', kite: 'Kite', bubbles: 'Bubbles', floatie: 'Swim ring', book: 'Book', ukulele: 'Ukulele',
  wand: 'Magic wand', pinwheel: 'Pinwheel', net: 'Bug net', dinotoy: 'Toy dino', lollipop: 'Lollipop', cupcake: 'Cupcake', icecream: 'Ice cream',
  flower: 'Flower', bucket: 'Bucket', umbrella: 'Umbrella', sock: 'Sock',
  lantern: 'Lantern', map: 'Map', spyglass: 'Spyglass', shield: 'Sun shield', staff: 'Star staff',
};

/** Where a drawn wardrobe piece sits on a character: x, y, width, height in the 200 × 260 box. */
export const WEAR_BOX: Record<WearSlot, [number, number, number, number]> = {
  hat: [20, -40, 160, 100], glasses: [40, 76, 120, 50], outfit: [30, 140, 140, 120], extra: [126, 80, 90, 175],
};

export const exprOf = (l: Look): Expression =>
  (l.action === 'sleep' ? 'sleepy' : undefined) ?? l.expression ?? (l.personality ? PERSONALITIES[l.personality].rest : l.kind === 'baby' || l.kind === 'kid' ? 'grin' : 'smile');
const facialOf = (l: Look): Facial => l.facial ?? (l.beard ? 'trim' : 'none');

const PETS: Kind[] = ['dog', 'cat', 'bunny'];
export const isPet = (k: Kind) => PETS.includes(k);

let uid = 0;

export const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(k > 0 ? c + (255 - c) * k : c * (1 + k))));
  return `#${[f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
};

/* ── shared gradients ─────────────────────────────────────── */
/** The mode of the character being drawn right now (set by characterMarkup). */
let MODE: StyleMode = 'pocketlight';
/** The look chosen for the book (MODE can be swapped for a world's own drawing; the look's medium still applies). */
let LOOK: StyleMode = 'pocketlight';

function defs(id: string, l: Look, skin: string, fur: string) {
  if (storybook()) return coreDefs(id, l, skin, fur);
  const eye = l.eyes ?? EYE_COLOURS[0];
  const stops = (pairs: [number, string, number?][]) => pairs.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a === undefined ? '' : ` stop-opacity="${a}"`}/>`).join('');
  const blush = `<radialGradient id="bl${id}" cx="50%" cy="50%" r="50%">${stops([[0, '#f27d7d', MODE === 'wondercut' ? 0.45 : 0.55], [MODE === 'wondercut' ? 0.7 : 1, '#f27d7d', MODE === 'wondercut' ? 0.45 : 0], [1, '#f27d7d', 0]])}</radialGradient>`;
  let body = '';
  switch (MODE) {
    case 'gouache': // painted: gentle, low-contrast washes, no gloss
      body = `<radialGradient id="sk${id}" cx="42%" cy="34%" r="80%">${stops([[0, shade(skin, 0.12)], [0.7, skin], [1, shade(skin, -0.06)]])}</radialGradient>
        <linearGradient id="hr${id}" gradientUnits="userSpaceOnUse" x1="70" y1="12" x2="112" y2="212">${stops([[0, shade(l.hair, 0.1)], [0.5, l.hair], [1, shade(l.hair, -0.08)]])}</linearGradient>
        <radialGradient id="fu${id}" cx="42%" cy="34%" r="80%">${stops([[0, shade(fur, 0.12)], [0.6, fur], [1, shade(fur, -0.06)]])}</radialGradient>
        <radialGradient id="ir${id}" cx="50%" cy="40%" r="60%">${stops([[0, shade(eye, 0.2)], [1, shade(eye, -0.15)]])}</radialGradient>
        <linearGradient id="gl${id}" x1="0" y1="0" x2="0" y2="1">${stops([[0, '#fff', 0.08], [1, '#000', 0.04]])}</linearGradient>`;
      break;
    case 'wondercut': // flat paper colours
      body = `<linearGradient id="sk${id}">${stops([[0, skin], [1, skin]])}</linearGradient>
        <linearGradient id="hr${id}">${stops([[0, l.hair], [1, l.hair]])}</linearGradient>
        <linearGradient id="fu${id}">${stops([[0, fur], [1, fur]])}</linearGradient>
        <linearGradient id="ir${id}">${stops([[0, eye], [1, eye]])}</linearGradient>
        <linearGradient id="gl${id}">${stops([[0, '#fff', 0], [1, '#fff', 0]])}</linearGradient>`;
      break;
    case 'inked': // two-tone cel shading with a hard shadow edge
      body = `<radialGradient id="sk${id}" cx="36%" cy="30%" r="82%">${stops([[0, shade(skin, 0.06)], [0.76, skin], [0.76, shade(skin, -0.12)], [1, shade(skin, -0.12)]])}</radialGradient>
        <linearGradient id="hr${id}" gradientUnits="userSpaceOnUse" x1="70" y1="12" x2="112" y2="212">${stops([[0, shade(l.hair, 0.32)], [0.16, shade(l.hair, 0.32)], [0.16, l.hair], [0.62, l.hair], [0.62, shade(l.hair, -0.25)], [1, shade(l.hair, -0.25)]])}</linearGradient>
        <radialGradient id="fu${id}" cx="36%" cy="30%" r="82%">${stops([[0, fur], [0.76, fur], [0.76, shade(fur, -0.15)], [1, shade(fur, -0.15)]])}</radialGradient>
        <radialGradient id="ir${id}" cx="50%" cy="40%" r="60%">${stops([[0, shade(eye, 0.3)], [0.5, eye], [0.5, shade(eye, -0.3)], [1, shade(eye, -0.3)]])}</radialGradient>
        <linearGradient id="gl${id}" x1="0" y1="0" x2="0" y2="1">${stops([[0, '#fff', 0.22], [0.22, '#fff', 0.22], [0.22, '#fff', 0], [0.7, '#000', 0], [0.7, '#000', 0.1], [1, '#000', 0.1]])}</linearGradient>`;
      break;
    default: // Pocketlight 3D: soft volume and gloss
      body = `<radialGradient id="sk${id}" cx="40%" cy="30%" r="78%">${stops([[0, shade(skin, 0.3)], [0.6, skin], [1, shade(skin, -0.14)]])}</radialGradient>
        <linearGradient id="hr${id}" gradientUnits="userSpaceOnUse" x1="70" y1="12" x2="112" y2="212">${stops([[0, shade(l.hair, 0.25)], [0.55, l.hair], [1, shade(l.hair, -0.22)]])}</linearGradient>
        <radialGradient id="fu${id}" cx="40%" cy="30%" r="80%">${stops([[0, shade(fur, 0.3)], [0.6, fur], [1, shade(fur, -0.18)]])}</radialGradient>
        <radialGradient id="ir${id}" cx="50%" cy="40%" r="60%">${stops([[0, shade(eye, 0.45)], [0.6, eye], [1, shade(eye, -0.45)]])}</radialGradient>
        <linearGradient id="gl${id}" x1="0" y1="0" x2="0" y2="1">${stops([[0, '#fff', 0.28], [0.55, '#fff', 0], [1, '#000', 0.08]])}</linearGradient>`;
  }
  return `<defs>${body}${blush}${styleFilters(MODE, id)}</defs>`;
}

/* ── eyes, brows, mouth ───────────────────────────────────── */
const INK = '#2a201c';
const sparkle = (x: number, y: number, r: number, fill = '#f2c14e') =>
  `<path d="M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z" fill="${fill}"/>`;

function eye(id: string, cx: number, cy: number, l: Look, side: -1 | 1) {
  const ex = exprOf(l);
  const lash = l.lashes ? (w: number, h: number) => `<path d="M${cx + side * (w - 2)} ${cy - h * 0.5} Q${cx + side * (w + 3)} ${cy - h * 0.7} ${cx + side * (w + 6)} ${cy - h * 1.05}" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>` : () => '';
  // closed, happy eyes
  if (ex === 'laugh' || ex === 'proud' || (ex === 'wink' && side === 1)) {
    return `<path d="M${cx - 11} ${cy + 3} Q${cx} ${cy - 9} ${cx + 11} ${cy + 3}" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>${l.lashes ? `<path d="M${cx + side * 10} ${cy + 1} l${side * 6} -4" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>` : ''}`;
  }
  // a scrunched, silly eye
  if (ex === 'silly' && side === -1) return `<path d="M${cx - 9} ${cy - 8} L${cx + 8} ${cy} L${cx - 9} ${cy + 8}" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;

  const size = l.kind === 'baby' ? [13, 14, 11] : l.kind === 'kid' ? [12.5, 13, 10] : l.kind === 'adult' ? [11.5, 11, 8.6] : [10.5, 9.5, 7.6];
  const big = ex === 'wow' || ex === 'starry' || (ex === 'silly' && side === 1);
  let [w, h, r] = big ? [size[0] + 1, size[1] + 2, size[2] + 0.6] : size;
  const es = 1 + SHAPE_RANGE.eyeSize * shapeOf(l, 'eyeSize');
  w *= es; h *= es; r *= es;
  const wa = WORLD_ART[WORLD].eye; w *= wa[0]; h *= wa[1]; r *= Math.min(wa[0], wa[1] * 1.06);
  if (MODE === 'inked' && (l.kind === 'adult' || l.kind === 'elder') && !big) { h *= 0.84; w *= 1.06; }
  if (MODE === 'gouache') {
    // picture-book bean eyes: a soft dark oval, a dot of light, no whites
    const [px, py] = ex === 'shy' ? [-2, 2] : ex === 'dreamy' ? [1.5, -3] : [0, 0];
    const k = big ? 1.15 : 1;
    if (ex === 'sleepy') return `<path d="M${cx - w * 0.7} ${cy} Q${cx} ${cy + 5} ${cx + w * 0.7} ${cy}" stroke="${shade(l.eyes ?? EYE_COLOURS[0], -0.6)}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`;
    let g = `<ellipse cx="${cx + px}" cy="${cy + 2 + py}" rx="${w * 0.42 * k}" ry="${h * 0.62 * k}" fill="${shade(l.eyes ?? EYE_COLOURS[0], -0.6)}"/><circle cx="${cx + px - w * 0.14}" cy="${cy + py - h * 0.12}" r="${w * 0.16}" fill="#fff" opacity=".9"/>`;
    if (ex === 'starry') g += sparkle(cx + px, cy + py, w * 0.36, '#fff');
    if (ex === 'brave') g += `<path d="M${cx - w * 0.6} ${cy - h * 0.5} L${cx + w * 0.6} ${cy - h * 0.5 + side * -3}" stroke="url(#sk${id})" stroke-width="${h * 0.5}"/>`;
    return g + (l.lashes ? `<path d="M${cx + side * w * 0.42} ${cy - h * 0.45} l${side * 5} -4" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>` : '');
  }
  // hand-drawn film eyes: Classic Ink always; Fairytale and Mythic worlds in the 3D look too
  const filmEyes = MODE === 'inked' || (MODE === 'pocketlight' && (WORLD === 'fairytale' || WORLD === 'mythic'));
  if (filmEyes && (l.kind === 'adult' || l.kind === 'elder' || l.kind === 'kid') && !['sleepy'].includes(ex)) {
    // hand-drawn almond eyes: white, a large iris, a heavy upper lid that sweeps out
    const ew = w * 1.12 * (WORLD === 'fairytale' ? 1.06 : 1), eh = h * (l.kind === 'kid' ? 0.95 : 0.78) * (big ? 1.2 : 1) * (WORLD === 'fairytale' ? 1.12 : 1);
    const [gx2, gy2] = ex === 'shy' ? [-2.5, 2] : ex === 'dreamy' ? [1.5, -2.5] : [0, 0];
    const clip2 = `ea${id}${side}`;
    const inner = cx - side * ew, outer = cx + side * ew;
    const almond = `M${inner} ${cy + 1} Q${cx - side * ew * 0.2} ${cy - eh * 1.25} ${outer} ${cy - eh * 0.25} Q${cx + side * ew * 0.3} ${cy + eh * 1.05} ${inner} ${cy + 1} Z`;
    const ir = Math.min(ew, eh) * 0.82;
    // a hero's steady, determined lid
    const lidDrop = ex === 'brave' ? eh * 0.5 : ex === 'dreamy' ? eh * 0.6 : WORLD === 'mythic' && !big ? eh * 0.14 : 0;
    return `<clipPath id="${clip2}"><path d="${almond}"/></clipPath><path d="${almond}" fill="#fff"/>
      <g clip-path="url(#${clip2})"><circle cx="${cx + gx2}" cy="${cy + gy2}" r="${ir}" fill="url(#ir${id})"/><circle cx="${cx + gx2}" cy="${cy + gy2}" r="${ir * 0.45}" fill="#120d0b"/><circle cx="${cx + gx2 - ir * 0.32}" cy="${cy + gy2 - ir * 0.38}" r="${ir * 0.28}" fill="#fff"/>
      ${lidDrop ? `<rect x="${cx - ew - 2}" y="${cy - eh * 1.4}" width="${ew * 2 + 4}" height="${eh * 0.4 + lidDrop + eh}" fill="url(#sk${id})"/>` : ''}</g>
      <path d="M${inner} ${cy + 1} Q${cx - side * ew * 0.2} ${cy - eh * 1.25 + lidDrop} ${outer + side * 3} ${cy - eh * 0.45}" stroke="${INK}" stroke-width="4.2" fill="none" stroke-linecap="round"/>
      <path d="M${cx - side * ew * 0.1} ${cy + eh * 0.85} Q${cx + side * ew * 0.45} ${cy + eh * 0.7} ${outer - side * 1} ${cy + eh * 0.05}" stroke="${shade(l.skin, -0.4)}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      ${l.lashes ? `<path d="M${outer + side * 2} ${cy - eh * 0.4} l${side * 6} -5 M${outer - side * 2} ${cy - eh * 0.75} l${side * 4} -6" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>` : WORLD === 'fairytale' ? `<path d="M${outer + side * 2} ${cy - eh * 0.42} l${side * 5} -3" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>` : ''}`;
  }
  if (MODE === 'wondercut') {
    // cut paper: a solid dark oval with one punched-out highlight
    const [px, py] = ex === 'shy' ? [-2, 2] : ex === 'dreamy' ? [1.5, -3] : [0, 0];
    let g = `<ellipse cx="${cx + px}" cy="${cy + 1 + py}" rx="${w * 0.72}" ry="${h * 0.86}" fill="${shade(l.eyes ?? EYE_COLOURS[0], -0.55)}"/><circle cx="${cx + px - w * 0.22}" cy="${cy + py - h * 0.25}" r="${w * 0.26}" fill="#fff"/>`;
    if (ex === 'sleepy') g = `<path d="M${cx - w} ${cy} Q${cx} ${cy + 5} ${cx + w} ${cy}" stroke="${INK}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`;
    if (ex === 'starry') g += sparkle(cx + px, cy + py, w * 0.5, '#fff');
    return g + (l.lashes ? `<path d="M${cx + side * w * 0.6} ${cy - h * 0.7} l${side * 5} -4" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>` : '');
  }
  const [gx, gy] = ex === 'shy' ? [-2, 2] : ex === 'dreamy' ? [1.5, -4] : ex === 'worried' ? [0, -1] : [0, 0];
  const ix = cx + side * 0.5 + gx, iy = cy + 1 + gy;
  const clip = `ec${id}${side}`;
  const shine = ex === 'starry'
    ? sparkle(ix - r * 0.15, iy - r * 0.2, r * 0.62, '#fff') + `<circle cx="${ix + r * 0.45}" cy="${iy + r * 0.45}" r="${r * 0.15}" fill="#fff"/>`
    : `<circle cx="${ix - r * 0.35}" cy="${iy - r * 0.4}" r="${r * 0.38}" fill="#fff"/><circle cx="${ix + r * 0.42}" cy="${iy + r * 0.42}" r="${r * 0.17}" fill="#fff" opacity=".85"/>`;
  // a lowered upper lid gives brave, dreamy and shy eyes their look; brave tilts down toward the nose
  const [frac, tilt] = ex === 'brave' ? [0.34, 6] : ex === 'dreamy' ? [0.2, 0] : ex === 'shy' ? [0.16, -2] : [0, 0];
  const top = cy - h + 2 * h * frac;
  const innerX = cx - side * w, outerX = cx + side * w;
  const lidLine = `M${outerX} ${top - tilt * 0.3} L${innerX} ${top + tilt}`;
  const lid = frac ? `<path d="M${outerX} ${cy - h - 4} L${innerX} ${cy - h - 4} L${innerX} ${top + tilt} L${outerX} ${top - tilt * 0.3} Z" fill="url(#sk${id})"/>` : '';
  let s = `<clipPath id="${clip}"><ellipse cx="${cx}" cy="${cy}" rx="${w}" ry="${h}"/></clipPath>
    <ellipse cx="${cx}" cy="${cy}" rx="${w}" ry="${h}" fill="#fff"/>
    <g clip-path="url(#${clip})">
      <circle cx="${ix}" cy="${iy}" r="${r}" fill="url(#ir${id})"/>
      <circle cx="${ix}" cy="${iy}" r="${r * 0.5}" fill="#120d0b"/>
      ${shine}
      <ellipse cx="${cx}" cy="${cy - h}" rx="${w + 2}" ry="${h * 0.35}" fill="#000" opacity=".08"/>
      ${lid}
    </g>`;
  s += frac
    ? `<path d="${lidLine}" stroke="${INK}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`
    : `<path d="M${cx - w - 0.5} ${cy + 1} Q${cx} ${cy - h * 1.38} ${cx + w + 0.5} ${cy + 1}" stroke="${INK}" stroke-width="${(l.kind === 'baby' ? 2.6 : 3.2) * (MODE === 'inked' ? 1.35 : 1)}" fill="none" stroke-linecap="round"/>`;
  s += lash(w, h);
  if (ex === 'sleepy') s += `<path d="M${cx - w - 1} ${cy + 1} Q${cx} ${cy - h * 1.4} ${cx + w + 1} ${cy + 1} L${cx + w + 1} ${cy - 1} Q${cx} ${cy - 1} ${cx - w - 1} ${cy - 1} Z" fill="url(#sk${id})"/><path d="M${cx - w} ${cy} Q${cx} ${cy + 3} ${cx + w} ${cy}" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  if (l.kind === 'elder') s += `<path d="M${cx + side * (w + 3)} ${cy - 2} l${side * 5} -2 M${cx + side * (w + 3)} ${cy + 3} l${side * 5} 2" stroke="${shade(l.skin, -0.28)}" stroke-width="1.6" stroke-linecap="round"/>`;
  return s;
}

/** Brow height and tilt for each expression: [lift, inner end down (+) or up (−)]. */
const BROWS: Partial<Record<Expression, [number, number]>> = {
  wow: [-6, 0], starry: [-5, 0], sleepy: [2, 0], brave: [1, 5], worried: [-3, -7], shy: [-2, -4], dreamy: [-3, -1], proud: [-2, 1], silly: [-3, 3],
};
function brows(l: Look) {
  if (l.face) return '';
  const ex = exprOf(l);
  const c = l.kind === 'baby' ? shade(l.hair, 0.15) : shade(l.hair, -0.25);
  const [lift, inner0] = BROWS[ex] ?? [0, 0];
  const wa = WORLD_ART[WORLD].brow, inner = inner0 + (l.kind === 'baby' ? wa[1] * 0.4 : wa[1]);
  const w = (l.kind === 'baby' ? 2.4 : 4) * (MODE === 'inked' ? 1.3 : 1) * (1 + SHAPE_RANGE.browWeight * shapeOf(l, 'browWeight')) * (l.kind === 'baby' ? 1 + (wa[0] - 1) * 0.4 : wa[0]);
  const o = l.kind === 'baby' ? 0.6 : 1;
  const up = -SHAPE_RANGE.browHeight * shapeOf(l, 'browHeight');
  const left = (ex === 'wink' ? lift - 5 : ex === 'silly' ? lift + 4 : lift) + up;
  const right = (ex === 'wink' ? lift + 2 : lift) + up;
  const g = SHAPE_RANGE.eyeGap * shapeOf(l, 'eyeGap');
  return `<path d="M${66 - g} ${82 + left} Q${77 - g} ${75 + left} ${89 - g} ${80 + left + inner}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" opacity="${o}"/>
    <path d="M${111 + g} ${80 + right + inner} Q${123 + g} ${75 + right} ${134 + g} ${82 + right}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" opacity="${o}"/>`;
}

function mouth(id: string, l: Look) {
  const ex = exprOf(l);
  const lip = '#7a3329';
  const teeth = l.kind !== 'baby';
  const open = (big: boolean) => {
    const d = big ? 'M83 121 Q100 126 117 121 Q115 146 100 147 Q85 146 83 121 Z' : 'M86 123 Q100 127 114 123 Q112 141 100 142 Q88 141 86 123 Z';
    return `<clipPath id="mc${id}"><path d="${d}"/></clipPath><path d="${d}" fill="${lip}"/>
      <g clip-path="url(#mc${id})">${teeth ? `<rect x="80" y="${big ? 118 : 120}" width="40" height="${big ? 9 : 7.5}" rx="3" fill="#fff"/>` : ''}<ellipse cx="100" cy="${big ? 145 : 140}" rx="${big ? 11 : 9}" ry="6" fill="#ef7b86"/></g>`;
  };
  const line = (d: string, w = 3.4) => `<path d="${d}" stroke="${lip}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
  switch (ex) {
    case 'smile': return line('M87 125 Q100 137 113 125') + `<path d="M84 123 Q86 126 88 126 M116 123 Q114 126 112 126" stroke="${lip}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".5"/>`;
    case 'wow': return `<ellipse cx="100" cy="131" rx="7" ry="8.5" fill="${lip}"/><ellipse cx="100" cy="135" rx="4.5" ry="3" fill="#e8737d"/>`;
    case 'sleepy': return line('M93 128 Q100 133 107 128', 3);
    case 'wink': return line('M85 125 Q101 137 116 120') + `<path d="M117 118 q3 2 2 6" stroke="${lip}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".5"/>`;
    case 'brave': return line('M87 125 Q101 133 115 121', 3.6);
    case 'shy': return line('M93 127 Q100 132 107 127', 3);
    case 'dreamy': return line('M90 126 Q100 133 110 126', 3.2);
    case 'proud': return line('M84 122 Q100 139 116 122', 3.8) + `<path d="M82 120 q2 3 5 3 M118 120 q-2 3 -5 3" stroke="${lip}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".5"/>`;
    case 'worried': return line('M89 131 Q94 126 100 130 Q106 134 111 129', 3);
    case 'silly': return open(false) + `<path d="M94 136 Q94 152 102 152 Q110 152 110 136 Z" fill="#ef7b86"/><path d="M102 139 v8" stroke="#d65a68" stroke-width="1.6" stroke-linecap="round"/>`;
    case 'starry': case 'laugh': return open(true);
    default: return open(false);
  }
}

/** Little extras that sell a feeling: sparkles, a sweat drop, a sleepy z. */
function flair(l: Look) {
  if (l.face || l.drawing) return '';
  switch (exprOf(l)) {
    case 'starry': return sparkle(34, 56, 7) + sparkle(168, 48, 8) + sparkle(160, 70, 4);
    case 'dreamy': return sparkle(160, 46, 6, '#b9a5e3') + sparkle(172, 64, 4, '#f4a3b5') + sparkle(150, 30, 3.5, '#f2c14e');
    case 'worried': return `<path d="M156 62 Q164 74 160 80 Q154 84 150 78 Q148 72 156 62 Z" fill="#9fd3ec" stroke="#6fb3d4" stroke-width="1.5"/>`;
    case 'sleepy': return `<text x="150" y="48" font-size="20" font-weight="700" font-family="Poppins,Inter,sans-serif" fill="#8a7fa5">z</text><text x="166" y="32" font-size="14" font-weight="700" font-family="Poppins,Inter,sans-serif" fill="#8a7fa5" opacity=".7">z</text>`;
    case 'proud': return sparkle(40, 62, 5);
    default: return '';
  }
}

/* ── hair: a back layer (behind the head) and a front layer ──── */
function hair(id: string, l: Look): [string, string] {
  const H = `url(#hr${id})`;
  const c = l.hair;
  const dark = shade(c, -0.3), light = shade(c, 0.35);
  const shine = (d: string) => `<path d="${d}" stroke="${light}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".55"/>`;
  const curl = (x: number, y: number, r: number) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${H}"/><path d="M${x - r * 0.5} ${y + r * 0.1} Q${x} ${y - r * 0.65} ${x + r * 0.5} ${y + r * 0.1}" stroke="${dark}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".7"/><path d="M${x - r * 0.45} ${y - r * 0.45} Q${x - r * 0.1} ${y - r * 0.75} ${x + r * 0.2} ${y - r * 0.6}" stroke="${light}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".6"/>`;
  const cap = `<path d="M42 92 C38 52 64 32 100 32 C136 32 162 52 158 92 C152 74 140 64 124 62 C108 70 88 70 72 62 C58 66 46 76 42 92 Z" fill="${H}"/>`;
  const fringe = `<path d="M44 90 C44 52 68 33 100 33 C134 33 158 54 156 90 C150 72 138 63 122 61 C110 70 90 72 74 66 C62 66 50 76 44 90 Z" fill="${H}"/>${shine('M66 50 Q84 40 104 41')}`;
  switch (l.hairStyle) {
    case 'tuft': return ['', `<path d="M95 40 C90 25 110 19 115 29 C118 36 109 39 106 34" stroke="${c}" stroke-width="5.5" fill="none" stroke-linecap="round"/><path d="M80 44 q4 -6 8 -2 M118 44 q4 -6 8 -1" stroke="${c}" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".6"/>`];
    case 'buzz': return ['', `<path d="M43 88 C42 50 66 33 100 33 C134 33 158 50 157 88 C150 70 128 62 100 62 C72 62 50 70 43 88 Z" fill="${c}" opacity=".9"/>${Array.from({ length: 22 }, (_, i) => `<circle cx="${52 + (i * 37) % 96}" cy="${42 + (i * 23) % 22}" r="1.2" fill="${dark}" opacity=".5"/>`).join('')}`];
    case 'short': return ['', `<path d="M40 94 C34 50 62 28 102 28 C142 28 168 52 160 96 C156 78 148 68 138 62 C122 68 96 70 70 60 C56 68 46 80 40 94 Z" fill="${H}"/><path d="M70 60 C88 46 118 44 138 62 C118 56 96 58 80 68 Z" fill="${dark}" opacity=".35"/>${shine('M72 44 Q96 34 124 40')}`];
    case 'sides': return [`<path d="M40 118 C34 92 40 74 50 70 L54 110 Z M160 118 C166 92 160 74 150 70 L146 110 Z" fill="${H}"/>`, `<path d="M38 104 C36 86 42 76 52 72 C50 86 50 98 54 110 Z M162 104 C164 86 158 76 148 72 C150 86 150 98 146 110 Z" fill="${H}"/>`];
    case 'bob': return [`<path d="M32 112 C26 50 60 26 100 26 C140 26 174 50 168 112 C168 132 162 146 152 150 L150 100 L50 100 L48 150 C38 146 32 132 32 112 Z" fill="${H}"/>`, fringe];
    case 'long': return [`<path d="M30 104 C24 46 60 24 100 24 C140 24 176 46 170 104 L176 192 C164 204 146 200 138 190 L138 106 L62 106 L62 190 C54 200 36 204 24 192 Z" fill="${H}"/>`, `<path d="M42 96 C40 52 70 31 100 31 C136 31 160 52 158 92 C150 72 134 60 110 58 C96 68 70 68 54 76 C48 82 44 88 42 96 Z" fill="${H}"/>${shine('M62 52 Q86 38 112 40')}`];
    case 'wavy': return [`<path d="M30 104 C24 46 60 24 100 24 C140 24 176 46 170 104 Q180 124 168 140 Q180 160 170 178 Q176 196 156 196 Q146 190 140 180 L138 106 L62 106 L60 180 Q54 190 44 196 Q24 196 30 178 Q20 160 32 140 Q20 124 30 104 Z" fill="${H}"/><path d="M34 140 Q44 150 36 166 M166 140 Q156 150 164 166" stroke="${dark}" stroke-width="2.5" fill="none" opacity=".5"/>`, fringe];
    case 'ponytail': return [`<path d="M146 60 C178 64 192 108 180 152 C176 166 162 166 164 150 C172 120 164 92 144 80 Z" fill="${H}"/><path d="M158 120 Q172 132 166 150" stroke="${dark}" stroke-width="2.5" fill="none" opacity=".45"/>`, `${cap}<circle cx="150" cy="70" r="7" fill="#e86f5b"/>${shine('M66 48 Q88 38 112 40')}`];
    case 'pigtails': return [`<ellipse cx="32" cy="110" rx="17" ry="24" fill="${H}" transform="rotate(18 32 110)"/><ellipse cx="168" cy="110" rx="17" ry="24" fill="${H}" transform="rotate(-18 168 110)"/>`, `${cap}<circle cx="44" cy="92" r="6.5" fill="#e86f5b"/><circle cx="156" cy="92" r="6.5" fill="#e86f5b"/>${shine('M66 48 Q88 38 112 40')}`];
    case 'bun': return [`<circle cx="100" cy="26" r="19" fill="${H}"/><path d="M86 22 Q100 12 114 22" stroke="${dark}" stroke-width="2.5" fill="none" opacity=".5"/>`, `${cap}<rect x="86" y="38" width="28" height="5" rx="2.5" fill="${dark}" opacity=".6"/>${shine('M66 50 Q86 40 108 42')}`];
    case 'curly': {
      const back: string[] = [];
      for (let a = 150; a <= 390; a += 20) {
        const t = (a * Math.PI) / 180;
        back.push(curl(100 + 64 * Math.cos(t), 88 + 58 * Math.sin(t), 18));
      }
      const front = [50, 66, 82, 98, 114, 130, 146].map((x, i) => curl(x, 62 + Math.abs(i - 3) * 4 - (i % 2) * 3, 14)).join('');
      return [`<ellipse cx="100" cy="84" rx="66" ry="56" fill="${H}"/>${back.join('')}`, `<path d="M44 84 C46 50 70 36 100 36 C130 36 154 50 156 84 C148 70 130 64 100 64 C70 64 52 70 44 84 Z" fill="${H}"/>${front}`];
    }
    case 'afro': {
      const puff: string[] = [];
      for (let ring = 0; ring < 3; ring++) {
        const rx = 76 - ring * 20, ry = 70 - ring * 18, n = 16 - ring * 4;
        for (let i = 0; i < n; i++) {
          const t = Math.PI + (i / (n - 1)) * Math.PI * 1.35 - 0.2;
          puff.push(curl(100 + rx * Math.cos(t), 76 + ry * Math.sin(t) * (Math.sin(t) > 0 ? 0.55 : 1), 19 - ring * 2));
        }
      }
      const front = [52, 68, 84, 100, 116, 132, 148].map((x, i) => curl(x, 60 + Math.abs(i - 3) * 4, 12)).join('');
      return [`<ellipse cx="100" cy="76" rx="78" ry="70" fill="${H}"/>${puff.join('')}`, `<path d="M42 88 C46 56 70 44 100 44 C130 44 154 56 158 88 C150 72 128 66 100 66 C72 66 50 72 42 88 Z" fill="${H}"/>${front}`];
    }
    case 'braids': {
      const braid = (x: number, dir: number) => Array.from({ length: 7 }, (_, i) => `<ellipse cx="${x + dir * i * 0.8}" cy="${112 + i * 13}" rx="10" ry="8" fill="${H}" stroke="${dark}" stroke-width="1.4" stroke-opacity=".5"/>`).join('') + `<circle cx="${x + dir * 6}" cy="${206}" r="5" fill="#e86f5b"/>`;
      return [`${braid(40, -1)}${braid(160, 1)}`, `<path d="M42 92 C38 52 64 32 100 32 C136 32 162 52 158 92 C152 74 136 64 104 62 L100 40 L96 62 C64 64 48 74 42 92 Z" fill="${H}"/>${shine('M66 50 Q80 42 94 42')}`];
    }
    case 'sidepart': return ['', `<path d="M40 96 C34 52 60 28 100 28 C142 28 166 52 160 96 C156 76 146 64 132 58 C112 62 84 54 70 40 C64 58 52 74 40 96 Z" fill="${H}"/><path d="M70 40 Q78 34 86 30" stroke="${dark}" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".6"/><path d="M78 44 Q108 40 134 56" stroke="${dark}" stroke-width="2" fill="none" opacity=".3"/>${shine('M88 38 Q114 34 136 46')}`];
    case 'messy': return ['', `<path d="M40 94 C36 58 52 36 70 30 L66 16 L82 26 L90 10 L102 25 L114 12 L118 28 L136 18 L134 34 C154 44 166 66 160 96 C156 78 146 68 134 62 C116 72 92 70 72 62 C58 68 46 80 40 94 Z" fill="${H}"/><path d="M74 60 Q90 52 104 60 M108 58 Q122 50 136 60" stroke="${dark}" stroke-width="2.2" fill="none" opacity=".4"/>${shine('M74 40 Q94 32 116 36')}`];
    case 'quiff': return ['', `<path d="M42 94 C38 58 56 36 84 32 C90 16 122 6 144 20 C130 22 124 28 126 36 C150 46 164 66 158 96 C152 76 138 64 120 60 C100 68 76 66 62 62 C52 70 46 82 42 94 Z" fill="${H}"/><path d="M90 30 Q110 14 136 20" stroke="${dark}" stroke-width="2.4" fill="none" opacity=".4"/>${shine('M96 26 Q116 14 134 18')}`];
    case 'pixie': return ['', `<path d="M40 102 C32 52 62 28 102 28 C142 28 168 52 160 102 C158 86 154 76 148 70 C140 76 126 78 112 72 C96 82 72 84 54 76 C48 84 42 94 40 102 Z" fill="${H}"/><path d="M60 72 Q90 66 112 72" stroke="${dark}" stroke-width="2.2" fill="none" opacity=".4"/>${shine('M70 44 Q96 34 126 40')}`];
    case 'bangs': return [
      `<path d="M30 108 C26 48 60 26 100 26 C140 26 174 48 170 108 L172 158 Q160 168 148 160 L148 104 L52 104 L52 160 Q40 168 28 158 Z" fill="${H}"/>`,
      `<path d="M44 78 C38 46 66 28 100 28 C134 28 162 46 156 78 Q100 86 44 78 Z" fill="${H}"/><path d="M44 78 C40 92 40 106 44 116 L52 114 C48 102 48 90 52 80 Z M156 78 C160 92 160 106 156 116 L148 114 C152 102 152 90 148 80 Z" fill="${H}"/><path d="M70 60 L68 80 M86 58 L85 82 M102 58 L102 82 M118 58 L119 82 M134 60 L136 80" stroke="${dark}" stroke-width="1.8" opacity=".35"/>${shine('M64 44 Q90 34 118 38')}`,
    ];
    case 'curtain': return [
      `<path d="M30 104 C24 46 60 24 100 24 C140 24 176 46 170 104 L174 182 C162 196 146 192 138 182 L138 106 L62 106 L62 182 C54 192 38 196 26 182 Z" fill="${H}"/>`,
      `<path d="M42 104 C36 50 66 30 100 32 C134 30 164 50 158 104 C154 82 140 68 120 66 C110 62 104 52 100 44 C96 52 90 62 80 66 C60 68 46 82 42 104 Z" fill="${H}"/>${shine('M108 40 Q130 40 146 54')}${shine('M58 58 Q70 44 90 40')}`,
    ];
    case 'longcurly': {
      const side = [0, 1, 2, 3, 4, 5].map((i) => curl(32 + (i % 2) * 6, 100 + i * 17, 15) + curl(168 - (i % 2) * 6, 100 + i * 17, 15)).join('');
      const front = [52, 70, 88, 106, 124, 142].map((x, i) => curl(x, 58 + Math.abs(i - 2.5) * 4, 13)).join('');
      return [`<path d="M28 104 C22 46 60 24 100 24 C140 24 178 46 172 104 L174 196 L26 196 Z" fill="${H}"/>${side}`, `<path d="M44 90 C44 52 70 36 100 36 C130 36 156 52 156 90 C148 72 130 64 100 64 C70 64 52 72 44 90 Z" fill="${H}"/>${front}`];
    }
    case 'crew': return ['', `<path d="M42 90 C38 54 62 34 100 34 C138 34 162 54 158 90 C154 76 146 68 134 64 C118 60 82 60 66 64 C54 68 46 76 42 90 Z" fill="${H}"/>${Array.from({ length: 16 }, (_, i) => `<path d="M${56 + (i * 37) % 88} ${46 + (i * 17) % 18} l1.6 -3.4" stroke="${dark}" stroke-width="1.4" stroke-linecap="round" opacity=".35"/>`).join('')}${shine('M70 46 Q96 38 124 44')}`];
    case 'slick': return ['', `<path d="M40 96 C34 52 62 28 100 28 C138 28 166 52 160 96 C158 80 152 70 144 64 C126 52 74 52 56 64 C48 70 42 80 40 96 Z" fill="${H}"/><path d="M60 62 Q80 40 112 36 M74 60 Q94 42 124 40 M92 56 Q112 44 136 46 M110 54 Q128 48 146 56" stroke="${dark}" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".38"/>${shine('M66 50 Q92 34 126 38')}`];
    case 'sweep': return [
      `<path d="M30 104 C24 46 60 24 100 24 C140 24 176 46 170 104 L176 192 C164 204 146 200 138 190 L138 106 L62 106 L62 190 C54 200 36 204 24 192 Z" fill="${H}"/>`,
      `<path d="M42 104 C36 52 66 30 104 30 C138 30 162 52 158 96 C156 80 150 70 142 64 C126 74 102 80 78 76 C64 74 52 82 46 94 Z" fill="${H}"/><path d="M44 102 C48 80 70 66 104 64 C122 63 136 62 146 58" stroke="${dark}" stroke-width="2" fill="none" opacity=".35"/><path d="M126 34 Q118 38 112 46" stroke="${dark}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".45"/>${shine('M62 52 Q86 40 114 42')}`,
    ];
    case 'lob': return [
      `<path d="M32 108 C26 48 60 26 100 26 C140 26 174 48 168 108 C170 130 168 148 162 160 Q150 164 146 154 L146 102 L54 102 L54 154 Q50 164 38 160 C32 148 30 130 32 108 Z" fill="${H}"/><path d="M40 152 Q46 160 54 154 M146 154 Q154 160 160 152" stroke="${dark}" stroke-width="2" fill="none" opacity=".4"/>`,
      `<path d="M42 100 C38 50 68 32 100 32 C132 32 162 50 158 100 C154 80 142 66 120 62 C110 58 104 48 100 40 C96 48 90 58 80 62 C58 66 46 80 42 100 Z" fill="${H}"/>${shine('M108 42 Q128 42 142 56')}${shine('M58 58 Q70 46 88 42')}`,
    ];
    case 'shag': {
      return [
        `<path d="M30 104 C24 46 60 24 100 24 C140 24 176 46 170 104 L170 140 Q166 150 160 146 Q158 158 150 156 Q148 150 144 148 L144 104 L56 104 L56 148 Q52 150 50 156 Q42 158 40 146 Q34 150 30 140 Z" fill="${H}"/><path d="M38 120 Q42 134 40 144 M162 120 Q158 134 160 144 M50 126 Q52 140 50 152 M150 126 Q148 140 150 152" stroke="${dark}" stroke-width="1.8" fill="none" opacity=".35"/>`,
        `<path d="M42 92 C40 50 68 30 100 30 C132 30 160 50 158 92 L148 80 L138 92 L128 76 L116 88 L106 74 L94 88 L84 74 L72 90 L62 78 L52 92 Z" fill="${H}"/><path d="M68 74 L74 54 M96 72 L100 50 M124 74 L120 54" stroke="${dark}" stroke-width="1.8" fill="none" opacity=".35"/>${shine('M66 48 Q90 38 116 40')}`,
      ];
    }
    case 'twists': {
      const tw = (x: number, y: number, len: number, ang: number) => { const t = (ang * Math.PI) / 180, ex = x + Math.cos(t) * len, ey = y + Math.sin(t) * len; return `<path d="M${x.toFixed(1)} ${y.toFixed(1)} L${ex.toFixed(1)} ${ey.toFixed(1)}" stroke="${H}" stroke-width="9" stroke-linecap="round"/><path d="M${x.toFixed(1)} ${y.toFixed(1)} L${ex.toFixed(1)} ${ey.toFixed(1)}" stroke="${dark}" stroke-width="9" stroke-dasharray="2.5 4" stroke-linecap="round" opacity=".35"/>`; };
      const back: string[] = [], front: string[] = [];
      for (let a = 150; a <= 390; a += 9) { const t = (a * Math.PI) / 180, down = a < 200 || a > 340; back.push(tw(100 + 56 * Math.cos(t), 84 + 48 * Math.sin(t), down ? 16 : 9, down ? 90 + (a > 340 ? -15 : 15) : a)); }
      for (let a = 200; a <= 340; a += 12) { const t = (a * Math.PI) / 180; front.push(tw(100 + 44 * Math.cos(t), 70 + 34 * Math.sin(t), 8, a)); }
      return [`<ellipse cx="100" cy="82" rx="62" ry="54" fill="${H}"/>${back.join('')}`, `<path d="M42 90 C40 52 66 34 100 34 C134 34 160 52 158 90 C150 72 130 64 100 64 C70 64 50 72 42 90 Z" fill="${H}"/>${front.join('')}`];
    }
    case 'halfup': return [
      `<path d="M30 104 C24 46 60 24 100 24 C140 24 176 46 170 104 L174 182 C162 196 146 192 138 182 L138 106 L62 106 L62 182 C54 192 38 196 26 182 Z" fill="${H}"/><circle cx="100" cy="26" r="15" fill="${H}"/>`,
      `${cap}<path d="M88 30 Q100 36 112 30" stroke="#e86f5b" stroke-width="5" fill="none" stroke-linecap="round"/>${shine('M66 50 Q88 40 112 42')}`,
    ];
    case 'topknot': return [
      `<circle cx="100" cy="22" r="16" fill="${H}"/><path d="M88 18 Q100 10 112 18" stroke="${dark}" stroke-width="2.2" fill="none" opacity=".5"/>`,
      `<path d="M44 92 C40 52 66 32 100 32 C134 32 160 52 156 92 C150 70 132 58 100 56 C68 58 50 70 44 92 Z" fill="${H}"/><path d="M64 70 Q78 46 96 36 M136 70 Q122 46 104 36 M100 56 L100 36" stroke="${dark}" stroke-width="2" fill="none" opacity=".35"/><rect x="90" y="32" width="20" height="6" rx="3" fill="${dark}" opacity=".7"/>`,
    ];
    case 'spacebuns': return [
      `<circle cx="58" cy="40" r="21" fill="${H}"/><circle cx="142" cy="40" r="21" fill="${H}"/><path d="M46 36 Q58 26 70 36 M130 36 Q142 26 154 36" stroke="${dark}" stroke-width="2.2" fill="none" opacity=".45"/>`,
      `${cap}<path d="M100 34 L100 62" stroke="${dark}" stroke-width="2" opacity=".35"/>${shine('M66 50 Q80 42 94 42')}${shine('M108 42 Q122 42 134 50')}`,
    ];
    case 'coils': {
      const coils: string[] = [];
      for (let a = 190; a <= 350; a += 16) { const t = (a * Math.PI) / 180; coils.push(curl(100 + 56 * Math.cos(t), 72 + 36 * Math.sin(t), 11)); }
      for (let a = 210; a <= 330; a += 24) { const t = (a * Math.PI) / 180; coils.push(curl(100 + 30 * Math.cos(t), 66 + 20 * Math.sin(t), 10)); }
      return ['', `<path d="M42 92 C40 50 66 32 100 32 C134 32 160 50 158 92 C150 72 128 64 100 64 C72 64 50 72 42 92 Z" fill="${H}"/>${coils.join('')}`];
    }
    case 'puff': {
      const ring: string[] = [];
      for (let i = 0; i < 12; i++) { const t = (i / 12) * Math.PI * 2; ring.push(curl(100 + 28 * Math.cos(t), 20 + 24 * Math.sin(t), 14)); }
      return [
        `<circle cx="100" cy="20" r="36" fill="${H}"/>${ring.join('')}${curl(100, 18, 15)}`,
        `<path d="M42 92 C38 52 64 32 100 32 C136 32 162 52 158 92 C150 74 132 64 100 62 C68 64 50 74 42 92 Z" fill="${H}"/><path d="M58 76 Q74 50 96 40 M142 76 Q126 50 104 40 M80 64 Q90 48 98 40 M120 64 Q110 48 102 40" stroke="${light}" stroke-width="1.8" fill="none" opacity=".45"/><rect x="86" y="34" width="28" height="7" rx="3.5" fill="#e86f5b"/>`,
      ];
    }
    case 'cornrows': {
      const rows = [56, 72, 88, 100, 112, 128, 144].map((x) => `<path d="M${x} ${74 - Math.abs(x - 100) * 0.18} Q${100 + (x - 100) * 0.7} 48 ${100 + (x - 100) * 0.45} 30" stroke="${dark}" stroke-width="3" stroke-dasharray="4 3" fill="none" opacity=".55"/>`).join('');
      return [`<path d="M60 120 Q56 150 62 178 M140 120 Q144 150 138 178" stroke="${H}" stroke-width="9" stroke-linecap="round"/><path d="M60 120 Q56 150 62 178 M140 120 Q144 150 138 178" stroke="${dark}" stroke-width="9" stroke-dasharray="3 5" stroke-linecap="round" opacity=".35"/>`,
        `<path d="M42 90 C40 50 66 32 100 32 C134 32 160 50 158 90 C150 76 130 70 100 70 C70 70 50 76 42 90 Z" fill="${H}"/>${rows}`];
    }
    case 'locs': {
      const loc = (x: number, top: number, len: number) => `<rect x="${x - 6}" y="${top}" width="12" height="${len}" rx="6" fill="${H}"/>${Array.from({ length: Math.floor(len / 12) }, (_, i) => `<path d="M${x - 5} ${top + 10 + i * 12} q5 3 10 0" stroke="${dark}" stroke-width="1.4" fill="none" opacity=".5"/>`).join('')}`;
      return [
        [30, 42, 54, 66, 134, 146, 158, 170].map((x, i) => loc(x, 60, 110 + (i % 3) * 14)).join(''),
        `${cap}${loc(52, 66, 56)}${loc(148, 66, 56)}${loc(64, 58, 30)}${loc(136, 58, 30)}${shine('M70 46 Q90 38 112 40')}`,
      ];
    }
    default: return ['', ''];
  }
}

/* ── facial hair: drawn around the mouth, never over it ──── */
function facialHair(id: string, l: Look) {
  const f = facialOf(l);
  if (f === 'none' || l.kind === 'baby' || l.kind === 'kid') return '';
  const H = `url(#hr${id})`;
  const jaw = f === 'full'
    ? 'M42 100 C42 146 70 170 100 170 C130 170 158 146 158 100 C152 116 144 124 132 126 C120 128 114 120 100 120 C86 120 80 128 68 126 C56 124 48 116 42 100 Z'
    : 'M46 108 C48 142 72 160 100 160 C128 160 152 142 154 108 C148 124 138 132 126 132 C116 132 110 126 100 126 C90 126 84 132 74 132 C62 132 52 124 46 108 Z';
  const tache = `<path d="M100 118 C93 113 81 114 78 123 C86 121 94 123 100 121 C106 123 114 121 122 123 C119 114 107 113 100 118 Z" fill="${H}"/>`;
  if (f === 'stubble') return `<path d="${jaw}" fill="${shade(l.hair, -0.1)}" opacity=".1"/><path d="M100 118 C93 114 82 115 79 122 C86 121 94 122 100 121 C106 122 114 121 121 122 C118 115 107 114 100 118 Z" fill="${shade(l.hair, -0.1)}" opacity=".22"/>`;
  if (f === 'moustache') return tache;
  return `<path d="${jaw}" fill="${H}"/><path d="${jaw}" fill="#000" opacity=".06"/>${tache}`;
}

/* ══ The storybook character ═════════════════════════════════════════════════
 * How Baby Tales people are drawn (the default look and every story world),
 * built to an appeal checklist:
 *  1. Cute proportions: a big rounded head and a small chin; the eyes sit
 *     below the middle of the head and the features cluster low and close.
 *  2. The eyes do the work: big (about a quarter of the face width each, an
 *     eye-width apart), the iris fills most of the eye, a dark pupil, one big
 *     and one small highlight, a soft tapered upper lash line.
 *  3. Simple, smooth shapes: curves only on the face, big/medium/small shapes.
 *  4. One line and colour treatment, the same as the drawn story things: a soft
 *     outline in a darker shade of each colour, flat colour, one cel shadow and
 *     one highlight.
 *  5. Life: a slight head tilt, expressive brows and mouths.
 *  6. Worlds differ by shape language: Fairytale elegant and flowing,
 *     Adventure round and bouncy, Mythic strong (triangles and Vs), all cute.
 * Identity (skin, hair, eye colour, face proportions from a photo, facial
 * hair, glasses) goes into every world unchanged.
 */
type ArtWorld = Exclude<WorldId, 'everyday'>;
const isArt = (w: WorldId): w is ArtWorld => w !== 'everyday';
const lum = (h: string) => { const [r, g, b] = hexToRgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
const mixHex = (a: string, b: string, t: number) => { const x = hexToRgb(a), y = hexToRgb(b); return rgbToHex(x.map((v, i) => v + (y[i] - v) * t)); };
/** The storybook treatment is the default look and every story world. */
const storybook = () => MODE === 'pocketlight' || MODE === 'tales';
const LINE = 0.36; // how much darker an outline is than its fill

function coreDefs(id: string, l: Look, skin: string, fur: string): string {
  const eye = l.eyes ?? EYE_COLOURS[0];
  const st = (pairs: [number, string, number?][]) => pairs.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a === undefined ? '' : ` stop-opacity="${a}"`}/>`).join('');
  // Movie 3D: real volume, light from the top left, a glossy band on the hair
  const film = DESIGN === 'pocketlight' || DESIGN === 'wondercut' || DESIGN === 'gouache';
  // (Sparkle shares the glossy hair; its skin stays soft and flat-lit)
  return `<defs><radialGradient id="sk${id}" cx="40%" cy="32%" r="80%">${DESIGN === 'pocketlight' ? st([[0, shade(skin, 0.14)], [0.55, skin], [1, shade(skin, -0.06)]]) : st([[0, skin], [1, skin]])}</radialGradient>
    <linearGradient id="hr${id}" gradientUnits="userSpaceOnUse" x1="70" y1="12" x2="112" y2="212">${film ? st([[0, shade(l.hair, 0.34)], [0.18, shade(l.hair, 0.12)], [0.45, l.hair], [1, shade(l.hair, -0.26)]]) : st([[0, shade(l.hair, 0.16)], [0.55, l.hair], [1, shade(l.hair, -0.14)]])}</linearGradient>
    <radialGradient id="fu${id}" cx="40%" cy="32%" r="80%">${st([[0, shade(fur, 0.1)], [1, fur]])}</radialGradient>
    <radialGradient id="ir${id}" cx="50%" cy="66%" r="62%">${st([[0, shade(eye, 0.5)], [0.65, eye], [1, shade(eye, -0.15)]])}</radialGradient>
    <linearGradient id="gl${id}" x1="0" y1="0" x2=".35" y2="1">${st([[0, '#fff', 0.12], [0.22, '#fff', 0.12], [0.22, '#fff', 0], [0.68, '#000', 0], [0.68, '#000', 0.08], [1, '#000', 0.08]])}</linearGradient>
    <radialGradient id="bl${id}">${st([[0, '#f0848c', 0.55], [1, '#f0848c', 0]])}</radialGradient>${styleFilters('pocketlight', id)}</defs>`;
}

interface FaceSpec { top: number; chin: number; cran: number; cheek: number; chinW: number; ex: number; ey: number; erx: number; ery: number; tilt: number; brow: number; nose: number; mouth: number }
/** Head and feature layout by age and world (the shape language). */
function faceSpec(l: Look, w: WorldId): FaceSpec {
  const k = l.kind;
  const base: FaceSpec = k === 'baby' ? { top: 34, chin: 153, cran: 58, cheek: 52, chinW: 22, ex: 24.5, ey: 106, erx: 14.6, ery: 16.5, tilt: 0, brow: 2.6, nose: 0, mouth: 0 }
    : k === 'kid' ? { top: 35, chin: 154, cran: 55, cheek: 46, chinW: 16, ex: 24.5, ey: 104, erx: 14.1, ery: 16, tilt: 0, brow: 3.6, nose: 0, mouth: 0 }
    : k === 'elder' ? { top: 36, chin: 157, cran: 53, cheek: 44, chinW: 14, ex: 24, ey: 103, erx: 13.8, ery: 15, tilt: 0, brow: 3.6, nose: 1, mouth: 1 }
    : { top: 35, chin: 158, cran: 53, cheek: 42, chinW: 12, ex: 24, ey: 103, erx: 14.6, ery: 16.5, tilt: 0, brow: 3.4, nose: 1, mouth: 1 };
  const little = k === 'baby' || k === 'kid';
  switch (w) {
    case 'fairytale': return { ...base, cheek: base.cheek - 4, chinW: base.chinW - (little ? 4 : 5), chin: base.chin + 2, tilt: 0 };
    case 'adventure': return { ...base, cran: base.cran + 2, cheek: base.cheek + 6, chinW: base.chinW + 9 };
    case 'mythic': return { ...base, cheek: base.cheek + 3, chinW: base.chinW + (little ? 2 : 6) };
  }
  return base;
}

function coreHead(s: FaceSpec, l: Look): string {
  const fw = 1 + SHAPE_RANGE.faceWidth * shapeOf(l, 'faceWidth'), fl = 1 + SHAPE_RANGE.faceLength * shapeOf(l, 'faceLength');
  const jaw = 1 + SHAPE_RANGE.jaw * shapeOf(l, 'jaw');
  const f = (n: number) => n.toFixed(1);
  const top = 94 - (94 - s.top) * fl, chin = 94 + (s.chin - 94) * fl, cr = s.cran * fw, ch = s.cheek * fw * (0.6 + 0.4 * jaw), cw = s.chinW * jaw;
  const R = (sd: number) => `${f(100 + sd * cr)}`;
  if (DESIGN === 'inked') {
    // angular: a rounded crown, straight sides to the cheekbones, a long straight jaw to the chin
    const cb = 100 + 0.16 * (chin - 94);
    return `M100 ${f(top)} C${f(100 + cr * 0.86)} ${f(top)} ${R(1)} ${f(top + 26)} ${R(1)} 88 L${f(100 + cr * 0.98)} ${f(cb)} L${f(100 + cw)} ${f(chin - 6)} Q100 ${f(chin + 2)} ${f(100 - cw)} ${f(chin - 6)} L${f(100 - cr * 0.98)} ${f(cb)} L${R(-1)} 88 C${R(-1)} ${f(top + 26)} ${f(100 - cr * 0.86)} ${f(top)} 100 ${f(top)} Z`;
  }
  return `M100 ${f(top)} C${f(100 + cr * 0.86)} ${f(top)} ${R(1)} ${f(top + 28)} ${R(1)} 92 C${R(1)} ${f(112)} ${f(100 + ch)} ${f(chin - 24)} ${f(100 + cw)} ${f(chin - 5)} Q100 ${f(chin + 3)} ${f(100 - cw)} ${f(chin - 5)} C${f(100 - ch)} ${f(chin - 24)} ${R(-1)} 112 ${R(-1)} 92 C${R(-1)} ${f(top + 28)} ${f(100 - cr * 0.86)} ${f(top)} 100 ${f(top)} Z`;
}

function coreEye(id: string, s: FaceSpec, l: Look, side: -1 | 1, gap: number, w: WorldId): string {
  const ex = exprOf(l);
  const es = 1 + SHAPE_RANGE.eyeSize * shapeOf(l, 'eyeSize');
  const cx = 100 + side * (s.ex + gap), cy = s.ey;
  const rx = s.erx * es, ry0 = s.ery * es;
  const ink = '#4a3229';
  const lw = l.kind === 'baby' ? 2.4 : 2.6;
  const lashOut = l.lashes || w === 'fairytale';
  // closed: happy arcs, a wink; asleep
  if (ex === 'laugh' || ex === 'proud' || (ex === 'wink' && side === 1)) {
    return `<path d="M${cx - rx * 0.85} ${cy + 2} Q${cx} ${cy - ry0 * 0.75} ${cx + rx * 0.85} ${cy + 2}" stroke="${ink}" stroke-width="${lw + 0.2}" fill="none" stroke-linecap="round"/>`;
  }
  if (ex === 'sleepy') return `<path d="M${cx - rx} ${cy} Q${cx} ${cy + ry0 * 0.5} ${cx + rx} ${cy}" stroke="${ink}" stroke-width="${lw}" fill="none" stroke-linecap="round"/>${lashOut ? `<path d="M${cx + side * rx} ${cy} l${side * 4} 2" stroke="${ink}" stroke-width="2.2" stroke-linecap="round"/>` : ''}`;
  if (ex === 'silly' && side === -1) return `<path d="M${cx - rx * 0.7} ${cy - ry0 * 0.6} L${cx + rx * 0.6} ${cy} L${cx - rx * 0.7} ${cy + ry0 * 0.6}" stroke="${ink}" stroke-width="${lw + 0.4}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  const big = ex === 'wow' || ex === 'starry' || (ex === 'silly' && side === 1);
  const ry = ry0 * (big ? 1.1 : 1);
  // a round eye (the Adventure eye, in every world and look)
  const shape = `M${cx - rx} ${cy} C${cx - rx} ${cy - ry * 1.33} ${cx + rx} ${cy - ry * 1.33} ${cx + rx} ${cy} C${cx + rx} ${cy + ry * 1.33} ${cx - rx} ${cy + ry * 1.33} ${cx - rx} ${cy} Z`;
  const [gx, gy] = ex === 'shy' ? [-2.4, 2] : ex === 'dreamy' ? [1.5, -1.5] : ex === 'worried' ? [0, -1] : [0, 0];
  // the iris rests on the lower lid with the upper lid just over its top: white shows only at the sides,
  // never under or all round the iris (that reads as a stare)
  const ir = Math.min(rx, ry) * 0.88, ix = cx + gx, iy = cy + ry * 0.16 + gy;
  const eyeCol = l.eyes ?? EYE_COLOURS[0];
  const clip = `ce${id}${side}`;
  // the upper eyelid: a soft lid of skin resting over the top of the iris, as real eyes do
  // (a little lower for a dreamy or shy look; lifted for surprise)
  const cover = big ? 0.04 : ex === 'dreamy' ? 0.34 : ex === 'shy' ? 0.22 : l.kind === 'baby' ? 0.08 : 0.12;
  const endY = cy - ry * 0.18, peakY = cy - ry * (1 - 2 * cover), ctrlY = 2 * peakY - endY;
  const lidEdge = `M${cx - rx - 1.5} ${endY} Q${cx} ${ctrlY} ${cx + rx + 1.5} ${endY}`;
  const lidFill = `M${cx - rx - 4} ${cy - ry * 1.7} L${cx + rx + 4} ${cy - ry * 1.7} L${cx + rx + 1.5} ${endY} Q${cx} ${ctrlY} ${cx - rx - 1.5} ${endY} Z`;
  const lidCol = mixHex(l.skin, '#b9776a', 0.1);
  const starry = ex === 'starry' || ((DESIGN === 'wondercut' || DESIGN === 'gouache') && ex !== 'wow');
  const shine = starry
    ? sparkle(ix - ir * 0.2, iy - ir * 0.18, ir * 0.6, '#fff') + `<circle cx="${ix + ir * 0.45}" cy="${iy + ir * 0.42}" r="${ir * 0.14}" fill="#fff"/>`
    : `<ellipse cx="${ix - ir * 0.32}" cy="${iy - ir * 0.26}" rx="${ir * 0.38}" ry="${ir * 0.34}" fill="#fff"/><circle cx="${ix + ir * 0.42}" cy="${iy + ir * 0.42}" r="${ir * 0.17}" fill="#fff" opacity=".95"/>`;
  const glint = w === 'mythic' ? `<circle cx="${ix + ir * 0.05}" cy="${iy + ir * 0.52}" r="${ir * 0.1}" fill="#ffd36b"/>` : w === 'fairytale' && !starry ? sparkle(ix + ir * 0.46, iy - ir * 0.02, ir * 0.15, '#fff') : '';
  // lashes: a couple of small soft ones at the outer end of the lid, for people with lashes
  const ox = cx + side * (rx + 0.5);
  const lashes = l.lashes ? `<path d="M${ox - side * 1.5} ${endY - 0.5} q${side * 3} -0.8 ${side * 4.4} -3.6" stroke="${ink}" stroke-width="1.8" fill="none" stroke-linecap="round"/>` : '';
  const crease = l.kind === 'adult' || l.kind === 'elder' ? `<path d="M${cx - rx * 0.6} ${peakY - ry * 0.18} Q${cx} ${peakY - ry * 0.42} ${cx + rx * 0.66} ${peakY - ry * 0.16}" stroke="${shade(l.skin, -0.18)}" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".4"/>` : '';
  return `<clipPath id="${clip}"><path d="${shape}"/></clipPath>
    <path d="${shape}" fill="#fffdf8" stroke="none"/>
    <g clip-path="url(#${clip})">
      <circle cx="${ix}" cy="${iy}" r="${ir}" fill="url(#ir${id})" stroke="${shade(eyeCol, -0.45)}" stroke-width="1.2"/>
      <circle cx="${ix}" cy="${iy + ir * 0.04}" r="${ir * 0.4}" fill="#1a110e" stroke="none"/>
      ${shine}${glint}
      <path d="${lidFill}" fill="${lidCol}" stroke="none"/>
      <path d="M${cx - rx} ${endY + 2.2} Q${cx} ${ctrlY + 2.6} ${cx + rx} ${endY + 2.2}" stroke="#000" stroke-width="2.4" fill="none" opacity=".07"/>
    </g>
    <path d="M${cx - rx * 0.62} ${cy + ry * 0.96} Q${cx} ${cy + ry * 1.12} ${cx + rx * 0.62} ${cy + ry * 0.96}" stroke="${shade(l.skin, -0.22)}" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".35"/>
    ${crease}
    <path d="${lidEdge}" stroke="${ink}" stroke-width="${lw}" fill="none" stroke-linecap="round"/>${lashes}`;
}

function coreBrows(s: FaceSpec, l: Look, gap: number, w: WorldId): string {
  const ex = exprOf(l);
  const [lift, tilt] = BROWS[ex] ?? [0, 0];
  const up = -SHAPE_RANGE.browHeight * shapeOf(l, 'browHeight'), weight = 1 + SHAPE_RANGE.browWeight * shapeOf(l, 'browWeight');
  const c = l.kind === 'baby' ? shade(l.hair, 0.15) : mixHex(shade(l.hair, -0.12), l.skin, 0.18);
  const th = (l.kind === 'baby' ? 1.6 : 2.2) * weight;
  return ([-1, 1] as const).map((sd) => {
    const y0 = s.ey - s.ery - 13 + (ex === 'wink' ? (sd === -1 ? lift - 4 : lift + 2) : ex === 'silly' && sd === -1 ? lift + 4 : lift) + up;
    const inX = 100 + sd * (s.ex + gap - s.erx * 0.7), outX = 100 + sd * (s.ex + gap + s.erx * 1.05), midX = 100 + sd * (s.ex + gap + s.erx * 0.2);
    // gentle: expressions move the brows a little, and never into a glare
    const tilt2 = Math.max(-5, Math.min(1.5, tilt * 0.6));
    const arch = 5;
    // a tapered crescent: thick at the inner end, fine at the outer
    return `<path d="M${inX} ${y0 + tilt2 + 1} Q${midX} ${y0 - arch} ${outX} ${y0 + 2.5}" stroke="${c}" stroke-width="${th}" fill="none" stroke-linecap="round" opacity=".9"/>`;
  }).join('');
}

function coreNose(s: FaceSpec, l: Look, w: WorldId): string {
  const d = shade(l.skin, -0.3), ny = s.ey + (l.kind === 'baby' ? 13 : 14);
  if (w === 'adventure') return `<ellipse cx="100" cy="${ny - 1}" rx="${l.kind === 'baby' ? 5.5 : 7}" ry="${l.kind === 'baby' ? 4 : 5}" fill="${shade(l.skin, -0.06)}" stroke="${shade(l.skin, -0.22)}" stroke-width="1.6"/><ellipse cx="98" cy="${ny - 2.6}" rx="2.2" ry="1.4" fill="#fff" opacity=".45"/>`;
  const bridge = s.nose && w !== 'fairytale' ? `<path d="M101 ${ny - 12} Q104 ${ny - 5} 102.5 ${ny - 1}" stroke="${d}" stroke-width="1.8" fill="none" stroke-linecap="round" opacity="${w === 'mythic' ? 0.85 : 0.5}"/>` : '';
  const wid = w === 'fairytale' ? 3 : l.kind === 'baby' ? 3.4 : 4.2;
  return `${bridge}<path d="M${100 - wid} ${ny} Q100 ${ny + 3.2} ${100 + wid} ${ny}" stroke="${d}" stroke-width="2.3" fill="none" stroke-linecap="round"/><ellipse cx="99" cy="${ny - 4}" rx="2" ry="1.3" fill="#fff" opacity=".35"/>`;
}

function coreMouth(id: string, s: FaceSpec, l: Look, w: WorldId): string {
  const ex = exprOf(l);
  const my = s.ey + (l.kind === 'baby' ? 25 : 27);
  const lip = mixHex(shade(l.skin, -0.45), '#a8323a', 0.45);
  const wd = (l.kind === 'baby' ? 9 : l.kind === 'kid' ? 10 : 11) * (w === 'fairytale' ? 0.85 : w === 'adventure' ? 1.2 : 1);
  const line = (d: string, sw = 2.8) => `<path d="${d}" stroke="${lip}" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  const open = (h: number, wf = 1, teeth = l.kind !== 'baby') => {
    const W = wd * 1.25 * wf;
    const d = `M${100 - W} ${my - 2} Q100 ${my + 1} ${100 + W} ${my - 2} Q${100 + W * 0.85} ${my + h} 100 ${my + h} Q${100 - W * 0.85} ${my + h} ${100 - W} ${my - 2} Z`;
    return `<clipPath id="cm${id}"><path d="${d}"/></clipPath><path d="${d}" fill="#7a2c2c" stroke="${lip}" stroke-width="2"/><g clip-path="url(#cm${id})">${teeth ? `<rect x="${100 - W}" y="${my - 3}" width="${W * 2}" height="${h * 0.28}" fill="#fff" stroke="none"/>` : ''}<ellipse cx="100" cy="${my + h}" rx="${W * 0.6}" ry="${h * 0.42}" fill="#ef7f8a" stroke="none"/></g>`;
  };
  switch (ex) {
    case 'laugh': case 'starry': return open(l.kind === 'baby' ? 13 : 15, 1.1);
    case 'grin': return open(l.kind === 'baby' ? 11 : 12);
    case 'silly': return open(10) + `<path d="M${96} ${my + 6} Q96 ${my + 17} 102 ${my + 17} Q108 ${my + 17} 108 ${my + 6} Z" fill="#ef7f8a" stroke="${shade('#ef7f8a', -LINE)}" stroke-width="1.8"/>`;
    case 'wow': return `<ellipse cx="100" cy="${my + 3}" rx="${wd * 0.5}" ry="${wd * 0.62}" fill="#7a2c2c" stroke="${lip}" stroke-width="2"/><ellipse cx="100" cy="${my + 6}" rx="${wd * 0.3}" ry="${wd * 0.2}" fill="#ef7f8a"/>`;
    case 'worried': return line(`M${100 - wd} ${my + 3} Q${100 - wd / 2} ${my - 1} 100 ${my + 2} Q${100 + wd / 2} ${my + 5} ${100 + wd} ${my + 1}`);
    case 'sleepy': return `<ellipse cx="100" cy="${my + 2}" rx="${wd * 0.32}" ry="${wd * 0.38}" fill="#7a2c2c" stroke="${lip}" stroke-width="1.8"/>`;
    case 'shy': return line(`M${100 - wd * 0.55} ${my} Q100 ${my + 4} ${100 + wd * 0.55} ${my}`);
    case 'brave': return line(`M${100 - wd} ${my + 1} Q${100 + 1} ${my + 6} ${100 + wd} ${my - 3}`, 3);
    case 'wink': return line(`M${100 - wd} ${my - 1} Q100 ${my + 9} ${100 + wd * 1.05} ${my - 3}`, 3);
    case 'proud': return line(`M${100 - wd * 1.15} ${my - 2} Q100 ${my + 11} ${100 + wd * 1.15} ${my - 2}`, 3);
    case 'dreamy': return line(`M${100 - wd * 0.8} ${my} Q100 ${my + 6} ${100 + wd * 0.8} ${my}`);
    default: return line(`M${100 - wd} ${my - 1} Q100 ${my + 9} ${100 + wd} ${my - 1}`, 3) + `<path d="M${100 - wd - 2} ${my - 3} q1.5 2 3 2.2 M${100 + wd + 2} ${my - 3} q-1.5 2 -3 2.2" stroke="${lip}" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".6"/>`;
  }
}

function coreFace(id: string, l: Look, w: WorldId): string {
  const [rawBack, rawFront] = hair(id, l);
  const back0 = !OPEN_HEADWEAR.includes(l.hat) && ['puff', 'topknot', 'bun'].includes(l.hairStyle) ? '' : rawBack;
  const vol = (s: string) => (w === 'adventure' && s ? `<g transform="translate(100 78) scale(1.06) translate(-100 -78)">${s}</g>` : s);
  const back = vol(onHead(l, back0)), front = vol(onHead(l, rawFront));
  const S = faceSpec(l, w), skin = `url(#sk${id})`, head = coreHead(S, l);
  // every look shares the same friendly almond eyes (white at the sides, the lid resting on the iris)
  const TS = talesSpec(l), eyeS = { ...S, erx: TS.erx * 1.06, ery: TS.ery * 1.06, ey: S.ey + 1 };
  // …and the same real nose, mouth and brows, placed for these rounder heads
  const featS = { ...S, ey: S.ey - (l.kind === 'baby' ? 2 : l.kind === 'kid' ? 3 : 6) };
  // the scalp: hair that fills the whole top of the head down to the hairline, so no style leaves a bald
  // crown or a band of skin between the fringe and the hair behind (the fringe's own shape sits on top)
  const scalpOn = !['bald', 'tuft', 'buzz', 'sides'].includes(l.hairStyle) && !l.face && !l.drawing;
  const T = S.ey - 16, cr = S.cran * (1 + SHAPE_RANGE.faceWidth * shapeOf(l, 'faceWidth'));
  const bigHead = coreHead({ ...S, top: S.top - 2.5, cran: S.cran + 2.5 }, l);
  const scalp = scalpOn ? vol(`<clipPath id="sc${id}"><path d="M-20 -60 H220 V${T} H${(100 + cr + 4).toFixed(1)} Q100 ${(2 * (S.top + 22) - T).toFixed(1)} ${(100 - cr - 4).toFixed(1)} ${T} H-20 Z"/></clipPath><path d="${bigHead}" fill="url(#hr${id})" clip-path="url(#sc${id})"/>`) : '';
  // …and over the fringe, a plain band of hair just inside the head's edge hides the fringe's own outline there,
  // so the hair reads as one piece instead of a headband
  const seam = scalpOn ? vol(`<clipPath id="rg${id}"><path clip-rule="evenodd" d="${bigHead} ${coreHead({ ...S, top: S.top + 12, cran: S.cran - 12 }, l)}"/></clipPath><g clip-path="url(#sc${id})"><path d="${bigHead}" fill="url(#hr${id})" stroke="none" clip-path="url(#rg${id})"/></g>`) : '';
  const gap = SHAPE_RANGE.eyeGap * shapeOf(l, 'eyeGap');
  const nose = 1 + SHAPE_RANGE.nose * shapeOf(l, 'nose'), mw = 1 + SHAPE_RANGE.mouth * shapeOf(l, 'mouth');
  const around = (x: number, y: number, sx: number, sy: number, inner: string) => (sx === 1 && sy === 1 ? inner : `<g transform="translate(${x} ${y}) scale(${+sx.toFixed(3)} ${+sy.toFixed(3)}) translate(${-x} ${-y})">${inner}</g>`);
  const neckW = l.kind === 'baby' ? 13 : w === 'fairytale' ? 8 : w === 'mythic' ? 15 : w === 'adventure' ? 14 : 11;
  const earX = S.cran - 2;
  const ears = COVERS_EARS.includes(l.hairStyle) ? '' : [-1, 1].map((sd) => `<ellipse cx="${100 + sd * earX}" cy="${S.ey}" rx="${l.kind === 'baby' ? 7.5 : 7}" ry="${l.kind === 'baby' ? 9 : 8.5}" fill="${skin}"/><path d="M${100 + sd * (earX + 2)} ${S.ey - 5} q${sd * 4} 5 0 10" stroke="${shade(l.skin, -0.25)}" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".6"/>`).join('');
  const clip = `ch${id}`;
  const blushX = S.ex + gap + 13, blushY = S.ey + 15;
  const fr = l.freckles ? [[-blushX + 2, blushY - 1], [-blushX + 8, blushY + 3], [-blushX - 4, blushY + 4], [blushX - 2, blushY - 1], [blushX - 8, blushY + 3], [blushX + 4, blushY + 4]].map(([x, y]) => `<circle cx="${100 + x}" cy="${y}" r="1.5" fill="${shade(l.skin, -0.32)}" opacity=".8"/>`).join('') : '';
  return `${back}
    <path d="M${100 - neckW} 136 L${100 + neckW} 136 L${100 + neckW - 1} 160 L${100 - neckW + 1} 160 Z" fill="${shade(l.skin, -0.12)}"/>
    ${ears}
    <clipPath id="${clip}"><path d="${head}"/></clipPath>
    <path d="${head}" fill="${mixHex(shade(l.skin, -0.1), '#c2604a', 0.12)}"/>
    <g clip-path="url(#${clip})"><path d="${head}" fill="${skin}" transform="translate(-7 -8)" stroke="none"/></g>
    <ellipse cx="80" cy="60" rx="11" ry="5.5" fill="#fff" opacity=".18" transform="rotate(-20 80 60)"/>
    ${[-1, 1].map((sd) => `<ellipse cx="${100 + sd * blushX}" cy="${blushY}" rx="${l.kind === 'baby' ? 12 : 11}" ry="${l.kind === 'baby' ? 8 : 7}" fill="url(#bl${id})"/>`).join('')}${fr}
    <g class="bt-eyes">${talesEye(id, eyeS, l, -1, gap)}${talesEye(id, eyeS, l, 1, gap)}</g>
    ${talesBrows(eyeS, l, gap)}
    ${around(100, 112, nose, 1 + (nose - 1) * 0.35, talesNose(featS, l))}
    ${facialHair(id, l)}
    ${around(100, 128, mw, 1, talesMouth(id, featS, l))}
    ${hairShadow(id, l, clip, front)}${back ? noInk(scalp) : scalp}${front}${scalpOn ? noInk(front) : ''}${seam}
    ${onHead(l, worldHair(l))}
    ${flair(l)}`;
}

/* ── Tales: hand-drawn film characters, the NomNoms way ──────────────────
 * Principles (not any one character): an egg- or heart-shaped head with a soft,
 * round "dumpling" chin; almond eyes that do the acting (a confident upper lash
 * line, a big iris tucked under the lid, one bright highlight plus the NomNoms
 * second sparkle); thin, high, curved brows that never glare; a nose that is
 * only a hint; a wide mouth with a defined upper lip; full cheeks with a warm
 * blush; a warm brown line instead of black.
 */
const femme = (l: Look) => !!l.lashes;
/* ── the fitting model: hair, hats and glasses placed on this person's own head ──────────
 * Hairstyles, hats and headwear are drawn once for a reference head (half-width ~60, crown at y 34,
 * centred at y 94). Each person's head is measured from the same numbers that draw it (age, look, the
 * face-width and face-length sliders), and everything that sits on the head is fitted to it: scaled to the
 * head's width and height, so it hugs the head instead of floating round it or perching on top.
 * Glasses go where the eyes actually are and are as wide as the eyes are apart.
 */
interface HeadGeom { top: number; cr: number; ey: number; ex: number }
function headGeom(l: Look): HeadGeom {
  const S = MODE === 'tales' ? talesSpec(l) : faceSpec(l, WORLD);
  const fw = 1 + SHAPE_RANGE.faceWidth * shapeOf(l, 'faceWidth'), fl = 1 + SHAPE_RANGE.faceLength * shapeOf(l, 'faceLength');
  const gap = SHAPE_RANGE.eyeGap * shapeOf(l, 'eyeGap');
  return { top: 94 - (94 - S.top) * fl, cr: S.cran * fw, ey: MODE === 'tales' ? S.ey : S.ey + 1, ex: S.ex + gap };
}
const clampN = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** The transform that fits anything drawn for the reference head onto this head. */
function headFit(l: Look): string {
  if (l.face || l.drawing || isPet(l.kind)) return '';
  const g = headGeom(l);
  const kx = clampN((g.cr + 3) / 63, 0.84, 1.06), ky = clampN((94 - g.top) / 60, 0.9, 1.08);
  return Math.abs(kx - 1) < 0.005 && Math.abs(ky - 1) < 0.005 ? '' : `translate(100 94) scale(${kx.toFixed(3)} ${ky.toFixed(3)}) translate(-100 -94)`;
}
const onHead = (l: Look, svg: string) => { const t = headFit(l); return svg && t ? `<g transform="${t}">${svg}</g>` : svg; };
/** Glasses sit on the eyes: moved to eye level and spaced to the eyes. */
function glassesFit(l: Look, svg: string): string {
  if (!svg || l.face || l.drawing || isPet(l.kind)) return svg;
  const g = headGeom(l);
  const kx = clampN(g.ex / 22, 0.88, 1.15), dy = g.ey - 101;
  return `<g transform="translate(0 ${dy.toFixed(1)}) translate(100 101) scale(${kx.toFixed(3)} 1) translate(-100 -101)">${svg}</g>`;
}

/** The same shapes with no outline (the storybook line skips anything that already says stroke). */
const noInk = (svg: string) => svg.replace(/<(path|ellipse|circle|rect|polygon)\b(?![^>]*\bstroke=)/g, '<$1 stroke="none"');
/** Hairstyles that fall over the ears (the ears are tucked under the hair, not stuck on top of it). */
const COVERS_EARS: HairStyle[] = ['bob', 'long', 'wavy', 'curtain', 'halfup', 'bangs', 'longcurly', 'locs', 'afro', 'sweep', 'lob', 'shag', 'twists'];
/** The soft shadow the hair casts on the forehead and temples: what makes it sit on the head, not on top of it like a wig. */
const hairShadow = (id: string, l: Look, clip: string, front: string) => front && !l.face
  ? `<filter id="hsh${id}" x="-10%" y="-10%" width="120%" height="130%"><feFlood flood-color="${shade(l.skin, -0.5)}"/><feComposite in2="SourceAlpha" operator="in"/><feGaussianBlur stdDeviation="1.6"/></filter><g clip-path="url(#${clip})" opacity=".3"><g transform="translate(1.2 3.6)" filter="url(#hsh${id})">${front}</g></g>`
  : '';
/**
 * Each look is its own character design built on the Tales drawing: the same care in the eyes,
 * lips, hair and shading, but its own head shape, eyes and proportions, the way two films from
 * the same studio have different character designs.
 *  - Patchwork: plush toys: chibi proportions, a round face with a wide soft chin, big round eyes
 *  - Sketchbook: an animator's elegant drawing: tall and slim, a longer face, narrower almond eyes
 *  - Retro: mid-century design: squarer jaws and chins, long narrow almond eyes
 *  - Paper cut: round faces and round eyes, a little shorter and sturdier
 */
let DESIGN: StyleMode = 'tales';
const DESIGN_PROPS: Partial<Record<StyleMode, Record<'baby' | 'kid' | 'adult' | 'elder', { head: number; body: number; slim: number }>>> = {
  // Movie 3D: a modern animated film. Big heads on slim bodies, little ones round
  pocketlight: { baby: { head: 1.02, body: 0.98, slim: 1.02 }, kid: { head: 0.9, body: 1.04, slim: 0.96 }, adult: { head: 0.7, body: 1.24, slim: 0.9 }, elder: { head: 0.74, body: 1.16, slim: 0.96 } },
  // Chibi: giant heads on tiny toy bodies (grown-ups a little taller, so they still read as grown-ups)
  gouache: { baby: { head: 1.04, body: 0.76, slim: 1.02 }, kid: { head: 1.02, body: 0.8, slim: 0.98 }, adult: { head: 1, body: 0.9, slim: 0.96 }, elder: { head: 1, body: 0.84, slim: 1 } },
  // Super Heroes: heroic, broad-shouldered, standing tall
  inked: { baby: { head: 1, body: 1, slim: 1.06 }, kid: { head: 0.78, body: 1.16, slim: 1 }, adult: { head: 0.6, body: 1.36, slim: 1.06 }, elder: { head: 0.64, body: 1.26, slim: 1.06 } },
  // Sparkle: a modern storybook: graceful, slim, a little big-headed
  wondercut: { baby: { head: 1.02, body: 0.98, slim: 0.98 }, kid: { head: 0.86, body: 1.08, slim: 0.9 }, adult: { head: 0.66, body: 1.27, slim: 0.84 }, elder: { head: 0.7, body: 1.2, slim: 0.9 } },
};
const DESIGN_LEGS: Partial<Record<StyleMode, number>> = { pocketlight: 0.8, gouache: 0.25, inked: 1.1, wondercut: 1 };
function designSpec(S: FaceSpec, l: Look): FaceSpec {
  const f = femme(l), grown = l.kind === 'adult' || l.kind === 'elder';
  switch (DESIGN) {
    // big round eyes set a little low, round cheeks, a small soft chin
    case 'pocketlight': return { ...S, top: S.top - 2, chin: S.chin - (grown ? 6 : 4), cheek: S.cheek + (grown ? 5 : 3), chinW: Math.max(9, S.chinW - 2), erx: S.erx * 1.2, ery: S.ery * (grown ? 1.42 : 1.3), ey: S.ey + 3 };
    // a soft oval, gentle eyes with more white, set high
    // Chibi: a wide round face, huge tall eyes set low, everything else tiny
    case 'gouache': return { ...S, top: S.top - 4, chin: S.chin - (grown ? 6 : 4), cheek: S.cran - 1, chinW: S.chinW + (grown ? (f ? 10 : 14) : 8), erx: S.erx * 1.26, ery: S.ery * (grown ? 1.9 : 1.62), ey: S.ey + 6 };
    // a hero's face: a strong jaw on grown men, determined eyes
    // heroes: the Tales face with a softer, rounder chin (a mask puts all the attention on the lower face)
    case 'inked': return { ...S, chin: S.chin - 2, chinW: S.chinW + (l.kind === 'baby' ? 0 : grown ? 6 : 5), cheek: S.cheek + (l.kind === 'baby' ? 0 : 2), ery: S.ery * 0.92 };
    // heart-shaped: full at the cheekbones, a small pointed chin; big lashed eyes
    case 'wondercut': return { ...S, cheek: S.cran + (l.kind === 'baby' ? -4 : 1), chinW: l.kind === 'baby' ? S.chinW - 6 : grown ? (f ? 6 : 11) : 9, chin: S.chin + (grown ? 2 : 0), erx: S.erx * 1.16, ery: S.ery * 1.24, ey: S.ey + 1 };
    default: return S;
  }
}
function talesSpec(l: Look): FaceSpec { return designSpec(talesSpecBase(l), l); }
function talesSpecBase(l: Look): FaceSpec {
  const k = l.kind, f = femme(l);
  switch (k) {
    case 'baby': return { top: 36, chin: 152, cran: 60, cheek: 58, chinW: 28, ex: 23, ey: 107, erx: 14.6, ery: 10.2, tilt: 0, brow: 1.6, nose: 0, mouth: 0 };
    case 'kid': return { top: 35, chin: 154, cran: 56, cheek: 50, chinW: f ? 19 : 21, ex: 22.5, ey: 103, erx: 14.8, ery: 9.6, tilt: 0, brow: f ? 2 : 2.4, nose: 0, mouth: 0 };
    case 'elder': return { top: 33, chin: 158, cran: 53, cheek: f ? 43 : 46, chinW: f ? 14 : 18, ex: 21.5, ey: 100, erx: 13.4, ery: 8.2, tilt: 0, brow: f ? 2.2 : 3.2, nose: 1, mouth: 1 };
    default: return { top: 32, chin: f ? 160 : 161, cran: f ? 51 : 53, cheek: f ? 40 : 46, chinW: f ? 11 : 18, ex: 22, ey: 99, erx: f ? 14.6 : 13.8, ery: f ? 8.9 : 8.4, tilt: 0, brow: f ? 2.1 : 3.4, nose: 1, mouth: 1 };
  }
}

function talesEye(id: string, s: FaceSpec, l: Look, side: -1 | 1, gap: number): string {
  const ex = exprOf(l);
  const es = 1 + SHAPE_RANGE.eyeSize * shapeOf(l, 'eyeSize');
  const cx = 100 + side * (s.ex + gap), cy = s.ey;
  const rx = s.erx * es, big = ex === 'wow' || ex === 'starry' || (ex === 'silly' && side === 1);
  const ry = s.ery * es * (big ? 1.14 : ex === 'dreamy' ? 0.8 : ex === 'shy' ? 0.9 : 1);
  // delicate: a fine warm-brown lash line, never a heavy black rim
  const ink = '#4a2f26', f = femme(l), little = l.kind === 'baby' || l.kind === 'kid';
  const lw = (l.kind === 'baby' ? 1.8 : l.kind === 'kid' ? 2 : f ? 2.3 : 2) * (DESIGN === 'wondercut' && f ? 1.3 : DESIGN === 'gouache' ? 1.1 : 1);
  const n = (v: number) => v.toFixed(1);
  // corners: the outer corner sits a touch higher than the inner (a lifted, friendly almond)
  // Bold Hero: a slanted almond, the outer corner swept up
  const xi = cx - side * rx, yi = cy + ry * 0.12, xo = cx + side * rx, yo = cy - ry * (DESIGN === 'wondercut' && !little ? 0.2 : little ? 0.02 : 0.1);
  const upper = `M${n(xi)} ${n(yi)} C${n(xi + side * rx * 0.12)} ${n(cy - ry * 1.3)} ${n(xo - side * rx * 0.42)} ${n(cy - ry * 1.42)} ${n(xo)} ${n(yo)}`;
  const lower = `C${n(xo - side * rx * 0.18)} ${n(cy + ry * (little ? 1.2 : 1.0))} ${n(xi + side * rx * 0.34)} ${n(cy + ry * (little ? 1.22 : 1.06))} ${n(xi)} ${n(yi)}`;
  // closed eyes follow the same almond: a happy upward curve, a wink, sleep
  if (ex === 'laugh' || ex === 'proud' || (ex === 'wink' && side === 1)) {
    return `<path d="M${n(xi)} ${n(cy + 2)} Q${n(cx)} ${n(cy - ry * 1.1)} ${n(xo)} ${n(cy + 1)}" stroke="${ink}" stroke-width="${lw + 0.3}" fill="none" stroke-linecap="round"/>${f ? `<path d="M${n(xo)} ${n(cy + 1)} q${side * 2} -0.5 ${side * 3} -2.4" stroke="${ink}" stroke-width="1.4" fill="none" stroke-linecap="round"/>` : ''}`;
  }
  if (ex === 'sleepy') return `<path d="M${n(xi)} ${n(cy)} Q${n(cx)} ${n(cy + ry * 0.7)} ${n(xo)} ${n(cy - 1)}" stroke="${ink}" stroke-width="${lw}" fill="none" stroke-linecap="round"/>`;
  if (ex === 'silly' && side === -1) return `<path d="M${n(cx - rx * 0.7)} ${n(cy - ry * 0.7)} L${n(cx + rx * 0.6)} ${n(cy)} L${n(cx - rx * 0.7)} ${n(cy + ry * 0.7)}" stroke="${ink}" stroke-width="${lw}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  const shape = `${upper} ${lower} Z`;
  const [gx, gy] = ex === 'shy' ? [-side * 2.2 - 1, 1.6] : ex === 'dreamy' ? [1.2, -1] : [0, 0];
  // the upper lid overlaps the top of the iris and the lower lid crosses its bottom: white only at the sides
  // (the eye's width sets how much white shows at the sides: about a third of it)
  // the iris is about 60% of the eye's width, so clear white shows on both sides (a bigger iris looks possessed)
  const ir = Math.min(rx * (l.kind === 'baby' ? 0.66 : l.kind === 'kid' ? 0.62 : 0.58) * (DESIGN === 'gouache' ? 1.12 : DESIGN === 'pocketlight' || DESIGN === 'wondercut' ? 1.06 : 1), ry * 1.02), ix = cx + gx + side * 0.4, iy = cy - ry * 1.02 + ir * 0.9 + gy;
  const eyeCol = l.eyes ?? EYE_COLOURS[0];
  const clip = `te${id}${side}`;
  const starry = ex === 'starry';
  // one bright highlight up and to the left, and the NomNoms second sparkle below it
  const shine = starry
    ? sparkle(ix - ir * 0.28, iy - ir * 0.28, ir * 0.42, '#fff') + `<circle cx="${n(ix + ir * 0.34)}" cy="${n(iy + ir * 0.36)}" r="${n(ir * 0.09)}" fill="#fff" opacity=".7"/>`
    : `<ellipse cx="${n(ix - ir * 0.32)}" cy="${n(iy - ir * 0.32)}" rx="${n(ir * 0.24)}" ry="${n(ir * 0.2)}" fill="#fff" opacity=".92"/><circle cx="${n(ix + ir * 0.34)}" cy="${n(iy + ir * 0.36)}" r="${n(ir * 0.09)}" fill="#fff" opacity=".7"/>`;
  // the lash line: one tapered stroke, fine at the inner corner, fullest toward the outer corner,
  // ending (for lashes) in a soft upward wing; never separate spiky lashes
  const P0 = [xi, yi], P1 = [xi + side * rx * 0.12, cy - ry * 1.3], P2 = [xo - side * rx * 0.42, cy - ry * 1.42], P3 = [xo, yo];
  const bez = (t: number, k: 0 | 1) => (1 - t) ** 3 * P0[k] + 3 * (1 - t) ** 2 * t * P1[k] + 3 * (1 - t) * t * t * P2[k] + t ** 3 * P3[k];
  const outerPts: string[] = [], innerPts: string[] = [];
  const thick = (t: number) => lw * (0.3 + 0.7 * Math.sin(Math.PI * Math.min(1, t * 0.85)) + (f ? 0.3 * t * t : 0.1 * t));
  for (let i = 0; i <= 16; i++) {
    const t = i / 16, x = bez(t, 0), y = bez(t, 1);
    const ta = Math.max(0, t - 0.01), tb = Math.min(1, t + 0.01);
    let tx = bez(tb, 0) - bez(ta, 0), ty = bez(tb, 1) - bez(ta, 1); const L = Math.hypot(tx, ty) || 1; tx /= L; ty /= L;
    // the normal that points up, away from the eye
    let nx = ty, ny = -tx; if (ny > 0) { nx = -nx; ny = -ny; }
    const h = thick(t);
    outerPts.push(`${n(x + nx * h * 0.7)} ${n(y + ny * h * 0.7)}`); innerPts.push(`${n(x - nx * h * 0.3)} ${n(y - ny * h * 0.3)}`);
  }
  const wing = f ? `${n(xo + side * 3)} ${n(yo - 2.2)}` : `${n(xo + side * 0.8)} ${n(yo - 0.3)}`;
  const lashLine = `<path d="M${outerPts.join(' L')} L${wing} L${innerPts.reverse().join(' L')} Z" fill="${ink}" stroke="none"/>`;
  const flick = '';
  // the lid crease: a faint, soft line just above, only a suggestion
  const crease = l.kind === 'baby' ? '' : `<path d="M${n(xi + side * rx * 0.28)} ${n(cy - ry * 1.18)} Q${n(cx + side * rx * 0.15)} ${n(cy - ry * 1.5)} ${n(xo - side * rx * 0.12)} ${n(cy - ry * 1.02)}" stroke="${shade(l.skin, -0.28)}" stroke-width="1" fill="none" stroke-linecap="round" opacity="${l.kind === 'kid' ? 0.22 : 0.38}"/>`;
  const lowerLine = `<path d="M${n(xo - side * rx * 0.1)} ${n(yo + ry * 0.4)} C${n(xo - side * rx * 0.28)} ${n(cy + ry * 1.0)} ${n(cx)} ${n(cy + ry * 1.06)} ${n(cx - side * rx * 0.2)} ${n(cy + ry * 0.98)}" stroke="${ink}" stroke-width=".9" fill="none" stroke-linecap="round" opacity=".28"/>`;
  return `<clipPath id="${clip}"><path d="${shape}"/></clipPath>
    <path d="${shape}" fill="#fffdf8" stroke="none"/>
    <g clip-path="url(#${clip})">
      <circle cx="${n(ix)}" cy="${n(iy)}" r="${n(ir)}" fill="url(#ir${id})" stroke="${shade(eyeCol, -0.5)}" stroke-width="1.3"/>
      <circle cx="${n(ix)}" cy="${n(iy + ir * 0.04)}" r="${n(ir * 0.38)}" fill="#170e0b" stroke="none"/>
      ${shine}
      <path d="${upper}" stroke="#000" stroke-width="4" fill="none" opacity=".06" transform="translate(0 2)"/>
    </g>
    ${crease}${lowerLine}${lashLine}${flick}`;
}

function talesBrows(s: FaceSpec, l: Look, gap: number): string {
  const ex = exprOf(l), f = femme(l);
  const [lift, tilt] = BROWS[ex] ?? [0, 0];
  const up = -SHAPE_RANGE.browHeight * shapeOf(l, 'browHeight'), weight = 1 + SHAPE_RANGE.browWeight * shapeOf(l, 'browWeight');
  // real brows: the hair colour, deepened so fair and grey brows still read
  const c = l.kind === 'baby' ? mixHex(l.hair, l.skin, 0.35) : mixHex(shade(l.hair, -0.22), '#3a2a22', lum(l.hair) > 0.6 ? 0.35 : 0.1);
  const [thIn, thPk] = (l.kind === 'baby' ? [1.9, 1.5] : l.kind === 'kid' ? [3, 2.4] : f ? [3.3, 2.6] : [4.4, 3.6]).map((v) => v * weight);
  const n = (v: number) => v.toFixed(1);
  return ([-1, 1] as const).map((sd) => {
    // high above the eye with a soft arch: brows carry the expression, and never glare
    const base = s.ey - s.ery * 1.42 - (l.kind === 'baby' ? 7 : 8.5) + up + (ex === 'wink' ? (sd === -1 ? lift - 3 : lift + 2) : lift);
    const t = Math.max(-6, Math.min(1.2, tilt * 0.7)); // inner end: up for worry, only a hair down for bravery
    const inX = 100 + sd * (s.ex + gap - s.erx * 0.8), outX = 100 + sd * (s.ex + gap + s.erx * 1.15);
    const pkX = 100 + sd * (s.ex + gap + s.erx * 0.42), pk = base - (l.kind === 'baby' ? 2.6 : 3.8);
    const inY = base + 1.2 + t, outY = base + 3;
    // a rounded head at the inner end, fullest there, tapering through the arch to a fine tail
    return `<path d="M${n(inX)} ${n(inY - thIn * 0.5)} Q${n(pkX - sd * 4)} ${n(pk - thPk * 0.75)} ${n(pkX)} ${n(pk - thPk * 0.5)} Q${n(pkX + sd * 5)} ${n(pk - thPk * 0.3)} ${n(outX)} ${n(outY)} Q${n(pkX + sd * 4)} ${n(pk + thPk * 0.35)} ${n(pkX)} ${n(pk + thPk * 0.5)} Q${n(pkX - sd * 4)} ${n(pk + thPk * 0.6)} ${n(inX)} ${n(inY + thIn * 0.5)} Q${n(inX - sd * thIn * 0.55)} ${n(inY)} ${n(inX)} ${n(inY - thIn * 0.5)} Z" fill="${c}" stroke="none" opacity=".94"/>`;
  }).join('');
}

function talesNose(s: FaceSpec, l: Look): string {
  const d = shade(l.skin, -0.3), ny = s.ey + (l.kind === 'baby' ? 16 : l.kind === 'kid' ? 18 : 21);
  const n = (v: number) => v.toFixed(1);
  const grownN = l.kind === 'adult' || l.kind === 'elder';
  if (DESIGN === 'pocketlight') // Movie 3D: a small rounded button
    return `<ellipse cx="100" cy="${n(ny + 1)}" rx="${grownN ? 4.4 : 3.8}" ry="${grownN ? 3.4 : 2.8}" fill="${shade(l.skin, -0.07)}" stroke="none"/><path d="M96.6 ${n(ny + 2.6)} Q100 ${n(ny + 4.6)} 103.4 ${n(ny + 2.6)}" stroke="${d}" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".6"/><ellipse cx="99" cy="${n(ny - 0.4)}" rx="1.7" ry="1.1" fill="#fff" opacity=".5"/>`;
  if (DESIGN === 'wondercut' && l.kind !== 'baby') // Sparkle: a small, upturned tip
    return `<path d="M97.6 ${n(ny + 1.8)} Q100.6 ${n(ny + 3.4)} 103.4 ${n(ny + 1.2)}" stroke="${d}" stroke-width="1.3" fill="none" stroke-linecap="round"/><ellipse cx="100.4" cy="${n(ny)}" rx="2.6" ry="1.8" fill="#fff" opacity=".4"/>`;
  if (DESIGN === 'gouache') // Chibi: just a tiny dot of a nose
    return `<ellipse cx="100" cy="${n(ny + 2)}" rx="2.2" ry="1.5" fill="${shade(l.skin, -0.22)}" stroke="none"/>`;
  const hi = `<ellipse cx="100.6" cy="${n(ny - 1.4)}" rx="2.2" ry="1.3" fill="#fff" opacity=".35"/>`;
  if (l.kind === 'baby') {
    // a button nose: a soft round tip and two tiny nostrils
    return `<ellipse cx="100" cy="${n(ny)}" rx="4.6" ry="3.3" fill="${shade(l.skin, -0.06)}" stroke="none"/><path d="M96.4 ${n(ny + 1.4)} Q100 ${n(ny + 3.8)} 103.6 ${n(ny + 1.4)}" stroke="${d}" stroke-width="1.3" fill="none" stroke-linecap="round" opacity=".7"/>${hi}`;
  }
  // a real little nose, as if turned a touch: the bridge's shadow side, the tip, both nostril wings
  const k = l.kind === 'kid' ? 0.82 : femme(l) ? 0.95 : 1.12;
  const g = (x: number, y: number) => `${n(100 + (x - 100) * k)} ${n(ny + y * k)}`;
  const bridge = l.kind === 'kid' ? '' : `<path d="M${g(104, -17)} Q${g(106, -9)} ${g(105.6, -4)}" stroke="${d}" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".35"/>`;
  return `${bridge}<ellipse cx="${n(100.5)}" cy="${n(ny + 5.6 * k)}" rx="${n(5 * k)}" ry="1.4" fill="${shade(l.skin, -0.16)}" opacity=".35" stroke="none"/>
    <path d="M${g(94.6, -1.6)} C${g(92.6, 0.6)} ${g(93.4, 3.4)} ${g(96.6, 3)}" stroke="${d}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <path d="M${g(97.4, 3.6)} Q${g(100.8, 5.2)} ${g(104.4, 3.4)}" stroke="${d}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <path d="M${g(105.8, -1.4)} C${g(108, 0.6)} ${g(107.2, 3.2)} ${g(104.4, 3.4)}" stroke="${d}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <ellipse cx="${n(100 + (97.8 - 100) * k)}" cy="${n(ny + 2.5 * k)}" rx="1.2" ry=".7" fill="${shade(l.skin, -0.45)}" opacity=".5" stroke="none"/><ellipse cx="${n(100 + (103.2 - 100) * k)}" cy="${n(ny + 2.5 * k)}" rx="1.2" ry=".7" fill="${shade(l.skin, -0.45)}" opacity=".5" stroke="none"/>${hi}`;
}

function talesMouth(id: string, s: FaceSpec, l: Look): string {
  const ex = exprOf(l), f = femme(l), grown = l.kind === 'adult' || l.kind === 'elder';
  const my = s.ey + (l.kind === 'baby' ? 26 : l.kind === 'kid' ? 30 : 35) + (DESIGN === 'inked' && (l.kind === 'adult' || l.kind === 'elder') ? 2 : DESIGN === 'gouache' ? -4 : 0);
  const n = (v: number) => v.toFixed(1);
  // lips in the person's own colouring: a natural rose for grown women, a soft flush of the skin for everyone else
  const lower = f && grown ? mixHex(l.skin, '#c95a68', 0.5) : mixHex(l.skin, '#c96f78', l.kind === 'baby' ? 0.26 : 0.24);
  const upper = shade(lower, f && grown ? -0.14 : -0.1);
  const seam = mixHex(shade(l.skin, -0.58), '#6e2230', 0.35);
  const wd = (l.kind === 'baby' ? 7.5 : l.kind === 'kid' ? 9.5 : f ? 11.5 : 12) * (DESIGN === 'gouache' ? 0.62 : DESIGN === 'wondercut' ? 0.9 : 1);
  // lip thickness at the middle: the upper lip thinner than the lower, both fuller for grown women
  const tu = l.kind === 'baby' ? 1.3 : l.kind === 'kid' ? 1.8 : f ? 3.2 : 2.1;
  const tl = l.kind === 'baby' ? 2.4 : l.kind === 'kid' ? 2.9 : f ? 4.2 : 3;
  const X = (dx: number) => n(100 + dx);
  const chin = ''; // the soft shadow under the lower lip is enough
  const corners = (w: number, y: number) => `<path d="M${X(-w - 1.3)} ${n(y - 1.4)} q.8 1.3 1.8 1.6 M${X(w + 1.3)} ${n(y - 1.4)} q-.8 1.3 -1.8 1.6" stroke="${seam}" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".5"/>`;
  /**
   * The lips around a mouth line that runs from the corners (±w, y0) down to y0 + c in the middle.
   * The upper lip follows that line, a little thicker in the middle with a soft cupid's bow; the lower lip
   * is the fuller one, with a small shine (the NomNoms touch) and a soft shadow underneath.
   */
  const lips = (w: number, y0: number, c: number, k = 1) => {
    const line = `M${X(-w)} ${n(y0)} Q100 ${n(y0 + 2 * c)} ${X(w)} ${n(y0)}`;
    const up = tu * k, lo = tl * k;
    const upperLip = `<path d="M${X(-w)} ${n(y0)} Q${X(-w * 0.55)} ${n(y0 + c * 0.9 - up * 0.95)} ${X(-2.6)} ${n(y0 + c - up)} Q${X(-1.1)} ${n(y0 + c - up * 0.98)} 100 ${n(y0 + c - up * 0.66)} Q${X(1.1)} ${n(y0 + c - up * 0.98)} ${X(2.6)} ${n(y0 + c - up)} Q${X(w * 0.55)} ${n(y0 + c * 0.9 - up * 0.95)} ${X(w)} ${n(y0)} Q100 ${n(y0 + 2 * c)} ${X(-w)} ${n(y0)} Z" fill="${upper}" stroke="none"/>`;
    // the lower lip sits under the middle three-quarters of the line
    const ex0 = w * 0.78, ey0 = y0 + c * (1 - 0.78 * 0.78), cy = y0 + 1.56 * c + 2 * lo;
    const lowerLip = `<path d="M${X(-ex0)} ${n(ey0)} Q100 ${n(cy)} ${X(ex0)} ${n(ey0)} Q100 ${n(y0 + 2 * c)} ${X(-ex0)} ${n(ey0)} Z" fill="${lower}" stroke="none"/>`;
    const shine = `<ellipse cx="${X(1.6)}" cy="${n(y0 + c + lo * 0.42)}" rx="${n(w * 0.17)}" ry="${n(Math.max(0.7, lo * 0.18))}" fill="#fff" opacity="${f && grown ? 0.38 : 0.22}"/>`;
    const under = `<path d="M${X(-ex0 * 0.6)} ${n(y0 + c + lo + 1.8)} Q100 ${n(y0 + c + lo + 3)} ${X(ex0 * 0.6)} ${n(y0 + c + lo + 1.8)}" stroke="${shade(l.skin, -0.16)}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".26"/>`;
    return { line, upperLip, lowerLip, shine, under };
  };
  const smile = (w: number, c: number) => {
    const L = lips(w, my - 1, c);
    return L.under + L.lowerLip + L.shine + L.upperLip + `<path d="${L.line}" stroke="${seam}" stroke-width="1.5" fill="none" stroke-linecap="round"/>` + corners(w, my - 1) + chin;
  };
  const open = (h: number, wf = 1, teeth = l.kind !== 'baby') => {
    const W = wd * 1.06 * wf, c = 2.2, y0 = my - 1;
    const L = lips(W, y0, c, 0.85);
    // the opening: its top follows the smile line, its bottom a soft round curve
    const d = `M${X(-W)} ${n(y0)} Q100 ${n(y0 + 2 * c)} ${X(W)} ${n(y0)} Q${X(W * 0.78)} ${n(y0 + h)} 100 ${n(y0 + h)} Q${X(-W * 0.78)} ${n(y0 + h)} ${X(-W)} ${n(y0)} Z`;
    const teethD = `M${X(-W)} ${n(y0)} Q100 ${n(y0 + 2 * c)} ${X(W)} ${n(y0)} L${X(W)} ${n(y0 + h * 0.36)} Q100 ${n(y0 + 2 * c + h * 0.42)} ${X(-W)} ${n(y0 + h * 0.36)} Z`;
    const lo = tl * 0.8, bot = y0 + h;
    const lowerLip = `<path d="M${X(-W * 0.66)} ${n(bot - h * 0.32)} Q${X(-W * 0.36)} ${n(bot + 0.4)} 100 ${n(bot + 0.2)} Q${X(W * 0.36)} ${n(bot + 0.4)} ${X(W * 0.66)} ${n(bot - h * 0.32)} Q${X(W * 0.5)} ${n(bot + lo * 1.1)} 100 ${n(bot + lo)} Q${X(-W * 0.5)} ${n(bot + lo * 1.1)} ${X(-W * 0.66)} ${n(bot - h * 0.32)} Z" fill="${lower}" stroke="none"/>`;
    const shine = `<ellipse cx="${X(1.6)}" cy="${n(bot + lo * 0.5)}" rx="${n(W * 0.15)}" ry=".8" fill="#fff" opacity="${f && grown ? 0.36 : 0.2}"/>`;
    return `<clipPath id="tm${id}"><path d="${d}"/></clipPath><path d="${d}" fill="#5a1d26" stroke="${seam}" stroke-width="1.2"/>
      <g clip-path="url(#tm${id})">${teeth ? `<path d="${teethD}" fill="#fffaf3" stroke="none"/>` : ''}<ellipse cx="100" cy="${n(bot + 1)}" rx="${n(W * 0.5)}" ry="${n(h * 0.36)}" fill="#d65f6c" stroke="none"/></g>
      ${lowerLip}${shine}${L.upperLip}${corners(W, y0)}${chin}`;
  };
  const line = (d: string, sw = 1.6) => `<path d="${d}" stroke="${seam}" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  /**
   * "Oh": a small open mouth, not a ring. The opening is a soft oval a little narrower at the top, the upper lip
   * a thin arch over it with a hint of a cupid's bow, the fuller lower lip a crescent under it, and the corners pinched.
   */
  const oh = (rx: number, ry: number, k = 1) => {
    const cy = my + 3, top = cy - ry, bot = cy + ry, up = tu * (f && grown ? 0.8 : 0.55) * k, lo = tl * (f && grown ? 0.85 : 0.7) * k;
    const open = `M100 ${n(top)} C${X(rx * 0.75)} ${n(top)} ${X(rx)} ${n(cy - ry * 0.35)} ${X(rx)} ${n(cy + ry * 0.1)} C${X(rx)} ${n(cy + ry * 0.7)} ${X(rx * 0.6)} ${n(bot)} 100 ${n(bot)} C${X(-rx * 0.6)} ${n(bot)} ${X(-rx)} ${n(cy + ry * 0.7)} ${X(-rx)} ${n(cy + ry * 0.1)} C${X(-rx)} ${n(cy - ry * 0.35)} ${X(-rx * 0.75)} ${n(top)} 100 ${n(top)} Z`;
    const cx0 = rx + 1.6, cyc = cy + ry * 0.1;
    const upperLip = `<path d="M${X(-cx0)} ${n(cyc)} C${X(-cx0)} ${n(top - up * 0.6)} ${X(-3)} ${n(top - up * 1.05)} 100 ${n(top - up * 0.7)} C${X(3)} ${n(top - up * 1.05)} ${X(cx0)} ${n(top - up * 0.6)} ${X(cx0)} ${n(cyc)} C${X(rx)} ${n(cy - ry * 0.35)} ${X(rx * 0.75)} ${n(top)} 100 ${n(top)} C${X(-rx * 0.75)} ${n(top)} ${X(-rx)} ${n(cy - ry * 0.35)} ${X(-cx0)} ${n(cyc)} Z" fill="${upper}" stroke="none"/>`;
    const lowerLip = `<path d="M${X(-cx0)} ${n(cyc)} C${X(-rx)} ${n(cy + ry * 0.7)} ${X(-rx * 0.6)} ${n(bot)} 100 ${n(bot)} C${X(rx * 0.6)} ${n(bot)} ${X(rx)} ${n(cy + ry * 0.7)} ${X(cx0)} ${n(cyc)} C${X(cx0 + 0.4)} ${n(bot + lo * 0.6)} ${X(rx * 0.5)} ${n(bot + lo)} 100 ${n(bot + lo)} C${X(-rx * 0.5)} ${n(bot + lo)} ${X(-cx0 - 0.4)} ${n(bot + lo * 0.6)} ${X(-cx0)} ${n(cyc)} Z" fill="${lower}" stroke="none"/>`;
    const shine = `<ellipse cx="${X(1.2)}" cy="${n(bot + lo * 0.55)}" rx="${n(rx * 0.32)}" ry=".7" fill="#fff" opacity="${f && grown ? 0.35 : 0.2}"/>`;
    const under = `<path d="M${X(-rx * 0.5)} ${n(bot + lo + 2)} Q100 ${n(bot + lo + 3)} ${X(rx * 0.5)} ${n(bot + lo + 2)}" stroke="${shade(l.skin, -0.16)}" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".25"/>`;
    return `${under}<clipPath id="to${id}"><path d="${open}"/></clipPath><path d="${open}" fill="#4f1a22" stroke="${seam}" stroke-width=".9"/><g clip-path="url(#to${id})"><ellipse cx="100" cy="${n(bot + 0.6)}" rx="${n(rx * 0.7)}" ry="${n(ry * 0.45)}" fill="#c9586a" stroke="none"/></g>${lowerLip}${shine}${upperLip}`;
  };
  switch (ex) {
    case 'laugh': case 'starry': return open(l.kind === 'baby' ? 10 : 12.5, 1.06);
    case 'grin': return open(l.kind === 'baby' ? 8.5 : 10);
    case 'silly': return open(8) + `<path d="M96 ${my + 4} Q96 ${my + 13} 102 ${my + 13} Q108 ${my + 13} 108 ${my + 4} Z" fill="#e2707c" stroke="${shade('#e2707c', -0.3)}" stroke-width="1.2"/>`;
    case 'wow': return oh(wd * 0.34, wd * 0.44);
    case 'worried': {
      const L = lips(wd * 0.72, my + 2, -0.6, 0.85);
      return L.under + L.lowerLip + L.upperLip + line(`M${X(-wd * 0.72)} ${my + 2} Q${X(-wd * 0.36)} ${my + 0.4} 100 ${my + 1.6} Q${X(wd * 0.36)} ${my + 2.8} ${X(wd * 0.72)} ${my + 1.4}`) + chin;
    }
    case 'sleepy': return oh(wd * 0.2, wd * 0.24, 0.7);
    case 'shy': return smile(wd * 0.68, 1.8);
    case 'dreamy': return smile(wd * 0.82, 2.4);
    case 'brave': {
      const L = lips(wd, my - 1, 2.2);
      return L.under + L.lowerLip + L.shine + L.upperLip + line(`M${X(-wd)} ${my} Q${X(2)} ${my + 4.6} ${X(wd)} ${my - 2.6}`) + corners(wd, my - 1) + chin;
    }
    case 'wink': return smile(wd * 1.02, 3.4);
    case 'proud': return smile(wd * 1.08, 3.8);
    default: return smile(wd, 3.2);
  }
}

function talesFace(id: string, l: Look): string {
  const [rawBack, rawFront] = hair(id, l);
  const S = talesSpec(l), skin = `url(#sk${id})`, head = coreHead(S, l);
  // the hairstyles are drawn for a rounder head: fitted to this one so they hug it instead of floating round it
  const fit = (x: string) => onHead(l, x);
  const back = fit(!OPEN_HEADWEAR.includes(l.hat) && ['puff', 'topknot', 'bun'].includes(l.hairStyle) ? '' : rawBack), front = fit(rawFront);
  const gap = SHAPE_RANGE.eyeGap * shapeOf(l, 'eyeGap');
  const nose = 1 + SHAPE_RANGE.nose * shapeOf(l, 'nose'), mw = 1 + SHAPE_RANGE.mouth * shapeOf(l, 'mouth');
  const around = (x: number, y: number, sx: number, sy: number, inner: string) => (sx === 1 && sy === 1 ? inner : `<g transform="translate(${x} ${y}) scale(${+sx.toFixed(3)} ${+sy.toFixed(3)}) translate(${-x} ${-y})">${inner}</g>`);
  const neckW = l.kind === 'baby' ? 13 : l.kind === 'kid' ? 11 : femme(l) ? 9 : 12.5;
  const earX = S.cran - 1.5;
  const ears = COVERS_EARS.includes(l.hairStyle) ? '' : [-1, 1].map((sd) => `<ellipse cx="${100 + sd * earX}" cy="${S.ey + 2}" rx="${l.kind === 'baby' ? 7.5 : 6.5}" ry="${l.kind === 'baby' ? 9 : 9.5}" fill="${skin}"/><path d="M${100 + sd * (earX + 1.5)} ${S.ey - 3} q${sd * 3.6} 5 0 10" stroke="${shade(l.skin, -0.25)}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".6"/>`).join('');
  const clip = `th${id}`;
  const blushX = S.ex + gap + (l.kind === 'baby' ? 11 : 10), blushY = S.ey + (l.kind === 'baby' ? 16 : 17);
  const fr = l.freckles ? [[-blushX + 2, blushY - 2], [-blushX + 8, blushY + 2], [-blushX - 4, blushY + 3], [blushX - 2, blushY - 2], [blushX - 8, blushY + 2], [blushX + 4, blushY + 3]].map(([x, y]) => `<circle cx="${100 + x}" cy="${y}" r="1.4" fill="${shade(l.skin, -0.32)}" opacity=".8"/>`).join('') : '';
  // hair fills the top of the head right down to the hairline (see coreFace)
  const scalpOn = !['bald', 'tuft', 'buzz', 'sides'].includes(l.hairStyle);
  const T = S.ey - 14, cr = S.cran * (1 + SHAPE_RANGE.faceWidth * shapeOf(l, 'faceWidth'));
  const bigHead = coreHead({ ...S, top: S.top - 2.5, cran: S.cran + 2.5 }, l);
  const scalp = scalpOn ? `<clipPath id="tsc${id}"><path d="M-20 -60 H220 V${T} H${(100 + cr + 4).toFixed(1)} Q100 ${(2 * (S.top + 22) - T).toFixed(1)} ${(100 - cr - 4).toFixed(1)} ${T} H-20 Z"/></clipPath><path d="${bigHead}" fill="url(#hr${id})" clip-path="url(#tsc${id})"/>` : '';
  const seam = scalpOn ? `<clipPath id="trg${id}"><path clip-rule="evenodd" d="${bigHead} ${coreHead({ ...S, top: S.top + 12, cran: S.cran - 12 }, l)}"/></clipPath><g clip-path="url(#tsc${id})"><path d="${bigHead}" fill="url(#hr${id})" stroke="none" clip-path="url(#trg${id})"/></g>` : '';
  // cel shading: one shadow tone down the far side of the face and under the hairline
  const shadowTone = DESIGN === 'pocketlight' ? shade(l.skin, -0.035) : mixHex(shade(l.skin, -0.13), '#b4524a', 0.12);
  return `${back}
    <path d="M${100 - neckW} 134 L${100 + neckW} 134 L${100 + neckW - 1} 160 L${100 - neckW + 1} 160 Z" fill="${l.outfit === 'supersuit' ? shade(superOf(l).suit, -0.12) : shade(l.skin, -0.14)}"/>
    ${ears}
    <clipPath id="${clip}"><path d="${head}"/></clipPath>
    <path d="${head}" fill="${shadowTone}"/>
    <g clip-path="url(#${clip})"><path d="${head}" fill="${skin}" transform="translate(-6 -5)" stroke="none"/>${scalpOn ? `<path d="M30 ${S.top + 30} Q100 ${S.top + 18} 170 ${S.top + 30} L170 ${S.top + 40} Q100 ${S.top + 30} 30 ${S.top + 40} Z" fill="${shadowTone}" opacity=".6" stroke="none"/>` : ''}</g>
    <ellipse cx="82" cy="${S.top + 26}" rx="11" ry="5" fill="#fff" opacity=".16" transform="rotate(-18 82 ${S.top + 26})"/>
    ${[-1, 1].map((sd) => `<ellipse cx="${100 + sd * blushX}" cy="${blushY}" rx="${l.kind === 'baby' ? 11 : 10}" ry="${l.kind === 'baby' ? 7.5 : 6}" fill="url(#bl${id})"/>`).join('')}${fr}
    ${heroMask(S, l, gap)}<g class="bt-eyes">${talesEye(id, S, l, -1, gap)}${talesEye(id, S, l, 1, gap)}</g>
    ${talesBrows(S, l, gap)}
    ${around(100, S.ey + 20, nose, 1 + (nose - 1) * 0.35, talesNose(S, l))}
    ${facialHair(id, l)}
    ${around(100, S.ey + 34, mw, 1, talesMouth(id, S, l))}
    ${hairShadow(id, l, clip, front)}${back ? noInk(scalp) : scalp}${front}${scalpOn ? noInk(front) : ''}${seam}
    ${onHead(l, worldHair(l))}
    ${flair(l)}`;
}

/** The storybook line: every filled shape gets a soft outline in a darker shade of its own colour. */
function coreInk(svg: string, l: Look, id: string): string {
  // Classic Fairytale: a fine line; Bold Hero: a heavy, dark one
  const width = DESIGN === 'gouache' ? 2.2 : DESIGN === 'wondercut' ? 1.8 : DESIGN === 'inked' ? 2.6 : 2.3;
  const ink = (fill: string): string | null => {
    if (fill.startsWith('#')) return darken(fill.length === 4 ? `#${fill[1]}${fill[1]}${fill[2]}${fill[2]}${fill[3]}${fill[3]}` : fill, LINE);
    if (fill.startsWith(`url(#sk${id}`)) return darken(l.skin, LINE);
    if (fill.startsWith(`url(#hr${id}`)) return darken(l.hair, LINE + 0.06);
    if (fill.startsWith(`url(#fu${id}`)) return darken(l.hair, LINE);
    return null;
  };
  svg = svg.replace(/<image\b(?![^>]*\bfilter=)/g, `<image filter="url(#img${id})"`);
  const parts = svg.split(/(<defs>[\s\S]*?<\/defs>|<clipPath[\s\S]*?<\/clipPath>|<g class="bt-aura">[\s\S]*?<\/g><!--aura-->)/);
  return parts.map((part, i) => (i % 2 === 1 ? part : part.replace(/<(path|ellipse|circle|rect|polygon)\b([^>]*?)(\/?)>/g, (all, tag: string, attrs: string, close: string) => {
    if (/\b(stroke|opacity|fill-opacity|filter)=/.test(attrs)) return all;
    const fill = /\bfill="([^"]+)"/.exec(attrs)?.[1];
    if (!fill || fill === 'none' || /url\(#(ir|bl|gl|au|ag)/.test(fill)) return all;
    if (/^#fff(fff)?$/i.test(fill)) return all;
    const r = /\br="([\d.]+)"/.exec(attrs);
    if (tag === 'circle' && r && parseFloat(r[1]) < 3) return all;
    const c = ink(fill);
    return c ? `<${tag}${attrs} stroke="${c}" stroke-width="${width}" stroke-linejoin="round" paint-order="stroke"${close}>` : all;
  }))).join('');
}

/** How each world builds a body: torso, limbs, hands and feet. */
interface BodySpec { torso: string; sh: [number, number]; arm: number; sleeve: number; hand: number; thumb: number; legW: number; legX: [number, number]; foot: [number, number]; footX: [number, number] }
const BODY_SPEC: Record<WorldId, BodySpec> = {
  everyday: { torso: 'M63 160 C63 146 137 146 137 160 C138 172 133 184 131 192 C133 204 139 213 141 221 C128 231 72 231 59 221 C61 213 67 204 69 192 C67 184 62 172 63 160 Z', sh: [70, 130], arm: 17, sleeve: 19, hand: 10.5, thumb: 4.5, legW: 20, legX: [77, 103], foot: [15, 8], footX: [82, 118] },
  fairytale: { torso: 'M72 158 C76 148 124 148 128 158 L131 186 Q124 198 138 222 C124 232 76 232 62 222 Q76 198 69 186 Z', sh: [74, 126], arm: 12, sleeve: 14, hand: 8, thumb: 3.5, legW: 17, legX: [81, 102], foot: [13, 7], footX: [88, 112] },
  adventure: { torso: 'M56 158 C60 143 140 143 144 158 C146 174 140 186 138 194 C142 206 147 213 148 220 C134 234 66 234 52 220 C53 213 58 206 62 194 C60 186 54 174 56 158 Z', sh: [64, 136], arm: 22, sleeve: 24, hand: 13.5, thumb: 5.5, legW: 26, legX: [69, 105], foot: [20, 10.5], footX: [81, 119] },
  mythic: { torso: 'M48 154 C58 140 142 140 152 154 C150 168 138 182 134 194 C136 206 138 214 138 222 C124 230 76 230 62 222 C62 214 64 206 66 194 C62 182 50 168 48 154 Z', sh: [57, 143], arm: 19, sleeve: 21, hand: 11.5, thumb: 5, legW: 21, legX: [71, 108], foot: [16, 8.5], footX: [79, 121] },
};


/* ── the world's touches on a face: in the eyes and on the hair ── */
const CLOSED: Expression[] = ['laugh', 'proud', 'sleepy'];
function worldEyes(l: Look, gap: number): string {
  if (WORLD === 'everyday' || MODE === 'gouache') return '';
  const ex = exprOf(l);
  if (CLOSED.includes(ex)) return '';
  const at = (side: -1 | 1) => side === 1 && ex === 'wink' ? null : side === -1 && ex === 'silly' ? null : [side === -1 ? 78 - gap : 122 + gap, 101] as const;
  return ([-1, 1] as const).map((sd) => {
    const p = at(sd); if (!p) return '';
    const [x, y] = p;
    // fairytale: a little star of light in each eye; mythic: a golden glint; adventure: a bright second catchlight
    return WORLD === 'fairytale' ? sparkle(x + 4.5, y - 6, 3.6, '#fff')
      : WORLD === 'mythic' ? `<circle cx="${x + 4}" cy="${y + 4}" r="1.9" fill="#ffd36b"/>`
      : `<circle cx="${x + 5}" cy="${y - 5}" r="1.8" fill="#fff"/>`;
  }).join('');
}
/** Headwear that sits on the hair without covering it (a bun or puff still shows). */
const OPEN_HEADWEAR = ['none', 'circlet', 'laurel', 'tiara', 'flowers', 'crown', 'headband', 'clips', 'bow', 'bandana', 'headphones'];
const BIG_HAIR: HairStyle[] = ['afro', 'puff', 'bald', 'buzz', 'cornrows', 'coils'];
function worldHair(l: Look): string {
  if (WORLD === 'everyday' || BIG_HAIR.includes(l.hairStyle)) return '';
  const open = OPEN_HEADWEAR.includes(l.hat) && l.hat !== 'bandana';
  switch (WORLD) {
    case 'fairytale': // a glossy band of light across the hair
      return open ? `<path d="M66 54 Q98 30 132 50" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".38"/><path d="M76 48 Q86 41 96 39" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".55"/>` : '';
    case 'adventure': // windswept: a few tufts blown to one side
      return l.hat === 'none' ? `<g fill="${l.hair}"><path d="M120 40 Q132 22 150 24 Q136 30 134 44 Z"/><path d="M132 50 Q150 38 166 46 Q150 48 142 58 Z"/><path d="M90 36 Q96 20 112 18 Q102 26 104 38 Z"/></g>` : `<g fill="${l.hair}"><path d="M150 70 Q166 60 176 66 Q164 70 158 80 Z"/></g>`;
    case 'mythic': // a golden rim of light along the top of the hair
      return open ? `<path d="M56 66 Q58 32 100 26 Q128 26 140 40" stroke="#ffd36b" stroke-width="3.2" fill="none" stroke-linecap="round" opacity=".75"/>` : '';
  }
  return '';
}

/**
 * The world's light around the character, behind them: a rosy glow with twinkles
 * (fairytale), wind and dust (adventure), a golden halo with rays (mythic).
 * `hy` is where the head sits after the world's build.
 */
function worldAura(id: string, hy: number): string {
  if (RAW_WORLD === 'ocean') // a shimmer of sea light and bubbles rising past
    return `<defs><radialGradient id="au${id}"><stop offset="0" stop-color="#bff3ff" stop-opacity=".55"/><stop offset="1" stop-color="#bff3ff" stop-opacity="0"/></radialGradient></defs>
      <ellipse cx="100" cy="${(hy + 60).toFixed(0)}" rx="108" ry="138" fill="url(#au${id})"/>
      <g fill="#e8fbff" fill-opacity=".25" stroke="#ffffff" stroke-width="1.4" stroke-opacity=".8" class="bt-twinkles">${[[22, hy - 20, 6], [180, hy + 6, 4.5], [14, hy + 60, 3.5], [188, hy + 90, 5.5], [166, hy - 46, 3]].map(([x, y, r], i) => `<circle class="bt-twinkle" style="animation-delay:${(i * 0.41).toFixed(2)}s" cx="${x}" cy="${(y as number).toFixed(0)}" r="${r}"/>`).join('')}</g>`;
  if (RAW_WORLD === 'space') // starlight: a soft violet glow and little stars
    return `<defs><radialGradient id="au${id}"><stop offset="0" stop-color="#d9d2ff" stop-opacity=".55"/><stop offset="1" stop-color="#d9d2ff" stop-opacity="0"/></radialGradient></defs>
      <ellipse cx="100" cy="${(hy + 60).toFixed(0)}" rx="110" ry="140" fill="url(#au${id})"/>
      <g fill="#fff6d0" class="bt-twinkles">${[[24, hy - 30, 1], [178, hy - 6, 0.8], [12, hy + 70, 0.7], [186, hy + 96, 1], [160, hy - 52, 0.6]].map(([x, y, k], i) => `<path class="bt-twinkle" style="animation-delay:${(i * 0.37).toFixed(2)}s" transform="translate(${x} ${(y as number).toFixed(0)}) scale(${k})" d="M0 -7 Q0 0 7 0 Q0 0 0 7 Q0 0 -7 0 Q0 0 0 -7 Z"/>`).join('')}</g>`;
  switch (WORLD) {
    case 'fairytale':
      return `<defs><radialGradient id="au${id}"><stop offset="0" stop-color="#ffd6e6" stop-opacity=".7"/><stop offset=".55" stop-color="#ffe6c4" stop-opacity=".35"/><stop offset="1" stop-color="#ffe9c9" stop-opacity="0"/></radialGradient></defs>
        <ellipse cx="100" cy="${(hy + 70).toFixed(0)}" rx="112" ry="140" fill="url(#au${id})"/>
        <g class="bt-twinkles">${[[24, hy - 30, 6], [176, hy - 10, 5], [14, hy + 70, 4], [186, hy + 96, 6], [160, hy - 52, 3.5]].map(([x, y, r], i) => `<g class="bt-twinkle" style="animation-delay:${(i * 0.37).toFixed(2)}s">${sparkle(x, y, r, i % 2 ? '#ffd9e8' : '#fff4c4')}</g>`).join('')}</g>`;
    case 'adventure':
      return `<g fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity=".7"><path d="M-6 ${(hy + 40).toFixed(0)} Q22 ${(hy + 30).toFixed(0)} 42 ${(hy + 40).toFixed(0)}"/><path d="M-14 ${(hy + 62).toFixed(0)} Q14 ${(hy + 52).toFixed(0)} 30 ${(hy + 60).toFixed(0)}"/><path d="M168 ${(hy + 10).toFixed(0)} Q188 ${hy.toFixed(0)} 208 ${(hy + 8).toFixed(0)}"/></g>
        <g fill="#d8c7a6" opacity=".55">${[[48, 252, 9], [36, 246, 6], [152, 252, 9], [166, 246, 6], [60, 256, 5]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>`;
    case 'mythic':
      return `<defs><radialGradient id="au${id}"><stop offset="0" stop-color="#fff2c4" stop-opacity=".95"/><stop offset=".45" stop-color="#ffd36b" stop-opacity=".45"/><stop offset="1" stop-color="#ffd36b" stop-opacity="0"/></radialGradient>
        <radialGradient id="ag${id}"><stop offset="0" stop-color="#ffd36b" stop-opacity=".55"/><stop offset="1" stop-color="#ffd36b" stop-opacity="0"/></radialGradient></defs>
        <g opacity=".22">${Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2 + 0.2, x1 = 100 + 150 * Math.cos(a - 0.07), y1 = hy + 150 * Math.sin(a - 0.07), x2 = 100 + 150 * Math.cos(a + 0.07), y2 = hy + 150 * Math.sin(a + 0.07); return `<path d="M100 ${hy.toFixed(0)} L${x1.toFixed(0)} ${y1.toFixed(0)} L${x2.toFixed(0)} ${y2.toFixed(0)} Z" fill="#ffe08a"/>`; }).join('')}</g>
        <circle cx="100" cy="${hy.toFixed(0)}" r="96" fill="url(#au${id})"/>
        <ellipse cx="100" cy="254" rx="80" ry="12" fill="url(#ag${id})"/>`;
  }
  return '';
}

/* ── faces ────────────────────────────────────────────────── */
function humanFace(id: string, l: Look) {
  const [rawBack, front] = hair(id, l);
  // buns and puffs tuck under a hat
  const back = !OPEN_HEADWEAR.includes(l.hat) && ['puff', 'topknot', 'bun'].includes(l.hairStyle) ? '' : rawBack;
  const skin = `url(#sk${id})`;
  const fr = l.freckles ? [[64, 116], [70, 120], [60, 121], [136, 116], [130, 120], [140, 121]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="${shade(l.skin, -0.35)}" opacity=".7"/>`).join('') : '';
  const narrow = l.kind === 'adult' || l.kind === 'elder';
  const rosy = ['shy', 'proud', 'starry', 'laugh'].includes(exprOf(l));
  const blush = [66, 134].map((x) => `<ellipse cx="${x}" cy="118" rx="${rosy ? 16 : 13}" ry="${rosy ? 11 : 9}" fill="url(#bl${id})"/>${rosy ? `<ellipse cx="${x}" cy="118" rx="11" ry="7" fill="url(#bl${id})"/>` : ''}`).join('');
  // the head: an ellipse, or (with photo proportions) the same ellipse with its width, length and jaw adjusted
  const rx0 = narrow ? 57 : 60, ry0 = narrow ? 60 : 57;
  const rx = rx0 * (1 + SHAPE_RANGE.faceWidth * shapeOf(l, 'faceWidth'));
  const ry = ry0 * (1 + SHAPE_RANGE.faceLength * shapeOf(l, 'faceLength'));
  const cy = 94 - ry0 + ry; // keep the top of the head where the hair sits
  const jaw = 1 + SHAPE_RANGE.jaw * shapeOf(l, 'jaw');
  const k = 0.5523;
  const head = l.shape
    ? `<path d="M${100 - rx} ${cy} C${100 - rx} ${cy - ry * k} ${100 - rx * k} ${cy - ry} 100 ${cy - ry} C${100 + rx * k} ${cy - ry} ${100 + rx} ${cy - ry * k} ${100 + rx} ${cy} C${100 + rx} ${cy + ry * k} ${100 + rx * k * jaw} ${cy + ry} 100 ${cy + ry} C${100 - rx * k * jaw} ${cy + ry} ${100 - rx} ${cy + ry * k} ${100 - rx} ${cy} Z" fill="${skin}"/>`
    : `<ellipse cx="100" cy="94" rx="${rx0}" ry="${ry0}" fill="${skin}"/>`;
  const ear = rx - rx0;
  const gap = SHAPE_RANGE.eyeGap * shapeOf(l, 'eyeGap');
  const nose = 1 + SHAPE_RANGE.nose * shapeOf(l, 'nose');
  const mw = 1 + SHAPE_RANGE.mouth * shapeOf(l, 'mouth');
  const around = (x: number, y: number, sx: number, sy: number, inner: string) =>
    sx === 1 && sy === 1 ? inner : `<g transform="translate(${x} ${y}) scale(${+sx.toFixed(3)} ${+sy.toFixed(3)}) translate(${-x} ${-y})">${inner}</g>`;
  return `${back}
    <path d="M88 136 L112 136 L110 156 L90 156 Z" fill="${shade(l.skin, -0.12)}"/>
    <circle cx="${41 - ear}" cy="104" r="11.5" fill="${skin}"/><circle cx="${159 + ear}" cy="104" r="11.5" fill="${skin}"/>
    <path d="M${43 - ear} 98 q-5 6 0 12 M${157 + ear} 98 q5 6 0 12" stroke="${shade(l.skin, -0.25)}" stroke-width="2" fill="none" opacity=".5"/>
    ${head}
    <ellipse cx="100" cy="148" rx="30" ry="6" fill="#000" opacity=".05"/>
    ${blush}${fr}
    <g class="bt-eyes">${eye(id, 78 - gap, 101, l, -1)}${eye(id, 122 + gap, 101, l, 1)}${worldEyes(l, gap)}</g>
    ${brows(l)}
    ${around(100, 112, nose, 1 + (nose - 1) * 0.35, (MODE === 'inked' || (MODE === 'pocketlight' && (WORLD === 'fairytale' || WORLD === 'mythic'))) && (l.kind === 'adult' || l.kind === 'elder')
      ? `<path d="M101 98 Q105 110 101 116 Q98 117 96 115" stroke="${shade(l.skin, -0.42)}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`
      : MODE === 'gouache' ? `<ellipse cx="100" cy="114" rx="3.2" ry="2.2" fill="${shade(l.skin, -0.18)}"/>`
      : MODE === 'wondercut' ? `<circle cx="100" cy="114" r="3" fill="${shade(l.skin, -0.14)}"/>`
      : `<path d="M96.5 114 Q100 118 103.5 114" stroke="${shade(l.skin, -0.32)}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`)}
    ${facialHair(id, l)}
    ${around(100, 128, mw, 1, mouth(id, l))}
    ${front}
    ${onHead(l, worldHair(l))}
    <ellipse cx="80" cy="64" rx="22" ry="9" fill="#fff" opacity=".12" transform="rotate(-16 80 64)"/>
    ${flair(l)}`;
}

function petFace(id: string, l: Look) {
  const F = `url(#fu${id})`;
  const fur = l.hair;
  const light = shade(fur, 0.55);
  const eyes = (y: number, iris?: string) => [78, 122].map((x) => `<ellipse cx="${x}" cy="${y}" rx="10" ry="11" fill="${iris ?? '#1d1612'}"/>${iris ? `<ellipse cx="${x}" cy="${y}" rx="3.2" ry="8" fill="#120d0b"/>` : ''}<circle cx="${x - 3.5}" cy="${y - 4}" r="3.8" fill="#fff"/><circle cx="${x + 3.5}" cy="${y + 4}" r="1.6" fill="#fff" opacity=".85"/>`).join('');
  if (l.kind === 'cat') {
    return `<path d="M48 70 L44 22 L84 50 Z M152 70 L156 22 L116 50 Z" fill="${F}"/><path d="M52 60 L50 34 L74 52 Z M148 60 L150 34 L126 52 Z" fill="#f4b8c3"/>
      <ellipse cx="100" cy="98" rx="60" ry="54" fill="${F}"/>
      <ellipse cx="100" cy="124" rx="28" ry="18" fill="${light}"/>
      <g class="bt-eyes">${eyes(98, '#8bbf5a')}</g>
      <path d="M95 114 L105 114 L100 120 Z" fill="#e98a9a"/>
      <path d="M100 120 Q94 128 88 124 M100 120 Q106 128 112 124" stroke="#5a463c" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <path d="M70 118 L42 112 M70 124 L42 126 M130 118 L158 112 M130 124 L158 126" stroke="#5a463c" stroke-width="1.6" opacity=".6"/>
      <ellipse cx="66" cy="116" rx="10" ry="6" fill="url(#bl${id})"/><ellipse cx="134" cy="116" rx="10" ry="6" fill="url(#bl${id})"/>`;
  }
  if (l.kind === 'bunny') {
    return `<ellipse cx="78" cy="22" rx="15" ry="40" fill="${F}" transform="rotate(-8 78 22)"/><ellipse cx="78" cy="24" rx="7" ry="28" fill="#f4b8c3" transform="rotate(-8 78 24)"/>
      <ellipse cx="122" cy="22" rx="15" ry="40" fill="${F}" transform="rotate(8 122 22)"/><ellipse cx="122" cy="24" rx="7" ry="28" fill="#f4b8c3" transform="rotate(8 122 24)"/>
      <ellipse cx="100" cy="100" rx="56" ry="52" fill="${F}"/>
      <ellipse cx="100" cy="124" rx="24" ry="16" fill="${light}"/>
      <g class="bt-eyes">${eyes(98)}</g>
      <ellipse cx="100" cy="116" rx="6" ry="4.5" fill="#e98a9a"/>
      <path d="M100 120 v6 M92 128 Q100 132 108 128" stroke="#5a463c" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <rect x="95" y="128" width="10" height="8" rx="2" fill="#fff" stroke="#e6ddd3"/>
      <ellipse cx="68" cy="116" rx="10" ry="6" fill="url(#bl${id})"/><ellipse cx="132" cy="116" rx="10" ry="6" fill="url(#bl${id})"/>`;
  }
  return `<ellipse cx="48" cy="100" rx="18" ry="38" fill="${shade(fur, -0.35)}" transform="rotate(20 48 100)"/>
    <ellipse cx="152" cy="100" rx="18" ry="38" fill="${shade(fur, -0.35)}" transform="rotate(-20 152 100)"/>
    <ellipse cx="100" cy="96" rx="56" ry="52" fill="${F}"/>
    <ellipse cx="100" cy="124" rx="28" ry="20" fill="${light}"/>
    <ellipse cx="100" cy="70" rx="14" ry="10" fill="${light}" opacity=".5"/>
    <g class="bt-eyes">${eyes(96)}</g>
    <path d="M90 110 Q100 106 110 110 Q108 119 100 120 Q92 119 90 110 Z" fill="#2a201c"/><ellipse cx="96" cy="111" rx="3" ry="1.6" fill="#fff" opacity=".6"/>
    <path d="M100 120 v5 M90 127 Q100 135 110 127" stroke="#2a201c" stroke-width="2.8" fill="none" stroke-linecap="round"/>
    <path d="M100 132 q0 12 7 12 q7 0 6 -10" fill="#ef7b86"/>
    <ellipse cx="66" cy="116" rx="10" ry="6" fill="url(#bl${id})"/><ellipse cx="134" cy="116" rx="10" ry="6" fill="url(#bl${id})"/>`;
}

/* ── bodies and clothes ───────────────────────────────────── */
export interface Outfit { top: string; sleeve: 'short' | 'long' | 'none'; bottom: string; skirt?: string; shoes: string; bare?: boolean }
const OUTFIT: Record<string, Outfit> = {
  tee: { top: '#5e8fb8', sleeve: 'short', bottom: '#3f5f86', shoes: '#f5f1ea' },
  overalls: { top: '#f5efe4', sleeve: 'short', bottom: '#5a7ea7', shoes: '#e86f5b' },
  hoodie: { top: '#8fbf9f', sleeve: 'long', bottom: '#4a5568', shoes: '#f5f1ea' },
  dress: { top: '#b9a5e3', sleeve: 'short', bottom: '', skirt: '#a48fd6', shoes: '#f2c14e', bare: true },
  cardigan: { top: '#c9a27a', sleeve: 'long', bottom: '#6b7b8c', shoes: '#5a3b26' },
  pajamas: { top: '#a9b8e8', sleeve: 'long', bottom: '#a9b8e8', shoes: '#a9b8e8' },
  swimsuit: { top: '#ef7d6b', sleeve: 'none', bottom: '', shoes: '', bare: true },
  raincoat: { top: '#f0bd45', sleeve: 'long', bottom: '#5a7ea7', shoes: '#d9534f' },
  snowsuit: { top: '#d9776b', sleeve: 'long', bottom: '#d9776b', shoes: '#3b2f2a' },
  party: { top: '#ef9fb6', sleeve: 'short', bottom: '', skirt: '#f6c3d2', shoes: '#e86f5b', bare: true },
  bee: { top: '#f4c443', sleeve: 'long', bottom: '#2b2622', shoes: '#2b2622' },
  dino: { top: '#7fb069', sleeve: 'long', bottom: '#7fb069', shoes: '#6d9b59' },
  pirate: { top: '#ffffff', sleeve: 'long', bottom: '#2b2622', shoes: '#5a3b26' },
  astronaut: { top: '#eef1f4', sleeve: 'long', bottom: '#eef1f4', shoes: '#c9d3dc' },
  hero: { top: '#4a76c4', sleeve: 'long', bottom: '#4a76c4', shoes: '#d9534f' },
  none: { top: '#f7f2ea', sleeve: 'short', bottom: '#f7f2ea', shoes: '', bare: true },
  stripes: { top: '#f5efe4', sleeve: 'short', bottom: '#5a7ea7', shoes: '#e86f5b' },
  sweater: { top: '#e9b949', sleeve: 'long', bottom: '#5a6b7c', shoes: '#f5f1ea' },
  denim: { top: '#6f93bf', sleeve: 'long', bottom: '#3b3f4a', shoes: '#f5f1ea' },
  puffer: { top: '#e86f5b', sleeve: 'long', bottom: '#3b3f4a', shoes: '#5a3b26' },
  jersey: { top: '#4a76c4', sleeve: 'short', bottom: '#f3f1ec', shoes: '#2b2f3a' },
  sailor: { top: '#f7f5ef', sleeve: 'short', bottom: '#2f4a7a', shoes: '#2b2622' },
  tutu: { top: '#f6b6c8', sleeve: 'none', bottom: '#f8d5df', skirt: '#fbd9e4', shoes: '#f6b6c8' },
  apron: { top: '#f5f5f2', sleeve: 'long', bottom: '#3b3f4a', shoes: '#2b2622' },
  doctor: { top: '#7cc4c0', sleeve: 'short', bottom: '#7cc4c0', shoes: '#f5f1ea' },
  firefighter: { top: '#c94a3a', sleeve: 'long', bottom: '#c94a3a', shoes: '#2b2622' },
  knight: { top: '#b9c2cc', sleeve: 'long', bottom: '#8a96a3', shoes: '#6b7480' },
  fairy: { top: '#a9dccb', sleeve: 'none', bottom: '', skirt: '#8fd0bd', shoes: '#f2c14e', bare: true },
  drawn: { top: 'none', sleeve: 'none', bottom: '', shoes: '', bare: true },
  // story worlds: original designs, no costume from any film
  gown: { top: '#c9a6d9', sleeve: 'short', bottom: '', skirt: '#b48fd0', shoes: '#f2d38a', bare: true },
  ftunic: { top: '#5d8fb0', sleeve: 'long', bottom: '#e9dcc4', shoes: '#7a5236' },
  cloak: { top: '#e9dcc4', sleeve: 'long', bottom: '#8a6a4a', shoes: '#5a3b26' },
  explorer: { top: '#f0e3c8', sleeve: 'short', bottom: '#7d6a4f', shoes: '#6b4a32' },
  ranger: { top: '#6f8f5a', sleeve: 'long', bottom: '#5a4a3a', shoes: '#4a3526' },
  armour: { top: '#c7cdd6', sleeve: 'long', bottom: '#3f5a8a', shoes: '#8a6a3a' },
  sunrobe: { top: '#f5ecd7', sleeve: 'none', bottom: '', skirt: '#efe2c3', shoes: '#c99a2e', bare: true },
};
/** The most colourful part of an outfit: what a world costume borrows so each person keeps their own colour. */
export function accentOf(outfit: string): string | undefined {
  const o = OUTFIT[outfit]; if (!o) return undefined;
  const sat = (hex: string) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx ? (mx - mn) / mx : 0; };
  const cs = [o.top, o.bottom, o.skirt ?? ''].filter((c) => /^#[0-9a-f]{6}$/i.test(c));
  const best = cs.sort((a, b) => sat(b) - sat(a))[0];
  return best && sat(best) > 0.2 ? best : undefined;
}
const WORLD_TINTED = ['gown', 'ftunic', 'cloak', 'armour', 'sunrobe', 'ranger', 'explorer'];
/** The colours of someone's outfit (with a world costume's own tint), for the other character designs (designs.ts). */
export function outfitColours(l: Look): Outfit {
  let o = l.outfit === 'drawn' ? OUTFIT.none : l.outfit === 'supersuit' ? superOutfit(l) : OUTFIT[l.outfit] ?? OUTFIT.tee;
  const tint = l.accent && WORLD_TINTED.includes(l.outfit) ? l.accent : undefined;
  if (tint && (l.outfit === 'ftunic' || l.outfit === 'gown')) o = { ...o, top: tint, skirt: o.skirt ? shade(tint, -0.12) : undefined };
  return o;
}
const TORSO = 'M64 158 C68 146 132 146 136 158 L141 220 C128 230 72 230 59 220 Z';

/**
 * A tapered limb along a curve ("M x y C x1 y1 x2 y2 x3 y3"): thicker at the
 * start (shoulder, hip) than the end (wrist, ankle), with round ends, as a
 * filled shape so it gets the same outline as everything else.
 */
function limb(d: string, w0: number, w1: number, fill: string): string {
  const n = d.match(/-?[\d.]+/g)?.map(Number) ?? [];
  if (n.length < 8) return '';
  const [x0, y0, x1, y1, x2, y2, x3, y3] = n;
  const pt = (t: number) => { const u = 1 - t; return [u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3]; };
  const L: number[][] = [], Rt: number[][] = [];
  const N = 10;
  for (let i = 0; i <= N; i++) {
    const t = i / N, [x, y] = pt(t), [xa, ya] = pt(Math.max(0, t - 0.02)), [xb, yb] = pt(Math.min(1, t + 0.02));
    let tx = xb - xa, ty = yb - ya; const len = Math.hypot(tx, ty) || 1; tx /= len; ty /= len;
    const h = (w0 + (w1 - w0) * t) / 2;
    L.push([x - ty * h, y + tx * h]); Rt.push([x + ty * h, y - tx * h]);
  }
  const f = (q: number[]) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`;
  return `<path d="M${f(L[0])} ${L.slice(1).map((q) => `L${f(q)}`).join(' ')} A${(w1 / 2).toFixed(1)} ${(w1 / 2).toFixed(1)} 0 0 0 ${f(Rt[N])} ${Rt.slice(0, N).reverse().map((q) => `L${f(q)}`).join(' ')} A${(w0 / 2).toFixed(1)} ${(w0 / 2).toFixed(1)} 0 0 0 ${f(L[0])} Z" fill="${fill}"/>`;
}
/** A mitten hand with a thumb. */
const mitten = (x: number, y: number, r: number, tx: number, ty: number, fill: string) =>
  `<ellipse cx="${x}" cy="${y}" rx="${(r * 0.7).toFixed(1)}" ry="${(r * 0.84).toFixed(1)}" fill="${fill}"/><ellipse cx="${tx}" cy="${ty}" rx="${(r * 0.34).toFixed(1)}" ry="${(r * 0.42).toFixed(1)}" fill="${fill}"/>`;

/** Legs and feet for an action (legs may be '' under a long gown: feet only). */
function legsFor(kind: Legs, B: BodySpec, E: number, legFill: string, feet: string): string {
  const hx = B.legX.map((x) => x + B.legW / 2);
  const foot = (x: number, y: number, rot: number, k = 1) => `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(B.foot[0] * k).toFixed(1)}" ry="${(B.foot[1] * k).toFixed(1)}" fill="${feet}" transform="rotate(${rot} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  const leg = (d: string) => (legFill ? limb(d, B.legW * 1.04, B.legW * 0.82, legFill) : '');
  const [a, b] = hx, end = 245 + E;
  switch (kind) {
    case 'walk': return leg(`M${a} 210 C${a - 2} ${222 + E / 3} ${a - 5} ${234 + E * 0.66} ${a - 7} ${end - 4}`) + leg(`M${b} 210 C${b + 1} ${222 + E / 3} ${b + 3} ${234 + E * 0.66} ${b + 4} ${end}`) + foot(B.footX[0] - 8, 245 + E, -22) + foot(B.footX[1] + 4, 250.5 + E, 16);
    case 'run': {
      // mid-stride, heading right: the front knee comes up, the back foot kicks up behind (sole showing)
      const L = end - 210;
      const seg = (x0: number, y0: number, x1: number, y1: number, bx: number, w0: number, w1: number) => (legFill ? limb(`M${x0.toFixed(1)} ${y0.toFixed(1)} C${(x0 + (x1 - x0) / 3 + bx).toFixed(1)} ${(y0 + (y1 - y0) / 3).toFixed(1)} ${(x0 + (2 * (x1 - x0)) / 3 + bx).toFixed(1)} ${(y0 + (2 * (y1 - y0)) / 3).toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`, w0, w1, legFill) : '');
      const W = B.legW, kf = [b + 0.46 * L, 210 + 0.3 * L], af = [kf[0] - 0.02 * L, kf[1] + 0.5 * L];
      const kb = [a - 0.16 * L, 210 + 0.46 * L], ab = [kb[0] - 0.46 * L, kb[1] - 0.12 * L];
      return seg(a, 210, kb[0], kb[1], -2, W * 1.04, W * 0.94) + seg(kb[0], kb[1], ab[0], ab[1], 0, W * 0.94, W * 0.82) + foot(ab[0] - 3, ab[1] - 2, -68, 0.9)
        + seg(b, 210, kf[0], kf[1], 2, W * 1.04, W * 0.94) + seg(kf[0], kf[1], af[0], af[1], 0, W * 0.94, W * 0.82) + foot(af[0] + 6, af[1] + 3, 8);
    }
    case 'jump': { const k = 211 + (end - 211) * 0.7; return leg(`M${a} 210 C${a - 9} 220 ${a - 13} ${k - 6} ${a - 9} ${k}`) + leg(`M${b} 210 C${b + 9} 220 ${b + 13} ${k - 6} ${b + 9} ${k}`) + foot(a - 10, k + 4, -28) + foot(b + 10, k + 4, 28); }
    case 'sit': return leg(`M${a} 210 C${a - 4} 214 ${a - 12} 218 ${a - 17} 221`) + leg(`M${b} 210 C${b + 4} 214 ${b + 12} 218 ${b + 17} 221`) + foot(a - 20, 223, -78, 1.05) + foot(b + 20, 223, 78, 1.05);
    case 'dance': return leg(`M${a} 210 C${a - 1} ${222 + E / 3} ${a - 2} ${234 + E * 0.66} ${a - 3} ${end}`) + foot(B.footX[0] - 3, 249 + E, -14) + leg(`M${b} 210 C${b + 10} 216 ${b + 20} 224 ${b + 30} ${232 + E * 0.4}`) + foot(b + 33, 235 + E * 0.4, 42, 0.95);
    default: return leg(`M${a} 210 C${a} ${222 + E / 3} ${a} ${234 + E * 0.66} ${a} ${end}`) + leg(`M${b} 210 C${b} ${222 + E / 3} ${b} ${234 + E * 0.66} ${b} ${end}`) + foot(B.footX[0] - 1, 249 + E, -14) + foot(B.footX[1] + 1, 250.5 + E, 14);
  }
}

/**
 * Super Heroes: everyone becomes an original superhero (no existing hero's suit, colours or emblem):
 * their own two-colour suit, a cape, a mask and an emblem, picked steadily from who they are.
 */
const SUPER = [
  { suit: '#d9463f', cape: '#2f5fb3', trim: '#ffcf3f' }, { suit: '#2f6fd0', cape: '#e5483a', trim: '#ffd84a' },
  { suit: '#7b4bc9', cape: '#2bb3a3', trim: '#ffe07a' }, { suit: '#22a06b', cape: '#f08a2e', trim: '#fff2c4' },
  { suit: '#e0569b', cape: '#ffc93a', trim: '#ffffff' }, { suit: '#1f3f7a', cape: '#ffb52e', trim: '#ffcf3f' },
];
export const EMBLEMS = ['star', 'bolt', 'heart', 'moon', 'sun', 'drop'] as const;
export type Emblem = (typeof EMBLEMS)[number];
/** Colours a parent can pick for a suit, cape or mask. */
export const HERO_COLOURS = ['#d9463f', '#f08a2e', '#ffc93a', '#22a06b', '#2bb3a3', '#2f6fd0', '#1f3f7a', '#7b4bc9', '#e0569b', '#2a2a33', '#f4f4f6', '#b9c2cc'];
function superOutfit(l: Look): Outfit {
  const H = superOf(l);
  return { top: H.suit, sleeve: 'long', bottom: shade(H.suit, -0.18), shoes: H.cape === 'none' ? shade(H.suit, -0.3) : H.cape } as Outfit;
}
export function superOf(l: Look) {
  const key = `${l.skin}|${l.hair}|${l.hairStyle}|${l.kind}|${l.eyes ?? ''}`;
  let h = 2166136261; for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
  const base = SUPER[(h >>> 8) % SUPER.length], c = l.hero ?? {};
  const suit = c.suit ?? base.suit;
  // the trim (belt and badge) stays gold, unless the suit is gold itself
  const trim = c.suit && /^#(ffc93a|ffcf3f|ffd84a)$/i.test(c.suit) ? '#1f3f7a' : base.trim;
  const emblem = (EMBLEMS as readonly string[]).includes(c.emblem ?? '') ? c.emblem as Emblem : EMBLEMS[(h >>> 20) % EMBLEMS.length];
  return { suit, cape: c.cape ?? base.cape, mask: c.mask ?? shade(c.cape && c.cape !== 'none' ? c.cape : base.cape, -0.18), trim, emblem };
}
/** An emblem on its own (for the costume picker). */
export const emblemSvg = (e: Emblem, fill = '#ffc93a', ink = '#2a2a33') => `<svg viewBox="-20 -20 40 40" aria-hidden="true">${emblemArt(e, 0, 0, 14, fill, ink)}</svg>`;
function emblemArt(e: Emblem, x: number, y: number, r: number, fill: string, ink: string): string {
  const n = (v: number) => v.toFixed(1);
  const badge = `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 1.25)}" fill="${ink}"/><circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 1.05)}" fill="${fill}"/>`;
  const p = (pts: number[][]) => pts.map(([a, b], i) => `${i ? 'L' : 'M'}${n(x + a * r)} ${n(y + b * r)}`).join(' ') + ' Z';
  switch (e) {
    case 'star': return badge + `<path d="${p([[0, -0.8], [0.22, -0.26], [0.78, -0.24], [0.34, 0.12], [0.5, 0.7], [0, 0.36], [-0.5, 0.7], [-0.34, 0.12], [-0.78, -0.24], [-0.22, -0.26]])}" fill="${ink}"/>`;
    case 'bolt': return badge + `<path d="${p([[0.12, -0.82], [-0.46, 0.08], [-0.04, 0.08], [-0.16, 0.82], [0.46, -0.12], [0.04, -0.12]])}" fill="${ink}"/>`;
    case 'heart': return badge + `<path d="M${n(x)} ${n(y + 0.62 * r)} C${n(x - 0.9 * r)} ${n(y)} ${n(x - 0.6 * r)} ${n(y - 0.75 * r)} ${n(x)} ${n(y - 0.3 * r)} C${n(x + 0.6 * r)} ${n(y - 0.75 * r)} ${n(x + 0.9 * r)} ${n(y)} ${n(x)} ${n(y + 0.62 * r)} Z" fill="${ink}"/>`;
    case 'moon': return badge + `<circle cx="${n(x - 0.08 * r)}" cy="${n(y)}" r="${n(0.62 * r)}" fill="${ink}"/><circle cx="${n(x + 0.22 * r)}" cy="${n(y - 0.14 * r)}" r="${n(0.5 * r)}" fill="${fill}"/>`;
    case 'sun': return badge + `<circle cx="${n(x)}" cy="${n(y)}" r="${n(0.36 * r)}" fill="${ink}"/>` + Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return `<path d="M${n(x + Math.cos(a) * 0.52 * r)} ${n(y + Math.sin(a) * 0.52 * r)} L${n(x + Math.cos(a) * 0.8 * r)} ${n(y + Math.sin(a) * 0.8 * r)}" stroke="${ink}" stroke-width="${n(r * 0.16)}" stroke-linecap="round"/>`; }).join('');
    default: return badge + `<path d="M${n(x)} ${n(y - 0.75 * r)} C${n(x + 0.2 * r)} ${n(y - 0.3 * r)} ${n(x + 0.55 * r)} ${n(y)} ${n(x + 0.55 * r)} ${n(y + 0.25 * r)} A${n(0.55 * r)} ${n(0.55 * r)} 0 1 1 ${n(x - 0.55 * r)} ${n(y + 0.25 * r)} C${n(x - 0.55 * r)} ${n(y)} ${n(x - 0.2 * r)} ${n(y - 0.3 * r)} ${n(x)} ${n(y - 0.75 * r)} Z" fill="${ink}"/>`;
  }
}
/** A domino mask across the eyes, in the hero's own colour (drawn under the eyes, so they show through). */
function heroMask(s: FaceSpec, l: Look, gap: number): string {
  if (l.outfit !== 'supersuit') return '';
  const H = superOf(l);
  if (H.mask === 'none') return '';
  // a baby's mask is a little one, snug round the eyes
  const baby = l.kind === 'baby', W = s.ex + gap + s.erx * (baby ? 1.3 : 1.55), ey = s.ey, ry = s.ery * (baby ? 0.82 : 1), n = (v: number) => v.toFixed(1);
  const d = `M${n(100 - W)} ${n(ey - ry * 0.5)} Q${n(100 - W * 0.55)} ${n(ey - ry * 2.3)} 100 ${n(ey - ry * 1.15)} Q${n(100 + W * 0.55)} ${n(ey - ry * 2.3)} ${n(100 + W)} ${n(ey - ry * 0.5)} L${n(100 + W + 6)} ${n(ey - ry * 0.9)} L${n(100 + W + 2)} ${n(ey + ry * 0.3)} Q${n(100 + W * 0.9)} ${n(ey + ry * 1.7)} ${n(100 + W * 0.45)} ${n(ey + ry * 1.75)} Q${n(100 + W * 0.15)} ${n(ey + ry * 1.8)} 100 ${n(ey + ry * 0.75)} Q${n(100 - W * 0.15)} ${n(ey + ry * 1.8)} ${n(100 - W * 0.45)} ${n(ey + ry * 1.75)} Q${n(100 - W * 0.9)} ${n(ey + ry * 1.7)} ${n(100 - W - 2)} ${n(ey + ry * 0.3)} L${n(100 - W - 6)} ${n(ey - ry * 0.9)} Z`;
  return `<path d="${d}" fill="${H.mask}"/>`;
}

function humanBody(id: string, l: Look, E = 0) {
  let o = l.outfit === 'drawn' ? OUTFIT.none : l.outfit === 'supersuit' ? superOutfit(l) : OUTFIT[l.outfit] ?? OUTFIT.tee;
  // world costumes take the person's own colour: the cape, tunic or gown in their shade
  const tint = l.accent && WORLD_TINTED.includes(l.outfit) ? l.accent : undefined;
  if (tint && (l.outfit === 'ftunic' || l.outfit === 'gown')) o = { ...o, top: tint, skirt: o.skirt ? shade(tint, -0.12) : undefined };
  const cape = (dflt: string) => (tint ? shade(tint, -0.3) : dflt);
  const skin = `url(#sk${id})`;
  const sl = o.sleeve === 'none' ? skin : o.top;
  const legs = o.bottom || skin;
  let back = '', over = '';
  switch (l.outfit) {
    case 'supersuit': {
      const H = superOf(l);
      back = H.cape === 'none' ? '' : `<path d="M62 152 Q100 142 138 152 L176 250 Q140 240 100 246 Q60 240 24 250 Z" fill="${H.cape}"/><path d="M62 152 Q100 142 138 152 L132 160 Q100 152 68 160 Z" fill="${shade(H.cape, -0.2)}"/>`;
      over = `${emblemArt(H.emblem, 100, 182, 12, H.trim, shade(H.cape === 'none' ? H.suit : H.cape, -0.3))}<rect x="56" y="210" width="88" height="7" fill="${H.trim}" clip-path="url(#tc${id})"/><rect x="95" y="208" width="10" height="11" rx="2" fill="${shade(H.trim, -0.2)}"/>`;
      break;
    }
    case 'bee': back = `<ellipse cx="52" cy="168" rx="28" ry="18" fill="#d6ecf7" opacity=".9" transform="rotate(-25 52 168)"/><ellipse cx="148" cy="168" rx="28" ry="18" fill="#d6ecf7" opacity=".9" transform="rotate(25 148 168)"/>`;
      over = `<g clip-path="url(#tc${id})"><rect x="50" y="172" width="100" height="12" fill="#2b2622"/><rect x="50" y="196" width="100" height="12" fill="#2b2622"/></g>`; break;
    case 'dino': back = `<path d="M62 214 Q20 228 8 202 Q34 214 58 198 Z" fill="#6d9b59"/>`; over = `<ellipse cx="100" cy="196" rx="24" ry="26" fill="#c8e0a8"/>`; break;
    case 'tee': over = `<path d="M70 176 Q100 182 130 176" stroke="#f3d36b" stroke-width="7" fill="none" clip-path="url(#tc${id})"/>`; break;
    case 'overalls': over = `<path d="M60 202 L140 202 L141 220 C128 230 72 230 59 220 Z" fill="#5a7ea7"/><rect x="76" y="176" width="48" height="30" rx="6" fill="#5a7ea7"/><path d="M78 180 L70 154 M122 180 L130 154" stroke="#5a7ea7" stroke-width="7" stroke-linecap="round"/><circle cx="82" cy="184" r="3" fill="#f0c45a"/><circle cx="118" cy="184" r="3" fill="#f0c45a"/><rect x="92" y="186" width="16" height="10" rx="2" fill="#4c6d93"/>`; break;
    case 'hoodie': back = `<path d="M70 150 Q100 132 130 150 L124 162 Q100 152 76 162 Z" fill="#7aa98a"/>`; over = `<path d="M80 196 Q100 190 120 196 L118 214 L82 214 Z" fill="#7aa98a"/><path d="M94 160 L92 178 M106 160 L108 178" stroke="#f5f1ea" stroke-width="2.5" stroke-linecap="round"/>`; break;
    case 'dress': over = `<path d="M84 150 Q100 162 116 150" stroke="#fff" stroke-width="3" fill="none"/>`; break;
    case 'cardigan': over = `<path d="M90 150 L100 166 L110 150 L110 222 L90 222 Z" fill="#f5efe4"/><circle cx="88" cy="176" r="2.5" fill="#8a6a4a"/><circle cx="88" cy="194" r="2.5" fill="#8a6a4a"/><circle cx="88" cy="212" r="2.5" fill="#8a6a4a"/>`; break;
    case 'pajamas': over = `<g clip-path="url(#tc${id})" fill="#fff" opacity=".85">${[[74, 168], [104, 182], [128, 166], [82, 206], [120, 210]].map(([x, y]) => `<path d="M${x} ${y} l2.2 4.6 5 .6 -3.7 3.4 1 4.9 -4.5 -2.5 -4.5 2.5 1 -4.9 -3.7 -3.4 5 -.6z"/>`).join('')}</g>`; break;
    case 'swimsuit': over = `<path d="M74 150 L80 172 M126 150 L120 172" stroke="#ef7d6b" stroke-width="6" stroke-linecap="round"/><g clip-path="url(#tc${id})">${[70, 92, 114, 136].map((x) => `<circle cx="${x}" cy="200" r="4.5" fill="#fff" opacity=".75"/>`).join('')}</g>`; break;
    case 'raincoat': over = `<path d="M100 150 L100 224" stroke="#c99a2e" stroke-width="2.5"/><circle cx="92" cy="176" r="3.5" fill="#c99a2e"/><circle cx="92" cy="198" r="3.5" fill="#c99a2e"/><path d="M78 150 L100 166 L122 150" fill="none" stroke="#c99a2e" stroke-width="3"/>`; break;
    case 'snowsuit': over = `<path d="M70 156 Q100 168 130 156 L128 166 Q100 178 72 166 Z" fill="#5e8fb8"/><rect x="118" y="160" width="10" height="24" rx="4" fill="#5e8fb8"/><path d="M100 168 L100 224" stroke="#b9584e" stroke-width="3"/>`; break;
    case 'party': over = `<circle cx="100" cy="170" r="5" fill="#fff"/>`; break;
    case 'pirate': over = `<g clip-path="url(#tc${id})"><rect x="50" y="166" width="100" height="8" fill="#d9534f"/><rect x="50" y="184" width="100" height="8" fill="#d9534f"/><rect x="50" y="202" width="100" height="8" fill="#d9534f"/></g><path d="M58 206 L142 190 L143 200 L60 218 Z" fill="#2b2622"/>`; break;
    case 'astronaut': over = `<rect x="80" y="176" width="40" height="26" rx="6" fill="#c9d3dc"/><circle cx="91" cy="189" r="4" fill="#e86f5b"/><circle cx="105" cy="189" r="4" fill="#5e8fb8"/>`; break;
    case 'hero': back = `<path d="M64 154 Q100 146 136 154 L172 248 Q100 236 28 248 Z" fill="#d9534f"/>`; over = `<path d="M100 170 l10 15 h-20 z" fill="#f2c14e"/><rect x="60" y="208" width="80" height="8" fill="#f2c14e" clip-path="url(#tc${id})"/>`; break;
    case 'none': over = `<path d="M88 150 Q100 158 112 150" stroke="#e8dfd2" stroke-width="3" fill="none"/>`; break;
    case 'stripes': over = `<g clip-path="url(#tc${id})">${[160, 176, 192, 208].map((y) => `<rect x="50" y="${y}" width="100" height="7" fill="#2f4a7a"/>`).join('')}</g>`; break;
    case 'sweater': over = `<path d="M100 196 C88 184 84 172 94 170 C98 170 100 174 100 176 C100 174 102 170 106 170 C116 172 112 184 100 196 Z" fill="#e86f8a"/><path d="M60 214 L140 214" stroke="#d4a33a" stroke-width="7" clip-path="url(#tc${id})"/><path d="M84 150 Q100 160 116 150" stroke="#d4a33a" stroke-width="5" fill="none"/>`; break;
    case 'denim': over = `<path d="M90 150 L110 150 L112 226 L88 226 Z" fill="#f5f1ea"/><path d="M90 150 L80 172 L90 168 Z M110 150 L120 172 L110 168 Z" fill="#5a7ea7"/><circle cx="84" cy="186" r="2.4" fill="#e8c46a"/><circle cx="116" cy="186" r="2.4" fill="#e8c46a"/><path d="M72 196 h12 M116 196 h12" stroke="#5a7ea7" stroke-width="3" stroke-linecap="round"/>`; break;
    case 'puffer': over = `<g clip-path="url(#tc${id})" stroke="#c4574a" stroke-width="2.5">${[166, 182, 198, 214].map((y) => `<path d="M50 ${y} Q100 ${y + 6} 150 ${y}" fill="none"/>`).join('')}</g><path d="M100 150 L100 226" stroke="#f5efe4" stroke-width="2.5"/><path d="M82 150 Q100 140 118 150 L116 160 Q100 152 84 160 Z" fill="#c4574a"/>`; break;
    case 'jersey': over = `<path d="M88 150 L100 164 L112 150" stroke="#fff" stroke-width="4" fill="none" stroke-linejoin="round"/><text x="100" y="204" text-anchor="middle" font-size="30" font-weight="700" font-family="Poppins,Inter,sans-serif" fill="#fff">7</text><path d="M58 186 C56 192 56 198 58 204 M142 186 C144 192 144 198 142 204" stroke="#fff" stroke-width="3" fill="none"/>`; break;
    case 'sailor': over = `<path d="M70 152 L130 152 L118 176 L100 168 L82 176 Z" fill="#2f4a7a"/><path d="M74 156 L126 156" stroke="#fff" stroke-width="2"/><path d="M92 170 L100 186 L108 170 Z" fill="#d9534f"/>`; break;
    case 'tutu': over = `<path d="M74 150 Q100 158 126 150" stroke="#f6b6c8" stroke-width="4" fill="none"/>`; break;
    case 'apron': over = `<path d="M78 166 L122 166 L126 226 L74 226 Z" fill="#fff" stroke="#e2ddd3" stroke-width="2"/><rect x="88" y="196" width="24" height="14" rx="3" fill="none" stroke="#e2ddd3" stroke-width="2"/><path d="M80 152 Q100 166 120 152 L112 162 Q100 170 88 162 Z" fill="#d9534f"/>`; break;
    case 'doctor': back = `<path d="M60 160 L76 152 L76 224 L58 222 Z M140 160 L124 152 L124 224 L142 222 Z" fill="#fff"/>`;
      over = `<path d="M62 158 L78 150 L80 226 L58 222 Z M138 158 L122 150 L120 226 L142 222 Z" fill="#fff" stroke="#e2ddd3" stroke-width="1.5"/><path d="M86 154 Q84 186 100 190 Q116 186 114 154" stroke="#5a6470" stroke-width="2.5" fill="none"/><circle cx="100" cy="192" r="5" fill="#9aa3ab" stroke="#5a6470" stroke-width="2"/>`; break;
    case 'firefighter': over = `<g clip-path="url(#tc${id})"><rect x="50" y="190" width="100" height="8" fill="#f2d24e"/><rect x="50" y="200" width="100" height="3" fill="#e9eef3"/></g><path d="M100 150 L100 226" stroke="#8f3328" stroke-width="2"/><path d="M110 166 l4 6 7 1 -5 5 1 7 -7 -3 -7 3 1 -7 -5 -5 7 -1z" fill="#f2c14e"/>`; break;
    case 'knight': over = `<path d="M72 156 L128 156 L126 220 L74 220 Z" fill="#5e8fb8"/><path d="M100 176 l5 10 11 1.5 -8 7.5 2 11 -10 -5.5 -10 5.5 2 -11 -8 -7.5 11 -1.5z" fill="#f2c14e"/><rect x="66" y="206" width="68" height="7" rx="3" fill="#8a6a4a"/>`; break;
    case 'fairy': back = `<ellipse cx="54" cy="168" rx="34" ry="22" fill="#e5f3fb" opacity=".85" stroke="#b9dcef" stroke-width="2" transform="rotate(-30 54 168)"/><ellipse cx="146" cy="168" rx="34" ry="22" fill="#e5f3fb" opacity=".85" stroke="#b9dcef" stroke-width="2" transform="rotate(30 146 168)"/><ellipse cx="62" cy="200" rx="20" ry="13" fill="#f3e5fb" opacity=".85" transform="rotate(20 62 200)"/><ellipse cx="138" cy="200" rx="20" ry="13" fill="#f3e5fb" opacity=".85" transform="rotate(-20 138 200)"/>`;
      over = sparkle(86, 180, 4, '#fff') + sparkle(114, 190, 3.5, '#fff'); break;
    case 'gown': // puffed shoulders, a laced bodice, a ribbon sash, a layered skirt
      back = `<ellipse cx="68" cy="158" rx="13" ry="10" fill="#d9bde6"/><ellipse cx="132" cy="158" rx="13" ry="10" fill="#d9bde6"/>`;
      over = `<path d="M90 152 L100 166 L110 152" stroke="#fff" stroke-width="2.5" fill="none"/><path d="M94 172 L106 180 M106 172 L94 180 M94 184 L106 192 M106 184 L94 192" stroke="#8e6aa8" stroke-width="1.6"/><path d="M62 200 Q100 210 138 200 L138 208 Q100 218 62 208 Z" fill="#f2d38a"/><path d="M100 204 l-14 14 M100 204 l14 14" stroke="#f2d38a" stroke-width="4" stroke-linecap="round"/>`; break;
    case 'ftunic': // a belted tunic with a short shoulder cape and a clasp
      back = `<path d="M66 154 Q100 144 134 154 L150 214 Q100 206 50 214 Z" fill="${cape('#a8473f')}"/>`;
      over = `<path d="M70 154 Q100 166 130 154 L128 168 Q100 178 72 168 Z" fill="${cape('#a8473f')}"/><circle cx="100" cy="166" r="5" fill="#f2c14e" stroke="#c99a2e" stroke-width="1.5"/><rect x="60" y="202" width="80" height="7" rx="3" fill="#6b4a32"/><rect x="95" y="200" width="10" height="11" rx="2" fill="#f2c14e"/>`; break;
    case 'cloak': // a travelling cloak with its hood down and a round clasp
      back = `<path d="M62 152 Q100 138 138 152 L156 246 Q100 236 44 246 Z" fill="${cape('#4f6f86')}"/><path d="M70 150 Q100 134 130 150 Q122 166 100 168 Q78 166 70 150 Z" fill="${tint ? shade(tint, -0.42) : '#3f5c72'}"/>`;
      over = `<path d="M70 156 L84 226 M130 156 L116 226" stroke="${cape('#4f6f86')}" stroke-width="12" stroke-linecap="round"/><circle cx="100" cy="160" r="5.5" fill="#d9a94a"/><path d="M60 208 L140 208" stroke="#8a6a4a" stroke-width="5"/>`; break;
    case 'explorer': // a many-pocket vest over a shirt, with a satchel strap and a backpack
      back = `<rect x="54" y="156" width="92" height="60" rx="16" fill="#8a6a3f"/><rect x="58" y="150" width="84" height="14" rx="7" fill="#c9a96e"/><path d="M62 150 Q100 136 138 150" stroke="#6b4a32" stroke-width="8" fill="none" stroke-linecap="round"/>`;
      over = `<path d="M74 152 L94 156 L92 224 L72 222 Z M126 152 L106 156 L108 224 L128 222 Z" fill="#a0855c"/><rect x="76" y="182" width="12" height="10" rx="2" fill="#8a7049"/><rect x="112" y="182" width="12" height="10" rx="2" fill="#8a7049"/><rect x="76" y="200" width="12" height="10" rx="2" fill="#8a7049"/><path d="M128 152 L74 212" stroke="#6b4a32" stroke-width="5"/><path d="M90 150 L100 158 L110 150" stroke="#f0e3c8" stroke-width="3" fill="none"/>`; break;
    case 'ranger': // a trail jacket with a neck scarf, a belt with a pouch, rolled cuffs, a bedroll on the back
      back = `<rect x="52" y="152" width="96" height="58" rx="14" fill="#5a6b4a"/><rect x="46" y="140" width="108" height="18" rx="9" fill="#b8553e"/><path d="M66 140 V158 M134 140 V158" stroke="#6b4a32" stroke-width="3"/>`;
      over = `<path d="M84 150 Q100 166 116 150 L112 166 Q100 174 88 166 Z" fill="${tint ?? '#d9775b'}"/><path d="M96 166 L92 180 L100 172 L108 180 L104 166" fill="${tint ?? '#d9775b'}"/><path d="M100 168 L100 226" stroke="#5a7046" stroke-width="2"/><rect x="60" y="206" width="80" height="7" rx="3" fill="#5a3b26"/><rect x="112" y="204" width="14" height="13" rx="3" fill="#8a6a4a"/><path d="M60 174 h12 M128 174 h12" stroke="#5a7046" stroke-width="2.5"/>`; break;
    case 'armour': // soft, rounded armour: a breastplate with a sun, shoulder guards and a cape swept to one side
      back = `<path d="M62 152 Q100 140 138 152 L172 244 Q110 240 46 250 Z" fill="${cape('#c4473b')}"/>`;
      over = `<path d="M74 158 Q100 150 126 158 L124 202 Q100 214 76 202 Z" fill="#dfe4ea" stroke="#9aa6b4" stroke-width="2"/><circle cx="100" cy="182" r="9" fill="#f2c14e"/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M100 182 L${(100 + 14 * Math.cos((a * Math.PI) / 180)).toFixed(1)} ${(182 + 14 * Math.sin((a * Math.PI) / 180)).toFixed(1)}" stroke="#f2c14e" stroke-width="2.5" stroke-linecap="round"/>`).join('')}<ellipse cx="68" cy="160" rx="15" ry="11" fill="#c9a24a" stroke="#a5822e" stroke-width="2"/><ellipse cx="132" cy="160" rx="15" ry="11" fill="#c9a24a" stroke="#a5822e" stroke-width="2"/><rect x="62" y="206" width="76" height="8" rx="3" fill="#8a6a3a"/>`; break;
    case 'sunrobe': // a draped robe with a gold-trimmed sash over one shoulder, and a long cape
      back = `<path d="M62 152 Q100 140 138 152 L162 250 Q100 238 38 250 Z" fill="${cape('#3f5a8a')}"/><path d="M62 152 Q100 140 138 152" stroke="#d9a94a" stroke-width="4" fill="none"/>`;
      over = `<path d="M70 152 L130 214" stroke="#d9a94a" stroke-width="10" stroke-linecap="round"/><path d="M70 152 L130 214" stroke="#f5d488" stroke-width="3" stroke-linecap="round"/><path d="M62 206 Q100 214 138 206" stroke="#d9a94a" stroke-width="3" fill="none"/><circle cx="74" cy="156" r="6" fill="#f2c14e" stroke="#c99a2e" stroke-width="1.5"/>`; break;
  }
  const A = actionSpec(l), P = leftArm(l), Rt = A.right;
  const raised = A.raised[0], raisedR = A.raised[1];
  const armL = P.arm, armR = Rt.arm;
  const sleeveEnd = o.sleeve === 'short' ? P.sleeve : '';
  const sleeveEndR = o.sleeve === 'short' ? Rt.sleeve : '';
  const skirt = l.outfit === 'tutu'
    ? `<path d="M58 202 L142 202 L170 226 L156 228 L150 238 L138 232 L124 242 L112 234 L100 244 L88 234 L76 242 L62 232 L50 238 L44 228 L30 226 Z" fill="${o.skirt}" opacity=".95"/><path d="M62 204 L138 204 L154 222 L100 230 L46 222 Z" fill="#f6b6c8" opacity=".6"/>`
    : o.skirt ? `<path d="M60 204 L140 204 L158 236 Q100 250 42 236 Z" fill="${o.skirt}"/><path d="M60 204 L140 204 L158 236 Q100 250 42 236 Z" fill="url(#gl${id})"/>` : '';
  const feet = o.shoes ? o.shoes : skin;
  const B = BODY_SPEC[WORLD], dl = B.sh[0] - 70, dr = B.sh[1] - 130, torso = B.torso;
  const L = (inner: string) => (dl ? `<g transform="translate(${dl} 0)">${inner}</g>` : inner);
  const R = (inner: string) => (dr ? `<g transform="translate(${dr} 0)">${inner}</g>` : inner);
  // a fairytale gown falls to the floor
  const gown = WORLD === 'fairytale' && o.skirt && l.outfit !== 'tutu';
  const skirtNow = gown ? `<path d="M66 198 L134 198 L164 ${250 + E} Q100 ${262 + E} 36 ${250 + E} Z" fill="${o.skirt}"/><path d="M66 198 L134 198 L164 ${250 + E} Q100 ${262 + E} 36 ${250 + E} Z" fill="url(#gl${id})"/><path d="M80 206 Q76 232 70 252 M100 206 L100 256 M120 206 Q124 232 130 252" stroke="${shade(o.skirt!, -0.12)}" stroke-width="2" fill="none" opacity=".6"/>` : skirt;
  return `<defs><clipPath id="tc${id}"><path d="${torso}"/></clipPath></defs>
    ${back}
    ${legsFor(A.legs, B, E, gown ? '' : legs, feet)}
    ${o.shoes && WORLD === 'everyday' ? `<path d="M72 247 Q85 242 99 247 M101 247 Q115 242 128 247" stroke="#fff" stroke-width="2" fill="none" opacity=".5"/>` : ''}
    ${raised ? '' : L(limb(armL, B.arm * 1.08, B.arm * 0.8, o.sleeve === 'long' ? sl : skin))}
    ${raisedR ? '' : R(limb(armR, B.arm * 1.08, B.arm * 0.8, o.sleeve === 'long' ? sl : skin))}
    ${sleeveEnd ? `${raised ? '' : L(limb(sleeveEnd, B.sleeve * 1.05, B.sleeve * 0.95, o.top))}${raisedR ? '' : R(limb(sleeveEndR, B.sleeve * 1.05, B.sleeve * 0.95, o.top))}` : ''}
    <path d="${torso}" fill="${o.top}"/>
    ${skirtNow}
    ${over}
    <path d="${torso}" fill="url(#gl${id})"/>
    ${raised ? '' : L(mitten(P.hand[0], P.hand[1], B.hand, P.thumb[0], P.thumb[1], skin))}
    ${raisedR ? '' : R(mitten(Rt.hand[0], Rt.hand[1], B.hand, Rt.thumb[0], Rt.thumb[1], skin))}`;
}

/** A raised arm (pointing, cheering) is drawn in front of the head, so long hair can't hide it. */
function raisedArm(id: string, l: Look): string {
  if (isPet(l.kind) || l.drawing) return '';
  const A = actionSpec(l);
  if (!A.raised[0] && !A.raised[1]) return '';
  let o = l.outfit === 'drawn' ? OUTFIT.none : OUTFIT[l.outfit] ?? OUTFIT.tee;
  if (l.accent && (l.outfit === 'ftunic' || l.outfit === 'gown')) o = { ...o, top: l.accent };
  const skin = `url(#sk${id})`, B = BODY_SPEC[WORLD];
  const one = (P: Arm) => `${limb(P.arm, B.arm * 1.08, B.arm * 0.8, o.sleeve === 'long' ? o.top : skin)}${o.sleeve === 'short' ? limb(P.sleeve, B.sleeve * 1.05, B.sleeve * 0.95, o.top) : ''}${mitten(P.hand[0], P.hand[1], B.hand, P.thumb[0], P.thumb[1], skin)}`;
  const dr = B.sh[1] - 130 - (B.sh[0] - 70);
  return `${A.raised[0] ? one(leftArm(l)) : ''}${A.raised[1] ? `<g transform="translate(${dr} 0)">${one(A.right)}</g>` : ''}`;
}

/** The free (left) arm for each pose. The right hand always holds the prop. */
const POSES: Record<Pose, { arm: string; sleeve: string; hand: [number, number]; thumb: [number, number] }> = {
  stand: { arm: 'M70 162 C58 174 49 190 52 209', sleeve: 'M70 162 C63 168 58 175 56 182', hand: [52, 214], thumb: [58, 209] },
  point: { arm: 'M70 162 C56 154 42 138 32 118', sleeve: 'M70 162 C64 158 58 154 53 148', hand: [30, 112], thumb: [37, 114] },
  hips: { arm: 'M70 162 C50 172 50 192 70 202', sleeve: 'M70 162 C62 166 58 172 56 180', hand: [72, 203], thumb: [67, 197] },
  cheer: { arm: 'M70 162 C62 142 60 120 58 98', sleeve: 'M70 162 C66 154 64 146 63 140', hand: [58, 92], thumb: [64, 96] },
  wave: { arm: 'M70 162 C54 158 44 146 40 128', sleeve: 'M70 162 C63 160 57 157 52 152', hand: [39, 121], thumb: [46, 124] },
};

/** A pose's arm on the right side: the left arm mirrored. */
const mirrorPath = (d: string) => d.replace(/(-?[\d.]+) (-?[\d.]+)/g, (_, x: string, y: string) => `${+(200 - +x).toFixed(1)} ${y}`);
type Arm = { arm: string; sleeve: string; hand: [number, number]; thumb: [number, number] };
const mirrorArm = (a: Arm): Arm => ({ arm: mirrorPath(a.arm), sleeve: mirrorPath(a.sleeve), hand: [200 - a.hand[0], a.hand[1]], thumb: [200 - a.thumb[0], a.thumb[1]] });
const HOLD: Arm = { arm: 'M130 162 C142 174 151 192 149 211', sleeve: 'M130 162 C137 168 142 175 144 182', hand: [150, 216], thumb: [143, 211] };
const SWING_F: Arm = { arm: 'M70 162 C62 176 62 192 70 204', sleeve: 'M70 162 C65 170 63 177 63 184', hand: [71, 208], thumb: [76, 203] };
const SWING_B: Arm = { arm: 'M130 162 C141 175 150 189 156 200', sleeve: 'M130 162 C137 168 142 175 146 182', hand: [158, 204], thumb: [152, 200] };
/** Running: the back arm swings out behind, the front arm bends up in front at chest height. */
const RUN_BACK: Arm = { arm: 'M70 162 C60 172 50 180 38 182', sleeve: 'M70 162 C64 168 59 172 54 175', hand: [34, 182], thumb: [39, 177] };
const RUN_FWD: Arm = { arm: 'M130 162 C142 178 156 182 162 168', sleeve: 'M130 162 C136 170 141 175 146 178', hand: [163, 163], thumb: [157, 166] };
type Legs = 'stand' | 'walk' | 'run' | 'jump' | 'sit' | 'dance';
interface ActionSpec { left: Arm | 'pose'; right: Arm; legs: Legs; lift: number; lean: number; raised: [boolean, boolean] }
/** Arms, legs and body for each action (front view, storybook style). */
function actionSpec(l: Look): ActionSpec {
  const a = l.action ?? 'stand';
  const up = mirrorArm(POSES.cheer);
  switch (a) {
    case 'walk': return { left: SWING_F, right: SWING_B, legs: 'walk', lift: 0, lean: 2, raised: [false, false] };
    case 'run': return { left: RUN_BACK, right: RUN_FWD, legs: 'run', lift: 2, lean: 9, raised: [false, false] };
    case 'jump': return { left: POSES.cheer, right: up, legs: 'jump', lift: 26, lean: 0, raised: [true, true] };
    case 'sit': return { left: POSES.stand, right: HOLD, legs: 'sit', lift: -22, lean: 0, raised: [false, false] };
    case 'wave': return { left: POSES.wave, right: HOLD, legs: 'stand', lift: 0, lean: 0, raised: [true, false] };
    case 'cheer': return { left: POSES.cheer, right: up, legs: 'stand', lift: 0, lean: 0, raised: [true, true] };
    case 'point': return { left: POSES.point, right: HOLD, legs: 'stand', lift: 0, lean: 0, raised: [true, false] };
    case 'dance': return { left: POSES.wave, right: mirrorArm(POSES.point), legs: 'dance', lift: 4, lean: -5, raised: [true, true] };
    case 'sleep': return { left: POSES.stand, right: HOLD, legs: 'stand', lift: 0, lean: 0, raised: [false, false] };
    default: {
      const p = l.pose ?? 'stand';
      return { left: 'pose', right: HOLD, legs: 'stand', lift: 0, lean: 0, raised: [p === 'point' || p === 'cheer' || p === 'wave', false] };
    }
  }
}
/** The left arm for a look (its action, else its pose). */
const leftArm = (l: Look): Arm => { const s = actionSpec(l); return s.left === 'pose' ? POSES[l.pose ?? 'stand'] : s.left; };

function petBody(id: string, l: Look) {
  const F = `url(#fu${id})`;
  const fur = l.hair;
  const tail = l.kind === 'cat' ? `<path d="M140 228 C176 224 184 186 166 170" stroke="${shade(fur, -0.1)}" stroke-width="12" fill="none" stroke-linecap="round"/>`
    : l.kind === 'bunny' ? `<circle cx="146" cy="232" r="13" fill="${shade(fur, 0.6)}"/>`
      : `<path d="M140 226 C162 222 172 204 168 190" stroke="${shade(fur, -0.15)}" stroke-width="11" fill="none" stroke-linecap="round"/>`;
  return `${tail}
    <ellipse cx="100" cy="206" rx="46" ry="44" fill="${F}"/>
    <ellipse cx="100" cy="212" rx="26" ry="30" fill="${shade(fur, 0.5)}"/>
    <ellipse cx="80" cy="248" rx="14" ry="9" fill="${F}"/><ellipse cx="120" cy="248" rx="14" ry="9" fill="${F}"/>
    <path d="M74 250 v-4 M80 251 v-5 M86 250 v-4 M114 250 v-4 M120 251 v-5 M126 250 v-4" stroke="${shade(fur, -0.3)}" stroke-width="1.6" stroke-linecap="round" opacity=".6"/>
    ${l.outfit === 'hero' ? `<path d="M64 168 Q100 158 136 168 L160 246 Q100 236 40 246 Z" fill="#d9534f" opacity=".95"/>` : ''}
    ${l.outfit !== 'none' && l.outfit !== 'hero' ? `<path d="M70 160 Q100 178 130 160 L124 172 Q100 188 76 172 Z" fill="${(OUTFIT[l.outfit] ?? OUTFIT.tee).top}"/>` : ''}`;
}

function headpiece(l: Look) {
  if (l.outfit === 'bee') return `<path d="M84 40 Q74 12 66 6 M116 40 Q126 12 134 6" stroke="#2b2622" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="66" cy="6" r="7" fill="#2b2622"/><circle cx="134" cy="6" r="7" fill="#2b2622"/>`;
  if (l.outfit === 'dino') return `<path d="M34 100 C30 44 62 22 100 22 C138 22 170 44 166 100 C164 82 156 64 140 54 C122 46 78 46 60 54 C44 64 36 82 34 100 Z" fill="#7fb069"/><path d="M80 26 Q86 8 94 22 Q100 4 106 22 Q114 8 120 26 Z" fill="#5f8f4e"/><circle cx="66" cy="40" r="3" fill="#5f8f4e"/><circle cx="134" cy="40" r="3" fill="#5f8f4e"/>`;
  if (l.outfit === 'astronaut' && l.hat === 'none') return `<circle cx="100" cy="96" r="74" fill="#cfe6f4" fill-opacity=".2" stroke="#e3e9ee" stroke-width="7"/><path d="M56 60 Q68 38 92 34" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>`;
  return '';
}

function hat(l: Look) {
  switch (l.hat) {
    case 'party': return `<path d="M100 -8 L128 46 Q100 56 72 46 Z" fill="#e86f5b"/><path d="M90 12 L110 12 M84 26 L116 26" stroke="#fff3d6" stroke-width="4" stroke-linecap="round"/><circle cx="100" cy="-8" r="8" fill="#f7d06b"/>`;
    case 'pirate': return `<path d="M34 58 Q100 -14 166 58 Q130 42 100 48 Q70 42 34 58 Z" fill="#2b2622"/><circle cx="100" cy="28" r="7" fill="#fff"/><path d="M92 38 L108 44 M108 38 L92 44" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`;
    case 'crown': return `<path d="M64 52 L68 16 L85 36 L100 8 L115 36 L132 16 L136 52 Z" fill="#f2c14e" stroke="#c99a2e" stroke-width="2.5" stroke-linejoin="round"/><circle cx="100" cy="40" r="5" fill="#d9534f"/><circle cx="80" cy="44" r="4" fill="#5e8fb8"/><circle cx="120" cy="44" r="4" fill="#5e8fb8"/>`;
    case 'sunhat': return `<path d="M60 50 Q62 10 100 8 Q138 10 140 50 Z" fill="#ead6aa"/><ellipse cx="100" cy="50" rx="84" ry="15" fill="#ead6aa"/><path d="M61 42 Q100 52 139 42 L140 50 Q100 60 60 50 Z" fill="#d9776b"/>`;
    case 'beanie': return `<path d="M42 72 Q44 8 100 6 Q156 8 158 72 Z" fill="#d9776b"/><rect x="40" y="60" width="120" height="16" rx="8" fill="#c4645a"/><circle cx="100" cy="4" r="11" fill="#f5efe4"/>`;
    case 'bunny': return `<ellipse cx="78" cy="8" rx="13" ry="36" fill="#fbf7f2" transform="rotate(-10 78 8)"/><ellipse cx="78" cy="10" rx="6" ry="25" fill="#f4b8c3" transform="rotate(-10 78 10)"/><ellipse cx="122" cy="8" rx="13" ry="36" fill="#fbf7f2" transform="rotate(10 122 8)"/><ellipse cx="122" cy="10" rx="6" ry="25" fill="#f4b8c3" transform="rotate(10 122 10)"/>`;
    case 'cowboy': return `<path d="M22 56 Q100 32 178 56 Q160 66 100 64 Q40 66 22 56 Z" fill="#a8744a"/><path d="M66 56 Q64 12 84 14 Q100 24 116 14 Q136 12 134 56 Z" fill="#b9845a"/><rect x="66" y="44" width="68" height="7" fill="#7a5236"/>`;
    case 'chef': return `<rect x="70" y="38" width="60" height="18" rx="4" fill="#fbfbf8" stroke="#e2ddd3" stroke-width="2"/><circle cx="78" cy="28" r="17" fill="#fbfbf8"/><circle cx="100" cy="18" r="20" fill="#fbfbf8"/><circle cx="122" cy="28" r="17" fill="#fbfbf8"/>`;
    case 'flowers': return [60, 78, 100, 122, 140].map((x, i) => `<g transform="translate(${x} ${42 - (i === 2 ? 8 : i % 2 ? 4 : 0)})">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-7" rx="5" ry="8" fill="${['#f4a3b5', '#f2c14e', '#b9a5e3', '#f4a3b5', '#f2c14e'][i]}" transform="rotate(${a})"/>`).join('')}<circle r="4" fill="#fff3d6"/></g>`).join('');
    case 'wizard': return `<path d="M100 -20 L136 50 Q100 60 64 50 Z" fill="#5b4b9a"/><ellipse cx="100" cy="50" rx="50" ry="10" fill="#4a3d82"/><path d="M96 10 l3 6 6 1 -4.5 4 1 6 -5.5 -3 -5.5 3 1 -6 -4.5 -4 6 -1z" fill="#f2c14e"/>`;
    case 'bucket': return `<path d="M56 54 Q58 14 100 12 Q142 14 144 54 Z" fill="#7fb069"/><path d="M40 58 Q100 42 160 58 L150 68 Q100 56 50 68 Z" fill="#6d9b59"/>`;
    case 'bow': return `<path d="M100 40 L72 24 Q62 40 72 56 Z M100 40 L128 24 Q138 40 128 56 Z" fill="#e86f8a"/><circle cx="100" cy="40" r="8" fill="#d4566f"/>`;
    case 'cap': return `<path d="M46 60 Q48 14 100 12 Q152 14 154 60 Z" fill="#5e8fb8"/><path d="M100 58 Q150 52 182 64 Q150 72 100 64 Z" fill="#4a76a8"/><circle cx="100" cy="12" r="5" fill="#4a76a8"/>`;
    case 'capback': return `<path d="M58 20 Q100 -6 142 20 Q100 8 58 20 Z" fill="#c4574a"/><path d="M44 62 Q46 12 100 10 Q154 12 156 62 Q100 50 44 62 Z" fill="#e86f5b"/><path d="M82 60 Q84 42 100 40 Q116 42 118 60 Z" fill="${l.hair}"/><path d="M82 60 Q84 42 100 40 Q116 42 118 60" stroke="#c4574a" stroke-width="3" fill="none"/><path d="M84 52 L116 52" stroke="#2b2622" stroke-width="3" stroke-dasharray="3 3"/><path d="M60 26 Q100 14 140 26" stroke="#fff" stroke-width="2" fill="none" opacity=".35"/>`;
    case 'headphones': return `<path d="M40 98 C34 24 166 24 160 98" stroke="#3b3f4a" stroke-width="8" fill="none" stroke-linecap="round"/><rect x="24" y="80" width="24" height="40" rx="12" fill="#e86f5b"/><rect x="152" y="80" width="24" height="40" rx="12" fill="#e86f5b"/><rect x="30" y="86" width="12" height="28" rx="6" fill="#c4574a"/><rect x="158" y="86" width="12" height="28" rx="6" fill="#c4574a"/>`;
    case 'headband': return `<path d="M40 74 Q100 46 160 74 L160 60 Q100 32 40 60 Z" fill="#fff" stroke="#e2ddd3" stroke-width="1.5"/><path d="M40 67 Q100 39 160 67" stroke="#e86f5b" stroke-width="4" fill="none"/>`;
    case 'beret': return `<ellipse cx="94" cy="40" rx="58" ry="20" fill="#d9534f" transform="rotate(-10 94 40)"/><path d="M48 52 Q96 66 146 40" stroke="#b8443f" stroke-width="3" fill="none"/><path d="M92 20 l2 -10" stroke="#b8443f" stroke-width="4" stroke-linecap="round"/>`;
    case 'bandana': return `<path d="M40 70 Q42 20 100 18 Q158 20 160 70 Q100 56 40 70 Z" fill="#d9534f"/>${[[64, 44], [90, 32], [116, 34], [138, 50], [100, 54], [76, 60]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#fff"/>`).join('')}<path d="M158 66 L178 78 L170 58 Z M158 66 L180 66 L172 50 Z" fill="#c4473f"/>`;
    case 'visor': return `<path d="M42 64 Q100 46 158 64 L158 54 Q100 36 42 54 Z" fill="#f2c14e"/><path d="M48 64 Q100 52 152 64 Q130 84 100 84 Q70 84 48 64 Z" fill="#5e8fb8" opacity=".85"/>`;
    case 'earmuffs': return `<path d="M40 100 C34 28 166 28 160 100" stroke="#c9b6e8" stroke-width="6" fill="none"/><circle cx="38" cy="104" r="17" fill="#f6c3d2"/><circle cx="162" cy="104" r="17" fill="#f6c3d2"/><circle cx="34" cy="98" r="6" fill="#fff" opacity=".5"/><circle cx="158" cy="98" r="6" fill="#fff" opacity=".5"/>`;
    case 'helmet': return `<path d="M36 78 Q36 4 100 4 Q164 4 164 78 Q100 64 36 78 Z" fill="#7fb069"/><path d="M70 14 L64 40 M100 6 L100 34 M130 14 L136 40" stroke="#5f8f4e" stroke-width="6" stroke-linecap="round"/><path d="M48 76 L66 140 M152 76 L134 140" stroke="#3b3f4a" stroke-width="2.5"/>`;
    case 'catears': return `<path d="M42 62 Q100 22 158 62" stroke="#2b2622" stroke-width="5" fill="none"/><path d="M54 52 L58 14 L84 40 Z M146 52 L142 14 L116 40 Z" fill="#2b2622"/><path d="M61 44 L63 26 L76 39 Z M139 44 L137 26 L124 39 Z" fill="#f4b8c3"/>`;
    case 'clips': return `<g transform="rotate(-20 66 52)"><rect x="54" y="48" width="24" height="7" rx="3.5" fill="#f2c14e"/></g><g transform="rotate(-30 80 42)"><rect x="70" y="38" width="22" height="7" rx="3.5" fill="#ef9fb6"/></g><path d="M138 50 C132 42 138 36 142 41 C146 36 152 42 146 50 L142 54 Z" fill="#7fc8e0"/>`;
    case 'propeller': return `<path d="M50 60 Q52 14 100 12 Q148 14 150 60 Z" fill="#e86f5b"/><path d="M100 12 Q74 18 50 60 L84 60 Z" fill="#f2c14e"/><path d="M100 12 Q126 18 150 60 L116 60 Z" fill="#5e8fb8"/><rect x="40" y="56" width="120" height="8" rx="4" fill="#4a76a8"/><path d="M100 12 V0" stroke="#3b3f4a" stroke-width="3"/><ellipse cx="84" cy="-2" rx="17" ry="4" fill="#7fb069"/><ellipse cx="116" cy="-2" rx="17" ry="4" fill="#e86f8a"/><circle cx="100" cy="-2" r="4" fill="#3b3f4a"/>`;
    case 'tiara': return `<path d="M58 58 Q100 40 142 58" stroke="#e3b23c" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M78 52 L84 36 L92 48 L100 26 L108 48 L116 36 L122 52 Q100 44 78 52 Z" fill="#f2c14e" stroke="#c99a2e" stroke-width="2" stroke-linejoin="round"/><circle cx="100" cy="40" r="4.5" fill="#8fd0e6"/><circle cx="84" cy="46" r="2.6" fill="#f4a3b5"/><circle cx="116" cy="46" r="2.6" fill="#f4a3b5"/>`;
    case 'circlet': return `<path d="M44 66 Q100 34 156 66" stroke="#7a9a5a" stroke-width="5" fill="none" stroke-linecap="round"/>${[[52, 60], [70, 50], [130, 50], [148, 60]].map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="9" ry="5" fill="#8fbf6f" transform="rotate(${i < 2 ? -30 : 30} ${x} ${y})"/>`).join('')}<circle cx="100" cy="42" r="8" fill="#f4c6d6"/><circle cx="100" cy="42" r="3.5" fill="#f2c14e"/><circle cx="84" cy="46" r="5" fill="#fbe7b0"/><circle cx="116" cy="46" r="5" fill="#fbe7b0"/>`;
    case 'brimhat': return `<path d="M20 60 Q100 40 180 60 Q170 72 100 70 Q30 72 20 60 Z" fill="#b08a5a"/><path d="M62 60 Q62 18 100 16 Q138 18 138 60 Q100 52 62 60 Z" fill="#c49a66"/><path d="M62 52 Q100 44 138 52 L138 60 Q100 52 62 60 Z" fill="#6b4a32"/><path d="M60 64 Q48 96 64 120" stroke="#6b4a32" stroke-width="1.8" fill="none"/>`;
    case 'laurel': return [-1, 1].map((sd) => `<path d="M100 ${30} Q${100 + sd * 46} ${34} ${100 + sd * 58} ${70}" stroke="#c99a2e" stroke-width="3" fill="none"/>${[0, 1, 2, 3, 4].map((i) => { const t = i / 4, x = 100 + sd * (8 + 50 * t), y = 32 + 36 * t * t; return `<ellipse cx="${x.toFixed(1)}" cy="${(y - 4).toFixed(1)}" rx="8" ry="4" fill="#f2c14e" transform="rotate(${sd * (20 + 40 * t)} ${x.toFixed(1)} ${(y - 4).toFixed(1)})"/><ellipse cx="${(x + sd * 2).toFixed(1)}" cy="${(y + 5).toFixed(1)}" rx="8" ry="4" fill="#e3b23c" transform="rotate(${sd * (-10 + 40 * t)} ${(x + sd * 2).toFixed(1)} ${(y + 5).toFixed(1)})"/>`; }).join('')}`).join('');
    case 'helm': return `<path d="M40 82 Q38 8 100 6 Q162 8 160 82 L146 82 Q144 36 100 32 Q56 36 54 82 Z" fill="#c9a24a" stroke="#a5822e" stroke-width="2"/><path d="M100 8 Q120 -16 150 -8 Q128 -2 118 14 Z" fill="#c4473b"/><path d="M100 8 Q84 -14 58 -6 Q78 0 86 14 Z" fill="#d9584b"/><path d="M92 20 L108 20 L104 52 L96 52 Z" fill="#a5822e"/>`;
    case 'drawn': return wornImage(l, 'hat');
    default: return '';
  }
}

function glasses(l: Look) {
  const y = 101 + (l.face ? l.glassesY ?? 0 : 0) + (isPet(l.kind) ? -4 : 0);
  const star = (x: number) => { let p = ''; for (let i = 0; i < 10; i++) { const r = i % 2 ? 7 : 16, a = Math.PI / 5 * i - Math.PI / 2; p += `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)} `; } return `<polygon points="${p}" fill="#f5c542" stroke="#c99a2e" stroke-width="2"/>`; };
  const heart = (x: number) => `<path d="M${x} ${y + 12} C${x - 22} ${y - 2} ${x - 12} ${y - 18} ${x} ${y - 7} C${x + 12} ${y - 18} ${x + 22} ${y - 2} ${x} ${y + 12} Z" fill="#e05a6f" opacity=".9"/>`;
  switch (l.glasses) {
    case 'round': return `<circle cx="78" cy="${y}" r="17" fill="#fff" fill-opacity=".14" stroke="#3b2f2a" stroke-width="3.5"/><circle cx="122" cy="${y}" r="17" fill="#fff" fill-opacity=".14" stroke="#3b2f2a" stroke-width="3.5"/><path d="M95 ${y} Q100 ${y - 5} 105 ${y}" stroke="#3b2f2a" stroke-width="3.5" fill="none"/><path d="M68 ${y - 8} l6 -4" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>`;
    case 'sun': return `<rect x="56" y="${y - 12}" width="40" height="25" rx="11" fill="#1f1c1a"/><rect x="104" y="${y - 12}" width="40" height="25" rx="11" fill="#1f1c1a"/><path d="M96 ${y - 4} L104 ${y - 4}" stroke="#1f1c1a" stroke-width="4"/><path d="M62 ${y - 5} L74 ${y - 5}" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".6"/>`;
    case 'hearts': return heart(78) + heart(122) + `<path d="M94 ${y - 2} L106 ${y - 2}" stroke="#b8394f" stroke-width="3"/>`;
    case 'stars': return star(78) + star(122) + `<path d="M93 ${y} L107 ${y}" stroke="#c99a2e" stroke-width="3"/>`;
    case 'square': return `<rect x="58" y="${y - 13}" width="38" height="26" rx="6" fill="#fff" fill-opacity=".14" stroke="#2b2622" stroke-width="3.5"/><rect x="104" y="${y - 13}" width="38" height="26" rx="6" fill="#fff" fill-opacity=".14" stroke="#2b2622" stroke-width="3.5"/><path d="M96 ${y - 3} L104 ${y - 3}" stroke="#2b2622" stroke-width="3.5"/>`;
    case 'cateye': return `<path d="M56 ${y - 14} Q78 ${y - 12} 96 ${y - 8} Q96 ${y + 12} 78 ${y + 12} Q60 ${y + 12} 58 ${y - 2} Z M144 ${y - 14} Q122 ${y - 12} 104 ${y - 8} Q104 ${y + 12} 122 ${y + 12} Q140 ${y + 12} 142 ${y - 2} Z" fill="#fff" fill-opacity=".12" stroke="#b8394f" stroke-width="3.5" stroke-linejoin="round"/><path d="M96 ${y - 4} L104 ${y - 4}" stroke="#b8394f" stroke-width="3.5"/>`;
    case 'aviator': return `<defs><linearGradient id="av${y}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8f6a3a"/><stop offset="1" stop-color="#e8b86a"/></linearGradient></defs><path d="M58 ${y - 12} L96 ${y - 12} Q98 ${y + 14} 78 ${y + 14} Q58 ${y + 12} 58 ${y - 12} Z M104 ${y - 12} L142 ${y - 12} Q142 ${y + 12} 122 ${y + 14} Q102 ${y + 14} 104 ${y - 12} Z" fill="url(#av${y})" stroke="#c9a24a" stroke-width="2.5"/><path d="M96 ${y - 10} Q100 ${y - 14} 104 ${y - 10}" stroke="#c9a24a" stroke-width="2.5" fill="none"/>`;
    case 'mask': return `<path fill-rule="evenodd" d="M38 ${y - 8} Q100 ${y - 26} 162 ${y - 8} L158 ${y + 12} Q130 ${y + 22} 106 ${y + 10} L100 ${y + 6} L94 ${y + 10} Q70 ${y + 22} 42 ${y + 12} Z M66 ${y} a12 9 0 1 0 24 0 a12 9 0 1 0 -24 0 Z M110 ${y} a12 9 0 1 0 24 0 a12 9 0 1 0 -24 0 Z" fill="#d9534f"/>`;
    case 'nose': return `<circle cx="78" cy="${y}" r="16" fill="#fff" fill-opacity=".12" stroke="#2b2622" stroke-width="4"/><circle cx="122" cy="${y}" r="16" fill="#fff" fill-opacity=".12" stroke="#2b2622" stroke-width="4"/><path d="M94 ${y - 2} Q100 ${y - 6} 106 ${y - 2}" stroke="#2b2622" stroke-width="4" fill="none"/><ellipse cx="100" cy="${y + 16}" rx="10" ry="12" fill="#f0a98a"/><ellipse cx="97" cy="${y + 11}" rx="3" ry="4" fill="#fff" opacity=".5"/><path d="M100 ${y + 26} C92 ${y + 22} 78 ${y + 24} 76 ${y + 32} C86 ${y + 30} 94 ${y + 31} 100 ${y + 29} C106 ${y + 31} 114 ${y + 30} 124 ${y + 32} C122 ${y + 24} 108 ${y + 22} 100 ${y + 26} Z" fill="#3b2a20"/>`;
    case 'drawn': return wornImage(l, 'glasses');
    case 'goggles': return `<path d="M38 ${y - 2} L162 ${y - 2}" stroke="#2f7fa8" stroke-width="7"/><ellipse cx="78" cy="${y}" rx="19" ry="16" fill="#bfe6f5" fill-opacity=".5" stroke="#2f7fa8" stroke-width="5"/><ellipse cx="122" cy="${y}" rx="19" ry="16" fill="#bfe6f5" fill-opacity=".5" stroke="#2f7fa8" stroke-width="5"/>`;
    default: return '';
  }
}

/** A drawn wardrobe piece, placed in its spot. */
function wornImage(l: Look, slot: WearSlot) {
  const src = l.worn?.[slot];
  if (!src) return '';
  const [x, y, w, h] = WEAR_BOX[slot];
  return `<image href="${src.replace(/"/g, '&quot;')}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="none"/>`;
}

function extra(l: Look) {
  switch (l.extra) {
    case 'balloon': return `<path d="M152 214 Q166 166 176 116" stroke="#8f857b" stroke-width="2" fill="none"/><ellipse cx="176" cy="94" rx="22" ry="26" fill="#e86f5b"/><ellipse cx="168" cy="84" rx="5" ry="8" fill="#fff" opacity=".45"/>`;
    case 'teddy': return `<g transform="translate(144 192)"><circle cx="0" cy="0" r="9" fill="#a8744a"/><circle cx="16" cy="0" r="9" fill="#a8744a"/><circle cx="8" cy="12" r="16" fill="#b9845a"/><circle cx="8" cy="34" r="18" fill="#b9845a"/><circle cx="3" cy="10" r="2.2" fill="#2b2622"/><circle cx="13" cy="10" r="2.2" fill="#2b2622"/><ellipse cx="8" cy="17" rx="5" ry="3.5" fill="#e8c9a6"/></g>`;
    case 'sock': return `<g transform="translate(146 180) rotate(12)"><path d="M0 0 L22 0 L22 34 Q22 50 6 50 L-10 50 Q-20 50 -20 40 Q-20 32 -8 32 L0 32 Z" fill="#f5efe4" stroke="#d9cfc0" stroke-width="2"/><rect x="0" y="6" width="22" height="6" fill="#5e8fb8"/><rect x="0" y="18" width="22" height="6" fill="#e86f5b"/></g>`;
    case 'flower': return `<path d="M152 218 Q156 190 162 170" stroke="#5f8f4e" stroke-width="3" fill="none"/>${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="162" cy="158" rx="7" ry="12" fill="#f4a3b5" transform="rotate(${a} 162 170)"/>`).join('')}<circle cx="162" cy="170" r="6" fill="#f5c542"/>`;
    case 'bucket': return `<g transform="translate(142 200)"><path d="M0 0 L28 0 L24 30 L4 30 Z" fill="#f2c14e"/><path d="M0 0 Q14 -16 28 0" stroke="#c99a2e" stroke-width="2.5" fill="none"/></g>`;
    case 'umbrella': return `<path d="M156 222 L168 104" stroke="#5a514a" stroke-width="3"/><path d="M116 106 Q168 44 220 106 Q207 96 194 106 Q181 96 168 106 Q155 96 142 106 Q129 96 116 106 Z" fill="#e86f5b"/>`;
    case 'ball': return `<circle cx="164" cy="226" r="16" fill="#fff" stroke="#3b3f4a" stroke-width="2"/><path d="M164 219 l7 5 -3 8 h-8 l-3 -8 z" fill="#3b3f4a"/><path d="M164 219 v-9 M171 224 l9 -3 M168 232 l5 8 M160 232 l-5 8 M157 224 l-9 -3" stroke="#3b3f4a" stroke-width="1.6"/>`;
    case 'kite': return `<path d="M152 214 Q170 170 176 104" stroke="#8f857b" stroke-width="1.6" fill="none"/><path d="M178 60 L200 92 L178 120 L156 92 Z" fill="#e86f5b"/><path d="M178 60 L178 120 M156 92 L200 92" stroke="#fff" stroke-width="2"/><path d="M178 60 L200 92 L178 92 Z" fill="#f2c14e"/><path d="M178 120 q-6 8 0 14 q6 6 0 14" stroke="#5e8fb8" stroke-width="2.5" fill="none"/>`;
    case 'bubbles': return `<path d="M152 214 L168 172" stroke="#7fc8e0" stroke-width="3" stroke-linecap="round"/><circle cx="170" cy="164" r="9" fill="none" stroke="#7fc8e0" stroke-width="3"/>${[[184, 140, 10], [166, 122, 7], [192, 110, 6], [176, 94, 8]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#dff2fb" fill-opacity=".45" stroke="#9fd3ec" stroke-width="1.5"/><circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.22}" fill="#fff"/>`).join('')}`;
    case 'floatie': return `<ellipse cx="100" cy="208" rx="54" ry="15" fill="none" stroke="#e86f5b" stroke-width="14"/><ellipse cx="100" cy="208" rx="54" ry="15" fill="none" stroke="#fff" stroke-width="14" stroke-dasharray="20 22"/><ellipse cx="100" cy="203" rx="50" ry="10" fill="none" stroke="#fff" stroke-width="2" opacity=".5"/>`;
    case 'book': return `<g transform="translate(142 190) rotate(-8)"><rect x="0" y="0" width="34" height="42" rx="3" fill="#5e8fb8"/><rect x="4" y="2" width="28" height="38" rx="2" fill="#fbf7f0"/><rect x="0" y="0" width="6" height="42" rx="2" fill="#4a76a8"/><circle cx="20" cy="16" r="6" fill="#f2c14e"/><path d="M12 30 h16 M12 34 h12" stroke="#c9c3bb" stroke-width="2"/></g>`;
    case 'ukulele': return `<g transform="translate(158 222) rotate(-35)"><rect x="-4" y="-66" width="8" height="52" rx="3" fill="#8a6a4a"/><rect x="-6" y="-74" width="12" height="12" rx="3" fill="#6b4f36"/><circle cx="0" cy="-6" r="14" fill="#d9a066"/><circle cx="0" cy="12" r="18" fill="#d9a066"/><circle cx="0" cy="2" r="5" fill="#5a3b26"/><rect x="-8" y="16" width="16" height="4" rx="1" fill="#5a3b26"/></g>`;
    case 'wand': return `<path d="M152 214 L174 160" stroke="#5a514a" stroke-width="4" stroke-linecap="round"/>${sparkle(176, 150, 16, '#f2c14e')}${sparkle(194, 136, 5, '#f4a3b5')}${sparkle(164, 128, 4, '#b9a5e3')}`;
    case 'pinwheel': return `<path d="M152 216 L170 156" stroke="#8a6a4a" stroke-width="3.5" stroke-linecap="round"/><g transform="translate(172 150)"><path d="M0 0 L0 -22 L14 -8 Z" fill="#e86f5b"/><path d="M0 0 L22 0 L8 14 Z" fill="#f2c14e"/><path d="M0 0 L0 22 L-14 8 Z" fill="#5e8fb8"/><path d="M0 0 L-22 0 L-8 -14 Z" fill="#7fb069"/><circle r="3" fill="#fff"/></g>`;
    case 'net': return `<path d="M152 216 L180 130" stroke="#a8744a" stroke-width="4" stroke-linecap="round"/><ellipse cx="186" cy="112" rx="18" ry="20" fill="#fff" fill-opacity=".5" stroke="#3f9c8f" stroke-width="3"/><path d="M172 104 L200 120 M174 120 L198 102 M186 92 L186 132" stroke="#3f9c8f" stroke-width="1" opacity=".5"/>`;
    case 'dinotoy': return `<g transform="translate(144 196)"><path d="M6 30 Q0 10 14 6 Q20 -8 32 -2 Q38 6 30 10 Q36 20 30 34 Z" fill="#7fb069"/><path d="M6 30 Q-6 34 -10 26 Q0 28 6 22" fill="#7fb069"/><circle cx="28" cy="2" r="2" fill="#2b2622"/><path d="M16 8 l3 -5 3 5 3 -5 3 5" stroke="#f2c14e" stroke-width="2" fill="none"/><rect x="10" y="30" width="7" height="8" rx="3" fill="#6d9b59"/><rect x="22" y="30" width="7" height="8" rx="3" fill="#6d9b59"/></g>`;
    case 'lollipop': return `<path d="M154 214 L168 168" stroke="#f5efe4" stroke-width="4" stroke-linecap="round"/><circle cx="170" cy="154" r="17" fill="#ef9fb6"/><path d="M170 154 m-11 0 a11 11 0 1 1 11 11 a7 7 0 1 1 -7 -7 a3 3 0 1 1 3 3" stroke="#fff" stroke-width="3.5" fill="none"/>`;
    case 'cupcake': return `<g transform="translate(146 190)"><path d="M2 14 L30 14 L26 36 L6 36 Z" fill="#e8a5b8"/><path d="M8 14 v22 M16 14 v22 M24 14 v22" stroke="#d48aa0" stroke-width="1.5"/><path d="M0 16 Q0 0 16 0 Q32 0 32 16 Z" fill="#fbf3e6"/><circle cx="16" cy="-3" r="4" fill="#d9534f"/><path d="M8 8 l2 -1 M18 6 l2 1 M24 10 l-1 2" stroke="#5e8fb8" stroke-width="2" stroke-linecap="round"/></g>`;
    case 'lantern': return `<path d="M156 214 L164 176" stroke="#5a514a" stroke-width="3" stroke-linecap="round"/><g transform="translate(164 150)"><circle cx="0" cy="12" r="22" fill="#ffe7a3" opacity=".35"/><path d="M-6 -12 Q0 -20 6 -12" stroke="#5a514a" stroke-width="2.5" fill="none"/><rect x="-10" y="-10" width="20" height="4" rx="2" fill="#6b4a32"/><path d="M-9 -6 L9 -6 L11 20 L-11 20 Z" fill="#ffd77a" stroke="#6b4a32" stroke-width="2"/><path d="M0 -6 L0 20" stroke="#6b4a32" stroke-width="1.5"/><rect x="-12" y="20" width="24" height="5" rx="2" fill="#6b4a32"/></g>`;
    case 'map': return `<g transform="translate(140 176) rotate(-8)"><path d="M0 0 L14 4 L28 0 L42 4 L42 40 L28 36 L14 40 L0 36 Z" fill="#f3e3bd" stroke="#b08a5a" stroke-width="2"/><path d="M14 4 L14 40 M28 0 L28 36" stroke="#d9c39a" stroke-width="1.5"/><path d="M6 28 Q14 18 22 24 T36 12" stroke="#c4473b" stroke-width="2" stroke-dasharray="3 3" fill="none"/><path d="M33 9 l5 5 M38 9 l-5 5" stroke="#c4473b" stroke-width="2.4" stroke-linecap="round"/></g>`;
    case 'spyglass': return `<g transform="translate(150 212) rotate(-55)"><rect x="-5" y="-60" width="10" height="26" rx="3" fill="#c9a24a"/><rect x="-6.5" y="-36" width="13" height="22" rx="3" fill="#8a6a3a"/><rect x="-8" y="-16" width="16" height="16" rx="3" fill="#c9a24a"/><ellipse cx="0" cy="-60" rx="5" ry="2" fill="#bfe3f2"/></g>`;
    case 'shield': return `<g transform="translate(160 196)"><circle cx="0" cy="0" r="28" fill="#3f5a8a" stroke="#c9a24a" stroke-width="5"/><circle cx="0" cy="0" r="9" fill="#f2c14e"/>${[0, 60, 120, 180, 240, 300].map((a) => `<path d="M${(13 * Math.cos((a * Math.PI) / 180)).toFixed(1)} ${(13 * Math.sin((a * Math.PI) / 180)).toFixed(1)} L${(21 * Math.cos((a * Math.PI) / 180)).toFixed(1)} ${(21 * Math.sin((a * Math.PI) / 180)).toFixed(1)}" stroke="#f2c14e" stroke-width="3" stroke-linecap="round"/>`).join('')}</g>`;
    case 'staff': return `<path d="M152 246 Q156 180 160 120" stroke="#8a6a4a" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M160 120 Q150 110 156 98 Q166 104 164 116" fill="none" stroke="#8a6a4a" stroke-width="4"/><circle cx="160" cy="104" r="14" fill="#cfe9ff" opacity=".45"/>${sparkle(160, 104, 9, '#ffffff')}`;
    case 'drawn': return wornImage(l, 'extra');
    case 'icecream': return `<g transform="translate(150 160)"><path d="M0 22 L12 56 L24 22 Z" fill="#d9a066"/><circle cx="12" cy="16" r="13" fill="#f6c3d2"/><circle cx="12" cy="0" r="11" fill="#fbf3e6"/><circle cx="16" cy="-6" r="2" fill="#d9534f"/></g>`;
    default: return '';
  }
}

/** SVG markup (no outer <svg>) for a character in a 200 × 260 box, drawn in an illustration mode. */
export function characterMarkup(l: Look, opts: { animated?: boolean; style?: StyleMode } = {}): string {
  MODE = opts.style ?? 'pocketlight';
  LOOK = MODE;
  // Plush and Pencil are the Tales characters made in another material
  DESIGN = opts.style && onTalesDrawing(opts.style) && !l.face && !l.drawing ? opts.style : 'tales';
  if (DESIGN === 'inked' && !isPet(l.kind) && (l.world ?? 'everyday') === 'everyday' && l.outfit !== 'drawn') {
    // Super Heroes: everyone in their own super suit, standing like a hero (a baby gets a fist in the air)
    const still = !l.action && (!l.pose || l.pose === 'stand');
    l = { ...l, outfit: 'supersuit', ...(still ? { pose: 'hips' } : {}) };
  }
  if (opts.style && onTalesDrawing(opts.style)) MODE = 'tales';
  // in a story world, people are drawn in the world's own style (pets keep the book's look)
  // Under the Sea and Starlight Voyage draw faces the wide-eyed fairytale way, with their own light round them
  RAW_WORLD = isPet(l.kind) || l.face || l.drawing ? 'everyday' : l.world ?? 'everyday';
  WORLD = RAW_WORLD === 'ocean' || RAW_WORLD === 'space' ? 'fairytale' : RAW_WORLD;
  const id = `c${++uid}`;
  const motion = l.personality ? ` m-${PERSONALITIES[l.personality].motion}` : '';
  // every look except Tales builds people its own way (designs.ts), in every world
  const designed = opts.style ? designCharacter(l, LOOK, id) : null;
  if (designed) {
    // the story world still lights them: its glow round the head, a hero's gold rim light
    const aura = WORLD !== 'everyday' ? `<g class="bt-aura">${worldAura(id, designed.head.cy)}</g><!--aura-->` : '';
    const rim = WORLD === 'mythic' ? `<path d="M${(designed.head.cx + designed.head.rx * 0.9).toFixed(1)} ${(designed.head.cy - designed.head.ry * 0.3).toFixed(1)} q8 ${(designed.head.ry * 0.6).toFixed(1)} 0 ${(designed.head.ry * 1.1).toFixed(1)}" stroke="#ffd36b" stroke-width="3.4" fill="none" stroke-linecap="round" opacity=".75"/>` : '';
    return finish(`<g class="${opts.animated ? 'bt-char is-animated' : 'bt-char'}${motion} st-${LOOK}"><defs>${styleFilters(LOOK, id)}</defs>${aura}${designed.svg}${rim}</g>`, l, id);
  }
  if (isArt(WORLD) && MODE !== 'tales') MODE = 'pocketlight';
  const cls = `${opts.animated ? 'bt-char is-animated' : 'bt-char'}${motion} st-${LOOK}`;
  if (l.drawing) {
    // a child's drawing is never edited; the mode's treatment is a filter on top
    const img = `<image href="${l.drawing.replace(/"/g, '&quot;')}" x="-10" y="-20" width="220" height="282" preserveAspectRatio="xMidYMax meet"/>`;
    return finish(`<g class="${cls}"><defs>${styleFilters(MODE, id)}</defs><g class="bt-body">${img}</g></g>`, l, id);
  }
  const pet = isPet(l.kind);
  const s = l.face ? (l.faceScale ?? 100) / 100 : 1;
  const dy = l.face ? l.faceY ?? 0 : 0;
  const head = l.face
    ? `<image href="${l.face.replace(/"/g, '&quot;')}" x="34" y="29" width="132" height="132" preserveAspectRatio="xMidYMid meet"/>`
    : pet ? petFace(id, l) : MODE === 'tales' ? talesFace(id, l) : coreFace(id, l, WORLD);
  // Pocketlight 3D: a warm rim light along the shadow side of the head
  const rim = false ? `<path d="M152 66 Q166 94 152 126" stroke="#fff4dc" stroke-width="4" fill="none" stroke-linecap="round" opacity="${STYLES.pocketlight.lighting.rim}"/>` : '';
  const shadow = MODE === 'wondercut'
    ? `<ellipse cx="102" cy="258" rx="54" ry="5" fill="${STYLES.wondercut.palette.shadow}" opacity=".22"/>`
    : `<ellipse cx="100" cy="257" rx="56" ry="6.5" fill="#000" opacity="${MODE === 'inked' ? 0.14 : 0.09}"/>`;
  const base = pet ? { head: 1, body: 1, slim: 1 } : (DESIGN_PROPS[DESIGN] ?? PROPORTIONS[MODE])[l.kind as 'baby' | 'kid' | 'adult' | 'elder'];
  const wb = pet ? WORLD_BODY.everyday : worldBody(l.world, l.kind);
  const pr = buildOf(base, wb);
  // the hero's rim light down the shadow side of the body
  const bodyRim = WORLD === 'mythic' ? `<path d="M137 160 L142 218" stroke="#ffd36b" stroke-width="3.4" stroke-linecap="round" opacity=".7"/>` : '';
  const bodyT = `translate(100 ${FEET}) scale(${pr.slim} ${pr.body}) translate(-100 -${FEET})`;
  const E = legExtraOf(l, storybook()) * (DESIGN_LEGS[DESIGN] ?? 1);
  const lift = FEET - (FEET - BODY_TOP) * pr.body - BODY_TOP - E * pr.body; // how far the body's top moved up
  const headT = `translate(0 ${lift.toFixed(1)}) translate(100 ${CHIN}) scale(${pr.head}) translate(-100 -${CHIN})`;
  const headY = lift + CHIN + (94 - CHIN) * pr.head;
  const tiltDeg = storybook() && !pet && !l.face && !l.drawing ? (l.kind === 'baby' ? -2 : -4) : 0;
  // body attitude by world: an adventurer leans in, a hero stands proud, off-centre
  const sway = ((l.skin.charCodeAt(2) + l.hair.charCodeAt(3) + l.hairStyle.length) % 2 ? 1 : -1) * 1.6;
  // the action: lift (a jump), lean (a run), lying down (asleep), and the hand's held thing
  const A = pet ? null : actionSpec(l);
  const lean = (pet || l.drawing ? 0 : WORLD === 'adventure' ? 3 : WORLD === 'mythic' ? -2 : sway) + (A?.lean ?? 0);
  const up = A?.lift ?? 0;
  const asleep = !pet && l.action === 'sleep';
  const handThing = (h: [number, number]) => (l.hold ? thingArt(l.hold, h[0] + 4, h[1] - 18, 56) : '');
  const prop = pet ? extra(l) : A && A.raised[1] ? '' : l.hold ? handThing(A!.right.hand) : extra(l);
  const speed = l.action === 'run' ? `<g stroke="#a9b8c8" stroke-width="3.2" stroke-linecap="round" opacity=".65"><path d="M14 130 H-16"/><path d="M6 162 H-28"/><path d="M14 194 H-12"/></g><g fill="#d9cfc2" opacity=".75"><circle cx="34" cy="${FEET - 4}" r="7"/><circle cx="20" cy="${FEET - 8}" r="5"/><circle cx="9" cy="${FEET - 3}" r="3.5"/></g>` : '';
  const boing = l.action === 'jump' ? `<g stroke="#a9b8c8" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".7"><path d="M64 252 q8 -6 16 0"/><path d="M120 252 q8 -6 16 0"/></g>` : '';
  const shadowNow = up > 10 ? shadow.replace('rx="56"', 'rx="40"').replace('rx="54"', 'rx="38"') : shadow;
  const pose = (inner: string) => asleep
    ? `<g transform="translate(100 226) scale(.78) rotate(-90) translate(-100 -132)">${inner}</g><path d="M18 236 Q100 214 186 236 Q190 254 182 258 L22 258 Q12 252 18 236 Z" fill="${mixHex(l.skin, '#8fb3d9', 0.75)}" opacity=".0"/>`
    : `<g class="bt-body"${lean || up ? ` transform="translate(0 ${-up})${lean ? ` rotate(${lean} 100 ${FEET})` : ''}"` : ''}>${inner}</g>`;
  return finish(`<g class="${cls}">
    ${defs(id, l, l.skin, l.hair)}
    ${l.drawing ? '' : `<g class="bt-aura">${worldAura(id, headY)}</g><!--aura-->`}
    ${asleep ? shadow.replace('rx="56"', 'rx="96"').replace('rx="54"', 'rx="94"') : shadowNow}${speed}${boing}
    ${pose(`<g transform="${bodyT}"><g transform="translate(0 ${-E})">${pet ? petBody(id, l) : humanBody(id, l, E)}${l.outfit === 'drawn' ? wornImage(l, 'outfit') : ''}${pet ? '' : bodyRim}<g transform="translate(${pet ? 0 : BODY_SPEC[WORLD].sh[1] - 130} 0)">${prop}</g></g></g>
      <g transform="${headT}${tiltDeg ? ` rotate(${tiltDeg} 100 ${CHIN})` : ''}"><g class="bt-head" transform="translate(0 ${dy}) translate(100 94) scale(${s}) translate(-100 -94)">${head}${rim}${onHead(l, headpiece(l))}${glassesFit(l, glasses(l))}${onHead(l, hat(l))}</g></g>
      ${pet ? '' : `<g transform="${bodyT}"><g transform="translate(${BODY_SPEC[WORLD].sh[0] - 70} ${-E})">${raisedArm(id, l)}${A && A.raised[1] && l.hold ? `<g transform="translate(${BODY_SPEC[WORLD].sh[1] - 130 - (BODY_SPEC[WORLD].sh[0] - 70)} 0)">${handThing(A.right.hand)}</g>` : ''}</g></g>`}
    `)}
  </g>`, l, id);
}

/**
 * Each look has its own proportions: how big the head is against the body.
 * Pocketlight keeps the big-headed toy look; Gouache and Wondercut are a little
 * taller; Classic Ink has the long, graceful proportions of hand-drawn film.
 * `head` scales the head about the chin, `body` stretches the body up from the feet.
 */
const PROPORTIONS: Record<StyleMode, Record<'baby' | 'kid' | 'adult' | 'elder', { head: number; body: number; slim: number }>> = {
  pocketlight: { baby: { head: 1, body: 1, slim: 1 }, kid: { head: 0.9, body: 1.1, slim: 0.98 }, adult: { head: 0.74, body: 1.45, slim: 0.96 }, elder: { head: 0.77, body: 1.38, slim: 1 } },
  gouache: { baby: { head: 0.94, body: 1.06, slim: 1 }, kid: { head: 0.86, body: 1.16, slim: 0.96 }, adult: { head: 0.8, body: 1.26, slim: 0.94 }, elder: { head: 0.82, body: 1.2, slim: 0.98 } },
  wondercut: { baby: { head: 0.96, body: 1.04, slim: 1.04 }, kid: { head: 0.9, body: 1.1, slim: 1.02 }, adult: { head: 0.84, body: 1.2, slim: 1 }, elder: { head: 0.86, body: 1.16, slim: 1.04 } },
  inked: { baby: { head: 0.92, body: 1.08, slim: 1 }, kid: { head: 0.8, body: 1.2, slim: 0.94 }, adult: { head: 0.66, body: 1.42, slim: 0.86 }, elder: { head: 0.7, body: 1.34, slim: 0.9 } },
  // Tales: real film proportions, grown-ups tall and slim, little ones round
  tales: { baby: { head: 0.98, body: 1.02, slim: 1 }, kid: { head: 0.8, body: 1.12, slim: 0.92 }, adult: { head: 0.6, body: 1.28, slim: 0.86 }, elder: { head: 0.64, body: 1.22, slim: 0.9 } },
};
const FEET = 252, BODY_TOP = 146, CHIN = 150;
/** Grown-ups get longer legs (not just a bigger body), so they stand clearly taller than kids. */
const LEG_EXTRA: Record<'baby' | 'kid' | 'adult' | 'elder', number> = { baby: 0, kid: 8, adult: 20, elder: 14 };
const LEG_EXTRA_TALES: Record<'baby' | 'kid' | 'adult' | 'elder', number> = { baby: 0, kid: 22, adult: 48, elder: 36 };
const legExtraOf = (l: Look, storyLook: boolean, mode: StyleMode = MODE) => (storyLook && !isPet(l.kind) && !l.drawing ? (mode === 'tales' ? LEG_EXTRA_TALES : LEG_EXTRA)[l.kind as 'baby' | 'kid' | 'adult' | 'elder'] ?? 0 : 0);

/**
 * A close-up viewBox (written for the Pocketlight head) moved and scaled to
 * where the head sits in another look, so face crops stay on the face.
 */
export function fitViewBox(vb: string, l: Look, mode: StyleMode = 'pocketlight'): string {
  if (isPet(l.kind) || l.drawing) return vb;
  if (hasDesign(mode) && !l.face) {
    // a look's own design: centre the crop on its head, sized to it
    const h = designHead(l, mode);
    if (h) {
      const [, , w] = vb.split(/\s+/).map(Number);
      const S = Math.max(h.rx * 2.5, h.ry * 2.4) * (w / 148);
      return `${(h.cx - S / 2).toFixed(1)} ${(h.cy - S * 0.54).toFixed(1)} ${S.toFixed(1)} ${S.toFixed(1)}`;
    }
  }
  const look = mode;
  DESIGN = onTalesDrawing(mode) ? mode : 'tales';
  if (onTalesDrawing(mode)) mode = 'tales';
  const art = !l.face && (l.world ?? 'everyday') !== 'everyday' && mode !== 'tales';
  const m: StyleMode = art ? 'pocketlight' : mode;
  const b = (m === 'tales' && DESIGN_PROPS[look] ? DESIGN_PROPS[look]! : PROPORTIONS[m])[l.kind as 'baby' | 'kid' | 'adult' | 'elder'], wb = worldBody(l.world, l.kind);
  const pr = buildOf(b, wb);
  const [x, y, w, h] = vb.split(/\s+/).map(Number);
  const E = legExtraOf(l, m === 'pocketlight' || m === 'tales', m) * (m === 'tales' ? DESIGN_LEGS[look] ?? 1 : 1);
  const lift = FEET - (FEET - BODY_TOP) * pr.body - BODY_TOP - E * pr.body;
  const nx = 100 + (x - 100) * pr.head, ny = CHIN + (y - CHIN) * pr.head + lift;
  return `${nx.toFixed(1)} ${ny.toFixed(1)} ${(w * pr.head).toFixed(1)} ${(h * pr.head).toFixed(1)}`;
}

/** Applies the look's line, material and texture to finished markup (see looks.ts). */
function finish(markup: string, l: Look, id: string): string {
  const ink = (fill: string): string | null => {
    const k = STYLES.inked.outline.darken;
    if (fill.startsWith('#')) return darken(fill.length === 4 ? `#${fill[1]}${fill[1]}${fill[2]}${fill[2]}${fill[3]}${fill[3]}` : fill, k);
    if (fill.startsWith(`url(#sk${id}`)) return darken(l.skin, k);
    if (fill.startsWith(`url(#hr${id}`) || fill.startsWith(`url(#fu${id}`)) return darken(l.hair, k);
    return null;
  };
  if (l.drawing) {
    // a child's drawing is never redrawn; the look's treatment of images sits on top
    if (storybook()) return coreInk(markup, l, id);
    return stylizeShapes(markup, MODE, id, ink);
  }
  const imgs = (x: string) => x.replace(/<image\b(?![^>]*\bfilter=)/g, `<image filter="url(#img${id})"`);
  let out: string;
  // Bold Hero is flat cel colour; Movie 3D and Shape Toon have no lines (they're lit in 3D, see looks.ts)
  const flatten = (x: string) => x.replace(new RegExp(`url\\(#sk${id}\\)`, 'g'), l.skin).replace(new RegExp(`url\\(#(hr|fu)${id}\\)`, 'g'), l.hair);
  void flatten;
  if (LOOK === 'pocketlight' && MODE === 'tales') out = imgs(markup);
  else if (LOOK === 'inked' && MODE === 'tales') out = coreInk(markup, l, id);
  else if (LOOK === 'tales' || onTalesDrawing(LOOK)) out = storybook() ? coreInk(markup, l, id) : stylizeShapes(markup, MODE, id, ink);
  // paper cut: every piece is its own slip of paper with its own little shadow
  else if (LOOK === 'wondercut') {
    out = stylizeShapes(markup, 'wondercut', id, ink);
    // a world draws with its own defs, so the paper filters may not be there yet
    if (MODE !== 'wondercut') out = out.replace(/^(\s*<g\b[^>]*>)/, `$1<defs>${styleFilters('wondercut', id)}</defs>`);
  }
  // sketchbook: every shape gets a line, which looks.ts turns to graphite
  else if (LOOK === 'inked') out = stylizeShapes(markup, 'inked', id, ink);
  else out = imgs(markup);
  return finishInLook(out, LOOK, `${id}L`);
}

/** A standalone <svg> for a character. */
export function characterSvg(l: Look, opts: { animated?: boolean; viewBox?: string; label?: string; style?: StyleMode } = {}): string {
  const vb = opts.viewBox ?? '-20 -44 240 314';
  return `<svg viewBox="${vb}" ${opts.label ? `role="img" aria-label="${opts.label.replace(/"/g, '&quot;')}"` : 'aria-hidden="true"'}>${characterMarkup(l, opts)}</svg>`;
}

/** Tight crop around the head for small round avatars. */
export const FACE_VIEWBOX = '26 14 148 148';
