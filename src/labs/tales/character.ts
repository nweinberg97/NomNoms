/**
 * Baby Tales characters, drawn as SVG in a soft, rounded, Genmoji-like style:
 * shaded faces, glossy eyes, a gentle bob and blink. One function returns the
 * markup for a 200 × 260 box (head centred at 100, 95), so the same character
 * appears in the cast list, the dress-up studio and every story page.
 *
 * A real Genmoji (an image) can replace the drawn face; the body, outfit, hat,
 * glasses and extras are always NomNoms layers, so they stay consistent.
 */

export type Kind = 'baby' | 'kid' | 'adult' | 'elder' | 'dog';
export type HairStyle = 'tuft' | 'short' | 'bob' | 'bun' | 'curly' | 'long' | 'bald';

export interface Look {
  kind: Kind;
  skin: string;
  hair: string;
  hairStyle: HairStyle;
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
}

export const SKIN_TONES = ['#f7d7bd', '#f1c6a2', '#e3ad86', '#c98c62', '#9d6a46', '#6e4a33'];
export const HAIR_COLOURS = ['#2b2420', '#4a3426', '#7a5236', '#b07a45', '#d9b26a', '#c9562c', '#d8d2c8'];
export const HAIR_STYLES: Record<HairStyle, string> = { tuft: 'Baby curl', short: 'Short', bob: 'Bob', bun: 'Bun', curly: 'Curly', long: 'Long', bald: 'None' };

export const HATS: Record<string, string> = { none: 'No hat', party: 'Party', pirate: 'Pirate', crown: 'Crown', sunhat: 'Sun hat', beanie: 'Beanie', bunny: 'Bunny ears', cowboy: 'Cowboy', chef: 'Chef', flowers: 'Flower crown', wizard: 'Wizard', bucket: 'Bucket hat' };
export const GLASSES: Record<string, string> = { none: 'None', round: 'Round', sun: 'Sunglasses', hearts: 'Hearts', stars: 'Stars', goggles: 'Goggles' };
export const OUTFITS: Record<string, string> = { tee: 'T-shirt', overalls: 'Overalls', pajamas: 'Pajamas', swimsuit: 'Swimsuit', raincoat: 'Raincoat', snowsuit: 'Snowsuit', party: 'Party dress', bee: 'Bee', dino: 'Dinosaur', pirate: 'Pirate', astronaut: 'Astronaut', hero: 'Superhero', none: 'Just me' };
export const EXTRAS: Record<string, string> = { none: 'Nothing', balloon: 'Balloon', teddy: 'Teddy', sock: 'Sock', flower: 'Flower', bucket: 'Bucket', umbrella: 'Umbrella', icecream: 'Ice cream' };

let uid = 0;

const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(k > 0 ? c + (255 - c) * k : c * (1 + k))));
  return `#${[f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
};

function defs(id: string, l: Look) {
  const skin = l.kind === 'dog' ? '#d9a066' : l.skin;
  return `<defs>
    <radialGradient id="sk${id}" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="${shade(skin, 0.28)}"/><stop offset=".65" stop-color="${skin}"/><stop offset="1" stop-color="${shade(skin, -0.16)}"/></radialGradient>
    <radialGradient id="hr${id}" cx="40%" cy="25%" r="80%"><stop offset="0" stop-color="${shade(l.hair, 0.22)}"/><stop offset="1" stop-color="${shade(l.hair, -0.12)}"/></radialGradient>
    <linearGradient id="gl${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <clipPath id="tc${id}"><path d="${TORSO}"/></clipPath>
  </defs>`;
}

const TORSO = 'M58 160 C70 146 130 146 142 160 L150 238 C120 252 80 252 50 238 Z';

function face(id: string, l: Look) {
  if (l.kind === 'dog') {
    return `<ellipse cx="50" cy="96" rx="19" ry="38" fill="#8a5a33" transform="rotate(22 50 96)"/>
      <ellipse cx="150" cy="96" rx="19" ry="38" fill="#8a5a33" transform="rotate(-22 150 96)"/>
      <circle cx="100" cy="95" r="56" fill="url(#sk${id})"/>
      <ellipse cx="100" cy="122" rx="30" ry="21" fill="#f4dcb6"/>
      <ellipse cx="100" cy="111" rx="10" ry="7" fill="#2b2622"/><ellipse cx="97" cy="108.5" rx="3" ry="1.6" fill="#fff" opacity=".6"/>
      <g class="bt-eyes"><circle cx="80" cy="90" r="7.5" fill="#2b2622"/><circle cx="120" cy="90" r="7.5" fill="#2b2622"/>
      <circle cx="82.5" cy="87" r="2.6" fill="#fff"/><circle cx="122.5" cy="87" r="2.6" fill="#fff"/></g>
      <path d="M100 118 v8 M88 128 Q100 138 112 128" stroke="#2b2622" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <path d="M100 132 q0 12 7 12 q7 0 6 -10" fill="#e9798a"/>`;
  }
  const H = `url(#hr${id})`;
  const hair: Record<HairStyle, string> = {
    tuft: `<path d="M94 42 Q98 22 112 30 Q104 30 104 42" stroke="${l.hair}" stroke-width="6" fill="none" stroke-linecap="round"/>`,
    bald: '',
    short: `<path d="M43 88 Q44 33 100 33 Q156 33 157 88 Q142 58 100 57 Q58 58 43 88 Z" fill="${H}"/>`,
    bob: `<path d="M38 116 Q34 34 100 32 Q166 34 162 116 L150 116 Q148 62 100 58 Q52 62 50 116 Z" fill="${H}"/>`,
    bun: `<circle cx="100" cy="31" r="17" fill="${H}"/><path d="M43 88 Q46 38 100 38 Q154 38 157 88 Q140 62 100 61 Q60 62 43 88 Z" fill="${H}"/>`,
    curly: `<g fill="${H}">${[[52, 70], [62, 50], [80, 38], [100, 33], [120, 38], [138, 50], [148, 70], [46, 90], [154, 90]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="17"/>`).join('')}</g>`,
    long: `<path d="M36 150 Q30 34 100 32 Q170 34 164 150 Q156 156 150 148 Q148 64 100 58 Q52 64 50 148 Q44 156 36 150 Z" fill="${H}"/>`,
  };
  const back = l.hairStyle === 'long' || l.hairStyle === 'bob' ? hair[l.hairStyle] : '';
  const front = l.hairStyle === 'long' || l.hairStyle === 'bob' ? `<path d="M46 86 Q50 40 100 38 Q150 40 154 86 Q138 60 100 60 Q62 60 46 86 Z" fill="${H}"/>` : hair[l.hairStyle];
  const baby = l.kind === 'baby';
  const er = baby ? [8, 10] : l.kind === 'kid' ? [7, 8.5] : [6, 7.5];
  return `${back}
    <circle cx="42" cy="102" r="12" fill="url(#sk${id})"/><circle cx="158" cy="102" r="12" fill="url(#sk${id})"/>
    <circle cx="100" cy="95" r="58" fill="url(#sk${id})"/>
    ${front}
    ${l.beard ? `<path d="M56 112 Q60 158 100 160 Q140 158 144 112 Q134 142 100 144 Q66 142 56 112 Z" fill="${H}"/>` : ''}
    ${l.kind === 'elder' ? `<path d="M66 84 Q78 78 90 84 M110 84 Q122 78 134 84" stroke="${shade(l.hair, -0.25)}" stroke-width="3" fill="none" stroke-linecap="round"/>` : ''}
    <g class="bt-eyes"><ellipse cx="78" cy="102" rx="${er[0]}" ry="${er[1]}" fill="#2b2622"/><ellipse cx="122" cy="102" rx="${er[0]}" ry="${er[1]}" fill="#2b2622"/>
    <circle cx="80.8" cy="98.2" r="2.9" fill="#fff"/><circle cx="124.8" cy="98.2" r="2.9" fill="#fff"/><circle cx="76" cy="105" r="1.3" fill="#fff" opacity=".7"/><circle cx="120" cy="105" r="1.3" fill="#fff" opacity=".7"/></g>
    <ellipse cx="65" cy="121" rx="11" ry="7" fill="#f08a7c" opacity=".38"/><ellipse cx="135" cy="121" rx="11" ry="7" fill="#f08a7c" opacity=".38"/>
    ${l.beard ? `<path d="M88 126 Q100 134 112 126" stroke="#5b3a2e" stroke-width="3.5" fill="none" stroke-linecap="round"/>` : `<path d="M86 123 Q100 ${baby ? 140 : 135} 114 123 Q100 130 86 123 Z" fill="#9b4a3d"/><path d="M93 130 Q100 ${baby ? 136 : 133} 107 130" fill="#e9798a"/>`}
    <ellipse cx="82" cy="62" rx="22" ry="10" fill="#fff" opacity=".18" transform="rotate(-18 82 62)"/>`;
}

function body(id: string, l: Look) {
  const skin = l.kind === 'dog' ? '#d9a066' : l.skin;
  const fills: Record<string, string> = { none: l.kind === 'dog' ? '#d9a066' : shade(skin, -0.05), tee: '#5e8fb8', overalls: '#f5efe4', pajamas: '#a9b8e8', swimsuit: '#ef7d6b', raincoat: '#f0bd45', snowsuit: '#d9776b', party: '#ef9fb6', bee: '#f4c443', dino: '#7fb069', pirate: '#ffffff', astronaut: '#eef1f4', hero: '#4a76c4' };
  const fill = fills[l.outfit] ?? '#e8e1d6';
  let back = '', over = '';
  switch (l.outfit) {
    case 'bee': back = `<ellipse cx="54" cy="170" rx="26" ry="18" fill="#d6ecf7" opacity=".9" transform="rotate(-25 54 170)"/><ellipse cx="146" cy="170" rx="26" ry="18" fill="#d6ecf7" opacity=".9" transform="rotate(25 146 170)"/>`;
      over = `<g clip-path="url(#tc${id})"><rect x="40" y="176" width="120" height="14" fill="#2b2622"/><rect x="40" y="204" width="120" height="14" fill="#2b2622"/><rect x="40" y="232" width="120" height="14" fill="#2b2622"/></g>`; break;
    case 'dino': back = `<path d="M60 220 Q20 232 8 206 Q34 218 56 204 Z" fill="#6d9b59"/>`; over = `<ellipse cx="100" cy="212" rx="28" ry="32" fill="#c8e0a8"/>`; break;
    case 'tee': over = `<rect x="40" y="186" width="120" height="12" fill="#f3d36b" clip-path="url(#tc${id})"/>`; break;
    case 'overalls': over = `<path d="M52 205 L148 205 L150 238 C120 252 80 252 50 238 Z" fill="#5a7ea7"/><rect x="74" y="178" width="52" height="34" rx="6" fill="#5a7ea7"/><path d="M74 182 L66 156 M126 182 L134 156" stroke="#5a7ea7" stroke-width="7" stroke-linecap="round"/><circle cx="80" cy="186" r="3" fill="#f0c45a"/><circle cx="120" cy="186" r="3" fill="#f0c45a"/>`; break;
    case 'pajamas': over = `<g clip-path="url(#tc${id})" fill="#fff" opacity=".85">${[[70, 172], [104, 186], [132, 170], [80, 210], [118, 222], [92, 238]].map(([x, y]) => `<path d="M${x} ${y} l2.4 5 5.4 .6 -4 3.7 1.1 5.3 -4.9 -2.7 -4.9 2.7 1.1 -5.3 -4 -3.7 5.4 -.6z"/>`).join('')}</g>`; break;
    case 'swimsuit': over = `<g clip-path="url(#tc${id})"><rect x="40" y="150" width="120" height="44" fill="${skin}"/><path d="M40 196 Q100 186 160 196" stroke="#fff" stroke-width="4" fill="none"/>${[60, 84, 108, 132].map((x) => `<circle cx="${x}" cy="222" r="5" fill="#fff" opacity=".7"/>`).join('')}</g><path d="M78 156 L84 196 M122 156 L116 196" stroke="#ef7d6b" stroke-width="7" stroke-linecap="round"/>`; break;
    case 'raincoat': over = `<path d="M100 152 L100 246" stroke="#c99a2e" stroke-width="2.5"/><circle cx="92" cy="182" r="3.5" fill="#c99a2e"/><circle cx="92" cy="206" r="3.5" fill="#c99a2e"/><circle cx="92" cy="230" r="3.5" fill="#c99a2e"/><path d="M76 152 L100 170 L124 152" fill="none" stroke="#c99a2e" stroke-width="3"/>`; break;
    case 'snowsuit': over = `<rect x="44" y="196" width="112" height="10" fill="#fbf7f2" clip-path="url(#tc${id})"/><path d="M100 154 L100 246" stroke="#b9584e" stroke-width="3"/><circle cx="100" cy="160" r="6" fill="#fbf7f2"/>`; break;
    case 'party': over = `<ellipse cx="100" cy="226" rx="62" ry="22" fill="#f6c3d2"/><ellipse cx="100" cy="222" rx="54" ry="16" fill="#ef9fb6"/><circle cx="100" cy="176" r="5" fill="#fff"/>`; break;
    case 'pirate': over = `<g clip-path="url(#tc${id})"><rect x="40" y="170" width="120" height="9" fill="#d9534f"/><rect x="40" y="190" width="120" height="9" fill="#d9534f"/><rect x="40" y="210" width="120" height="9" fill="#d9534f"/><rect x="40" y="230" width="120" height="9" fill="#d9534f"/></g><path d="M56 214 L146 196 L148 206 L58 226 Z" fill="#2b2622"/>`; break;
    case 'astronaut': over = `<rect x="78" y="186" width="44" height="28" rx="6" fill="#c9d3dc"/><circle cx="90" cy="200" r="4" fill="#e86f5b"/><circle cx="104" cy="200" r="4" fill="#5e8fb8"/><rect x="40" y="168" width="120" height="6" fill="#d9e0e6" clip-path="url(#tc${id})"/>`; break;
    case 'hero': back = `<path d="M62 158 Q100 150 138 158 L170 246 Q100 236 30 246 Z" fill="#d9534f"/>`; over = `<path d="M100 178 l9 14 h-18 z" fill="#f2c14e"/>`; break;
  }
  const sleeve = l.outfit === 'none' || l.outfit === 'swimsuit' ? `url(#sk${id})` : fill;
  return `${back}
    <ellipse cx="82" cy="252" rx="17" ry="9" fill="#4a3f38"/><ellipse cx="118" cy="252" rx="17" ry="9" fill="#4a3f38"/>
    <ellipse cx="49" cy="198" rx="13" ry="30" fill="${sleeve}" transform="rotate(18 49 198)"/>
    <ellipse cx="151" cy="198" rx="13" ry="30" fill="${sleeve}" transform="rotate(-18 151 198)"/>
    <path d="${TORSO}" fill="${fill}"/>
    ${over}
    <path d="${TORSO}" fill="url(#gl${id})"/>
    <circle cx="41" cy="226" r="11" fill="url(#sk${id})"/><circle cx="159" cy="226" r="11" fill="url(#sk${id})"/>`;
}

function headpiece(l: Look) {
  if (l.outfit === 'bee') return `<path d="M84 42 Q74 14 66 8 M116 42 Q126 14 134 8" stroke="#2b2622" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="66" cy="8" r="7" fill="#2b2622"/><circle cx="134" cy="8" r="7" fill="#2b2622"/>`;
  if (l.outfit === 'dino') return `<path d="M64 52 L70 30 L80 46 L88 22 L98 42 L108 20 L116 42 L126 24 L132 48 L140 34 L142 58 Z" fill="#6d9b59"/>`;
  if (l.outfit === 'astronaut' && l.hat === 'none') return `<circle cx="100" cy="95" r="72" fill="#cfe6f4" fill-opacity=".22" stroke="#e3e9ee" stroke-width="7"/><path d="M58 60 Q70 40 92 36" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>`;
  return '';
}

function hat(l: Look) {
  switch (l.hat) {
    case 'party': return `<path d="M100 -6 L128 48 Q100 58 72 48 Z" fill="#e86f5b"/><path d="M90 14 L110 14 M84 28 L116 28" stroke="#fff3d6" stroke-width="4" stroke-linecap="round"/><circle cx="100" cy="-6" r="8" fill="#f7d06b"/>`;
    case 'pirate': return `<path d="M36 58 Q100 -12 164 58 Q130 42 100 48 Q70 42 36 58 Z" fill="#2b2622"/><circle cx="100" cy="28" r="7" fill="#fff"/><path d="M92 38 L108 44 M108 38 L92 44" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`;
    case 'crown': return `<path d="M64 54 L68 18 L85 38 L100 10 L115 38 L132 18 L136 54 Z" fill="#f2c14e" stroke="#c99a2e" stroke-width="2.5" stroke-linejoin="round"/><circle cx="100" cy="42" r="5" fill="#d9534f"/><circle cx="80" cy="46" r="4" fill="#5e8fb8"/><circle cx="120" cy="46" r="4" fill="#5e8fb8"/>`;
    case 'sunhat': return `<path d="M60 52 Q62 12 100 10 Q138 12 140 52 Z" fill="#ead6aa"/><ellipse cx="100" cy="52" rx="82" ry="15" fill="#ead6aa"/><path d="M61 44 Q100 54 139 44 L140 52 Q100 62 60 52 Z" fill="#d9776b"/>`;
    case 'beanie': return `<path d="M44 70 Q46 10 100 8 Q154 10 156 70 Z" fill="#d9776b"/><rect x="42" y="58" width="116" height="16" rx="8" fill="#c4645a"/><circle cx="100" cy="6" r="11" fill="#f5efe4"/>`;
    case 'bunny': return `<ellipse cx="78" cy="10" rx="13" ry="36" fill="#fbf7f2" transform="rotate(-10 78 10)"/><ellipse cx="78" cy="12" rx="6" ry="25" fill="#f4b8c3" transform="rotate(-10 78 12)"/><ellipse cx="122" cy="10" rx="13" ry="36" fill="#fbf7f2" transform="rotate(10 122 10)"/><ellipse cx="122" cy="12" rx="6" ry="25" fill="#f4b8c3" transform="rotate(10 122 12)"/>`;
    case 'cowboy': return `<path d="M24 56 Q100 34 176 56 Q160 66 100 64 Q40 66 24 56 Z" fill="#a8744a"/><path d="M66 56 Q64 14 84 16 Q100 26 116 16 Q136 14 134 56 Z" fill="#b9845a"/><rect x="66" y="44" width="68" height="7" fill="#7a5236"/>`;
    case 'chef': return `<rect x="70" y="40" width="60" height="18" rx="4" fill="#fbfbf8" stroke="#e2ddd3" stroke-width="2"/><circle cx="78" cy="30" r="17" fill="#fbfbf8"/><circle cx="100" cy="20" r="20" fill="#fbfbf8"/><circle cx="122" cy="30" r="17" fill="#fbfbf8"/>`;
    case 'flowers': return [60, 78, 100, 122, 140].map((x, i) => `<g transform="translate(${x} ${44 - (i === 2 ? 8 : i % 2 ? 4 : 0)})">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-7" rx="5" ry="8" fill="${['#f4a3b5', '#f2c14e', '#b9a5e3', '#f4a3b5', '#f2c14e'][i]}" transform="rotate(${a})"/>`).join('')}<circle r="4" fill="#fff3d6"/></g>`).join('');
    case 'wizard': return `<path d="M100 -18 L136 52 Q100 62 64 52 Z" fill="#5b4b9a"/><ellipse cx="100" cy="52" rx="50" ry="10" fill="#4a3d82"/><path d="M96 12 l3 6 6 1 -4.5 4 1 6 -5.5 -3 -5.5 3 1 -6 -4.5 -4 6 -1z" fill="#f2c14e"/>`;
    case 'bucket': return `<path d="M56 56 Q58 16 100 14 Q142 16 144 56 Z" fill="#7fb069"/><path d="M40 60 Q100 44 160 60 L150 70 Q100 58 50 70 Z" fill="#6d9b59"/>`;
    default: return '';
  }
}

function glasses(l: Look) {
  const y = 102 + (l.face ? l.glassesY ?? 0 : 0) + (l.kind === 'dog' ? -12 : 0);
  const star = (x: number) => { let p = ''; for (let i = 0; i < 10; i++) { const r = i % 2 ? 7 : 16, a = Math.PI / 5 * i - Math.PI / 2; p += `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)} `; } return `<polygon points="${p}" fill="#f5c542" stroke="#c99a2e" stroke-width="2"/>`; };
  const heart = (x: number) => `<path d="M${x} ${y + 12} C${x - 22} ${y - 2} ${x - 12} ${y - 18} ${x} ${y - 7} C${x + 12} ${y - 18} ${x + 22} ${y - 2} ${x} ${y + 12} Z" fill="#e05a6f" opacity=".9"/>`;
  switch (l.glasses) {
    case 'round': return `<circle cx="78" cy="${y}" r="16" fill="#fff" fill-opacity=".18" stroke="#2b2622" stroke-width="4"/><circle cx="122" cy="${y}" r="16" fill="#fff" fill-opacity=".18" stroke="#2b2622" stroke-width="4"/><path d="M94 ${y} Q100 ${y - 5} 106 ${y}" stroke="#2b2622" stroke-width="4" fill="none"/>`;
    case 'sun': return `<rect x="58" y="${y - 12}" width="38" height="24" rx="10" fill="#1f1c1a"/><rect x="104" y="${y - 12}" width="38" height="24" rx="10" fill="#1f1c1a"/><path d="M96 ${y - 4} L104 ${y - 4}" stroke="#1f1c1a" stroke-width="4"/><path d="M64 ${y - 6} L74 ${y - 6}" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".6"/>`;
    case 'hearts': return heart(78) + heart(122) + `<path d="M94 ${y - 2} L106 ${y - 2}" stroke="#b8394f" stroke-width="3"/>`;
    case 'stars': return star(78) + star(122) + `<path d="M93 ${y} L107 ${y}" stroke="#c99a2e" stroke-width="3"/>`;
    case 'goggles': return `<path d="M40 ${y - 2} L160 ${y - 2}" stroke="#2f7fa8" stroke-width="7"/><ellipse cx="78" cy="${y}" rx="18" ry="15" fill="#bfe6f5" fill-opacity=".55" stroke="#2f7fa8" stroke-width="5"/><ellipse cx="122" cy="${y}" rx="18" ry="15" fill="#bfe6f5" fill-opacity=".55" stroke="#2f7fa8" stroke-width="5"/>`;
    default: return '';
  }
}

function extra(l: Look) {
  switch (l.extra) {
    case 'balloon': return `<path d="M160 222 Q170 170 176 116" stroke="#8f857b" stroke-width="2" fill="none"/><ellipse cx="176" cy="94" rx="22" ry="26" fill="#e86f5b"/><ellipse cx="168" cy="84" rx="5" ry="8" fill="#fff" opacity=".45"/>`;
    case 'teddy': return `<g transform="translate(150 196)"><circle cx="0" cy="0" r="9" fill="#a8744a"/><circle cx="16" cy="0" r="9" fill="#a8744a"/><circle cx="8" cy="12" r="16" fill="#b9845a"/><circle cx="8" cy="34" r="18" fill="#b9845a"/><circle cx="3" cy="10" r="2.2" fill="#2b2622"/><circle cx="13" cy="10" r="2.2" fill="#2b2622"/><ellipse cx="8" cy="17" rx="5" ry="3.5" fill="#e8c9a6"/></g>`;
    case 'sock': return `<g transform="translate(150 186) rotate(12)"><path d="M0 0 L22 0 L22 34 Q22 50 6 50 L-10 50 Q-20 50 -20 40 Q-20 32 -8 32 L0 32 Z" fill="#f5efe4" stroke="#d9cfc0" stroke-width="2"/><rect x="0" y="6" width="22" height="6" fill="#5e8fb8"/><rect x="0" y="18" width="22" height="6" fill="#e86f5b"/></g>`;
    case 'flower': return `<path d="M160 226 Q162 196 166 176" stroke="#5f8f4e" stroke-width="3" fill="none"/>${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="166" cy="164" rx="7" ry="12" fill="#f4a3b5" transform="rotate(${a} 166 176)"/>`).join('')}<circle cx="166" cy="176" r="6" fill="#f5c542"/>`;
    case 'bucket': return `<g transform="translate(146 206)"><path d="M0 0 L28 0 L24 30 L4 30 Z" fill="#f2c14e"/><path d="M0 0 Q14 -16 28 0" stroke="#c99a2e" stroke-width="2.5" fill="none"/><rect x="30" y="-24" width="5" height="40" rx="2" fill="#e86f5b" transform="rotate(20 32 -4)"/></g>`;
    case 'umbrella': return `<path d="M164 230 L170 110" stroke="#5a514a" stroke-width="3"/><path d="M118 112 Q170 50 222 112 Q209 102 196 112 Q183 102 170 112 Q157 102 144 112 Q131 102 118 112 Z" fill="#e86f5b"/><path d="M164 230 q-2 8 -9 6" stroke="#5a514a" stroke-width="3" fill="none"/>`;
    case 'icecream': return `<g transform="translate(156 168)"><path d="M0 22 L12 56 L24 22 Z" fill="#d9a066"/><circle cx="12" cy="16" r="13" fill="#f6c3d2"/><circle cx="12" cy="0" r="11" fill="#fbf3e6"/><circle cx="16" cy="-6" r="2" fill="#d9534f"/></g>`;
    default: return '';
  }
}

/** SVG markup (no outer <svg>) for a character in a 200 × 260 box. */
export function characterMarkup(l: Look, opts: { animated?: boolean } = {}): string {
  const id = `c${++uid}`;
  const s = l.face ? (l.faceScale ?? 100) / 100 : 1;
  const dy = l.face ? l.faceY ?? 0 : 0;
  const head = l.face ? `<image href="${l.face.replace(/"/g, '&quot;')}" x="34" y="29" width="132" height="132" preserveAspectRatio="xMidYMid meet"/>` : face(id, l);
  return `<g class="${opts.animated ? 'bt-char is-animated' : 'bt-char'}">
    ${defs(id, l)}
    <ellipse cx="100" cy="258" rx="58" ry="7" fill="#000" opacity=".08"/>
    <g class="bt-body">${body(id, l)}
      <g class="bt-head" transform="translate(0 ${dy}) translate(100 95) scale(${s}) translate(-100 -95)">${head}${headpiece(l)}${glasses(l)}${hat(l)}</g>
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
export const FACE_VIEWBOX = '28 14 144 144';
