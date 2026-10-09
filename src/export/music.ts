/**
 * Built-in film music, composed in the browser with Web Audio, so it is
 * royalty-free by construction and exactly as long as the film. Three moods,
 * each a short chord loop voiced for a specific instrument, with a gentle
 * fade in and a long fade out to match the film's end card.
 */

export type MusicStyle = 'lullaby' | 'sunny' | 'dreamy';
export const MUSIC_STYLES: Record<MusicStyle, { label: string; mood: string }> = {
  lullaby: { label: 'Lullaby', mood: 'Music box, slow waltz' },
  sunny: { label: 'Sunny', mood: 'Light, bouncy, plucked' },
  dreamy: { label: 'Dreamy', mood: 'Soft pads, slow and warm' },
};

const SR = 22050;
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

interface Ctx {
  ac: OfflineAudioContext;
  out: AudioNode;
}

function tone(c: Ctx, t: number, freq: number, dur: number, opts: {
  type?: OscillatorType; gain?: number; attack?: number; release?: number; cutoff?: number; detune?: number; partials?: [number, number][];
}) {
  const { ac, out } = c;
  const g = ac.createGain();
  const peak = opts.gain ?? 0.2;
  const a = opts.attack ?? 0.005;
  const r = opts.release ?? dur;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0008, t + a + r);
  let dest: AudioNode = g;
  if (opts.cutoff) {
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = opts.cutoff;
    f.Q.value = 0.4;
    g.connect(f);
    dest = f;
  }
  dest.connect(out);
  const voices: [number, number][] = opts.partials ?? [[1, 1]];
  for (const [mult, amp] of voices) {
    const o = ac.createOscillator();
    o.type = opts.type ?? 'sine';
    o.frequency.value = freq * mult;
    if (opts.detune) o.detune.value = opts.detune;
    const pg = ac.createGain();
    pg.gain.value = amp;
    o.connect(pg).connect(g);
    o.start(t);
    o.stop(t + a + r + 0.05);
  }
}

function noise(c: Ctx, t: number, dur: number, gain: number) {
  const { ac, out } = c;
  const len = Math.floor(SR * dur);
  const buf = ac.createBuffer(1, len, SR);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const hp = ac.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 6000;
  const g = ac.createGain();
  g.gain.value = gain;
  src.connect(hp).connect(g).connect(out);
  src.start(t);
}

/* ── the three pieces ─────────────────────────────────────── */

// chords as MIDI note arrays (root position, middle register)
const LULLABY = [[53, 57, 60], [50, 53, 57], [46, 50, 53], [48, 52, 55]]; // F  Dm  Bb  C
const SUNNY = [[48, 52, 55], [43, 47, 50], [45, 48, 52], [41, 45, 48]]; // C  G  Am  F
const DREAMY = [[51, 55, 58, 62], [48, 51, 55, 58], [44, 48, 51, 55], [46, 50, 53, 57]]; // Ebmaj7 Cm7 Abmaj7 Bb

function lullaby(c: Ctx, seconds: number) {
  const beat = 60 / 72;
  const bar = beat * 3;
  const box: [number, number][] = [[1, 1], [3.01, 0.18], [4.2, 0.08]];
  for (let b = 0, t = 0.2; t < seconds; b++, t += bar) {
    const ch = LULLABY[b % 4];
    // pad
    for (const n of ch) tone(c, t, midi(n), bar * 1.1, { type: 'triangle', gain: 0.035, attack: 0.4, cutoff: 900 });
    tone(c, t, midi(ch[0] - 12), bar, { type: 'sine', gain: 0.08, attack: 0.02, release: bar * 0.9 });
    // music box arpeggio up an octave: root, 3rd, 5th, octave, 5th, 3rd (eighths)
    const arp = [ch[0], ch[1], ch[2], ch[0] + 12, ch[2], ch[1]].map((n) => n + 12);
    arp.forEach((n, k) => tone(c, t + k * (beat / 2), midi(n), 1.6, { gain: k === 0 ? 0.11 : 0.075, partials: box }));
    if (b % 8 === 7) tone(c, t + bar - beat / 2, midi(ch[2] + 24), 2.2, { gain: 0.05, partials: box });
  }
}

function sunny(c: Ctx, seconds: number) {
  const beat = 60 / 104;
  const bar = beat * 4;
  const pattern = [0, 1, 2, 1, 0, 2, 1, 2];
  for (let b = 0, t = 0.2; t < seconds; b++, t += bar) {
    const ch = SUNNY[b % 4];
    for (let k = 0; k < 8; k++) {
      const n = ch[pattern[k]] + 12;
      tone(c, t + k * (beat / 2), midi(n), 0.45, { type: 'triangle', gain: k % 2 ? 0.06 : 0.085, cutoff: 2600, release: 0.4 });
    }
    for (let q = 0; q < 4; q++) tone(c, t + q * beat, midi(ch[0] - 12 + (q === 2 ? 7 : 0)), 0.5, { type: 'sine', gain: 0.12, release: beat * 0.8 });
    for (let q = 0; q < 4; q++) noise(c, t + q * beat + beat / 2, 0.06, 0.05);
    if (b % 4 === 3) tone(c, t + beat * 3, midi(ch[2] + 24), 1, { gain: 0.04, partials: [[1, 1], [2, 0.3]] });
  }
}

function dreamy(c: Ctx, seconds: number) {
  const bar = (60 / 64) * 4;
  for (let b = 0, t = 0.2; t < seconds; b++, t += bar) {
    const ch = DREAMY[b % 4];
    for (const n of ch) {
      tone(c, t, midi(n), bar * 1.2, { type: 'sawtooth', gain: 0.018, attack: 1.2, cutoff: 700, detune: 6 });
      tone(c, t, midi(n), bar * 1.2, { type: 'sawtooth', gain: 0.018, attack: 1.2, cutoff: 700, detune: -6 });
    }
    tone(c, t, midi(ch[0] - 12), bar, { type: 'sine', gain: 0.07, attack: 0.6 });
    // a few bell notes
    [0, 1.5, 2.5].forEach((beatAt, k) => {
      if ((b + k) % 2) tone(c, t + beatAt * (60 / 64), midi(ch[(k + b) % ch.length] + 24), 2.4, { gain: 0.045, partials: [[1, 1], [2.76, 0.2], [5.4, 0.06]] });
    });
  }
}

const cache = new Map<string, Promise<AudioBuffer>>();

/** Render a piece exactly `seconds` long (cached per style + length). */
export function renderMusic(style: MusicStyle, seconds: number): Promise<AudioBuffer> {
  const key = `${style}:${Math.ceil(seconds)}`;
  if (!cache.has(key)) {
    cache.set(key, (async () => {
      const len = Math.ceil(seconds) + 1;
      const ac = new OfflineAudioContext(2, SR * len, SR);
      const master = ac.createGain();
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 3;
      // fade in 1.5s, fade out over the last 4s
      master.gain.setValueAtTime(0, 0);
      master.gain.linearRampToValueAtTime(0.9, 1.5);
      master.gain.setValueAtTime(0.9, Math.max(1.6, len - 4.5));
      master.gain.linearRampToValueAtTime(0, len - 0.3);
      master.connect(comp).connect(ac.destination);
      const c = { ac, out: master };
      ({ lullaby, sunny, dreamy })[style](c, len - 3);
      const buf = await ac.startRendering();
      // bring every style to the same comfortable level (peak ≈ -3 dB)
      let peak = 0;
      for (let ch = 0; ch < buf.numberOfChannels; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
      }
      const k = peak > 0 ? 0.7 / peak : 1;
      for (let ch = 0; ch < buf.numberOfChannels; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < d.length; i++) d[i] *= k;
      }
      return buf;
    })());
  }
  return cache.get(key)!;
}

/** Decode a parent's own song file for the film. */
export async function decodeSong(blob: Blob): Promise<AudioBuffer> {
  const ac = new OfflineAudioContext(2, SR, SR);
  return ac.decodeAudioData(await blob.arrayBuffer());
}
