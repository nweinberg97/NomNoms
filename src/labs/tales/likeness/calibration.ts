import type { ShapeKey } from './measure';

/**
 * What "average" means for each face proportion, as this face-landmark model
 * actually reads real adult faces, and how much one photo can be trusted.
 *
 * Why not the mean-face model (canon.ts)? The landmark model places some points
 * differently from MediaPipe's mean-face file: on real faces it reads noses about
 * 26% wider, mouths about 25% wider and brows about 21% lower. Measuring against the
 * file made every face look "wide nose, low brows". These numbers fix that.
 *
 * Measured on 61 front-facing photos of 16 adults, grouped by person: two
 * public-domain portraits (scikit-image "astronaut", matplotlib "grace_hopper")
 * and the labelled adult test set of the MIT-licensed serengil/deepface repo.
 * Only these summary numbers are kept; no photos are part of NomNoms.
 *
 *   mean         average reading, in pupil distances (jaw: fraction of face width)
 *   sd           how much it varies between people
 *   reliability  between-person variance / (between + same-person-different-photo
 *                variance): how much of one photo's reading is the person rather than
 *                the photo. It scales the confidence of each measurement.
 *
 * Small sample, mostly adults in good light: treat as a first calibration and
 * widen it with more consented photos (never children's).
 */
export const CALIBRATION: Record<Exclude<ShapeKey, 'browWeight'>, { mean: number; sd: number; reliability: number }> = {
  faceWidth: { mean: 2.276, sd: 0.09, reliability: 0.58 },
  faceLength: { mean: 1.847, sd: 0.104, reliability: 0.73 },
  jaw: { mean: 0.804, sd: 0.017, reliability: 0.79 },
  eyeSize: { mean: 0.406, sd: 0.019, reliability: 0.53 },
  eyeGap: { mean: 0.596, sd: 0.019, reliability: 0.46 },
  nose: { mean: 0.714, sd: 0.046, reliability: 0.79 },
  // mouth: only from photos without a big smile (35 photos, 12 people), since big smiles aren't measured
  mouth: { mean: 0.916, sd: 0.065, reliability: 0.75 },
  browHeight: { mean: 0.268, sd: 0.029, reliability: 0.76 },
};
