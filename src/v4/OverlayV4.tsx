import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ACTS} from '../data';
import {prog} from '../anim';
import {ACT_F, BAR, BEAT, HOOK_F, INTRO_F, NOV_F, OUTRO_F, REVEAL_F, TOTAL_F, actStartF} from './timing';
import {GLITCH_F} from './endcard';
import {LAND} from './haiku';
import {DASH_A} from './gemini';

const FONT = '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif';
const DASH = [...ACTS.map((a) => a.accent), '#C9A7FF'];

const lines: {text: string; a: number; b: number}[] = [
  {text: '这个月 AI 圈 6 个大发布，你跟上了几个？', a: 8, b: HOOK_F - 4},
  {text: '十月模型圈：6 个发布，一张日历看完', a: HOOK_F + 18, b: INTRO_F - 4},
  {text: ACTS[0].subtitle, a: actStartF(0) + LAND, b: actStartF(0) + ACT_F - 6},
  {text: ACTS[1].subtitle, a: actStartF(1) + DASH_A, b: actStartF(1) + ACT_F - 6},
  {text: ACTS[2].subtitle, a: actStartF(2) + BAR, b: actStartF(2) + ACT_F - 6},
  {text: ACTS[3].subtitle, a: actStartF(3) + BAR, b: actStartF(3) + ACT_F - 6},
  {text: ACTS[4].subtitle, a: actStartF(4) + BAR, b: actStartF(4) + ACT_F - 6},
  {text: 'Kimi K3.1 Pro：月之暗面亮了，2.8 万亿参数', a: actStartF(5) + BAR, b: actStartF(5) + ACT_F - 6},
  {text: '十月成绩单', a: OUTRO_F + BAR, b: NOV_F + BEAT},
  {text: '11 月见', a: NOV_F + 2 * BEAT, b: REVEAL_F + 2 * BEAT - 4},
];

const Chip: React.FC<{frame: number}> = ({frame}) => {
  const i = Math.floor((frame - INTRO_F) / ACT_F);
  if (i < 0 || i > 5) return null;
  const fill = ((frame - INTRO_F) % ACT_F) / ACT_F;
  const label = i < ACTS.length ? `${String(i + 1).padStart(2, '0')} · ${ACTS[i].short}` : '06 · Kimi K3.1 Pro';
  return (
    <div style={{position: 'absolute', left: 56, top: 48, opacity: prog(frame, INTRO_F, INTRO_F + 10), display: 'flex', alignItems: 'center', gap: 18, padding: '12px 22px', borderRadius: 16, background: 'rgba(12,14,20,0.6)', border: '1px solid rgba(255,255,255,0.1)', fontFamily: FONT}}>
      <div style={{display: 'flex', gap: 6}}>
        {DASH.map((c, k) => (
          <div key={k} style={{width: 26, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.18)', overflow: 'hidden'}}>
            <div style={{height: '100%', width: `${k < i ? 100 : k === i ? fill * 100 : 0}%`, background: c}} />
          </div>
        ))}
      </div>
      <div style={{color: '#fff', fontSize: 24, fontWeight: 700}}>{label}</div>
    </div>
  );
};

const Subtitle: React.FC<{frame: number}> = ({frame}) => {
  const cur = lines.find((l) => frame >= l.a && frame < l.b);
  if (!cur) return null;
  const vis = prog(frame, cur.a, cur.a + 8) * (1 - prog(frame, cur.b - 6, cur.b));
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 70, display: 'flex', justifyContent: 'center', opacity: vis, transform: `translateY(${(1 - vis) * 14}px)`}}>
      <div style={{fontFamily: FONT, fontSize: 50, fontWeight: 800, color: '#fff', padding: '12px 32px', borderRadius: 18, background: 'rgba(10,12,18,0.55)', textShadow: '0 4px 24px rgba(0,0,0,0.8)'}}>{cur.text}</div>
    </div>
  );
};

// A few frames of horizontal tear bands when the November page turns into code.
const Glitch: React.FC<{frame: number}> = ({frame}) => {
  const d = frame - GLITCH_F;
  if (d < -6 || d > 4) return null;
  const k = Math.floor(frame);
  return (
    <AbsoluteFill style={{mixBlendMode: 'screen'}}>
      {[0, 1, 2, 3, 4].map((i) => {
        const y = (((k * 37 + i * 211) % 97) / 97) * 100;
        const h = 1 + ((k * 13 + i * 7) % 5);
        const c = ['#ff3b6b', '#3bd5ff', '#ffffff'][i % 3];
        return <div key={i} style={{position: 'absolute', left: 0, right: 0, top: `${y}%`, height: `${h}%`, background: c, opacity: 0.35, transform: `translateX(${((k * 29 + i * 53) % 60) - 30}px)`}} />;
      })}
    </AbsoluteFill>
  );
};

// End card: how the film was made, and who made it.
const END_A = REVEAL_F + BAR;
const EndCard: React.FC<{frame: number}> = ({frame}) => {
  if (frame < END_A) return null;
  const scrim = prog(frame, END_A, END_A + 12);
  const row = (i: number) => {
    const v = prog(frame, END_A + 6 + i * 8, END_A + 18 + i * 8);
    return {opacity: v, transform: `translateY(${(1 - v) * 18}px)`};
  };
  return (
    <AbsoluteFill style={{background: `rgba(5,6,9,${0.62 * scrim})`, alignItems: 'center', justifyContent: 'center', fontFamily: FONT, textAlign: 'center'}}>
      <div style={{...row(0), fontSize: 58, fontWeight: 900, color: '#fff', textShadow: '0 4px 30px rgba(0,0,0,0.8)'}}>这条视频的每一帧，都是 AI 写代码画出来的</div>
      <div style={{...row(1), marginTop: 30, fontSize: 32, fontWeight: 600, color: '#C9D0DE'}}>Three.js + Remotion · 由 Claude Opus 5.5 制作</div>
      <div style={{...row(2), marginTop: 46, fontSize: 40, fontWeight: 800, color: '#FFB27F'}}>@Wardell康康</div>
    </AbsoluteFill>
  );
};

export const OverlayV4: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Chip frame={frame} />
      <Subtitle frame={frame} />
      <Glitch frame={frame} />
      <EndCard frame={frame} />
      <AbsoluteFill style={{background: '#000', opacity: prog(frame, TOTAL_F - 10, TOTAL_F - 1)}} />
    </AbsoluteFill>
  );
};
