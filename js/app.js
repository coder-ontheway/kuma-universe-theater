/*
 * KUMA Universe 線上電影劇場：照片式電影播放器
 * 劇情資料來自 js/story-data.js（window.KUMA_LIBRARY），這裡只負責播放。
 * 所有路徑都是相對路徑，可在 GitHub Pages 的子路徑下執行。
 */
(function () {
  "use strict";

  var library = window.KUMA_LIBRARY;
  if (!library || !library.episodes || !library.episodes.length) {
    document.body.innerHTML = '<p style="padding:24px">找不到劇情資料（js/story-data.js）。</p>';
    return;
  }
  var film = library.episodes[0];
  // 角色配音與旁白的時間表（js/voice-data.js，由 tools/make_voice.py 產生）；沒有這個檔案時照常播放
  var voiceData = window.KUMA_VOICE || { scenes: [] };
  var voiceByScene = {};
  voiceData.scenes.forEach(function (v) { voiceByScene[v.chapter + ":" + v.scene] = v; });

  var STORE_KEY = "kuma-theater:" + film.id + ":v1";
  var DEFAULTS = { base: 6, autoAdvance: true, text: "m" };

  // ---------- 小工具 ----------
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function fmt(sec) {
    sec = Math.max(0, Math.round(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }
  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
  }
  function save(patch) {
    try {
      var cur = load();
      for (var k in patch) cur[k] = patch[k];
      localStorage.setItem(STORE_KEY, JSON.stringify(cur));
    } catch (e) { /* 私密模式等情況下無法儲存，播放仍可正常進行 */ }
  }
  function thumbOf(src) {
    if (!src) return null;
    return src.replace("assets/images/scenes/", "assets/images/thumbs/")
              .replace("assets/images/characters-", "assets/images/thumbs/characters-");
  }
  function sceneText(s) {
    var t = (s.heading || "");
    (s.narration || []).forEach(function (p) { t += p; });
    (s.lines || []).forEach(function (l) { t += l.text; });
    return t;
  }

  // ---------- 設定 ----------
  var stored = load();
  var settings = {
    base: stored.base || DEFAULTS.base,
    autoAdvance: stored.autoAdvance !== false,
    text: stored.text || DEFAULTS.text
  };

  // ---------- 時間軸 ----------
  var timeline = [];
  var chapterStart = [];
  function sceneDuration(s) {
    var chars = sceneText(s).length;
    var extra = Math.min(14, Math.max(0, (chars - 22) * 0.11));
    if (s.type === "title") return Math.max(3.5, settings.base * 0.75);
    return settings.base + extra;
  }
  function buildTimeline() {
    timeline = [];
    chapterStart = [];
    var t = 0;
    film.chapters.forEach(function (ch, ci) {
      chapterStart[ci] = timeline.length;
      ch.scenes.forEach(function (s, si) {
        var d = sceneDuration(s);
        var v = voiceByScene[ch.id + ":" + si];
        // 有配音的幕至少要放到最後一句念完
        if (v) d = Math.max(d, v.minDuration);
        timeline.push({ ci: ci, si: si, scene: s, chapter: ch, start: t, dur: d, cues: v ? v.cues : null });
        t += d;
      });
    });
    return t;
  }
  var total = buildTimeline();
  function chapterDuration(ci) {
    var a = chapterStart[ci], b = ci + 1 < chapterStart.length ? chapterStart[ci + 1] : timeline.length;
    var d = 0;
    for (var i = a; i < b; i++) d += timeline[i].dur;
    return d;
  }

  // ---------- 首頁 ----------
  function renderHome() {
    document.title = library.brand;
    $("posterImg").src = film.poster;
    $("posterImg").onerror = function () {
      var f = this.parentNode;
      f.innerHTML = "";
      f.appendChild(imageError(film.poster));
    };
    $("appearanceNote").textContent = film.appearanceNote;
    var t = $("filmTitle");
    t.innerHTML = "";
    t.appendChild(document.createTextNode("兔兔與熊大的"));
    t.appendChild(document.createElement("br"));
    t.appendChild(el("span", "accent", "日本荒謬旅行"));
    t.setAttribute("aria-label", film.title);
    $("filmSubtitle").textContent = film.subtitle;
    $("filmTagline").textContent = film.tagline;
    $("filmBlurb").textContent = film.blurb;
    $("runtime").textContent = "約 " + Math.round(total / 60) + " 分鐘";
    $("chapterCount").textContent = film.chapters.length + " 段";
    $("sceneCount").textContent = timeline.length + " 幕";

    var grid = $("chapterGrid");
    grid.innerHTML = "";
    film.chapters.forEach(function (ch, ci) {
      var li = el("li");
      li.appendChild(chapterCard(ch, ci));
      grid.appendChild(li);
    });

    renderAudioStatus($("audioStatusHome"), true);
    renderResume();
  }

  function chapterCard(ch, ci) {
    var b = el("button", "chapter-card");
    b.type = "button";
    b.dataset.chapter = ci;
    var th = el("span", "chapter-thumb");
    var first = ch.scenes.filter(function (s) { return s.image; })[0];
    var src = first ? first.image : (ch.scenes[0].backdrop || null);
    if (src) {
      var img = el("img");
      img.loading = "lazy";
      img.alt = "";
      img.src = thumbOf(src);
      img.onerror = function () { th.innerHTML = '<span class="no-image">照片載入失敗</span>'; };
      th.appendChild(img);
    } else {
      th.appendChild(el("span", "no-image", "尚未配置圖片"));
    }
    var meta = el("span", "chapter-meta");
    meta.appendChild(el("span", "chapter-label", ch.label));
    meta.appendChild(el("span", "chapter-name", ch.title));
    meta.appendChild(el("span", "chapter-sub", ch.subtitle));
    meta.appendChild(el("span", "chapter-time", ch.scenes.length + " 幕・約 " + fmt(chapterDuration(ci))));
    b.appendChild(th);
    b.appendChild(meta);
    b.addEventListener("click", function () { openPlayer(chapterStart[ci], 0, true); });
    return b;
  }

  function renderResume() {
    var p = load().progress;
    var btn = $("resumeBtn"), info = $("resumeInfo");
    if (p && typeof p.index === "number" && p.index > 0 && p.index < timeline.length && !p.finished) {
      var e = timeline[p.index];
      btn.hidden = false;
      btn.querySelector("span").textContent = "繼續觀看：" + e.chapter.label;
      info.hidden = false;
      info.textContent = "上次看到「" + e.chapter.label + " " + e.chapter.title + "」第 " + (e.si + 1) + " 幕（全片 " + fmt(e.start + (p.elapsed || 0)) + " / " + fmt(total) + "）";
    } else {
      btn.hidden = true;
      info.hidden = true;
    }
  }

  // ---------- 聲音 ----------
  // 音訊設定與引擎（js/audio-engine.js）。音檔清單在 story-data.js 的 film.audio。
  var audioSettings = {
    masterOn: stored.masterOn !== false,
    volume: typeof stored.volume === "number" ? stored.volume : 0.85,
    musicOn: stored.musicOn !== false,
    musicVolume: typeof stored.musicVolume === "number" ? stored.musicVolume : 0.55,
    sfxOn: stored.sfxOn !== false,
    sfxVolume: typeof stored.sfxVolume === "number" ? stored.sfxVolume : 0.7,
    voiceOn: stored.voiceOn !== false,
    voiceVolume: typeof stored.voiceVolume === "number" ? stored.voiceVolume : 0.9,
    narrOn: stored.narrOn !== false,
    narrVolume: typeof stored.narrVolume === "number" ? stored.narrVolume : 0.9
  };
  var sound = new window.KumaAudio(film.audio, audioSettings);
  sound.registerVoices(timeline.reduce(function (a, e) {
    (e.cues || []).forEach(function (c) { a.push(c.src); });
    return a;
  }, []));

  function musicFor(entry) {
    return entry.scene.music || entry.chapter.music || null;
  }
  function sfxFor(entry) {
    return (entry.scene.audio && entry.scene.audio.sfx) || null;
  }
  function voiceSceneCount() {
    return timeline.filter(function (e) { return e.cues && e.cues.length; }).length;
  }
  function audioRows() {
    var sm = sound.summary();
    function state(c) {
      if (c.error) return { text: c.error + " 個無法播放", ok: false };
      if (c.pending === c.total) return { text: "已設定 " + c.total + " 個", ok: true };
      if (c.pending) return { text: c.ok + " / " + c.total + " 個已載入", ok: true };
      return { text: c.ok + " / " + c.total + " 個可播放", ok: true };
    }
    var v = voiceSceneCount();
    var vs = state(sm.voice);
    return [
      { name: "背景音樂", s: state(sm.music) },
      { name: "場景音效", s: state(sm.sfx) },
      { name: "旁白與角色配音", s: sm.voice.total
        ? { text: "試播 " + v + " 幕，" + vs.text + "（其餘 " + (timeline.length - v) + " 幕尚未製作）", ok: vs.ok }
        : { text: "尚未製作，沒有音檔", ok: false } }
    ];
  }
  function renderAudioStatus(ul, plain) {
    if (!ul) return;
    ul.innerHTML = "";
    audioRows().forEach(function (r) {
      var li = el("li");
      if (plain) {
        li.textContent = r.name + "：" + r.s.text;
        if (!r.s.ok) li.className = "missing";
      } else {
        li.appendChild(el("span", null, r.name));
        li.appendChild(el("span", "state" + (r.s.ok ? " ok" : ""), r.s.text));
      }
      ul.appendChild(li);
    });
  }
  function renderNowMusic() {
    var n = $("nowMusic");
    if (!n) return;
    var t = sound.currentMusicTitle();
    n.textContent = !sound.unlocked() ? "按下播放後才會開始播放聲音"
      : !audioSettings.masterOn ? "聲音已關閉"
      : t ? "背景音樂：" + t : "目前沒有背景音樂";
    var mute = $("muteBtn");
    if (mute) {
      mute.classList.toggle("is-muted", !audioSettings.masterOn);
      mute.setAttribute("aria-label", audioSettings.masterOn ? "關閉聲音" : "開啟聲音");
      mute.setAttribute("aria-pressed", audioSettings.masterOn ? "false" : "true");
    }
  }
  sound.onChange(function () {
    renderAudioStatus($("audioStatus"), false);
    renderAudioStatus($("audioStatusHome"), true);
    renderNowMusic();
  });
  function saveAudio() {
    save({
      masterOn: audioSettings.masterOn, volume: audioSettings.volume,
      musicOn: audioSettings.musicOn, musicVolume: audioSettings.musicVolume,
      sfxOn: audioSettings.sfxOn, sfxVolume: audioSettings.sfxVolume,
      voiceOn: audioSettings.voiceOn, voiceVolume: audioSettings.voiceVolume,
      narrOn: audioSettings.narrOn, narrVolume: audioSettings.narrVolume
    });
    sound.applySettings();
    renderNowMusic();
  }

  // ---------- 播放器 ----------
  var playerEl = $("player");
  var layers = [$("layerA"), $("layerB")];
  var front = 0;
  var player = {
    index: 0,
    elapsed: 0,
    playing: false,
    waiting: false,   // 照片載入中時不推進時間
    lastTick: 0,
    timer: null,
    token: 0
  };

  function openPlayer(index, elapsed, autoplay) {
    $("home").hidden = true;
    playerEl.hidden = false;
    document.body.classList.add("player-open");
    playerEl.dataset.text = settings.text;
    $("endScreen").hidden = true;
    renderChapterList();
    goTo(index, elapsed || 0, true);
    if (autoplay) play(); else pause();
    try { history.replaceState(null, "", "#play"); } catch (e) {}
    $("stage").focus({ preventScroll: true });
  }

  function closePlayer() {
    pause();
    sound.stopAll();
    persist();
    exitFullscreen();
    playerEl.hidden = true;
    $("home").hidden = false;
    document.body.classList.remove("player-open");
    renderResume();
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
  }

  function goTo(index, elapsed, instant) {
    index = Math.max(0, Math.min(timeline.length - 1, index));
    player.index = index;
    player.elapsed = elapsed || 0;
    var entry = timeline[index];
    renderScene(entry, instant);
    preload(index + 1);
    updateChrome();
    player.voiceWait = 0;
    setVoiceHint(null);
    sound.enterScene(musicFor(entry), sfxFor(entry), player.elapsed, entry.cues);
    if (index + 1 < timeline.length) {
      var nx = timeline[index + 1];
      sound.preload(musicFor(nx), sfxFor(nx), nx.cues);
    }
    persist();
  }

  function preload(i) {
    if (i >= timeline.length) return;
    var s = timeline[i].scene;
    var src = s.image || s.backdrop;
    if (src) { var im = new Image(); im.src = src; }
  }

  function renderScene(entry, instant) {
    var s = entry.scene, ch = entry.chapter;
    var token = ++player.token;
    var next = layers[1 - front], cur = layers[front];
    next.innerHTML = "";
    next.className = "frame-layer";

    // 背景：同一幕照片的模糊放大版，只做氣氛，不取代原圖
    var bd = $("backdrop");
    var bgSrc = s.image || s.backdrop;
    if (bgSrc) {
      bd.style.backgroundImage = "url(\"" + bgSrc + "\")";
      bd.classList.add("show");
    } else {
      bd.classList.remove("show");
      bd.style.backgroundImage = "none";
    }

    var swap = function () {
      if (token !== player.token) return;
      player.waiting = false;
      next.classList.add("active");
      cur.classList.remove("active");
      front = 1 - front;
      if (instant) { next.style.transition = "none"; void next.offsetWidth; next.style.transition = ""; }
    };

    if (s.type === "panel" || s.type === "photo") {
      player.waiting = true;
      var img = el("img", "scene-photo");
      img.alt = ch.label + " " + ch.title + "：" + (s.imageLabel || "原始照片");
      img.decoding = "async";
      img.onload = swap;
      img.onerror = function () {
        next.innerHTML = "";
        next.appendChild(imageError(s.image));
        swap();
      };
      next.appendChild(img);
      if (s.imageLabel) next.appendChild(el("span", "photo-tag", s.imageLabel));
      img.src = s.image;
    } else {
      next.appendChild(buildCard(s, ch));
      swap();
    }

    // 字卡型的幕（章名、旁白、台詞）文字已在銀幕上，收起字幕面板讓字卡置中
    $("stage").classList.toggle("card-mode", s.type === "title" || s.type === "story" || s.type === "quote");
    renderSubtitles(s, ch, entry);
  }

  function imageError(src) {
    var box = el("div", "image-error");
    box.appendChild(el("strong", null, "照片載入失敗"));
    box.appendChild(el("span", null, "這一幕的原始照片沒有成功載入。請確認檔案存在、檔名大小寫正確，並重新整理頁面。"));
    var c = el("code", null, src);
    box.appendChild(el("br"));
    box.appendChild(c);
    return box;
  }

  function buildCard(s, ch) {
    var noImage = !s.backdrop;
    var wrap;
    if (s.type === "title") {
      wrap = el("div", "title-card");
      wrap.appendChild(el("span", "tc-label", ch.label));
      wrap.appendChild(el("h2", "tc-title", ch.title));
      wrap.appendChild(el("p", "tc-sub", ch.subtitle));
    } else if (s.type === "story") {
      wrap = el("div", "story-card");
      if (s.heading) wrap.appendChild(el("h3", "sc-heading", s.heading));
      (s.narration || []).forEach(function (p) { wrap.appendChild(el("p", null, p)); });
    } else {
      wrap = el("div", "quote-card");
      if (s.heading) wrap.appendChild(el("h3", "qc-heading", s.heading));
      s.lines.forEach(function (l) {
        var p = el("p", "qc-line");
        var w = el("span", "qc-who", l.who);
        w.style.color = l.who === "兔兔" ? "var(--blush)" : l.who === "熊大" ? "var(--honey)" : "var(--crown)";
        p.appendChild(w);
        p.appendChild(document.createTextNode("「" + l.text + "」"));
        wrap.appendChild(p);
      });
    }
    if (noImage) {
      var badge = el("span", "no-image-badge", "尚未配置圖片｜PDF 此頁沒有照片");
      wrap.appendChild(el("br"));
      wrap.appendChild(badge);
    }
    return wrap;
  }

  function renderSubtitles(s, ch, entry) {
    var panel = $("subtitlePanel");
    panel.classList.add("fading");
    setTimeout(function () {
      panel.innerHTML = "";
      if (s.type === "title") {
        panel.appendChild(el("p", "sub-meta", ch.label + "・" + (ch.pdfPages || "")));
        if (ch.imageNote) panel.appendChild(el("p", "hint", ch.imageNote));
      } else if (s.type === "story") {
        panel.appendChild(el("p", "sub-meta", "旁白・" + ch.label + " " + ch.title));
      } else if (s.type === "photo") {
        panel.appendChild(el("p", "sub-meta", s.heading || ""));
        (s.narration || []).forEach(function (p) { panel.appendChild(line("旁白", p)); });
      } else if (s.type === "panel") {
        panel.appendChild(el("p", "sub-meta", s.supplemental
          ? ch.label + "・" + s.imageLabel
          : ch.label + "・第 " + s.panelNo + " / 6 幕・照片台詞"));
        s.lines.forEach(function (l, i) {
          var d = line(l.who, l.text);
          d.setAttribute("data-line", i);
          panel.appendChild(d);
        });
      } else if (s.type === "quote") {
        panel.appendChild(el("p", "sub-meta", (s.heading || "本章台詞") + "・" + ch.label));
      }
      panel.classList.remove("fading");
      panel.scrollTop = 0;
    }, 180);
  }

  function line(who, text) {
    var d = el("div", "line" + (who === "畫面文字" ? " minor" : ""));
    d.appendChild(el("span", "who who-" + who, who));
    d.appendChild(el("span", "say", text));
    return d;
  }

  function updateChrome() {
    var e = timeline[player.index];
    $("npChapter").textContent = e.chapter.label;
    $("npTitle").textContent = e.chapter.title;
    $("sceneCounter").textContent = e.chapter.label + " " + (e.si + 1) + "/" + e.chapter.scenes.length + "・全片 " + (player.index + 1) + "/" + timeline.length;
    $("timeTotal").textContent = fmt(total);
    updateProgress();
    var cards = document.querySelectorAll("#chapterList .chapter-card");
    for (var i = 0; i < cards.length; i++) cards[i].classList.toggle("is-current", +cards[i].dataset.chapter === e.ci);
    $("prevBtn").disabled = player.index === 0;
  }

  function updateProgress() {
    var e = timeline[player.index];
    var t = e.start + Math.min(player.elapsed, e.dur);
    var pct = total ? (t / total) * 100 : 0;
    $("timelineFill").style.width = pct + "%";
    $("timelineKnob").style.left = pct + "%";
    $("timeNow").textContent = fmt(t);
    var tl = $("timeline");
    tl.setAttribute("aria-valuenow", Math.round(pct));
    tl.setAttribute("aria-valuetext", fmt(t) + " / " + fmt(total));
  }

  function renderMarks() {
    var box = $("timelineMarks");
    box.innerHTML = "";
    chapterStart.forEach(function (idx, ci) {
      if (ci === 0) return;
      var i = el("i");
      i.style.left = (timeline[idx].start / total) * 100 + "%";
      i.title = film.chapters[ci].label;
      box.appendChild(i);
    });
  }

  // ---------- 角色配音與旁白 ----------
  var VOICE_WAIT_MAX = 6; // 台詞音檔最多等 6 秒，載入不了就只顯示字幕，不讓播放器卡住
  // 回傳 false 代表這一刻要等台詞音檔載入，這一幕的時間先不往前走
  function voiceStep(dt) {
    var r = sound.updateVoice(player.elapsed);
    markSpeaking(r.speaking);
    if (r.failed) toast("「" + r.failed.text + "」的配音無法播放，這句先只顯示字幕。");
    if (!r.waiting) {
      player.voiceWait = 0;
      setVoiceHint(null);
      return true;
    }
    player.voiceWait += dt;
    setVoiceHint("配音載入中…");
    if (player.voiceWait > VOICE_WAIT_MAX) {
      sound.skipCue(r.waiting);
      player.voiceWait = 0;
      setVoiceHint(null);
      toast("配音載入太久，這句先只顯示字幕。");
      return true;
    }
    return false;
  }
  function setVoiceHint(text) {
    var h = $("voiceHint");
    if (!h) return;
    h.hidden = !text;
    if (text) h.textContent = text;
  }
  // 正在念的那一句字幕加上標記
  function markSpeaking(cue) {
    var lines = $("subtitlePanel").querySelectorAll(".line");
    for (var i = 0; i < lines.length; i++) {
      lines[i].classList.toggle("speaking", !!cue && lines[i].getAttribute("data-line") === String(cue.line));
    }
  }

  function tick() {
    var now = performance.now();
    var dt = (now - player.lastTick) / 1000;
    player.lastTick = now;
    if (!player.playing || player.waiting) return;
    var e = timeline[player.index];
    if (e.cues && !voiceStep(dt)) { updateProgress(); return; }
    player.elapsed += dt;
    if (player.elapsed >= e.dur) {
      if (player.index >= timeline.length - 1) {
        player.elapsed = e.dur;
        finish();
        return;
      }
      if (settings.autoAdvance) {
        goTo(player.index + 1, 0);
      } else {
        player.elapsed = e.dur;
        pause();
        toast("本幕已結束，按「下一幕」繼續。");
      }
    }
    updateProgress();
    if (now - (player.lastSave || 0) > 2000) { player.lastSave = now; persist(); }
  }

  function play() {
    $("endScreen").hidden = true;
    if (player.playing) return;
    player.playing = true;
    player.lastTick = performance.now();
    clearInterval(player.timer);
    player.timer = setInterval(tick, 100);
    playerEl.classList.add("is-playing");
    $("toggleBtn").setAttribute("aria-label", "暫停");
    // play() 都是由點擊或按鍵觸發，在這裡解鎖聲音才符合 iPhone／iPad Safari 的規定
    if (sound.unlock()) {
      if (!sound.music) sound.setMusic(musicFor(timeline[player.index]));
      sound.play();
      renderNowMusic();
    }
    requestWakeLock();
    armIdle();
  }

  function pause() {
    player.playing = false;
    clearInterval(player.timer);
    playerEl.classList.remove("is-playing", "idle");
    $("toggleBtn").setAttribute("aria-label", "播放");
    sound.pause();
    releaseWakeLock();
    persist();
  }

  function toggle() { player.playing ? pause() : play(); }

  function next() {
    if (player.index >= timeline.length - 1) { finish(); return; }
    goTo(player.index + 1, 0);
  }
  function prev() {
    // 本幕已播超過 2 秒時，先回到本幕開頭
    if (player.elapsed > 2 || player.index === 0) { goTo(player.index, 0); return; }
    goTo(player.index - 1, 0);
  }

  function finish() {
    pause();
    // 片尾畫面：換成主題曲並繼續播放音樂（不放音效）
    sound.enterScene(film.audio && film.audio.endMusic, null, 0);
    if (sound.unlocked()) { sound.play(); renderNowMusic(); }
    save({ progress: { index: 0, elapsed: 0, finished: true, at: Date.now() } });
    $("endTitle").textContent = film.endCredit;
    $("endSource").textContent = "《" + film.title + "》PDF（共 11 頁）";
    var ul = $("roadmapList");
    ul.innerHTML = "";
    film.roadmap.forEach(function (r) { ul.appendChild(el("li", null, r)); });
    $("endScreen").hidden = false;
    $("timelineFill").style.width = "100%";
    $("timelineKnob").style.left = "100%";
    $("timeNow").textContent = fmt(total);
  }

  function persist() {
    if (playerEl.hidden) return;
    save({ progress: { index: player.index, elapsed: Math.round(player.elapsed * 10) / 10, finished: false, at: Date.now() } });
  }

  function seekToTime(t) {
    t = Math.max(0, Math.min(total - 0.01, t));
    for (var i = timeline.length - 1; i >= 0; i--) {
      if (timeline[i].start <= t) {
        if (i === player.index) { player.elapsed = t - timeline[i].start; updateProgress(); }
        else goTo(i, t - timeline[i].start);
        return;
      }
    }
  }

  // ---------- 章節選單 ----------
  function renderChapterList() {
    var ol = $("chapterList");
    ol.innerHTML = "";
    film.chapters.forEach(function (ch, ci) {
      var li = el("li");
      var card = chapterCard(ch, ci);
      card.addEventListener("click", function () { closeDrawers(); }, true);
      li.appendChild(card);
      ol.appendChild(li);
    });
  }

  var lastFocus = null;
  function openDrawer(id) {
    lastFocus = document.activeElement;
    closeDrawers();
    var d = $(id);
    d.hidden = false;
    var f = d.querySelector("button, input, select");
    if (f) f.focus();
  }
  function closeDrawers() {
    var ds = document.querySelectorAll(".drawer");
    for (var i = 0; i < ds.length; i++) ds[i].hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  // ---------- 全螢幕 ----------
  function fsElement() { return document.fullscreenElement || document.webkitFullscreenElement; }
  function enterFullscreen() {
    var req = playerEl.requestFullscreen || playerEl.webkitRequestFullscreen;
    if (req) {
      try {
        var r = req.call(playerEl);
        if (r && r.catch) r.catch(function () { pseudoFullscreen(true); });
      } catch (e) { pseudoFullscreen(true); }
    } else {
      pseudoFullscreen(true);
    }
  }
  function exitFullscreen() {
    if (fsElement()) {
      var ex = document.exitFullscreen || document.webkitExitFullscreen;
      if (ex) { try { var r = ex.call(document); if (r && r.catch) r.catch(function () {}); } catch (e) {} }
    }
    pseudoFullscreen(false);
  }
  function pseudoFullscreen(on) {
    playerEl.classList.toggle("pseudo-fullscreen", on);
    playerEl.classList.toggle("is-fullscreen", on || !!fsElement());
    if (on) {
      window.scrollTo(0, 1);
      toast("這個瀏覽器不支援網頁全螢幕，已切換為劇院模式。iPhone 可用「分享 → 加入主畫面」後開啟，畫面會更完整。");
    }
  }
  function onFsChange() {
    var on = !!fsElement();
    playerEl.classList.toggle("is-fullscreen", on || playerEl.classList.contains("pseudo-fullscreen"));
    if (on && screen.orientation && screen.orientation.lock) {
      screen.orientation.lock("landscape").catch(function () {});
    }
  }
  document.addEventListener("fullscreenchange", onFsChange);
  document.addEventListener("webkitfullscreenchange", onFsChange);
  function toggleFullscreen() {
    if (fsElement() || playerEl.classList.contains("pseudo-fullscreen")) exitFullscreen();
    else enterFullscreen();
  }

  // ---------- 螢幕常亮（支援的瀏覽器才有） ----------
  var wakeLock = null;
  function requestWakeLock() {
    if (!("wakeLock" in navigator) || wakeLock) return;
    navigator.wakeLock.request("screen").then(function (l) { wakeLock = l; l.addEventListener("release", function () { wakeLock = null; }); }).catch(function () {});
  }
  function releaseWakeLock() { if (wakeLock) { wakeLock.release().catch(function () {}); wakeLock = null; } }

  // ---------- 桌機閒置隱藏控制列 ----------
  var idleTimer = null;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  function armIdle() {
    playerEl.classList.remove("idle");
    clearTimeout(idleTimer);
    if (!finePointer || !player.playing) return;
    idleTimer = setTimeout(function () {
      if (player.playing && $("chapterDrawer").hidden && $("settingsDrawer").hidden) playerEl.classList.add("idle");
    }, 3000);
  }
  playerEl.addEventListener("mousemove", armIdle);

  // ---------- 提示 ----------
  var toastTimer = null;
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 4200);
  }
  function flashHint(playing) {
    var h = $("tapHint");
    h.innerHTML = "";
    var s = el("span");
    s.innerHTML = playing
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 19h4V5H6zm8-14v14h4V5z"/></svg>';
    h.appendChild(s);
    h.hidden = false;
    clearTimeout(h._t);
    h._t = setTimeout(function () { h.hidden = true; }, 600);
  }

  // ---------- 事件 ----------
  $("playBtn").addEventListener("click", function () { openPlayer(0, 0, true); });
  $("resumeBtn").addEventListener("click", function () {
    var p = load().progress || {};
    openPlayer(p.index || 0, p.elapsed || 0, true);
  });
  $("backHomeBtn").addEventListener("click", closePlayer);
  $("toggleBtn").addEventListener("click", toggle);
  $("nextBtn").addEventListener("click", next);
  $("prevBtn").addEventListener("click", prev);
  $("fullscreenBtn").addEventListener("click", toggleFullscreen);
  $("chaptersBtn").addEventListener("click", function () { openDrawer("chapterDrawer"); });
  $("settingsBtn").addEventListener("click", function () { openDrawer("settingsDrawer"); });
  $("endChaptersBtn").addEventListener("click", function () { openDrawer("chapterDrawer"); });
  $("replayBtn").addEventListener("click", function () { $("endScreen").hidden = true; goTo(0, 0, true); play(); });
  $("endHomeBtn").addEventListener("click", closePlayer);

  Array.prototype.forEach.call(document.querySelectorAll(".drawer"), function (d) {
    d.addEventListener("click", function (ev) {
      if (ev.target === d || ev.target.closest("[data-close]")) closeDrawers();
    });
  });

  // 點銀幕：播放／暫停；左右滑動：切換幕
  var touchX = null, touchY = null, swiped = false;
  var screenEl = $("screen");
  screenEl.addEventListener("touchstart", function (e) {
    touchX = e.touches[0].clientX; touchY = e.touches[0].clientY; swiped = false;
  }, { passive: true });
  screenEl.addEventListener("touchend", function (e) {
    if (touchX == null) return;
    var dx = e.changedTouches[0].clientX - touchX, dy = e.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { swiped = true; dx < 0 ? next() : prev(); }
    touchX = null;
  });
  screenEl.addEventListener("click", function () {
    if (swiped) { swiped = false; return; }
    toggle();
    flashHint(player.playing);
  });

  // 進度條拖曳
  var tl = $("timeline");
  function seekFromPointer(ev) {
    var r = tl.getBoundingClientRect();
    var x = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
    seekToTime(x * total);
  }
  tl.addEventListener("pointerdown", function (ev) {
    tl.setPointerCapture(ev.pointerId);
    seekFromPointer(ev);
    var move = function (e) { seekFromPointer(e); };
    var up = function () { tl.removeEventListener("pointermove", move); tl.removeEventListener("pointerup", up); persist(); };
    tl.addEventListener("pointermove", move);
    tl.addEventListener("pointerup", up);
  });
  tl.addEventListener("keydown", function (e) {
    var e0 = timeline[player.index];
    if (e.key === "ArrowRight") { seekToTime(e0.start + player.elapsed + 10); e.preventDefault(); e.stopPropagation(); }
    if (e.key === "ArrowLeft") { seekToTime(e0.start + player.elapsed - 10); e.preventDefault(); e.stopPropagation(); }
  });

  document.addEventListener("keydown", function (e) {
    if (playerEl.hidden) return;
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "select") return;
    if (e.key === "Escape") {
      if (!$("chapterDrawer").hidden || !$("settingsDrawer").hidden) { closeDrawers(); return; }
      if (playerEl.classList.contains("pseudo-fullscreen")) { exitFullscreen(); return; }
      return;
    }
    if (!$("chapterDrawer").hidden || !$("settingsDrawer").hidden) return;
    if (e.key === " " || e.key === "k") { if (tag === "button") return; e.preventDefault(); toggle(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); next(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    else if (e.key === "f" || e.key === "F") { toggleFullscreen(); }
    armIdle();
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden && player.playing) { pause(); }
  });
  window.addEventListener("pagehide", persist);

  // 設定
  var range = $("durationRange");
  range.value = settings.base;
  $("durationValue").textContent = settings.base + " 秒";
  range.addEventListener("input", function () {
    var e = timeline[player.index];
    var ratio = e ? player.elapsed / e.dur : 0;
    settings.base = +range.value;
    $("durationValue").textContent = settings.base + " 秒";
    total = buildTimeline();
    player.elapsed = ratio * timeline[player.index].dur;
    renderMarks();
    updateChrome();
    $("runtime").textContent = "約 " + Math.round(total / 60) + " 分鐘";
    save({ base: settings.base });
  });
  $("autoAdvance").checked = settings.autoAdvance;
  $("autoAdvance").addEventListener("change", function () {
    settings.autoAdvance = this.checked;
    save({ autoAdvance: settings.autoAdvance });
  });
  $("textSize").value = settings.text;
  $("textSize").addEventListener("change", function () {
    settings.text = this.value;
    playerEl.dataset.text = settings.text;
    save({ text: settings.text });
  });
  // 聲音設定
  function bindToggle(id, key) {
    var c = $(id);
    c.checked = audioSettings[key];
    c.addEventListener("change", function () {
      audioSettings[key] = c.checked;
      saveAudio();
      syncAudioControls();
    });
  }
  function bindRange(id, key, outId) {
    var r = $(id);
    r.value = Math.round(audioSettings[key] * 100);
    $(outId).textContent = r.value + "%";
    r.addEventListener("input", function () {
      audioSettings[key] = r.value / 100;
      $(outId).textContent = r.value + "%";
      saveAudio();
    });
  }
  function syncAudioControls() {
    $("volumeRange").disabled = !audioSettings.masterOn;
    $("musicOn").disabled = $("sfxOn").disabled = !audioSettings.masterOn;
    $("musicVolume").disabled = !audioSettings.masterOn || !audioSettings.musicOn;
    $("sfxVolume").disabled = !audioSettings.masterOn || !audioSettings.sfxOn;
    $("voiceOn").disabled = $("narrOn").disabled = !audioSettings.masterOn;
    $("voiceVolume").disabled = !audioSettings.masterOn || !audioSettings.voiceOn;
    $("narrVolume").disabled = !audioSettings.masterOn || !audioSettings.narrOn;
  }
  bindToggle("audioMaster", "masterOn");
  bindToggle("musicOn", "musicOn");
  bindToggle("sfxOn", "sfxOn");
  bindToggle("voiceOn", "voiceOn");
  bindToggle("narrOn", "narrOn");
  bindRange("volumeRange", "volume", "volumeValue");
  bindRange("musicVolume", "musicVolume", "musicVolumeValue");
  bindRange("sfxVolume", "sfxVolume", "sfxVolumeValue");
  bindRange("voiceVolume", "voiceVolume", "voiceVolumeValue");
  bindRange("narrVolume", "narrVolume", "narrVolumeValue");
  syncAudioControls();
  $("muteBtn").addEventListener("click", function () {
    audioSettings.masterOn = !audioSettings.masterOn;
    $("audioMaster").checked = audioSettings.masterOn;
    if (audioSettings.masterOn && sound.unlock()) {
      if (player.playing) { if (!sound.music) sound.setMusic(musicFor(timeline[player.index])); sound.play(); }
    }
    saveAudio();
    syncAudioControls();
    toast(audioSettings.masterOn ? "聲音已開啟。" : "聲音已關閉。");
  });
  $("verifyAudioBtn").addEventListener("click", function () {
    var btn = this;
    btn.disabled = true;
    btn.textContent = "檢查中…";
    sound.unlock();
    sound.verifyAll().then(function (rows) {
      var bad = rows.filter(function (r) { return !r.ok; });
      btn.disabled = false;
      btn.textContent = "重新檢查音檔";
      toast(bad.length ? bad.length + " 個音檔無法播放：" + bad.map(function (r) { return r.src; }).join("、")
                       : "全部 " + rows.length + " 個音檔都已下載並成功解碼。");
    });
  });
  $("resetProgressBtn").addEventListener("click", function () {
    save({ progress: null });
    toast("已清除觀看進度。");
  });

  // ---------- 啟動 ----------
  renderHome();
  renderMarks();
  renderAudioStatus($("audioStatus"), false);
  renderNowMusic();

  // 網址 #play 直接進入播放器（不自動播放，避免瀏覽器擋自動播放）
  var hash = location.hash.replace("#", "");
  if (hash === "play") {
    var p = load().progress || {};
    openPlayer(p.finished ? 0 : (p.index || 0), p.finished ? 0 : (p.elapsed || 0), false);
  } else if (/^chapter-/.test(hash)) {
    var id = hash.slice(8);
    film.chapters.forEach(function (ch, ci) { if (ch.id === id) openPlayer(chapterStart[ci], 0, false); });
  }

  // 測試用的唯讀介面
  window.KUMA_PLAYER = {
    state: function () { return { index: player.index, elapsed: player.elapsed, playing: player.playing, total: total, scenes: timeline.length }; },
    audio: function () {
      return {
        unlocked: sound.unlocked(),
        ctxState: sound.ctx ? sound.ctx.state : null,
        music: sound.music ? sound.music.id : null,
        musicStarted: !!(sound.music && sound.music.source),
        sfxPlaying: sound.sfxNodes.map(function (n) { return n.id; }),
        lastSfx: sound.lastSfx || null,
        firedToken: sound.firedToken,
        sceneToken: sound.sceneToken,
        master: sound.master ? sound.master.gain.value : null,
        musicBus: sound.musicBus ? sound.musicBus.gain.value : null,
        sfxBus: sound.sfxBus ? sound.sfxBus.gain.value : null,
        voiceBus: sound.voiceBus ? sound.voiceBus.gain.value : null,
        narrBus: sound.narrBus ? sound.narrBus.gain.value : null,
        duck: sound.duck ? sound.duck.gain.value : null,
        voicePlaying: sound.voiceNodes.map(function (n) { return n.cue.id; }),
        voiceLog: sound.voiceLog.slice(),
        summary: sound.summary()
      };
    },
    sound: sound,
    chapterStart: chapterStart
  };
})();
