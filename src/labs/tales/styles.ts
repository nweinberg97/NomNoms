/**
 * Baby Tales illustration modes.
 *
 * A mode changes how everything is drawn (shapes, shading, lines, texture,
 * light, shadows, backgrounds and photo assets), never who is drawn: a
 * character's DNA (skin, hair, face, glasses…) is identical in every mode.
 * Each mode is an explicit configuration, read by the character renderer, the
 * scene renderer and the photo-asset renderer.
 */

export type StyleMode = 'pocketlight' | 'gouache' | 'wondercut' | 'inked' | 'tales';
/** Looks that share the soft, lit storybook backgrounds. */
export const softLook = (m: StyleMode) => m === 'pocketlight' || m === 'tales';

export interface StyleConfig {
  id: StyleMode;
  name: string;
  blurb: string;
  /** Colours a mode pulls photo assets toward, and its ink / shadow tones. */
  palette: { swatches: string[]; ink: string; shadow: string; paper: string; light: string };
  /** How much photo-asset colours are pulled toward the swatches (0–1), and saturation / brightness shifts. */
  colour: { pull: number; saturation: number; brightness: number; warmth: number };
  /** Character surfaces: how skin, hair and cloth are filled. */
  materials: { shading: 'soft-volume' | 'painted' | 'flat' | 'cel'; contrast: number; gloss: number };
  outline: { kind: 'none' | 'soft-rim' | 'ink'; width: number; darken: number };
  texture: { kind: 'none' | 'brush' | 'paper' | 'grain'; intensity: number };
  lighting: { key: 'top-left' | 'top'; rim: number; vignette: number; bloom: number };
  shadow: { kind: 'contact' | 'soft' | 'cut-layer' | 'cel'; opacity: number; offset: [number, number]; blur: number };
  background: { treatment: 'soft-depth' | 'painterly' | 'paper-layers' | 'painted-soft'; blur: number; displacement: number };
  /** Photo assets: how many colours they keep, smoothing radius, edge treatment. */
  asset: { colours: number; smoothing: number; edges: 'none' | 'wet-edge' | 'paper-cut' | 'ink'; simplify: number };
}

export const STYLE_MODES: StyleMode[] = ['tales', 'pocketlight', 'gouache', 'wondercut', 'inked'];

export const STYLES: Record<StyleMode, StyleConfig> = {
  tales: {
    id: 'tales',
    name: 'Tales',
    blurb: 'Clean, hand-drawn animation with a soft NomNoms glow',
    palette: { swatches: ['#f6c9a8', '#e8907a', '#f2c14e', '#8fbf9f', '#7fa8d1', '#b9a5e3', '#fbf3e6', '#4a2e24'], ink: '#4a2e24', shadow: '#5a3f3a', paper: '#fbf7f0', light: '#fff1d6' },
    colour: { pull: 0.15, saturation: 1.05, brightness: 1.03, warmth: 0.06 },
    materials: { shading: 'cel', contrast: 1, gloss: 0.3 },
    outline: { kind: 'ink', width: 1.9, darken: 0.5 },
    texture: { kind: 'none', intensity: 0 },
    lighting: { key: 'top-left', rim: 0.2, vignette: 0.16, bloom: 0.2 },
    shadow: { kind: 'contact', opacity: 0.16, offset: [0, 2], blur: 3 },
    background: { treatment: 'soft-depth', blur: 0.4, displacement: 0 },
    asset: { colours: 14, smoothing: 3, edges: 'none', simplify: 1 },
  },
  pocketlight: {
    id: 'pocketlight',
    name: 'Clay',
    blurb: 'Little models made of soft clay, lit like a stop-motion film',
    palette: { swatches: ['#f6c9a8', '#e8907a', '#f2c14e', '#8fbf9f', '#7fa8d1', '#b9a5e3', '#fbf3e6', '#5a4a42'], ink: '#4a3a33', shadow: '#5a3f3a', paper: '#fbf7f0', light: '#fff1d6' },
    colour: { pull: 0.15, saturation: 1.05, brightness: 1.04, warmth: 0.06 },
    materials: { shading: 'soft-volume', contrast: 1, gloss: 1 },
    outline: { kind: 'soft-rim', width: 0, darken: 0 },
    texture: { kind: 'none', intensity: 0 },
    lighting: { key: 'top-left', rim: 0.35, vignette: 0.18, bloom: 0.2 },
    shadow: { kind: 'contact', opacity: 0.16, offset: [0, 2], blur: 3 },
    background: { treatment: 'soft-depth', blur: 0.4, displacement: 0 },
    asset: { colours: 14, smoothing: 3, edges: 'none', simplify: 1 },
  },
  gouache: {
    id: 'gouache',
    name: 'Watercolour',
    blurb: 'Loose washes of paint and a pencil line, like a classic picture book',
    palette: { swatches: ['#e9b38c', '#d9776b', '#e8b64a', '#7fae7a', '#6f97b8', '#a48fc4', '#f4ead8', '#4f4038'], ink: '#4f4038', shadow: '#6b5446', paper: '#f4ecdf', light: '#fff4dd' },
    colour: { pull: 0.3, saturation: 0.88, brightness: 1.02, warmth: 0.08 },
    materials: { shading: 'painted', contrast: 0.45, gloss: 0 },
    outline: { kind: 'none', width: 0, darken: 0 },
    texture: { kind: 'brush', intensity: 0.5 },
    lighting: { key: 'top-left', rim: 0, vignette: 0.12, bloom: 0 },
    shadow: { kind: 'soft', opacity: 0.12, offset: [0, 2], blur: 4 },
    background: { treatment: 'painterly', blur: 0, displacement: 2.6 },
    asset: { colours: 10, smoothing: 4, edges: 'wet-edge', simplify: 2 },
  },
  wondercut: {
    id: 'wondercut',
    name: 'Paper cut',
    blurb: 'Bold shapes cut from coloured paper and layered up',
    palette: { swatches: ['#f2b896', '#e66a52', '#f4c23c', '#5fa36a', '#4f86c6', '#9a7ad1', '#fbf6ec', '#3a3330'], ink: '#3a3330', shadow: '#3a2a22', paper: '#f7f0e2', light: '#fffaf0' },
    colour: { pull: 0.45, saturation: 1.12, brightness: 1.02, warmth: 0.02 },
    materials: { shading: 'flat', contrast: 0, gloss: 0 },
    outline: { kind: 'none', width: 0, darken: 0 },
    texture: { kind: 'paper', intensity: 0.5 },
    lighting: { key: 'top', rim: 0, vignette: 0, bloom: 0 },
    shadow: { kind: 'cut-layer', opacity: 0.34, offset: [1.8, 2.6], blur: 0.9 },
    background: { treatment: 'paper-layers', blur: 0, displacement: 0 },
    asset: { colours: 6, smoothing: 4, edges: 'paper-cut', simplify: 4 },
  },
  inked: {
    id: 'inked',
    name: 'Comic',
    blurb: 'Bold black ink and halftone dots, like a Sunday comic strip',
    palette: { swatches: ['#f0c39e', '#d9654f', '#efb94a', '#6aa36b', '#5b8fc9', '#8e6bb8', '#fbf5ea', '#3b2a26'], ink: '#3b2a26', shadow: '#5d4250', paper: '#fbf5ea', light: '#fff4dc' },
    colour: { pull: 0.2, saturation: 1.08, brightness: 1, warmth: 0.04 },
    materials: { shading: 'cel', contrast: 1, gloss: 0.4 },
    outline: { kind: 'ink', width: 3.2, darken: 0.55 },
    texture: { kind: 'none', intensity: 0 },
    lighting: { key: 'top-left', rim: 0, vignette: 0.08, bloom: 0 },
    shadow: { kind: 'cel', opacity: 0.22, offset: [0, 2], blur: 0 },
    background: { treatment: 'painted-soft', blur: 0.6, displacement: 0 },
    asset: { colours: 10, smoothing: 3, edges: 'ink', simplify: 2 },
  },
};

/* ── shared colour helpers ───────────────────────────────── */
export const hexToRgb = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
};
export const rgbToHex = (c: number[]) => `#${c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
export const darken = (hex: string, k: number) => rgbToHex(hexToRgb(hex).map((v) => v * (1 - k)));

/**
 * SVG filters a mode needs, with ids made unique by `id` so several pictures
 * on one page never share (or fight over) a filter.
 */
export function styleFilters(mode: StyleMode, id: string): string {
  const s = STYLES[mode];
  const sh = s.shadow;
  switch (mode) {
    case 'gouache':
      // per shape: wobbly painted edge + a darker "wet edge" where the paint pooled
      return `<filter id="pnt${id}" x="-8%" y="-8%" width="116%" height="116%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="7" result="warp"/>
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="${s.background.displacement + 1.4}" xChannelSelector="R" yChannelSelector="G" result="wobbly"/>
          <feMorphology in="wobbly" operator="erode" radius="1.3" result="inner"/>
          <feComposite in="wobbly" in2="inner" operator="out" result="rim"/>
          <feGaussianBlur in="rim" stdDeviation="0.7" result="softRim"/>
          <feColorMatrix in="softRim" type="matrix" values="0.55 0 0 0 0  0 0.5 0 0 0  0 0 0.45 0 0  0 0 0 0.55 0" result="wetEdge"/>
          <feMerge><feMergeNode in="wobbly"/><feMergeNode in="wetEdge"/></feMerge>
        </filter>
        <filter id="grain${id}" x="0" y="0" width="100%" height="100%">
          <feColorMatrix in="SourceGraphic" type="saturate" values="${s.colour.saturation}" result="muted"/>
          <feTurbulence type="fractalNoise" baseFrequency="0.85 0.35" numOctaves="3" seed="3" result="grain"/>
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0.42  0 0 0 0 0.34  0 0 0 0 0.26  0 0 0 ${0.5 * s.texture.intensity} 0" result="tint"/>
          <feComposite in="tint" in2="muted" operator="in" result="grainIn"/>
          <feBlend in="grainIn" in2="muted" mode="multiply"/>
        </filter>
        <filter id="img${id}" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="5"/><feDisplacementMap in="SourceGraphic" scale="3" xChannelSelector="R" yChannelSelector="G"/></filter>`;
    case 'wondercut':
      return `<filter id="cut${id}" x="-10%" y="-10%" width="125%" height="125%"><feDropShadow dx="${sh.offset[0]}" dy="${sh.offset[1]}" stdDeviation="${sh.blur}" flood-color="${s.palette.shadow}" flood-opacity="${sh.opacity}"/></filter>
        <filter id="paper${id}" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="1.2 0.25" numOctaves="2" seed="11" result="fibre"/>
          <feColorMatrix in="fibre" type="matrix" values="0 0 0 0 0.3  0 0 0 0 0.25  0 0 0 0 0.2  0 0 0 ${0.18 * s.texture.intensity * 2} 0" result="tint"/>
          <feComposite in="tint" in2="SourceGraphic" operator="in" result="fibreIn"/>
          <feBlend in="fibreIn" in2="SourceGraphic" mode="multiply"/>
        </filter>
        <filter id="img${id}" x="-10%" y="-10%" width="125%" height="125%"><feMorphology in="SourceAlpha" operator="dilate" radius="2.5" result="rim"/><feFlood flood-color="${s.palette.paper}"/><feComposite in2="rim" operator="in" result="paperRim"/><feDropShadow in="paperRim" dx="1.2" dy="1.8" stdDeviation="0.8" flood-color="${s.palette.shadow}" flood-opacity="0.35" result="rimShadow"/><feMerge><feMergeNode in="rimShadow"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
    case 'inked':
      return `<filter id="img${id}" x="-10%" y="-10%" width="125%" height="125%"><feMorphology in="SourceAlpha" operator="dilate" radius="1.6" result="thick"/><feFlood flood-color="${s.palette.ink}"/><feComposite in2="thick" operator="in" result="line"/><feMerge><feMergeNode in="line"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="bg${id}" x="0" y="0" width="100%" height="100%"><feGaussianBlur stdDeviation="${s.background.blur}" result="soft"/><feColorMatrix in="soft" type="saturate" values="0.92"/></filter>`;
    default:
      return `<filter id="img${id}" x="-10%" y="-10%" width="125%" height="125%"><feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="${s.palette.shadow}" flood-opacity="0.22"/></filter>
        <radialGradient id="glow${id}" cx="22%" cy="12%" r="75%"><stop offset="0" stop-color="${s.palette.light}" stop-opacity="${s.lighting.bloom + 0.15}"/><stop offset="1" stop-color="${s.palette.light}" stop-opacity="0"/></radialGradient>
        <radialGradient id="vig${id}" cx="50%" cy="45%" r="75%"><stop offset=".6" stop-color="#2a1d18" stop-opacity="0"/><stop offset="1" stop-color="#2a1d18" stop-opacity="${s.lighting.vignette}"/></radialGradient>`;
  }
}

/**
 * Rewrite drawn shapes for a mode, outside <defs> and <clipPath> blocks:
 * Classic Ink gives every filled shape a coloured ink line; Wondercut gives
 * every shape its own paper shadow; drawings and face images get the
 * mode's image treatment. The original markup is never changed in place —
 * this works on the string that is about to be drawn.
 */
export function stylizeShapes(svg: string, mode: StyleMode, id: string, inkFor: (fill: string) => string | null): string {
  if (softLook(mode)) return svg.replace(/<image\b(?![^>]*\bfilter=)/g, `<image filter="url(#img${id})"`);
  const parts = svg.split(/(<defs>[\s\S]*?<\/defs>|<clipPath[\s\S]*?<\/clipPath>)/);
  const s = STYLES[mode];
  return parts.map((part, i) => {
    if (i % 2 === 1) return part; // defs / clipPath: untouched
    return part.replace(/<(path|ellipse|circle|rect|polygon|image)\b([^>]*?)(\/?)>/g, (all, tag: string, attrs: string, close: string) => {
      if (tag === 'image') return /\bfilter=/.test(attrs) ? all : `<image filter="url(#img${id})"${attrs}${close}>`;
      if (/\b(stroke|opacity|fill-opacity|filter)=/.test(attrs)) return all;
      const fill = /\bfill="([^"]+)"/.exec(attrs)?.[1];
      if (!fill || fill === 'none') return all;
      if (mode === 'wondercut' || mode === 'gouache') {
        const r = /\br="([\d.]+)"/.exec(attrs);
        if (tag === 'circle' && r && parseFloat(r[1]) < 4) return all;
        return `<${tag}${attrs} filter="url(#${mode === 'wondercut' ? 'cut' : 'pnt'}${id})"${close}>`;
      }
      // Classic Ink
      if (/^#fff(fff)?$/i.test(fill) && tag === 'circle') return all; // eye highlights stay clean
      if (fill === '#120d0b' || /url\(#(ir|bl|gl)/.test(fill)) return all;
      const ink = inkFor(fill);
      if (!ink) return all;
      return `<${tag}${attrs} stroke="${ink}" stroke-width="${s.outline.width}" stroke-linejoin="round" paint-order="stroke"${close}>`;
    });
  }).join('');
}
