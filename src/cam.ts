import {V3, clamp01, easeInOut, lerp, lerp3} from './anim';

export type Cam = {pos: V3; tgt: V3; fov: number};

// A shot covers [a, b) of the segment's local frames; cuts between shots are hard.
export type Shot = {a: number; b: number; cam: (t: number, f: number) => Cam};

export const move =
  (from: Cam, to: Cam, ease = easeInOut) =>
  (t: number): Cam => {
    const e = ease(t);
    return {pos: lerp3(from.pos, to.pos, e), tgt: lerp3(from.tgt, to.tgt, e), fov: lerp(from.fov, to.fov, e)};
  };

export const pickShot = (f: number, shots: Shot[]): Cam => {
  const s = shots.find((x) => f >= x.a && f < x.b) ?? shots[shots.length - 1];
  return s.cam(clamp01((f - s.a) / (s.b - s.a)), f);
};

// Decaying handheld jolt after an impact at frame `at`.
export const shake = (c: Cam, f: number, at: number, amp = 0.06, len = 14): Cam => {
  const t = (f - at) / len;
  if (t < 0 || t > 1) return c;
  const k = amp * Math.exp(-4 * t);
  return {...c, pos: [c.pos[0] + k * Math.sin(f * 2.1), c.pos[1] + k * Math.sin(f * 2.9 + 1), c.pos[2]]};
};

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
