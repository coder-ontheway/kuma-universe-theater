# 音訊資料夾

| 資料夾 | 內容 |
| --- | --- |
| `music/` | 背景音樂 5 首（MP3，可循環） |
| `sfx/` | 場景音效 23 種（MP3） |
| `narration/` | 旁白（試播 1 個：第一章第 3 張照片的標語） |
| `voice/` | 兔兔、熊大角色配音（試播 4 個：第一章前三張照片） |

音樂與音效全部由 `tools/make_audio.py` 合成，CC0 授權，來源、授權與每個檔案的用途見 `docs/audio-credits.md`。
配音與旁白目前是使用者以 Google Gemini 生成的錄音，由 `tools/import_voice.py` 切句並對齊；`tools/make_voice.py` 可改用開源模型 Kokoro-82M 生成。腳本與時間表見 `docs/voice-script.md`。

配音檔名規則：`ep01_<章節 id>_s<這一章第幾幕，兩位數>_<說話者>_<這一幕第幾句>.mp3`，說話者為 `brown`（熊大）、`cony`（兔兔）、`narrator`（旁白）。

## 換成其他音檔

1. 把新檔案放進對應資料夾（建議 MP3）。
2. 在 `js/story-data.js` 的 `audio.music` 或 `audio.sfx` 改 `src` 路徑，或新增一筆。
3. 在檔案最下方的 `CUES` 指定章節音樂（`music`）與每一幕的音效（`scenes`）。
4. 旁白或配音：在 `tools/make_voice.py` 的 `SCRIPT` 加入台詞（必須和原字幕一字不差），重新執行後會產生音檔與 `js/voice-data.js`。

使用外部素材時，請把來源網址、作者與授權條件寫進 `docs/audio-credits.md`。
