import React, {useMemo} from 'react';
import {RoundedBox} from '@react-three/drei';
import * as THREE from 'three';
import type {Kind} from './data';

// 各家形象：Claude 系用 Claude Code 的 Clawd（橙色方块小螃蟹），DeepSeek 用 logo 里的蓝鲸，
// Gemini 用四角星，GPT 用黑色机器人 + 头顶六瓣结（OpenAI Blossom），Kimi 用「月之暗面」的半明半暗月亮。
// 全部用几何体自建，不使用官方素材文件。

export type Expression = 'normal' | 'happy' | 'wow' | 'sleep';

export type CharProps = {
  frame: number;
  sx?: number;
  sy?: number;
  tuck?: number;
  expression?: Expression;
  blinkOffset?: number;
  starBoost?: number;
};

export const blinkAt = (frame: number, offset: number) => {
  const c = (frame + offset) % 84;
  return c < 3 ? Math.abs(c - 1.5) / 1.5 : 1;
};

export type EyeSpec = {x: number; y: number; z: number; w: number; h: number; ink: string; cheeks?: boolean; highlight?: boolean; square?: boolean};

export const Eyes: React.FC<{spec: EyeSpec; expression: Expression; blink: number}> = ({spec, expression, blink}) => {
  const {x, y, z, w, h, ink} = spec;
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * x, y, z]}>
          {expression === 'happy' ? (
            <mesh position={[0, -h * 0.15, 0]}>
              <torusGeometry args={[w * 0.6, w * 0.2, 10, 24, Math.PI]} />
              <meshStandardMaterial color={ink} roughness={0.35} />
            </mesh>
          ) : expression === 'wow' ? (
            <mesh scale={[1, 1, 0.35]}>
              <sphereGeometry args={[w * 0.68, 24, 16]} />
              <meshStandardMaterial color={ink} roughness={0.3} />
            </mesh>
          ) : expression === 'sleep' ? (
            <mesh rotation={[0, 0, Math.PI]} position={[0, h * 0.05, 0]}>
              <torusGeometry args={[w * 0.55, w * 0.14, 8, 20, Math.PI]} />
              <meshStandardMaterial color={ink} roughness={0.4} />
            </mesh>
          ) : (
            <group scale={[1, Math.max(0.08, blink), 1]}>
              <RoundedBox args={[w, h, 0.03]} radius={spec.square ? w * 0.18 : w * 0.45} smoothness={4}>
                <meshStandardMaterial color={ink} roughness={0.3} />
              </RoundedBox>
              {spec.highlight !== false && (
                <mesh position={[w * 0.18, h * 0.22, 0.02]}>
                  <sphereGeometry args={[w * 0.2, 12, 8]} />
                  <meshBasicMaterial color="#ffffff" />
                </mesh>
              )}
            </group>
          )}
        </group>
      ))}
      {spec.cheeks &&
        [-1, 1].map((s) => (
          <mesh key={s} position={[s * x * 1.6, y - h * 0.62, z - 0.004]} scale={[1, 0.55, 0.1]}>
            <sphereGeometry args={[w * 0.7, 16, 10]} />
            <meshBasicMaterial color="#FF8FA3" transparent opacity={0.5} />
          </mesh>
        ))}
    </group>
  );
};

// ---------- Claude Spark (Claude logo 的放射状星芒) ----------
export const ClaudeSpark: React.FC<{size?: number; color?: string; glow?: number}> = ({size = 0.2, color = '#D97757', glow = 0.6}) => {
  const rays = useMemo(() => {
    const r = [1, 0.82, 0.95, 0.78, 1, 0.86, 0.92, 0.8, 0.97, 0.84, 0.9];
    return r.map((len, k) => ({a: (k / r.length) * Math.PI * 2 + 0.12, len}));
  }, []);
  return (
    <group>
      {rays.map((ray, k) => (
        <mesh key={k} rotation={[0, 0, ray.a]}>
          <capsuleGeometry args={[size * 0.075, size * ray.len * 1.5, 4, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={glow} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
};

// ---------- Clawd ----------
export const CLAWD = {w: 1.0, h: 0.6, d: 0.62, leg: 0.14, color: '#D77757'};

export const Clawd: React.FC<CharProps & {spark?: boolean}> = ({frame, sx = 1, sy = 1, tuck = 0, expression = 'normal', blinkOffset = 0, spark = false}) => {
  const {w, h, d, leg, color} = CLAWD;
  const legLen = leg * (1 - 0.7 * tuck);
  const wave = Math.sin(frame * 0.25) * 0.08;
  const mat = <meshPhysicalMaterial color={color} roughness={0.5} clearcoat={0.35} clearcoatRoughness={0.4} />;
  return (
    <group>
      {[-0.38, -0.2, 0.2, 0.38].map((lx, k) => (
        <mesh key={k} position={[lx * w, legLen / 2, 0]} castShadow>
          <boxGeometry args={[0.09, legLen + 0.01, 0.16]} />
          {mat}
        </mesh>
      ))}
      <group position={[0, legLen, 0]} scale={[sx, sy, sx]}>
        <RoundedBox args={[w, h, d]} radius={0.06} smoothness={4} position={[0, h / 2, 0]} castShadow receiveShadow>
          {mat}
        </RoundedBox>
        {[-1, 1].map((s) => (
          <RoundedBox key={s} args={[0.16, 0.16, 0.24]} radius={0.03} smoothness={3} position={[s * (w / 2 + 0.07), h * 0.45 + s * wave * 0.3, 0]} castShadow>
            {mat}
          </RoundedBox>
        ))}
        <Eyes
          spec={{x: w * 0.2, y: h * 0.58, z: d / 2 + 0.004, w: 0.09, h: 0.17, ink: '#1A1A1A', square: true, highlight: false}}
          expression={expression}
          blink={blinkAt(frame, blinkOffset)}
        />
        {spark && (
          <group position={[0, h + 0.2, 0]} rotation={[0, 0, frame * 0.03]}>
            <ClaudeSpark size={0.2} />
          </group>
        )}
      </group>
    </group>
  );
};

// ---------- DeepSeek 蓝鲸 ----------
export const WHALE = {top: 0.92, color: '#4D6BFE'};

export const Whale: React.FC<CharProps> = ({frame, sx = 1, sy = 1, expression = 'normal', blinkOffset = 0}) => {
  const wag = Math.sin(frame * 0.22) * 0.32;
  const r = 0.55;
  return (
    <group scale={[sx, sy, sx]}>
      <mesh position={[0, r * 0.82, 0]} scale={[1.2, 0.82, 1]} castShadow receiveShadow>
        <sphereGeometry args={[r, 48, 32]} />
        <meshPhysicalMaterial color={WHALE.color} roughness={0.38} clearcoat={0.7} clearcoatRoughness={0.25} />
      </mesh>
      {/* belly */}
      <mesh position={[0, r * 0.52, r * 0.3]} scale={[0.95, 0.55, 0.78]}>
        <sphereGeometry args={[r, 40, 24]} />
        <meshPhysicalMaterial color="#DCE5FF" roughness={0.45} clearcoat={0.4} />
      </mesh>
      {/* side fins */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * r * 1.12, r * 0.45, r * 0.2]} rotation={[0.3, 0, s * (0.9 + 0.15 * Math.sin(frame * 0.2))]} scale={[1, 0.3, 0.55]} castShadow>
          <sphereGeometry args={[0.16, 20, 12]} />
          <meshPhysicalMaterial color="#3F5CF0" roughness={0.4} clearcoat={0.5} />
        </mesh>
      ))}
      {/* tail */}
      <group position={[0, r * 0.75, -r * 0.85]} rotation={[0.55, wag, 0]}>
        <mesh position={[0, 0.1, -0.12]} scale={[0.45, 0.5, 1]} castShadow>
          <sphereGeometry args={[0.16, 20, 12]} />
          <meshPhysicalMaterial color={WHALE.color} roughness={0.4} clearcoat={0.6} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.15, 0.28, -0.2]} rotation={[0.2, 0, s * 0.75]} scale={[1, 0.28, 0.6]} castShadow>
            <sphereGeometry args={[0.17, 20, 12]} />
            <meshPhysicalMaterial color="#3F5CF0" roughness={0.4} clearcoat={0.6} />
          </mesh>
        ))}
      </group>
      <Eyes
        spec={{x: 0.21, y: r * 0.95, z: r * 0.93, w: 0.085, h: 0.15, ink: '#14161C', cheeks: true}}
        expression={expression}
        blink={blinkAt(frame, blinkOffset)}
      />
    </group>
  );
};

// ---------- Gemini 四角星 ----------
const GEM_R = 0.52;
export const GEMINI = {top: 1.25};

const useSparkleGeometry = () =>
  useMemo(() => {
    const R = GEM_R;
    const c = 0.07;
    const s = new THREE.Shape();
    s.moveTo(0, R);
    s.quadraticCurveTo(c, c, R, 0);
    s.quadraticCurveTo(c, -c, 0, -R);
    s.quadraticCurveTo(-c, -c, -R, 0);
    s.quadraticCurveTo(-c, c, 0, R);
    const g = new THREE.ExtrudeGeometry(s, {depth: 0.22, bevelEnabled: true, bevelThickness: 0.11, bevelSize: 0.07, bevelSegments: 8, curveSegments: 32});
    g.center();
    const pos = g.attributes.position;
    const colors: number[] = [];
    const blue = new THREE.Color('#4C8DF6');
    const purple = new THREE.Color('#9B72F2');
    const pink = new THREE.Color('#E56F8C');
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const t = THREE.MathUtils.clamp((x - y) / (2.4 * R) + 0.5, 0, 1);
      if (t < 0.6) tmp.copy(blue).lerp(purple, t / 0.6);
      else tmp.copy(purple).lerp(pink, (t - 0.6) / 0.4);
      colors.push(tmp.r, tmp.g, tmp.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return g;
  }, []);

export const GeminiStar: React.FC<CharProps> = ({frame, sx = 1, sy = 1, expression = 'normal', blinkOffset = 0, starBoost = 0}) => {
  const geo = useSparkleGeometry();
  const hover = 0.12 + 0.03 * Math.sin(frame * 0.14);
  return (
    <group position={[0, hover + GEM_R, 0]} scale={[sx, sy, sx]}>
      <group rotation={[0, 0, Math.sin(frame * 0.05) * 0.06 + starBoost * Math.sin(frame * 0.3) * 0.18]}>
        <mesh geometry={geo} castShadow>
          <meshPhysicalMaterial vertexColors roughness={0.25} clearcoat={1} clearcoatRoughness={0.15} emissive="#6E7BFF" emissiveIntensity={0.15 + 1.2 * starBoost} />
        </mesh>
        <Eyes
          spec={{x: 0.1, y: 0.04, z: 0.225, w: 0.07, h: 0.13, ink: '#141826', cheeks: false}}
          expression={expression}
          blink={blinkAt(frame, blinkOffset)}
        />
      </group>
    </group>
  );
};

// ---------- GPT：黑色机器人 + Blossom 六瓣结 ----------
export const GPT = {w: 0.92, h: 0.86, d: 0.78, leg: 0.17, top: 1.05};

export const Blossom: React.FC<{size?: number; glow?: number}> = ({size = 0.2, glow = 1}) => (
  <group>
    {Array.from({length: 6}).map((_, k) => {
      const a = (k / 6) * Math.PI * 2;
      return (
        <group key={k} rotation={[0, 0, a]}>
          <mesh position={[size * 0.42, size * 0.1, 0]} rotation={[0, 0, 0.5]}>
            <torusGeometry args={[size * 0.36, size * 0.075, 10, 28, Math.PI * 1.15]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={glow} roughness={0.3} />
          </mesh>
        </group>
      );
    })}
  </group>
);

export const GptBot: React.FC<CharProps> = ({frame, sx = 1, sy = 1, tuck = 0, expression = 'normal', blinkOffset = 0}) => {
  const {w, h, d, leg} = GPT;
  const legLen = leg * (1 - 0.65 * tuck);
  return (
    <group>
      {[-0.2, 0.2].map((lx, k) => (
        <group key={k} position={[lx * w, 0, 0]}>
          <mesh position={[0, legLen / 2 + 0.02, 0]} castShadow>
            <cylinderGeometry args={[0.045, 0.05, legLen, 12]} />
            <meshStandardMaterial color="#3a3e47" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.03, 0.03]} scale={[1, 0.6, 1.3]} castShadow>
            <sphereGeometry args={[0.06, 16, 10]} />
            <meshStandardMaterial color="#3a3e47" roughness={0.5} />
          </mesh>
        </group>
      ))}
      <group position={[0, legLen + 0.02, 0]} scale={[sx, sy, sx]}>
        <RoundedBox args={[w, h, d]} radius={0.2} smoothness={6} position={[0, h / 2, 0]} castShadow receiveShadow>
          <meshPhysicalMaterial color="#202329" roughness={0.28} clearcoat={1} clearcoatRoughness={0.15} />
        </RoundedBox>
        <Eyes
          spec={{x: w * 0.19, y: h * 0.56, z: d / 2 + 0.004, w: 0.075, h: 0.17, ink: '#F4F6FA', highlight: false}}
          expression={expression}
          blink={blinkAt(frame, blinkOffset)}
        />
        <group position={[0, h + 0.27, 0]} rotation={[0, 0, frame * 0.02]}>
          <Blossom size={0.17} glow={0.9 + 0.4 * Math.sin(frame * 0.2)} />
        </group>
      </group>
    </group>
  );
};

// ---------- Kimi：月之暗面 ----------
export const Moon: React.FC<{frame: number; sx?: number; sy?: number; expression?: Expression}> = ({frame, sx = 1, sy = 1, expression = 'sleep'}) => {
  const r = 0.4;
  const craters: [number, number, number][] = [
    [0.55, 0.35, 0.07],
    [0.75, -0.15, 0.05],
    [0.35, -0.45, 0.06],
  ];
  return (
    <group position={[0, r, 0]} scale={[sx, sy, sx]}>
      {/* lit half (right) */}
      <mesh castShadow>
        <sphereGeometry args={[r, 48, 32, -Math.PI / 2 + 0.0, Math.PI]} />
        <meshStandardMaterial color="#E6E8EE" roughness={0.85} emissive="#ffffff" emissiveIntensity={0.08} side={THREE.DoubleSide} />
      </mesh>
      {/* dark half (left) */}
      <mesh castShadow>
        <sphereGeometry args={[r, 48, 32, Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color="#1B1E26" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {craters.map(([u, v, cr], k) => {
        const x = u * r * 0.85;
        const y = v * r;
        const z = Math.sqrt(Math.max(0, r * r - x * x - y * y)) - 0.01;
        return (
          <mesh key={k} position={[x, y, z]} scale={[1, 1, 0.3]}>
            <sphereGeometry args={[cr, 16, 10]} />
            <meshStandardMaterial color="#C3C7D1" roughness={0.9} />
          </mesh>
        );
      })}
      <Eyes
        spec={{x: 0.12, y: 0.03, z: r - 0.01, w: 0.07, h: 0.12, ink: '#2A2D36'}}
        expression={expression}
        blink={blinkAt(frame, 0)}
      />
    </group>
  );
};

// Top of each performer's head above its feet (for props that sit on top).
export const TOPS: Record<Kind, number> = {
  haiku: (CLAWD.leg + CLAWD.h) * 0.72,
  gemini: GEMINI.top,
  gpt: GPT.top,
  deepseek: WHALE.top,
  duet: CLAWD.leg + CLAWD.h,
};

export const Character: React.FC<CharProps & {kind: Kind}> = ({kind, ...p}) => {
  if (kind === 'haiku')
    return (
      <group scale={0.72}>
        <Clawd {...p} spark />
      </group>
    );
  if (kind === 'duet') return <Clawd {...p} />;
  if (kind === 'deepseek') return <Whale {...p} />;
  if (kind === 'gemini') return <GeminiStar {...p} />;
  return <GptBot {...p} />;
};
