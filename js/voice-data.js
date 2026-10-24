/*
 * 角色配音與旁白的時間表（由 tools/import_voice.py 產生，請勿手動修改）。
 * at：這一句從這一幕的第幾秒開始；dur：音檔長度（秒）。text 與原字幕一字不差。
 */
window.KUMA_VOICE = {
  "model": "Google Gemini 生成（使用者提供）",
  "speakers": {
    "brown": {
      "who": "熊大"
    },
    "cony": {
      "who": "兔兔"
    },
    "narrator": {
      "who": "旁白"
    }
  },
  "scenes": [
    {
      "chapter": "ch1",
      "scene": 2,
      "sceneId": "ep01_ch1_s03",
      "minDuration": 5.88,
      "cues": [
        {
          "id": "ep01_ch1_s03_cony_1",
          "speaker": "cony",
          "who": "兔兔",
          "line": 0,
          "text": "熊大，我今天有一個很簡單的要求。",
          "src": "assets/audio/voice/ep01_ch1_s03_cony_1.mp3",
          "at": 0.8,
          "dur": 3.58,
          "source": "Google Gemini 生成（使用者提供，兔兔第一句重錄）"
        }
      ]
    },
    {
      "chapter": "ch1",
      "scene": 3,
      "sceneId": "ep01_ch1_s04",
      "minDuration": 6.65,
      "cues": [
        {
          "id": "ep01_ch1_s04_cony_1",
          "speaker": "cony",
          "who": "兔兔",
          "line": 0,
          "text": "我要所有鹿看到我都要鞠躬！",
          "src": "assets/audio/voice/ep01_ch1_s04_cony_1.mp3",
          "at": 0.9,
          "dur": 2.16
        },
        {
          "id": "ep01_ch1_s04_brown_2",
          "speaker": "brown",
          "who": "熊大",
          "line": 1,
          "text": "收到，立即執行。",
          "src": "assets/audio/voice/ep01_ch1_s04_brown_2.mp3",
          "at": 3.76,
          "dur": 1.38
        }
      ]
    },
    {
      "chapter": "ch1",
      "scene": 4,
      "sceneId": "ep01_ch1_s05",
      "minDuration": 6.1,
      "cues": [
        {
          "id": "ep01_ch1_s05_brown_1",
          "speaker": "brown",
          "who": "熊大",
          "line": 0,
          "text": "鹿一號，請完成九十度鞠躬。",
          "src": "assets/audio/voice/ep01_ch1_s05_brown_1.mp3",
          "at": 0.9,
          "dur": 2.2
        },
        {
          "id": "ep01_ch1_s05_narrator_2",
          "speaker": "narrator",
          "who": "旁白",
          "line": 1,
          "text": "鞠躬 90 度！",
          "src": "assets/audio/narration/ep01_ch1_s05_narrator_2.mp3",
          "at": 3.6,
          "dur": 1.0,
          "source": "Google Gemini 生成（使用者提供，旁白重錄）"
        }
      ]
    }
  ]
};
