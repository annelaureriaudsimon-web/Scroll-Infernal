/* ==========================================================================
   storage.js — sauvegarde du joueur (cookies, boutique, réglages, records).
   Tout est gardé dans le navigateur (localStorage).
   ========================================================================== */
(function () {
  'use strict';
  var G = window.SiteGame = window.SiteGame || {};
  var KEY = 'scrollInfernal.save.v2';

  function defaults() {
    return {
      cookies: 0,
      owned: { skins: ['arrow'], colors: ['white'], trails: ['none'], uis: ['matrix'], titles: ['rookie'] },
      equipped: { skin: 'arrow', color: 'white', trail: 'none', ui: 'matrix', title: 'rookie' },
      upgrades: { magnet: 0, shield: 0, power: 0, bonus: 0, luck: 0, grace: 0, harvest: 0 },
      settings: {
        duration: 30,          // minutes : 5, 10, 30 ou 0 (infini)
        difficulty: 'normal',  // zen | normal | infernal
        volume: 0.7, muted: false,
        showHit: true, showDanger: true, shake: true, trails: true,
        touchSens: 1.2, pseudo: 'invité'
      },
      stats: { games: 0, time: 0, cookies: 0, wins: 0, best: {}, deaths: {}, purchases: 0, shields: 0,
               nears: 0, powers: 0, picked: 0, bestT: 0, infT: 0, mul: 0, bestScore: 0, still: 0, noCookie: 0, winMax: 0, infWinMax: 0 },
      achievements: {},                       // id -> date de déblocage
      runs: { zen: [], normal: [], infernal: [] }   // meilleures parties (10 par difficulté)
    };
  }
  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function merge(dst, src) {
    for (var k in src) {
      if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
      if (isObj(src[k]) && isObj(dst[k])) merge(dst[k], src[k]); else dst[k] = src[k];
    }
  }

  var data = defaults();
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) merge(data, JSON.parse(raw));
  } catch (e) { /* sauvegarde absente ou illisible : on repart de zéro */ }

  G.save = {
    data: data,
    commit: function () { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* ignore */ } },
    reset: function () {
      var d = defaults();
      Object.keys(data).forEach(function (k) { delete data[k]; });
      merge(data, d);
      this.commit();
    }
  };
})();
