# 音訊資料夾

| 資料夾 | 內容 |
| --- | --- |
| `music/` | 背景音樂 5 首（MP3，可循環） |
| `sfx/` | 場景音效 23 種（MP3） |
| `narration/` | 旁白（目前沒有音檔） |
| `voice/` | 兔兔、熊大角色配音（目前沒有音檔） |

音樂與音效全部由 `tools/make_audio.py` 合成，CC0 授權，來源、授權與每個檔案的用途見 `docs/audio-credits.md`。

## 換成其他音檔

1. 把新檔案放進對應資料夾（建議 MP3）。
2. 在 `js/story-data.js` 的 `audio.music` 或 `audio.sfx` 改 `src` 路徑，或新增一筆。
3. 在檔案最下方的 `CUES` 指定章節音樂（`music`）與每一幕的音效（`scenes`）。
4. 旁白或配音：填入每一幕的 `audio.narration` 或 `audio.voice`（播放器目前尚未播放這兩種，需要再擴充）。

使用外部素材時，請把來源網址、作者與授權條件寫進 `docs/audio-credits.md`。
