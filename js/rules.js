/* ==========================================================================
   rules.js — niveaux, difficultés et courbe de progression.

   Un niveau dure 30 minutes par défaut (réglable : 30 / 15 / 5 min).
   Pendant ce temps le site accélère très progressivement de la vitesse
   « v0 » à la vitesse « v1 », et les passages se resserrent.
   ========================================================================== */
(function () {
  'use strict';
  var G = window.SiteGame = window.SiteGame || {};
  var C = G.CONFIG;

  var LEVELS = [
    { id: 1, name: 'Échauffement', color: '#3ddc84', v0: 90, v1: 620, gap: [260, 120], sr: [0.50, 0.30], events: [],
      desc: 'Un site tranquille pour apprendre à te glisser dans les passages.' },
    { id: 2, name: 'Heure de pointe', color: '#ffd166', v0: 150, v1: 820, gap: [235, 105], sr: [0.46, 0.28], events: ['buttons'],
      desc: 'Le trafic explose et les boutons se multiplient.' },
    { id: 3, name: 'Tempête de pop-ups', color: '#ff7a45', v0: 220, v1: 1020, gap: [215, 95], sr: [0.42, 0.27], events: ['ads', 'buttons'],
      desc: 'Pubs, pop-ups et bandeaux de cookies de tous les côtés.' },
    { id: 4, name: 'Infernal', color: '#ff4d6d', v0: 300, v1: 1250, gap: [195, 88], sr: [0.38, 0.25], events: ['ads', 'buttons', 'cards'],
      desc: 'Le site s’effondre à toute vitesse. Bonne chance.' }
  ];

  var DIFFS = {
    zen:    { id: 'zen',    name: 'Zen',    hit: 5, gap: 1.25, speed: 0.85, reward: 0.7, desc: 'Passages larges, souris plus fine, site plus lent.' },
    normal: { id: 'normal', name: 'Normal', hit: 7, gap: 1.0,  speed: 1.0,  reward: 1.0, desc: 'L’expérience prévue par le jeu.' },
    expert: { id: 'expert', name: 'Expert', hit: 8, gap: 0.88, speed: 1.15, reward: 1.5, desc: 'Passages serrés, site plus rapide, plus de cookies.' }
  };

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // Fabrique les règles pour un niveau / une difficulté / une durée (en minutes)
  function make(levelId, diffId, minutes) {
    var L = LEVELS[(levelId || 1) - 1] || LEVELS[0];
    var D = DIFFS[diffId] || DIFFS.normal;
    var T = Math.max(60, (minutes || 30) * 60);
    var R = { level: L, diff: D, T: T, minutes: minutes || 30, hit: D.hit };

    R.p = function (t) { return clamp(t / T, 0, 1); };
    R.speedAt = function (t) { return D.speed * lerp(L.v0, L.v1, Math.pow(R.p(t), 1.1)); };
    R.gapWidth = function (t) { return Math.max(C.minGap, lerp(L.gap[0], L.gap[1], Math.pow(R.p(t), 0.9)) * D.gap); };
    R.spacingRatio = function (t) { return lerp(L.sr[0], L.sr[1], R.p(t)); };
    R.gapCount = function (t, rnd) {
      var p = R.p(t);
      if (p < 0.15) return 2;
      if (p < 0.5) return rnd() < 0.5 ? 2 : 1;
      return rnd() < 0.2 ? 2 : 1;
    };
    R.palierTime = function (k) { return T * k / C.paliers; };
    // Distance parcourue au temps t (pour reprendre un score cohérent à un palier)
    R.distanceAt = function (t) {
      var d = 0, s = 0, step = 0.5;
      while (s < t) { var h = Math.min(step, t - s); d += R.speedAt(s + h / 2) * h; s += h; }
      return d;
    };
    return R;
  }

  function key(levelId, diffId, minutes) { return 'L' + levelId + '|' + diffId + '|' + minutes; }

  function resumeCost(R, k) {
    return Math.round(C.resumeCostBase * k * R.level.id * Math.max(0.25, R.minutes / 30));
  }

  G.Rules = {
    LEVELS: LEVELS, DIFFS: DIFFS, DURATIONS: [30, 15, 5],
    make: make, key: key, resumeCost: resumeCost,
    maxSpeed: 1250 * 1.15
  };
})();
