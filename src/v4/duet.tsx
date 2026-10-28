import React, {useMemo} from 'react';
import {RoundedBox} from '@react-three/drei';
import {V3, clamp01, easeIn, easeOutBack, jump, lerp, prog, rng, squash} from '../anim';
import {Clawd} from '../Characters';
import {AlertBadge, Envelope, Label} from '../common';
import {Sign, cellOf} from './calendar';
import {ACT3, BAR, BEAT} from './timing';

// 10.21 格：剖开的小卧室，夜里下雨（DeepSeek 的水柱落在窗上）。人在睡，Clawd 在桌上值班，
// 邮件和日历绕着它转；第二小节第 2 拍红点弹出，第三小节重拍手机亮起改会通知；
// 最后通知缩成光点，越过 22、23 号格飞向 24 号格的月亮。
export const C21 = cellOf(21);
const SURF = C21[1] + 0.06;
export const RAIN_A = 14;
export const ALERT = BAR + BEAT;
export const TAP = 2 * BAR;
export const DOT_A = 2 * BAR + 3 * BEAT;
export const DOT_HIT = ACT3 + BEAT; // 光点打中月亮（下一幕本地帧 14.4）
// v5 second beat: one bar inserted before the alert, Clawd blocks 3 emails and lets the 4th through
export const INS = BAR;
const BACK_Z = C21[2] - 0.7;
const DESK: V3 = [C21[0] + 0.4, SURF + 0.24, C21[2] - 0.15];
const CLAWD_P: V3 = [DESK[0] - 0.08, DESK[1], DESK[2] - 0.02];
const PHONE_P: V3 = [DESK[0] + 0.17, DESK[1], DESK[2] + 0.06];
const CARD: V3 = [DESK[0] - 0.02, DESK[1] + 0.42, DESK[2] + 0.12];
const C24 = cellOf(24);
export const MOON_P: V3 = [C24[0], C24[1] + 0.06 + 0.75, C24[2]];

const Rain: React.FC<{L: number}> = ({L}) => {
  const drops = useMemo(() => {
    const r = rng(5);
    return Array.from({length: 26}).map(() => ({x: (r() - 0.5) * 0.56, o: r(), sp: 0.05 + r() * 0.03}));
  }, []);
  const a = prog(L, RAIN_A - 2, RAIN_A + 6);
  if (a <= 0) return null;
  return (
    <group position={[C21[0] - 0.25, SURF + 0.55, BACK_Z + 0.004]}>
      {drops.map((d, k) => (
        <mesh key={k} position={[d.x, 0.2 - ((d.o + L * d.sp) % 1) * 0.4, 0]}>
          <boxGeometry args={[0.006, 0.06, 0.002]} />
          <meshBasicMaterial color="#BFD4FF" transparent opacity={0.7 * a} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
};

const MiniCalendar: React.FC = () => (
  <group>
    <RoundedBox args={[0.24, 0.26, 0.03]} radius={0.02} smoothness={2}>
      <meshStandardMaterial color="#F4F1EA" roughness={0.6} />
    </RoundedBox>
    <mesh position={[0, 0.095, 0.017]}>
      <boxGeometry args={[0.24, 0.07, 0.006]} />
      <meshStandardMaterial color="#E5484D" />
    </mesh>
  </group>
);

const Room: React.FC<{L: number}> = ({L}) => (
  <group>
    <mesh position={[C21[0], SURF + 0.002, C21[2]]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[1.5, 1.42]} />
      <meshStandardMaterial color="#1b2234" roughness={0.9} />
    </mesh>
    {/* back wall with a rainy window */}
    <mesh position={[C21[0], SURF + 0.48, BACK_Z - 0.02]} receiveShadow>
      <boxGeometry args={[1.5, 0.96, 0.04]} />
      <meshStandardMaterial color="#222b42" roughness={0.95} />
    </mesh>
    <group position={[C21[0] - 0.25, SURF + 0.55, BACK_Z + 0.001]}>
      <mesh>
        <planeGeometry args={[0.6, 0.42]} />
        <meshBasicMaterial color="#2b4a8a" toneMapped={false} />
      </mesh>
      {[
        [0, 0.22, 0.64, 0.03],
        [0, -0.22, 0.64, 0.03],
        [-0.31, 0, 0.03, 0.46],
        [0.31, 0, 0.03, 0.46],
        [0, 0, 0.015, 0.42],
      ].map(([x, y, w, h], k) => (
        <mesh key={k} position={[x, y, 0.01]}>
          <boxGeometry args={[w, h, 0.02]} />
          <meshStandardMaterial color="#0c101a" />
        </mesh>
      ))}
    </group>
    <Rain L={L} />
    {/* left wall */}
    <mesh position={[C21[0] - 0.74, SURF + 0.48, C21[2] - 0.1]} receiveShadow>
      <boxGeometry args={[0.04, 0.96, 1.2]} />
      <meshStandardMaterial color="#1d253a" roughness={0.95} />
    </mesh>
    {/* bed with a sleeping lump */}
    <group position={[C21[0] - 0.36, SURF, C21[2] - 0.22]} scale={0.25}>
      <RoundedBox args={[2.2, 0.4, 3.0]} radius={0.06} smoothness={3} position={[0, 0.2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#2a2f3d" roughness={0.8} />
      </RoundedBox>
      <RoundedBox args={[2.1, 0.22, 2.9]} radius={0.1} smoothness={4} position={[0, 0.5, 0]} receiveShadow>
        <meshStandardMaterial color="#d8dcea" roughness={0.9} />
      </RoundedBox>
      <RoundedBox args={[0.9, 0.18, 0.5]} radius={0.08} smoothness={4} position={[0, 0.7, -1.1]}>
        <meshStandardMaterial color="#f1f2f8" roughness={0.9} />
      </RoundedBox>
      <mesh position={[0, 0.66 + 0.03 * Math.sin(L * 0.08), 0.2]} rotation={[Math.PI / 2, 0, 0]} scale={[1.3, 1, 0.55]} castShadow>
        <capsuleGeometry args={[0.38, 1.3, 8, 16]} />
        <meshStandardMaterial color="#5f74b8" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.82, -0.82]} castShadow>
        <sphereGeometry args={[0.22, 24, 16]} />
        <meshStandardMaterial color="#e3b796" roughness={0.7} />
      </mesh>
    </group>
    {/* desk */}
    <RoundedBox args={[0.52, 0.02, 0.32]} radius={0.008} smoothness={2} position={[DESK[0], DESK[1] - 0.01, DESK[2]]} castShadow receiveShadow>
      <meshStandardMaterial color="#3a2c22" roughness={0.6} />
    </RoundedBox>
    {[-0.24, 0.24].map((x) => (
      <mesh key={x} position={[DESK[0] + x, (SURF + DESK[1] - 0.02) / 2, DESK[2]]}>
        <boxGeometry args={[0.02, DESK[1] - SURF - 0.02, 0.28]} />
        <meshStandardMaterial color="#2a2019" />
      </mesh>
    ))}
  </group>
);

const Zzz: React.FC<{L: number; fade: number}> = ({L, fade}) => (
  <group>
    {[0, 1, 2].map((k) => {
      const t = (((L * 0.012 + k / 3) % 1) + 1) % 1;
      return (
        <Label
          key={k}
          lines={[{t: 'z', size: 140, color: '#cfd8ff', weight: 900}]}
          w={0.3}
          h={0.3}
          position={[C21[0] - 0.45 + t * 0.2, SURF + 0.35 + t * 0.35, C21[2] - 0.45]}
          scale={0.4 + 0.5 * t}
          opacity={fade * Math.sin(Math.PI * t)}
        />
      );
    })}
  </group>
);

const Phone: React.FC<{L: number}> = ({L}) => {
  const on = prog(L, TAP, TAP + 4);
  return (
    <group position={PHONE_P} rotation={[0, -0.3, 0]}>
      <RoundedBox args={[0.1, 0.012, 0.19]} radius={0.005} smoothness={2} position={[0, 0.006, 0]} castShadow>
        <meshStandardMaterial color="#0b0c10" roughness={0.3} metalness={0.5} />
      </RoundedBox>
      <mesh position={[0, 0.0125, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.09, 0.18]} />
        <meshBasicMaterial color={on > 0 ? '#FFB37A' : '#06070a'} toneMapped={false} />
      </mesh>
    </group>
  );
};

// v5 second beat: emails fly in through the window; Clawd swats 3 away (red ×, they drop to the
// floor), the 4th one glows gold and lands on the phone right on the alert beat.
const WIN_P: V3 = [C21[0] - 0.25, SURF + 0.55, BACK_Z + 0.06];
const BLOCK_P: V3 = [CLAWD_P[0] - 0.12, DESK[1] + 0.2, CLAWD_P[2] + 0.06];
export const blockAt = (k: number) => k * BEAT + 10;
const Emails: React.FC<{R: number}> = ({R}) => {
  if (R < 0 || R > BAR + BEAT + 6) return null;
  return (
    <group>
      {[0, 1, 2].map((k) => {
        const t0 = k * BEAT;
        const hit = blockAt(k);
        if (R < t0 || R > hit + 16) return null;
        const fly = prog(R, t0, hit, (x) => x);
        const drop = prog(R, hit, hit + 14, easeIn);
        const p = jump(WIN_P, BLOCK_P, fly, 0.12);
        p[0] -= 0.1 * drop;
        p[1] = lerp(p[1], SURF + 0.02, drop);
        const x = R >= hit ? clamp01(easeOutBack(prog(R, hit, hit + 6, (v) => v))) * (1 - prog(R, hit + 10, hit + 16)) : 0;
        return (
          <group key={k} position={p}>
            <group rotation={[0.3 * drop, 0.6 + k * 0.3, 1.4 * drop]} scale={0.3}>
              <Envelope />
            </group>
            {x > 0.01 &&
              [1, -1].map((sg) => (
                <mesh key={sg} position={[0, 0.06, 0.05]} rotation={[0, 0, (sg * Math.PI) / 4]} scale={x}>
                  <boxGeometry args={[0.16, 0.03, 0.01]} />
                  <meshBasicMaterial color="#FF4D4F" toneMapped={false} />
                </mesh>
              ))}
          </group>
        );
      })}
      {R >= BAR && R <= BAR + BEAT + 6 && (
        <group position={jump(WIN_P, [PHONE_P[0], PHONE_P[1] + 0.05, PHONE_P[2]], prog(R, BAR, BAR + BEAT, (x) => x * x * (3 - 2 * x)), 0.25)}>
          <group rotation={[-0.4, 0.4, 0]} scale={0.3 * (1 - prog(R, BAR + BEAT, BAR + BEAT + 6))}>
            <Envelope />
          </group>
          <pointLight intensity={1.6} distance={0.8} color="#FFD08A" />
          <mesh scale={0.07 * (1 - prog(R, BAR + BEAT, BAR + BEAT + 6))}>
            <sphereGeometry args={[1, 16, 12]} />
            <meshBasicMaterial color="#FFD08A" toneMapped={false} transparent opacity={0.35} depthWrite={false} />
          </mesh>
        </group>
      )}
    </group>
  );
};

// The notification shrinks to a dot that flies over 22 and 23 to the moon on 24.
export const NotifyDot: React.FC<{L: number}> = ({L}) => {
  if (L < DOT_A || L > DOT_HIT + 2) return null;
  const at = (l: number) => jump(CARD, MOON_P, prog(l, DOT_A, DOT_HIT, (x) => x * x * (3 - 2 * x)), 0.9);
  return (
    <group>
      {[0, 2, 4, 6, 8].map((d, k) => {
        if (L - d < DOT_A) return null;
        return (
          <mesh key={k} position={at(L - d)} scale={0.09 * (1 - k * 0.17)}>
            <sphereGeometry args={[1, 16, 12]} />
            <meshBasicMaterial color="#FFC59A" toneMapped={false} transparent opacity={1 - k * 0.18} />
          </mesh>
        );
      })}
      <pointLight position={at(L)} intensity={3} distance={2.5} color="#FF8A5B" />
    </group>
  );
};

export const DuetCell: React.FC<{L: number; Ln: number; frame: number; cheer?: number}> = ({L, Ln, frame, cheer = 0}) => {
  const items = prog(L, 16, 34, (x) => clamp01(easeOutBack(x))) * (1 - prog(L, DOT_A, DOT_A + 10));
  const alert = clamp01(easeOutBack(prog(L, ALERT, ALERT + 10, (x) => x))) * (1 - prog(L, TAP, TAP + 8));
  const card = clamp01(easeOutBack(prog(L, TAP, TAP + 12, (x) => x))) * (1 - prog(L, DOT_A - 2, DOT_A + 4));
  const warm = prog(L, TAP, TAP + 16);
  const R = Ln - INS;
  // during the email beat Clawd turns toward the window and swats each blocked email
  const guard = prog(R, 0, 8) * (1 - prog(R, BAR - 6, BAR + 4));
  const scan = L < ALERT - 4 ? lerp(0.6 * Math.sin(Ln * 0.08), 0.7, guard) : lerp(0, 0.5, prog(L, ALERT, ALERT + 10));
  const swat = [0, 1, 2].reduce((m, k) => Math.max(m, Math.sin(Math.PI * prog(R, blockAt(k) - 4, blockAt(k) + 4, (x) => x))), 0);
  const h = prog(L, TAP - 10, TAP, (x) => x);
  const hopY = (h > 0 && h < 1 ? 0.1 * Math.sin(Math.PI * h) : 0) + 0.05 * swat;
  const [sx, sy] = squash(L, TAP, 12, 0.3);
  return (
    <group>
      <Room L={Ln} />
      <Zzz L={Ln} fade={1} />
      <Phone L={L} />
      <pointLight position={[PHONE_P[0], DESK[1] + 0.3, PHONE_P[2] + 0.15]} intensity={2.5 * warm} distance={1.6} color="#FFB37A" />
      <pointLight position={[C21[0], SURF + 0.85, C21[2] + 0.2]} intensity={0.8} distance={1.8} color="#9fb8ff" />
      <group position={[CLAWD_P[0], CLAWD_P[1] + hopY + cheer, CLAWD_P[2]]} rotation={[0, scan, 0]} scale={0.17}>
        <Clawd frame={frame} sx={sx} sy={sy} tuck={Math.max(Math.sin(Math.PI * h), swat)} expression={L > ALERT && L < TAP + 10 ? 'wow' : L > TAP + 10 ? 'happy' : 'normal'} blinkOffset={5} />
      </group>
      {items > 0.01 &&
        [0, Math.PI].map((ph, k) => {
          const a = Ln * 0.06 + ph;
          return (
            <group key={k} position={[CLAWD_P[0] + Math.cos(a) * 0.2, DESK[1] + 0.24 + 0.02 * Math.sin(Ln * 0.12 + ph), CLAWD_P[2] + Math.sin(a) * 0.14]} rotation={[0, -a + Math.PI / 2, 0.15]} scale={0.3 * items}>
              {k === 0 ? <Envelope /> : <MiniCalendar />}
            </group>
          );
        })}
      {alert > 0.01 && (
        <group position={[CLAWD_P[0] + 0.05, DESK[1] + 0.26, CLAWD_P[2] + 0.05]} scale={alert * 0.3}>
          <AlertBadge />
        </group>
      )}
      {card > 0.01 && (
        <group position={CARD} scale={card}>
          <Label
            lines={[
              {t: 'Claude Duet', size: 54, color: '#FF8A5B', weight: 800},
              {t: '明早 9:00 的会', size: 76, color: '#ffffff', weight: 800},
              {t: '改到 10:00 了', size: 76, color: '#ffffff', weight: 800},
            ]}
            w={0.72}
            h={0.4}
            res={600}
            bg="rgba(30,22,18,0.88)"
            radius={0.06}
            glow="#FF8A5B"
          />
          {L >= TAP + 8 && (
            <group position={[0.06, -0.27, 0.01]} rotation={[0, 0, -0.05]} scale={lerp(1.8, 1, prog(L, TAP + 8, TAP + 14, (x) => x))}>
              <Label lines={[{t: '研究预览 · 美区 Pro / Max 候补', size: 64, color: '#ffffff', weight: 800}]} w={0.8} h={0.13} res={600} bg="rgba(214,60,60,0.92)" radius={0.04} opacity={prog(L, TAP + 8, TAP + 12)} />
            </group>
          )}
        </group>
      )}
      <Emails R={R} />
      <NotifyDot L={L} />
      <Sign at={[C21[0] - 1.35, C21[1], C21[2] - 0.6]} f={L} a={16} b={ACT3} date="10.21" name="Claude Duet" maker="ANTHROPIC" accent="#FF8A5B" rotY={0.45} />
    </group>
  );
};
