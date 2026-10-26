/**
 * The mean adult face, front on, in centimetres (x right, y down).
 *
 * Taken from MediaPipe's canonical face model (canonical_face_model.obj,
 * google-ai-edge/mediapipe, Apache License 2.0), keeping only the landmarks
 * NomNoms measures. Its pupil distance is 6.3 cm, the adult average, so a
 * photo is compared against an average face, not against made-up thresholds.
 */
export const CANON: Record<number, [number, number]> = {
  0: [0.000, 3.406],
  1: [0.000, 1.127],
  2: [0.000, 2.089],
  10: [0.000, -8.262],
  13: [0.000, 3.994],
  14: [0.000, 4.542],
  17: [0.000, 5.365],
  33: [-4.446, -2.664],
  50: [-4.766, 0.702],
  61: [-2.456, 4.343],
  70: [-5.721, -4.255],
  105: [-3.987, -5.109],
  107: [-1.396, -5.012],
  129: [-1.786, 0.978],
  133: [-1.856, -2.585],
  145: [-3.177, -2.294],
  152: [0.000, 9.403],
  159: [-3.177, -2.964],
  164: [0.000, 2.522],
  168: [0.000, -3.271],
  172: [-5.941, 6.224],
  234: [-7.664, -0.673],
  263: [4.446, -2.664],
  280: [4.766, 0.702],
  291: [2.456, 4.343],
  300: [5.721, -4.255],
  334: [3.987, -5.109],
  336: [1.396, -5.012],
  358: [1.786, 0.978],
  362: [1.856, -2.585],
  374: [3.177, -2.294],
  386: [3.177, -2.964],
  397: [5.941, 6.224],
  454: [7.664, -0.673],
};
