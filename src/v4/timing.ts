// v5 全片按 125 BPM 排拍：钩子 2 小节 + 开场 2 小节 + 6 幕 × 4 小节 + 结尾 5 小节 = 33 小节 ≈ 63 秒。
// 配乐 audio/score_v4.py 用同一套小节线。
import {FPS} from '../data';

export const BPM = 125;
export const BEAT = (FPS * 60) / BPM; // 14.4 帧
export const BAR = BEAT * 4;

export const HOOK_F = 2 * BAR;
export const INTRO_F = HOOK_F + 2 * BAR;
export const ACT_F = 4 * BAR;
// 每幕原来的 3 小节动画（v4）写在「旧本地帧」里；第二拍那 1 小节插进来时，旧动画停在插入点。
export const ACT3 = 3 * BAR;
export const actStartF = (i: number) => INTRO_F + i * ACT_F;
export const warp = (L: number, ins: number) => (L < ins ? L : L < ins + BAR ? ins : L - BAR);

export const OUTRO_F = actStartF(6);
export const NOV_F = OUTRO_F + 2 * BAR; // 全员落地，翻到 11 月
export const REVEAL_F = OUTRO_F + 3 * BAR; // 拉远，揭秘是代码
export const TOTAL_F = Math.ceil(OUTRO_F + 5 * BAR);

export const beat = (n: number) => n * BEAT;
