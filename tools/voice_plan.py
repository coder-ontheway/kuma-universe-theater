"""產生全片配音錄音腳本（給 Gemini 錄音用）與對應的機器可讀計畫。

規則（不改寫任何原文）：
- 兔兔、熊大的台詞：由該角色念。
- 字卡「兔兔：…」「熊大：…」：由該角色念冒號後的文字；其他字卡由旁白念。
- 章節旁白段落（story）、開場角色介紹、結語：由旁白念；太長的段落在句號、逗號處分段，分段後接起來與原文一字不差。
- 畫面文字（照片上的標語、表格）與章名卡不錄，只顯示字幕。
- 已經上線的第一章前三張照片不重錄。
每段錄音控制在約 40 個字以內（Gemini 一段影片約 10 秒）。
執行：python3 tools/voice_plan.py → docs/voice-plan.md、tools/voice-plan.json
"""
import json
import os
import re
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAX_PIECE = 40   # 單句最多字數（超過就分段）
MAX_CLIP = 48    # 一段錄音最多字數（含每多一句加 2 字的停頓；Gemini 10 秒影片實測可念約 50 字）
DONE = {("ch1", 2), ("ch1", 3), ("ch1", 4)}
SPEAKER = {"兔兔": "cony", "熊大": "brown", "旁白": "narrator"}


def spoken_len(t):
    return len(re.findall(r"[一-鿿0-9A-Za-z]", t))


def split_text(t):
    if spoken_len(t) <= MAX_PIECE:
        return [t]
    parts = re.findall(r"[^。！？]+[。！？」]*", t)
    out = []
    for p in parts:
        if spoken_len(p) <= MAX_PIECE:
            out.append(p)
            continue
        sub = re.findall(r"[^，、；：]+[，、；：]?", p)
        cur = ""
        for s in sub:
            if cur and spoken_len(cur + s) > MAX_PIECE:
                out.append(cur)
                cur = ""
            cur += s
        if cur:
            out.append(cur)
    # 把太短的尾巴併回前一段
    merged = []
    for p in out:
        if merged and spoken_len(merged[-1] + p) <= MAX_PIECE:
            merged[-1] += p
        else:
            merged.append(p)
    assert "".join(merged) == t
    return merged


def load():
    js = ("global.window={};require(process.argv[1]);console.log(JSON.stringify(window.KUMA_LIBRARY.episodes[0].chapters.map("
          "function(c){return {id:c.id,label:c.label,title:c.title,scenes:c.scenes.map(function(s){return {type:s.type,panelNo:s.panelNo||null,"
          "narration:s.narration||[],lines:s.lines||[]}})}})))")
    return json.loads(subprocess.run(["node", "-e", js, os.path.join(ROOT, "js", "story-data.js")],
                                     capture_output=True, text=True, check=True).stdout)


def cues_for(ch):
    cues = []
    for si, s in enumerate(ch["scenes"]):
        if (ch["id"], si) in DONE:
            continue
        for pi, p in enumerate(s["narration"]):
            parts = split_text(p)
            for k, part in enumerate(parts):
                cues.append({"scene": si, "kind": "narration", "index": pi, "part": k, "parts": len(parts),
                             "speaker": "narrator", "who": "旁白", "say": part, "text": p})
        for li, l in enumerate(s["lines"]):
            who, text, say = l["who"], l["text"], l["text"]
            if who == "畫面文字":
                continue
            if who == "字卡":
                m = re.match(r"^(兔兔|熊大)：(.+)$", text)
                who, say = (m.group(1), m.group(2)) if m else ("旁白", text)
            cues.append({"scene": si, "kind": "line", "index": li, "part": 0, "parts": 1,
                         "speaker": SPEAKER[who], "who": who, "say": say, "text": text})
    return cues


def pack(cues):
    clips, cur, size = [], [], 0
    for c in cues:
        n = spoken_len(c["say"]) + (2 if cur else 0)
        if cur and size + n > MAX_CLIP:
            clips.append(cur)
            cur, size = [], 0
            n = spoken_len(c["say"])
        cur.append(c)
        size += n
    if cur:
        clips.append(cur)
    return clips


def scene_name(ch, si):
    s = ch["scenes"][si]
    if s["type"] == "panel":
        return f"第 {s['panelNo']} 張照片" if si < 8 or ch["id"] != "prologue" else f"第 {s['panelNo']} 張照片（第二組）"
    return {"story": "章節旁白", "quote": "本章台詞", "photo": f"角色介紹 {si + 1}", "title": "章名"}[s["type"]]


def main():
    chapters = load()
    plan, md = [], []
    md.append("# 全片配音錄音腳本\n")
    md.append("每一段錄音用 Gemini 生成一支影片（約 10 秒內）。台詞請一字不改，句與句之間停一秒，**不要背景音樂和音效**。\n")
    md.append("每段可以直接貼給 Gemini 的指示：\n")
    md.append("> 請生成配音，不要背景音樂和音效，句與句之間停一秒，台詞一字不改。兔兔是活潑、甜美、俏皮的成年女性卡通聲音；熊大是溫暖、憨厚、可愛的成年男性卡通聲音，講話慢一點；旁白是清楚、親切、帶喜劇節奏的敘事聲音。台詞如下：（貼上該段的台詞）\n")
    md.append("傳檔時請在訊息裡寫上錄音編號，例如「第二章-對白1」。照片上的標語、表格與章名不錄，只顯示字幕。第一章前三張照片已經完成。\n")
    total = 0
    # 同一角色念同一句話只錄一次（例如序章兩組照片的台詞、各章的「收到，立即執行。」），其他地方重複使用
    seen = {("cony", "熊大，我今天有一個很簡單的要求。"), ("cony", "我要所有鹿看到我都要鞠躬！"), ("brown", "收到，立即執行。"),
            ("brown", "鹿一號，請完成九十度鞠躬。")}
    reuse = []

    def fresh(cs, ch):
        out = []
        for c in cs:
            key = (c["speaker"], c["say"])
            if key in seen:
                reuse.append(dict(c, chapter=ch["id"]))
            else:
                seen.add(key)
                out.append(c)
        return out

    for kind, part_title, tag in (("line", "第一部分：角色對白與字卡（建議先錄）", "對白"),
                                  ("narration", "第二部分：章節旁白（段落較長，可以之後再錄）", "旁白")):
        md.append(f"\n# {part_title}\n")
        for ch in chapters:
            clips = pack(fresh([c for c in cues_for(ch) if c["kind"] == kind], ch))
            if not clips:
                continue
            md.append(f"\n## {ch['label']}：{ch['title']}（{len(clips)} 段）\n")
            for n, clip in enumerate(clips, 1):
                cid = f"{ch['label']}-{tag}{n}"
                md.append(f"\n**{cid}**（{sum(spoken_len(c['say']) for c in clip)} 字）\n")
                last = None
                for c in clip:
                    where = scene_name(ch, c["scene"])
                    if where != last:
                        md.append(f"\n_{where}_\n")
                        last = where
                    md.append(f"- {c['who']}：{c['say']}")
                md.append("")
                plan.append({"clip": cid, "chapter": ch["id"], "cues": clip})
                total += 1
    md.insert(1, f"共 {total} 段錄音。另有 {len(reuse)} 句是重複的台詞（例如各章的「收到，立即執行。」），錄一次就會自動重複使用，不必再錄。\n")
    open(os.path.join(ROOT, "docs", "voice-plan.md"), "w", encoding="utf-8").write("\n".join(md) + "\n")
    plan.append({"clip": "reuse", "cues": reuse})
    json.dump(plan, open(os.path.join(ROOT, "tools", "voice-plan.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(total, "clips")


if __name__ == "__main__":
    main()
