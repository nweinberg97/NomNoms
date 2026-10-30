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
  fairytale: { id: 'fairytale', name: 'Classic Fairytale', feeling: 'Drawn like a vintage storybook film', blurb: 'Slender, graceful characters with delicate faces, fine ink lines and painted colour; a hilltop castle and an enchanted wood.', places: ['hillcastle', 'enchanted'], story: 'fairytale' },
  adventure: { id: 'adventure', name: 'Adventure Story', feeling: 'Drawn like a modern 3D adventure film', blurb: 'Sturdy, expressive characters with big glossy eyes and rich 3D shading; a jungle trail and a mountain pass.', places: ['jungle', 'peaks'], story: 'expedition' },
  ocean: { id: 'ocean', name: 'Under the Sea', feeling: 'Shimmering, like an undersea musical', blurb: 'A kingdom of coral and pearls, kelp forests and a sunken ship, with sea light rippling over everyone.', places: ['reef', 'kelp'], story: 'pearl' },
  space: { id: 'space', name: 'Starlight Voyage', feeling: 'Glowing, like a space adventure at night', blurb: 'Astronaut suits, a rocket on the moon with the Earth rising, and a ringed planet in a rainbow nebula.', places: ['moon', 'rings'], story: 'comet' },
  mythic: { id: 'mythic', name: 'Mythic Hero', feeling: 'Drawn bold and graphic, like an epic', blurb: 'Tall heroic characters with strong angular faces, bold lines and dramatic light; a temple in the clouds and a starlit summit.', places: ['skytemple', 'starpeak'], story: 'legend' },
};
export const WORLD_IDS: WorldId[] = ['everyday', 'fairytale', 'adventure', 'ocean', 'space', 'mythic'];

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
  // each world's mood: wide-eyed wonder, a big grin, a determined look
  const expression = world === 'fairytale' || world === 'ocean' ? (grown || elder ? 'smile' : 'starry') : world === 'space' ? (grown || elder ? 'grin' : 'wow') : world === 'adventure' ? 'grin' : look.kind === 'baby' ? 'grin' : 'smile';
  return { ...c, expression, ...(accent ? { accent } : {}) } as Partial<Look>;
}
/** A steady pick from a few options, by who someone is, so siblings and friends don't come out as clones. */
function variant(look: Look, n: number): number {
  const key = `${look.hairStyle}|${look.skin}|${look.hair}|${look.outfit}`;
  let h = 7; for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % n;
}
function costumeFor(world: WorldId, star: boolean, skirt: boolean, elder: boolean, grown: boolean, look: Look, glasses: string): Partial<Look> {
  const v = variant(look, 3);
  switch (world) {
    case 'fairytale': // the royal family of a storybook kingdom
      if (star) return { outfit: skirt ? 'gown' : 'ftunic', hat: look.kind === 'baby' ? 'crown' : skirt ? 'tiara' : 'crown', extra: 'lantern', glasses, pose: 'wave' };
      if (elder) return { outfit: 'cloak', hat: skirt ? 'tiara' : 'none', extra: 'staff', glasses };
      if (grown) return { outfit: skirt ? 'gown' : 'ftunic', hat: skirt ? 'tiara' : 'crown', extra: 'none', glasses, pose: 'wave' };
      return [{ outfit: skirt ? 'gown' : 'cloak', hat: 'circlet', extra: 'wand', glasses, pose: 'wave' as Pose }, { outfit: skirt ? 'gown' : 'ftunic', hat: skirt ? 'tiara' : 'crown', extra: 'lantern', glasses, pose: 'stand' as Pose }, { outfit: skirt ? 'fairy' : 'cloak', hat: 'flowers', extra: 'flower', glasses, pose: 'hips' as Pose }][v];
    case 'adventure': // an expedition team: hats, packs and kit
      if (star) return { outfit: 'explorer', hat: 'brimhat', extra: 'map', pose: 'point' };
      if (elder) return { outfit: 'ranger', hat: 'brimhat', extra: 'map', pose: 'stand' };
      if (grown) return [{ outfit: 'ranger', hat: skirt ? 'bandana' : 'brimhat', extra: 'spyglass', pose: 'hips' as Pose }, { outfit: 'explorer', hat: 'brimhat', extra: 'map', pose: 'point' as Pose }, { outfit: 'puffer', hat: 'beanie', extra: 'spyglass', pose: 'hips' as Pose }][v];
      return [{ outfit: 'explorer', hat: 'bandana', extra: 'net', pose: 'point' as Pose }, { outfit: 'explorer', hat: 'brimhat', extra: 'spyglass', pose: 'hips' as Pose }, { outfit: 'ranger', hat: 'capback', extra: 'map', pose: 'cheer' as Pose }][v];
    case 'ocean': // the sea kingdom: sailors and sea royalty, flower-and-shell crowns
      if (star) return { outfit: skirt ? 'fairy' : 'sailor', hat: look.kind === 'baby' ? 'crown' : 'flowers', extra: 'none', glasses, pose: 'wave' };
      if (elder) return { outfit: 'sunrobe', hat: 'crown', extra: 'staff', glasses };
      if (grown) return { outfit: skirt ? 'gown' : 'sailor', hat: skirt ? 'tiara' : 'none', extra: 'none', glasses, pose: 'wave' };
      return [{ outfit: 'sailor', hat: 'flowers', extra: 'none', glasses, pose: 'cheer' as Pose }, { outfit: skirt ? 'fairy' : 'sailor', hat: 'circlet', extra: 'none', glasses, pose: 'wave' as Pose }, { outfit: skirt ? 'gown' : 'sailor', hat: 'tiara', extra: 'none', glasses, pose: 'hips' as Pose }][v];
    case 'space': // a crew of astronauts (the helmet is a clear bubble, so faces show)
      if (star) return { outfit: 'astronaut', hat: 'none', extra: 'none', pose: 'cheer' };
      if (elder) return { outfit: 'astronaut', hat: 'none', extra: 'none', glasses, pose: 'stand' };
      if (grown) return { outfit: 'astronaut', hat: 'none', extra: 'none', glasses, pose: v === 1 ? 'point' : 'wave' };
      return { outfit: 'astronaut', hat: 'none', extra: 'none', glasses, pose: (['point', 'cheer', 'hips'] as Pose[])[v] };
    case 'mythic': // heroes of legend: armour, capes and gold
      if (star) return { outfit: 'armour', hat: 'helm', extra: 'shield', pose: 'hips' };
      if (elder) return { outfit: 'sunrobe', hat: 'laurel', extra: 'staff', pose: 'stand' };
      if (grown) return { outfit: skirt ? 'sunrobe' : 'armour', hat: 'laurel', extra: skirt ? 'staff' : 'shield', pose: skirt ? 'cheer' : 'hips' };
      return [{ outfit: 'armour', hat: 'laurel', extra: 'shield', pose: 'hips' as Pose }, { outfit: 'armour', hat: 'helm', extra: 'staff', pose: 'cheer' as Pose }, { outfit: 'sunrobe', hat: 'laurel', extra: 'staff', pose: 'point' as Pose }][v];
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
    case 'reef': // the coral kingdom: rippling sea light, coral towers, a shell palace, fish and bubbles
      return `<defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a8fb0"/><stop offset=".6" stop-color="#4fc0cf"/><stop offset="1" stop-color="#8fe0d8"/></linearGradient>
        <linearGradient id="${id}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".55"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient></defs>
        <rect width="400" height="300" fill="url(#${id}s)"/>
        <g opacity=".5">${[40, 120, 210, 300].map((x, i) => `<path d="M${x} 0 L${x + 34} 0 L${x + 70 + i * 6} 220 L${x + 20 + i * 6} 220 Z" fill="url(#${id}r)"/>`).join('')}</g>
        <path d="M0 30 Q50 20 100 30 T200 30 T300 30 T400 30" stroke="#d9fbff" stroke-width="2" fill="none" opacity=".5"/>
        <g transform="translate(250 70)">
          <path d="M0 120 L0 40 Q0 14 26 10 Q30 -18 52 -22 Q74 -18 78 10 Q104 14 104 40 L104 120 Z" fill="#f5d6e4"/>
          <path d="M26 10 Q52 -40 78 10 Q52 -6 26 10 Z" fill="#f2b8cf"/><path d="M40 120 L40 82 Q52 66 64 82 L64 120 Z" fill="#b36b8f"/>
          ${[[14, 48], [76, 48], [45, 30]].map(([x, y]) => `<ellipse cx="${x + 6}" cy="${y + 8}" rx="6" ry="8" fill="#fff4e0"/>`).join('')}
          <circle cx="52" cy="-26" r="7" fill="#fdf6ff" stroke="#e7c6dd" stroke-width="2"/>
        </g>
        <path d="M0 214 Q100 198 200 210 T400 206 V300 H0 Z" fill="#efdcae"/>
        ${[[34, 210, '#f07a6a'], [92, 222, '#f2a65a'], [170, 216, '#d86ab0'], [372, 214, '#f07a6a'], [334, 230, '#f2c14e']].map(([x, y, c], i) => `<g transform="translate(${x} ${y})">${[-1, 0, 1].map((k) => `<path d="M0 0 Q${(k as number) * 12} -24 ${(k as number) * 18} ${-40 - (i % 2) * 10}" stroke="${c}" stroke-width="${7 - Math.abs(k as number) * 2}" fill="none" stroke-linecap="round"/>`).join('')}</g>`).join('')}
        ${[[130, 236], [228, 252], [300, 270]].map(([x, y]) => `<path d="M${x} ${y} q8 -10 16 0 q-8 6 -16 0 Z" fill="#fde6c4"/><path d="M${x + 2} ${y} l14 0" stroke="#e8c79a" stroke-width="1"/>`).join('')}
        ${[[60, 90, '#f2c14e', 1], [150, 60, '#f07a6a', -1], [100, 140, '#7fd3ff', 1], [210, 110, '#ffd36b', -1]].map(([x, y, c, d]) => `<g transform="translate(${x} ${y}) scale(${d} 1)"><ellipse rx="11" ry="6.5" fill="${c}"/><path d="M-10 0 L-19 -7 L-19 7 Z" fill="${c}"/><circle cx="5" cy="-1.5" r="1.6" fill="#1d2a33"/><path d="M-2 -6 Q1 0 -2 6" stroke="#fff" stroke-width="1.6" fill="none" opacity=".7"/></g>`).join('')}
        ${Array.from({ length: 14 }, () => { const x = 10 + r() * 380, y = 20 + r() * 180, s = 2 + r() * 4; return `<circle class="bt-firefly" cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${s.toFixed(1)}" fill="#e8fbff" fill-opacity=".3" stroke="#fff" stroke-width="1" stroke-opacity=".8"/>`; }).join('')}`;
    case 'kelp': // a kelp forest in deep blue, a sunken ship, a treasure chest, a curious turtle
      return `<defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14506e"/><stop offset=".7" stop-color="#2a7f8f"/><stop offset="1" stop-color="#4f9f96"/></linearGradient></defs>
        <rect width="400" height="300" fill="url(#${id}s)"/>
        <g opacity=".22">${[70, 190, 320].map((x) => `<path d="M${x} 0 L${x + 30} 0 L${x + 60} 220 L${x + 20} 220 Z" fill="#dff8ff"/>`).join('')}</g>
        <g transform="translate(220 120) rotate(-8)"><path d="M0 60 L150 60 L130 100 L20 100 Z" fill="#6b4a3a"/><path d="M10 60 L140 60" stroke="#4a3228" stroke-width="3"/><rect x="62" y="-10" width="7" height="72" fill="#5a3e30"/><path d="M69 -6 L110 20 L69 40 Z" fill="#cfc2a8" opacity=".8"/>${[30, 60, 90, 118].map((x) => `<circle cx="${x}" cy="78" r="5" fill="#2c4a52"/>`).join('')}</g>
        ${[18, 58, 112, 352, 384].map((x, i) => `<path d="M${x} 300 C${x - 18} ${240 - i * 6} ${x + 18} ${170 - i * 8} ${x - 6} ${70 + (i % 2) * 30}" stroke="${i % 2 ? '#3f8a52' : '#4f9a5a'}" stroke-width="9" fill="none" stroke-linecap="round"/>${[0, 1, 2, 3].map((k) => `<ellipse cx="${x + (k % 2 ? 10 : -10)}" cy="${250 - k * 46}" rx="11" ry="5" fill="#5aaa62" transform="rotate(${k % 2 ? 30 : -30} ${x + (k % 2 ? 10 : -10)} ${250 - k * 46})"/>`).join('')}`).join('')}
        <path d="M0 216 Q100 204 200 214 T400 210 V300 H0 Z" fill="#c9b98a"/>
        <g transform="translate(150 214)"><rect x="0" y="0" width="40" height="24" rx="3" fill="#8a5a32"/><path d="M0 6 Q20 -14 40 6 Z" fill="#a8703e"/><rect x="17" y="6" width="6" height="8" fill="#f2c14e"/><circle cx="8" cy="-2" r="3" fill="#f6e6a8"/><circle cx="30" cy="-3" r="2.5" fill="#fff4c9"/></g>
        <g transform="translate(96 96)"><ellipse rx="24" ry="16" fill="#6f9a5a"/><path d="M-14 -8 L0 -14 L14 -8 L10 6 L-10 6 Z" fill="#8fbf6a" opacity=".7"/><ellipse cx="28" cy="-2" rx="9" ry="7" fill="#a9c98a"/><circle cx="31" cy="-4" r="1.6" fill="#1d2a33"/>${[[-18, 14], [16, 14], [-20, -10], [16, -12]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="8" ry="4" fill="#a9c98a" transform="rotate(${x < 0 ? -30 : 30} ${x} ${y})"/>`).join('')}</g>
        ${Array.from({ length: 12 }, () => { const x = 10 + r() * 380, y = 20 + r() * 190, s = 1.6 + r() * 3.4; return `<circle class="bt-firefly" cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${s.toFixed(1)}" fill="#e8fbff" fill-opacity=".25" stroke="#fff" stroke-width="1" stroke-opacity=".7"/>`; }).join('')}`;
    case 'moon': // the moon's surface, craters, a little rocket, the Earth rising
      return `<defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f1638"/><stop offset="1" stop-color="#2f2a63"/></linearGradient>
        <radialGradient id="${id}e" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#7fc9f0"/><stop offset="1" stop-color="#2f6fb0"/></radialGradient></defs>
        <rect width="400" height="300" fill="url(#${id}s)"/>
        ${Array.from({ length: 50 }, () => `<circle cx="${(r() * 400).toFixed(0)}" cy="${(r() * 190).toFixed(0)}" r="${(0.5 + r() * 1.3).toFixed(1)}" fill="#fff" opacity="${(0.4 + r() * 0.6).toFixed(2)}"/>`).join('')}
        <circle cx="300" cy="74" r="40" fill="url(#${id}e)"/><path d="M276 56 Q290 46 300 58 Q296 72 282 70 Z M306 84 Q322 78 330 92 Q318 104 306 96 Z" fill="#6fbf72"/><circle cx="300" cy="74" r="44" fill="none" stroke="#9fd8ff" stroke-width="4" opacity=".25"/>
        <g transform="translate(70 104)"><path d="M20 0 Q40 26 40 70 L0 70 Q0 26 20 0 Z" fill="#f1f1f4"/><circle cx="20" cy="36" r="9" fill="#7fc9f0" stroke="#c9d3dc" stroke-width="3"/><path d="M0 50 L-14 80 L0 72 Z M40 50 L54 80 L40 72 Z" fill="#e86f5b"/><path d="M8 70 L32 70 L26 84 L14 84 Z" fill="#c9d3dc"/><path d="M14 84 Q20 106 26 84 Z" fill="#ffc35a"/></g>
        <path d="M-10 214 Q100 192 210 206 T410 200 V300 H-10 Z" fill="#c9c6d6"/>
        ${[[60, 240, 22], [180, 262, 14], [320, 236, 26], [250, 284, 10]].map(([x, y, w]) => `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${(w as number) * 0.32}" fill="#a9a6bb"/><ellipse cx="${x}" cy="${(y as number) + 2}" rx="${(w as number) * 0.8}" ry="${(w as number) * 0.22}" fill="#bdb9cc"/>`).join('')}
        <path d="M232 206 V170 L258 178 L232 186" fill="#f2c14e" stroke="#9c9aa8" stroke-width="2"/>`;
    case 'rings': // a ringed planet in a rainbow nebula, floating crystals, a shooting star
      return `<defs><linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b1446"/><stop offset=".55" stop-color="#3b2470"/><stop offset="1" stop-color="#14204a"/></linearGradient>
        <radialGradient id="${id}n1"><stop offset="0" stop-color="#ff8fc8" stop-opacity=".6"/><stop offset="1" stop-color="#ff8fc8" stop-opacity="0"/></radialGradient>
        <radialGradient id="${id}n2"><stop offset="0" stop-color="#7fe0ff" stop-opacity=".5"/><stop offset="1" stop-color="#7fe0ff" stop-opacity="0"/></radialGradient>
        <radialGradient id="${id}p" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffd9a0"/><stop offset="1" stop-color="#e88a5a"/></radialGradient></defs>
        <rect width="400" height="300" fill="url(#${id}s)"/>
        <ellipse cx="110" cy="90" rx="150" ry="90" fill="url(#${id}n1)"/><ellipse cx="300" cy="150" rx="160" ry="100" fill="url(#${id}n2)"/>
        ${Array.from({ length: 46 }, () => `<circle cx="${(r() * 400).toFixed(0)}" cy="${(r() * 200).toFixed(0)}" r="${(0.5 + r() * 1.3).toFixed(1)}" fill="#fff" opacity="${(0.4 + r() * 0.6).toFixed(2)}"/>`).join('')}
        <g transform="translate(270 82) rotate(-14)"><ellipse rx="78" ry="16" fill="none" stroke="#f6d7a8" stroke-width="7" opacity=".9"/><circle r="42" fill="url(#${id}p)"/><path d="M-40 -8 Q0 -2 40 -8 M-38 10 Q0 16 38 10" stroke="#f6b98a" stroke-width="4" fill="none"/><path d="M-78 0 A78 16 0 0 0 78 0" fill="none" stroke="#f6d7a8" stroke-width="7"/></g>
        <circle cx="80" cy="60" r="12" fill="#b9a6ff"/><circle cx="76" cy="56" r="3" fill="#d9ceff"/>
        <path d="M40 30 L120 10" stroke="#fff6d0" stroke-width="2" stroke-linecap="round" opacity=".8"/><circle cx="120" cy="10" r="3" fill="#fff6d0"/>
        <path d="M-10 222 Q100 204 200 214 T410 208 V300 H-10 Z" fill="#5a4a8a"/>
        ${[[50, 222, '#b9a6ff'], [150, 236, '#7fe0ff'], [350, 226, '#ff8fc8']].map(([x, y, c]) => `<path d="M${x} ${y} l8 -26 l8 26 Z" fill="${c}" opacity=".85"/><path d="M${(x as number) + 10} ${y} l6 -16 l6 16 Z" fill="${c}" opacity=".65"/>`).join('')}
        ${Array.from({ length: 10 }, () => `<circle class="bt-firefly" cx="${(r() * 400).toFixed(0)}" cy="${(30 + r() * 170).toFixed(0)}" r="1.8" fill="#fff6d0"/>`).join('')}`;
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
    case 'ocean': // sea light rippling down, a drift of bubbles
      return `<g pointer-events="none" opacity=".16">${[50, 170, 290].map((x) => `<path d="M${x} -10 L${x + 50} -10 L${x + 110} 300 L${x + 40} 300 Z" fill="#e9fdff"/>`).join('')}</g>
        <rect width="400" height="300" fill="#0f5a78" opacity=".08" pointer-events="none"/>
        ${Array.from({ length: 12 }, () => `<circle class="bt-mote" cx="${(r() * 400).toFixed(0)}" cy="${(r() * 280).toFixed(0)}" r="${(1.5 + r() * 2.5).toFixed(1)}" fill="none" stroke="#ffffff" stroke-width="1" opacity=".7"/>`).join('')}`;
    case 'space': // a deep night vignette and twinkling stars
      return `<defs><radialGradient id="${id}sx" cx=".5" cy=".45" r=".75"><stop offset=".6" stop-color="#0b0f2a" stop-opacity="0"/><stop offset="1" stop-color="#0b0f2a" stop-opacity=".35"/></radialGradient></defs>
        <rect width="400" height="300" fill="url(#${id}sx)" pointer-events="none"/>
        ${Array.from({ length: 10 }, () => `<path class="bt-mote" d="M0 -4 Q0 0 4 0 Q0 0 0 4 Q0 0 -4 0 Q0 0 0 -4 Z" transform="translate(${(20 + r() * 360).toFixed(0)} ${(10 + r() * 170).toFixed(0)}) scale(${(0.6 + r() * 1.2).toFixed(2)})" fill="#fff6d0" opacity=".9"/>`).join('')}`;
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
