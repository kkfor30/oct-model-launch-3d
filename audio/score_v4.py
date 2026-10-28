"""v4 配乐：不贴整首 BGM，按参考片（沈默 Moment / 一页枝鸥）的做法自己“作曲”。

- 底：D 小调 pad + 低音，和弦每小节一换（125 BPM，和画面小节线对齐），每幕一组和弦颜色。
- 局部音乐：鼓只在蓄力、冲刺、高潮这些段落进；水下、雨夜、暗面月亮只留铺底。
- 重拍前留半拍空白再砸（Haiku 跺脚、GA 印章、月亮翻面、结尾落地）。
- 音效即音符：日期闪烁、跳跃、价格倒数、跑道点亮、进度条、跑分爬升都是调内音高，跟着画面帧。

用法：python audio/score_v4.py [时长秒] [输出.wav]
时间点与 src/v4/timing.ts 及各幕 tsx 保持一致。
"""
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import fftconvolve

from mix_v4 import BAR, BEAT, FPS, INTRO_F, ROOT, SR, Track, mix, noise, rng, sweep_noise, thud, tone

ACT_F = 3 * BAR
A0 = INTRO_F  # Haiku
A1 = INTRO_F + ACT_F  # Gemini
# haiku.tsx
LAND, STOMP, ORB_A, ORB_B = BAR, 2 * BAR, 2 * BAR + 2 * BEAT, 3 * BAR
# gemini.tsx
DASH_A, STOP, WAKE = BAR, 2 * BAR, 2 * BAR + 2 * BEAT
# gpt.tsx
G_SPLIT, G_FILL_A, G_DONE, G_PIPE = BAR, BAR + 2 * BEAT, 2 * BAR + 2 * BEAT, 2 * BAR + 3 * BEAT
G_POPS = [BAR + k * BEAT / 2 for k in range(4)]
G_ENDS = [2 * BAR, 2 * BAR + BEAT, 2 * BAR + 0.5 * BEAT, 2 * BAR + 1.5 * BEAT]
# deepseek.tsx
D_BUMP, D_OPEN, D_RIDE = BAR, BAR + BEAT, BAR + 2 * BEAT
D_GROW_A, D_GROW_B, D_SPOUT, D_SPLASH = 2 * BAR, 2 * BAR + 2 * BEAT, 2 * BAR + 3 * BEAT, ACT_F + 14
# duet.tsx
U_ALERT, U_TAP, U_DOT_A, U_DOT_HIT = BAR + BEAT, 2 * BAR, 2 * BAR + 3 * BEAT, ACT_F + BEAT
# kimi.tsx
K_HIT, K_FLIP, K_SAT, K_BIG, K_GIFT = BEAT, BAR, BAR + BEAT, BAR + 2 * BEAT, 2 * BAR


def act(i):
    return INTRO_F + i * ACT_F


def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


def pluck(m, dur=0.6, d=0.18, bright=0.5):
    f = hz(m)
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = sum(bright ** (k - 1) / k * np.sin(2 * np.pi * f * k * t) * np.exp(-t / (d / k ** 0.5)) for k in range(1, 6))
    return s * np.minimum(1, t / 0.002)


def bell(m, dur=1.2, d=0.5):
    f = hz(m)
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.15) + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / 0.06)
    return s * np.exp(-t / d) * np.minimum(1, t / 0.002)


def pad_voice(m, dur, a=0.6, r=0.8):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for det in (-0.08, 0.0, 0.08):  # three detuned soft saws
        f = hz(m + det)
        s += sum(np.sin(2 * np.pi * f * k * t + k) / k ** 1.6 for k in range(1, 7))
    e = np.minimum(1, t / a) * np.minimum(1, (dur - t) / r).clip(0)
    return s / 3 * e


def kick():
    return mix(tone(150, 42, 0.35, d=0.12), 0.25 * noise(0.01, 2000, 6000, d=0.003))


def hat(d=0.03):
    return noise(0.08, 7000, 15000, d=d)


def reverb(x, secs=1.8, wet=0.28):
    n = int(secs * SR)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR / (secs / 5))
    ir[: int(0.012 * SR)] = 0  # pre-delay
    y = fftconvolve(x, ir)[: len(x)]
    return x + wet * y / np.abs(ir).sum() * 40


# chords, bar by bar: (beat, bass root midi, triad). Each act gets its own colour:
# Haiku Bb-C-Dm, Gemini F-Bb/C-F, GPT Dm-Bb-Gm/F, DeepSeek Dm-Bb-C, Duet Dm-Bb-F,
# Kimi Dm/A -> D major (the bright side), outro F-Bb/A -> D major.
D, F_, BB, C, G, A = 50, 53, 46, 48, 43, 45
MINOR, MAJOR = (0, 3, 7), (0, 4, 7)
CHORDS = {
    0: [(0, D, MINOR)], 1: [(0, D, MINOR)],
    2: [(0, BB, MAJOR)], 3: [(0, C, MAJOR)], 4: [(0, D, MINOR)],
    5: [(0, F_, MAJOR)], 6: [(0, BB, MAJOR), (2, C, MAJOR)], 7: [(0, F_, MAJOR)],
    8: [(0, D, MINOR)], 9: [(0, BB, MAJOR)], 10: [(0, G, MINOR), (2, F_, MAJOR)],
    11: [(0, D, MINOR)], 12: [(0, BB, MAJOR)], 13: [(0, C, MAJOR)],
    14: [(0, D, MINOR)], 15: [(0, BB, MAJOR)], 16: [(0, F_, MAJOR)],
    17: [(0, D, MINOR), (2, A, MAJOR)], 18: [(0, D, MAJOR)], 19: [(0, BB, MAJOR), (2, C, MAJOR)],
    20: [(0, F_, MAJOR)], 21: [(0, BB, MAJOR), (2, A, MAJOR)], 22: [(0, D, MAJOR)],
}
N_BARS = len(CHORDS)


def bar_f(i):
    return i * BAR


def root_at(f):
    i = min(int(f // BAR), N_BARS - 1)
    beat = (f - i * BAR) / BEAT
    return [r for b0, r, _ in CHORDS[i] if b0 <= beat + 1e-6][-1]


# half-beat silences right before the big hits (bass and drums drop out)
GAPS = [
    (A0 + LAND + 3 * BEAT, A0 + STOMP),
    (A1 + STOP - BEAT, A1 + STOP),
    (act(5) + K_FLIP - BEAT, act(5) + K_FLIP),
    (act(6) + 2 * BAR - BEAT / 2, act(6) + 2 * BAR),
]


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
            att = 1.2 if i < 2 else 0.8 if i in (11, 14, 17) else 0.25
            for k, off in enumerate(tri):
                pad.add(bar_f(i) + b0 * BEAT, pad_voice(root + 12 + off, dur, a=att), 0.07, pan=(k - 1) * 0.5)
            pad.add(bar_f(i) + b0 * BEAT, pad_voice(root, dur, a=att), 0.06)  # sub drone

    # bass: 8th-note pulse in the busy bars, half notes where the scene breathes (underwater, rain, dark moon)
    half = {11, 14, 17}
    for i in range(2, N_BARS):
        for e in range(8):
            f = bar_f(i) + e * BEAT / 2
            if gap(f) or (i in half and e % 4):
                continue
            if (i == 7 and 0 < e < 4) or (i == N_BARS - 1 and e > 0):
                continue
            r = root_at(f)
            slow = i in half
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

    # Haiku: light kick, build, gap, stomp, one kick after
    for b in range(4):
        if b % 2 == 0:
            k(bar_f(2) + b * BEAT, 0.5)
        h(bar_f(2) + b * BEAT + BEAT / 2)
    for b in range(3):
        k(bar_f(3) + b * BEAT)
        h(bar_f(3) + b * BEAT + BEAT / 2, 0.08)
    k(bar_f(4) + 2 * BEAT, 0.45)
    # Gemini: airy hats while the star rises, full 16ths on the dash
    for b in range(4):
        h(bar_f(5) + b * BEAT + BEAT / 2, 0.06, 0.05)
    four(6, hats=16, g=0.6)
    # GPT: offbeat hats while it wakes, four-on-the-floor while the lanes fill, stop on DONE
    for b in range(4):
        h(bar_f(8) + b * BEAT + BEAT / 2, 0.06)
    four(9)
    for b in range(2):
        k(bar_f(10) + b * BEAT)
        h(bar_f(10) + b * BEAT + BEAT / 2)
    k(bar_f(10) + 2 * BEAT, 0.6)
    # DeepSeek: underwater (no drums), the bump kicks it back in, full while the bar climbs
    k(bar_f(12), 0.5)
    k(bar_f(12) + 2 * BEAT, 0.45)
    four(13, hats=16)
    # Duet: rain only, soft offbeat ticks once the alert pops, kick on the tap
    for b in range(1, 4):
        h(bar_f(15) + b * BEAT + BEAT / 2, 0.05, 0.02)
    k(bar_f(16), 0.5)
    k(bar_f(16) + 2 * BEAT, 0.4)
    # Kimi: dark bar, then the climax at full tilt
    four(18, hats=16, g=0.62)
    four(19, g=0.58)
    # outro: half-time, an 8th-note build, land
    k(bar_f(20), 0.5)
    k(bar_f(20) + 2 * BEAT, 0.45)
    for b in range(4):
        h(bar_f(20) + b * BEAT + BEAT / 2, 0.06)
    for s in range(8):
        k(bar_f(21) + s * BEAT / 2, 0.35 + 0.04 * s)
        h(bar_f(21) + s * BEAT / 2 + BEAT / 4, 0.06)
    return pad.buf, bass.buf, drums.buf


def lane_times():
    """Frames at which each runway tile in gemini.tsx lights up (star x passes tile x - 0.125)."""
    x0, x1, cell = -3.44, 0.0, 1.6
    ln = (x1 - x0 + cell * 0.6) / 12

    def ease(t):
        return 4 * t ** 3 if t < 0.5 else 1 - (-2 * t + 2) ** 3 / 2

    out = []
    ls = np.arange(DASH_A, STOP, 0.25)
    xs = np.array([x0 + (x1 - x0) * ease((l - DASH_A) / (STOP - DASH_A)) for l in ls])
    for k in range(12):
        th = x0 - cell * 0.3 + (k + 0.5) * ln - 0.125
        hit = np.nonzero(xs >= th)[0]
        if len(hit):
            out.append(max(ls[hit[0]], DASH_A + len(out) * 1.5))  # tiles already behind the start get a quick roll
    return out


def big_hit(tr, f, g=0.9):
    tr.add(f, mix(tone(72, 30, 1.8, d=0.55), 0.8 * noise(0.3, 60, 500, d=0.15)), g)


def notes(seconds):
    """Every on-screen event as an in-key note or a hit."""
    tr = Track(seconds)
    hits = Track(seconds)
    # --- intro: power-on glide, boot ticks as quiet random D-minor-pentatonic plucks, six dates as a rising arpeggio
    tr.add(0, tone(147, 587, 0.9, d=0.5), 0.12)
    penta = [74, 77, 79, 81, 84, 86]
    for k in range(11):
        tr.add(6 + k * 2.2, pluck(penta[int(rng.integers(len(penta)))] + 12, 0.25, d=0.05, bright=0.3), 0.05, pan=-0.6 + 0.12 * k)
    for k, m in enumerate([74, 77, 81, 84, 86, 89]):
        tr.add(BEAT * (2 + k), bell(m, 1.0, 0.35), 0.13, pan=-0.5 + 0.2 * k)
    hits.add(84, sweep_noise(1.6, 300, 2400, 900, 0.62), 0.3)  # dive

    # --- Haiku act
    for k, m in enumerate([57, 62, 65, 69]):  # bars grow: quick up-arpeggio
        tr.add(A0 + 8 + k * 3, pluck(m, 0.5, 0.15), 0.18)
    tr.add(A0 + 18, bell(81, 0.6, 0.2), 0.1)  # sign
    tr.add(A0 + LAND - 24, tone(1400, 380, 0.8, d=0.6) * 0.5, 0.08)  # falling whistle
    hits.add(A0 + LAND, thud(), 0.55)
    tr.add(A0 + LAND, pluck(50, 0.6, 0.2), 0.3)
    for k, m in [(1, 69), (2, 72)]:  # hops climb the scale
        tr.add(A0 + LAND + k * BEAT, pluck(m, 0.4, 0.12, bright=0.7), 0.22)
        hits.add(A0 + LAND + k * BEAT, thud(0.2, 160, 90, 0.05), 0.18)
    # big hop: rising glide into the gap, then the stomp lands on silence
    tr.add(A0 + LAND + 2 * BEAT, tone(hz(72), hz(86), (STOMP - LAND - 2 * BEAT) / FPS, d=2, a=0.3) * 0.5, 0.12)
    hits.add(A0 + LAND + 2 * BEAT, sweep_noise((STOMP - LAND - 2 * BEAT) / FPS, 800, 6000, 2500, 0.98), 0.18)
    # stomp: sub boom + crack + D-minor stab
    hits.add(A0 + STOMP, mix(tone(70, 32, 1.4, d=0.45), 0.8 * noise(0.25, 60, 400, d=0.12)), 0.9)
    hits.add(A0 + STOMP, noise(0.4, 1500, 9000, d=0.07), 0.35)
    for m in (50, 62, 65, 69, 74):
        tr.add(A0 + STOMP, pluck(m, 1.2, 0.35, bright=0.8), 0.13)
    for k in range(8):
        hits.add(A0 + STOMP + 2 + rng.uniform(0, 18), tone(*([rng.uniform(2500, 5200)] * 2), 0.25, d=0.06), 0.04, pan=rng.uniform(-0.8, 0.8))
    for k, m in enumerate([86, 84, 81, 77, 74, 69]):  # price 100% -> 25%: falling notes
        tr.add(A0 + STOMP + 1 + k * 2.6, pluck(m, 0.3, 0.06, bright=0.4), 0.12)
    tr.add(A0 + STOMP + 16, bell(81, 0.9, 0.3), 0.13)  # -75% lands
    hits.add(A0 + STOMP + 3 * BEAT, sweep_noise(0.6, 900, 3000, 1200, 0.5), 0.15)  # spin
    # orb: tink, glide over to 13, landing chime = first notes of the F chord
    tr.add(A0 + ORB_A, bell(89, 0.4, 0.1), 0.12)
    tr.add(A0 + ORB_A + 2, tone(hz(77), hz(89), (ORB_B - ORB_A) / FPS, d=3, a=0.2) * 0.4, 0.08, pan=-0.3)
    hits.add(A0 + ORB_A + 2, sweep_noise((ORB_B - ORB_A) / FPS + 0.2, 500, 3000, 1500, 0.8), 0.15, pan=-0.3)

    # --- Gemini act
    for k, m in enumerate([65, 69, 72, 77]):  # star rises: shimmer up
        tr.add(A1 + k * 2, bell(m + 12, 0.8, 0.3), 0.1, pan=-0.3)
    tr.add(A1 + 16, bell(84, 0.6, 0.2), 0.08)  # sign
    tr.add(A1 + DASH_A - 6, tone(hz(65), hz(77), 0.25, d=0.2) * 0.5, 0.1)  # launch
    hits.add(A1 + DASH_A, sweep_noise((STOP - DASH_A) / FPS, 400, 5000, 2000, 0.6), 0.16)
    scale = [62, 64, 65, 67, 69, 70, 72, 74, 76, 77, 79, 81]  # runway: one rung of the scale per tile
    for k, f in enumerate(lane_times()):
        tr.add(A1 + f, pluck(scale[k] + 12, 0.35, 0.08, bright=0.6), 0.13, pan=-0.6 + 0.11 * k)
    for k in range(24):  # token counter: faint ticks
        tr.add(A1 + DASH_A + k * (STOP - DASH_A) / 24, noise(0.015, 4000, 9000, d=0.004), 0.035)
    # stamp falls into the gap, GA lands on the F chord
    tr.add(A1 + STOP - 10, tone(1600, 500, 10 / FPS, d=1) * 0.5, 0.08)
    hits.add(A1 + STOP, mix(tone(80, 36, 1.2, d=0.4), 0.6 * noise(0.2, 80, 600, d=0.1)), 0.8)
    hits.add(A1 + STOP, noise(0.3, 2000, 9000, d=0.05), 0.25)
    for m in (41, 53, 65, 69, 72, 77, 81):
        tr.add(A1 + STOP, pluck(m, 1.6, 0.5, bright=0.8), 0.11)
    tr.add(A1 + STOP + 3, bell(89, 1.4, 0.6), 0.1)
    # GPT wakes: a curious two-note "huh?"
    tr.add(A1 + WAKE, pluck(72, 0.4, 0.1, bright=0.7), 0.2)
    tr.add(A1 + WAKE + 5, pluck(79, 0.6, 0.18, bright=0.7), 0.2)
    hits.add(A1 + WAKE + 10, thud(0.25, 180, 100, 0.05), 0.2)

    # --- GPT (10.16): one splits into four, the lanes tick faster and faster, a chord when all four finish
    A2 = act(2)
    tr.add(A2 + 14, bell(84, 0.6, 0.2), 0.08)  # sign
    tr.add(A2 + G_SPLIT - BEAT, tone(hz(62), hz(74), BEAT / FPS, d=1, a=0.2) * 0.5, 0.1)  # crouch
    for k, (f, m) in enumerate(zip(G_POPS, [65, 69, 72, 77])):  # four pops climb the F chord
        tr.add(A2 + f, mix(tone(hz(m) * 0.7, hz(m + 12), 0.12, d=0.08) * 0.6, pluck(m + 12, 0.3, 0.08)), 0.16, pan=-0.45 + 0.3 * k)
    lane_notes = [74, 77, 81, 84]
    for k, end in enumerate(G_ENDS):
        last = 0
        for f in np.arange(G_FILL_A, end + 1, 0.5):
            step = int(min(1, (f - G_FILL_A) / (end - G_FILL_A)) ** 2 * 10)
            if step > last:
                last = step
                tr.add(A2 + f, pluck(lane_notes[k] + 12, 0.15, 0.03, bright=0.3), 0.06, pan=-0.45 + 0.3 * k)
        tr.add(A2 + end, bell(lane_notes[k] + 12, 0.6, 0.2), 0.08, pan=-0.45 + 0.3 * k)
    hits.add(A2 + G_DONE, thud(0.5, 120, 50, 0.2), 0.5)
    for m in (53, 65, 69, 72, 77):
        tr.add(A2 + G_DONE, pluck(m, 1.4, 0.4, bright=0.8), 0.12)
    tr.add(A2 + G_DONE + 3, bell(89, 1.0, 0.4), 0.1)
    hits.add(A2 + G_PIPE, sweep_noise((ACT_F - G_PIPE) / FPS + 1.0, 150, 700, 400, 0.4), 0.22)  # water runs down the pipe

    # --- DeepSeek (10.17): bubbles, bonk, click, an ascending scale up the score bar, spout and arc
    A3 = act(3)
    for k in range(10):
        m = [74, 77, 79, 81, 84][int(rng.integers(5))]
        tr.add(A3 + 4 + k * 9 + rng.uniform(0, 5), tone(hz(m), hz(m + 7), 0.08, d=0.05), 0.06, pan=rng.uniform(-0.5, 0.5))
    tr.add(A3 + 16, bell(84, 0.6, 0.2), 0.08)
    hits.add(A3 + D_BUMP, thud(0.4, 140, 60, 0.12), 0.5)
    tr.add(A3 + D_BUMP, pluck(46, 0.6, 0.2), 0.25)
    hits.add(A3 + D_OPEN, mix(noise(0.03, 2500, 8000, d=0.006), np.concatenate([np.zeros(int(0.05 * SR)), noise(0.03, 1800, 6000, d=0.008)])), 0.35)
    for m in (58, 62, 65, 70):
        tr.add(A3 + D_OPEN, bell(m + 12, 1.2, 0.5), 0.07)
    tr.add(A3 + D_RIDE, tone(hz(60), hz(72), 0.3, d=0.2) * 0.6, 0.15)
    for k, m in enumerate([60, 62, 64, 65, 67, 69, 71, 72]):  # 31.2 -> 42.3: up the C scale
        tr.add(A3 + D_GROW_A + k * (D_GROW_B - D_GROW_A) / 8, pluck(m + 12, 0.35, 0.1, bright=0.6), 0.15)
    tr.add(A3 + D_GROW_B, bell(84, 1.0, 0.4), 0.12)
    tr.add(A3 + D_GROW_B + 4, pluck(79, 0.4, 0.1), 0.12)  # price tag
    hits.add(A3 + D_SPOUT, noise(0.8, 2000, 9000, d=0.3, a=0.02), 0.18)
    hits.add(A3 + D_SPOUT + 4, sweep_noise((D_SPLASH - D_SPOUT - 4) / FPS, 1500, 400, 800, 0.4), 0.2, pan=-0.3)
    hits.add(A3 + D_SPLASH, noise(0.5, 800, 7000, d=0.12), 0.25, pan=-0.3)

    # --- Duet (10.21): rain bed, ding on the alert, ding-dong on the tap, the dot zips to the moon
    A4 = act(4)
    rain_a, rain_b = A3 + D_SPLASH, A4 + U_DOT_A + 10
    n = int((rain_b - rain_a) / FPS * SR)
    rain = noise(n / SR, 1500, 9000, d=1e3, a=0.4) * np.minimum(1, (n - np.arange(n)) / (0.6 * SR))
    hits.add(rain_a, rain, 0.05)
    for k in range(40):
        hits.add(rain_a + rng.uniform(0, rain_b - rain_a), noise(0.01, 3000, 9000, d=0.003), 0.03, pan=rng.uniform(-0.7, 0.7))
    tr.add(A4 + 16, bell(84, 0.6, 0.2), 0.08)
    tr.add(A4 + 18, bell(77, 1.0, 0.4), 0.06)  # mail and calendar start circling
    tr.add(A4 + U_ALERT, bell(93, 0.8, 0.25), 0.14)  # ding
    tr.add(A4 + U_TAP, bell(81, 1.2, 0.5), 0.16)  # ding-
    tr.add(A4 + U_TAP + BEAT / 2, bell(77, 1.4, 0.6), 0.16)  # -dong
    for m in (53, 65, 69, 72):
        tr.add(A4 + U_TAP, pluck(m, 1.6, 0.6, bright=0.5), 0.08)
    tr.add(A4 + U_DOT_A, tone(hz(77), hz(89), (U_DOT_HIT - U_DOT_A) / FPS, d=3, a=0.2) * 0.4, 0.08, pan=0.3)
    hits.add(A4 + U_DOT_A, sweep_noise((U_DOT_HIT - U_DOT_A) / FPS, 600, 3500, 1500, 0.85), 0.15, pan=0.3)

    # --- Kimi (10.24): a low gong when the dot hits, a riser while the moon turns, the bright D-major hit
    A5 = act(5)
    g0 = hz(38)
    gong = sum(tone(g0 * r, g0 * r, 3.5, d=d) * g for r, d, g in [(1, 1.6, 1.0), (2.4, 0.9, 0.4), (3.9, 0.5, 0.25), (5.4, 0.3, 0.15)])
    hits.add(A5 + K_HIT, gong, 0.4)
    tr.add(A5 + K_HIT, bell(86, 0.5, 0.15), 0.1)
    rise = (K_FLIP - BEAT - K_HIT - 4) / FPS
    hits.add(A5 + K_HIT + 4, sweep_noise(rise, 300, 6000, 2500, 0.97), 0.2)
    tr.add(A5 + K_HIT + 4, tone(hz(57), hz(81), rise, d=5, a=rise * 0.8) * 0.4, 0.1)
    big_hit(hits, A5 + K_FLIP)
    hits.add(A5 + K_FLIP, noise(2.5, 3000, 12000, d=0.8, a=0.005), 0.12)  # crash
    for m in (38, 50, 62, 66, 69, 74, 78, 81):
        tr.add(A5 + K_FLIP, pluck(m, 2.0, 0.7, bright=0.8), 0.1)
    for m in (86, 90, 93):
        tr.add(A5 + K_FLIP + 2, bell(m, 1.6, 0.6), 0.07)
    arp = [74, 78, 81, 86]
    for s in range(20):  # satellite: a fast little arpeggio while it whizzes round
        tr.add(A5 + K_SAT + s * BEAT / 4, pluck(arp[s % 4] + 12, 0.15, 0.04, bright=0.4), 0.05, pan=0.5 * np.sin(s * 1.3))
    tr.add(A5 + K_BIG, bell(86, 0.9, 0.3), 0.12)
    tr.add(A5 + K_GIFT - 10, tone(1500, 600, 10 / FPS, d=1) * 0.5, 0.07)
    hits.add(A5 + K_GIFT, thud(0.3, 170, 90, 0.08), 0.35)
    for k, m in enumerate([82, 86, 89]):
        tr.add(A5 + K_GIFT + 5 + k * 2, bell(m, 0.6, 0.2), 0.08)
    hits.add(A5 + 2 * BAR + 2 * BEAT, sweep_noise(2 * BEAT / FPS + 0.3, 400, 4000, 1800, 0.9), 0.18)  # lift into the outro

    # --- outro: six verdicts pop up the F chord, everyone hops, lands on D major, rings out
    for k in range(6):
        tr.add(act(6) + BAR + k * BEAT / 2, pluck([65, 69, 72, 77, 81, 84][k] + 12, 0.5, 0.15, bright=0.6), 0.14, pan=-0.5 + 0.2 * k)
    land = act(6) + 2 * BAR
    tr.add(land - 1.5 * BEAT, tone(hz(57), hz(81), 1.5 * BEAT / FPS, d=2, a=0.2) * 0.5, 0.12)
    hits.add(land - 1.5 * BEAT, sweep_noise(1.5 * BEAT / FPS, 600, 6000, 2500, 0.97), 0.18)
    big_hit(hits, land, 0.85)
    hits.add(land, noise(3.0, 3000, 12000, d=1.0, a=0.005), 0.1)
    for m in (38, 50, 62, 66, 69, 74, 78, 81, 86):
        tr.add(land, pluck(m, 3.0, 1.0, bright=0.8), 0.09)
    tr.add(land + 2, bell(90, 2.5, 1.0), 0.08)
    return tr.buf, hits.buf


def main():
    seconds = float(sys.argv[1]) if len(sys.argv) > 1 else np.ceil(act(6) + 3 * BAR) / FPS
    dst = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "out/v4-score.wav"
    pad, bass, drums = music(seconds)
    tonal, hits = notes(seconds)
    # duck the bed under the big hits so they punch
    duck = np.ones(len(pad))
    for f in (A0 + STOMP, A1 + STOP, act(5) + K_FLIP, act(6) + 2 * BAR):
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
