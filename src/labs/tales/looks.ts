import type { StyleMode } from './styles';

/**
 * What each look is made of. The story world decides shapes, clothes and places;
 * the look decides the medium they're made in, so every look is clearly different
 * in every world:
 *
 *  - Tales      film animation: soft cel shading and a warm line (the default)
 *  - Plush      the Tales characters sewn from felt: soft fuzzy edges, puffed up like a
 *               stuffed toy, matte colour with a fine fibre
 *  - Retro      a mid-century print: flat inks on warm paper, a little grain, the dark
 *               ink a hair off-register
 *  - Paper cut  layered paper: flat bold colour, every piece cut out with a white
 *               edge and lifted off the page with a sharp shadow
 *  - Pencil     the Tales characters in coloured pencil: a light first layer, then
 *               diagonal strokes with paper between them, and a hand-drawn waver
 *
 * Everything here is an SVG filter or a rewrite of the finished markup. Identity
 * (skin, hair and eye colour, face shape, glasses) is never recoloured: lighting
 * and texture sit on top of the person's own colours.
 */

/** Filters for a character or a scene, ids made unique by `id`. */
export function lookFilters(mode: StyleMode, id: string, part: 'character' | 'backdrop' = 'character'): string {
  switch (mode) {
    case 'pocketlight':
      // plush: a felt toy. The edge goes soft and fuzzy, the figure puffs up like a stuffed
      // cushion (darker into the seams, lit on top), colours go matte and a fine fibre covers it all
      return `<filter id="lk${id}" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="${part === 'backdrop' ? 0.09 : 0.7}" numOctaves="2" seed="4" result="fz"/>
        <feDisplacementMap in="SourceGraphic" in2="fz" scale="${part === 'backdrop' ? 2 : 2.6}" xChannelSelector="R" yChannelSelector="G" result="fuzzy"/>
        <feColorMatrix in="fuzzy" type="matrix" values="0.86 0.08 0.02 0 0.05  0.04 0.88 0.04 0 0.045  0.02 0.06 0.86 0 0.045  0 0 0 1 0" result="matte"/>
        <feGaussianBlur in="SourceAlpha" stdDeviation="${part === 'backdrop' ? 6 : 4}" result="puff"/>
        <feDiffuseLighting in="puff" surfaceScale="${part === 'backdrop' ? 2 : 3.2}" diffuseConstant="1.08" lighting-color="#fff" result="diff"><feDistantLight azimuth="235" elevation="58"/></feDiffuseLighting>
        <feComposite in="matte" in2="diff" operator="arithmetic" k1="1.06" k4="-0.03" result="lit"/>
        <feTurbulence type="fractalNoise" baseFrequency="${part === 'backdrop' ? 0.18 : 0.55}" numOctaves="3" seed="2" result="fibreRaw"/>
        <feGaussianBlur in="fibreRaw" stdDeviation="${part === 'backdrop' ? 0.9 : 0.6}" result="fibre"/>
        <feColorMatrix in="fibre" type="matrix" values="0 0 0 0 1  0 0 0 0 0.98  0 0 0 0 0.94  0 0 ${part === 'backdrop' ? '-0.2 0 0.1' : '-0.6 0 0.31'}" result="fibreLight"/>
        <feColorMatrix in="fibre" type="matrix" values="0 0 0 0 0.25  0 0 0 0 0.18  0 0 0 0 0.14  0 0 ${part === 'backdrop' ? '0.2 0 -0.09' : '0.6 0 -0.26'}" result="fibreDark"/>
        <feMerge result="felt"><feMergeNode in="lit"/>${part === 'backdrop' ? '' : '<feMergeNode in="fibreLight"/><feMergeNode in="fibreDark"/>'}</feMerge>
        <feComposite in="felt" in2="fuzzy" operator="in"/>
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
      // pencil: coloured pencil on paper. Colour goes down in diagonal strokes with the paper
      // showing through, the line is graphite, and every edge has a hand-drawn waver
      return `<pattern id="ht${id}" width="64" height="64" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)">
        <rect width="64" height="64" fill="#fff" filter="url(#hf${id})"/></pattern>
      <filter id="hf${id}" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="${part === 'backdrop' ? '0.05 0.9' : '0.06 1.1'}" numOctaves="2" seed="8" stitchTiles="stitch" result="t"/>
        <feColorMatrix in="t" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0 1" result="w"/>
        <feComponentTransfer in="t" result="k"><feFuncR type="linear" slope="2.6" intercept="-0.55"/><feFuncG type="linear" slope="2.6" intercept="-0.55"/><feFuncB type="linear" slope="2.6" intercept="-0.55"/></feComponentTransfer>
        <feColorMatrix in="k" type="matrix" values="1 0 0 0 ${part === 'backdrop' ? 0.28 : 0.4}  1 0 0 0 ${part === 'backdrop' ? 0.28 : 0.4}  1 0 0 0 ${part === 'backdrop' ? 0.28 : 0.4}  0 0 0 0 1"/>
      </filter>
      <mask id="hm${id}" maskContentUnits="userSpaceOnUse"><rect x="-200" y="-200" width="900" height="800" fill="url(#ht${id})"/></mask>
      <filter id="lk${id}" x="-6%" y="-6%" width="112%" height="112%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="13" result="wv"/>
        <feDisplacementMap in="SourceGraphic" in2="wv" scale="2.4" xChannelSelector="R" yChannelSelector="G" result="waver"/>
        <feColorMatrix in="waver" type="saturate" values="${part === 'backdrop' ? 0.8 : 0.92}" result="soft"/>
        <feComponentTransfer in="soft"><feFuncR type="linear" slope=".9" intercept=".1"/><feFuncG type="linear" slope=".9" intercept=".1"/><feFuncB type="linear" slope=".9" intercept=".09"/></feComponentTransfer>
      </filter>`;
    default:
      return '';
  }
}

/** A sewing thread a shade darker than the felt it's sewn on. */
const thread = (hex: string) => {
  const h = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
  const n = parseInt(h.slice(1, 7), 16);
  return `#${[n >> 16, (n >> 8) & 255, n & 255].map((c) => Math.round(c * 0.62).toString(16).padStart(2, '0')).join('')}`;
};

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
    case 'pocketlight': {
      // a running stitch round every felt piece, in a thread a shade darker than the felt
      const sewn = part === 'backdrop' ? body : stroke(body, (fill, tag, attrs) => {
        const r = /\br="([\d.]+)"/.exec(attrs);
        if (tag === 'circle' && r && parseFloat(r[1]) < 7) return null;
        if (!fill.startsWith('#') || /^#(fff|ffffff|000|000000)$/i.test(fill)) return null;
        return `stroke="${thread(fill)}" stroke-width="1.4" stroke-dasharray="3 2.6" stroke-linecap="round" stroke-opacity=".9"`;
      });
      return `${head}${defs}<g filter="url(#lk${id})">${sewn}</g></g>`;
    }
    case 'gouache':
      return `${head}${defs}<g filter="url(#lk${id})">${body}</g></g>`;
    case 'wondercut':
      if (part === 'backdrop') return `${head}${defs}${body}</g>`;
      return `${head}${defs}<g filter="url(#lk${id})">${body}</g></g>`;
    case 'inked':
      // a light first layer of colour, then the pencil strokes over it with paper between them
      return `${head}${defs}<g filter="url(#lk${id})"><g opacity="${part === 'backdrop' ? 0.5 : 0.42}">${body}</g><g mask="url(#hm${id})">${body.replace(/\bid="[^"]+"/g, '')}</g></g></g>`;
    default:
      return markup;
  }
}
