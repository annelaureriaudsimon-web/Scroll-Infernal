/* ==========================================================================
   audio.js — petits sons synthétisés (aucun fichier audio nécessaire).
   Le volume et le mode muet viennent des réglages sauvegardés.
   ========================================================================== */
(function () {
  'use strict';
  var G = window.SiteGame = window.SiteGame || {};
  var ctx = null;

  function volume() {
    var s = G.save.data.settings;
    return s.muted ? 0 : s.volume;
  }
  function ensure() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) { try { ctx = new AC(); } catch (e) { ctx = null; } }
    }
    if (ctx && ctx.state === 'suspended') { try { ctx.resume(); } catch (e) { /* ignore */ } }
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo, delay) {
    var v = volume();
    if (!v) return;
    var c = ensure();
    if (!c) return;
    var t0 = c.currentTime + (delay || 0);
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime((vol || 0.06) * v / 0.7, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }

  function noise(dur, vol) {
    var v = volume();
    if (!v) return;
    var c = ensure();
    if (!c) return;
    var len = Math.floor(c.sampleRate * dur);
    var buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = c.createBufferSource(), g = c.createGain();
    g.gain.value = (vol || 0.15) * v / 0.7;
    src.buffer = buf; src.connect(g); g.connect(c.destination); src.start();
  }

  G.audio = {
    unlock: ensure,
    isMuted: function () { return !!G.save.data.settings.muted; },
    setMuted: function (m) { G.save.data.settings.muted = !!m; G.save.commit(); },
    click: function () { tone(520, 0.05, 'triangle', 0.05); },
    start: function () { tone(330, 0.09, 'square', 0.05); tone(494, 0.09, 'square', 0.05, 0, 0.08); tone(659, 0.16, 'square', 0.05, 0, 0.16); },
    stage: function () { tone(440, 0.1, 'triangle', 0.09); tone(660, 0.1, 'triangle', 0.09, 0, 0.09); tone(880, 0.18, 'triangle', 0.09, 0, 0.18); },
    page: function () { tone(520, 0.07, 'sine', 0.05, 780); },
    coin: function () { tone(988, 0.06, 'square', 0.04); tone(1319, 0.1, 'square', 0.04, 0, 0.05); },
    power: function () { tone(523, 0.08, 'triangle', 0.08); tone(784, 0.08, 'triangle', 0.08, 0, 0.07); tone(1046, 0.14, 'triangle', 0.08, 0, 0.14); },
    shield: function () { noise(0.25, 0.12); tone(700, 0.3, 'sawtooth', 0.07, 120); },
    win: function () { [523, 659, 784, 1046, 784, 1046].forEach(function (f, i) { tone(f, 0.2, 'triangle', 0.09, 0, i * 0.13); }); },
    die: function () { noise(0.45, 0.2); tone(300, 0.5, 'sawtooth', 0.09, 50); }
  };
})();
