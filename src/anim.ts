export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t: number) => t * t * t;
export const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// 0→1 between frames a and b, eased.
export const prog = (f: number, a: number, b: number, ease = easeInOut) => ease(clamp01((f - a) / (b - a)));

export type V3 = [number, number, number];
export const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// Piecewise eased interpolation through [frame, value] keys.
export const track = (f: number, keys: [number, V3][]): V3 => {
  if (f <= keys[0][0]) return keys[0][1];
  for (let k = 0; k < keys.length - 1; k++) {
    const [fa, va] = keys[k];
    const [fb, vb] = keys[k + 1];
    if (f <= fb) return lerp3(va, vb, easeInOut((f - fa) / (fb - fa)));
  }
  return keys[keys.length - 1][1];
};

// Parabolic jump from a to b, rising h above the straight line at mid-flight.
export const jump = (a: V3, b: V3, t: number, h: number): V3 => {
  const p = lerp3(a, b, t);
  p[1] += 4 * h * t * (1 - t);
  return p;
};

// Squash after landing: returns [sx, sy].
export const squash = (f: number, land: number, len = 14, amt = 0.28): [number, number] => {
  const t = (f - land) / len;
  if (t < 0 || t > 1) return [1, 1];
  const s = Math.sin(Math.PI * t) * Math.exp(-2.2 * t);
  return [1 + amt * 0.5 * s, 1 - amt * s];
};

export const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
