import React, {useMemo} from 'react';
import {RoundedBox} from '@react-three/drei';
import * as THREE from 'three';
import {V3, clamp01, easeOutBack, jump, lerp, prog, rng, squash} from '../anim';
import {Whale} from '../Characters';
import {Label, NUM, ShockRing, Spout, useDisc} from '../common';
import {Sign, cellOf} from './calendar';
import {ACT3, BAR, BEAT} from './timing';

// 10.17 格：玻璃水箱。GPT 的水管灌满水，蓝鲸在里面绕圈，第二小节重拍撞开 MIT 锁，
// 第三小节骑上跑分柱从 31.2 冲到 42.3，最后一拍喷水，水柱划弧线落到 21 号格的窗上。
export const C17 = cellOf(17);
const SURF = C17[1] + 0.06;
const TW = 1.3;
const TH = 1.05;
export const BUMP = BAR;
export const OPEN = BAR + BEAT;
export const RIDE = BAR + 2 * BEAT;
export const GROW_A = 2 * BAR;
export const GROW_B = 2 * BAR + 2 * BEAT;
export const SPOUT = 2 * BAR + 3 * BEAT;
// v5 second beat: one bar inserted before the spout, a flat price bar rises next to the score bar
export const INS = SPOUT;
export const SPLASH = ACT3 + 14; // 水柱落到 21 号格的窗上（下一幕的本地帧 14）
const LOCK: V3 = [C17[0] - 0.33, SURF, C17[2] + 0.22];
const BAR_P: V3 = [C17[0] + 0.36, SURF, C17[2] - 0.15];
const K = 0.03;
const WHALE_S = 0.3;
const C21 = cellOf(21);
export const WINDOW: V3 = [C21[0] - 0.25, C21[1] + 0.06 + 0.55, C21[2] - 0.68];

export const score = (L: number) => lerp(31.2, 42.3, prog(L, GROW_A, GROW_B));
const water = (L: number) => TH * 0.86 * prog(L, -10, 34);

const whaleAt = (L: number): {pos: V3; rotY: number; sx: number; sy: number} => {
  const y0 = SURF + 0.22;
  const swim = (l: number): V3 => {
    const a = -0.6 + l * 0.07;
    return [C17[0] + 0.05 + 0.28 * Math.cos(a), y0 + 0.04 * Math.sin(l * 0.15), C17[2] + 0.05 + 0.3 * Math.sin(a)];
  };
  if (L < BUMP - 10) {
    const p = swim(L);
    const q = swim(L + 1);
    return {pos: p, rotY: Math.atan2(q[0] - p[0], q[2] - p[2]), sx: 1, sy: 1};
  }
  if (L < RIDE) {
    // dart at the lock, bonk, back off
    const from = swim(BUMP - 10);
    const hit: V3 = [LOCK[0] + 0.3, y0, LOCK[2] + 0.02];
    const t = prog(L, BUMP - 10, BUMP, (x) => x * x);
    const back = prog(L, BUMP, BUMP + 10);
    const [sx, sy] = squash(L, BUMP, 10, 0.3);
    const p: V3 = [lerp(from[0], hit[0], t) + 0.15 * back, y0, lerp(from[2], hit[2], t)];
    return {pos: p, rotY: lerp(-Math.PI / 2, -Math.PI / 2 + 0.6, back), sx, sy};
  }
  const top = SURF + score(L) * K;
  if (L < RIDE + 12) {
    const t = prog(L, RIDE, RIDE + 12, (x) => x);
    return {pos: jump([LOCK[0] + 0.45, y0, LOCK[2]], [BAR_P[0], top, BAR_P[2]], t, 0.5), rotY: lerp(-1, 0.3, t), sx: 1, sy: 1};
  }
  const [sx, sy] = squash(L, RIDE + 12, 12, 0.3);
  const [gx, gy] = squash(L, GROW_B, 12, 0.25);
  return {pos: [BAR_P[0], top, BAR_P[2]], rotY: 0.3, sx: sx * gx, sy: sy * gy};
};

const Padlock: React.FC<{L: number}> = ({L}) => {
  const wob = L > BUMP && L < OPEN ? 0.08 * Math.sin(L * 2.5) : 0;
  const open = clamp01(easeOutBack(prog(L, OPEN, OPEN + 12, (x) => x)));
  const glow = 0.2 + 1.6 * prog(L, OPEN, OPEN + 8);
  return (
    <group position={LOCK} rotation={[0, 0.25, wob]} scale={0.3}>
      <RoundedBox args={[1.5, 1.25, 0.55]} radius={0.12} smoothness={4} position={[0, 0.63, 0]} castShadow>
        <meshPhysicalMaterial color="#C9D3F5" metalness={0.8} roughness={0.25} clearcoat={1} emissive="#4D6BFE" emissiveIntensity={glow * 0.25} />
      </RoundedBox>
      <Label lines={[{t: 'MIT', size: 200, color: '#ffffff', font: NUM, weight: 900}, {t: '开源权重', size: 64, color: '#DCE5FF'}]} w={1.4} h={1.1} position={[0, 0.63, 0.285]} glow={glow > 0.5 ? '#6F8BFF' : undefined} />
      <group position={[-0.38, 1.25 + 0.35 * open, 0]} rotation={[0, -1.6 * open, 0]}>
        <mesh position={[0.38, 0.32, 0]}>
          <torusGeometry args={[0.38, 0.09, 16, 40, Math.PI]} />
          <meshPhysicalMaterial color="#E6EAF5" metalness={0.9} roughness={0.2} />
        </mesh>
        {[0, 0.76].map((x) => (
          <mesh key={x} position={[x, 0.12, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 0.42, 16]} />
            <meshPhysicalMaterial color="#E6EAF5" metalness={0.9} roughness={0.2} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

const Tank: React.FC<{L: number}> = ({L}) => {
  const w = water(L);
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(TW, TH, TW)), []);
  return (
    <group position={[C17[0], SURF, C17[2]]}>
      <mesh position={[0, TH / 2, 0]}>
        <boxGeometry args={[TW, TH, TW]} />
        <meshPhysicalMaterial color="#BFD4FF" transparent opacity={0.12} roughness={0.05} clearcoat={1} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments position={[0, TH / 2, 0]} geometry={edges}>
        <lineBasicMaterial color="#9EC5FF" transparent opacity={0.7} />
      </lineSegments>
      {w > 0.01 && (
        <mesh position={[0, w / 2, 0]}>
          <boxGeometry args={[TW - 0.04, w, TW - 0.04]} />
          <meshPhysicalMaterial color="#2f62e6" emissive="#1d3fb0" emissiveIntensity={0.5} transparent opacity={0.38} roughness={0.1} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
};

const Bubbles: React.FC<{L: number}> = ({L}) => {
  const disc = useDisc();
  const bs = useMemo(() => {
    const r = rng(17);
    return Array.from({length: 18}).map(() => ({x: (r() - 0.5) * (TW - 0.2), z: (r() - 0.5) * (TW - 0.2), o: r(), s: 0.02 + r() * 0.03, sp: 0.01 + r() * 0.012}));
  }, []);
  const w = water(L);
  if (w < 0.1) return null;
  return (
    <group>
      {bs.map((b, k) => (
        <sprite key={k} position={[C17[0] + b.x, SURF + ((b.o + L * b.sp) % 1) * w, C17[2] + b.z]} scale={b.s * 3}>
          <spriteMaterial map={disc} color="#9EC5FF" transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      ))}
    </group>
  );
};

// The whale's spout flies as an arc of droplets from 17 to the window of the bedroom on 21.
export const WaterArc: React.FC<{L: number}> = ({L}) => {
  if (L < SPOUT + 4 || L > SPLASH + 10) return null;
  const head: V3 = [BAR_P[0], SURF + score(GROW_B) * K + 0.4, BAR_P[2]];
  return (
    <group>
      {Array.from({length: 16}).map((_, k) => {
        const t = prog(L - k * 0.8, SPOUT + 4, SPLASH, (x) => x);
        if (t <= 0 || t >= 1) return null;
        return (
          <mesh key={k} position={jump(head, WINDOW, t, 2.2)} scale={0.07 * (1 - k / 20)}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshPhysicalMaterial color="#9EC5FF" emissive="#6F8BFF" emissiveIntensity={1.2} roughness={0.1} />
          </mesh>
        );
      })}
    </group>
  );
};

// v5 second beat: capability went up, the API price bar stays flat.
const PriceBar: React.FC<{R: number; fade: number}> = ({R, fade}) => {
  if (R < 0 || fade <= 0) return null;
  const h = 0.55 * clamp01(easeOutBack(prog(R, 0, 12, (x) => x)));
  const lab = prog(R, 6, 14) * fade;
  const arrow = clamp01(easeOutBack(prog(R, BEAT, BEAT + 10, (x) => x))) * fade;
  return (
    <group>
      <RoundedBox args={[0.2, Math.max(0.02, h), 0.2]} radius={0.03} smoothness={3} position={[C17[0] + 0.9, SURF + Math.max(0.02, h) / 2, BAR_P[2] + 0.15]} castShadow>
        <meshPhysicalMaterial color="#9aa2b4" emissive="#9aa2b4" emissiveIntensity={0.25} roughness={0.35} clearcoat={0.6} transparent opacity={fade} />
      </RoundedBox>
      <group position={[C17[0] + 0.9, SURF + 0.55 + 0.2, BAR_P[2] + 0.25]} rotation={[0, -0.2, 0]}>
        <Label lines={[{t: 'API 价格', size: 70, color: '#C9D0DE', weight: 700}, {t: '不变', size: 96, color: '#ffffff', weight: 800}]} w={0.6} h={0.3} res={500} bg="rgba(20,24,34,0.8)" radius={0.06} opacity={lab} />
      </group>
      {arrow > 0.01 && (
        <group position={[C17[0] - 0.2, SURF + 1.6, C17[2] + 0.35]} rotation={[0, -0.2, 0]} scale={arrow}>
          <Label lines={[{t: '↑ 能力 · → 价格', size: 100, color: '#ffffff', weight: 800}]} w={1.3} h={0.26} res={500} bg="rgba(22,40,110,0.88)" radius={0.12} glow="#6F8BFF" />
        </group>
      )}
    </group>
  );
};

export const DeepSeekCell: React.FC<{L: number; Ln: number; frame: number; cheer?: number}> = ({L, Ln, frame, cheer = 0}) => {
  const s = score(L);
  const w = whaleAt(L);
  const num = prog(L, RIDE, RIDE + 8) * (1 - prog(L, ACT3 + 20, ACT3 + 30));
  // the whale bobs on top of the bar while the price beat plays
  const bob = Ln >= INS && Ln < INS + BAR ? 0.04 * Math.sin(((Ln - INS) * Math.PI) / BEAT) ** 2 : 0;
  return (
    <group>
      <Tank L={L} />
      <Bubbles L={Ln} />
      <Padlock L={L} />
      <ShockRing t={(L - OPEN) / 14} color="#8AB4FF" position={[LOCK[0], SURF + 0.6, LOCK[2]]} size={0.35} />
      {/* score bar: ghost = old score, solid = new */}
      <mesh position={[BAR_P[0] + 0.24, SURF + (31.2 * K) / 2, BAR_P[2]]} visible={Ln < INS + 8}>
        <boxGeometry args={[0.16, 31.2 * K, 0.16]} />
        <meshStandardMaterial color="#6F8BFF" transparent opacity={0.25 * (1 - prog(Ln, INS, INS + 8))} />
      </mesh>
      <RoundedBox args={[0.3, s * K, 0.3]} radius={0.03} smoothness={3} position={[BAR_P[0], SURF + (s * K) / 2, BAR_P[2]]} castShadow>
        <meshPhysicalMaterial color="#4D6BFE" emissive="#4D6BFE" emissiveIntensity={0.3 + 0.9 * prog(L, GROW_A, GROW_B)} roughness={0.3} clearcoat={0.7} />
      </RoundedBox>
      <group position={[BAR_P[0] + 0.85, SURF + s * K + 0.05, BAR_P[2] + 0.2]} rotation={[0, -0.35, 0]}>
        <Label lines={[{t: s.toFixed(1), size: 150, color: '#ffffff', font: NUM, weight: 800}]} w={0.9} h={0.36} res={500} glow="#6F8BFF" opacity={num} />
        <Label lines={[{t: 'Terminal-Bench 4.0', size: 54, color: '#9fb4ff', font: NUM}]} w={1.0} h={0.14} res={500} position={[0, -0.24, 0]} opacity={num} />
      </group>
      <PriceBar R={Ln - INS} fade={1 - prog(L, ACT3 + 20, ACT3 + 30)} />
      <group position={[w.pos[0], w.pos[1] + cheer + bob, w.pos[2]]} rotation={[0, w.rotY, 0]} scale={WHALE_S}>
        <Whale frame={frame} sx={w.sx} sy={w.sy} expression={L > BUMP && L < RIDE ? 'wow' : L > RIDE + 12 ? 'happy' : 'normal'} blinkOffset={9} />
      </group>
      <Spout f={L} head={[w.pos[0], w.pos[1] + 0.92 * WHALE_S, w.pos[2]]} a={SPOUT} b={SPOUT + 16} />
      <WaterArc L={L} />
      <Sign at={[C17[0] + 0.7, C17[1], C17[2] - 1.75]} f={L} a={16} b={ACT3} date="10.17" name="DeepSeek V4.1 Flash" maker="DEEPSEEK" accent="#6F8BFF" rotY={-0.25} />
    </group>
  );
};
