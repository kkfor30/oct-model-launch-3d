import React, {useMemo} from 'react';
import {RoundedBox} from '@react-three/drei';
import * as THREE from 'three';
import {V3, clamp01, easeInOut, easeOutBack, lerp, prog, rng, squash} from '../anim';
import {Eyes, blinkAt} from '../Characters';
import {Label, NUM, ShockRing} from '../common';
import {Sign, cellOf} from './calendar';
import {BAR, BEAT} from './timing';

// 10.24 格：浮着一个暗面朝外、睡着的月亮。光点在第 1 拍打中它，月亮自转 180°，
// 第二小节重拍亮面正对镜头、睁眼升起（全片高潮）；卫星高速绕行（Highspeed），
// 第三小节重拍礼物盒落下，挂着「11.4 前开源」。
export const C24 = cellOf(24);
const SURF = C24[1] + 0.06;
export const HIT = BEAT;
export const FLIP = BAR;
export const SAT_A = BAR + BEAT;
export const BIG_A = BAR + 2 * BEAT;
export const GIFT = 2 * BAR;
// v5 second beat: one bar inserted a beat before the gift drops, for the MoE cube
export const INS = 2 * BAR - BEAT;
const R = 0.42;
const Y0 = SURF + 0.62;
const Y1 = SURF + 0.95;

export const moonY = (L: number) => lerp(Y0, Y1, clamp01(easeOutBack(prog(L, FLIP - 4, FLIP + 12, (x) => x)))) + 0.04 * Math.sin(L * 0.1);

const KimiMoon: React.FC<{L: number; frame: number; cheer: number}> = ({L, frame, cheer}) => {
  const wob = Math.exp(-Math.max(0, L - HIT) / 8) * (L >= HIT ? 0.25 * Math.sin((L - HIT) * 1.2) : 0);
  const rotY = Math.PI * (1 - prog(L, HIT + 4, FLIP, easeInOut)) + wob;
  const lit = prog(L, FLIP - 6, FLIP + 4);
  const [sx, sy] = squash(L, FLIP, 14, 0.18);
  return (
    <group position={[C24[0], moonY(L) + cheer, C24[2]]} rotation={[0, rotY, 0]} scale={[sx, sy, sx]}>
      {/* lit hemisphere faces +z, dark one faces -z */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <sphereGeometry args={[R, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#D9DCE6" roughness={0.85} emissive="#E9DDFF" emissiveIntensity={0.03 + 0.14 * lit} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <sphereGeometry args={[R, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#1B1E26" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {(
        [
          [0.22, 0.2, 0.06],
          [-0.24, -0.16, 0.05],
          [0.12, -0.26, 0.045],
        ] as V3[]
      ).map(([x, y, cr], k) => (
        <mesh key={k} position={[x, y, Math.sqrt(R * R - x * x - y * y) - 0.012]} scale={[1, 1, 0.3]}>
          <sphereGeometry args={[cr, 16, 10]} />
          <meshStandardMaterial color="#C9CCD8" roughness={0.9} />
        </mesh>
      ))}
      <Eyes
        spec={{x: 0.12, y: 0.03, z: R - 0.01, w: 0.07, h: 0.12, ink: '#2A2D36', cheeks: true}}
        expression={L < FLIP - 2 ? 'sleep' : L < FLIP + 20 ? 'wow' : 'happy'}
        blink={blinkAt(frame, 3)}
      />
    </group>
  );
};

const Satellite: React.FC<{L: number}> = ({L}) => {
  const s = clamp01(easeOutBack(prog(L, SAT_A, SAT_A + 10, (x) => x)));
  if (s <= 0.01) return null;
  const a = (L - SAT_A) * 0.28; // ~2.5× the moon's lazy pace
  const orbit = 0.78;
  const y = moonY(L);
  const tilt = 0.35;
  const p: V3 = [C24[0] + orbit * Math.cos(a), y + orbit * Math.sin(a) * Math.sin(tilt), C24[2] + orbit * Math.sin(a) * Math.cos(tilt)];
  return (
    <group>
      <mesh position={[C24[0], y, C24[2]]} rotation={[Math.PI / 2 - tilt, 0, 0]} scale={s}>
        <torusGeometry args={[orbit, 0.006, 6, 96]} />
        <meshBasicMaterial color="#C9A7FF" transparent opacity={0.5} toneMapped={false} />
      </mesh>
      {[0, 0.12, 0.24, 0.36].map((d, k) => {
        const b = a - d;
        return (
          <mesh key={k} position={[C24[0] + orbit * Math.cos(b), y + orbit * Math.sin(b) * Math.sin(tilt), C24[2] + orbit * Math.sin(b) * Math.cos(tilt)]} scale={s * 0.05 * (1 - k * 0.22)}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshBasicMaterial color="#E4D4FF" toneMapped={false} transparent opacity={k === 0 ? 1 : 0.5 - k * 0.1} />
          </mesh>
        );
      })}
      <group position={p} rotation={[0, a, 0.4]} scale={s}>
        {[-1, 1].map((sd) => (
          <mesh key={sd} position={[sd * 0.09, 0, 0]}>
            <boxGeometry args={[0.1, 0.005, 0.05]} />
            <meshStandardMaterial color="#5b6cff" emissive="#7C8BFF" emissiveIntensity={0.8} />
          </mesh>
        ))}
      </group>
      <Label lines={[{t: 'Highspeed 版 · 快 2–3 倍', size: 64, color: '#E4D4FF', weight: 700}]} w={1.3} h={0.17} res={500} position={[C24[0], SURF + 0.12, C24[2] + 0.62]} rotation={[-0.6, 0, 0]} opacity={s} />
    </group>
  );
};

const Gift: React.FC<{L: number}> = ({L}) => {
  if (L < GIFT - 10) return null;
  const t = prog(L, GIFT - 10, GIFT, (x) => x * x);
  const [sx, sy] = squash(L, GIFT, 12, 0.3);
  const tag = clamp01(easeOutBack(prog(L, GIFT + 4, GIFT + 14, (x) => x)));
  const at: V3 = [C24[0] + 0.5, lerp(SURF + 2.2, SURF, t), C24[2] - 0.4];
  return (
    <group position={at} rotation={[0, -0.4, 0]} scale={[sx, sy, sx]}>
      <RoundedBox args={[0.3, 0.26, 0.3]} radius={0.03} smoothness={3} position={[0, 0.13, 0]} castShadow>
        <meshPhysicalMaterial color="#8C6CFF" roughness={0.35} clearcoat={0.8} />
      </RoundedBox>
      {[0, Math.PI / 2].map((r) => (
        <mesh key={r} position={[0, 0.13, 0]} rotation={[0, r, 0]}>
          <boxGeometry args={[0.31, 0.27, 0.05]} />
          <meshStandardMaterial color="#FFD08A" emissive="#FFB65C" emissiveIntensity={0.4} />
        </mesh>
      ))}
      <group position={[0.42, 0.42, 0.1]} rotation={[0, 0.3, 0]} scale={tag}>
        <Label lines={[{t: '11.4 前开源', size: 90, color: '#1a1030', weight: 900}]} w={0.72} h={0.22} res={500} bg="rgba(255,214,150,0.95)" radius={0.11} />
      </group>
    </group>
  );
};

// v5 second beat: 2.8T parameters as a 5×5×5 cube of small blocks; every beat a different ~4%
// of them light up (1040 亿 active of 2.8 万亿).
const MOE_N = 5;
const MOE_GAP = 0.11;
// only blocks on the faces the camera sees (front, top, right) light up
const MOE_FACE = Array.from({length: MOE_N ** 3}, (_, i) => i).filter((i) => i % MOE_N === MOE_N - 1 || Math.floor(i / MOE_N) % MOE_N === MOE_N - 1 || Math.floor(i / MOE_N ** 2) === MOE_N - 1);
const MoeCube: React.FC<{R: number; fade: number}> = ({R, fade}) => {
  const {geo, dim, glow} = useMemo(
    () => ({
      geo: new THREE.BoxGeometry(0.088, 0.088, 0.088),
      dim: new THREE.MeshStandardMaterial({color: '#5A5478', emissive: '#2A2440', emissiveIntensity: 0.4, roughness: 0.5, transparent: true}),
      glow: new THREE.MeshStandardMaterial({color: '#B48CFF', emissive: '#9B6BFF', emissiveIntensity: 2.4, roughness: 0.3, transparent: true}),
    }),
    []
  );
  const s = clamp01(easeOutBack(prog(R, 0, 12, (x) => x))) * fade;
  if (R < 0 || s <= 0.01) return null;
  const r = rng(31 + 7 * Math.floor(R / BEAT));
  const lit = new Set(Array.from({length: 5}, () => MOE_FACE[Math.floor(r() * MOE_FACE.length)]));
  dim.opacity = fade;
  glow.opacity = fade;
  const half = ((MOE_N - 1) * MOE_GAP) / 2;
  return (
    <group position={[C24[0] - 1.25, SURF + half + 0.06, C24[2] - 0.6]} rotation={[0, 0.35 + 0.004 * R, 0]} scale={s}>
      {Array.from({length: MOE_N ** 3}, (_, i) => (
        <mesh
          key={i}
          geometry={geo}
          material={R >= 6 && lit.has(i) ? glow : dim}
          position={[(i % MOE_N) * MOE_GAP - half, (Math.floor(i / MOE_N) % MOE_N) * MOE_GAP - half, Math.floor(i / MOE_N ** 2) * MOE_GAP - half]}
        />
      ))}
    </group>
  );
};

export const KimiCell: React.FC<{L: number; Ln: number; frame: number; cheer?: number}> = ({L, Ln, frame, cheer = 0}) => {
  const big = clamp01(easeOutBack(prog(L, BIG_A, BIG_A + 12, (x) => x))) * (1 - prog(L, 3 * BAR - 6, 3 * BAR + 4));
  const flash = L >= FLIP ? Math.exp(-(L - FLIP) / 10) : 0;
  return (
    <group>
      <KimiMoon L={Ln} frame={frame} cheer={cheer} />
      <pointLight position={[C24[0], moonY(Ln) + 0.2, C24[2] + 0.8]} intensity={0.4 + 3 * flash + 0.6 * prog(L, FLIP, FLIP + 10)} distance={3.5} color="#E4D4FF" />
      <ShockRing t={(Ln - HIT) / 12} color="#FFC59A" position={[C24[0], moonY(HIT), C24[2]]} size={0.25} />
      <ShockRing t={(Ln - FLIP) / 20} color="#C9A7FF" position={[C24[0], SURF + 0.03, C24[2]]} size={0.7} />
      <ShockRing t={(Ln - FLIP - 4) / 26} color="#C9A7FF" position={[C24[0], SURF + 0.03, C24[2]]} size={1.3} />
      <Satellite L={Ln} />
      <MoeCube R={Ln - INS} fade={1 - prog(L, 3 * BAR - 6, 3 * BAR + 4)} />
      <Gift L={L} />
      {big > 0.01 && (
        <group position={[C24[0] - 1.25, SURF + 1.15 + 0.04 * Math.sin(Ln * 0.15), C24[2] - 0.2]} rotation={[0, 0.35, 0]} scale={big}>
          <Label lines={[{t: '2.8T', size: 220, color: '#F1E8FF', font: NUM, weight: 700}]} w={1.3} h={0.6} res={500} glow="#9B6BFF" />
          <Label lines={[{t: Ln >= INS ? '每次只激活其中 1040 亿' : '2.8 万亿参数 · 1M 上下文', size: 60, color: Ln >= INS ? '#ffffff' : '#E4D4FF', weight: 700}]} w={1.5} h={0.18} res={500} bg={Ln >= INS ? 'rgba(14,10,28,0.8)' : undefined} radius={0.09} position={[0, -0.36, 0]} />
        </group>
      )}
      <Sign at={[C24[0] + 1.15, C24[1], C24[2] - 1.2]} f={L} a={FLIP + 4} b={3 * BAR} date="10.24" name="Kimi K3.1 Pro" maker="MOONSHOT AI" accent="#C9A7FF" rotY={-0.35} />
    </group>
  );
};
