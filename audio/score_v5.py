"""v5 配乐：在 v4 配乐（score_v4.py）上按加长版结构重排，33 小节 ≈ 63 秒。

- v4 的全部画面音效原样复用，时间按 v5 的时间轴平移：前面加 2 小节钩子，每幕在「第二拍」插入点后推 1 小节。
- 铺底、低音、鼓按新的 33 小节重写，和弦仍是 D 小调，每幕多一小节。
- 新加：钩子（格子一行行亮起）、6 个第二拍（小票、翻牌、报告、价格柱、拦邮件、MoE 方块）、
  结尾（翻页、11 月铃音、屏幕闪成代码、键盘声、收尾和弦）。

用法：python audio/score_v5.py [时长秒] [输出.wav]
时间点与 src/v4/timing.ts、各幕 tsx 的 INS 常量及 endcard.tsx 保持一致。
"""
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

import score_v4 as v4
from mix_v4 import BAR, BEAT, FPS, ROOT, SR, Track, mix, noise, rng, sweep_noise, thud, tone
from score_v4 import (BB, C, D, F_, G, A, MAJOR, MINOR, K_FLIP, LAND, STOMP, STOP, U_ALERT, U_DOT_A, bell, big_hit,
                      hat, hz, kick, pad_voice, pluck, reverb)

HOOK_F = 2 * BAR
INTRO_F = HOOK_F + 2 * BAR
ACT_F = 4 * BAR
OUTRO_F = INTRO_F + 6 * ACT_F
NOV_F = OUTRO_F + 2 * BAR
REVEAL_F = OUTRO_F + 3 * BAR
TOTAL_F = int(np.ceil(OUTRO_F + 5 * BAR))
# each act's second-beat insert point, in that act's local frames (haiku ORB_A, gemini WAKE, gpt PIPE_A,
# deepseek SPOUT, duet BAR, kimi 2BAR-BEAT)
INS = [2 * BAR + 2 * BEAT, 2 * BAR + 2 * BEAT, 2 * BAR + 3 * BEAT, 2 * BAR + 3 * BEAT, BAR, 2 * BAR - BEAT]
OLD_INS = [2 * BAR + k * 3 * BAR + ins for k, ins in enumerate(INS)]
HOLD = [INTRO_F + k * ACT_F + ins for k, ins in enumerate(INS)]  # second beat starts (v5 frames)
FLIP_A, FLIP_B = NOV_F + BEAT / 2, NOV_F + 2 * BEAT
GLITCH_F = REVEAL_F + 2 * BEAT


def act(i):
    return INTRO_F + i * ACT_F


def remap(f):
    """v4 global frame -> v5 frame. Events at an insert point happen after the inserted bar."""
    return f + HOOK_F + BAR * sum(g <= f for g in OLD_INS)


class RemapTrack(Track):
    def add(self, frame, sig, gain=1.0, pan=0.0):
        if frame < 27:  # v4's power-on glide and boot ticks: the v5 hook has its own
            return
        super().add(remap(frame), sig, gain, pan)


# chords, bar by bar, 33 bars. The inserted bars keep each act's colour.
CHORDS = {
    0: [(0, D, MINOR)], 1: [(0, D, MINOR)], 2: [(0, D, MINOR)], 3: [(0, D, MINOR)],
    4: [(0, BB, MAJOR)], 5: [(0, C, MAJOR)], 6: [(0, D, MINOR)], 7: [(0, BB, MAJOR), (2, C, MAJOR)],
    8: [(0, F_, MAJOR)], 9: [(0, BB, MAJOR), (2, C, MAJOR)], 10: [(0, F_, MAJOR)], 11: [(0, BB, MAJOR), (2, C, MAJOR)],
    12: [(0, D, MINOR)], 13: [(0, BB, MAJOR)], 14: [(0, G, MINOR), (2, F_, MAJOR)], 15: [(0, BB, MAJOR), (2, C, MAJOR)],
    16: [(0, D, MINOR)], 17: [(0, BB, MAJOR)], 18: [(0, C, MAJOR)], 19: [(0, F_, MAJOR), (2, C, MAJOR)],
    20: [(0, D, MINOR)], 21: [(0, G, MINOR)], 22: [(0, BB, MAJOR)], 23: [(0, F_, MAJOR)],
    24: [(0, D, MINOR), (2, A, MAJOR)], 25: [(0, D, MAJOR)], 26: [(0, G, MAJOR), (2, A, MAJOR)], 27: [(0, BB, MAJOR), (2, C, MAJOR)],
    28: [(0, F_, MAJOR)], 29: [(0, BB, MAJOR), (2, A, MAJOR)], 30: [(0, D, MAJOR)], 31: [(0, BB, MAJOR), (2, A, MAJOR)],
    32: [(0, D, MAJOR)],
}
N_BARS = len(CHORDS)
QUIET = {0, 1, 2, 3, 16, 20, 21, 24, 31, 32}  # hook, intro, underwater, rain, dark moon, the reveal

GAPS = [
    (act(0) + LAND + 3 * BEAT, act(0) + STOMP),
    (act(1) + STOP - BEAT, act(1) + STOP),
    (act(5) + K_FLIP - BEAT, act(5) + K_FLIP),
    (NOV_F - BEAT / 2, NOV_F),
]


def bar_f(i):
    return i * BAR


def root_at(f):
    i = min(int(f // BAR), N_BARS - 1)
    beat = (f - i * BAR) / BEAT
    return [r for b0, r, _ in CHORDS[i] if b0 <= beat + 1e-6][-1]


def gap(f):
    return any(a <= f < b for a, b in GAPS)


def music(seconds):
    pad = Track(seconds)
    bass = Track(seconds)
    drums = Track(seconds)
    for i, segs in CHORDS.items():
        for j, (b0, root, tri) in enumerate(segs):
            b1 = segs[j + 1][0] if j + 1 < len(segs) else 4
            dur = (b1 - b0) * BEAT / FPS + (3.0 if i == N_BARS - 1 else 0.4)
            att = 1.6 if i < 2 else 1.0 if i < 4 else 0.8 if i in QUIET else 0.25
            g = 0.05 if i < 2 else 0.07
            for k, off in enumerate(tri):
                pad.add(bar_f(i) + b0 * BEAT, pad_voice(root + 12 + off, dur, a=att), g, pan=(k - 1) * 0.5)
            pad.add(bar_f(i) + b0 * BEAT, pad_voice(root, dur, a=att), 0.06)  # sub drone

    # bass: 8th-note pulse in the busy bars, half notes where the scene breathes
    for i in range(4, N_BARS):
        for e in range(8):
            f = bar_f(i) + e * BEAT / 2
            slow = i in QUIET
            if gap(f) or (slow and e % 4) or (i == 10 and 0 < e < 4) or (i == N_BARS - 1 and e > 0):
                continue
            r = root_at(f)
            bass.add(f, pluck(r - 12 if e % 2 == 0 else r, 0.6 if slow else 0.3, d=0.2 if slow else 0.09, bright=0.6), 0.32)

    def k(f, g=0.55):
        if not gap(f):
            drums.add(f, kick(), g)

    def h(f, g=0.07, d=0.03, pan=0.0):
        if not gap(f):
            drums.add(f, hat(d), g, pan=pan)

    def four(i, hats=8, g=0.55):
        for b in range(4):
            k(bar_f(i) + b * BEAT, g)
        for s in range(hats):
            on = s % 2 == 0
            h(bar_f(i) + s * 4 * BEAT / hats, 0.08 if on else 0.05, 0.03 if on else 0.015, pan=-0.2 if on else 0.3)

    def offhats(i, g=0.06, d=0.03, start=0):
        for b in range(start, 4):
            h(bar_f(i) + b * BEAT + BEAT / 2, g, d)

    # Haiku: light kick, build, gap, stomp, then the receipt bar ticks along on 8th hats
    for b in range(4):
        if b % 2 == 0:
            k(bar_f(4) + b * BEAT, 0.5)
        h(bar_f(4) + b * BEAT + BEAT / 2)
    for b in range(3):
        k(bar_f(5) + b * BEAT)
        h(bar_f(5) + b * BEAT + BEAT / 2, 0.08)
    k(bar_f(6) + 2 * BEAT, 0.45)
    for s in range(8):
        h(bar_f(7) + s * BEAT / 2, 0.05, 0.015)
    k(bar_f(7) + 2 * BEAT, 0.4)
    # Gemini: airy hats, 16ths on the dash, GA lands, half-time under the price flip
    offhats(8, 0.06, 0.05)
    four(9, hats=16, g=0.6)
    k(bar_f(11), 0.45)
    k(bar_f(11) + 2 * BEAT, 0.4)
    offhats(11, 0.05)
    # GPT: wake hats, four-on-the-floor while the lanes fill, lighter four under the report
    offhats(12)
    four(13)
    for b in range(2):
        k(bar_f(14) + b * BEAT)
        h(bar_f(14) + b * BEAT + BEAT / 2)
    k(bar_f(14) + 2 * BEAT, 0.6)
    four(15, g=0.45)
    # DeepSeek: underwater, the bump kicks it back in, full while the bar climbs, steady under the flat price
    k(bar_f(17), 0.5)
    k(bar_f(17) + 2 * BEAT, 0.45)
    four(18, hats=16)
    k(bar_f(19), 0.45)
    k(bar_f(19) + 2 * BEAT, 0.4)
    offhats(19, 0.05)
    # Duet: rain only, soft offbeat ticks once the alert pops, kick on the tap
    offhats(22, 0.05, 0.02, start=1)
    k(bar_f(23), 0.5)
    k(bar_f(23) + 2 * BEAT, 0.4)
    # Kimi: dark bar, the climax, the MoE bar keeps the energy, then the gift
    four(25, hats=16, g=0.62)
    four(26, hats=16, g=0.55)
    four(27, g=0.58)
    # outro: half-time, an 8th-note build, land; the reveal has no drums
    k(bar_f(28), 0.5)
    k(bar_f(28) + 2 * BEAT, 0.45)
    offhats(28)
    for s in range(8):
        k(bar_f(29) + s * BEAT / 2, 0.35 + 0.04 * s)
        h(bar_f(29) + s * BEAT / 2 + BEAT / 4, 0.06)
    k(bar_f(30) + 2 * BEAT, 0.35)
    return pad.buf, bass.buf, drums.buf


def keyclick():
    return mix(noise(0.012, 1800, 7000, d=0.004), 0.5 * tone(320, 180, 0.03, d=0.01))


def new_notes(seconds):
    tr = Track(seconds)
    hits = Track(seconds)

    # --- hook: cells come up diagonal by diagonal from 26, one soft rising note per diagonal; riser into the intro
    hook_scale = [62, 65, 67, 69, 72, 74, 77, 79, 81, 84, 86]
    tr.add(0, bell(74, 1.6, 0.8), 0.07)  # today (26) breathes
    for d, m in enumerate(hook_scale):
        tr.add(10 + d * 8.5, pluck(m + 12, 0.4, 0.09, bright=0.35), 0.05 + 0.004 * d, pan=-0.6 + 0.12 * d)
    hits.add(HOOK_F - 40, sweep_noise(40 / FPS, 300, 2600, 1200, 0.95), 0.1)
    tr.add(HOOK_F, tone(147, 587, 0.9, d=0.5), 0.1)  # v4's power-on glide, now on the intro downbeat

    # --- Haiku receipt: each printed line is a burst of dot-matrix ticks plus a note
    h0 = HOLD[0]
    for i, m in enumerate([81, 84, 86, 89]):
        f = h0 + i * BEAT
        for s in range(7):
            hits.add(f + s * 1.1, noise(0.008, 2500, 7000, d=0.003), 0.06, pan=0.3)
        tr.add(f + 6, pluck(m, 0.4, 0.1, bright=0.5), 0.12, pan=0.3)

    # --- Gemini price flip: card pops, swish + coin on the flip, hourglass ticks
    h1 = HOLD[1]
    tr.add(h1, pluck(77, 0.4, 0.1), 0.14)
    hits.add(h1 + BEAT, sweep_noise(10 / FPS, 1200, 5000, 1800, 0.6), 0.14)
    for k, m in enumerate([93, 98]):
        tr.add(h1 + BEAT + 10 + k * 2, bell(m, 0.9, 0.3), 0.1)
    for s in range(4):
        hits.add(h1 + 2 * BEAT + s * BEAT / 2, noise(0.02, 3000 if s % 2 else 2200, 8000, d=0.006), 0.07, pan=-0.2)

    # --- GPT report: four sheets whoosh back, notes up the F chord, the card chord, the stamp
    h2 = HOLD[2]
    for k, m in enumerate([65, 69, 72, 77]):
        f = h2 + k * BEAT / 2
        hits.add(f, sweep_noise(14 / FPS, 600, 3000, 1200, 0.7), 0.08, pan=-0.45 + 0.3 * k)
        tr.add(f + 14, pluck(m + 12, 0.35, 0.1, bright=0.6), 0.13, pan=-0.45 + 0.3 * k)
    for m in (65, 69, 72, 77):
        tr.add(h2 + 2 * BEAT, bell(m + 12, 1.0, 0.4), 0.06)
    hits.add(h2 + 3 * BEAT, thud(0.35, 150, 60, 0.1), 0.45)
    hits.add(h2 + 3 * BEAT, noise(0.15, 1500, 7000, d=0.04), 0.2)

    # --- DeepSeek price bar: rises, then holds one flat note; the arrow label pings
    h3 = HOLD[3]
    tr.add(h3, tone(hz(57), hz(69), 12 / FPS, d=1, a=0.02) * 0.5, 0.12)
    tr.add(h3 + 12, tone(hz(69), hz(69), 1.2, d=0.6, a=0.01), 0.07)
    tr.add(h3 + BEAT, bell(81, 0.8, 0.3), 0.12)
    tr.add(h3 + BEAT + 3, pluck(76, 0.5, 0.15), 0.1)

    # --- Duet: three emails whoosh in, Clawd blocks each one (a muted "nope"), the gold one glides to the phone
    h4 = HOLD[4]
    for k in range(3):
        hits.add(h4 + k * BEAT, sweep_noise(10 / FPS, 800, 2500, 900, 0.8), 0.06, pan=-0.4)
        hits.add(h4 + k * BEAT + 10, thud(0.18, 200, 120, 0.05), 0.3)
        tr.add(h4 + k * BEAT + 10, pluck([50, 49, 50][k], 0.25, 0.05, bright=0.8), 0.18)
    tr.add(h4 + BAR, tone(hz(77), hz(89), BEAT / FPS, d=2, a=0.1) * 0.4, 0.08)
    # rain keeps going through the inserted bar (v4's rain bed is one bar short now)
    rain_a, rain_b = act(4) + 140, act(4) + BAR + U_DOT_A + 10
    n = int((rain_b - rain_a) / FPS * SR)
    rain = noise(n / SR, 1500, 9000, d=1e3, a=0.8) * np.minimum(1, (n - np.arange(n)) / (0.6 * SR))
    hits.add(rain_a, rain, 0.05)

    # --- Kimi MoE: the cube pops, every beat five blocks light up as five quick high notes
    h5 = HOLD[5]
    hits.add(h5, thud(0.25, 180, 90, 0.06), 0.25)
    tr.add(h5 + 2, bell(86, 0.8, 0.3), 0.08)
    penta = [86, 88, 90, 93, 95, 98]
    for b in range(4):
        f0 = max(6, b * BEAT)
        for s in range(5):
            tr.add(h5 + f0 + s * 1.6, pluck(penta[int(rng.integers(len(penta)))], 0.18, 0.04, bright=0.3), 0.045, pan=rng.uniform(-0.5, 0.5))

    # --- ending: the page flips over, lands, the gift drops on 11.4 with a bell
    hits.add(FLIP_A, sweep_noise((FLIP_B - FLIP_A) / FPS, 400, 4000, 1500, 0.6), 0.2)
    for s in range(5):
        hits.add(FLIP_A + s * 4, noise(0.04, 1200, 6000, d=0.015), 0.05, pan=-0.3 + 0.15 * s)
    hits.add(FLIP_B, thud(0.4, 120, 60, 0.12), 0.3)
    hits.add(FLIP_B + 10, thud(0.25, 180, 100, 0.06), 0.3)
    for k, m in enumerate([86, 90, 93]):
        tr.add(FLIP_B + 12 + k * 3, bell(m, 1.4, 0.6), 0.1)

    # --- reveal: digital glitch, then the keyboard types along with the code
    for s in range(10):
        f = GLITCH_F - 6 + s
        hits.add(f, noise(0.03, 300 + 900 * (s % 3), 9000, d=0.02), 0.12, pan=rng.uniform(-0.6, 0.6))
    hits.add(GLITCH_F, tone(880, 110, 0.15, d=0.05) * np.sign(np.sin(np.arange(int(0.15 * SR)) / SR * 2 * np.pi * 440)), 0.04)
    f = GLITCH_F + 4
    while f < TOTAL_F - 12:
        hits.add(f, keyclick(), 0.09 + 0.03 * rng.uniform(), pan=rng.uniform(-0.3, 0.3))
        f += rng.uniform(3, 7)
    # the end card lands on the last chord
    end = REVEAL_F + BAR
    for m in (50, 62, 66, 69, 74, 78):
        tr.add(end, pluck(m, 3.0, 1.0, bright=0.6), 0.08)
    tr.add(end + 2, bell(90, 2.5, 1.0), 0.07)
    return tr.buf, hits.buf


def main():
    seconds = float(sys.argv[1]) if len(sys.argv) > 1 else TOTAL_F / FPS
    dst = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "out/v5-score.wav"
    pad, bass, drums = music(seconds)
    v4.Track = RemapTrack
    old_tonal, old_hits = v4.notes(seconds)
    tonal, hits = new_notes(seconds)
    tonal += old_tonal
    hits += old_hits
    duck = np.ones(len(pad))
    for f in (act(0) + STOMP, act(1) + STOP, act(5) + K_FLIP, NOV_F):
        i = int(f / FPS * SR)
        n = min(int(0.8 * SR), len(duck) - i)
        duck[i:i + n] = 1 - 0.5 * np.exp(-np.arange(n) / SR / 0.25)
    wet = np.stack([reverb(c, 2.2, 0.35) for c in (pad + tonal).T], 1)
    out = (wet + bass + drums) * duck[:, None] + hits
    fade = int(0.6 * SR)
    out[-fade:] *= np.linspace(1, 0, fade)[:, None]
    out = np.tanh(out * 1.6)
    sf.write(dst, (out * 0.78).astype(np.float32), SR)
    print(f"wrote {dst} ({seconds:.2f}s, peak {np.abs(out).max():.2f})")


if __name__ == "__main__":
    main()
