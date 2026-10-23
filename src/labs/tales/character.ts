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
export type HairStyle = 'tuft' | 'buzz' | 'short' | 'sides' | 'bob' | 'long' | 'wavy' | 'ponytail' | 'pigtails' | 'bun' | 'curly' | 'afro' | 'braids' | 'bald';
export type Expression = 'grin' | 'smile' | 'laugh' | 'wow' | 'sleepy';

export interface Look {
  kind: Kind;
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  eyes?: string;
  expression?: Expression;
  freckles?: boolean;
  lashes?: boolean;
  beard?: boolean;
  outfit: string;
  hat: string;
  glasses: string;
  extra: string;
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
  tuft: 'Baby curl', buzz: 'Buzz', short: 'Short', sides: 'Sides only', bob: 'Bob', long: 'Long', wavy: 'Wavy', ponytail: 'Ponytail',
  pigtails: 'Pigtails', bun: 'Bun', curly: 'Curly', afro: 'Afro', braids: 'Braids', bald: 'None',
};
export const EXPRESSIONS: Record<Expression, string> = { grin: 'Big smile', smile: 'Smile', laugh: 'Giggle', wow: 'Wow', sleepy: 'Sleepy' };

export const HATS: Record<string, string> = { none: 'No hat', party: 'Party', pirate: 'Pirate', crown: 'Crown', sunhat: 'Sun hat', beanie: 'Beanie', bunny: 'Bunny ears', cowboy: 'Cowboy', chef: 'Chef', flowers: 'Flower crown', wizard: 'Wizard', bucket: 'Bucket hat', bow: 'Big bow', cap: 'Cap' };
export const GLASSES: Record<string, string> = { none: 'None', round: 'Round', sun: 'Sunglasses', hearts: 'Hearts', stars: 'Stars', goggles: 'Goggles' };
export const OUTFITS: Record<string, string> = { tee: 'T-shirt', overalls: 'Overalls', hoodie: 'Hoodie', dress: 'Dress', cardigan: 'Cardigan', pajamas: 'Pajamas', swimsuit: 'Swimsuit', raincoat: 'Raincoat', snowsuit: 'Snowsuit', party: 'Party dress', bee: 'Bee', dino: 'Dinosaur', pirate: 'Pirate', astronaut: 'Astronaut', hero: 'Superhero', none: 'Onesie' };
export const EXTRAS: Record<string, string> = { none: 'Nothing', balloon: 'Balloon', teddy: 'Teddy', sock: 'Sock', flower: 'Flower', bucket: 'Bucket', umbrella: 'Umbrella', icecream: 'Ice cream' };

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
function eye(id: string, cx: number, cy: number, l: Look, side: -1 | 1) {
  const ex = l.expression ?? (l.kind === 'baby' || l.kind === 'kid' ? 'grin' : 'smile');
  const ink = '#2a201c';
  if (ex === 'laugh') return `<path d="M${cx - 11} ${cy + 3} Q${cx} ${cy - 9} ${cx + 11} ${cy + 3}" stroke="${ink}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  const size = l.kind === 'baby' ? [13, 14, 11] : l.kind === 'kid' ? [12.5, 13, 10] : l.kind === 'adult' ? [11.5, 11, 8.6] : [10.5, 9.5, 7.6];
  const [w, h, r] = ex === 'wow' ? [size[0] + 1, size[1] + 2, size[2]] : size;
  const clip = `ec${id}${side}`;
  let s = `<clipPath id="${clip}"><ellipse cx="${cx}" cy="${cy}" rx="${w}" ry="${h}"/></clipPath>
    <ellipse cx="${cx}" cy="${cy}" rx="${w}" ry="${h}" fill="#fff"/>
    <g clip-path="url(#${clip})">
      <circle cx="${cx + side * 0.5}" cy="${cy + 1}" r="${r}" fill="url(#ir${id})"/>
      <circle cx="${cx + side * 0.5}" cy="${cy + 1}" r="${r * 0.5}" fill="#120d0b"/>
      <circle cx="${cx - r * 0.35}" cy="${cy - r * 0.4}" r="${r * 0.38}" fill="#fff"/>
      <circle cx="${cx + r * 0.42}" cy="${cy + r * 0.42}" r="${r * 0.17}" fill="#fff" opacity=".85"/>
      <ellipse cx="${cx}" cy="${cy - h}" rx="${w + 2}" ry="${h * 0.35}" fill="#000" opacity=".08"/>
    </g>
    <path d="M${cx - w - 0.5} ${cy + 1} Q${cx} ${cy - h * 1.38} ${cx + w + 0.5} ${cy + 1}" stroke="${ink}" stroke-width="${l.kind === 'baby' ? 2.6 : 3.2}" fill="none" stroke-linecap="round"/>`;
  if (l.lashes) s += `<path d="M${cx + side * (w - 2)} ${cy - h * 0.5} Q${cx + side * (w + 3)} ${cy - h * 0.7} ${cx + side * (w + 6)} ${cy - h * 1.05}" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  if (ex === 'sleepy') s += `<path d="M${cx - w - 1} ${cy + 1} Q${cx} ${cy - h * 1.4} ${cx + w + 1} ${cy + 1} L${cx + w + 1} ${cy - 1} Q${cx} ${cy - 1} ${cx - w - 1} ${cy - 1} Z" fill="url(#sk${id})"/><path d="M${cx - w} ${cy} Q${cx} ${cy + 3} ${cx + w} ${cy}" stroke="${ink}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  if (l.kind === 'elder') s += `<path d="M${cx + side * (w + 3)} ${cy - 2} l${side * 5} -2 M${cx + side * (w + 3)} ${cy + 3} l${side * 5} 2" stroke="${shade(l.skin, -0.28)}" stroke-width="1.6" stroke-linecap="round"/>`;
  return s;
}

function brows(l: Look) {
  if (l.face) return '';
  const ex = l.expression ?? 'grin';
  const c = l.kind === 'baby' ? shade(l.hair, 0.15) : shade(l.hair, -0.25);
  const lift = ex === 'wow' ? -5 : ex === 'sleepy' ? 2 : 0;
  const w = l.kind === 'baby' ? 2.4 : 4;
  return `<path d="M66 ${82 + lift} Q77 ${75 + lift} 89 ${80 + lift}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" opacity="${l.kind === 'baby' ? 0.6 : 1}"/>
    <path d="M111 ${80 + lift} Q123 ${75 + lift} 134 ${82 + lift}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" opacity="${l.kind === 'baby' ? 0.6 : 1}"/>`;
}

function mouth(id: string, l: Look) {
  const ex = l.expression ?? (l.kind === 'baby' || l.kind === 'kid' ? 'grin' : 'smile');
  const lip = '#7a3329';
  const teeth = l.kind !== 'baby';
  switch (ex) {
    case 'smile': return `<path d="M87 125 Q100 137 113 125" stroke="${lip}" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M84 123 Q86 126 88 126 M116 123 Q114 126 112 126" stroke="${lip}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".5"/>`;
    case 'wow': return `<ellipse cx="100" cy="131" rx="7" ry="8.5" fill="${lip}"/><ellipse cx="100" cy="135" rx="4.5" ry="3" fill="#e8737d"/>`;
    case 'sleepy': return `<path d="M93 128 Q100 133 107 128" stroke="${lip}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    default: {
      const big = ex === 'laugh';
      const d = big ? 'M83 121 Q100 126 117 121 Q115 146 100 147 Q85 146 83 121 Z' : 'M86 123 Q100 127 114 123 Q112 141 100 142 Q88 141 86 123 Z';
      return `<clipPath id="mc${id}"><path d="${d}"/></clipPath><path d="${d}" fill="${lip}"/>
        <g clip-path="url(#mc${id})">${teeth ? `<rect x="80" y="${big ? 118 : 120}" width="40" height="${big ? 9 : 7.5}" rx="3" fill="#fff"/>` : ''}<ellipse cx="100" cy="${big ? 145 : 140}" rx="${big ? 11 : 9}" ry="6" fill="#ef7b86"/></g>`;
    }
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
    default: return ['', ''];
  }
}

/* ── faces ────────────────────────────────────────────────── */
function humanFace(id: string, l: Look) {
  const [back, front] = hair(id, l);
  const skin = `url(#sk${id})`;
  const fr = l.freckles ? [[64, 116], [70, 120], [60, 121], [136, 116], [130, 120], [140, 121]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="${shade(l.skin, -0.35)}" opacity=".7"/>`).join('') : '';
  const narrow = l.kind === 'adult' || l.kind === 'elder';
  return `${back}
    <path d="M88 136 L112 136 L110 156 L90 156 Z" fill="${shade(l.skin, -0.12)}"/>
    <circle cx="41" cy="104" r="11.5" fill="${skin}"/><circle cx="159" cy="104" r="11.5" fill="${skin}"/>
    <path d="M43 98 q-5 6 0 12 M157 98 q5 6 0 12" stroke="${shade(l.skin, -0.25)}" stroke-width="2" fill="none" opacity=".5"/>
    <ellipse cx="100" cy="94" rx="${narrow ? 57 : 60}" ry="${narrow ? 60 : 57}" fill="${skin}"/>
    <ellipse cx="100" cy="148" rx="30" ry="6" fill="#000" opacity=".05"/>
    <ellipse cx="66" cy="118" rx="13" ry="9" fill="url(#bl${id})"/><ellipse cx="134" cy="118" rx="13" ry="9" fill="url(#bl${id})"/>${fr}
    <g class="bt-eyes">${eye(id, 78, 101, l, -1)}${eye(id, 122, 101, l, 1)}</g>
    ${brows(l)}
    <path d="M96.5 114 Q100 118 103.5 114" stroke="${shade(l.skin, -0.32)}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    ${l.beard ? `<path d="M54 110 Q58 160 100 162 Q142 160 146 110 Q138 140 118 142 Q100 132 82 142 Q62 140 54 110 Z" fill="url(#hr${id})"/><path d="M84 124 Q100 116 116 124 Q108 128 100 125 Q92 128 84 124 Z" fill="url(#hr${id})"/>` : ''}
    ${mouth(id, l)}
    ${front}
    <ellipse cx="80" cy="64" rx="22" ry="9" fill="#fff" opacity=".12" transform="rotate(-16 80 64)"/>`;
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
};
const TORSO = 'M64 158 C68 146 132 146 136 158 L141 220 C128 230 72 230 59 220 Z';

function humanBody(id: string, l: Look) {
  const o = OUTFIT[l.outfit] ?? OUTFIT.tee;
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
  }
  const armL = 'M70 162 C60 176 54 194 51 212', armR = 'M130 162 C140 176 146 194 149 212';
  const sleeveEnd = o.sleeve === 'short' ? 'M70 162 C64 170 60 178 58 186' : '';
  const sleeveEndR = o.sleeve === 'short' ? 'M130 162 C136 170 140 178 142 186' : '';
  const skirt = o.skirt ? `<path d="M60 204 L140 204 L158 236 Q100 250 42 236 Z" fill="${o.skirt}"/><path d="M60 204 L140 204 L158 236 Q100 250 42 236 Z" fill="url(#gl${id})"/>` : '';
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
  if (l.outfit === 'dino') return `<path d="M62 50 L70 28 L80 44 L88 20 L98 40 L108 18 L116 40 L126 22 L132 46 L140 32 L142 56 Z" fill="#6d9b59"/>`;
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
    case 'goggles': return `<path d="M38 ${y - 2} L162 ${y - 2}" stroke="#2f7fa8" stroke-width="7"/><ellipse cx="78" cy="${y}" rx="19" ry="16" fill="#bfe6f5" fill-opacity=".5" stroke="#2f7fa8" stroke-width="5"/><ellipse cx="122" cy="${y}" rx="19" ry="16" fill="#bfe6f5" fill-opacity=".5" stroke="#2f7fa8" stroke-width="5"/>`;
    default: return '';
  }
}

function extra(l: Look) {
  switch (l.extra) {
    case 'balloon': return `<path d="M152 214 Q166 166 176 116" stroke="#8f857b" stroke-width="2" fill="none"/><ellipse cx="176" cy="94" rx="22" ry="26" fill="#e86f5b"/><ellipse cx="168" cy="84" rx="5" ry="8" fill="#fff" opacity=".45"/>`;
    case 'teddy': return `<g transform="translate(144 192)"><circle cx="0" cy="0" r="9" fill="#a8744a"/><circle cx="16" cy="0" r="9" fill="#a8744a"/><circle cx="8" cy="12" r="16" fill="#b9845a"/><circle cx="8" cy="34" r="18" fill="#b9845a"/><circle cx="3" cy="10" r="2.2" fill="#2b2622"/><circle cx="13" cy="10" r="2.2" fill="#2b2622"/><ellipse cx="8" cy="17" rx="5" ry="3.5" fill="#e8c9a6"/></g>`;
    case 'sock': return `<g transform="translate(146 180) rotate(12)"><path d="M0 0 L22 0 L22 34 Q22 50 6 50 L-10 50 Q-20 50 -20 40 Q-20 32 -8 32 L0 32 Z" fill="#f5efe4" stroke="#d9cfc0" stroke-width="2"/><rect x="0" y="6" width="22" height="6" fill="#5e8fb8"/><rect x="0" y="18" width="22" height="6" fill="#e86f5b"/></g>`;
    case 'flower': return `<path d="M152 218 Q156 190 162 170" stroke="#5f8f4e" stroke-width="3" fill="none"/>${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="162" cy="158" rx="7" ry="12" fill="#f4a3b5" transform="rotate(${a} 162 170)"/>`).join('')}<circle cx="162" cy="170" r="6" fill="#f5c542"/>`;
    case 'bucket': return `<g transform="translate(142 200)"><path d="M0 0 L28 0 L24 30 L4 30 Z" fill="#f2c14e"/><path d="M0 0 Q14 -16 28 0" stroke="#c99a2e" stroke-width="2.5" fill="none"/></g>`;
    case 'umbrella': return `<path d="M156 222 L168 104" stroke="#5a514a" stroke-width="3"/><path d="M116 106 Q168 44 220 106 Q207 96 194 106 Q181 96 168 106 Q155 96 142 106 Q129 96 116 106 Z" fill="#e86f5b"/>`;
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
  return `<g class="${opts.animated ? 'bt-char is-animated' : 'bt-char'}">
    ${defs(id, l, l.skin, l.hair)}
    <ellipse cx="100" cy="257" rx="56" ry="6.5" fill="#000" opacity=".09"/>
    <g class="bt-body">${pet ? petBody(id, l) : humanBody(id, l)}
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
