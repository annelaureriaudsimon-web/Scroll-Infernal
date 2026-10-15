/* ==========================================================================
   store.js — sauvegarde de la progression dans le navigateur (localStorage).
   Cookies, objets achetés/équipés, réglages, records, paliers, succès.
   ========================================================================== */
(function () {
  'use strict';
  var G = window.SiteGame = window.SiteGame || {};
  var C = G.CONFIG;
  var KEY = 'scrollInfernal.save.v2';

  function defaults() {
    return {
      v: 2,
      cookies: C.welcomeGift,
      owned: { skin: ['classic'], trail: ['none'], acc: ['none'] },
      equipped: { skin: 'classic', trail: 'none', acc: 'none' },
      settings: {
        difficulty: 'normal', minutes: 30,
        muted: false, music: true, sfx: true, volMusic: 0.6, volSfx: 0.8,
        hitbox: true, shake: true, flash: true, particles: true, autoPause: true
      },
      records: {},      // « L1|normal|30 » -> { time, score, done }
      checkpoints: {},  // « L1|normal|30 » -> palier atteint (1..5)
      unlocked: 1,      // niveaux débloqués
      stats: { games: 0, deaths: 0, time: 0, bestTime: 0, cookies: 0, grazes: 0, powerups: 0, shields: 0, completed: 0, completed30: 0, purchases: 0 },
      ach: {}           // succès débloqués -> date
    };
  }

  function isObj(o) { return o && typeof o === 'object' && !Array.isArray(o); }
  function merge(t, s) {
    for (var k in s) {
      if (!Object.prototype.hasOwnProperty.call(s, k) || k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      if (isObj(s[k]) && isObj(t[k])) merge(t[k], s[k]); else t[k] = s[k];
    }
    return t;
  }

  var data = defaults();
  var isNew = true;
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) { merge(data, JSON.parse(raw)); isNew = false; }
  } catch (e) { /* stockage indisponible : on joue sans sauvegarde */ }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
  }

  // Cohérence : les objets par défaut sont toujours possédés et l'équipement doit être possédé
  function sanitize() {
    ['skin', 'trail', 'acc'].forEach(function (c) {
      var def = defaults();
      if (!Array.isArray(data.owned[c])) data.owned[c] = def.owned[c];
      if (data.owned[c].indexOf(def.owned[c][0]) < 0) data.owned[c].unshift(def.owned[c][0]);
      if (data.owned[c].indexOf(data.equipped[c]) < 0) data.equipped[c] = def.equipped[c];
    });
    data.cookies = Math.max(0, Math.round(+data.cookies || 0));
    data.unlocked = Math.max(1, Math.min(4, Math.round(+data.unlocked || 1)));
  }
  sanitize();
  if (isNew) save();

  var store = G.store = {
    data: data,
    isNew: isNew,
    save: save,

    addCookies: function (n) { data.cookies = Math.max(0, Math.round(data.cookies + n)); },
    spend: function (n) { if (data.cookies < n) return false; data.cookies -= n; return true; },

    owns: function (cat, id) { return data.owned[cat].indexOf(id) >= 0; },
    buy: function (cat, id, price) {
      if (store.owns(cat, id)) return 'owned';
      if (!store.spend(price)) return 'poor';
      data.owned[cat].push(id);
      data.stats.purchases++;
      save();
      return 'ok';
    },
    equip: function (cat, id) {
      if (!store.owns(cat, id)) return false;
      data.equipped[cat] = id;
      save();
      return true;
    },

    s: function (k) { return data.settings[k]; },
    set: function (k, v) { data.settings[k] = v; save(); },

    record: function (key) { return data.records[key] || { time: 0, score: 0, done: false }; },
    updateRecord: function (key, time, score, done) {
      var r = data.records[key] || (data.records[key] = { time: 0, score: 0, done: false });
      r.time = Math.max(r.time, Math.floor(time));
      r.score = Math.max(r.score, score);
      r.done = r.done || !!done;
    },
    checkpoint: function (key) { return data.checkpoints[key] || 0; },
    setCheckpoint: function (key, k) { if (k > (data.checkpoints[key] || 0)) data.checkpoints[key] = k; },
    clearCheckpoint: function (key) { delete data.checkpoints[key]; },

    stat: function (k, n) { data.stats[k] = (data.stats[k] || 0) + (n === undefined ? 1 : n); },
    statMax: function (k, v) { if (v > (data.stats[k] || 0)) data.stats[k] = v; },
    unlockLevel: function (n) { if (n > data.unlocked && n <= 4) { data.unlocked = n; return true; } return false; },

    reset: function () {
      var fresh = defaults();
      for (var k in data) delete data[k];
      merge(data, fresh);
      save();
    }
  };
})();
