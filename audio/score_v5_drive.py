"""v5 配乐「带感版」：画面音效和铺底和弦沿用 score_v5.py，节奏层整体换成 125 BPM 的 house 律动。

- 鼓：四拍底鼓贯穿大部分段落，2、4 拍拍手，16 分踩镲加反拍开镲；每幕开头一个镲片。
- 低音：反拍锯齿 bass + 底鼓 sidechain 泵感（铺底、旋律、琶音都跟着鼓「呼吸」）。
- 旋律：一段 2 小节的合成器 hook（锯齿叠音 + 乒乓延迟），在各幕高潮小节反复出现；Kimi 翻面那小节升八度。
- 转场：上扬噪声 + 军鼓滚奏推进到下一幕；大重拍前仍空半拍再砸。
- 安静段（钩子、水下、雨夜、暗面月亮、揭秘）保留压暗的半速律动，不再完全停。

用法：python audio/score_v5_drive.py [时长秒] [输出.wav]
"""
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt

import score_v4 as v4
import score_v5 as v5
from mix_v4 import BAR, BEAT, FPS, ROOT, SR, Track, sweep_noise
from score_v4 import hz, pluck, reverb
from score_v5 import CHORDS, GAPS, NOV_F, N_BARS, RemapTrack, act, bar_f, gap
from score_v4 import K_FLIP, STOMP, STOP

rng = np.random.default_rng(7)


def filt(x, kind, fc, order=2):
    return sosfilt(butter(order, fc, kind, fs=SR, output="sos"), x)


def white(dur):
    return rng.standard_normal(int(dur * SR))


def saw(f, n, phase=0.0):
    t = np.arange(n) / SR
    return 2 * ((t * f + phase) % 1) - 1


# ---------- drum kit ----------
def kick(dur=0.42, soft=False):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 46 + 130 * np.exp(-t / 0.032)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (0.16 if soft else 0.24))
    click = filt(white(dur), "high", 2500) * np.exp(-t / 0.004) * (0.0 if soft else 0.35)
    k = np.tanh(1.8 * (body + click))
    return filt(k, "low", 900) if soft else k


def clap():
    dur = 0.4
    t = np.arange(int(dur * SR)) / SR
    nz = filt(white(dur), "bandpass", [900, 3800])
    env = sum(np.exp(-np.maximum(0, t - d) / 0.006) * (t >= d) for d in (0, 0.011, 0.023))
    env = env + 0.7 * np.exp(-np.maximum(0, t - 0.03) / 0.11) * (t >= 0.03)
    return nz * env * 0.6


def snare():
    dur = 0.25
    t = np.arange(int(dur * SR)) / SR
    return 0.5 * filt(white(dur), "bandpass", [1500, 7000]) * np.exp(-t / 0.07) + 0.5 * np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05)


def hat(open_=False):
    dur = 0.35 if open_ else 0.06
    t = np.arange(int(dur * SR)) / SR
    return filt(white(dur), "high", 7500) * np.exp(-t / (0.14 if open_ else 0.018))


def crash():
    dur = 2.4
    t = np.arange(int(dur * SR)) / SR
    metal = sum(np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) for f in (3120, 4470, 5310, 6620, 7900, 9150)) / 6
    return (filt(white(dur), "high", 4500) * 0.8 + 0.3 * metal) * np.exp(-t / 0.7) * np.minimum(1, t / 0.002)


# ---------- synths ----------
def bass_note(m, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = hz(m)
    x = 0.6 * saw(f, n) + 0.4 * saw(f * 1.005, n, 0.3)
    env = np.minimum(1, t / 0.004) * np.exp(-t / 0.16)
    hi = filt(x, "low", 1400)
    lo = filt(x, "low", 380)
    fe = np.exp(-t / 0.05)
    sub = np.sin(2 * np.pi * f * t)
    return (hi * fe + lo * (1 - fe) + 0.7 * sub) * env


def lead_note(m, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = hz(m)
    x = sum(saw(f * 2 ** (d / 1200), n, rng.uniform()) for d in (-14, -6, 0, 6, 14)) / 5
    fe = np.exp(-t / 0.08)
    y = filt(x, "low", 5200) * fe + filt(x, "low", 1600) * (1 - fe)
    env = np.minimum(1, t / 0.004) * (0.35 + 0.65 * np.exp(-t / 0.12)) * np.minimum(1, np.maximum(0, (dur - t) / 0.04))
    return y * env


def chord_at(f):
    i = min(int(f // BAR), N_BARS - 1)
    beat = (f - i * BAR) / BEAT
    seg = [s for s in CHORDS[i] if s[0] <= beat + 1e-6][-1]
    return seg[1], seg[2]


def tones(f, base):
    root, tri = chord_at(f)
    r = root % 12 + base
    return [r + tri[0], r + tri[1], r + tri[2], r + 12, r + 12 + tri[1]]


# 2-bar hook: (16th position, chord tone index, length in 16ths)
HOOK_A = [(0, 2, 2), (3, 1, 2), (6, 0, 2), (8, 3, 2), (10, 2, 2), (12, 1, 2), (14, 2, 2)]
HOOK_B = [(0, 3, 2), (2, 4, 2), (4, 3, 2), (6, 2, 2), (8, 1, 3), (11, 2, 3), (14, 0, 2)]

# per-bar layers. k: four-on-floor, kh: half-time kick (1, 3), kl: soft muffled kick,
# c: clap 2 & 4, ch: clap on 3, h8 / h16: closed hats, oh: offbeat open hats, b: offbeat bass,
# sub: sub on 1 & 3, arp: 16th arpeggio, lead / lead_hi: the hook, crash: crash on 1,
# riser: riser into the next bar, roll23 / roll34 / rollbar: snare roll on beats 2–3 / 3–4 / whole bar
LAYERS = {
    0: {"sub"}, 1: {"kl", "riser"}, 2: {"k", "h8", "b"}, 3: {"k", "c", "h8", "oh", "b", "roll34", "riser"},
    4: {"crash", "k", "c", "h16", "b", "arp"}, 5: {"k", "c", "h16", "b", "lead", "roll23"},
    6: {"crash", "k", "c", "h16", "oh", "b", "lead"}, 7: {"k", "c", "h8", "oh", "b", "arp", "riser"},
    8: {"crash", "k", "c", "h8", "b", "arp"}, 9: {"k", "c", "h16", "oh", "b", "lead", "roll23"},
    10: {"crash", "k", "c", "h16", "oh", "b", "lead"}, 11: {"k", "c", "h8", "b", "arp", "riser"},
    12: {"crash", "k", "c", "h8", "b", "arp"}, 13: {"k", "c", "h16", "oh", "b", "lead"},
    14: {"k", "c", "h16", "oh", "b", "lead"}, 15: {"k", "c", "h8", "b", "arp", "riser"},
    16: {"kl", "sub"}, 17: {"crash", "k", "c", "h8", "b"}, 18: {"k", "c", "h16", "oh", "b", "lead"},
    19: {"k", "c", "h8", "b", "arp", "riser"},
    20: {"kh", "ch", "h8", "sub"}, 21: {"kh", "ch", "h8", "sub", "arp"}, 22: {"k", "c", "h8", "b"},
    23: {"k", "c", "h8", "oh", "b", "arp"},
    24: {"kl", "riser", "roll23"}, 25: {"crash", "k", "c", "h16", "oh", "b", "lead_hi"},
    26: {"k", "c", "h16", "oh", "b", "lead"}, 27: {"k", "c", "h8", "oh", "b", "arp", "riser"},
    28: {"crash", "k", "c", "h8", "b", "lead"}, 29: {"k", "c", "h16", "rollbar", "riser"},
    30: {"crash", "k1"}, 31: {"kh", "h8"}, 32: set(),
}
SOFT_HATS = {20, 21, 31}


def groove(seconds):
    n = int(seconds * SR)
    drums = Track(seconds)
    bass = Track(seconds)
    lead = Track(seconds)
    arp = Track(seconds)
    kicks = []

    def K(f, g=0.9, soft=False):
        if not gap(f):
            drums.add(f, kick(soft=soft), g)
            if not soft:
                kicks.append(f)

    def D(f, sig, g, pan=0.0):
        if not gap(f):
            drums.add(f, sig, g, pan=pan)

    for i in range(N_BARS):
        L = LAYERS[i]
        b0 = bar_f(i)
        s16 = BEAT / 4
        if "crash" in L:
            drums.add(b0, crash(), 0.28)
        if "k" in L:
            for b in range(4):
                K(b0 + b * BEAT)
        if "k1" in L:
            K(b0)
        if "kh" in L:
            for b in (0, 2):
                K(b0 + b * BEAT, 0.75)
        if "kl" in L:
            for b in range(4):
                K(b0 + b * BEAT, 0.7 if i else 0.5, soft=True)
        if "c" in L:
            for b in (1, 3):
                D(b0 + b * BEAT, clap(), 0.42)
        if "ch" in L:
            D(b0 + 2 * BEAT, clap(), 0.36)
        soft = i in SOFT_HATS
        if "h8" in L:
            for e in range(8):
                D(b0 + e * BEAT / 2, hat(), (0.05 if e % 2 else 0.08) * (0.6 if soft else 1), pan=0.25 if e % 2 else -0.15)
        if "h16" in L:
            for s in range(16):
                acc = 0.09 if s % 4 == 2 else 0.06 if s % 2 == 0 else 0.035
                D(b0 + s * s16, hat(), acc, pan=0.3 if s % 2 else -0.2)
        if "oh" in L:
            for b in range(4):
                D(b0 + b * BEAT + BEAT / 2, hat(True), 0.07, pan=0.35)
        rolls = {"roll23": (1, 3), "roll34": (2, 4), "rollbar": (0, 4)}
        for key, (a, z) in rolls.items():
            if key in L:
                steps = int((z - a) * 4)
                for s in range(steps):
                    D(b0 + a * BEAT + s * s16, snare(), 0.12 + 0.3 * s / steps, pan=-0.1)
        if "riser" in L:
            drums.add(b0, sweep_noise(BAR / FPS, 300, 7000, 2600, 0.97), 0.16)
        if "b" in L:
            for b in range(4):
                f = b0 + b * BEAT + BEAT / 2
                if not gap(f):
                    root, _ = chord_at(f)
                    bass.add(f, bass_note(root % 12 + 33, 0.2), 0.6)
        if "sub" in L:
            for b in (0, 2):
                f = b0 + b * BEAT
                if not gap(f):
                    root, _ = chord_at(f)
                    t = np.arange(int(0.9 * SR)) / SR
                    bass.add(f, np.sin(2 * np.pi * hz(root % 12 + 33) * t) * np.minimum(1, t / 0.02) * np.exp(-t / 0.5), 0.4)
        if "arp" in L:
            for s in range(16):
                f = b0 + s * s16
                if not gap(f):
                    arp.add(f, pluck(tones(f, 72)[[0, 1, 2, 3, 2, 1, 0, 1][s % 8]], 0.22, 0.06, bright=0.45), 0.2, pan=0.5 * np.sin(s * 0.8))
        if "lead" in L or "lead_hi" in L:
            pat = HOOK_A if i % 2 == 0 else HOOK_B
            base = 72 if "lead_hi" in L else 60
            for pos, ti, ln in pat:
                f = b0 + pos * s16
                if not gap(f):
                    lead.add(f, lead_note(tones(f, base)[ti], ln * s16 / FPS), 0.5)

    # sidechain: everything melodic ducks after each kick
    sc = np.ones(n)
    for f in kicks:
        i0 = int(f / FPS * SR)
        m = min(int(0.3 * SR), n - i0)
        if m > 0:
            t = np.arange(m) / SR
            sc[i0:i0 + m] = np.minimum(sc[i0:i0 + m], 1 - 0.6 * np.exp(-t / 0.1) * np.minimum(1, t / 0.003 + 0.6))

    # ping-pong dotted-8th delay on the lead
    d = int(0.75 * BEAT / FPS * SR)
    ld = lead.buf.copy()
    mono = ld.sum(1)
    for k, (g, ch) in enumerate([(0.4, 0), (0.26, 1), (0.16, 0)], start=1):
        ld[k * d:, ch] += g * filt(mono, "low", 4000)[: n - k * d]
    return drums.buf, bass.buf, ld, arp.buf, sc


def main():
    seconds = float(sys.argv[1]) if len(sys.argv) > 1 else v5.TOTAL_F / FPS
    dst = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "out/v5-score-drive.wav"
    pad, _, _ = v5.music(seconds)
    v4.Track = RemapTrack
    old_tonal, old_hits = v4.notes(seconds)
    tonal, hits = v5.new_notes(seconds)
    tonal += old_tonal
    hits += old_hits
    drums, bass, lead, arp, sc = groove(seconds)
    sc2 = sc[:, None]
    duck = np.ones(len(pad))
    for f in (act(0) + STOMP, act(1) + STOP, act(5) + K_FLIP, NOV_F):
        i = int(f / FPS * SR)
        m = min(int(0.8 * SR), len(duck) - i)
        duck[i:i + m] = 1 - 0.5 * np.exp(-np.arange(m) / SR / 0.25)
    wet = np.stack([reverb(c, 2.0, 0.3) for c in (pad * 0.85 * sc2 + tonal * 0.85 + (lead + arp) * sc2).T], 1)
    # drums bus sits about 10 dB under its raw level so the hook and bass come through
    out = (wet + bass * sc2 * 0.9 + drums * 0.32) * duck[:, None] + hits
    fade = int(0.6 * SR)
    out[-fade:] *= np.linspace(1, 0, fade)[:, None]
    out = np.tanh(out * float(sys.argv[3]) if len(sys.argv) > 3 else out * 1.7)
    sf.write(dst, (out * 0.8).astype(np.float32), SR)
    print(f"wrote {dst} ({seconds:.2f}s, peak {np.abs(out).max():.2f})")


if __name__ == "__main__":
    main()
