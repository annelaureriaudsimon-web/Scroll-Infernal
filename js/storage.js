/* ==========================================================================
   storage.js — la sauvegarde du joueur (cookies, boutique, réglages, records…).

   Trois façons de jouer (voir auth.js pour la connexion) :
     • invité : une sauvegarde sur cet appareil (ancienne clé « save.v2 »)
     • compte local : une sauvegarde par pseudo sur cet appareil
     • compte cloud : pareil + copie sur le serveur (si le jeu est servi par server/server.js)

   G.save.data est UN SEUL objet pour toute la durée de la page : quand on change de
   compte on le remplit « sur place » (replace), les autres fichiers gardent leur référence.
   ========================================================================== */
(function () {
  'use strict';
  var G = window.SiteGame = window.SiteGame || {};

  var K = {
    legacy: 'scrollInfernal.save.v2',       // sauvegarde sans compte (invité)
    accounts: 'scrollInfernal.accounts.v1', // comptes locaux
    session: 'scrollInfernal.session.v1',   // qui est connecté (reprise automatique)
    claimed: 'scrollInfernal.legacyClaimed.v1',
    save: 'scrollInfernal.save.v3.'         // + l.<pseudo> ou c.<pseudo>
  };

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
        showHit: true, showDanger: true, shake: true, trails: true, wrap: true,
        touchSens: 1.2, pseudo: 'invité'
      },
      stats: { games: 0, time: 0, cookies: 0, wins: 0, best: {}, deaths: {}, purchases: 0, shields: 0,
               nears: 0, powers: 0, picked: 0, bestT: 0, infT: 0, mul: 0, bestScore: 0, still: 0, noCookie: 0, winMax: 0, infWinMax: 0 },
      achievements: {},                       // id -> date de déblocage
      runs: { zen: [], normal: [], infernal: [] },   // meilleures parties (10 par difficulté)
      meta: { updated: 0, rev: 0 }            // rev = version connue du serveur (compte cloud)
    };
  }
  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function merge(dst, src) {
    for (var k in src) {
      if (!Object.prototype.hasOwnProperty.call(src, k) || k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      if (isObj(src[k]) && isObj(dst[k])) merge(dst[k], src[k]); else dst[k] = src[k];
    }
    return dst;
  }

  /* --- Accès au stockage du navigateur (avec une copie en mémoire si il est bloqué) --- */
  var mem = {}, okStorage = true;
  try { localStorage.setItem('si.t', '1'); localStorage.removeItem('si.t'); } catch (e) { okStorage = false; }
  function read(key) {
    try {
      var raw = okStorage ? localStorage.getItem(key) : mem[key];
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function write(key, val) {
    var raw = JSON.stringify(val);
    if (!okStorage) { mem[key] = raw; return false; }
    try { localStorage.setItem(key, raw); return true; } catch (e) { mem[key] = raw; return false; }
  }
  function remove(key) { try { if (okStorage) localStorage.removeItem(key); } catch (e) { /* ignore */ } delete mem[key]; }

  // Demande au navigateur de ne pas effacer nos données quand il manque de place
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ignore */ }

  var data = defaults();

  function sanitize() {
    var d = defaults();
    ['skins', 'colors', 'trails', 'uis', 'titles'].forEach(function (c) {
      if (!Array.isArray(data.owned[c])) data.owned[c] = d.owned[c].slice();
      if (data.owned[c].indexOf(d.owned[c][0]) < 0) data.owned[c].unshift(d.owned[c][0]);
    });
    data.cookies = Math.max(0, Math.round(+data.cookies || 0));
    if (!isObj(data.achievements)) data.achievements = {};
    ['zen', 'normal', 'infernal'].forEach(function (k) { if (!Array.isArray(data.runs[k])) data.runs[k] = []; });
  }

  var save = G.save = {
    data: data,
    session: read(K.session),     // { type:'guest' } | { type:'local', name } | { type:'cloud', name, token }
    user: null,                   // nom du compte connecté (null = invité)
    cloud: false,                 // compte cloud connecté ?
    volatile: !okStorage,         // true = le navigateur refuse de sauvegarder (navigation privée…)
    K: K, read: read, write: write, remove: remove, defaults: defaults, merge: merge,
    onCommit: null,

    keyFor: function (sess) {
      if (!sess || sess.type === 'guest') return K.legacy;
      return K.save + (sess.type === 'cloud' ? 'c.' : 'l.') + sess.name.toLowerCase();
    },
    key: function () { return save.keyFor(save.session); },

    // Écrit la sauvegarde. bump=false : on ne change pas la date (ex. adoption d'une copie du serveur)
    commit: function (bump) {
      if (!save.session) return;           // pas connecté : on n'écrit rien (on n'écrase jamais une sauvegarde)
      if (bump !== false) data.meta.updated = Date.now();
      write(save.key(), data);
      if (bump !== false && save.onCommit) save.onCommit();
    },

    // Remplace tout le contenu « sur place »
    replace: function (obj) {
      Object.keys(data).forEach(function (k) { delete data[k]; });
      merge(data, defaults());
      if (isObj(obj)) merge(data, obj);
      sanitize();
      if (save.user) data.settings.pseudo = save.user;
    },

    // Charge la sauvegarde d'une session (et la mémorise pour la prochaine visite)
    useSession: function (sess) {
      save.session = sess;
      save.user = sess && sess.type !== 'guest' ? sess.name : null;
      save.cloud = !!(sess && sess.type === 'cloud');
      write(K.session, sess);
      save.replace(read(save.key()));
    },
    endSession: function () {
      save.session = null; save.user = null; save.cloud = false;
      remove(K.session);
      save.replace(null);
    },

    reset: function () {
      save.replace(null);
      save.commit();
    }
  };

  // Reprise automatique : on recharge la dernière session
  var s = save.session;
  if (s && (s.type === 'guest' || (s.type === 'cloud' && s.name) || (s.type === 'local' && s.name && (read(K.accounts) || {})[s.name.toLowerCase()]))) {
    save.useSession(s);
  } else {
    save.session = null;
    save.replace(null);
  }
})();
