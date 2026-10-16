/* ==========================================================================
   ui.js — HUD, écrans (menu / réglages / boutique / pause / fin) et messages.
   ========================================================================== */
(function () {
  'use strict';
  var G = window.SiteGame = window.SiteGame || {};
  function $(id) { return document.getElementById(id); }

  var NAMES = ['menu', 'settings', 'shop', 'rank', 'ach', 'pause', 'over', 'win'];
  var screens = {};
  NAMES.forEach(function (n) { screens[n] = $('screen-' + n); });
  var hud = { score: $('hud-score'), speed: $('hud-speed'), stage: $('hud-stage'), time: $('hud-time'), cookies: $('hud-cookies'), bar: $('loadbar-fill') };
  var cache = {}, toastTimer = 0, effKey = '', effBars = [];

  var achQ = [], achBusy = false;
  function nextAch() {
    var it = achQ.shift(), el = $('ach-toast');
    if (!it) { achBusy = false; return; }
    achBusy = true;
    var tier = G.ach.TIERS[it.a.tier];
    el.className = 't-' + it.a.tier;
    el.innerHTML = '<small>[ SUCCÈS DÉBLOQUÉ · ' + tier.name.toUpperCase() + ' ]</small><b>' + it.a.name + '</b><span><i class="cookie-ico"></i>+' + it.reward + '</span>';
    void el.offsetWidth;
    el.classList.add('show');
    setTimeout(function () { el.classList.remove('show'); setTimeout(nextAch, 350); }, 2600);
  }

  function setText(key, el, value) {
    if (cache[key] !== value) { cache[key] = value; el.textContent = value; }
  }

  G.ui = {
    current: 'menu',   // écran affiché (null = en jeu)
    from: 'menu',      // où revenir depuis Réglages / Boutique
    show: function (name, from) {
      if (from) this.from = from;
      this.current = name;
      NAMES.forEach(function (n) { screens[n].classList.toggle('show', n === name); });
      if (G.hacker) G.hacker.rain(true);
    },
    hide: function () {
      this.current = null;
      NAMES.forEach(function (n) { screens[n].classList.remove('show'); });
      if (G.hacker) G.hacker.rain(false);
    },
    back: function () { this.show(this.from || 'menu'); },

    toast: function (msg, ms) {
      var t = $('toast');
      t.textContent = msg;
      t.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { t.classList.remove('show'); }, ms || 1600);
    },

    // Succès débloqués : petites bannières les unes après les autres
    achToast: function (a, reward) {
      achQ.push({ a: a, reward: reward });
      if (!achBusy) nextAch();
    },

    setHud: function (o) {
      setText('score', hud.score, String(o.score));
      setText('speed', hud.speed, '×' + o.speed.toFixed(1));
      setText('stage', hud.stage, o.stage);
      setText('time', hud.time, o.time);
      setText('cookies', hud.cookies, String(o.cookies));
      var w = Math.round(o.progress * 1000) / 10 + '%';
      if (cache.bar !== w) { cache.bar = w; hud.bar.style.width = w; }
    },
    setHudLabels: function (timeLabel) { $('hud-time-l').textContent = timeLabel; },

    // Bonus actifs (Pare-feu, Wi-Fi lent, Ad-block) : petites pastilles avec barre de temps
    setEffects: function (list) {
      var key = list.map(function (e) { return e.id + e.label; }).join('|');
      var box = $('effects');
      if (key !== effKey) {
        effKey = key;
        box.innerHTML = list.map(function (e) {
          return '<div class="fx fx-' + e.id + '"><span class="fxi">' + G.PK_HTML['power-' + e.id] + '</span><b>' + e.label +
            '</b><span class="bar"><span></span></span></div>';
        }).join('');
        effBars = box.querySelectorAll('.bar span');
      }
      for (var i = 0; i < list.length; i++) effBars[i].style.width = Math.round(list[i].pct * 100) + '%';
    },

    setUrl: function (url) { $('url-text').textContent = url; },
    setSound: function (muted) { $('btn-sound').textContent = muted ? 'MUET' : 'SON'; },

    showEnd: function (name, o) {
      var p = name === 'win' ? 'win' : 'over';
      $(p + '-title').textContent = o.title;
      $(p + '-message').textContent = o.message;
      $(p + '-score').textContent = o.score;
      $(p + '-best').textContent = o.best;
      $(p + '-time').textContent = o.time;
      $(p + '-cookies').textContent = '+' + o.earned;
      $(p + '-record').style.display = o.record ? 'block' : 'none';
      $(p + '-rank').textContent = o.rank ? 'CLASSEMENT ' + G.CONFIG.DIFFS[o.diff].name.toUpperCase() + ' : #' + o.rank : '';
      this.show(name);
    }
  };
})();
