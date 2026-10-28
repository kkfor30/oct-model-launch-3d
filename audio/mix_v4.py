"""合成工具：节拍常量和基础音色（tone / noise / thud / sweep_noise）、按帧放音的 Track。

被 score_v4.py、score_v5.py、score_v5_drive.py 引用，本身不单独运行。
"""
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

SR = 48000
FPS = 30
BEAT = FPS * 60 / 125
BAR = BEAT * 4
INTRO_F = 2 * BAR
ROOT = Path(__file__).resolve().parent.parent
rng = np.random.default_rng(7)


def t_of(frame):
    return frame / FPS


def env(n, a=0.005, d=0.3):
    t = np.arange(n) / SR
    return np.minimum(1, t / a) * np.exp(-t / d)


def tone(f0, f1, dur, d=0.2, a=0.004, harm=0.0):
    n = int(dur * SR)
    f = np.geomspace(f0, f1, n)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) + harm * np.sin(2 * ph)
    return s * env(n, a, d)


def noise(dur, lo, hi, d=0.2, a=0.003):
    n = int(dur * SR)
    spec = np.fft.rfft(rng.standard_normal(n))
    fr = np.fft.rfftfreq(n, 1 / SR)
    spec[(fr < lo) | (fr > hi)] = 0
    s = np.fft.irfft(spec, n)
    return s / (np.abs(s).max() + 1e-9) * env(n, a, d)


def sweep_noise(dur, lo0, lo1, width, peak=0.5):
    """Whoosh: band of noise sliding in frequency, swelling to a peak."""
    n = int(dur * SR)
    out = np.zeros(n)
    seg = 2048
    for i in range(0, n, seg):
        k = i / n
        c = lo0 * (lo1 / lo0) ** k
        out[i:i + seg] = noise(min(seg, n - i) / SR, c, c + width, d=10, a=0.0001)[: min(seg, n - i)]
    t = np.arange(n) / n
    shape = np.where(t < peak, (t / peak) ** 2, ((1 - t) / (1 - peak)) ** 1.5)
    return out * shape


def mix(*sigs):
    out = np.zeros(max(len(x) for x in sigs))
    for x in sigs:
        out[: len(x)] += x
    return out


def thud(dur=0.5, f0=110, f1=45, d=0.18):
    return mix(tone(f0, f1, dur, d=d), 0.35 * noise(0.05, 800, 4000, d=0.015))


class Track:
    def __init__(self, seconds):
        self.buf = np.zeros((int(seconds * SR), 2))

    def add(self, frame, sig, gain=1.0, pan=0.0):
        i = int(t_of(frame) * SR)
        if i >= len(self.buf):
            return
        sig = sig[: len(self.buf) - i] * gain
        self.buf[i:i + len(sig), 0] += sig * (1 - max(0, pan))
        self.buf[i:i + len(sig), 1] += sig * (1 + min(0, pan))
