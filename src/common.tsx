import React, {useLayoutEffect, useMemo} from 'react';
import {RoundedBox} from '@react-three/drei';
import * as THREE from 'three';
import {V3, rng} from './anim';
import type {Expression} from './Characters';

export const FONT = '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif';
export const NUM = '"DIN Next LT Pro", Bahnschrift, "Segoe UI", "Microsoft YaHei", sans-serif';

export type Pose = {pos: V3; rotY: number; sx: number; sy: number; tuck: number; expression: Expression; starBoost: number};
export const pose = (p: Partial<Pose> & {pos: V3}): Pose => ({rotY: 0, sx: 1, sy: 1, tuck: 0, expression: 'normal', starBoost: 0, ...p});
export const faceTo = (from: V3, to: V3, k = 1) => k * Math.atan2(to[0] - from[0], to[2] - from[2]);

// ---------- text on a plane ----------
type Line = {t: string; size: number; color: string; weight?: number; font?: string};

export const Label: React.FC<{
  lines: Line[];
  w: number;
  h: number;
  res?: number;
  bg?: string;
  radius?: number;
  position?: V3;
  rotation?: V3;
  scale?: number;
  glow?: string;
  opacity?: number;
}> = ({lines, w, h, res = 256, bg, radius = 0.12, position, rotation, scale = 1, glow, opacity = 1}) => {
  const {canvas, ctx, tex} = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = Math.round(w * res);
    c.height = Math.round(h * res);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return {canvas: c, ctx: c.getContext('2d')!, tex: t};
  }, [w, h, res]);
  const key = JSON.stringify(lines) + bg + glow;
  useLayoutEffect(() => {
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    if (bg) {
      const r = radius * res;
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.roundRect(0, 0, W, H, r);
      ctx.fill();
    }
    // Shrink-to-fit: sizes are design sizes; text never spills past the plane (leaves room for the glow).
    const pad = glow ? 0.82 : 0.92;
    const fontOf = (l: Line, k: number) => `${l.weight ?? 800} ${l.size * k}px ${l.font ?? FONT}`;
    let widest = 0;
    for (const l of lines) {
      ctx.font = fontOf(l, 1);
      widest = Math.max(widest, ctx.measureText(l.t).width);
    }
    const total0 = lines.reduce((s, l) => s + l.size * 1.2, 0);
    const k = Math.min(1, (W * pad) / Math.max(1, widest), (H * pad) / total0);
    let y = (H - total0 * k) / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const l of lines) {
      ctx.font = fontOf(l, k);
      ctx.fillStyle = l.color;
      if (glow) {
        ctx.shadowColor = glow;
        ctx.shadowBlur = l.size * k * 0.3;
      }
      ctx.fillText(l.t, W / 2, y + (l.size * k * 1.2) / 2);
      ctx.shadowBlur = 0;
      y += l.size * k * 1.2;
    }
    tex.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, canvas, ctx, tex, res, radius]);
  return (
    <mesh position={position} rotation={rotation} scale={scale}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} opacity={opacity} depthWrite={false} />
    </mesh>
  );
};

// ---------- soft bokeh ----------
export const useDisc = () =>
  useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.8, 'rgba(255,255,255,0.18)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }, []);

export const Bokeh: React.FC<{frame: number; seed?: number; palette?: string[]; z?: [number, number]; count?: number; opacity?: number}> = ({
  frame,
  seed = 7,
  palette = ['#FF9F6E', '#8AB4FF', '#6F8BFF', '#FFD08A', '#C9A7FF'],
  z = [-4, -14],
  count = 60,
  opacity = 0.35,
}) => {
  const disc = useDisc();
  const dots = useMemo(() => {
    const r = rng(seed);
    return Array.from({length: count}).map(() => ({
      p: [(r() - 0.5) * 22, 0.4 + r() * 6, z[0] + (z[1] - z[0]) * r()] as V3,
      s: 0.03 + r() * 0.06,
      c: new THREE.Color(palette[Math.floor(r() * palette.length)]).multiplyScalar(2 + r() * 3),
      ph: r() * 6.28,
      sp: 0.004 + r() * 0.01,
    }));
  }, [seed, count, z, palette]);
  return (
    <group>
      {dots.map((d, k) => (
        <sprite key={k} position={[d.p[0] + Math.sin(frame * d.sp + d.ph) * 0.4, d.p[1] + Math.sin(frame * d.sp * 1.3 + d.ph) * 0.3, d.p[2]]} scale={d.s * 6}>
          <spriteMaterial map={disc} color={d.c} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} opacity={opacity} />
        </sprite>
      ))}
    </group>
  );
};

// ---------- props ----------
export const Envelope: React.FC = () => (
  <group>
    <RoundedBox args={[0.3, 0.2, 0.03]} radius={0.015} smoothness={2}>
      <meshStandardMaterial color="#F4F1EA" roughness={0.6} />
    </RoundedBox>
    {[-1, 1].map((s) => (
      <mesh key={s} position={[s * 0.07, 0.03, 0.017]} rotation={[0, 0, s * 0.55]}>
        <boxGeometry args={[0.17, 0.012, 0.005]} />
        <meshStandardMaterial color="#D97757" />
      </mesh>
    ))}
  </group>
);

export const AlertBadge: React.FC = () => (
  <group>
    <mesh>
      <sphereGeometry args={[0.16, 24, 16]} />
      <meshStandardMaterial color="#E5484D" emissive="#E5484D" emissiveIntensity={1.6} roughness={0.3} />
    </mesh>
    <mesh position={[0, 0.03, 0.15]}>
      <boxGeometry args={[0.04, 0.12, 0.02]} />
      <meshBasicMaterial color="#ffffff" />
    </mesh>
    <mesh position={[0, -0.07, 0.15]}>
      <boxGeometry args={[0.04, 0.035, 0.02]} />
      <meshBasicMaterial color="#ffffff" />
    </mesh>
  </group>
);

export const Spout: React.FC<{f: number; head: V3; a: number; b: number}> = ({f, head, a, b}) => {
  if (f < a || f > b) return null;
  return (
    <group>
      {Array.from({length: 12}).map((_, k) => {
        const t = ((((f - a + k * 2.5) % 30) + 30) % 30) / 30;
        const ang = k * 2.4;
        return (
          <mesh key={k} position={[head[0] + Math.sin(ang) * 0.22 * t, head[1] + t * 0.9 - t * t * 0.35, head[2] + Math.cos(ang) * 0.22 * t]} scale={0.07 * (1 - t) + 0.01}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshPhysicalMaterial color="#9EC5FF" transmission={0.4} roughness={0.1} emissive="#6F8BFF" emissiveIntensity={0.6} />
          </mesh>
        );
      })}
    </group>
  );
};

export const ShockRing: React.FC<{t: number; color: string; position: V3; size?: number}> = ({t, color, position, size = 1}) => {
  if (t <= 0 || t >= 1) return null;
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} scale={size * (0.3 + 2.6 * t)}>
      <torusGeometry args={[1, 0.04, 8, 64]} />
      <meshBasicMaterial color={color} transparent opacity={1 - t} toneMapped={false} />
    </mesh>
  );
};
