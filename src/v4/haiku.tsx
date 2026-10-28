import React, {useMemo} from 'react';
import {RoundedBox} from '@react-three/drei';
import {V3, clamp01, easeOut, easeOutBack, jump, lerp, prog, rng, squash} from '../anim';
import {Character} from '../Characters';
import {Label, NUM, ShockRing} from '../common';
import {Sign, cellOf} from './calendar';
import {BEAT, BAR} from './timing';

// 10.07 格：两根等高价格柱。Haiku 落在新柱上，踩三拍蓄力，第二小节重拍跺脚，柱子塌到 25%。
export const C7 = cellOf(7);
export const LIFT = 0.25;
export const BASE = C7[1] + 0.06 + LIFT;
const H0 = 1.8;
const OLD_X = -0.38;
const NEW_X = 0.38;
export const LAND = BAR;
export const STOMP = 2 * BAR;
export const ORB_A = STOMP + 2 * BEAT;
export const ORB_B = 3 * BAR;
// v5 second beat: one extra bar inserted here (old local time) for the price receipt
export const INS = ORB_A;
const HAIKU_SCALE = 0.8;
const FACE = 0.38;

export const liftAt = (L: number) => LIFT * prog(L, 0, 20, easeOut);
const grow = (L: number) => H0 * prog(L, 8, 40, easeOut);
const newH = (L: number) => (L < STOMP ? grow(L) : lerp(H0, H0 * 0.25, clamp01(easeOutBack(clamp01((L - STOMP) / 16)))));
export const newTop = (L: number): V3 => [C7[0] + NEW_X, BASE + newH(L), C7[2]];

const haikuAt = (L: number) => {
  const top = BASE + newH(L);
  if (L < LAND - 24) return null;
  if (L < LAND) {
    const t = prog(L, LAND - 24, LAND, (x) => x * x);
    return {y: lerp(top + 5, top, t), tuck: 1 - t, sx: 1, sy: 1};
  }
  // anticipation hops on beats, the last one long and high, landing on the stomp
  const hops: [number, number, number][] = [
    [LAND, LAND + BEAT, 0.14],
    [LAND + BEAT, LAND + 2 * BEAT, 0.2],
    [LAND + 2 * BEAT, STOMP, 0.75],
  ];
  let y = top;
  let tuck = 0;
  for (const [a, b, h] of hops) {
    if (L >= a && L < b) {
      const t = (L - a) / (b - a);
      y += 4 * h * t * (1 - t);
      tuck = Math.sin(Math.PI * t) * (h > 0.5 ? 1 : 0.5);
    }
  }
  let [sx, sy] = squash(L, LAND, 14, 0.3);
  for (const [a] of hops.slice(1)) {
    const [hx, hy] = squash(L, a, 8, 0.15);
    sx *= hx;
    sy *= hy;
  }
  const [kx, ky] = squash(L, STOMP, 16, 0.5);
  return {y, tuck, sx: sx * kx, sy: sy * ky};
};

const PriceTag: React.FC<{at: V3; text: string; color: string; opacity: number}> = ({at, text, color, opacity}) => (
  <group position={at} rotation={[0, FACE, 0]}>
    <Label lines={[{t: text, size: 120, color, font: NUM, weight: 700}]} w={0.66} h={0.26} res={500} bg="rgba(12,14,22,0.82)" radius={0.13} opacity={opacity} />
  </group>
);

// v5 second beat: the price tag prints a receipt with the per-token prices, one line per beat.
const RECEIPT = [
  {t: 'Haiku 5.5 · API 价格', size: 64, color: '#7a3413', weight: 900, h: 0.15},
  {t: '输入  $0.10', size: 100, color: '#16181d', font: NUM, weight: 800, h: 0.19},
  {t: '输出  $0.50', size: 100, color: '#16181d', font: NUM, weight: 800, h: 0.19},
  {t: '每百万 tokens · ≤100K 提示', size: 52, color: '#5b5f6b', weight: 700, h: 0.14},
];
const PAD = 0.04;

const Receipt: React.FC<{R: number; fade: number}> = ({R, fade}) => {
  if (R < 0 || fade <= 0) return null;
  const shown = RECEIPT.map((_, i) => prog(R, i * BEAT, i * BEAT + 8, easeOut));
  const len = PAD * 2 + RECEIPT.reduce((s, l, i) => s + l.h * shown[i], 0);
  let off = PAD;
  return (
    <group position={[0, 0.13, -0.02]} rotation={[0, FACE, 0]}>
      <mesh position={[0, len / 2, 0]} renderOrder={-1}>
        <planeGeometry args={[0.62, len]} />
        <meshStandardMaterial color="#F4F1EA" emissive="#F4F1EA" emissiveIntensity={0.3} transparent opacity={fade} />
      </mesh>
      {RECEIPT.map((l, i) => {
        const y = len - off - l.h / 2;
        off += l.h * shown[i];
        if (shown[i] < 0.6) return null;
        return <Label key={i} lines={[{t: l.t, size: l.size, color: l.color, font: l.font, weight: l.weight}]} w={0.58} h={l.h} res={500} position={[0, y, 0.002]} opacity={fade} />;
      })}
    </group>
  );
};

const Bar: React.FC<{x: number; h: number; color: string; emissive: number}> = ({x, h, color, emissive}) => (
  <RoundedBox args={[0.62, Math.max(0.02, h), 0.62]} radius={0.04} smoothness={3} position={[C7[0] + x, BASE + Math.max(0.02, h) / 2, C7[2]]} castShadow receiveShadow>
    <meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={emissive} roughness={0.35} clearcoat={0.6} />
  </RoundedBox>
);

const Shards: React.FC<{L: number}> = ({L}) => {
  const parts = useMemo(() => {
    const r = rng(11);
    return Array.from({length: 22}).map(() => ({v: [(r() - 0.5) * 3.2, 1.4 + r() * 2.2, (r() - 0.5) * 2.6] as V3, s: 0.04 + r() * 0.06, rot: r() * 6}));
  }, []);
  const t = (L - STOMP) / 30;
  if (t < 0 || t > 1.5) return null;
  const top = BASE + H0;
  return (
    <group>
      {parts.map((p, k) => (
        <mesh key={k} position={[C7[0] + NEW_X + p.v[0] * t, Math.max(BASE, top + p.v[1] * t - 4.9 * t * t), C7[2] + p.v[2] * t]} rotation={[p.rot + t * 6, t * 4, 0]} scale={p.s} castShadow>
          <boxGeometry />
          <meshStandardMaterial color="#FF9F6E" emissive="#FF7A3D" emissiveIntensity={1.6 * (1 - t / 1.5)} />
        </mesh>
      ))}
    </group>
  );
};

// A glowing chip of the broken bar bounces off toward the next date (10.13): the hand-off to the next act.
export const Orb: React.FC<{L: number; to: V3}> = ({L, to}) => {
  if (L < ORB_A || L > ORB_B + 2) return null;
  const from = newTop(ORB_A);
  const at = (l: number) => jump([from[0], from[1] + 0.1, from[2]], [to[0], to[1] + 0.1, to[2]], prog(l, ORB_A, ORB_B, (x) => x), 1.3);
  return (
    <group>
      {[0, 2, 4, 6, 8].map((d, k) => {
        if (L - d < ORB_A) return null;
        const p = at(L - d);
        return (
          <mesh key={k} position={p} scale={0.11 * (1 - k * 0.17)}>
            <sphereGeometry args={[1, 16, 12]} />
            <meshBasicMaterial color="#FFB07A" toneMapped={false} transparent opacity={1 - k * 0.18} />
          </mesh>
        );
      })}
      <pointLight position={at(L)} intensity={3} distance={2.5} color="#FF9F6E" />
    </group>
  );
};

export const HaikuCell: React.FC<{L: number; Ln: number; frame: number; cheer?: number}> = ({L, Ln, frame, cheer = 0}) => {
  const nh = newH(L);
  const pct = L < STOMP ? 100 : Math.round(lerp(100, 25, clamp01((L - STOMP) / 16)));
  const big = clamp01(easeOutBack(prog(L, STOMP + 2, STOMP + 14, (x) => x))) * (1 - prog(Ln, INS, INS + 8));
  const h = haikuAt(L);
  const spin = Math.PI * 2 * prog(L, STOMP + 3 * BEAT, STOMP + 3 * BEAT + 20);
  const op = prog(L, 26, 36);
  const tagOp = op * (1 - prog(L, ORB_B, ORB_B + 10));
  return (
    <group>
      <Bar x={OLD_X} h={grow(L)} color="#5b5f6b" emissive={0.05} />
      <Bar x={NEW_X} h={nh} color="#EBA57F" emissive={0.25 + 0.8 * (1 - prog(L, STOMP, STOMP + 20))} />
      {/* version on the bar faces */}
      <Label lines={[{t: '4.5', size: 80, color: '#e3e6ec', font: NUM, weight: 700}]} w={0.5} h={0.2} res={500} position={[C7[0] + OLD_X, BASE + 0.15, C7[2] + 0.315]} opacity={op} />
      <Label lines={[{t: '5.5', size: 80, color: '#5a230c', font: NUM, weight: 700}]} w={0.5} h={0.2} res={500} position={[C7[0] + NEW_X, BASE + 0.15, C7[2] + 0.315]} opacity={op} />
      {/* price tags: old one sits on its bar, new one rides beside the falling bar top */}
      <PriceTag at={[C7[0] + OLD_X, BASE + grow(L) + 0.2, C7[2]]} text="100%" color="#e3e6ec" opacity={tagOp} />
      <group position={[C7[0] + NEW_X + 0.31, BASE + Math.max(0.3, nh - 0.12), C7[2] + 0.12]}>
        <mesh position={[0.17, 0, 0]}>
          <boxGeometry args={[0.34, 0.012, 0.012]} />
          <meshBasicMaterial color={L < STOMP ? '#e3e6ec' : '#FF9F6E'} toneMapped={false} transparent opacity={tagOp} />
        </mesh>
        <PriceTag at={[0.68, 0, 0]} text={`${pct}%`} color={L < STOMP ? '#ffffff' : '#FF9F6E'} opacity={tagOp} />
        <group position={[0.68, 0, 0]}>
          <Receipt R={Ln - INS} fade={1 - prog(L, ORB_B, ORB_B + 10)} />
        </group>
      </group>
      {big > 0.01 && (
        <group position={[C7[0] + NEW_X + 0.35, BASE + 1.55 + 0.04 * Math.sin(Ln * 0.15), C7[2] + 0.1]} rotation={[0, FACE, 0]} scale={big}>
          <Label lines={[{t: '-75%', size: 220, color: '#FFB27F', font: NUM, weight: 700}]} w={1.5} h={0.62} res={500} glow="#FF5A1F" />
          <Label lines={[{t: '平均成本 vs Haiku 4.5', size: 60, color: '#ffd9c4', weight: 700}]} w={1.5} h={0.18} res={500} position={[0, -0.36, 0]} />
        </group>
      )}
      <ShockRing t={(Ln - STOMP) / 12} color="#FF9F6E" position={[C7[0] + NEW_X, BASE + H0 + 0.02, C7[2]]} size={0.35} />
      <ShockRing t={(Ln - STOMP - 10) / 20} color="#FF9F6E" position={[C7[0], C7[1] + 0.08, C7[2]]} />
      <Shards L={Ln} />
      {h && (
        <group position={[C7[0] + NEW_X, h.y + cheer, C7[2]]} rotation={[0, 0.3 + spin, 0]} scale={HAIKU_SCALE}>
          <Character kind="haiku" frame={frame} sx={h.sx} sy={h.sy} tuck={h.tuck} expression={L > STOMP ? 'happy' : L > LAND + 2 * BEAT ? 'wow' : 'normal'} />
        </group>
      )}
      <Sign at={[C7[0] - 1.85, C7[1], C7[2] + 0.05]} f={L} a={18} date="10.07" name="Claude Haiku 5.5" maker="ANTHROPIC" accent="#FF9F6E" rotY={0.5} b={ORB_B} />
    </group>
  );
};
