import type React from 'react';
import type { BookStyle } from '../lib/types';

/**
 * Book styles: a small, curated set so every combination looks designed.
 * Each one only redefines the book's own color/type tokens on the page
 * element, so the app around the book never changes. The defaults are the
 * original NomNoms look, so an existing book without a style is unchanged.
 */

export type PaletteId = 'paper' | 'sage' | 'blush' | 'midnight' | 'classic';
export type TypeId = 'classic' | 'modern' | 'playful';
export type ShapeId = 'portrait' | 'square' | 'landscape';

export const DEFAULT_STYLE: Required<BookStyle> = { palette: 'paper', type: 'classic', shape: 'portrait' };

export const PALETTES: Record<PaletteId, { label: string; swatch: [string, string, string]; vars: Record<string, string> }> = {
  paper: { label: 'Warm paper', swatch: ['#fbf8f2', '#b2694b', '#26221f'], vars: {} },
  sage: {
    label: 'Sage',
    swatch: ['#f4f5ef', '#6f7f5f', '#23281f'],
    vars: { '--book-paper': '#f4f5ef', '--paper-2': '#e5e9dd', '--paper-3': '#d9dfcf', '--ink': '#23281f', '--ink-2': '#4c5544', '--ink-3': '#818a77', '--ink-4': '#aab2a0', '--line-2': '#cfd6c4', '--accent': '#6f7f5f', '--accent-ink': '#566449', '--butter': '#e6e9d2' },
  },
  blush: {
    label: 'Blush',
    swatch: ['#fcf4f1', '#c27c7c', '#2e2224'],
    vars: { '--book-paper': '#fcf4f1', '--paper-2': '#f3e2dd', '--paper-3': '#ead3cc', '--ink': '#2e2224', '--ink-2': '#5e4a4d', '--ink-3': '#9a8285', '--ink-4': '#c2adaf', '--line-2': '#e6cfca', '--accent': '#c27c7c', '--accent-ink': '#9e5a5b', '--butter': '#f6e4dc' },
  },
  midnight: {
    label: 'Midnight',
    swatch: ['#1f2227', '#d4a373', '#f2ede4'],
    vars: { '--book-paper': '#1f2227', '--paper-2': '#2a2e35', '--paper-3': '#343941', '--ink': '#f2ede4', '--ink-2': '#cdc6ba', '--ink-3': '#958f84', '--ink-4': '#6c675f', '--line-2': '#3d424b', '--accent': '#d4a373', '--accent-ink': '#e3b98d', '--butter': '#3a3329' },
  },
  classic: {
    label: 'Gallery white',
    swatch: ['#ffffff', '#1a1a1a', '#1a1a1a'],
    vars: { '--book-paper': '#ffffff', '--paper-2': '#f3f3f1', '--paper-3': '#e8e8e5', '--ink': '#161616', '--ink-2': '#444444', '--ink-3': '#858585', '--ink-4': '#b3b3b3', '--line-2': '#dddddd', '--accent': '#161616', '--accent-ink': '#161616', '--butter': '#f0f0ec' },
  },
};

export const TYPES: Record<TypeId, { label: string; sample: string; vars: Record<string, string> }> = {
  classic: { label: 'Classic', sample: 'Lora · storybook serif', vars: {} },
  modern: { label: 'Modern', sample: 'Inter · clean and calm', vars: { '--serif': "'Inter', -apple-system, 'Segoe UI', sans-serif" } },
  playful: { label: 'Playful', sample: 'Poppins · round and friendly', vars: { '--serif': "'Poppins', 'Inter', sans-serif" } },
};

export const SHAPES: Record<ShapeId, { label: string; size: string; ratio: number; pt: [number, number] }> = {
  portrait: { label: 'Portrait', size: '8 × 10 in', ratio: 1.25, pt: [576, 720] },
  square: { label: 'Square', size: '8 × 8 in', ratio: 1, pt: [576, 576] },
  landscape: { label: 'Landscape', size: '11 × 8.5 in', ratio: 8.5 / 11, pt: [792, 612] },
};

export function resolveStyle(s?: BookStyle): Required<BookStyle> {
  return {
    palette: (s?.palette && s.palette in PALETTES ? s.palette : DEFAULT_STYLE.palette) as PaletteId,
    type: (s?.type && s.type in TYPES ? s.type : DEFAULT_STYLE.type) as TypeId,
    shape: (s?.shape && s.shape in SHAPES ? s.shape : DEFAULT_STYLE.shape) as ShapeId,
  };
}

/** CSS custom properties for a page element. Empty for the default style. */
export function styleVars(s?: BookStyle): React.CSSProperties {
  const r = resolveStyle(s);
  return { ...PALETTES[r.palette as PaletteId].vars, ...TYPES[r.type as TypeId].vars } as React.CSSProperties;
}

/** Height ÷ width of a page in this style. */
export const pageRatio = (s?: BookStyle) => SHAPES[resolveStyle(s).shape as ShapeId].ratio;
