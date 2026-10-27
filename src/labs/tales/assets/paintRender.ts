/**
 * Other ways to draw a place (or thing) made from a photo, besides the storybook
 * shapes of vectorRender.ts. Each one starts from the picture's simplified
 * colours (the asset's palette and labels, never the photo) and finishes it with
 * SVG filters, so it stays smooth at any size and costs nothing to switch:
 *
 *   painted      soft brushwork: blended edges, gentle stroke direction, canvas grain
 *   watercolour  loose washes: bleeding edges, darker pooled rims, paper texture
 *   sketch       coloured-pencil: pale fill with hand-drawn graphite lines
 */
import type { StyleMode } from '../styles';

export type DrawStyle = 'shapes' | 'painted' | 'watercolour' | 'sketch';
export const DRAW_STYLES: DrawStyle[] = ['shapes', 'painted', 'watercolour', 'sketch'];
export const DRAW_STYLE_NAMES: Record<DrawStyle, string> = {
  shapes: 'Storybook shapes',
  painted: 'Soft paint',
  watercolour: 'Watercolour',
  sketch: 'Pencil sketch',
};

let uid = 0;

/** The filter for a style, sized to the picture (w × h). */
function filterFor(style: Exclude<DrawStyle, 'shapes'>, id: string, w: number, mode: StyleMode): string {
  const k = w / 640; // the effects are tuned for a 640-wide picture
  const warm = mode === 'gouache' ? 0.08 : 0.04;
  switch (style) {
    case 'painted':
      return `<filter id="${id}" x="-3%" y="-3%" width="106%" height="106%" color-interpolation-filters="sRGB">
        <feGaussianBlur in="SourceGraphic" stdDeviation="${(1.4 * k).toFixed(2)}" result="soft"/>
        <feTurbulence type="fractalNoise" baseFrequency="${(0.03 / k).toFixed(4)} ${(0.1 / k).toFixed(4)}" numOctaves="2" seed="3" result="brush"/>
        <feDisplacementMap in="soft" in2="brush" scale="${(8 * k).toFixed(1)}" xChannelSelector="R" yChannelSelector="G" result="stroked"/>
        <feColorMatrix in="stroked" type="saturate" values="1.08" result="rich"/>
        <feTurbulence type="fractalNoise" baseFrequency="${(0.8 / k).toFixed(3)}" numOctaves="2" seed="5" result="grain"/>
        <feColorMatrix in="grain" type="matrix" values="0 0 0 0 ${0.5 + warm}  0 0 0 0 0.42  0 0 0 0 0.34  0 0 0 0.16 0" result="tint"/>
        <feComposite in="tint" in2="rich" operator="in" result="tintIn"/>
        <feBlend in="tintIn" in2="rich" mode="multiply"/>
      </filter>`;
    case 'watercolour':
      return `<filter id="${id}" x="-3%" y="-3%" width="106%" height="106%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="${(0.018 / k).toFixed(4)}" numOctaves="3" seed="7" result="flow"/>
        <feDisplacementMap in="SourceGraphic" in2="flow" scale="${(12 * k).toFixed(1)}" xChannelSelector="R" yChannelSelector="G" result="bled"/>
        <feGaussianBlur in="bled" stdDeviation="${(1.5 * k).toFixed(2)}" result="wash"/>
        <feGaussianBlur in="bled" stdDeviation="${(5 * k).toFixed(2)}" result="wide"/>
        <feComposite in="wash" in2="wide" operator="arithmetic" k1="0" k2="1.9" k3="-0.9" k4="0" result="rims"/>
        <feColorMatrix in="rims" type="saturate" values="1.1" result="vivid"/>
        <feComponentTransfer in="vivid" result="light"><feFuncR type="linear" slope=".88" intercept=".11"/><feFuncG type="linear" slope=".88" intercept=".1"/><feFuncB type="linear" slope=".88" intercept=".09"/></feComponentTransfer>
        <feTurbulence type="fractalNoise" baseFrequency="${(0.55 / k).toFixed(3)}" numOctaves="3" seed="11" result="paper"/>
        <feColorMatrix in="paper" type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.5  0 0 0 0 0.44  0 0 0 0.2 0" result="tint"/>
        <feComposite in="tint" in2="light" operator="in" result="tintIn"/>
        <feBlend in="tintIn" in2="light" mode="multiply"/>
      </filter>`;
    case 'sketch':
      return `<filter id="${id}" x="-3%" y="-3%" width="106%" height="106%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="${(0.05 / k).toFixed(4)}" numOctaves="2" seed="13" result="wob"/>
        <feDisplacementMap in="SourceGraphic" in2="wob" scale="${(3 * k).toFixed(1)}" xChannelSelector="R" yChannelSelector="G" result="hand"/>
        <feGaussianBlur in="hand" stdDeviation="${(1.6 * k).toFixed(2)}" result="soft"/>
        <feColorMatrix in="soft" type="saturate" values=".9" result="calm"/>
        <feComponentTransfer in="calm" result="pale"><feFuncR type="linear" slope=".55" intercept=".45"/><feFuncG type="linear" slope=".55" intercept=".44"/><feFuncB type="linear" slope=".55" intercept=".42"/></feComponentTransfer>
        <feGaussianBlur in="hand" stdDeviation="${(1.2 * k).toFixed(2)}" result="calmEdges"/>
        <feConvolveMatrix in="calmEdges" order="3" kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1" preserveAlpha="true" result="edges"/>
        <feColorMatrix in="edges" type="matrix" values="0 0 0 0 0.3  0 0 0 0 0.26  0 0 0 0 0.24  1.7 1.7 1.7 0 -0.2" result="lines"/>
        <feComponentTransfer in="lines" result="pencil"><feFuncA type="linear" slope=".75"/></feComponentTransfer>
        <feMerge><feMergeNode in="pale"/><feMergeNode in="pencil"/></feMerge>
      </filter>`;
  }
}

/**
 * A drawn picture from the asset's simplified colours (`png`: the palette ×
 * labels rendered at full size, as a data URL) in the chosen style.
 */
export function paintedSvg(png: string, w: number, h: number, style: Exclude<DrawStyle, 'shapes'>, mode: StyleMode): string {
  const id = `pp${++uid}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><defs>${filterFor(style, id, w, mode)}</defs><g filter="url(#${id})"><image href="${png}" x="${(-w * 0.03).toFixed(1)}" y="${(-h * 0.03).toFixed(1)}" width="${(w * 1.06).toFixed(1)}" height="${(h * 1.06).toFixed(1)}" preserveAspectRatio="none"/></g></svg>`;
}
