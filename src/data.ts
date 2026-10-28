// 事实口径：2026-10-26 检索，第三方报道交叉核对；Kimi K3.1 仅为传闻。
export type Kind = 'haiku' | 'gemini' | 'gpt' | 'deepseek' | 'duet';

export type Act = {
  kind: Kind;
  date: string;
  name: string;
  short: string;
  maker: string;
  color: string;
  accent: string;
  bullets: string[];
  big: string;
  bigLabel: string;
  subtitle: string;
  oneLiner: string;
};

export const ACTS: Act[] = [
  {
    kind: 'haiku',
    date: '10.07',
    name: 'Claude Haiku 5.5',
    short: 'Haiku 5.5',
    maker: 'Anthropic',
    color: '#EBA57F',
    accent: '#FF9F6E',
    bullets: ['≤100K 提示：输入 $0.10 / 百万 tokens', '输出 $0.50 / 百万 tokens', '1M 上下文，主打批量和子 Agent'],
    big: '-75%',
    bigLabel: '平均成本 vs Haiku 4.5',
    subtitle: '小模型大降价：比上一代便宜约 75%',
    oneLiner: '便宜约 75%',
  },
  {
    kind: 'gemini',
    date: '10.13',
    name: 'Gemini 4 Argon',
    short: 'Gemini 4 Argon',
    maker: 'Google',
    color: '#8F9CFF',
    accent: '#8AB4FF',
    bullets: ['Gemini API 正式可用', '1M 上下文', '限时 $2 / $10，12.1 起 $4 / $20'],
    big: 'GA',
    bigLabel: '预览转正式版',
    subtitle: 'Gemini 4 Argon 转正，限时半价',
    oneLiner: 'API 正式可用',
  },
  {
    kind: 'gpt',
    date: '10.16',
    name: 'GPT-6 Pro',
    short: 'GPT-6 Pro',
    maker: 'OpenAI',
    color: '#24272E',
    accent: '#E8ECF4',
    bullets: ['ChatGPT 上线并行 Agent', '一个任务拆给多个分身同时跑', 'Pro / Business / Enterprise 逐步开放'],
    big: '×N',
    bigLabel: '并行 Agent',
    subtitle: 'GPT-6 Pro：一个任务，多个分身一起干',
    oneLiner: '并行 Agent',
  },
  {
    kind: 'deepseek',
    date: '10.17',
    name: 'DeepSeek V4.1 Flash 1017',
    short: 'DeepSeek V4.1',
    maker: 'DeepSeek',
    color: '#4D6BFE',
    accent: '#6F8BFF',
    bullets: ['MIT 开源权重', 'API 价格不变', 'Terminal-Bench 4.0：31.2 → 42.3（官方）'],
    big: 'MIT',
    bigLabel: '开源协议',
    subtitle: 'DeepSeek 小更新：代码变强，价格没涨',
    oneLiner: 'MIT 开源 · 价格不变',
  },
  {
    kind: 'duet',
    date: '10.21',
    name: 'Claude Duet',
    short: 'Claude Duet',
    maker: 'Anthropic',
    color: '#D97757',
    accent: '#FF8A5B',
    bullets: ['基于 Opus 5.5 的后台主动 Agent', '盯邮件和日历，有事才找你', '研究预览：美区 Pro / Max 候补'],
    big: '后台',
    bigLabel: 'Research Preview',
    subtitle: 'Claude Duet：你不找它，它也在后台盯着',
    oneLiner: '后台主动 Agent',
  },
];

export const FPS = 30;
export const INTRO = 150;
export const ACT_LEN = 180;
export const OUTRO = 240;
export const TOTAL = INTRO + ACT_LEN * ACTS.length + OUTRO;

export type Segment =
  | {type: 'intro'; f: number}
  | {type: 'act'; i: number; f: number}
  | {type: 'outro'; f: number};

export const segmentAt = (frame: number): Segment => {
  if (frame < INTRO) return {type: 'intro', f: frame};
  const a = frame - INTRO;
  const i = Math.floor(a / ACT_LEN);
  if (i < ACTS.length) return {type: 'act', i, f: a - i * ACT_LEN};
  return {type: 'outro', f: frame - INTRO - ACT_LEN * ACTS.length};
};

export const actStart = (i: number) => INTRO + i * ACT_LEN;
export const OUTRO_START = INTRO + ACT_LEN * ACTS.length;
