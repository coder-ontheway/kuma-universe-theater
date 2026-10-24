# KUMA Universe 線上電影劇場

《兔兔與熊大的日本荒謬旅行》照片式電影播放網站。純前端（HTML／CSS／JavaScript），不需要後端、資料庫或 API 金鑰。

這不是影片：畫面是 PDF 裡的原始照片，以劇情字幕、淡入淡出轉場與時間軸模擬電影播放。

## 檔案結構

```
index.html                 首頁與播放器
css/style.css              版面與樣式
js/story-data.js           劇情資料（章節、每一幕的照片、旁白、台詞、預留音訊欄位）
js/app.js                  播放器程式（不含任何劇情內容）
js/audio-engine.js         音訊引擎（背景音樂淡入淡出、場景音效、角色配音與旁白、開關與音量）
js/voice-data.js           配音與旁白時間表（由 tools/make_voice.py 產生）
assets/images/
  characters-rabbit-and-bear.jpg   角色介紹照片（PDF 第 2 頁）
  scenes/                  六格組合圖切出的單幕圖片（54 張）
  thumbs/                  章節卡片用縮圖
  composites/              切割前的完整組合圖（僅供核對，播放時不顯示）
  icon.png                 網站圖示
assets/audio/music/        背景音樂 5 首（原創合成，CC0）
assets/audio/sfx/          場景音效 23 種（原創合成，CC0）
assets/audio/narration/、voice/   旁白與角色配音（目前只有第一章前三幕的試播）
docs/pdf-inventory.md      PDF 逐頁檢查結果與照片對應表
docs/audio-credits.md      音樂與音效的來源、授權與章節配置表
docs/voice-script.md       配音試播腳本、聲線與授權
tools/crop_panels.py       組合圖切割腳本（記錄每張圖的格線座標）
tools/make_audio.py        合成所有音樂與音效的腳本
tools/make_voice.py        配音腳本，並可用 Kokoro-82M 開源語音模型生成
tools/import_voice.py      把錄好的配音（如 Gemini 影片）切句、對齊並放進網站
manifest.webmanifest       加入主畫面用設定
.nojekyll                  讓 GitHub Pages 直接提供所有檔案
```

## 本機預覽

瀏覽器直接開 `index.html` 也能看，但建議用本機伺服器：

```
python3 -m http.server 8000
```

然後打開 http://localhost:8000/

## 部署到 GitHub Pages

1. 把整個資料夾的內容推到 repository 的 `main` 分支根目錄。
2. 到 repository 的 Settings → Pages，Source 選「Deploy from a branch」，分支選 `main`、資料夾選 `/ (root)`。
3. 幾分鐘後網址會是 `https://<帳號>.github.io/<repository 名稱>/`。

所有路徑都是相對路徑，沒有寫死在網站根目錄，所以放在子路徑下也能正常載入。已在本機用 `/kuma-universe-theater/` 子路徑測試，沒有 404。

## 播放器功能

- 播放／暫停、上一幕／下一幕、拖曳進度條跳轉
- 顯示目前章節名稱、第幾幕、全片時間
- 章節選單，可從任一章開始
- 自動依序播放下一幕（可在設定關閉）
- 每幕停留時間可調（3–15 秒，台詞長的幕會依字數多停留）
- 字幕大小可調
- 全螢幕（iPhone Safari 不支援網頁全螢幕，會改用劇院模式並提示「加入主畫面」）
- 觀看進度自動存在瀏覽器（localStorage），重新開啟網站可「繼續觀看」
- 片尾畫面：重新播放、選擇章節、回首頁
- 照片載入失敗時顯示錯誤訊息與檔案路徑
- PDF 沒有照片的頁面（結語）標示「尚未配置圖片」
- 鍵盤：空白鍵播放／暫停，←／→ 上一幕／下一幕，F 全螢幕
- 手機：點銀幕播放／暫停，左右滑動切換幕

## 新增集數

在 `js/story-data.js` 的 `KUMA_LIBRARY.episodes` 加入新的 episode 物件（結構同現有的 `japan-trip`），圖片放進 `assets/images/scenes/`。播放器程式不需要修改。目前首頁只播放第一集，多集選單是後續擴充項目。

## 聲音

- 背景音樂依章節切換，換曲時交叉淡入淡出；片尾畫面播放主題曲。
- 場景音效只放在適合的幕（腳步、環境聲、搞笑反應、轉場等），每幕最多一個，進入該幕時播放一次。
- 播放器右上角是靜音鍵；播放設定裡有總音效開關、總音量、背景音樂開關與音量、場景音效開關與音量，設定會記在瀏覽器。
- 暫停時聲音淡出並暫停，繼續時從原處接著播，不會重播同一個音效。暫停中切換到有音效的幕，會在按下繼續時播放一次。
- 瀏覽器規定聲音必須由點擊啟動，所以按下播放後才會出聲。iPhone、iPad 請確認側邊靜音鍵沒有開啟。
- 角色配音（熊大、兔兔）與電影旁白可分別開關、調音量；說話時背景音樂自動降到 40%，說完再慢慢恢復，場景音效不受影響。
- 換幕時立刻停掉上一幕的台詞，同時只會有一句在念；有配音的幕會播到最後一句念完才換幕。
- 台詞音檔還沒載入時畫面顯示「配音載入中…」並暫停這一幕的時間，最多等 6 秒；載入失敗就提示並只顯示字幕，播放不會卡住。
- 目前配音只有第一章前三張照片的試播，腳本見 `docs/voice-script.md`。
- 音檔來源、授權與每章配置見 `docs/audio-credits.md`；要換成其他音檔見 `assets/audio/README.md`。

## 更新正式網站

把這個資料夾的所有變更推到 GitHub repository 的 `main` 分支即可，GitHub Pages 會在 1–3 分鐘內自動更新。
若是手動上傳，請確保 `js/audio-engine.js`、`js/voice-data.js`、`assets/audio/` 底下所有資料夾都有上傳。
瀏覽器若還顯示舊版，重新整理一次（iPhone 可關掉分頁重開）。

## 尚未完成

- 旁白、角色配音：只有第一章前三張照片的試播（5 句），其餘 84 幕尚未製作；腳本見 `docs/voice-script.md`
- 背景音樂與音效是程式合成的，風格偏簡單；之後可換成真人演奏或專業音效庫
- 結語頁的畫面：PDF 原稿沒有照片
- 章節標題橫幅的獨立畫面：原圖橫幅跨越三格，目前以文字顯示章節名稱
- 多集選單
- iPhone 上的真正全螢幕：Safari 限制，只能用劇院模式或加入主畫面
