/**
 * Baby Tales characters: soft, rounded, full-body avatars in the spirit of
 * Bitmoji and animated-film storybooks: big glossy eyes with real eye colours,
 * expressive brows and mouths, layered hair with highlights, gentle 3D shading,
 * and clothes with sleeves, trousers and shoes. All drawn as SVG, so a character
 * looks the same in the cast list, the dress-up studio and every story page.
 *
 * Geometry: a 200 × 260 box, head centred at (100, 94). Hats, glasses and
 * extras are separate layers, so they fit every face, drawn or Genmoji.
 */

export type Kind = 'baby' | 'kid' | 'adult' | 'elder' | 'dog' | 'cat' | 'bunny';
export type HairStyle =
  | 'tuft' | 'buzz' | 'short' | 'sidepart' | 'messy' | 'quiff' | 'pixie' | 'sides' | 'bob' | 'bangs' | 'curtain' | 'long' | 'wavy' | 'longcurly'
  | 'halfup' | 'ponytail' | 'pigtails' | 'bun' | 'topknot' | 'spacebuns' | 'curly' | 'coils' | 'puff' | 'afro' | 'braids' | 'cornrows' | 'locs' | 'bald';
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
  /** A Genmoji (or other image) used as the face. */
  face?: string;
  faceScale?: number;
  faceY?: number;
  glassesY?: number;
  /** A drawing used as the whole character. */
  drawing?: string;
}

export const SKIN_TONES = ['#fbe2cf', '#f6d2b7', '#efc19f', '#e4ad86', '#d39a6e', '#bd8259', '#a06b46', '#865637', '#6b4329', '#52321f'];
export const HAIR_COLOURS = ['#1f1a17', '#3b2a20', '#5a3b26', '#7a5236', '#9c6a3f', '#c08b52', '#e0bd78', '#f0d9a4', '#b5532b', '#d97a4a', '#c9c3bb', '#f3f0ea'];
export const EYE_COLOURS = ['#5a3a22', '#2f2018', '#8a6a2f', '#4f7a4a', '#4a7fb5', '#7b8a94'];
export const HAIR_STYLES: Record<HairStyle, string> = {
  tuft: 'Baby curl', buzz: 'Buzz', short: 'Short', sidepart: 'Side part', messy: 'Messy', quiff: 'Swoop', pixie: 'Pixie', sides: 'Sides only',
  bob: 'Bob', bangs: 'Bangs', curtain: 'Curtain bangs', long: 'Long', wavy: 'Wavy', longcurly: 'Long curls', halfup: 'Half up', ponytail: 'Ponytail',
  pigtails: 'Pigtails', bun: 'Bun', topknot: 'Top knot', spacebuns: 'Space buns', curly: 'Curly', coils: 'Short coils', puff: 'Puff', afro: 'Afro',
  braids: 'Braids', cornrows: 'Cornrows', locs: 'Locs', bald: 'None',
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
};
export const GLASSES: Record<string, string> = { none: 'None', round: 'Round', square: 'Square', cateye: 'Cat-eye', sun: 'Sunglasses', aviator: 'Aviators', hearts: 'Hearts', stars: 'Stars', goggles: 'Goggles', mask: 'Hero mask', nose: 'Funny nose' };
export const OUTFITS: Record<string, string> = {
  tee: 'T-shirt', stripes: 'Stripes', overalls: 'Overalls', hoodie: 'Hoodie', sweater: 'Sweater', denim: 'Denim jacket', puffer: 'Puffer', jersey: 'Sports jersey',
  dress: 'Dress', cardigan: 'Cardigan', sailor: 'Sailor', pajamas: 'Pajamas', swimsuit: 'Swimsuit', raincoat: 'Raincoat', snowsuit: 'Snowsuit', party: 'Party dress',
  tutu: 'Tutu', apron: 'Chef', doctor: 'Doctor', firefighter: 'Firefighter', knight: 'Knight', fairy: 'Fairy', bee: 'Bee', dino: 'Dinosaur', pirate: 'Pirate',
  astronaut: 'Astronaut', hero: 'Superhero', none: 'Onesie',
};
export const EXTRAS: Record<string, string> = {
  none: 'Nothing', balloon: 'Balloon', teddy: 'Teddy', ball: 'Ball', kite: 'Kite', bubbles: 'Bubbles', floatie: 'Swim ring', book: 'Book', ukulele: 'Ukulele',
  wand: 'Magic wand', pinwheel: 'Pinwheel', net: 'Bug net', dinotoy: 'Toy dino', lollipop: 'Lollipop', cupcake: 'Cupcake', icecream: 'Ice cream',
  flower: 'Flower', bucket: 'Bucket', umbrella: 'Umbrella', sock: 'Sock',
};

/** Where a drawn wardrobe piece sits on a character: x, y, width, height in the 200 × 260 box. */
export const WEAR_BOX: Record<WearSlot, [number, number, number, number]> = {
  hat: [20, -40, 160, 100], glasses: [40, 76, 120, 50], outfit: [30, 140, 140, 120], extra: [126, 80, 90, 175],
};

export const exprOf = (l: Look): Expression =>
  l.expression ?? (l.personality ? PERSONALITIES[l.personality].rest : l.kind === 'baby' || l.kind === 'kid' ? 'grin' : 'smile');
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
function defs(id: string, l: Look, skin: string, fur: string) {
  const eye = l.eyes ?? EYE_COLOURS[0];
  return `<defs>
    <radialGradient id="sk${id}" cx="40%" cy="30%" r="78%"><stop offset="0" stop-color="${shade(skin, 0.3)}"/><stop offset=".6" stop-color="${skin}"/><stop offset="1" stop-color="${shade(skin, -0.14)}"/></radialGradient>
    <linearGradient id="hr${id}" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="${shade(l.hair, 0.25)}"/><stop offset=".55" stop-color="${l.hair}"/><stop offset="1" stop-color="${shade(l.hair, -0.22)}"/></linearGradient>
    <radialGradient id="fu${id}" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="${shade(fur, 0.3)}"/><stop offset=".6" stop-color="${fur}"/><stop offset="1" stop-color="${shade(fur, -0.18)}"/></radialGradient>
    <radialGradient id="ir${id}" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="${shade(eye, 0.45)}"/><stop offset=".6" stop-color="${eye}"/><stop offset="1" stop-color="${shade(eye, -0.45)}"/></radialGradient>
    <radialGradient id="bl${id}" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#f27d7d" stop-opacity=".55"/><stop offset="1" stop-color="#f27d7d" stop-opacity="0"/></radialGradient>
    <linearGradient id="gl${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".08"/></linearGradient>
  </defs>`;
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
  const big = ex === 'wow' || ex === 'starry' || ex === 'worried' || (ex === 'silly' && side === 1);
  const [w, h, r] = big ? [size[0] + 1, size[1] + 2, size[2] + 0.6] : size;
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
    : `<path d="M${cx - w - 0.5} ${cy + 1} Q${cx} ${cy - h * 1.38} ${cx + w + 0.5} ${cy + 1}" stroke="${INK}" stroke-width="${l.kind === 'baby' ? 2.6 : 3.2}" fill="none" stroke-linecap="round"/>`;
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
  const [lift, inner] = BROWS[ex] ?? [0, 0];
  const w = l.kind === 'baby' ? 2.4 : 4;
  const o = l.kind === 'baby' ? 0.6 : 1;
  const left = ex === 'wink' ? lift - 5 : ex === 'silly' ? lift + 4 : lift;
  const right = ex === 'wink' ? lift + 2 : lift;
  return `<path d="M66 ${82 + left} Q77 ${75 + left} 89 ${80 + left + inner}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" opacity="${o}"/>
    <path d="M111 ${80 + right + inner} Q123 ${75 + right} 134 ${82 + right}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" opacity="${o}"/>`;
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

/* ── faces ────────────────────────────────────────────────── */
function humanFace(id: string, l: Look) {
  const [rawBack, front] = hair(id, l);
  // buns and puffs tuck under a hat
  const back = l.hat !== 'none' && ['puff', 'topknot', 'bun'].includes(l.hairStyle) ? '' : rawBack;
  const skin = `url(#sk${id})`;
  const fr = l.freckles ? [[64, 116], [70, 120], [60, 121], [136, 116], [130, 120], [140, 121]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="${shade(l.skin, -0.35)}" opacity=".7"/>`).join('') : '';
  const narrow = l.kind === 'adult' || l.kind === 'elder';
  const rosy = ['shy', 'proud', 'starry', 'laugh'].includes(exprOf(l));
  const blush = [66, 134].map((x) => `<ellipse cx="${x}" cy="118" rx="${rosy ? 16 : 13}" ry="${rosy ? 11 : 9}" fill="url(#bl${id})"/>${rosy ? `<ellipse cx="${x}" cy="118" rx="11" ry="7" fill="url(#bl${id})"/>` : ''}`).join('');
  return `${back}
    <path d="M88 136 L112 136 L110 156 L90 156 Z" fill="${shade(l.skin, -0.12)}"/>
    <circle cx="41" cy="104" r="11.5" fill="${skin}"/><circle cx="159" cy="104" r="11.5" fill="${skin}"/>
    <path d="M43 98 q-5 6 0 12 M157 98 q5 6 0 12" stroke="${shade(l.skin, -0.25)}" stroke-width="2" fill="none" opacity=".5"/>
    <ellipse cx="100" cy="94" rx="${narrow ? 57 : 60}" ry="${narrow ? 60 : 57}" fill="${skin}"/>
    <ellipse cx="100" cy="148" rx="30" ry="6" fill="#000" opacity=".05"/>
    ${blush}${fr}
    <g class="bt-eyes">${eye(id, 78, 101, l, -1)}${eye(id, 122, 101, l, 1)}</g>
    ${brows(l)}
    <path d="M96.5 114 Q100 118 103.5 114" stroke="${shade(l.skin, -0.32)}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    ${facialHair(id, l)}
    ${mouth(id, l)}
    ${front}
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
interface Outfit { top: string; sleeve: 'short' | 'long' | 'none'; bottom: string; skirt?: string; shoes: string; bare?: boolean }
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
};
const TORSO = 'M64 158 C68 146 132 146 136 158 L141 220 C128 230 72 230 59 220 Z';

function humanBody(id: string, l: Look) {
  const o = l.outfit === 'drawn' ? OUTFIT.none : OUTFIT[l.outfit] ?? OUTFIT.tee;
  const skin = `url(#sk${id})`;
  const sl = o.sleeve === 'none' ? skin : o.top;
  const legs = o.bottom || skin;
  let back = '', over = '';
  switch (l.outfit) {
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
  }
  const armL = 'M70 162 C60 176 54 194 51 212', armR = 'M130 162 C140 176 146 194 149 212';
  const sleeveEnd = o.sleeve === 'short' ? 'M70 162 C64 170 60 178 58 186' : '';
  const sleeveEndR = o.sleeve === 'short' ? 'M130 162 C136 170 140 178 142 186' : '';
  const skirt = l.outfit === 'tutu'
    ? `<path d="M58 202 L142 202 L170 226 L156 228 L150 238 L138 232 L124 242 L112 234 L100 244 L88 234 L76 242 L62 232 L50 238 L44 228 L30 226 Z" fill="${o.skirt}" opacity=".95"/><path d="M62 204 L138 204 L154 222 L100 230 L46 222 Z" fill="#f6b6c8" opacity=".6"/>`
    : o.skirt ? `<path d="M60 204 L140 204 L158 236 Q100 250 42 236 Z" fill="${o.skirt}"/><path d="M60 204 L140 204 L158 236 Q100 250 42 236 Z" fill="url(#gl${id})"/>` : '';
  const feet = o.shoes ? o.shoes : skin;
  return `<defs><clipPath id="tc${id}"><path d="${TORSO}"/></clipPath></defs>
    ${back}
    <rect x="76" y="212" width="21" height="34" rx="10" fill="${legs}"/><rect x="103" y="212" width="21" height="34" rx="10" fill="${legs}"/>
    <ellipse cx="85" cy="249" rx="16" ry="8.5" fill="${feet}"/><ellipse cx="115" cy="249" rx="16" ry="8.5" fill="${feet}"/>
    ${o.shoes ? `<path d="M72 247 Q85 242 99 247 M101 247 Q115 242 128 247" stroke="#fff" stroke-width="2" fill="none" opacity=".5"/>` : ''}
    <path d="${armL}" stroke="${o.sleeve === 'long' ? sl : skin}" stroke-width="17" fill="none" stroke-linecap="round"/>
    <path d="${armR}" stroke="${o.sleeve === 'long' ? sl : skin}" stroke-width="17" fill="none" stroke-linecap="round"/>
    ${sleeveEnd ? `<path d="${sleeveEnd}" stroke="${o.top}" stroke-width="19" fill="none" stroke-linecap="round"/><path d="${sleeveEndR}" stroke="${o.top}" stroke-width="19" fill="none" stroke-linecap="round"/>` : ''}
    <path d="${TORSO}" fill="${o.top}"/>
    ${skirt}
    ${over}
    <path d="${TORSO}" fill="url(#gl${id})"/>
    <circle cx="50" cy="216" r="10.5" fill="${skin}"/><circle cx="150" cy="216" r="10.5" fill="${skin}"/>
    <circle cx="57" cy="211" r="4.5" fill="${skin}"/><circle cx="143" cy="211" r="4.5" fill="${skin}"/>`;
}

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
    case 'drawn': return wornImage(l, 'extra');
    case 'icecream': return `<g transform="translate(150 160)"><path d="M0 22 L12 56 L24 22 Z" fill="#d9a066"/><circle cx="12" cy="16" r="13" fill="#f6c3d2"/><circle cx="12" cy="0" r="11" fill="#fbf3e6"/><circle cx="16" cy="-6" r="2" fill="#d9534f"/></g>`;
    default: return '';
  }
}

/** SVG markup (no outer <svg>) for a character in a 200 × 260 box. */
export function characterMarkup(l: Look, opts: { animated?: boolean } = {}): string {
  if (l.drawing) {
    return `<g class="${opts.animated ? 'bt-char is-animated' : 'bt-char'}"><g class="bt-body"><image href="${l.drawing.replace(/"/g, '&quot;')}" x="-10" y="-20" width="220" height="282" preserveAspectRatio="xMidYMax meet"/></g></g>`;
  }
  const id = `c${++uid}`;
  const pet = isPet(l.kind);
  const s = l.face ? (l.faceScale ?? 100) / 100 : 1;
  const dy = l.face ? l.faceY ?? 0 : 0;
  const head = l.face
    ? `<image href="${l.face.replace(/"/g, '&quot;')}" x="34" y="29" width="132" height="132" preserveAspectRatio="xMidYMid meet"/>`
    : pet ? petFace(id, l) : humanFace(id, l);
  const motion = l.personality ? ` m-${PERSONALITIES[l.personality].motion}` : '';
  return `<g class="${opts.animated ? 'bt-char is-animated' : 'bt-char'}${motion}">
    ${defs(id, l, l.skin, l.hair)}
    <ellipse cx="100" cy="257" rx="56" ry="6.5" fill="#000" opacity=".09"/>
    <g class="bt-body">${pet ? petBody(id, l) : humanBody(id, l)}${l.outfit === 'drawn' ? wornImage(l, 'outfit') : ''}
      <g class="bt-head" transform="translate(0 ${dy}) translate(100 94) scale(${s}) translate(-100 -94)">${head}${headpiece(l)}${glasses(l)}${hat(l)}</g>
      ${extra(l)}
    </g>
  </g>`;
}

/** A standalone <svg> for a character. */
export function characterSvg(l: Look, opts: { animated?: boolean; viewBox?: string; label?: string } = {}): string {
  const vb = opts.viewBox ?? '-20 -30 240 300';
  return `<svg viewBox="${vb}" ${opts.label ? `role="img" aria-label="${opts.label.replace(/"/g, '&quot;')}"` : 'aria-hidden="true"'}>${characterMarkup(l, opts)}</svg>`;
}

/** Tight crop around the head for small round avatars. */
export const FACE_VIEWBOX = '26 14 148 148';
