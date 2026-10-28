import React from 'react';
import {RoundedBox} from '@react-three/drei';
import {V3, clamp01, easeInOut, easeOutBack, lerp, prog, squash} from '../anim';
import {GeminiStar, GptBot} from '../Characters';
import {Label, NUM, ShockRing} from '../common';
import {CELL, Sign, cellOf} from './calendar';
import {ACT3, BAR, BEAT} from './timing';

// 10.13 格：星星从格子里升起，第二小节沿 13→15 号格冲刺，身后的跑道一格格点亮，
// 第三小节重拍急停，GA 印章砸下；冲击波把 16 号格睡着的 GPT 震醒（下一幕的接力）。
export const C13 = cellOf(13);
const C14 = cellOf(14);
export const C15 = cellOf(15);
export const C16 = cellOf(16);
export const TOP_Y = C13[1] + 0.06;
export const DASH_A = BAR;
export const STOP = 2 * BAR;
export const WAKE = 2 * BAR + 2 * BEAT;
// v5 second beat: one extra bar inserted before GPT wakes, for the half-price tag
export const INS = WAKE;
const LANE_Y = TOP_Y + 0.13;
const X0 = C13[0];
const X1 = C15[0];
const TILES = 12;
const STAR_SCALE = 0.55;
const FACE = 0.3;

export const starX = (L: number) => lerp(X0, X1, prog(L, DASH_A, STOP, easeInOut));

const gradient = (t: number) => {
  const stops = ['#4C8DF6', '#9B72F2', '#E56F8C'];
  return t < 0.5 ? stops[0] : t < 0.85 ? stops[1] : stops[2];
};

const Lane: React.FC<{L: number}> = ({L}) => {
  const show = prog(L, DASH_A - 10, DASH_A + 4);
  if (show <= 0) return null;
  const x = starX(L);
  const len = (X1 - X0 + CELL * 0.6) / TILES;
  return (
    <group>
      {Array.from({length: TILES}).map((_, k) => {
        const tx = X0 - CELL * 0.3 + (k + 0.5) * len;
        const lit = clamp01((x - tx) / 0.25 + 0.5);
        const flash = Math.exp(-Math.abs(x - tx) * 3);
        return (
          <mesh key={k} position={[tx, LANE_Y, C13[2]]} scale={[1, 1, show]}>
            <boxGeometry args={[len * 0.84, 0.03, 0.62]} />
            <meshBasicMaterial color={lit > 0 ? gradient(k / TILES) : '#1a1d2e'} toneMapped={false} transparent opacity={0.25 + 0.75 * lit} />
            {flash > 0.05 && <pointLight intensity={2 * flash} distance={1.2} color={gradient(k / TILES)} />}
          </mesh>
        );
      })}
    </group>
  );
};

const SpeedLines: React.FC<{L: number}> = ({L}) => {
  const amt = Math.sin(Math.PI * prog(L, DASH_A, STOP, (t) => t));
  if (amt < 0.05) return null;
  const x = starX(L);
  return (
    <group>
      {Array.from({length: 14}).map((_, k) => {
        const y = LANE_Y + 0.2 + ((k * 0.37) % 1) * 0.9;
        const z = C13[2] - 0.5 + ((k * 0.61) % 1) * 1.0;
        const off = ((k * 0.53 + L * 0.08) % 1) * 1.6;
        return (
          <mesh key={k} position={[x - 0.4 - off, y, z]} scale={[0.5 * amt, 0.008, 0.008]}>
            <boxGeometry />
            <meshBasicMaterial color="#C9D6FF" transparent opacity={0.6 * amt} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
};

const Stamp: React.FC<{L: number}> = ({L}) => {
  if (L < STOP - 10) return null;
  const t = prog(L, STOP - 10, STOP, (x) => x * x);
  const [sx, sy] = squash(L, STOP, 12, 0.25);
  return (
    <group position={[C14[0] + 0.1, lerp(4, TOP_Y, t), C14[2] - 0.35]} rotation={[0, FACE, 0]} scale={[sx, sy, sx]}>
      <RoundedBox args={[1.1, 0.78, 0.26]} radius={0.08} smoothness={4} position={[0, 0.39, 0]} castShadow>
        <meshPhysicalMaterial color="#1a1d2e" roughness={0.3} clearcoat={1} emissive="#4C8DF6" emissiveIntensity={0.3} />
      </RoundedBox>
      <Label lines={[{t: 'GA', size: 200, color: '#ffffff', font: NUM, weight: 700}, {t: '正式可用', size: 64, color: '#C9D6FF'}]} w={1.0} h={0.7} res={500} position={[0, 0.39, 0.135]} glow="#8AB4FF" />
    </group>
  );
};

// v5 second beat: above the GA stamp a price card flips from $4 / $20 to the limited-time $2 / $10,
// then an hourglass says when the discount ends.
const PriceFlip: React.FC<{R: number; fade: number}> = ({R, fade}) => {
  if (R < 0 || fade <= 0) return null;
  const s = clamp01(easeOutBack(prog(R, 0, 10, (x) => x))) * fade;
  const flip = Math.PI * prog(R, BEAT, BEAT + 10, easeInOut);
  const glass = clamp01(easeOutBack(prog(R, 2 * BEAT, 2 * BEAT + 10, (x) => x))) * fade;
  return (
    <group position={[C14[0] + 0.1, TOP_Y + 1.38, C14[2] - 0.35]} rotation={[0, FACE, 0]}>
      <group rotation={[0, flip, 0]} scale={s}>
        {flip < Math.PI / 2 && <Label lines={[{t: '$4 / $20', size: 150, color: '#9aa2b4', font: NUM, weight: 700}, {t: '原价 · 每百万 tokens', size: 56, color: '#9aa2b4'}]} w={1.0} h={0.5} res={500} bg="rgba(12,14,22,0.85)" radius={0.08} />}
        {flip >= Math.PI / 2 && <group rotation={[0, Math.PI, 0]}>
          <Label lines={[{t: '$2 / $10', size: 150, color: '#ffffff', font: NUM, weight: 800}, {t: '限时半价', size: 64, color: '#C9D6FF', weight: 800}]} w={1.0} h={0.5} res={500} bg="rgba(20,40,96,0.92)" radius={0.08} glow="#8AB4FF" />
        </group>}
      </group>
      {glass > 0.01 && (
        <group position={[0, -0.44, 0]} scale={glass}>
          <group position={[-0.42, 0, 0.02]} rotation={[0, 0, Math.PI * prog(R, 2 * BEAT + 6, 3 * BEAT, easeInOut)]}>
            {[1, -1].map((sy) => (
              <mesh key={sy} position={[0, 0.045 * sy, 0]} rotation={[sy > 0 ? Math.PI : 0, 0, 0]}>
                <coneGeometry args={[0.04, 0.09, 16]} />
                <meshPhysicalMaterial color="#FFD08A" emissive="#FFB65C" emissiveIntensity={0.5} roughness={0.2} transparent opacity={0.85} />
              </mesh>
            ))}
          </group>
          <Label lines={[{t: '12.1 起恢复原价', size: 70, color: '#FFD08A', weight: 800}]} w={0.75} h={0.16} res={500} position={[0.08, 0, 0]} />
        </group>
      )}
    </group>
  );
};

export const GeminiCell: React.FC<{L: number; Ln: number; frame: number; cheer?: number}> = ({L, Ln, frame, cheer = 0}) => {
  const rise = clamp01(easeOutBack(prog(L, 4, 22, (x) => x)));
  const x = starX(L);
  const dash = prog(L, DASH_A, STOP, (t) => t);
  const speed = Math.sin(Math.PI * dash);
  const settle = prog(L, STOP, STOP + 10);
  const tokens = Math.round(1_000_000 * prog(L, DASH_A, STOP, easeInOut));
  const counter = prog(L, DASH_A - 6, DASH_A + 4) * (1 - prog(L, 168, 173));
  const wake = L >= WAKE;
  const [gx, gy] = squash(L, WAKE + 10, 12, 0.3);
  const hop = wake ? Math.sin(Math.PI * prog(L, WAKE, WAKE + 10, (t) => t)) : 0;
  return (
    <group>
      <Lane L={L} />
      <SpeedLines L={L} />
      {rise > 0.01 && (
        <group position={[x, TOP_Y + 0.15 * (1 - rise) + cheer, C13[2]]}>
          <group rotation={[0, 0, -0.35 * speed]}>
            <group rotation={[0, lerp(0.5, FACE, settle) * (1 - speed) + 1.0 * speed, 0]} scale={STAR_SCALE * rise}>
              <GeminiStar frame={frame} expression={L > STOP && L < STOP + 30 ? 'wow' : speed > 0.2 ? 'happy' : 'normal'} starBoost={clamp01(speed * 1.5 + 0.8 * prog(Ln, STOP, STOP + 6) * (1 - prog(Ln, STOP + 20, STOP + 40)))} />
            </group>
          </group>
        </group>
      )}
      {counter > 0.01 && (
        <Label
          lines={[{t: tokens.toLocaleString('en-US'), size: 160, color: '#ffffff', font: NUM, weight: 700}, {t: 'tokens 上下文', size: 60, color: '#C9D6FF'}]}
          w={1.6}
          h={0.55}
          res={500}
          position={[x - 0.2, TOP_Y + 1.1, C13[2] - 0.2]}
          rotation={[0, FACE, 0]}
          opacity={counter}
          glow="#6E7BFF"
        />
      )}
      <Stamp L={L} />
      <PriceFlip R={Ln - INS} fade={1 - prog(L, ACT3, ACT3 + 10)} />
      <ShockRing t={(Ln - STOP) / 14} color="#8AB4FF" position={[C14[0], TOP_Y + 0.05, C14[2]]} size={0.5} />
      <ShockRing t={(Ln - STOP - 6) / 30} color="#8AB4FF" position={[C15[0], TOP_Y + 0.05, C15[2]]} size={0.9} />
      {L < ACT3 && (
        <group position={[C16[0], TOP_Y + 0.25 * hop, C16[2]]} rotation={[0, -0.2, 0]} scale={0.5}>
          <GptBot frame={frame} sx={gx} sy={gy} tuck={hop} expression={wake ? 'wow' : 'sleep'} blinkOffset={11} />
        </group>
      )}
      {!wake && L > 20 && (
        <Label lines={[{t: 'z z', size: 120, color: '#cfd8ff', weight: 900}]} w={0.5} h={0.3} position={[C16[0] + 0.3, TOP_Y + 0.85 + 0.05 * Math.sin(Ln * 0.1), C16[2]]} rotation={[0, FACE, 0]} opacity={0.7} />
      )}
      <Sign at={[C13[0] - 1.25, C13[1], C13[2] - 0.55]} f={L} a={16} date="10.13" name="Gemini 4 Argon" maker="GOOGLE" accent="#8AB4FF" rotY={0.5} b={ACT3} />
    </group>
  );
};
