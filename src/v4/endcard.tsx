import React, {useLayoutEffect, useMemo} from 'react';
import {RoundedBox} from '@react-three/drei';
import * as THREE from 'three';
import {V3, clamp01, easeInOut, easeOutBack, lerp, prog, squash} from '../anim';
import {SCREEN_Z, SD, SW, TOP} from './calendar';
import {BEAT, NOV_F, REVEAL_F} from './timing';

// 结尾：E2 一张 11 月的日历页从上沿翻下来盖住十月，11.4 那格落下 Kimi 的礼物盒；
// E3 屏幕闪一下变成代码编辑器（滚的是这条片子的真实源码），镜头拉远，露出桌上的平板、键盘和台灯。
export const FLIP_A = NOV_F + BEAT / 2;
export const FLIP_B = NOV_F + 2 * BEAT;
export const GLITCH_F = REVEAL_F + 2 * BEAT;
const PAGE_Y = 2.0;
const PX = 100; // canvas px per world unit
const HINGE_Z = SCREEN_Z - SD / 2;

// November 2026, Monday first: row 0 is Oct 26–31 + Nov 1 (a Sunday).
const NOV_ROW = 1.38;
const NOV_TOP = 2.1; // grid top, measured from the page's top edge
const novCell = (r: number, c: number): [number, number] => [(c - 3) * 1.72, NOV_TOP + (r + 0.5) * NOV_ROW];
const GIFT_RC: [number, number] = [1, 2]; // 11.4

const rr = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const FONT = '"Microsoft YaHei", "PingFang SC", sans-serif';
const MONO = '"Cascadia Code", Consolas, "Courier New", monospace';

const drawNovember = (ctx: CanvasRenderingContext2D) => {
  const W = SW * PX;
  const H = SD * PX;
  const u = (v: number) => v * PX;
  const cx = (x: number) => W / 2 + u(x);
  ctx.fillStyle = '#0a0b10';
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${u(0.72)}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('11 月见', cx(-5.9), u(0.81));
  ctx.fillStyle = '#8a90a0';
  ctx.font = `700 ${u(0.4)}px ${MONO}`;
  ctx.textAlign = 'right';
  ctx.fillText('2026 · NOVEMBER', cx(6.0), u(0.81));
  ctx.textAlign = 'center';
  ctx.font = `${u(0.3)}px ${FONT}`;
  ctx.fillStyle = '#5d6372';
  ['一', '二', '三', '四', '五', '六', '日'].forEach((w, c) => ctx.fillText(w, cx((c - 3) * 1.72), u(1.71)));
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 7; c++) {
      const n = r * 7 + c - 5; // Nov 1 sits at r0 c6
      const out = n < 1 || n > 30;
      const [x, z] = novCell(r, c);
      const gift = r === GIFT_RC[0] && c === GIFT_RC[1];
      rr(ctx, cx(x) - u(0.8), u(z) - u(0.63), u(1.6), u(1.26), u(0.12));
      ctx.fillStyle = gift ? '#2a1f4a' : out ? '#0e0f14' : '#16181f';
      ctx.fill();
      if (gift) {
        ctx.lineWidth = u(0.05);
        ctx.strokeStyle = '#C9A7FF';
        ctx.stroke();
      }
      ctx.textAlign = 'left';
      ctx.fillStyle = gift ? '#F1E8FF' : out ? '#3a3e4a' : '#c9ceda';
      ctx.font = `800 ${u(0.34)}px ${MONO}`;
      ctx.fillText(String(out ? (n < 1 ? 31 + n : n - 30) : n), cx(x) - u(0.66), u(z) - u(0.4));
      if (gift) {
        ctx.textAlign = 'center';
        ctx.font = `800 ${u(0.2)}px ${FONT}`;
        ctx.fillStyle = '#E4D4FF';
        ctx.fillText('Kimi 开源', cx(x), u(z) + u(0.45));
      }
    }
  }
};

// A real excerpt of this film's source (kimi.tsx, the MoE cube).
const CODE = `// v5 second beat: 2.8T parameters as a 5×5×5 cube of small blocks; every beat a different ~4%
// of them light up (1040 亿 active of 2.8 万亿).
const MOE_N = 5;
const MOE_GAP = 0.13;
const MoeCube: React.FC<{R: number; fade: number}> = ({R, fade}) => {
  const {geo, dim, glow} = useMemo(
    () => ({
      geo: new THREE.BoxGeometry(0.1, 0.1, 0.1),
      dim: new THREE.MeshStandardMaterial({color: '#2A2440', roughness: 0.6, transparent: true}),
      glow: new THREE.MeshStandardMaterial({color: '#C9A7FF', emissive: '#9B6BFF', emissiveIntensity: 1.6}),
    }),
    []
  );
  const s = clamp01(easeOutBack(prog(R, 0, 12, (x) => x))) * fade;
  if (R < 0 || s <= 0.01) return null;
  const r = rng(31 + 7 * Math.floor(R / BEAT));
  const lit = new Set(Array.from({length: 5}, () => Math.floor(r() * MOE_N ** 3)));
  const half = ((MOE_N - 1) * MOE_GAP) / 2;
  return (
    <group position={[C24[0] - 1.25, SURF + half + 0.06, C24[2] + 0.15]} scale={s}>
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
      <Satellite L={Ln} />
      <MoeCube R={Ln - INS} fade={1 - prog(L, 3 * BAR - 6, 3 * BAR + 4)} />
      <Gift L={L} />
      <Sign at={[C24[0] + 1.15, C24[1], C24[2] - 1.2]} f={L} a={FLIP + 4} b={3 * BAR} date="10.24" name="Kimi K3.1 Pro" />
    </group>
  );
};`.split('\n');

const KW = /^(const|let|return|export|import|from|new|if|null|true|false)$/;
const tokenColor = (tok: string) => {
  if (tok.startsWith('//')) return '#6A7385';
  if (/^'.*'$/.test(tok)) return '#A5D6A7';
  if (/^\d/.test(tok)) return '#F2B880';
  if (KW.test(tok)) return '#C792EA';
  if (/^[A-Z]/.test(tok)) return '#FFCB6B';
  if (/^[a-z_]\w*$/i.test(tok)) return '#D6DEEB';
  return '#89DDFF';
};

const drawCode = (ctx: CanvasRenderingContext2D, scroll: number, cursorOn: boolean) => {
  const W = SW * PX;
  const H = SD * PX;
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, W, H);
  // tab bar
  ctx.fillStyle = '#161b22';
  ctx.fillRect(0, 0, W, 64);
  ['SceneV4.tsx', 'kimi.tsx', 'endcard.tsx'].forEach((t, k) => {
    ctx.fillStyle = k === 1 ? '#0d1117' : '#161b22';
    ctx.fillRect(16 + k * 230, 8, 220, 56);
    ctx.fillStyle = k === 1 ? '#ffffff' : '#7d8590';
    ctx.font = `600 26px ${MONO}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(t, 36 + k * 230, 36);
  });
  const LH = 34;
  const top = 90;
  const visible = Math.floor((H - top) / LH);
  ctx.font = `24px ${MONO}`;
  const first = Math.floor(scroll);
  const off = (scroll - first) * LH;
  for (let i = 0; i <= visible; i++) {
    const n = first + i;
    if (n >= CODE.length) break;
    const y = top + i * LH - off + LH / 2;
    if (y < top - LH / 2) continue;
    ctx.fillStyle = '#3b4252';
    ctx.textAlign = 'right';
    ctx.fillText(String(n + 1), 70, y);
    ctx.textAlign = 'left';
    let x = 96;
    const line = CODE[n];
    const parts = line.trimStart().startsWith('//') ? [line] : line.split(/('[^']*'|\/\/.*$|\w+|\s+|[^\w\s']+)/).filter(Boolean);
    for (const p of parts) {
      ctx.fillStyle = tokenColor(p.trim());
      ctx.fillText(p, x, y);
      x += ctx.measureText(p).width;
    }
    if (cursorOn && n === Math.min(CODE.length - 1, first + Math.floor(visible * 0.6))) {
      ctx.fillStyle = '#E8ECF4';
      ctx.fillRect(x + 4, y - 14, 3, 28);
    }
  }
};

const GiftBox: React.FC<{frame: number}> = ({frame}) => {
  const a = FLIP_B + 2;
  const t = prog(frame, a, a + 8, (x) => x * x);
  if (t <= 0) return null;
  const [sx, sy] = squash(frame, a + 8, 12, 0.3);
  const tag = clamp01(easeOutBack(prog(frame, a + 10, a + 20, (x) => x)));
  const [x, z] = novCell(...GIFT_RC);
  return (
    <group position={[x + 0.25, lerp(2.4, 0.005, t), z - 0.1]} rotation={[0, -0.4, 0]} scale={[0.85 * sx, 0.85 * sy, 0.85 * sx]}>
      <RoundedBox args={[0.6, 0.5, 0.6]} radius={0.05} smoothness={3} position={[0, 0.25, 0]} castShadow>
        <meshPhysicalMaterial color="#8C6CFF" roughness={0.35} clearcoat={0.8} />
      </RoundedBox>
      {[0, Math.PI / 2].map((r) => (
        <mesh key={r} position={[0, 0.25, 0]} rotation={[0, r, 0]}>
          <boxGeometry args={[0.62, 0.52, 0.1]} />
          <meshStandardMaterial color="#FFD08A" emissive="#FFB65C" emissiveIntensity={0.4 + 0.5 * tag} />
        </mesh>
      ))}
    </group>
  );
};

// The November page. Before the glitch it hovers above the act scenes; after it, it drops onto the
// screen and turns into the code editor.
export const NovemberPage: React.FC<{frame: number}> = ({frame}) => {
  const {ctx, tex} = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = SW * PX;
    c.height = SD * PX;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return {ctx: c.getContext('2d')!, tex: t};
  }, []);
  // a few frames of flicker between the page and the code
  const code = frame >= GLITCH_F || (frame >= GLITCH_F - 6 && Math.floor(frame) % 2 === 0);
  useLayoutEffect(() => {
    if (code) drawCode(ctx, Math.max(0, frame - GLITCH_F) * 0.16, Math.floor(frame / 8) % 2 === 0);
    else drawNovember(ctx);
    tex.needsUpdate = true;
  }, [code, frame, ctx, tex]);
  if (frame < FLIP_A) return null;
  const theta = -Math.PI * (1 - prog(frame, FLIP_A, FLIP_B, easeInOut));
  const y = lerp(PAGE_Y, TOP + 0.03, prog(frame, GLITCH_F - 2, GLITCH_F + 4, easeInOut));
  const jitter = frame >= GLITCH_F - 6 && frame < GLITCH_F + 4 ? 0.12 * Math.sin(frame * 7.3) : 0;
  return (
    <group position={[jitter, y, HINGE_Z]} rotation={[theta, 0, 0]}>
      <group position={[0, 0, SD / 2]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[SW, SD]} />
          <meshBasicMaterial map={tex} color="#e6e6e6" side={THREE.FrontSide} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[SW, SD]} />
          <meshStandardMaterial color="#14161c" roughness={0.6} side={THREE.FrontSide} />
        </mesh>
        {!code && (
          <group position={[0, 0, -SD / 2]}>
            <GiftBox frame={frame} />
          </group>
        )}
      </group>
    </group>
  );
};

// Desk props around the tablet, only mounted for the pull-back reveal.
export const Desk: React.FC<{frame: number}> = ({frame}) => {
  const keys = useMemo(() => {
    const out: V3[] = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 14; c++) out.push([-7.2 + c * 1.1 + (r % 2) * 0.3, 0.42, 7.2 + r * 1.0]);
    return out;
  }, []);
  if (frame < REVEAL_F - 10) return null;
  const lamp = prog(frame, REVEAL_F, REVEAL_F + 30);
  // a key or two taps along with the code
  const tap = Math.floor(Math.max(0, frame - GLITCH_F) / 5);
  return (
    <group>
      <RoundedBox args={[16.4, 0.36, 5.8]} radius={0.12} smoothness={3} position={[0, 0.18, 9.2]} castShadow receiveShadow>
        <meshStandardMaterial color="#1b1d23" metalness={0.6} roughness={0.4} />
      </RoundedBox>
      {keys.map((p, k) => {
        const down = frame >= GLITCH_F && (k * 7 + tap * 13) % 23 === 0;
        return (
          <RoundedBox key={k} args={[0.95, 0.14, 0.86]} radius={0.05} smoothness={2} position={[p[0], p[1] - (down ? 0.08 : 0), p[2]]}>
            <meshStandardMaterial color="#2a2d36" roughness={0.6} />
          </RoundedBox>
        );
      })}
      {/* mug */}
      <group position={[10.6, 0, 3.2]}>
        <mesh position={[0, 0.9, 0]} castShadow>
          <cylinderGeometry args={[0.8, 0.72, 1.8, 32]} />
          <meshStandardMaterial color="#D97757" roughness={0.5} />
        </mesh>
        <mesh position={[0.9, 0.95, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.38, 0.1, 10, 24, Math.PI]} />
          <meshStandardMaterial color="#D97757" roughness={0.5} />
        </mesh>
      </group>
      {/* lamp */}
      <group position={[-10.8, 0, -5.4]}>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[1.0, 1.1, 0.24, 32]} />
          <meshStandardMaterial color="#20232b" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0, 3.2, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 6.2, 12]} />
          <meshStandardMaterial color="#20232b" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0.9, 6.0, 0.9]} rotation={[0.6, 0, -0.6]}>
          <coneGeometry args={[1.1, 1.4, 32, 1, true]} />
          <meshStandardMaterial color="#2c2f38" side={THREE.DoubleSide} metalness={0.4} roughness={0.5} />
        </mesh>
        <pointLight position={[1.3, 5.3, 1.3]} intensity={60 * lamp} distance={26} decay={1.6} color="#FFC48A" />
      </group>
    </group>
  );
};
