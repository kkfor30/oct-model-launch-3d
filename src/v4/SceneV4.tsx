import React, {useLayoutEffect} from 'react';
import {getInputProps, useCurrentFrame} from 'remotion';
import {useThree} from '@react-three/fiber';
import {Bloom, EffectComposer, Vignette} from '@react-three/postprocessing';
import * as THREE from 'three';
import {V3, clamp01, easeOut, easeOutBack, prog} from '../anim';
import {Bokeh, Label, ShockRing} from '../common';
import {Cam, shake} from '../cam';
import {CELL, Cell, DAYS, Header, RELEASES, TOP, Tablet, accentOfRelease, cellOf, flashAt} from './calendar';
import {C7, HaikuCell, Orb, ORB_B, STOMP, liftAt, INS as INS0} from './haiku';
import {C13, DASH_A, GeminiCell, STOP, starX, INS as INS1} from './gemini';
import {GptCell, INS as INS2} from './gpt';
import {DeepSeekCell, OPEN, INS as INS3} from './deepseek';
import {DuetCell, INS as INS4} from './duet';
import {FLIP, KimiCell, INS as INS5} from './kimi';
import {Desk, GLITCH_F, NovemberPage} from './endcard';
import {BAR, BEAT, HOOK_F, NOV_F, OUTRO_F, REVEAL_F, TOTAL_F, actStartF, warp} from './timing';
import {spline} from './path';

// v4 camera keys (old timeline: no hook, 3-bar acts). OLD_INS are the old global frames where each act's
// second-beat bar is now inserted; remap() shifts every old key into the v5 timeline.
const INS = [INS0, INS1, INS2, INS3, INS4, INS5];
const OLD_INS = INS.map((ins, k) => 2 * BAR + k * 3 * BAR + ins);
const remap = (t: number) => t + HOOK_F + BAR * OLD_INS.filter((g) => g < t).length;
const OLD_POS: [number, V3][] = [
  [0, [0, 17.5, 3.2]],
  [58, [0.6, 16.5, 3.6]],
  [100, [-0.4, 10, 4.2]],
  [140, [-0.5, 4.2, 3.2]],
  [173, [0.2, 2.8, 3.4]],
  [205, [0.0, 2.7, 3.1]],
  [230, [-0.15, 2.7, 3.4]],
  [262, [-0.4, 2.2, 3.5]],
  [288, [-2.0, 2.6, 3.9]],
  [320, [-2.2, 2.3, 3.6]],
  [346, [-3.1, 2.5, 4.3]],
  [375, [-1.9, 2.4, 4.2]],
  [403, [-0.5, 2.7, 4.6]],
  [425, [0.3, 2.9, 4.9]],
  [450, [0.8, 3.0, 5.0]],
  // 10.16 GPT: push in, rise to look down on the lanes, drop low along them, follow the pipe
  [478, [1.6, 2.3, 3.9]],
  [518, [1.75, 3.5, 2.9]],
  [565, [1.5, 3.4, 2.7]],
  [603, [0.9, 1.75, 3.0]],
  [628, [1.6, 1.6, 2.8]],
  // 10.17 DeepSeek: hug the tank from the side, round to the front, ride up with the bar
  [650, [2.2, 1.35, 2.3]],
  [692, [3.0, 1.35, 3.2]],
  [735, [3.5, 1.6, 3.3]],
  [772, [3.9, 2.1, 3.9]],
  [795, [3.0, 2.4, 4.5]],
  // 10.21 Duet: follow the water arc to the window, into the room, desk close-up
  [818, [0.2, 2.2, 5.3]],
  [845, [-1.3, 1.35, 4.2]],
  [880, [-1.2, 0.85, 3.25]],
  [921, [-1.2, 0.98, 3.55]],
  [952, [-0.7, 1.35, 4.3]],
  [978, [1.2, 1.8, 4.9]],
  // 10.24 Kimi: arrive with the dot, face the moon for the flip, orbit to the right
  [1000, [2.6, 1.6, 4.7]],
  [1037, [3.1, 1.45, 4.5]],
  [1080, [4.4, 1.6, 4.3]],
  [1120, [5.2, 2.4, 4.6]],
  [1150, [4.2, 3.2, 5.2]],
  // outro: rise to the whole calendar
  [1200, [1.6, 8.0, 6.6]],
  [1250, [0.2, 12.4, 5.2]],
];
const OLD_TGT: [number, V3][] = [
  [0, [0, 0, -0.4]],
  [58, [0, 0, -0.4]],
  [100, [-1.3, 0.3, -0.9]],
  [140, [C7[0], 1.0, C7[2]]],
  [173, [C7[0] - 0.2, 1.45, C7[2]]],
  [205, [C7[0] - 0.2, 1.55, C7[2]]],
  [230, [C7[0] - 0.2, 1.45, C7[2]]],
  [262, [C7[0] - 0.1, 1.2, C7[2]]],
  [288, [-3.3, 0.5, 0.5]],
  [320, [C13[0], 0.5, C13[2]]],
  [346, [C13[0] + 0.2, 0.75, C13[2] - 0.1]],
  [375, [-1.8, 0.75, 0.5]],
  [403, [-0.6, 0.65, 0.4]],
  [425, [0.3, 0.6, 0.4]],
  [450, [0.9, 0.6, 0.4]],
  [478, [1.7, 0.6, 0.5]],
  [518, [1.7, 0.2, 0.45]],
  [565, [1.8, 0.2, 0.5]],
  [603, [2.2, 0.65, 0.4]],
  [628, [3.0, 0.5, 0.6]],
  [650, [3.3, 0.6, 0.6]],
  [692, [3.2, 0.6, 0.7]],
  [735, [3.5, 1.0, 0.5]],
  [772, [3.7, 1.3, 0.5]],
  [795, [2.2, 1.2, 1.2]],
  [818, [-1.6, 0.8, 1.8]],
  [845, [-1.8, 0.6, 1.9]],
  [880, [-1.4, 0.55, 2.15]],
  [921, [-1.3, 0.8, 2.25]],
  [952, [-0.5, 0.9, 2.2]],
  [978, [2.2, 1.0, 2.3]],
  [1000, [3.3, 0.9, 2.3]],
  [1037, [3.4, 1.1, 2.3]],
  [1080, [3.2, 1.1, 2.2]],
  [1120, [3.3, 1.0, 2.0]],
  [1150, [2.6, 0.8, 1.6]],
  [1200, [0.4, 0, 0.8]],
  [1250, [0, 0, 0.6]],
];

// Hook: start close on today (26), rise while the other cells boot. Hold keys: one per second beat,
// framing the new object. End: hold overhead for the November flip, then pull back over the desk.
const HOLD_START = INS.map((ins, k) => actStartF(k) + ins);
const HOLD_POS: V3[] = [
  [-0.2, 1.9, 2.6],
  [-0.9, 2.2, 3.4],
  [1.5, 2.0, 3.6],
  [3.5, 2.0, 3.9],
  [-1.3, 1.1, 3.7],
  [2.6, 1.6, 5.2],
];
const HOLD_TGT: V3[] = [
  [-0.85, 1.15, -1.0],
  [-1.3, 1.1, 0.2],
  [1.9, 1.05, 0.5],
  [3.6, 1.1, 0.5],
  [-1.5, 0.6, 2.0],
  [2.5, 0.8, 2.0],
];
const merge = (hook: [number, V3][], old: [number, V3][], hold: V3[], end: [number, V3][]) =>
  [...hook, ...old.map(([t, v]) => [remap(t), v] as [number, V3]), ...hold.map((v, k) => [HOLD_START[k] + BAR / 2, v] as [number, V3]), ...end].sort((a, b) => a[0] - b[0]);
const POS = merge(
  [
    [0, [-5.4, 3.0, 6.6]],
    [60, [-3.5, 7, 6]],
  ],
  OLD_POS,
  HOLD_POS,
  [
    [NOV_F, [0, 18.5, 3.9]],
    [REVEAL_F, [0, 19.5, 3.6]],
    [REVEAL_F + 40, [3, 22, 14]],
    [TOTAL_F, [8, 26, 30]],
  ]
);
const TGT = merge(
  [
    [0, [-5.16, 0.16, 3.6]],
    [60, [-3, 0, 2]],
  ],
  OLD_TGT,
  HOLD_TGT,
  [
    [NOV_F, [0, 0, -0.2]],
    [REVEAL_F, [0, 0, -0.3]],
    [REVEAL_F + 40, [0, 0, 1.5]],
    [TOTAL_F, [0, 0, 3]],
  ]
);

const HITS: [number, number][] = [
  [actStartF(0) + STOMP, 0.07],
  [actStartF(1) + STOP, 0.05],
  [actStartF(3) + OPEN, 0.03],
  [actStartF(5) + FLIP, 0.05],
];

const camAt = (frame: number): Cam => {
  let c: Cam = {pos: spline(frame, POS), tgt: spline(frame, TGT), fov: 36};
  for (const [at, amp] of HITS) c = shake(c, frame, at, amp, 14);
  return c;
};

// Outro scorecard: one line per release, floating at the front edge of its cell, facing the overhead camera.
const VERDICTS = ['便宜 75%', 'API 正式可用', '并行 Agent', 'MIT 开源 · 价格不变', '后台主动 Agent', '2.8T · 开源权重待发'];
export const LAND_F = OUTRO_F + 2 * BAR; // everyone lands on this downbeat
export const verdictAt = (k: number) => OUTRO_F + BAR + (k * BEAT) / 2;

const Verdict: React.FC<{k: number; frame: number}> = ({k, frame}) => {
  const a = verdictAt(k);
  const s = clamp01(easeOutBack(prog(frame, a, a + 10, (x) => x)));
  if (s <= 0.01) return null;
  const p = cellOf(RELEASES[k].d);
  return (
    <group position={[p[0], TOP + 0.65, p[2] + CELL / 2 - 0.02]} rotation={[-1.25, 0, 0]} scale={s}>
      <Label lines={[{t: VERDICTS[k], size: 84, color: '#ffffff', weight: 900}]} w={1.6} h={0.34} res={400} bg="rgba(12,14,22,0.86)" radius={0.1} />
      <mesh position={[0, -0.17, 0.002]}>
        <planeGeometry args={[1.6, 0.03]} />
        <meshBasicMaterial color={accentOfRelease(k)} toneMapped={false} />
      </mesh>
    </group>
  );
};

const cheerAt = (frame: number, k: number) => {
  const t = prog(frame, LAND_F - 1.5 * BEAT + k * 0.6, LAND_F, (x) => x);
  return t > 0 && t < 1 ? 0.45 * Math.sin(Math.PI * t) : 0;
};

// The next release cell grows its little scene just before the camera gets there.
const Rise: React.FC<{L: number; children: React.ReactNode}> = ({L, children}) => {
  if (L < -24) return null;
  const s = Math.max(0.001, clamp01(easeOutBack(prog(L, -24, -6, (x) => x))));
  return <group scale={[1, s, 1]}>{children}</group>;
};

export const SceneV4: React.FC = () => {
  const frame = useCurrentFrame();
  const {camera} = useThree();
  const cam = camAt(frame);
  // Ln: new local time per act; L: the old 3-bar animation's time, holding still during the second beat
  const Ln = [0, 1, 2, 3, 4, 5].map((k) => frame - actStartF(k));
  const L = Ln.map((l, k) => warp(l, INS[k]));
  const outro = prog(frame, OUTRO_F + BEAT * 2, OUTRO_F + BEAT * 4);
  const live = frame < GLITCH_F; // after the glitch the screen is just code
  const reveal = prog(frame, REVEAL_F, TOTAL_F, easeOut);

  useLayoutEffect(() => {
    const c = camera as THREE.PerspectiveCamera;
    c.position.set(...cam.pos);
    c.fov = cam.fov;
    c.updateProjectionMatrix();
    c.lookAt(...cam.tgt);
    c.updateMatrixWorld();
  });

  return (
    <>
      <color attach="background" args={['#07080b']} />
      <fog attach="fog" args={['#07080b', 26 + 30 * reveal, 48 + 60 * reveal]} />
      <ambientLight intensity={0.35} color="#9aa6c8" />
      <directionalLight
        position={[4, 10, 6]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-5, 3, 3]} intensity={0.5} color="#9fb4ff" />
      <directionalLight position={[-3, 3, -8]} intensity={2.4} color="#8AB4FF" />
      <directionalLight position={[4, 2, -8]} intensity={1.6} color="#FF9F6E" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#060709" roughness={0.9} metalness={0.1} />
      </mesh>
      <Bokeh frame={frame} z={[-8, -20]} count={70} />
      <Tablet />
      {live && <Header f={frame - HOOK_F} outro={outro} />}
      {live && DAYS.map((day) => {
        const rel = day.out ? undefined : RELEASES.find((r) => r.d === day.d);
        let glow = 0;
        let lift = 0;
        if (rel) {
          const t0 = flashAt(rel.act);
          glow = Math.exp(-Math.max(0, frame - t0) / 8) * (frame >= t0 ? 1 : 0) + 0.25 * prog(frame, t0, t0 + 6);
          const l = L[rel.act];
          if (l >= 0) glow = Math.max(glow, rel.act === 0 ? 0.8 : (rel.act === 2 ? 0.3 : 1) * prog(l, 0, 10, easeOut)); // GPT's accent is near-white
          if (rel.act === 0 && l >= 0) lift = liftAt(l);
        }
        // the Gemini dash lights 14 and 15 as the star passes over them
        const lane = !day.out && (day.d === 14 || day.d === 15) && L[1] >= DASH_A;
        if (lane) glow = prog(starX(L[1]) - cellOf(day.d)[0], -0.6, 0, easeOut);
        // today (10.26) pulses once everyone has landed
        const today = !day.out && day.d === 26;
        const pulse = !today ? 0 : frame > LAND_F ? 0.35 + 0.35 * Math.sin((frame - LAND_F) * 0.2) : frame < HOOK_F ? 0.12 + 0.12 * Math.sin(frame * 0.2) : 0;
        const accent = rel ? accentOfRelease(rel.act) : lane ? accentOfRelease(1) : pulse > 0 ? '#ffffff' : undefined;
        return <Cell key={`${day.r}-${day.c}`} day={day} f={frame} lift={lift} glow={clamp01(Math.max(glow, pulse))} accent={accent} today={today} />;
      })}
      {live && (
        <>
          {L[0] >= 0 && <HaikuCell L={L[0]} Ln={Ln[0]} frame={frame} cheer={cheerAt(frame, 0)} />}
          {L[0] >= 0 && (Ln[0] < INS0 || Ln[0] >= INS0 + BAR) && <Orb L={L[0]} to={C13} />}
          <ShockRing t={(L[0] - ORB_B) / 16} color="#8AB4FF" position={[C13[0], C13[1] + 0.2, C13[2]]} />
          {L[1] >= 0 && <GeminiCell L={L[1]} Ln={Ln[1]} frame={frame} cheer={cheerAt(frame, 1)} />}
          {L[2] >= 0 && <GptCell L={L[2]} Ln={Ln[2]} frame={frame} cheer={cheerAt(frame, 2)} />}
          <Rise L={Ln[3]}>
            <DeepSeekCell L={L[3]} Ln={Ln[3]} frame={frame} cheer={cheerAt(frame, 3)} />
          </Rise>
          <Rise L={Ln[4]}>
            <DuetCell L={L[4]} Ln={Ln[4]} frame={frame} cheer={cheerAt(frame, 4)} />
          </Rise>
          <Rise L={Ln[5]}>
            <KimiCell L={L[5]} Ln={Ln[5]} frame={frame} cheer={cheerAt(frame, 5)} />
          </Rise>
          <ShockRing t={(frame - LAND_F) / 14} color="#ffffff" position={[0, TOP + 0.1, 0.6]} size={1.6} />
          {VERDICTS.map((_, k) => (
            <Verdict key={k} k={k} frame={frame} />
          ))}
        </>
      )}
      <NovemberPage frame={frame} />
      <Desk frame={frame} />

      {getInputProps().fx !== false && (
        <EffectComposer multisampling={Number(getInputProps().ms ?? 4)}>
          <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.9} />
          <Vignette offset={0.25} darkness={0.7} />
        </EffectComposer>
      )}
    </>
  );
};
