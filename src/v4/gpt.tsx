import React from 'react';
import {RoundedBox} from '@react-three/drei';
import {V3, clamp01, easeInOut, easeOutBack, lerp, prog, squash} from '../anim';
import {GptBot} from '../Characters';
import {Label, NUM, ShockRing} from '../common';
import {Sign, cellOf} from './calendar';
import {ACT3, BAR, BEAT} from './timing';

// 10.16 格：被震醒的 GPT 第二小节重拍一分四，4 个分身各推一条进度条（往右，朝 17 号格），
// 第三小节第 3 拍一起完成；最慢那条不停，伸出格子变成水管，接进 17 号格的水箱。
export const C16 = cellOf(16);
export const SURF = C16[1] + 0.06;
export const SPLIT = BAR;
const FILL_A = BAR + 2 * BEAT;
export const DONE = 2 * BAR + 2 * BEAT;
export const PIPE_A = 2 * BAR + 3 * BEAT;
// v5 second beat: one bar inserted before the pipe, the 4 results merge into one report
export const INS = PIPE_A;
const BOT_X = C16[0] - 0.52;
const LANE_X0 = C16[0] - 0.32;
const LANE_X1 = C16[0] + 0.72;
export const PIPE_X1 = 2.8; // 17 号格水箱左壁
const LANE_Z = [-0.54, -0.18, 0.18, 0.54].map((z) => C16[2] + z);
const LANE_Y = SURF + 0.02;
const PIPE_LANE = 2;
const TASKS = [
  {t: '查资料', c: '#FF9F6E', end: 2 * BAR},
  {t: '写代码', c: '#8AB4FF', end: 2 * BAR + BEAT},
  {t: '做表格', c: '#7CCB6F', end: 2 * BAR + 0.5 * BEAT},
  {t: '写报告', c: '#C9A7FF', end: 2 * BAR + 1.5 * BEAT},
];
export const POPS = TASKS.map((_, k) => SPLIT + (k * BEAT) / 2);

// progress accelerates toward the end, so the ticks speed up
export const fillAt = (L: number, k: number) => prog(L, FILL_A, TASKS[k].end, (t) => t * t);

const Lane: React.FC<{L: number; k: number}> = ({L, k}) => {
  const show = prog(L, POPS[k] + 4, POPS[k] + 14);
  if (show <= 0) return null;
  const fill = fillAt(L, k);
  const done = fill >= 1;
  const len = (LANE_X1 - LANE_X0) * show;
  const flen = (LANE_X1 - LANE_X0) * fill;
  const {t, c} = TASKS[k];
  return (
    <group position={[LANE_X0, LANE_Y, LANE_Z[k]]}>
      <mesh position={[len / 2, 0, 0]}>
        <boxGeometry args={[len, 0.025, 0.2]} />
        <meshStandardMaterial color="#1a1d24" roughness={0.6} />
      </mesh>
      {fill > 0 && (
        <mesh position={[flen / 2, 0.012, 0]}>
          <boxGeometry args={[flen, 0.025, 0.16]} />
          <meshBasicMaterial color={c} toneMapped={false} />
        </mesh>
      )}
      <Label
        lines={[{t: done ? `${t} ✓` : `${t} ${Math.round(fill * 100)}%`, size: 90, color: done ? '#0b0c10' : '#ffffff', weight: 800}]}
        w={0.9}
        h={0.16}
        res={600}
        position={[0.52, 0.03, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        opacity={show}
      />
    </group>
  );
};

// The slowest lane keeps going past the cell edge and turns into a water pipe into the tank on 17.
const Pipe: React.FC<{L: number}> = ({L}) => {
  const t = prog(L, PIPE_A, ACT3, (x) => x);
  if (t <= 0) return null;
  const x1 = lerp(LANE_X1, PIPE_X1, t);
  const len = x1 - LANE_X1 + 0.1;
  return (
    <group>
      <mesh position={[LANE_X1 - 0.05 + len / 2, LANE_Y + 0.05, LANE_Z[PIPE_LANE]]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.06, len, 16]} />
        <meshPhysicalMaterial color="#6F8BFF" emissive="#4D6BFE" emissiveIntensity={1.2} roughness={0.2} clearcoat={1} />
      </mesh>
      <mesh position={[x1, LANE_Y + 0.05, LANE_Z[PIPE_LANE]]}>
        <sphereGeometry args={[0.075, 16, 12]} />
        <meshBasicMaterial color="#9EC5FF" toneMapped={false} />
      </mesh>
    </group>
  );
};

// v5 second beat: each lane's result flies back as a colored sheet, the sheets merge into a
// report card, and the rollout stamp slams onto it.
const REPORT_P: V3 = [C16[0] + 0.2, SURF + 0.82, C16[2] - 0.1];
const Report: React.FC<{R: number; fade: number}> = ({R, fade}) => {
  if (R < 0 || fade <= 0) return null;
  const card = clamp01(easeOutBack(prog(R, 2 * BEAT, 2 * BEAT + 10, (x) => x))) * fade;
  const stamp = prog(R, 3 * BEAT, 3 * BEAT + 6, (x) => x);
  return (
    <group>
      {TASKS.map((task, k) => {
        const t = prog(R, (k * BEAT) / 2, (k * BEAT) / 2 + 14, easeInOut);
        if (t <= 0 || R > 2 * BEAT + 4) return null;
        const p: V3 = [lerp(LANE_X1, REPORT_P[0], t), LANE_Y + 0.1 + (REPORT_P[1] - LANE_Y) * t + 0.5 * Math.sin(Math.PI * t), lerp(LANE_Z[k], REPORT_P[2] + 0.01 * k, t)];
        return (
          <mesh key={k} position={p} rotation={[-Math.PI / 2 * (1 - t), 0.4 * (1 - t), 0]}>
            <planeGeometry args={[0.32, 0.4]} />
            <meshBasicMaterial color={task.c} toneMapped={false} side={2} />
          </mesh>
        );
      })}
      {card > 0.01 && (
        <group position={REPORT_P} rotation={[-0.12, -0.15, 0]} scale={card}>
          <mesh>
            <planeGeometry args={[0.62, 0.8]} />
            <meshStandardMaterial color="#F4F1EA" emissive="#F4F1EA" emissiveIntensity={0.3} />
          </mesh>
          <Label lines={[{t: '汇总报告', size: 92, color: '#15171d', weight: 800}]} w={0.56} h={0.14} res={500} position={[0, 0.3, 0.002]} />
          {TASKS.map((task, k) => (
            <group key={k} position={[0, 0.13 - k * 0.12, 0.002]}>
              <mesh position={[-0.22, 0, 0]}>
                <planeGeometry args={[0.06, 0.06]} />
                <meshBasicMaterial color={task.c} toneMapped={false} />
              </mesh>
              <Label lines={[{t: `${task.t}  ✓`, size: 72, color: '#2a2d36', weight: 700}]} w={0.4} h={0.1} res={500} position={[0.03, 0, 0]} />
            </group>
          ))}
          {stamp > 0 && (
            <group position={[0.05, -0.46, 0.01]} rotation={[0, 0, -0.08]} scale={lerp(1.8, 1, stamp)}>
              <Label lines={[{t: 'Pro / Business / Enterprise', size: 66, color: '#ffffff', weight: 800}, {t: '逐步开放', size: 66, color: '#ffffff', weight: 800}]} w={0.78} h={0.26} res={500} bg="rgba(214,60,60,0.92)" radius={0.06} opacity={stamp} />
            </group>
          )}
        </group>
      )}
    </group>
  );
};

const TaskCube: React.FC<{color: string; L: number; k: number}> = ({color, L, k}) => (
  <group position={[0, 1.55 + 0.06 * Math.sin(L * 0.2 + k), 0]} rotation={[0.3, L * 0.06 + k, 0.2]}>
    <RoundedBox args={[0.3, 0.3, 0.3]} radius={0.07} smoothness={3}>
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} roughness={0.3} />
    </RoundedBox>
  </group>
);

export const GptCell: React.FC<{L: number; Ln: number; frame: number; cheer?: number}> = ({L, Ln, frame, cheer = 0}) => {
  const allDone = L >= DONE;
  const bigS = clamp01(easeOutBack(prog(L, DONE, DONE + 12, (x) => x))) * (1 - prog(Ln, INS, INS + 8));
  return (
    <group>
      {L < SPLIT ? (
        <group position={[C16[0], SURF, C16[2]]} rotation={[0, -0.2 * (1 - prog(L, 0, 20)), 0]} scale={0.5}>
          <GptBot
            frame={frame}
            sy={1 - 0.15 * Math.sin(Math.PI * prog(L, SPLIT - BEAT, SPLIT, (x) => x))}
            expression={L < 24 ? 'wow' : 'normal'}
            blinkOffset={11}
          />
        </group>
      ) : (
        TASKS.map((task, k) => {
          const s = clamp01(easeOutBack(prog(L, POPS[k], POPS[k] + 12, (x) => x)));
          const done = fillAt(L, k) >= 1;
          const hop = allDone ? Math.abs(Math.sin(((Ln - DONE) * Math.PI) / BEAT + k * 0.4)) * (1 - prog(L, ACT3 - 10, ACT3)) : 0;
          const p: V3 = [lerp(C16[0], BOT_X, s), SURF + cheer + 0.12 * hop + 0.25 * Math.sin(Math.PI * prog(L, POPS[k], POPS[k] + 12, (x) => x)), lerp(C16[2], LANE_Z[k], s)];
          const [sx, sy] = squash(L, POPS[k] + 12, 12, 0.3);
          return (
            <group key={k} position={p} rotation={[0, 0.5, 0]} scale={0.3 * Math.max(0.4, s)}>
              <GptBot frame={frame} sx={sx} sy={sy} tuck={hop * 0.6} expression={done ? 'happy' : 'normal'} blinkOffset={k * 23} />
              {L > POPS[k] + 10 && !done && <TaskCube color={task.c} L={L} k={k} />}
            </group>
          );
        })
      )}
      {TASKS.map((_, k) => (
        <Lane key={k} L={L} k={k} />
      ))}
      <Pipe L={L} />
      <Report R={Ln - INS} fade={1 - prog(L, ACT3, ACT3 + 10)} />
      <ShockRing t={(L - SPLIT) / 14} color="#E8ECF4" position={[C16[0], SURF + 0.03, C16[2]]} size={0.4} />
      <ShockRing t={(Ln - DONE) / 18} color="#E8ECF4" position={[C16[0] + 0.2, SURF + 0.04, C16[2]]} size={0.55} />
      {bigS > 0.01 && (
        <group position={[C16[0] + 0.75, SURF + 0.85 + 0.04 * Math.sin(Ln * 0.15), C16[2] - 0.2]} rotation={[0, -0.6, 0]} scale={bigS}>
          <Label lines={[{t: '×4', size: 220, color: '#ffffff', font: NUM, weight: 700}]} w={1.0} h={0.6} res={500} glow="#AFC3FF" />
          <Label lines={[{t: '并行 Agent 同时完成', size: 60, color: '#E8ECF4', weight: 700}]} w={1.4} h={0.18} res={500} position={[0, -0.36, 0]} />
        </group>
      )}
      <Sign at={[C16[0] - 0.2, C16[1], C16[2] - 1.5]} f={L} a={14} b={ACT3} date="10.16" name="GPT-6 Pro" maker="OPENAI" accent="#E8ECF4" rotY={-0.1} />
    </group>
  );
};
