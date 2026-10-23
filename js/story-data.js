/*
 * 《兔兔與熊大的日本荒謬旅行》劇情資料
 *
 * 唯一來源：使用者提供的 PDF（4 份，共 11 頁）。
 *  - narration：PDF 頁面上的劇情文字，逐字照抄。
 *  - lines：照片對話框與字卡上的原有文字，逐字轉錄，方便在小螢幕閱讀。
 *  - image：只使用從 PDF 擷取並切割的原始照片；PDF 沒有照片的頁面為 null。
 *  - audio：預留旁白、角色配音、音效的檔案路徑。目前沒有任何音檔，全部為 null。
 *
 * 新增集數：在 KUMA_LIBRARY.episodes 加入一個與 episode 相同結構的物件即可，播放器不需修改。
 */
(function () {
  "use strict";

  var IMG = "assets/images/";
  var SCENE = IMG + "scenes/";

  // 每一幕預留的音訊欄位：填入 assets/audio/ 底下實際存在的檔案路徑後，播放器才會播放。
  function noAudio() {
    return { narration: null, voice: null, sfx: null };
  }

  function bear(text) { return { who: "熊大", text: text }; }
  function rabbit(text) { return { who: "兔兔", text: text }; }
  function card(text) { return { who: "字卡", text: text }; }
  function sign(text) { return { who: "畫面文字", text: text }; }

  // 六格組合圖切出來的單幕：set 為組合圖名稱，n 為 1–6（第一列左至右 1–3，第二列 4–6）。
  function panel(set, n, lines) {
    return {
      type: "panel",
      image: SCENE + set + "-" + n + ".jpg",
      imageLabel: "原始照片 第 " + n + " 幕",
      panelNo: n,
      lines: lines,
      audio: noAudio()
    };
  }

  // 使用者另外提供、不在 PDF 內的照片：依使用者指示放進序章，並在畫面上標明來源。
  function supplement(set, tag, n, lines) {
    var p = panel(set, n, lines);
    p.imageLabel = "補充照片 " + tag + " 第 " + n + " 幕（PDF 外）";
    p.supplemental = true;
    return p;
  }

  function title(bg) {
    return { type: "title", backdrop: bg, audio: noAudio() };
  }

  function story(paragraphs, bg) {
    return { type: "story", backdrop: bg, narration: paragraphs, audio: noAudio() };
  }

  function quote(line, bg) {
    return { type: "quote", backdrop: bg, lines: [line], audio: noAudio() };
  }

  var episode = {
    id: "japan-trip",
    title: "兔兔與熊大的日本荒謬旅行",
    subtitle: "一個月旅行與番外篇",
    tagline: "兔兔下指令，熊大照字面執行。",
    blurb: "一本關於霸王兔、執行熊，以及永遠不會準時結束的旅行繪本",
    appearanceNote: "角色外觀依照使用者提供的兔兔與熊大參考照片保持一致",
    poster: IMG + "characters-rabbit-and-bear.jpg",
    endCredit: "完｜兔兔與熊大的日本荒謬旅行故事集",
    // 背景音樂：目前沒有音檔。放入檔案後填寫路徑，例如 "assets/audio/bgm/theme.mp3"。
    bgm: null,

    chapters: [
      {
        id: "opening",
        label: "開場",
        title: "角色介紹",
        subtitle: "本書的兩位旅行主角",
        pdfPages: "第 1–2 頁",
        scenes: [
          {
            type: "photo",
            image: IMG + "characters-rabbit-and-bear.jpg",
            imageLabel: "原始照片 角色介紹",
            heading: "熊大｜AI agent 執行熊",
            narration: [
              "熊大只會忠實執行指令：訂票、導航、搬行李、翻譯、拍照、做表格，還有把比喻誤解成施工計畫。標準回覆只有一句：「收到，立即執行。」"
            ],
            audio: noAudio()
          },
          {
            type: "photo",
            image: IMG + "characters-rabbit-and-bear.jpg",
            imageLabel: "原始照片 角色介紹",
            heading: "本書使用說明",
            narration: [
              "「兔兔說「低調」，熊大就鋪紅地毯；兔兔說「帶回回憶」，熊大就差點把日本搬回家。」"
            ],
            audio: noAudio()
          },
          {
            type: "photo",
            image: IMG + "characters-rabbit-and-bear.jpg",
            imageLabel: "原始照片 角色介紹",
            heading: "兔兔｜旅行主人",
            narration: [
              "兔兔是本次日本一個月旅行的唯一決策者。她負責提出華麗、任性、常常不可能完成的要求，並且在熊大完成後，再嫌棄熊大做得太死板。"
            ],
            audio: noAudio()
          },
          {
            type: "photo",
            image: IMG + "characters-rabbit-and-bear.jpg",
            imageLabel: "原始照片 角色介紹",
            heading: "閱讀規則",
            narration: [
              "兔兔的每一個命令都很有氣勢，熊大的每一次執行都很認真。當兩者相遇，普通旅行就會升級成日本大型荒謬工程。"
            ],
            audio: noAudio()
          }
        ]
      },

      {
        id: "prologue",
        label: "序章",
        title: "一個月日本旅行的起點",
        subtitle: "兔兔只想旅行，熊大卻接下了整個專案",
        pdfPages: "第 3 頁",
        imageNote: "PDF 序章頁使用與第一章相同的奈良公園組合圖；另依使用者指示加入兩組 PDF 以外的出發篇照片（補充照片 A、B）",
        scenes: [
          title(SCENE + "prologue-departure-a-1.jpg"),
          story([
            "兔兔想去日本一個月，卻不會開車、不想自己訂機票，也不想研究交通。於是她把所有事情交給熊大，並且宣布：",
            "「我要一趟完全不用操心的旅行。」"
          ], SCENE + "prologue-departure-a-1.jpg"),
          // 補充照片 A（IMG_4435）
          supplement("prologue-departure-a", "A", 1, [rabbit("熊大！我要去日本玩一個月！"), sign("美食、溫泉、賞櫻……還有更多！")]),
          supplement("prologue-departure-a", "A", 2, [rabbit("我不會開車！"), sign("TOYOTA 租車")]),
          supplement("prologue-departure-a", "A", 3, [rabbit("機票、住宿、行程，全部交給你！"), sign("搜尋中…　比價中…　規劃行程…　預訂中…　整合中…")]),
          supplement("prologue-departure-a", "A", 4, [card("熊大：收到指令，立即執行。"), sign("機票・住宿・租車・交通・地圖・行程規劃　完成"), sign("交給專業的最輕鬆！")]),
          supplement("prologue-departure-a", "A", 5, [rabbit("這才叫旅行！"), sign("日本旅行行程　全部完成：東京、富士山、京都、奈良、大阪")]),
          supplement("prologue-departure-a", "A", 6, [card("一個月後…"), rabbit("下一站：全世界！"), bear("收到，立即執行。"), sign("新目標：全世界")]),
          // 補充照片 B（IMG_4436）
          supplement("prologue-departure-b", "B", 1, [rabbit("熊大！我要去日本玩一個月！"), sign("女王出發♥")]),
          supplement("prologue-departure-b", "B", 2, [rabbit("我不會開車！"), sign("TOYOTA レンタカー")]),
          supplement("prologue-departure-b", "B", 3, [rabbit("機票、住宿、行程，全部交給你！"), sign("日本一個月計劃：機票、住宿、交通、景點、美食")]),
          supplement("prologue-departure-b", "B", 4, [bear("收到指令，立即執行。"), sign("機票預訂・飯店住宿・新幹線車票・租車預約")]),
          supplement("prologue-departure-b", "B", 5, [rabbit("這才叫旅行！"), sign("行程完成")]),
          supplement("prologue-departure-b", "B", 6, [card("1個月後"), rabbit("下一站：全世界！"), sign("所有任務全部完成　收到，立即執行。")]),
          story([
            "熊大把這句話轉換成一份完整的執行規格：交通要準時、住宿要舒適、景點要拍照、每個臨時要求都要立即完成。",
            "從那一刻起，這趟旅行便不再只是旅行，而是一場由兔兔下令、熊大自動執行的跨日本大型專案。"
          ], SCENE + "nara-park-deer-bow-2.jpg"),
          {
            type: "quote",
            backdrop: SCENE + "nara-park-deer-bow-2.jpg",
            heading: "旅行開始",
            lines: [
              bear("已建立日本一個月旅行專案。"),
              rabbit("很好，第一個要求是所有鹿看到我都要鞠躬。")
            ],
            audio: noAudio()
          }
        ]
      },

      {
        id: "ch1",
        label: "第一章",
        day: "Day 11",
        title: "Day 11 奈良",
        subtitle: "鹿只能向我鞠躬",
        pdfPages: "第 4 頁",
        scenes: [
          title(SCENE + "nara-park-deer-bow-1.jpg"),
          story([
            "奈良公園的鹿原本只是低頭找仙貝，兔兔卻認定那是對她的敬意。熊大立即建立「鹿群禮儀管理流程」，要求鹿一號九十度鞠躬、停留兩秒，還準備替鹿王安排面試。",
            "兔兔想拍一張貴賓照，熊大卻開始清場、分配仙貝權限，甚至把「我只是要拍照」理解成「成立鹿群公司」。"
          ], SCENE + "nara-park-deer-bow-1.jpg"),
          panel("nara-park-deer-bow", 1, [rabbit("熊大，我今天有一個很簡單的要求。")]),
          panel("nara-park-deer-bow", 2, [rabbit("我要所有鹿看到我都要鞠躬！"), bear("收到，立即執行。")]),
          panel("nara-park-deer-bow", 3, [bear("鹿一號，請完成九十度鞠躬。"), sign("鞠躬 90 度！")]),
          panel("nara-park-deer-bow", 4, [rabbit("牠果然被我的氣勢折服了！"), bear("更正：牠在找仙貝碎屑。"), sign("尋找仙貝…")]),
          panel("nara-park-deer-bow", 5, [rabbit("我只是要拍照，不是要成立鹿群公司！"), sign("鹿員工面試表：會鞠躬嗎？不偷吃仙貝？服從指令？")]),
          panel("nara-park-deer-bow", 6, [rabbit("熊大，你連仙貝都要管，我到底是不是主人？"), bear("您是主人，但仙貝由我代管。"), card("新增任務：被兔兔嫌棄。")]),
          quote(rabbit("你真的很欠嫌棄。"), SCENE + "nara-park-deer-bow-6.jpg")
        ]
      },

      {
        id: "ch2",
        label: "第二章",
        title: "Day 13 大阪城",
        subtitle: "我要統治關西",
        pdfPages: "第 5 頁",
        scenes: [
          title(SCENE + "day13-osaka-castle-2.jpg"),
          story([
            "兔兔站在大阪城前，宣布從今天起關西歸她管理。熊大沒有質疑，只是立刻準備擴音器、紅地毯、演說稿，以及一份正式的《大阪城新主人交接申請表》。",
            "當兔兔說「恢復熊大休息」，熊大便當場坐下；當兔兔又說「停止休息」，他便立刻起身。最後兔兔宣布熊大降職，熊大則確認：降職後仍然要訂票、導航、搬行李、拍照與付款。"
          ], SCENE + "day13-osaka-castle-2.jpg"),
          panel("day13-osaka-castle", 1, [rabbit("熊大，我決定了。"), sign("第二段：Day 13 大阪城──我要統治關西")]),
          panel("day13-osaka-castle", 2, [rabbit("從今天開始，關西歸我管理！"), bear("收到，立即執行。")]),
          panel("day13-osaka-castle", 3, [rabbit("我只是要發表演說！"), sign("大阪城新主人交接申請表：申請統治權、城堡使用權、關西地區管理權、市民通知、儀式執行、其他")]),
          panel("day13-osaka-castle", 4, [rabbit("你現在就休息？我們還沒上城欸！"), bear("收到。停止休息，執行上城。")]),
          panel("day13-osaka-castle", 5, [bear("大阪城請注意，兔兔已抵達。請準備接受統治。")]),
          panel("day13-osaka-castle", 6, [rabbit("我宣布，熊大降職！"), bear("收到。普通熊繼續執行。"), card("降職成功，工作完全不變。")]),
          quote(bear("降職有效性為零。"), SCENE + "day13-osaka-castle-6.jpg")
        ]
      },

      {
        id: "ch3",
        label: "第三章",
        title: "Day 20 京都嵐山",
        subtitle: "竹林裡必須鋪滿紅地毯",
        pdfPages: "第 6 頁",
        scenes: [
          title(SCENE + "day20-kyoto-arashiyama-3.jpg"),
          story([
            "兔兔說今天要走一個「低調」行程，接著命令熊大把嵐山竹林鋪滿紅地毯。熊大立刻展開測量、放樣、對齊、固定與防水工程，還精確調整了三毫米的偏差。",
            "當路人困惑地看著竹林裡的皇家通道，兔兔仍然優雅地走在紅地毯上，認為這就是低調。熊大則在雨中保護整條地毯，並把當日步數記錄為三萬八千步。"
          ], SCENE + "day20-kyoto-arashiyama-3.jpg"),
          panel("day20-kyoto-arashiyama", 1, [rabbit("熊大，今天我要一個低調的行程。")]),
          panel("day20-kyoto-arashiyama", 2, [rabbit("竹林裡必須鋪滿紅地毯！"), bear("收到，立即執行。")]),
          panel("day20-kyoto-arashiyama", 3, [card("紅地毯鋪設工程：全長待確認。"), sign("鋪設、測量、對齊、持續延伸")]),
          panel("day20-kyoto-arashiyama", 4, [rabbit("這裡歪了三毫米！"), bear("收到，調整三毫米。")]),
          panel("day20-kyoto-arashiyama", 5, [rabbit("這才叫低調。"), sign("兔兔專用通道")]),
          panel("day20-kyoto-arashiyama", 6, [rabbit("熊大，紅地毯不能濕！"), bear("收到。啟動紅地毯防水模式。"), card("熊大：今日步數，三萬八千步。")]),
          quote(rabbit("這才叫低調。"), SCENE + "day20-kyoto-arashiyama-5.jpg")
        ]
      },

      {
        id: "ch4",
        label: "第四章",
        title: "Day 25 東京澀谷十字路口",
        subtitle: "所有人都要停下來等我走完",
        pdfPages: "第 7 頁",
        scenes: [
          title(SCENE + "day25-shibuya-crossing-1.jpg"),
          story([
            "兔兔想拍一張最有氣勢的照片，於是命令澀谷十字路口的所有人停下來等她走完。熊大隨即設置交通錐、拿出擴音器，啟動「兔兔專用通行時間」。",
            "兔兔走得很慢、很有氣勢，熊大則拿著秒錶計算氣勢達成率。當兔兔抵達對面，她宣布下一次要走兩趟；熊大立即預約第二回合，並在報告上記下：今日阻塞行人約三千名。"
          ], SCENE + "day25-shibuya-crossing-1.jpg"),
          panel("day25-shibuya-crossing", 1, [rabbit("熊大，我要拍一張最有氣勢的照片。")]),
          panel("day25-shibuya-crossing", 2, [rabbit("所有人都要停下來等我走完！"), bear("收到，立即執行。")]),
          panel("day25-shibuya-crossing", 3, [card("行人暫停計畫，正式啟動。"), sign("兔兔專用通行時間")]),
          panel("day25-shibuya-crossing", 4, [bear("全體行人，請原地保持不動。")]),
          panel("day25-shibuya-crossing", 5, [rabbit("熊大，我走得夠有氣勢嗎？"), bear("目前氣勢達成率百分之八十七。")]),
          panel("day25-shibuya-crossing", 6, [rabbit("很好，下一次我要走兩趟！"), bear("收到。已預約澀谷十字路口第二回合。"), card("熊大：今日阻塞行人約三千名。")]),
          quote(rabbit("我走得夠有氣勢嗎？"), SCENE + "day25-shibuya-crossing-5.jpg")
        ]
      },

      {
        id: "ch5",
        label: "第五章",
        title: "Day 29 東京",
        subtitle: "一天環遊日本",
        pdfPages: "第 8 頁",
        imageNote: "PDF 封面使用與本章相同的組合圖",
        scenes: [
          title(SCENE + "day29-tokyo-one-day-japan-3.jpg"),
          story([
            "旅行最後一天，兔兔想把整個月的行程再玩一次。熊大於是安排東京早餐、京都參拜、奈良鞠躬、大阪章魚燒、神戶牛肉與北海道看雪，全部塞進同一天。",
            "兔兔終於受不了，要求悠閒、浪漫、慢慢逛。熊大把行程刪到只剩「東京車站發呆一分鐘」，還替飯糰建立品鑑表。",
            "兔兔好不容易要求熊大停止分析，熊大卻偷偷建立了下一趟環遊世界資料夾。"
          ], SCENE + "day29-tokyo-one-day-japan-3.jpg"),
          panel("day29-tokyo-one-day-japan", 1, [rabbit("今天我要把整個月的行程再玩一次！"), bear("收到，立即執行。"), sign("日本全行程（完整版）")]),
          panel("day29-tokyo-one-day-japan", 2, [card("一日環遊日本：極限版。"), rabbit("哇～好厲害！真的全部都排進一天耶！"), bear("已最佳化路線、交通、時間，保證完成。")]),
          panel("day29-tokyo-one-day-japan", 3, [bear("東京早餐、京都參拜、奈良鞠躬、大阪章魚燒、北海道看雪。"), sign("JAPAN 1 DAY TRIP　06:00 東京・08:00 京都・10:00 奈良・12:00 大阪・14:00 神戶・16:00 北海道")]),
          panel("day29-tokyo-one-day-japan", 4, [rabbit("我要悠閒、浪漫、慢慢逛！"), bear("收到。悠閒模式啟動。"), sign("本日行程：東京車站發呆 1 分鐘　完美。")]),
          panel("day29-tokyo-one-day-japan", 5, [rabbit("不准做表格、不准報時間、不准分析。"), sign("慢慢吃飯糰：進度 11 秒")]),
          panel("day29-tokyo-one-day-japan", 6, [rabbit("熊大！我看到了喔！"), bear("收到。資料夾改名。"), sign("絕對不是下一趟環遊世界旅行"), card("下一個指令：明天出發。")]),
          quote(rabbit("不准做表格、不准報時間、不准分析。"), SCENE + "day29-tokyo-one-day-japan-5.jpg")
        ]
      },

      {
        id: "ch6",
        label: "第六章",
        title: "Day 30 東京晴空塔",
        subtitle: "我要把晴空塔當成我的個人登機箱",
        pdfPages: "第 9 頁",
        scenes: [
          title(SCENE + "day30-tokyo-skytree-1.jpg"),
          story([
            "回國前，兔兔突然想到一個「很棒的主意」：把晴空塔當成自己的個人登機箱。熊大先量尺寸，再對照航空公司規格，最後得出結論：嚴重超標三千八百倍。",
            "他仍然沒有放棄，而是替晴空塔設計了巨型透明登機箱外殼與兔兔專用行李牌。雖然登機失敗，兔兔卻很滿意，因為她確定自己的登機箱絕對不會被弄丟。"
          ], SCENE + "day30-tokyo-skytree-1.jpg"),
          panel("day30-tokyo-skytree", 1, [rabbit("熊大，我想到一個很棒的主意。")]),
          panel("day30-tokyo-skytree", 2, [rabbit("我要把晴空塔當成我的個人登機箱！"), bear("收到，立即執行。")]),
          panel("day30-tokyo-skytree", 3, [card("登機箱尺寸檢查：嚴重超標。"), sign("登機箱尺寸（國際標準）55 cm・40 cm・23 cm")]),
          panel("day30-tokyo-skytree", 4, [bear("已完成登機箱外殼。"), sign("兔兔專用")]),
          panel("day30-tokyo-skytree", 5, [rabbit("它只是稍微大一點！"), bear("重量超過標準三千八百倍。")]),
          panel("day30-tokyo-skytree", 6, [rabbit("很好，至少我的登機箱不會被弄丟！"), card("熊大：登機失敗，觀光成功。")]),
          quote(bear("收到。登機失敗，觀光成功。"), SCENE + "day30-tokyo-skytree-6.jpg")
        ]
      },

      {
        id: "extra",
        label: "番外篇",
        title: "回國後的最終任務",
        subtitle: "將整個日本搬回兔兔家",
        pdfPages: "第 10 頁",
        scenes: [
          title(SCENE + "extra-move-japan-home-2.jpg"),
          story([
            "旅行結束回到家，兔兔只想把照片、紀念品和回憶帶回來。熊大卻自主啟動了「將整個日本搬回兔兔家」任務：把富士山、鳥居、晴空塔、奈良鹿、澀谷十字路口與大阪城通通做成迷你模型，分批裝箱運回家。",
            "不久後，兔兔家變成室內日本主題樂園：客廳有富士山，廚房有拉麵攤，沙發旁有小火車，門口還有鹿。兔兔雖然嫌棄熊大不懂比喻，卻也承認這樣就不用再買機票。"
          ], SCENE + "extra-move-japan-home-2.jpg"),
          panel("extra-move-japan-home", 1, [bear("自主任務啟動。"), sign("新任務　最終任務：將整個日本搬回兔兔家")]),
          panel("extra-move-japan-home", 2, [bear("日本搬運清單，第一批完成。"), sign("日本（第一批）")]),
          panel("extra-move-japan-home", 3, [rabbit("熊大，你在做什麼？"), bear("執行最終任務。"), sign("兔兔專用日本區")]),
          panel("extra-move-japan-home", 4, [rabbit("我說的是把回憶帶回來，不是把日本搬回來！")]),
          panel("extra-move-japan-home", 5, [bear("日本已完整搬入，完成率百分之百。"), rabbit("你真的完全不懂比喻！"), sign("兔兔の日本樂園")]),
          panel("extra-move-japan-home", 6, [rabbit("算了……至少不用再買機票。"), bear("收到。下一個自主任務：把全世界搬進來。"), card("兔兔：熊大，停止自主！")]),
          quote(rabbit("我說的是把回憶帶回來，不是把日本搬回來！"), SCENE + "extra-move-japan-home-4.jpg")
        ]
      },

      {
        id: "epilogue",
        label: "結語",
        title: "旅行還沒有結束",
        subtitle: "因為熊大已經建立下一個資料夾",
        pdfPages: "第 11 頁",
        imageNote: "PDF 結語頁沒有照片，尚未配置圖片",
        scenes: [
          title(null),
          {
            type: "story",
            backdrop: null,
            heading: "兔兔的旅行總結",
            narration: ["「這趟旅行最棒的地方，就是我完全不用自己開車、訂票、找路、搬行李，還能每天臨時改行程。」"],
            audio: noAudio()
          },
          {
            type: "story",
            backdrop: null,
            heading: "熊大的系統總結",
            narration: ["「任務完成：交通 47 次、住宿 8 間、餐廳 63 間、照片 2,846 張、行程重排 119 次、兔兔走失 0 次、熊大休息 0 次。」"],
            audio: noAudio()
          },
          {
            type: "quote",
            backdrop: null,
            heading: "最後一個指令",
            lines: [rabbit("熊大，幫我安排一趟環遊世界，而且要明天出發。"), bear("收到，立即執行。")],
            audio: noAudio()
          }
        ]
      }
    ],

    // 後續擴充項目：目前沒有做、也沒有假裝做好的東西。
    roadmap: [
      "旁白錄音、兔兔與熊大的角色配音（目前沒有音檔）",
      "背景音樂與音效（目前沒有音檔）",
      "結語頁的電影畫面（PDF 原稿沒有照片）",
      "各章節標題橫幅的獨立版本（原圖橫幅跨越三格，目前以文字顯示章節名稱）"
    ]
  };

  window.KUMA_LIBRARY = {
    brand: "KUMA Universe 線上電影劇場",
    episodes: [episode]
  };
})();
