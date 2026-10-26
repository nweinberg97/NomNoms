import React, { useEffect, useState } from 'react';
import type { VectorStage } from './assets/vector';

/**
 * Something fun to watch while a photo is being turned into a drawing.
 *
 * 'place': a little storybook page paints itself (sky, sun, hills, a house,
 * a tree, clouds) while a crayon scribbles. 'face': a magnifying glass looks
 * over a face while its points twinkle. Captions follow the real stages when
 * they're known, with playful lines in between. Only transform and opacity
 * animate, so it keeps moving even while the device is busy.
 */

const PLACE_LINES: Record<VectorStage | 'start', string> = {
  start: 'Sharpening the crayons…',
  smoothing: 'Squinting at your photo…',
  shapes: 'Finding the big shapes…',
  merging: 'Tidying up the tiny specks…',
  sky: 'Painting a brand-new sky…',
  outlines: 'Inking the outlines…',
};
const PLACE_EXTRAS = ['Mixing the paint…', 'Choosing the cheeriest colours…', 'Fluffing up the clouds…', 'Almost there, one more brushstroke…'];
const FACE_LINES = ['Finding the face…', 'Measuring that smile…', 'Matching the hair colour…', 'Checking the eye spacing…', 'Getting the cheeks just right…', 'Drawing them now…'];
const STAGES: (VectorStage | 'start')[] = ['start', 'smoothing', 'shapes', 'merging', 'sky', 'outlines'];

export function DrawingMagic({ variant = 'place', stage, compact }: { variant?: 'place' | 'face'; stage?: VectorStage | 'start'; compact?: boolean }) {
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 1800); return () => clearInterval(t); }, []);
  const line = variant === 'face'
    ? FACE_LINES[tick % FACE_LINES.length]
    : stage && stage !== 'start' && tick % 3 !== 2 ? PLACE_LINES[stage] : tick % 3 === 2 ? PLACE_EXTRAS[Math.floor(tick / 3) % PLACE_EXTRAS.length] : PLACE_LINES[stage ?? 'start'];
  const at = stage ? STAGES.indexOf(stage) : 0;
  return (
    <div className={`dm ${compact ? 'is-compact' : ''}`} role="status" aria-live="polite" data-testid="drawing-magic">
      {variant === 'place' ? <PageScene /> : <FaceScene />}
      <p className="dm-line" key={line}>{line}</p>
      {variant === 'place' && (
        <div className="dm-dots" aria-hidden="true">{STAGES.slice(1).map((s, i) => <span key={s} className={i < at ? 'is-done' : i === at - 1 || (at === 0 && i === 0) ? 'is-now' : ''} />)}</div>
      )}
      <small className="dm-note">Drawing on this device. Your photo isn’t uploaded.</small>
    </div>
  );
}

function PageScene() {
  return (
    <svg className="dm-scene" viewBox="0 0 240 160" aria-hidden="true">
      <defs>
        <linearGradient id="dmSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7fb6e6" /><stop offset="1" stopColor="#dff0f7" /></linearGradient>
        <clipPath id="dmPage"><rect x="12" y="10" width="216" height="140" rx="10" /></clipPath>
      </defs>
      <rect x="8" y="6" width="224" height="148" rx="13" fill="#fffaf1" stroke="#e8d9c4" strokeWidth="2" />
      <g clipPath="url(#dmPage)">
        <rect className="dm-a dm-sky" x="12" y="10" width="216" height="140" fill="url(#dmSky)" />
        <g className="dm-a dm-sun"><circle cx="190" cy="40" r="16" fill="#ffd166" /><circle cx="190" cy="40" r="24" fill="#ffd166" opacity=".25" /></g>
        <g className="dm-cloud dm-c1"><circle cx="50" cy="36" r="9" fill="#fff" /><circle cx="62" cy="31" r="12" fill="#fff" /><circle cx="76" cy="36" r="9" fill="#fff" /><rect x="44" y="36" width="38" height="8" rx="4" fill="#fff" /></g>
        <path className="dm-a dm-hill1" d="M0 120 Q60 82 130 112 T260 104 V170 H0 Z" fill="#8cc084" />
        <path className="dm-a dm-hill2" d="M0 132 Q80 108 150 128 T260 122 V170 H0 Z" fill="#6aa86a" />
        <g className="dm-a dm-tree"><rect x="168" y="96" width="6" height="22" rx="2" fill="#8a5a3c" /><circle cx="171" cy="90" r="14" fill="#4f9a5a" /><circle cx="163" cy="96" r="9" fill="#5fae66" /><circle cx="180" cy="95" r="9" fill="#5fae66" /></g>
        <g className="dm-a dm-house">
          <rect x="78" y="88" width="48" height="36" rx="3" fill="#e9876b" />
          <rect className="dm-a dm-door" x="96" y="104" width="12" height="20" rx="3" fill="#7a4b3a" />
          <rect className="dm-a dm-win" x="84" y="96" width="9" height="9" rx="2" fill="#ffe7a3" />
          <rect className="dm-a dm-win2" x="111" y="96" width="9" height="9" rx="2" fill="#ffe7a3" />
        </g>
        <path className="dm-a dm-roof" d="M72 90 L102 66 L132 90 Z" fill="#b5532b" />
        <g className="dm-spark dm-s1"><path d="M40 70 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z" fill="#fff6c9" /></g>
        <g className="dm-spark dm-s2"><path d="M150 54 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" fill="#fff6c9" /></g>
      </g>
      <g className="dm-crayon">
        <g transform="rotate(-35)">
          <rect x="-4" y="-26" width="8" height="24" rx="2" fill="#4f86c6" />
          <rect x="-4" y="-20" width="8" height="3" fill="#2f5f96" />
          <path d="M-4 -2 L0 6 L4 -2 Z" fill="#f2c9a0" />
          <path d="M-1.6 2.6 L0 6 L1.6 2.6 Z" fill="#2f5f96" />
        </g>
      </g>
    </svg>
  );
}

function FaceScene() {
  const dots = [[88, 70], [112, 70], [100, 86], [90, 100], [110, 100], [100, 104], [80, 58], [120, 58], [74, 84], [126, 84], [100, 120]];
  return (
    <svg className="dm-scene dm-face" viewBox="0 0 200 150" aria-hidden="true">
      <rect x="6" y="6" width="188" height="138" rx="14" fill="#fffaf1" stroke="#e8d9c4" strokeWidth="2" />
      <ellipse cx="100" cy="82" rx="38" ry="46" fill="#f4d3bb" />
      <path d="M62 70 C60 36 86 26 100 26 C116 26 142 36 138 70 C130 52 116 46 100 46 C84 46 70 52 62 70 Z" fill="#7a5236" />
      <g className="dm-blink"><ellipse cx="86" cy="76" rx="5" ry="6" fill="#2a201c" /><ellipse cx="114" cy="76" rx="5" ry="6" fill="#2a201c" /></g>
      <path d="M88 104 Q100 114 112 104" stroke="#a24a3a" strokeWidth="3" fill="none" strokeLinecap="round" />
      {dots.map(([x, y], i) => <circle key={i} className="dm-pt" style={{ animationDelay: `${(i * 0.17).toFixed(2)}s` }} cx={x} cy={y} r="2.6" fill="#2fb37a" />)}
      <g className="dm-glass">
        <circle cx="0" cy="0" r="17" fill="#ffffff" fillOpacity=".25" stroke="#3a3330" strokeWidth="4" />
        <rect x="11" y="11" width="7" height="22" rx="3" transform="rotate(-45 14 14)" fill="#3a3330" />
      </g>
    </svg>
  );
}
