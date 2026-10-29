import type { StyleMode } from './styles';

/**
 * What each look is made of. The story world decides shapes, clothes and places;
 * the look decides the medium they're made in, so every look is clearly different
 * in every world:
 *
 *  - Tales      film animation: soft cel shading and a warm line (the default)
 *  - Clay       claymation: puffy, rounded forms lit like little models, no lines,
 *               a fingerprinted surface and a soft studio light
 *  - Retro      a mid-century print: flat inks on warm paper, a little grain, the dark
 *               ink a hair off-register
 *  - Paper cut  layered paper: flat bold colour, every piece cut out with a white
 *               edge and lifted off the page with a sharp shadow
 *  - Comic ink  a comic strip: heavy black outlines, hard two-tone shadow and a
 *               halftone dot screen
 *
 * Everything here is an SVG filter or a rewrite of the finished markup. Identity
 * (skin, hair and eye colour, face shape, glasses) is never recoloured: lighting
 * and texture sit on top of the person's own colours.
 */

/** Filters for a character or a scene, ids made unique by `id`. */
export function lookFilters(mode: StyleMode, id: string, part: 'character' | 'backdrop' = 'character'): string {
  switch (mode) {
    case 'pocketlight':
      // clay: the picture's own shapes become a height map (each colour region puffs up a little,
      // the silhouette most), lit softly from the top left with a waxy sheen, plus faint thumbprint dents
      return `<filter id="lk${id}" x="-12%" y="-12%" width="124%" height="124%" color-interpolation-filters="sRGB">
        <feGaussianBlur in="SourceAlpha" stdDeviation="4.5" result="puff"/>
        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.3 0.55 0.15 0 0" result="lum"/>
        <feGaussianBlur in="lum" stdDeviation="1.8" result="lumSoft"/>
        <feComposite in="puff" in2="lumSoft" operator="arithmetic" k2="${part === 'backdrop' ? 0 : 1}" k3="${part === 'backdrop' ? 0.5 : 0.28}" result="bump"/>
        <feDiffuseLighting in="bump" surfaceScale="5.5" diffuseConstant="1.16" lighting-color="#fff" result="diff"><feDistantLight azimuth="225" elevation="62"/></feDiffuseLighting>
        <feSpecularLighting in="bump" surfaceScale="5.5" specularConstant=".5" specularExponent="16" lighting-color="#fff8ee" result="spec"><feDistantLight azimuth="225" elevation="58"/></feSpecularLighting>
        <feColorMatrix in="SourceGraphic" type="saturate" values="1.28" result="rich"/>
        <feComposite in="rich" in2="diff" operator="arithmetic" k1="1.04" k2="0" k3="0" k4="-0.02" result="lit"/>
        <feTurbulence type="fractalNoise" baseFrequency="0.22" numOctaves="2" seed="9" result="noise"/>
        <feColorMatrix in="noise" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.22 -0.08" result="dents"/>
        <feComposite in="dents" in2="SourceAlpha" operator="in" result="dentsIn"/>
        <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn"/>
        <feComposite in="lit" in2="SourceAlpha" operator="in" result="litIn"/>
        <feMerge><feMergeNode in="litIn"/><feMergeNode in="dentsIn"/><feMergeNode in="specIn"/></feMerge>
      </filter>`;
    case 'gouache':
      // retro print: flat inks on warm paper, a touch of grain, and the dark ink printed
      // a hair off-register, like a mid-century picture book
      return `<filter id="lk${id}" x="-6%" y="-6%" width="112%" height="112%" color-interpolation-filters="sRGB">
        <feColorMatrix in="SourceGraphic" type="saturate" values="0.9" result="flat"/>
        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0.16  0 0 0 0 0.12  0 0 0 0 0.12  -0.5 -0.9 -0.2 0 0.85" result="darks"/>
        <feOffset in="darks" dx="1.6" dy="1.1" result="ghost"/>
        <feComposite in="ghost" in2="SourceAlpha" operator="in" result="ghostIn"/>
        <feTurbulence type="fractalNoise" baseFrequency="${part === 'backdrop' ? 0.7 : 0.9}" numOctaves="2" seed="5" result="grain"/>
        <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0.3  0 0 0 0 0.24  0 0 0 0 0.18  0 0 0 0.22 -0.06" result="speck"/>
        <feComposite in="speck" in2="SourceAlpha" operator="in" result="speckIn"/>
        <feMerge><feMergeNode in="flat"/><feMergeNode in="ghostIn"/><feMergeNode in="speckIn"/></feMerge>
      </filter>`;
    case 'wondercut':
      // paper cut: the whole figure cut out of paper with a white edge, lifted off the page
      return `<filter id="lk${id}" x="-14%" y="-12%" width="130%" height="128%" color-interpolation-filters="sRGB">
        <feMorphology in="SourceAlpha" operator="dilate" radius="3.4" result="edge"/>
        <feFlood flood-color="#fffaf1"/><feComposite in2="edge" operator="in" result="paperEdge"/>
        <feGaussianBlur in="edge" stdDeviation="1.6" result="sb"/><feOffset in="sb" dx="3" dy="4.5" result="so"/>
        <feFlood flood-color="#3a2a22" flood-opacity=".38"/><feComposite in2="so" operator="in" result="lift"/>
        <feTurbulence type="fractalNoise" baseFrequency="1.1 0.3" numOctaves="2" seed="11" result="fibre"/>
        <feColorMatrix in="fibre" type="matrix" values="0 0 0 0 0.25  0 0 0 0 0.2  0 0 0 0 0.15  0 0 0 0.22 -0.05" result="tint"/>
        <feComposite in="tint" in2="SourceAlpha" operator="in" result="fibreIn"/>
        <feMerge><feMergeNode in="lift"/><feMergeNode in="paperEdge"/><feMergeNode in="SourceGraphic"/><feMergeNode in="fibreIn"/></feMerge>
      </filter>`;
    case 'inked':
      // comic: a heavy black contour round the figure, a hard shadow on the side away from the light
      // filled with a halftone dot screen
      return `<pattern id="ht${id}" width="4.4" height="4.4" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2.2" cy="2.2" r="1.25" fill="#1d1412"/></pattern>
      <filter id="lk${id}" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
        <feMorphology in="SourceAlpha" operator="dilate" radius="2.2" result="fat"/>
        <feFlood flood-color="#1d1412"/><feComposite in2="fat" operator="in" result="contour"/>
        <feComponentTransfer in="SourceGraphic" result="punchy"><feFuncR type="gamma" amplitude="1.04" exponent="1.08"/><feFuncG type="gamma" amplitude="1.04" exponent="1.08"/><feFuncB type="gamma" amplitude="1.04" exponent="1.08"/></feComponentTransfer>
        <feMerge><feMergeNode in="contour"/><feMergeNode in="punchy"/></feMerge>
      </filter>
      <filter id="sh${id}" x="-10%" y="-10%" width="120%" height="120%">
        <feOffset in="SourceAlpha" dx="-7" dy="-5" result="lit"/>
        <feComposite in="SourceAlpha" in2="lit" operator="out" result="far"/>
        <feComponentTransfer in="far" result="hard"><feFuncA type="discrete" tableValues="0 1"/></feComponentTransfer>
        <feFlood flood-color="#fff"/><feComposite in2="hard" operator="in"/>
      </filter>`;
    default:
      return '';
  }
}

const INK = '#1d1412';

/** Every filled shape (outside defs and clip paths) gets a stroke from `strokeFor`. */
function stroke(svg: string, attrsFor: (fill: string, tag: string, attrs: string) => string | null): string {
  const parts = svg.split(/(<defs>[\s\S]*?<\/defs>|<clipPath[\s\S]*?<\/clipPath>|<pattern[\s\S]*?<\/pattern>|<g class="bt-aura">[\s\S]*?<\/g><!--aura-->)/);
  return parts.map((part, i) => (i % 2 === 1 ? part : part.replace(/<(path|ellipse|circle|rect|polygon)\b([^>]*?)(\/?)>/g, (all, tag: string, attrs: string, close: string) => {
    if (/\b(stroke|opacity|fill-opacity|filter)=/.test(attrs)) return all;
    const fill = /\bfill="([^"]+)"/.exec(attrs)?.[1];
    if (!fill || fill === 'none' || /url\(#(ir|bl|gl|au|ag)/.test(fill)) return all;
    const r = /\br="([\d.]+)"/.exec(attrs);
    if (tag === 'circle' && r && parseFloat(r[1]) < 3) return all;
    const extra = attrsFor(fill, tag, attrs);
    return extra ? `<${tag}${attrs} ${extra}${close}>` : all;
  }))).join('');
}

/**
 * Finish a character (or a scene's backdrop) in a look. `markup` is a single
 * element (`<g …>…</g>`); the treatment wraps its contents.
 */
export function finishInLook(markup: string, mode: StyleMode, id: string, part: 'character' | 'backdrop' = 'character'): string {
  if (mode === 'tales') return markup;
  const open = /^\s*<g\b[^>]*>/.exec(markup);
  let head = open ? open[0] : '<g>';
  let body = open ? markup.slice(open[0].length).replace(/<\/g>\s*$/, '') : markup;
  // a world's glow round a character is light, not a thing made of clay or paint: it stays as it is
  const auras: string[] = [];
  body = body.replace(/<g class="bt-aura">[\s\S]*?<\/g><!--aura-->/g, (a) => { auras.push(a); return ''; });
  const head0 = head;
  head = `${head0}${auras.join('')}`;
  const defs = `<defs>${lookFilters(mode, id, part)}</defs>`;
  switch (mode) {
    case 'pocketlight':
      return `${head}${defs}<g filter="url(#lk${id})">${body}</g></g>`;
    case 'gouache':
      return `${head}${defs}<g filter="url(#lk${id})">${body}</g></g>`;
    case 'wondercut':
      if (part === 'backdrop') return `${head}${defs}${body}</g>`;
      return `${head}${defs}<g filter="url(#lk${id})">${body}</g></g>`;
    case 'inked': {
      const lined = stroke(body, (fill) => (/^#fff(fff)?$/i.test(fill) ? `stroke="${INK}" stroke-width="1.6" stroke-linejoin="round" paint-order="stroke"` : `stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" paint-order="stroke"`));
      if (part === 'backdrop') return `${head}${defs}${lined}</g>`;
      // halftone shadow: the dot screen, cut to the far side of the figure
      return `${head}${defs}<g filter="url(#lk${id})">${lined}</g><mask id="hm${id}"><g filter="url(#sh${id})">${body.replace(/<clipPath[\s\S]*?<\/clipPath>/g, '')}</g></mask><rect x="-40" y="-60" width="300" height="340" fill="url(#ht${id})" opacity=".32" mask="url(#hm${id})"/></g>`;
    }
    default:
      return markup;
  }
}
