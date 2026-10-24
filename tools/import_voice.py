"""把一段錄好的配音（例如用 Gemini 生成的影片）切成一句一個檔案，放進網站並更新 js/voice-data.js。

台詞、場景與檔名沿用 tools/make_voice.py 的 SCRIPT；錄音裡的句子順序必須和 SCRIPT 相同。
執行：python tools/import_voice.py 錄音檔 --cuts 2.42,4.64,6.10,8.40 [--source "說明文字"]
  --cuts：句與句之間的切點（秒），數量是句數減 1。
需求：Python 3 + numpy + soundfile，以及系統上的 ffmpeg。
"""
import argparse
import json
import os
import subprocess
import tempfile

import numpy as np
import soundfile as sf

from make_voice import ROOT, SCRIPT, SPEAKERS, TAIL, encode, story_lines, trim

SR = 24000


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("recording")
    ap.add_argument("--cuts", required=True)
    ap.add_argument("--source", default="使用者提供的錄音")
    args = ap.parse_args()

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        wav = tmp.name
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", args.recording, "-vn", "-ac", "1", "-ar", str(SR), wav], check=True)
    audio, _ = sf.read(wav, dtype="float32")
    os.remove(wav)

    cues_in_order = [(sc, i, c) for sc in SCRIPT for i, c in enumerate(sc["cues"])]
    cuts = [float(x) for x in args.cuts.split(",")]
    if len(cuts) != len(cues_in_order) - 1:
        raise SystemExit(f"需要 {len(cues_in_order) - 1} 個切點，收到 {len(cuts)} 個")
    bounds = [0.0] + cuts + [len(audio) / SR]

    lines = story_lines()
    data = {"model": args.source, "speakers": {k: {"who": v["who"]} for k, v in SPEAKERS.items()}, "scenes": []}
    by_scene = {}
    for n, (sc, i, c) in enumerate(cues_in_order):
        who, text = lines[sc["chapter"]][sc["scene"]][c["line"]]
        if text != c["text"]:
            raise SystemExit(f"台詞和原字幕不一致：{c['text']!r} ≠ {text!r}")
        clip = trim(audio[int(bounds[n] * SR):int(bounds[n + 1] * SR)].copy(), SR)
        sp = SPEAKERS[c["speaker"]]
        name = f"ep01_{sc['chapter']}_s{sc['scene'] + 1:02d}_{c['speaker']}_{i + 1}.mp3"
        rel = f"assets/audio/{sp['dir']}/{name}"
        encode(os.path.join(ROOT, rel), clip, SR)
        dur = len(clip) / SR
        state = by_scene.setdefault(id(sc), {"sc": sc, "t": 0.0, "cues": []})
        state["t"] += c["gap"]
        state["cues"].append({"id": name[:-4], "speaker": c["speaker"], "who": sp["who"], "line": c["line"],
                              "text": text, "src": rel, "at": round(state["t"], 2), "dur": round(dur, 2)})
        print(f"{rel} | {sp['who']} | {text} | 錄音 {bounds[n]:.2f}–{bounds[n + 1]:.2f}s | 長 {dur:.2f}s | 網站 {state['t']:.2f}–{state['t'] + dur:.2f}s")
        state["t"] += dur
    for st in by_scene.values():
        sc = st["sc"]
        data["scenes"].append({"chapter": sc["chapter"], "scene": sc["scene"],
                               "sceneId": f"ep01_{sc['chapter']}_s{sc['scene'] + 1:02d}",
                               "minDuration": round(st["t"] + TAIL, 2), "cues": st["cues"]})

    with open(os.path.join(ROOT, "js", "voice-data.js"), "w", encoding="utf-8") as f:
        f.write("/*\n * 角色配音與旁白的時間表（由 tools/import_voice.py 產生，請勿手動修改）。\n"
                " * at：這一句從這一幕的第幾秒開始；dur：音檔長度（秒）。text 與原字幕一字不差。\n */\n")
        f.write("window.KUMA_VOICE = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n")


if __name__ == "__main__":
    main()
