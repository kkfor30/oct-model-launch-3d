import {V3} from '../anim';

// Catmull-Rom through time-stamped keys, so the camera keeps moving through every key instead of stopping.
type Key = [number, V3];

const cr = (p0: number, p1: number, p2: number, p3: number, t: number) =>
  0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);

export const spline = (f: number, keys: Key[]): V3 => {
  if (f <= keys[0][0]) return keys[0][1];
  const n = keys.length;
  if (f >= keys[n - 1][0]) return keys[n - 1][1];
  let k = 0;
  while (keys[k + 1][0] < f) k++;
  const [fa, a] = keys[k];
  const [fb, b] = keys[k + 1];
  const p = keys[Math.max(0, k - 1)][1];
  const q = keys[Math.min(n - 1, k + 2)][1];
  const t = (f - fa) / (fb - fa);
  return [cr(p[0], a[0], b[0], q[0], t), cr(p[1], a[1], b[1], q[1], t), cr(p[2], a[2], b[2], q[2], t)];
};
