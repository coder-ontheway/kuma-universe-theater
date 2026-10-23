# KUMA Universe 線上電影劇場

《兔兔與熊大的日本荒謬旅行》照片式電影播放網站。純前端（HTML／CSS／JavaScript），不需要後端、資料庫或 API 金鑰。

這不是影片：畫面是 PDF 裡的原始照片，以劇情字幕、淡入淡出轉場與時間軸模擬電影播放。

## 檔案結構

```
index.html                 首頁與播放器
css/style.css              版面與樣式
js/story-data.js           劇情資料（章節、每一幕的照片、旁白、台詞、預留音訊欄位）
js/app.js                  播放器程式（不含任何劇情內容）
assets/images/
  characters-rabbit-and-bear.jpg   角色介紹照片（PDF 第 2 頁）
  scenes/                  六格組合圖切出的單幕圖片（54 張）
  thumbs/                  章節卡片用縮圖
  composites/              切割前的完整組合圖（僅供核對，播放時不顯示）
  icon.png                 網站圖示
assets/audio/              旁白、配音、配樂、音效的預留資料夾（目前沒有音檔）
docs/pdf-inventory.md      PDF 逐頁檢查結果與照片對應表
tools/crop_panels.py       組合圖切割腳本（記錄每張圖的格線座標）
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

## 加入聲音

目前沒有任何音檔，網站上也標示為「尚未製作」。要加入時：

1. 把音檔放進 `assets/audio/` 對應資料夾（見該資料夾的 README）。
2. 在 `js/story-data.js` 填入路徑：全片配樂填 `bgm`，每一幕填 `audio.narration`、`audio.voice` 或 `audio.sfx`。
3. 觀眾在播放設定按「點擊啟用聲音」後才會播放（瀏覽器規定）。

## 尚未完成

- 旁白、角色配音、背景音樂、音效：介面已預留，沒有音檔
- 結語頁的畫面：PDF 原稿沒有照片
- 章節標題橫幅的獨立畫面：原圖橫幅跨越三格，目前以文字顯示章節名稱
- 多集選單
- iPhone 上的真正全螢幕：Safari 限制，只能用劇院模式或加入主畫面
