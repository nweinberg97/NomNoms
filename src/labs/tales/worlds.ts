import { accentOf, type Look, type Pose, type WorldId } from './character';
import type { StoryType } from './catalog';

/**
 * Story worlds: Everyday, Classic Fairytale, Adventure Story, Mythic Hero.
 *
 * A world is art direction for the whole book, not a colour filter and not a
 * new identity. It brings its own original costumes and props, hand-drawn
 * places, light and atmosphere, body language (characters' posture and poses),
 * and a story of its own. Who someone is (face, skin, hair, face shape, the
 * Character DNA) never changes between worlds.
 *
 * Every design here is original: broad storybook ideas (a hilltop castle, a
 * jungle trail, a temple in the clouds), no characters, costumes, names or
 * compositions from any film or franchise.
 */

export interface World {
  id: WorldId;
  name: string;
  /** The feeling it's going for, in a few words. */
  feeling: string;
  blurb: string;
  /** Its own places, drawn for it. */
  places: string[];
  /** Its own story. */
  story?: StoryType;
}

export const WORLDS: Record<WorldId, World> = {
  everyday: { id: 'everyday', name: 'Everyday', feeling: 'Home, the park, the zoo', blurb: 'Real places and everyday adventures.', places: [] },
  fairytale: { id: 'fairytale', name: 'Classic Fairytale', feeling: 'Wonder, warmth and kindness', blurb: 'Graceful costumes, a hilltop castle, an enchanted wood and soft golden light.', places: ['hillcastle', 'enchanted'], story: 'fairytale' },
  adventure: { id: 'adventure', name: 'Adventure Story', feeling: 'Courage, curiosity and discovery', blurb: 'Explorer kit, a jungle trail, a mountain pass and bright open air.', places: ['jungle', 'peaks'], story: 'expedition' },
  mythic: { id: 'mythic', name: 'Mythic Hero', feeling: 'Bold, brave and legendary', blurb: 'Heroic armour, a temple in the clouds, a starlit summit and dramatic light.', places: ['skytemple', 'starpeak'], story: 'legend' },
};
export const WORLD_IDS: WorldId[] = ['everyday', 'fairytale', 'adventure', 'mythic'];

const SKIRTED = ['dress', 'party', 'tutu', 'fairy', 'gown', 'sunrobe'];

/**
 * What someone wears in a world, chosen from who they are in the story (the
 * star, a grown-up, a grandparent, a kid) and whether their everyday outfit
 * has a skirt. A parent's own wardrobe choice in that world always wins.
 */
export function worldCostume(world: WorldId, look: Look, star: boolean): Partial<Look> {
  if (world === 'everyday' || ['dog', 'cat', 'bunny'].includes(look.kind)) return {};
  const skirt = SKIRTED.includes(look.outfit);
  const elder = look.kind === 'elder', grown = look.kind === 'adult';
  const glasses = look.glasses === 'sun' ? 'none' : look.glasses;
  const accent = accentOf(look.outfit);
  const c = costumeFor(world, star, skirt, elder, grown, look, glasses);
  return accent ? { ...c, accent } : c;
}
function costumeFor(world: WorldId, star: boolean, skirt: boolean, elder: boolean, grown: boolean, look: Look, glasses: string): Partial<Look> {
  switch (world) {
    case 'fairytale': // the royal family of a storybook kingdom
      if (star) return { outfit: skirt ? 'gown' : 'ftunic', hat: look.kind === 'baby' ? 'crown' : skirt ? 'tiara' : 'crown', extra: 'lantern', glasses, pose: 'wave' };
      if (elder) return { outfit: 'cloak', hat: skirt ? 'tiara' : 'none', extra: 'staff', glasses };
      if (grown) return { outfit: skirt ? 'gown' : 'ftunic', hat: skirt ? 'tiara' : 'crown', extra: 'none', glasses, pose: 'wave' };
      return { outfit: skirt ? 'gown' : 'cloak', hat: 'circlet', extra: 'wand', glasses, pose: 'wave' };
    case 'adventure': // an expedition team: hats, packs and kit
      if (star) return { outfit: 'explorer', hat: 'brimhat', extra: 'map', pose: 'point' };
      if (elder) return { outfit: 'ranger', hat: 'brimhat', extra: 'map', pose: 'stand' };
      if (grown) return { outfit: 'ranger', hat: skirt ? 'bandana' : 'brimhat', extra: 'spyglass', pose: 'hips' };
      return { outfit: 'explorer', hat: 'bandana', extra: 'net', pose: 'point' };
    case 'mythic': // heroes of legend: armour, capes and gold
      if (star) return { outfit: 'armour', hat: 'helm', extra: 'shield', pose: 'hips' };
      if (elder) return { outfit: 'sunrobe', hat: 'laurel', extra: 'staff', pose: 'stand' };
      if (grown) return { outfit: skirt ? 'sunrobe' : 'armour', hat: 'laurel', extra: skirt ? 'staff' : 'shield', pose: skirt ? 'cheer' : 'hips' };
      return { outfit: 'armour', hat: 'laurel', extra: 'shield', pose: 'hips' };
  }
  return {};
}

/* ── places: hand-drawn backdrops (400 × 300; the ground line sits near y 200) ── */
function rand(seed: number) { let s = (seed * 2654435761) >>> 0 || 7; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export function worldBackdrop(art: string, seed: number, id: string): string | null {
  const r = rand(seed + art.length * 97);
  switch (art) {
    case 'hillcastle': // a castle of round towers on a far hill, roses, a winding path, a peach evening sky
      return `<defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6c9c4"/><stop offset=".55" stop-color="#fbe3c9"/><stop offset="1" stop-color="#fdf1dc"/></linearGradient>
        <radialGradient id="${id}g" cx=".72" cy=".2" r=".5"><stop offset="0" stop-color="#fff6d9" stop-opacity=".9"/><stop offset="1" stop-color="#fff6d9" stop-opacity="0"/></radialGradient></defs>
        <rect width="400" height="300" fill="url(#${id}s)"/><rect width="400" height="300" fill="url(#${id}g)"/>
        ${[[60, 48], [120, 36], [300, 62]].map(([x, y]) => `<path d="M${x} ${y} q5 -5 10 0 q5 -5 10 0" stroke="#b88a8a" stroke-width="1.6" fill="none"/>`).join('')}
        <ellipse cx="280" cy="196" rx="170" ry="70" fill="#b9cf9a"/>
        <g transform="translate(262 72)">
          <rect x="0" y="40" width="64" height="58" fill="#efe2f2"/><rect x="-18" y="26" width="22" height="72" rx="3" fill="#e6d4ec"/><rect x="60" y="20" width="24" height="78" rx="3" fill="#e6d4ec"/><rect x="22" y="12" width="20" height="40" rx="3" fill="#f3e8f6"/>
          <path d="M-22 28 L-7 2 L8 28 Z" fill="#9f7bc0"/><path d="M56 22 L72 -6 L88 22 Z" fill="#9f7bc0"/><path d="M18 14 L32 -12 L46 14 Z" fill="#b58ed4"/>
          <path d="M72 -6 L72 -18 L84 -14 L72 -10" fill="#e9876b"/><path d="M32 -12 L32 -24 L44 -20 L32 -16" fill="#f2c14e"/>
          <path d="M24 98 L24 74 Q32 64 40 74 L40 98 Z" fill="#8a6aa8"/>${[[-12, 44], [66, 40], [28, 26], [8, 56], [46, 56]].map(([x, y]) => `<rect x="${x}" y="${y}" width="7" height="10" rx="3.5" fill="#fff4c9"/>`).join('')}
        </g>
        <path d="M296 172 Q250 188 236 204 Q210 230 236 300 L268 300 Q244 236 268 210 Q284 192 306 176 Z" fill="#efe0c0"/>
        <path d="M0 200 Q110 176 220 196 T400 194 V300 H0 Z" fill="#9fc27e"/>
        ${Array.from({ length: 9 }, (_, i) => { const x = i < 5 ? 14 + i * 36 : 300 + (i - 5) * 30, y = 212 + (i % 3) * 8; return `<circle cx="${x}" cy="${y}" r="14" fill="#7fae6a"/><circle cx="${x - 5}" cy="${y - 5}" r="4.5" fill="${['#f08aa6', '#f7c1cf', '#e86f8a'][i % 3]}"/><circle cx="${x + 6}" cy="${y - 2}" r="4" fill="${['#f7c1cf', '#e86f8a', '#f08aa6'][i % 3]}"/>`; }).join('')}`;
    case 'enchanted': // tall soft trees, glowing mushrooms, fireflies, a mossy path
      return `<defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#28485e"/><stop offset=".6" stop-color="#3f6f73"/><stop offset="1" stop-color="#5f8f7a"/></linearGradient>
        <radialGradient id="${id}f"><stop offset="0" stop-color="#fff7b8"/><stop offset="1" stop-color="#fff7b8" stop-opacity="0"/></radialGradient>
        <radialGradient id="${id}m"><stop offset="0" stop-color="#b8f0ff" stop-opacity=".8"/><stop offset="1" stop-color="#b8f0ff" stop-opacity="0"/></radialGradient></defs>
        <rect width="400" height="300" fill="url(#${id}s)"/>
        ${[20, 96, 300, 372].map((x, i) => `<rect x="${x - 16 + i * 2}" y="0" width="${26 + (i % 2) * 8}" height="230" rx="10" fill="${i % 2 ? '#2f4f4a' : '#36584f'}"/><path d="M${x - 40} ${40 + i * 14} Q${x} ${-10 + i * 6} ${x + 46} ${36 + i * 12} Q${x + 10} ${70 + i * 6} ${x - 40} ${40 + i * 14} Z" fill="${['#4f8a6a', '#5f9a73', '#4a7f63', '#5a946e'][i]}"/>`).join('')}
        <path d="M150 300 Q190 240 200 206 Q206 190 230 186 Q260 196 250 300 Z" fill="#9cc58f" opacity=".55"/>
        <path d="M0 214 Q100 196 200 210 T400 206 V300 H0 Z" fill="#4f7f5f"/>
        ${[[54, 230, 1], [334, 236, 1.2], [118, 254, 0.8]].map(([x, y, k]) => `<circle cx="${x}" cy="${y - 6 * k}" r="${26 * k}" fill="url(#${id}m)"/><rect x="${x - 3 * k}" y="${y - 10 * k}" width="${6 * k}" height="${14 * k}" rx="2" fill="#f3efe1"/><path d="M${x - 14 * k} ${y - 8 * k} Q${x} ${y - 30 * k} ${x + 14 * k} ${y - 8 * k} Z" fill="#7fd6e6"/><circle cx="${x - 4 * k}" cy="${y - 16 * k}" r="${2 * k}" fill="#fff"/>`).join('')}
        ${Array.from({ length: 16 }, () => { const x = 20 + r() * 360, y = 30 + r() * 170; return `<circle class="bt-firefly" cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="9" fill="url(#${id}f)"/><circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="1.8" fill="#fffbe0"/>`; }).join('')}`;
    case 'jungle': // layered leafy canopy, vines, a waterfall, river stones, misty cliffs
      return `<defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe6d6"/><stop offset="1" stop-color="#eaf6d9"/></linearGradient>
        <linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9f8ff"/><stop offset="1" stop-color="#a9dcef"/></linearGradient></defs>
        <rect width="400" height="300" fill="url(#${id}s)"/>
        <path d="M250 40 L300 30 L330 60 L332 210 L246 210 Z" fill="#9fb8a6"/><rect x="282" y="40" width="26" height="170" fill="url(#${id}w)"/>
        ${Array.from({ length: 6 }, (_, i) => `<path d="M${284 + i * 4} 50 V206" stroke="#fff" stroke-opacity=".6" stroke-width="1.4"/>`).join('')}
        <ellipse cx="295" cy="210" rx="38" ry="8" fill="#e9f8ff"/>
        <path d="M0 0 H400 V30 Q340 60 300 30 Q250 70 200 34 Q140 74 90 36 Q40 66 0 40 Z" fill="#3f8a5a"/>
        ${[[30, 70], [110, 50], [190, 64], [370, 60]].map(([x, y]) => `<path d="M${x} 0 Q${x + 6} ${y / 2} ${x - 4} ${y}" stroke="#5a8a3a" stroke-width="3" fill="none"/><ellipse cx="${x - 4}" cy="${y + 6}" rx="8" ry="4" fill="#6faa4a" transform="rotate(30 ${x - 4} ${y + 6})"/>`).join('')}
        ${[[-10, 150, 1.4, -20], [40, 170, 1, 10], [360, 160, 1.3, 200], [400, 190, 1, 160]].map(([x, y, k, a]) => `<g transform="translate(${x} ${y}) rotate(${a}) scale(${k})"><path d="M0 0 Q40 -30 90 0 Q40 18 0 0 Z" fill="#4f9a5a"/><path d="M0 0 Q45 -6 90 0" stroke="#3a7a46" stroke-width="2" fill="none"/></g>`).join('')}
        <path d="M0 206 Q120 192 240 204 T400 200 V300 H0 Z" fill="#8fbf6a"/>
        <path d="M230 300 Q260 250 288 214 L306 214 Q300 250 330 300 Z" fill="#a9dcef" opacity=".8"/>
        ${[[262, 262, 12], [300, 240, 9], [318, 276, 11]].map(([x, y, s]) => `<ellipse cx="${x}" cy="${y}" rx="${s}" ry="${s * 0.6}" fill="#a39b8c"/>`).join('')}`;
    case 'peaks': // layered blue mountains with snow, pines, a tent, a flag on the top
      return `<defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fcdef"/><stop offset="1" stop-color="#e6f3fa"/></linearGradient></defs>
        <rect width="400" height="300" fill="url(#${id}s)"/>
        <circle cx="70" cy="56" r="20" fill="#fff4c9"/>
        <path d="M-10 200 L90 70 L190 200 Z" fill="#a7bfd6"/><path d="M90 70 L112 100 L98 96 L90 108 L80 96 L68 102 Z" fill="#fff"/>
        <path d="M120 200 L250 40 L390 200 Z" fill="#8aa7c4"/><path d="M250 40 L282 82 L264 76 L250 92 L236 76 L218 82 Z" fill="#fff"/>
        <path d="M250 40 V20 L272 26 L250 32" fill="#e9876b" stroke="#6b4a32" stroke-width="1.5"/>
        <path d="M0 210 Q120 176 230 200 T400 186 V300 H0 Z" fill="#7fae7a"/>
        ${[14, 44, 336, 368, 392].map((x, i) => { const h = 50 + (i % 2) * 16, y = 206 - (i % 3) * 4; return `<path d="M${x} ${y - h} L${x + 18} ${y} L${x - 18} ${y} Z" fill="#3f7a5a"/><path d="M${x} ${y - h + 18} L${x + 22} ${y + 8} L${x - 22} ${y + 8} Z" fill="#4a8a63"/>`; }).join('')}
        <path d="M300 214 L334 168 L368 214 Z" fill="#e9876b"/><path d="M334 168 L334 214" stroke="#b8553e" stroke-width="2"/><path d="M326 214 L334 190 L342 214 Z" fill="#7a3a2a"/>`;
    case 'skytemple': // white columns on a cloud platform, sunrise rays, distant floating islands
      return `<defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7b98a"/><stop offset=".5" stop-color="#fbd9a6"/><stop offset="1" stop-color="#fdf0d6"/></linearGradient>
        <radialGradient id="${id}sun" cx=".5" cy=".42" r=".5"><stop offset="0" stop-color="#fff3c4"/><stop offset=".25" stop-color="#ffe08a" stop-opacity=".8"/><stop offset="1" stop-color="#ffe08a" stop-opacity="0"/></radialGradient></defs>
        <rect width="400" height="300" fill="url(#${id}s)"/>
        <g opacity=".35">${Array.from({ length: 12 }, (_, i) => { const a = -Math.PI + (i + 0.5) * (Math.PI / 12); return `<path d="M200 126 L${(200 + 420 * Math.cos(a - 0.05)).toFixed(0)} ${(126 + 420 * Math.sin(a - 0.05)).toFixed(0)} L${(200 + 420 * Math.cos(a + 0.05)).toFixed(0)} ${(126 + 420 * Math.sin(a + 0.05)).toFixed(0)} Z" fill="#fff4cf"/>`; }).join('')}</g>
        <circle cx="200" cy="126" r="150" fill="url(#${id}sun)"/>
        ${[[56, 92, 0.7], [344, 70, 0.9]].map(([x, y, k]) => `<g transform="translate(${x} ${y}) scale(${k})"><path d="M-30 0 L30 0 L14 26 L0 40 L-14 26 Z" fill="#b98a6a"/><path d="M-32 0 Q0 -12 32 0 Z" fill="#8fbf6a"/><path d="M8 26 V60" stroke="#bfe6f5" stroke-width="3" opacity=".8"/></g>`).join('')}
        <path d="M104 186 L296 186 L284 172 L116 172 Z" fill="#efe6d6"/><path d="M96 92 L304 92 L200 52 Z" fill="#f5eedf"/><rect x="104" y="92" width="192" height="10" fill="#e5d9c4"/>
        ${[122, 166, 214, 258].map((x) => `<rect x="${x}" y="102" width="20" height="70" fill="#fbf6ec"/><path d="M${x + 6} 104 V170 M${x + 14} 104 V170" stroke="#e5d9c4" stroke-width="1.5"/>`).join('')}
        <g fill="#ffffff">${Array.from({ length: 11 }, (_, i) => `<circle cx="${i * 40}" cy="${206 + (i % 2) * 6}" r="${34 + (i % 3) * 6}"/>`).join('')}<rect y="214" width="400" height="86"/></g>
        <g fill="#fdf0d6" opacity=".7">${Array.from({ length: 9 }, (_, i) => `<circle cx="${20 + i * 46}" cy="${246 + (i % 2) * 8}" r="${28 + (i % 2) * 6}"/>`).join('')}</g>`;
    case 'starpeak': // a twilight summit with a stone arch, constellations and a beam of light
      return `<defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f2350"/><stop offset=".6" stop-color="#4a3f7a"/><stop offset="1" stop-color="#8a6aa0"/></linearGradient>
        <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2c4" stop-opacity="0"/><stop offset="1" stop-color="#fff2c4" stop-opacity=".55"/></linearGradient></defs>
        <rect width="400" height="300" fill="url(#${id}s)"/>
        ${Array.from({ length: 40 }, () => `<circle cx="${(r() * 400).toFixed(0)}" cy="${(r() * 170).toFixed(0)}" r="${(0.6 + r() * 1.4).toFixed(1)}" fill="#fff" opacity="${(0.5 + r() * 0.5).toFixed(2)}"/>`).join('')}
        <g stroke="#cfd8ff" stroke-width="1" opacity=".6" fill="#fff"><path d="M60 50 L92 38 L120 58 L150 44 L170 70" fill="none"/>${[[60, 50], [92, 38], [120, 58], [150, 44], [170, 70]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.4"/>`).join('')}<path d="M270 40 L300 64 L332 52 L350 80" fill="none"/>${[[270, 40], [300, 64], [332, 52], [350, 80]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.4"/>`).join('')}</g>
        <path d="M170 0 L230 0 L250 210 L150 210 Z" fill="url(#${id}b)"/>
        <path d="M-20 300 L60 150 L130 196 L200 120 L270 190 L340 140 L420 300 Z" fill="#3a3466"/>
        <path d="M200 120 L214 140 L204 136 L200 146 L194 136 L186 140 Z" fill="#dcd6ff"/>
        <path d="M150 206 L150 150 Q200 108 250 150 L250 206 L232 206 L232 156 Q200 130 168 156 L168 206 Z" fill="#6a6290"/>
        <path d="M0 214 Q100 200 200 210 T400 206 V300 H0 Z" fill="#4a4278"/>
        ${Array.from({ length: 14 }, () => `<circle class="bt-firefly" cx="${(r() * 400).toFixed(0)}" cy="${(120 + r() * 100).toFixed(0)}" r="1.6" fill="#ffe6a8"/>`).join('')}`;
  }
  return null;
}

/**
 * The world's atmosphere over the finished picture: light and a little
 * movement. Fairytale: floating golden motes and a warm glow. Adventure:
 * sunbeams and drifting leaves. Mythic: god-rays and a dramatic edge.
 */
export function worldAtmosphere(world: WorldId | undefined, id: string, seed: number): string {
  const r = rand(seed + 13);
  switch (world) {
    case 'fairytale':
      return `<defs><radialGradient id="${id}fx" cx=".5" cy=".1" r=".9"><stop offset="0" stop-color="#ffe9c4" stop-opacity=".35"/><stop offset="1" stop-color="#ffe9c4" stop-opacity="0"/></radialGradient></defs><rect width="400" height="300" fill="url(#${id}fx)" pointer-events="none"/>
        ${Array.from({ length: 10 }, () => `<path class="bt-mote" d="M0 -4 Q0 0 4 0 Q0 0 0 4 Q0 0 -4 0 Q0 0 0 -4 Z" transform="translate(${(20 + r() * 360).toFixed(0)} ${(20 + r() * 220).toFixed(0)}) scale(${(0.8 + r() * 1.4).toFixed(2)})" fill="#fff4c9" opacity=".85"/>`).join('')}`;
    case 'adventure':
      return `<g pointer-events="none" opacity=".18">${[[60, 0], [150, 0], [260, 0]].map(([x]) => `<path d="M${x} 0 L${x + 40} 0 L${x + 140} 300 L${x + 80} 300 Z" fill="#fffbe0"/>`).join('')}</g>
        ${Array.from({ length: 6 }, () => `<ellipse class="bt-leaf" cx="${(20 + r() * 360).toFixed(0)}" cy="${(20 + r() * 160).toFixed(0)}" rx="5" ry="2.4" fill="#6faa4a" transform="rotate(${(r() * 180).toFixed(0)})" opacity=".8"/>`).join('')}`;
    case 'mythic':
      return `<defs><radialGradient id="${id}mx" cx=".5" cy=".45" r=".75"><stop offset=".55" stop-color="#2a1640" stop-opacity="0"/><stop offset="1" stop-color="#2a1640" stop-opacity=".35"/></radialGradient></defs>
        <g pointer-events="none" opacity=".16">${[-0.5, -0.2, 0.15, 0.45].map((a) => `<path d="M200 -40 L${(200 + 520 * Math.sin(a - 0.06)).toFixed(0)} 300 L${(200 + 520 * Math.sin(a + 0.06)).toFixed(0)} 300 Z" fill="#fff1b8"/>`).join('')}</g>
        <rect width="400" height="300" fill="url(#${id}mx)" pointer-events="none"/>
        ${Array.from({ length: 12 }, () => `<circle class="bt-mote" cx="${(r() * 400).toFixed(0)}" cy="${(r() * 280).toFixed(0)}" r="${(0.8 + r() * 1.6).toFixed(1)}" fill="#ffd56b" opacity=".8"/>`).join('')}`;
  }
  return '';
}

/** Body language for a moment in the story, by world and mood. */
export function worldPose(world: WorldId | undefined, base: Pose | undefined, mood?: string): Pose | undefined {
  if (!world || world === 'everyday') return base;
  if (mood === 'laugh' || mood === 'starry') return 'cheer';
  if (mood === 'wow') return 'point';
  if (mood === 'brave' || mood === 'proud') return world === 'fairytale' ? 'stand' : 'hips';
  return base;
}
