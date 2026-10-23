"""產生 KUMA Universe 線上電影劇場的角色配音與旁白（第一階段試播：第一章前三幕照片）。

語音模型：Kokoro-82M v1.1-zh（hexgrad，Apache-2.0），透過 kokoro-onnx（MIT）在本機離線生成，
不需要任何雲端服務或 API Key。台詞逐字取自 js/story-data.js 的原始字幕，不增刪任何字。
使用的是模型內建的通用中文聲線編號，不模仿任何真實人物或官方角色配音。

需求（建議 Python 3.12，misaki 0.9 不支援 3.13）：
  pip install kokoro-onnx "misaki[zh]==0.9.4" soundfile librosa opencc-python-reimplemented
  （選用，用來自動核對咬字）pip install sherpa-onnx
模型檔（放在 --models 指定的資料夾）：
  https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/kokoro-v1.1-zh.onnx
  https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/voices-v1.1-zh.bin
  （選用）https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-paraformer-zh-small-2024-03-09.tar.bz2
執行：python tools/make_voice.py --models /path/to/models
輸出：assets/audio/voice/*.mp3、assets/audio/narration/*.mp3、js/voice-data.js
"""
import argparse
import difflib
import json
import os
import subprocess
import tempfile
import warnings

import numpy as np
import soundfile as sf

warnings.filterwarnings("ignore")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 三種聲線：模型內建聲線編號、語速、音高微調（半音）。
# 依音高與抑揚幅度從 100 種內建中文聲線中挑選：熊大最低沉、旁白居中、兔兔最高。
SPEAKERS = {
    "brown":    {"who": "熊大", "voice": "zm_014", "speed": 0.90, "pitch": -1.0, "dir": "voice"},
    "cony":     {"who": "兔兔", "voice": "zf_073", "speed": 1.06, "pitch": 1.0, "dir": "voice"},
    "narrator": {"who": "旁白", "voice": "zm_015", "speed": 1.00, "pitch": 0.0, "dir": "narration"},
}

# 配音腳本。scene 是該章 scenes 陣列的位置（0 起算），檔名用 1 起算的 s 編號。
# line 是該幕 lines 陣列的位置，text 必須和原字幕一字不差（程式會比對 story-data.js）。
# gap 是和上一句之間的停頓秒數（第一句為距離這一幕開始的秒數）。
SCRIPT = [
    {"chapter": "ch1", "scene": 2, "panel": 1, "cues": [
        {"speaker": "cony", "line": 0, "text": "熊大，我今天有一個很簡單的要求。", "gap": 0.8},
    ]},
    {"chapter": "ch1", "scene": 3, "panel": 2, "cues": [
        {"speaker": "cony", "line": 0, "text": "我要所有鹿看到我都要鞠躬！", "gap": 0.9},
        {"speaker": "brown", "line": 1, "text": "收到，立即執行。", "gap": 0.7},
    ]},
    {"chapter": "ch1", "scene": 4, "panel": 3, "cues": [
        {"speaker": "brown", "line": 0, "text": "鹿一號，請完成九十度鞠躬。", "gap": 0.9},
        # 畫面上的標語「鞠躬 90 度！」由旁白念出，不另加旁白文字
        {"speaker": "narrator", "line": 1, "text": "鞠躬 90 度！", "gap": 0.5},
    ]},
]
TAIL = 1.5  # 最後一句結束後，這一幕至少再停留的秒數


def measure_lufs(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", path, "-af", "ebur128", "-f", "null", "-"],
                       capture_output=True, text=True)
    for line in reversed(r.stderr.splitlines()):
        if line.strip().startswith("I:") and "LUFS" in line:
            return float(line.split()[1])
    return None


def encode(path, audio, sr, lufs=-18.0):
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        wav = tmp.name
    sf.write(wav, audio, sr, subtype="PCM_16")
    cur = measure_lufs(wav)
    gain = (lufs - cur) if cur is not None else 0.0
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav,
                    "-af", f"volume={gain:.2f}dB,alimiter=limit=0.89", "-ac", "1", "-ar", "24000",
                    "-c:a", "libmp3lame", "-b:a", "64k",
                    "-metadata", "artist=KUMA Universe（Kokoro-82M 合成語音）", path], check=True)
    os.remove(wav)


def trim(audio, sr, pad=0.06):
    # 去掉前後的靜音，保留一點點餘裕，避免字頭被切掉
    level = np.abs(audio)
    thr = max(1e-4, level.max() * 0.02)
    idx = np.where(level > thr)[0]
    if not len(idx):
        return audio
    a = max(0, idx[0] - int(pad * sr))
    b = min(len(audio), idx[-1] + int(pad * 2 * sr))
    out = audio[a:b].copy()
    fade = int(0.01 * sr)
    out[:fade] *= np.linspace(0, 1, fade)
    out[-fade:] *= np.linspace(1, 0, fade)
    return out


def story_lines():
    # 從 story-data.js 讀出每一幕的原字幕，用 node 執行，確保比對的是網站實際使用的資料
    js = ("global.window={};require(process.argv[1]);var e=window.KUMA_LIBRARY.episodes[0];"
          "var o={};e.chapters.forEach(function(c){o[c.id]=c.scenes.map(function(s){return (s.lines||[]).map(function(l){return [l.who,l.text]})})});"
          "console.log(JSON.stringify(o));")
    out = subprocess.run(["node", "-e", js, os.path.join(ROOT, "js", "story-data.js")],
                         capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--models", required=True)
    args = ap.parse_args()

    import cn2an
    import librosa
    import opencc
    from kokoro_onnx import Kokoro
    from misaki.zh import ZHG2P

    tts = Kokoro(os.path.join(args.models, "kokoro-v1.1-zh.onnx"), os.path.join(args.models, "voices-v1.1-zh.bin"))
    g2p = ZHG2P(version="1.1")
    t2s = opencc.OpenCC("t2s")  # 只用來查讀音；網站上的字幕仍是原本的繁體字

    asr = None
    asr_dir = os.path.join(args.models, "sherpa-onnx-paraformer-zh-small-2024-03-09")
    if os.path.isdir(asr_dir):
        import sherpa_onnx
        asr = sherpa_onnx.OfflineRecognizer.from_paraformer(
            paraformer=os.path.join(asr_dir, "model.int8.onnx"), tokens=os.path.join(asr_dir, "tokens.txt"), num_threads=4)

    lines = story_lines()
    data = {"model": "Kokoro-82M v1.1-zh（Apache-2.0）", "speakers": {}, "scenes": []}
    for k, sp in SPEAKERS.items():
        data["speakers"][k] = {"who": sp["who"], "voice": sp["voice"]}
    report = []

    for sc in SCRIPT:
        orig = lines[sc["chapter"]][sc["scene"]]
        t = 0.0
        cues = []
        for i, c in enumerate(sc["cues"]):
            who, text = orig[c["line"]]
            if text != c["text"]:
                raise SystemExit(f"台詞和原字幕不一致：{sc['chapter']} 第 {sc['scene']} 幕：{c['text']!r} ≠ {text!r}")
            sp = SPEAKERS[c["speaker"]]
            if c["speaker"] != "narrator" and who != sp["who"]:
                raise SystemExit(f"說話者不一致：{text} 原字幕是 {who}，腳本是 {sp['who']}")
            phon, _ = g2p(t2s.convert(text))
            audio, sr = tts.create(phon, voice=sp["voice"], speed=sp["speed"], is_phonemes=True)
            audio = np.asarray(audio, dtype=np.float32)
            if sp["pitch"]:
                audio = librosa.effects.pitch_shift(audio, sr=sr, n_steps=sp["pitch"])
            audio = trim(audio, sr)
            dur = len(audio) / sr
            name = f"ep01_{sc['chapter']}_s{sc['scene'] + 1:02d}_{c['speaker']}_{i + 1}.mp3"
            rel = f"assets/audio/{sp['dir']}/{name}"
            encode(os.path.join(ROOT, rel), audio, sr)
            heard = ""
            if asr:
                s = asr.create_stream()
                s.accept_waveform(16000, librosa.resample(audio, orig_sr=sr, target_sr=16000))
                asr.decode_stream(s)
                heard = s.result.text
            t += c["gap"]
            cues.append({"id": name[:-4], "speaker": c["speaker"], "who": sp["who"], "line": c["line"],
                         "text": text, "src": rel, "at": round(t, 2), "dur": round(dur, 2)})
            ref = "".join(ch for ch in cn2an.transform(t2s.convert(text), "an2cn") if "一" <= ch <= "鿿")
            report.append((rel, sp["who"], text, round(t, 2), round(t + dur, 2), heard,
                           round(difflib.SequenceMatcher(None, ref, heard).ratio(), 2) if heard else None))
            t += dur
        data["scenes"].append({"chapter": sc["chapter"], "scene": sc["scene"],
                               "sceneId": f"ep01_{sc['chapter']}_s{sc['scene'] + 1:02d}",
                               "minDuration": round(t + TAIL, 2), "cues": cues})

    out = os.path.join(ROOT, "js", "voice-data.js")
    with open(out, "w", encoding="utf-8") as f:
        f.write("/*\n * 角色配音與旁白的時間表（由 tools/make_voice.py 產生，請勿手動修改）。\n"
                " * at：這一句從這一幕的第幾秒開始；dur：音檔長度（秒）。text 與原字幕一字不差。\n */\n")
        f.write("window.KUMA_VOICE = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n")
    for r in report:
        print(" | ".join(str(x) for x in r))


if __name__ == "__main__":
    main()
