"""產生 KUMA Universe 線上電影劇場的背景音樂與場景音效。

所有聲音都是這支程式用數學合成出來的原創作品，沒有使用任何外部錄音、取樣或歌曲，
因此沒有第三方授權問題，本專案以 CC0 釋出。

需求：Python 3 + numpy，以及系統上的 ffmpeg（libmp3lame）。
執行：python3 tools/make_audio.py
輸出：assets/audio/music/*.mp3、assets/audio/sfx/*.mp3
同樣的程式碼與亂數種子每次都會產生相同的聲音。
"""
import os
import subprocess
import tempfile
import wave

import numpy as np

SR = 44100
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MUSIC_DIR = os.path.join(ROOT, "assets", "audio", "music")
SFX_DIR = os.path.join(ROOT, "assets", "audio", "sfx")


# ---------------------------------------------------------------- 基本工具
def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12.0)


def tt(dur):
    return np.arange(int(dur * SR)) / SR


def attack_release(n, a=0.005, r=0.05):
    env = np.ones(n)
    na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    na, nr = min(na, n), min(nr, n)
    env[:na] = np.linspace(0, 1, na)
    env[n - nr:] *= np.linspace(1, 0, nr)
    return env


def smooth(x, k):
    """簡單的低通：k 點移動平均。"""
    if k <= 1:
        return x
    return np.convolve(x, np.ones(k) / k, mode="same")


def add(buf, start, sig, gain=1.0):
    i = int(start * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i] * gain


# ---------------------------------------------------------------- 樂器
def pluck(f, dur, bright=1.0, partials=10):
    """琴（箏）一般的撥弦聲：多個泛音，高泛音衰減較快。"""
    t = tt(dur + 0.4)
    s = np.zeros_like(t)
    for k in range(1, partials + 1):
        fk = f * k * (1 + 0.0004 * k * k)
        if fk > SR / 2.2:
            break
        s += (1 / k ** 1.1) * np.sin(2 * np.pi * fk * t) * np.exp(-t * (1.8 + k * 1.3 * bright))
    return s * attack_release(len(t), 0.002, 0.08) * 0.5


def bell(f, dur):
    t = tt(dur + 1.0)
    s = np.zeros_like(t)
    for ratio, amp, dec in [(1, 1, 2.2), (2.0, 0.45, 3.5), (3.01, 0.25, 5), (4.16, 0.15, 7), (5.43, 0.08, 9)]:
        s += amp * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t * dec)
    return s * attack_release(len(t), 0.002, 0.2) * 0.4


def piano(f, dur):
    """柔和的鋼琴（felt piano）。"""
    t = tt(dur + 0.6)
    s = np.zeros_like(t)
    for k in range(1, 7):
        s += (1 / k ** 1.6) * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (1.0 + 0.7 * k))
    env = attack_release(len(t), 0.008, 0.25)
    rel = np.ones_like(t)
    nd = int(dur * SR)
    if nd < len(t):
        rel[nd:] = np.exp(-(t[nd:] - dur) * 8)
    return s * env * rel * 0.5


def pad(f, dur, bright=1.0):
    t = tt(dur)
    s = np.zeros_like(t)
    for det in (-0.004, 0.0, 0.0035):
        for k in range(1, 6):
            s += (1 / k ** (1.4 / bright)) * np.sin(2 * np.pi * f * (1 + det) * k * t + k)
    return s * attack_release(len(t), min(0.7, dur / 3), min(0.9, dur / 3)) * 0.12


def bass(f, dur, tuba=False):
    t = tt(dur + 0.1)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t)
    if tuba:
        s += 0.25 * np.sin(6 * np.pi * f * t) + 0.12 * np.sin(8 * np.pi * f * t)
    env = np.exp(-t * (3.5 if not tuba else 6)) * attack_release(len(t), 0.01 if tuba else 0.004, 0.06)
    return s * env * 0.6


def flute(f, dur):
    """尺八一般的長音：帶顫音與氣音。"""
    t = tt(dur)
    vib = 1 + 0.005 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.35) * 2, 0, 1)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR
    s = np.sin(ph) + 0.18 * np.sin(2 * ph) + 0.06 * np.sin(3 * ph)
    rng = np.random.default_rng(int(f))
    breath = smooth(smooth(rng.standard_normal(len(t)), 24), 24) * 0.25
    env = attack_release(len(t), 0.15, min(0.4, dur / 2))
    return (s + breath * (0.5 + 0.5 * np.exp(-t * 3))) * env * 0.3


def clarinet(f, dur):
    t = tt(dur)
    s = np.sin(2 * np.pi * f * t) + 0.38 * np.sin(6 * np.pi * f * t) + 0.18 * np.sin(10 * np.pi * f * t) + 0.07 * np.sin(14 * np.pi * f * t)
    return s * attack_release(len(t), 0.012, min(0.05, dur / 3)) * 0.3


def kick():
    t = tt(0.35)
    f = 45 + 80 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14) * 0.9


def shaker(rng):
    t = tt(0.09)
    n = np.diff(rng.standard_normal(len(t) + 1))
    return n * np.exp(-t * 55) * 0.08


def woodblock(f=880):
    t = tt(0.12)
    return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.58 * t)) * np.exp(-t * 50) * 0.35


def taiko(rng):
    t = tt(0.8)
    f = 62 + 30 * np.exp(-t * 20)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) + smooth(rng.standard_normal(len(t)), 20) * 0.3 * np.exp(-t * 25)
    return s * np.exp(-t * 6) * 0.8


# ---------------------------------------------------------------- 殘響與輸出
def reverb_ir(seconds, seed, decay=3.0):
    rng = np.random.default_rng(seed)
    t = tt(seconds)
    ir = rng.standard_normal(len(t)) * np.exp(-t * decay)
    ir = smooth(ir, 3)
    ir[0] = 0
    return ir / np.sqrt(np.sum(ir ** 2))


def fft_convolve(x, h):
    n = len(x) + len(h) - 1
    size = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(h, size), size)[:n]


def master_loop(dry, body_len, wet=0.22, seed=1):
    """加上立體殘響，並把超過一輪長度的尾音疊回開頭，讓音樂可以無縫循環。"""
    out = []
    for ch, s in enumerate((seed, seed + 7)):
        w = fft_convolve(dry, reverb_ir(2.2, s))
        sig = np.zeros(len(w))
        sig[: len(dry)] += dry
        sig += w * wet
        body = sig[:body_len].copy()
        tail = sig[body_len:]
        while len(tail):
            k = min(len(tail), body_len)
            body[:k] += tail[:k]
            tail = tail[k:]
        out.append(body)
    st = np.stack(out, axis=1)
    return st


def normalize(st, rms_db):
    rms = np.sqrt(np.mean(st ** 2)) + 1e-9
    st = st * (10 ** (rms_db / 20) / rms)
    return np.tanh(st * 1.1) / 1.1  # 柔性限幅，避免爆音


def measure_lufs(wav_path):
    out = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", wav_path, "-af", "ebur128", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    vals = [l for l in out.splitlines() if l.strip().startswith("I:")]
    v = float(vals[-1].split()[1]) if vals else -70.0
    return v if v > -69 else None


def write_mp3(path, st, bitrate="96k", lufs=None):
    if st.ndim == 1:
        st = st[:, None]
    pcm = (np.clip(st, -1, 1) * 32767).astype(np.int16)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        wav_path = tmp.name
    with wave.open(wav_path, "wb") as w:
        w.setnchannels(pcm.shape[1])
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    gain_db = 0.0
    if lufs is not None:
        cur = measure_lufs(wav_path)
        if cur is not None:
            gain_db = lufs - cur
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav_path, "-af", f"volume={gain_db:.2f}dB,alimiter=limit=0.89",
                    "-c:a", "libmp3lame", "-b:a", bitrate,
                    "-metadata", "artist=KUMA Universe（程式合成，CC0）", path], check=True)
    os.remove(wav_path)
    print("wrote", os.path.relpath(path, ROOT), f"{os.path.getsize(path) // 1024} KB", f"{len(st) / SR:.1f}s")


# ---------------------------------------------------------------- 作曲輔助
NOTE = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8,
        "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}
QUAL = {"": [0, 4, 7], "m": [0, 3, 7], "7": [0, 4, 7, 10], "maj7": [0, 4, 7, 11], "m7": [0, 3, 7, 10],
        "sus2": [0, 2, 7], "5": [0, 7]}


def chord(name):
    root = name[:2] if len(name) > 1 and name[1] in "#b" else name[:1]
    return NOTE[root], QUAL[name[len(root):]]


def chord_tones(name, low, high):
    r, q = chord(name)
    return [m for m in range(low, high + 1) if (m - r) % 12 in [x % 12 for x in q]]


def scale_notes(pcs, low, high):
    return [m for m in range(low, high + 1) if m % 12 in pcs]


def nearest(cands, target):
    return min(cands, key=lambda m: (abs(m - target), m))


def make_melody(chords, pcs, rhythms, rng, low, high, start_note):
    """依和弦生成旋律：強拍落在和弦音，弱拍沿音階走。每 8 小節為 A A' B A'' 的樂句結構。"""
    scale = scale_notes(pcs, low, high)
    notes = []
    prev = start_note
    motifs = {}
    for bar, ch in enumerate(chords):
        pos = bar % 8
        key = {0: "A0", 1: "A1", 2: "A0", 3: "A2", 4: "B0", 5: "B1", 6: "A0", 7: "END"}[pos]
        if key == "END":
            rhy = [(0, 2), (2, 2)] if rng.random() < 0.5 else [(0, 3), (3, 1)]
        else:
            if key not in motifs:
                motifs[key] = (rhythms[rng.integers(len(rhythms))], rng.integers(-2, 3, size=8))
            rhy = motifs[key][0]
        contour = motifs.get(key, (None, rng.integers(-2, 3, size=8)))[1]
        tones = chord_tones(ch, low, high)
        for i, (off, dur) in enumerate(rhy):
            strong = abs(off - round(off)) < 1e-6 and int(round(off)) % 2 == 0
            if key == "END" and i == len(rhy) - 1:
                r, _ = chord(ch)
                cand = [m for m in tones if m % 12 == r]
                prev = nearest(cand or tones, prev)
            elif strong:
                prev = nearest(tones, prev + int(contour[i % 8]))
            else:
                idx = scale.index(nearest(scale, prev))
                step = int(contour[i % 8]) or 1
                prev = scale[max(0, min(len(scale) - 1, idx + step))]
            notes.append((bar, off, dur, prev))
    return notes


# ---------------------------------------------------------------- 背景音樂
def track_theme_warm():
    """溫馨主題：開場、片尾。C 大調，84 BPM。"""
    bpm, beats = 84, 4
    spb = 60 / bpm
    prog = ["C", "Am", "F", "G", "C", "Em", "F", "G", "Am", "Em", "F", "C", "Dm", "G", "C", "G"] * 2
    rng = np.random.default_rng(11)
    body = len(prog) * beats * spb
    buf = np.zeros(int((body + 3) * SR))
    rhythms = [[(0, 1.5), (1.5, 0.5), (2, 2)], [(0, 1), (1, 1), (2, 1), (3, 1)], [(0, 2), (2, 1), (3, 1)], [(0, 1.5), (1.5, 1.5), (3, 1)]]
    mel = make_melody(prog, [0, 2, 4, 5, 7, 9, 11], rhythms, rng, 72, 88, 76)
    for bar, ch in enumerate(prog):
        t0 = bar * beats * spb
        r, q = chord(ch)
        for m in chord_tones(ch, 55, 67)[:3]:
            add(buf, t0, pad(hz(m), beats * spb + 0.3), 0.9)
        add(buf, t0, bass(hz(36 + r if r < 7 else 24 + r), beats * spb * 0.9), 0.55)
        arp = chord_tones(ch, 60, 76)
        pattern = [0, 2, 1, 3, 2, 1, 3, 2]
        for i in range(8):
            add(buf, t0 + i * spb / 2, piano(hz(arp[pattern[i] % len(arp)]), spb), 0.32)
    second_half = len(prog) // 2
    for bar, off, dur, m in mel:
        t = (bar * beats + off) * spb
        if bar >= second_half:
            add(buf, t, bell(hz(m + 12), dur * spb), 0.38)
            add(buf, t, piano(hz(m), dur * spb), 0.25)
        else:
            add(buf, t, bell(hz(m), dur * spb), 0.5)
    st = master_loop(buf, int(body * SR), wet=0.3, seed=3)
    return normalize(st, -21)


def track_travel_japan():
    """旅行出發：D 大調五聲音階（日本「陽音階」風味），112 BPM，琴與輕打擊。"""
    bpm, beats = 112, 4
    spb = 60 / bpm
    prog = ["D", "Bm", "G", "A", "D", "Bm", "Em", "A", "G", "A", "F#m", "Bm", "G", "A", "D", "D"] * 2
    rng = np.random.default_rng(21)
    body = len(prog) * beats * spb
    buf = np.zeros(int((body + 3) * SR))
    rhythms = [[(0, 0.5), (0.5, 0.5), (1, 1), (2, 0.5), (2.5, 0.5), (3, 1)],
               [(0, 1), (1, 0.5), (1.5, 0.5), (2, 1), (3, 1)],
               [(0, 0.5), (0.5, 0.5), (1, 0.5), (1.5, 0.5), (2, 2)],
               [(0, 1.5), (1.5, 0.5), (2, 0.5), (2.5, 0.5), (3, 1)]]
    mel = make_melody(prog, [2, 4, 6, 9, 11], rhythms, rng, 69, 88, 78)
    for bar, ch in enumerate(prog):
        t0 = bar * beats * spb
        r, q = chord(ch)
        for m in chord_tones(ch, 57, 69)[:3]:
            add(buf, t0, pad(hz(m), beats * spb + 0.2, 0.8), 0.55)
        broot = 38 + ((r - 2) % 12)
        for b, n in [(0, broot), (1.5, broot), (2, broot + 7), (3, broot + 12 if broot + 12 < 55 else broot)]:
            add(buf, t0 + b * spb, pluck(hz(n), spb, bright=0.6, partials=6), 0.7)
        for i in range(8):
            add(buf, t0 + i * spb / 2, shaker(rng), 1.0 if i % 2 else 0.6)
        add(buf, t0, kick(), 0.5)
        add(buf, t0 + 2 * spb, kick(), 0.4)
        if bar % 2 == 1:
            add(buf, t0 + 3.5 * spb, woodblock(1050), 0.6)
        if bar % 4 == 0:
            add(buf, t0, taiko(rng), 0.45)
        arp = chord_tones(ch, 62, 81)
        for i, idx in enumerate([0, 1, 2, 1, 3, 2, 1, 2]):
            add(buf, t0 + i * spb / 2, pluck(hz(arp[idx % len(arp)]), spb / 2, bright=1.4), 0.16)
    for bar, off, dur, m in mel:
        t = (bar * beats + off) * spb
        add(buf, t, pluck(hz(m), dur * spb, bright=1.0), 0.75)
        if bar >= len(prog) // 2:
            add(buf, t, bell(hz(m + 12), dur * spb), 0.12)
    st = master_loop(buf, int(body * SR), wet=0.2, seed=5)
    return normalize(st, -20)


def track_comedy_bounce():
    """搞笑情節：F 大調碰恰節奏，132 BPM，豎笛斷奏與木魚。"""
    bpm, beats = 132, 4
    spb = 60 / bpm
    prog = ["F", "C7", "F", "C7", "F", "Bb", "C7", "F", "Bb", "F", "C7", "F", "Gm", "C7", "F", "C7"] * 2
    rng = np.random.default_rng(31)
    body = len(prog) * beats * spb
    buf = np.zeros(int((body + 3) * SR))
    rhythms = [[(0, 0.5), (1, 0.5), (1.5, 0.5), (2, 0.5), (3, 0.5)],
               [(0, 0.5), (0.5, 0.5), (1, 0.5), (2, 1), (3, 0.5), (3.5, 0.5)],
               [(0, 1), (1.5, 0.5), (2, 0.5), (2.5, 0.5), (3, 1)],
               [(0.5, 0.5), (1, 0.5), (1.5, 0.5), (2, 0.5), (3, 0.5)]]
    mel = make_melody(prog, [5, 7, 9, 10, 0, 2, 4], rhythms, rng, 67, 84, 72)
    for bar, ch in enumerate(prog):
        t0 = bar * beats * spb
        r, q = chord(ch)
        broot = 29 + ((r - 5) % 12)
        add(buf, t0, bass(hz(broot), spb * 0.8, tuba=True), 0.85)
        add(buf, t0 + 2 * spb, bass(hz(broot + 7), spb * 0.8, tuba=True), 0.75)
        for b in (1, 3):
            for m in chord_tones(ch, 60, 70)[:3]:
                add(buf, t0 + b * spb, pluck(hz(m), spb * 0.3, bright=2.2, partials=8), 0.32)
        for b in (1.5, 3.5):
            add(buf, t0 + b * spb, woodblock(760 if b == 1.5 else 980), 0.45)
        if bar % 4 == 3:
            add(buf, t0 + 3 * spb, woodblock(1300), 0.4)
            add(buf, t0 + 3.5 * spb, woodblock(1500), 0.4)
    for bar, off, dur, m in mel:
        t = (bar * beats + off) * spb
        d = min(dur, 0.5) * spb * 0.7
        if rng.random() < 0.18 and off >= 0.5:
            add(buf, t - spb / 8, clarinet(hz(m - 1), spb / 8 * 0.9), 0.45)  # 半音倚音，增加滑稽感
        add(buf, t, clarinet(hz(m), d), 0.6)
        if bar >= len(prog) // 2:
            add(buf, t, pluck(hz(m + 12), d, bright=1.5), 0.25)
    st = master_loop(buf, int(body * SR), wet=0.14, seed=7)
    return normalize(st, -20)


def track_zen_garden():
    """奈良、京都：都節音階（E F A B C），66 BPM，箏的分散和弦與尺八長音、風鈴。"""
    bpm, beats = 66, 4
    spb = 60 / bpm
    bars = 24
    rng = np.random.default_rng(41)
    body = bars * beats * spb
    buf = np.zeros(int((body + 4) * SR))
    scale = scale_notes([4, 5, 9, 11, 0], 64, 88)
    for bar in range(bars):
        t0 = bar * beats * spb
        add(buf, t0, pad(hz(40), beats * spb + 0.4, 0.6), 0.5)
        add(buf, t0, pad(hz(47), beats * spb + 0.4, 0.6), 0.35)
        base = [52, 53, 57, 59, 64] if bar % 4 < 2 else [52, 57, 59, 60, 64]
        for i, m in enumerate(base if bar % 2 == 0 else base[::-1]):
            add(buf, t0 + i * spb * 0.5, pluck(hz(m), spb * 2, bright=0.9), 0.4)
        if bar % 4 == 3:
            for i in range(3):
                add(buf, t0 + (2 + i * 0.6) * spb, bell(hz(88 + [0, 3, 7][i]), 1.0), 0.08)
    # 尺八旋律：兩小節一句，句尾留白
    phrase = [(0, 3, 76), (3, 1, 77), (4, 2, 81), (6, 2, 79 if 79 in scale else 77)]
    pos = 0
    cur = 76
    for bar in range(0, bars, 2):
        if bar % 8 == 6:
            continue
        t0 = bar * beats * spb
        for off, dur, _ in phrase:
            cur = scale[max(0, min(len(scale) - 1, scale.index(nearest(scale, cur)) + int(rng.integers(-2, 3))))]
            add(buf, t0 + off * spb, flute(hz(cur), dur * spb * 0.95), 0.6)
        pos += 1
    st = master_loop(buf, int(body * SR), wet=0.38, seed=9)
    return normalize(st, -22)


def track_tender_home():
    """溫柔回家：G 大調，76 BPM，鋼琴與八音盒，番外篇與結語。"""
    bpm, beats = 76, 4
    spb = 60 / bpm
    prog = ["G", "D", "Em", "C", "G", "D", "C", "D", "Em", "C", "G", "D", "C", "D", "G", "G"] + ["G", "D", "Em", "C", "Am", "D", "G", "D"]
    rng = np.random.default_rng(51)
    body = len(prog) * beats * spb
    buf = np.zeros(int((body + 3) * SR))
    rhythms = [[(0, 2), (2, 1), (3, 1)], [(0, 1), (1, 1), (2, 2)], [(0, 3), (3, 1)], [(0, 1.5), (1.5, 0.5), (2, 2)]]
    mel = make_melody(prog, [7, 9, 11, 0, 2, 4, 6], rhythms, rng, 71, 86, 74)
    for bar, ch in enumerate(prog):
        t0 = bar * beats * spb
        r, q = chord(ch)
        for m in chord_tones(ch, 55, 67)[:3]:
            add(buf, t0, pad(hz(m), beats * spb + 0.4, 1.2), 0.75)
        broot = 31 + ((r - 7) % 12)
        add(buf, t0, bass(hz(broot), beats * spb * 0.8), 0.45)
        arp = chord_tones(ch, 55, 74)
        for i, idx in enumerate([0, 2, 4, 2, 1, 3, 2, 3]):
            add(buf, t0 + i * spb / 2, piano(hz(arp[idx % len(arp)]), spb * 0.9), 0.24)
    for bar, off, dur, m in mel:
        t = (bar * beats + off) * spb
        add(buf, t, piano(hz(m), dur * spb), 0.5)
        if bar >= 16:
            add(buf, t, bell(hz(m + 12), dur * spb), 0.18)
    st = master_loop(buf, int(body * SR), wet=0.3, seed=13)
    return normalize(st, -21)


# ---------------------------------------------------------------- 場景音效
def sfx_out(sig, peak=0.7, fade=0.02):
    sig = sig * attack_release(len(sig), 0.003, fade)
    return sig / (np.max(np.abs(sig)) + 1e-9) * peak


def noise(dur, seed):
    return np.random.default_rng(seed).standard_normal(int(dur * SR))


def sfx_whoosh():
    t = tt(0.9)
    n = noise(0.9, 1)
    env = np.sin(np.pi * np.clip(t / 0.9, 0, 1)) ** 2
    lo = smooth(n, 30)
    hi = n - smooth(n, 4)
    mix = lo * (1 - t / 0.9) + hi * 0.25 * (t / 0.9)
    return sfx_out(mix * env, 0.55)


def sfx_confirm():
    """熊大的「收到，立即執行」提示音：兩聲上行。"""
    s = np.zeros(int(0.55 * SR))
    add(s, 0.0, bell(hz(84), 0.2)[: int(0.4 * SR)], 1.0)
    add(s, 0.11, bell(hz(91), 0.3)[: int(0.44 * SR)], 1.0)
    return sfx_out(s, 0.5, 0.08)


def sfx_sparkle():
    s = np.zeros(int(1.2 * SR))
    for i, m in enumerate([88, 93, 96, 100, 103, 108]):
        add(s, i * 0.06, bell(hz(m), 0.3)[: int(0.9 * SR)], 0.6)
    return sfx_out(s, 0.42, 0.2)


def sfx_boing():
    t = tt(0.6)
    f = 180 + 260 * np.exp(-t * 6) * (1 + 0.35 * np.sin(2 * np.pi * 14 * t))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4.5)
    return sfx_out(s, 0.55, 0.05)


def sfx_womp():
    """搞笑的失落音：長號一般下行三音。"""
    s = np.zeros(int(1.9 * SR))
    for i, m in enumerate([58, 57, 56]):
        add(s, i * 0.35, clarinet(hz(m), 0.32), 1.0)
    t = tt(0.9)
    f = hz(55) * (1 - 0.06 * t) * (1 + 0.012 * np.sin(2 * np.pi * 6 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    last = (np.sin(ph) + 0.4 * np.sin(3 * ph) + 0.2 * np.sin(5 * ph)) * attack_release(len(t), 0.02, 0.3) * 0.3
    add(s, 1.05, last, 1.0)
    return sfx_out(smooth(s, 3), 0.5, 0.1)


def sfx_stamp():
    t = tt(0.4)
    thump = np.sin(2 * np.pi * np.cumsum(90 + 120 * np.exp(-t * 40)) / SR) * np.exp(-t * 16)
    click = smooth(noise(0.4, 3), 3) * np.exp(-t * 60) * 0.6
    return sfx_out(thump + click, 0.65)


def sfx_snore():
    s = np.zeros(int(2.6 * SR))
    for k in range(2):
        t = tt(0.9)
        n = smooth(noise(0.9, 10 + k), 40)
        buzz = np.sin(2 * np.pi * 70 * t) * 0.4
        env = np.sin(np.pi * t / 0.9) ** 2
        add(s, k * 1.3, (n * 3 + buzz) * env, 1.0)
    return sfx_out(s, 0.4, 0.1)


def sfx_megaphone():
    """擴音器開機音：短暫回授的嗶聲。"""
    t = tt(0.7)
    f = 1250 + 40 * np.sin(2 * np.pi * 7 * t)
    s = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.3 + np.sin(2 * np.pi * np.cumsum(f) / SR)
    s = smooth(s, 5) * attack_release(len(t), 0.05, 0.25)
    return sfx_out(s, 0.32)


def footstep(seed, soft=True):
    t = tt(0.16)
    n = smooth(noise(0.16, seed), 14 if soft else 6)
    thud = np.sin(2 * np.pi * 95 * t) * 0.6
    return (n * 2 + thud) * np.exp(-t * (38 if soft else 30))


def sfx_footsteps():
    s = np.zeros(int(2.4 * SR))
    for i in range(6):
        add(s, 0.1 + i * 0.36, footstep(20 + i), 0.9 if i % 2 else 0.7)
    return sfx_out(s, 0.45, 0.1)


def sfx_forest():
    """竹林、公園環境聲：微風與鳥鳴，約 6 秒，頭尾淡入淡出。"""
    dur = 6.0
    t = tt(dur)
    wind = smooth(noise(dur, 30), 120) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.25 * t))
    s = wind * 6
    rng = np.random.default_rng(31)
    for k in range(7):
        start = rng.uniform(0.3, dur - 0.8)
        bt = tt(0.18)
        f0 = rng.uniform(2600, 3800)
        f = f0 + 900 * np.sin(2 * np.pi * rng.uniform(15, 30) * bt)
        chirp = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * bt / 0.18) ** 2
        for rep in range(int(rng.integers(1, 4))):
            add(s, start + rep * 0.22, chirp, 0.35)
    env = attack_release(len(t), 0.8, 1.5)
    return sfx_out(s * env, 0.35, 0.3)


def sfx_city():
    """澀谷人群與城市環境聲，約 6 秒。"""
    dur = 6.0
    t = tt(dur)
    rng = np.random.default_rng(40)
    s = smooth(noise(dur, 41), 60) * 4
    for k in range(40):  # 模糊的人聲嗡嗡
        st = rng.uniform(0, dur - 0.6)
        vt = tt(rng.uniform(0.2, 0.6))
        f = rng.uniform(140, 260) * (1 + 0.1 * np.sin(2 * np.pi * rng.uniform(3, 6) * vt))
        v = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * np.sin(4 * np.pi * np.cumsum(f) / SR)
        add(s, st, smooth(v, 20) * np.sin(np.pi * vt / vt[-1]) ** 2, 0.08)
    for k in range(3):  # 遠處的路口提示音
        add(s, 1 + k * 1.6, woodblock(2200)[: int(0.08 * SR)], 0.12)
    env = attack_release(len(t), 0.8, 1.5)
    return sfx_out(s * env, 0.35, 0.3)


def sfx_crowd_ooh():
    """路人驚訝的「喔～」。"""
    s = np.zeros(int(1.6 * SR))
    rng = np.random.default_rng(45)
    for k in range(10):
        vt = tt(1.1)
        f = rng.uniform(170, 300) * (1.0 + 0.12 * np.sin(np.pi * vt / 1.1)) * (1 + 0.01 * np.sin(2 * np.pi * 5 * vt))
        ph = 2 * np.pi * np.cumsum(f) / SR
        v = np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.25 * np.sin(3 * ph)
        add(s, rng.uniform(0, 0.25), smooth(v, 10) * np.sin(np.pi * vt / 1.1) ** 1.5, 0.12)
    return sfx_out(s, 0.38, 0.2)


def sfx_rain():
    dur = 6.0
    t = tt(dur)
    n = noise(dur, 50)
    hiss = n - smooth(n, 3)
    s = hiss * 0.5 + smooth(n, 8) * 0.6
    rng = np.random.default_rng(51)
    for k in range(120):
        add(s, rng.uniform(0, dur - 0.05), np.sin(2 * np.pi * rng.uniform(1800, 4000) * tt(0.02)) * np.exp(-tt(0.02) * 200), 0.5)
    env = attack_release(len(t), 0.8, 1.5)
    return sfx_out(s * env, 0.3, 0.3)


def sfx_zip():
    """捲尺拉出的聲音。"""
    t = tt(0.55)
    rate = 40 + 60 * t
    clicks = (np.sin(2 * np.pi * np.cumsum(rate) / SR) > 0.97).astype(float)
    s = smooth(clicks * noise(0.55, 60), 4) * 3 + np.sin(2 * np.pi * np.cumsum(500 + 900 * t) / SR) * 0.15
    return sfx_out(s * attack_release(len(t), 0.01, 0.08), 0.45)


def sfx_tada():
    s = np.zeros(int(1.6 * SR))
    for i, m in enumerate([72, 76, 79]):
        add(s, i * 0.09, clarinet(hz(m), 0.12), 0.8)
    for m in [72, 76, 79, 84]:
        add(s, 0.3, clarinet(hz(m), 0.9), 0.45)
        add(s, 0.3, bell(hz(m + 12), 0.8)[: int(1.2 * SR)], 0.25)
    return sfx_out(s, 0.5, 0.25)


def sfx_buzzer():
    t = tt(0.8)
    s = np.sign(np.sin(2 * np.pi * 110 * t)) + 0.5 * np.sign(np.sin(2 * np.pi * 116 * t))
    s = smooth(s, 8) * attack_release(len(t), 0.01, 0.1)
    s *= (np.sin(2 * np.pi * 3.5 * t) > -0.2)
    return sfx_out(smooth(s, 4), 0.32)


def sfx_airport_chime():
    s = np.zeros(int(2.2 * SR))
    for i, m in enumerate([79, 84, 88, 91]):
        add(s, i * 0.28, bell(hz(m), 0.6)[: int(1.3 * SR)], 0.8)
    return sfx_out(s, 0.42, 0.3)


def sfx_car_horn():
    s = np.zeros(int(0.9 * SR))
    for k, (st, d) in enumerate([(0, 0.18), (0.26, 0.4)]):
        t = tt(d)
        v = np.sign(np.sin(2 * np.pi * 420 * t)) + np.sign(np.sin(2 * np.pi * 510 * t))
        add(s, st, smooth(v, 10) * attack_release(len(t), 0.01, 0.04), 1.0)
    return sfx_out(s, 0.3)


def sfx_train():
    """新幹線呼嘯而過。"""
    dur = 2.4
    t = tt(dur)
    n = noise(dur, 70)
    body = smooth(n, 12) * 2 + (n - smooth(n, 3)) * 0.3
    env = np.exp(-((t - 1.1) / 0.45) ** 2)
    pitch = np.sin(2 * np.pi * np.cumsum(620 - 220 * np.tanh((t - 1.1) * 4)) / SR) * 0.15
    return sfx_out((body + pitch) * env, 0.5, 0.2)


def sfx_box_thud():
    s = np.zeros(int(1.0 * SR))
    for i, st in enumerate([0.0, 0.33]):
        t = tt(0.3)
        th = np.sin(2 * np.pi * np.cumsum(70 + 60 * np.exp(-t * 30)) / SR) * np.exp(-t * 14)
        add(s, st, th + smooth(noise(0.3, 80 + i), 10) * np.exp(-t * 30) * 0.8, 0.9 if i else 0.7)
    return sfx_out(s, 0.6)


def sfx_truck():
    dur = 3.0
    t = tt(dur)
    f = 38 + 4 * np.sin(2 * np.pi * 0.7 * t)
    eng = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.5 + np.sin(2 * np.pi * np.cumsum(f * 2) / SR)
    s = smooth(eng, 40) + smooth(noise(dur, 90), 50) * 2
    return sfx_out(s * attack_release(len(t), 0.6, 1.0), 0.4, 0.2)


def sfx_comic_sting():
    """「被發現了！」的驚嚇小號角：快速上滑接一聲短重音。"""
    s = np.zeros(int(1.0 * SR))
    t = tt(0.25)
    f = hz(60) * 2 ** (t / 0.25 * 1.0)
    ph = 2 * np.pi * np.cumsum(f) / SR
    add(s, 0, (np.sin(ph) + 0.4 * np.sin(3 * ph)) * attack_release(len(t), 0.01, 0.02) * 0.4, 1.0)
    for m in [72, 75, 78]:
        add(s, 0.27, clarinet(hz(m), 0.35), 0.6)
    add(s, 0.27, woodblock(700), 0.8)
    return sfx_out(s, 0.5, 0.15)


def sfx_camera():
    s = np.zeros(int(0.35 * SR))
    for st in (0.0, 0.09):
        t = tt(0.06)
        add(s, st, (noise(0.06, int(st * 100) + 5) - smooth(noise(0.06, int(st * 100) + 5), 3)) * np.exp(-t * 80), 1.0)
    return sfx_out(s, 0.45)


AMBIENCE = {"forest", "city-crowd", "rain", "footsteps"}

MUSIC = {
    "theme-warm": track_theme_warm,
    "travel-japan": track_travel_japan,
    "comedy-bounce": track_comedy_bounce,
    "zen-garden": track_zen_garden,
    "tender-home": track_tender_home,
}

SFX = {
    "whoosh": sfx_whoosh,
    "confirm": sfx_confirm,
    "sparkle": sfx_sparkle,
    "boing": sfx_boing,
    "womp": sfx_womp,
    "stamp": sfx_stamp,
    "snore": sfx_snore,
    "megaphone": sfx_megaphone,
    "footsteps": sfx_footsteps,
    "forest": sfx_forest,
    "city-crowd": sfx_city,
    "crowd-ooh": sfx_crowd_ooh,
    "rain": sfx_rain,
    "tape-measure": sfx_zip,
    "tada": sfx_tada,
    "buzzer": sfx_buzzer,
    "airport-chime": sfx_airport_chime,
    "car-horn": sfx_car_horn,
    "train": sfx_train,
    "box-thud": sfx_box_thud,
    "truck": sfx_truck,
    "comic-sting": sfx_comic_sting,
    "camera": sfx_camera,
}


def main():
    import sys
    only = set(sys.argv[1:])
    os.makedirs(MUSIC_DIR, exist_ok=True)
    os.makedirs(SFX_DIR, exist_ok=True)
    for name, fn in MUSIC.items():
        if only and name not in only:
            continue
        body = fn()
        # 多附 1 秒（重複開頭），播放器以 loopStart/loopEnd 循環一輪的長度，
        # 這樣即使 MP3 解碼器在開頭補了靜音，循環接點也不會有空白或爆音。
        st = np.concatenate([body, body[:SR]])
        print(f"  {name}: loopLength {len(body) / SR:.6f}s")
        write_mp3(os.path.join(MUSIC_DIR, name + ".mp3"), st, "96k")
    for name, fn in SFX.items():
        if only and name not in only:
            continue
        sig = fn()
        # 環境聲比較小聲，短音效統一響度，避免某些音效特別刺耳或聽不到
        target = -27 if name in AMBIENCE else -21
        write_mp3(os.path.join(SFX_DIR, name + ".mp3"), sig, "64k", lufs=target)


if __name__ == "__main__":
    main()
