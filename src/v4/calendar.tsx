import React from 'react';
import {RoundedBox} from '@react-three/drei';
import {V3, clamp01, easeOut, easeOutBack, prog} from '../anim';
import {ACTS} from '../data';
import {Label, NUM} from '../common';
import {BEAT, HOOK_F} from './timing';

// 2026 年 10 月，周一开头。屏幕平放，z 越大越靠下（离镜头越近）。
export const TOP = 0.16;
export const CELL = 1.6;
const P = 1.72;
export const SW = 13;
export const SD = 10.8;
export const SCREEN_Z = -0.3;

export const cellPos = (r: number, c: number): V3 => [(c - 3) * P, TOP, (r - 2) * P + 0.6];

type Day = {d: number; r: number; c: number; out: boolean};
export const DAYS: Day[] = (() => {
  const list: Day[] = [];
  const first = 3; // 10.1 是周四
  for (let k = 0; k < 35; k++) {
    const r = Math.floor(k / 7);
    const c = k % 7;
    const n = k - first + 1;
    if (n < 1) list.push({d: 30 + n, r, c, out: true});
    else if (n > 31) list.push({d: n - 31, r, c, out: true});
    else list.push({d: n, r, c, out: false});
  }
  return list;
})();

export const RELEASES = [
  {d: 7, act: 0},
  {d: 13, act: 1},
  {d: 16, act: 2},
  {d: 17, act: 3},
  {d: 21, act: 4},
  {d: 24, act: 5},
];
export const cellOf = (d: number): V3 => {
  const day = DAYS.find((x) => x.d === d && !x.out)!;
  return cellPos(day.r, day.c);
};

const ACCENT_EXTRA = '#C9A7FF'; // Kimi
export const accentOfRelease = (k: number) => (k < ACTS.length ? ACTS[k].accent : ACCENT_EXTRA);

// Hook: tiles come out of the dark as a wave spreading from today (10.26, bottom-left),
// then in the intro each release date flashes on a beat.
const bootAt = (r: number, c: number) => (r === 4 && c === 0 ? -10 : 10 + (4 - r + c) * 8.5);
export const flashAt = (k: number) => HOOK_F + BEAT * (2 + k);

export const Cell: React.FC<{day: Day; f: number; lift: number; glow: number; accent?: string; today?: boolean}> = ({day, f, lift, glow, accent, today}) => {
  const [x, , z] = cellPos(day.r, day.c);
  const on = prog(f, bootAt(day.r, day.c), bootAt(day.r, day.c) + 10, easeOut);
  const h = 0.06 + lift;
  return (
    <group position={[x, TOP, z]} scale={[1, 1, 1]}>
      <RoundedBox args={[CELL, h, CELL]} radius={Math.min(0.05, h * 0.45)} smoothness={3} position={[0, h / 2, 0]} receiveShadow castShadow>
        <meshPhysicalMaterial
          color={day.out ? '#0d0f14' : '#161922'}
          roughness={0.35}
          clearcoat={0.8}
          emissive={accent ?? '#000000'}
          emissiveIntensity={accent ? 0.15 + 1.4 * glow : 0}
          transparent={on < 1}
          opacity={0.3 + 0.7 * on}
        />
      </RoundedBox>
      {accent && glow > 0.01 && (
        <mesh position={[0, h + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[CELL * 0.62, CELL * 0.7, 4, 1, Math.PI / 4]} />
          <meshBasicMaterial color={accent} toneMapped={false} transparent opacity={glow} />
        </mesh>
      )}
      <Label
        lines={[{t: String(day.d), size: 90, color: day.out ? '#3a3e4a' : accent ? '#ffffff' : '#8a90a0', font: NUM, weight: accent ? 900 : 600}]}
        w={0.7}
        h={0.6}
        res={200}
        position={[-CELL / 2 + 0.38, h + 0.005, -CELL / 2 + 0.28]}
        rotation={[-Math.PI / 2, 0, 0]}
        opacity={on}
      />
      {today && (
        <mesh position={[0, h + 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[CELL * 0.66, CELL * 0.7, 4, 1, Math.PI / 4]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} transparent opacity={0.35 * on} />
        </mesh>
      )}
    </group>
  );
};

export const Header: React.FC<{f: number; outro?: number}> = ({f, outro = 0}) => {
  const a = prog(f, 4, 22, easeOut);
  const y = TOP + 0.01;
  const z0 = cellPos(0, 0)[2] - CELL / 2;
  return (
    <group>
      <Label
        lines={[{t: '十月模型发布会', size: 120, color: '#ffffff', weight: 900}]}
        w={6.4}
        h={0.9}
        position={[-2.6, y, z0 - 1.25]}
        rotation={[-Math.PI / 2, 0, 0]}
        opacity={a * (1 - outro)}
        glow="#8AB4FF"
      />
      {outro > 0 && (
        <Label
          lines={[{t: '十月成绩单', size: 120, color: '#ffffff', weight: 900}]}
          w={6.4}
          h={0.9}
          position={[-2.6, y + 0.005, z0 - 1.25]}
          rotation={[-Math.PI / 2, 0, 0]}
          opacity={outro}
          glow="#FFB27F"
        />
      )}
      <Label
        lines={[{t: '2026 · OCTOBER', size: 70, color: '#8a90a0', font: NUM, weight: 700}]}
        w={4}
        h={0.5}
        position={[4.2, y, z0 - 1.25]}
        rotation={[-Math.PI / 2, 0, 0]}
        opacity={a}
      />
      {['一', '二', '三', '四', '五', '六', '日'].map((w, c) => (
        <Label key={w} lines={[{t: w, size: 60, color: '#5d6372'}]} w={0.6} h={0.4} res={160} position={[(c - 3) * P, y, z0 - 0.35]} rotation={[-Math.PI / 2, 0, 0]} opacity={a} />
      ))}
    </group>
  );
};

// Hologram card floating beside a release cell: date, model name, maker.
export const Sign: React.FC<{at: V3; f: number; a: number; date: string; name: string; maker: string; accent: string; rotY?: number; b?: number}> = ({at, f, a, date, name, maker, accent, rotY = 0, b = 1e9}) => {
  // folds up at b so the next act's sign has the stage to itself
  const s = clamp01(easeOutBack(prog(f, a, a + 12, (x) => x))) * (1 - prog(f, b, b + 10));
  if (s <= 0.01) return null;
  return (
    <group position={at} rotation={[0, rotY, 0]}>
      <group position={[0, 0.75, 0]} scale={[1, s, 1]}>
        <Label
          lines={[
            {t: date, size: 92, color: accent, font: NUM, weight: 900},
            {t: name, size: 60, color: '#ffffff', weight: 900},
            {t: maker, size: 44, color: '#9aa2b4', font: NUM, weight: 600},
          ]}
          w={2.1}
          h={1.3}
          res={300}
          bg="rgba(12,14,22,0.72)"
          radius={0.08}
        />
        <mesh position={[0, 0.66, 0.002]}>
          <planeGeometry args={[2.1, 0.035]} />
          <meshBasicMaterial color={accent} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
};

export const Tablet: React.FC = () => (
  <group>
    <RoundedBox args={[SW + 0.5, TOP, SD + 0.5]} radius={0.07} smoothness={4} position={[0, TOP / 2, SCREEN_Z]} receiveShadow castShadow>
      <meshStandardMaterial color="#1b1d23" metalness={0.7} roughness={0.32} />
    </RoundedBox>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, TOP + 0.002, SCREEN_Z]} receiveShadow>
      <planeGeometry args={[SW, SD]} />
      <meshStandardMaterial color="#0a0b10" roughness={0.4} metalness={0.2} />
    </mesh>
  </group>
);
