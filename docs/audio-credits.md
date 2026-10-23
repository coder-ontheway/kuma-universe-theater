# 音樂與音效清單

## 來源與授權

本專案所有背景音樂與音效，都是由 `tools/make_audio.py` 以程式從零合成的原創作品：
用正弦波、泛音、雜訊與包絡線模擬琴、尺八、鋼琴、八音盒、豎笛、低音、打擊樂與各種音效，再加上程式產生的殘響。

- 沒有使用任何外部錄音、取樣、音效庫、商業歌曲或電影配樂。
- 授權：CC0 1.0（公眾領域貢獻宣告），可自由用於公開網站、修改與再散布，不需署名。
- 重新產生：`python3 tools/make_audio.py`（需要 Python 3、numpy、ffmpeg）。程式使用固定的亂數種子，每次輸出相同。
- 格式：MP3。背景音樂 96 kbps 立體聲，可無縫循環；音效 64 kbps 單聲道。響度已統一（音樂約 -19 LUFS，短音效約 -21 LUFS，環境聲約 -27 LUFS）。

為什麼不用網路上的免費素材：開發環境無法連到 Freesound、Pixabay、OpenGameArt、Wikimedia 等網站，
也無法逐一確認授權。自行合成可以確保每個檔案的來源與授權都清楚。

## 檔案

| 檔案 | 內容 | 長度 | 大小 |
| --- | --- | --- | --- |
| `assets/audio/music/comedy-bounce.mp3` | 搞笑碰恰（豎笛斷奏、木魚） | 循環一輪 58.2 秒 | 696 KB |
| `assets/audio/music/tender-home.mp3` | 溫柔回家（鋼琴、八音盒） | 循環一輪 75.8 秒 | 904 KB |
| `assets/audio/music/theme-warm.mp3` | 溫馨主題（開場、片尾） | 循環一輪 91.4 秒 | 1088 KB |
| `assets/audio/music/travel-japan.mp3` | 日本旅行出發（五聲音階、琴與輕打擊） | 循環一輪 68.6 秒 | 820 KB |
| `assets/audio/music/zen-garden.mp3` | 古都庭園（箏、尺八、風鈴） | 循環一輪 87.3 秒 | 1036 KB |
| `assets/audio/sfx/airport-chime.mp3` | 機場廣播提示音 | 2.2 秒 | 20 KB |
| `assets/audio/sfx/boing.mp3` | 彈簧搞笑音 | 0.6 秒 | 8 KB |
| `assets/audio/sfx/box-thud.mp3` | 紙箱落地 | 1.0 秒 | 12 KB |
| `assets/audio/sfx/buzzer.mp3` | 超標警示音 | 0.8 秒 | 8 KB |
| `assets/audio/sfx/camera.mp3` | 相機快門 | 0.4 秒 | 4 KB |
| `assets/audio/sfx/car-horn.mp3` | 汽車喇叭 | 0.9 秒 | 8 KB |
| `assets/audio/sfx/city-crowd.mp3` | 澀谷人群環境聲 | 6.0 秒 | 48 KB |
| `assets/audio/sfx/comic-sting.mp3` | 被發現了的驚嚇音 | 1.0 秒 | 12 KB |
| `assets/audio/sfx/confirm.mp3` | 熊大「收到，立即執行」提示音 | 0.6 秒 | 8 KB |
| `assets/audio/sfx/crowd-ooh.mp3` | 路人驚訝聲 | 1.6 秒 | 16 KB |
| `assets/audio/sfx/footsteps.mp3` | 腳步聲 | 2.4 秒 | 20 KB |
| `assets/audio/sfx/forest.mp3` | 公園、竹林的風聲與鳥鳴 | 6.0 秒 | 48 KB |
| `assets/audio/sfx/megaphone.mp3` | 擴音器嗶聲 | 0.7 秒 | 8 KB |
| `assets/audio/sfx/rain.mp3` | 雨聲 | 6.0 秒 | 48 KB |
| `assets/audio/sfx/snore.mp3` | 打呼 | 2.6 秒 | 24 KB |
| `assets/audio/sfx/sparkle.mp3` | 閃亮音 | 1.2 秒 | 12 KB |
| `assets/audio/sfx/stamp.mp3` | 蓋章重音 | 0.4 秒 | 4 KB |
| `assets/audio/sfx/tada.mp3` | 完成號角 | 1.6 秒 | 16 KB |
| `assets/audio/sfx/tape-measure.mp3` | 捲尺 | 0.6 秒 | 8 KB |
| `assets/audio/sfx/train.mp3` | 新幹線呼嘯 | 2.4 秒 | 20 KB |
| `assets/audio/sfx/truck.mp3` | 貨車引擎 | 3.0 秒 | 24 KB |
| `assets/audio/sfx/whoosh.mp3` | 章節轉場風聲 | 0.9 秒 | 8 KB |
| `assets/audio/sfx/womp.mp3` | 失落長號 | 1.9 秒 | 16 KB |

共 5 首背景音樂（約 4.4 MB）與 23 種音效（約 0.4 MB）。

## 章節與場景配置

背景音樂依章節切換，換曲時 1.6 秒交叉淡入淡出。音效只放在畫面或台詞適合的幕，不是每一幕都有。
配置寫在 `js/story-data.js` 最下方的 `CUES`。

| 段落 | 背景音樂 | 有音效的幕 |
| --- | --- | --- |
| 開場 角色介紹 | theme-warm | 角色介紹 熊大｜AI agent 執行熊：閃亮音（sparkle） |
| 序章 一個月日本旅行的起點 | travel-japan | 章名：章節轉場風聲（whoosh）<br>補充照片 A 第 2 幕：汽車喇叭（car-horn）<br>補充照片 A 第 4 幕：熊大「收到，立即執行」提示音（confirm）<br>補充照片 A 第 5 幕：完成號角（tada）<br>補充照片 A 第 6 幕：機場廣播提示音（airport-chime）<br>補充照片 B 第 2 幕：汽車喇叭（car-horn）<br>補充照片 B 第 4 幕：熊大「收到，立即執行」提示音（confirm）<br>補充照片 B 第 6 幕：機場廣播提示音（airport-chime）<br>結尾台詞：熊大「收到，立即執行」提示音（confirm） |
| 第一章 Day 11 奈良 | zen-garden | 章名：章節轉場風聲（whoosh）<br>旁白：公園、竹林的風聲與鳥鳴（forest）<br>第 2 幕：熊大「收到，立即執行」提示音（confirm）<br>第 3 幕：彈簧搞笑音（boing）<br>第 5 幕：相機快門（camera）<br>第 6 幕：失落長號（womp） |
| 第二章 Day 13 大阪城 | comedy-bounce | 章名：章節轉場風聲（whoosh）<br>第 1 幕：腳步聲（footsteps）<br>第 2 幕：熊大「收到，立即執行」提示音（confirm）<br>第 4 幕：打呼（snore）<br>第 5 幕：擴音器嗶聲（megaphone）<br>第 6 幕：蓋章重音（stamp）<br>結尾台詞：失落長號（womp） |
| 第三章 Day 20 京都嵐山 | zen-garden | 章名：章節轉場風聲（whoosh）<br>旁白：公園、竹林的風聲與鳥鳴（forest）<br>第 2 幕：熊大「收到，立即執行」提示音（confirm）<br>第 3 幕：捲尺（tape-measure）<br>第 5 幕：路人驚訝聲（crowd-ooh）<br>第 6 幕：雨聲（rain） |
| 第四章 Day 25 東京澀谷十字路口 | comedy-bounce | 章名：章節轉場風聲（whoosh）<br>旁白：澀谷人群環境聲（city-crowd）<br>第 1 幕：相機快門（camera）<br>第 2 幕：熊大「收到，立即執行」提示音（confirm）<br>第 3 幕：擴音器嗶聲（megaphone）<br>第 5 幕：腳步聲（footsteps）<br>第 6 幕：完成號角（tada） |
| 第五章 Day 29 東京 | travel-japan；第 4 幕 換成 tender-home、第 5 幕 換成 tender-home | 章名：章節轉場風聲（whoosh）<br>第 1 幕：熊大「收到，立即執行」提示音（confirm）<br>第 2 幕：閃亮音（sparkle）<br>第 3 幕：新幹線呼嘯（train）<br>第 6 幕：被發現了的驚嚇音（comic-sting） |
| 第六章 Day 30 東京晴空塔 | comedy-bounce | 章名：章節轉場風聲（whoosh）<br>第 1 幕：閃亮音（sparkle）<br>第 2 幕：熊大「收到，立即執行」提示音（confirm）<br>第 3 幕：捲尺（tape-measure）<br>第 4 幕：完成號角（tada）<br>第 5 幕：超標警示音（buzzer）<br>第 6 幕：機場廣播提示音（airport-chime） |
| 番外篇 回國後的最終任務 | tender-home | 章名：章節轉場風聲（whoosh）<br>第 1 幕：熊大「收到，立即執行」提示音（confirm）<br>第 2 幕：紙箱落地（box-thud）<br>第 3 幕：貨車引擎（truck）<br>第 4 幕：被發現了的驚嚇音（comic-sting）<br>第 5 幕：完成號角（tada）<br>第 6 幕：失落長號（womp） |
| 結語 旅行還沒有結束 | tender-home | 章名：章節轉場風聲（whoosh）<br>結尾台詞：熊大「收到，立即執行」提示音（confirm） |
| 片尾畫面 | theme-warm | 無 |

