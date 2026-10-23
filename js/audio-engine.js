/*
 * KUMA Universe 線上電影劇場：音訊引擎
 * 背景音樂與場景音效都走 Web Audio API：
 *   來源 → 背景音樂匯流排／音效匯流排 → 總音量 → 喇叭
 * 換曲時交叉淡入淡出；暫停時先淡出再暫停整個音訊環境，繼續時從原處接著播，不會重新觸發音效。
 * iPhone／iPad Safari 規定聲音只能在使用者點擊後啟動，所以 unlock() 必須在點擊事件裡呼叫。
 */
(function () {
  "use strict";

  var FADE_MUSIC = 1.6;   // 換曲淡入淡出秒數
  var FADE_PAUSE = 0.25;  // 暫停／繼續淡出入秒數
  var SFX_DELAY = 0.28;   // 進入新的一幕後稍等再放音效，快速連按或拖曳進度條時不會連發
  var SKIP_SFX_AFTER = 1.5; // 從一幕中段繼續時（例如恢復進度）不補放開頭音效

  function KumaAudio(library, settings) {
    this.lib = library || { music: {}, sfx: {} };
    this.settings = settings;
    this.ctx = null;
    this.buffers = {};      // src -> Promise<AudioBuffer>
    this.status = {};       // src -> "loading" | "ok" | "error"
    this.durations = {};
    this.music = null;      // { id, source, gain }
    this.sfxNodes = [];
    this.sceneToken = 0;
    this.pendingSfx = null; // { token, id }
    this.firedToken = -1;
    this.playing = false;
    this.listeners = [];
    this.log = [];          // 實際播放過的音效紀錄（測試與除錯用）
  }

  KumaAudio.prototype.supported = function () {
    return !!(window.AudioContext || window.webkitAudioContext);
  };

  // 必須在使用者點擊（或按鍵）的事件處理裡呼叫，才能在 iOS Safari 啟動聲音
  KumaAudio.prototype.unlock = function () {
    if (!this.supported()) return false;
    try {
      // Safari 17 起：讓網頁聲音走「媒體播放」通道，避免被靜音鍵完全靜音
      if (navigator.audioSession) navigator.audioSession.type = "playback";
    } catch (e) {}
    if (!this.ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.master.gain.value = 0;
      this.applySettings(true);
    }
    if (this.ctx.state !== "running") {
      var p = this.ctx.resume();
      if (p && p.catch) p.catch(function () {});
    }
    // iOS 舊版需要真的在點擊中播放一段聲音才算解鎖
    try {
      var b = this.ctx.createBuffer(1, 1, 22050);
      var s = this.ctx.createBufferSource();
      s.buffer = b;
      s.connect(this.ctx.destination);
      s.start(0);
    } catch (e) {}
    return true;
  };

  KumaAudio.prototype.unlocked = function () {
    return !!this.ctx;
  };

  KumaAudio.prototype.load = function (src) {
    var self = this;
    if (this.buffers[src]) return this.buffers[src];
    this.status[src] = "loading";
    var ctx = this.ctx || new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 1, 44100);
    var p = fetch(src)
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.arrayBuffer();
      })
      .then(function (data) {
        return new Promise(function (resolve, reject) {
          var ret = ctx.decodeAudioData(data, resolve, reject);
          if (ret && ret.then) ret.then(resolve, reject);
        });
      })
      .then(function (buf) {
        self.status[src] = "ok";
        self.durations[src] = buf.duration;
        self.emit();
        return buf;
      })
      .catch(function (err) {
        self.status[src] = "error";
        self.emit();
        delete self.buffers[src];
        throw err;
      });
    this.buffers[src] = p;
    return p;
  };

  // 逐一下載並解碼所有音檔，回傳每個檔案是否可以播放
  KumaAudio.prototype.verifyAll = function () {
    var self = this;
    var jobs = [];
    ["music", "sfx"].forEach(function (kind) {
      Object.keys(self.lib[kind] || {}).forEach(function (id) {
        var src = self.lib[kind][id].src;
        jobs.push(self.load(src).then(function (b) {
          return { kind: kind, id: id, src: src, ok: true, duration: b.duration };
        }, function (e) {
          return { kind: kind, id: id, src: src, ok: false, error: String(e && e.message || e) };
        }));
      });
    });
    return Promise.all(jobs);
  };

  KumaAudio.prototype.summary = function () {
    var self = this;
    function count(kind) {
      var ids = Object.keys(self.lib[kind] || {});
      var ok = 0, err = 0, loading = 0;
      ids.forEach(function (id) {
        var st = self.status[self.lib[kind][id].src];
        if (st === "ok") ok++; else if (st === "error") err++; else loading++;
      });
      return { total: ids.length, ok: ok, error: err, pending: loading };
    }
    return { music: count("music"), sfx: count("sfx") };
  };

  KumaAudio.prototype.onChange = function (fn) { this.listeners.push(fn); };
  KumaAudio.prototype.emit = function () {
    var self = this;
    this.listeners.forEach(function (fn) { try { fn(self); } catch (e) {} });
  };

  KumaAudio.prototype.applySettings = function (instant) {
    if (!this.ctx) return;
    var s = this.settings;
    var now = this.ctx.currentTime;
    var tc = instant ? 0.001 : 0.08;
    var mv = s.musicOn ? s.musicVolume : 0, sv = s.sfxOn ? s.sfxVolume : 0;
    if (this.ctx.state !== "running" || !this.playing) {
      // 暫停中音訊時間停止，直接設定數值，繼續播放時就是新的音量
      this.musicBus.gain.cancelScheduledValues(0); this.musicBus.gain.value = mv;
      this.sfxBus.gain.cancelScheduledValues(0); this.sfxBus.gain.value = sv;
      return;
    }
    this.musicBus.gain.setTargetAtTime(mv, now, tc);
    this.sfxBus.gain.setTargetAtTime(sv, now, tc);
    if (this.playing) this.master.gain.setTargetAtTime(s.masterOn ? s.volume : 0, now, tc);
  };

  // ---------- 背景音樂 ----------
  KumaAudio.prototype.setMusic = function (id) {
    var self = this;
    if (this.music && this.music.id === id) return;
    var old = this.music;
    this.music = id ? { id: id, source: null, gain: null } : null;
    if (old) this.fadeOutMusic(old, FADE_MUSIC);
    this.emit();
    if (!id || !this.ctx) return;
    var def = this.lib.music[id];
    if (!def) return;
    var slot = this.music;
    this.load(def.src).then(function (buf) {
      if (self.music !== slot || !self.ctx) return; // 等待載入時已經換成別首
      var g = self.ctx.createGain();
      var src = self.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      // 檔案比一輪多 1 秒，只循環一輪的長度，略過 MP3 解碼器可能補在開頭的靜音
      if (def.loopLength && buf.duration > def.loopLength + 0.1) {
        src.loopStart = 0.1;
        src.loopEnd = 0.1 + def.loopLength;
      }
      src.connect(g);
      g.connect(self.musicBus);
      var now = self.ctx.currentTime;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(1, now + FADE_MUSIC);
      src.start(now, src.loopStart || 0);
      slot.source = src;
      slot.gain = g;
    }, function () {});
  };

  KumaAudio.prototype.fadeOutMusic = function (m, secs) {
    if (!m || !m.gain || !this.ctx) {
      if (m) m.dead = true;
      return;
    }
    var now = this.ctx.currentTime;
    var g = m.gain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + secs);
    try { m.source.stop(now + secs + 0.05); } catch (e) {}
  };

  KumaAudio.prototype.currentMusicTitle = function () {
    return this.music && this.lib.music[this.music.id] ? this.lib.music[this.music.id].title : "";
  };

  // ---------- 場景音效 ----------
  KumaAudio.prototype.stopSfx = function (secs) {
    if (!this.ctx) { this.sfxNodes = []; return; }
    var now = this.ctx.currentTime;
    this.sfxNodes.forEach(function (n) {
      try {
        n.gain.gain.cancelScheduledValues(now);
        n.gain.gain.setValueAtTime(n.gain.gain.value, now);
        n.gain.gain.linearRampToValueAtTime(0, now + secs);
        n.source.stop(now + secs + 0.02);
      } catch (e) {}
    });
    this.sfxNodes = [];
  };

  KumaAudio.prototype.fireSfx = function (token, id) {
    var self = this;
    if (token !== this.sceneToken || this.firedToken === token) return;
    if (!this.ctx || !this.playing) { this.pendingSfx = { token: token, id: id }; return; }
    var def = this.lib.sfx[id];
    if (!def) return;
    this.firedToken = token;
    this.pendingSfx = null;
    this.lastSfx = id;
    this.load(def.src).then(function (buf) {
      if (token !== self.sceneToken || !self.ctx) return; // 已經離開這一幕
      var g = self.ctx.createGain();
      var src = self.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(g);
      g.connect(self.sfxBus);
      src.start();
      self.log.push({ id: id, token: token, at: self.ctx.currentTime });
      var node = { source: src, gain: g, id: id };
      self.sfxNodes.push(node);
      src.onended = function () {
        var i = self.sfxNodes.indexOf(node);
        if (i >= 0) self.sfxNodes.splice(i, 1);
      };
      self.emit();
    }, function () {});
  };

  /*
   * 進入新的一幕。musicId 為這一幕的背景音樂，sfxId 為這一幕的音效（可為 null），
   * elapsed 為從這一幕的第幾秒開始（恢復進度時大於 0）。
   */
  KumaAudio.prototype.enterScene = function (musicId, sfxId, elapsed) {
    var self = this;
    var token = ++this.sceneToken;
    this.sceneSfx = null;
    clearTimeout(this.sfxTimer);
    this.pendingSfx = null;
    this.stopSfx(0.15); // 不讓上一幕的音效延續到這一幕
    this.setMusic(musicId);
    if (!sfxId || (elapsed || 0) > SKIP_SFX_AFTER) return;
    this.sceneSfx = sfxId;
    if (this.lib.sfx[sfxId] && this.ctx) this.load(this.lib.sfx[sfxId].src).catch(function () {});
    if (!this.playing) { this.pendingSfx = { token: token, id: sfxId }; return; }
    this.sfxTimer = setTimeout(function () { self.fireSfx(token, sfxId); }, SFX_DELAY * 1000);
  };

  KumaAudio.prototype.preload = function (musicId, sfxId) {
    if (!this.ctx) return;
    if (musicId && this.lib.music[musicId]) this.load(this.lib.music[musicId].src).catch(function () {});
    if (sfxId && this.lib.sfx[sfxId]) this.load(this.lib.sfx[sfxId].src).catch(function () {});
  };

  // ---------- 播放、暫停 ----------
  KumaAudio.prototype.play = function () {
    var self = this;
    if (!this.ctx) return;
    this.playing = true;
    clearTimeout(this.suspendTimer);
    var go = function () {
      var now = self.ctx.currentTime;
      var g = self.master.gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(self.settings.masterOn ? self.settings.volume : 0, now + FADE_PAUSE);
      // 若音樂在暫停期間才選定，這時補上
      if (self.music && !self.music.source) {
        var id = self.music.id;
        self.music = null;
        self.setMusic(id);
      }
      if (self.pendingSfx && self.pendingSfx.token === self.sceneToken) {
        var p = self.pendingSfx;
        self.sfxTimer = setTimeout(function () { self.fireSfx(p.token, p.id); }, SFX_DELAY * 1000);
      }
    };
    if (this.ctx.state !== "running") {
      var r = this.ctx.resume();
      if (r && r.then) r.then(go, go); else go();
    } else {
      go();
    }
  };

  KumaAudio.prototype.pause = function () {
    var self = this;
    this.playing = false;
    clearTimeout(this.sfxTimer);
    // 這一幕的音效若還在延遲等待中，留到繼續播放時再放
    if (!this.pendingSfx && this.firedToken !== this.sceneToken && this.sceneSfx) {
      this.pendingSfx = { token: this.sceneToken, id: this.sceneSfx };
    }
    if (!this.ctx) return;
    var now = this.ctx.currentTime;
    var g = this.master.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + FADE_PAUSE);
    clearTimeout(this.suspendTimer);
    this.suspendTimer = setTimeout(function () {
      if (!self.playing && self.ctx && self.ctx.state === "running") self.ctx.suspend().catch(function () {});
    }, (FADE_PAUSE + 0.05) * 1000);
  };

  // 離開播放器：音樂與音效都淡出停止
  KumaAudio.prototype.stopAll = function () {
    clearTimeout(this.sfxTimer);
    this.pendingSfx = null;
    this.sceneToken++;
    this.stopSfx(0.3);
    if (this.music) { this.fadeOutMusic(this.music, 0.6); this.music = null; }
    this.pause();
    this.emit();
  };

  KumaAudio.prototype.isActive = function () {
    return !!(this.ctx && this.ctx.state === "running" && this.playing);
  };

  window.KumaAudio = KumaAudio;
})();
