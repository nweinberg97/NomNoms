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
  if (mode === 'wondercut') // Sparkle: a soft, rosy glow
    return `<filter id="lk${id}" x="-6%" y="-6%" width="112%" height="112%" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceGraphic" stdDeviation="${part === 'backdrop' ? 1.4 : 2.4}" result="soft"/>
      <feComposite in="soft" in2="SourceGraphic" operator="arithmetic" k2="${part === 'backdrop' ? 0.4 : 0.2}" k3="${part === 'backdrop' ? 0.66 : 0.86}" result="glow"/>
      <feColorMatrix in="glow" type="matrix" values="1.04 0.02 0.02 0 0.012  0 1 0.02 0 0.004  0.02 0 1.02 0 0.012  0 0 0 1 0" result="rosy"/>
      <feColorMatrix in="rosy" type="saturate" values="1.08"/>
    </filter>`;
  if (mode === 'gouache') // Chibi: bright, clean toy colours with a soft bloom
    return `<filter id="lk${id}" x="-6%" y="-6%" width="112%" height="112%" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceGraphic" stdDeviation="${part === 'backdrop' ? 1 : 1.8}" result="soft"/>
      <feComposite in="soft" in2="SourceGraphic" operator="arithmetic" k2="${part === 'backdrop' ? 0.3 : 0.14}" k3="${part === 'backdrop' ? 0.74 : 0.9}" result="glow"/>
      <feColorMatrix in="glow" type="saturate" values="1.18"/>
    </filter>`;
  if (mode === 'inked') // Super Heroes: crisp, saturated colour
    return `<filter id="lk${id}" x="-4%" y="-4%" width="108%" height="108%" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="1.15"/></filter>`;
  switch (mode) {
    case 'pocketlight':
      // Movie 3D: lit like a modern animated film. The figure rounds off at its edges (lit from the
      // top left, falling into soft shade), a warm rim of light catches the far edge, colours are rich
      // and clean. The place behind is a soft, out-of-focus film set.
      if (part === 'backdrop') return `<filter id="lk${id}" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
        <feGaussianBlur in="SourceGraphic" stdDeviation="1.6" result="dof"/>
        <feColorMatrix in="dof" type="saturate" values="1.12" result="rich"/>
        <feComponentTransfer in="rich"><feFuncR type="gamma" amplitude="1.03" exponent="0.95"/><feFuncG type="gamma" amplitude="1.03" exponent="0.95"/><feFuncB type="gamma" amplitude="1.02" exponent="0.97"/></feComponentTransfer>
      </filter>`;
      return `<filter id="lk${id}" x="-10%" y="-8%" width="120%" height="116%" color-interpolation-filters="sRGB">
        <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="round"/>
        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.25 0.5 0.1 0 0" result="lum"/>
        <feGaussianBlur in="lum" stdDeviation="2" result="lumSoft"/>
        <feComposite in="round" in2="lumSoft" operator="arithmetic" k2="1" k3="0" result="bump"/>
        <feDiffuseLighting in="bump" surfaceScale="2.6" diffuseConstant="1.08" lighting-color="#fffaf2" result="diff"><feDistantLight azimuth="230" elevation="66"/></feDiffuseLighting>
        <feSpecularLighting in="bump" surfaceScale="4" specularConstant=".35" specularExponent="22" lighting-color="#fff6ea" result="spec"><feDistantLight azimuth="230" elevation="55"/></feSpecularLighting>
        <feColorMatrix in="SourceGraphic" type="saturate" values="1.12" result="rich"/>
        <feComposite in="rich" in2="diff" operator="arithmetic" k1="0.62" k2="0.42" result="lit"/>
        <feOffset in="SourceAlpha" dx="-3.2" dy="0" result="sh"/>
        <feComposite in="SourceAlpha" in2="sh" operator="out" result="edge"/>
        <feGaussianBlur in="edge" stdDeviation="1.4" result="edgeSoft"/>
        <feFlood flood-color="#fff1d8" flood-opacity=".75"/><feComposite in2="edgeSoft" operator="in" result="rim"/>
        <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn"/>
        <feComposite in="rim" in2="SourceAlpha" operator="in" result="rimIn"/>
        <feComposite in="lit" in2="SourceAlpha" operator="in" result="litIn"/>
        <feMerge><feMergeNode in="litIn"/><feMergeNode in="specIn"/><feMergeNode in="rimIn"/></feMerge>
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
      // sketchbook: a pencil drawing on white paper. The colour is a light coloured-pencil layer
      // laid in strokes (paper between them); the line is graphite, a little wobbly, gone over twice
      return `<pattern id="ht${id}" width="64" height="64" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)">
        <rect width="64" height="64" fill="#fff" filter="url(#hf${id})"/></pattern>
      <filter id="hf${id}" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.05 0.8" numOctaves="2" seed="8" stitchTiles="stitch" result="t"/>
        <feComponentTransfer in="t" result="k"><feFuncR type="linear" slope="3" intercept="-0.75"/><feFuncG type="linear" slope="3" intercept="-0.75"/><feFuncB type="linear" slope="3" intercept="-0.75"/></feComponentTransfer>
        <feColorMatrix in="k" type="matrix" values="1 0 0 0 0.15  1 0 0 0 0.15  1 0 0 0 0.15  0 0 0 0 1"/>
      </filter>
      <mask id="hm${id}" maskContentUnits="userSpaceOnUse"><rect x="-300" y="-300" width="1000" height="900" fill="url(#ht${id})"/></mask>
      <filter id="lk${id}" x="-6%" y="-6%" width="112%" height="112%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="13" result="wv"/>
        <feDisplacementMap in="SourceGraphic" in2="wv" scale="3" xChannelSelector="R" yChannelSelector="G" result="waver"/>
        <feColorMatrix in="waver" type="saturate" values="0.85" result="soft"/>
        <feComponentTransfer in="soft"><feFuncR type="linear" slope="${part === 'backdrop' ? 0.46 : 0.72}" intercept="${part === 'backdrop' ? 0.54 : 0.28}"/><feFuncG type="linear" slope="${part === 'backdrop' ? 0.46 : 0.72}" intercept="${part === 'backdrop' ? 0.53 : 0.27}"/><feFuncB type="linear" slope="${part === 'backdrop' ? 0.46 : 0.72}" intercept="${part === 'backdrop' ? 0.5 : 0.25}"/></feComponentTransfer>
      </filter>
      <filter id="ln${id}" x="-6%" y="-6%" width="112%" height="112%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="21" result="wv"/>
        <feDisplacementMap in="SourceGraphic" in2="wv" scale="2.2" xChannelSelector="R" yChannelSelector="G" result="a"/>
        <feOffset in="a" dx=".9" dy="-.6" result="b"/>
        <feComponentTransfer in="b" result="b2"><feFuncA type="linear" slope=".35"/></feComponentTransfer>
        <feMerge><feMergeNode in="b2"/><feMergeNode in="a"/></feMerge>
      </filter>
      <filter id="ed${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
        <feColorMatrix in="SourceGraphic" type="luminanceToAlpha" result="lum"/>
        <feConvolveMatrix in="lum" order="3" kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1" divisor="1" preserveAlpha="false" result="edge"/>
        <feComponentTransfer in="edge" result="edgeK"><feFuncA type="linear" slope="5" intercept="-0.12"/></feComponentTransfer>
        <feFlood flood-color="#5a534d"/><feComposite in2="edgeK" operator="in" result="lines"/>
        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="5" result="wv"/>
        <feDisplacementMap in="lines" in2="wv" scale="2.5" xChannelSelector="R" yChannelSelector="G"/>
      </filter>`;
    default:
      return '';
  }
}

/**
 * The drawing's lines alone, in graphite: every outlined shape loses its fill and its line
 * turns pencil grey; eyes (iris and pupil) stay, so faces keep their look; anything else
 * without a line is left to the colour layer.
 */
function pencilLines(svg: string): string {
  const parts = svg.split(/(<defs>[\s\S]*?<\/defs>|<clipPath[\s\S]*?<\/clipPath>|<pattern[\s\S]*?<\/pattern>|<mask[\s\S]*?<\/mask>)/);
  return parts.map((part, i) => (i % 2 === 1 ? part.replace(/\bid="[^"]+"/g, '') : part.replace(/<(path|ellipse|circle|rect|polygon|image)\b([^>]*?)(\/?)>(<\/\1>)?/g, (all, tag: string, attrs: string, close: string) => {
    if (tag === 'image') return '';
    const fill = /\bfill="([^"]+)"/.exec(attrs)?.[1] ?? '#000';
    const stroke = /\bstroke="([^"]+)"/.exec(attrs)?.[1];
    const eye = /url\(#ir/.test(fill) || /^#(120d0b|1[0-9a-f]{5}|2[0-9a-f]{5})$/i.test(fill);
    if (eye) return all;
    const filled = fill !== 'none' && !/\bfill-opacity=|\bopacity=/.test(attrs);
    if (!stroke || stroke === 'none' || /^#fff/i.test(stroke)) return filled ? `<${tag}${attrs.replace(/\bfill="[^"]*"/, 'fill="#fdfcf8"')}${close}>` : '';
    let a = attrs.replace(/\bfill="[^"]*"/, `fill="${filled ? '#fdfcf8' : 'none'}"`).replace(/\bstroke="[^"]*"/, 'stroke="#4b4540"');
    if (!/\bfill=/.test(a)) a += ' fill="#fdfcf8"';
    a = a.replace(/\bstroke-width="([\d.]+)"/, (_m, w: string) => `stroke-width="${Math.max(1.3, Math.min(2.6, parseFloat(w) * 0.85)).toFixed(2)}"`);
    return `<${tag}${a}${close}>`;
  }))).join('');
}

/** A quilt laid over the place: fabric squares (gingham, dots, stripes, plain) and stitched seams. */
function quilt(id: string): string {
  const cols = 6, rows = 5, w = 400 / cols, h = 300 / rows;
  const fab = ['gq', 'dq', 'sq', 'pq'];
  let squares = '';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const f = fab[(r * 2 + c * 3 + (r * c) % 3) % fab.length];
    const tone = (r + c) % 2 ? '#fff' : '#3a2a20';
    squares += `<rect x="${(c * w).toFixed(1)}" y="${(r * h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${tone}" fill-opacity=".06"/>`;
    if (f !== 'pq') squares += `<rect x="${(c * w).toFixed(1)}" y="${(r * h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="url(#${f}${id})"/>`;
  }
  let seams = '';
  for (let c = 1; c < cols; c++) seams += `<path d="M${(c * w).toFixed(1)} 0 V300"/>`;
  for (let r = 1; r < rows; r++) seams += `<path d="M0 ${(r * h).toFixed(1)} H400"/>`;
  return `<defs>
      <pattern id="gq${id}" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="5" height="10" fill="#fff" fill-opacity=".2"/><rect width="10" height="5" fill="#fff" fill-opacity=".2"/></pattern>
      <pattern id="dq${id}" width="11" height="11" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.7" fill="#fff" fill-opacity=".45"/><circle cx="8.5" cy="8.5" r="1.7" fill="#fff" fill-opacity=".45"/></pattern>
      <pattern id="sq${id}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(90)"><rect width="3" height="8" fill="#3a2a20" fill-opacity=".09"/></pattern>
    </defs>${squares}
    <g stroke="#3a2a20" stroke-opacity=".22" stroke-width="2.2" fill="none">${seams}</g>
    <g stroke="#fff6e6" stroke-opacity=".85" stroke-width="1.2" stroke-dasharray="3.2 2.6" stroke-linecap="round" fill="none" transform="translate(-2.4 -2.4)">${seams}</g>
    <g stroke="#fff6e6" stroke-opacity=".85" stroke-width="1.2" stroke-dasharray="3.2 2.6" stroke-linecap="round" fill="none" transform="translate(2.4 2.4)">${seams}</g>`;
}


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
  if (mode === 'wondercut' || mode === 'gouache' || mode === 'inked') {
    // Shape Toon (lit like Movie 3D), Classic Fairytale (a painted glow), Bold Hero (crisp colour)
    const open0 = /^\s*<g\b[^>]*>/.exec(markup);
    const h0 = open0 ? open0[0] : '<g>';
    let b0 = open0 ? markup.slice(open0[0].length).replace(/<\/g>\s*$/, '') : markup;
    const au: string[] = [];
    b0 = b0.replace(/<g class="bt-aura">[\s\S]*?<\/g><!--aura-->/g, (a) => { au.push(a); return ''; });
    // Super Heroes: the place gets a burst of action rays behind everyone
    const burst = mode === 'inked' && part === 'backdrop'
      ? `<g opacity=".16" pointer-events="none">${Array.from({ length: 18 }, (_, i) => { const a0 = (i / 18) * Math.PI * 2, a1 = a0 + Math.PI / 30; return `<path d="M200 150 L${(200 + 420 * Math.cos(a0)).toFixed(0)} ${(150 + 420 * Math.sin(a0)).toFixed(0)} L${(200 + 420 * Math.cos(a1)).toFixed(0)} ${(150 + 420 * Math.sin(a1)).toFixed(0)} Z" fill="#fff8d6"/>`; }).join('')}</g>`
      : '';
    return `${h0}${au.join('')}<defs>${lookFilters(mode, id, part)}</defs><g filter="url(#lk${id})">${b0}</g>${burst}</g>`;
  }
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
      if (part === 'backdrop') {
        // the place: pale pencil colour on white paper, its edges drawn in graphite
        return `${head}${defs}<rect x="-50" y="-50" width="500" height="400" fill="#fdfcf8"/><g mask="url(#hm${id})"><g filter="url(#lk${id})">${body}</g></g><g opacity=".55" filter="url(#ed${id})">${body.replace(/\bid="[^"]+"/g, '')}</g></g>`;
      }
      // colour: a light coloured-pencil layer in strokes; then the drawing in graphite on top
      // the drawing first (shapes filled with paper, so lines behind a shape stay hidden), then the
      // colour laid over it like pencil on paper (multiplied, so the line shows through)
      const colour = `<g style="mix-blend-mode:multiply" filter="url(#lk${id})"><g opacity=".3">${body}</g><g mask="url(#hm${id})">${body.replace(/\bid="[^"]+"/g, '')}</g></g>`;
      return `${head}${defs}<g filter="url(#ln${id})">${pencilLines(body)}</g>${colour}</g>`;
    }
    default:
      return markup;
  }
}
